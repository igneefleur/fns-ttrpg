  // ---- onglet Options : LE MAXIMUM DES DEUX RÉSERVES ----
  // UN SEUL MODULE POUR LES DEUX, et non un par réserve. Ils ont vécu séparés
  // le temps d'une version, par symétrie avec la Fiche où les PV et l'END sont
  // bien deux modules — mais là-bas ils portent chacun une valeur qui bouge en
  // pleine partie, et ici ils ne portent qu'une rangée de réglage. Deux blocs
  // d'une rangée chacun, c'était deux fois un titre et deux fois un en-tête de
  // colonnes pour deux lignes de contenu.
  //
  // UNE RÉSERVE N'A QU'UNE CHOSE À RÉGLER : son maximum. Pas de troisième
  // niveau dans l'état, donc — le nom du levier fait l'identité, comme sur une
  // spécialité, et la clé de la rangée suffit à dire de quelle réserve il s'agit.
  //
  // MÊME CHAÎNE QUE PARTOUT : un forçage, deux ajouts, deux facteurs, deux
  // ajouts, deux facteurs. Elle remplace, pour chacune, les trois modificateurs
  // « divers » et la valeur forcée qui vivaient sur la Fiche.
  //
  // C'EST POUR ÇA QUE NI LES PV NI L'END N'ONT DE ROUAGE : ce qui se construit
  // dans leur bloc est ici, et il ne leur reste que ce qui se joue.
  function buildOptReserves() {
    var b = block("PV et END");
    grilleLevier(b, {
      cls: "levier",
      entete: ["Réserve", "Ce que la rangée règle"],
      lignes: [
        { cle: "pvMax", nom: "PV", titre: "Le maximum de points de vie" },
        { cle: "enduranceMax", nom: "END", titre: "Le maximum d'endurance" }
      ],
      rangee: function (hote, cls, ligne, i) {
        return rangeeNom(hote, cls, ligne.nom, i, ligne.titre);
      },
      lire: function (k) { return lireReserve(k); },
      ecrire: function (k, boite, v) { ecrireReserve(k, boite, v); },
      mot: ["Max", "Maximum effectif"],
      borne: 9999,
      // grilleLevier passe la CLÉ de la rangée à ses deux rappels : c'est elle,
      // et non l'ordre des lignes, qui dit à quelle réserve on répond.
      auto: function (k) {
        return k === "pvMax" ? pvMaxChaineAuto() : enduranceMaxChaineAuto();
      },
      rendu: function (k) {
        var pv = k === "pvMax";
        return {
          texte: String(pv ? pvMax() : enduranceMax()),
          titre: chaineTexteDe(lireReserve(k), "des règles",
                               pv ? pvMaxAuto() : enduranceMaxAuto())
        };
      }
    });
    return b;
  }
