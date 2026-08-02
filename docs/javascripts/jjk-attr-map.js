/* Correspondance fiche JJK <-> Attributes Roll20 (natifs par valeur).
 *
 * Le créateur (jjk-creation.js, réutilisé tel quel) travaille sur un objet
 * `state` imbriqué. Roll20 stocke des Attributes plats {name, current, max}.
 * Ce module fait la traduction, DANS LES DEUX SENS et SANS PERTE :
 *   - stateToAttrs(state, card) : décompose l'état en attributs Roll20.
 *   - attrsToState(attrs)       : reconstruit l'état depuis les attributs.
 *
 * TOUS les attributs produits commencent par « jjk_ ». Trois familles :
 *   - SOURCE DE VÉRITÉ : `jjk_state` porte l'état ENTIER en JSON. C'est lui
 *     qu'on relit pour reconstruire la fiche : il ne dérive JAMAIS quand
 *     jjk-creation.js gagne un champ. attrsToState le préfère à tout le reste ;
 *     la reconstruction champ par champ n'est qu'un repli.
 *   - NATIFS (repli + macros) : un attribut par valeur/collection.
 *   - MIROIR (écrits seulement si `card` fourni) : valeurs DÉRIVÉES pour les
 *     macros et barres de jetons Roll20 — caractéristiques TOTALES
 *     (@{perso|jjk_body}), PV courant/max, vitesse. Non relus (recalculés
 *     par le créateur).
 *
 * Logique PURE, sans API navigateur : testable en node.
 *
 * Ce fichier vit sur le SITE (chargé par roll20-fiche.html avant
 * jjk-roll20-boot.js) : le format des Attributes évolue avec la fiche, sans
 * jamais re-signer l'extension Roll20, qui n'est qu'une coquille.
 */
