  // ---- 15. Jets ----
  function buildJets() {
    var b = block("Jets");
    var de = el("input", "de");
    de.type = "text";
    de.title = "Ce que la fiche lance par dé d'action. Toute expression Roll20 est acceptée.";
    de.value = state.de || DE_DEFAUT;
    de.addEventListener("input", function () { state.de = de.value || DE_DEFAUT; save(); });
    hooks.push(function () { if (document.activeElement !== de) de.value = state.de || DE_DEFAUT; });
    // Le champ et son bouton sur la MÊME ligne : sous le champ, le bouton
    // occupait une rangée entière pour un mot, et le bloc paraissait deux fois
    // plus haut.
    var ligne = el("div", "pc-jet-de");
    ligne.appendChild(fld("Dé des jets", de));
    ligne.appendChild(miniBtn("Réinitialiser", "Revenir au dé du livre : " + deDe(1),
      function () { state.de = deDe(1); refresh(); }));
    b.appendChild(ligne);
    // Pas de note : ce que le champ contient se lit dans le champ, et dire
    // combien de faces ont les dés du jeu, c'est réciter la règle.
    return b;
  }

