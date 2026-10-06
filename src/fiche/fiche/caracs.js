  // ---- 1. Caractéristiques ----
  function buildCaracs() {
    var b = block("Caractéristiques", null, "caracs");

    // UNE SEULE ENTÊTE, COMME MIA : exactement le même squelette que les
    // deux cases qu'elle annonce. En jeu on lit VALEUR | MOD ; sous le rouage
    // les deux mêmes colonnes deviennent CRÉATION | XP.
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "pc-carac-head-spacer"));
    var teteDuo = el("div", "pc-segs pc-carac-segs pc-carac-head");
    function teteCase(jeu, edit) {
      var c = el("span", "c");
      c.appendChild(el("span", "pc-jeu-only", jeu));
      c.appendChild(el("span", "pc-edit-only", edit));
      teteDuo.appendChild(c);
    }
    teteCase("VAL", "Création");
    teteCase("Mod", "XP");
    tete.appendChild(teteDuo);
    b.appendChild(tete);

    caracsOrdre().forEach(function (name) {
      var row = el("div", "pc-crow");
      var top = el("div", "pc-crow-top");
      var chip = el("span", "pc-abbr pc-carac-abbr", abbrCarac(name));
      chip.title = libCarac(name);
      top.appendChild(chip);

      var duo = el("div", "pc-segs pc-carac-segs");

      // CASE 1 : VALEUR en jeu, CRÉATION sous le rouage.
      var cVal = el("span", "c");
      var val = el("span", "pc-jeu-only pc-carac-val", "");
      val.title = "Valeur";
      var creationInput = el("input", "pc-edit-only pc-edit-field pc-carac-input");
      creationInput.type = "number";
      creationInput.step = "1";
      creationInput.title = "Création";
      creationInput.addEventListener("input", function () {
        var v = parseInt(creationInput.value, 10);
        if (!isFinite(v)) return;
        var avant = caracBase(name), cr = creation();
        v = Math.round(v);
        if (v === avant) return;
        if (cr) {
          v = clamp(v, num(cr.min, 0), num(cr.max, 9999));
          if (v > avant) {
            var libre = creationPoints() - creationDepense() + avant;
            if (v > libre) v = Math.max(avant, libre);
            if (v <= avant) { flash("Points de création épuisés."); return; }
          }
        }
        state.caracs[name] = clamp(v, -9999, 9999);
        refresh();
      });
      cVal.appendChild(val);
      cVal.appendChild(creationInput);
      duo.appendChild(cVal);

      // CASE 2 : MOD en jeu, XP sous le rouage.
      var cMod = el("span", "c");
      var mod = el("span", "pc-jeu-only pc-carac-mod", "");
      mod.title = "Modificateur";
      var xpInput = el("input", "pc-edit-only pc-edit-field pc-carac-input");
      xpInput.type = "number";
      xpInput.step = "1";
      xpInput.min = "0";
      xpInput.title = "XP";
      xpInput.addEventListener("input", function () {
        var apres = parseInt(xpInput.value, 10);
        if (!isFinite(apres)) return;
        var avant = caracAchat(name);
        apres = Math.max(0, Math.round(apres));
        if (apres === avant) return;
        if (apres > avant) {
          var base = caracBase(name), cout = 0, i, prix;
          for (i = avant + 1; i <= apres; i++) {
            prix = prixPointCarac(base + i);
            if (prix === null) return;
            cout += prix;
          }
          if (xpRestant() < cout) { flash("XP insuffisant."); return; }
        }
        if (!state.caracsXp) state.caracsXp = {};
        if (apres > 0) state.caracsXp[name] = apres;
        else delete state.caracsXp[name];
        refresh();
      });
      cMod.appendChild(mod);
      cMod.appendChild(xpInput);
      duo.appendChild(cMod);

      top.appendChild(duo);
      row.appendChild(top);

      hooks.push(function () {
        var regle = levierRegleDe(lireCarac("total", name));
        var total = caracTotal(name);
        var bonus = Math.floor(total / 5);
        val.textContent = String(total);
        mod.textContent = (bonus > 0 ? "+" : "") + String(bonus);
        val.classList.toggle("adj", regle);
        val.title = "Valeur — " + chaineTexteDe(lireCarac("total", name), "valeur", caracVal(name)) +
                    (regle ? " = " + fmtP(total) : "");
        mod.title = "Modificateur — floor(" + total + " / 5) = " + bonus;
        if (document.activeElement !== creationInput) creationInput.value = caracBase(name);
        if (document.activeElement !== xpInput) xpInput.value = caracAchat(name);
      });
      b.appendChild(row);
    });
    return b;
  }
