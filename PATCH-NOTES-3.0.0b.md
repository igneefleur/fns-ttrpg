# Patch Outward 2.23.0b → 3.0.0b

Cette mise à jour reprend le principe de Narration dans JJK : écritures isolées
et vraies relectures serveur. La fiche Outward enregistrait auparavant tout le
personnage dans un seul attribut JSON ; elle écrit désormais les seuls champs
modifiés. Deux personnes peuvent modifier des parties différentes, y compris
des champs différents du même objet ou de la même compétence. Les listes ont
des identités stables et des marqueurs de suppression.

Les changements reçus conservent la saisie locale en attente, l'onglet, le focus,
le curseur, les positions de défilement et la sélection d'inventaire. Le pont
regroupe ses écritures en attente et donne priorité aux registres collaboratifs.
Les changements distants apparaissent généralement sous quelques secondes,
selon Roll20 et le réseau. Un même champ conserve le conflit du dernier écrivain.
Notes et Bio sont chacun un texte entier, pas une fusion lettre par lettre.

## Appliquer le ZIP du patch

Base requise : le projet 2.23.0b fourni pour cette demande. Extraire le contenu
du patch à la racine du projet et remplacer les fichiers de même nom.
Supprimer `site/content/regles/combat/portees/index.html` si ce produit d'un
ancien build est encore présent ; le prochain build nettoie également le site.
`PATCH-MANIFEST-3.0.0b.json`, dans le ZIP du patch, fournit les empreintes des
fichiers remplacés, ajoutés et supprimés. Le ZIP complet est déjà assemblé.

## Mettre en service

Suivre le README : publier le site et relancer le workflow **website deployment**
avec **signer** coché pour signer le nouveau pont Firefox. Installer l'extension
à jour sur tous les postes et recharger Roll20. Les fichiers signés sous
`docs/download/` sont ceux de la version précédente, conservés jusqu'à la CI.
Les nouveaux paquets sous `essai/` sont non signés, réservés aux essais.

La fiche passe au schéma 11 ; la migration protège l'original dans `owd_backup`.
Les sauvegardes JSON et la restauration reconstruisent l'état collaboratif.
Une restauration impose de fermer et rouvrir les autres fiches du personnage.

## Vérification

- 19 scénarios Node : concurrence, ajouts, suppressions, conflits, réseau,
  import, données invalides et aller-retour de migration 10 → 11 → 10.
- Deux fenêtres Chromium : vrai bundle et vrai pont, serveur Roll20 simulé ;
  Notes + PE, inventaire, curseur, sélection, réouverture et absence d'erreur.
- Assemblage, parité stable/bêta de l'extension, versions et build MkDocs validés.

Le harnais navigateur n'utilise pas une campagne Roll20 réelle. Un essai avec
l'extension signée dans votre campagne reste à effectuer après publication.

## Prochains patchs

Repartir du ZIP complet **fns-owd-beta-3.0.0b.zip** livré ici. Livrer à chaque
nouvelle modification un ZIP du patch et le ZIP complet de la version suivante.
