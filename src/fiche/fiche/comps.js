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
    // l'entête des trois colonnes, du même squelette que le trio des lignes :
    // c'est ce qui garantit que chaque mot tombe en face de sa colonne
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "sp"));
    var teteTrio = el("span", "pc-trio tete");
    // « CARAC » ET NON « MOD » : dans une compétence, ce nombre n'est pas SON
    // modificateur, c'est celui de la caractéristique dont elle relève. Le mot
    // dit donc d'où il vient. (Sur une caractéristique, « MOD » reste juste :
    // c'est le sien.)
    ["Val", "Bonus", "Carac", "Lim"].forEach(function (k) {
      var c = el("span", "c");
      c.appendChild(el("span", "k", k));
      teteTrio.appendChild(c);
    });
    tete.appendChild(teteTrio);
    b.appendChild(tete);
    compBox = el("div");
    b.appendChild(compBox);
    rebuildComps();
    return b;
  }
