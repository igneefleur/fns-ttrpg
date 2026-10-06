  // ---- 1. Caractéristiques ----
  function buildCaracs() {
    var b = block("Caractéristiques", null, "caracs");
    caracsOrdre().forEach(function (name) {
      var row = el("div", "pc-crow");
      var top = el("div", "pc-crow-top");
      var chip = el("span", "pc-abbr pc-carac-abbr", abbrCarac(name));
      chip.title = libCarac(name);
      top.appendChild(chip);

      // COMME LES CONTRÔLES SEGMENTÉS DE LA FICHE : le nom complet n'apporte
      // rien ici, le sigle suffit. À droite, valeur et modificateur partagent
      // exactement la même case [ A | B ]. Le modificateur est celui employé
      // par les armes : floor(CARAC / 5).
      var duo = el("div", "pc-segs pc-carac-segs");
      var val = el("span", "c pc-carac-val", "");
      var mod = el("span", "c pc-carac-mod", "");
      val.title = "Valeur";
      mod.title = "Modificateur";
      duo.appendChild(val);
      duo.appendChild(mod);
      top.appendChild(duo);
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
        var total = caracTotal(name);
        var bonus = Math.floor(total / 5);
        val.textContent = String(total);
        mod.textContent = (bonus > 0 ? "+" : "") + String(bonus);
        val.classList.toggle("adj", regle);
        // L'infobulle RELIT LA CHAÎNE dans l'ordre et ne dit que ce qui a
        // bougé : une phrase écrite d'avance mentirait dès qu'un facteur est
        // posé, et un total forcé REMPLACE la somme au lieu de s'y ajouter.
        val.title = "Valeur — " + chaineTexteDe(lireCarac("total", name), "valeur", caracVal(name)) +
                    (regle ? " = " + fmtP(total) : "");
        mod.title = "Modificateur — floor(" + total + " / 5) = " + bonus;
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

