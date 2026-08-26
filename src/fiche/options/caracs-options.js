  // ---- onglet Options : LES CARACTÉRISTIQUES, TOUT CE QUI SE RÈGLE ----
  // UN SEUL BLOC, ET CINQ ONGLETS DEDANS. Il y avait quatre blocs — plafond,
  // modificateur, limite, écart — plus le coût en xp, soit cinq titres pour un
  // seul et même geste : régler les huit caractéristiques.
  //
  // LES CINQ ONGLETS PORTENT LA MÊME GRILLE, et c'est tout le sujet : ce qui
  // change de l'un à l'autre, ce n'est pas le geste, c'est ce sur quoi il porte.
  //
  //     Carac. | Forcé | ＋ ＋ | × × | ＋ ＋ | × × | ce que ça donne
  //
  // soit, de gauche à droite, la chaîne elle-même (voir chaine() dans
  // 080-calculs-caracs.js) : le forcé s'il est rempli, sinon deux ajouts sur la
  // base, deux facteurs, deux ajouts, deux facteurs encore — QUATRE groupes,
  // parce que trois ne savent pas tout dire : un ajout posé après la dernière
  // multiplication ne pouvait plus être multiplié.
  //
  // LA MACHINERIE EST COMMUNE (voir commun-leviers.js) : les compétences et les
  // spécialités portent la même, et une correction ne s'écrit qu'une fois.
  //
  // AUCUN NE TOUCHE À LA VALEUR ACHETÉE : elle se décale sur la Fiche, dans la
  // case Bonus du module des caractéristiques. Ici on règle ce que la
  // caractéristique DONNE (son modificateur, sa limite, l'écart qu'elle impose
  // aux spécialités), ce qui la BORNE (son plafond) et ce qu'elle COÛTE.
  function buildOptCaracs() {
    var b = block("Caractéristiques");
    var bande = bandeOnglets(b);
    var B = boitesTable("caracsLeviers");

    // L'ORDRE DES CINQ SUIT CELUI DE LA VIE D'UNE CARACTÉRISTIQUE, et il se lit
    // en deux temps. D'abord ce qui touche à la VALEUR qu'on achète : ce qu'elle
    // peut atteindre (plafond), ce qu'elle coûte pour y aller (xp). Ensuite ce
    // que la caractéristique DONNE une fois achetée : ce qu'elle ajoute au jet
    // (modificateur), ce qui coiffe le résultat (limite), et l'écart que cette
    // limite impose aux spécialités — chacun découlant du précédent.
    function tab(titre, aide, nom, mot, borne, auto, rendu) {
      bande.onglet(titre, aide, function (p) {
        grilleLevier(p, {
          cls: "levier",
          entete: ["Carac.", "Caractéristique"],
          lignes: champs().map(function (c) {
            return { cle: c, nom: c, titre: caracInfo(c).nom };
          }),
          rangee: function (hote, cls, ligne, i) {
            return rangeeSigle(hote, cls, ligne.nom, i, ligne.titre);
          },
          lire: function (c) { return B.lire(nom, c); },
          ecrire: function (c, boite, v) { B.ecrire(nom, boite, c, v); },
          mot: mot, borne: borne, auto: auto, rendu: rendu
        });
      });
    }

    // ---------- Plafond ----------
    // CE QU'UNE CARACTÉRISTIQUE NE PEUT PAS DÉPASSER. La base est le prestige,
    // qui range le personnage. Le prestige lui-même reste dans « Création » : il
    // n'appartient à aucune des huit, il les coiffe toutes.
    tab("Plafond", "", "plafond", ["Plafond", "Plafond effectif"], 999,
      caracPlafondAuto,
      function (c) {
        return { texte: String(caracPlafond(c)),
                 titre: chaineTexteDe(lireCarac("plafond", c), "prestige", prestige()) };
      });

    // ---------- XP ----------
    // CE QU'ELLE COÛTE. Le coût se lit sur la valeur ACHETÉE, jamais sur le
    // total : un bonus d'équipement ne se paie pas.
    tab("XP", "", "xp", ["Coût", "Coût effectif en xp"], 9999,
      caracXpAuto,
      function (c) {
        var xp = caracXp(c);
        return { texte: xp + " xp", zero: !xp,
                 titre: chaineTexteDe(lireCarac("xp", c), "valeur " + caracBase(c) + " :",
                                      ligneValeur(caracBase(c)).xp) };
      });

    // ---------- Modificateur ----------
    tab("Modif.", "Modificateur", "mod", ["MOD", "Modificateur effectif"], 999,
      caracModAuto,
      function (c) {
        return { texte: sign(caracMod(c)),
                 titre: chaineTexteDe(lireCarac("mod", c), "de la table", caracModTable(c)) };
      });

    // ---------- Limite ----------
    // LA LIMITE SEULE, et c'est le seul levier qui resserre l'écart d'une
    // spécialité sous son minimum : le rabattage se calcule sur la limite
    // NATURELLE, que celui-ci ne touche pas (voir caracLimNat).
    tab("Limite", "", "lim", ["Limite", "Limite effective"], 9999,
      caracLimAuto,
      function (c) {
        return { texte: String(caracLim(c)),
                 titre: chaineTexteDe(lireCarac("lim", c), "de la table", caracLimTable(c)) };
      });

    // ---------- Écart ----------
    // PREMIER ÉTAGE DE LA CASCADE : ce qui se règle ici descend sur les
    // compétences, et des compétences sur les spécialités.
    //
    // Son forçage est l'ancienne case unique : une valeur, et non un décalage —
    // on pense « l'écart doit être de 30 », jamais « je décale de −20 ».
    //
    // L'interrupteur qui SUSPEND la règle n'est pas ici : il a son bloc (voir
    // ecart-regle.js). Les cinq onglets décalent un seuil, caractéristique par
    // caractéristique ; lui suspend la règle pour le personnage entier.
    tab("Écart", "", "ecart", ["Écart", "Écart minimum effectif"], 9999,
      ecartMinAuto,
      function (c) {
        return { texte: String(ecartMin(c)),
                 titre: chaineTexteDe(lireCarac("ecart", c), "des règles", repli("speMarge")) };
      });

    bande.montre(0);
    return b;
  }
