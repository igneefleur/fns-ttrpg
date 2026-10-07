# Extension « Fiche Outward sur Roll20 »

Un onglet « Fiche Outward » dans le dialogue de personnage Roll20. L'extension
est une COQUILLE : la fiche elle-même est SERVIE PAR LE SITE —
`roll20-fiche.html`, affichée dans une iframe — et se met donc à jour à chaque
déploiement du site, sans re-signer l'extension. La fiche est persistée dans les
Attributes Roll20 du personnage (tout préfixé `owd_`, `owd_sync_*` = état collaboratif,
`owd_state` = photographie historique), donc partagée avec tous les joueurs qui contrôlent ce
personnage. Les jets partent dans le tchat.

## MODIFIER CE DOSSIER COÛTE UNE SIGNATURE

Tout changement de contenu sous `extension/` déclenche une soumission de
signature chez Mozilla, dont le quota quotidien est très serré. Avant de toucher
un fichier d'ici, chercher une solution 100 % site : l'architecture en coquille
existe exactement pour ça, et presque tout ce qu'on veut changer (la fiche, le
panneau, leur apparence, leurs règles) vit déjà côté site. Ne jamais monter le
numéro de version d'un manifeste à la main, ni committer un `.xpi` construit en
local par-dessus le binaire signé.

Ce qui, en revanche, ne peut être ici et nulle part ailleurs : ce qui doit
échapper à la CSP de Roll20 (les pages de coquille), ce qui doit entrer dans le
monde principal de la page (le pont d20), et ce qui doit écrire un réglage
(le popup).

## Deux parties dans un seul paquet

L'extension porte DEUX parties, et la case « Beta » du popup bascule de l'une à
l'autre :

- `stable/` — la partie publiée, qui affiche le site `/owd/` ;
- `beta/` — la partie de la beta, qui affiche le site `/owd-beta/`.

CES DEUX DOSSIERS S'ÉCRIVENT À LA MAIN, il n'y a pas d'assembleur dans ce
dépôt-ci. Chaque paire de fichiers doit rester rigoureusement identique **hors
les seules lignes marquées** `// propre à cette copie` en bout de ligne, et le
tableau ci-dessous les énumère toutes. Le compte fait partie du contrat : une
ligne marquée de plus est une divergence de plus à tenir à jour, et
`python scripts/build_extension.py --verifie` refuse toute autre différence.

| Fichier | Les lignes marquées, et rien d'autre |
|---|---|
| `stable/creator-shell.js` · `beta/creator-shell.js` | `SITE_URL` — l'adresse de la fiche du site (1 ligne) |
| `stable/panneau-shell.js` · `beta/panneau-shell.js` | `SITE` — la racine du site (1 ligne) |
| `stable/content-roll20.js` · `beta/content-roll20.js` | `MODE`, `LIBELLE`, et le `getURL` du pont qui nomme son dossier de partie (3 lignes) |
| `stable/roll20-page.js` · `beta/roll20-page.js` | **aucune** — les deux copies sont rigoureusement identiques |

Le pont d20 (`roll20-page.js`) ne connaît PAS son mode, et c'est voulu : il ne
parle qu'à Roll20 et à la fenêtre qui l'a réclamé, jamais au site, donc rien en
lui ne dépend de la moitié qui l'a injecté. Il existe en deux exemplaires pour
la seule raison que chaque copie de `content-roll20.js` doit pouvoir charger le
sien depuis SON dossier — une ressource d'extension se nomme par son chemin. Ne
pas y ajouter de ligne marquée pour « faire comme les autres » : ce serait une
divergence de plus à tenir, sans rien qui l'exige.

TOUTE CORRECTION DE SÛRETÉ S'APPLIQUE AUX DEUX COPIES, DANS LE MÊME GESTE. Un
correctif posé d'un seul côté laisse le trou ouvert de l'autre, et rien ne le
signalera : la garde `sure()` de `panneau-shell.js` (qui empêche la coquille de
devenir un iframeur universel) et la liste blanche du tchat sont exactement le
genre de pièce qu'une duplication distraite laisse tomber d'un côté.

La bascule ne prend effet qu'au RECHARGEMENT de la page Roll20 : une copie déjà
réveillée garde son onglet, ses écouteurs et son panneau, et le pont d20 déjà
posé dans le monde principal n'est pas démontable. C'est ce que dit l'infobulle
de l'interrupteur général du popup, et c'est pour cela que le bouton
« Recharger l'onglet actif » sort après une bascule.

Les deux parties écrivent les MÊMES Attributes du MÊME personnage. Séparer le
code ne sépare pas les fiches : une fiche créée en beta est vue comme existante
en stable, et une régression du site de beta abîme les mêmes personnages.

