  // ---- 6. Exposition ----
  // Zéro vide ; chaud depuis la gauche, froid depuis la droite, sur toute la largeur.
  function buildExposition() {
    var box = el("div", "pc-block pc-vital");
    var res = el("div", "pc-vital-res pc-expo-res");

    var tete = el("div", "pc-vital-tete");
    var nom = el("span", "pc-vital-nom", "Exposition");
    tete.appendChild(nom);
    var val = el("span", "pc-vital-val");
    var inp = el("input", "pc-vital-num");
    champNombreSigne(inp);
    inp.step = "1";
    inp.setAttribute("aria-label", "Exposition");
    inp.addEventListener("input", function () {
      var v = litNombreSigne(inp.value);
      state.etat.expo = isFinite(v) ? Math.round(v * 100) / 100 : 0;
      refresh();
    });
    val.appendChild(inp);
    var mx = el("span", "pc-vital-max", "");
    val.appendChild(mx);
    tete.appendChild(val);
    res.appendChild(tete);

    // Même échelle de 0 à 100 % pour chaque sens de remplissage.
    var jauge = el("span", "pc-vital-jauge pc-expo-jauge");
    var fill = el("i");
    jauge.appendChild(fill);
    for (var palier = 1; palier < 10; palier++) {
      var trait = el("span", "pc-vital-palier");
      trait.style.left = (palier * 10) + "%";
      trait.setAttribute("aria-hidden", "true"); jauge.appendChild(trait);
    }
    res.appendChild(jauge);

    // LA ZONE IDÉALE (en température de l'air, selon l'effort du module
    // Effort et Temps) et l'INTENSITÉ de froid ou de chaud qu'il subit
    var stat = el("div", "pc-stat pc-expo-stat");
    function caseStat(k) {
      var c = el("div", "c"), v = el("span", "v", "");
      c.appendChild(v);
      c.appendChild(el("span", "k", k));
      stat.appendChild(c);
      return v;
    }
    var vZone = caseStat("idéal °C"), vInt = caseStat("intensité"), vRes = caseStat("résorption");
    vRes.setAttribute("aria-label", "Prochaine résorption naturelle");
    vRes.title = "Points de résorption naturelle à la prochaine tranche favorable complète";

    var cmd = el("div", "pc-vital-cmd");
    var delta = el("input", "pc-vital-delta");
    champNombreSigne(delta);
    delta.step = "1";
    delta.placeholder = "±";
    delta.setAttribute("aria-label", "Exposition à ajouter ou retirer");
    function applique() {
      var d = litNombreSigne(delta.value);
      if (!isFinite(d) || !d) return;
      var m = expoMax();
      state.etat.expo = Math.round(clamp(num(state.etat.expo, 0) + d, -m, m) * 100) / 100;
      delta.value = "";
      refresh();
    }
    delta.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); applique(); }
    });
    cmd.appendChild(delta);
    cmd.appendChild(miniBtn("Appliquer", "Ajouter cette variation", applique));
    res.appendChild(cmd);
    // sous le geste : la barre, puis [± Appliquer], puis la zone et l'intensité
    res.appendChild(stat);
    box.appendChild(res);

    hooks.push(function () {
      var m = expoMax(), v = num(state.etat.expo, 0);
      if (document.activeElement !== inp) inp.value = v;
      inp.style.width = Math.max(3.4, String(inp.value).length + 0.3) + "ch";
      mx.textContent = "/ ±" + fmtP(m);
      mx.classList.toggle("adj", capForce("expo") || Math.abs(v) > m);
      mx.title = capForce("expo")
        ? chaineTexteDe(lireCap("max", "expo"), "calculé", expoMaxAuto())
        : provenanceCap("expo")();
      var part = m > 0 ? clamp(Math.abs(v) / m, 0, 1) * 100 : 0;
      fill.className = v < 0 ? "froid" : v > 0 ? "chaud" : "";
      fill.style.left = (v < 0 ? 100 - part : 0) + "%";
      fill.style.width = part + "%";
      jauge.querySelectorAll(".pc-vital-palier").forEach(function (trait) {
        var position = parseFloat(trait.style.left);
        trait.classList.toggle("plein", part > 0 && (v < 0 ? position >= 100 - part : position <= part));
      });
      var z = zoneIdeale();
      // le VRAI moins, comme au livre : « −5 à 7 »
      function deg(n) { return fmtP(n).replace("-", "−"); }
      vZone.textContent = z ? deg(z.bas) + " à " + deg(z.haut) : "—";
      var p = paliersClimat();
      vInt.textContent = p < 0 ? "Froid " + (-p) : p > 0 ? "Chaud " + p : "Aucune";
      vInt.className = "v" + (p < 0 ? " froid" : p > 0 ? " chaud" : "");
      var t=tempsDef(), r=t&&t.resorption, active=r&&resorptionApplicable(v,p);
      vRes.textContent=active ? fmtP(Math.min(r.max,r.depart+Math.floor(secondesHorlogeProcessus("horlogeExposition")/(t.tranche*60))*r.increment)) : "—";
      jauge.title = "Exposition " + (v < 0 ? "−" + fmtP(-v) : fmtP(v)) + " sur ±" + fmtP(m) +
                    " · niveau d'effondrement " + effNiveauDe("expo");
    });
    return box;
  }
