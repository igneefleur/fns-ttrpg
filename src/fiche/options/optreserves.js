  // ---- onglet Options : LES DEUX RÉSERVES ET CE QUI LES REMPLIT ----
  // LA FABRIQUE COMMUNE DES BLOCS DE LEVIERS. Les deux blocs de cet onglet ne
  // diffèrent que par leur titre et la liste de leurs rangées ; tout le reste —
  // la grille, les neuf boîtes, la colonne de résultat, les infobulles — est le
  // même geste. Deux blocs qui se ressemblent doivent se ressembler JUSQUE DANS
  // LE CODE, sans quoi l'un finit corrigé et l'autre non.
  //
  // UNE RANGÉE PORTE : sa clé de levier, son nom, ce qu'elle règle, la fonction
  // qui rend la valeur EFFECTIVE et celle qui rend la BASE des règles. La clé
  // doit figurer dans RESERVE_BORNE (060-etat-normalise.js) : un levier absent
  // du catalogue est jeté EN SILENCE au premier rangement.
  function blocLeviers(titre, table) {
    function ligneDe(k) {
      for (var i = 0; i < table.length; i++) if (table[i].cle === k) return table[i];
      return null;
    }
    var b = block(titre);
    grilleLevier(b, {
      cls: "levier",
      entete: ["Valeur", "Ce que la rangée règle"],
      lignes: table.map(function (d) {
        return { cle: d.cle, nom: d.nom, titre: d.titre };
      }),
      rangee: function (hote, cls, ligne, i) {
        return rangeeNom(hote, cls, ligne.nom, i, ligne.titre);
      },
      lire: function (k) { return lireReserve(k); },
      ecrire: function (k, boite, v) { ecrireReserve(k, boite, v); },
      // « Total » et non « Max » : la moitié de ces rangées ne sont pas des
      // maximums mais ce qu'on regagne en un jour.
      mot: ["Total", "Valeur effective"],
      borne: 9999,
      // grilleLevier passe la CLÉ de la rangée à ses deux rappels : c'est elle,
      // et non l'ordre des lignes, qui dit à quelle valeur on répond.
      auto: function (k) {
        var d = ligneDe(k);
        return d ? chaineAuto(lireReserve(k), d.auto()) : 0;
      },
      rendu: function (k) {
        var d = ligneDe(k);
        if (!d) return { texte: "0", titre: "" };
        return { texte: String(fmtP(d.val())),
                 titre: chaineTexteDe(lireReserve(k), "des règles", d.auto()) };
      }
    });
    return b;
  }

  // LES DEUX RÉSERVES ET LEUR RÉCUPÉRATION, dans le même bloc : ce qu'on regagne
  // par jour ne veut rien dire loin de la réserve qu'il remplit.
  var RESERVES = [
    { cle: "pvMax", nom: "PV", titre: "Le maximum de points de vie",
      val: function () { return pvMax(); },
      auto: function () { return pvMaxAuto(); } },
    { cle: "enduranceMax", nom: "END", titre: "Le maximum d'endurance",
      val: function () { return enduranceMax(); },
      auto: function () { return enduranceMaxAuto(); } },
    { cle: "recupJour", nom: "Récup PV", titre: "Les points de vie regagnés par jour",
      val: function () { return recupJour(); },
      auto: function () { return recupJourAuto(); } },
    { cle: "recupEnd", nom: "Récup END", titre: "L'endurance regagnée par jour",
      val: function () { return recupEnduranceJour(); },
      auto: function () { return recupEnduranceJourAuto(); } }
  ];

  function buildOptReserves() {
    return blocLeviers("PV et END", RESERVES);
  }
