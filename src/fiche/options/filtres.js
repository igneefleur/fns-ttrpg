  // ---- 23. Outils de filtre ----
  // Couper un outil le fait DISPARAÎTRE partout et cesser d'agir : un filtre
  // invisible qui masque encore des lignes serait un piège. La puce porte le
  // nom de l'OUTIL, jamais celui de son réglage par défaut.
  function buildFiltres() {
    var b = block("Outils de filtre");
    var tools = el("div", "pc-comp-tools");
    var line = el("div", "row");
    var chip = el("span", "pc-chip", "Champ de recherche");
    chip.title = "La case où l'on tape pour filtrer les compétences, sur la Fiche comme ici. " +
                 "Éteinte : l'outil disparaît, et ne filtre plus rien.";
    chip.classList.toggle("on", filtreTexteOn());
    chip.addEventListener("click", function () {
      var on = filtreTexteOn();
      lset(FILTRES.texte, on ? "0" : "1");
      chip.classList.toggle("on", !on);
      remount();   // l'outil vit dans un autre onglet : tout se rebâtit
    });
    line.appendChild(chip);
    tools.appendChild(line);
    b.appendChild(tools);
    return b;
  }
