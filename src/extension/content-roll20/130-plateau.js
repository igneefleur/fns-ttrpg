  // ---------- le plateau de Narration : ancré à la barre, ou flottant ----------
  // Un panneau posé DANS la partie, que tous les joueurs voient : les jetons de
  // narration s'y poussent d'une place à l'autre. Le contenu est servi par le
  // site (roll20-narration.html) à travers la coquille générique panneau.html :
  // tout ce qui suit est un CHÂSSIS, et rien d'autre — s'ouvrir, se ranger,
  // s'étirer, se souvenir. Le plateau lui-même peut donc changer autant qu'il
  // voudra sans re-signature.
  //
  // DEUX PLACES, JAMAIS DEUX PLATEAUX. Par défaut il s'ANCRE : un bouton dans la
  // barre d'outils de Roll20 l'ouvre et le referme, et il se déplie collé à la
  // barre, sur toute la hauteur, comme les panneaux natifs. Il ne flotte plus,
  // ne se déplace plus, et ne recouvre plus la carte au hasard de l'endroit où
  // on l'avait laissé. Qui le préfère détaché a le second choix : le bouton
  // « Détacher » de sa barre de titre le rend flottant, avec sa place et sa
  // taille d'avant. C'est LA MÊME BOÎTE et LA MÊME IFRAME dans les deux cas —
  // on n'en construit jamais deux, ce qui rend l'exigence structurelle plutôt
  // que surveillée, et évite au passage de rebâtir une fenêtre (voir panRemplit :
  // chaque fenêtre coûte une place dans la table des liaisons du pont).
  //
  // La place par défaut du mode FLOTTANT est mesurée sur l'interface de Roll20 :
  // la barre d'outils tient la colonne x ∈ [20, 52], et la bande y ∈ [20, 54]
  // revient aux actions de jeton, qui apparaissent dès qu'un jeton est
  // sélectionné. Le panneau se pose donc juste à côté et juste en dessous.
  var IS_EDITEUR = IS_TOP && !IS_POPOUT && /^\/editor(\/|$)/.test(location.pathname);
  // La page servie et la clé de rangement portent le nom du panneau : un
  // deuxième panneau, un jour, n'aura pas à déloger la place et la taille de
  // celui-ci — ni à faire re-signer quoi que ce soit pour ça.
  //
  // Ces deux clés restent COMMUNES aux deux copies, et c'est un choix : la place
  // du panneau est une préférence d'affichage, la même main la déplace des deux
  // côtés, et la suffixer par mode ferait oublier au plateau où il était posé à
  // chaque bascule. PAN_ACTIF, lui, DOIT rester commun : le popup n'a qu'une
  // case, et une clé par mode ferait qu'éteindre le plateau ne l'éteindrait que
  // d'un côté.
  var PAN_PAGE = "roll20-narration.html";
  var PAN_CLE = "jjkPanneau:" + PAN_PAGE;
  var PAN_ACTIF = "jjkPanneauActif";   // interrupteur du popup (absent = allumé)
  // DEUX NOMS POUR UN SEUL INTERRUPTEUR, et c'est une assurance, pas une
  // hésitation. L'interrupteur du plateau s'est toujours appelé
  // jjkPanneauActif ; le contrat de réglages écrit pour la refonte du popup le
  // nomme jjkPanneau. Les deux se ressemblent assez pour qu'une main les
  // confonde, et un popup qui écrirait le mauvais nom laisserait une case qui
  // ne fait plus rien, sans le moindre message. On lit donc les deux : le nom
  // du contrat l'emporte quand il est posé, l'historique sert sinon.
  // ATTENTION, jjkPanneau n'est PAS le préfixe PAN_CLE ci-dessus : celui-là
  // s'écrit « jjkPanneau:roll20-narration.html » et range la géométrie. Deux
  // clés distinctes, jamais la même chaîne.
  var PAN_ACTIF_BIS = "jjkPanneau";
  // « ancre » entre dans l'état rangé : le choix de la place se retient d'une
  // session à l'autre, comme le reste. Absent (installation d'avant), il vaut
  // ancré — c'est la place voulue, le flottant est le second choix.
  var PAN_DEF = { ouvert: false, ancre: true, x: 62, y: 60, w: 380, h: 330 };
  var PAN_MIN_W = 260, PAN_MIN_H = 190;
  var panEtat = null, panBoite = null, panCorps = null, panBtn = null, panBtnAncre = null,
      panTitre = null, panEcrit = null;

  function panNombre(v, def) { var n = parseInt(v, 10); return isFinite(n) ? n : def; }

