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
  // ---- récupérations naturelles ----
  // Les niveaux viennent des règles. Le temps ne les traite plus comme un
  // débit continu : chaque récupération possède un compteur de secondes
  // consécutives actives et ne produit son effet qu'à la fin d'une cadence
  // complète (round, minute, 10 m, heure, 8 h...).
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
    recupOublieSuivi(r.id);
    nettoieRecupCoffre();
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
  function recupQualiteSommeil(niveau, r) {
    if (!(niveau > 0) || !r) return niveau;
    var liee = (r.condition === "sommeil" && !!r.valeur) ||
               (r.condition === "effort" && r.valeur === "sommeil");
    if (!liee) return niveau;
    var t = tempsDef(), qs = t && Array.isArray(t.qualitesSommeil) ? t.qualitesSommeil : [];
    var cle = String(state.qualiteSommeil || "confortable"), mod = 0;
    qs.forEach(function (q) { if (q.cle === cle) mod = num(q.mod, 0); });
    return niveau + mod;
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
  function recupCadenceSecondes(c) {
    if (!c || !c.points) return 0;
    return c.minutes == null ? 3 : Math.max(1, Math.round(num(c.minutes, 0) * 60));
  }
  // État COMPLET d'une récupération : valeur réglée, modificateurs du
  // personnage et cadence réellement applicable à cet instant.
  function recupEtat(r) {
    var base = recupNiveauBase(r);
    var niveau = recupQualiteSommeil(recupManqueSommeil(base, r), r);
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

  // Suivi persistant de la tranche en cours : { id: { secondes, signature } }.
  // Il ne stocke jamais des fractions de point. Une interruption efface le
  // compteur de la récupération concernée ; le prochain cycle repart de zéro.
  function recupSuivi(cree) {
    var d = recupCoffre(cree);
    if (!d.suivi || typeof d.suivi !== "object" || Array.isArray(d.suivi)) {
      if (!cree) return {};
      d.suivi = {};
    }
    return d.suivi;
  }
  function recupOublieSuivi(id) {
    var d = recupCoffre(false);
    if (!d || !d.suivi) return;
    delete d.suivi[id];
    nettoieRecupCoffre();
  }
  function nettoieRecupCoffre() {
    var d = recupCoffre(false);
    if (!d || !state.modData || !state.modData.recuperation) return;
    if (d.suivi && !Object.keys(d.suivi).length) delete d.suivi;
    if (d.niveaux && !Object.keys(d.niveaux).length) delete d.niveaux;
    if (d.restes && !Object.keys(d.restes).length) delete d.restes;
    if (Array.isArray(d.ajouts) && !d.ajouts.length) delete d.ajouts;
    if (!Object.keys(d).length) delete state.modData.recuperation;
  }

  // Le module Récupération remplace ces quatre crochets pour y joindre ses
  // récupérations ajoutées et leur durée. Sans lui, le moteur sait déjà faire
  // tourner toutes les récupérations natives.
  var recupListeTemps = function () { return recupsListe(); };
  var recupEtatTemps = function (r) { return recupEtat(r); };
  var recupSecondesDisponiblesTemps = function (r, e, secondes) { return e && e.actif ? secondes : 0; };
  var recupApresPasTemps = function () {};
  var recupFinTemps = function () {};

  function recupFacteurTemps(r) {
    return r && (r.reserve === "ps" || r.reserve === "ph") ? facteurDepense(r.reserve) : 1;
  }
  function recupSignatureTemps(r, e) {
    var c = e && e.cadence, sec = recupCadenceSecondes(c), f = recupFacteurTemps(r);
    if (!c || !sec) return "";
    return [Math.round(num(e.niveau, 0)), c.signe, num(c.points, 0), sec, f].join("|");
  }
  function recupDeltaTickTemps(r, e) {
    var c = e && e.cadence;
    if (!c) return 0;
    return c.signe * num(c.points, 0) * recupFacteurTemps(r);
  }
  function recupPeutCumulerTemps(r, e) {
    var d = recupDeltaTickTemps(r, e), cur = courant(r.reserve), m = maxDe(r.reserve);
    if (d > 0 && cur >= m) return false;
    if (d < 0 && cur <= 0) return false;
    return !!d;
  }
  function recupSynchroniseSuivi() {
    var suivi = recupSuivi(false), liste = recupListeTemps(), parId = {};
    liste.forEach(function (r) { if (r && r.id) parId[r.id] = r; });
    Object.keys(suivi).forEach(function (id) {
      var r = parId[id], e = r ? recupEtatTemps(r) : null;
      if (!r || !e || !e.actif || !recupPeutCumulerTemps(r, e) ||
          suivi[id].signature !== recupSignatureTemps(r, e)) delete suivi[id];
    });
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
  // Une réserve qui bouge d'un nombre ENTIER de points. Les récupérations
  // arrivent désormais ici seulement lorsqu'une cadence complète est atteinte.
  function bougeReserve(cle, delta) {
    if (!delta) return;
    var cur = courant(cle), m = maxDe(cle);
    var v = Math.floor(cur + delta);
    if (delta > 0) v = Math.max(cur, Math.min(v, m));
    else v = Math.min(cur, Math.max(v, 0));
    state.etat[cle] = v >= m && cur <= m ? null : v;
  }

  // ---- horloge interne ----
  // Stockée en quatre champs normalisés, jamais en compteur géant de secondes.
  // Les secondes ne servent que temporairement aux additions/soustractions.
  function horlogeCourante() {
    if (!state.horloge || typeof state.horloge !== "object" || Array.isArray(state.horloge))
      state.horloge = { jours: 0, heures: 0, minutes: 0, secondes: 0 };
    return state.horloge;
  }
  function horlogeVersSecondes(h) {
    h = h || horlogeCourante();
    return ((((Math.max(0, Math.floor(Number(h.jours) || 0)) * 24) +
              Math.max(0, Math.floor(Number(h.heures) || 0))) * 60 +
              Math.max(0, Math.floor(Number(h.minutes) || 0))) * 60 +
              Math.max(0, Math.floor(Number(h.secondes) || 0)));
  }
  function poseHorlogeDepuisSecondes(total) {
    total = Math.max(0, Math.floor(Number(total) || 0));
    var h = horlogeCourante();
    h.jours = Math.floor(total / 86400); total %= 86400;
    h.heures = Math.floor(total / 3600); total %= 3600;
    h.minutes = Math.floor(total / 60);
    h.secondes = total % 60;
  }
  function bougeHorloge(secondes) {
    var avant = horlogeVersSecondes(), apres = Math.max(0, avant + Math.trunc(Number(secondes) || 0));
    poseHorlogeDepuisSecondes(apres);
    return apres - avant;
  }

  // Les processus périodiques ont leur PROPRE horloge J/H/M/S. Ce ne sont
  // pas des reliquats de cadence : ils gardent tout le temps actif écoulé,
  // quitte à atteindre des jours entiers. Les ticks se détectent en comparant
  // le nombre de tranches complètes avant/après l'avance.
  function horlogeProcessus(cle, regime) {
    var h = state[cle];
    if (!h || typeof h !== "object" || Array.isArray(h)) {
      h = { jours: 0, heures: 0, minutes: 0, secondes: 0 };
      state[cle] = h;
    }
    if (regime !== undefined && h.regime == null) h.regime = "";
    return h;
  }
  function secondesHorlogeProcessus(cle) {
    var h = horlogeProcessus(cle);
    return ((((Math.max(0, Math.floor(Number(h.jours) || 0)) * 24) +
              Math.max(0, Math.floor(Number(h.heures) || 0))) * 60 +
              Math.max(0, Math.floor(Number(h.minutes) || 0))) * 60 +
              Math.max(0, Math.floor(Number(h.secondes) || 0)));
  }
  function poseHorlogeProcessus(cle, total, regime) {
    total = Math.max(0, Math.floor(Number(total) || 0));
    var h = horlogeProcessus(cle, regime);
    h.jours = Math.floor(total / 86400); total %= 86400;
    h.heures = Math.floor(total / 3600); total %= 3600;
    h.minutes = Math.floor(total / 60);
    h.secondes = total % 60;
    if (regime !== undefined) h.regime = String(regime || "");
    return h;
  }
  function resetHorlogeProcessus(cle, regime) {
    poseHorlogeProcessus(cle, 0, regime);
  }
  function avanceHorlogeProcessus(cle, secondes, regime) {
    var avant = secondesHorlogeProcessus(cle);
    var apres = Math.max(0, avant + Math.trunc(Number(secondes) || 0));
    poseHorlogeProcessus(cle, apres, regime);
    return { avant: avant, apres: apres };
  }
  function reinitialiseHorlogeDigestion() { resetHorlogeProcessus("horlogeDigestion"); }

  // ---- moteur discret de récupération ----
  function recupAppliquePas(secondes, sens) {
    var liste = recupListeTemps(), suivi = recupSuivi(true), deltas = {};
    var i, r, e, actif, cadence, sig, u, total, ticks, delta;
    sens = sens < 0 ? -1 : 1;
    for (i = 0; i < liste.length; i++) {
      r = liste[i];
      if (!r || !r.id || !r.reserve) continue;
      e = recupEtatTemps(r);
      actif = recupSecondesDisponiblesTemps(r, e, secondes, sens);
      if (!(actif > 0) || !e || !e.actif || !e.cadence) { delete suivi[r.id]; continue; }

      // La durée d'un effet temporaire s'écoule tant qu'il est actif, même si
      // la réserve est déjà pleine/vide. En revanche une réserve à sa borne ne
      // banque jamais une récupération future : son compteur repart de zéro.
      recupApresPasTemps(r, e, actif, sens);
      cadence = recupCadenceSecondes(e.cadence);
      if (!cadence) { delete suivi[r.id]; continue; }
      sig = recupSignatureTemps(r, e);
      u = suivi[r.id];
      if (!u || typeof u !== "object" || u.signature !== sig) u = { secondes: 0, signature: sig };

      if (sens > 0 && !recupPeutCumulerTemps(r, e)) { delete suivi[r.id]; continue; }
      total = Math.max(0, num(u.secondes, 0));
      ticks = 0;
      if (sens > 0) {
        total += actif;
        ticks = Math.floor(total / cadence);
        total -= ticks * cadence;
      } else {
        total -= actif;
        while (total < 0) { total += cadence; ticks++; }
      }
      u.secondes = total; u.signature = sig; suivi[r.id] = u;
      if (ticks) {
        delta = recupDeltaTickTemps(r, e) * ticks * sens;
        deltas[r.reserve] = num(deltas[r.reserve], 0) + delta;
      }
    }
    Object.keys(deltas).forEach(function (cle) { bougeReserve(cle, deltas[cle]); });
    nettoieRecupCoffre();
  }

  // ---- exposition et digestion, par tranches complètes ----
  // Elles suivent la même philosophie que les récupérations : une cadence ne
  // produit RIEN avant d'être entièrement écoulée. Chacune possède cependant
  // une vraie horloge J/H/M/S cumulative, indépendante de l'horloge du monde.

  function digestionCadenceSecondes() {
    var t = tempsDef(), dg = t && t.digestion;
    if (!dg || !(num(dg.minutes, 0) > 0)) return 0;
    return Math.max(1, Math.round(num(dg.minutes, 0) * 60));
  }
  function appliqueDigestionSecondes(secondes, sens) {
    var t = tempsDef(), dg = t && t.digestion, cadence = digestionCadenceSecondes();
    if (!dg || !cadence || !(secondes > 0)) return;
    sens = sens < 0 ? -1 : 1;

    if (sens > 0) {
      // Ventre vide = aucun processus en cours, donc aucune horloge cachée qui
      // pourrait offrir un tick immédiat au prochain aliment avalé.
      if (!(snum(state.etat.contenance) > 0)) { reinitialiseHorlogeDigestion(); return; }
      var a = avanceHorlogeProcessus("horlogeDigestion", secondes);
      var ticks = Math.floor(a.apres / cadence) - Math.floor(a.avant / cadence);
      if (ticks > 0) {
        var retire = ticks * Math.max(0, num(dg.volume, 0));
        state.etat.contenance = Math.max(0, Math.round((snum(state.etat.contenance) - retire) * 1000) / 1000);
        if (!(state.etat.contenance > 0)) reinitialiseHorlogeDigestion();
      }
      return;
    }

    // Le journal restaure exactement une avance faite dans la session. Ce
    // chemin n'est qu'un repli quand on remonte plus loin : on recule l'horloge
    // encore active et restitue un volume à chaque frontière de cadence.
    var avant = secondesHorlogeProcessus("horlogeDigestion");
    var apres = Math.max(0, avant - secondes);
    var rticks = Math.floor(avant / cadence) - Math.floor(apres / cadence);
    poseHorlogeProcessus("horlogeDigestion", apres);
    if (rticks > 0)
      state.etat.contenance = Math.min(contenance(), Math.round((snum(state.etat.contenance) + rticks * Math.max(0, num(dg.volume, 0))) * 1000) / 1000);
  }

  function regimeExposition() {
    var p = paliersClimat(), x = snum(state.etat.expo);
    if (p) return "intensite:" + p;
    if (x < 0) return "retour:froid";
    if (x > 0) return "retour:chaud";
    return "";
  }
  function appliqueTickExposition() {
    var t = tempsDef(), p = paliersClimat(), m = expoMax(), x = snum(state.etat.expo);
    if (!t || !(m > 0)) return;
    var retourPct = num(t.intensite ? t.intensite.retour : t.expoRetour, 0);
    var retour = m * retourPct / 100;
    if (p) {
      var cap = plafondExpo(p) * (p < 0 ? -1 : 1);
      if (p < 0) x = x < cap ? Math.min(cap, x + retour) : Math.max(cap, x + p);
      else x = x > cap ? Math.max(cap, x - retour) : Math.min(cap, x + p);
      x = clamp(x, -m, m);
    } else if (x) {
      var calme = m * num(t.expoRetour, 0) / 100;
      x = x > 0 ? Math.max(0, x - calme) : Math.min(0, x + calme);
    }
    state.etat.expo = Math.round(x * 1000000) / 1000000;
  }
  function appliqueExpositionSecondes(secondes, sens) {
    var t = tempsDef();
    if (!t || !(secondes > 0)) return;
    var cadence = Math.max(1, Math.round(Math.max(1, num(t.tranche, 10)) * 60));
    sens = sens < 0 ? -1 : 1;

    if (sens > 0) {
      var regime = regimeExposition();
      if (!regime) { resetHorlogeProcessus("horlogeExposition", ""); return; }
      var h = horlogeProcessus("horlogeExposition", "");
      if (String(h.regime || "") !== regime) resetHorlogeProcessus("horlogeExposition", regime);
      var a = avanceHorlogeProcessus("horlogeExposition", secondes, regime);
      var ticks = Math.floor(a.apres / cadence) - Math.floor(a.avant / cadence);
      while (ticks-- > 0) appliqueTickExposition();
      // Un retour qui atteint zéro termine le processus immédiatement. Un
      // changement d'intensité, lui, ne sera constaté qu'au prochain passage
      // du temps et repartira alors de zéro.
      var apresRegime = regimeExposition();
      if (!apresRegime) resetHorlogeProcessus("horlogeExposition", "");
      else if (apresRegime !== regime) resetHorlogeProcessus("horlogeExposition", apresRegime);
      return;
    }

    // Repli approximatif hors journal : on ne peut pas reconstruire la météo
    // passée. On recule seulement l'horloge du régime encore connu.
    var avant = secondesHorlogeProcessus("horlogeExposition");
    poseHorlogeProcessus("horlogeExposition", Math.max(0, avant - secondes),
      String(horlogeProcessus("horlogeExposition", "").regime || ""));
  }

  function appliqueClimatSecondes(secondes, sens) {
    appliqueExpositionSecondes(secondes, sens);
    appliqueDigestionSecondes(secondes, sens);
  }

  // LE JOURNAL DU TEMPS : une avance complète est photographiée. Reculer la
  // même durée restaure exactement réserves, exposition, contenance, horloge,
  // durées temporaires et compteurs de récupération.
  var journalTemps = [];
  var TEMPS_CLES = ["pv", "pe", "pm", "pi", "pr", "ps", "ph", "expo", "contenance"];
  function copieTemps(v) {
    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return null; }
  }
  function photoTemps() {
    var o = {
      horloge: copieTemps(horlogeCourante()),
      horlogeDigestion: copieTemps(horlogeProcessus("horlogeDigestion")),
      horlogeExposition: copieTemps(horlogeProcessus("horlogeExposition", "")),
      recuperation: copieTemps(recupCoffre(false)) || {}
    };
    TEMPS_CLES.forEach(function (k) { o[k] = state.etat[k]; });
    return o;
  }
  function restaurePhotoTemps(o) {
    if (!o) return;
    TEMPS_CLES.forEach(function (k) { state.etat[k] = o[k]; });
    state.horloge = copieTemps(o.horloge) || { jours: 0, heures: 0, minutes: 0, secondes: 0 };
    state.horlogeDigestion = copieTemps(o.horlogeDigestion) || { jours: 0, heures: 0, minutes: 0, secondes: 0 };
    state.horlogeExposition = copieTemps(o.horlogeExposition) || { jours: 0, heures: 0, minutes: 0, secondes: 0, regime: "" };
    if (!state.modData || typeof state.modData !== "object" || Array.isArray(state.modData)) state.modData = {};
    if (o.recuperation && Object.keys(o.recuperation).length) state.modData.recuperation = copieTemps(o.recuperation);
    else delete state.modData.recuperation;
    effVu = null;
  }
  function memePhotoTemps(a, b) {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
  }

  // La plus petite unité du monde est le round : 3 secondes. Toutes les
  // cadences natives et toutes les durées proposées au module Récupération en
  // sont des multiples, ce qui rend le calcul exact sans fractions de temps.
  var PAS_TEMPS_SECONDES = 3;
  function avancerSecondesCalcul(secondes) {
    var t = tempsDef(), e = effortDe(state.effort), restant, pas;
    if (!t || !e) return 0;
    secondes = Math.max(0, Math.floor(Number(secondes) || 0));
    restant = secondes;
    while (restant > 0) {
      pas = Math.min(PAS_TEMPS_SECONDES, restant);
      recupAppliquePas(pas, 1);
      appliqueClimatSecondes(pas, 1);
      bougeHorloge(pas);
      restant -= pas;
    }
    recupFinTemps(1);
    return secondes;
  }
  function reculerSecondesCalcul(secondes) {
    var t = tempsDef(), e = effortDe(state.effort), restant, pas, fait = 0;
    if (!t || !e) return 0;
    secondes = Math.max(0, Math.floor(Number(secondes) || 0));
    restant = Math.min(secondes, horlogeVersSecondes());
    while (restant > 0) {
      pas = Math.min(PAS_TEMPS_SECONDES, restant);
      recupAppliquePas(pas, -1);
      appliqueClimatSecondes(pas, -1);
      bougeHorloge(-pas);
      restant -= pas; fait += pas;
    }
    recupFinTemps(-1);
    return -fait;
  }
  function avancerSecondes(secondes) {
    secondes = Math.trunc(Number(secondes) || 0);
    if (secondes < 0) return reculerSecondes(-secondes);
    if (!secondes) return 0;
    var avant = photoTemps(), fait = avancerSecondesCalcul(secondes);
    if (fait) {
      journalTemps.push({ secondes: fait, avant: avant, apres: photoTemps() });
      if (journalTemps.length > 50) journalTemps.shift();
    }
    return fait;
  }
  function reculerSecondes(secondes) {
    secondes = Math.max(0, Math.floor(Number(secondes) || 0));
    var restant = secondes, fait = 0, top;
    while (restant > 0 && journalTemps.length) {
      top = journalTemps[journalTemps.length - 1];
      if (top.secondes > restant || !memePhotoTemps(photoTemps(), top.apres)) break;
      restaurePhotoTemps(top.avant);
      journalTemps.pop();
      restant -= top.secondes; fait += top.secondes;
    }
    if (restant > 0) {
      journalTemps = [];
      var r = reculerSecondesCalcul(restant);
      fait += -r;
    }
    return -fait;
  }
  // Compatibilité interne avec d'anciens mods : une « tranche » reste la
  // tranche de règles, mais le vrai moteur est désormais en secondes.
  function avancerTemps(n) {
    var t = tempsDef(), tr = t ? Math.max(1, num(t.tranche, 10)) : 10;
    return avancerSecondes(num(n, 0) * tr * 60) / 60;
  }
  function reculerTemps(n) {
    var t = tempsDef(), tr = t ? Math.max(1, num(t.tranche, 10)) : 10;
    return reculerSecondes(num(n, 0) * tr * 60) / 60;
  }
  function confort() {
    var c = climatDef();
    if (c.nuBas === undefined || c.nuHaut === undefined) return null;
    return { bas: snum(c.nuBas) - protection("froid"), haut: snum(c.nuHaut) + protection("chaud") };
  }

