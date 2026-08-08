  function buildPv() {
    // les PV COURANTS se jouent en temps réel (combat) : stepper et « Max »
    // restent toujours actifs ; l'édition ne garde que le maximum forcé et
    // les divers du maximum
    var b = block("PV", null, "pv");
    var pvRow = el("div", "pc-kv");
    var pvStep = el("span", "pc-step");
    pvStep.appendChild(stepBtn("−", null, function () { state.pv = pvCourant() - 1; refresh(); }));
    var pvIn = el("input", "pc-num");
    pvIn.type = "number"; pvIn.step = "1";
    pvIn.addEventListener("input", function () {
      var v = parseFloat(pvIn.value);
      state.pv = isFinite(v) ? v : null;
      refresh();
    });
    hooks.push(function () { if (document.activeElement !== pvIn) pvIn.value = pvCourant(); });
    pvStep.appendChild(pvIn);
    pvStep.appendChild(stepBtn("+", null, function () { state.pv = pvCourant() + 1; refresh(); }));
    pvRow.appendChild(pvStep);
    var pvM = el("span", "max", "");
    hooks.push(function () {
      var d = modSum(state.divers.pvMax);
      pvM.textContent = "/ " + pvMax();
      pvM.classList.toggle("adj", state.pvMaxOverride !== null || d !== 0);
      pvM.title = state.pvMaxOverride !== null
        ? "Maximum forcé à " + state.pvMaxOverride + " (calculé : " + pvMaxAuto() + ")"
        : "(20 + Body) / 2 = " + Math.floor((20 + caracTotal("Body")) / 2) +
          (d ? " · modificateurs " + sign(d) : "");
    });
    pvRow.appendChild(pvM);
    pvRow.appendChild(el("span", "sp"));
    pvRow.appendChild(miniBtn("Max", "Revenir au maximum", function () { state.pv = null; refresh(); }));
    b.appendChild(pvRow);

    // maximum : valeur forcée (vide = calculée) + divers — les leviers HxH
    var mrow = el("div", "pc-pvmax pc-mods-host pc-edit-only");
    mrow.appendChild(el("span", "lbl", "Forcé"));
    var force = el("input", "force");
    force.type = "number"; force.step = "1"; force.min = "0";
    force.title = "Vide = maximum calculé ((20 + Body) / 2, modificateurs compris) ; " +
                  "une valeur le force.";
    force.addEventListener("input", function () {
      var v = parseFloat(force.value);
      state.pvMaxOverride = isFinite(v) ? clamp(Math.floor(v), 0, 9999) : null;
      refresh();
    });
    hooks.push(function () {
      force.placeholder = String(pvMaxAuto());
      if (document.activeElement !== force) {
        force.value = state.pvMaxOverride === null ? "" : state.pvMaxOverride;
      }
    });
    mrow.appendChild(force);
    mrow.appendChild(el("span", "lbl", "Modificateurs"));
    mrow.appendChild(multiMod(state.divers, "pvMax"));
    mrow.appendChild(el("span", "sp"));
    b.appendChild(mrow);
    return b;
  }

