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
  // VESTIGE DU SCHÉMA 2 JETÉ : elle posait encore mod, mod2, force et xpForce,
  // que le pas 2 -> 3 a rangés dans spe.leviers et que la normalisation efface
  // aussitôt. Une spécialité neuve naissait donc avec quatre clés mortes.
  function blankSpe(nom, carac, comp) {
    return { nom: nom || "", carac: carac || "", comp: comp || "", pts: 0, bonus: 0 };
  }
  function allSpes() {
    return (state.specialites || []).map(function (s, i) {
      return {
        key: "spe/" + i, index: i, spe: s,
        name: s.nom || "Sans nom", carac: s.carac || "", comp: s.comp || ""
      };
    });
  }

  // ---------- les langues ----------
  // Même nature que les spécialités — une liste que le joueur peuple lui-même,
  // dont les règles ne disent pas lesquelles existent. Deux champs suffisent :
  // le niveau se DÉDUIT des points, il ne se range pas.
  function blankLangue(nom) {
    return { nom: nom || "", pts: 0 };
  }
  function allLangues() {
    return (state.langues || []).map(function (l, i) {
      return { key: "langue/" + i, index: i, langue: l, name: l.nom || "Sans nom" };
    });
  }

  // ---------- les arts : techniques et passifs ----------
  // MÊME NATURE QUE LES SPÉCIALITÉS — une liste que le joueur peuple lui-même,
  // dont les règles ne disent rien. D'où les mêmes trois pièces : une fabrique,
  // une enveloppe qui donne le RANG (seule identité d'une entrée sans clé), et
  // une normalisation champ par champ dans 060.
  //
  // LES CINQ CHAMPS D'UN EFFET SONT LES MÊMES PARTOUT : effet de base d'une
  // technique, effet de base d'un passif, amélioration de l'un ou de l'autre.
  // Une seule fabrique, donc, et aucune exception à retenir.
  function blankEffet() {
    return { nom: "", avantage: 0, xp: 0, desc: "", macro: "" };
  }
  function blankArt(type) {
    var a = {
      type: type === "passif" ? "passif" : "technique",
      nom: "",
      base: blankEffet(),
      ameliorations: []
    };
    // UN PASSIF NE PORTE PAS LA CLÉ. Il ne s'emploie pas, donc il ne coûte rien
    // à l'emploi ; poser un zéro ferait voyager jusqu'aux Attributs Roll20 un
    // nombre dont personne ne saurait dire s'il compte.
    if (a.type !== "passif") a.endurance = 0;
    return a;
  }
  function allArts() {
    return (state.arts || []).map(function (a, i) {
      return {
        key: "art/" + i, index: i, art: a,
        name: a.nom || "Sans nom", type: a.type === "passif" ? "passif" : "technique"
      };
    });
  }
  // « Vide » veut dire : rien de RÉDIGÉ. Les coûts ne comptent pas — on efface
  // sans confirmation une carte qu'on vient d'ouvrir par erreur, jamais un texte
  // que quelqu'un a écrit.
  function effetVide(e) {
    if (!e) return true;
    return !String(e.nom || "").trim() && !String(e.desc || "").trim() &&
           !String(e.macro || "").trim();
  }
  function artVide(a) {
    if (!a) return true;
    if (String(a.nom || "").trim()) return false;
    if (!effetVide(a.base)) return false;
    var l = a.ameliorations || [], i;
    for (i = 0; i < l.length; i++) if (!effetVide(l[i])) return false;
    return true;
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
