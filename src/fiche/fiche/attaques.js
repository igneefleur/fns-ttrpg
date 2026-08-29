  // ---------- les attaques ----------
  // UNE ATTAQUE N'EST PAS UN JET DE PLUS : c'est une CARTE de résolution. Le jet
  // ordinaire dit un nombre ; celle-ci dit, d'un coup, ce que l'attaque touche
  // et ce qu'elle coûte à chaque palier de défense.
  //
  //   ┌──────────────────────────────────────┐
  //   │ Attaques                           ⚙ │
  //   │              TOTAL LIMITE BONUS DÉG. │
  //   │ Coup de masse            [DEX] [COM] │
  //   │                  200  250    65   37 │  ← le bloc ENTIER lance
  //   └──────────────────────────────────────┘
  //
  // DEUX RANGS, là où une spécialité en tient un : le nom et ce dont l'attaque
  // relève d'abord, les quatre nombres ensuite. Six cases dans un quart de
  // colonne ne se lisent plus.
  //
  // QUATRE PARAMÈTRES SE RÈGLENT, ET RIEN DE PLUS : le nom, la spécialité qui
  // la porte, un bonus propre à cette attaque, et les dégâts.
  //
  // CE QUE LA FICHE CALCULE, ET QUE LA MACRO ÉCRITE À LA MAIN DEMANDAIT :
  //   TOTAL   = jetBonus(spé)      — ce que la LIMITE borne ;
  //   LIMITE  = limiteJet(spé)     — la limite elle-même ;
  //   BONUS   = jetBonusHors(spé) + le bonus de l'attaque, qui sort du groupe.
  //
  // ELLE PASSE PAR demandeJet(), COMME TOUS LES AUTRES JETS. C'est ce qui lui
  // donne les trois réglages de la barre d'envoi : la caractéristique au choix,
  // la compétence au choix, le modificateur d'endurance. Sans lui, l'attaque
  // était le seul jet de la fiche qui ignorait ce que l'en-tête demande.
  //
  // LES TROIS PALIERS, tels que la macro les tient :
  //   ATT−50  ≤ DEF ≤ ATT−1    → dégâts au quart
  //   ATT−150 ≤ DEF ≤ ATT−51   → dégâts pleins
  //             DEF ≤ ATT−151  → dégâts doublés
  // Ils sortent d'une chaîne de six niveaux imbriqués : chaque niveau expose son
  // résultat sous $[[n]], du plus intérieur au plus extérieur, et c'est le SEUL
  // moyen qu'a Roll20 de réemployer un jet dans un autre calcul.

  // LES DEUX PASTILLES DE CRITIQUE, et le tour par lequel elles se peignent.
  // Roll20 échappe le HTML d'un message, mais PAS les guillemets de l'adresse
  // d'un lien : « [x](cmd" style="…) » referme href et ouvre style, et le
  // guillemet que Roll20 pose pour fermer href ferme le style à sa place.
  //
  // LA COMMANDE RESTE EN TÊTE, sans quoi le bouton ne déclenche plus rien.
  //
  // NI PARENTHÈSE NI DOUBLE ACCOLADE dans ce style : la première fermerait le
  // lien, la seconde le champ du gabarit.
  var ATT_PASTILLE =
    "display:inline-block;font-size:inherit;font-weight:bold;line-height:1.4;" +
    "color:#ffffff;background-color:#6a2c8f;border:none;border-radius:0;" +
    "box-shadow:none;padding:0 7px;margin:0;text-decoration:none;vertical-align:middle";
  var ATT_CRIT_PLUS = "critique";    // succès critique
  var ATT_CRIT_MOINS = "malus";      // échec critique
  function attBouton(signe, macro) {
    return "[" + signe + "](!#" + macro + "\" style=\"" + ATT_PASTILLE + ")";
  }
  // Le signe collé au nombre, pour une expression Roll20 : « +12 », « -7 ».
  // sign() ne convient pas — il rend le moins TYPOGRAPHIQUE, que le moteur de
  // dés refuse.
  function attSigne(n) {
    var v = Math.round(n);
    return (v >= 0 ? "+" : "-") + Math.abs(v);
  }

  // La spécialité que porte une attaque, ou null si le nom ne répond plus.
  // ON LA CHERCHE À CHAQUE FOIS : la liste se réordonne et se renomme sous elle.
  function attSpe(a) { return a && a.spe ? speParNom(a.spe) : null; }
  // LES QUATRE NOMBRES DE L'ATTAQUE, sous la caractéristique et la compétence
  // EMPLOYÉES — celles que la barre d'envoi a pu faire choisir autrement. Sans
  // argument, ce sont celles de la spécialité.
  function attNombres(a, carac, comp) {
    var spe = attSpe(a);
    if (!spe) return null;
    var c = carac || spe.carac, k = comp === undefined ? spe.comp : comp;
    return {
      spe: spe, carac: c, comp: k,
      total: jetBonus(c, k, spe),
      lim: limiteJet(c, k, spe),
      // LE BONUS DE L'ATTAQUE S'AJOUTE À CELUI DE LA SPÉCIALITÉ, et les deux
      // sortent du groupe ensemble : c'est la règle du bonus, qui franchit la
      // limite au lieu d'être rogné par elle.
      bonus: jetBonusHors(c, k, spe) + pnum(a.bonus),
      degats: pnum(a.degats)
    };
  }

  // LA CARTE ENTIÈRE, prête à partir. Elle ne passe pas par cmdJetExpr(), qui
  // bâtit un gabarit à un seul champ : celle-ci en a trois.
  //
  // LE MODIFICATEUR D'ENDURANCE SORT DU GROUPE, à la suite du bonus : c'est sa
  // règle depuis toujours — la limite borne ce que le personnage vaut par
  // lui-même, l'endurance est ce par quoi il la dépasse.
  function attCarte(a, n, modif) {
    var m = Math.round(modif || 0);
    var groupe =
      "[[[[[[[[[[[[{" + deTest() + attSigne(n.total) + ",0d0+" + Math.round(n.lim) + "}dh1" +
      attSigne(n.bonus) + (m ? attSigne(m) : "") + "]]-1]]-50]]-100]]+1]]+100]]";
    var deg = n.degats;
    return "&{template:default} " + groupe +
      " {{name=" + (envSan(a.nom) || "Attaque") + "}}" +
      " {{Attaque=" + attBouton("−", ATT_CRIT_MOINS) + " $[[0]] " +
      attBouton("+", ATT_CRIT_PLUS) + "}}" +
      " {{``$[[5]] ≤ DEF ≤ $[[1]]``%NEWLINE%``$[[4]] ≤ DEF ≤ $[[2]]``%NEWLINE%" +
      "``DEF ≤ $[[3]]``=" +
      "``**⇒ **[[floor((" + deg + ")/4)]]``%NEWLINE%" +
      "``**⇒ **[[floor(" + deg + ")]]``%NEWLINE%" +
      "``**⇒ **[[floor((" + deg + ")*2)]]``}}";
  }

  // Une case de lecture dans un trio : le squelette commun des blocs de la
  // feuille, sans champ ni bascule de mode.
  function attCase(hote) {
    var c = el("span", "c");
    var v = el("span", "v", "");
    c.appendChild(v);
    hote.appendChild(c);
    return v;
  }
  // Un petit champ de nombre, borné à la saisie comme partout ailleurs.
  // IL N'A PAS BESOIN DE REGISTRE : la fonction de la ligne réécrit les nombres
  // LUS, pas celui-ci — et tant qu'on tape dedans, personne d'autre n'y touche.
  function attChamp(a, cle, bas, haut) {
    var i = el("input", "force pc-edit-field");
    i.type = "number"; i.step = "1";
    i.value = pnum(a[cle]);
    i.addEventListener("input", function () {
      var v = parseFloat(i.value);
      a[cle] = isFinite(v) ? clamp(Math.round(v), bas, haut) : 0;
      refresh();
    });
    return i;
  }

  function buildAttaques() {
    var b = block("Attaques", null, "attaques");

    // L'ENTÊTE DU BLOC NE NOMME QUE LES DEUX SIGLES, parce que ce sont les
    // seules cases qui tombent sous lui. Les quatre nombres vivent DEUX rangs
    // plus bas : leurs mots les suivent au lieu de flotter au-dessus d'autre
    // chose — un mot d'entête qui ne surplombe pas ce qu'il nomme ne sert à rien.
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "sp"));
    var teteTrio = el("span", "pc-trio deux tete");
    ["Carac", "Comp"].forEach(function (k) {
      var c = el("span", "c");
      c.appendChild(el("span", "k", k));
      teteTrio.appendChild(c);
    });
    tete.appendChild(teteTrio);
    b.appendChild(tete);

    var box = el("div");
    b.appendChild(box);

    // LE REGISTRE DES LIGNES, et le détour obligatoire : pousser directement
    // dans « hooks » empilerait à jamais les fonctions des cartes détruites,
    // chacune tenant une attaque que l'état ne porte plus.
    var lignes = [];
    hooks.push(function () {
      for (var i = 0; i < lignes.length; i++) lignes[i]();
    });

    function ligne(a, i) {
      var row = el("div", "pc-crow" + (i % 2 === 1 ? " odd" : ""));

      // ---- premier rang : le nom, et ce dont l'attaque relève ----
      var haut = el("div", "pc-crow-top");
      var nom = el("input", "nm pc-edit-field");
      nom.type = "text"; nom.placeholder = "Nom de l'attaque"; nom.value = a.nom || "";
      // UN NOM S'ENREGISTRE SANS RAFRAÎCHIR : rien ne se calcule à partir de
      // lui, et refresh() reconstruirait la liste sous les doigts.
      nom.addEventListener("input", function () { a.nom = nom.value; save(); });
      haut.appendChild(nom);
      var paire = el("span", "pc-trio deux");
      var vCar = attCase(paire), vCmp = attCase(paire);
      haut.appendChild(paire);
      row.appendChild(haut);

      // ---- deuxième rang : les mots des quatre nombres ----
      // ILS APPARTIENNENT À L'ATTAQUE, pas au bloc : ils se posent juste
      // au-dessus des nombres qu'ils nomment, et non deux rangs plus haut où
      // ils auraient coiffé les sigles.
      var mots = el("div", "pc-crow-top pc-att-mots");
      var motsTrio = el("span", "pc-trio cinq tete");
      ["Total", "Limite", "Bonus", "Dégâts"].forEach(function (k) {
        var c = el("span", "c");
        c.appendChild(el("span", "k", k));
        motsTrio.appendChild(c);
      });
      mots.appendChild(motsTrio);
      mots.appendChild(el("span", "sp"));
      row.appendChild(mots);

      // ---- troisième rang : les quatre nombres, et le bloc ENTIER lance ----
      // À GAUCHE, sous leurs mots : le nom et les sigles tiennent le rang du
      // haut et se rangent à droite ; les nombres ont le leur et commencent au
      // bord. Un ressort les aurait poussés sous les sigles, loin de leurs mots.
      var bas = el("div", "pc-crow-top");
      var quad = el("span", "pc-trio cinq pc-rollable");
      var vTot = attCase(quad), vLim = attCase(quad),
          vBon = attCase(quad), vDeg = attCase(quad);
      quad.addEventListener("click", function (e) {
        // ROUAGE OUVERT, ON CONSTRUIT : le bloc ne lance pas.
        if (isEdit("attaques")) return;
        var t = e.target && e.target.tagName;
        if (t === "INPUT" || t === "SELECT" || t === "OPTION") return;
        var n = attNombres(a);
        if (!n) { flash("Cette attaque ne dit pas de quelle spécialité elle tient."); return; }
        if (!n.carac) { flash("Sa spécialité ne dit pas de quelle caractéristique elle tient."); return; }
        // ON DEMANDE, PUIS ON ENVOIE — le même chemin que tous les autres jets.
        // demandeJet rend la caractéristique et la compétence retenues, et le
        // modificateur saisi ; les trois peuvent différer de ce que la ligne
        // affiche, et c'est tout le propre du réglage « au choix ».
        demandeJet(a.nom || "Attaque", n.carac, n.comp, n.spe, function (carac, comp, modif) {
          var m = attNombres(a, carac, comp);
          if (!m) return;
          if (!envoyer(attCarte(a, m, modif))) flash("Hors Roll20 : la carte ne peut pas partir.");
        });
      });
      bas.appendChild(quad);
      bas.appendChild(el("span", "sp"));
      row.appendChild(bas);

      // ---- ce qui se construit ----
      // LE MÊME GABARIT QUE LES AUTRES RANGÉES DE RÉGLAGE : « pc-pvmax » porte
      // déjà les libellés en petites capitales et les champs étroits.
      var reg = el("div", "pc-pvmax pc-att-reg pc-edit-only");
      var sel = el("select", "pc-edit-field");
      var neant = el("option", null, "—");
      neant.value = "";
      sel.appendChild(neant);
      // LA LISTE DES SPÉCIALITÉS, par leur NOM : c'est ce que le moteur sait
      // retrouver, et c'est ce que le joueur lit.
      (state.specialites || []).forEach(function (s) {
        var n = String(s.nom || "").trim();
        // NI « PV » NI « RÉCUP PV » : ce sont les deux spécialités du module
        // Vitalité, elles ne se lancent pas et n'attaquent personne.
        if (!n || speDeVitalite(s)) return;
        var o = el("option", null, n);
        o.value = n;
        sel.appendChild(o);
      });
      // LE NOM RANGÉ NE RÉPOND PLUS ? On le garde dans la liste plutôt que de
      // le laisser retomber sur « — » : effacer le choix du joueur parce qu'une
      // spécialité a été renommée serait pire que de le lui montrer.
      if (a.spe && !attSpe(a)) {
        var perdu = el("option", null, a.spe + " (introuvable)");
        perdu.value = a.spe;
        sel.appendChild(perdu);
      }
      sel.value = a.spe || "";
      sel.addEventListener("change", function () { a.spe = sel.value; refresh(); });
      reg.appendChild(el("span", "lbl", "Spécialité"));
      reg.appendChild(sel);
      reg.appendChild(el("span", "lbl", "Bonus"));
      reg.appendChild(attChamp(a, "bonus", -9999, 9999));
      reg.appendChild(el("span", "lbl", "Dégâts"));
      reg.appendChild(attChamp(a, "degats", 0, 9999));
      reg.appendChild(el("span", "sp"));
      reg.appendChild(miniBtn("✕", "Retirer cette attaque", function () {
        state.attaques.splice(i, 1);
        rendu();
        refresh();
      }, "danger"));
      row.appendChild(reg);

      lignes.push(function () {
        var n = attNombres(a);
        vCar.textContent = n && n.carac ? n.carac : "—";
        vCmp.textContent = n && n.comp ? n.comp : "—";
        vTot.textContent = n ? String(fmtP(n.total)) : "—";
        vLim.textContent = n ? String(fmtP(n.lim)) : "—";
        vBon.textContent = n ? sign(Math.round(n.bonus)) : "—";
        vDeg.textContent = String(pnum(a.degats));
        // le neutre se retire, comme partout ailleurs sur la feuille
        vBon.classList.toggle("zero", !!n && !Math.round(n.bonus));
        quad.title = n
          ? (a.nom || "Attaque") + " — clic : envoyer la carte au tchat"
          : "Choisir une spécialité pour cette attaque";
      });
      return row;
    }

    function rendu() {
      box.innerHTML = "";
      // les fonctions des cartes effacées n'ont plus rien à rafraîchir ; le
      // tableau est vidé SUR PLACE, celui du registre étant le même objet
      lignes.length = 0;
      state.attaques.forEach(function (a, i) { box.appendChild(ligne(a, i)); });
      if (!state.attaques.length) box.appendChild(el("div", "pc-empty", "Aucune attaque."));
      box.appendChild(miniBtn("+ Ajouter une attaque", null, function () {
        state.attaques.push({ nom: "", spe: "", bonus: 0, degats: 0 });
        rendu();
        refresh();
      }, "pc-edit-only"));
      // les cartes qui viennent de naître doivent obéir au verrou du bloc :
      // rien ne le leur dirait avant le prochain rafraîchissement
      applyEdit(b, "attaques");
      // ET ELLES DOIVENT ÊTRE REMPLIES. Les lignes naissent VIDES : leurs
      // nombres ne s'écrivent que dans la fonction poussée au registre, et ce
      // registre n'est joué que par refresh(). On rejoue ICI, jamais chez
      // l'appelant : un appelant peut oublier, une fin de rendu() ne le peut pas.
      for (var j = 0; j < lignes.length; j++) {
        try { lignes[j](); } catch (e) { /* la muselière juge à la passe suivante */ }
      }
    }

    rendu();
    return b;
  }
