
  // ---------- état ----------
  var charId = null;        // personnage « Narration » (null = pas trouvé)
  var ecrivable = false;    // ce que le pont ANNONCE des droits du joueur
  var refuse = false;       // ce que Roll20 a montré en refusant nos écritures
  // L'ÉTAT LU EST-IL UNE VÉRITÉ ? Roll20 ne peuple les attributs d'un personnage
  // qu'à l'ouverture de sa fiche : avant, la lecture rend du vide qui n'est la
  // vérité de rien. Le pont ouvre donc la fiche lui-même et le dit ici. Faux au
  // départ : on ne sait rien avant d'avoir lu.
  var etatSur = false;
  // Quatre raisons de ne pas toucher au plateau, et une seule question à poser :
  // on ne sait pas encore ce qu'il y a dessus, le pont annonce que ce joueur n'a
  // pas la main, Roll20 a refusé nos écritures, ou le plateau a été écrit par une
  // version plus récente. La première est la plus importante : pousser un jeton
  // sur un état qu'on n'a pas lu, c'est écraser la table de tout le monde.
  function peutPousser() { return etatSur && ecrivable && !refuse && !confFuture; }
  var conf = confVide();
  var points = {};          // id -> {x, y}
  var fonds = {};           // id de place -> fond TÉLÉVERSÉ (data: WebP), lu de Roll20
  var attente = {};         // nom d'attribut -> {val, t} : nos écritures pas encore revenues
  var prise = null;         // jeton en cours de déplacement
  var lu = false;           // au moins une lecture réussie
  var repondu = false;      // le pont a parlé, même pour dire qu'il n'y a rien

  // Version du FORMAT de la configuration. Elle ne sert qu'à une chose, mais
  // elle y sert vraiment : une table dont le plateau a été configuré par une
  // version plus récente passe en lecture seule au lieu de se faire réécrire
  // en silence par un code qui n'en comprend qu'une partie. Le plateau n'a ni
  // migrations ni archives, contrairement à la fiche : c'est son seul filet.
  var V_CONF = 1;
  var confFuture = false;

  function confVide() {
    return {
      v: V_CONF,
      seq: 0,                             // compteur d'identifiants de jetons
      // « img » est l'URL du fond de la place, celle qu'on tape à la main. Le
      // fichier TÉLÉVERSÉ, lui, n'est pas ici : il vit dans jjk_narr_bg_<id>.
      mj: { nom: "MJ", img: "" },
      joueurs: [],                        // [{ id, nom, img }]
      donne: { mj: 3, joueur: 3 }         // jetons créés à la distribution
    };
  }
