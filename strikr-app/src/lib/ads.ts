// Ad adapter — the only place that should know how ads are actually shown.
// Everything else (ShopScreen, useInterstitialAd) calls these two functions
// and doesn't care about the AdMob SDK details.
import mobileAds, { AdEventType, InterstitialAd, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

// TEMPORARY diagnostic swap: the app crashes (native SIGABRT) every time a
// real ad is shown, on both the New and legacy architectures — same crash
// signature either way, so it isn't an architecture issue. Switched to
// Google's own permanent test ad unit IDs (always valid, never policy-
// restricted) to find out whether the crash is specific to our real AdMob
// account/ad units (misconfigured or not yet fully approved) or a deeper
// bug in the ad library itself, independent of which ad unit is used.
// Once confirmed working, revert AD_UNIT_IDS back to the real ones below.
const USE_TEST_ADS = true;

const REAL_AD_UNIT_IDS = {
  rewarded: 'ca-app-pub-7516626754240121/7450570987',
  interstitial: 'ca-app-pub-7516626754240121/2333975671',
};

// Google's official, permanent test ad units — same for every developer,
// documented at https://developers.google.com/admob/ios/test-ads.
const TEST_AD_UNIT_IDS = {
  rewarded: 'ca-app-pub-3940256099942544/1712485313',
  interstitial: 'ca-app-pub-3940256099942544/4411468910',
};

export const AD_UNIT_IDS = USE_TEST_ADS ? TEST_AD_UNIT_IDS : REAL_AD_UNIT_IDS;

// Safety net: if AdMob never fires LOADED or ERROR (seen in practice —
// ad inventory can be unreliable before the app is publicly listed), the
// caller would otherwise await forever and the "watch an ad" button would
// stay stuck on its loading spinner permanently.
const LOAD_TIMEOUT = 15000;

// The native SDK must finish initializing before any ad object is created.
// This used to be created eagerly at module import time (`let rewarded =
// RewardedAd.createForAdRequest(...)` right here at the top level) — but
// JS module imports are all evaluated before an importing module's own
// top-level code runs, so that eager creation actually happened *before*
// App.tsx's own mobileAds().initialize() call ever had a chance to fire.
// That leaves the ad object wired to a not-yet-ready native SDK, which
// lines up with a crash reproducing identically on every real ad attempt
// — even with Google's own guaranteed-valid test ad units, which rules out
// our AdMob account/ad units as the cause. Ad objects are now created
// lazily, only after this promise actually resolves.
let initPromise: Promise<unknown> | null = null;
export function ensureAdsInitialized() {
  if (!initPromise) initPromise = mobileAds().initialize();
  return initPromise;
}

// Each ad object is single-use (load → show → gone), so a fresh one is
// created after every show() to have the next ad ready to load.
let rewarded: RewardedAd | null = null;
let interstitial: InterstitialAd | null = null;

function freshRewarded(): RewardedAd {
  rewarded = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);
  return rewarded;
}

function freshInterstitial(): InterstitialAd {
  interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
  return interstitial;
}

export async function showRewardedAd(): Promise<{ success: boolean }> {
  await ensureAdsInitialized();
  return new Promise((resolve) => {
    const current = rewarded || freshRewarded();
    let earned = false;
    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      unsubEarned();
      unsubLoaded();
      unsubClosed();
      unsubError();
      freshRewarded();
      resolve({ success });
    };
    const timeout = setTimeout(() => finish(false), LOAD_TIMEOUT);
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
  await ensureAdsInitialized();
  return new Promise((resolve) => {
    const current = interstitial || freshInterstitial();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      unsubLoaded();
      unsubClosed();
      unsubError();
      freshInterstitial();
      resolve();
    };
    const timeout = setTimeout(finish, LOAD_TIMEOUT);
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
