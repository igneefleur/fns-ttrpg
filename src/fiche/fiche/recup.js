  // ---------- la récupération ----------
  // MÊME FORME QUE L'INITIATIVE : une valeur qu'on relit, et un bouton qui en
  // fait quelque chose. L'initiative porte son chiffre au compteur de tours ;
  // la récupération rend ses points à la réserve. Ce n'est pas une tuile, parce
  // qu'une tuile ne fait rien — elle ne montre.
  function buildRecup() {
    var b = block("Récup / jour", null, "recup");
    // DEUX RÉSERVES, DEUX NOMBRES, UN SEUL GESTE. Une journée rend des points
    // de vie ET de l'endurance : les deux se lisent côte à côte, et le bouton
    // les rend ensemble — on ne se repose pas à moitié.
    var row = el("div", "pc-kv");
    var val = el("span", "pc-cval");
    val.title = "Points de vie regagnés par jour";
    row.appendChild(val);
    var valE = el("span", "pc-cval");
    valE.title = "Endurance regagnée par jour";
    row.appendChild(valE);
    row.appendChild(el("span", "sp"));
    row.appendChild(miniBtn("Récupérer", "Rendre au personnage ses points de vie et son endurance du jour",
                            function () {
      // on ne dépasse jamais le maximum : une journée de repos ne fabrique ni
      // points de vie ni endurance en trop
      var n = recupJour(), nE = recupEnduranceJour();
      var pAv = pvCourant(), pAp = n > 0 ? Math.min(pvMax(), pAv + n) : pAv;
      var eAv = enduranceCourante(), eAp = nE > 0 ? Math.min(enduranceMax(), eAv + nE) : eAv;
      if (pAp === pAv && eAp === eAv) { flash("Rien à récupérer."); return; }
      state.pv = pAp;
      state.endurance = eAp;
      refresh();
      var dit = [];
      if (pAp !== pAv) dit.push("PV " + fmtP(pAv) + " → " + fmtP(pAp));
      if (eAp !== eAv) dit.push("endurance " + fmtP(eAv) + " → " + fmtP(eAp));
      flash(dit.join(" · "));
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
      valE.textContent = String(recupEnduranceJour());
      val.classList.toggle("adj", state.recupOverride !== null || d !== 0);
      val.title = state.recupOverride !== null
        ? "Récupération forcée (calculée : " + recupJourAuto() + ")"
        : (d ? "Modificateurs " + sign(d) : "");
    });
    return b;
  }
