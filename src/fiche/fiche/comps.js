  // ---- 8. Compétences ----
  // LES RÈGLES NE DONNENT AUCUNE LISTE DE COMPÉTENCES : le joueur nomme les
  // siennes, et la fiche n'en propose pas — une liste d'exemples passerait pour
  // une règle du livre alors qu'elle n'y est pas. D'où un tableau d'entrées à
  // id stable, un champ « groupe » libre pour que chacun range comme il veut,
  // et des groupes repliables dont l’ordre vient de ce même tableau.
  function xpJusque(r) {
    var t = 0, tab = rangs(), i;
    for (i = 1; i <= r && i < tab.length; i++) t += num(tab[i].xp, 0);
    return t;
  }
  function ruptureJusque(r) {
    var t = 0, tab = rangs(), i;
    for (i = 1; i <= r && i < tab.length; i++) t += num(tab[i].rupture, 0);
    return t;
  }
  // La ligne d'une compétence. opts : { module, reg, onDrop } — le module dont
  // le rouage déverrouille la barre de rangs, le registre où la ligne
  // s'inscrit (celui du module qui la reconstruit, sinon ses hooks fuiraient),
  // et le rappel de reconstruction.
  function compRow(item, odd, opts) {
    opts = opts || {};
    var mod = opts.module || "comps";
    var reg = opts.reg || compHooks;
    var row = el("div", "pc-comp-row" + (odd ? " odd" : ""));
    row.dataset.id = item.id;

    var nameBox = el("span", "pc-comp-name");
    var label = el("span", "pc-comp-label", item.nom || "Sans nom");
    if (mod === "comps") nameBox.appendChild(poigneeComp("Déplacer la compétence", function () {
      return { type: "comp", id: item.id };
    }, row));
    nameBox.appendChild(label);
    // RENOMMAGE EN PLACE, au double-clic, en édition seulement. Jamais
    // prompt() : muet dans l'iframe Roll20 sous Chrome. Le renommage ne touche
    // PAS l'id — rang, modificateurs, forçages et les armes qui pointent dessus
    // survivent tous.
    label.addEventListener("dblclick", function () {
      if (!isEdit(mod)) return;
      var inp = el("input", "nmedit");
      inp.type = "text";
      inp.value = item.nom;
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); inp.blur(); }
        else if (e.key === "Escape") { inp.value = item.nom; inp.blur(); }
      });
      inp.addEventListener("blur", function () {
        var v = capFirst(inp.value.trim());
        if (v) item.nom = v;
        if (inp.parentNode) inp.parentNode.replaceChild(label, inp);
        refresh();
        if (opts.onDrop) opts.onDrop();
        if (optCompsRebuild) optCompsRebuild();
      });
      nameBox.replaceChild(inp, label);
      setTimeout(function () { inp.focus(); inp.select(); }, 0);
    });
    var del = el("button", "pc-comp-del pc-edit-only", "✕");
    del.type = "button";
    del.title = "Retirer cette compétence";
    del.addEventListener("click", function () {
      // LISTER ce qui sera perdu : la ligne ne montre ni les modificateurs, ni
      // le point de rupture d'un Rang Max, ni les armes qui s'en servent.
      var perdu = [];
      if (compRang(item) > 0) perdu.push(fmtP(compXp(item)) + " XP investis");
      if (compRupture(item) > 0) perdu.push(fmtP(compRupture(item)) + " point de rupture");
      if (levierRegleDe(lireComp("bonus", item.id)) || levierRegleDe(lireComp("des", item.id)))
        perdu.push("ses leviers (Options)");
      var armes = state.inv.objets.filter(function (o) { return o.arme && o.arme.comp === item.id; });
      if (armes.length) perdu.push("le lien de " + armes.length + (armes.length > 1 ? " armes" : " arme"));
      function retire() {
        state.comps = state.comps.filter(function (c) { return c.id !== item.id; });
        // Les réglages actuels sont rangés par levier, boîte puis compétence.
        // Ne pas toucher aux réglages des autres compétences.
        Object.keys(state.compsLeviers || {}).forEach(function (nom) {
          var boites = state.compsLeviers[nom];
          Object.keys(boites).forEach(function (boite) {
            delete boites[boite][item.id];
            if (!Object.keys(boites[boite]).length) delete boites[boite];
          });
          if (!Object.keys(boites).length) delete state.compsLeviers[nom];
        });
        // Compatibilité avec un ancien import, sans exiger ces tables disparues.
        ["compsMod", "compsMod2", "compsForce", "compsDesForce"].forEach(function (k) {
          if (state[k]) delete state[k][item.id];
        });
        state.inv.objets.forEach(function (o) { if (o.arme && o.arme.comp === item.id) o.arme.comp = ""; });
        refresh();
        if (opts.onDrop) opts.onDrop();
        rebuildComps();
        if (optCompsRebuild) optCompsRebuild();
      }
      if (!perdu.length) { retire(); return; }
      confirmer("Retirer une compétence",
                "Supprimer « " + (item.nom || "sans nom") + " » effacera aussi " + perdu.join(", ") + ".",
                "Supprimer", retire);
    });
    row.appendChild(nameBox);
    var rangBox = el("span", "pc-comp-rangs");
    rangBox.appendChild(del);

    // LA BARRE DE RANGS : un cran par rang, du non-initié au Rang Max. Le
    // dégradé monte avec le rang ; l'infobulle porte le rang COMPLET (dés,
    // bonus, prix), qui est la seule forme sous laquelle un barème paraît.
    function applyRang(cible) {
      var c = compDe(item.id);
      if (!c || cible === compRang(c)) return;
      // Les rangs offerts ne coûtent pas d’XP.
      var off = compOffertsBrut(c);
      var deltaXp = xpJusque(Math.max(cible, off)) - xpJusque(Math.max(compRang(c), off));
      var deltaRup = ruptureJusque(cible) - ruptureJusque(compRang(c));
      if (deltaXp > 0 && xpRestant() < deltaXp) { flash("XP insuffisant."); return; }
      if (deltaRup > 0 && ruptureRestante() < deltaRup) { flash("Aucun point de rupture disponible."); return; }
      // REDESCENDRE REND l'XP et le point de rupture, et DESCENDRE AU RANG 0 NE
      // SUPPRIME PAS L'ENTRÉE : ici l'entrée EST la compétence que le joueur a
      // nommée, la perdre effacerait son travail.
      c.rang = cible;
      refresh();
    }
    var bar = el("span", "pc-stadebar");
    var segs = [];
    rangs().forEach(function (r, i) {
      var sg = el("button", "seg s" + i, rangInitiale(r));
      sg.type = "button";
      sg.title = rangTitre(r);
      sg.addEventListener("click", function () {
        if (!isEdit(mod)) return;   // construction : mode édition requis
        applyRang(i);
      });
      bar.appendChild(sg);
      segs.push(sg);
    });
    rangBox.appendChild(bar);
    row.appendChild(rangBox);

    // Le total est un BOUTON de jet : c'est le bonus de rang plus les
    // modificateurs, et le clic lance les dés d'action que le rang autorise.
    var total = el("button", "pc-comp-total pc-comp-roll pc-rollable", "");
    total.type = "button";
    total.addEventListener("click", function () {
      var c = compDe(item.id) || item;
      var n = compDes(c);
      doRoll(c.nom || "Compétence", compBonus(c), deDe(n), true, n);
    });
    row.appendChild(total);

    if (mod === "comps") cibleComp(row, function (e) {
      if (dragComp.type !== "comp" || dragComp.id === item.id) return false;
      return e.clientY < row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2 ? "avant" : "apres";
    }, function (e, position) {
      deplaceComp(dragComp.id, item.id, position === "avant");
    });

    reg.push(function () {
      var c = compDe(item.id) || item;
      var rang = compRang(c);
      var regle = levierRegleDe(lireComp("bonus", c.id));
      var desRegle = levierRegleDe(lireComp("des", c.id));
      segs.forEach(function (sg, i) {
        sg.classList.toggle("on", i <= rang);
        // « cur » MARQUE le rang courant et n'a AUCUNE règle de style : c'est
        // un REPÈRE lisible de l'extérieur, pas une décoration. Un audit l'a
        // retirée en JJK pour cette raison, et quatre sondes sont tombées. Une
        // marque sans peinture reste une marque.
        sg.classList.toggle("cur", i === rang);
      });
      var b = compBonus(c), n = compDes(c);
      total.textContent = sign(b);
      total.classList.toggle("zero", !rang && !regle);
      total.classList.toggle("adj", regle || desRegle);
      var info = rangInfo(rang);
      total.title = chaineTexteDe(lireComp("bonus", c.id),
                                  "rang " + rang + " (" + (info.nom || "?") + ")",
                                  sign(num(info.bonus, 0))) +
        (regle ? " = " + sign(b) : "") +
        (desRegle ? " · dés " + n : "") +
        " — clic : lancer " + deDe(n) + " " + sign(b);
      label.title = (c.nom || "Sans nom") + " · rang " + rang +
                    (info.nom ? " (" + info.nom + ")" : "") +
                    " · " + (compGroupe(c) || "sans groupe");
    });
    return row;
  }
  // Le repli est local à cette fiche ouverte ; aucun attribut de personnage.
  var compReplies = Object.create(null);
  var dragComp = null;
  function finDragComp() {
    dragComp = null;
    if (!compBox) return;
    Array.prototype.forEach.call(compBox.querySelectorAll(".pris, .avant, .apres, .depot"), function (n) {
      ["pris", "avant", "apres", "depot"].forEach(function (c) { n.classList.remove(c); });
    });
  }
  function poigneeComp(titre, lire, source) {
    var h = el("button", "pc-comp-drag pc-edit-only", "⠿");
    h.type = "button"; h.title = titre; h.setAttribute("aria-label", titre);
    h.draggable = true;
    h.addEventListener("dragstart", function (e) {
      e.stopPropagation();
      if (!isEdit("comps")) { e.preventDefault(); return; }
      dragComp = lire(); source.classList.add("pris");
      e.dataTransfer.setData("text/plain", "owd-competences");
      e.dataTransfer.effectAllowed = "move";
    });
    h.addEventListener("dragend", function (e) { e.stopPropagation(); finDragComp(); });
    return h;
  }
  function cibleComp(n, position, action) {
    n.addEventListener("dragover", function (e) {
      if (!isEdit("comps") || !dragComp) return;
      var p = position(e); if (!p) return;
      e.preventDefault(); e.stopPropagation();
      ["avant", "apres", "depot"].forEach(function (c) { n.classList.toggle(c, c === p); });
      e.dataTransfer.dropEffect = "move";
    });
    n.addEventListener("dragleave", function (e) {
      if (e.relatedTarget && n.contains(e.relatedTarget)) return;
      ["avant", "apres", "depot"].forEach(function (c) { n.classList.remove(c); });
    });
    n.addEventListener("drop", function (e) {
      if (!isEdit("comps") || !dragComp) return;
      var p = position(e); if (!p) return;
      e.preventDefault(); e.stopPropagation();
      action(e, p); finDragComp(); rebuildComps();
      if (optCompsRebuild) optCompsRebuild();
    });
  }
  function groupesComps() {
    var ordre = [];
    state.comps.forEach(function (c) { var g = compGroupe(c); if (ordre.indexOf(g) < 0) ordre.push(g); });
    return ordre;
  }
  function deplaceComp(id, cibleId, avant) {
    var m = compDeDans(state.comps, id), cible = compDeDans(state.comps, cibleId);
    if (!m || !cible || m === cible) return;
    m.groupe = compGroupe(cible);
    state.comps.splice(state.comps.indexOf(m), 1);
    var k = state.comps.indexOf(cible);
    state.comps.splice(avant ? k : k + 1, 0, m);
    save();
  }
  function compVersGroupe(id, groupe) {
    var m = compDeDans(state.comps, id); if (!m || compGroupe(m) === groupe) return;
    state.comps.splice(state.comps.indexOf(m), 1);
    m.groupe = groupe;
    var k = state.comps.length;
    state.comps.forEach(function (c, i) { if (compGroupe(c) === groupe) k = i + 1; });
    state.comps.splice(k, 0, m); save();
  }
  function deplaceGroupe(groupe, cible, avant) {
    var ordre = groupesComps(), from = ordre.indexOf(groupe);
    if (groupe === cible || from < 0 || ordre.indexOf(cible) < 0) return;
    ordre.splice(from, 1); ordre.splice(ordre.indexOf(cible) + (avant ? 0 : 1), 0, groupe);
    var resultat = [];
    ordre.forEach(function (g) { state.comps.forEach(function (c) { if (compGroupe(c) === g) resultat.push(c); }); });
    state.comps = resultat; save();
  }
  function compDeDans(liste, id) {
    var out = null;
    liste.forEach(function (c) { if (c.id === id) out = c; });
    return out;
  }

  var compBox = null;
  var compSearch = null, compInvestiesChip = null;
  var compFilter = "";
  var compOnly = false;      // « Investies » : éteinte par défaut — l'auteur veut TOUT voir
  // L'outil de recherche se coupe depuis l'onglet Options. Coupé, il DISPARAÎT
  // et cesse d'agir : un filtre invisible qui masque encore des lignes est un
  // piège. Réglage d'AFFICHAGE, donc dans le vrai localStorage du navigateur,
  // jamais dans le personnage.
  var FILTRES = { texte: "owd-filtre-texte" };
  function filtreTexteOn() { return lpref(FILTRES.texte, "1") !== "0"; }
  function champFiltre(get, set, placeholder, onChange) {
    if (!filtreTexteOn()) return null;
    var s = el("input", "pc-comp-search");
    s.type = "search";
    s.placeholder = placeholder || "Filtrer…";
    s.value = get();   // le filtre survit au remontage : le champ doit le montrer
    s.addEventListener("input", function () { set(s.value); onChange(); });
    return s;
  }
  function filtreDe(v) { return filtreTexteOn() ? pli(v) : ""; }

  function rebuildComps() {
    if (!compBox) return;
    if (compSearch) compSearch.value = compFilter;
    if (compInvestiesChip) compInvestiesChip.classList.toggle("on", compOnly);
    compHooks = [];   // les lignes vont être détruites : leurs hooks avec
    compBox.innerHTML = "";
    var head = el("div", "pc-comp-row head");
    head.appendChild(el("span", null, "Compétence"));
    head.appendChild(el("span", "pc-comp-rang-head", "Rang"));
    head.appendChild(el("span", null, "Total"));
    compBox.appendChild(head);
    var flt = filtreDe(compFilter);
    var liste = state.comps.filter(function (c) {
      if (compOnly && !compInvestie(c)) return false;
      if (flt && pli(c.nom).indexOf(flt) < 0 && pli(c.groupe).indexOf(flt) < 0) return false;
      return true;
    });
    if (!liste.length) {
      // le message NOMME le filtre coupable : sans cela, le joueur cherche une
      // compétence qu'il a bien saisie et qu'un réglage masque
      compBox.appendChild(el("div", "pc-empty",
        !state.comps.length
          ? (isEdit("comps") ? "Aucune compétence : la ligne du bas en ajoute."
                             : "Aucune compétence. Le rouage en ajoute.")
          : flt ? "Aucune compétence ne correspond à la recherche."
                : "Aucune compétence investie : la puce « Investies » masque les autres."));
    } else {
      // Par GROUPE, dans l'ordre où les groupes apparaissent : c'est le
      // rangement du joueur, la fiche n'en impose aucun et n'en trie aucun.
      groupesComps().forEach(function (g) {
        var visibles = liste.filter(function (c) { return compGroupe(c) === g; });
        if (!visibles.length) return;
        var groupe = el("section", "pc-comp-groupe"); groupe.dataset.groupe = g;
        var titre = el("div", "pc-comp-champ");
        titre.appendChild(poigneeComp("Déplacer le groupe", function () { return { type: "groupe", groupe: g }; }, groupe));
        titre.appendChild(el("span", "pc-comp-groupe-nom", g || "Sans groupe"));
        var bouton = el("button", "pc-comp-repli", compReplies[g] ? "▸" : "▾");
        bouton.type = "button";
        bouton.setAttribute("aria-expanded", String(!compReplies[g]));
        bouton.setAttribute("aria-label", (compReplies[g] ? "Déplier " : "Replier ") + (g || "Sans groupe"));
        var toggle = function () { compReplies[g] = !compReplies[g]; rebuildComps(); };
        bouton.addEventListener("click", function (e) { e.stopPropagation(); toggle(); });
        titre.addEventListener("dblclick", function (e) {
          if (e.target.closest("button")) return;
          e.preventDefault(); toggle();
        });
        titre.appendChild(bouton); groupe.appendChild(titre);
        cibleComp(titre, function (e) {
          if (dragComp.type === "comp") return "depot";
          if (dragComp.groupe === g) return false;
          var r = titre.getBoundingClientRect(); return e.clientY < r.top + r.height / 2 ? "avant" : "apres";
        }, function (e, p) {
          if (dragComp.type === "comp") compVersGroupe(dragComp.id, g);
          else deplaceGroupe(dragComp.groupe, g, p === "avant");
        });
        // Toute la surface du groupe reçoit un groupe déplacé, y compris replié.
        cibleComp(groupe, function (e) {
          if (dragComp.type !== "groupe" || dragComp.groupe === g) return false;
          var r = groupe.getBoundingClientRect(); return e.clientY < r.top + r.height / 2 ? "avant" : "apres";
        }, function (e, p) { deplaceGroupe(dragComp.groupe, g, p === "avant"); });
        if (!compReplies[g]) visibles.forEach(function (c, i) {
          groupe.appendChild(compRow(c, i % 2 === 1, { module: "comps", reg: compHooks }));
        });
        compBox.appendChild(groupe);
      });
    }
    if (isEdit("comps") && groupesComps().indexOf("") < 0 && state.comps.length) {
      var libre = el("div", "pc-comp-sans-groupe", "Déposer ici pour retirer le groupe");
      cibleComp(libre, function () { return dragComp.type === "comp" ? "depot" : false; },
        function () { compVersGroupe(dragComp.id, ""); });
      compBox.appendChild(libre);
    }
    // AJOUT, en édition seulement : un nom, un groupe, et c'est tout.
    if (isEdit("comps")) {
      var add = el("div", "pc-comp-add");
      var nom = el("input");
      nom.type = "text"; nom.placeholder = "Nouvelle compétence…";
      var grp = el("select", "pc-select"); grp.setAttribute("aria-label", "Groupe de la nouvelle compétence");
      var choix = el("option", null, "Sans groupe"); choix.value = "sans"; grp.appendChild(choix);
      var existants = groupesComps().filter(function (g) { return g !== ""; });
      existants.forEach(function (g, i) { var o = el("option", null, g); o.value = "g" + i; grp.appendChild(o); });
      var nouveau = el("option", null, "Nouveau groupe…"); nouveau.value = "nouveau"; grp.appendChild(nouveau);
      var nouveauNom = el("input"); nouveauNom.type = "text";
      nouveauNom.placeholder = "Nom du nouveau groupe"; nouveauNom.setAttribute("aria-label", "Nom du nouveau groupe");
      nouveauNom.hidden = true;
      grp.addEventListener("change", function () { nouveauNom.hidden = grp.value !== "nouveau"; if (!nouveauNom.hidden) nouveauNom.focus(); });
      add.appendChild(nom);
      add.appendChild(grp);
      add.appendChild(nouveauNom);
      // Une EXPRESSION de fonction, pas une déclaration : une déclaration dans
      // un bloc est refusée par le mode strict d'ES5, que le vieux moteur d'une
      // iframe Roll20 peut encore appliquer à la lettre.
      var ajoute = function () {
        var n = capFirst(nom.value.trim());
        if (!n) return;
        // refus d'un doublon, insensible à la casse ET aux accents
        var doublon = false;
        state.comps.forEach(function (c) { if (pli(c.nom) === pli(n)) doublon = true; });
        if (doublon) { flash("« " + n + " » existe déjà."); return; }
        var g = grp.value === "nouveau" ? nouveauNom.value.trim() : grp.value === "sans" ? "" : existants[Number(grp.value.slice(1))];
        if (grp.value === "nouveau" && !g) { nouveauNom.focus(); return; }
        state.comps.push({ id: uid("c"), nom: n, groupe: g, rang: 0 });
        compReplies[g] = false;
        nom.value = "";
        // ne jamais ajouter une compétence qui resterait invisible
        if (compOnly) compOnly = false;
        if (filtreDe(compFilter)) compFilter = "";
        refresh();
        rebuildComps();
        if (optCompsRebuild) optCompsRebuild();
      };
      nom.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); ajoute(); } });
      nouveauNom.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); ajoute(); } });
      add.appendChild(miniBtn("+", "Ajouter cette compétence", ajoute));
      compBox.appendChild(add);
    }
    refresh();
  }
  function buildComps() {
    var b = block("Compétences", null, "comps", function () { rebuildComps(); });
    var tools = el("div", "pc-comp-tools");
    var l1 = el("div", "row");
    var search = champFiltre(function () { return compFilter; },
                             function (v) { compFilter = v; }, "Filtrer les compétences…", rebuildComps);
    compSearch = search;
    if (search) l1.appendChild(search);
    // LE FILTRE ET LA PUCE SUR UNE MÊME LIGNE, à parts égales : la rangée est
    // une grille à colonnes 1fr, chacun y prend sa moitié
    var puce = el("span", "pc-chip", "Investies");
    puce.setAttribute("data-consultation","1");
    compInvestiesChip = puce;
    puce.title = "N'afficher que les compétences où un rang, un modificateur ou un forçage est posé.";
    puce.classList.toggle("on", compOnly);
    puce.addEventListener("click", function () {
      compOnly = !compOnly;
      puce.classList.toggle("on", compOnly);
      rebuildComps();
    });
    l1.appendChild(puce);
    tools.appendChild(l1);
    b.appendChild(tools);
    compBox = el("div");
    b.appendChild(compBox);
    rebuildComps();
    return b;
  }

