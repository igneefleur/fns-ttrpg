  function buildArmures() {
    var bB = block("Armures", null, "armures");
    var boxB = el("div");
    bB.appendChild(boxB);
    eqCards(boxB, state.armures, "armure", bB, "armures");
    return bB;
  }

