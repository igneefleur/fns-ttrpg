  // ---- Temps ----
  // L'effort que fournit le personnage et l'air qu'il respire, puis le geste
  // qui fait passer l'horloge interne : round (3 s), minute ou heure. Le moteur
  // temporel s'occupe ensuite des récupérations, de la survie et de l'exposition.
  // UN NOMBRE NÉGATIF FAIT RECULER LE TEMPS : c'est le rattrapage
  // d'une erreur de saisie. Aucune règle n'est écrite ici : les efforts, les
  // taux et les paliers viennent des données.
  // l'affichage d'un effort dont le nom ne tient pas dans sa case
  var EFFORT_COURT = { intermediaire: "Inter" };
  function buildEffort() {
    var b = block("Effort et Temps");

    // LES EFFORTS, en cases soudées comme le trio de MIA, sur deux lignes
    // arrêtées par l'auteur : [sommeil | repos], puis [léger | intermédiaire |
    // lourd]. Les deux premiers efforts des règles font la première ligne.
    var boutons = [];
    var liste = effortsListe();
    [liste.slice(0, 2), liste.slice(2)].forEach(function (rang) {
      if (!rang.length) return;
      var bloc = el("div", "pc-segs");
      rang.forEach(function (e) {
        // l'étiquette courte voulue par l'auteur ; le nom entier au survol
        var bt = el("button", "c", EFFORT_COURT[e.cle] || e.nom);
        bt.title = e.nom;
        bt.type = "button";
        bt.addEventListener("click", function () {
          if (state.effort !== e.cle) { state.effort = e.cle; recupSynchroniseSuivi(); }
          refresh();
        });
        bloc.appendChild(bt);
        boutons.push([bt, e.cle]);
      });
      b.appendChild(bloc);
    });

    // QUALITÉ DU SOMMEIL : comme les crans « Foncer » de Mouvement, une
    // seule ligne segmentée, visible uniquement lorsque Sommeil est choisi.
    var qualites = tempsDef() && Array.isArray(tempsDef().qualitesSommeil) ? tempsDef().qualitesSommeil : [];
    var sommeilQualite = el("div", "pc-segs pc-crans pc-sommeil-qualite");
    var boutonsQualite = [];
    qualites.forEach(function (q) {
      var bt = el("button", "c", (q.mod > 0 ? "+" : "") + q.mod);
      bt.type = "button";
      bt.title = q.nom + (num(q.mod, 0) ? " (" + (q.mod > 0 ? "+" : "") + q.mod + " niveaux)" : " (niveau normal)");
      bt.addEventListener("click", function () {
        if (state.qualiteSommeil !== q.cle) { state.qualiteSommeil = q.cle; recupSynchroniseSuivi(); }
        refresh();
      });
      sommeilQualite.appendChild(bt);
      boutonsQualite.push([bt, q.cle]);
    });
    sommeilQualite.style.display = (state.effort === "sommeil" && qualites.length) ? "" : "none";
    b.appendChild(sommeilQualite);

    var air = el("div", "pc-crow-bot");
    air.appendChild(el("span", "lbl", "Température"));
    air.appendChild(stepper(
      function () { return num(state.temperature, 0); },
      function (v) { state.temperature = clamp(Math.round(v * 10) / 10, -999, 999); },
      1, "°C"));
    b.appendChild(air);

    // TROIS GESTES, tous branchés sur la même horloge à la seconde.
    function geste(unite, secondesParUnite, etiquette) {
      var cmd = el("div", "pc-segs pc-temps-segs");
      var nb = el("input", "c pc-temps-val");
      nb.type = "number"; nb.step = "1";
      nb.placeholder = "±";
      nb.setAttribute("aria-label", etiquette);
      function applique() {
        var n = parseInt(nb.value, 10);
        if (!isFinite(n) || !n) return;
        var sec = avancerSecondes(n * secondesParUnite);
        nb.value = "";
        refresh();
        if (!sec) return;
        var abs = Math.abs(sec), texte;
        if (abs % 3600 === 0) texte = (abs / 3600) + " h";
        else if (abs % 60 === 0) texte = (abs / 60) + " m";
        else if (abs % 3 === 0) texte = (abs / 3) + " r";
        else texte = abs + " s";
        flash(texte + (sec > 0 ? " écoulé" : " reculé") + (abs > secondesParUnite ? "s." : "."));
      }
      nb.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); applique(); }
      });
      cmd.appendChild(nb);
      cmd.appendChild(el("span", "c pc-temps-unite", unite));
      var appliquer = el("button", "c pc-temps-appliquer", "Appliquer");
      appliquer.type = "button";
      appliquer.title = "Faire passer ce temps";
      appliquer.addEventListener("click", applique);
      cmd.appendChild(appliquer);
      b.appendChild(cmd);
    }
    geste("1 r", 3, "Rounds de 3 secondes, en plus ou en moins");
    geste("1 m", 60, "Minutes, en plus ou en moins");
    geste("1 h", 3600, "Heures, en plus ou en moins");

    hooks.push(function () {
      boutons.forEach(function (x) { x[0].classList.toggle("on", x[1] === state.effort); });
      sommeilQualite.style.display = (state.effort === "sommeil" && qualites.length) ? "" : "none";
      boutonsQualite.forEach(function (x) { x[0].classList.toggle("on", x[1] === state.qualiteSommeil); });
    });
    return b;
  }
