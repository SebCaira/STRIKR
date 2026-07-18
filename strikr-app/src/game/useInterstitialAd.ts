import { useCallback, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INTERSTITIAL_EVERY_N_GAMES } from '../data/shop';

const STORAGE_KEY = 'strikr_games_played_v1';

export function useInterstitialAd() {
  const [adVisible, setAdVisible] = useState(false);
  const pendingContinue = useRef<(() => void) | null>(null);

  // Called at the end of every round (win or loss). Runs `onContinue`
  // immediately unless this round is the Nth, in which case the interstitial
  // is shown first and `onContinue` fires once it's dismissed.
  const recordRoundPlayed = useCallback((onContinue: () => void) => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const count = (Number(raw) || 0) + 1;
      AsyncStorage.setItem(STORAGE_KEY, String(count)).catch(() => {});
      if (count % INTERSTITIAL_EVERY_N_GAMES === 0) {
        pendingContinue.current = onContinue;
        setAdVisible(true);
      } else {
        onContinue();
      }
    });
  }, []);

  const dismissAd = useCallback(() => {
    setAdVisible(false);
    const cb = pendingContinue.current;
    pendingContinue.current = null;
    if (cb) cb();
  }, []);

  return { adVisible, recordRoundPlayed, dismissAd };
}
