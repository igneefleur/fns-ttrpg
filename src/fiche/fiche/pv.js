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
  //     │ ███████                       │  ← la réserve
  //     │  [   ±   ]      [Appliquer]  │  ← le geste du jeu
  //     └───────────────────────────────┘
  //
  //   — LE NOM ET LA VALEUR SONT DANS UN MÊME BANDEAU, en haut, sur fond plein.
  //     Le titre souligné de rouge des autres modules annonce une LISTE ; ici il
  //     n'y a pas de liste, il y a un nombre, et le nom doit se lire avec lui.
  //     C'est ce bandeau qui dit qu'on regarde les PV — sans titre du tout, on
  //     ne le savait plus, et c'était la faute de l'essai précédent.
  //   — LA JAUGE EST UNE BARRE PLEINE, collée sous le bandeau, pleine largeur.
  //     Elle a été segmentée en vingt blocs le temps d'un essai : refusé, et le
  //     refus est écrit ici pour que personne ne le retente.
  //   — ON TAPE LA VARIATION, ON NE LA CLIQUE PAS. Des boutons de pas fixes
  //     (−5, −1, +1, +5) demandaient encore trois clics pour treize points, et
  //     n'importe quel autre nombre était hors de leur portée. Un champ prend
  //     LE nombre reçu — 13 comme −7 — et le bouton l'applique d'un coup.
  //   — UN SEUL GESTE DANS LE RANG. Un bouton « Max » y a vécu deux versions ;
  //     il est parti. LE RETOUR AU MAXIMUM N'EST PAS PERDU POUR AUTANT : vider
  //     le champ de la valeur, dans le bandeau, remet la réserve au plein —
  //     c'est ce que veut dire un « pv » nul dans l'état, et c'est le même
  //     geste que le bouton faisait. Ne pas réintroduire le bouton.
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
    // ---- les gestes du jeu ----
    // LE CHAMP PORTE UNE VARIATION, PAS UNE VALEUR. On y tape ce qu'on encaisse
    // ou ce qu'on regagne, signe compris, et le bouton l'ajoute à la réserve.
    // Il se vide alors : rien n'y reste à traîner, si bien qu'appuyer deux fois
    // de suite ne peut pas appliquer deux fois le même nombre par mégarde.
    var cmd = el("div", "pc-vital-cmd");
    var delta = el("input", "pc-vital-delta");
    delta.type = "number";
    delta.step = "1";
    delta.placeholder = "±";
    delta.setAttribute("aria-label", nom + " à ajouter ou retirer");
    function appliqueDelta() {
      var d = parseFloat(delta.value);
      if (!isFinite(d) || !d) return;      // vide, illisible ou zéro : rien à faire
      ecrire(lire() + Math.round(d));
      delta.value = "";
      refresh();
    }
    // ENTRÉE VAUT LE BOUTON : on tape le nombre et on valide sans quitter le
    // clavier, ce qui est le geste réel en pleine partie.
    delta.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); appliqueDelta(); }
    });
    cmd.appendChild(delta);
    cmd.appendChild(miniBtn("Appliquer", "Ajouter cette variation", appliqueDelta));
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
