  // ---------- onglet Options ----------
  // ---- jets ----
  function buildJets() {
    var bJ = block("Jets");
    var de = el("input", "de");
    de.type = "text";
    de.title = "Ce que la fiche lance pour un jet de test, en macro Roll20.";
    de.value = deTest();
    de.addEventListener("input", function () { state.de = de.value || DE_TEST_DEFAUT; save(); });
    hooks.push(function () { if (document.activeElement !== de) de.value = deTest(); });
    // Le champ et son bouton sur la MÊME ligne : le champ prend toute la place
    // que le bouton lui laisse. Sous le champ, le bouton occupait une rangée
    // entière pour un mot, et le bloc en paraissait deux fois plus haut.
    var ligneDe = el("div", "pc-jet-de");
    ligneDe.appendChild(fld("Dé des jets de test", de));
    ligneDe.appendChild(miniBtn("Réinitialiser", "Revenir à " + DE_TEST_DEFAUT,
      function () { state.de = DE_TEST_DEFAUT; refresh(); }));
    bJ.appendChild(ligneDe);
    return bJ;
  }

