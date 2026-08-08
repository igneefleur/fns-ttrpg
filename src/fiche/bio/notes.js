  function buildNotes() {
    // les Notes restent libres : c'est le carnet de la session, il s'écrit en jeu
    var bN = block("Notes");
    var nt = el("textarea", "pc-notes");
    nt.rows = 6;
    nt.value = state.notes || "";
    nt.addEventListener("input", function () { state.notes = nt.value; save(); });
    bN.appendChild(nt);
    return bN;
  }

