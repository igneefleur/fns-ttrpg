  // ---------- mode édition par module ----------
  // Chaque module éditable porte un rouage dans son titre : il déverrouille la
  // CONSTRUCTION du personnage (rangs, forçages, modificateurs, ajouts,
  // suppressions, textes). Hors édition, seuls les gestes de JEU restent
  // actifs : jets, tchat, jauges courantes, contenance, bourse, quantités
  // d'objets. Réglage d'interface PUR : ni dans l'état du personnage, ni
  // persisté — chaque chargement repart verrouillé.
  var editMods = {};
  function ficheModifiable() { return !window.__owdCanEdit || window.__owdCanEdit(); }
  function isEdit(id) { return ficheModifiable() && !!editMods[id]; }
  // Lecture en texte normal : hauteur naturelle, même dans un onglet masqué
  // ou après un changement de largeur. Le textarea garde sa taille d'édition
  // et son redimensionnement manuel ; on ne mesure ni ne réécrit sa hauteur.
  function majTextesLecture(scope) {
    if (!scope) return;
    Array.prototype.forEach.call(scope.querySelectorAll("textarea.pc-notes.pc-edit-field,textarea.pc-notes.pc-item-edit-field"), function (f) {
      if (!f.parentNode) return;
      var lecture = f._owdLecture;
      if (!lecture || lecture.parentNode !== f.parentNode) {
        lecture = el("div", "pc-prose-read");
        f.parentNode.insertBefore(lecture, f);
        f._owdLecture = lecture;
      }
      // Ne pas remplacer le texte inchangé : cela casserait sa sélection
      // à chaque rafraîchissement de l'horloge ou des réserves.
      if (lecture.textContent !== f.value) lecture.textContent = f.value;
      lecture.hidden = !f.disabled;
      f.classList.toggle("pc-prose-editor-lecture", f.disabled);
    });
  }
  function applyEdit(scope, id) {
    scope.classList.toggle("editing", isEdit(id));
    Array.prototype.forEach.call(scope.querySelectorAll(".pc-edit-field"), function (f) {
      f.disabled = !isEdit(id);
    });
    majTextesLecture(scope);
    if(window.__owdApplyMode)window.__owdApplyMode(scope);
  }
  function gearBtn(scope, id, onToggle) {
    var g = el("button", "pc-gear", "⚙");
    g.type = "button";
    g.title = "Modifier ce module";
    g.addEventListener("click", function () {
      if(!ficheModifiable())return;
      editMods[id] = !editMods[id];
      g.title = isEdit(id) ? "Terminer les modifications" : "Modifier ce module";
      applyEdit(scope, id);
      if (onToggle) onToggle();
    });
    // resynchronise aussi les éléments recréés par les rebuilds internes
    hooks.push(function () { applyEdit(scope, id); });
    return g;
  }
  function block(title, small, editId, onToggle) {
    var b = el("div", "pc-block");
    var t = el("div", "pc-block-title", title);
    if (small) t.appendChild(el("small", null, small));
    if (editId) {
      b.classList.add("pc-editable");
      // data-module est le point d'accroche des sondes ; les modules sans
      // rouage le reçoivent quand même, posé par monteModules
      b.dataset.module = editId;
      t.appendChild(gearBtn(b, editId, onToggle));
    }
    b.appendChild(t);
    return b;
  }
  function bigTile(label, getV, onClick, reg) {
    var d = el("div", "pc-big" + (onClick ? " pc-rollable" : ""));
    d.appendChild(el("span", "k", label));
    var v = el("span", "v", "");
    d.appendChild(v);
    (reg || hooks).push(function () { v.textContent = String(getV()); });
    if (onClick) d.addEventListener("click", onClick);
    return d;
  }
  // Une note sous un bloc : ce que la fiche a besoin de dire sur l'ÉTAT du
  // personnage ou sur le sens d'un champ. Jamais une règle du livre.
  function note(txt) { return el("div", "pc-block-note", txt); }
