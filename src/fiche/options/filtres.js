  // ---- outils de filtre ----
  // TROIS PUCES, et elles ne servent qu'aux spécialités : c'est la seule liste
  // ouverte de la fiche, la seule qui puisse devenir assez longue pour qu'on
  // s'y perde. Éteinte, une puce fait DISPARAÎTRE son outil et cesser d'agir —
  // un filtre invisible qui masque encore des lignes serait un piège. Réglages
  // d'affichage, donc locaux au navigateur ; ils ne suivent pas le personnage.
  function buildFiltres() {
    var bF = block("Outils de filtre");
    var fRow = el("div", "pc-comp-tools");
    var fLine = el("div", "row");
    function puce(cle, mot, aide) {
      var chip = el("span", "pc-chip");
      chip.textContent = mot;
      chip.title = aide;
      function on() { return lpref(cle, "1") !== "0"; }
      chip.classList.toggle("on", on());
      chip.addEventListener("click", function () {
        var etait = on();
        lset(cle, etait ? "0" : "1");
        chip.classList.toggle("on", !etait);
        remount();   // l'outil vit dans un autre onglet : tout se rebâtit
      });
      fLine.appendChild(chip);
    }
    puce(FILTRES.texte, "Champ de recherche",
         "La case où l'on tape pour filtrer les spécialités.");
    puce(FILTRES.carac, "Caractéristique",
         "Le sélecteur qui ne garde que les spécialités d'une caractéristique.");
    puce(FILTRES.comp, "Compétence",
         "Le sélecteur qui ne garde que les spécialités d'une compétence.");
    fRow.appendChild(fLine);
    bF.appendChild(fRow);
    return bF;
  }

