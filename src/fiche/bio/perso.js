  // ---------- onglet Bio ----------
  function buildPerso() {
    var bP = block("Personnalité", null, "perso");
    var g = el("div", "pc-id");
    var defIn = el("textarea", "pc-notes pc-edit-field");
    defIn.rows = 3;
    defIn.value = state.defaut || "";
    defIn.addEventListener("input", function () { state.defaut = defIn.value; save(); });
    var defFld = fld("Défaut", defIn, "c12");
    defFld.appendChild(chatBtn(
      function () { return "Défaut" + (state.name ? " — " + state.name : ""); },
      function () { return [["", state.defaut]]; }));
    g.appendChild(defFld);
    [0, 1].forEach(function (qi) {
      var qIn = el("textarea", "pc-notes pc-edit-field");
      qIn.rows = 3;
      qIn.value = state.qualites[qi] || "";
      qIn.addEventListener("input", function () { state.qualites[qi] = qIn.value; save(); });
      var qFld = fld("Qualité " + (qi + 1), qIn, "c6");
      qFld.appendChild(chatBtn(
        function () { return "Qualité " + (qi + 1) + (state.name ? " — " + state.name : ""); },
        function () { return [["", state.qualites[qi]]]; }));
      g.appendChild(qFld);
    });
    bP.appendChild(g);
    return bP;
  }

