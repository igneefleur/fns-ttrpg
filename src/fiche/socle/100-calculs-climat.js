  // ---- climat ----
  // La zone de confort du personnage HABILLÉ : les deux bornes du corps nu
  // viennent des règles (owd-creation.json), les degrés de protection de ce
  // qu'il porte. Les bornes nues ne sont jamais montrées seules : ce serait une
  // règle affichée.
  // la protection des VÊTEMENTS PORTÉS, dans la case de leur type
  function protection(champ) {
    var t = 0;
    equipementsPortes().forEach(function (o) { t += snum(o[champ]); });
    return Math.round((t + effetBonus("climat",champ) + num(effSpecifiques()[champ], 0)) * 10) / 10;
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
  // Les niveaux viennent des règles ; les cadences définissent des débits continus.
  function recupsListe() {
    var t = tempsDef();
    var liste = t && Array.isArray(t.recuperations) ? t.recuperations.slice() : [];
    // Conserver les anciennes lignes permanentes uniquement si elles ont été réglées.
    var niveaux = recupCoffre(false).niveaux || {};
    Object.keys(niveaux).forEach(function (id) {
      if (/^(pv|pe|pm|pr|ps|ph|pi):naturelle$/.test(id) && num(niveaux[id], 0))
        liste.push({id:id, reserve:id.split(":")[0], contexte:"Spéciale — ancien bonus", categorie:"speciale", condition:"toujours", niveau:0});
    });
    var wolf = Math.max(0, Math.round(effetBonus("wolfMedic")));
    if (wolf) liste.push({id:"pv:wolf-medic", reserve:"pv", contexte:"Wolf Medic Regeneration", categorie:"speciale", condition:"toujours", niveau:wolf, equipement:true});
    return liste;
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
    if (r.equipement) return recupNiveauRegle(r);
    var d = recupCoffre(false), n = d.niveaux && d.niveaux[r.id];
    if (n === undefined && r.ancienId && d.niveaux && d.niveaux[r.ancienId] !== undefined)
      n = recupNiveauRegle(r) + Number(d.niveaux[r.ancienId]) - num(r.ancienNiveau, 0);
    return isFinite(Number(n)) ? Math.round(Number(n)) : recupNiveauRegle(r);
  }
  function ecritRecupNiveau(r, v) {
    if (!r || !r.id || r.equipement) return;
    var t = tempsDef(), max = 20;
    if (t && Array.isArray(t.regen) && t.regen.length) {
      max = 0; t.regen.forEach(function (x) { max = Math.max(max, num(x.niveau, 0)); });
    }
    v = clamp(Math.round(num(v, recupNiveauRegle(r))), -max, max);
    var d = recupCoffre(true);
    if (!d.niveaux || typeof d.niveaux !== "object" || Array.isArray(d.niveaux)) d.niveaux = {};
    if (v === recupNiveauRegle(r) && !(r.ancienId && d.niveaux[r.ancienId] !== undefined)) delete d.niveaux[r.id];
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
    if (r.condition === "toujours") return true;
    if (r.condition === "effort") return state.effort === r.valeur;
    if (r.condition === "sommeil") return (state.effort === "sommeil") === !!r.valeur;
    return false;
  }
  function recupQualiteSommeil(niveau, r) {
    if (!(niveau > 0) || !r || r.categorie === "speciale") return niveau;
    var liee = (r.condition === "sommeil" && !!r.valeur) ||
               (r.condition === "effort" && r.valeur === "sommeil") ||
               (r.condition === "toujours" && state.effort === "sommeil");
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
    var niveau = recupQualiteSommeil(base, r) + (r.categorie === "naturelle" ? num(effSpecifiques()[r.reserve], 0) : 0);
    var condition = recupCondition(r), bloque = condition && recupBloquee(r);
    var c = recupCadence(clamp(niveau, -20, 20)), exp = null;
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
  // Ancien format conservé pour convertir les sauvegardes précédentes.
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
  // Conversion unique des reliquats de l'ancien moteur en fractions acquises.
  function recupSynchroniseSuivi() {
    var suivi = recupSuivi(false), deltas = {}, liste = recupListeTemps();
    liste.forEach(function(r) {
      var u=suivi[r.id], e=recupEtatTemps(r), cadence=e && recupCadenceSecondes(e.cadence);
      if(u && e.actif && cadence && u.signature===recupSignatureTemps(r,e))
        deltas[r.reserve]=num(deltas[r.reserve],0)+recupDeltaTickTemps(r,e)*Math.max(0,num(u.secondes,0))/cadence;
    });
    delete recupCoffre(false).suivi;
    if(typeof effetsSources==='function') effetsSources().forEach(function(x) {
      var r=x.d.ops.regen, e=x.e;
      if(r && e.suivi>0) deltas[r.reserve]=num(deltas[r.reserve],0)+r.points*num(e.facteur,1)*e.suivi/r.cadence;
    });
    (state.effetsActifs||[]).forEach(function(e){e.suivi=0;});
    Object.keys(deltas).forEach(function(k){bougeReserve(k,deltas[k]);});
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
  function facteurDepense() { return 1; }
  // Les fractions restent dans la réserve, sans reliquat ni attribut séparé.
  function bougeReserve(cle, delta, maximum) {
    if (!delta) return;
    var cur=courant(cle), m=maximum===undefined?maxDe(cle):maximum, v=cur+delta;
    if(delta>0)v=Math.max(cur,Math.min(v,m));
    else v=Math.min(cur,Math.max(v,0));
    state.etat[cle]=v>=m && cur<=m?null:v;
  }
  function arronditReservesTemps() {
    ['pv','pe','pm','pi','pr','ps','ph','pc'].forEach(function(k){
      if(typeof state.etat[k]==='number')state.etat[k]=Math.round(state.etat[k]*1e6)/1e6;
    });
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
              Math.max(0, Number(h.secondes) || 0));
  }
  function poseHorlogeDepuisSecondes(total) {
    total = Math.max(0, Number(total) || 0);
    if(Math.abs(total-Math.round(total))<1e-8)total=Math.round(total);
    var h = horlogeCourante();
    h.jours = Math.floor(total / 86400); total %= 86400;
    h.heures = Math.floor(total / 3600); total %= 3600;
    h.minutes = Math.floor(total / 60);
    h.secondes = total % 60;
  }
  function bougeHorloge(secondes) {
    var avant = horlogeVersSecondes(), apres = Math.max(0, avant + (Number(secondes) || 0));
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
              Math.max(0, Number(h.secondes) || 0));
  }
  function poseHorlogeProcessus(cle, total, regime) {
    total = Math.max(0, Number(total) || 0);
    if(Math.abs(total-Math.round(total))<1e-8)total=Math.round(total);
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
    var apres = Math.max(0, avant + (Number(secondes) || 0));
    poseHorlogeProcessus(cle, apres, regime);
    return { avant: avant, apres: apres };
  }
  function reinitialiseHorlogeDigestion() { resetHorlogeProcessus("horlogeDigestion"); }

  // ---- débits simultanés et échéances ----
  var recupSensTemps = null;
  function recupDebitsTemps() {
    var debits={};
    recupListeTemps().forEach(function(r){
      var e=recupEtatTemps(r), c=e && recupCadenceSecondes(e.cadence);
      if(e && e.actif && c)debits[r.reserve]=num(debits[r.reserve],0)+recupDeltaTickTemps(r,e)/c;
    });
    if(typeof effetsSources==='function')effetsSources().forEach(function(x){
      var r=x.d.ops.regen;
      if(r && r.cadence>0)debits[r.reserve]=num(debits[r.reserve],0)+r.points*num(x.e.facteur,1)/r.cadence;
    });
    return debits;
  }
  function recupAppliqueDebitsTemps(debits, secondes) {
    // Tous les débits et plafonds sont lus avant de déplacer la première réserve.
    var max={}, valeurs={};
    Object.keys(debits).forEach(function(k){max[k]=maxDe(k);valeurs[k]=courant(k);});
    Object.keys(debits).forEach(function(k){
      var delta=debits[k]*secondes,cur=valeurs[k],m=max[k],v=cur+delta;
      v=delta>0?Math.max(cur,Math.min(v,m)):Math.min(cur,Math.max(v,0));
      state.etat[k]=v>=m && cur<=m?null:v;
    });
  }
  function recupDureesPasTemps(secondes,sens) {
    recupListeTemps().forEach(function(r){var e=recupEtatTemps(r),a=recupSecondesDisponiblesTemps(r,e,secondes,sens);if(a>0)recupApresPasTemps(r,e,a,sens);});
  }
  function recupAppliquePas(secondes, sens) {
    var debits={};
    recupListeTemps().forEach(function(r){
      var e=recupEtatTemps(r),c=e && recupCadenceSecondes(e.cadence),a=recupSecondesDisponiblesTemps(r,e,secondes,sens);
      if(e && e.actif && c && a>0)debits[r.reserve]=num(debits[r.reserve],0)+recupDeltaTickTemps(r,e)*a/c*(sens<0?-1:1);
    });
    recupDureesPasTemps(secondes,sens);recupAppliqueDebitsTemps(debits,1);
  }
  function prochainStopTemps(reste,debits) {
    var pas=reste;
    function stop(n){if(n>1e-8 && n<pas)pas=n;}
    // Expirations : même un effet sans récupération peut modifier les plafonds.
    (state.effetsActifs||[]).forEach(function(e){if(e.actif && e.reste!==null)stop(e.reste);});
    recupListeTemps().forEach(function(r){var e=recupEtatTemps(r);if(r.perso && e.actif)stop(r.resteSecondes);});
    Object.keys(debits).forEach(function(k){
      var d=debits[k],v=courant(k),m=maxDe(k);
      if(!d)return;
      stop(((d>0?m:0)-v)/d);
      // Chaque frontière d'effondrement doit être traitée avant de poursuivre.
      if(['pr','ps','ph','pi'].indexOf(k)>=0 && m>0){
        var unite=m*effTranche()/100,q=v/unite;
        var cible=(d>0?Math.floor(q+1e-9)+1:Math.ceil(q-1e-9)-1)*unite;
        if(cible>=0 && cible<=m)stop((cible-v)/d);
      }
    });
    var t=tempsDef(),cadence=Math.max(1,num(t.tranche,10)*60);
    if(actualiseRegimeExposition())stop(cadence-secondesHorlogeProcessus('horlogeExposition')%cadence);
    cadence=digestionCadenceSecondes();
    if(cadence && snum(state.etat.contenance)>0)stop(cadence-secondesHorlogeProcessus('horlogeDigestion')%cadence);
    if(state.effAlcool>0){cadence=alcoolCadenceSecondes();stop(cadence-secondesHorlogeProcessus('horlogeAlcool')%cadence);}
    return pas;
  }

  // ---- exposition et digestion, par tranches complètes ----
  // Une cadence produit son effet seulement à son échéance. Chacune possède
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
      var ticks = Math.floor((a.apres+1e-8) / cadence) - Math.floor((a.avant+1e-8) / cadence);
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

  // Le régime porte la continuité du PROCESSUS de résorption, indépendamment
  // de l'intensité : changer de climat favorable ne perd aucune seconde.
  function resorptionApplicable(x, p) {
    return !!x && (!p || x * p < 0 || Math.abs(x) > plafondExpo(p));
  }
  function regimeExposition(intensite) {
    var p = intensite===undefined?paliersClimat():intensite, x = snum(state.etat.expo);
    if (resorptionApplicable(x,p)) return x > 0 ? "resorption:chaud" : "resorption:froid";
    return p ? "intensite:" + p : "";
  }
  function actualiseRegimeExposition() {
    var regime=regimeExposition(),h=horlogeProcessus("horlogeExposition","");
    if(h.regime!==regime || !regime)resetHorlogeProcessus("horlogeExposition",regime);
    return regime;
  }
  function niveauResorptionExposition() {
    var t=tempsDef(), r=t&&t.resorption;
    if(!r)return 0;
    var cadence=Math.max(1,num(t.tranche,10)*60), tranches=Math.max(1,Math.floor(secondesHorlogeProcessus("horlogeExposition")/cadence));
    return Math.min(num(r.max,0),num(r.depart,0)+(tranches-1)*num(r.increment,0));
  }
  function appliqueTickExposition(intensite) {
    var t=tempsDef(),p=intensite===undefined?paliersClimat():intensite,m=expoMax(),x=snum(state.etat.expo);
    if(!t||!(m>0))return;
    var resorption=resorptionApplicable(x,p)?niveauResorptionExposition():0;
    if(p && x*p>0 && Math.abs(x)>plafondExpo(p)) {
      // Le bilan ne peut ni aggraver le dépassement ni traverser son plafond.
      var baisse=Math.max(0,resorption-Math.abs(p));
      x=(x<0?-1:1)*Math.max(plafondExpo(p),Math.abs(x)-baisse);
    } else {
      if(resorption)x=(x<0?-1:1)*Math.max(0,Math.abs(x)-resorption);
      if(p){var cap=plafondExpo(p);x=p>0?Math.min(cap,x+p):Math.max(-cap,x+p);}
    }
    state.etat.expo=Math.round(clamp(x,-m,m)*1000000)/1000000;
  }
  function appliqueExpositionSecondes(secondes, sens, intensite) {
    var t=tempsDef();if(!t||!(secondes>0))return;
    var cadence=Math.max(1,Math.round(Math.max(1,num(t.tranche,10))*60));
    if(sens<0){
      // Le journal temporel restaure exactement les retours usuels. Hors journal,
      // seul le temps connu peut être reculé, pas la météo passée.
      poseHorlogeProcessus("horlogeExposition",Math.max(0,secondesHorlogeProcessus("horlogeExposition")-secondes),String(horlogeProcessus("horlogeExposition","").regime||""));return;
    }
    var reste=secondes;
    while(reste>1e-8){
      var regime=regimeExposition(intensite),h=horlogeProcessus("horlogeExposition","");
      if(!regime){resetHorlogeProcessus("horlogeExposition","");return;}
      if(h.regime!==regime)resetHorlogeProcessus("horlogeExposition",regime);
      var avant=secondesHorlogeProcessus("horlogeExposition"),pas=Math.min(reste,cadence-avant%cadence);
      avanceHorlogeProcessus("horlogeExposition",pas,regime);reste-=pas;
      if(Math.abs((avant+pas)/cadence-Math.round((avant+pas)/cadence))<1e-9){
        appliqueTickExposition(intensite);
        var apres=regimeExposition(intensite);if(apres!==regime)resetHorlogeProcessus("horlogeExposition",apres);
      }
    }
  }

  function appliqueClimatSecondes(secondes, sens, intensite) {
    appliqueExpositionSecondes(secondes, sens, intensite);
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
      effAlcool: state.effAlcool,
      horlogeAlcool: copieTemps(horlogeProcessus("horlogeAlcool")),
      effetsActifs: copieTemps(state.effetsActifs || []),
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
    state.effetsActifs = copieTemps(o.effetsActifs) || [];
    state.effAlcool = num(o.effAlcool, 0);
    state.horlogeAlcool = copieTemps(o.horlogeAlcool) || {jours:0, heures:0, minutes:0, secondes:0};
    if (!state.modData || typeof state.modData !== "object" || Array.isArray(state.modData)) state.modData = {};
    if (o.recuperation && Object.keys(o.recuperation).length) state.modData.recuperation = copieTemps(o.recuperation);
    else delete state.modData.recuperation;
    effVu = null;
  }
  function memePhotoTemps(a, b) {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
  }

  // Pas du repli de recul hors journal ; l’avance utilise les événements.
  var PAS_TEMPS_SECONDES = 3;
  function alcoolCadenceSecondes() { return Math.max(1, num((effDef().specifiques || {}).alcoolSecondes, 7200)); }
  function actualiseHorlogeAlcool() {
    if (!(state.effAlcool > 0)) resetHorlogeProcessus("horlogeAlcool");
  }
  function avanceAlcoolSecondes(secondes) {
    actualiseHorlogeAlcool();
    if (!(state.effAlcool > 0) || !(secondes > 0)) return;
    var cadence = alcoolCadenceSecondes(), a = avanceHorlogeProcessus("horlogeAlcool", secondes);
    var ticks = Math.floor((a.apres+1e-8) / cadence) - Math.floor((a.avant+1e-8) / cadence);
    state.effAlcool = Math.max(0, state.effAlcool - ticks);
    actualiseHorlogeAlcool();
  }
  function avancerSecondesCalcul(secondes) {
    var t=tempsDef(),e=effortDe(state.effort),restant,pas,debits,intensite;
    if(!t || !e)return 0;
    secondes=Math.max(0,Math.floor(Number(secondes)||0));restant=secondes;
    recupSynchroniseSuivi();suitEffondrement();
    try {
      while(restant>1e-8){
        debits=recupDebitsTemps();recupSensTemps=debits;
        // À une frontière exacte, les débits suivants utilisent le côté vers lequel on évolue.
        suitEffondrement();debits=recupDebitsTemps();recupSensTemps=debits;
        pas=prochainStopTemps(restant,debits);intensite=paliersClimat();
        recupDureesPasTemps(pas,1);
        recupAppliqueDebitsTemps(debits,pas);
        effetsAvance(pas,true);
        appliqueClimatSecondes(pas,1,intensite);avanceAlcoolSecondes(pas);bougeHorloge(pas);
        recupFinTemps(1);suitEffondrement();
        restant=Math.max(0,restant-pas);
      }
    } finally {recupSensTemps=null;}
    suitEffondrement();
    arronditReservesTemps();
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
    secondes = (Number(secondes) || 0);
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

