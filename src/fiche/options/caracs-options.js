  // ---- onglet Options : LES CARACTÉRISTIQUES, TOUT CE QUI SE RÈGLE ----
  // UN SEUL BLOC, ET SEPT ONGLETS DEDANS. Il y avait quatre blocs — plafond,
  // modificateur, limite, écart — plus le coût en xp, soit autant de titres pour
  // un seul et même geste : régler les huit caractéristiques.
  //
  // LES SEPT ONGLETS PORTENT LA MÊME GRILLE, et c'est tout le sujet : ce qui
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
  // SEPT ONGLETS, ET LES TROIS PREMIERS SE LISENT DANS L'ORDRE DU CALCUL :
  //
  //     VALEUR (chaîne)  →  coiffée par le PLAFOND  →  plus le BONUS (chaîne)
  //
  // « Valeur » est à GAUCHE de « Plafond » parce que le plafond mord sur ce que
  // la valeur a produit, et non l'inverse. Le bonus vient après la coiffe : il
  // n'est borné par rien, et c'est ce qui le distingue d'un point acheté.
  //
  // Les quatre suivants ne touchent plus à ce que la caractéristique VAUT, mais
  // à ce qu'elle COÛTE (xp) et à ce qu'elle DONNE — son modificateur, sa
  // limite, l'écart qu'elle impose aux spécialités.
  function buildOptCaracs() {
    var b = block("Caractéristiques");
    var bande = bandeOnglets(b);
    var B = boitesTable("caracsLeviers");

    // L'ORDRE DES SEPT SUIT CELUI DE LA VIE D'UNE CARACTÉRISTIQUE, et il se lit
    // en deux temps. D'abord ce qu'elle VAUT : la valeur, ce qu'elle ne peut pas
    // dépasser (plafond), ce qui s'y ajoute ensuite (bonus), ce qu'elle coûte
    // (xp). Ensuite ce qu'elle DONNE une fois achetée : ce qu'elle ajoute au jet
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

    // ---------- Valeur ----------
    // CE QUE LA CARACTÉRISTIQUE VAUT. La base est ce que le joueur a acheté sur
    // la Fiche ; le plafond mord ensuite sur ce que la chaîne rend, et le
    // dernier nombre de la rangée le montre déjà coiffé.
    //
    // LE FORÇAGE EST COIFFÉ LUI AUSSI. Forcer n'est pas passer outre : pour
    // dépasser, on lève le plafond, qui a son onglet juste à droite.
    tab("Valeur", "", "valeur", ["Valeur", "Valeur effective"], 999,
      caracValeurAuto,
      function (c) {
        var v = caracValeur(c), brut = caracValeurBrut(c);
        return { texte: String(v),
                 titre: chaineTexteDe(lireCarac("valeur", c), "achetée", caracBase(c)) +
                        (brut > caracPlafond(c) ? " · plafonnée à " + caracPlafond(c) : "") };
      });

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

    // ---------- Bonus ----------
    // CE QUI S'AJOUTE APRÈS LA COIFFE, et que rien ne borne : un équipement, un
    // avantage, une bénédiction. La base est la case Bonus de la Fiche.
    tab("Bonus", "", "bonus", ["Bonus", "Bonus effectif"], 999,
      caracBonusAuto,
      function (c) {
        var b = caracBonus(c);
        return { texte: sign(b), zero: !b,
                 titre: chaineTexteDe(lireCarac("bonus", c), "de la Fiche", caracBonusSocle(c)) };
      });

    // ---------- XP ----------
    // CE QU'ELLE COÛTE. Le coût se lit sur la valeur ACHETÉE, jamais sur le
    // total : ni le bonus ni la valeur accordée par un levier ne se paient.
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
