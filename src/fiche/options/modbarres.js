  // PV calculés sur Body et réserve EO liée au total de l’en-tête.
  function buildModBarres() {
    var b = block("Modificateur de Barre");
    var wrap = el("div", "pc-optcomp-wrap");
    var table = el("div", "pc-barres-table");
    wrap.appendChild(table);
    b.appendChild(wrap);

    var head = el("div", "pc-barres-row head");
    ["Barre", "Forcé / base", "Modificateurs", "Maximum"].forEach(function (label) {
      head.appendChild(el("span", null, label));
    });
    table.appendChild(head);

    var pv = el("div", "pc-barres-row pc-mods-host");
    pv.appendChild(el("span", "pc-comp-name", "PV"));
    pv.appendChild(champForceVal(
      function () { return state.pvMaxOverride === null ? undefined : state.pvMaxOverride; },
      function (v) { state.pvMaxOverride = v === undefined ? null : v; },
      function () { return pvMaxAuto(); },
      "Vide = maximum calculé ((20 + Body) / 2, modificateurs compris) ; une valeur le force."
    ));
    pv.appendChild(multiMod(state.divers, "pvMax"));
    var pvTotal = el("span", "pc-comp-total", "");
    pv.appendChild(pvTotal);
    hooks.push(function () {
      var d = modSum(state.divers.pvMax), max = pvMax();
      pvTotal.textContent = fmtP(max);
      pvTotal.classList.toggle("adj", state.pvMaxOverride !== null || d !== 0);
      pvTotal.title = state.pvMaxOverride !== null
        ? "PV maximum forcé à " + state.pvMaxOverride + " (calculé : " + pvMaxAuto() + ")"
        : "(20 + Body) / 2" + (d ? " · modificateurs " + sign(d) : "");
      pv.classList.toggle("on", state.pvMaxOverride !== null || d !== 0);
    });
    table.appendChild(pv);

    var eo = el("div", "pc-barres-row pc-mods-host");
    eo.appendChild(el("span", "pc-comp-name", "EO"));
    var eoBase = el("input", "force pc-barre-base");
    eoBase.type = "number"; eoBase.min = "0"; eoBase.max = "9999"; eoBase.step = "1";
    eoBase.setAttribute("aria-label", "Maximum de base de la réserve EO");
    eoBase.title = "Total EO partagé avec l’en-tête, avant les modificateurs de maximum.";
    eoBase.addEventListener("input", function () {
      var n = parseFloat(eoBase.value);
      state.emMax = isFinite(n) ? clamp(Math.floor(n), 0, 9999) : 0;
      refresh();
    });
    hooks.push(function () {
      if (document.activeElement !== eoBase) eoBase.value = state.emMax;
    });
    eo.appendChild(eoBase);
    eo.appendChild(multiMod(state.divers, "eoMax"));
    var eoTotal = el("span", "pc-comp-total", "");
    eo.appendChild(eoTotal);
    hooks.push(function () {
      var d = modSum(state.divers.eoMax), max = emReserveMax();
      eoTotal.textContent = fmtP(max);
      eoTotal.classList.toggle("adj", d !== 0);
      eoTotal.title = "Réserve EO : base " + state.emMax +
        (d ? " · modificateurs " + sign(d) : "");
      eo.classList.toggle("on", d !== 0);
    });
    table.appendChild(eo);
    return b;
  }
