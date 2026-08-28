  // ---------- le corps : vitesse, charge, sauts ----------
  // Quatre tuiles autonomes plutôt qu'un bloc encadré, et la grille à deux
  // colonnes les tient serrées au milieu de la fiche.
  //
  // La charge y entre parce qu'elle commande tout le reste : passé ses paliers,
  // elle rogne l'initiative, la vitesse, les sauts et l'esquive. Quand elle
  // mord, les tuiles atteintes se marquent — c'est tout ce que la fiche en dit.
  //
  // PLUS AUCUN ROUAGE SUR LES QUATRE. Chacune portait le sien, avec une valeur
  // forcée et trois modificateurs : quatre petites machines à peine différentes
  // de celles de l'initiative et de la récupération. Toutes se règlent
  // désormais dans l'onglet Options, par la même chaîne de leviers que le reste
  // de la fiche. Il ne reste ici que ce qui se lit.
  //
  // Ce que les paliers de charge font à UNE valeur, pour son infobulle. Le tri
  // par clé de calcul est ce qui empêche l'infobulle de la vitesse d'énumérer
  // des malus d'esquive : chaque tuile ne raconte que ce qui la concerne.
  function tuilePaliers(clef, verbe) {
    var out = [];
    chargePaliers().forEach(function (p) {
      if (p.calc[clef]) out.push("charge " + p.seuil + " % : " + verbe + " " + fmtP(p.calc[clef]));
    });
    return out;
  }
  // CE QUE LE LEVIER DIT DE CETTE TUILE, en une ligne. La même infobulle que
  // les blocs d'Options composent pour leur colonne de résultat : le joueur y
  // lit d'où vient l'écart entre ce que les règles donnent et ce qu'il voit.
  function tuileLevier(cle, auto) {
    return levierRegleDe(lireReserve(cle))
      ? chaineTexteDe(lireReserve(cle), "des règles", auto())
      : "";
  }

  function buildVitesse() {
    // DEUX RANGS DE DEUX : la vitesse et la charge d'abord, parce qu'on les lit
    // à chaque round ; les deux sauts en dessous, qui ne servent qu'au moment
    // où l'on saute. Les sauts sont SÉPARÉS : ce sont deux distances, dans deux
    // unités de geste différentes, et les empiler dans une seule case obligeait
    // à se rappeler laquelle venait en premier.
    var tiles = el("div", "pc-bigrow pc-bigrow-2");

    // ---- vitesse ----
    var tv = bigTile("Vitesse", vitesse);
    hooks.push(function () {
      var pal = tuilePaliers("vitesseDiv", "divisée par");
      var lev = tuileLevier("vitesse", vitesseAuto);
      // la charge ne marque la tuile que lorsqu'elle coûte vraiment des mètres :
      // un sac lourd mais sous le premier palier ne change rien
      tv.classList.toggle("adj", !!lev || pal.length > 0);
      tv.title = pal.concat(lev ? [lev] : []).join(" · ");
    });
    tiles.appendChild(tv);

    // ---- charge ----
    var tc = bigTile("Charge", function () {
      return fmtP(poidsPorte()) + " / " + fmtP(chargeMax());
    });
    hooks.push(function () {
      var haut = chargePaliers().length;
      var lev = tuileLevier("charge", chargeMaxAuto);
      tc.classList.toggle("adj", !!haut || !!lev);
      var pct = chargePct();
      tc.title = (lev ? lev : "") +
        // une charge maximale nulle rend le pourcentage infini : on le dit au
        // lieu d'afficher « Infinity % », qui passerait pour une panne
        (isFinite(pct) ? " · porté : " + Math.round(pct) + " %" : " · aucune charge maximale");
    });
    tiles.appendChild(tc);

    // ---- les deux sauts ----
    // Ils partagent le diviseur de charge mais rien d'autre, et se règlent donc
    // séparément — dans l'onglet Options, comme les deux autres.
    [["Saut longueur", sautLong, "sautLong", sautLongAuto],
     ["Saut hauteur",  sautHaut, "sautHaut", sautHautAuto]
    ].forEach(function (o) {
      var ts = bigTile(o[0], o[1]);
      hooks.push(function () {
        var pal = tuilePaliers("sautDiv", "divisés par");
        var lev = tuileLevier(o[2], o[3]);
        ts.classList.toggle("adj", !!lev || pal.length > 0);
        ts.title = pal.concat(lev ? [lev] : []).join(" · ");
      });
      tiles.appendChild(ts);
    });

    return tiles;
  }
