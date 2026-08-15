// Repasse ADS_LIVE a true pour tester une 4e hypothese sur le crash
// AdMob, distincte des 3 deja testees et echouees (patch RN TurboModule,
// downgrade lib, consentement UMP) : les objets pub RewardedAd/
// InterstitialAd etaient crees avant que le SDK AdMob ait fini son
// initialisation (voir src/lib/ads.ts) - deja corrige dans le code, mais
// jamais teste sur un vrai build. AdMob est deja compile dans le build
// 45 donc ce test passe par eas update, pas besoin d'un nouveau build.
// Si ca crash encore, repasser ADS_LIVE a false immediatement.
// Run from strikr-app/: node patch-ads-live-retest.js
const fs = require('fs');
const path = require('path');

function write(rel, content) {
  const full = path.join(process.cwd(), rel);
  fs.writeFileSync(full, content);
  console.log('WROTE', rel);
}

write("src/data/shop.ts", "// Diamond packages for the shop. `id` must match the product identifier\n// registered on both App Store Connect and Google Play Console exactly —\n// react-native-iap requests products by this string (see src/lib/iap.ts).\n\n// AdMob is wired in (see ACTIVATION.md). Three independent fixes tried on\n// real devices — the RN TurboModule patch, downgrading\n// react-native-google-mobile-ads to a pre-TurboModule version, and adding\n// the missing UMP/GDPR consent flow (kept, it's a real requirement\n// regardless) — all produced the exact same crash (build 40/41/42, byte-\n// for-byte identical stack traces). See src/lib/ads.ts for the full\n// history and a 4th, not-yet-tested hypothesis found afterwards (ad\n// objects were being created before the SDK finished initializing) —\n// ADS_LIVE is flipped back on here specifically to test that fix on\n// build 45 via `eas update` (no new native build needed, AdMob is\n// already compiled in). If this crashes again on a real device, flip it\n// back to false immediately and switch to a different ad SDK entirely —\n// AppLovin MAX is blocked until the app is live on the App Store, so\n// don't retry that until then. Every ADS_LIVE check below routes to the\n// pre-monetization \"instant success\" fallback (ShopScreen,\n// useInterstitialAd, useGameEngine's doubleReward) so players still get\n// their reward when it's off, just without an actual ad.\nexport const ADS_LIVE = true;\n\n// Real purchases: Paid Apps Agreement signed, banking + tax info done on\n// both App Store Connect and AdMob, and the 4 IAP products exist there\n// (pack_s, pack_m, pack_l, pack_xxl matching SHOP_PACKAGES below). Live now\n// so the real Boutique UI (and its packs) can be screenshotted for each\n// product's required App Store Connect review image. Independent of\n// ADS_LIVE (ads and purchases activate separately).\nexport const MONETIZATION_LIVE = true;\n\nexport interface ShopPackage {\n  id: string;\n  diamonds: number;\n  bonus?: number;\n  priceLabel: string;\n  popular?: boolean;\n}\n\nexport const SHOP_PACKAGES: ShopPackage[] = [\n  { id: 'pack_s', diamonds: 100, priceLabel: '0,99 €' },\n  { id: 'pack_m', diamonds: 350, bonus: 30, priceLabel: '2,99 €', popular: true },\n  { id: 'pack_l', diamonds: 900, bonus: 120, priceLabel: '6,99 €' },\n  { id: 'pack_xxl', diamonds: 2000, bonus: 400, priceLabel: '14,99 €' },\n];\n\nexport const REWARDED_AD_DIAMONDS = 15;\nexport const REWARDED_AD_PER_DAY = 10;\n\n// Forced interstitial: shown every Nth round via ads.ts's showInterstitialAd().\nexport const INTERSTITIAL_EVERY_N_GAMES = 5;\n");

console.log('Done. ADS_LIVE = true (test du fix "creation lazy des objets pub").');
