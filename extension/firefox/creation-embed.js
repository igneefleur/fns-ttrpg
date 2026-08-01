/* GÉNÉRÉ par build_extension.py — NE PAS ÉDITER. */
/* jjk-creation.js du site, enveloppé pour que son `localStorage` pointe vers
   le shim de l'iframe (persistance -> Attributes Roll20). Le paramètre masque
   le global sur toute la source ; aucune ligne de jjk-creation.js n'est
   modifiée. */
;(function (localStorage) {
/* Créateur de personnage JJK — onglet « Création » du site.
 *
 * Mise en page « dossier » transposée du créateur HxH : barre d'outils avec la
 * bibliothèque, feuille à largeur fixe, en-tête portrait + identité, compteurs
 * de budgets, trois onglets (Fiche / Équipement / Bio), colonnes, valeurs
 * cliquables pour lancer les jets, journal de jets flottant.
 *
 * Le contenu des règles (caractéristiques, listes de compétences, stades,
 * vitesses, difficultés, blessures, courbes d'armes/armures, actions) vient de
 * jjk-creation.json, généré au build par hooks/jjk_creation.py depuis la page
 * de règles. Ce fichier porte la sémantique d'interface et les règles de
 * calcul prosaïques :
 *   - création : 120 points à répartir dans les 3 caractéristiques (0 à 80) ;
 *   - 500 xp à la création (total modifiable) ; 20 xp par stade de compétence
 *     (Non initié, Initié, Maitre, Expert), 20 xp par +5 de caractéristique
 *     (limite 80 sans avantage) ; au stade Expert, 20 xp par technique ;
 *   - pas plus d'un quart de l'xp total investi dans une seule compétence ;
 *   - PV max = (20 + Body) / 2 ; récupération Body/10 PV par jour ;
 *   - jet = 1d100 + caractéristique (+ bonus de stade pour une compétence) ;
 *     96+ au dé : coup critique ; 5 ou moins : échec critique.
 *
 * Persistance : localStorage « jjk-perso » (état), « jjk-cards » (cartes
 * calculées, _current = brouillon), « jjk-persos » (bibliothèque). Clés
 * préfixées jjk- : le site partage son origine avec le site HxH.
 *
 * Dans Roll20 (iframe de l'extension), creator-boot.js pose :
 *   - window.__jjkLocalStorage : persistance -> Attributes Roll20 ;
 *   - window.__jjkRoll : les jets partent dans le tchat Roll20 ;
 *   - window.__jjkCompact : masque la barre d'outils et la bibliothèque.
 */
(function () {
  "use strict";

  var COMPACT = typeof window !== "undefined" && window.__jjkCompact === true;
  var DATA = null;
  var state = null;

  var XP_CREATION = 500;      // xp de départ (le total reste modifiable)
  var PTS_CREATION = 120;     // points de caractéristiques à la création
  var CARAC_MAX = 80;         // limite sans avantage
  var CARAC_PAS = 5;          // +5 par achat d'xp
  var QUART = 4;              // « pas plus d'un quart de l'xp total »

  var ABBR = { Mind: "MIND", Body: "BODY", Prestance: "PRÉS" };

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
      xpTotal: XP_CREATION,
      comps: {}, customComps: [],
      pv: null, narration: 3,
      armes: [], armures: [], inventaire: "",
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
    ["Mind", "Body", "Prestance"].forEach(function (c) {
      s.caracsBase[c] = clamp(num(s.caracsBase[c], 0), 0, 999);
      s.caracsXp[c] = clamp(num(s.caracsXp[c], 0), 0, 99);
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
      c.stade = clamp(num(c.stade, 0), 0, DATA ? DATA.stades.length - 1 : 3);
      // migration : les « passifs » d'avant s'appellent désormais « techniques »
      if (!Array.isArray(c.techniques)) c.techniques = Array.isArray(c.passifs) ? c.passifs : [];
      delete c.passifs;
      c.techniques = c.techniques.map(function (p) { return p == null ? "" : String(p); });
      // migration : noms de compétences capitalisés (« Body/apnée » -> « Body/Apnée »)
      var i = k.indexOf("/");
      comps[i > 0 ? k.slice(0, i + 1) + capFirst(k.slice(i + 1)) : k] = c;
    });
    s.comps = comps;
    s.xpTotal = Math.max(0, num(s.xpTotal, XP_CREATION));
    s.narration = clamp(num(s.narration, 3), 0, 99);
    s.pv = (s.pv === null || s.pv === undefined || s.pv === "") ? null : parseFloat(s.pv);
    if (s.pv !== null && !isFinite(s.pv)) s.pv = null;
    return s;
  }

  // ---------- calculs ----------
  function caracTotal(c) {
    var v = state.caracsBase[c] + CARAC_PAS * state.caracsXp[c];
    return state.sansLimite ? v : Math.min(v, CARAC_MAX);
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
  function pvMax() {
    var v = (20 + caracTotal("Body")) / 2;
    return Math.round(v * 10) / 10;
  }
  function pvCourant() { return state.pv === null ? pvMax() : state.pv; }
  function regen() {
    // « Body/10 PV par jour », sans arrondi (les PV acceptent les demi-points)
    return Math.round(caracTotal("Body") / 10 * 10) / 10;
  }
  function vitesse() {
    var b = caracTotal("Body");
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
    try { localStorage.setItem("jjk-perso", JSON.stringify(state)); }
    catch (e) {
      if (!saveWarned) {
        saveWarned = true;
        flash("Impossible d'enregistrer (stockage plein ou bloqué) : exporter la fiche en JSON.");
      }
    }
    var cards;
    try { cards = JSON.parse(localStorage.getItem("jjk-cards")) || {}; } catch (e) { cards = {}; }
    var card = computeCard();
    card.id = "_current";
    cards._current = card;
    try { localStorage.setItem("jjk-cards", JSON.stringify(cards)); } catch (e) {}
  }
  function load() {
    try { return normalize(JSON.parse(localStorage.getItem("jjk-perso"))); }
    catch (e) { return null; }
  }
  function curTab() { try { return localStorage.getItem("jjk-tab") || "fiche"; } catch (e) { return "fiche"; } }
  function setTab(id) { try { localStorage.setItem("jjk-tab", id); } catch (e) {} }

  // bibliothèque (site seulement : dans Roll20, une fiche par personnage)
  var PKEY = "jjk-persos";
  function loadPersos() { try { var a = JSON.parse(localStorage.getItem(PKEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function savePersos(a) {
    try { localStorage.setItem(PKEY, JSON.stringify(a)); } catch (e) {}
    var cards;
    try { cards = JSON.parse(localStorage.getItem("jjk-cards")) || {}; } catch (e) { cards = {}; }
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
    try { localStorage.setItem("jjk-cards", JSON.stringify(keep)); } catch (e) {}
  }

  // ---------- jets ----------
  // Les dés se jettent dans Roll20 : creator-boot.js pose window.__jjkRoll et le
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
        det = "coup critique, le dé devient 100 — +1 point de narration";
      } else if (dice[0] <= 5) {
        total = 0 + d.plus + value;
        det = "échec critique, le dé devient 0 — +1 point de narration au MJ";
      }
    }
    flash(label + " : " + total + " (" + det + ")");
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
      var nm = el("span", "nm", c.desc);
      nm.title = c.desc;
      top.appendChild(nm);
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
    pvIn.type = "number"; pvIn.step = "0.5";
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
        if (!stadeInfo(target).techniques) next.techniques = [];
        var delta = compXp(next) - compXp(c);
        if (delta > 0 && xpRestant() < delta) { flash("XP insuffisant."); return; }
        // le plafond du quart ne bloque que les HAUSSES : on peut toujours redescendre
        if (delta > 0 && compXp(next) > compCap()) {
          flash("Pas plus d'un quart de l'xp total (" + compCap() + " xp) dans une seule compétence.");
          return;
        }
        state.comps[item.key] = next;
        if (!next.stade && !next.techniques.length) delete state.comps[item.key];
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
      c.techniques.forEach(function (p, i) {
        var line = el("div", "pc-technique");
        var inp = el("input");
        inp.type = "text"; inp.placeholder = "Technique"; inp.value = p;
        inp.addEventListener("input", function () { c.techniques[i] = inp.value; state.comps[item.key] = c; save(); });
        line.appendChild(inp);
        line.appendChild(miniBtn("✕", "Retirer cette technique", function () {
          c.techniques.splice(i, 1); state.comps[item.key] = c; refresh(); renderTechs();
        }, "danger"));
        tech.appendChild(line);
      });
      tech.appendChild(miniBtn("+ technique (" + DATA.xpParStade + " xp)", null, function () {
        var test = { stade: c.stade, techniques: c.techniques.concat([""]) };
        var delta = compXp(test) - compXp(c);
        if (delta > 0 && xpRestant() < delta) { flash("XP insuffisant."); return; }
        if (compXp(test) > compCap()) { flash("Pas plus d'un quart de l'xp total (" + compCap() + " xp) dans une seule compétence."); return; }
        c.techniques.push(""); state.comps[item.key] = c; refresh(); renderTechs();
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
  function rebuildComps() {
    if (!compBox) return;
    compHooks = [];   // les lignes vont être détruites : leurs hooks avec
    compBox.innerHTML = "";
    var flt = compFilter.trim().toLowerCase();
    ["Mind", "Body", "Prestance"].forEach(function (carac) {
      var items = allComps().filter(function (it) { return it.carac === carac; });
      if (flt) items = items.filter(function (it) { return it.name.toLowerCase().indexOf(flt) >= 0; });
      var champ = el("div", "pc-comp-champ", carac);
      compBox.appendChild(champ);
      if (!items.length) {
        compBox.appendChild(el("div", "pc-empty", flt ? "Aucune compétence ne correspond." : "—"));
      } else {
        var head = el("div", "pc-comp-row head");
        head.appendChild(el("span", null, "Compétence"));
        head.appendChild(el("span", null, "Total"));
        compBox.appendChild(head);
        items.forEach(function (it, i) { compBox.appendChild(compRow(it, i % 2 === 1)); });
      }
      // ajout d'une compétence personnalisée (les listes des règles sont ouvertes : « … »)
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
      compBox.appendChild(addRow);
    });
    refresh();
  }
  function buildComps(col) {
    var b = block("Compétences");
    var search = el("input", "pc-comp-search");
    search.type = "search";
    search.placeholder = "Filtrer les compétences…";
    search.addEventListener("input", function () { compFilter = search.value; rebuildComps(); });
    b.appendChild(search);
    compBox = el("div");
    b.appendChild(compBox);
    col.appendChild(b);
    rebuildComps();
  }

  function buildFiche(pane) {
    var cols = el("div", "pc-cols-fiche");
    var left = el("div", "pc-col");
    var right = el("div", "pc-col");
    cols.appendChild(left);
    cols.appendChild(right);
    pane.appendChild(cols);
    buildCaracs(left);
    buildCombat(left);
    buildComps(right);
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
        head.appendChild(miniBtn("✕", "Retirer", function () { items.splice(idx, 1); render(); refresh(); }, "danger"));
        card.appendChild(head);

        var line = el("div", "pc-arme-line");
        line.appendChild(eqField("Poids", it, "poids"));
        if (kind === "arme") {
          line.appendChild(eqField("Dégâts (5D10)", it, "degats"));
          line.appendChild(eqField("Reach", it, "reach"));
        } else {
          line.appendChild(eqField("Invu (5D8)", it, "invu"));
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
    right.appendChild(bB);

    var bI = block("Inventaire");
    var inv = el("textarea", "pc-notes");
    inv.rows = 5;
    inv.placeholder = "Une ligne par objet…";
    inv.value = state.inventaire || "";
    inv.addEventListener("input", function () { state.inventaire = inv.value; save(); });
    bI.appendChild(inv);
    right.appendChild(bI);
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
    defIn.placeholder = "« Je me perds tout le temps comme Zoro »";
    defIn.value = state.defaut || "";
    defIn.addEventListener("input", function () { state.defaut = defIn.value; save(); });
    g.appendChild(fld("Défaut (comique)", defIn, "c12"));
    [0, 1].forEach(function (qi) {
      var qIn = el("textarea", "pc-notes");
      qIn.rows = 3;
      qIn.value = state.qualites[qi] || "";
      qIn.addEventListener("input", function () { state.qualites[qi] = qIn.value; save(); });
      g.appendChild(fld("Qualité " + (qi + 1), qIn, "c6"));
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

})(window.__jjkLocalStorage || window.localStorage);
