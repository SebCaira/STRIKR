// Diamond packages for the shop. `id` must match the product identifier
// registered on both App Store Connect and Google Play Console exactly —
// react-native-iap requests products by this string (see src/lib/iap.ts).

// AdMob is wired in (see ACTIVATION.md). Was OFF for a while: showing a
// real ad reliably crashed the app on iOS 26 release builds — root cause
// found (see src/lib/ads.ts) and a candidate fix applied via
// patches/react-native+0.81.5.patch. TEMPORARILY BACK ON to verify that
// fix on a real device with a `preview` build. If a real ad still crashes
// the app, set this back to false immediately and report back — don't
// ship a production/App Store build with this on until it's survived a
// real on-device test. When off, every ADS_LIVE check below routes to the
// pre-monetization "instant success" fallback (ShopScreen,
// useInterstitialAd, useGameEngine's doubleReward) so players still get
// their reward, just without an actual ad.
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
