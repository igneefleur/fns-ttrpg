  // ---- Effondrement : huit causes, lecture seule et commande de variation ----
  function buildEffondrement() {
    var b = block("Effondrement");
    function reste(champ) { return 100 - clamp(num(effDef()[champ], 0) * effondrement(), 0, 100); }
    var r = el("div", "pc-bigrow pc-bigrow-2");
    var tV = bigTile("MAX PV", function () { return reste("pvParNiveau") + " %"; });
    var tE = bigTile("MAX PE", function () { return reste("peParNiveau") + " %"; });
    r.appendChild(tV); r.appendChild(tE); b.appendChild(r);
    var tN = bigTile("EFFONDREMENT", function () { return String(effondrement()); });
    tN.classList.add("pc-eff-niveau"); b.appendChild(tN);
    var grille = el("div", "pc-eff-grille"), vues = [];
    [["pr", "Repos"], ["pi", "Innocence"], ["froid", "Froid"], ["chaud", "Chaud"],
     ["ps", "Satiété"], ["ph", "Hydratation"], ["alcool", "Alcool"], ["autre", "Autre"]].forEach(function (d) {
      var cle = d[0], nom = d[1];
      var carte = el("div", "pc-eff-partie t-" + cle); carte.dataset.effPartie = cle;
      carte.appendChild(el("span", "k", nom));
      var valeur = el("div", "pc-eff-lecture");
      var total = el("span", "pc-eff-partie-total"); valeur.appendChild(total);
      valeur.appendChild(el("span", "pc-vital-max", "/ 10")); carte.appendChild(valeur);
      var jauge = el("span", "pc-vital-jauge"), fill = el("i");
      jauge.appendChild(fill); carte.appendChild(jauge);
      var champs = el("div", "pc-segs pc-eff-champs");
      function lecture(label) {
        var cellule = el("label", "c pc-eff-champ"); cellule.appendChild(el("span", "pc-eff-legende", label));
        var champ = champNombreSigne(el("input", "pc-eff-valeur"));
        champ.readOnly = true; champ.setAttribute("aria-label", nom + " — " + label);
        cellule.appendChild(champ); champs.appendChild(cellule); return champ;
      }
      var base = lecture("Base"), effets = lecture("Effets");
      base.title = "Niveau calculé depuis la réserve ou l’état du personnage.";
      effets.title = "Bonus/malus des effets ; lecture seule.";
      var mod = champNombreSigne(el("input", "c pc-eff-delta"));
      mod.placeholder = "±"; mod.setAttribute("aria-label", nom + " — ±");
      mod.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        var n = litNombreSigne(mod.value);
        if (!isFinite(n) || !Number.isInteger(n) || !n) return;
        if (cle === "autre") state.effAutre = clamp(num(state.effAutre, 0) + n, -999, 999);
        else {
          if (!state.effParties[cle]) state.effParties[cle] = { effet: 0, mod: 0 };
          state.effParties[cle].mod = clamp(num(state.effParties[cle].mod, 0) + n, -999, 999);
        }
        mod.value = ""; refresh();
      });
      champs.appendChild(mod); carte.appendChild(champs); grille.appendChild(carte);
      vues.push({cle: cle, carte: carte, total: total, base: base, effets: effets, mod: mod, fill: fill});
    });
    b.appendChild(grille);
    hooks.push(function () {
      vues.forEach(function (v) {
        var brut = effBasePartie(v.cle), niveau = effPartie(v.cle);
        var ecart = pub("effondrementPartie", brut + num(effReglage(v.cle).effet, 0), { cle: v.cle, base: brut }) - brut;
        var ajustement = v.cle === "autre" ? num(state.effAutre, 0) : num(effReglage(v.cle).mod, 0);
        v.base.value = brut;
        v.effets.value = ecart ? sign(ecart).replace("−", "-") : "0";
        v.total.textContent = String(niveau);
        v.fill.style.width = clamp(niveau * 10, 0, 100) + "%";
        v.fill.style.marginLeft = v.cle === "froid" ? "auto" : "0";
        v.mod.title = "Variation à appliquer avec Entrée. Ajustement actuel : " + sign(ajustement);
        v.carte.title = "Base " + brut + " ; effets " + sign(ecart) + " ; ajustement " + sign(ajustement);
      });
      var e = effondrement();
      [tN, tV, tE].forEach(function (t) { t.classList.toggle("adj", e > 0); });
      tN.title = capForce("effondrement")
        ? chaineTexteDe(lireCap("max", "effondrement"), "calculé", effondrementAuto())
        : "Somme après effets et ajustements : " + effPartie("total") + " ; plafond " + effPlafond();
    });
    return b;
  }
