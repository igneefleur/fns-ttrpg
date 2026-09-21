  // ---- 5. Survie : PR, PS, PH ----
  // LE GRÉEMENT DES RÉSERVES VITALES (vitales.js), mais les trois dans UNE
  // carte : repos, satiété et hydratation se lisent ensemble, au campement,
  // et ne se déplacent pas l'une sans l'autre. Aucun rouage : leurs maximums
  // se règlent dans l'onglet Options, comme ceux des PV.
  function buildSurvie() {
    var b = carteVitale();
    ["pr", "ps", "ph"].forEach(function (cle) {
      b.appendChild(reserveVitale(cle, provenanceCap(cle)).el);
    });
    var pied = el("div", "pc-comp-tools pc-vital-pied");
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
