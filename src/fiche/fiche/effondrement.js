  // ---- 7. Effondrement ----
  //     [      EFFONDREMENT      ]
  //     [  MAX PV  ] [  MAX PE  ]
  //     REPOS          [0]
  //     SATIÉTÉ        [0]
  //     HYDRATATION    [0]
  //     EXPOSITION     [0]
  //     AUTRE          [x]   ← saisi par le joueur
  // Le niveau, puis ce qu'il laisse des deux maximums. La TABLE des dix lignes
  // du livre n'apparaît nulle part : l'infobulle du niveau décompose ce que
  // chaque réserve y apporte, et le DOM ne montre que l'état du personnage.
  function buildEffondrement() {
    // AUCUN ROUAGE : le module ne montre que l'état du personnage, et la ligne
    // « Autre » se remplit en jouant. Forcer le niveau se fait dans les Options
    // (Réglages des capacités, ligne Effondrement).
    var b = block("Effondrement");
    var tN = bigTile("EFFONDREMENT", function () { return String(effondrement()); });
    tN.classList.add("pc-eff-niveau");
    b.appendChild(tN);
    function reste(champ) {
      return 100 - clamp(num(effDef()[champ], 0) * effondrement(), 0, 100);
    }
    var r = el("div", "pc-bigrow pc-bigrow-2");
    var tV = bigTile("MAX PV", function () { return reste("pvParNiveau") + " %"; });
    var tE = bigTile("MAX PE", function () { return reste("peParNiveau") + " %"; });
    r.appendChild(tV);
    r.appendChild(tE);
    b.appendChild(r);

    // LES CAUSES, une ligne par réserve que les règles comptent, dans leur
    // ordre, puis « Autre », que le joueur remplit. Les noms sont ceux des
    // bandeaux de Survie.
    var NOMS = { pr: "Repos", ps: "Satiété", ph: "Hydratation", expo: "Exposition" };
    var causes = el("div", "pc-eff-causes");
    var vals = {};
    effReserves().forEach(function (cle) {
      var ligne = el("div", "pc-eff-cause");
      ligne.appendChild(el("span", "k", NOMS[cle] || libCap(cle, cle)));
      var v = el("span", "v", "");
      ligne.appendChild(v);
      vals[cle] = v;
      causes.appendChild(ligne);
    });
    var autre = el("div", "pc-eff-cause");
    autre.appendChild(el("span", "k", "Autre"));
    var inp = el("input", "v");
    inp.type = "number"; inp.min = "0"; inp.step = "1";
    inp.setAttribute("aria-label", "Autre effondrement");
    inp.addEventListener("input", function () {
      var n = parseInt(inp.value, 10);
      state.effAutre = isFinite(n) ? clamp(n, 0, 99) : 0;
      refresh();
    });
    autre.appendChild(inp);
    causes.appendChild(autre);
    b.appendChild(causes);

    hooks.push(function () {
      var parts = [], somme = 0;
      effReserves().forEach(function (cle) {
        var n = effNiveauDe(cle);
        somme += n;
        parts.push(libCap(cle, cle).toLowerCase() + " " + n);
        if (vals[cle]) {
          vals[cle].textContent = String(n);
          vals[cle].classList.toggle("zero", !n);
        }
      });
      var a = Math.max(0, num(state.effAutre, 0));
      if (a) { somme += a; parts.push("autre " + a); }
      if (document.activeElement !== inp) inp.value = a;
      var e = effondrement();
      tN.classList.toggle("adj", e > 0);
      tV.classList.toggle("adj", e > 0);
      tE.classList.toggle("adj", e > 0);
      tN.title = capForce("effondrement")
        ? chaineTexteDe(lireCap("max", "effondrement"), "calculé", effondrementAuto())
        : parts.join(" · ") + " = " + fmtP(somme) +
          (somme > effPlafond() ? ", plafonné à " + effPlafond() : "");
    });
    return b;
  }
