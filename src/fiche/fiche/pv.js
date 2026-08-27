  // ---------- les points de vie ----------
  // AUCUN ROUAGE SUR LES PV. Tout ce que ce bloc porte relève du JEU : on perd
  // des points de vie en pleine partie, on revient au maximum après une nuit.
  // Ce qui se CONSTRUIT — le maximum lui-même — s'est retiré dans l'onglet
  // Options, où il a la même chaîne de leviers que tout le reste de la fiche.
  // Un rouage qui n'ouvrirait plus rien serait un bouton qui ment.

  // Le signe moins TYPOGRAPHIQUE (U+2212), comme dans sign() : à cette taille,
  // le trait d'union du clavier passe pour une césure, et un plancher de vie
  // n'a pas le droit d'être ambigu.
  function pvFmtNeg(n) { return n < 0 ? "−" + fmtP(-n) : fmtP(n); }

  // ---------- LA RÉSERVE ----------
  // TROIS RANGS, ET LE CHIFFRE EST LE PREMIER. C'est lui qu'on cherche des yeux
  // au milieu d'un combat : il passe donc en grand, au centre, entouré des deux
  // boutons qui le font bouger. Le maximum le suit en petit — on le lit une
  // fois par séance, pas dix fois par tour.
  //
  // CE QUE L'ANCIENNE FORME AVAIT CONTRE ELLE : un stepper de la taille de tous
  // les autres champs de la fiche, un « / 95 » de la même taille que la valeur,
  // un bouton « Max » qui se disputait le rang avec eux, et un filet de quatre
  // pixels pour toute jauge. Rien n'y était plus gros que le reste alors que
  // c'est la seule valeur du personnage qui change à chaque coup reçu.
  //
  // LA JAUGE PREND TOUTE LA LARGEUR ET S'ÉPAISSIT : elle se lit du coin de
  // l'œil, sans compter. Son sens dit le signe — verte, elle part de la GAUCHE
  // et montre ce qui reste ; rouge, elle part de la DROITE et montre ce qui a
  // été creusé sous zéro. Deux barres empilées obligeaient à chercher laquelle
  // bougeait avant de lire combien, et l'une des deux était toujours vide.
  //
  // LE TROISIÈME RANG NE PARAÎT QUE S'IL A QUELQUE CHOSE À DIRE : l'état
  // (« Mort », « Au tapis ») à gauche, le retour au maximum à droite.
  function pvReserve(nom, lire, ecrire, maxi, plancher, infoMax) {
    var box = el("div", "pc-res");

    // ---- le rang du chiffre ----
    var haut = el("div", "pc-res-haut");
    haut.appendChild(pvPas("−", "Un de moins", function () { ecrire(lire() - 1); refresh(); }));
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
    haut.appendChild(pvPas("+", "Un de plus", function () { ecrire(lire() + 1); refresh(); }));
    box.appendChild(haut);

    // ---- la jauge ----
    var jauge = el("span", "pc-res-jauge");
    var fill = el("i");
    jauge.appendChild(fill);
    box.appendChild(jauge);

    // ---- le rang d'état ----
    var bas = el("div", "pc-res-bas");
    var etat = el("span", "pc-res-etat", "");
    bas.appendChild(etat);
    bas.appendChild(miniBtn("Max", "Revenir au maximum", function () { ecrire(null); refresh(); }));
    box.appendChild(bas);

    hooks.push(function () {
      var v = lire(), m = maxi(), p = plancher(), i = infoMax();
      if (document.activeElement !== inp) inp.value = v;
      mx.textContent = "/ " + fmtP(m);
      mx.classList.toggle("adj", !!i.adj);
      mx.title = i.titre;
      var neg = v < 0;
      inp.classList.toggle("over", neg);
      fill.classList.toggle("over", neg);
      // la barre rouge se colle à droite : c'est la marge qui la pousse
      fill.style.marginLeft = neg ? "auto" : "0";
      fill.style.width = clamp(neg ? (p < 0 ? v / p * 100 : 0)
                                   : (m > 0 ? v / m * 100 : 0), 0, 100) + "%";
      // la jauge porte SON infobulle : c'est le seul endroit où le plancher
      // négatif se nomme, le rang du dessus n'annonçant que le maximum
      jauge.title = nom + " " + pvFmtNeg(v) + " / " + pvFmtNeg(neg ? p : m);
    });
    return { el: box, etat: etat };
  }
  // Les deux boutons du rang : plus gros que ceux d'un stepper ordinaire, parce
  // qu'on les vise vite et souvent, et qu'ils encadrent un chiffre de trois
  // fois leur taille.
  function pvPas(txt, aide, fn) {
    var b = el("button", "pc-res-pas", txt);
    b.type = "button";
    b.title = aide;
    b.addEventListener("click", fn);
    return b;
  }

  function buildPv() {
    // PAS DE TROISIÈME ARGUMENT : pas de rouage. Voir l'en-tête du fichier.
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
