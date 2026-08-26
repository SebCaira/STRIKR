import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADS_LIVE, INTERSTITIAL_EVERY_N_GAMES } from '../data/shop';
import { useRewardedInterstitial } from '../state/rewardedInterstitial';

const STORAGE_KEY = 'strikr_games_played_v1';

export function useInterstitialAd() {
  const { offer } = useRewardedInterstitial();

  // Called at the end of every round (win or loss). Runs `onContinue`
  // immediately unless this round is the Nth, in which case the player is
  // offered a rewarded interstitial (see RewardedInterstitialModal) instead
  // of a forced ad — `onContinue` fires once they've either watched it or
  // declined. Skipped entirely while ads aren't live.
  const recordRoundPlayed = useCallback(
    (onContinue: () => void) => {
      if (!ADS_LIVE) {
        onContinue();
        return;
      }
      AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
        const count = (Number(raw) || 0) + 1;
        AsyncStorage.setItem(STORAGE_KEY, String(count)).catch(() => {});
        if (count % INTERSTITIAL_EVERY_N_GAMES === 0) {
          offer(onContinue);
        } else {
          onContinue();
        }
      });
    },
    [offer]
  );

  return { recordRoundPlayed };
}
