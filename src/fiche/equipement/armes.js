  function buildArmes() {
    var bA = block("Armes", null, "armes");
    var boxA = el("div");
    bA.appendChild(boxA);
    eqCards(boxA, state.armes, "arme", bA, "armes");
    return bA;
  }

