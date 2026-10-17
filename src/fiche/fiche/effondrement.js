  // ---- Effondrement : dix causes, lecture seule et modificateur direct ----
  function buildEffondrement() {
    var b = block("Effondrement");
    function reste(champ) { return 100 - clamp(num(effDef()[champ], 0) * effondrement(), 0, 100); }
    var r = el("div", "pc-bigrow pc-bigrow-2");
    var tV = bigTile("MAX PV", function () { return reste("pvParNiveau") + " %"; });
    var tE = bigTile("MAX PE", function () { return reste("peParNiveau") + " %"; });
    r.appendChild(tV); r.appendChild(tE); b.appendChild(r);
    var tN = bigTile("EFFONDREMENT", function () { return String(effondrement()); });
    tN.classList.add("pc-eff-niveau"); b.appendChild(tN);
    var commandes = el("div", "pc-eff-commandes");
    var desactive = el("button", "pc-chip pc-combat-toggle", "Désactiver effondrement");
    desactive.type = "button";
    desactive.title = "Annule l’effondrement appliqué et ses pénalités ; les causes continuent de suivre le personnage.";
    desactive.addEventListener("click", function () { state.effDesactive = !state.effDesactive; refresh(); });
    var pause = el("button", "pc-chip pc-combat-toggle", "Pauser Effondrement");
    pause.type = "button";
    pause.title = "Fige les niveaux actuels. À la reprise, ils suivent de nouveau les réserves actuelles.";
    pause.addEventListener("click", function () { state.effPause = state.effPause ? null : figeEffondrement(); refresh(); });
    commandes.appendChild(desactive); commandes.appendChild(pause); b.appendChild(commandes);
    var grille = el("div", "pc-eff-grille"), vues = [];
    [["pr", "Repos"], ["charge", "Charge"], ["froid", "Froid"], ["chaud", "Chaud"],
     ["ps", "Satiété"], ["contenance", "Contenance"], ["ph", "Hydratation"], ["alcool", "Alcool"],
     ["pi", "Innocence"], ["autre", "Autre"]].forEach(function (d) {
      var cle = d[0], nom = d[1];
      var normal = { pr: "PR", pi: "PI", ps: "PS", ph: "PH" }[cle] || nom;
      var compact = { charge: "CHG", contenance: "CTN", alcool: "ALC", froid: "FRD", chaud: "CHD", autre: "AUT" }[cle] || normal;
      var carte = el("div", "pc-eff-partie t-" + cle); carte.dataset.effPartie = cle;
      var tete = el("div", "pc-eff-tete");
      var titre = el("span", "k"); titre.dataset.effNom = cle; titre.title = nom; titre.setAttribute("aria-label", nom);
      titre.appendChild(el("span", "pc-eff-nom-normal", normal));
      titre.appendChild(el("span", "pc-eff-nom-compact", compact)); tete.appendChild(titre);
      var valeur = el("div", "pc-eff-lecture");
      var total = el("span", "pc-eff-partie-total"); valeur.appendChild(total);
      valeur.appendChild(el("span", "pc-vital-max", "/ 10")); tete.appendChild(valeur); carte.appendChild(tete);
      var jauge = el("span", "pc-vital-jauge"), fill = el("i");
      jauge.appendChild(fill); carte.appendChild(jauge);
      var champs = el("div", "pc-segs pc-eff-champs");
      function lecture(label) {
        var champ = champNombreSigne(el("input", "c pc-eff-valeur"));
        champ.readOnly = true; champ.setAttribute("aria-label", nom + " — " + label);
        champs.appendChild(champ); return champ;
      }
      var base = lecture("Base"), effets = lecture("Effet");
      base.title = "Base : niveau calculé depuis la réserve ou l’état du personnage.";
      effets.title = "Effet : bonus/malus des effets ; lecture seule.";
      var mod = champNombreSigne(el("input", "c pc-eff-delta"));
      mod.placeholder = "±"; mod.setAttribute("aria-label", nom + " — ±");
      mod.addEventListener("input", function () {
        if (state.effPause) return;
        var vide = mod.value.trim() === "", n = vide ? 0 : litNombreSigne(mod.value);
        if (!isFinite(n) || !Number.isInteger(n)) return;
        n = clamp(n, -999, 999);
        if (cle === "autre") state.effAutre = n;
        else {
          if (!state.effParties[cle]) state.effParties[cle] = { effet: 0, mod: 0 };
          state.effParties[cle].mod = n;
        }
        refresh();
      });
      mod.addEventListener("keydown", function (e) { if (e.key === "Enter") e.preventDefault(); });
      mod.addEventListener("blur", function () { refresh(); });
      champs.appendChild(mod); carte.appendChild(champs); grille.appendChild(carte);
      vues.push({cle: cle, carte: carte, total: total, base: base, effets: effets, mod: mod, fill: fill});
    });
    b.appendChild(grille);
    hooks.push(function () {
      vues.forEach(function (v) {
        var brut = effBasePartie(v.cle), niveau = effPartie(v.cle);
        var photo = effPhotoPartie(v.cle);
        var ecart = photo ? photo.effet : pub("effondrementPartie", brut + num(effReglage(v.cle).effet, 0), { cle: v.cle, base: brut }) - brut;
        var ajustement = photo ? photo.mod : v.cle === "autre" ? num(state.effAutre, 0) : num(effReglage(v.cle).mod, 0);
        v.mod.disabled = !!state.effPause;
        v.base.value = brut;
        v.effets.value = ecart ? sign(ecart).replace("−", "-") : "0";
        v.total.textContent = String(niveau);
        v.fill.style.width = clamp(niveau * 10, 0, 100) + "%";
        v.fill.style.marginLeft = "0";
        if (document.activeElement !== v.mod) v.mod.value = ajustement ? sign(ajustement).replace("−", "-") : "";
        v.mod.title = "Modificateur direct, appliqué pendant la saisie. Vide = 0.";
        v.carte.title = "Base " + brut + " ; effets " + sign(ecart) + " ; ajustement " + sign(ajustement);
      });
      desactive.classList.toggle("on", !!state.effDesactive); desactive.setAttribute("aria-pressed", String(!!state.effDesactive));
      pause.classList.toggle("on", !!state.effPause); pause.setAttribute("aria-pressed", String(!!state.effPause));
      var e = effondrement();
      [tN, tV, tE].forEach(function (t) { t.classList.toggle("adj", e > 0); });
      tN.title = capForce("effondrement")
        ? chaineTexteDe(lireCap("max", "effondrement"), "calculé", effondrementAuto())
        : "Somme après effets et ajustements : " + effPartie("total") + " ; plafond " + effPlafond();
    });
    return b;
  }
