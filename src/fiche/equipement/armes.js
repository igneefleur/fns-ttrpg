  // ================= ONGLET INVENTAIRE =================

  // ---- 10. Armes : la propriété « arme » d'un objet ----
  // Il n'y a plus de gestes ni de préréglage dans l'inventaire. Une arme porte
  // seulement les valeurs qui lui appartiennent : difficulté d'attaque, dégâts
  // de base et jusqu'à trois caractéristiques qui les modifient ; difficulté de
  // parade, réduction de base et jusqu'à trois caractéristiques qui la
  // modifient ; enfin la compétence liée et le TYPE d'arme du livre. Le type
  // est une clé stable vers DATA.armes : il servira plus tard à retrouver ses
  // trajets sans recopier les règles dans la fiche.
  function champArme(libelle, obj, cle, titre) {
    var i = el("input", "pc-edit-field");
    i.type = "text";
    i.inputMode = "numeric";
    i.placeholder = "0";
    i.value = obj[cle] == null ? "" : String(obj[cle]);
    if (titre) i.title = titre;
    i.addEventListener("input", function () { obj[cle] = i.value; save(); });
    return fld(libelle, i);
  }

  function carteArme(it, attaqueLibre, sousTypeHost) {
    // L’inventaire passe historiquement un callback en second argument.
    // Seul le booléen explicite des attaques libres masque la parade.
    attaqueLibre = attaqueLibre === true;
    var a = it.arme;

    function selComp() {
      var s = el("select", "pc-select pc-edit-field");
      function remplir() {
        var valeur = a.comp || "";
        s.innerHTML = "";
        var o0 = el("option", null, "Aucune");
        o0.value = "";
        s.appendChild(o0);
        state.comps.forEach(function (c) {
          var o = el("option", null, c.nom || "Sans nom");
          o.value = c.id;
          if (c.id === valeur) o.selected = true;
          s.appendChild(o);
        });
      }
      remplir();
      s.title = "La compétence affiliée à cette arme.";
      s.addEventListener("change", function () { a.comp = s.value; save(); refresh(); });
      if (!attaqueLibre) hooks.push(function () { if (document.activeElement !== s) remplir(); });
      return s;
    }

    function selCarac(table, rang) {
      var s = el("select", "pc-select pc-edit-field");
      function remplir() {
        var valeur = Array.isArray(a[table]) ? String(a[table][rang] || "") : "";
        s.innerHTML = "";
        var o0 = el("option", null, "Aucun");
        o0.value = "";
        s.appendChild(o0);
        caracsOrdre().forEach(function (c) {
          var o = el("option", null, abbrCarac(c));
          o.value = c;
          o.title = libCarac(c);
          if (c === valeur) o.selected = true;
          s.appendChild(o);
        });
      }
      remplir();
      s.title = "Caractéristique ajoutée comme MOD.";
      s.addEventListener("change", function () {
        if (!Array.isArray(a[table])) a[table] = ["", "", ""];
        while (a[table].length < 3) a[table].push("");
        a[table][rang] = s.value;
        save();
      });
      if (!attaqueLibre) hooks.push(function () { if (document.activeElement !== s) remplir(); });
      return s;
    }

    function selTypeArme() {
      var s = el("select", "pc-select pc-edit-field");
      function remplir() {
        var valeur = String(a.type || ""), trouve = false, groupes = {};
        s.innerHTML = "";
        var o0 = el("option", null, "Aucun");
        o0.value = "";
        s.appendChild(o0);
        armesData().forEach(function (d) {
          if (!d || !d.cle) return;
          var cat = String(d.categorie || "Armes");
          if (!groupes[cat]) {
            groupes[cat] = document.createElement("optgroup");
            groupes[cat].label = cat;
            s.appendChild(groupes[cat]);
          }
          var o = el("option", null, d.nom || d.cle);
          o.value = d.cle;
          if (d.cle === valeur) { o.selected = true; trouve = true; }
          groupes[cat].appendChild(o);
        });
        // Une archive ou un mod peut porter un type que les règles du jour ne
        // connaissent plus. On le montre au lieu de l'effacer silencieusement.
        if (valeur && !trouve) {
          var ancien = el("option", null, valeur + " (inconnu)");
          ancien.value = valeur;
          ancien.selected = true;
          s.appendChild(ancien);
        }
      }
      remplir();
      s.title = "Type d'arme du livre ; il servira notamment à retrouver ses trajets.";
      s.addEventListener("change", function () {
        a.type = s.value;
        it.sousType=s.value;
        // La famille choisie initialise le champ Mains commun à tous les objets.
        armesData().forEach(function (d) {
          if (d && d.cle === a.type && (d.mains === 1 || d.mains === 2)) it.mains = a.mains = d.mains;
        });
        save();
        refresh();
      });
      if (!attaqueLibre) hooks.push(function () { if (document.activeElement !== s) remplir(); });
      return s;
    }

    function ligne(classe) {
      return el("div", "pc-arme-line " + classe);
    }

    var card = el("div", "pc-arme pc-obj-weapon-details");

    // La compétence précède les valeurs d'attaque et de dégâts.
    var l0 = ligne("pc-arme-1");
    l0.appendChild(fld("Compétence", selComp()));
    card.appendChild(l0);

    var l1 = ligne("pc-arme-2");
    l1.appendChild(champArme("Attaque", a, "attaque", "Difficulté du jet d'attaque."));
    l1.appendChild(champArme("Dégâts", a, "degats", "Dégâts de base de l'arme, avant ses MOD."));
    card.appendChild(l1);

    var l2 = ligne("pc-arme-3");
    for (var i = 0; i < 3; i++) l2.appendChild(fld("MOD", selCarac("modsDegats", i)));
    card.appendChild(l2);

    var l3 = ligne("pc-arme-2");
    l3.appendChild(champArme("Parade", a, "parade", "Difficulté du jet de parade."));
    l3.appendChild(champArme("Réduction", a, "reduction", "Réduction de dégâts de base sur une parade réussie."));
    if (!attaqueLibre) card.appendChild(l3);

    var l4 = ligne("pc-arme-3");
    for (var j = 0; j < 3; j++) l4.appendChild(fld("MOD", selCarac("modsParade", j)));
    if (!attaqueLibre) card.appendChild(l4);

    if (!attaqueLibre) {
      var typeField = fld(sousTypeHost ? "Sous-type" : "Type", selTypeArme());
      if (sousTypeHost) sousTypeHost.appendChild(typeField);
      else { var lType = ligne("pc-arme-1"); lType.appendChild(typeField); card.appendChild(lType); }
    }

    if (!attaqueLibre) {
      if (!a.repartition) a.repartition = {physique:100};
      var rep = el("div", "pc-arme-repartition");
      var totalInput = el("input", "pc-edit-field pc-arme-total");
      totalInput.type = "text";
      totalInput.readOnly = true;
      totalInput.setAttribute("aria-label", "Total des types de dégâts (%)");
      totalInput.title = "Somme calculée automatiquement, non modifiable";
      function total() {
        var n = 0;
        combatTypes().forEach(function (k) { n += pnum(a.repartition[k]); });
        totalInput.value = fmtP(n) + " %";
        totalInput.classList.toggle("pc-invalid", Math.abs(n-100) > 0.001);
      }
      // 4 rangées × 2, avec Brut / Total pour la dernière.
      ["physique", "ethere", "feu", "froid", "eclair", "decomposition", "brut"].forEach(function (k) {
        var input = el("input", "pc-edit-field");
        input.type = "text";
        input.inputMode = "decimal";
        input.value = pnum(a.repartition[k]);
        input.setAttribute("aria-label", "Dégâts " + combatLibType(k) + " (%)");
        input.addEventListener("input", function () {
          var v = litNombreSigne(input.value);
          if (isFinite(v) && v >= 0) { a.repartition[k] = v; save(); total(); }
        });
        input.addEventListener("change", refresh);
        rep.appendChild(fld(combatLibType(k) + " (%)", input));
      });
      rep.appendChild(fld("Total", totalInput));
      total();
      card.appendChild(rep);

      // Les prérequis sont tous prévus, y compris ceux encore peu utilisés.
      [["for", "FOR"], ["dex", "DEX"], ["vig", "VIG"], ["end", "END"],
       ["res", "RES"], ["fer", "FER"], ["int", "INT"], ["cha", "CHA"]].forEach(function (x, i) {
        if (i % 2 === 0) card.appendChild(ligne("pc-arme-2 pc-arme-requis"));
        card.lastChild.appendChild(champArme(x[1], a, x[0], "Prérequis de " + x[1]));
      });
    }

    return card;
  }
