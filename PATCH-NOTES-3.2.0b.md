# Patch OWD 3.2.0b — depuis 3.1.0b

## Installation

Décompresser le patch à la racine du projet 3.1.0b en remplaçant les fichiers,
ou utiliser directement le projet complet 3.2.0b. `PATCH-MANIFEST.json` dans le
ZIP du patch énumère les empreintes de base et de destination et les suppressions.
La nouvelle base pour les prochains patchs est `fns-owd-beta-3.2.0b.zip`.

## Changements

- Section native OUTWARD avec Monde (planète) et Inventaire (sac), d'après
  les principes de la barre VTTK ; son répertoire outils n'est pas nécessaire.
- Monde conserve strictement horloge et température, sa conversion Camp et
  le moteur collaboratif des fiches.
- Fenêtres de taille indépendante de la barre MJ, redimensionnables sur les
  deux axes et déplaçables, avec géométrie mémorisée.
- Inventaire détaché par personnage contrôlé (MJ : tous), uniquement le module
  natif, le même état et le même moteur de synchronisation que la fiche.
- Changement de personnage sans abandonner les confirmations en attente,
  choix mémorisé par campagne ; droits revérifiés ; aucune création de fiche.
- Dépôt natif d'un objet dans le chat : carte Montrer, quantité conservée ;
  déplacement interne conservé. Fonctionne aussi depuis la fiche complète.
- Mise à jour du thème sans remplacer les fenêtres actives.
- Release 3.2.0b, schéma inchangé 11, ressources au cache 98.

## Validation

19 scénarios de synchronisation et 12 scénarios Monde ; contrôles de versions,
assemblage et parité stable/beta ; construction MkDocs. Harnais Chromium avec
scripts réels et serveur simulé : anciennes fiches et Monde, deux inventaires
simultanés, lien avec la fiche, droits, fenêtres, sélection et dépôt natif chat.
Une validation dans une véritable partie Roll20 reste nécessaire avant la
publication ; aucun compte Roll20 n'a été utilisé dans ces essais.

## Signature

Aucune publication, aucun appel de signature. `essai/` contient les deux paquets
non signés incluant 3.0, 3.1 et 3.2. Les anciens téléchargements signés restent
intacts. La version des manifests d'extension est laissée au script de signature.
