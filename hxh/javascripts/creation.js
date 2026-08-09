/* Création — créateur de personnage (sans le Nen), mise en page « fiche ».
 *
 * Contenu (caractéristiques, Éclat, compétences, formations, arts, sens,
 * tailles, formes du vivant, tables de capacités, catalogue d'armes) issu de creation.json,
 * produit au build par hooks/creation.py depuis les pages de règles : une seule
 * source de vérité, comme la Forge et l'Atelier.
 *
 * La présentation reprend les codes de la fiche Anima Beyond Fantasy de
 * Roll20 : feuille blanche centrée, en-tête d'identité sur lignes soulignées,
 * onglets en pilules (Général / Formations & Arts / Nen),
 * trois colonnes de blocs à titres serif, tables rayées, gros encadrés pour
 * les valeurs finales. Ce fichier ne porte que l'interface et les règles de
 * calcul prosaïques :
 *   - caractéristiques : 60 points à répartir entre les douze, chaque valeur de
 *     3 à 9, 1 point = 1 point (le coût d'une caractéristique est sa valeur) ;
 *   - compétences : 5 PF = +20 de base, plafond de 5 PF par compétence et par
 *     niveau (points-formation.md) ; valeur = base + modificateur de carac ;
 *   - niveau = ⌈PF ÷ 100⌉ (points-formation.md) ;
 *   - PV max = (PV par niveau + modificateur de taille) × niveau (tailles.md) ;
 *   - familiarité des armes : −20 même famille, −40 famille étrangère
 *     (formations-martiales.md) ;
 *   - frappe d'un art martial : base + multiple du modificateur de Force
 *     (arts-martiaux.md).
 *
 * Les règles encore en chantier dans le livre (classes donc PV par niveau,
 * avantages, capital de PF et argent de départ, coût des arts) sont exposées en
 * champs réglables plutôt qu'inventées ici. Les personnages s'enregistrent dans
 * localStorage (« creation-persos ») et s'exportent/importent en JSON ; les
 * armes forgées (« forge-weapons ») sont proposées dans l'équipement.
 */
