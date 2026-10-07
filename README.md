# Outward Système JDR

Jeu de rôle sur table dans l'univers d'Outward : règles, fiche de personnage,
inventaire, panneau Monde et extension Roll20.

Site bêta : https://igneefleur.github.io/fns-ttrpg/owd-beta/

## Version 3.3.0b — onglets d’inventaire et synchronisation

L’Inventaire de la barre OUTWARD propose des onglets ajoutables et fermables,
un par personnage accessible, sans doublons. Chaque fiche reste chargée et
actualisée même quand son onglet est masqué. Les choix sont mémorisés par
campagne. Survoler un autre onglet avec un objet pendant 550 ms l’active ;
le dépôt transfère ensuite l’objet et ses contenus dans cet inventaire.

Les relectures Roll20 sont partagées et diffusées à toutes les vues d’un
personnage. L’avertissement de synchronisation disparaît à la reprise.
Les transferts attendent les confirmations serveur et conservent un journal
pour reprendre une opération interrompue. Le drag vers le chat reste actif
depuis la fiche et la boîte à outils.

Voir [PATCH-3.3.0b.md](PATCH-3.3.0b.md) pour les détails, limites et vérifications.
**fns-owd-beta-3.3.0b.zip** devient la base du prochain patch ; ce patch
s’applique au projet complet **3.2.1b**. Aucun paquet signé ni publication.
Pour tester le nouveau pont, charger temporairement les paquets de `essai/`
et recharger Roll20 ; le site seul ne remplace pas l’extension installée.

## Version 3.2.1b — dépôt dans le chat

Glisser un objet depuis l'inventaire de la fiche **ou** celui de la boîte à
outils affiche une couche sur **toute** la barre `#rightsidebar` :
« Déposer pour montrer l’objet dans le chat ». Cette couche reçoit le dépôt,
puis disparaît à la fin du glissement. Le partage emploie la carte Montrer et
ne retire aucune quantité. Le déplacement interne reste disponible.

Firefox peut exposer le type d'un objet glissé entre origines différentes,
mais rendre son contenu vide à la lecture. Le dépôt utilise alors l'identité
et le jeton déjà reçus de la fiche au début du glissement ; seule cette fiche
peut confirmer ce jeton et publier, une seule fois. Si la fenêtre ne contient
pas de barre latérale (fiche séparée), aucune cible n'est créée.

Le correctif concerne le **code de l'extension**. Pour un essai avant signature,
charger temporairement l'extension extraite de `essai/owd-roll20-firefox.xpi`
via `about:debugging` et recharger Roll20. Une mise à jour du site seule ne
remplace pas les scripts de l'extension déjà installée.

Aucune signature ni publication. **fns-owd-beta-3.2.1b.zip** était la base
du patch suivant. Le patch s'applique au projet complet 3.2.0b.

## Version 3.2.0b — outils OUTWARD (schéma de fiche 11)

La barre native Roll20 contient un séparateur **OUTWARD**, puis **Monde**
(planète) et **Inventaire** (sac). Le squelette des outils et des séparateurs
suit celui de Roll20, y compris les barres récentes à outils en `div`, comme
VTTK. Les fenêtres utilisent leurs propres dimensions : Monde 360 × 350 px,
Inventaire 850 × 650 px, limitées au viewport. La hauteur de la barre du MJ
n'entre jamais dans leur hauteur.

Inventaire propose les personnages contrôlés par le joueur ; le MJ peut
choisir tous les personnages, à l'exception des supports Monde et Camp.
Il monte uniquement le module natif Inventaire, avec l'amorce et le moteur
collaboratif de la fiche complète. Il n'existe pas de seconde copie des objets.
Les droits sont revérifiés à la lecture, à l'envoi et dans la file d'écriture.
Un personnage sans fiche affiche une explication et ne crée aucune donnée.

Les fenêtres sont déplaçables et redimensionnables sur les deux axes. Leur
position et leur taille sont mémorisées. Fermer, rouvrir ou changer de
personnage laisse les envois en cours se confirmer ; le choix du personnage
est mémorisé par campagne. La palette revient si Roll20 remonte sa barre.

Glisser une tuile d'objet depuis l'inventaire détaché ou la fiche vers le chat
partage sa carte « Montrer », sans déduire sa quantité. Le déplacement interne
à l'inventaire reste disponible. Les conflits sur le même champ restent soumis
à la dernière valeur reçue par Roll20.

