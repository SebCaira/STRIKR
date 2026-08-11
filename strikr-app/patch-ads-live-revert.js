// Repasse ADS_LIVE a false : le build 40 (avec le correctif TurboModule)
// a quand meme plante sur une vraie pub, donc le correctif ne suffit pas
// (ou ce n'est pas la meme cause). On revient a l'etat stable en attendant
// un vrai crash log pour comprendre precisement ce qui se passe.
// Run from strikr-app/: node patch-ads-live-revert.js
const fs = require('fs');
const path = require('path');

function write(rel, content) {
  const full = path.join(process.cwd(), rel);
  fs.writeFileSync(full, content);
  console.log('WROTE', rel);
}

write("src/data/shop.ts", "// Diamond packages for the shop. `id` must match the product identifier\n// registered on both App Store Connect and Google Play Console exactly —\n// react-native-iap requests products by this string (see src/lib/iap.ts).\n\n// AdMob is wired in (see ACTIVATION.md), but OFF: showing a real ad still\n// crashes the app on iOS 26 release builds even after the TurboModule fix\n// in patches/react-native+0.81.5.patch (tested build 40, still crashed —\n// see the diagnostic notes in src/lib/ads.ts, being investigated further).\n// Every ADS_LIVE check below routes to the pre-monetization \"instant\n// success\" fallback (ShopScreen, useInterstitialAd, useGameEngine's\n// doubleReward) so players still get their reward, just without an\n// actual ad. Do not flip this back to true without a fresh crash log\n// confirming the real cause this time.\nexport const ADS_LIVE = false;\n\n// Real purchases: Paid Apps Agreement signed, banking + tax info done on\n// both App Store Connect and AdMob, and the 4 IAP products exist there\n// (pack_s, pack_m, pack_l, pack_xxl matching SHOP_PACKAGES below). Live now\n// so the real Boutique UI (and its packs) can be screenshotted for each\n// product's required App Store Connect review image. Independent of\n// ADS_LIVE (ads and purchases activate separately).\nexport const MONETIZATION_LIVE = true;\n\nexport interface ShopPackage {\n  id: string;\n  diamonds: number;\n  bonus?: number;\n  priceLabel: string;\n  popular?: boolean;\n}\n\nexport const SHOP_PACKAGES: ShopPackage[] = [\n  { id: 'pack_s', diamonds: 100, priceLabel: '0,99 €' },\n  { id: 'pack_m', diamonds: 350, bonus: 30, priceLabel: '2,99 €', popular: true },\n  { id: 'pack_l', diamonds: 900, bonus: 120, priceLabel: '6,99 €' },\n  { id: 'pack_xxl', diamonds: 2000, bonus: 400, priceLabel: '14,99 €' },\n];\n\nexport const REWARDED_AD_DIAMONDS = 15;\nexport const REWARDED_AD_PER_DAY = 10;\n\n// Forced interstitial: shown every Nth round via ads.ts's showInterstitialAd().\nexport const INTERSTITIAL_EVERY_N_GAMES = 5;\n");

console.log('Done. ADS_LIVE = false.');
