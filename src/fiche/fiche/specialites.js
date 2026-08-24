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
      nom.title = "Le nom est lu par les règles : « PV » s'ajoute aux points de vie, " +
                  "« Récupération » et « Esquive » sont reprises par leurs formules.";
      nom.value = spe.nom || "";
      nom.addEventListener("input", function () { spe.nom = nom.value; refresh(); });
      top.appendChild(nom);
      var val = el("span", "pc-cval pc-rollable", "");
      val.addEventListener("click", function () {
        // sans caractéristique, la limite vaut zéro et le jet ne rendrait
        // jamais que zéro : le dire vaut mieux que de le lancer
        if (!spe.carac) { flash("Cette spécialité ne dit pas de quelle caractéristique elle tient."); return; }
        doJet(spe.nom || "Spécialité", spe.carac, spe.comp, spe);
      });
      top.appendChild(val);
      top.appendChild(miniBtn("✕", "Retirer cette spécialité", function () {
        // des points sont de l'xp dépensé : on ne les efface pas sur un clic
        // malheureux sans demander
        if (spe.pts &&
            !confirm("Retirer « " + (spe.nom || "sans nom") + " » et ses " + spe.pts + " points ?")) return;
        state.specialites.splice(it.index, 1);
        rendu();
        refresh();
        if (optCompsRebuild) optCompsRebuild();   // sa ligne quitte aussi le bloc des Options
      }, "danger pc-edit-only"));
      row.appendChild(top);

      // PTS, LIM et XP restent lisibles rouage fermé, comme sur une
      // caractéristique : le coût est nommé ici parce qu'un point de
      // spécialité ne coûte pas un point d'xp, et qu'on l'oublierait.
      var meta = el("div", "pc-kv");
      meta.appendChild(el("span", "k", "PTS"));
      var vPts = el("span", "max", "");
      meta.appendChild(vPts);
      meta.appendChild(el("span", "k", "LIM"));
      var vLim = el("span", "max", "");
      meta.appendChild(vLim);
      meta.appendChild(el("span", "sp"));
      meta.appendChild(el("span", "k", "XP"));
      var vXp = el("span", "max", "");
      meta.appendChild(vXp);
      row.appendChild(meta);

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
              ? "Plafond de " + plaf + " : la limite de la caractéristique et le plafond de la compétence le fixent."
              : "Cette spécialité est déjà au-delà de son plafond (" + plaf + ") : elle ne peut que redescendre.");
            n = haut;
          }
          spe.pts = Math.max(0, n);
        }, 1, "points", lignes));
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
        val.textContent = spe.carac ? sign(bonus) : "—";
        val.classList.toggle("adj", force || d !== 0 || mord || mal !== 0 || ch !== 0);
        val.title = !spe.carac
          ? "Choisir une caractéristique (rouage) : c'est elle qui donne le MOD et la limite du jet."
          : (force
               ? "Points forcés (Options)"
               : "Points " + (spe.pts || 0) +
                 (mord ? ", plafonnés à " + plaf : "") +
                 (d ? " · modificateur (Options) " + sign(d) : "")) +
            " · " + spe.carac + " " + sign(caracMod(spe.carac)) +
            (spe.comp ? " · " + spe.comp + " " + sign(compPts(spe.comp)) : "") +
            (ch ? " · charge " + sign(ch) : "") +
            (mal ? " · endurance " + sign(-mal) : "") +
            " — clic : lancer " + DE_DEFAUT + " " + sign(bonus) +
            ", plafonné à " + lim;
        vPts.textContent = spePts(spe) + " / " + plaf;
        vPts.classList.toggle("adj", force || d !== 0 || mord);
        vPts.title = "Points investis, et leur plafond : la limite de la caractéristique, " +
                     "moins ce que le MOD et la compétence prennent déjà.";
        vLim.textContent = spe.carac ? String(lim) : "—";
        vLim.title = spe.carac
          ? "Aucun jet de cette spécialité ne dépasse ce résultat."
          : "Sans caractéristique, la spécialité n'a pas de limite à opposer.";
        vXp.textContent = String(speXp(spe));
        vXp.classList.toggle("adj", xpF);
        vXp.title = xpF
          ? "Coût forcé (Options)"
          : "Un point de spécialité coûte " + repli("xpSpe") + " xp.";
      });
      return row;
    }

    function rendu() {
      box.innerHTML = "";
      // les fonctions des lignes effacées n'ont plus rien à rafraîchir ; le
      // tableau est vidé SUR PLACE, celui du registre étant le même objet
      lignes.length = 0;
      allSpes().forEach(function (it) { box.appendChild(ligne(it)); });
      if (!state.specialites.length)
        box.appendChild(el("div", "pc-empty", "Aucune spécialité."));
      // LES QUATRE NOMS QUE LES FORMULES APPELLENT. Aucune spécialité n'est
      // proposée d'office — chacun crée les siennes — mais quatre sont lues PAR
      // LEUR NOM : les PV en ajoutent une, la récupération en EST une,
      // l'obstination en lance une, la charge en pénalise une. Écrit autrement,
      // le nom ne répond pas, et rien à l'écran ne le dirait. On les rappelle
      // donc ici, et on marque celles qui manquent encore.
      var nommees = regles().speNommees || [];
      if (nommees.length) {
        var absentes = nommees.filter(function (n) { return !speParNom(n); });
        var note = el("div", "pc-block-note");
        note.textContent = "Noms lus par les règles : " + nommees.join(", ") +
          (absentes.length ? " — manquent : " + absentes.join(", ") : " — toutes présentes");
        note.title = "Ces spécialités-là ne comptent que si leur nom est écrit exactement ainsi.";
        box.appendChild(note);
      }
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

