## Version 3.11.0b — Défenses dépliables et modes lents

Les défenses se déplient comme les attaques. Elles montrent les protections et
résistances du personnage, complétées par la parade sélectionnée. Les valeurs
positives et négatives sont visibles ; les valeurs nulles restent cachées,
sauf avec Tout afficher. Le bouton Défendre conserve la saisie simple et
l’envoi au chat.

Les trois commandes de chaque module occupent un tiers de la ligne et utilisent
le style Investies des compétences : Attaque Lente / Consommer Endurance /
Consommer Munition ; Défense Lente / Consommer Endurance / Tout afficher.
Une attaque lente ne dépense pas de PE et divise ses dégâts finaux par deux,
arrondis au plancher. Une défense lente ne dépense pas de PE et divise la
protection active de parade par deux, après cumul, arrondie au plancher.
Les protections passives et résistances du personnage sont conservées.

Schéma 15 avec migration réversible des nouveaux réglages. Patch sur 3.10.2b ;
projet complet 3.11.0b. Site à mettre à jour uniquement. Aucune signature ou
publication de l’extension n’a été lancée.

## Version 3.10.2b — Édition des attaques

Type se choisit séparément : Armes ou Attaque personnalisée. Armes propose
la Source dans l’équipement ; Attaque personnalisée propose le Nom à sa place.
Le dessin reste à gauche et tous les champs sont à droite : difficulté, dégâts,
MOD, compétence, multiplicateur, garde et types de touche/passage. Le type d’arme
n’apparaît plus dans les attaques personnalisées.

Touche/Passage et Effacer/Tout Effacer occupent deux lignes de boutons à parts
égales. La portée est centrée sous le dessin. Le texte d’aide a été retiré.

Schéma 14 inchangé. Patch sur 3.10.1b ; projet complet 3.10.2b.
Mise à jour du site uniquement. Aucune signature ni publication de l’extension.

## Version 3.10.1b — Défense : saisie simple puis envoi au chat

Le clic sur une défense ouvre uniquement Dégâts subis et Type de dégâts.
Valider envoie une seule carte de défense avec ses valeurs et le calcul des
protections/réductions. L’option Endurance du module conserve son coût prévu.
Le formulaire ne contient plus de jet séparé, réussite/échec, aperçu de calcul
ou ajout de types. La validation n’applique plus automatiquement les dégâts aux PV.

Schéma 14 inchangé. Patch sur 3.10.0b ; projet complet 3.10.1b.
Mise à jour du site uniquement. Aucune signature ni publication de l’extension.

## Version 3.10.0b — Trajets dessinés, options globales et taille

Les armes normales affichent toujours au moins trois anneaux autour du centre.
Les attaques personnelles ont un éditeur de trajet par clic : Touche, Passage,
Effacer, ordre numéroté, grille agrandissable et effacement complet. Le dessin se
fait à gauche en édition ; les données de l’attaque se saisissent à droite et
en dessous. Les trajets existants et leurs aperçus sur la map sont conservés.

Attaques possède deux options permanentes en haut : Utiliser Endurance et
Utiliser Munition. Défenses possède seulement Utiliser Endurance. Ces options
s’appliquent à toutes les entrées du module. La munition choisie reste propre à
chaque attaque. Les anciennes options sont migrées : une option commune est
activée si elle était active sur au moins une ancienne entrée. Les anciens
réglages restent conservés pour le retour de version.

Le sélecteur Taille se trouve entre Espèce et Âge : Minuscule, Petite, Moyenne,
Grande, Énorme et Gigantesque. Il est sauvegardé avec le personnage ; la taille
ne modifie pas automatiquement les règles de combat.

Schéma 14, migration réversible. Patch sur 3.9.1b ; projet complet 3.10.0b.
Mise à jour du site uniquement. Aucune signature ni publication de l’extension.

## Version 3.9.1b — Défenses d’armes dans l’inventaire et lien Prendre

La carte d’arme de l’inventaire retrouve Parade, Réduction et ses trois MOD de
parade. Le callback historique de l’inventaire n’est plus interprété comme le
booléen qui masque ces champs dans les attaques personnalisées.

Le lien natif des nouvelles macros OWD Item Give affiche Prendre, comme la carte
habillée par l’extension. L’action Donner de l’inventaire conserve son libellé.
Les anciens messages déjà envoyés ne sont pas réécrits. Le rendu spécial du chat
nécessite l’extension récente : ses sources et les paquets de test la contiennent,
mais le paquet signé précédent reste intact. Le workflow peut signer la version
récente avec sa case dédiée. Le workflow corrigé utilise directement mkdocs.yml.

