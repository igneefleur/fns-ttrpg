  // ================= ONGLET INVENTAIRE =================

  // ---- 10. Armes : la propriété « arme » d'un objet ----
  // Il n'y a plus de module Armes : une arme est un OBJET de l'inventaire qui
  // porte une propriété « arme ». Ce fichier dessine cette propriété dans le
  // détail de l'objet. Une arme est un RÉPERTOIRE, pas une attaque : sa ligne
  // (prise, parade, réduction, compétence qui porte le jet) et ses GESTES, un
  // par façon de frapper. Les dégâts d'Outward sont des nombres FIXES : le jeton « Dégâts »
  // ENVOIE une carte, il ne lance rien — un « jet de dégâts » serait une règle
  // inventée, et c'est la coupure à ne pas rater.
  function champTexte(libelle, obj, cle, large, titre) {
    var i = el("input", "pc-edit-field");
    i.type = "text";
    i.placeholder = libelle;
    i.value = obj[cle] || "";
    if (titre) i.title = titre;
    i.addEventListener("input", function () { obj[cle] = i.value; save(); });
    return fld(libelle, i, large ? "w" : null);
  }
  // `it` est l'objet ; `a` = it.arme ; `rendre` redessine le détail.
  function carteArme(it, rendre) {
    var a = it.arme;

    // Le préréglage : choisir une arme du livre remplit parade et réduction.
    // C'EST UN RACCOURCI DE SAISIE, PAS UNE CONTRAINTE — les champs restent
    // libres, et la liste ne s'affiche pas comme un barème.
    function selArme(a) {
      var s = el("select", "pc-select pc-edit-field");
      var o0 = el("option", null, "— Préréglage —");
      o0.value = "";
      s.appendChild(o0);
      armesData().forEach(function (d) {
        var o = el("option", null, d.nom);
        o.value = d.cle;
        s.appendChild(o);
      });
      s.title = "Remplit parade et réduction d'après le livre. Les champs restent modifiables.";
      s.addEventListener("change", function () {
        var d = null;
        armesData().forEach(function (x) { if (x.cle === s.value) d = x; });
        s.value = "";
        if (!d) return;
        if (!String(it.nom || "").trim()) it.nom = d.nom;
        a.parade = String(d.parade);
        a.reduction = String(d.reduction);
        refresh();
        rendre();
      });
      return s;
    }
    // Le sélecteur de compétence : alimenté par state.comps, et il range l'ID.
    function selComp(a) {
      var s = el("select", "pc-select pc-edit-field");
      function remplir() {
        s.innerHTML = "";
        var o0 = el("option", null, "— Aucune —");
        o0.value = "";
        s.appendChild(o0);
        state.comps.forEach(function (c) {
          var o = el("option", null, c.nom || "Sans nom");
          o.value = c.id;
          if (c.id === a.comp) o.selected = true;
          s.appendChild(o);
        });
      }
      remplir();
      s.title = "La compétence qui porte le jet de cette arme.";
      s.addEventListener("change", function () { a.comp = s.value; refresh(); });
      hooks.push(function () { if (document.activeElement !== s) remplir(); });
      return s;
    }
    // Le bonus et les dés de l'arme viennent de SA compétence : sans lien, le
    // jet part à zéro dé, et la fiche le dit plutôt que d'en inventer un.
    function compArme(a) { return a.comp ? compDe(a.comp) : null; }
    function jetArme(a, libelle) {
      var c = compArme(a);
      if (!c) { flash("Cette arme n'est liée à aucune compétence (rouage)."); return; }
      var n = compDes(c);
      doRoll(libelle, compBonus(c), deDe(n), true, n);
    }

    function carte(a) {
      var card = el("div", "pc-arme");
      var head = el("div", "pc-arme-head");
      head.appendChild(el("span", "nm", it.nom || "Arme"));
      head.appendChild(chatBtn(
        function () { return "Arme — " + (it.nom || "sans nom"); },
        function () {
          var c = compArme(a);
          return [
            ["Prise", a.prise], ["Parade", a.parade], ["Réduction", a.reduction],
            ["Compétence", c ? (c.nom + " " + sign(compBonus(c))) : ""],
            ["", a.gestes.map(function (g) {
              return (g.nom || "geste") + " — seuil " + (g.seuil || "?") +
                     " · " + (g.portee || "?") + " pas · " + (g.degats || "?") + " " + (g.type || "");
            }).join(" | ")]
          ];
        }));
      card.appendChild(head);

      var l1 = el("div", "pc-arme-line");
      l1.appendChild(champTexte("Prise", a, "prise", true, "À une main, à deux mains, d'hast…"));
      l1.appendChild(champTexte("Parade", a, "parade", false, "La difficulté de parade de cette arme."));
      l1.appendChild(champTexte("Réduction", a, "reduction", false,
        "Ce que cette arme retire aux dégâts qu'elle pare."));
      l1.appendChild(fld("Compétence", selComp(a), "w"));
      var chipP = el("span", "pc-roll-chip", "Parade");
      chipP.addEventListener("click", function () { jetArme(a, "Parade — " + (it.nom || "arme")); });
      l1.appendChild(chipP);
      var preregl = fld("Préréglage", selArme(a));
      preregl.classList.add("pc-edit-only");
      l1.appendChild(preregl);
      card.appendChild(l1);
      hooks.push(function () {
        var c = compArme(a);
        chipP.title = c
          ? "Lancer la parade : " + deDe(compDes(c)) + " " + sign(compBonus(c)) +
            " (parade " + (a.parade || "?") + " · réduction " + (a.reduction || "?") + ")"
          : "Aucune compétence liée : le jet ne peut pas partir.";
      });

      // ---- les gestes ----
      a.gestes.forEach(function (g) {
        var lg = el("div", "pc-arme-line");
        lg.appendChild(champTexte("Geste", g, "nom", true));
        lg.appendChild(champTexte("Seuil", g, "seuil", false,
          "Le seuil d'attaque de ce geste. Il ne part pas dans le jet : Roll20 ne compare pas."));
        lg.appendChild(champTexte("Portée", g, "portee", false, "En pas."));
        lg.appendChild(champTexte("Dégâts", g, "degats", false));
        lg.appendChild(selType(g, "type"));
        lg.appendChild(champTexte("Moitié", g, "degatsDemi", false,
          "Ce que le geste inflige sur une case blanche."));
        lg.appendChild(selType(g, "typeDemi"));
        var chipA = el("span", "pc-roll-chip", "Attaque");
        chipA.addEventListener("click", function () {
          jetArme(a, (it.nom || "Arme") + " — " + (g.nom || "attaque"));
        });
        lg.appendChild(chipA);
        // LES DÉGÂTS NE SE LANCENT PAS : ce sont des nombres fixes. Le jeton
        // ENVOIE une carte, par sayChat, et non par doRoll.
        var chipD = el("span", "pc-roll-chip", "Dégâts");
        chipD.title = "Envoyer les dégâts au tchat — ils sont fixes, ils ne se lancent pas.";
        chipD.addEventListener("click", function () {
          sayChat("Dégâts — " + (g.nom || it.nom || "geste"), [
            ["Pleins", (g.degats || "") + (g.type ? " " + g.type : "")],
            ["Moitié", (g.degatsDemi || "") + (g.typeDemi ? " " + g.typeDemi : "")],
            ["Portée", g.portee ? g.portee + " pas" : ""],
            ["Seuil", g.seuil]
          ]);
        });
        lg.appendChild(chipD);
        lg.appendChild(miniBtn("✕", "Retirer ce geste", function () {
          a.gestes = a.gestes.filter(function (x) { return x.id !== g.id; });
          refresh();
          rendre();
        }, "danger pc-edit-only"));
        card.appendChild(lg);
        hooks.push(function () {
          var c = compArme(a);
          chipA.title = c
            ? "Lancer l'attaque : " + deDe(compDes(c)) + " " + sign(compBonus(c)) +
              (g.seuil ? " — seuil " + g.seuil : "")
            : "Aucune compétence liée : le jet ne peut pas partir.";
        });
      });
      card.appendChild(miniBtn("+ Geste", "Ajouter une façon de frapper", function () {
        a.gestes.push({ id: uid("g"), nom: "", seuil: "", portee: "", degats: "", type: "",
                        degatsDemi: "", typeDemi: "" });
        refresh();
        rendre();
      }, "pc-edit-only"));
      return card;
    }
    // Les types de dégâts viennent des règles : tranchant, perforant,
    // contondant. La liste n'est pas un barème, c'est un vocabulaire.
    function selType(g, cle) {
      var s = el("select", "pc-select pc-edit-field");
      var o0 = el("option", null, "—");
      o0.value = "";
      s.appendChild(o0);
      typesDegats().forEach(function (t) {
        var o = el("option", null, t.cle);
        o.value = t.cle;
        o.title = t.libelle;
        if (g[cle] === t.cle) o.selected = true;
        s.appendChild(o);
      });
      s.addEventListener("change", function () { g[cle] = s.value; save(); });
      return fld("Type", s);
    }

    return carte(a);
  }
