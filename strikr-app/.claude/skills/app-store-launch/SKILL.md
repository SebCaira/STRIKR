---
name: app-store-launch
description: Guide de statut pour publier STRIKR (cette app) sur l'App Store et Google Play — utiliser ce skill dès que l'utilisateur parle de soumettre/publier/sortir l'app, de compte développeur Apple ou Google, de review, de "app store", de captures d'écran ou fiche store, ou demande "où on en est"/"c'est quoi la suite" pour la sortie de l'app. Ne fait pas juste un résumé : vérifie l'état réel du dépôt (textes légaux complétés ou non, identifiants iOS/Android configurés, pubs/paiements réels branchés ou simulés) puis donne UNE seule prochaine étape concrète, adaptée à un utilisateur non-développeur.
---

# Lancer STRIKR sur l'App Store et Google Play

STRIKR appartient à un utilisateur qui n'est pas développeur — chaque interaction doit se terminer par UNE action concrète et sans jargon, pas par une liste de 10 choses. Ce skill sait où en est le projet en lisant les fichiers du dépôt ; il complète ça par ce que seul l'utilisateur sait (statut d'un compte externe, résultat d'une review Apple, etc.).

## Comment vérifier l'état réel (fais-le avant de répondre)

Ne te fie pas à ce que la conversation dit avoir été fait plus tôt — les fichiers ont pu changer depuis. Relis-les.

