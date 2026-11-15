  // ---- Récupération ----
  // Les sources automatiques gardent leurs règles. Les sources manuelles
  // vivent dans modData.recuperation et peuvent être suspendues ou permanentes.
  var recupBox = null;
  var recupOnly = false;
  var recupNatives = true;
  var recupVueSig = "";

  var RECUP_DUREES = [
    { cle: "round", nom: "Round", secondes: 3 },
    { cle: "minute", nom: "Minute", secondes: 60 },
    { cle: "heure", nom: "Heure", secondes: 3600 },
    { cle: "jour", nom: "Jour", secondes: 86400 },
    { cle: "semaine", nom: "Semaine", secondes: 7 * 86400 },
    { cle: "mois", nom: "Mois", secondes: 28 * 86400 },
    { cle: "annee", nom: "Année", secondes: 336 * 86400 }
  ];
  var RECUP_DUREES_ANCIENNES = {
    "10m": { cle: "minute", facteur: 10 },
    "1h": { cle: "heure", facteur: 1 },
    "2h": { cle: "heure", facteur: 2 },
    "8h": { cle: "heure", facteur: 8 }
  };

  function recupLibelle(r) {
    return libCap(r.reserve, String(r.reserve || "").toUpperCase());
  }
  function recupAbbr(r) {
    var d = capDef(r.reserve);
    return d && d.abbr ? d.abbr : String(r.reserve || "").toUpperCase();
  }
  function recupNom(r) {
    if (r && r.perso) return String(r.nom || "Récupération");
    if (r && r.effetActif) return r.contexte + (num(r.effetActif.facteur,1)!==1?' × '+fmtP(r.effetActif.facteur):'');
    return String(r && r.contexte || "Sans contexte");
  }
  function recupDureeDef(cle) {
    return RECUP_DUREES.find(function (d) { return d.cle === cle; }) || RECUP_DUREES[1];
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
  function recupNormaliseAjoutModule(r) {
    var max = recupNiveauMaxModule(), d;
    if (!r || typeof r !== "object") return null;
    if (!r.id) r.id = uid("r");
    r.perso = true; r.categorie = r.categorie === "digestive" ? "digestive" : "speciale";
    r.nom = capFirst(String(r.nom || "Récupération").trim()) || "Récupération";
    r.reserve = String(r.reserve || "pv");
    r.niveau = clamp(Math.round(num(r.niveau, 0)), -max, max);
    r.actif = !!r.actif;
    var ancien = Object.prototype.hasOwnProperty.call(RECUP_DUREES_ANCIENNES, r.type) && RECUP_DUREES_ANCIENNES[r.type];
    d = recupDureeDef(ancien ? ancien.cle : r.type);
    r.type = d.cle;
    r.temps = Math.max(0, num(r.temps, 0)) * (ancien ? ancien.facteur : 1);
    if (r.resteSecondes == null || !isFinite(Number(r.resteSecondes))) r.resteSecondes = r.temps * d.secondes;
    r.resteSecondes = Math.max(0, (Number(r.resteSecondes) || 0));
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
      actif: !!(r.actif && (r.permanente === true || reste > 0) && c && c.points && r.niveau),
      condition: !!r.actif,
      bloque: false,
      perso: true,
      reste: reste,
      duree: d
    };
  }
  function recupEtatVueModule(r) {
    if (r.effetActif) {
      var source = r.effetActif, re = effetDefinition(source.effet).ops.regen;
      var points = re.points * num(source.facteur, 1);
      return {
        niveau: re.niveau,
        cadence: { points: Math.abs(points), signe: Math.sign(points), minutes: re.cadence === 3 ? null : re.cadence / 60 },
        actif: effetsSources().some(function (x) { return x.e.id === source.id; })
      };
    }
    return r.perso ? recupCustomEtatModule(r) : recupEtat(r);
  }
  function recupListeModule() {
    var effets = (state.effetsActifs || []).filter(function (e) {
      var definition = effetDefinition(e.effet);
      return definition && definition.ops.regen;
    }).map(function (e) {
      var definition = effetDefinition(e.effet);
      return { id: e.id, reserve: definition.ops.regen.reserve, contexte: definition.nom, categorie: e.categorie, effetActif: e };
    });
    return recupsListe().concat(recupAjoutsNormalisesModule(), effets);
  }

  function recupSecondesRestantesModule(r) {
    if (r.effetActif) return r.effetActif.reste;
    return r.perso && r.permanente !== true ? r.resteSecondes : null;
  }

  function recupAccelereModule(r) {
    var secondes = recupSecondesRestantesModule(r), e = recupEtatVueModule(r);
    if (!e.actif || !(secondes > 0)) return false;
    var debit;
    if (r.effetActif) {
      if (state.effetsActifs.indexOf(r.effetActif) < 0) return false;
      var regen = effetDefinition(r.effetActif.effet).ops.regen;
      if (!(regen.cadence > 0)) return false;
      debit = regen.points * num(r.effetActif.facteur, 1) / regen.cadence;
    } else {
      if (recupAjoutsModule(false).indexOf(r) < 0) return false;
      var cadence = recupCadenceSecondes(e.cadence);
      if (!cadence) return false;
      debit = recupDeltaTickTemps(r, e) / cadence;
    }
    if (window.__owdRecupAccelere) window.__owdRecupAccelere(r.id, !!r.effetActif, secondes);
    var debits = {};
    debits[r.reserve] = debit;
    recupAppliqueDebitsTemps(debits, secondes);
    if (r.effetActif) retireEffet(r.id);
    else {
      recupApresPasTemps(r, e, secondes, 1);
      recupPurgeExpiresModule();
    }
    return true;
  }

  // ---- branchement au moteur temporel progressif ----
  // Le socle gère les débits des récupérations natives. Le module lui fournit
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
  recupListeTemps = function () { return recupListeModule().filter(function(r){return !r.effetActif;}); };
  recupEtatTemps = function (r) { return recupEtatVueModule(r); };
  recupSecondesDisponiblesTemps = function (r, e, secondes, sens) {
    if (!e || !e.actif) return 0;
    if (!r.perso || r.permanente === true || sens < 0) return secondes;
    return Math.min(secondes, Math.max(0, (Number(r.resteSecondes) || 0)));
  };
  recupApresPasTemps = function (r, e, secondes, sens) {
    if (!r || !r.perso || r.permanente === true || !e || !e.actif || !(secondes > 0)) return;
    if (sens > 0) {
      r.resteSecondes = Math.max(0, (Number(r.resteSecondes) || 0) - secondes);
      if (r.resteSecondes<1e-8) {r.resteSecondes=0;recupExpireModule[r.id] = true;}
    } else {
      r.resteSecondes = Math.max(0, (Number(r.resteSecondes) || 0) + secondes);
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
      sommes[k] += r.effetActif ? e.cadence.signe * e.cadence.points : recupDeltaTickTemps(r, e);
    }
    var out = [];
    for (i = 0; i < ordre.length; i++) {
      k = ordre[i]; v = sommes[k];
      if (Math.abs(v) < 1e-9) continue;
      out.push({ cle: k, valeur: v, texte: sign(v) + " / " + recupTotalLibelleModule(k) });
    }
    return out;
  }

  function recupChampNombreModule(lire, ecrire, aide) {
    var i = el("input", "pc-edit-field pc-rec-number");
    champNombreSigne(i); i.step = "1"; i.title = aide; i.setAttribute("aria-label", aide);
    i.addEventListener("input", function () {
      var v = litNombreSigne(i.value);
      if (isFinite(v)) { ecrire(v); refresh(); }
    });
    recupHooks.push(function () { if (document.activeElement !== i) i.value = lire(); });
    return i;
  }
  function recupSelectDureeModule(r) {
    var s = recupChoixModule("Unité", RECUP_DUREES.map(function (d) { return [d.cle, d.nom]; }), r.type, function (type) {
      r.temps = recupTempsRestantModule(r);
      r.type = type;
      recupResetDureeModule(r);
      refresh();
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

  var recupDrag = null;
  var RECUP_CATEGORIES = { naturelle: ["N", "Naturelle"], digestive: ["D", "Digestive"], speciale: ["S", "Spéciale"] };

  function recupOrdreGroupeModule(reserve, groupe) {
    var ordre = recupCoffre(false).ordre, ids = ordre && ordre[reserve];
    if (!Array.isArray(ids)) return groupe;
    var rangs = new Map(ids.map(function (id, i) { return [id, i]; }));
    return groupe.slice().sort(function (a, b) {
      var rangA = rangs.has(a.id) ? rangs.get(a.id) : ids.length;
      var rangB = rangs.has(b.id) ? rangs.get(b.id) : ids.length;
      return rangA - rangB;
    });
  }

  function recupDeplaceModule(source, cible, avant) {
    if (source.id === cible.id || source.reserve !== cible.reserve) return false;
    var reserve = source.reserve;
    var groupe = recupListeModule().filter(function (r) { return r.reserve === reserve; });
    var ids = recupOrdreGroupeModule(reserve, groupe).map(function (r) { return r.id; });
    var index = ids.indexOf(source.id);
    if (index < 0 || ids.indexOf(cible.id) < 0) return false;
    ids.splice(index, 1);
    ids.splice(ids.indexOf(cible.id) + (avant ? 0 : 1), 0, source.id);
    var coffre = recupCoffre(true);
    if (!coffre.ordre || typeof coffre.ordre !== "object" || Array.isArray(coffre.ordre)) coffre.ordre = {};
    coffre.ordre[reserve] = ids;
    return true;
  }

  function recupPoigneeModule(r, row) {
    var h = el("button", "pc-comp-drag pc-edit-only", "⠿");
    h.type = "button"; h.draggable = true; h.title = "Déplacer cette récupération";
    h.setAttribute("aria-label", h.title);
    h.addEventListener("dragstart", function (ev) {
      if (!isEdit("recuperation")) { ev.preventDefault(); return; }
      ev.stopPropagation();
      recupDrag = r; row.classList.add("pris");
      ev.dataTransfer.setData("text/plain", "owd-recuperation");
      ev.dataTransfer.effectAllowed = "move";
    });
    function fin() { row.classList.remove("avant", "apres"); }
    function avant(ev) {
      var rect = row.getBoundingClientRect();
      return ev.clientY < rect.top + rect.height / 2;
    }
    function valide() { return isEdit("recuperation") && recupDrag && recupDrag !== r && recupDrag.reserve === r.reserve; }
    h.addEventListener("dragend", function () { recupDrag = null; row.classList.remove("pris"); });
    row.addEventListener("dragover", function (ev) {
      if (!valide()) return;
      ev.preventDefault(); ev.stopPropagation();
      ev.dataTransfer.dropEffect = "move";
      row.classList.toggle("avant", avant(ev)); row.classList.toggle("apres", !avant(ev));
    });
    row.addEventListener("dragleave", function (ev) {
      if (!ev.relatedTarget || !row.contains(ev.relatedTarget)) fin();
    });
    row.addEventListener("drop", function (ev) {
      if (!valide()) return;
      ev.preventDefault(); ev.stopPropagation(); fin();
      var source = recupDrag; recupDrag = null;
      if (recupDeplaceModule(source, r, avant(ev))) { refresh(); rebuildRecuperation(); }
    });
    return h;
  }

  function recupChoixModule(label, valeurs, valeur, change) {
    var select = el("select", "pc-select pc-edit-field");
    select.setAttribute("aria-label", label);
    valeurs.forEach(function (v) {
      var option = el("option", null, v[1]); option.value = v[0]; select.appendChild(option);
    });
    select.value = valeur;
    select.addEventListener("change", function () { change(select.value); });
    return select;
  }

  function recupRangeeModule(r, odd) {
    var row = el("div", "pc-comp-row pc-rec-row" + (odd ? " odd" : ""));
    var edit = isEdit("recuperation"), persoEdit = edit && r.perso;
    var nom = el("div", "pc-comp-name pc-rec-name"), cat = RECUP_CATEGORIES[r.categorie] || RECUP_CATEGORIES.speciale;
    var badge = el("span", "pc-rec-badge pc-rec-" + cat[0].toLowerCase(), cat[0]);
    badge.title = cat[1]; badge.setAttribute("aria-label", cat[1]);
    if (edit) nom.appendChild(recupPoigneeModule(r, row));
    nom.appendChild(badge);
    if (persoEdit) {
      var ed = textInput(function () { return r.nom; }, function (v) { r.nom = v; }, "Nom de la récupération", recupHooks);
      ed.classList.add("pc-edit-field", "nmedit");
      ed.setAttribute("aria-label", "Nom de la récupération");
      ed.addEventListener("change", function () {
        r.nom = capFirst(ed.value.trim()) || "Récupération";
        ed.value = r.nom; refresh();
      });
      nom.appendChild(ed);
    } else {
      var libelle = el("span", "pc-comp-label pc-rec-label", recupNom(r));
      libelle.title = recupNom(r);
      nom.appendChild(libelle);
    }
    row.appendChild(nom);

    var meta = el("div", "pc-rec-level");
    var ajustable = edit && !r.effetActif && !r.equipement;
    var valeur = el("span", "pc-rec-value");
    if (ajustable) {
      var niveau = recupChampNombreModule(
        function () { return r.perso ? r.niveau : recupNiveauBase(r); },
        function (v) {
          if (!r.perso) { ecritRecupNiveau(r, v); return; }
          var max = recupNiveauMaxModule();
          r.niveau = clamp(Math.round(v), -max, max);
          recupOublieSuivi(r.id);
        }, "Niveau");
      meta.appendChild(niveau);
    } else meta.appendChild(valeur);

    var secondes = recupSecondesRestantesModule(r);
    var duree = el("span", "pc-rec-duration");
    duree.title = secondes === null ? "Durée permanente" : "Temps restant";
    duree.classList.toggle("infinite", secondes === null);
    row.appendChild(meta);
    row.appendChild(duree);

    var actions = el("div", "pc-rec-actions"), on = null, accelere = null;
    if (!edit && r.perso) {
      on = miniBtn("", "Activer ou suspendre " + recupNom(r), function () {
        if (!ficheModifiable()) return;
        r.actif = !r.actif;
        refresh();
      }, "pc-rec-switch");
      on.setAttribute("role", "switch");
      on.setAttribute("aria-label", "Activation de " + recupNom(r));
      actions.appendChild(on);
    }
    if (secondes !== null) {
      accelere = miniBtn("Accélérer", "Terminer cette récupération sans avancer l’horloge", function () {
        if (ficheModifiable() && recupAccelereModule(r)) refresh();
      }, "pc-rec-action pc-rec-accelerate");
      actions.appendChild(accelere);
    }
    if (ajustable && !r.perso) {
      var defaut = miniBtn("Par défaut", "Rétablir le niveau de base (" + sign(recupNiveauRegle(r)) + ")", function () {
        if (!isEdit("recuperation") || recupNiveauBase(r) === recupNiveauRegle(r)) return;
        ecritRecupNiveau(r, recupNiveauRegle(r));
        refresh();
      }, "pc-rec-action pc-rec-default");
      recupHooks.push(function () { defaut.disabled = !isEdit("recuperation") || recupNiveauBase(r) === recupNiveauRegle(r); });
      actions.appendChild(defaut);
    }
    if (persoEdit) {
      var del = el("button", "pc-comp-del", "✕");
      del.type = "button"; del.title = "Supprimer cette récupération";
      del.setAttribute("aria-label", del.title);
      del.addEventListener("click", function () { if (isEdit("recuperation")) supprimeRecupAjoutModule(r); });
      actions.appendChild(del);
    }
    row.appendChild(actions);

    if (persoEdit) {
      var options = el("div", "pc-rec-options");
      options.appendChild(fld("Type", recupChoixModule("Type de récupération", [["speciale", "Spéciale"], ["digestive", "Digestive"]], r.categorie, function (v) {
        r.categorie = v; refresh();
      })));
      options.appendChild(fld("Durée", recupChoixModule("Durée de récupération", [["limitee", "Limitée"], ["permanente", "∞"]], secondes === null ? "permanente" : "limitee", function (v) {
        if (v === "permanente") r.permanente = true;
        else {
          delete r.permanente;
          if (!(r.resteSecondes > 0)) recupResetDureeModule(r);
        }
        refresh();
      })));
      if (secondes !== null) {
        var temps = recupChampNombreModule(function () { return fmtP(recupTempsRestantModule(r)); }, function (v) {
          r.temps = Math.max(0, v);
          recupResetDureeModule(r);
        }, "Temps restant");
        options.appendChild(fld("Temps restant", temps));
        options.appendChild(fld("Unité", recupSelectDureeModule(r)));
      }
      row.appendChild(options);
    }

    recupHooks.push(function () {
      var etat = recupEtatVueModule(r), reste = recupSecondesRestantesModule(r);
      var cadence = etat.cadence;
      if (cadence && !r.effetActif) cadence = Object.assign({}, cadence, { points: Math.abs(recupDeltaTickTemps(r, etat)) });
      valeur.textContent = edit ? "Niv. " + sign(etat.niveau) : recupCadenceCourt(cadence);
      duree.textContent = reste === null ? "∞" : effetTemps(reste);
      if (on) {
        on.textContent = r.actif ? "On" : "Off";
        on.classList.toggle("on", r.actif);
        on.setAttribute("aria-checked", String(r.actif));
        on.disabled = !ficheModifiable();
      }
      if (accelere) {
        accelere.hidden = !etat.actif || !(reste > 0);
        accelere.disabled = !ficheModifiable();
      }
      row.classList.toggle("inactive", !etat.actif);
    });
    return row;
  }

  function recupSignatureModule(liste) {
    return JSON.stringify(liste.map(function (r) {
      return [r.id, r.reserve, r.categorie, recupSecondesRestantesModule(r) === null, recupOnly && recupEtatVueModule(r).actif];
    }));
  }
  function joueRecupHooksModule() {
    recupHooks.forEach(function (fn) { try { fn(); } catch (e) {} });
  }
  function recupNomNouveauModule(reserve) {
    var n = 1, pris = {}, a = recupAjoutsNormalisesModule(), i;
    for (i = 0; i < a.length; i++) if (a[i].reserve === reserve) pris[pli(a[i].nom)] = true;
    while (pris[pli("Récupération " + n)]) n++;
    return "Récupération " + n;
  }
  function ajouteRecupModule(reserve) {
    var d = recupDureeDef("minute"), a = recupAjoutsModule(true);
    a.push({
      id: uid("r"), perso: true, nom: recupNomNouveauModule(reserve), reserve: reserve,
      niveau: 0, actif: false, temps: 10, type: d.cle, resteSecondes: 10 * d.secondes
    });
    recupOnly = false;
    refresh(); rebuildRecuperation();
  }

  function recupEnteteReserveModule(cle) {
    var ref = { reserve: cle }, h = el("div", "pc-rec-grouphead");
    var nom = el("span", "pc-rec-reserve t-" + cle, recupAbbr(ref));
    nom.title = recupLibelle(ref);
    h.appendChild(nom);
    var totals = el("span", "pc-rec-totaux");
    h.appendChild(totals);
    if (isEdit("recuperation")) h.appendChild(miniBtn("+", "Ajouter une récupération à " + recupLibelle(ref), function () {
      ajouteRecupModule(cle);
    }, "pc-rec-addbtn"));
    recupHooks.push(function () {
      var t = recupTotauxModule(cle);
      totals.textContent = "";
      if (!t.length) totals.appendChild(el("span", "pc-rec-total zero", "0"));
      else t.forEach(function (total) {
        totals.appendChild(el("span", "pc-rec-total" + (total.valeur < 0 ? " negative" : ""), total.texte));
      });
    });
    return h;
  }

  var recupFiltres = [];
  function rebuildRecuperation() {
    if (!recupBox) return;
    recupDrag = null;
    recupHooks = [];
    recupBox.textContent = "";
    recupFiltres.forEach(function (f) { f(); });
    var toute = recupListeModule(), groupes = new Map();
    toute.forEach(function (r) {
      if (!groupes.has(r.reserve)) groupes.set(r.reserve, []);
      if ((recupNatives || r.categorie !== "naturelle") && (!recupOnly || recupEtatVueModule(r).actif)) {
        groupes.get(r.reserve).push(r);
      }
    });
    groupes.forEach(function (groupe, cle) {
      var box = el("section", "pc-rec-group");
      box.appendChild(recupEnteteReserveModule(cle));
      if (groupe.length) {
        var head = el("div", "pc-comp-row pc-rec-row head");
        ["Récupération", isEdit("recuperation") ? "Niveau" : "Cadence", "Durée", "Actions"].forEach(function (nom) {
          head.appendChild(el("span", null, nom));
        });
        box.appendChild(head);
      }
      recupOrdreGroupeModule(cle, groupe).forEach(function (r, index) {
        box.appendChild(recupRangeeModule(r, index % 2 === 1));
      });
      recupBox.appendChild(box);
    });
    recupVueSig = recupSignatureModule(toute);
    joueRecupHooksModule();
  }

  function buildRecuperation() {
    var b = block("Récupération", null, "recuperation", rebuildRecuperation);
    var tools = el("div", "pc-comp-tools pc-rec-tools");
    var ligne = el("div", "row");
    tools.appendChild(ligne);
    recupFiltres = [];
    function filtre(nom, aide, lire, bascule) {
      var button = el("span", "pc-chip", nom);
      button.title = aide; button.tabIndex = 0;
      button.setAttribute("role", "button");
      button.setAttribute("data-consultation", "1");
      function active() { bascule(); rebuildRecuperation(); }
      button.addEventListener("click", active);
      button.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault(); active();
      });
      recupFiltres.push(function () {
        button.classList.toggle("on", lire());
        button.setAttribute("aria-pressed", String(lire()));
      });
      ligne.appendChild(button);
    }
    filtre("Actives", "Afficher uniquement les récupérations actives", function () { return recupOnly; }, function () { recupOnly = !recupOnly; });
    filtre("Naturelles", "Afficher les récupérations naturelles", function () { return recupNatives; }, function () { recupNatives = !recupNatives; });
    b.appendChild(tools);

    recupBox = el("div", "pc-rec-list");
    b.appendChild(recupBox);
    hooks.push(function () {
      if (recupSignatureModule(recupListeModule()) !== recupVueSig) rebuildRecuperation();
    });
    rebuildRecuperation();
    return b;
  }
