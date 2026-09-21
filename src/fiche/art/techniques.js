  // ---- 9. Techniques (pleine largeur, sous les trois colonnes) ----
  // LES RANGS D'UNE TECHNIQUE LUI APPARTIENNENT : les règles le disent, la
  // fiche ne les barème donc pas. Elle compte le nombre de rangs pris, le prix
  // que le joueur a payé et les points de rupture engagés ; ce que chaque rang
  // apporte s'écrit en texte libre.
  function buildTechniques() {
    var b = block("Techniques", null, "techniques", function () { rendre(); });
    var box = el("div");
    b.appendChild(box);

    function carte(t) {
      var card = el("div", "pc-av");
      var head = el("div", "pc-av-head");
      var nm = el("input", "nm pc-edit-field");
      nm.type = "text"; nm.placeholder = "Nom de la technique"; nm.value = t.nom || "";
      nm.addEventListener("input", function () { t.nom = nm.value; save(); });
      head.appendChild(nm);

      // la barre de rangs de CETTE technique : autant de crans qu'elle a de
      // rangs, sans nom ni prix — ils lui appartiennent
      var bar = el("span", "pc-stadebar");
      var segs = [];
      for (var i = 0; i <= t.rangs; i++) (function (i) {
        var sg = el("button", "seg s" + clamp(i, 0, 5), String(i));
        sg.type = "button";
        sg.title = "Rang " + i + " de « " + (t.nom || "cette technique") + " »";
        sg.addEventListener("click", function () {
          if (!isEdit("techniques")) return;
          var lim = limiteRangs("techniques");
          if (lim !== null && i > t.rang &&
              techRangsComptes() + rangsComptesEntre(t.rang, i, num(t.offert, 0)) > lim) {
            flash("Limite de rangs de technique atteinte.");
            return;
          }
          t.rang = i;
          refresh();
          rendre();
        });
        bar.appendChild(sg);
        segs.push(sg);
      })(i);
      head.appendChild(bar);

      var chip = el("span", "pc-roll-chip", "Jet");
      chip.title = "Lancer les dés d'action de cette technique";
      chip.addEventListener("click", function () {
        var n = desTechnique();
        doRoll(t.nom || "Technique", 0, desQuery(n) + "d" + faces(), true, n);
      });
      head.appendChild(chip);
      head.appendChild(chatBtn(
        function () { return "Technique — " + (t.nom || "sans nom"); },
        function () {
          return [["Rang", t.rang + " / " + t.rangs], ["", t.desc]];
        }));
      head.appendChild(miniBtn("✕", "Retirer cette technique", function () {
        function retire() {
          state.techniques = state.techniques.filter(function (x) { return x.id !== t.id; });
          refresh();
          rendre();
        }
        if (!String(t.nom || "").trim() && !String(t.desc || "").trim() && !t.xp) { retire(); return; }
        confirmer("Retirer une technique",
                  "Retirer « " + (t.nom || "cette technique") + " » ? Son coût en XP et son point de " +
                  "rupture reviendront au personnage.",
                  "Retirer", retire);
      }, "danger pc-edit-only"));
      card.appendChild(head);

      var d = el("textarea", "pc-notes pc-edit-field");
      d.rows = 3;
      d.placeholder = "Ce que chaque rang apporte";
      d.value = t.desc || "";
      d.addEventListener("input", function () { t.desc = d.value; save(); });
      card.appendChild(d);

      var ligne = el("div", "pc-arme-line");
      function nombre(libelle, lire, ecrire, min, max, titre, large) {
        var inp = el("input", "pc-edit-field");
        inp.type = "number"; inp.step = "1";
        if (min !== null) inp.min = String(min);
        inp.value = lire();
        inp.title = titre;
        inp.addEventListener("input", function () {
          var v = parseInt(inp.value, 10);
          ecrire(isFinite(v) ? clamp(v, min, max) : min);
          refresh();
        });
        hooks.push(function () { if (document.activeElement !== inp) inp.value = lire(); });
        return fld(libelle, inp, large ? "w" : null);
      }
      ligne.appendChild(nombre("Rangs", function () { return t.rangs; },
        function (v) { t.rangs = v; if (t.rang > v) t.rang = v; rendre(); }, 1, 20,
        "Combien de rangs cette technique possède — les règles laissent chaque technique en décider."));
      ligne.appendChild(nombre("XP", function () { return t.xp; },
        function (v) { t.xp = v; }, 0, 99999,
        "Ce que cette technique a coûté — aucune règle ne le fixe, c'est la décision de la table."));
      ligne.appendChild(nombre("Offerts", function () { return num(t.offert, 0); },
        function (v) { t.offert = Math.min(v, t.rangs); }, 0, 20, "Rangs offerts"));
      ligne.appendChild(nombre("Rupture", function () { return t.rupture; },
        function (v) { t.rupture = v; }, 0, 99,
        "Combien de points de rupture cette technique a demandés."));
      card.appendChild(ligne);

      hooks.push(function () {
        segs.forEach(function (sg, i) {
          sg.classList.toggle("on", i <= t.rang);
          sg.classList.toggle("cur", i === t.rang);
        });
      });
      return card;
    }

    function rendre() {
      box.innerHTML = "";
      state.techniques.forEach(function (t) { box.appendChild(carte(t)); });
      if (!state.techniques.length) box.appendChild(el("div", "pc-empty", "Aucune technique."));
      box.appendChild(miniBtn("+ Ajouter une technique", null, function () {
        state.techniques.push({ id: uid("t"), nom: "", rang: 0, rangs: 1, xp: 0, offert: 0, rupture: 0, desc: "" });
        refresh();
        rendre();
      }, "pc-edit-only"));
      applyEdit(b, "techniques");
    }
    rendre();
    return b;
  }