Schéma 13 inchangé. Patch sur 3.9.0b, projet complet 3.9.1b. Site à mettre à jour ;
aucune signature ou publication n’a été lancée.

## Version 3.9.0b — Attaques et Défenses

Le module Armes devient Attaques : les raccourcis d’inventaire sont conservés,
et des attaques personnelles peuvent définir difficulté, dégâts, MOD, compétence,
type, trajet, garde et multiplicateur. Les trajets personnels utilisent le même
aperçu sur la carte et acceptent les portées longues.

Défenses apparaît sous Attaques : Sans Défense et Esquive sont toujours présents.
Les autres défenses utilisent une arme (boucliers compris) ou leurs propres valeurs.
La protection d’une parade vaut la Réduction de l’arme + ses trois MOD, en plus
des protections portées. Les protections/résistances du même objet ne sont jamais
comptées deux fois. Une parade ratée utilise seulement les défenses du personnage ;
une esquive réussie annule tous les dégâts.

Le formulaire saisit les dégâts par type, montre le calcul puis applique les PV
et envoie le détail au chat. Les composantes du même type sont regroupées : protection,
pourcentage cumulé, arrondi final vers le bas, minimum zéro. Le jet utilise la
compétence liée et les dés d’action existants ; la réussite se renseigne dans le
formulaire. Utiliser Endurance est sauvegardé par entrée : esquive 8 PE, parade
sa difficulté, dépensés une fois à la validation, même en cas d’échec.

Schéma 13, migration réversible conservant les attaques libres et les défenses.
Le patch s’applique à 3.8.5b ; 3.9.0b devient la nouvelle base. Mise à jour du site
uniquement : aucune modification, signature ni publication de l’extension.

## Version 3.8.5b — bouton Prendre du chat

OWD Item Give affiche « Prendre » dans le chat, avec une infobulle et un message
d’aide cohérents. « Donner » reste l’action de l’inventaire. La réception et le
payload de l’objet sont conservés.

Le schéma reste 12. **fns-owd-beta-3.8.5b.zip** devient la nouvelle base ; le patch
s’applique à **3.8.4b**. Mettre à jour l’extension et le site ; les paquets de test
sont dans `essai/`. Aucune signature ni publication n’a été lancée.

## Version 3.8.4b — cartes du chat

OWD Item Show affiche uniquement Détails ; les commandes Montrer de l’inventaire
restent disponibles. OWD Item Show et OWD Item Give utilisent le nom de l’objet
en titre, sans le répéter dans le corps. Leur image reprend le portrait 21:32 et
le cadrage de l’inventaire. OWD Item Give conserve son bouton Donner.

OWD Action Dice garde uniquement Détails à gauche et Relancer à droite : somme
et meilleur sont retirés. La sélection, la relance des dés et l’accès au message
Roll20 d’origine sont conservés.

Le schéma reste 12. **fns-owd-beta-3.8.4b.zip** devient la nouvelle base ; le patch
s’applique à **3.8.3b**. Mettre à jour le site et l’extension. Les paquets de test
sont dans `essai/` ; les paquets signés de `docs/download/` sont conservés.

## Version 3.8.3b — réception unique et rangement sans sac

« Prendre » ouvre un seul dialogue, dans la dernière fiche ouverte ou le dernier
onglet d’inventaire activé. Les lectures et sauvegardes des autres vues ne changent
pas ce choix. Les onglets masqués ou fermés, Monde et Attaques ne sont pas des
destinataires. Rouvrir la fenêtre Inventaire ou l’onglet Fiche Outward le remet
en tête ; les popouts passent par un relais unique dans l’éditeur.

La catégorie « Hors sac » est retirée. Sans sac porté, les anciens objets libres
du sac et les nouveaux objets reçus vont dans les poches. Les objets déjà liés
à un sac retiré restent à l’intérieur et sont accessibles par son contenu.

Le schéma reste 12. **fns-owd-beta-3.8.3b.zip** devient la nouvelle base ; le patch
s’applique à **3.8.2b**. Mettre à jour le site ET l’extension : les sources et les
paquets de test dans `essai/` sont fournis. Les paquets signés de `docs/download/`
sont conservés ; aucune signature ni publication n’a été lancée.

## Version 3.8.2b — confirmation des sauvegardes

