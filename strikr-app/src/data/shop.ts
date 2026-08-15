// Diamond packages for the shop. `id` must match the product identifier
// registered on both App Store Connect and Google Play Console exactly —
// react-native-iap requests products by this string (see src/lib/iap.ts).

// AdMob is gone (see ACTIVATION.md) — react-native-google-mobile-ads was
// fully removed from the project. Short version of a long story: real ads
// never got past "instant crash on device" on iOS across six separate
// fixes (build 40/41/42/45, byte-for-byte identical crash every time —
// full history was in src/lib/ads.ts's comments before this), and
// separately its Android native code never even compiled under this app's
// Old Architecture config. The documented, official way to exclude just
// the Android side (react-native.config.js) turned out to be unreliable
// with Expo's autolinking in practice. Rather than keep guessing at
// increasingly invasive workarounds — each attempt costing a paid EAS
// Build credit just to find out whether it worked — the library was
// removed outright. It needs either a fix from the library maintainers
// (or Expo's autolinking), or a different ad SDK (AppLovin MAX, blocked
// until the app is live on the App Store) before this comes back. Every
// ADS_LIVE check below routes to the pre-monetization "instant success"
// fallback (ShopScreen, useInterstitialAd, useGameEngine's doubleReward)
// so players still get their reward, just without an actual ad.
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
