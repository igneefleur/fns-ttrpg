  // ---- Temps ----
  // L'effort que fournit le personnage et l'air qu'il respire, puis le geste
  // qui fait passer l'horloge interne : round (3 s), minute ou heure. Le moteur
  // temporel s'occupe ensuite des récupérations, de la survie et de l'exposition.
  // UN NOMBRE NÉGATIF FAIT RECULER LE TEMPS : c'est le rattrapage
  // d'une erreur de saisie. Aucune règle n'est écrite ici : les efforts, les
  // taux et les paliers viennent des données.
  // l'affichage d'un effort dont le nom ne tient pas dans sa case
  var EFFORT_COURT = { intermediaire: "Inter" };
  var temperatureMondeSondeTimer = null, temperatureMondeSondeEcoute = false;
  function recoitTemperatureMonde(ev) {
    if (ev.source !== window.top) return;
    var d = ev.data;
    if (!d || d.ns !== "owd" || d.type !== "monde-temperature-result") return;
    var valeur = d.available === true && typeof d.temperature === "number" &&
      Number.isFinite(d.temperature) && Math.abs(d.temperature) <= 999 ? d.temperature : null;
    var disponible = valeur !== null;
    var etat = !d.found ? "absent" : d.status === "echec" ? "echec" :
      d.status !== "sur" ? "attente" : disponible ? "disponible" : "sans-valeur";
    if (temperatureMondeValeur === valeur && temperatureMondeDisponible === disponible && temperatureMondeEtat === etat) return;
    temperatureMondeValeur = valeur;
    temperatureMondeDisponible = disponible;
    temperatureMondeEtat = etat;
    if (state.temperatureMonde === true) refresh();
  }
  function demandeTemperatureMonde() {
    try { window.top.postMessage({ ns: "owd", type: "monde-temperature" }, "*"); } catch (e) {}
  }
  function demarreSondeTemperatureMonde() {
    if (!COMPACT || window.top === window) return;
    if (!temperatureMondeSondeEcoute) {
      window.addEventListener("message", recoitTemperatureMonde);
      temperatureMondeSondeEcoute = true;
    }
    if (temperatureMondeSondeTimer !== null) return;
    temperatureMondeValeur = null;
    temperatureMondeDisponible = false;
    temperatureMondeEtat = "attente";
    demandeTemperatureMonde();
    temperatureMondeSondeTimer = window.setInterval(demandeTemperatureMonde, 2000);
  }
  function arreteSondeTemperatureMonde() {
    if (temperatureMondeSondeTimer !== null) {
      window.clearInterval(temperatureMondeSondeTimer);
      temperatureMondeSondeTimer = null;
    }
  }
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

    // TEMPÉRATURE : [ Monde | valeur ]. Le premier segment active/désactive
    // la lecture de la température partagée ; le second reste la saisie locale
    // lorsqu'il est désactivé, et devient une lecture seule lorsque lié.
    var air = el("div", "pc-segs pc-effort-temperature");
    var monde = el("button", "c", "Monde");
    monde.type = "button";
    monde.setAttribute("aria-pressed", state.temperatureMonde === true ? "true" : "false");
    monde.addEventListener("click", function () {
      state.temperatureMonde = state.temperatureMonde !== true;
      if (state.temperatureMonde) demarreSondeTemperatureMonde();
      else arreteSondeTemperatureMonde();
      refresh();
    });
    air.appendChild(monde);

    var temperature = el("input", "pc-effort-temperature-input");
    temperature.type = "number";
    temperature.step = "0.1";
    temperature.min = "-999";
    temperature.max = "999";
    temperature.setAttribute("aria-label", "Température en °C");
    var valeurAir = el("label", "c pc-effort-temperature-value");
    valeurAir.appendChild(temperature);
    valeurAir.appendChild(el("span", "pc-effort-temperature-unit", "°C"));
    temperature.addEventListener("input", function () {
      if (state.temperatureMonde === true || temperature.value === "") return;
      var v = Number(temperature.value);
      if (!Number.isFinite(v) || Math.abs(v) > 999) return;
      state.temperature = clamp(Math.round(v * 10) / 10, -999, 999);
      refresh();
    });
    temperature.addEventListener("change", function () {
      if (state.temperatureMonde === true) return;
      var v = Number(temperature.value);
      if (temperature.value !== "" && Number.isFinite(v) && Math.abs(v) <= 999)
        state.temperature = clamp(Math.round(v * 10) / 10, -999, 999);
      refresh();
    });
    air.appendChild(valeurAir);
    b.appendChild(air);
    if (state.temperatureMonde === true) demarreSondeTemperatureMonde();

    // TROIS GESTES, tous branchés sur la même horloge à la seconde.
    function geste(unite, secondesParUnite, etiquette) {
      var cmd = el("div", "pc-segs pc-temps-segs");
      var nb = el("input", "c pc-temps-val");
      champNombreSigne(nb); nb.step = "1";
      nb.placeholder = "±";
      nb.setAttribute("aria-label", etiquette);
      function applique() {
        var n = Math.trunc(litNombreSigne(nb.value));
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
      var liee = state.temperatureMonde === true;
      monde.classList.toggle("on", liee);
      monde.setAttribute("aria-pressed", liee ? "true" : "false");
      monde.title = liee ? "Utiliser la température de Monde — activé" : "Utiliser la température de Monde — désactivé";
      temperature.readOnly = liee;
      if (liee) {
        if (document.activeElement !== temperature || temperature.readOnly)
          temperature.value = temperatureMondeDisponible ? String(temperatureMondeValeur) : "";
        temperature.placeholder = temperatureMondeDisponible ? "" : "—";
        temperature.title = temperatureMondeDisponible
          ? "Température actuelle du personnage Monde"
          : (temperatureMondeEtat === "absent" ? "Personnage Monde introuvable ; la température manuelle est utilisée pour les calculs."
            : temperatureMondeEtat === "echec" ? "Impossible de lire le personnage Monde ; la température manuelle est utilisée pour les calculs."
            : temperatureMondeEtat === "sans-valeur" ? "Aucune température définie dans Monde ; la température manuelle est utilisée pour les calculs."
            : "En attente de la température du personnage Monde ; la température manuelle est utilisée pour les calculs.");
      } else {
        if (document.activeElement !== temperature) temperature.value = String(num(state.temperature, 0));
        temperature.placeholder = "";
        temperature.title = "Température manuelle du personnage";
      }
    });
    return b;
  }