## Pièces

Partagées par les deux parties :

- `popup/` — le popup : l'interrupteur général, le mode nuit, le panneau de
  Monde, la case « Beta », les numéros de version et les deux liens. C'est le SEUL
  endroit qui écrive un réglage, et il doit le rester.
- `creator.html` — la coquille de l'onglet : une iframe vers la fiche du site,
  charId passé dans le hash (`#c=<id>`). Immunisée contre la CSP de Roll20.
- `panneau.html` — la coquille générique des panneaux flottants (le panneau de
  Monde aujourd'hui) ; la page à montrer est nommée dans le hash (`#p=`).
- `shell-loader.js` — ajoute à ces deux pages la balise `<script>` de la bonne
  coquille, d'après le mode écrit dans le hash (`&m=`). Aucun script en ligne,
  aucun `eval` : une page d'extension ne les accepte pas (CSP `script-src 'self'`)
  et la revue Mozilla les refuse.
- `parties.js` — les deux numéros de partie, montrés par le popup. Écrit par
  l'outil de signature ; le manifeste, lui, ne porte que le numéro du paquet
  signé, le même pour les deux parties.
- `creator.css`, `overlay.css`, `icons/`, `fonts/`.

Dédoublées dans `stable/` et `beta/` :

- `content-roll20.js` — pose l'onglet dans le dialogue de perso (frame de la
  feuille) et relaie les jets vers le tchat (frame du haut). Gère aussi la fiche
  en fenêtre séparée (popout) : l'onglet se pose dans le document du haut et les
  jets repartent à la fenêtre d'ouverture. Les deux copies sont déclarées au
  manifeste et injectées dans chaque frame ; celle qui n'est pas du mode
  s'arrête à sa garde, avant de poser le moindre écouteur.
- `roll20-page.js` — pont d20, injecté dans le monde principal à la demande :
  lit et écrit les Attributes `owd_*` ; dans un popout, se rabat sur le Campaign
  de `window.opener`. Une seule copie est jamais chargée.
- `creator-shell.js`, `panneau-shell.js` — chacune pointe son iframe vers un
  seul site. Une seule des deux est jamais chargée.

Les polices du livre (`fonts/alegreya-latin.woff2`, `fonts/cinzel-latin.woff2`,
SIL OFL 1.1, textes dans `fonts/licences/`) ne servent QU'AU POPUP, qui est une
page d'extension. La feuille injectée dans Roll20, elle, ne peut pas les charger
(la CSP de Roll20 refuse la police d'une autre origine) et se contente de les
nommer. Les deux fichiers sont VARIABLES : une seule par famille suffit, en
ajouter une par graisse coûterait des dizaines de kilo-octets pour le même octet.

Le reste vit CÔTÉ SITE (`docs/`) : `roll20-fiche.html`, `roll20-camp.html`, et
les scripts d'amorce et de correspondance état ↔ Attributes.

## Réglages

Écrits par le popup, lus par les scripts de contenu et les coquilles :

| Clé | Défaut si absente |
|---|---|
| `owdOff` | absente = extension allumée (test strict sur `true`) |
| `owdNuit` | absente = `"auto"` |
| `owdBeta` | absente = partie stable |
| `owdPanneauActif` | absente = panneau Monde allumé |
| `owdPanneau:roll20-camp.html` | la géométrie du panneau, écrite par `content-roll20.js` ; le bouton « Replacer » du popup la SUPPRIME |

## Dépannage

`browser.storage.local` accepte deux clés, à poser depuis la console de débogage
de l'extension, qui remplacent l'adresse du site quel que soit le mode :

- `owd_sheet_url` — l'adresse de la fiche (ex. un `mkdocs serve` local) ;
- `owd_site_url` — la racine du site pour les panneaux.

Oubliées en place, elles peuvent faire afficher le site stable sous un onglet
« Fiche Outward beta » : c'est assumé, ce sont des clés de dépannage, et le
popup les annonce en pied de fenêtre — c'est le seul endroit qui le dise sans
ouvrir une console.

## Construire

    python scripts/build_extension.py --verifie    # contrôles seuls, rien d'écrit
    python scripts/build_extension.py              # packe dans docs/download/

Sorties : `docs/download/owd-roll20-firefox.xpi` et
`docs/download/owd-roll20-chrome.zip`. Le manifest V2 (ce dossier) sert Firefox ;
`extension/chrome/manifest.json` (V3) sert Chrome avec les mêmes fichiers — ce
dossier-là ne contient QUE son manifeste. Tout fichier posé sous
`extension/firefox/` part dans les DEUX paquets, déclaré ou non ; les contrôles
refusent les orphelins comme les fichiers nommés qui manquent.

Les deux PNG d'icône n'existent que pour Chrome, qui refuse le SVG en icône :
ce sont des rastérisations d'`icon.svg`, et elles se refont dès que le dessin
change. Le manifeste Firefox, lui, ne nomme que le SVG.

## Installer à la main

- **Firefox**, pour essayer sans signature : `about:debugging` → « Ce Firefox »
  → « Charger un module complémentaire temporaire… » → choisir
  `extension/firefox/manifest.json`. Le module disparaît à la fermeture du
  navigateur. Un `.xpi` non signé ne s'installe pas en Firefox de bureau
  ordinaire ; le paquet publié, lui, est signé et se met à jour tout seul par
  l'`update_url` du manifeste.
- **Chrome** : `chrome://extensions` → « Mode développeur » → « Charger
  l'extension non empaquetée » → choisir le dossier construit (celui qui porte
  le manifeste V3), et non `extension/firefox/`.

