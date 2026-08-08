  // ---------- état ----------
  function blank() {
    return {
      v: SCHEMA, rel: RELEASE,
      name: "", portrait: "", espece: "", age: "", sexe: "", genre: "",
      defaut: "", qualites: ["", ""], background: "", notes: "",
      avantages: [], sansLimite: false,
      // Le PLAFOND des caractéristiques et le budget de POINTS DE CRÉATION se
      // règlent (bloc Création des Options), avec la même grammaire que les
      // autres leviers : une valeur forcée, ou un modificateur du barème.
      // Ils remplacent l'ancienne case « Sans limite », qui ne savait que
      // lever le plafond, et pour les trois caractéristiques à la fois.
      caracsPlafondMod: { Mind: 0, Body: 0, Prestance: 0 },
      caracsPlafondForce: {},
      ptsCreaMod: 0, ptsCreaForce: null,
      caracsBase: { Mind: 0, Body: 0, Prestance: 0 },
      caracsXp: { Mind: 0, Body: 0, Prestance: 0 },
      caracsMod: { Mind: 0, Body: 0, Prestance: 0 },
      // DEUX modificateurs par valeur, et non un seul : le premier pour
      // l'équipement, le second pour un art ou une décision du MJ. Un seul
      // champ obligeait à additionner de tête avant de saisir, et à défaire le
      // calcul pour retirer l'un des deux.
      caracsMod2: { Mind: 0, Body: 0, Prestance: 0 },
      // Les caractéristiques reçoivent les mêmes leviers que les compétences :
      // total forcé, et coût en xp forcé avec ses deux modificateurs.
      caracsForce: {}, caracsXpForce: {},
      caracsXpMod: { Mind: 0, Body: 0, Prestance: 0 },
      caracsXpMod2: { Mind: 0, Body: 0, Prestance: 0 },
      compsMod: {}, compsMod2: {}, compsXpMod2: {},
      xpTotal: XP_CREATION,
      comps: {}, customComps: [],
      // leviers du MJ, par compétence (clé « Carac/Nom ») : total forcé
      // (vide = calculé), coût en xp forcé (vide = calculé), et modificateur
      // de ce coût
      compsForce: {}, compsXpForce: {}, compsXpMod: {},
      pv: null, narration: 3,
      armes: [], armures: [], inventaire: "",
      // inventaire illustré : groupes, objets, et les réglages d'affichage du
      // module (le poids de JJK est un nombre SANS unité)
      inv: {
        texte: [], groupes: ["Sur soi"], objets: [],
        // Un drapeau « compté » par groupe, dans un tableau PARALLÈLE et non
        // dans le groupe lui-même : inv.groupes est un tableau de CHAÎNES que
        // sept endroits lisent tel quel (bandeau, renommage, menus du tiroir et
        // du dialogue Prendre, carte de tchat). Le passer en objets obligerait
        // à un pas de migration avec descente, et une archive qui relirait la
        // fiche écrirait « [object Object] » dans le tchat d'un joueur. Ici,
        // rien ne casse : normalize() ne purge pas les clés inconnues de `inv`,
        // donc une archive 3.0.0 fait voyager `comptes` intact sans savoir le
        // lire (elle compte simplement tout le poids, ce qui se voit à l'écran
        // et se répare en rouvrant la fiche).
        comptes: [true],
        // Les réglages d'affichage des TUILES : combien par ligne, et ce que
        // leur pied montre. « vign » ne commande plus rien : il servait à la
        // colonne de vignettes d'un inventaire en lignes, essayé puis retiré.
        // Il reste écrit dans les personnages déjà enregistrés, donc on le
        // garde pour ne pas le leur effacer, mais rien ne le lit.
        opts: { cols: 4, nom: true, qte: true, poids: false, total: true, vign: true }
      },
      divers: { pvMax: [0, 0, 0], regen: [0, 0, 0], vitesse: [0, 0, 0] },
      pvMaxOverride: null,
      vitesseOverride: null,
      regenOverride: null,
      // langues : des compétences de Mind à part entière (clé « Mind/<nom> »
      // dans comps), rassemblées dans leur module. langueBase = la langue du
      // personnage, acquise jusqu'à Expert sans rien coûter.
      langues: [], langueBase: "",
      // armes ajoutées par le joueur : des compétences de Body, rassemblées
      // dans le module Armes avec celles des règles (DATA.compsArmes)
      armesComps: [],
      // modules : le coffre privé de chaque module (id -> objet libre) et les
      // interrupteurs (id -> false pour les seuls modules coupés). Deux clés
      // RACINE avec un défaut : normalize() les complète, donc le schéma ne
      // monte pas et une fiche s'ouvre dans les deux sens.
      modData: {}, modActifs: {},
      // disposition des modules ({ ordre: [], place: {} }, éparse : seul ce que
      // le joueur a déplacé y figure) et mods du personnage (leur CODE voyage
      // avec lui). Deux clés racine de plus, mêmes raisons, même absence de
      // montée de schéma ; le blank() de jjk-attr-map.js les porte déjà, sans
      // quoi elles se perdraient sur le chemin de repli des Attributes Roll20.
      modules: {}, mods: [],
      de: DE_DEFAUT
    };
  }
