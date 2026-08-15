// Repasse ADS_LIVE a false. Meme avec TOUTE la chaine JS blindee en
// try/catch (init, creation, load, show, + les 3 endroits qui appellent),
// le crash reproduit encore, signature identique. Ca confirme que
// l'exception ne vient plus de notre code JS du tout - elle vient de
// l'interieur meme de la librairie native react-native-google-mobile-ads
// ou du SDK AdMob, a un endroit qu'aucun try/catch JS ne peut atteindre.
// Coupe les pubs pour arreter les crashs pendant qu'on remonte cette
// info a Expo/aux mainteneurs de la librairie.
// Run from strikr-app/: node patch-ads-off-native-conclusion.js
const fs = require('fs');
const path = require('path');

function write(rel, content) {
  const full = path.join(process.cwd(), rel);
  fs.writeFileSync(full, content);
  console.log('WROTE', rel);
}

write("src/data/shop.ts", "// Diamond packages for the shop. `id` must match the product identifier\n// registered on both App Store Connect and Google Play Console exactly —\n// react-native-iap requests products by this string (see src/lib/iap.ts).\n\n// AdMob is wired in (see ACTIVATION.md), but OFF — for good reason now.\n// Six fixes tried (build 40/41/42/45, byte-for-byte identical crash every\n// time), see src/lib/ads.ts for the full history. Expo support correctly\n// ruled out the New Architecture theory (newArchEnabled is false, so that\n// code path was never running) and pointed at an ordinary uncaught JS\n// exception going through the legacy bridge's ExceptionsManager. Acting\n// on that, every single JS call in the ad-loading chain — SDK init, ad\n// creation, load, show, and all 3 call sites — was wrapped in try/catch\n// so the promise these functions return is structurally guaranteed to\n// never reject. Still crashed, byte-for-byte identical signature. With\n// every JS-reachable call guarded and the crash persisting regardless,\n// the exception can't be coming from this app's JS at all — it has to be\n// thrown natively, inside react-native-google-mobile-ads' own iOS code\n// or the AdMob SDK itself, at a point no JS try/catch can reach. That's\n// no longer something fixable from here; it needs either a fix from the\n// library maintainers or a different ad SDK (AppLovin MAX, blocked until\n// the app is live on the App Store). Every ADS_LIVE check below routes\n// to the pre-monetization \"instant success\" fallback (ShopScreen,\n// useInterstitialAd, useGameEngine's doubleReward) so players still get\n// their reward, just without an actual ad.\nexport const ADS_LIVE = false;\n\n// Real purchases: Paid Apps Agreement signed, banking + tax info done on\n// both App Store Connect and AdMob, and the 4 IAP products exist there\n// (pack_s, pack_m, pack_l, pack_xxl matching SHOP_PACKAGES below). Live now\n// so the real Boutique UI (and its packs) can be screenshotted for each\n// product's required App Store Connect review image. Independent of\n// ADS_LIVE (ads and purchases activate separately).\nexport const MONETIZATION_LIVE = true;\n\nexport interface ShopPackage {\n  id: string;\n  diamonds: number;\n  bonus?: number;\n  priceLabel: string;\n  popular?: boolean;\n}\n\nexport const SHOP_PACKAGES: ShopPackage[] = [\n  { id: 'pack_s', diamonds: 100, priceLabel: '0,99 €' },\n  { id: 'pack_m', diamonds: 350, bonus: 30, priceLabel: '2,99 €', popular: true },\n  { id: 'pack_l', diamonds: 900, bonus: 120, priceLabel: '6,99 €' },\n  { id: 'pack_xxl', diamonds: 2000, bonus: 400, priceLabel: '14,99 €' },\n];\n\nexport const REWARDED_AD_DIAMONDS = 15;\nexport const REWARDED_AD_PER_DAY = 10;\n\n// Forced interstitial: shown every Nth round via ads.ts's showInterstitialAd().\nexport const INTERSTITIAL_EVERY_N_GAMES = 5;\n");

console.log('Done. ADS_LIVE = false. Conclusion : bug natif hors de portee du JS.');
