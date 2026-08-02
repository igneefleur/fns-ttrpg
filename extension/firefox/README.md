# Extension « Fiche JJK sur Roll20 »

Un onglet « Fiche JJK » dans le dialogue de personnage Roll20. L'extension est
une COQUILLE stable : la fiche elle-même (le vrai créateur du site) est SERVIE
PAR LE SITE — `roll20-fiche.html`, affichée dans une iframe — et se met donc à
jour à chaque déploiement du site, sans re-signer l'extension. La fiche est
persistée dans les Attributes Roll20 du personnage (tout préfixé `jjk_`,
`jjk_state` = état entier en JSON, source de vérité), donc partagée avec tous
les joueurs qui contrôlent ce personnage. Les jets partent dans le tchat.

## Pièces (toutes stables : re-signature seulement si l'une d'elles change)

- `content-roll20.js` — pose l'onglet dans le dialogue de perso (frame de la
  feuille) et relaie les jets vers le tchat (frame du haut). Gère aussi la
  fiche en fenêtre séparée (popout, `/editor/character/...`) : l'onglet se pose
  dans le document du haut et les jets repartent à la fenêtre d'ouverture.
- `roll20-page.js` — pont d20, injecté dans le monde principal à la demande :
  lit/écrit les Attributes `jjk_*` (écritures throttlées et silencieuses) ;
  dans un popout, se rabat sur le Campaign de `window.opener`.
- `creator.html` + `creator-shell.js` — la coquille : iframe vers la fiche du
  site, charId passé dans le hash (#c=<id>). La page distante parle
  directement au pont via window.top ; aucun relais ici.
- `content-jjk.js` + `popup/` — synchronisation des fiches du site vers le
  popup de l'extension.

Le reste vit CÔTÉ SITE (`docs/`) : `roll20-fiche.html` (page affichée),
`javascripts/jjk-roll20-boot.js` (shims `__jjk*`, poignée de main
load/hydrate/save), `javascripts/jjk-attr-map.js` (état <-> Attributes),
`javascripts/jjk-creation.js` + `stylesheets/jjk-creation.css` (le créateur).

## Dépannage

`browser.storage.local` accepte une clé `jjk_sheet_url` qui remplace l'URL de
la fiche (ex. un mkdocs serve local), à poser depuis la console de débogage.

## Construire

    python scripts/build_extension.py

Sorties : `docs/download/jjk-roll20-firefox.xpi` et `docs/download/jjk-roll20-chrome.zip`.
Le manifest V2 (ce dossier) sert Firefox ; `extension/chrome/manifest.json` (V3)
sert Chrome avec les mêmes fichiers.
