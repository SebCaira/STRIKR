// Ad adapter — the only place that should know how ads are actually shown.
// Everything else (ShopScreen, useInterstitialAd) calls these two functions
// and doesn't care about the AdMob SDK details.
//
// react-native-google-mobile-ads has been fully removed from this project.
// Short version of a long story: real ads never got past the "instant
// crash on device" stage on iOS (multiple root-cause theories tried and
// ruled out — Expo support eventually traced it to a plain uncaught-JS-
// exception bug that several rounds of defensive try/catch never actually
// fixed), and separately, its Android native code doesn't even compile
// under this app's Old Architecture config (newArchEnabled: false). The
// documented, officially-supported way to exclude just the Android side
// (react-native.config.js's platforms.android: null) turned out to be
// unreliable with Expo SDK 54's autolinking in practice — the excluded
// module kept getting linked and failing the same way. Rather than keep
// guessing at increasingly invasive workarounds (each one costing a paid
// EAS Build credit to even test), the library is gone entirely. ADS_LIVE
// was already false (see shop.ts) — no real user ever saw a real ad — so
// every export below just preserves its existing signature as a no-op,
// meaning none of its callers (ShopScreen, useGameEngine,
// useInterstitialAd, App.tsx) need to change at all. Re-add the library
// and real implementations here whenever ads actually get activated.
export const AD_UNIT_IDS = {
  rewarded: '',
  interstitial: '',
};

export function ensureAdsInitialized(): Promise<void> {
  return Promise.resolve();
}

export async function showRewardedAd(): Promise<{ success: boolean }> {
  return { success: true };
}

export async function showInterstitialAd(): Promise<void> {}
