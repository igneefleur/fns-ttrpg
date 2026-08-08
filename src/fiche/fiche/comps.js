  function rebuildComps() {
    if (!compBox) return;
    compHooks = [];   // les lignes vont être détruites : leurs hooks avec
    compBox.innerHTML = "";
    var flt = filtreDe(compFilter);
    CHAMPS.forEach(function (carac) {
      if (filtreChampOn() && compChamp && compChamp !== carac) return;
      // l'Initiative, les langues et les armes ont leur propre module sur
      // cette page : les répéter ici ferait deux commandes pour un même stade.
      // Mais un module COUPÉ rend ses compétences à cette liste : sans quoi
      // couper « Langues » rendrait les langues du personnage inatteignables.
      // Aucun calcul ne change, seulement l'endroit où la ligne se lit.
      var items = allComps().filter(function (it) {
        if (it.carac !== carac) return false;
        if (it.key === INIT_KEY) return !actif("initiative");
        if (it.langue) return !actif("langues");
        if (it.arme) return !actif("armescomp");
        return true;
      });
      if (!compPerso) items = items.filter(function (it) { return !it.custom; });
      if (flt) items = items.filter(function (it) { return it.name.toLowerCase().indexOf(flt) >= 0; });
      if (compOnly) items = items.filter(compInvestie);
      // ordre alphabétique (français, accents ignorés), comps perso intercalées
      items.sort(function (a, b) { return a.name.localeCompare(b.name, "fr", { sensitivity: "base" }); });
      compBox.appendChild(el("div", "pc-comp-champ", carac));
      if (!items.length) {
        compBox.appendChild(el("div", "pc-empty",
          flt ? "Aucune compétence ne correspond."
              : compOnly ? "Aucune compétence investie." : "—"));
      } else {
        var head = el("div", "pc-comp-row head");
        head.appendChild(el("span", null, "Compétence"));
        head.appendChild(el("span", null, "Stade"));
        head.appendChild(el("span", null, "Total"));
        compBox.appendChild(head);
        items.forEach(function (it, i) { compBox.appendChild(compRow(it, i % 2 === 1)); });
      }
      // ajout d'une compétence personnalisée (les listes des règles sont
      // ouvertes : « … ») — seulement en mode édition du module
      if (!isEdit("comps")) return;
      var addRow = el("div", "pc-comp-add");
      var inp = el("input");
      inp.type = "text"; inp.placeholder = "Nouvelle compétence " + carac + "…";
      addRow.appendChild(inp);
      addRow.appendChild(miniBtn("+", "Ajouter", function () {
        var name = capFirst(inp.value.trim());
        if (!name) return;
        var exists = allComps().some(function (it) { return it.carac === carac && it.name.toLowerCase() === name.toLowerCase(); });
        if (exists) { flash("Cette compétence existe déjà."); return; }
        state.customComps.push({ name: name, carac: carac });
        // ne jamais ajouter une compétence qui resterait invisible
        if (!compPerso) {
          compPerso = true;
          if (compPersoChip) compPersoChip.classList.add("on");
        }
        inp.value = "";
        refresh();
        rebuildComps();
        if (optCompsRebuild) optCompsRebuild();   // la nouvelle comp gagne sa ligne dans Options
      }));
      compBox.appendChild(addRow);
    });
    refresh();
  }
  function buildComps() {
    // jeu : filtres (outils de vue) et totaux-jets ; édition : stades, ajout
    // et retrait de compétences perso. Le rouage rebâtit la liste : les
    // rangées d'ajout n'existent qu'en édition.
    var b = block("Compétences", null, "comps", function () { rebuildComps(); });
    // outils sur deux lignes : filtre texte + filtre de champ côte à côte,
    // puis les deux puces de filtre en dessous
    var tools = el("div", "pc-comp-tools");
    var line1 = el("div", "row");
    var search = champFiltre(function () { return compFilter; },
                             function (v) { compFilter = v; }, null, rebuildComps);
    if (search) line1.appendChild(search);
    if (filtreChampOn()) {
      var champSel = el("select", "pc-select");
      ["Tous les champs", "Body", "Mind", "Prestance"].forEach(function (ch) {
        var o = el("option");
        o.value = ch === "Tous les champs" ? "" : ch;
        o.textContent = ch;
        champSel.appendChild(o);
      });
      champSel.value = compChamp;
      champSel.addEventListener("change", function () { compChamp = champSel.value; rebuildComps(); });
      line1.appendChild(champSel);
    }
    if (line1.children.length) tools.appendChild(line1);
    var line2 = el("div", "row");
    var persoChip = el("span", "pc-chip");
    persoChip.textContent = "Personnalisées";
    persoChip.title = "Décoché : seules les compétences de base du jeu sont affichées.";
    persoChip.classList.toggle("on", compPerso);
    persoChip.addEventListener("click", function () {
      compPerso = !compPerso;
      persoChip.classList.toggle("on", compPerso);
      rebuildComps();
    });
    compPersoChip = persoChip;
    line2.appendChild(persoChip);
    var onlyChip = el("span", "pc-chip");
    onlyChip.textContent = "Investies";
    onlyChip.title = "N'afficher que les compétences où un stade, un passif ou un modificateur est posé.";
    onlyChip.classList.toggle("on", compOnly);
    onlyChip.addEventListener("click", function () {
      compOnly = !compOnly;
      onlyChip.classList.toggle("on", compOnly);
      rebuildComps();
    });
    line2.appendChild(onlyChip);
    tools.appendChild(line2);
    b.appendChild(tools);
    compBox = el("div");
    b.appendChild(compBox);
    rebuildComps();
    return b;
  }

