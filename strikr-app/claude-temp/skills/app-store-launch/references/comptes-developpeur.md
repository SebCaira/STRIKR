# Comptes développeur et fiches store

## Apple Developer Program — 99 $/an

1. https://developer.apple.com/programs/enroll/ avec un Apple ID (en créer un dédié si l'utilisateur n'en a pas déjà un pour ça).
2. Deux formules : **Individuel** (le plus simple — nom personnel affiché comme éditeur, pas de papier supplémentaire) ou **Organisation** (nom d'entreprise affiché, mais demande un numéro D-U-N-S — à éviter sauf si l'utilisateur a déjà une société enregistrée et y tient).
3. Validation : quelques heures à 2 jours en général.
4. Une fois validé : créer l'app sur https://appstoreconnect.apple.com/ (bouton "Mes apps" → "+"), avec le `ios.bundleIdentifier` défini dans `app.json`.

## Google Play Console — 25 $ une fois

1. https://play.google.com/console/signup avec un compte Google.
2. ⚠️ Piège fréquent : depuis 2023, un **nouveau compte développeur personnel doit d'abord passer par un test fermé** — au moins 20 testeurs distincts installent l'app et l'utilisent pendant 14 jours consécutifs — avant de pouvoir demander l'accès à la production (publication publique). Prévenir l'utilisateur de ça tôt, sinon il découvre le blocage après avoir déjà tout préparé. Les 20 testeurs peuvent être n'importe qui (amis, famille) invités par email/lien depuis la Play Console.
3. Créer l'app dans la console avec le `android.package` défini dans `app.json`.

## Compte AdMob (uniquement si pubs réelles voulues)

Gratuit, séparé des deux comptes ci-dessus : https://admob.google.com/ — nécessaire seulement au moment d'activer les vraies pubs (voir `strikr-app/ACTIVATION.md`), pas bloquant pour une première publication.

## Remplir les fiches à partir de `strikr-app/store-listing.md`

| Champ dans store-listing.md | App Store Connect | Google Play Console |
|---|---|---|
| Nom | "Nom" (App Information) | "Nom de l'application" |
| Sous-titre (30 car.) | "Subtitle" | — (pas d'équivalent) |
| Description courte (80 car.) | — (pas d'équivalent) | "Description brève" |
| Description longue | "Promotional Text" + "Description" | "Description complète" |
| Mots-clés | "Keywords" (100 car., séparés par virgules) | — (Google indexe le texte de la description) |
| Catégorie | "Primary Category" | "Catégorie" |
| Classification d'âge | Questionnaire "Age Rating" (répondre honnêtement : pas de violence/contenu choquant/jeu d'argent) | Questionnaire "Classification du contenu" (même principe, formulaire différent) |

Deux champs qu'aucun store ne trouve dans `store-listing.md` et qu'il faut fournir en plus :
- **URL de la politique de confidentialité** (obligatoire sur les deux plateformes) — utilise le lien de la page publiée.
- **Email ou URL de support** (obligatoire) — généralement la même adresse que le contact de la politique de confidentialité.
