/* Atelier de création de pouvoir — éditeur de nœuds façon ComfyUI / LiteGraph.
 *
 * Données (modules + archétypes) issues de nen-atelier.json, produit au build par
 * hooks/nen_atelier.py depuis les règles de Nen : une seule source de vérité.
 *
 * ANATOMIE D'UN NŒUD (convention LiteGraph/ComfyUI) :
 *   [ titre ]
 *   [ prises : entrées à gauche (une prise = un lien), sorties à droite ]
 *   [ widgets : les options du nœud ]
 *
 * DEUX TYPES DE PRISE :
 *   - « chaîne » (vert) : le flux qui assemble une capacité, de gauche à droite
 *       Socle → module → module → Fin de capacité.
 *   - « capacité » (or) : une référence à une capacité entière. Les modules qui
 *       « utilisent une capacité » (déclencheur, charge utile…) portent une
 *       entrée capacité que l'on relie à la sortie « référence » d'un socle.
 *
 * PRISES :
 *   - Socle : sorties [chaîne →] et [référence] ; aucune entrée.
 *   - Module : entrée [chaîne] (+ [capacité liée] si le module en référence une),
 *              sortie [chaîne].
 *   - Fin de capacité : entrée [chaîne] ; aucune sortie.
 *   Règle LiteGraph : une entrée n'accepte qu'un lien ; une sortie « chaîne » n'a
 *   qu'un successeur (chaîne linéaire) ; une sortie « référence » se partage.
 *
 * Affinité (composition du livre, module par module) :
 *   effective = base(catégorie) + [modif. global du socle + conditions du socle
 *               + modif. local module + conditions module + AE des paliers]
 *   décalages plafonnés à +100 ; multiplie la valeur des seuls effets chiffrés. */
