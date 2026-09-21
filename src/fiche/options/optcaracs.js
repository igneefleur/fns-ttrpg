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
  // DEUX LEVIERS, donc une bande d'onglets comme celle des compétences :
  //   Total  la valeur de la caractéristique
  //   XP     ce que ses points achetés à l'expérience ont coûté
  function buildModCaracs() {
    var b = block("Réglages des caractéristiques");
    var B = boitesTable("caracsLeviers");
    var bande = bandeOnglets(b);
    function onglet(titre, nom, mot, borne, auto, rendu) {
      bande.onglet(titre, "", function (page) {
        grilleLevier(page, {
          cls: "levier",
          entete: ["Carac.", "Caractéristique"],
          lignes: caracsOrdre().map(function (name) {
            return { cle: name, nom: abbrCarac(name), titre: libCarac(name) };
          }),
          rangee: function (hote, cls, ligne, i) {
            return rangeeSigle(hote, cls, ligne.nom, i, ligne.titre);
          },
          lire: function (c) { return B.lire(nom, c); },
          ecrire: function (c, boite, v) { B.ecrire(nom, boite, c, v); },
          mot: mot,
          borne: borne,
          auto: auto,
          rendu: rendu
        });
      });
    }
    onglet("Total", "total", ["Total", "Total effectif de la caractéristique"], 9999,
      function (c) { return caracAuto(c); },
      function (c) {
        return {
          texte: fmtP(caracTotal(c)),
          titre: chaineTexteDe(lireCarac("total", c), "valeur", caracVal(c))
        };
      });
    onglet("XP", "xp", ["Coût", "Coût effectif en xp"], 99999,
      function (c) { return caracXpDe(c); },
      function (c) {
        return {
          texte: fmtP(caracXp(c)),
          zero: !caracXp(c),
          titre: chaineTexteDe(lireCarac("xp", c), fmtP(caracAchat(c)) + " points achetés :",
                               caracXpDe(c))
        };
      });
    bande.montre(0);
    return b;
  }
