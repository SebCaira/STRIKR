// react-native-google-mobile-ads' Android native code doesn't compile
// under this app's Old Architecture config (newArchEnabled: false in
// app.json) — its Kotlin package file references a TurboModule spec class
// that only gets generated when the New Architecture is on, so the very
// first Android build ever attempted for this project failed at
// :react-native-google-mobile-ads:compileReleaseKotlin. Ads are already
// off in-app (ADS_LIVE = false in src/data/shop.ts) and not worth blocking
// Android launches over, so autolinking skips this module on Android only
// — iOS is unaffected. src/lib/ads.ts's import is gated behind the same
// platform check, since even just importing the JS package (not calling
// into it) touches the native module and would otherwise crash at launch.
module.exports = {
  dependencies: {
    'react-native-google-mobile-ads': {
      platforms: {
        android: null,
      },
    },
  },
};
