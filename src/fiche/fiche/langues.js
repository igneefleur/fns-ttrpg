  // ---------- langues ----------
  // Des compétences de Mind, rassemblées dans leur module. La langue du
  // personnage monte jusqu'à Expert sans rien coûter ; les autres se paient
  // comme n'importe quelle compétence.
  function buildLangues() {
    var langHooks = [];
    var b = block("Langues", null, "langues", function () { rendre(); });

    var tools = el("div", "pc-comp-tools");
    // pas de menu des champs (une langue est toujours une compétence de Mind)
    var recherche = champFiltre(function () { return languesFilter; },
                                function (v) { languesFilter = v; }, "Filtrer les langues…",
                                function () { rendre(); });
    if (recherche) {
      var lineF = el("div", "row");
      lineF.appendChild(recherche);
      tools.appendChild(lineF);
    }
    var line = el("div", "row");
    var persoChip = el("span", "pc-chip");
    persoChip.textContent = "Personnalisées";
    // « personnalisée » = apprise en plus ; la langue du personnage, elle, est
    // acquise, c'est le pendant des compétences des règles dans les autres modules
    persoChip.title = "Décoché : seule la langue du personnage est affichée.";
    persoChip.classList.toggle("on", languesPerso);
    persoChip.addEventListener("click", function () {
      languesPerso = !languesPerso;
      persoChip.classList.toggle("on", languesPerso);
      rendre();
    });
    line.appendChild(persoChip);
    var onlyChip = el("span", "pc-chip");
    onlyChip.textContent = "Investies";
    onlyChip.title = "N'afficher que les langues où un stade, un passif ou un modificateur est posé.";
    onlyChip.classList.toggle("on", languesOnly);
    onlyChip.addEventListener("click", function () {
      languesOnly = !languesOnly;
      onlyChip.classList.toggle("on", languesOnly);
      rendre();
    });
    line.appendChild(onlyChip);
    tools.appendChild(line);
    b.appendChild(tools);

    var box = el("div");
    b.appendChild(box);

    function rendre() {
      langHooks.length = 0;
      box.innerHTML = "";
      var flt = filtreDe(languesFilter);
      var noms = state.langues.filter(function (nom) {
        if (!languesPerso && nom !== state.langueBase) return false;
        if (languesOnly && !compInvestie({ key: langueKey(nom) })) return false;
        if (flt && nom.toLowerCase().indexOf(flt) < 0) return false;
        return true;
      });
      if (noms.length) {
        var head = el("div", "pc-comp-row head");
        head.appendChild(el("span", null, "Langue"));
        head.appendChild(el("span", null, "Stade"));
        head.appendChild(el("span", null, "Total"));
        box.appendChild(head);
      } else {
        box.appendChild(el("div", "pc-empty",
          flt ? "Aucune langue ne correspond."
              : languesOnly ? "Aucune langue investie."
              : state.langues.length ? "Aucune langue à afficher."
              : isEdit("langues")
                ? "Aucune langue : la première ajoutée devient celle du personnage."
                : "Aucune langue."));
      }
      noms.forEach(function (nom, i) {
        var item = { key: langueKey(nom), name: nom, carac: LANGUE_CARAC, custom: true, langue: true };
        var row = compRow(item, i % 2 === 1,
                          { module: "langues", reg: langHooks, onDrop: rendre });
        // la langue du personnage se désigne d'un clic : une seule à la fois
        var etoile = el("button", "pc-lang-base" + (state.langueBase === nom ? " on" : ""), "★");
        etoile.type = "button";
        etoile.title = state.langueBase === nom
          ? "Langue du personnage : acquise jusqu'à Expert sans rien coûter"
          : "Faire de « " + nom + " » la langue du personnage";
        etoile.addEventListener("click", function () {
          if (!isEdit("langues")) return;
          state.langueBase = state.langueBase === nom ? "" : nom;
          refresh();
          rendre();
        });
        row.querySelector(".pc-comp-name").insertBefore(etoile, row.querySelector(".pc-comp-label"));
        box.appendChild(row);
      });

      if (isEdit("langues")) {
        var addRow = el("div", "pc-comp-add");
        var inp = el("input");
        inp.type = "text";
        inp.placeholder = state.langues.length ? "Nouvelle langue…" : "Langue du personnage…";
        addRow.appendChild(inp);
        addRow.appendChild(miniBtn("+", "Ajouter", function () {
          var nom = capFirst(inp.value.trim());
          if (!nom) return;
          if (allComps().some(function (it) {
                return it.carac === LANGUE_CARAC && it.name.toLowerCase() === nom.toLowerCase();
              })) { flash("« " + nom + " » existe déjà en Mind."); return; }
          state.langues.push(nom);
          // la première langue est celle du personnage : elle arrive à Expert,
          // gratuitement — c'est tout l'intérêt de la désigner
          if (!state.langueBase) {
            state.langueBase = nom;
            state.comps[langueKey(nom)] = { stade: stadeExpert(), techniques: [] };
          }
          // une langue ajoutée ne doit jamais rester invisible
          if (!languesPerso) { languesPerso = true; persoChip.classList.add("on"); }
          if (languesOnly) { languesOnly = false; onlyChip.classList.remove("on"); }
          if (filtreDe(languesFilter)) { languesFilter = ""; if (recherche) recherche.value = ""; }
          inp.value = "";
          refresh();
          rendre();
          if (optCompsRebuild) optCompsRebuild();
        }));
        box.appendChild(addRow);
      }
      applyEdit(b, "langues");
      refresh();
    }
    hooks.push(function () { langHooks.forEach(function (f) { f(); }); });
    rendre();
    return b;
  }

