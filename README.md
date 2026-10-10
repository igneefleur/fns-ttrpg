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

## Où en est le jeu

Les règles de base sont écrites : prestige, huit caractéristiques, huit
compétences, spécialités, jets plafonnés, PV et endurance, initiative, vitesse,
sauts, charge, récupération. La fiche les suit, et n'en porte aucun nombre —
`hooks/mia_creation.py` relit la page de règles au build et en tire tout.

Restent à écrire : le combat et la prise de vitesse, les difficultés, les
critiques s'il y en a, et la façon dont le prestige s'accorde.

L'extension attend sa **première signature Mozilla**, qui créera l'add-on
`mia-roll20@igneefleur` sur le compte. Tant qu'elle n'a pas eu lieu, les deux
boutons de téléchargement de la page Extension ne servent à rien. La marche à
suivre est en tête de `.github/workflows/deploy.yml`.

Le **hub** (branche `main`) doit nommer `mia` et `mia-beta` dans son
`clean-exclude`, sans quoi son déploiement efface les deux sites sans qu'aucun
run n'échoue.

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

## Points de narration — extension 1.0.0.6

L’extension intègre le plateau partagé de narration de JJK, avec les couleurs,
les polices et les modes clair/sombre de la fiche MIA. Les jetons utilisent
`docs/assets/images/fate_token.png`, l’image Fate fournie, sans recoloration.

### Mise en place dans Roll20

1. Le MJ crée un personnage nommé **Narration** dans le journal.
2. Il le rend visible dans le journal et contrôlable par **tous les joueurs**.
3. Après rechargement de la partie avec la nouvelle extension, ouvrez le
   **Plateau de narration** depuis la barre d’outils Roll20.
4. Dans **Réglages**, ajoutez les joueurs. La distribution initiale est de
   **3 jetons par joueur et 5 pour le MJ**, modifiable dans les réglages.
5. Cliquez sur **Distribuer**, puis confirmez. Déplacez ensuite les jetons
   entre les places pour dépenser ou donner des points. Le plateau sauvegarde
   et synchronise ses positions dans les attributs Roll20 `mia_narr_`.

Le panneau peut être ancré ou détaché, déplacé et redimensionné. Le popup de
l’extension permet d’activer ou de désactiver le plateau. Les personnages
MIA conservent leur schéma et leurs attributs existants.

### Paquets pour cette livraison

`extension/build/` contient les paquets de développement Firefox et Chrome
**1.0.0.6**. Le paquet Firefox est **non signé** : pour un essai temporaire,
chargez son `manifest.json` via `about:debugging` après extraction. Pour Chrome,
extrayez le ZIP et utilisez **Charger l’extension non empaquetée**.

Le site MIA doit aussi recevoir les fichiers de ce projet : le contenu du
plateau est servi par `roll20-narration.html`, comme la fiche existante.
Les anciens paquets signés dans `docs/download/` restent conservés jusqu’à
la prochaine signature Mozilla ; ils ne contiennent pas cette nouvelle fonction.

Pour reconstruire les paquets de développement :

```bash
python scripts/assembler.py
python scripts/build_extension.py --sortie extension/build
```

La version 1.0.0.4 augmente le diamètre des jetons de narration de 50 %,
à toutes les tailles de panneau (30 à 57 px), sans modifier leur image.

La version 1.0.0.6 rétablit la détection structurelle des onglets MIA,
y compris dans les campagnes sans feuille de personnage native et dans les
interfaces localisées. Le diamètre des jetons reste augmenté de 50 %.

La version 1.0.0.6 annule également les changements de style hors demande
du popup et du créateur. Les écritures de personnage suivent le code MIA
d'origine. Les messages du plateau ne deviennent plus des destinataires
des échanges d'objets. Aucun nettoyage automatique ne supprime d'attribut.
Les commandes d'affichage et de repositionnement du plateau indiquent
qu'un rechargement de la partie est nécessaire. Voir AUDIT_1.0.0.6.md.
