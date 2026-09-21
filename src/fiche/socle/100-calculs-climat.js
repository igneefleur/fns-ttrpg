  // ---- climat ----
  // La zone de confort du personnage HABILLÉ : les deux bornes du corps nu
  // viennent des règles (owd-creation.json), les degrés de protection de ce
  // qu'il porte. Les bornes nues ne sont jamais montrées seules : ce serait une
  // règle affichée.
  function protection(champ) {
    var t = 0;
    state.vetements.forEach(function (v) { if (v.porte) t += snum(v[champ]); });
    return Math.round(t * 10) / 10;
  }
  // ---- le temps qui passe ----
  // Tout vient de owd-creation.json (clé « temps ») : les efforts et ce qu'ils
  // coûtent, la cadence de chaque niveau de récupération, les paliers du
  // climat, le retour de l'exposition, les niveaux qui accélèrent la dépense.
  // Sans ces données, le temps ne passe pas : la fiche n'invente aucun taux.
  function tempsDef() { var t = D().temps; return (t && Array.isArray(t.efforts)) ? t : null; }
  function effortsListe() { var t = tempsDef(); return t ? t.efforts : []; }
  function effortDe(cle) {
    var out = null;
    effortsListe().forEach(function (e) { if (e.cle === cle) out = e; });
    return out;
  }
  // Points par minute d'un niveau de récupération, signés. null si la table
  // ne donne pas de durée (les cadences au round).
  function regenParMinute(niveau) {
    var t = tempsDef(), n = Math.abs(niveau), out = null;
    if (!t) return null;
    (t.regen || []).forEach(function (r) {
      if (r.niveau === n && r.minutes) out = r.points / r.minutes;
    });
    return out === null ? null : (niveau < 0 ? -out : out);
  }
  // Les paliers de froid (négatifs) ou de chaud (positifs) du personnage, à
  // la température de l'air et à l'effort qu'il fournit.
  function paliersClimat() {
    var t = tempsDef(), z = confort(), e = effortDe(state.effort);
    if (!t || !z || !e) return 0;
    var ressenti = num(state.temperature, 0) + num(e.degres, 0);
    var div = Math.max(1, num(t.paliers.diviseur, 1));
    var arr = t.paliers.arrondi === "bas" ? Math.floor : Math.ceil;
    if (ressenti < z.bas) return -arr((z.bas - ressenti) / div);
    if (ressenti > z.haut) return arr((ressenti - z.haut) / div);
    return 0;
  }
  // Le facteur de dépense d'une réserve, selon le niveau de froid ou de chaud
  // que l'exposition a atteint.
  function facteurDepense(cle) {
    var t = tempsDef(), m = expoMax(), f = 1;
    if (!t || m <= 0 || !state.etat.expo) return 1;
    var cote = state.etat.expo < 0 ? "froid" : "chaud";
    var niv = Math.floor((Math.abs(state.etat.expo) / m) * 100 / effTranche());
    ((t.accelere || {})[cote] || []).forEach(function (a) {
      if (a.reserve === cle && a.niveau <= niv) f = Math.max(f, num(a.facteur, 1));
    });
    return f;
  }
  // Une réserve qui bouge de `delta` sur tout le temps écoulé. ARRONDI CONTRE
  // LE JOUEUR, décidé par l'auteur : une perte s'arrondit au supérieur
  // (4,17 perdus = 5), un gain à l'inférieur — c'est le RÉSULTAT qui descend à
  // l'entier, ce qui efface aussi les décimales d'une fiche d'avant. Elle ne dépasse pas
  // son maximum en remontant, ne passe pas sous zéro en descendant, et ne
  // corrige jamais une valeur déjà hors de ces bornes. Revenue au maximum,
  // elle redevient null et suit le maximum quand il bouge.
  function bougeReserve(cle, delta) {
    if (!delta) return;
    var cur = courant(cle), m = maxDe(cle);
    var v = Math.floor(cur + delta);
    if (delta > 0) v = Math.max(cur, Math.min(v, m));
    else v = Math.min(cur, Math.max(v, 0));
    state.etat[cle] = v >= m && cur <= m ? null : v;
  }
  // Fait passer `n` tranches (de dix minutes) une à une : chaque tranche lit le
  // niveau d'exposition où la précédente l'a laissée. Les réserves cumulent
  // leur variation sur tout le temps et ne l'arrondissent qu'à la fin : c'est
  // la perte du temps ENTIER qui s'arrondit, pas celle de chaque tranche.
  // Rend les minutes écoulées.
  // LE JOURNAL DU TEMPS : l'état d'avant et d'après chaque passage, en
  // mémoire seulement (il ne survit pas au rechargement). Reculer restaure
  // l'état d'avant tant que la fiche est restée telle que le passage l'a
  // laissée ; sinon — une valeur retouchée à la main, une page rechargée — le
  // recul se calcule à l'envers. Sans lui, une réserve ou une exposition qui a
  // buté sur sa borne ne saurait plus d'où elle venait.
  var journalTemps = [];
  // PV et PE en font partie : l'effondrement que le passage a causé leur a
  // pris des points, et annuler le passage doit les rendre.
  var TEMPS_CLES = ["pr", "ps", "ph", "expo", "pv", "pe"];
  function photoTemps() {
    var o = {};
    TEMPS_CLES.forEach(function (k) { o[k] = state.etat[k]; });
    return o;
  }
  function memePhoto(a, b) {
    return TEMPS_CLES.every(function (k) { return a[k] === b[k]; });
  }
  function avancerTemps(n) {
    if (n < 0) return reculerTemps(-n);
    var avant = photoTemps();
    var min = avancerTempsCalcul(n);
    if (min) {
      journalTemps.push({ n: n, avant: avant, apres: photoTemps() });
      if (journalTemps.length > 50) journalTemps.shift();
    }
    return min;
  }
  function reculerTemps(n) {
    var t = tempsDef(), tr = t ? num(t.tranche, 10) : 10, fait = 0, top;
    while (n > 0 && journalTemps.length) {
      top = journalTemps[journalTemps.length - 1];
      if (top.n > n || !memePhoto(photoTemps(), top.apres)) break;
      TEMPS_CLES.forEach(function (k) { state.etat[k] = top.avant[k]; });
      journalTemps.pop();
      // l'effondrement redescend d'un coup : ce n'est pas une récupération,
      // c'est une annulation — le suivi repart de l'état restauré
      effVu = null;
      n -= top.n;
      fait += top.n;
    }
    if (n > 0) {
      journalTemps = [];
      var r = reculerTempsCalcul(n);
      if (!r) return -fait * tr;
    }
    return -(fait + n) * tr;
  }
  function avancerTempsCalcul(n) {
    var t = tempsDef(), e = effortDe(state.effort);
    if (!t || !e) return 0;
    var tr = num(t.tranche, 10), i;
    var rRepos = regenParMinute(num(e.repos, 0)), rSurvie = regenParMinute(num(e.survie, 0));
    var cumul = { pr: 0, ps: 0, ph: 0 };
    for (i = 0; i < n; i++) {
      if (rRepos !== null) cumul.pr += rRepos * tr;
      if (rSurvie !== null) {
        cumul.ps += rSurvie * tr * facteurDepense("ps");
        cumul.ph += rSurvie * tr * facteurDepense("ph");
      }
      var p = paliersClimat(), m = expoMax(), x = num(state.etat.expo, 0);
      if (p) x = clamp(x + p, -m, m);
      else {
        var retour = m * num(t.expoRetour, 0) / 100;
        x = x > 0 ? Math.max(0, x - retour) : Math.min(0, x + retour);
      }
      state.etat.expo = x;
    }
    ["pr", "ps", "ph"].forEach(function (k) { bougeReserve(k, cumul[k]); });
    // l'exposition s'arrondit en s'éloignant de zéro : contre le joueur, là aussi
    state.etat.expo = state.etat.expo < 0 ? Math.floor(state.etat.expo) : Math.ceil(state.etat.expo);
    return n * tr;
  }
  // LE TEMPS QUI RECULE, quand le journal ne suffit pas : l'inverse
  // d'avancerTempsCalcul. Les tranches se défont de la dernière à la première : chacune
  // rend d'abord à l'exposition ce que la tranche lui avait fait, puis lit
  // CETTE exposition pour savoir à quel rythme la réserve s'était dépensée.
  // Les arrondis sont les miroirs de ceux de l'aller (une perte au supérieur
  // se rend au supérieur), si bien qu'avancer puis reculer du même temps, à
  // effort et température inchangés, ramène la fiche où elle était — sauf si
  // une réserve avait buté sur zéro ou sur son maximum, ce que rien ne garde.
  // Rend les minutes reculées, en négatif.
  function reculeReserve(cle, delta) {
    if (!delta) return;
    var cur = courant(cle), m = maxDe(cle);
    var v = Math.ceil(cur - delta);
    if (delta > 0) v = Math.min(cur, Math.max(v, 0));
    else v = Math.max(cur, Math.min(v, m));
    state.etat[cle] = v >= m && cur <= m ? null : v;
  }
  function reculerTempsCalcul(n) {
    var t = tempsDef(), e = effortDe(state.effort);
    if (!t || !e) return 0;
    var tr = num(t.tranche, 10), i;
    var rRepos = regenParMinute(num(e.repos, 0)), rSurvie = regenParMinute(num(e.survie, 0));
    var cumul = { pr: 0, ps: 0, ph: 0 };
    for (i = 0; i < n; i++) {
      var p = paliersClimat(), m = expoMax(), x = num(state.etat.expo, 0);
      if (p) x = clamp(x - p, -m, m);
      else if (x) {
        var retour = m * num(t.expoRetour, 0) / 100;
        x = clamp(x + (x > 0 ? retour : -retour), -m, m);
      }
      state.etat.expo = x;
      if (rRepos !== null) cumul.pr += rRepos * tr;
      if (rSurvie !== null) {
        cumul.ps += rSurvie * tr * facteurDepense("ps");
        cumul.ph += rSurvie * tr * facteurDepense("ph");
      }
    }
    ["pr", "ps", "ph"].forEach(function (k) { reculeReserve(k, cumul[k]); });
    state.etat.expo = state.etat.expo < 0 ? Math.floor(state.etat.expo) : Math.ceil(state.etat.expo);
    return -n * tr;
  }
  // Combien de tranches dans une heure.
  function tranchesParHeure() { var t = tempsDef(); return t ? Math.max(1, Math.round(60 / num(t.tranche, 10))) : 6; }
  function confort() {
    var c = climatDef();
    if (c.nuBas === undefined || c.nuHaut === undefined) return null;
    return { bas: snum(c.nuBas) - protection("froid"), haut: snum(c.nuHaut) + protection("chaud") };
  }

