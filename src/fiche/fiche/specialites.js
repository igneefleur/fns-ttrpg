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
    // l'entête des trois colonnes, du même squelette que le trio des lignes :
    // c'est ce qui garantit que chaque mot tombe en face de sa colonne
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "sp"));
    var teteTrio = el("span", "pc-trio tete");
    ["Val", "Lim", "Bonus"].forEach(function (k) {
      var c = el("span", "c");
      c.appendChild(el("span", "k", k));
      teteTrio.appendChild(c);
    });
    tete.appendChild(teteTrio);
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

    // Un sélecteur de sigle. LE SIGLE EST LA VALEUR : c'est lui que l'état
    // garde et que les calculs lisent ; le nom entier n'est là que pour
    // choisir. La liste vient des règles, donc une caractéristique renommée
    // arrive ici sans qu'on rouvre ce fichier.
    function choixSigle(codes, nomDe, vide, lire, ecrire) {
      var s = el("select", "pc-select pc-edit-field");
      var neant = el("option", null, vide);
      neant.value = "";
      s.appendChild(neant);
      codes.forEach(function (c) {
        var o = el("option", null, c + " — " + nomDe(c));
        o.value = c;
        s.appendChild(o);
      });
      s.value = lire() || "";
      s.addEventListener("change", function () { ecrire(s.value); refresh(); });
      return s;
    }

    function ligne(it) {
      // la spécialité VIVANTE, et non l'objet capturé au montage : la liste
      // peut avoir bougé sous la ligne entre deux rendus
      var spe = it.spe;
      var row = el("div", "pc-crow");

      var top = el("div", "pc-crow-top");
      // le couple « caractéristique · compétence » tient la place du sigle
      // d'une caractéristique : c'est ce qu'on lit en premier pour savoir ce
      // que la ligne teste
      var chip = el("span", "pc-abbr", "");
      top.appendChild(chip);
      // LE NOM COMPTE POUR LES CALCULS : trois formules des règles vont
      // chercher une spécialité par son nom. Il se saisit donc tel quel, sans
      // capitale forcée ni correction, et l'infobulle dit lesquels sont lus.
      var nom = el("input", "nm pc-edit-field");
      nom.type = "text";
      nom.placeholder = "Nom de la spécialité";
      nom.value = spe.nom || "";
      nom.addEventListener("input", function () { spe.nom = nom.value; refresh(); });
      top.appendChild(nom);
      // LE MÊME TRIO QUE PARTOUT AILLEURS, et c'est le bloc ENTIER qui lance.
      // Ce que la caractéristique et la compétence apportent ne s'écrit PAS ici :
      // le sigle de gauche dit lesquelles, et leurs deux modules les portent déjà,
      // à deux colonnes de là. Restent les trois nombres qui n'appartiennent qu'à
      // la spécialité : ses points, la limite qui la coiffe, et son bonus.
      var quint = el("span", "pc-trio pc-rollable");
      function case5() {
        var c = el("span", "c");
        var v = el("span", "v", "");
        c.appendChild(v);
        quint.appendChild(c);
        return v;
      }
      var vPts = case5();
      var vLim = case5();
      var vBon = case5();
      quint.addEventListener("click", function () {
        // sans caractéristique, la limite vaut zéro et le jet ne rendrait
        // jamais que zéro : le dire vaut mieux que de le lancer
        if (!spe.carac) { flash("Cette spécialité ne dit pas de quelle caractéristique elle tient."); return; }
        doJet(spe.nom || "Spécialité", spe.carac, spe.comp, spe);
      });
      top.appendChild(quint);
      row.appendChild(top);

      var bot = el("div", "pc-crow-bot pc-edit-only");
      bot.appendChild(el("span", "lbl", "Carac"));
      bot.appendChild(choixSigle(champs(), function (c) { return caracInfo(c).nom; },
        "— caractéristique —",
        function () { return spe.carac; },
        function (v) { spe.carac = v; }));
      bot.appendChild(el("span", "lbl", "Compétence"));
      bot.appendChild(choixSigle(champsComp(), function (c) { return compInfo(c).nom; },
        "— compétence —",
        function () { return spe.comp; },
        function (v) { spe.comp = v; }));
      bot.appendChild(el("span", "lbl", "Points"));
      bot.appendChild(stepper(
        function () { return spe.pts || 0; },
        function (v) {
          // le plafond ne bloque que les HAUSSES, comme partout ailleurs : il
          // tient de la limite d'une caractéristique et du plafond d'une
          // compétence, qui bougent tous deux sous les pieds de la spécialité
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
        }, 1, "points", lignes));
      // LE BONUS : une valeur EN PLUS, qui part de zéro. Elle ne se déduit de
      // rien — ni des points, ni de la caractéristique, ni de la compétence —
      // et c'est pour cela qu'elle se saisit, au pas des modificateurs.
      bot.appendChild(el("span", "lbl", "Bonus"));
      bot.appendChild(stepper(
        function () { return spe.bonus || 0; },
        function (v) { spe.bonus = clamp(Math.round(v), -999, 999); },
        MOD_PAS, "bonus", lignes));
      bot.appendChild(el("span", "lbl", "Plafond"));
      var vPlaf = el("span", "max", "");
      vPlaf.style.justifySelf = "end";
      bot.appendChild(vPlaf);
      // LE COÛT EST NOMMÉ ICI, avec le reste de la construction : un point de
      // spécialité ne coûte pas un point d'xp, et on ne le regarde qu'en
      // achetant. En jouant, ce qu'on cherche est sur la ligne du haut.
      bot.appendChild(el("span", "lbl", "XP"));
      var vXp = el("span", "max", "");
      vXp.style.justifySelf = "end";
      bot.appendChild(vXp);
      // le retrait descend avec le reste : c'est un geste de construction, et
      // le laisser en haut décalait le quintuple d'une ligne à l'autre selon
      // que le rouage était ouvert ou fermé
      var sup = el("span");
      sup.style.gridColumn = "1 / -1";
      sup.style.justifySelf = "end";
      sup.appendChild(miniBtn("✕ Retirer", "Retirer cette spécialité", function () {
        // des points sont de l'xp dépensé : on ne les efface pas sur un clic
        // malheureux sans demander
        if (spe.pts &&
            !confirm("Retirer « " + (spe.nom || "sans nom") + " » et ses " + spe.pts + " points ?")) return;
        state.specialites.splice(it.index, 1);
        rendu();
        refresh();
        if (optCompsRebuild) optCompsRebuild();   // sa ligne quitte aussi le bloc des Options
      }, "danger"));
      bot.appendChild(sup);
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
        chip.textContent = (spe.carac || "—") + " · " + (spe.comp || "—");
        chip.title = (spe.carac ? caracInfo(spe.carac).nom : "aucune caractéristique") +
                     " · " + (spe.comp ? compInfo(spe.comp).nom : "aucune compétence");
        // LES TROIS CASES NE DISENT QUE LA SPÉCIALITÉ : ses points, sa limite,
        // son bonus. Ce que la caractéristique et la compétence apportent se lit
        // dans leurs propres modules, à deux colonnes de là ; le répéter ici
        // mettait quatre nombres sur la ligne pour n'en expliquer qu'un.
        vPts.textContent = String(spePts(spe));
        vLim.textContent = spe.carac ? String(lim) : "—";
        vBon.textContent = sign(spe.bonus || 0);
        quint.classList.toggle("adj", force || d !== 0 || mord || mal !== 0 || ch !== 0);
        quint.title = !spe.carac
          ? ""
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
        vPlaf.textContent = String(plaf);
        vPlaf.classList.toggle("adj", mord);
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

