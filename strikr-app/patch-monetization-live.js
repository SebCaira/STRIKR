// Flips MONETIZATION_LIVE to true: the Paid Apps Agreement is signed,
// banking + tax info is done on both App Store Connect and AdMob, and the
// 4 IAP products (pack_s, pack_m, pack_l, pack_xxl) exist there matching
// SHOP_PACKAGES. This turns on the real Boutique UI (was showing "coming
// soon") so its packs can actually be screenshotted for each product's
// required App Store Connect review image, and wires purchasePackage()
// through to the real react-native-iap purchase flow.
// This adds/activates a native purchase flow — needs a full `eas build`
// (not `eas update`), same as ADS_LIVE did.
// Run from strikr-app/: node patch-monetization-live.js
const fs = require('fs');
const path = require('path');

function write(rel, content) {
  const full = path.join(process.cwd(), rel);
  fs.writeFileSync(full, content);
  console.log('WROTE', rel);
}

write("src/data/shop.ts", "// Diamond packages for the shop. `id` must match the product identifier\n// registered on both App Store Connect and Google Play Console exactly —\n// react-native-iap requests products by this string (see src/lib/iap.ts).\n\n// AdMob is wired in (see ACTIVATION.md), but temporarily OFF: showing a real\n// ad reliably crashes the app (confirmed via real on-device crash reports —\n// ruled out New Architecture, our AdMob account/ad units, and ad-object\n// init timing as causes; looks like an unresolved bug in the ad library\n// itself on this React Native version). Until that's fixed, every ADS_LIVE\n// check below routes to the pre-monetization \"instant success\" fallback\n// (ShopScreen, useInterstitialAd, useGameEngine's doubleReward) so players\n// still get their reward, just without an actual ad — keeps the app stable\n// for real testers. Flip back to true once the underlying library bug is\n// resolved.\nexport const ADS_LIVE = false;\n\n// Real purchases: Paid Apps Agreement signed, banking + tax info done on\n// both App Store Connect and AdMob, and the 4 IAP products exist there\n// (pack_s, pack_m, pack_l, pack_xxl matching SHOP_PACKAGES below). Live now\n// so the real Boutique UI (and its packs) can be screenshotted for each\n// product's required App Store Connect review image. Independent of\n// ADS_LIVE (ads and purchases activate separately).\nexport const MONETIZATION_LIVE = true;\n\nexport interface ShopPackage {\n  id: string;\n  diamonds: number;\n  bonus?: number;\n  priceLabel: string;\n  popular?: boolean;\n}\n\nexport const SHOP_PACKAGES: ShopPackage[] = [\n  { id: 'pack_s', diamonds: 100, priceLabel: '0,99 €' },\n  { id: 'pack_m', diamonds: 350, bonus: 30, priceLabel: '2,99 €', popular: true },\n  { id: 'pack_l', diamonds: 900, bonus: 120, priceLabel: '6,99 €' },\n  { id: 'pack_xxl', diamonds: 2000, bonus: 400, priceLabel: '14,99 €' },\n];\n\nexport const REWARDED_AD_DIAMONDS = 15;\nexport const REWARDED_AD_PER_DAY = 10;\n\n// Forced interstitial: shown every Nth round via ads.ts's showInterstitialAd().\nexport const INTERSTITIAL_EVERY_N_GAMES = 5;\n");

console.log('Done. MONETIZATION_LIVE is now true — real purchases wired up.');
