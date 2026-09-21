  // ---------- montage ----------
  // UN MONTAGE NE SE RELANCE JAMAIS DEPUIS LUI-MÊME. Un mod qui finit par
  // Owd.remonte() (geste naturel, et la documentation le donne sans réserve) ou
  // par ctx.reconstruire() rappellerait mount() DEPUIS mount() : les mods
  // repartiraient, redemanderaient un remontage, la pile déborderait, et chaque
  // niveau qui se dépile reprendrait son montage là où il en était. L'onglet
  // gèle, à CHAQUE ouverture puisque le mod voyage avec le personnage, et le
  // joueur n'atteint plus le bloc Mods pour couper le fautif.
  //
  // La demande est donc NOTÉE et honorée UNE SEULE FOIS, le montage courant
  // fini. La garde est ici et pas dans remount() : tout ce qui remonte la fiche
  // passe par mount().
  var montageEnCours = false;
  var remontageDu = false;
  var remontagesDus = 0;
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
      // et il a pu laisser une demande de remontage en l'air : le PROCHAIN
      // montage, réussi celui-là, payait un remontage gratuit hérité d'un
      // montage qui n'a jamais abouti
      if (!abouti) { remontageDu = false; remontagesDus = 0; }
    }
    if (!remontageDu) { remontagesDus = 0; return; }
    remontageDu = false;
    if (remontagesDus >= REMONTAGES_MAX) {
      if (window.console && window.console.warn)
        window.console.warn("[fiche] remontage en boucle : demande ignorée. Un mod appelle Owd.remonte() à chaque montage.");
      remontagesDus = 0;
      return;
    }
    remontagesDus++;
    mount(root);
  }
  function montage(root) {
    rootEl = root;
    enMontage = true;
    // Tous les registres repartent à vide : les anciens pointent sur un DOM qui
    // n'existe plus. Les compteurs de panne aussi — un remontage est une
    // seconde chance, c'est ce que fait le bouton « Réessayer ».
    regHors = [];
    regsModules = {};
    etatsModules = {};
    hooks = regHors;
    compHooks = [];
    optHooks = [];
    optCompsRebuild = null;
    compBox = null;
    invRender = null;
    // Filtres et table des modules : même remise à zéro, même raison. Ce sont
    // les mods et les modules qui les repeuplent à chaque montage. Sans elle,
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
    // ne remanie la table : c'est elle qui dit où un module retourne quand on
    // rétablit la disposition d'origine, et le plan s'en sert pour montrer un
    // rangement encore en attente.
    placeOrigine = {};
    modules.forEach(function (m) {
      placeOrigine[m.id] = { onglet: m.onglet, colonne: m.colonne };
    });
    appliqueDisposition();
    root.innerHTML = "";
    // La racine porte les jetons de couleur (jour et nuit) : c'est sur elle que
    // dialogue() accroche ses modales. Le mot « atelier » est réservé au Nen
    // par consigne du dépôt — ici, c'est « perso-fiche », le même mot que l'id
    // GELÉ de roll20-fiche.html.
    var app = el("div", "perso-fiche");
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

  // CHARGER LES DONNÉES ET MONTER SONT DEUX PANNES DIFFÉRENTES, et elles ne se
  // disent pas de la même façon. Le montage vivait dans le .then() du fetch :
  // tout ce qui tombait pendant lui (le plus souvent un mod) se faisait
  // rattraper par le .catch d'à côté, qui accusait le fichier de données d'une
  // faute qui n'était pas la sienne — et data-ready interdisant le réessai, la
  // fiche restait close sur un message faux. Chacun son filet.
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
    // « perso-fiche » : le mot est GELÉ par roll20-fiche.html, que la coquille
    // signée charge en dur. Les deux côtés doivent dire le même mot.
    var root = document.getElementById("perso-fiche");
    if (!root || root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    // point d'entrée des objets donnés au tchat : l'amorce Roll20 appelle ceci
    // quand le joueur clique « Prendre » (et rejoue ce qui attendait le montage)
    window.__owdOnTake = function (payload) {
      if (!state) { flash("La fiche n'est pas encore prête : recliquer « Prendre »."); return; }
      recevoirObjet(payload);
    };
    if (DATA) { demarre(root); return; }
    fetch(dataUrl(), { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      // DATA vide vaut échec : sans lui le montage partirait sans données, et
      // c'est bien du fichier qu'il faudrait alors se plaindre
      .then(function (d) { if (!d) throw new Error("données vides"); DATA = d; })
      .catch(function (e) {
        root.innerHTML = '<p style="padding:2rem;color:#b0402c">La fiche n\'a pas pu charger ses données (' +
          e.message + ").</p>";
      })
      // hors de portée du .catch ci-dessus : DATA dit si les données sont là
      .then(function () { if (DATA) demarre(root); });
  }

  if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
