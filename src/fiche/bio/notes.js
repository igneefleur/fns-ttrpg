  function buildNotes() {
    // Comme la Bio : lecture intégrale ou édition dans une zone redimensionnable.
    var b = block("Notes", null, "notes");
    var nt = el("textarea", "pc-notes pc-edit-field");
    nt.rows = 6;
    nt.placeholder = "Ce que la table a dit, ce qu'il reste à faire.";
    nt.value = state.notes || "";
    nt.addEventListener("input", function () { state.notes = nt.value; save(); });
    hooks.push(function () { if (document.activeElement !== nt) nt.value = state.notes || ""; });
    b.appendChild(nt);
    applyEdit(b, "notes");
    return b;
  }
