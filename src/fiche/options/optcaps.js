  // ---- 21. Réglages des capacités ----
  // LE TABLEAU DE BORD DU MENEUR, seconde moitié : une rangée par valeur
  // dérivée du corps, et la même chaîne à neuf boîtes que les caractéristiques
  // et les compétences.
  //
  // C'est ICI, et nulle part ailleurs, qu'on impose un maximum : les champs
  // « Forcé » des blocs de la Fiche écrivent dans la MÊME boîte (capsLeviers,
  // levier « max », boîte « force »), et les trois emplacements qu'ils portent
  // sont les trois premiers ajouts de cette chaîne. Deux endroits pour la même
  // donnée finiraient par se contredire ; il n'y en a qu'un.
  //
  // L'ORDRE EST CELUI DE LA FICHE : les jauges d'abord, les limites du corps
  // ensuite, les compteurs à la fin. La liste est écrite ici parce qu'elle
  // range ET nomme ce que le livre laisse sans ordre ; les libellés, eux,
  // viennent des règles (libCap) dès qu'elles les donnent.
  function buildOptCaps() {
    var b = block("Réglages des capacités");
    var B = boitesTable("capsLeviers");
    var LIGNES = [
      ["pv", "Points de vie"], ["pe", "Points d'endurance"], ["pm", "Points de mana"],
      ["pi", "Points d'innocence"], ["pr", "Points de repos"], ["ps", "Points de satiété"],
      ["ph", "Points d'hydratation"], ["pc", "Points de chance"],
      ["charge", "Charge"], ["acces", "Accès rapides"],
      ["contenance", "Contenance"], ["expo", "Exposition"], ["rupture", "Rupture"],
      ["desAction", "Dés d'action"], ["effondrement", "Effondrement"]
    ];
    grilleLevier(b, {
      cls: "levier",
      entete: ["Capacité", "La valeur dérivée à régler"],
      lignes: LIGNES.map(function (L) {
        return { cle: L[0], nom: libCap(L[0], L[1]), titre: libCap(L[0], L[1]) };
      }),
      rangee: function (hote, cls, ligne, i) {
        return rangeeNom(hote, cls, ligne.nom, i, ligne.titre);
      },
      lire: function (cle) { return B.lire("max", cle); },
      ecrire: function (cle, boite, v) { B.ecrire("max", boite, cle, v); },
      mot: ["Total", "Valeur effective"],
      borne: 99999,
      // L'EFFONDREMENT N'EST PAS UN MAXIMUM, C'EST UN NIVEAU. Sa ligne montre
      // donc ce que le personnage SUBIT, pas le plafond de l'échelle : les deux
      // se lisaient côte à côte dans la même rangée, le filigrane disant 0 et
      // le total disant 10.
      auto: function (cle) {
        return cle === "effondrement" ? effondrementAuto() : autoDe(cle);
      },
      rendu: function (cle) {
        var d = capDef(cle);
        return {
          texte: fmtP(cle === "effondrement" ? effondrement() : maxDe(cle)),
          // La formule du livre est ce que la capacité vaut AVANT tout réglage :
          // c'est la base de la chaîne, et la dire n'est pas réciter une règle,
          // c'est dire d'où sort le nombre qu'on lit.
          titre: chaineTexteDe(lireCap("max", cle),
                               d && d.formule ? d.formule + " :" : "calculé",
                               fmtP(cle === "effondrement" ? effondrementAuto() : autoDe(cle)))
        };
      }
    });
    return b;
  }

