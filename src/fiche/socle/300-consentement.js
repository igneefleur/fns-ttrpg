  // ---------- le bandeau de consentement ----------
  // Le code d'un mod voyage AVEC le personnage : ouvrir la fiche d'un autre
  // joueur ne doit jamais exécuter son code sans un oui explicite. Ce oui reste
  // dans CE navigateur (le moteur le range), il ne voyage pas — sinon l'auteur
  // consentirait pour tout le monde.
  //
  // La fiche s'ouvre TOUJOURS : un mod en attente ne bloque rien, il ne tourne
  // pas, c'est tout. (L'écran de version, lui, protège des données : il bloque.
  // Mais il ne paraît plus qu'au désaccord de SCHÉMA, jamais sur un simple
  // écart de numéro de release.)
  function modsEnAttente() {
    if (!state || !state.mods || !state.mods.length) return [];
    if (!window.JjkMods || typeof window.JjkMods.enAttente !== "function") return [];
    try {
      // MÊME repère que executeMods, sans quoi les deux écrans se contredisent :
      // sans version ni schéma, le moteur saute ses deux contrôles, un mod
      // « pour: 4.0.0 » est annoncé « pas autorisé », le joueur l'autorise, et
      // le bloc Mods lui répond « trop récent ». Le oui ainsi arraché dort dans
      // le navigateur et s'appliquerait tout seul le jour de la 4.0.0.
      var a = window.JjkMods.enAttente(state.mods, { version: RELEASE, schema: SCHEMA });
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function decideMod(empreinte, avis) {
    if (!window.JjkMods || typeof window.JjkMods.decide !== "function") return;
    try { window.JjkMods.decide(empreinte, avis); } catch (e) {}
  }
  // Le dialogue d'examen : le code de chaque mod, en clair, et deux boutons.
  // Une décision remonte la fiche aussitôt (le mod autorisé doit tourner, et
  // le bandeau doit dire la vérité) : le dialogue part avec l'ancien DOM,
  // le bandeau restant se rouvre d'un clic s'il reste des mods à juger.
  function examinerMods(attente) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "Un mod autorisé tourne dans la page de la fiche, avec les mêmes droits qu'elle : " +
      "il fait ce qu'il veut de ce qui s'y affiche et de ce qui s'y enregistre. " +
      "N'autoriser que du code dont la provenance est sûre."));
    attente.forEach(function (m) {
      var ligne = el("div", "pc-modrow");
      ligne.appendChild(el("span", "nom", m.nom || m.id));
      ligne.appendChild(el("span", "id", m.id));
      corps.appendChild(ligne);
      var ta = el("textarea", "pc-code");
      ta.readOnly = true;
      ta.value = String(m.src == null ? "" : m.src);
      corps.appendChild(ta);
      var boutons = el("div", "row");
      boutons.appendChild(miniBtn("Autoriser", "Ce mod tournera à chaque ouverture, sur ce navigateur", function () {
        decideMod(m.empreinte, "oui");
        remount();
      }, "primary"));
      boutons.appendChild(miniBtn("Refuser", "Ce mod ne tournera pas ; il reste sur le personnage", function () {
        decideMod(m.empreinte, "non");
        remount();
      }, "danger"));
      corps.appendChild(boutons);
    });
    dialogue("Mods en attente d'autorisation", corps, function () { remount(); }, "Terminer");
  }
  function bandeauAvis(app) {
    var attente = modsEnAttente();
    if (!attente.length) return;
    var n = attente.length;
    // .pc-avis-mods : le bandeau de CONSENTEMENT, distinct de celui de perte
    // d'enregistrement, qui partage la même mise en forme (voir montrePanneSave)
    var av = el("div", "pc-avis pc-avis-mods");
    av.appendChild(el("div", "pc-avis-txt",
      "Ce personnage porte " + n + " mod" + (n > 1 ? "s" : "") + " qui n'" +
      (n > 1 ? "ont" : "a") + " pas été autorisé" + (n > 1 ? "s" : "") +
      " sur ce navigateur. " + (n > 1 ? "Ils ne tournent" : "Il ne tourne") + " pas."));
    var row = el("div", "row");
    row.appendChild(miniBtn("Examiner", "Lire le code de chaque mod avant de décider", function () {
      examinerMods(attente);
    }));
    row.appendChild(miniBtn("Tout refuser", "Aucun de ces mods ne tournera sur ce navigateur", function () {
      attente.forEach(function (m) { decideMod(m.empreinte, "non"); });
      remount();
    }, "danger"));
    av.appendChild(row);
    app.appendChild(av);
  }

