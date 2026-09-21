  // ---- 1. Caractéristiques ----
  function buildCaracs() {
    var b = block("Caractéristiques", null, "caracs");
    caracsOrdre().forEach(function (name) {
      var row = el("div", "pc-crow");
      var top = el("div", "pc-crow-top");
      var chip = el("span", "pc-abbr", abbrCarac(name));
      chip.title = libCarac(name);
      top.appendChild(chip);
      top.appendChild(el("span", "nm", libCarac(name)));
      // LA VALEUR N'EST PAS CLIQUABLE, et ce n'est pas un oubli : dans Outward
      // une caractéristique n'ouvre pas un jet. Elle ouvre l'usage d'une arme
      // et fixe ses dégâts ; le jet, lui, est fait de dés d'action et du bonus
      // de rang, seuls. D'où l'absence de pc-rollable.
      var val = el("span", "pc-cval", "");
      top.appendChild(val);
      row.appendChild(top);

      // DEUX CHAMPS, et pas un : la répartition de création et les points
      // achetés à l'expérience. Le premier se contrôle contre le budget et les
      // bornes des règles, le second contre l'XP restant — au prix du point
      // que chacun fait atteindre. Le MJ passe outre par les Options.
      var bot = el("div", "pc-crow-bot pc-edit-only");
      bot.appendChild(el("span", "lbl", "Création"));
      bot.appendChild(stepper(
        function () { return caracBase(name); },
        function (v) {
          var avant = caracBase(name), cr = creation();
          v = Math.round(v);
          if (!isFinite(v) || v === avant) return;
          if (cr) {
            v = clamp(v, num(cr.min, 0), num(cr.max, 9999));
            // Monter ne prend que ce qui reste du budget ; descendre est
            // toujours permis, même sur une fiche déjà au-delà.
            if (v > avant) {
              var libre = creationPoints() - creationDepense() + avant;
              if (v > libre) v = Math.max(avant, libre);
              if (v <= avant) { flash("Points de création épuisés."); return; }
            }
          }
          state.caracs[name] = clamp(v, -9999, 9999);
        },
        1, libCarac(name)));
      bot.appendChild(el("span", "lbl", "Expérience"));
      bot.appendChild(stepper(
        function () { return caracAchat(name); },
        function (v) {
          var avant = caracAchat(name), apres = Math.max(0, Math.round(v));
          if (!isFinite(apres) || apres === avant) return;
          if (apres > avant) {
            var b = caracBase(name), cout = 0, i, p;
            for (i = avant + 1; i <= apres; i++) {
              p = prixPointCarac(b + i);
              if (p === null) return;
              cout += p;
            }
            if (xpRestant() < cout) { flash("XP insuffisant."); return; }
          }
          // REDESCENDRE REND l'XP : le coût se recalcule de l'état, rien n'est
          // à rembourser à la main.
          if (!state.caracsXp) state.caracsXp = {};
          if (apres > 0) state.caracsXp[name] = apres;
          else delete state.caracsXp[name];
        },
        1, libCarac(name)));
      row.appendChild(bot);

      hooks.push(function () {
        var regle = levierRegleDe(lireCarac("total", name));
        val.textContent = String(caracTotal(name));
        val.classList.toggle("adj", regle);
        // L'infobulle RELIT LA CHAÎNE dans l'ordre et ne dit que ce qui a
        // bougé : une phrase écrite d'avance mentirait dès qu'un facteur est
        // posé, et un total forcé REMPLACE la somme au lieu de s'y ajouter.
        val.title = chaineTexteDe(lireCarac("total", name), "valeur", caracVal(name)) +
                    (regle ? " = " + fmtP(caracTotal(name)) : "");
      });
      b.appendChild(row);
    });
    // La carte des huit totaux, d'un clic : ce que le MJ demande le plus.
    var pied = el("div", "pc-comp-tools");
    var ligne = el("div", "row");
    ligne.appendChild(chatBtn(
      function () { return "Caractéristiques — " + (state.name || "sans nom"); },
      function () {
        return caracsOrdre().map(function (c) { return [libCarac(c), String(caracTotal(c))]; });
      }));
    pied.appendChild(ligne);
    b.appendChild(pied);
    return b;
  }