Aucune publication ni signature. Les paquets de développement sous `essai/`
regroupent les changements 3.0, 3.1 et 3.2. Les téléchargements signés sont
conservés jusqu'à la signature commune. La section 3.3.0b indique la base actuelle ; le ZIP du patch 3.2.0b s'applique à 3.1.0b.

## Version 3.1.0b — Monde (schéma de fiche 11)

Camp devient **Monde** dans la barre Roll20 et le popup de l'extension.
Le panneau ne montre que **Horloge** et **Température**. L'horloge est en
jours/heures/minutes/secondes, avec les reports 60 s → 1 m, 60 m → 1 h et
24 h → 1 j. Les gestes Round (3 s), Minute et Heure fonctionnent comme ceux
de la fiche, avec des durées positives ou négatives.

Monde utilise exactement le moteur `OwdSync.Session` des fiches, dans un
espace d'attributs distinct. Horloge et température s'éditent indépendamment ;
l'horloge entière est un même élément atomique, comme dans les fiches.
Relecture serveur toutes les quelques secondes, protection des frappes locales,
confirmation et reprise des écritures perdues. Le DOM reste stable : la réception
ne coupe pas une saisie. Les conflits sur un même élément restent possibles.

Le personnage Roll20 **Monde** doit être partagé avec les joueurs. L'ancien
personnage **Camp** reste reconnu pour convertir son horloge et sa température
sans supprimer ses données historiques. Si Monde et Camp existent ensemble,
Monde est choisi. La température devient une valeur manuelle en °C ; les milieux,
installations, veille, lieu et rappels de règles ont été retirés de l'interface.
Cette horloge ne fait pas avancer automatiquement celles des personnages.

Aucune publication ni signature n'a été effectuée. Les paquets sous `essai/`
contiennent désormais les changements 3.0.0b, 3.1.0b et 3.2.0b pour une
signature commune ultérieure.

## Édition collaborative des fiches (introduite en 3.0.0b)

Plusieurs contrôleurs d'un personnage peuvent modifier sa fiche en même temps.
Chaque champ est enregistré séparément. Compétences, techniques, avantages,
objets, raccourcis d'armes et récupérations utilisent des identités stables :
les ajouts et suppressions n'adressent jamais les autres entrées par leur index.
Deux personnes modifiant des champs différents conservent leurs modifications.
Un même champ reste soumis au conflit habituel : l'état relu du serveur tranche.
Un texte (Notes, Bio, description) est un champ entier ; ce n'est pas un éditeur
collaboratif lettre par lettre.

Les fiches ouvertes demandent une vraie relecture serveur toutes les quelques
secondes. La saisie locale non envoyée est protégée, puis l'affichage reçoit les
changements des autres. L'onglet, l'édition des modules, la sélection d'inventaire,
le focus et le curseur sont conservés lors du remontage. Les modales et la
composition de texte reportent seulement le remontage ; les données continuent
d'être reçues. Une réception invalide gèle les écritures au lieu d'écraser l'état.

La collaboration concerne Roll20 et les utilisateurs qui contrôlent le même
personnage. Le créateur autonome continue d'utiliser son stockage local.

### Installer / publier cette mise à jour

1. Remplacer les fichiers du projet par cette version (ou appliquer le ZIP du
   patch à la version 3.0.0b). Les fichiers `src/` ET leurs produits `docs/`
   sont fournis.
2. Exécuter les contrôles ci-dessous, puis pousser `owd-beta` : le workflow
   construit et publie le site.
3. Relancer manuellement le workflow **website deployment**, avec **signer**
   coché. Le pont de l'extension a changé : cette étape signe le nouveau paquet
   Firefox et produit aussi le paquet Chrome. Les secrets AMO du dépôt sont
   nécessaires. `scripts/ci_extension.py` fixe lui-même les numéros d'extension
   et de parties ; ne pas les augmenter à la main.
4. Installer / mettre à jour l'extension sur tous les postes puis recharger la
   partie Roll20. L'ancien pont est détecté et la fiche collaborative n'y
   autorise pas les écritures.
5. À la première ouverture d'un personnage au schéma 10, l'écran de migration
   propose le schéma 11 et protège l'original dans `owd_backup`. La photographie
   collaborative est confirmée avant l'envoi des modifications suivantes.

