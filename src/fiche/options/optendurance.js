  // ---- onglet Options : LE MAXIMUM D'ENDURANCE ----
  // LE JUMEAU DE « optpv », sur l'autre réserve. Deux modules et non deux
  // rangées d'un seul : sur la Fiche, les PV et l'endurance sont deux modules
  // qui se déplacent et se coupent séparément ; leurs réglages font de même.
  //
  // MÊME CHAÎNE QUE PARTOUT : un forçage, deux ajouts, deux facteurs, deux
  // ajouts, deux facteurs. Elle remplace les trois modificateurs « divers » et
  // la valeur forcée qui vivaient sur la Fiche.
  //
  // C'EST POUR ÇA QUE L'ENDURANCE A PERDU SON ROUAGE : ce qui se construisait
  // dans son bloc est ici, et il ne lui reste que ce qui se joue.
  function buildOptEndurance() {
    var b = block("Endurance");
    grilleLevier(b, {
      cls: "levier",
      entete: ["Réglage", "Ce que la rangée règle"],
      // « Maximum », comme chez les PV : le titre du bloc dit la réserve, et la
      // colonne des noms est trop étroite pour « Endurance max ».
      lignes: [{ cle: "enduranceMax", nom: "Maximum",
                 titre: "Le maximum d'endurance" }],
      rangee: function (hote, cls, ligne, i) {
        return rangeeNom(hote, cls, ligne.nom, i, ligne.titre);
      },
      lire: function (k) { return lireReserve(k); },
      ecrire: function (k, boite, v) { ecrireReserve(k, boite, v); },
      mot: ["Max", "Maximum effectif"],
      borne: 9999,
      auto: function () { return enduranceMaxChaineAuto(); },
      rendu: function () {
        return { texte: String(enduranceMax()),
                 titre: chaineTexteDe(lireReserve("enduranceMax"), "des règles",
                                      enduranceMaxAuto()) };
      }
    });
    return b;
  }
