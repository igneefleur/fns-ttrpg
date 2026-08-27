  // ---------- les réserves : PV et endurance ----------
  // MODULE ENTIÈREMENT REFAIT, et non retouché. Il a fallu trois essais pour
  // comprendre que « changer le style » ne voulait dire ni « grossir les
  // boutons », ni « sortir le module de la feuille », ni « changer la barre » :
  // il voulait dire refaire le module.
  //
  // CE QU'IL EST DEVENU :
  //
  //     ┌───────────────────────────────┐
  //     │ PV                   40 / 119 │  ← BANDEAU : l'identité et la valeur
  //     ├───────────────────────────────┤
  //     │ ▪▪▪▪▪▪▪▫▫▫▫▫▫▫▫▫▫▫▫▫          │  ← la réserve, en blocs
  //     │  −5  −1  +1  +5        [Max]  │  ← les gestes du jeu
  //     └───────────────────────────────┘
  //
  //   — LE NOM ET LA VALEUR SONT DANS UN MÊME BANDEAU, en haut, sur fond plein.
  //     Le titre souligné de rouge des autres modules annonce une LISTE ; ici il
  //     n'y a pas de liste, il y a un nombre, et le nom doit se lire avec lui.
  //     C'est ce bandeau qui dit qu'on regarde les PV — sans titre du tout, on
  //     ne le savait plus, et c'était la faute de l'essai précédent.
  //   — LA JAUGE EST EN BLOCS, collée sous le bandeau, pleine largeur. Un trait
  //     continu se lit comme un chargement ; des blocs se comptent, et le bloc
  //     est la même unité que les points qu'on perd un par un.
  //   — QUATRE PAS AU LIEU DE DEUX. On encaisse douze points de dégâts, pas un :
  //     cliquer douze fois sur « − » n'était pas un geste de jeu. −5 et +5
  //     s'ajoutent aux unités, et « Max » ferme le rang.
  //   — SOUS ZÉRO, LE BANDEAU ENTIER PASSE AU ROUGE. C'est un état du
  //     personnage ; le dire par un seul chiffre rouge, c'était le murmurer.
  //
  // AUCUN ROUAGE SUR LES PV. Tout ce que le module porte relève du JEU : on perd
  // des points de vie en pleine partie, on revient au maximum après une nuit. Ce
  // qui se CONSTRUIT — le maximum — s'est retiré dans l'onglet Options, où il a
  // la même chaîne de leviers que le reste de la fiche.

  // Le signe moins TYPOGRAPHIQUE (U+2212), comme dans sign() : à cette taille,
  // le trait d'union du clavier passe pour une césure, et un plancher de vie
  // n'a pas le droit d'être ambigu.
  function pvFmtNeg(n) { return n < 0 ? "−" + fmtP(-n) : fmtP(n); }

  // Rend { el, etat } : le module entier, et la pastille d'état que l'appelant
  // remplit lui-même (« Mort », « Au tapis »).
  function pvReserve(nom, lire, ecrire, maxi, plancher, infoMax) {
    var box = el("div", "pc-block pc-vital");

    // ---- le bandeau : l'identité et la valeur ----
    var tete = el("div", "pc-vital-tete");
    tete.appendChild(el("span", "pc-vital-nom", nom));
    var etat = el("span", "pc-vital-etat", "");
    tete.appendChild(etat);
    var val = el("span", "pc-vital-val");
    var inp = el("input", "pc-vital-num");
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
    var mx = el("span", "pc-vital-max", "");
    val.appendChild(mx);
    tete.appendChild(val);
    box.appendChild(tete);

    // ---- la réserve, en blocs ----
    var jauge = el("span", "pc-vital-jauge");
    var fill = el("i");
    jauge.appendChild(fill);
    box.appendChild(jauge);

    // ---- les gestes du jeu ----
    var cmd = el("div", "pc-vital-cmd");
    [[-5, "Cinq de moins"], [-1, "Un de moins"],
     [1, "Un de plus"], [5, "Cinq de plus"]].forEach(function (p) {
      cmd.appendChild(pvPas(p[0], p[1], function () { ecrire(lire() + p[0]); refresh(); }));
    });
    cmd.appendChild(miniBtn("Max", "Revenir au maximum", function () { ecrire(null); refresh(); }));
    box.appendChild(cmd);

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
      box.classList.toggle("over", neg);
      fill.classList.toggle("over", neg);
      fill.style.marginLeft = neg ? "auto" : "0";
      fill.style.width = clamp(neg ? (p < 0 ? v / p * 100 : 0)
                                   : (m > 0 ? v / m * 100 : 0), 0, 100) + "%";
      // la jauge porte SON infobulle : c'est le seul endroit où le plancher
      // négatif se nomme, le bandeau n'annonçant que le maximum
      jauge.title = nom + " " + pvFmtNeg(v) + " / " + pvFmtNeg(neg ? p : m);
    });
    return { el: box, etat: etat };
  }
  // Un pas : le nombre qu'il ajoute est SON libellé. « −5 » dit ce qu'il fait,
  // là où une flèche demande de deviner de combien.
  function pvPas(n, aide, fn) {
    var b = el("button", "pc-vital-pas", n > 0 ? "+" + n : "−" + Math.abs(n));
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
    });
    return r.el;
  }
