  // ---- Arts et techniques ---------------------------------------------------
  // Un art contient ses techniques ; une technique porte ses propres rangs.
  // Chaque rang est autonome (nom, XP, rupture, description et format Notes).
  // Les anciens coûts restent séparés tant que le joueur ne les a pas ventilés.
  function buildTechniques() {
    var b = block("Techniques", null, "techniques", function () { rendre(); });
    var layout = el("div", "pc-techniques-layout");
    b.appendChild(layout);

    var artSelection = "", techniqueSelection = "";
    var techHooks = [];
    hooks.push(function () { techHooks.forEach(function (fn) { try { fn(); } catch (e) {} }); });

    function arts() { return Array.isArray(state.techniques) ? state.techniques : (state.techniques = []); }
    function artDe(id) { return arts().filter(function (a) { return a.id === id; })[0] || null; }
    function techniqueDe(a, id) {
      return a && Array.isArray(a.techniques) ? a.techniques.filter(function (t) { return t.id === id; })[0] || null : null;
    }
    function rangsDe(t) { return t && Array.isArray(t.rangs) ? t.rangs : []; }
    function selectionValide() {
      var a = artDe(artSelection);
      if (!a) { a = arts()[0] || null; artSelection = a ? a.id : ""; }
      var t = techniqueDe(a, techniqueSelection);
      if (!t) { t = a && a.techniques[0] || null; techniqueSelection = t ? t.id : ""; }
      return { art: a, technique: t };
    }
    function nouveauRang(nom) {
      return { id: uid("tr"), nom: nom || "", xp: 0, rupture: 0, desc: "", mode: "plain" };
    }
    function nouvelleTechnique() {
      return { id: uid("t"), nom: "", rang: 0, rangs: [nouveauRang("Rang 1")],
               legacyXp: 0, legacyRupture: 0, legacyDesc: "", offert: 0 };
    }

    function saveNombre(input, objet, cle, min, max) {
      input.addEventListener("input", function () {
        var v = parseInt(input.value, 10);
        objet[cle] = isFinite(v) ? clamp(v, min, max) : min;
        refresh();
      });
      techHooks.push(function () {
        if (document.activeElement !== input) input.value = String(objet[cle] == null ? 0 : objet[cle]);
      });
    }
    function champNombre(parent, objet, cle, label, min, max) {
      var wrap = el("label", "pc-tech-rank-number");
      wrap.appendChild(el("span", "pc-tech-rank-label", label));
      var input = el("input", "pc-edit-field");
      input.type = "text"; input.inputMode = "numeric"; input.pattern = "[0-9]*";
      input.value = String(objet[cle] == null ? 0 : objet[cle]);
      input.setAttribute("aria-label", label);
      saveNombre(input, objet, cle, min, max);
      wrap.appendChild(input); parent.appendChild(wrap);
      return input;
    }
    function changeMode(parent, rang, read) {
      var modes = el("div", "pc-notes-modes");
      modes.setAttribute("role", "group"); modes.setAttribute("aria-label", "Format de la description");
      var brut = miniBtn("Brut", null, function () { rang.mode = "plain"; actualise(); save(); });
      var markdown = miniBtn("Markdown", null, function () { rang.mode = "markdown"; actualise(); save(); });
      function actualise() {
        brut.setAttribute("aria-pressed", String(rang.mode !== "markdown"));
        markdown.setAttribute("aria-pressed", String(rang.mode === "markdown"));
        notesRendu(read, rang.desc || "", rang.mode);
      }
      modes.appendChild(brut); modes.appendChild(markdown);
      actualise(); techHooks.push(actualise); parent.appendChild(modes);
      return actualise;
    }

    function idGlisse(e, type, id) {
      if (!isEdit("techniques") || !e.dataTransfer) { e.preventDefault(); return; }
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", type + "|" + id);
    }
    function lireGlisse(e) {
      if (!e.dataTransfer) return null;
      var raw = e.dataTransfer.getData("text/plain") || "";
      var p = raw.split("|");
      return p.length === 2 && (p[0] === "art" || p[0] === "tech") ? { type: p[0], id: p[1] } : null;
    }
    function zoneDepot(node, reception) {
      node.addEventListener("dragover", function (e) {
        if (!isEdit("techniques")) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        node.classList.add("drop-target");
      });
      node.addEventListener("dragleave", function (e) {
        if (!node.contains(e.relatedTarget)) node.classList.remove("drop-target");
      });
      node.addEventListener("drop", function (e) {
        if (!isEdit("techniques")) return;
        e.preventDefault(); e.stopPropagation(); node.classList.remove("drop-target");
        var drag = lireGlisse(e); if (!drag) return;
        reception(drag);
      });
    }
    function deplaceArt(id, avantId) {
      var liste = arts(), from = liste.findIndex(function (a) { return a.id === id; });
      if (from < 0 || id === avantId) return false;
      var item = liste.splice(from, 1)[0];
      var to = avantId ? liste.findIndex(function (a) { return a.id === avantId; }) : -1;
      liste.splice(to < 0 ? liste.length : to, 0, item);
      return true;
    }
    function deplaceTechnique(id, artCibleId, avantId) {
      var sourceArt = null, sourceIndex = -1, technique = null;
      arts().some(function (a) {
        var i = a.techniques.findIndex(function (t) { return t.id === id; });
        if (i < 0) return false;
        sourceArt = a; sourceIndex = i; technique = a.techniques[i]; return true;
      });
      var cible = artDe(artCibleId);
      if (!technique || !sourceArt || !cible) return false;
      if (sourceArt === cible && avantId === id) return false;
      sourceArt.techniques.splice(sourceIndex, 1);
      var to = avantId ? cible.techniques.findIndex(function (t) { return t.id === avantId; }) : -1;
      cible.techniques.splice(to < 0 ? cible.techniques.length : to, 0, technique);
      return true;
    }
    function termineGlisse(changement) {
      if (!changement) return;
      refresh(); rendre();
    }

    function panneauTitre(parent, titre, description) {
      var head = el("div", "pc-tech-pane-title");
      head.appendChild(el("span", null, titre));
      if (description) head.appendChild(el("small", null, description));
      parent.appendChild(head);
      return head;
    }
    function ligneArt(a, liste) {
      var item = el("div", "pc-tech-item" + (a.id === artSelection ? " selected" : ""));
      var drag = el("button", "pc-comp-drag pc-edit-only", "⠿");
      drag.type = "button"; drag.title = "Glisser pour réordonner les arts"; drag.setAttribute("aria-label", drag.title); drag.draggable = true;
      drag.addEventListener("dragstart", function (e) { e.stopPropagation(); idGlisse(e, "art", a.id); });
      drag.addEventListener("dragend", function (e) { e.stopPropagation(); item.classList.remove("drop-target"); });
      item.appendChild(drag);
      var read = el("button", "pc-tech-item-read", a.nom || "Art sans nom");
      read.type = "button"; read.addEventListener("click", function () {
        artSelection = a.id; techniqueSelection = a.techniques[0] ? a.techniques[0].id : ""; rendre();
      });
      item.appendChild(read);
      var name = el("input", "pc-edit-field pc-tech-item-name");
      name.type = "text"; name.value = a.nom || ""; name.placeholder = "Nom de l’art";
      name.setAttribute("aria-label", "Nom de l’art");
      name.addEventListener("input", function () { a.nom = name.value; read.textContent = name.value || "Art sans nom"; save(); });
      item.appendChild(name);
      item.appendChild(miniBtn("×", "Supprimer cet art", function () {
        function retire() {
          arts().splice(arts().indexOf(a), 1);
          if (artSelection === a.id) { artSelection = ""; techniqueSelection = ""; }
          refresh(); rendre();
        }
        if (a.techniques.length) confirmer("Supprimer un art", "« " + (a.nom || "Cet art") + " » contient " + a.techniques.length + " technique(s). Supprimer l’art et toutes ses techniques ?", "Tout supprimer", retire);
        else retire();
      }, "danger pc-edit-only"));
      zoneDepot(item, function (drag) {
        if (drag.type === "art") termineGlisse(deplaceArt(drag.id, a.id));
        else termineGlisse(deplaceTechnique(drag.id, a.id, null));
      });
      liste.appendChild(item);
    }
    function ligneTechnique(t, a, liste) {
      var item = el("div", "pc-tech-item pc-tech-item-tech" + (t.id === techniqueSelection ? " selected" : ""));
      var drag = el("button", "pc-comp-drag pc-edit-only", "⠿");
      drag.type = "button"; drag.title = "Glisser vers un autre art ou pour réordonner"; drag.setAttribute("aria-label", drag.title); drag.draggable = true;
      drag.addEventListener("dragstart", function (e) { e.stopPropagation(); idGlisse(e, "tech", t.id); });
      drag.addEventListener("dragend", function (e) { e.stopPropagation(); item.classList.remove("drop-target"); });
      item.appendChild(drag);
      var read = el("button", "pc-tech-item-read", t.nom || "Technique sans nom");
      read.type = "button"; read.addEventListener("click", function () { artSelection = a.id; techniqueSelection = t.id; rendre(); });
      item.appendChild(read);
      var name = el("input", "pc-edit-field pc-tech-item-name");
      name.type = "text"; name.value = t.nom || ""; name.placeholder = "Nom de la technique";
      name.setAttribute("aria-label", "Nom de la technique");
      name.addEventListener("input", function () { t.nom = name.value; read.textContent = name.value || "Technique sans nom"; save(); });
      item.appendChild(name);
      item.appendChild(miniBtn("×", "Supprimer cette technique", function () {
        confirmer("Supprimer une technique", "Supprimer « " + (t.nom || "cette technique") + " » et tous ses rangs ? Ses coûts ne seront plus comptés.", "Supprimer", function () {
          a.techniques.splice(a.techniques.indexOf(t), 1);
          if (techniqueSelection === t.id) techniqueSelection = a.techniques[0] ? a.techniques[0].id : "";
          refresh(); rendre();
        });
      }, "danger pc-edit-only"));
      zoneDepot(item, function (drag) {
        if (drag.type === "tech") termineGlisse(deplaceTechnique(drag.id, a.id, t.id));
      });
      liste.appendChild(item);
    }

    function rendreArts() {
      var pane = el("section", "pc-tech-pane pc-tech-arts");
      panneauTitre(pane, "Arts", "");
      var liste = el("div", "pc-tech-list pc-tech-art-list");
      var sel = selectionValide();
      arts().forEach(function (a) { ligneArt(a, liste); });
      if (!arts().length) liste.appendChild(el("div", "pc-empty", "Aucun art."));
      zoneDepot(liste, function (drag) {
        if (drag.type === "art") termineGlisse(deplaceArt(drag.id, null));
        else if (sel.art) termineGlisse(deplaceTechnique(drag.id, sel.art.id, null));
      });
      pane.appendChild(liste);
      pane.appendChild(miniBtn("+ Ajouter un art", null, function () {
        var a = { id: uid("art"), nom: "Nouvel art", techniques: [] };
        arts().push(a); artSelection = a.id; techniqueSelection = ""; refresh(); rendre();
      }, "pc-edit-only pc-tech-add"));
      return pane;
    }
    function rendreTechniques(a) {
      var pane = el("section", "pc-tech-pane pc-tech-list-pane");
      panneauTitre(pane, "Techniques", "");
      var liste = el("div", "pc-tech-list pc-technique-list");
      if (a) {
        a.techniques.forEach(function (t) { ligneTechnique(t, a, liste); });
        if (!a.techniques.length) liste.appendChild(el("div", "pc-empty", "Aucune technique dans cet art."));
        zoneDepot(liste, function (drag) {
          if (drag.type === "tech") termineGlisse(deplaceTechnique(drag.id, a.id, null));
        });
      } else liste.appendChild(el("div", "pc-empty", "Sélectionnez ou créez un art."));
      pane.appendChild(liste);
      if (a) pane.appendChild(miniBtn("+ Ajouter une technique", null, function () {
        var t = nouvelleTechnique(); a.techniques.push(t); techniqueSelection = t.id; refresh(); rendre();
      }, "pc-edit-only pc-tech-add"));
      return pane;
    }

    function rangCarte(a, t, rang, index) {
      if (rang.mode !== "markdown") rang.mode = "plain";
      var card = el("article", "pc-tech-rank" + (index < t.rang ? " acquired" : ""));
      card.dataset.syncEntity = rang.id;
      var head = el("div", "pc-tech-rank-head");
      var nameWrap = el("label", "pc-tech-rank-name");
      nameWrap.appendChild(el("span", "pc-tech-rank-label", "Nom"));
      var name = el("input", "pc-edit-field"); name.type = "text"; name.value = rang.nom || "";
      name.placeholder = "Nom du rang"; name.setAttribute("aria-label", "Nom du rang");
      name.addEventListener("input", function () { rang.nom = name.value; save(); });
      nameWrap.appendChild(name); head.appendChild(nameWrap);
      head.appendChild(miniBtn("×", "Supprimer ce rang", function () {
        function retire() {
          rangsDe(t).splice(index, 1);
          if (index < t.rang) t.rang = Math.max(0, t.rang - 1);
          if (!t.rangs.length) { t.rangs.push(nouveauRang("Rang 1")); t.rang = 0; }
          refresh(); rendre();
        }
        if (index < t.rang || rang.xp || rang.rupture || rang.desc.trim() || rang.nom.trim())
          confirmer("Supprimer un rang", "Supprimer « " + (rang.nom || ("Rang " + (index + 1))) + " » ? Les coûts de ce rang ne seront plus comptés.", "Supprimer", retire);
        else retire();
      }, "danger pc-edit-only pc-tech-rank-del"));
      champNombre(head, rang, "rupture", "RUPTURE", 0, 99);
      champNombre(head, rang, "xp", "XP", 0, 99999);
      card.appendChild(head);

      var read = el("div", "pc-tech-rank-read");
      notesRendu(read, rang.desc || "", rang.mode); card.appendChild(read);
      var editor = el("textarea", "pc-edit-field pc-tech-rank-editor");
      editor.rows = 3; editor.value = rang.desc || ""; editor.placeholder = "Description propre à ce rang";
      editor.setAttribute("aria-label", "Description du rang");
      editor.addEventListener("input", function () { rang.desc = editor.value; notesRendu(read, rang.desc, rang.mode); save(); });
      card.appendChild(editor);

      var footer = el("div", "pc-tech-rank-footer");
      var formats = el("div", "pc-tech-rank-format-wrap pc-edit-only");
      changeMode(formats, rang, read); footer.appendChild(formats);
      footer.appendChild(miniBtn("Envoyer", "Envoyer ce rang dans le tchat Roll20", function () {
        sayChat("Technique — " + (t.nom || "sans nom"), [
          ["Art", a.nom || "Sans nom"], ["Technique", t.nom || "Sans nom"],
          ["Rang", rang.nom || ("Rang " + (index + 1))], ["XP", rang.xp],
          ["Rupture", rang.rupture], ["", rang.desc]
        ]);
      }, "primary"));
      card.appendChild(footer);
      techHooks.push(function () {
        if (document.activeElement !== name) name.value = rang.nom || "";
        if (document.activeElement !== editor) editor.value = rang.desc || "";
        card.classList.toggle("acquired", index < t.rang);
      });
      return card;
    }

    function panneauHistorique(parent, t) {
      var aXp = Math.max(0, Number(t.legacyXp) || 0), aRupture = Math.max(0, Number(t.legacyRupture) || 0);
      if (!aXp && !aRupture && !String(t.legacyDesc || "").trim()) return;
      var box = el("section", "pc-tech-legacy");
      box.appendChild(el("div", "pc-tech-legacy-title", "Données conservées de l’ancienne fiche"));
      if (aXp || aRupture) {
        var note = el("p", "pc-tech-legacy-note", "Coût historique non ventilé : il reste compté dans les totaux tant qu’il n’est pas réparti entre les rangs.");
        box.appendChild(note);
        var line = el("div", "pc-tech-legacy-costs");
        champNombre(line, t, "legacyXp", "XP non répartis", 0, 99999);
        champNombre(line, t, "legacyRupture", "Rupture non répartie", 0, 999);
        box.appendChild(line);
      }
      if (String(t.legacyDesc || "").trim()) {
        box.appendChild(el("div", "pc-tech-legacy-label", "Description générale conservée"));
        var legacy = el("div", "pc-tech-legacy-desc");
        notesRendu(legacy, t.legacyDesc, "plain"); box.appendChild(legacy);
        var edit = el("textarea", "pc-edit-field pc-tech-legacy-editor");
        edit.rows = 2; edit.value = t.legacyDesc; edit.placeholder = "Description historique";
        edit.addEventListener("input", function () { t.legacyDesc = edit.value; notesRendu(legacy, edit.value, "plain"); save(); });
        box.appendChild(edit);
        techHooks.push(function () { if (document.activeElement !== edit) edit.value = t.legacyDesc || ""; });
      }
      parent.appendChild(box);
    }
    function rendreRangs(a, t) {
      var pane = el("section", "pc-tech-pane pc-tech-ranks-pane");
      panneauTitre(pane, "Rangs", "");
      if (!t) {
        pane.appendChild(el("div", "pc-empty", a ? "Sélectionnez ou créez une technique." : "Sélectionnez un art puis une technique."));
        return pane;
      }
      var progress = el("div", "pc-tech-acquired");
      progress.appendChild(el("span", "pc-tech-acquired-label", "Rangs acquis"));
      var value = el("strong", "pc-tech-acquired-value", t.rang + " / " + t.rangs.length);
      progress.appendChild(value); pane.appendChild(progress);
      var list = el("div", "pc-tech-ranks-list");
      panneauHistorique(list, t);
      t.rangs.forEach(function (r, i) { list.appendChild(rangCarte(a, t, r, i)); });
      pane.appendChild(list);
      pane.appendChild(miniBtn("+ Ajouter un rang", null, function () {
        if (t.rangs.length >= 20) { flash("Une technique ne peut pas dépasser 20 rangs."); return; }
        t.rangs.push(nouveauRang("Rang " + (t.rangs.length + 1))); refresh(); rendre();
      }, "pc-edit-only pc-tech-add"));
      techHooks.push(function () { value.textContent = t.rang + " / " + t.rangs.length; });
      return pane;
    }

    function rendre() {
      techHooks = [];
      layout.innerHTML = "";
      var selection = selectionValide();
      layout.appendChild(rendreArts());
      layout.appendChild(rendreTechniques(selection.art));
      layout.appendChild(rendreRangs(selection.art, selection.technique));
      applyEdit(b, "techniques");
      techHooks.forEach(function (fn) { try { fn(); } catch (e) {} });
    }

    // Même principe que l'Inventaire : hauteur calculée depuis le haut du
    // module, en tenant compte de l'en-tête fixe du site et du viewport Roll20.
    function ajusteHauteur() {
      if (!layout.isConnected || !layout.offsetParent) return;
      var fixe = document.querySelector(".md-header");
      var autour = (layout.getBoundingClientRect().top - b.getBoundingClientRect().top) +
                   28 + (fixe ? fixe.offsetHeight : 0);
      var h = Math.max(420, Math.floor(window.innerHeight - autour));
      layout.style.setProperty("--tech-h", h + "px");
    }
    window.addEventListener("resize", ajusteHauteur);
    remontageNettoyage.push(function () { window.removeEventListener("resize", ajusteHauteur); });
    if (window.IntersectionObserver) {
      var observateur = new IntersectionObserver(function (e) {
        if (e[0] && e[0].isIntersecting) ajusteHauteur();
      });
      observateur.observe(layout);
      remontageNettoyage.push(function () { observateur.disconnect(); });
    }
    hooks.push(function () { ajusteHauteur(); });
    rendre();
    return b;
  }
