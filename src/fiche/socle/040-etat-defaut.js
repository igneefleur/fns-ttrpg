  // ---------- état ----------
  // L'état VIERGE, et la SEULE table qui fasse autorité sur les clés racine.
  // Trois règles tiennent ce bloc, et chacune a déjà coûté quelque chose :
  //   - toute clé ajoutée ici doit arriver dans SCALARS ou COLLECTIONS de
  //     owd-attr-map.js, sinon le chemin de repli (une fiche relue sans
  //     owd_state) la perd EN SILENCE ;
  //   - ajouter une clé racine avec un défaut ne fait PAS monter le SCHEMA :
  //     normalize() complète une clé absente et ne purge aucune clé racine
  //     inconnue, donc une telle fiche s'ouvre dans les deux sens sans migration ;
  //   - les cartes ÉPARSES ({} au départ) ne se matérialisent que le jour où le
  //     joueur y range quelque chose : une carte pleine de zéros voyagerait
  //     jusque dans les Attributes Roll20 sans rien dire de plus qu'un vide.
  function blank() {
    return {
      // v porte le SCHÉMA, rel la release lisible. Les deux voyagent : une
      // fiche relue sans eux repartirait en schéma 1, c'est-à-dire qu'elle se
      // ferait re-migrer indéfiniment.
      v: SCHEMA, rel: RELEASE,

      // ---- identité ----
      name: "", portrait: "", espece: "", age: "", sexe: "", genre: "",
      background: "", notes: "",

      // ---- expérience ----
      // Les règles ne donnent AUCUNE dotation de départ : le total part à zéro
      // et se saisit dans l'en-tête. Le dépensé, lui, se CALCULE (rangs des
      // compétences + coût saisi des techniques + points de caractéristique
      // achetés) et ne se range jamais ici :
      // deux endroits pour dire la même chose finiraient par se contredire.
      xpTotal: 0,

      // ---- caractéristiques ----
      // Les CLÉS sont SANS ACCENT : elles voyagent en nom d'attribut Roll20 et
      // en fragment de macro (@{Perso|owd_resistance}). Les libellés accentués
      // vivent dans LIBELLES_CARAC, jamais dans l'état.
      // 20 est la moyenne humaine ; l'échelle n'a pas de plafond et la fiche
      // n'en invente pas — aucune borne haute n'est écrite ici.
      caracs: { Force: 20, Dexterite: 20, Intelligence: 20, Ferveur: 20,
                Vigueur: 20, Endurance: 20, Resistance: 20, Chance: 20 },
      // LES POINTS ACHETÉS À L'EXPÉRIENCE, par caractéristique, à part de la
      // répartition de création que porte `caracs`. Deux cartes et non une
      // valeur : le prix d'un point dépend de la valeur qu'il fait atteindre,
      // et la création se contrôle contre son propre budget. Le coût en XP se
      // CALCULE (owd-creation.json, progressionCarac) et ne se range jamais.
      // ÉPARSE : une caractéristique à 0 point acheté n'y figure pas.
      caracsXp: {},
      // LES LEVIERS DU MENEUR, en TABLE À TROIS NIVEAUX : levier, puis boîte,
      // puis caractéristique. Un seul levier ici, « total », et ses neuf boîtes :
      //     forçage  |  a1 a2  ×  m1 m2  |  a3 a4  ×  m3 m4
      // soit  (((base + a1 + a2) × m1 × m2) + a3 + a4) × m3 × m4,
      // et le forçage court-circuite tout.
      //
      // QUATRE GROUPES ET NON TROIS : trois ne savent pas dire « ajoute 20 puis
      // double le tout ». L'ordre DANS un groupe, lui, est sans effet.
      //
      // ÉPARSE À SES TROIS NIVEAUX : rien ne se matérialise à la lecture, et le
      // chemin se DÉFAIT quand sa dernière valeur s'en va. Sans quoi ouvrir les
      // Options écrirait toutes les sous-tables dans un personnage qui voyage
      // dans UN attribut Roll20.
      caracsLeviers: {},

      // ---- l'effort et l'air ----
      // L'effort que le personnage fournit (clé d'un effort des règles :
      // sommeil, repos, leger, intermediaire, lourd) et la température de
      // l'air en °C. Le module Temps s'en sert pour faire
      // passer le temps ; rien d'autre ne les lit.
      effort: "leger", temperature: 20,

      // ---- l'effondrement ----
      // Les niveaux d'effondrement que le JOUEUR ajoute à ceux des réserves
      // (ligne « Autre » du module) : ce que la fiche ne sait pas compter.
      effAutre: 0,

      // ---- les dés d'action ----
      // La taille de chaque dé d'action, dans l'ordre du module Actions : 4, 6,
      // 8, 10 ou 12. Vide au départ — un dé sans taille posée prend celle des
      // règles (le d8).
      desTailles: [],

      // ---- ce que le personnage porte à l'instant ----
      // null = « au maximum » : la valeur SUIT le maximum quand il bouge, ce
      // qu'un nombre figé ne ferait pas — et le maximum de PV et de PE bouge
      // tout seul, à chaque niveau d'effondrement.
      // expo et contenance partent de 0, qui est une VRAIE valeur (exposition
      // nulle, ventre vide) et non un repli : elles ne sont donc pas nullables.
      // Un courant supérieur à son maximum est signalé mais JAMAIS réécrit :
      // l'écraser perdrait la valeur le jour où le maximum remonte.
      etat: { pv: null, pe: null, pm: null, pi: null,
              pr: null, ps: null, ph: null, pc: null,
              expo: 0, contenance: 0, rupture: null },

      // LES LEVIERS DES CAPACITÉS, même table à trois niveaux : levier, boîte,
      // puis clé de capacité. Un seul levier, « max », qui porte le MAXIMUM de
      // chacune. Une SEULE table pour les quinze capacités plutôt que quinze
      // champs : une capacité de plus n'ajoute alors ni clé racine, ni attribut
      // Roll20, ni ligne de carte d'attributs.
      // Clés connues : pv pe pm pi pr ps ph pc charge acces contenance expo
      // rupture desAction effondrement.
      capsLeviers: {},

      // ---- compétences ----
      // LES RÈGLES NE DONNENT AUCUNE LISTE DE COMPÉTENCES : le joueur les nomme
      // toutes. D'où un TABLEAU d'entrées à `id` STABLE, et non une carte
      // indexée par le nom — renommer une compétence perdrait sinon son rang et
      // ses modificateurs du même geste, sans un mot.
      // Une entrée : { id, nom, groupe, rang }.
      //   id     « c » + horodatage en base 36, posé à la création, jamais réécrit
      //   groupe texte LIBRE qui titre les rangées ; vide = « Sans groupe ».
      //          Ce n'est pas une règle : c'est le rangement du joueur.
      //   rang   entier 0 à 5 (non initié, initié, apprenti, maître, expert,
      //          Rang Max). Les dés, le bonus et le prix viennent de
      //          owd-creation.json, jamais d'une table écrite ici.
      // L'ordre du tableau EST l'ordre d'affichage dans son groupe.
      comps: [],
      // LES LEVIERS DES COMPÉTENCES, même table à trois niveaux, indexée par
      // l'ID de la compétence et jamais par son nom — un nom se renomme, un
      // levier ne doit pas se perdre avec. CINQ leviers :
      //   bonus    ce que la compétence ajoute au jet
      //   des      combien de dés d'action elle laisse engager
      //   xp       ce que ses rangs ont coûté
      //   rupture  ce que ses rangs ont engagé
      //   offerts  combien de ses premiers rangs ont été reçus sans XP
      compsLeviers: {},

      // ---- techniques ----
      // Les rangs d'une technique LUI APPARTIENNENT : les règles le disent, la
      // fiche ne les barème donc pas et se contente de les compter.
      // Une entrée : { id, nom, rang, rangs, xp, offert, rupture, desc }.
      //   rangs   combien de rangs cette technique-là possède
      //   offert  combien de ses PREMIERS rangs ont été reçus sans XP : ils
      //           n'entrent pas dans la limite des rangs de technique
      //   xp      ce que le joueur a payé pour elle, saisi (aucune règle ne le fixe)
      //   rupture combien de points de rupture elle a demandés
      techniques: [],

      // ---- avantages ----
      // Une entrée : { nom, cout, desc }. Le coût, en points d'avantage, se
      // compte contre ceux que le livre donne à la création.
      avantages: [],

      // ---- équipement ----
      // Une arme est un RÉPERTOIRE, pas une attaque : sa ligne (prise, parade,
      // réduction, compétence qui porte le jet) et ses gestes.
      // Une entrée : { id, nom, prise, parade, reduction, comp, note,
      //   gestes: [{ id, nom, seuil, portee, degats, type, degatsDemi, typeDemi }] }.
      // `comp` est l'ID d'une entrée de `comps` — jamais son nom, qui se renomme.
      armes: [],
      // Ce que le personnage porte contre le froid et le chaud, compté en
      // degrés, et ce qu'il pèse. Une entrée :
      // { id, nom, froid, chaud, poids, porte, note }.
      vetements: [],
      argent: 0,             // pièces d'argent : la monnaie du livre, nommée

      // Inventaire : TROIS GROUPES FIXES (schéma 3). Chaque objet a un
      // emplacement « ou » : une des huit cases de Sur soi (INV_CASES), les
      // poches ou le sac. Un objet : { id, nom, img, qte, poids, places, achat,
      //   vente, desc, ou, rapide, vet, poches, froid, chaud, sac, cap, arme,
      //   encombre }.
      //   encombre  l'encombrance de l'objet, en eb : c'est elle, et non le poids,
      //             que limitent les poches et le sac
      //   nourri    c'est de la nourriture ; « places » porte alors son VOLUME
      //   vet     type de vêtement (INV_VETEMENTS, ou hautbas) ou ""
      //   acc     type d'accessoire (INV_ACC_TYPES : bague, poignet…, sans côté) ou ""
      //   poches  ce qu'un vêtement ou un accessoire porté ajoute aux Poches, en eb
      //   froid / chaud  sa protection, comptée s'il est porté dans sa case
      //   sac / cap      c'est un sac à dos, et ce qu'il peut contenir en eb
      //   ceint   c'est une ceinture
      //   ep / ebMax     les emplacements d'une ceinture ou d'un sac, et
      //                  l'encombrance au plus de chacun
      //   emp     le rang de l'emplacement tenu (ou « ceint » ou « sacep »), -1 sinon
      //   arme    null, ou { prise, parade, reduction, comp, gestes }
      //   rapide  l'objet se saisit rapidement (compte contre les accès rapides)
      //   id      c'est LUI qui reconnaît le même objet d'une fiche à l'autre
      inv: {
        objets: [],
        opts: { cols: 5, nom: true, qte: true, poids: false, total: true, vign: true }
      },

      // ---- le dé des jets ----
      // Tous les dés du jeu sont des d8. Le champ reste modifiable : c'est un
      // réglage de table, pas une règle que la fiche imposerait.
      de: DE_DEFAUT,

      // ---- le dispositif de modules et de mods : QUATRE clés racine ----
      // modules   le RANGEMENT SEUL : { ordre: [ids], place: { id: {onglet, colonne} } },
      //           épars, et VIDE tant que le joueur n'a rien rangé. Aucune clé
      //           « off » n'y existe ni n'y existera.
      // modData   les coffres privés des modules et des mods, contenu NON interprété.
      // modActifs le SEUL interrupteur : { id: false } pour les seuls modules COUPÉS.
      // mods      les mods du personnage, [{ id, nom, actif, pour, apiMin, src }].
      // Une clé racine du bundle absente de la carte d'attributs serait une
      // perte sèche au repli : les quatre sont aussi dans blank() d'owd-attr-map.js.
      modules: {}, modData: {}, modActifs: {}, mods: []
    };
  }

  // Migration de schéma, AVANT toute normalisation : normalize() complète et
  // nettoie selon la forme d'AUJOURD'HUI, il faut donc d'abord amener l'état
  // jusqu'ici. Le moteur est facultatif de naissance (le repli gelé de
  // roll20-fiche.html ne le nomme pas) : d'où le garde, qui restera pour
  // toujours. Une fiche VENUE DU FUTUR (v > SCHEMA) n'est pas rabaissée en
  // douce : on la laisse telle quelle et l'amorce s'en occupe (écran de
  // version). Écrire dessus avec un code qui ne la comprend pas serait le seul
  // vrai moyen de la perdre.
