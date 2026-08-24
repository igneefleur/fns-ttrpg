# MIA Système JDR

Un jeu de rôle sur table dans l'univers de Made in Abyss : le livre de règles.

**<https://igneefleur.github.io/fns-ttrpg/mia-beta/>**

Cette branche (`mia-beta`) est un site frère du dépôt HxH : elle reprend la maquette du
livre (thème, polices auto-hébergées, lecture continue, mode nuit) et publie les
règles de base MIA, un créateur de personnage (`/personnage/`) et une extension
Firefox/Chrome qui affiche la fiche MIA dans Roll20 (`/extension/`).

Le créateur n'a pas sa propre copie des données : `hooks/mia_creation.py` relit la
page de règles à chaque construction et en extrait son JSON. Modifier une table des
règles met donc l'outil à jour. L'extension est une coquille : elle affiche la
fiche servie par le site (`roll20-fiche.html`) et s'empaquette par
`python scripts/build_extension.py`, sans build du site.

## En chantier

Cette branche vient d'être ouverte depuis `jjk-beta` : l'outillage est adapté à
MIA (fiche, extension, plateau, chaîne de publication), **les règles ne le sont
pas encore**. `docs/content/regles/index.md` porte toujours le corps des règles
JJK, gardé comme échafaudage parce que `hooks/mia_creation.py` en tire au build
les données du créateur et de la fiche. Ces règles-là sont l'œuvre de Qyu :
elles doivent être remplacées par celles d'Erua avant toute publication.

Deux autres choses attendent leur tour :

- **la signature Mozilla**, coupée tant que l'add-on `mia-roll20@igneefleur`
  n'existe pas chez eux ; la marche à suivre est en tête de
  `.github/workflows/deploy.yml` ;
- **le hub** (branche `main`), dont le `clean-exclude` doit nommer `mia` et
  `mia-beta` le jour du premier envoi, sans quoi son déploiement efface les deux
  sites sans qu'aucun run n'échoue.

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

Chaque envoi sur `mia-beta` construit le site et le publie dans le dossier
`mia-beta/` de la branche `gh-pages`. Le site des joueurs, lui, vient de la branche
`mia` et se publie dans `mia/` ; la racine appartient à `main`, qui porte le hub.
