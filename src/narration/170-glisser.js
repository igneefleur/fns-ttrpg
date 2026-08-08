
  // ---------- déplacer un jeton ----------
  function saisit(ev) {
    // Un jeton qu'on ne peut pas enregistrer ne doit pas bouger du tout :
    // le voir glisser puis revenir au rafraîchissement suivant serait pire que
    // de ne pas pouvoir le prendre.
    if (!peutPousser() || (ev.button != null && ev.button !== 0)) return;
    var j = ev.currentTarget, id = j.dataset.jeton;
    if (!points[id]) return;
    var base = coucheJetons.getBoundingClientRect();
    prise = { id: id, el: j, bouge: false, x0: ev.clientX, y0: ev.clientY, base: base };
    j.classList.add("prise");
    j.classList.remove("glisse");
    try { j.setPointerCapture(ev.pointerId); } catch (e) {}
    ev.preventDefault();
  }
  function deplace(ev) {
    if (!prise) return;
    if (!prise.bouge &&
        Math.abs(ev.clientX - prise.x0) < 3 && Math.abs(ev.clientY - prise.y0) < 3) return;
    prise.bouge = true;
    var b = prise.base;
    var x = clamp((ev.clientX - b.left) / b.width * MILLE, 0, MILLE);
    var y = clamp((ev.clientY - b.top) / b.height * MILLE, 0, MILLE);
    points[prise.id] = { x: x, y: y };
    pose(prise.el, points[prise.id], false);
    vise(ev.clientX, ev.clientY);
  }
  function lache(ev) {
    if (!prise) return;
    var p = prise;
    prise = null;
    p.el.classList.remove("prise");
    vise(-1, -1);
    // UNE seule écriture, au lâcher : le pont écrit un attribut à la fois,
    // espacés, et Roll20 perd les rafales. Pendant le geste, personne d'autre
    // n'a besoin de voir chaque pixel.
    if (p.mort) {
      // quelqu'un a retiré ce jeton du plateau pendant qu'on le tenait : on ne
      // le remet pas sur la table par le seul fait de l'avoir eu en main
      delete points[p.id];
      rend();
      return;
    }
    if (p.bouge) ecrire(defObj(A_PT + p.id, ecritPoint(points[p.id])));
    compte();
  }
  function vise(x, y) {
    Object.keys(placesDom).forEach(function (id) {
      var r = placesDom[id].getBoundingClientRect();
      placesDom[id].classList.toggle("vise", x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
    });
  }
  function defObj(k, v) { var o = {}; o[k] = v; return o; }
