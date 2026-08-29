  // ---------- les attaques ----------
  // UNE ATTAQUE N'EST PAS UN JET DE PLUS : c'est une CARTE de résolution. Le jet
  // ordinaire dit un nombre ; celle-ci dit, d'un coup, ce que l'attaque touche
  // et ce qu'elle coûte à chaque palier de défense. C'est pour cela qu'elle ne
  // passe pas par doJet() : sa carte n'a pas la forme d'un jet de test.
  //
  // QUATRE PARAMÈTRES, ET RIEN DE PLUS :
  //   nom       — ce qu'on lit sur le bouton et en tête de la carte ;
  //   spé       — la spécialité qui porte l'attaque, choisie dans la liste ;
  //   bonus     — ce qui S'AJOUTE au bonus de la spécialité, pour cette attaque
  //               seule (une arme, une posture) ;
  //   dégâts    — le nombre que les trois paliers divisent et multiplient.
  //
  // CE QUE LA FICHE CALCULE, ET QUE LA MACRO DEMANDAIT :
  //   ATT      = jetBonus(spé)      — ce que la LIMITE borne ;
  //   Lim Att  = limiteJet(spé)     — la limite elle-même ;
  //   Bonus    = jetBonusHors(spé) + le bonus de l'attaque, qui sort du groupe.
  // La macro écrite à la main posait trois questions pour ces trois nombres ;
  // la fiche les connaît, elle ne demande plus rien.
  //
  // LES TROIS PALIERS, tels que la macro les tient depuis toujours :
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

  // LA CARTE ENTIÈRE, prête à partir. Elle ne passe pas par cmdJetExpr(), qui
  // bâtit un gabarit à un seul champ : celle-ci en a quatre.
  function attCarte(a) {
    var spe = attSpe(a);
    var c = spe ? spe.carac : "", k = spe ? spe.comp : "";
    var att = spe ? jetBonus(c, k, spe) : 0;
    var lim = spe ? limiteJet(c, k, spe) : 0;
    // LE BONUS DE L'ATTAQUE S'AJOUTE À CELUI DE LA SPÉCIALITÉ, et les deux
    // sortent du groupe ensemble : c'est la règle du bonus, qui franchit la
    // limite au lieu d'être rogné par elle.
    var bonus = (spe ? jetBonusHors(c, k, spe) : 0) + pnum(a.bonus);
    var deg = pnum(a.degats);
    var groupe =
      "[[[[[[[[[[[[{" + deTest() + attSigne(att) + ",0d0+" + Math.round(lim) + "}dh1" +
      attSigne(bonus) + "]]-1]]-50]]-100]]+1]]+100]]";
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

  function buildAttaques() {
    var b = block("Attaques", null, "attaques");
    var box = el("div");
    b.appendChild(box);

    function rendu() {
      box.innerHTML = "";
      state.attaques.forEach(function (a, i) {
        var card = el("div", "pc-av");

        // ---- le rang qu'on lit en jouant : le nom, et le bouton ----
        var head = el("div", "pc-av-head");
        var n = el("input", "nm pc-edit-field");
        n.type = "text"; n.placeholder = "Nom de l'attaque"; n.value = a.nom || "";
        // UN NOM S'ENREGISTRE SANS RAFRAÎCHIR : rien ne se calcule à partir de
        // lui, et refresh() reconstruirait la liste sous les doigts.
        n.addEventListener("input", function () { a.nom = n.value; save(); });
        head.appendChild(n);
        head.appendChild(miniBtn("Lancer", "Envoyer la carte d'attaque au tchat Roll20",
                                 function () {
          if (!attSpe(a)) { flash("Aucune spécialité pour cette attaque."); return; }
          if (!envoyer(attCarte(a))) flash("Hors Roll20 : la carte ne peut pas partir.");
        }));
        head.appendChild(miniBtn("✕", "Retirer", function () {
          state.attaques.splice(i, 1);
          rendu();
          refresh();
        }, "danger pc-edit-only"));
        card.appendChild(head);

        // ---- ce qui se construit : les trois autres paramètres ----
        // LE MÊME GABARIT QUE LES AUTRES RANGÉES DE RÉGLAGE : « pc-pvmax » porte
        // déjà les libellés en petites capitales et les champs étroits. Ce module
        // n'ajoute que ce qui lui est propre — le retour à la ligne, et le
        // sélecteur, que les autres rangées n'ont pas.
        var reg = el("div", "pc-pvmax pc-att-reg pc-edit-only");

        var sel = el("select", "pc-edit-field");
        var neant = el("option", null, "—");
        neant.value = "";
        sel.appendChild(neant);
        // LA LISTE DES SPÉCIALITÉS, par leur NOM : c'est ce que le moteur sait
        // retrouver, et c'est ce que le joueur lit. Une spécialité sans nom
        // n'entre pas — on ne peut pas la désigner.
        (state.specialites || []).forEach(function (s) {
          var nom = String(s.nom || "").trim();
          // NI « PV » NI « RÉCUP PV » : ce sont les deux spécialités du module
          // Vitalité, elles ne se lancent pas et n'attaquent personne.
          if (!nom || speDeVitalite(s)) return;
          var o = el("option", null, nom);
          o.value = nom;
          sel.appendChild(o);
        });
        // LE NOM RANGÉ NE RÉPOND PLUS ? On le garde dans la liste plutôt que de
        // le laisser retomber sur « — » : effacer le choix du joueur parce
        // qu'une spécialité a été renommée serait pire que de le lui montrer.
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
        reg.appendChild(attChamp(function () { return a.bonus; },
                                 function (v) { a.bonus = v; }, -9999, 9999));
        reg.appendChild(el("span", "lbl", "Dégâts"));
        reg.appendChild(attChamp(function () { return a.degats; },
                                 function (v) { a.degats = v; }, 0, 9999));
        card.appendChild(reg);
        box.appendChild(card);
      });

      if (!state.attaques.length) box.appendChild(el("div", "pc-empty", "Aucune attaque."));
      box.appendChild(miniBtn("+ Ajouter une attaque", null, function () {
        state.attaques.push({ nom: "", spe: "", bonus: 0, degats: 0 });
        rendu();
        refresh();
      }, "pc-edit-only"));
      // les cartes qui viennent de naître doivent obéir au verrou du bloc :
      // rien ne le leur dirait avant le prochain rafraîchissement
      applyEdit(b, "attaques");
    }
    rendu();
    return b;
  }

  // Un petit champ de nombre, borné à la saisie comme partout ailleurs.
  //
  // IL NE POUSSE RIEN DANS LE REGISTRE, et c'est voulu. Les cartes se refont à
  // chaque ajout et à chaque retrait : un rafraîchissement poussé dans « hooks »
  // y resterait pour toujours, à écrire dans une carte que le DOM ne porte plus
  // — c'est le défaut qui a rendu muet le bloc des spécialités d'Options.
  // Rien ne le réclame ici : ces quatre nombres ne se calculent pas, ils se
  // saisissent, et la seule main qui les change est celle qui tape dedans.
  function attChamp(lire, ecrire, bas, haut) {
    var i = el("input", "force pc-edit-field");
    i.type = "number"; i.step = "1";
    i.value = pnum(lire());
    i.addEventListener("input", function () {
      var v = parseFloat(i.value);
      ecrire(isFinite(v) ? clamp(Math.round(v), bas, haut) : 0);
      // UN NOMBRE APPELLE refresh(), c'est la règle de la fiche — mais celui-ci
      // ne nourrit aucun affichage : save() suffit, et refresh() rendrait la
      // main à un registre qui ne connaît pas cette carte.
      save();
    });
    return i;
  }
