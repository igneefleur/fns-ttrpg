/* Créateur de personnage JJK — onglet « Création » du site.
 *
 * Le contenu des règles (caractéristiques, listes de compétences, stades,
 * vitesses, difficultés, blessures, courbes d'armes/armures) vient de
 * jjk-creation.json, généré au build par hooks/jjk_creation.py depuis la page
 * de règles. Ce fichier porte la sémantique d'interface et les règles de
 * calcul prosaïques :
 *   - création : 120 points à répartir dans les 3 caractéristiques (0 à 80) ;
 *   - 500 xp à la création (total modifiable) ; 20 xp par stade de compétence,
 *     20 xp par +5 de caractéristique (limite 80 sans avantage) ; au stade Art,
 *     20 xp par passif supplémentaire ;
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
 *   - window.__jjkCompact : masque la bibliothèque (une fiche par personnage).
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
    s.armes = objArray(s.armes);
    s.armures = objArray(s.armures);
    if (typeof s.comps !== "object" || !s.comps) s.comps = {};
    Object.keys(s.comps).forEach(function (k) {
      var c = s.comps[k];
      if (!c || typeof c !== "object") c = {};
      c.stade = clamp(num(c.stade, 0), 0, DATA ? DATA.stades.length - 1 : 4);
      if (!Array.isArray(c.passifs)) c.passifs = [];
      c.passifs = c.passifs.map(function (p) { return p == null ? "" : String(p); });
      s.comps[k] = c;
    });
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
  function caracMax() { return state.sansLimite ? 9999 : CARAC_MAX; }
  function stadeInfo(i) { return DATA.stades[clamp(i, 0, DATA.stades.length - 1)]; }
  function compXp(c) {
    var xp = DATA.xpParStade * c.stade;
    if (stadeInfo(c.stade).passif) xp += DATA.xpParStade * Math.max(0, c.passifs.length - 1);
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
  function ptsCreationRestants() {
    return PTS_CREATION - (state.caracsBase.Mind + state.caracsBase.Body + state.caracsBase.Prestance);
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
  function allComps() {
    // [{key, name, carac, custom}] : compétences des règles + personnalisées
    var out = [];
    ["Body", "Mind", "Prestance"].forEach(function (c) {
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
  var rollHistory = [];
  var rollPanel = null;
  function parseDice(expr) {
    var m = /^(\d{1,2})d(\d{1,4})([+-]\d{1,4})?$/i.exec(String(expr || "").replace(/\s/g, ""));
    if (!m) return null;   // expression illisible : doRoll prévient au lieu de lancer autre chose
    return { n: clamp(+m[1], 1, 20), faces: clamp(+m[2], 2, 1000), plus: +(m[3] || 0) };
  }
  function bestDifficulty(total) {
    var best = null;
    (DATA.difficultes || []).forEach(function (d) {
      if (total >= d.seuil && (!best || d.seuil > best.seuil)) best = d;
    });
    return best;
  }
  // isCheck : vrai pour un jet de test (carac/compétence) — seuls ces jets
  // critent (96+/5-) et se lisent sur la table des difficultés. Les jets
  // d'équipement (dégâts, invu) restent des dés bruts.
  function doRoll(label, value, die, isCheck) {
    die = die || state.de || "1d100";
    // Dans Roll20 (creator-boot.js pose window.__jjkRoll), le jet part dans le
    // TCHAT Roll20 — Roll20 lance les dés, résultat visible de tous. Sur le
    // site, __jjkRoll n'existe pas : jet local dans le journal.
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
    // 96+ au dé : coup critique (le résultat au d100 devient 100) ; 5 ou moins :
    // échec critique (il devient 0). Les modificateurs (d.plus, valeur) restent.
    var crit = null;
    if (isCheck && d.n === 1 && d.faces === 100) {
      if (dice[0] >= 96) { crit = "crit"; total = 100 + d.plus + value; }
      else if (dice[0] <= 5) { crit = "fumble"; total = 0 + d.plus + value; }
    }
    rollHistory.unshift({
      label: label, dice: dice, sum: sum, value: value, total: total,
      crit: crit, palier: (isCheck && d.n === 1 && d.faces === 100) ? bestDifficulty(total) : null
    });
    if (rollHistory.length > 30) rollHistory.pop();
    renderRolls(true);
  }
  function renderRolls(open) {
    if (!rollPanel) return;
    var list = rollPanel.querySelector(".pc-rolls-list");
    list.innerHTML = "";
    if (open) rollPanel.classList.add("open");
    rollHistory.forEach(function (r) {
      var li = el("div", "pc-roll" + (r.crit === "crit" ? " crit" : r.crit === "fumble" ? " fumble" : ""));
      var head = el("div", "pc-roll-head");
      head.appendChild(el("span", "pc-roll-label", r.label));
      head.appendChild(el("span", "pc-roll-total", String(r.total)));
      li.appendChild(head);
      var det = "dé " + r.dice.join(" + ") + (r.value ? " " + (r.value >= 0 ? "+ " : "− ") + Math.abs(r.value) : "");
      if (r.crit === "crit") det += " — coup critique (le dé devient 100), +1 point de narration";
      if (r.crit === "fumble") det += " — échec critique (le dé devient 0), +1 point de narration au MJ";
      if (r.palier) det += " — atteint « " + r.palier.nom + " » (" + r.palier.seuil + ")";
      li.appendChild(el("div", "pc-roll-det", det));
      list.appendChild(li);
    });
    if (!rollHistory.length) list.appendChild(el("div", "pc-roll-det", "Aucun jet pour l'instant."));
  }

  // ---------- refresh (recalcul des zones dynamiques) ----------
  // hooks : fonctions appelées à chaque changement d'état. Remises à zéro à
  // chaque mount() (navigation instantanée comprise) pour ne pas s'accumuler.
  // compHooks : hooks des lignes de compétences, vidés par rebuildComps()
  // (les lignes sont détruites et recréées à chaque reconstruction).
  var hooks = [];
  var compHooks = [];
  function refresh() {
    save();
    hooks.forEach(function (f) { try { f(); } catch (e) {} });
    compHooks.forEach(function (f) { try { f(); } catch (e) {} });
  }
  // Remplacement d'état COMPLET (import, bibliothèque, nouveau personnage) :
  // toutes les sections tiennent des références sur l'ancien état (listEditor,
  // avantages…), on remonte donc la fiche entière depuis le nouvel état.
  var rootEl = null;
  function remount() { if (rootEl) mount(rootEl); }

  // ---------- briques d'interface ----------
  function field(labelTxt, input, cls) {
    var w = el("label", "pc-field" + (cls ? " " + cls : ""));
    w.appendChild(el("span", "pc-field-label", labelTxt));
    w.appendChild(input);
    return w;
  }
  function textInput(get, set, placeholder) {
    var i = el("input", "pc-input");
    i.type = "text";
    if (placeholder) i.placeholder = placeholder;
    i.value = get() || "";
    i.addEventListener("input", function () { set(i.value); refresh(); });
    hooks.push(function () { if (document.activeElement !== i) i.value = get() || ""; });
    return i;
  }
  function areaInput(get, set, placeholder, rows) {
    var i = el("textarea", "pc-input pc-area");
    i.rows = rows || 3;
    if (placeholder) i.placeholder = placeholder;
    i.value = get() || "";
    i.addEventListener("input", function () { set(i.value); refresh(); });
    hooks.push(function () { if (document.activeElement !== i) i.value = get() || ""; });
    return i;
  }
  function numInput(get, set, min, max, step) {
    var i = el("input", "pc-input pc-num");
    i.type = "number";
    if (min != null) i.min = min;
    if (max != null) i.max = max;
    i.step = step || 1;
    i.value = get();
    i.addEventListener("input", function () { set(i.value); refresh(); });
    hooks.push(function () { if (document.activeElement !== i) i.value = get(); });
    return i;
  }
  function miniBtn(txt, title, fn) {
    var b = el("button", "pc-mini", txt);
    b.type = "button";
    if (title) b.title = title;
    b.addEventListener("click", fn);
    return b;
  }
  function section(parent, title, hint) {
    var s = el("section", "pc-section");
    var h = el("h2", "pc-h2", title);
    s.appendChild(h);
    if (hint) s.appendChild(el("p", "pc-hint", hint));
    parent.appendChild(s);
    return s;
  }
  function flash(msg) {
    var f = document.querySelector(".pc-flash") || el("div", "pc-flash");
    f.textContent = msg;
    document.body.appendChild(f);
    f.classList.add("on");
    setTimeout(function () { f.classList.remove("on"); }, 2600);
  }

  // ---------- en-tête ----------
  function buildHead(sheet) {
    var head = el("header", "pc-head");
    head.appendChild(el("h1", "pc-title", "Fiche JJK"));

    var idr = el("div", "pc-head-row");
    idr.appendChild(field("Nom", textInput(function () { return state.name; }, function (v) { state.name = v; }, "Nom du personnage"), "pc-grow"));
    idr.appendChild(field("Âge", textInput(function () { return state.age; }, function (v) { state.age = v; })));
    idr.appendChild(field("Genre", textInput(function () { return state.genre; }, function (v) { state.genre = v; })));
    head.appendChild(idr);

    var badges = el("div", "pc-badges");
    function badge(label, getTxt, getKo) {
      var b = el("div", "pc-badge");
      b.appendChild(el("span", "pc-badge-label", label));
      var v = el("span", "pc-badge-val", getTxt());
      b.appendChild(v);
      hooks.push(function () {
        v.textContent = getTxt();
        b.classList.toggle("ko", !!(getKo && getKo()));
      });
      return b;
    }
    badges.appendChild(badge("PV", function () { return pvCourant() + " / " + pvMax(); },
      function () { return pvCourant() <= 0; }));
    badges.appendChild(badge("Vitesse", function () { return vitesse(); }));
    badges.appendChild(badge("Narration", function () { return String(state.narration); }));
    badges.appendChild(badge("XP restant", function () { return xpRestant() + " / " + state.xpTotal; },
      function () { return xpRestant() < 0; }));
    head.appendChild(badges);
    sheet.appendChild(head);
  }

  // ---------- identité ----------
  function buildIdentite(sheet) {
    var s = section(sheet, "Identité",
      "À la création : 2 avantages au choix, 1 défaut comique et 2 qualités qui définissent le personnage.");
    var g = el("div", "pc-grid2");
    var portraitInput = textInput(function () { return state.portrait; }, function (v) { state.portrait = v; }, "https://…");
    portraitInput.addEventListener("change", function () { refresh(); });   // maj de l'aperçu au blur
    g.appendChild(field("Portrait (URL d'image)", portraitInput));
    g.appendChild(field("Défaut (comique)", textInput(function () { return state.defaut; }, function (v) { state.defaut = v; }, "« Je me perds tout le temps comme Zoro »")));
    g.appendChild(field("Qualité 1", textInput(function () { return state.qualites[0]; }, function (v) { state.qualites[0] = v; })));
    g.appendChild(field("Qualité 2", textInput(function () { return state.qualites[1]; }, function (v) { state.qualites[1] = v; })));
    s.appendChild(g);

    var img = el("img", "pc-portrait");
    img.alt = "";
    hooks.push(function () {
      // pas de requête à chaque frappe : l'aperçu attend la fin de la saisie,
      // et src n'est réassigné que s'il a réellement changé
      if (document.activeElement === portraitInput) return;
      if (state.portrait) {
        if (img.getAttribute("src") !== state.portrait) img.src = state.portrait;
        img.style.display = "";
      } else { img.removeAttribute("src"); img.style.display = "none"; }
    });
    s.appendChild(img);

    // avantages : liste libre (les règles n'en donnent pas de catalogue)
    var avT = el("h3", "pc-h3", "Avantages");
    s.appendChild(avT);
    var avBox = el("div", "pc-av-list");
    s.appendChild(avBox);
    function renderAv() {
      avBox.innerHTML = "";
      state.avantages.forEach(function (a, i) {
        var row = el("div", "pc-av");
        var n = el("input", "pc-input"); n.type = "text"; n.placeholder = "Avantage"; n.value = a.name || "";
        n.addEventListener("input", function () { a.name = n.value; save(); });
        var d = el("input", "pc-input pc-grow"); d.type = "text"; d.placeholder = "Effet (à définir avec le MJ)"; d.value = a.desc || "";
        d.addEventListener("input", function () { a.desc = d.value; save(); });
        row.appendChild(n); row.appendChild(d);
        row.appendChild(miniBtn("✕", "Retirer", function () { state.avantages.splice(i, 1); renderAv(); refresh(); }));
        avBox.appendChild(row);
      });
      var add = miniBtn("+ Ajouter un avantage", null, function () { state.avantages.push({ name: "", desc: "" }); renderAv(); refresh(); });
      add.className = "pc-add";
      avBox.appendChild(add);
    }
    renderAv();

    var lim = el("label", "pc-check");
    var cb = el("input"); cb.type = "checkbox"; cb.checked = !!state.sansLimite;
    cb.addEventListener("change", function () { state.sansLimite = cb.checked; refresh(); });
    lim.appendChild(cb);
    lim.appendChild(el("span", null, "Un avantage lève la limite de 80 des caractéristiques"));
    hooks.push(function () { cb.checked = !!state.sansLimite; });
    s.appendChild(lim);
  }

  // ---------- caractéristiques ----------
  function buildCaracs(sheet) {
    var s = section(sheet, "Caractéristiques",
      "À la création : " + PTS_CREATION + " points à répartir (0 à " + CARAC_MAX + " par caractéristique). "
      + "Ensuite : " + DATA.xpParStade + " xp pour monter une caractéristique de +" + CARAC_PAS
      + " (maximum " + CARAC_MAX + " sans avantage).");

    var xpRow = el("div", "pc-xp-row");
    xpRow.appendChild(field("XP total", numInput(function () { return state.xpTotal; },
      function (v) { state.xpTotal = Math.max(0, num(v, XP_CREATION)); }, 0, null, 5)));
    var spent = el("div", "pc-badge");
    spent.appendChild(el("span", "pc-badge-label", "Dépensé"));
    var spentV = el("span", "pc-badge-val", "");
    spent.appendChild(spentV);
    xpRow.appendChild(spent);
    var left = el("div", "pc-badge");
    left.appendChild(el("span", "pc-badge-label", "Restant"));
    var leftV = el("span", "pc-badge-val", "");
    left.appendChild(leftV);
    xpRow.appendChild(left);
    var crea = el("div", "pc-badge");
    crea.appendChild(el("span", "pc-badge-label", "Points de création"));
    var creaV = el("span", "pc-badge-val", "");
    crea.appendChild(creaV);
    xpRow.appendChild(crea);
    hooks.push(function () {
      spentV.textContent = String(xpDepense());
      leftV.textContent = String(xpRestant());
      leftV.parentNode.classList.toggle("ko", xpRestant() < 0);
      creaV.textContent = ptsCreationRestants() + " / " + PTS_CREATION;
      creaV.parentNode.classList.toggle("ko", ptsCreationRestants() < 0);
    });
    s.appendChild(xpRow);

    var g = el("div", "pc-caracs");
    DATA.caracs.forEach(function (c) {
      var name = c.name;
      var card = el("div", "pc-carac");
      var h = el("div", "pc-carac-head");
      h.appendChild(el("span", "pc-carac-name", name));
      var tot = el("span", "pc-carac-total", "");
      h.appendChild(tot);
      card.appendChild(h);
      card.appendChild(el("p", "pc-carac-desc", c.desc));

      var row = el("div", "pc-carac-row");
      row.appendChild(field("Création", numInput(
        function () { return state.caracsBase[name]; },
        function (v) {
          var val = clamp(num(v, 0), 0, 999);
          if (!state.sansLimite && val > CARAC_MAX) {
            flash("Maximum " + CARAC_MAX + " par caractéristique sans avantage.");
            val = CARAC_MAX;
          }
          state.caracsBase[name] = val;
        },
        0, null, 5)));
      var xpBox = el("div", "pc-field");
      xpBox.appendChild(el("span", "pc-field-label", "Achats d'xp (+" + CARAC_PAS + ")"));
      var xpCtl = el("div", "pc-stepper");
      var minus = miniBtn("−", "Rendre " + DATA.xpParStade + " xp", function () {
        if (state.caracsXp[name] > 0) { state.caracsXp[name]--; refresh(); }
      });
      var count = el("span", "pc-step-val", "");
      var plus = miniBtn("+", "Dépenser " + DATA.xpParStade + " xp", function () {
        if (xpRestant() < DATA.xpParStade) { flash("XP insuffisant."); return; }
        if (!state.sansLimite && caracTotal(name) + CARAC_PAS > CARAC_MAX) { flash("Limite de " + CARAC_MAX + " atteinte (sans avantage)."); return; }
        state.caracsXp[name]++;
        refresh();
      });
      xpCtl.appendChild(minus); xpCtl.appendChild(count); xpCtl.appendChild(plus);
      xpBox.appendChild(xpCtl);
      row.appendChild(xpBox);

      var jet = miniBtn("Jet", "1d100 + " + name, function () { doRoll(name, caracTotal(name), null, true); });
      jet.className = "pc-roll-btn";
      row.appendChild(jet);
      card.appendChild(row);

      hooks.push(function () {
        tot.textContent = String(caracTotal(name));
        count.textContent = String(state.caracsXp[name]);
      });
      g.appendChild(card);
    });
    s.appendChild(g);
  }

  // ---------- compétences ----------
  function compRow(item) {
    var comp = state.comps[item.key] || { stade: 0, passifs: [] };
    var row = el("div", "pc-comp");
    var top = el("div", "pc-comp-top");
    top.appendChild(el("span", "pc-comp-name", item.name));
    var val = el("span", "pc-comp-val", "");
    top.appendChild(val);
    var jet = miniBtn("Jet", null, function () {
      var c = state.comps[item.key] || { stade: 0, passifs: [] };
      doRoll(item.name + " (" + item.carac + ")", compValue(item.carac, c), null, true);
    });
    jet.className = "pc-roll-btn";
    top.appendChild(jet);
    if (item.custom) {
      top.appendChild(miniBtn("✕", "Retirer cette compétence", function () {
        state.customComps = state.customComps.filter(function (cc) { return (cc.carac + "/" + cc.name) !== item.key; });
        delete state.comps[item.key];
        refresh();
        rebuildComps();
      }));
    }
    row.appendChild(top);

    // stades : une pastille par stade, cliquable ; le coût se règle tout seul
    var st = el("div", "pc-stades");
    DATA.stades.forEach(function (sd, i) {
      var b = el("button", "pc-stade", sd.nom);
      b.type = "button";
      b.title = sd.nom + " (" + sign(sd.bonus) + (sd.passif ? ", passifs" : "") + ") — " + (DATA.xpParStade * i) + " xp";
      b.addEventListener("click", function () {
        var c = state.comps[item.key] || { stade: 0, passifs: [] };
        var target = (i === c.stade) ? 0 : i;   // recliquer le stade courant = revenir à Non initié
        var next = { stade: target, passifs: c.passifs.slice() };
        if (!stadeInfo(target).passif) next.passifs = [];
        var delta = compXp(next) - compXp(c);
        if (delta > 0 && xpRestant() < delta) { flash("XP insuffisant."); return; }
        // le plafond du quart ne bloque que les HAUSSES : on peut toujours redescendre
        if (delta > 0 && compXp(next) > compCap()) { flash("Pas plus d'un quart de l'xp total (" + compCap() + " xp) dans une seule compétence."); return; }
        state.comps[item.key] = next;
        if (!next.stade && !next.passifs.length) delete state.comps[item.key];
        refresh();
        renderStades();
        renderPassifs();
      });
      st.appendChild(b);
    });
    row.appendChild(st);

    var pas = el("div", "pc-passifs");
    row.appendChild(pas);

    function renderStades() {
      var c = state.comps[item.key] || { stade: 0, passifs: [] };
      Array.prototype.forEach.call(st.children, function (b, i) {
        b.classList.toggle("on", i <= c.stade && (i > 0 || c.stade > 0));
        b.classList.toggle("cur", i === c.stade);
      });
    }
    function renderPassifs() {
      var c = state.comps[item.key] || { stade: 0, passifs: [] };
      pas.innerHTML = "";
      if (!stadeInfo(c.stade).passif) return;
      c.passifs.forEach(function (p, i) {
        var chip = el("span", "pc-passif");
        var inp = el("input", "pc-input"); inp.type = "text"; inp.placeholder = "Passif original"; inp.value = p;
        inp.addEventListener("input", function () { c.passifs[i] = inp.value; state.comps[item.key] = c; save(); });
        chip.appendChild(inp);
        chip.appendChild(miniBtn("✕", "Retirer ce passif", function () {
          c.passifs.splice(i, 1); state.comps[item.key] = c; refresh(); renderPassifs();
        }));
        pas.appendChild(chip);
      });
      var cost = c.passifs.length ? DATA.xpParStade : 0;   // le 1er passif est inclus dans le stade Art
      var add = miniBtn("+ passif" + (cost ? " (" + cost + " xp)" : ""), null, function () {
        var test = { stade: c.stade, passifs: c.passifs.concat([""]) };
        var delta = compXp(test) - compXp(c);
        if (delta > 0 && xpRestant() < delta) { flash("XP insuffisant."); return; }
        if (compXp(test) > compCap()) { flash("Pas plus d'un quart de l'xp total (" + compCap() + " xp) dans une seule compétence."); return; }
        c.passifs.push(""); state.comps[item.key] = c; refresh(); renderPassifs();
      });
      add.className = "pc-add";
      pas.appendChild(add);
    }
    compHooks.push(function () {
      var c = state.comps[item.key] || { stade: 0, passifs: [] };
      val.textContent = sign(compValue(item.carac, c));
    });
    renderStades();
    renderPassifs();
    return row;
  }

  var compCols = null;
  function rebuildComps() {
    if (!compCols) return;
    compHooks = [];   // les lignes vont être détruites : leurs hooks avec
    ["Body", "Mind", "Prestance"].forEach(function (carac) {
      var col = compCols[carac];
      col.innerHTML = "";
      col.appendChild(el("h3", "pc-h3", carac));
      allComps().filter(function (it) { return it.carac === carac; }).forEach(function (it) {
        col.appendChild(compRow(it));
      });
      // ajout d'une compétence personnalisée (les listes des règles sont ouvertes : « … »)
      var addRow = el("div", "pc-comp-add");
      var inp = el("input", "pc-input"); inp.type = "text"; inp.placeholder = "Nouvelle compétence " + carac;
      addRow.appendChild(inp);
      addRow.appendChild(miniBtn("+", "Ajouter", function () {
        var name = inp.value.trim();
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
  function buildComps(sheet) {
    var s = section(sheet, "Compétences",
      "Stades : " + DATA.stades.map(function (sd) { return sd.nom + " " + sign(sd.bonus); }).join(", ")
      + ". Chaque stade coûte " + DATA.xpParStade + " xp ; jet = 1d100 + caractéristique + bonus de stade. "
      + "Pas plus d'un quart de l'xp total dans une seule compétence.");
    var cols = el("div", "pc-cols3");
    compCols = {};
    ["Body", "Mind", "Prestance"].forEach(function (c) {
      var col = el("div", "pc-col");
      compCols[c] = col;
      cols.appendChild(col);
    });
    s.appendChild(cols);
    rebuildComps();
  }

  // ---------- combat ----------
  function buildCombat(sheet) {
    var s = section(sheet, "Combat");
    var g = el("div", "pc-grid2");

    // PV
    var pvBox = el("div", "pc-block");
    pvBox.appendChild(el("h3", "pc-h3", "Points de vie"));
    var pvRow = el("div", "pc-pv-row");
    var pvIn = el("input", "pc-input pc-num");
    pvIn.type = "number"; pvIn.step = "0.5";
    pvIn.addEventListener("input", function () {
      var v = parseFloat(pvIn.value);
      state.pv = isFinite(v) ? v : null;
      refresh();
    });
    pvRow.appendChild(miniBtn("−", null, function () { state.pv = pvCourant() - 1; refresh(); }));
    pvRow.appendChild(pvIn);
    var pvMaxL = el("span", "pc-pv-max", "");
    pvRow.appendChild(pvMaxL);
    pvRow.appendChild(miniBtn("+", null, function () { state.pv = pvCourant() + 1; refresh(); }));
    pvRow.appendChild(miniBtn("Max", "Revenir au maximum", function () { state.pv = null; refresh(); }));
    pvBox.appendChild(pvRow);
    var pvInfo = el("p", "pc-hint", "");
    pvBox.appendChild(pvInfo);
    var seuils = el("div", "pc-seuils");
    pvBox.appendChild(seuils);
    hooks.push(function () {
      if (document.activeElement !== pvIn) pvIn.value = pvCourant();
      pvMaxL.textContent = "/ " + pvMax();
      pvInfo.textContent = "PV max = (20 + Body) / 2. Récupération : " + regen() + " PV par jour (Body/10).";
      seuils.innerHTML = "";
      seuils.appendChild(el("div", "pc-seuil", "Inconscience à 0 PV — mort à −" + pvMax() + " PV."));
      (DATA.blessures || []).forEach(function (b) {
        var abs = b.pct ? " (" + (Math.round(pvMax() * b.pct) / 100) + " PV)" : "";
        seuils.appendChild(el("div", "pc-seuil", b.nom + " : " + b.seuil + abs + " — " + b.effets.toLowerCase()));
      });
    });
    g.appendChild(pvBox);

    // narration + dé
    var nar = el("div", "pc-block");
    nar.appendChild(el("h3", "pc-h3", "Points de narration"));
    var narRow = el("div", "pc-pv-row");
    narRow.appendChild(miniBtn("−", null, function () { state.narration = Math.max(0, state.narration - 1); refresh(); }));
    var narV = el("span", "pc-nar-val", "");
    narRow.appendChild(narV);
    narRow.appendChild(miniBtn("+", null, function () { state.narration++; refresh(); }));
    narRow.appendChild(miniBtn("Nouvelle session", "Repartir à 3 points", function () { state.narration = 3; refresh(); }));
    nar.appendChild(narRow);
    nar.appendChild(el("p", "pc-hint",
      "3 points par session. Un seul point par jet ou confrontation : "
      + "Coup de Chance +25, Coup de Poker +50 ou +0, Coup du Destin (créer un aspect), Coup de Relance (relancer)."));
    var deRow = el("div", "pc-pv-row");
    deRow.appendChild(field("Dé", textInput(function () { return state.de; }, function (v) { state.de = v || "1d100"; }, "1d100")));
    nar.appendChild(deRow);

    // table des difficultés, pour lire un résultat
    var diff = el("table", "pc-table");
    var tb = el("tbody");
    (DATA.difficultes || []).forEach(function (d) {
      var tr = el("tr");
      tr.appendChild(el("td", null, String(d.seuil)));
      tr.appendChild(el("td", null, d.nom));
      tb.appendChild(tr);
    });
    diff.appendChild(tb);
    var diffWrap = el("details", "pc-details");
    var sum = el("summary", null, "Difficultés de tests");
    diffWrap.appendChild(sum);
    diffWrap.appendChild(diff);
    nar.appendChild(diffWrap);

    // aide-mémoire : l'économie d'actions du livre
    if ((DATA.actions || []).length) {
      var act = el("details", "pc-details");
      act.appendChild(el("summary", null, "Actions de combat"));
      DATA.actions.forEach(function (a) {
        act.appendChild(el("div", "pc-seuil", a.nom + " : " + a.desc));
      });
      nar.appendChild(act);
    }
    g.appendChild(nar);

    hooks.push(function () { narV.textContent = String(state.narration); });
    s.appendChild(g);
  }

  // ---------- équipement ----------
  function listEditor(box, items, cols, addLabel, rollOf) {
    // items : tableau d'objets ; cols : [{key, label, wide}] ; rollOf(item) -> {label, die} | null
    function render() {
      box.innerHTML = "";
      var headRow = el("div", "pc-eq pc-eq-head");
      cols.forEach(function (c) { headRow.appendChild(el("span", "pc-eq-cell" + (c.wide ? " pc-grow" : ""), c.label)); });
      headRow.appendChild(el("span", "pc-eq-cell pc-eq-tools", ""));
      if (items.length) box.appendChild(headRow);
      items.forEach(function (it, idx) {
        var row = el("div", "pc-eq");
        cols.forEach(function (c) {
          var i = el("input", "pc-input" + (c.wide ? " pc-grow" : ""));
          i.type = "text"; i.placeholder = c.label; i.value = it[c.key] || "";
          i.addEventListener("input", function () { it[c.key] = i.value; save(); });
          row.appendChild(i);
        });
        var tools = el("span", "pc-eq-tools");
        var r = rollOf && rollOf(it);
        if (r) tools.appendChild(miniBtn("Jet", r.title || null, function () {
          var rr = rollOf(it);
          if (rr && rr.die) doRoll(rr.label, 0, rr.die, false);   // dés bruts : pas de critique
          else flash("Renseigner d'abord les dés (ex. 5D8).");
        }));
        tools.appendChild(miniBtn("✕", "Retirer", function () { items.splice(idx, 1); render(); refresh(); }));
        row.appendChild(tools);
        box.appendChild(row);
      });
      var add = miniBtn(addLabel, null, function () {
        var o = {};
        cols.forEach(function (c) { o[c.key] = ""; });
        items.push(o);
        render();
        refresh();
      });
      add.className = "pc-add";
      box.appendChild(add);
    }
    render();
  }
  function diceOf(txt) {
    var m = /(\d{1,2})\s*[dD]\s*(\d{1,4})\s*([+-]\s*\d{1,4})?/.exec(String(txt || ""));
    if (!m) return null;
    return m[1] + "d" + m[2] + (m[3] ? m[3].replace(/\s/g, "") : "");
  }
  function buildEquipement(sheet) {
    var s = section(sheet, "Équipement",
      "Armes et armures personnalisables : poids, dégâts, reach et avantages/désavantages s'équilibrent "
      + "selon les courbes des règles (au moins 2 avantages et 2 désavantages par arme).");

    s.appendChild(el("h3", "pc-h3", "Armes"));
    var armesBox = el("div", "pc-eq-list");
    s.appendChild(armesBox);
    listEditor(armesBox, state.armes, [
      { key: "nom", label: "Arme" }, { key: "poids", label: "Poids" },
      { key: "degats", label: "Dégâts (ex. 5D10)" }, { key: "reach", label: "Reach" },
      { key: "props", label: "Avantages / désavantages", wide: true }
    ], "+ Ajouter une arme", function (it) {
      var d = diceOf(it.degats);
      return { label: "Dégâts — " + (it.nom || "arme"), die: d, title: d ? "Lancer " + d : null };
    });

    s.appendChild(el("h3", "pc-h3", "Armures"));
    var armuresBox = el("div", "pc-eq-list");
    s.appendChild(armuresBox);
    listEditor(armuresBox, state.armures, [
      { key: "nom", label: "Armure" }, { key: "poids", label: "Poids" },
      { key: "invu", label: "Invu (ex. 5D8)" }, { key: "zones", label: "Zones protégées", wide: true }
    ], "+ Ajouter une armure", function (it) {
      var d = diceOf(it.invu);
      return { label: "Invu — " + (it.nom || "armure"), die: d, title: d ? "Lancer " + d : null };
    });

    s.appendChild(el("h3", "pc-h3", "Inventaire"));
    s.appendChild(areaInput(function () { return state.inventaire; }, function (v) { state.inventaire = v; },
      "Une ligne par objet…", 4));

    // courbes de référence, repliées
    var det = el("details", "pc-details");
    det.appendChild(el("summary", null, "Courbes de poids (référence des règles)"));
    var t1 = el("table", "pc-table");
    var tb1 = el("tbody");
    var h1 = el("tr");
    ["Poids", "Dégâts", "Reach"].forEach(function (h) { h1.appendChild(el("th", null, h)); });
    tb1.appendChild(h1);
    (DATA.armesCourbe || []).forEach(function (r) {
      var tr = el("tr");
      [r.poids, r.degats, r.reach].forEach(function (v) { tr.appendChild(el("td", null, v)); });
      tb1.appendChild(tr);
    });
    t1.appendChild(tb1);
    det.appendChild(t1);
    var ac = DATA.armuresCourbe || {};
    if (ac.invu) {
      var t2 = el("table", "pc-table");
      var tb2 = el("tbody");
      var rows = [["Poids"].concat(ac.poids), ["Invu"].concat(ac.invu), ["Zones"].concat(ac.zones || []),
                  ["Viser une zone non protégée"].concat(ac.viser || []), ["Port d'armure"].concat(ac.port || [])];
      rows.forEach(function (cells, ri) {
        var tr = el("tr");
        cells.forEach(function (v, ci) { tr.appendChild(el(ri === 0 || ci === 0 ? "th" : "td", null, v)); });
        tb2.appendChild(tr);
      });
      t2.appendChild(tb2);
      det.appendChild(t2);
    }
    s.appendChild(det);
  }

  // ---------- notes ----------
  function buildNotes(sheet) {
    var s = section(sheet, "Background & notes");
    var g = el("div", "pc-grid2");
    g.appendChild(field("Background", areaInput(function () { return state.background; }, function (v) { state.background = v; }, "Un petit background…", 6)));
    g.appendChild(field("Notes", areaInput(function () { return state.notes; }, function (v) { state.notes = v; }, "", 6)));
    s.appendChild(g);
  }

  // ---------- bibliothèque (site seulement) ----------
  function buildLibrary(sheet) {
    if (COMPACT) return;   // dans Roll20, la fiche EST le personnage
    var s = section(sheet, "Bibliothèque",
      "Les personnages enregistrés se synchronisent avec l'extension Roll20 (popup « Fiche JJK »).");
    var list = el("div", "pc-lib");
    s.appendChild(list);
    function render() {
      var persos = loadPersos();
      list.innerHTML = "";
      persos.forEach(function (p) {
        var row = el("div", "pc-lib-row");
        row.appendChild(el("span", "pc-lib-name pc-grow", p.name || "Sans nom"));
        row.appendChild(miniBtn("Charger", null, function () {
          try { state = normalize(JSON.parse(JSON.stringify(p.state))); }
          catch (e) { flash("Fiche illisible."); return; }
          remount();
          flash("« " + (p.name || "Sans nom") + " » chargé.");
        }));
        row.appendChild(miniBtn("✕", "Supprimer de la bibliothèque", function () {
          savePersos(loadPersos().filter(function (q) { return q.id !== p.id; }));
          render();
        }));
        list.appendChild(row);
      });
      if (!persos.length) list.appendChild(el("p", "pc-hint", "Aucun personnage enregistré."));
    }
    var tools = el("div", "pc-lib-tools");
    tools.appendChild(miniBtn("Enregistrer le personnage courant", null, function () {
      var persos = loadPersos();
      var name = state.name || "Sans nom";
      var existing = null;
      persos.forEach(function (p) { if (p.name === name) existing = p; });
      var copy = JSON.parse(JSON.stringify(state));
      if (existing) { existing.state = copy; existing.updated = nowStamp(); }
      else persos.push({ id: "p" + Date.now().toString(36), name: name, state: copy, updated: nowStamp() });
      savePersos(persos);
      render();
      flash("« " + name + " » enregistré.");
    }));
    tools.appendChild(miniBtn("Exporter (JSON)", null, function () {
      var a = document.createElement("a");
      a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
      a.download = (state.name || "personnage-jjk") + ".json";
      a.click();
    }));
    var imp = miniBtn("Importer (JSON)", null, function () { file.click(); });
    var file = el("input"); file.type = "file"; file.accept = "application/json"; file.style.display = "none";
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
    tools.appendChild(imp);
    tools.appendChild(file);
    tools.appendChild(miniBtn("Nouveau personnage", null, function () {
      state = blank();
      remount();
    }));
    s.appendChild(tools);
    render();
  }

  // ---------- montage ----------
  function mount(root) {
    rootEl = root;
    hooks = [];
    compHooks = [];
    root.innerHTML = "";
    var app = el("div", "perso-atelier");
    var sheet = el("div", "pc-sheet");
    app.appendChild(sheet);

    // journal des jets (sur le site ; dans Roll20 les jets partent au tchat)
    rollPanel = el("div", "pc-rolls");
    var rHead = el("div", "pc-rolls-head");
    rHead.appendChild(el("span", "pc-rolls-title", "Jets"));
    rHead.appendChild(miniBtn("Vider", null, function () { rollHistory = []; renderRolls(); }));
    var tog = miniBtn("▾", "Réduire / déployer", function () { rollPanel.classList.toggle("open"); });
    rHead.appendChild(tog);
    rollPanel.appendChild(rHead);
    rollPanel.appendChild(el("div", "pc-rolls-list"));
    app.appendChild(rollPanel);
    renderRolls();

    root.appendChild(app);

    buildHead(sheet);
    buildIdentite(sheet);
    buildCaracs(sheet);
    buildComps(sheet);
    buildCombat(sheet);
    buildEquipement(sheet);
    buildNotes(sheet);
    buildLibrary(sheet);
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