(function () {
  "use strict";

  var DATA = null;
  var state = null;
  var rootEl = null;
  var updaters = [];   // rafraîchisseurs des valeurs affichées sur la feuille
  var rebuildSens = null;   // re-rendu des blocs Sens (les lignes dépendent de la forme)
  var capacitesRender = null;   // re-rendu de la liste des capacités (retour de l'Atelier)
  // Mode « fiche » condensé, posé par l'extension Roll20 (window.__hxhCompact) : on
  // retire du créateur ce qui n'aide qu'à LIRE les règles (rareté/description
  // d'Éclat, malus de PV de la taille…). Sur le site, __hxhCompact
  // n'existe pas -> le créateur reste complet (aide à la construction).
  var COMPACT = typeof window !== "undefined" && window.__hxhCompact === true;
  var SENS_NIVEAUX = ["Primaire", "Secondaire", "Tertiaire", "Latent", "Inexistant"];

  // --- petites aides ---------------------------------------------------------
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
  function fmt(n) {   // 8000 -> « 8 000 »
    var s = String(Math.abs(n)), out = "";
    while (s.length > 3) { out = " " + s.slice(-3) + out; s = s.slice(0, -3); }
    return (n < 0 ? "−" : "") + s + out;
  }
  function signed(n) { return n > 0 ? "+" + n : n < 0 ? "−" + (-n) : "+0"; }

  // --- état ------------------------------------------------------------------
  function blank() {
    return {
      v: 1,
      name: "", age: "", genre: "", tailleCm: "", poids: "", classe: "", notes: "",
      tailleCat: "Moyenne",
      forme: "Bipède à bras",   // plan de corps (formes.md) ; l'humain est la référence
      pfTotal: 100, pvParNiveau: 100, argent: 0,
      eclatN: 10, eclatA: 10,
      caracs: { FOR: 3, DEX: 3, AGI: 3, END: 3, PER: 3, "PRÉ": 3, VOL: 3, LOG: 3, INS: 3, "ÉRU": 3, IMA: 3, CHA: 3 },
      caracDivers: {},    // abbr -> bonus/malus divers à la valeur effective (ne coûte pas de points)
      comps: {},          // nom -> PF investis (multiples de 5)
      customComps: [],    // compétences personnalisées : [{ name, carac, pf, divers }]
      divers: {},         // nom de compétence -> bonus/malus divers (équipement, MJ...)
      modGlobal: 0,       // modificateur à toutes les actions (style « All Action Mod »)
      formations: [],     // [{ name, choix }]
      arts: {},           // nom -> « Basique » | « Avancé » | « Expert »
      armeDepart: "",
      armes: [],          // armes portées au combat : [{ name, forge }]
      inventaire: [],     // [{ name, prix, arme }]
      acuite: {},         // sens -> clarté 0..10 (défaut 10 ; clé historique « acuite »)
      sensOverride: {},   // sens -> niveau forcé à la main (absent = niveau de la forme) — onglet Options
      compAccess: {},     // compétence -> true/false : autorisation forcée à la main (absent = dérivée) — onglet Options
      capDivers: {},      // capacité (mouvement/port/apnee/sommeil) -> ± crans sur la ligne lue
      mvtDivers: {},      // milieu (terre/eau/air) -> ± crans propres à ce milieu de déplacement
      armesCorpsDivers: {},  // arme de corps -> ± divers (les armes portées le stockent sur leur entrée)
      armesCorpsDmgDivers: {}, // arme de corps -> ± dégâts (idem : armes portées sur leur entrée)
      de: "1d100",        // dé des jets (seul dé nommé par les règles : critique-blessures)
      pv: null,           // PV courants (null = au maximum)
      pvMaxOverride: null, // PV max forcés à la main (null = valeur calculée)
      fatigue: null,      // points de fatigue courants (réserve, max = Endurance ; null = au maximum)
      fatigueBonus: 0,    // bonus à la fatigue max (avantage « Fatigue supérieure », don du MJ)
      reduction: {},      // réduction de dégâts d'armure par type (CON/TRA/PER/FEU/FRO/ÉLE/DÉC)
      actions: null,      // nombre d'actions par tour (null = au choix du MJ, non fixé)
      etatsActifs: {},    // nom d'état -> true, ou nom du palier
      avantages: [],      // [{ name, note }] : nom du livre (coût compté) ou ligne libre
      avPtsDivers: 0,     // ajustement des points d'avantage (plus haut palier d'Éclat atteint, dons du MJ)
      // --- Nen ---
      archetype: "",      // archétype choisi (une des 12 valeurs de DATA.archetypes) : fixe les 6 affinités
      diTotal: 0,         // capital de développement intérieur (comme pfTotal ; prestige = ⌈DI ÷ 100⌉)
      techniques: {},     // nom de technique -> palier ("Basique".."Maître") pour les techniques à paliers, true pour un bloc
      enRayon: 0,         // rayon de l'En : indice du plus haut cran débloqué (0 = 1 m, compris dans l'En)
      auraDev: { uar: 0, rua: 0, uam: 0 },  // achats d'aura payés en DI (mult UAR, mult RUA en plus, achats +200 UAM)
      auraOverride: { uam: null, uar: null, rua: null },  // valeurs d'aura forcées à la main (null = calculé)
      affiniteDivers: {}, // catégorie -> ± affinité (avantage, race, don du MJ)
      diCat: {},          // sigle de catégorie (DR/DE/DT/DM/DC/DS) -> DI investi dans la conversion (après Hatsu)
      capacites: [],      // capacités de Nen du perso : [{ id, name, atelier: <état Atelier>, report: <résumé> }]
      portrait: ""        // URL d'une image de personnage
    };
  }
  // Toute donnée entrante (localStorage, import JSON, bibliothèque) est
  // normalisée sur blank() : champ manquant -> valeur par défaut, type
  // inattendu -> ignoré. Sans cela, un personnage partiel planterait mount()
  // et l'état corrompu, autosauvegardé, casserait la page à chaque visite.
  function normalize(s) {
    if (!s || typeof s !== "object" || !s.caracs) return null;
    var b = blank();
    for (var k in b) {
      if (s[k] == null) continue;
      var want = Object.prototype.toString.call(b[k]);
      if (Object.prototype.toString.call(s[k]) !== want) continue;
      b[k] = s[k];
    }
    // valeurs imbriquées : on ne garde que ce qui a le bon type (un import
    // trafiqué ne doit ni planter le montage ni concaténer des chaînes)
    function numMap(m, lo, hi) {
      var o = {};
      for (var k2 in m) if (typeof m[k2] === "number" && isFinite(m[k2])) o[k2] = clamp(m[k2], lo, hi);
      return o;
    }
    // modificateurs MULTIPLES : chaque clé porte un TABLEAU de modificateurs (une
    // source par slot) ; un ancien nombre unique devient [nombre]. Clé écartée si tout est nul.
    function modArrMap(m, lo, hi, maxLen) {
      var o = {};
      for (var k2 in m) {
        var v = m[k2];
        var src = Array.isArray(v) ? v : (v != null ? [v] : []);
        var out = [];
        for (var i = 0; i < src.length && out.length < maxLen; i++) {
          out.push(typeof src[i] === "number" && isFinite(src[i]) ? clamp(src[i], lo, hi) : 0);
        }
        if (out.some(function (x) { return x; })) o[k2] = out;
      }
      return o;
    }
    var ref = blank().caracs, caracs = {};
    for (var a in ref) caracs[a] = typeof b.caracs[a] === "number" && isFinite(b.caracs[a]) ? clamp(b.caracs[a], 0, 30) : ref[a];
    b.caracs = caracs;
    b.caracDivers = modArrMap(b.caracDivers, -30, 30, 3);
    b.capDivers = modArrMap(b.capDivers, -30, 30, 3);
    b.mvtDivers = modArrMap(b.mvtDivers, -30, 30, 3);   // trois ± par milieu (terre/eau/air)
    // Nen : techniques = map nom -> palier(chaîne) | true ; diCat/auraDev = nombres
    var tk = {};
    for (var tn in b.techniques) {
      var tv = b.techniques[tn];
      if (tv === true || ["Basique", "Avancé", "Expert", "Maître"].indexOf(tv) >= 0) tk[tn] = tv;
    }
    b.techniques = tk;
    b.enRayon = (typeof b.enRayon === "number" && isFinite(b.enRayon)) ? Math.max(0, Math.floor(b.enRayon)) : 0;
    b.diCat = numMap(b.diCat, 0, 999999);
    var ad = blank().auraDev;
    if (b.auraDev && typeof b.auraDev === "object") {
      for (var ak in ad) if (typeof b.auraDev[ak] === "number" && isFinite(b.auraDev[ak])) ad[ak] = Math.max(0, b.auraDev[ak]);
    }
    b.auraDev = ad;
    var ao = { uam: null, uar: null, rua: null };
    if (b.auraOverride && typeof b.auraOverride === "object") {
      ["uam", "uar", "rua"].forEach(function (k) {
        if (typeof b.auraOverride[k] === "number" && isFinite(b.auraOverride[k])) ao[k] = b.auraOverride[k];
      });
    }
    b.auraOverride = ao;
    b.affiniteDivers = numMap(b.affiniteDivers, -999, 999);
    b.capacites = (Array.isArray(b.capacites) ? b.capacites : []).filter(function (c) {
      return c && typeof c === "object" && typeof c.name === "string" && c.atelier && typeof c.atelier === "object";
    }).map(function (c) {
      return { id: typeof c.id === "string" && c.id ? c.id : capId(),
               name: c.name, atelier: c.atelier,
               report: c.report && typeof c.report === "object" ? c.report : null };
    });
    var so = {};
    for (var so1 in b.sensOverride) if (SENS_NIVEAUX.indexOf(b.sensOverride[so1]) >= 0) so[so1] = b.sensOverride[so1];
    b.sensOverride = so;
    var ca = {};
    for (var ca1 in b.compAccess) if (b.compAccess[ca1] === true || b.compAccess[ca1] === false) ca[ca1] = b.compAccess[ca1];
    b.compAccess = ca;
    b.armesCorpsDivers = numMap(b.armesCorpsDivers, -9999, 9999);
    b.armesCorpsDmgDivers = numMap(b.armesCorpsDmgDivers, -9999, 9999);
    b.comps = numMap(b.comps, 0, 9999);
    b.divers = modArrMap(b.divers, -9999, 9999, 3);
    b.acuite = numMap(b.acuite, 0, 10);
    b.formations = b.formations.filter(function (f) { return f && typeof f.name === "string"; });
    b.customComps = b.customComps.filter(function (c) {
      return c && typeof c.name === "string" && typeof c.carac === "string";
    }).map(function (c) {
      c.pf = typeof c.pf === "number" && isFinite(c.pf) ? Math.max(0, c.pf) : 0;
      c.divers = typeof c.divers === "number" && isFinite(c.divers) ? c.divers : 0;
      c.champ = typeof c.champ === "string" && c.champ ? c.champ : "Personnalisé";
      return c;
    });
    b.armes = b.armes.filter(function (x) { return x && typeof x.name === "string"; }).map(function (x) {
      x.divers = typeof x.divers === "number" && isFinite(x.divers) ? x.divers : 0;
      x.dmgDivers = typeof x.dmgDivers === "number" && isFinite(x.dmgDivers) ? x.dmgDivers : 0;
      return x;
    });
    b.avantages = b.avantages.filter(function (x) { return x && typeof x === "object"; }).map(function (x) {
      var o = { name: typeof x.name === "string" ? x.name : "", note: typeof x.note === "string" ? x.note : "" };
      if (typeof x.cout === "number" && isFinite(x.cout)) o.cout = x.cout;   // coût choisi (avantage à fourchette)
      return o;
    });
    var ea = {};
    for (var e in b.etatsActifs) if (b.etatsActifs[e] === true || typeof b.etatsActifs[e] === "string") ea[e] = b.etatsActifs[e];
    b.etatsActifs = ea;
    if (typeof s.pv === "number" && isFinite(s.pv)) b.pv = s.pv;           // null par défaut : le test de type l'aurait écarté
    if (typeof s.pvMaxOverride === "number" && isFinite(s.pvMaxOverride)) b.pvMaxOverride = s.pvMaxOverride;
    if (typeof s.fatigueBonus === "number" && isFinite(s.fatigueBonus)) b.fatigueBonus = s.fatigueBonus;
    if (typeof s.actions === "number" && isFinite(s.actions)) b.actions = s.actions;
    b.reduction = numMap(b.reduction, -9999, 9999);
    if (typeof s.fatigue === "number" && isFinite(s.fatigue)) b.fatigue = clamp(s.fatigue, -30, 30);
    else b.fatigue = null;
    return b;
  }
  function save() {
    try { localStorage.setItem("creation-perso", JSON.stringify(state)); } catch (e) {}
    syncCards();
  }

  // --- cartes de jeu (pont vers l'extension navigateur) ---------------------------
  // L'extension Roll20 n'a pas le moteur : elle affiche une « carte » calculée,
  // structurée, produite ici (donc aucune règle dupliquée). On écrit dans
  // localStorage « creation-cards » un objet { id -> carte } que le content
  // script de l'extension recopie ; le brouillon en cours vit sous « _current ».
  function computeCard() {
    var g = modsGlobaux();
    var t0 = tailleCat();
    var comps = [];
    DATA.competences.forEach(function (k) {
      comps.push({ name: k.name, carac: caracAbbr(k.carac), champ: k.champ,
        total: compTotal(k.name), roll: compTotal(k.name) + g,
        invested: state.comps[k.name] > 0 || !!diversOf(k.name), accessible: k.accessible });
    });
    state.customComps.forEach(function (c) {
      comps.push({ name: c.name, carac: c.carac, champ: "Personnalisé",
        total: customTotal(c), roll: customTotal(c) + g, invested: c.pf > 0 || !!c.divers, custom: true });
    });
    var portees = DATA.armes.filter(function (a) { return a.corps; }).map(function (a) { return { a: a, name: a.name }; })
      .concat(state.armes.map(function (e) { return { a: armeByName(e.name), name: e.name, forge: e.forge, entry: e }; }));
    var armes = portees.map(function (x) {
      if (!x.a) return { name: x.name, forge: x.forge, unknown: true };
      var lourd = lourdeurMalus(x.a);
      var dvv = armeDivers(x.a, x.entry);
      var atk = armeTypes(x.a).map(function (ty) {
        return { label: ty.label, roll: compTotal(ty.comp) + malusArme(x.a, ty.label) + lourd + dvv + g };
      });
      var md = modDegatsArme(x.a);
      return {
        name: x.name, corps: x.a.corps, famille: x.a.famille, am: x.a.am,
        attaques: atk,
        parade: /\bParade\b/.test(x.a.props) ? (compTotal("Parade") + malusArme(x.a, "Parade") + dvv + g) : null,
        degats: x.a.degats, mod: md.val, modTxt: md.txt, munitions: x.a.munitions
      };
    });
    var arts = Object.keys(state.arts).map(function (n) {
      var a = artByName(n), pal = state.arts[n], pd = null;
      (a && a.paliers || []).forEach(function (x) { if (x.niveau === pal) pd = x; });
      return { name: n, palier: pal, frappe: a && a.frappe ? frappeTxt(a, pal) : "", effet: pd && pd.effet ? pd.effet : "" };
    });
    var etats = [];
    (DATA.etats || []).forEach(function (e) {
      var v = state.etatsActifs[e.name];
      if (!v) return;
      var p = null;
      if (v !== true) e.paliers.forEach(function (x) { if (x.name === v) p = x; });
      var mods = (p ? p.mods : e.mods).map(function (m) { return m.cible + " " + signed(m.val); }).join(" · ");
      etats.push({ name: e.name + (p ? " (" + p.name + ")" : ""),
        effet: (e.name === "Abri" ? "subi par l'assaillant : " : "") + (mods || "voir la règle") });
    });
    return {
      name: state.name || "Personnage sans nom",
      portrait: state.portrait || "",
      de: state.de || "1d100",
      header: [
        "Niveau " + niveau() + " (" + fmt(state.pfTotal) + " PF)",
        "Éclat " + state.eclatA + (state.eclatA !== state.eclatN ? " (naissance " + state.eclatN + ")" : ""),
        state.classe ? "Classe : " + state.classe : null,
        state.age ? state.age + " ans" : null, state.genre || null,
        state.tailleCm ? state.tailleCm + " m" : null, state.poids ? state.poids + " kg" : null,
        "Taille " + state.tailleCat + (t0 && t0.pvMod ? " (" + signed(t0.pvMod) + " PV/niv)" : ""),
        state.forme && state.forme !== "Bipède à bras" ? "Forme " + state.forme : null
      ].filter(Boolean),
      // en-tête d'identité structuré (l'extension reproduit la grille pc-id de la fiche)
      identity: {
        nom: state.name || "", classe: state.classe || "", genre: state.genre || "",
        age: state.age || "", taille: state.tailleCm || "", poids: state.poids || "",
        categorie: state.tailleCat || "", forme: state.forme || "", bourse: state.argent || 0,
        niveau: niveau(), pf: state.pfTotal, eclatA: state.eclatA, eclatN: state.eclatN
      },
      caracs: DATA.caracs.map(function (k) { return { abbr: k.abbr, name: k.name, groupe: k.groupe, val: caracVal(k.abbr), mod: modOf(caracVal(k.abbr)) }; }),
      combat: {
        pv: pvCourant(), pvMax: pvMax(),
        init: compTotal("Initiative") + g, esquive: compTotal("Esquive") + g, parade: compTotal("Parade") + g,
        fatigue: fatiguePts(), fatigueMax: fatigueMax(), modGlobal: g
      },
      capacites: {
        mouvement: capRow("mouvement", capVal("mouvement")) || [],
        port: capRow("port", capVal("port")) || [],
        apnee: capRow("apnee", capVal("apnee")) || [],
        repos: capRow("repos", capVal("repos")) || [],
        reposCols: DATA.capacites.repos ? DATA.capacites.repos.cols : [],
        fond: capRow("fond", capVal("fond")) || [],
        fondCols: DATA.capacites.fond ? DATA.capacites.fond.cols : [],
        pression: capRow("pression", capVal("pression")) || [],
        pressionCols: DATA.capacites.pression ? DATA.capacites.pression.cols : []
      },
      competences: comps,
      armes: armes,
      arts: arts,
      formations: (state.armeDepart ? [{ name: "Arme de départ", info: state.armeDepart }] : []).concat(
        state.formations.map(function (f) { return { name: f.name + (f.choix ? " (" + f.choix + ")" : ""), info: "" }; })),
      sens: DATA.sens.map(function (s) { return { s: s, nv: sensNiveau(s) }; })
        .filter(function (x) { return x.nv !== "Inexistant" && x.nv !== "Latent"; })
        .map(function (x) { return { name: x.s.name, niveau: x.nv, acuite: state.acuite[x.s.name] != null ? state.acuite[x.s.name] : 10 }; }),
      avantages: state.avantages.filter(function (a) { return (a.name || "").trim(); }).map(function (a) {
        var b = avByName(a.name);
        var cout = b ? (typeof a.cout === "number" ? clamp(a.cout, b.cout, b.coutMax || b.cout) : b.cout) : null;
        return { name: a.name, note: a.note || "", cout: cout };
      }),
      avPoints: { depenses: avPtsSpent(), total: avPtsTotal() },
      etats: etats,
      nen: hasNen() ? {
        archetype: state.archetype, prestige: prestige(),
        di: diSpent(), diTotal: state.diTotal || 0,
        uam: uam(), uar: uar(), rua: rua(),
        affinites: DATA.nenCats.map(function (c, i) { return { cat: c, pct: affinites()[i] }; }),
        techniques: Object.keys(state.techniques).map(function (n) { return { name: n, palier: state.techniques[n] === true ? "" : state.techniques[n] }; }),
        capacites: state.capacites.map(function (c) { return { name: c.name, report: c.report || null }; })
      } : null,
      notes: state.notes || "",
      difficultes: DATA.difficultes
    };
  }
  function syncCards() {
    if (!DATA) return;
    var cards;
    try { cards = JSON.parse(localStorage.getItem("creation-cards")) || {}; } catch (e) { cards = {}; }
    if (typeof cards !== "object" || !cards) cards = {};
    var card = computeCard();
    card.id = "_current"; card.updated = nowStamp();
    cards._current = card;
    // si le brouillon porte le nom d'un personnage enregistré, on met sa carte à jour aussi
    loadPersos().forEach(function (p) {
      if (p.name === state.name) { var c = computeCard(); c.id = p.id; c.updated = nowStamp(); cards[p.id] = c; }
    });
    try { localStorage.setItem("creation-cards", JSON.stringify(cards)); } catch (e) {}
  }
  function syncAllCards() {
    if (!DATA) return;
    var cards = {};
    var keep = state;
    loadPersos().forEach(function (p) {
      var st = normalize(JSON.parse(JSON.stringify(p.state)));
      if (!st) return;
      state = st;
      var c = computeCard(); c.id = p.id; c.updated = nowStamp();
      cards[p.id] = c;
    });
    state = keep;
    var cur = computeCard(); cur.id = "_current"; cur.updated = nowStamp();
    cards._current = cur;
    try { localStorage.setItem("creation-cards", JSON.stringify(cards)); } catch (e) {}
  }
  // Date.now() est indisponible dans certains contextes de test ; on tolère.
  function nowStamp() { try { return Date.now(); } catch (e) { return 0; } }
  function load() {
    try {
      return normalize(JSON.parse(localStorage.getItem("creation-perso")));
    } catch (e) { return null; }
  }
  function curTab() { try { return localStorage.getItem("creation-tab") || "general"; } catch (e) { return "general"; } }
  function setTab(id) { try { localStorage.setItem("creation-tab", id); } catch (e) {} }

  // --- bibliothèque de personnages -------------------------------------------
  var PKEY = "creation-persos";
  function loadPersos() { try { var a = JSON.parse(localStorage.getItem(PKEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function savePersos(a) { try { localStorage.setItem(PKEY, JSON.stringify(a)); } catch (e) {} }
  function saveCurrentPerso() {
    var name = (state.name || "").trim();
    if (!name) { alert("Donnez un nom au personnage avant de l'enregistrer."); return; }
    var arr = loadPersos();
    var rec = { name: name, state: JSON.parse(JSON.stringify(state)) };
    var i = -1;
    for (var k = 0; k < arr.length; k++) if (arr[k].name === name) { i = k; break; }   // upsert par nom
    if (i >= 0) { rec.id = arr[i].id; arr[i] = rec; }
    else { rec.id = "p" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); arr.push(rec); }
    savePersos(arr); syncAllCards(); refresh();
  }
  function deletePerso(id) {
    savePersos(loadPersos().filter(function (p) { return p.id !== id; }));
    try {
      var cards = JSON.parse(localStorage.getItem("creation-cards")) || {};
      delete cards[id];
      localStorage.setItem("creation-cards", JSON.stringify(cards));
    } catch (e) {}
    refresh();
  }
  function loadPersoInto(p) { state = normalize(JSON.parse(JSON.stringify(p.state))) || blank(); if (rootEl) mount(rootEl); }

  // --- armes de la Forge (localStorage partagé) --------------------------------
  function forgedWeapons() { try { var a = JSON.parse(localStorage.getItem("forge-weapons")); return Array.isArray(a) ? a : []; } catch (e) { return []; } }

  // --- règles : caractéristiques et Éclat --------------------------------------
  function modOf(v) {
    v = clamp(v, 0, 30);
    var rows = DATA.caracTables.modificateurs;
    for (var i = 0; i < rows.length; i++) if (v >= rows[i].min && v <= rows[i].max) return rows[i].mod;
    return 0;
  }
  var CARAC_POINTS = 60, CARAC_MIN = 3, CARAC_MAX = 9;   // création : 60 points à répartir, chaque caractéristique de 3 à 9 (1 point = 1 point de carac)
  function caracMax() { return CARAC_MAX; }
  function caracSpent() {   // coût d'une caractéristique = sa valeur (base 3 comprise), sans surcoût
    var s = 0;
    for (var k in state.caracs) s += state.caracs[k];
    return s;
  }
  function caracBase(abbr) { return state.caracs[abbr] != null ? state.caracs[abbr] : CARAC_MIN; }
  // valeur effective = valeur achetée + écart de la forme + divers (équipement,
  // art, décision du MJ) : ni la forme ni le divers ne coûtent de points, et la
  // valeur effective cascade partout où caracVal est lue (modificateur,
  // capacités, compétences, fatigue, frappes, prérequis, exports)
  // somme d'un modificateur multi-sources (tableau) ou d'un ancien nombre unique
  function modSum(v) {
    if (Array.isArray(v)) { var s = 0; for (var i = 0; i < v.length; i++) s += v[i] || 0; return s; }
    return v || 0;
  }
  // nom de compétence affiché : « Résistance à … » abrégé en « Rés. à … » (gain de place)
  function compDisplayName(name) { return name.replace(/^Résistance à /, "Rés. à "); }
  function caracVal(abbr) { return clamp(caracBase(abbr) + formeCaracMod(abbr) + modSum(state.caracDivers[abbr]), 0, 30); }

  // --- règles : forme du vivant -----------------------------------------------
  // Le plan de corps (formes.md) ajuste les caractéristiques physiques, fixe le
  // niveau de chaque sens et les milieux de déplacement. L'humain (Bipède à
  // bras, écarts nuls) est la référence et la valeur par défaut ; la taille se
  // règle à part (catégorie de taille).
  function formeCur() {
    if (!DATA.formes) return null;
    for (var i = 0; i < DATA.formes.length; i++) if (DATA.formes[i].name === state.forme) return DATA.formes[i];
    return null;
  }
  function formeCaracMod(abbr) {
    var f = formeCur();
    return f && f.caracs && f.caracs[abbr] ? f.caracs[abbr] : 0;
  }
  function sensNiveauForme(s) {
    var f = formeCur();
    if (f && f.sens) return f.sens[s.name] || "Inexistant";
    return s.niveau;   // sans forme connue : classement humain de sens.md
  }
  // niveau effectif d'un sens : l'override manuel (onglet Options) prime sur la forme
  function sensNiveau(s) {
    return state.sensOverride[s.name] || sensNiveauForme(s);
  }
  // Accessibilité d'une compétence. Par défaut, elle découle du corps : une
  // compétence de sens (même nom qu'un sens) n'est accessible que si la forme
  // porte ce sens ; « Vol » demande des ailes ; le reste suit le drapeau du
  // livre (compétences hors de portée d'un humain ordinaire). L'onglet Options
  // force l'un ou l'autre à la main.
  function sensByName(name) {
    for (var i = 0; i < DATA.sens.length; i++) if (DATA.sens[i].name === name) return DATA.sens[i];
    return null;
  }
  function compAccessDefault(k) {
    var s = sensByName(k.name);
    if (s) return sensNiveau(s) !== "Inexistant";
    if (k.name === "Vol") { var f = formeCur(); return !!(f && f.membres && f.membres["Aile"]); }
    return k.accessible !== false;
  }
  function compAccessible(k) {
    if (state.compAccess[k.name] === true) return true;
    if (state.compAccess[k.name] === false) return false;
    return compAccessDefault(k);
  }
  // capacité physique : ligne lue = carac effective + ± de capacité (crans)
  function capVal(key) {
    var cap = DATA.capacites[key];
    return (cap ? caracVal(cap.carac) : 0) + modSum(state.capDivers[key]);
  }
  // ± divers propre à une arme portée (qualité, état, décision du MJ) : compté
  // à l'attaque et à la parade ; les armes de corps, qui n'ont pas d'entrée
  // dans state.armes, le rangent dans state.armesCorpsDivers
  function armeDivers(a, entry) {
    if (entry) return entry.divers || 0;
    return (a && state.armesCorpsDivers[a.name]) || 0;
  }
  // ± dégâts propre à une arme (avantage « Armes de corps supérieures », tranchant
  // de Nen ou d'art, décision du MJ) : ajouté aux dégâts, jamais à l'attaque.
  function armeDmgDivers(a, entry) {
    if (entry) return entry.dmgDivers || 0;
    return (a && state.armesCorpsDmgDivers[a.name]) || 0;
  }
  // --- règles : avantages (avantages.md) ---------------------------------------
  // Les points d'avantage suivent le plus haut palier d'Éclat atteint (palier
  // inférieur). La fiche connaît l'Éclat de Naissance et l'actuel : elle prend
  // le plus haut des deux ; le ± couvre un palier passé plus haut encore.
  function avByName(name) {
    var L = (DATA.avantages && DATA.avantages.liste) || [];
    for (var i = 0; i < L.length; i++) if (L[i].name === name) return L[i];
    return null;
  }
  function avPtsTotal() {
    var rows = (DATA.avantages && DATA.avantages.points) || [];
    var ecl = Math.max(state.eclatN || 0, state.eclatA || 0);
    var pts = 0;
    for (var i = 0; i < rows.length; i++) if (rows[i].eclat <= ecl) pts = rows[i].pts;
    return pts + (state.avPtsDivers || 0);
  }
  function avPtsSpent() {
    var s = 0;
    state.avantages.forEach(function (a) {
      var b = avByName(a.name);
      if (!b) return;
      // coût variable (« 1 à 3 points ») : le joueur règle le coût dépensé sur la ligne
      s += typeof a.cout === "number" ? clamp(a.cout, b.cout, b.coutMax || b.cout) : b.cout;
    });
    return s;
  }

  // --- règles : Nen -----------------------------------------------------------
  // Constantes des règles (aura.md, di.md, techniques-nen.md) : formules stables,
  // codées ici comme le reste des calculs du créateur ; le catalogue (techniques,
  // archétypes) vient de creation.json.
  var NEN_PALIERS = ["Basique", "Avancé", "Expert", "Maître"];
  var NEN_ETATS = ["Ten", "Ren", "Ken", "En", "Zetsu", "Ko", "Ryu"];   // exclusifs (techniques-nen.md)
  var TEN_RUA = { "Basique": 5, "Avancé": 10, "Expert": 15, "Maître": 20 };   // Ten -> base de RUA
  var REN_UAR = { "Basique": 5, "Avancé": 10, "Expert": 15, "Maître": 20 };   // Ren -> base d'UAR
  // catégorie de Nen -> { sigle du pool, carac mentale requise } (di.md, capacites-de-nen.md)
  var NEN_CAT_META = {
    "renforcement":   { sigle: "DR", carac: "VOL" },
    "émission":       { sigle: "DE", carac: "LOG" },
    "transmutation":  { sigle: "DT", carac: "INS" },
    "manipulation":   { sigle: "DM", carac: "ÉRU" },
    "conjuration":    { sigle: "DC", carac: "IMA" },
    "spécialisation": { sigle: "DS", carac: "CHA" }
  };
  var AURA_COSTS = { uar: 20, rua: 10, uam: 5 };   // DI par achat (aura.md)

  function techByName(name) {
    for (var i = 0; i < (DATA.techniques || []).length; i++) if (DATA.techniques[i].name === name) return DATA.techniques[i];
    return null;
  }
  function hasNen() { return !!state.techniques["Initiation au Nen"]; }
  function hasHatsu() { return !!state.techniques["Hatsu"]; }
  function hasSpecialiste() {
    for (var i = 0; i < state.avantages.length; i++) if (state.avantages[i].name === "Spécialiste") return true;
    return false;
  }
  function prestige() { return Math.ceil((state.diTotal || 0) / 100); }
  // niveau de maîtrise atteint pour une technique : indice de palier (0..3), ou
  // -1 si non apprise ; un bloc appris renvoie 0
  function techRank(name) {
    var v = state.techniques[name];
    if (!v) return -1;
    return v === true ? 0 : NEN_PALIERS.indexOf(v);
  }
  // une clause de prérequis « Ten Basique » / « Initiation au Nen » / « aucun »
  function prereqMet(clause) {
    clause = clause.trim();
    if (!clause || /^aucun$/i.test(clause)) return true;
    var m = clause.match(/^(.*?)\s+(Basique|Avancé|Expert|Maître)$/);
    if (m) return techRank(m[1].trim()) >= NEN_PALIERS.indexOf(m[2]);
    return techRank(clause) >= 0;   // technique d'un bloc (nom seul)
  }
  function prereqAllMet(prereqStr) {
    return (prereqStr || "").split(",").every(function (c) { return prereqMet(c); });
  }
  // affinités du personnage : tableau de 6 (ordre renf, émi, trans, mani, conj,
  // spé) ; la spécialisation n'existe qu'avec l'avantage Spécialiste
  function archetypeObj() {
    for (var i = 0; i < (DATA.archetypes || []).length; i++) if (DATA.archetypes[i].name === state.archetype) return DATA.archetypes[i];
    return null;
  }
  function affinites() {
    // affinité = archétype + ajustement par catégorie (avantage « Affinité
    // supérieure », race, don du MJ) ; la spécialisation reste à 0 sans Spécialiste.
    var a = archetypeObj();
    return DATA.nenCats.map(function (cat, i) {
      if (cat === "spécialisation" && !hasSpecialiste()) return 0;
      var base = a ? (a.affinites[i] || 0) : 0;
      return Math.max(0, base + (state.affiniteDivers[cat] || 0));
    });
  }
  function affiniteCat(cat) { return affinites()[DATA.nenCats.indexOf(cat)] || 0; }
  // aura dérivée (aura.md)
  function tenBonus() { var v = state.techniques["Ten"]; return v && v !== true ? (TEN_RUA[v] || 0) : 0; }
  function renBonus() { var v = state.techniques["Ren"]; return v && v !== true ? (REN_UAR[v] || 0) : 0; }
  function baseRUA() { return 5 + tenBonus(); }
  function baseUAR() { return 5 + renBonus(); }
  function mulUAR() { return state.auraDev.uar || 0; }
  function mulRUA() { return (state.auraDev.rua || 0) + (state.auraDev.uar || 0); }   // acheter un Mul UAR monte aussi le Mul RUA
  function uamAuto() { return 1000 * prestige() + 200 * (state.auraDev.uam || 0); }
  function uarAuto() { return baseUAR() * (mulUAR() + 1); }
  function ruaAuto() { return baseRUA() * (mulRUA() + 1); }
  // valeurs d'aura : override manuel (don du MJ, avantage, règle maison) sinon calcul
  function uam() { return state.auraOverride.uam != null ? state.auraOverride.uam : uamAuto(); }
  function uar() { return state.auraOverride.uar != null ? state.auraOverride.uar : uarAuto(); }
  function rua() { return state.auraOverride.rua != null ? state.auraOverride.rua : ruaAuto(); }
  function auraDiSpent() { return AURA_COSTS.uar * (state.auraDev.uar || 0) + AURA_COSTS.rua * (state.auraDev.rua || 0) + AURA_COSTS.uam * (state.auraDev.uam || 0); }
  function auraDiCap() { return 30 * prestige(); }   // plafond 30 DI/prestige sur l'aura
  // DI dépensé : techniques (paliers + crans de rayon de l'En) + achats d'aura +
  // conversion en catégories (pool) + raccords des capacités. Le développement de
  // catégorie des capacités NE se compte PAS ici : il se paie sur le pool (diCatSpent).
  function techDiSpent() {
    var s = 0;
    for (var name in state.techniques) {
      var t = techByName(name);
      if (!t) continue;
      if (t.bloc) { s += t.cout || 0; }
      else {
        var r = techRank(name);
        for (var i = 0; i <= r; i++) s += (t.paliers[i] && t.paliers[i].cout) || 0;
      }
    }
    return s + enRayonDiSpent();
  }
  // Rayon de l'En (techniques-nen.md) : chaque cran au-delà du 1 m (compris dans
  // l'apprentissage) exige le précédent et coûte son DI ; débloqué seulement si l'En
  // est appris. L'« aura par tour » du cran est un drain d'UAD en jeu, PAS un coût.
  function enRayons() { var t = techByName("En"); return (t && t.rayons) || []; }
  function enRayonMax() { return Math.max(0, enRayons().length - 1); }
  function enRayonIdx() { return techRank("En") >= 0 ? clamp(state.enRayon || 0, 0, enRayonMax()) : 0; }
  function enRayonDiSpent() {
    if (techRank("En") < 0) return 0;
    var ry = enRayons(), s = 0;
    for (var i = 1; i <= enRayonIdx() && i < ry.length; i++) s += ry[i].coutDI || 0;
    return s;
  }
  function diCatSpent() { var s = 0; for (var k in state.diCat) s += state.diCat[k] || 0; return s; }
  // Développement de catégorie exigé par les capacités : points DR/DE… (dxByCat, calculés
  // dans l'Atelier), consommés sur le pool poolCat de la catégorie. La clé « raccord »
  // n'est pas une catégorie (modules structurels, comptés en DI brut à part).
  function capDevByCat(cat) {
    var s = 0;
    state.capacites.forEach(function (c) {
      if (c.report && c.report.dxByCat) s += c.report.dxByCat[cat] || 0;
    });
    return s;
  }
  // DI brut versé par les capacités = uniquement les modules SANS catégorie (raccords,
  // payés 1:1). Le développement de catégorie se paie via le pool (diCatSpent) que les
  // capacités consomment (capDevByCat), pas une 2e fois en DI. Repli : une capacité
  // enregistrée avant la ventilation (report.dxByCat absent) retombe sur son report.di
  // pour ne pas devenir gratuite (à ré-enregistrer depuis l'Atelier).
  function capRaccordDi() {
    var s = 0;
    state.capacites.forEach(function (c) {
      if (!c.report) return;
      if (c.report.dxByCat) s += c.report.dxByCat.raccord || 0;
      else s += c.report.di || 0;
    });
    return s;
  }
  function diSpent() { return techDiSpent() + auraDiSpent() + diCatSpent() + capRaccordDi(); }
  // pool développé dans une catégorie = DI investi × affinité d'apprentissage (arrondi inférieur)
  function poolCat(cat) { return Math.floor((state.diCat[cat] || 0) * affiniteCat(cat) / 100); }
  // libellé du coût d'une capacité = ventilation par catégorie (DR/DE… puisés au pool)
  // + le raccord en DI ; repli sur l'ancien report.di si la ventilation manque.
  function capCostLabel(r) {
    if (r && r.dxByCat) {
      var parts = [];
      DATA.nenCats.forEach(function (cat) { if (r.dxByCat[cat]) parts.push(r.dxByCat[cat] + " " + NEN_CAT_META[cat].sigle); });
      if (r.dxByCat.raccord) parts.push(r.dxByCat.raccord + " DI");
      return parts.join(" · ") || "0 DI";
    }
    return r && r.di != null ? r.di + " DI" : "";
  }
  function capId() { return "cap" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  // --- pont vers l'Atelier (page /creation/) ----------------------------------
  // On dépose un relais dans localStorage puis on navigue vers l'Atelier ; celui-ci
  // le lit au montage, ouvre le schéma, et à l'enregistrement réécrit un retour que
  // le créateur absorbe. Même famille de partage que forge-weapons / creation-cards.
  var HANDOFF = "nen-atelier-handoff", RETURN = "nen-atelier-return";
  function openAtelier(cap) {
    try {
      localStorage.setItem(HANDOFF, JSON.stringify({
        capId: cap.id, name: cap.name || "",
        returnTo: location.pathname + location.search,
        state: cap.atelier || null
      }));
    } catch (e) {}
    save();
    location.href = siteBase() + "creation/";
  }
  function absorbAtelierReturn() {
    var raw;
    try { raw = localStorage.getItem(RETURN); } catch (e) { return; }
    if (!raw) return;
    try { localStorage.removeItem(RETURN); } catch (e) {}
    var ret;
    try { ret = JSON.parse(raw); } catch (e) { return; }
    if (!ret || !ret.state) return;
    var cap = null;
    for (var i = 0; i < state.capacites.length; i++) if (state.capacites[i].id === ret.capId) cap = state.capacites[i];
    if (!cap) { cap = { id: ret.capId || capId(), name: "", atelier: null, report: null }; state.capacites.push(cap); }
    cap.atelier = ret.state;
    if (ret.report) { cap.report = ret.report; if (ret.report.name) cap.name = ret.report.name; }
    if (ret.name && !cap.name) cap.name = ret.name;
    if (!cap.name) cap.name = "Capacité";
    setTab("nen");
  }

  // --- règles : PF, niveau, compétences ----------------------------------------
  function niveau() { return Math.max(1, Math.ceil((state.pfTotal || 0) / 100)); }
  function compPfMax() { return 5 * niveau(); }   // 5 PF max par compétence et par niveau
  function compByName(name) {
    for (var i = 0; i < DATA.competences.length; i++) if (DATA.competences[i].name === name) return DATA.competences[i];
    return null;
  }
  function compBase(name) { return ((state.comps[name] || 0) / 5) * 20; }
  function diversOf(name) { return modSum(state.divers[name]); }
  function compTotal(name) {
    var c = compByName(name);
    if (!c) return 0;
    var abbr = caracAbbr(c.carac);
    return compBase(name) + modOf(caracVal(abbr)) + diversOf(name) + etatMalus(c) + clarteMalus(c);
  }

  // --- règles : états et clarté appliqués aux jets (etats.md, sens.md) ---------
  // Les « Situations » ne valent qu'en opposition à l'adversaire : elles ne
  // touchent pas les propres jets du personnage. Les « Autres états » (Paralysie,
  // À terre, Inconscience…) s'appliquent à ses compétences.
  function activeEtats() {
    var out = [];
    (DATA.etats || []).forEach(function (e) {
      var v = state.etatsActifs[e.name];
      if (!v || /situation/i.test(e.categorie || "")) return;
      var mods = e.mods;
      if (v !== true) e.paliers.forEach(function (p) { if (p.name === v) mods = p.mods; });
      out.push({ name: e.name, mods: mods || [] });
    });
    return out;
  }
  // clarté effective d'un sens = clarté choisie + mods d'état « Clarté des sens »
  // (l'Inconscience baisse tous les sens), bornée 0-10
  function clarteEtatMod() {
    var s = 0;
    activeEtats().forEach(function (e) { e.mods.forEach(function (m) { if (m.cible === "Clarté des sens") s += m.val; }); });
    return s;
  }
  function clarteOf(name) {
    var base = state.acuite[name] != null ? state.acuite[name] : 10;
    return clamp(base + clarteEtatMod(), 0, 10);
  }
  // Malus d'état sur une compétence : les cibles sont des groupes/noms
  // (Attaque, Défense, Physique, Sensoriel, Vocal, Initiative/Esquive/Parade).
  // Par état, un seul malus s'applique : le plus PRÉCIS qui désigne la compétence
  // (nom exact > groupe ciblé > Physique). Plusieurs états se cumulent.
  function etatCibleRank(cible, k) {
    if ((cible === "Initiative" || cible === "Esquive" || cible === "Parade") && k.name === cible) return 3;
    if ((cible === "Attaque" || cible === "Défense" || cible === "Sensoriel" || cible === "Vocal") && (k.groupes || []).indexOf(cible) >= 0) return 2;
    if (cible === "Physique" && (k.groupes || []).indexOf("Physique") >= 0) return 1;
    return 0;
  }
  function etatMalus(k) {
    if (!k || !k.groupes) return 0;   // compétences personnalisées : hors groupes
    var total = 0;
    activeEtats().forEach(function (e) {
      var best = null;
      e.mods.forEach(function (m) { var r = etatCibleRank(m.cible, k); if (r > 0 && (!best || r > best.r)) best = { r: r, val: m.val }; });
      if (best) total += best.val;
    });
    return total;
  }
  // Malus de clarté (sens.md). Une compétence du groupe Sensoriel PERÇOIT par son
  // sens (elle en porte le nom) : −20 par point de clarté manquant. Une compétence
  // du groupe Physique AGIT en s'appuyant sur la Vue par défaut : −10 par point de
  // clarté manquant de la Vue. Un jet ne subit qu'un seul des deux malus.
  function clarteMalus(k) {
    if (!k || !k.groupes) return 0;
    if (k.groupes.indexOf("Sensoriel") >= 0) return -20 * (10 - clarteOf(k.name));
    if (k.groupes.indexOf("Physique") >= 0) return -10 * (10 - clarteOf("Vue"));
    return 0;
  }
  // Points de fatigue courants : réserve dont le maximum est l'Endurance
  // (capacites-physiques.md) ; null = au maximum. Chaque point SOUS ZÉRO donne
  // −10 à tous les jets ; à −(fatigue max), le personnage s'effondre.
  // fatigue max = Endurance + bonus (avantage « Fatigue supérieure », don du MJ).
  function fatigueMax() { return caracVal("END") + (state.fatigueBonus || 0); }
  function fatiguePts() { return state.fatigue == null ? fatigueMax() : state.fatigue; }
  // Modificateurs qui pèsent sur TOUS les jets : réglage MJ/temporaire, et les
  // points de fatigue négatifs (−10 par point sous zéro).
  function modsGlobaux() { return (state.modGlobal || 0) + 10 * Math.min(0, fatiguePts()); }
  function pvCourant() { return state.pv == null ? pvMax() : state.pv; }
  var _abbrCache = null;
  function caracAbbr(nomComplet) {
    if (!_abbrCache) {
      _abbrCache = {};
      DATA.caracs.forEach(function (c) { _abbrCache[c.name] = c.abbr; });
    }
    return _abbrCache[nomComplet] || nomComplet;
  }
  function pfComps() {
    var s = 0;
    for (var k in state.comps) s += state.comps[k];
    state.customComps.forEach(function (c) { s += c.pf || 0; });
    return s;
  }
  function customTotal(c) { return ((c.pf || 0) / 5) * 20 + modOf(caracVal(c.carac)) + (c.divers || 0); }
  function pfFormations() {
    var s = 0;
    state.formations.forEach(function (f) {
      var d = formationByName(f.name);
      if (d && d.cout) s += d.cout;
    });
    return s;
  }
  function pfSpent() { return pfComps() + pfFormations(); }
  function formationByName(name) {
    for (var i = 0; i < DATA.formations.length; i++) if (DATA.formations[i].name === name) return DATA.formations[i];
    return null;
  }
  function formationCount(name) {
    return state.formations.filter(function (f) { return f.name === name; }).length;
  }
  // Attaque supplémentaire : 1 achat par tranche de 100 dans la MEILLEURE
  // compétence d'attaque (la plus haute, pas la somme). La valeur retenue est
  // celle de la compétence (base + modificateur), sans bonus divers ni global.
  var ATTAQUE_COMPS = ["Armes de mêlée", "Armes de jet", "Armes de trait", "Armes à feu"];
  function tranchesAttaque() {
    var best = 0;
    ATTAQUE_COMPS.forEach(function (n) {
      var c = compByName(n);
      if (!c) return;
      var t = compBase(n) + modOf(caracVal(caracAbbr(c.carac)));
      if (t > best) best = t;
    });
    return Math.floor(best / 100);
  }

  // --- règles : PV, taille, capacités ------------------------------------------
  function tailleCat() {
    for (var i = 0; i < DATA.tailles.length; i++) if (DATA.tailles[i].name === state.tailleCat) return DATA.tailles[i];
    return null;
  }
  function pvMaxAuto() {
    var t = tailleCat();
    return ((state.pvParNiveau || 0) + (t ? t.pvMod : 0)) * niveau();
  }
  function pvMax() {
    // override manuel des PV max (état, don du MJ, règle maison) s'il est posé ;
    // sinon la valeur calculée (PV par niveau + taille) × niveau.
    return state.pvMaxOverride != null ? state.pvMaxOverride : pvMaxAuto();
  }
  function capRow(key, val) {
    var c = DATA.capacites[key];
    if (!c) return null;
    return c.rows[clamp(val, 0, 30)];
  }

  // --- règles : armes et familiarité -------------------------------------------
  function armeByName(name) {
    for (var i = 0; i < DATA.armes.length; i++) if (DATA.armes[i].name === name) return DATA.armes[i];
    return null;
  }
  function couverture() {
    var armes = {}, familles = {}, jet = false, projectiles = false;
    if (state.armeDepart) armes[state.armeDepart] = 1;
    state.formations.forEach(function (f) {
      if ((f.name === "Arme proche" || f.name === "Arme étrangère") && f.choix) armes[f.choix] = 1;
      if (f.name === "Famille entière" && f.choix) familles[f.choix] = 1;
      if (f.name === "Armes de jet") jet = true;
      if (f.name === "Armes à projectiles") projectiles = true;
    });
    var pratiquees = {};   // familles contenant au moins une arme connue
    for (var n in armes) { var a = armeByName(n); if (a && a.famille) pratiquees[a.famille] = 1; }
    for (var fam in familles) pratiquees[fam] = 1;
    return { armes: armes, familles: familles, pratiquees: pratiquees, jet: jet, projectiles: projectiles };
  }
  // Malus de familiarité pour un TYPE D'EMPLOI donné (« Mêlée », « Jet », « Tir »,
  // « Parade ») : 0 connue, −20 même famille, −40 sinon. Les formations Armes de
  // jet et Armes à projectiles n'unifient que le JET D'ATTAQUE de leur type
  // (formations-martiales.md : « la justesse du lancer est acquise ») : elles ne
  // couvrent ni la mêlée ni la parade.
  function malusArme(arme, type) {
    if (!arme || arme.corps) return 0;
    var c = couverture();
    if (c.armes[arme.name] || c.familles[arme.famille]) return 0;
    if (type === "Jet" && c.jet && arme.portee && arme.portee.indexOf("Jet") >= 0) return 0;
    if (type === "Tir" && c.projectiles && arme.famille === "Armes de trait") return 0;
    return c.pratiquees[arme.famille] ? -20 : -40;
  }
  function argentDepense() {
    var s = 0;
    state.inventaire.forEach(function (it) { s += it.prix || 0; });
    return s;
  }
  // Types d'attaque qu'une arme permet (manoeuvres.md : « parmi ceux que l'arme
  // permet », inférés de la portée et de la famille) et leur compétence.
  function armeTypes(a) {
    var out = [];
    if (/Mêlée|Allonge/.test(a.portee)) out.push({ label: "Mêlée", comp: "Armes de mêlée" });
    if (/Jet/.test(a.portee)) out.push({ label: "Jet", comp: "Armes de jet" });
    if (/Tir|Cône/.test(a.portee)) {
      var feu = /poudre|feu|explosifs/i.test(a.famille || "");
      out.push({ label: "Tir", comp: feu ? "Armes à feu" : "Armes de trait" });
    }
    return out;
  }
  // Lourdeur (armes.md) : Force minimale 5/7/9 ; −20 à l'attaque par point manquant.
  function lourdeurMalus(a) {
    var min = /Extrêmement lourde/.test(a.props) ? 9 : /Très lourde/.test(a.props) ? 7 : /\bLourde\b/.test(a.props) ? 5 : 0;
    return min ? -20 * Math.max(0, min - caracVal("FOR")) : 0;
  }
  // Modificateur de dégâts (armes.md) : « ×N FOR » = N × mod de Force (de
  // Dextérité avec Finesse) ; « +X » = propulsion fixe ; une seule source.
  function modDegatsArme(a) {
    var mm = /×(\d)\s*FOR/.exec(a.mod || "");
    if (mm) {
      // Finesse (armes.md) : le porteur applique, au choix, son modificateur de
      // Dextérité au lieu de celui de Force → on retient le meilleur des deux.
      var useDex = /Finesse/.test(a.props) && modOf(caracVal("DEX")) > modOf(caracVal("FOR"));
      var carac = useDex ? "DEX" : "FOR";
      return { txt: "×" + mm[1] + " " + carac, val: +mm[1] * modOf(caracVal(carac)) };
    }
    var pm = /^\+(\d+)/.exec(a.mod || "");
    if (pm) return { txt: "propulsion", val: +pm[1] };
    return { txt: "", val: 0 };
  }

  // --- règles : arts ------------------------------------------------------------
  var PALIERS = ["Basique", "Avancé", "Expert"];
  function artByName(name) {
    for (var i = 0; i < DATA.arts.length; i++) if (DATA.arts[i].name === name) return DATA.arts[i];
    return null;
  }
  function frappeTxt(art, palier) {
    if (!art.frappe) return null;
    var key = palier === "Expert" ? "expert" : palier === "Avancé" ? "avance" : "basique";
    var f = art.frappe[key];
    if (!f) return null;
    var mod = modOf(caracVal("FOR"));
    return f[0] + " + ×" + f[1] + " FOR = " + (f[0] + f[1] * mod) +
      (art.frappeParties ? " (" + art.frappeParties + ")" : "");
  }
  // Prérequis d'un palier d'art : « Agilité 7, Lutte 100, Équilibre 60 ». Chaque
  // clause « Nom N » se vérifie contre la carac, la compétence, l'Éclat ou le
  // niveau du personnage ; les clauses libres (âge, condition de vie…) restent à
  // l'appréciation du MJ (renvoie null : ni remplie, ni manquante).
  function prereqParts(txt) {
    return txt.split(",").map(function (s) { return s.trim().replace(/\.$/, ""); })
      .filter(function (s) { return s && s.toLowerCase() !== "aucun"; });
  }
  function prereqOk(clause) {
    var m = clause.match(/^(.+?)\s+(\d+)$/);
    if (!m) return null;
    var name = m[1].trim().toLowerCase(), n = parseInt(m[2], 10);
    if (name === "éclat") return state.eclatA >= n;
    if (name === "niveau") return niveau() >= n;
    for (var i = 0; i < DATA.caracs.length; i++)
      if (DATA.caracs[i].name.toLowerCase() === name)
        return caracVal(DATA.caracs[i].abbr) >= n;
    for (var j = 0; j < DATA.competences.length; j++)
      if (DATA.competences[j].name.toLowerCase() === name)
        return compTotal(DATA.competences[j].name) >= n;
    return null;
  }

  // --- lanceur de dés et journal de jets -------------------------------------------
  // Jet = dé (configurable, défaut 1d100 : le seul dé que nomment les règles,
  // dans critique-blessures.md) + valeur de compétence + modificateur global.
  // Le journal vit en mémoire de session, il n'est pas exporté avec le personnage.
  var rollHistory = [];
  var rollPanel = null;
  function parseDice(expr) {
    var m = /^(\d{1,2})d(\d{1,4})([+-]\d{1,4})?$/.exec(String(expr || "").replace(/\s/g, ""));
    if (!m) return { n: 1, faces: 100, plus: 0 };
    return { n: clamp(+m[1], 1, 20), faces: clamp(+m[2], 2, 1000), plus: +(m[3] || 0) };
  }
  function bestDifficulty(total) {
    var best = null;
    DATA.difficultes.forEach(function (d) { if (total >= d.seuil && (!best || d.seuil > best.seuil)) best = d; });
    return best;
  }
  var spendSel = null;   // « se dépasser » : points de fatigue consommés sur le prochain jet
  function doRoll(label, value) {
    var global = modsGlobaux();   // avant dépense : le malus ne touche pas le jet qui crée les points
    var depense = spendSel ? clamp(num(spendSel.value, 0), 0, 5) : 0;
    if (depense) { state.fatigue = fatiguePts() - depense; if (spendSel) spendSel.value = "0"; }
    // Dans Roll20 (creator-boot.js pose window.__hxhRoll), le jet part dans le TCHAT
    // Roll20 — Roll20 lance les dés, résultat visible de tous — au lieu du journal
    // local du site. Sur le site, __hxhRoll n'existe pas : jet local comme avant.
    if (typeof window !== "undefined" && typeof window.__hxhRoll === "function") {
      window.__hxhRoll(state.de, value + global + 15 * depense, label);
      if (depense) refresh();
      return;
    }
    var d = parseDice(state.de);
    var dice = [];
    for (var i = 0; i < d.n; i++) dice.push(1 + Math.floor(Math.random() * d.faces));
    var sum = dice.reduce(function (a, b) { return a + b; }, 0) + d.plus;
    var total = sum + value + global + 15 * depense;
    rollHistory.unshift({
      label: label, dice: dice, sum: sum, plus: d.plus, value: value, global: global,
      depense: depense, total: total, palier: bestDifficulty(total)
    });
    if (rollHistory.length > 30) rollHistory.pop();
    renderRolls(true);
    if (depense) refresh();
  }
  function renderRolls(open) {
    if (!rollPanel) return;
    if (open) rollPanel.classList.add("open");
    var list = rollPanel.querySelector(".pc-rolls-list");
    list.innerHTML = "";
    if (!rollHistory.length) {
      list.appendChild(el("div", "pc-empty", "Aucun jet. Cliquer une valeur de compétence ou de combat pour lancer."));
      return;
    }
    rollHistory.forEach(function (r) {
      var row = el("div", "pc-roll");
      var head = el("div", "pc-roll-head");
      head.appendChild(el("span", "lbl", r.label));
      head.appendChild(el("span", "tot", String(r.total)));
      row.appendChild(head);
      var det = "dé " + r.dice.join(" + ") + (r.plus ? " " + signed(r.plus) : "") +
        (r.dice.length > 1 || r.plus ? " = " + r.sum : "") +
        " · valeur " + signed(r.value) +
        (r.global ? " · toutes actions " + signed(r.global) : "") +
        (r.depense ? " · dépassement +" + 15 * r.depense + " (" + r.depense + " pt" + (r.depense > 1 ? "s" : "") + ")" : "") +
        (r.palier ? " — atteint " + r.palier.name + " (" + r.palier.seuil + ")" : " — sous Triviale (0)");
      row.appendChild(el("div", "pc-roll-det", det));
      list.appendChild(row);
    });
  }
  var ROLL_HINT = "Cliquer pour lancer les dés.";
  function rollable(elm, labelFn, valueFn) {
    elm.classList.add("pc-rollable");
    elm.title = (elm.title ? elm.title + "\n" : "") + ROLL_HINT;
    elm.addEventListener("click", function () { doRoll(labelFn(), valueFn()); });
  }

  // --- avertissements -----------------------------------------------------------
  function warnings() {
    var w = [];
    if (caracSpent() > CARAC_POINTS) w.push("Le budget de caractéristiques est dépassé (" + caracSpent() + " / " + CARAC_POINTS + " points).");
    var cap = caracMax();
    var over = [];
    for (var k in state.caracs) if (state.caracs[k] > cap) over.push(k);
    if (over.length) w.push("Au-dessus du plafond de création (" + cap + ") : " + over.join(", ") + ".");
    if (pfSpent() > state.pfTotal) w.push("Les PF dépensés (" + pfSpent() + ") dépassent le capital (" + state.pfTotal + ").");
    if (avPtsSpent() > avPtsTotal()) w.push("Les points d'avantage dépensés (" + avPtsSpent() + ") dépassent le total (" + avPtsTotal() + ").");
    if (diSpent() > (state.diTotal || 0)) w.push("Le DI dépensé (" + diSpent() + ") dépasse le capital de développement intérieur (" + (state.diTotal || 0) + ").");
    if (auraDiSpent() > auraDiCap()) w.push("Développement de l'aura : " + auraDiSpent() + " DI dépassent le plafond de " + auraDiCap() + " DI (30 par prestige).");
    (DATA.techniques || []).forEach(function (t) {
      if (!state.techniques[t.name]) return;
      if (t.bloc) { if (!prereqAllMet(t.prereq)) w.push("Technique « " + t.name + " » : prérequis non rempli (" + t.prereq + ")."); return; }
      var r = techRank(t.name), pr = t.paliers[r];
      if (pr && !prereqAllMet(pr.prereq)) w.push("Technique « " + t.name + " " + t.paliers[r].niveau + " » : prérequis non rempli (" + pr.prereq + ").");
    });
    if (diCatSpent() > 0 && !hasHatsu()) w.push("La conversion du DI en catégories exige le Hatsu.");
    if (state.capacites.length && !hasHatsu()) w.push("Créer une capacité exige le Hatsu.");
    DATA.nenCats.forEach(function (cat) {
      var m = NEN_CAT_META[cat];
      if ((state.diCat[cat] || 0) > 0 && affiniteCat(cat) === 0)
        w.push("DI investi en " + cat + " sans affinité (archétype ou avantage Spécialiste manquant).");
      // Le développement de catégorie exigé par les capacités doit tenir dans le pool
      // converti (di.md : on dépense les points DR/DE… obtenus pour concevoir).
      var need = capDevByCat(cat);
      if (need > poolCat(cat))
        w.push("Développement " + m.sigle + " : les capacités exigent " + need + " " + m.sigle +
          " mais le pool converti n'est que de " + poolCat(cat) + " " + m.sigle + " (investir plus de DI en " + cat + ").");
    });
    // Archétypes de spécialisation : réservés à l'avantage Spécialiste (archetypes-nen.md).
    var aoSpe = archetypeObj();
    if (aoSpe && aoSpe.spe && !hasSpecialiste())
      w.push("Archétype « " + aoSpe.name + " » réservé à l'avantage Spécialiste : il ne peut pas être choisi sans lui.");
    var verrou = [];
    DATA.competences.forEach(function (k) { if (!compAccessible(k) && state.comps[k.name] > 0) verrou.push(k.name); });
    if (verrou.length) w.push("PF investis dans une compétence verrouillée par la forme : " + verrou.join(", ") + " (onglet Options pour l'autoriser).");
    var capPf = compPfMax(), overC = [];
    for (var n in state.comps) if (state.comps[n] > capPf) overC.push(n);
    state.customComps.forEach(function (c) { if ((c.pf || 0) > capPf) overC.push(c.name); });
    if (overC.length) w.push("Plus de " + capPf + " PF (5 par niveau) dans : " + overC.join(", ") + ".");
    var nAtk = formationCount("Attaque supplémentaire");
    if (nAtk > tranchesAttaque()) w.push("Attaque supplémentaire exige 100 points dans une même compétence d'attaque par achat (" + nAtk + " achat(s), " + tranchesAttaque() + " tranche(s) atteinte(s)).");
    // Arme proche exige une famille déjà pratiquée ; Arme étrangère, une famille
    // qui ne l'est pas encore. Le socle des familles pratiquées vient de l'arme
    // de départ, des Familles entières et des formations de famille ; les achats
    // s'y ajoutent ensuite dans l'ordre.
    var socle = {};
    var ad = armeByName(state.armeDepart);
    if (ad && ad.famille) socle[ad.famille] = 1;
    state.formations.forEach(function (f) {
      if (f.name === "Famille entière" && f.choix) socle[f.choix] = 1;
    });
    var vus = {};   // choix déjà pris (armes et familles)
    if (state.armeDepart) vus[state.armeDepart] = "l'arme de départ";
    state.formations.forEach(function (f) {
      var achat = f.name === "Arme proche" || f.name === "Arme étrangère" || f.name === "Famille entière";
      if (achat && !f.choix) { w.push(f.name + " : précisez l'arme ou la famille apprise."); return; }
      if (!achat || !f.choix) return;
      if (vus[f.choix]) w.push(f.name + " : « " + f.choix + " » est déjà " + vus[f.choix] + " (arme différente à chaque fois).");
      else vus[f.choix] = "apprise par une autre formation";
      var fam = null;
      if (f.name === "Famille entière") fam = f.choix;
      else { var a = armeByName(f.choix); fam = a && a.famille; }
      if (f.name === "Arme proche" && fam && !socle[fam]) w.push("Arme proche : « " + f.choix + " » (" + fam + ") vient d'une famille non pratiquée, il faut Arme étrangère (20 PF).");
      if (f.name === "Arme étrangère" && fam && socle[fam]) w.push("Arme étrangère : « " + f.choix + " » (" + fam + ") vient d'une famille déjà pratiquée, Arme proche suffit (10 PF).");
      if (fam) socle[fam] = 1;
    });
    if (argentDepense() > state.argent) w.push("L'équipement (" + fmt(argentDepense()) + " Ɉ) dépasse la bourse (" + fmt(state.argent) + " Ɉ).");
    if (state.eclatA !== state.eclatN && !COMPACT) w.push("Éclat actuel ≠ Éclat de Naissance : réservé aux bascules rares en cours de vie.");
    if (fatigueMax() > 0 && fatiguePts() <= -fatigueMax()) w.push("Points de fatigue à −" + fatigueMax() + " : le personnage s'effondre d'épuisement (Inconscience).");
    if (pvCourant() <= 0) w.push("PV courants à 0 ou moins.");
    return w;
  }

  // --- rafraîchissement global ---------------------------------------------------
  var warnBox = null, meterBox = null, libSelect = null;
  function refresh() {
    updaters.forEach(function (u) { u(); });

    if (meterBox) {
      meterBox.innerHTML = "";
      var meters = [["Caractéristiques", caracSpent(), CARAC_POINTS, "pts"],
       ["Points de formation", pfSpent(), state.pfTotal, "PF"]];
      if (hasNen() || state.diTotal) meters.push(["Développement intérieur", diSpent(), state.diTotal, "DI"]);
      meters.forEach(function (m) {
        var box = el("span", "pc-meter");
        box.appendChild(el("span", null, m[0]));
        var v = el("b", m[1] > m[2] ? "over" : "");
        v.textContent = fmt(m[1]) + " / " + fmt(m[2]) + " " + m[3];
        box.appendChild(v);
        var bar = el("span", "bar");
        var fill = el("i", m[1] > m[2] ? "over" : "");
        fill.style.width = clamp(m[2] ? (m[1] / m[2]) * 100 : 0, 0, 100) + "%";
        bar.appendChild(fill);
        box.appendChild(bar);
        meterBox.appendChild(box);
      });
    }

    if (warnBox) {
      warnBox.innerHTML = "";
      warnings().forEach(function (m) { warnBox.appendChild(el("div", "pc-warn", m)); });
    }

    if (libSelect) {
      var cur = libSelect.value;
      libSelect.innerHTML = "";
      var persos = loadPersos();
      var o0 = el("option"); o0.value = "";
      o0.textContent = "Personnages enregistrés (" + persos.length + ")";
      libSelect.appendChild(o0);
      persos.forEach(function (p) {
        var o = el("option"); o.value = p.id; o.textContent = p.name;
        libSelect.appendChild(o);
      });
      libSelect.value = cur && libSelect.querySelector('option[value="' + cur + '"]') ? cur : "";
    }

    save();
  }

  // --- fabriques ----------------------------------------------------------------
  function block(parent, title, sub, note) {
    var b = el("div", "pc-block");
    var t = el("div", "pc-block-title");
    t.appendChild(el("span", null, title));
    if (sub) t.appendChild(el("small", null, sub));
    b.appendChild(t);
    // note (mode d'emploi des règles) volontairement IGNORÉE : une fiche de
    // personnage ne porte que des données et des contrôles, jamais de prose
    // explicative (l'aide survit dans les tooltips). L'argument reste pour compat.
    void note;
    parent.appendChild(b);
    return b;
  }
  function idField(box, span, label, value, onInput, opts) {
    opts = opts || {};
    var f = el("div", "pc-f " + span);
    var lb = el("label", null, label);
    if (opts.tip) { lb.title = opts.tip; f.title = opts.tip; }
    f.appendChild(lb);
    var input;
    if (opts.ro) {
      input = el("span", "pc-ro", value == null ? "" : String(value));
    } else if (opts.options) {
      input = el("select");
      opts.options.forEach(function (o) {
        var e = el("option"); e.value = o[0]; e.textContent = o[1];
        if (String(o[0]) === String(value)) e.selected = true;
        input.appendChild(e);
      });
      input.addEventListener("change", function () { onInput(input.value); refresh(); });
    } else {
      input = el("input");
      input.type = opts.type || "text";
      if (opts.min != null) input.min = opts.min;
      if (opts.placeholder) input.placeholder = opts.placeholder;
      input.value = value == null ? "" : value;
      input.addEventListener("input", function () { onInput(input.value); refresh(); });
    }
    f.appendChild(input);
    box.appendChild(f);
    return input;
  }
  function stepper(parent, get, set, min, max) {
    var box = el("span", "pc-step");
    var minus = el("button", null, "−"); minus.type = "button";
    var val = el("span", "v", String(get()));
    var plus = el("button", null, "+"); plus.type = "button";
    function sync() {
      val.textContent = String(get()).replace("-", "−");
      minus.disabled = get() <= min();
      plus.disabled = get() >= max();
    }
    minus.addEventListener("click", function () { if (get() > min()) { set(get() - 1); sync(); refresh(); } });
    plus.addEventListener("click", function () { if (get() < max()) { set(get() + 1); sync(); refresh(); } });
    box.appendChild(minus); box.appendChild(val); box.appendChild(plus);
    parent.appendChild(box);
    updaters.push(sync);
    return box;
  }

  // Modificateurs MULTIPLES : rend `count` petits champs ± liés au tableau
  // obj[key] (une source par slot) ; le total effectif = somme (modSum). Un ancien
  // nombre unique est absorbé dans le slot 0. La clé est retirée si tout est nul.
  function multiMod(parent, obj, key, count, opts) {
    opts = opts || {};
    for (var i = 0; i < count; i++) {
      (function (idx) {
        var inp = el("input", "pc-comp-div pc-cdiv pc-mmod");
        inp.type = "number"; inp.placeholder = opts.ph || "±";
        inp.title = (opts.title || "Bonus ou malus divers (équipement, art, décision du MJ).") + " — modificateur " + (idx + 1) + " sur " + count + " ; les modificateurs s'additionnent.";
        var arr = obj[key];
        inp.value = (Array.isArray(arr) && arr[idx]) ? arr[idx] : "";
        inp.addEventListener("input", function () {
          var a = Array.isArray(obj[key]) ? obj[key] : (obj[key] ? [obj[key]] : []);
          while (a.length <= idx) a.push(0);
          a[idx] = num(inp.value, 0);
          obj[key] = a;
          var any = false; for (var j = 0; j < a.length; j++) if (a[j]) any = true;
          if (!any) delete obj[key];
          refresh();
        });
        parent.appendChild(inp);
      })(i);
    }
  }

  // --- en-tête d'identité ---------------------------------------------------------
  function buildHead(sheet) {
    var head = el("div", "pc-head");
    var brand = el("div", "pc-brand");
    function syncBrand() {
      brand.innerHTML = "";
      if (state.portrait) {
        var img = el("img", "pc-portrait");
        img.src = state.portrait;
        img.alt = state.name || "Portrait";
        img.addEventListener("error", function () { img.style.display = "none"; });
        brand.appendChild(img);
      } else {
        brand.appendChild(el("span", "b1", "HxH"));
        brand.appendChild(el("span", "b2", "Système JDR"));
      }
      var pb = el("button", "pc-portrait-btn", state.portrait ? "changer" : "portrait…");
      pb.type = "button";
      pb.title = "Image du personnage (adresse d'une image en ligne).";
      pb.addEventListener("click", function () {
        var url = prompt("Adresse (URL) de l'image du personnage — vide pour retirer :", state.portrait || "");
        if (url === null) return;
        url = url.trim();
        if (url.length > 2000) { alert("Adresse trop longue : héberger l'image et coller son URL (pas l'image elle-même)."); return; }
        if (url && !/^https?:\/\//i.test(url)) { alert("L'adresse doit commencer par http:// ou https://."); return; }
        state.portrait = url;
        syncBrand(); refresh();
      });
      brand.appendChild(pb);
    }
    syncBrand();
    head.appendChild(brand);

    var grid = el("div", "pc-id");
    idField(grid, "c4", "Nom", state.name, function (v) { state.name = v; });
    idField(grid, "c2", "Classe", state.classe, function (v) { state.classe = v; },
      { tip: "Les classes sont en chantier dans les règles : champ libre." });
    idField(grid, "c2", "Genre", state.genre, function (v) { state.genre = v; });
    if (DATA.formes && DATA.formes.length) {
      var formeIn = idField(grid, "c4", "Forme", state.forme, function (v) {
        state.forme = v;
        if (rebuildSens) rebuildSens();
      }, {
        options: DATA.formes.map(function (f) { return [f.name, f.name]; }),
        tip: "Le plan de corps (formes.md) : il ajuste les caractéristiques physiques, fixe le niveau de chaque sens et les milieux de déplacement. L'humain est le Bipède à bras ; la taille se règle à part."
      });
      updaters.push(function () {
        var f = formeCur();
        if (!f) return;
        var mb = Object.keys(f.membres || {});
        formeIn.title = (f.exemples ? "Exemples : " + f.exemples + "\n" : "") +
          "Respiration : " + (f.respiration || "aucune") + " · alimentation : " + (f.alimentation || "aucune") +
          (f.propriete ? " · " + f.propriete : "") +
          (mb.length ? "\nMembres : " + mb.map(function (m) { return f.membres[m] + " " + m.toLowerCase(); }).join(", ") : "\nAucun membre");
      });
    }

    idField(grid, "c2", "Âge", state.age, function (v) { state.age = v; });
    idField(grid, "c2", "Taille (m)", state.tailleCm, function (v) { state.tailleCm = v; }, { placeholder: "1.75" });
    idField(grid, "c2", "Poids (kg)", state.poids, function (v) { state.poids = v; }, { placeholder: "70" });
    idField(grid, "c3", "Catégorie", state.tailleCat, function (v) { state.tailleCat = v; }, {
      options: DATA.tailles.map(function (t) {
        return [t.name, COMPACT ? t.name : t.name + (t.pvMod ? " (" + signed(t.pvMod) + " PV/niv)" : "")];
      }),
      tip: "La taille fixe l'espace, l'allonge et le modificateur de PV. Moyenne = référence humaine (1.4 à 2.5 m)."
    });
    idField(grid, "c3", "Bourse (Ɉ)", state.argent, function (v) { state.argent = num(v, 0); },
      { type: "number", min: 0, tip: "Argent de départ, au choix du MJ. 1 Ɉ = 1 yen." });

    idField(grid, "c4", "Éclat de Naissance", state.eclatN, function (v) {
      var suit = state.eclatA === state.eclatN;   // l'actuel suit la naissance tant qu'on n'y a pas touché
      state.eclatN = num(v, 0);
      if (suit) state.eclatA = state.eclatN;
    }, { type: "number", min: 0, tip: "L'Éclat de naissance, au choix du MJ : 10 ou 15 pour la plupart, 20-25 pour les prodiges." });
    var eclatAIn = idField(grid, "c2", "Éclat actuel", state.eclatA, function (v) { state.eclatA = Math.max(0, num(v, 0)); },
      { type: "number", min: 0, tip: "Il part de l'Éclat de Naissance ; seules de rares bascules l'en écartent. Entre deux paliers, on retient le palier inférieur." });
    idField(grid, "c2", "Capital PF", state.pfTotal, function (v) { state.pfTotal = num(v, 0); },
      { type: "number", min: 0, tip: "Capital de points de formation, au choix du MJ. Niveau = ⌈PF ÷ 100⌉." });
    idField(grid, "c2", "PV / niveau", state.pvParNiveau, function (v) { state.pvParNiveau = num(v, 0); },
      { type: "number", min: 0, tip: "Viendra des classes (en chantier) : champ réglable." });
    var nivRo = idField(grid, "c2", "Niveau", niveau(), null, { ro: true });
    updaters.push(function () {
      nivRo.textContent = String(niveau());
      if (document.activeElement !== eclatAIn) eclatAIn.value = state.eclatA;
    });

    head.appendChild(grid);
    sheet.appendChild(head);

    meterBox = el("div", "pc-meters");
    sheet.appendChild(meterBox);
  }

  // --- onglets ---------------------------------------------------------------------
  function buildTabs(sheet) {
    var defs = [
      ["general", "Général"],
      ["formations", "Formations & Arts"],
      ["nen", "Nen"],
      ["options", "Options"]
    ];
    var bar = el("div", "pc-tabs");
    var panes = {};
    var btns = {};
    defs.forEach(function (d) {
      var t = el("div", "pc-tab", d[1]);
      t.setAttribute("data-tab", d[0]);
      t.addEventListener("click", function () { show(d[0]); });
      bar.appendChild(t);
      btns[d[0]] = t;
      panes[d[0]] = el("div", "pc-pane");
    });
    // bandeau collant : budgets + onglets + avertissements restent visibles en défilant
    var stick = el("div", "pc-stick");
    if (meterBox && meterBox.parentNode) stick.appendChild(meterBox);   // déplace les budgets dans le bandeau
    stick.appendChild(bar);
    warnBox = el("div", "pc-warns");
    stick.appendChild(warnBox);
    sheet.appendChild(stick);
    defs.forEach(function (d) { sheet.appendChild(panes[d[0]]); });
    function show(id) {
      defs.forEach(function (d) {
        btns[d[0]].classList.toggle("on", d[0] === id);
        panes[d[0]].classList.toggle("on", d[0] === id);
      });
      setTab(id);
    }
    show(panes[curTab()] ? curTab() : "general");
    return panes;
  }

  // --- onglet Général -----------------------------------------------------------
  // Trois colonnes façon fiche Anima : deux colonnes étroites (caractéristiques,
  // éclat, combat, capacités, sens) et une colonne LARGE pour les compétences,
  // comme la colonne Secondary Abilities de la fiche de référence.
  function buildGeneral(pane) {
    var cols = el("div", "pc-cols3 pc-cols-gen");
    var colA = el("div", "pc-col"), colB = el("div", "pc-col"), colC = el("div", "pc-col pc-col-comps");
    cols.appendChild(colA); cols.appendChild(colB); cols.appendChild(colC);
    pane.appendChild(cols);

    // ----- colonne A : caractéristiques + éclat + notes -----
    var bC = block(colA, "Caractéristiques", null,
      "60 points · chaque carac de 3 à 9 · le modificateur (à droite) est le nombre ajouté aux jets");
    [["physique", "Physiques"], ["mentale", "Mentales"]].forEach(function (grp) {
      bC.appendChild(el("div", "pc-carac-grp", grp[1]));
      DATA.caracs.filter(function (k) { return k.groupe === grp[0]; }).forEach(function (k) {
        // mini-tuile à deux lignes : (abréviation + nom + modificateur) puis
        // (stepper de valeur + ±) — reste lisible même à la largeur des règles
        var row = el("div", "pc-carac-row");
        var top = el("div", "pc-carac-top");
        top.appendChild(el("span", "pc-abbr", k.abbr));
        var nm = el("span", "nm", k.name);
        nm.title = k.desc;
        top.appendChild(nm);
        row.appendChild(top);
        var bot = el("div", "pc-carac-bot");
        stepper(bot,
          function () { return caracBase(k.abbr); },
          function (v) { state.caracs[k.abbr] = v; },
          function () { return CARAC_MIN; },
          function () { return caracMax(); });
        // trois zones de modificateurs (équipement, art, MJ…), sommées dans la valeur effective
        multiMod(bot, state.caracDivers, k.abbr, 3,
          { title: "Modificateur divers à la caractéristique (équipement, art, décision du MJ) : change la valeur effective, pas le coût en points." });
        row.appendChild(bot);
        // valeur effective (score final, base + forme + divers) affichée en clair à
        // gauche, puis le modificateur de jet à droite ; l'effective passe en accent
        // quand elle diffère de la base achetée
        var cval = el("span", "pc-cval");
        cval.title = "Valeur effective de la caractéristique (base + forme + divers).";
        var mod = el("span", "pc-cmod");
        var modV = el("b", null, "");
        mod.appendChild(modV);
        rollable(mod, function () { return "Modificateur de " + k.name; }, function () { return modOf(caracVal(k.abbr)); });
        updaters.push(function () {
          var eff = caracVal(k.abbr), m = modOf(eff), adj = eff !== caracBase(k.abbr);
          cval.textContent = String(eff);
          cval.classList.toggle("adj", adj);
          modV.textContent = signed(m);
          mod.classList.toggle("neg", m < 0);
          mod.title = "Modificateur ajouté aux jets · valeur effective " + eff +
            (adj ? " (base " + caracBase(k.abbr) + " ajustée par la forme ou le divers)" : "") + "\n" + ROLL_HINT;
        });
        top.appendChild(cval);
        top.appendChild(mod);
        bC.appendChild(row);
      });
    });
    // écarts du plan de corps : comptés dans la valeur effective, rappelés ici
    var formeNote = el("div", "pc-block-note");
    formeNote.style.marginTop = ".25rem";
    bC.appendChild(formeNote);
    updaters.push(function () {
      var f = formeCur(), parts = [];
      if (f) DATA.caracs.forEach(function (k) {
        if (f.caracs && f.caracs[k.abbr]) parts.push(k.abbr + " " + signed(f.caracs[k.abbr]));
      });
      formeNote.textContent = parts.length
        ? "Écarts de la forme " + f.name + " : " + parts.join(" · ") + " (comptés dans la valeur effective)."
        : "";
    });

    // Bloc Éclat (palier + description/rareté du livre) : c'est de la lecture de
    // règles, retiré de la fiche condensée — l'Éclat se règle dans l'en-tête.
    if (!COMPACT) {
      // Bloc Éclat COMPACT : le palier (tier de prestige, il gouverne les points
      // d'avantage) en sous-titre du bloc ; la saveur du livre reste en infobulle.
      // Plus de ligne « Naissance » (inutile) ni de paragraphe de lecture.
      var bE = block(colA, "Éclat", " ");
      var eSub = bE.querySelector(".pc-block-title small");
      var note = el("div", "pc-block-note");
      bE.appendChild(note);
      updaters.push(function () {
        var palier = Math.floor(clamp(state.eclatA, 0, 999) / 5) * 5;
        if (eSub) eSub.textContent = "Palier " + palier;
        var t = null;
        for (var i = 0; i < DATA.eclat.length; i++)
          if (DATA.eclat[i].val <= state.eclatN) t = DATA.eclat[i];
        if (t) bE.title = t.desc;
        note.textContent = state.eclatA > 50
          ? "Au-delà de 50, le livre ne fixe plus de répartition de création : l'outil reprend la ligne 45-50, au cadre du MJ."
          : "";
      });
    }

    // Avantages : catalogue du livre (avantages.md, coûts comptés) + lignes
    // libres pour ce que la page ne couvre pas encore
    var bAv = block(colA, "Avantages", " ",
      "Les points d'avantage suivent le plus haut palier d'Éclat atteint (palier inférieur). La liste du livre s'étoffe : lignes libres pour le reste, à valider avec le MJ.");
    var avSub = bAv.querySelector(".pc-block-title small");
    updaters.push(function () {
      if (avSub) avSub.textContent = avPtsSpent() + " / " + avPtsTotal() + " pts";
    });
    // ± sur le TOTAL de points (plus haut palier d'Éclat atteint dans le passé, dons
    // du MJ) : ligne étiquetée dédiée dans le corps, pas entassée dans le titre (elle
    // y écrasait le compteur, qui se cassait sur trois lignes).
    var avAdj = el("div", "pc-av-adj");
    avAdj.appendChild(el("span", "l", "Ajuster le total"));
    var avDv = el("input", "pc-comp-div");
    avDv.type = "number"; avDv.placeholder = "±";
    avDv.value = state.avPtsDivers || "";
    avDv.title = "Ajustement du total de points d'avantage : plus haut palier d'Éclat atteint dans le passé, dons du MJ.";
    avDv.addEventListener("input", function () { state.avPtsDivers = num(avDv.value, 0); refresh(); });
    avAdj.appendChild(avDv);
    bAv.appendChild(avAdj);
    var avList = el("div", "pc-forma-buys");
    bAv.appendChild(avList);
    function renderAv() {
      avList.innerHTML = "";
      state.avantages.forEach(function (av) {
        var line = el("div", "pc-forma-buy");
        var book = avByName(av.name);
        if (book) {
          var nmSp = el("span", null, book.name);
          nmSp.style.flex = "0 1 38%"; nmSp.style.fontWeight = "700"; nmSp.style.cursor = "help";
          nmSp.title = book.desc;
          line.appendChild(nmSp);
          if ((book.coutMax || book.cout) > book.cout) {
            // coût variable : le joueur règle les points dépensés dans la fourchette
            var cIn = el("input", "pc-comp-div");
            cIn.type = "number"; cIn.min = book.cout; cIn.max = book.coutMax;
            cIn.value = typeof av.cout === "number" ? av.cout : book.cout;
            cIn.title = "Points dépensés (" + book.coutTxt + ").";
            cIn.style.flex = "0 0 1.8rem";
            cIn.addEventListener("input", function () {
              av.cout = clamp(num(cIn.value, book.cout), book.cout, book.coutMax);
              refresh(); save();
            });
            line.appendChild(cIn);
            line.appendChild(el("span", "pc-av-cout", "/ " + book.coutMax + " pts"));
          } else {
            line.appendChild(el("span", "pc-av-cout", book.coutTxt || book.cout + " points"));
          }
        } else {
          var nmIn = el("input"); nmIn.type = "text"; nmIn.placeholder = "Nom";
          nmIn.value = av.name || ""; nmIn.style.flex = "0 1 38%"; nmIn.style.fontWeight = "700";
          nmIn.addEventListener("input", function () { av.name = nmIn.value; save(); });
          line.appendChild(nmIn);
        }
        var ntIn = el("input"); ntIn.type = "text"; ntIn.placeholder = book ? "Note" : "Effet, note";
        ntIn.value = av.note || "";
        ntIn.addEventListener("input", function () { av.note = ntIn.value; save(); });
        line.appendChild(ntIn);
        var db = el("button", "pc-mini danger", "×"); db.type = "button"; db.title = "Retirer";
        db.addEventListener("click", function () {
          var i = state.avantages.indexOf(av);
          if (i >= 0) state.avantages.splice(i, 1);
          renderAv(); refresh(); save();
        });
        line.appendChild(db);
        avList.appendChild(line);
      });
      if (DATA.avantages && DATA.avantages.liste && DATA.avantages.liste.length) {
        var sel = el("select", "pc-select");
        var o0 = el("option"); o0.value = ""; o0.textContent = "— prendre un avantage du livre —";
        sel.appendChild(o0);
        DATA.avantages.liste.forEach(function (a) {
          var o = el("option"); o.value = a.name;
          o.textContent = a.name + " (" + (a.coutTxt || a.cout + " points") + ")";
          o.title = a.desc;
          sel.appendChild(o);
        });
        sel.addEventListener("change", function () {
          if (!sel.value) return;
          state.avantages.push({ name: sel.value, note: "" });
          sel.value = "";
          renderAv(); refresh(); save();
        });
        avList.appendChild(sel);
      }
      var add = el("button", "pc-mini", "+ Ajouter une ligne libre"); add.type = "button";
      add.addEventListener("click", function () { state.avantages.push({ name: "", note: "" }); renderAv(); save(); });
      avList.appendChild(add);
    }
    renderAv();

    var bN = block(colA, "Notes et histoire");
    var ta = el("textarea", "pc-notes");
    ta.value = state.notes;
    ta.addEventListener("input", function () { state.notes = ta.value; save(); });
    bN.appendChild(ta);

    // ----- colonne B : capacités physiques + combat + sens -----
    // étiquettes compactes pour les colonnes longues du livre
    var SHORT = {
      "Intermédiaire": "Interm.",
      "Temps de sommeil": "Sommeil",
      "Activité intermédiaire": "Act. inter.", "Activité lourde": "Act. lourde",
      "Avant de pouvoir redormir": "Redormir", "Avant d'être fatigué": "Fatigué"
    };
    // les étiquettes de colonnes viennent des tables du livre (cap.cols), via
    // SHORT pour les intitulés longs : elles suivent les règles sans double saisie
    var capDefs = [
      ["mouvement", "Mouvement", null, "Distance par round (~6 s) selon l'allure d'activité."],
      ["saut", "Saut", null, "Longueur de saut, sans élan et avec élan (Saut = Force)."],
      ["port", "Port", null, "Charge selon l'allure d'activité : portée, maniée, soulevée."],
      ["lancer", "Lancer", null, "Multiplicateur des portées de jet et de tir des armes que les muscles propulsent (Lancer = Force)."],
      ["apnee", "Apnée", null, "Souffle retenu, selon l'activité du moment."],
      ["pression", "Pression", null, "Profondeur d'eau supportée selon l'allure (Pression = Endurance)."],
      ["repos", "Repos", null, "Sommeil requis par jour, veille tenable avant de devoir redormir, et délai avant d'être fatigué."],
      ["fond", "Fond", null, "Durées d'activité intermédiaire et lourde qu'un personnage peut fournir dans sa journée sans risque."]
    ];
    // une seule carte à sous-sections (bloc de stats compact)
    var bCap = block(COMPACT ? colA : colB, "Capacités physiques", null,
      "Distances et durées selon l'allure ; le ± décale la ligne lue (états, arts, MJ).");
    capDefs.forEach(function (d) {
      var cap = DATA.capacites[d[0]];
      if (!cap) return;
      // MOUVEMENT À TROIS MILIEUX : le bloc Mouvement d'origine (nom + 3 modificateurs
      // en crans + tuiles de distance) est répliqué tel quel une fois par milieu
      // (Terrestre / Aquatique / Aérien). Chaque milieu se lit à SA ligne = Agilité +
      // accès de la forme (formes.md §Le déplacement : rampe −4, patauge −3, vol si
      // aile) + ses trois modificateurs propres. Terre et eau toujours praticables ;
      // les airs sont fermés à une forme sans aile.
      if (d[0] === "mouvement") {
        var MIL = [
          { key: "terre", lbl: "Terrestre",
            access: function (m, f) { return m["Patte / jambe"] ? { mod: 0, note: "" } : { mod: -4, note: "rampe" }; } },
          { key: "eau", lbl: "Aquatique",
            access: function (m, f) { return (m["Nageoire"] || m["Tentacule"] || f.propriete) ? { mod: 0, note: "" } : { mod: -3, note: "patauge" }; } },
          { key: "air", lbl: "Aérien",
            access: function (m, f) { return m["Aile"] ? { mod: 0, note: "" } : { closed: true }; } }
        ];
        var mvtLabels = cap.cols.map(function (c) { return SHORT[c] || c; });
        // en-tête de groupe : les trois sous-sections qui suivent sont le Mouvement
        bCap.appendChild(el("div", "pc-comp-champ", "Mouvement"));
        MIL.forEach(function (mi) {
          var sec = el("div", "pc-capsec");
          sec.title = "Mouvement " + mi.lbl.toLowerCase() + " : distance franchie par round selon l'allure.";
          var h = el("div", "pc-capsec-head");
          h.appendChild(el("span", "nm", mi.lbl));
          var sub = el("span", "sub", "");
          h.appendChild(sub);
          var cdvWrap = el("span", "pc-capsec-mods");
          multiMod(cdvWrap, state.mvtDivers, mi.key, 3,
            { ph: "±", title: "Modificateur en crans au mouvement " + mi.lbl.toLowerCase() + " (art, Nen, terrain, décision du MJ) : décale la ligne lue pour ce seul milieu." });
          h.appendChild(cdvWrap);
          sec.appendChild(h);
          var row = el("div", "pc-cap3");
          var cells = [];
          mvtLabels.forEach(function (lbl) {
            var c = el("div", "c");
            c.appendChild(el("span", "k", lbl));
            var v = el("span", "v", "");
            c.appendChild(v);
            cells.push(v);
            row.appendChild(c);
          });
          sec.appendChild(row);
          updaters.push(function () {
            var f = formeCur() || {};
            var acc = mi.access(f.membres || {}, f);
            var base = caracVal(cap.carac);
            var extra = modSum(state.mvtDivers[mi.key]);
            if (acc.closed) {
              sec.classList.add("closed");
              sub.textContent = cap.carac + " " + base;
              cells.forEach(function (c) { c.textContent = "—"; });
              return;
            }
            sec.classList.remove("closed");
            var line = base + acc.mod + extra;
            var r = capRow("mouvement", line) || [];
            cells.forEach(function (c, i) { c.textContent = r[i] || "—"; });
            sub.textContent = cap.carac + " " + base +
              (extra ? " · " + signed(extra) + " cran" + (Math.abs(extra) > 1 ? "s" : "") : "");
          });
          bCap.appendChild(sec);
        });
        return;
      }

      var sec = el("div", "pc-capsec");
      sec.title = d[3];
      var h = el("div", "pc-capsec-head");
      h.appendChild(el("span", "nm", d[1]));
      var sub = el("span", "sub", "");
      h.appendChild(sub);
      // trois zones de modificateurs en crans (états, arts, MJ), sommées : décalent la ligne lue
      var cdvWrap = el("span", "pc-capsec-mods");
      multiMod(cdvWrap, state.capDivers, d[0], 3,
        { ph: "±", title: "Modificateur en crans à cette capacité (états, arts, décision du MJ) : décale la ligne lue dans la table 0-30, sans toucher la caractéristique ni les jets." });
      h.appendChild(cdvWrap);
      sec.appendChild(h);
      var labels = d[2] || cap.cols.map(function (c) { return SHORT[c] || c; });
      var row = el("div", "pc-cap3" + (labels.length > 3 ? " pc-cap5" : labels.length === 2 ? " pc-cap2" : labels.length === 1 ? " pc-cap1" : ""));
      var cells = [];
      labels.forEach(function (lbl) {
        var c = el("div", "c");
        c.appendChild(el("span", "k", lbl));
        var v = el("span", "v", "");
        c.appendChild(v);
        cells.push(v);
        row.appendChild(c);
      });
      sec.appendChild(row);
      updaters.push(function () {
        var dv = modSum(state.capDivers[d[0]]);
        sub.textContent = cap.carac + " " + caracVal(cap.carac) + (dv ? " · " + signed(dv) + " cran" + (Math.abs(dv) > 1 ? "s" : "") : "");
        var r = capRow(d[0], capVal(d[0])) || [];
        cells.forEach(function (cell, i) { cell.textContent = r[i] || "—"; });
      });
      bCap.appendChild(sec);
    });
    // Fiche condensée : les capacités rejoignent les caractéristiques en tête de colonne A ;
    // on redescend avantages et notes en bas (ordre naturel d'une fiche).
    if (COMPACT) { colA.appendChild(bAv); colA.appendChild(bN); }

    var bF = block(colB, "Combat", null, "Valeurs = compétence + carac + divers + modificateur à toutes les actions ; cliquer pour lancer.");
    var bigrow = el("div", "pc-bigrow pc-bigrow-4");
    // tuile PV (courants / max) en tête, avec les trois jets défensifs
    var pvBox = el("div", "pc-big red");
    pvBox.appendChild(el("span", "k", "PV"));
    var pvBigV = el("span", "v", "");
    pvBox.appendChild(pvBigV);
    pvBox.title = "PV courants / PV max (édition sous les tuiles)";
    bigrow.appendChild(pvBox);
    updaters.push(function () { pvBigV.textContent = fmt(pvCourant()) + " / " + fmt(pvMax()); });
    [["Initiative", "Initiative"], ["Esquive", "Esquive"], ["Parade", "Parade"]].forEach(function (d) {
      var box = el("div", "pc-big");
      box.appendChild(el("span", "k", d[0]));
      var v = el("span", "v", "");
      box.appendChild(v);
      updaters.push(function () {
        v.textContent = signed(compTotal(d[1]) + modsGlobaux());
        box.title = "Compétence " + signed(compTotal(d[1])) +
          (modsGlobaux() ? " · toutes actions " + signed(modsGlobaux()) : "") + "\n" + ROLL_HINT;
      });
      rollable(box, function () { return d[0]; }, function () { return compTotal(d[1]); });
      bigrow.appendChild(box);
    });
    bF.appendChild(bigrow);

    // PV courants (édition : input + max), attaché à la tuile PV
    var pvKv = el("div", "pc-kv");
    pvKv.appendChild(el("span", "k", "PV courants"));
    var pvIn = el("input", "pc-comp-div");
    pvIn.type = "number";
    pvIn.title = "PV du moment ; vide ou « max » = au maximum.";
    pvIn.addEventListener("input", function () {
      state.pv = pvIn.value === "" ? null : num(pvIn.value, 0);
      refresh();
    });
    pvKv.appendChild(pvIn);
    var pvMaxB = el("button", "pc-mini", "max"); pvMaxB.type = "button";
    pvMaxB.title = "Remettre les PV au maximum";
    pvMaxB.addEventListener("click", function () { state.pv = null; pvIn.value = ""; refresh(); });
    pvKv.appendChild(pvMaxB);
    bF.appendChild(pvKv);
    updaters.push(function () {
      if (document.activeElement !== pvIn) pvIn.value = state.pv == null ? "" : state.pv;
    });

    // PV max éditables : vide = calculé (PV par niveau × niveau + taille), une
    // valeur force le maximum (état, don du MJ, règle maison).
    var pvMaxKv = el("div", "pc-kv");
    pvMaxKv.appendChild(el("span", "k", "PV max"));
    var pvMaxIn = el("input", "pc-comp-div");
    pvMaxIn.type = "number";
    pvMaxIn.title = "PV maximum. Vide = valeur calculée (PV par niveau × niveau + taille) ; une valeur la force (état, don du MJ, règle maison).";
    pvMaxIn.addEventListener("input", function () {
      state.pvMaxOverride = pvMaxIn.value === "" ? null : num(pvMaxIn.value, 0);
      refresh();
    });
    pvMaxKv.appendChild(pvMaxIn);
    bF.appendChild(pvMaxKv);
    updaters.push(function () {
      if (document.activeElement !== pvMaxIn) {
        pvMaxIn.value = state.pvMaxOverride == null ? "" : state.pvMaxOverride;
        pvMaxIn.placeholder = String(pvMaxAuto());
      }
    });

    // modificateur à toutes les actions (blessures, circonstances, décision du MJ)
    var gm = el("div", "pc-kv");
    gm.appendChild(el("span", "k", "Mod. à toutes les actions"));
    var gmIn = el("input", "pc-comp-div");
    gmIn.type = "number"; gmIn.placeholder = "±";
    gmIn.value = state.modGlobal || "";
    gmIn.title = "S'ajoute à tous les jets (Initiative, Esquive, Parade et le reste) : malus de blessures, circonstances, décision du MJ.";
    gmIn.addEventListener("input", function () { state.modGlobal = num(gmIn.value, 0); refresh(); });
    gm.appendChild(gmIn);
    bF.appendChild(gm);

    // Points de fatigue : réserve (max = Endurance + bonus), consommables +15/point
    // sur un jet (5 max) ; sous zéro, −10 par point ; effondrement à −(fatigue max).
    var ftKv = el("div", "pc-kv");
    var ftLbl = el("span", "k", "Points de fatigue");
    ftLbl.title = "Réserve : maximum = Endurance + bonus. Se dépasser : +15 au jet par point consommé (5 max par jet, via le panneau Jets). Sous zéro : −10 à tous les jets par point. À −(fatigue max) : effondrement.";
    ftKv.appendChild(ftLbl);
    stepper(ftKv,
      function () { return fatiguePts(); },
      function (v) { state.fatigue = v; },
      function () { return -fatigueMax(); },
      function () { return fatigueMax(); });
    var ftMax = el("span", "pc-cell-dim");
    updaters.push(function () { ftMax.textContent = "/ " + fatigueMax(); });
    ftKv.appendChild(ftMax);
    // bonus de fatigue max (avantage « Fatigue supérieure », don du MJ) — révélé au survol comme les autres ±
    var ftBonus = el("input", "pc-comp-div pc-cdiv");
    ftBonus.type = "number"; ftBonus.placeholder = "±";
    ftBonus.style.width = "2.1rem"; ftBonus.style.flex = "0 0 auto";
    ftBonus.value = state.fatigueBonus || "";
    ftBonus.title = "Bonus à la fatigue maximale (avantage « Fatigue supérieure », don du MJ) : s'ajoute à l'Endurance.";
    ftBonus.addEventListener("input", function () {
      var v = num(ftBonus.value, 0);
      if (v) state.fatigueBonus = v; else state.fatigueBonus = 0;
      refresh();
    });
    ftKv.appendChild(ftBonus);
    bF.appendChild(ftKv);

    // Actions par tour (deroulement-combat.md : propre au personnage, en général
    // 1 à 10 ; pas de formule) — champ au choix du MJ, comme PV / niveau.
    var actKv = el("div", "pc-kv");
    actKv.appendChild(el("span", "k", "Actions par tour"));
    var actIn = el("input", "pc-comp-div");
    actIn.type = "number"; actIn.placeholder = "MJ";
    actIn.title = "Nombre d'actions par tour, propre au personnage (en général 1 à 10), au choix du MJ.";
    actIn.value = state.actions == null ? "" : state.actions;
    actIn.addEventListener("input", function () { state.actions = actIn.value === "" ? null : num(actIn.value, 0); refresh(); });
    actKv.appendChild(actIn);
    bF.appendChild(actKv);

    // Réduction de dégâts d'armure par type (degats.md) : sept champs éditables,
    // seule la réduction du type de l'attaque s'applique. Valeurs au choix du MJ.
    bF.appendChild(el("div", "pc-kv-head", "Réduction de dégâts"));
    var rdGrid = el("div", "pc-rd");
    // deux familles (degats.md) : physiques (CON/TRA/PER) sur une ligne centrée,
    // élémentaires (FEU/FRO/ÉLE/DÉC) en dessous.
    var rdPhys = el("div", "pc-rd-row phys"), rdElem = el("div", "pc-rd-row elem");
    rdGrid.appendChild(rdPhys); rdGrid.appendChild(rdElem);
    [["CON", "Contondant", 0], ["TRA", "Tranchant", 0], ["PER", "Perforant", 0],
     ["FEU", "Feu", 1], ["FRO", "Froid", 1], ["ÉLE", "Électricité", 1], ["DÉC", "Décomposition", 1]].forEach(function (d) {
      var cell = el("label", "pc-rd-cell");
      var lb = el("span", "l", d[0]); lb.title = d[1];
      cell.appendChild(lb);
      var inp = el("input", "pc-comp-div"); inp.type = "number"; inp.placeholder = "0";
      inp.title = "Réduction de dégâts contre le type " + d[1] + " (armure). Perce-armure en ignore 40, Perce-blindage 80.";
      inp.value = state.reduction[d[0]] || "";
      inp.addEventListener("input", function () { var v = num(inp.value, 0); if (v) state.reduction[d[0]] = v; else delete state.reduction[d[0]]; refresh(); });
      cell.appendChild(inp);
      (d[2] ? rdElem : rdPhys).appendChild(cell);
    });
    bF.appendChild(rdGrid);

    // Armes portées : attaque par type d'emploi, parade, dégâts ; familiarité
    // (−20/−40) et Lourdeur comptées dans l'attaque, familiarité dans la parade.
    var bA = block(colB, "Armes", null,
      "Attaque par type d'emploi et parade, familiarité et Lourdeur comptées ; cliquer une valeur pour lancer. Les trois armes de corps sont toujours disponibles.");
    var listA = el("div");
    bA.appendChild(listA);
    var addWrap = el("div");
    bA.appendChild(addWrap);
    function buildAddArme() {
      addWrap.innerHTML = "";
      var s = armeSelect("", function (v) {
        if (!v) return;
        state.armes.push({ name: v, forge: !armeByName(v) });
        buildAddArme(); refresh();
      });
      s.querySelector("option").textContent = "— porter une arme —";
      addWrap.appendChild(s);
    }
    buildAddArme();
    function armeRow(a, entry) {
      var box = el("div", "pc-arme");
      var head = el("div", "pc-arme-head");
      var nm = el("span", "nm", entry ? entry.name : a.name);
      head.appendChild(nm);
      head.appendChild(el("span", "fam", a ? (a.corps ? "arme de corps · " : "") + (a.famille || "") + (a.am ? " · AM " + a.am : "")
        : (entry && entry.forge ? "arme forgée (Forge)" : "hors barème")));
      if (a) {
        var dv = el("input", "pc-comp-div");
        dv.type = "number"; dv.placeholder = "±";
        dv.value = armeDivers(a, entry) || "";
        dv.title = "Bonus ou malus divers propre à cette arme (qualité, état, décision du MJ) : compté à l'attaque et à la parade.";
        dv.addEventListener("change", function () {
          var v = num(dv.value, 0);
          if (entry) entry.divers = v;
          else if (v) state.armesCorpsDivers[a.name] = v; else delete state.armesCorpsDivers[a.name];
          refresh();
        });
        head.appendChild(dv);
      }
      if (entry) {
        var db = el("button", "pc-mini danger", "×"); db.type = "button"; db.title = "Ne plus porter cette arme";
        db.addEventListener("click", function () {
          var i = state.armes.indexOf(entry);
          if (i >= 0) state.armes.splice(i, 1);
          refresh();
        });
        head.appendChild(db);
      }
      box.appendChild(head);
      if (!a) {
        box.appendChild(el("div", "pc-arme-line", entry && entry.forge
          ? "Valeurs à l'appréciation du MJ : la fiche de cette arme vit dans la Forge."
          : "Arme absente du barème actuel (renommée ou retirée des règles)."));
        return box;
      }
      var line = el("div", "pc-arme-line");
      var lourd = lourdeurMalus(a);
      var dvv = armeDivers(a, entry);
      armeTypes(a).forEach(function (t) {
        var fam = malusArme(a, t.label);
        var val = compTotal(t.comp) + fam + lourd + dvv + modsGlobaux();
        var chip = el("span", "pc-wchip");
        chip.textContent = t.label + " " + signed(val);
        chip.title = t.comp + " " + signed(compTotal(t.comp)) +
          (fam ? " · familiarité " + signed(fam) : "") +
          (lourd ? " · Lourdeur " + signed(lourd) : "") +
          (dvv ? " · divers " + signed(dvv) : "") +
          (modsGlobaux() ? " · toutes actions " + signed(modsGlobaux()) : "");
        rollable(chip, function () { return (entry ? entry.name : a.name) + " (" + t.label + ")"; },
          function () { return compTotal(t.comp) + malusArme(a, t.label) + lourdeurMalus(a) + armeDivers(a, entry); });
        line.appendChild(chip);
      });
      if (/\bParade\b/.test(a.props)) {
        var famP = malusArme(a, "Parade");
        var pv = compTotal("Parade") + famP + dvv + modsGlobaux();
        var pchip = el("span", "pc-wchip");
        pchip.textContent = "Parade " + signed(pv);
        pchip.title = "Parade " + signed(compTotal("Parade")) + (famP ? " · familiarité " + signed(famP) : "") +
          (dvv ? " · divers " + signed(dvv) : "") +
          (modsGlobaux() ? " · toutes actions " + signed(modsGlobaux()) : "");
        rollable(pchip, function () { return (entry ? entry.name : a.name) + " (Parade)"; },
          function () { return compTotal("Parade") + malusArme(a, "Parade") + armeDivers(a, entry); });
        line.appendChild(pchip);
      }
      var md = modDegatsArme(a);
      var dmgD = armeDmgDivers(a, entry);
      var totalDmg = a.degats + (md.val || 0) + dmgD;
      var dmg = el("span", "dmg", "Dégâts " + totalDmg + (md.txt ? " (" + md.txt + ")" : "") + (a.type ? " · " + a.type : ""));
      dmg.title = "Dégâts " + a.degats + " de base" +
        (md.val ? " · modificateur " + signed(md.val) + (md.txt ? " (" + md.txt + ")" : "") : "") +
        (dmgD ? " · divers " + signed(dmgD) : "") + (a.type ? "\nType : " + a.type + " (l'attaquant choisit lequel s'il y en a plusieurs)" : "") +
        "\nBlesser : dégâts × degré de touche ÷ 100.";
      line.appendChild(dmg);
      // ± dégâts propre à l'arme (avantage, Nen, art, MJ), révélé au survol
      var dmgIn = el("input", "pc-comp-div pc-cdiv");
      dmgIn.type = "number"; dmgIn.placeholder = "±dég";
      dmgIn.style.width = "2.7rem"; dmgIn.style.flex = "0 0 auto";
      dmgIn.value = dmgD || "";
      dmgIn.title = "Bonus ou malus de dégâts propre à cette arme (avantage « Armes de corps supérieures », tranchant de Nen ou d'art, décision du MJ).";
      dmgIn.addEventListener("change", function () {
        var v = num(dmgIn.value, 0);
        if (entry) entry.dmgDivers = v;
        else if (v) state.armesCorpsDmgDivers[a.name] = v; else delete state.armesCorpsDmgDivers[a.name];
        refresh();
      });
      line.appendChild(dmgIn);
      if (a.munitions) line.appendChild(el("span", "mun", "Munitions " + a.munitions));
      box.appendChild(line);
      // méta de l'arme : portée réelle + propriétés — ce qui la définit (armes.md)
      var metaBits = [];
      // portée affichée seulement si l'arme atteint au-delà du corps (un « Mêlée »
      // seul = allonge naturelle, déjà donnée par l'espace/allonge du personnage)
      if (a.portee && a.portee !== "—" && !/^\s*(mêlée|corps)\s*$/i.test(a.portee)) metaBits.push("Portée " + a.portee);
      if (a.props && a.props !== "Aucune") metaBits.push(a.props);
      if (metaBits.length) box.appendChild(el("div", "pc-arme-meta", metaBits.join(" · ")));
      var notes = [];
      var famGen = malusArme(a);
      if (famGen) notes.push("familiarité " + signed(famGen) + " (attaque et parade)");
      if (lourd) notes.push("Force insuffisante : " + signed(lourd) + " à l'attaque");
      if (notes.length) box.appendChild(el("div", "pc-arme-warn", notes.join(" · ")));
      return box;
    }
    function renderArmes() {
      // ne pas détruire un champ ± en cours de frappe : la liste se re-rendra
      // au prochain rafraîchissement venu d'ailleurs
      if (listA.contains(document.activeElement)) return;
      listA.innerHTML = "";
      DATA.armes.filter(function (a) { return a.corps; }).forEach(function (a) {
        listA.appendChild(armeRow(a, null));
      });
      state.armes.forEach(function (entry) {
        listA.appendChild(armeRow(armeByName(entry.name), entry));
      });
    }
    updaters.push(renderArmes);

    // États (etats.md) : REFONTE — une carte par état, avec un sélecteur de palier
    // segmenté (—/paliers, ou —/Actif pour un état binaire) comme les arts et
    // techniques ; l'effet chiffré s'affiche dès qu'un palier est choisi. Groupés
    // par catégorie. Les « Autres états » sont appliqués AUTOMATIQUEMENT aux totaux
    // de compétence (etatMalus dans compTotal) ; les « Situations » ne valent qu'en
    // opposition (elles pénalisent l'adversaire, pas les propres jets).
    if (DATA.etats && DATA.etats.length) {
      var bEt = block(colB, "États");
      var etatSync = [];
      updaters.push(function () { etatSync.forEach(function (f) { f(); }); });
      function etatModsTxt(mods) {
        return mods.map(function (m) { return m.cible + " " + signed(m.val); }).join(" · ");
      }
      var etatCats = [];
      DATA.etats.forEach(function (e) { if (etatCats.indexOf(e.categorie) < 0) etatCats.push(e.categorie); });
      etatCats.forEach(function (cat) {
        bEt.appendChild(el("div", "pc-comp-champ", cat));
        var list = el("div", "pc-etat-list");
        bEt.appendChild(list);
        DATA.etats.filter(function (e) { return e.categorie === cat; }).forEach(function (e) {
          list.appendChild(etatRow(e));
        });
      });
      function etatRow(e) {
        var isSit = /situation/i.test(e.categorie || "");
        var graded = e.paliers.length > 0;
        var row = el("div", "pc-etat");
        var top = el("div", "pc-etat-top");
        var name = el("span", "pc-etat-name", e.name);
        name.title = e.desc || "";
        top.appendChild(name);
        var fx = el("div", "pc-etat-fx");
        function setActive(v) {
          if (v == null || v === false) delete state.etatsActifs[e.name];
          else state.etatsActifs[e.name] = v;
          syncEtat(); refresh();
        }
        var ctrl;
        if (graded) {
          ctrl = el("select", "pc-etat-sel");
          var o0 = document.createElement("option"); o0.value = ""; o0.textContent = "—"; ctrl.appendChild(o0);
          e.paliers.forEach(function (p) {
            var o = document.createElement("option"); o.value = p.name; o.textContent = p.name; ctrl.appendChild(o);
          });
          ctrl.addEventListener("change", function () { setActive(ctrl.value || null); });
        } else {
          ctrl = el("button", "pc-etat-tog"); ctrl.type = "button";
          ctrl.setAttribute("role", "switch"); ctrl.setAttribute("aria-label", e.name);
          ctrl.appendChild(el("span", "pc-etat-knob"));
          ctrl.addEventListener("click", function () { setActive(state.etatsActifs[e.name] ? null : true); });
        }
        top.appendChild(ctrl);
        row.appendChild(top); row.appendChild(fx);
        function syncEtat() {
          var v = state.etatsActifs[e.name];
          var active = !!v, p = null;
          if (v && v !== true) e.paliers.forEach(function (x) { if (x.name === v) p = x; });
          if (graded) ctrl.value = (v && v !== true) ? v : "";
          else { ctrl.classList.toggle("on", active); ctrl.setAttribute("aria-checked", active ? "true" : "false"); }
          row.classList.toggle("active", active);
          var mods = p ? p.mods : e.mods;
          if (active) {
            var head = p ? p.name + " : " : "";
            var prefix = e.name === "Abri" ? "assaillant " : "";
            fx.textContent = head + prefix + (mods.length ? etatModsTxt(mods) : "voir la règle") +
              (isSit ? " · en opposition" : "");
          } else fx.textContent = "";
        }
        etatSync.push(syncEtat); syncEtat();
        return row;
      }
    }
    // arme de départ (le PV et le Mouvement ont leurs propres tuiles/blocs)
    var adKv = el("div", "pc-kv");
    adKv.appendChild(el("span", "k", "Arme de départ"));
    var adV = el("span", "v");
    adKv.appendChild(adV);
    bF.appendChild(adKv);
    updaters.push(function () {
      adV.textContent = state.armeDepart || "";
      // pas d'arme de départ choisie → ligne masquée (un « — » seul ne sert à rien)
      adKv.style.display = state.armeDepart ? "" : "none";
    });
    // donnée du perso (issue de la taille) : espace occupé et allonge — pas la
    // formule de calcul des PV, qui n'a pas sa place sur une fiche.
    var pvNote = el("div", "pc-block-note");
    pvNote.style.marginTop = ".25rem";
    updaters.push(function () {
      var t = tailleCat();
      pvNote.textContent = t ? "Espace " + t.espace + " · allonge " + t.allonge : "";
    });
    if (!COMPACT) bF.appendChild(pvNote);

    // Les lignes dépendent de la forme du personnage (niveau par sens, sens
    // inexistants masqués) : elles se re-rendent quand la forme change.
    var sensBoxes = [];
    ["externe", "interne"].forEach(function (typ) {
      var b = block(colA, typ === "externe" ? "Sens externes" : "Sens internes", null,
        "Clarté de 0 à 10, départ 10 ; elle chute en jeu, pas à la création. Le niveau de chaque sens vient de la forme du personnage.");
      var head = el("div", "pc-trow pc-sens-row head");
      head.appendChild(el("span", null, "Sens"));
      head.appendChild(el("span", "pc-cell-num", "Clarté"));
      b.appendChild(head);
      sensBoxes.push({ typ: typ, box: b });
    });
    // Sens en colonne A : on remet Notes en dernier pour qu'il reste le bloc final.
    colA.appendChild(bN);
    var ordre = { "Primaire": 0, "Secondaire": 1, "Tertiaire": 2, "Latent": 3, "Inexistant": 4 };
    function renderSens() {
      sensBoxes.forEach(function (sb) {
        sb.box.querySelectorAll(".pc-sens-row:not(.head)").forEach(function (r) { r.remove(); });
        DATA.sens
          .filter(function (s) { var nv = sensNiveau(s); return s.type === sb.typ && nv !== "Inexistant" && !(COMPACT && nv === "Latent"); })
          .sort(function (x, y) { return (ordre[sensNiveau(x)] || 0) - (ordre[sensNiveau(y)] || 0); })
          .forEach(function (s) {
            var nv = sensNiveau(s);
            var row = el("div", "pc-trow pc-sens-row");
            var latent = nv === "Latent";
            var nm = el("span", "nm" + (latent ? " latent" : ""), s.name);
            // le niveau (déjà réglable dans l'onglet Options) passe en infobulle :
            // le bloc de clarté ne garde que nom + clarté, pour des noms lisibles.
            nm.title = s.desc + "\nNiveau : " + nv + (latent ? " · faculté endormie, s'éveille sous condition spéciale." : "");
            row.appendChild(nm);
            if (latent) {
              row.appendChild(el("span", "niv", "endormi"));
            } else {
              stepper(row,
                function () { return state.acuite[s.name] != null ? state.acuite[s.name] : 10; },
                function (v) { if (v === 10) delete state.acuite[s.name]; else state.acuite[s.name] = v; },
                function () { return 0; },
                function () { return 10; });
            }
            sb.box.appendChild(row);
          });
      });
    }
    rebuildSens = renderSens;
    renderSens();

    // ----- colonne C, la grande : compétences -----
    buildCompetences(colC);
  }

  // --- compétences (grande colonne de l'onglet Général) -----------------------------
  function buildCompetences(pane) {
    var b = block(pane, "Compétences", null,
      "5 PF = +20 de base · 5 PF max par compétence et par niveau · valeur = base + modificateur de carac + divers (colonne ±)");

    var tools = el("div", "pc-comp-tools");
    var search = el("input", "pc-comp-search");
    search.type = "search"; search.placeholder = "Filtrer les compétences…";
    tools.appendChild(search);
    var champs = [];
    DATA.competences.forEach(function (k) { if (champs.indexOf(k.champ) < 0) champs.push(k.champ); });
    var champSel = el("select", "pc-select");
    ["Tous les champs"].concat(champs).concat(["Personnalisé"]).forEach(function (ch) {
      var o = el("option"); o.value = ch === "Tous les champs" ? "" : ch; o.textContent = ch;
      champSel.appendChild(o);
    });
    tools.appendChild(champSel);
    var onlyChip = el("span", "pc-chip");
    onlyChip.textContent = "Investies seulement";
    var only = COMPACT;   // fiche condensée : par défaut, seules les compétences investies
    onlyChip.classList.toggle("on", only);
    onlyChip.addEventListener("click", function () { only = !only; onlyChip.classList.toggle("on", only); render(); });
    tools.appendChild(onlyChip);
    // bascule d'affichage des champs d'ajout d'une compétence personnalisée par champ
    var addChip = el("span", "pc-chip");
    addChip.textContent = "+ Compétence perso";
    addChip.title = "Afficher un champ d'ajout de compétence personnalisée sous chaque champ.";
    var addMode = false;
    addChip.addEventListener("click", function () { addMode = !addMode; addChip.classList.toggle("on", addMode); render(); });
    tools.appendChild(addChip);
    b.appendChild(tools);

    // (pas d'en-tête de colonnes : mal alignée avec les steppers de largeur variable
    //  et redondante — les colonnes se comprennent d'elles-mêmes)

    var list = el("div", "pc-comp-list one");
    b.appendChild(list);

    // Les lignes sont recréées à chaque filtre : leurs rafraîchisseurs vivent
    // dans rowSync (vidé au re-rendu) derrière un unique updater global, sinon
    // chaque recherche empilerait des rafraîchisseurs de nœuds détachés.
    var rowSync = [];
    updaters.push(function () { rowSync.forEach(function (f) { f(); }); });

    // Rendu groupé par champ : compétences du livre, puis compétences
    // personnalisées du même champ, puis (si l'ajout est déployé) un champ de
    // saisie pour en ajouter une à ce champ. Le pseudo-champ « Personnalisé »
    // recueille les compétences perso sans champ (anciens personnages).
    function render() {
      list.innerHTML = "";
      rowSync.length = 0;
      var q = search.value.trim().toLowerCase();
      var champFilter = champSel.value;
      var ri = 0;   // index LOGIQUE de ligne (zébrage stable malgré les en-têtes de champ)
      function put(row) { if (ri++ % 2) row.classList.add("odd"); list.appendChild(row); }
      champs.concat(["Personnalisé"]).forEach(function (ch) {
        if (champFilter && ch !== champFilter) return;
        var std = DATA.competences.filter(function (k) {
          return k.champ === ch && (!q || k.name.toLowerCase().indexOf(q) >= 0) &&
                 (!only || state.comps[k.name] > 0 || diversOf(k.name));
        });
        var cust = state.customComps.filter(function (c) {
          return (c.champ || "Personnalisé") === ch && (!q || c.name.toLowerCase().indexOf(q) >= 0) &&
                 (!only || (c.pf || 0) > 0 || c.divers);
        });
        var showAdd = addMode && !q;   // pas de saisie d'ajout pendant une recherche
        if (!std.length && !cust.length && !showAdd) return;
        list.appendChild(el("div", "pc-comp-champ", "Champ " + ch));
        ri = 0;   // repartir de zéro à chaque champ : la 1re ligne d'un champ est toujours claire
        std.forEach(function (k) { put(stdRow(k)); });
        cust.forEach(function (c) { put(customRow(c)); });
        if (showAdd) list.appendChild(addRow(ch));
      });
      refresh();
    }
    function stdRow(k) {
      var row = el("div", "pc-comp-row");
      var nm = el("span", "pc-comp-name");
      var lbl = el("span", "pc-comp-label");
      var txt = document.createTextNode("");
      lbl.appendChild(txt);
      nm.appendChild(lbl);
      var gov = el("span", "pc-comp-gov", caracAbbr(k.carac));   // carac gouvernante en gris (protégée de la troncature)
      gov.title = k.carac;
      nm.appendChild(gov);
      row.appendChild(nm);
      stepperPf(row, k);
      // l'accessibilité peut changer (forme, onglet Options) : la ligne se
      // remet à jour à chaque rafraîchissement
      rowSync.push(function () {
        var acc = compAccessible(k);
        nm.classList.toggle("na", !acc);
        txt.textContent = compDisplayName(k.name) + (acc ? "" : " ✗");
        nm.title = k.name + " — " + k.desc + "\nGroupes : " + k.groupes.join(", ") +
          (acc ? "" : "\nHors de portée du corps du personnage : verrouillée (voir l'onglet Options).");
      });
      // trois zones de modificateurs (équipement, circonstance, MJ), sommées
      var divWrap = el("span", "pc-comp-mods");
      multiMod(divWrap, state.divers, k.name, 3,
        { title: "Modificateur divers à la compétence (équipement, circonstance, décision du MJ)." });
      row.appendChild(divWrap);
      var tot = el("span", "pc-comp-total");
      rowSync.push(function () {
        var t = compTotal(k.name);
        var em = etatMalus(k), cm = clarteMalus(k);
        tot.textContent = signed(t);
        tot.classList.toggle("zero", !(state.comps[k.name] > 0) && !diversOf(k.name) && !em && !cm);
        tot.title = "Base +" + compBase(k.name) + " · Carac " + signed(modOf(caracVal(caracAbbr(k.carac)))) +
          (diversOf(k.name) ? " · Divers " + signed(diversOf(k.name)) : "") +
          (em ? " · États " + signed(em) : "") + (cm ? " · Clarté " + signed(cm) : "") + "\n" + ROLL_HINT;
      });
      rollable(tot, function () { return k.name; }, function () { return compTotal(k.name); });
      row.appendChild(tot);
      return row;
    }
    function addRow(ch) {
      var row = el("div", "pc-comp-add");
      var name = el("input", "pc-comp-search");
      name.type = "text"; name.placeholder = "Compétence personnalisée…";
      var carac = el("select", "pc-select");
      DATA.caracs.forEach(function (k) {
        var o = el("option"); o.value = k.abbr; o.textContent = k.abbr; o.title = k.name; carac.appendChild(o);
      });
      var btn = el("button", "pc-mini", "+"); btn.type = "button";
      btn.title = "Ajouter une compétence personnalisée au champ " + ch;
      function add() {
        var n = name.value.trim();
        if (!n) return;
        state.customComps.push({ name: n, carac: carac.value, champ: ch, pf: 0, divers: 0 });
        render();
      }
      btn.addEventListener("click", add);
      name.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); add(); } });
      row.appendChild(name); row.appendChild(carac); row.appendChild(btn);
      return row;
    }
    function customRow(c) {
      var row = el("div", "pc-comp-row");
      var nm = el("span", "pc-comp-name");
      var db = el("button", "pc-mini danger", "×"); db.type = "button";
      db.title = "Retirer cette compétence personnalisée";
      db.style.marginRight = ".35rem";
      db.addEventListener("click", function () {
        var i = state.customComps.indexOf(c);
        if (i >= 0) state.customComps.splice(i, 1);
        render();
      });
      nm.appendChild(db);
      var lbl = el("span", "pc-comp-label");
      lbl.appendChild(document.createTextNode(c.name));
      nm.appendChild(lbl);
      var gov = el("span", "pc-comp-gov", c.carac);
      gov.title = c.carac;
      nm.appendChild(gov);
      nm.title = "Compétence personnalisée, hors des règles : à valider avec le MJ.";
      row.appendChild(nm);
      var box = el("span", "pc-step");
      var minus = el("button", null, "−"); minus.type = "button";
      var val = el("span", "v", "0");
      var plus = el("button", null, "+"); plus.type = "button";
      function sync() {
        val.textContent = c.pf ? "+" + ((c.pf / 5) * 20) : "0";
        val.title = (c.pf || 0) + " PF investis";
        minus.disabled = !(c.pf > 0);
        plus.disabled = (c.pf || 0) >= compPfMax();
      }
      minus.addEventListener("click", function () { c.pf = Math.max(0, (c.pf || 0) - 5); sync(); refresh(); });
      plus.addEventListener("click", function () { if ((c.pf || 0) < compPfMax()) { c.pf = (c.pf || 0) + 5; sync(); refresh(); } });
      box.appendChild(minus); box.appendChild(val); box.appendChild(plus);
      row.appendChild(box);
      var div = el("input", "pc-comp-div");
      div.type = "number"; div.placeholder = "±";
      div.value = c.divers || "";
      div.title = "Bonus ou malus divers";
      div.addEventListener("input", function () { c.divers = num(div.value, 0); refresh(); });
      row.appendChild(div);
      var tot = el("span", "pc-comp-total");
      rowSync.push(function () {
        tot.textContent = signed(customTotal(c));
        tot.classList.toggle("zero", !(c.pf > 0) && !c.divers);
        tot.title = "Base +" + ((c.pf || 0) / 5) * 20 + " · Carac " + signed(modOf(caracVal(c.carac))) +
          (c.divers ? " · Divers " + signed(c.divers) : "") + "\n" + ROLL_HINT;
      });
      rollable(tot, function () { return c.name; }, function () { return customTotal(c); });
      row.appendChild(tot);
      rowSync.push(sync);
      sync();
      return row;
    }
    function stepperPf(row, k) {   // stepper en pas de 5 PF ; k = compétence
      var name = k.name;
      var box = el("span", "pc-step");
      var minus = el("button", null, "−"); minus.type = "button";
      var val = el("span", "v", "0");
      var plus = el("button", null, "+"); plus.type = "button";
      function get() { return state.comps[name] || 0; }
      function locked() { return !compAccessible(k); }
      function sync() {
        var lk = locked();
        val.textContent = get() ? "+" + compBase(name) : "0";
        val.title = lk ? "Compétence verrouillée : le corps du personnage ne la porte pas (voir l'onglet Options)." : get() + " PF investis";
        minus.disabled = lk || get() <= 0;
        plus.disabled = lk || get() >= compPfMax();
        box.classList.toggle("locked", lk);
      }
      minus.addEventListener("click", function () {
        if (locked()) return;
        var v = get() - 5;
        if (v <= 0) delete state.comps[name]; else state.comps[name] = v;
        sync(); refresh();
      });
      plus.addEventListener("click", function () {
        if (locked()) return;
        if (get() < compPfMax()) { state.comps[name] = get() + 5; sync(); refresh(); }
      });
      box.appendChild(minus); box.appendChild(val); box.appendChild(plus);
      row.appendChild(box);
      rowSync.push(sync);
      sync();
    }
    search.addEventListener("input", render);
    champSel.addEventListener("change", render);
    render();
  }

  // --- onglet Formations ------------------------------------------------------------
  function buildFormations(pane) {
    var bD = block(pane, "Arme de départ", null,
      "Un personnage développe son attaque et sa défense avec une arme précise, choisie dès le départ. Les autres armes subissent −20 (même famille) ou −40 (famille étrangère) en attaque et parade.");
    bD.appendChild(armeSelect(state.armeDepart, function (v) { state.armeDepart = v; refresh(); }));

    var bF = block(pane, "Formations", null,
      "Payées en PF, acquises pour de bon ; seules les martiales sont écrites à ce jour.");
    var grid = el("div", "pc-arts3");
    bF.appendChild(grid);

    DATA.formations.forEach(function (f) {
      var box = el("div", "pc-forma");
      var head = el("div", "pc-forma-head");
      var nm = el("span", "nm", f.name);
      nm.title = f.desc;
      head.appendChild(nm);
      head.appendChild(el("span", "cost", f.cout + " PF"));
      box.appendChild(head);
      var body = el("div", "pc-forma-body");
      var noteInterp = f.name === "Attaque supplémentaire"
        ? " La valeur retenue ici est celle de la compétence (base + modificateur)." : "";
      body.appendChild(el("div", "pc-forma-hint",
        f.tagline + (f.prereq && f.prereq !== "aucun" ? " — Prérequis : " + f.prereq + "." + noteInterp : "")));
      var buys = el("div", "pc-forma-buys");
      body.appendChild(buys);
      box.appendChild(body);
      grid.appendChild(box);

      var needsChoix = f.name === "Arme proche" || f.name === "Arme étrangère" || f.name === "Famille entière";
      function render() {
        buys.innerHTML = "";
        state.formations.forEach(function (entry) {
          if (entry.name !== f.name) return;
          var line = el("div", "pc-forma-buy");
          if (needsChoix) {
            if (f.name === "Famille entière") {
              line.appendChild(familleSelect(entry.choix, function (v) { entry.choix = v; refresh(); }));
            } else {
              line.appendChild(armeSelect(entry.choix, function (v) { entry.choix = v; refresh(); }));
            }
          } else {
            var lbl = el("input"); lbl.type = "text"; lbl.value = entry.choix || "";
            lbl.placeholder = "Note (facultatif)";
            lbl.addEventListener("input", function () { entry.choix = lbl.value; save(); });
            line.appendChild(lbl);
          }
          var db = el("button", "pc-mini danger", "×"); db.type = "button"; db.title = "Retirer cet achat";
          db.addEventListener("click", function () {
            // par identité d'objet : un index capturé au rendu se périme dès
            // qu'une suppression a lieu dans une autre carte
            var i = state.formations.indexOf(entry);
            if (i >= 0) state.formations.splice(i, 1);
            render(); refresh();
          });
          line.appendChild(db);
          buys.appendChild(line);
        });
        var add = el("button", "pc-mini", formationCount(f.name) ? "+ Suivre encore (" + f.cout + " PF)" : "+ Suivre (" + f.cout + " PF)");
        add.type = "button";
        if (!f.repetable && formationCount(f.name) >= 1 && f.name !== "Famille entière") add.disabled = true;
        add.addEventListener("click", function () { state.formations.push({ name: f.name, choix: "" }); render(); refresh(); });
        buys.appendChild(add);
      }
      render();
    });
  }

  function armeSelect(cur, onPick) {
    var s = el("select", "pc-select");
    var none = el("option"); none.value = ""; none.textContent = "— choisir une arme —"; s.appendChild(none);
    var fam = null, group = null;
    DATA.armes.forEach(function (a) {
      if (a.corps) return;
      if (a.famille !== fam) { fam = a.famille; group = el("optgroup"); group.label = fam; s.appendChild(group); }
      var o = el("option"); o.value = a.name; o.textContent = a.name;
      if (a.name === cur) o.selected = true;
      group.appendChild(o);
    });
    forgedWeapons().forEach(function (w) {
      if (!group || group.label !== "Armes forgées") { group = el("optgroup"); group.label = "Armes forgées"; s.appendChild(group); }
      var o = el("option"); o.value = w.name; o.textContent = w.name;
      if (w.name === cur) o.selected = true;
      group.appendChild(o);
    });
    s.addEventListener("change", function () { onPick(s.value); });
    return s;
  }
  function familleSelect(cur, onPick) {
    var s = el("select", "pc-select");
    var none = el("option"); none.value = ""; none.textContent = "— choisir une famille —"; s.appendChild(none);
    var seen = {};
    DATA.armes.forEach(function (a) {
      if (a.corps || seen[a.famille]) return;
      seen[a.famille] = 1;
      var o = el("option"); o.value = a.famille; o.textContent = a.famille;
      if (a.famille === cur) o.selected = true;
      s.appendChild(o);
    });
    s.addEventListener("change", function () { onPick(s.value); });
    return s;
  }

  // --- onglet Arts --------------------------------------------------------------------
  function buildArts(pane) {
    var b = block(pane, "Arts", null,
      "Le coût des arts est en chantier dans les règles : choix libre du palier, à valider avec le MJ. Un prérequis en rouge n'est pas rempli par le personnage.");
    var tools = el("div", "pc-comp-tools");
    var search = el("input", "pc-comp-search");
    search.type = "search"; search.placeholder = "Filtrer les arts…";
    tools.appendChild(search);
    var onlyChip = el("span", "pc-chip", "Choisis seulement");
    var only = COMPACT;   // fiche condensée : par défaut, seuls les arts choisis
    onlyChip.classList.toggle("on", only);
    onlyChip.addEventListener("click", function () { only = !only; onlyChip.classList.toggle("on", only); render(); });
    tools.appendChild(onlyChip);
    b.appendChild(tools);
    var wrap = el("div");
    b.appendChild(wrap);

    var artDescOpen = {};   // nom d'art -> déplié (préférence d'affichage, non sauvegardée)
    // même mécanique que les compétences : rafraîchisseurs locaux vidés au re-rendu
    var artSync = [];
    updaters.push(function () { artSync.forEach(function (f) { f(); }); });

    function render() {
      wrap.innerHTML = "";
      artSync.length = 0;
      var q = search.value.trim().toLowerCase();
      var cats = [];
      DATA.arts.forEach(function (a) { if (cats.indexOf(a.categorie) < 0) cats.push(a.categorie); });
      cats.forEach(function (cat) {
        var arts = DATA.arts.filter(function (a) {
          return a.categorie === cat &&
            (!q || a.name.toLowerCase().indexOf(q) >= 0) &&
            (!only || state.arts[a.name]);
        });
        if (!arts.length) return;
        wrap.appendChild(el("div", "pc-comp-champ", "Arts " + cat));
        var g = el("div", "pc-arts3");
        arts.forEach(function (a) { g.appendChild(artCard(a)); });
        wrap.appendChild(g);
      });
      refresh();
    }
    function artCard(a) {
      var box = el("div", "pc-art-card");
      var head = el("div", "pc-art-head");
      head.appendChild(el("span", "pc-art-name", a.name));
      var hr = el("span", "pc-art-hr");
      if (a.tagline) hr.appendChild(el("span", "pc-art-tag", a.tagline));
      var chev = a.desc ? el("span", "pc-art-chev", "▸") : null;
      if (chev) hr.appendChild(chev);
      head.appendChild(hr);
      box.appendChild(head);
      if (a.desc) box.appendChild(el("div", "pc-art-desc", a.desc));
      if (a.desc) {
        head.classList.add("clickable");
        head.title = "Afficher ou masquer la description";
        var setOpen = function (o) {
          box.classList.toggle("open", o); chev.textContent = o ? "▾" : "▸";
          if (o) artDescOpen[a.name] = 1; else delete artDescOpen[a.name];
        };
        head.addEventListener("click", function () { setOpen(!box.classList.contains("open")); });
        setOpen(!!artDescOpen[a.name]);
      }
      if (a.todo) box.appendChild(el("div", "pc-art-todo", "Fiche en chantier dans les règles."));
      var seg = el("div", "pc-seg");
      var effet = el("div", "pc-art-effet");
      var frappe = el("div", "pc-art-frappe");
      var prereq = el("div", "pc-art-prereq");
      ["Aucun"].concat(PALIERS).forEach(function (p) {
        var cur = state.arts[a.name] || "Aucun";
        var btn = el("button", "pc-seg-btn" + (cur === p ? " on" : ""));
        btn.type = "button"; btn.textContent = p === "Aucun" ? "—" : p;
        if (p !== "Aucun") {
          var pd = paliersOf(a)[p];
          if (pd && (pd.prereq || pd.effet || pd.flavor)) btn.title =
            (pd.prereq ? "Prérequis : " + pd.prereq + "\n" : "") +
            (pd.flavor ? pd.flavor + "\n" : "") + (pd.effet ? "Effet : " + pd.effet : "");
        }
        btn.addEventListener("click", function () {
          seg.querySelectorAll(".pc-seg-btn").forEach(function (x) { x.classList.remove("on"); });
          btn.classList.add("on");
          if (p === "Aucun") delete state.arts[a.name]; else state.arts[a.name] = p;
          syncDetail(); refresh();
        });
        seg.appendChild(btn);
      });
      function syncDetail() {
        var p = state.arts[a.name];
        var pd = p ? paliersOf(a)[p] : null;
        // un palier possédé inclut les paliers inférieurs : leurs effets restent
        // affichés ; la frappe, elle, ne montre que le palier possédé (la meilleure)
        effet.textContent = "";
        if (p) {
          for (var i = 0; i <= PALIERS.indexOf(p); i++) {
            var q = paliersOf(a)[PALIERS[i]];
            if (!q || !q.effet) continue;
            var lig = el("div", "pc-art-palier-effet");
            if (PALIERS.indexOf(p) > 0) lig.appendChild(el("span", "pal", PALIERS[i] + " · "));
            lig.appendChild(document.createTextNode(q.effet));
            effet.appendChild(lig);
          }
        }
        var f = p ? frappeTxt(a, p) : null;
        frappe.textContent = f ? "Frappe : " + f : "";
        prereq.textContent = "";
        if (pd && pd.prereq) {
          prereq.appendChild(el("span", "lbl", "Prérequis "));
          prereqParts(pd.prereq).forEach(function (c, i) {
            if (i) prereq.appendChild(document.createTextNode(", "));
            var ok = prereqOk(c);
            var sp = el("span", ok === false ? "ko" : null, c);
            if (ok === false) sp.title = "Le personnage ne remplit pas ce prérequis : il conditionne l'apprentissage et l'utilisation de l'art.";
            prereq.appendChild(sp);
          });
        }
        // le panneau de détail n'apparaît qu'une fois un palier choisi
        box.classList.toggle("active", !!p);
        detail.style.display = p ? "" : "none";
      }
      var detail = el("div", "pc-art-detail");
      detail.appendChild(prereq); detail.appendChild(frappe); detail.appendChild(effet);
      artSync.push(syncDetail);
      box.appendChild(seg); box.appendChild(detail);
      syncDetail();
      return box;
    }
    function paliersOf(a) {
      var m = {};
      (a.paliers || []).forEach(function (p) { m[p.niveau] = p; });
      return m;
    }
    search.addEventListener("input", render);
    render();
  }

  // --- onglet Nen ---------------------------------------------------------------
  // Tout le Nen de la fiche : archétype et affinités, développement intérieur et
  // prestige, aura, développement des catégories, techniques (avec prérequis et
  // coûts en DI), et les capacités du personnage — chacune ouvre l'Atelier.
  function buildNen(pane) {
    var cols = el("div", "pc-cols2");
    var colA = el("div", "pc-col"), colB = el("div", "pc-col");
    cols.appendChild(colA); cols.appendChild(colB);
    pane.appendChild(cols);

    // ===== colonne A =====
    // --- Développement du Nen : archétype, DI, prestige, catégories ---
    var bDev = block(colA, "Développement du Nen", null,
      "L'archétype fixe les affinités. Le développement intérieur (DI) paie tout le Nen ; le prestige suit le DI total (un palier par 100 DI).");
    var grid = el("div", "pc-id");
    var archOpts = [["", "— choisir un archétype —"]].concat((DATA.archetypes || []).map(function (a) {
      return [a.name, a.name + (a.spe ? " *" : "")];
    }));
    idField(grid, "c6", "Archétype", state.archetype, function (v) { state.archetype = v; }, {
      options: archOpts,
      tip: "L'archétype fixe les six affinités. Les archétypes marqués * (Spécialiste et ses deux hybrides) ne peuvent pas être choisis sans l'avantage Spécialiste."
    });
    idField(grid, "c3", "Capital DI", state.diTotal, function (v) { state.diTotal = num(v, 0); },
      { type: "number", min: 0, tip: "Le développement intérieur gagné, au choix du MJ (cadence selon l'Éclat). Il paie techniques, aura, catégories et capacités." });
    var prestRo = idField(grid, "c3", "Prestige", prestige(), null, { ro: true });
    updaters.push(function () { prestRo.textContent = String(prestige()); });
    bDev.appendChild(grid);

    // Développement des catégories (après le Hatsu) : DI investi -> pool DR/DE/...
    var catNote = el("div", "pc-block-note");
    bDev.appendChild(catNote);
    var catWrap = el("div", "pc-opt-list");
    bDev.appendChild(catWrap);
    DATA.nenCats.forEach(function (cat) {
      var meta = NEN_CAT_META[cat];
      var row = el("div", "pc-opt-row pc-catrow");
      var nm = el("span", "pc-opt-name", cat.charAt(0).toUpperCase() + cat.slice(1));
      nm.title = "Pool " + meta.sigle + " · caractéristique requise : " + meta.carac + ".";
      row.appendChild(nm);
      var inp = el("input", "pc-comp-div");
      inp.type = "number"; inp.min = 0; inp.placeholder = "DI";
      inp.value = state.diCat[cat] || "";
      inp.title = "DI investi dans la conversion vers " + meta.sigle + " : chaque DI rend l'affinité d'apprentissage en points de développement (" + meta.sigle + "), que les capacités de cette catégorie consomment.";
      inp.addEventListener("input", function () {
        var v = Math.max(0, num(inp.value, 0));
        if (v) state.diCat[cat] = v; else delete state.diCat[cat];
        refresh();
      });
      row.appendChild(inp);
      var out = el("span", "pc-opt-state");
      updaters.push(function () {
        var aff = affiniteCat(cat), pool = poolCat(cat), used = capDevByCat(cat), rem = pool - used;
        // « consommé / pool » en points de développement (DR/DE…) + affinité
        out.textContent = meta.sigle + " " + used + "/" + pool + (rem < 0 ? " (−" + (-rem) + ")" : "") + " · " + aff + "%";
        out.classList.toggle("ko", aff === 0 || used > pool);
        out.title = "Pool développé : " + pool + " " + meta.sigle + " (DI investi × affinité). Consommé par les capacités : " + used + " " + meta.sigle + ". Restant : " + rem + " " + meta.sigle + ".";
        inp.disabled = !hasHatsu();
      });
      row.appendChild(out);
      catWrap.appendChild(row);
    });
    updaters.push(function () {
      catNote.textContent = hasHatsu()
        ? "Chaque DI investi rend une part égale à l'affinité d'apprentissage de la catégorie."
        : "Le développement des catégories se déverrouille avec le Hatsu.";
      catWrap.style.opacity = hasHatsu() ? "1" : ".5";
    });

    // --- Affinités ---
    var bAff = block(colA, "Affinités", null,
      "Le même pourcentage sert à apprendre (vitesse de progression) et à employer (puissance) chaque catégorie.");
    var affWrap = el("div", "pc-aff");
    bAff.appendChild(affWrap);
    var affRows = DATA.nenCats.map(function (cat) {
      var row = el("div", "pc-aff-row");
      row.appendChild(el("span", "nm", cat.charAt(0).toUpperCase() + cat.slice(1)));
      var barBox = el("span", "bar");
      var fill = el("i");
      barBox.appendChild(fill);
      row.appendChild(barBox);
      var val = el("span", "v", "");
      row.appendChild(val);
      // ± affinité (avantage « Affinité supérieure », race, don du MJ) — révélé au survol
      var dv = el("input", "pc-comp-div pc-cdiv");
      dv.type = "number"; dv.placeholder = "±";
      dv.value = state.affiniteDivers[cat] || "";
      dv.title = "Ajustement d'affinité en points de % (avantage « Affinité supérieure », race, don du MJ).";
      dv.addEventListener("input", function () {
        var v = num(dv.value, 0);
        if (v) state.affiniteDivers[cat] = v; else delete state.affiniteDivers[cat];
        refresh();
      });
      row.appendChild(dv);
      affWrap.appendChild(row);
      return { cat: cat, fill: fill, val: val };
    });
    updaters.push(function () {
      var aff = affinites();
      affRows.forEach(function (r, i) {
        r.fill.style.width = aff[i] + "%";
        r.val.textContent = aff[i] + "%";
        r.fill.classList.toggle("zero", aff[i] === 0);
      });
    });

    // --- Aura ---
    var bAura = block(colA, "Aura", null,
      "L'aura se mesure en unités (UA). Développer l'aura coûte du DI, plafonné à 30 DI par prestige.");
    // Quatre mesures d'aura (aura.md) dans l'ordre canonique : UAM, UAD, UAR, RUA.
    var auraBig = el("div", "pc-bigrow pc-bigrow-4");
    var boxUAM = auraBigBox("UAM", "aura maximale"), boxUAD = auraBigBox("UAD", "aura disponible"),
        boxUAR = auraBigBox("UAR", "aura par round"), boxRUA = auraBigBox("RUA", "régénération / min");
    auraBig.appendChild(boxUAM.box); auraBig.appendChild(boxUAD.box); auraBig.appendChild(boxUAR.box); auraBig.appendChild(boxRUA.box);
    bAura.appendChild(auraBig);
    updaters.push(function () {
      boxUAM.v.textContent = fmt(uam());
      boxUAD.v.textContent = fmt(uam());   // à la création, réserve pleine : UAD = UAM
      boxUAR.v.textContent = fmt(uar());
      boxRUA.v.textContent = fmt(rua());
      boxUAD.box.title = "Aura disponible : ce qu'il reste à dépenser à l'instant. À la création, réserve pleine, elle égale l'UAM ; en jeu elle décroît de l'aura dépensée et remonte de la RUA par minute jusqu'à l'UAM.";
      boxUAR.box.title = "UAR = base " + baseUAR() + " × (mult " + mulUAR() + " + 1)";
      boxRUA.box.title = "RUA = base " + baseRUA() + " × (mult " + mulRUA() + " + 1)";
    });
    // override manuel des trois mesures d'aura (avantage, don du MJ) : vide = calculé
    var auraOv = el("div", "pc-aura-ov");
    [["UAM", "uam", uamAuto], ["UAR", "uar", uarAuto], ["RUA", "rua", ruaAuto]].forEach(function (d) {
      var cell = el("label", "pc-aura-ov-cell");
      cell.appendChild(el("span", "l", "Forcer " + d[0]));
      var inp = el("input", "pc-comp-div");
      inp.type = "number";
      inp.title = "Forcer " + d[0] + " à la main (avantage, don du MJ, règle maison). Vide = valeur calculée.";
      inp.addEventListener("input", function () { state.auraOverride[d[1]] = inp.value === "" ? null : num(inp.value, 0); refresh(); });
      cell.appendChild(inp);
      auraOv.appendChild(cell);
      updaters.push(function () {
        if (document.activeElement !== inp) {
          inp.value = state.auraOverride[d[1]] == null ? "" : state.auraOverride[d[1]];
          inp.placeholder = String(d[2]());
        }
      });
    });
    bAura.appendChild(auraOv);
    var auraSteps = el("div", "pc-opt-list");
    bAura.appendChild(auraSteps);
    auraStep(auraSteps, "Multiplicateur d'UAR", "20 DI · +1 UAR et +1 RUA", "uar");
    auraStep(auraSteps, "Multiplicateur de RUA", "10 DI · +1 RUA", "rua");
    auraStep(auraSteps, "Aura maximale", "5 DI · +200 UAM", "uam");
    var auraNote = el("div", "pc-block-note");
    bAura.appendChild(auraNote);
    updaters.push(function () {
      auraNote.textContent = "Aura développée : " + auraDiSpent() + " / " + auraDiCap() + " DI (30 par prestige).";
      auraNote.classList.toggle("pc-warn-inline", auraDiSpent() > auraDiCap());
    });

    // capacités sous l'aura (colonne A) : équilibre la colonne face aux techniques
    buildCapacites(colA);
    // ===== colonne B =====
    buildTechniques(colB);

    function auraBigBox(k, tip) {
      var box = el("div", "pc-big pc-big--md");
      box.appendChild(el("span", "k", k));
      var v = el("span", "v", "");
      box.appendChild(v);
      box.title = tip;
      return { box: box, v: v };
    }
    function auraStep(parent, label, sub, key) {
      var row = el("div", "pc-opt-row");
      var nm = el("span", "pc-opt-name", label);
      nm.title = sub;
      row.appendChild(nm);
      stepper(row,
        function () { return state.auraDev[key] || 0; },
        function (v) { state.auraDev[key] = Math.max(0, v); },
        function () { return 0; },
        function () { return 999; });
      var st = el("span", "pc-opt-state");
      updaters.push(function () { st.textContent = sub; });
      row.appendChild(st);
      parent.appendChild(row);
    }
  }

  // --- techniques du Nen (colonne de l'onglet Nen) ------------------------------
  function buildTechniques(parent) {
    var b = block(parent, "Techniques", null,
      "Apprendre une technique coûte du DI ; une technique acquise reste. Un palier ou un bloc grisé a un prérequis non rempli.");
    var wrap = el("div", "pc-tech-list");   // même espacement que la grille d'arts
    b.appendChild(wrap);
    var techDescOpen = {};   // nom de technique -> déplié
    (DATA.techniques || []).forEach(function (t) { wrap.appendChild(techCard(t)); });

    function techCard(t) {
      var box = el("div", "pc-art-card");
      var head = el("div", "pc-art-head");
      head.appendChild(el("span", "pc-art-name", t.name));
      var hr = el("span", "pc-art-hr");
      if (t.tag) hr.appendChild(el("span", "pc-art-tag", t.tag));
      var hasTables = t.tables && t.tables.length;
      var canExpand = t.desc || hasTables;
      var chev = canExpand ? el("span", "pc-art-chev", "▸") : null;
      if (chev) hr.appendChild(chev);
      head.appendChild(hr);
      box.appendChild(head);
      if (canExpand) {
        // zone dépliable : description + tables internes (bonus chiffrés de Ren,
        // Ken, Ko, Ryu, rayons de l'En…), masquée tant que la carte n'est pas ouverte
        var expand = el("div", "pc-art-desc");
        if (t.desc) expand.appendChild(el("div", null, t.desc));
        (t.tables || []).forEach(function (tb) {
          var tbl = el("table", "pc-mini-table");
          var trh = el("tr");
          (tb.cols || []).forEach(function (c) { trh.appendChild(el("th", null, c)); });
          tbl.appendChild(trh);
          (tb.rows || []).forEach(function (r) {
            var tr = el("tr");
            r.forEach(function (c) { tr.appendChild(el("td", null, c)); });
            tbl.appendChild(tr);
          });
          expand.appendChild(tbl);
        });
        box.appendChild(expand);
        head.classList.add("clickable");
        head.title = "Afficher ou masquer le détail (description, bonus)";
        var setOpen = function (o) {
          box.classList.toggle("open", o); chev.textContent = o ? "▾" : "▸";
          if (o) techDescOpen[t.name] = 1; else delete techDescOpen[t.name];
        };
        head.addEventListener("click", function () { setOpen(!box.classList.contains("open")); });
        setOpen(!!techDescOpen[t.name]);
      }
      var seg = el("div", "pc-seg");
      var detail = el("div", "pc-art-effet pc-tech-detail");
      if (t.bloc) {
        var btn = el("button", "pc-seg-btn");
        btn.type = "button"; btn.textContent = "Apprendre";
        btn.addEventListener("click", function () {
          if (!prereqAllMet(t.prereq) && !state.techniques[t.name]) return;
          if (state.techniques[t.name]) delete state.techniques[t.name]; else state.techniques[t.name] = true;
          syncBloc(); refresh();
        });
        seg.appendChild(btn);
        var cost = el("span", "pc-tech-cost", t.cout != null ? t.cout + " DI" : "");
        seg.appendChild(cost);
        function syncBloc() {
          var on = !!state.techniques[t.name];
          var ok = prereqAllMet(t.prereq);
          btn.classList.toggle("on", on);
          btn.textContent = on ? "Apprise" : "Apprendre";
          btn.disabled = !on && !ok;
          detail.textContent = t.prereq && t.prereq.toLowerCase() !== "aucun" ? "Prérequis : " + t.prereq : "";
          detail.classList.toggle("pc-warn-inline", !ok && !on);
        }
        updaters.push(syncBloc); syncBloc();
      } else {
        var labels = ["—"].concat(t.paliers.map(function (p) { return p.niveau; }));
        var btns = [];
        labels.forEach(function (lb, i) {
          var pb = el("button", "pc-seg-btn");
          pb.type = "button"; pb.textContent = lb;
          pb.title = lb;
          pb.addEventListener("click", function () {
            if (i === 0) { delete state.techniques[t.name]; if (t.name === "En") state.enRayon = 0; }
            else {
              var pal = t.paliers[i - 1];
              if (!prereqAllMet(pal.prereq)) return;
              state.techniques[t.name] = pal.niveau;
            }
            syncPal(); refresh();
          });
          seg.appendChild(pb); btns.push(pb);
        });
        var cost2 = el("span", "pc-tech-cost", "");
        seg.appendChild(cost2);
        function syncPal() {
          var r = techRank(t.name);
          btns.forEach(function (pb, i) {
            pb.classList.toggle("on", i - 1 === r);
            if (i === 0) return;
            var pal = t.paliers[i - 1];
            pb.disabled = !prereqAllMet(pal.prereq) && (i - 1 !== r);
            pb.title = pal.niveau + " · " + (pal.cout != null ? pal.cout + " DI" : "") + (pal.prereq ? " · prérequis : " + pal.prereq : "");
          });
          var pal = r >= 0 ? t.paliers[r] : null;
          cost2.textContent = pal && pal.cout != null ? pal.cout + " DI" : "";
          detail.textContent = pal ? pal.desc : (t.desc ? "" : "");
        }
        updaters.push(syncPal); syncPal();
      }
      box.appendChild(seg);
      box.appendChild(detail);
      // Rayon de l'En : déblocage cran par cran (le 1 m est compris dans l'En, puis
      // chaque cran coûte son DI et exige le précédent). Grisé tant que l'En n'est pas
      // appris ; le coût DI cumulé passe dans techDiSpent, l'aura par tour est le drain
      // d'UAD en jeu (info seule).
      if (t.rayons && t.rayons.length) {
        var ry = t.rayons;
        var rbox = el("div", "pc-en-rayon");
        rbox.appendChild(el("span", "l", "Rayon"));
        var rstep = el("span", "pc-step");
        var rminus = el("button", null, "−"); rminus.type = "button";
        var rval = el("span", "v", "");
        var rplus = el("button", null, "+"); rplus.type = "button";
        rminus.addEventListener("click", function () {
          if (techRank(t.name) < 0) return;
          state.enRayon = Math.max(0, enRayonIdx() - 1); refresh();
        });
        rplus.addEventListener("click", function () {
          if (techRank(t.name) < 0) return;
          state.enRayon = Math.min(enRayonMax(), enRayonIdx() + 1); refresh();
        });
        rstep.appendChild(rminus); rstep.appendChild(rval); rstep.appendChild(rplus);
        rbox.appendChild(rstep);
        var rcost = el("span", "pc-en-cost", "");
        rbox.appendChild(rcost);
        box.appendChild(rbox);
        updaters.push(function () {
          var on = techRank(t.name) >= 0, idx = enRayonIdx();
          rbox.classList.toggle("off", !on);
          rminus.disabled = !on || idx <= 0;
          rplus.disabled = !on || idx >= enRayonMax();
          rval.textContent = on ? ry[idx].rayon : "—";
          rcost.textContent = on
            ? (enRayonDiSpent() + " DI · " + ry[idx].auraTour + " aura/tour")
            : "apprendre l'En d'abord";
          rbox.title = "Chaque cran au-delà de 1 m coûte son DI (le 1 m est compris dans l'En) ; l'aura par tour est le drain d'UAD quand l'En est déployé à ce rayon.";
        });
      }
      return box;
    }
  }

  // --- capacités du Nen : liste + ouverture de l'Atelier ------------------------
  function buildCapacites(parent) {
    var b = block(parent, "Capacités", null,
      "Chaque capacité (Hatsu) se construit dans l'Atelier. Créer ou modifier une capacité y ouvre son schéma ; à l'enregistrement, elle revient sur la fiche.");
    var list = el("div", "pc-forma-buys");
    b.appendChild(list);
    var gateNote = el("div", "pc-block-note");
    b.appendChild(gateNote);

    function render() {
      list.innerHTML = "";
      state.capacites.forEach(function (cap) {
        var row = el("div", "pc-cap-line");
        var main = el("div", "pc-cap-main");
        var nm = el("span", "nm", cap.name || "Capacité sans nom");
        main.appendChild(nm);
        if (cap.report) {
          var meta = [];
          var soc = cap.report.socle || cap.report.type;
          if (soc) meta.push(soc);
          var cost = capCostLabel(cap.report);
          if (cost) meta.push(cost);
          if (cap.report.uaa != null) meta.push(cap.report.uaa + " UAA");
          if (cap.report.ma) meta.push(cap.report.ma + " MA");
          main.appendChild(el("span", "meta", meta.join(" · ")));
        }
        row.appendChild(main);
        var edit = el("button", "pc-mini", "Modifier"); edit.type = "button";
        edit.addEventListener("click", function () { openAtelier(cap); });
        row.appendChild(edit);
        var del = el("button", "pc-mini danger", "×"); del.type = "button"; del.title = "Retirer cette capacité";
        del.addEventListener("click", function () {
          var i = state.capacites.indexOf(cap);
          if (i >= 0) state.capacites.splice(i, 1);
          render(); refresh(); save();
        });
        row.appendChild(del);
        list.appendChild(row);
      });
      var add = el("button", "pc-mini", "+ Créer une capacité dans l'Atelier"); add.type = "button";
      add.addEventListener("click", function () {
        var cap = { id: capId(), name: "Nouvelle capacité", atelier: null, report: null };
        state.capacites.push(cap);
        render(); save();
        openAtelier(cap);
      });
      list.appendChild(add);
    }
    updaters.push(function () {
      gateNote.textContent = hasHatsu() ? "" : "Créer une capacité exige le Hatsu.";
      list.style.opacity = hasHatsu() ? "1" : ".5";
      list.querySelectorAll("button").forEach(function (btn) { btn.disabled = !hasHatsu(); });
    });
    render();
    capacitesRender = render;   // pour rafraîchir après un retour de l'Atelier
  }

  // --- onglet Options : réglages manuels ----------------------------------------
  // Ce que le personnage peut ou ne peut pas, au-delà de ce que sa forme lui
  // donne : autoriser ou verrouiller une compétence hors de portée, changer le
  // niveau d'un sens. Tout est « à valider avec le MJ » ; rien n'est imposé.
  function buildOptions(pane) {
    var cols = el("div", "pc-cols2");
    var colA = el("div", "pc-col"), colB = el("div", "pc-col");
    cols.appendChild(colA); cols.appendChild(colB);
    pane.appendChild(cols);
    // ---- actions sur la fiche (imprimer / exporter / importer / réinitialiser) ----
    var bAct = block(colB, "Fiche");
    var actWrap = el("div", "pc-opt-actions");
    buildActionsInto(actWrap);
    bAct.appendChild(actWrap);
    // ---- compétences autorisées ----
    var bC = block(colA, "Compétences autorisées", null,
      "Par défaut, une compétence que le corps du personnage ne porte pas est verrouillée : voler sans ailes, un sens que la forme n'a pas. Ce réglage l'autorise ou la verrouille à la main. « Automatique » suit la forme.");
    var toolsC = el("div", "pc-comp-tools");
    var toutes = el("span", "pc-chip");
    toutes.textContent = "Toutes les compétences";
    var showAll = false;
    toutes.addEventListener("click", function () { showAll = !showAll; toutes.classList.toggle("on", showAll); renderAcc(); });
    toolsC.appendChild(toutes);
    bC.appendChild(toolsC);
    var accList = el("div", "pc-opt-list");
    bC.appendChild(accList);
    var accSync = [];
    updaters.push(function () { accSync.forEach(function (f) { f(); }); });
    // Par défaut, on ne montre que ce qui mérite un réglage : les compétences que
    // la forme verrouille, et celles déjà réglées à la main. Le chip « Toutes »
    // ouvre la liste complète.
    function special(k) {
      return !compAccessDefault(k) || (k.name in state.compAccess);
    }
    function accRow(k) {
      var row = el("div", "pc-opt-row");
      var nm = el("span", "pc-opt-name", k.name);
      nm.title = k.desc;
      row.appendChild(nm);
      var sel = el("select", "pc-select");
      [["auto", "Automatique"], ["on", "Autorisée"], ["off", "Verrouillée"]].forEach(function (o) {
        var e = el("option"); e.value = o[0]; e.textContent = o[1]; sel.appendChild(e);
      });
      sel.value = state.compAccess[k.name] === true ? "on" : state.compAccess[k.name] === false ? "off" : "auto";
      sel.addEventListener("change", function () {
        if (sel.value === "on") state.compAccess[k.name] = true;
        else if (sel.value === "off") state.compAccess[k.name] = false;
        else delete state.compAccess[k.name];
        refresh();
      });
      row.appendChild(sel);
      var st = el("span", "pc-opt-state");
      accSync.push(function () {
        var acc = compAccessible(k);
        st.textContent = acc ? "autorisée" : "verrouillée";
        st.classList.toggle("ko", !acc);
        st.title = "Par la forme : " + (compAccessDefault(k) ? "autorisée" : "verrouillée") + ".";
      });
      row.appendChild(st);
      return row;
    }
    function renderAcc() {
      accList.innerHTML = "";
      accSync.length = 0;
      var cur = null, n = 0;
      DATA.competences.forEach(function (k) {
        if (!showAll && !special(k)) return;
        if (k.champ !== cur) { cur = k.champ; accList.appendChild(el("div", "pc-comp-champ", "Champ " + cur)); }
        accList.appendChild(accRow(k));
        n++;
      });
      if (!n) accList.appendChild(el("div", "pc-empty", "Aucune compétence à régler : la forme les autorise toutes."));
      refresh();
    }
    renderAcc();

    // ---- niveau des sens ----
    var bS = block(colB, "Niveau des sens", null,
      "Le niveau de chaque sens vient de la forme du personnage. Ce réglage le change à la main. « Automatique » suit la forme.");
    var sList = el("div", "pc-opt-list");
    bS.appendChild(sList);
    var sSync = [];
    updaters.push(function () { sSync.forEach(function (f) { f(); }); });
    ["externe", "interne"].forEach(function (typ) {
      sList.appendChild(el("div", "pc-comp-champ", typ === "externe" ? "Sens externes" : "Sens internes"));
      DATA.sens.filter(function (s) { return s.type === typ; }).forEach(function (s) {
        var row = el("div", "pc-opt-row");
        var nm = el("span", "pc-opt-name", s.name);
        row.appendChild(nm);
        var sel = el("select", "pc-select");
        var opt0 = el("option"); opt0.value = ""; opt0.textContent = "Automatique"; sel.appendChild(opt0);
        SENS_NIVEAUX.forEach(function (nv) {
          var e = el("option"); e.value = nv; e.textContent = nv; sel.appendChild(e);
        });
        sel.value = state.sensOverride[s.name] || "";
        sel.addEventListener("change", function () {
          if (sel.value) state.sensOverride[s.name] = sel.value; else delete state.sensOverride[s.name];
          if (rebuildSens) rebuildSens();
          refresh();
        });
        row.appendChild(sel);
        var st = el("span", "pc-opt-state");
        sSync.push(function () {
          st.textContent = sensNiveau(s).toLowerCase();
          st.title = "Par la forme : " + sensNiveauForme(s).toLowerCase() + ".";
        });
        row.appendChild(st);
        sList.appendChild(row);
      });
    });
  }

  // --- fiche imprimable ---------------------------------------------------------
  function printSheet() {
    var old = document.getElementById("pc-print");
    if (old) old.remove();
    var p = el("div"); p.id = "pc-print";
    function h(tag, txt) { var e = el(tag, null, txt); p.appendChild(e); return e; }
    function table(head, rows) {
      var t = el("table"), tr = el("tr");
      head.forEach(function (x) { tr.appendChild(el("th", null, x)); });
      t.appendChild(tr);
      rows.forEach(function (r) {
        var row = el("tr");
        r.forEach(function (x) { row.appendChild(el("td", null, String(x))); });
        t.appendChild(row);
      });
      p.appendChild(t);
      return t;
    }
    h("h2", state.name || "Personnage sans nom");
    var t0 = tailleCat();
    h("p", ["Niveau " + niveau() + " (" + fmt(state.pfTotal) + " PF)",
            "Éclat " + state.eclatA + (state.eclatA !== state.eclatN ? " (naissance " + state.eclatN + ")" : ""),
            state.classe ? "Classe : " + state.classe : null,
            state.age ? state.age + " ans" : null, state.genre || null,
            state.tailleCm ? state.tailleCm + " m" : null, state.poids ? state.poids + " kg" : null,
            "Taille " + state.tailleCat + (t0 && t0.pvMod ? " (" + signed(t0.pvMod) + " PV/niv)" : ""),
            state.forme ? "Forme " + state.forme : null
           ].filter(Boolean).join(" · "));

    h("h3", "Caractéristiques");
    var caracRows = DATA.caracs.map(function (k) {
      return [k.abbr, k.name, caracVal(k.abbr), signed(modOf(caracVal(k.abbr)))];
    });
    table(["", "Caractéristique", "Valeur", "Modificateur"], caracRows);

    h("h3", "Combat et capacités");
    var mv = capRow("mouvement", capVal("mouvement")) || [];
    var pt = capRow("port", capVal("port")) || [];
    var ap = capRow("apnee", capVal("apnee")) || [];
    var re = capRow("repos", capVal("repos")) || [];
    var fo = capRow("fond", capVal("fond")) || [];
    table(["PV (courants / max)", "Initiative", "Esquive", "Parade", "Points de fatigue"],
          [[fmt(pvCourant()) + " / " + fmt(pvMax()), signed(compTotal("Initiative") + modsGlobaux()), signed(compTotal("Esquive") + modsGlobaux()),
            signed(compTotal("Parade") + modsGlobaux()), fatiguePts() + " / " + fatigueMax()]]);
    h("p", "Points de fatigue : maximum = Endurance + bonus ; +15 au jet par point consommé (5 max par jet) ; −10 à tous les jets par point sous zéro ; effondrement à −" + fatigueMax() + ".");
    if (modsGlobaux()) h("p", "Modificateur à toutes les actions : " + signed(modsGlobaux()) +
      (fatiguePts() < 0 ? " (dont fatigue " + signed(10 * Math.min(0, fatiguePts())) + ")" : "") +
      " — déjà compté dans Initiative, Esquive et Parade ci-dessus, à reporter sur les autres jets (le tableau Armes ne le compte pas).");
    var etatLines = [];
    (DATA.etats || []).forEach(function (e) {
      var v = state.etatsActifs[e.name];
      if (!v) return;
      var p = null;
      if (v !== true) e.paliers.forEach(function (x) { if (x.name === v) p = x; });
      var mods = (p ? p.mods : e.mods).map(function (m) { return m.cible + " " + signed(m.val); }).join(" · ");
      etatLines.push([e.name + (p ? " (" + p.name + ")" : ""),
                      (e.name === "Abri" ? "subi par l'assaillant : " : "") + (mods || "voir la règle")]);
    });
    if (etatLines.length) { h("h3", "États en cours"); table(["État", "Effets"], etatLines); }
    var reCols = DATA.capacites.repos ? DATA.capacites.repos.cols.join(" · ") : "";
    var foCols = DATA.capacites.fond ? DATA.capacites.fond.cols.join(" · ") : "";
    table(["Mouvement (légère · interm. · lourde)", "Port (légère · interm. · lourde)",
           "Apnée (légère · interm. · lourde)", "Repos (" + reCols + ")", "Fond (" + foCols + ")"],
          [[mv.join(" · "), pt.join(" · "), ap.join(" · "), re.join(" · "), fo.join(" · ")]]);

    h("h3", "Compétences");
    var invested = DATA.competences.filter(function (k) { return state.comps[k.name] > 0 || diversOf(k.name); });
    var compRows = invested.map(function (k) {
      return [k.name, caracAbbr(k.carac), "+" + compBase(k.name),
              diversOf(k.name) ? signed(diversOf(k.name)) : "", signed(compTotal(k.name))];
    });
    state.customComps.forEach(function (c) {
      if (!(c.pf > 0) && !c.divers) return;
      compRows.push([c.name + " (perso)", c.carac, "+" + ((c.pf || 0) / 5) * 20,
                     c.divers ? signed(c.divers) : "", signed(customTotal(c))]);
    });
    if (compRows.length) {
      table(["Compétence", "Carac", "Base", "Divers", "Total"], compRows);
      h("p", "Toute autre compétence vaut le modificateur de sa caractéristique.");
    } else {
      h("p", "Aucun PF investi : chaque compétence vaut le modificateur de sa caractéristique.");
    }

    if (state.armeDepart || state.formations.length) {
      h("h3", "Formations");
      var lines = [];
      if (state.armeDepart) lines.push(["Arme de départ", state.armeDepart]);
      state.formations.forEach(function (f) {
        var d = formationByName(f.name);
        lines.push([f.name + (f.choix ? " (" + f.choix + ")" : ""), d ? d.cout + " PF" : ""]);
      });
      table(["Formation", ""], lines);
      h("p", "Arme inconnue : −20 (même famille qu'une arme connue) ou −40 (famille étrangère) en attaque et parade.");
    }

    h("h3", "Armes");
    var portees = DATA.armes.filter(function (a) { return a.corps; }).map(function (a) { return { a: a, name: a.name }; })
      .concat(state.armes.map(function (e) { return { a: armeByName(e.name), name: e.name, entry: e }; }));
    table(["Arme", "Attaque", "Parade", "Dégâts", "Notes"], portees.map(function (x) {
      if (!x.a) return [x.name, "MJ", "MJ", "MJ", "arme forgée (Forge)"];
      var lourd = lourdeurMalus(x.a);
      var dvv = armeDivers(x.a, x.entry);
      var atk = armeTypes(x.a).map(function (t) { return t.label + " " + signed(compTotal(t.comp) + malusArme(x.a, t.label) + lourd + dvv); }).join(" · ");
      var famP = malusArme(x.a, "Parade");
      var par = /\bParade\b/.test(x.a.props) ? signed(compTotal("Parade") + famP + dvv) : "—";
      var md = modDegatsArme(x.a);
      var famGen = malusArme(x.a);
      var notes = [];
      if (famGen) notes.push("familiarité " + signed(famGen));
      if (lourd) notes.push("Lourdeur " + signed(lourd) + " à l'attaque");
      if (dvv) notes.push("divers " + signed(dvv));
      return [x.name, atk, par, String(x.a.degats) + (md.val || md.txt ? " " + signed(md.val) + (md.txt ? " (" + md.txt + ")" : "") : ""), notes.join(" · ")];
    }));
    h("p", "Le modificateur à toutes les actions n'est pas compté dans ce tableau.");

    var artNames = Object.keys(state.arts);
    if (artNames.length) {
      h("h3", "Arts");
      table(["Art", "Palier", "Frappe / effet"], artNames.map(function (n) {
        var a = artByName(n), pal = state.arts[n];
        var pd = null;
        (a && a.paliers || []).forEach(function (x) { if (x.niveau === pal) pd = x; });
        var extra = a && a.frappe ? "Frappe " + frappeTxt(a, pal) : (pd && pd.effet ? pd.effet : "");
        return [n, pal, extra];
      }));
    }

    if (hasNen()) {
      h("h3", "Nen" + (state.archetype ? " — " + state.archetype : ""));
      h("p", "Prestige " + prestige() + " · développement intérieur " + diSpent() + " / " + (state.diTotal || 0) + " DI · "
        + "UAM " + fmt(uam()) + " · UAD " + fmt(uam()) + " · UAR " + uar() + " · RUA " + rua()
        + (state.archetype ? " · affinités " + affinites().map(function (v, i) { return NEN_CAT_META[DATA.nenCats[i]].sigle + " " + v + "%"; }).join(", ") : ""));
      var techRows = [];
      (DATA.techniques || []).forEach(function (t) {
        if (!state.techniques[t.name]) return;
        var v = state.techniques[t.name];
        var pal = v === true ? "apprise" : v;
        // rayon de l'En : cran déployable + DI cumulé
        if (t.name === "En" && t.rayons && t.rayons[enRayonIdx()])
          pal += " · rayon " + t.rayons[enRayonIdx()].rayon + " (" + enRayonDiSpent() + " DI)";
        techRows.push([t.name, pal]);
      });
      if (techRows.length) table(["Technique", "Palier"], techRows);
      var poolRows = DATA.nenCats.filter(function (c) { return (state.diCat[c] || 0) > 0 || capDevByCat(c) > 0; })
        .map(function (c) { return [c, NEN_CAT_META[c].sigle + " " + capDevByCat(c) + "/" + poolCat(c), (state.diCat[c] || 0) + " DI · " + affiniteCat(c) + "%"]; });
      if (poolRows.length) table(["Catégorie", "Dév. utilisé / pool", "Investi"], poolRows);
      if (state.capacites.length) table(["Capacité", "Socle", "Coûts"], state.capacites.map(function (c) {
        var r = c.report || {};
        return [c.name, r.socle || r.type || "", [capCostLabel(r), r.uaa != null ? r.uaa + " UAA" : "", r.ma ? r.ma + " MA" : ""].filter(Boolean).join(" · ")];
      }));
    }

    if (state.inventaire.length) {
      h("h3", "Équipement (" + fmt(argentDepense()) + " Ɉ · bourse " + fmt(state.argent) + " Ɉ)");
      table(["Objet", "Détail", "Prix", "Familiarité"], state.inventaire.map(function (it) {
        var a = it.arme && !it.forge ? armeByName(it.name) : null;
        var m = a ? malusArme(a) : 0;
        var fam = !it.arme ? "" : it.forge ? "au choix du MJ" : (m ? String(m).replace("-", "−") : "connue");
        return [it.name,
                a ? a.famille + " · Dégâts " + a.degats + " · " + a.portee : (it.forge ? "arme forgée" : ""),
                it.prix ? fmt(it.prix) + " Ɉ" : "—",
                fam];
      }));
    }

    var acRows = DATA.sens.map(function (s) { return { s: s, nv: sensNiveau(s) }; })
      .filter(function (x) { return x.nv !== "Inexistant" && x.nv !== "Latent"; });
    h("h3", "Sens (clarté de départ 10)");
    table(["Sens", "Niveau", "Clarté"], acRows.map(function (x) {
      return [x.s.name, x.nv, state.acuite[x.s.name] != null ? state.acuite[x.s.name] : 10];
    }));

    var avs = state.avantages.filter(function (a) { return (a.name || "").trim(); });
    if (avs.length) {
      h("h3", "Avantages (" + avPtsSpent() + " / " + avPtsTotal() + " points d'avantage)");
      table(["Nom", "Coût", "Effet"], avs.map(function (a) {
        var b = avByName(a.name);
        return [a.name, b ? (b.coutTxt || b.cout + " points") : "", a.note || (b ? b.desc : "")];
      }));
    }

    if (state.notes) { h("h3", "Notes"); h("p", state.notes); }

    h("h3", "Échelle de difficulté");
    table(["Difficulté", "Seuil"], DATA.difficultes.map(function (d) { return [d.name, d.seuil]; }));

    document.body.appendChild(p);
    document.documentElement.classList.add("pc-printing");
    var done = function () {
      document.documentElement.classList.remove("pc-printing");
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    setTimeout(done, 3000);   // filet si afterprint ne se déclenche pas
    window.print();
  }

  // --- export / import ------------------------------------------------------------
  function exportJson() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (state.name.trim() || "personnage") + ".json";
    a.click();
  }

  // Actions sur la fiche (imprimer / exporter / importer / réinitialiser) : posées
  // dans l'onglet Options plutôt qu'en tête de page, à la demande de l'utilisateur.
  function buildActionsInto(container) {
    var printB = el("button", "pc-btn"); printB.type = "button"; printB.textContent = "Imprimer la fiche";
    printB.addEventListener("click", printSheet);
    container.appendChild(printB);
    var expB = el("button", "pc-btn"); expB.type = "button"; expB.textContent = "Exporter (JSON)";
    expB.addEventListener("click", exportJson);
    container.appendChild(expB);
    var impIn = el("input"); impIn.type = "file"; impIn.accept = "application/json"; impIn.style.display = "none";
    var impB = el("button", "pc-btn"); impB.type = "button"; impB.textContent = "Importer (JSON)";
    impB.addEventListener("click", function () { impIn.click(); });
    impIn.addEventListener("change", function () {
      var f = impIn.files && impIn.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var s = normalize(JSON.parse(rd.result));
          if (!s) { alert("Format de personnage non reconnu."); return; }
          state = s; mount(rootEl);
        } catch (e) { alert("Fichier illisible : " + e.message); }
      };
      rd.readAsText(f);
      impIn.value = "";   // permet de re-sélectionner le même fichier
    });
    container.appendChild(impB); container.appendChild(impIn);
    var reset = el("button", "pc-btn danger"); reset.type = "button"; reset.textContent = "Réinitialiser";
    reset.addEventListener("click", function () {
      if (confirm("Repartir d'un personnage vierge ?")) { state = blank(); mount(rootEl); }
    });
    container.appendChild(reset);
  }

  // --- montage ---------------------------------------------------------------
  function mount(root) {
    rootEl = root;
    updaters = [];
    warnBox = meterBox = libSelect = null;
    root.innerHTML = "";
    var app = el("div", "perso-atelier");

    // Barre d'outils (chrome du site, hors de la feuille) : titre + enregistrer +
    // bibliothèque. MASQUÉE dans l'embed Roll20 (COMPACT), qui gère lui-même la
    // persistance via les Attributes du personnage. Les actions imprimer / exporter /
    // importer / réinitialiser vivent désormais dans l'onglet Options.
    if (!COMPACT) {
      var top = el("div", "pc-top");
      top.appendChild(el("span", "pc-top-title", "Création"));
      var saveB = el("button", "pc-btn primary"); saveB.type = "button"; saveB.textContent = "Enregistrer";
      saveB.addEventListener("click", saveCurrentPerso);
      top.appendChild(saveB);
      // bibliothèque : menu + charger / supprimer
      var lib = el("span", "pc-lib");
      libSelect = el("select");
      lib.appendChild(libSelect);
      var loadB = el("button", "pc-btn"); loadB.type = "button"; loadB.textContent = "Charger";
      loadB.addEventListener("click", function () {
        var p = loadPersos().filter(function (x) { return x.id === libSelect.value; })[0];
        if (p) loadPersoInto(p);
      });
      lib.appendChild(loadB);
      var delB = el("button", "pc-btn"); delB.type = "button"; delB.textContent = "Supprimer";
      delB.addEventListener("click", function () {
        var p = loadPersos().filter(function (x) { return x.id === libSelect.value; })[0];
        if (p && confirm("Supprimer « " + p.name + " » ?")) deletePerso(p.id);
      });
      lib.appendChild(delB);
      top.appendChild(lib);
      app.appendChild(top);
    }

    // la feuille
    var sheet = el("div", "pc-sheet");
    app.appendChild(sheet);

    // journal de jets (panneau flottant)
    rollPanel = el("div", "pc-rolls");
    var rHead = el("div", "pc-rolls-head");
    var rTitle = el("span", "t", "Jets");
    rTitle.addEventListener("click", function () { rollPanel.classList.toggle("open"); });
    rHead.appendChild(rTitle);
    var deIn = el("input", "de");
    deIn.type = "text"; deIn.value = state.de || "1d100";
    deIn.title = "Dé des jets (le livre ne nomme que le 1d100, dans les critiques) : 1d100, 3d20, 1d100+5…";
    deIn.addEventListener("input", function () {
      var v = deIn.value.trim();
      state.de = v || "1d100";
      deIn.classList.toggle("bad", !!v && !/^\d{1,2}d\d{1,4}([+-]\d{1,4})?$/.test(v));
      save();
    });
    rHead.appendChild(deIn);
    // se dépasser : consommer des points de fatigue sur le prochain jet (+15/point, 5 max)
    spendSel = el("select", "spend");
    spendSel.title = "Se dépasser : points de fatigue consommés sur le prochain jet, +15 chacun (5 au plus par jet).";
    for (var si = 0; si <= 5; si++) {
      var so = el("option"); so.value = String(si);
      so.textContent = si ? si + " pt" + (si > 1 ? "s" : "") + " (+" + 15 * si + ")" : "se dépasser";
      spendSel.appendChild(so);
    }
    rHead.appendChild(spendSel);
    var rClear = el("button", "pc-mini", "Vider"); rClear.type = "button";
    rClear.addEventListener("click", function () { rollHistory = []; renderRolls(); });
    rHead.appendChild(rClear);
    var rTog = el("button", "pc-mini", "▾"); rTog.type = "button"; rTog.title = "Réduire / déployer";
    rTog.addEventListener("click", function () { rollPanel.classList.toggle("open"); });
    rHead.appendChild(rTog);
    rollPanel.appendChild(rHead);
    rollPanel.appendChild(el("div", "pc-rolls-list"));
    app.appendChild(rollPanel);
    renderRolls();

    root.appendChild(app);

    buildHead(sheet);
    var panes = buildTabs(sheet);
    buildGeneral(panes.general);
    // Formations à gauche, Arts à droite (les arts, plus nombreux, prennent plus de place)
    var faCols = el("div", "pc-cols-fa");
    var faL = el("div", "pc-col"), faR = el("div", "pc-col");
    faCols.appendChild(faL); faCols.appendChild(faR);
    panes.formations.appendChild(faCols);
    buildFormations(faL);
    buildArts(faR);
    buildNen(panes.nen);
    buildOptions(panes.options);
    refresh();
  }

  function init() {
    var root = document.getElementById("perso-atelier");
    if (!root || root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    if (DATA) { state = load() || blank(); absorbAtelierReturn(); mount(root); return; }
    fetch(siteBase() + "creation.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) { DATA = d; state = load() || blank(); absorbAtelierReturn(); mount(root); })
      .catch(function (e) { root.innerHTML = '<p style="padding:2rem;color:#b0402c">Le créateur n\'a pas pu charger ses données (' + e.message + ").</p>"; });
  }

  if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
