  // ---------- la liste des compétences ----------
  // Les huit compétences des règles, dans leur ordre de page. Chaque entrée
  // porte de quoi l'afficher ET la lancer : son sigle, son nom, la
  // caractéristique qui la lance par défaut, et celles qui commandent son
  // plafond de points.
  function allComps() {
    return compsRegles().map(function (c) {
      return {
        key: c.code, name: c.nom, code: c.code,
        carac: compCarac(c.code), caracsPlafond: c.mod || []
      };
    });
  }

  // ---------- la liste des spécialités ----------
  // Elles sont la seule partie de la fiche que le joueur peuple lui-même : les
  // règles disent ce qu'est une spécialité et ce qu'elle coûte, pas lesquelles
  // existent. On rend donc l'état tel quel, en complétant les champs absents.
  function blankSpe(nom, carac, comp) {
    return {
      nom: nom || "", carac: carac || "", comp: comp || "",
      pts: 0, mod: 0, mod2: 0, bonus: 0, force: null, xpForce: null
    };
  }
  function allSpes() {
    return (state.specialites || []).map(function (s, i) {
      return {
        key: "spe/" + i, index: i, spe: s,
        name: s.nom || "Sans nom", carac: s.carac || "", comp: s.comp || ""
      };
    });
  }

  // La « carte » : le résumé calculé de la fiche, pour la bibliothèque, le popup
  // de l'extension et les attributs miroir Roll20 (barres de jetons, macros).
  //
  // SA FORME EST LUE HORS DE CE FICHIER — par la bibliothèque, par le popup et
  // par les attributs de repli de mia-attr-map.js. Une clé qui change de nom ici
  // doit changer là-bas dans le même geste, sans quoi la barre d'un jeton
  // affiche l'ancienne valeur jusqu'à ce que quelqu'un s'en aperçoive.
  function computeCard() {
    var caracs = {};
    champs().forEach(function (c) { caracs[c] = caracTotal(c); });
    var comps = {};
    champsComp().forEach(function (c) { comps[c] = compPts(c); });
    return {
      name: state.name || "Sans nom",
      prestige: prestige(),
      caracs: caracs,
      comps: comps,
      combat: {
        pv: state.pv === null ? null : pvCourant(), pvMax: pvMax(),
        endurance: state.endurance === null ? null : enduranceCourante(),
        enduranceMax: enduranceMax(),
        initiative: initiative(), vitesse: vitesse(),
        poids: poidsPorte(), charge: chargeMax(), recup: recupJour()
      }
    };
  }
