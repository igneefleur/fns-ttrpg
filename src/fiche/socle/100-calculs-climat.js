  // ---- climat ----
  // La zone de confort du personnage HABILLÉ : les deux bornes du corps nu
  // viennent des règles (owd-creation.json), les degrés de protection de ce
  // qu'il porte. Les bornes nues ne sont jamais montrées seules : ce serait une
  // règle affichée.
  // la protection des VÊTEMENTS PORTÉS, dans la case de leur type
  function protection(champ) {
    var t = 0;
    vetementsPortes().forEach(function (o) { t += snum(o[champ]); });
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

  // ---- récupérations naturelles ----
  // Le LIVRE donne les valeurs ; le personnage ne garde que les corrections
  // qu'il a posées depuis le module « Récupération ». Elles vivent dans le
  // coffre du module, déjà persisté dans modData : aucune clé racine nouvelle,
  // aucune migration de schéma pour une simple valeur réglable.
  function recupsListe() {
    var t = tempsDef();
    return t && Array.isArray(t.recuperations) ? t.recuperations : [];
  }
  function recupCoffre(cree) {
    if (!state.modData || typeof state.modData !== "object") {
      if (!cree) return {};
      state.modData = {};
    }
    var d = state.modData.recuperation;
    if (!d || typeof d !== "object" || Array.isArray(d)) {
      if (!cree) return {};
      d = {}; state.modData.recuperation = d;
    }
    return d;
  }
  function recupNiveauRegle(r) { return Math.round(num(r && r.niveau, 0)); }
  function recupNiveauBase(r) {
    var d = recupCoffre(false), n = d.niveaux && d.niveaux[r.id];
    return isFinite(Number(n)) ? Math.round(Number(n)) : recupNiveauRegle(r);
  }
  function ecritRecupNiveau(r, v) {
    if (!r || !r.id) return;
    var t = tempsDef(), max = 20;
    if (t && Array.isArray(t.regen) && t.regen.length) {
      max = 0; t.regen.forEach(function (x) { max = Math.max(max, num(x.niveau, 0)); });
    }
    v = clamp(Math.round(num(v, recupNiveauRegle(r))), -max, max);
    var d = recupCoffre(true);
    if (!d.niveaux || typeof d.niveaux !== "object" || Array.isArray(d.niveaux)) d.niveaux = {};
    if (v === recupNiveauRegle(r)) delete d.niveaux[r.id];
    else d.niveaux[r.id] = v;
    if (!Object.keys(d.niveaux).length) delete d.niveaux;
    // Ne jamais laisser un coffre vide dans le personnage.
    if (!Object.keys(d).length) delete state.modData.recuperation;
  }
  function recupDefParId(id) {
    var out = null;
    recupsListe().forEach(function (r) { if (r.id === id) out = r; });
    return out;
  }
  function recupCondition(r) {
    if (!r) return false;
    if (r.condition === "effort") return state.effort === r.valeur;
    if (r.condition === "sommeil") return (state.effort === "sommeil") === !!r.valeur;
    return false;
  }
  function recupManqueSommeil(niveau, r) {
    var t = tempsDef(), m = t && t.recupManqueSommeil;
    if (!m || r.reserve !== m.reserve || (m.id && r.id !== m.id)) return niveau;
    var max = maxDe(m.source), cur = courant(m.source);
    if (!(max > 0)) return niveau;
    var perdu = Math.max(0, (max - cur) * 100 / max);
    var tranches = Math.floor((perdu + 1e-9) / Math.max(1, num(m.tranche, 10)));
    return niveau + tranches * num(m.bonus, 0);
  }
  function recupBloquee(r) {
    var t = tempsDef(), out = false;
    ((t && t.recupBloques) || []).forEach(function (x) {
      if (x.reserve === r.reserve && (!x.effort || x.effort === state.effort)) out = true;
    });
    return out;
  }
  function niveauExpoActuel(cote) {
    var m = expoMax(), x = num(state.etat.expo, 0);
    if (!(m > 0) || !x) return 0;
    if (cote === "froid" && x >= 0) return 0;
    if (cote === "chaud" && x <= 0) return 0;
    return Math.floor((Math.abs(x) / m) * 100 / effTranche());
  }
  function recupEffetExpo(reserve) {
    var t = tempsDef(), cote = num(state.etat.expo, 0) < 0 ? "froid" : "chaud";
    var niv = niveauExpoActuel(cote), out = null;
    (((t && t.recupExposition) || {})[cote] || []).forEach(function (x) {
      if (x.reserve === reserve && num(x.niveau, 0) <= niv && (!out || num(x.niveau, 0) > num(out.niveau, 0))) out = x;
    });
    return out;
  }
  function recupCadence(niveau) {
    var t = tempsDef(), n = Math.abs(Math.round(num(niveau, 0))), out = null;
    ((t && t.regen) || []).forEach(function (r) {
      if (num(r.niveau, -1) === n) out = { niveau: n, points: num(r.points, 0), minutes: r.minutes == null ? null : num(r.minutes, 0) };
    });
    if (!out) return null;
    out.signe = niveau < 0 ? -1 : 1;
    return out;
  }
  // État COMPLET d'une récupération : valeur réglée, modificateurs du
  // personnage et cadence réellement applicable à cet instant. Le module
  // l'affiche ; le temps utilise exactement la même fonction.
  function recupEtat(r) {
    var base = recupNiveauBase(r), niveau = recupManqueSommeil(base, r);
    var condition = recupCondition(r), bloque = condition && recupBloquee(r);
    var c = recupCadence(niveau), exp = condition ? recupEffetExpo(r.reserve) : null;
    var raison = "";
    if (bloque) raison = "bloquée par l'effort actuel";
    if (exp && exp.aucune) { bloque = true; raison = "bloquée par l'exposition"; }
    if (c && exp && exp.minutes != null) c.minutes = num(exp.minutes, c.minutes);
    return {
      def: r, base: base, niveau: niveau, condition: condition, bloque: bloque,
      actif: !!(condition && !bloque && c && c.points && niveau), cadence: c,
      exposition: exp, raison: raison
    };
  }
  function recupDeltaParMinute(e) {
    if (!e || !e.actif || !e.cadence || !e.cadence.minutes) return null;
    return e.cadence.signe * e.cadence.points / e.cadence.minutes;
  }
  // Fraction de point non encore appliquée. Sans elle, cliquer six fois « 10 m »
  // à niveau 5 (5 / heure) ne rendrait jamais rien : chaque 0,83 serait perdu
  // par l'arrondi de la tranche. Le reste voyage avec le personnage dans le
  // coffre du module et ne banque jamais des points au-delà d'une borne.
  function recupRestes(cree) {
    var d = recupCoffre(cree);
    if (!d.restes || typeof d.restes !== "object" || Array.isArray(d.restes)) {
      if (!cree) return {};
      d.restes = {};
    }
    return d.restes;
  }
  function nettoieRecupCoffre() {
    var d = recupCoffre(false);
    if (!d || !state.modData || !state.modData.recuperation) return;
    if (d.restes && !Object.keys(d.restes).length) delete d.restes;
    if (d.niveaux && !Object.keys(d.niveaux).length) delete d.niveaux;
    if (!Object.keys(d).length) delete state.modData.recuperation;
  }
  function appliqueRecupTemps(cle, delta) {
    if (!delta) return;
    var cur = courant(cle), m = maxDe(cle), rs = recupRestes(true);
    // Une réserve pleine ne stocke pas du soin futur ; une réserve vide ne
    // stocke pas davantage une perte qui attendrait qu'on la remplisse.
    if ((delta > 0 && cur >= m) || (delta < 0 && cur <= 0)) { delete rs[cle]; nettoieRecupCoffre(); return; }
    var total = num(rs[cle], 0) + delta;
    // floor aussi dans le négatif : −0,83 devient −1, l'arrondi contre le
    // joueur déjà choisi par la fiche. Le reste positif compense sur les
    // tranches suivantes et garantit le bon total à la cadence complète.
    var entier = Math.floor(total + 1e-12);
    rs[cle] = total - entier;
    if (Math.abs(rs[cle]) < 1e-9) delete rs[cle];
    if (entier) bougeReserve(cle, entier);
    cur = courant(cle);
    if ((delta > 0 && cur >= m) || (delta < 0 && cur <= 0)) delete rs[cle];
    nettoieRecupCoffre();
  }
  // LA ZONE IDÉALE, en température de l'AIR : sa zone de confort (le corps nu
  // plus ce qu'il porte), moins les degrés que son effort lui ajoute.
  function zoneIdeale() {
    var z = confort(), e = effortDe(state.effort);
    if (!z || !e) return null;
    var d = num(e.degres, 0);
    return { bas: z.bas - d, haut: z.haut - d };
  }
  // L'INTENSITÉ de froid (négative) ou de chaud (positive) du personnage, à
  // la température de l'air et à l'effort qu'il fournit.
  function paliersClimat() {
    var t = tempsDef(), z = confort(), e = effortDe(state.effort);
    if (!t || !z || !e) return 0;
    var ressenti = num(state.temperature, 0) + num(e.degres, 0);
    var div = Math.max(1, num(t.paliers.diviseur, 1));
    var arr = t.paliers.arrondi === "bas" ? Math.floor : Math.ceil;
    // l'intensité ne dépasse pas le maximum des règles
    var im = t.intensite ? num(t.intensite.max, 0) : 0;
    function borne(k) { return im > 0 ? Math.min(k, im) : k; }
    if (ressenti < z.bas) return -borne(arr((z.bas - ressenti) / div));
    if (ressenti > z.haut) return borne(arr((ressenti - z.haut) / div));
    return 0;
  }
  // LE PLAFOND D'EXPOSITION d'une intensité, en points (positif) : jusque-là,
  // et pas plus loin, l'exposition peut aller du côté de l'intensité subie.
  // Sans table dans les règles, aucun plafond : l'exposition va jusqu'au bout.
  function plafondExpo(intensite) {
    var t = tempsDef(), m = expoMax(), k = Math.abs(intensite);
    var pl = t && t.intensite && t.intensite.plafonds;
    if (!pl || !aClef(pl, String(k))) return m;
    return m * num(pl[String(k)], 100) / 100;
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
  var TEMPS_CLES = ["pv", "pe", "pm", "pi", "pr", "ps", "ph", "expo", "contenance"];
  function photoRestesRecup() {
    var r = recupRestes(false), o = {};
    Object.keys(r).forEach(function (k) { o[k] = num(r[k], 0); });
    return o;
  }
  function restaureRestesRecup(o) {
    var d = recupCoffre(true);
    d.restes = {};
    Object.keys(o || {}).forEach(function (k) { if (num(o[k], 0)) d.restes[k] = num(o[k], 0); });
    nettoieRecupCoffre();
  }
  function photoTemps() {
    var o = { _recup: photoRestesRecup() };
    TEMPS_CLES.forEach(function (k) { o[k] = state.etat[k]; });
    return o;
  }
  function memePhoto(a, b) {
    if (!TEMPS_CLES.every(function (k) { return a[k] === b[k]; })) return false;
    return JSON.stringify(a._recup || {}) === JSON.stringify(b._recup || {});
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
      restaureRestesRecup(top.avant._recup);
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
  function recupDeltasTranche(minutes) {
    var d = {};
    recupsListe().forEach(function (r) {
      var e = recupEtat(r), parMin = recupDeltaParMinute(e);
      if (parMin === null) return;
      var v = parMin * minutes;
      // Satiété et hydratation sont des récupérations NÉGATIVES dont certains
      // niveaux d'exposition accélèrent la dépense. Le facteur est lui aussi
      // lu dans les règles.
      if (r.reserve === "ps" || r.reserve === "ph") v *= facteurDepense(r.reserve);
      d[r.reserve] = num(d[r.reserve], 0) + v;
    });
    return d;
  }
  function appliquerDeltasRecup(d, sens) {
    Object.keys(d).forEach(function (k) { appliqueRecupTemps(k, num(d[k], 0) * (sens || 1)); });
  }
  function avancerTempsCalcul(n) {
    var t = tempsDef(), e = effortDe(state.effort);
    if (!t || !e) return 0;
    var tr = num(t.tranche, 10), i;
    for (i = 0; i < n; i++) {
      // Les récupérations lisent l'état AU DÉBUT de la tranche. Cela compte
      // pour le mana (qui dépend du repos perdu) et pour les maladies liées à
      // l'exposition. Les points sont appliqués avant de passer à la suivante.
      appliquerDeltasRecup(recupDeltasTranche(tr), 1);

      var p = paliersClimat(), m = expoMax(), x = num(state.etat.expo, 0);
      if (p) {
        // vers l'intensité subie, JUSQU'À son plafond ; déjà au-delà, elle
        // revient vers lui à la cadence de retour
        var cap = plafondExpo(p) * (p < 0 ? -1 : 1);
        var rp = m * num(t.intensite ? t.intensite.retour : t.expoRetour, 0) / 100;
        if (p < 0) x = x < cap ? Math.min(cap, x + rp) : Math.max(cap, x + p);
        else x = x > cap ? Math.max(cap, x - rp) : Math.min(cap, x + p);
        x = clamp(x, -m, m);
      } else {
        var retour = m * num(t.expoRetour, 0) / 100;
        x = x > 0 ? Math.max(0, x - retour) : Math.min(0, x + retour);
      }
      state.etat.expo = x;
      // La digestion, elle aussi, se fait tranche par tranche : cela évite
      // qu'une correction de temps puisse libérer plus que ce que le ventre
      // contenait au début d'une longue avance.
      state.etat.contenance = Math.max(0, num(state.etat.contenance, 0) - Math.floor(digere(tr)));
    }
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
    for (i = 0; i < n; i++) {
      // Après un rechargement le journal n'existe plus. On reconstruit alors
      // une tranche à l'envers : d'abord l'exposition qu'avait le personnage
      // au début, puis les récupérations correspondantes. Comme auparavant,
      // une borne atteinte (0 / maximum) ne permet pas de deviner ce qui a été
      // perdu derrière elle ; le journal reste la voie exacte.
      var p = paliersClimat(), m = expoMax(), x = num(state.etat.expo, 0);
      if (p) x = clamp(x - p, -m, m);
      else if (x) {
        var retour = m * num(t.expoRetour, 0) / 100;
        x = clamp(x + (x > 0 ? retour : -retour), -m, m);
      }
      state.etat.expo = x;
      appliquerDeltasRecup(recupDeltasTranche(tr), -1);
      state.etat.contenance = Math.min(contenance(),
        num(state.etat.contenance, 0) + Math.floor(digere(tr)));
    }
    state.etat.expo = state.etat.expo < 0 ? Math.floor(state.etat.expo) : Math.ceil(state.etat.expo);
    return -n * tr;
  }
  // Le volume que la digestion libère en `minutes`.
  function digere(minutes) {
    var t = tempsDef(), dg = t && t.digestion;
    if (!dg || !dg.minutes) return 0;
    return num(dg.volume, 0) * minutes / num(dg.minutes, 1);
  }
  // Combien de tranches dans une heure.
  function tranchesParHeure() { var t = tempsDef(); return t ? Math.max(1, Math.round(60 / num(t.tranche, 10))) : 6; }
  function confort() {
    var c = climatDef();
    if (c.nuBas === undefined || c.nuHaut === undefined) return null;
    return { bas: snum(c.nuBas) - protection("froid"), haut: snum(c.nuHaut) + protection("chaud") };
  }

