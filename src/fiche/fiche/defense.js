  // ---- Formulaires communs aux attaques et défenses ----
  function combatTexte(label, data, key) {
    var i = el("input", "pc-edit-field"); i.type = "text"; i.value = data[key] || "";
    i.addEventListener("input", function () { data[key] = i.value; save(); });
    i.addEventListener("change", function () { refresh(); });
    return fld(label, i);
  }
  function combatTypes() {
    return ["contondant", "perforant", "tranchant", "feu", "froid", "eclair", "decomposition", "ethere", "brut"];
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
    var on = !!data[cle], b = el("button", "pc-mini pc-attaque-toggle" + (on ? " on" : ""), texte);
    b.type = "button"; b.setAttribute("aria-pressed", String(on));
    b.addEventListener("click", function () { data[cle] = !data[cle]; refresh(); }); return b;
  }
  function combatEndurance(data) { return combatRessource(data, "utiliseEndurance", "Utiliser Endurance"); }
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
    return { item: item, protection: flat, difficulte: Math.max(0, snum(a && a.parade)), comp: a && a.comp || "" };
  }
  function defenseTotaux(type, defense, reussie) {
    var p = 0, r = 0, portes = vetementsPortes().filter(function (o) { return pnum(o.qte) > 0; });
    portes.forEach(function (o) { p += snum(o["prot_" + type]); r += snum(o["res_" + type]); });
    if (defense && reussie) {
      p += defense.protection;
      // Un objet hybride déjà porté n'est compté qu'une seule fois.
      if (defense.item && portes.indexOf(defense.item) < 0) {
        p += snum(defense.item["prot_" + type]); r += snum(defense.item["res_" + type]);
      }
    }
    return { protection: p, reduction: r };
  }
  function defensePrompt(nom, mode, entree) {
    var v = defenseValeurs(entree), body = el("div", "pc-modal-body pc-defense-form"), lignes = [];
    var reussite = el("input"); reussite.type = "checkbox"; reussite.checked = true;
    var cout = mode === "esquive" ? 8 : mode === "sans" ? 0 : v.difficulte;
    var comp = compDe(mode === "esquive" ? entree.comp : v.comp);
    if (mode !== "sans") {
      var choix = el("label", "pc-defense-reussite"); choix.appendChild(reussite); choix.appendChild(document.createTextNode("Défense réussie")); body.appendChild(choix);
      var jet = miniBtn("Lancer le jet", null, function () {
        // Les dés d'action Roll20 sont conservés, avec leurs relances. Le joueur
        // indique ensuite le résultat : aucune somme locale concurrente.
        if (!comp) { flash("Liez une compétence à cette défense en édition."); return; }
        var n = compDes(comp);
        doRoll(nom + " — " + (comp.nom || "Compétence") + " — Difficulté " + cout, compBonus(comp), deDe(n), true, n);
      });
      body.appendChild(jet);
      body.appendChild(el("div", "pc-modal-note", "Indiquez la réussite après le jet. Coût de la tentative : " + (state.combatOptions.defenses.utiliseEndurance ? fmtP(cout) : "0") + " PE."));
    }
    var liste = el("div", "pc-defense-lignes"), calcul = el("div", "pc-defense-calcul"); body.appendChild(liste);
    function values() {
      // Même type = une composante de dégâts, pour appliquer sa protection une
      // fois et ne pas gagner un arrondi supplémentaire en divisant la saisie.
      var types = {};
      lignes.forEach(function (l) { var n = Number(l.input.value.replace(",", ".")); types[l.type.value] = (types[l.type.value] || 0) + (isFinite(n) && n >= 0 ? n : 0); });
      var out = [], total = 0;
      Object.keys(types).forEach(function (t) {
        var defenses = defenseTotaux(t, mode === "parade" ? v : null, reussite.checked);
        var dg = mode === "esquive" && reussite.checked ? 0 : combatDegats(types[t], defenses.protection, defenses.reduction);
        total += dg; out.push({ type: t, brut: types[t], p: defenses.protection, r: defenses.reduction, dg: dg });
      });
      return { total: total, lignes: out };
    }
    function affiche() {
      var res = values(); calcul.innerHTML = "";
      res.lignes.forEach(function (l) { calcul.appendChild(el("div", null, combatLibType(l.type) + " : " + fmtP(l.brut) + " − " + fmtP(l.p) + " protection, puis " + fmtP(l.r) + " % → " + fmtP(l.dg))); });
      calcul.appendChild(el("strong", "pc-defense-total", "Dégâts subis : " + fmtP(res.total)));
    }
    function ajoute() {
      var l = { type: combatType({ touche: "contondant" }, "touche"), input: el("input", "pc-edit-field") };
      l.input.type = "text"; l.input.inputMode = "decimal"; l.input.value = "0"; l.input.setAttribute("aria-label", "Dégâts de l’attaque");
      var row = el("div", "pc-defense-ligne"); row.appendChild(l.type); row.appendChild(l.input);
      // Ce formulaire est temporaire : ne pas sauvegarder/remonter la fiche au
      // changement de type (combatType possède normalement un listener métier).
      var select = l.type.cloneNode(true); row.replaceChild(select, l.type); l.type = select;
      row.appendChild(miniBtn("✕", "Retirer ce type de dégâts", function () { if (lignes.length < 2) return; lignes.splice(lignes.indexOf(l), 1); row.remove(); affiche(); }));
      l.type.addEventListener("change", affiche); l.input.addEventListener("input", affiche); lignes.push(l); liste.appendChild(row); affiche();
    }
    body.appendChild(miniBtn("+ Ajouter un type de dégâts", null, ajoute)); body.appendChild(calcul);
    reussite.addEventListener("change", affiche); ajoute();
    dialogue(nom + " — Dégâts reçus", body, function () {
      if (lignes.some(function (l) { var n = Number(l.input.value.replace(",", ".")); return !l.input.value.trim() || !isFinite(n) || n < 0; })) { flash("Saisissez des dégâts positifs ou nuls."); return false; }
      // Résoudre avec les valeurs actuelles : une armure ou l'arme peut avoir
      // été modifiée dans une autre fenêtre pendant que le formulaire était ouvert.
      if (mode === "parade" && entree.arme && !defenseArme(entree.arme)) { flash("Cette arme n’est plus disponible."); return false; }
      v = defenseValeurs(entree); if (mode === "parade") cout = v.difficulte;
      var res = values();
      state.etat.pv = Math.round((courant("pv") - res.total) * 100) / 100;
      if (mode !== "sans" && state.combatOptions.defenses.utiliseEndurance) state.etat.pe = Math.round((courant("pe") - cout) * 100) / 100;
      var champs = res.lignes.map(function (l) { return [combatLibType(l.type), fmtP(l.brut) + " reçus · Protection " + fmtP(l.p) + " · Réduction " + fmtP(l.r) + " % · " + fmtP(l.dg) + " subis"]; });
      if (mode !== "sans") champs.push(["Résultat", reussite.checked ? "Réussite" : "Échec"]);
      champs.push(["Dégâts subis", fmtP(res.total)]);
      if (mode !== "sans" && state.combatOptions.defenses.utiliseEndurance) champs.push(["Endurance", "−" + fmtP(cout)]);
      sayChat(nom, champs); refresh();
    }, "Appliquer les dégâts");
  }
  function buildDefense() {
    var b = block("Défenses", null, "defense", rendre), box = el("div", "pc-attaques pc-defenses"); b.appendChild(box);
    function bouton(nom, mode, entree) {
      var btn = el("button", "pc-attaque-simple pc-defense-bouton"); btn.type = "button";
      btn.appendChild(el("strong", null, nom));
      var v = defenseValeurs(entree);
      btn.appendChild(el("span", null, mode === "sans" ? "Protections et réductions du personnage" : mode === "esquive" ? "Difficulté 8 · Esquive réussie : aucun dégât" : "Difficulté " + fmtP(v.difficulte) + " · Protection +" + fmtP(v.protection)));
      btn.addEventListener("click", function () { defensePrompt(nom, mode, entree); }); return btn;
    }
    function rendre() {
      box.innerHTML = "";
      var ressources = el("div", "pc-attaque-ressources pc-combat-ressources"); ressources.appendChild(combatEndurance(state.combatOptions.defenses)); box.appendChild(ressources);
      box.appendChild(bouton("Sans Défense", "sans", null));
      var es = el("div", "pc-attaque-card"), esquive = state.defenses.esquive;
      var editEs = el("div", "pc-edit-only pc-defense-edit"); editEs.appendChild(fld("Compétence d’esquive", combatComp(esquive))); es.appendChild(editEs);
      es.appendChild(bouton("Esquive", "esquive", esquive)); box.appendChild(es);
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
        edit.appendChild(miniBtn("✕", "Retirer cette défense", function () { state.defenses.entrees = state.defenses.entrees.filter(function (a) { return a.id !== e.id; }); refresh(); }, "danger"));
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
        card.appendChild(edit);
        var item = defenseArme(e.arme), nom = e.nom || (item ? "Parade — " + (item.nom || "Arme") : "Défense personnalisée");
        if (item || e.personnalisee) { card.appendChild(bouton(nom, "parade", e)); }
        else card.appendChild(el("div", "pc-empty", e.arme ? "Arme introuvable. Choisissez une autre source." : "Choisissez une source en édition."));
        box.appendChild(card);
      });
      box.appendChild(miniBtn("+ Ajouter une défense", null, function () { state.defenses.entrees.push({ id: uid("def"), nom: "", arme: "", personnalisee: null }); refresh(); }, "pc-edit-only"));
      applyEdit(b, "defense");
    }
    rendre(); hooks.push(rendre); return b;
  }