Les binaires signés de `docs/download/` sont conservés jusqu'à la signature CI :
ils ne sont PAS le nouveau pont. `essai/` contient les nouveaux paquets de
développement non signés pour vérification locale. Firefox standard nécessite
le nouveau XPI signé ; Chrome peut tester le paquet d'essai en mode développeur.

### Contrôles

```bash
python scripts/assembler.py --verifie
node scripts/test_sync.js
node scripts/test_monde.js
python scripts/build_extension.py --verifie
python scripts/verif_versions.py
python -m mkdocs build --config-file mkdocs.ci.yml
```

Les harnais `scripts/test_sync_browser.js` et `scripts/test_monde_browser.js` utilise le vrai bundle et le vrai pont
avec deux collections locales indépendantes et un serveur simulé. Après avoir
installé Playwright et son Chromium, le lancer avec Node. `CHROMIUM_EXECUTABLE`
permet de sélectionner un Chromium existant. Il n'utilise aucun compte Roll20.

### Sauvegarde et sources

- `docs/javascripts/owd-sync.js` : moteur pur de décomposition, fusion et attentes.
- `owd_sync_base` : photographie initiale immuable du personnage.
- `owd_sync_p_*` : registres de champs, d'ordre et de présence ; les suppressions
  sont conservées comme tombstones pour qu'une ancienne ligne ne ressuscite pas.
- `owd_state` : photographie d'activation au schéma 11, plus source historique
  pour les personnages qui n'ont pas encore activé la collaboration. Elle n'est
  plus réécrite à chaque frappe. Les lecteurs actuels préfèrent l'état collaboratif.
- Les attributs dérivés des macros et barres restent des miroirs recalculés.
- Import/export JSON, sauvegarde de migration et restauration lisent l'état
  reconstruit. Une restauration d'origine désactive les anciens registres et
  gèle les autres fiches encore ouvertes ; il faut les fermer et les rouvrir.

Les horloges J/H/M/S sont enregistrées comme un champ indivisible. Les trois
cases MOD d'une arme sont distinctes. Un tableau d'un mod sans identité stable
et les listes de valeurs (par exemple l'ordre des modules) constituent un seul
champ : fournir des `id`/`ref` aux entrées d'un mod si elles doivent s'éditer
indépendamment.

Modifier les fragments sous `src/fiche/`, puis assembler avec
`python scripts/assembler.py`. Augmenter la version exclusivement avec
`scripts/release_fiche.py --majeur|--moyen|--petit`, qui lance les tests, aligne les
porteurs et les clés de cache. Cette mise à jour est majeure : 2.23.0b → 3.0.0b.
Monde n’a pas changé le schéma des personnages. Le schéma 11 dispose d'une migration montante et descendante testée.

Les patchs suivants doivent repartir du ZIP complet 3.1.0b livré avec ce patch,
puis livrer à nouveau le patch et le ZIP complet versionné. Ne pas repartir de
les archives 2.23.0b ou 3.0.0b.

## Développer le site

```bash
pip install mkdocs-material
python -m mkdocs serve
```

Les branches du dépôt déploient vers la même branche `gh-pages`. Pousser une
branche, attendre son déploiement, puis pousser la suivante.

## Œuvre de fan

Sans but lucratif et sans lien avec les ayants droit. Outward appartient à Nine
Dots Studio ; les apports originaux sont d'IgneeFleur. Voir `LICENSE.md`.

## Vérification des outils détachés

Après `python -m mkdocs build --config-file mkdocs.ci.yml`, exécuter
`node scripts/test_outils_browser.js` avec Playwright disponible dans
`NODE_PATH` et, si nécessaire, `CHROMIUM_EXECUTABLE` pointant vers Chromium.
Le harnais utilise les vrais scripts, coquilles, pont et bundle, avec un
serveur Roll20 simulé : choix autorisé, éditions simultanées, fiche complète,
redimensionnement, retour de la barre, vrai dépôt souris dans le chat,
changement de personnage et personnage sans fiche. Ces essais ne remplacent
pas la validation finale dans une partie Roll20 avec l'extension installée.

Le harnais accepte désormais `TEST_BROWSER=firefox` et `CROSS_ORIGIN=1` pour
séparer Roll20 et les pages de fiche. Il vérifie la couche sur l'intégralité
de `#rightsidebar`, les dépôts depuis les deux vues et la conservation des
quantités. Installer le navigateur de test avec `playwright install firefox`.
