
  // ---------- distribution ----------
  // Réutiliser les identifiants existants avant d'en créer : sur dix sessions,
  // créer à chaque fois laisserait des dizaines d'attributs morts dans le
  // personnage. Ce qui dépasse est vidé (valeur vide = jeton retiré).
  function distribue() {
    var l = places();
    var voulus = [];
    l.forEach(function (p) {
      var n = p.mj ? conf.donne.mj : conf.donne.joueur;
      for (var i = 0; i < n; i++) voulus.push(p.id);
    });
    // Réutiliser d'abord ce qu'on a sous les yeux, puis tout ce que Roll20
    // connaît : sans cette union, deux distributions successives par deux
    // joueurs laissaient sur le plateau les jetons créés par l'autre.
    var libres = Object.keys(points);
    Object.keys(connus).forEach(function (id) { if (libres.indexOf(id) < 0) libres.push(id); });
    var lot = {}, neuf = {};
    voulus.forEach(function (placeId, i) {
      // On REPREND d'abord les jetons existants (les nôtres, puis ceux que
      // Roll20 connaît) : les recréer laisserait les anciens sur la table.
      var id = libres[i];
      if (!id || neuf[id]) {
        // Un identifiant NEUF, lui, ne doit jamais retomber sur un vivant : le
        // compteur peut avoir régressé (configuration relue vide, brouillon
        // ouvert avant une distribution), et deux jetons de même nom, c'est un
        // jeton perdu sans un mot.
        do {
          conf.seq++;
          id = "p" + conf.seq;
        } while (points[id] || neuf[id] || connus[id]);
      }
      var pos = auHasardDans(placeId);
      neuf[id] = pos;
      lot[A_PT + id] = ecritPoint(pos);
    });
    libres.slice(voulus.length).forEach(function (id) { lot[A_PT + id] = ""; });
    points = neuf;
    lot[A_CONF] = JSON.stringify(conf);
    ecrire(lot);
    rend();
  }
  function ramasse() {
    var lot = {};
    Object.keys(points).forEach(function (id) {
      points[id] = auHasardDans("mj");
      lot[A_PT + id] = ecritPoint(points[id]);
    });
    ecrire(lot);
    rend();
  }
  // Une position au hasard DANS une place, avec une marge : les jetons se
  // chevauchent un peu, comme sur une vraie table, mais aucun ne déborde chez
  // le voisin ni ne se pose sur l'en-tête de la carte : la distribution
  // masquerait justement le nom et le compte qu'elle vient de changer.
  function auHasardDans(placeId) {
    var d = placesDom[placeId], base = coucheJetons.getBoundingClientRect();
    if (!d || !base.width) return { x: 500, y: 500 };
    var r = d.getBoundingClientRect();
    var tete = d.querySelector(".nb-place-tete");
    // La réserve d'en-tête est bornée à 40 % de la carte : dans une place très
    // basse (douze joueurs dans un panneau minimal), la réserve entière ne
    // laisserait plus de hauteur, et les jetons tomberaient sous la carte,
    // c'est-à-dire « hors place ».
    var haut = tete ? Math.min(tete.getBoundingClientRect().height + 2, r.height * 0.4) : 0;
    var mx = Math.min(18, r.width * 0.18), my = Math.min(12, r.height * 0.12);
    var x = r.left + mx + Math.random() * Math.max(1, r.width - 2 * mx);
    var y = r.top + haut + my + Math.random() * Math.max(1, r.height - haut - 2 * my);
    return {
      x: clamp((x - base.left) / base.width * MILLE, 0, MILLE),
      y: clamp((y - base.top) / base.height * MILLE, 0, MILLE)
    };
  }
