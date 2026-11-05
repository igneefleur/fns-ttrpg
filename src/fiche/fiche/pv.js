  // Réserve de ressource : même logique que les jauges Outward (courant,
  // maximum, barre pleine largeur et variation à appliquer), dans les cartes
  // et la palette JJK. Le courant reste un geste de jeu, même en Consultation.
  function buildReserve(cfg) {
    var b;
    if (cfg.editId) {
      b = block(cfg.title, null, cfg.editId);
      b.classList.add("pc-vital-block");
    } else {
      b = el("div", "pc-block pc-vital-block");
      b.dataset.module = cfg.moduleId;
      b.appendChild(el("div", "pc-block-title", cfg.title));
    }
    b.classList.add(cfg.themeClass);

    var head = el("div", "pc-vital-head");
    var current = el("input", "pc-vital-num");
    current.type = "number";
    current.step = "1";
    current.setAttribute("aria-label", cfg.accessibleName + " actuels");
    current.addEventListener("input", function () {
      var v = parseFloat(current.value);
      cfg.setCurrent(isFinite(v) ? v : null);
      refresh();
    });
    head.appendChild(current);
    head.appendChild(el("span", "pc-vital-separator", "/"));
    var maximum = el("span", "pc-vital-max", "");
    head.appendChild(maximum);
    b.appendChild(head);

    var bar = el("div", "pc-vital-jauge");
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-label", cfg.accessibleName);
    bar.setAttribute("aria-valuemin", "0");
    var fill = el("i");
    bar.appendChild(fill);
    b.appendChild(bar);

    var commands = el("div", "pc-vital-commandes");
    var delta = el("input", "pc-vital-delta");
    delta.type = "number";
    delta.step = "1";
    delta.placeholder = "+ / −";
    delta.setAttribute("aria-label", "Variation de " + cfg.accessibleName);
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
    commands.appendChild(el("span", "sp"));
    commands.appendChild(miniBtn("Max", "Revenir au maximum", function () {
      cfg.setCurrent(null);
      refresh();
    }));
    b.appendChild(commands);

    hooks.push(function () {
      var max = Math.max(0, Number(cfg.getMaximum()) || 0);
      var courant = Number(cfg.getCurrent()) || 0;
      var ratio = max > 0 ? clamp(courant / max * 100, 0, 100) : 0;
      if (document.activeElement !== current) current.value = String(courant);
      maximum.textContent = String(max);
      bar.style.setProperty("--vital-ratio", ratio + "%");
      fill.style.width = ratio + "%";
      bar.setAttribute("aria-valuemax", String(max));
      bar.setAttribute("aria-valuenow", String(clamp(courant, 0, max)));
      bar.classList.toggle("critical", max > 0 && courant <= max * .2);
      bar.classList.toggle("low", max > 0 && courant > max * .2 && courant <= max * .5);
      if (cfg.updateMaximum) cfg.updateMaximum(maximum);
    });

    if (cfg.appendOptions) cfg.appendOptions(b);
    return b;
  }

  function buildPv() {
    return buildReserve({
      title: "PV", moduleId: "pv", editId: "pv", themeClass: "pc-vital-pv",
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
    function emMax() { return Math.max(0, Math.floor(Number(state.emMax) || 0)); }
    function emCourant() { return state.em == null ? emMax() : Number(state.em) || 0; }
    return buildReserve({
      title: "EO", moduleId: "em", themeClass: "pc-vital-em",
      accessibleName: "Énergie occulte", getCurrent: emCourant, getMaximum: emMax,
      setCurrent: function (v) { state.em = v; }
    });
  }
