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

- **Paiements réels** : actifs (`MONETIZATION_LIVE = true`).
- **Pubs réelles** : `react-native-google-mobile-ads` a été réinstallée (`ADS_LIVE = true` dans `src/data/shop.ts`) pour un round de test diagnostique, en suivant la piste donnée par le support Expo (Sarah). Deux sagas distinctes :
  - **iOS** : une vraie pub faisait planter l'app à coup sûr, malgré 6 correctifs tentés (historique complet dans `src/lib/ads.ts`). Sarah (Expo) a fini par identifier la vraie cause : `load()` de cette librairie ne retourne pas de promesse — l'erreur arrive plus tard comme un événement natif dispatché dans les listeners `AdEventType` enregistrés, hors de la pile d'appel de tout ce qui avait été blindé en try/catch jusque-là. `src/lib/ads.ts` blinde maintenant le corps de chaque listener individuellement (dont l'appel à `finish()`) et journalise ce qu'il attrape dans Supabase (`app_events`, `ad_error_diagnostic`) — sans accès à un Mac/Console.app, c'est la seule façon de lire l'erreur réelle. `src/lib/crashReporter.ts` ajoute aussi un handler global (`ErrorUtils.setGlobalHandler`) qui journalise tout crash JS fatal de la même façon, sans avaler l'erreur (l'ancien handler est toujours rappelé). Ce round est **iOS uniquement** : `eas build`/`eas update` avec `--platform ios`, jamais `android` ni `all`.
  - **Android** : toujours cassé — le code Kotlin de la librairie ne compilait pas du tout sous la config Old Architecture de ce projet (`newArchEnabled: false`). La méthode officielle Expo pour exclure juste le côté Android (`react-native.config.js`) s'est révélée peu fiable en pratique avec l'autolinking actuel. Ce round de test ne touche pas à l'Android — ne pas lancer `eas build --platform android` ni `--platform all` tant que ce point n'est pas réglé séparément.
  - Si ce round confirme que le blindage listener-par-listener règle le crash iOS : envisager de retenter l'exclusion Android par une autre méthode avant de considérer les pubs comme prêtes pour les deux plateformes.
