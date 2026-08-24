  // ---------- onglet Fiche : les compétences ----------
  // HUIT compétences, celles des règles, dans l'ordre de la page. Ni filtre ni
  // puce : on ne filtre pas huit lignes qui tiennent à l'écran et qu'on connaît
  // par cœur, et « investies » ne trie rien puisqu'elles sont toutes là, tout
  // le temps. Ce qui se filtre, ce sont les SPÉCIALITÉS, dont la liste est
  // ouverte et n'appartient qu'au joueur — c'est leur module qui porte l'outil.
  function rebuildComps() {
    if (!compBox) return;
    compHooks = [];   // les lignes vont être détruites : leurs fonctions avec
    compBox.innerHTML = "";
    var items = allComps();
    // Aucun tri : l'ordre des règles est celui où le joueur lit ses compétences
    // dans son livre, et le même que dans le bloc des Options.
    if (!items.length) compBox.appendChild(el("div", "pc-empty", "—"));
    else items.forEach(function (it, i) { compBox.appendChild(compRow(it, i % 2 === 1)); });
    refresh();
  }
  function buildComps() {
    // jeu : les points, la limite et le jet ; édition : les ± qui achètent les
    // points, ligne par ligne
    var b = block("Compétences", null, "comps");
    compBox = el("div");
    b.appendChild(compBox);
    rebuildComps();
    return b;
  }
