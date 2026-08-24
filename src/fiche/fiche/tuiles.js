  // ---------- le corps : vitesse, sauts, charge, récupération ----------
  // Quatre tuiles autonomes plutôt qu'un bloc encadré : chacune est SON module
  // (rouage flottant, valeur forcée, modificateurs), et la grille à deux
  // colonnes les tient serrées au milieu de la fiche.
  //
  // La charge y entre parce qu'elle commande tout le reste : passé ses paliers,
  // elle rogne l'initiative, la vitesse, les sauts et l'esquive. Un joueur qui
  // voit ses chiffres fondre sans lire POURQUOI cherche une panne là où il n'y
  // a qu'un sac trop lourd — d'où le palier franchi écrit en toutes lettres
  // sous la valeur, avec la phrase des règles et non une paraphrase.
  //
  // Valeur forcée d'une tuile : vide = valeur calculée. Même mécanique que le
  // maximum de PV, en version étroite (deux lignes empilées sous la valeur).
  function tuileForce(tile, champ, auto, dec) {
    var row = el("div", "pc-bigedit pc-edit-only");
    row.appendChild(el("span", "lbl", "Forcé"));
    var inp = el("input", "force");
    inp.type = "number"; inp.min = "0";
    inp.step = dec ? "0.5" : "1";
    inp.title = "Vide = valeur calculée (modificateurs compris) ; une valeur la force.";
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
        : ["AGI × " + fmtP(repli("vitesseMult")) + " = " +
           fmtP(caracTotal("AGI") * repli("vitesseMult")) + " m"]
            .concat(pal, d ? ["modificateurs " + sign(d) + " m"] : []).join(" · ");
    });
    tiles.appendChild(tv);

    // ---- sauts ----
    // Une seule tuile pour les deux : le round compte les deux dans le même
    // déplacement, et c'est le même palier de charge qui les écrase.
    var ts = bigTile("Sauts long · haut", function () {
      return sautLong() + " · " + sautHaut();
    });
    hooks.push(function () {
      var pal = tuilePaliers("sautDiv", "divisés par");
      ts.classList.toggle("adj", pal.length > 0);
      ts.title = ["Longueur : FOR × " + fmtP(repli("sautLong")) + " m",
                  "Hauteur : FOR ÷ " + fmtP(repli("sautHaut")) + " m"]
                   .concat(pal).join(" · ");
    });
    tiles.appendChild(ts);

    // ---- charge ----
    var tc = bigTile("Charge", function () {
      return fmtP(poidsPorte()) + " / " + fmtP(chargeMax());
    });
    // le palier franchi LE PLUS HAUT, avec sa phrase des règles : les paliers se
    // cumulent, mais celui du dessus est le seul qu'on ne puisse pas deviner
    var note = el("div", "pc-block-note");
    note.style.display = "none";
    tc.appendChild(note);
    tuileReglable(tc, "charge", "chargeOverride", chargeMaxAuto, "charge", true);
    hooks.push(function () {
      var d = modSum(state.divers.charge);
      var pal = chargePaliers();
      var haut = pal.length ? pal[pal.length - 1] : null;
      note.textContent = haut ? haut.seuil + " % — " + haut.effets : "";
      note.style.display = haut ? "" : "none";
      tc.classList.toggle("adj", !!haut || state.chargeOverride !== null || d !== 0);
      var pct = chargePct();
      tc.title = (state.chargeOverride !== null
        ? "Charge maximale forcée à " + fmtP(state.chargeOverride) + " (calculée : " +
          fmtP(chargeMaxAuto()) + ")"
        : "Le plus haut du MOD CON et du MOD FOR" +
          (d ? " · modificateurs " + sign(d) : "")) +
        // une charge maximale nulle rend le pourcentage infini : on le dit au
        // lieu d'afficher « Infinity % », qui passerait pour une panne
        (isFinite(pct) ? " · porté : " + Math.round(pct) + " %" : " · aucune charge maximale");
    });
    tiles.appendChild(tc);

    // ---- récupération ----
    var tr = tuileReglable(bigTile("Récup / jour", recupJour), "recup",
                           "recupOverride", recupJourAuto, "recup", false);
    hooks.push(function () {
      var d = modSum(state.divers.recup);
      tr.classList.toggle("adj", state.recupOverride !== null || d !== 0);
      tr.title = state.recupOverride !== null
        ? "Récupération forcée à " + fmtP(state.recupOverride) + " (calculée : " +
          recupJourAuto() + ")"
        // RÉCUP est une spécialité, et son plafond n'est pas celui des autres :
        // le dire ici évite de chercher pourquoi des points achetés ne comptent pas
        : "(MOD CON + RÉCUP) / 2 = (" + caracMod("CON") + " + " + recupPts() + ") / 2 = " +
          Math.floor((caracMod("CON") + recupPts()) / 2) +
          " · spécialité Récupération plafonnée à MOD CON × " + fmtP(repli("recupMult")) +
          " = " + recupPlafond() +
          (d ? " · modificateurs " + sign(d) : "");
    });
    tiles.appendChild(tr);

    return tiles;
  }

