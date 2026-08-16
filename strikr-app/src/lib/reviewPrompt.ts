// App Store / Play Store review prompt, fired at a moment the player is
// clearly enjoying the app (a good win streak — see stats.tsx) rather than
// left to chance. iOS itself throttles SKStoreReviewController to a few
// times per year regardless of how often we call it, but MIN_DAYS_BETWEEN
// below is our own extra courtesy on top of that.
//
// expo-store-review's own JS entry calls requireNativeModule('ExpoStoreReview')
// at *import* time, which throws synchronously if that native module isn't
// compiled into the binary currently running (e.g. any install that
// predates this feature, before its first real build). A plain top-level
// `import` here would run that the instant this file loads — i.e. the
// instant App.tsx loads, since stats.tsx pulls this in unconditionally —
// crashing the whole app on launch for exactly the installs most likely to
// hit this. AsyncStorage stays a static import (safe, already present in
// every build); expo-store-review is required lazily inside the function
// below instead, so a missing native module only ever no-ops this one
// feature via the catch, instead of taking the app down before it can
// render anything — including whatever OTA update was trying to fix it.
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_PROMPT_KEY = 'strikr_review_prompt_last_v1';
const MIN_DAYS_BETWEEN = 90;

export async function maybeRequestReview(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const StoreReview = require('expo-store-review');
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;
    const raw = await AsyncStorage.getItem(LAST_PROMPT_KEY);
    if (raw && Date.now() - Number(raw) < MIN_DAYS_BETWEEN * 86400000) return;
    await StoreReview.requestReview();
    await AsyncStorage.setItem(LAST_PROMPT_KEY, String(Date.now()));
  } catch {
    // Best-effort only — never worth surfacing an error for this.
  }
}
