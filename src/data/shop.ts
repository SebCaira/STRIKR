// Diamond packages for the (currently simulated) shop. Prices are display
// placeholders only — no real payment is taken yet since there's no Apple/
// Google developer account to register real in-app products with. Swapping
// to real purchases later only requires replacing the "buy" handler in
// ShopScreen with a react-native-iap call keyed by `id`; the catalog and
// diamond amounts stay the same.
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
  { id: 'pack_xl', diamonds: 2000, bonus: 400, priceLabel: '14,99 €' },
];

export const REWARDED_AD_DIAMONDS = 15;
export const REWARDED_AD_PER_DAY = 10;

// Forced interstitial (currently simulated, same as the rewarded ad above —
// swapping to a real network later only means replacing the countdown modal
// in InterstitialAd.tsx with an actual AdMob interstitial call).
export const INTERSTITIAL_EVERY_N_GAMES = 5;
export const INTERSTITIAL_COUNTDOWN_S = 5;
