  // ---- modificateurs de compétences ----
  // le pendant du bloc caractéristiques : UN modificateur par compétence
  // (équipement, art, décision du MJ confondus), appliqué au total de la
  // ligne sur la Fiche. Rebâti quand les compétences perso changent
  // (optCompsRebuild, rappelé par l'ajout et la suppression) ; optHooks
  // remplace hooks pour ces lignes, sinon chaque rebâti fuirait des hooks.
  function buildOptComps() {
    var bMC = block("Modificateurs de compétences");
    // mêmes outils que la liste de la Fiche (filtre texte, champ, puces) et
    // mêmes lignes, mais une grille plus large : nom | modificateurs | total
    // forcé | total | modificateur de coût | coût forcé | coût.
    var mcTools = el("div", "pc-comp-tools");
    var mcLine1 = el("div", "row");
    var mcSearch = champFiltre(function () { return optFilter; },
                               function (v) { optFilter = v; }, null,
                               function () { optCompsRebuild(); });
    if (mcSearch) mcLine1.appendChild(mcSearch);
    if (filtreChampOn()) {
      var mcChamp = el("select", "pc-select");
      ["Tous les champs", "Body", "Mind", "Prestance"].forEach(function (ch) {
        var o = el("option");
        o.value = ch === "Tous les champs" ? "" : ch;
        o.textContent = ch;
        mcChamp.appendChild(o);
      });
      mcChamp.value = optChamp;
      mcChamp.addEventListener("change", function () { optChamp = mcChamp.value; optCompsRebuild(); });
      mcLine1.appendChild(mcChamp);
    }
    if (mcLine1.children.length) mcTools.appendChild(mcLine1);
    var mcLine2 = el("div", "row");
    var mcPerso = el("span", "pc-chip");
    mcPerso.textContent = "Personnalisées";
    mcPerso.title = "Décoché : seules les compétences de base du jeu sont affichées.";
    mcPerso.classList.toggle("on", optPerso);
    mcPerso.addEventListener("click", function () {
      optPerso = !optPerso;
      mcPerso.classList.toggle("on", optPerso);
      optCompsRebuild();
    });
    mcLine2.appendChild(mcPerso);
    var mcOnly = el("span", "pc-chip");
    mcOnly.textContent = "Investies";
    mcOnly.title = "N'afficher que les compétences où un stade, un passif ou un modificateur est posé.";
    mcOnly.classList.toggle("on", optOnly);
    mcOnly.addEventListener("click", function () {
      optOnly = !optOnly;
      mcOnly.classList.toggle("on", optOnly);
      optCompsRebuild();
    });
    mcLine2.appendChild(mcOnly);
    mcTools.appendChild(mcLine2);
    bMC.appendChild(mcTools);
    // la grille des leviers est large : elle défile dans son cadre
    var mcWrap = el("div", "pc-optcomp-wrap");
    var mcBox = el("div");
    mcWrap.appendChild(mcBox);
    bMC.appendChild(mcWrap);
    // Modificateur d'une ligne de compétence : un champ NU, sans − ni +. Sur
    // cinquante lignes de sept colonnes, les boutons mangeaient la place et
    // n'apportaient rien qu'on ne fasse au clavier. Les caractéristiques,
    // elles, gardent leurs boutons : elles ne sont que trois.
    function modField(map, key, borne, titre) {
      var inp = el("input", "pc-num modif");
      inp.type = "number"; inp.step = String(MOD_PAS);
      inp.title = titre;
      inp.addEventListener("input", function () {
        var v = parseFloat(inp.value);
        if (isFinite(v) && clamp(Math.round(v), -borne, borne)) map[key] = clamp(Math.round(v), -borne, borne);
        else delete map[key];   // vide ou zéro = pas d'entrée dans l'état
        refresh();
      });
      optHooks.push(function () {
        if (document.activeElement !== inp) inp.value = map[key] === undefined ? "" : map[key];
      });
      return inp;
    }
    // un champ de forçage : vide = valeur calculée, une valeur la remplace
    function forceField(map, key, auto, titre) {
      var inp = el("input", "force");
      inp.type = "number"; inp.step = "1";
      inp.title = titre;
      inp.addEventListener("input", function () {
        var v = parseFloat(inp.value);
        if (isFinite(v)) map[key] = clamp(Math.round(v), -9999, 9999);
        else delete map[key];
        refresh();
      });
      optHooks.push(function () {
        inp.placeholder = String(auto());
        if (document.activeElement !== inp) inp.value = map[key] === undefined ? "" : map[key];
      });
      return inp;
    }
    optCompsRebuild = function () {
      optHooks = [];
      mcBox.innerHTML = "";
      var flt = filtreDe(optFilter);
      var shown = 0;
      CHAMPS.forEach(function (carac) {
        if (filtreChampOn() && optChamp && optChamp !== carac) return;
        var items = allComps().filter(function (it) { return it.carac === carac; });
        if (!optPerso) items = items.filter(function (it) { return !it.custom; });
        if (flt) items = items.filter(function (it) { return it.name.toLowerCase().indexOf(flt) >= 0; });
        if (optOnly) items = items.filter(compInvestie);
        items.sort(function (a, b) { return a.name.localeCompare(b.name, "fr", { sensitivity: "base" }); });
        if (!items.length) return;
        mcBox.appendChild(el("div", "pc-comp-champ", carac));
        // Deux rangées d'entête : les groupes (valeur | coût), puis les
        // colonnes. Libellés courts — sept colonnes dans une demi-largeur ne
        // laissent pas la place aux noms complets, que portent les infobulles.
        // La colonne « rule » est un vrai filet : une colonne de la grille, en
        // place sur CHAQUE rangée, qui court d'un bord à l'autre du module.
        var grp = el("div", "pc-optcomp-row grp");
        grp.appendChild(el("span"));
        var gV = el("span", "g", "Valeur");
        gV.title = "Ce que vaut la compétence quand on la lance";
        grp.appendChild(gV);
        grp.appendChild(el("span", "rule"));
        var gX = el("span", "g", "Coût en xp");
        gX.title = "Ce que la compétence coûte sur l'xp du personnage";
        grp.appendChild(gX);
        mcBox.appendChild(grp);

        var head = el("div", "pc-optcomp-row head");
        [["Compétence", "Nom de la compétence"],
         ["Forcé", "Total forcé — vide = total calculé"],
         ["Modif.", "Deux modificateurs du total, qui s'additionnent", "duo"],
         ["Total", "Total effectif de la compétence"],
         null,
         ["Forcé", "Coût en xp forcé — vide = coût calculé"],
         ["Modif.", "Deux modificateurs du coût en xp, qui s'additionnent", "duo"],
         ["Coût", "Coût effectif en xp"]].forEach(function (h) {
          if (!h) { head.appendChild(el("span", "rule")); return; }
          var s = el("span", h[2] || null, h[0]);
          s.title = h[1];
          head.appendChild(s);
        });
        mcBox.appendChild(head);
        items.forEach(function (it, i) {
          shown++;
          var row = el("div", "pc-optcomp-row pc-mods-host" + (i % 2 === 1 ? " odd" : ""));
          var comp = function () { return state.comps[it.key] || blankComp(); };

          var nameBox = el("span", "pc-comp-name");
          var label = el("span", "pc-comp-label", it.name);
          label.title = it.name + " (" + it.carac + ")";
          nameBox.appendChild(label);
          row.appendChild(nameBox);

          // VALEUR : forcé, puis modificateur, puis le total effectif
          row.appendChild(forceField(state.compsForce, it.key,
            function () { return compValueAuto(it.carac, comp(), it.key); },
            "Total forcé — vide = total calculé (caractéristique + stade + modificateur)."));

          // DEUX champs : ils s'additionnent. Un seul obligeait à faire la
          // somme de tête avant de saisir, puis à la défaire pour retirer l'un
          // des deux apports.
          row.appendChild(modField(state.compsMod, it.key, 999,
            "Premier modificateur du total — vide = aucun."));
          row.appendChild(modField(state.compsMod2, it.key, 999,
            "Second modificateur du total — vide = aucun."));

          var tot = el("span", "pc-comp-total", "");
          row.appendChild(tot);

          // COÛT EN XP : même ordre, derrière le filet de séparation
          row.appendChild(el("span", "rule"));
          row.appendChild(forceField(state.compsXpForce, it.key,
            function () { return compXpAuto(comp(), it.key); },
            "Coût en xp forcé — vide = coût calculé (stades, passifs, art, modificateur)."));

          row.appendChild(modField(state.compsXpMod, it.key, 9999,
            "Premier modificateur du coût en xp — vide = aucun."));
          row.appendChild(modField(state.compsXpMod2, it.key, 9999,
            "Second modificateur du coût en xp — vide = aucun."));

          var cout = el("span", "pc-comp-total", "");
          row.appendChild(cout);

          optHooks.push(function () {
            var c = comp();
            var d = (state.compsMod[it.key] || 0) + (state.compsMod2[it.key] || 0);
            var force = state.compsForce[it.key];
            // même terme que la colonne Total de l'onglet Fiche : les deux
            // afficheraient sinon des chiffres différents pour une compétence
            var m = compPoidsMalus(it.carac, it.key);
            tot.textContent = sign(compValue(it.carac, c, it.key));
            tot.classList.toggle("zero", !c.stade && !d && !m && force === undefined);
            tot.classList.toggle("adj", d !== 0 || m !== 0 || force !== undefined);
            tot.title = force !== undefined
              ? "Total forcé à " + sign(force) + " (calculé : " + sign(compValueAuto(it.carac, c, it.key)) + ")"
              : it.carac + " " + sign(caracTotal(it.carac)) +
                " · stade " + sign(stadeInfo(c.stade).bonus) +
                (d ? " · modificateur " + sign(d) : "") +
                (m ? " · poids " + sign(-m) : "");

            var xForce = state.compsXpForce[it.key];
            var xm = (state.compsXpMod[it.key] || 0) + (state.compsXpMod2[it.key] || 0);
            var xp = compXp(c, it.key);
            cout.textContent = xp + " xp";
            cout.classList.toggle("zero", !xp);
            cout.classList.toggle("adj", xForce !== undefined || xm !== 0);
            cout.title = xForce !== undefined
              ? "Coût forcé à " + xForce + " xp (calculé : " + compXpAuto(c, it.key) + " xp)"
              : "Stades, passifs et art" + (xm ? " · modificateur " + sign(xm) + " xp" : "");

            // un liseré marque les lignes réglées : sur cinquante compétences,
            // c'est le seul moyen de retrouver d'un coup d'œil celles qu'on a
            // touchées
            row.classList.toggle("on",
              d !== 0 || force !== undefined || xForce !== undefined || xm !== 0);
          });
          mcBox.appendChild(row);
        });
      });
      if (!shown) {
        mcBox.appendChild(el("div", "pc-empty",
          optOnly ? "Aucune compétence investie ne correspond — décocher « Investies » pour toutes les voir."
                  : "Aucune compétence ne correspond."));
      }
      refresh();   // les lignes viennent de naître : leurs totaux se peuplent ici
    };
    optCompsRebuild();
    return bMC;
  }

