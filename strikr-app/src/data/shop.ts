// Diamond packages for the shop. `id` must match the product identifier
// registered on both App Store Connect and Google Play Console exactly —
// react-native-iap requests products by this string (see src/lib/iap.ts).

// AdMob is wired in (see ACTIVATION.md). Three independent fixes tried on
// real devices — the RN TurboModule patch, downgrading
// react-native-google-mobile-ads to a pre-TurboModule version, and adding
// the missing UMP/GDPR consent flow (kept, it's a real requirement
// regardless) — all produced the exact same crash (build 40/41/42, byte-
// for-byte identical stack traces). See src/lib/ads.ts for the full
// history and a 4th, not-yet-tested hypothesis found afterwards (ad
// objects were being created before the SDK finished initializing) —
// ADS_LIVE is flipped back on here specifically to test that fix on
// build 45 via `eas update` (no new native build needed, AdMob is
// already compiled in). If this crashes again on a real device, flip it
// back to false immediately and switch to a different ad SDK entirely —
// AppLovin MAX is blocked until the app is live on the App Store, so
// don't retry that until then. Every ADS_LIVE check below routes to the
// pre-monetization "instant success" fallback (ShopScreen,
// useInterstitialAd, useGameEngine's doubleReward) so players still get
// their reward when it's off, just without an actual ad.
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
