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
  // Une réserve qui bouge de `delta` : elle ne dépasse pas son maximum en
  // remontant, ne passe pas sous zéro en descendant, et ne corrige jamais une
  // valeur déjà hors de ces bornes. Revenue au maximum, elle redevient null
  // et suit le maximum quand il bouge.
  function bougeReserve(cle, delta) {
    var cur = courant(cle), m = maxDe(cle), v = cur + delta;
    if (delta > 0) v = Math.max(cur, Math.min(v, m));
    else if (delta < 0) v = Math.min(cur, Math.max(v, 0));
    // pas d'arrondi ici : il se fait UNE fois, après toutes les tranches, sans
    // quoi l'écart de chaque tranche s'accumulerait
    state.etat[cle] = v >= m && cur <= m ? null : v;
  }
  // Fait passer `n` tranches (de dix minutes) une à une : chaque tranche lit le
  // niveau d'exposition où la précédente l'a laissée. Rend les minutes écoulées.
  function avancerTemps(n) {
    var t = tempsDef(), e = effortDe(state.effort);
    if (!t || !e) return 0;
    var tr = num(t.tranche, 10), i;
    var rRepos = regenParMinute(num(e.repos, 0)), rSurvie = regenParMinute(num(e.survie, 0));
    for (i = 0; i < n; i++) {
      if (rRepos !== null) bougeReserve("pr", rRepos * tr);
      if (rSurvie !== null) {
        bougeReserve("ps", rSurvie * tr * facteurDepense("ps"));
        bougeReserve("ph", rSurvie * tr * facteurDepense("ph"));
      }
      var p = paliersClimat(), m = expoMax(), x = num(state.etat.expo, 0);
      if (p) x = clamp(x + p, -m, m);
      else {
        var retour = m * num(t.expoRetour, 0) / 100;
        x = x > 0 ? Math.max(0, x - retour) : Math.min(0, x + retour);
      }
      state.etat.expo = x;
    }
    ["pr", "ps", "ph", "expo"].forEach(function (k) {
      if (state.etat[k] !== null) state.etat[k] = Math.round(state.etat[k] * 100) / 100;
    });
    return n * tr;
  }
  function confort() {
    var c = climatDef();
    if (c.nuBas === undefined || c.nuHaut === undefined) return null;
    return { bas: snum(c.nuBas) - protection("froid"), haut: snum(c.nuHaut) + protection("chaud") };
  }

