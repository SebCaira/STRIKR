# Activer les vraies pubs et les vrais paiements

Checklist pour le jour où tu as un compte développeur Apple/Google et un compte AdMob. Aujourd'hui, `src/lib/ads.ts` et `src/lib/iap.ts` simulent les deux (mêmes montants, résultat toujours réussi, aucun vrai réseau/paiement) — tout le reste de l'app (Boutique, pub récompensée, interstitiel) passe déjà par ces deux fichiers, donc l'activation ne touche qu'eux.

> ⚠️ **Point important** : les deux SDK ci-dessous (`react-native-google-mobile-ads`, `react-native-iap`) sont des modules natifs. Une fois ajoutés, un simple `eas update` (mise à jour OTA, ce qu'on utilise pour tout le reste) **ne suffit plus** — il faut un vrai `eas build` (nouveau binaire) pour que ces modules soient inclus. Prévois ce temps de build (et de re-soumission si déjà en review) le jour où tu actives ceci.

## 1. Pubs réelles (Google AdMob)

1. Crée un compte [AdMob](https://admob.google.com/), un bloc "Rewarded" et un bloc "Interstitial" pour l'app.
2. `npx expo install react-native-google-mobile-ads`
3. Dans `app.json`, ajoute le plugin (remplace par ton vrai App ID AdMob iOS/Android) :
   ```json
   "plugins": [
     ["react-native-google-mobile-ads", {
       "androidAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY",
       "iosAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~ZZZZZZZZZZ"
     }]
   ]
   ```
4. Dans `src/lib/ads.ts`, remplace les deux valeurs de `AD_UNIT_IDS` par tes vrais IDs de bloc.
5. Toujours dans `src/lib/ads.ts`, remplace le corps de `showRewardedAd`/`showInterstitialAd` par les appels réels du SDK (charger puis afficher un `RewardedAd`/`InterstitialAd` — voir la doc Expo de `react-native-google-mobile-ads`).
6. `eas build` (pas `eas update`) pour un nouveau binaire.

## 2. Vrais paiements (achats de diamants)

1. Dans App Store Connect et Google Play Console, crée un produit IAP consommable par pack de `src/data/shop.ts` (`SHOP_PACKAGES`) — utilise exactement le même `id` (`pack_s`, `pack_m`, `pack_l`, `pack_xxl`) comme identifiant produit des deux côtés, pour ne pas avoir à toucher au reste du code.
2. `npx expo install react-native-iap`
3. Au démarrage de l'app, initialise la connexion et enregistre un `purchaseUpdatedListener` (voir doc `react-native-iap`) qui crédite les diamants puis appelle `finishTransaction` — si possible, fais créditer les diamants côté serveur (une fonction Supabase qui vérifie le reçu) plutôt que côté client, pour éviter qu'un achat soit rejoué.
4. Dans `src/lib/iap.ts`, remplace le corps de `purchasePackage` par `requestPurchase({ sku: packageId })` et résous la promesse une fois le listener confirmé.
5. `eas build` (pas `eas update`) pour un nouveau binaire.

## 3. Mettre à jour les textes de l'app

Une fois les deux ci-dessus branchés, retire les bannières "mode test" :
- `shop_test_mode_banner` / `shop_test_mode_note` dans `src/i18n/dict.ts` (les 3 langues)
- La section "Publicité et achats" de `privacy-policy.md` (mentionne aujourd'hui que tout est simulé)

## 4. Statut réel (mis à jour août 2026)

Les deux SDK sont en fait déjà branchés depuis un moment (voir `src/data/shop.ts`) :
- **Paiements réels** : actifs (`MONETIZATION_LIVE = true`).
- **Pubs réelles** : désactivées (`ADS_LIVE = false`) — une vraie pub fait planter l'app, confirmé par plusieurs crash reports sur appareil réel. Cause identifiée : un bug d'React Native lui-même sur iOS 26 en build release (voir le commentaire détaillé dans `src/lib/ads.ts`, et `facebook/react-native#54859`/`#53960`), pas un problème AdMob. Un correctif est préparé dans `patches/react-native+0.81.5.patch` (via `patch-package`, déjà branché dans `package.json`) mais **n'a pas encore été testé sur un vrai build** — ne pas repasser `ADS_LIVE` à `true` avant d'avoir confirmé sur un appareil réel qu'une pub s'affiche sans planter.
