  // ---------- la disposition enregistrée ----------
  // Les colonnes d'un onglet ne se connaissent qu'en bâtissant son squelette :
  // on le bâtit une fois à vide, dans un élément détaché, plutôt que de recopier
  // ici une liste de colonnes qui dériverait au premier onglet remanié.
  function colonnesDe(onglet) {
    if (!aClef(SQUELETTES, onglet)) return null;
    var noms = {};
    var c = SQUELETTES[onglet](el("div"));
    Object.keys(c || {}).forEach(function (k) { noms[k] = 1; });
    return noms;
  }
  // Les colonnes d'un onglet, DANS L'ORDRE, en distinguant celles qui courent
  // sur toute la largeur. Le squelette les reconnaît lui-même : une colonne
  // pleine largeur rend le PANNEAU au lieu d'une colonne de la grille (c'est
  // ainsi que l'inventaire passe sous les deux colonnes de l'Équipement). Le
  // plan a besoin de la distinction pour se dessiner comme la fiche.
  function squeletteColonnes(onglet) {
    if (!aClef(SQUELETTES, onglet)) return null;
    var pane = el("div");
    var c = SQUELETTES[onglet](pane) || {};
    var noms = [], larges = {};
    Object.keys(c).forEach(function (k) {
      noms.push(k);
      if (c[k] === pane) larges[k] = 1;
    });
    return { noms: noms, larges: larges };
  }
  // state.modules : l'ordre d'abord, la place ensuite. Une consigne qui ne
  // désigne rien de valide (module inconnu, onglet disparu, colonne qui
  // n'existe plus dans ce squelette) est simplement ignorée : elle laisserait
  // sinon le module hors de la fiche, sans rien pour l'y ramener.
  function appliqueDisposition() {
    var d = state && state.modules;
    if (!d || typeof d !== "object") return;
    if (Array.isArray(d.ordre)) ordonne(d.ordre);
    var place = d.place;
    if (!place || typeof place !== "object") return;
    Object.keys(place).forEach(function (id) {
      var p = place[id];
      if (!p || typeof p !== "object") return;
      var i = rangModule(id);
      if (i < 0) return;
      var m = modules[i];
      var onglet = (typeof p.onglet === "string" && aClef(SQUELETTES, p.onglet)) ? p.onglet : m.onglet;
      var cols = colonnesDe(onglet) || {};
      var colonne = (typeof p.colonne === "string" && aClef(cols, p.colonne)) ? p.colonne : null;
      // l'onglet change sans que la colonne suive : celle du module n'existe
      // peut-être pas là-bas, on prend alors la première du squelette
      if (!colonne) colonne = aClef(cols, m.colonne) ? m.colonne : Object.keys(cols)[0];
      if (!colonne || (onglet === m.onglet && colonne === m.colonne)) return;
      // COPIE : la table native ne se laisse pas remanier, elle est le seul
      // moyen de rendre à un module sa place d'origine
      var copie = {};
      Object.keys(m).forEach(function (k) { copie[k] = m[k]; });
      copie.onglet = onglet;
      copie.colonne = colonne;
      modules[i] = copie;
    });
  }

