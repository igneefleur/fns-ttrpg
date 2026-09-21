  // ---- 6. Exposition ----
  // UNE jauge SIGNÉE : de −(borne) à +(borne), zéro au milieu. Aucune table du
  // froid ni du chaud n'est affichée — la fiche compte les degrés, elle ne dit
  // pas ce qu'il en coûte.
  function buildExposition() {
    var b = block("Exposition", null, "exposition");
    var row = el("div", "pc-kv");
    var k = el("span", "k", abbrCap("expo", "EXP"));
    k.title = libCap("expo", "Exposition");
    row.appendChild(k);
    row.appendChild(stepper(
      function () { return state.etat.expo; },
      function (v) { state.etat.expo = Math.round(v * 100) / 100; },
      5, "exposition"));
    var max = el("span", "max", "");
    row.appendChild(max);
    row.appendChild(el("span", "sp"));
    row.appendChild(miniBtn("Zéro", "Revenir à une exposition nulle", function () {
      state.etat.expo = 0;
      refresh();
    }));
    b.appendChild(row);

    // La barre BIDIRECTIONNELLE : un remplissage qui part du milieu vers le
    // froid ou vers le chaud, l'axe du zéro par-dessus, le curseur au-dessus de
    // tout. Grammaire pc-, classe neuve — JJK n'a rien de signé à montrer.
    //
    // LES TROIS NOMS SONT CEUX DE LA FEUILLE, et l'ORDRE compte. « fill » et
    // « cur » sont attendus en ENFANTS DIRECTS de .pc-expobar : glisser le
    // remplissage DANS l'axe le noierait dans un trait d'un pixel, et le
    // rebaptiser « curseur » lui retirerait sa position absolue — dans les deux
    // cas la jauge paraît vide, sans la moindre erreur à lire. Les trois se
    // suivent dans l'ordre de peinture : le trait du zéro reste lisible sur le
    // remplissage, et le curseur sur les deux.
    var barre = el("div", "pc-expobar");
    var rempli = el("i", "fill");
    barre.appendChild(rempli);
    var axe = el("span", "axe");
    barre.appendChild(axe);
    var curseur = el("span", "cur");
    barre.appendChild(curseur);
    b.appendChild(barre);

    // Les deux bouts, aux couleurs de la jauge (.pc-expo-ends, déjà dessiné par
    // la feuille). Une barre SIGNÉE ne dit pas d'elle-même de quel côté elle
    // penche : sans ces deux mots, il faut deviner que la gauche est le froid,
    // et un curseur posé à gauche se lit à l'envers. Deux mots, et AUCUNE
    // règle — la fiche nomme le sens, elle ne dit pas ce que le froid coûte.
    var bouts = el("div", "pc-expo-ends");
    bouts.appendChild(el("span", "f", "Froid"));
    bouts.appendChild(el("span", "c", "Chaud"));
    b.appendChild(bouts);

    b.appendChild(ligneLeviers("expo", expoMaxAuto,
      "Vide = borne calculée ; une valeur la force. La borne basse est l'opposée de la haute."));

    var pied = el("div", "pc-comp-tools");
    var ligne = el("div", "row");
    ligne.appendChild(chatBtn(
      function () { return "Exposition — " + fmtP(state.etat.expo) + " / " + fmtP(expoMax()); },
      function () {
        return [["Niveau apporté", String(effNiveauDe("expo"))],
                ["Effondrement", String(effondrement())]];
      }));
    pied.appendChild(ligne);
    b.appendChild(pied);

    hooks.push(function () {
      var m = expoMax();
      var v = state.etat.expo;
      max.textContent = "± " + fmtP(m);
      max.classList.toggle("adj", capForce("expo") || Math.abs(v) > m);
      max.title = (capForce("expo")
        ? "Bornes forcées à ± " + fmtP(m) + " (calculées : ± " + fmtP(expoMaxAuto()) + ")"
        : provenanceCap("expo")()) +
        (d ? " · modificateurs " + sign(d) : "") +
        " — niveau d'effondrement apporté : " + effNiveauDe("expo");
      // Remplissage à partir du milieu, dans le sens du signe. Le POINT
      // D'ANCRAGE vient de la feuille et non d'ici : .fill.froid est accroché
      // par right:50 %, .fill.chaud par left:50 %. Poser un `left` en JS
      // écraserait l'ancrage du froid et ferait pousser la barre du mauvais
      // côté ; seule la LARGEUR se calcule, en pour-cent de la demi-barre.
      var part = m > 0 ? clamp(Math.abs(v) / m, 0, 1) * 50 : 0;
      rempli.classList.toggle("froid", v < 0);
      rempli.classList.toggle("chaud", v > 0);
      rempli.style.width = part + "%";
      // Le curseur est un TRAIT de deux pixels, pas une étiquette : la barre
      // est haute d'un demi-cadratin et coupe ce qui déborde, si bien qu'un
      // nombre écrit ici serait rogné. La valeur se lit au pas juste au-dessus,
      // et le maximum à côté ; le curseur ne porte que la position.
      curseur.style.left = clamp(50 + (m > 0 ? (v / m) * 50 : 0), 0, 100) + "%";
      curseur.title = "Exposition " + fmtP(v) + " sur ± " + fmtP(m);
    });
    return b;
  }

