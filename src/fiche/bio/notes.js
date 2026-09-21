  function buildNotes() {
    // Les notes restent LIBRES, sans rouage : c'est le carnet de la session, il
    // s'écrit en jeu, la main sur le clavier. Un verrou à ouvrir avant chaque
    // ligne le rendrait inutilisable — et rien ici ne se calcule, donc rien ne
    // se casse à l'écrire de travers.
    var b = block("Notes");
    var nt = el("textarea", "pc-notes");
    nt.rows = 6;
    nt.placeholder = "Ce que la table a dit, ce qu'il reste à faire.";
    nt.value = state.notes || "";
    nt.addEventListener("input", function () { state.notes = nt.value; save(); });
    hooks.push(function () { if (document.activeElement !== nt) nt.value = state.notes || ""; });
    b.appendChild(nt);
    return b;
  }
