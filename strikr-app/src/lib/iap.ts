// In-app purchase adapter — the only place that should know whether
// purchases are real or simulated. ShopScreen calls purchasePackage() and
// doesn't care which mode is active.
//
// Real Apple/Google purchases via react-native-iap. Diamonds are credited
// client-side on a successful purchase — same trust model already used for
// rewarded-ad and referral-code diamonds elsewhere in this app, no
// server-side receipt verification. If purchase abuse ever becomes a real
// problem, add verifyPurchase() before crediting — not built today.
//
// This adds a native module — going live needs a full `eas build`, not just
// `eas update` (OTA updates can't add native code to an already-installed
// binary).
import { Platform } from 'react-native';
import {
  initConnection,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  type Purchase,
} from 'react-native-iap';

let initialized = false;

// Safety net: requestPurchase() only resolves once the *request* is sent,
// not once a purchase actually completes — the real outcome only ever
// arrives via purchaseUpdatedListener/purchaseErrorListener below. If
// StoreKit/Play Billing never fires either one for any reason (seen during
// App Review: "no action took place when we tried to purchase gems" — the
// button just sat there forever with no feedback), this promise would
// otherwise hang indefinitely, exactly like ads.ts's LOAD_TIMEOUT was added
// to prevent for the same class of bug.
const PURCHASE_TIMEOUT = 20000;

// Called once at app startup (see App.tsx) — purchasePackage() also calls
// this itself as a fallback so a purchase attempt still works even if
// startup init silently failed (e.g. a transient StoreKit hiccup).
export async function initIAP(): Promise<void> {
  if (initialized || Platform.OS === 'web') return;
  try {
    await initConnection();
    initialized = true;
  } catch {
    // no-op: purchasePackage() will report 'not_connected' if this never recovers
  }
}

export async function purchasePackage(packageId: string): Promise<{ success: boolean; error?: string }> {
  if (!initialized) await initIAP();
  if (!initialized) return { success: false, error: 'not_connected' };

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: { success: boolean; error?: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      updateSub.remove();
      errorSub.remove();
      resolve(result);
    };
    const timeout = setTimeout(() => finish({ success: false, error: 'timeout' }), PURCHASE_TIMEOUT);

    const updateSub = purchaseUpdatedListener(async (purchase: Purchase) => {
      if (purchase.productId !== packageId) return;
      try {
        await finishTransaction({ purchase, isConsumable: true });
      } catch {
        // The store already charged the player even if clearing the purchase
        // token fails — still counts as a success from their point of view.
      }
      finish({ success: true });
    });

    const errorSub = purchaseErrorListener((error) => {
      finish({ success: false, error: error.code === 'E_USER_CANCELLED' ? 'cancelled' : error.message });
    });

    requestPurchase({
      request: { apple: { sku: packageId }, google: { skus: [packageId] } },
      type: 'in-app',
    }).catch((err: any) => {
      finish({ success: false, error: err?.message || 'request_failed' });
    });
  });
}
