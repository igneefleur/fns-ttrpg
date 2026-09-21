  // ---- Rupture ----
  // UN MODULE D'OPTION : les points de rupture se dépensent en prenant un Rang
  // Max ou un rang de technique, et l'en-tête en tient le compte. Ce bloc ne
  // sert qu'à FORCER les points disponibles quand la table en décide
  // autrement ; « Max » rend la main au calcul. Leur nombre au plus se règle
  // dans les Réglages des capacités, à la ligne Rupture.
  function buildRupture() {
    var b = block("Rupture");
    var row = el("div", "pc-kv");
    row.appendChild(stepper(
      function () { return state.etat.rupture === null ? ruptureRestante() : state.etat.rupture; },
      function (v) { state.etat.rupture = Math.round(v); },
      1, "points de rupture"));
    var max = el("span", "max", "");
    row.appendChild(max);
    row.appendChild(el("span", "sp"));
    row.appendChild(miniBtn("Max", "Revenir au calcul", function () {
      state.etat.rupture = null;
      refresh();
    }));
    b.appendChild(row);
    hooks.push(function () {
      max.textContent = "/ " + fmtP(ruptureMax());
      max.classList.toggle("adj", capForce("rupture"));
      max.title = capForce("rupture")
        ? chaineTexteDe(lireCap("max", "rupture"), "calculé", ruptureMaxAuto())
        : "";
    });
    return b;
  }
