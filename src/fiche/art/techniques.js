  // ---- Arts et techniques ---------------------------------------------------
  // Un art contient ses techniques ; une technique porte ses propres rangs.
  // Chaque rang est autonome (nom, XP, rupture, description et format Notes).
  // Les anciens coûts restent séparés tant que le joueur ne les a pas ventilés.
  function buildTechniques() {
    var b = block("Techniques", null, null);
    var layout = el("div", "pc-techniques-layout");
    b.appendChild(layout);

    var artSelection = "", techniqueSelection = "";
    // L'édition est locale et liée au contexte sélectionné, comme l'édition
    // d'un objet d'inventaire : changer d'art ferme Techniques, changer de
    // technique ferme Rangs. Les Arts forment une liste globale.
    var editionArts = false, editionTechniquesArt = "", editionRangsTechnique = "";
    var panneauxTech = {};
    var techHooks = [], dragRang = null;
    hooks.push(function () {
      actualiseEditionColonne(panneauxTech.arts, "arts");
      actualiseEditionColonne(panneauxTech.techniques, "techniques");
      actualiseEditionColonne(panneauxTech.rangs, "rangs");
      techHooks.forEach(function (fn) { try { fn(); } catch (e) {} });
    });

    function arts() { return Array.isArray(state.techniques) ? state.techniques : (state.techniques = []); }
    function estDiviseur(entree) { return !!(entree && entree.type === "divider"); }
    function artDe(id) {
      return arts().filter(function (a) { return !estDiviseur(a) && a && a.id === id && Array.isArray(a.techniques); })[0] || null;
    }
    function techniqueDe(a, id) {
      return a && Array.isArray(a.techniques) ? a.techniques.filter(function (t) { return !estDiviseur(t) && t.id === id; })[0] || null : null;
    }
    function rangsDe(t) { return t && Array.isArray(t.rangs) ? t.rangs : []; }
    function selectionValide() {
      var ancienArt = artSelection, ancienneTechnique = techniqueSelection;
      var a = artDe(artSelection);
      if (!a) a = arts().filter(function (x) { return !estDiviseur(x); })[0] || null;
      var nouvelArt = a ? a.id : "";
      var t = techniqueDe(a, techniqueSelection);
      if (!t) t = a && a.techniques.filter(function (x) { return !estDiviseur(x); })[0] || null;
      var nouvelleTechnique = t ? t.id : "";
      if (nouvelArt !== ancienArt) {
        editionTechniquesArt = "";
        editionRangsTechnique = "";
      }
      if (nouvelleTechnique !== ancienneTechnique) editionRangsTechnique = "";
      artSelection = nouvelArt;
      techniqueSelection = nouvelleTechnique;
      return { art: a, technique: t };
    }
    function editionActive(colonne) {
      if (!ficheModifiable()) return false;
      if (colonne === "arts") return editionArts;
      if (colonne === "techniques") return !!artSelection && editionTechniquesArt === artSelection && !!artDe(artSelection);
      if (colonne === "rangs") return !!techniqueSelection && editionRangsTechnique === techniqueSelection && !!techniqueDe(artDe(artSelection), techniqueSelection);
      return false;
    }
    function actualiseEditionColonne(pane, colonne) {
      if (!pane) return;
      var actif = editionActive(colonne);
      pane.classList.toggle("editing", actif);
      Array.prototype.forEach.call(pane.querySelectorAll ? pane.querySelectorAll(".pc-edit-field") : [], function (field) {
        field.disabled = !actif;
      });
      Array.prototype.forEach.call(pane.querySelectorAll ? pane.querySelectorAll(".pc-edit-only") : [], function (control) {
        if ("disabled" in control) control.disabled = !actif;
      });
      var gear = pane.querySelector ? pane.querySelector(".pc-tech-pane-gear") : null;
      if (gear) {
        var selectionDisponible = colonne === "arts" || (colonne === "techniques" ? !!artDe(artSelection) : !!techniqueDe(artDe(artSelection), techniqueSelection));
        gear.disabled = !ficheModifiable() || !selectionDisponible;
        gear.title = actif ? "Terminer les modifications de cette colonne" : "Modifier cette colonne";
        gear.setAttribute("aria-label", gear.title);
        gear.setAttribute("aria-pressed", String(actif));
      }
      if (window.__owdApplyMode) window.__owdApplyMode(pane);
    }
    function basculeEditionColonne(pane, colonne) {
      if (!ficheModifiable()) return;
      if (colonne === "arts") editionArts = !editionArts;
      else if (colonne === "techniques") {
        if (!artDe(artSelection)) return;
        editionTechniquesArt = editionTechniquesArt === artSelection ? "" : artSelection;
      } else if (colonne === "rangs") {
        if (!techniqueDe(artDe(artSelection), techniqueSelection)) return;
        editionRangsTechnique = editionRangsTechnique === techniqueSelection ? "" : techniqueSelection;
      }
      actualiseEditionColonne(pane, colonne);
      techHooks.forEach(function (fn) { try { fn(); } catch (e) {} });
    }
    function gearColonne(pane, colonne) {
      var gear = el("button", "pc-gear pc-tech-pane-gear", "⚙");
      gear.type = "button";
      gear.addEventListener("click", function () { basculeEditionColonne(pane, colonne); });
      return gear;
    }
    function nouveauRang(nom) {
      return { id: uid("tr"), nom: nom || "", xp: 0, rupture: 0, desc: "", mode: "plain" };
    }
    function nouvelleTechnique() {
      return { id: uid("t"), nom: "", rang: 0, rangs: [nouveauRang("Rang 1")],
               affichage: "tout", legacyXp: 0, legacyRupture: 0, legacyDesc: "", offert: 0 };
    }
    function nouveauDiviseur() {
      return { id: uid("td"), type: "divider", nom: "Nouveau groupe", replie: false };
    }
    function premierIdTechnique(a) {
      var t = a && a.techniques ? a.techniques.filter(function (x) { return !estDiviseur(x); })[0] : null;
      return t ? t.id : "";
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
      // En lecture, une valeur nulle et son en-tête disparaissent sans
      // supprimer sa case : XP ne décale donc jamais la colonne Rupture.
      techHooks.push(function () {
        wrap.classList.toggle("is-zero", num(objet[cle], 0) === 0);
      });
      wrap.appendChild(input); parent.appendChild(wrap);
      return input;
    }
    function changeMode(parent, rang, read) {
      var group = el("div", "pc-notes-modes"), buttons = [];
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", "Format de la description");
      [["plain", "Brut"], ["markdown", "Markdown"]].forEach(function (pair) {
        var button = miniBtn(pair[1], null, function () {
          rang.mode = pair[0];
          sync();
          notesRendu(read, rang.desc || "", rang.mode);
          save();
        });
        buttons.push([button, pair[0]]);
        group.appendChild(button);
      });
      function sync() {
        buttons.forEach(function (pair) {
          pair[0].setAttribute("aria-pressed", String(rang.mode === pair[1]));
        });
      }
      function actualise() {
        sync();
        notesRendu(read, rang.desc || "", rang.mode);
      }
      actualise();
      parent.appendChild(group);
      techHooks.push(actualise);
      return actualise;
    }
    function coutRangs(liste, nombre, cle) {
      var total = 0;
      for (var i = 0; i < Math.min(Math.max(0, nombre), liste.length); i++)
        total += Math.max(0, num(liste[i] && liste[i][cle], 0));
      return total;
    }
    function libelleRangsAcquis(nombre) {
      return nombre + (nombre > 1 ? " rangs acquis" : " rang acquis");
    }
    function changeRangsAcquis(t, cible) {
      cible = clamp(cible, 0, t.rangs.length);
      if (cible === t.rang) return;
      var deltaXp = coutRangs(t.rangs, cible, "xp") - coutRangs(t.rangs, t.rang, "xp");
      var deltaRupture = coutRangs(t.rangs, cible, "rupture") - coutRangs(t.rangs, t.rang, "rupture");
      if (deltaXp > 0 && xpRestant() < deltaXp) { flash("XP insuffisant."); return; }
      if (deltaRupture > 0 && ruptureRestante() < deltaRupture) { flash("Aucun point de rupture disponible."); return; }
      t.rang = cible;
      refresh();
    }
    function nettoieDragRang() {
      dragRang = null;
      Array.prototype.forEach.call(layout.querySelectorAll(".pris, .avant, .apres"), function (node) {
        node.classList.remove("pris", "avant", "apres");
      });
    }
    function deplaceRang(t, sourceId, cibleId, avant) {
      if (!editionActive("rangs") || !dragRang || dragRang.techniqueId !== t.id) return false;
      var source = t.rangs.findIndex(function (r) { return r.id === sourceId; });
      var cible = t.rangs.findIndex(function (r) { return r.id === cibleId; });
      if (source < 0 || cible < 0 || source === cible) return false;
      var ordre = t.rangs.slice(), element = ordre.splice(source, 1)[0];
      cible = ordre.findIndex(function (r) { return r.id === cibleId; });
      ordre.splice(cible + (avant ? 0 : 1), 0, element);
      var deltaXp = coutRangs(ordre, t.rang, "xp") - coutRangs(t.rangs, t.rang, "xp");
      var deltaRupture = coutRangs(ordre, t.rang, "rupture") - coutRangs(t.rangs, t.rang, "rupture");
      if (deltaXp > 0 && xpRestant() < deltaXp) { flash("Réorganisation refusée : XP insuffisant pour les rangs acquis."); return false; }
      if (deltaRupture > 0 && ruptureRestante() < deltaRupture) { flash("Réorganisation refusée : points de rupture insuffisants pour les rangs acquis."); return false; }
      t.rangs = ordre;
      refresh(); rendre();
      return true;
    }
    function cibleRang(card, t, rang) {
      card.addEventListener("dragover", function (e) {
        if (!editionActive("rangs") || !dragRang || dragRang.techniqueId !== t.id || dragRang.rangId === rang.id) return;
        e.preventDefault(); e.stopPropagation();
        var r = card.getBoundingClientRect(), avant = e.clientY < r.top + r.height / 2;
        card.classList.toggle("avant", avant); card.classList.toggle("apres", !avant);
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      });
      card.addEventListener("dragleave", function (e) {
        if (e.relatedTarget && card.contains(e.relatedTarget)) return;
        card.classList.remove("avant", "apres");
      });
      card.addEventListener("drop", function (e) {
        if (!editionActive("rangs") || !dragRang || dragRang.techniqueId !== t.id || dragRang.rangId === rang.id) return;
        e.preventDefault(); e.stopPropagation();
        var r = card.getBoundingClientRect();
        deplaceRang(t, dragRang.rangId, rang.id, e.clientY < r.top + r.height / 2);
        nettoieDragRang();
      });
    }

    function idGlisse(e, type, id) {
      var colonne = type === "art" || type === "divider-art" ? "arts" : "techniques";
      if (!editionActive(colonne) || !e.dataTransfer) { e.preventDefault(); return; }
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", type + "|" + id);
    }
    function lireGlisse(e) {
      if (!e.dataTransfer) return null;
      var raw = e.dataTransfer.getData("text/plain") || "";
      var p = raw.split("|");
      return p.length === 2 && ["art", "tech", "divider-art", "divider-tech"].indexOf(p[0]) >= 0
        ? { type: p[0], id: p[1] } : null;
    }
    function zoneDepot(node, reception, colonne) {
      node.addEventListener("dragover", function (e) {
        // Une technique peut être déposée directement sur un art pour la
        // déplacer : ce geste relève du rouage Techniques, même si la cible
        // se trouve dans la colonne Arts.
        if (!editionActive(colonne) && !(colonne === "arts" && editionActive("techniques"))) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        node.classList.add("drop-target");
      });
      node.addEventListener("dragleave", function (e) {
        if (!node.contains(e.relatedTarget)) node.classList.remove("drop-target");
      });
      node.addEventListener("drop", function (e) {
        var drag = lireGlisse(e); if (!drag) return;
        var autorise = editionActive(colonne) || (colonne === "arts" && drag.type === "tech" && editionActive("techniques"));
        if (!autorise) return;
        e.preventDefault(); e.stopPropagation(); node.classList.remove("drop-target");
        reception(drag);
      });
    }
    function deplaceEntree(liste, id, avantId) {
      var from = liste.findIndex(function (x) { return x && x.id === id; });
      if (from < 0 || id === avantId) return false;
      var item = liste.splice(from, 1)[0];
      var to = avantId ? liste.findIndex(function (x) { return x && x.id === avantId; }) : -1;
      liste.splice(to < 0 ? liste.length : to, 0, item);
      return true;
    }
    function deplaceArt(id, avantId) {
      return deplaceEntree(arts(), id, avantId);
    }
    function deplaceTechnique(id, artCibleId, avantId) {
      var sourceArt = null, sourceIndex = -1, technique = null;
      arts().some(function (a) {
        if (!a || !Array.isArray(a.techniques)) return false;
        var i = a.techniques.findIndex(function (t) { return !estDiviseur(t) && t.id === id; });
        if (i < 0) return false;
        sourceArt = a; sourceIndex = i; technique = a.techniques[i]; return true;
      });
      var cible = artDe(artCibleId);
      if (!technique || !sourceArt || !cible) return false;
      if (sourceArt === cible && avantId === id) return false;
      sourceArt.techniques.splice(sourceIndex, 1);
      var to = avantId ? cible.techniques.findIndex(function (x) { return x && x.id === avantId; }) : -1;
      cible.techniques.splice(to < 0 ? cible.techniques.length : to, 0, technique);
      return true;
    }
    function deplaceDiviseurTechnique(id, artCibleId, avantId) {
      var sourceArt = null, sourceIndex = -1, diviseur = null;
      arts().some(function (a) {
        if (!a || !Array.isArray(a.techniques)) return false;
        var i = a.techniques.findIndex(function (x) { return estDiviseur(x) && x.id === id; });
        if (i < 0) return false;
        sourceArt = a; sourceIndex = i; diviseur = a.techniques[i]; return true;
      });
      var cible = artDe(artCibleId);
      if (!diviseur || !sourceArt || !cible) return false;
      if (sourceArt === cible && avantId === id) return false;
      sourceArt.techniques.splice(sourceIndex, 1);
      var to = avantId ? cible.techniques.findIndex(function (x) { return x && x.id === avantId; }) : -1;
      cible.techniques.splice(to < 0 ? cible.techniques.length : to, 0, diviseur);
      return true;
    }
    function appliqueReplis(liste) {
      var replie = false;
      Array.prototype.forEach.call(liste.children || [], function (node) {
        if (node.classList && node.classList.contains("pc-tech-divider")) {
          replie = node.dataset.collapsed === "true";
          node.hidden = false;
          node.classList.toggle("collapsed", replie);
        } else node.hidden = replie;
      });
    }
    function termineGlisse(changement) {
      if (!changement) return;
      refresh(); rendre();
    }

    function panneauTitre(parent, titre, description, colonne) {
      var head = el("div", "pc-tech-pane-title");
      head.appendChild(el("span", null, titre));
      if (description) head.appendChild(el("small", null, description));
      head.appendChild(gearColonne(parent, colonne));
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
        artSelection = a.id; techniqueSelection = premierIdTechnique(a); rendre();
      });
      item.appendChild(read);
      var name = el("input", "pc-edit-field pc-tech-item-name");
      name.type = "text"; name.value = a.nom || ""; name.placeholder = "Nom de l’art";
      name.setAttribute("aria-label", "Nom de l’art");
      name.addEventListener("input", function () { a.nom = name.value; read.textContent = name.value || "Art sans nom"; save(); });
      item.appendChild(name);
      item.appendChild(miniBtn("×", "Supprimer cet art", function () {
        if (!editionActive("arts")) return;
        function retire() {
          arts().splice(arts().indexOf(a), 1);
          if (artSelection === a.id) { artSelection = ""; techniqueSelection = ""; }
          refresh(); rendre();
        }
        var nbTechniques = a.techniques.filter(function (x) { return !estDiviseur(x); }).length;
        if (nbTechniques) confirmer("Supprimer un art", "« " + (a.nom || "Cet art") + " » contient " + nbTechniques + (nbTechniques > 1 ? " techniques. " : " technique. ") + "Supprimer l’art et toutes ses techniques ?", "Tout supprimer", retire);
        else retire();
      }, "danger pc-edit-only"));
      zoneDepot(item, function (drag) {
        if (drag.type === "art" || drag.type === "divider-art") termineGlisse(deplaceArt(drag.id, a.id));
        else if (drag.type === "tech") termineGlisse(deplaceTechnique(drag.id, a.id, null));
      }, "arts");
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
        if (!editionActive("techniques")) return;
        confirmer("Supprimer une technique", "Supprimer « " + (t.nom || "cette technique") + " » et tous ses rangs ? Ses coûts ne seront plus comptés.", "Supprimer", function () {
          a.techniques.splice(a.techniques.indexOf(t), 1);
          if (techniqueSelection === t.id) techniqueSelection = premierIdTechnique(a);
          refresh(); rendre();
        });
      }, "danger pc-edit-only"));
      zoneDepot(item, function (drag) {
        if (drag.type === "tech") termineGlisse(deplaceTechnique(drag.id, a.id, t.id));
        else if (drag.type === "divider-tech") termineGlisse(deplaceDiviseurTechnique(drag.id, a.id, t.id));
      }, "techniques");
      liste.appendChild(item);
    }
    function ligneDiviseur(diviseur, liste, colonne, art) {
      var item = el("div", "pc-tech-divider pc-tech-divider-" + colonne);
      item.dataset.collapsed = String(diviseur.replie === true);
      var drag = el("button", "pc-comp-drag pc-edit-only", "⠿");
      drag.type = "button"; drag.title = "Glisser pour réordonner ce diviseur";
      drag.setAttribute("aria-label", drag.title); drag.draggable = true;
      drag.addEventListener("dragstart", function (e) {
        e.stopPropagation(); idGlisse(e, colonne === "art" ? "divider-art" : "divider-tech", diviseur.id);
      });
      drag.addEventListener("dragend", function (e) { e.stopPropagation(); item.classList.remove("drop-target"); });
      item.appendChild(drag);

      var toggle = el("button", "pc-tech-divider-toggle");
      toggle.type = "button";
      var arrow = el("span", "pc-tech-divider-arrow", diviseur.replie ? "▸" : "▾");
      var label = el("span", "pc-tech-divider-label", diviseur.nom || "Diviseur sans nom");
      toggle.appendChild(arrow); toggle.appendChild(label);
      toggle.setAttribute("aria-expanded", String(diviseur.replie !== true));
      toggle.addEventListener("click", function () {
        diviseur.replie = diviseur.replie !== true;
        item.dataset.collapsed = String(diviseur.replie);
        item.classList.toggle("collapsed", diviseur.replie);
        arrow.textContent = diviseur.replie ? "▸" : "▾";
        toggle.setAttribute("aria-expanded", String(!diviseur.replie));
        appliqueReplis(liste); save();
      });
      item.appendChild(toggle);

      var name = el("input", "pc-edit-field pc-tech-divider-name");
      name.type = "text"; name.value = diviseur.nom || ""; name.placeholder = "Nom du groupe";
      name.setAttribute("aria-label", "Nom du diviseur");
      name.addEventListener("input", function () {
        diviseur.nom = name.value; label.textContent = name.value || "Diviseur sans nom"; save();
      });
      item.appendChild(name);
      item.appendChild(miniBtn("×", "Supprimer ce diviseur", function () {
        if (!editionActive(colonne === "art" ? "arts" : "techniques")) return;
        var cible = colonne === "art" ? arts() : (art && art.techniques);
        if (!cible) return;
        cible.splice(cible.indexOf(diviseur), 1);
        refresh(); rendre();
      }, "danger pc-edit-only pc-tech-divider-del"));

      zoneDepot(item, function (drag) {
        if (colonne === "art") {
          if (drag.type === "art" || drag.type === "divider-art") termineGlisse(deplaceArt(drag.id, diviseur.id));
        } else {
          if (drag.type === "tech") termineGlisse(deplaceTechnique(drag.id, art.id, diviseur.id));
          else if (drag.type === "divider-tech") termineGlisse(deplaceDiviseurTechnique(drag.id, art.id, diviseur.id));
        }
      }, colonne === "art" ? "arts" : "techniques");
      liste.appendChild(item);
      return item;
    }

    function rendreArts() {
      var pane = el("section", "pc-tech-pane pc-editable pc-tech-arts");
      panneauxTech.arts = pane;
      panneauTitre(pane, "Arts", "", "arts");
      var liste = el("div", "pc-tech-list pc-tech-art-list");
      var sel = selectionValide();
      arts().forEach(function (a) {
        if (estDiviseur(a)) ligneDiviseur(a, liste, "art", null);
        else ligneArt(a, liste);
      });
      if (!arts().some(function (a) { return !estDiviseur(a); })) liste.appendChild(el("div", "pc-empty", "Aucun art."));
      appliqueReplis(liste);
      zoneDepot(liste, function (drag) {
        if (drag.type === "art" || drag.type === "divider-art") termineGlisse(deplaceArt(drag.id, null));
        else if (drag.type === "tech" && sel.art) termineGlisse(deplaceTechnique(drag.id, sel.art.id, null));
      }, "arts");
      pane.appendChild(liste);
      pane.appendChild(miniBtn("+ Art", null, function () {
        if (!editionActive("arts")) return;
        var a = { id: uid("art"), nom: "Nouvel art", techniques: [] };
        arts().push(a); artSelection = a.id; techniqueSelection = ""; refresh(); rendre();
      }, "pc-edit-only pc-tech-add"));
      pane.appendChild(miniBtn("+ Diviseur", null, function () {
        if (!editionActive("arts")) return;
        arts().push(nouveauDiviseur()); refresh(); rendre();
      }, "pc-edit-only pc-tech-add"));
      return pane;
    }
    function rendreTechniques(a) {
      var pane = el("section", "pc-tech-pane pc-editable pc-tech-list-pane");
      panneauxTech.techniques = pane;
      panneauTitre(pane, "Techniques", "", "techniques");
      var liste = el("div", "pc-tech-list pc-technique-list");
      if (a) {
        a.techniques.forEach(function (t) {
          if (estDiviseur(t)) ligneDiviseur(t, liste, "technique", a);
          else ligneTechnique(t, a, liste);
        });
        if (!a.techniques.some(function (t) { return !estDiviseur(t); })) liste.appendChild(el("div", "pc-empty", "Aucune technique."));
        appliqueReplis(liste);
        zoneDepot(liste, function (drag) {
          if (drag.type === "tech") termineGlisse(deplaceTechnique(drag.id, a.id, null));
          else if (drag.type === "divider-tech") termineGlisse(deplaceDiviseurTechnique(drag.id, a.id, null));
        }, "techniques");
      } else liste.appendChild(el("div", "pc-empty", "Aucune technique."));
      pane.appendChild(liste);
      if (a) {
        pane.appendChild(miniBtn("+ Technique", null, function () {
          if (!editionActive("techniques")) return;
          var t = nouvelleTechnique(); a.techniques.push(t); techniqueSelection = t.id; refresh(); rendre();
        }, "pc-edit-only pc-tech-add"));
        pane.appendChild(miniBtn("+ Diviseur", null, function () {
          if (!editionActive("techniques")) return;
          a.techniques.push(nouveauDiviseur()); refresh(); rendre();
        }, "pc-edit-only pc-tech-add"));
      }
      return pane;
    }

    function rangCarte(a, t, rang, index) {
      if (rang.mode !== "markdown") rang.mode = "plain";
      var card = el("article", "pc-tech-rank" + (index < t.rang ? " acquired" : ""));
      card.dataset.syncEntity = rang.id;
      var head = el("div", "pc-tech-rank-head");

      var dragSlot = el("span", "pc-tech-rank-drag-slot");
      var drag = el("button", "pc-comp-drag pc-edit-only", "⠿");
      drag.type = "button"; drag.title = "Glisser pour réordonner les rangs";
      drag.setAttribute("aria-label", drag.title); drag.draggable = true;
      drag.addEventListener("dragstart", function (e) {
        e.stopPropagation();
        if (!editionActive("rangs")) { e.preventDefault(); return; }
        dragRang = { techniqueId: t.id, rangId: rang.id };
        card.classList.add("pris");
        if (e.dataTransfer) {
          e.dataTransfer.setData("text/plain", "owd-techniques-rang");
          e.dataTransfer.effectAllowed = "move";
        }
      });
      drag.addEventListener("dragend", function (e) { e.stopPropagation(); nettoieDragRang(); });
      dragSlot.appendChild(drag); head.appendChild(dragSlot);

      var nameWrap = el("label", "pc-tech-rank-name");
      nameWrap.appendChild(el("span", "pc-tech-rank-label", "Nom"));
      var name = el("input", "pc-edit-field"); name.type = "text"; name.value = rang.nom || "";
      name.placeholder = "Nom du rang"; name.setAttribute("aria-label", "Nom du rang");
      name.addEventListener("input", function () { rang.nom = name.value; save(); });
      nameWrap.appendChild(name); head.appendChild(nameWrap);

      var deleteSlot = el("span", "pc-tech-rank-del-slot");
      deleteSlot.appendChild(miniBtn("×", "Supprimer ce rang", function () {
        if (!editionActive("rangs")) return;
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
      head.appendChild(deleteSlot);
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
      cibleRang(card, t, rang);
      techHooks.push(function () {
        if (document.activeElement !== name) name.value = rang.nom || "";
        if (document.activeElement !== editor) editor.value = rang.desc || "";
        card.classList.toggle("acquired", t.rangs.indexOf(rang) < t.rang);
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
      var pane = el("section", "pc-tech-pane pc-editable pc-tech-ranks-pane");
      panneauxTech.rangs = pane;
      panneauTitre(pane, "Rangs", "", "rangs");
      if (!t) {
        pane.appendChild(el("div", "pc-empty", "Aucun rang."));
        actualiseEditionColonne(pane, "rangs");
        return pane;
      }
      var affichage = el("div", "pc-tech-display");
      affichage.appendChild(el("span", "pc-tech-display-label", "Affichage"));
      var affichageModes = el("div", "pc-notes-modes pc-tech-display-modes");
      affichageModes.setAttribute("role", "group");
      affichageModes.setAttribute("aria-label", "Affichage des rangs");
      var boutonsAffichage = [], cartesRangs = [];
      function actualiseAffichage() {
        var mode = ["tout", "acquis", "meilleur"].indexOf(t.affichage) >= 0 ? t.affichage : "tout";
        boutonsAffichage.forEach(function (pair) {
          pair[0].setAttribute("aria-pressed", String(mode === pair[1]));
        });
        cartesRangs.forEach(function (card, i) {
          var visible = mode === "tout" ||
            (mode === "acquis" && i < t.rang) ||
            (mode === "meilleur" && t.rang > 0 && i === t.rang - 1);
          card.hidden = !visible;
        });
      }
      [["tout", "Tout"], ["acquis", "Acquis"], ["meilleur", "Meilleur"]].forEach(function (pair) {
        var button = miniBtn(pair[1], null, function () {
          t.affichage = pair[0];
          actualiseAffichage();
          save();
        });
        boutonsAffichage.push([button, pair[0]]);
        affichageModes.appendChild(button);
      });
      affichage.appendChild(affichageModes);
      pane.appendChild(affichage);

      var progress = el("div", "pc-tech-acquired");
      progress.appendChild(el("span", "pc-tech-acquired-label", "Rangs acquis"));
      var bar = el("span", "pc-stadebar pc-tech-acquired-bar");
      var segments = [], champRangsAcquis = null;
      if (t.rangs.length > 10) {
        // Au-delà de dix rangs, un champ numérique compact remplace les cases.
        // Il garde l'ancrage à droite et le même contrat d'édition/coûts.
        champRangsAcquis = el("input", "pc-tech-acquired-input");
        champRangsAcquis.type = "text";
        champRangsAcquis.inputMode = "numeric";
        champRangsAcquis.pattern = "[0-9]*";
        champRangsAcquis.maxLength = 2;
        champRangsAcquis.value = String(t.rang);
        champRangsAcquis.readOnly = !editionActive("rangs");
        champRangsAcquis.setAttribute("aria-label", "Nombre de rangs acquis");
        champRangsAcquis.title = "Rangs acquis (0 à " + t.rangs.length + ")";
        var totalRangs = el("span", "pc-tech-acquired-total", "/ " + t.rangs.length);
        function valideChampRangsAcquis() {
          if (!editionActive("rangs")) { champRangsAcquis.value = String(t.rang); return; }
          var brut = String(champRangsAcquis.value || "").trim();
          if (!/^\d+$/.test(brut)) {
            champRangsAcquis.value = String(t.rang);
            return;
          }
          changeRangsAcquis(t, clamp(parseInt(brut, 10), 0, t.rangs.length));
          champRangsAcquis.value = String(t.rang);
        }
        champRangsAcquis.addEventListener("change", valideChampRangsAcquis);
        champRangsAcquis.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            valideChampRangsAcquis();
            if (champRangsAcquis.blur) champRangsAcquis.blur();
          }
        });
        bar.appendChild(champRangsAcquis);
        bar.appendChild(totalRangs);
        techHooks.push(function () {
          if (document.activeElement !== champRangsAcquis) champRangsAcquis.value = String(t.rang);
          champRangsAcquis.readOnly = !editionActive("rangs");
          totalRangs.textContent = "/ " + t.rangs.length;
        });
      } else {
        t.rangs.forEach(function (rang, i) {
          var segment = el("button", "seg s" + Math.min(i + 1, 5), String(i + 1));
          // Dégradé continu entre la première nuance et la teinte finale
          // historique, quel que soit le nombre de rangs.
          var progression = t.rangs.length <= 1 ? 0 : i / (t.rangs.length - 1);
          var fin = Math.round(progression * 1000) / 10;
          segment.style.setProperty("--tech-rang-debut", (100 - fin) + "%");
          segment.style.setProperty("--tech-rang-fin", fin + "%");
          segment.type = "button";
          segment.title = (rang.nom || ("Rang " + (i + 1))) + " — définir " + libelleRangsAcquis(i + 1);
          segment.addEventListener("click", function () {
            if (!editionActive("rangs")) return;
            // Un second clic sur le rang déjà sélectionné remet la technique à 0.
            changeRangsAcquis(t, t.rang === i + 1 ? 0 : i + 1);
          });
          bar.appendChild(segment); segments.push(segment);
        });
      }
      progress.appendChild(bar); pane.appendChild(progress);
      function actualiseRangsAcquis() {
        segments.forEach(function (segment, i) {
          segment.classList.toggle("on", i < t.rang);
          segment.classList.toggle("cur", i === t.rang - 1);
          segment.title = (t.rangs[i].nom || ("Rang " + (i + 1))) + " — " +
            (i < t.rang ? "acquis" : "non acquis") + " · cliquer pour " + libelleRangsAcquis(i + 1);
        });
        if (champRangsAcquis && document.activeElement !== champRangsAcquis)
          champRangsAcquis.value = String(t.rang);
      }
      actualiseRangsAcquis(); techHooks.push(actualiseRangsAcquis);
      var list = el("div", "pc-tech-ranks-list");
      panneauHistorique(list, t);
      t.rangs.forEach(function (r, i) {
        var card = rangCarte(a, t, r, i);
        cartesRangs.push(card);
        list.appendChild(card);
      });
      actualiseAffichage();
      techHooks.push(actualiseAffichage);
      pane.appendChild(list);
      pane.appendChild(miniBtn("+ Rang", null, function () {
        if (!editionActive("rangs")) return;
        if (t.rangs.length >= 20) { flash("Une technique ne peut pas dépasser 20 rangs."); return; }
        t.rangs.push(nouveauRang("Rang " + (t.rangs.length + 1))); refresh(); rendre();
      }, "pc-edit-only pc-tech-add"));
      actualiseEditionColonne(pane, "rangs");
      return pane;
    }

    function rendre() {
      techHooks = [];
      panneauxTech = {};
      layout.innerHTML = "";
      var selection = selectionValide();
      layout.appendChild(rendreArts());
      layout.appendChild(rendreTechniques(selection.art));
      layout.appendChild(rendreRangs(selection.art, selection.technique));
      actualiseEditionColonne(panneauxTech.arts, "arts");
      actualiseEditionColonne(panneauxTech.techniques, "techniques");
      actualiseEditionColonne(panneauxTech.rangs, "rangs");
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
