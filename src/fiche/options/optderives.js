  // ---- onglet Options : LES VALEURS DÉRIVÉES ----
  // TOUT CE QUE LA FICHE CALCULE ET QUE LE MENEUR PEUT DÉPLACER, au même
  // endroit et par la même chaîne. Ces sept valeurs se réglaient sur la Fiche,
  // chacune sous son propre rouage, avec une valeur forcée et trois
  // modificateurs — sept petites machines à peine différentes, éparpillées dans
  // trois modules. Elles n'en font plus qu'une.
  //
  // MÊME CHAÎNE QUE PARTOUT : un forçage, deux ajouts, deux facteurs, deux
  // ajouts, deux facteurs. Ce que trois cases ne savaient pas dire — « la
  // moitié », « le double, puis moins dix » — se dit ici.
  //
  // C'EST POUR ÇA QUE LA FICHE N'A PLUS DE ROUAGE SUR CES MODULES : ce qui se
  // CONSTRUIT est ici, et il ne leur reste que ce qui se joue.
  //
  // LA CLÉ DE CHAQUE RANGÉE EST SON NOM DE LEVIER, et ce nom doit figurer dans
  // RESERVE_BORNE (060-etat-normalise.js) : un levier absent du catalogue est
  // jeté EN SILENCE au premier rangement. C'est le défaut qui a coûté le levier
  // d'endurance au schéma 6.
  var DERIVES = [
    { cle: "initiative", nom: "Initiative", titre: "L'initiative",
      val: function () { return initiative(); },
      auto: function () { return initiativeAuto(); } },
    { cle: "recupJour", nom: "Récup PV", titre: "Les points de vie regagnés par jour",
      val: function () { return recupJour(); },
      auto: function () { return recupJourAuto(); } },
    { cle: "recupEnd", nom: "Récup END", titre: "L'endurance regagnée par jour",
      val: function () { return recupEnduranceJour(); },
      auto: function () { return recupEnduranceJourAuto(); } },
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
  function deriveDe(k) {
    for (var i = 0; i < DERIVES.length; i++) if (DERIVES[i].cle === k) return DERIVES[i];
    return null;
  }

  function buildOptDerives() {
    var b = block("Valeurs dérivées");
    grilleLevier(b, {
      cls: "levier",
      entete: ["Valeur", "Ce que la rangée règle"],
      lignes: DERIVES.map(function (d) {
        return { cle: d.cle, nom: d.nom, titre: d.titre };
      }),
      rangee: function (hote, cls, ligne, i) {
        return rangeeNom(hote, cls, ligne.nom, i, ligne.titre);
      },
      lire: function (k) { return lireReserve(k); },
      ecrire: function (k, boite, v) { ecrireReserve(k, boite, v); },
      mot: ["Total", "Valeur effective"],
      borne: 9999,
      // grilleLevier passe la CLÉ de la rangée à ses deux rappels : c'est elle,
      // et non l'ordre des lignes, qui dit à quelle valeur on répond.
      auto: function (k) {
        var d = deriveDe(k);
        return d ? chaineAuto(lireReserve(k), d.auto()) : 0;
      },
      rendu: function (k) {
        var d = deriveDe(k);
        if (!d) return { texte: "0", titre: "" };
        return { texte: String(fmtP(d.val())),
                 titre: chaineTexteDe(lireReserve(k), "des règles", d.auto()) };
      }
    });
    return b;
  }
