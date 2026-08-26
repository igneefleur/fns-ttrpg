
  var NS = "jjk";
  var PREF = "jjk_narr_";
  var A_CONF = PREF + "conf";
  var A_PT = PREF + "pt_";
  var A_BG = PREF + "bg_";  // le fond importé d'une place, un attribut chacun
  var POLL = 1200;          // ms entre deux relectures
  // ms entre deux RESYNCHRONISATIONS, c'est-à-dire entre deux vraies questions
  // posées au serveur de Roll20. Relire ne suffit pas : la collection
  // d'attributs qu'un client tient est un INSTANTANÉ, que rien ne nourrit — un
  // jeton poussé par un autre joueur n'y arrive jamais tout seul (mesuré à deux
  // clients : douze secondes, aucune remontée, ni sur une création ni sur une
  // modification). Sans cette demande, chaque joueur relisait indéfiniment la
  // copie figée qu'il tenait depuis son arrivée dans la partie.
  //
  // C'EST LE SEUL RÉGLAGE DE LA RÉACTIVITÉ DU PLATEAU, et il est ICI, dans la
  // page, parce qu'une page se déploie en un après-midi quand le pont demande
  // une signature. Le pont refuse d'aller plus vite que 1500 ms, quoi qu'on lui
  // demande ; en dessous de cette valeur on n'y gagne donc rien. Au-dessus, on
  // échange de la réactivité contre du trafic : une demande rapporte TOUS les
  // attributs du personnage, fonds de zone compris.
  var RESYNC = 1500;
  var GARDE = 4000;         // ms pendant lesquelles une écriture locale prime sur l'écho
  var PONT_PAS = 60;        // ms entre deux écritures d'attribut, côté pont
  var ATTENTE_PONT = 2500;  // ms avant de déclarer que Roll20 ne répond pas
  var MILLE = 1000;         // les coordonnées sont des millièmes du plateau
