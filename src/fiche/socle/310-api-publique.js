  // ---------- l'objet public ----------
  // La fiche expose UN objet : c'est par là qu'un mod remplace un module,
  // change la disposition ou détourne un calcul. Elle n'exécute rien
  // d'elle-même. window.__owdModules est un ALIAS du MÊME objet.
  function recoitEtatCollaboratif(s) {
    if (!s || parseInt(s.v, 10) !== SCHEMA) throw new Error("Schéma distant incompatible : recharger la fiche.");
    s = normalize(s);
    if (JSON.stringify(s) === JSON.stringify(state)) return;
    var actif = document.activeElement, focus = null, positions = [];
    function signature(c) { return [c.tagName, c.type || "", c.className, c.getAttribute("placeholder") || "", c.getAttribute("aria-label") || ""].join("|"); }
    function ancre(c) {
      var a = c.closest("[data-sync-entity], [data-id], [data-module]") || rootEl;
      var m = a.closest("[data-module]");
      return { module: m ? m.dataset.module : "",
        entity: a.dataset ? (a.dataset.syncEntity || a.dataset.id || "") : "", el: a };
    }
    if (actif && rootEl && rootEl.contains(actif) && /^(INPUT|TEXTAREA|SELECT)$/.test(actif.tagName)) {
      var a = ancre(actif), sig = signature(actif);
      var semblables = Array.prototype.filter.call(a.el.querySelectorAll("input,textarea,select"), function (c) { return signature(c) === sig; });
      focus = { module: a.module, entity: a.entity, signature: sig, index: semblables.indexOf(actif),
        value: actif.value, start: actif.selectionStart, end: actif.selectionEnd, direction: actif.selectionDirection, scroll: actif.scrollTop };
    }
    var sx = window.scrollX, sy = window.scrollY;
    Array.prototype.forEach.call(rootEl.querySelectorAll("[data-module]"), function (m) {
      Array.prototype.forEach.call(m.querySelectorAll("*"), function (n, i) {
        if (n.scrollTop || n.scrollLeft) positions.push({ module: m.dataset.module, index: i, top: n.scrollTop, left: n.scrollLeft });
      });
    });
    journalTemps = []; effVu = null; effMaxVu = {};
    state = normalize(s);
    remount();
    positions.forEach(function (p) {
      var m = Array.prototype.find.call(rootEl.querySelectorAll("[data-module]"), function (n) { return n.dataset.module === p.module; });
      var n = m && m.querySelectorAll("*")[p.index]; if (n) { n.scrollTop = p.top; n.scrollLeft = p.left; }
    });
    if (focus) {
      var scope = rootEl;
      if (focus.module) scope = Array.prototype.find.call(rootEl.querySelectorAll("[data-module]"), function (n) { return n.dataset.module === focus.module; });
      if (scope && focus.entity) scope = Array.prototype.find.call(scope.querySelectorAll("[data-sync-entity], [data-id]"), function (n) { return (n.dataset.syncEntity || n.dataset.id) === focus.entity; });
      if (scope) {
        var champs = Array.prototype.filter.call(scope.querySelectorAll("input,textarea,select"), function (c) { return signature(c) === focus.signature; });
        var c = champs[focus.index];
        if (c && !c.disabled) {
          c.focus({ preventScroll: true });
          // Les commandes ± ne sont pas encore dans l'état. Une saisie locale
          // reste aussi sous les doigts pendant la réception d'autres champs.
          c.value = focus.value;
          try { if (focus.start !== null) c.setSelectionRange(focus.start, focus.end, focus.direction); } catch (e) {}
          c.scrollTop = focus.scroll;
        }
      }
    }
    window.scrollTo(sx, sy);
  }

  window.Owd = {
    __recoitEtat: recoitEtatCollaboratif,
    __montreObjet: montreObjet,
    // Les deux ne se déduisent pas l'un de l'autre : version porte le suffixe
    // de beta le cas échéant, schema est un entier libre. Un mod qui tirerait
    // le schéma du majeur de la version se tromperait à la première
    // divergence ; OwdMods.lireVersion existe pour ne pas avoir à découper le
    // numéro soi-même.
    version: RELEASE,
    schema: SCHEMA,
    enregistre: enregistre,
    ordonne: ordonne,
    // une COPIE de la description : personne ne remanie la table de l'extérieur
    liste: function () {
      return ordreModules().map(function (m) {
        return { id: m.id, titre: m.titre, onglet: m.onglet, colonne: m.colonne, actif: actif(m.id) };
      });
    },
    actif: actif,
    active: activeModule,
    etat: function (id) {
      var e = etatModule(id);
      return { echecs: e.echecs, musele: e.musele, erreur: e.erreur,
               panne: e.panne, vide: e.vide, actif: actif(id) };
    },
    remonte: remount,
    filtre: filtreCalcul,
    // bilan du dernier passage du moteur, en COPIE : vide tant qu'il n'a pas
    // tourné. « actif » vient de l'état (l'interrupteur du joueur), « etat » du
    // moteur (ok, panne, attente, coupe, recent, refuse).
    mods: function () {
      return bilanMods.map(function (b) {
        return { id: b.id, nom: b.nom, actif: modActifDe(b.id), etat: b.etat,
                 message: b.message || "", empreinte: b.empreinte };
      });
    },
    // INTERNE, pour le moteur de mods : nommer le mod qu'il lance, afin que les
    // filtres enregistrés pendant son exécution portent SON id.
    __proprietaire: function (id) {
      proprietaireCourant = id ? String(id) : PROP_MOD;
      // modEnExec ne vaut que PENDANT le lancement d'un mod : le moteur rend la
      // main avec null. C'est lui qui permet à enregistre() de marquer le
      // module au nom du mod qui l'a posé.
      modEnExec = id ? String(id) : null;
    },
    // INTERNE, pour les sondes. Le double tiret bas dit ce qu'il faut : ce
    // n'est pas le contrat public, et un mod qui s'y appuie le fait à ses
    // risques. Ils existent parce qu'une sonde qui lirait les valeurs dans le
    // DOM mesurerait la MISE EN FORME autant que le calcul.
    __calculs: {
      caracTotal: caracTotal, caracXp: caracXp, creationDepense: creationDepense,
      limiteRangs: limiteRangs, compRangsComptes: compRangsComptes, techRangsComptes: techRangsComptes,
      compBonus: compBonus, compDes: compDes, compXp: compXp,
      pvMax: pvMax, peMax: peMax, pmMax: pmMax, piMax: piMax,
      prMax: prMax, psMax: psMax, phMax: phMax,
      charge: charge, accesRapides: accesRapides, contenance: contenance,
      expoMax: expoMax, effondrement: effondrement, effNiveauDe: effNiveauDe,
      poidsPorte: poidsPorte, accesPris: accesPris, contenancePrise: contenancePrise,
      desAction: desAction, ruptureMax: ruptureMax, ruptureDepense: ruptureDepense,
      xpDepense: xpDepense, courant: courant, maxDe: maxDe, autoDe: autoDe,
      confort: confort
    },
    // le registre des filtres, à plat et en copie : nom, propriétaire, fautes
    __filtres: function () {
      var out = [];
      Object.keys(filtres).forEach(function (nom) {
        (filtres[nom] || []).forEach(function (f) {
          out.push({ nom: nom, prop: f.prop, echecs: f.echecs });
        });
      });
      return out;
    }
  };
  window.__owdModules = window.Owd;

