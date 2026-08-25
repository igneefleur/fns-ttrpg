  // ---- onglet Options : LES CARACTÉRISTIQUES, TOUT CE QUI SE RÈGLE ----
  // UN SEUL BLOC, ET CINQ ONGLETS DEDANS. Il y avait quatre blocs — plafond,
  // modificateur, limite, écart — plus l'interrupteur de la règle de l'écart et
  // le coût en xp, soit six titres pour une seule et même chose : régler les
  // huit caractéristiques. La colonne des Options en était pleine, et il fallait
  // se rappeler lequel des six on cherche avant de savoir où regarder.
  //
  // Le geste est le même dans les cinq : on prend une caractéristique et on
  // décale ce qu'elle donne. Ce qui change d'un onglet à l'autre, c'est ce qu'on
  // décale — donc un onglet PAR MODIFICATION, jamais par caractéristique.
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
      bouton.title = aide;
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

    // La note d'un onglet dit ce que CE levier fait, et lui seul : c'est la
    // seule chose qui distingue cinq grilles qui se ressemblent.
    function note(hote, texte) {
      hote.appendChild(el("div", "pc-block-note", texte));
    }
    // LA GRILLE, ET SON DÉFILEMENT. Les colonnes d'une grille d'Options ont une
    // largeur en rem, pas en parts : sous une certaine largeur de colonne, elles
    // ne rentrent plus, et c'est voulu — un champ de saisie qui se réduit à deux
    // millimètres ne sert plus à rien. L'enveloppe laisse alors défiler la
    // grille sur le côté. (Les grilles se serrent quand même sous 380 px de
    // fenêtre — un défaut que ces blocs avaient déjà, et qui n'est pas de
    // celui-ci : mesuré identique avant la fusion.)
    function grille(hote) {
      var wrap = el("div", "pc-optcomp-wrap");
      var box = el("div");
      wrap.appendChild(box);
      hote.appendChild(wrap);
      return box;
    }
    // L'entête d'une grille : les mêmes colonnes que le bloc des compétences,
    // pour n'avoir qu'une disposition à apprendre dans tout l'onglet.
    function entete(hote, cls, mots) {
      var head = el("div", "pc-optcomp-row " + cls + " head");
      mots.forEach(function (h) {
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

    // ---------- un levier de décalage : trois colonnes ----------
    // Le sigle, ce qu'on décale, ce que ça donne. Deux onglets s'en servent —
    // le modificateur et la limite — et ils ne diffèrent que par la clé d'état
    // qu'ils écrivent et par le nombre qu'ils affichent en regard.
    function levier(hote, texte, mot, aide, champ, borne, rendu) {
      note(hote, texte);
      var box = grille(hote);
      entete(box, "trois", [["Carac.", "Caractéristique"],
                            ["Décal.", "Décalage — vide = aucun"],
                            mot]);
      champs().forEach(function (c, i) {
        var row = rangee(box, "trois", c, i);
        row.appendChild(champMod(state[champ], c, borne, aide));
        var out = el("span", "pc-comp-total", "");
        row.appendChild(out);
        hooks.push(function () {
          var d = state[champ][c] || 0;
          var r = rendu(c);
          out.textContent = r.texte;
          out.classList.toggle("adj", d !== 0);
          out.title = r.titre;
          row.classList.toggle("on", d !== 0);
        });
      });
    }

    // ---------- Plafond ----------
    // CE QU'UNE CARACTÉRISTIQUE NE PEUT PAS DÉPASSER. Il vient du prestige, qui
    // range le personnage ; on le relève ou on l'abaisse ici, caractéristique
    // par caractéristique. Le prestige lui-même reste dans « Création » : il
    // n'appartient à aucune des huit, il les coiffe toutes.
    // « le plafond de Agilité » : les noms viennent des règles, on n'en connaît
    // donc pas la liste d'avance et l'élision se décide ici, sur la lettre.
    function de(nom) {
      return (/^[aâàäeéèêëiîïoôöuùûü]/i.test(nom) ? "d'" : "de ") + nom;
    }
    onglet("Plafond", "Ce qu'une caractéristique ne peut pas dépasser", function (p) {
      note(p, "Le prestige plafonne chaque caractéristique. Ce qui suit relève ou abaisse ce plafond, caractéristique par caractéristique.");
      var box = grille(p);
      entete(box, "quatre", [["Carac.", "Caractéristique"],
                             ["Forcé", "Plafond forcé — vide = plafond calculé"],
                             ["Modif.", "Modificateur du plafond — vide = aucun"],
                             ["Plafond", "Plafond effectif"]]);
      champs().forEach(function (c, i) {
        var row = rangee(box, "quatre", c, i);
        row.appendChild(champForce(state.caracsPlafondForce, c,
          function () { return caracPlafondAuto(c); },
          "Plafond forcé — vide = plafond calculé (prestige + modificateur)."));
        row.appendChild(champMod(state.caracsPlafondMod, c, 999,
          "Modificateur du plafond " + de(caracInfo(c).nom) + " — vide = aucun."));
        var tot = el("span", "pc-comp-total", "");
        row.appendChild(tot);
        hooks.push(function () {
          var m = state.caracsPlafondMod[c] || 0;
          var f = state.caracsPlafondForce[c];
          tot.textContent = String(caracPlafond(c));
          tot.classList.toggle("adj", m !== 0 || f !== undefined);
          tot.title = f !== undefined
            ? "Plafond forcé à " + f
            : "prestige " + prestige() + (m ? " · modificateur " + sign(m) : "");
          row.classList.toggle("on", m !== 0 || f !== undefined);
        });
      });
    });

    // ---------- XP ----------
    // CE QU'ELLES COÛTENT, ET RIEN D'AUTRE. Le coût se lit sur la valeur
    // ACHETÉE, jamais sur le total : un bonus d'équipement ne se paie pas.
    onglet("XP", "Ce qu'une caractéristique coûte", function (p) {
      note(p, "Coût en xp de la valeur achetée. Vide = le barème des règles.");
      var box = grille(p);
      entete(box, "xp", [["Carac.", "Caractéristique"],
                         ["Forcé", "Coût en xp forcé — vide = coût calculé"],
                         ["Modif.", "Deux modificateurs du coût en xp, qui s'additionnent", "duo"],
                         ["Coût", "Coût effectif en xp"]]);
      champs().forEach(function (c, i) {
        var row = rangee(box, "xp pc-mods-host", c, i);
        row.appendChild(champForce(state.caracsXpForce, c,
          function () { return caracXpAuto(c); },
          "Coût en xp forcé — vide = coût calculé (barème des règles et modificateurs)."));
        row.appendChild(champMod(state.caracsXpMod, c, 9999,
          "Premier modificateur du coût en xp — vide = aucun."));
        row.appendChild(champMod(state.caracsXpMod2, c, 9999,
          "Second modificateur du coût en xp — vide = aucun."));
        var cout = el("span", "pc-comp-total", "");
        row.appendChild(cout);
        hooks.push(function () {
          var xf = state.caracsXpForce[c];
          var xm = (state.caracsXpMod[c] || 0) + (state.caracsXpMod2[c] || 0);
          var xp = caracXp(c);
          cout.textContent = xp + " xp";
          cout.classList.toggle("zero", !xp);
          cout.classList.toggle("adj", xf !== undefined || xm !== 0);
          cout.title = xf !== undefined
            ? "Coût forcé à " + xf + " xp (calculé : " + caracXpAuto(c) + " xp)"
            : "XP cumulé de la valeur " + caracBase(c) +
              (xm ? " · modificateurs " + sign(xm) + " xp" : "");
          row.classList.toggle("on", xm !== 0 || xf !== undefined);
        });
      });
    });

    // ---------- Modificateur ----------
    onglet("Modif.", "Ce que la caractéristique ajoute au jet", function (p) {
      levier(p, "Décale le modificateur sans toucher à la valeur ni à la limite.",
        ["MOD", "Modificateur effectif, celui qui s'ajoute au jet"],
        "Décalage du modificateur — vide = aucun.",
        "caracsModMod", 999,
        function (c) {
          var d = state.caracsModMod[c] || 0;
          return { texte: sign(caracMod(c)),
                   titre: "De la table " + sign(caracModTable(c)) +
                          (d ? " · décalage " + sign(d) : "") };
        });
    });

    // ---------- Limite ----------
    // LA LIMITE SEULE, et c'est le seul levier qui resserre l'écart d'une
    // spécialité sous son minimum : le rabattage se calcule sur la limite
    // NATURELLE, que celui-ci ne touche pas (voir caracLimNat).
    onglet("Limite", "Ce qui coiffe le résultat du jet", function (p) {
      levier(p, "Décale la limite sans toucher à la valeur : c'est le seul levier qui resserre l'écart d'une spécialité.",
        ["Limite", "Limite effective, celle qui coiffe le jet"],
        "Décalage de la limite — vide = aucun.",
        "caracsLimMod", 9999,
        function (c) {
          var d = state.caracsLimMod[c] || 0;
          return { texte: String(caracLim(c)),
                   titre: "De la table " + caracLimTable(c) + (d ? " · décalage " + sign(d) : "") };
        });
    });

    // ---------- Écart ----------
    // SEUL DES CINQ ONGLETS À DEMANDER UNE VALEUR et non un décalage, et c'est
    // voulu : on pense « l'écart doit être de 30 », jamais « je décale de −20 ».
    // Le champ montre en filigrane celui des règles, et l'effacer y revient.
    // Deux colonnes suffisent donc — une troisième répéterait le champ.
    //
    // L'INTERRUPTEUR EST ICI, EN TÊTE. Il était un bloc à lui seul, au motif que
    // décaler un seuil et SUSPENDRE une règle ne se font pas dans le même état
    // d'esprit. Le motif tient toujours, mais on ne le cherche nulle part
    // ailleurs qu'à l'endroit où l'on règle l'écart : il ouvre l'onglet, avant
    // les huit lignes, et ce qu'il coupe se lit juste en dessous.
    onglet("Écart", "L'écart minimum qu'une spécialité doit garder", function (p) {
      note(p, "Écart minimum entre le total d'une spécialité et la limite de sa caractéristique. Vide = celui des règles.");
      var row = el("div", "pc-kv");
      var lab = el("label", "pc-case-mot");
      var boite = el("input");
      boite.type = "checkbox";
      boite.title = "Coché, la règle de l'écart ne retire plus rien à ce personnage.";
      boite.addEventListener("change", function () {
        state.ecartCoupe = boite.checked;
        save();
        refresh();
      });
      hooks.push(function () { boite.checked = !!state.ecartCoupe; });
      lab.appendChild(boite);
      lab.appendChild(el("span", "t", "Couper la règle pour ce personnage"));
      row.appendChild(lab);
      p.appendChild(row);

      var box = grille(p);
      entete(box, "paire", [["Carac.", "Caractéristique"],
                            ["Écart", "Vide = l'écart des règles"]]);
      champs().forEach(function (c, i) {
        var row2 = rangee(box, "paire", c, i);
        row2.appendChild(champForce(state.caracsEcart, c,
          function () { return repli("speMarge"); },
          "Écart minimum — vide = celui des règles."));
        hooks.push(function () {
          row2.classList.toggle("on", state.caracsEcart[c] !== undefined);
        });
      });
    });

    montre(0);
    return b;
  }
