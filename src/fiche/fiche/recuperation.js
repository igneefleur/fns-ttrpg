  // ---- Récupération ----
  // Les récupérations viennent TOUTES des règles (temps.recuperations). Le
  // personnage ne garde que les niveaux qu'il a explicitement modifiés depuis
  // ce module. Une ligne peut être inactive parce que son contexte n'est pas
  // le bon (éveillé / endormi / effort) ou parce qu'une règle courante la
  // bloque (effort lourd pour les PE, exposition pour PV/PE).
  var recupBox = null;
  var recupFilter = "";
  var recupOnly = false;
  var recupVueSig = "";

  function recupLibelle(r) {
    return libCap(r.reserve, String(r.reserve || "").toUpperCase());
  }
  function recupAbbr(r) {
    var d = capDef(r.reserve);
    return d && d.abbr ? d.abbr : String(r.reserve || "").toUpperCase();
  }
  function recupCadenceTexte(e) {
    if (!e || !e.cadence) return "—";
    var c = e.cadence;
    if (!c.points || !e.niveau) return "Aucune";
    var signe = c.signe < 0 ? "−" : "+";
    if (c.minutes == null) return signe + fmtP(c.points) + " / round";
    if (c.minutes === 1) return signe + fmtP(c.points) + " / min";
    if (c.minutes === 10) return signe + fmtP(c.points) + " / 10 min";
    if (c.minutes === 60) return signe + fmtP(c.points) + " / h";
    if (c.minutes % 60 === 0) return signe + fmtP(c.points) + " / " + (c.minutes / 60) + " h";
    return signe + fmtP(c.points) + " / " + c.minutes + " min";
  }
  function recupTitre(e) {
    var txt = recupLibelle(e.def) + " · " + e.def.contexte + " · niveau " + sign(e.niveau);
    if (e.base !== e.niveau) txt += " (réglé " + sign(e.base) + ", effectif " + sign(e.niveau) + ")";
    if (!e.condition) txt += " · contexte inactif";
    else if (e.bloque) txt += " · " + (e.raison || "inactive");
    else txt += " · " + recupCadenceTexte(e);
    return txt;
  }
  function recupCorrespond(r, flt) {
    if (!flt) return true;
    return pli(recupLibelle(r)).indexOf(flt) >= 0 ||
           pli(recupAbbr(r)).indexOf(flt) >= 0 ||
           pli(r.contexte).indexOf(flt) >= 0;
  }
  function recupRangee(r, odd) {
    var row = el("div", "pc-rec-row" + (odd ? " odd" : ""));
    var nom = el("span", "pc-rec-name");
    nom.appendChild(el("span", "ctx", r.contexte));
    row.appendChild(nom);

    var niv = el("span", "pc-rec-niv");
    var nJeu = el("span", "pc-jeu-only", "");
    var nEdit = el("span", "pc-edit-only");
    nEdit.appendChild(stepper(
      function () { return recupNiveauBase(r); },
      function (v) { ecritRecupNiveau(r, v); },
      1, "niveau de récupération", recupHooks));
    niv.appendChild(nJeu);
    niv.appendChild(nEdit);
    row.appendChild(niv);

    var cad = el("span", "pc-rec-cad", "");
    row.appendChild(cad);

    recupHooks.push(function () {
      var e = recupEtat(r);
      nJeu.textContent = sign(e.niveau);
      nJeu.classList.toggle("adj", e.base !== e.niveau || recupNiveauBase(r) !== recupNiveauRegle(r));
      cad.textContent = e.condition && e.bloque ? "Inactive" : recupCadenceTexte(e);
      row.classList.toggle("active", e.actif);
      row.classList.toggle("context", e.condition);
      row.title = recupTitre(e);
    });
    return row;
  }

  function recupSignatureActives() {
    return recupsListe().filter(function (r) { return recupEtat(r).actif; })
      .map(function (r) { return r.id; }).join("|");
  }
  function joueRecupHooks() {
    recupHooks.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  function rebuildRecuperation() {
    if (!recupBox) return;
    recupHooks = [];
    recupBox.innerHTML = "";
    var flt = filtreDe(recupFilter);
    var liste = recupsListe().filter(function (r) {
      var e = recupEtat(r);
      if (recupOnly && !e.actif) return false;
      return recupCorrespond(r, flt);
    });
    if (!liste.length) {
      recupBox.appendChild(el("div", "pc-empty",
        flt ? "Aucune récupération ne correspond à la recherche."
            : recupOnly ? "Aucune récupération n'est active actuellement."
                        : "Aucune récupération définie dans les règles."));
      return;
    }

    // Les réserves restent dans l'ordre du livre / du JSON. Une même réserve
    // n'ouvre son titre qu'une fois, puis ses contextes se suivent.
    var ordre = [], vus = {};
    liste.forEach(function (r) {
      if (!vus[r.reserve]) { vus[r.reserve] = 1; ordre.push(r.reserve); }
    });
    ordre.forEach(function (cle) {
      var groupe = liste.filter(function (r) { return r.reserve === cle; });
      var ref = groupe[0];
      var titre = el("div", "pc-comp-champ");
      titre.appendChild(el("span", "pc-abbr", recupAbbr(ref)));
      titre.appendChild(el("span", null, recupLibelle(ref)));
      recupBox.appendChild(titre);
      var head = el("div", "pc-rec-row head");
      head.appendChild(el("span", null, "Contexte"));
      head.appendChild(el("span", null, "Niveau"));
      head.appendChild(el("span", null, "Cadence"));
      recupBox.appendChild(head);
      groupe.forEach(function (r, i) { recupBox.appendChild(recupRangee(r, i % 2 === 1)); });
    });
    recupVueSig = recupSignatureActives();
    joueRecupHooks();
  }

  function buildRecuperation() {
    var b = block("Récupération", null, "recuperation", function () { rebuildRecuperation(); });
    var tools = el("div", "pc-comp-tools");
    var ligne = el("div", "row");
    var search = champFiltre(function () { return recupFilter; },
                             function (v) { recupFilter = v; },
                             "Filtrer les récupérations…", rebuildRecuperation);
    if (search) ligne.appendChild(search);
    var actives = el("span", "pc-chip", "Actives");
    actives.title = "N'afficher que les récupérations qui font réellement bouger une réserve dans l'état actuel.";
    actives.classList.toggle("on", recupOnly);
    actives.addEventListener("click", function () {
      recupOnly = !recupOnly;
      actives.classList.toggle("on", recupOnly);
      rebuildRecuperation();
    });
    ligne.appendChild(actives);
    tools.appendChild(ligne);
    b.appendChild(tools);
    recupBox = el("div", "pc-rec-list");
    b.appendChild(recupBox);
    // Quand « Actives » est posé, un changement d'effort, de repos ou
    // d'exposition peut changer les LIGNES qui doivent exister, pas seulement
    // leur couleur. Le registre statique du module surveille cette signature
    // et reconstruit la liste sans relancer refresh() dans refresh().
    hooks.push(function () {
      if (recupOnly && recupSignatureActives() !== recupVueSig) rebuildRecuperation();
    });
    rebuildRecuperation();
    return b;
  }
