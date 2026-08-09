# HxH Système JDR

Un jeu de rôle sur table dans l'univers de Hunter × Hunter : le livre de règles et
ses outils.

**<https://igneefleur.github.io/fns-ttrpg/hxh-beta/>**

## Œuvre de fan

Sans but lucratif et sans lien avec les ayants droit : « Hunter × Hunter » et le
Nen appartiennent à Yoshihiro Togashi et à Shueisha. Les règles, les textes et le
code sont de l'auteur, en tous droits réservés. Voir [LICENSE.md](LICENSE.md).

## Contenu

Le livre (règles et univers), qui se lit en défilement continu et se télécharge en
PDF, et trois outils : le créateur de personnage (`/personnage/`), la Forge d'armes
(`/forge/`) et l'Atelier de pouvoirs de Nen (`/creation/`). Une extension Firefox
et Chrome fait tourner le créateur dans une fiche Roll20.

Les outils n'ont pas leur propre copie des données : des hooks Python relisent les
pages de règles à chaque construction et en extraient leur JSON. Modifier une table
du livre met donc l'outil à jour.

## Développer

```bash
pip install mkdocs-material
mkdocs serve
```

Le PDF se construit à part, avec `mkdocs.ci.yml` : son plugin importe WeasyPrint au
chargement, dont les bibliothèques natives manquent sous Windows, et l'inscrire
dans `mkdocs.yml` casserait `mkdocs serve`.

Chaque envoi sur `main` construit le site et le PDF, puis publie sur GitHub Pages.