(function () {
  "use strict";

  var DATA = null;
  var teardown = null;
  var handoff = null;   // relais depuis le créateur de personnage (capacité à créer/modifier)
  var SCHEMA = 4;   // format d'état (prises {node,slot} ; lien de référence module→capacité)
  var ARMES = [];   // armes du livre (armes.md), chargées depuis forge.json

  var CAT_VARS = {
    "renforcement": "--fg-renforcement", "émission": "--fg-emission",
    "transmutation": "--fg-transmutation", "manipulation": "--fg-manipulation",
    "conjuration": "--fg-conjuration", "spécialisation": "--fg-specialisation"
  };
  var CAT_LABEL = {
    "renforcement": "Renforcement", "émission": "Émission",
    "transmutation": "Transmutation", "manipulation": "Manipulation",
    "conjuration": "Conjuration", "spécialisation": "Spécialisation"
  };
  // 9 SOCLES (entrées de palette) mais seulement 5 TYPES (compatibilité) : plusieurs
  // socles partagent un type — créature conjurée + créature émise + créature manipulée = « créature ».
  var SOCLES = ["attaque", "défense", "effet", "bête", "objet", "objet-t", "bête-e", "emprise-etre", "emprise-objet"];
  var TYPES = ["attaque", "défense", "effet", "créature", "objet"];
  var TY_TYPE = { "bête": "créature", "bête-e": "créature", "emprise-etre": "créature", "objet": "objet", "objet-t": "objet", "emprise-objet": "objet" };
  function typeOf(ct) { return TY_TYPE[ct] || ct; }
  var TY_SLUG = { "attaque": "attaque", "défense": "defense", "effet": "effet", "bête": "bete", "objet": "objet", "objet-t": "objet-t", "bête-e": "bete-e", "emprise-etre": "emprise-etre", "emprise-objet": "emprise-objet" };
  var TY_LABEL = { "attaque": "Attaque", "défense": "Défense", "effet": "Effet", "bête": "Conjuration de créature", "objet": "Conjuration d'objet", "objet-t": "Transmutation d'objet", "bête-e": "Émission de créature", "emprise-etre": "Manipulation de créature", "emprise-objet": "Manipulation d'objet" };
  var TY_VAR = { "attaque": "--ty-attaque", "défense": "--ty-defense", "effet": "--ty-effet", "bête": "--fg-conjuration", "objet": "--fg-conjuration", "objet-t": "--fg-transmutation", "bête-e": "--fg-emission", "emprise-etre": "--fg-manipulation", "emprise-objet": "--fg-manipulation" };
  function tyTag(t) { return typeOf(t); }
  // un « socle-def » est un module des règles qui sert de socle (bête conjurée…) :
  // il porte ses grilles obligatoires et n'apparaît pas comme module dans la palette.
  function socleDefFor(ctype) {
    if (!DATA) return null;
    var target = ctype === "bête" ? "Conjuration de créature" : ctype === "objet" ? "Conjuration d'objet" : ctype === "objet-t" ? "Transmutation d'objet" : ctype === "bête-e" ? "Émission de créature" : ctype === "emprise-etre" ? "Manipulation de créature" : ctype === "emprise-objet" ? "Manipulation d'objet" : ctype === "attaque" ? "Attaque" : ctype === "défense" ? "Défense" : ctype === "effet" ? "Effet" : null;
    if (!target) return null;
    // isSocleDefModule pour départager du module de renforcement homonyme (« Attaque »).
    for (var i = 0; i < DATA.modules.length; i++) if (DATA.modules[i].name === target && isSocleDefModule(DATA.modules[i])) return DATA.modules[i];
    return null;
  }
  function isSocleDefModule(m) { return !!(m.special && /^socle\s*:/i.test(m.special)); }
  // sous-label d'un module dans la palette/recherche : ses types, sinon « tous types »
  // pour un module non contraignant mais catégorisé (ex. Maintenir à Distance), « structurel » seulement si sans catégorie.
  function subLabel(m) { return m.types.length ? m.types.join(", ") : (m.category ? "tous types" : (m.special || "structurel")); }
  // description d'un module : un <p> par paragraphe (le JSON préserve les \n\n du livre)
  function descBlock(text) {
    var d = h("div", { class: "nf-desc" });
    String(text).split(/\n{2,}/).forEach(function (p) { if (p.trim()) d.appendChild(h("p", {}, [p.trim()])); });
    return d;
  }

  function catColor(cat) { return "var(" + (CAT_VARS[cat] || "--fg-raccord") + ")"; }
  function catName(cat) { return cat ? (CAT_LABEL[cat] || cat) : "Raccord"; }
  function tyColor(t) { return "var(" + (TY_VAR[t] || "--ty-end") + ")"; }

  // développement par catégorie : on conçoit un module en payant le développement
  // de sa catégorie (DR/DE/…), acheté depuis le DI selon l'affinité d'apprentissage.
  var DEV_LABEL = { "renforcement": "DR", "émission": "DE", "transmutation": "DT", "manipulation": "DM", "conjuration": "DC", "spécialisation": "DS" };
  function devLabel(cat) { return DEV_LABEL[cat] || "DI"; }
  // sigle de la caractéristique mentale requise, par catégorie de Nen
  var CAT_CARAC = { "renforcement": "VOL", "émission": "LOG", "transmutation": "INS", "manipulation": "ERU", "conjuration": "IMA", "spécialisation": "CHA" };
  function caracOf(cat) { return CAT_CARAC[cat] || "CAR"; }
  // Libellé de la colonne d'aura d'un module : « UA », ou « UAA » (unité d'aura accumulée)
  // si l'une de ses grilles se paie en aura accumulée (ex. Réserve de Nen).
  function moduleUaLbl(def) {
    if (def && def.grids) for (var i = 0; i < def.grids.length; i++) for (var j = 0; j < def.grids[i].groups.length; j++) { var u = def.grids[i].groups[j].uaLabel; if (u) return u; }
    return "UAA";
  }
  // cases [sigle, valeur] de carac requise, une par catégorie utilisée (pour costStrip)
  function caracBoxes(carByCat) {
    return Object.keys(carByCat || {}).filter(function (k) { return carByCat[k] != null; }).map(function (k) { return [caracOf(k), carByCat[k]]; });
  }
  // DI nécessaires pour obtenir `dx` unités de développement à l'affinité `aa` (%),
  // par blocs de 10 DI (10 DI → aa/10 unités). aa ≤ 0 : catégorie non apprise.
  function diForDev(dx, aa) { if (!aa || aa <= 0) return dx > 0 ? Infinity : 0; return 10 * Math.ceil(dx / (aa / 10)); }

  // bandeau de coûts compact ([["DI",15],["UA",120]…]) et ligne d'effet de module
  function costStrip(items) {
    return h("div", { class: "nf-costs" }, items.map(function (it) {
      return h("div", { class: "nf-cost" }, [h("span", { class: "k" }, [it[0]]), h("span", { class: "v" }, [String(it[1])])]);
    }));
  }
  function modLine(ln) {
    var right = ln.scaled != null ? (ln.scaledFrom + " → " + ln.scaled + " (" + ln.eff + " %)") : (ln.eff != null ? ln.eff + " %" : "");
    return h("div", { class: "nf-mod-line" }, [
      h("span", { class: "dot", style: "color:" + catColor(ln.cat) }, ["●"]),
      h("span", {}, [ln.name]), right ? h("span", { class: "val" }, [right]) : null
    ]);
  }
  // pastilles de développement par catégorie ({renforcement:25} -> « 25 DR »)
  function devBadges(dxByCat) {
    return Object.keys(dxByCat).filter(function (cat) { return dxByCat[cat]; }).map(function (cat) {
      var isc = cat === "raccord";
      return h("span", { class: "nf-dev-b", style: "background:" + (isc ? "var(--fg-raccord)" : catColor(cat)) }, [dxByCat[cat] + " " + (isc ? "DI" : devLabel(cat))]);
    });
  }
  function devLineEl(dxByCat) { return h("div", { class: "nf-devline" }, [h("span", { class: "nf-devlbl" }, ["Conception"])].concat(devBadges(dxByCat))); }

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") el.className = attrs[k];
      else if (k === "style") el.style.cssText = attrs[k];
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) {
      if (c == null) return;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return el;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function siteBase() {
    var l = document.querySelector('link[href*="assets/"], script[src*="assets/"]');
    var u = l ? (l.href || l.getAttribute("src")) : null;
    if (u) { var i = u.indexOf("assets/"); if (i >= 0) return u.slice(0, i); }
    return new URL(".", location.href).href;
  }

  // ======================================================================
  //  MOTEUR
  // ======================================================================
  // Armes enregistrées par la Forge (localStorage partagé « forge-weapons »).
  function savedWeapons() { try { var a = JSON.parse(localStorage.getItem("forge-weapons")); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function bookWeapons() { return ARMES || []; }
  function poolFor(source) { return source === "book" ? bookWeapons() : savedWeapons(); }   // « livre » vs « Forge »
  function moduleDef(id) {
    for (var i = 0; i < DATA.modules.length; i++)
      if (DATA.modules[i].id === id) return DATA.modules[i];
    return null;
  }
  function isDeclencheur(def) { return def && !def.category && /déclencheur/i.test(def.name); }
  function isDeclencheurDefense(def) { return isDeclencheur(def) && /défense/i.test(def.name); }
  // Un module « utilise une capacité » : il porte alors une prise capacité liée.
  function needsRef(def) {
    if (!def) return false;
    if (isDeclencheur(def)) return true;
    // participe/adjectif après « capacité » (capacité LIÉE, cataloguÉE, transportÉE…) — pas le verbe (« la capacité transporte l'émitteur » ne compte pas)
    return /capacit[ée]s?\s+(li[ée]es?|internes?|catalogu[ée]es?|d[ée]clench[ée]es?|embarqu[ée]es?|transport[ée]es?|d[ée]livr[ée]es?)/i.test(def.description || "");
  }
  function currentArchetype(state) {
    return DATA.archetypes.find(function (a) { return a.name === state.archetype; }) || null;
  }
  function forEachModule(state, fn) {
    for (var id in state.nodes) if (state.nodes[id].kind === "module") fn(state.nodes[id]);
  }

  // Définition des prises d'un nœud (name, label, type 'chain'|'cap', dir 'in'|'out').
  function slotsOf(node) {
    if (node.kind === "start") {
      // entrée « référence » (or) : cette capacité est déclenchée/utilisée par un module.
      var sin = [{ name: "ref", label: "référence", type: "cap", dir: "in" }];
      // Conjuration / Transmutation d'objet : entrée « objet » (acier) où brancher une arme de la Forge.
      if (node.ctype === "objet" || node.ctype === "objet-t") sin.push({ name: "objet", label: "objet", type: "objet", dir: "in" });
      return { inputs: sin, outputs: [{ name: "chain", label: "capacité →", type: "chain", dir: "out" }] };
    }
    if (node.kind === "end") return {
      inputs: [{ name: "in", label: "capacité", type: "chain", dir: "in" }], outputs: []
    };
    // node « arme » (référence une arme enregistrée) : une seule sortie « objet ».
    if (node.kind === "arme") return { inputs: [], outputs: [{ name: "objet", label: "objet →", type: "objet", dir: "out" }] };
    var def = moduleDef(node.defId);
    var outs = [{ name: "out", label: "sortie", type: "chain", dir: "out" }];
    // sortie « capacité liée » (or) : ce module pilote une autre capacité.
    if (needsRef(def)) outs.push({ name: "ref", label: "capacité liée", type: "cap", dir: "out" });
    return { inputs: [{ name: "in", label: "entrée", type: "chain", dir: "in" }], outputs: outs };
  }

  // ---- arêtes (edge = {from:{node,slot}, to:{node,slot}, type}) ----
  function chainSucc(state, id) {
    for (var i = 0; i < state.edges.length; i++) { var e = state.edges[i]; if (e.type === "chain" && e.from.node === id) return e; }
    return null;
  }
  function reaches(state, a, b) {
    var seen = {}, cur = a;
    while (cur) { if (cur === b) return true; if (seen[cur]) return false; seen[cur] = 1; var e = chainSucc(state, cur); cur = e ? e.to.node : null; }
    return false;
  }
  function chainOf(state, startId) {
    var mods = [], seen = {}, endId = null, terminated = false, cur = startId;
    while (true) {
      var e = chainSucc(state, cur); if (!e) break;
      var nxt = state.nodes[e.to.node]; if (!nxt || seen[nxt.id]) break;
      seen[nxt.id] = 1;
      if (nxt.kind === "end") { endId = nxt.id; terminated = true; break; }
      if (nxt.kind === "module") { mods.push(nxt); cur = nxt.id; continue; }
      break;
    }
    return { modules: mods, endId: endId, terminated: terminated };
  }
  function refTargetOf(state, moduleId) {
    // le module pilote une capacité : lien cap sortant de sa prise « ref » vers un socle.
    for (var i = 0; i < state.edges.length; i++) {
      var e = state.edges[i];
      if (e.type === "cap" && e.from.node === moduleId && e.from.slot === "ref") return e.to.node;
    }
    return null;
  }
  // un module PEUT piloter plusieurs capacités (ex. Catalogue) : ce socle est-il parmi ses liens cap ?
  function refLinks(state, moduleId, socleId) {
    for (var i = 0; i < state.edges.length; i++) {
      var e = state.edges[i];
      if (e.type === "cap" && e.from.node === moduleId && e.to.node === socleId) return true;
    }
    return false;
  }
  // Arme reliée à l'entrée « objet » d'un socle de Conjuration d'objet (edge objet : arme → socle).
  function objetTargetOf(state, socleId) {
    for (var i = 0; i < state.edges.length; i++) {
      var e = state.edges[i];
      if (e.type === "objet" && e.to.node === socleId && e.to.slot === "objet") return e.from.node;
    }
    return null;
  }
  // Ligne « Cible » retenue d'un module déclencheur : « Attaquant » | « Défenseur » | null.
  function declencheurCible(node) {
    var def = moduleDef(node.defId), res = null;
    def.grids.forEach(function (grid, gi) {
      grid.groups.forEach(function (grp, pi) {
        if (/^cible/i.test(grp.label || "")) { var s = node.sel[gi + "." + pi]; if (s != null && s !== "" && grp.rows[s]) res = grp.rows[s].label; }
      });
    });
    return res;
  }
  // Cible par défaut selon le socle. Les FACULTÉS que le porteur exerce depuis lui-même
  // (attaque/défense/effet, transmutation d'arme, MANIPULATION de créature/d'objet) restent
  // « Soi-même » : maintien direct ; pour agir sur une créature/un objet extérieur, on les
  // raccorde (déclencheur, module de ciblage…) qui déplace la cible. Les socles qui CRÉENT une
  // entité séparée (conjuration/émission de créature, conjuration d'objet) ont pour cible cette
  // entité extérieure → maintien au contact ou relais.
  function defaultCible(ctype) {
    if (ctype === "bête" || ctype === "bête-e") return "La créature";
    if (ctype === "objet") return "L'objet";
    return "Soi-même";
  }
  // Cible EFFECTIVE d'une capacité : le défaut du socle, sauf si un déclencheur la vise. Un
  // déclencheur d'ATTAQUE réglé sur « Défenseur » la fait porter sur le défenseur touché ; un
  // déclencheur de DÉFENSE réglé sur « Attaquant » la fait porter sur l'attaquant contré. Une
  // capacité cataloguée garde sa cible propre (par défaut « Soi-même », celui qui la conjure).
  function cibleOf(state, start) {
    var over = null, overDef = false;
    forEachModule(state, function (node) {
      var d = moduleDef(node.defId);
      if (isDeclencheur(d) && refTargetOf(state, node.id) === start.id) {
        var c = declencheurCible(node); if (c) { over = c; overDef = isDeclencheurDefense(d); }
      }
    });
    if (over) {
      if (overDef) return /attaquant/i.test(over) ? "Attaquant contré" : "Soi-même (défenseur)";
      return /défenseur/i.test(over) ? "Défenseur de l'attaque" : "Soi-même (attaquant)";
    }
    return defaultCible(start.ctype);
  }
  // Lanceur / mainteneur : qui paie l'UAA (déclenchement) et la MA (maintien). Par défaut le
  // porteur (« Soi-même »). Une capacité EMBARQUÉE dans une entité (« Ajouter une Capacité à une
  // Créature/un Objet ») laisse le choix, groupe par groupe, de donner le rôle à l'entité ; un
  // Éveil au Nen dont l'entité « s'entretient seule » rend l'entité mainteneur.
  function isAjouterCapacite(def) { return def && !def.category && /ajouter une capacit/i.test(def.name || ""); }
  function isEveilNen(def) { return def && /éveil au nen/i.test(def.name || ""); }
  // Le module « Ajouter une Capacité à X » relié à ce socle, ou null.
  function embedModuleOf(state, start) {
    var found = null;
    forEachModule(state, function (node) {
      if (isAjouterCapacite(moduleDef(node.defId)) && refLinks(state, node.id, start.id)) found = node;
    });
    return found;
  }
  function embedEntityLabel(node) {
    var d = moduleDef(node.defId);
    return (d && d.types && d.types.indexOf("objet") !== -1) ? "L'objet" : "La créature";
  }
  // Le groupe « Lanceur »/« Mainteneur » de ce module a-t-il sa ligne « … en devient le … » retenue ?
  function embedRoleIsEntity(node, groupRe) {
    var def = moduleDef(node.defId); if (!def || !def.grids) return false;
    for (var gi = 0; gi < def.grids.length; gi++) {
      var groups = def.grids[gi].groups;
      for (var pi = 0; pi < groups.length; pi++) {
        if (groupRe.test(groups[pi].label || "")) {
          var sel = node.sel && node.sel[gi + "." + pi];
          var r = (sel != null && sel !== "") ? groups[pi].rows[sel] : null;
          if (r && /devient/i.test(r.label || "")) return true;
        }
      }
    }
    return false;
  }
  // Socle porteur au bout de la chaîne d'un module de raccord (l'entité qui embarque la capacité).
  function embedCarrierId(state, node) { var up = upstreamNodes(state, node.id); return up.length ? up[up.length - 1] : null; }
  // La chaîne d'un socle contient-elle un Éveil au Nen dont l'entité « s'entretient seule » ?
  function chainSelfMaintains(state, socleId) {
    var chain = downstreamNodes(state, socleId);
    for (var i = 0; i < chain.length; i++) {
      var n = state.nodes[chain[i]];
      if (n && n.kind === "module" && isEveilNen(moduleDef(n.defId)) && eveilSelfMaintains(state, n)) return true;
    }
    return false;
  }
  // Rôle (lanceur/mainteneur) d'une capacité embarquée : l'entité si on l'a explicitement retenu,
  // OU si l'entité porteuse s'entretient seule (autonome, elle mène ce qu'elle porte) ; sinon Soi-même.
  function embedRole(state, m, groupRe) {
    if (embedRoleIsEntity(m, groupRe)) return embedEntityLabel(m);
    var cid = embedCarrierId(state, m);
    if (cid && chainSelfMaintains(state, cid)) return embedEntityLabel(m);
    return "Soi-même";
  }
  function lanceurOf(state, start) {
    var m = embedModuleOf(state, start);
    return m ? embedRole(state, m, /lanceur/i) : "Soi-même";
  }
  // L'Éveil au Nen a-t-il son option « l'entité s'entretient seule » retenue ? (sinon, défaut :
  // le conjurateur en garde le maintien, donc le mainteneur reste « Soi-même »).
  function eveilSelfMaintains(state, node) {
    var def = moduleDef(node.defId); if (!def || !def.grids) return false;
    for (var gi = 0; gi < def.grids.length; gi++) {
      var groups = def.grids[gi].groups;
      for (var pi = 0; pi < groups.length; pi++) {
        if (/maintien/i.test(groups[pi].label || "")) {
          var sel = node.sel && node.sel[gi + "." + pi];
          var r = (sel != null && sel !== "") ? groups[pi].rows[sel] : null;
          if (r && /entretient|se maintient/i.test(r.label || "")) return true;
        }
      }
    }
    return false;
  }
  function mainteneurOf(state, start) {
    var m = embedModuleOf(state, start);
    if (m) return embedRole(state, m, /mainteneur/i);
    if (chainSelfMaintains(state, start.id)) return defaultCible(start.ctype);
    return "Soi-même";
  }
  function chainPred(state, id) {
    for (var i = 0; i < state.edges.length; i++) { var e = state.edges[i]; if (e.type === "chain" && e.to.node === id) return e; }
    return null;
  }
  // Tous les nœuds de la chaîne qui résulterait d'un lien fromNode -> toNode :
  // l'amont de fromNode (socle compris) + l'aval de toNode.
  function chainNodesThrough(state, fromNode, toNode) {
    var out = [], seen = {}, cur = fromNode;
    while (cur && !seen[cur]) { seen[cur] = 1; out.push(cur); var e = chainPred(state, cur); cur = e ? e.from.node : null; }
    seen = {}; cur = toNode;
    while (cur && !seen[cur]) { seen[cur] = 1; out.push(cur); var e2 = chainSucc(state, cur); cur = e2 ? e2.to.node : null; }
    return out;
  }
  // Types de socle admissibles pour un ensemble de nœuds : l'intersection des
  // types acceptés par chaque module (le livre : chaque module ne se greffe que
  // sur certains types). Un module sans restriction (types vide) n'intersecte pas.
  // La Conscience éveille l'objet en créature : sa chaîne (type objet) accepte
  // alors aussi les modules de créature (règle du livre, module Conscience).
  function chainAwakened(state, nodes) {
    return nodes.some(function (id) {
      var n = state.nodes[id]; if (!n || n.kind !== "module") return false;
      var d = moduleDef(n.defId); return !!d && d.name === "Conscience";
    });
  }
  function chainTypeCheck(state, nodes) {
    var socleType = null, allowed = null, awake = chainAwakened(state, nodes);
    nodes.forEach(function (id) {
      var n = state.nodes[id]; if (!n) return;
      if (n.kind === "start") socleType = typeOf(n.ctype);
      else if (n.kind === "module") {
        var t = moduleDef(n.defId).types;
        if (t && t.length) {
          if (awake && t.indexOf("créature") !== -1 && t.indexOf("objet") === -1) t = t.concat(["objet"]);
          allowed = allowed == null ? t.slice() : allowed.filter(function (x) { return t.indexOf(x) !== -1; });
        }
      }
    });
    if (allowed == null) allowed = TYPES.slice();
    return { socleType: socleType, allowed: allowed, awake: awake };
  }
  function chainCompatible(state, nodes) {
    var r = chainTypeCheck(state, nodes);
    return r.socleType ? r.allowed.indexOf(r.socleType) !== -1 : r.allowed.length > 0;
  }
  function upstreamNodes(state, id) { var out = [], seen = {}, cur = id; while (cur && !seen[cur]) { seen[cur] = 1; out.push(cur); var e = chainPred(state, cur); cur = e ? e.from.node : null; } return out; }
  function downstreamNodes(state, id) { var out = [], seen = {}, cur = id; while (cur && !seen[cur]) { seen[cur] = 1; out.push(cur); var e = chainSucc(state, cur); cur = e ? e.to.node : null; } return out; }
  function moduleAllowedGiven(ctx, def) {
    var t = def.types; if (!t || !t.length) return true;
    if (ctx.awake && t.indexOf("créature") !== -1 && t.indexOf("objet") === -1) t = t.concat(["objet"]);
    if (ctx.socleType) return t.indexOf(ctx.socleType) !== -1;
    return ctx.allowed.some(function (x) { return t.indexOf(x) !== -1; });
  }
  function slotNameFor(node, type, dir) {
    var s = slotsOf(node), list = dir === "in" ? s.inputs : s.outputs;
    for (var i = 0; i < list.length; i++) if (list[i].type === type) return list[i].name;
    return null;
  }
  function pushEdge(state, fromN, fromS, toN, toS, type) {
    // chaîne et objet : une seule arrivée par prise d'entrée (un objet = une seule arme).
    if (type === "chain" || type === "objet") state.edges = state.edges.filter(function (e) { return !(e.to.node === toN && e.to.slot === toS); });
    state.edges = state.edges.filter(function (e) { return !(e.from.node === fromN && e.from.slot === fromS); });
    state.edges.push({ from: { node: fromN, slot: fromS }, to: { node: toN, slot: toS }, type: type });
  }
  // Nodes que l'on peut créer-et-relier depuis une prise donnée (filtrés par la
  // règle de type du livre). Renvoie des « payloads » (comme la palette).
  function candidatesFor(state, f) {
    var items = [];
    function mod(m) { return { kind: "module", defId: m.id, name: m.name, cat: m.category, sublabel: subLabel(m) }; }
    function socle(t) { return { kind: "struct", sub: "start", ctype: t, name: TY_LABEL[t], ty: t, sublabel: typeOf(t) }; }
    function arme(src) { return { kind: "arme", source: src, name: (src === "book" ? "Arme du Livre" : "Arme de la Forge"), ty: "objet", sublabel: "sélecteur" }; }
    var endItem = { kind: "struct", sub: "end", name: "Fin de capacité", ty: "end", sublabel: "clôt la chaîne" };
    if (f.type === "chain") {
      if (f.dir === "out") {
        var ctx = chainTypeCheck(state, upstreamNodes(state, f.node));
        DATA.modules.forEach(function (m) { if (!isSocleDefModule(m) && moduleAllowedGiven(ctx, m)) items.push(mod(m)); });
        items.push(endItem);
      } else {
        var ctx2 = chainTypeCheck(state, downstreamNodes(state, f.node));
        SOCLES.forEach(function (t) { if (ctx2.allowed.indexOf(typeOf(t)) !== -1) items.push(socle(t)); });
        DATA.modules.forEach(function (m) { if (!isSocleDefModule(m) && moduleAllowedGiven(ctx2, m)) items.push(mod(m)); });
      }
    } else if (f.type === "objet") {
      if (f.dir === "in") { items.push(arme("book")); items.push(arme("forge")); }          // socle « objet » ← arme
      else { items.push(socle("objet")); items.push(socle("objet-t")); }                    // arme → Conjuration / Transmutation d'objet
    } else {  // prise « capacité » (référence)
      if (f.dir === "out") SOCLES.forEach(function (t) { items.push(socle(t)); });
      else DATA.modules.forEach(function (m) { if (needsRef(m)) items.push(mod(m)); });
    }
    return items;
  }
  // Tous les nœuds créables (double-clic sur le vide) : socles, Fin, tous modules.
  function allCreatablePayloads() {
    var items = [];
    SOCLES.forEach(function (t) { items.push({ kind: "struct", sub: "start", ctype: t, name: TY_LABEL[t], ty: t, sublabel: "capacité " + typeOf(t) }); });
    items.push({ kind: "struct", sub: "end", name: "Fin de capacité", ty: "end", sublabel: "terminer une chaîne" });
    DATA.modules.forEach(function (m) { if (isSocleDefModule(m)) return; items.push({ kind: "module", defId: m.id, name: m.name, cat: m.category, sublabel: subLabel(m) }); });
    items.push({ kind: "arme", source: "book", name: "Arme du Livre", ty: "objet", sublabel: "sélecteur d'arme" });
    items.push({ kind: "arme", source: "forge", name: "Arme de la Forge", ty: "objet", sublabel: "vos armes enregistrées" });
    return items;
  }
  function slotLabel(node, slotName) { var s = slotsOf(node), all = s.inputs.concat(s.outputs); for (var i = 0; i < all.length; i++) if (all[i].name === slotName) return all[i].label; return slotName; }

  // --- recherche floue (subsequence + surlignage), pliage des accents à longueur constante ---
  var FOLD = { "à":"a","â":"a","ä":"a","á":"a","é":"e","è":"e","ê":"e","ë":"e","î":"i","ï":"i","í":"i","ô":"o","ö":"o","ó":"o","û":"u","ü":"u","ù":"u","ú":"u","ç":"c","ñ":"n","œ":"o" };
  function normalize(s) { s = (s || "").toLowerCase(); var out = ""; for (var i = 0; i < s.length; i++) { out += (FOLD[s[i]] !== undefined ? FOLD[s[i]] : s[i]); } return out; }
  function isWordStart(nt, i) { return i === 0 || /[^a-z0-9]/.test(nt[i - 1]); }
  function fuzzyScore(query, target) {
    var nq = normalize(query).trim(), nt = normalize(target);
    if (!nq) return { score: 0, hits: [] };
    var idx = nt.indexOf(nq);
    if (idx >= 0) { var hits = []; for (var k = 0; k < nq.length; k++) hits.push(idx + k); return { score: 900 - idx + (idx === 0 ? 400 : 0) + (isWordStart(nt, idx) ? 200 : 0), hits: hits }; }
    var h2 = [], j = 0, gaps = 0, last = -1;
    for (var c = 0; c < nt.length && j < nq.length; c++) { if (nt[c] === nq[j]) { h2.push(c); if (last >= 0) gaps += c - last - 1; last = c; j++; } }
    return j === nq.length ? { score: 300 - gaps, hits: h2 } : null;
  }
  function hlSegs(name, hits) {
    if (!hits || !hits.length) return [name];
    var set = {}; hits.forEach(function (i) { set[i] = 1; });
    var segs = [], buf = "", hit = false;
    function flush() { if (buf) { segs.push(hit ? h("b", {}, [buf]) : buf); buf = ""; } }
    for (var i = 0; i < name.length; i++) { var isH = !!set[i]; if (isH !== hit) { flush(); hit = isH; } buf += name[i]; }
    flush(); return segs;
  }

  function selectedRows(node) {
    var def = moduleDef(node.defId), out = [];
    def.grids.forEach(function (grid, gi) {
      grid.groups.forEach(function (grp, pi) {
        var key = gi + "." + pi, sel = node.sel[key];
        if (grp.cumulable) { (sel || []).forEach(function (ri) { out.push(grp.rows[ri]); }); }
        else if (sel != null && sel !== "" && grp.rows[sel]) out.push(grp.rows[sel]);
      });
    });
    return out;
  }
  function moduleCost(node) {
    var rows = selectedRows(node), di = 0, ua = 0, ma = 0, car = null, aegSum = 0, aelSum = 0;
    rows.forEach(function (r) {
      di += r.di; ua += r.ua; ma += r.ma; aegSum += (r.aeg || 0); aelSum += (r.ael || 0);
      if (r.car != null) car = Math.max(car == null ? 0 : car, r.car);
    });
    return { di: di, ua: ua, ma: ma, car: car, aegSum: aegSum, aelSum: aelSum };
  }
  function capGlobalShift(state, start) {
    var s = 0;   // l'affinité globale vient des conditions et des tableaux (AEG), plus aucun champ de surcharge

    (start.conds || []).forEach(function (c) { s += (parseFloat(c.shift) || 0); });
    if (start.defId) s += moduleCost(start).aegSum;   // AEG du socle (ex. Niveau de la bête) : affinité globale
    chainOf(state, start.id).modules.forEach(function (node) {
      if (!needsRef(moduleDef(node.defId))) s += moduleCost(node).aegSum;   // AEG des modules chaînés : global (un module qui appelle une capacité verse son AE à la capacité liée, pas ici)
    });
    forEachModule(state, function (node) {
      // module qui appelle une capacité (déclencheur, Catalogue…) : son AE TOTALE s'ajoute à l'affinité GLOBALE de la capacité liée
      if (needsRef(moduleDef(node.defId)) && refLinks(state, node.id, start.id)) { var mc = moduleCost(node); s += mc.aegSum + mc.aelSum; }
    });
    return s;
  }
  function moduleAffinity(state, node, start) {
    var def = moduleDef(node.defId);
    if (!def.category) return { applicable: false };
    var arch = currentArchetype(state);
    var base = arch ? (arch.affinities[def.category] || 0) : 0;
    var localShift = 0;   // l'affinité locale vient des conditions et des tableaux (AEL)
    (node.conds || []).forEach(function (c) { localShift += (parseFloat(c.shift) || 0); });
    if (!needsRef(def)) localShift += moduleCost(node).aelSum;   // AEL du module : affinité locale (un module qui appelle une capacité verse plutôt son AE à la capacité liée)
    var shifts = capGlobalShift(state, start) + localShift;
    var capped = Math.min(shifts, 100);
    return { applicable: true, base: base, shifts: shifts, eff: Math.max(0, base + capped) };
  }

  function chainReport(state, start) {
    var ch = chainOf(state, start.id);
    var awake = ch.modules.some(function (m) { var d = moduleDef(m.defId); return !!d && d.name === "Conscience"; });
    var di = 0, ua = 0, ma = 0, car = null, lines = [], warns = [], dxByCat = {}, carByCat = {};
    if (start.defId) {   // socle piloté par une fiche (bête) : son coût propre entre dans la capacité
      var sc = moduleCost(start), sk = moduleDef(start.defId).category || "raccord";
      di += sc.di; ua += sc.ua; ma += sc.ma; if (sc.car != null) { car = Math.max(car == null ? 0 : car, sc.car); carByCat[sk] = Math.max(carByCat[sk] || 0, sc.car); }
      dxByCat[sk] = (dxByCat[sk] || 0) + sc.di;
    }
    ch.modules.forEach(function (node) {
      var def = moduleDef(node.defId), c = moduleCost(node);
      di += c.di; ua += c.ua; ma += c.ma;
      var kk = def.category || "raccord"; dxByCat[kk] = (dxByCat[kk] || 0) + c.di;
      if (c.car != null) { car = Math.max(car == null ? 0 : car, c.car); carByCat[kk] = Math.max(carByCat[kk] || 0, c.car); }
      var aff = moduleAffinity(state, node, start);
      var line = { name: def.name, cat: def.category };
      if (aff.applicable && def.scaled) {
        var rows = selectedRows(node), val = rows.length && rows[0].value != null ? rows[0].value : null;
        line.eff = aff.eff; line.scaledFrom = val;
        line.scaled = val != null ? Math.round(val * aff.eff / 100) : null;
      } else if (aff.applicable) line.eff = aff.eff;
      if (aff.applicable && aff.shifts > 100) warns.push({ t: def.name + " : décalage plafonné à +100 %.", soft: true });
      if (def.category && def.types.length && def.types.indexOf(typeOf(start.ctype)) === -1) {
        // objet conscient : la Conscience sur la chaîne ouvre le socle objet aux modules de créature
        if (!(awake && typeOf(start.ctype) === "objet" && def.types.indexOf("créature") !== -1)) {
          var tw = def.name + " ne se greffe pas sur le type « " + typeOf(start.ctype) + " ».";
          if (typeOf(start.ctype) === "objet" && def.types.indexOf("créature") !== -1)
            tw += " Greffez la Conscience pour éveiller l'objet en créature.";
          warns.push(tw);
        }
      }
      if (needsRef(def) && !refTargetOf(state, node.id)) warns.push(def.name + " : aucune capacité liée reliée.");
      lines.push(line);
    });
    if (!ch.terminated) warns.push("Chaîne non terminée : reliez-la à une node « Fin de capacité ».");
    var instant = start.duree === "instant";
    var maRound = instant ? 0 : ma;
    return {
      start: start, chain: ch, di: di, ua: ua, ma: maRound,
      maShown: start.duree === "hour" ? maRound * 5 : maRound,
      car: car, carByCat: carByCat, lines: lines, warns: warns, instant: instant, terminated: ch.terminated, count: ch.modules.length, dxByCat: dxByCat
    };
  }
  function powerReport(state) {
    var starts = [];
    for (var id in state.nodes) if (state.nodes[id].kind === "start") starts.push(state.nodes[id]);
    starts.sort(function (a, b) { return a.y - b.y; });
    var reports = starts.map(function (s) { return chainReport(state, s); });
    var dxByCat = {}, endReports = {}, chained = {};
    reports.forEach(function (r) {
      if (r.chain.endId) endReports[r.chain.endId] = r;
      for (var k in r.dxByCat) dxByCat[k] = (dxByCat[k] || 0) + r.dxByCat[k];
      r.chain.modules.forEach(function (node) { chained[node.id] = 1; });
    });
    // conversion développement -> DI, par catégorie, selon l'affinité d'apprentissage
    var arch = currentArchetype(state), diByCat = {}, diTotal = 0, impossible = false;
    for (var cat in dxByCat) {
      if (cat === "raccord") { diByCat[cat] = dxByCat[cat]; diTotal += dxByCat[cat]; }
      else {
        var aa = arch ? (arch.affinities[cat] || 0) : 0, di = diForDev(dxByCat[cat], aa);
        diByCat[cat] = di; if (di === Infinity) impossible = true; else diTotal += di;
      }
    }
    var orphans = 0;
    forEachModule(state, function (n) { if (!chained[n.id]) orphans++; });
    return { reports: reports, dxByCat: dxByCat, diByCat: diByCat, diTotal: diTotal, impossible: impossible, endReports: endReports, orphans: orphans, starts: starts };
  }

  // ======================================================================
  //  ÉTAT
  // ======================================================================
  function defaultSel(def) {
    var sel = {}, soc = isSocleDefModule(def);   // grilles d'un socle (bête) = obligatoires
    def.grids.forEach(function (grid, gi) {
      grid.groups.forEach(function (grp, pi) {
        var key = gi + "." + pi;
        if (grp.cumulable) sel[key] = [];
        else sel[key] = (grp.mandatory || soc || (grid.groups.length === 1 && def.grids.length === 1)) ? 0 : "";
      });
    });
    return sel;
  }
  function newState() {
    return { v: SCHEMA, archetype: DATA.archetypes[0].name, nodes: {}, edges: [], nextId: 1, pan: { x: 40, y: 30 }, zoom: 1 };
  }
  function countKind(state, kind) { var n = 0; for (var id in state.nodes) if (state.nodes[id].kind === kind) n++; return n; }
  function addStart(state, ctype, x, y) {
    var id = "n" + (state.nextId++);
    var node = { id: id, kind: "start", x: x, y: y, ctype: ctype, name: "Capacité " + (countKind(state, "start") + 1), cible: defaultCible(ctype), duree: "maintien", conds: [] };
    var sd = socleDefFor(ctype);   // socle piloté par une fiche des règles (bête conjurée) : grilles + coût
    if (sd) { node.defId = sd.id; node.sel = defaultSel(sd); }
    state.nodes[id] = node;
    return id;
  }
  function addModule(state, defId, x, y) {
    var id = "n" + (state.nextId++);
    state.nodes[id] = { id: id, kind: "module", x: x, y: y, defId: defId, sel: defaultSel(moduleDef(defId)), conds: [] };
    return id;
  }
  function addEnd(state, x, y) {
    var id = "n" + (state.nextId++);
    state.nodes[id] = { id: id, kind: "end", x: x, y: y };
    return id;
  }
  // node « arme » : référence une arme enregistrée + garde un instantané (nom/fiche/total)
  // pour rester lisible même si la bibliothèque change.
  function addArme(state, source, x, y) {
    var pool = poolFor(source), w0 = pool[0] || null;
    var id = "n" + (state.nextId++);
    state.nodes[id] = { id: id, kind: "arme", x: x, y: y, source: source, pick: w0 ? w0.name : null, weapon: w0 ? JSON.parse(JSON.stringify(w0)) : null };
    return id;
  }
  function removeNode(state, id) {
    delete state.nodes[id];
    state.edges = state.edges.filter(function (e) { return e.from.node !== id && e.to.node !== id; });
  }
  function strip(state) { var c = JSON.parse(JSON.stringify(state)); delete c._selNode; delete c._selEdge; return c; }
  function migrate(s) { if (!s || s.v !== SCHEMA) return null; if (!s.nodes) s.nodes = {}; if (!s.edges) s.edges = []; return s; }

  // ======================================================================
  //  INSTANCE
  // ======================================================================
  function mount(root) {
    // En mode fiche (relais du créateur), on ouvre la capacité transmise sans
    // écraser le brouillon d'atelier ; sinon, comportement habituel.
    var state = (handoff ? (migrate(handoff.state) || newState()) : load()) || newState();

    var world = h("div", { class: "nf-world" });
    // Couche d'arêtes HORS du monde transformé (Chromium ne peint pas un <svg>
    // dans un conteneur transformé). On dessine en coordonnées écran.
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "nf-edges");
    var canvas = h("div", { class: "nf-canvas" }, [svg, world]);
    var empty = h("div", { class: "nf-empty" },
      ["Glissez un socle (Attaque / Défense / Effet) depuis la palette, chaînez-y des modules, terminez par « Fin de capacité »."]);
    canvas.appendChild(empty);

    var zoomLbl = h("span", { class: "nf-zoom" }, ["100 %"]);
    canvas.appendChild(h("div", { class: "nf-ctrls" }, [
      h("button", { title: "Dézoomer", onclick: function () { zoomAt(1 / 1.2); } }, ["−"]),
      zoomLbl,
      h("button", { title: "Zoomer", onclick: function () { zoomAt(1.2); } }, ["+"]),
      h("button", { title: "Ajuster à la vue", onclick: function () { fitView(); } }, ["⤢"]),
      h("button", { title: "Réinitialiser la vue", onclick: function () { resetView(); } }, ["⟲"])
    ]));

    var palette = h("div", { class: "nf-palette" });
    var inspector = h("div", { class: "nf-inspector" });
    var bar = buildBar();
    var grid = h("div", { class: "nen-atelier" }, [bar.el, palette, canvas, inspector]);
    root.innerHTML = ""; root.appendChild(grid);
    document.body.classList.add("atelier-page");
    buildPalette(palette);

    var listeners = [];
    function on(t, ev, fn, opt) { t.addEventListener(ev, fn, opt); listeners.push([t, ev, fn, opt]); }
    function fitHeight() { var top = grid.getBoundingClientRect().top + window.scrollY; grid.style.height = Math.max(560, window.innerHeight - top) + "px"; }
    on(window, "resize", fitHeight); requestAnimationFrame(fitHeight);

    var drag = null, nodeEls = {}, endReports = {};

    function screenToWorld(cx, cy) {
      var r = canvas.getBoundingClientRect();
      return { x: (cx - r.left - state.pan.x) / state.zoom, y: (cy - r.top - state.pan.y) / state.zoom };
    }

    on(canvas, "pointerdown", function (e) {
      if (e.target !== canvas && e.target !== world && e.target !== empty && e.target.tagName !== "svg") return;
      drag = { type: "pan", sx: e.clientX, sy: e.clientY, px: state.pan.x, py: state.pan.y };
      canvas.classList.add("panning"); canvas.setPointerCapture(e.pointerId); clearSelection();
    });
    on(canvas, "dblclick", function (e) {
      if (e.target !== canvas && e.target !== world && e.target !== empty && e.target.tagName !== "svg") return;
      var rc = canvas.getBoundingClientRect();
      openSearch({ free: true, world: screenToWorld(e.clientX, e.clientY), sx: e.clientX - rc.left, sy: e.clientY - rc.top });
    });
    on(canvas, "wheel", function (e) {
      e.preventDefault();
      var r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      var wx = (mx - state.pan.x) / state.zoom, wy = (my - state.pan.y) / state.zoom;
      var z = clamp(state.zoom * (e.deltaY < 0 ? 1.12 : 0.89), 0.1, 2.2);
      state.pan.x = mx - wx * z; state.pan.y = my - wy * z; state.zoom = z; applyTransform(); renderEdges(); save();
    }, { passive: false });

    on(window, "pointermove", function (e) {
      if (!drag) return;
      if (drag.type === "pan") { state.pan.x = drag.px + (e.clientX - drag.sx); state.pan.y = drag.py + (e.clientY - drag.sy); applyTransform(); renderEdges(); }
      else if (drag.type === "node") {
        var w = screenToWorld(e.clientX, e.clientY), n = state.nodes[drag.id];
        n.x = Math.round(drag.nx + (w.x - drag.wx)); n.y = Math.round(drag.ny + (w.y - drag.wy));
        positionNode(drag.el, n); renderEdges();
      } else if (drag.type === "resize") {
        var rn = state.nodes[drag.id];
        rn.w = Math.round(clamp(drag.startW + (e.clientX - drag.sx) / state.zoom, 220, 900));
        rn.h = Math.round(clamp(drag.startH + (e.clientY - drag.sy) / state.zoom, 96, 720));
        drag.el.style.width = rn.w + "px"; drag.el.style.height = rn.h + "px"; renderEdges();
      } else if (drag.type === "wire") {
        var rc = canvas.getBoundingClientRect();
        drawTemp(drag.from, { x: e.clientX - rc.left, y: e.clientY - rc.top });
        var hot = portUnder(e.target);
        if (drag.hotEl && drag.hotEl !== hot) { drag.hotEl.classList.remove("hot"); drag.hotEl.classList.remove("hot-bad"); }
        var bad = false;
        if (hot) {
          var ht = { node: hot.dataset.node, slot: hot.dataset.slot, dir: hot.dataset.dir, type: hot.dataset.type };
          if (validTarget(drag, hot)) { hot.classList.add("hot"); drag.hotEl = hot; }
          else if (slotOk(drag.from, ht)) { hot.classList.add("hot-bad"); drag.hotEl = hot; bad = true; }   // bonne prise, lien interdit (type)
          else drag.hotEl = null;
        } else drag.hotEl = null;
        temp.setAttribute("stroke", bad ? "#c0392b" : "#6a8a5f");
      }
    });
    on(window, "pointerup", function (e) {
      if (!drag) return;
      if (drag.type === "wire") {
        var hot = portUnder(e.target);
        if (hot && validTarget(drag, hot)) makeEdge(drag, hot);
        else {
          // lâché dans le vide (pas sur un nœud) et dans le canvas -> menu créer & relier
          var onNode = e.target.closest && e.target.closest(".nf-node");
          var rc = canvas.getBoundingClientRect();
          var inCanvas = e.clientX >= rc.left && e.clientX <= rc.right && e.clientY >= rc.top && e.clientY <= rc.bottom;
          if (!onNode && inCanvas) openSearch({ from: drag.from, world: screenToWorld(e.clientX, e.clientY), sx: e.clientX - rc.left, sy: e.clientY - rc.top });
        }
        if (drag.hotEl) { drag.hotEl.classList.remove("hot"); drag.hotEl.classList.remove("hot-bad"); }
        temp.setAttribute("d", ""); temp.setAttribute("stroke", "#6a8a5f"); renderAll();
      } else save();
      canvas.classList.remove("panning"); drag = null;
    });
    on(window, "keydown", function (e) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      if (state._selEdge != null) { state.edges.splice(state._selEdge, 1); state._selEdge = null; renderAll(); }
      else if (state._selNode) { removeNode(state, state._selNode); state._selNode = null; renderAll(); }
    });

    var temp = document.createElementNS("http://www.w3.org/2000/svg", "path");
    temp.setAttribute("class", "nf-edges"); temp.setAttribute("stroke", "#6a8a5f");
    temp.setAttribute("stroke-width", "2.5"); temp.setAttribute("fill", "none"); temp.setAttribute("stroke-dasharray", "6 5");
    svg.appendChild(temp);

    function portUnder(target) {
      var el = target;
      while (el && el !== document.body) { if (el.classList && el.classList.contains("nf-port")) return el; el = el.parentNode; }
      return null;
    }
    // prise compatible (direction + type de prise), sans juger la règle de type
    function slotOk(f, t) { return f.node !== t.node && f.dir !== t.dir && f.type === t.type; }
    // connexion réellement permise (prise ok + pas de cycle + règle de type du livre)
    function validTarget(drag, portEl) {
      var t = { node: portEl.dataset.node, slot: portEl.dataset.slot, dir: portEl.dataset.dir, type: portEl.dataset.type }, f = drag.from;
      if (!slotOk(f, t)) return false;
      var out = f.dir === "out" ? f : t, inp = f.dir === "out" ? t : f;
      if (out.type === "chain") {
        if (reaches(state, inp.node, out.node)) return false;                                       // pas de cycle
        if (!chainCompatible(state, chainNodesThrough(state, out.node, inp.node))) return false;     // règle de type (livre)
      }
      return true;
    }
    function makeEdge(drag, portEl) {
      var t = { node: portEl.dataset.node, slot: portEl.dataset.slot, dir: portEl.dataset.dir, type: portEl.dataset.type }, f = drag.from;
      var out = f.dir === "out" ? f : t, inp = f.dir === "out" ? t : f;
      pushEdge(state, out.node, out.slot, inp.node, inp.slot, out.type);
      save();
    }
    function createNodeFromPayload(payload, x, y) {
      if (payload.kind === "module") return addModule(state, payload.defId, Math.round(x), Math.round(y));
      if (payload.kind === "arme") return addArme(state, payload.source, Math.round(x), Math.round(y));
      if (payload.sub === "start") return addStart(state, payload.ctype, Math.round(x), Math.round(y));
      if (payload.sub === "end") return addEnd(state, Math.round(x), Math.round(y));
      return null;
    }
    function place(payload, x, y) { var id = createNodeFromPayload(payload, x, y); if (id) { selectNode(id); renderAll(); } }
    // relie une prise pendante à un nœud fraîchement créé
    function connectNewNode(f, newId) {
      var nn = state.nodes[newId], fromN, fromS, toN, toS;
      if (f.dir === "out") { fromN = f.node; fromS = f.slot; toN = newId; toS = slotNameFor(nn, f.type, "in"); }
      else { fromN = newId; fromS = slotNameFor(nn, f.type, "out"); toN = f.node; toS = f.slot; }
      if (fromS && toS) pushEdge(state, fromN, fromS, toN, toS, f.type);
    }

    // ---- menu « créer et relier » (glisser un fil dans le vide) ----
    var menuEl = null, menuCleanup = null;
    function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } if (menuCleanup) { menuCleanup(); menuCleanup = null; } }
    // Recherche façon ComfyUI, en MODALE plein écran : grande, centrée, fond
    // flouté/assombri, défilement arrière verrouillé, focus capté. Filtre flou,
    // navigation clavier (flèches / Entrée / Échap). opts = {from, free, world}.
    function openSearch(opts) {
      closeMenu();
      var items = opts.free ? allCreatablePayloads() : candidatesFor(state, opts.from);
      var headTxt = opts.free ? "Ajouter un nœud" : ("Relier depuis « " + slotLabel(state.nodes[opts.from.node], opts.from.slot) + " »");
      var input = h("input", { class: "nf-menu-search", type: "text", placeholder: "Rechercher un nœud…" });
      var listEl = h("div", { class: "nf-menu-list" });
      var countEl = h("span", { class: "nf-menu-count" }, [""]);
      var sel = 0, shown = [], cols = 1;
      function refresh() {
        var q = input.value, scored = [];
        items.forEach(function (it, i) {
          var m = fuzzyScore(q, it.name);
          if (!m && q.trim()) { var m2 = fuzzyScore(q, it.sublabel || ""); if (m2) m = { score: m2.score - 600, hits: [] }; }
          if (m) scored.push({ it: it, sc: m.score - i * 0.01, hits: m.hits });
        });
        if (q.trim()) scored.sort(function (a, b) { return b.sc - a.sc; });
        shown = scored; sel = 0; countEl.textContent = String(shown.length); renderList();
      }
      function computeCols() {
        var ch = listEl.children;
        if (ch.length < 2 || !ch[0].classList || !ch[0].classList.contains("nf-menu-item")) { cols = 1; return; }
        var t0 = ch[0].offsetTop, n = 1; while (n < ch.length && ch[n].offsetTop === t0) n++; cols = Math.max(1, n);
      }
      function renderList() {
        listEl.innerHTML = "";
        if (!shown.length) { listEl.appendChild(h("div", { class: "nf-menu-empty" }, ["Aucun résultat."])); cols = 1; return; }
        shown.forEach(function (r, i) {
          var it = r.it, color = it.ty ? tyColor(it.ty) : (it.cat ? catColor(it.cat) : "var(--fg-raccord)");
          listEl.appendChild(h("button", { class: "nf-menu-item" + (i === sel ? " sel" : ""), style: "border-left-color:" + color,
            onmousemove: function () { if (sel !== i) { sel = i; markSel(); } }, onclick: function () { pick(it); } },
            [h("span", { class: "nm" }, hlSegs(it.name, r.hits)), it.sublabel ? h("small", {}, [it.sublabel]) : null]));
        });
        computeCols();
      }
      function markSel() {
        for (var i = 0; i < listEl.children.length; i++) { var c = listEl.children[i]; if (c.classList) c.classList.toggle("sel", i === sel); }
        var el = listEl.children[sel]; if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
      }
      function pick(it) { var id = createNodeFromPayload(it, opts.world.x - 30, opts.world.y - 14); if (id) { if (opts.from) connectNewNode(opts.from, id); selectNode(id); } closeMenu(); renderAll(); }
      input.addEventListener("input", refresh);
      input.addEventListener("keydown", function (e) {
        var n = shown.length;
        if (e.key === "Escape") { e.preventDefault(); closeMenu(); return; }
        if (e.key === "Tab") { e.preventDefault(); return; }               // piège à focus
        if (!n) return;
        if (e.key === "ArrowRight") { e.preventDefault(); sel = Math.min(sel + 1, n - 1); markSel(); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); sel = Math.max(sel - 1, 0); markSel(); }
        else if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + cols, n - 1); markSel(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - cols, 0); markSel(); }
        else if (e.key === "Enter") { e.preventDefault(); if (shown[sel]) pick(shown[sel].it); }
      });
      var modal = h("div", { class: "nf-search-modal" }, [
        h("div", { class: "nf-menu-head" }, [h("span", {}, [headTxt]), countEl]), input, listEl
      ]);
      var overlay = h("div", { class: "nf-overlay" }, [modal]);
      overlay.addEventListener("pointerdown", function (e) { if (e.target === overlay) closeMenu(); });   // clic sur le fond -> fermer
      overlay.addEventListener("wheel", function (e) { if (!listEl.contains(e.target)) e.preventDefault(); }, { passive: false });
      document.body.appendChild(overlay);
      menuEl = overlay;
      var prevOv = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";                  // verrouille le défilement arrière
      menuCleanup = function () { document.documentElement.style.overflow = prevOv; };
      refresh(); input.focus();
    }
    root._atelierCanvasRect = function () { return canvas.getBoundingClientRect(); };
    root._atelierDrop = function (payload, cx, cy) { var w = screenToWorld(cx, cy); place(payload, w.x - 120, w.y - 14); };
    root._atelierAddCenter = function (payload) {
      var r = canvas.getBoundingClientRect(), w = screenToWorld(r.left + r.width / 2, r.top + r.height / 3);
      place(payload, w.x - 120 + (Math.random() * 30 - 15), w.y - 14 + (Math.random() * 30 - 15));
    };

    // ---- rendu ----
    function applyTransform() {
      world.style.transform = "translate(" + state.pan.x + "px," + state.pan.y + "px) scale(" + state.zoom + ")";
      if (zoomLbl) zoomLbl.textContent = Math.round(state.zoom * 100) + " %";
    }
    function positionNode(el, n) { el.style.left = n.x + "px"; el.style.top = n.y + "px"; if (n.w) el.style.width = n.w + "px"; if (n.h) el.style.height = n.h + "px"; }
    function zoomAt(factor) {
      var cx = canvas.clientWidth / 2, cy = canvas.clientHeight / 2;
      var z = clamp(state.zoom * factor, 0.1, 2.2);
      var wx = (cx - state.pan.x) / state.zoom, wy = (cy - state.pan.y) / state.zoom;
      state.pan.x = cx - wx * z; state.pan.y = cy - wy * z; state.zoom = z; applyTransform(); renderEdges(); save();
    }
    function resetView() { state.pan = { x: 40, y: 30 }; state.zoom = 1; applyTransform(); renderEdges(); save(); }
    function fitView() {
      var ids = Object.keys(state.nodes); if (!ids.length) return resetView();
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      ids.forEach(function (id) {
        var n = state.nodes[id], el = nodeEls[id];
        var w = el ? el.offsetWidth : 244, hh = el ? el.offsetHeight : 140;
        minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x + w); maxY = Math.max(maxY, n.y + hh);
      });
      var pad = 70, cw = canvas.clientWidth, ch = canvas.clientHeight;
      var z = clamp(Math.min((cw - pad) / (maxX - minX), (ch - pad) / (maxY - minY), 1.4), 0.1, 1.4);
      state.zoom = z;
      state.pan.x = (cw - (maxX - minX) * z) / 2 - minX * z;
      state.pan.y = (ch - (maxY - minY) * z) / 2 - minY * z;
      applyTransform(); renderEdges(); save();
    }

    function renderNodes() {
      var pr = powerReport(state); endReports = pr.endReports;
      for (var id in nodeEls) if (!state.nodes[id]) { nodeEls[id].remove(); delete nodeEls[id]; }
      for (var nid in state.nodes) {
        var n = state.nodes[nid], el = nodeEls[nid];
        if (!el) { el = buildNode(n); nodeEls[nid] = el; world.appendChild(el); }
        else refreshNode(el, n);
        positionNode(el, n);
        el.classList.toggle("sel", state._selNode === nid);
      }
      empty.style.display = Object.keys(state.nodes).length ? "none" : "flex";
    }
    function buildNode(n) {
      var el = n.kind === "start" ? buildStartNode(n) : n.kind === "end" ? buildEndNode(n) : n.kind === "arme" ? buildArmeNode(n) : buildModNode(n);
      el.appendChild(makeResizeGrip(n));
      return el;
    }
    function makeResizeGrip(n) {
      return h("div", { class: "nf-resize", title: "Redimensionner",
        onpointerdown: function (e) {
          e.stopPropagation(); selectNode(n.id);
          var el = nodeEls[n.id];
          drag = { type: "resize", id: n.id, el: el, startW: (n.w || el.offsetWidth), startH: (n.h || el.offsetHeight), sx: e.clientX, sy: e.clientY };
        } });
    }
    function refreshNode(el, n) {
      var fresh = buildNode(n); el.replaceWith(fresh); nodeEls[n.id] = fresh; positionNode(fresh, n);
      fresh.classList.toggle("sel", state._selNode === n.id);
    }

    function nodeHead(n, title, color) {
      var head = h("div", { class: "nf-node-head", style: "background:" + color }, [
        h("span", { class: "nf-node-title" }, [title]),
        h("button", { class: "nf-x", title: "Supprimer", onclick: function (e) { e.stopPropagation(); removeNode(state, n.id); renderAll(); } }, ["×"])
      ]);
      head.addEventListener("pointerdown", function (e) {
        if (e.target.classList.contains("nf-x")) return;
        e.stopPropagation(); selectNode(n.id);
        var w = screenToWorld(e.clientX, e.clientY);
        drag = { type: "node", id: n.id, el: nodeEls[n.id], nx: n.x, ny: n.y, wx: w.x, wy: w.y };
      });
      return head;
    }
    // Bloc de prises : lignes titre-alignées, entrées à gauche, sorties à droite.
    function slotRows(node) {
      var s = slotsOf(node), rows = Math.max(s.inputs.length, s.outputs.length);
      var wrap = h("div", { class: "nf-slots" });
      for (var i = 0; i < rows; i++) {
        var inp = s.inputs[i], out = s.outputs[i];
        var row = h("div", { class: "nf-slot-row" });
        if (inp) { row.appendChild(port(node, inp)); row.appendChild(h("span", { class: "nf-slot-lbl in" }, [inp.label])); }
        if (out) { row.appendChild(h("span", { class: "nf-slot-lbl out" }, [out.label])); row.appendChild(port(node, out)); }
        wrap.appendChild(row);
      }
      return wrap;
    }
    function port(node, slot) {
      return h("span", { class: "nf-port " + slot.dir + " t-" + slot.type, "data-node": node.id, "data-slot": slot.name, "data-dir": slot.dir, "data-type": slot.type,
        title: slot.label, onpointerdown: function (e) { e.stopPropagation(); drag = { type: "wire", from: { node: node.id, slot: slot.name, dir: slot.dir, type: slot.type } }; } });
    }

    // rendu des grilles : chaque GROUPE = une section titrée (tableau unifié
    // « nom | dev | UA MA | AE » + sa description), séparées par un trait.
    function renderGrids(n, def, body) {
      var soc = isSocleDefModule(def), devLbl = devLabel(def.category);
      def.grids.forEach(function (grid, gi) {
        grid.groups.forEach(function (grp, pi) {
          body.appendChild(groupSection(n, def, grid, grp, gi + "." + pi, devLbl, soc));
        });
      });
    }
    function gstat(v) { return v ? String(v) : "—"; }
    function pctxt(v) { return v ? ((v > 0 ? "+" : "") + v + "%") : "—"; }
    // case AE d'un bandeau de coûts : AEG (socle/raccord) ou AEL (module) selon la portée du module.
    // Reflète l'AE RÉELLE que le nœud applique (comme le moteur) : AE des paliers + modif d'affinité
    // manuel (global sur un socle, local sur un module) + conditions. Un module qui greffe une capacité
    // (needsRef) ne verse que l'AE de ses paliers à la capacité liée, sans son manuel ni ses conditions.
    function aeStripCell(def, cost, node) {
      var g = def && def.grids && def.grids[0] && def.grids[0].groups && def.grids[0].groups[0];
      var scope = (g && g.aeScope) || (node && node.kind === "start" ? "aeg" : "ael");
      var v = (cost.aegSum || 0) + (cost.aelSum || 0);
      if (node && !needsRef(def)) {
        v += parseFloat(node.kind === "start" ? node.gmod : node.lmod) || 0;
        (node.conds || []).forEach(function (c) { v += parseFloat(c.shift) || 0; });
      }
      return [scope === "aeg" ? "AEG" : "AEL", (v > 0 ? "+" : "") + v + "%"];   // « 0% » explicite dans la case (les tables gardent « — »)
    }
    // tableau unifié : en-tête [nom | dev carac | UA MA | AE] + ligne [valeur | chiffres].
    // Une seule colonne d'affinité : AEG pour les socles/raccord (décalage global),
    // AEL pour les modules (décalage local), selon la portée de la grille (grp.aeScope).
    function aeLabel(scope) { return scope === "ael" ? "AEL" : "AEG"; }
    function aeVal(st, scope) { return st ? pctxt(scope === "ael" ? st.ael : st.aeg) : "—"; }
    function tblGrid(title, valueEl, st, devLbl, caracLbl, scope, uaLbl) {
      return h("div", { class: "nf-tgrid" }, [
        h("span", { class: "h name" }, [title]),
        h("span", { class: "h sep" }, [devLbl]), h("span", { class: "h" }, [caracLbl]), h("span", { class: "h sep" }, [uaLbl || "UAA"]), h("span", { class: "h" }, ["MA"]), h("span", { class: "h sep" }, [aeLabel(scope)]),
        h("span", { class: "v val" }, [valueEl]),
        h("span", { class: "v sep" }, [st ? gstat(st.di) : "—"]), h("span", { class: "v" }, [st ? gstat(st.car) : "—"]), h("span", { class: "v sep" }, [st ? gstat(st.ua) : "—"]), h("span", { class: "v" }, [st ? gstat(st.ma) : "—"]), h("span", { class: "v sep" }, [aeVal(st, scope)])
      ]);
    }
    function groupSection(n, def, grid, grp, key, devLbl, soc) {
      var sec = h("div", { class: "nf-tsec" }), title = grp.label || grp.column || def.name, caracLbl = caracOf(def.category);
      var scope = grp.aeScope || "aeg";
      if (grp.cumulable) {
        // cumulable = lignes cliquables (blanc décoché / vert coché) + UNE cellule par
        // colonne : somme dev/UA/MA/AE, MAX pour la carac requise, étirée sur toute la hauteur.
        var selA = n.sel[key] || [], N = grp.rows.length, sum = { di: 0, ua: 0, ma: 0, aeg: 0, ael: 0 }, carMax = null;
        selA.forEach(function (ri) { var r = grp.rows[ri]; if (r) { sum.di += r.di || 0; sum.ua += r.ua || 0; sum.ma += r.ma || 0; sum.aeg += r.aeg || 0; sum.ael += r.ael || 0; if (r.car != null) carMax = Math.max(carMax || 0, r.car); } });
        var cells = [
          h("span", { class: "h name", style: "grid-area:1/1" }, [title + " · à cocher"]),
          h("span", { class: "h sep", style: "grid-area:1/2" }, [devLbl]),
          h("span", { class: "h", style: "grid-area:1/3" }, [caracLbl]),
          h("span", { class: "h sep", style: "grid-area:1/4" }, [grp.uaLabel || "UAA"]),
          h("span", { class: "h", style: "grid-area:1/5" }, ["MA"]),
          h("span", { class: "h sep", style: "grid-area:1/6" }, [aeLabel(scope)])
        ];
        grp.rows.forEach(function (r, ri) {
          var on = selA.indexOf(ri) !== -1;
          var toggle = function () { var arr = n.sel[key] || (n.sel[key] = []); var i = arr.indexOf(ri); if (i === -1) arr.push(ri); else arr.splice(i, 1); save(); renderAll(); };
          cells.push(h("div", { class: "v rcell opt" + (on ? " on" : ""), style: "grid-area:" + (ri + 2) + "/1", onclick: toggle }, [r.label]));
        });
        var sp = "grid-row:2/span " + N + ";grid-column:";
        cells.push(h("span", { class: "v sep sum", style: sp + "2" }, [gstat(sum.di)]));
        cells.push(h("span", { class: "v sum", style: sp + "3" }, [carMax == null ? "—" : String(carMax)]));
        cells.push(h("span", { class: "v sep sum", style: sp + "4" }, [gstat(sum.ua)]));
        cells.push(h("span", { class: "v sum", style: sp + "5" }, [gstat(sum.ma)]));
        cells.push(h("span", { class: "v sep sum", style: sp + "6" }, [pctxt(scope === "ael" ? sum.ael : sum.aeg)]));
        sec.appendChild(h("div", { class: "nf-tgrid nf-tgrid-rows" }, cells));
        selA.forEach(function (ri) { var r = grp.rows[ri]; if (r && r.def) sec.appendChild(h("div", { class: "nf-optdef" }, [h("b", {}, [r.label + " : "]), r.def])); });
      } else {
        var idx = n.sel[key], selRow = (idx === "" || idx == null) ? null : grp.rows[idx];
        var opts = grp.rows.map(function (r, ri) { return [String(ri), r.label]; });
        if (!grp.mandatory && !soc && !(grid.groups.length === 1 && def.grids.length === 1)) opts.unshift(["", "— aucun —"]);
        var selEl = selectEl(opts, String(idx), function (v) { n.sel[key] = v === "" ? "" : parseInt(v, 10); save(); renderAll(); });
        sec.appendChild(tblGrid(title, selEl, selRow, devLbl, caracLbl, scope, grp.uaLabel));
        if (selRow && selRow.def) sec.appendChild(h("div", { class: "nf-optdef" }, [selRow.def]));
      }
      if (grp.desc) sec.appendChild(h("div", { class: "nf-tsec-desc" }, [grp.desc]));
      return sec;
    }
    function buildStartNode(n) {
      var el = h("div", { class: "nf-node start ty-" + TY_SLUG[n.ctype] });
      el.appendChild(nodeHead(n, TY_LABEL[n.ctype].toUpperCase(), tyColor(n.ctype)));
      el.appendChild(slotRows(n));
      var body = h("div", { class: "nf-node-body" });
      body.appendChild(field("Nom", inputText(n.name, function (v) { n.name = v; save(); refreshInspector(); })));
      body.appendChild(h("div", { class: "nf-roles" }, [
        field("Lanceur", h("div", { class: "nf-cible" }, [lanceurOf(state, n)])),
        field("Mainteneur", h("div", { class: "nf-cible" }, [mainteneurOf(state, n)])),
        field("Cible", h("div", { class: "nf-cible" }, [cibleOf(state, n)]))
      ]));
      body.appendChild(field("Durée", selectEl([["instant", "Instantané"], ["maintien", "À maintien (round)"], ["hour", "À maintien (minute)"]], n.duree, function (v) { n.duree = v; save(); renderAll(); })));
      // socle piloté par une fiche (bête conjurée) : ses attributs obligatoires + son coût
      var sd = n.defId ? moduleDef(n.defId) : socleDefFor(n.ctype);
      if (sd && !n.defId) { n.defId = sd.id; n.sel = defaultSel(sd); }   // migre les anciens socles de base (attaque/défense/effet)
      if (sd) {
        if (sd.category) body.appendChild(h("div", { class: "nf-modmeta" }, [catName(sd.category) + " · " + typeOf(n.ctype)]));
        if (sd.description) body.appendChild(descBlock(sd.description));
        renderGrids(n, sd, body);
        var sc = moduleCost(n);
        body.appendChild(costStrip([[devLabel(sd.category), sc.di], [moduleUaLbl(sd), sc.ua], ["MA", sc.ma], aeStripCell(sd, sc, n)]));
      }
      // Conjuration / Transmutation d'objet : arme reliée à l'entrée « objet ».
      if (n.ctype === "objet" || n.ctype === "objet-t") {
        var oid = objetTargetOf(state, n.id), on = oid && state.nodes[oid] ? ((state.nodes[oid].weapon || {}).name || "Arme") : null;
        body.appendChild(h("div", { class: "nf-reflink" + (on ? "" : " off") }, [on ? "Objet : " + on + " (arme)" : "Reliez une arme à la prise « objet »."]));
      }
      body.appendChild(condsBlock(n));
      el.appendChild(body);
      el.addEventListener("pointerdown", function () { selectNode(n.id); });
      return el;
    }
    function buildArmeNode(n) {
      var source = n.source || "forge", pool = poolFor(source), srcLbl = source === "book" ? "Arme du Livre" : "Arme de la Forge";
      var w = n.weapon || {}, f = w.fiche || {};
      var el = h("div", { class: "nf-node arme" });
      el.appendChild(nodeHead(n, w.name || srcLbl, "var(--fg-arme)"));
      el.appendChild(slotRows(n));
      var body = h("div", { class: "nf-node-body" });
      body.appendChild(h("div", { class: "nf-modmeta" }, [srcLbl + (w.total != null ? " · " + w.total + " pts" : "")]));
      // sélecteur : on choisit l'arme dans le pool correspondant (livre / Forge).
      var opts = pool.map(function (x) { return [x.name, x.name + (x.total != null ? "  (" + x.total + " pts)" : "")]; });
      var pick = n.pick || w.name || "";
      if (pick && !pool.some(function (x) { return x.name === pick; })) opts.unshift([pick, pick + " (absente)"]);
      if (!opts.length) opts = [["", source === "book" ? "(aucune arme)" : "(aucune arme enregistrée)"]];
      body.appendChild(field("Arme", selectEl(opts, pick, function (v) {
        var pw = null, i; for (i = 0; i < pool.length; i++) if (pool[i].name === v) { pw = pool[i]; break; }
        n.pick = v; if (pw) n.weapon = JSON.parse(JSON.stringify(pw));
        save(); renderAll();
      })));
      var fiche = h("div", { class: "nf-arme-fiche" });
      [["Dégâts", f.degats], ["Type", f.type], ["Portée", f.portee], ["Munitions", f.munitions], ["Mains", f.mains], ["Mod.", f.mod], ["AM", f.am], ["Illégalité", f.illeg], ["Propriétés", f.props]].forEach(function (r) {
        if (r[1] == null || r[1] === "" || r[1] === "—") return;
        fiche.appendChild(h("div", { class: "nf-arme-row" }, [h("span", { class: "k" }, [r[0]]), h("span", { class: "v" }, [String(r[1])])]));
      });
      body.appendChild(fiche);
      el.appendChild(body);
      el.addEventListener("pointerdown", function () { selectNode(n.id); });
      return el;
    }
    function buildModNode(n) {
      var def = moduleDef(n.defId);
      var el = h("div", { class: "nf-node module" });
      el.appendChild(nodeHead(n, def.name, catColor(def.category)));
      el.appendChild(slotRows(n));
      var body = h("div", { class: "nf-node-body" });
      body.appendChild(h("div", { class: "nf-modmeta" }, [catName(def.category) + (def.types.length ? " · " + def.types.join(", ") : (def.special ? " · " + def.special : ""))]));
      if (def.description) body.appendChild(descBlock(def.description));
      renderGrids(n, def, body);

      if (needsRef(def)) {
        var tid = refTargetOf(state, n.id), tname = tid && state.nodes[tid] ? state.nodes[tid].name : null;
        body.appendChild(h("div", { class: "nf-reflink" + (tname ? "" : " off") },
          [tname ? "Capacité liée : " + tname : "Reliez une capacité à la prise « capacité liée »."]));
      }
      body.appendChild(condsBlock(n));

      var c = moduleCost(n);
      body.appendChild(costStrip([[devLabel(def.category), c.di], [moduleUaLbl(def), c.ua], ["MA", c.ma], aeStripCell(def, c, n)]));
      if (needsRef(def)) { var acc = c.aegSum + c.aelSum; body.appendChild(h("div", { class: "nf-affnote" }, ["Affinité accordée : ", h("b", {}, [(acc >= 0 ? "+" : "") + acc + " %"])])); }
      el.appendChild(body);
      el.addEventListener("pointerdown", function () { selectNode(n.id); });
      return el;
    }
    function buildEndNode(n) {
      var el = h("div", { class: "nf-node end" });
      el.appendChild(nodeHead(n, "FIN DE CAPACITÉ", tyColor("end")));
      el.appendChild(slotRows(n));
      var body = h("div", { class: "nf-node-body" });
      var r = endReports[n.id];
      if (!r) body.appendChild(h("div", { class: "nf-empty-hint" }, ["Reliez une capacité à l'entrée pour voir sa fiche."]));
      else {
        body.appendChild(h("div", { class: "nf-endcap" }, [r.start.name, h("span", { class: "nf-endtag", style: "background:" + tyColor(r.start.ctype) }, [tyTag(r.start.ctype)])]));
        var maLbl = r.instant ? "MA" : (r.start.duree === "hour" ? "MA/min" : "MA/r");
        body.appendChild(devLineEl(r.dxByCat));
        body.appendChild(costStrip([["UAA", r.ua], [maLbl, r.instant ? "—" : r.maShown]].concat(caracBoxes(r.carByCat))));
        if (r.lines.length) { var box = h("div", { style: "margin-top:.5rem" }); r.lines.forEach(function (ln) { box.appendChild(modLine(ln)); }); body.appendChild(box); }
      }
      el.appendChild(body);
      el.addEventListener("pointerdown", function () { selectNode(n.id); });
      return el;
    }

    function rowLabel(r, devLbl) { var x = []; if (r.di) x.push((devLbl || "DI") + " " + r.di); if (r.ua) x.push("UA " + r.ua); return r.label + (x.length ? "  (" + x.join(", ") + ")" : ""); }
    // micro-tableau à droite d'un sélecteur : dev / UA / MA / AE de la ligne choisie
    function gridStats(r, devLbl) {
      function num(v) { return v ? String(v) : "—"; }
      var ae = r ? (r.ae || 0) : 0, aeTxt = (r && ae) ? ((ae > 0 ? "+" : "") + ae + " %") : "—";
      return h("div", { class: "nf-gstats" }, [
        h("span", { class: "h" }, [devLbl]), h("span", { class: "h sep" }, ["UA"]), h("span", { class: "h" }, ["MA"]), h("span", { class: "h sep" }, ["AE"]),
        h("span", { class: "v" }, [r ? num(r.di) : "—"]), h("span", { class: "v sep" }, [r ? num(r.ua) : "—"]), h("span", { class: "v" }, [r ? num(r.ma) : "—"]), h("span", { class: "v sep" }, [aeTxt])
      ]);
    }
    function condsBlock(n) {
      // AEG (décalage global) pour les socles, AEL (décalage local) pour les modules.
      var aeLbl = n.kind === "start" ? "AEG" : "AEL";
      var wrap = h("div", { class: "nf-conds" });
      // la portée du décalage (AEG socle / AEL module) est la même pour toutes les
      // conditions de la node : on l'affiche une fois, sur le titre de la section.
      wrap.appendChild(h("div", { class: "nf-conds-title" }, ["Conditions", h("span", { class: "nf-conds-scope", title: "Décalage d'affinité d'emploi appliqué par ces conditions" }, [" · " + aeLbl])]));
      (n.conds || []).forEach(function (cond, i) {
        var name = cond.name != null ? cond.name : "";
        var desc = cond.desc != null ? cond.desc : (cond.label != null ? cond.label : "");   // rétro-compat : ancien « label » → description
        wrap.appendChild(h("div", { class: "nf-cond" }, [
          h("div", { class: "nf-cond-head" }, [
            inputText(name, function (v) { cond.name = v; save(); }, "nf-cond-name", "Nom de la condition"),
            inputAE(cond.shift, function (v) { cond.shift = v; save(); renderAll(); }),
            h("button", { class: "nf-x", title: "Supprimer", onclick: function () { n.conds.splice(i, 1); save(); renderAll(); } }, ["×"])
          ]),
          textareaEl(desc, function (v) { cond.desc = v; save(); }, "Description de la condition…")
        ]));
      });
      wrap.appendChild(h("button", { class: "nf-addcond", onclick: function () { (n.conds || (n.conds = [])).push({ name: "", desc: "", shift: 0 }); save(); renderAll(); } }, ["+ condition"]));
      return wrap;
    }
    function field(l, control) { return h("div", {}, [h("label", {}, [l]), control]); }
    function inputText(val, cb, cls, ph) { return h("input", { type: "text", value: val || "", class: cls || "", placeholder: ph || "", oninput: function (e) { cb(e.target.value); } }); }
    function textareaEl(val, cb, ph) { return h("textarea", { class: "nf-ta", rows: "2", placeholder: ph || "", oninput: function (e) { cb(e.target.value); }, onpointerdown: function (e) { e.stopPropagation(); } }, [val || ""]); }
    function inputNum(val, cb, cls) { return h("input", { type: "number", value: val == null ? 0 : val, class: cls || "", step: "5", onchange: function (e) { cb(parseFloat(e.target.value) || 0); }, onpointerdown: function (e) { e.stopPropagation(); } }); }
    // AE d'une condition : stepper −/+ (pas de 10, borné à [−100, 100]). Propre et
    // fonctionnel en mode nuit, sans le spinner natif du champ nombre.
    function inputAE(val, cb) {
      var v = clamp(Math.round((val == null ? 0 : val) / 10) * 10, -100, 100);
      function fmt(x) { return (x > 0 ? "+" : "") + x + "%"; }
      var disp = h("span", { class: "nf-step-val" }, [fmt(v)]);
      function set(nv) { v = clamp(Math.round(nv / 10) * 10, -100, 100); disp.textContent = fmt(v); cb(v); }
      function btn(txt, d, ti) {
        return h("button", { class: "nf-step-btn", type: "button", title: ti,
          onpointerdown: function (e) { e.stopPropagation(); }, onclick: function (e) { e.stopPropagation(); set(v + d); } }, [txt]);
      }
      return h("div", { class: "nf-step", title: "Décalage d'affinité (pas de 10, −100 à +100)" }, [btn("−", -10, "−10"), disp, btn("+", 10, "+10")]);
    }
    function selectEl(options, val, cb) {
      var sel = h("select", { onchange: function (e) { cb(e.target.value); }, onpointerdown: function (e) { e.stopPropagation(); } });
      options.forEach(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; var opt = h("option", { value: v }, [t]); if (String(v) === String(val)) opt.selected = true; sel.appendChild(opt); });
      return sel;
    }

    // ---- arêtes en coordonnées ÉCRAN ----
    function offsetWithin(el, anc) { var x = 0, y = 0, c = el; while (c && c !== anc) { x += c.offsetLeft; y += c.offsetTop; c = c.offsetParent; } return { x: x, y: y }; }
    function portCenter(nid, slot) {
      var el = nodeEls[nid]; if (!el) return null;
      var p = el.querySelector('.nf-port[data-slot="' + slot + '"]'); if (!p) return null;
      var o = offsetWithin(p, el), n = state.nodes[nid];
      var wx = n.x + o.x + p.offsetWidth / 2, wy = n.y + o.y + p.offsetHeight / 2;
      return { x: wx * state.zoom + state.pan.x, y: wy * state.zoom + state.pan.y };
    }
    function edgePath(a, b) { var dx = Math.max(30, Math.abs(b.x - a.x) * 0.5); return "M" + a.x + "," + a.y + " C" + (a.x + dx) + "," + a.y + " " + (b.x - dx) + "," + b.y + " " + b.x + "," + b.y; }
    function renderEdges() {
      Array.prototype.slice.call(svg.querySelectorAll("path.edge")).forEach(function (p) { p.remove(); });
      state.edges.forEach(function (e, i) {
        var a = portCenter(e.from.node, e.from.slot), b = portCenter(e.to.node, e.to.slot); if (!a || !b) return;
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", "edge " + (e.type === "cap" ? "t-cap" : e.type === "objet" ? "t-objet" : "chain") + (state._selEdge === i ? " sel" : ""));
        path.setAttribute("d", edgePath(a, b)); path.style.pointerEvents = "stroke";
        path.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); state._selEdge = i; state._selNode = null; renderAll(); });
        svg.appendChild(path);
      });
    }
    function drawTemp(from, to) { var a = portCenter(from.node, from.slot); if (a) temp.setAttribute("d", edgePath(a, to)); }

    function selectNode(id) { state._selNode = id; state._selEdge = null; markSelection(); refreshInspector(); }
    function clearSelection() { state._selNode = null; state._selEdge = null; markSelection(); refreshInspector(); }
    function markSelection() { for (var id in nodeEls) nodeEls[id].classList.toggle("sel", state._selNode === id); renderEdges(); }
    function refreshInspector() { renderInspector(inspector, state); }
    function renderAll() { renderNodes(); requestAnimationFrame(renderEdges); refreshInspector(); applyTransform(); save(); }

    bar.archetype.value = state.archetype;
    bar.archetype.addEventListener("change", function () { state.archetype = bar.archetype.value; renderAll(); });
    bar.reset.addEventListener("click", function () {
      if (!confirm("Effacer le pouvoir en cours ?")) return;
      state = newState(); nodeEls = {}; world.querySelectorAll(".nf-node").forEach(function (e) { e.remove(); });
      bar.archetype.value = state.archetype; renderAll();
    });
    bar.exportBtn.addEventListener("click", function () { doExport(state); });
    if (bar.toSheet) bar.toSheet.addEventListener("click", function () {
      var rep = powerReport(state);
      var first = rep.reports[0];
      var name = (first && first.start && first.start.name) || (handoff && handoff.name) || "Capacité";
      var sum = function (f) { return rep.reports.reduce(function (a, r) { return a + (f(r) || 0); }, 0); };
      var summary = {
        name: name,
        // « socle » de la capacité (le nœud de départ) : Attaque/Défense/Effet ou un
        // socle d'école (« Conjuration d'objet »…). Ce n'est PAS l'un des trois types
        // au sens strict ; la fiche l'affiche sous « Socle », pas « Type ».
        socle: first ? (TY_LABEL[first.start.ctype] || "") : "",
        type: first ? (TY_LABEL[first.start.ctype] || "") : "",   // compat ascendante
        archetype: state.archetype,
        di: rep.diTotal === Infinity ? null : rep.diTotal,
        // Ventilation du développement PAR CATÉGORIE, en points de dev (DR/DE/…),
        // AVANT conversion en DI : le créateur la reconvertit avec SA propre affinité
        // (le pool poolCat). La clé « raccord » porte le développement structurel, sans
        // catégorie, compté 1:1 en DI. Permet d'imputer la capacité au bon pool.
        dxByCat: rep.dxByCat || {},
        uaa: sum(function (r) { return r.ua; }),
        ma: sum(function (r) { return r.maShown; }),
        car: rep.reports.reduce(function (a, r) { return Math.max(a, r.car || 0); }, 0),
        count: rep.starts.length
      };
      var back = (handoff && handoff.returnTo) || (siteBase() + "personnage/");
      try {
        localStorage.setItem(RETURN, JSON.stringify({ capId: handoff.capId, name: name, state: strip(state), report: summary }));
        localStorage.removeItem(HANDOFF);
      } catch (e) {}
      handoff = null;
      location.href = back;
    });
    bar.importInput.addEventListener("change", function (e) {
      var f = e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try { var s = migrate(JSON.parse(rd.result)); if (!s) { alert("Format incompatible (pouvoir d'une version antérieure)."); return; }
          state = s; nodeEls = {}; world.querySelectorAll(".nf-node").forEach(function (el) { el.remove(); });
          bar.archetype.value = state.archetype; renderAll();
        } catch (err) { alert("Fichier illisible : " + err.message); }
      };
      rd.readAsText(f); e.target.value = "";
    });

    if (!Object.keys(state.nodes).length) addStart(state, "attaque", 60, 60);
    function save() {
      // en mode fiche, on autosauve dans le relais (reprise après rechargement)
      // sans toucher au brouillon autonome de l'Atelier
      if (handoff) {
        try { var hs = readHandoff() || handoff; hs.state = strip(state); localStorage.setItem(HANDOFF, JSON.stringify(hs)); } catch (e) {}
        return;
      }
      try { localStorage.setItem("nen-atelier", JSON.stringify(strip(state))); } catch (e) {}
    }
    function load() { try { return migrate(JSON.parse(localStorage.getItem("nen-atelier"))); } catch (e) { return null; } }

    renderAll(); applyTransform();
    teardown = function () { closeMenu(); listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); }); document.body.classList.remove("atelier-page"); };
  }

  // ======================================================================
  //  GLISSER-DÉPOSER DEPUIS LA PALETTE
  // ======================================================================
  function startPaletteDrag(payload, color, e0) {
    var sx = e0.clientX, sy = e0.clientY, ghost = null, dragging = false;
    function root() { return document.getElementById("nen-atelier"); }
    function overCanvas(x, y) { var r = root() && root()._atelierCanvasRect && root()._atelierCanvasRect(); return r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
    function onMove(e) {
      if (!dragging) { if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) < 6) return; dragging = true; ghost = h("div", { class: "nf-ghost", style: "border-left-color:" + color }, [payload.name]); document.body.appendChild(ghost); document.body.style.cursor = "grabbing"; }
      ghost.style.left = e.clientX + "px"; ghost.style.top = e.clientY + "px"; ghost.classList.toggle("over", overCanvas(e.clientX, e.clientY));
    }
    function onUp(e) {
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = ""; if (ghost) ghost.remove();
      var r = root(); if (!r) return;
      if (!dragging) { if (r._atelierAddCenter) r._atelierAddCenter(payload); return; }
      if (overCanvas(e.clientX, e.clientY) && r._atelierDrop) r._atelierDrop(payload, e.clientX, e.clientY);
    }
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  }

  // ======================================================================
  //  PALETTE
  // ======================================================================
  var _palette, _collapsed = {};
  function buildPalette(container) { _palette = container; drawPalette(""); }
  function pill(payload, color, sub) {
    return h("button", { class: "nf-pill", style: "border-left-color:" + color, title: payload.title || "",
      onpointerdown: function (e) { if (e.button === 0) { e.preventDefault(); startPaletteDrag(payload, color, e); } } },
      [h("span", { class: "nm" }, [payload.name]), sub ? h("small", {}, [sub]) : null]);
  }
  function catBlock(key, label, color, itemsEl, count) {
    var head = h("div", { class: "nf-cat-head", style: "background:" + color }, [
      h("span", { class: "caret" }, ["▾"]), h("span", {}, [label]),
      count != null ? h("span", { class: "nf-count" }, [String(count)]) : null
    ]);
    var wrap = h("div", { class: "nf-cat" + (_collapsed[key] ? " collapsed" : "") }, [head, itemsEl]);
    head.addEventListener("click", function () { _collapsed[key] = !_collapsed[key]; wrap.classList.toggle("collapsed"); });
    return wrap;
  }
  function drawPalette(filter) {
    var container = _palette; container.innerHTML = "";
    container.appendChild(h("input", { class: "nf-search", type: "text", placeholder: "Rechercher un module…", value: filter, oninput: function (e) { drawPalette(e.target.value); } }));
    var f = filter.trim().toLowerCase();
    var structItems = h("div", { class: "nf-cat-items" });
    SOCLES.forEach(function (t) { structItems.appendChild(pill({ kind: "struct", sub: "start", ctype: t, name: TY_LABEL[t], title: "Nouvelle capacité de type " + typeOf(t) }, tyColor(t), typeOf(t))); });
    structItems.appendChild(pill({ kind: "struct", sub: "end", name: "Fin de capacité", title: "Termine une chaîne de capacité" }, tyColor("end"), "clôt la chaîne"));
    container.appendChild(catBlock("__struct", "Structure", "#4a4640", structItems, null));

    // Deux nodes « Arme » à sélecteur : armes du livre / armes de la Forge.
    // On les relie à l'entrée « objet » d'une Conjuration ou Transmutation d'objet.
    var armeItems = h("div", { class: "nf-cat-items" });
    armeItems.appendChild(pill({ kind: "arme", source: "book", name: "Arme du Livre", title: "Choisir une arme du livre (armes.md) et la relier à l'entrée « objet » d'un objet conjuré ou transmuté" }, "var(--fg-arme)", "sélecteur · " + bookWeapons().length));
    armeItems.appendChild(pill({ kind: "arme", source: "forge", name: "Arme de la Forge", title: "Choisir une de vos armes enregistrées dans la Forge" }, "var(--fg-arme)", "sélecteur · " + savedWeapons().length));
    container.appendChild(catBlock("__armes", "Armes", "var(--fg-arme)", armeItems, 2));

    var byCat = {};
    DATA.modules.forEach(function (m) { if (isSocleDefModule(m)) return; var k = m.category || "raccord"; (byCat[k] = byCat[k] || []).push(m); });
    ["renforcement", "émission", "transmutation", "manipulation", "conjuration", "spécialisation", "raccord"].forEach(function (cat) {
      var list = (byCat[cat] || []).filter(function (m) { return !f || m.name.toLowerCase().indexOf(f) !== -1 || (m.description || "").toLowerCase().indexOf(f) !== -1; });
      if (!list.length) return;
      var color = cat === "raccord" ? "var(--fg-raccord)" : catColor(cat);
      var items = h("div", { class: "nf-cat-items" });
      list.forEach(function (m) { var typ = subLabel(m); items.appendChild(pill({ kind: "module", defId: m.id, name: m.name, title: m.description || "" }, color, typ)); });
      container.appendChild(catBlock(cat, catName(cat === "raccord" ? null : cat), color, items, list.length));
    });
  }

  // ======================================================================
  //  BARRE + INSPECTEUR + EXPORT
  // ======================================================================
  function buildBar() {
    var archetype = h("select", { class: "nf-select" });
    DATA.archetypes.forEach(function (a) { archetype.appendChild(h("option", { value: a.name }, [a.name])); });
    var reset = h("button", { class: "nf-btn" }, ["Réinitialiser"]);
    var exportBtn = h("button", { class: "nf-btn" }, ["Exporter"]);
    var importInput = h("input", { type: "file", accept: "application/json", style: "display:none" });
    var importBtn = h("button", { class: "nf-btn", onclick: function () { importInput.click(); } }, ["Importer"]);
    // Mode fiche : bouton d'enregistrement vers la fiche de personnage
    var toSheet = handoff ? h("button", { class: "nf-btn primary" }, ["Enregistrer dans la fiche"]) : null;
    var kids = [
      h("span", { class: "nf-title" }, [handoff ? "Atelier — capacité de la fiche" : "Atelier de pouvoir"]),
      h("label", {}, ["Archétype :"]), archetype,
      h("span", { class: "nf-hint" }, ["Glissez un socle depuis la palette →"]),
      h("span", { class: "nf-spacer" })
    ];
    if (toSheet) kids.push(toSheet);
    kids.push(exportBtn, importBtn, importInput, reset);
    var el = h("div", { class: "nf-bar" }, kids);
    return { el: el, archetype: archetype, reset: reset, exportBtn: exportBtn, importInput: importInput, toSheet: toSheet };
  }

  function renderInspector(container, state) {
    container.innerHTML = "";
    var arch = currentArchetype(state);
    container.appendChild(h("h2", {}, ["Fiche du pouvoir"]));
    container.appendChild(h("div", { class: "nf-sub" }, ["Archétype : " + (arch ? arch.name : "—")]));
    if (arch) {
      var aff = h("div", { class: "nf-affinity" });
      DATA.categories.forEach(function (cat) {
        var pct = arch.affinities[cat];
        aff.appendChild(h("span", { class: "k" }, [catName(cat)]));
        aff.appendChild(h("span", { class: "bar" }, [h("i", { style: "width:" + Math.min(100, pct) + "%" })]));
        aff.appendChild(h("span", { class: "v" }, [pct + " %"]));
      });
      container.appendChild(aff);
    }
    var pr = powerReport(state);
    var fiche = h("div", { class: "nf-fiche" });
    if (!pr.reports.length) fiche.appendChild(h("div", { class: "nf-sub" }, ["Aucune capacité. Glissez un socle sur le canvas."]));
    pr.reports.forEach(function (r) {
      var card = h("div", { class: "nf-cap-card" });
      card.appendChild(h("h3", {}, [r.start.name, h("span", { class: "tag", style: "background:" + tyColor(r.start.ctype) }, [tyTag(r.start.ctype)])]));
      card.appendChild(h("div", { class: "nf-cap-cible" }, ["Cible : ", h("b", {}, [cibleOf(state, r.start)])]));
      if (r.start.ctype === "objet" || r.start.ctype === "objet-t") { var _oid = objetTargetOf(state, r.start.id), _on = _oid && state.nodes[_oid] ? ((state.nodes[_oid].weapon || {}).name) : null; if (_on) card.appendChild(h("div", { class: "nf-cap-cible" }, ["Objet : ", h("b", {}, [_on + " (arme)"])])); }
      var maLbl = r.instant ? "MA" : (r.start.duree === "hour" ? "MA/min" : "MA/r");
      card.appendChild(devLineEl(r.dxByCat));
      card.appendChild(costStrip([["UAA", r.ua], [maLbl, r.instant ? "—" : r.maShown]].concat(caracBoxes(r.carByCat))));
      r.lines.forEach(function (ln) { card.appendChild(modLine(ln)); });
      if (!r.count) card.appendChild(h("div", { class: "nf-sub", style: "margin:.35rem 0 0" }, ["Aucun module chaîné."]));
      r.warns.forEach(function (w) {
        // Deux niveaux : rouge = erreur (chaîne invalide), jaune (soft) = simple mise en garde.
        var soft = typeof w === "object" && w.soft;
        card.appendChild(h("div", { class: soft ? "nf-warn nf-warn-soft" : "nf-warn" }, ["⚠ " + (soft ? w.t : w)]));
      });
      fiche.appendChild(card);
    });
    container.appendChild(fiche);
    var tot = h("div", { class: "nf-totals" }, [h("div", { class: "grand" }, [h("span", { class: "lbl" }, ["Conception totale"]), h("span", { class: "num" }, [pr.impossible ? "∞" : (pr.diTotal + " DI")])])]);
    var brk = h("div", { class: "nf-devbreak" });
    Object.keys(pr.dxByCat).filter(function (cat) { return pr.dxByCat[cat]; }).forEach(function (cat) {
      var isc = cat === "raccord", dx = pr.dxByCat[cat], di = pr.diByCat[cat], aa = (!isc && arch) ? arch.affinities[cat] : null;
      brk.appendChild(h("div", { class: "nf-devrow" }, [
        h("span", { class: "dot", style: "color:" + (isc ? "var(--fg-raccord)" : catColor(cat)) }, ["●"]),
        h("span", { class: "nm" }, [catName(isc ? null : cat)]),
        h("span", { class: "dx" }, [dx + " " + (isc ? "DI" : devLabel(cat))]),
        isc ? null : h("span", { class: "arr" }, ["→"]),
        isc ? null : h("span", { class: "di" }, [di === Infinity ? "non apprise" : di + " DI"]),
        (!isc && aa != null) ? h("span", { class: "aa" }, [aa + " %"]) : null
      ]));
    });
    tot.appendChild(brk);
    if (pr.impossible) tot.appendChild(h("div", { class: "nf-warn", style: "margin-top:.3rem" }, ["⚠ Catégorie non apprise (affinité 0) : conception impossible."]));
    if (pr.orphans) tot.appendChild(h("div", { class: "nf-warn nf-warn-soft", style: "margin-top:.3rem" }, ["⚠ " + pr.orphans + " module(s) non reliés à un socle."]));
    container.appendChild(tot);
  }

  function doExport(state) {
    var blob = new Blob([JSON.stringify(strip(state), null, 2)], { type: "application/json" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "pouvoir-nen.json"; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // ======================================================================
  //  BOOTSTRAP
  // ======================================================================
  // Relais depuis le créateur de personnage (page /personnage/) : il dépose une
  // capacité à créer ou modifier dans localStorage puis navigue ici. On l'ouvre,
  // et un bouton « Enregistrer dans la fiche » réécrit le retour et renavigue.
  var HANDOFF = "nen-atelier-handoff", RETURN = "nen-atelier-return";
  function readHandoff() {
    var raw; try { raw = localStorage.getItem(HANDOFF); } catch (e) { return null; }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  function init() {
    var root = document.getElementById("nen-atelier");
    if (teardown) { try { teardown(); } catch (e) {} teardown = null; }
    if (!root) return;
    handoff = readHandoff();
    if (DATA) { mount(root); return; }
    Promise.all([
      fetch(siteBase() + "nen-atelier.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }),
      fetch(siteBase() + "forge.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) {
      DATA = res[0]; ARMES = (res[1] && res[1].armes) ? res[1].armes : [];
      mount(root);
    }).catch(function (err) { root.innerHTML = '<p style="padding:1.5rem;color:#b3462f">Impossible de charger les données de modules (' + err.message + ").</p>"; });
  }
  if (window.document$) { document$.subscribe(init); } else { document.addEventListener("DOMContentLoaded", init); }
})();
