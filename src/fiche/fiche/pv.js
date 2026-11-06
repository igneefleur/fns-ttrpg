  // Réserves PV / EO : même charpente pleine largeur que la jauge vitale OWD.
  // Le courant reste une action de jeu indépendante du budget EO de l'en-tête.
  function buildReserve(cfg) {
    var b = cfg.editId ? block("", null, cfg.editId) : el("div", "pc-block");
    b.classList.add("pc-vital-block");
    if (!cfg.editId) b.dataset.module = cfg.moduleId;

    // Le titre natif porte aussi le bouton de réglage du module PV : on le
    // déplace dans le bandeau, à côté du nom, sans perdre son action.
    var ancienTitre = b.querySelector(".pc-block-title");
    var gear = ancienTitre && (ancienTitre.querySelector(".pc-gear-float") || ancienTitre.querySelector("button"));
    if (gear && gear.parentNode) gear.parentNode.removeChild(gear);
    if (ancienTitre && ancienTitre.parentNode) ancienTitre.parentNode.removeChild(ancienTitre);

    var reserve = el("div", "pc-vital-res " + cfg.themeClass);
    var head = el("div", "pc-vital-tete");
    head.appendChild(el("span", "pc-vital-nom", cfg.title));
    if (gear) head.appendChild(gear);

    var val = el("span", "pc-vital-val");
    var current = el("input", "pc-vital-num");
    current.type = "number";
    current.step = "1";
    current.setAttribute("aria-label", cfg.accessibleName + " actuels");
    current.addEventListener("input", function () {
      var v = parseFloat(current.value);
      cfg.setCurrent(isFinite(v) ? v : null);
      refresh();
    });
    val.appendChild(current);
    var maximum = el("span", "pc-vital-max", "");
    val.appendChild(maximum);
    head.appendChild(val);
    reserve.appendChild(head);

    var bar = el("span", "pc-vital-jauge");
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-label", cfg.accessibleName);
    bar.setAttribute("aria-valuemin", "0");
    var fill = el("i");
    bar.appendChild(fill);
    reserve.appendChild(bar);

    var commands = el("div", "pc-vital-cmd");
    var delta = el("input", "pc-vital-delta");
    delta.type = "number";
    delta.step = "1";
    delta.placeholder = "±";
    delta.setAttribute("aria-label", cfg.accessibleName + " à ajouter ou retirer");
    delta.title = "Valeur à ajouter ou à retirer";
    function appliquerVariation() {
      var variation = parseFloat(delta.value);
      if (!isFinite(variation) || variation === 0) return;
      cfg.setCurrent(cfg.getCurrent() + variation);
      delta.value = "";
      refresh();
    }
    delta.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); appliquerVariation(); }
    });
    commands.appendChild(delta);
    commands.appendChild(miniBtn("Appliquer", "Appliquer la variation", appliquerVariation));
    commands.appendChild(miniBtn("Max", "Revenir au maximum", function () {
      cfg.setCurrent(null);
      refresh();
    }));
    reserve.appendChild(commands);
    b.appendChild(reserve);

    hooks.push(function () {
      var max = Math.max(0, Math.floor(Number(cfg.getMaximum()) || 0));
      var courant = Number(cfg.getCurrent()) || 0;
      var negatif = courant < 0;
      if (document.activeElement !== current) current.value = String(courant);
      current.style.width = Math.max(3.4, String(current.value).length + 0.3) + "ch";
      maximum.textContent = "/ " + fmtP(max);
      bar.setAttribute("aria-valuemax", String(max));
      bar.setAttribute("aria-valuenow", String(clamp(courant, 0, max)));
      reserve.classList.toggle("over", negatif);
      fill.classList.toggle("over", negatif);
      fill.style.marginLeft = negatif ? "auto" : "0";
      fill.style.width = clamp(negatif ? 100 : (max > 0 ? courant / max * 100 : 0), 0, 100) + "%";
      if (cfg.updateMaximum) cfg.updateMaximum(maximum);
    });

    if (cfg.appendOptions) cfg.appendOptions(b);
    return b;
  }

  function buildPv() {
    return buildReserve({
      title: "PV", moduleId: "pv", editId: "pv", themeClass: "t-pv",
      accessibleName: "Points de vie", getCurrent: pvCourant, getMaximum: pvMax,
      setCurrent: function (v) { state.pv = v; },
      updateMaximum: function (node) {
        var d = modSum(state.divers.pvMax);
        node.classList.toggle("adj", state.pvMaxOverride !== null || d !== 0);
        node.title = state.pvMaxOverride !== null
          ? "Maximum forcé à " + state.pvMaxOverride + " (calculé : " + pvMaxAuto() + ")"
          : "(20 + Body) / 2 = " + Math.floor((20 + caracTotal("Body")) / 2) +
            (d ? " · modificateurs " + sign(d) : "");
      },
      appendOptions: function (b) {
        // Le maximum de PV garde ses leviers JJK : valeur forcée ou calcul
        // habituel avec les trois emplacements de modificateurs.
        var mrow = el("div", "pc-pvmax pc-mods-host pc-edit-only");
        mrow.appendChild(el("span", "lbl", "Forcé"));
        var force = el("input", "force pc-edit-field");
        force.type = "number"; force.step = "1"; force.min = "0";
        force.title = "Vide = maximum calculé ((20 + Body) / 2, modificateurs compris) ; une valeur le force.";
        force.addEventListener("input", function () {
          var v = parseFloat(force.value);
          state.pvMaxOverride = isFinite(v) ? clamp(Math.floor(v), 0, 9999) : null;
          refresh();
        });
        hooks.push(function () {
          force.placeholder = String(pvMaxAuto());
          if (document.activeElement !== force) force.value = state.pvMaxOverride === null ? "" : state.pvMaxOverride;
        });
        mrow.appendChild(force);
        mrow.appendChild(el("span", "lbl", "Modificateurs"));
        mrow.appendChild(multiMod(state.divers, "pvMax"));
        mrow.appendChild(el("span", "sp"));
        b.appendChild(mrow);
      }
    });
  }

  function buildEm() {
    function emCourant() { return state.em == null ? emReserveMax() : Number(state.em) || 0; }
    return buildReserve({
      title: "EO", moduleId: "em", themeClass: "t-em",
      accessibleName: "Énergie occulte", getCurrent: emCourant, getMaximum: emReserveMax,
      setCurrent: function (v) { state.em = v; },
      updateMaximum: function (node) {
        var d = modSum(state.divers.eoMax);
        node.classList.toggle("adj", d !== 0);
        node.title = "Réserve EO : base " + state.emBarreMax +
          (d ? " · modificateurs " + sign(d) : "");
      }
    });
  }