L’avertissement de sauvegarde en attente disparaît automatiquement dès que tous
les champs locaux sont confirmés par une relecture de Roll20. Une relecture qui
ne confirme pas les champs le laisse affiché ; les renvois automatiques et les
autres alertes sont conservés. Le texte décrit une attente après plusieurs
tentatives sans affirmer que les données sont perdues.

Le schéma reste 12. **fns-owd-beta-3.8.2b.zip** devient la nouvelle base ; le patch
s’applique à **3.8.1b**. La correction est servie par le site.

## Version 3.8.1b — fenêtres Inventaire et Attaques

Les vues de la barre d’outils remplissent la hauteur disponible sous les onglets
sans ajouter de défilement de page ou de module. L’inventaire conserve uniquement
le défilement indépendant de ses deux colonnes, y compris dans une fenêtre basse
ou étroite. Les attaques défilent dans une seule liste ; les cartes gardent leur
hauteur et restent accessibles après redimensionnement. La fiche complète garde
son calcul de hauteur et sa disposition habituels.

Le schéma reste 12. **fns-owd-beta-3.8.1b.zip** devient la nouvelle base ; le patch
s’applique à **3.8.0b**. La correction est servie par le site. Aucune signature ni
publication.

## Version 3.8.0b — menu de clic droit de l’inventaire

Un clic droit sur un objet ouvre un menu dans la palette de la fiche, avec des
séparateurs entre montrer, donner, séparer, détruire, contenu, déplacements et
équipement. Les actions partielles demandent une quantité strictement inférieure
à la pile ; elles sont masquées pour un objet seul ou un sac. Séparer reste masqué
si le contenant a des objets imbriqués.

Équiper prend un exemplaire, choisit le premier emplacement compatible libre,
puis remplace le premier compatible à défaut. Les armes choisissent la main droite
puis la gauche ; les vêtements à deux cases occupent les deux. L’objet remplacé
rejoint le sac porté, ou les poches. Les accroches choisissent un emplacement libre
avant le premier et respectent l’encombrement autorisé. Les destinations indisponibles
ou déjà utilisées sont masquées. Le menu fonctionne aussi avec Maj+F10, les flèches
et Échap, et se ferme au clic extérieur, au défilement ou à la sortie de la fenêtre.

Le schéma reste 12. **fns-owd-beta-3.8.0b.zip** devient la nouvelle base ; le patch
s’applique à **3.7.0b**. Cette modification est servie par le site et ne nécessite
pas de nouveau pont d’extension. Aucune signature ni publication.

## Version 3.7.0b — inventaire et sacs à dos

Le dépôt dans le tchat propose trois zones distinctes : Détruire, Donner et Montrer.
Séparer crée une seconde pile avec la quantité indiquée ; le catalogue reste identique,
mais chaque pile possède sa propre référence. La réception d’un objet ordinaire rejoint
la première pile de même identifiant.

Le groupe Sac à dos apparaît uniquement lorsque le sac est porté sur le dos.
Retirer le sac conserve ses contenus, accessibles dans son panneau ; son poids total
comprend les objets imbriqués. Donner ou transférer le sac transmet tout son contenu.
Les sacs ne s’empilent jamais. Détruire un sac détruit également ses contenus,
après confirmation explicite. Les objets sans sac restent accessibles dans Hors sac.
Le schéma 12 conserve les liens des sacs lors d’une descente puis remontée de version.

**fns-owd-beta-3.7.0b.zip** devient la base ; le patch s’applique à **3.6.0b**.
Le site et l’extension doivent être mis à jour pour les trois nouvelles zones de dépôt.
Les builds de test non signés sont dans `essai/`. Aucune signature ni publication.

# Outward Système JDR

Jeu de rôle sur table dans l'univers d'Outward : règles, fiche de personnage,
inventaire, panneau Monde et extension Roll20.

Site bêta : https://igneefleur.github.io/fns-ttrpg/owd-beta/

## Version 3.6.0b — cartes d’objets dans le tchat

Les messages de l’inventaire utilisent désormais **OWD Item Show** et
**OWD Item Give**. L’extension les présente avec le cadre, la palette jour/nuit,
le titre et les boutons des dés d’action : image, nom, quantité, description,
poids unitaire et total, encombrance, prix d’achat et de vente, puis les données
propres à l’arme, au vêtement, au sac, à la ceinture ou au contenant.

