  // ---------- onglet Options ----------
  // ---- jets ----
  function buildJets() {
    var bJ = block("Jets");
    var de = el("input", "de");
    de.type = "text";
    de.title = "Ce que la fiche lance pour un jet de test. Écrit en macro Roll20 : " +
               "cs> marque le coup critique, cf< l'échec critique.";
    de.value = state.de || DE_DEFAUT;
    de.addEventListener("input", function () { state.de = de.value || DE_DEFAUT; save(); });
    hooks.push(function () { if (document.activeElement !== de) de.value = state.de || DE_DEFAUT; });
    // Le champ et son bouton sur la MÊME ligne : le champ prend toute la place
    // que le bouton lui laisse. Sous le champ, le bouton occupait une rangée
    // entière pour un mot, et le bloc en paraissait deux fois plus haut.
    var ligneDe = el("div", "pc-jet-de");
    ligneDe.appendChild(fld("Dé des jets de test", de));
    ligneDe.appendChild(miniBtn("Réinitialiser", "Revenir au dé des règles : " + DE_DEFAUT,
      function () { state.de = DE_DEFAUT; refresh(); }));
    bJ.appendChild(ligneDe);
    return bJ;
  }

