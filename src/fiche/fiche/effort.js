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

    // Trois fonctions distinctes, toujours dans le même module : choisir un
    // effort, lire la température, puis faire avancer l'horloge.
    function section(titre) {
      var groupe = el("div", "pc-effort-section");
      groupe.appendChild(el("div", "pc-effort-section-title", titre));
      b.appendChild(groupe);
      return groupe;
    }

    // EFFORT : [sommeil | repos], puis [léger | intermédiaire | lourd].
    var effortSection = section("Effort");
    var boutons = [];
    var liste = effortsListe();
    [liste.slice(0, 2), liste.slice(2)].forEach(function (rang) {
      if (!rang.length) return;
      var bloc = el("div", "pc-segs");
      rang.forEach(function (e) {
        var bt = el("button", "c pc-toggle", EFFORT_COURT[e.cle] || e.nom);
        bt.title = e.nom;
        bt.type = "button";
        bt.setAttribute("aria-pressed", "false");
        bt.addEventListener("click", function () {
          if (state.effort !== e.cle) { state.effort = e.cle; recupSynchroniseSuivi(); }
          refresh();
        });
        bloc.appendChild(bt);
        boutons.push([bt, e.cle]);
      });
      effortSection.appendChild(bloc);
    });

    // Qualité du sommeil : les mêmes crans que « Foncer » dans Mouvement.
    var qualites = tempsDef() && Array.isArray(tempsDef().qualitesSommeil) ? tempsDef().qualitesSommeil : [];
    var sommeilQualite = el("div", "pc-segs pc-crans pc-sommeil-qualite");
    var boutonsQualite = [];
    qualites.forEach(function (q) {
      var bt = el("button", "c pc-toggle", (q.mod > 0 ? "+" : "") + q.mod);
      bt.type = "button";
      bt.setAttribute("aria-pressed", "false");
      bt.title = q.nom + (num(q.mod, 0) ? " (" + (q.mod > 0 ? "+" : "") + q.mod + " niveaux)" : " (niveau normal)");
      bt.addEventListener("click", function () {
        if (state.qualiteSommeil !== q.cle) { state.qualiteSommeil = q.cle; recupSynchroniseSuivi(); }
        refresh();
      });
      sommeilQualite.appendChild(bt);
      boutonsQualite.push([bt, q.cle]);
    });
    sommeilQualite.style.display = (state.effort === "sommeil" && qualites.length) ? "" : "none";
    effortSection.appendChild(sommeilQualite);

    // TEMPS : [ MONDE | saisie ou valeur partagée | °C ]. MONDE occupe la
    // moitié du rang ; le champ prend ce qui reste après la case d'unité.
    var tempsSection = section("Temps");
    var air = el("div", "pc-segs pc-effort-temperature");
    var monde = el("button", "c pc-toggle", "MONDE");
    monde.type = "button";
    monde.setAttribute("aria-pressed", state.temperatureMonde === true ? "true" : "false");
    monde.addEventListener("click", function () {
      state.temperatureMonde = state.temperatureMonde !== true;
      if (state.temperatureMonde) demarreSondeTemperatureMonde();
      else arreteSondeTemperatureMonde();
      refresh();
    });
    air.appendChild(monde);

    var temperature = el("input", "c pc-field pc-effort-temperature-input");
    temperature.type = "number";
    temperature.step = "0.1";
    temperature.min = "-999";
    temperature.max = "999";
    temperature.setAttribute("aria-label", "Température en °C");
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
    air.appendChild(temperature);
    air.appendChild(el("span", "c pc-info pc-effort-temperature-unit", "°C"));
    tempsSection.appendChild(air);
    if (state.temperatureMonde === true) demarreSondeTemperatureMonde();

    // ÉCOULEMENT : trois actions ponctuelles, puis les saisies qui permettent
    // de faire passer ou reculer une durée choisie par le joueur.
    var ecoulementSection = section("Écoulement");
    var rapide = el("div", "pc-segs pc-temps-rapide");
    [
      { nom: "RND", secondes: 3, titre: "Avancer le temps d'un round (3 secondes)", message: "1 round écoulé." },
      { nom: "MIN", secondes: 60, titre: "Avancer le temps d'une minute", message: "1 minute écoulée." },
      { nom: "HR", secondes: 3600, titre: "Avancer le temps d'une heure", message: "1 heure écoulée." }
    ].forEach(function (pas) {
      var bt = el("button", "c pc-action", pas.nom);
      bt.type = "button";
      bt.title = pas.titre;
      bt.setAttribute("aria-label", pas.titre);
      bt.addEventListener("click", function () {
        var fait = avancerSecondes(pas.secondes);
        refresh();
        if (fait) flash(pas.message);
      });
      rapide.appendChild(bt);
    });
    ecoulementSection.appendChild(rapide);

    // Trois champs de durée : la saisie, l'unité informative et l'action sont
    // trois objets visuellement distincts (champ / information / bouton).
    function geste(unite, secondesParUnite, etiquette) {
      var cmd = el("div", "pc-segs pc-temps-segs");
      var nb = el("input", "c pc-field pc-temps-val");
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
        var abs = Math.abs(sec), compte, texte, accord;
        if (abs % 3600 === 0) {
          compte = abs / 3600; texte = compte + (compte === 1 ? " heure" : " heures");
          accord = compte === 1 ? "ée" : "ées";
        } else if (abs % 60 === 0) {
          compte = abs / 60; texte = compte + (compte === 1 ? " minute" : " minutes");
          accord = compte === 1 ? "ée" : "ées";
        } else if (abs % 3 === 0) {
          compte = abs / 3; texte = compte + (compte === 1 ? " round" : " rounds");
          accord = compte === 1 ? "é" : "és";
        } else {
          compte = abs; texte = compte + (compte === 1 ? " seconde" : " secondes");
          accord = compte === 1 ? "ée" : "ées";
        }
        flash(texte + (sec > 0 ? " écoul" : " recul") + accord + ".");
      }
      nb.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); applique(); }
      });
      cmd.appendChild(nb);
      cmd.appendChild(el("span", "c pc-info pc-temps-unite", unite));
      var appliquer = el("button", "c pc-action pc-temps-appliquer", "APPLIQUER");
      appliquer.type = "button";
      appliquer.title = "Faire passer ce temps";
      appliquer.addEventListener("click", applique);
      cmd.appendChild(appliquer);
      ecoulementSection.appendChild(cmd);
    }
    geste("RND", 3, "Rounds de 3 secondes, en plus ou en moins");
    geste("MIN", 60, "Minutes, en plus ou en moins");
    geste("HR", 3600, "Heures, en plus ou en moins");

    // Les raccourcis restent en dernier : ils avancent l'horloge d'une unité.
    ecoulementSection.appendChild(rapide);

    hooks.push(function () {
      boutons.forEach(function (x) {
        var actif = x[1] === state.effort;
        x[0].classList.toggle("on", actif);
        x[0].setAttribute("aria-pressed", actif ? "true" : "false");
      });
      sommeilQualite.style.display = (state.effort === "sommeil" && qualites.length) ? "" : "none";
      boutonsQualite.forEach(function (x) {
        var actif = x[1] === state.qualiteSommeil;
        x[0].classList.toggle("on", actif);
        x[0].setAttribute("aria-pressed", actif ? "true" : "false");
      });
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
