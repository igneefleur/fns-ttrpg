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

  function titreReserve(scope, cle, nom, editable) {
    var tete = el("div", "pc-vital-tete pc-vital-tete-reglable");
    var titre = el("div", "pc-block-title pc-vital-titre");
    var n = el("span", "pc-vital-nom", nom);
    n.title = libCap(cle, nom);
    titre.appendChild(n);
    tete.appendChild(titre);
    if (editable === true || reserveAvecTaux(cle)) {
      tete.classList.add("pc-vital-tete-avec-rouage");
      scope.classList.add("pc-editable");
      var gear = gearBtn(scope, cle);
      gear.setAttribute("aria-label", "Modifier " + nom);
      tete.appendChild(gear);
    }
    return tete;
  }

  function ajouteBandeauTaux(scope, nom, reglages, supplement) {
    var taux = el("div", "pc-segs pc-vital-taux");
    var edition = el("div", "pc-vital-reglages pc-edit-only");
    var detail = el("div", "pc-vital-detail-taux");
    edition.appendChild(detail);
    reglages.forEach(function (reglage) {
      var libelle = reglage[0], cle = reglage[1], lire = reglage[2];
      var total = el("span", "c pc-info");
      taux.appendChild(total);
      var sources = el("div", "pc-segs pc-vital-sources");
      sources.setAttribute("role", "group");
      sources.setAttribute("aria-label", nom + " — détail " + libelle);
      var base = el("span", "c pc-info"), effets = el("span", "c pc-info");
      base.title = libelle + " · Base";
      effets.title = libelle + " · Effets";
      sources.appendChild(base);
      sources.appendChild(effets);
      var champ = champReglageVital(cle, nom + " — " + libelle + " ATR (%)",
        function () { return reglageReserveVitale(cle); }, function (v) { return v; });
      champ.placeholder = "±";
      champ.title = champ.getAttribute("aria-label");
      sources.appendChild(champ);
      detail.appendChild(sources);

      hooks.push(function () {
        var t = lire(), effet = Number(fmtP(t.eft));
        total.textContent = libelle + " " + fmtP(t.total) + " %";
        base.textContent = fmtP(t.base);
        effets.textContent = effet ? sign(effet) : "0";
      });
    });
    scope.appendChild(taux);
    if (supplement) edition.appendChild(supplement);
    scope.appendChild(edition);
  }

  function ajouteTauxReserve(scope, cle, nom) {
    var sacrifice = null;
    if (cle === "pm") {
      sacrifice = el("div", "pc-segs pc-vital-sacrifice");
      sacrifice.appendChild(el("span", "c pc-info", "Sacrifice"));
      sacrifice.appendChild(champReglageVital("sacrifice", "Sacrifice", sacrificeTellurique,
        function (v) { return clamp(Math.floor(v), 0, sacrificeTelluriqueMax()); }));
    }
    ajouteBandeauTaux(scope, nom, [["Perte", cle, function () { return detail("perte"); }],
      ["Gain", "gain_" + cle, function () { return detail("gain"); }]], sacrifice);
    function detail(sens) {
      var t = tauxReserve(cle, sens);
      return { base: 100 + t.art + t.eqp, eft: t.eft, total: t.total };
    }
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
  function provenanceEff(cle) {
    return function () {
      var t = provenanceCap(cle)();
      var e = effondrement();
      var variation = tauxMaximumEffondrement(cle).total - 100;
      if (variation) t += " · effondrement " + e + " (" + sign(variation) + " %)";
      return t;
    };
  }
  function seule(r) { var c = carteVitale(); c.appendChild(r.el); return c; }
  function buildPv() {
    return seule(reserveVitale("pv", provenanceEff("pv")));
  }
  function buildPe() {
    var r = reserveVitale("pe", provenanceEff("pe"));
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
