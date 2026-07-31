# Icône et captures d'écran

Les 3 captures dans `strikr-app/marketing/` et l'icône dans `strikr-app/assets/icon.png` existent déjà mais n'ont probablement pas encore les dimensions exactes exigées par chaque store — à vérifier au moment de l'upload plutôt que de se fier à des tailles fixes ici (Apple/Google ajustent leurs exigences à chaque nouvelle taille d'écran d'appareil).

## Icône

- Apple : PNG 1024×1024, sans transparence, sans coins arrondis (Apple les ajoute automatiquement — un PNG déjà arrondi donnera un rendu bizarre).
- Google : PNG 512×512 pour la fiche Play Console (l'icône adaptative Android utilisée dans l'app elle-même, `android-icon-*.png`, est différente et déjà en place).

## Captures d'écran

- **Apple** exige au moins une taille d'iPhone (généralement la plus grande génération actuelle, ex. iPhone 6.9"/6.5") — le nombre exact de tailles requises et leurs dimensions en pixels sont indiqués directement dans App Store Connect au moment de l'upload : ouvrir l'écran d'ajout de captures et suivre les dimensions qu'il affiche, plutôt que de viser un chiffre qui aura changé d'ici la prochaine sortie d'iPhone.
- Point important : `strikr-app/app.json` a `"ios": { "supportsTablet": true }`. Ça veut dire qu'Apple va aussi demander des captures d'écran iPad. Si l'utilisateur ne veut pas s'embêter à en préparer, l'option la plus simple est de repasser `supportsTablet` à `false` avant le premier build — sinon prévoir 2-3 captures supplémentaires au format iPad.
- **Google Play** demande au minimum 2 captures téléphone (JPG ou PNG 24 bits, dimension min 320px / max 3840px, ratio entre 16:9 et 9:16), plus une **image "feature graphic" 1024×500** qui n'existe pas encore dans le projet — c'est une bannière promotionnelle affichée en haut de la fiche Play Store, distincte des captures d'écran, à créer avant la soumission Android.

## Si les captures actuelles ne conviennent pas

Les 3 captures dans `marketing/` peuvent servir de base (même contenu, juste redimensionnées/recadrées) plutôt que de recommencer les prises d'écran à zéro — un simple redimensionnement suffit tant que le contenu montré reste représentatif de l'app actuelle.
