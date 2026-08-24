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
      // et le plafond peut se relever caractéristique par caractéristique,
      // pour l'avantage ou l'arbitrage qui déborde la règle
      caracsPlafondMod: {}, caracsPlafondForce: {},

      // sigle -> points achetés. Les modificateurs sont DEUX (l'équipement,
      // puis l'arbitrage) : un seul champ obligeait à additionner de tête
      // avant de saisir, et à défaire le calcul pour en retirer un.
      caracs: {}, caracsMod: {}, caracsMod2: {},
      caracsForce: {}, caracsXpForce: {}, caracsXpMod: {}, caracsXpMod2: {},

      // sigle -> points investis (1 XP le point). Mêmes leviers.
      comps: {}, compsMod: {}, compsMod2: {},
      compsForce: {}, compsXpForce: {}, compsXpMod: {}, compsXpMod2: {},

      // LES SPÉCIALITÉS sont une LISTE et non une table : leur nom est libre,
      // le joueur les crée. Chacune dit de quelle caractéristique et de quelle
      // compétence elle relève, parce que ces deux-là commandent son plafond et
      // le jet qui la lance.
      // { nom, carac, comp, pts, mod, mod2, force, xpForce }
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
        pvMax: [0, 0, 0], endurance: [0, 0, 0], vitesse: [0, 0, 0],
        initiative: [0, 0, 0], charge: [0, 0, 0], recup: [0, 0, 0],
        sautLong: [0, 0, 0], sautHaut: [0, 0, 0]
      },
      pvMaxOverride: null, enduranceMaxOverride: null, vitesseOverride: null,
      initiativeOverride: null, chargeOverride: null, recupOverride: null,
      sautLongOverride: null, sautHautOverride: null,

      // modules : le coffre privé de chaque module (id -> objet libre) et les
      // interrupteurs (id -> false pour les seuls modules coupés).
      modData: {}, modActifs: {},
      // disposition des modules ({ ordre: [], place: {} }, éparse : seul ce que
      // le joueur a déplacé y figure) et mods du personnage (leur CODE voyage
      // avec lui).
      modules: {}, mods: [],
      de: DE_DEFAUT
    };
  }
