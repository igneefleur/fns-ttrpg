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
  // de connaître leur forme. Toutes les durées utilisent désormais l'horloge
  // interne à la seconde : un round vaut 3 s, puis 1 m / 10 m / 1 h / 8 h.
  var recupBox = null;
  var recupOnly = false;
  var recupNatives = true;
  var recupVueSig = "";

  var RECUP_DUREES = [
    { cle: "round", nom: "Round", court: "round", secondes: 3 },
    { cle: "minute", nom: "Minute", court: "m", secondes: 60 },
    { cle: "10m", nom: "10 minutes", court: "10 m", secondes: 600 },
    { cle: "1h", nom: "1 heure", court: "1 h", secondes: 3600 },
    { cle: "8h", nom: "8 heures", court: "8 h", secondes: 28800 }
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
    if (d.suivi && !Object.keys(d.suivi).length) delete d.suivi;
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
    r.temps = Math.max(0, Number(r.temps) || 0);
    if (!isFinite(Number(r.resteSecondes))) r.resteSecondes = r.temps * d.secondes;
    r.resteSecondes = Math.max(0, Math.floor(Number(r.resteSecondes) || 0));
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
    return d.secondes > 0 ? Math.max(0, Number(r.resteSecondes) || 0) / d.secondes : 0;
  }
  function recupResetDureeModule(r) {
    var d = recupDureeDef(r.type);
    r.resteSecondes = Math.max(0, Math.round((Number(r.temps) || 0) * d.secondes));
    recupOublieSuivi(r.id);
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

  // ---- branchement au moteur temporel discret ----
  // Le socle gère les ticks des récupérations natives. Le module lui fournit
  // simplement ses ajouts et leur durée en secondes.
  var recupExpireModule = {};
  function recupPurgeExpiresModule() {
    var ids = recupExpireModule, a, avant;
    if (!Object.keys(ids).length) return;
    a = recupAjoutsModule(false); avant = a.length;
    a = a.filter(function (r) {
      if (!r || !ids[r.id]) return true;
      recupOublieSuivi(r.id);
      return false;
    });
    if (a.length !== avant) recupCoffre(true).ajouts = a;
    recupExpireModule = {};
    recupNettoieCoffreModule();
  }
  recupListeTemps = function () { return recupListeModule(); };
  recupEtatTemps = function (r) { return recupEtatVueModule(r); };
  recupSecondesDisponiblesTemps = function (r, e, secondes, sens) {
    if (!e || !e.actif) return 0;
    if (!r.perso || sens < 0) return secondes;
    return Math.min(secondes, Math.max(0, Math.floor(Number(r.resteSecondes) || 0)));
  };
  recupApresPasTemps = function (r, e, secondes, sens) {
    if (!r || !r.perso || !e || !e.actif || !(secondes > 0)) return;
    if (sens > 0) {
      r.resteSecondes = Math.max(0, Math.floor(Number(r.resteSecondes) || 0) - secondes);
      if (!r.resteSecondes) recupExpireModule[r.id] = true;
    } else {
      r.resteSecondes = Math.max(0, Math.floor(Number(r.resteSecondes) || 0) + secondes);
    }
  };
  recupFinTemps = function (sens) { if (sens > 0) recupPurgeExpiresModule(); };

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

  // ---- tableau compact, calé sur le module Compétences ----
  // Une seule ligne porte TOUT : nom | actif | niveau | temps | type.
  // La lecture et l'édition occupent les mêmes cellules ; jamais de seconde
  // rangée, jamais de cadre segmenté sous le libellé.
  function recupChampNombreModule(lire, ecrire, aide) {
    var i = el("input", "pc-rec-field pc-rec-number");
    i.type = "number"; i.step = "1"; i.title = aide || "";
    i.addEventListener("input", function () {
      var v = parseFloat(String(i.value).replace(",", "."));
      if (isFinite(v)) { ecrire(v); refresh(); }
    });
    recupHooks.push(function () { if (document.activeElement !== i) i.value = lire(); });
    return i;
  }
  function recupSelectDureeModule(r) {
    var s = el("select", "pc-rec-field pc-rec-select"), i, d, o;
    for (i = 0; i < RECUP_DUREES.length; i++) {
      d = RECUP_DUREES[i];
      o = el("option", null, d.court); o.value = d.cle; o.title = d.nom; s.appendChild(o);
    }
    s.value = r.type;
    s.addEventListener("change", function () {
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
    recupOublieSuivi(r.id);
    recupNettoieCoffreModule();
    refresh(); rebuildRecuperation();
  }

  function recupNomCelluleModule(r) {
    var w = el("span", "pc-rec-name");
    if (r.perso && isEdit("recuperation")) {
      var ed = el("input", "pc-rec-name-edit");
      ed.type = "text"; ed.value = recupNom(r); ed.setAttribute("aria-label", "Nom de la récupération");
      ed.addEventListener("input", function () { r.nom = ed.value; refresh(); });
      ed.addEventListener("blur", function () {
        r.nom = capFirst(String(r.nom || "").trim()) || "Récupération"; refresh();
      });
      recupHooks.push(function () { if (document.activeElement !== ed) ed.value = recupNom(r); });
      w.appendChild(ed);
      var del = el("button", "pc-comp-del", "✕");
      del.type = "button"; del.title = "Supprimer cette récupération ajoutée";
      del.addEventListener("click", function () { supprimeRecupAjoutModule(r); });
      w.appendChild(del);
    } else {
      w.appendChild(el("span", "pc-rec-label", recupNom(r)));
    }
    return w;
  }

  function recupValeurModule(txt, cls) {
    return el("span", "pc-rec-value" + (cls ? " " + cls : ""), txt);
  }

  function recupRangeeModule(r, odd) {
    var row = el("div", "pc-rec-row" + (odd ? " odd" : ""));
    var edit = isEdit("recuperation");
    var e, cb = null, nivJeu = null, tempsJeu = null, typeJeu = null;
    row.appendChild(recupNomCelluleModule(r));

    // ACT. — contrôle uniquement pour les récupérations ajoutées. Les natives
    // montrent un tiret : leur activation appartient aux règles, pas au joueur.
    var actif = el("span", "pc-rec-col pc-rec-actif");
    if (r.perso) {
      cb = el("input", "pc-rec-active"); cb.type = "checkbox";
      cb.title = "Activer ou désactiver cette récupération";
      cb.addEventListener("change", function () {
        r.actif = !!cb.checked; recupOublieSuivi(r.id); refresh(); rebuildRecuperation();
      });
      actif.appendChild(cb);
    } else actif.appendChild(recupValeurModule("—", "muted"));
    row.appendChild(actif);

    // NIV. — en édition, une native règle son BONUS ; une ajoutée règle son
    // niveau propre. Hors édition on affiche toujours le niveau effectif.
    var niv = el("span", "pc-rec-col");
    if (edit) {
      if (r.perso) {
        niv.appendChild(recupChampNombreModule(function () { return r.niveau; }, function (v) {
          r.niveau = clamp(Math.round(v), -recupNiveauMaxModule(), recupNiveauMaxModule());
          recupOublieSuivi(r.id);
        }, "Niveau de cette récupération"));
      } else {
        niv.appendChild(recupChampNombreModule(function () { return recupBonusModule(r); }, function (v) {
          ecritRecupBonusModule(r, v);
        }, "Bonus au niveau de récupération (la règle de base n'est pas modifiée)"));
      }
    } else {
      nivJeu = recupValeurModule(""); niv.appendChild(nivJeu);
    }
    row.appendChild(niv);

    // TEMPS / TYPE — les natives sont infinies. Les récupérations ajoutées
    // occupent exactement les mêmes deux colonnes, en lecture comme en édition.
    var temps = el("span", "pc-rec-col");
    var type = el("span", "pc-rec-col");
    if (r.perso) {
      if (edit) {
        var tempsEdit = recupChampNombreModule(function () { return fmtP(recupTempsRestantModule(r)); }, function (v) {
          var d = recupDureeDef(r.type);
          r.temps = Math.max(0, Number(v) || 0);
          r.resteSecondes = Math.max(0, Math.round(r.temps * d.secondes));
          recupOublieSuivi(r.id);
        }, "Durée restante de cette récupération");
        tempsEdit.min = "0"; tempsEdit.step = "any";
        temps.appendChild(tempsEdit);
        type.appendChild(recupSelectDureeModule(r));
      } else {
        tempsJeu = recupValeurModule("");
        typeJeu = recupValeurModule(recupDureeDef(r.type).court);
        temps.appendChild(tempsJeu); type.appendChild(typeJeu);
      }
    } else {
      temps.appendChild(recupValeurModule("∞", "infinity"));
      type.appendChild(recupValeurModule("—", "muted"));
    }
    row.appendChild(temps); row.appendChild(type);

    recupHooks.push(function () {
      e = recupEtatVueModule(r);
      if (cb) cb.checked = !!r.actif;
      if (nivJeu) {
        nivJeu.textContent = sign(e.niveau);
        nivJeu.classList.toggle("adj", !r.perso && recupBonusModule(r) !== 0);
      }
      if (tempsJeu) tempsJeu.textContent = fmtP(recupTempsRestantModule(r));
      if (typeJeu) typeJeu.textContent = recupDureeDef(r.type).court;
      row.classList.toggle("active", !!e.actif);
      row.classList.toggle("inactive", !e.actif);
      row.title = recupLibelle(r) + " · " + recupNom(r) + " · niveau " + sign(e.niveau) +
        (e.cadence ? " · " + recupCadenceCourt(e.cadence) : "");
    });
    return row;
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
      niveau: 0, actif: false, temps: 1, type: d.cle, resteSecondes: d.secondes
    });
    if (recupOnly) recupOnly = false;
    refresh(); rebuildRecuperation();
  }

  function recupEnteteReserveModule(cle, ref) {
    var h = el("div", "pc-rec-grouphead");
    var nom = el("span", "pc-rec-groupname");
    nom.appendChild(el("span", "pc-abbr", recupAbbr(ref)));
    nom.appendChild(el("span", "pc-rec-reserve-label", recupLibelle(ref)));
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
    var pied = el("div", "pc-rec-add");
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

      var head = el("div", "pc-rec-row head");
      head.appendChild(el("span", null, "RÉCUPÉRATION"));
      head.appendChild(el("span", null, "ACT."));
      head.appendChild(el("span", null, "NIV."));
      head.appendChild(el("span", null, "TEMPS"));
      head.appendChild(el("span", null, "TYPE"));
      groupeBox.appendChild(head);

      groupe.forEach(function (r, index) { groupeBox.appendChild(recupRangeeModule(r, index % 2 === 1)); });
      if (isEdit("recuperation")) groupeBox.appendChild(recupPiedReserveModule(cle, ref));
      recupBox.appendChild(groupeBox);
    });
    recupVueSig = recupSignatureActivesModule();
    joueRecupHooksModule();
  }

  function buildRecuperation() {
    var b = block("Récupération", null, "recuperation", function () { rebuildRecuperation(); });
    var tools = el("div", "pc-comp-tools pc-rec-tools");
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
