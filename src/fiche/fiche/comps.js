  // ---- 8. Compétences ----
  // LES RÈGLES NE DONNENT AUCUNE LISTE DE COMPÉTENCES : le joueur nomme les
  // siennes, et la fiche n'en propose pas — une liste d'exemples passerait pour
  // une règle du livre alors qu'elle n'y est pas. D'où un tableau d'entrées à
  // id stable, un champ « groupe » libre pour que chacun range comme il veut,
  // et un bloc qui montre TOUT d'un coup, sans repli ni troncature.
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
        ["compsMod", "compsMod2", "compsForce", "compsDesForce"].forEach(function (k) {
          delete state[k][item.id];
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
    nameBox.appendChild(del);
    row.appendChild(nameBox);

    // LA BARRE DE RANGS : un cran par rang, du non-initié au Rang Max. Le
    // dégradé monte avec le rang ; l'infobulle porte le rang COMPLET (dés,
    // bonus, prix), qui est la seule forme sous laquelle un barème paraît.
    function applyRang(cible) {
      var c = compDe(item.id);
      if (!c || cible === compRang(c)) return;
      // Les rangs offerts ne coûtent rien et ne comptent pas dans la limite.
      var off = compOffertsBrut(c);
      var deltaXp = xpJusque(Math.max(cible, off)) - xpJusque(Math.max(compRang(c), off));
      var deltaRup = ruptureJusque(cible) - ruptureJusque(compRang(c));
      var lim = limiteRangs("competences");
      if (lim !== null && cible > compRang(c) &&
          compRangsComptes() + rangsComptesEntre(compRang(c), cible, off) > lim) {
        flash("Limite de rangs de compétence atteinte."); return;
      }
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
    row.appendChild(bar);

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

    // RÉORDONNANCEMENT par glisser-déposer natif : l'ordre du tableau EST
    // l'ordre d'affichage dans son groupe.
    row.draggable = true;
    row.addEventListener("dragstart", function (e) {
      if (!isEdit(mod)) { e.preventDefault(); return; }
      dragComp = item.id;
      row.classList.add("pris");
      // Firefox refuse de commencer un glissement sans donnée posée
      try { e.dataTransfer.setData("text/plain", item.id); e.dataTransfer.effectAllowed = "move"; }
      catch (err) {}
    });
    row.addEventListener("dragend", function () {
      dragComp = null;
      row.classList.remove("pris");
      row.classList.remove("avant");
    });
    row.addEventListener("dragover", function (e) {
      if (!dragComp || dragComp === item.id) return;
      e.preventDefault();          // sans lui, le navigateur refuse le dépôt
      var r = row.getBoundingClientRect();
      row.classList.toggle("avant", e.clientY < r.top + r.height / 2);
    });
    row.addEventListener("dragleave", function () { row.classList.remove("avant"); });
    row.addEventListener("drop", function (e) {
      if (!dragComp || dragComp === item.id) return;
      e.preventDefault();
      var r = row.getBoundingClientRect();
      var avant = e.clientY < r.top + r.height / 2;   // moitié haute = « avant elle »
      deplaceComp(dragComp, item.id, avant);
      dragComp = null;
      row.classList.remove("avant");
      if (opts.onDrop) opts.onDrop();
      else rebuildComps();
      if (optCompsRebuild) optCompsRebuild();
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
  var dragComp = null;   // l'id de la compétence qu'on tient
  // Déplacer une compétence devant (ou derrière) une autre. L'ordre du tableau
  // EST l'ordre d'affichage : il n'y a rien d'autre à écrire.
  function deplaceComp(id, cibleId, avant) {
    var from = -1, to = -1, i;
    for (i = 0; i < state.comps.length; i++) {
      if (state.comps[i].id === id) from = i;
      if (state.comps[i].id === cibleId) to = i;
    }
    if (from < 0 || to < 0) return;
    var m = state.comps.splice(from, 1)[0];
    // la cible se recalcule APRÈS le retrait : retirer l'entrée déplacée décale
    // tout ce qui la suivait
    var k = state.comps.indexOf(compDeDans(state.comps, cibleId));
    if (k < 0) state.comps.push(m);
    else state.comps.splice(avant ? k : k + 1, 0, m);
    save();
  }
  function compDeDans(liste, id) {
    var out = null;
    liste.forEach(function (c) { if (c.id === id) out = c; });
    return out;
  }

  var compBox = null;
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
    compHooks = [];   // les lignes vont être détruites : leurs hooks avec
    compBox.innerHTML = "";
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
      var ordre = [], vus = {};
      liste.forEach(function (c) {
        var g = compGroupe(c);
        if (!vus[g]) { vus[g] = 1; ordre.push(g); }
      });
      ordre.forEach(function (g) {
        compBox.appendChild(el("div", "pc-comp-champ", g || "Sans groupe"));
        var head = el("div", "pc-comp-row head");
        head.appendChild(el("span", null, "Compétence"));
        head.appendChild(el("span", null, "Rang"));
        head.appendChild(el("span", null, "Total"));
        compBox.appendChild(head);
        var i = 0;
        liste.forEach(function (c) {
          if (compGroupe(c) !== g) return;
          compBox.appendChild(compRow(c, i % 2 === 1, { module: "comps", reg: compHooks }));
          i++;
        });
      });
    }
    // AJOUT, en édition seulement : un nom, un groupe, et c'est tout.
    if (isEdit("comps")) {
      var add = el("div", "pc-comp-add");
      var nom = el("input");
      nom.type = "text"; nom.placeholder = "Nouvelle compétence…";
      var grp = el("input");
      grp.type = "text"; grp.placeholder = "Groupe (facultatif)";
      add.appendChild(nom);
      add.appendChild(grp);
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
        state.comps.push({ id: uid("c"), nom: n, groupe: grp.value.trim(), rang: 0 });
        nom.value = "";
        // ne jamais ajouter une compétence qui resterait invisible
        if (compOnly) compOnly = false;
        if (filtreDe(compFilter)) compFilter = "";
        refresh();
        rebuildComps();
        if (optCompsRebuild) optCompsRebuild();
      };
      nom.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); ajoute(); } });
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
    if (search) l1.appendChild(search);
    // LE FILTRE ET LA PUCE SUR UNE MÊME LIGNE, à parts égales : la rangée est
    // une grille à colonnes 1fr, chacun y prend sa moitié
    var puce = el("span", "pc-chip", "Investies");
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
    // La carte des compétences investies : une ligne par compétence, avec son
    // rang, ses dés et son bonus.
    var pied = el("div", "pc-comp-tools");
    var lg = el("div", "row");
    lg.appendChild(chatBtn(
      function () { return "Compétences — " + (state.name || "sans nom"); },
      function () {
        return state.comps.filter(compInvestie).map(function (c) {
          var i = rangInfo(compRang(c));
          return [c.nom || "Sans nom",
                  (i.nom || ("rang " + compRang(c))) + " · " + deDe(compDes(c)) + " " + sign(compBonus(c))];
        });
      }));
    pied.appendChild(lg);
    b.appendChild(pied);
    rebuildComps();
    return b;
  }

