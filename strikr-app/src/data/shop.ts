// Diamond packages for the shop. `id` must match the product identifier
// registered on both App Store Connect and Google Play Console exactly —
// react-native-iap requests products by this string (see src/lib/iap.ts).

// AdMob is wired in (see ACTIVATION.md). Four fixes aimed at the wrong
// layer (build 40/41/42/45, byte-for-byte identical crash each time) —
// see src/lib/ads.ts for that full history. Expo support's reply finally
// explained why: newArchEnabled is false, so the New Architecture
// TurboModule bug those fixes targeted was never actually in play, and
// com.facebook.react.ExceptionsManagerQueue is React Native's *legacy*
// bridge — the crash is an ordinary uncaught JS exception (most likely
// showRewardedAd() reusing a stale, still-in-flight ad instance between
// its two independent callers and calling show() on it twice) getting
// rethrown as a native RCTFatalException in a release build. Fixed in
// ads.ts (in-flight guard + try/catch around show()); ADS_LIVE flipped
// back on here specifically to test that fix — no new native build
// needed, AdMob is already compiled in. If this crashes again, flip it
// back to false immediately; if it doesn't, ads actually work now. Every
// ADS_LIVE check below routes to the pre-monetization "instant success"
// fallback (ShopScreen, useInterstitialAd, useGameEngine's doubleReward)
// when off, so players still get their reward either way.
export const ADS_LIVE = true;

// Real purchases: Paid Apps Agreement signed, banking + tax info done on
// both App Store Connect and AdMob, and the 4 IAP products exist there
// (pack_s, pack_m, pack_l, pack_xxl matching SHOP_PACKAGES below). Live now
// so the real Boutique UI (and its packs) can be screenshotted for each
// product's required App Store Connect review image. Independent of
// ADS_LIVE (ads and purchases activate separately).
export const MONETIZATION_LIVE = true;

export interface ShopPackage {
  id: string;
  diamonds: number;
  bonus?: number;
  priceLabel: string;
  popular?: boolean;
}

export const SHOP_PACKAGES: ShopPackage[] = [
  { id: 'pack_s', diamonds: 100, priceLabel: '0,99 €' },
  { id: 'pack_m', diamonds: 350, bonus: 30, priceLabel: '2,99 €', popular: true },
  { id: 'pack_l', diamonds: 900, bonus: 120, priceLabel: '6,99 €' },
  { id: 'pack_xxl', diamonds: 2000, bonus: 400, priceLabel: '14,99 €' },
];

export const REWARDED_AD_DIAMONDS = 15;
export const REWARDED_AD_PER_DAY = 10;

// Forced interstitial: shown every Nth round via ads.ts's showInterstitialAd().
export const INTERSTITIAL_EVERY_N_GAMES = 5;
