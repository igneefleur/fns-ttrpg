  // ---------- PV et endurance ----------
  // DEUX RÉSERVES DE MÊME FORME, et c'est la règle qui le veut : les PV
  // descendent du maximum jusqu'à son opposé, l'endurance aussi. On les bâtit
  // donc avec le même outil — le défaut à éviter était de corriger la barre
  // négative des PV en laissant celle de l'endurance derrière.
  //
  // Ce qui relève du JEU reste toujours actif (la valeur courante, le retour au
  // maximum) : on perd des points de vie en pleine partie, pas en construisant
  // son personnage. Le rouage ne déverrouille que les deux maximums.

  // Le signe moins TYPOGRAPHIQUE (U+2212), comme dans sign() : à cette taille,
  // le trait d'union du clavier passe pour une césure, et un plancher de vie
  // n'a pas le droit d'être ambigu.
  function pvFmtNeg(n) { return n < 0 ? "−" + fmtP(-n) : fmtP(n); }

  // Une barre de jauge, au CSS des compteurs de l'en-tête. Deux réglages se
  // posent ici plutôt que dans la feuille : .pc-meter .bar est figée à 84 px et
  // les deux règles qui l'étirent (.pc-id-meters, .pc-xpchamp) nomment leur
  // hôte, qui n'est pas ce bloc-ci. La largeur FIXE du nombre, elle, garde les
  // deux barres exactement de même longueur — sans quoi la positive et la
  // négative ne se compareraient plus d'un coup d'œil, ce qui est tout ce
  // qu'on leur demande.
  function pvJauge(rouge) {
    var m = el("span", "pc-meter");
    var bar = el("span", "bar");
    bar.style.flex = "1";
    bar.style.width = "auto";
    var f = el("i", rouge ? "over" : null);
    bar.appendChild(f);
    m.appendChild(bar);
    var t = el("b", null, "");
    t.style.flex = "0 0 5rem";
    t.style.textAlign = "right";
    m.appendChild(t);
    return { el: m, txt: t, fill: f };
  }
  // Une ligne d'état qui n'existe que lorsqu'elle a quelque chose à dire : le
  // texte vide l'efface, ses marges avec.
  function pvLigne(cls) {
    var d = el("div", cls);
    d.style.display = "none";
    return d;
  }
  function pvDit(ligne, texte) {
    ligne.textContent = texte || "";
    ligne.style.display = texte ? "" : "none";
  }

  // LA RÉSERVE : la valeur courante au stepper, son maximum, sa barre positive
  // et sa barre négative. infoMax dit ce que l'infobulle du maximum raconte et
  // si le chiffre a été retouché ; tout le reste est commun aux deux réserves.
  function pvReserve(nom, lire, ecrire, maxi, plancher, infoMax) {
    var box = el("div");
    var row = el("div", "pc-kv");
    row.appendChild(el("span", "k", nom));
    var step = el("span", "pc-step");
    step.appendChild(stepBtn("−", null, function () { ecrire(lire() - 1); refresh(); }));
    var inp = el("input", "pc-num");
    inp.type = "number"; inp.step = "1";
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      // vide = « au maximum » : c'est ainsi que l'état dit qu'aucun point n'a
      // encore été perdu, et le maximum peut alors bouger sans traîner
      ecrire(isFinite(v) ? v : null);
      refresh();
    });
    hooks.push(function () { if (document.activeElement !== inp) inp.value = lire(); });
    step.appendChild(inp);
    step.appendChild(stepBtn("+", null, function () { ecrire(lire() + 1); refresh(); }));
    row.appendChild(step);
    var mx = el("span", "max", "");
    row.appendChild(mx);
    row.appendChild(el("span", "sp"));
    row.appendChild(miniBtn("Max", "Revenir au maximum", function () { ecrire(null); refresh(); }));
    box.appendChild(row);

    var pos = pvJauge(false), neg = pvJauge(true);
    box.appendChild(pos.el);
    box.appendChild(neg.el);
    hooks.push(function () {
      var v = lire(), m = maxi(), p = plancher(), i = infoMax();
      mx.textContent = "/ " + fmtP(m);
      mx.classList.toggle("adj", !!i.adj);
      mx.title = i.titre;
      // la positive ne montre que ce qui reste au-dessus de zéro, la négative
      // que ce qui a été creusé en dessous : une seule des deux bouge à la fois
      pos.txt.textContent = fmtP(Math.max(0, v)) + " / " + fmtP(m);
      pos.fill.style.width = clamp(m > 0 ? Math.max(0, v) / m * 100 : 0, 0, 100) + "%";
      neg.txt.textContent = pvFmtNeg(Math.min(0, v)) + " / " + pvFmtNeg(p);
      neg.fill.style.width = clamp(p < 0 ? Math.min(0, v) / p * 100 : 0, 0, 100) + "%";
    });
    return box;
  }

  // La ligne de construction d'un maximum : la valeur forcée (vide = calculée)
  // et les trois modificateurs. Les deux réserves ont la même.
  function pvForceRow(nom, champ, auto, cle, aide) {
    var row = el("div", "pc-pvmax pc-mods-host pc-edit-only");
    row.appendChild(el("span", "lbl", nom));
    var f = el("input", "force");
    f.type = "number"; f.step = "1"; f.min = "0";
    f.title = aide;
    f.addEventListener("input", function () {
      var v = parseFloat(f.value);
      state[champ] = isFinite(v) ? clamp(Math.floor(v), 0, 9999) : null;
      refresh();
    });
    hooks.push(function () {
      f.placeholder = String(auto());
      if (document.activeElement !== f) f.value = state[champ] === null ? "" : state[champ];
    });
    row.appendChild(f);
    row.appendChild(el("span", "lbl", "Modificateurs"));
    row.appendChild(multiMod(state.divers, cle));
    row.appendChild(el("span", "sp"));
    return row;
  }

  function buildPv() {
    var b = block("PV et endurance", null, "pv");

    // ---- les points de vie ----
    b.appendChild(pvReserve("PV", pvCourant, function (v) { state.pv = v; },
                            pvMax, pvPlancher, function () {
      var d = modSum(state.divers.pvMax);
      return {
        adj: state.pvMaxOverride !== null || d !== 0,
        titre: state.pvMaxOverride !== null
          ? "Maximum forcé à " + state.pvMaxOverride + " (calculé : " + pvMaxAuto() + ")"
          : "(20 + MOD CON + PHY) / 2 + SPÉ PV = (20 + " + caracMod("CON") + " + " +
            compPts("PHY") + ") / 2 + " + spePtsParNom("PV") +
            (d ? " · modificateurs " + sign(d) : "")
      };
    }));
    // LE SEUIL DE L'OBSTINATION ne se montre que dans le négatif : il n'y a
    // rien à jeter tant que les PV sont positifs. Il bouge à chaque coup reçu,
    // puisqu'il est la part du maximum déjà creusée, et le joueur doit le lire
    // au moment où le MJ lui demande le jet.
    var obst = pvLigne("pc-block-note");
    b.appendChild(obst);
    var mort = pvLigne("pc-warn");
    b.appendChild(mort);

    // ---- l'endurance ----
    b.appendChild(pvReserve("Endurance", enduranceCourante,
                            function (v) { state.endurance = v; },
                            enduranceMax, endurancePlancher, function () {
      var d = modSum(state.divers.endurance);
      return {
        adj: state.enduranceMaxOverride !== null || d !== 0,
        titre: state.enduranceMaxOverride !== null
          ? "Maximum forcé à " + state.enduranceMaxOverride +
            " (calculé : " + enduranceMaxAuto() + ")"
          : "MOD CON = " + caracMod("CON") + (d ? " · modificateurs " + sign(d) : "")
      };
    }));
    // Ce que l'endurance coûte à l'usage : le plafond par action est le seul
    // chiffre qu'on cherche en pleine partie, et il ne se déduit d'aucun autre
    // affichage de la fiche.
    var endDep = el("div", "pc-block-note");
    b.appendChild(endDep);
    // le malus général : il pèse sur TOUS les jets, et jetBonus() le retire
    // déjà de chacun. On l'écrit ici pour qu'un joueur comprenne pourquoi ses
    // chiffres ont baissé partout à la fois.
    var endMal = pvLigne("pc-warn");
    b.appendChild(endMal);
    var endTapis = pvLigne("pc-warn");
    b.appendChild(endTapis);

    // ---- construction : les deux maximums ----
    b.appendChild(pvForceRow("PV max", "pvMaxOverride", pvMaxAuto, "pvMax",
      "Vide = maximum calculé ((20 + MOD CON + PHY) / 2 + SPÉ PV, modificateurs " +
      "compris) ; une valeur le force."));
    b.appendChild(pvForceRow("Endurance max", "enduranceMaxOverride", enduranceMaxAuto,
      "endurance",
      "Vide = maximum calculé (MOD CON, modificateurs compris) ; une valeur le force."));

    hooks.push(function () {
      pvDit(obst, pvCourant() < 0
        ? "Obstination : jet contre " + obstinationDD() +
          " chaque fois que des dégâts font passer les PV dans le négatif — raté, " +
          "le personnage tombe dans les pommes."
        : "");
      pvDit(mort, pvMort()
        ? "Mort : les PV ont atteint " + pvFmtNeg(pvPlancher()) + ", soit −100 % du maximum."
        : "");
      endDep.textContent = "Se dépense pour ajouter un bonus, jusqu'à " +
        repli("endurAction") + " points sur une même action ; se regagne chaque jour.";
      pvDit(endMal, enduranceMalus()
        ? "Endurance négative : malus de " + enduranceMalus() + " sur tous les jets."
        : "");
      pvDit(endTapis, enduranceAuTapis()
        ? "Au tapis : l'endurance a atteint " + pvFmtNeg(endurancePlancher()) +
          " ; le personnage reste dans les pommes jusqu'au retour de sa réserve au maximum."
        : "");
    });
    return b;
  }

