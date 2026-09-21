  // ---------- le jeu de données ----------
  // Tout ce qui suit LIT owd-creation.json et n'invente rien. Une clé absente
  // rend une valeur neutre (liste vide, null) : le bloc qui s'en sert affiche
  // alors un vide honnête plutôt qu'un chiffre inventé qui passerait pour une
  // règle du livre.
  function D() { return DATA || {}; }
  function caracsData() { return Array.isArray(D().caracs) ? D().caracs : []; }
  // L'ordre d'affichage des caractéristiques : celui des règles quand elles
  // sont là (les quatre maîtrises, puis les quatre réserves), la liste socle
  // sinon. Une caractéristique de l'état qui n'est plus dans les règles reste
  // affichée en queue : on ne masque pas une donnée du personnage.
  function caracsOrdre() {
    var out = [], vus = {};
    caracsData().forEach(function (c) {
      var k = c && c.cle;
      if (k && !vus[k]) { vus[k] = 1; out.push(k); }
    });
    CARACS.concat(state ? Object.keys(state.caracs || {}) : []).forEach(function (k) {
      if (!vus[k]) { vus[k] = 1; out.push(k); }
    });
    return out;
  }
  function libCarac(c) {
    var d = null;
    caracsData().forEach(function (x) { if (x && x.cle === c) d = x; });
    return (d && d.libelle) || LIBELLES_CARAC[c] || c;
  }
  function abbrCarac(c) {
    var d = null;
    caracsData().forEach(function (x) { if (x && x.cle === c) d = x; });
    return (d && d.abbr) || ABBR[c] || String(c).slice(0, 3).toUpperCase();
  }
  // Les rangs de compétence, du 0 (non initié) au Rang Max. Dés, bonus, prix et
  // point de rupture viennent tous d'ici : AUCUN barème n'est écrit dans ce
  // fichier, et aucune table n'est affichée — ce sont les infobulles des crans
  // qui portent la décomposition.
  function rangs() { return Array.isArray(D().rangs) ? D().rangs : []; }
  function rangMax() { return Math.max(0, rangs().length - 1); }
  function rangInfo(i) {
    var r = rangs();
    if (!r.length) return { rang: 0, nom: "", des: 0, bonus: 0, xp: 0, rupture: 0, initiale: "?" };
    return r[clamp(num(i, 0), 0, r.length - 1)];
  }
  function rangInitiale(r) {
    if (r && r.initiale) return String(r.initiale).charAt(0).toUpperCase();
    return String((r && r.nom) || "?").charAt(0).toUpperCase();
  }
  // L'infobulle d'un cran : le rang COMPLET, tel que les règles le donnent.
  // C'est le seul endroit où le barème paraît, et il ne paraît qu'au survol.
  function rangTitre(r) {
    if (!r) return "";
    var t = (r.nom || "Rang " + r.rang) + " — Rang " + r.rang +
            " · " + r.des + (r.des > 1 ? " dés" : " dé") +
            " · " + sign(r.bonus || 0);
    if (r.xp) t += " · " + r.xp + " XP";
    if (r.rupture) t += " · " + r.rupture + " point de rupture";
    return t;
  }
  function faces() { var n = num((D().des || {}).faces, 8); return n > 1 ? n : 8; }
  function deDe(n) { return String(n) + "d" + faces(); }
  // Dés d'action reçus par tour, et ce qu'une technique peut en engager.
  function desActionBase() { return num((D().des || {}).actionParTour, 0); }
  function desTechnique() { return num((D().des || {}).techniqueMax, desActionBase()); }
  function rupturePoints() { return num((D().rupture || {}).points, 0); }
  // La définition d'une capacité dérivée : base, caractéristique, facteur ou
  // diviseur, et la formule VERBATIM du livre (que la fiche n'affiche pas,
  // mais dont elle se sert pour décomposer une infobulle).
  function capacites() { return Array.isArray(D().capacites) ? D().capacites : []; }
  function capDef(cle) {
    var out = null;
    capacites().forEach(function (c) { if (c && c.cle === cle) out = c; });
    return out;
  }
  function libCap(cle, repli) {
    var d = capDef(cle);
    return (d && d.libelle) || repli || cle;
  }
  function abbrCap(cle, repli) {
    var d = capDef(cle);
    return (d && d.abbr) || repli || String(cle).toUpperCase();
  }
  function effDef() { return D().effondrement || {}; }
  function climatDef() { return D().climat || {}; }
  function monnaie(pluriel) {
    var m = D().monnaie || {};
    return (pluriel ? m.pluriel : m.nom) || (pluriel ? "pièces d'argent" : "pièce d'argent");
  }
  function typesDegats() { return Array.isArray(D().typesDegats) ? D().typesDegats : []; }
  function armesData() { return Array.isArray(D().armes) ? D().armes : []; }

