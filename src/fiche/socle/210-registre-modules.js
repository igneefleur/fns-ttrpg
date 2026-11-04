  // ---------- registre de modules ----------
  // Un module = un bloc autonome de la fiche, désigné par un id STABLE (celui
  // que porte son attribut data-module, et sur lequel les sondes s'accrochent).
  // Le registre ne fait rien de plus que ce que le montage faisait en dur : il
  // le rend NOMMABLE. C'est la condition pour qu'un mod puisse un jour se
  // substituer à un module natif, ou changer la disposition, sans qu'on
  // rouvre ce fichier.
  //
  // Un module se décrit ainsi :
  //   id      identifiant stable, unique
  //   titre   ce que le module affiche (pour les réglages de disposition)
  //   onglet  clé d'un onglet de TABS
  //   colonne clé d'une colonne du squelette de cet onglet
  //   pour    prédicat facultatif : le module n'existe que s'il rend vrai
  //   build   fonction sans effet de bord sur la page : elle RETOURNE son bloc
  var modules = [];        // dans l'ordre de déclaration
  var moduleOrdre = [];    // ordre partiel demandé par ordonne() ; brut, filtré au montage
  var placeOrigine = {};   // id -> place déclarée, relevée au montage avant toute consigne

  function rangModule(id) {
    for (var i = 0; i < modules.length; i++) if (modules[i].id === id) return i;
    return -1;
  }
  // Un id DÉJÀ PRÉSENT est REMPLACÉ, À SA PLACE : c'est ainsi qu'un mod se
  // substitue à un module natif. Le renvoyer en fin de colonne changerait la
  // disposition en douce, ce que personne n'a demandé.
  function enregistre(m) {
    var i = rangModule(m.id);
    // QUI a enregistré ce module. Un mod pose presque toujours un module dont
    // l'id diffère du sien : sans cette marque, ni la purge de horsMontage ni
    // les filtres du module ne sauraient remonter jusqu'au mod que le joueur
    // refuse ou supprime. Posée une fois pour toutes, elle survit au rejeu.
    if (m && modEnExec && !m.__mod) m.__mod = modEnExec;
    if (i >= 0) modules[i] = m;
    else modules.push(m);
    // Hors montage (console du navigateur, script tiers chargé après la fiche) :
    // le prochain mount() remet la table à la table native, et rien ne
    // rejouerait cet enregistrement. On le garde donc, comme le montage rejoue
    // les mods à chaque fois. Le propriétaire est le MOD s'il y en a un, sinon
    // l'id du module : c'est par lui que le rejeu saura s'il a encore un ayant
    // droit (rejoueHorsMontage).
    if (!enMontage)
      gardeHorsMontage({ mod: m, prop: (m && (m.__mod || m.id)) ? String(m.__mod || m.id) : "?" });
    return m;
  }
  // Ordre PARTIEL : les id listés passent devant, dans l'ordre donné ; tous les
  // autres suivent à leur rang de déclaration. La liste est gardée BRUTE et
  // filtrée seulement au montage : un id peut nommer un module pas encore
  // enregistré (un mod chargé après), et un module retiré un jour ne doit pas
  // casser une disposition enregistrée.
  function ordonne(liste) {
    moduleOrdre = [];
    if (!liste) return;
    for (var i = 0; i < liste.length; i++)
      if (moduleOrdre.indexOf(liste[i]) < 0) moduleOrdre.push(liste[i]);
  }
  function ordreModules() {
    var vus = {}, out = [];
    moduleOrdre.forEach(function (id) {
      var i = rangModule(id);
      if (i >= 0 && !vus[id]) { vus[id] = 1; out.push(modules[i]); }
    });
    modules.forEach(function (m) {
      if (!vus[m.id]) { vus[m.id] = 1; out.push(m); }
    });
    return out;
  }

  // Squelette de chaque onglet : ses colonnes, dans l'ordre exact où elles
  // existaient avant le registre. Il vit ici, et pas dans les modules, pour
  // qu'un mod n'ait qu'un bloc à fournir sans rien savoir de la charpente.
  var SQUELETTES = {
    fiche: function (pane) {
      // trois colonnes : narration, caractéristiques, langues | initiative,
      // vitesse, régén, PV, armes | compétences (Body, Mind, Prestance)
      var cols = el("div", "pc-cols-fiche");
      var c1 = el("div", "pc-col");
      var c2 = el("div", "pc-col");
      var c3 = el("div", "pc-col");
      cols.appendChild(c1);
      cols.appendChild(c2);
      cols.appendChild(c3);
      pane.appendChild(cols);
      return { gauche: c1, milieu: c2, droite: c3 };
    },
    art: function (pane) {
      return { seule: pane };   // un seul bloc, sur toute la largeur
    },
    equipement: function (pane) {
      var cols = el("div", "pc-cols2");
      var left = el("div", "pc-col");
      var right = el("div", "pc-col");
      cols.appendChild(left);
      cols.appendChild(right);
      pane.appendChild(cols);
      // « bas » = sous les deux colonnes, pleine largeur (l'inventaire)
      return { gauche: left, droite: right, bas: pane };
    },
    bio: function (pane) {
      var cols = el("div", "pc-cols2");
      var left = el("div", "pc-col");
      var right = el("div", "pc-col");
      cols.appendChild(left);
      cols.appendChild(right);
      pane.appendChild(cols);
      return { gauche: left, droite: right };
    },
    options: function (pane) {
      var cols = el("div", "pc-cols2");
      var colA = el("div", "pc-col");
      var colB = el("div", "pc-col");
      cols.appendChild(colA);
      cols.appendChild(colB);
      pane.appendChild(cols);
      return { gauche: colA, droite: colB };
    }
  };

  // L'interrupteur du module. Seuls les modules COUPÉS figurent dans
  // state.modActifs : tout le reste est actif, y compris un module inconnu de
  // la fiche qui l'ouvre.
  function actif(id) {
    return !state || !state.modActifs || state.modActifs[id] !== false;
  }
  // Couper un module le retire de la fiche sans rien effacer : son coffre et
  // ses données restent, il ne s'affiche plus. C'est le corps de Jjk.active,
  // NOMMÉ ici parce que le bloc Options « Modules » s'en sert aussi : son
  // interrupteur ne doit pas passer par un window.Jjk qu'un mod peut remplacer.
  function activeModule(id, oui) {
    if (!state) return;                  // avant le chargement : rien à couper
    if (!state.modActifs) state.modActifs = {};
    // Le bloc des réglages ne se coupe pas, et le REFUS EST ICI, dans l'écriture,
    // pas seulement dans le montage. Sinon un mod qui appelle Jjk.active laisse
    // « modules: false » dans le personnage pour toujours : le bloc s'affiche
    // (le montage l'exempte) pendant que Jjk.actif("modules") répond faux, et le
    // personnage transmis emporte une incohérence que rien n'efface.
    if (String(id) === MODULE_REGLAGES) { delete state.modActifs[id]; save(); return; }
    if (oui === false) state.modActifs[id] = false;
    else delete state.modActifs[id];
    save();
  }
  var elModules = {};   // id -> l'élément monté (pour marquer une muselière)
  // Le bloc des réglages d'affichage, nommé une fois pour toutes : trois
  // endroits doivent l'épargner, et un id recopié à la main finirait par
  // manquer à l'un d'eux.
  var MODULE_REGLAGES = "modules";

  // Même garde que dans Outward : un module remplacé par un mod, un filtre
  // personnalisé ou un mod actif impose un remontage complet. Pour les modules
  // natifs, une modification distante ne reconstruit que les blocs concernés.
  function moduleNatif(m) {
    return MODULES_NATIFS.some(function (n) { return n.id === m.id && n.build === m.build; });
  }
  function modulesPersoActifs() {
    return (typeof filtres !== "undefined" && Object.keys(filtres).some(function (k) { return filtres[k].length > 0; })) ||
      (Array.isArray(modules) && modules.some(function (m) { return !moduleNatif(m); })) ||
      ((state && state.mods) || []).some(function (m) { return m && m.actif !== false && modAutorise(m.id); });
  }
  function nettoieHooksModule(id) {
    var conserves = [];
    remontageNettoyage.forEach(function (fn) {
      if (fn._jjkModule === id) { try { fn(); } catch (e) {} }
      else conserves.push(fn);
    });
    remontageNettoyage = conserves;
  }
  function construitModule(m, hote, ancien) {
    var reg = regModule(m.id), precedent = hooks, propPrecedent = proprietaireCourant;
    var cleanStart = remontageNettoyage.length, e = null, erreurBuild = null;
    hooks = reg;
    proprietaireCourant = m.__mod || m.id;
    try {
      e = m.build(contexte(m, reg));
      if (e && e.nodeType !== 1) e = null;
      if (e && !e.dataset.module) e.dataset.module = m.id;
      etatModule(m.id).panne = "";
    } catch (err) {
      erreurBuild = err;
      reg.length = 0;
    } finally {
      hooks = precedent;
      proprietaireCourant = propPrecedent;
    }
    if (erreurBuild) {
      remontageNettoyage.splice(cleanStart).forEach(function (fn) { try { fn(); } catch (e) {} });
      e = blocEnPanne(m, erreurBuild);
    } else {
      remontageNettoyage.slice(cleanStart).forEach(function (fn) { fn._jjkModule = m.id; });
    }
    etatModule(m.id).vide = !e;
    if (!e) {
      if (ancien && ancien.parentNode) ancien.parentNode.removeChild(ancien);
      delete elModules[m.id];
      return;
    }
    try {
      if (ancien && ancien.parentNode) ancien.parentNode.replaceChild(e, ancien);
      else hote.appendChild(e);
      elModules[m.id] = e;
    } catch (err2) {
      reg.length = 0;
      remontageNettoyage.splice(cleanStart).forEach(function (fn) { try { fn(); } catch (e) {} });
      var carte = blocEnPanne(m, err2);
      try {
        if (ancien && ancien.parentNode) ancien.parentNode.replaceChild(carte, ancien);
        else hote.appendChild(carte);
        elModules[m.id] = carte;
        etatModule(m.id).panne = messageErreur(err2);
        etatModule(m.id).vide = false;
      } catch (fatal) {
        etatModule(m.id).vide = true;
        delete elModules[m.id];
        if (window.console && window.console.error) window.console.error("[fiche] insertion du module " + m.id, fatal);
      }
    }
  }
  function reconstruitModules(ids) {
    (ids || []).forEach(function (id) {
      var ancien = elModules[id];
      var m = modules.filter(function (x) { return x.id === id; })[0];
      if (!ancien || !ancien.parentNode || !m) return;
      nettoieHooksModule(id);
      regsModules[id] = [];
      if (id === "comps") compHooks = [];
      if (id === "optcomps") optHooks = [];
      etatsModules[id] = { echecs: 0, musele: false, erreur: "", panne: "", vide: false };
      construitModule(m, ancien.parentNode, ancien);
    });
  }

  function monteModules(panes) {
    var colonnes = {};
    elModules = {};
    TABS.forEach(function (t) {
      if (SQUELETTES[t.id] && panes[t.id]) colonnes[t.id] = SQUELETTES[t.id](panes[t.id]);
    });
    ordreModules().forEach(function (m) {
      // Le bloc des réglages ne se coupe pas. Sa puce est déjà absente de la
      // liste, mais un mod (ou une ligne de console) qui appelle
      // Jjk.active("modules", false) écrit le refus DANS LE PERSONNAGE : le
      // bloc ne se monterait plus, et avec lui disparaîtrait le seul endroit
      // d'où l'on rallume un module ou d'où l'on rend la disposition d'origine.
      // Le blocage voyagerait même avec le personnage.
      //
      // Ce test passe AVANT celui de l'hôte : un module coupé n'affiche rien
      // parce que le joueur l'a voulu, il n'a pas à porter la mention de ceux
      // qui ne trouvent pas leur place.
      if (m.id !== MODULE_REGLAGES && !actif(m.id)) return;   // coupé : pas monté
      // « pour » de la table native est un PRÉDICAT (le module n'existe que
      // s'il rend vrai) ; celui d'un mod est une version, gérée ailleurs.
      // Il passe par moduleAffichable, qui l'attrape : un prédicat qui jette
      // emportait sinon TOUT le montage, donc la fiche, sans rien pour rouvrir.
      // Lui aussi avant l'hôte : un module qui n'existe pas ici n'a rien à dire
      // de sa colonne, et le bloc Modules ne lui donne d'ailleurs pas de ligne.
      if (!moduleAffichable(m)) return;
      // Onglet ou colonne inconnus : le module est laissé de côté (un mod mal
      // réglé ne doit pas emporter toute la fiche), mais il est MARQUÉ. Sans ce
      // « vide », un module qui déclare une colonne absente de son onglet ne
      // s'affiche nulle part ET ne se plaint nulle part : sa ligne du bloc
      // Modules le donne pour un module ordinaire, et le joueur cherche une
      // panne qui n'existe pas. aClef, et pas une simple lecture : une colonne
      // nommée « constructor » rendrait autrement une méthode d'Object en guise
      // d'hôte, et le montage tomberait sur le premier appendChild.
      var cols = colonnes[m.onglet];
      var hote = (cols && aClef(cols, m.colonne)) ? cols[m.colonne] : null;
      if (!hote) { etatModule(m.id).vide = true; return; }
      // Construction centralisée : mêmes gardes à l'ouverture et lors d'une
      // mise à jour distante ciblée, avec enregistrement des nettoyages.
      construitModule(m, hote, null);
    });
  }

