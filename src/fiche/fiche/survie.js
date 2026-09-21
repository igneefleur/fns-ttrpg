  // ---- 5. Survie : PR, PS, PH ----
  function buildSurvie() {
    var b = block("Survie", null, "survie");
    // Les nombres sont grands (des centaines, des milliers) : le pas vaut dix,
    // et le champ du milieu reste saisissable au point près pour le reste.
    ["pr", "ps", "ph"].forEach(function (cle) {
      jauge(b, cle, { pas: 10, provenance: provenanceCap(cle) });
    });
    var pied = el("div", "pc-comp-tools");
    var ligne = el("div", "row");
    ligne.appendChild(chatBtn(
      function () { return "Survie — " + (state.name || "sans nom"); },
      function () {
        return [
          [abbrCap("pr", "PR"), fmtP(courant("pr")) + " / " + fmtP(prMax())],
          [abbrCap("ps", "PS"), fmtP(courant("ps")) + " / " + fmtP(psMax())],
          [abbrCap("ph", "PH"), fmtP(courant("ph")) + " / " + fmtP(phMax())],
          ["Effondrement", String(effondrement())]
        ];
      }));
    pied.appendChild(ligne);
    b.appendChild(pied);
    return b;
  }

