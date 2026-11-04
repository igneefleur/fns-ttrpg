  // ---------- mode édition par module ----------
  // Chaque module éditable porte un rouage dans son titre : il déverrouille la
  // CONSTRUCTION du personnage (stades, ajouts, suppressions, textes, divers…).
  // Hors édition, seuls les gestes de JEU restent actifs : jets, tchat, PV
  // courant, narration, quantités d'objets, notes de session. Les éléments
  // .pc-edit-only n'existent qu'en édition ; les champs .pc-edit-field
  // deviennent inertes (disabled + air d'un simple texte). Réglage d'interface
  // pur : ni dans l'état du personnage, ni persisté — chaque chargement
  // repart verrouillé.
  var editMods = {};
  // Le verrou général vient de l'extension dans Roll20. Hors Roll20, le
  // créateur de personnage garde son comportement historique : édition libre.
  function ficheModifiable() { return !window.__jjkCanEdit || window.__jjkCanEdit(); }
  function isEdit(id) { return ficheModifiable() && !!editMods[id]; }
  function applyEdit(scope, id) {
    var actif = isEdit(id);
    scope.classList.toggle("editing", actif);
    Array.prototype.forEach.call(scope.querySelectorAll(".pc-edit-field"), function (f) {
      f.disabled = !actif;
    });
    Array.prototype.forEach.call(scope.querySelectorAll(".pc-gear"), function (g) {
      g.setAttribute("aria-disabled", ficheModifiable() ? "false" : "true");
    });
  }
  function gearBtn(scope, id, onToggle) {
    var g = el("button", "pc-gear", "⚙");
    g.type = "button";
    g.title = "Modifier ce module";
    g.addEventListener("click", function () {
      if (!ficheModifiable()) return;
      editMods[id] = !editMods[id];
      g.title = isEdit(id) ? "Terminer les modifications" : "Modifier ce module";
      applyEdit(scope, id);
      if (onToggle) onToggle();
    });
    // resynchronise aussi les éléments recréés par les rebuilds internes
    hooks.push(function () { applyEdit(scope, id); });
    return g;
  }
  function appliqueChampsHorsModule(root) {
    var base = root && root.querySelectorAll ? root : document;
    Array.prototype.forEach.call(base.querySelectorAll(".pc-global-edit-field"), function (f) {
      f.disabled = !ficheModifiable();
      f.setAttribute("aria-disabled", f.disabled ? "true" : "false");
    });
    Array.prototype.forEach.call(base.querySelectorAll(".pc-edit-field[data-jjk-requires-edit]"), function (f) {
      var id = f.getAttribute("data-jjk-requires-edit") || "";
      f.disabled = !isEdit(id);
      f.setAttribute("aria-disabled", f.disabled ? "true" : "false");
    });
  }
  window.__jjkApplyMode = function (scope) {
    if (scope && scope.querySelectorAll) {
      if (scope.classList && scope.classList.contains("pc-editable")) applyEdit(scope, scope.dataset.module || "");
      Array.prototype.forEach.call(scope.querySelectorAll(".pc-editable"), function (b) { applyEdit(b, b.dataset.module || ""); });
      appliqueChampsHorsModule(scope);
      return;
    }
    Array.prototype.forEach.call(document.querySelectorAll(".pc-editable"), function (b) { applyEdit(b, b.dataset.module || ""); });
    // L'identité et l'XP de l'en-tête ne sont pas rangés dans un module ; les
    // champs de mods sans bloc éditable ont, eux, un propriétaire explicite.
    // Le mode global doit donc les verrouiller/déverrouiller lui aussi.
    appliqueChampsHorsModule(document);
  };
  // Toutes les interactions de CONSTRUCTION repassent par le même garde.
  // Les actions de jeu restent libres : clic sur une tuile, Montrer, Donner,
  // lancer un jet ou consulter une note ne sont pas des modifications de fiche.
  function scopeEdition(target) {
    return target && target.closest ? target.closest(".pc-editable") : null;
  }
  function autoriseConstruction(target) {
    if (!ficheModifiable()) return false;
    var explicite = target && target.getAttribute ? target.getAttribute("data-jjk-requires-edit") : null;
    if (explicite && explicite !== "1") return isEdit(explicite);
    var scope = scopeEdition(target);
    // Les champs d'identité hors module sont modifiables dès que le mode global
    // est en Édition. Les champs de mods portent un propriétaire explicite et
    // ont été traités plus haut par isEdit(id).
    if (!scope) return ficheModifiable();
    return isEdit(scope.dataset.module || "");
  }
  function annuleEdition(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
  }
  document.addEventListener("click", function (ev) {
    var target = ev.target && ev.target.closest ? ev.target.closest(".pc-edit-only, .pc-gear, [data-jjk-requires-edit]") : null;
    if (!target) return;
    if (target.classList.contains("pc-gear")) {
      if (!ficheModifiable()) annuleEdition(ev);
      return;
    }
    if (!autoriseConstruction(target)) annuleEdition(ev);
  }, true);
  // Le clic droit sur une tuile d'inventaire reste disponible (Détails,
  // Montrer, Donner). Seuls les éléments explicitement marqués comme outils de
  // construction peuvent être ouverts ou activés en mode Consultation.
  document.addEventListener("contextmenu", function (ev) {
    var target = ev.target && ev.target.closest ? ev.target.closest(".pc-gear, .pc-edit-only, [data-jjk-requires-edit]") : null;
    if (target && (target.classList.contains("pc-gear") ? !ficheModifiable() : !autoriseConstruction(target))) annuleEdition(ev);
  }, true);
  ["dragstart", "dragover", "drop"].forEach(function (type) {
    document.addEventListener(type, function (ev) {
      var scope = scopeEdition(ev.target);
      if (scope && !isEdit(scope.dataset.module || "")) annuleEdition(ev);
    }, true);
  });
  ["beforeinput", "paste", "cut"].forEach(function (type) {
    document.addEventListener(type, function (ev) {
      var target = ev.target && ev.target.closest ? ev.target.closest(".pc-edit-field, [contenteditable='true'], .pc-edit-only") : null;
      if (!target) return;
      if (target.matches(".pc-edit-field") && target.disabled) return annuleEdition(ev);
      if (!autoriseConstruction(target)) annuleEdition(ev);
    }, true);
  });
  document.addEventListener("submit", function (ev) {
    var scope = scopeEdition(ev.target);
    if (scope && !isEdit(scope.dataset.module || "")) annuleEdition(ev);
  }, true);

  // Verrou global de Consultation, calqué sur Outward : les commandes de
  // construction sont bloquées même si un contrôle a été ajouté sans classe
  // pc-edit-field. Les actions de jeu et de lecture restent disponibles.
  function canUseControl(target) {
    if (!target || !target.matches) return false;
    return target.matches(
      ".pc-tab, .pc-rollable, .pc-vital-num, .pc-vital-delta, " +
      ".pc-vital-commandes button, .pc-obj-tile, " +
      ".pc-obj-context-action:not([data-jjk-requires-edit]), " +
      ".pc-obj-qrow input, .pc-notes-latest, .pc-notes-older, " +
      ".pc-notes-newer, .pc-envoi select, .pc-envoi button, " +
      ".pc-envoi-segs, summary, a[href]"
    ) || !!target.closest(".pc-notes-search");
  }
  function dansFiche(target) {
    var root = document.getElementById("perso-atelier");
    return !!(root && target && root.contains(target));
  }
  function guardConsultation(ev) {
    if (!ready || ficheModifiable() || !dansFiche(ev.target)) return;
    var target = ev.target && ev.target.closest ? ev.target.closest(
      "button, input, textarea, select, a, summary, [contenteditable='true'], " +
      "[draggable='true'], .pc-tab, .pc-rollable, .pc-obj-tile"
    ) : null;
    var drag = /^(dragstart|dragenter|dragover|drop)$/.test(ev.type);
    if (!drag && canUseControl(target)) return;
    // Le clic droit sur une tuile ouvre son menu d'actions de jeu (Détails,
    // Montrer, Donner). Il reste donc permis, contrairement au glisser-déposer.
    if (ev.type === "contextmenu" && target && target.matches(".pc-obj-tile")) return;
    if (ev.type === "keydown" && ((ev.ctrlKey || ev.metaKey) && /^[ac]$/i.test(ev.key) ||
        /^(Tab|Escape|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|PageUp|PageDown|Home|End)$/.test(ev.key))) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
  }
  ["click", "dblclick", "beforeinput", "input", "change", "keydown", "paste", "cut",
   "submit", "contextmenu", "dragstart", "dragenter", "dragover", "drop"].forEach(function (type) {
    document.addEventListener(type, guardConsultation, true);
  });
  document.addEventListener("focusin", function (ev) {
    if (!ready || ficheModifiable() || !dansFiche(ev.target)) return;
    var target = ev.target;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && !canUseControl(target)) target.blur();
  }, true);

  // Les champs peuvent être recréés après un changement d'onglet, un remontage
  // ou l'ajout dynamique d'un module. Les nouvelles commandes héritent aussitôt
  // du verrou courant, sans attendre une prochaine sauvegarde ou un clic.
  if (window.MutationObserver && document.documentElement) {
    var verrouObserver = new MutationObserver(function (changes) {
      if (ficheModifiable()) return;
      changes.forEach(function (change) {
        Array.prototype.forEach.call(change.addedNodes || [], function (node) {
          if (!node || node.nodeType !== 1 || typeof window.__jjkApplyMode !== "function") return;
          var owner = node.closest ? node.closest(".pc-editable") : null;
          window.__jjkApplyMode(owner || node);
        });
      });
    });
    verrouObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  function block(title, small, editId, onToggle) {
    var b = el("div", "pc-block");
    var t = el("div", "pc-block-title", title);
    if (small) t.appendChild(el("small", null, small));
    if (editId) {
      b.classList.add("pc-editable");
      b.dataset.module = editId;
      t.appendChild(gearBtn(b, editId, onToggle));
    }
    b.appendChild(t);
    return b;
  }
  // reg : registre de rafraîchissement, comme textInput
  function bigTile(label, getV, onClick, reg) {
    var d = el("div", "pc-big" + (onClick ? " pc-rollable" : ""));
    d.appendChild(el("span", "k", label));
    var v = el("span", "v", "");
    d.appendChild(v);
    (reg || hooks).push(function () { v.textContent = String(getV()); });
    if (onClick) d.addEventListener("click", onClick);
    return d;
  }

