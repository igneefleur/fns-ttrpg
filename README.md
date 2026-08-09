# Outward Système JDR

Un jeu de rôle sur table dans l'univers d'Outward : le livre de règles.

**<https://igneefleur.github.io/fns-ttrpg/owd-beta/>**

## Œuvre de fan

Sans but lucratif et sans lien avec les ayants droit : « Outward » et son univers
appartiennent à Nine Dots Studio. Les règles, les textes et le code sont
d'igneefleur, en tous droits réservés. Voir [LICENSE.md](LICENSE.md).

## Contenu

L'écriture commence, et presque tout reste à écrire. Une seule règle est posée pour
l'instant, celle des portées : la grille vaut un mètre par case, l'allonge se mesure
depuis le torse, et une table donne la distance à laquelle chaque arme est chez elle.

Le livre se lit en défilement continu. Le PDF est désactivé tant qu'il n'y a pas
assez de pages pour en faire un ; l'en-tête de `mkdocs.ci.yml` dit quoi rétablir le
jour venu.

## Développer

```bash
pip install mkdocs-material
mkdocs serve
```

Chaque envoi sur `owd-beta` construit le site et le publie sur GitHub Pages, dans le
dossier `owd-beta/`. Les branches du dépôt écrivent toutes sur la même branche
`gh-pages` : on en pousse une, on attend la fin de son run, puis on pousse la
suivante.
