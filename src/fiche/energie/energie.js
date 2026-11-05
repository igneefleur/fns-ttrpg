  // ---------- onglet Énergie ----------
  // Les catégories et leurs techniques sont indépendantes des compétences :
  // elles ne coûtent pas d'XP et ne dépendent d'aucun stade d'aptitude.
  function buildEnergie() {
    var b = block("Techniques occultes", null, "energie");
    var box = el("div", "pc-arts pc-energie");
    b.appendChild(box);

    function render() {
      box.innerHTML = "";
      if (!Array.isArray(state.energie)) state.energie = [];

      if (!state.energie.length)
        box.appendChild(el("div", "pc-empty", "Aucune catégorie d'énergie occulte."));

      state.energie.forEach(function (categorie, ci) {
        var card = el("div", "pc-av pc-art pc-energie-categorie");
        var head = el("div", "pc-av-head");
        var nom = el("input", "nm pc-edit-field");
        nom.type = "text";
        nom.placeholder = "Nom de la catégorie";
        nom.value = categorie.name || "";
        nom.addEventListener("input", function () {
          categorie.name = nom.value;
          save();
        });
        head.appendChild(nom);
        head.appendChild(miniBtn("✕", "Supprimer cette catégorie", function () {
          var contient = !!String(categorie.name || "").trim() ||
            (categorie.techniques || []).some(function (t) {
              return String(t.name || "").trim() || String(t.desc || "").trim();
            });
          if (contient && !confirm("Supprimer la catégorie « " +
              (categorie.name || "sans nom") + " » et toutes ses techniques ?")) return;
          state.energie.splice(ci, 1);
          save();
          render();
        }, "danger pc-edit-only"));
        card.appendChild(head);

        var liste = el("div", "pc-techniques");
        (categorie.techniques || []).forEach(function (technique, ti) {
          var tCard = el("div", "pc-av pc-technique pc-energie-technique");
          var tHead = el("div", "pc-av-head");
          var tNom = el("input", "nm pc-edit-field");
          tNom.type = "text";
          tNom.placeholder = "Nom de la technique";
          tNom.value = technique.name || "";
          tNom.addEventListener("input", function () {
            technique.name = tNom.value;
            save();
          });
          tHead.appendChild(tNom);

          var cout = el("span", "pc-tech-cout");
          var coutIn = el("input", "pc-edit-field");
          coutIn.type = "number";
          coutIn.min = "0";
          coutIn.max = "9999";
          coutIn.step = "1";
          coutIn.setAttribute("aria-label", "Coût en énergie occulte");
          coutIn.title = "Coût de cette technique en énergie occulte";
          coutIn.value = String(technique.cout == null ? 0 : technique.cout);
          coutIn.addEventListener("input", function () {
            var v = parseFloat(coutIn.value);
            technique.cout = isFinite(v) ? clamp(Math.floor(v), 0, 9999) : 0;
            save();
          });
          cout.appendChild(coutIn);
          cout.appendChild(el("span", "u", "EO"));
          tHead.appendChild(cout);
          tHead.appendChild(miniBtn("✕", "Retirer cette technique", function () {
            if ((String(technique.name || "").trim() || String(technique.desc || "").trim()) &&
                !confirm("Retirer la technique « " + (technique.name || "sans nom") + " » ?")) return;
            categorie.techniques.splice(ti, 1);
            save();
            render();
          }, "danger pc-edit-only"));
          tCard.appendChild(tHead);

          var description = el("textarea", "pc-notes pc-edit-field");
          description.rows = 3;
          description.placeholder = "Description / effet";
          description.value = technique.desc || "";
          description.addEventListener("input", function () {
            technique.desc = description.value;
            save();
          });
          tCard.appendChild(description);
          liste.appendChild(tCard);
        });
        card.appendChild(liste);
        card.appendChild(miniBtn("+ technique", "Ajouter une technique à cette catégorie", function () {
          if (!Array.isArray(categorie.techniques)) categorie.techniques = [];
          categorie.techniques.push({ name: "", cout: 0, desc: "" });
          save();
          render();
        }, "pc-edit-only"));
        box.appendChild(card);
      });

      box.appendChild(miniBtn("+ catégorie", "Créer une catégorie d'énergie occulte", function () {
        state.energie.push({ name: "", techniques: [] });
        save();
        render();
      }, "pc-edit-only"));
      applyEdit(b, "energie");
    }

    render();
    return b;
  }

