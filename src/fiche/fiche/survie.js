  // ---- 5. Survie : PR, PS, PH ----
  // LE GRÉEMENT DES RÉSERVES VITALES (vitales.js), mais les trois dans UNE
  // carte : repos, satiété et hydratation se lisent ensemble, au campement,
  // et ne se déplacent pas l'une sans l'autre. Aucun rouage : leurs maximums
  // se règlent dans l'onglet Options, comme ceux des PV.
  // Les bandeaux disent le mot entier, et non le sigle des règles : la carte
  // n'a que ces trois-là, ils y tiennent.
  function buildSurvie() {
    var b = carteVitale();
    [["pr", "Repos"], ["ps", "Satiété"], ["ph", "Hydratation"]].forEach(function (x) {
      b.appendChild(reserveVitale(x[0], provenanceCap(x[0]), x[1]).el);
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
