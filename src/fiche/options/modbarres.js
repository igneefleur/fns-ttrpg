  // Deux jauges indépendantes : PV calculés sur Body et réserve EO,
  // dont le maximum est propre au module et non au budget de l'en-tête.
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
    eoBase.title = "Maximum de la réserve EO sur la fiche, indépendant du total EO de l'en-tête.";
    eoBase.addEventListener("input", function () {
      var n = parseFloat(eoBase.value);
      state.emBarreMax = isFinite(n) ? clamp(Math.floor(n), 0, 9999) : 0;
      refresh();
    });
    hooks.push(function () {
      if (document.activeElement !== eoBase) eoBase.value = state.emBarreMax;
    });
    eo.appendChild(eoBase);
    eo.appendChild(multiMod(state.divers, "eoMax"));
    var eoTotal = el("span", "pc-comp-total", "");
    eo.appendChild(eoTotal);
    hooks.push(function () {
      var d = modSum(state.divers.eoMax), max = emReserveMax();
      eoTotal.textContent = fmtP(max);
      eoTotal.classList.toggle("adj", d !== 0);
      eoTotal.title = "Réserve EO : base " + state.emBarreMax +
        (d ? " · modificateurs " + sign(d) : "");
      eo.classList.toggle("on", d !== 0);
    });
    table.appendChild(eo);
    return b;
  }
