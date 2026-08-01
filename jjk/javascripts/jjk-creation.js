/* Créateur de personnage JJK — onglet « Création » du site.
 *
 * Mise en page « dossier » transposée du créateur HxH : barre d'outils avec la
 * bibliothèque, feuille à largeur fixe, en-tête portrait + identité, compteurs
 * de budgets, onglets (Fiche / Art / Équipement / Bio / Options), colonnes,
 * valeurs cliquables pour lancer les jets, journal de jets flottant.
 * La Fiche range les compétences en trois colonnes (Body | Mind | Prestance) ;
 * l'onglet Art porte un art libre par compétence au stade Artiste.
 *
 * Le contenu des règles (caractéristiques, listes de compétences, stades,
 * vitesses, difficultés, blessures, courbes d'armes/armures, actions) vient de
 * jjk-creation.json, généré au build par hooks/jjk_creation.py depuis la page
 * de règles. Ce fichier porte la sémantique d'interface et les règles de
 * calcul prosaïques :
 *   - création : 120 points à répartir dans les 3 caractéristiques (0 à 80) ;
 *   - 500 xp à la création (total modifiable) ; 20 xp par stade de compétence
 *     (Non initié, Initié, Maitre, Expert, Artiste), 20 xp par +5 de
 *     caractéristique (limite 80 sans avantage) ; dès le stade Expert, 20 xp
 *     par technique ; dès le stade Artiste, un art par compétence (sans coût) ;
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
  function nowStamp() { return new Date().toISOString(); }
  function sign(n) { return n >= 0 ? "+" + n : String(n).replace("-", "−"); }
  // les compétences commencent toujours par une majuscule (« apnée » -> « Apnée »)
  function capFirst(t) { t = String(t == null ? "" : t); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }

  // ---------- état ----------
  function blank() {
    return {
      v: 1,
      name: "", portrait: "", age: "", genre: "",
      defaut: "", qualites: ["", ""], background: "", notes: "",
      avantages: [], sansLimite: false,
      caracsBase: { Mind: 0, Body: 0, Prestance: 0 },
      caracsXp: { Mind: 0, Body: 0, Prestance: 0 },
      caracsMod: { Mind: 0, Body: 0, Prestance: 0 },
      xpTotal: XP_CREATION,
      comps: {}, customComps: [],
      pv: null, narration: 3,
      armes: [], armures: [], inventaire: "",
      inv: { texte: [], groupes: ["Sur soi"], objets: [] },
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
    ["Mind", "Body", "Prestance"].forEach(function (c) {
      s.caracsBase[c] = clamp(num(s.caracsBase[c], 0), 0, 999);
      s.caracsXp[c] = clamp(num(s.caracsXp[c], 0), 0, 99);
      s.caracsMod[c] = clamp(num(s.caracsMod[c], 0), -999, 999);
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
      // migration : les « passifs » d'avant s'appellent désormais « techniques »,
      // et une technique est un objet {name, desc} (l'ancien texte simple
      // devient le nom, description vide)
      if (!Array.isArray(c.techniques)) c.techniques = Array.isArray(c.passifs) ? c.passifs : [];
      delete c.passifs;
      c.techniques = c.techniques.map(function (p) {
        if (p && typeof p === "object") return { name: String(p.name || ""), desc: String(p.desc || "") };
        return { name: p == null ? "" : String(p), desc: "" };
      });
      // l'art du stade Artiste : {name, desc} ; un art resté vide s'efface
      if (c.art && typeof c.art === "object") {
        c.art = { name: String(c.art.name || ""), desc: String(c.art.desc || "") };
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
    if (!Array.isArray(s.inv.groupes)) s.inv.groupes = [];
    s.inv.groupes = s.inv.groupes.map(function (g) {
      g = g == null ? "" : String(g).trim();
      return g || "Groupe";
    });
    if (!s.inv.groupes.length) s.inv.groupes = ["Sur soi"];
    s.inv.objets = objArray(s.inv.objets).map(function (it) {
      return {
        nom: it.nom == null ? "" : String(it.nom),
        qte: Math.max(0, num(it.qte, 1)),
        poids: pnum(it.poids),
        img: it.img == null ? "" : String(it.img),
        desc: it.desc == null ? "" : String(it.desc),
        groupe: clamp(num(it.groupe, 0), 0, s.inv.groupes.length - 1)
      };
    });
    // migration : l'ancien inventaire en texte libre (une ligne par objet)
    // devient des lignes de la liste, quantité 1 et poids 0
    if (s.inventaire && typeof s.inventaire === "string" && !s.inv.texte.length) {
      s.inventaire.split(/\r?\n/).forEach(function (line) {
        line = line.trim();
        if (line) s.inv.texte.push({ nom: line, qte: 1, poids: 0, compte: true });
      });
      s.inventaire = "";
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
    // le modificateur (onglet Options) s'applique APRÈS le plafond : il peut
    // porter le total au-delà de 80 comme en dessous de 0
    return v + (state.caracsMod[c] || 0);
  }
  function stadeInfo(i) { return DATA.stades[clamp(i, 0, DATA.stades.length - 1)]; }
  function compXp(c) {
    var xp = DATA.xpParStade * c.stade;
    if (stadeInfo(c.stade).techniques) xp += DATA.xpParStade * c.techniques.length;
    return xp;
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
  function pvMax() { return Math.floor((20 + caracTotal("Body")) / 2); }
  function pvCourant() { return state.pv === null ? pvMax() : state.pv; }
  function regen() { return Math.max(0, Math.floor(caracTotal("Body") / 10)); }
  function vitesse() {
    var b = Math.max(0, caracTotal("Body"));   // un Body négatif reste au 1er palier
    var rows = DATA.vitesses || [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (b >= r.min && (r.max === null || b <= r.max)) return r.vitesse;
    }
    return rows.length ? rows[rows.length - 1].vitesse : "";
  }
  function compValue(carac, comp) {
    return caracTotal(carac) + stadeInfo(comp ? comp.stade : 0).bonus;
  }
  function blankComp() { return { stade: 0, techniques: [] }; }
  function allComps() {
    var out = [];
    ["Mind", "Body", "Prestance"].forEach(function (c) {
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
  function sayChat(title, fields) {
    var clean = (fields || []).filter(function (f) { return f && String(f[1] || "").trim(); });
    if (typeof window !== "undefined" && typeof window.__jjkSay === "function") {
      window.__jjkSay(title, clean);
      return;
    }
    flash(title + (clean.length
      ? " — " + clean.map(function (f) { return f[0] + " : " + f[1]; }).join(" · ")
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
  function refresh() {
    save();
    hooks.forEach(function (f) { try { f(); } catch (e) {} });
    compHooks.forEach(function (f) { try { f(); } catch (e) {} });
  }
  // Remplacement d'état COMPLET (import, bibliothèque, nouveau personnage) :
  // toutes les sections tiennent des références sur l'ancien état, on remonte
  // donc la fiche entière depuis le nouvel état.
  var rootEl = null;
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
  // stepper −/champ/+ : le champ du milieu est éditable (pc-num)
  function stepper(get, set, step, title) {
    var w = el("span", "pc-step");
    w.appendChild(stepBtn("−", title ? "− " + step : null, function () { set(get() - step); refresh(); }));
    var i = el("input", "pc-num");
    i.type = "number";
    i.value = get();
    i.addEventListener("input", function () {
      var v = parseInt(i.value, 10);
      if (isFinite(v)) { set(v); refresh(); }
    });
    hooks.push(function () { if (document.activeElement !== i) i.value = get(); });
    w.appendChild(i);
    w.appendChild(stepBtn("+", title ? "+ " + step : null, function () { set(get() + step); refresh(); }));
    return w;
  }
  function block(title, small) {
    var b = el("div", "pc-block");
    var t = el("div", "pc-block-title", title);
    if (small) t.appendChild(el("small", null, small));
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
  function buildHead(sheet) {
    var head = el("div", "pc-head");

    var brand = el("div", "pc-brand");
    var img = el("img", "pc-portrait");
    img.alt = "";
    hooks.push(function () {
      var want = state.portrait || "";
      if (img.getAttribute("src") !== want) {
        if (want) img.src = want;
        else img.removeAttribute("src");
      }
    });
    brand.appendChild(img);
    var pBtn = el("button", "pc-portrait-btn", "changer le portrait");
    pBtn.type = "button";
    pBtn.addEventListener("click", function () {
      var url = prompt("URL de l'image du portrait :", state.portrait || "");
      if (url === null) return;
      state.portrait = url.trim();
      refresh();
    });
    brand.appendChild(pBtn);
    brand.appendChild(el("span", "b1", "JJK"));
    brand.appendChild(el("span", "b2", "Système JDR"));
    head.appendChild(brand);

    var id = el("div", "pc-id");
    id.appendChild(fld("Nom", textInput(function () { return state.name; }, function (v) { state.name = v; }, "Nom du personnage"), "c6"));
    id.appendChild(fld("Âge", textInput(function () { return state.age; }, function (v) { state.age = v; }), "c3"));
    id.appendChild(fld("Genre", textInput(function () { return state.genre; }, function (v) { state.genre = v; }), "c3"));
    var xpIn = el("input", null);
    xpIn.type = "number"; xpIn.min = 0; xpIn.step = 5;
    xpIn.value = state.xpTotal;
    xpIn.addEventListener("input", function () {
      var v = parseInt(xpIn.value, 10);
      if (isFinite(v)) { state.xpTotal = Math.max(0, v); refresh(); }
    });
    hooks.push(function () { if (document.activeElement !== xpIn) xpIn.value = state.xpTotal; });
    id.appendChild(fld("XP total", xpIn, "c3"));
    var pvRo = el("span", "pc-ro", "");
    hooks.push(function () { pvRo.textContent = pvCourant() + " / " + pvMax(); });
    id.appendChild(fld("PV", pvRo, "c3"));
    var vRo = el("span", "pc-ro", "");
    hooks.push(function () { vRo.textContent = vitesse(); });
    id.appendChild(fld("Vitesse", vRo, "c3"));
    var nRo = el("span", "pc-ro", "");
    hooks.push(function () { nRo.textContent = String(state.narration); });
    id.appendChild(fld("Narration", nRo, "c3"));
    head.appendChild(id);
    sheet.appendChild(head);

    // compteurs de budgets
    var meters = el("div", "pc-meters");
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
    meters.appendChild(meter("Création", ptsCreation, function () { return PTS_CREATION; }));
    meters.appendChild(meter("XP dépensé", xpDepense, function () { return state.xpTotal; }));
    sheet.appendChild(meters);

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
    var b = block("Caractéristiques");
    DATA.caracs.forEach(function (c) {
      var name = c.name;
      var row = el("div", "pc-crow");
      var top = el("div", "pc-crow-top");
      var chip = el("span", "pc-abbr", ABBR[name] || name);
      chip.title = name;
      top.appendChild(chip);
      top.appendChild(el("span", "nm", name));
      var val = el("span", "pc-cval pc-rollable", "");
      val.title = "Lancer 1d100 + " + name;
      val.addEventListener("click", function () { doRoll(name, caracTotal(name), null, true); });
      top.appendChild(val);
      row.appendChild(top);

      var bot = el("div", "pc-crow-bot");
      bot.appendChild(el("span", "lbl", "Création"));
      bot.appendChild(stepper(
        function () { return state.caracsBase[name]; },
        function (v) {
          var max = state.sansLimite ? 999 : CARAC_MAX;
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
        if (!state.sansLimite && caracTotal(name) + CARAC_PAS > CARAC_MAX) { flash("Limite de " + CARAC_MAX + " atteinte (sans avantage)."); return; }
        state.caracsXp[name]++;
        refresh();
      }));
      bot.appendChild(xpStep);
      row.appendChild(bot);

      hooks.push(function () {
        val.textContent = String(caracTotal(name));
        cnt.textContent = String(state.caracsXp[name]);
      });
      b.appendChild(row);
    });
    col.appendChild(b);
  }

  function buildCombat(col) {
    var b = block("Combat");

    var tiles = el("div", "pc-bigrow");
    tiles.appendChild(bigTile("Vitesse", vitesse));
    tiles.appendChild(bigTile("Régén / jour", regen));
    var xpTile = bigTile("XP restant", xpRestant);
    hooks.push(function () { xpTile.classList.toggle("red", xpRestant() < 0); });
    tiles.appendChild(xpTile);
    b.appendChild(tiles);

    // PV
    var pvRow = el("div", "pc-kv");
    pvRow.appendChild(el("span", "k", "PV"));
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
    hooks.push(function () { pvM.textContent = "/ " + pvMax(); });
    pvRow.appendChild(pvM);
    pvRow.appendChild(el("span", "sp"));
    pvRow.appendChild(miniBtn("Max", "Revenir au maximum", function () { state.pv = null; refresh(); }));
    b.appendChild(pvRow);

    // narration
    var nRow = el("div", "pc-kv");
    nRow.appendChild(el("span", "k", "Narration"));
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
      var del = el("button", "pc-comp-del", "✕");
      del.type = "button";
      del.title = "Retirer cette compétence personnalisée";
      del.addEventListener("click", function () {
        state.customComps = state.customComps.filter(function (cc) { return (cc.carac + "/" + cc.name) !== item.key; });
        delete state.comps[item.key];
        refresh();
        rebuildComps();
      });
      nameBox.appendChild(del);
    }
    row.appendChild(nameBox);

    var total = el("span", "pc-comp-total pc-rollable", "");
    total.title = "Lancer 1d100 + " + item.carac + " + stade";
    total.addEventListener("click", function () {
      doRoll(item.name + " (" + item.carac + ")", compValue(item.carac, comp()), null, true);
    });
    row.appendChild(total);

    // stades : une pastille par stade, cliquable ; recliquer le stade courant
    // revient à Non initié. Le coût se règle tout seul.
    var st = el("div", "pc-stades");
    DATA.stades.forEach(function (sd, i) {
      var pill = el("button", "pc-stade", sd.nom);
      pill.type = "button";
      pill.title = sd.nom + " (" + sign(sd.bonus) + ") — " + (DATA.xpParStade * i) + " xp";
      pill.addEventListener("click", function () {
        var c = comp();
        var target = (i === c.stade) ? 0 : i;
        var next = { stade: target, techniques: c.techniques.slice() };
        // l'art suit la compétence : il survit aux allers-retours de stade
        // (il ne s'affiche que quand le stade qui l'ouvre est atteint)
        if (c.art && (String(c.art.name || "").trim() || String(c.art.desc || "").trim())) next.art = c.art;
        if (!stadeInfo(target).techniques) next.techniques = [];
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
        renderTechs();
      });
      st.appendChild(pill);
    });
    row.appendChild(st);
    function renderStades() {
      var c = comp();
      Array.prototype.forEach.call(st.children, function (pill, i) {
        pill.classList.toggle("on", i > 0 && i <= c.stade);
        pill.classList.toggle("cur", i === c.stade && c.stade > 0);
      });
    }

    var tech = el("div", "pc-techniques");
    row.appendChild(tech);
    function renderTechs() {
      var c = comp();
      tech.innerHTML = "";
      if (!stadeInfo(c.stade).techniques) return;
      c.techniques.forEach(function (t, i) {
        var card = el("div", "pc-av pc-technique");
        var head = el("div", "pc-av-head");
        var nm = el("input", "nm");
        nm.type = "text"; nm.placeholder = "Nom"; nm.value = t.name || "";
        nm.addEventListener("input", function () { t.name = nm.value; state.comps[item.key] = c; save(); });
        head.appendChild(nm);
        head.appendChild(chatBtn(
          function () { return "Technique — " + (t.name || item.name); },
          function () { return [["Compétence", item.name], ["Effet", t.desc]]; }));
        head.appendChild(miniBtn("✕", "Retirer cette technique", function () {
          c.techniques.splice(i, 1); state.comps[item.key] = c; refresh(); renderTechs();
        }, "danger"));
        card.appendChild(head);
        var d = el("textarea", "pc-notes");
        d.rows = 3;
        d.placeholder = "Effet";
        d.value = t.desc || "";
        d.addEventListener("input", function () { t.desc = d.value; state.comps[item.key] = c; save(); });
        card.appendChild(d);
        tech.appendChild(card);
      });
      tech.appendChild(miniBtn("+ technique (" + DATA.xpParStade + " xp)", null, function () {
        var test = { stade: c.stade, techniques: c.techniques.concat([{ name: "", desc: "" }]) };
        var delta = compXp(test) - compXp(c);
        if (delta > 0 && xpRestant() < delta) { flash("XP insuffisant."); return; }
        if (compXp(test) > compCap()) { flash("Pas plus d'un quart de l'xp total (" + compCap() + " xp) dans une seule compétence."); return; }
        c.techniques.push({ name: "", desc: "" }); state.comps[item.key] = c; refresh(); renderTechs();
      }));
    }

    compHooks.push(function () {
      var c = comp();
      var v = compValue(item.carac, c);
      total.textContent = sign(v);
      total.classList.toggle("zero", !c.stade);
      renderStades();
    });
    renderStades();
    renderTechs();
    return row;
  }

  var compBox = null;
  var compFilter = "";
  var compChamp = "";           // "" = tous les champs ; "Personnalisé" = comps perso
  var compOnly = COMPACT;       // fiche condensée (Roll20) : investies seulement par défaut
  var compAddMode = false;      // les champs d'ajout n'apparaissent que sur demande
  function compInvestie(it) {
    var c = state.comps[it.key];
    return !!(c && (c.stade > 0 || (c.techniques && c.techniques.length)));
  }
  // les trois colonnes de compétences de la Fiche, dans cet ordre
  var CHAMPS = ["Body", "Mind", "Prestance"];
  function rebuildComps() {
    if (!compBox) return;
    compHooks = [];   // les lignes vont être détruites : leurs hooks avec
    compBox.innerHTML = "";
    var flt = compFilter.trim().toLowerCase();
    CHAMPS.forEach(function (carac) {
      if (compChamp && compChamp !== "Personnalisé" && compChamp !== carac) return;
      var items = allComps().filter(function (it) { return it.carac === carac; });
      if (compChamp === "Personnalisé") items = items.filter(function (it) { return it.custom; });
      if (flt) items = items.filter(function (it) { return it.name.toLowerCase().indexOf(flt) >= 0; });
      if (compOnly) items = items.filter(compInvestie);
      // ordre alphabétique (français, accents ignorés), comps perso intercalées
      items.sort(function (a, b) { return a.name.localeCompare(b.name, "fr", { sensitivity: "base" }); });
      if (compChamp === "Personnalisé" && !items.length && !compAddMode) return;
      var col = el("div", "pc-comp-col");
      compBox.appendChild(col);
      var champ = el("div", "pc-comp-champ", carac);
      col.appendChild(champ);
      if (!items.length) {
        col.appendChild(el("div", "pc-empty",
          flt ? "Aucune compétence ne correspond." : compOnly ? "Aucune compétence investie." : "—"));
      } else {
        var head = el("div", "pc-comp-row head");
        head.appendChild(el("span", null, "Compétence"));
        head.appendChild(el("span", null, "Total"));
        col.appendChild(head);
        items.forEach(function (it, i) { col.appendChild(compRow(it, i % 2 === 1)); });
      }
      // ajout d'une compétence personnalisée (les listes des règles sont
      // ouvertes : « … ») — seulement quand « + Compétence perso » est activé
      if (!compAddMode) return;
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
        inp.value = "";
        refresh();
        rebuildComps();
      }));
      col.appendChild(addRow);
    });
    refresh();
  }
  function buildComps(col) {
    var b = block("Compétences");
    // mêmes outils que la fiche HxH : filtre texte, filtre de champ, puce
    // « Investies seulement », puce « + Compétence perso »
    var tools = el("div", "pc-comp-tools");
    var search = el("input", "pc-comp-search");
    search.type = "search";
    search.placeholder = "Filtrer les compétences…";
    search.addEventListener("input", function () { compFilter = search.value; rebuildComps(); });
    tools.appendChild(search);
    var champSel = el("select", "pc-select");
    ["Tous les champs", "Body", "Mind", "Prestance", "Personnalisé"].forEach(function (ch) {
      var o = el("option");
      o.value = ch === "Tous les champs" ? "" : ch;
      o.textContent = ch;
      champSel.appendChild(o);
    });
    champSel.value = compChamp;
    champSel.addEventListener("change", function () { compChamp = champSel.value; rebuildComps(); });
    tools.appendChild(champSel);
    var onlyChip = el("span", "pc-chip");
    onlyChip.textContent = "Investies seulement";
    onlyChip.classList.toggle("on", compOnly);
    onlyChip.addEventListener("click", function () {
      compOnly = !compOnly;
      onlyChip.classList.toggle("on", compOnly);
      rebuildComps();
    });
    tools.appendChild(onlyChip);
    var addChip = el("span", "pc-chip");
    addChip.textContent = "+ Compétence perso";
    addChip.title = "Afficher un champ d'ajout de compétence personnalisée sous chaque champ.";
    addChip.classList.toggle("on", compAddMode);
    addChip.addEventListener("click", function () {
      compAddMode = !compAddMode;
      addChip.classList.toggle("on", compAddMode);
      rebuildComps();
    });
    tools.appendChild(addChip);
    b.appendChild(tools);
    compBox = el("div", "pc-comp-cols");
    b.appendChild(compBox);
    col.appendChild(b);
    rebuildComps();
  }

  function buildFiche(pane) {
    // caractéristiques et combat côte à côte, puis les compétences en pleine
    // largeur, rangées en trois colonnes (Body | Mind | Prestance)
    var cols = el("div", "pc-cols2");
    var left = el("div", "pc-col");
    var right = el("div", "pc-col");
    cols.appendChild(left);
    cols.appendChild(right);
    pane.appendChild(cols);
    buildCaracs(left);
    buildCombat(right);
    buildComps(pane);
  }

  // ---------- onglet Art ----------
  // Un art par compétence arrivée au stade qui l'ouvre (Artiste) : nom et
  // description libres, envoi au tchat. Aucun contenu de règles ici : la carte
  // ne porte que les données du personnage. La liste se reconstruit seulement
  // quand l'ensemble des compétences éligibles change (pas à chaque frappe).
  function artComps() {
    return allComps().filter(function (it) {
      var c = state.comps[it.key];
      return !!(c && stadeInfo(c.stade).art);
    });
  }
  function artStadeNom() {
    for (var i = 0; i < DATA.stades.length; i++) if (DATA.stades[i].art) return DATA.stades[i].nom;
    return null;
  }
  function buildArt(pane) {
    var b = block("Arts");
    var box = el("div", "pc-arts");
    b.appendChild(box);
    pane.appendChild(b);

    function artCard(it) {
      var c = state.comps[it.key];
      if (!c.art) c.art = { name: "", desc: "" };   // créé au premier affichage
      var a = c.art;
      var card = el("div", "pc-av pc-art");

      var top = el("div", "pc-art-top");
      var chip = el("span", "pc-abbr", ABBR[it.carac] || it.carac);
      chip.title = it.carac;
      top.appendChild(chip);
      top.appendChild(el("span", "pc-art-comp", it.name));
      card.appendChild(top);

      var head = el("div", "pc-av-head");
      var nm = el("input", "nm");
      nm.type = "text"; nm.placeholder = "Nom de l'art"; nm.value = a.name || "";
      nm.addEventListener("input", function () { a.name = nm.value; save(); });
      head.appendChild(nm);
      head.appendChild(chatBtn(
        function () { return "Art — " + (a.name || it.name); },
        function () { return [["Compétence", it.name + " (" + it.carac + ")"], ["Description", a.desc]]; }));
      head.appendChild(miniBtn("✕", "Effacer cet art", function () {
        delete c.art;
        refresh();
        render();
      }, "danger"));
      card.appendChild(head);

      var d = el("textarea", "pc-notes");
      d.rows = 5;
      d.placeholder = "Description de l'art : principes, effets, limites…";
      d.value = a.desc || "";
      d.addEventListener("input", function () { a.desc = d.value; save(); });
      card.appendChild(d);
      return card;
    }

    function render() {
      box.innerHTML = "";
      var items = artComps();
      if (!items.length) {
        var nom = artStadeNom();
        box.appendChild(el("div", "pc-empty",
          nom ? "Aucune compétence au stade " + nom + "." : "Aucune compétence n'ouvre d'art."));
        return;
      }
      items.forEach(function (it) { box.appendChild(artCard(it)); });
    }

    // reconstruire seulement quand la liste des compétences éligibles change :
    // les frappes dans les champs (save sans refresh) ne détruisent pas le focus
    var lastSig = null;
    hooks.push(function () {
      var sig = artComps().map(function (it) { return it.key; }).join("|");
      if (sig !== lastSig) { lastSig = sig; render(); }
    });
  }

  // ---------- onglet Équipement ----------
  function eqField(labelTxt, obj, key, wide) {
    var i = el("input");
    i.type = "text";
    i.placeholder = labelTxt;
    i.value = obj[key] || "";
    i.addEventListener("input", function () { obj[key] = i.value; save(); });
    return fld(labelTxt, i, wide ? "w" : null);
  }
  function eqArea(labelTxt, obj, key, rows) {
    var t = el("textarea", "pc-notes");
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
  function eqCards(box, items, kind) {
    // kind : "arme" (poids/dégâts/reach/propriétés) ou "armure" (poids/invu/zones)
    function render() {
      box.innerHTML = "";
      items.forEach(function (it, idx) {
        var card = el("div", "pc-arme");
        var head = el("div", "pc-arme-head");
        var nm = el("input", "nm");
        nm.type = "text";
        nm.placeholder = kind === "arme" ? "Nom de l'arme" : "Nom de l'armure";
        nm.value = it.nom || "";
        nm.addEventListener("input", function () { it.nom = nm.value; save(); });
        head.appendChild(nm);
        head.appendChild(chatBtn(
          function () { return (kind === "arme" ? "Arme — " : "Armure — ") + (it.nom || (kind === "arme" ? "arme" : "armure")); },
          function () {
            return kind === "arme"
              ? [["Poids", it.poids], ["Dégâts", it.degats], ["Reach", it.reach], ["Propriétés", it.props]]
              : [["Poids", it.poids], ["Invu", it.invu], ["Zones protégées", it.zones]];
          }));
        head.appendChild(miniBtn("✕", "Retirer", function () { items.splice(idx, 1); render(); refresh(); }, "danger"));
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
      });
      box.appendChild(add);
    }
    render();
  }
  // ---------- inventaire : liste (nom / poids / quantité) ----------
  // Transposition de l'inventaire texte de l'ancienne extension Roll20 de
  // l'utilisateur : lignes réordonnables, case « compter le poids » par ligne,
  // total du poids porté. Poids en kg, décimales au point.
  function invTexte(container) {
    var items = state.inv.texte;
    var box = el("div", "pc-inv");
    var tot = el("div", "pc-inv-total");
    var dragIdx = null;

    function totalTexte() {
      var t = 0;
      items.forEach(function (it) { if (it.compte) t += it.qte * it.poids; });
      return t;
    }
    function updateTotal() { tot.textContent = "Poids porté : " + fmtP(totalTexte()) + " kg"; }

    function render() {
      box.innerHTML = "";
      var hdr = el("div", "pc-inv-row hdr");
      hdr.appendChild(el("span", "h g", ""));
      hdr.appendChild(el("span", "h g", ""));
      hdr.appendChild(el("span", "h nm", "Objet"));
      var hp = el("span", "h n", "Poids");
      hp.title = "En kilogrammes";
      hdr.appendChild(hp);
      hdr.appendChild(el("span", "h n", "Qté"));
      hdr.appendChild(el("span", "h g", ""));
      box.appendChild(hdr);

      items.forEach(function (it, idx) {
        var row = el("div", "pc-inv-row");

        var handle = el("span", "pc-inv-handle", "⠿");
        handle.title = "Glisser pour réordonner";
        handle.addEventListener("mousedown", function () {
          row.draggable = true;
          // un clic sans glisser ne doit pas laisser la ligne draggable : sous
          // Firefox, un ancêtre draggable casse la sélection dans les champs
          document.addEventListener("mouseup", function () { row.draggable = false; }, { once: true });
        });
        row.addEventListener("dragstart", function (e) {
          dragIdx = idx;
          row.classList.add("drag");
          try { e.dataTransfer.setData("text/plain", ""); e.dataTransfer.effectAllowed = "move"; } catch (err) {}
        });
        row.addEventListener("dragend", function () { row.draggable = false; dragIdx = null; render(); });
        row.addEventListener("dragover", function (e) {
          if (dragIdx === null || dragIdx === idx) return;
          e.preventDefault();
          var r = row.getBoundingClientRect();
          var before = e.clientY < r.top + r.height / 2;
          row.classList.toggle("over-top", before);
          row.classList.toggle("over-bot", !before);
        });
        row.addEventListener("dragleave", function () { row.classList.remove("over-top", "over-bot"); });
        row.addEventListener("drop", function (e) {
          if (dragIdx === null || dragIdx === idx) return;
          e.preventDefault();
          var r = row.getBoundingClientRect();
          var before = e.clientY < r.top + r.height / 2;
          var moved = items.splice(dragIdx, 1)[0];
          var at = items.indexOf(it);
          items.splice(before ? at : at + 1, 0, moved);
          dragIdx = null;
          render();
          refresh();
        });
        row.appendChild(handle);

        var tog = el("span", "pc-inv-tog" + (it.compte ? " on" : ""));
        tog.title = "Compter ce poids dans le total (décocher : objet posé ou porté par un autre)";
        tog.addEventListener("click", function () {
          it.compte = !it.compte;
          tog.classList.toggle("on", it.compte);
          save(); updateTotal();
        });
        row.appendChild(tog);

        var nm = el("input", "nm");
        nm.type = "text";
        nm.placeholder = "Objet";
        nm.value = it.nom;
        nm.addEventListener("input", function () { it.nom = nm.value; save(); });
        row.appendChild(nm);

        var pd = el("input", "n");
        pd.type = "text"; pd.inputMode = "decimal";
        pd.value = it.poids ? fmtP(it.poids) : "";
        pd.placeholder = "0";
        pd.addEventListener("input", function () { it.poids = pnum(pd.value); save(); updateTotal(); });
        pd.addEventListener("blur", function () { pd.value = it.poids ? fmtP(it.poids) : ""; });
        row.appendChild(pd);

        var qt = el("input", "n");
        qt.type = "number"; qt.min = "0"; qt.step = "1";
        qt.value = it.qte;
        qt.addEventListener("input", function () {
          var v = parseInt(qt.value, 10);
          it.qte = isFinite(v) && v >= 0 ? v : 0;
          save(); updateTotal();
        });
        row.appendChild(qt);

        var del = miniBtn("✕", "Retirer", function () { items.splice(idx, 1); render(); refresh(); }, "danger pc-inv-del");
        row.appendChild(del);
        box.appendChild(row);
      });
      if (!items.length) box.appendChild(el("div", "pc-empty", "Aucun objet."));
      box.appendChild(miniBtn("+ Ajouter un objet", null, function () {
        items.push({ nom: "", qte: 1, poids: 0, compte: true });
        render();
        refresh();
      }, "pc-inv-add"));
      updateTotal();
    }
    render();
    container.appendChild(box);
    container.appendChild(tot);
  }

  // ---------- inventaire : objets illustrés (tuiles par groupes + panneau) ----------
  // Transposition de l'inventaire à images : tuiles par groupes (Sur soi,
  // Sacoche…), clic -> panneau de détail (image, quantité, poids, groupe,
  // description, envoi au tchat), glisser-déposer entre groupes. Les images
  // importées d'un fichier sont réduites en vignette pour tenir dans la fiche
  // (et dans les Attributes Roll20) ; préférer une URL quand c'est possible.
  function invObjets(container) {
    var G = state.inv.groupes;
    var items = state.inv.objets;
    var sel = null;          // index dans items de l'objet affiché au panneau
    var dragIdx = null;
    var editGi = null;       // groupe à ouvrir en édition de nom au prochain render
    var tileRefs = {};       // idx -> { tile, nom, badge } pour maj sans re-render

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
    function updateTotal() { tot.textContent = "Poids total des objets : " + fmtP(totalObjets()) + " kg"; }

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
      var foot = el("div", "pc-obj-foot");
      var nom = el("span", "nm", it.nom || "Objet");
      foot.appendChild(nom);
      var badge = el("span", "qte", "×" + it.qte);
      foot.appendChild(badge);
      t.appendChild(foot);
      tileRefs[idx] = { tile: t, nom: nom, badge: badge };

      t.addEventListener("click", function () { sel = idx; render(); });
      t.draggable = true;
      t.addEventListener("dragstart", function (e) {
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
        t.classList.add("over");
      });
      t.addEventListener("dragleave", function () { t.classList.remove("over"); });
      t.addEventListener("drop", function (e) {
        if (dragIdx === null) return;
        if (dragIdx === idx) { e.stopPropagation(); return; }
        e.preventDefault();
        e.stopPropagation();
        var from = dragIdx; dragIdx = null;
        moveTo(from, it.groupe, it);
        render();
        refresh();
      });
      return t;
    }

    function groupBox(gi) {
      var g = el("div", "pc-obj-group");
      var head = el("div", "pc-obj-ghead");
      var name = el("span", "nm", G[gi]);
      name.title = "Double-clic : renommer le groupe";
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
      name.addEventListener("dblclick", editName);
      head.appendChild(name);
      if (editGi === gi) { editGi = null; editName(); }
      if (G.length > 1) {
        var delG = el("button", "x", "✕");
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
      items.forEach(function (it, idx) { if (it.groupe === gi) tiles.appendChild(tile(it, idx)); });
      var add = el("div", "pc-obj-addtile", "+");
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
        panel.appendChild(el("div", "pc-obj-empty", "Choisir un objet, ou en ajouter un avec « + »."));
        return;
      }
      var it = items[sel];
      var refs = function () { return tileRefs[sel]; };

      var imgbox = el("div", "pc-obj-imgbox");
      if (it.img) { var im = el("img"); im.alt = ""; im.src = it.img; imgbox.appendChild(im); }
      else imgbox.appendChild(el("div", "pc-obj-ph big", "?"));
      panel.appendChild(imgbox);

      var body = el("div", "pc-obj-body");

      var nm = el("input", "nm");
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
      var qIn = el("input", "n");
      qIn.type = "number"; qIn.min = "0"; qIn.step = "1";
      qIn.value = it.qte;
      function setQte(v) {
        it.qte = isFinite(v) && v >= 0 ? Math.floor(v) : 0;
        if (+slider.max < it.qte) slider.max = String(it.qte);
        if (document.activeElement !== slider) slider.value = it.qte;
        if (document.activeElement !== qIn) qIn.value = it.qte;
        if (refs()) refs().badge.textContent = "×" + it.qte;
        save(); updateTotal();
      }
      slider.addEventListener("input", function () { setQte(parseInt(slider.value, 10)); });
      qIn.addEventListener("input", function () { setQte(parseInt(qIn.value, 10)); });
      qRow.appendChild(slider);
      qRow.appendChild(qIn);
      body.appendChild(fld("Quantité", qRow));

      var pair = el("div", "pc-obj-pair");
      var pd = el("input");
      pd.type = "text"; pd.inputMode = "decimal";
      pd.value = it.poids ? fmtP(it.poids) : "";
      pd.placeholder = "0";
      pd.addEventListener("input", function () { it.poids = pnum(pd.value); save(); updateTotal(); });
      pd.addEventListener("blur", function () { pd.value = it.poids ? fmtP(it.poids) : ""; });
      pair.appendChild(fld("Poids (kg)", pd));
      var gSel = el("select");
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

      var url = el("input");
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
      urlFld.appendChild(miniBtn("Fichier…", "Importer une image (réduite en vignette 96 px)", function () { file.click(); }));
      body.appendChild(urlFld);

      var desc = el("textarea", "pc-notes");
      desc.rows = 3;
      desc.placeholder = "Description, effets, notes…";
      desc.value = it.desc;
      desc.addEventListener("input", function () { it.desc = desc.value; save(); });
      body.appendChild(fld("Description", desc, "w"));

      var actions = el("div", "pc-obj-actions");
      actions.appendChild(chatBtn(
        function () { return "Objet — " + (it.nom || "objet"); },
        function () {
          return [
            ["Groupe", G[it.groupe]],
            ["Quantité", String(it.qte)],
            ["Poids", it.poids ? fmtP(it.poids) + " kg" + (it.qte > 1 ? " (total " + fmtP(it.qte * it.poids) + " kg)" : "") : ""],
            ["Description", it.desc]
          ];
        }));
      actions.appendChild(miniBtn("Retirer", "Retirer l'objet", function () {
        items.splice(sel, 1);
        sel = null;
        render();
        refresh();
      }, "danger"));
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
      });
      addG.classList.add("pc-obj-addgroup");
      leftBox.appendChild(addG);
      renderPanel();
      updateTotal();
    }
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

    var bA = block("Armes");
    var boxA = el("div");
    bA.appendChild(boxA);
    eqCards(boxA, state.armes, "arme");
    left.appendChild(bA);

    var bB = block("Armures");
    var boxB = el("div");
    bB.appendChild(boxB);
    eqCards(boxB, state.armures, "armure");
    left.appendChild(bB);

    var bI = block("Inventaire", "quantités et poids");
    invTexte(bI);
    right.appendChild(bI);

    var bO = block("Objets", "inventaire illustré");
    invObjets(bO);
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

    var bP = block("Personnalité");
    var g = el("div", "pc-id");
    var defIn = el("textarea", "pc-notes");
    defIn.rows = 3;
    defIn.value = state.defaut || "";
    defIn.addEventListener("input", function () { state.defaut = defIn.value; save(); });
    var defFld = fld("Défaut", defIn, "c12");
    defFld.appendChild(chatBtn(
      function () { return "Défaut" + (state.name ? " — " + state.name : ""); },
      function () { return [["Défaut", state.defaut]]; }));
    g.appendChild(defFld);
    [0, 1].forEach(function (qi) {
      var qIn = el("textarea", "pc-notes");
      qIn.rows = 3;
      qIn.value = state.qualites[qi] || "";
      qIn.addEventListener("input", function () { state.qualites[qi] = qIn.value; save(); });
      var qFld = fld("Qualité " + (qi + 1), qIn, "c6");
      qFld.appendChild(chatBtn(
        function () { return "Qualité " + (qi + 1) + (state.name ? " — " + state.name : ""); },
        function () { return [["Qualité", state.qualites[qi]]]; }));
      g.appendChild(qFld);
    });
    bP.appendChild(g);
    left.appendChild(bP);

    var bA = block("Avantages");
    var avBox = el("div");
    bA.appendChild(avBox);
    function renderAv() {
      avBox.innerHTML = "";
      state.avantages.forEach(function (a, i) {
        var card = el("div", "pc-av");
        var head = el("div", "pc-av-head");
        var n = el("input", "nm");
        n.type = "text"; n.placeholder = "Nom"; n.value = a.name || "";
        n.addEventListener("input", function () { a.name = n.value; save(); });
        head.appendChild(n);
        head.appendChild(chatBtn(
          function () { return "Avantage — " + (a.name || "sans nom"); },
          function () { return [["Effet", a.desc]]; }));
        head.appendChild(miniBtn("✕", "Retirer", function () { state.avantages.splice(i, 1); renderAv(); refresh(); }, "danger"));
        card.appendChild(head);
        var d = el("textarea", "pc-notes");
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
      }));
    }
    renderAv();
    left.appendChild(bA);

    var bB = block("Background");
    var bg = el("textarea", "pc-notes");
    bg.rows = 9;
    bg.value = state.background || "";
    bg.addEventListener("input", function () { state.background = bg.value; save(); });
    bB.appendChild(bg);
    right.appendChild(bB);

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
    var bM = block("Modificateurs de caractéristiques");
    DATA.caracs.forEach(function (c) {
      var name = c.name;
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
    root.innerHTML = "";
    var app = el("div", "perso-atelier");

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
