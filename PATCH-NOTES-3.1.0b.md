# Patch Outward 3.0.0b → 3.1.0b

Camp devient **Monde** dans l'extension. Le panneau affiche seulement :

- l'horloge en jours, heures, minutes et secondes ;
- la température manuelle en °C.

Lieu, milieu, installations, veille et rappels de règles sont retirés de
l'interface. Le passage conserve la date et la température de l'ancien Camp.
Ses attributs historiques restent intacts. La température calculée d'un ancien
milieu est convertie en la valeur qu'il affichait au moment du passage.

L'horloge normalise les reports : 60 s → 1 m, 60 m → 1 h, 24 h → 1 j.
Les gestes Round (3 s), Minute et Heure reprennent ceux de la fiche et permettent
aussi de reculer le temps. Horloge et température utilisent exactement le moteur
collaboratif des fiches, avec des attributs séparés : modifications simultanées,
relecture serveur fréquente, protection des saisies et reprise des écritures
non confirmées. L'horloge est un élément atomique ; deux personnes modifiant
l'horloge au même moment peuvent donc entrer en conflit, comme sur une fiche.
Aucune répercussion automatique sur les horloges des personnages n'est ajoutée.

## Appliquer

Le ZIP du patch s'applique à la version complète **3.0.0b** livrée précédemment.
Extraire à la racine du projet et remplacer les fichiers de même nom. Le manifeste
du patch liste les empreintes des fichiers et les suppressions éventuelles.
Le ZIP complet **fns-owd-beta-3.1.0b.zip** contient déjà ce patch et celui des
fiches collaboratives ; il devient la base de la prochaine modification.

Le personnage partagé s'appelle désormais **Monde**. L'ancien **Camp** est accepté
à défaut pour préserver les campagnes existantes ; il peut être renommé Monde.
Si les deux personnages existent, Monde est choisi. Un joueur non contrôleur
voit le panneau en lecture seule. La clé de géométrie et l'adresse historique
`roll20-camp.html` restent compatibles, avec le contenu Monde. La nouvelle
adresse `roll20-monde.html` affiche exactement le même panneau.

## Avant publication et signature

Aucune publication ni signature n'a été effectuée. Les nouveaux paquets sous
`essai/` regroupent les changements 3.0.0b et 3.1.0b. Les binaires signés de
`docs/download/` restent ceux de la dernière signature. Continuer à appliquer les
prochains patchs avant de lancer une seule signature CI, comme demandé.
Le README décrit la procédure pour le jour de la publication.

## Vérification

- 19 scénarios de fiche et 12 scénarios de Monde passent.
- Deux panneaux Chromium : conversion de Camp, minuit, édition parallèle,
  conflit, reprise après écriture perdue, réouverture, saisie de 60 puis 61 minutes,
  accès en lecture seule et affichage compact.
- Le test navigateur des fiches passe après la mutualisation du moteur.
- Versions, assemblage, parité des deux parties de l'extension et build validés.

Les tests navigateur utilisent le vrai pont et les vrais composants avec un
serveur Roll20 simulé. L'installation signée dans la campagne réelle sera
vérifiée après publication.
