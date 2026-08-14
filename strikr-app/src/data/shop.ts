// Diamond packages for the shop. `id` must match the product identifier
// registered on both App Store Connect and Google Play Console exactly —
// react-native-iap requests products by this string (see src/lib/iap.ts).

// AdMob is wired in (see ACTIVATION.md), but OFF — for good reason now.
// Six fixes tried (build 40/41/42/45, byte-for-byte identical crash every
// time), see src/lib/ads.ts for the full history. Expo support correctly
// ruled out the New Architecture theory (newArchEnabled is false, so that
// code path was never running) and pointed at an ordinary uncaught JS
// exception going through the legacy bridge's ExceptionsManager. Acting
// on that, every single JS call in the ad-loading chain — SDK init, ad
// creation, load, show, and all 3 call sites — was wrapped in try/catch
// so the promise these functions return is structurally guaranteed to
// never reject. Still crashed, byte-for-byte identical signature. With
// every JS-reachable call guarded and the crash persisting regardless,
// the exception can't be coming from this app's JS at all — it has to be
// thrown natively, inside react-native-google-mobile-ads' own iOS code
// or the AdMob SDK itself, at a point no JS try/catch can reach. That's
// no longer something fixable from here; it needs either a fix from the
// library maintainers or a different ad SDK (AppLovin MAX, blocked until
// the app is live on the App Store). Every ADS_LIVE check below routes
// to the pre-monetization "instant success" fallback (ShopScreen,
// useInterstitialAd, useGameEngine's doubleReward) so players still get
// their reward, just without an actual ad.
export const ADS_LIVE = false;

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
