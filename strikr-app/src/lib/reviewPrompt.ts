// App Store / Play Store review prompt, fired at a moment the player is
// clearly enjoying the app (a good win streak — see stats.tsx) rather than
// left to chance. iOS itself throttles SKStoreReviewController to a few
// times per year regardless of how often we call it, but MIN_DAYS_BETWEEN
// below is our own extra courtesy on top of that.
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_PROMPT_KEY = 'strikr_review_prompt_last_v1';
const MIN_DAYS_BETWEEN = 90;

export async function maybeRequestReview(): Promise<void> {
  try {
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
