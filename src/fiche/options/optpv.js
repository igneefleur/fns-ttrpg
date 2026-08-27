  // ---- onglet Options : LE MAXIMUM DE PV ----
  // UN SEUL RÉGLAGE, ET C'EST TOUT CE QU'UNE RÉSERVE EN A : son maximum. Pas
  // d'onglets, donc, ni de troisième niveau dans l'état — le nom du levier fait
  // l'identité, comme sur une spécialité.
  //
  // MÊME CHAÎNE QUE PARTOUT : un forçage, deux ajouts, deux facteurs, deux
  // ajouts, deux facteurs. Elle remplace les trois modificateurs « divers » et
  // la valeur forcée qui vivaient sur la Fiche : trois cases ne savent pas dire
  // « la moitié », et rien ne les distinguait des sept autres jeux de trois
  // cases éparpillés dans l'ancienne fiche.
  //
  // C'EST POUR ÇA QUE LES PV ONT PERDU LEUR ROUAGE : ce qui se construisait
  // dans leur bloc est ici, et il ne leur reste que ce qui se joue.
  function buildOptPv() {
    var b = block("PV");
    grilleLevier(b, {
      cls: "levier",
      entete: ["Réglage", "Ce que la rangée règle"],
      lignes: [{ cle: "pvMax", nom: "PV max", titre: "Le maximum de points de vie" }],
      rangee: function (hote, cls, ligne, i) {
        return rangeeNom(hote, cls, ligne.nom, i, ligne.titre);
      },
      lire: function (k) { return lireReserve(k); },
      ecrire: function (k, boite, v) { ecrireReserve(k, boite, v); },
      mot: ["Max", "Maximum effectif"],
      borne: 9999,
      auto: function () { return pvMaxChaineAuto(); },
      rendu: function () {
        return { texte: String(pvMax()),
                 titre: chaineTexteDe(lireReserve("pvMax"), "des règles", pvMaxAuto()) };
      }
    });
    return b;
  }
