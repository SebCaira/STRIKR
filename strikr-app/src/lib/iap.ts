// In-app purchase adapter — the only place that should know whether
// purchases are real or simulated. ShopScreen calls purchasePackage() and
// doesn't care which mode is active.
//
// Currently simulated (no payment processor wired in): purchasePackage
// resolves immediately as successful, no money changes hands.
//
// --- To activate real Apple/Google purchases once you have a developer
//     account and have registered the packages below as IAP products ---
// 1. `npx expo install react-native-iap`
// 2. In App Store Connect / Play Console, create one consumable IAP product
//    per entry in shop.ts's SHOP_PACKAGES, using the exact same `id` as the
//    product ID (pack_s, pack_m, pack_l, pack_xl) — keeps this file's
//    plumbing unchanged.
// 3. At app startup, call `initConnection()` and register a
//    `purchaseUpdatedListener` (see react-native-iap's docs) that calls
//    `finishTransaction` after crediting diamonds — do the diamond credit
//    server-side if at all possible (a client-only credit can be replayed).
// 4. Replace the body of purchasePackage with `requestPurchase({ sku: id })`
//    and resolve once the listener confirms it.
// 5. This adds a native module — the next release needs a full `eas build`,
//    not just `eas update` (OTA updates can't add native code to an
//    already-installed binary).
export async function purchasePackage(_packageId: string): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}
