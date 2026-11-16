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
  function combatComp(data, libelleVide) {
    var s = el("select", "pc-select pc-edit-field"), vide = el("option", null, libelleVide || "Choisir une compétence"); vide.value = ""; s.appendChild(vide);
    state.comps.forEach(function (c) { var o = el("option", null, c.nom || "Sans nom"); o.value = c.id; o.selected = c.id === data.comp; s.appendChild(o); });
    s.addEventListener("change", function () { data.comp = s.value; refresh(); }); return s;
  }
  function combatRessource(data, cle, texte) {
    var on = !!data[cle], b = el("button", "c pc-toggle" + (on ? " on" : ""), texte);
    b.type = "button"; b.setAttribute("aria-pressed", String(on));
    b.addEventListener("click", function () { data[cle] = !data[cle]; refresh(); }); return b;
  }
  function combatMod(k, t, defaut) {
    var valeur = state.combatModifiers && state.combatModifiers[k] && state.combatModifiers[k][t];
    if (valeur == null) return defaut == null ? 0 : defaut;
    return k === "protections" || k === "resistances" ? snum(valeur) : (Number(valeur) || 0);
  }
  // Les sauvegardes conservent les facteurs historiques (×1 est neutre).
  function bonusDuFacteur(facteur) {
    return Number((facteur - 1).toPrecision(15));
  }
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

    var detail = el("div", "pc-attaque-detail pc-defense-detail pc-combat-mod-detail");
    var wrap = el("div", "pc-attaque-grille-wrap");
    var table = el("table", "pc-attaque-grille-degats pc-combat-mod-table"), head = el("tr");
    table.setAttribute("aria-label", titre);
    head.appendChild(el("th", null, "Dégâts"));
    var types = combatTypes();
    types.forEach(function (t) {
      var th = el("th");
      th.scope = "col";
      th.appendChild(iconeDegats(t));
      head.appendChild(th);
    });
    table.appendChild(head);
    var lignes = attaque ? [
      ["Bonus pri.", "attaquesPrimaires", "Bonus primaire", 0, false],
      ["Mult. att.", "attaquesMultiplicateurs", "Bonus au multiplicateur d’attaque", 1, false],
      ["Bonus sec.", "attaques", "Bonus secondaire", 0, false],
      ["Mult. dég.", "tauxDegats", "Bonus au multiplicateur de dégâts", 100, true]
    ] : [
      ["Prot.", "protections", "Protection", 0, false],
      ["Rés.", "resistances", "Résistance", 0, true]
    ];
    lignes.forEach(function (ligne) {
      var k = ligne[1], titre = ligne[2], base = ligne[3];
      var row = el("tr"), libelle = el("th", null, ligne[0] + (ligne[4] ? " %" : ""));
      libelle.scope = "row";
      libelle.title = titre;
      row.appendChild(libelle);
      types.forEach(function (t) {
        var td = el("td"), i = champNombreSigne(el("input", "pc-num"));
        var valeur = combatMod(k, t, base);
        valeur = base === 1 ? bonusDuFacteur(valeur) : valeur - base;
        i.value = valeur === 0 ? "" : valeur;
        i.setAttribute("aria-label", titre + " " + combatLibType(t) + (ligne[4] ? " (%)" : ""));
        i.addEventListener("input", function () {
          var n = i.value.trim() ? litNombreSigne(i.value) : 0;
          if (!isFinite(n)) return;
          var groupe = state.combatModifiers[k] || (state.combatModifiers[k] = {});
          if (!i.value.trim()) delete groupe[t];
          else groupe[t] = base + n;
          save();
        });
        i.addEventListener("change", function () { refresh(); });
        td.appendChild(i);
        row.appendChild(td);
      });
      table.appendChild(row);
    });
    wrap.appendChild(table);
    detail.appendChild(wrap); card.appendChild(detail); return card;
  }
  function combatOptionsPaires(data, premiere, seconde) {
    var options = el("div", "pc-combat-ressources");
    var haut = el("div", "pc-segs"), bas = el("div", "pc-segs");
    haut.appendChild(premiere);
    haut.appendChild(seconde);
    bas.appendChild(combatRessource(data, "utiliseRessources", "Consommation Ressource"));
    options.appendChild(haut);
    options.appendChild(bas);
    return options;
  }
  // Protection d'abord, pourcentage ensuite ; arrondi une seule fois, à la fin.
  // Borner chaque étape empêche deux valeurs négatives de produire des dégâts.
  function combatDegats(d, p, r) {
    return Math.max(0, Math.floor(Math.max(0, d - p) * Math.max(0, 1 - r / 100) + 1e-9));
  }
  function defenseArme(ref) {
    // Comme les attaques : une arme reste utilisable tant qu’elle se trouve
    // dans l’inventaire, y compris à terre ou dans un contenant.
    var objets = state.inv && Array.isArray(state.inv.objets) ? state.inv.objets : [];
    return objets.filter(function (o) {
      return o && o.arme && String(o.ref) === String(ref);
    })[0] || null;
  }
  function defenseValeurs(entree) {
    var item = entree && entree.arme ? defenseArme(entree.arme) : null;
    var a = entree && entree.personnalisee || item && item.arme;
    var flat = snum(a && a.reduction);
    (a && a.modsParade || []).slice(0, 3).forEach(function (c) { if (c) flat += Math.floor(caracTotal(c) / 5); });
    return { item: item, protection: flat, difficulte: Math.max(1, snum(a && a.parade) + effetBonus("parade")), comp: a && a.comp || "" };
  }
  function defenseTotaux(type, defense, reussie) {
    var p = 0, r = 0, portes = equipementsPortes().filter(function (o) { return pnum(o.qte) > 0; });
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
    if (["feu","froid","eclair","decomposition","ethere"].indexOf(type)>=0) p += effetBonus("barriere");
    r += combatMod("resistances",type) + effetBonus("resistances",type) - 5*effetAlerte();
    if(effetBonus("immunites",type)>=100)r=Math.max(100,r);
    return {protection:p,reduction:r};
  }
  function defensePrompt(nom, mode, entree, recus) {
    var body = el("div", "pc-modal-body pc-defense-form"), inputs = {};
    combatTypes().forEach(function (t) {
      var input = el("input", "n"); input.type = "text"; input.inputMode = "decimal";
      input.value = String(recus && recus[t] || 0); input.setAttribute("aria-label", "Dégâts " + combatLibType(t));
      inputs[t] = input; body.appendChild(fld(combatLibType(t), input));
    });
    dialogue(nom, body, function () {
      var valeurs = {}, invalide = null;
      combatTypes().forEach(function (t) {
        var raw = inputs[t].value.trim(), n = Number(raw.replace(",", "."));
        if (raw && (!isFinite(n) || n < 0)) invalide = inputs[t];
        valeurs[t] = raw ? n : 0;
      });
      if (invalide) { flash("Saisissez des dégâts positifs ou nuls."); invalide.focus(); return false; }
      if (mode === "parade" && entree.arme && !defenseArme(entree.arme)) { flash("Cette arme n’est plus disponible."); return false; }
      var v = defenseValeurs(entree), subis = 0, champs = [], finaux = [];
      combatTypes().forEach(function (t) {
        var brut = valeurs[t];
        if (!brut) return;
        var totaux = defenseTotaux(t, mode === "parade" ? v : null, true);
        var n = mode === "esquive" ? 0 : combatDegats(brut, totaux.protection, totaux.reduction);
        subis += n; finaux.push({type:t, valeur:n});
        champs.push(["Reçus · " + combatLibType(t), fmtP(brut)]);
        champs.push(["Protection · " + combatLibType(t), fmtP(totaux.protection)]);
        champs.push(["Résistance · " + combatLibType(t), fmtP(totaux.reduction) + " %"]);
        champs.push(["Subis · " + combatLibType(t), fmtP(n)]);
      });
      champs.push(["Dégâts subis", fmtP(subis)]);
      var cout = mode === "esquive" ? 8 : mode === "sans" ? 0 : v.difficulte;
      var difficulte = mode === "esquive" ? Math.max(1,8-effetAlerte()) : cout;
      var comp = compDe(mode === "esquive" ? entree.comp : v.comp);
      if (mode !== "sans") {
        champs.push(["Difficulté", fmtP(difficulte)]);
        if (comp) champs.push(["Compétence", comp.nom || "Compétence"]);
        if (state.combatOptions.defenses.utiliseRessources && !state.combatOptions.defenses.lente) {
          state.etat.pe = (courant("pe") - effetCout("pe",cout));
          champs.push(["Endurance", "−" + fmtP(effetCout("pe",cout))]);
        }
      }
      if (state.combatOptions.defenses.degatsAuto && subis > 0) state.etat.pv = (courant("pv") - subis);
      refresh(); sayChat(nom, champs, {kind:"defense", final:finaux, total:subis});
    }, "Valider");
  }
  function defenseDepuisChat(payload) {
    var data;
    try { if (typeof payload !== "string" || payload.length > 16000) return; data = JSON.parse(b64decode(payload)); } catch (e) { return; }
    if (!data || data.v !== 1 || data.kind !== "attack") return;
    function valide(liste) {
      var vus = {};
      return Array.isArray(liste) && liste.length <= 7 && liste.every(function (d) {
        if (!d || combatTypes().indexOf(d.type) < 0 || vus[d.type] || typeof d.valeur !== "number" || !isFinite(d.valeur) || d.valeur < 0) return false;
        vus[d.type] = true; return true;
      });
    }
    if (!valide(data.hit) || !valide(data.pass)) return;
    var body = el("div", "pc-modal-body"), zone = el("select", "pc-select"), choix = el("select", "pc-select");
    [["hit", "Touche"], ["pass", "Passe"]].forEach(function (a) { var op = el("option", null, a[1]); op.value = a[0]; zone.appendChild(op); });
    zone.setAttribute("aria-label", "Dégâts à défendre");
    var defenses = [{nom:"Sans Défense", mode:"sans", entree:null}, {nom:"Esquive", mode:"esquive", entree:state.defenses.esquive}];
    state.defenses.entrees.forEach(function (e) {
      var item = defenseArme(e.arme);
      if (!e.personnalisee && !item) return;
      defenses.push({nom:e.nom || (item ? "Parade — " + item.nom : "Défense personnalisée"), mode:"parade", entree:e});
    });
    defenses.forEach(function (d, i) { var op = el("option", null, d.nom); op.value = String(i); choix.appendChild(op); });
    choix.setAttribute("aria-label", "Défense");
    body.appendChild(fld("Dégâts à défendre", zone)); body.appendChild(fld("Défense", choix));
    dialogue("Se défendre — " + (state.name || "Sans nom"), body, function () {
      var d = defenses[Number(choix.value)], recus = {};
      if (!d) return false;
      data[zone.value === "pass" ? "pass" : "hit"].forEach(function (x) { recus[x.type] = x.valeur; });
      // Le premier dialogue doit être fermé avant de monter le formulaire.
      setTimeout(function () { defensePrompt(d.nom, d.mode, d.entree, recus); }, 0);
    }, "Continuer");
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
  function iconeDegats(type) {
    var img = el("img", "pc-attaque-icone-degats");
    img.src = siteBase() + "assets/owd/combat/damage-" + type + ".png";
    img.alt = combatLibType(type);
    img.title = img.alt;
    return img;
  }

  function iconeCombat(fichier, libelle, repli) {
    var img = el("img", "pc-attaque-icone-degats");
    img.alt = img.title = libelle;
    img.addEventListener("error", function () { img.replaceWith(el("span", null, repli)); });
    img.src = siteBase() + "assets/owd/combat/" + fichier + ".png";
    return img;
  }

  function resumeCombat(difficulte, couts) {
    var resume = el("span", "pc-attaque-resume");
    var valeurs = [["vitesse-attaque", difficulte, "Difficulté", "Diff."]].concat(couts);
    valeurs.forEach(function (v, index) {
      if (index === 0 ? v[1] == null : !(v[1] > 0)) return;
      var groupe = el("span", "pc-attaque-bilan-type");
      groupe.appendChild(iconeCombat(v[0], v[2], v[3]));
      groupe.appendChild(el("span", null, fmtP(v[1])));
      resume.appendChild(groupe);
    });
    return resume.firstChild ? resume : "";
  }
  function combatCarteTete(card, nom, resume, ouvert, module, id, toggle, liste, visibilite) {
    var ligne = el("div", "pc-combat-tete");
    var tete = el("button", "pc-attaque-tete" + (module === "defense" ? " pc-defense-tete" : "")); tete.type = "button";
    tete.setAttribute("aria-expanded", String(ouvert));
    tete.appendChild(el("span", "pc-attaque-nom", nom));
    if (typeof resume === "string") tete.appendChild(el("span", "pc-attaque-meta", resume));
    else {
      var meta = el("span", "pc-attaque-meta pc-attaque-meta-icons");
      meta.appendChild(resume);
      tete.appendChild(meta);
    }
    tete.addEventListener("click", toggle); ligne.appendChild(tete);
    var outils = el("div", "pc-combat-outils");
    if (liste) {
      var drag = el("span", "pc-combat-poignee pc-combat-drag pc-edit-only", "⠿"); drag.title = "Déplacer"; drag.setAttribute("aria-label", "Déplacer " + nom); drag.draggable = true;
      drag.addEventListener("dragstart", function (ev) {
        if (!isEdit(module)) { ev.preventDefault(); return; }
        combatDrag = { module: module, id: id }; ev.dataTransfer.setData("text/plain", id); ev.dataTransfer.effectAllowed = "move"; card.classList.add("pc-combat-pris");
      });
      drag.addEventListener("dragend", function () { combatDrag = null; card.classList.remove("pc-combat-pris"); });
      ligne.insertBefore(drag, tete);
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
      var commandes = el("div", "pc-segs pc-combat-action");
      var btn = el("button", "c pc-action pc-attaque-simple pc-defense-bouton", "Se défendre");
      btn.type = "button";
      btn.addEventListener("click", function () { defensePrompt(nom, mode, entree); });
      commandes.appendChild(btn);
      return commandes;
    }
    function details(card, nom, mode, entree, id) {
      var ouvert = !!defenseVue.ouverts[id], v = defenseValeurs(entree);
      var cout = mode === "esquive" ? 8 : mode === "sans" ? 0 : v.difficulte;
      var difficulte = mode === "esquive" ? Math.max(1, 8 - effetAlerte()) : mode === "sans" ? null : v.difficulte;
      var resume = resumeCombat(difficulte, [["pe", state.combatOptions.defenses.lente ? 0 : cout, "Endurance", "PE"]]);
      var cleVisibilite = mode === "sans" ? "defenseSans" : mode === "esquive" ? "defenseEsquive" : "";
      var visible = !cleVisibilite || state.combatAffichage[cleVisibilite] !== false;
      combatCarteTete(card, nom, resume, ouvert, "defense", id,
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
        if (totaux.protection === 0 && totaux.reduction === 0) return;
        var row = el("tr"); row.dataset.damageType = t;
        row.appendChild(el("td", null, combatLibType(t)));
        row.appendChild(el("td", "pc-defense-protection", (totaux.protection !== 0 ? fmtP(totaux.protection) : "")));
        row.appendChild(el("td", "pc-defense-resistance", (totaux.reduction !== 0 ? fmtP(totaux.reduction) + " %" : ""))); table.appendChild(row);
      });
      if (table.querySelector("td")) detail.appendChild(table); detail.appendChild(bouton(nom, mode, entree)); card.appendChild(detail);
    }
    function rendre() {
      box.innerHTML = "";
      var options = state.combatOptions.defenses;
      var lente = combatRessource(options, "lente", "Défense Lente");
      var degatsAuto = combatRessource(options, "degatsAuto", "Dégâts Automatiques");
      degatsAuto.title = "Déduire automatiquement les dégâts finaux des PV après validation d’une défense";
      box.appendChild(combatOptionsPaires(options, lente, degatsAuto));
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
        var opt = el("option", null, "Choisir une arme"); opt.value = ""; sel.appendChild(opt);
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
            var sm = el("select", "pc-select pc-edit-field"), empty = el("option", null, "Aucun"); empty.value = ""; sm.appendChild(empty);
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
