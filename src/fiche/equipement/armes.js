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

  function carteArme(it) {
    var a = it.arme;

    function selComp() {
      var s = el("select", "pc-select pc-edit-field");
      function remplir() {
        var valeur = a.comp || "";
        s.innerHTML = "";
        var o0 = el("option", null, "— Aucune —");
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
      hooks.push(function () { if (document.activeElement !== s) remplir(); });
      return s;
    }

    function selCarac(table, rang) {
      var s = el("select", "pc-select pc-edit-field");
      function remplir() {
        var valeur = Array.isArray(a[table]) ? String(a[table][rang] || "") : "";
        s.innerHTML = "";
        var o0 = el("option", null, "—");
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
      hooks.push(function () { if (document.activeElement !== s) remplir(); });
      return s;
    }

    function selTypeArme() {
      var s = el("select", "pc-select pc-edit-field");
      function remplir() {
        var valeur = String(a.type || ""), trouve = false, groupes = {};
        s.innerHTML = "";
        var o0 = el("option", null, "— Aucun —");
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
        // Le nombre de mains reste une donnée technique de l'inventaire. Quand
        // le livre le connaît pour ce type, on l'aligne sans afficher un champ
        // supplémentaire dans la carte de l'arme.
        armesData().forEach(function (d) {
          if (d && d.cle === a.type && (d.mains === 1 || d.mains === 2)) a.mains = d.mains;
        });
        save();
        refresh();
      });
      hooks.push(function () { if (document.activeElement !== s) remplir(); });
      return s;
    }

    function ligne(classe) {
      return el("div", "pc-arme-line " + classe);
    }

    var card = el("div", "pc-arme");

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
    card.appendChild(l3);

    var l4 = ligne("pc-arme-3");
    for (var j = 0; j < 3; j++) l4.appendChild(fld("MOD", selCarac("modsParade", j)));
    card.appendChild(l4);

    var l5 = ligne("pc-arme-2");
    l5.appendChild(fld("Compétence", selComp()));
    l5.appendChild(fld("Type", selTypeArme()));
    card.appendChild(l5);

    return card;
  }
