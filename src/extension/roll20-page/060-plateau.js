  // ---------- plateau de Narration ----------
  // Le plateau partagé vit dans les Attributes d'un personnage nommé
  // « Narration », que le MJ rend contrôlable par tous les joueurs : c'est le
  // SEUL objet d'une campagne où chacun a lecture et écriture (un joueur ne
  // peut pas lire la fiche d'un autre joueur).
  //
  // Le panneau ne connaît aucun identifiant : il demande ICI lequel c'est.
  // C'est le pont qui choisit, jamais la page, et il ne sait désigner que
  // celui-là : le verrou source <-> personnage garde ainsi tout son sens, une
  // frame ne pouvant se lier qu'à un personnage qu'on lui a nommé. Que
  // n'importe qui puisse ensuite écrire ce plateau n'est pas une faiblesse,
  // c'est sa raison d'être — comme la table où chacun peut tendre le bras.
  var NARR_NOM = "narration";
  function narrationChar() {
    var c = campaign(), ms = (c && c.characters && c.characters.models) || [];
    for (var i = 0; i < ms.length; i++) {
      var n = ms[i].get ? ms[i].get("name") : (ms[i].attributes || {}).name;
      if (String(n == null ? "" : n).replace(/\s+/g, " ").trim().toLowerCase() === NARR_NOM) return ms[i];
    }
    return null;
  }
  // Le panneau a besoin de savoir s'il peut pousser les jetons ou seulement les
  // regarder : Roll20 refuse l'écriture côté serveur, en silence, et un plateau
  // qui ne bouge pas sans dire pourquoi serait incompréhensible.
  //
  // Le pont rend la MATIÈRE, pas la conclusion : qui je suis, si je suis MJ, et
  // la liste brute des contrôleurs. C'est la page servie par le site qui tranche
  // — le jour où Roll20 renomme un de ces globaux (aucun n'est documenté), la
  // réparation est un déploiement, pas une signature.
  function droits(ch) {
    var d = { gm: false, moi: "", controlledby: "" };
    try { d.gm = window.is_gm === true; } catch (e) {}
    try { d.moi = String((window.currentPlayer && window.currentPlayer.id) || ""); } catch (e) {}
    try {
      d.controlledby = String((ch.get ? ch.get("controlledby") : (ch.attributes || {}).controlledby) || "");
    } catch (e) {}
    return d;
  }

