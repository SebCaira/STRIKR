// Ad adapter — the only place that should know whether ads are real or
// simulated. Everything else (ShopScreen, InterstitialAd, useInterstitialAd)
// calls these two functions and doesn't care which mode is active.
//
// Currently simulated (no ad network wired in): showRewardedAd resolves after
// a short delay so the UI still feels like a real rewarded-ad flow;
// showInterstitialAd is a no-op (the actual countdown UI lives in
// InterstitialAd.tsx, which stays as-is either way).
//
// --- To activate real Google AdMob ads once you have a developer account ---
// 1. `npx expo install react-native-google-mobile-ads`
// 2. Add the config plugin to app.json (see ACTIVATION.md at the repo root
//    for the exact block) with your real AdMob App ID.
// 3. In App Store Connect / Play Console, create a Rewarded and an
//    Interstitial ad unit, then replace the two `AD_UNIT_IDS` placeholders
//    below with the real ad unit IDs.
// 4. Replace the body of showRewardedAd/showInterstitialAd with the SDK's
//    RewardedAd/InterstitialAd load+show calls (see AdMob's Expo guide).
// 5. This adds a native module — the next release needs a full `eas build`,
//    not just `eas update` (OTA updates can't add native code to an
//    already-installed binary).
export const AD_UNIT_IDS = {
  rewarded: '[REPLACE WITH REAL ADMOB REWARDED AD UNIT ID]',
  interstitial: '[REPLACE WITH REAL ADMOB INTERSTITIAL AD UNIT ID]',
};

export async function showRewardedAd(): Promise<{ success: boolean }> {
  await new Promise((resolve) => setTimeout(resolve, 2500));
  return { success: true };
}

export async function showInterstitialAd(): Promise<void> {
  // Intentionally empty — InterstitialAd.tsx renders its own countdown UI
  // regardless of ad mode; this hook point exists for when a real
  // interstitial needs to be pre-loaded ahead of time.
}
