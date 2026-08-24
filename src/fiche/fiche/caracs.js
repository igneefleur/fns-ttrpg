  // ---------- onglet Fiche : les caractéristiques ----------
  // LES HUIT, dans l'ordre de champs(), c'est-à-dire celui de la page de
  // règles. Aucune liste écrite en dur : une caractéristique renommée ou
  // déplacée dans les règles arrive ici sans qu'on rouvre ce fichier.
  //
  // LE PRESTIGE N'EST PAS ICI, et c'est délibéré : il n'est pas une
  // caractéristique, il les plafonne toutes. Il se saisit dans l'en-tête, à
  // côté de l'XP total — les deux mêmes choses, ce que le meneur accorde.
  function buildCaracs() {
    // jeu : la valeur, ses trois chiffres et son jet ; édition : les ± qui la
    // montent et la descendent, achat par achat
    var b = block("Caractéristiques", null, "caracs");

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
      // LA VALEUR EST LE BOUTON DE JET : le geste de cette fiche depuis
      // toujours est un chiffre qu'on clique, pas un bouton de plus posé à
      // côté d'un chiffre. doJet est le seul chemin d'un jet de test : il pose
      // le MOD, la limite et le malus d'endurance sans qu'on ait à y penser.
      var val = el("span", "pc-cval pc-rollable", "");
      val.addEventListener("click", function () { doJet(code, code, null, null); });
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

    // ---------- les huit, dans l'ordre des règles ----------
    champs().forEach(function (code) { b.appendChild(ligne(code)); });
    return b;
  }