**Détails** déplie le message Roll20 original. **Montrer** ouvre une vue agrandie
avec l’image et toutes les informations. **Donner** ouvre la réception du don
existant (quantité et rangement, comme l’ancien lien Prendre). Aucun don
supplémentaire ne part au clic : le retrait reste celui du dialogue d’inventaire.
Le protocole de réception reste compatible, y compris les anciens messages.
Sans extension, le gabarit Roll20 garde le nom de l’objet et ses champs lisibles.

Les cartes reconnaissent le nom exact du gabarit et un payload versionné.
Les textes ne sont jamais interprétés comme du HTML. Les images HTTP(S) et les
vignettes PNG/JPEG/WebP/GIF sont acceptées ; une image absente ou en erreur
laisse une vignette avec l’initiale de l’objet. Les images importées sont incluses
jusqu’à 200 000 caractères. Un message invalide conserve son rendu Roll20.

**fns-owd-beta-3.6.0b.zip** devient la base ; le patch s’applique à **3.5.2b**.
Mettre à jour le site et l’extension de `essai/`, puis recharger Roll20.
Aucune signature ni publication. Tests : `node scripts/test_item_cards.js`,
`node scripts/test_item_cards_browser.js` avec Playwright et éventuellement
`CHROMIUM_EXECUTABLE` ou `TEST_BROWSER=firefox`.

## Version 3.5.2b — aperçu partagé des attaques sur la carte

Survolez un coup dans la fenêtre **Attaques**, avec **un token sélectionné**
et contrôlé par vous, sur une grille hexagonale visible. Le trajet apparaît
sur la carte de tous les clients ayant cette extension : contours opaques dorés pour les touches et dorés atténués pour les passages,
avec des intérieurs vides. Les teintes reprennent la légende nocturne de la fiche. Le survol n’envoie aucun jet ni
dégât et ne consomme aucune ressource ; le clic garde son action habituelle.

Le marqueur invisible `owd-atk-v1-…` transporte le trajet normal, le miroir et
l’orientation en Base64url. Les autres marqueurs sont conservés. Le retrait est
ciblé sur l’aperçu créé par cette vue ; les événements anciens ne peuvent pas
retirer un aperçu plus récent. Une présence renouvelée pendant le survol et une
expiration de huit secondes bornent les aperçus orphelins. Le lecteur s’installe
même si le client n’a ouvert aucune fiche ni aucun panneau.

Le correctif 3.5.2b accepte les coordonnées Roll20 sous forme de nombres ou de
texte et conserve la file de rendu des aperçus au-dessus de la carte, avec des
couleurs entièrement opaques. La régression de 3.5.1b est reproduite dans un
test Babylon/WebGL réel, puis vérifiée avec le correctif.

La géométrie est adaptée des fonctions de VTTinker de Théo Cavaillès. Jumpgate
utilise le centre synchronisé du token (le groupe de marqueurs décalé sert
uniquement à vérifier sa visibilité), lit le maillage de grille et dessine des hexagones Babylon non sélectionnables
à la profondeur de la grille. Le moteur historique utilise la géométrie tracée
par Roll20 et un calque 2D non interactif. Zoom, décalage, déplacement et tailles
de grille suivent le moteur actif. Les grilles carrées, isométriques, masquées
ou absentes n’affichent aucun trajet. Sur les hexagones à sommet pointu,
l’orientation 0 correspond au voisin supérieur gauche ; sur ceux à sommet plat,
elle correspond au voisin au-dessus, comme les cartes de la fiche.

La portée se déduit des coordonnées : pas de plafond à trois anneaux, et les
cartes de la fiche s’adaptent également au trajet. Les limites techniques de
validation (1 024 étapes, coordonnées entières jusqu’à un million, marqueur
jusqu’à 20 000 caractères) bornent les données reçues, sans fixer une portée de
jeu. La taille maximale acceptée par Roll20 reste à mesurer en partie réelle.

**fns-owd-beta-3.5.2b.zip** devient la base des prochains patchs ; le ZIP du
patch s’applique à **3.5.1b**. Le site ET le nouveau pont de l’extension sont
nécessaires. Tester avec les paquets non signés de `essai/`, puis recharger la
partie. Aucun fichier de notes de patch ajouté, aucune signature ni publication.

Test graphique réel : `node scripts/test_attack_webgl.js`, avec Playwright,
`BABYLON_BUNDLE` pointant vers un `babylon.js` local (testé en 8.45.4), et
`CHROMIUM_EXECUTABLE`. Il vérifie les pixels des deux contours, les intérieurs
vides, le centre du token et les coordonnées texte sur une carte simulée.

