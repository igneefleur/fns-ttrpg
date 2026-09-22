  // ---- Temps ----
  // L'effort que fournit le personnage et l'air qu'il respire, puis le geste
  // qui fait passer le temps : on tape un nombre de tranches de dix minutes
  // (m) ou d'heures (h), et « Appliquer » fait bouger repos, satiété,
  // hydratation et exposition comme les règles le disent, tranche après
  // tranche. UN NOMBRE NÉGATIF FAIT RECULER LE TEMPS : c'est le rattrapage
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
        bt.addEventListener("click", function () { state.effort = e.cle; refresh(); });
        bloc.appendChild(bt);
        boutons.push([bt, e.cle]);
      });
      b.appendChild(bloc);
    });

    var air = el("div", "pc-crow-bot");
    air.appendChild(el("span", "lbl", "Température"));
    air.appendChild(stepper(
      function () { return num(state.temperature, 0); },
      function (v) { state.temperature = clamp(Math.round(v * 10) / 10, -999, 999); },
      1, "°C"));
    b.appendChild(air);

    // DEUX GESTES, un par unité : « 10 m », des tranches de dix minutes ;
    // « 1 h », des heures, qui valent leurs tranches passées une à une.
    function geste(unite, parUnite, etiquette) {
      var cmd = el("div", "pc-vital-cmd pc-temps");
      var nb = el("input", "pc-vital-delta");
      nb.type = "number"; nb.step = "1";
      nb.placeholder = "±";
      nb.setAttribute("aria-label", etiquette);
      function applique() {
        var n = parseInt(nb.value, 10);
        if (!isFinite(n) || !n) return;
        var min = avancerTemps(n * parUnite());
        nb.value = "";
        refresh();
        if (min > 0) flash(min + " minutes écoulées.");
        else if (min < 0) flash(-min + " minutes reculées.");
      }
      nb.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); applique(); }
      });
      cmd.appendChild(nb);
      cmd.appendChild(el("span", "pc-temps-unite", unite));
      cmd.appendChild(miniBtn("Appliquer", "Faire passer ce temps", applique));
      b.appendChild(cmd);
    }
    geste((tempsDef() ? tempsDef().tranche : 10) + " m", function () { return 1; },
          "Tranches de dix minutes, en plus ou en moins");
    geste("1 h", tranchesParHeure, "Heures, en plus ou en moins");

    hooks.push(function () {
      boutons.forEach(function (x) { x[0].classList.toggle("on", x[1] === state.effort); });
    });
    return b;
  }
