  // ---------- onglet Fiche : caractéristiques + combat | compétences ----------
  function buildCaracs() {
    // jeu : le total et son jet ; édition : les steppers Création / Achats xp
    var b = block("Caractéristiques", null, "caracs");
    // même ordre que les compétences : Body, puis Mind, puis Prestance
    CHAMPS.forEach(function (name) {
      if (!DATA.caracs.some(function (cc) { return cc.name === name; })) return;
      var row = el("div", "pc-crow");
      var top = el("div", "pc-crow-top");
      var chip = el("span", "pc-abbr", ABBR[name] || name);
      chip.title = name;
      top.appendChild(chip);
      // la ligne du nom porte aussi le malus de poids : elle est mise à jour au
      // rafraîchissement, d'où la référence gardée
      var nm = el("span", "nm", name);
      top.appendChild(nm);
      var val = el("span", "pc-cval pc-rollable", "");
      // caracJet, pas caracTotal : ce bouton LANCE la caractéristique, et c'est
      // caracJet qui dit ce que vaut un jet direct (la charge n'y pèse plus)
      val.addEventListener("click", function () { doRoll(name, caracJet(name), null, true); });
      top.appendChild(val);
      row.appendChild(top);

      var bot = el("div", "pc-crow-bot pc-edit-only");
      bot.appendChild(el("span", "lbl", "Création"));
      bot.appendChild(stepper(
        function () { return state.caracsBase[name]; },
        function (v) {
          // le plafond ne bloque que les HAUSSES : une base montée au-dessus
          // du plafond (abaissé ensuite dans les Options) redescend pas à pas,
          // sans être écrasée au plafond par un simple clic
          var plaf = caracPlafond(name);
          var max = Math.max(plaf, state.caracsBase[name]);
          var val2 = clamp(v, 0, 9999);
          if (val2 > max) { flash("Plafond de " + plaf + " atteint (Options, bloc Création)."); val2 = max; }
          state.caracsBase[name] = val2;
        }, CARAC_PAS, "création"));
      bot.appendChild(el("span", "lbl", "Achats xp"));
      var xpStep = el("span", "pc-step");
      xpStep.appendChild(stepBtn("−", "Rendre " + DATA.xpParStade + " xp", function () {
        if (state.caracsXp[name] > 0) { state.caracsXp[name]--; refresh(); }
      }));
      var cnt = el("span", "v", "");
      xpStep.appendChild(cnt);
      xpStep.appendChild(stepBtn("+", "Dépenser " + DATA.xpParStade + " xp", function () {
        if (xpRestant() < DATA.xpParStade) { flash("XP insuffisant."); return; }
        // le plafond porte sur base + achats, SANS le modificateur de total
        // (qui peut porter la valeur au-delà du plafond comme en dessous : le
        // tester brûlerait de l'xp sous un malus, ou bloquerait à tort sous un
        // bonus)
        if (state.caracsBase[name] + CARAC_PAS * (state.caracsXp[name] + 1) > caracPlafond(name)) {
          flash("Plafond de " + caracPlafond(name) + " atteint (Options, bloc Création).");
          return;
        }
        state.caracsXp[name]++;
        refresh();
      }));
      bot.appendChild(xpStep);
      row.appendChild(bot);

      hooks.push(function () {
        var d = (state.caracsMod[name] || 0) + (state.caracsMod2[name] || 0);
        var brut = state.caracsBase[name] + CARAC_PAS * state.caracsXp[name];
        var plaf = caracPlafond(name);
        var plafonne = Math.min(brut, plaf);
        var force = state.caracsForce[name] !== undefined;
        // ce que le JET perd par rapport au total : nul depuis que la charge ne
        // pèse plus sur la caractéristique (elle reste sur les compétences de
        // Body et sur la vitesse). La ligne demeure parce qu'elle est la seule
        // à relier l'affichage à caracJet : si l'arbitrage rebasculait, la
        // mention et l'accent reviendraient d'eux-mêmes.
        var m = caracTotal(name) - caracJet(name);
        // Un écart s'écrirait en clair sur la ligne du nom : sans lui, le joueur
        // verrait un total qui ne correspond ni à sa création ni à ses achats,
        // sans rien dans le bloc pour dire pourquoi.
        nm.textContent = name + (m ? " · poids " + sign(-m) : "");
        val.textContent = String(caracJet(name));
        val.classList.toggle("adj", d !== 0 || force || m !== 0);
        // quand le plafond mord, l'écrire en substitution (« plafonné à 80 »)
        // pour que la somme du tooltip se vérifie de tête ; un total forcé, lui,
        // remplace la somme (l'afficher quand même la ferait mentir). Le malus de
        // poids vient APRÈS le forçage : il fixe la caractéristique, pas le jet.
        val.title = (force
                      ? "Total forcé (Options)"
                      : "Création " + state.caracsBase[name] +
                        " + achats " + (CARAC_PAS * state.caracsXp[name]) +
                        (brut !== plafonne ? ", plafonné à " + plaf : "") +
                        (d ? " · modificateur (Options) " + sign(d) : "")) +
                    (m ? " · poids " + sign(-m) : "") +
                    " = " + caracJet(name) + " — clic : lancer 1d100 + " + name;
        cnt.textContent = String(state.caracsXp[name]);
      });
      b.appendChild(row);
    });
    return b;
  }

