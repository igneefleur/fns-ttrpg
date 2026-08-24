# Extension « Fiche MIA sur Roll20 »

Un onglet « Fiche MIA » dans le dialogue de personnage Roll20. L'extension est
une COQUILLE : la fiche elle-même (le vrai créateur du site) est SERVIE PAR LE
SITE — `roll20-fiche.html`, affichée dans une iframe — et se met donc à jour à
chaque déploiement du site, sans re-signer l'extension. La fiche est persistée
dans les Attributes Roll20 du personnage (tout préfixé `mia_`, `mia_state` =
état entier en JSON, source de vérité), donc partagée avec tous les joueurs qui
contrôlent ce personnage. Les jets partent dans le tchat.

## Deux parties dans un seul paquet

L'extension porte DEUX parties, et la case « Mode beta » du popup bascule de
l'une à l'autre :

- `stable/` — la partie publiée, qui affiche le site `/mia/` ;
- `beta/` — la partie de chantier, qui affiche le site `/mia-beta/`.

CES DEUX DOSSIERS NE S'ÉCRIVENT PAS : ILS SONT ENGENDRÉS. Leur source unique est
`src/extension/`, découpée par rôle, et les trois valeurs qui séparent les deux
moitiés — le nom du mode, le libellé de l'onglet, l'adresse du site — sont
déclarées une seule fois dans `scripts/assemblage.plan`. Le reste du paquet est
partagé, parce qu'il ne dépend pas du mode : les pages, les feuilles de style,
les icônes et le popup n'existent qu'une fois.

On modifie donc un morceau de `src/extension/`, puis on lance
`python scripts/assembler.py` ; les huit fichiers sont réécrits. Retoucher
`stable/` ou `beta/` à la main ne sert à rien : le prochain assemblage efface la
retouche.

UNE CORRECTION DE SÛRETÉ NE S'APPLIQUE PLUS QU'UNE FOIS, et c'est tout l'intérêt
du changement. La liste blanche du tchat, le repli des sauts de ligne dans les
commandes envoyées, le relais vers la fenêtre d'ouverture et les verrous du pont
d20 vivaient en double exemplaire, tenus à la main : un correctif posé d'un seul
côté laissait le trou ouvert de l'autre jusqu'à ce que quelqu'un lance le
contrôle. Ils n'existent maintenant qu'une fois, dans `src/extension/`.
`python scripts/build_extension.py --verifie` ne compare donc plus les deux
copies : il vérifie que chacune est À JOUR par rapport à ses morceaux, et refuse
le paquet sinon.

La bascule ne prend effet qu'au RECHARGEMENT de la page Roll20 : une copie déjà
réveillée garde son onglet et ses écouteurs, et le pont d20 déjà posé dans le
monde principal n'est pas démontable.

Les deux parties écrivent les MÊMES Attributes du MÊME personnage. Séparer le
code ne sépare pas les fiches : une fiche créée en beta est vue comme existante
en stable, et une régression du site de chantier abîme les mêmes personnages.

## Pièces

Partagées :

- `popup/` — le popup (lien des règles, mode nuit, case du mode beta).
  L'extension NE LIT PLUS LE SITE. Un `content-mia.js` recopiait les fiches
  calculées du localStorage du site vers `browser.storage.local` toutes les
  trois secondes ; personne n'a jamais relu ce qu'il y déposait, et il coûtait
  au manifeste trois adresses d'hôte de plus à faire accepter par Mozilla.
- `creator.html` — la coquille de l'onglet : une iframe vers la fiche du site,
  charId passé dans le hash (`#c=<id>`). Immunisée contre la CSP de Roll20.
- `shell-loader.js` — ajoute à cette page la balise `<script>` de la bonne
  coquille, d'après le mode écrit dans le hash (`&m=`). Aucun script en ligne,
  aucun eval : une page d'extension ne les accepte pas.
- `parties.js` — les deux numéros du projet, montrés par le popup. Le manifeste,
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
  lit/écrit les Attributes `mia_*` (écritures throttlées et silencieuses) ; dans
  un popout, se rabat sur le Campaign de `window.opener`. Une seule copie est
  jamais chargée : l'adresse se choisit à l'exécution.
- `creator-shell.js` — pointe son iframe vers un seul site. Une seule des deux
  copies est jamais chargée.

Le reste vit CÔTÉ SITE (`docs/`) : `roll20-fiche.html` (page affichée),
`javascripts/mia-roll20-boot.js` (shims `__mia*`, poignée de main
load/hydrate/save), `javascripts/mia-attr-map.js` (état <-> Attributes),
`javascripts/mia-creation.js` + `stylesheets/mia-creation.css` (le créateur).

## Dépannage

`browser.storage.local` accepte deux clés, à poser depuis la console de débogage
de l'extension, qui remplacent l'adresse du site quel que soit le mode :

- `mia_sheet_url` — l'adresse de la fiche (ex. un mkdocs serve local) ;
- `mia_site_url` — la racine du site pour les coquilles.

Oubliées en place, elles peuvent faire afficher le site stable sous un onglet
« Fiche MIA beta » : c'est assumé, ce sont des clés de dépannage.

## Construire

    python scripts/build_extension.py --verifie    # contrôles seuls, rien d'écrit
    python scripts/build_extension.py              # packe dans docs/download/

Sorties : `docs/download/mia-roll20-firefox.xpi` et `docs/download/mia-roll20-chrome.zip`.
Le manifest V2 (ce dossier) sert Firefox ; `extension/chrome/manifest.json` (V3)
sert Chrome avec les mêmes fichiers. Tout fichier posé sous `extension/firefox/`
part dans les DEUX paquets, déclaré ou non : les contrôles refusent les orphelins.
