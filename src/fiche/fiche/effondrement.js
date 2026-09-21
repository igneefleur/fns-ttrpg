  // ---- 7. Effondrement ----
  // Le calcul que la fiche rend le mieux : quatre réserves qui s'usent, un
  // niveau par tranche perdue, et deux maximums qui descendent. La TABLE des
  // dix lignes du livre n'apparaît nulle part : c'est l'infobulle qui
  // décompose, et le DOM ne montre que l'état du personnage.
  function buildEffondrement() {
    var b = block("Effondrement", null, "effondrement");
    var r = el("div", "pc-bigrow pc-bigrow-2");
    var tN = bigTile("EFFONDREMENT", function () { return String(effondrement()); });
    tN.classList.add("pc-mods-host");
    tuileForce(tN, "effondrement", effondrementAuto,
      "Vide = niveau calculé sur les réserves ; une valeur le force.");
    tuileMods(tN, "effondrement");
    r.appendChild(tN);
    var tM = bigTile("MAXIMUMS", function () {
      var pe = num(effDef().peParNiveau, 0) * effondrement();
      var pv = num(effDef().pvParNiveau, 0) * effondrement();
      return (100 - clamp(pe, 0, 100)) + " % / " + (100 - clamp(pv, 0, 100)) + " %";
    });
    tM.title = "Ce qu'il reste du maximum de points d'endurance et de points de vie.";
    r.appendChild(tM);
    b.appendChild(r);

    // Une ligne par réserve contributrice, dans l'ordre que les règles donnent.
    var outils = el("div", "pc-comp-tools");
    var lignes = {};
    effReserves().forEach(function (cle) {
      var row = el("div", "row");
      var nom = el("span", "pc-comp-name");
      nom.appendChild(el("span", "pc-comp-label", libCap(cle, cle)));
      row.appendChild(nom);
      var tot = el("span", "pc-comp-total", "");
      row.appendChild(tot);
      lignes[cle] = tot;
      outils.appendChild(row);
    });
    b.appendChild(outils);

    var pied = el("div", "pc-comp-tools");
    var lg = el("div", "row");
    lg.appendChild(chatBtn(
      function () { return "Effondrement — niveau " + effondrement(); },
      function () {
        var out = effReserves().map(function (cle) {
          return [libCap(cle, cle), String(effNiveauDe(cle))];
        });
        var pe = num(effDef().peParNiveau, 0) * effondrement();
        var pv = num(effDef().pvParNiveau, 0) * effondrement();
        out.push(["Maximums", "PE " + (100 - clamp(pe, 0, 100)) + " % · PV " + (100 - clamp(pv, 0, 100)) + " %"]);
        return out;
      }));
    pied.appendChild(lg);
    b.appendChild(pied);

    hooks.push(function () {
      var parts = [], somme = 0;
      effReserves().forEach(function (cle) {
        var n = effNiveauDe(cle);
        somme += n;
        parts.push(libCap(cle, cle).toLowerCase() + " " + n);
        if (lignes[cle]) {
          lignes[cle].textContent = String(n);
          lignes[cle].classList.toggle("zero", !n);
        }
      });
      tN.classList.toggle("adj", effondrement() > 0);
      tN.title = capForce("effondrement")
        ? chaineTexteDe(lireCap("max", "effondrement"), "calculé", effondrementAuto())
        : parts.join(" · ") + " = " + fmtP(somme) +
          (somme > effPlafond() ? ", plafonné à " + effPlafond() : "");
    });
    return b;
  }

