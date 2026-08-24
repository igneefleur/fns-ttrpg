  // ---- modificateurs de caractéristiques ----
  // Les HUIT des règles, dans leur ordre de page. Même grille au dixième de
  // rem près que le bloc des compétences : régler une caractéristique et
  // régler une compétence sont le même geste pour le MJ, il n'a pas à
  // apprendre deux dispositions. Ni filtre ni puces ici : sur huit lignes
  // fixées par les règles, ils ne serviraient à rien.
  function buildModCaracs() {
    var bM = block("Modificateurs de caractéristiques");
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    bM.appendChild(wrap);

    var grp = el("div", "pc-optcomp-row grp");
    grp.appendChild(el("span"));
    var gV = el("span", "g", "Valeur");
    gV.title = "Ce que vaut la caractéristique, d'où se lisent son MOD et sa LIM";
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

    champs().forEach(function (c, i) {
      var row = el("div", "pc-optcomp-row pc-mods-host" + (i % 2 === 1 ? " odd" : ""));
      var nameBox = el("span", "pc-comp-name");
      var chip = el("span", "pc-abbr", c);
      chip.title = caracInfo(c).nom;
      nameBox.appendChild(chip);
      row.appendChild(nameBox);

      // Le repère du champ forcé est caracTotal() lui-même, et non la formule
      // refaite ici : un champ VIDE est justement le cas non forcé, celui où
      // caracTotal() rend déjà ce que la valeur, le plafond et les
      // modificateurs donnent. Le repère ne paraît d'ailleurs QUE là.
      // Recopier le calcul en dupliquerait une règle pour rien.
      row.appendChild(champForce(state.caracsForce, c,
        function () { return caracTotal(c); },
        "Total forcé — vide = total calculé (valeur, plafond, modificateurs)."));
      row.appendChild(champMod(state.caracsMod, c, 999,
        "Premier modificateur du total — vide = aucun."));
      row.appendChild(champMod(state.caracsMod2, c, 999,
        "Second modificateur du total — vide = aucun."));
      var tot = el("span", "pc-comp-total", "");
      row.appendChild(tot);

      row.appendChild(el("span", "rule"));
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
        var d = (state.caracsMod[c] || 0) + (state.caracsMod2[c] || 0);
        var f = state.caracsForce[c];
        tot.textContent = String(caracTotal(c));
        tot.classList.toggle("adj", d !== 0 || f !== undefined);
        // Ce que le MJ règle est une valeur de 0 à 20 ; ce que le joueur
        // LANCE, ce sont le MOD et la LIM de cette ligne-là. Les deux
        // s'affichent donc dans la même infobulle, sinon il faut aller les
        // chercher dans la table des règles pour savoir ce qu'on vient de
        // changer.
        tot.title = (f !== undefined
          ? "Total forcé à " + f
          : "valeur " + caracBase(c) + " · plafond " + caracPlafond(c) +
            (d ? " · modificateurs " + sign(d) : "")) +
          " — MOD " + sign(caracMod(c)) + ", LIM " + caracLim(c);

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

        row.classList.toggle("on", d !== 0 || xm !== 0 ||
                             f !== undefined || xf !== undefined);
      });
      box.appendChild(row);
    });
    return bM;
  }

