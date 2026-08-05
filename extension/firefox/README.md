# Extension « Fiche JJK sur Roll20 »

Un onglet « Fiche JJK » dans le dialogue de personnage Roll20. L'extension est
une COQUILLE : la fiche elle-même (le vrai créateur du site) est SERVIE PAR LE
SITE — `roll20-fiche.html`, affichée dans une iframe — et se met donc à jour à
chaque déploiement du site, sans re-signer l'extension. La fiche est persistée
dans les Attributes Roll20 du personnage (tout préfixé `jjk_`, `jjk_state` =
état entier en JSON, source de vérité), donc partagée avec tous les joueurs qui
contrôlent ce personnage. Les jets partent dans le tchat.

## Deux parties dans un seul paquet

L'extension porte DEUX parties, et la case « Mode beta » du popup bascule de
l'une à l'autre :

- `stable/` — la partie publiée, qui affiche le site `/jjk/` ;
- `beta/` — la partie de chantier, qui affiche le site `/jjk-beta/`.

Ces deux dossiers contiennent les MÊMES fichiers, au départ identiques : seules
diffèrent les lignes marquées « propre à cette copie » (le nom du mode, le
libellé de l'onglet, l'adresse du site et celle du pont). Le reste du paquet est
partagé, parce qu'il ne dépend pas du mode : les pages, les feuilles de style,
les icônes et le popup n'existent qu'une fois.

TOUTE CORRECTION DE SÛRETÉ DOIT ÊTRE APPLIQUÉE AUX DEUX COPIES : la liste
blanche du tchat, le repli des sauts de ligne dans les commandes envoyées, le
relais vers la fenêtre d'ouverture et les verrous du pont d20 vivent en double
exemplaire. `python scripts/build_extension.py --verifie` compare mécaniquement
les deux copies hors des lignes marquées, et refuse toute autre divergence.

La bascule ne prend effet qu'au RECHARGEMENT de la page Roll20 : une copie déjà
réveillée garde son onglet, ses écouteurs et son panneau, et le pont d20 déjà
posé dans le monde principal n'est pas démontable.

Les deux parties écrivent les MÊMES Attributes du MÊME personnage. Séparer le
code ne sépare pas les fiches : une fiche créée en beta est vue comme existante
en stable, et une régression du site de chantier abîme les mêmes personnages.

## Pièces

Partagées :

- `content-jjk.js` + `popup/` — le popup (lien des règles, case du mode beta,
  case du plateau) et la reprise des fiches du site.
- `creator.html` — la coquille de l'onglet : une iframe vers la fiche du site,
  charId passé dans le hash (`#c=<id>`). Immunisée contre la CSP de Roll20.
- `panneau.html` — la coquille générique des panneaux flottants (le plateau de
  Narration aujourd'hui) ; la page à montrer est nommée dans le hash (`#p=`).
- `shell-loader.js` — ajoute à ces deux pages la balise `<script>` de la bonne
  coquille, d'après le mode écrit dans le hash (`&m=`). Aucun script en ligne,
  aucun eval : une page d'extension ne les accepte pas.
- `version.js` — les deux numéros du projet, montrés par le popup. Le manifeste,
  lui, ne porte que le numéro du paquet signé, le même pour les deux parties.
- `creator.css`, `overlay.css`, `icons/`.

Dédoublées dans `stable/` et `beta/` :

- `content-roll20.js` — pose l'onglet dans le dialogue de perso (frame de la
  feuille) et relaie les jets vers le tchat (frame du haut). Gère aussi la fiche
  en fenêtre séparée (popout, `/editor/character/...`) : l'onglet se pose dans
  le document du haut et les jets repartent à la fenêtre d'ouverture. Les deux
  copies sont déclarées au manifeste et injectées dans chaque frame ; celle qui
  n'est pas du mode s'arrête avant de poser le moindre écouteur.
- `roll20-page.js` — pont d20, injecté dans le monde principal à la demande :
  lit/écrit les Attributes `jjk_*` (écritures throttlées et silencieuses) ; dans
  un popout, se rabat sur le Campaign de `window.opener`. Une seule copie est
  jamais chargée : l'adresse se choisit à l'exécution.
- `creator-shell.js`, `panneau-shell.js` — chacune pointe son iframe vers un
  seul site. Une seule des deux est jamais chargée.

Le reste vit CÔTÉ SITE (`docs/`) : `roll20-fiche.html` (page affichée),
`javascripts/jjk-roll20-boot.js` (shims `__jjk*`, poignée de main
load/hydrate/save), `javascripts/jjk-attr-map.js` (état <-> Attributes),
`javascripts/jjk-creation.js` + `stylesheets/jjk-creation.css` (le créateur).

## Dépannage

`browser.storage.local` accepte deux clés, à poser depuis la console de débogage
de l'extension, qui remplacent l'adresse du site quel que soit le mode :

- `jjk_sheet_url` — l'adresse de la fiche (ex. un mkdocs serve local) ;
- `jjk_site_url` — la racine du site pour les panneaux.

Oubliées en place, elles peuvent faire afficher le site stable sous un onglet
« Fiche JJK beta » : c'est assumé, ce sont des clés de dépannage.

## Construire

    python scripts/build_extension.py --verifie    # contrôles seuls, rien d'écrit
    python scripts/build_extension.py              # packe dans docs/download/

Sorties : `docs/download/jjk-roll20-firefox.xpi` et `docs/download/jjk-roll20-chrome.zip`.
Le manifest V2 (ce dossier) sert Firefox ; `extension/chrome/manifest.json` (V3)
sert Chrome avec les mêmes fichiers. Tout fichier posé sous `extension/firefox/`
part dans les DEUX paquets, déclaré ou non : les contrôles refusent les orphelins.
