  // ---------- montage ----------
  // Un montage ne se relance JAMAIS depuis lui-même. Un mod qui finit par
  // Jjk.remonte() (geste naturel, et la page Mods documente remonte() sans
  // réserve) ou par ctx.reconstruire() rappellerait mount() DEPUIS mount() :
  // les mods repartiraient, redemanderaient un remontage, la pile déborderait,
  // et chaque niveau qui se dépile reprendrait son montage là où il en était
  // (page vidée, vingt-cinq blocs rebâtis, refresh, save). L'onglet gèle, à
  // CHAQUE ouverture puisque le mod voyage avec le personnage, et le joueur
  // n'atteint plus le bloc Mods pour couper le fautif. La demande est donc
  // notée et honorée UNE SEULE FOIS, le montage courant fini.
  //
  // La garde est ici et pas dans remount() : tout ce qui remonte la fiche passe
  // par mount(), remount() comme le premier montage.
  var montageEnCours = false;
  var remontageDu = false;
  var remontagesDus = 0;       // enchaînements, pour le mod qui en redemande à chaque fois
  var REMONTAGES_MAX = 3;
  function mount(root) {
    if (montageEnCours) { remontageDu = true; return; }
    montageEnCours = true;
    var abouti = false;
    try { montage(root); abouti = true; }
    finally {
      montageEnCours = false;
      // un montage tombé en route l'a laissé levé : ce qui s'enregistrerait
      // ensuite serait perdu au lieu d'attendre le montage suivant
      enMontage = false;
      // et il a pu laisser une demande de remontage en l'air : la queue de
      // mount() est sautée quand l'exception passe, si bien que le PROCHAIN
      // montage, réussi celui-là, payait un remontage gratuit hérité d'un
      // montage qui n'a jamais abouti.
      if (!abouti) { remontageDu = false; remontagesDus = 0; }
    }
    if (!remontageDu) { remontagesDus = 0; return; }
    remontageDu = false;
    // Un mod qui redemande un remontage à chaque montage boucle sans fin : on
    // s'arrête au bout de trois enchaînements et on le dit dans le journal. La
    // fiche reste utilisable, donc le bloc Mods aussi.
    if (remontagesDus >= REMONTAGES_MAX) {
      if (window.console && window.console.warn)
        window.console.warn("[fiche] remontage en boucle : demande ignorée. Un mod appelle Jjk.remonte() à chaque montage.");
      remontagesDus = 0;
      return;
    }
    remontagesDus++;
    mount(root);
  }
  function montage(root) {
    // Les observateurs et écouteurs du montage précédent ne doivent jamais
    // survivre à une reconstruction complète de la fiche.
    remontageNettoyage.splice(0).forEach(function (f) { try { f(); } catch (e) {} });
    // Les références DOM et leurs empreintes appartiennent au montage : la
    // première passe du nouvel arbre doit réinitialiser tous les hooks.
    refreshEmpreintes = null;
    rootEl = root;
    enMontage = true;
    // tous les registres repartent à vide : les anciens pointent sur un DOM
    // qui n'existe plus. Les compteurs de panne aussi : un remontage est une
    // seconde chance, c'est ce que fait le bouton « Réessayer ».
    regHors = [];
    regsModules = {};
    etatsModules = {};
    hooks = regHors;
    compHooks = [];
    optHooks = [];
    optCompsRebuild = null;
    // Filtres et table des modules : même remise à zéro, même raison. Ce sont
    // les mods et les modules qui les repeuplent, à chaque montage. Sans elle,
    // un mod désinstallé garderait pour toujours la place du module natif qu'il
    // avait remplacé, et ses filtres s'empileraient à chaque remontage.
    filtres = {};
    filtresEnCours = {};
    proprietaireCourant = "?";
    modules = MODULES_NATIFS.slice();
    moduleOrdre = [];
    rejoueHorsMontage();
    // les mods d'abord (ils enregistrent modules et filtres), la disposition
    // ensuite : elle peut nommer un module qu'un mod vient d'ajouter
    executeMods();
    // La place D'ORIGINE de chaque module, relevée AVANT qu'appliqueDisposition
    // ne remanie la table. C'est elle qui dit où un module retourne quand on
    // rétablit la disposition d'origine, et le plan s'en sert pour montrer un
    // rangement encore en attente : sans elle, la table en mémoire porte déjà
    // la place forcée et plus rien ne sait d'où le module venait.
    placeOrigine = {};
    modules.forEach(function (m) {
      placeOrigine[m.id] = { onglet: m.onglet, colonne: m.colonne };
    });
    appliqueDisposition();
    root.innerHTML = "";
    var app = el("div", "perso-atelier");
    appEl = app;

    buildTop(app);
    bandeauAvis(app);
    var sheet = el("div", "pc-sheet");
    app.appendChild(sheet);
    root.appendChild(app);

    buildHead(sheet);
    monteModules(buildTabs(sheet));
    enMontage = false;   // ce qui s'enregistre après (console) vaut pour le montage suivant
    refresh();
    // Un message de présence peut être arrivé avant le bundle : appliquer le
    // mode partagé une seconde fois après que tous les champs existent évite
    // de laisser l'en-tête éditable à l'ouverture en Consultation.
    if (typeof window.__jjkApplyMode === "function") window.__jjkApplyMode();
  }

  // Charger les données et MONTER sont deux pannes différentes, et elles ne se
  // disent pas de la même façon. Le montage vivait dans le .then() du fetch :
  // tout ce qui tombait pendant lui (le plus souvent un mod) se faisait
  // rattraper par le .catch d'à côté, qui accusait alors le fichier de données
  // d'une faute qui n'était pas la sienne — et data-ready interdisant le
  // réessai, la fiche restait close sur un message faux. Chacun son filet.
  // Les opérations reçues des autres fenêtres sont fusionnées par Compact.
  // Une relecture serveur toutes les 1,2 s n'est PAS un motif pour remonter
  // toute la fiche : Outward ne reconstruit que les modules dont la structure
  // a changé, puis restaure le focus et les défilements. Sans cela, chaque
  // écriture distante détruisait tous les champs, les brouillons et les menus.
  function recoitEtatCollaboratif(distant) {
    if (!distant || typeof distant !== "object" || !rootEl) return;
    var s;
    try { s = normalize(distant); }
    catch (e) { if (window.console && window.console.error) window.console.error("[fiche] état distant invalide", e); return; }
    function stable(v) {
      try {
        if (window.JjkSync && window.JjkSync.Compact && typeof window.JjkSync.Compact.stable === "function")
          return window.JjkSync.Compact.stable(v);
      } catch (e) {}
      try { return JSON.stringify(v); } catch (e) { return String(v); }
    }
    if (stable(s) === stable(state)) return;
    var keys = Object.keys(state).concat(Object.keys(s).filter(function (k) {
      return !Object.prototype.hasOwnProperty.call(state, k);
    }));
    var changes = keys.filter(function (k) { return stable(s[k]) !== stable(state[k]); });
    if (!changes.length) return;

    // Clés qui changent la liste ou la structure d'un module JJK. Les valeurs
    // simples restent dans les hooks de refresh, sans détruire les champs.
    var structural = {
      notes: ["notes"], notesJournal: ["notes"], background: ["bg"],
      avantages: ["avantages"],
      comps: ["comps", "optcomps", "armescomp"],
      customComps: ["comps", "optcomps"],
      compsMod: ["comps", "optcomps", "armescomp"],
      compsMod2: ["comps", "optcomps", "armescomp"],
      compsXpMod2: ["comps", "optcomps", "armescomp"],
      compsForce: ["comps", "optcomps", "armescomp"],
      compsXpForce: ["comps", "optcomps", "armescomp"],
      compsXpMod: ["comps", "optcomps", "armescomp"],
      armesComps: ["comps", "optcomps", "armescomp"],
      langues: ["langues", "comps", "optcomps"],
      armes: ["armes"], armures: ["armures"],
      inv: ["inv"], inventaire: ["inv"], de: ["jets"]
    };
    var scalar = [
      "v", "rel", "name", "portrait", "espece", "age", "sexe", "genre",
      "defaut", "qualites", "sansLimite", "caracsPlafondMod", "caracsPlafondForce",
      "ptsCreaMod", "ptsCreaForce", "caracsBase", "caracsXp", "caracsMod",
      "caracsMod2", "caracsForce", "caracsXpForce", "caracsXpMod",
      "caracsXpMod2", "xpTotal", "pv", "narration", "divers",
      "pvMaxOverride", "vitesseOverride", "regenOverride", "langueBase"
    ];
    var targets = [];
    var partial = !modulesPersoActifs() && changes.every(function (k) {
      return Object.prototype.hasOwnProperty.call(structural, k) || scalar.indexOf(k) >= 0;
    });
    if (partial) changes.forEach(function (k) {
      (structural[k] || []).forEach(function (id) { if (targets.indexOf(id) < 0) targets.push(id); });
    });

    var active = document.activeElement, focus = null, positions = [];
    function signature(c) {
      return [c.tagName, c.type || "", c.className || "",
        c.getAttribute("placeholder") || "", c.getAttribute("aria-label") || ""].join("|");
    }
    function anchor(c) {
      var a = c.closest("[data-sync-entity], [data-id], [data-module]") || rootEl;
      var m = a.closest("[data-module]");
      return { module: m ? m.dataset.module : "",
        entity: a.dataset ? (a.dataset.syncEntity || a.dataset.id || "") : "", el: a };
    }
    if (active && rootEl.contains(active) && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) {
      var a = anchor(active), sig = signature(active);
      var similar = Array.prototype.filter.call(a.el.querySelectorAll("input,textarea,select"), function (c) { return signature(c) === sig; });
      focus = { module: a.module, entity: a.entity, signature: sig, index: similar.indexOf(active),
        value: active.value, start: active.selectionStart, end: active.selectionEnd,
        direction: active.selectionDirection, scroll: active.scrollTop };
    }
    var sx = window.scrollX || 0, sy = window.scrollY || 0;
    Array.prototype.forEach.call(rootEl.querySelectorAll("[data-module]"), function (m) {
      if (partial && targets.indexOf(m.dataset.module) < 0) return;
      Array.prototype.forEach.call(m.querySelectorAll("*"), function (n, i) {
        if (n.scrollTop || n.scrollLeft) positions.push({ module: m.dataset.module, index: i, top: n.scrollTop, left: n.scrollLeft });
      });
    });

    if (partial) {
      changes.forEach(function (k) {
        if (s[k] === undefined) delete state[k];
        else state[k] = s[k];
      });
      reconstruitModules(targets);
      refresh();
    } else {
      state = s;
      mount(rootEl);
    }

    positions.forEach(function (p) {
      var m = Array.prototype.find.call(rootEl.querySelectorAll("[data-module]"), function (n) { return n.dataset.module === p.module; });
      var n = m && m.querySelectorAll("*")[p.index];
      if (n) { n.scrollTop = p.top; n.scrollLeft = p.left; }
    });
    if (focus) {
      var scope = rootEl;
      if (focus.module) scope = Array.prototype.find.call(rootEl.querySelectorAll("[data-module]"), function (n) { return n.dataset.module === focus.module; });
      if (scope && focus.entity) scope = Array.prototype.find.call(scope.querySelectorAll("[data-sync-entity], [data-id]"), function (n) { return (n.dataset.syncEntity || n.dataset.id) === focus.entity; });
      if (scope) {
        var fields = Array.prototype.filter.call(scope.querySelectorAll("input,textarea,select"), function (c) { return signature(c) === focus.signature; });
        var field = fields[focus.index];
        if (field && !field.disabled) {
          field.focus({ preventScroll: true });
          field.value = focus.value;
          try { if (focus.start !== null) field.setSelectionRange(focus.start, focus.end, focus.direction); } catch (e) {}
          field.scrollTop = focus.scroll;
        }
      }
    }
    try { window.scrollTo(sx, sy); } catch (e) {}
  }

  window.addEventListener("jjk-compact-sync", function (ev) {
    if (!ev || !ev.detail || typeof ev.detail !== "object" || !rootEl) return;
    try { recoitEtatCollaboratif(ev.detail); }
    catch (e) { if (window.console && window.console.error) window.console.error("[fiche] resynchronisation distante", e); }
  });

  function signaleEchecOuverture(e) {
    var message = messageErreur(e);
    if (window.Jjk) { window.Jjk.__pret = false; window.Jjk.__erreur = message; }
    try { window.dispatchEvent(new CustomEvent("jjk-fiche-mount-error", { detail: message })); } catch (ignore) {}
  }
  function demarre(root) {
    if (window.Jjk) { window.Jjk.__pret = false; window.Jjk.__erreur = ""; }
    state = load() || blank();
    try {
      mount(root);
      // Outward expose la même sentinelle : l'amorce ne déclare le bundle
      // monté qu'après la construction effective du DOM et le premier refresh.
      if (window.Jjk) { window.Jjk.__erreur = ""; window.Jjk.__pret = true; }
      try { window.dispatchEvent(new CustomEvent("jjk-fiche-mounted")); } catch (ignore) {}
    }
    catch (e) {
      signaleEchecOuverture(e);
      if (window.console && window.console.error) window.console.error("[fiche] montage", e);
      root.innerHTML = '<p style="padding:2rem;color:#b0402c">La fiche n\'a pas pu se monter (' +
        messageErreur(e) + "). Les données, elles, sont chargées : la cause est dans la fiche ou dans un mod.</p>";
    }
  }
  function init() {
    var root = document.getElementById("perso-atelier");
    if (!root || root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    // point d'entrée des objets donnés au tchat : l'amorce Roll20 appelle ceci
    // quand le joueur clique « Prendre » (et rejoue ce qui attendait le montage)
    window.__jjkOnTake = function (payload) {
      if (!state) { flash("La fiche n'est pas encore prête : reclique « Prendre »."); return; }
      recevoirObjet(payload);
    };
    if (DATA) { demarre(root); return; }
    fetch(dataUrl(), { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      // DATA vide vaut échec : sans lui le montage partirait sans données, et
      // c'est bien du fichier qu'il faudrait alors se plaindre
      .then(function (d) { if (!d) throw new Error("données vides"); DATA = d; })
      .catch(function (e) {
        signaleEchecOuverture(e);
        root.innerHTML = '<p style="padding:2rem;color:#b0402c">Le créateur n\'a pas pu charger ses données (' + e.message + ").</p>";
      })
      // hors de portée du .catch ci-dessus : DATA dit si les données sont là
      .then(function () { if (DATA) demarre(root); });
  }

  if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
