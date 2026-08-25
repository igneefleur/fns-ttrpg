  // ---- modificateurs de compétences et de spécialités ----
  // Le pendant du bloc des caractéristiques, pour les HUIT compétences des
  // règles et pour les SPÉCIALITÉS. Les deux ne se règlent pas de la même
  // façon parce qu'elles ne sont pas de la même matière : les compétences sont
  // une liste fermée, rangée par sigle dans l'état, tandis que les spécialités
  // sont créées par le joueur, portent leurs leviers sur elles-mêmes, et vont
  // et viennent. D'où le rebâti (optCompsRebuild, rappelé par le module qui
  // les ajoute et les supprime) et optHooks, qui remplace hooks pour ces
  // lignes : sans lui, chaque rebâti fuirait des fonctions de rafraîchissement.
  function buildOptComps() {
    var bMC = block("Modificateurs de compétences", "et spécialités");
    // LE FILTRE NE PORTE QUE SUR LES SPÉCIALITÉS. Les huit compétences sont
    // toujours toutes là, et « investies » ne trie rien : on n'investit que
    // dans ses propres spécialités, et elles n'existent que parce qu'on les a
    // créées.
    var mcTools = el("div", "pc-comp-tools");
    var mcLine = el("div", "row");
    var mcSearch = champFiltre(function () { return speFilter; },
                               function (v) { speFilter = v; }, null,
                               function () { optCompsRebuild(); });
    if (mcSearch) mcLine.appendChild(mcSearch);
    mcTools.appendChild(mcLine);
    if (mcSearch) bMC.appendChild(mcTools);
    // la grille des leviers est large : elle défile dans son cadre
    var mcWrap = el("div", "pc-optcomp-wrap");
    var mcBox = el("div");
    mcWrap.appendChild(mcBox);
    bMC.appendChild(mcWrap);

    // Les deux champs de la grille, en version optHooks : ceux de
    // commun-champs.js écrivent dans « hooks », or ces lignes-ci sont détruites
    // et recréées à chaque rebâti. Chacun existe en forme LIBRE (lire/écrire),
    // parce qu'une spécialité n'est PAS une entrée de table : son forçage est
    // une propriété de l'objet, et il vaut null quand il est absent, là où une
    // table n'a tout simplement pas la clé. Les deux formes de table ne sont
    // donc qu'un habillage de la forme libre.
    //
    // Modificateur : un champ NU, sans − ni +. Sur une grille de dix colonnes,
    // les boutons mangeaient la place et n'apportaient rien qu'on ne fasse au
    // clavier.
    function optMod(lire, ecrire, borne, titre) {
      var inp = el("input", "pc-num modif");
      inp.type = "number"; inp.step = String(MOD_PAS);
      inp.title = titre;
      inp.addEventListener("input", function () {
        var v = parseFloat(inp.value);
        ecrire(isFinite(v) ? clamp(Math.round(v), -borne, borne) : 0);
        refresh();
      });
      optHooks.push(function () {
        if (document.activeElement !== inp) inp.value = lire() ? lire() : "";
      });
      return inp;
    }
    function optModTable(map, cle, borne, titre) {
      return optMod(function () { return map[cle]; },
                    function (v) { map[cle] = v; }, borne, titre);
    }
    // un champ de forçage : vide = valeur calculée, une valeur la remplace
    function optForce(lire, ecrire, auto, titre) {
      var inp = el("input", "force");
      inp.type = "number"; inp.step = "1";
      inp.title = titre;
      inp.addEventListener("input", function () {
        var v = parseFloat(inp.value);
        ecrire(isFinite(v) ? clamp(Math.round(v), -9999, 9999) : undefined);
        refresh();
      });
      optHooks.push(function () {
        inp.placeholder = String(auto());
        var cur = lire();
        if (document.activeElement !== inp) inp.value = cur === undefined ? "" : cur;
      });
      return inp;
    }
    function optForceTable(map, cle, auto, titre) {
      return optForce(function () { return map[cle]; },
                      function (v) { if (v === undefined) delete map[cle]; else map[cle] = v; },
                      auto, titre);
    }
    // le forçage d'une spécialité : même champ, mais null au lieu d'une clé
    // absente. « lire » prend la spécialité VIVANTE et non celle capturée au
    // montage, pour que la ligne écrive dans l'état même si la liste a bougé
    // sous elle entre deux rebâtis.
    function optForceSpe(vivante, cle, auto, titre) {
      return optForce(
        function () { var v = vivante()[cle]; return v === null ? undefined : v; },
        function (v) { vivante()[cle] = v === undefined ? null : v; },
        auto, titre);
    }
    function optModSpe(vivante, cle, borne, titre) {
      return optMod(function () { return vivante()[cle]; },
                    function (v) { vivante()[cle] = v; }, borne, titre);
    }

    // Deux rangées d'entête par section : les groupes (valeur | coût), puis les
    // colonnes. Libellés courts — dix colonnes dans une demi-largeur ne
    // laissent pas la place aux noms complets, que portent les infobulles. La
    // colonne « rule » est un vrai filet : une colonne de la grille, en place
    // sur CHAQUE rangée, qui court d'un bord à l'autre du module.
    function entetes(quoi, aideValeur, cols) {
      var grp = el("div", "pc-optcomp-row grp");
      grp.appendChild(el("span"));
      var gV = el("span", "g", "Valeur");
      gV.title = aideValeur;
      grp.appendChild(gV);
      grp.appendChild(el("span", "rule"));
      var gX = el("span", "g", "Coût en xp");
      gX.title = "Ce que " + quoi + " coûte sur l'xp du personnage";
      grp.appendChild(gX);
      mcBox.appendChild(grp);

      var head = el("div", "pc-optcomp-row head");
      cols.forEach(function (h) {
        if (!h) { head.appendChild(el("span", "rule")); return; }
        var s = el("span", h[2] || null, h[0]);
        s.title = h[1];
        head.appendChild(s);
      });
      mcBox.appendChild(head);
    }

    optCompsRebuild = function () {
      optHooks = [];
      mcBox.innerHTML = "";
      var flt = filtreDe(speFilter);
      var comps = allComps();
      var spes = allSpes();
      // le filtre ne mord que sur les spécialités : les huit compétences
      // restent, sans quoi on chercherait où sont passés ses leviers
      if (flt) spes = spes.filter(function (it) {
        return it.name.toLowerCase().indexOf(flt) >= 0;
      });
      // Aucun tri : l'ordre des compétences est celui de la page de règles, et
      // celui des spécialités celui où le joueur les a créées. Les deux listes
      // se retrouvent donc ici dans l'ordre où elles se lisent sur la Fiche.

      if (comps.length) {
        mcBox.appendChild(el("div", "pc-comp-champ", "Compétences"));
        entetes("la compétence", "Ce que valent les points de la compétence dans un jet",
          [["Compétence", "Nom de la compétence"],
           ["Forcé", "Total forcé — vide = total calculé"],
           ["Modif.", "Deux modificateurs du total, qui s'additionnent", "duo"],
           ["Total", "Points effectifs de la compétence"],
           null,
           ["Forcé", "Coût en xp forcé — vide = coût calculé"],
           ["Modif.", "Deux modificateurs du coût en xp, qui s'additionnent", "duo"],
           ["Coût", "Coût effectif en xp"]]);
        comps.forEach(function (it, i) {
          var row = el("div", "pc-optcomp-row pc-mods-host" + (i % 2 === 1 ? " odd" : ""));

          var nameBox = el("span", "pc-comp-name");
          var chip = el("span", "pc-abbr", it.code);
          chip.title = it.name;
          nameBox.appendChild(chip);
          var label = el("span", "pc-comp-label", it.name);
          label.title = it.name + " — lancée sur " + it.carac;
          nameBox.appendChild(label);
          row.appendChild(nameBox);

          // VALEUR : forcé, puis les deux modificateurs, puis le total
          // effectif. Le repère du champ forcé est compPts() lui-même : le
          // champ vide EST le cas non forcé, où compPts() rend déjà ce que les
          // points, le plafond et les modificateurs donnent.
          row.appendChild(optForceTable(state.compsForce, it.key,
            function () { return compPts(it.key); },
            "Total forcé — vide = total calculé (points, plafond, modificateurs)."));
          // DEUX champs : ils s'additionnent. Un seul obligeait à faire la
          // somme de tête avant de saisir, puis à la défaire pour retirer l'un
          // des deux apports.
          row.appendChild(optModTable(state.compsMod, it.key, 999,
            "Premier modificateur du total — vide = aucun."));
          row.appendChild(optModTable(state.compsMod2, it.key, 999,
            "Second modificateur du total — vide = aucun."));
          var tot = el("span", "pc-comp-total", "");
          row.appendChild(tot);

          // COÛT EN XP : même ordre, derrière le filet de séparation
          row.appendChild(el("span", "rule"));
          row.appendChild(optForceTable(state.compsXpForce, it.key,
            function () { return compXpAuto(it.key); },
            "Coût en xp forcé — vide = coût calculé (points achetés et modificateurs)."));
          row.appendChild(optModTable(state.compsXpMod, it.key, 9999,
            "Premier modificateur du coût en xp — vide = aucun."));
          row.appendChild(optModTable(state.compsXpMod2, it.key, 9999,
            "Second modificateur du coût en xp — vide = aucun."));
          var cout = el("span", "pc-comp-total", "");
          row.appendChild(cout);

          optHooks.push(function () {
            var pts = state.comps[it.key] || 0;
            var d = (state.compsMod[it.key] || 0) + (state.compsMod2[it.key] || 0);
            var f = state.compsForce[it.key];
            var v = compPts(it.key);
            tot.textContent = String(v);
            tot.classList.toggle("zero", !v);
            tot.classList.toggle("adj", d !== 0 || f !== undefined);
            // Le plafond paraît dans l'infobulle parce qu'il n'est écrit nulle
            // part ailleurs dans cette grille : c'est lui, et non le nombre
            // saisi, qui explique un total qui ne monte plus.
            tot.title = f !== undefined
              ? "Total forcé à " + f
              : "points " + pts + " · plafond " + compPlafond(it.key) +
                (d ? " · modificateurs " + sign(d) : "");

            var xf = state.compsXpForce[it.key];
            var xm = (state.compsXpMod[it.key] || 0) + (state.compsXpMod2[it.key] || 0);
            var xp = compXp(it.key);
            cout.textContent = xp + " xp";
            cout.classList.toggle("zero", !xp);
            cout.classList.toggle("adj", xf !== undefined || xm !== 0);
            cout.title = xf !== undefined
              ? "Coût forcé à " + xf + " xp (calculé : " + compXpAuto(it.key) + " xp)"
              : "points " + pts + " × " + repli("xpComp") + " xp" +
                (xm ? " · modificateurs " + sign(xm) + " xp" : "");

            // un liseré marque les lignes réglées : c'est le seul moyen de
            // retrouver d'un coup d'œil celles qu'on a touchées
            row.classList.toggle("on",
              d !== 0 || xm !== 0 || f !== undefined || xf !== undefined);
          });
          mcBox.appendChild(row);
        });
      }

      if (spes.length) {
        mcBox.appendChild(el("div", "pc-comp-champ", "Spécialités"));
        entetes("la spécialité", "Ce que valent les points de la spécialité dans un jet",
          [["Spécialité", "Nom de la spécialité"],
           ["Forcé", "Total forcé — vide = total calculé"],
           ["Modif.", "Deux modificateurs du total, qui s'additionnent", "duo"],
           ["Total", "Points effectifs de la spécialité"],
           null,
           ["Forcé", "Coût en xp forcé — vide = coût calculé"],
           // Une spécialité n'a PAS de modificateur de coût : l'état ne lui en
           // porte pas, et on n'en invente pas. Les deux colonnes restent
           // VIDES au lieu de disparaître, pour que ses chiffres tombent aux
           // mêmes abscisses que ceux des compétences, juste au-dessus.
           ["", "", "duo"],
           ["Coût", "Coût effectif en xp"]]);
        spes.forEach(function (it, i) {
          var row = el("div", "pc-optcomp-row pc-mods-host" + (i % 2 === 1 ? " odd" : ""));
          // la spécialité VIVANTE, relue à chaque geste : la ligne survit à un
          // rafraîchissement, l'objet capturé au montage pourrait ne plus être
          // celui de l'état (import, bibliothèque, suppression du voisin)
          var spe = function () { return state.specialites[it.index] || blankSpe(); };

          var nameBox = el("span", "pc-comp-name");
          var label = el("span", "pc-comp-label", it.name);
          label.title = it.name + " — " + (it.carac || "sans caractéristique") +
                        " · " + (it.comp || "sans compétence");
          nameBox.appendChild(label);
          row.appendChild(nameBox);

          row.appendChild(optForceSpe(spe, "force",
            function () { return spePts(spe()); },
            "Total forcé — vide = total calculé (points, plafond, modificateurs)."));
          row.appendChild(optModSpe(spe, "mod", 999,
            "Premier modificateur du total — vide = aucun."));
          row.appendChild(optModSpe(spe, "mod2", 999,
            "Second modificateur du total — vide = aucun."));
          var tot = el("span", "pc-comp-total", "");
          row.appendChild(tot);

          row.appendChild(el("span", "rule"));
          row.appendChild(optForceSpe(spe, "xpForce",
            function () { return speXp(spe()); },
            "Coût en xp forcé — vide = coût calculé (points achetés)."));
          row.appendChild(el("span"));
          row.appendChild(el("span"));
          var cout = el("span", "pc-comp-total", "");
          row.appendChild(cout);

          optHooks.push(function () {
            var s = spe();
            var d = (s.mod || 0) + (s.mod2 || 0);
            var v = spePts(s);
            tot.textContent = String(v);
            tot.classList.toggle("zero", !v);
            tot.classList.toggle("adj", d !== 0 || s.force !== null);
            tot.title = s.force !== null
              ? "Total forcé à " + s.force
              : "points " + (s.pts || 0) +
                (d ? " · modificateurs " + sign(d) : "");

            var xp = speXp(s);
            cout.textContent = xp + " xp";
            cout.classList.toggle("zero", !xp);
            cout.classList.toggle("adj", s.xpForce !== null);
            cout.title = s.xpForce !== null
              ? "Coût forcé à " + s.xpForce + " xp"
              : "points " + (s.pts || 0) + " × " + repli("xpSpe") + " xp";

            row.classList.toggle("on",
              d !== 0 || s.force !== null || s.xpForce !== null);
          });
          mcBox.appendChild(row);
        });
      }

      if (!comps.length && !spes.length) mcBox.appendChild(el("div", "pc-empty", "—"));
      refresh();   // les lignes viennent de naître : leurs totaux se peuplent ici
    };
    optCompsRebuild();
    return bMC;
  }

