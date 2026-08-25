  // ---------- onglet Fiche : les spécialités ----------
  // C'est la SEULE liste de la fiche que le joueur écrit entièrement. Les
  // règles disent ce qu'est une spécialité, ce qu'elle coûte et ce qui la
  // plafonne ; elles ne disent pas lesquelles existent. Le module ne propose
  // donc aucun catalogue : un nom libre, et deux sigles pour dire de quoi elle
  // relève.
  //
  // Les deux sélecteurs ne sont pas de l'ornement. La caractéristique donne le
  // MOD et la LIMITE du jet ; la compétence entre dans le plafond de points.
  // Tant qu'ils sont vides, la ligne ne vaut rien, et elle le MONTRE — un
  // « — · — » à la place des sigles — plutôt que d'afficher un zéro qu'on
  // prendrait pour un calcul.
  function buildSpecialites() {
    // jeu : les points, la limite et le jet ; édition : le nom, les deux
    // sigles, les ± et le retrait
    var b = block("Spécialités", null, "specialites");
    var box = el("div");
    // LE FILTRE VIT ICI. C'est la seule liste ouverte de la fiche : le joueur
    // la remplit lui-même, et elle est la seule à pouvoir devenir assez longue
    // pour qu'on s'y perde. rendu() est passée en avant-déclaration parce que
    // la case doit pouvoir la rappeler à chaque frappe.
    var tools = el("div", "pc-comp-tools");
    var line = el("div", "row");
    var search = champFiltre(function () { return speFilter; },
                             function (v) { speFilter = v; }, null,
                             function () { rendu(); });
    if (search) line.appendChild(search);
    tools.appendChild(line);
    if (search) b.appendChild(tools);
    // l'entête des cinq colonnes, du même squelette que le quintuple des
    // lignes : c'est ce qui garantit que chaque mot tombe en face de sa colonne
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "sp"));
    // DEUX COLONNES CHANGENT DE SENS SOUS LE ROUAGE, et leur intitulé avec :
    // en jouant on lit ce que la spécialité APPORTE au jet (le MOD de sa
    // caractéristique, les points de sa compétence) ; en construisant on lit ce
    // qui la BORNE et ce qu'elle vaut en tout. Deux mots dans la même case,
    // dont un seul s'affiche — c'est la feuille qui choisit, pas le code.
    function teteBloc(cls, mots) {
      var t = el("span", "pc-trio " + cls + " tete");
      mots.forEach(function (k) {
        var c = el("span", "c");
        if (typeof k === "string") c.appendChild(el("span", "k", k));
        else {
          c.appendChild(el("span", "k pc-jeu-only", k[0]));
          c.appendChild(el("span", "k pc-edit-only", k[1]));
        }
        t.appendChild(c);
      });
      tete.appendChild(t);
    }
    teteBloc("deux", ["Carac", "Comp"]);
    teteBloc("cinq", ["Val", ["Mod", "Plafond"], ["Comp", "Total"], "Lim", "Bonus"]);
    b.appendChild(tete);
    b.appendChild(box);
    // Les lignes sont détruites et refaites à chaque ajout ou retrait ; le
    // registre du module, lui, survit au geste. UNE SEULE fonction y entre, qui
    // rappelle celles des lignes du moment : sans ce détour, les
    // rafraîchissements des lignes effacées s'y empileraient, chacun tenant une
    // spécialité que l'état ne porte plus.
    var lignes = [];
    hooks.push(function () {
      for (var i = 0; i < lignes.length; i++) lignes[i]();
    });

    // LE SIGLE SE CHOISIT DANS SA PROPRE CASE. Il n'y a plus de ligne « Carac »
    // ni de ligne « Compétence » sous le rouage : la case qui MONTRE le sigle
    // est celle qui le CHANGE, et deux lignes de moins rendent le bloc lisible.
    // LE SIGLE EST LA VALEUR : c'est lui que l'état garde et que les calculs
    // lisent. Le nom entier ne s'écrit pas dans la liste — il tiendrait mal
    // dans une case, et le sigle suffit — mais il reste en infobulle de chaque
    // choix. La liste vient des règles : une caractéristique renommée arrive
    // ici sans qu'on rouvre ce fichier.
    function caseSigle(hote, codes, nomDe, lire, ecrire) {
      var c = el("span", "c reglable");
      var s = el("select", "v pc-case-champ pc-edit-field");
      var neant = el("option", null, "—");
      neant.value = "";
      s.appendChild(neant);
      codes.forEach(function (code) {
        var o = el("option", null, code);
        o.value = code;
        o.title = nomDe(code);
        s.appendChild(o);
      });
      s.addEventListener("change", function () { ecrire(s.value); refresh(); });
      c.appendChild(s);
      hote.appendChild(c);
      return s;
    }
    // Un nombre qui se saisit dans sa case. Le champ ne se réécrit JAMAIS sous
    // les doigts : tant qu'il a le focus, ce qu'on tape reste tel quel.
    function caseNombre(hote, lire, ecrire, aide) {
      var c = el("span", "c reglable");
      // EN JOUANT, UN TEXTE ; EN CONSTRUISANT, UN CHAMP. Un champ de type
      // nombre ne sait pas écrire « +25 » et porte des compteurs que Roll20
      // n'a nulle part : la lecture garde donc sa mise en forme, et seule
      // l'édition montre le champ.
      var t = el("span", "v pc-jeu-only", "");
      var i = el("input", "v pc-edit-only pc-case-champ pc-edit-field");
      i.type = "number"; i.step = "1";
      i.title = aide;
      i.addEventListener("input", function () {
        var v = parseInt(i.value, 10);
        if (isFinite(v)) { ecrire(v); refresh(); }
      });
      c.appendChild(t);
      c.appendChild(i);
      hote.appendChild(c);
      return { txt: t, champ: i };
    }

    function ligne(it) {
      // la spécialité VIVANTE, et non l'objet capturé au montage : la liste
      // peut avoir bougé sous la ligne entre deux rendus
      var spe = it.spe;
      var row = el("div", "pc-crow");

      var top = el("div", "pc-crow-top");
      // AUCUN SIGLE À GAUCHE. Le couple « caractéristique · compétence » y
      // tenait la place qu'un sigle occupe sur une caractéristique — mais ici
      // il ne nommait pas la ligne, il répétait ce que les colonnes MOD et
      // COMP chiffrent déjà. Le nom de la spécialité commence donc la ligne.
      // Quelles caractéristique et compétence elle tient se règle sous le
      // rouage, et se relit dans l'infobulle du bloc de nombres.
      // LE NOM COMPTE POUR LES CALCULS : trois formules des règles vont
      // chercher une spécialité par son nom. Il se saisit donc tel quel, sans
      // capitale forcée ni correction, et l'infobulle dit lesquels sont lus.
      var nom = el("input", "nm pc-edit-field");
      nom.type = "text";
      nom.placeholder = "Nom de la spécialité";
      nom.value = spe.nom || "";
      nom.addEventListener("input", function () { spe.nom = nom.value; refresh(); });
      top.appendChild(nom);
      // LE COUPLE DES SIGLES, dans la même case que les nombres qui suivent.
      // Il dit de quoi la spécialité relève, et sous le rouage c'est LUI qui le
      // règle : chaque case est son propre sélecteur.
      var paire = el("span", "pc-trio deux");
      var selCar = caseSigle(paire, champs(), function (c) { return caracInfo(c).nom; },
                             function () { return spe.carac; },
                             function (v) { spe.carac = v; });
      var selCmp = caseSigle(paire, champsComp(), function (c) { return compInfo(c).nom; },
                             function () { return spe.comp; },
                             function (v) { spe.comp = v; });
      top.appendChild(paire);

      // LES CINQ NOMBRES D'UN SEUL TENANT, et c'est le bloc ENTIER qui lance.
      // Une spécialité en demande deux de plus qu'une compétence, et les deux se
      // méritent : ses propres points ne font pas seuls le jet — le MOD de sa
      // caractéristique et les points de sa compétence y entrent aussi, et ce
      // sont eux qui disent d'où elle tient.
      var quint = el("span", "pc-trio cinq pc-rollable");
      function case5() {
        var c = el("span", "c");
        var v = el("span", "v", "");
        c.appendChild(v);
        quint.appendChild(c);
        return v;
      }
      // Une case qui dit une chose en jouant et une autre en construisant. Les
      // deux valeurs sont écrites à chaque rafraîchissement ; c'est la feuille
      // qui n'en montre qu'une, selon l'état du rouage.
      function case5double() {
        var c = el("span", "c");
        var a = el("span", "v pc-jeu-only", "");
        var b2 = el("span", "v pc-edit-only", "");
        c.appendChild(a); c.appendChild(b2);
        quint.appendChild(c);
        return [a, b2];
      }
      // LES POINTS SE SAISISSENT DANS LEUR CASE. Le plafond ne bloque que les
      // HAUSSES : des points acquis avant qu'un malus ne rabaisse la
      // caractéristique redescendent pas à pas au lieu d'être rognés d'un coup.
      var vPts = caseNombre(quint,
        function () { return spe.pts || 0; },
        function (v) {
          var plaf = spePlafond(spe);
          var haut = Math.max(plaf, spe.pts || 0);
          var n = Math.round(v);
          if (n > haut) {
            flash(haut === plaf
              ? "Plafond de " + plaf + "."
              : "Cette spécialité est déjà au-delà de son plafond (" + plaf + ") : elle ne peut que redescendre.");
            n = haut;
          }
          spe.pts = Math.max(0, n);
        }, "Points de la spécialité");
      var cMod = case5double();
      var cComp = case5double();
      var vLim = case5();
      // LE BONUS aussi : une valeur EN PLUS, qui part de zéro, que rien ne
      // déduit — et qui se saisit donc là où elle se lit.
      var vBon = caseNombre(quint,
        function () { return spe.bonus || 0; },
        function (v) { spe.bonus = clamp(Math.round(v), -999, 999); },
        "Bonus de la spécialité");
      quint.addEventListener("click", function (e) {
        // ROUAGE OUVERT, ON CONSTRUIT : le bloc ne lance pas. Il porte
        // maintenant des champs, et un clic à côté de l'un d'eux enverrait un
        // jet au tchat sans qu'on l'ait voulu.
        if (isEdit("specialites")) return;
        // un clic DANS un champ édite, il ne lance pas. Hors édition les champs
        // sont inertes (pointer-events: none) et le clic revient bien au bloc.
        var t = e.target && e.target.tagName;
        if (t === "INPUT" || t === "SELECT" || t === "OPTION") return;
        // sans caractéristique, la limite vaut zéro et le jet ne rendrait
        // jamais que zéro : le dire vaut mieux que de le lancer
        if (!spe.carac) { flash("Cette spécialité ne dit pas de quelle caractéristique elle tient."); return; }
        doJet(spe.nom || "Spécialité", spe.carac, spe.comp, spe);
      });
      top.appendChild(quint);
      row.appendChild(top);

      // QUATRE LIGNES DE MOINS. La caractéristique, la compétence, les points
      // et le bonus se règlent maintenant DANS leur case, et le plafond s'y
      // lit ; ce rang ne garde que ce qu'aucune case ne peut porter.
      var bot = el("div", "pc-crow-bot pc-edit-only");
      // LE COÛT EST NOMMÉ ICI, avec le reste de la construction : un point de
      // spécialité ne coûte pas un point d'xp, et on ne le regarde qu'en
      // achetant. En jouant, ce qu'on cherche est sur la ligne du haut.
      bot.appendChild(el("span", "lbl", "XP"));
      var vXp = el("span", "max", "");
      bot.appendChild(vXp);
      // le retrait descend avec le reste : c'est un geste de construction, et
      // le laisser en haut décalait le quintuple d'une ligne à l'autre selon
      // que le rouage était ouvert ou fermé
      bot.appendChild(miniBtn("✕ Retirer", "Retirer cette spécialité", function () {
        // des points sont de l'xp dépensé : on ne les efface pas sur un clic
        // malheureux sans demander
        if (spe.pts &&
            !confirm("Retirer « " + (spe.nom || "sans nom") + " » et ses " + spe.pts + " points ?")) return;
        state.specialites.splice(it.index, 1);
        rendu();
        refresh();
        if (optCompsRebuild) optCompsRebuild();   // sa ligne quitte aussi le bloc des Options
      }, "danger"));
      row.appendChild(bot);

      lignes.push(function () {
        var plaf = spePlafond(spe);
        var mord = (spe.pts || 0) > plaf;
        var d = (spe.mod || 0) + (spe.mod2 || 0);
        var force = spe.force !== null && spe.force !== undefined;
        var xpF = spe.xpForce !== null && spe.xpForce !== undefined;
        var mal = enduranceMalus();
        // la charge ne mord que sur l'esquive, et l'esquive est une spécialité :
        // un −100 apparu sans être nommé passerait pour une faute de calcul
        var ch = speMalusCharge(spe);
        var lim = spe.carac ? caracLim(spe.carac) : 0;
        var bonus = jetBonus(spe.carac, spe.comp, spe);
        // UN CHAMP NE SE RÉÉCRIT JAMAIS SOUS LES DOIGTS : tant qu'il a le
        // focus, ce qu'on tape y reste tel quel.
        if (document.activeElement !== selCar) selCar.value = spe.carac || "";
        if (document.activeElement !== selCmp) selCmp.value = spe.comp || "";
        paire.title = (spe.carac ? caracInfo(spe.carac).nom : "aucune caractéristique") +
                      " · " + (spe.comp ? compInfo(spe.comp).nom : "aucune compétence");
        // LES CINQ CASES, dans l'ordre où la phrase se compose : ce que la
        // spécialité vaut à elle seule, ce que sa caractéristique y ajoute, ce
        // que sa compétence y ajoute, ce qui coiffe le résultat, et le bonus
        // qu'on lui a posé.
        //
        // DEUX D'ENTRE ELLES CHANGENT DE SENS SOUS LE ROUAGE. En jouant on lit
        // ce que la spécialité APPORTE au jet ; en construisant, ce qui la
        // BORNE (son plafond) et ce qu'elle vaut EN TOUT (val + mod + comp).
        // Les quatre valeurs sont écrites à chaque fois : c'est la feuille qui
        // n'en montre que deux.
        var modC = spe.carac ? caracMod(spe.carac) : 0;
        var compC = spe.comp ? compPts(spe.comp) : 0;
        vPts.txt.textContent = String(spePts(spe));
        if (document.activeElement !== vPts.champ) vPts.champ.value = spe.pts || 0;
        cMod[0].textContent = spe.carac ? sign(modC) : "—";
        cMod[1].textContent = String(plaf);
        cMod[1].classList.toggle("adj", mord);
        cComp[0].textContent = spe.comp ? sign(compC) : "—";
        cComp[1].textContent = sign(spePts(spe) + modC + compC);
        vLim.textContent = spe.carac ? String(lim) : "—";
        vBon.txt.textContent = sign(spe.bonus || 0);
        if (document.activeElement !== vBon.champ) vBon.champ.value = spe.bonus || 0;
        quint.classList.toggle("adj", force || d !== 0 || mord || mal !== 0 || ch !== 0);
        quint.title = !spe.carac
          ? "Cette spécialité ne dit pas de quelle caractéristique elle tient."
          : (force
               ? "Points forcés (Options)"
               : "Points " + (spe.pts || 0) +
                 (mord ? ", plafonnés à " + plaf : "") +
                 (d ? " · modificateur (Options) " + sign(d) : "")) +
            " · " + spe.carac + " " + sign(caracMod(spe.carac)) +
            (spe.comp ? " · " + spe.comp + " " + sign(compPts(spe.comp)) : "") +
            ((spe.bonus || 0) ? " · bonus " + sign(spe.bonus) : "") +
            (ch ? " · charge " + sign(ch) : "") +
            (mal ? " · endurance " + sign(-mal) : "") +
            " — clic : lancer " + DE_DEFAUT + " " + sign(bonus) +
            ", plafonné à " + lim;
        vXp.textContent = String(speXp(spe));
        vXp.classList.toggle("adj", xpF);
        vXp.title = xpF ? "Coût forcé (Options)" : "";
      });
      return row;
    }

    function rendu() {
      box.innerHTML = "";
      // les fonctions des lignes effacées n'ont plus rien à rafraîchir ; le
      // tableau est vidé SUR PLACE, celui du registre étant le même objet
      lignes.length = 0;
      var flt = filtreDe(speFilter);
      var items = allSpes();
      if (flt) items = items.filter(function (it) {
        return it.name.toLowerCase().indexOf(flt) >= 0;
      });
      items.forEach(function (it) { box.appendChild(ligne(it)); });
      if (!items.length) box.appendChild(el("div", "pc-empty", "—"));
      box.appendChild(miniBtn("+ Ajouter une spécialité", null, function () {
        state.specialites.push(blankSpe());
        rendu();
        refresh();
        if (optCompsRebuild) optCompsRebuild();   // la nouvelle gagne sa ligne dans Options
      }, "pc-edit-only"));
      // les lignes qui viennent de naître doivent obéir au verrou du bloc :
      // rien ne le leur dirait avant le prochain rafraîchissement
      applyEdit(b, "specialites");
    }
    rendu();
    return b;
  }

