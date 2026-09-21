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

      var bot = el("div", "pc-crow-bot pc-edit-only");
      bot.appendChild(el("span", "lbl", "Valeur"));
      bot.appendChild(stepper(
        function () { return caracVal(name); },
        function (v) { state.caracs[name] = clamp(Math.round(v), -9999, 9999); },
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

