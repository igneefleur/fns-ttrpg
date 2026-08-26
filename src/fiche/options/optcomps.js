  // ---- onglet Options : LES COMPÉTENCES, TOUT CE QUI SE RÈGLE ----
  // SIX ONGLETS, MÊME GRILLE QUE LES CARACTÉRISTIQUES, et pour la même raison :
  // ce qui change de l'un à l'autre, ce n'est pas le geste, c'est ce sur quoi il
  // porte. Ce bloc portait autrefois les compétences ET les spécialités dans une
  // seule grille à dix colonnes ; les spécialités ont maintenant le leur.
  //
  // L'ORDRE SUIT CE QU'UNE COMPÉTENCE EST : d'où elle tient (sa
  // caractéristique), puis les trois étages du calcul —
  //
  //     VALEUR (chaîne)  →  coiffée par le PLAFOND  →  plus le BONUS (chaîne)
  //
  // — puis ce qu'elle coûte (l'xp) et le seuil qu'elle transmet à ses
  // spécialités (l'écart). « Valeur » est à GAUCHE de « Plafond » parce que le
  // plafond mord sur ce que la valeur a produit, et non l'inverse.
  //
  // POURQUOI PAS D'ONGLET « LIMITE » : une compétence n'en a pas. Le jet est
  // coiffé par la limite de la caractéristique employée, et c'est elle qu'on
  // règle dans le bloc d'à côté. Ni « MOD » : une compétence apporte des POINTS,
  // et le mot « CARAC » de sa ligne dit bien que le modificateur vient d'ailleurs.
  function buildOptComps() {
    var b = block("Compétences");
    var bande = bandeOnglets(b);
    var B = boitesTable("compsLeviers");

    function lignes() {
      return champsComp().map(function (k) {
        return { cle: k, nom: k, titre: compInfo(k).nom };
      });
    }
    function tab(titre, aide, nom, mot, borne, auto, rendu) {
      bande.onglet(titre, aide, function (p) {
        grilleLevier(p, {
          cls: "levier",
          entete: ["Comp.", "Compétence"],
          lignes: lignes(),
          rangee: function (hote, cls, ligne, i) {
            return rangeeSigle(hote, cls, ligne.nom, i, ligne.titre);
          },
          lire: function (k) { return B.lire(nom, k); },
          ecrire: function (k, boite, v) { B.ecrire(nom, boite, k, v); },
          mot: mot, borne: borne, auto: auto, rendu: rendu
        });
      });
    }

    // ---------- Caractéristique ----------
    // DEUX CHOSES QUE LES RÈGLES DISENT, ET QUE LE MENEUR PEUT DIRE AUTREMENT :
    // la caractéristique qui lance la compétence par défaut, et celles dont le
    // MOD commande son plafond de points.
    //
    // ELLES SE RÈGLENT PARCE QU'UN AVANTAGE CHANGE UNE FICHE. Un avantage n'est
    // que du texte : rien d'autre que ces réglages ne peut faire entrer sa
    // conséquence chiffrée.
    //
    // L'ÉTAT NE PORTE QUE LA SURCHARGE. Choisir ce que disent les règles, c'est
    // ne rien régler : on efface alors la clé, sans quoi la ligne cesserait de
    // dire ce qui a été touché, et un sigle changé dans la page laisserait le
    // personnage sur l'ancien sans que rien ne le dise.
    bande.onglet("Carac.", "Caractéristique", function (p) {
      var box = grilleOpt(p);
      var mots = [["Comp.", "Compétence"], ["Jet", "La caractéristique qui la lance par défaut"], null];
      champs().forEach(function (c) { mots.push([c, caracInfo(c).nom]); });
      enteteOpt(box, "carac", mots);
      champsComp().forEach(function (k, i) {
        var row = rangeeSigle(box, "carac", k, i, compInfo(k).nom);
        // le sélecteur : les huit sigles, le nom entier en infobulle de chacun
        var sel = el("select", "pc-select");
        champs().forEach(function (c) {
          var o = el("option", null, c);
          o.value = c;
          o.title = caracInfo(c).nom + (c === (compInfo(k).lim || "") ? " — des règles" : "");
          sel.appendChild(o);
        });
        sel.addEventListener("change", function () {
          if (!state.compsCarac) state.compsCarac = {};
          if (sel.value === (compInfo(k).lim || "")) delete state.compsCarac[k];
          else state.compsCarac[k] = sel.value;
          refresh();
        });
        row.appendChild(sel);
        row.appendChild(el("span", "rule"));
        // les huit cases : indépendantes les unes des autres, parce que le
        // plafond peut relever de plusieurs caractéristiques à la fois
        var cases = [];
        champs().forEach(function (c) {
          var bt = el("button", "pc-case-plaf");
          bt.type = "button";
          bt.title = caracInfo(c).nom;
          bt.addEventListener("click", function () {
            var liste = compsPlafondDe(k).slice();
            var j = liste.indexOf(c);
            if (j >= 0) liste.splice(j, 1); else liste.push(c);
            if (!state.compsCaracsPlafond) state.compsCaracsPlafond = {};
            // MÊME LISTE QUE LES RÈGLES = AUCUN RÉGLAGE. On compare sur l'ordre
            // des règles, que la normalisation impose déjà aux deux côtés.
            var regle = compInfo(k).mod || [];
            var ordonnee = champs().filter(function (x) { return liste.indexOf(x) >= 0; });
            var pareil = ordonnee.length === regle.length &&
                         ordonnee.every(function (x, n) { return x === regle[n]; });
            if (pareil) delete state.compsCaracsPlafond[k];
            else state.compsCaracsPlafond[k] = ordonnee;
            refresh();
          });
          cases.push({ code: c, bt: bt });
          row.appendChild(bt);
        });
        hooks.push(function () {
          var surcharge = state.compsCarac && state.compsCarac[k] !== undefined;
          if (document.activeElement !== sel) sel.value = compCarac(k);
          var liste = compsPlafondDe(k);
          cases.forEach(function (x) {
            x.bt.classList.toggle("on", liste.indexOf(x.code) >= 0);
          });
          var surP = state.compsCaracsPlafond && state.compsCaracsPlafond[k] !== undefined;
          row.classList.toggle("on", !!surcharge || !!surP);
        });
      });
    });

    // ---------- Valeur ----------
    // LES POINTS DE LA COMPÉTENCE. La base est ce que le joueur a acheté, BRUT :
    // le plafond mord ensuite sur ce que la chaîne rend.
    //
    // C'ÉTAIT L'INVERSE, ET C'ÉTAIT FAUX : la chaîne partait d'une base déjà
    // coiffée ET déjà bonifiée, et son résultat n'était re-coiffé par rien.
    tab("Valeur", "", "valeur", ["Valeur", "Points effectifs"], 999,
      compValeurAuto,
      function (k) {
        var brut = compValeurBrut(k);
        return { texte: String(compValeur(k)),
                 titre: chaineTexteDe(lireComp("valeur", k), "achetés", compValeurSocle(k)) +
                        (brut > compPlafond(k) ? " · plafonnés à " + compPlafond(k) : "") };
      });

    // ---------- Plafond ----------
    // CE QU'UNE COMPÉTENCE NE PEUT PAS DÉPASSER EN POINTS : le meilleur MOD des
    // caractéristiques qui la commandent — celles du premier onglet.
    tab("Plafond", "", "plafond", ["Plafond", "Plafond effectif de points"], 999,
      compPlafondAuto,
      function (k) {
        return { texte: String(compPlafond(k)),
                 titre: chaineTexteDe(lireComp("plafond", k), "le meilleur MOD :",
                                      compPlafondSocle(k)) };
      });

    // ---------- Bonus ----------
    // CE QUI S'AJOUTE APRÈS LA COIFFE, et que rien ne borne. La base est la case
    // Bonus de la ligne, sur la Fiche.
    tab("Bonus", "", "bonus", ["Bonus", "Bonus effectif"], 999,
      compBonusAuto,
      function (k) {
        var b = compBonus(k);
        return { texte: sign(b), zero: !b,
                 titre: chaineTexteDe(lireComp("bonus", k), "de la Fiche", compBonusSocle(k)) };
      });

    // ---------- XP ----------
    tab("XP", "", "xp", ["Coût", "Coût effectif en xp"], 9999,
      compXpAuto,
      function (k) {
        var xp = compXp(k);
        return { texte: xp + " xp", zero: !xp,
                 titre: chaineTexteDe(lireComp("xp", k), "points achetés :", compXpSocle(k)) };
      });

    // ---------- Écart ----------
    // DEUXIÈME ÉTAGE DE LA CASCADE : la base est l'écart de la caractéristique
    // qui lance la compétence, et ce qu'on règle ici descend sur les
    // spécialités qui en relèvent.
    tab("Écart", "", "ecart", ["Écart", "Écart minimum effectif"], 9999,
      function (k) { return ecartCompAuto(k); },
      function (k) {
        return { texte: String(ecartComp(k)),
                 titre: chaineTexteDe(lireComp("ecart", k),
                                      "de " + compCarac(k) + " :", ecartMin(compCarac(k))) };
      });

    bande.montre(0);
    return b;
  }
