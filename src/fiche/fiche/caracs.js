  // ---------- onglet Fiche : les caractéristiques ----------
  // LES HUIT, dans l'ordre de champs(), c'est-à-dire celui de la page de
  // règles. Aucune liste écrite en dur : une caractéristique renommée ou
  // déplacée dans les règles arrive ici sans qu'on rouvre ce fichier.
  //
  // LE PRESTIGE N'EST PAS ICI, et c'est délibéré : il n'est pas une
  // caractéristique, il les plafonne toutes. Il se saisit dans l'en-tête, à
  // côté de l'XP total — les deux mêmes choses, ce que le meneur accorde.
  function buildCaracs() {
    // jeu : le sigle et son trio ; édition : les mêmes cases, dont deux
    // s'ouvrent à la saisie
    var b = block("Caractéristiques", null, "caracs");

    // ---------- l'entête des trois colonnes ----------
    // MÊME SQUELETTE QUE LE TRIO, sans ses bordures : c'est la seule façon
    // d'être sûr que les étiquettes tombent en face de leurs nombres. Une
    // rangée bâtie à part dériverait d'un pixel au premier changement de
    // remplissage, et personne ne saurait plus laquelle des trois on lit.
    //
    // Une seule fois, en tête : répétées sur chacune des huit lignes, elles
    // disaient vingt-quatre fois ce que trois mots suffisent à dire, et
    // noyaient les nombres qu'on vient lire.
    //
    // LE MOT ENTIER, ET JAMAIS L'ABRÉGÉ. « VAL », « BON », « TOT » ne coûtaient
    // rien à écrire mais se lisaient trois fois : la place existe, l'entête ne
    // paraît qu'une fois pour huit lignes, et un mot entier n'a pas besoin
    // d'être appris. La règle vaut pour les trois listes de la fiche.
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "sp"));
    var teteTrio = el("span", "pc-trio tete");
    ["Valeur", "Bonus", "Total"].forEach(function (k) {
      var c = el("span", "c");
      c.appendChild(el("span", "k", k));
      teteTrio.appendChild(c);
    });
    tete.appendChild(teteTrio);
    b.appendChild(tete);

    // ---------- une caractéristique ----------
    function ligne(code) {
      var info = caracInfo(code);
      var row = el("div", "pc-crow");

      var top = el("div", "pc-crow-top");
      // le sigle est ce que le joueur lit sur ses jets et dans ses règles ; le
      // nom entier tient dans l'infobulle, pour la colonne trop étroite
      var chip = el("span", "pc-abbr", code);
      chip.title = info.nom;
      top.appendChild(chip);
      top.appendChild(el("span", "sp"));

      // ON NE LANCE PAS UNE CARACTÉRISTIQUE. Un jet part toujours d'une
      // compétence ou d'une spécialité — la caractéristique n'y entre que par
      // son MOD et sa limite. Le bloc ne se clique donc pas : il n'a ni
      // curseur, ni survol, ni action.
      var trio = el("span", "pc-trio");
      // TROIS NOMBRES, ET ILS DISENT UNE SEULE CHOSE : ce que la
      // caractéristique VAUT. Ce qu'elle DONNE au jet — son modificateur, sa
      // limite — ne s'écrit plus ici : les deux se lisent dans la table des
      // règles, et la compétence qui en relève les porte déjà sur sa propre
      // ligne. L'infobulle du bloc les rappelle, et le jet les emploie.
      //
      // DEUX SE SAISISSENT DANS LEUR CASE. Le rang de construction qui portait
      // leurs ± a disparu avec : la ligne garde la même hauteur, rouage ouvert
      // ou fermé, et la même que celle d'une spécialité.
      var vVal = caseSaisie(trio,
        function () { return caracBase(code); },
        function (v) {
          // le plafond ne bloque que les HAUSSES : une valeur passée au-dessus
          // (prestige abaissé après coup) redescend pas à pas au lieu d'être
          // écrasée d'un seul clic
          var plaf = caracPlafond(code);
          var haut = Math.max(plaf, caracBase(code));
          var n = Math.round(v);
          if (n > haut) { flash("Plafond de " + plaf + "."); n = haut; }
          state.caracs[code] = Math.max(0, n);
        }, "Valeur achetée");
      var vBon = caseSaisie(trio,
        function () { return state.caracsBonus[code] || 0; },
        function (v) {
          var n = clamp(Math.round(v), -999, 999);
          if (n) state.caracsBonus[code] = n; else delete state.caracsBonus[code];
        }, "Bonus de la caractéristique");
      var vTot = caseTexte(trio);
      top.appendChild(trio);
      row.appendChild(top);

      // L'XP N'EST PLUS ÉCRITE SUR LA LIGNE. Elle prenait un rang entier sous
      // les nombres, uniquement en édition — donc une ligne qui changeait de
      // hauteur au clic du rouage. Ce qu'une caractéristique coûte se lit dans
      // le total de l'en-tête, qui avertit dès qu'il est dépassé ; le détail par
      // caractéristique appartient au calibrage, pas à la fiche en jeu.
      hooks.push(function () {
        var d = state.caracsBonus[code] || 0;
        // LE LEVIER SE LIT PAR SON RÉSULTAT, et non par une de ses sept cases :
        // un facteur ou un ajout de fin décalent le MOD sans toucher à celle
        // qu'on lisait ici, et la pastille « retouché » restait éteinte.
        var dm = caracModBrut(code) - caracModTable(code);
        var dl = caracLimBrut(code) - caracLimTable(code);
        var plaf = caracPlafond(code);
        var base = caracBase(code);
        var mord = base > plaf;
        var retouche = d !== 0 || dm !== 0 || dl !== 0 || mord;
        // LA VALEUR EST CELLE QU'ON A ACHETÉE, le bonus ce qui s'y ajoute, le
        // total leur somme — c'est de ce total-là que la table tire le MOD et
        // la limite du jet.
        vVal.txt.textContent = String(Math.min(base, plaf));
        vBon.txt.textContent = sign(d);
        vTot.textContent = String(caracTotal(code));
        trio.classList.toggle("adj", retouche);
        // quand le plafond mord, le dire : sans cela, le joueur voit un total
        // qui ne correspond ni à ce qu'il a acheté ni à ce qu'il a modifié, et
        // rien ne dit pourquoi. Un total forcé, lui, REMPLACE la somme :
        // l'afficher quand même la ferait mentir.
        trio.title = "Valeur " + base +
                     (mord ? ", plafonnée à " + plaf : "") +
                     (d ? " · bonus " + sign(d) : "") +
                     (dm ? " · MOD décalé de " + sign(dm) + " (Options)" : "") +
                     (dl ? " · limite décalée de " + sign(dl) + " (Options)" : "") +
                     " — MOD " + sign(caracMod(code)) + ", LIM " + caracLim(code);
      });
      return row;
    }

    // ---------- les huit, dans l'ordre des règles ----------
    champs().forEach(function (code) { b.appendChild(ligne(code)); });
    return b;
  }
