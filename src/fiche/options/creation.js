  // ---- création : le prestige, et lui seul ----
  // Ce bloc réglait un budget de « points de création » : il n'y en a plus.
  // MIA ne distribue pas de points au départ, il RANGE le personnage : le
  // prestige dit son rang, et ce rang plafonne chacune de ses caractéristiques.
  //
  // LE PLAFOND N'EST PLUS ICI, IL EST AVEC LES CARACTÉRISTIQUES. Il se règle
  // caractéristique par caractéristique : on le cherche donc dans le bloc qui
  // les porte, et non dans « Création », où seule sa CAUSE se décide. Le
  // prestige, lui, reste : il n'appartient à aucune des huit, il les coiffe
  // toutes, et il se tranche une fois pour le personnage.
  function buildCreation() {
    var bC = block("Création");
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    bC.appendChild(wrap);

    // Les mêmes colonnes que les grilles du bloc des caractéristiques : ce qu'on
    // force, ce qu'on décale, ce que ça donne. Une seule rangée s'en sert, mais
    // l'entête reste — sans lui, trois champs nus ne disent pas lequel force et
    // lequel décale.
    var head = el("div", "pc-optcomp-row quatre head");
    [["Réglage", "Ce que la rangée règle"],
     ["Forcé", "Valeur forcée — vide = valeur calculée"],
     ["Modif.", "Modificateur du barème — vide = aucun"],
     ["Valeur", "Valeur effective"]].forEach(function (h) {
      var sp = el("span", null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    box.appendChild(head);

    var rowP = el("div", "pc-optcomp-row quatre");
    var nomP = el("span", "pc-comp-name");
    nomP.appendChild(el("span", "pc-comp-label", "Prestige"));
    rowP.appendChild(nomP);
    // Le prestige n'est pas une entrée de table mais une clé de l'état : son
    // forçage vaut null quand il est absent, là où une table n'a simplement
    // pas la clé. D'où la forme LIBRE des deux champs, et la traduction
    // null ↔ vide faite ici.
    rowP.appendChild(champForceVal(
      function () { return state.prestigeForce === null ? undefined : state.prestigeForce; },
      function (v) { state.prestigeForce = v === undefined ? null : v; },
      prestigeAuto,
      "Prestige forcé — vide = prestige calculé (acquis + modificateur)."));
    rowP.appendChild(champModVal(
      function () { return state.prestigeMod; },
      function (v) { state.prestigeMod = v; }, 999,
      "Modificateur du prestige — vide = aucun."));
    var totP = el("span", "pc-comp-total", "");
    rowP.appendChild(totP);
    hooks.push(function () {
      var m = state.prestigeMod || 0;
      var f = state.prestigeForce;
      totP.textContent = String(prestige());
      totP.classList.toggle("adj", m !== 0 || f !== null);
      totP.title = f !== null
        ? "Prestige forcé à " + f
        : "acquis " + (state.prestige || 0) + (m ? " · modificateur " + sign(m) : "");
      rowP.classList.toggle("on", m !== 0 || f !== null);
    });
    box.appendChild(rowP);

    return bC;
  }

