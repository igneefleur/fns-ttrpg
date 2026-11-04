# JJK Système JDR

Un jeu de rôle sur table dans l'univers de Jujutsu Kaisen : le livre de règles.

**<https://igneefleur.github.io/fns-ttrpg/jjk-beta/>**

Cette branche (`jjk`) est un site frère du dépôt HxH : elle reprend la maquette du
livre (thème, polices auto-hébergées, lecture continue, mode nuit) et publie les
règles de base JJK, un créateur de personnage (`/personnage/`) et une extension
Firefox/Chrome qui affiche la fiche JJK dans Roll20 (`/extension/`).

Le créateur n'a pas sa propre copie des données : `hooks/jjk_creation.py` relit la
page de règles à chaque construction et en extrait son JSON. Modifier une table des
règles met donc l'outil à jour. L'extension est une coquille : elle affiche la
fiche servie par le site (`roll20-fiche.html`) et s'empaquette par
`python scripts/build_extension.py`, sans build du site.

## Stockage et synchronisation Roll20

Après migration, la fiche utilise un stockage Compact : `jjk_storage` décrit la
photographie, `jjk_block_*` porte les blocs vérifiés, `jjk_stack_*` les objets
d'inventaire indépendants et `jjk_ops_*` les journaux append-only des sessions.
`jjk_state` et les attributs historiques sont conservés comme sources de migration
et miroirs de compatibilité ; ils ne remplacent pas un stockage Compact présent.
Une photographie ou un journal incomplet/corrompu gèle les écritures plutôt que
d'écraser l'état serveur.

Le plateau Narration possède un espace Compact séparé (`jjk_narr_*`). Ses fonds
d'image restent des attributs autonomes pour ne pas retransmettre les images dans
les journaux. Les sauvegardes locales de l'extension sont stockées dans IndexedDB,
avec empreinte SHA-256, rétention par personnage, export JSON et restauration
confirmée par le pont Roll20. Le mode Consultation/Édition est partagé entre les
fenêtres liées à un personnage.

## Œuvre de fan

Sans but lucratif et sans lien avec les ayants droit : « Jujutsu Kaisen » appartient
à Gege Akutami et à Shueisha.

Les **règles** de ce jeu sont de **Qyu**, et les droits d'auteur sur elles lui
restent. Le **site**, le **code** et les **outils** — la fiche, le créateur de
personnage, l'extension, la mise en forme — sont d'**IgneeFleur**, en tous droits
réservés. Voir [LICENSE.md](LICENSE.md).

## Développer

```bash
pip install mkdocs-material
mkdocs serve
```

Chaque envoi sur `jjk` construit le site et le publie dans le dossier `jjk/` de la
branche `gh-pages` ; la racine et `beta/` restent aux branches `main` et `beta`.
