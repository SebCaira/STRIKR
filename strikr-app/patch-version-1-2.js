// Passe la version a 1.2 pour debloquer une nouvelle version dans App
// Store Connect - necessaire pour remplir le champ "URL marketing" (vide
// jusque-la), le seul point qui bloque encore la validation app-ads.txt
// dans AdMob ("Nous n'avons trouve aucun site Web version developpeur").
//
// Meme remarque que pour la 1.1 : runtimeVersion utilise la policy
// "appVersion", donc ce changement cree un nouveau canal de mise a jour
// OTA - les futurs "eas update" cibleront 1.2, pas 1.1.
//
// A appliquer depuis la racine du repo OU depuis strikr-app :
//   node patch-version-1-2.js
//   git add -A
//   git commit -m "Passe en version 1.2 pour ajouter l'URL marketing (validation AdMob)"
//   git push -u origin main
//   cd strikr-app
//   eas build --platform ios
//   eas submit --platform ios
//
// Une fois le build traite par Apple, dans App Store Connect sur la
// version 1.2 :
//   - URL de l'assistance : https://sebcaira.github.io/ (deja bon depuis la 1.1)
//   - URL marketing : https://sebcaira.github.io/ (le champ a remplir maintenant)
//   - "Nouveautes de cette version" : obligatoire, ex. "Corrections diverses."
//   - Selectionner le nouveau build, Enregistrer, puis Ajouter pour verification

const fs = require('fs');
const path = require('path');

function resolveBase() {
  const candidates = [path.join(__dirname, 'strikr-app'), __dirname];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'package.json')) && fs.existsSync(path.join(c, 'App.tsx'))) {
      return c;
    }
  }
  throw new Error(
    "Impossible de trouver le dossier strikr-app (avec package.json et App.tsx dedans). " +
    "Lance ce script depuis la racine du repo (a cote du dossier strikr-app) ou depuis l'interieur de strikr-app."
  );
}
const BASE = resolveBase();
console.log('dossier detecte :', BASE);

function write(rel, content) {
  const full = path.join(BASE, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  console.log('wrote', rel);
}

write("app.json", "{\n  \"expo\": {\n    \"name\": \"strikr-app\",\n    \"slug\": \"strikr-app\",\n    \"version\": \"1.2\",\n    \"orientation\": \"portrait\",\n    \"icon\": \"./assets/icon.png\",\n    \"userInterfaceStyle\": \"light\",\n    \"newArchEnabled\": false,\n    \"ios\": {\n      \"bundleIdentifier\": \"com.sebastiencaira.strikr\",\n      \"supportsTablet\": true,\n      \"infoPlist\": {\n        \"NSPhotoLibraryUsageDescription\": \"STRIKR utilise ta photothèque pour te permettre de choisir une photo de profil.\",\n        \"ITSAppUsesNonExemptEncryption\": false\n      }\n    },\n    \"android\": {\n      \"package\": \"com.sebastiencaira.strikr\",\n      \"adaptiveIcon\": {\n        \"backgroundColor\": \"#ff5a3c\",\n        \"foregroundImage\": \"./assets/android-icon-foreground.png\",\n        \"backgroundImage\": \"./assets/android-icon-background.png\",\n        \"monochromeImage\": \"./assets/android-icon-monochrome.png\"\n      },\n      \"predictiveBackGestureEnabled\": false\n    },\n    \"web\": {\n      \"favicon\": \"./assets/favicon.png\"\n    },\n    \"extra\": {\n      \"eas\": {\n        \"projectId\": \"0d1339ab-631d-4c19-80d7-287300f85a41\"\n      }\n    },\n    \"plugins\": [\n      [\n        \"expo-splash-screen\",\n        {\n          \"image\": \"./assets/splash-icon.png\",\n          \"imageWidth\": 200,\n          \"resizeMode\": \"contain\",\n          \"backgroundColor\": \"#fff8ee\"\n        }\n      ],\n      \"expo-asset\",\n      \"expo-notifications\",\n      [\n        \"react-native-google-mobile-ads\",\n        {\n          \"iosAppId\": \"ca-app-pub-7516626754240121~7782009402\",\n          \"androidAppId\": \"ca-app-pub-7516626754240121~7782009402\"\n        }\n      ]\n    ],\n    \"owner\": \"cairasebastien\",\n    \"privacy\": \"public\",\n    \"runtimeVersion\": {\n      \"policy\": \"appVersion\"\n    },\n    \"updates\": {\n      \"url\": \"https://u.expo.dev/0d1339ab-631d-4c19-80d7-287300f85a41\"\n    }\n  }\n}\n");
