  // ---- outils de filtre ----
  // Une seule puce depuis que le filtre ne sert plus qu'aux spécialités : le
  // sélecteur de champ réglait une liste déroulante qui n'existe plus. Coupée,
  // la case de recherche DISPARAÎT et cesse d'agir — un filtre invisible qui
  // masque encore des lignes serait un piège. Réglage d'affichage, donc local
  // au navigateur ; il ne suit pas le personnage.
  function buildFiltres() {
    var bF = block("Outils de filtre");
    var fRow = el("div", "pc-comp-tools");
    var fLine = el("div", "row");
    var chip = el("span", "pc-chip");
    chip.textContent = "Champ de recherche";
    chip.title = "La case où l'on tape pour filtrer les spécialités. " +
                 "Éteinte : l'outil disparaît, et ne filtre plus rien.";
    chip.classList.toggle("on", filtreTexteOn());
    chip.addEventListener("click", function () {
      var on = filtreTexteOn();
      lset(FILTRES.texte, on ? "0" : "1");
      chip.classList.toggle("on", !on);
      remount();   // l'outil vit dans d'autres onglets : tout se rebâtit
    });
    fLine.appendChild(chip);
    fRow.appendChild(fLine);
    bF.appendChild(fRow);
    return bF;
  }

