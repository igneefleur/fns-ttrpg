  // ---------- onglet Fiche : les caractéristiques ----------
  // LE PRESTIGE OUVRE LE MODULE, et ce n'est pas une question de goût : c'est
  // lui qui plafonne chacune des huit valeurs. Le lire après elles, ce serait
  // lire la conséquence avant la cause — un joueur bloqué à 5 ne saurait pas
  // où regarder.
  //
  // Les lignes se rangent par GROUPE, dans l'ordre de champs(), c'est-à-dire
  // l'ordre de la page de règles. Le titre d'un groupe est le mot des DONNÉES
  // lui-même : une famille renommée dans les règles arrive ici sans qu'on
  // rouvre ce fichier, et aucune liste écrite en dur ne peut en diverger.
  function buildCaracs() {
    // jeu : la valeur, ses trois chiffres et son jet ; édition : les ± qui la
    // montent et la descendent, achat par achat
    var b = block("Caractéristiques", null, "caracs");

    // ---------- le prestige ----------
    var pRow = el("div", "pc-kv");
    pRow.appendChild(el("span", "k", "Prestige"));
    // la valeur affichée est le prestige EFFECTIF (modificateur et forçage des
    // Options compris), le stepper règle la valeur ACHETÉE : c'est le même
    // partage que sur les caractéristiques en dessous, et il évite qu'un
    // prestige forcé se laisse « corriger » par un clic qui ne changerait rien.
    var pVal = el("span", "pc-cval", "");
    pRow.appendChild(pVal);
    var pStep = stepper(
      function () { return state.prestige || 0; },
      function (v) {
        var max = repli("prestigeMax");
        // le plancher se lit dans les règles quand elles sont là ; REPLI ne le
        // porte pas, et un undefined rendrait la borne inutile
        var min = repli("prestigeMin");
        if (typeof min !== "number") min = 0;
        // le plafond ne bloque que les HAUSSES : un prestige déjà au-delà
        // (règles corrigées sous les pieds d'une fiche déjà écrite) redescend
        // pas à pas au lieu d'être écrasé d'un seul clic
        var haut = Math.max(max, state.prestige || 0);
        var n = Math.round(v);
        if (n > haut) {
          flash(haut === max
            ? "Le prestige ne dépasse pas " + max + "."
            : "Le prestige est déjà au-delà de " + max + " : il ne peut que redescendre.");
          n = haut;
        }
        state.prestige = Math.max(min, n);
      }, 1, "prestige");
    pStep.classList.add("pc-edit-only");
    pRow.appendChild(pStep);
    pRow.appendChild(el("span", "sp"));
    var pMax = el("span", "max", "");
    pRow.appendChild(pMax);
    hooks.push(function () {
      var force = state.prestigeForce !== null && state.prestigeForce !== undefined;
      var d = state.prestigeMod || 0;
      pVal.textContent = String(prestige());
      pVal.classList.toggle("adj", force || d !== 0);
      pVal.title = (force
                     ? "Prestige forcé (Options) — calculé : " + prestigeAuto()
                     : (state.prestige || 0) +
                       (d ? " · modificateur (Options) " + sign(d) : "") +
                       " = " + prestige()) +
                   " — il plafonne chaque caractéristique.";
      pMax.textContent = "/ " + repli("prestigeMax");
    });
    b.appendChild(pRow);

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
      top.appendChild(el("span", "nm", info.nom));
      // LA VALEUR EST LE BOUTON DE JET : le geste de cette fiche depuis
      // toujours est un chiffre qu'on clique, pas un bouton de plus posé à
      // côté d'un chiffre. doJet est le seul chemin d'un jet de test : il pose
      // le MOD, la limite et le malus d'endurance sans qu'on ait à y penser.
      var val = el("span", "pc-cval pc-rollable", "");
      val.addEventListener("click", function () { doJet(info.nom, code, null, null); });
      top.appendChild(val);
      row.appendChild(top);

      // MOD, LIM et XP restent lisibles EN PERMANENCE, rouage fermé : ce sont
      // eux qu'on cherche en jouant, la valeur n'étant que ce qui les produit.
      var meta = el("div", "pc-kv");
      meta.appendChild(el("span", "k", "MOD"));
      var vMod = el("span", "max", "");
      meta.appendChild(vMod);
      meta.appendChild(el("span", "k", "LIM"));
      var vLim = el("span", "max", "");
      meta.appendChild(vLim);
      meta.appendChild(el("span", "sp"));
      meta.appendChild(el("span", "k", "XP"));
      var vXp = el("span", "max", "");
      meta.appendChild(vXp);
      row.appendChild(meta);

      // LES ± ACHÈTENT LA VALEUR, et rien ne les retient faute d'xp : l'en-tête
      // AVERTIT dès que le total est dépassé, là où un blocage figerait à zéro
      // toute fiche remplie à l'envers — les valeurs d'abord, l'xp total
      // ensuite. Le prestige, lui, borne pour de bon.
      var bot = el("div", "pc-crow-bot pc-edit-only");
      bot.appendChild(el("span", "lbl", "Valeur"));
      bot.appendChild(stepper(
        function () { return caracBase(code); },
        function (v) {
          // le plafond ne bloque que les HAUSSES : une valeur passée au-dessus
          // (prestige abaissé après coup, relèvement retiré des Options)
          // redescend pas à pas au lieu d'être écrasée d'un seul clic
          var plaf = caracPlafond(code);
          var haut = Math.max(plaf, caracBase(code));
          var n = Math.round(v);
          if (n > haut) {
            flash(haut === plaf
              ? "Plafond de " + plaf + " : le prestige plafonne " + code + "."
              : code + " est déjà au-delà du plafond (" + plaf + ") : il ne peut que redescendre.");
            n = haut;
          }
          state.caracs[code] = Math.max(0, n);
        }, 1, "valeur"));
      row.appendChild(bot);

      hooks.push(function () {
        var d = (state.caracsMod[code] || 0) + (state.caracsMod2[code] || 0);
        var force = state.caracsForce[code] !== undefined;
        var plaf = caracPlafond(code);
        var base = caracBase(code);
        var mord = base > plaf;
        var xpF = state.caracsXpForce[code] !== undefined;
        var xpD = (state.caracsXpMod[code] || 0) + (state.caracsXpMod2[code] || 0);
        val.textContent = String(caracTotal(code));
        val.classList.toggle("adj", force || d !== 0 || mord);
        // quand le plafond mord, l'écrire en clair (« plafonnée à 12 ») : sans
        // cela, le joueur voit un total qui ne correspond ni à ce qu'il a
        // acheté ni à ce qu'il a modifié, et rien ne dit pourquoi. Un total
        // forcé, lui, REMPLACE la somme : l'afficher quand même la ferait mentir.
        val.title = (force
                      ? "Total forcé (Options)"
                      : "Valeur " + base +
                        (mord ? ", plafonnée à " + plaf + " (prestige)" : "") +
                        (d ? " · modificateur (Options) " + sign(d) : "")) +
                    " = " + caracTotal(code) +
                    " — clic : lancer " + DE_DEFAUT + " " + sign(caracMod(code)) +
                    ", plafonné à " + caracLim(code);
        vMod.textContent = sign(caracMod(code));
        vMod.title = "Ce que " + code + " ajoute à ses jets.";
        vMod.classList.toggle("adj", force || d !== 0 || mord);
        vLim.textContent = String(caracLim(code));
        vLim.title = "Aucun jet de " + code + " ne dépasse ce résultat.";
        vLim.classList.toggle("adj", force || d !== 0 || mord);
        // l'XP se lit sur la valeur ACHETÉE, jamais sur le total : un
        // modificateur d'équipement ne se paie pas.
        vXp.textContent = String(caracXp(code));
        vXp.classList.toggle("adj", xpF || xpD !== 0);
        vXp.title = xpF
          ? "Coût forcé (Options) — calculé : " + caracXpAuto(code)
          : "XP cumulé de la valeur " + base + ", lu dans la table des règles" +
            (xpD ? " · modificateur (Options) " + sign(xpD) : "");
      });
      return row;
    }

    // ---------- les huit, groupées ----------
    var groupe = null;
    champs().forEach(function (code) {
      var g = caracInfo(code).groupe || "";
      if (g !== groupe) {
        groupe = g;
        // un intertitre discret, et non un bloc de plus : les familles se
        // lisent d'un coup d'œil sans couper le module en modules séparés,
        // qu'on pourrait déplacer l'un sans l'autre.
        if (g) b.appendChild(el("div", "pc-block-note", capFirst(g)));
      }
      b.appendChild(ligne(code));
    });
    return b;
  }

