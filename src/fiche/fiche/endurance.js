  // ---------- l'endurance ----------
  // SON PROPRE MODULE, et non une moitié du bloc des PV. Les deux réserves ont
  // la même forme, mais elles ne se lisent pas au même moment : les PV pendant
  // qu'on encaisse, l'endurance pendant qu'on décide de forcer. Séparées, elles
  // se déplacent l'une sans l'autre, et se coupent l'une sans l'autre.
  //
  // Tout son gréement est celui des PV (pvReserve, pvForceRow) : deux réserves
  // qui se ressemblent doivent se ressembler jusque dans le code, sans quoi
  // l'une finit corrigée et l'autre non. Elle prend donc la nouvelle forme du
  // même geste — le chiffre en grand, la jauge épaisse, l'état à gauche.
  //
  // ELLE GARDE SON ROUAGE POUR L'INSTANT, et c'est le seul écart : son maximum
  // se règle encore ici, à l'ancienne (une valeur forcée et trois
  // modificateurs), quand celui des PV est passé dans l'onglet Options avec la
  // chaîne complète. Le lui donner aussi est la suite prévue ; laisser son
  // réglage sans interface entre-temps aurait été pire que l'écart.
  // LA LIGNE DE CONSTRUCTION D'UN MAXIMUM, À L'ANCIENNE : une valeur forcée
  // (vide = calculée) et trois modificateurs. Elle vivait dans pv.js, du temps
  // où les deux réserves s'en servaient ; les PV sont passés à la chaîne, elle
  // déménage donc chez son dernier usager.
  //
  // ELLE PARTIRA AVEC LUI. Quand l'endurance aura sa chaîne, cette fonction
  // n'aura plus d'appelant et s'en ira — comme celle des PV s'en est allée.
  function pvForceRow(nom, champ, auto, cle, aide) {
    var row = el("div", "pc-pvmax pc-mods-host pc-edit-only");
    row.appendChild(el("span", "lbl", nom));
    var f = el("input", "force");
    f.type = "number"; f.step = "1"; f.min = "0";
    f.title = aide;
    f.addEventListener("input", function () {
      var v = parseFloat(f.value);
      state[champ] = isFinite(v) ? clamp(Math.floor(v), 0, 9999) : null;
      refresh();
    });
    hooks.push(function () {
      f.placeholder = String(auto());
      if (document.activeElement !== f) f.value = state[champ] === null ? "" : state[champ];
    });
    row.appendChild(f);
    row.appendChild(el("span", "lbl", "Modificateurs"));
    row.appendChild(multiMod(state.divers, cle));
    row.appendChild(el("span", "sp"));
    return row;
  }

  function buildEndurance() {
    // LA MÊME CARTE QUE LES PV, et son rouage dans le coin : la carte n'a plus
    // de titre où le poser. Il vivra le temps que l'endurance ait sa chaîne.
    var gear = null;
    var r = pvReserve("Endurance", enduranceCourante,
                      function (v) { state.endurance = v; },
                      enduranceMax, endurancePlancher, function () {
      var d = modSum(state.divers.endurance);
      return {
        adj: state.enduranceMaxOverride !== null || d !== 0,
        titre: state.enduranceMaxOverride !== null
          ? "Maximum forcé à " + state.enduranceMaxOverride +
            " (calculé : " + enduranceMaxAuto() + ")"
          : (d ? "Modificateurs " + sign(d) : "")
      };
    }, (gear = el("span", "pc-res-gear")));
    // block() posait la classe et le rouage ; la carte les prend elle-même
    r.el.classList.add("pc-editable");
    r.el.dataset.module = "endurance";
    gear.appendChild(gearBtn(r.el, "endurance"));
    r.el.appendChild(pvForceRow("Endurance max", "enduranceMaxOverride", enduranceMaxAuto,
                                "endurance", "Vide = calculé ; une valeur le force."));
    hooks.push(function () {
      r.etat.textContent = enduranceAuTapis() ? "Au tapis" : "";
      r.etat.classList.toggle("grave", enduranceAuTapis());
    });
    return r.el;
  }
