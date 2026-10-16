  // ---- Effondrement : bases réelles, niveaux après effets, ajustements de jeu ----
  function buildEffondrement() {
    var b = block("Effondrement");
    function reste(champ) {
      return 100 - clamp(num(effDef()[champ], 0) * effondrement(), 0, 100);
    }
    var r = el("div", "pc-bigrow pc-bigrow-2");
    var tV = bigTile("MAX PV", function () { return reste("pvParNiveau") + " %"; });
    var tE = bigTile("MAX PE", function () { return reste("peParNiveau") + " %"; });
    r.appendChild(tV); r.appendChild(tE); b.appendChild(r);
    var tN = bigTile("EFFONDREMENT", function () { return String(effondrement()); });
    tN.classList.add("pc-eff-niveau"); b.appendChild(tN);

    var grille = el("div", "pc-eff-grille"), vues = [];
    [["pr", "Repos"], ["expo", "Exposition"], ["ps", "Satiété"],
     ["ph", "Hydratation"], ["pi", "Innocence"], ["alcool", "Alcool"], ["total", "Total"]].forEach(function (d) {
      var cle = d[0], nom = d[1];
      var carte = el("div", "pc-eff-partie"); carte.dataset.effPartie = cle;
      var titre = el("div", "pc-eff-partie-titre");
      titre.appendChild(el("span", null, nom));
      var total = el("b", "pc-eff-partie-total"); titre.appendChild(total); carte.appendChild(titre);
      var effets = el("div", "pc-eff-consequences"); carte.appendChild(effets);
      var champs = el("div", "pc-eff-champs");
      function champ(label, aide, lecture) {
        var boite = el("label", "pc-eff-champ");
        boite.appendChild(el("span", null, label));
        var inp = champNombreSigne(el("input", "pc-eff-valeur"));
        inp.setAttribute("aria-label", nom + " — " + label); inp.title = aide;
        inp.readOnly = !!lecture; boite.appendChild(inp); champs.appendChild(boite); return inp;
      }
      var base = champ("Base", cle === "alcool" ? "Niveaux d’alcool réels. Un niveau disparaît toutes les 2 heures." : cle === "pi" ? "Niveau d’effondrement lié à l’innocence, réglé manuellement." : "Niveau réel avant effets et ajustements.", cle !== "alcool" && cle !== "pi");
      var apres = champ("Effets", "Bonus ou malus d’effondrement dû aux effets. Vide = aucun ajustement manuel.", false);
      var mod = champ("±", "Ajustement manuel supplémentaire, positif ou négatif. Il ne change pas le niveau réel.", false);
      mod.placeholder = "±";
      function entree(inp, fn) {
        inp.addEventListener("input", function () {
          var vide = inp.value.trim() === "", n = litNombreSigne(inp.value);
          if (!vide && (!isFinite(n) || !Number.isInteger(n))) return;
          fn(vide ? null : clamp(n, -999, 999)); refresh();
        });
      }
      if (cle === "alcool") entree(base, function (n) {
        var ancien = num(state.effAlcool, 0);
        state.effAlcool = Math.max(0, n || 0);
        if (!ancien || !state.effAlcool) state.effAlcoolSecondes = 0;
      });
      function reglage() {
        if (!state.effParties[cle]) state.effParties[cle] = { effet: 0, mod: 0 };
        return state.effParties[cle];
      }
      if (cle === "pi") entree(base, function (n) { reglage().base = Math.max(0, n || 0); });
      entree(apres, function (n) {
        var baseEffet = cle === "total" ? EFF_PARTIES.reduce(function (t, k) { return t + effPartie(k); }, 0) : effBasePartie(cle);
        var effetExterne = pub("effondrementPartie", baseEffet + num(reglage().effet, 0), { cle: cle, base: baseEffet }) - baseEffet - num(reglage().effet, 0);
        reglage().effet = n === null ? 0 : clamp(n - effetExterne, -999, 999);
      });
      entree(mod, function (n) {
        if (cle === "total") state.effAutre = n || 0;
        else reglage().mod = n || 0;
      });
      carte.appendChild(champs);
      var horloge = el("div", "pc-eff-horloge");
      if (cle === "alcool") carte.appendChild(horloge);
      grille.appendChild(carte); vues.push({ cle: cle, base: base, apres: apres, mod: mod, total: total, effets: effets, horloge: horloge });
    });
    b.appendChild(grille);
    hooks.push(function () {
      vues.forEach(function (v) {
        var cle = v.cle, brut = effBasePartie(cle), apres = effApresEffets(cle);
        var niveau = cle === "total" ? effondrement() : effPartie(cle);
        var mod = cle === "total" ? num(state.effAutre, 0) : num(effReglage(cle).mod, 0);
        if (document.activeElement !== v.base) v.base.value = brut;
        var baseEffet = cle === "total" ? EFF_PARTIES.reduce(function (t, k) { return t + effPartie(k); }, 0) : brut;
        var ecartEffet = pub("effondrementPartie", baseEffet + num(effReglage(cle).effet, 0), { cle: cle, base: baseEffet }) - baseEffet;
        if (document.activeElement !== v.apres) v.apres.value = ecartEffet ? sign(ecartEffet).replace("−", "-") : "0";
        if (document.activeElement !== v.mod) v.mod.value = mod ? sign(mod).replace("−", "-") : "";
        v.total.textContent = String(niveau);
        if (cle === "alcool") {
          v.effets.textContent = "";
          var restant = Math.max(0, 7200 - num(state.effAlcoolSecondes, 0));
          var minutes = Math.ceil(restant / 60);
          v.horloge.textContent = brut > 0 ? "−1 · " + Math.floor(minutes / 60) + " h " + (minutes % 60 ? (minutes % 60) + " min" : "") : "";
        } else {
          v.effets.textContent = "";
          if (niveau) {
            v.effets.appendChild(el("span", null, "PV −" + clamp(niveau * num(effDef().pvParNiveau, 0), 0, 100) + " %"));
            v.effets.appendChild(el("span", null, "PE −" + clamp(niveau * num(effDef().peParNiveau, 0), 0, 100) + " %"));
          }
          if (cle === "total" && peMax() <= 0) v.effets.appendChild(el("span", null, "Inconscient"));
        }
      });
      var e = effondrement();
      [tN, tV, tE].forEach(function (t) { t.classList.toggle("adj", e > 0); });
      tN.title = capForce("effondrement")
        ? chaineTexteDe(lireCap("max", "effondrement"), "calculé", effondrementAuto())
        : "Somme après effets et ajustements : " + effPartie("total") + " ; plafond " + effPlafond();
    });
    return b;
  }
