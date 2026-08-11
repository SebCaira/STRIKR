// Repasse ADS_LIVE a true, UNIQUEMENT pour tester sur un vrai appareil si
// le correctif TurboModule (patches/react-native+0.81.5.patch) empeche
// bien le crash AdMob. A utiliser avec un build "preview" (distribution
// interne), pas avec un vrai build App Store tant que ce n'est pas
// confirme sur un appareil reel.
// Run from strikr-app/: node patch-ads-live-test.js
const fs = require('fs');
const path = require('path');

function write(rel, content) {
  const full = path.join(process.cwd(), rel);
  fs.writeFileSync(full, content);
  console.log('WROTE', rel);
}

write("src/data/shop.ts", "// Diamond packages for the shop. `id` must match the product identifier\n// registered on both App Store Connect and Google Play Console exactly —\n// react-native-iap requests products by this string (see src/lib/iap.ts).\n\n// AdMob is wired in (see ACTIVATION.md). Was OFF for a while: showing a\n// real ad reliably crashed the app on iOS 26 release builds — root cause\n// found (see src/lib/ads.ts) and a candidate fix applied via\n// patches/react-native+0.81.5.patch. TEMPORARILY BACK ON to verify that\n// fix on a real device with a `preview` build. If a real ad still crashes\n// the app, set this back to false immediately and report back — don't\n// ship a production/App Store build with this on until it's survived a\n// real on-device test. When off, every ADS_LIVE check below routes to the\n// pre-monetization \"instant success\" fallback (ShopScreen,\n// useInterstitialAd, useGameEngine's doubleReward) so players still get\n// their reward, just without an actual ad.\nexport const ADS_LIVE = true;\n\n// Real purchases: Paid Apps Agreement signed, banking + tax info done on\n// both App Store Connect and AdMob, and the 4 IAP products exist there\n// (pack_s, pack_m, pack_l, pack_xxl matching SHOP_PACKAGES below). Live now\n// so the real Boutique UI (and its packs) can be screenshotted for each\n// product's required App Store Connect review image. Independent of\n// ADS_LIVE (ads and purchases activate separately).\nexport const MONETIZATION_LIVE = true;\n\nexport interface ShopPackage {\n  id: string;\n  diamonds: number;\n  bonus?: number;\n  priceLabel: string;\n  popular?: boolean;\n}\n\nexport const SHOP_PACKAGES: ShopPackage[] = [\n  { id: 'pack_s', diamonds: 100, priceLabel: '0,99 €' },\n  { id: 'pack_m', diamonds: 350, bonus: 30, priceLabel: '2,99 €', popular: true },\n  { id: 'pack_l', diamonds: 900, bonus: 120, priceLabel: '6,99 €' },\n  { id: 'pack_xxl', diamonds: 2000, bonus: 400, priceLabel: '14,99 €' },\n];\n\nexport const REWARDED_AD_DIAMONDS = 15;\nexport const REWARDED_AD_PER_DAY = 10;\n\n// Forced interstitial: shown every Nth round via ads.ts's showInterstitialAd().\nexport const INTERSTITIAL_EVERY_N_GAMES = 5;\n");

console.log('Done. ADS_LIVE = true (test uniquement).');
