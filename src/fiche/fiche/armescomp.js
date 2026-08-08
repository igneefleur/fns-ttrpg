  // ---------- compétences d'armes ----------
  // Toujours des compétences de Body. Celles des règles (DATA.compsArmes) et
  // celles que le joueur ajoute vivent ensemble ici, et nulle part ailleurs :
  // la liste générale les écarte pour ne pas doubler la commande du stade.
  function buildArmesComps() {
    var armHooks = [];
    var b = block("Armes", null, "armescomp", function () { rendre(); });

    // mêmes filtres que la liste des compétences : décoché, « Armes
    // personnalisées » ne laisse que celles des règles ; « Investies
    // seulement » masque celles où rien n'est posé.
    var tools = el("div", "pc-comp-tools");
    // pas de menu des champs ici (une arme est toujours une compétence de
    // Body) : le filtre prend donc toute la largeur
    var recherche = champFiltre(function () { return armesFilter; },
                                function (v) { armesFilter = v; }, "Filtrer les armes…",
                                function () { rendre(); });
    if (recherche) {
      var lineF = el("div", "row");
      lineF.appendChild(recherche);
      tools.appendChild(lineF);
    }
    var line = el("div", "row");
    var persoChip = el("span", "pc-chip");
    persoChip.textContent = "Personnalisées";
    persoChip.title = "Décoché : seules les armes des règles sont affichées.";
    persoChip.classList.toggle("on", armesPerso);
    persoChip.addEventListener("click", function () {
      armesPerso = !armesPerso;
      persoChip.classList.toggle("on", armesPerso);
      rendre();
    });
    line.appendChild(persoChip);
    var onlyChip = el("span", "pc-chip");
    onlyChip.textContent = "Investies";
    onlyChip.title = "N'afficher que les armes où un stade, un passif ou un modificateur est posé.";
    onlyChip.classList.toggle("on", armesOnly);
    onlyChip.addEventListener("click", function () {
      armesOnly = !armesOnly;
      onlyChip.classList.toggle("on", armesOnly);
      rendre();
    });
    line.appendChild(onlyChip);
    tools.appendChild(line);
    b.appendChild(tools);

    var box = el("div");
    b.appendChild(box);

    function rendre() {
      armHooks.length = 0;
      box.innerHTML = "";
      var flt = filtreDe(armesFilter);
      var noms = armesNoms().filter(function (nom) {
        var perso = state.armesComps.indexOf(nom) >= 0;
        if (!armesPerso && perso) return false;
        if (armesOnly && !compInvestie({ key: armeKey(nom) })) return false;
        if (flt && nom.toLowerCase().indexOf(flt) < 0) return false;
        return true;
      });
      if (noms.length) {
        var head = el("div", "pc-comp-row head");
        head.appendChild(el("span", null, "Arme"));
        head.appendChild(el("span", null, "Stade"));
        head.appendChild(el("span", null, "Total"));
        box.appendChild(head);
      } else {
        box.appendChild(el("div", "pc-empty",
          flt ? "Aucune arme ne correspond."
              : armesOnly ? "Aucune arme investie." : "Aucune arme."));
      }
      noms.forEach(function (nom, i) {
        var perso = state.armesComps.indexOf(nom) >= 0;
        box.appendChild(compRow(
          { key: armeKey(nom), name: nom, carac: ARME_CARAC, custom: perso, arme: true },
          i % 2 === 1, { module: "armescomp", reg: armHooks, onDrop: rendre }));
      });

      if (isEdit("armescomp")) {
        var addRow = el("div", "pc-comp-add");
        var inp = el("input");
        inp.type = "text";
        inp.placeholder = "Nouvelle arme…";
        addRow.appendChild(inp);
        addRow.appendChild(miniBtn("+", "Ajouter", function () {
          var nom = capFirst(inp.value.trim());
          if (!nom) return;
          if (allComps().some(function (it) {
                return it.carac === ARME_CARAC && it.name.toLowerCase() === nom.toLowerCase();
              })) { flash("« " + nom + " » existe déjà en Body."); return; }
          state.armesComps.push(nom);
          // ne jamais ajouter une arme qui resterait invisible
          if (!armesPerso) { armesPerso = true; persoChip.classList.add("on"); }
          if (armesOnly) { armesOnly = false; onlyChip.classList.remove("on"); }
          if (filtreDe(armesFilter)) { armesFilter = ""; if (recherche) recherche.value = ""; }
          inp.value = "";
          refresh();
          rendre();
          if (optCompsRebuild) optCompsRebuild();
        }));
        box.appendChild(addRow);
      }
      applyEdit(b, "armescomp");
      refresh();
    }
    hooks.push(function () { armHooks.forEach(function (f) { f(); }); });
    rendre();
    return b;
  }

