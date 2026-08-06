// Patch: fixes the app crashing (SIGABRT) every time a rewarded ad is
// shown. The real crash log (.ips from the phone's local Analytics Data)
// showed the actual cause: an uncaught Objective-C exception inside
// facebook::react::ObjCTurboModule::performVoidMethodInvocation, on React
// Native's TurboModule queue — a New Architecture / third-party native
// module interop crash, not the missing AdMob init from the previous
// (necessary but insufficient) fix. react-native-google-mobile-ads isn't
// fully New-Architecture-safe yet, so this disables Expo SDK 54's
// New Architecture default (newArchEnabled: false), falling back to the
// classic, far more battle-tested bridge. Requires a full rebuild — this
// is a native build config flag, not something a JS-only patch can fix at
// runtime.
// Run from strikr-app/: node patch-disable-new-arch.js
const fs = require('fs');
const path = require('path');

function write(rel, content) {
  const full = path.join(process.cwd(), rel);
  fs.writeFileSync(full, content);
  console.log('WROTE', rel);
}

write("app.json", "{\n  \"expo\": {\n    \"name\": \"strikr-app\",\n    \"slug\": \"strikr-app\",\n    \"version\": \"1.0.0\",\n    \"orientation\": \"portrait\",\n    \"icon\": \"./assets/icon.png\",\n    \"userInterfaceStyle\": \"light\",\n    \"newArchEnabled\": false,\n    \"ios\": {\n      \"bundleIdentifier\": \"com.sebastiencaira.strikr\",\n      \"supportsTablet\": true,\n      \"infoPlist\": {\n        \"NSPhotoLibraryUsageDescription\": \"STRIKR utilise ta photothèque pour te permettre de choisir une photo de profil.\",\n        \"ITSAppUsesNonExemptEncryption\": false\n      }\n    },\n    \"android\": {\n      \"package\": \"com.sebastiencaira.strikr\",\n      \"adaptiveIcon\": {\n        \"backgroundColor\": \"#ff5a3c\",\n        \"foregroundImage\": \"./assets/android-icon-foreground.png\",\n        \"backgroundImage\": \"./assets/android-icon-background.png\",\n        \"monochromeImage\": \"./assets/android-icon-monochrome.png\"\n      },\n      \"predictiveBackGestureEnabled\": false\n    },\n    \"web\": {\n      \"favicon\": \"./assets/favicon.png\"\n    },\n    \"extra\": {\n      \"eas\": {\n        \"projectId\": \"0d1339ab-631d-4c19-80d7-287300f85a41\"\n      }\n    },\n    \"plugins\": [\n      [\n        \"expo-splash-screen\",\n        {\n          \"image\": \"./assets/splash-icon.png\",\n          \"imageWidth\": 200,\n          \"resizeMode\": \"contain\",\n          \"backgroundColor\": \"#fff8ee\"\n        }\n      ],\n      \"expo-asset\",\n      \"expo-notifications\",\n      [\n        \"react-native-google-mobile-ads\",\n        {\n          \"iosAppId\": \"ca-app-pub-7516626754240121~7782009402\",\n          \"androidAppId\": \"ca-app-pub-7516626754240121~7782009402\"\n        }\n      ],\n      [\n        \"expo-tracking-transparency\",\n        {\n          \"userTrackingPermission\": \"Cette autorisation permet d'afficher des publicités plus pertinentes pour toi.\"\n        }\n      ]\n    ],\n    \"owner\": \"cairasebastien\",\n    \"privacy\": \"public\"\n  }\n}\n");

console.log('Done. New Architecture disabled — rebuild required to test.');
