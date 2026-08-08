  // L'ancien bloc « Combat » est éclaté (2026-08-01) : Vitesse et Régén / jour
  // forment leur propre élément (tuiles autonomes), PV et Narration ont chacun
  // leur bloc ; la tuile « XP restant » a disparu, le compteur « XP dépensé »
  // de l'en-tête la rendait redondante.
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

  function buildVitesse() {
    // deux tuiles = deux MODULES distincts : chacune porte son propre rouage
    // flottant (jeu : lecture ; édition : sa valeur forcée et ses modificateurs)
    var tiles = el("div", "pc-bigrow pc-bigrow-2");

    var tv = bigTile("Vitesse", vitesse);
    tv.classList.add("pc-mods-host", "pc-editable");
    tv.dataset.module = "vitesse";
    var gV = gearBtn(tv, "vitesse");
    gV.classList.add("pc-gear-float");
    tv.appendChild(gV);
    tuileForce(tv, "vitesseOverride", vitesseAuto, true);
    tuileMods(tv, "vitesse");
    hooks.push(function () {
      var d = modSum(state.divers.vitesse);
      // la charge ne marque la tuile que lorsqu'elle coûte vraiment des mètres,
      // c'est-à-dire en surcharge : un sac lourd mais porté ne change plus rien
      var surch = estSurcharge();
      tv.classList.toggle("adj", state.vitesseOverride !== null || d !== 0 || surch);
      // D'où sort le chiffre : le palier lu sur le Body (le poids ne l'y descend
      // plus), puis la surcharge si la charge dépasse ce Body. Sans ce détail, un
      // joueur surchargé cherche son résultat dans la table et ne l'y trouve pas.
      var calcul = "Palier de la table (Body " + bodyVitesse() + ") : " + vitessePalier() +
        (surch ? " · surcharge " + sign(-surchargeMalus()) + " m" : "");
      tv.title = state.vitesseOverride !== null
        ? "Vitesse forcée à " + fmtP(state.vitesseOverride) + " m (calculée : " + fmtP(vitesseAuto()) + " m)"
        : calcul + (d ? " · modificateurs " + sign(d) + " m" : "");
    });
    tiles.appendChild(tv);

    var tr = bigTile("Régén / jour", regen);
    tr.classList.add("pc-mods-host", "pc-editable");
    tr.dataset.module = "regen";
    var gR = gearBtn(tr, "regen");
    gR.classList.add("pc-gear-float");
    tr.appendChild(gR);
    tuileForce(tr, "regenOverride", regenAuto, false);
    tuileMods(tr, "regen");
    hooks.push(function () {
      var d = modSum(state.divers.regen);
      tr.classList.toggle("adj", state.regenOverride !== null || d !== 0);
      tr.title = state.regenOverride !== null
        ? "Régénération forcée à " + state.regenOverride + " (calculée : " + regenAuto() + ")"
        : "Body / 10 = " + Math.floor(caracTotal("Body") / 10) +
          (d ? " · modificateurs " + sign(d) : "") + " (jamais sous 0)";
    });
    tiles.appendChild(tr);

    return tiles;
  }

