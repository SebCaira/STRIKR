// Shared "watch a rewarded ad for diamonds" action for the moments a
// purchase fails for lack of diamonds outside the Shop itself (Profil's
// streak freeze, Settings' avatar frames) — reuses the exact same
// AsyncStorage key and daily cap as ShopScreen's own ad button, so this
// can't be used to farm past REWARDED_AD_PER_DAY just by using a different
// entry point into the same rewarded-ad inventory.
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDiamonds } from '../state/diamonds';
import { ADS_LIVE, REWARDED_AD_DIAMONDS, REWARDED_AD_PER_DAY } from '../data/shop';
import { showRewardedAd } from '../lib/ads';

const AD_WATCHED_KEY = 'strikr_ad_watched_v1';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useWatchAdForDiamonds() {
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

  // Same shape as ShopScreen's own watchAd: the daily count is bumped
  // immediately (not after the ad finishes) so leaving mid-ad can't dodge
  // the cap, then refunded if the ad never actually paid out — a bad-fill
  // day can't silently burn through the cap with nothing shown for it.
  const watch = useCallback(async (): Promise<{ success: boolean }> => {
    if (!ready || watching) return { success: false };
    setWatching(true);
    setWatchedToday((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem(AD_WATCHED_KEY, JSON.stringify({ date: todayStr(), count: next })).catch(() => {});
      return next;
    });
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

  return { ready, watching, watch };
}
