// Diamond packages for the shop. `id` must match the product identifier
// registered on both App Store Connect and Google Play Console exactly —
// react-native-iap requests products by this string (see src/lib/iap.ts).

// AdMob diagnostic round (Aug 2026) — react-native-google-mobile-ads is
// back after Expo support (Sarah) traced the iOS crash to errors thrown
// inside AdEventType listener callbacks, off the call stack of every
// try/catch added in earlier rounds (full history in src/lib/ads.ts).
// ads.ts now wraps each listener body in its own try/catch and reports
// whatever it catches to Supabase (app_events, event_name
// 'ad_error_diagnostic'/'js_global_error') so it's readable without a Mac.
// ADS_LIVE is true so this path actually runs — per Sarah's own advice,
// only via a TestFlight build, not a full production release. The
// separate Android native-compile failure under this app's Old
// Architecture config is untouched by any of this, so this round is
// iOS-only: build/update with --platform ios, never android or all.
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

// Every Nth round, instead of a forced interstitial with nothing in return,
// the player is offered a rewarded interstitial (see RewardedInterstitialModal)
// — accept and watch for +REWARDED_INTERSTITIAL_DIAMONDS, or decline and
// continue for free. No daily cap: it's opt-in, so there's no forced-view
// quota to protect the way REWARDED_AD_PER_DAY does for the Shop's button.
export const INTERSTITIAL_EVERY_N_GAMES = 5;
export const REWARDED_INTERSTITIAL_DIAMONDS = 10;
