  // ---- Récupération ----
  // Le module montre deux familles dans la MÊME vue :
  //   - les récupérations NATURELLES, venues des règles. Leur contexte décide
  //     si elles sont actives ; elles n'ont pas de durée et ne se suppriment
  //     jamais. Sous le rouage on modifie uniquement leur BONUS de niveau.
  //   - les récupérations AJOUTÉES au personnage. Elles sont activées à la
  //     main, ont une durée et disparaissent lorsqu'elle arrive à zéro.
  //
  // Les ajouts vivent dans modData.recuperation : c'est le coffre du module,
  // déjà persistant et volontairement extensible. Aucun autre module n'a besoin
  // de connaître leur forme. Les durées exprimées en minutes / 10 minutes /
  // heure / 8 heures suivent le passage du temps existant. « Round » reste une
  // unité de combat : la fiche n'ayant aucun compteur de rounds, elle n'est pas
  // décrémentée par les boutons de temps de 10 minutes / 1 heure.
  var recupBox = null;
  var recupOnly = false;
  var recupNatives = true;
  var recupVueSig = "";

  var RECUP_DUREES = [
    { cle: "round", nom: "Round", court: "round", minutes: null },
    { cle: "minute", nom: "Minute", court: "m", minutes: 1 },
    { cle: "10m", nom: "10 minutes", court: "10 m", minutes: 10 },
    { cle: "1h", nom: "1 heure", court: "1 h", minutes: 60 },
    { cle: "8h", nom: "8 heures", court: "8 h", minutes: 480 }
  ];

  function recupLibelle(r) {
    return libCap(r.reserve, String(r.reserve || "").toUpperCase());
  }
  function recupAbbr(r) {
    var d = capDef(r.reserve);
    return d && d.abbr ? d.abbr : String(r.reserve || "").toUpperCase();
  }
  function recupNom(r) {
    if (r && r.perso) return String(r.nom || "Récupération");
    return String(r && r.contexte || "Sans contexte");
  }
  function recupDureeDef(cle) {
    var out = RECUP_DUREES[2], i;
    for (i = 0; i < RECUP_DUREES.length; i++) if (RECUP_DUREES[i].cle === cle) out = RECUP_DUREES[i];
    return out;
  }
  function recupCadenceCourt(c) {
    if (!c || !c.points) return "0";
    var s = c.signe < 0 ? "−" : "+";
    if (c.minutes == null) return s + fmtP(c.points) + " / round";
    if (c.minutes === 1) return s + fmtP(c.points) + " / m";
    if (c.minutes === 10) return s + fmtP(c.points) + " / 10 m";
    if (c.minutes === 60) return s + fmtP(c.points) + " / h";
    if (c.minutes === 480) return s + fmtP(c.points) + " / 8 h";
    if (c.minutes > 60 && c.minutes % 60 === 0) return s + fmtP(c.points) + " / " + (c.minutes / 60) + " h";
    return s + fmtP(c.points) + " / " + c.minutes + " m";
  }
  // ---- coffre des récupérations ajoutées ----
  function recupAjoutsModule(cree) {
    var d = recupCoffre(cree);
    if (!Array.isArray(d.ajouts)) {
      if (!cree) return [];
      d.ajouts = [];
    }
    return d.ajouts;
  }
  function recupNettoieCoffreModule() {
    var d = recupCoffre(false);
    if (!d || !state.modData || !state.modData.recuperation) return;
    if (Array.isArray(d.ajouts) && !d.ajouts.length) delete d.ajouts;
    if (d.niveaux && !Object.keys(d.niveaux).length) delete d.niveaux;
    if (!Object.keys(d).length) delete state.modData.recuperation;
  }
  function recupNiveauMaxModule() {
    var t = tempsDef(), max = 20;
    if (t && Array.isArray(t.regen) && t.regen.length) {
      max = 0;
      t.regen.forEach(function (x) { max = Math.max(max, Math.abs(num(x.niveau, 0))); });
    }
    return Math.max(1, Math.round(max));
  }
  function recupBonusModule(r) {
    return recupNiveauBase(r) - recupNiveauRegle(r);
  }
  function ecritRecupBonusModule(r, v) {
    ecritRecupNiveau(r, recupNiveauRegle(r) + Math.round(num(v, 0)));
  }
  function recupNormaliseAjoutModule(r) {
    var max = recupNiveauMaxModule(), d;
    if (!r || typeof r !== "object") return null;
    if (!r.id) r.id = uid("r");
    r.perso = true;
    r.nom = capFirst(String(r.nom || "Récupération").trim()) || "Récupération";
    r.reserve = String(r.reserve || "pv");
    r.niveau = clamp(Math.round(num(r.niveau, 0)), -max, max);
    r.actif = !!r.actif;
    d = recupDureeDef(r.type);
    r.type = d.cle;
    r.temps = Math.max(0, num(r.temps, 1));
    if (!isFinite(Number(r.reste))) r.reste = d.minutes == null ? r.temps : r.temps * d.minutes;
    r.reste = Math.max(0, num(r.reste, d.minutes == null ? r.temps : r.temps * d.minutes));
    return r;
  }
  function recupAjoutsNormalisesModule() {
    var a = recupAjoutsModule(false), out = [], i, r;
    for (i = 0; i < a.length; i++) {
      r = recupNormaliseAjoutModule(a[i]);
      if (r) out.push(r);
    }
    return out;
  }
  function recupTempsRestantModule(r) {
    var d = recupDureeDef(r.type);
    if (d.minutes == null) return Math.max(0, num(r.reste, r.temps));
    return Math.max(0, num(r.reste, r.temps * d.minutes)) / d.minutes;
  }
  function recupResetDureeModule(r) {
    var d = recupDureeDef(r.type);
    r.reste = d.minutes == null ? Math.max(0, num(r.temps, 0)) : Math.max(0, num(r.temps, 0)) * d.minutes;
  }
  function recupCustomEtatModule(r) {
    var c = recupCadence(r.niveau), d = recupDureeDef(r.type);
    var reste = recupTempsRestantModule(r);
    return {
      def: r,
      niveau: r.niveau,
      cadence: c,
      actif: !!(r.actif && reste > 0 && c && c.points && r.niveau),
      condition: !!r.actif,
      bloque: false,
      perso: true,
      reste: reste,
      duree: d
    };
  }
  function recupEtatVueModule(r) {
    return r && r.perso ? recupCustomEtatModule(r) : recupEtat(r);
  }
  function recupListeModule() {
    return recupsListe().concat(recupAjoutsNormalisesModule());
  }

  // ---- application des récupérations ajoutées au passage du temps ----
  // On greffe uniquement le module sur le moteur déjà existant : les règles
  // naturelles restent calculées par recupDeltasTranche() d'origine. Les ajouts
  // sont sommés au même delta, avec une durée exacte même si elle expire au
  // milieu d'une tranche de dix minutes.
  var recupDeltasTrancheBaseModule = recupDeltasTranche;
  var avancerTempsBaseRecupModule = avancerTemps;
  var reculerTempsBaseRecupModule = reculerTemps;
  var recupTempsSensModule = 0;
  var recupExpireModule = {};
  var recupJournalModule = [];

  function recupPhotoAjoutsModule() {
    try { return JSON.parse(JSON.stringify(recupAjoutsModule(false))); }
    catch (e) { return []; }
  }
  function recupMemeAjoutsModule(a, b) {
    try { return JSON.stringify(a || []) === JSON.stringify(b || []); }
    catch (e) { return false; }
  }
  function recupRestaureAjoutsModule(a) {
    var d = recupCoffre(true);
    d.ajouts = JSON.parse(JSON.stringify(a || []));
    recupNettoieCoffreModule();
  }
  function recupPurgeExpiresModule() {
    var ids = recupExpireModule, a, avant;
    if (!Object.keys(ids).length) return;
    a = recupAjoutsModule(false);
    avant = a.length;
    a = a.filter(function (r) { return r && !ids[r.id]; });
    if (a.length !== avant) {
      var d = recupCoffre(true);
      d.ajouts = a;
    }
    recupExpireModule = {};
    recupNettoieCoffreModule();
  }
  recupDeltasTranche = function (minutes) {
    var deltas = recupDeltasTrancheBaseModule(minutes), ajouts, i, r, e, d, actifMin, parMin;
    if (!deltas || typeof deltas !== "object") deltas = {};
    if (!recupTempsSensModule) return deltas;
    ajouts = recupAjoutsNormalisesModule();
    for (i = 0; i < ajouts.length; i++) {
      r = ajouts[i];
      e = recupCustomEtatModule(r);
      if (!e.actif || !e.cadence || !e.cadence.minutes) continue;
      d = recupDureeDef(r.type);
      actifMin = Math.max(0, num(minutes, 0));
      if (recupTempsSensModule > 0 && d.minutes != null) {
        actifMin = Math.min(actifMin, Math.max(0, num(r.reste, 0)));
      }
      if (!(actifMin > 0)) continue;
      parMin = e.cadence.signe * e.cadence.points / e.cadence.minutes;
      deltas[r.reserve] = num(deltas[r.reserve], 0) + parMin * actifMin;
      if (recupTempsSensModule > 0 && d.minutes != null) {
        r.reste = Math.max(0, num(r.reste, 0) - actifMin);
        if (r.reste <= 1e-9) recupExpireModule[r.id] = true;
      }
    }
    return deltas;
  };
  avancerTemps = function (n) {
    var avant, r, apres;
    if (!(n > 0)) return avancerTempsBaseRecupModule(n);
    avant = recupPhotoAjoutsModule();
    recupExpireModule = {};
    recupTempsSensModule = 1;
    try { r = avancerTempsBaseRecupModule(n); }
    finally { recupTempsSensModule = 0; }
    recupPurgeExpiresModule();
    apres = recupPhotoAjoutsModule();
    if (r > 0) {
      recupJournalModule.push({ n: n, avant: avant, apres: apres });
      if (recupJournalModule.length > 50) recupJournalModule.shift();
    }
    return r;
  };
  reculerTemps = function (n) {
    var top = recupJournalModule.length ? recupJournalModule[recupJournalModule.length - 1] : null;
    var exact = !!(n > 0 && top && top.n === n && recupMemeAjoutsModule(recupPhotoAjoutsModule(), top.apres));
    var r;
    recupTempsSensModule = -1;
    try { r = reculerTempsBaseRecupModule(n); }
    finally { recupTempsSensModule = 0; }
    if (exact && r < 0) {
      recupRestaureAjoutsModule(top.avant);
      recupJournalModule.pop();
    } else if (r < 0) {
      recupJournalModule = [];
    }
    return r;
  };

  // ---- résumé par réserve ----
  function recupTotalCleModule(c) {
    if (!c) return "";
    if (c.minutes == null) return "round";
    return "m:" + fmtP(c.minutes);
  }
  function recupTotalLibelleModule(cle) {
    if (cle === "round") return "round";
    var m = num(String(cle).slice(2), 0);
    if (m === 1) return "m";
    if (m === 10) return "10 m";
    if (m === 60) return "h";
    if (m === 480) return "8 h";
    if (m > 60 && m % 60 === 0) return (m / 60) + " h";
    return fmtP(m) + " m";
  }
  function recupTotauxModule(reserve) {
    var sommes = {}, ordre = [], liste = recupListeModule(), i, r, e, k, v;
    for (i = 0; i < liste.length; i++) {
      r = liste[i];
      if (r.reserve !== reserve) continue;
      e = recupEtatVueModule(r);
      if (!e.actif || !e.cadence || !e.cadence.points) continue;
      k = recupTotalCleModule(e.cadence);
      if (!k) continue;
      if (!Object.prototype.hasOwnProperty.call(sommes, k)) { sommes[k] = 0; ordre.push(k); }
      sommes[k] += e.cadence.signe * e.cadence.points;
    }
    var out = [];
    for (i = 0; i < ordre.length; i++) {
      k = ordre[i]; v = sommes[k];
      if (Math.abs(v) < 1e-9) continue;
      out.push({ cle: k, valeur: v, texte: sign(v) + " / " + recupTotalLibelleModule(k) });
    }
    return out;
  }

  // ---- cellules ----
  function recupBoiteTexteModule(txt, cls) {
    return el("span", "pc-rec-box" + (cls ? " " + cls : ""), txt);
  }
  function recupChampNombreModule(lire, ecrire, aide) {
    var i = el("input", "pc-rec-box pc-rec-input");
    i.type = "number"; i.step = "1"; i.title = aide || "";
    i.addEventListener("input", function () {
      var v = parseFloat(String(i.value).replace(",", "."));
      if (isFinite(v)) { ecrire(v); refresh(); }
    });
    recupHooks.push(function () { if (document.activeElement !== i) i.value = lire(); });
    return i;
  }
  function recupSelectDureeModule(r) {
    var s = el("select", "pc-rec-box pc-rec-select"), i, d, o;
    for (i = 0; i < RECUP_DUREES.length; i++) {
      d = RECUP_DUREES[i];
      // Comme les cases segmentées de MIA : la valeur fermée reste courte et
      // lisible dans SON quart de ligne. Le nom complet reste en infobulle.
      o = el("option", null, d.court); o.value = d.cle; o.title = d.nom; s.appendChild(o);
    }
    s.value = r.type;
    s.addEventListener("change", function () {
      // Le nombre visible dans « Temps » garde son sens quand on change
      // d’unité : 4,5 h deviennent 4,5 × 10 m, pas les 5 unités d’origine.
      r.temps = recupTempsRestantModule(r);
      r.type = s.value;
      recupResetDureeModule(r);
      refresh(); rebuildRecuperation();
    });
    recupHooks.push(function () { if (document.activeElement !== s) s.value = r.type; });
    return s;
  }

  function supprimeRecupAjoutModule(r) {
    var a = recupAjoutsModule(false), d = recupCoffre(false);
    if (!a.length) return;
    if (d && d.niveaux && d.niveaux[r.id] !== undefined) delete d.niveaux[r.id];
    d.ajouts = a.filter(function (x) { return x && x.id !== r.id; });
    recupNettoieCoffreModule();
    refresh(); rebuildRecuperation();
  }

  function recupLabelModule(r) {
    var w = el("div", "pc-rec-label");
    // Même règle que les autres modules : en édition on ne superpose JAMAIS
    // le texte de jeu et son champ. Une récupération ajoutée montre donc son
    // INPUT, et seulement lui ; hors édition elle montre son nom, et seulement lui.
    if (!r.perso || !isEdit("recuperation")) {
      w.appendChild(el("span", null, recupNom(r)));
      return w;
    }
    var ed = el("input", "pc-rec-name-edit");
    ed.type = "text"; ed.value = recupNom(r); ed.setAttribute("aria-label", "Nom de la récupération");
    ed.addEventListener("input", function () { r.nom = ed.value; refresh(); });
    ed.addEventListener("blur", function () { r.nom = capFirst(String(r.nom || "").trim()) || "Récupération"; refresh(); });
    recupHooks.push(function () { if (document.activeElement !== ed) ed.value = recupNom(r); });
    w.appendChild(ed);
    var del = el("button", "pc-comp-del", "✕");
    del.type = "button"; del.title = "Supprimer cette récupération ajoutée";
    del.addEventListener("click", function () { supprimeRecupAjoutModule(r); });
    w.appendChild(del);
    return w;
  }

  function recupRangeeModule(r) {
    var wrap = el("div", "pc-rec-entry");
    var row = el("div", "pc-rec-grid");
    var actifCell = el("span", "pc-rec-cell active-cell");
    var nivCell = el("span", "pc-rec-cell");
    var tempsCell = el("span", "pc-rec-cell");
    var typeCell = el("span", "pc-rec-cell");
    var edit = isEdit("recuperation");
    var nivJeu = null, tempsJeu = null, typeJeu = null, cb = null, e;
    wrap.appendChild(recupLabelModule(r));

    // « Active » est un vrai contrôle de jeu pour les récupérations ajoutées.
    // Les récupérations natives restent conditionnées par leurs règles et ne
    // montrent donc jamais de case à cocher.
    if (r.perso) {
      cb = el("input", "pc-rec-active"); cb.type = "checkbox";
      cb.title = "Activer ou désactiver cette récupération";
      cb.addEventListener("change", function () { r.actif = !!cb.checked; refresh(); rebuildRecuperation(); });
      actifCell.appendChild(cb);
    } else {
      actifCell.appendChild(el("span", "pc-rec-native-active", ""));
    }
    row.appendChild(actifCell);

    // Une case = UNE valeur. En jeu : résultat. En édition : input. Jamais les deux.
    if (edit) {
      if (r.perso) {
        nivCell.appendChild(recupChampNombreModule(function () { return r.niveau; }, function (v) {
          r.niveau = clamp(Math.round(v), -recupNiveauMaxModule(), recupNiveauMaxModule());
        }, "Niveau de cette récupération"));
      } else {
        nivCell.appendChild(recupChampNombreModule(function () { return recupBonusModule(r); }, function (v) {
          ecritRecupBonusModule(r, v);
        }, "Bonus au niveau de récupération (la règle de base n'est pas modifiée)"));
      }
    } else {
      nivJeu = recupBoiteTexteModule("");
      nivCell.appendChild(nivJeu);
    }
    row.appendChild(nivCell);

    if (r.perso) {
      if (edit) {
        var tempsEdit = recupChampNombreModule(function () { return fmtP(recupTempsRestantModule(r)); }, function (v) {
          var d = recupDureeDef(r.type);
          r.temps = Math.max(0, num(v, 0));
          r.reste = d.minutes == null ? r.temps : r.temps * d.minutes;
        }, "Durée restante de cette récupération");
        tempsEdit.min = "0"; tempsEdit.step = "any";
        tempsCell.appendChild(tempsEdit);
        typeCell.appendChild(recupSelectDureeModule(r));
      } else {
        tempsJeu = recupBoiteTexteModule("");
        typeJeu = recupBoiteTexteModule(recupDureeDef(r.type).court);
        tempsCell.appendChild(tempsJeu);
        typeCell.appendChild(typeJeu);
      }
    } else {
      tempsCell.appendChild(recupBoiteTexteModule("∞", "infinity"));
      typeCell.appendChild(recupBoiteTexteModule("—"));
    }
    row.appendChild(tempsCell); row.appendChild(typeCell);
    wrap.appendChild(row);

    recupHooks.push(function () {
      e = recupEtatVueModule(r);
      if (cb) cb.checked = !!r.actif;
      if (nivJeu) {
        nivJeu.textContent = sign(e.niveau);
        nivJeu.classList.toggle("adj", !r.perso && recupBonusModule(r) !== 0);
      }
      if (tempsJeu) tempsJeu.textContent = fmtP(recupTempsRestantModule(r));
      if (typeJeu) typeJeu.textContent = recupDureeDef(r.type).court;
      wrap.classList.toggle("active", !!e.actif);
      wrap.classList.toggle("inactive", !e.actif);
      wrap.title = recupLibelle(r) + " · " + recupNom(r) + " · niveau " + sign(e.niveau) +
        (e.cadence ? " · " + recupCadenceCourt(e.cadence) : "");
    });
    return wrap;
  }

  function recupSignatureActivesModule() {
    return recupListeModule().filter(function (r) { return recupEtatVueModule(r).actif; })
      .map(function (r) { return r.id; }).join("|");
  }
  function joueRecupHooksModule() {
    recupHooks.forEach(function (fn) { try { fn(); } catch (e) {} });
  }
  function recupReservesModule() {
    var out = [], vus = {}, i, liste = recupListeModule();
    for (i = 0; i < liste.length; i++) {
      if (!liste[i].reserve || vus[liste[i].reserve]) continue;
      vus[liste[i].reserve] = 1; out.push(liste[i].reserve);
    }
    return out;
  }
  function recupNomNouveauModule(reserve) {
    var n = 1, pris = {}, a = recupAjoutsNormalisesModule(), i;
    for (i = 0; i < a.length; i++) if (a[i].reserve === reserve) pris[pli(a[i].nom)] = true;
    while (pris[pli("Récupération " + n)]) n++;
    return "Récupération " + n;
  }
  function ajouteRecupModule(reserve) {
    var d = recupDureeDef("10m"), a = recupAjoutsModule(true);
    a.push({
      id: uid("r"), perso: true, nom: recupNomNouveauModule(reserve), reserve: reserve,
      niveau: 0, actif: false, temps: 1, type: d.cle, reste: d.minutes
    });
    if (recupOnly) recupOnly = false;
    refresh(); rebuildRecuperation();
  }

  function recupEnteteReserveModule(cle, ref) {
    var h = el("div", "pc-rec-grouphead");
    var nom = el("span", "pc-rec-groupname");
    nom.appendChild(el("span", "pc-abbr", recupAbbr(ref)));
    nom.appendChild(el("span", null, recupLibelle(ref)));
    h.appendChild(nom);
    var totals = el("span", "pc-rec-totaux");
    h.appendChild(totals);
    recupHooks.push(function () {
      var t = recupTotauxModule(cle), i;
      totals.innerHTML = "";
      if (!t.length) totals.appendChild(el("span", "pc-rec-total zero", "0"));
      else for (i = 0; i < t.length; i++) totals.appendChild(el("span", "pc-rec-total", t[i].texte));
    });
    return h;
  }

  function recupPiedReserveModule(cle, ref) {
    var pied = el("div", "pc-rec-addrow");
    var add = miniBtn("+", "Ajouter une récupération à " + recupLibelle(ref), function () { ajouteRecupModule(cle); });
    add.classList.add("pc-rec-addbtn");
    pied.appendChild(add);
    return pied;
  }

  function rebuildRecuperation() {
    if (!recupBox) return;
    recupHooks = [];
    recupBox.innerHTML = "";
    var toute = recupListeModule();
    var liste = toute.filter(function (r) {
      var e = recupEtatVueModule(r);
      if (!recupNatives && !r.perso) return false;
      if (recupOnly && !e.actif) return false;
      return true;
    });
    if (!liste.length && !isEdit("recuperation")) {
      recupBox.appendChild(el("div", "pc-empty",
        recupOnly ? "Aucune récupération n'est active actuellement."
                  : !recupNatives ? "Aucune récupération ajoutée."
                                  : "Aucune récupération."));
      recupVueSig = recupSignatureActivesModule();
      return;
    }

    var ordre = [], vus = {}, i;
    var sourceOrdre = isEdit("recuperation") ? toute : liste;
    for (i = 0; i < sourceOrdre.length; i++) {
      if (!vus[sourceOrdre[i].reserve]) { vus[sourceOrdre[i].reserve] = 1; ordre.push(sourceOrdre[i].reserve); }
    }
    ordre.forEach(function (cle) {
      var groupe = liste.filter(function (r) { return r.reserve === cle; });
      var ref = groupe[0] || toute.filter(function (r) { return r.reserve === cle; })[0];
      if (!ref) return;
      var groupeBox = el("div", "pc-rec-group");
      groupeBox.appendChild(recupEnteteReserveModule(cle, ref));
      var head = el("div", "pc-rec-grid head");
      head.appendChild(el("span", null, "ACT."));
      head.appendChild(el("span", null, "NIV."));
      head.appendChild(el("span", null, "TEMPS"));
      head.appendChild(el("span", null, "TYPE"));
      groupeBox.appendChild(head);
      groupe.forEach(function (r) { groupeBox.appendChild(recupRangeeModule(r)); });
      // Comme Compétences : l'ajout termine la liste qu'il prolonge. Jamais
      // dans l'entête, où il coupe la lecture du nom et des totaux.
      if (isEdit("recuperation")) groupeBox.appendChild(recupPiedReserveModule(cle, ref));
      recupBox.appendChild(groupeBox);
    });
    recupVueSig = recupSignatureActivesModule();
    joueRecupHooksModule();
  }

  function buildRecuperation() {
    var b = block("Récupération", null, "recuperation", function () { rebuildRecuperation(); });
    var tools = el("div", "pc-comp-tools");
    var ligne = el("div", "row");
    var actives = el("span", "pc-chip", "Actives");
    actives.title = "N'afficher que les récupérations actuellement actives.";
    actives.classList.toggle("on", recupOnly);
    actives.addEventListener("click", function () {
      recupOnly = !recupOnly;
      actives.classList.toggle("on", recupOnly);
      rebuildRecuperation();
    });
    ligne.appendChild(actives);
    var natives = el("span", "pc-chip", "Natives");
    natives.title = "Afficher ou masquer les récupérations natives de la fiche.";
    natives.classList.toggle("on", recupNatives);
    natives.addEventListener("click", function () {
      recupNatives = !recupNatives;
      natives.classList.toggle("on", recupNatives);
      rebuildRecuperation();
    });
    ligne.appendChild(natives);
    tools.appendChild(ligne);
    b.appendChild(tools);

    recupBox = el("div", "pc-rec-list");
    b.appendChild(recupBox);
    hooks.push(function () {
      var sig = recupSignatureActivesModule();
      if (recupOnly && sig !== recupVueSig) rebuildRecuperation();
    });
    rebuildRecuperation();
    return b;
  }
