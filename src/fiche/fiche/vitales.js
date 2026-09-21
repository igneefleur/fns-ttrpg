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
  // AUCUN ROUAGE : tout ce que le module porte se JOUE. Le maximum se construit
  // dans l'onglet Options (Réglages des capacités), avec la chaîne de leviers
  // de toute la fiche.

  // Le signe moins TYPOGRAPHIQUE, comme dans sign() : à cette taille le trait
  // d'union du clavier passe pour une césure.
  function reserveFmt(n) { return n < 0 ? "−" + fmtP(-n) : fmtP(n); }

  // Rend { el, etat } : UNE réserve (bandeau, barre, geste), et la pastille
  // d'état que l'appelant remplit lui-même. La CARTE qui la porte est à part
  // (carteVitale) : PV, PE et PM en ont une chacun, PR, PS et PH en partagent
  // une.
  function carteVitale() { return el("div", "pc-block pc-vital"); }
  // `nom` remplace le sigle des règles dans le bandeau, quand la fiche en
  // veut un autre (Repos plutôt que PR) ; la clé, elle, pose la TEINTE de la
  // réserve (classe t-<clé>, couleurs dans la feuille de style).
  function reserveVitale(cle, provenance, nomAffiche) {
    var nom = nomAffiche || abbrCap(cle, cle.toUpperCase());
    var box = el("div", "pc-vital-res t-" + cle);

    var tete = el("div", "pc-vital-tete");
    var n = el("span", "pc-vital-nom", nom);
    n.title = libCap(cle, cle);
    tete.appendChild(n);
    var etat = el("span", "pc-vital-etat", "");
    tete.appendChild(etat);
    var val = el("span", "pc-vital-val");
    var inp = el("input", "pc-vital-num");
    inp.type = "number";
    inp.step = "1";
    inp.setAttribute("aria-label", libCap(cle, nom));
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      state.etat[cle] = isFinite(v) ? Math.round(v * 100) / 100 : null;
      refresh();
    });
    val.appendChild(inp);
    var mx = el("span", "pc-vital-max", "");
    val.appendChild(mx);
    tete.appendChild(val);
    box.appendChild(tete);

    var jauge = el("span", "pc-vital-jauge");
    var fill = el("i");
    jauge.appendChild(fill);
    box.appendChild(jauge);

    var cmd = el("div", "pc-vital-cmd");
    var delta = el("input", "pc-vital-delta");
    delta.type = "number";
    delta.step = "1";
    delta.placeholder = "±";
    delta.setAttribute("aria-label", libCap(cle, nom) + " à ajouter ou retirer");
    function appliqueDelta() {
      var d = parseFloat(delta.value);
      if (!isFinite(d) || !d) return;
      state.etat[cle] = Math.round((courant(cle) + d) * 100) / 100;
      delta.value = "";
      refresh();
    }
    delta.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); appliqueDelta(); }
    });
    cmd.appendChild(delta);
    cmd.appendChild(miniBtn("Appliquer", "Ajouter cette variation", appliqueDelta));
    box.appendChild(cmd);

    hooks.push(function () {
      var v = courant(cle), m = maxDe(cle);
      if (document.activeElement !== inp) inp.value = v;
      // un <input> ROGNE au lieu de déborder : sa largeur suit le nombre de
      // signes (les chiffres sont à chasse fixe)
      inp.style.width = Math.max(3.4, String(inp.value).length + 0.3) + "ch";
      mx.textContent = "/ " + fmtP(m);
      // l'accent dit un maximum réglé par un levier, ou une valeur au-dessus
      var forcee = capForce(cle), depasse = v > m;
      mx.classList.toggle("adj", forcee || depasse);
      mx.title = forcee ? chaineTexteDe(lireCap("max", cle), "calculé", autoDe(cle)) : provenance();
      // SOUS ZÉRO, la barre part de la droite et le bandeau passe au rouge
      var neg = v < 0;
      box.classList.toggle("over", neg);
      fill.classList.toggle("over", neg);
      fill.style.marginLeft = neg ? "auto" : "0";
      fill.style.width = clamp(neg ? 100 : (m > 0 ? v / m * 100 : 0), 0, 100) + "%";
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
  function buildPm() {
    return seule(reserveVitale("pm", function () { return "Maximum calculé : " + fmtP(autoDe("pm")); }));
  }
