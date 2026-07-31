# Build et soumission avec EAS

## `eas update` vs `eas build` — ne pas confondre

Tout ce qui a été livré pendant le développement de STRIKR est passé par `eas update` : ça pousse une mise à jour du code JS par-dessus une app déjà installée sur le téléphone. Ça ne crée **jamais** de nouveau binaire installable, et ça ne peut pas ajouter de code natif (comme les futurs SDK de pubs/paiements réels).

`eas build` compile un vrai binaire (`.ipa` pour iOS, `.aab`/`.apk` pour Android) à partir de zéro sur les serveurs d'Expo. C'est **obligatoire** :
- pour la toute première soumission (aucun binaire STRIKR n'a jamais été construit — il n'y a même pas de fichier `eas.json` dans le projet à ce stade) ;
- à chaque fois qu'un module natif est ajouté (voir `ACTIVATION.md` — activer les vraies pubs/paiements en fait partie).

## Étapes (à lancer dans `strikr-app/`, en Codespace)

```bash
npm install -g eas-cli   # une seule fois si pas déjà fait
eas login                # se connecter au compte Expo du projet
eas build:configure      # crée eas.json — répondre aux questions à l'écran
```

Puis, pour chaque plateforme :

```bash
eas build --platform ios
eas build --platform android
# ou les deux d'un coup :
eas build --platform all
```

- Pour iOS, EAS demande de se connecter au compte Apple Developer (étape interactive, gère les certificats de signature automatiquement — laisser faire, ne pas essayer de générer les certificats à la main).
- Pour Android, EAS génère et garde en sécurité un keystore de signature si le projet n'en a pas déjà un — ne jamais le perdre, il faut le même keystore pour chaque future mise à jour de l'app.
- Le build tourne sur les serveurs Expo (10-30 minutes en général) ; un lien de suivi s'affiche dans le terminal.

## Soumission automatique

Une fois le build terminé :

```bash
eas submit --platform ios
eas submit --platform android
```

Envoie directement le binaire à App Store Connect / Google Play Console — évite de le télécharger et l'uploader à la main. Nécessite que la fiche de l'app existe déjà sur chaque plateforme (voir `references/comptes-developpeur.md`).

## Après soumission

- **Apple** : review généralement sous 24-48h. En cas de rejet, le motif exact est donné dans App Store Connect (onglet "Resolution Center") — toujours demander à l'utilisateur de copier/coller le message exact plutôt que de deviner la cause.
- **Google** : review de quelques heures à quelques jours pour une première soumission (plus long que les mises à jour suivantes). Rappel : si le compte est encore en phase de test fermé (voir `references/comptes-developpeur.md`), la publication en production reste bloquée tant que les 14 jours/20 testeurs ne sont pas validés.
