  // ---- 13. Bourse ----
  function buildBourse() {
    var b = block("Bourse", null, "bourse");
    var row = el("div", "pc-kv");
    // Geste de JEU : toujours actif, jamais sous le rouage. On dépense en jeu.
    row.appendChild(stepper(
      function () { return state.argent; },
      function (v) { state.argent = Math.max(0, Math.round(v * 100) / 100); },
      1, monnaie(true)));
    row.appendChild(el("span", "k", monnaie(true)));
    row.appendChild(el("span", "sp"));
    row.appendChild(chatBtn(
      function () { return "Bourse — " + fmtP(state.argent) + " " + monnaie(state.argent !== 1); },
      function () { return [[capFirst(monnaie(true)), fmtP(state.argent)]]; }));
    b.appendChild(row);
    return b;
  }
