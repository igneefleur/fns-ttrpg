  // ---------- le corps : vitesse, charge, sauts ----------
  // Quatre tuiles autonomes plutôt qu'un bloc encadré : chacune est SON module
  // (rouage flottant, valeur forcée, modificateurs), et la grille à deux
  // colonnes les tient serrées au milieu de la fiche.
  //
  // La charge y entre parce qu'elle commande tout le reste : passé ses paliers,
  // elle rogne l'initiative, la vitesse, les sauts et l'esquive. Quand elle
  // mord, les tuiles atteintes se marquent — c'est tout ce que la fiche en dit.
  //
  // Valeur forcée d'une tuile : vide = valeur calculée. Même mécanique que le
  // maximum de PV, en version étroite (deux lignes empilées sous la valeur).
  function tuileForce(tile, champ, auto, dec) {
    var row = el("div", "pc-bigedit pc-edit-only");
    row.appendChild(el("span", "lbl", "Forcé"));
    var inp = el("input", "force");
    inp.type = "number"; inp.min = "0";
    inp.step = dec ? "0.5" : "1";
    inp.title = "Vide = calculée ; une valeur la force.";
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      state[champ] = isFinite(v)
        ? clamp(dec ? Math.round(v * 100) / 100 : Math.floor(v), 0, 9999)
        : null;
      refresh();
    });
    hooks.push(function () {
      inp.placeholder = fmtP(auto());
      if (document.activeElement !== inp) inp.value = state[champ] === null ? "" : state[champ];
    });
    row.appendChild(inp);
    tile.appendChild(row);
  }
  function tuileMods(tile, cle) {
    var row = el("div", "pc-bigedit pc-edit-only");
    row.appendChild(el("span", "lbl", "Modificateurs"));
    row.appendChild(multiMod(state.divers, cle));
    tile.appendChild(row);
  }
  // Le gréement commun d'une tuile réglable. Les Sauts ne l'ont pas : ni les
  // règles ni l'état ne leur donnent de valeur forcée ni de modificateur, et
  // leur en fabriquer un ici reviendrait à inventer une règle.
  function tuileReglable(tile, id, champ, auto, cle, dec) {
    tile.classList.add("pc-mods-host", "pc-editable");
    tile.dataset.module = id;
    var g = gearBtn(tile, id);
    g.classList.add("pc-gear-float");
    tile.appendChild(g);
    tuileForce(tile, champ, auto, dec);
    tuileMods(tile, cle);
    return tile;
  }
  // Ce que les paliers de charge font à UNE valeur, pour son infobulle. Le tri
  // par clé de calcul est ce qui empêche l'infobulle de la vitesse d'énumérer
  // des malus d'esquive : chaque tuile ne raconte que ce qui la concerne.
  function tuilePaliers(clef, verbe) {
    var out = [];
    chargePaliers().forEach(function (p) {
      if (p.calc[clef]) out.push("charge " + p.seuil + " % : " + verbe + " " + fmtP(p.calc[clef]));
    });
    return out;
  }

  function buildVitesse() {
    // DEUX RANGS DE DEUX : la vitesse et la charge d'abord, parce qu'on les lit
    // à chaque round ; les deux sauts en dessous, qui ne servent qu'au moment
    // où l'on saute. Les sauts sont SÉPARÉS : ce sont deux distances, dans deux
    // unités de geste différentes, et les empiler dans une seule case obligeait
    // à se rappeler laquelle venait en premier.
    var tiles = el("div", "pc-bigrow pc-bigrow-2");

    // ---- vitesse ----
    var tv = tuileReglable(bigTile("Vitesse", vitesse), "vitesse",
                           "vitesseOverride", vitesseAuto, "vitesse", true);
    hooks.push(function () {
      var d = modSum(state.divers.vitesse);
      var pal = tuilePaliers("vitesseDiv", "divisée par");
      // la charge ne marque la tuile que lorsqu'elle coûte vraiment des mètres :
      // un sac lourd mais sous le premier palier ne change rien
      tv.classList.toggle("adj", state.vitesseOverride !== null || d !== 0 || pal.length > 0);
      tv.title = state.vitesseOverride !== null
        ? "Vitesse forcée à " + fmtP(state.vitesseOverride) + " m (calculée : " +
          fmtP(vitesseAuto()) + " m)"
        : pal.concat(d ? ["modificateurs " + sign(d) + " m"] : []).join(" · ");
    });
    tiles.appendChild(tv);

    // ---- charge ----
    var tc = bigTile("Charge", function () {
      return fmtP(poidsPorte()) + " / " + fmtP(chargeMax());
    });
    tuileReglable(tc, "charge", "chargeOverride", chargeMaxAuto, "charge", true);
    hooks.push(function () {
      var d = modSum(state.divers.charge);
      var haut = chargePaliers().length;
      tc.classList.toggle("adj", !!haut || state.chargeOverride !== null || d !== 0);
      var pct = chargePct();
      tc.title = (state.chargeOverride !== null
        ? "Charge maximale forcée à " + fmtP(state.chargeOverride) + " (calculée : " +
          fmtP(chargeMaxAuto()) + ")"
        : (d ? "Modificateurs " + sign(d) : "")) +
        // une charge maximale nulle rend le pourcentage infini : on le dit au
        // lieu d'afficher « Infinity % », qui passerait pour une panne
        (isFinite(pct) ? " · porté : " + Math.round(pct) + " %" : " · aucune charge maximale");
    });
    tiles.appendChild(tc);

    // ---- les deux sauts ----
    // Ni valeur forcée ni modificateur : ni les règles ni l'état ne leur en
    // donnent, et leur en fabriquer un ici reviendrait à inventer une règle.
    [["Saut longueur", sautLong], ["Saut hauteur", sautHaut]].forEach(function (o) {
      var ts = bigTile(o[0], o[1]);
      hooks.push(function () {
        var pal = tuilePaliers("sautDiv", "divisés par");
        ts.classList.toggle("adj", pal.length > 0);
        ts.title = pal.join(" · ");
      });
      tiles.appendChild(ts);
    });

    return tiles;
  }
