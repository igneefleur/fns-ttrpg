  function buildModCaracs() {
    var bM = block("Modificateurs de caractéristiques");
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    bM.appendChild(wrap);

    var grp = el("div", "pc-optcomp-row grp");
    grp.appendChild(el("span"));
    var gV = el("span", "g", "Valeur");
    gV.title = "Ce que vaut la caractéristique quand on la lance";
    grp.appendChild(gV);
    grp.appendChild(el("span", "rule"));
    var gX = el("span", "g", "Coût en xp");
    gX.title = "Ce que la caractéristique coûte sur l'xp du personnage";
    grp.appendChild(gX);
    box.appendChild(grp);

    var head = el("div", "pc-optcomp-row head");
    [["Carac.", "Caractéristique"],
     ["Forcé", "Total forcé — vide = total calculé"],
     ["Modif.", "Deux modificateurs du total, qui s'additionnent", "duo"],
     ["Total", "Total effectif de la caractéristique"],
     null,
     ["Forcé", "Coût en xp forcé — vide = coût calculé"],
     ["Modif.", "Deux modificateurs du coût en xp, qui s'additionnent", "duo"],
     ["Coût", "Coût effectif en xp"]].forEach(function (h) {
      if (!h) { head.appendChild(el("span", "rule")); return; }
      var sp = el("span", h[2] || null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    box.appendChild(head);

    CHAMPS.forEach(function (name, i) {
      if (!DATA.caracs.some(function (cc) { return cc.name === name; })) return;
      var row = el("div", "pc-optcomp-row pc-mods-host" + (i % 2 === 1 ? " odd" : ""));
      var nameBox = el("span", "pc-comp-name");
      var chip = el("span", "pc-abbr", ABBR[name] || name);
      chip.title = name;
      nameBox.appendChild(chip);
      row.appendChild(nameBox);

      row.appendChild(champForce(state.caracsForce, name,
        function () {
          var v = Math.min(state.caracsBase[name] + CARAC_PAS * state.caracsXp[name],
                           caracPlafond(name));
          return v + (state.caracsMod[name] || 0) + (state.caracsMod2[name] || 0);
        },
        "Total forcé — vide = total calculé (création + achats + modificateurs)."));
      row.appendChild(champMod(state.caracsMod, name, 999,
        "Premier modificateur du total — vide = aucun."));
      row.appendChild(champMod(state.caracsMod2, name, 999,
        "Second modificateur du total — vide = aucun."));
      var tot = el("span", "pc-comp-total", "");
      row.appendChild(tot);

      row.appendChild(el("span", "rule"));
      row.appendChild(champForce(state.caracsXpForce, name,
        function () { return caracXpAuto(name); },
        "Coût en xp forcé — vide = coût calculé (achats et modificateurs)."));
      row.appendChild(champMod(state.caracsXpMod, name, 9999,
        "Premier modificateur du coût en xp — vide = aucun."));
      row.appendChild(champMod(state.caracsXpMod2, name, 9999,
        "Second modificateur du coût en xp — vide = aucun."));
      var cout = el("span", "pc-comp-total", "");
      row.appendChild(cout);

      hooks.push(function () {
        var d = (state.caracsMod[name] || 0) + (state.caracsMod2[name] || 0);
        var force = state.caracsForce[name];
        tot.textContent = String(caracTotal(name));
        tot.classList.toggle("adj", d !== 0 || force !== undefined);
        tot.title = force !== undefined
          ? "Total forcé à " + force
          : "création " + state.caracsBase[name] +
            " · achats " + (CARAC_PAS * state.caracsXp[name]) +
            (d ? " · modificateurs " + sign(d) : "");

        var xf = state.caracsXpForce[name];
        var xm = (state.caracsXpMod[name] || 0) + (state.caracsXpMod2[name] || 0);
        var xp = caracXp(name);
        cout.textContent = xp + " xp";
        cout.classList.toggle("zero", !xp);
        cout.classList.toggle("adj", xf !== undefined || xm !== 0);
        cout.title = xf !== undefined
          ? "Coût forcé à " + xf + " xp (calculé : " + caracXpAuto(name) + " xp)"
          : "Achats d'xp" + (xm ? " · modificateurs " + sign(xm) + " xp" : "");

        row.classList.toggle("on", d !== 0 || xm !== 0 ||
                             force !== undefined || xf !== undefined);
      });
      box.appendChild(row);
    });
    return bM;
  }

