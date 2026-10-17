  // ---- Formulaires communs aux attaques et défenses ----
  function combatTexte(label, data, key) {
    var i = el("input", "pc-edit-field"); i.type = "text"; i.value = data[key] || "";
    i.addEventListener("input", function () { data[key] = i.value; save(); });
    i.addEventListener("change", function () { refresh(); });
    return fld(label, i);
  }
  function combatTypes() {
    return ["physique", "feu", "froid", "eclair", "decomposition", "ethere", "brut"];
  }
  function combatLibType(t) {
    return { eclair: "Éclair", decomposition: "Décomposition", ethere: "Éthéré" }[t] || capFirst(t);
  }
  function combatType(data, key) {
    var s = el("select", "pc-select pc-edit-field");
    combatTypes().forEach(function (t) { var o = el("option", null, combatLibType(t)); o.value = t;
      o.selected = t === data[key]; s.appendChild(o); });
    if (!data[key]) { var empty = el("option", null, "— Choisir —"); empty.value = ""; empty.selected = true; s.insertBefore(empty, s.firstChild); }
    s.addEventListener("change", function () { data[key] = s.value; refresh(); });
    return s;
  }
  function combatComp(data) {
    var s = el("select", "pc-select pc-edit-field"), vide = el("option", null, "— Choisir une compétence —"); vide.value = ""; s.appendChild(vide);
    state.comps.forEach(function (c) { var o = el("option", null, c.nom || "Sans nom"); o.value = c.id; o.selected = c.id === data.comp; s.appendChild(o); });
    s.addEventListener("change", function () { data.comp = s.value; refresh(); }); return s;
  }
  function combatRessource(data, cle, texte) {
    var on = !!data[cle], b = el("button", "pc-chip pc-combat-toggle" + (on ? " on" : ""), texte);
    b.type = "button"; b.setAttribute("aria-pressed", String(on));
    b.addEventListener("click", function () { data[cle] = !data[cle]; refresh(); }); return b;
  }
  function combatMod(k, t) { return snum(state.combatModifiers && state.combatModifiers[k] && state.combatModifiers[k][t]); }
  // État de dépliage purement visuel, comme les cartes d'attaque et de défense.
  // Aucun nouvel attribut de personnage n'est nécessaire.
  var combatModVue = { attaque: false, defense: false };
  function combatModificateurs(module, redessiner) {
    var attaque = module === "attaque", ouvert = !!combatModVue[module];
    var cleVisibilite = attaque ? "modificateursAttaque" : "modificateursDefense";
    var visible = state.combatAffichage[cleVisibilite] !== false;
    if (!visible && !isEdit(module)) return null;
    var titre = attaque ? "Modificateurs d’Attaque" : "Modificateurs de Défense";
    // Même cadre, même en-tête et même chevron que toutes les cartes de combat.
    var card = el("div", "pc-attaque-card pc-combat-modificateurs");
    card.dataset.combatModifiers = module;
    combatCarteTete(card, titre, "", ouvert, module, "modificateurs-" + module,
      function () { combatModVue[module] = !combatModVue[module]; redessiner(); }, null, {
        visible: visible,
        basculer: function () { state.combatAffichage[cleVisibilite] = !visible; refresh(); }
      });
    if (!ouvert) return card;

    // La présentation est celle des défenses pour LES DEUX modules, y compris
    // les alignements, la typographie et l'espacement de leurs tableaux.
    var detail = el("div", "pc-attaque-detail pc-defense-detail pc-combat-mod-detail");
    var table = el("table", "pc-defense-valeurs pc-combat-mod-table"), head = el("tr");
    (attaque ? ["Type", "Dégâts"] : ["Type", "Protection", "Résistance"]).forEach(function (s) {
      head.appendChild(el("th", null, s));
    });
    table.appendChild(head);
    combatTypes().forEach(function (t) {
      var row = el("tr"); row.dataset.damageType = t;
      row.appendChild(el("td", null, combatLibType(t)));
      (attaque ? ["attaques"] : ["protections", "resistances"]).forEach(function (k) {
        var td = el("td"), valeur = el("span", "pc-combat-mod-cell");
        var i = el("input", "pc-num");
        champNombreSigne(i); i.step = "any"; i.value = combatMod(k, t);
        i.setAttribute("aria-label", (k === "attaques" ? "Dégâts" : k === "protections" ? "Protection" : "Résistance") + " " + combatLibType(t));
        i.addEventListener("input", function () {
          var n = Number(i.value);
          if (isFinite(n)) { state.combatModifiers[k][t] = n; save(); }
        });
        i.addEventListener("change", function () { refresh(); });
        valeur.appendChild(i);
        if (k === "resistances") valeur.appendChild(el("span", "pc-combat-mod-pourcent", "%"));
        td.appendChild(valeur); row.appendChild(td);
      });
      table.appendChild(row);
    });
    detail.appendChild(table); card.appendChild(detail); return card;
  }
  function combatEndurance(data) { return combatRessource(data, "utiliseEndurance", "Consommer Endurance"); }
  // Protection d'abord, pourcentage ensuite ; arrondi une seule fois, à la fin.
  // Borner chaque étape empêche deux valeurs négatives de produire des dégâts.
  function combatDegats(d, p, r) {
    return Math.max(0, Math.floor(Math.max(0, d - p) * Math.max(0, 1 - r / 100) + 1e-9));
  }
  function defenseArme(ref) {
    return state.inv.objets.filter(function (o) { return o.arme && String(o.ref) === String(ref); })[0] || null;
  }
  function defenseValeurs(entree) {
    var item = entree && entree.arme ? defenseArme(entree.arme) : null;
    var a = entree && entree.personnalisee || item && item.arme;
    var flat = snum(a && a.reduction);
    (a && a.modsParade || []).slice(0, 3).forEach(function (c) { if (c) flat += Math.floor(caracTotal(c) / 5); });
    return { item: item, protection: flat, difficulte: Math.max(1, snum(a && a.parade) + effetBonus("parade")), comp: a && a.comp || "" };
  }
  function defenseTotaux(type, defense, reussie) {
    var p = 0, r = 0, portes = vetementsPortes().filter(function (o) { return pnum(o.qte) > 0; });
    portes.forEach(function (o) { p += snum(o["prot_" + type]); r += snum(o["res_" + type]); });
    if (defense && reussie) {
      var active = defense.protection;
      // Un objet hybride déjà porté n'est compté qu'une seule fois.
      if (defense.item && portes.indexOf(defense.item) < 0) {
        active += snum(defense.item["prot_" + type]); r += snum(defense.item["res_" + type]);
      }
      p += state.combatOptions && state.combatOptions.defenses.lente ? Math.floor(active / 2) : active;
    }
    p += combatMod("protections",type) + effetBonus("protections",type);
    r += combatMod("resistances",type) + effetBonus("resistances",type) - 5*effetAlerte();
    if(effetBonus("immunites",type)>=100)r=Math.max(100,r);
    return {protection:p,reduction:r};
  }
  function defensePrompt(nom, mode, entree) {
    var body = el("div", "pc-modal-body pc-defense-form"), degats = el("input", "n"), type = el("select", "pc-select");
    degats.type = "text"; degats.inputMode = "decimal"; degats.value = "0";
    degats.setAttribute("aria-label", "Dégâts subis");
    combatTypes().forEach(function (t) { var op = el("option", null, combatLibType(t)); op.value = t; type.appendChild(op); });
    type.setAttribute("aria-label", "Type de dégâts");
    body.appendChild(fld("Dégâts subis", degats)); body.appendChild(fld("Type de dégâts", type));
    dialogue(nom, body, function () {
      var brut = Number(degats.value.replace(",", "."));
      if (!degats.value.trim() || !isFinite(brut) || brut < 0) { flash("Saisissez des dégâts positifs ou nuls."); degats.focus(); return false; }
      if (mode === "parade" && entree.arme && !defenseArme(entree.arme)) { flash("Cette arme n’est plus disponible."); return false; }
      var v = defenseValeurs(entree), totaux = defenseTotaux(type.value, mode === "parade" ? v : null, true);
      var subis = mode === "esquive" ? 0 : combatDegats(brut, totaux.protection, totaux.reduction);
      var cout = mode === "esquive" ? 8 : mode === "sans" ? 0 : v.difficulte;
      var difficulte = mode === "esquive" ? Math.max(1,8-effetAlerte()) : cout;
      var comp = compDe(mode === "esquive" ? entree.comp : v.comp);
      var champs = [["Dégâts reçus", fmtP(brut) + " " + combatLibType(type.value)],
        ["Protection", fmtP(totaux.protection)], ["Réduction", fmtP(totaux.reduction) + " %"], ["Dégâts subis", fmtP(subis)]];
      if (mode !== "sans") {
        champs.push(["Difficulté", fmtP(difficulte)]);
        if (comp) champs.push(["Compétence", comp.nom || "Compétence"]);
        if (state.combatOptions.defenses.utiliseEndurance && !state.combatOptions.defenses.lente) {
          state.etat.pe = Math.round((courant("pe") - effetCout("pe",cout)) * 100) / 100;
          champs.push(["Endurance", "−" + fmtP(effetCout("pe",cout))]);
        }
      }
      sayChat(nom, champs); refresh();
    }, "Valider");
  }
  var combatDrag = null;
  function combatOeil(visible) {
    var ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
    var forme = document.createElementNS(ns, "path");
    forme.setAttribute("d", "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"); svg.appendChild(forme);
    if (visible) {
      var pupille = document.createElementNS(ns, "circle");
      pupille.setAttribute("cx", "12"); pupille.setAttribute("cy", "12"); pupille.setAttribute("r", "3"); svg.appendChild(pupille);
    } else {
      var barre = document.createElementNS(ns, "path");
      barre.setAttribute("d", "M3 3 21 21"); svg.appendChild(barre);
    }
    return svg;
  }
  function combatCarteTete(card, nom, resume, ouvert, module, id, toggle, liste, visibilite) {
    var ligne = el("div", "pc-combat-tete");
    var tete = el("button", "pc-attaque-tete" + (module === "defense" ? " pc-defense-tete" : "")); tete.type = "button";
    tete.setAttribute("aria-expanded", String(ouvert));
    tete.appendChild(el("span", "pc-attaque-nom", nom)); tete.appendChild(el("span", "pc-attaque-meta", resume));
    tete.addEventListener("click", toggle); ligne.appendChild(tete);
    var outils = el("div", "pc-combat-outils");
    if (liste) {
      var drag = el("span", "pc-combat-poignee pc-combat-drag pc-edit-only", "⠿"); drag.title = "Déplacer"; drag.setAttribute("aria-label", "Déplacer " + nom); drag.draggable = true;
      drag.addEventListener("dragstart", function (ev) {
        if (!isEdit(module)) { ev.preventDefault(); return; }
        combatDrag = { module: module, id: id }; ev.dataTransfer.setData("text/plain", id); ev.dataTransfer.effectAllowed = "move"; card.classList.add("pc-combat-pris");
      });
      drag.addEventListener("dragend", function () { combatDrag = null; card.classList.remove("pc-combat-pris"); }); outils.appendChild(drag);
      card.addEventListener("dragover", function (ev) {
        if (!isEdit(module) || !combatDrag || combatDrag.module !== module || combatDrag.id === id) return;
        ev.preventDefault(); ev.dataTransfer.dropEffect = "move";
        card.classList.add("pc-combat-depot");
      });
      card.addEventListener("dragleave", function () { card.classList.remove("pc-combat-depot"); });
      card.addEventListener("drop", function (ev) {
        if (!isEdit(module) || !combatDrag || combatDrag.module !== module || combatDrag.id === id) return;
        ev.preventDefault(); var items = liste(), from = items.findIndex(function (e) { return e.id === combatDrag.id; });
        if (from < 0) return;
        var avant = ev.clientY < card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2;
        var moved = items.splice(from, 1)[0], to = items.findIndex(function (e) { return e.id === id; });
        items.splice(to + (avant ? 0 : 1), 0, moved); combatDrag = null; refresh();
      });
    } else if (visibilite) {
      var oeil = el("button", "pc-combat-poignee pc-combat-oeil pc-edit-only"); oeil.type = "button";
      oeil.title = visibilite.visible ? "Masquer hors du mode édition" : "Afficher hors du mode édition";
      oeil.setAttribute("aria-label", oeil.title); oeil.setAttribute("aria-pressed", String(visibilite.visible));
      oeil.appendChild(combatOeil(visibilite.visible));
      oeil.addEventListener("click", function (ev) { ev.stopPropagation(); visibilite.basculer(); });
      outils.appendChild(oeil);
    }
    var ouvrir = el("button", "pc-attaque-chevron pc-combat-ouvrir", ouvert ? "▾" : "▸"); ouvrir.type = "button"; ouvrir.title = ouvert ? "Réduire" : "Agrandir"; ouvrir.addEventListener("click", toggle);
    ouvrir.setAttribute("aria-label", ouvert ? "Réduire" : "Agrandir"); ouvrir.setAttribute("aria-expanded", String(ouvert)); outils.appendChild(ouvrir);
    ligne.appendChild(outils); card.appendChild(ligne);
  }
  function combatSupprimer(card, action) {
    var pied = el("div", "pc-combat-pied pc-edit-only"); pied.appendChild(miniBtn("Supprimer", null, action, "danger")); card.appendChild(pied);
  }
  var defenseVue = { ouverts: Object.create(null) };
  function buildDefense() {
    var b = block("Défenses", null, "defense", rendre), box = el("div", "pc-attaques pc-defenses"); b.appendChild(box);
    function bouton(nom, mode, entree) {
      var btn = el("button", "pc-attaque-simple pc-defense-bouton"); btn.type = "button";
      btn.appendChild(el("strong", null, "Se défendre"));
      btn.addEventListener("click", function () { defensePrompt(nom, mode, entree); }); return btn;
    }
    function details(card, nom, mode, entree, id) {
      var ouvert = !!defenseVue.ouverts[id], v = defenseValeurs(entree);
      var valeur = state.combatOptions.defenses.lente ? Math.floor(v.protection / 2) : v.protection;
      var cleVisibilite = mode === "sans" ? "defenseSans" : mode === "esquive" ? "defenseEsquive" : "";
      var visible = !cleVisibilite || state.combatAffichage[cleVisibilite] !== false;
      combatCarteTete(card, nom, mode === "sans" ? "" : mode === "esquive" ? "Difficulté "+Math.max(1,8-effetAlerte()) : "Difficulté " + fmtP(v.difficulte) + " · Protection " + sign(valeur), ouvert, "defense", id,
        function () { defenseVue.ouverts[id] = !defenseVue.ouverts[id]; rendre(); }, mode === "parade" ? function () { return state.defenses.entrees; } : null,
        cleVisibilite ? { visible: visible, basculer: function () { state.combatAffichage[cleVisibilite] = !visible; refresh(); } } : null);
      if (!ouvert) return;
      var detail = el("div", "pc-attaque-detail pc-defense-detail");
      var comp = compDe(mode === "esquive" ? entree.comp : v.comp);
      if (comp) detail.appendChild(el("div", "pc-attaque-meta", comp.nom || "Compétence"));
      var table = el("table", "pc-defense-valeurs"), head = el("tr");
      ["Type", "Protection", "Résistance"].forEach(function (s) { head.appendChild(el("th", null, s)); }); table.appendChild(head);
      combatTypes().forEach(function (t) {
        var totaux = defenseTotaux(t, mode === "parade" ? v : null, true);
        if (!state.combatOptions.defenses.toutAfficher && totaux.protection === 0 && totaux.reduction === 0) return;
        var row = el("tr"); row.dataset.damageType = t;
        row.appendChild(el("td", null, combatLibType(t)));
        row.appendChild(el("td", "pc-defense-protection", (state.combatOptions.defenses.toutAfficher || totaux.protection !== 0 ? fmtP(totaux.protection) : "")));
        row.appendChild(el("td", "pc-defense-resistance", (state.combatOptions.defenses.toutAfficher || totaux.reduction !== 0 ? fmtP(totaux.reduction) + " %" : ""))); table.appendChild(row);
      });
      if (table.querySelector("td")) detail.appendChild(table); detail.appendChild(bouton(nom, mode, entree)); card.appendChild(detail);
    }
    function rendre() {
      box.innerHTML = "";
      var ressources = el("div", "pc-attaque-ressources pc-combat-ressources");
      ressources.appendChild(combatRessource(state.combatOptions.defenses, "lente", "Défense Lente"));
      ressources.appendChild(combatEndurance(state.combatOptions.defenses));
      ressources.appendChild(combatRessource(state.combatOptions.defenses, "toutAfficher", "Tout afficher")); box.appendChild(ressources);
      var sans = el("div", "pc-attaque-card"); sans.dataset.defenseId = "sans";
      if (isEdit("defense") || state.combatAffichage.defenseSans !== false) { details(sans, "Sans Défense", "sans", null, "sans"); box.appendChild(sans); }
      var es = el("div", "pc-attaque-card"), esquive = state.defenses.esquive;
      var editEs = el("div", "pc-edit-only pc-defense-edit"); editEs.appendChild(fld("Compétence d’esquive", combatComp(esquive))); 
      es.dataset.defenseId = "esquive";
      if (isEdit("defense") || state.combatAffichage.defenseEsquive !== false) {
        details(es, "Esquive", "esquive", esquive, "esquive"); if (defenseVue.ouverts.esquive) es.insertBefore(editEs, es.querySelector(".pc-defense-detail")); box.appendChild(es);
      }
      state.defenses.entrees.forEach(function (e) {
        var card = el("div", "pc-attaque-card"), edit = el("div", "pc-edit-only pc-defense-edit"), sel = el("select", "pc-select pc-edit-field");
        var opt = el("option", null, "— Choisir une arme —"); opt.value = ""; sel.appendChild(opt);
        opt = el("option", null, "Défense personnalisée"); opt.value = "custom"; opt.selected = !!e.personnalisee; sel.appendChild(opt);
        state.inv.objets.filter(function (o) { return o.arme; }).forEach(function (o) {
          if (!o.ref) o.ref = uid("o");
          var op = el("option", null, o.nom || "Arme sans nom"); op.value = o.ref; op.selected = !e.personnalisee && e.arme === o.ref; sel.appendChild(op);
        });
        sel.addEventListener("change", function () {
          if (sel.value === "custom") { e.arme = ""; e.personnalisee = e.personnalisee || { parade: "8", reduction: "0", modsParade: ["", "", ""], comp: "" }; }
          else { e.personnalisee = null; e.arme = sel.value; } refresh();
        });
        edit.appendChild(fld("Source", sel)); edit.appendChild(combatTexte("Nom", e, "nom"));
        if (e.personnalisee) {
          edit.appendChild(combatTexte("Difficulté", e.personnalisee, "parade"));
          edit.appendChild(combatTexte("Protection", e.personnalisee, "reduction"));
          edit.appendChild(fld("Compétence", combatComp(e.personnalisee)));
          var mods = el("div", "pc-arme-line pc-arme-3");
          for (var i = 0; i < 3; i++) (function (rang) {
            var sm = el("select", "pc-select pc-edit-field"), empty = el("option", null, "—"); empty.value = ""; sm.appendChild(empty);
            caracsOrdre().forEach(function (c) { var op = el("option", null, abbrCarac(c)); op.value = c; op.selected = e.personnalisee.modsParade[rang] === c; sm.appendChild(op); });
            sm.addEventListener("change", function () { e.personnalisee.modsParade[rang] = sm.value; refresh(); }); mods.appendChild(fld("MOD", sm));
          })(i);
          edit.appendChild(mods);
        }
        var item = defenseArme(e.arme), nom = e.nom || (item ? "Parade — " + (item.nom || "Arme") : "Défense personnalisée");
        card.dataset.defenseId = e.id;
        details(card, nom, "parade", e, e.id);
        if (defenseVue.ouverts[e.id]) {
          card.insertBefore(edit, card.querySelector(".pc-defense-detail"));
          combatSupprimer(card, function () { state.defenses.entrees = state.defenses.entrees.filter(function (a) { return a.id !== e.id; }); refresh(); });
        }
        box.appendChild(card);
      });
      box.appendChild(miniBtn("+ Ajouter une défense", null, function () { var e = { id: uid("def"), nom: "", arme: "", personnalisee: null }; state.defenses.entrees.push(e); defenseVue.ouverts[e.id] = true; refresh(); }, "pc-edit-only"));
      var mods = combatModificateurs("defense", rendre); if (mods) box.appendChild(mods);
      applyEdit(b, "defense");
    }
    rendre(); hooks.push(rendre); return b;
  }
