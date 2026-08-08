
  function rendJetons() {
    var vus = {}, deja = {};
    // une seule traversée pour retrouver les jetons déjà posés : un
    // querySelector par jeton et par tour, c'est cinquante recherches par
    // seconde sur l'onglet de chaque joueur
    Array.prototype.forEach.call(coucheJetons.children, function (e) {
      if (e.dataset && e.dataset.jeton) deja[e.dataset.jeton] = e;
    });
    Object.keys(points).forEach(function (id) {
      vus[id] = 1;
      var j = deja[id];
      if (!j) {
        j = el("div", "nb-jeton");
        j.dataset.jeton = id;
        // Le mot « narration » était GRAVÉ sur la face du jeton : mesuré à
        // 4.83 px de haut dans un disque de 21, à 3.64:1 de contraste en nuit,
        // ce n'était plus du texte mais une tache. Il ne reste que dans
        // l'infobulle, et le jeton porte un sillon (CSS) à la place.
        j.title = "Jeton de narration";
        j.addEventListener("pointerdown", saisit);
        coucheJetons.appendChild(j);
        // un jeton neuf ne glisse pas : il apparaît là où il est
        pose(j, points[id], false);
        return;
      }
      if (prise && prise.id === id) return;   // celui qu'on tient
      pose(j, points[id], true);
    });
    Array.prototype.forEach.call(coucheJetons.querySelectorAll("[data-jeton]"), function (j) {
      if (!vus[j.dataset.jeton]) coucheJetons.removeChild(j);
    });
  }
  function pose(j, p, anime) {
    var g = (p.x / MILLE * 100) + "%", h = (p.y / MILLE * 100) + "%";
    if (j.style.left === g && j.style.top === h) return;
    j.classList.toggle("glisse", !!anime);
    j.style.left = g;
    j.style.top = h;
  }
