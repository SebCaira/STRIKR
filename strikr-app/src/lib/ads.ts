// Ad adapter — the only place that should know how ads are actually shown.
// Everything else (ShopScreen, useInterstitialAd) calls these two functions
// and doesn't care about the AdMob SDK details.
import mobileAds, { AdEventType, AdsConsent, AdsConsentStatus, InterstitialAd, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

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
//
// Root cause, step 3 (dead end): theorized the exception came from
// react-native-google-mobile-ads' iOS EventEmitter bridge specifically,
// since their README's New Architecture status table lists iOS
// "EventEmitter (Turbo Native Module)" as "To-Do", and Full Screen Ads
// only moved onto that path in v14.5.0 (2024-12-03). Pinned the library
// to 14.4.3 (the last version before that migration) to test it — build
// 41's crash log was byte-for-byte the same crash signature. Ruled out:
// the library version doesn't matter, so the exception isn't coming from
// that specific migration. Whatever throws it, it's happening at a layer
// this app's code can't reach or catch (matches newArchEnabled:false
// already not helping either, from the very first diagnostic pass).
//
// Root cause, step 4 (new lead, untested): the app never implemented the
// User Messaging Platform (UMP) consent flow Google requires for EEA
// users before requesting ads — our tester is in France, squarely EEA.
// Google's own SDK is known to behave unpredictably (including crash
// reports for consent-related bugs on iOS, e.g.
// googleads-mobile-unity#2617) when an ad is requested without consent
// having been gathered first. This is unrelated to the TurboModule
// theory entirely, and — unlike the RN patch and the library downgrade —
// hasn't been tried yet. Consent gathering is now wired into
// ensureAdsInitialized() below, before mobileAds().initialize().
//
// Root cause, step 5 (Expo support reply, Aug 2026) — the real one:
// step 1's whole premise was wrong. newArchEnabled is false in app.json,
// so the New Architecture TurboModule code the RN patch targeted was
// never even running — that's exactly why patching it changed nothing.
// com.facebook.react.ExceptionsManagerQueue is React Native's *legacy*
// bridge ExceptionsManager: in a release build, an uncaught JS exception
// thrown inside a native-invoked callback gets rethrown as a native
// RCTFatalException and aborts the app. So this was always a plain,
// catchable bug in our own JS, not an unfixable native/iOS 26 issue. See
// the fix at showRewardedAd()/showInterstitialAd() below (in-flight guard
// + try/catch around show()) for the concrete bug this most likely was.
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
  if (!initPromise) {
    initPromise = (async () => {
      // Gather EEA consent before initializing the SDK, per Google's
      // documented flow — never implemented before now. If this fails for
      // any reason, still initialize rather than leave ads permanently
      // broken; worst case the SDK falls back to non-personalized ads.
      try {
        const consentInfo = await AdsConsent.requestInfoUpdate();
        if (
          consentInfo.isConsentFormAvailable &&
          (consentInfo.status === AdsConsentStatus.REQUIRED || consentInfo.status === AdsConsentStatus.UNKNOWN)
        ) {
          await AdsConsent.showForm();
        }
      } catch (e) {
        console.warn('AdsConsent gathering failed', e);
      }
      await mobileAds().initialize();
    })();
  }
  return initPromise;
}

// Each ad object is single-use (load → show → gone), so a fresh one is
// created after every show() to have the next ad ready to load.
let rewarded: RewardedAd | null = null;
let interstitial: InterstitialAd | null = null;

// Root cause, step 5 (Expo support, Aug 2026): steps 1-4 above chased the
// wrong layer entirely — newArchEnabled is false in app.json, so the
// TurboModule/New-Architecture theory in step 1 never applied here in the
// first place (that's *why* the RN patch changed nothing: the code it
// patched was never running). Expo support traced
// com.facebook.react.ExceptionsManagerQueue to React Native's *legacy*
// bridge: in a release build, any uncaught JS exception thrown inside a
// native-invoked callback (e.g. an AdEventType listener) gets rethrown as
// a native RCTFatalException and aborts the whole app — this is an
// ordinary, catchable bug in our own JS, not an unfixable native/iOS 26
// issue.
//
// showRewardedAd() has two independent callers (ShopScreen's "watch an
// ad" button and useGameEngine's doubleReward) that each only guard
// against re-entering *themselves* — neither knows about the other. If
// one call is abandoned mid-flight (e.g. leaving Shop before its ad
// resolves) while `rewarded` still points at that same not-yet-settled
// ad object, a second call from the other caller reuses it instead of a
// fresh instance, so two independent LOADED listeners can both end up
// calling show() on the same ad — calling show() twice on one ad is a
// documented way to make AdMob's SDK throw. rewardedInFlight below
// closes that gap: a second concurrent call fails immediately instead of
// sharing state with one already in progress. current.show() is also now
// wrapped in try/catch so that if it (or anything else here) throws for
// any reason at all, the round just continues without an ad — matching
// the app's own stated philosophy — instead of taking the whole app down.
let rewardedInFlight = false;
let interstitialInFlight = false;

function freshRewarded(): RewardedAd {
  rewarded = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);
  return rewarded;
}

function freshInterstitial(): InterstitialAd {
  interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
  return interstitial;
}

export async function showRewardedAd(): Promise<{ success: boolean }> {
  if (rewardedInFlight) return { success: false };
  rewardedInFlight = true;
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
      rewardedInFlight = false;
      resolve({ success });
    };
    const timeout = setTimeout(() => finish(false), LOAD_TIMEOUT);
    const unsubEarned = current.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const unsubLoaded = current.addAdEventListener(AdEventType.LOADED, () => {
      try {
        current.show();
      } catch (e) {
        console.warn('RewardedAd.show() threw', e);
        finish(false);
      }
    });
    const unsubClosed = current.addAdEventListener(AdEventType.CLOSED, () => finish(earned));
    const unsubError = current.addAdEventListener(AdEventType.ERROR, () => finish(false));
    current.load();
  });
}

export async function showInterstitialAd(): Promise<void> {
  if (interstitialInFlight) return;
  interstitialInFlight = true;
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
      interstitialInFlight = false;
      resolve();
    };
    const timeout = setTimeout(finish, LOAD_TIMEOUT);
    const unsubLoaded = current.addAdEventListener(AdEventType.LOADED, () => {
      try {
        current.show();
      } catch (e) {
        console.warn('InterstitialAd.show() threw', e);
        finish();
      }
    });
    const unsubClosed = current.addAdEventListener(AdEventType.CLOSED, finish);
    // Failing to load a real ad shouldn't block the game — the round just
    // continues without an interstitial that round.
    const unsubError = current.addAdEventListener(AdEventType.ERROR, finish);
    current.load();
  });
}
