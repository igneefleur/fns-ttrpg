  // ---------- la ligne d'une compétence ----------
  // MÊME CHARPENTE QU'UNE CARACTÉRISTIQUE (.pc-crow), et ce n'est pas une
  // économie de style : depuis que les stades ont disparu, les deux lignes
  // portent exactement les mêmes choses — un nombre qu'on achète, le MOD qui
  // s'y ajoute, la limite qui coiffe le jet, et le bloc lui-même comme bouton.
  // Deux charpentes pour un même contenu auraient fini par diverger d'un pixel,
  // puis d'une infobulle.
  //
  // opts : { reg } — le registre de rafraîchissement où la ligne s'inscrit,
  // celui du module qui la bâtit. Une ligne détruite emporte ses fonctions ;
  // laissées dans le registre du voisin, elles rafraîchiraient un élément qui
  // n'est plus dans la page. Par défaut : celui des lignes de compétences.
  function compRow(item, odd, opts) {
    opts = opts || {};
    var reg = opts.reg || compHooks;
    // Un appelant peut ne nommer sa ligne que par une clé (ctx.ligneComp d'un
    // mod) : ce sont les SIGLES que les calculs attendent, et allComps() les
    // donne dans « code ».
    var code = item.code || item.key;
    // La caractéristique par DÉFAUT : celle qui donne le MOD et la LIM du jet.
    // Le joueur peut en demander une autre au moment de lancer (réglage « Au
    // choix » de la barre d'envoi) ; c'est doJet qui le lui propose, pas la ligne.
    //
    // ELLE SE LIT VIVANTE, jamais figée au montage : l'onglet « Carac. » des
    // Options la change pour ce personnage, et rien ne rebâtit les lignes de
    // compétence — elles continuaient d'afficher le MOD et la LIM de l'ancienne
    // et de lancer sous elle, pendant que le bloc des Options montrait déjà la
    // nouvelle. Un appelant qui NOMME sa caractéristique (un mod) garde la
    // sienne : c'est un choix, pas un défaut.
    function carac() { return item.carac || compCarac(code); }
    var row = el("div", "pc-crow" + (odd ? " odd" : ""));

    var top = el("div", "pc-crow-top");
    var chip = el("span", "pc-abbr", code);
    chip.title = item.name;
    top.appendChild(chip);
    top.appendChild(el("span", "sp"));

    // LE TRIO EST LE BOUTON DE JET, d'un seul tenant : le total qui part au dé,
    // la limite qui le coiffe, le bonus qui s'y ajoute après. Aucun ne veut
    // rien dire sans les deux autres.
    var trio = el("span", "pc-trio pc-rollable");
    // TROIS CASES, ET CHACUNE DIT DEUX CHOSES : ce qu'on lit en jouant, ce
    // qu'on règle en construisant. Les deux valeurs sont écrites à chaque
    // rafraîchissement ; c'est la feuille qui n'en montre qu'une, selon l'état
    // du rouage.
    //
    // LES DEUX SAISIES SONT DANS LEUR PROPRE CASE. Le rang de construction qui
    // portait leurs ± sous la ligne a disparu avec : la ligne garde la même
    // hauteur, rouage ouvert ou fermé, et la même qu'une spécialité.
    var vVal = caseSaisie(trio,        // total au dé  /  points achetés
      function () { return state.comps[code] || 0; },
      function (v) {
        // le plafond ne bloque que les HAUSSES : des points investis avant
        // qu'un malus ne rabaisse la caractéristique redescendent pas à pas au
        // lieu d'être rognés d'un seul clic, ce qui rendrait l'xp introuvable
        // ET IL NE BLOQUE PLUS RIEN DÈS QU'UN LEVIER DE VALEUR S'INTERPOSE :
        // la coiffe tombe sur le RÉSULTAT de la chaîne, pas sur ce qu'on tape.
        var plaf = compPlafond(code);
        var n = Math.round(v);
        if (!levierRegleDe(lireComp("valeur", code))) {
          var haut = Math.max(plaf, state.comps[code] || 0);
          if (n > haut) { flash("Plafond de " + plaf + "."); n = haut; }
        }
        n = Math.max(0, n);
        // zéro n'est pas une donnée : une clé absente vaut zéro partout
        // (accesseurs, attributs Roll20), et l'état voyage d'autant plus léger
        if (n) state.comps[code] = n; else delete state.comps[code];
      }, "Points achetés", reg);
    var cLim = caseDouble(trio);       // limite du jet /  maximum qu'on peut mettre
    var vBon = caseSaisie(trio,        // le bonus, lu en jouant, réglé en construisant
      function () { return state.compsBonus[code] || 0; },
      function (v) {
        var n = clamp(Math.round(v), -999, 999);
        if (n) state.compsBonus[code] = n; else delete state.compsBonus[code];
      }, "Bonus de la compétence", reg);
    // rouage ouvert, on construit : le bloc ne lance pas (voir specialites.js)
    trio.addEventListener("click", function () {
      if (isEdit("comps")) return;
      doJet(code, carac(), code, null);
    });
    top.appendChild(trio);
    row.appendChild(top);

    // L'XP N'EST PLUS ÉCRITE SUR LA LIGNE. Elle prenait un rang entier sous les
    // nombres, uniquement en édition — donc une ligne qui changeait de hauteur
    // au clic du rouage. Ce qu'une compétence coûte se lit dans le total de
    // l'en-tête, qui avertit dès qu'il est dépassé.

    reg.push(function () {
      var base = state.comps[code] || 0;
      var plaf = compPlafond(code);
      var vBrut = compValeurBrut(code);
      // LE PLAFOND MORD SUR CE QUE LE LEVIER A PRODUIT, et non sur ce qui a été
      // acheté : « même modifiée, la valeur ne dépasse pas le plafond ».
      var mord = vBrut > plaf;
      // LE LEVIER SE LIT PAR SON RÉSULTAT, et non par une de ses neuf cases :
      // un facteur ou un ajout de fin décalent la valeur sans toucher à celle
      // qu'on lisait ici, et la pastille « retouché » restait éteinte.
      var d = vBrut - base;
      var force = lireComp("valeur", code)("force") !== undefined;
      // le malus d'endurance pèse sur TOUS les jets : il est déjà dans le
      // bonus, il n'est nommé ici que pour qu'on sache d'où vient l'écart
      var mal = enduranceMalus();
      var c = carac();
      var b = jetBonus(c, code, null);
      // LE TOTAL EST CELUI QUI PART AU DÉ, bonus EXCLU : le bonus a sa propre
      // case, et l'additionner ici le compterait deux fois. C'est la même
      // lecture que sur une spécialité — total, limite, bonus.
      // LE BONUS AFFICHÉ EST CELUI QUE SA CHAÎNE REND — le même que celui que
      // compPts a mis dedans, sans quoi la soustraction ci-dessous ne rendrait
      // ni le total du dé ni le total hors bonus.
      var bon = compBonus(code);
      var db = bon - compBonusSocle(code);
      vVal.txt.textContent = String(caracMod(c) + compPts(code) - bon);
      cLim[0].textContent = String(compLim(code, c));
      cLim[1].textContent = String(plaf);
      cLim[1].classList.toggle("adj", mord);
      // UNE VALEUR NEUTRE SE RETIRE. Un bonus de zéro ne dit rien : il occupe une
      // case parce que la colonne existe, pas parce qu'il a quelque chose à
      // annoncer. Grisé, il laisse le regard aux nombres qui, eux, pièsent.
      vBon.txt.textContent = sign(bon);
      vBon.txt.classList.toggle("zero", !bon);
      trio.classList.toggle("adj", force || d !== 0 || db !== 0 || mord || mal !== 0);
      trio.title = (force
                     ? "Points forcés à " + vBrut + " (Options)"
                     : "Points " + base +
                       (d ? " · modificateur (Options) " + sign(d) : "")) +
                   // LE PLAFOND SE DIT MÊME SUR UN FORÇAGE : il le rogne aussi,
                   // désormais, et taire la coiffe ferait disparaître des points
                   // sans un mot.
                   (mord ? ", plafonnés à " + plaf : "") +
                   (db ? " · bonus décalé de " + sign(db) + " (Options)" : "") +
                   (mal ? " · endurance " + sign(-mal) : "") +
                   " — clic : lancer " + deNu(deTest()) + " " + sign(b) +
                   ", plafonné à " + compLim(code, c);
    });
    return row;
  }
