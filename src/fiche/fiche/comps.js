  // ---------- onglet Fiche : les compétences ----------
  // HUIT compétences, celles des règles, dans l'ordre de la page. Le menu des
  // champs et la puce « Personnalisées » ont disparu avec ce qu'ils réglaient :
  // il n'y a plus de champ où ranger une compétence, ni de compétence inventée
  // à ajouter — les langues et les armes, qui étaient les deux listes ouvertes,
  // n'existent plus. Restent le filtre texte et la puce « Investies », qui
  // servent surtout à la fiche condensée de Roll20, où la colonne est étroite.
  function rebuildComps() {
    if (!compBox) return;
    compHooks = [];   // les lignes vont être détruites : leurs fonctions avec
    compBox.innerHTML = "";
    var flt = filtreDe(compFilter);
    var items = allComps();
    if (flt) items = items.filter(function (it) { return it.name.toLowerCase().indexOf(flt) >= 0; });
    if (compOnly) items = items.filter(compInvestie);
    // Aucun tri : l'ordre des règles est celui où le joueur lit ses compétences
    // dans son livre, et le même que dans le bloc des Options. Un ordre
    // alphabétique n'aurait de sens que sur une liste qu'on ne connaît pas.
    if (!items.length) {
      // Une liste vide n'a pas la même cause selon ce qui l'a vidée, et le
      // joueur qui ne voit plus ses points doit savoir laquelle : un filtre se
      // défait, des données absentes se rechargent.
      compBox.appendChild(el("div", "pc-empty",
        flt ? "Aucune compétence ne correspond."
            : compOnly ? "Aucune compétence investie."
            : "Les règles n'ont pas été chargées."));
    } else {
      items.forEach(function (it, i) { compBox.appendChild(compRow(it, i % 2 === 1)); });
    }
    refresh();
  }
  function buildComps() {
    // jeu : les points, la limite et le jet ; édition : les ± qui achètent les
    // points, ligne par ligne
    var b = block("Compétences", null, "comps");
    var tools = el("div", "pc-comp-tools");
    var line = el("div", "row");
    var search = champFiltre(function () { return compFilter; },
                             function (v) { compFilter = v; }, null, rebuildComps);
    if (search) line.appendChild(search);
    var onlyChip = el("span", "pc-chip");
    onlyChip.textContent = "Investies";
    onlyChip.title = "N'afficher que les compétences qui portent des points ou un réglage.";
    onlyChip.classList.toggle("on", compOnly);
    onlyChip.addEventListener("click", function () {
      compOnly = !compOnly;
      onlyChip.classList.toggle("on", compOnly);
      rebuildComps();
    });
    line.appendChild(onlyChip);
    tools.appendChild(line);
    b.appendChild(tools);
    compBox = el("div");
    b.appendChild(compBox);
    rebuildComps();
    return b;
  }

