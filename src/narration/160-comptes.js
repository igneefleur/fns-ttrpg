
  // Le compte d'une place est une question de GÉOMÉTRIE : combien de jetons
  // tombent dans son rectangle. Rien n'est stocké, donc rien ne peut mentir.
  // Un plateau qu'on ne peut pas toucher doit le DIRE : sinon on pousse un
  // jeton, rien ne bouge, et on ne sait pas si c'est le droit qui manque ou le
  // logiciel qui a lâché. Trois empêchements, donc trois phrases distinctes, et
  // rien du tout quand tout va bien (le bandeau disparaît alors du panneau).
  function ditEmpechement() {
    if (!lblAvis) return;
    // Tant que le pont n'a pas dit quel est le personnage, on n'accuse
    // personne : « ecrivable » vaut faux au démarrage, et l'annoncer ferait
    // paraître un bandeau d'alerte pendant les deux premières secondes de
    // chaque ouverture, alors que rien n'est encore su. L'écran d'état, lui,
    // dit déjà ce qu'il faut si le pont ne répond pas.
    // Et tant que l'état n'est pas lu, on n'accuse pas davantage : l'écran de
    // lecture dit déjà où l'on en est, et « lecture seule » y ajouterait un
    // reproche qui n'est encore la faute de personne.
    if (!charId || !etatSur) { lblAvis.textContent = ""; return; }
    lblAvis.textContent =
      confFuture ? "Plateau réglé par une version plus récente : lecture seule."
      : !ecrivable ? "Lecture seule : ce personnage n'est pas partagé avec ce joueur."
      : refuse ? "Roll20 a refusé les dernières écritures : lecture seule."
      : "";
  }

  function compte() {
    ditEmpechement();   // avant la sortie anticipée : un empêchement se dit même panneau replié
    var base = coucheJetons.getBoundingClientRect();
    if (!base.width || !base.height) return;
    var zones = [];
    Object.keys(placesDom).forEach(function (id) {
      var r = placesDom[id].getBoundingClientRect();
      zones.push({ id: id, x1: r.left, y1: r.top, x2: r.right, y2: r.bottom, n: 0 });
    });
    var libres = 0, total = 0;
    Object.keys(points).forEach(function (id) {
      total++;
      var px = base.left + points[id].x / MILLE * base.width;
      var py = base.top + points[id].y / MILLE * base.height;
      var dans = null, meilleure = null, dmin = Infinity;
      for (var i = 0; i < zones.length; i++) {
        var z = zones[i];
        if (px >= z.x1 && px <= z.x2 && py >= z.y1 && py <= z.y2) { dans = z; break; }
        // distance au rectangle, pour la gouttière (voir plus bas)
        var dx = px < z.x1 ? z.x1 - px : px > z.x2 ? px - z.x2 : 0;
        var dy = py < z.y1 ? z.y1 - py : py > z.y2 ? py - z.y2 : 0;
        var d = Math.max(dx, dy);
        if (d < dmin) { dmin = d; meilleure = z; }
      }
      // Un jeton tombé dans le filet de quelques pixels qui sépare deux places
      // revient à la plus proche. Sans cela il serait « hors place » chez celui
      // qui a un grand panneau et chez son voisin sur un petit : le filet est
      // en pixels, tout le reste en proportions, et deux joueurs liraient des
      // comptes différents du même plateau.
      if (!dans && meilleure && dmin <= 6) dans = meilleure;
      if (dans) dans.n++; else libres++;
    });
    zones.forEach(function (z) {
      var c = placesDom[z.id].querySelector(".nb-place-compte");
      c.textContent = String(z.n);
      c.classList.toggle("zero", !z.n);
    });
    lblTotal.textContent = String(total);
    // Le zéro se dit en encre pâle et perd sa graisse, comme partout dans la
    // fiche : c'est un état neutre, pas une valeur à lire.
    boiteTotal.classList.toggle("zero", !total);
    lblHors.textContent = String(libres);
    boiteHors.hidden = !libres;
  }
