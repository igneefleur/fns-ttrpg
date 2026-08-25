  // ---- coût en xp des caractéristiques ----
  // CE QU'ELLES COÛTENT, ET RIEN D'AUTRE. Ce bloc réglait aussi leur VALEUR —
  // deux modificateurs et un forçage. Ils sont partis : la valeur se décale
  // maintenant sur la FICHE, par la case Bonus du module des caractéristiques,
  // et ce qu'une caractéristique DONNE (son MOD, sa LIMITE, l'écart qu'elle
  // impose aux spécialités) se règle dans les trois blocs de leviers.
  function buildXpCaracs() {
    var bM = block("Coût en xp des caractéristiques");
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    bM.appendChild(wrap);

    var head = el("div", "pc-optcomp-row xp head");
    [["Carac.", "Caractéristique"],
     ["Forcé", "Coût en xp forcé — vide = coût calculé"],
     ["Modif.", "Deux modificateurs du coût en xp, qui s'additionnent", "duo"],
     ["Coût", "Coût effectif en xp"]].forEach(function (h) {
      var sp = el("span", h[2] || null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    box.appendChild(head);

    champs().forEach(function (c, i) {
      var row = el("div", "pc-optcomp-row xp pc-mods-host" + (i % 2 === 1 ? " odd" : ""));
      var nameBox = el("span", "pc-comp-name");
      var chip = el("span", "pc-abbr", c);
      chip.title = caracInfo(c).nom;
      nameBox.appendChild(chip);
      row.appendChild(nameBox);

      row.appendChild(champForce(state.caracsXpForce, c,
        function () { return caracXpAuto(c); },
        "Coût en xp forcé — vide = coût calculé (barème des règles et modificateurs)."));
      row.appendChild(champMod(state.caracsXpMod, c, 9999,
        "Premier modificateur du coût en xp — vide = aucun."));
      row.appendChild(champMod(state.caracsXpMod2, c, 9999,
        "Second modificateur du coût en xp — vide = aucun."));
      var cout = el("span", "pc-comp-total", "");
      row.appendChild(cout);

      hooks.push(function () {
        var xf = state.caracsXpForce[c];
        var xm = (state.caracsXpMod[c] || 0) + (state.caracsXpMod2[c] || 0);
        var xp = caracXp(c);
        cout.textContent = xp + " xp";
        cout.classList.toggle("zero", !xp);
        cout.classList.toggle("adj", xf !== undefined || xm !== 0);
        cout.title = xf !== undefined
          ? "Coût forcé à " + xf + " xp (calculé : " + caracXpAuto(c) + " xp)"
          : "XP cumulé de la valeur " + caracBase(c) +
            (xm ? " · modificateurs " + sign(xm) + " xp" : "");
        row.classList.toggle("on", xm !== 0 || xf !== undefined);
      });
      box.appendChild(row);
    });
    return bM;
  }
