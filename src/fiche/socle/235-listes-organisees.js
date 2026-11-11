  // ---- listes organisées : Arts, Énergie et Notes --------------------------
  //
  // Etat commun :
  //   [{ id, nom, elements: [ {id, nom, entrees:[{id,nom,desc,mode}]} | diviseur ] } | diviseur]
  // Les catalogues à coût ajoutent cout et acquis à leurs entrées.
  // Les diviseurs vivent dans les deux premières colonnes, comme pour Arts.
  function buildListeOrganisee(config) {
    var b = block(config.titre, null, null);
    var layout = el("div", "pc-techniques-layout pc-liste-organisee-layout");
    b.appendChild(layout);

    var selectionGroupe = "", selectionElement = "";
    var editionGroupes = false, editionElementsGroupe = "", editionEntreesElement = "";
    var panneaux = {}, listeHooks = [], dragEntree = null, empreinteRendu = "";
    var groupesRendus = null;

    function conserveRendu() { empreinteRendu = JSON.stringify(groupes()); }

    function groupes() {
      if (config.groupesDe) return config.groupesDe();
      if (!Array.isArray(state[config.cle])) state[config.cle] = [];
      return state[config.cle];
    }
    function estDiviseur(x) { return !!(x && x.type === "divider"); }
    function groupeDe(id) {
      return groupes().filter(function (g) { return g && !estDiviseur(g) && g.id === id && Array.isArray(g.elements); })[0] || null;
    }
    function elementDe(g, id) {
      return g && Array.isArray(g.elements)
        ? g.elements.filter(function (x) { return x && !estDiviseur(x) && x.id === id; })[0] || null
        : null;
    }
    function entreesDe(x) { return x && Array.isArray(x.entrees) ? x.entrees : []; }
    function premierElement(g) {
      var x = g && g.elements ? g.elements.filter(function (e) { return e && !estDiviseur(e); })[0] : null;
      return x ? x.id : "";
    }
    function selectionValide() {
      var ancienGroupe = selectionGroupe, ancienElement = selectionElement;
      var g = groupeDe(selectionGroupe);
      if (!g) {
        var candidats = groupes().filter(function (x) { return x && !estDiviseur(x); });
        g = candidats[0] || null;
      }
      var nouvelGroupe = g ? g.id : "";
      var x = elementDe(g, selectionElement);
      if (!x) x = g && g.elements.filter(function (e) { return e && !estDiviseur(e); })[0] || null;
      var nouvelElement = x ? x.id : "";
      if (nouvelGroupe !== ancienGroupe) {
        editionElementsGroupe = "";
        editionEntreesElement = "";
      }
      if (nouvelElement !== ancienElement) editionEntreesElement = "";
      selectionGroupe = nouvelGroupe;
      selectionElement = nouvelElement;
      return { groupe: g, element: x };
    }
    function editionActive(colonne) {
      if (!ficheModifiable()) return false;
      if (colonne === "groupes") return editionGroupes;
      if (colonne === "elements") return !!selectionGroupe && editionElementsGroupe === selectionGroupe && !!groupeDe(selectionGroupe);
      if (colonne === "entrees") return !!selectionElement && editionEntreesElement === selectionElement && !!elementDe(groupeDe(selectionGroupe), selectionElement);
      return false;
    }
    function actualiseEdition(pane, colonne) {
      if (!pane) return;
      var actif = editionActive(colonne);
      appliqueVerrouGlobal(pane);
      pane.classList.toggle("editing", actif);
      Array.prototype.forEach.call(pane.querySelectorAll ? pane.querySelectorAll(".pc-edit-field") : [], function (field) {
        field.disabled = !actif;
      });
      Array.prototype.forEach.call(pane.querySelectorAll ? pane.querySelectorAll(".pc-edit-only") : [], function (control) {
        if ("disabled" in control) control.disabled = !actif;
      });
      var gear = pane.querySelector ? pane.querySelector(".pc-tech-pane-gear") : null;
      if (gear) {
        var disponible = colonne === "groupes" || (colonne === "elements" ? !!groupeDe(selectionGroupe) : !!elementDe(groupeDe(selectionGroupe), selectionElement));
        gear.disabled = !ficheModifiable() || !disponible;
        gear.title = actif ? "Terminer les modifications de cette colonne" : "Modifier cette colonne";
        gear.setAttribute("aria-label", gear.title);
        gear.setAttribute("aria-pressed", String(actif));
      }

    }
    function basculeEdition(pane, colonne) {
      if (!ficheModifiable()) return;
      if (colonne === "groupes") editionGroupes = !editionGroupes;
      else if (colonne === "elements") {
        if (!groupeDe(selectionGroupe)) return;
        editionElementsGroupe = editionElementsGroupe === selectionGroupe ? "" : selectionGroupe;
      } else if (colonne === "entrees") {
        if (!elementDe(groupeDe(selectionGroupe), selectionElement)) return;
        editionEntreesElement = editionEntreesElement === selectionElement ? "" : selectionElement;
      }
      actualiseEdition(pane, colonne);
      listeHooks.forEach(function (fn) { try { fn(); } catch (e) {} });
    }
    function gearColonne(pane, colonne) {
      var gear = el("button", "pc-gear pc-tech-pane-gear", "⚙");
      gear.type = "button";
      gear.addEventListener("click", function () { basculeEdition(pane, colonne); });
      return gear;
    }
    function titreColonne(pane, titre, colonne) {
      var head = el("div", "pc-tech-pane-title");
      head.appendChild(el("span", null, titre));
      head.appendChild(gearColonne(pane, colonne));
      pane.appendChild(head);
    }
    function nouveauDiviseur() {
      return { id: uid("ld"), type: "divider", nom: "Nouveau groupe", replie: false };
    }
    function nouveauGroupe() {
      return { id: uid("lg"), nom: config.nouveauGroupe, elements: [] };
    }
    function nouvelElement() {
      return { id: uid("le"), nom: config.nouvelElement, entrees: [] };
    }
    function nouvelleEntree() {
      return { id: uid("li"), nom: "", desc: "", mode: "plain",
        ...(config.unite ? { acquis: false } : {}) };
    }
    function choixGroupe(id) {
      var ancien = selectionGroupe;
      selectionGroupe = id;
      var g = groupeDe(id);
      selectionElement = premierElement(g);
      if (ancien !== id) { editionElementsGroupe = ""; editionEntreesElement = ""; }
      rendre();
    }
    function choixElement(id) {
      if (selectionElement !== id) editionEntreesElement = "";
      selectionElement = id;
      rendre();
    }

    function appliquerReplis(liste) {
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
      rendre(); refresh();
    }
    function colonnePourType(type) {
      if (type === "groupe" || type === "diviseur-groupe") return "groupes";
      if (type === "element" || type === "diviseur-element") return "elements";
      if (type === "entree") return "entrees";
      return "";
    }
    function idGlisse(e, type, id) {
      if (!editionActive(colonnePourType(type)) || !e.dataTransfer) { e.preventDefault(); return; }
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", type + "|" + id);
    }
    function lireGlisse(e) {
      if (!e.dataTransfer) return null;
      var p = String(e.dataTransfer.getData("text/plain") || "").split("|");
      return p.length === 2 && ["groupe", "diviseur-groupe", "element", "diviseur-element", "entree"].indexOf(p[0]) >= 0
        ? { type: p[0], id: p[1] } : null;
    }
    function reordonne(liste, id, avantId) {
      var from = liste.findIndex(function (x) { return x && x.id === id; });
      if (from < 0 || id === avantId) return false;
      var objet = liste.splice(from, 1)[0];
      var to = avantId ? liste.findIndex(function (x) { return x && x.id === avantId; }) : -1;
      liste.splice(to < 0 ? liste.length : to, 0, objet);
      return true;
    }
    function deplaceElement(id, groupeCibleId, avantId) {
      var source = null, index = -1, objet = null;
      groupes().some(function (g) {
        if (!g || !Array.isArray(g.elements)) return false;
        var i = g.elements.findIndex(function (x) { return x && !estDiviseur(x) && x.id === id; });
        if (i < 0) return false;
        source = g; index = i; objet = g.elements[i]; return true;
      });
      var cible = groupeDe(groupeCibleId);
      if (!objet || !source || !cible) return false;
      if (source === cible && avantId === id) return false;
      source.elements.splice(index, 1);
      var to = avantId ? cible.elements.findIndex(function (x) { return x && x.id === avantId; }) : -1;
      cible.elements.splice(to < 0 ? cible.elements.length : to, 0, objet);
      selectionGroupe = cible.id;
      selectionElement = objet.id;
      if (source.id !== cible.id) { editionElementsGroupe = ""; editionEntreesElement = ""; }
      return true;
    }
    function deplaceDiviseurElement(id, groupeCibleId, avantId) {
      var source = null, index = -1, objet = null;
      groupes().some(function (g) {
        if (!g || !Array.isArray(g.elements)) return false;
        var i = g.elements.findIndex(function (x) { return estDiviseur(x) && x.id === id; });
        if (i < 0) return false;
        source = g; index = i; objet = g.elements[i]; return true;
      });
      var cible = groupeDe(groupeCibleId);
      if (!objet || !source || !cible || source !== cible || avantId === id) return false;
      return reordonne(cible.elements, id, avantId);
    }
    function zoneDepotListe(node, reception, colonne) {
      node.addEventListener("dragover", function (e) {
        if (!editionActive(colonne)) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        node.classList.add("drop-target");
      });
      node.addEventListener("dragleave", function (e) {
        if (!node.contains(e.relatedTarget)) node.classList.remove("drop-target");
      });
      node.addEventListener("drop", function (e) {
        var drag = lireGlisse(e);
        if (!drag || !editionActive(colonne)) return;
        e.preventDefault(); e.stopPropagation(); node.classList.remove("drop-target");
        reception(drag);
      });
    }
    function cibleElement(card, groupe, element) {
      card.addEventListener("dragover", function (e) {
        var drag = lireGlisse(e);
        var ok = editionActive("elements") && drag && (drag.type === "element" || (drag.type === "diviseur-element" && groupeDe(selectionGroupe) === groupe));
        if (!ok || drag.id === element.id) return;
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
        var drag = lireGlisse(e);
        if (!drag || !editionActive("elements") || drag.id === element.id) return;
        e.preventDefault(); e.stopPropagation();
        if (drag.type === "element") termineGlisse(deplaceElement(drag.id, groupe.id, element.id));
        else if (drag.type === "diviseur-element") termineGlisse(deplaceDiviseurElement(drag.id, groupe.id, element.id));
      });
    }
    function cibleEntree(card, element, entree) {
      card.addEventListener("dragover", function (e) {
        if (!editionActive("entrees") || !dragEntree || dragEntree.elementId !== element.id || dragEntree.entreeId === entree.id) return;
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
        if (!editionActive("entrees") || !dragEntree || dragEntree.elementId !== element.id || dragEntree.entreeId === entree.id) return;
        e.preventDefault(); e.stopPropagation();
        var r = card.getBoundingClientRect();
        var liste = entreesDe(element);
        var indexCible = liste.indexOf(entree);
        var avantId = r && e.clientY < r.top + r.height / 2
          ? entree.id
          : (liste[indexCible + 1] ? liste[indexCible + 1].id : null);
        termineGlisse(reordonne(liste, dragEntree.entreeId, avantId));
        dragEntree = null;
      });
    }
    function panneauTitre(pane, titre, colonne) {
      var head = el("div", "pc-tech-pane-title");
      head.appendChild(el("span", null, titre));
      head.appendChild(gearColonne(pane, colonne));
      pane.dataset.jjkColumnEdit = "";
      pane.appendChild(head);
    }

    function ligneGroupe(g, liste) {
      var item = el("div", "pc-tech-item" + (g.id === selectionGroupe ? " selected" : ""));
      item.dataset.syncEntity = g.id;
      var drag = el("button", "pc-comp-drag pc-edit-only", "⠿");
      drag.type = "button"; drag.title = "Glisser pour réordonner les " + config.groupes.toLocaleLowerCase();
      drag.setAttribute("aria-label", drag.title); drag.draggable = true;
      drag.addEventListener("dragstart", function (e) { e.stopPropagation(); idGlisse(e, "groupe", g.id); });
      drag.addEventListener("dragend", function (e) { e.stopPropagation(); item.classList.remove("drop-target"); });
      item.appendChild(drag);
      var read = el("button", "pc-tech-item-read", g.nom || config.groupeSansNom);
      read.type = "button"; read.addEventListener("click", function () { choixGroupe(g.id); });
      read.setAttribute("aria-pressed", String(item.classList.contains("selected")));
      item.appendChild(read);
      var name = el("input", "pc-edit-field pc-tech-item-name");
      name.type = "text"; name.value = g.nom || ""; name.placeholder = config.groupes;
      name.setAttribute("aria-label", config.groupes);
      name.addEventListener("input", function () { g.nom = name.value; conserveRendu(); read.textContent = name.value || config.groupeSansNom; save(); });
      item.appendChild(name);
      if (!config.groupesObligatoires) item.appendChild(miniBtn("×", "Supprimer " + config.groupeDefini, function () {
        if (!editionActive("groupes")) return;
        function retire() {
          var index = groupes().indexOf(g);
          if (!ficheModifiable() || index < 0) return;
          groupes().splice(index, 1);
          if (selectionGroupe === g.id) { selectionGroupe = ""; selectionElement = ""; }
          rendre(); refresh();
        }
        var nombre = g.elements.filter(function (x) { return x && !estDiviseur(x); }).length;
        if (nombre) {
          var libelleElements = nombre + " " + (nombre > 1 ? config.elementPluriel.toLowerCase() : config.elementSingulier.toLowerCase());
          confirmer("Supprimer " + config.groupeIndefini, "« " + (g.nom || config.groupeSansNom) + " » contient " + libelleElements + ". Supprimer le groupe et tout son contenu ?", "Tout supprimer", retire);
        }
        else retire();
      }, "danger pc-edit-only"));
      item.addEventListener("dragover", function (e) {
        var dragData = lireGlisse(e);
        var ok = (editionActive("groupes") && dragData && (dragData.type === "groupe" || dragData.type === "diviseur-groupe")) ||
                 (editionActive("elements") && dragData && dragData.type === "element");
        if (!ok || dragData.id === g.id) return;
        e.preventDefault(); e.stopPropagation(); item.classList.add("drop-target");
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      });
      item.addEventListener("dragleave", function (e) { if (!item.contains(e.relatedTarget)) item.classList.remove("drop-target"); });
      item.addEventListener("drop", function (e) {
        var dragData = lireGlisse(e); if (!dragData) return;
        if (dragData.type === "element" && editionActive("elements")) {
          e.preventDefault(); e.stopPropagation(); item.classList.remove("drop-target");
          termineGlisse(deplaceElement(dragData.id, g.id, null));
        } else if ((dragData.type === "groupe" || dragData.type === "diviseur-groupe") && editionActive("groupes")) {
          e.preventDefault(); e.stopPropagation(); item.classList.remove("drop-target");
          termineGlisse(reordonne(groupes(), dragData.id, g.id));
        }
      });
      liste.appendChild(item);
    }
    function ligneElement(x, g, liste) {
      var item = el("div", "pc-tech-item pc-tech-item-tech" + (x.id === selectionElement ? " selected" : ""));
      item.dataset.syncEntity = x.id;
      var drag = el("button", "pc-comp-drag pc-edit-only", "⠿");
      drag.type = "button"; drag.title = "Glisser pour réordonner ou déplacer vers " + config.groupeAutre;
      drag.setAttribute("aria-label", drag.title); drag.draggable = true;
      drag.addEventListener("dragstart", function (e) { e.stopPropagation(); idGlisse(e, "element", x.id); });
      drag.addEventListener("dragend", function (e) { e.stopPropagation(); item.classList.remove("drop-target"); });
      item.appendChild(drag);
      var read = el("button", "pc-tech-item-read", x.nom || config.elementSansNom);
      read.type = "button"; read.addEventListener("click", function () { choixElement(x.id); });
      read.setAttribute("aria-pressed", String(item.classList.contains("selected")));
      item.appendChild(read);
      var name = el("input", "pc-edit-field pc-tech-item-name");
      name.type = "text"; name.value = x.nom || ""; name.placeholder = config.elements;
      name.setAttribute("aria-label", config.elements);
      name.addEventListener("input", function () { x.nom = name.value; conserveRendu(); listeHooks.forEach(function (fn) { fn(); }); save(); });
      item.appendChild(name);
      listeHooks.push(function () {
        read.textContent = x.nom || config.elementSansNom;
        if (document.activeElement !== name) name.value = x.nom || "";
      });
      item.appendChild(miniBtn("×", "Supprimer " + config.elementDefini, function () {
        if (!editionActive("elements")) return;
        function retire() {
          var index = g.elements.indexOf(x);
          if (!ficheModifiable() || groupeDe(g.id) !== g || index < 0) return;
          g.elements.splice(index, 1);
          if (selectionElement === x.id) selectionElement = premierElement(g);
          rendre(); refresh();
        }
        var nombre = entreesDe(x).length;
        if (nombre) {
          var libelleEntrees = nombre + (nombre > 1 ? " entrées" : " entrée");
          confirmer("Supprimer " + config.elementIndefini, "« " + (x.nom || config.elementSansNom) + " » contient " + libelleEntrees + ". Supprimer " + config.elementDefini + " et tout son contenu ?", "Tout supprimer", retire);
        }
        else retire();
      }, "danger pc-edit-only"));
      cibleElement(item, g, x);
      liste.appendChild(item);
    }
    function ligneDiviseur(diviseur, liste, colonne, groupe) {
      var item = el("div", "pc-tech-divider pc-tech-divider-" + colonne);
      item.dataset.collapsed = String(diviseur.replie === true);
      var drag = el("button", "pc-comp-drag pc-edit-only", "⠿");
      drag.type = "button"; drag.title = "Glisser pour réordonner ce diviseur";
      drag.setAttribute("aria-label", drag.title); drag.draggable = true;
      drag.addEventListener("dragstart", function (e) {
        e.stopPropagation(); idGlisse(e, colonne === "groupes" ? "diviseur-groupe" : "diviseur-element", diviseur.id);
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
        appliquerReplis(liste); save();
      });
      item.appendChild(toggle);
      var name = el("input", "pc-edit-field pc-tech-divider-name");
      name.type = "text"; name.value = diviseur.nom || ""; name.placeholder = "Nom du groupe";
      name.setAttribute("aria-label", "Nom du diviseur");
      name.addEventListener("input", function () { diviseur.nom = name.value; label.textContent = name.value || "Diviseur sans nom"; save(); });
      item.appendChild(name);
      item.appendChild(miniBtn("×", "Supprimer ce diviseur", function () {
        var cible = colonne === "groupes" ? groupes() : (groupe && groupe.elements);
        if (!cible || !editionActive(colonne)) return;
        var index = cible.indexOf(diviseur); if (index >= 0) cible.splice(index, 1);
        rendre(); refresh();
      }, "danger pc-edit-only pc-tech-divider-del"));
      if (colonne === "groupes") {
        item.addEventListener("dragover", function (e) {
          var d = lireGlisse(e); if (!editionActive("groupes") || !d || (d.type !== "groupe" && d.type !== "diviseur-groupe") || d.id === diviseur.id) return;
          e.preventDefault(); e.stopPropagation(); item.classList.add("drop-target");
        });
        item.addEventListener("dragleave", function (e) { if (!item.contains(e.relatedTarget)) item.classList.remove("drop-target"); });
        item.addEventListener("drop", function (e) {
          var d = lireGlisse(e); if (!editionActive("groupes") || !d || (d.type !== "groupe" && d.type !== "diviseur-groupe")) return;
          e.preventDefault(); e.stopPropagation(); item.classList.remove("drop-target");
          termineGlisse(reordonne(groupes(), d.id, diviseur.id));
        });
      } else {
        item.addEventListener("dragover", function (e) {
          var d = lireGlisse(e); if (!editionActive("elements") || !d || d.type !== "diviseur-element" || d.id === diviseur.id) return;
          e.preventDefault(); e.stopPropagation(); item.classList.add("drop-target");
        });
        item.addEventListener("dragleave", function (e) { if (!item.contains(e.relatedTarget)) item.classList.remove("drop-target"); });
        item.addEventListener("drop", function (e) {
          var d = lireGlisse(e); if (!editionActive("elements") || !d || d.type !== "diviseur-element") return;
          e.preventDefault(); e.stopPropagation(); item.classList.remove("drop-target");
          termineGlisse(reordonne(groupe.elements, d.id, diviseur.id));
        });
      }
      liste.appendChild(item);
      return item;
    }
    function basculeMode(parent, entree, read) {
      var group = el("div", "pc-notes-modes"), buttons = [];
      group.setAttribute("role", "group"); group.setAttribute("aria-label", "Format de la description");
      [["plain", "Brut"], ["markdown", "Markdown"]].forEach(function (pair) {
        var button = miniBtn(pair[1], null, function () {
          entree.mode = pair[0]; conserveRendu(); sync(); notesRendu(read, entree.desc || "", entree.mode); save();
        });
        buttons.push([button, pair[0]]); group.appendChild(button);
      });
      function sync() { buttons.forEach(function (pair) { pair[0].setAttribute("aria-pressed", String(entree.mode === pair[1])); }); }
      function actualise() { sync(); notesRendu(read, entree.desc || "", entree.mode); }
      actualise(); parent.appendChild(group); listeHooks.push(actualise);
    }
    function ajouteCout(card, head, footer, entree, groupeId) {
      card.classList.add("pc-entry-cost");
      var cout = el("label", "pc-entry-price pc-edit-only");
      var champ = el("input", "pc-edit-field");
      champ.type = "text"; champ.inputMode = "numeric"; champ.pattern = "[0-9]*";
      champ.setAttribute("aria-label", "Coût en " + config.unite);
      cout.append(el("span", "pc-tech-rank-label", config.unite), champ);
      var coutLecture = el("span", "pc-entry-price-read");
      head.append(cout, coutLecture);

      var acquis = el("label", "pc-entry-owned pc-edit-only");
      var coche = el("input", "pc-edit-field");
      coche.type = "checkbox";
      coche.setAttribute("role", "switch");
      coche.setAttribute("aria-label", "Entrée acquise");
      var curseur = el("span", "pc-entry-switch");
      curseur.setAttribute("aria-hidden", "true");
      acquis.append(coche, curseur);
      footer.appendChild(acquis);

      function actualise() {
        var valeur = config.cout(entree);
        champ.value = String(valeur);
        coutLecture.textContent = valeur > 0 ? valeur + " " + config.unite : "";
        coche.checked = entree.acquis !== false;
        card.classList.toggle("acquired", coche.checked);
      }
      function modifie(valeur, possede) {
        if (editionActive("entrees") && (!config.valideAchat || config.valideAchat(groupeId, entree, valeur, possede))) {
          if (valeur === undefined) delete entree.cout;
          else entree.cout = valeur;
          entree.acquis = possede;
          conserveRendu();
          refresh();
        }
        actualise();
      }
      champ.addEventListener("change", function () {
        var texte = champ.value.trim();
        if (!/^\d*$/.test(texte)) { actualise(); return; }
        modifie(texte === "" ? undefined : clamp(Number(texte), 0, 9999), entree.acquis !== false);
      });
      coche.addEventListener("change", function () { modifie(entree.cout, coche.checked); });
      actualise();
    }

    function carteEntree(entree, element, groupeId) {

      var card = el("article", "pc-tech-rank pc-catalog-entry");
      card.dataset.syncEntity = entree.id;
      var head = el("div", "pc-tech-rank-head pc-catalog-entry-head");
      var dragSlot = el("span", "pc-tech-rank-drag-slot");
      var drag = el("button", "pc-comp-drag pc-edit-only", "⠿");
      drag.type = "button"; drag.title = "Glisser pour réordonner les entrées";
      drag.setAttribute("aria-label", drag.title); drag.draggable = true;
      drag.addEventListener("dragstart", function (e) {
        e.stopPropagation();
        if (!editionActive("entrees") || !e.dataTransfer) { e.preventDefault(); return; }
        dragEntree = { elementId: element.id, entreeId: entree.id };
        card.classList.add("pris");
        e.dataTransfer.setData("text/plain", "entree|" + entree.id); e.dataTransfer.effectAllowed = "move";
      });
      drag.addEventListener("dragend", function (e) {
        e.stopPropagation(); dragEntree = null;
        Array.prototype.forEach.call(layout.querySelectorAll(".pris, .avant, .apres"), function (n) { n.classList.remove("pris", "avant", "apres"); });
      });
      dragSlot.appendChild(drag); head.appendChild(dragSlot);
      var titreLecture = config.unite ? el("span", "pc-entry-title-read", entree.nom || "") : null;
      var nameWrap = el("label", "pc-tech-rank-name");
      if (titreLecture) nameWrap.classList.add("pc-edit-only");
      nameWrap.appendChild(el("span", "pc-tech-rank-label", "Nom"));
      var name = el("input", "pc-edit-field pc-catalog-entry-name");
      name.type = "text"; name.value = entree.nom || ""; name.placeholder = "Nom de l’entrée";
      name.setAttribute("aria-label", "Nom de l’entrée");
      name.addEventListener("input", function () {
        entree.nom = name.value;
        if (titreLecture) titreLecture.textContent = entree.nom;
        conserveRendu();
        save();
      });
      nameWrap.appendChild(name); head.appendChild(nameWrap);
      if (titreLecture) head.appendChild(titreLecture);
      var deleteSlot = el("span", "pc-tech-rank-del-slot");
      deleteSlot.appendChild(miniBtn("×", "Supprimer cette entrée", function () {
        if (!editionActive("entrees")) return;
        var avant = JSON.stringify(entree);
        confirmer("Supprimer une entrée", "Supprimer « " + (entree.nom || "cette entrée") + " » ?", "Supprimer", function () {
          if (!ficheModifiable()) return;
          var groupe = groupeDe(groupeId);
          var courant = elementDe(groupe, element.id);
          if (!courant) return;
          var liste = entreesDe(courant);
          var cible = liste.find(function (e) { return e.id === entree.id; });
          if (!cible || JSON.stringify(cible) !== avant) {
            flash("L’entrée a changé depuis l’ouverture de la confirmation.");
            return;
          }
          liste.splice(liste.indexOf(cible), 1);
          rendre(); refresh();
        });
      }, "danger pc-edit-only pc-tech-rank-del"));
      head.appendChild(deleteSlot); card.appendChild(head);
      var read = el("div", "pc-tech-rank-read");
      notesRendu(read, entree.desc || "", entree.mode); card.appendChild(read);
      var editor = el("textarea", "pc-edit-field pc-tech-rank-editor");
      editor.rows = 4; editor.value = entree.desc || ""; editor.placeholder = "Description";
      editor.setAttribute("aria-label", "Description de l’entrée");
      editor.addEventListener("input", function () { entree.desc = editor.value; conserveRendu(); notesRendu(read, entree.desc, entree.mode); save(); });
      card.appendChild(editor);
      var footer = el("div", "pc-tech-rank-footer");
      var formats = el("div", "pc-tech-rank-format-wrap pc-edit-only");
      basculeMode(formats, entree, read); footer.appendChild(formats);
      if (config.unite) ajouteCout(card, head, footer, entree, groupeId);
      if (config.unite) footer.appendChild(miniBtn("Envoyer", "Envoyer dans le tchat Roll20", function () {
        var cout = config.cout(entree);
        var description = (entree.desc || "").trim();
        // Roll20 interprète %NEWLINE% dans un champ sans couper la commande.
        var message = cout > 0 ? [cout + " " + config.unite, description].filter(Boolean).join("%NEWLINE%%NEWLINE%") : description;
        sayChat(entree.nom || element.nom || "Entrée", [["", message]]);
      }, "primary pc-entry-send"));
      card.appendChild(footer);
      cibleEntree(card, element, entree);
      listeHooks.push(function () {
        if (document.activeElement !== name) name.value = entree.nom || "";
        if (document.activeElement !== editor) editor.value = entree.desc || "";
      });
      return card;
    }

    function rendreGroupes() {
      var pane = el("section", "pc-tech-pane pc-editable pc-tech-arts"); panneaux.groupes = pane;
      panneauTitre(pane, config.groupes, "groupes");
      var liste = el("div", "pc-tech-list pc-tech-art-list");
      groupes().forEach(function (g) {
        if (estDiviseur(g)) ligneDiviseur(g, liste, "groupes", null);
        else ligneGroupe(g, liste);
      });
      if (!groupes().some(function (g) { return g && !estDiviseur(g); })) liste.appendChild(el("div", "pc-empty", config.videGroupe));
      appliquerReplis(liste);
      zoneDepotListe(liste, function (drag) {
        if (drag.type === "groupe" || drag.type === "diviseur-groupe") termineGlisse(reordonne(groupes(), drag.id, null));
      }, "groupes");
      pane.appendChild(liste);
      if (config.groupesObligatoires) return pane;
      pane.appendChild(miniBtn("+ " + config.groupeSingulier, null, function () {
        if (!editionActive("groupes")) return;
        var g = nouveauGroupe(); groupes().push(g); selectionGroupe = g.id; selectionElement = "";
        rendre(); refresh();
      }, "pc-edit-only pc-tech-add"));
      pane.appendChild(miniBtn("+ Diviseur", null, function () {
        if (!editionActive("groupes")) return;
        groupes().push(nouveauDiviseur()); refresh(); rendre();
      }, "pc-edit-only pc-tech-add"));
      return pane;
    }
    function rendreElements(g) {
      var pane = el("section", "pc-tech-pane pc-editable pc-tech-list-pane"); panneaux.elements = pane;
      panneauTitre(pane, config.elements, "elements");
      var liste = el("div", "pc-tech-list pc-technique-list");
      if (g) {
        g.elements.forEach(function (x) {
          if (estDiviseur(x)) ligneDiviseur(x, liste, "elements", g);
          else ligneElement(x, g, liste);
        });
        if (!g.elements.some(function (x) { return x && !estDiviseur(x); })) liste.appendChild(el("div", "pc-empty", config.videElement));
        appliquerReplis(liste);
        zoneDepotListe(liste, function (drag) {
          if (drag.type === "element") termineGlisse(deplaceElement(drag.id, g.id, null));
          else if (drag.type === "diviseur-element") termineGlisse(deplaceDiviseurElement(drag.id, g.id, null));
        }, "elements");
      } else liste.appendChild(el("div", "pc-empty", config.videElement));
      pane.appendChild(liste);
      if (g) {
        pane.appendChild(miniBtn("+ " + config.elementSingulier, null, function () {
          if (!editionActive("elements")) return;
          var x = nouvelElement(); g.elements.push(x); selectionElement = x.id;
          editionEntreesElement = ""; refresh(); rendre();
        }, "pc-edit-only pc-tech-add"));
        pane.appendChild(miniBtn("+ Diviseur", null, function () {
          if (!editionActive("elements")) return;
          g.elements.push(nouveauDiviseur()); refresh(); rendre();
        }, "pc-edit-only pc-tech-add"));
      }
      return pane;
    }
    function rendreEntrees(g, x) {
      var pane = el("section", "pc-tech-pane pc-editable pc-tech-ranks-pane pc-catalog-entries-pane"); panneaux.entrees = pane;
      panneauTitre(pane, config.entrees, "entrees");
      if (!x) {
        pane.appendChild(el("div", "pc-empty", config.videEntree));
        actualiseEdition(pane, "entrees"); return pane;
      }
      var liste = el("div", "pc-tech-ranks-list pc-catalog-entries-list");
      entreesDe(x).forEach(function (entree) { liste.appendChild(carteEntree(entree, x, g.id)); });
      if (!entreesDe(x).length) liste.appendChild(el("div", "pc-empty", config.videEntree));
      zoneDepotListe(liste, function (drag) {
        if (drag.type === "entree") {
          var source = entreesDe(x).findIndex(function (e) { return e.id === drag.id; });
          if (source >= 0) termineGlisse(reordonne(entreesDe(x), drag.id, null));
        }
      }, "entrees");
      pane.appendChild(liste);
      pane.appendChild(miniBtn("+ Entrée", null, function () {
        if (!editionActive("entrees")) return;
        entreesDe(x).push(nouvelleEntree()); save(); refresh(); rendre();
      }, "pc-edit-only pc-tech-add"));
      return pane;
    }
    function rendre() {
      groupesRendus = groupes();
      conserveRendu();
      var defilements = Array.from(layout.querySelectorAll(".pc-tech-list, .pc-tech-ranks-list"))
        .map(function (liste) { return liste.scrollTop; });
      listeHooks = []; panneaux = {}; layout.innerHTML = "";
      var selection = selectionValide();
      layout.appendChild(rendreGroupes());
      layout.appendChild(rendreElements(selection.groupe));
      layout.appendChild(rendreEntrees(selection.groupe, selection.element));
      Array.from(layout.querySelectorAll(".pc-tech-list, .pc-tech-ranks-list")).forEach(function (liste, i) {
        liste.scrollTop = defilements[i] || 0;
      });
      actualiseEdition(panneaux.groupes, "groupes");
      actualiseEdition(panneaux.elements, "elements");
      actualiseEdition(panneaux.entrees, "entrees");
      listeHooks.forEach(function (fn) { try { fn(); } catch (e) {} });
    }

    function ajusteHauteur() {
      if (!layout.isConnected || !layout.offsetParent) return;
      var fixe = document.querySelector(".md-header");
      var haut = Math.max(layout.getBoundingClientRect().top, fixe ? fixe.offsetHeight : 0);
      var h = Math.max(260, Math.floor(window.innerHeight - haut - 16));
      layout.style.setProperty("--tech-h", h + "px");
    }
    window.addEventListener("resize", ajusteHauteur);
    remontageNettoyage.push(function () { window.removeEventListener("resize", ajusteHauteur); });
    if (window.IntersectionObserver) {
      var observateur = new IntersectionObserver(function (e) { if (e[0] && e[0].isIntersecting) ajusteHauteur(); });
      observateur.observe(layout);
      remontageNettoyage.push(function () { observateur.disconnect(); });
    }
    function actualiseColonnes() {
      var signature = JSON.stringify(groupes());
      if (signature !== empreinteRendu || (!config.groupesDe && groupes() !== groupesRendus)) rendre();
      actualiseEdition(panneaux.groupes, "groupes");
      actualiseEdition(panneaux.elements, "elements");
      actualiseEdition(panneaux.entrees, "entrees");
      listeHooks.forEach(function (fn) { try { fn(); } catch (e) {} });
      ajusteHauteur();
    }
    hooks.push(actualiseColonnes);
    window.addEventListener("jjk-column-mode", actualiseColonnes);
    remontageNettoyage.push(function () { window.removeEventListener("jjk-column-mode", actualiseColonnes); });
    rendre();
    return b;
  }

  function buildNotesOrganisees() {
    return buildListeOrganisee({
      cle: "notesOrganisees", titre: "Notes", groupes: "Dossiers", elements: "Notes", entrees: "Entrées",
      groupeSingulier: "Dossier", elementSingulier: "Note", elementPluriel: "Notes",
      groupeDefini: "ce dossier", groupeIndefini: "un dossier", groupeAutre: "un autre dossier",
      elementDefini: "cette note", elementIndefini: "une note",
      videGroupe: "Aucun dossier.", videElement: "Aucune note.", videEntree: "Aucune entrée.",
      groupeSansNom: "Dossier sans nom", elementSansNom: "Note sans nom",
      nouveauGroupe: "Nouveau dossier", nouvelElement: "Nouvelle note"
    });
  }
