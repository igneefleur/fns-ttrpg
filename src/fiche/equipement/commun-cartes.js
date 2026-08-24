  // ---------- onglet Équipement ----------
  function eqField(labelTxt, obj, key, wide) {
    var i = el("input", "pc-edit-field");
    i.type = "text";
    i.placeholder = labelTxt;
    i.value = obj[key] || "";
    i.addEventListener("input", function () { obj[key] = i.value; save(); });
    return fld(labelTxt, i, wide ? "w" : null);
  }
  function eqArea(labelTxt, obj, key, rows) {
    var t = el("textarea", "pc-notes pc-edit-field");
    t.rows = rows || 3;
    t.value = obj[key] || "";
    t.addEventListener("input", function () { obj[key] = t.value; save(); });
    return fld(labelTxt, t, "w");
  }
  // Le champ accepte TOUTE expression Roll20, pas seulement « 5D8 » : dés,
  // références d'attribut @{Perso|mia_body}, requêtes ?{…}, arithmétique.
  // L'expression part telle quelle dans le jet en ligne. Elle n'est PAS
  // réécrite : l'ancienne extraction n'en gardait que les premiers dés et
  // jetait le reste en silence (« 5d6+@{Zhalian|mia_body}/10 » devenait
  // « 5d6 »).
  function diceOf(txt) {
    return String(txt == null ? "" : txt).replace(/\s+/g, " ").trim() || null;
  }
  function eqCards(box, items, kind, blk, mid) {
    // kind : "arme" (poids/dégâts/reach/propriétés) ou "armure" (poids/invu/zones)
    // blk / mid : le bloc hôte et son id de module d'édition (jeu : Jet et
    // Chat ; édition : fiches, ajout, retrait)
    function render() {
      box.innerHTML = "";
      items.forEach(function (it, idx) {
        var card = el("div", "pc-arme");
        var head = el("div", "pc-arme-head");
        var nm = el("input", "nm pc-edit-field");
        nm.type = "text";
        nm.placeholder = kind === "arme" ? "Nom de l'arme" : "Nom de l'armure";
        nm.value = it.nom || "";
        nm.addEventListener("input", function () { it.nom = nm.value; save(); });
        head.appendChild(nm);
        head.appendChild(chatBtn(
          function () { return (kind === "arme" ? "Arme — " : "Armure — ") + (it.nom || (kind === "arme" ? "arme" : "armure")); },
          function () {
            // valeurs courtes étiquetées, propriétés (texte long) pleine largeur
            return kind === "arme"
              ? [["Poids", it.poids], ["Ini", it.ini], ["Dégâts", it.degats], ["Reach", it.reach], ["", it.props]]
              : [["Poids", it.poids], ["Ini", it.ini], ["Invu", it.invu], ["Zones protégées", it.zones]];
          }));
        head.appendChild(miniBtn("✕", "Retirer", function () { items.splice(idx, 1); render(); refresh(); }, "danger pc-edit-only"));
        card.appendChild(head);

        var line = el("div", "pc-arme-line");
        line.appendChild(eqField("Poids", it, "poids"));
        // L'INITIATIVE PORTE DEUX RÈGLES DANS UN SEUL CHAMP, et c'est la case
        // « porté » qui les départage : un bonus ne compte QUE si l'objet est
        // porté activement, un malus compte TOUJOURS, même au fond du sac. Le
        // calcul est dans equipInitBonus() ; ici on ne fait que saisir.
        line.appendChild(eqField("Ini", it, "ini"));
        if (kind === "arme") {
          line.appendChild(eqField("Dégâts", it, "degats"));
          line.appendChild(eqField("Reach", it, "reach"));
        } else {
          line.appendChild(eqField("Invu", it, "invu"));
        }
        var porte = el("label", "pc-eq-porte");
        var pcb = el("input", null);
        pcb.type = "checkbox";
        pcb.checked = it.porte !== false;
        pcb.title = kind === "arme" ? "Arme en main" : "Armure portée";
        pcb.addEventListener("change", function () { it.porte = pcb.checked; save(); refresh(); });
        porte.appendChild(pcb);
        porte.appendChild(el("span", null, kind === "arme" ? "En main" : "Portée"));
        line.appendChild(porte);
        var chip = el("span", "pc-roll-chip", "Jet");
        chip.title = kind === "arme" ? "Lancer les dégâts" : "Lancer l'invu";
        chip.addEventListener("click", function () {
          var d = diceOf(kind === "arme" ? it.degats : it.invu);
          if (!d) { flash("Renseigner d'abord " + (kind === "arme" ? "les dégâts" : "l'invu") +
                          " (ex. 5D8, ou toute expression Roll20)."); return; }
          doRoll((kind === "arme" ? "Dégâts — " : "Invu — ") + (it.nom || (kind === "arme" ? "arme" : "armure")), 0, d, false);
        });
        line.appendChild(chip);
        card.appendChild(line);

        var line2 = el("div", "pc-arme-line");
        if (kind === "arme") line2.appendChild(eqArea("Avantages / désavantages", it, "props", 3));
        else line2.appendChild(eqArea("Zones protégées", it, "zones", 2));
        card.appendChild(line2);

        box.appendChild(card);
      });
      if (!items.length) box.appendChild(el("div", "pc-empty", kind === "arme" ? "Aucune arme." : "Aucune armure."));
      var add = miniBtn(kind === "arme" ? "+ Ajouter une arme" : "+ Ajouter une armure", null, function () {
        items.push({});
        render();
        refresh();
      }, "pc-edit-only");
      box.appendChild(add);
      if (blk) applyEdit(blk, mid);
    }
    render();
  }
