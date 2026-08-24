  // ---------- les points de vie ----------
  // Ce qui relève du JEU reste toujours actif (la valeur courante, le retour au
  // maximum) : on perd des points de vie en pleine partie, pas en construisant
  // son personnage. Le rouage ne déverrouille que le maximum.

  // Le signe moins TYPOGRAPHIQUE (U+2212), comme dans sign() : à cette taille,
  // le trait d'union du clavier passe pour une césure, et un plancher de vie
  // n'a pas le droit d'être ambigu.
  function pvFmtNeg(n) { return n < 0 ? "−" + fmtP(-n) : fmtP(n); }

  // UNE SEULE BARRE, ET SON SENS DIT LE SIGNE. Verte, elle part de la GAUCHE et
  // montre ce qui reste ; rouge, elle part de la DROITE et montre ce qui a été
  // creusé sous zéro. Deux barres empilées obligeaient à chercher laquelle
  // bougeait avant de lire combien — et l'une des deux était toujours vide.
  //
  // ELLE PREND TOUTE LA LARGEUR, ET ELLE EST SEULE. Le chiffre qui la doublait
  // en bout de ligne disait exactement ce que le stepper dit déjà au-dessus :
  // deux fois la même valeur et le même maximum, dans le même bloc.
  //
  // Deux réglages se posent ici plutôt que dans la feuille : .pc-meter .bar est
  // figée à 84 px et les deux règles qui l'étirent nomment leur hôte, qui n'est
  // pas ce bloc-ci. Le passage en flex est ce qui permet à la barre rouge de
  // se coller à droite (marge automatique) sans une classe de plus.
  function pvJauge() {
    var m = el("span", "pc-meter");
    var bar = el("span", "bar");
    bar.style.flex = "1 1 100%";
    bar.style.width = "auto";
    bar.style.display = "flex";
    var f = el("i");
    bar.appendChild(f);
    m.appendChild(bar);
    return { el: m, fill: f };
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

  // LA RÉSERVE : la valeur courante au stepper, son maximum, et sa barre.
  // infoMax dit ce que l'infobulle du maximum raconte et si le chiffre a été
  // retouché ; tout le reste est commun aux PV et à l'endurance, qui ont
  // exactement la même forme.
  function pvReserve(nom, lire, ecrire, maxi, plancher, infoMax) {
    var box = el("div");
    var row = el("div", "pc-kv");
    // PAS D'ÉTIQUETTE : le titre du bloc dit déjà « PV » ou « Endurance », et
    // le répéter en tête de la ligne juste dessous coûtait cinq lettres de
    // large dans une colonne qui n'en a pas de trop — au point que le bouton
    // « Max » passait à la ligne.
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

    var j = pvJauge();
    box.appendChild(j.el);
    hooks.push(function () {
      var v = lire(), m = maxi(), p = plancher(), i = infoMax();
      mx.textContent = "/ " + fmtP(m);
      mx.classList.toggle("adj", !!i.adj);
      mx.title = i.titre;
      var neg = v < 0;
      j.fill.classList.toggle("over", neg);
      // la barre rouge se colle à droite : c'est la marge qui la pousse, la
      // barre étant passée en flex à sa construction
      j.fill.style.marginLeft = neg ? "auto" : "0";
      j.fill.style.width = clamp(neg ? (p < 0 ? v / p * 100 : 0)
                                     : (m > 0 ? v / m * 100 : 0), 0, 100) + "%";
      // la barre porte SON infobulle : c'est le seul endroit où le plancher
      // négatif se nomme, la ligne du dessus n'annonçant que le maximum
      j.el.title = nom + " " + pvFmtNeg(v) + " / " + pvFmtNeg(neg ? p : m);
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
    var b = block("PV", null, "pv");
    b.appendChild(pvReserve("PV", pvCourant, function (v) { state.pv = v; },
                            pvMax, pvPlancher, function () {
      var d = modSum(state.divers.pvMax);
      return {
        adj: state.pvMaxOverride !== null || d !== 0,
        titre: state.pvMaxOverride !== null
          ? "Maximum forcé à " + state.pvMaxOverride + " (calculé : " + pvMaxAuto() + ")"
          : (d ? "Modificateurs " + sign(d) : "")
      };
    }));
    var mort = pvLigne("pc-warn");
    b.appendChild(mort);
    b.appendChild(pvForceRow("PV max", "pvMaxOverride", pvMaxAuto, "pvMax",
      "Vide = calculé ; une valeur le force."));
    // un ÉTAT du personnage, et rien d'autre : un fait sur lui, au même titre
    // que ses PV. La règle qui le produit n'a pas à être ici.
    hooks.push(function () { pvDit(mort, pvMort() ? "Mort" : ""); });
    return b;
  }
