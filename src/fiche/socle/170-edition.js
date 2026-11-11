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
  function canUseControl(target) {
    if (!target || !target.matches) return false;
    // Liste d'actions de jeu/lecture, calquée sur OWD : les champs de saisie,
    // les jauges modifiables et les quantités ne sont pas des commandes de jeu.
    return target.matches(
      ".pc-tab, .pc-rollable, .pc-obj-tile, .pc-comp-filter, " +
      ".pc-obj-context-action:not([data-jjk-requires-edit]), " +
      ".pc-comp-roll, .pc-notes-latest, .pc-notes-older, .pc-notes-newer, " +
      ".pc-entry-send, .pc-tech-item-read, .pc-tech-divider-toggle, .pc-note-toggle, .pc-journal-toggle, summary, a[href]"
    ) || !!target.closest(".pc-notes-search, .pc-journal-pages") ||
      !!target.closest(".pc-envoi") || target.type === "search";
  }
  function appliqueVerrouGlobal(scope) {
    var surface = scope && scope.querySelectorAll ? scope : document;
    var selector = surface === document
      ? "#perso-atelier input, #perso-atelier textarea, #perso-atelier select, #perso-atelier button, #perso-atelier [draggable='true']"
      : "input, textarea, select, button, [draggable='true']";
    var nodes = Array.prototype.slice.call(surface.querySelectorAll(selector));
    // MutationObserver peut recevoir directement un champ ou un bouton ajouté
    // seul : querySelectorAll ne comprend pas l'élément racine lui-même.
    if (surface !== document && surface.matches && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(surface.tagName))
      nodes.unshift(surface);
    nodes.forEach(function (node) {
      if (!ficheModifiable()) {
        if (node.draggable) { node.dataset.jjkModeWasDraggable = "1"; node.draggable = false; }
        if (!canUseControl(node)) {
          node.setAttribute("data-jjk-readonly", "1");
          if (node.tagName === "TEXTAREA" || node.tagName === "INPUT" &&
              !/^(checkbox|radio|range|file|button|submit|reset)$/i.test(node.type)) {
            if (node.dataset.jjkModeWasReadonly === undefined) node.dataset.jjkModeWasReadonly = node.readOnly ? "1" : "0";
            node.readOnly = true;
          } else {
            if (node.dataset.jjkModeWasDisabled === undefined) node.dataset.jjkModeWasDisabled = node.disabled ? "1" : "0";
            node.disabled = true;
          }
        }
      } else if (node.hasAttribute("data-jjk-readonly")) {
        if (node.dataset.jjkModeWasReadonly !== undefined) {
          node.readOnly = node.dataset.jjkModeWasReadonly === "1";
          delete node.dataset.jjkModeWasReadonly;
        }
        if (node.dataset.jjkModeWasDisabled !== undefined) {
          node.disabled = node.dataset.jjkModeWasDisabled === "1";
          delete node.dataset.jjkModeWasDisabled;
        }
        if (node.dataset.jjkModeWasDraggable === "1") node.draggable = true;
        delete node.dataset.jjkModeWasDraggable;
        node.removeAttribute("data-jjk-readonly");
      }
    });
  }
  window.__jjkApplyMode = function (scope) {
    var surface = scope && scope.querySelectorAll ? scope : document;
    // D'abord retirer le verrou global précédent. Ensuite seulement, réappliquer
    // les permissions plus fines des modules : un champ pc-edit-field ne doit
    // jamais redevenir actif simplement parce que le mode global repasse en édition.
    appliqueVerrouGlobal(surface);
    if (surface.matches && surface.matches(".pc-editable:not([data-jjk-column-edit])")) applyEdit(surface, surface.dataset.module || "");
    Array.prototype.forEach.call(surface.querySelectorAll(".pc-editable:not([data-jjk-column-edit])"), function (b) { applyEdit(b, b.dataset.module || ""); });
    // L'identité et les commandes hors module partagent le verrou global.
    appliqueChampsHorsModule(surface);
    if (surface === document || surface.id === "perso-atelier") window.dispatchEvent(new Event("jjk-column-mode"));
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
    return scope.hasAttribute("data-jjk-column-edit") ? scope.classList.contains("editing") : isEdit(scope.dataset.module || "");
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
      if (scope && !autoriseConstruction(ev.target)) annuleEdition(ev);
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
    if (scope && !autoriseConstruction(ev.target)) annuleEdition(ev);
  }, true);

  // Verrou global de Consultation, calqué sur Outward : les commandes de
  // construction sont bloquées même si un contrôle a été ajouté sans classe
  // pc-edit-field. Les actions de jeu et de lecture restent disponibles.
  function dansFiche(target) {
    var root = document.getElementById("perso-atelier");
    return !!(root && target && root.contains(target));
  }
  function guardConsultation(ev) {
    if (ficheModifiable() || !dansFiche(ev.target)) return;
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
    if (ficheModifiable() || !dansFiche(ev.target)) return;
    var target = ev.target;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && !canUseControl(target)) target.blur();
  }, true);

  // Les champs peuvent être recréés après un changement d'onglet, un remontage
  // ou l'ajout dynamique d'un module. Les nouvelles commandes héritent aussitôt
  // du verrou courant, sans attendre une prochaine sauvegarde ou un clic.
  if (window.MutationObserver && document.documentElement) {
    var verrouObserver = new MutationObserver(function (changes) {
      if (ficheModifiable()) return;
      var root = document.getElementById("perso-atelier");
      if (!root) return;
      changes.forEach(function (change) {
        Array.prototype.forEach.call(change.addedNodes || [], function (node) {
          if (!node || node.nodeType !== 1 || typeof window.__jjkApplyMode !== "function") return;
          // La barre Consultation / Edition est volontairement une sœur de la
          // racine : elle doit rester interactive pour pouvoir sortir du mode
          // Consultation. Ne verrouiller que les ajouts qui appartiennent à la
          // fiche, ou un conteneur qui vient de recevoir la fiche elle-même.
          if (node !== root && !root.contains(node)) {
            if (node.contains && node.contains(root)) window.__jjkApplyMode(root);
            return;
          }
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

