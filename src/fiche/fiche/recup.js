  // ---------- la récupération ----------
  // MÊME FORME QUE L'INITIATIVE : une valeur qu'on relit, et un bouton qui en
  // fait quelque chose. L'initiative porte son chiffre au compteur de tours ;
  // la récupération rend ses points à la réserve. Ce n'est pas une tuile, parce
  // qu'une tuile ne fait rien — elle ne montre.
  function buildRecup() {
    var b = block("Récup / jour", null, "recup");
    var row = el("div", "pc-kv");
    var val = el("span", "pc-cval");
    row.appendChild(val);
    row.appendChild(el("span", "sp"));
    row.appendChild(miniBtn("Récupérer", "Rendre au personnage ses points de vie du jour",
                            function () {
      var n = recupJour();
      if (n <= 0) { flash("Rien à récupérer."); return; }
      // on ne dépasse jamais le maximum : une journée de repos ne fabrique pas
      // de points de vie en trop, et un personnage déjà au plein ne bouge pas
      var avant = pvCourant(), apres = Math.min(pvMax(), avant + n);
      if (apres === avant) { flash("Déjà au maximum."); return; }
      state.pv = apres;
      refresh();
      flash("PV : " + fmtP(avant) + " → " + fmtP(apres));
    }));
    b.appendChild(row);

    // construction : valeur forcée (vide = calculée) + modificateurs, comme les
    // maximums de réserve
    var mrow = el("div", "pc-pvmax pc-mods-host pc-edit-only");
    mrow.appendChild(el("span", "lbl", "Forcée"));
    var force = el("input", "force");
    force.type = "number"; force.step = "1"; force.min = "0";
    force.title = "Vide = calculée ; une valeur la force.";
    force.addEventListener("input", function () {
      var v = parseFloat(force.value);
      state.recupOverride = isFinite(v) ? clamp(Math.floor(v), 0, 9999) : null;
      refresh();
    });
    hooks.push(function () {
      force.placeholder = String(recupJourAuto());
      if (document.activeElement !== force) {
        force.value = state.recupOverride === null ? "" : state.recupOverride;
      }
    });
    mrow.appendChild(force);
    mrow.appendChild(el("span", "lbl", "Modificateurs"));
    mrow.appendChild(multiMod(state.divers, "recup"));
    mrow.appendChild(el("span", "sp"));
    b.appendChild(mrow);

    hooks.push(function () {
      var d = modSum(state.divers.recup);
      val.textContent = String(recupJour());
      val.classList.toggle("adj", state.recupOverride !== null || d !== 0);
      val.title = state.recupOverride !== null
        ? "Récupération forcée (calculée : " + recupJourAuto() + ")"
        : (d ? "Modificateurs " + sign(d) : "");
    });
    return b;
  }
