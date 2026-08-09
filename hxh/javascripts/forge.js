/* Forge — atelier de création d'armes.
 *
 * Barème (coûts, paliers, descriptions) issu de forge.json, produit au build par
 * hooks/forge.py depuis armes.md : une seule source de vérité, comme l'atelier de
 * pouvoir. Ce fichier ne porte que la sémantique d'interface (curseur, choix
 * simple/multiple, bascule) et la somme du budget.
 *
 * Le compte d'une arme, repris d'armes.md :
 *   Dégâts + Type + Portée(s) + Mains + Modificateur + Compatibilité AM
 *   + Propriétés − Contraintes − Illégalité = 100
 * Chaque pièce porte un coût signé (positif = coûte, négatif = rembourse) ; la
 * somme vise 100 pile. Les vingt premiers dégâts sont offerts (coût = dégâts − 20).
 *
 * Mise en page : une grille de cartes compactes (multi-colonnes) pour limiter le
 * défilement ; une synthèse collante à droite.
 */
(function () {
  "use strict";

  var DATA = null;
  var state = null;
  var aside = null;

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
  function find(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function ob(id) { return find(DATA.obligatoires, id); }
  // Munitions vit dans les obligatoires (requise pour tir/cône) mais se comporte comme
  // une propriété à paliers ; on l'ajoute aux propriétés pour le coût, la fiche et les prérequis.
  function suppProps() { var m = ob("munitions"); return m ? DATA.supplementaires.concat([m]) : DATA.supplementaires; }
  function map(prop, ti) { var m = {}, t = prop && prop.tables[ti || 0]; if (t) t.rows.forEach(function (r) { m[r.label] = r.cost; }); return m; }
  function mapAll(prop) { var m = {}; if (prop) prop.tables.forEach(function (t) { t.rows.forEach(function (r) { m[r.label] = r.cost; }); }); return m; }  // toutes les tables (ex. modificateur : force du porteur + propulsion)
  function noteOf(prop, label, ti) { var t = prop && prop.tables[ti || 0]; if (t) for (var i = 0; i < t.rows.length; i++) if (t.rows[i].label === label) return t.rows[i].note; return null; }
  function cost(n) { return n === 0 ? "–" : (n > 0 ? "+" + n : String(n)); }

  // --- état ------------------------------------------------------------------
  function blank() {
    return {
      name: "", degats: 20, types: [], portees: [], cone: null,
      mains: "1 main", mod: "×0", am: "✧✧✧", illeg: "☆☆☆☆☆",
      tiers: {}, toggles: {}
    };
  }
  function save() { try { localStorage.setItem("forge-state", JSON.stringify(state)); } catch (e) {} }
  function load() { try { var s = JSON.parse(localStorage.getItem("forge-state")); return s && s.tiers ? s : null; } catch (e) { return null; } }

  // --- bibliothèque d'armes (partagée avec l'Atelier via localStorage) --------
  var WKEY = "forge-weapons";     // même clé lue par l'atelier (nodes « Arme »)
  var rootEl = null;
  function loadWeapons() { try { var a = JSON.parse(localStorage.getItem(WKEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function saveWeapons(a) { try { localStorage.setItem(WKEY, JSON.stringify(a)); } catch (e) {} }
  // fiche d'affichage figée avec l'arme (l'atelier n'a pas le barème, il lit ceci)
  function weaponFiche() {
    return {
      am: state.am, portee: fichePortee(), munitions: ficheMunitions(), mains: state.mains, degats: state.degats,
      mod: ficheMod(), type: state.types.join(" / ") || "—", illeg: state.illeg, props: ficheProps()
    };
  }
  function saveCurrentWeapon() {
    var name = (state.name || "").trim();
    if (!name) { alert("Donnez un nom à l'arme avant de l'enregistrer."); return; }
    var arr = loadWeapons();
    var rec = { name: name, total: total(), fiche: weaponFiche(), state: JSON.parse(JSON.stringify(state)) };
    var i = -1; for (var k = 0; k < arr.length; k++) if (arr[k].name === name) { i = k; break; }   // upsert par nom
    if (i >= 0) { rec.id = arr[i].id; arr[i] = rec; }
    else { rec.id = "w" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); arr.push(rec); }
    saveWeapons(arr); refresh();
  }
  function deleteWeapon(id) { saveWeapons(loadWeapons().filter(function (w) { return w.id !== id; })); refresh(); }
  function loadWeaponInto(w) { state = JSON.parse(JSON.stringify(w.state)); if (rootEl) mount(rootEl); }

  // --- barème (mêmes règles que verif_armes_100.py) --------------------------
  function porteeMap() { var m = {}; ob("portee").tables.forEach(function (t) { t.rows.forEach(function (r) { m[r.label] = r.cost; }); }); return m; }
  function porteeNote(label) { var v = ob("portee"); return noteOf(v, label, 0) || noteOf(v, label, 1) || noteOf(v, label, 2); }

  function lines() {
    var out = [];
    function add(label, c) { if (c) out.push({ label: label, cost: c }); }
    add("Dégâts " + state.degats, state.degats - 20);
    if (state.types.length) {
      var nat = map(ob("type-de-degats"), 0), cnt = map(ob("type-de-degats"), 1), tc = 0;
      state.types.forEach(function (t) { tc += nat[t] || 0; });
      tc += cnt[String(Math.min(6, state.types.length))] || 0;
      add("Type " + state.types.join("/"), tc);
    }
    var pm = porteeMap();
    state.portees.forEach(function (p) { add(porteeShort(p), pm[p] || 0); });
    if (state.cone) add("Cône " + state.cone.len + ", " + state.cone.ang,
      (map(ob("portee"), 3)[state.cone.len] || 0) + (map(ob("portee"), 4)[state.cone.ang] || 0));
    var ptypes = {};   // nombre de portées = types DISTINCTS (mêlée/allonge = 1 seul type)
    state.portees.forEach(function (p) { ptypes[/^Lancer/.test(p) ? "l" : /^Tir/.test(p) ? "t" : "m"] = 1; });
    var np = Object.keys(ptypes).length + (state.cone ? 1 : 0);
    if (np >= 2) add("Portées ×" + np, (np - 1) * 10);
    add(state.mains, map(ob("mains"), 0)[state.mains] || 0);
    add("Modificateur " + state.mod, mapAll(ob("modificateur-de-degats"))[state.mod] || 0);
    add("Compatibilité AM " + state.am, map(ob("compatibilite-arts-martiaux"), 0)[state.am] || 0);
    add("Illégalité " + state.illeg, map(ob("illegalite"), 0)[state.illeg] || 0);
    suppProps().forEach(function (p) {
      if (p.id === "cone") return;
      if (p.fixedCost == null) { var lbl = state.tiers[p.id]; if (lbl) add(propLabel(p, lbl), map(p, 0)[lbl] || 0); }
      else if (state.toggles[p.id]) add(p.name, p.fixedCost || 0);
    });
    return out;
  }
  function total() { return lines().reduce(function (s, l) { return s + l.cost; }, 0); }

  // --- avertissements --------------------------------------------------------
  function hasLancer() { return state.portees.some(function (p) { return /^Lancer/.test(p); }); }
  function hasTir() { return state.portees.some(function (p) { return /^Tir/.test(p); }); }
  function hasMelee() { return state.portees.some(function (p) { return /^(Mêlée|Allonge)/.test(p); }); }
  function hasAllonge() { return state.portees.some(function (p) { return /^Allonge/.test(p); }); }
  function hasZoneOuCone() { return !!state.tiers["sphere"] || !!state.cone; }
  function activeSupp(id) { return state.tiers[id] || state.toggles[id]; }
  function warnings() {
    var w = [];
    if (state.degats > 20 && !state.types.length) w.push("Une arme qui blesse doit porter au moins un type de dégâts.");
    if ((state.portees.some(function (p) { return /^Tir/.test(p); }) || state.cone) && !state.tiers["munitions"]) w.push("Une arme de tir ou de cône doit porter des Munitions.");
    if (((state.am.match(/✦/g) || []).length + (state.illeg.match(/★/g) || []).length) > 5) w.push("AM + illégalité dépasse 5 : une arme faite pour les arts martiaux ne peut pas être aussi illégale, et inversement.");
    // Prérequis et incompatibilités : lus depuis les étiquettes des fiches. Les paires
    // sont dédupliquées (chaque fiche liste l'autre : un seul avertissement par paire).
    var INCOMPAT = [["retour", "retour", "Retour"], ["usage unique", "usage-unique", "Usage unique"],
                    ["recharge rapide", "recharge-rapide", "Recharge rapide"],
                    ["rechargement lent", "rechargement-lent", "Rechargement lent"],
                    ["surchauffe", "surchauffe", "Surchauffe"], ["dissimulable", "dissimulable", "Dissimulable"],
                    ["lourdeur", "lourdeur", "Lourdeur"]];
    var vus = {};
    suppProps().forEach(function (p) {
      if (p.id === "cone" || !activeSupp(p.id)) return;
      p.prereqs.forEach(function (pr) {
        var low = pr.toLowerCase();
        if (/incompatible/.test(low)) {
          if (/2 mains/.test(low) && state.mains === "2 mains") w.push(p.name + " est incompatible avec une arme à deux mains.");
          if (/c[oô]ne/.test(low) && state.cone) w.push(p.name + " est incompatible avec le Cône.");
          INCOMPAT.forEach(function (e) {
            if (low.indexOf(e[0]) === -1 || !activeSupp(e[1]) || e[1] === p.id) return;
            var k = [p.id, e[1]].sort().join("|");
            if (!vus[k]) { vus[k] = 1; w.push(p.name + " et " + e[2] + " sont incompatibles."); }
          });
        }
        if (/n[ée]cessite/.test(low)) {
          if (/lancer ou de tir/.test(low)) { if (!hasLancer() && !hasTir()) w.push(p.name + " nécessite une portée de lancer ou de tir."); }
          else if (/allonge, lancer/.test(low)) { if (!hasAllonge() && !hasLancer() && !hasTir() && !state.cone) w.push(p.name + " nécessite une portée au-delà du contact."); }
          else if (/m[êe]l[ée]e/.test(low)) { if (!hasMelee()) w.push(p.name + " nécessite une portée de mêlée."); }
          else if (/lancer/.test(low)) { if (!hasLancer()) w.push(p.name + " nécessite une portée de lancer."); }
          if (/munitions/.test(low) && !state.tiers["munitions"]) w.push(p.name + " nécessite des Munitions.");
          if (/×1 for/.test(low) && !/^×[1-9]/.test(state.mod)) w.push(p.name + " nécessite un multiplicateur de Force, ×1 au moins.");
        }
      });
    });
    return w;
  }

  // --- libellés pour la fiche ------------------------------------------------
  function porteeShort(p) {
    if (/^Mêlée/.test(p)) return "Mêlée";
    var note = (porteeNote(p) || "").replace(/\s*\/\s*/g, "/");
    if (/^Lancer/.test(p)) return "Jet " + note;
    if (/^Tir/.test(p)) return "Tir " + note;
    return p;
  }
  function propLabel(p, lbl) { return p.id === "lourdeur" ? lbl : p.name + " (" + lbl.replace(/\s+/g, " ") + ")"; }
  function fichePortee() {
    var out = state.portees.map(porteeShort);
    if (state.cone) out.push("Cône " + state.cone.len + ", " + state.cone.ang);
    return out.join(" · ") || "—";
  }
  function ficheProps() {
    var out = [];
    suppProps().forEach(function (p) {
      if (p.id === "cone") return;
      if (p.fixedCost == null) { if (state.tiers[p.id]) out.push(propLabel(p, state.tiers[p.id])); }
      else if (state.toggles[p.id]) out.push(p.name);
    });
    return out.join(", ") || "Aucune";
  }
  function ficheMod() {
    if (state.mod === "×0") return "×0";
    if (state.mod.charAt(0) === "+") return state.mod;                                   // propulsion mécanique : dégâts fixes
    return state.mod + " " + (state.toggles["finesse"] ? "DEX" : "FOR");                 // force du porteur : ×N FOR/DEX
  }
  function ficheMunitions() { return state.tiers["munitions"] || "—"; }

  // --- panneau de synthèse ---------------------------------------------------
  function refresh() {
    var ls = lines(), t = total(), reste = 100 - t, w = warnings();
    var cls = t === 100 ? " ok" : t > 100 ? " over" : "";
    aside.innerHTML = "";

    var head = el("div", "fg-total-wrap");
    var big = el("div", "fg-total" + cls);
    big.appendChild(el("span", "fg-total-num", String(t)));
    big.appendChild(el("span", "fg-total-unit", "/ 100"));
    head.appendChild(big);
    var status = el("div", "fg-status" + cls);
    status.textContent = t === 100 ? "Arme équilibrée" : t < 100 ? "Il reste " + reste + " points à dépenser" : "Dépassé de " + (t - 100) + " points";
    head.appendChild(status);
    var bar = el("div", "fg-bar");
    var fill = el("div", "fg-bar-fill" + cls);
    fill.style.width = Math.max(0, Math.min(100, t)) + "%";
    bar.appendChild(fill);
    head.appendChild(bar);
    aside.appendChild(head);

    if (w.length) {
      var wb = el("div", "fg-warns");
      w.forEach(function (m) { wb.appendChild(el("div", "fg-warn", m)); });
      aside.appendChild(wb);
    }

    var brk = el("div", "fg-break");
    brk.appendChild(el("div", "fg-break-head", "Détail du compte"));
    if (!ls.length) brk.appendChild(el("div", "fg-break-empty", "Rien de sélectionné."));
    ls.forEach(function (l) {
      var row = el("div", "fg-break-line");
      row.appendChild(el("span", "fg-break-lbl", l.label));
      row.appendChild(el("span", "fg-break-cost" + (l.cost < 0 ? " neg" : ""), (l.cost > 0 ? "+" : "") + l.cost));
      brk.appendChild(row);
    });
    aside.appendChild(brk);

    var fiche = el("div", "fg-fiche");
    fiche.appendChild(el("div", "fg-fiche-head", state.name.trim() || "Fiche de l'arme"));
    [["Compat. AM", state.am], ["Portée", fichePortee()], ["Munitions", ficheMunitions()], ["Mains", state.mains],
     ["Dégâts", String(state.degats)], ["Mod. dégâts", ficheMod()],
     ["Type", state.types.join(" / ") || "—"], ["Illégalité", state.illeg],
     ["Propriétés", ficheProps()]].forEach(function (r) {
      var row = el("div", "fg-fiche-row");
      row.appendChild(el("span", "fg-fiche-k", r[0]));
      row.appendChild(el("span", "fg-fiche-v", r[1]));
      fiche.appendChild(row);
    });
    aside.appendChild(fiche);

    // bibliothèque d'armes enregistrées — pont vers l'Atelier
    var saved = loadWeapons();
    var sec = el("div", "fg-saved");
    sec.appendChild(el("div", "fg-saved-head", "Armes enregistrées (" + saved.length + ")"));
    if (!saved.length) sec.appendChild(el("div", "fg-saved-empty", "Aucune. Nommez l'arme puis « Enregistrer » : elle devient une node dans l'Atelier."));
    saved.forEach(function (w) {
      var item = el("div", "fg-saved-item");
      var info = el("div", "fg-saved-info");
      info.appendChild(el("span", "fg-saved-name", w.name));
      info.appendChild(el("span", "fg-saved-total" + (w.total === 100 ? " ok" : ""), w.total + " pts"));
      item.appendChild(info);
      var acts = el("div", "fg-saved-acts");
      var lb = el("button", "fg-mini", "Charger"); lb.type = "button"; lb.title = "Charger dans le constructeur";
      lb.addEventListener("click", function () { loadWeaponInto(w); });
      var db = el("button", "fg-mini danger", "×"); db.type = "button"; db.title = "Supprimer";
      db.addEventListener("click", function () { if (confirm("Supprimer « " + w.name + " » ?")) deleteWeapon(w.id); });
      acts.appendChild(lb); acts.appendChild(db);
      item.appendChild(acts);
      sec.appendChild(item);
    });
    aside.appendChild(sec);

    save();
  }

  // --- fabriques de contrôles ------------------------------------------------
  // carte de la grille ; `span` = "" | "s2" | "full"
  function card(grid, title, span, tip) {
    var c = el("div", "fg-card" + (span ? " " + span : ""));
    var h = el("div", "fg-card-lbl", title);
    if (tip) h.title = tip;
    c.appendChild(h);
    grid.appendChild(c);
    return c;
  }
  function shead(grid, txt) { var h = el("div", "fg-shead", txt); grid.appendChild(h); }
  function hint(card, txt) { if (txt) card.appendChild(el("div", "fg-card-hint", txt)); }

  // pastilles à bascule (choix multiple dans le tableau `set`)
  function chips(parent, rows, set, fmt, groupOf) {
    var box = el("div", "fg-chips");
    var els = {};
    rows.forEach(function (r) {
      var c = el("span", "fg-chip" + (set.indexOf(r.label) >= 0 ? " on" : ""));
      c.innerHTML = fmt ? fmt(r) : r.label;
      if (r.cost != null) c.title = cost(r.cost);
      els[r.label] = c;
      c.addEventListener("click", function () {
        var i = set.indexOf(r.label);
        if (i >= 0) { set.splice(i, 1); c.classList.remove("on"); }
        else {
          if (groupOf) {   // portées d'un même type = exclusives (une seule mêlée/allonge, un seul jet, un seul tir)
            var g = groupOf(r.label);
            rows.forEach(function (rr) {
              if (rr.label !== r.label && groupOf(rr.label) === g) {
                var j = set.indexOf(rr.label);
                if (j >= 0) { set.splice(j, 1); if (els[rr.label]) els[rr.label].classList.remove("on"); }
              }
            });
          }
          set.push(r.label); c.classList.add("on");
        }
        refresh();
      });
      box.appendChild(c);
    });
    parent.appendChild(box);
    return box;
  }
  // choix simple (segmenté) depuis une fiche obligatoire
  function segFor(parent, id, setter, cur, fmt) {
    var seg = el("div", "fg-seg");
    ob(id).tables[0].rows.forEach(function (r) {
      var b = el("button", "fg-seg-btn" + (r.label === cur ? " on" : ""));
      b.type = "button";
      b.innerHTML = fmt ? fmt(r) : r.label;
      b.title = (r.note ? r.note + " — " : "") + cost(r.cost);
      b.addEventListener("click", function () {
        seg.querySelectorAll(".fg-seg-btn").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on"); setter(r.label); refresh();
      });
      seg.appendChild(b);
    });
    parent.appendChild(seg);
  }
  // choix simple sur TOUTES les tables d'une fiche (modificateur : force du porteur ×N + propulsion +X)
  function segForAll(parent, id, setter, cur) {
    var seg = el("div", "fg-seg");
    ob(id).tables.forEach(function (t) {
      t.rows.forEach(function (r) {
        var b = el("button", "fg-seg-btn" + (r.label === cur ? " on" : ""));
        b.type = "button"; b.innerHTML = r.label; b.title = (r.note ? r.note + " — " : "") + cost(r.cost);
        b.addEventListener("click", function () {
          seg.querySelectorAll(".fg-seg-btn").forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on"); setter(r.label); refresh();
        });
        seg.appendChild(b);
      });
    });
    parent.appendChild(seg);
  }
  function tierSelect(parent, prop, cur, onPick) {
    var s = el("select", "fg-select");
    var none = el("option"); none.value = ""; none.textContent = "Aucun"; s.appendChild(none);
    prop.tables[0].rows.forEach(function (r) {
      var o = el("option"); o.value = r.label; o.textContent = r.label + "  (" + cost(r.cost) + ")";
      if (r.label === cur) o.selected = true; s.appendChild(o);
    });
    s.addEventListener("change", function () { onPick(s.value || null); refresh(); });
    parent.appendChild(s);
  }
  function buildCone(parent, box) {
    var chip = el("span", "fg-chip" + (state.cone ? " on" : ""));
    chip.innerHTML = "Cône<small>aire</small>";
    var opts = el("div", "fg-cone-opts");
    var lenS = el("select", "fg-select"), angS = el("select", "fg-select");
    ob("portee").tables[3].rows.forEach(function (r) { var o = el("option"); o.value = r.label; o.textContent = r.label + " (" + cost(r.cost) + ")"; lenS.appendChild(o); });
    ob("portee").tables[4].rows.forEach(function (r) { var o = el("option"); o.value = r.label; o.textContent = r.label + " (" + cost(r.cost) + ")"; angS.appendChild(o); });
    if (state.cone) { lenS.value = state.cone.len; angS.value = state.cone.ang; }
    opts.appendChild(lenS); opts.appendChild(angS);
    opts.style.display = state.cone ? "" : "none";
    function sync() { state.cone = chip.classList.contains("on") ? { len: lenS.value, ang: angS.value } : null; opts.style.display = state.cone ? "" : "none"; refresh(); }
    chip.addEventListener("click", function () {
      var on = !chip.classList.contains("on");
      chip.classList.toggle("on", on);
      if (on && !state.cone) { lenS.selectedIndex = 1; angS.selectedIndex = 1; }
      sync();
    });
    lenS.addEventListener("change", sync); angS.addEventListener("change", sync);
    box.appendChild(chip); parent.appendChild(opts);
  }

  // --- construction de la grille ---------------------------------------------
  function buildForm(grid) {
    var sub = '<small>';
    shead(grid, "Colonnes obligatoires");

    // Dégâts
    var cD = card(grid, "Dégâts", "s2", ob("degats").desc);
    var row = el("div", "fg-slider");
    var rg = el("input", "fg-range"); rg.type = "range"; rg.min = "0"; rg.max = "200"; rg.step = "10"; rg.value = String(state.degats);
    var val = el("span", "fg-slider-val", String(state.degats));
    rg.addEventListener("input", function () { state.degats = parseInt(rg.value, 10); val.textContent = rg.value; refresh(); });
    row.appendChild(rg); row.appendChild(val); cD.appendChild(row);

    // Mains
    var cM = card(grid, "Mains", "", ob("mains").desc);
    segFor(cM, "mains", function (v) { state.mains = v; }, state.mains);

    // Type
    var cT = card(grid, "Type de dégâts", "", "Le 1er offert · +10/type · +20 élémentaire");
    chips(cT, ob("type-de-degats").tables[0].rows, state.types);

    // Modificateur
    var cMo = card(grid, "Modificateur", "", ob("modificateur-de-degats").desc);
    segForAll(cMo, "modificateur-de-degats", function (v) { state.mod = v; }, state.mod);

    // Compatibilité AM
    var cA = card(grid, "Compatibilité AM", "", ob("compatibilite-arts-martiaux").desc);
    segFor(cA, "compatibilite-arts-martiaux", function (v) { state.am = v; }, state.am, function (r) { return r.label + sub + (r.note || "") + "</small>"; });

    // Illégalité
    var cI = card(grid, "Illégalité", "full", "Plus l'arme est interdite, plus elle rembourse");
    segFor(cI, "illegalite", function (v) { state.illeg = v; }, state.illeg, function (r) { return r.label + sub + cost(r.cost) + "</small>"; });

    // Portée
    var cP = card(grid, "Portée(s)", "full", "Une arme paie chacune de ses portées ; elles se cumulent.");
    var boxP = chips(cP, ob("portee").tables[0].rows.concat(ob("portee").tables[1].rows).concat(ob("portee").tables[2].rows), state.portees, function (r) { return r.label + sub + (r.note || "") + "</small>"; }, function (label) { return /^(Mêlée|Allonge|Contact)/.test(label) ? "m" : /^Lancer/.test(label) ? "l" : /^Tir/.test(label) ? "t" : label; });
    buildCone(cP, boxP);

    // Munitions : colonne obligatoire pour toute arme de tir ou de cône
    var cMun = card(grid, "Munitions", "", ob("munitions").desc);
    tierSelect(cMun, ob("munitions"), state.tiers["munitions"] || null, function (v) { if (v) state.tiers["munitions"] = v; else delete state.tiers["munitions"]; });

    // ===== Propriétés optionnelles =====
    shead(grid, "Propriétés optionnelles — paliers");
    DATA.supplementaires.forEach(function (p) {
      if (p.id === "cone" || p.fixedCost != null || !p.tables.length) return;
      var c = card(grid, p.name, "", p.desc + (p.prereqs.length ? " — " + p.prereqs.join(" · ") : ""));
      tierSelect(c, p, state.tiers[p.id] || null, function (v) { if (v) state.tiers[p.id] = v; else delete state.tiers[p.id]; });
    });

    shead(grid, "Propriétés optionnelles — traits");
    var cTog = card(grid, "", "full");
    cTog.classList.add("fg-card-bare");
    var box = el("div", "fg-chips fg-chips-wide");
    DATA.supplementaires.forEach(function (p) {
      if (p.fixedCost == null) return;
      var c = el("span", "fg-chip" + (state.toggles[p.id] ? " on" : ""));
      c.innerHTML = p.name + sub + cost(p.fixedCost) + "</small>";
      c.title = p.desc + (p.prereqs.length ? " — " + p.prereqs.join(" · ") : "");
      c.addEventListener("click", function () {
        if (state.toggles[p.id]) { delete state.toggles[p.id]; c.classList.remove("on"); } else { state.toggles[p.id] = true; c.classList.add("on"); }
        refresh();
      });
      box.appendChild(c);
    });
    cTog.appendChild(box);
  }

  // --- montage ---------------------------------------------------------------
  function mount(root) {
    rootEl = root;
    root.innerHTML = "";
    var app = el("div", "forge-atelier");

    var top = el("div", "fg-top");
    top.appendChild(el("span", "fg-top-title", "Forge"));
    top.appendChild(el("span", "fg-top-hint", "Une arme se conçoit sur un budget de 100 points."));
    var nameIn = el("input", "fg-name"); nameIn.type = "text"; nameIn.placeholder = "Nom de l'arme"; nameIn.value = state.name;
    nameIn.addEventListener("input", function () { state.name = nameIn.value; refresh(); });
    top.appendChild(nameIn);
    var saveB = el("button", "fg-btn primary"); saveB.type = "button"; saveB.textContent = "Enregistrer";
    saveB.title = "Enregistrer cette arme dans la bibliothèque (utilisable comme node dans l'Atelier)";
    saveB.addEventListener("click", saveCurrentWeapon);
    top.appendChild(saveB);
    var reset = el("button", "fg-btn"); reset.type = "button"; reset.textContent = "Réinitialiser";
    reset.addEventListener("click", function () { state = blank(); mount(root); });
    top.appendChild(reset);
    app.appendChild(top);

    var layout = el("div", "fg-layout");
    var grid = el("div", "fg-grid");
    aside = el("aside", "fg-aside");
    layout.appendChild(grid); layout.appendChild(aside);
    app.appendChild(layout);
    root.appendChild(app);

    buildForm(grid);
    refresh();
  }

  function init() {
    // Filet de sécurité : purge toute classe rémanente d'une version antérieure
    // (la mise en page plein écran ne repose plus sur une classe de <body>).
    document.body.classList.remove("forge-page");
    var root = document.getElementById("forge-atelier");
    if (!root || root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    if (DATA) { state = load() || blank(); mount(root); return; }
    fetch(siteBase() + "forge.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) { DATA = d; state = load() || blank(); mount(root); })
      .catch(function (e) { root.innerHTML = '<p style="padding:2rem;color:#b0402c">La Forge n\'a pas pu charger son barème (' + e.message + ").</p>"; });
  }

  if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
