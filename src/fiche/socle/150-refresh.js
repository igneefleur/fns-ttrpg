  // ---------- refresh ----------
  // Registres de rafraîchissement : les fonctions rappelées à chaque
  // changement d'état. Il y en a UN PAR MODULE, plus un pour ce qui n'est pas
  // un module (barre d'outils, en-tête, barre d'envoi). Tous sont remis à zéro
  // à chaque mount() (navigation instantanée comprise) pour ne pas s'accumuler.
  //
  // « hooks » désigne le registre COURANT : monteModules le fait pointer sur
  // celui du module en construction, puis le rend. Les briques (textInput,
  // stepper, bigTile, gearBtn…) continuent donc d'écrire dans « hooks » sans
  // rien savoir des modules, et chaque fonction atterrit chez son propriétaire.
  // C'est ce qui permet de museler un module sans toucher aux autres.
  var regHors = [];             // hors module : ce qui encadre les onglets
  var regsModules = {};         // id -> tableau de fonctions (ordre de montage)
  var hooks = regHors;
  var compHooks = [];           // lignes de compétences, vidées par rebuildComps()
  var optHooks = [];            // bloc Options « Modificateurs de compétences », rebâtissable
  var optCompsRebuild = null;   // posé par le module « optcomps » ; rappelé quand les comps perso changent
  // filtres du bloc, survivants au remount comme ceux de la Fiche
  var optFilter = "";
  var optChamp = "";
  var optOnly = COMPACT;        // Roll20 : investies seulement par défaut, comme la Fiche
  var optPerso = true;          // décoché : seules les compétences de base du jeu

  function regModule(id) {
    if (!regsModules[id]) regsModules[id] = [];
    return regsModules[id];
  }
  // Musellement : un module dont le registre jette EN CHAÎNE finit par se
  // taire. Cinq échecs consécutifs, parce qu'un hook peut échouer une fois sur
  // un état transitoire (une frappe en cours) sans être cassé pour autant ;
  // cinq fois d'affilée, c'est le module qui est en faute. Une seule
  // réussite remet le compteur à zéro.
  var MUSELIERE = 5;
  var etatsModules = {};        // id -> { echecs, musele, erreur, panne }
  function etatModule(id) {
    if (!etatsModules[id])
      etatsModules[id] = { echecs: 0, musele: false, erreur: "", panne: "", vide: false };
    return etatsModules[id];
  }
  function messageErreur(e) {
    return String((e && (e.message || e.toString())) || "erreur inconnue");
  }
  // Un registre tourne SOUS SON PROPRE try/catch, fonction par fonction : un
  // hook qui jette n'interrompt plus le rafraîchissement des autres, et ne
  // fige donc plus la fiche entière.
  //
  // Le résultat n'est pas jugé ici mais RETENU dans le bilan de la passe, et
  // le compteur ne bouge qu'une fois la passe finie. C'est nécessaire parce
  // qu'un même id peut avoir DEUX registres (« comps » et « optcomps » ont
  // aussi celui de leurs lignes rebâties) : en jugeant registre par registre,
  // la réussite du premier remettait le compteur à zéro juste avant l'échec du
  // second, et la muselière de ces deux modules-là n'aurait jamais pu tomber.
  function joue(id, reg, bilan) {
    if (etatModule(id).musele) return;
    if (bilan[id] === undefined) bilan[id] = null;   // registre vu, sans échec
    for (var i = 0; i < reg.length; i++) {
      try { reg[i](); } catch (err) { if (!bilan[id]) bilan[id] = err; }
    }
  }
  // Une même cadence de relecture ne doit pas faire clignoter toute la fiche.
  // Outward compare les empreintes de l'état et ne relance que les registres
  // qui dépendent réellement des clés modifiées. Les modules JJK gardent leur
  // propre carte de dépendances (les attributs Roll20 sont traduits en ces clés
  // par JjkAttrMap avant d'arriver ici).
  var refreshEmpreintes = null;
  var VUE_DEPENDANCES = {
    narration: ["narration"],
    caracs: ["caracsBase", "caracsXp", "caracsMod", "caracsMod2", "caracsForce", "caracsXpForce", "caracsXpMod", "caracsXpMod2", "caracsPlafondMod", "caracsPlafondForce", "sansLimite"],
    langues: ["langues", "langueBase", "comps", "compsMod", "compsMod2", "compsXpMod2", "compsForce", "compsXpForce", "compsXpMod", "armesComps"],
    initiative: ["caracsBase", "caracsXp", "caracsMod", "caracsMod2", "caracsForce", "comps", "compsMod", "compsMod2", "compsForce", "armesComps", "inv", "inventaire"],
    tuiles: ["caracsBase", "caracsXp", "caracsMod", "caracsMod2", "caracsForce", "divers", "vitesseOverride", "regenOverride", "inv", "inventaire"],
    pv: ["pv", "pvMaxOverride", "divers"],
    armescomp: ["armesComps", "comps", "compsMod", "compsMod2", "compsXpMod2", "compsForce", "compsXpForce", "compsXpMod"],
    comps: ["comps", "customComps", "compsMod", "compsMod2", "compsXpMod2", "compsForce", "compsXpForce", "compsXpMod", "langues", "armesComps"],
    arts: ["mods", "modData", "modActifs"],
    armes: ["armes", "comps", "armesComps", "inv", "inventaire"],
    armures: ["armures", "inv", "inventaire"],
    inv: ["inv", "inventaire", "armes", "armures", "divers"],
    perso: ["name", "espece", "age", "sexe", "genre", "defaut", "qualites"],
    avantages: ["avantages"],
    bg: ["background"],
    notes: ["notes", "notesJournal", "name"],
    jets: ["de"],
    actions: ["name"],
    modcaracs: ["caracsBase", "caracsXp", "caracsMod", "caracsMod2", "caracsForce", "caracsXpForce", "caracsXpMod", "caracsXpMod2", "caracsPlafondMod", "caracsPlafondForce", "sansLimite"],
    xpchamps: ["xpTotal", "caracsXp", "caracsXpForce", "caracsXpMod", "caracsXpMod2", "comps", "compsForce", "compsXpForce", "compsXpMod"],
    creation: ["ptsCreaMod", "ptsCreaForce", "caracsBase", "caracsXp", "caracsPlafondMod", "caracsPlafondForce", "sansLimite", "comps", "compsForce", "xpTotal"],
    mods: ["mods", "modData", "modActifs"],
    modules: ["modules", "modActifs"],
    optcomps: ["comps", "customComps", "compsMod", "compsMod2", "compsXpMod2", "compsForce", "compsXpForce", "compsXpMod", "armesComps", "langues"]
  };
  var DEPENDANCES_CONNues = { v: 1, rel: 1, portrait: 1 };
  Object.keys(VUE_DEPENDANCES).forEach(function (id) {
    VUE_DEPENDANCES[id].forEach(function (k) { DEPENDANCES_CONNues[k] = 1; });
  });
  function empreinteRefresh(v) {
    try {
      if (window.JjkSync && window.JjkSync.Compact && typeof window.JjkSync.Compact.stable === "function")
        return window.JjkSync.Compact.stable(v);
    } catch (e) {}
    return JSON.stringify(v);
  }
  function refresh(force) {
    save();
    var stamps = {}, changes = [], invalidStamp = false;
    try {
      Object.keys(state || {}).forEach(function (k) { stamps[k] = empreinteRefresh(state[k]); });
    } catch (e) { invalidStamp = true; }
    Object.keys(stamps).forEach(function (k) {
      if (!refreshEmpreintes || stamps[k] !== refreshEmpreintes[k]) changes.push(k);
    });
    Object.keys(refreshEmpreintes || {}).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(stamps, k) && changes.indexOf(k) < 0) changes.push(k);
    });
    var cleInconnue = changes.some(function (k) { return !DEPENDANCES_CONNues[k]; });
    var premierePasse = !refreshEmpreintes;
    // JJK reçoit une photographie Roll20 toutes les 1,2 s. Une lecture
    // identique ne doit PAS reconstruire les modules : contrairement aux
    // rafraîchissements ponctuels d'Outward, ce chemin est périodique. Les
    // hooks hors module restent exécutés pour garder l'en-tête et la barre
    // cohérents ; les modules ne tournent que si une de leurs données change,
    // si l'appelant force la passe ou si un mod exige le rafraîchissement total.
    var tout = invalidStamp || force === true || premierePasse || modulesPersoActifs() || cleInconnue;
    refreshEmpreintes = invalidStamp ? null : stamps;
    function doit(id) {
      if (tout) return true;
      if (VUE_DEPENDANCES[id]) return changes.some(function (k) { return VUE_DEPENDANCES[id].indexOf(k) >= 0; });
      // Les clés d'identité ne concernent que les registres hors module et
      // « Personnalité » / « Notes », déjà traités explicitement ci-dessus.
      if (changes.every(function (k) { return ["name", "portrait", "espece", "age", "sexe", "genre"].indexOf(k) >= 0; })) return false;
      // Une nouvelle clé ou une dépendance inconnue doit rester visible :
      // mieux vaut rafraîchir un module de trop que laisser un champ périmé.
      return true;
    }
    var bilan = {};
    joue("", regHors, bilan);
    Object.keys(regsModules).forEach(function (id) { if (doit(id)) joue(id, regsModules[id], bilan); });
    if (doit("comps")) joue("comps", compHooks, bilan);
    if (doit("optcomps")) joue("optcomps", optHooks, bilan);
    Object.keys(bilan).forEach(function (id) {
      var e = etatModule(id);
      if (e.musele) return;
      if (!bilan[id]) { e.echecs = 0; return; }
      e.echecs++;
      e.erreur = messageErreur(bilan[id]);
      if (id && e.echecs >= MUSELIERE) {
        e.musele = true;
        museleAffiche(id, e);
      }
    });
    // Les contrôles de construction sont recréés par certains modules : le
    // verrou global doit être reposé après chaque passe, comme dans Outward.
    if (typeof window.__jjkApplyMode === "function") window.__jjkApplyMode();
  }

  // Remplacement d'état COMPLET (import, bibliothèque, nouveau personnage) :
  // toutes les sections tiennent des références sur l'ancien état, on remonte
  // donc la fiche entière depuis le nouvel état.
  // Nettoyage des ressources attachées au DOM des modules (observateurs,
  // timers et écouteurs document/window). Outward utilise le même registre :
  // un module reconstruit doit d'abord libérer ce qu'il avait installé.
  var remontageNettoyage = [];
  var rootEl = null;
  var appEl = null;      // le .perso-atelier monté : porte les jetons de couleur
  // C'est aussi ce que rend ctx.reconstruire et Jjk.remonte. Appelé PENDANT un
  // montage (un mod, un hook), il ne relance rien sur-le-champ : mount() note
  // la demande et l'honore une fois le montage courant fini.
  function remount() { if (rootEl) mount(rootEl); }

  function flash(msg) {
    var f = document.querySelector(".pc-flash") || el("div", "pc-flash");
    f.textContent = msg;
    document.body.appendChild(f);
    f.classList.add("on");
    setTimeout(function () { f.classList.remove("on"); }, 2600);
  }

