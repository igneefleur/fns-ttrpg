  // ---- 4. Les trois réserves : PV, PE, PM ----
  // TROIS MODULES ET NON UN BLOC. Les réserves ont la même forme, mais on ne
  // les lit pas au même moment — les PV quand on encaisse, les PE quand on
  // force, les PM quand on lance — et elles se déplacent ou se coupent l'une
  // sans l'autre. Même gréement que les réserves de la fiche MIA :
  //
  //     ┌───────────────────────────────┐
  //     │ PV                   40 / 119 │  ← BANDEAU : l'identité et la valeur
  //     ├───────────────────────────────┤
  //     │ ███████                       │  ← la réserve, barre PLEINE
  //     │  [   ±   ]      [Appliquer]  │  ← le geste du jeu
  //     └───────────────────────────────┘
  //
  //   — on TAPE la variation (13 comme −7) et le bouton l'applique d'un coup ;
  //     Entrée vaut le bouton, et le champ se vide pour qu'un second appui
  //     n'applique pas deux fois le même nombre ;
  //   — vider la valeur du bandeau remet la réserve AU MAXIMUM (null dans
  //     l'état), qui la fait alors suivre le maximum quand il bouge ;
  //   — sous zéro, le bandeau entier passe au rouge.
  //
  // Le rouage de PV, PE et PM règle les taux de gain et de perte et, pour PM, le sacrifice.

  // Le signe moins TYPOGRAPHIQUE, comme dans sign() : à cette taille le trait
  // d'union du clavier passe pour une césure.
  function reserveFmt(n) { n=Math.floor(n); return n < 0 ? "−" + fmtP(-n) : fmtP(n); }

  // Rend { el, etat } : UNE réserve (bandeau, barre, geste), et la pastille
  // d'état que l'appelant remplit lui-même. La CARTE qui la porte est à part
  // (carteVitale) : PV, PE et PM en ont une chacun, PR, PS et PH en partagent
  // une.
  function carteVitale() { return el("div", "pc-block pc-vital"); }
  // `nom` remplace le sigle des règles dans le bandeau, quand la fiche en
  // veut un autre (Repos plutôt que PR) ; la clé, elle, pose la TEINTE de la
  // réserve (classe t-<clé>, couleurs dans la feuille de style).
  function champReglageVital(cle, libelle, lire, valeurValide) {
    var champ = champNombreSigne(el("input", "c pc-field pc-edit-field"));
    champ.placeholder = "0";
    champ.setAttribute("aria-label", libelle);
    champ.addEventListener("input", function () {
      var valeur = champ.value.trim() ? litNombreSigne(champ.value) : 0;
      if (!isFinite(valeur)) return;
      var data = state.modData.reservesVitales;
      if (!data || typeof data !== "object" || Array.isArray(data)) data = state.modData.reservesVitales = {};
      data[cle] = valeurValide(valeur);
      refresh();
    });
    champ.addEventListener("blur", function () { champ.value = lire() || ""; });
    hooks.push(function () {
      if (document.activeElement !== champ) champ.value = lire() || "";
    });
    return champ;
  }

  function titreReserve(scope, cle, nom) {
    var tete = el("div", "pc-vital-tete pc-vital-tete-reglable");
    var titre = el("div", "pc-block-title pc-vital-titre");
    var n = el("span", "pc-vital-nom", nom);
    n.title = libCap(cle, nom);
    titre.appendChild(n);
    if (reserveAvecTaux(cle)) {
      scope.classList.add("pc-editable");
      var gear = gearBtn(scope, cle);
      gear.setAttribute("aria-label", "Modifier " + nom);
      titre.appendChild(gear);
    }
    tete.appendChild(titre);
    return tete;
  }

  function ajouteTauxReserve(scope, cle, nom) {
    var taux = el("div", "pc-segs pc-vital-taux");
    var perte = el("span", "c pc-info"), gain = el("span", "c pc-info");
    taux.appendChild(perte);
    taux.appendChild(gain);
    scope.appendChild(taux);

    var reglages = el("div", "pc-vital-reglages pc-edit-only");
    var sources = el("div", "pc-stat pc-vital-sources");
    var vues = [["art", "ART", "Arts"], ["eqp", "EQP", "Équipements"], ["eft", "EFT", "Effets"]].map(function (source) {
      var cellule = el("div", "c pc-info pc-vital-source");
      cellule.appendChild(el("span", "k", source[1]));
      var valeurs = el("span", "pc-vital-paire");
      var p = el("span", "v"), g = el("span", "v");
      valeurs.appendChild(p);
      valeurs.appendChild(g);
      cellule.appendChild(valeurs);
      sources.appendChild(cellule);
      return { cle: source[0], nom: source[2], cellule: cellule, perte: p, gain: g };
    });

    var autre = el("div", "c pc-vital-source");
    autre.appendChild(el("span", "k", "ATR"));
    var champs = el("div", "pc-segs pc-vital-paire");
    [[cle, "Perte"], ["gain_" + cle, "Gain"]].forEach(function (reglage) {
      var champ = champReglageVital(reglage[0], nom + " — " + reglage[1] + " ATR (%)",
        function () { return reglageReserveVitale(reglage[0]); }, function (v) { return v; });
      champ.title = champ.getAttribute("aria-label");
      champs.appendChild(champ);
    });
    autre.appendChild(champs);
    sources.appendChild(autre);
    reglages.appendChild(sources);

    if (cle === "pm") {
      var sacrifice = el("div", "pc-segs pc-vital-sacrifice");
      sacrifice.appendChild(el("span", "c pc-info", "Sacrifice tellurique"));
      sacrifice.appendChild(champReglageVital("sacrifice", "Sacrifice tellurique", sacrificeTellurique,
        function (v) { return clamp(Math.floor(v), 0, sacrificeTelluriqueMax()); }));
      reglages.appendChild(sacrifice);
    }
    scope.appendChild(reglages);

    hooks.push(function () {
      var p = tauxReserve(cle, "perte"), g = tauxReserve(cle, "gain");
      perte.textContent = "Perte " + fmtP(p.total) + " %";
      gain.textContent = "Gain " + fmtP(g.total) + " %";
      vues.forEach(function (vue) {
        vue.perte.textContent = sign(p[vue.cle]);
        vue.gain.textContent = sign(g[vue.cle]);
        vue.cellule.title = vue.nom + " · Perte " + vue.perte.textContent + " % · Gain " + vue.gain.textContent + " %";
      });
    });
  }

  function reserveVitale(cle, provenance, nomAffiche) {
    var nom = nomAffiche || abbrCap(cle, cle.toUpperCase());
    var box = el("div", "pc-vital-res t-" + cle);

    var editable = reserveAvecTaux(cle);
    var tete = titreReserve(box, cle, nom);
    var etat = el("span", "pc-vital-etat", "");
    var val = el("span", "pc-vital-val");
    var inp = el("input", "pc-vital-num");
    inp.dataset.syncReserve=cle;
    champNombreSigne(inp);
    inp.step = "1";
    inp.setAttribute("aria-label", libCap(cle, nom));
    inp.addEventListener("input", function () {
      var v = litNombreSigne(inp.value);
      if(window.__owdReserveSet)window.__owdReserveSet(cle);
      state.etat[cle] = isFinite(v) ? Math.round(v * 100) / 100 : null;
      refresh();
    });
    val.appendChild(inp);
    var mx = el("span", "pc-vital-max", "");
    val.appendChild(mx);
    tete.appendChild(val);
    var etatLigne = el("div", "pc-vital-etat-ligne");
    etatLigne.appendChild(etat);
    tete.appendChild(etatLigne);
    box.appendChild(tete);

    var jauge = el("span", "pc-vital-jauge");
    var fill = el("i");
    jauge.appendChild(fill);
    for (var palier = 1; ["pr", "ps", "ph", "pi"].indexOf(cle) >= 0 && palier < 10; palier++) {
      var trait = el("span", "pc-vital-palier");
      trait.style.left = (palier * 10) + "%";
      trait.setAttribute("aria-hidden", "true");
      jauge.appendChild(trait);
    }
    box.appendChild(jauge);
    if (editable) ajouteTauxReserve(box, cle, nom);
    box.appendChild(commandeVariation(libCap(cle, nom) + " à ajouter ou retirer", function (d) {
      state.etat[cle] = courant(cle) + effetVariationImmediate(cle, d);
    }));

    hooks.push(function () {
      var v = courant(cle), m = maxDe(cle);
      if (document.activeElement !== inp) inp.value = Math.floor(v);
      // un <input> ROGNE au lieu de déborder : sa largeur suit le nombre de
      // signes (les chiffres sont à chasse fixe)
      inp.style.width = Math.max(3.4, String(inp.value).length + 0.3) + "ch";
      mx.textContent = "/ " + fmtP(m);
      // l'accent dit un maximum réglé par un levier, ou une valeur au-dessus
      var forcee = capForce(cle), depasse = v > m;
      mx.classList.toggle("adj", forcee || depasse);
      mx.title = forcee ? chaineTexteDe(lireCap("max", cle), "calculé", autoDe(cle)) : provenance();
      var sacrifice = /^(pv|pe|pm)$/.test(cle) ? sacrificeTellurique() : 0;
      if (sacrifice) mx.title += " · Sacrifice tellurique : " + sign(cle === "pm" ? 2 * sacrifice : -sacrifice);
      // SOUS ZÉRO, la barre part de la droite et le bandeau passe au rouge
      var neg = v < 0;
      box.classList.toggle("over", neg);
      fill.classList.toggle("over", neg);
      fill.style.marginLeft = neg ? "auto" : "0";
      var pourcent = clamp(neg ? 100 : (m > 0 ? v / m * 100 : 0), 0, 100);
      fill.style.width = pourcent + "%";
      jauge.querySelectorAll(".pc-vital-palier").forEach(function (trait) {
        trait.classList.toggle("plein", parseFloat(trait.style.left) <= pourcent);
      });
      jauge.title = nom + " " + reserveFmt(v) + " / " + fmtP(m);
    });
    return { el: box, etat: etat };
  }
  // L'effondrement descend le maximum de PV et de PE : l'infobulle le dit, ou
  // le chiffre paraît faux au joueur qui vérifie la formule de tête.
  function provenanceEff(cle, champ) {
    return function () {
      var t = provenanceCap(cle)();
      var e = effondrement();
      if (e > 0) t += " · effondrement " + e + " (−" + (num(effDef()[champ], 0) * e) + " %)";
      return t;
    };
  }
  function seule(r) { var c = carteVitale(); c.appendChild(r.el); return c; }
  function buildPv() {
    return seule(reserveVitale("pv", provenanceEff("pv", "pvParNiveau")));
  }
  function buildPe() {
    var r = reserveVitale("pe", provenanceEff("pe", "peParNiveau"));
    // un ÉTAT du personnage, le même que dit l'avertissement de l'en-tête
    hooks.push(function () { r.etat.textContent = peMax() <= 0 ? "Inconscient" : ""; });
    return seule(r);
  }
  // LES POINTS D'INNOCENCE, même module que les PV. Ils ne remontent pas au
  // repos, mais cela ne change rien au geste : on y tape ce qui se perd ou se
  // regagne.
  function buildPi() {
    return seule(reserveVitale("pi", provenanceCap("pi"), "Innocence"));
  }
  // LES POINTS DE CHANCE, même module que les PV : un compteur qui se dépense
  // et se regagne, et dont le maximum vient de la Chance comme les autres
  // viennent de leur caractéristique.
  function buildPc() {
    return seule(reserveVitale("pc", provenanceCap("pc")));
  }
  function buildPm() {
    return seule(reserveVitale("pm", function () { return "Maximum calculé : " + fmtP(autoDe("pm")); }));
  }
