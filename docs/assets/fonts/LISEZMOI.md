# Polices du livre — auto-hébergées

Les polices du site et du PDF sont hébergées ici, et non chargées depuis Google
Fonts. Conséquences : le navigateur du visiteur ne contacte aucun tiers (son
adresse IP n'est transmise à personne) et le build du PDF ne dépend pas du réseau.

Les fichiers de ce dossier sont générés par `scripts/get_fonts.py`, qui écrit
aussi les `@font-face` dans `docs/stylesheets/fonts.css`. Ne rien éditer à la
main : relancer le script.

## Les polices et leurs licences

Les huit sont sous **SIL Open Font License 1.1**. Le texte complet de chaque
licence est dans `licences/`, comme l'OFL l'exige dès lors qu'on redistribue les
fichiers de police.

| Police | Rôle | Copyright | Licence |
|---|---|---|---|
| Nunito Sans | corps du livre et titres — le relais libre de Proxima Nova, la police de Roll20 | Copyright 2016 The Nunito Sans Project Authors (Fonthausen) | [OFL 1.1](licences/nunito-sans-OFL.txt) |
| Alegreya | ancien corps du livre, gardée en repli | Copyright 2011 The Alegreya Project Authors (huertatipografica) | [OFL 1.1](licences/alegreya-OFL.txt) |
| Cinzel | titres du livre | Copyright 2020 The Cinzel Project Authors (NDISCOVER) | [OFL 1.1](licences/cinzel-OFL.txt) |
| EB Garamond | repli et Forge | Copyright 2017 The EB Garamond Project Authors (octaviopardo) | [OFL 1.1](licences/eb-garamond-OFL.txt) |
| IBM Plex Sans | interface de l'Atelier | Copyright © 2017 IBM Corp., avec nom réservé « Plex » | [OFL 1.1](licences/ibm-plex-sans-OFL.txt) |
| Roboto Mono | blocs de code | Copyright 2015 The Roboto Mono Project Authors (googlefonts) | [OFL 1.1](licences/roboto-mono-OFL.txt) |
| Noto Sans Symbols 2 | symboles ○ ● ▰ ▱ ★ ☆ ✦ ✧ | Copyright The Noto Project Authors | [OFL 1.1](licences/noto-sans-symbols-2-OFL.txt) |
| Noto Sans Math | symboles ⌈ ⌉ ⌊ ⌋ ≤ ≥ | Copyright The Noto Project Authors | [OFL 1.1](licences/noto-sans-math-OFL.txt) |

## Pourquoi deux polices de symboles

Aucune police de texte du livre ne contient les étoiles, cercles et jauges. Sans
rien, chaque plateforme choisit un repli différent (Segoe UI Symbol sous Windows,
DejaVu sous Linux) : le PDF du CI ne rendait donc pas comme celui construit en
local. Les deux polices Noto sont rattachées à **chaque** famille du livre via un
`unicode-range` limité aux seuls caractères concernés — le texte normal n'est pas
touché, et les symboles rendent à l'identique partout.

Il en faut deux : Noto Sans Symbols 2 n'a pas les signes mathématiques. Attention,
l'`unicode-range` annoncé par Google est plus large que les glyphes réellement
présents : `get_fonts.py` vérifie donc la couverture réelle et échoue si un
caractère manque.

## Ce que l'OFL permet et impose

Elle autorise l'usage commercial, l'auto-hébergement, la modification, et
l'intégration des polices dans un document : le PDF du livre les embarque, ce qui
est explicitement prévu, et n'impose aucune licence au document lui-même.

Obligations, toutes remplies ici :

- **Joindre la licence** aux fichiers redistribués : c'est le dossier `licences/`.
- **Ne pas vendre les polices seules.** Vendre un livre qui les embarque reste permis.
- **Renommer** toute police modifiée avant de la redistribuer (clause du nom réservé).

Sur ce dernier point : les fichiers de ce dossier sont les sous-ensembles
**officiels servis par Google Fonts**, récupérés tels quels et non retouchés.
Une seule des sept déclare un nom réservé (IBM Plex Sans, « Plex ») ; les six
autres n'en ont pas, donc la question ne se pose même pas pour elles. Comme rien
n'est modifié ici, aucun renommage n'est requis.

Aucune attribution n'est à afficher sur le site : l'OFL ne l'exige pas.

## Sous-ensembles

Pour le texte, seuls `latin` et `latin-ext` sont embarqués : cela suffit au
français (le œ est dans « latin ») et évite de trimballer le cyrillique, le grec
et le vietnamien. Pour les symboles, le sous-ensemble ne contient que les
caractères réellement employés par le livre. Les `unicode-range` des `@font-face`
font que le navigateur ne télécharge que les fichiers dont il a besoin.

## La police de Roll20, et pourquoi elle n'est pas ici

Le livre demande la police de Roll20. Mesurée sur une vraie partie, c'est **Proxima Nova**
au corps et **Proxima Nova Condensed** aux titres. Elle est sous licence Adobe, et la
feuille de Roll20 qui la sert le dit en toutes lettres : *ALL FONTS ARE COPYRIGHTED,
COMMERCIAL FONTS USED WITH PERMISSION. DO NOT DOWNLOAD THESE FONTS AND USE THEM OUTSIDE OF
THE ROLL20 SITE!* Elle ne peut donc pas être auto-hébergée ici.

Elle est **nommée en tête de chaque pile** : qui l'a installée, ou qui lit la surcouche à
l'intérieur de Roll20, voit la vraie. Pour tous les autres, c'est **Nunito Sans** qui rend,
sous OFL et servie d'ici. C'est la pile que le projet vttinker emploie déjà pour son propre
site, et Nunito est mesurément présente dans les pages de Roll20.
