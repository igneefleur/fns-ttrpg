# MIA Système JDR

Un jeu de rôle sur table dans l'univers de Made in Abyss : le livre de règles.

**<https://igneefleur.github.io/fns-ttrpg/mia/>**

Cette branche (`mia`) est un site frère du dépôt HxH : elle reprend la maquette du
livre (thème, polices auto-hébergées, lecture continue, mode nuit) et publie les
règles de base MIA, un créateur de personnage (`/personnage/`) et une extension
Firefox/Chrome qui affiche la fiche MIA dans Roll20 (`/extension/`).

Le créateur n'a pas sa propre copie des données : `hooks/mia_creation.py` relit la
page de règles à chaque construction et en extrait son JSON. Modifier une table des
règles met donc l'outil à jour. L'extension est une coquille : elle affiche la
fiche servie par le site (`roll20-fiche.html`) et s'empaquette par
`python scripts/build_extension.py`, sans build du site.

## Où en est le jeu

Les règles de base sont écrites : prestige, huit caractéristiques, huit
compétences, spécialités, jets plafonnés, PV et endurance, initiative, vitesse,
sauts, charge, récupération. La fiche les suit, et n'en porte aucun nombre —
`hooks/mia_creation.py` relit la page de règles au build et en tire tout.

Restent à écrire : le combat et la prise de vitesse, les difficultés, les
critiques s'il y en a, et la façon dont le prestige s'accorde.

L'extension attend sa **première signature Mozilla**, qui créera l'add-on
`mia-roll20@igneefleur` sur le compte. Tant qu'elle n'a pas eu lieu, les deux
boutons de téléchargement de la page Extension ne servent à rien. La marche à
suivre est en tête de `.github/workflows/deploy.yml`.

Le **hub** (branche `main`) doit nommer `mia` et `mia-beta` dans son
`clean-exclude`, sans quoi son déploiement efface les deux sites sans qu'aucun
run n'échoue.

## Œuvre de fan

Sans but lucratif et sans lien avec les ayants droit : « Made in Abyss » appartient
à Akihito Tsukushi et à Takeshobo.

Les **règles** de ce jeu sont de **Erua**, et les droits d'auteur sur elles lui
restent. Le **site**, le **code** et les **outils** — la fiche, le créateur de
personnage, l'extension, la mise en forme — sont d'**IgneeFleur**, en tous droits
réservés. Voir [LICENSE.md](LICENSE.md).

## Développer

```bash
pip install mkdocs-material
mkdocs serve
```

Chaque envoi sur `mia` construit le site et le publie dans le dossier `mia/` de la
branche `gh-pages`. Le chantier, lui, vit sur `mia-beta` et se publie dans
`mia-beta/` ; la racine appartient à `main`, qui porte le hub.
