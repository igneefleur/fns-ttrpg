  // ---- 3. Rupture ----
  function buildRupture() {
    var b = block("Rupture", null, "rupture");
    var row = el("div", "pc-kv");
    row.appendChild(stepper(
      function () { return state.etat.rupture === null ? ruptureRestante() : state.etat.rupture; },
      function (v) { state.etat.rupture = Math.round(v); },
      1, "points de rupture"));
    var max = el("span", "max", "");
    row.appendChild(max);
    row.appendChild(el("span", "sp"));
    // « Max » remet à null : la valeur suit alors ce que les rangs et les
    // techniques laissent, sans qu'on ait à la recalculer de tête.
    row.appendChild(miniBtn("Max", "Revenir à ce que les rangs et les techniques laissent", function () {
      state.etat.rupture = null;
      refresh();
    }));
    b.appendChild(row);
    var n = note("");
    b.appendChild(n);
    b.appendChild(ligneLeviers("rupture", ruptureMaxAuto,
      "Vide = nombre de points calculé (celui du livre, modificateurs compris) ; une valeur le force."));
    hooks.push(function () {
      max.textContent = "/ " + fmtP(ruptureMax());
      max.classList.toggle("adj", capForce("rupture"));
      max.title = capForce("rupture")
        ? chaineTexteDe(lireCap("max", "rupture"), "calculé", ruptureMaxAuto())
        : "Points de rupture du personnage";
      n.textContent = "Engagés : " + fmtP(ruptureComps()) + " par les rangs de compétence, " +
                      fmtP(ruptureTechs()) + " par les techniques.";
    });
    return b;
  }