(function (root) {
  "use strict";

  var PREFIX = "jjk_";

  // champ d'état scalaire -> [suffixe, type] (n = nombre, s = chaîne libre)
  var SCALARS = [
    ["name", "nom", "s"], ["espece", "espece", "s"], ["age", "age", "s"],
    ["sexe", "sexe", "s"], ["genre", "genre", "s"],
    ["portrait", "portrait", "s"], ["defaut", "defaut", "s"],
    ["background", "background", "s"], ["notes", "notes", "s"],
    ["inventaire", "inventaire", "s"], ["de", "de", "s"],
    ["xpTotal", "xp_total", "n"], ["narration", "narration", "n"],
    ["pvMaxOverride", "pv_max_force", "s"],
    ["vitesseOverride", "vitesse_force", "s"],
    ["regenOverride", "regen_force", "s"],
    ["langueBase", "langue_base", "s"],
    ["sansLimite", "sans_limite", "b"],
    ["v", "version", "n"]
  ];

  // champ d'état collection (objet/tableau) -> suffixe (stocké en JSON)
  var COLLECTIONS = [
    ["qualites", "qualites"], ["avantages", "avantages"],
    ["caracsBase", "caracs_base"], ["caracsXp", "caracs_xp"],
    ["caracsMod", "caracs_mod"],
    ["compsMod", "comps_mod"],
    ["comps", "competences"], ["customComps", "comp_perso"],
    ["langues", "langues"],
    ["armes", "armes"], ["armures", "armures"],
    ["inv", "inventaire_sys"],
    ["divers", "divers"]
  ];

  // état par défaut (miroir de blank() de jjk-creation.js ; sert de socle à la
  // reconstruction : un attribut absent laisse la valeur par défaut).
  function blank() {
    return {
      v: 1,
      name: "", portrait: "", espece: "", age: "", sexe: "", genre: "",
      defaut: "", qualites: ["", ""], background: "", notes: "",
      avantages: [], sansLimite: false,
      caracsBase: { Mind: 0, Body: 0, Prestance: 0 },
      caracsXp: { Mind: 0, Body: 0, Prestance: 0 },
      caracsMod: { Mind: 0, Body: 0, Prestance: 0 },
      compsMod: {},
      xpTotal: 500,
      comps: {}, customComps: [],
      pv: null, narration: 3,
      armes: [], armures: [], inventaire: "",
      inv: { texte: [], groupes: ["Sur soi"], objets: [] },
      divers: { pvMax: [0, 0, 0], regen: [0, 0, 0], vitesse: [0, 0, 0] },
      pvMaxOverride: null, vitesseOverride: null, regenOverride: null,
      langues: [], langueBase: "",
      de: "1d100"
    };
  }

  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function str(v) { return v == null ? "" : String(v); }

  // Copie de l'inventaire SANS les vignettes en data: pour l'attribut de repli
  // jjk_inventaire_sys : jjk_state (source de vérité) les porte déjà, les
  // dupliquer doublerait le poids des Attributes de la campagne. Le repli n'est
  // relu que pour des fiches partielles : il perd seulement les images fichier.
  function invSansVignettes(inv) {
    if (!inv || typeof inv !== "object" || !Array.isArray(inv.objets)) return inv;
    return {
      texte: inv.texte,
      groupes: inv.groupes,
      objets: inv.objets.map(function (o) {
        if (!o || typeof o !== "object" || String(o.img || "").indexOf("data:") !== 0) return o;
        var c = {};
        Object.keys(o).forEach(function (k) { c[k] = o[k]; });
        c.img = "";
        return c;
      })
    };
  }

  // { fullAttrName -> {current, max} }
  function stateToAttrs(state, card) {
    state = state || blank();
    var out = {};
    function put(suffix, current, max) {
      out[PREFIX + suffix] = { current: str(current), max: str(max == null ? "" : max) };
    }

    // ROUND-TRIP COMPLET : l'état entier en un attribut, source de vérité.
    put("state", JSON.stringify(state));

    SCALARS.forEach(function (d) {
      var v = state[d[0]];
      put(d[1], d[2] === "b" ? (v ? 1 : 0) : v);
    });
    COLLECTIONS.forEach(function (d) {
      var v = state[d[0]] == null ? blank()[d[0]] : state[d[0]];
      if (d[0] === "inv") v = invSansVignettes(v);
      put(d[1], JSON.stringify(v));
    });
    // PV courant nullable : conservé à l'exact (null = « au maximum »)
    put("etat_courant", JSON.stringify({ pv: state.pv == null ? null : state.pv }));

    // ---- miroir dérivé (macros / barres de jetons), seulement si la carte est fournie ----
    if (card) {
      var cc = card.caracs || {};
      put("mind", cc.Mind);
      put("body", cc.Body);
      put("prestance", cc.Prestance);
      var cb = card.combat || {};
      put("pv", cb.pv == null ? cb.pvMax : cb.pv, cb.pvMax);   // barre de jeton : PV courant / max
      put("vitesse", cb.vitesse);
      // utilisables dans les macros Roll20 : @{Perso|jjk_initiative}, etc.
      if (cb.initiative !== undefined) put("initiative", cb.initiative);
      if (cb.regen !== undefined) put("regen", cb.regen);
      if (cb.poids !== undefined) put("poids", cb.poids);
    }
    return out;
  }

  // attrs : { fullAttrName -> {current, max} } ou { fullAttrName -> current }.
  // Reconstruit l'état (round-trip). Les attributs miroir sont ignorés.
  function attrsToState(attrs) {
    attrs = attrs || {};
    function cur(suffix) {
      var a = attrs[PREFIX + suffix];
      if (a == null) return undefined;
      return (typeof a === "object" && a !== null) ? a.current : a;
    }
    // Priorité : l'état complet round-trip (jjk_state). Repli sur la
    // reconstruction champ par champ pour des fiches partielles
    // (jjk-creation.js re-normalise dans tous les cas).
    var full = cur("state");
    if (full !== undefined && full !== "") {
      try { var fs = JSON.parse(full); if (fs && typeof fs === "object") return fs; } catch (e) {}
    }
    var s = blank();

    SCALARS.forEach(function (d) {
      var v = cur(d[1]);
      if (v === undefined) return;
      if (d[2] === "n") { if (v !== "" && isFinite(parseFloat(v))) s[d[0]] = num(v); }
      else if (d[2] === "b") s[d[0]] = String(v) === "1" || String(v) === "true";
      else s[d[0]] = str(v);
    });
    COLLECTIONS.forEach(function (d) {
      var v = cur(d[1]);
      if (v === undefined || v === "") return;
      try { var o = JSON.parse(v); if (o != null) s[d[0]] = o; } catch (e) {}
    });
    var ec = cur("etat_courant");
    if (ec !== undefined && ec !== "") {
      try {
        var o = JSON.parse(ec);
        s.pv = (o && o.pv != null) ? o.pv : null;
      } catch (e) {}
    }
    return s;
  }

  function isJjkAttr(name) { return typeof name === "string" && name.indexOf(PREFIX) === 0; }
  // une fiche JJK existe si l'attribut de version est présent
  function hasSheet(names) {
    if (!names) return false;
    var list = Array.isArray(names) ? names : Object.keys(names);
    return list.indexOf(PREFIX + "version") >= 0;
  }

  var api = {
    PREFIX: PREFIX,
    stateToAttrs: stateToAttrs,
    attrsToState: attrsToState,
    isJjkAttr: isJjkAttr,
    hasSheet: hasSheet,
    blank: blank
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.JjkAttrMap = api;
})(typeof window !== "undefined" ? window : this);
