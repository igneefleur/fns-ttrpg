  // ---------- les réserves : PV et endurance ----------
  // LE CADRE EST CELUI DE TOUS LES AUTRES MODULES, titre en haut à gauche et
  // filet rouge dessous. J'ai essayé de l'en sortir — nom en petites capitales
  // sur la ligne du nombre, carte sans titre — et c'était une faute : le titre
  // n'est pas une décoration, c'est ce qui dit qu'on regarde les PV. Sans lui on
  // ne sait plus ce qu'on lit.
  //
  // CE QUI CHANGE EST DEDANS, et rien d'autre :
  //   — UN SEUL RANG : moins, la valeur, son maximum, plus, et le retour au
  //     maximum poussé à droite. L'ancienne forme les éparpillait sur deux rangs
  //     dont l'un ne portait qu'une barre de quatre pixels ;
  //   — LA VALEUR EST PLUS GROSSE que les autres champs de la fiche, sans être
  //     énorme : c'est la seule qui change à chaque coup reçu, mais elle
  //     n'écrase pas ses voisines pour autant ;
  //   — LA JAUGE EST DANS LE CONTENU, pleine largeur, à sa place sous le rang
  //     qu'elle résume. Elle faisait 84 px de large et 4 px de haut, perdue au
  //     bout d'une ligne.
  //
  // AUCUN ROUAGE SUR LES PV. Tout ce que le bloc porte relève du JEU : on perd
  // des points de vie en pleine partie, on revient au maximum après une nuit. Ce
  // qui se CONSTRUIT — le maximum — s'est retiré dans l'onglet Options, où il a
  // la même chaîne de leviers que le reste de la fiche.

  // Le signe moins TYPOGRAPHIQUE (U+2212), comme dans sign() : à cette taille,
  // le trait d'union du clavier passe pour une césure, et un plancher de vie
  // n'a pas le droit d'être ambigu.
  function pvFmtNeg(n) { return n < 0 ? "−" + fmtP(-n) : fmtP(n); }

  // Rend { el, etat } : le corps de la réserve, et la pastille d'état que le
  // module remplit lui-même (« Mort », « Au tapis »).
  function pvReserve(nom, lire, ecrire, maxi, plancher, infoMax) {
    var box = el("div", "pc-res");

    var rang = el("div", "pc-res-rang");
    rang.appendChild(pvPas("−", "Un de moins", function () { ecrire(lire() - 1); refresh(); }));

    var val = el("span", "pc-res-val");
    var inp = el("input", "pc-res-num");
    inp.type = "number";
    inp.step = "1";
    inp.setAttribute("aria-label", nom);
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      // vide = « au maximum » : c'est ainsi que l'état dit qu'aucun point n'a
      // encore été perdu, et le maximum peut alors bouger sans traîner
      ecrire(isFinite(v) ? v : null);
      refresh();
    });
    val.appendChild(inp);
    var mx = el("span", "pc-res-max", "");
    val.appendChild(mx);
    rang.appendChild(val);

    rang.appendChild(pvPas("+", "Un de plus", function () { ecrire(lire() + 1); refresh(); }));
    var etat = el("span", "pc-res-etat", "");
    rang.appendChild(etat);
    rang.appendChild(miniBtn("Max", "Revenir au maximum", function () { ecrire(null); refresh(); }));
    box.appendChild(rang);

    var jauge = el("span", "pc-res-jauge");
    var fill = el("i");
    jauge.appendChild(fill);
    box.appendChild(jauge);

    hooks.push(function () {
      var v = lire(), m = maxi(), p = plancher(), i = infoMax();
      if (document.activeElement !== inp) inp.value = v;
      mx.textContent = "/ " + fmtP(m);
      mx.classList.toggle("adj", !!i.adj);
      mx.title = i.titre;
      // SOUS ZÉRO, LA JAUGE SE RETOURNE : verte, elle part de la GAUCHE et
      // montre ce qui reste ; rouge, elle part de la DROITE et montre ce qui a
      // été creusé. Deux barres empilées obligeaient à chercher laquelle
      // bougeait avant de lire combien, et l'une était toujours vide.
      var neg = v < 0;
      inp.classList.toggle("over", neg);
      fill.classList.toggle("over", neg);
      fill.style.marginLeft = neg ? "auto" : "0";
      fill.style.width = clamp(neg ? (p < 0 ? v / p * 100 : 0)
                                   : (m > 0 ? v / m * 100 : 0), 0, 100) + "%";
      // la jauge porte SON infobulle : c'est le seul endroit où le plancher
      // négatif se nomme, le rang du dessus n'annonçant que le maximum
      jauge.title = nom + " " + pvFmtNeg(v) + " / " + pvFmtNeg(neg ? p : m);
    });
    return { el: box, etat: etat };
  }
  // Les deux pas, à la taille d'un bouton de stepper : ils ne grossissent pas
  // parce que la valeur a grossi.
  function pvPas(txt, aide, fn) {
    var b = el("button", "pc-res-pas", txt);
    b.type = "button";
    b.title = aide;
    b.addEventListener("click", fn);
    return b;
  }

  function buildPv() {
    // PAS DE TROISIÈME ARGUMENT : le cadre, oui ; le rouage, non.
    var b = block("PV");
    var r = pvReserve("PV", pvCourant, function (v) { state.pv = v; },
                      pvMax, pvPlancher, function () {
      var pose = levierRegleDe(lireReserve("pvMax"));
      return {
        adj: pose,
        titre: pose
          ? chaineTexteDe(lireReserve("pvMax"), "des règles", pvMaxAuto())
          : ""
      };
    });
    b.appendChild(r.el);
    // un ÉTAT du personnage, et rien d'autre : un fait sur lui, au même titre
    // que ses PV. La règle qui le produit n'a pas à être ici.
    hooks.push(function () {
      r.etat.textContent = pvMort() ? "Mort" : "";
      r.etat.classList.toggle("grave", pvMort());
    });
    return b;
  }
