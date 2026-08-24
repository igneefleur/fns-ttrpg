  // ---------- l'endurance ----------
  // SON PROPRE MODULE, et non une moitié du bloc des PV. Les deux réserves ont
  // la même forme, mais elles ne se lisent pas au même moment : les PV pendant
  // qu'on encaisse, l'endurance pendant qu'on décide de forcer. Séparées, elles
  // se déplacent l'une sans l'autre, et se coupent l'une sans l'autre.
  //
  // Tout son gréement est celui des PV (pvReserve, pvForceRow, pvLigne) : deux
  // réserves qui se ressemblent doivent se ressembler jusque dans le code, sans
  // quoi l'une finit corrigée et l'autre non.
  function buildEndurance() {
    var b = block("Endurance", null, "endurance");
    b.appendChild(pvReserve("Endurance", enduranceCourante,
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
    }));
    var tapis = pvLigne("pc-warn");
    b.appendChild(tapis);
    b.appendChild(pvForceRow("Endurance max", "enduranceMaxOverride", enduranceMaxAuto,
                             "endurance", "Vide = calculé ; une valeur le force."));
    hooks.push(function () { pvDit(tapis, enduranceAuTapis() ? "Au tapis" : ""); });
    return b;
  }
