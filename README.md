# JJK Système JDR

Un jeu de rôle sur table dans l'univers de Jujutsu Kaisen : le livre de règles.

**<https://igneefleur.github.io/HxH-Regles-JDR/jjk/>**

Cette branche (`jjk`) est un site frère du dépôt HxH : elle reprend la maquette du
livre (thème, polices auto-hébergées, lecture continue, mode nuit) et publie les
règles de base JJK, un créateur de personnage (`/personnage/`) et une extension
Firefox/Chrome qui affiche la fiche JJK dans Roll20 (`/extension/`).

Le créateur n'a pas sa propre copie des données : `hooks/jjk_creation.py` relit la
page de règles à chaque construction et en extrait son JSON. Modifier une table des
règles met donc l'outil à jour. L'extension embarque le vrai créateur du site
(empaquetée par `python scripts/build_extension.py`, après un `mkdocs build`).

## Œuvre de fan

Sans but lucratif et sans lien avec les ayants droit : « Jujutsu Kaisen » appartient
à Gege Akutami et à Shueisha. Les règles, les textes et le code sont de l'auteur, en
tous droits réservés. Voir [LICENSE.md](LICENSE.md).

## Développer

```bash
pip install mkdocs-material
mkdocs serve
```

Chaque envoi sur `jjk` construit le site et le publie dans le dossier `jjk/` de la
branche `gh-pages` ; la racine et `beta/` restent aux branches `main` et `beta`.
