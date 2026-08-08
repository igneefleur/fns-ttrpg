  // La géométrie de la barre, mesurée et non devinée : c'est elle qui dit où le
  // plateau ancré commence. Une barre repliée ou pas encore peinte ne compte
  // pas — le plateau retombe alors sur sa place flottante, plutôt que de se
  // coller à un fantôme.
  // COLLÉ VEUT DIRE COLLÉ : zéro pixel entre la barre et le plateau, et pas un
  // seul pixel DESSOUS non plus.
  function barreRect() {
    var b = document.getElementById("master-toolbar") ||
            document.getElementById("vm-master-toolbar");
    if (!b || !b.getBoundingClientRect) return null;
    var r = null;
    try { r = b.getBoundingClientRect(); } catch (e) { return null; }
    if (!r || r.width < 8 || r.height < 8) return null;
    return r;
  }
  // La largeur se borne AVANT l'abscisse, et l'abscisse tient compte de la
  // largeur retenue : les borner séparément laissait un panneau large posé au
  // bord droit déborder de la fenêtre (état hérité d'un grand écran, fenêtre
  // rétrécie ensuite). En hauteur on ne retient que la barre de titre : un
  // panneau plus haut que la fenêtre doit pouvoir dépasser par le bas, sinon il
  // remonterait tout seul dès qu'on réduit la fenêtre.
  function panBorne(e) {
    var vw = window.innerWidth || 1200, vh = window.innerHeight || 800;
    e.w = Math.max(PAN_MIN_W, Math.min(e.w, Math.max(PAN_MIN_W, vw - 20)));
    e.h = Math.max(PAN_MIN_H, Math.min(e.h, Math.max(PAN_MIN_H, vh - 20)));
    e.x = Math.max(0, Math.min(e.x, Math.max(0, vw - e.w)));
    e.y = Math.max(0, Math.min(e.y, Math.max(0, vh - 28)));
    return e;
  }
  // L'état ne vaut pas une écriture par pixel parcouru : on attend la fin du
  // geste (le storage est asynchrone, et Roll20 n'a pas besoin de ça).
  function panRange() {
    if (panEcrit) clearTimeout(panEcrit);
    panEcrit = setTimeout(function () {
      panEcrit = null;
      try {
        var o = {};
        o[PAN_CLE] = panEtat;
        browser.storage.local.set(o);
      } catch (e) {}
    }, 400);
  }
  // ANCRÉ vaut « ancré ET une barre pour s'y coller ». Sans barre, l'état a beau
  // dire ancré, il n'y a rien où s'accrocher : on retombe sur le flottant, qui
  // marche partout. C'est ce qui tient la promesse « si la barre n'existe pas,
  // aucun chemin d'accès existant ne disparaît ».
  function panAncre() { return !!(panEtat && panEtat.ancre) && !!barreRect(); }
  // Collé à la barre, pleine hauteur. La largeur reste celle que le joueur (ou
  // la page du plateau) a demandée, bornée à ce qui tient à droite de la barre.
  // GRAND ET CENTRÉ, LE TEMPS D'UN RÉGLAGE. Une géométrie de PASSAGE : elle
  // n'est jamais rangée dans le stockage, et panApplique() la retrouve tant
  // qu'elle est posée. À la fermeture, on la jette et le panneau reprend
  // exactement la place qu'il avait, ancrée ou flottante.
  var panGeoGrande = null;
  function panGrand(on) {
    if (!on) { panGeoGrande = null; panApplique(); return; }
    var vw = window.innerWidth || 1200, vh = window.innerHeight || 800;
    var w = Math.max(PAN_MIN_W, Math.min(760, vw - 80));
    var h = Math.max(PAN_MIN_H, Math.min(640, vh - 80));
    panGeoGrande = { x: Math.round((vw - w) / 2), y: Math.round((vh - h) / 2), w: w, h: h };
    panApplique();
  }
  function panGeoAncree() {
    var vw = window.innerWidth || 1200, vh = window.innerHeight || 800;
    var r = barreRect();
    // ON NE GLISSE PAS SOUS LA BARRE. Un chevauchement de dix pixels avait été
    // essayé pour boucher le creux du coin arrondi : il faisait passer la place
    // du MJ sous la boîte à outils, ce que l'auteur avait explicitement exclu.
    // Le creux se règle par un coin arrondi, pas en poussant le plateau dessous.
    var x = r ? Math.round(r.right) : PAN_DEF.x;
    var y = r ? Math.max(0, Math.round(r.top)) : PAN_DEF.y;
    return {
      x: x, y: y,
      w: Math.max(PAN_MIN_W, Math.min(panEtat.w, Math.max(PAN_MIN_W, vw - x - 8))),
      // LA MÊME HAUTEUR QUE LA BOÎTE À OUTILS, exactement. Le plateau prenait
      // toute la fenêtre et descendait bien plus bas que la barre : posés côte à
      // côte, les deux ne formaient pas un bloc. On suit donc la barre, sans
      // plancher qui la contredirait — si elle est courte, le plateau est court.
      h: r ? Math.round(r.height) : Math.max(PAN_MIN_H, vh - y - 8)
    };
  }
  function panApplique() {
    if (!panBoite) return;
    var ancre = panAncre() && panEtat.ouvert;
    // FERMÉ, DEUX VISAGES. Quand la barre porte le bouton, fermer efface le
    // plateau : c'est le bouton qui le rouvre, une étiquette de plus sur la
    // carte ne servirait à rien. Sans bouton (barre absente, ou Roll20 qui a
    // changé de barre), fermer se contente de replier le panneau à son
    // étiquette — sinon il n'y aurait plus AUCUN moyen de le rouvrir.
    var efface = !panEtat.ouvert && barreOK;
    panBoite.style.display = efface ? "none" : "";
    panBoite.classList.toggle("jjk-panneau-ancre", ancre);
    // Le coin bas-gauche ne s'arrondit que s'il se VOIT : quand la barre descend
    // jusqu'au bas de la fenêtre, ce coin est hors champ et un arrondi y
    // dessinerait une encoche dans le vide. Le CSS ne peut pas mesurer la barre,
    // c'est donc ici qu'on tranche.
    var rb = ancre ? barreRect() : null;
    panBoite.classList.toggle("jjk-panneau-bas-plein",
      !!(rb && rb.bottom >= (window.innerHeight || 800) - 4));
    panBoite.classList.toggle("jjk-panneau-replie", !panEtat.ouvert && !efface);
    // La géométrie de passage (réglages ouverts) l'emporte sur tout : ancré ou
    // flottant, on veut le dialogue grand et au centre. Elle disparaît d'elle
    // même à la fermeture, sans avoir rien écrit.
    var g = panGeoGrande ? panGeoGrande : (ancre ? panGeoAncree() : panEtat);
    if (panGeoGrande) { panBoite.classList.remove("jjk-panneau-ancre"); }
    panBoite.style.left = g.x + "px";
    panBoite.style.top = g.y + "px";
    // replié, le panneau se réduit à son étiquette : une barre de 380 px de
    // large pour un seul mot occuperait le haut de la carte pour rien
    panBoite.style.width = panEtat.ouvert ? g.w + "px" : "auto";
    panBoite.style.height = panEtat.ouvert ? g.h + "px" : "auto";
    if (panBtn) {
      panBtn.textContent = barreOK ? "×" : (panEtat.ouvert ? "–" : "+");
      panBtn.title = barreOK ? "Fermer le plateau"
                             : (panEtat.ouvert ? "Replier le plateau" : "Déplier le plateau");
    }
    // Le bouton « Détacher » n'a de sens que là où il y a une barre : sans
    // barre, le plateau est déjà flottant et le rester est son seul choix.
    if (panBtnAncre) {
      var possible = !!barreRect();
      panBtnAncre.style.display = possible ? "" : "none";
      panBtnAncre.textContent = panEtat.ancre ? "⇲" : "⇱";
      panBtnAncre.title = panEtat.ancre ? "Détacher" : "Ancrer";
    }
    barrePeint();
  }
