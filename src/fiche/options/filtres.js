  // ---- outils de filtre ----
  // Couper un outil le fait DISPARAÎTRE partout (Compétences, Armes, Langues
  // et le bloc ci-dessus) et cesser d'agir : un filtre invisible qui masque
  // encore des lignes serait un piège. Réglage d'affichage, donc local au
  // navigateur — il ne suit pas le personnage.
  function buildFiltres() {
    var bF = block("Outils de filtre");
    var fRow = el("div", "pc-comp-tools");
    var fLine = el("div", "row");
    // Chaque puce ALLUME OU ÉTEINT un outil ; elle porte donc le nom de
    // l'outil, pas celui de son réglage par défaut. La seconde s'appelait
    // « Tous les champs », qui est le premier choix de la liste déroulante :
    // on croyait afficher tous les champs alors qu'on décidait si la liste
    // existe.
    [["texte", "Champ de recherche",
      "La case où l'on tape pour filtrer les modules Compétences, Armes et Langues."],
     ["champ", "Sélecteur de champ",
      "La liste déroulante Body / Mind / Prestance des modules Compétences."]].forEach(function (o) {
      var chip = el("span", "pc-chip");
      chip.textContent = o[1];
      chip.title = o[2] + " Éteinte : l'outil disparaît, et ne filtre plus rien.";
      chip.classList.toggle("on", lpref(FILTRES[o[0]], "1") !== "0");
      chip.addEventListener("click", function () {
        var on = lpref(FILTRES[o[0]], "1") !== "0";
        lset(FILTRES[o[0]], on ? "0" : "1");
        chip.classList.toggle("on", !on);
        remount();   // les outils vivent dans d'autres onglets : tout se rebâtit
      });
      fLine.appendChild(chip);
    });
    fRow.appendChild(fLine);
    bF.appendChild(fRow);
    return bF;
  }

