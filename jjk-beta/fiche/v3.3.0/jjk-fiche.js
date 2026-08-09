/* Créateur de personnage JJK — onglet « Création » du site.
 *
 * Mise en page « dossier » transposée du créateur HxH : barre d'outils avec la
 * bibliothèque, feuille à largeur fixe, en-tête portrait + identité, compteurs
 * de budgets, onglets (Fiche / Art / Équipement / Bio / Options), colonnes,
 * valeurs cliquables pour lancer les jets, journal de jets flottant.
 * La Fiche a trois colonnes (caractéristiques | combat | compétences), tout
 * dans l'ordre Body, Mind, Prestance ; une ligne par compétence (nom | stade
 * en menu | total-jet). L'onglet Art porte la personnalisation : les
 * passifs d'une compétence et son art (au stade Artiste).
 * Chaque module éditable porte un rouage (mode édition par module) : la
 * construction du personnage est verrouillée hors édition, seuls les gestes
 * de jeu restent actifs (jets, tchat, PV, narration, quantités, notes).
 *
 * Le contenu des règles (caractéristiques, listes de compétences, stades,
 * vitesses, difficultés, blessures, courbes d'armes/armures, actions) vient de
 * jjk-creation.json, généré au build par hooks/jjk_creation.py depuis la page
 * de règles. Ce fichier porte la sémantique d'interface et les règles de
 * calcul prosaïques :
 *   - création : 120 points à répartir dans les 3 caractéristiques (0 à 80) ;
 *   - 500 xp à la création (total modifiable) ; 20 xp par stade de compétence
 *     (Non initié, Initié, Maitre, Expert, Artiste), 20 xp par +5 de
 *     caractéristique (limite 80 sans avantage) ; le stade Artiste (sans bonus
 *     propre) ouvre l'art et les passifs de la compétence : le passif
 *     original est inclus dans le stade, les suivants coûtent 20 xp pièce ;
 *   - pas plus d'un quart de l'xp total investi dans une seule compétence ;
 *   - PV max = (20 + Body) / 2 ; récupération Body/10 PV par jour ;
 *   - jet = 1d100 + caractéristique (+ bonus de stade pour une compétence) ;
 *     96+ au dé : coup critique ; 5 ou moins : échec critique.
 *
 * Persistance : localStorage « jjk-perso » (état), « jjk-cards » (cartes
 * calculées, _current = brouillon), « jjk-persos » (bibliothèque). Clés
 * préfixées jjk- : le site partage son origine avec le site HxH.
 *
 * Dans Roll20 (l'extension affiche roll20-fiche.html, servie par CE site),
 * javascripts/jjk-roll20-boot.js pose AVANT ce script :
 *   - window.__jjkLocalStorage : persistance -> Attributes Roll20 (via STORE) ;
 *   - window.__jjkRoll : les jets partent dans le tchat Roll20 ;
 *   - window.__jjkCompact : masque la barre d'outils et la bibliothèque.
 */
