  // ---- 7. Effondrement ----
  //     [      EFFONDREMENT      ]
  //     [  MAX PV  ] [  MAX PE  ]
  // Le niveau, puis ce qu'il laisse des deux maximums. La TABLE des dix lignes
  // du livre n'apparaît nulle part : l'infobulle du niveau décompose ce que
  // chaque réserve y apporte, et le DOM ne montre que l'état du personnage.
  function buildEffondrement() {
    var b = block("Effondrement", null, "effondrement");
    var tN = bigTile("EFFONDREMENT", function () { return String(effondrement()); });
    tN.classList.add("pc-mods-host", "pc-eff-niveau");
    tuileForce(tN, "effondrement", effondrementAuto,
      "Vide = niveau calculé sur les réserves ; une valeur le force.");
    tuileMods(tN, "effondrement");
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

    hooks.push(function () {
      var parts = [], somme = 0;
      effReserves().forEach(function (cle) {
        var n = effNiveauDe(cle);
        somme += n;
        parts.push(libCap(cle, cle).toLowerCase() + " " + n);
      });
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
