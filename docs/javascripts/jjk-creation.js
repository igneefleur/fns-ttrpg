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

  var XP_CREATION = 500;      // xp de départ (le total reste modifiable)
  var PTS_CREATION = 120;     // points de caractéristiques à la création
  var CARAC_MAX = 80;         // limite sans avantage
  var CARAC_PAS = 5;          // +5 par achat d'xp
  var QUART = 4;              // « pas plus d'un quart de l'xp total »

  var ABBR = { Mind: "MIND", Body: "BODY", Prestance: "PRES" };

  // ---------- outils ----------
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
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
      v: 1,
      name: "", portrait: "", espece: "", age: "", sexe: "", genre: "",
      defaut: "", qualites: ["", ""], background: "", notes: "",
      avantages: [], sansLimite: false,
      caracsBase: { Mind: 0, Body: 0, Prestance: 0 },
      caracsXp: { Mind: 0, Body: 0, Prestance: 0 },
      caracsMod: { Mind: 0, Body: 0, Prestance: 0 },
      compsMod: {},
      xpTotal: XP_CREATION,
      comps: {}, customComps: [],
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
      de: "1d100"
    };
  }
  // Toute donnée entrante (localStorage, import JSON, Attributes Roll20) passe
  // par cette normalisation : champ manquant -> valeur par défaut, types sûrs.
  // La validation est PROFONDE (éléments des tableaux, sous-objets compris) :
  // un état corrompu ne doit ni briquer la page ni s'effacer en silence.
  function normalize(s) {
    var b = blank();
    if (!s || typeof s !== "object") return b;
    Object.keys(b).forEach(function (k) { if (s[k] === undefined) s[k] = b[k]; });
    if (!s.caracsBase || typeof s.caracsBase !== "object") s.caracsBase = b.caracsBase;
    if (!s.caracsXp || typeof s.caracsXp !== "object") s.caracsXp = b.caracsXp;
    if (!s.caracsMod || typeof s.caracsMod !== "object") s.caracsMod = b.caracsMod;
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
    // PV max forcé : vide = valeur calculée ; borné comme le reste
    s.pvMaxOverride = (s.pvMaxOverride === null || s.pvMaxOverride === undefined || s.pvMaxOverride === "")
      ? null : Math.floor(parseFloat(s.pvMaxOverride));
    if (s.pvMaxOverride !== null && !isFinite(s.pvMaxOverride)) s.pvMaxOverride = null;
    if (s.pvMaxOverride !== null) s.pvMaxOverride = clamp(s.pvMaxOverride, 0, 9999);
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
    s.xpTotal = Math.max(0, num(s.xpTotal, XP_CREATION));
    s.narration = clamp(num(s.narration, 3), 0, 99);
    s.pv = (s.pv === null || s.pv === undefined || s.pv === "") ? null : parseFloat(s.pv);
    if (s.pv !== null && !isFinite(s.pv)) s.pv = null;
    return s;
  }

  // ---------- calculs ----------
  function caracTotal(c) {
    var v = state.caracsBase[c] + CARAC_PAS * state.caracsXp[c];
    if (!state.sansLimite) v = Math.min(v, CARAC_MAX);
    // le modificateur (bloc Options) s'applique APRÈS le plafond : il peut
    // porter le total au-delà de 80 comme en dessous de 0.
    return v + (state.caracsMod[c] || 0);
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
  function compXp(c) {
    var xp = DATA.xpParStade * c.stade;
    // les passifs PRÉSENTS restent facturés même si le stade ne les ouvre
    // plus (fiches d'avant un déplacement du stade d'ouverture : rien ne
    // doit disparaître ni se re-créditer en silence)
    (c.techniques || []).forEach(function (t) { xp += techXp(t); });
    return xp + artXp(c);
  }
  function compCap() { return Math.floor(state.xpTotal / QUART); }
  function xpDepense() {
    var xp = 0;
    ["Mind", "Body", "Prestance"].forEach(function (c) { xp += DATA.xpParStade * state.caracsXp[c]; });
    Object.keys(state.comps).forEach(function (k) { xp += compXp(state.comps[k]); });
    return xp;
  }
  function xpRestant() { return state.xpTotal - xpDepense(); }
  function ptsCreation() {
    return state.caracsBase.Mind + state.caracsBase.Body + state.caracsBase.Prestance;
  }
  // les valeurs issues d'une division s'arrondissent à l'INFÉRIEUR
  function pvMaxAuto() { return Math.floor((20 + caracTotal("Body")) / 2) + modSum(state.divers.pvMax); }
  // PV max : la valeur forcée (Options du bloc PV) court-circuite le calcul
  function pvMax() { return state.pvMaxOverride !== null ? state.pvMaxOverride : pvMaxAuto(); }
  function pvCourant() { return state.pv === null ? pvMax() : state.pv; }
  function regen() { return Math.max(0, Math.floor(caracTotal("Body") / 10) + modSum(state.divers.regen)); }
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
  function vitesse() {
    return fmtP(Math.max(0, vitesseBase() + modSum(state.divers.vitesse))) + " m";
  }
  function compValue(carac, comp, key) {
    return caracTotal(carac) + stadeInfo(comp ? comp.stade : 0).bonus +
           (key ? (state.compsMod[key] || 0) : 0);
  }
  function blankComp() { return { stade: 0, techniques: [] }; }
  function allComps() {
    var out = [];
    CHAMPS.forEach(function (c) {
      (DATA.comps[c] || []).forEach(function (n) { out.push({ key: c + "/" + n, name: n, carac: c, custom: false }); });
    });
    state.customComps.forEach(function (cc) {
      if (cc && cc.name) out.push({ key: cc.carac + "/" + cc.name, name: cc.name, carac: cc.carac, custom: true });
    });
    return out;
  }

  // La « carte » : le résumé calculé de la fiche, pour la bibliothèque, le popup
  // de l'extension et les attributs miroir Roll20 (barres de jetons, macros).
  function computeCard() {
    return {
      name: state.name || "Sans nom",
      caracs: { Mind: caracTotal("Mind"), Body: caracTotal("Body"), Prestance: caracTotal("Prestance") },
      combat: { pv: state.pv === null ? null : pvCourant(), pvMax: pvMax(), vitesse: vitesse() },
      narration: state.narration,
      updated: nowStamp()
    };
  }

  // ---------- persistance ----------
  var saveWarned = false;   // l'échec d'enregistrement n'est signalé qu'une fois
  function save() {
    try { STORE.setItem("jjk-perso", JSON.stringify(state)); }
    catch (e) {
      if (!saveWarned) {
        saveWarned = true;
        flash("Impossible d'enregistrer (stockage plein ou bloqué) : exporter la fiche en JSON.");
      }
    }
    var cards;
    try { cards = JSON.parse(STORE.getItem("jjk-cards")) || {}; } catch (e) { cards = {}; }
    var card = computeCard();
    card.id = "_current";
    cards._current = card;
    try { STORE.setItem("jjk-cards", JSON.stringify(cards)); } catch (e) {}
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
  // Même assainissement que l'extension (content-roll20.js) : sur le canal brut
  // elle n'en fait aucun, une accolade ou un retour à la ligne d'un texte de
  // fiche casserait la carte.
  function envSan(s) {
    return String(s == null ? "" : s).replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
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
  function cmdJet(label, value, die, avecInput) {
    var v = value >= 0 ? "+ " + value : "- " + (-value);
    return "&{template:default} {{name=" + String(label || "Jet").replace(/[{}]/g, "") +
           "}} {{Jet=[[" + (String(die || "1d100").trim() || "1d100") + " " + v +
           (avecInput ? ENV_QUERY : "") + "]]}}";
  }
  function cmdCarte(title, fields) {
    var cmd = "&{template:default} {{name=" + envSan(title) + "}}";
    (fields || []).forEach(function (f) {
      if (!f) return;
      var k = envSan(f[0]), v = envSan(f[1]);
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
  function doRoll(label, value, die, isCheck) {
    die = die || state.de || "1d100";
    // « avec input » ne vaut QUE pour les jets de test : isCheck est vrai
    // exactement aux caractéristiques et aux compétences, faux aux dégâts et
    // à l'invulnérabilité — aucun autre filtre à écrire.
    if (envoyer(cmdJet(label, value, die, isCheck && envInput()))) return;
    // extension antérieure au canal brut : jet public, sans modificateur
    if (typeof window !== "undefined" && typeof window.__jjkRoll === "function") {
      window.__jjkRoll(die, value, label);
      return;
    }
    var d = parseDice(die);
    if (!d) { flash("Dé illisible : « " + die + " » (attendu : NdM, ex. 1d100)."); return; }
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
  // hooks : fonctions appelées à chaque changement d'état. Remises à zéro à
  // chaque mount() (navigation instantanée comprise) pour ne pas s'accumuler.
  // compHooks : hooks des lignes de compétences, vidés par rebuildComps().
  var hooks = [];
  var compHooks = [];
  var optHooks = [];            // bloc Options « Modificateurs de compétences », rebâtissable
  var optCompsRebuild = null;   // posé par buildOptions ; rappelé quand les comps perso changent
  // filtres du bloc, survivants au remount comme ceux de la Fiche
  var optFilter = "";
  var optChamp = "";
  var optOnly = COMPACT;        // Roll20 : investies seulement par défaut, comme la Fiche
  var optPerso = true;          // décoché : seules les compétences de base du jeu
  function refresh() {
    save();
    hooks.forEach(function (f) { try { f(); } catch (e) {} });
    compHooks.forEach(function (f) { try { f(); } catch (e) {} });
    optHooks.forEach(function (f) { try { f(); } catch (e) {} });
  }
  // Remplacement d'état COMPLET (import, bibliothèque, nouveau personnage) :
  // toutes les sections tiennent des références sur l'ancien état, on remonte
  // donc la fiche entière depuis le nouvel état.
  var rootEl = null;
  var appEl = null;      // le .perso-atelier monté : porte les jetons de couleur
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
  function textInput(get, set, placeholder) {
    var i = el("input");
    i.type = "text";
    if (placeholder) i.placeholder = placeholder;
    i.value = get() || "";
    i.addEventListener("input", function () { set(i.value); refresh(); });
    hooks.push(function () { if (document.activeElement !== i) i.value = get() || ""; });
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
  var MMOD_SLOTS = ["équipement", "art", "décision du MJ"];
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
        ? "Bonus ou malus divers (équipement, art, décision du MJ)."
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
  function bigTile(label, getV, onClick) {
    var d = el("div", "pc-big" + (onClick ? " pc-rollable" : ""));
    d.appendChild(el("span", "k", label));
    var v = el("span", "v", "");
    d.appendChild(v);
    hooks.push(function () { v.textContent = String(getV()); });
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

  // ---------- onglet Fiche : caractéristiques + combat | compétences ----------
  function buildCaracs(col) {
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
    col.appendChild(b);
  }

  // L'ancien bloc « Combat » est éclaté (2026-08-01) : Vitesse et Régén / jour
  // forment leur propre élément (tuiles autonomes), PV et Narration ont chacun
  // leur bloc ; la tuile « XP restant » a disparu, le compteur « XP dépensé »
  // de l'en-tête la rendait redondante.
  function buildVitesse(col) {
    // deux tuiles = deux MODULES distincts : chacune porte son propre rouage
    // flottant (jeu : lecture ; édition : ses divers)
    var tiles = el("div", "pc-bigrow pc-bigrow-2");

    var tv = bigTile("Vitesse", vitesse);
    tv.classList.add("pc-mods-host", "pc-editable");
    tv.dataset.module = "vitesse";
    var gV = gearBtn(tv, "vitesse");
    gV.classList.add("pc-gear-float");
    tv.appendChild(gV);
    var mmV = multiMod(state.divers, "vitesse");
    mmV.classList.add("pc-edit-only");
    tv.appendChild(mmV);
    hooks.push(function () {
      var d = modSum(state.divers.vitesse);
      tv.classList.toggle("adj", d !== 0);
      tv.title = "Palier de la table (Body " + caracTotal("Body") + ") : " + vitessePalier() +
                 (d ? " · divers " + sign(d) + " m" : "");
    });
    tiles.appendChild(tv);

    var tr = bigTile("Régén / jour", regen);
    tr.classList.add("pc-mods-host", "pc-editable");
    tr.dataset.module = "regen";
    var gR = gearBtn(tr, "regen");
    gR.classList.add("pc-gear-float");
    tr.appendChild(gR);
    var mmR = multiMod(state.divers, "regen");
    mmR.classList.add("pc-edit-only");
    tr.appendChild(mmR);
    hooks.push(function () {
      var d = modSum(state.divers.regen);
      tr.classList.toggle("adj", d !== 0);
      tr.title = "Body / 10 = " + Math.floor(caracTotal("Body") / 10) +
                 (d ? " · divers " + sign(d) : "") + " (jamais sous 0)";
    });
    tiles.appendChild(tr);

    col.appendChild(tiles);
  }

  function buildPv(col) {
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
          (d ? " · divers " + sign(d) : "");
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
    force.title = "Vide = maximum calculé ((20 + Body) / 2, divers compris) ; " +
                  "une valeur le force (avantage, décision du MJ).";
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
    mrow.appendChild(el("span", "lbl", "Divers"));
    mrow.appendChild(multiMod(state.divers, "pvMax"));
    mrow.appendChild(el("span", "sp"));
    b.appendChild(mrow);
    col.appendChild(b);
  }

  function buildNarration(col) {
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
    col.appendChild(b);
  }

  function compRow(item, odd) {
    var comp = function () { return state.comps[item.key] || blankComp(); };
    var row = el("div", "pc-comp-row" + (odd ? " odd" : ""));

    var nameBox = el("span", "pc-comp-name");
    var label = el("span", "pc-comp-label", item.name);
    label.title = item.name + " (" + item.carac + ")";
    nameBox.appendChild(label);
    if (item.custom) {
      var del = el("button", "pc-comp-del pc-edit-only", "✕");
      del.type = "button";
      del.title = "Retirer cette compétence personnalisée";
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
        state.customComps = state.customComps.filter(function (cc) { return (cc.carac + "/" + cc.name) !== item.key; });
        delete state.comps[item.key];
        delete state.compsMod[item.key];   // sinon le modificateur renaîtrait sur une homonyme
        refresh();
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
      var delta = compXp(next) - compXp(c);
      if (delta > 0 && xpRestant() < delta) { flash("XP insuffisant."); return; }
      // le plafond du quart ne bloque que les HAUSSES : on peut toujours redescendre
      if (delta > 0 && compXp(next) > compCap()) {
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
        if (!isEdit("comps")) return;   // construction : mode édition requis
        applyStade(i);
      });
      st.appendChild(sg);
      segs.push(sg);
    });
    row.appendChild(st);

    // le total est un BOUTON de jet, comme la valeur d'une caractéristique
    var total = el("button", "pc-comp-total pc-comp-roll pc-rollable", "");
    total.type = "button";
    total.addEventListener("click", function () {
      doRoll(item.name + " (" + item.carac + ")", compValue(item.carac, comp(), item.key), null, true);
    });
    row.appendChild(total);

    compHooks.push(function () {
      var c = comp();
      var d = state.compsMod[item.key] || 0;
      segs.forEach(function (sg, i) {
        sg.classList.toggle("on", i <= c.stade);
        sg.classList.toggle("cur", i === c.stade);
      });
      total.textContent = sign(compValue(item.carac, c, item.key));
      total.classList.toggle("zero", !c.stade && !d);
      total.classList.toggle("adj", d !== 0);
      total.title = item.carac + " " + sign(caracTotal(item.carac)) +
                    " · stade " + sign(stadeInfo(c.stade).bonus) +
                    (d ? " · modificateur (Options) " + sign(d) : "") + " — clic : lancer";
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
  function compInvestie(it) {
    var c = state.comps[it.key];
    // l'art compte : une compétence redescendue qui garde son art reste
    // visible ; un modificateur (Options) non nul aussi (sinon « Investies
    // seulement » cache une valeur pourtant modifiée)
    return !!(c && (c.stade > 0 || (c.techniques && c.techniques.length) || porteArt(c))) ||
           (state.compsMod[it.key] || 0) !== 0;
  }
  // l'ordre des champs, partout sur la Fiche : Body, puis Mind, puis Prestance
  var CHAMPS = ["Body", "Mind", "Prestance"];
  function rebuildComps() {
    if (!compBox) return;
    compHooks = [];   // les lignes vont être détruites : leurs hooks avec
    compBox.innerHTML = "";
    var flt = compFilter.trim().toLowerCase();
    CHAMPS.forEach(function (carac) {
      if (compChamp && compChamp !== carac) return;
      var items = allComps().filter(function (it) { return it.carac === carac; });
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
  function buildComps(col) {
    // jeu : filtres (outils de vue) et totaux-jets ; édition : stades, ajout
    // et retrait de compétences perso. Le rouage rebâtit la liste : les
    // rangées d'ajout n'existent qu'en édition.
    var b = block("Compétences", null, "comps", function () { rebuildComps(); });
    // outils sur deux lignes : filtre texte + filtre de champ côte à côte,
    // puis la puce « Investies seulement » en dessous
    var tools = el("div", "pc-comp-tools");
    var line1 = el("div", "row");
    var search = el("input", "pc-comp-search");
    search.type = "search";
    search.placeholder = "Filtrer…";
    search.value = compFilter;   // le filtre survit au remount : le champ doit le montrer
    search.addEventListener("input", function () { compFilter = search.value; rebuildComps(); });
    line1.appendChild(search);
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
    tools.appendChild(line1);
    var line2 = el("div", "row");
    var persoChip = el("span", "pc-chip");
    persoChip.textContent = "Compétences personnalisées";
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
    onlyChip.textContent = "Investies seulement";
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
    col.appendChild(b);
    rebuildComps();
  }

  function buildFiche(pane) {
    // trois colonnes : caractéristiques | PV, vitesse, narration | compétences,
    // les compétences à la suite (Body, puis Mind, puis Prestance)
    var cols = el("div", "pc-cols-fiche");
    var c1 = el("div", "pc-col");
    var c2 = el("div", "pc-col");
    var c3 = el("div", "pc-col");
    cols.appendChild(c1);
    cols.appendChild(c2);
    cols.appendChild(c3);
    pane.appendChild(cols);
    buildCaracs(c1);
    buildVitesse(c2);
    buildPv(c2);
    buildNarration(c2);
    buildComps(c3);
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
  function buildArt(pane) {
    // jeu : lire les arts et passifs, les envoyer au tchat ; édition :
    // rédiger, ajouter, retirer
    var b = block("Arts et passifs", null, "arts");
    var box = el("div", "pc-arts");
    b.appendChild(box);
    pane.appendChild(b);

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
  function diceOf(txt) {
    var m = /(\d{1,2})\s*[dD]\s*(\d{1,4})\s*([+-]\s*\d{1,4})?/.exec(String(txt || ""));
    if (!m) return null;
    return m[1] + "d" + m[2] + (m[3] ? m[3].replace(/\s/g, "") : "");
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
          if (!d) { flash("Renseigner d'abord les dés (ex. 5D8)."); return; }
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
      var cmd = "&{template:default} {{name=Objet donné — " + (it.nom || "objet") + "}}" +
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

  function buildEquipement(pane) {
    var cols = el("div", "pc-cols2");
    var left = el("div", "pc-col");
    var right = el("div", "pc-col");
    cols.appendChild(left);
    cols.appendChild(right);
    pane.appendChild(cols);

    var bA = block("Armes", null, "armes");
    var boxA = el("div");
    bA.appendChild(boxA);
    eqCards(boxA, state.armes, "arme", bA, "armes");
    left.appendChild(bA);

    var bB = block("Armures", null, "armures");
    var boxB = el("div");
    bB.appendChild(boxB);
    eqCards(boxB, state.armures, "armure", bB, "armures");
    right.appendChild(bB);

    // le rouage re-rend l'inventaire : messages et titres suivent le mode
    var invRenderRef = { fn: null };
    var bO = block("Inventaire", "objets par groupes", "inv", function () {
      if (invRenderRef.fn) invRenderRef.fn();
    });
    invObjets(bO, invRenderRef);
    pane.appendChild(bO);
  }

  // ---------- onglet Bio ----------
  function buildBio(pane) {
    var cols = el("div", "pc-cols2");
    var left = el("div", "pc-col");
    var right = el("div", "pc-col");
    cols.appendChild(left);
    cols.appendChild(right);
    pane.appendChild(cols);

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
    left.appendChild(bP);

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
    left.appendChild(bA);

    var bB = block("Background", null, "bg");
    var bg = el("textarea", "pc-notes pc-edit-field");
    bg.rows = 9;
    bg.value = state.background || "";
    bg.addEventListener("input", function () { state.background = bg.value; save(); });
    bB.appendChild(bg);
    right.appendChild(bB);

    // les Notes restent libres : c'est le carnet de la session, il s'écrit en jeu
    var bN = block("Notes");
    var nt = el("textarea", "pc-notes");
    nt.rows = 6;
    nt.value = state.notes || "";
    nt.addEventListener("input", function () { state.notes = nt.value; save(); });
    bN.appendChild(nt);
    right.appendChild(bN);
  }

  // ---------- onglet Options ----------
  function buildOptions(pane) {
    var cols = el("div", "pc-cols2");
    var colA = el("div", "pc-col");
    var colB = el("div", "pc-col");
    cols.appendChild(colA);
    cols.appendChild(colB);
    pane.appendChild(cols);

    // ---- jets ----
    var bJ = block("Jets");
    var de = el("input", "de");
    de.type = "text";
    de.value = state.de || "1d100";
    de.addEventListener("input", function () { state.de = de.value || "1d100"; save(); });
    hooks.push(function () { if (document.activeElement !== de) de.value = state.de || "1d100"; });
    bJ.appendChild(fld("Dé des jets de test", de));
    colA.appendChild(bJ);

    // ---- modificateurs de caractéristiques (hors limite : au-delà de 80, sous 0) ----
    // équipement, art et décisions du MJ confondus : UN modificateur par
    // caractéristique, appliqué au total affiché sur la Fiche
    var bM = block("Modificateurs de caractéristiques");
    CHAMPS.forEach(function (name) {
      if (!DATA.caracs.some(function (cc) { return cc.name === name; })) return;
      var row = el("div", "pc-kv");
      var chip = el("span", "pc-abbr", ABBR[name] || name);
      chip.title = name;
      row.appendChild(chip);
      row.appendChild(stepper(
        function () { return state.caracsMod[name] || 0; },
        function (v) { state.caracsMod[name] = clamp(v, -999, 999); },
        CARAC_PAS, "modificateur"));
      row.appendChild(el("span", "sp"));
      var tot = el("span", "max", "");
      hooks.push(function () { tot.textContent = "total : " + caracTotal(name); });
      row.appendChild(tot);
      bM.appendChild(row);
    });
    colA.appendChild(bM);

    // ---- création ----
    var bC = block("Création");
    var slRow = el("div", "pc-kv");
    var slBox = el("input");
    slBox.type = "checkbox";
    slBox.id = "pc-sanslimite";
    slBox.checked = !!state.sansLimite;
    slBox.addEventListener("change", function () { state.sansLimite = slBox.checked; refresh(); });
    hooks.push(function () { slBox.checked = !!state.sansLimite; });
    var slLab = el("label", null, "Sans limite : plafond de " + CARAC_MAX + " levé (avantage ou décision du MJ)");
    slLab.setAttribute("for", "pc-sanslimite");
    slRow.appendChild(slBox);
    slRow.appendChild(slLab);
    bC.appendChild(slRow);
    colA.appendChild(bC);

    // ---- modificateurs de compétences ----
    // le pendant du bloc caractéristiques : UN modificateur par compétence
    // (équipement, art, décision du MJ confondus), appliqué au total de la
    // ligne sur la Fiche. Rebâti quand les compétences perso changent
    // (optCompsRebuild, rappelé par l'ajout et la suppression) ; optHooks
    // remplace hooks pour ces lignes, sinon chaque rebâti fuirait des hooks.
    var bMC = block("Modificateurs de compétences");
    // mêmes outils que la liste de la Fiche (filtre texte, champ, « Investies
    // seulement ») et mêmes lignes : la grille pc-comp-row aligne nom | ± | total.
    var mcTools = el("div", "pc-comp-tools");
    var mcLine1 = el("div", "row");
    var mcSearch = el("input", "pc-comp-search");
    mcSearch.type = "search";
    mcSearch.placeholder = "Filtrer…";
    mcSearch.value = optFilter;
    mcSearch.addEventListener("input", function () { optFilter = mcSearch.value; optCompsRebuild(); });
    mcLine1.appendChild(mcSearch);
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
    mcTools.appendChild(mcLine1);
    var mcLine2 = el("div", "row");
    var mcPerso = el("span", "pc-chip");
    mcPerso.textContent = "Compétences personnalisées";
    mcPerso.title = "Décoché : seules les compétences de base du jeu sont affichées.";
    mcPerso.classList.toggle("on", optPerso);
    mcPerso.addEventListener("click", function () {
      optPerso = !optPerso;
      mcPerso.classList.toggle("on", optPerso);
      optCompsRebuild();
    });
    mcLine2.appendChild(mcPerso);
    var mcOnly = el("span", "pc-chip");
    mcOnly.textContent = "Investies seulement";
    mcOnly.classList.toggle("on", optOnly);
    mcOnly.addEventListener("click", function () {
      optOnly = !optOnly;
      mcOnly.classList.toggle("on", optOnly);
      optCompsRebuild();
    });
    mcLine2.appendChild(mcOnly);
    mcTools.appendChild(mcLine2);
    bMC.appendChild(mcTools);
    var mcBox = el("div");
    bMC.appendChild(mcBox);
    optCompsRebuild = function () {
      optHooks = [];
      mcBox.innerHTML = "";
      var flt = optFilter.trim().toLowerCase();
      var shown = 0;
      CHAMPS.forEach(function (carac) {
        if (optChamp && optChamp !== carac) return;
        var items = allComps().filter(function (it) { return it.carac === carac; });
        if (!optPerso) items = items.filter(function (it) { return !it.custom; });
        if (flt) items = items.filter(function (it) { return it.name.toLowerCase().indexOf(flt) >= 0; });
        if (optOnly) items = items.filter(compInvestie);
        items.sort(function (a, b) { return a.name.localeCompare(b.name, "fr", { sensitivity: "base" }); });
        if (!items.length) return;
        mcBox.appendChild(el("div", "pc-comp-champ", carac));
        items.forEach(function (it, i) {
          shown++;
          var row = el("div", "pc-comp-row" + (i % 2 === 1 ? " odd" : ""));
          var nameBox = el("span", "pc-comp-name");
          var label = el("span", "pc-comp-label", it.name);
          label.title = it.name + " (" + it.carac + ")";
          nameBox.appendChild(label);
          row.appendChild(nameBox);
          row.appendChild(stepper(
            function () { return state.compsMod[it.key] || 0; },
            function (v) {
              v = clamp(v, -999, 999);
              if (v) state.compsMod[it.key] = v;
              else delete state.compsMod[it.key];   // zéro = pas d'entrée dans l'état
            },
            CARAC_PAS, "modificateur", optHooks));
          var tot = el("span", "pc-comp-total", "");
          optHooks.push(function () {
            var d = state.compsMod[it.key] || 0;
            var c = state.comps[it.key] || blankComp();
            tot.textContent = sign(compValue(it.carac, c, it.key));
            tot.classList.toggle("zero", !c.stade && !d);
            tot.classList.toggle("adj", d !== 0);
            tot.title = it.carac + " " + sign(caracTotal(it.carac)) +
                        " · stade " + sign(stadeInfo(c.stade).bonus) +
                        (d ? " · modificateur " + sign(d) : "");
          });
          row.appendChild(tot);
          mcBox.appendChild(row);
        });
      });
      if (!shown) {
        mcBox.appendChild(el("div", "pc-empty",
          optOnly ? "Aucune compétence investie ne correspond — décocher « Investies seulement » pour toutes les voir."
                  : "Aucune compétence ne correspond."));
      }
      refresh();   // les lignes viennent de naître : leurs totaux se peuplent ici
    };
    optCompsRebuild();
    colB.appendChild(bMC);

    // ---- affichage (fiche dans Roll20 seulement) ----
    // window.__jjkNight n'existe que sous roll20-fiche.html (posé par
    // jjk-roll20-boot.js) : sur le site, le bouton d'en-tête gère déjà la nuit.
    // Préférence locale au navigateur (pas dans l'état : réglage d'affichage,
    // pas de personnage) ; "auto" suit le mode jour/nuit de ROLL20 (indice
    // n=1/0 posé par l'extension 2.0.3+ ; repli navigateur sans indice).
    if (window.__jjkNight) {
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
      colB.appendChild(bAff);
    }

    // ---- actions sur la fiche (exporter / importer / réinitialiser) ----
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
    colB.appendChild(bAct);
  }

  // ---------- montage ----------
  function mount(root) {
    rootEl = root;
    hooks = [];
    compHooks = [];
    optHooks = [];
    optCompsRebuild = null;
    root.innerHTML = "";
    var app = el("div", "perso-atelier");
    appEl = app;

    buildTop(app);
    var sheet = el("div", "pc-sheet");
    app.appendChild(sheet);
    root.appendChild(app);

    buildHead(sheet);
    var panes = buildTabs(sheet);
    buildFiche(panes.fiche);
    buildArt(panes.art);
    buildEquipement(panes.equipement);
    buildBio(panes.bio);
    buildOptions(panes.options);
    refresh();
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
    if (DATA) { state = load() || blank(); mount(root); return; }
    fetch(siteBase() + "jjk-creation.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) { DATA = d; state = load() || blank(); mount(root); })
      .catch(function (e) {
        root.innerHTML = '<p style="padding:2rem;color:#b0402c">Le créateur n\'a pas pu charger ses données (' + e.message + ").</p>";
      });
  }

  if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
