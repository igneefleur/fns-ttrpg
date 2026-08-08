
  var NS = "jjk";
  var PREF = "jjk_narr_";
  var A_CONF = PREF + "conf";
  var A_PT = PREF + "pt_";
  var A_BG = PREF + "bg_";  // le fond importé d'une place, un attribut chacun
  var POLL = 1200;          // ms entre deux relectures
  var GARDE = 4000;         // ms pendant lesquelles une écriture locale prime sur l'écho
  var PONT_PAS = 60;        // ms entre deux écritures d'attribut, côté pont
  var ATTENTE_PONT = 2500;  // ms avant de déclarer que Roll20 ne répond pas
  var MILLE = 1000;         // les coordonnées sont des millièmes du plateau