(function () {
  "use strict";

  var COMPACT = typeof window !== "undefined" && window.__jjkCompact === true;
  // Persistance : le localStorage du navigateur sur le site ; dans Roll20, la
  // page d'amorce pose window.__jjkLocalStorage (shim -> Attributes Roll20)
  // avant ce script. Les appels sont tous sous try/catch : STORE peut être nul
  // (stockage refusé par le navigateur) sans casser la fiche.
  var STORE = (typeof window !== "undefined" && window.__jjkLocalStorage) ||
              (function () { try { return window.localStorage; } catch (e) { return null; } })();
  var DATA = null;
  var state = null;

  // ---------- version ----------
  // RELEASE est ce qu'on montre, SCHEMA est ce qui compte. Invariant tenu par
  // scripts/verif_versions.py : majeur(RELEASE) === SCHEMA.
  //
  // Le SCHÉMA ne monte QUE lorsqu'une donnée EXISTANTE change de forme ou de
  // sens (renommage, fusion, déplacement, changement de type). Ajouter une
  // clé racine avec un défaut n'en est pas un : normalize() la complète et ne
  // purge aucune clé racine inconnue, donc une telle fiche s'ouvre dans les
  // deux sens sans migration. C'est ce qui permettra de livrer la disposition
  // des modules puis les mods sans forcer un 4.0.0 puis un 5.0.0.
  var RELEASE = "3.3.0";
  var SCHEMA = 3;

  var XP_CREATION = 500;      // xp de départ (le total reste modifiable)
  var PTS_CREATION = 120;     // points de caractéristiques à la création
  var CARAC_MAX = 80;         // limite sans avantage
  var CARAC_PAS = 5;          // +5 par achat d'xp
  var MOD_PAS = 5;            // tous les modificateurs se règlent de 5 en 5
  var QUART = 4;              // « pas plus d'un quart de l'xp total »

  var ABBR = { Mind: "MIND", Body: "BODY", Prestance: "PRES" };

  // LE DÉ DES JETS DE TEST, écrit comme les règles le disent et comme Roll20
  // le comprend : « 96+ au dé est un coup critique, 5- au dé est un échec
  // critique ». cs> et cf< sont les annotations de critique de Roll20 : le
  // résultat s'y colore de lui-même dans le tchat, vert sur un critique et
  // rouge sur un échec critique, sans que la fiche ait à le calculer.
  var DE_DEFAUT = "1d100cs>96cf<5";

  // ---------- outils ----------
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  // URL du jeu de données. Une ARCHIVE de version embarque son propre
  // jjk-creation.json, gelé à sa date : l'amorce le désigne par
  // window.__jjkDataUrl avant d'injecter le bundle. Sans lui, un bundle
  // d'archive lirait les règles d'AUJOURD'HUI — un renommage de compétence
  // suffirait à trahir la version qu'on croit rejouer.
  function dataUrl() {
    var u = typeof window !== "undefined" ? window.__jjkDataUrl : null;
    return u || (siteBase() + "jjk-creation.json");
  }
  function siteBase() {
    var l = document.querySelector('link[href*="assets/"], script[src*="assets/"]');
    var u = l ? (l.href || l.getAttribute("src")) : null;
    if (u) { var i = u.indexOf("assets/"); if (i >= 0) return u.slice(0, i); }
    return new URL(".", location.href).href;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(v, d) { var n = parseInt(v, 10); return isNaN(n) ? d : n; }
  // poids : décimal positif, virgule tolérée à la saisie, arrondi au centième
  function pnum(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
  }
  // affichage des poids : point décimal, sans zéros de traîne (« 0.5 », « 3 »)
  function fmtP(n) { return String(Math.round(n * 100) / 100); }
  // modificateurs divers : TOUJOURS un tableau de 3 emplacements (équipement /
  // art / décision du MJ), sommés dans la valeur effective — le geste de la
  // fiche HxH. modArr assainit ce qui entre, modSum totalise.
  function modArr(a) {
    if (!Array.isArray(a)) a = [];
    var out = [0, 0, 0];
    for (var i = 0; i < 3; i++) {
      var n = parseFloat(a[i]);
      out[i] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -999, 999) : 0;
    }
    return out;
  }
  function modSum(a) {
    var t = 0;
    (a || []).forEach(function (n) { if (isFinite(n)) t += n; });
    return Math.round(t * 100) / 100;
  }
  function nowStamp() { return new Date().toISOString(); }
  function sign(n) { return n >= 0 ? "+" + n : String(n).replace("-", "−"); }
  // les compétences commencent toujours par une majuscule (« apnée » -> « Apnée »)
  function capFirst(t) { t = String(t == null ? "" : t); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }

  // ---------- état ----------
  function blank() {
    return {
      v: SCHEMA, rel: RELEASE,
      name: "", portrait: "", espece: "", age: "", sexe: "", genre: "",
      defaut: "", qualites: ["", ""], background: "", notes: "",
      avantages: [], sansLimite: false,
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
        opts: { cols: 4, nom: true, qte: true, poids: false, total: true }
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
  // Toute donnée entrante (localStorage, import JSON, Attributes Roll20) passe
  // par cette normalisation : champ manquant -> valeur par défaut, types sûrs.
  // La validation est PROFONDE (éléments des tableaux, sous-objets compris) :
  // un état corrompu ne doit ni briquer la page ni s'effacer en silence.
  // Migration de schéma, AVANT toute normalisation : normalize() complète et
  // nettoie selon la forme d'AUJOURD'HUI, donc il faut d'abord amener l'état
  // jusqu'ici. Le moteur est facultatif de naissance : le repli gelé de
  // roll20-fiche.html ne charge que le bundle, et une fiche sans moteur doit
  // s'ouvrir quand même — d'où le garde, qui restera pour toujours.
  // Une fiche VENUE DU FUTUR (v > SCHEMA) n'est pas migrée à la baisse en
  // douce : on la laisse telle quelle et l'amorce s'en occupe (écran de
  // version). Écrire dessus avec un code qui ne la comprend pas serait le
  // seul vrai moyen de la perdre.
  function migre(s) {
    if (!s || typeof s !== "object") return s;
    var de = parseInt(s.v, 10);
    if (!isFinite(de)) de = 1;
    if (de === SCHEMA) return s;
    if (de > SCHEMA) return s;                     // du futur : ne rien toucher
    if (!window.JjkMigr || !window.JjkMigr.appliquer) return s;
    var r = window.JjkMigr.appliquer(s, de, SCHEMA);
    if (!r || !r.ok) return s;                     // échec : l'état d'origine, intact
    r.state.v = SCHEMA;
    r.state.rel = RELEASE;
    return r.state;
  }

  function normalize(s) {
    var b = blank();
    if (!s || typeof s !== "object") return b;
    s = migre(s);
    Object.keys(b).forEach(function (k) { if (s[k] === undefined) s[k] = b[k]; });
    // la release suit toujours le code qui vient d'écrire : c'est lui qui fait foi
    if (parseInt(s.v, 10) === SCHEMA) s.rel = RELEASE;
    if (!s.caracsBase || typeof s.caracsBase !== "object") s.caracsBase = b.caracsBase;
    if (!s.caracsXp || typeof s.caracsXp !== "object") s.caracsXp = b.caracsXp;
    if (!s.caracsMod || typeof s.caracsMod !== "object") s.caracsMod = b.caracsMod;
    ["caracsMod2", "caracsXpMod", "caracsXpMod2"].forEach(function (k) {
      if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k])) s[k] = { Mind: 0, Body: 0, Prestance: 0 };
    });
    ["caracsForce", "caracsXpForce"].forEach(function (k) {
      if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k])) s[k] = {};
    });
    // les modificateurs (blocs Options) acceptent les décimales : les sommes
    // migrées depuis les anciens divers peuvent en porter
    function modNum(v) {
      var n = parseFloat(v);
      return isFinite(n) ? clamp(Math.round(n * 100) / 100, -999, 999) : 0;
    }
    ["Mind", "Body", "Prestance"].forEach(function (c) {
      s.caracsBase[c] = clamp(num(s.caracsBase[c], 0), 0, 999);
      s.caracsXp[c] = clamp(num(s.caracsXp[c], 0), 0, 99);
      s.caracsMod[c] = modNum(s.caracsMod[c]);
      s.caracsMod2[c] = modNum(s.caracsMod2[c]);
      s.caracsXpMod[c] = modNum(s.caracsXpMod[c]);
      s.caracsXpMod2[c] = modNum(s.caracsXpMod2[c]);
      // forçages : ABSENTS par défaut, une valeur les pose
      ["caracsForce", "caracsXpForce"].forEach(function (k) {
        if (s[k][c] === undefined || s[k][c] === null || s[k][c] === "") { delete s[k][c]; return; }
        var n = parseFloat(s[k][c]);
        if (isFinite(n)) s[k][c] = clamp(Math.round(n), -9999, 9999); else delete s[k][c];
      });
    });
    // modificateurs divers (3 emplacements : équipement / art / MJ) : seuls
    // PV max, régén et vitesse en portent encore
    if (!s.divers || typeof s.divers !== "object" || Array.isArray(s.divers)) s.divers = b.divers;
    s.divers.pvMax = modArr(s.divers.pvMax);
    s.divers.regen = modArr(s.divers.regen);
    s.divers.vitesse = modArr(s.divers.vitesse);
    if (!s.compsMod || typeof s.compsMod !== "object" || Array.isArray(s.compsMod)) s.compsMod = {};
    // migration inverse (2026-08-02) : les divers de caractéristiques et de
    // compétences (essai en ligne du 2026-08-01) redeviennent le modificateur
    // UNIQUE des blocs Options — leurs sommes s'y replient, rien ne se perd
    if (s.divers.caracs && typeof s.divers.caracs === "object") {
      ["Mind", "Body", "Prestance"].forEach(function (c) {
        var d = modSum(modArr(s.divers.caracs[c]));
        if (d) s.caracsMod[c] = modNum(s.caracsMod[c] + d);
      });
    }
    delete s.divers.caracs;
    if (s.divers.comps && typeof s.divers.comps === "object" && !Array.isArray(s.divers.comps)) {
      Object.keys(s.divers.comps).forEach(function (k) {
        var d = modSum(modArr(s.divers.comps[k]));
        if (d) s.compsMod[k] = modNum((parseFloat(s.compsMod[k]) || 0) + d);
      });
    }
    delete s.divers.comps;
    // modificateur unique par compétence (bloc Options) : clés normalisées
    // comme les compétences, entrées nulles purgées
    var cmods = {};
    Object.keys(s.compsMod).forEach(function (k) {
      var n = modNum(s.compsMod[k]);
      if (!n) return;
      var di = k.indexOf("/");
      cmods[di > 0 ? k.slice(0, di + 1) + capFirst(k.slice(di + 1)) : k] = n;
    });
    s.compsMod = cmods;
    // leviers du MJ, par compétence : les cartes de forçage acceptent le vide
    // (= valeur calculée) ; le modificateur de coût, lui, est un nombre
    function mapNombres(src, force) {
      var out = {};
      if (!src || typeof src !== "object" || Array.isArray(src)) return out;
      Object.keys(src).forEach(function (k) {
        var v = src[k];
        if (force && (v === null || v === undefined || v === "")) return;
        var n = parseFloat(v);
        if (!isFinite(n)) return;
        n = clamp(Math.round(n), -9999, 9999);
        if (!force && !n) return;   // zéro = pas d'entrée
        var i = k.indexOf("/");
        out[i > 0 ? k.slice(0, i + 1) + capFirst(k.slice(i + 1)) : k] = n;
      });
      return out;
    }
    s.compsForce = mapNombres(s.compsForce, true);
    s.compsXpForce = mapNombres(s.compsXpForce, true);
    s.compsXpMod = mapNombres(s.compsXpMod, false);
    // PV max forcé : vide = valeur calculée ; borné comme le reste
    s.pvMaxOverride = (s.pvMaxOverride === null || s.pvMaxOverride === undefined || s.pvMaxOverride === "")
      ? null : Math.floor(parseFloat(s.pvMaxOverride));
    if (s.pvMaxOverride !== null && !isFinite(s.pvMaxOverride)) s.pvMaxOverride = null;
    if (s.pvMaxOverride !== null) s.pvMaxOverride = clamp(s.pvMaxOverride, 0, 9999);
    // vitesse et régénération forcées : même règle, la vitesse en décimales
    // (la table donne des paliers comme 10.5 m)
    function force(v, dec, max) {
      if (v === null || v === undefined || v === "") return null;
      var n = parseFloat(v);
      if (!isFinite(n)) return null;
      return clamp(dec ? Math.round(n * 100) / 100 : Math.floor(n), 0, max);
    }
    s.vitesseOverride = force(s.vitesseOverride, true, 9999);
    s.regenOverride = force(s.regenOverride, false, 9999);
    // langues : noms uniques, capitalisés ; la langue de base doit être l'une
    // d'elles (sinon la gratuité viserait une langue absente)
    if (!Array.isArray(s.langues)) s.langues = [];
    var vues = {};
    s.langues = s.langues
      .map(function (n) { return capFirst(String(n == null ? "" : n).trim()); })
      .filter(function (n) {
        if (!n || vues[n.toLowerCase()]) return false;
        vues[n.toLowerCase()] = 1;
        return true;
      });
    s.langueBase = capFirst(String(s.langueBase == null ? "" : s.langueBase).trim());
    if (s.langueBase && !vues[s.langueBase.toLowerCase()]) s.langueBase = "";
    // armes ajoutées à la main : noms uniques, et jamais un doublon de celles
    // des règles (qui sont déjà dans le module)
    if (!Array.isArray(s.armesComps)) s.armesComps = [];
    var basiques = {};
    ((DATA && DATA.compsArmes) || []).forEach(function (n) { basiques[String(n).toLowerCase()] = 1; });
    var vuesA = {};
    s.armesComps = s.armesComps
      .map(function (n) { return capFirst(String(n == null ? "" : n).trim()); })
      .filter(function (n) {
        if (!n || vuesA[n.toLowerCase()] || basiques[n.toLowerCase()]) return false;
        vuesA[n.toLowerCase()] = 1;
        return true;
      });
    if (!Array.isArray(s.qualites)) s.qualites = ["", ""];
    s.qualites = s.qualites.map(function (q) { return q == null ? "" : String(q); });
    while (s.qualites.length < 2) s.qualites.push("");
    function objArray(a) {
      if (!Array.isArray(a)) return [];
      return a.filter(function (x) { return x && typeof x === "object"; });
    }
    s.avantages = objArray(s.avantages);
    s.customComps = objArray(s.customComps);
    s.customComps.forEach(function (cc) { if (cc.name) cc.name = capFirst(cc.name); });
    s.armes = objArray(s.armes);
    s.armures = objArray(s.armures);
    if (typeof s.comps !== "object" || !s.comps) s.comps = {};
    var comps = {};
    Object.keys(s.comps).forEach(function (k) {
      var c = s.comps[k];
      if (!c || typeof c !== "object") c = {};
      c.stade = clamp(num(c.stade, 0), 0, DATA ? DATA.stades.length - 1 : 4);
      // la clé d'état s'appelle « techniques » (historique : elle a déjà été
      // migrée depuis « passifs », que l'interface réemploie aujourd'hui) ;
      // chaque entrée est un objet {name, desc} (l'ancien texte simple
      // devient le nom, description vide)
      if (!Array.isArray(c.techniques)) c.techniques = Array.isArray(c.passifs) ? c.passifs : [];
      delete c.passifs;
      c.techniques = c.techniques.map(function (p) {
        // cout : coût forcé de CE passif (null = le tarif de base) ; le joueur
        // peut le régler à droite du nom, en mode édition
        if (p && typeof p === "object") {
          var t = { name: String(p.name || ""), desc: String(p.desc || "") };
          var co = (p.cout === null || p.cout === undefined || p.cout === "") ? null : Math.floor(parseFloat(p.cout));
          if (co !== null && isFinite(co)) t.cout = clamp(co, 0, 9999);
          return t;
        }
        return { name: p == null ? "" : String(p), desc: "" };
      });
      // l'art du stade qui l'ouvre (Art) : {name, desc} ; un art resté vide s'efface
      if (c.art && typeof c.art === "object") {
        var aco = (c.art.cout === null || c.art.cout === undefined || c.art.cout === "")
          ? null : Math.floor(parseFloat(c.art.cout));
        c.art = { name: String(c.art.name || ""), desc: String(c.art.desc || "") };
        if (aco !== null && isFinite(aco)) c.art.cout = clamp(aco, 0, 9999);
        // un art vierge s'efface — son coût forcé n'aurait plus d'objet
        if (!c.art.name.trim() && !c.art.desc.trim()) delete c.art;
      } else delete c.art;
      // migration : noms de compétences capitalisés (« Body/apnée » -> « Body/Apnée »)
      var i = k.indexOf("/");
      comps[i > 0 ? k.slice(0, i + 1) + capFirst(k.slice(i + 1)) : k] = c;
    });
    s.comps = comps;
    // renommages de compétences (2026-08-02) : les fiches d'avant migrent
    // d'elles-mêmes — investissements, modificateurs et leviers du MJ suivent
    // le nouveau nom, rien ne se perd
    var RENOMMAGES = {
      "Body/Se cacher": "Body/Discrétion",
      "Body/Pique Longue": "Body/Pique longue",
      "Mind/Histoire Japon": "Mind/Histoire du Japon",
      "Mind/Se concentrer": "Mind/Concentration",
      "Mind/Résister à la douleur": "Mind/Résistance à la douleur",
      "Mind/Garder son calme": "Mind/Sang-froid",
      "Mind/Observer": "Mind/Observation",
      "Mind/Utiliser un autre de ses sens que la vue": "Mind/Sens autres que la vue",
      "Prestance/Déception": "Prestance/Tromperie",
      "Prestance/Commander": "Prestance/Commandement",
      "Prestance/Réconforter": "Prestance/Réconfort"
    };
    [s.comps, s.compsMod, s.compsForce, s.compsXpForce, s.compsXpMod].forEach(function (m) {
      Object.keys(RENOMMAGES).forEach(function (vieux) {
        if (Object.prototype.hasOwnProperty.call(m, vieux)) {
          if (m[RENOMMAGES[vieux]] === undefined) m[RENOMMAGES[vieux]] = m[vieux];
          delete m[vieux];
        }
      });
    });
    // inventaire structuré : liste (texte) + objets illustrés par groupes
    // (un tableau passerait le typeof : ses propriétés nommées seraient
    // perdues par JSON.stringify au premier save)
    if (!s.inv || typeof s.inv !== "object" || Array.isArray(s.inv)) s.inv = b.inv;
    s.inv.texte = objArray(s.inv.texte).map(function (it) {
      return {
        nom: it.nom == null ? "" : String(it.nom),
        qte: Math.max(0, num(it.qte, 1)),
        poids: pnum(it.poids),
        compte: it.compte !== false
      };
    });
    // réglages d'affichage du module (bornés : une fiche corrompue ne doit pas
    // produire une grille de 0 colonne)
    if (!s.inv.opts || typeof s.inv.opts !== "object" || Array.isArray(s.inv.opts)) s.inv.opts = b.inv.opts;
    s.inv.opts.cols = clamp(num(s.inv.opts.cols, b.inv.opts.cols), 1, 8);
    // chaque réglage garde SON défaut quand il manque (un opts partiel ne doit
    // pas allumer un affichage éteint par défaut)
    ["nom", "qte", "poids", "total"].forEach(function (k) {
      s.inv.opts[k] = s.inv.opts[k] === undefined ? b.inv.opts[k] : !!s.inv.opts[k];
    });
    if (!Array.isArray(s.inv.groupes)) s.inv.groupes = [];
    s.inv.groupes = s.inv.groupes.map(function (g) {
      g = g == null ? "" : String(g).trim();
      return g || "Groupe";
    });
    if (!s.inv.groupes.length) s.inv.groupes = ["Sur soi"];
    s.inv.objets = objArray(s.inv.objets).map(function (it) {
      return {
        nom: it.nom == null ? "" : String(it.nom),
        // quantités et poids DÉCIMAUX (une demi-ration, 0.5 de poids…)
        qte: pnum(it.qte === undefined ? 1 : it.qte),
        poids: pnum(it.poids),
        img: it.img == null ? "" : String(it.img),
        desc: it.desc == null ? "" : String(it.desc),
        // identifiant libre : c'est LUI qui reconnaît le même objet d'une fiche
        // à l'autre quand on le donne (deux « Corde » différentes ne se
        // confondent pas si elles portent des identifiants distincts)
        id: it.id == null ? "" : String(it.id),
        achat: pnum(it.achat),
        vente: pnum(it.vente),
        groupe: clamp(num(it.groupe, 0), 0, s.inv.groupes.length - 1)
      };
    });
    // migration : l'ancien inventaire en texte libre (une ligne par objet)
    // devient des lignes de liste, quantité 1 et poids 0
    if (s.inventaire && typeof s.inventaire === "string" && !s.inv.texte.length) {
      s.inventaire.split(/\r?\n/).forEach(function (line) {
        line = line.trim();
        if (line) s.inv.texte.push({ nom: line, qte: 1, poids: 0, compte: true });
      });
      s.inventaire = "";
    }
    // migration : la liste (retirée de la fiche) se fond dans les objets
    // illustrés, au premier groupe ; sa case « compter le poids » disparaît
    if (s.inv.texte.length) {
      s.inv.texte.forEach(function (it) {
        s.inv.objets.push({ nom: it.nom, qte: it.qte, poids: it.poids, img: "", desc: "", groupe: 0 });
      });
      s.inv.texte = [];
    }
    // coffres des modules : le contenu appartient au module, la fiche ne juge
    // que la forme. Une entrée qui n'est pas un objet est jetée : elle ferait
    // planter le get() du module sans que personne ne sache pourquoi.
    if (!s.modData || typeof s.modData !== "object" || Array.isArray(s.modData)) s.modData = {};
    Object.keys(s.modData).forEach(function (k) {
      var d = s.modData[k];
      if (!d || typeof d !== "object") delete s.modData[k];
    });
    // interrupteurs : seuls les modules COUPÉS y figurent (false). Tout le
    // reste s'efface, pour qu'un module retiré un jour ne laisse pas de trace.
    if (!s.modActifs || typeof s.modActifs !== "object" || Array.isArray(s.modActifs)) s.modActifs = {};
    Object.keys(s.modActifs).forEach(function (k) {
      if (s.modActifs[k] !== false) delete s.modActifs[k];
    });
    // Disposition des modules. ÉPARSE : on valide ce qui est là sans rien
    // matérialiser. Écrire un « ordre » vide chez tout le monde ferait voyager
    // une liste inutile jusque dans les Attributes Roll20, et un module ajouté
    // demain n'apparaîtrait pas chez un personnage rangé avant lui.
    if (!s.modules || typeof s.modules !== "object" || Array.isArray(s.modules)) s.modules = {};
    if (s.modules.ordre !== undefined) {
      var vusOrdre = {};
      s.modules.ordre = (Array.isArray(s.modules.ordre) ? s.modules.ordre : [])
        .map(function (id) { return String(id == null ? "" : id); })
        .filter(function (id) {
          if (!id || vusOrdre[id]) return false;   // un id en double décalerait le rangement
          vusOrdre[id] = 1;
          return true;
        });
    }
    if (s.modules.place !== undefined) {
      var placeSrc = s.modules.place;
      var place = {};
      if (placeSrc && typeof placeSrc === "object" && !Array.isArray(placeSrc)) {
        Object.keys(placeSrc).forEach(function (id) {
          var p = placeSrc[id];
          if (!id || !p || typeof p !== "object" || Array.isArray(p)) return;
          var q = {};
          if (typeof p.onglet === "string" && p.onglet) q.onglet = p.onglet;
          if (typeof p.colonne === "string" && p.colonne) q.colonne = p.colonne;
          // une entrée qui ne dit ni onglet ni colonne ne déplace rien : elle
          // ne ferait qu'occuper la place et voyager pour rien
          if (q.onglet || q.colonne) place[id] = q;
        });
      }
      s.modules.place = place;
    }
    // Mods du personnage. Le moteur (jjk-mods.js) fait foi quand il est là :
    // c'est lui qui connaît la forme d'un mod. Sans lui, la fiche s'en tient au
    // strict nécessaire, mais elle ne s'en dispense JAMAIS : un état venu
    // d'ailleurs (import, Attributes d'un autre joueur) ne doit pas entrer sans
    // contrôle, et un mod sans id ni code ne pourrait ni tourner ni se nommer.
    if (!Array.isArray(s.mods)) s.mods = [];
    if (window.JjkMods && typeof window.JjkMods.normalise === "function") {
      try {
        var normes = window.JjkMods.normalise(s.mods);
        if (Array.isArray(normes)) s.mods = normes;
      } catch (e) {}
    }
    var vusMods = {};
    s.mods = objArray(s.mods).filter(function (m) {
      // L'id impose son alphabet : il sert de clé partout (avis du navigateur,
      // journal « [mod:<id>] », coffre du module qu'il remplacerait). Même
      // règle que le moteur (idPropre) : les deux chemins doivent donner le
      // MÊME id, sans quoi l'empreinte changerait selon le chemin pris et le
      // joueur aurait à réautoriser un mod qu'il connaît déjà.
      m.id = String(m.id == null ? "" : m.id).toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
      m.nom = String(m.nom == null ? "" : m.nom);
      m.actif = m.actif !== false;
      if (typeof m.pour !== "string" || !m.pour) delete m.pour;
      if (typeof m.notes !== "string" || !m.notes) delete m.notes;
      var api = parseInt(m.apiMin, 10);
      if (isFinite(api)) m.apiMin = clamp(api, 0, 999); else delete m.apiMin;
      if (!m.id || typeof m.src !== "string" || vusMods[m.id]) return false;
      vusMods[m.id] = 1;
      return true;
    });
    s.xpTotal = Math.max(0, num(s.xpTotal, XP_CREATION));
    s.narration = clamp(num(s.narration, 3), 0, 99);
    s.pv = (s.pv === null || s.pv === undefined || s.pv === "") ? null : parseFloat(s.pv);
    if (s.pv !== null && !isFinite(s.pv)) s.pv = null;
    return s;
  }

  // ---------- filtres de calcul ----------
  // Un filtre intercepte une valeur DÉRIVÉE (total de caractéristique, PV max,
  // initiative…) juste après son calcul. Le calcul lui-même garde son nom
  // suffixé « Brut » ; le nom public appelle le brut, puis passe la valeur aux
  // filtres enregistrés pour ce nom. C'est par là qu'un mod change une règle de
  // calcul sans qu'on rouvre ce fichier, et sans avoir à réécrire le module qui
  // affiche la valeur : tout ce qui lit caracTotal() voit le même chiffre.
  //
  // Les CASCADES sont voulues, et elles tombent toutes seules : pvMaxAuto()
  // appelle caracTotal(), donc un filtre sur caracTotal se voit dans les PV ;
  // initiative() appelle compValue() et poidsPorte(), xpDepense() appelle
  // compXp(). Les gardes ci-dessous sont par NOM, jamais globales, pour ne pas
  // couper ces chaînes-là.
  var filtres = {};            // nom -> [{ fn, prop, echecs }], ordre d'enregistrement
  var filtresEnCours = {};     // nom -> 1 pendant sa passe (garde de récursion)
  var FILTRE_FAUTES = 5;       // même seuil que la muselière des modules, même raison
  // À qui appartient ce qui s'enregistre : monteModules le pose autour du build
  // d'un module, l'exécution des mods autour du moteur. Hors de tout
  // propriétaire (console du navigateur), personne ne répond : « ? ».
  var proprietaireCourant = "?";
  // L'id du mod que le moteur est en train de lancer, ou null. Différent de
  // proprietaireCourant, qui vaut aussi pendant le build d'un module natif.
  var modEnExec = null;
  var PROP_MOD = "mod";        // repli quand le moteur ne nomme pas le mod qui tourne
  // Vrai pendant un montage. Ce qui s'enregistre HORS d'un montage (console du
  // navigateur, script tiers chargé après la fiche) n'a personne pour le
  // rejouer après la remise à zéro du prochain mount() : on le garde ici.
  var enMontage = false;
  // { mod: module, prop } ou { nom, fn, prop } pour un filtre : chaque entrée
  // dit à QUI elle est, faute de quoi rien ne saurait plus l'en défaire
  var horsMontage = [];
  // Les neuf points de filtre. La table ne sert qu'à prévenir d'un nom mal
  // tapé : un filtre posé sur « pvmax » ne serait jamais appelé, et rien ne le
  // dirait.
  var FILTRES_CONNUS = {
    caracTotal: 1, compValue: 1, compXp: 1, pvMax: 1, initiative: 1,
    vitesse: 1, regen: 1, poidsPorte: 1, xpDepense: 1
  };
  // Appartenance RÉELLE à une table nommée par une chaîne venue d'ailleurs (mod,
  // état importé). Sans elle, un nom comme « toString » répond « oui » depuis
  // Object.prototype, et la suite manipule une méthode en croyant tenir une
  // donnée : c'est la façon la plus bête de casser un montage.
  function aClef(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function ajouteFiltre(nom, fn, prop) {
    nom = String(nom == null ? "" : nom);
    if (typeof fn !== "function" || !nom) return;
    prop = prop || "?";
    if (!aClef(FILTRES_CONNUS, nom) && window.console && window.console.warn)
      window.console.warn("[mod:" + prop + "] filtre " + nom + " inconnu : il ne sera jamais appelé.");
    if (!aClef(filtres, nom)) filtres[nom] = [];
    // DÉDOUBLONNAGE DANS LE REGISTRE LUI-MÊME, et pas seulement dans ce qui
    // attend le montage suivant. Un bouton de mod qui repose son filtre à
    // chaque clic l'empilait DANS LE MÊME MONTAGE : deux clics et le bonus
    // comptait double (+20, +40, +60…), sans que rien ne le montre. Même
    // nom, même propriétaire, même texte de fonction : c'est le même filtre,
    // et le reposer ne veut pas dire le vouloir deux fois.
    var texte = signeFn(fn);
    var liste = filtres[nom];
    for (var i = 0; i < liste.length; i++) {
      if (liste[i].prop === prop && (liste[i].fn === fn || (texte && liste[i].src === texte))) {
        liste[i].fn = fn;
        liste[i].echecs = 0;
        if (!enMontage) gardeHorsMontage({ nom: nom, fn: fn, prop: prop });
        return;
      }
    }
    liste.push({ fn: fn, prop: prop, echecs: 0, src: texte });
    if (!enMontage) gardeHorsMontage({ nom: nom, fn: fn, prop: prop });
  }
  // Ce qui attend le prochain montage porte son PROPRIÉTAIRE (celui du filtre,
  // l'id du module pour un enregistrement) et ne s'inscrit qu'UNE FOIS. Sans ce
  // second point, un bouton qui repose le même filtre à chaque clic l'empile :
  // deux clics et le bonus compte double, à chaque montage, pour toujours.
  //
  // COMPARER LES FONCTIONS PAR RÉFÉRENCE NE SUFFIT PAS, et c'est le piège qui a
  // laissé passer ce défaut une première fois : « function (v) { return v + 20; } »
  // écrit DANS un gestionnaire de clic fabrique un objet NEUF à chaque clic.
  // Deux entrées identiques à la lettre près étaient donc jugées différentes et
  // s'empilaient (+20, +40, +60…). On compare donc aussi le TEXTE de la
  // fonction. Deux filtres vraiment distincts qui s'écriraient caractère pour
  // caractère pareil se confondraient, mais poser deux fois le même calcul pour
  // qu'il compte double n'est pas un usage : l'empilement sans fin, si.
  function signeFn(fn) {
    try { return String(fn); } catch (e) { return ""; }
  }
  function gardeHorsMontage(e) {
    if (!e.mod) e.src = signeFn(e.fn);
    // l'état des mods AU MOMENT du dépôt : le rejeu s'en sert pour savoir si la
    // liste a bougé depuis (voir rejoueHorsMontage)
    e.sig = signatureAuMontage;
    for (var i = 0; i < horsMontage.length; i++) {
      var h = horsMontage[i];
      // un module se REMPLACE à son id (c'est ce que fait enregistre) ; un
      // filtre se reconnaît à son nom, son propriétaire et son texte
      if (e.mod || h.mod) {
        if (e.mod && h.mod && h.mod.id === e.mod.id) { horsMontage[i] = e; return; }
        continue;
      }
      if (h.nom === e.nom && h.prop === e.prop &&
          (h.fn === e.fn || (e.src && h.src === e.src))) { horsMontage[i] = e; return; }
    }
    horsMontage.push(e);
  }
  // Rejoué au début de chaque montage, dans l'ordre : le contrat promet qu'un
  // Jjk.filtre ou un Jjk.enregistre lancé depuis la console vaut « pour le
  // montage suivant » — et pour tous ceux d'après, rien d'autre ne le rejoue.
  //
  // Mais seulement ce qui a encore un ayant droit. Ce qui appartient à un MOD ne
  // se rejoue que tant que ce mod est sur le personnage, actif et accordé :
  // sinon le filtre posé par le bouton d'un mod refusé, coupé ou supprimé
  // continuerait de fausser les calculs à chaque montage, sans un mot et sans
  // rien pour le défaire — seul un rechargement complet de la page en viendrait
  // à bout, geste que le joueur n'a pas dans l'iframe Roll20. Le bilan du
  // montage précédent sert encore ici, c'est lui qui reconnaît un id de mod :
  // executeMods ne le remplace qu'après. Le propriétaire « ? » (console du
  // navigateur) est promis par le contrat, il se rejoue toujours.
  // Ce que les mods du personnage donnent à voir : leurs id, leur interrupteur
  // et l'accord du navigateur. Il change dès qu'un mod est ajouté, retiré,
  // coupé, autorisé ou refusé — et c'est exactement à ces moments-là que ce qui
  // n'a PAS d'ayant droit connu doit cesser d'être rejoué.
  function signatureMods() {
    var l = (state && Array.isArray(state.mods)) ? state.mods : [];
    return l.map(function (m) {
      return String(m.id) + ":" + (m.actif !== false ? "1" : "0") + ":" + avisMod(empreinteMod(m.id, m.src));
    }).join("|");
  }
  var signatureAuMontage = null;
  function rejoueHorsMontage() {
    var sig = signatureMods();
    var reste = [];
    horsMontage.forEach(function (h) {
      if (propEstUnMod(h.prop) && !modAutorise(h.prop)) return;
      // LE FILET. Un mod qui pose un filtre depuis un setTimeout, ou depuis un
      // écouteur qu'il a accroché lui-même, échappe à toute attribution : son
      // propriétaire vaut « ? », comme une ligne tapée dans la console, que le
      // contrat promet de conserver. On ne peut pas distinguer les deux — mais
      // on peut refuser de rejouer un « ? » anonyme dès que la liste des mods a
      // BOUGÉ. Le joueur qui refuse, coupe ou supprime un mod voit alors partir
      // ce que ce mod avait installé, quel qu'en soit le chemin. Une mise au
      // point à la console, elle, ne touche pas aux mods : elle survit.
      if (h.prop === "?" && signatureAuMontage !== null && h.sig !== sig) return;
      reste.push(h);
      if (h.mod) enregistre(h.mod);
      else ajouteFiltre(h.nom, h.fn, h.prop);
    });
    horsMontage = reste;
    signatureAuMontage = sig;
  }
  function aFiltre(nom) {
    var l = filtres[nom];
    return !!(l && l.length);
  }
  // La passe : chaque filtre reçoit la valeur rendue par le précédent. Un
  // filtre qui jette, ou qui rend autre chose qu'un nombre fini, est IGNORÉ
  // pour cette passe (la valeur d'avant continue son chemin) et compte une
  // faute ; cinq fautes de SUITE et il part, parce qu'un filtre cassé fausserait
  // chaque calcul de la fiche sans que personne ne sache d'où vient le chiffre.
  // Une passe sans faute remet son compteur à zéro.
  function applique(nom, valeur, infos) {
    var liste = filtres[nom];
    if (!liste || !liste.length) return valeur;
    // Garde de récursion : pendant la passe, tout nouvel appel au MÊME calcul
    // rend le brut. Sans elle, un filtre qui lit ctx.calculs.caracTotal se
    // rappellerait sans fin et figerait l'onglet.
    if (filtresEnCours[nom]) return valeur;
    filtresEnCours[nom] = 1;
    try {
      var i = 0;
      while (i < liste.length) {
        var f = liste[i], v = null, msg = "";
        try { v = f.fn(valeur, infos); }
        catch (err) { msg = messageErreur(err); }
        if (!msg && typeof v === "number" && isFinite(v)) {
          valeur = v;
          f.echecs = 0;
          i++;
          continue;
        }
        if (!msg) msg = typeof v === "number" ? "résultat non fini" : "résultat de type " + (typeof v);
        f.echecs++;
        if (f.echecs < FILTRE_FAUTES) { i++; continue; }
        liste.splice(i, 1);   // retiré : le suivant a pris la place, i ne bouge pas
        retireFiltre(nom, f, msg);
      }
    } finally { filtresEnCours[nom] = 0; }
    return valeur;
  }
  function retireFiltre(nom, f, msg) {
    var texte = "filtre " + nom + " retiré : " + msg;
    if (window.console && window.console.warn)
      window.console.warn("[mod:" + f.prop + "] " + texte);
    // le propriétaire porte l'erreur : c'est ce que Jjk.etat(id) rend, et ce
    // que les listes de mods et de modules affichent
    etatModule(f.prop).erreur = texte;
  }
  // Jjk.filtre : le propriétaire est celui du moment. ctx.filtreCalcul, lui,
  // fige l'id de son module à la construction du contexte (un module qui pose
  // un filtre depuis un bouton, longtemps après son build, reste chez lui).
  function filtreCalcul(nom, fn) { ajouteFiltre(nom, fn, proprietaireCourant); }

  // ---------- calculs ----------
  // Chaque valeur dérivée existe en deux temps : <nom>Brut fait le calcul,
  // <nom> le passe aux filtres. Les fonctions <nom>Auto, elles, sont AUTRE
  // CHOSE : la valeur avant le forçage du MJ, et elles ne bougent pas.
  function caracTotalBrut(c) {
    // total FORCÉ : il court-circuite tout, plafond et modificateurs compris
    if (state.caracsForce[c] !== undefined) return state.caracsForce[c];
    var v = state.caracsBase[c] + CARAC_PAS * state.caracsXp[c];
    if (!state.sansLimite) v = Math.min(v, CARAC_MAX);
    // le modificateur (bloc Options) s'applique APRÈS le plafond : il peut
    // porter le total au-delà de 80 comme en dessous de 0.
    return v + (state.caracsMod[c] || 0) + (state.caracsMod2[c] || 0);
  }
  function caracTotal(c) {
    var v = caracTotalBrut(c);
    // le test évite de fabriquer l'objet d'infos pour rien : ce calcul-là est
    // rappelé des centaines de fois par rafraîchissement
    return aFiltre("caracTotal") ? applique("caracTotal", v, { carac: c }) : v;
  }
  function stadeInfo(i) { return DATA.stades[clamp(i, 0, DATA.stades.length - 1)]; }
  // coût d'un passif : son coût forcé s'il en porte un, sinon le tarif de base
  // (20 xp) — TOUS les passifs sont payants, aucun n'est offert par un stade
  function techXp(t) {
    return (t && t.cout !== null && t.cout !== undefined && isFinite(t.cout))
      ? t.cout : DATA.xpParStade;
  }
  // coût de l'art : rien par défaut (il vient avec son stade), sauf coût forcé
  function artXp(c) {
    return (c && c.art && c.art.cout !== null && c.art.cout !== undefined && isFinite(c.art.cout))
      ? c.art.cout : 0;
  }
  // clés et repères des compétences que la fiche traite à part
  var INIT_KEY = "Body/Initiative";
  var LANGUE_CARAC = "Mind";
  // les compétences d'ARMES sont TOUJOURS des compétences de Body
  var ARME_CARAC = "Body";
  function armeKey(nom) { return ARME_CARAC + "/" + nom; }
  // celles des règles, puis celles que le joueur a ajoutées
  function armesNoms() {
    return ((DATA && DATA.compsArmes) || []).concat(state.armesComps);
  }
  function langueKey(nom) { return LANGUE_CARAC + "/" + nom; }
  function estLangue(key) {
    return state.langues.some(function (n) { return langueKey(n) === key; });
  }
  // index du stade « Expert » : la langue du personnage y monte gratuitement
  function stadeIndex(nom) {
    for (var i = 0; i < DATA.stades.length; i++) {
      if ((DATA.stades[i].nom || "").toLowerCase() === nom) return i;
    }
    return -1;
  }
  function stadeExpert() {
    var i = stadeIndex("expert");
    return i >= 0 ? i : Math.max(0, DATA.stades.length - 2);
  }
  function compXpBrut(c, key) {
    // coût forcé (Options) : il court-circuite tout le calcul
    if (key && state.compsXpForce[key] !== undefined) return state.compsXpForce[key];
    // la langue du personnage est acquise : ses stades ne coûtent rien
    // jusqu'à Expert, au-delà seule la différence se paie
    var stadesDus = c.stade;
    if (key && state.langueBase && key === langueKey(state.langueBase)) {
      stadesDus = Math.max(0, c.stade - stadeExpert());
    }
    var xp = DATA.xpParStade * stadesDus;
    // les passifs PRÉSENTS restent facturés même si le stade ne les ouvre
    // plus (fiches d'avant un déplacement du stade d'ouverture : rien ne
    // doit disparaître ni se re-créditer en silence)
    (c.techniques || []).forEach(function (t) { xp += techXp(t); });
    return xp + artXp(c) +
           (key ? (state.compsXpMod[key] || 0) + (state.compsXpMod2[key] || 0) : 0);
  }
  function compXp(c, key) {
    var v = compXpBrut(c, key);
    return aFiltre("compXp") ? applique("compXp", v, { cle: key, comp: c }) : v;
  }
  // Ce qu'une caractéristique coûte, forçage et modificateurs compris. Elle
  // se règle désormais comme une compétence : c'est le même geste pour le MJ.
  function caracXp(c) {
    if (state.caracsXpForce[c] !== undefined) return state.caracsXpForce[c];
    return DATA.xpParStade * (state.caracsXp[c] || 0) +
           (state.caracsXpMod[c] || 0) + (state.caracsXpMod2[c] || 0);
  }
  function caracXpAuto(c) {
    return DATA.xpParStade * (state.caracsXp[c] || 0) +
           (state.caracsXpMod[c] || 0) + (state.caracsXpMod2[c] || 0);
  }
  function compCap() { return Math.floor(state.xpTotal / QUART); }
  // le total appelle compXp() et non compXpBrut() : un filtre sur le coût d'une
  // compétence doit se voir dans l'xp dépensé, sinon les deux chiffres de
  // l'en-tête se contrediraient
  function xpDepenseBrut() {
    var xp = 0;
    ["Mind", "Body", "Prestance"].forEach(function (c) { xp += caracXp(c); });
    Object.keys(state.comps).forEach(function (k) { xp += compXp(state.comps[k], k); });
    return xp;
  }
  function xpDepense() {
    var v = xpDepenseBrut();
    return aFiltre("xpDepense") ? applique("xpDepense", v, {}) : v;
  }
  function xpRestant() { return state.xpTotal - xpDepense(); }
  // xp dépensé DANS un champ : la montée de la caractéristique elle-même, plus
  // toutes les compétences qui s'y rattachent (armes et langues comprises,
  // elles sont des compétences de Body et de Mind)
  function xpChamp(carac) {
    var xp = caracXp(carac);
    Object.keys(state.comps).forEach(function (k) {
      if (k.slice(0, carac.length + 1) === carac + "/") xp += compXp(state.comps[k], k);
    });
    return xp;
  }
  function ptsCreation() {
    return state.caracsBase.Mind + state.caracsBase.Body + state.caracsBase.Prestance;
  }
  // les valeurs issues d'une division s'arrondissent à l'INFÉRIEUR
  function pvMaxAuto() { return Math.floor((20 + caracTotal("Body")) / 2) + modSum(state.divers.pvMax); }
  // PV max : la valeur forcée (Options du bloc PV) court-circuite le calcul
  function pvMaxBrut() { return state.pvMaxOverride !== null ? state.pvMaxOverride : pvMaxAuto(); }
  function pvMax() {
    var v = pvMaxBrut();
    return aFiltre("pvMax") ? applique("pvMax", v, {}) : v;
  }
  function pvCourant() { return state.pv === null ? pvMax() : state.pv; }
  function regenAuto() { return Math.max(0, Math.floor(caracTotal("Body") / 10) + modSum(state.divers.regen)); }
  function regenBrut() { return state.regenOverride !== null ? state.regenOverride : regenAuto(); }
  function regen() {
    var v = regenBrut();
    return aFiltre("regen") ? applique("regen", v, {}) : v;
  }
  // Poids porté : tout ce que le personnage a sur lui — armes, armures et
  // objets de l'inventaire (quantité comprise). Il se soustrait à l'initiative.
  function poidsPorteBrut() {
    var t = 0;
    state.armes.forEach(function (a) { t += pnum(a.poids); });
    state.armures.forEach(function (a) { t += pnum(a.poids); });
    state.inv.objets.forEach(function (o) { t += pnum(o.qte) * pnum(o.poids); });
    return Math.round(t * 100) / 100;
  }
  function poidsPorte() {
    var v = poidsPorteBrut();
    return aFiltre("poidsPorte") ? applique("poidsPorte", v, {}) : v;
  }
  // Initiative : une compétence de Body comme les autres, moins le poids porté
  function initComp() { return state.comps[INIT_KEY] || blankComp(); }
  // compValue() et poidsPorte() (les publics, pas les bruts) : un filtre sur le
  // total d'une compétence ou sur le poids porté doit se voir dans l'initiative,
  // qui n'est que leur soustraction
  function initiativeBrut() {
    return Math.round((compValue("Body", initComp(), INIT_KEY) - poidsPorte()) * 100) / 100;
  }
  function initiative() {
    var v = initiativeBrut();
    return aFiltre("initiative") ? applique("initiative", v, {}) : v;
  }
  // la table des règles donne une CHAÎNE (« 10.5 m ») : le palier s'extrait en
  // nombre pour recevoir les divers, puis se réaffiche avec son unité
  function vitessePalier() {
    // arrondi à l'inférieur : un Body décimal (divers) tomberait sinon dans
    // les trous de la table (39.5 entre les lignes 0-39 et 40-79) et
    // retomberait sur la DERNIÈRE ligne, la vitesse maximale
    var b = Math.floor(Math.max(0, caracTotal("Body")));   // négatif : 1er palier
    var rows = DATA.vitesses || [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (b >= r.min && (r.max === null || b <= r.max)) return r.vitesse;
    }
    return rows.length ? rows[rows.length - 1].vitesse : "";
  }
  function vitesseBase() {
    var n = parseFloat(vitessePalier());
    return isFinite(n) ? n : 0;
  }
  function vitesseAuto() {
    return Math.max(0, vitesseBase() + modSum(state.divers.vitesse));
  }
  function vitesseValBrut() {
    return state.vitesseOverride !== null ? state.vitesseOverride : vitesseAuto();
  }
  // le filtre porte sur le NOMBRE de mètres, jamais sur la chaîne rendue par
  // vitesse() : un mod qui double la vitesse fait une multiplication, pas une
  // opération de texte
  function vitesseVal() {
    var v = vitesseValBrut();
    return aFiltre("vitesse") ? applique("vitesse", v, {}) : v;
  }
  function vitesse() { return fmtP(vitesseVal()) + " m"; }
  function compValueBrut(carac, comp, key) {
    // total forcé (Options) : il remplace le calcul, modificateur compris
    if (key && state.compsForce[key] !== undefined) return state.compsForce[key];
    return caracTotal(carac) + stadeInfo(comp ? comp.stade : 0).bonus +
           (key ? (state.compsMod[key] || 0) + (state.compsMod2[key] || 0) : 0);
  }
  function compValue(carac, comp, key) {
    var v = compValueBrut(carac, comp, key);
    return aFiltre("compValue")
      ? applique("compValue", v, { carac: carac, cle: key, comp: comp })
      : v;
  }
  // Total SANS le forçage : ce que la compétence vaudrait normalement.
  // « Auto » ne veut pas dire « sans filtre » : ces deux fonctions passent par
  // les publiques (compValue, compXp), donc un filtre s'y voit aussi. C'est
  // voulu : ce sont les valeurs de repli affichées à côté des cases de forçage,
  // et elles doivent parler la même langue que le reste de la fiche. Recopier
  // le corps du brut donnait deux chiffres pour une seule compétence : la
  // colonne Total affichait 45 pendant que l'indication du champ « Total forcé »
  // proposait 40, et le joueur qui recopiait l'indication perdait les 5 points
  // du filtre sans rien voir. Le forçage s'ôte le temps du calcul, comme pour
  // l'xp : c'est la seule chose dont ces valeurs doivent se passer.
  //
  // finally, et pas une simple ligne de plus : le forçage est une donnée du
  // PERSONNAGE, retirée le temps d'un calcul. Ces fonctions tournent dans les
  // hooks de rafraîchissement, où chaque appel est déjà sous try/catch ; un
  // calcul qui jetterait entre le retrait et la remise ne ferait donc pas de
  // bruit, mais le chiffre saisi par le joueur serait effacé pour de bon, et le
  // save() suivant l'emporterait.
  function compValueAuto(carac, comp, key) {
    var f = state.compsForce[key];
    delete state.compsForce[key];
    try { return compValue(carac, comp, key); }
    finally { if (f !== undefined) state.compsForce[key] = f; }
  }
  function compXpAuto(c, key) {
    var f = state.compsXpForce[key];
    delete state.compsXpForce[key];
    try { return compXp(c, key); }
    finally { if (f !== undefined) state.compsXpForce[key] = f; }
  }
  function blankComp() { return { stade: 0, techniques: [] }; }
  function allComps() {
    var out = [];
    var armes = {};
    ((DATA && DATA.compsArmes) || []).forEach(function (n) { armes[n] = 1; });
    CHAMPS.forEach(function (c) {
      (DATA.comps[c] || []).forEach(function (n) {
        out.push({ key: c + "/" + n, name: n, carac: c, custom: false,
                   arme: c === ARME_CARAC && !!armes[n] });
      });
    });
    // armes ajoutées par le joueur : mêmes compétences de Body, personnalisées
    state.armesComps.forEach(function (n) {
      out.push({ key: armeKey(n), name: n, carac: ARME_CARAC, custom: true, arme: true });
    });
    state.customComps.forEach(function (cc) {
      if (cc && cc.name) out.push({ key: cc.carac + "/" + cc.name, name: cc.name, carac: cc.carac, custom: true });
    });
    // les langues sont des compétences de Mind à part entière : elles doivent
    // apparaître dans l'onglet Art et dans les modificateurs (Options) comme
    // les autres. Seule la liste de l'onglet Fiche les écarte, puisqu'elles
    // ont leur propre module.
    state.langues.forEach(function (n) {
      out.push({ key: langueKey(n), name: n, carac: LANGUE_CARAC, custom: true, langue: true });
    });
    return out;
  }

  // La « carte » : le résumé calculé de la fiche, pour la bibliothèque, le popup
  // de l'extension et les attributs miroir Roll20 (barres de jetons, macros).
  function computeCard() {
    return {
      name: state.name || "Sans nom",
      caracs: { Mind: caracTotal("Mind"), Body: caracTotal("Body"), Prestance: caracTotal("Prestance") },
      combat: {
        pv: state.pv === null ? null : pvCourant(), pvMax: pvMax(),
        vitesse: vitesse(), regen: regen(), initiative: initiative(), poids: poidsPorte()
      },
      narration: state.narration,
      updated: nowStamp()
    };
  }

  // ---------- persistance ----------
  // Le bandeau du dernier enregistrement raté : absent tant que ça passe. Une
  // panne d'enregistrement ne se dit PAS en un éclair de 2.6 s vu une seule
  // fois, comme le faisait l'ancien flash : la fiche continuerait de s'afficher,
  // parfaitement normale, pendant qu'une session entière de travail se perd à
  // la fermeture. Tant que ça ne repasse pas, le bandeau reste.
  var elSavePanne = null;
  function save() {
    // La mise en forme se fait HORS du try du stockage, et son échec se dit
    // autrement. Un mod qui range une donnée circulaire dans ctx.state (la page
    // Mods invite justement à y écrire, et seul ctx.donnees.set s'en protège)
    // fait jeter stringify : setItem n'était alors jamais atteint, donc sous
    // Roll20 le cache mémoire du pont n'était même pas à jour, donc aucune
    // écriture programmée, donc ni accusé de réception, ni chien de garde, ni
    // bandeau de perte. Rien ne s'enregistrait plus et rien ne le disait.
    var json = null, panne = "";
    try { json = JSON.stringify(state); }
    catch (e) {
      panne = "La fiche ne peut plus se mettre en forme pour l'enregistrement (" + messageErreur(e) +
              "). Un mod a sans doute rangé une donnée qui se contient elle-même : plus rien n'est enregistré.";
    }
    if (json !== null) {
      try { STORE.setItem("jjk-perso", json); }
      catch (e) { panne = "Impossible d'enregistrer (stockage plein ou bloqué) : exporter la fiche en JSON."; }
    }
    montrePanneSave(panne);
    var cards;
    try { cards = JSON.parse(STORE.getItem("jjk-cards")) || {}; } catch (e) { cards = {}; }
    var card = computeCard();
    card.id = "_current";
    cards._current = card;
    try { STORE.setItem("jjk-cards", JSON.stringify(cards)); } catch (e) {}
  }
  // Le bandeau de perte : même mise en forme que celui des mods, au même
  // endroit, juste avant la feuille. Il n'y en a qu'UN, gardé d'un montage à
  // l'autre : mount() vide la racine, l'élément se retrouve détaché, et le
  // premier enregistrement du nouveau montage le remet en tête. Il s'en va tout
  // seul dès qu'un enregistrement repasse, sans que personne ait à y penser.
  //
  // SA PROPRE CLASSE, en plus de la commune. Le contrat réserve .pc-avis au
  // bandeau de consentement ; les deux peuvent coexister (un mod en attente ET
  // un enregistrement en panne), et sans marque distincte plus personne, code
  // ou sonde, ne sait lequel des deux il tient.
  function montrePanneSave(msg) {
    if (!msg) {
      if (elSavePanne && elSavePanne.parentNode) elSavePanne.parentNode.removeChild(elSavePanne);
      return;
    }
    if (!appEl) return;   // pas encore monté : le prochain enregistrement le posera
    if (!elSavePanne) {
      elSavePanne = el("div", "pc-avis pc-avis-save");
      elSavePanne.appendChild(el("div", "pc-avis-txt", ""));
    }
    var txt = elSavePanne.firstChild;
    if (txt.textContent !== msg) txt.textContent = msg;
    // save() part à chaque frappe : ne toucher au DOM que si le bandeau n'est
    // pas déjà à sa place, sinon chaque lettre tapée le déplacerait.
    if (elSavePanne.parentNode === appEl) return;
    // la feuille est cherchée parmi les enfants DIRECTS : insertBefore veut un
    // repère qui soit bien un enfant de appEl, et un querySelector qui
    // descendrait dans l'arbre jetterait au lieu de poser le bandeau
    var avant = null, k;
    for (k = 0; k < appEl.children.length; k++)
      if (appEl.children[k].className === "pc-sheet") { avant = appEl.children[k]; break; }
    appEl.insertBefore(elSavePanne, avant);
  }
  function load() {
    try { return normalize(JSON.parse(STORE.getItem("jjk-perso"))); }
    catch (e) { return null; }
  }
  function curTab() { try { return STORE.getItem("jjk-tab") || "fiche"; } catch (e) { return "fiche"; } }
  function setTab(id) { try { STORE.setItem("jjk-tab", id); } catch (e) {} }

  // bibliothèque (site seulement : dans Roll20, une fiche par personnage)
  var PKEY = "jjk-persos";
  function loadPersos() { try { var a = JSON.parse(STORE.getItem(PKEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function savePersos(a) {
    try { STORE.setItem(PKEY, JSON.stringify(a)); } catch (e) {}
    var cards;
    try { cards = JSON.parse(STORE.getItem("jjk-cards")) || {}; } catch (e) { cards = {}; }
    var keep = { _current: cards._current };
    a.forEach(function (p) {
      var saved = state, cur;
      try { cur = normalize(JSON.parse(JSON.stringify(p.state))); } catch (e) { cur = null; }
      if (cur) {
        state = cur;
        var card = computeCard(); card.id = p.id; card.name = p.name;
        keep[p.id] = card;
      }
      state = saved;
    });
    try { STORE.setItem("jjk-cards", JSON.stringify(keep)); } catch (e) {}
  }

  // ---------- envoi au tchat : destinataire et modificateur ----------
  // Tout ce que la fiche envoie à Roll20 traverse ce bloc. La commande est
  // composée ICI, côté site, et part par window.__jjkChat, que l'extension
  // relaie SANS RIEN RÉÉCRIRE : le format peut donc évoluer sans re-signature.
  // Les deux réglages (à qui, avec ou sans modificateur) vivent dans le VRAI
  // localStorage du navigateur, comme la préférence jour/nuit : ce ne sont pas
  // des données de personnage, et les écrire dans les Attributes Roll20 à
  // chaque clic n'aurait aucun sens.
  var ENVOI = {
    mode: "jjk-r20-envoi",        // "public" | "gm" | "joueur"
    dest: "jjk-r20-envoi-dest",   // nom d'affichage du destinataire
    input: "jjk-r20-envoi-input", // "0" (sans) | "1" (avec)
    carac: "jjk-r20-envoi-carac", // "0" (automatique) | "1" (carac au choix au lancer)
    noms: "jjk-r20-envoi-noms"    // liste de secours, si Roll20 ne la donne pas
  };
  function lpref(k, def) {
    try { var v = localStorage.getItem(k); return v == null ? def : v; } catch (e) { return def; }
  }
  function lset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function envMode() {
    var m = lpref(ENVOI.mode, "public");
    return m === "gm" || m === "joueur" ? m : "public";
  }
  function envDest() { return lpref(ENVOI.dest, ""); }
  function envInput() { return lpref(ENVOI.input, "0") === "1"; }
  function envCaracChoix() { return lpref(ENVOI.carac, "0") === "1"; }
  // Même assainissement que l'extension (content-roll20.js) : sur le canal brut
  // elle n'en fait aucun, une accolade ou un retour à la ligne d'un texte de
  // fiche casserait la carte.
  function envSan(s) {
    return String(s == null ? "" : s).replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  }
  // Valeur de champ : les accolades d'une macro Roll20 (@{Perso|jjk_body},
  // ?{…}) sont légitimes et doivent survivre. Un champ de gabarit se ferme sur
  // « }} » : c'est la SEULE séquence à briser, et une valeur qui finit par une
  // accolade prend une espace pour ne pas en fabriquer une avec la fermeture.
  function envVal(s) {
    var v = String(s == null ? "" : s).replace(/\s+/g, " ").trim().replace(/\}\}/g, "} }");
    return /\}$/.test(v) ? v + " " : v;
  }
  // Le préfixe de chuchotement ouvre la commande : Roll20 exige que le message
  // COMMENCE par « / », un seul blanc devant et tout part en clair, en public.
  // Un nom qui contient une espace doit être entre guillemets droits.
  function envPrefixe() {
    var m = envMode();
    if (m === "gm") return "/w gm ";
    if (m === "joueur") {
      var d = envSan(envDest()).replace(/"/g, "");
      if (d) return "/w \"" + d + "\" ";
      // « à un joueur » sans destinataire : public plutôt qu'une commande cassée
    }
    return "";
  }
  // Requête Roll20 : résolue côté client à l'envoi, donc seulement parce que
  // l'extension écrit dans la zone de saisie du tchat. Les parenthèses laissent
  // saisir un modificateur négatif sans ambiguïté (« + (-5) »).
  var ENV_QUERY = " + (?{Modificateur|0})";
  function cmdJet(label, value, die, avecInput, caracQ) {
    // « + 0 » est du bruit sur les jets d'équipement (dégâts, invu), qui
    // n'ont jamais de bonus : l'expression part seule.
    var v = value ? (value > 0 ? " + " + value : " - " + (-value)) : "";
    // Le libellé passe par envSan comme les titres de cartes, et le dé voit
    // ses blancs repliés : un saut de ligne (nom de compétence venu d'un
    // import, dé recopié depuis une macro) ferait une SECONDE ligne au tchat.
    // L'extension refuse une commande multiligne, et le clic partirait alors
    // sans rien envoyer. Les accolades du dé restent : « ?{Dé|1d100} » et
    // « @{…} » sont des dés légitimes dans Roll20.
    var de = String(die == null ? "" : die).replace(/\s+/g, " ").trim() || DE_DEFAUT;
    return "&{template:default} {{name=" + (envSan(label) || "Jet") +
           "}} {{Jet=[[" + de +
           (caracQ ? " + (" + caracQ + ")" : "") + v +
           (avecInput ? ENV_QUERY : "") + "]]}}";
  }
  function cmdCarte(title, fields) {
    var cmd = "&{template:default} {{name=" + envSan(title) + "}}";
    (fields || []).forEach(function (f) {
      if (!f) return;
      var k = envSan(f[0]), v = envVal(f[1]);
      if (v) cmd += " {{" + k + "=" + v + "}}";
    });
    return cmd;
  }
  // envoi effectif : préfixe + commande. Renvoie false hors Roll20.
  function envoyer(cmd) {
    if (typeof window === "undefined" || typeof window.__jjkChat !== "function") return false;
    window.__jjkChat(envPrefixe() + cmd);
    return true;
  }

  // ---------- jets ----------
  // Les dés se jettent dans Roll20 : jjk-roll20-boot.js (amorce Roll20 servie
  // par le site) pose window.__jjkRoll et le
  // jet part au TCHAT. Sur le site (pas de Roll20), un clic lance quand même le
  // dé et montre le résultat dans un toast discret — aucun panneau de jets.
  function parseDice(expr) {
    var m = /^(\d{1,2})d(\d{1,4})([+-]\d{1,4})?$/i.exec(String(expr || "").replace(/\s/g, ""));
    if (!m) return null;   // expression illisible : doRoll prévient au lieu de lancer autre chose
    return { n: clamp(+m[1], 1, 20), faces: clamp(+m[2], 2, 1000), plus: +(m[3] || 0) };
  }
  // isCheck : vrai pour un jet de test (carac/compétence) — seuls ces jets
  // critent (96+/5-). Les jets d'équipement (dégâts, invu) restent des dés bruts.
  // caracDe : caractéristique propre d'un jet de COMPÉTENCE. Avec le réglage
  // « Au choix » de la barre d'envoi, la macro Roll20 demande alors quelle
  // caractéristique porte le jet (la sienne proposée en premier) : le total
  // envoyé se décompose en (carac choisie) + (stade et modificateur).
  function caracQuery(propre) {
    var ordre = [propre].concat(CHAMPS.filter(function (c) { return c !== propre; }));
    return "?{Caractéristique|" + ordre.map(function (c) { return c + "," + caracTotal(c); }).join("|") + "}";
  }
  function doRoll(label, value, die, isCheck, caracDe) {
    die = die || state.de || DE_DEFAUT;
    // « avec input » ne vaut QUE pour les jets de test : isCheck est vrai
    // exactement aux caractéristiques et aux compétences, faux aux dégâts et
    // à l'invulnérabilité — aucun autre filtre à écrire.
    // Le choix de carac ne vit que sur le canal brut (macro) : les replis
    // (vieille extension, hors Roll20) partent avec la carac automatique.
    var q = (isCheck && caracDe && envCaracChoix()) ? caracQuery(caracDe) : null;
    if (envoyer(cmdJet(label, q ? value - caracTotal(caracDe) : value, die, isCheck && envInput(), q))) return;
    // extension antérieure au canal brut : jet public, sans modificateur
    if (typeof window !== "undefined" && typeof window.__jjkRoll === "function") {
      window.__jjkRoll(die, value, label);
      return;
    }
    var d = parseDice(die);
    // Hors Roll20 la fiche lance le dé elle-même : elle sait faire « NdM ±k »,
    // pas résoudre une macro Roll20 (@{…}, ?{…}), qui n'a de sens que là-bas.
    if (!d) {
      flash(/[@?]\{/.test(String(die))
        ? "« " + die + " » est une macro Roll20 : elle ne se lance que dans Roll20."
        : "Dé illisible : « " + die + " » (attendu : NdM, ex. 1d100).");
      return;
    }
    var dice = [];
    for (var i = 0; i < d.n; i++) dice.push(1 + Math.floor(Math.random() * d.faces));
    var sum = dice.reduce(function (a, b) { return a + b; }, 0) + d.plus;
    var total = sum + value;
    var det = "dé " + dice.join(" + ") + (value ? " " + (value >= 0 ? "+ " : "− ") + Math.abs(value) : "");
    // 96+ au dé : coup critique (le résultat au d100 devient 100) ; 5 ou moins :
    // échec critique (il devient 0). Les modificateurs (d.plus, valeur) restent.
    if (isCheck && d.n === 1 && d.faces === 100) {
      if (dice[0] >= 96) {
        total = 100 + d.plus + value;
        det = "coup critique — le dé devient 100";
      } else if (dice[0] <= 5) {
        total = 0 + d.plus + value;
        det = "échec critique — le dé devient 0";
      }
    }
    flash(label + " : " + total + " (" + det + ")");
  }

  // ---------- envoi d'un élément au tchat ----------
  // Dans Roll20, l'élément part au TCHAT en carte (jjk-roll20-boot.js pose __jjkSay) ;
  // sur le site, il s'affiche en toast. fields : [[libellé, valeur], …],
  // les valeurs vides sont ignorées.
  // Une étiquette VIDE ("") est volontaire : la carte Roll20 rend alors
  // « {{=texte}} », une ligne pleine largeur sans colonne de libellé. Réservée
  // aux TEXTES LONGS (effet d'un passif, description d'un art, avantage…),
  // dont le libellé n'apprend rien que le titre ne dise déjà ; les champs
  // courts et tabulaires (poids, dégâts, quantité…) gardent le leur.
  // Une seule étiquette vide par carte : le template les indexe par clé.
  function sayChat(title, fields) {
    var clean = (fields || []).filter(function (f) { return f && String(f[1] || "").trim(); });
    if (envoyer(cmdCarte(title, clean))) return;
    // extension antérieure au canal brut : carte publique
    if (typeof window !== "undefined" && typeof window.__jjkSay === "function") {
      window.__jjkSay(title, clean);
      return;
    }
    flash(title + (clean.length
      ? " — " + clean.map(function (f) { return f[0] ? f[0] + " : " + f[1] : f[1]; }).join(" · ")
      : ""));
  }
  function chatBtn(getTitle, getFields) {
    return miniBtn("Chat", "Envoyer dans le tchat Roll20", function () {
      sayChat(getTitle(), getFields());
    });
  }

  // ---------- refresh ----------
  // Registres de rafraîchissement : les fonctions rappelées à chaque
  // changement d'état. Il y en a UN PAR MODULE, plus un pour ce qui n'est pas
  // un module (barre d'outils, en-tête, barre d'envoi). Tous sont remis à zéro
  // à chaque mount() (navigation instantanée comprise) pour ne pas s'accumuler.
  //
  // « hooks » désigne le registre COURANT : monteModules le fait pointer sur
  // celui du module en construction, puis le rend. Les briques (textInput,
  // stepper, bigTile, gearBtn…) continuent donc d'écrire dans « hooks » sans
  // rien savoir des modules, et chaque fonction atterrit chez son propriétaire.
  // C'est ce qui permet de museler un module sans toucher aux autres.
  var regHors = [];             // hors module : ce qui encadre les onglets
  var regsModules = {};         // id -> tableau de fonctions (ordre de montage)
  var hooks = regHors;
  var compHooks = [];           // lignes de compétences, vidées par rebuildComps()
  var optHooks = [];            // bloc Options « Modificateurs de compétences », rebâtissable
  var optCompsRebuild = null;   // posé par le module « optcomps » ; rappelé quand les comps perso changent
  // filtres du bloc, survivants au remount comme ceux de la Fiche
  var optFilter = "";
  var optChamp = "";
  var optOnly = COMPACT;        // Roll20 : investies seulement par défaut, comme la Fiche
  var optPerso = true;          // décoché : seules les compétences de base du jeu

  function regModule(id) {
    if (!regsModules[id]) regsModules[id] = [];
    return regsModules[id];
  }
  // Musellement : un module dont le registre jette EN CHAÎNE finit par se
  // taire. Cinq échecs consécutifs, parce qu'un hook peut échouer une fois sur
  // un état transitoire (une frappe en cours) sans être cassé pour autant ;
  // cinq fois d'affilée, c'est le module qui est en faute. Une seule
  // réussite remet le compteur à zéro.
  var MUSELIERE = 5;
  var etatsModules = {};        // id -> { echecs, musele, erreur, panne }
  function etatModule(id) {
    if (!etatsModules[id])
      etatsModules[id] = { echecs: 0, musele: false, erreur: "", panne: "", vide: false };
    return etatsModules[id];
  }
  function messageErreur(e) {
    return String((e && (e.message || e.toString())) || "erreur inconnue");
  }
  // Un registre tourne SOUS SON PROPRE try/catch, fonction par fonction : un
  // hook qui jette n'interrompt plus le rafraîchissement des autres, et ne
  // fige donc plus la fiche entière.
  //
  // Le résultat n'est pas jugé ici mais RETENU dans le bilan de la passe, et
  // le compteur ne bouge qu'une fois la passe finie. C'est nécessaire parce
  // qu'un même id peut avoir DEUX registres (« comps » et « optcomps » ont
  // aussi celui de leurs lignes rebâties) : en jugeant registre par registre,
  // la réussite du premier remettait le compteur à zéro juste avant l'échec du
  // second, et la muselière de ces deux modules-là n'aurait jamais pu tomber.
  function joue(id, reg, bilan) {
    if (etatModule(id).musele) return;
    if (bilan[id] === undefined) bilan[id] = null;   // registre vu, sans échec
    for (var i = 0; i < reg.length; i++) {
      try { reg[i](); } catch (err) { if (!bilan[id]) bilan[id] = err; }
    }
  }
  function refresh() {
    save();
    var bilan = {};
    joue("", regHors, bilan);
    // les clés d'un objet se parcourent dans leur ordre de création : c'est
    // l'ordre de montage des modules, donc l'ordre où les hooks se poussaient
    // avant qu'ils ne soient séparés — l'affichage ne bouge pas
    Object.keys(regsModules).forEach(function (id) { joue(id, regsModules[id], bilan); });
    // deux registres rebâtissables : ils appartiennent à leur module (même id,
    // donc même muselière) mais vivent à part, leurs lignes étant détruites et
    // recréées sans que le module le soit
    joue("comps", compHooks, bilan);
    joue("optcomps", optHooks, bilan);
    Object.keys(bilan).forEach(function (id) {
      var e = etatModule(id);
      if (e.musele) return;
      if (!bilan[id]) { e.echecs = 0; return; }
      e.echecs++;
      e.erreur = messageErreur(bilan[id]);
      // « » n'est pas un module mais ce qui encadre les onglets (barre
      // d'outils, en-tête, barre d'envoi) : le museler éteindrait la fiche
      // elle-même, sans bloc à marquer ni interrupteur pour le rallumer. Ses
      // hooks restent sous try/catch, c'est là qu'est la protection.
      if (id && e.echecs >= MUSELIERE) {
        e.musele = true;
        museleAffiche(id, e);
      }
    });
  }
  // Remplacement d'état COMPLET (import, bibliothèque, nouveau personnage) :
  // toutes les sections tiennent des références sur l'ancien état, on remonte
  // donc la fiche entière depuis le nouvel état.
  var rootEl = null;
  var appEl = null;      // le .perso-atelier monté : porte les jetons de couleur
  // C'est aussi ce que rend ctx.reconstruire et Jjk.remonte. Appelé PENDANT un
  // montage (un mod, un hook), il ne relance rien sur-le-champ : mount() note
  // la demande et l'honore une fois le montage courant fini.
  function remount() { if (rootEl) mount(rootEl); }

  function flash(msg) {
    var f = document.querySelector(".pc-flash") || el("div", "pc-flash");
    f.textContent = msg;
    document.body.appendChild(f);
    f.classList.add("on");
    setTimeout(function () { f.classList.remove("on"); }, 2600);
  }

  // ---------- briques ----------
  function fld(labelTxt, input, span) {
    var w = el("div", "pc-f" + (span ? " " + span : ""));
    w.appendChild(el("label", null, labelTxt));
    w.appendChild(input);
    return w;
  }
  // reg : registre de rafraîchissement (le courant par défaut ; un module qui
  // fabrique un champ APRÈS son montage passe le sien, sinon sa fonction
  // atterrirait chez le voisin et échapperait à sa muselière).
  function textInput(get, set, placeholder, reg) {
    var i = el("input");
    i.type = "text";
    if (placeholder) i.placeholder = placeholder;
    i.value = get() || "";
    i.addEventListener("input", function () { set(i.value); refresh(); });
    (reg || hooks).push(function () { if (document.activeElement !== i) i.value = get() || ""; });
    return i;
  }
  function miniBtn(txt, title, fn, cls) {
    var b = el("button", "pc-mini" + (cls ? " " + cls : ""), txt);
    b.type = "button";
    if (title) b.title = title;
    b.addEventListener("click", fn);
    return b;
  }
  function stepBtn(txt, title, fn) {
    var b = el("button", null, txt);
    b.type = "button";
    if (title) b.title = title;
    b.addEventListener("click", fn);
    return b;
  }
  // stepper −/champ/+ : le champ du milieu est éditable (pc-num).
  // reg : registre de rafraîchissement (hooks par défaut ; optHooks pour le
  // bloc rebâtissable des modificateurs de compétences, comme multiMod).
  function stepper(get, set, step, title, reg) {
    var w = el("span", "pc-step");
    w.appendChild(stepBtn("−", title ? "− " + step : null, function () { set(get() - step); refresh(); }));
    var i = el("input", "pc-num");
    i.type = "number";
    i.value = get();
    i.addEventListener("input", function () {
      var v = parseInt(i.value, 10);
      if (isFinite(v)) { set(v); refresh(); }
    });
    (reg || hooks).push(function () { if (document.activeElement !== i) i.value = get(); });
    w.appendChild(i);
    w.appendChild(stepBtn("+", title ? "+ " + step : null, function () { set(get() + step); refresh(); }));
    return w;
  }
  // trois petits champs ± (équipement / art / décision du MJ), sommés dans la
  // valeur effective ; discrets, révélés au survol de l'hôte (.pc-mods-host).
  // reg : registre de rafraîchissement (hooks, ou compHooks pour les lignes de
  // compétences reconstruites par rebuildComps — un hook global y fuirait).
  var MMOD_SLOTS = ["équipement", "art", "autre"];
  // slots : 3 par défaut ; 1 pour les lignes trop denses (compétences), comme
  // les compétences personnalisées de la fiche HxH
  function multiMod(map, key, reg, slots) {
    reg = reg || hooks;
    slots = slots || 3;
    var wrap = el("span", "pc-mmods");
    function arr() {
      if (!map[key]) map[key] = [0, 0, 0];
      return map[key];
    }
    for (var i = 0; i < slots; i++) (function (i) {
      var inp = el("input", "pc-mmod");
      inp.type = "number"; inp.step = "any"; inp.placeholder = "0";
      inp.title = slots === 1
        ? "Bonus ou malus divers (équipement, art, autre)."
        : "Bonus ou malus divers (" + MMOD_SLOTS[i] + ") — emplacement " +
          (i + 1) + " sur " + slots + " ; les modificateurs s'additionnent.";
      var v0 = map[key] ? map[key][i] : 0;
      inp.value = v0 ? v0 : "";
      inp.classList.toggle("neg", v0 < 0);
      inp.addEventListener("input", function () {
        var n = parseFloat(String(inp.value).replace(",", "."));
        arr()[i] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -999, 999) : 0;
        inp.classList.toggle("neg", arr()[i] < 0);
        refresh();
      });
      reg.push(function () {
        if (document.activeElement !== inp) {
          var v = map[key] ? map[key][i] : 0;
          inp.value = v ? v : "";
          inp.classList.toggle("neg", v < 0);
        }
      });
      wrap.appendChild(inp);
    })(i);
    return wrap;
  }
  // ---------- mode édition par module ----------
  // Chaque module éditable porte un rouage dans son titre : il déverrouille la
  // CONSTRUCTION du personnage (stades, ajouts, suppressions, textes, divers…).
  // Hors édition, seuls les gestes de JEU restent actifs : jets, tchat, PV
  // courant, narration, quantités d'objets, notes de session. Les éléments
  // .pc-edit-only n'existent qu'en édition ; les champs .pc-edit-field
  // deviennent inertes (disabled + air d'un simple texte). Réglage d'interface
  // pur : ni dans l'état du personnage, ni persisté — chaque chargement
  // repart verrouillé.
  var editMods = {};
  function isEdit(id) { return !!editMods[id]; }
  function applyEdit(scope, id) {
    scope.classList.toggle("editing", isEdit(id));
    Array.prototype.forEach.call(scope.querySelectorAll(".pc-edit-field"), function (f) {
      f.disabled = !isEdit(id);
    });
  }
  function gearBtn(scope, id, onToggle) {
    var g = el("button", "pc-gear", "⚙");
    g.type = "button";
    g.title = "Modifier ce module";
    g.addEventListener("click", function () {
      editMods[id] = !editMods[id];
      g.title = isEdit(id) ? "Terminer les modifications" : "Modifier ce module";
      applyEdit(scope, id);
      if (onToggle) onToggle();
    });
    // resynchronise aussi les éléments recréés par les rebuilds internes
    hooks.push(function () { applyEdit(scope, id); });
    return g;
  }
  function block(title, small, editId, onToggle) {
    var b = el("div", "pc-block");
    var t = el("div", "pc-block-title", title);
    if (small) t.appendChild(el("small", null, small));
    if (editId) {
      b.classList.add("pc-editable");
      b.dataset.module = editId;
      t.appendChild(gearBtn(b, editId, onToggle));
    }
    b.appendChild(t);
    return b;
  }
  // reg : registre de rafraîchissement, comme textInput
  function bigTile(label, getV, onClick, reg) {
    var d = el("div", "pc-big" + (onClick ? " pc-rollable" : ""));
    d.appendChild(el("span", "k", label));
    var v = el("span", "v", "");
    d.appendChild(v);
    (reg || hooks).push(function () { v.textContent = String(getV()); });
    if (onClick) d.addEventListener("click", onClick);
    return d;
  }

  // ---------- barre d'outils + bibliothèque ----------
  function buildTop(container) {
    if (COMPACT) return;   // dans Roll20, la fiche EST le personnage
    var top = el("div", "pc-top");
    top.appendChild(el("span", "pc-top-title", "Fiche JJK"));
    top.appendChild(el("span", "pc-top-hint", "Créateur de personnage — règles de base JJK"));

    var lib = el("div", "pc-lib");
    var sel = el("select");
    function fillSel() {
      sel.innerHTML = "";
      var o0 = el("option", null, "— Bibliothèque —");
      o0.value = "";
      sel.appendChild(o0);
      loadPersos().forEach(function (p) {
        var o = el("option", null, p.name || "Sans nom");
        o.value = p.id;
        sel.appendChild(o);
      });
    }
    fillSel();
    lib.appendChild(sel);

    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Charger");
      b.type = "button";
      b.addEventListener("click", function () {
        var p = loadPersos().filter(function (q) { return q.id === sel.value; })[0];
        if (!p) { flash("Choisir un personnage dans la liste."); return; }
        try { state = normalize(JSON.parse(JSON.stringify(p.state))); }
        catch (e) { flash("Fiche illisible."); return; }
        remount();
        flash("« " + (p.name || "Sans nom") + " » chargé.");
      });
      return b;
    })());
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Enregistrer");
      b.type = "button";
      b.title = "Enregistrer le personnage courant dans la bibliothèque";
      b.addEventListener("click", function () {
        var persos = loadPersos();
        var name = state.name || "Sans nom";
        var existing = null;
        persos.forEach(function (p) { if (p.name === name) existing = p; });
        var copy = JSON.parse(JSON.stringify(state));
        if (existing) { existing.state = copy; existing.updated = nowStamp(); }
        else persos.push({ id: "p" + Date.now().toString(36), name: name, state: copy, updated: nowStamp() });
        savePersos(persos);
        fillSel();
        flash("« " + name + " » enregistré.");
      });
      return b;
    })());
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Supprimer");
      b.type = "button";
      b.className = "pc-btn danger";
      b.title = "Supprimer le personnage choisi de la bibliothèque";
      b.addEventListener("click", function () {
        if (!sel.value) { flash("Choisir un personnage dans la liste."); return; }
        savePersos(loadPersos().filter(function (q) { return q.id !== sel.value; }));
        fillSel();
      });
      return b;
    })());
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Nouveau");
      b.type = "button";
      b.addEventListener("click", function () { state = blank(); remount(); });
      return b;
    })());
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Exporter");
      b.type = "button";
      b.addEventListener("click", function () {
        var a = document.createElement("a");
        a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        a.download = (state.name || "personnage-jjk") + ".json";
        a.click();
      });
      return b;
    })());
    var file = el("input");
    file.type = "file"; file.accept = "application/json"; file.style.display = "none";
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          state = normalize(JSON.parse(r.result));
          remount();
          flash("Personnage importé.");
        } catch (e) { flash("JSON illisible."); }
        file.value = "";
      };
      r.readAsText(f);
    });
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Importer");
      b.type = "button";
      b.addEventListener("click", function () { file.click(); });
      return b;
    })());
    lib.appendChild(file);
    top.appendChild(lib);
    container.appendChild(top);
  }

  // ---------- en-tête : portrait + identité + compteurs + garde-fous ----------
  // En-tête réduit aux seules infos importantes (2026-08-02) : plus de
  // portrait ni de cartouche « JJK Système JDR » ; PV, Vitesse et Narration
  // (doublons en lecture seule de l'onglet Fiche) n'y figurent plus.
  //   Nom | Espèce | Âge | Sexe | Genre
  //   Création ———— | XP dépensé ———— | XP total
  // ---------- barre d'envoi (Roll20 seulement) ----------
  // À qui part la macro, et faut-il demander un modificateur. Geste de JEU :
  // aucun rouage, aucun mode édition. Posée en FRÈRE de .pc-head, jamais dans
  // .pc-id (dont les 12 colonnes sont pleines, et dont la hauteur commande la
  // taille du portrait).
  function buildEnvoi(sheet) {
    if (!COMPACT) return;   // hors Roll20 il n'y a pas de tchat : rien à régler
    var bar = el("div", "pc-envoi");
    bar.appendChild(el("span", "lbl", "Envoi"));

    var destSel = el("select", "pc-select");
    destSel.title = "Destinataire du chuchotement";
    var editNoms = null;

    function majDest() {
      var joueur = envMode() === "joueur";
      destSel.style.display = joueur ? "" : "none";
      if (editNoms) editNoms.style.display = joueur && !listeRoll20 ? "" : "none";
    }

    // segments : Publique | Au MJ | À un joueur
    var segs = el("div", "pc-envoi-segs");
    var boutons = [];
    [["public", "Publique", "Tout le monde voit la carte"],
     ["gm", "Au MJ", "Chuchoté au MJ (/w gm)"],
     ["joueur", "À un joueur", "Chuchoté au joueur choisi à droite"]].forEach(function (o) {
      var b = el("button", "seg" + (envMode() === o[0] ? " on" : ""), o[1]);
      b.type = "button";
      b.title = o[2];
      b.addEventListener("click", function () {
        lset(ENVOI.mode, o[0]);
        boutons.forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        majDest();
        if (o[0] === "joueur") demanderJoueurs();
      });
      boutons.push(b);
      segs.appendChild(b);
    });
    bar.appendChild(segs);

    // liste des destinataires : celle de Roll20 si l'extension sait la donner,
    // sinon celle que l'utilisateur saisit (et qui reste dans son navigateur)
    var listeRoll20 = null;
    function nomsManuels() {
      return lpref(ENVOI.noms, "").split("\n").map(function (s) { return s.trim(); })
        .filter(function (s) { return s; });
    }
    function remplirDest(noms) {
      var actuel = envDest();
      destSel.innerHTML = "";
      if (!noms.length) {
        var vide = el("option", null, listeRoll20 ? "Aucun autre joueur connecté" : "Aucun joueur enregistré");
        vide.value = "";
        destSel.appendChild(vide);
      }
      noms.forEach(function (n) {
        var o = el("option", null, n);
        o.value = n;
        if (n === actuel) o.selected = true;
        destSel.appendChild(o);
      });
      // un destinataire choisi avant que la liste change reste sélectionnable
      if (actuel && noms.indexOf(actuel) < 0) {
        var o2 = el("option", null, actuel + " (absent)");
        o2.value = actuel; o2.selected = true;
        destSel.appendChild(o2);
      }
      // Ce qui est AFFICHÉ est ce qui sera utilisé. Sans cette ligne, un
      // sélecteur qui ne porte qu'un nom n'émet jamais « change » (le
      // navigateur le choisit tout seul) : le destinataire restait vide et la
      // macro repartait en public alors que son nom s'affichait.
      lset(ENVOI.dest, destSel.value);
    }
    destSel.addEventListener("change", function () { lset(ENVOI.dest, destSel.value); });
    // Roll20 ne livre sa liste que par l'extension (la fiche est une iframe
    // d'une autre origine) : si elle ne répond pas, la saisie manuelle prend
    // le relais et rien n'est perdu.
    function demanderJoueurs() {
      if (typeof window.__jjkPlayers !== "function") { remplirDest(nomsManuels()); return; }
      window.__jjkPlayers(function (noms) {
        if (noms && noms.length) {
          listeRoll20 = noms;
          remplirDest(noms);
        } else remplirDest(nomsManuels());
        majDest();
      });
    }
    bar.appendChild(destSel);

    editNoms = miniBtn("Joueurs…", "Saisir les noms des joueurs de la table", function () {
      var corps = el("div", "pc-modal-body");
      corps.appendChild(el("div", "pc-modal-note",
        "Un nom par ligne, tel qu'il s'affiche dans Roll20. Cette liste reste dans ce navigateur."));
      var ta = el("textarea", "pc-notes");
      ta.rows = 6;
      ta.value = lpref(ENVOI.noms, "");
      corps.appendChild(ta);
      dialogue("Joueurs de la table", corps, function () {
        lset(ENVOI.noms, ta.value);
        remplirDest(nomsManuels());
      }, "Enregistrer");
    });
    bar.appendChild(editNoms);

    // sans input / avec input : la requête ?{…} n'a de sens que sur un jet de
    // test, elle est donc posée par doRoll et ignorée partout ailleurs
    var sep = el("span", "lbl", "Modificateur");
    sep.title = "Ne s'applique qu'aux jets de caractéristique et de compétence";
    bar.appendChild(sep);
    var segs2 = el("div", "pc-envoi-segs");
    var bin = [];
    [["0", "Sans input", "Le jet part tel quel"],
     ["1", "Avec input", "Roll20 demande un modificateur avant de lancer"]].forEach(function (o) {
      var b = el("button", "seg" + ((envInput() ? "1" : "0") === o[0] ? " on" : ""), o[1]);
      b.type = "button";
      b.title = o[2];
      b.addEventListener("click", function () {
        lset(ENVOI.input, o[0]);
        bin.forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      });
      bin.push(b);
      segs2.appendChild(b);
    });
    bar.appendChild(segs2);

    // automatique / au choix : sur un jet de COMPÉTENCE, « au choix » fait
    // demander par Roll20 quelle caractéristique porte le jet (Body / Mind /
    // Prestance, la sienne en tête) — ex. une Esquive lancée sur la Prestance.
    var sep3 = el("span", "lbl", "Caractéristique");
    sep3.title = "Ne s'applique qu'aux jets de compétence";
    bar.appendChild(sep3);
    var segs3 = el("div", "pc-envoi-segs");
    var cbtn = [];
    [["0", "Automatique", "La compétence part avec sa caractéristique"],
     ["1", "Au choix", "Roll20 demande quelle caractéristique utiliser avant de lancer"]].forEach(function (o) {
      var b = el("button", "seg" + ((envCaracChoix() ? "1" : "0") === o[0] ? " on" : ""), o[1]);
      b.type = "button";
      b.title = o[2];
      b.addEventListener("click", function () {
        lset(ENVOI.carac, o[0]);
        cbtn.forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      });
      cbtn.push(b);
      segs3.appendChild(b);
    });
    bar.appendChild(segs3);

    sheet.appendChild(bar);
    remplirDest(nomsManuels());
    majDest();
    demanderJoueurs();
  }

  function buildHead(sheet) {
    var head = el("div", "pc-head");
    var idBox = el("div", "pc-id");   // créé tôt : le portrait s'aligne sur sa hauteur

    // portrait compact 1:1, coins arrondis. L'URL s'édite EN PLACE au clic
    // (jamais prompt() : muet dans l'iframe Roll20 sous Chrome).
    var pbox = el("div", "pc-portrait-box");
    pbox.title = "Portrait — clic : changer l'image (URL)";
    var pclip = el("div", "clip");
    var pimg = el("img");
    pimg.alt = "";
    pclip.appendChild(pimg);
    var pph = el("span", "ph", "?");
    pclip.appendChild(pph);
    pbox.appendChild(pclip);
    hooks.push(function () {
      var want = state.portrait || "";
      if (pimg.getAttribute("src") !== want) {
        if (want) pimg.src = want;
        else pimg.removeAttribute("src");
      }
      pbox.classList.toggle("vide", !want);
    });
    var pedit = null;
    pbox.addEventListener("click", function () {
      if (pedit) return;
      pedit = el("input", "pc-portrait-edit");
      pedit.type = "text";
      pedit.placeholder = "URL de l'image…";
      pedit.value = state.portrait || "";
      pedit.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); pedit.blur(); }
        else if (e.key === "Escape") { pedit.value = state.portrait || ""; pedit.blur(); }
      });
      pedit.addEventListener("blur", function () {
        state.portrait = pedit.value.trim();
        if (pedit) { pedit.remove(); pedit = null; }
        refresh();
      });
      pbox.appendChild(pedit);
      setTimeout(function () { pedit.focus(); pedit.select(); }, 0);
    });
    head.appendChild(pbox);
    // carré 1:1 haut comme l'en-tête : largeur = hauteur MESURÉE (le transfert
    // aspect-ratio depuis un étirement flex n'est pas fiable sous Firefox).
    // Le carré fait la hauteur de l'en-tête PARTOUT (site, dialogue Roll20,
    // fenêtre séparée) : côté = hauteur du bloc d'identité, plafonné pour ne
    // pas dévorer la largeur quand l'en-tête se replie sur trois lignes.
    // Les deux dimensions sont posées en dur : aucun transfert aspect-ratio
    // (infiable depuis un étirement flex) et aucune règle de largeur en CSS.
    // Boucle bornée : régler le côté rétrécit le bloc d'identité, qui peut se
    // replier et changer de hauteur — on repasse au plus 3 fois, puis on garde.
    var PORTRAIT_MAX = 6;   // rem
    function carrePortrait(passe) {
      var un = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      var cible = Math.min(idBox.offsetHeight, Math.round(PORTRAIT_MAX * un));
      if (!cible) return;
      var actuel = parseFloat(pbox.style.width) || 0;
      if (Math.abs(actuel - cible) <= 1) return;
      pbox.style.width = cible + "px";
      pbox.style.height = cible + "px";
      if ((passe || 0) < 3) carrePortrait((passe || 0) + 1);
    }
    hooks.push(function () { carrePortrait(0); });
    setTimeout(function () { carrePortrait(0); }, 0);
    // suit les redimensionnements de la fenêtre (dialogue Roll20, popout)
    try { new ResizeObserver(function () { carrePortrait(0); }).observe(idBox); } catch (e) {}

    var id = idBox;
    id.appendChild(fld("Nom", textInput(function () { return state.name; }, function (v) { state.name = v; }, "Nom du personnage"), "c4"));
    id.appendChild(fld("Espèce", textInput(function () { return state.espece; }, function (v) { state.espece = v; }), "c2"));
    id.appendChild(fld("Âge", textInput(function () { return state.age; }, function (v) { state.age = v; }), "c2"));
    id.appendChild(fld("Sexe", textInput(function () { return state.sexe; }, function (v) { state.sexe = v; }), "c2"));
    id.appendChild(fld("Genre", textInput(function () { return state.genre; }, function (v) { state.genre = v; }), "c2"));

    // 2e ligne : compteurs de budgets + XP total
    var mrow = el("div", "pc-id-meters");
    function meter(label, getUsed, getTotal) {
      var m = el("span", "pc-meter");
      m.appendChild(el("span", null, label));
      var b = el("b", null, "");
      m.appendChild(b);
      var bar = el("span", "bar");
      var fill = el("i");
      bar.appendChild(fill);
      m.appendChild(bar);
      hooks.push(function () {
        var used = getUsed(), total = getTotal();
        b.textContent = used + " / " + total;
        var over = used > total;
        b.classList.toggle("over", over);
        fill.classList.toggle("over", over);
        fill.style.width = clamp(total ? (used / total) * 100 : 0, 0, 100) + "%";
      });
      return m;
    }
    mrow.appendChild(meter("Création", ptsCreation, function () { return PTS_CREATION; }));
    mrow.appendChild(meter("XP dépensé", xpDepense, function () { return state.xpTotal; }));
    var xpIn = el("input", null);
    xpIn.type = "number"; xpIn.min = 0; xpIn.step = 5;
    xpIn.value = state.xpTotal;
    xpIn.addEventListener("input", function () {
      var v = parseInt(xpIn.value, 10);
      if (isFinite(v)) { state.xpTotal = Math.max(0, v); refresh(); }
    });
    hooks.push(function () { if (document.activeElement !== xpIn) xpIn.value = state.xpTotal; });
    mrow.appendChild(fld("XP total", xpIn));
    id.appendChild(mrow);

    head.appendChild(id);
    sheet.appendChild(head);
    buildEnvoi(sheet);

    // garde-fous
    var warns = el("div", "pc-warns");
    hooks.push(function () {
      warns.innerHTML = "";
      if (ptsCreation() > PTS_CREATION)
        warns.appendChild(el("div", "pc-warn", "Points de création dépassés : " + ptsCreation() + " / " + PTS_CREATION + "."));
      if (xpRestant() < 0)
        warns.appendChild(el("div", "pc-warn", "XP dépensé au-delà du total (" + xpDepense() + " / " + state.xpTotal + ")."));
      var cap = compCap();
      Object.keys(state.comps).forEach(function (k) {
        if (compXp(state.comps[k]) > cap)
          warns.appendChild(el("div", "pc-warn", "« " + k.split("/").slice(1).join("/") + " » dépasse le quart de l'xp total (" + compXp(state.comps[k]) + " / " + cap + " xp)."));
      });
    });
    sheet.appendChild(warns);
  }

  // ---------- onglets ----------
  var TABS = [
    { id: "fiche", label: "Fiche" },
    { id: "art", label: "Art" },
    { id: "equipement", label: "Équipement" },
    { id: "bio", label: "Bio" },
    { id: "options", label: "Options" }
  ];
  function buildTabs(sheet) {
    var bar = el("div", "pc-tabs");
    var panes = {};
    var btns = {};
    TABS.forEach(function (t) {
      var b = el("div", "pc-tab", t.label);
      b.addEventListener("click", function () { activate(t.id); });
      bar.appendChild(b);
      btns[t.id] = b;
      panes[t.id] = el("div", "pc-pane");
      // l'onglet se nomme sur son panneau : c'est le seul moyen, de l'extérieur,
      // de dire dans QUELLE colonne de QUEL onglet un module a atterri
      panes[t.id].dataset.tab = t.id;
    });
    function activate(id) {
      if (!panes[id]) id = "fiche";
      TABS.forEach(function (t) {
        btns[t.id].classList.toggle("on", t.id === id);
        panes[t.id].classList.toggle("on", t.id === id);
      });
      setTab(id);
    }
    sheet.appendChild(bar);
    TABS.forEach(function (t) { sheet.appendChild(panes[t.id]); });
    activate(curTab());
    return panes;
  }

  // ---------- registre de modules ----------
  // Un module = un bloc autonome de la fiche, désigné par un id STABLE (celui
  // que porte son attribut data-module, et sur lequel les sondes s'accrochent).
  // Le registre ne fait rien de plus que ce que le montage faisait en dur : il
  // le rend NOMMABLE. C'est la condition pour qu'un mod puisse un jour se
  // substituer à un module natif, ou changer la disposition, sans qu'on
  // rouvre ce fichier.
  //
  // Un module se décrit ainsi :
  //   id      identifiant stable, unique
  //   titre   ce que le module affiche (pour les réglages de disposition)
  //   onglet  clé d'un onglet de TABS
  //   colonne clé d'une colonne du squelette de cet onglet
  //   pour    prédicat facultatif : le module n'existe que s'il rend vrai
  //   build   fonction sans effet de bord sur la page : elle RETOURNE son bloc
  var modules = [];        // dans l'ordre de déclaration
  var moduleOrdre = [];    // ordre partiel demandé par ordonne() ; brut, filtré au montage
  var placeOrigine = {};   // id -> place déclarée, relevée au montage avant toute consigne

  function rangModule(id) {
    for (var i = 0; i < modules.length; i++) if (modules[i].id === id) return i;
    return -1;
  }
  // Un id DÉJÀ PRÉSENT est REMPLACÉ, À SA PLACE : c'est ainsi qu'un mod se
  // substitue à un module natif. Le renvoyer en fin de colonne changerait la
  // disposition en douce, ce que personne n'a demandé.
  function enregistre(m) {
    var i = rangModule(m.id);
    // QUI a enregistré ce module. Un mod pose presque toujours un module dont
    // l'id diffère du sien : sans cette marque, ni la purge de horsMontage ni
    // les filtres du module ne sauraient remonter jusqu'au mod que le joueur
    // refuse ou supprime. Posée une fois pour toutes, elle survit au rejeu.
    if (m && modEnExec && !m.__mod) m.__mod = modEnExec;
    if (i >= 0) modules[i] = m;
    else modules.push(m);
    // Hors montage (console du navigateur, script tiers chargé après la fiche) :
    // le prochain mount() remet la table à la table native, et rien ne
    // rejouerait cet enregistrement. On le garde donc, comme le montage rejoue
    // les mods à chaque fois. Le propriétaire est le MOD s'il y en a un, sinon
    // l'id du module : c'est par lui que le rejeu saura s'il a encore un ayant
    // droit (rejoueHorsMontage).
    if (!enMontage)
      gardeHorsMontage({ mod: m, prop: (m && (m.__mod || m.id)) ? String(m.__mod || m.id) : "?" });
    return m;
  }
  // Ordre PARTIEL : les id listés passent devant, dans l'ordre donné ; tous les
  // autres suivent à leur rang de déclaration. La liste est gardée BRUTE et
  // filtrée seulement au montage : un id peut nommer un module pas encore
  // enregistré (un mod chargé après), et un module retiré un jour ne doit pas
  // casser une disposition enregistrée.
  function ordonne(liste) {
    moduleOrdre = [];
    if (!liste) return;
    for (var i = 0; i < liste.length; i++)
      if (moduleOrdre.indexOf(liste[i]) < 0) moduleOrdre.push(liste[i]);
  }
  function ordreModules() {
    var vus = {}, out = [];
    moduleOrdre.forEach(function (id) {
      var i = rangModule(id);
      if (i >= 0 && !vus[id]) { vus[id] = 1; out.push(modules[i]); }
    });
    modules.forEach(function (m) {
      if (!vus[m.id]) { vus[m.id] = 1; out.push(m); }
    });
    return out;
  }

  // Squelette de chaque onglet : ses colonnes, dans l'ordre exact où elles
  // existaient avant le registre. Il vit ici, et pas dans les modules, pour
  // qu'un mod n'ait qu'un bloc à fournir sans rien savoir de la charpente.
  var SQUELETTES = {
    fiche: function (pane) {
      // trois colonnes : narration, caractéristiques, langues | initiative,
      // vitesse, régén, PV, armes | compétences (Body, Mind, Prestance)
      var cols = el("div", "pc-cols-fiche");
      var c1 = el("div", "pc-col");
      var c2 = el("div", "pc-col");
      var c3 = el("div", "pc-col");
      cols.appendChild(c1);
      cols.appendChild(c2);
      cols.appendChild(c3);
      pane.appendChild(cols);
      return { gauche: c1, milieu: c2, droite: c3 };
    },
    art: function (pane) {
      return { seule: pane };   // un seul bloc, sur toute la largeur
    },
    equipement: function (pane) {
      var cols = el("div", "pc-cols2");
      var left = el("div", "pc-col");
      var right = el("div", "pc-col");
      cols.appendChild(left);
      cols.appendChild(right);
      pane.appendChild(cols);
      // « bas » = sous les deux colonnes, pleine largeur (l'inventaire)
      return { gauche: left, droite: right, bas: pane };
    },
    bio: function (pane) {
      var cols = el("div", "pc-cols2");
      var left = el("div", "pc-col");
      var right = el("div", "pc-col");
      cols.appendChild(left);
      cols.appendChild(right);
      pane.appendChild(cols);
      return { gauche: left, droite: right };
    },
    options: function (pane) {
      var cols = el("div", "pc-cols2");
      var colA = el("div", "pc-col");
      var colB = el("div", "pc-col");
      cols.appendChild(colA);
      cols.appendChild(colB);
      pane.appendChild(cols);
      return { gauche: colA, droite: colB };
    }
  };

  // L'interrupteur du module. Seuls les modules COUPÉS figurent dans
  // state.modActifs : tout le reste est actif, y compris un module inconnu de
  // la fiche qui l'ouvre.
  function actif(id) {
    return !state || !state.modActifs || state.modActifs[id] !== false;
  }
  // Couper un module le retire de la fiche sans rien effacer : son coffre et
  // ses données restent, il ne s'affiche plus. C'est le corps de Jjk.active,
  // NOMMÉ ici parce que le bloc Options « Modules » s'en sert aussi : son
  // interrupteur ne doit pas passer par un window.Jjk qu'un mod peut remplacer.
  function activeModule(id, oui) {
    if (!state) return;                  // avant le chargement : rien à couper
    if (!state.modActifs) state.modActifs = {};
    // Le bloc des réglages ne se coupe pas, et le REFUS EST ICI, dans l'écriture,
    // pas seulement dans le montage. Sinon un mod qui appelle Jjk.active laisse
    // « modules: false » dans le personnage pour toujours : le bloc s'affiche
    // (le montage l'exempte) pendant que Jjk.actif("modules") répond faux, et le
    // personnage transmis emporte une incohérence que rien n'efface.
    if (String(id) === MODULE_REGLAGES) { delete state.modActifs[id]; save(); return; }
    if (oui === false) state.modActifs[id] = false;
    else delete state.modActifs[id];
    save();
  }
  var elModules = {};   // id -> l'élément monté (pour marquer une muselière)
  // Le bloc des réglages d'affichage, nommé une fois pour toutes : trois
  // endroits doivent l'épargner, et un id recopié à la main finirait par
  // manquer à l'un d'eux.
  var MODULE_REGLAGES = "modules";

  function monteModules(panes) {
    var colonnes = {};
    elModules = {};
    TABS.forEach(function (t) {
      if (SQUELETTES[t.id] && panes[t.id]) colonnes[t.id] = SQUELETTES[t.id](panes[t.id]);
    });
    ordreModules().forEach(function (m) {
      // Le bloc des réglages ne se coupe pas. Sa puce est déjà absente de la
      // liste, mais un mod (ou une ligne de console) qui appelle
      // Jjk.active("modules", false) écrit le refus DANS LE PERSONNAGE : le
      // bloc ne se monterait plus, et avec lui disparaîtrait le seul endroit
      // d'où l'on rallume un module ou d'où l'on rend la disposition d'origine.
      // Le blocage voyagerait même avec le personnage.
      //
      // Ce test passe AVANT celui de l'hôte : un module coupé n'affiche rien
      // parce que le joueur l'a voulu, il n'a pas à porter la mention de ceux
      // qui ne trouvent pas leur place.
      if (m.id !== MODULE_REGLAGES && !actif(m.id)) return;   // coupé : pas monté
      // « pour » de la table native est un PRÉDICAT (le module n'existe que
      // s'il rend vrai) ; celui d'un mod est une version, gérée ailleurs.
      // Il passe par moduleAffichable, qui l'attrape : un prédicat qui jette
      // emportait sinon TOUT le montage, donc la fiche, sans rien pour rouvrir.
      // Lui aussi avant l'hôte : un module qui n'existe pas ici n'a rien à dire
      // de sa colonne, et le bloc Modules ne lui donne d'ailleurs pas de ligne.
      if (!moduleAffichable(m)) return;
      // Onglet ou colonne inconnus : le module est laissé de côté (un mod mal
      // réglé ne doit pas emporter toute la fiche), mais il est MARQUÉ. Sans ce
      // « vide », un module qui déclare une colonne absente de son onglet ne
      // s'affiche nulle part ET ne se plaint nulle part : sa ligne du bloc
      // Modules le donne pour un module ordinaire, et le joueur cherche une
      // panne qui n'existe pas. aClef, et pas une simple lecture : une colonne
      // nommée « constructor » rendrait autrement une méthode d'Object en guise
      // d'hôte, et le montage tomberait sur le premier appendChild.
      var cols = colonnes[m.onglet];
      var hote = (cols && aClef(cols, m.colonne)) ? cols[m.colonne] : null;
      if (!hote) { etatModule(m.id).vide = true; return; }
      // le module construit DANS son propre registre : tout ce que ses briques
      // y poussent lui appartient, et lui seul en répond
      var reg = regModule(m.id);
      var precedent = hooks;
      // même idée pour les filtres : ceux qu'un module pose pendant son build
      // portent son id, et c'est lui que le journal nomme s'ils déraillent
      var propPrecedent = proprietaireCourant;
      var e;
      hooks = reg;
      // le MOD qui a posé ce module, s'il vient d'un mod : c'est lui l'ayant
      // droit de ce que le build enregistre, pas l'id du bloc
      proprietaireCourant = m.__mod || m.id;
      try {
        e = m.build(contexte(m, reg));
        // build qui rend autre chose qu'un ÉLÉMENT (une chaîne, un objet, un
        // texte) : rien à monter, et surtout rien qui porte un dataset. Le
        // traiter comme un build muet coûte un bloc ; le poser dans la page
        // coûtait la fiche entière.
        if (e && e.nodeType !== 1) e = null;
        // les modules à rouage se sont déjà nommés (block() pose data-module) ;
        // les autres le reçoivent ici, pour que TOUS soient repérables. DANS le
        // try : c'est encore le module qui répond de ce qu'il a rendu.
        if (e && !e.dataset.module) e.dataset.module = m.id;
        etatModule(m.id).panne = "";
      } catch (err) {
        // build a pu pousser des fonctions avant de tomber : elles pointent
        // sur un bloc à moitié bâti et jetteraient à chaque rafraîchissement
        reg.length = 0;
        e = blocEnPanne(m, err);
      }
      hooks = precedent;
      proprietaireCourant = propPrecedent;
      // build qui ne rend rien : ce n'est PAS une erreur (un module a le droit
      // de s'effacer), mais la liste des modules doit pouvoir le signaler
      etatModule(m.id).vide = !e;
      if (!e) return;
      // L'INSERTION AUSSI PEUT JETER, et c'était la dernière porte par laquelle
      // un mod fermait la fiche. Un build qui rend document.body (ou n'importe
      // quel ancêtre du point de montage) fait lever appendChild : hors try,
      // l'exception sortait de mount(), la feuille restait à moitié bâtie, et
      // comme le mod voyage avec le personnage cela recommençait à CHAQUE
      // ouverture, sans une ligne d'interface pour le couper. Ici, c'est une
      // carte de panne comme une autre, avec son bouton Désactiver.
      try {
        hote.appendChild(e);
        elModules[m.id] = e;
      } catch (err2) {
        reg.length = 0;
        var carte = blocEnPanne(m, err2);
        elModules[m.id] = carte;
        // la carte de panne, elle, est bâtie ici : elle s'insère forcément
        hote.appendChild(carte);
      }
    });
  }

  // ---------- isolation des pannes ----------
  // Un module dont build() jette ne fait pas tomber la fiche : il rend cette
  // carte à sa place, et le montage continue. Réessayer le reconstruit (une
  // panne peut tenir à l'état du moment) ; Désactiver le retire de la fiche
  // sans rien effacer de ce qu'il porte.
  function blocEnPanne(m, err) {
    var msg = messageErreur(err);
    etatModule(m.id).panne = msg;
    if (window.console && window.console.error) window.console.error("[mod:" + m.id + "]", err);
    var b = el("div", "pc-block");
    b.dataset.module = m.id;
    b.dataset.panne = "1";
    var t = el("div", "pc-block-title", m.titre || m.id);
    // la page Mods promet un cadre qui donne l'ID du module et le message :
    // c'est l'id, pas le titre, qui sert à retrouver le mod dans la liste et
    // dans le journal du navigateur (« [mod:<id>] »)
    t.appendChild(el("small", null, "module en panne — " + m.id));
    b.appendChild(t);
    b.appendChild(el("div", "pc-empty", msg));
    var tools = el("div", "pc-comp-tools");
    var line = el("div", "row");
    line.appendChild(miniBtn("Réessayer", "Reconstruire ce module", function () {
      delete etatsModules[m.id];
      remount();
    }));
    // Pas de « Désactiver » pour le bloc des réglages, même en panne : le
    // couper retirerait le seul endroit d'où l'on rallume un module, y compris
    // lui-même. « Réessayer » reste, et le montage suivant lui redonne sa
    // chance ; les modules coupés le sont, eux, sans que la fiche s'en mêle.
    if (m.id !== MODULE_REGLAGES)
      line.appendChild(miniBtn("Désactiver", "Retirer ce module de la fiche : rien n'est perdu, il ne s'affiche plus.", function () {
        // même garde que __jjkModules.active : une panne peut survenir sur un
        // état remplacé à la main (import, bibliothèque) qui n'est pas repassé
        // par normalize(), et la clé manquerait
        if (!state.modActifs) state.modActifs = {};
        state.modActifs[m.id] = false;
        save();
        remount();
      }, "danger"));
    tools.appendChild(line);
    b.appendChild(tools);
    return b;
  }
  // Muselé : le module garde son bloc (ses valeurs sont celles du dernier
  // rafraîchissement réussi), il cesse seulement d'être rappelé. On marque son
  // bloc et on dit pourquoi, sans rien changer à la mise en page.
  function museleAffiche(id, e) {
    if (window.console && window.console.warn)
      window.console.warn("[mod:" + id + "] muselé après " + e.echecs +
                          " rafraîchissements en erreur : " + e.erreur);
    var n = elModules ? elModules[id] : null;
    if (!n) return;
    n.dataset.musele = "1";
    n.title = "Module muselé après " + e.echecs + " rafraîchissements en erreur : " + e.erreur;
  }

  // ---------- le contexte d'un module ----------
  // C'est TOUT ce qu'un module touche, natif comme mod : le contrat public
  // décrit dans la page Mods. Les modules natifs de ce fichier n'en font pas
  // usage (ils appellent les fonctions directement), mais ils le reçoivent :
  // un mod qui reprend l'id de l'un d'eux dispose exactement du même.
  //
  // Les libellés officiels des données du personnage : un mod nomme les choses
  // comme le reste de la fiche au lieu d'inventer son vocabulaire.
  var LIBELLES = {
    nom: "Nom", espece: "Espèce", age: "Âge", sexe: "Sexe", genre: "Genre",
    pv: "PV", pvMax: "PV max", initiative: "Initiative", vitesse: "Vitesse",
    regen: "Régén / jour", poids: "Poids porté", narration: "Narration",
    xpTotal: "XP total", stade: "Stade", total: "Total",
    competence: "Compétence", art: "Art", passif: "Passif",
    arme: "Arme", degats: "Dégâts", armure: "Armure",
    quantite: "Quantité", groupe: "Groupe", description: "Description",
    avantage: "Avantage", defaut: "Défaut", qualite: "Qualité",
    background: "Background", notes: "Notes", de: "Dé des jets de test"
  };
  function contexte(m, reg) {
    var id = m.id;
    // LE PROPRIÉTAIRE EST LE MOD, PAS LE MODULE. Un mod enregistre presque
    // toujours un module dont l'id diffère du sien (« lmod » qui pose
    // « bloc-journal ») : attribuer le filtre au module rendrait la purge
    // inopérante, puisque c'est le MOD que le joueur refuse ou supprime.
    // m.__mod est posé par enregistre() quand un mod tourne.
    var prop = m.__mod || id;
    // Ce qu'un module installe DEPUIS un gestionnaire (un clic, longtemps après
    // le montage) doit rester à son nom. Sans cette enveloppe, proprietaireCourant
    // est retombé à « ? » et le filtre posé par le bouton d'un mod refusé
    // survivait à son refus : c'est exactement le défaut que la contre-relecture
    // a rouvert.
    function aNous(fn) {
      if (typeof fn !== "function") return fn;
      return function () {
        var avant = proprietaireCourant;
        proprietaireCourant = prop;
        try { return fn.apply(this, arguments); }
        finally { proprietaireCourant = avant; }
      };
    }
    // le coffre privé du module, rangé dans state.modData[id] : il voyage avec
    // le personnage (bibliothèque, export JSON, Attributes Roll20)
    var donnees = {
      // LIRE NE SALIT PAS. L'ancienne version rangeait un objet vide dans
      // l'état au premier get() : tout module qui se contentait de lire
      // laissait sa trace dans le personnage, et un personnage qui n'a jamais
      // rien réglé se retrouvait avec autant d'entrées que de modules. On rend
      // un objet détaché ; c'est set() qui écrit, lui seul.
      get: function () {
        var d = state.modData && state.modData[id];
        return (d && typeof d === "object") ? d : {};
      },
      // La validation est IMMÉDIATE et l'erreur remonte AU MODULE. Un objet
      // circulaire doit casser le module qui l'écrit, jamais la sauvegarde de
      // la fiche : rangé tel quel, il ferait échouer le JSON.stringify(state)
      // du premier save() et le personnage entier cesserait de s'enregistrer.
      set: function (o) {
        if (o === null || o === undefined) o = {};
        if (typeof o !== "object") throw new TypeError("ctx.donnees.set attend un objet.");
        JSON.stringify(o);              // circulaire : l'erreur part au module
        if (!state.modData) state.modData = {};
        state.modData[id] = o;
      }
    };
    // puce de filtre, comme celles des modules Armes et Compétences
    function puce(libelle, lire, ecrire) {
      var c = el("span", "pc-chip", libelle);
      c.classList.toggle("on", !!lire());
      c.addEventListener("click", function () {
        ecrire(!lire());
        c.classList.toggle("on", !!lire());
        refresh();
      });
      reg.push(function () { c.classList.toggle("on", !!lire()); });
      return c;
    }
    return {
      // identité
      id: id,
      version: RELEASE,
      // données (en lecture : ce qui appartient au personnage appartient aux
      // modules natifs, un module ne le corrige pas dans le dos des autres)
      state: state,
      data: DATA,
      donnees: donnees,
      // structure
      // Le rouage d'édition est OPTIONNEL : ctx.bloc("Titre", { edition: true }).
      // Sans lui, un module qui n'a rien à éditer affichait quand même le
      // bouton, qui ne faisait que basculer un mode dont il ne se servait pas.
      // Le bloc reste repérable sans : monteModules pose data-module lui-même.
      bloc: function (titre, opts) {
        return block(titre, null, (opts && opts.edition) ? id : null);
      },
      el: el,
      fld: function (libelle, champ) { return fld(libelle, champ); },
      // cycle
      surRafraichissement: function (fn) { if (typeof fn === "function") reg.push(fn); },
      rafraichir: refresh,
      enregistrer: save,
      reconstruire: remount,
      edition: function () { return isEdit(id); },
      // briques. Tout ce qui prend un GESTE du joueur passe par aNous() : le
      // code appelé au clic doit rester attribué à son mod, sinon ce qu'il
      // installe alors n'a plus d'ayant droit et survit à son refus.
      texte: function (lire, ecrire, indication) { return textInput(lire, aNous(ecrire), indication, reg); },
      bouton: function (libelle, infobulle, action) { return miniBtn(libelle, infobulle, aNous(action)); },
      pas: function (lire, ecrire, pas) { return stepper(lire, aNous(ecrire), pas || 1, null, reg); },
      tuile: function (libelle, valeur, action) { return bigTile(libelle, valeur, aNous(action), reg); },
      ligneComp: function (carac, nom) {
        return compRow({ key: carac + "/" + nom, name: nom, carac: carac, custom: false },
                       false, { module: id, reg: reg });
      },
      filtre: puce,
      dialogue: function (titre, corps, valider) { return dialogue(titre, corps, aNous(valider)); },
      message: flash,
      // sorties (le destinataire reste celui que le joueur a fixé)
      jet: function (libelle, valeur) { doRoll(libelle, valeur, null, true); },
      auTchat: function (titre, champs) { sayChat(titre, champs); },
      boutonTchat: function (libelle, titre, champs) {
        return miniBtn(libelle, "Envoyer dans le tchat Roll20", function () {
          sayChat(titre, typeof champs === "function" ? champs() : champs);
        });
      },
      // calculs : tous dérivés, donc en lecture seule
      calculs: {
        caracTotal: caracTotal,
        compValue: compValue,
        pvMax: pvMax,
        pvCourant: pvCourant,
        initiative: initiative,
        vitesse: vitesse,
        regen: regen,
        poidsPorte: poidsPorte
      },
      // …et de quoi les CHANGER : un filtre reçoit la valeur calculée et rend
      // celle qu'il veut, pour toute la fiche. Le propriétaire est figé ici, à
      // la construction du contexte, et c'est celui du MOD : un module qui pose
      // son filtre depuis un bouton, longtemps après son build, reste chez lui,
      // et refuser le mod emporte bien le filtre.
      filtreCalcul: function (nom, fn) { ajouteFiltre(nom, fn, prop); },
      // mise en forme
      fmt: { signe: sign, nombre: fmtP },
      champs: LIBELLES,
      abbr: function (carac) { return ABBR[carac] || carac; }
    };
  }

  // ---------- onglet Fiche : caractéristiques + combat | compétences ----------
  function buildCaracs() {
    // jeu : le total et son jet ; édition : les steppers Création / Achats xp
    var b = block("Caractéristiques", null, "caracs");
    // même ordre que les compétences : Body, puis Mind, puis Prestance
    CHAMPS.forEach(function (name) {
      if (!DATA.caracs.some(function (cc) { return cc.name === name; })) return;
      var row = el("div", "pc-crow");
      var top = el("div", "pc-crow-top");
      var chip = el("span", "pc-abbr", ABBR[name] || name);
      chip.title = name;
      top.appendChild(chip);
      top.appendChild(el("span", "nm", name));
      var val = el("span", "pc-cval pc-rollable", "");
      val.addEventListener("click", function () { doRoll(name, caracTotal(name), null, true); });
      top.appendChild(val);
      row.appendChild(top);

      var bot = el("div", "pc-crow-bot pc-edit-only");
      bot.appendChild(el("span", "lbl", "Création"));
      bot.appendChild(stepper(
        function () { return state.caracsBase[name]; },
        function (v) {
          // le plafond ne bloque que les HAUSSES : une base montée au-dessus
          // de 80 (Sans limite décoché ensuite) redescend pas à pas, sans être
          // écrasée à 80 par un simple clic
          var max = state.sansLimite ? 999 : Math.max(CARAC_MAX, state.caracsBase[name]);
          var val2 = clamp(v, 0, 999);
          if (val2 > max) { flash("Maximum " + CARAC_MAX + " par caractéristique sans avantage."); val2 = max; }
          state.caracsBase[name] = val2;
        }, CARAC_PAS, "création"));
      bot.appendChild(el("span", "lbl", "Achats xp"));
      var xpStep = el("span", "pc-step");
      xpStep.appendChild(stepBtn("−", "Rendre " + DATA.xpParStade + " xp", function () {
        if (state.caracsXp[name] > 0) { state.caracsXp[name]--; refresh(); }
      }));
      var cnt = el("span", "v", "");
      xpStep.appendChild(cnt);
      xpStep.appendChild(stepBtn("+", "Dépenser " + DATA.xpParStade + " xp", function () {
        if (xpRestant() < DATA.xpParStade) { flash("XP insuffisant."); return; }
        // le plafond porte sur base + achats, SANS le modificateur d'Options
        // (qui peut porter le total au-delà de 80 comme en dessous : le tester
        // brûlerait de l'xp sous un malus, ou bloquerait à tort sous un bonus)
        if (!state.sansLimite && state.caracsBase[name] + CARAC_PAS * (state.caracsXp[name] + 1) > CARAC_MAX) {
          flash("Limite de " + CARAC_MAX + " atteinte (sans avantage).");
          return;
        }
        state.caracsXp[name]++;
        refresh();
      }));
      bot.appendChild(xpStep);
      row.appendChild(bot);

      hooks.push(function () {
        var d = state.caracsMod[name] || 0;
        var brut = state.caracsBase[name] + CARAC_PAS * state.caracsXp[name];
        var plafonne = state.sansLimite ? brut : Math.min(brut, CARAC_MAX);
        val.textContent = String(caracTotal(name));
        val.classList.toggle("adj", d !== 0);
        // quand le plafond mord, l'écrire en substitution (« plafonné à 80 »)
        // pour que la somme du tooltip se vérifie de tête
        val.title = "Création " + state.caracsBase[name] +
                    " + achats " + (CARAC_PAS * state.caracsXp[name]) +
                    (brut !== plafonne ? ", plafonné à " + CARAC_MAX : "") +
                    (d ? " · modificateur (Options) " + sign(d) : "") +
                    " = " + caracTotal(name) + " — clic : lancer 1d100 + " + name;
        cnt.textContent = String(state.caracsXp[name]);
      });
      b.appendChild(row);
    });
    return b;
  }

  // L'ancien bloc « Combat » est éclaté (2026-08-01) : Vitesse et Régén / jour
  // forment leur propre élément (tuiles autonomes), PV et Narration ont chacun
  // leur bloc ; la tuile « XP restant » a disparu, le compteur « XP dépensé »
  // de l'en-tête la rendait redondante.
  // Valeur forcée d'une tuile : vide = valeur calculée. Même mécanique que le
  // maximum de PV, en version étroite (deux lignes empilées sous la valeur).
  function tuileForce(tile, champ, auto, dec) {
    var row = el("div", "pc-bigedit pc-edit-only");
    row.appendChild(el("span", "lbl", "Forcé"));
    var inp = el("input", "force");
    inp.type = "number"; inp.min = "0";
    inp.step = dec ? "0.5" : "1";
    inp.title = "Vide = valeur calculée (modificateurs compris) ; une valeur la force.";
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      state[champ] = isFinite(v)
        ? clamp(dec ? Math.round(v * 100) / 100 : Math.floor(v), 0, 9999)
        : null;
      refresh();
    });
    hooks.push(function () {
      inp.placeholder = fmtP(auto());
      if (document.activeElement !== inp) inp.value = state[champ] === null ? "" : state[champ];
    });
    row.appendChild(inp);
    tile.appendChild(row);
  }
  function tuileMods(tile, cle) {
    var row = el("div", "pc-bigedit pc-edit-only");
    row.appendChild(el("span", "lbl", "Modificateurs"));
    row.appendChild(multiMod(state.divers, cle));
    tile.appendChild(row);
  }

  function buildVitesse() {
    // deux tuiles = deux MODULES distincts : chacune porte son propre rouage
    // flottant (jeu : lecture ; édition : sa valeur forcée et ses modificateurs)
    var tiles = el("div", "pc-bigrow pc-bigrow-2");

    var tv = bigTile("Vitesse", vitesse);
    tv.classList.add("pc-mods-host", "pc-editable");
    tv.dataset.module = "vitesse";
    var gV = gearBtn(tv, "vitesse");
    gV.classList.add("pc-gear-float");
    tv.appendChild(gV);
    tuileForce(tv, "vitesseOverride", vitesseAuto, true);
    tuileMods(tv, "vitesse");
    hooks.push(function () {
      var d = modSum(state.divers.vitesse);
      tv.classList.toggle("adj", state.vitesseOverride !== null || d !== 0);
      tv.title = state.vitesseOverride !== null
        ? "Vitesse forcée à " + fmtP(state.vitesseOverride) + " m (calculée : " + fmtP(vitesseAuto()) + " m)"
        : "Palier de la table (Body " + caracTotal("Body") + ") : " + vitessePalier() +
          (d ? " · modificateurs " + sign(d) + " m" : "");
    });
    tiles.appendChild(tv);

    var tr = bigTile("Régén / jour", regen);
    tr.classList.add("pc-mods-host", "pc-editable");
    tr.dataset.module = "regen";
    var gR = gearBtn(tr, "regen");
    gR.classList.add("pc-gear-float");
    tr.appendChild(gR);
    tuileForce(tr, "regenOverride", regenAuto, false);
    tuileMods(tr, "regen");
    hooks.push(function () {
      var d = modSum(state.divers.regen);
      tr.classList.toggle("adj", state.regenOverride !== null || d !== 0);
      tr.title = state.regenOverride !== null
        ? "Régénération forcée à " + state.regenOverride + " (calculée : " + regenAuto() + ")"
        : "Body / 10 = " + Math.floor(caracTotal("Body") / 10) +
          (d ? " · modificateurs " + sign(d) : "") + " (jamais sous 0)";
    });
    tiles.appendChild(tr);

    return tiles;
  }

  // ---------- initiative ----------
  // Une compétence de Body comme les autres (stade, passifs à Artiste dans
  // l'onglet Art, modificateur dans Options), moins le poids porté. Elle a son
  // module parce qu'elle se lance à chaque combat ; la liste des compétences
  // l'écarte donc, pour ne pas doubler la même commande.
  function buildInitiative() {
    var initHooks = [];   // registre PROPRE au module : la ligne est reconstruite
    var b = block("Initiative", null, "initiative", function () { rendre(); });
    var box = el("div");
    b.appendChild(box);
    function rendre() {
      initHooks.length = 0;   // les hooks de la ligne détruite partent avec elle
      box.innerHTML = "";
      box.appendChild(compRow({ key: INIT_KEY, name: "Initiative", carac: "Body", custom: false },
                              false, {
        module: "initiative", reg: initHooks,
        // UN seul nombre : le poids porté est déjà déduit, comme le veut la règle
        value: function () { return initiative(); },
        rollLabel: "Initiative",
        adj: function () { return poidsPorte() !== 0; },
        detail: function () {
          var p = poidsPorte();
          return p ? " · poids porté − " + fmtP(p) : "";
        }
      }));
      applyEdit(b, "initiative");
      refresh();
    }
    hooks.push(function () { initHooks.forEach(function (f) { f(); }); });
    rendre();
    return b;
  }

  // ---------- xp par champ ----------
  // Où le personnage a mis son xp : la caractéristique elle-même et toutes ses
  // compétences. Les barres se comparent entre elles (part du dépensé), pas au
  // total disponible : c'est la répartition qui intéresse.
  function buildXpChamps() {
    var b = block("XP par champ", null, null);
    CHAMPS.forEach(function (carac) {
      var row = el("div", "pc-xpchamp");
      row.appendChild(el("span", "pc-abbr", ABBR[carac] || carac));
      var m = el("span", "pc-meter");
      var v = el("b", null, "");
      m.appendChild(v);
      var bar = el("span", "bar");
      var fill = el("i");
      bar.appendChild(fill);
      m.appendChild(bar);
      var part = el("span", "pct", "");
      m.appendChild(part);
      row.appendChild(m);
      hooks.push(function () {
        var xp = xpChamp(carac), tot = xpDepense();
        v.textContent = xp + " xp";
        var p = tot > 0 ? (xp / tot) * 100 : 0;
        fill.style.width = clamp(p, 0, 100) + "%";
        part.textContent = tot > 0 ? Math.round(p) + " %" : "—";
        row.title = carac + " : " + (DATA.xpParStade * (state.caracsXp[carac] || 0)) +
                    " xp de caractéristique, " +
                    (xp - DATA.xpParStade * (state.caracsXp[carac] || 0)) + " xp de compétences";
      });
      b.appendChild(row);
    });
    return b;
  }

  // ---------- compétences d'armes ----------
  // Toujours des compétences de Body. Celles des règles (DATA.compsArmes) et
  // celles que le joueur ajoute vivent ensemble ici, et nulle part ailleurs :
  // la liste générale les écarte pour ne pas doubler la commande du stade.
  function buildArmesComps() {
    var armHooks = [];
    var b = block("Armes", null, "armescomp", function () { rendre(); });

    // mêmes filtres que la liste des compétences : décoché, « Armes
    // personnalisées » ne laisse que celles des règles ; « Investies
    // seulement » masque celles où rien n'est posé.
    var tools = el("div", "pc-comp-tools");
    // pas de menu des champs ici (une arme est toujours une compétence de
    // Body) : le filtre prend donc toute la largeur
    var recherche = champFiltre(function () { return armesFilter; },
                                function (v) { armesFilter = v; }, "Filtrer les armes…",
                                function () { rendre(); });
    if (recherche) {
      var lineF = el("div", "row");
      lineF.appendChild(recherche);
      tools.appendChild(lineF);
    }
    var line = el("div", "row");
    var persoChip = el("span", "pc-chip");
    persoChip.textContent = "Personnalisées";
    persoChip.title = "Décoché : seules les armes des règles sont affichées.";
    persoChip.classList.toggle("on", armesPerso);
    persoChip.addEventListener("click", function () {
      armesPerso = !armesPerso;
      persoChip.classList.toggle("on", armesPerso);
      rendre();
    });
    line.appendChild(persoChip);
    var onlyChip = el("span", "pc-chip");
    onlyChip.textContent = "Investies";
    onlyChip.title = "N'afficher que les armes où un stade, un passif ou un modificateur est posé.";
    onlyChip.classList.toggle("on", armesOnly);
    onlyChip.addEventListener("click", function () {
      armesOnly = !armesOnly;
      onlyChip.classList.toggle("on", armesOnly);
      rendre();
    });
    line.appendChild(onlyChip);
    tools.appendChild(line);
    b.appendChild(tools);

    var box = el("div");
    b.appendChild(box);

    function rendre() {
      armHooks.length = 0;
      box.innerHTML = "";
      var flt = filtreDe(armesFilter);
      var noms = armesNoms().filter(function (nom) {
        var perso = state.armesComps.indexOf(nom) >= 0;
        if (!armesPerso && perso) return false;
        if (armesOnly && !compInvestie({ key: armeKey(nom) })) return false;
        if (flt && nom.toLowerCase().indexOf(flt) < 0) return false;
        return true;
      });
      if (noms.length) {
        var head = el("div", "pc-comp-row head");
        head.appendChild(el("span", null, "Arme"));
        head.appendChild(el("span", null, "Stade"));
        head.appendChild(el("span", null, "Total"));
        box.appendChild(head);
      } else {
        box.appendChild(el("div", "pc-empty",
          flt ? "Aucune arme ne correspond."
              : armesOnly ? "Aucune arme investie." : "Aucune arme."));
      }
      noms.forEach(function (nom, i) {
        var perso = state.armesComps.indexOf(nom) >= 0;
        box.appendChild(compRow(
          { key: armeKey(nom), name: nom, carac: ARME_CARAC, custom: perso, arme: true },
          i % 2 === 1, { module: "armescomp", reg: armHooks, onDrop: rendre }));
      });

      if (isEdit("armescomp")) {
        var addRow = el("div", "pc-comp-add");
        var inp = el("input");
        inp.type = "text";
        inp.placeholder = "Nouvelle arme…";
        addRow.appendChild(inp);
        addRow.appendChild(miniBtn("+", "Ajouter", function () {
          var nom = capFirst(inp.value.trim());
          if (!nom) return;
          if (allComps().some(function (it) {
                return it.carac === ARME_CARAC && it.name.toLowerCase() === nom.toLowerCase();
              })) { flash("« " + nom + " » existe déjà en Body."); return; }
          state.armesComps.push(nom);
          // ne jamais ajouter une arme qui resterait invisible
          if (!armesPerso) { armesPerso = true; persoChip.classList.add("on"); }
          if (armesOnly) { armesOnly = false; onlyChip.classList.remove("on"); }
          if (filtreDe(armesFilter)) { armesFilter = ""; if (recherche) recherche.value = ""; }
          inp.value = "";
          refresh();
          rendre();
          if (optCompsRebuild) optCompsRebuild();
        }));
        box.appendChild(addRow);
      }
      applyEdit(b, "armescomp");
      refresh();
    }
    hooks.push(function () { armHooks.forEach(function (f) { f(); }); });
    rendre();
    return b;
  }

  // ---------- langues ----------
  // Des compétences de Mind, rassemblées dans leur module. La langue du
  // personnage monte jusqu'à Expert sans rien coûter ; les autres se paient
  // comme n'importe quelle compétence.
  function buildLangues() {
    var langHooks = [];
    var b = block("Langues", null, "langues", function () { rendre(); });

    var tools = el("div", "pc-comp-tools");
    // pas de menu des champs (une langue est toujours une compétence de Mind)
    var recherche = champFiltre(function () { return languesFilter; },
                                function (v) { languesFilter = v; }, "Filtrer les langues…",
                                function () { rendre(); });
    if (recherche) {
      var lineF = el("div", "row");
      lineF.appendChild(recherche);
      tools.appendChild(lineF);
    }
    var line = el("div", "row");
    var persoChip = el("span", "pc-chip");
    persoChip.textContent = "Personnalisées";
    // « personnalisée » = apprise en plus ; la langue du personnage, elle, est
    // acquise, c'est le pendant des compétences des règles dans les autres modules
    persoChip.title = "Décoché : seule la langue du personnage est affichée.";
    persoChip.classList.toggle("on", languesPerso);
    persoChip.addEventListener("click", function () {
      languesPerso = !languesPerso;
      persoChip.classList.toggle("on", languesPerso);
      rendre();
    });
    line.appendChild(persoChip);
    var onlyChip = el("span", "pc-chip");
    onlyChip.textContent = "Investies";
    onlyChip.title = "N'afficher que les langues où un stade, un passif ou un modificateur est posé.";
    onlyChip.classList.toggle("on", languesOnly);
    onlyChip.addEventListener("click", function () {
      languesOnly = !languesOnly;
      onlyChip.classList.toggle("on", languesOnly);
      rendre();
    });
    line.appendChild(onlyChip);
    tools.appendChild(line);
    b.appendChild(tools);

    var box = el("div");
    b.appendChild(box);

    function rendre() {
      langHooks.length = 0;
      box.innerHTML = "";
      var flt = filtreDe(languesFilter);
      var noms = state.langues.filter(function (nom) {
        if (!languesPerso && nom !== state.langueBase) return false;
        if (languesOnly && !compInvestie({ key: langueKey(nom) })) return false;
        if (flt && nom.toLowerCase().indexOf(flt) < 0) return false;
        return true;
      });
      if (noms.length) {
        var head = el("div", "pc-comp-row head");
        head.appendChild(el("span", null, "Langue"));
        head.appendChild(el("span", null, "Stade"));
        head.appendChild(el("span", null, "Total"));
        box.appendChild(head);
      } else {
        box.appendChild(el("div", "pc-empty",
          flt ? "Aucune langue ne correspond."
              : languesOnly ? "Aucune langue investie."
              : state.langues.length ? "Aucune langue à afficher."
              : isEdit("langues")
                ? "Aucune langue : la première ajoutée devient celle du personnage."
                : "Aucune langue."));
      }
      noms.forEach(function (nom, i) {
        var item = { key: langueKey(nom), name: nom, carac: LANGUE_CARAC, custom: true, langue: true };
        var row = compRow(item, i % 2 === 1,
                          { module: "langues", reg: langHooks, onDrop: rendre });
        // la langue du personnage se désigne d'un clic : une seule à la fois
        var etoile = el("button", "pc-lang-base" + (state.langueBase === nom ? " on" : ""), "★");
        etoile.type = "button";
        etoile.title = state.langueBase === nom
          ? "Langue du personnage : acquise jusqu'à Expert sans rien coûter"
          : "Faire de « " + nom + " » la langue du personnage";
        etoile.addEventListener("click", function () {
          if (!isEdit("langues")) return;
          state.langueBase = state.langueBase === nom ? "" : nom;
          refresh();
          rendre();
        });
        row.querySelector(".pc-comp-name").insertBefore(etoile, row.querySelector(".pc-comp-label"));
        box.appendChild(row);
      });

      if (isEdit("langues")) {
        var addRow = el("div", "pc-comp-add");
        var inp = el("input");
        inp.type = "text";
        inp.placeholder = state.langues.length ? "Nouvelle langue…" : "Langue du personnage…";
        addRow.appendChild(inp);
        addRow.appendChild(miniBtn("+", "Ajouter", function () {
          var nom = capFirst(inp.value.trim());
          if (!nom) return;
          if (allComps().some(function (it) {
                return it.carac === LANGUE_CARAC && it.name.toLowerCase() === nom.toLowerCase();
              })) { flash("« " + nom + " » existe déjà en Mind."); return; }
          state.langues.push(nom);
          // la première langue est celle du personnage : elle arrive à Expert,
          // gratuitement — c'est tout l'intérêt de la désigner
          if (!state.langueBase) {
            state.langueBase = nom;
            state.comps[langueKey(nom)] = { stade: stadeExpert(), techniques: [] };
          }
          // une langue ajoutée ne doit jamais rester invisible
          if (!languesPerso) { languesPerso = true; persoChip.classList.add("on"); }
          if (languesOnly) { languesOnly = false; onlyChip.classList.remove("on"); }
          if (filtreDe(languesFilter)) { languesFilter = ""; if (recherche) recherche.value = ""; }
          inp.value = "";
          refresh();
          rendre();
          if (optCompsRebuild) optCompsRebuild();
        }));
        box.appendChild(addRow);
      }
      applyEdit(b, "langues");
      refresh();
    }
    hooks.push(function () { langHooks.forEach(function (f) { f(); }); });
    rendre();
    return b;
  }

  function buildPv() {
    // les PV COURANTS se jouent en temps réel (combat) : stepper et « Max »
    // restent toujours actifs ; l'édition ne garde que le maximum forcé et
    // les divers du maximum
    var b = block("PV", null, "pv");
    var pvRow = el("div", "pc-kv");
    var pvStep = el("span", "pc-step");
    pvStep.appendChild(stepBtn("−", null, function () { state.pv = pvCourant() - 1; refresh(); }));
    var pvIn = el("input", "pc-num");
    pvIn.type = "number"; pvIn.step = "1";
    pvIn.addEventListener("input", function () {
      var v = parseFloat(pvIn.value);
      state.pv = isFinite(v) ? v : null;
      refresh();
    });
    hooks.push(function () { if (document.activeElement !== pvIn) pvIn.value = pvCourant(); });
    pvStep.appendChild(pvIn);
    pvStep.appendChild(stepBtn("+", null, function () { state.pv = pvCourant() + 1; refresh(); }));
    pvRow.appendChild(pvStep);
    var pvM = el("span", "max", "");
    hooks.push(function () {
      var d = modSum(state.divers.pvMax);
      pvM.textContent = "/ " + pvMax();
      pvM.classList.toggle("adj", state.pvMaxOverride !== null || d !== 0);
      pvM.title = state.pvMaxOverride !== null
        ? "Maximum forcé à " + state.pvMaxOverride + " (calculé : " + pvMaxAuto() + ")"
        : "(20 + Body) / 2 = " + Math.floor((20 + caracTotal("Body")) / 2) +
          (d ? " · modificateurs " + sign(d) : "");
    });
    pvRow.appendChild(pvM);
    pvRow.appendChild(el("span", "sp"));
    pvRow.appendChild(miniBtn("Max", "Revenir au maximum", function () { state.pv = null; refresh(); }));
    b.appendChild(pvRow);

    // maximum : valeur forcée (vide = calculée) + divers — les leviers HxH
    var mrow = el("div", "pc-pvmax pc-mods-host pc-edit-only");
    mrow.appendChild(el("span", "lbl", "Forcé"));
    var force = el("input", "force");
    force.type = "number"; force.step = "1"; force.min = "0";
    force.title = "Vide = maximum calculé ((20 + Body) / 2, modificateurs compris) ; " +
                  "une valeur le force.";
    force.addEventListener("input", function () {
      var v = parseFloat(force.value);
      state.pvMaxOverride = isFinite(v) ? clamp(Math.floor(v), 0, 9999) : null;
      refresh();
    });
    hooks.push(function () {
      force.placeholder = String(pvMaxAuto());
      if (document.activeElement !== force) {
        force.value = state.pvMaxOverride === null ? "" : state.pvMaxOverride;
      }
    });
    mrow.appendChild(force);
    mrow.appendChild(el("span", "lbl", "Modificateurs"));
    mrow.appendChild(multiMod(state.divers, "pvMax"));
    mrow.appendChild(el("span", "sp"));
    b.appendChild(mrow);
    return b;
  }

  function buildNarration() {
    var b = block("Narration");
    var nRow = el("div", "pc-kv");
    var nStep = el("span", "pc-step");
    nStep.appendChild(stepBtn("−", null, function () { state.narration = Math.max(0, state.narration - 1); refresh(); }));
    var nV = el("span", "v", "");
    hooks.push(function () { nV.textContent = String(state.narration); });
    nStep.appendChild(nV);
    nStep.appendChild(stepBtn("+", null, function () { state.narration++; refresh(); }));
    nRow.appendChild(nStep);
    nRow.appendChild(el("span", "sp"));
    nRow.appendChild(miniBtn("Nouvelle session", "Repartir à 3 points", function () { state.narration = 3; refresh(); }));
    b.appendChild(nRow);
    return b;
  }

  // opts : { module, reg, onDrop } — le module dont le rouage déverrouille la
  // barre de stade, le registre de hooks où la ligne s'inscrit (celui du module
  // qui la reconstruit, sinon ses hooks fuiteraient), et le retrait sur mesure.
  // Par défaut : le module « comps » de l'onglet Fiche.
  function compRow(item, odd, opts) {
    opts = opts || {};
    var mod = opts.module || "comps";
    var reg = opts.reg || compHooks;
    var comp = function () { return state.comps[item.key] || blankComp(); };
    var row = el("div", "pc-comp-row" + (odd ? " odd" : ""));

    var nameBox = el("span", "pc-comp-name");
    var label = el("span", "pc-comp-label", item.name);
    label.title = item.name + " (" + item.carac + ")";
    nameBox.appendChild(label);
    if (item.custom) {
      var del = el("button", "pc-comp-del pc-edit-only", "✕");
      del.type = "button";
      del.title = item.langue ? "Retirer cette langue" : "Retirer cette compétence personnalisée";
      del.addEventListener("click", function () {
        // la compétence peut porter des données que la ligne ne montre pas
        // (un art rédigé puis stade redescendu) : confirmer avant d'effacer
        var c = state.comps[item.key];
        var garde = [];
        if (c && c.stade > 0) garde.push("de l'xp investi");
        if (c && c.techniques && c.techniques.length) garde.push("des passifs");
        if (porteArt(c)) garde.push("un art");
        if (state.compsMod[item.key]) garde.push("un modificateur (Options)");
        if (garde.length &&
            !confirm("Supprimer « " + item.name + " » effacera aussi " + garde.join(", ") + ". Continuer ?")) return;
        if (item.langue) {
          state.langues = state.langues.filter(function (n) { return n !== item.name; });
          if (state.langueBase === item.name) state.langueBase = "";
        } else if (item.arme) {
          state.armesComps = state.armesComps.filter(function (n) { return n !== item.name; });
        } else {
          state.customComps = state.customComps.filter(function (cc) { return (cc.carac + "/" + cc.name) !== item.key; });
        }
        delete state.comps[item.key];
        delete state.compsMod[item.key];   // sinon le modificateur renaîtrait sur une homonyme
        refresh();
        if (opts.onDrop) opts.onDrop();
        rebuildComps();
        if (optCompsRebuild) optCompsRebuild();
      });
      nameBox.appendChild(del);
    }
    row.appendChild(nameBox);

    // stade : une barre segmentée [ N | I | M | E | A ] au dégradé qui monte
    // jusqu'au rouge des caractéristiques ; centrée, toujours au même endroit.
    // Cliquable seulement en mode édition du module (le coût se règle tout
    // seul) ; verrouillée, elle reste l'affichage du stade. Les passifs et
    // l'art se personnalisent dans l'onglet Art.
    function applyStade(target) {
      var c = comp();
      if (target === c.stade) return;
      var next = { stade: target, techniques: c.techniques.slice() };
      // l'art suit la compétence : il survit aux allers-retours de stade
      // (il ne se montre que quand le stade qui l'ouvre est atteint)
      if (porteArt(c)) next.art = c.art;
      if (!stadeInfo(target).techniques) {
        // les passifs rédigés vivent dans l'onglet Art : la ligne ne les
        // montre pas, on confirme avant de les effacer avec la descente
        var redigees = c.techniques.filter(function (t) {
          return String(t.name || "").trim() || String(t.desc || "").trim();
        }).length;
        if (redigees &&
            !confirm("Redescendre « " + item.name + " » à " + stadeInfo(target).nom +
                     " effacera " + redigees + " passif(s) rédigé(s) (onglet Art). Continuer ?")) return;
        next.techniques = [];
      }
      var delta = compXp(next, item.key) - compXp(c, item.key);
      if (delta > 0 && xpRestant() < delta) { flash("XP insuffisant."); return; }
      // le plafond du quart ne bloque que les HAUSSES : on peut toujours redescendre
      if (delta > 0 && compXp(next, item.key) > compCap()) {
        flash("Pas plus d'un quart de l'xp total (" + compCap() + " xp) dans une seule compétence.");
        return;
      }
      state.comps[item.key] = next;
      if (!next.stade && !next.techniques.length && !next.art) delete state.comps[item.key];
      refresh();
    }
    var st = el("span", "pc-stadebar");
    var segs = [];
    DATA.stades.forEach(function (sd, i) {
      var sg = el("button", "seg s" + i, (sd.nom || "?").charAt(0).toUpperCase());
      sg.type = "button";
      sg.title = sd.nom + " (" + sign(sd.bonus) + ") — " + (DATA.xpParStade * i) + " xp";
      sg.addEventListener("click", function () {
        if (!isEdit(mod)) return;   // construction : mode édition requis
        applyStade(i);
      });
      st.appendChild(sg);
      segs.push(sg);
    });
    row.appendChild(st);

    // le total est un BOUTON de jet, comme la valeur d'une caractéristique.
    // opts.value permet à un module de compter autrement (l'initiative retire
    // le poids porté) sans dupliquer la ligne.
    var valeur = opts.value || function (c) { return compValue(item.carac, c, item.key); };
    var total = el("button", "pc-comp-total pc-comp-roll pc-rollable", "");
    total.type = "button";
    total.addEventListener("click", function () {
      doRoll(opts.rollLabel || (item.name + " (" + item.carac + ")"), valeur(comp()), null, true, item.carac);
    });
    row.appendChild(total);

    reg.push(function () {
      var c = comp();
      var d = state.compsMod[item.key] || 0;
      segs.forEach(function (sg, i) {
        sg.classList.toggle("on", i <= c.stade);
        sg.classList.toggle("cur", i === c.stade);
      });
      total.textContent = sign(valeur(c));
      total.classList.toggle("zero", !c.stade && !d && !opts.value);
      total.classList.toggle("adj", d !== 0 || (opts.adj ? opts.adj() : false));
      total.title = item.carac + " " + sign(caracTotal(item.carac)) +
                    " · stade " + sign(stadeInfo(c.stade).bonus) +
                    (d ? " · modificateur (Options) " + sign(d) : "") +
                    (opts.detail ? opts.detail() : "") +
                    (item.langue && state.langueBase === item.name ? " · langue du personnage (gratuite)" : "") +
                    " — clic : lancer";
    });
    return row;
  }

  var compBox = null;
  var compFilter = "";
  var compChamp = "";           // "" = tous les champs
  var compOnly = COMPACT;       // fiche condensée (Roll20) : investies seulement par défaut
  // décoché : seules les compétences de base du jeu (listes des règles) sont
  // affichées ; coché : les compétences personnalisées s'y ajoutent
  var compPerso = true;
  var compPersoChip = null;     // la puce, rallumée quand on ajoute une comp perso
  // mêmes filtres pour les modules Armes et Langues (réglages de VUE : ils
  // survivent au remontage de la fiche, comme ceux des compétences)
  var armesPerso = true;
  var armesOnly = COMPACT;
  var armesFilter = "";
  var languesPerso = true;
  var languesOnly = false;
  var languesFilter = "";
  // Les deux outils de filtre se coupent depuis l'onglet Options. Coupés, ils
  // DISPARAISSENT et cessent d'agir : un filtre invisible qui masque encore
  // des lignes est un piège. Réglage d'AFFICHAGE, donc dans le vrai
  // localStorage du navigateur, jamais dans le personnage.
  var FILTRES = { texte: "jjk-filtre-texte", champ: "jjk-filtre-champ" };
  function filtreTexteOn() { return lpref(FILTRES.texte, "1") !== "0"; }
  function filtreChampOn() { return lpref(FILTRES.champ, "1") !== "0"; }
  // champ de filtre d'un module ; rend null quand le réglage le coupe, et le
  // texte est alors ignoré par les listes (voir filtreDe)
  function champFiltre(get, set, placeholder, onChange) {
    if (!filtreTexteOn()) return null;
    var s = el("input", "pc-comp-search");
    s.type = "search";
    s.placeholder = placeholder || "Filtrer…";
    s.value = get();   // le filtre survit au remontage : le champ doit le montrer
    s.addEventListener("input", function () { set(s.value); onChange(); });
    return s;
  }
  function filtreDe(v) { return filtreTexteOn() ? String(v || "").trim().toLowerCase() : ""; }
  function compInvestie(it) {
    var c = state.comps[it.key];
    // l'art compte : une compétence redescendue qui garde son art reste
    // visible ; un modificateur (Options) non nul aussi (sinon « Investies
    // seulement » cache une valeur pourtant modifiée)
    return !!(c && (c.stade > 0 || (c.techniques && c.techniques.length) || porteArt(c))) ||
           (state.compsMod[it.key] || 0) !== 0 ||
           (state.compsMod2[it.key] || 0) !== 0 ||
           // un total ou un coût forcé compte aussi : sinon « Investies »
           // cacherait la compétence qu'on vient justement de régler
           state.compsForce[it.key] !== undefined ||
           state.compsXpForce[it.key] !== undefined ||
           (state.compsXpMod[it.key] || 0) !== 0 ||
           (state.compsXpMod2[it.key] || 0) !== 0;
  }
  // l'ordre des champs, partout sur la Fiche : Body, puis Mind, puis Prestance
  var CHAMPS = ["Body", "Mind", "Prestance"];
  function rebuildComps() {
    if (!compBox) return;
    compHooks = [];   // les lignes vont être détruites : leurs hooks avec
    compBox.innerHTML = "";
    var flt = filtreDe(compFilter);
    CHAMPS.forEach(function (carac) {
      if (filtreChampOn() && compChamp && compChamp !== carac) return;
      // l'Initiative, les langues et les armes ont leur propre module sur
      // cette page : les répéter ici ferait deux commandes pour un même stade.
      // Mais un module COUPÉ rend ses compétences à cette liste : sans quoi
      // couper « Langues » rendrait les langues du personnage inatteignables.
      // Aucun calcul ne change, seulement l'endroit où la ligne se lit.
      var items = allComps().filter(function (it) {
        if (it.carac !== carac) return false;
        if (it.key === INIT_KEY) return !actif("initiative");
        if (it.langue) return !actif("langues");
        if (it.arme) return !actif("armescomp");
        return true;
      });
      if (!compPerso) items = items.filter(function (it) { return !it.custom; });
      if (flt) items = items.filter(function (it) { return it.name.toLowerCase().indexOf(flt) >= 0; });
      if (compOnly) items = items.filter(compInvestie);
      // ordre alphabétique (français, accents ignorés), comps perso intercalées
      items.sort(function (a, b) { return a.name.localeCompare(b.name, "fr", { sensitivity: "base" }); });
      compBox.appendChild(el("div", "pc-comp-champ", carac));
      if (!items.length) {
        compBox.appendChild(el("div", "pc-empty",
          flt ? "Aucune compétence ne correspond."
              : compOnly ? "Aucune compétence investie." : "—"));
      } else {
        var head = el("div", "pc-comp-row head");
        head.appendChild(el("span", null, "Compétence"));
        head.appendChild(el("span", null, "Stade"));
        head.appendChild(el("span", null, "Total"));
        compBox.appendChild(head);
        items.forEach(function (it, i) { compBox.appendChild(compRow(it, i % 2 === 1)); });
      }
      // ajout d'une compétence personnalisée (les listes des règles sont
      // ouvertes : « … ») — seulement en mode édition du module
      if (!isEdit("comps")) return;
      var addRow = el("div", "pc-comp-add");
      var inp = el("input");
      inp.type = "text"; inp.placeholder = "Nouvelle compétence " + carac + "…";
      addRow.appendChild(inp);
      addRow.appendChild(miniBtn("+", "Ajouter", function () {
        var name = capFirst(inp.value.trim());
        if (!name) return;
        var exists = allComps().some(function (it) { return it.carac === carac && it.name.toLowerCase() === name.toLowerCase(); });
        if (exists) { flash("Cette compétence existe déjà."); return; }
        state.customComps.push({ name: name, carac: carac });
        // ne jamais ajouter une compétence qui resterait invisible
        if (!compPerso) {
          compPerso = true;
          if (compPersoChip) compPersoChip.classList.add("on");
        }
        inp.value = "";
        refresh();
        rebuildComps();
        if (optCompsRebuild) optCompsRebuild();   // la nouvelle comp gagne sa ligne dans Options
      }));
      compBox.appendChild(addRow);
    });
    refresh();
  }
  function buildComps() {
    // jeu : filtres (outils de vue) et totaux-jets ; édition : stades, ajout
    // et retrait de compétences perso. Le rouage rebâtit la liste : les
    // rangées d'ajout n'existent qu'en édition.
    var b = block("Compétences", null, "comps", function () { rebuildComps(); });
    // outils sur deux lignes : filtre texte + filtre de champ côte à côte,
    // puis les deux puces de filtre en dessous
    var tools = el("div", "pc-comp-tools");
    var line1 = el("div", "row");
    var search = champFiltre(function () { return compFilter; },
                             function (v) { compFilter = v; }, null, rebuildComps);
    if (search) line1.appendChild(search);
    if (filtreChampOn()) {
      var champSel = el("select", "pc-select");
      ["Tous les champs", "Body", "Mind", "Prestance"].forEach(function (ch) {
        var o = el("option");
        o.value = ch === "Tous les champs" ? "" : ch;
        o.textContent = ch;
        champSel.appendChild(o);
      });
      champSel.value = compChamp;
      champSel.addEventListener("change", function () { compChamp = champSel.value; rebuildComps(); });
      line1.appendChild(champSel);
    }
    if (line1.children.length) tools.appendChild(line1);
    var line2 = el("div", "row");
    var persoChip = el("span", "pc-chip");
    persoChip.textContent = "Personnalisées";
    persoChip.title = "Décoché : seules les compétences de base du jeu sont affichées.";
    persoChip.classList.toggle("on", compPerso);
    persoChip.addEventListener("click", function () {
      compPerso = !compPerso;
      persoChip.classList.toggle("on", compPerso);
      rebuildComps();
    });
    compPersoChip = persoChip;
    line2.appendChild(persoChip);
    var onlyChip = el("span", "pc-chip");
    onlyChip.textContent = "Investies";
    onlyChip.title = "N'afficher que les compétences où un stade, un passif ou un modificateur est posé.";
    onlyChip.classList.toggle("on", compOnly);
    onlyChip.addEventListener("click", function () {
      compOnly = !compOnly;
      onlyChip.classList.toggle("on", compOnly);
      rebuildComps();
    });
    line2.appendChild(onlyChip);
    tools.appendChild(line2);
    b.appendChild(tools);
    compBox = el("div");
    b.appendChild(compBox);
    rebuildComps();
    return b;
  }

  // ---------- onglet Art ----------
  // La personnalisation d'une compétence vit ICI : au stade qui ouvre les
  // passifs et l'art (« Artiste » sous les règles actuelles), sa carte porte les
  // fiches de passifs, le nom et la description de l'art. Aucun
  // contenu de règles : seulement les données du personnage. La liste se
  // reconstruit seulement quand les compétences éligibles (ou leur stade)
  // changent, pas à chaque frappe.
  // porteArt : la compétence a un art non vide (même si le stade est redescendu)
  function porteArt(c) {
    return !!(c && c.art && (String(c.art.name || "").trim() || String(c.art.desc || "").trim()));
  }
  function artComps() {
    // même ordre que la Fiche : Body, puis Mind, puis Prestance, puis alphabétique
    var rang = {};
    CHAMPS.forEach(function (ch, i) { rang[ch] = i; });
    return allComps().filter(function (it) {
      var c = state.comps[it.key];
      // les passifs rédigés et l'art restent VISIBLES même si le stade ne les
      // ouvre plus (stade redescendu, ou stade d'ouverture déplacé) : les
      // données du joueur ne disparaissent jamais en silence
      return !!(c && (stadeInfo(c.stade).techniques || stadeInfo(c.stade).art ||
                      (c.techniques && c.techniques.length) || porteArt(c)));
    }).sort(function (a, b) {
      return (rang[a.carac] || 0) - (rang[b.carac] || 0)
        || a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
    });
  }
  function artStadeNom() {
    // premier stade qui ouvre quelque chose (techniques ou art)
    for (var i = 0; i < DATA.stades.length; i++)
      if (DATA.stades[i].techniques || DATA.stades[i].art) return DATA.stades[i].nom;
    return null;
  }
  function buildArt() {
    // jeu : lire les arts et passifs, les envoyer au tchat ; édition :
    // rédiger, ajouter, retirer
    var b = block("Arts et passifs", null, "arts");
    var box = el("div", "pc-arts");
    b.appendChild(box);

    function artCard(it) {
      var c = state.comps[it.key];
      var card = el("div", "pc-av pc-art");

      var top = el("div", "pc-art-top");
      var chip = el("span", "pc-abbr", ABBR[it.carac] || it.carac);
      chip.title = it.carac;
      top.appendChild(chip);
      top.appendChild(el("span", "pc-art-comp", it.name));
      top.appendChild(el("span", "pc-art-stade", stadeInfo(c.stade).nom));
      card.appendChild(top);

      // l'art, au stade qui l'ouvre — et un art DÉJÀ rédigé reste visible et
      // éditable même si le stade ne l'ouvre plus (même échappatoire que les
      // passifs : les données du joueur ne disparaissent jamais en silence).
      // Il n'entre dans l'état qu'à la première frappe : un art resté vierge
      // ne doit pas générer d'écriture (Attributes Roll20) à la simple
      // ouverture de la fiche.
      if (stadeInfo(c.stade).art || porteArt(c)) {
        var a = c.art || { name: "", desc: "" };
        var keep = function () { c.art = a; };
        var head = el("div", "pc-av-head");
        var nm = el("input", "nm pc-edit-field");
        nm.type = "text"; nm.placeholder = "Nom du passif"; nm.value = a.name || "";
        nm.addEventListener("input", function () { a.name = nm.value; keep(); save(); });
        head.appendChild(nm);

        // coût de l'art, à droite de son nom : rien par défaut (il vient avec
        // son stade), une valeur le force
        var aCout = el("span", "pc-tech-cout pc-edit-only");
        var aIn = el("input");
        aIn.type = "number"; aIn.min = "0"; aIn.step = "5";
        aIn.placeholder = "0";
        aIn.value = (a.cout === null || a.cout === undefined) ? "" : a.cout;
        aIn.addEventListener("input", function () {
          var v = parseFloat(aIn.value);
          if (isFinite(v)) a.cout = clamp(Math.floor(v), 0, 9999);
          else delete a.cout;
          keep();
          refresh();
        });
        aCout.title = "Coût de l'art — vide = 0 xp (il vient avec son stade) ; une valeur le force.";
        aCout.appendChild(aIn);
        aCout.appendChild(el("span", "u", "xp"));
        head.appendChild(aCout);
        // la compétence tient dans le titre : la carte n'a plus de colonne de
        // libellé, sa description occupe toute la largeur
        head.appendChild(chatBtn(
          function () { return "Passif — " + (a.name || it.name) + " (" + it.name + ")"; },
          function () { return [["", a.desc]]; }));
        head.appendChild(miniBtn("✕", "Effacer cet art", function () {
          // un texte rédigé ne part pas sur un simple clic (le ✕ jouxte Chat)
          if ((String(a.name || "").trim() || String(a.desc || "").trim()) &&
              !confirm("Effacer l'art « " + (a.name || it.name) + " » et sa description ?")) return;
          delete c.art;
          refresh();
          render();
        }, "danger pc-edit-only"));
        card.appendChild(head);

        var d = el("textarea", "pc-notes pc-edit-field");
        d.rows = 5;
        d.placeholder = "Effet";
        d.value = a.desc || "";
        d.addEventListener("input", function () { a.desc = d.value; keep(); save(); });
        card.appendChild(d);
      }

      // les passifs, dès le stade qui les ouvre
      var techBox = el("div", "pc-techniques");
      card.appendChild(techBox);
      function renderTechs() {
        var cc = state.comps[it.key];
        techBox.innerHTML = "";
        // même échappatoire que compXp et artComps : des passifs EXISTANTS
        // restent lisibles, éditables et supprimables même si le stade courant
        // ne les ouvre plus (fiche migrée : leur stade d'ouverture a bougé)
        if (!cc || (!stadeInfo(cc.stade).techniques && !(cc.techniques && cc.techniques.length))) return;
        cc.techniques.forEach(function (t, i) {
          var tCard = el("div", "pc-av pc-technique");
          var tHead = el("div", "pc-av-head");
          var tNm = el("input", "nm pc-edit-field");
          tNm.type = "text"; tNm.placeholder = "Nom du passif"; tNm.value = t.name || "";
          tNm.addEventListener("input", function () { t.name = tNm.value; state.comps[it.key] = cc; save(); });
          tHead.appendChild(tNm);

          // coût du passif, à droite du nom : vide = tarif de base, une valeur
          // le force (décision du MJ, passif hors barème)
          var tCout = el("span", "pc-tech-cout pc-edit-only");
          var cIn = el("input");
          cIn.type = "number"; cIn.min = "0"; cIn.step = "5";
          cIn.value = (t.cout === null || t.cout === undefined) ? "" : t.cout;
          cIn.addEventListener("input", function () {
            var v = parseFloat(cIn.value);
            if (isFinite(v)) t.cout = clamp(Math.floor(v), 0, 9999);
            else delete t.cout;
            state.comps[it.key] = cc;
            refresh();
          });
          tCout.appendChild(cIn);
          tCout.appendChild(el("span", "u", "xp"));
          // état posé ICI (renderTechs se rejoue à chaque ajout, retrait ou
          // changement de stade) : un hook global fuirait, cette fonction
          // n'étant pas vidée par mount()
          cIn.placeholder = String(DATA.xpParStade);
          tCout.title = "Coût de ce passif — vide = " + DATA.xpParStade +
                        " xp (tarif de base) ; une valeur le force.";
          tHead.appendChild(tCout);
          tHead.appendChild(chatBtn(
            function () { return "Passif — " + (t.name || it.name) + " (" + it.name + ")"; },
            function () { return [["", t.desc]]; }));
          tHead.appendChild(miniBtn("✕", "Retirer ce passif", function () {
            if ((String(t.name || "").trim() || String(t.desc || "").trim()) &&
                !confirm("Retirer le passif « " + (t.name || "sans nom") + " » ?")) return;
            cc.techniques.splice(i, 1); state.comps[it.key] = cc; refresh(); renderTechs();
          }, "danger pc-edit-only"));
          tCard.appendChild(tHead);
          var tD = el("textarea", "pc-notes pc-edit-field");
          tD.rows = 3;
          tD.placeholder = "Effet";
          tD.value = t.desc || "";
          tD.addEventListener("input", function () { t.desc = tD.value; state.comps[it.key] = cc; save(); });
          tCard.appendChild(tD);
          techBox.appendChild(tCard);
        });
        // en acheter de NOUVEAUX reste réservé au stade qui les ouvre
        if (!stadeInfo(cc.stade).techniques) { applyEdit(b, "arts"); return; }
        // le coût annoncé est celui d'un passif neuf : le tarif de base
        // (l'art de la compétence est repris dans la comparaison, sinon son
        // coût forcé fausserait la différence)
        function avecPassifNeuf() {
          return { stade: cc.stade, art: cc.art, techniques: cc.techniques.concat([{ name: "", desc: "" }]) };
        }
        var prochaine = compXp(avecPassifNeuf()) - compXp(cc);
        techBox.appendChild(miniBtn("+ passif (" + prochaine + " xp)", null, function () {
          var test = avecPassifNeuf();
          var delta = compXp(test) - compXp(cc);
          if (delta > 0 && xpRestant() < delta) { flash("XP insuffisant."); return; }
          if (delta > 0 && compXp(test) > compCap()) { flash("Pas plus d'un quart de l'xp total (" + compCap() + " xp) dans une seule compétence."); return; }
          cc.techniques.push({ name: "", desc: "" }); state.comps[it.key] = cc; refresh(); renderTechs();
        }, "pc-edit-only"));
        applyEdit(b, "arts");
      }
      renderTechs();
      return card;
    }

    function render() {
      box.innerHTML = "";
      var items = artComps();
      if (!items.length) {
        var nom = artStadeNom();
        box.appendChild(el("div", "pc-empty",
          nom ? "Aucune compétence n'a atteint le stade " + nom + "." : "Aucun stade n'ouvre de passif ou d'art."));
        return;
      }
      items.forEach(function (it) { box.appendChild(artCard(it)); });
      applyEdit(b, "arts");
    }

    // reconstruire seulement quand les compétences éligibles ou leur stade
    // changent : les frappes (save sans refresh) ne détruisent pas le focus
    var lastSig = null;
    hooks.push(function () {
      var sig = artComps().map(function (it) {
        var c = state.comps[it.key];
        return it.key + ":" + (c ? c.stade : 0);
      }).join("|");
      if (sig !== lastSig) { lastSig = sig; render(); }
    });
    return b;
  }

  // ---------- onglet Équipement ----------
  function eqField(labelTxt, obj, key, wide) {
    var i = el("input", "pc-edit-field");
    i.type = "text";
    i.placeholder = labelTxt;
    i.value = obj[key] || "";
    i.addEventListener("input", function () { obj[key] = i.value; save(); });
    return fld(labelTxt, i, wide ? "w" : null);
  }
  function eqArea(labelTxt, obj, key, rows) {
    var t = el("textarea", "pc-notes pc-edit-field");
    t.rows = rows || 3;
    t.value = obj[key] || "";
    t.addEventListener("input", function () { obj[key] = t.value; save(); });
    return fld(labelTxt, t, "w");
  }
  // Le champ accepte TOUTE expression Roll20, pas seulement « 5D8 » : dés,
  // références d'attribut @{Perso|jjk_body}, requêtes ?{…}, arithmétique.
  // L'expression part telle quelle dans le jet en ligne. Elle n'est PAS
  // réécrite : l'ancienne extraction n'en gardait que les premiers dés et
  // jetait le reste en silence (« 5d6+@{Zhalian|jjk_body}/10 » devenait
  // « 5d6 »).
  function diceOf(txt) {
    return String(txt == null ? "" : txt).replace(/\s+/g, " ").trim() || null;
  }
  function eqCards(box, items, kind, blk, mid) {
    // kind : "arme" (poids/dégâts/reach/propriétés) ou "armure" (poids/invu/zones)
    // blk / mid : le bloc hôte et son id de module d'édition (jeu : Jet et
    // Chat ; édition : fiches, ajout, retrait)
    function render() {
      box.innerHTML = "";
      items.forEach(function (it, idx) {
        var card = el("div", "pc-arme");
        var head = el("div", "pc-arme-head");
        var nm = el("input", "nm pc-edit-field");
        nm.type = "text";
        nm.placeholder = kind === "arme" ? "Nom de l'arme" : "Nom de l'armure";
        nm.value = it.nom || "";
        nm.addEventListener("input", function () { it.nom = nm.value; save(); });
        head.appendChild(nm);
        head.appendChild(chatBtn(
          function () { return (kind === "arme" ? "Arme — " : "Armure — ") + (it.nom || (kind === "arme" ? "arme" : "armure")); },
          function () {
            // valeurs courtes étiquetées, propriétés (texte long) pleine largeur
            return kind === "arme"
              ? [["Poids", it.poids], ["Dégâts", it.degats], ["Reach", it.reach], ["", it.props]]
              : [["Poids", it.poids], ["Invu", it.invu], ["Zones protégées", it.zones]];
          }));
        head.appendChild(miniBtn("✕", "Retirer", function () { items.splice(idx, 1); render(); refresh(); }, "danger pc-edit-only"));
        card.appendChild(head);

        var line = el("div", "pc-arme-line");
        line.appendChild(eqField("Poids", it, "poids"));
        if (kind === "arme") {
          line.appendChild(eqField("Dégâts", it, "degats"));
          line.appendChild(eqField("Reach", it, "reach"));
        } else {
          line.appendChild(eqField("Invu", it, "invu"));
        }
        var chip = el("span", "pc-roll-chip", "Jet");
        chip.title = kind === "arme" ? "Lancer les dégâts" : "Lancer l'invu";
        chip.addEventListener("click", function () {
          var d = diceOf(kind === "arme" ? it.degats : it.invu);
          if (!d) { flash("Renseigner d'abord " + (kind === "arme" ? "les dégâts" : "l'invu") +
                          " (ex. 5D8, ou toute expression Roll20)."); return; }
          doRoll((kind === "arme" ? "Dégâts — " : "Invu — ") + (it.nom || (kind === "arme" ? "arme" : "armure")), 0, d, false);
        });
        line.appendChild(chip);
        card.appendChild(line);

        var line2 = el("div", "pc-arme-line");
        if (kind === "arme") line2.appendChild(eqArea("Avantages / désavantages", it, "props", 3));
        else line2.appendChild(eqArea("Zones protégées", it, "zones", 2));
        card.appendChild(line2);

        box.appendChild(card);
      });
      if (!items.length) box.appendChild(el("div", "pc-empty", kind === "arme" ? "Aucune arme." : "Aucune armure."));
      var add = miniBtn(kind === "arme" ? "+ Ajouter une arme" : "+ Ajouter une armure", null, function () {
        items.push({});
        render();
        refresh();
      }, "pc-edit-only");
      box.appendChild(add);
      if (blk) applyEdit(blk, mid);
    }
    render();
  }
  // ---------- donner / prendre un objet (entre joueurs, par le tchat) ----------
  // Le donneur envoie au tchat une carte portant un lien « Prendre » : le
  // payload de l'objet y voyage encodé en base64. L'extension Roll20 intercepte
  // le clic sur ce lien (la fiche, dans son iframe, ne voit pas le tchat) et
  // renvoie le payload à la fiche du preneur, qui affiche son dialogue de
  // réception. L'encodage vit ICI, côté site : son format peut donc évoluer
  // sans jamais re-signer l'extension, qui ne fait que relayer.
  var TAKE_CMD = "/jjk_take";
  var IMG_MAX = 4000;   // une vignette plus lourde ne tient pas dans un message
  function b64encode(txt) {
    try {
      if (typeof TextEncoder !== "undefined") {
        var oct = new TextEncoder().encode(txt), s = "";
        for (var i = 0; i < oct.length; i++) s += String.fromCharCode(oct[i]);
        return btoa(s);
      }
    } catch (e) {}
    return btoa(unescape(encodeURIComponent(txt)));
  }
  function b64decode(b64) {
    var bin = atob(String(b64 || "").replace(/-/g, "+").replace(/_/g, "/"));
    try {
      if (typeof TextDecoder !== "undefined") {
        var oct = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) oct[i] = bin.charCodeAt(i);
        return new TextDecoder().decode(oct);
      }
    } catch (e) {}
    return decodeURIComponent(escape(bin));
  }
  // objet -> payload compact (clés courtes : le message de tchat est borné)
  function packObjet(it, qte) {
    var p = {
      n: String(it.nom || ""), q: Math.max(0, pnum(qte)) || 1, p: pnum(it.poids),
      d: String(it.desc || ""), k: String(it.id || ""),
      a: pnum(it.achat), v: pnum(it.vente)
    };
    var img = String(it.img || "");
    if (img && (img.length <= IMG_MAX || !/^data:/.test(img))) p.i = img;
    return b64encode(JSON.stringify(p));
  }
  function unpackObjet(b64) {
    var o;
    try { o = JSON.parse(b64decode(b64)); } catch (e) { return null; }
    if (!o || typeof o !== "object") return null;
    return {
      nom: String(o.n || "Objet"), qte: Math.max(0, pnum(o.q)) || 1, poids: pnum(o.p),
      desc: String(o.d || ""), img: String(o.i || ""),
      id: String(o.k || ""), achat: pnum(o.a), vente: pnum(o.v)
    };
  }

  // ---------- boîte de dialogue (jamais prompt/confirm pour un formulaire) ----------
  // Dans Roll20 la fiche est une iframe d'une autre origine : les fenêtres
  // natives y sont muettes sous Chrome. Tout formulaire passe donc par cette
  // couche, posée dans le document de la fiche.
  function dialogue(titre, corps, valider, libelleValider) {
    var over = el("div", "pc-modal-over");
    var box = el("div", "pc-modal");
    box.appendChild(el("div", "pc-modal-title", titre));
    box.appendChild(corps);
    var pied = el("div", "pc-modal-actions");
    function fermer() { if (over.parentNode) over.parentNode.removeChild(over); }
    pied.appendChild(miniBtn("Annuler", null, fermer));
    var ok = miniBtn(libelleValider || "Valider", null, function () {
      if (valider() !== false) fermer();
    }, "primary");
    pied.appendChild(ok);
    box.appendChild(pied);
    over.appendChild(box);
    over.addEventListener("mousedown", function (e) { if (e.target === over) fermer(); });
    // DANS .perso-atelier : c'est lui qui porte les jetons de couleur (jour et
    // nuit) ; accroché plus haut, le dialogue perdrait tout son habillage
    (appEl || rootEl || document.body).appendChild(over);
    setTimeout(function () {
      var f = box.querySelector("input, textarea, select");
      if (f) { f.focus(); if (f.select) f.select(); }
    }, 0);
    return { fermer: fermer };
  }

  // Donner : combien, puis la carte part au tchat et la pile diminue d'autant.
  function donnerDialogue(it, qteDefaut) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "L'objet quitte l'inventaire et part dans le tchat : le premier joueur qui clique « Prendre » le reçoit."));
    var qIn = el("input", "n");
    qIn.type = "number"; qIn.min = "0"; qIn.max = String(it.qte); qIn.step = "any";
    qIn.value = fmtP(Math.min(pnum(qteDefaut) || it.qte, it.qte));
    corps.appendChild(fld("Quantité à donner (sur " + fmtP(it.qte) + ")", qIn));
    dialogue("Donner « " + (it.nom || "objet") + " »", corps, function () {
      var q = Math.min(pnum(qIn.value) || it.qte, it.qte);
      if (!it.qte || !q) { flash("Cet objet n'est plus en stock."); return; }
      // le nom passe par envSan comme partout ailleurs : sans lui, un nom qui
      // porte une accolade ou un saut de ligne (objet importé, objet reçu d'un
      // autre joueur) compose une commande que l'extension refuse — et l'objet
      // serait quand même retiré de l'inventaire, donc perdu.
      var cmd = "&{template:default} {{name=Objet donné — " + (envSan(it.nom) || "objet") + "}}" +
                (q > 1 ? " {{Quantité=" + fmtP(q) + "}}" : "") +
                (it.desc ? " {{=" + String(it.desc).replace(/[{}]/g, "").replace(/\s+/g, " ").trim() + "}}" : "") +
                " {{Prendre=[Prendre](" + TAKE_CMD + " " + packObjet(it, q) + ")}}";
      if (typeof window.__jjkChat === "function") envoyer(cmd);
      else flash("Hors de Roll20 : rien n'est envoyé au tchat (l'objet reste dans l'inventaire).");
      if (typeof window.__jjkChat === "function") {
        it.qte = Math.max(0, Math.round((it.qte - q) * 100) / 100);
        if (!it.qte) {
          var i = state.inv.objets.indexOf(it);
          if (i >= 0) state.inv.objets.splice(i, 1);
        }
        refresh();
        if (invRender) invRender();
      }
    }, "Donner");
  }

  // Prendre : l'objet arrive du tchat (relayé par l'extension). S'il existe
  // déjà, on empile les quantités et on tranche champ par champ ce qui diffère.
  var invRender = null;   // posé par invObjets : re-rendu de l'inventaire
  function recevoirObjet(payload) {
    var recu = unpackObjet(payload);
    if (!recu) { flash("Objet illisible (message abîmé)."); return; }
    var G = state.inv.groupes, items = state.inv.objets;
    // reconnaissance : d'abord l'identifiant (deux objets homonymes mais
    // distincts ne fusionnent pas), à défaut le nom
    var jumeau = null;
    if (recu.id) {
      items.forEach(function (x) { if (!jumeau && x.id && x.id === recu.id) jumeau = x; });
    }
    if (!jumeau) {
      items.forEach(function (x) {
        if (!jumeau && !x.id && !recu.id &&
            String(x.nom).trim().toLowerCase() === recu.nom.trim().toLowerCase()) jumeau = x;
      });
    }

    var corps = el("div", "pc-modal-body");
    if (recu.img) {
      var imb = el("div", "pc-modal-img");
      var im = el("img"); im.alt = ""; im.src = recu.img;
      imb.appendChild(im);
      corps.appendChild(imb);
    }
    var qIn = el("input", "n");
    qIn.type = "number"; qIn.min = "0"; qIn.max = String(recu.qte); qIn.step = "any";
    qIn.value = fmtP(recu.qte);
    corps.appendChild(fld("Quantité à prendre (sur " + fmtP(recu.qte) + ")", qIn));

    var gSel = null;
    if (!jumeau) {
      gSel = el("select");
      G.forEach(function (gn, gi) {
        var o = el("option", null, gn);
        o.value = String(gi);
        gSel.appendChild(o);
      });
      corps.appendChild(fld("Ranger dans", gSel));
    }

    // conflits : pour chaque champ qui diffère, garder le sien ou prendre le neuf
    var choix = {};
    if (jumeau) {
      corps.appendChild(el("div", "pc-modal-note",
        "« " + jumeau.nom + " » est déjà dans l'inventaire (" + fmtP(jumeau.qte) + ")" +
        (recu.id ? " — même identifiant" : "") + " : les quantités s'additionnent."));
      [["nom", "Nom"], ["img", "Image"], ["poids", "Poids"],
       ["desc", "Description"], ["achat", "Achat"], ["vente", "Vente"]].forEach(function (c) {
        var mien = String(jumeau[c[0]] || ""), neuf = String(recu[c[0]] || "");
        if (mien === neuf || (!mien && !neuf)) return;
        choix[c[0]] = "mien";
        var bloc = el("div", "pc-modal-conflit");
        bloc.appendChild(el("div", "lbl", c[1] + " : deux versions"));
        var row = el("div", "row");
        [["mien", "Garder le mien", mien], ["neuf", "Prendre le nouveau", neuf]].forEach(function (opt) {
          var b = el("button", "pc-modal-choix" + (opt[0] === "mien" ? " on" : ""));
          b.type = "button";
          b.appendChild(el("div", "tag", opt[1]));
          if (c[0] === "img" && opt[2]) {
            var mi = el("img"); mi.alt = ""; mi.src = opt[2];
            b.appendChild(mi);
          } else {
            b.appendChild(el("div", "val", opt[2] ? (c[0] === "poids" ? fmtP(pnum(opt[2])) : opt[2]) : "— vide —"));
          }
          b.addEventListener("click", function () {
            choix[c[0]] = opt[0];
            Array.prototype.forEach.call(row.children, function (x) { x.classList.remove("on"); });
            b.classList.add("on");
          });
          row.appendChild(b);
        });
        bloc.appendChild(row);
        corps.appendChild(bloc);
      });
    }

    dialogue("Prendre « " + recu.nom + " »", corps, function () {
      var q = Math.min(pnum(qIn.value) || recu.qte, recu.qte);
      if (jumeau) {
        jumeau.qte = Math.round((jumeau.qte + q) * 100) / 100;
        ["nom", "img", "poids", "desc", "achat", "vente"].forEach(function (k) {
          if (choix[k] === "neuf") jumeau[k] = recu[k];
        });
        if (!jumeau.id && recu.id) jumeau.id = recu.id;
      } else {
        items.push({
          nom: recu.nom, qte: q, poids: recu.poids, img: recu.img, desc: recu.desc,
          id: recu.id, achat: recu.achat, vente: recu.vente,
          groupe: gSel ? clamp(num(gSel.value, 0), 0, G.length - 1) : 0
        });
      }
      refresh();
      if (invRender) invRender();
      flash(fmtP(q) + " × « " + recu.nom + " » ajouté à l'inventaire.");
    }, "Prendre");
  }

  // ---------- inventaire : objets illustrés (tuiles par groupes + panneau) ----------
  // Transposition de l'inventaire à images : tuiles par groupes (Sur soi,
  // Sacoche…), clic -> panneau de détail (image, quantité, poids, groupe,
  // description, envoi au tchat), glisser-déposer entre groupes. Les images
  // importées d'un fichier sont réduites en vignette pour tenir dans la fiche
  // (et dans les Attributes Roll20) ; préférer une URL quand c'est possible.
  function invObjets(container, renderRef) {
    var G = state.inv.groupes;
    var items = state.inv.objets;
    var O = state.inv.opts;
    var sel = null;          // index dans items de l'objet affiché au panneau
    var dragIdx = null;
    var editGi = null;       // groupe à ouvrir en édition de nom au prochain render
    var tileRefs = {};       // idx -> { tile, nom, badge } pour maj sans re-render

    // réglages d'affichage du module, en mode édition seulement
    var optRow = el("div", "pc-obj-opts pc-edit-only");
    var colIn = el("input", "n");
    colIn.type = "number"; colIn.min = "1"; colIn.max = "8"; colIn.step = "1";
    colIn.value = O.cols;
    colIn.title = "Objets par ligne";
    colIn.addEventListener("input", function () {
      O.cols = clamp(num(colIn.value, 4), 1, 8);
      render();
      refresh();
    });
    optRow.appendChild(fld("Par ligne", colIn));
    [["nom", "Nom"], ["qte", "Quantité"], ["poids", "Poids"], ["total", "Total"]].forEach(function (o) {
      var chip = el("span", "pc-chip");
      chip.textContent = o[1];
      chip.title = "Afficher « " + o[1] + " » sur les tuiles" + (o[0] === "total" ? " (total en bas du module)" : "");
      chip.classList.toggle("on", !!O[o[0]]);
      chip.addEventListener("click", function () {
        O[o[0]] = !O[o[0]];
        chip.classList.toggle("on", !!O[o[0]]);
        render();
        refresh();
      });
      optRow.appendChild(chip);
    });
    container.appendChild(optRow);

    var wrap = el("div", "pc-obj-wrap");
    var leftBox = el("div", "pc-obj-left");
    var panel = el("div", "pc-obj-panel");
    wrap.appendChild(leftBox);
    wrap.appendChild(panel);
    var tot = el("div", "pc-inv-total");

    function totalObjets() {
      var t = 0;
      items.forEach(function (it) { t += it.qte * it.poids; });
      return t;
    }
    // le poids de JJK n'a pas d'unité : c'est une valeur nue
    function updateTotal() {
      tot.style.display = O.total ? "" : "none";
      tot.textContent = "Poids total : " + fmtP(totalObjets());
    }

    function vignette(file, cb) {
      var r = new FileReader();
      r.onerror = function () { flash("Image illisible."); };
      r.onload = function () {
        var img = new Image();
        img.onload = function () {
          if (!img.width || !img.height) { flash("Image illisible."); return; }   // ex. SVG sans dimensions
          var S = 96, c = document.createElement("canvas");
          c.width = S; c.height = S;
          var k = Math.max(S / img.width, S / img.height);
          var w = img.width * k, h = img.height * k;
          c.getContext("2d").drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
          cb(c.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = function () { flash("Image illisible."); };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    }

    function moveTo(from, gi, targetIt) {
      // déplace items[from] dans le groupe gi, juste avant targetIt (null : à la fin).
      // La position cible se recalcule APRÈS le retrait : retirer l'objet déplacé
      // décale les index de tout ce qui le suivait.
      var moved = items.splice(from, 1)[0];
      moved.groupe = gi;
      var at = targetIt ? items.indexOf(targetIt) : -1;
      if (at < 0) items.push(moved);
      else items.splice(at, 0, moved);
      sel = items.indexOf(moved);
    }

    function tile(it, idx) {
      var t = el("div", "pc-obj-tile" + (sel === idx ? " sel" : ""));
      if (it.img) {
        var im = el("img");
        im.alt = ""; im.draggable = false;
        im.src = it.img;
        t.appendChild(im);
      } else t.appendChild(el("div", "pc-obj-ph", "?"));
      // retrait direct depuis la tuile, en mode édition
      var del = el("button", "pc-obj-del pc-edit-only", "✕");
      del.type = "button";
      del.title = "Retirer cet objet";
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        if ((it.nom || it.desc) &&
            !confirm("Retirer « " + (it.nom || "cet objet") + " » de l'inventaire ?")) return;
        var here = items.indexOf(it);
        items.splice(here, 1);
        if (sel === here) sel = null;
        else if (sel !== null && sel > here) sel--;
        render();
        refresh();
      });
      t.appendChild(del);
      var foot = el("div", "pc-obj-foot");
      var nom = el("span", "nm", it.nom || "Objet");
      if (!O.nom) nom.style.display = "none";
      foot.appendChild(nom);
      var poids = el("span", "pds", it.poids ? fmtP(it.poids) : "");
      poids.title = "Poids unitaire";
      if (!O.poids) poids.style.display = "none";
      foot.appendChild(poids);
      var badge = el("span", "qte", "×" + fmtP(it.qte));
      if (!O.qte) badge.style.display = "none";
      foot.appendChild(badge);
      // pied inutile si tout est masqué : la tuile reste une vignette nette
      if (!O.nom && !O.poids && !O.qte) foot.style.display = "none";
      t.appendChild(foot);
      tileRefs[idx] = { tile: t, nom: nom, badge: badge, poids: poids };

      t.addEventListener("click", function () { sel = idx; render(); });
      t.draggable = true;
      t.addEventListener("dragstart", function (e) {
        // réordonner et changer de groupe = construction : mode édition requis
        if (!isEdit("inv")) { e.preventDefault(); return; }
        dragIdx = idx;
        t.classList.add("drag");
        try { e.dataTransfer.setData("text/plain", ""); e.dataTransfer.effectAllowed = "move"; } catch (err) {}
      });
      t.addEventListener("dragend", function () { dragIdx = null; render(); });
      t.addEventListener("dragover", function (e) {
        if (dragIdx === null) return;
        // lâcher sur soi-même : cible invalide, et on N'EN LAISSE PAS le
        // conteneur du groupe la valider (sinon l'objet saute en fin de groupe)
        if (dragIdx === idx) { e.stopPropagation(); return; }
        e.preventDefault();
        e.stopPropagation();
        // le trait d'insertion se pose du côté visé : l'objet saura où il tombe
        var r = t.getBoundingClientRect();
        var avant = e.clientX < r.left + r.width / 2;
        t.classList.toggle("over-l", avant);
        t.classList.toggle("over-r", !avant);
      });
      t.addEventListener("dragleave", function () { t.classList.remove("over-l", "over-r"); });
      t.addEventListener("drop", function (e) {
        if (dragIdx === null) return;
        if (dragIdx === idx) { e.stopPropagation(); return; }
        e.preventDefault();
        e.stopPropagation();
        var r = t.getBoundingClientRect();
        var avant = e.clientX < r.left + r.width / 2;
        var from = dragIdx; dragIdx = null;
        // déposer à DROITE d'une tuile = s'insérer avant la suivante du groupe.
        // L'objet déplacé est exclu du calcul : sinon il serait sa propre cible
        // et moveTo, qui le retire d'abord, l'expédierait en fin de groupe.
        var cible = it;
        if (!avant) {
          var deplace = items[from];
          var suivants = items.filter(function (x) { return x.groupe === it.groupe && x !== deplace; });
          var k = suivants.indexOf(it);
          cible = k >= 0 && k + 1 < suivants.length ? suivants[k + 1] : null;
        }
        moveTo(from, it.groupe, cible);
        render();
        refresh();
      });
      return t;
    }

    function groupBox(gi) {
      var g = el("div", "pc-obj-group");
      var head = el("div", "pc-obj-ghead");
      var name = el("span", "nm", G[gi]);
      name.title = isEdit("inv") ? "Double-clic : renommer le groupe" : G[gi];
      // édition EN PLACE, jamais prompt() : dans Roll20 la fiche est une iframe
      // d'une autre origine, où Chrome fait échouer prompt() en silence
      function editName() {
        var inp = el("input", "nmedit");
        inp.type = "text";
        inp.value = G[gi];
        inp.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); inp.blur(); }
          else if (e.key === "Escape") { inp.value = G[gi]; inp.blur(); }
        });
        inp.addEventListener("blur", function () {
          G[gi] = inp.value.trim() || G[gi];
          render();
          refresh();
        });
        head.replaceChild(inp, name);
        setTimeout(function () { inp.focus(); inp.select(); }, 0);
      }
      name.addEventListener("dblclick", function () { if (isEdit("inv")) editName(); });
      head.appendChild(name);
      if (editGi === gi) { editGi = null; editName(); }
      if (G.length > 1) {
        var delG = el("button", "x pc-edit-only", "✕");
        delG.type = "button";
        delG.title = "Supprimer le groupe (ses objets rejoignent le premier groupe)";
        delG.addEventListener("click", function () {
          G.splice(gi, 1);
          items.forEach(function (it) {
            if (it.groupe === gi) it.groupe = 0;
            else if (it.groupe > gi) it.groupe--;
          });
          sel = null;
          render();
          refresh();
        });
        head.appendChild(delG);
      }
      g.appendChild(head);

      var tiles = el("div", "pc-obj-tiles");
      tiles.style.setProperty("--obj-cols", O.cols);   // objets par ligne, réglable
      items.forEach(function (it, idx) { if (it.groupe === gi) tiles.appendChild(tile(it, idx)); });
      var add = el("div", "pc-obj-addtile pc-edit-only", "+");
      add.title = "Ajouter un objet dans « " + G[gi] + " »";
      add.addEventListener("click", function () {
        items.push({ nom: "", qte: 1, poids: 0, img: "", desc: "", groupe: gi });
        sel = items.length - 1;
        render();
        refresh();
      });
      tiles.appendChild(add);
      // déposer dans le vide du groupe : l'objet rejoint la fin de ce groupe
      tiles.addEventListener("dragover", function (e) {
        if (dragIdx === null) return;
        e.preventDefault();
        tiles.classList.add("over");
      });
      tiles.addEventListener("dragleave", function () { tiles.classList.remove("over"); });
      tiles.addEventListener("drop", function (e) {
        if (dragIdx === null) return;
        e.preventDefault();
        var from = dragIdx; dragIdx = null;
        moveTo(from, gi, null);
        render();
        refresh();
      });
      g.appendChild(tiles);
      return g;
    }

    function renderPanel() {
      panel.innerHTML = "";
      if (sel === null || !items[sel]) {
        panel.appendChild(el("div", "pc-obj-empty", isEdit("inv")
          ? "Choisir un objet, ou en ajouter un avec « + »."
          : "Choisir un objet."));
        return;
      }
      var it = items[sel];
      var refs = function () { return tileRefs[sel]; };

      var imgbox = el("div", "pc-obj-imgbox");
      if (it.img) { var im = el("img"); im.alt = ""; im.src = it.img; imgbox.appendChild(im); }
      else imgbox.appendChild(el("div", "pc-obj-ph big", "?"));
      panel.appendChild(imgbox);

      var body = el("div", "pc-obj-body");

      var nm = el("input", "nm pc-edit-field");
      nm.type = "text"; nm.placeholder = "Nom de l'objet";
      nm.value = it.nom;
      nm.addEventListener("input", function () {
        it.nom = nm.value;
        if (refs()) refs().nom.textContent = it.nom || "Objet";
        save();
      });
      body.appendChild(nm);

      // quantité : curseur + champ
      var qRow = el("div", "pc-obj-qrow");
      var slider = el("input");
      slider.type = "range"; slider.min = "0";
      slider.max = String(Math.max(10, it.qte));
      slider.value = it.qte;
      slider.step = "any";
      var qIn = el("input", "n");
      qIn.type = "number"; qIn.min = "0"; qIn.step = "any";
      qIn.value = it.qte;
      function setQte(v) {
        // quantités DÉCIMALES : une demi-ration, 2.5 mètres de corde…
        it.qte = isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
        if (+slider.max < it.qte) slider.max = String(it.qte);
        if (document.activeElement !== slider) slider.value = it.qte;
        if (document.activeElement !== qIn) qIn.value = it.qte;
        if (refs()) refs().badge.textContent = "×" + fmtP(it.qte);
        majAct();
        majPile();
        save(); updateTotal();
      }
      slider.addEventListener("input", function () { setQte(parseFloat(slider.value)); });
      qIn.addEventListener("input", function () { setQte(parseFloat(qIn.value)); });
      qRow.appendChild(slider);
      qRow.appendChild(qIn);
      body.appendChild(fld("Quantité", qRow));

      var pair = el("div", "pc-obj-pair");
      var pd = el("input", "pc-edit-field");
      pd.type = "text"; pd.inputMode = "decimal";
      pd.value = it.poids ? fmtP(it.poids) : "";
      pd.placeholder = "0";
      pd.addEventListener("input", function () {
        it.poids = pnum(pd.value);
        if (refs()) refs().poids.textContent = it.poids ? fmtP(it.poids) : "";
        majPile();
        save(); updateTotal();
      });
      pd.addEventListener("blur", function () { pd.value = it.poids ? fmtP(it.poids) : ""; });
      pair.appendChild(fld("Poids", pd));
      var gSel = el("select", "pc-edit-field");
      G.forEach(function (gn, gi) {
        var o = el("option", null, gn);
        o.value = String(gi);
        if (gi === it.groupe) o.selected = true;
        gSel.appendChild(o);
      });
      gSel.addEventListener("change", function () {
        moveTo(sel, clamp(num(gSel.value, 0), 0, G.length - 1), null);
        render();
        refresh();
      });
      pair.appendChild(fld("Groupe", gSel));
      body.appendChild(pair);

      // achat / vente : la valeur marchande de l'objet, laissée nue comme le
      // poids (JJK ne nomme pas sa monnaie)
      var prix = el("div", "pc-obj-pair");
      [["achat", "Achat"], ["vente", "Vente"]].forEach(function (c) {
        var inp = el("input", "pc-edit-field");
        inp.type = "text"; inp.inputMode = "decimal";
        inp.value = it[c[0]] ? fmtP(it[c[0]]) : "";
        inp.placeholder = "0";
        inp.addEventListener("input", function () { it[c[0]] = pnum(inp.value); save(); });
        inp.addEventListener("blur", function () { inp.value = it[c[0]] ? fmtP(it[c[0]]) : ""; });
        prix.appendChild(fld(c[1], inp));
      });
      body.appendChild(prix);

      // identifiant : c'est LUI qui reconnaît le même objet d'une fiche à
      // l'autre quand on le donne (deux « Corde » sans rapport ne fusionnent
      // pas si elles portent des identifiants différents)
      var idIn = el("input", "pc-edit-field");
      idIn.type = "text"; idIn.placeholder = "libre (ex. corde-chanvre)";
      idIn.value = it.id || "";
      idIn.addEventListener("input", function () { it.id = idIn.value; save(); });
      body.appendChild(fld("Identifiant", idIn, "w pc-edit-only"));

      // total de la pile : ce que cet objet pèse en tout (quantité × poids)
      var pile = el("div", "pc-obj-pile");
      function majPile() {
        pile.textContent = "Total : " + fmtP(it.qte * it.poids);
        pile.style.display = it.poids ? "" : "none";
      }
      majPile();
      body.appendChild(pile);

      var url = el("input", "pc-edit-field");
      url.type = "text"; url.placeholder = "https://…";
      url.value = /^data:/.test(it.img) ? "" : it.img;
      url.addEventListener("change", function () { it.img = url.value.trim(); render(); refresh(); });
      var urlFld = fld("Image (URL)", url);
      var file = el("input");
      file.type = "file"; file.accept = "image/*"; file.style.display = "none";
      file.addEventListener("change", function () {
        var f = file.files && file.files[0];
        file.value = "";   // vidé tout de suite : re-choisir le MÊME fichier redéclenche change
        if (!f) return;
        vignette(f, function (dataUrl) { it.img = dataUrl; render(); refresh(); });
      });
      urlFld.appendChild(file);
      urlFld.appendChild(miniBtn("Fichier…", "Importer une image (réduite en vignette 96 px)", function () { file.click(); }, "pc-edit-only"));
      body.appendChild(urlFld);

      var desc = el("textarea", "pc-notes pc-edit-field");
      desc.rows = 3;
      desc.placeholder = "Description, effets, notes…";
      desc.value = it.desc;
      desc.addEventListener("input", function () { it.desc = desc.value; save(); });
      body.appendChild(fld("Description", desc, "w"));

      // quantité d'ACTION : combien d'exemplaires les boutons ci-dessous
      // traitent. Elle ne touche pas la pile tant qu'on n'agit pas.
      var actQte = el("input", "n");
      actQte.type = "number"; actQte.min = "0"; actQte.step = "any";
      actQte.title = "Quantité traitée par les boutons ci-dessous";
      function bornerAct() {
        var v = pnum(actQte.value);
        if (!v || v > it.qte) v = it.qte;
        return Math.round(v * 100) / 100;
      }
      function majAct() {
        actQte.max = String(it.qte);
        if (document.activeElement !== actQte) actQte.value = fmtP(Math.min(pnum(actQte.value) || it.qte, it.qte));
      }
      actQte.value = fmtP(it.qte);
      actQte.addEventListener("blur", function () { actQte.value = fmtP(bornerAct()); });

      var actions = el("div", "pc-obj-actions");
      actions.appendChild(fld("Quantité", actQte, "qact"));
      actions.appendChild(chatBtn(
        function () { return "Objet — " + (it.nom || "objet"); },
        function () {
          var q = bornerAct();
          return [
            ["Groupe", G[it.groupe]],
            ["Quantité", fmtP(q) + (q < it.qte ? " (sur " + fmtP(it.qte) + ")" : "")],
            ["Poids", it.poids ? fmtP(it.poids) + (q > 1 ? " (total " + fmtP(q * it.poids) + ")" : "") : ""],
            ["Valeur", it.vente ? "vente " + fmtP(it.vente) + (it.achat ? " · achat " + fmtP(it.achat) : "")
                                : (it.achat ? "achat " + fmtP(it.achat) : "")],
            ["", it.desc]   // texte long : pleine largeur, sans libellé
          ];
        }));
      // donner : l'objet quitte CET inventaire et part au tchat sous forme de
      // lien « Prendre » ; le premier qui clique le reçoit dans sa fiche
      actions.appendChild(miniBtn("Donner", "Donner cette quantité à un autre joueur", function () {
        donnerDialogue(it, bornerAct());
      }));
      actions.appendChild(miniBtn("Retirer", "Retirer cette quantité (tout : l'objet disparaît)", function () {
        var q = bornerAct();
        var tout = q >= it.qte;
        if (tout && (it.nom || it.desc) &&
            !confirm("Retirer « " + (it.nom || "cet objet") + " » de l'inventaire ?")) return;
        if (tout) {
          items.splice(sel, 1);
          sel = null;
        } else {
          it.qte = Math.round((it.qte - q) * 100) / 100;
        }
        render();
        refresh();
      }, "danger pc-edit-only"));
      body.appendChild(actions);
      panel.appendChild(body);
    }

    function render() {
      tileRefs = {};
      leftBox.innerHTML = "";
      G.forEach(function (_, gi) { leftBox.appendChild(groupBox(gi)); });
      var addG = miniBtn("+ Groupe", "Ajouter un groupe d'objets", function () {
        G.push("Groupe");
        editGi = G.length - 1;   // le nouveau groupe s'ouvre en édition de nom
        render();
        refresh();
      }, "pc-edit-only");
      addG.classList.add("pc-obj-addgroup");
      leftBox.appendChild(addG);
      renderPanel();
      updateTotal();
      applyEdit(container, "inv");
    }
    if (renderRef) renderRef.fn = render;
    invRender = render;   // un objet reçu du tchat redessine l'inventaire
    render();
    container.appendChild(wrap);
    container.appendChild(tot);
  }

  function buildArmes() {
    var bA = block("Armes", null, "armes");
    var boxA = el("div");
    bA.appendChild(boxA);
    eqCards(boxA, state.armes, "arme", bA, "armes");
    return bA;
  }

  function buildArmures() {
    var bB = block("Armures", null, "armures");
    var boxB = el("div");
    bB.appendChild(boxB);
    eqCards(boxB, state.armures, "armure", bB, "armures");
    return bB;
  }

  function buildInv() {
    // le rouage re-rend l'inventaire : messages et titres suivent le mode
    var invRenderRef = { fn: null };
    var bO = block("Inventaire", "objets par groupes", "inv", function () {
      if (invRenderRef.fn) invRenderRef.fn();
    });
    invObjets(bO, invRenderRef);
    return bO;
  }

  // ---------- onglet Bio ----------
  function buildPerso() {
    var bP = block("Personnalité", null, "perso");
    var g = el("div", "pc-id");
    var defIn = el("textarea", "pc-notes pc-edit-field");
    defIn.rows = 3;
    defIn.value = state.defaut || "";
    defIn.addEventListener("input", function () { state.defaut = defIn.value; save(); });
    var defFld = fld("Défaut", defIn, "c12");
    defFld.appendChild(chatBtn(
      function () { return "Défaut" + (state.name ? " — " + state.name : ""); },
      function () { return [["", state.defaut]]; }));
    g.appendChild(defFld);
    [0, 1].forEach(function (qi) {
      var qIn = el("textarea", "pc-notes pc-edit-field");
      qIn.rows = 3;
      qIn.value = state.qualites[qi] || "";
      qIn.addEventListener("input", function () { state.qualites[qi] = qIn.value; save(); });
      var qFld = fld("Qualité " + (qi + 1), qIn, "c6");
      qFld.appendChild(chatBtn(
        function () { return "Qualité " + (qi + 1) + (state.name ? " — " + state.name : ""); },
        function () { return [["", state.qualites[qi]]]; }));
      g.appendChild(qFld);
    });
    bP.appendChild(g);
    return bP;
  }

  function buildAvantages() {
    var bA = block("Avantages", null, "avantages");
    var avBox = el("div");
    bA.appendChild(avBox);
    function renderAv() {
      avBox.innerHTML = "";
      state.avantages.forEach(function (a, i) {
        var card = el("div", "pc-av");
        var head = el("div", "pc-av-head");
        var n = el("input", "nm pc-edit-field");
        n.type = "text"; n.placeholder = "Nom"; n.value = a.name || "";
        n.addEventListener("input", function () { a.name = n.value; save(); });
        head.appendChild(n);
        head.appendChild(chatBtn(
          function () { return "Avantage — " + (a.name || "sans nom"); },
          function () { return [["", a.desc]]; }));
        head.appendChild(miniBtn("✕", "Retirer", function () { state.avantages.splice(i, 1); renderAv(); refresh(); }, "danger pc-edit-only"));
        card.appendChild(head);
        var d = el("textarea", "pc-notes pc-edit-field");
        d.rows = 3;
        d.placeholder = "Effet";
        d.value = a.desc || "";
        d.addEventListener("input", function () { a.desc = d.value; save(); });
        card.appendChild(d);
        avBox.appendChild(card);
      });
      if (!state.avantages.length) avBox.appendChild(el("div", "pc-empty", "Aucun avantage."));
      avBox.appendChild(miniBtn("+ Ajouter un avantage", null, function () {
        state.avantages.push({ name: "", desc: "" });
        renderAv();
        refresh();
      }, "pc-edit-only"));
      applyEdit(bA, "avantages");
    }
    renderAv();
    return bA;
  }

  function buildBackground() {
    var bB = block("Background", null, "bg");
    var bg = el("textarea", "pc-notes pc-edit-field");
    bg.rows = 9;
    bg.value = state.background || "";
    bg.addEventListener("input", function () { state.background = bg.value; save(); });
    bB.appendChild(bg);
    return bB;
  }

  function buildNotes() {
    // les Notes restent libres : c'est le carnet de la session, il s'écrit en jeu
    var bN = block("Notes");
    var nt = el("textarea", "pc-notes");
    nt.rows = 6;
    nt.value = state.notes || "";
    nt.addEventListener("input", function () { state.notes = nt.value; save(); });
    bN.appendChild(nt);
    return bN;
  }

  // ---------- onglet Options ----------
  // ---- jets ----
  function buildJets() {
    var bJ = block("Jets");
    var de = el("input", "de");
    de.type = "text";
    de.title = "Ce que la fiche lance pour un jet de test. Écrit en macro Roll20 : " +
               "cs> marque le coup critique, cf< l'échec critique.";
    de.value = state.de || DE_DEFAUT;
    de.addEventListener("input", function () { state.de = de.value || DE_DEFAUT; save(); });
    hooks.push(function () { if (document.activeElement !== de) de.value = state.de || DE_DEFAUT; });
    // Le champ et son bouton sur la MÊME ligne : le champ prend toute la place
    // que le bouton lui laisse. Sous le champ, le bouton occupait une rangée
    // entière pour un mot, et le bloc en paraissait deux fois plus haut.
    var ligneDe = el("div", "pc-jet-de");
    ligneDe.appendChild(fld("Dé des jets de test", de));
    ligneDe.appendChild(miniBtn("Réinitialiser", "Revenir au dé des règles : " + DE_DEFAUT,
      function () { state.de = DE_DEFAUT; refresh(); }));
    bJ.appendChild(ligneDe);
    return bJ;
  }

  // ---- modificateurs de caractéristiques (hors limite : au-delà de 80, sous 0) ----
  // équipement, art et décisions du MJ confondus : UN modificateur par
  // caractéristique, appliqué au total affiché sur la Fiche
  // MÊME GRILLE QUE LES COMPÉTENCES, et c'est voulu : régler une
  // caractéristique et régler une compétence sont le même geste pour le MJ, il
  // n'a pas à apprendre deux dispositions. Sans le filtre, le menu des champs
  // ni les puces : sur trois lignes, ils ne servent à rien.
  function buildModCaracs() {
    var bM = block("Modificateurs de caractéristiques");
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    bM.appendChild(wrap);

    // un champ de modificateur, nu, comme dans le bloc des compétences
    function champMod(map, cle, borne, titre) {
      var inp = el("input", "pc-num modif");
      inp.type = "number"; inp.step = String(MOD_PAS);
      inp.title = titre;
      inp.addEventListener("input", function () {
        var v = parseFloat(inp.value);
        map[cle] = isFinite(v) ? clamp(Math.round(v), -borne, borne) : 0;
        refresh();
      });
      hooks.push(function () {
        if (document.activeElement !== inp) inp.value = map[cle] ? map[cle] : "";
      });
      return inp;
    }
    // un champ de forçage : vide = valeur calculée
    function champForce(map, cle, auto, titre) {
      var inp = el("input", "force");
      inp.type = "number"; inp.step = "1";
      inp.title = titre;
      inp.addEventListener("input", function () {
        var v = parseFloat(inp.value);
        if (isFinite(v)) map[cle] = clamp(Math.round(v), -9999, 9999);
        else delete map[cle];
        refresh();
      });
      hooks.push(function () {
        inp.placeholder = String(auto());
        if (document.activeElement !== inp) inp.value = map[cle] === undefined ? "" : map[cle];
      });
      return inp;
    }

    var grp = el("div", "pc-optcomp-row grp");
    grp.appendChild(el("span"));
    var gV = el("span", "g", "Valeur");
    gV.title = "Ce que vaut la caractéristique quand on la lance";
    grp.appendChild(gV);
    grp.appendChild(el("span", "rule"));
    var gX = el("span", "g", "Coût en xp");
    gX.title = "Ce que la caractéristique coûte sur l'xp du personnage";
    grp.appendChild(gX);
    box.appendChild(grp);

    var head = el("div", "pc-optcomp-row head");
    [["Carac.", "Caractéristique"],
     ["Forcé", "Total forcé — vide = total calculé"],
     ["Modif.", "Deux modificateurs du total, qui s'additionnent", "duo"],
     ["Total", "Total effectif de la caractéristique"],
     null,
     ["Forcé", "Coût en xp forcé — vide = coût calculé"],
     ["Modif.", "Deux modificateurs du coût en xp, qui s'additionnent", "duo"],
     ["Coût", "Coût effectif en xp"]].forEach(function (h) {
      if (!h) { head.appendChild(el("span", "rule")); return; }
      var sp = el("span", h[2] || null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    box.appendChild(head);

    CHAMPS.forEach(function (name, i) {
      if (!DATA.caracs.some(function (cc) { return cc.name === name; })) return;
      var row = el("div", "pc-optcomp-row pc-mods-host" + (i % 2 === 1 ? " odd" : ""));
      var nameBox = el("span", "pc-comp-name");
      var chip = el("span", "pc-abbr", ABBR[name] || name);
      chip.title = name;
      nameBox.appendChild(chip);
      row.appendChild(nameBox);

      row.appendChild(champForce(state.caracsForce, name,
        function () {
          var v = state.caracsBase[name] + CARAC_PAS * state.caracsXp[name];
          if (!state.sansLimite) v = Math.min(v, CARAC_MAX);
          return v + (state.caracsMod[name] || 0) + (state.caracsMod2[name] || 0);
        },
        "Total forcé — vide = total calculé (création + achats + modificateurs)."));
      row.appendChild(champMod(state.caracsMod, name, 999,
        "Premier modificateur du total — vide = aucun."));
      row.appendChild(champMod(state.caracsMod2, name, 999,
        "Second modificateur du total — vide = aucun."));
      var tot = el("span", "pc-comp-total", "");
      row.appendChild(tot);

      row.appendChild(el("span", "rule"));
      row.appendChild(champForce(state.caracsXpForce, name,
        function () { return caracXpAuto(name); },
        "Coût en xp forcé — vide = coût calculé (achats et modificateurs)."));
      row.appendChild(champMod(state.caracsXpMod, name, 9999,
        "Premier modificateur du coût en xp — vide = aucun."));
      row.appendChild(champMod(state.caracsXpMod2, name, 9999,
        "Second modificateur du coût en xp — vide = aucun."));
      var cout = el("span", "pc-comp-total", "");
      row.appendChild(cout);

      hooks.push(function () {
        var d = (state.caracsMod[name] || 0) + (state.caracsMod2[name] || 0);
        var force = state.caracsForce[name];
        tot.textContent = String(caracTotal(name));
        tot.classList.toggle("adj", d !== 0 || force !== undefined);
        tot.title = force !== undefined
          ? "Total forcé à " + force
          : "création " + state.caracsBase[name] +
            " · achats " + (CARAC_PAS * state.caracsXp[name]) +
            (d ? " · modificateurs " + sign(d) : "");

        var xf = state.caracsXpForce[name];
        var xm = (state.caracsXpMod[name] || 0) + (state.caracsXpMod2[name] || 0);
        var xp = caracXp(name);
        cout.textContent = xp + " xp";
        cout.classList.toggle("zero", !xp);
        cout.classList.toggle("adj", xf !== undefined || xm !== 0);
        cout.title = xf !== undefined
          ? "Coût forcé à " + xf + " xp (calculé : " + caracXpAuto(name) + " xp)"
          : "Achats d'xp" + (xm ? " · modificateurs " + sign(xm) + " xp" : "");

        row.classList.toggle("on", d !== 0 || xm !== 0 ||
                             force !== undefined || xf !== undefined);
      });
      box.appendChild(row);
    });
    return bM;
  }

  // ---- création ----
  function buildCreation() {
    var bC = block("Création");
    var slRow = el("div", "pc-kv");
    var slBox = el("input");
    slBox.type = "checkbox";
    slBox.id = "pc-sanslimite";
    slBox.checked = !!state.sansLimite;
    slBox.addEventListener("change", function () { state.sansLimite = slBox.checked; refresh(); });
    hooks.push(function () { slBox.checked = !!state.sansLimite; });
    var slLab = el("label", null, "Sans limite : plafond de " + CARAC_MAX + " levé");
    slLab.setAttribute("for", "pc-sanslimite");
    slRow.appendChild(slBox);
    slRow.appendChild(slLab);
    bC.appendChild(slRow);
    return bC;
  }

  // ---- modificateurs de compétences ----
  // le pendant du bloc caractéristiques : UN modificateur par compétence
  // (équipement, art, décision du MJ confondus), appliqué au total de la
  // ligne sur la Fiche. Rebâti quand les compétences perso changent
  // (optCompsRebuild, rappelé par l'ajout et la suppression) ; optHooks
  // remplace hooks pour ces lignes, sinon chaque rebâti fuirait des hooks.
  function buildOptComps() {
    var bMC = block("Modificateurs de compétences");
    // mêmes outils que la liste de la Fiche (filtre texte, champ, puces) et
    // mêmes lignes, mais une grille plus large : nom | modificateurs | total
    // forcé | total | modificateur de coût | coût forcé | coût.
    var mcTools = el("div", "pc-comp-tools");
    var mcLine1 = el("div", "row");
    var mcSearch = champFiltre(function () { return optFilter; },
                               function (v) { optFilter = v; }, null,
                               function () { optCompsRebuild(); });
    if (mcSearch) mcLine1.appendChild(mcSearch);
    if (filtreChampOn()) {
      var mcChamp = el("select", "pc-select");
      ["Tous les champs", "Body", "Mind", "Prestance"].forEach(function (ch) {
        var o = el("option");
        o.value = ch === "Tous les champs" ? "" : ch;
        o.textContent = ch;
        mcChamp.appendChild(o);
      });
      mcChamp.value = optChamp;
      mcChamp.addEventListener("change", function () { optChamp = mcChamp.value; optCompsRebuild(); });
      mcLine1.appendChild(mcChamp);
    }
    if (mcLine1.children.length) mcTools.appendChild(mcLine1);
    var mcLine2 = el("div", "row");
    var mcPerso = el("span", "pc-chip");
    mcPerso.textContent = "Personnalisées";
    mcPerso.title = "Décoché : seules les compétences de base du jeu sont affichées.";
    mcPerso.classList.toggle("on", optPerso);
    mcPerso.addEventListener("click", function () {
      optPerso = !optPerso;
      mcPerso.classList.toggle("on", optPerso);
      optCompsRebuild();
    });
    mcLine2.appendChild(mcPerso);
    var mcOnly = el("span", "pc-chip");
    mcOnly.textContent = "Investies";
    mcOnly.title = "N'afficher que les compétences où un stade, un passif ou un modificateur est posé.";
    mcOnly.classList.toggle("on", optOnly);
    mcOnly.addEventListener("click", function () {
      optOnly = !optOnly;
      mcOnly.classList.toggle("on", optOnly);
      optCompsRebuild();
    });
    mcLine2.appendChild(mcOnly);
    mcTools.appendChild(mcLine2);
    bMC.appendChild(mcTools);
    // la grille des leviers est large : elle défile dans son cadre
    var mcWrap = el("div", "pc-optcomp-wrap");
    var mcBox = el("div");
    mcWrap.appendChild(mcBox);
    bMC.appendChild(mcWrap);
    // Modificateur d'une ligne de compétence : un champ NU, sans − ni +. Sur
    // cinquante lignes de sept colonnes, les boutons mangeaient la place et
    // n'apportaient rien qu'on ne fasse au clavier. Les caractéristiques,
    // elles, gardent leurs boutons : elles ne sont que trois.
    function modField(map, key, borne, titre) {
      var inp = el("input", "pc-num modif");
      inp.type = "number"; inp.step = String(MOD_PAS);
      inp.title = titre;
      inp.addEventListener("input", function () {
        var v = parseFloat(inp.value);
        if (isFinite(v) && clamp(Math.round(v), -borne, borne)) map[key] = clamp(Math.round(v), -borne, borne);
        else delete map[key];   // vide ou zéro = pas d'entrée dans l'état
        refresh();
      });
      optHooks.push(function () {
        if (document.activeElement !== inp) inp.value = map[key] === undefined ? "" : map[key];
      });
      return inp;
    }
    // un champ de forçage : vide = valeur calculée, une valeur la remplace
    function forceField(map, key, auto, titre) {
      var inp = el("input", "force");
      inp.type = "number"; inp.step = "1";
      inp.title = titre;
      inp.addEventListener("input", function () {
        var v = parseFloat(inp.value);
        if (isFinite(v)) map[key] = clamp(Math.round(v), -9999, 9999);
        else delete map[key];
        refresh();
      });
      optHooks.push(function () {
        inp.placeholder = String(auto());
        if (document.activeElement !== inp) inp.value = map[key] === undefined ? "" : map[key];
      });
      return inp;
    }
    optCompsRebuild = function () {
      optHooks = [];
      mcBox.innerHTML = "";
      var flt = filtreDe(optFilter);
      var shown = 0;
      CHAMPS.forEach(function (carac) {
        if (filtreChampOn() && optChamp && optChamp !== carac) return;
        var items = allComps().filter(function (it) { return it.carac === carac; });
        if (!optPerso) items = items.filter(function (it) { return !it.custom; });
        if (flt) items = items.filter(function (it) { return it.name.toLowerCase().indexOf(flt) >= 0; });
        if (optOnly) items = items.filter(compInvestie);
        items.sort(function (a, b) { return a.name.localeCompare(b.name, "fr", { sensitivity: "base" }); });
        if (!items.length) return;
        mcBox.appendChild(el("div", "pc-comp-champ", carac));
        // Deux rangées d'entête : les groupes (valeur | coût), puis les
        // colonnes. Libellés courts — sept colonnes dans une demi-largeur ne
        // laissent pas la place aux noms complets, que portent les infobulles.
        // La colonne « rule » est un vrai filet : une colonne de la grille, en
        // place sur CHAQUE rangée, qui court d'un bord à l'autre du module.
        var grp = el("div", "pc-optcomp-row grp");
        grp.appendChild(el("span"));
        var gV = el("span", "g", "Valeur");
        gV.title = "Ce que vaut la compétence quand on la lance";
        grp.appendChild(gV);
        grp.appendChild(el("span", "rule"));
        var gX = el("span", "g", "Coût en xp");
        gX.title = "Ce que la compétence coûte sur l'xp du personnage";
        grp.appendChild(gX);
        mcBox.appendChild(grp);

        var head = el("div", "pc-optcomp-row head");
        [["Compétence", "Nom de la compétence"],
         ["Forcé", "Total forcé — vide = total calculé"],
         ["Modif.", "Deux modificateurs du total, qui s'additionnent", "duo"],
         ["Total", "Total effectif de la compétence"],
         null,
         ["Forcé", "Coût en xp forcé — vide = coût calculé"],
         ["Modif.", "Deux modificateurs du coût en xp, qui s'additionnent", "duo"],
         ["Coût", "Coût effectif en xp"]].forEach(function (h) {
          if (!h) { head.appendChild(el("span", "rule")); return; }
          var s = el("span", h[2] || null, h[0]);
          s.title = h[1];
          head.appendChild(s);
        });
        mcBox.appendChild(head);
        items.forEach(function (it, i) {
          shown++;
          var row = el("div", "pc-optcomp-row pc-mods-host" + (i % 2 === 1 ? " odd" : ""));
          var comp = function () { return state.comps[it.key] || blankComp(); };

          var nameBox = el("span", "pc-comp-name");
          var label = el("span", "pc-comp-label", it.name);
          label.title = it.name + " (" + it.carac + ")";
          nameBox.appendChild(label);
          row.appendChild(nameBox);

          // VALEUR : forcé, puis modificateur, puis le total effectif
          row.appendChild(forceField(state.compsForce, it.key,
            function () { return compValueAuto(it.carac, comp(), it.key); },
            "Total forcé — vide = total calculé (caractéristique + stade + modificateur)."));

          // DEUX champs : ils s'additionnent. Un seul obligeait à faire la
          // somme de tête avant de saisir, puis à la défaire pour retirer l'un
          // des deux apports.
          row.appendChild(modField(state.compsMod, it.key, 999,
            "Premier modificateur du total — vide = aucun."));
          row.appendChild(modField(state.compsMod2, it.key, 999,
            "Second modificateur du total — vide = aucun."));

          var tot = el("span", "pc-comp-total", "");
          row.appendChild(tot);

          // COÛT EN XP : même ordre, derrière le filet de séparation
          row.appendChild(el("span", "rule"));
          row.appendChild(forceField(state.compsXpForce, it.key,
            function () { return compXpAuto(comp(), it.key); },
            "Coût en xp forcé — vide = coût calculé (stades, passifs, art, modificateur)."));

          row.appendChild(modField(state.compsXpMod, it.key, 9999,
            "Premier modificateur du coût en xp — vide = aucun."));
          row.appendChild(modField(state.compsXpMod2, it.key, 9999,
            "Second modificateur du coût en xp — vide = aucun."));

          var cout = el("span", "pc-comp-total", "");
          row.appendChild(cout);

          optHooks.push(function () {
            var c = comp();
            var d = (state.compsMod[it.key] || 0) + (state.compsMod2[it.key] || 0);
            var force = state.compsForce[it.key];
            tot.textContent = sign(compValue(it.carac, c, it.key));
            tot.classList.toggle("zero", !c.stade && !d && force === undefined);
            tot.classList.toggle("adj", d !== 0 || force !== undefined);
            tot.title = force !== undefined
              ? "Total forcé à " + sign(force) + " (calculé : " + sign(compValueAuto(it.carac, c, it.key)) + ")"
              : it.carac + " " + sign(caracTotal(it.carac)) +
                " · stade " + sign(stadeInfo(c.stade).bonus) +
                (d ? " · modificateur " + sign(d) : "");

            var xForce = state.compsXpForce[it.key];
            var xm = (state.compsXpMod[it.key] || 0) + (state.compsXpMod2[it.key] || 0);
            var xp = compXp(c, it.key);
            cout.textContent = xp + " xp";
            cout.classList.toggle("zero", !xp);
            cout.classList.toggle("adj", xForce !== undefined || xm !== 0);
            cout.title = xForce !== undefined
              ? "Coût forcé à " + xForce + " xp (calculé : " + compXpAuto(c, it.key) + " xp)"
              : "Stades, passifs et art" + (xm ? " · modificateur " + sign(xm) + " xp" : "");

            // un liseré marque les lignes réglées : sur cinquante compétences,
            // c'est le seul moyen de retrouver d'un coup d'œil celles qu'on a
            // touchées
            row.classList.toggle("on",
              d !== 0 || force !== undefined || xForce !== undefined || xm !== 0);
          });
          mcBox.appendChild(row);
        });
      });
      if (!shown) {
        mcBox.appendChild(el("div", "pc-empty",
          optOnly ? "Aucune compétence investie ne correspond — décocher « Investies » pour toutes les voir."
                  : "Aucune compétence ne correspond."));
      }
      refresh();   // les lignes viennent de naître : leurs totaux se peuplent ici
    };
    optCompsRebuild();
    return bMC;
  }

  // ---- outils de filtre ----
  // Couper un outil le fait DISPARAÎTRE partout (Compétences, Armes, Langues
  // et le bloc ci-dessus) et cesser d'agir : un filtre invisible qui masque
  // encore des lignes serait un piège. Réglage d'affichage, donc local au
  // navigateur — il ne suit pas le personnage.
  function buildFiltres() {
    var bF = block("Outils de filtre");
    var fRow = el("div", "pc-comp-tools");
    var fLine = el("div", "row");
    // Chaque puce ALLUME OU ÉTEINT un outil ; elle porte donc le nom de
    // l'outil, pas celui de son réglage par défaut. La seconde s'appelait
    // « Tous les champs », qui est le premier choix de la liste déroulante :
    // on croyait afficher tous les champs alors qu'on décidait si la liste
    // existe.
    [["texte", "Champ de recherche",
      "La case où l'on tape pour filtrer les modules Compétences, Armes et Langues."],
     ["champ", "Sélecteur de champ",
      "La liste déroulante Body / Mind / Prestance des modules Compétences."]].forEach(function (o) {
      var chip = el("span", "pc-chip");
      chip.textContent = o[1];
      chip.title = o[2] + " Éteinte : l'outil disparaît, et ne filtre plus rien.";
      chip.classList.toggle("on", lpref(FILTRES[o[0]], "1") !== "0");
      chip.addEventListener("click", function () {
        var on = lpref(FILTRES[o[0]], "1") !== "0";
        lset(FILTRES[o[0]], on ? "0" : "1");
        chip.classList.toggle("on", !on);
        remount();   // les outils vivent dans d'autres onglets : tout se rebâtit
      });
      fLine.appendChild(chip);
    });
    fRow.appendChild(fLine);
    bF.appendChild(fRow);
    return bF;
  }

  // ---- affichage (fiche dans Roll20 seulement) ----
  // window.__jjkNight n'existe que sous roll20-fiche.html (posé par
  // jjk-roll20-boot.js) : sur le site, le bouton d'en-tête gère déjà la nuit.
  // Préférence locale au navigateur (pas dans l'état : réglage d'affichage,
  // pas de personnage) ; "auto" suit le mode jour/nuit de ROLL20 (indice
  // n=1/0 posé par l'extension 2.0.3+ ; repli navigateur sans indice).
  function affichagePresent() { return !!window.__jjkNight; }
  function buildAffichage() {
    var bAff = block("Affichage");
    var mode = el("select", "pc-select");
    [["auto", "Selon Roll20"], ["0", "Jour"], ["1", "Nuit"]].forEach(function (o) {
      var op = el("option", null, o[1]);
      op.value = o[0];
      mode.appendChild(op);
    });
    mode.value = window.__jjkNight.pref();
    mode.addEventListener("change", function () { window.__jjkNight.set(mode.value); });
    bAff.appendChild(fld("Mode par défaut", mode));
    return bAff;
  }

  // ---- actions sur la fiche (exporter / importer / réinitialiser) ----
  function buildActions() {
    var bAct = block("Fiche");
    var act = el("div", "pc-opt-actions");
    act.appendChild((function () {
      var b = el("button", "pc-btn", "Exporter (JSON)");
      b.type = "button";
      b.addEventListener("click", function () {
        var a = document.createElement("a");
        a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        a.download = (state.name || "personnage-jjk") + ".json";
        a.click();
      });
      return b;
    })());
    var file = el("input");
    file.type = "file"; file.accept = "application/json"; file.style.display = "none";
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          state = normalize(JSON.parse(r.result));
          remount();
          flash("Personnage importé.");
        } catch (e) { flash("JSON illisible."); }
        file.value = "";
      };
      r.readAsText(f);
    });
    act.appendChild((function () {
      var b = el("button", "pc-btn", "Importer (JSON)");
      b.type = "button";
      b.addEventListener("click", function () { file.click(); });
      return b;
    })());
    act.appendChild(file);
    act.appendChild((function () {
      var b = el("button", "pc-btn danger", "Réinitialiser la fiche");
      b.type = "button";
      b.addEventListener("click", function () {
        if (!confirm("Réinitialiser la fiche ? Tout le personnage sera effacé.")) return;
        state = blank();
        remount();
        flash("Fiche réinitialisée.");
      });
      return b;
    })());
    bAct.appendChild(act);
    return bAct;
  }

  // ---- modules : ce que la fiche affiche, et où ----
  // Ce bloc-ci parle de TOUS les autres. Il n'écrit que deux choses : la
  // disposition (state.modules) et les interrupteurs (state.modActifs) ; rien
  // du personnage ne passe par lui. Les outils qu'il appelle vivent plus bas
  // (ordreModules, colonnesDe, MODULES_NATIFS) : ce sont ceux du montage, pour
  // que le plan dise exactement ce que la fiche a fait.
  //
  // Libellés COURTS : ils coiffent une colonne du plan, qui est étroite (trois
  // colonnes côte à côte dans un bloc lui-même en colonne). « Colonne du
  // milieu » y passerait à la ligne.
  var LIB_COLONNES = {
    gauche: "Gauche", milieu: "Milieu", droite: "Droite", bas: "Pleine largeur"
  };
  // Le prédicat « pour » d'un module natif dit s'il existe ICI (« affichage »
  // n'existe que dans Roll20). Un module qui n'existe pas n'a pas de ligne : il
  // n'y a rien à en régler. Son id, lui, reste dans l'ordre enregistré — sans
  // quoi ouvrir la fiche sur le site effacerait le rangement fait dans Roll20.
  function moduleAffichable(m) {
    if (typeof m.pour !== "function") return true;
    try { return !!m.pour(); } catch (e) { return false; }
  }
  // La colonne d'un module existe-t-elle dans le squelette de son onglet ? Un
  // mod qui recopie « milieu » (une colonne de l'onglet Fiche) dans un onglet
  // qui n'en a pas se retrouve sans hôte : il ne se monte nulle part, tout
  // comme un module dont l'ONGLET est inconnu. La différence est que sa ligne,
  // elle, figure bien sous son onglet, l'air d'un module ordinaire. Il faut
  // donc la reconnaître pour le dire.
  function colonneRepli(p) {
    var cols = colonnesDe(p.onglet);
    if (!cols) return null;                          // onglet inconnu : autre cas
    if (aClef(cols, p.colonne)) return p.colonne;
    return Object.keys(cols)[0] || null;             // le repli d'appliqueDisposition
  }
  function colonneInconnue(p) {
    var r = colonneRepli(p);
    return !!r && r !== p.colonne;
  }
  // La place qu'un module DEMANDE : la consigne enregistrée si elle existe,
  // sinon celle qu'il a déclarée au montage.
  //
  // On ne lit surtout pas modules[i].onglet : appliqueDisposition l'a déjà
  // remanié au montage, donc il porte la place FORCÉE. Tant que le plan
  // rechargeait la fiche à chaque geste, les deux se confondaient ; maintenant
  // que le rangement attend le prochain chargement, il faut la consigne elle-
  // même — sans quoi « Disposition d'origine » ne montrerait rien avant le
  // rechargement, et un module déplacé deux fois de suite repartirait de sa
  // place forcée au lieu de sa place d'origine.
  function placeDemandee(m) {
    var p = (disposition().place || {})[m.id];
    if (p && typeof p === "object" && typeof p.onglet === "string"
        && typeof p.colonne === "string")
      return { onglet: p.onglet, colonne: p.colonne };
    var o = placeOrigine[m.id];
    if (o) return { onglet: o.onglet, colonne: o.colonne };
    return { onglet: m.onglet, colonne: m.colonne };
  }
  function idsConnus() {
    return ordreModules().map(function (m) { return m.id; });
  }
  function disposition() {
    if (!state.modules || typeof state.modules !== "object" || Array.isArray(state.modules))
      state.modules = {};
    return state.modules;
  }
  // L'ordre COMPLET des id connus, et pas seulement les deux qui bougent : relu
  // à froid, state.modules.ordre doit dire la disposition entière.
  //
  // Mais ce montage-ci ne connaît que les modules qui existent CHEZ LUI, et
  // l'ordre, lui, voyage avec le personnage. Écrire la seule liste du jour
  // effacerait le rang des autres : le mod « journal » de l'auteur, rangé en
  // tête de colonne, est en attente d'autorisation chez le joueur qui ouvre la
  // fiche ; une flèche cliquée là-bas suffisait à le renvoyer en fin de colonne,
  // sans un mot, jusque dans les Attributes. Les id inconnus d'ici gardent donc
  // leur rang, et les connus se rangent dans les places qui restent.
  //
  // Un module retiré POUR DE BON garde son rang lui aussi : rien ne le distingue
  // d'un mod qui attend son autorisation. Ça ne coûte qu'une ligne morte dans
  // l'ordre enregistré, qu'ordreModules() écarte de toute façon, quand oublier
  // coûtait la disposition d'un autre joueur. « Disposition d'origine » vide
  // tout, pour qui voudrait faire le ménage.
  function fusionneOrdre(ids) {
    var ancien = disposition().ordre;
    if (!Array.isArray(ancien) || !ancien.length) return ids.slice();
    var connu = {}, vu = {}, out = [], k = 0, i, id;
    for (i = 0; i < ids.length; i++) connu[ids[i]] = 1;
    for (i = 0; i < ancien.length; i++) {
      id = ancien[i];
      // un doublon consommerait deux places : l'ordre enregistré vient d'un
      // fichier importé ou d'une autre version, il n'est pas garanti propre
      if (typeof id !== "string" || !id || aClef(vu, id)) continue;
      vu[id] = 1;
      if (!aClef(connu, id)) { out.push(id); continue; }   // inconnu ici : il tient sa place
      if (k < ids.length) out.push(ids[k++]);
    }
    while (k < ids.length) out.push(ids[k++]);
    return out;
  }
  // ON N'ÉPINGLE QUE LA COLONNE TOUCHÉE, et c'est tout le sujet.
  //
  // L'ancienne version écrivait l'ordre COMPLET de tous les modules, tous
  // onglets confondus. Un seul clic sur une flèche, n'importe où, et la
  // disposition du personnage était gelée pour toujours : la fiche pouvait
  // ensuite changer l'agencement d'un onglet auquel le joueur n'avait jamais
  // touché, il ne le voyait jamais. C'est arrivé pour de bon — l'onglet Options
  // a été réagencé et les personnages qui avaient cliqué une fois gardaient
  // l'ancien, sans aucun moyen de le savoir.
  //
  // Désormais l'ordre enregistré ne retient que les colonnes RÉELLEMENT
  // remaniées. Les autres n'y figurent pas, donc elles suivent la table de la
  // fiche : un module ajouté ou déplacé par une mise à jour arrive chez tout le
  // monde, sauf là où le joueur a fait son propre rangement.
  //
  // ordonne() accepte un ordre PARTIEL, c'est ce qui rend la chose possible :
  // les id nommés passent devant dans l'ordre donné, les autres suivent à leur
  // rang de déclaration. Comme les colonnes sont séparées au montage, épingler
  // une colonne ne dérange pas les voisines.
  function memeColonne(id, onglet, colonne) {
    var i = rangModule(id);
    if (i < 0) return false;
    var p = placeDemandee(modules[i]);
    return p.onglet === onglet && p.colonne === colonne;
  }
  // ids : l'ordre voulu, complet. onglet/colonne : la colonne remaniée.
  function ecritOrdre(ids, onglet, colonne) {
    var d = disposition();
    var ancien = Array.isArray(d.ordre) ? d.ordre : [];
    var neuf = [], vus = {}, i;
    // ce qui était déjà épinglé AILLEURS reste épinglé, dans son ordre
    for (i = 0; i < ancien.length; i++) {
      if (onglet && memeColonne(ancien[i], onglet, colonne)) continue;
      if (!vus[ancien[i]]) { vus[ancien[i]] = 1; neuf.push(ancien[i]); }
    }
    // puis la colonne qu'on vient de remanier, dans son ordre nouveau
    for (i = 0; i < ids.length; i++) {
      if (onglet && !memeColonne(ids[i], onglet, colonne)) continue;
      if (!vus[ids[i]]) { vus[ids[i]] = 1; neuf.push(ids[i]); }
    }
    d.ordre = onglet ? neuf : fusionneOrdre(ids);
    // L'ordre vivant suit tout de suite, mais LA FICHE NE SE REMONTE PAS.
    //
    // Elle se remontait à chaque geste : ranger trois modules reconstruisait
    // trois fois la fiche entière, l'onglet sautait, et le moindre clic coûtait
    // une seconde. Le plan se redessine seul (redessinePlan), le rangement est
    // enregistré, et « Recharger la fiche » l'applique quand on a fini.
    ordonne(d.ordre);
    save();
  }
  function natifDe(id) {
    for (var i = 0; i < MODULES_NATIFS.length; i++)
      if (MODULES_NATIFS[i].id === id) return MODULES_NATIFS[i];
    return null;
  }
  // ---- le plan de la fiche : on range en FAISANT GLISSER ----
  //
  // La version d'avant réglait la disposition avec deux flèches et une liste
  // déroulante par module : pour descendre un bloc de trois rangs il fallait
  // trois clics, et pour le changer de colonne il fallait deviner quelle
  // colonne portait quel nom. On ne voyait jamais la fiche, seulement une liste
  // de lignes.
  //
  // Ici, chaque onglet est dessiné avec SES colonnes, côte à côte, et chaque
  // module est une carte qu'on prend et qu'on lâche où on veut : dans la même
  // colonne pour changer son rang, dans une autre pour l'y envoyer. Le plan
  // ressemble à la fiche, donc on range en regardant ce qu'on range.
  //
  // Glisser-déposer natif du navigateur (draggable, dragover, drop) : aucune
  // bibliothèque, et ça marche tel quel dans l'iframe Roll20.

  // Déplacer un module : sa colonne d'arrivée, et devant qui il se pose.
  // « avantId » nul = à la fin de la colonne.
  function deplaceModule(id, onglet, colonne, avantId) {
    var d = disposition();
    var nat = placeOrigine[id] || natifDe(id);
    if (!d.place || typeof d.place !== "object" || Array.isArray(d.place)) d.place = {};
    // Revenir à sa place d'origine EFFACE l'entrée plutôt que d'y ranger cette
    // place : la disposition reste éparse, et un module que la fiche déménagera
    // un jour suivra son déménagement au lieu d'être épinglé ici.
    if (nat && nat.onglet === onglet && nat.colonne === colonne) delete d.place[id];
    else d.place[id] = { onglet: onglet, colonne: colonne };
    // La consigne écrite suffit : memeColonne() la lit (placeDemandee), donc
    // l'ordre qu'on s'apprête à calculer voit déjà le module dans sa nouvelle
    // colonne. La table des modules, elle, n'est pas touchée : elle décrit la
    // fiche MONTÉE, qui ne bougera qu'au prochain chargement.
    var ids = idsConnus();
    var j = ids.indexOf(id);
    if (j >= 0) ids.splice(j, 1);
    var k = avantId ? ids.indexOf(avantId) : -1;
    if (k >= 0) ids.splice(k, 0, id);
    else {
      // à la fin de SA colonne, et non à la fin de tout : sinon un module lâché
      // au bas d'une colonne se rangerait derrière ceux des autres onglets
      var dernier = -1, q;
      for (q = 0; q < ids.length; q++) if (memeColonne(ids[q], onglet, colonne)) dernier = q;
      if (dernier >= 0) ids.splice(dernier + 1, 0, id);
      else ids.push(id);
    }
    ecritOrdre(ids, onglet, colonne);
    redessinePlan();
  }

  // Redessiner LE PLAN SEUL, sans reconstruire la fiche. C'est ce qui permet de
  // ranger dix modules d'affilée sans la moindre secousse : seul ce bloc-ci
  // change, et ce qu'il montre est le rangement enregistré, pas la fiche montée.
  // Enveloppé : un plan qui échoue ne doit pas emporter la fiche avec lui.
  function redessinePlan() {
    try {
      var vieux = document.querySelector('[data-module="' + MODULE_REGLAGES + '"]');
      if (!vieux || !vieux.parentNode) return;
      var neuf = buildModules();
      if (!neuf) return;
      neuf.dataset.module = MODULE_REGLAGES;
      vieux.parentNode.replaceChild(neuf, vieux);
      elModules[MODULE_REGLAGES] = neuf;
    } catch (e) {}
  }

  function buildModules() {
    var b = block("Modules");
    var plan = el("div", "pc-modplan");
    var visibles = ordreModules().filter(moduleAffichable);
    var vus = {};
    var pris = null;        // l'id qu'on tient
    var listes = [];        // toutes les zones de dépôt, pour les éteindre

    function eteintTout() {
      listes.forEach(function (z) { z.classList.remove("survol"); });
      var c = plan.querySelectorAll(".pc-modplan-carte.avant, .pc-modplan-carte.apres");
      for (var i = 0; i < c.length; i++) c[i].classList.remove("avant", "apres");
    }

    // Devant quelle carte se pose ce qu'on lâche à cette hauteur ? La moitié
    // haute d'une carte veut dire « avant elle », la moitié basse « après ».
    function cibleDe(liste, y) {
      var cartes = liste.querySelectorAll(".pc-modplan-carte");
      for (var i = 0; i < cartes.length; i++) {
        var r = cartes[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) return cartes[i];
      }
      return null;
    }

    function carte(m, souci) {
      var c = el("div", "pc-modplan-carte");
      c.dataset.id = m.id;
      c.draggable = true;
      var t = el("span", "t", m.titre || m.id);
      t.title = (m.titre || m.id) + (souci ? " — " + souci : "");
      c.appendChild(t);
      // L'oeil : affiché ou masqué. Le bloc des réglages lui-même n'en a pas,
      // c'est lui qui rallume les autres.
      if (m.id !== MODULE_REGLAGES) {
        var oeil = el("span", "pc-modplan-oeil");
        oeil.textContent = actif(m.id) ? "●" : "○";
        oeil.title = actif(m.id)
          ? "Affiché sur la fiche. Cliquer pour le masquer : rien n'est effacé."
          : "Masqué. Cliquer pour le réafficher.";
        oeil.addEventListener("click", function (e) {
          e.stopPropagation();
          activeModule(m.id, !actif(m.id));
          redessinePlan();       // comme le rangement : la fiche attend son chargement
        });
        c.appendChild(oeil);
      }
      var e = etatModule(m.id);
      if (e.panne) { c.dataset.etat = "panne"; t.title += " — en panne : " + e.panne; }
      else if (e.musele) { c.dataset.etat = "panne"; t.title += " — muselé : " + e.erreur; }
      if (souci) c.dataset.etat = "perdu";
      if (!actif(m.id)) c.classList.add("off");

      c.addEventListener("dragstart", function (ev) {
        pris = m.id;
        c.classList.add("pris");
        try {
          ev.dataTransfer.effectAllowed = "move";
          // Firefox refuse de commencer un glissement sans donnée posée
          ev.dataTransfer.setData("text/plain", m.id);
        } catch (err) {}
      });
      c.addEventListener("dragend", function () {
        pris = null;
        c.classList.remove("pris");
        eteintTout();
      });
      return c;
    }

    function zone(onglet, colonne, libelle) {
      var z = el("div", "pc-modplan-col");
      z.appendChild(el("div", "pc-modplan-col-nom", libelle));
      var liste = el("div", "pc-modplan-liste");
      z.appendChild(liste);
      listes.push(liste);
      liste.addEventListener("dragover", function (ev) {
        if (!pris) return;
        ev.preventDefault();           // sans ça, le navigateur refuse le dépôt
        try { ev.dataTransfer.dropEffect = "move"; } catch (err) {}
        eteintTout();
        liste.classList.add("survol");
        var avant = cibleDe(liste, ev.clientY);
        if (avant) avant.classList.add("avant");
      });
      liste.addEventListener("dragleave", function (ev) {
        if (ev.target === liste) liste.classList.remove("survol");
      });
      liste.addEventListener("drop", function (ev) {
        ev.preventDefault();
        var id = pris;
        if (!id) { try { id = ev.dataTransfer.getData("text/plain"); } catch (err) { id = null; } }
        eteintTout();
        if (!id) return;
        var avant = cibleDe(liste, ev.clientY);
        // se lâcher sur soi-même ne range rien
        if (avant && avant.dataset.id === id) return;
        deplaceModule(id, onglet, colonne, avant ? avant.dataset.id : null);
      });
      return { bloc: z, liste: liste };
    }

    // Remplit une rangée de colonnes du plan, et retient qui a trouvé sa place.
    // « premiere » reçoit en plus les cartes dont la colonne n'existe pas dans
    // cet onglet, comme la fiche les y replie au montage.
    function remplit(onglet, dedans, noms, premiere) {
      var rangee = el("div", "pc-modplan-cols");
      rangee.style.gridTemplateColumns = "repeat(" + noms.length + ", minmax(0, 1fr))";
      noms.forEach(function (c) {
        var z = zone(onglet, c, LIB_COLONNES[c] || capFirst(c));
        dedans.forEach(function (o) {
          // une colonne que l'onglet ne connaît pas : la carte se pose dans la
          // PREMIÈRE colonne, marquée, plutôt que de n'apparaître nulle part —
          // sinon le module serait invisible ET impossible à ranger
          var perdue = colonneInconnue(o.place);
          var ici = perdue ? (c === premiere) : (o.place.colonne === c);
          if (!ici) return;
          vus[o.m.id] = 1;
          z.liste.appendChild(carte(o.m, perdue
            ? "colonne « " + o.place.colonne + " » inconnue dans cet onglet : ce module ne s'affiche nulle part"
            : ""));
        });
        rangee.appendChild(z.bloc);
      });
      return rangee;
    }

    TABS.forEach(function (t) {
      var dedans = [];
      visibles.forEach(function (m) {
        var p = placeDemandee(m);
        if (p.onglet === t.id) dedans.push({ m: m, place: p });
      });
      if (!dedans.length) return;
      plan.appendChild(el("div", "pc-modgroupe", t.label));
      var d = squeletteColonnes(t.id) || { noms: [], larges: {} };
      var noms = d.noms.length ? d.noms : ["gauche"];
      // Une colonne PLEINE LARGEUR (l'inventaire de l'Équipement) n'est pas une
      // colonne de la grille : sur la fiche elle court sous les autres. Le plan
      // la met donc sous elles, dans sa propre rangée, au lieu de la serrer
      // entre deux voisines à qui elle prendrait un tiers de la place.
      var etroites = noms.filter(function (c) { return !d.larges[c]; });
      var larges = noms.filter(function (c) { return !!d.larges[c]; });
      // un onglet qui n'a QUE du pleine largeur (Art) garde sa rangée à lui
      if (!etroites.length) { etroites = larges; larges = []; }
      plan.appendChild(remplit(t.id, dedans, etroites, etroites[0]));
      larges.forEach(function (c) {
        plan.appendChild(remplit(t.id, dedans, [c], null));
      });
    });

    // Un module dont l'onglet n'existe pas (un mod mal réglé) ne se monte nulle
    // part. Sans cette rangée il serait invisible ET impossible à ranger : le
    // joueur n'aurait plus qu'à effacer le mod pour s'en défaire. Le déposer
    // dans n'importe quelle colonne d'un onglet réel le remet en jeu.
    var perdus = visibles.filter(function (m) { return !vus[m.id]; });
    if (perdus.length) {
      plan.appendChild(el("div", "pc-modgroupe", "Onglet inconnu"));
      var rp = el("div", "pc-modplan-cols");
      rp.style.gridTemplateColumns = "minmax(0, 1fr)";
      var zp = zone(TABS[0].id, "gauche", "À ranger");
      perdus.forEach(function (m) {
        zp.liste.appendChild(carte(m, "onglet « " + placeDemandee(m).onglet
          + " » inconnu : ce module ne s'affiche nulle part"));
      });
      rp.appendChild(zp.bloc);
      plan.appendChild(rp);
    }

    if (!plan.children.length) plan.appendChild(el("div", "pc-empty", "Aucun module."));
    b.appendChild(plan);
    var tools = el("div", "pc-comp-tools");
    // Ranger n'agit plus tout de suite, et il faut le DIRE : sans cette ligne,
    // le plan montrerait un rangement que la fiche derrière ne suit pas, et on
    // le croirait cassé.
    tools.appendChild(el("div", "pc-modplan-avis",
      "La disposition ne change qu'au chargement de la fiche."));
    var duo = el("div", "pc-modplan-duo");
    duo.appendChild(miniBtn("Disposition d'origine",
      "Rendre à chaque module son onglet, sa colonne et son rang d'origine. Les modules masqués le restent.",
      function () {
        state.modules = {};
        ordonne([]);
        save();
        redessinePlan();
        flash("Disposition d'origine rétablie. Recharger la fiche pour la voir.");
      }));
    duo.appendChild(miniBtn("Recharger la fiche",
      "Reconstruire la fiche avec le rangement du plan.",
      function () {
        remount();
        flash("Fiche rechargée.");
      }));
    tools.appendChild(duo);
    b.appendChild(tools);
    return b;
  }

  // ---- mods : le code ajouté au personnage ----
  // Ce bloc dit ce que chaque mod fait (ou pourquoi il ne fait rien), donne de
  // quoi trancher, et permet d'en écrire un. Le moteur (jjk-mods.js) juge,
  // exécute et range les accords ; sans lui, ce bloc se contente de le dire.
  //
  // Aucun bac à sable : un mod autorisé tourne dans la page de la fiche avec
  // exactement ses droits. Les textes d'ici ne doivent jamais laisser croire
  // autre chose.
  var ETATS_MOD = {
    ok: "tourne",
    panne: "en panne",
    attente: "en attente d'autorisation",
    coupe: "coupé",
    recent: "trop récent",
    refuse: "refusé sur ce navigateur"
  };
  function moteurMods() {
    return (window.JjkMods && typeof window.JjkMods.execute === "function") ? window.JjkMods : null;
  }
  function bilanDeMod(id) {
    for (var i = 0; i < bilanMods.length; i++) if (bilanMods[i].id === id) return bilanMods[i];
    return null;
  }
  // Le moteur fait foi pour l'empreinte comme pour l'avis : la recalculer ici
  // ferait deux règles pour une seule décision, et un mod se remettrait à
  // demander l'autorisation dès que les deux dérivent d'un caractère.
  function empreinteMod(id, src) {
    var mm = moteurMods();
    try { return mm ? mm.empreinte(id, src) : ""; } catch (e) { return ""; }
  }
  function avisMod(emp) {
    var mm = moteurMods();
    try { return mm ? mm.avis(emp) : ""; } catch (e) { return ""; }
  }
  // Même règle d'id que le moteur (idPropre) et que normalize() : les trois
  // chemins doivent donner le MÊME id, sans quoi l'empreinte changerait selon
  // le chemin pris et le joueur réautoriserait un mod qu'il connaît déjà.
  function idMod(v) {
    return String(v == null ? "" : v).toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  }
  // Un « pour » illisible est SILENCIEUSEMENT oublié par le moteur : autant le
  // dire tout de suite, sinon le joueur croit avoir posé un garde-fou qui
  // n'existe pas. Même forme que versionLue de jjk-mods.js.
  function versionLisible(v) {
    return /^\s*v?\d+(\.\d+)?(\.\d+)?\s*([-+][^\s]*)?\s*$/.test(v);
  }
  // Le formulaire d'un mod, celui de l'ajout comme celui de la modification.
  // « appliquer » reçoit des valeurs déjà validées ; rendre false laisse le
  // dialogue ouvert, avec le message qui dit pourquoi.
  function formulaireMod(base, titre, libelleValider, appliquer) {
    base = base || {};
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "Ce code tourne dans la page de la fiche, avec les mêmes droits qu'elle : il n'y a pas de bac à sable. " +
      "Il part avec le personnage, et les autres joueurs auront à l'autoriser chez eux avant qu'il ne tourne."));
    var nom = el("input");
    nom.type = "text";
    nom.value = base.nom || "";
    var id = el("input");
    id.type = "text";
    id.value = base.id || "";
    // l'id se déduit du nom TANT QUE personne n'y a touché : un id corrigé à la
    // main ne doit pas se faire réécrire à la frappe suivante
    var idTenu = !!base.id;
    nom.addEventListener("input", function () { if (!idTenu) id.value = idMod(nom.value); });
    id.addEventListener("input", function () { idTenu = true; });
    var src = el("textarea", "pc-code");
    src.value = base.src || "";
    src.spellcheck = false;
    var pour = el("input");
    pour.type = "text";
    pour.placeholder = RELEASE;
    pour.value = base.pour || "";
    corps.appendChild(fld("Nom", nom));
    corps.appendChild(fld("Identifiant", id));
    corps.appendChild(fld("Code JavaScript (Jjk, ctx)", src));
    corps.appendChild(fld("Pour la fiche, au moins (facultatif)", pour));
    dialogue(titre, corps, function () {
      var vid = idMod(id.value) || idMod(nom.value);
      var vp = String(pour.value == null ? "" : pour.value).trim();
      var pris = false;
      if (!vid) { flash("Il faut un identifiant : des lettres, des chiffres ou des tirets."); return false; }
      (state.mods || []).forEach(function (x) { if (x !== base && x.id === vid) pris = true; });
      if (pris) { flash("L'identifiant « " + vid + " » est déjà pris par un autre mod."); return false; }
      if (vp && !versionLisible(vp)) {
        flash("« Pour la fiche » attend un numéro de version, comme " + RELEASE + ".");
        return false;
      }
      appliquer(vid, String(nom.value == null ? "" : nom.value).trim() || vid,
                String(src.value == null ? "" : src.value), vp);
    }, libelleValider);
  }
  function ajouteMod() {
    formulaireMod(null, "Ajouter un mod", "Ajouter", function (id, nom, src, pour) {
      var neuf = { id: id, nom: nom, actif: true, src: src };
      if (pour) neuf.pour = pour;
      if (!Array.isArray(state.mods)) state.mods = [];
      state.mods.push(neuf);
      // Le joueur vient de le taper : il n'a pas à s'autoriser lui-même. Le oui
      // porte sur CE code et sur ce navigateur seulement ; retoucher le mod
      // change son empreinte, donc le fait redemander, et il ne vaut rien chez
      // les autres joueurs.
      decideMod(empreinteMod(id, src), "oui");
      save();
      remount();
      flash("Mod « " + nom + " » ajouté.");
    });
  }
  function modifieMod(m) {
    var avant = empreinteMod(m.id, m.src);
    formulaireMod(m, "Modifier « " + (m.nom || m.id) + " »", "Enregistrer",
      function (id, nom, src, pour) {
        m.id = id;
        m.nom = nom;
        m.src = src;
        if (pour) m.pour = pour; else delete m.pour;
        var apres = empreinteMod(id, src);
        // Le oui ne se pose QUE si l'empreinte a changé : le joueur vient alors
        // d'écrire ce code, et sans lui son propre mod lui redemanderait
        // l'autorisation à l'instant. Ouvrir puis refermer l'éditeur sans rien
        // toucher, en revanche, ne décide de rien : cela écrasait un refus
        // sans un mot, alors que la note du formulaire promet l'inverse.
        if (apres && apres !== avant) decideMod(apres, "oui");
        save();
        remount();
        flash("Mod « " + nom + " » enregistré.");
      });
  }
  // LIRE le code d'un mod ne doit pas supposer d'ouvrir l'éditeur : « Modifier »
  // sert à écrire, et valider son formulaire vaut accord. Ici rien ne bouge tant
  // que le joueur ne tranche pas, et les deux boutons sont là pour qu'il puisse
  // trancher en connaissance de cause.
  function voirMod(m) {
    var emp = empreinteMod(m.id, m.src);
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "Un mod autorisé tourne dans la page de la fiche, avec les mêmes droits qu'elle : " +
      "il n'y a pas de bac à sable. Lire ce code ne décide de rien."));
    var ligne = el("div", "pc-modrow");
    ligne.appendChild(el("span", "nom", m.nom || m.id));
    ligne.appendChild(el("span", "id", m.id));
    corps.appendChild(ligne);
    var ta = el("textarea", "pc-code");
    ta.readOnly = true;
    ta.spellcheck = false;
    ta.value = String(m.src == null ? "" : m.src);
    corps.appendChild(ta);
    var boutons = el("div", "row");
    boutons.appendChild(miniBtn("Autoriser", "Ce code tournera à chaque ouverture, sur ce navigateur", function () {
      decideMod(emp, "oui");
      remount();
    }));
    boutons.appendChild(miniBtn("Refuser", "Ce code ne tournera pas ; il reste sur le personnage", function () {
      decideMod(emp, "non");
      remount();
    }, "danger"));
    corps.appendChild(boutons);
    // le dialogue ne valide rien : ses deux boutons ont déjà tout dit
    dialogue("Code de « " + (m.nom || m.id) + " »", corps, function () {}, "Fermer");
  }
  function supprimeMod(m) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "Le mod et son code quittent le personnage. Ce qu'il a déjà écrit dans la fiche reste ; " +
      "l'accord donné à ce code sur ce navigateur reste lui aussi, et vaudrait encore si le mod revenait."));
    dialogue("Supprimer « " + (m.nom || m.id) + " » ?", corps, function () {
      var i = state.mods.indexOf(m);
      if (i >= 0) state.mods.splice(i, 1);
      save();
      remount();
      flash("Mod supprimé.");
    }, "Supprimer");
  }
  // UNE LIGNE, ET LE MOINS DE BOUTONS POSSIBLE.
  //
  // Il y en avait cinq, plus trois textes, et la ligne se repliait n'importe
  // comment. Deux d'entre eux, « Autoriser » et « Refuser », sont les deux
  // faces d'une même question : ils deviennent UNE puce, qui se lit comme
  // celle d'à côté. Les deux gestes de construction, « Modifier » et
  // « Supprimer », passent derrière le rouage du bloc, comme partout ailleurs
  // sur la fiche.
  //
  // Reste en permanence ce qu'on regarde tous les jours : le nom, l'état, de
  // quoi LIRE le code, et les deux interrupteurs.
  //
  // Les deux puces ne disent PAS la même chose, et c'est pour cela qu'elles
  // sont deux :
  //   « Actif »    appartient au PERSONNAGE et voyage avec lui ;
  //   « Autorisé » appartient à CE NAVIGATEUR et n'en sort jamais.
  // L'infobulle de chacune le dit en toutes lettres.
  function ligneMod(m) {
    var ligne = el("div", "pc-modrow pc-modrow-mod");
    ligne.dataset.id = m.id;
    var bil = bilanDeMod(m.id);
    var etat = bil ? bil.etat : "";
    var emp = empreinteMod(m.id, m.src);
    var avis = avisMod(emp);
    var on = m.actif !== false;
    var barre = el("div", "l");
    ligne.appendChild(barre);

    // l'identifiant ne s'affiche plus : il ne parle qu'au code, il est dans le
    // dialogue de lecture et dans celui de modification, et il volait la place
    // qui manquait pour tenir sur une ligne
    // L'ÉTAT NE S'ÉCRIT PLUS SUR LA LIGNE : les deux puces le disent déjà.
    // « tourne » quand les deux sont allumées, « coupé » quand Actif est
    // éteinte, « refusé » quand Autorisé l'est. Le mot en gris répétait ce que
    // l'oeil voyait, et prenait la place du nom. Il reste dans l'infobulle,
    // avec l'identifiant, pour les deux cas qu'une puce ne distingue pas : en
    // attente et refusé s'éteignent pareil.
    var nom = el("span", "nom", m.nom || m.id);
    nom.title = (m.nom || m.id) + " · identifiant " + m.id + " · " +
                (aClef(ETATS_MOD, etat) ? ETATS_MOD[etat] : "état inconnu");
    barre.appendChild(nom);
    // La panne, elle, garde son marquage : le liseré rouge de la ligne et le
    // message du moteur en dessous. C'est la seule chose qu'une puce ne dit pas.
    if (etat === "panne") ligne.setAttribute("data-etat", "panne");

    // Lire d'abord : c'est le geste qu'on attend de celui qui reçoit le code
    // d'un autre, et il ne décide de rien.
    barre.appendChild(miniBtn("Voir le code", "Lire le code de ce mod sans y toucher", function () {
      voirMod(m);
    }, "voir"));

    var puceA = el("span", "pc-chip", "Actif");
    puceA.title = "Sur LE PERSONNAGE, et voyage avec lui : couper ce mod le met " +
                  "en veille pour tout le monde, sans rien effacer.";
    puceA.classList.toggle("on", on);
    puceA.addEventListener("click", function () {
      m.actif = !on;
      save();
      remount();
    });
    barre.appendChild(puceA);

    var puceO = el("span", "pc-chip", "Autorisé");
    puceO.title = avis === "oui"
      ? "Sur CE NAVIGATEUR seulement : retirer l'accord, le code cessera de tourner ici."
      : "Sur CE NAVIGATEUR seulement : donner l'accord, le code tournera à chaque ouverture.";
    puceO.classList.toggle("on", avis === "oui");
    puceO.addEventListener("click", function () {
      decideMod(emp, avis === "oui" ? "non" : "oui");
      remount();
    });
    barre.appendChild(puceO);

    // Modifier et supprimer sont des gestes de CONSTRUCTION : ils ne s'offrent
    // que le rouage du bloc ouvert, comme les compétences et l'inventaire.
    // pc-edit-only, et non un test à la construction : le rouage bascule une
    // classe sur le bloc, il ne rebâtit pas ses lignes.
    barre.appendChild(miniBtn("Modifier", "Changer le nom, l'identifiant ou le code", function () {
      modifieMod(m);
    }, "pc-edit-only"));
    barre.appendChild(miniBtn("Supprimer", "Retirer ce mod du personnage", function () {
      supprimeMod(m);
    }, "danger pc-edit-only"));

    // Le message du moteur (la panne à réparer, la version qui manque) : c'est
    // tout ce que le joueur a pour comprendre, il prend sa propre ligne.
    if (bil && bil.message) ligne.appendChild(el("div", "pc-block-note", bil.message));
    return ligne;
  }
  function buildMods() {
    // le rouage ouvre les gestes de construction (modifier, supprimer)
    var b = block("Mods", null, "mods");
    // AUCUNE explication en tête de bloc. La fiche montre les données du
    // personnage, pas un mode d'emploi : ce qu'il faut savoir avant d'autoriser
    // du code est dit là où la décision se prend (le dialogue d'examen et le
    // formulaire), et le reste est dans la page Mods du livre.
    // Le moteur est facultatif de naissance (un repli gelé peut ne charger que
    // le bundle) : sans lui, on le dit et on ne propose rien qui n'aurait aucun
    // effet — un mod ajouté ici n'aurait ni empreinte ni accord possible.
    if (!moteurMods()) {
      b.appendChild(el("div", "pc-empty",
        "Le moteur de mods n'est pas chargé : les mods du personnage sont conservés tels quels, aucun ne tourne."));
      return b;
    }
    var mods = Array.isArray(state.mods) ? state.mods : [];
    var box = el("div");
    mods.forEach(function (m) { box.appendChild(ligneMod(m)); });
    if (!mods.length) box.appendChild(el("div", "pc-empty", "Aucun mod sur cette fiche personnage."));
    b.appendChild(box);
    var tools = el("div", "pc-comp-tools");
    var line = el("div", "row");
    line.appendChild(miniBtn("Ajouter un mod", "Écrire un mod pour ce personnage", ajouteMod));
    tools.appendChild(line);
    b.appendChild(tools);
    return b;
  }

  // ---------- les modules natifs ----------
  // L'ordre de cette table EST l'ordre par défaut de la fiche : chaque module
  // tombe dans sa colonne, à la suite de ceux déjà déclarés pour elle.
  // buildTop, buildHead et buildEnvoi n'y sont pas : la barre d'outils,
  // l'en-tête et la barre d'envoi ne sont pas des modules, ils encadrent les
  // onglets et ne se déplacent pas.
  //
  // Cette table-ci ne se remanie JAMAIS : chaque mount() en repart (modules =
  // MODULES_NATIFS.slice()). Sans cette copie intacte, un mod qui remplace un
  // module natif le remplacerait pour toujours — même désinstallé, la fiche
  // n'aurait plus l'original à remettre. Un module déplacé se recopie donc
  // avant d'être touché (appliqueDisposition).
  var MODULES_NATIFS = [
    // ---- onglet Fiche ----
    { id: "narration",  titre: "Narration",         onglet: "fiche", colonne: "gauche", build: buildNarration },
    { id: "caracs",     titre: "Caractéristiques",  onglet: "fiche", colonne: "gauche", build: buildCaracs },
    { id: "langues",    titre: "Langues",           onglet: "fiche", colonne: "gauche", build: buildLangues },
    { id: "initiative", titre: "Initiative",        onglet: "fiche", colonne: "milieu", build: buildInitiative },
    // Vitesse et Régén partagent une grille à deux cases qui ne se découpe
    // pas : elles ne forment qu'UN module, même si chacune garde son rouage
    { id: "tuiles",     titre: "Vitesse et Régén",  onglet: "fiche", colonne: "milieu", build: buildVitesse },
    { id: "pv",         titre: "PV",                onglet: "fiche", colonne: "milieu", build: buildPv },
    { id: "armescomp",  titre: "Armes",             onglet: "fiche", colonne: "milieu", build: buildArmesComps },
    { id: "comps",      titre: "Compétences",       onglet: "fiche", colonne: "droite", build: buildComps },
    // ---- onglet Art ----
    { id: "arts",       titre: "Arts et passifs",   onglet: "art", colonne: "seule", build: buildArt },
    // ---- onglet Équipement ----
    { id: "armes",      titre: "Armes",             onglet: "equipement", colonne: "gauche", build: buildArmes },
    { id: "armures",    titre: "Armures",           onglet: "equipement", colonne: "droite", build: buildArmures },
    { id: "inv",        titre: "Inventaire",        onglet: "equipement", colonne: "bas",    build: buildInv },
    // ---- onglet Bio ----
    { id: "perso",      titre: "Personnalité",      onglet: "bio", colonne: "gauche", build: buildPerso },
    { id: "avantages",  titre: "Avantages",         onglet: "bio", colonne: "gauche", build: buildAvantages },
    { id: "bg",         titre: "Background",        onglet: "bio", colonne: "droite", build: buildBackground },
    { id: "notes",      titre: "Notes",             onglet: "bio", colonne: "droite", build: buildNotes },
    // ---- onglet Options ----
    // À GAUCHE, dans l'ordre de la Fiche : ce qui touche aux caractéristiques
    // d'abord (leurs modificateurs, puis où est parti l'xp), la création
    // ensuite, le jeu après, et les réglages d'affichage en bas.
    // L'onglet Options se lit en DEUX COLONNES QUI SE RÉPONDENT, du plus
    // employé au plus long :
    //   en tête, ce qu'on ouvre le plus souvent : les Jets à gauche, la Fiche
    //     (exporter, importer, réinitialiser) à droite ;
    //   au deuxième rang, les deux faces de l'xp, côte à côte : ce qu'on ajoute
    //     aux caractéristiques à gauche, où l'xp est parti à droite ;
    //   au milieu, les réglages courts, répartis pour que les deux colonnes
    //     arrivent à la même hauteur ;
    //   tout en bas, les deux longues listes, qui déroulent sans fin : les
    //     Modules à gauche, les Compétences à droite.
    // L'ordre de déclaration EST l'ordre d'affichage, colonne par colonne.
    { id: "jets",       titre: "Jets",              onglet: "options", colonne: "gauche", build: buildJets },
    { id: "actions",    titre: "Fiche",             onglet: "options", colonne: "droite", build: buildActions },
    { id: "modcaracs",  titre: "Modificateurs de caractéristiques", onglet: "options", colonne: "gauche", build: buildModCaracs },
    { id: "xpchamps",   titre: "XP par champ",      onglet: "options", colonne: "droite", build: buildXpChamps },
    // Création passe à DROITE, et ce n'est pas un choix de goût : mesuré sous
    // Firefox, les deux longues listes du bas démarraient à 139 px d'écart avec
    // ce bloc à gauche, contre 12 px une fois déplacé. Il tient d'ailleurs de
    // l'xp autant que « XP par champ », son voisin du dessus.
    { id: "creation",   titre: "Création",          onglet: "options", colonne: "droite", build: buildCreation },
    { id: "filtres",    titre: "Outils de filtre",  onglet: "options", colonne: "droite", build: buildFiltres },
    // « Affichage » n'existe que dans Roll20 : à gauche, il y compense les deux
    // blocs de réglages que porte la droite, et son absence sur le site laisse
    // les deux colonnes à égalité.
    { id: "affichage",  titre: "Affichage",         onglet: "options", colonne: "gauche", build: buildAffichage, pour: affichagePresent },
    { id: "mods",       titre: "Mods",              onglet: "options", colonne: "gauche", build: buildMods },
    { id: "modules",    titre: "Modules",           onglet: "options", colonne: "gauche", build: buildModules },
    // le titre dit ce que le bloc AFFICHE : « Compétences » le confondait avec
    // celui de l'onglet Fiche, dans le plan comme partout où les modules se
    // nomment
    { id: "optcomps",   titre: "Modificateurs de compétences", onglet: "options", colonne: "droite", build: buildOptComps }
  ];
  modules = MODULES_NATIFS.slice();

  // ---------- le moteur de mods ----------
  // jjk-mods.js est FACULTATIF DE NAISSANCE, exactement comme jjk-migrations.js :
  // sans lui la fiche s'ouvre, simplement sans mods. Il ne touche ni au DOM ni à
  // l'état, il reçoit la liste des mods et rend un bilan.
  //
  // Bilan du dernier passage : le bloc Options « Mods » et le bandeau de
  // consentement le lisent. Vide tant que le moteur n'a pas tourné.
  var bilanMods = [];
  function modActifDe(id) {
    var a = true;
    ((state && state.mods) || []).forEach(function (m) { if (m && m.id === id) a = m.actif !== false; });
    return a;
  }
  function modDe(id) {
    var out = null;
    ((state && state.mods) || []).forEach(function (m) { if (m && m.id === id) out = m; });
    return out;
  }
  // Ce propriétaire est-il un MOD ? Son id figure alors parmi les mods du
  // personnage, ou dans le bilan du montage précédent — un mod qu'on vient de
  // supprimer n'est plus que là, et c'est justement celui-là qu'il faut
  // reconnaître. « mod » est le repli du moteur : un mod dont on ignore le nom.
  function propEstUnMod(prop) {
    if (!prop || prop === "?") return false;
    if (prop === PROP_MOD) return true;
    return !!modDe(prop) || !!bilanDeMod(prop);
  }
  // Un mod n'a plus rien à faire tourner dès qu'il quitte le personnage, qu'on
  // le coupe ou qu'on lui retire son accord : ce qu'il a inscrit hors montage
  // (le filtre posé par l'un de ses boutons) s'arrête avec son code.
  function modAutorise(prop) {
    var m = modDe(prop);
    if (!m || m.actif === false) return false;
    return avisMod(empreinteMod(m.id, m.src)) === "oui";
  }
  function executeMods() {
    bilanMods = [];
    if (!state || !state.mods || !state.mods.length) return;
    if (!window.JjkMods || typeof window.JjkMods.execute !== "function") return;
    var avant = proprietaireCourant;
    // Un mod qui pose un filtre le fait pendant que le moteur l'exécute : le
    // propriétaire du moment lui revient. Le moteur peut nommer le mod qu'il
    // lance (Jjk.__proprietaire) ; s'il ne le fait pas, faute de mieux, tout ce
    // qui s'enregistre là appartient à « mod ».
    proprietaireCourant = PROP_MOD;
    try {
      var b = window.JjkMods.execute(state.mods, window.Jjk, { version: RELEASE, schema: SCHEMA });
      if (Array.isArray(b)) bilanMods = b;
      // Le bilan se range et se tait : une faute de syntaxe dans un mod ne
      // laissait RIEN dans la console du navigateur, alors que la page Mods dit
      // d'y regarder en premier. Le message part au même format que les autres
      // ennuis de module (« [mod:<id>] »), pour qu'un filtre sur « [mod: »
      // ramasse tout ce qui concerne un mod, d'où que ça vienne.
      bilanMods.forEach(function (x) {
        if (!x || x.etat !== "panne") return;
        if (window.console && window.console.warn)
          window.console.warn("[mod:" + x.id + "] en panne : " + (x.message || "sans message"));
      });
    } catch (err) {
      // le moteur lui-même en panne : la fiche s'ouvre quand même, sans mods
      if (window.console && window.console.warn)
        window.console.warn("[mods] moteur en panne : " + messageErreur(err));
    }
    proprietaireCourant = avant;
  }

  // ---------- la disposition enregistrée ----------
  // Les colonnes d'un onglet ne se connaissent qu'en bâtissant son squelette :
  // on le bâtit une fois à vide, dans un élément détaché, plutôt que de recopier
  // ici une liste de colonnes qui dériverait au premier onglet remanié.
  function colonnesDe(onglet) {
    if (!aClef(SQUELETTES, onglet)) return null;
    var noms = {};
    var c = SQUELETTES[onglet](el("div"));
    Object.keys(c || {}).forEach(function (k) { noms[k] = 1; });
    return noms;
  }
  // Les colonnes d'un onglet, DANS L'ORDRE, en distinguant celles qui courent
  // sur toute la largeur. Le squelette les reconnaît lui-même : une colonne
  // pleine largeur rend le PANNEAU au lieu d'une colonne de la grille (c'est
  // ainsi que l'inventaire passe sous les deux colonnes de l'Équipement). Le
  // plan a besoin de la distinction pour se dessiner comme la fiche.
  function squeletteColonnes(onglet) {
    if (!aClef(SQUELETTES, onglet)) return null;
    var pane = el("div");
    var c = SQUELETTES[onglet](pane) || {};
    var noms = [], larges = {};
    Object.keys(c).forEach(function (k) {
      noms.push(k);
      if (c[k] === pane) larges[k] = 1;
    });
    return { noms: noms, larges: larges };
  }
  // state.modules : l'ordre d'abord, la place ensuite. Une consigne qui ne
  // désigne rien de valide (module inconnu, onglet disparu, colonne qui
  // n'existe plus dans ce squelette) est simplement ignorée : elle laisserait
  // sinon le module hors de la fiche, sans rien pour l'y ramener.
  function appliqueDisposition() {
    var d = state && state.modules;
    if (!d || typeof d !== "object") return;
    if (Array.isArray(d.ordre)) ordonne(d.ordre);
    var place = d.place;
    if (!place || typeof place !== "object") return;
    Object.keys(place).forEach(function (id) {
      var p = place[id];
      if (!p || typeof p !== "object") return;
      var i = rangModule(id);
      if (i < 0) return;
      var m = modules[i];
      var onglet = (typeof p.onglet === "string" && aClef(SQUELETTES, p.onglet)) ? p.onglet : m.onglet;
      var cols = colonnesDe(onglet) || {};
      var colonne = (typeof p.colonne === "string" && aClef(cols, p.colonne)) ? p.colonne : null;
      // l'onglet change sans que la colonne suive : celle du module n'existe
      // peut-être pas là-bas, on prend alors la première du squelette
      if (!colonne) colonne = aClef(cols, m.colonne) ? m.colonne : Object.keys(cols)[0];
      if (!colonne || (onglet === m.onglet && colonne === m.colonne)) return;
      // COPIE : la table native ne se laisse pas remanier, elle est le seul
      // moyen de rendre à un module sa place d'origine
      var copie = {};
      Object.keys(m).forEach(function (k) { copie[k] = m[k]; });
      copie.onglet = onglet;
      copie.colonne = colonne;
      modules[i] = copie;
    });
  }

  // ---------- le bandeau de consentement ----------
  // Le code d'un mod voyage AVEC le personnage : ouvrir la fiche d'un autre
  // joueur ne doit jamais exécuter son code sans un oui explicite. Ce oui reste
  // dans CE navigateur (le moteur le range), il ne voyage pas — sinon l'auteur
  // consentirait pour tout le monde.
  //
  // La fiche s'ouvre TOUJOURS : un mod en attente ne bloque rien, il ne tourne
  // pas, c'est tout. (L'écran de version, lui, protège des données : il bloque.)
  function modsEnAttente() {
    if (!state || !state.mods || !state.mods.length) return [];
    if (!window.JjkMods || typeof window.JjkMods.enAttente !== "function") return [];
    try {
      // MÊME repère que executeMods, sans quoi les deux écrans se contredisent :
      // sans version ni schéma, le moteur saute ses deux contrôles, un mod
      // « pour: 4.0.0 » est annoncé « pas autorisé », le joueur l'autorise, et
      // le bloc Mods lui répond « trop récent ». Le oui ainsi arraché dort dans
      // le navigateur et s'appliquerait tout seul le jour de la 4.0.0.
      var a = window.JjkMods.enAttente(state.mods, { version: RELEASE, schema: SCHEMA });
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function decideMod(empreinte, avis) {
    if (!window.JjkMods || typeof window.JjkMods.decide !== "function") return;
    try { window.JjkMods.decide(empreinte, avis); } catch (e) {}
  }
  // Le dialogue d'examen : le code de chaque mod, en clair, et deux boutons.
  // Une décision remonte la fiche aussitôt (le mod autorisé doit tourner, et
  // le bandeau doit dire la vérité) : le dialogue part avec l'ancien DOM,
  // le bandeau restant se rouvre d'un clic s'il reste des mods à juger.
  function examinerMods(attente) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "Un mod autorisé tourne dans la page de la fiche, avec les mêmes droits qu'elle : " +
      "il fait ce qu'il veut de ce qui s'y affiche et de ce qui s'y enregistre. " +
      "N'autoriser que du code dont la provenance est sûre."));
    attente.forEach(function (m) {
      var ligne = el("div", "pc-modrow");
      ligne.appendChild(el("span", "nom", m.nom || m.id));
      ligne.appendChild(el("span", "id", m.id));
      corps.appendChild(ligne);
      var ta = el("textarea", "pc-code");
      ta.readOnly = true;
      ta.value = String(m.src == null ? "" : m.src);
      corps.appendChild(ta);
      var boutons = el("div", "row");
      boutons.appendChild(miniBtn("Autoriser", "Ce mod tournera à chaque ouverture, sur ce navigateur", function () {
        decideMod(m.empreinte, "oui");
        remount();
      }, "primary"));
      boutons.appendChild(miniBtn("Refuser", "Ce mod ne tournera pas ; il reste sur le personnage", function () {
        decideMod(m.empreinte, "non");
        remount();
      }, "danger"));
      corps.appendChild(boutons);
    });
    dialogue("Mods en attente d'autorisation", corps, function () { remount(); }, "Terminer");
  }
  function bandeauAvis(app) {
    var attente = modsEnAttente();
    if (!attente.length) return;
    var n = attente.length;
    // .pc-avis-mods : le bandeau de CONSENTEMENT, distinct de celui de perte
    // d'enregistrement, qui partage la même mise en forme (voir montrePanneSave)
    var av = el("div", "pc-avis pc-avis-mods");
    av.appendChild(el("div", "pc-avis-txt",
      "Ce personnage porte " + n + " mod" + (n > 1 ? "s" : "") + " qui n'" +
      (n > 1 ? "ont" : "a") + " pas été autorisé" + (n > 1 ? "s" : "") +
      " sur ce navigateur. " + (n > 1 ? "Ils ne tournent" : "Il ne tourne") + " pas."));
    var row = el("div", "row");
    row.appendChild(miniBtn("Examiner", "Lire le code de chaque mod avant de décider", function () {
      examinerMods(attente);
    }));
    row.appendChild(miniBtn("Tout refuser", "Aucun de ces mods ne tournera sur ce navigateur", function () {
      attente.forEach(function (m) { decideMod(m.empreinte, "non"); });
      remount();
    }, "danger"));
    av.appendChild(row);
    app.appendChild(av);
  }

  // La fiche expose UN objet public : c'est par là qu'un mod remplace un
  // module, change la disposition ou détourne un calcul. Elle n'exécute rien
  // d'elle-même. window.__jjkModules est l'ANCIEN nom du MÊME objet : ce qui a
  // été écrit avant la 3.0.0 continue de marcher tel quel.
  window.Jjk = {
    version: RELEASE,
    schema: SCHEMA,
    enregistre: enregistre,
    ordonne: ordonne,
    // une COPIE de la description : personne ne remanie la table de l'extérieur
    liste: function () {
      return ordreModules().map(function (m) {
        return { id: m.id, titre: m.titre, onglet: m.onglet, colonne: m.colonne, actif: actif(m.id) };
      });
    },
    actif: actif,
    // l'interrupteur : couper un module le retire de la fiche sans rien
    // effacer (son coffre et ses données restent, il ne s'affiche plus)
    active: activeModule,
    // de quoi afficher l'état d'un module : ses pannes, sa muselière
    etat: function (id) {
      var e = etatModule(id);
      return { echecs: e.echecs, musele: e.musele, erreur: e.erreur,
               panne: e.panne, vide: e.vide, actif: actif(id) };
    },
    remonte: remount,
    // filtrer un calcul de la fiche (les neuf points de FILTRES_CONNUS)
    filtre: filtreCalcul,
    // bilan du dernier passage du moteur de mods, en COPIE : vide tant qu'il
    // n'a pas tourné. « actif » vient de l'état (l'interrupteur du joueur),
    // « etat » du moteur (ok, panne, attente, coupe, recent, refuse).
    mods: function () {
      return bilanMods.map(function (b) {
        return { id: b.id, nom: b.nom, actif: modActifDe(b.id), etat: b.etat,
                 message: b.message || "", empreinte: b.empreinte };
      });
    },
    // INTERNE, pour le moteur de mods : nommer le mod qu'il lance, afin que les
    // filtres enregistrés pendant son exécution portent SON id. Sans cet appel
    // ils reviennent tous à « mod », ce qui n'est faux que dans le journal.
    __proprietaire: function (id) {
      proprietaireCourant = id ? String(id) : PROP_MOD;
      // modEnExec ne vaut que PENDANT le lancement d'un mod : le moteur rend la
      // main avec null. C'est lui qui permet à enregistre() de marquer le module
      // au nom du mod qui l'a posé.
      modEnExec = id ? String(id) : null;
    },
    // INTERNE, pour les sondes. Le double tiret bas dit ce qu'il faut : ce
    // n'est pas le contrat public, la page Mods ne les nomme pas, et un mod qui
    // s'y appuie le fait à ses risques. Ils existent parce qu'une sonde qui
    // lirait les valeurs dans le DOM mesurerait la MISE EN FORME autant que le
    // calcul : « 30 » et « 30 m » se ressemblent trop pour juger d'un filtre.
    __calculs: {
      caracTotal: caracTotal, compValue: compValue, compXp: compXp,
      pvMax: pvMax, pvCourant: pvCourant, initiative: initiative,
      vitesse: vitesse, vitesseVal: vitesseVal, regen: regen,
      poidsPorte: poidsPorte, xpDepense: xpDepense
    },
    // le registre des filtres, à plat et en copie : nom, propriétaire, fautes
    __filtres: function () {
      var out = [];
      Object.keys(filtres).forEach(function (nom) {
        (filtres[nom] || []).forEach(function (f) {
          out.push({ nom: nom, prop: f.prop, echecs: f.echecs });
        });
      });
      return out;
    }
  };
  window.__jjkModules = window.Jjk;

  // ---------- montage ----------
  // Un montage ne se relance JAMAIS depuis lui-même. Un mod qui finit par
  // Jjk.remonte() (geste naturel, et la page Mods documente remonte() sans
  // réserve) ou par ctx.reconstruire() rappellerait mount() DEPUIS mount() :
  // les mods repartiraient, redemanderaient un remontage, la pile déborderait,
  // et chaque niveau qui se dépile reprendrait son montage là où il en était
  // (page vidée, vingt-cinq blocs rebâtis, refresh, save). L'onglet gèle, à
  // CHAQUE ouverture puisque le mod voyage avec le personnage, et le joueur
  // n'atteint plus le bloc Mods pour couper le fautif. La demande est donc
  // notée et honorée UNE SEULE FOIS, le montage courant fini.
  //
  // La garde est ici et pas dans remount() : tout ce qui remonte la fiche passe
  // par mount(), remount() comme le premier montage.
  var montageEnCours = false;
  var remontageDu = false;
  var remontagesDus = 0;       // enchaînements, pour le mod qui en redemande à chaque fois
  var REMONTAGES_MAX = 3;
  function mount(root) {
    if (montageEnCours) { remontageDu = true; return; }
    montageEnCours = true;
    var abouti = false;
    try { montage(root); abouti = true; }
    finally {
      montageEnCours = false;
      // un montage tombé en route l'a laissé levé : ce qui s'enregistrerait
      // ensuite serait perdu au lieu d'attendre le montage suivant
      enMontage = false;
      // et il a pu laisser une demande de remontage en l'air : la queue de
      // mount() est sautée quand l'exception passe, si bien que le PROCHAIN
      // montage, réussi celui-là, payait un remontage gratuit hérité d'un
      // montage qui n'a jamais abouti.
      if (!abouti) { remontageDu = false; remontagesDus = 0; }
    }
    if (!remontageDu) { remontagesDus = 0; return; }
    remontageDu = false;
    // Un mod qui redemande un remontage à chaque montage boucle sans fin : on
    // s'arrête au bout de trois enchaînements et on le dit dans le journal. La
    // fiche reste utilisable, donc le bloc Mods aussi.
    if (remontagesDus >= REMONTAGES_MAX) {
      if (window.console && window.console.warn)
        window.console.warn("[fiche] remontage en boucle : demande ignorée. Un mod appelle Jjk.remonte() à chaque montage.");
      remontagesDus = 0;
      return;
    }
    remontagesDus++;
    mount(root);
  }
  function montage(root) {
    rootEl = root;
    enMontage = true;
    // tous les registres repartent à vide : les anciens pointent sur un DOM
    // qui n'existe plus. Les compteurs de panne aussi : un remontage est une
    // seconde chance, c'est ce que fait le bouton « Réessayer ».
    regHors = [];
    regsModules = {};
    etatsModules = {};
    hooks = regHors;
    compHooks = [];
    optHooks = [];
    optCompsRebuild = null;
    // Filtres et table des modules : même remise à zéro, même raison. Ce sont
    // les mods et les modules qui les repeuplent, à chaque montage. Sans elle,
    // un mod désinstallé garderait pour toujours la place du module natif qu'il
    // avait remplacé, et ses filtres s'empileraient à chaque remontage.
    filtres = {};
    filtresEnCours = {};
    proprietaireCourant = "?";
    modules = MODULES_NATIFS.slice();
    moduleOrdre = [];
    rejoueHorsMontage();
    // les mods d'abord (ils enregistrent modules et filtres), la disposition
    // ensuite : elle peut nommer un module qu'un mod vient d'ajouter
    executeMods();
    // La place D'ORIGINE de chaque module, relevée AVANT qu'appliqueDisposition
    // ne remanie la table. C'est elle qui dit où un module retourne quand on
    // rétablit la disposition d'origine, et le plan s'en sert pour montrer un
    // rangement encore en attente : sans elle, la table en mémoire porte déjà
    // la place forcée et plus rien ne sait d'où le module venait.
    placeOrigine = {};
    modules.forEach(function (m) {
      placeOrigine[m.id] = { onglet: m.onglet, colonne: m.colonne };
    });
    appliqueDisposition();
    root.innerHTML = "";
    var app = el("div", "perso-atelier");
    appEl = app;

    buildTop(app);
    bandeauAvis(app);
    var sheet = el("div", "pc-sheet");
    app.appendChild(sheet);
    root.appendChild(app);

    buildHead(sheet);
    monteModules(buildTabs(sheet));
    enMontage = false;   // ce qui s'enregistre après (console) vaut pour le montage suivant
    refresh();
  }

  // Charger les données et MONTER sont deux pannes différentes, et elles ne se
  // disent pas de la même façon. Le montage vivait dans le .then() du fetch :
  // tout ce qui tombait pendant lui (le plus souvent un mod) se faisait
  // rattraper par le .catch d'à côté, qui accusait alors le fichier de données
  // d'une faute qui n'était pas la sienne — et data-ready interdisant le
  // réessai, la fiche restait close sur un message faux. Chacun son filet.
  function demarre(root) {
    state = load() || blank();
    try { mount(root); }
    catch (e) {
      if (window.console && window.console.error) window.console.error("[fiche] montage", e);
      root.innerHTML = '<p style="padding:2rem;color:#b0402c">La fiche n\'a pas pu se monter (' +
        messageErreur(e) + "). Les données, elles, sont chargées : la cause est dans la fiche ou dans un mod.</p>";
    }
  }
  function init() {
    var root = document.getElementById("perso-atelier");
    if (!root || root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    // point d'entrée des objets donnés au tchat : l'amorce Roll20 appelle ceci
    // quand le joueur clique « Prendre » (et rejoue ce qui attendait le montage)
    window.__jjkOnTake = function (payload) {
      if (!state) { flash("La fiche n'est pas encore prête : reclique « Prendre »."); return; }
      recevoirObjet(payload);
    };
    if (DATA) { demarre(root); return; }
    fetch(dataUrl(), { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      // DATA vide vaut échec : sans lui le montage partirait sans données, et
      // c'est bien du fichier qu'il faudrait alors se plaindre
      .then(function (d) { if (!d) throw new Error("données vides"); DATA = d; })
      .catch(function (e) {
        root.innerHTML = '<p style="padding:2rem;color:#b0402c">Le créateur n\'a pas pu charger ses données (' + e.message + ").</p>";
      })
      // hors de portée du .catch ci-dessus : DATA dit si les données sont là
      .then(function () { if (DATA) demarre(root); });
  }

  if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
