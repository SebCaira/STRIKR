import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADS_LIVE, INTERSTITIAL_EVERY_N_GAMES } from '../data/shop';
import { showInterstitialAd } from '../lib/ads';

const STORAGE_KEY = 'strikr_games_played_v1';

export function useInterstitialAd() {
  // Called at the end of every round (win or loss). Runs `onContinue`
  // immediately unless this round is the Nth, in which case a real
  // interstitial is shown first (the native SDK presents its own full-screen
  // UI — no in-app modal needed) and `onContinue` fires once it's closed.
  // Skipped entirely while ads aren't live.
  const recordRoundPlayed = useCallback((onContinue: () => void) => {
    if (!ADS_LIVE) {
      onContinue();
      return;
    }
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const count = (Number(raw) || 0) + 1;
      AsyncStorage.setItem(STORAGE_KEY, String(count)).catch(() => {});
      if (count % INTERSTITIAL_EVERY_N_GAMES === 0) {
        // See ShopScreen's watchAd for why this is caught even though
        // ads.ts's showInterstitialAd() is designed to always resolve —
        // an uncaught rejection here would both crash and strand the
        // player on the "round just ended" screen forever.
        showInterstitialAd().then(onContinue).catch((e) => {
          console.warn('showInterstitialAd() rejected', e);
          onContinue();
        });
      } else {
        onContinue();
      }
    });
  }, []);

  return { recordRoundPlayed };
}
