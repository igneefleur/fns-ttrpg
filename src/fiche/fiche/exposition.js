  // ---- 6. Exposition ----
  // LE GRÉEMENT DES RÉSERVES (vitales.js), mais SIGNÉ :
  //
  //     ┌───────────────────────────────┐
  //     │ EXPOSITION          −30 / ±120 │  ← bandeau : l'identité et la valeur
  //     ├───────────────────────────────┤
  //     │ froid ██████|        chaud     │  ← la barre part du MILIEU
  //     │  [   ±   ]      [Appliquer]    │  ← le geste du jeu
  //     └───────────────────────────────┘
  //
  // Zéro est au centre et la barre y est vide : c'est l'état stable. Elle
  // pousse vers la gauche quand le personnage a froid, vers la droite quand il
  // a chaud, aux couleurs du froid et du chaud. Vider la valeur la remet à
  // zéro. Aucun rouage : la borne se règle dans les Options (Réglages des
  // capacités), et aucune table du froid ni du chaud n'est affichée.
  //
  // CE MODULE A ÉTÉ REFAIT parce que l'ancien lisait une variable qui n'existait
  // pas dans son rafraîchissement : il levait à chaque passage, se faisait
  // museler au cinquième (le filet rouge à sa gauche), et ses − et + semblaient
  // morts puisque plus rien ne se redessinait.
  function buildExposition() {
    var box = el("div", "pc-block pc-vital");
    var res = el("div", "pc-vital-res pc-expo-res");

    var tete = el("div", "pc-vital-tete");
    var nom = el("span", "pc-vital-nom", "Exposition");
    tete.appendChild(nom);
    var val = el("span", "pc-vital-val");
    var inp = el("input", "pc-vital-num");
    inp.type = "number";
    inp.step = "1";
    inp.setAttribute("aria-label", "Exposition");
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      state.etat.expo = isFinite(v) ? Math.round(v * 100) / 100 : 0;
      refresh();
    });
    val.appendChild(inp);
    var mx = el("span", "pc-vital-max", "");
    val.appendChild(mx);
    tete.appendChild(val);
    res.appendChild(tete);

    // la barre : un remplissage qui part du milieu, et le trait du zéro
    var jauge = el("span", "pc-vital-jauge pc-expo-jauge");
    var fill = el("i");
    jauge.appendChild(fill);
    jauge.appendChild(el("b", "pc-expo-zero"));
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
    var vZone = caseStat("idéal °C"), vInt = caseStat("intensité");

    var cmd = el("div", "pc-vital-cmd");
    var delta = el("input", "pc-vital-delta");
    delta.type = "number";
    delta.step = "1";
    delta.placeholder = "±";
    delta.setAttribute("aria-label", "Exposition à ajouter ou retirer");
    function applique() {
      var d = parseFloat(delta.value);
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
      var part = m > 0 ? clamp(Math.abs(v) / m, 0, 1) * 50 : 0;
      fill.className = v < 0 ? "froid" : v > 0 ? "chaud" : "";
      fill.style.left = (v < 0 ? 50 - part : 50) + "%";
      fill.style.width = part + "%";
      var z = zoneIdeale();
      // le VRAI moins, comme au livre : « −5 à 7 »
      function deg(n) { return fmtP(n).replace("-", "−"); }
      vZone.textContent = z ? deg(z.bas) + " à " + deg(z.haut) : "—";
      var p = paliersClimat();
      vInt.textContent = p < 0 ? "Froid " + (-p) : p > 0 ? "Chaud " + p : "Aucune";
      vInt.className = "v" + (p < 0 ? " froid" : p > 0 ? " chaud" : "");
      jauge.title = "Exposition " + (v < 0 ? "−" + fmtP(-v) : fmtP(v)) + " sur ±" + fmtP(m) +
                    " · niveau d'effondrement " + effNiveauDe("expo");
    });
    return box;
  }
