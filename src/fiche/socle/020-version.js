  // ---------- version ----------
  // RELEASE est ce qu'on montre, SCHEMA est ce qui compte, et les deux sont
  // INDÉPENDANTS : le schéma est un entier libre que rien ne déduit du majeur
  // de la release. Un mod qui ferait parseInt(Owd.version) pour en tirer le
  // schéma se tromperait à la première divergence.
  //
  // Le SCHÉMA ne monte QUE lorsqu'une donnée EXISTANTE change de forme ou de
  // sens. Ajouter une clé racine avec un défaut n'en est pas un : normalize()
  // la complète et ne purge aucune clé racine inconnue, donc une telle fiche
  // s'ouvre dans les deux sens sans migration.
  //
  // Le suffixe « b » marque la beta. Il ne change PAS le rang : « 1.0.0b » et
  // « 1.0.0 » sont de même version, la beta étant ce que le site public
  // recevra à la fusion. Les TROIS porteurs du numéro montent ensemble :
  // docs/owd-manifeste.json, RELEASE ici, RELEASE_DEFAUT de owd-attr-map.js.
  var RELEASE = "1.2.0b";
  var SCHEMA = 2;

  // Les modificateurs d'Outward se règlent de 1 en 1 : l'échelle des
  // caractéristiques est ouverte mais serrée (20 est la moyenne humaine), un
  // pas de 5 y serait un bond.
  var MOD_PAS = 1;

  // La borne d'un FACTEUR de la chaîne à neuf boîtes. Elle n'est pas celle d'un
  // ajout : ×1000 sur un maximum de points de repos dépasserait le million, et
  // un nombre qu'on ne peut plus lire n'est plus un réglage.
  var MULT_BORNE = 999;

  // LES HUIT CARACTÉRISTIQUES. Les CLÉS sont SANS ACCENT : elles voyagent en
  // nom d'attribut Roll20 et en fragment de macro (@{Perso|owd_resistance}),
  // deux endroits où un accent ne passe pas. Les libellés accentués vivent
  // dans LIBELLES_CARAC, jamais dans l'état.
  //
  // Cette liste est le SOCLE de blank(), et le miroir exact de celle de
  // owd-attr-map.js : c'est à ce titre qu'elle est écrite ici, et non pour
  // doubler les règles. L'ORDRE D'AFFICHAGE et les libellés, eux, viennent de
  // DATA.caracs dès que le jeu de données est là (voir caracsOrdre) ; une
  // caractéristique ajoutée demain dans les règles arrive donc sans qu'on
  // rouvre ce fichier, normalize() lui posant sa valeur de départ.
  var CARACS = ["Force", "Dexterite", "Intelligence", "Ferveur",
                "Vigueur", "Endurance", "Resistance", "Chance"];
  var LIBELLES_CARAC = {
    Force: "Force", Dexterite: "Dextérité", Intelligence: "Intelligence",
    Ferveur: "Ferveur", Vigueur: "Vigueur", Endurance: "Endurance",
    Resistance: "Résistance", Chance: "Chance"
  };
  var ABBR = {
    Force: "FOR", Dexterite: "DEX", Intelligence: "INT", Ferveur: "FER",
    Vigueur: "VIG", Endurance: "END", Resistance: "RES", Chance: "CHA"
  };

  // Trois emplacements de modificateur, fantômes au repos, révélés par le
  // survol de leur hôte : le geste de la fiche HxH. Un seul champ obligeait à
  // sommer de tête avant d'écrire, et à défaire le calcul pour retirer l'un
  // des trois.
  var MMOD_SLOTS = ["équipement", "technique", "autre"];

  // LE DÉ DES JETS. Tous les dés d'Outward sont des d8 : le champ reste
  // modifiable parce que c'est un réglage de table, pas une règle que la fiche
  // imposerait.
  var DE_DEFAUT = "1d8";

  // Le bloc des réglages de disposition, nommé une fois pour toutes : trois
  // endroits doivent l'épargner (activeModule, monteModules, blocEnPanne), et
  // un id recopié à la main finirait par manquer à l'un d'eux.
  var MODULE_REGLAGES = "modules";