1. **Textes légaux** — `grep -o '\[[A-ZÀÉ][^]]*\]' privacy-policy.md terms-of-service.md` (à la racine du dépôt, pas dans `strikr-app/`). Toute occurrence restante (`[NOM DE L'ÉDITEUR]`, `[ADRESSE E-MAIL DE CONTACT]`, etc.) veut dire que ce texte n'est pas encore complété — ne JAMAIS supposer qu'ils sont prêts sans vérifier.
2. **Identifiants d'app** — dans `strikr-app/app.json`, cherche `ios.bundleIdentifier` et `android.package`. S'ils sont absents, l'app n'a pas encore d'identité iOS/Android — Apple/Google en ont besoin avant même de créer la fiche.
3. **Pubs et paiements réels** — dans `strikr-app/package.json`, cherche `react-native-iap` et `react-native-google-mobile-ads`. Absents = tout est encore simulé (voir `strikr-app/ACTIVATION.md`), ce qui est acceptable pour une v1 mais doit être une décision consciente de l'utilisateur, pas un oubli.
4. **Fiche store** — `strikr-app/store-listing.md` existe et est à jour (description, mots-clés, catégorie) : normalement déjà prêt, vérifie juste qu'il ne mentionne pas des jeux/modes qui n'existent plus.
5. **Visuels** — `strikr-app/assets/icon.png` (icône) et `strikr-app/marketing/*.png` (captures d'écran) existent déjà, mais probablement pas encore aux tailles exactes exigées par Apple/Google (voir `references/visuels.md`).
6. **Build natif fait ou pas** — il n'y a pas de `eas.json` dans `strikr-app/` à ce stade, donc aucun build de soumission n'a encore été lancé.
7. **Permissions déclarées** — dans `strikr-app/app.json` sous `ios.infoPlist`, chaque usage d'une permission (photothèque via `expo-image-picker`, etc.) doit avoir sa `NSxxxUsageDescription`. Si une nouvelle permission est ajoutée au code plus tard (caméra, contacts...), vérifie qu'elle a bien sa description ici — Apple rejette sinon.

Pour tout le reste (compte développeur créé ou non, statut d'une soumission, retour de review), demande directement à l'utilisateur — tu ne peux pas le savoir depuis le code.

## Point à ne jamais oublier : le compte de démo pour la review

STRIKR impose une connexion (pas de mode invité — voir `src/state/auth.tsx`). Apple **rejette automatiquement** une app avec login si l'équipe de review n'a pas d'identifiants pour se connecter. Avant toute soumission iOS, il faut :
1. Créer un compte de test dédié dans l'app (email + mot de passe simples, jamais le compte perso de l'utilisateur).
2. Le renseigner dans App Store Connect → section "App Review Information" → "Sign-in required" (cocher) → email + mot de passe.

Google Play ne l'exige pas aussi strictement mais c'est une bonne pratique d'y penser aussi si demandé.

## L'ordre des étapes

Ne saute pas d'étape et ne les présente pas toutes en même temps. Identifie où en est l'utilisateur avec les vérifications ci-dessus + ce qu'il te dit, puis annonce clairement laquelle est la prochaine, pourquoi, et propose de l'aider à l'accomplir (remplir un texte, générer un visuel, écrire une commande à copier-coller).

1. **Comptes développeur** — Apple Developer Program (99 $/an, https://developer.apple.com/programs/enroll/) et Google Play Console (25 $ une fois, https://play.google.com/console/signup). Étape purement administrative côté utilisateur ; toi tu peux expliquer le processus si besoin (détails dans `references/comptes-developpeur.md`).
2. **Identité de l'app** — définir `ios.bundleIdentifier` (format `com.tondomaine.strikr`) et `android.package` dans `app.json`. Demande à l'utilisateur son nom de domaine/marque préféré s'il n'en a pas, propose une valeur par défaut raisonnable (ex. `com.strikr.app`) et explique que ça ne se change plus après la première soumission.
3. **Textes légaux complétés et hébergés** — remplis les `[PLACEHOLDER]` dans `privacy-policy.md`/`terms-of-service.md` avec ce que l'utilisateur te donne (nom/raison sociale, email de contact, pays), puis rappelle qu'Apple/Google demandent une URL publique — les artefacts déjà publiés cette session (si applicable) ou une page perso suffisent.
4. **Décider : pubs/paiements réels ou simulés pour la v1** — si l'utilisateur n'a pas encore de compte AdMob, il est tout à fait raisonnable de publier une v1 avec les achats/pubs simulés désactivés ou en mode démo, et d'activer le réel plus tard via `strikr-app/ACTIVATION.md`. Ne bloque pas la sortie là-dessus sans qu'il le demande explicitement.
5. **Visuels aux bonnes tailles** — voir `references/visuels.md` pour les dimensions exactes exigées par plateforme ; propose de régénérer les captures d'écran/icônes si les fichiers actuels ne correspondent pas.
6. **Remplir les fiches App Store Connect / Play Console** — copie/adapte le contenu de `strikr-app/store-listing.md` dans les bons champs ; `references/comptes-developpeur.md` détaille où chaque champ va sur chaque plateforme.
7. **Build de soumission avec EAS** — commandes exactes et pièges courants dans `references/build-et-soumission.md`. Rappelle systématiquement : si des SDK natifs ont été ajoutés (pubs/paiements réels, étape 4), il faut un vrai `eas build`, jamais `eas update` (l'OTA ne peut pas ajouter de code natif à un binaire déjà installé).
8. **Compte de démo pour la review Apple** — voir l'encart ci-dessus ; à préparer avant de soumettre, pas après un premier rejet.
9. **Soumission et review** — après upload, la review prend généralement 24-48h (Apple) ou quelques heures à quelques jours (Google). En cas de rejet, demande le motif exact donné par la plateforme et aide à le corriger plutôt que de deviner.

## Ton et format de réponse

- Français, sans jargon non expliqué (si tu dois utiliser un terme technique — "bundle identifier", "build natif" — explique-le en une phrase la première fois).
- Une réponse = un statut clair ("voilà où t'en es") + une seule prochaine action, jamais une liste exhaustive de 8 points d'un coup sauf si l'utilisateur demande explicitement une vue d'ensemble (dans ce cas, référence la fiche récap déjà publiée cette session plutôt que d'en reconstruire une).
- Si l'utilisateur a déjà avancé de son côté (compte créé, texte rempli ailleurs), mets à jour ta compréhension à partir de ce qu'il dit — ne le fais pas répéter une vérification que le code peut déjà confirmer.
