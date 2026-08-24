  // ---------- garde : éteinte ? puis quel mode ? ----------
  // Les deux copies de ce fichier sont injectées dans CHAQUE frame de Roll20 :
  // le manifeste les déclare toutes les deux, et rien ne permet d'en charger une
  // seule à l'exécution. C'est donc ici, et nulle part ailleurs, que la copie qui
  // n'est pas du mode s'arrête, et ici aussi que les DEUX s'arrêtent quand
  // l'extension est éteinte.
  //
  // Le mode ne vit que dans browser.storage.local, dont la lecture est
  // ASYNCHRONE dans un script de contenu : il n'existe aucune lecture synchrone
  // équivalente. Une garde écrite en tête de fichier aurait donc, au mieux, déjà
  // laissé passer quelque chose. C'est pourquoi tout ce qui a un effet est
  // enfermé dans demarre(), appelé d'ici seulement.
  //
  // UNE SEULE LECTURE pour les trois réglages. Trois lectures, ce serait trois
  // moments différents, donc trois occasions de se contredire : on a déjà vu
  // l'onglet annoncer un mode et montrer l'autre pour exactement cette raison.
  // Ici les deux copies lisent la même chose au même instant : éteintes, elles
  // se taisent toutes les deux, et il n'y a pas de course à arbitrer.
  //
  // miaOff ABSENT VAUT ALLUMÉ, et la comparaison est stricte : une extension
  // fraîchement installée, dont le stockage est vide, doit fonctionner.
  //
  // Un rejet du stockage désigne explicitement le mode stable, allumé. Sans ce
  // choix, les DEUX copies se tairaient et l'onglet disparaîtrait sans un mot ;
  // la partie publiée est celle qui doit survivre à une panne. Le prix est
  // assumé : si le stockage était injoignable, on ne saurait pas non plus que
  // l'utilisateur a éteint. Cela ne se produit que si l'API storage manque
  // elle-même, c'est-à-dire jamais tant que la permission est accordée.
  //
  // CE QU'ÉTEINDRE FAIT, ET CE QU'IL NE PEUT PAS FAIRE. Le popup doit pouvoir
  // le dire au joueur sans mentir, alors voici l'inventaire exact.
  //   Sur les pages Roll20 OUVERTES ENSUITE, rien ne se réveille : pas d'onglet
  //   « Fiche MIA », pas de pane, pas de pont d20 (il n'est injecté que sur
  //   need-bridge, qui ne part plus), aucun écouteur de message, aucune
  //   interception du lien « Prendre », aucune écriture dans le stockage. La
  //   frame reste exactement telle que Roll20 l'a faite.
  //   Sur une partie DÉJÀ OUVERTE, rien ne se démonte, et c'est délibéré :
  //     - le pont posé dans le monde principal ne peut pas être retiré. Aucun
  //       script de contenu n'atteint ce monde, sa balise <script> s'est retirée
  //       toute seule à l'onload et son écouteur, lui, est resté ;
  //     - les écouteurs déjà posés sont des fonctions anonymes (message de la
  //       frame du haut, clic de capture de « Prendre », resize, ResizeObserver) :
  //       removeEventListener n'a rien à leur passer ;
  //     - le pane .tab-pane.miafiche ne doit surtout pas être retiré. Le système
  //       d'onglets de Roll20 garde un renvoi vers lui ; le supprimer d'un
  //       dialogue déjà lié empêche la fiche du personnage de s'ouvrir, la
  //       nôtre comme les siennes ;
  //     - overlay.css est injectée par le manifeste dans toutes les frames et ne
  //       se retire pas non plus. Elle ne peint rien tant que rien ne porte nos
  //       classes.
  //   Autrement dit : éteindre prend effet AU RECHARGEMENT DE LA PARTIE, comme
  //   chez uBlock. C'est la seule promesse tenable, et la seule qui ne laisse
  //   pas Roll20 à moitié démonté.
  function garde() {
    try {
      browser.storage.local.get(["miaOff", "miaBeta", "miaNuit"]).then(
        function (r) {
          if (r && r.miaOff === true) return;   // éteinte : aucune des deux copies ne bouge
          NUIT_ORDRE = normNuit(r && r.miaNuit);
          if ((r && r.miaBeta ? "beta" : "stable") === MODE) reclame();
        },
        function () { if (MODE === "stable") reclame(); }
      );
    } catch (e) {
      if (MODE === "stable") reclame();
    }
  }
  // Verrou de frame. Les deux copies partagent le monde isolé, donc cet objet
  // window (un expando de script de contenu reste invisible de la page, comme le
  // window.__miaBridge du pont l'est du monde isolé). Si les deux se réveillaient
  // ensemble (stockage incohérent, extension rechargée, bascule pendant la
  // lecture), la première arrivée prend la frame et la seconde se tait. Sans ce
  // verrou, deux écouteurs « message » dans la frame du haut enverraient chaque
  // jet DEUX FOIS au tchat : le site poste vers window.top avec « * », tous les
  // écouteurs reçoivent le même message, et sendToChat ne dédoublonne rien.
  //
  // Deuxième ligne de défense, gratuite et volontairement conservée : les
  // marqueurs de DOM portent les MÊMES noms dans les deux copies (classe
  // .mia-tab, attribut data-mia-bridge), si bien que placeTabs abandonne tout
  // seul devant le travail de l'autre copie.
  function reclame() {
    try {
      if (window.__miaRoll20) return;   // une copie tient déjà cette frame
      window.__miaRoll20 = MODE;
    } catch (e) {}
    demarre();
  }
  garde();
})();
