/* Correspondance fiche JJK <-> Attributes Roll20 (natifs par valeur).
 *
 * Le créateur (jjk-fiche.js, réutilisé tel quel) travaille sur un objet
 * `state` imbriqué. Roll20 stocke des Attributes plats {name, current, max}.
 * Ce module fait la traduction, DANS LES DEUX SENS et SANS PERTE :
 *   - stateToAttrs(state, card) : décompose l'état en attributs Roll20.
 *   - attrsToState(attrs)       : reconstruit l'état depuis les attributs,
 *                                 EN DISANT dans quel état il l'a trouvé.
 *   - ficheDe(attrs)            : la version de la fiche, sans reconstruire.
 *
 * TOUS les attributs produits commencent par « jjk_ ». Trois familles :
 *   - SOURCE DE VÉRITÉ : `jjk_state` porte l'état ENTIER en JSON. C'est lui
 *     qu'on relit pour reconstruire la fiche : il ne dérive JAMAIS quand
 *     jjk-fiche.js gagne un champ. attrsToState le préfère à tout le reste ;
 *     la reconstruction champ par champ n'est qu'un repli.
 *   - NATIFS (repli + macros) : un attribut par valeur/collection.
 *   - MIROIR (écrits seulement si `card` fourni) : valeurs DÉRIVÉES pour les
 *     macros et barres de jetons Roll20 — caractéristiques TOTALES
 *     (@{perso|jjk_body}), PV courant/max, vitesse. Non relus (recalculés
 *     par le créateur).
 *
 * LE PIÈGE QUE CE MODULE DOIT ÉVITER (3.0.0). Jusqu'ici, un jjk_state
 * impossible à lire (il suffit qu'un joueur tape un caractère dans l'onglet
 * Attributes de Roll20) faisait tomber SANS UN MOT sur la reconstruction champ
 * par champ. La fiche montait quand même, puis la première sauvegarde
 * réécrivait un jjk_state AMPUTÉ de tout ce que le repli ne sait pas porter.
 * D'où le diagnostic `degrade` : l'appelant peut GELER la fiche au lieu
 * d'écraser des données qu'il n'a pas su lire.
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

  // Numéro de version LISIBLE de la fiche, publié dans le `max` de
  // jjk_version. Le manifeste en est la source unique quand il est là ; la
  // constante n'est qu'un repli (node, et l'amorceur de secours qui charge
  // sans manifeste).
  var RELEASE_DEFAUT = "3.0.0";
  // majeur(RELEASE) === SCHEMA : scripts/verif_versions.py tient l'invariant
  var SCHEMA_DEFAUT = 3;
  function release() {
    var m = root && root.__jjkManifeste;
    return (m && typeof m.release === "string" && m.release) ? m.release : RELEASE_DEFAUT;
  }

  // champ d'état scalaire -> [suffixe, type]
  //   n = nombre, s = chaîne libre, b = booléen,
  //   N = nombre NULLABLE : "" vaut null et non 0 (les « forcé » du MJ, où
  //       vide veut dire « valeur calculée » — les confondre avec 0 clouerait
  //       les PV max à zéro sur le chemin de repli).
  var SCALARS = [
    ["name", "nom", "s"], ["espece", "espece", "s"], ["age", "age", "s"],
    ["sexe", "sexe", "s"], ["genre", "genre", "s"],
    ["portrait", "portrait", "s"], ["defaut", "defaut", "s"],
    ["background", "background", "s"], ["notes", "notes", "s"],
    ["inventaire", "inventaire", "s"], ["de", "de", "s"],
    ["xpTotal", "xp_total", "n"], ["narration", "narration", "n"],
    ["pvMaxOverride", "pv_max_force", "N"],
    ["vitesseOverride", "vitesse_force", "N"],
    ["regenOverride", "regen_force", "N"],
    ["langueBase", "langue_base", "s"],
    ["sansLimite", "sans_limite", "b"],
    ["v", "version", "n"], ["rel", "release", "s"]
  ];

  // champ d'état collection (objet/tableau) -> suffixe (stocké en JSON)
  var COLLECTIONS = [
    ["qualites", "qualites"], ["avantages", "avantages"],
    ["caracsBase", "caracs_base"], ["caracsXp", "caracs_xp"],
    ["caracsMod", "caracs_mod"],
    ["compsMod", "comps_mod"],
    ["compsForce", "comps_force"], ["compsXpForce", "comps_xp_force"],
    ["compsXpMod", "comps_xp_mod"],
    ["comps", "competences"], ["customComps", "comp_perso"],
    ["langues", "langues"], ["armesComps", "armes_comps"],
    ["armes", "armes"], ["armures", "armures"],
    ["inv", "inventaire_sys"],
    ["divers", "divers"]
  ];

  // Collections qui n'existent PAS encore dans blank() du bundle : elles ne
  // sont écrites que si l'état en porte, et relues que si l'attribut est là.
  // Sans ça, blank() cesserait d'être le miroir exact du bundle et la
  // reconstruction inventerait un champ que la fiche ne connaît pas.
  // grenier et vHist viennent du moteur de migration (jjk-migrations.js) : ils
  // vivent à la RACINE de l'état, hors de blank(), et n'apparaissent que le
  // jour où un pas de migration s'en sert. Ils comptent doublement ici : le
  // grenier porte ce qu'une version d'arrivée ne sait pas encore afficher mais
  // doit rendre en redescendant, et le laisser hors du repli le perdrait
  // précisément le jour où la fiche redescend de version.
  var COLLECTIONS_OPT = [
    ["mods", "mods"],
    ["grenier", "grenier"],
    ["vHist", "v_hist"]
  ];

  // état par défaut : MIROIR EXACT de blank() de jjk-fiche.js (mêmes clés,
  // mêmes valeurs). Il sert de socle à la reconstruction champ par champ : un
  // attribut absent laisse la valeur par défaut. Toute clé ajoutée là-bas doit
  // arriver ici ET dans SCALARS ou COLLECTIONS, sinon le repli la perd.
  function blank() {
    return {
      // miroir EXACT de blank() du bundle (docs/javascripts/jjk-fiche.js) :
      // v porte le SCHÉMA, rel la release lisible. Le chemin de repli les
      // perdrait sans ça, et une fiche relue sans jjk_state repartirait en
      // schéma 1 — c'est-à-dire qu'elle se ferait re-migrer indéfiniment.
      v: SCHEMA_DEFAUT, rel: RELEASE_DEFAUT,
      name: "", portrait: "", espece: "", age: "", sexe: "", genre: "",
      defaut: "", qualites: ["", ""], background: "", notes: "",
      avantages: [], sansLimite: false,
      caracsBase: { Mind: 0, Body: 0, Prestance: 0 },
      caracsXp: { Mind: 0, Body: 0, Prestance: 0 },
      caracsMod: { Mind: 0, Body: 0, Prestance: 0 },
      compsMod: {},
      xpTotal: 500,
      comps: {}, customComps: [],
      compsForce: {}, compsXpForce: {}, compsXpMod: {},
      pv: null, narration: 3,
      armes: [], armures: [], inventaire: "",
      inv: {
        texte: [], groupes: ["Sur soi"], objets: [],
        opts: { cols: 4, nom: true, qte: true, poids: false, total: true }
      },
      divers: { pvMax: [0, 0, 0], regen: [0, 0, 0], vitesse: [0, 0, 0] },
      pvMaxOverride: null,
      vitesseOverride: null,
      regenOverride: null,
      langues: [], langueBase: "",
      armesComps: [],
      de: "1d100"
    };
  }

  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function str(v) { return v == null ? "" : String(v); }

  // Copie de l'inventaire SANS les vignettes en data: pour l'attribut de repli
  // jjk_inventaire_sys : jjk_state (source de vérité) les porte déjà, les
  // dupliquer doublerait le poids des Attributes de la campagne. Le repli n'est
  // relu que pour des fiches partielles : il perd seulement les images fichier.
  // Les autres clés de `inv` (dont opts, les réglages d'affichage) sont
  // recopiées TELLES QUELLES : les énumérer ici les aurait perdues en silence
  // à chaque champ nouveau.
  function invSansVignettes(inv) {
    if (!inv || typeof inv !== "object" || !Array.isArray(inv.objets)) return inv;
    var c = {};
    Object.keys(inv).forEach(function (k) { c[k] = inv[k]; });
    c.objets = inv.objets.map(function (o) {
      if (!o || typeof o !== "object" || String(o.img || "").indexOf("data:") !== 0) return o;
      var oc = {};
      Object.keys(o).forEach(function (k) { oc[k] = o[k]; });
      oc.img = "";
      return oc;
    });
    return c;
  }

  // Même principe pour les mods : leur code source pèse, et jjk_state le porte
  // déjà. L'attribut de repli garde de quoi DIRE quels mods tournaient (nom,
  // version, réglages) sans dupliquer une ligne de code.
  function modsSansCode(mods) {
    if (!Array.isArray(mods)) return [];
    return mods.map(function (m) {
      if (!m || typeof m !== "object") return m;
      var c = {};
      Object.keys(m).forEach(function (k) { c[k] = m[k]; });
      // la clé reste, vidée : sa présence dit « ce mod avait du code »
      if (typeof c.code === "string" && c.code) c.code = "";
      return c;
    });
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
    // jjk_version, réécrit APRÈS la boucle : son `current` reste le SCHÉMA
    // (un entier, pour que hasSheet et les macros gardent un nombre), son
    // `max` porte la version lisible. Personne ne lit ce max ; il voyage avec
    // le diff et raconte à qui ouvre les Attributes quelle fiche a écrit là.
    put("version", state.v, release());
    COLLECTIONS.forEach(function (d) {
      var v = state[d[0]] == null ? blank()[d[0]] : state[d[0]];
      if (d[0] === "inv") v = invSansVignettes(v);
      put(d[1], JSON.stringify(v));
    });
    COLLECTIONS_OPT.forEach(function (d) {
      if (state[d[0]] === undefined) return;
      var v = state[d[0]];
      if (d[0] === "mods") v = modsSansCode(v);
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

  // lecteurs d'attribut : les appelants passent soit {current, max}, soit la
  // seule valeur courante (le pont d20 a connu les deux formes)
  function lecteur(attrs) {
    return function (suffix, champ) {
      var a = attrs[PREFIX + suffix];
      if (a == null) return undefined;
      if (typeof a === "object") return a[champ || "current"];
      return (champ === "max") ? undefined : a;
    };
  }

  // Reconstruction champ par champ : le REPLI. Elle ne connaît que SCALARS,
  // COLLECTIONS et COLLECTIONS_OPT — tout champ d'état qui n'y figure pas est
  // perdu. C'est pour ça qu'elle ne doit jamais servir en douce.
  function reconstruire(cur) {
    var s = blank();
    SCALARS.forEach(function (d) {
      var v = cur(d[1]);
      if (v === undefined) return;
      if (d[2] === "n") { if (v !== "" && isFinite(parseFloat(v))) s[d[0]] = num(v); }
      else if (d[2] === "N") s[d[0]] = (v === "" || v == null || !isFinite(parseFloat(v))) ? null : num(v);
      else if (d[2] === "b") s[d[0]] = String(v) === "1" || String(v) === "true";
      else s[d[0]] = str(v);
    });
    COLLECTIONS.forEach(function (d) {
      var v = cur(d[1]);
      if (v === undefined || v === "") return;
      try { var o = JSON.parse(v); if (o != null) s[d[0]] = o; } catch (e) {}
    });
    COLLECTIONS_OPT.forEach(function (d) {
      var v = cur(d[1]);
      if (v === undefined || v === "") return;
      try { var o = JSON.parse(v); if (o != null) s[d[0]] = o; } catch (e) {}
    });
    var ec = cur("etat_courant");
    if (ec !== undefined && ec !== "") {
      try {
        var o2 = JSON.parse(ec);
        s.pv = (o2 && o2.pv != null) ? o2.pv : null;
      } catch (e) {}
    }
    return s;
  }

  // Accroche le diagnostic à l'état SANS le rendre visible.
  //
  // Compatibilité : les appelants d'avant 3.0.0 écrivent
  // `var state = M.attrsToState(attrs)` puis JSON.stringify(state). Rendre un
  // objet enveloppe {state, …} leur ferait persister l'enveloppe. On rend donc
  // l'état LUI-MÊME, avec state/degrade/raison en propriétés NON ÉNUMÉRABLES :
  // JSON.stringify et Object.keys les ignorent, `r.degrade` et `r.state`
  // marchent. `r.state` pointe sur r : la boucle est sans danger, une
  // propriété non énumérable ne fait pas récurser JSON.stringify.
  function attacher(state, degrade, raison) {
    var diag = { state: state, degrade: degrade, raison: raison };
    ["state", "degrade", "raison"].forEach(function (k) {
      // un champ d'état qui porterait ce nom prime : on ne l'écrase pas (le
      // diagnostic reste lisible par M.diagnostic()).
      if (Object.prototype.hasOwnProperty.call(state, k)) return;
      try {
        Object.defineProperty(state, k, {
          value: diag[k], enumerable: false, writable: true, configurable: true
        });
      } catch (e) {}
    });
    return state;
  }

  // attrs : { fullAttrName -> {current, max} } ou { fullAttrName -> current }.
  //
  // Rend l'état, porteur de { state, degrade, raison } :
  //   degrade = null        -> jjk_state lu normalement, état complet ;
  //   degrade = "illisible" -> jjk_state PRÉSENT mais impossible à lire.
  //                            L'état rendu est la MEILLEURE reconstruction
  //                            possible, à afficher éventuellement, JAMAIS à
  //                            réécrire : la sauvegarder amputerait la fiche.
  //                            L'appelant doit geler les écritures.
  //   degrade = "partiel"   -> pas de jjk_state : reconstruction champ par
  //                            champ (fiche neuve, ou écrite par une version
  //                            antérieure à jjk_state).
  function attrsToState(attrs) {
    attrs = attrs || {};
    var cur = lecteur(attrs);
    var full = cur("state");

    if (full !== undefined && full !== "") {
      var lu = null, raison = null;
      try {
        var fs = JSON.parse(full);
        if (fs && typeof fs === "object" && !Array.isArray(fs)) lu = fs;
        else raison = "jjk_state ne porte pas un objet d'état";
      } catch (e) {
        raison = "jjk_state illisible : " + ((e && e.message) ? e.message : String(e));
      }
      if (lu) return attacher(lu, null, null);
      return attacher(reconstruire(cur), "illisible",
                      raison + " (" + String(full).length + " caractères)");
    }

    var vide = !Object.keys(attrs).some(isJjkAttr);
    return attacher(reconstruire(cur), "partiel",
                    vide ? "aucun attribut jjk_ : personnage sans fiche"
                         : "jjk_state absent : reconstruction champ par champ");
  }

  // Le diagnostic seul, en objet nu — pour l'appelant qui préfère ne pas
  // dépendre des propriétés accrochées à l'état.
  function diagnostic(attrs) {
    var s = attrsToState(attrs);
    return { state: s, degrade: s.degrade, raison: s.raison };
  }

  // Version de la fiche qui a écrit ces attributs, SANS reconstruire l'état :
  //   { schema, release } — schema = entier de format (state.v), release = le
  //   numéro lisible ("3.0.0") ; null si le personnage n'a pas de fiche.
  // Le schéma vient d'abord de jjk_state (seule source que la fiche met à jour
  // en migrant), puis du scalaire jjk_version — qui reste lisible même quand
  // jjk_state ne l'est plus, et c'est justement ce cas-là qui compte.
  function ficheDe(attrs) {
    attrs = attrs || {};
    var cur = lecteur(attrs);
    var schema = null, rel = null;

    var full = cur("state");
    if (full !== undefined && full !== "") {
      try {
        var fs = JSON.parse(full);
        if (fs && typeof fs === "object" && !Array.isArray(fs)) {
          if (isFinite(parseFloat(fs.v))) schema = num(fs.v);
          if (typeof fs.release === "string" && fs.release) rel = fs.release;
        }
      } catch (e) {}
    }
    var vc = cur("version"), vm = cur("version", "max");
    if (schema === null && vc !== undefined && vc !== "" && isFinite(parseFloat(vc))) schema = num(vc);
    if (rel === null && typeof vm === "string" && vm) rel = vm;

    if (schema === null && rel === null) {
      // ni version ni état : reste le cas d'une fiche écrite avant jjk_version
      if (!Object.keys(attrs).some(isJjkAttr)) return null;
      return { schema: null, release: null };
    }
    return { schema: schema, release: rel };
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
    RELEASE: RELEASE_DEFAUT,
    release: release,
    stateToAttrs: stateToAttrs,
    attrsToState: attrsToState,
    diagnostic: diagnostic,
    ficheDe: ficheDe,
    modsSansCode: modsSansCode,
    isJjkAttr: isJjkAttr,
    hasSheet: hasSheet,
    blank: blank
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.JjkAttrMap = api;
})(typeof window !== "undefined" ? window : this);
