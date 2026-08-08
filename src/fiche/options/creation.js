  // ---- création : plafond des caractéristiques et budget de points ----
  // Ce bloc a remplacé la case « Sans limite » (2026-08-04), qui ne savait que
  // lever le plafond, et pour les trois caractéristiques à la fois. Mêmes
  // colonnes que les deux autres grilles de l'onglet, à quatre colonnes au lieu
  // de dix : un demi-bloc suffit ici (il n'y a pas de coût en xp à régler).
  function buildCreation() {
    var bC = block("Création");
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    bC.appendChild(wrap);

    // Un seul entête pour toute la grille, en tête : les deux bandes qui
    // suivent nomment les rangées, pas les colonnes. D'où « Valeur » et non
    // « Plafond », qui aurait menti sur la rangée des points de création.
    var head = el("div", "pc-optcomp-row quatre head");
    [["Réglage", "Ce que la rangée règle"],
     ["Forcé", "Valeur forcée — vide = valeur calculée"],
     ["Modif.", "Modificateur du barème — vide = aucun"],
     ["Valeur", "Valeur effective"]].forEach(function (h) {
      var sp = el("span", null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    box.appendChild(head);

    // Les deux sections se titrent comme les champs du bloc des compétences
    // (« BODY ———— ») : un titre de RANGÉES, à gauche, filet jusqu'au bord.
    // La bande centrée des autres grilles ne convenait pas ici : elle titre des
    // COLONNES, et se lisait comme un second entête posé sur les chiffres.
    function bande(titre, aide) {
      var t = el("div", "pc-comp-champ", titre);
      t.title = aide;
      box.appendChild(t);
    }

    bande("Plafond des caractéristiques",
          "Ce que création + achats d'xp ne peuvent pas dépasser, "
          + "caractéristique par caractéristique");
    CHAMPS.forEach(function (name, i) {
      if (!DATA.caracs.some(function (cc) { return cc.name === name; })) return;
      var row = el("div", "pc-optcomp-row quatre" + (i % 2 === 1 ? " odd" : ""));
      var nameBox = el("span", "pc-comp-name");
      var chip = el("span", "pc-abbr", ABBR[name] || name);
      chip.title = name;
      nameBox.appendChild(chip);
      row.appendChild(nameBox);

      row.appendChild(champForce(state.caracsPlafondForce, name,
        function () { return caracPlafondAuto(name); },
        "Plafond forcé — vide = plafond calculé (" + CARAC_MAX + " + modificateur)."));
      row.appendChild(champModVal(
        function () { return state.caracsPlafondMod[name]; },
        function (v) { state.caracsPlafondMod[name] = v; }, 999,
        "Modificateur du plafond de " + name + " — vide = aucun."));
      var tot = el("span", "pc-comp-total", "");
      row.appendChild(tot);

      hooks.push(function () {
        var m = state.caracsPlafondMod[name] || 0;
        var f = state.caracsPlafondForce[name];
        tot.textContent = String(caracPlafond(name));
        tot.classList.toggle("adj", m !== 0 || f !== undefined);
        tot.title = f !== undefined
          ? "Plafond forcé à " + f
          : "barème " + CARAC_MAX + (m ? " · modificateur " + sign(m) : "");
        row.classList.toggle("on", m !== 0 || f !== undefined);
      });
      box.appendChild(row);
    });

    bande("Points de création",
          "Le budget que la jauge « Création » de la Fiche mesure");
    var rowP = el("div", "pc-optcomp-row quatre");
    var nomP = el("span", "pc-comp-name");
    nomP.appendChild(el("span", "pc-comp-label", "Points"));
    rowP.appendChild(nomP);
    rowP.appendChild(champForceVal(
      function () { return state.ptsCreaForce === null ? undefined : state.ptsCreaForce; },
      function (v) { state.ptsCreaForce = v === undefined ? null : v; },
      ptsCreaAuto,
      "Budget forcé — vide = budget calculé (" + PTS_CREATION + " + modificateur)."));
    rowP.appendChild(champModVal(
      function () { return state.ptsCreaMod; },
      function (v) { state.ptsCreaMod = v; }, 999,
      "Modificateur du budget de points de création — vide = aucun."));
    var totP = el("span", "pc-comp-total", "");
    rowP.appendChild(totP);
    hooks.push(function () {
      var m = state.ptsCreaMod || 0;
      var f = state.ptsCreaForce;
      totP.textContent = String(ptsCreaMax());
      totP.classList.toggle("adj", m !== 0 || f !== null);
      totP.title = f !== null
        ? "Budget forcé à " + f
        : "barème " + PTS_CREATION + (m ? " · modificateur " + sign(m) : "");
      rowP.classList.toggle("on", m !== 0 || f !== null);
    });
    box.appendChild(rowP);
    return bC;
  }

