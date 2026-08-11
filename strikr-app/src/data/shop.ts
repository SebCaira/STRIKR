// Diamond packages for the shop. `id` must match the product identifier
// registered on both App Store Connect and Google Play Console exactly —
// react-native-iap requests products by this string (see src/lib/iap.ts).

// AdMob is wired in (see ACTIVATION.md), but OFF: a real ad crashes the
// app on iOS 26 release builds no matter what we've tried on our side —
// the RN TurboModule fix (patches/react-native+0.81.5.patch, still
// applied, still worth keeping), and pinning react-native-google-mobile-
// ads to a pre-TurboModule version (build 41, still crashed identically —
// see src/lib/ads.ts). Every angle within our own code is now ruled out;
// what's left is either an upstream React Native fix or a Google SDK fix,
// neither in our hands. Every ADS_LIVE check below routes to the
// pre-monetization "instant success" fallback (ShopScreen,
// useInterstitialAd, useGameEngine's doubleReward) so players still get
// their reward, just without an actual ad. Revisit only after checking
// whether react-native-google-mobile-ads or React Native itself has
// shipped a real fix — don't keep re-testing variations of our own code.
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