## Pont collaboratif — site 3.0.0b

Les deux copies de `roll20-page.js` prennent maintenant en charge `load.resync`
pour chaque personnage auquel la frame est liée. `attribs.fetch()` renouvelle la
collection ; une réponse `hydrate.fresh` n'est vraie qu'après son succès serveur.
Le plancher reste 1,5 seconde par personnage. `collaboration: 1` annonce cette
capacité au site, qui bloque l'édition avec un ancien pont.

Le site écrit les registres `owd_sync_p_*` de champs séparés et garde une
photographie initiale dans `owd_sync_base`. Le pont reste ignorant du format et
ne modifie jamais un autre personnage que celui lié à la frame.

Cette modification du paquet nécessite une nouvelle signature via le workflow
manuel `signer`, ou `scripts/ci_extension.py` avec les clés AMO. Les numéros des
manifestes et de `parties.js` restent réservés à cet outil. Les binaires signés
de `docs/download/` n'ont volontairement pas été remplacés par un XPI non signé.


## Monde — version de site 3.1.0b

Le popup et la barre affichent **Monde**. La coquille conserve l’adresse
historique `roll20-camp.html`, également présente sur le site stable.
`roll20-monde.html` est une adresse supplémentaire de la même interface.
Le pont choisit le personnage partagé **Monde**, ou à défaut l'ancien **Camp** ;
ces deux noms sont exclus du créateur de fiches. La clé historique de géométrie
`owdPanneau:roll20-camp.html` est conservée et le bouton Replacer la réinitialise.

Le nouveau protocole `monde-char` annonce sa capacité avant toute édition.
Les registres `owd_monde_base` et `owd_monde_p_*` suivent les mêmes règles et
priorités d'envoi que `owd_sync_*`. Les anciens attributs `owd_camp_*` servent
seulement à la conversion initiale et restent intacts. Monde affiche seulement
une horloge J/H/M/S et une température manuelle. La signature manuelle CI doit
inclure les changements de fiche 3.0.0b et de Monde 3.1.0b en un seul paquet.

## Outils OUTWARD — version de site 3.2.0b

`content-roll20.js` pose un séparateur natif OUTWARD et les outils Monde et
Inventaire (planète et sac en SVG `currentColor`). Les barres à `div` et à
`button` sont prises en charge, avec remise en place après un remontage.
Les cadres indépendants conservent leur géométrie ; ils ne prennent pas la
hauteur de la barre du MJ. Les iframes restent vivantes lors de la fermeture
pour confirmer les envois en cours. Le thème est relayé sans rechargement.

`owdPanneau:roll20-inventaire.html` mémorise la géométrie d'Inventaire, en plus
de la clé historique de Monde. `owdPanneauActif` ne coupe que Monde.
La coquille générique charge `roll20-inventaire.html`, qui choisit un personnage
contrôlé et ouvre `roll20-fiche.html#c=…&view=inventaire`. Le pont recontrôle les
droits et charge les attributs même si la fiche Roll20 n'était pas ouverte.
Le module natif et les attributs de synchronisation de la fiche sont réutilisés.

Un drag émet une identité d'objet et un jeton temporaire. Seul un dépôt natif
sur le chat confirme la publication ; la carte est composée dans la fiche
source puis passe par le relais chat existant. Aucun retrait de quantité.
Les deux variantes d'extension restent identiques hors lignes marquées.
Les paquets `essai/` sont non signés ; une seule signature ultérieure doit
regrouper 3.0.0b, 3.1.0b et 3.2.0b. Ne pas remplacer `docs/download/` avant elle.
