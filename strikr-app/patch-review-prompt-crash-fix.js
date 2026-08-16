// URGENT : reviewPrompt.ts importait expo-store-review de facon non
// protegee (import statique en haut du fichier). Le code source du module
// (requireNativeModule) prouve qu'il leve une exception IMMEDIATE des
// qu'on l'importe si le module natif n'est pas compile dans le binaire en
// cours d'execution - et comme stats.tsx importe reviewPrompt.ts sans
// condition, ca plantait TOUTE l'app au demarrage sur n'importe quel
// telephone n'ayant pas encore le tout dernier build natif (celui avec
// expo-store-review compile dedans). Resultat concret : depuis l'ajout de
// cette fonctionnalite ce matin, aucune mise a jour envoyee depuis n'a pu
// s'afficher sur les appareils sans ce module - meme apres reinstallation
// complete, puisque chaque nouveau bundle plantait pareil au chargement.
// Fix : le require() d'expo-store-review est deplace a l'interieur de la
// fonction, dans le try/catch deja present - un module natif manquant
// desactive juste la demande de notation au lieu de planter toute l'app.
// Run from strikr-app/: node patch-review-prompt-crash-fix.js
const fs = require('fs');
const path = require('path');

function write(rel, content) {
  const full = path.join(process.cwd(), rel);
  fs.writeFileSync(full, content);
  console.log('WROTE', rel);
}

write("src/lib/reviewPrompt.ts", "// App Store / Play Store review prompt, fired at a moment the player is\n// clearly enjoying the app (a good win streak — see stats.tsx) rather than\n// left to chance. iOS itself throttles SKStoreReviewController to a few\n// times per year regardless of how often we call it, but MIN_DAYS_BETWEEN\n// below is our own extra courtesy on top of that.\n//\n// expo-store-review's own JS entry calls requireNativeModule('ExpoStoreReview')\n// at *import* time, which throws synchronously if that native module isn't\n// compiled into the binary currently running (e.g. any install that\n// predates this feature, before its first real build). A plain top-level\n// `import` here would run that the instant this file loads — i.e. the\n// instant App.tsx loads, since stats.tsx pulls this in unconditionally —\n// crashing the whole app on launch for exactly the installs most likely to\n// hit this. AsyncStorage stays a static import (safe, already present in\n// every build); expo-store-review is required lazily inside the function\n// below instead, so a missing native module only ever no-ops this one\n// feature via the catch, instead of taking the app down before it can\n// render anything — including whatever OTA update was trying to fix it.\nimport AsyncStorage from '@react-native-async-storage/async-storage';\n\nconst LAST_PROMPT_KEY = 'strikr_review_prompt_last_v1';\nconst MIN_DAYS_BETWEEN = 90;\n\nexport async function maybeRequestReview(): Promise<void> {\n  try {\n    // eslint-disable-next-line @typescript-eslint/no-var-requires\n    const StoreReview = require('expo-store-review');\n    const available = await StoreReview.isAvailableAsync();\n    if (!available) return;\n    const raw = await AsyncStorage.getItem(LAST_PROMPT_KEY);\n    if (raw && Date.now() - Number(raw) < MIN_DAYS_BETWEEN * 86400000) return;\n    await StoreReview.requestReview();\n    await AsyncStorage.setItem(LAST_PROMPT_KEY, String(Date.now()));\n  } catch {\n    // Best-effort only — never worth surfacing an error for this.\n  }\n}\n");

console.log('Done. Plus aucun risque de crash au demarrage sur un vieux build.');
