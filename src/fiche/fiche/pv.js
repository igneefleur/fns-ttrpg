  // ---------- les réserves : PV et endurance ----------
  // PAS DE CADRE DE MODULE ORDINAIRE, et c'est le premier changement. Les
  // autres blocs portent leur titre en haut à gauche, souligné de rouge, avec
  // le contenu dessous : c'est juste pour une LISTE, où le titre annonce des
  // rangs. Une réserve n'est pas une liste — c'est UN nombre, et le nom de ce
  // nombre tient sur la même ligne que lui.
  //
  // AUCUN ROUAGE SUR LES PV non plus. Tout ce que la carte porte relève du
  // JEU : on perd des points de vie en pleine partie, on revient au maximum
  // après une nuit. Ce qui se CONSTRUIT — le maximum — s'est retiré dans
  // l'onglet Options, où il a la même chaîne de leviers que le reste de la
  // fiche. Un rouage qui n'ouvrirait plus rien serait un bouton qui ment.

  // Le signe moins TYPOGRAPHIQUE (U+2212), comme dans sign() : à cette taille,
  // le trait d'union du clavier passe pour une césure, et un plancher de vie
  // n'a pas le droit d'être ambigu.
  function pvFmtNeg(n) { return n < 0 ? "−" + fmtP(-n) : fmtP(n); }

  // ---------- LA CARTE D'UNE RÉSERVE ----------
  // DEUX RANGS, ET LA JAUGE EST LE SECOND. Le nom en petites capitales, le
  // nombre en grand, les commandes à droite ; puis la jauge, PLEINE LARGEUR et
  // collée au bord bas de la carte — elle en devient le socle plutôt qu'une
  // ligne de plus au milieu du contenu.
  //
  // Son sens dit le signe : verte, elle part de la GAUCHE et montre ce qui
  // reste ; rouge, elle part de la DROITE et montre ce qui a été creusé sous
  // zéro. Deux barres empilées obligeaient à chercher laquelle bougeait avant
  // de lire combien, et l'une des deux était toujours vide.
  //
  // « coin » reçoit ce qui doit se poser en haut à droite — le rouage de
  // l'endurance, le temps qu'elle ait sa chaîne elle aussi.
  function pvReserve(nom, lire, ecrire, maxi, plancher, infoMax, coin) {
    var carte = el("div", "pc-block pc-res");

    var haut = el("div", "pc-res-haut");
    haut.appendChild(el("span", "pc-res-nom", nom));

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
    haut.appendChild(val);

    // LES COMMANDES SONT DES BOUTONS ORDINAIRES : ils étaient devenus énormes
    // pour équilibrer un chiffre qu'on venait de doubler, ce qui n'équilibrait
    // rien du tout — un bouton n'a pas à grossir parce que son voisin grossit.
    var cmd = el("span", "pc-res-cmd");
    cmd.appendChild(pvPas("−", "Un de moins", function () { ecrire(lire() - 1); refresh(); }));
    cmd.appendChild(pvPas("+", "Un de plus", function () { ecrire(lire() + 1); refresh(); }));
    cmd.appendChild(miniBtn("Max", "Revenir au maximum", function () { ecrire(null); refresh(); }));
    if (coin) cmd.appendChild(coin);
    haut.appendChild(cmd);
    carte.appendChild(haut);

    // L'ÉTAT NE PARAÎT QUE S'IL A QUELQUE CHOSE À DIRE : vide, il ne prend ni
    // place ni marge (voir .pc-res-etat:empty).
    var etat = el("span", "pc-res-etat", "");
    carte.appendChild(etat);

    var jauge = el("span", "pc-res-jauge");
    var fill = el("i");
    jauge.appendChild(fill);
    carte.appendChild(jauge);

    hooks.push(function () {
      var v = lire(), m = maxi(), p = plancher(), i = infoMax();
      if (document.activeElement !== inp) inp.value = v;
      mx.textContent = "/ " + fmtP(m);
      mx.classList.toggle("adj", !!i.adj);
      mx.title = i.titre;
      var neg = v < 0;
      inp.classList.toggle("over", neg);
      carte.classList.toggle("over", neg);
      fill.classList.toggle("over", neg);
      // la barre rouge se colle à droite : c'est la marge qui la pousse
      fill.style.marginLeft = neg ? "auto" : "0";
      fill.style.width = clamp(neg ? (p < 0 ? v / p * 100 : 0)
                                   : (m > 0 ? v / m * 100 : 0), 0, 100) + "%";
      // la jauge porte SON infobulle : c'est le seul endroit où le plancher
      // négatif se nomme, le rang du dessus n'annonçant que le maximum
      jauge.title = nom + " " + pvFmtNeg(v) + " / " + pvFmtNeg(neg ? p : m);
    });
    return { el: carte, etat: etat };
  }
  // Les deux pas : la taille d'un bouton de stepper, pas davantage.
  function pvPas(txt, aide, fn) {
    var b = el("button", "pc-res-pas", txt);
    b.type = "button";
    b.title = aide;
    b.addEventListener("click", fn);
    return b;
  }

  function buildPv() {
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
    // un ÉTAT du personnage, et rien d'autre : un fait sur lui, au même titre
    // que ses PV. La règle qui le produit n'a pas à être ici.
    hooks.push(function () {
      r.etat.textContent = pvMort() ? "Mort" : "";
      r.etat.classList.toggle("grave", pvMort());
    });
    return r.el;
  }
