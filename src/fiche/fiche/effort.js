  // ---- Effort et température ----
  // L'effort que fournit le personnage et l'air qu'il respire, puis le geste
  // qui fait passer le temps : on tape un nombre de tranches de dix minutes,
  // et « Appliquer » fait bouger repos, satiété, hydratation et exposition
  // comme les règles le disent, tranche après tranche. Aucune règle n'est
  // écrite ici : les efforts, les taux et les paliers viennent des données.
  function buildEffort() {
    var b = block("Effort et température");

    // les efforts, un bouton chacun, dans l'ordre des règles
    var bande = el("div", "pc-tabs mini pc-efforts");
    var boutons = [];
    effortsListe().forEach(function (e) {
      var bt = el("button", "pc-tab", e.nom);
      bt.type = "button";
      bt.addEventListener("click", function () { state.effort = e.cle; refresh(); });
      bande.appendChild(bt);
      boutons.push([bt, e.cle]);
    });
    b.appendChild(bande);

    var air = el("div", "pc-crow-bot");
    air.appendChild(el("span", "lbl", "Température"));
    air.appendChild(stepper(
      function () { return num(state.temperature, 0); },
      function (v) { state.temperature = clamp(Math.round(v * 10) / 10, -999, 999); },
      1, "°C"));
    b.appendChild(air);

    // DEUX GESTES, un par unité : des tranches de dix minutes, ou des heures.
    // Une heure vaut ses tranches, passées une à une comme les autres.
    function geste(unite, parUnite, etiquette) {
      var cmd = el("div", "pc-vital-cmd pc-temps");
      var nb = el("input", "pc-vital-delta");
      nb.type = "number"; nb.min = "1"; nb.step = "1";
      nb.placeholder = unite;
      nb.setAttribute("aria-label", etiquette);
      function applique() {
        var n = parseInt(nb.value, 10);
        if (!isFinite(n) || n < 1) return;
        var min = avancerTemps(n * parUnite());
        nb.value = "";
        refresh();
        if (min) flash(min + " minutes écoulées.");
      }
      nb.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); applique(); }
      });
      cmd.appendChild(nb);
      cmd.appendChild(miniBtn("Appliquer", "Faire passer ce temps", applique));
      b.appendChild(cmd);
    }
    geste("× " + (tempsDef() ? tempsDef().tranche : 10) + " min", function () { return 1; },
          "Tranches de dix minutes à faire passer");
    geste("× 1 h", tranchesParHeure, "Heures à faire passer");

    hooks.push(function () {
      boutons.forEach(function (x) { x[0].classList.toggle("on", x[1] === state.effort); });
    });
    return b;
  }
