// Ad adapter — the only place that should know how ads are actually shown.
// Everything else (ShopScreen, useInterstitialAd) calls these two functions
// and doesn't care about the AdMob SDK details.
import { AdEventType, InterstitialAd, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

export const AD_UNIT_IDS = {
  rewarded: 'ca-app-pub-7516626754240121/7450570987',
  interstitial: 'ca-app-pub-7516626754240121/2333975671',
};

// Each ad object is single-use (load → show → gone), so a fresh one is
// created after every show() to have the next ad ready to load.
let rewarded = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);
let interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);

export async function showRewardedAd(): Promise<{ success: boolean }> {
  return new Promise((resolve) => {
    const current = rewarded;
    let earned = false;
    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      unsubEarned();
      unsubLoaded();
      unsubClosed();
      unsubError();
      rewarded = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);
      resolve({ success });
    };
    const unsubEarned = current.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const unsubLoaded = current.addAdEventListener(AdEventType.LOADED, () => {
      current.show();
    });
    const unsubClosed = current.addAdEventListener(AdEventType.CLOSED, () => finish(earned));
    const unsubError = current.addAdEventListener(AdEventType.ERROR, () => finish(false));
    current.load();
  });
}

export async function showInterstitialAd(): Promise<void> {
  return new Promise((resolve) => {
    const current = interstitial;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      unsubLoaded();
      unsubClosed();
      unsubError();
      interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
      resolve();
    };
    const unsubLoaded = current.addAdEventListener(AdEventType.LOADED, () => {
      current.show();
    });
    const unsubClosed = current.addAdEventListener(AdEventType.CLOSED, finish);
    // Failing to load a real ad shouldn't block the game — the round just
    // continues without an interstitial that round.
    const unsubError = current.addAdEventListener(AdEventType.ERROR, finish);
    current.load();
  });
}
