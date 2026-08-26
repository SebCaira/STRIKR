// Global "every 5 rounds" ad checkpoint. Replaces the old unconditional
// forced interstitial with an opt-in rewarded interstitial: any screen's
// useInterstitialAd().recordRoundPlayed() calls offer() here instead of
// showing an ad directly, and the single globally-mounted
// RewardedInterstitialModal (see App.tsx) reads this same state to show the
// prompt — so every screen gets the identical prompt without each of them
// needing to render its own modal.
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

interface RewardedInterstitialContextValue {
  visible: boolean;
  offer: (onDone: () => void) => void;
  resolve: () => void;
}

const RewardedInterstitialContext = createContext<RewardedInterstitialContextValue | null>(null);

export function RewardedInterstitialProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);

  const offer = useCallback((onDone: () => void) => {
    pendingRef.current = onDone;
    setVisible(true);
  }, []);

  // Called by the modal exactly once per offer() — whether the player
  // declined immediately, watched and earned the reward, or the ad failed
  // to load. Matches the contract the old direct showInterstitialAd().then()
  // call had: onDone always eventually fires.
  const resolve = useCallback(() => {
    setVisible(false);
    const cb = pendingRef.current;
    pendingRef.current = null;
    if (cb) cb();
  }, []);

  return (
    <RewardedInterstitialContext.Provider value={{ visible, offer, resolve }}>
      {children}
    </RewardedInterstitialContext.Provider>
  );
}

export function useRewardedInterstitial() {
  const ctx = useContext(RewardedInterstitialContext);
  if (!ctx) throw new Error('useRewardedInterstitial must be used within RewardedInterstitialProvider');
  return ctx;
}