Contrôles supplémentaires : `node scripts/test_attack_map.js`,
`node scripts/test_attack_scene.js`, et `node scripts/test_attack_map_browser.js`
avec Playwright et `CHROMIUM_EXECUTABLE` si nécessaire. Le dernier accepte
`TEST_BROWSER=firefox`. Ces essais utilisent un serveur Roll20 simulé ; le test
Jumpgate vérifie ses objets de scène simulés et ne remplace pas un essai dans
une vraie partie Roll20.

## Version 3.4.0b — Attaques et actions de dépôt

La barre **OWD** contient Monde, Inventaire et Attaques, avec les silhouettes
SVG fournies, recadrées et uniformisées. Attaques utilise le module Armes natif
avec des onglets par personnage accessible, sans doublon, chargés et
synchronisés même masqués. Ses onglets et sa fenêtre sont mémorisés séparément.

Le dépôt sur la barre latérale présente trois tiers de hauteur : **Supprimer**,
**Donner**, **Montrer**. Supprimer demande confirmation ; Donner ouvre le choix
de quantité existant puis envoie la carte Prendre ; Montrer conserve l’objet.
Les actions fonctionnent depuis la fiche et l’inventaire détaché.

**fns-owd-beta-3.4.0b.zip** devient la base des prochains patchs. Le ZIP du
patch s’applique à **3.3.0b**. Aucun fichier de notes ou manifeste de patch
n’est ajouté. Aucun paquet signé ni publication.

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


### Boutique Roll20 — 3.15.0b

La barre d'outils OWD propose Boutique, avec catégories, recherche, pagination et détails des équipements. Les fiches `docs/content/regles/equipements/` constituent le catalogue : `hooks/boutique.py` produit `owd-boutique.json` pendant la construction.

Cliquez sur un article pour consulter ses caractéristiques. Glissez-le dans le chat vers **Montrer** ou **Donner**, puis validez la quantité. **Donner** produit le bouton **Prendre** habituel ; les caractéristiques restent consultables dans la description de l'objet reçu. Aucun paiement automatique n'est effectué.

Cette version change le site et le code de l'extension. Après avoir ajouté les fichiers à la branche bêta, ouvrez **Actions → website deployment → Run workflow**, sélectionnez **owd-beta**, cochez **Signer l'extension Outward chez Mozilla**, puis lancez le workflow. Les secrets Mozilla déjà utilisés par le projet sont nécessaires. Cette action publie les nouveaux téléchargements et permet la mise à jour Firefox. Le XPI signé inclus avant cette action correspond à l'ancienne extension.


### 3.16.0b — images et fenêtres Roll20

Les 1 256 équipements utilisent leurs illustrations terminées, récupérées dans `outward-equipements-images.zip`. Monde et Boutique reprennent le noir et le doré de l'extension. Les paramètres proposent cinq interrupteurs indépendants : Monde, Boutique, Inventaire, Attaques et Défenses, puis Beta après un séparateur.

Défenses ouvre les onglets des personnages, comme Attaques, avec le même module et les mêmes calculs que la fiche. Double-cliquez sur le bandeau de chaque fenêtre pour la replier ou la réafficher. Le bouton Détacher et la commande Replacer ont été retirés.

Le patch s'applique sur 3.15.0b. Après remplacement des fichiers sur GitHub, lancez **website deployment** avec **Signer l’extension Outward chez Mozilla** coché ; la seule mise à jour du site ne remplace pas le code signé de l'extension.


### Équipements : source unique Boutique

Les noms anglais, caractéristiques, effets et types d’arme sont définis dans `docs/data/owd-boutique.json`. La fiche, la Boutique et les fiches du livre consomment ces mêmes données. `python scripts/exporter_boutique.py` régénère les pages du livre ; le build les régénère également. L’ancien import de tableur est désactivé pour ne pas écraser les définitions.


### Descriptions de Boutique

Une description est le texte exact de la section Description de la fiche wiki correspondante, ou une chaîne vide. Aucun texte générique ni description déduite du set ne doit la remplacer. `descriptionSource` conserve la page wiki et `descriptionEmpreinte` l’empreinte du texte vérifié. Les descriptions des objets déjà reçus sont actualisées depuis cette définition.

Les fournitures dont l’adaptation JDR n’est pas encore définie portent `definitionStatut: a-completer` et nomment les valeurs manquantes dans `donneesACompleter`. Un volume inconnu reste `null`, une taille inconnue reste vide : ces absences ne signifient pas zéro. Leurs images, poids et prix proviennent du wiki ; aucun effet JDR n’est déduit de leur description.
