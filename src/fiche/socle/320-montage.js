  // ---------- montage ----------
  // Un montage ne se relance JAMAIS depuis lui-même. Un mod qui finit par
  // Mia.remonte() (geste naturel, et la page Mods documente remonte() sans
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
        window.console.warn("[fiche] remontage en boucle : demande ignorée. Un mod appelle Mia.remonte() à chaque montage.");
      remontagesDus = 0;
      return;
    }
    remontagesDus++;
    mount(root);
  }
  function montage(root) {
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
    optSpesHooks = [];
    optSpesRebuild = null;
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
  }

  // Charger les données et MONTER sont deux pannes différentes, et elles ne se
  // disent pas de la même façon. Le montage vivait dans le .then() du fetch :
  // tout ce qui tombait pendant lui (le plus souvent un mod) se faisait
  // rattraper par le .catch d'à côté, qui accusait alors le fichier de données
  // d'une faute qui n'était pas la sienne — et data-ready interdisant le
  // réessai, la fiche restait close sur un message faux. Chacun son filet.
  function demarre(root) {
    state = load() || blank();
    try { mount(root); }
    catch (e) {
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
    window.__miaOnTake = function (payload) {
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
        root.innerHTML = '<p style="padding:2rem;color:#b0402c">Le créateur n\'a pas pu charger ses données (' + e.message + ").</p>";
      })
      // hors de portée du .catch ci-dessus : DATA dit si les données sont là
      .then(function () { if (DATA) demarre(root); });
  }

  if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
