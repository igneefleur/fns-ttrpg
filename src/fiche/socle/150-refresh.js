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
  function refresh() {
    save();
    var bilan = {};
    joue("", regHors, bilan);
    // les clés d'un objet se parcourent dans leur ordre de création : c'est
    // l'ordre de montage des modules, donc l'ordre où les hooks se poussaient
    // avant qu'ils ne soient séparés — l'affichage ne bouge pas
    Object.keys(regsModules).forEach(function (id) { joue(id, regsModules[id], bilan); });
    // deux registres rebâtissables : ils appartiennent à leur module (même id,
    // donc même muselière) mais vivent à part, leurs lignes étant détruites et
    // recréées sans que le module le soit
    joue("comps", compHooks, bilan);
    joue("optcomps", optHooks, bilan);
    Object.keys(bilan).forEach(function (id) {
      var e = etatModule(id);
      if (e.musele) return;
      if (!bilan[id]) { e.echecs = 0; return; }
      e.echecs++;
      e.erreur = messageErreur(bilan[id]);
      // « » n'est pas un module mais ce qui encadre les onglets (barre
      // d'outils, en-tête, barre d'envoi) : le museler éteindrait la fiche
      // elle-même, sans bloc à marquer ni interrupteur pour le rallumer. Ses
      // hooks restent sous try/catch, c'est là qu'est la protection.
      if (id && e.echecs >= MUSELIERE) {
        e.musele = true;
        museleAffiche(id, e);
      }
    });
  }
  // Remplacement d'état COMPLET (import, bibliothèque, nouveau personnage) :
  // toutes les sections tiennent des références sur l'ancien état, on remonte
  // donc la fiche entière depuis le nouvel état.
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

