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
    // EN JOUANT, TROIS NOMBRES ; SOUS LE ROUAGE, CINQ. Ce qu'on lit en jouant,
    // c'est ce que la spécialité VAUT (total), ce qui la coiffe (limite) et ce
    // qu'on lui a posé (bonus). Le détail — ses points propres, son plafond —
    // n'intéresse qu'au moment de l'acheter, et n'apparaît qu'alors.
    // « Lim » et non « Limite » : les caractéristiques et les compétences
    // écrivent « LIM », et trois listes qui nomment la même chose de deux
    // façons se lisent moins bien qu'une abréviation.
    function teteBloc(cls, mots) {
      var t = el("span", "pc-trio " + cls + " tete");
      mots.forEach(function (k) {
        var edit = typeof k !== "string";
        var c = el("span", "c" + (edit ? " pc-edit-only" : ""));
        c.appendChild(el("span", "k", edit ? k[0] : k));
        t.appendChild(c);
      });
      tete.appendChild(t);
    }
    teteBloc("deux", ["Carac", "Comp"]);
    teteBloc("cinq", [["Val"], ["Plafond"], "Total", "Lim", "Bonus"]);
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

    // LE RANGEMENT AU GLISSER-DÉPOSER. C'est la seule liste de la fiche dont
    // l'ORDRE appartient au joueur : les caractéristiques et les compétences
    // suivent celui des règles, les spécialités suivent celui qu'il leur donne.
    // Glisser-déposer natif du navigateur, comme le plan des modules : aucune
    // bibliothèque, et ça marche tel quel dans l'iframe Roll20.
    // « pris » porte l'index dans l'ÉTAT, jamais le rang à l'écran : la liste
    // peut être filtrée, et un rang d'écran ne dirait alors pas où ranger.
    var pris = null;
    function eteintDepot() {
      var l = box.querySelectorAll(".pc-crow");
      for (var i = 0; i < l.length; i++) {
        l[i].classList.remove("avant");
        l[i].classList.remove("apres");
      }
    }

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
    function caseNombre(hote, lire, ecrire, aide, cls) {
      var c = el("span", "c reglable" + (cls ? " " + cls : ""));
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
      // LA CROIX D'ABORD, TOUT À GAUCHE : c'est le geste qu'on cherche des yeux
      // quand on veut retirer une ligne, et il n'a pas à se chercher au bout.
      // Un point d'arrêt de plus le protège : des points sont de l'xp dépensé.
      top.appendChild(miniBtn("✕", "Retirer cette spécialité", function () {
        if (spe.pts &&
            !confirm("Retirer « " + (spe.nom || "sans nom") + " » et ses " + spe.pts + " points ?")) return;
        state.specialites.splice(it.index, 1);
        rendu();
        refresh();
        if (optCompsRebuild) optCompsRebuild();   // sa ligne quitte aussi le bloc des Options
      }, "danger pc-croix pc-edit-only"));
      // LA POIGNÉE. Elle seule se glisse — pas la ligne entière : le nom est un
      // champ de saisie, et une ligne « draggable » interdirait d'y sélectionner
      // un mot à la souris.
      var poignee = el("span", "pc-poignee pc-edit-only");
      poignee.title = "Glisser pour ranger cette spécialité";
      poignee.draggable = true;
      poignee.addEventListener("dragstart", function (ev) {
        pris = it.index;
        row.classList.add("pris");
        try {
          ev.dataTransfer.effectAllowed = "move";
          // Firefox refuse de commencer un glissement sans donnée posée
          ev.dataTransfer.setData("text/plain", String(it.index));
          if (ev.dataTransfer.setDragImage) ev.dataTransfer.setDragImage(row, 16, 12);
        } catch (e) {}
      });
      poignee.addEventListener("dragend", function () {
        pris = null;
        row.classList.remove("pris");
        eteintDepot();
      });
      top.appendChild(poignee);
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
      function case5(cls) {
        var c = el("span", "c" + (cls ? " " + cls : ""));
        var v = el("span", "v", "");
        c.appendChild(v);
        quint.appendChild(c);
        return v;
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
        }, "Points de la spécialité", "pc-edit-only");
      var vPlaf = case5("pc-edit-only");
      var vTot = case5();
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

      // La MOITIÉ survolée décide : au-dessus, la ligne prise se pose avant ;
      // en dessous, après. Le liseré le montre pendant qu'on tient.
      function moitieBasse(ev) {
        var r = row.getBoundingClientRect();
        return ev.clientY >= r.top + r.height / 2;
      }
      row.addEventListener("dragover", function (ev) {
        if (pris === null || pris === it.index) return;
        ev.preventDefault();            // sans ça, le navigateur refuse le dépôt
        try { ev.dataTransfer.dropEffect = "move"; } catch (e) {}
        eteintDepot();
        row.classList.add(moitieBasse(ev) ? "apres" : "avant");
      });
      row.addEventListener("dragleave", function (ev) {
        if (ev.target === row) { row.classList.remove("avant"); row.classList.remove("apres"); }
      });
      row.addEventListener("drop", function (ev) {
        ev.preventDefault();
        var src = pris;
        if (src === null) {
          try { src = parseInt(ev.dataTransfer.getData("text/plain"), 10); } catch (e) { src = NaN; }
        }
        eteintDepot();
        if (!isFinite(src) || src === it.index) return;
        var cible = it.index + (moitieBasse(ev) ? 1 : 0);
        var l = state.specialites;
        var obj = l.splice(src, 1)[0];
        if (!obj) return;
        // le retrait a décalé tout ce qui suivait : la cible avec, si elle était
        // après la source
        if (src < cible) cible--;
        l.splice(clamp(cible, 0, l.length), 0, obj);
        rendu();
        refresh();
        if (optCompsRebuild) optCompsRebuild();   // l'ordre du bloc des Options suit
      });

      // PLUS DE RANG DE CONSTRUCTION. Tout s'y est vidé : les quatre réglages
      // sont passés dans leurs cases, le retrait est monté à gauche de la
      // ligne, et le coût en xp en est retiré — on le lit au compteur de
      // l'en-tête et, ligne par ligne, dans le bloc des Options.

      lignes.push(function () {
        var plaf = spePlafond(spe);
        var mord = (spe.pts || 0) > plaf;
        var d = (spe.mod || 0) + (spe.mod2 || 0);
        var force = spe.force !== null && spe.force !== undefined;
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
        vPlaf.textContent = String(plaf);
        vPlaf.classList.toggle("adj", mord);
        // LE TOTAL : ce que la spécialité vaut en tout, ses points plus ce que
        // sa caractéristique et sa compétence y ajoutent.
        //
        // SANS SIGNE. Ce n'est pas un terme qu'on ajoute à quelque chose — c'est
        // une valeur, comme la limite à côté. Le « + » ne se met qu'à ce qui
        // s'ajoute : le MOD d'une caractéristique, le bonus. Le signe moins
        // reste typographique si un modificateur des Options passe le total
        // sous zéro.
        var tot = spePts(spe) + modC + compC;
        vTot.textContent = spe.carac ? String(tot).replace("-", "−") : "—";
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

