# Extension « Fiche JJK sur Roll20 »

Un onglet « Fiche JJK » dans le dialogue de personnage Roll20, qui fait tourner
le VRAI créateur du site (jjk-creation.js) dans une iframe d'extension. La fiche
est persistée dans les Attributes Roll20 du personnage (tout préfixé `jjk_`,
`jjk_state` = état entier en JSON, source de vérité), donc partagée avec tous
les joueurs qui contrôlent ce personnage. Les jets partent dans le tchat.

## Pièces

- `content-roll20.js` — pose l'onglet dans le dialogue de perso (frame de la
  feuille) et relaie les jets vers le tchat (frame du haut).
- `roll20-page.js` — pont d20, injecté dans le monde principal à la demande :
  lit/écrit les Attributes `jjk_*` (écritures throttlées et silencieuses).
- `creator.html` + `creator-boot.js` — l'iframe du créateur : shim
  `__jjkLocalStorage` (persistance -> Attributes), `__jjkRoll` (jets -> tchat),
  `__jjkCompact` (masque la bibliothèque).
- `attr-map.js` — traduction état <-> Attributes, dans les deux sens.
- `content-jjk.js` + `popup/` — synchronisation des fiches du site vers le
  popup de l'extension.
- `creation-embed.js`, `jjk-creation.json`, `jjk-creation.css` — GÉNÉRÉS par
  `scripts/build_extension.py` depuis le site : ne pas éditer à la main.

## Construire

    mkdocs build
    python scripts/build_extension.py

Sorties : `docs/download/jjk-roll20-firefox.xpi` et `docs/download/jjk-roll20-chrome.zip`.
Le manifest V2 (ce dossier) sert Firefox ; `extension/chrome/manifest.json` (V3)
sert Chrome avec les mêmes fichiers.
