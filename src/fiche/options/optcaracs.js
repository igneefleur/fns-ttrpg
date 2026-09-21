  // ---- 16. Réglages des caractéristiques ----
  // LE TABLEAU DE BORD DU MENEUR, première moitié. Une rangée par
  // caractéristique, et sur chaque rangée la chaîne à neuf boîtes :
  //
  //     forçage  |  ＋ ＋  ×  × ×  |  ＋ ＋  ×  × ×
  //
  // MÊME GRILLE que les compétences et les capacités, et c'est voulu : régler
  // une caractéristique, une compétence ou un maximum sont le même geste, et le
  // meneur n'a pas à apprendre trois dispositions.
  //
  // UN SEUL LEVIER ICI, « total », parce qu'une caractéristique d'Outward n'a
  // qu'une valeur dérivée. Pas de coût en xp : elles ne s'achètent pas. Le jour
  // où une règle en donnera une seconde, ce bloc prendra une bande d'onglets
  // comme celui des compétences, et rien d'autre ne bougera.
  function buildModCaracs() {
    var b = block("Réglages des caractéristiques");
    var B = boitesTable("caracsLeviers");
    grilleLevier(b, {
      cls: "levier",
      entete: ["Carac.", "Caractéristique"],
      lignes: caracsOrdre().map(function (name) {
        return { cle: name, nom: abbrCarac(name), titre: libCarac(name) };
      }),
      rangee: function (hote, cls, ligne, i) {
        return rangeeSigle(hote, cls, ligne.nom, i, ligne.titre);
      },
      lire: function (c) { return B.lire("total", c); },
      ecrire: function (c, boite, v) { B.ecrire("total", boite, c, v); },
      mot: ["Total", "Total effectif de la caractéristique"],
      borne: 9999,
      auto: function (c) { return caracAuto(c); },
      rendu: function (c) {
        return {
          texte: fmtP(caracTotal(c)),
          titre: chaineTexteDe(lireCarac("total", c), "valeur", caracVal(c))
        };
      }
    });
    return b;
  }

