  // ---------- pose de l'onglet dans la barre d'onglets du dialogue ----------
  // LA BARRE SE RECONNAÎT À SES ONGLETS, JAMAIS À LEURS NOMS.
  //
  // L'onglet se posait entre « Feuille de personnage » et « Bio & Info »,
  // trouvés par leur libellé. Trois défauts, et le troisième est le pire :
  // l'interface de Roll20 est LOCALISÉE selon le compte, donc il fallait
  // connaître d'avance la traduction de chaque langue ; les libellés changent
  // au gré de Roll20 ; et surtout, une campagne SANS feuille de personnage n'a
  // pas d'onglet « Feuille de personnage » du tout — l'onglet ne se posait
  // alors jamais, sans le moindre message.
  //
  // On repère donc la barre par les liens « data-tab » que Roll20 y pose, quels
  // qu'ils disent, et on prend la DEUXIÈME PLACE. Aucun libellé n'est lu, aucun
  // onglet particulier n'a besoin d'exister.
  function barresOnglets() {
    var liens = document.querySelectorAll("a[data-tab]");
    var barres = [];
    for (var i = 0; i < liens.length; i++) {
      var item = liens[i].parentNode;
      var strip = item && item.parentNode;
      if (!strip || strip === document.body || strip === document.documentElement) continue;
      // une barre d'onglets est courte : au-delà, on est tombé sur un conteneur
      // qui n'en est pas une, et notre onglet s'y perdrait
      if (strip.children.length > 24) continue;
      if (barres.indexOf(strip) < 0) barres.push(strip);
    }
    return barres;
  }
  // Les ITEMS d'une barre, c'est-à-dire ceux qui portent vraiment un onglet :
  // Roll20 glisse parfois autre chose entre eux, et compter les enfants nus
  // poserait le nôtre au mauvais rang.
  function itemsOnglets(strip) {
    var out = [];
    for (var i = 0; i < strip.children.length; i++) {
      var c = strip.children[i];
      if (c.querySelector && c.querySelector("a[data-tab]")) out.push(c);
    }
    return out;
  }
  function dialogOf(node) {
    return node.closest(".ui-dialog") || node.closest("[class*='dialog']") || node.offsetParent || node.parentElement;
  }
  // CE DIALOGUE EST-IL CELUI D'UN PERSONNAGE ? La question ne se posait pas tant
  // qu'on cherchait l'onglet « Feuille de personnage » : le trouver répondait
  // déjà oui. Maintenant qu'on ne lit plus aucun libellé, n'importe quelle barre
  // d'onglets de Roll20 — celle des réglages, celle d'un mod — recevrait notre
  // onglet, et il s'ouvrirait sur la fiche d'un personnage qui n'est pas là.
  //
  // On exige donc que le dialogue PORTE LUI-MÊME la marque, plutôt que de se
  // contenter du charId : celui-ci se rabat en dernier recours sur le premier
  // [data-characterid] du document, c'est-à-dire sur un AUTRE dialogue resté
  // ouvert à côté.
  function estDialoguePersonnage(dialog) {
    try {
      var fe = window.frameElement;
      if (fe && fe.closest && fe.closest(".characterdialog")) return true;
    } catch (e) {}
    if (dialog && dialog.matches && dialog.matches(".characterdialog, [data-characterid]")) return true;
    if (dialog && dialog.closest && dialog.closest(".characterdialog, [data-characterid]")) return true;
    if (dialog && dialog.querySelector && dialog.querySelector("[data-characterid]")) return true;
    // fenêtre popout : pas de dialogue autour, l'adresse fait foi
    return /^\/editor\/character\//.test(location.pathname);
  }
  function contentBoxOf(dialog, strip) {
    return (dialog.querySelector && dialog.querySelector(".tab-content")) || strip.nextElementSibling;
  }

  function placeTabs() {
    var placed = 0;
    barresOnglets().forEach(function (strip) {
      var items = itemsOnglets(strip);
      // Le PREMIER onglet natif sert de patron : on lui emprunte sa balise et
      // ses classes, pour que le nôtre ait exactement le même aspect et le même
      // violet une fois actif. Sans lui, rien à cloner : on passe.
      var modele = items[0];
      if (!modele) return;
      var dialog = dialogOf(strip);
      if (!estDialoguePersonnage(dialog)) return;
      var charId = charIdOfFrame(dialog);

      if (strip.querySelector(".mia-tab")) { placed++; return; }   // déjà là

      var contentBox = contentBoxOf(dialog, strip);
      // conteneur des panes = parent d'un pane natif (là où Roll20 les place)
      var nativePane = (dialog && dialog.querySelector(".tab-pane")) || document.querySelector(".tab-pane");
      var paneBox = (nativePane && nativePane.parentNode) || contentBox;
      if (!paneBox) return;

      // On travaille AVEC le système d'onglets de Jumpgate (source vérifiée) :
      //   bindTabEvents() fait, pour chaque `.nav li a`,
      //     allTabs[a.data-tab] = find('.tab-pane.'+data-tab)[0]; allTabs[...].style...
      //   -> si le pane manque, allTabs[...] est undefined et Roll20 PLANTE (fiche
      //   qui ne s'ouvre plus). On crée donc TOUJOURS le pane `.tab-pane.miafiche`
      //   AVANT de poser l'onglet `<a data-tab="miafiche">` : Roll20 l'enregistre et
      //   le gère nativement (affichage + onglet actif violet).
      var pane = paneBox.querySelector(".tab-pane.miafiche");
      if (!pane) {
        pane = el("div", "tab-pane miafiche mia-pane");
        pane.style.display = "none";
        paneBox.appendChild(pane);
      }

      // vrai onglet, cloné des onglets natifs (styles Roll20 : look + actif violet)
      var tab = document.createElement(modele.tagName || "li");
      tab.className = ((modele.className || "").replace(/\b(active|ui-tabs-active|ui-state-active|chosen)\b/g, "").trim() + " mia-tab").trim();
      var nativeA = modele.querySelector("a");
      var a = document.createElement("a");
      if (nativeA && nativeA.className) a.className = nativeA.className;
      a.setAttribute("href", "javascript:void(0);");
      a.setAttribute("data-tab", "miafiche");
      a.textContent = LIBELLE;
      tab.appendChild(a);

      var built = false;
      function showOurPane() {
        var panes = paneBox.querySelectorAll(".tab-pane");
        for (var j = 0; j < panes.length; j++) panes[j].style.display = (panes[j] === pane) ? "block" : "none";
        pane.classList.add("mia-on");   // seule cette classe rend le pane visible (overlay.css)
        for (var k = 0; k < strip.children.length; k++) strip.children[k].classList.remove("active");
        tab.classList.add("active");
        refitFrame();   // l'iframe redevient visible : réajuster sa hauteur au dialogue
      }
      function hideOurPane() { pane.style.display = "none"; pane.classList.remove("mia-on"); tab.classList.remove("active"); }

      // On gère nous-mêmes l'affichage (fiable quel que soit le moment où bindTabEvents
      // s'exécute) et on bloque le gestionnaire délégué de Roll20 pour NOTRE onglet.
      a.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        if (!built) { built = true; requestBridge(); populate(pane, charId); }
        showOurPane();
      });
      // clic sur un onglet natif -> on masque le nôtre (Roll20 affiche le sien)
      strip.addEventListener("click", function (ev) {
        var na = ev.target.closest && ev.target.closest("a[data-tab]");
        if (na && na.getAttribute("data-tab") !== "miafiche") hideOurPane();
      }, true);

      // DEUXIÈME PLACE : devant l'onglet qui occupe le rang 2. S'il n'y en a
      // qu'un, insertBefore(tab, undefined) ajoute à la fin — et le deuxième
      // rang, c'est justement la fin.
      strip.insertBefore(tab, items[1] || null);
      placed++;
    });
    return placed;
  }

