  // ---------- état ----------
  // LES CARACTÉRISTIQUES ET LES COMPÉTENCES SONT DES OBJETS VIDES, et c'est une
  // décision, pas un oubli. Leurs clés sont les sigles des règles (FOR, DEX…,
  // PHY, COM…), que seul DATA connaît — or blank() tourne AUSSI dans
  // mia-attr-map.js, du côté Roll20, où les données ne sont pas chargées. Une
  // liste écrite en dur y divergerait de la page de règles au premier sigle
  // ajouté, sans que rien ne le dise. Tout se lit donc par accesseur, et une
  // clé absente vaut zéro.
  function blank() {
    return {
      v: SCHEMA, rel: RELEASE,
      name: "", portrait: "", espece: "", age: "", sexe: "", genre: "",
      defaut: "", qualites: ["", ""], background: "", notes: "",
      avantages: [],

      // LE PRESTIGE, qui plafonne CHAQUE caractéristique. Il se force comme le
      // reste (bloc Création des Options) : une valeur imposée, ou un
      // modificateur du barème.
      prestige: 0, prestigeMod: 0, prestigeForce: null,

      // sigle -> points achetés. Les modificateurs sont DEUX (l'équipement,
      // puis l'arbitrage) : un seul champ obligeait à additionner de tête
      // avant de saisir, et à défaire le calcul pour en retirer un.
      // LE BONUS s'ajoute à la VALEUR, après le plafond du prestige : il peut
      // donc porter une caractéristique au-delà de ce que le prestige permet,
      // comme en dessous de zéro. Il se règle sur la FICHE, dans le module des
      // caractéristiques, et non plus dans les Options.
      // LES ARTS : techniques et passifs, une liste libre que le joueur remplit.
      // Clé RACINE, et c'est délibéré — normalize() complète l'état reçu sans
      // jamais reconstruire sa racine, donc une version qui ne connaît pas les
      // arts les garde intacts au lieu de les jeter.
      arts: [],
      // LES LANGUES : des spécialités « passives », qui n'ajoutent pas le MOD
      // de leur caractéristique. Liste à part et non un drapeau sur une
      // spécialité — elles ont leur module, et une entrée qui paraîtrait dans
      // les deux listes finirait par s'y contredire.
      langues: [],
      // LES LEVIERS DES RÉSERVES, une table à deux niveaux (levier, boîte). Les
      // PV et l'endurance n'ont chacun qu'UNE chose à régler — leur maximum —,
      // donc pas de troisième niveau : le nom du levier fait l'identité.
      reservesLeviers: {},
      caracs: {}, caracsBonus: {},

      // LES CINQ LEVIERS DU MENEUR, ET UNE SEULE CLÉ POUR LES CINQ. Ils ne
      // touchent ni la valeur achetée ni le bonus qu'elle porte sur la fiche :
      // ils règlent ce que la caractéristique DONNE (son modificateur, sa
      // limite, l'écart qu'elle impose aux spécialités), ce qui la BORNE (son
      // plafond) et ce qu'elle COÛTE.
      //
      // Chacun porte la même chaîne, par caractéristique :
      //   force            une valeur imposée, qui court-circuite tout
      //   a1 a2  m1 m2  a3 a4   sinon ((base + a1 + a2) × m1 × m2) + a3 + a4
      //
      // ÉPARSE À TOUS LES NIVEAUX, et c'est ce qui la rend tenable : un levier
      // auquel personne n'a touché ne pèse pas un octet. La table entière
      // voyage dans UN attribut Roll20 — huit clés plates par boîte en auraient
      // fait trente-cinq, à recopier à la main dans trois fichiers que rien ne
      // contrôle.
      //
      // « ecart » porte l'écart minimum d'une spécialité, et son « force » est
      // l'ancienne case : une VALEUR et non un décalage — on pense « l'écart
      // doit être de 30 », pas « je décale de −20 ».
      caracsLeviers: {},
      // LA RÈGLE DE L'ÉCART, SUSPENDUE. Les cinq leviers ci-dessus DÉCALENT ;
      // celui-ci SUSPEND, et pour tout le personnage : plus rien n'est retiré
      // à aucune spécialité. C'est pour la construction que la règle ordinaire
      // ne sait pas décrire.
      ecartCoupe: false,

      // sigle -> points investis (1 XP le point). Mêmes leviers.
      // LE BONUS d'une compétence, réglé sur la FICHE comme celui d'une
      // caractéristique. Il s'ajoute APRÈS le plafond : il peut donc porter la
      // compétence au-delà de ce que le MOD de sa caractéristique permet.
      comps: {}, compsBonus: {},
      // LA SURCHARGE, ET JAMAIS LA RÈGLE. Clé absente = ce que dit la page de
      // règles. Recopier la règle dans l'état figerait une compétence sur
      // l'ancienne liste le jour où la page change — et DATA n'existe pas du
      // côté Roll20, donc rien ne pourrait la relire pour comparer.
      //
      // Elles existent parce qu'un AVANTAGE change une fiche : un avantage n'est
      // que du texte, et rien d'autre que ces réglages ne peut faire entrer sa
      // conséquence chiffrée.
      compsCarac: {}, compsCaracsPlafond: {},
      // LES QUATRE LEVIERS D'UNE COMPÉTENCE, même forme que caracsLeviers :
      // levier, puis boîte, puis sigle. Ni « mod » ni « lim » : une compétence
      // apporte des POINTS, et son jet est coiffé par la limite de sa
      // caractéristique.
      compsLeviers: {},

      // LES SPÉCIALITÉS sont une LISTE et non une table : leur nom est libre,
      // le joueur les crée. Chacune dit de quelle caractéristique et de quelle
      // compétence elle relève, parce que ces deux-là commandent son plafond et
      // le jet qui la lance.
      // { nom, carac, comp, pts, bonus, leviers }
      //
      // SES LEVIERS VIVENT SUR ELLE, et non dans une table à part : une
      // spécialité n'a pour identité que son RANG dans la liste, et ce rang se
      // décale au premier ajout comme au premier glissement. Son nom ne vaut pas
      // mieux — il est libre, parfois vide, parfois en double.
      specialites: [],

      xpTotal: 0,

      pv: null, endurance: null,
      armes: [], armures: [], inventaire: "",
      // inventaire illustré : groupes, objets, et les réglages d'affichage du
      // module (le poids de MIA est un nombre SANS unité)
      inv: {
        texte: [], groupes: ["Sur soi"], objets: [],
        // Un drapeau « compté » par groupe, dans un tableau PARALLÈLE et non
        // dans le groupe lui-même : inv.groupes est un tableau de CHAÎNES que
        // sept endroits lisent tel quel (bandeau, renommage, menus du tiroir et
        // du dialogue Prendre, carte de tchat).
        comptes: [true],
        opts: { cols: 4, nom: true, qte: true, poids: false, total: true }
      },

      // Les valeurs dérivées que le MJ peut décaler (trois modificateurs
      // chacune) ou remplacer net.
      divers: {
        pvMax: [0, 0, 0], vitesse: [0, 0, 0],
        initiative: [0, 0, 0], charge: [0, 0, 0], recup: [0, 0, 0],
        sautLong: [0, 0, 0], sautHaut: [0, 0, 0]
      },
      // PAS DE « pvMaxOverride » NI DE « enduranceMaxOverride » : le forçage du
      // maximum des deux réserves est devenu la case « Forcé » de leur chaîne
      // (schémas 5 et 6). Les laisser ici les reposait à null après chaque
      // migration, et les clés mortes voyageaient.
      vitesseOverride: null,
      initiativeOverride: null, chargeOverride: null, recupOverride: null,
      sautLongOverride: null, sautHautOverride: null,

      // modules : le coffre privé de chaque module (id -> objet libre) et les
      // interrupteurs (id -> false pour les seuls modules coupés).
      modData: {}, modActifs: {},
      // disposition des modules ({ ordre: [], place: {} }, éparse : seul ce que
      // le joueur a déplacé y figure) et mods du personnage (leur CODE voyage
      // avec lui).
      modules: {}, mods: [],
      de: DE_TEST_DEFAUT
    };
  }
