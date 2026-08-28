  // ---- onglet Options : LES VALEURS DÉRIVÉES ----
  // TOUT CE QUE LA FICHE CALCULE ET QUE LE MENEUR PEUT DÉPLACER, hors des deux
  // réserves et de leur récupération, qui ont leur propre bloc. Ces cinq
  // valeurs se réglaient sur la Fiche, chacune sous son propre rouage, avec une
  // valeur forcée et trois modificateurs — cinq petites machines à peine
  // différentes, éparpillées dans deux modules. Elles n'en font plus qu'une.
  //
  // MÊME CHAÎNE QUE PARTOUT : un forçage, deux ajouts, deux facteurs, deux
  // ajouts, deux facteurs. Ce que trois cases ne savaient pas dire — « la
  // moitié », « le double, puis moins dix » — se dit ici.
  //
  // C'EST POUR ÇA QUE LA FICHE N'A PLUS DE ROUAGE SUR CES MODULES : ce qui se
  // CONSTRUIT est ici, et il ne leur reste que ce qui se joue.
  //
  // La fabrique est celle du bloc voisin (blocLeviers, optreserves.js) : les
  // deux blocs ne diffèrent que par leur titre et leurs rangées.
  var DERIVES = [
    { cle: "initiative", nom: "Initiative", titre: "L'initiative",
      val: function () { return initiative(); },
      auto: function () { return initiativeAuto(); } },
    { cle: "vitesse", nom: "Vitesse", titre: "La vitesse, en mètres",
      val: function () { return vitesseVal(); },
      auto: function () { return vitesseAuto(); } },
    { cle: "charge", nom: "Charge", titre: "La charge maximale",
      val: function () { return chargeMax(); },
      auto: function () { return chargeMaxAuto(); } },
    { cle: "sautLong", nom: "Saut longueur", titre: "Le saut en longueur, en mètres",
      val: function () { return sautLongVal(); },
      auto: function () { return sautLongAuto(); } },
    { cle: "sautHaut", nom: "Saut hauteur", titre: "Le saut en hauteur, en mètres",
      val: function () { return sautHautVal(); },
      auto: function () { return sautHautAuto(); } }
  ];

  function buildOptDerives() {
    return blocLeviers("Valeurs dérivées", DERIVES);
  }
