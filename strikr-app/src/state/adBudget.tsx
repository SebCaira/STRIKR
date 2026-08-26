// Single shared source of truth for the daily "watch a rewarded ad for
// diamonds" budget, consumed from the Shop's own ad button as well as the
// Profil/Settings "regarder une pub" offers shown when a purchase fails for
// lack of diamonds. This used to be two independent implementations (each
// holding its own local React state, each separately reading/writing the
// same AsyncStorage key at its own mount time) — if more than one of those
// screens was mounted at once (very possible: Shop is a Stack screen pushed
// on top of the still-mounted Tabs underneath), each had a stale view of
// the other's in-flight changes, so a failed ad on one screen could refund
// against a state snapshot the other screen had already moved past,
// silently drifting the persisted daily count upward with nothing to show
// for it. A single Context instance removes the possibility of two stale
// copies existing at once.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDiamonds } from './diamonds';
import { ADS_LIVE, REWARDED_AD_DIAMONDS, REWARDED_AD_PER_DAY } from '../data/shop';
import { showRewardedAd } from '../lib/ads';

const AD_WATCHED_KEY = 'strikr_ad_watched_v1';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface AdBudgetContextValue {
  watchedToday: number;
  ready: boolean;
  watching: boolean;
  watch: () => Promise<{ success: boolean }>;
}

const AdBudgetContext = createContext<AdBudgetContextValue | null>(null);

export function AdBudgetProvider({ children }: { children: React.ReactNode }) {
  const { addDiamonds } = useDiamonds();
  const [watchedToday, setWatchedToday] = useState(0);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(AD_WATCHED_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.date === todayStr()) setWatchedToday(parsed.count || 0);
      } catch {
        // ignore corrupt storage
      }
    });
  }, []);

  const ready = watchedToday < REWARDED_AD_PER_DAY;

  // The count is persisted immediately (not after the ad finishes), so
  // leaving and re-entering mid-ad can't be used to dodge the daily cap and
  // double up the reward. It's refunded below on failure (see there for
  // why) — this still closes that gap, since the refund only happens once
  // showRewardedAd() actually settles, and leaving before that never lets
  // it settle in the first place.
  const watch = useCallback(async (): Promise<{ success: boolean }> => {
    if (!ready || watching) return { success: false };
    setWatching(true);
    setWatchedToday((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem(AD_WATCHED_KEY, JSON.stringify({ date: todayStr(), count: next })).catch(() => {});
      return next;
    });
    // ads.ts's showRewardedAd() is designed to always resolve, never
    // reject, but this is the kind of code path that's already crashed the
    // app 5 times over — a try/catch here costs nothing and means a
    // regression there fails the ad request instead of the whole app.
    let success = true;
    if (ADS_LIVE) {
      try {
        ({ success } = await showRewardedAd());
      } catch (e) {
        console.warn('showRewardedAd() rejected', e);
        success = false;
      }
    }
    setWatching(false);
    if (!success) {
      // A failure here means no ad was actually shown (no fill, load
      // error, timeout) or the reward genuinely wasn't earned — either way
      // the player got nothing, so this attempt shouldn't burn one of
      // their daily tries. Without this, a day with poor ad fill silently
      // exhausts the cap without a single real ad ever being seen.
      setWatchedToday((prev) => {
        const next = Math.max(0, prev - 1);
        AsyncStorage.setItem(AD_WATCHED_KEY, JSON.stringify({ date: todayStr(), count: next })).catch(() => {});
        return next;
      });
      return { success: false };
    }
    addDiamonds(REWARDED_AD_DIAMONDS);
    return { success: true };
  }, [ready, watching, addDiamonds]);

  return (
    <AdBudgetContext.Provider value={{ watchedToday, ready, watching, watch }}>
      {children}
    </AdBudgetContext.Provider>
  );
}

export function useAdBudget() {
  const ctx = useContext(AdBudgetContext);
  if (!ctx) throw new Error('useAdBudget must be used within AdBudgetProvider');
  return ctx;
}
