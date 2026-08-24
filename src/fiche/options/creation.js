  // ---- création : le prestige, et le plafond qu'il pose ----
  // Ce bloc réglait un budget de « points de création » : il n'y en a plus.
  // MIA ne distribue pas de points au départ, il RANGE le personnage : le
  // prestige dit son rang, et ce rang plafonne chacune de ses
  // caractéristiques. Ce sont donc ces deux choses-là que le MJ arbitre ici,
  // et rien d'autre — la valeur achetée, elle, appartient au joueur et se
  // règle sur la Fiche.
  // Mêmes colonnes que les deux autres grilles de l'onglet, à quatre au lieu
  // de dix : un demi-bloc suffit ici, il n'y a pas de coût en xp à régler.
  function buildCreation() {
    var bC = block("Création");
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    bC.appendChild(wrap);

    // Un seul entête pour toute la grille, en tête : les deux bandes qui
    // suivent nomment les rangées, pas les colonnes. D'où « Valeur » et non
    // « Plafond », qui aurait menti sur la rangée du prestige.
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
    // (« Compétences ———— ») : un titre de RANGÉES, à gauche, filet jusqu'au
    // bord. La bande centrée des autres grilles ne convenait pas ici : elle
    // titre des COLONNES, et se lisait comme un second entête posé sur les
    // chiffres.
    function bande(titre, aide) {
      var t = el("div", "pc-comp-champ", titre);
      t.title = aide;
      box.appendChild(t);
    }

    // LE PRESTIGE D'ABORD, le plafond ensuite : le second n'est que le premier
    // décalé, et la grille se lisait à l'envers quand la cause venait après
    // l'effet.
    bande("Prestige",
          "Le rang du personnage, qui plafonne chacune de ses caractéristiques "
          + "(0 à " + repli("prestigeMax") + " dans les règles)");
    var rowP = el("div", "pc-optcomp-row quatre");
    var nomP = el("span", "pc-comp-name");
    nomP.appendChild(el("span", "pc-comp-label", "Prestige"));
    rowP.appendChild(nomP);
    // Le prestige n'est pas une entrée de table mais une clé de l'état : son
    // forçage vaut null quand il est absent, là où une table n'a simplement
    // pas la clé. D'où la forme LIBRE des deux champs, et la traduction
    // null ↔ vide faite ici.
    rowP.appendChild(champForceVal(
      function () { return state.prestigeForce === null ? undefined : state.prestigeForce; },
      function (v) { state.prestigeForce = v === undefined ? null : v; },
      prestigeAuto,
      "Prestige forcé — vide = prestige calculé (acquis + modificateur)."));
    rowP.appendChild(champModVal(
      function () { return state.prestigeMod; },
      function (v) { state.prestigeMod = v; }, 999,
      "Modificateur du prestige — vide = aucun."));
    var totP = el("span", "pc-comp-total", "");
    rowP.appendChild(totP);
    hooks.push(function () {
      var m = state.prestigeMod || 0;
      var f = state.prestigeForce;
      totP.textContent = String(prestige());
      totP.classList.toggle("adj", m !== 0 || f !== null);
      totP.title = f !== null
        ? "Prestige forcé à " + f
        : "acquis " + (state.prestige || 0) + (m ? " · modificateur " + sign(m) : "");
      rowP.classList.toggle("on", m !== 0 || f !== null);
    });
    box.appendChild(rowP);

    bande("Plafond des caractéristiques",
          "Ce qu'une caractéristique ne peut pas dépasser : le prestige, "
          + "relevé ou abaissé caractéristique par caractéristique");
    // « le plafond de Agilité » : les noms viennent des règles, on n'en connaît
    // donc pas la liste d'avance et l'élision se décide ici, sur la lettre.
    function de(nom) {
      return (/^[aâàäeéèêëiîïoôöuùûü]/i.test(nom) ? "d'" : "de ") + nom;
    }
    champs().forEach(function (c, i) {
      var row = el("div", "pc-optcomp-row quatre" + (i % 2 === 1 ? " odd" : ""));
      var nameBox = el("span", "pc-comp-name");
      var chip = el("span", "pc-abbr", c);
      chip.title = caracInfo(c).nom;
      nameBox.appendChild(chip);
      row.appendChild(nameBox);

      row.appendChild(champForce(state.caracsPlafondForce, c,
        function () { return caracPlafondAuto(c); },
        "Plafond forcé — vide = plafond calculé (prestige + modificateur)."));
      row.appendChild(champModVal(
        function () { return state.caracsPlafondMod[c]; },
        function (v) { state.caracsPlafondMod[c] = v; }, 999,
        "Modificateur du plafond " + de(caracInfo(c).nom) + " — vide = aucun."));
      var tot = el("span", "pc-comp-total", "");
      row.appendChild(tot);

      hooks.push(function () {
        var m = state.caracsPlafondMod[c] || 0;
        var f = state.caracsPlafondForce[c];
        tot.textContent = String(caracPlafond(c));
        tot.classList.toggle("adj", m !== 0 || f !== undefined);
        tot.title = f !== undefined
          ? "Plafond forcé à " + f
          : "prestige " + prestige() + (m ? " · modificateur " + sign(m) : "");
        row.classList.toggle("on", m !== 0 || f !== undefined);
      });
      box.appendChild(row);
    });
    return bC;
  }

