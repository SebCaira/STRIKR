// Ad adapter — the only place that should know how ads are actually shown.
// Everything else (ShopScreen, useInterstitialAd) calls these two functions
// and doesn't care about the AdMob SDK details.
import mobileAds, { AdEventType, InterstitialAd, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

// Diagnostic conclusion (see shop.ts's ADS_LIVE): swapping to Google's own
// test ad units made no difference — the crash reproduced identically —
// which rules out our AdMob account/ad units as the cause. Back to the
// real ones now that ADS_LIVE is off and neither path is actually called.
//
// Root cause, step 1 (Aug 2026): this is an upstream React Native bug on
// iOS 26 release builds, unrelated to AdMob specifically — see
// facebook/react-native#54859 and #53960. An async "void" TurboModule
// method that throws an NSException gets funneled through
// convertNSExceptionToJSError() from a background native queue, which
// touches jsi::Runtime off the JS thread and crashes. A 3-line fix exists
// upstream (not yet in a released React Native/Expo version) — applied
// here via patches/react-native+0.81.5.patch (patch-package).
//
// Root cause, step 2: that fix alone wasn't enough — build 40's real crash
// log (SIGABRT, "objc_exception_rethrow" -> uncaught -> terminate) showed
// the patch working exactly as designed (no more memory corruption), but
// nothing catches the re-thrown exception either, so the app still aborts.
// The exception itself is thrown inside react-native-google-mobile-ads'
// iOS bridge for Full Screen Ads (rewarded/interstitial) events — and
// their own README's New Architecture status table lists iOS
// "EventEmitter (Turbo Native Module)" as "To-Do" (not yet migrated),
// which is exactly the crash-prone async/TurboModule code path. Full
// Screen Ads only moved onto that path in v14.5.0 (2024-12-03) — so
// package.json now pins react-native-google-mobile-ads to 14.4.3 (the
// last version before that migration), which should route
// rewarded/interstitial calls through the older, unaffected bridge
// instead. NOT YET VERIFIED ON A REAL DEVICE BUILD.
const USE_TEST_ADS = false;

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
