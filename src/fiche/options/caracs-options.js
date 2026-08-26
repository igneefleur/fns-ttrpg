  // ---- onglet Options : LES CARACTÉRISTIQUES, TOUT CE QUI SE RÈGLE ----
  // UN SEUL BLOC, ET CINQ ONGLETS DEDANS. Il y avait quatre blocs — plafond,
  // modificateur, limite, écart — plus le coût en xp, soit cinq titres pour un
  // seul et même geste : régler les huit caractéristiques. La colonne des
  // Options en était pleine, et il fallait se rappeler lequel des cinq on
  // cherche avant de savoir où regarder.
  //
  // LES CINQ ONGLETS PORTENT LA MÊME GRILLE, et c'est tout le sujet : ce qui
  // change de l'un à l'autre, ce n'est pas le geste, c'est ce sur quoi il porte.
  //
  //     Carac. | Forcé | ＋ ＋ | × × | ＋ ＋ | ce que ça donne
  //
  // soit, de gauche à droite, la chaîne elle-même (voir levierChaine dans
  // 080-calculs-caracs.js) : le forcé s'il est rempli, sinon deux ajouts sur la
  // base, deux facteurs, deux ajouts qui ne se multiplient plus.
  //
  // AUCUN NE TOUCHE À LA VALEUR ACHETÉE : elle se décale sur la Fiche, dans la
  // case Bonus du module des caractéristiques. Ici on règle ce que la
  // caractéristique DONNE (son modificateur, sa limite, l'écart qu'elle impose
  // aux spécialités), ce qui la BORNE (son plafond) et ce qu'elle COÛTE.
  function buildOptCaracs() {
    var b = block("Caractéristiques");
    var bande = el("div", "pc-tabs mini");
    var corps = el("div");
    b.appendChild(bande);
    b.appendChild(corps);

    // L'ORDRE DES CINQ SUIT CELUI DE LA VIE D'UNE CARACTÉRISTIQUE, et il se
    // lit en deux temps. D'abord ce qui touche à la VALEUR qu'on achète : ce
    // qu'elle peut atteindre (plafond), ce qu'elle coûte pour y aller (xp).
    // Ensuite ce que la caractéristique DONNE une fois achetée : ce qu'elle
    // ajoute au jet (modificateur), ce qui coiffe le résultat (limite), et
    // l'écart que cette limite impose aux spécialités — chacun découlant du
    // précédent. Mettre le coût en dernier séparait les deux seules choses qui
    // parlent de la valeur, et laissait l'xp orphelin derrière une chaîne où
    // il n'entre pas.
    //
    // « Modif. » ET NON « MODIFICATEUR » : c'est le mot qu'emploient déjà les
    // entêtes des grilles, et le seul des cinq qui ne tenait pas dans une bande
    // à parts égales — il forçait son onglet à être plus large que les quatre
    // autres, ce qui est exactement ce qu'on ne veut pas.
    //
    // L'ONGLET OUVERT NE S'ENREGISTRE PAS, et c'est voulu : ce n'est pas un état
    // du personnage — deux fiches du même personnage n'ont pas à s'ouvrir sur le
    // même réglage — et ce n'est pas non plus une préférence qui mérite sa clé
    // dans le navigateur. On rouvre sur le premier, comme un rouage d'édition se
    // referme au rechargement.
    var pages = [];
    function montre(i) {
      pages.forEach(function (p, j) {
        p.bouton.classList.toggle("on", j === i);
        p.page.classList.toggle("on", j === i);
        // UN SEUL ARRÊT DE TABULATION POUR TOUTE LA BANDE. Cinq boutons
        // focalisables, ce sont cinq tabulations entre le titre du bloc et le
        // premier champ qu'on vient régler : la bande coûterait plus cher à
        // traverser qu'à employer. On entre sur l'onglet ouvert, les flèches
        // font le reste.
        p.bouton.tabIndex = j === i ? 0 : -1;
      });
    }
    function onglet(nom, aide, bati) {
      var i = pages.length;
      // UN BOUTON, ET NON UN DIV. Les onglets de la feuille sont des div et ne
      // s'atteignent qu'à la souris ; les segments de la barre d'envoi sont des
      // boutons, et c'est ce précédent-là qui vaut ici. Le navigateur donne
      // alors le focus, Entrée et Espace sans qu'on écrive une ligne pour ça.
      var bouton = el("button", "pc-tab", nom);
      bouton.type = "button";
      // UNE INFOBULLE SEULEMENT QUAND LE MOT EST ABRÉGÉ, et elle ne dit alors
      // que le mot entier. Les cinq en portaient une qui récitait la règle
      // (« ce qui coiffe le résultat du jet ») : la fiche ne récite pas les
      // règles, elle porte l'état du personnage.
      if (aide) bouton.title = aide;
      bouton.addEventListener("click", function () { montre(i); });
      bouton.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : (e.key === "ArrowLeft" ? -1 : 0);
        if (!d) return;
        e.preventDefault();
        var j = (i + d + pages.length) % pages.length;
        montre(j);
        pages[j].bouton.focus();
      });
      bande.appendChild(bouton);
      var page = el("div", "pc-souspage");
      bati(page);
      corps.appendChild(page);
      pages.push({ bouton: bouton, page: page });
    }

    // AUCUNE NOTE SOUS LES ONGLETS, ET C'EST UNE RÈGLE DE LA FICHE : elle ne
    // récite pas les règles, elle porte l'état du personnage. Ce que chaque
    // levier fait se lit dans le NOM de son onglet et dans les entêtes de sa
    // grille ; ce dont on a besoin en réglant un champ tient dans l'infobulle
    // de ce champ. Une phrase de règle posée là est du texte de livre dans un
    // outil, et elle vieillit sans que personne s'en aperçoive.

    // LA GRILLE, ET SON DÉFILEMENT. Les colonnes d'une grille d'Options ont une
    // largeur en rem, pas en parts : sous une certaine largeur de colonne, elles
    // ne rentrent plus, et c'est voulu — un champ de saisie qui se réduit à deux
    // millimètres ne sert plus à rien. L'enveloppe laisse alors défiler la
    // grille sur le côté.
    function grille(hote) {
      var wrap = el("div", "pc-optcomp-wrap");
      var box = el("div");
      wrap.appendChild(box);
      hote.appendChild(wrap);
      return box;
    }
    // L'entête d'une grille : les mêmes colonnes que le bloc des compétences,
    // pour n'avoir qu'une disposition à apprendre dans tout l'onglet.
    //
    // UN MOT NUL POSE UN FILET, et non un entête vide : la grille des leviers
    // porte deux colonnes d'un pixel qui séparent les trois groupes, et un
    // entête de texte à leur place décalerait tout d'une colonne. C'est déjà ce
    // que fait la grille des compétences.
    function entete(hote, cls, mots) {
      var head = el("div", "pc-optcomp-row " + cls + " head");
      mots.forEach(function (h) {
        if (!h) { head.appendChild(el("span", "rule")); return; }
        var sp = el("span", h[2] || null, h[0]);
        sp.title = h[1];
        head.appendChild(sp);
      });
      hote.appendChild(head);
      return head;
    }
    // La rangée d'une caractéristique : son sigle à gauche, le nom entier en
    // infobulle — la colonne est trop étroite pour « Détermination ».
    function rangee(hote, cls, c, i) {
      var row = el("div", "pc-optcomp-row " + cls + (i % 2 === 1 ? " odd" : ""));
      var nameBox = el("span", "pc-comp-name");
      var chip = el("span", "pc-abbr", c);
      chip.title = caracInfo(c).nom;
      nameBox.appendChild(chip);
      row.appendChild(nameBox);
      hote.appendChild(row);
      return row;
    }

    // ---------- LIRE ET ÉCRIRE UNE BOÎTE, SANS RIEN MATÉRIALISER ----------
    // On ne passe PAS par champMod(map, clé, …), qui exige une table existante :
    // l'appeler au montage créerait les trente-cinq sous-tables chez tout
    // personnage qui ouvre simplement les Options, et l'état, qui voyage dans un
    // seul attribut Roll20, s'alourdirait de trente-cinq objets vides pour rien.
    //
    // On emploie donc les formes LIBRES (champModVal, champForceVal,
    // champMultVal) avec deux fermetures qui ne créent qu'à l'écriture — et qui
    // DÉFONT le chemin quand la dernière valeur s'en va.
    function boiteLire(nom, boite) {
      return function (c) {
        var l = state.caracsLeviers && state.caracsLeviers[nom];
        var tb = l && l[boite];
        var v = tb && tb[c];
        return (typeof v === "number" && isFinite(v)) ? v : undefined;
      };
    }
    function boiteEcrire(nom, boite) {
      return function (c, v) {
        if (!state.caracsLeviers || typeof state.caracsLeviers !== "object") state.caracsLeviers = {};
        var lv = state.caracsLeviers;
        if (v === undefined || v === null) {
          if (!lv[nom] || !lv[nom][boite]) return;
          delete lv[nom][boite][c];
          if (!Object.keys(lv[nom][boite]).length) delete lv[nom][boite];
          if (!Object.keys(lv[nom]).length) delete lv[nom];
          return;
        }
        if (!lv[nom]) lv[nom] = {};
        if (!lv[nom][boite]) lv[nom][boite] = {};
        lv[nom][boite][c] = v;
      };
    }
    // UNE BOÎTE QUI NE CHANGE RIEN NE COMPTE PAS. C'est ce qui allume la barre
    // rouge de la rangée et le rouge du dernier nombre — et ce doit être vrai
    // quand quelque chose est RÉGLÉ, pas quand une clé traîne.
    //
    // Un ajout de zéro et un facteur de un sont le NEUTRE de leur opération :
    // ils ne comptent pas. Un forçage, si — forcer une valeur à zéro est un
    // réglage, et le seul moyen d'obtenir zéro à coup sûr.
    var BOITES = [["force", null], ["a1", 0], ["a2", 0], ["m1", 1], ["m2", 1],
                  ["a3", 0], ["a4", 0]];
    function levierRegle(nom, c) {
      var l = state.caracsLeviers && state.caracsLeviers[nom];
      if (!l) return false;
      for (var i = 0; i < BOITES.length; i++) {
        var tb = l[BOITES[i][0]];
        var v = tb && tb[c];
        if (v === undefined) continue;
        if (BOITES[i][1] !== null && v === BOITES[i][1]) continue;
        return true;
      }
      return false;
    }
    // CE QUE LA CHAÎNE A FAIT, RELU DANS L'ORDRE : la base d'abord, puis chaque
    // boîte réglée. C'est l'infobulle du dernier nombre, et la seule façon
    // honnête de dire d'où il sort — une phrase écrite d'avance mentirait dès
    // qu'un facteur est posé.
    function chaineTexte(nom, c, motBase, base) {
      var l = state.caracsLeviers && state.caracsLeviers[nom];
      var f = l && l.force && l.force[c];
      if (f !== undefined) return "Forcé à " + f;
      var out = motBase + " " + base;
      [["a1", " · ", 0], ["a2", " · ", 0], ["m1", " · ×", 1], ["m2", " · ×", 1],
       ["a3", " · ", 0], ["a4", " · ", 0]].forEach(function (d) {
        var tb = l && l[d[0]];
        var v = tb && tb[c];
        // le neutre ne se dit pas : « de la table 400 · +0 » se lit deux fois
        // avant de vouloir dire qu'il ne s'est rien passé
        if (v === undefined || v === d[2]) return;
        out += d[1] + (d[0].charAt(0) === "m" ? v : sign(v));
      });
      return out;
    }

    // ---------- UN LEVIER : LA GRILLE DES NEUF COLONNES ----------
    // Les cinq onglets l'appellent, et ne diffèrent que par quatre choses : le
    // nom du levier dans l'état, le mot de la dernière colonne, la borne de ses
    // ajouts, et ce que ce dernier nombre affiche.
    //
    // LES ENTÊTES DES SIX CHAMPS SONT DES SIGNES, et il n'y a pas d'alternative
    // honnête : la colonne fait 1,4 rem, aucun mot n'y tient, et deux « MODIF. »
    // de suite ne diraient pas lequel vient avant l'autre. « ＋ » et « × »
    // disent ce que la case CONTIENT — un nombre qui s'ajoute, un nombre qui
    // multiplie — et rien de plus ; « avant » et « après » diraient où la case
    // tombe dans un calcul, c'est-à-dire la règle, qui n'a pas sa place ici.
    function grilleLevier(page, nom, mot, borne, auto, rendu) {
      var box = grille(page);
      entete(box, "levier", [
        ["Carac.", "Caractéristique"],
        ["Forcé", "Valeur imposée — vide = valeur calculée"],
        ["＋", "Deux nombres qui s'ajoutent avant les facteurs", "duo op"],
        null,
        ["×", "Deux facteurs — vide = ×1", "duo op"],
        null,
        ["＋", "Deux nombres qui s'ajoutent après les facteurs", "duo op"],
        mot
      ]);
      champs().forEach(function (c, i) {
        var row = rangee(box, "levier", c, i);
        // le forçage court-circuite tout le reste ; son filigrane montre ce que
        // la chaîne donnerait sans lui
        var lireF = boiteLire(nom, "force"), ecrF = boiteEcrire(nom, "force");
        row.appendChild(champForceVal(
          function () { return lireF(c); },
          function (v) { ecrF(c, v); },
          function () { return auto(c); },
          "Valeur imposée — vide = valeur calculée."));
        ["a1", "a2"].forEach(function (bx) { row.appendChild(champAjout(nom, bx, c, borne)); });
        row.appendChild(el("span", "rule"));
        ["m1", "m2"].forEach(function (bx) { row.appendChild(champFacteur(nom, bx, c)); });
        row.appendChild(el("span", "rule"));
        ["a3", "a4"].forEach(function (bx) { row.appendChild(champAjout(nom, bx, c, borne)); });
        var out = el("span", "pc-comp-total", "");
        row.appendChild(out);
        hooks.push(function () {
          var r = rendu(c);
          var regle = levierRegle(nom, c);
          out.textContent = r.texte;
          out.classList.toggle("adj", regle);
          if (r.zero !== undefined) out.classList.toggle("zero", r.zero);
          out.title = r.titre;
          row.classList.toggle("on", regle);
        });
      });
    }
    function champAjout(nom, boite, c, borne) {
      var lire = boiteLire(nom, boite), ecr = boiteEcrire(nom, boite);
      return champModVal(
        function () { return lire(c); },
        function (v) { ecr(c, v ? v : undefined); }, borne,
        "Nombre qui s'ajoute — vide = aucun.");
    }
    function champFacteur(nom, boite, c) {
      var lire = boiteLire(nom, boite), ecr = boiteEcrire(nom, boite);
      return champMultVal(
        function () { return lire(c); },
        function (v) { ecr(c, v); },
        "Facteur — vide = ×1.");
    }

    // ---------- Plafond ----------
    // CE QU'UNE CARACTÉRISTIQUE NE PEUT PAS DÉPASSER. La base est le prestige,
    // qui range le personnage ; on la relève ou on l'abaisse ici,
    // caractéristique par caractéristique. Le prestige lui-même reste dans
    // « Création » : il n'appartient à aucune des huit, il les coiffe toutes.
    onglet("Plafond", "", function (p) {
      grilleLevier(p, "plafond", ["Plafond", "Plafond effectif"], 999,
        caracPlafondAuto,
        function (c) {
          return { texte: String(caracPlafond(c)),
                   titre: chaineTexte("plafond", c, "prestige", prestige()) };
        });
    });

    // ---------- XP ----------
    // CE QU'ELLE COÛTE, ET RIEN D'AUTRE. Le coût se lit sur la valeur ACHETÉE,
    // jamais sur le total : un bonus d'équipement ne se paie pas.
    onglet("XP", "", function (p) {
      grilleLevier(p, "xp", ["Coût", "Coût effectif en xp"], 9999,
        caracXpAuto,
        function (c) {
          var xp = caracXp(c);
          return { texte: xp + " xp", zero: !xp,
                   titre: chaineTexte("xp", c, "valeur " + caracBase(c) + " :",
                                      ligneValeur(caracBase(c)).xp) };
        });
    });

    // ---------- Modificateur ----------
    onglet("Modif.", "Modificateur", function (p) {
      grilleLevier(p, "mod", ["MOD", "Modificateur effectif"], 999,
        caracModAuto,
        function (c) {
          return { texte: sign(caracMod(c)),
                   titre: chaineTexte("mod", c, "de la table", caracModTable(c)) };
        });
    });

    // ---------- Limite ----------
    // LA LIMITE SEULE, et c'est le seul levier qui resserre l'écart d'une
    // spécialité sous son minimum : le rabattage se calcule sur la limite
    // NATURELLE, que celui-ci ne touche pas (voir caracLimNat).
    onglet("Limite", "", function (p) {
      grilleLevier(p, "lim", ["Limite", "Limite effective"], 9999,
        caracLimAuto,
        function (c) {
          return { texte: String(caracLim(c)),
                   titre: chaineTexte("lim", c, "de la table", caracLimTable(c)) };
        });
    });

    // ---------- Écart ----------
    // SON FORÇAGE EST L'ANCIENNE CASE UNIQUE : une valeur, et non un décalage —
    // on pense « l'écart doit être de 30 », jamais « je décale de −20 ». Elle a
    // glissé en colonne « Forcé » sans changer de nature, ce qui est ce qui rend
    // la reprise des anciennes fiches sûre.
    //
    // L'interrupteur qui SUSPEND la règle n'est pas ici : il a son bloc (voir
    // ecart-regle.js). Les cinq onglets décalent un seuil, caractéristique par
    // caractéristique ; lui suspend la règle pour le personnage entier.
    onglet("Écart", "", function (p) {
      grilleLevier(p, "ecart", ["Écart", "Écart minimum effectif"], 9999,
        ecartMinAuto,
        function (c) {
          return { texte: String(ecartMin(c)),
                   titre: chaineTexte("ecart", c, "des règles", repli("speMarge")) };
        });
    });

    montre(0);
    return b;
  }
