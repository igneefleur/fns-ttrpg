# 4.7.0b — Équipement et Journal

- Options → Modules : Équipement possède une seule colonne, Milieu. Les placements hérités Gauche, Droite et Pleine largeur sont reconnus sans migration des fiches.
- Options : nouveau module Journal, placé sous Modules par défaut. Recherche dans tout l’historique, 50 événements par page, détails des changements et valeurs avant/après, statut des sauvegardes en attente et conflits.
- Le Journal Roll20 utilise les opérations de synchronisation existantes : aucun attribut supplémentaire par événement, aucune suppression d’historique pour paginer.
- Les nouvelles opérations de fiche et des panneaux enregistrent la date et le nom du joueur connecté. Les anciens auteurs absents ne peuvent pas être reconstitués. Les changements observés sur les tokens restent marqués « joueur non identifié » ; la date reste indiquée comme non enregistrée lorsqu’elle est absente de l’opération.
- L’identité du joueur nécessite le pont mis à jour dans les sources de l’extension, inclus dans ce patch. Les binaires signés ne sont pas remplacés ici : leur publication suit la CI habituelle de l’extension.
- Le schéma de fiche reste 18. Aucun nouvel écran de migration n’est nécessaire pour cette version.

Le patch s’applique à la racine du projet 4.6.4b. Il contient uniquement les sources modifiées. L’archive complète contient également les images locales et le site généré.

Validation : protocole de release, contrôles de l’extension, tests des auteurs et dates, synchronisation simultanée, labels après suppression, normalisation des anciens placements ; navigateur avec fiche et vrai panneau Notes imbriqué, recherche/pagination de 123 événements et rechargement. Les scénarios de création, migration et récupération après corruption sont également testés sur le serveur Roll20 simulé.
