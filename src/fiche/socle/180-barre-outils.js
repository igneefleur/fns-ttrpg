  // ---------- barre d'outils + bibliothèque ----------
  function buildTop(container) {
    if (COMPACT) return;   // dans Roll20, la fiche EST le personnage
    var top = el("div", "pc-top");
    top.appendChild(el("span", "pc-top-title", "Fiche JJK"));
    top.appendChild(el("span", "pc-top-hint", "Créateur de personnage — règles de base JJK"));

    var lib = el("div", "pc-lib");
    var sel = el("select");
    function fillSel() {
      sel.innerHTML = "";
      var o0 = el("option", null, "— Bibliothèque —");
      o0.value = "";
      sel.appendChild(o0);
      loadPersos().forEach(function (p) {
        var o = el("option", null, p.name || "Sans nom");
        o.value = p.id;
        sel.appendChild(o);
      });
    }
    fillSel();
    lib.appendChild(sel);

    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Charger");
      b.type = "button";
      b.addEventListener("click", function () {
        var p = loadPersos().filter(function (q) { return q.id === sel.value; })[0];
        if (!p) { flash("Choisir un personnage dans la liste."); return; }
        try { state = normalize(JSON.parse(JSON.stringify(p.state))); }
        catch (e) { flash("Fiche illisible."); return; }
        remount();
        flash("« " + (p.name || "Sans nom") + " » chargé.");
      });
      return b;
    })());
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Enregistrer");
      b.type = "button";
      b.title = "Enregistrer le personnage courant dans la bibliothèque";
      b.addEventListener("click", function () {
        var persos = loadPersos();
        var name = state.name || "Sans nom";
        var existing = null;
        persos.forEach(function (p) { if (p.name === name) existing = p; });
        var copy = JSON.parse(JSON.stringify(state));
        if (existing) { existing.state = copy; existing.updated = nowStamp(); }
        else persos.push({ id: "p" + Date.now().toString(36), name: name, state: copy, updated: nowStamp() });
        savePersos(persos);
        fillSel();
        flash("« " + name + " » enregistré.");
      });
      return b;
    })());
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Supprimer");
      b.type = "button";
      b.className = "pc-btn danger";
      b.title = "Supprimer le personnage choisi de la bibliothèque";
      b.addEventListener("click", function () {
        if (!sel.value) { flash("Choisir un personnage dans la liste."); return; }
        savePersos(loadPersos().filter(function (q) { return q.id !== sel.value; }));
        fillSel();
      });
      return b;
    })());
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Nouveau");
      b.type = "button";
      b.addEventListener("click", function () { state = blank(); remount(); });
      return b;
    })());
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Exporter");
      b.type = "button";
      b.addEventListener("click", function () {
        var a = document.createElement("a");
        a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        a.download = (state.name || "personnage-jjk") + ".json";
        a.click();
      });
      return b;
    })());
    var file = el("input");
    file.type = "file"; file.accept = "application/json"; file.style.display = "none";
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          state = normalize(JSON.parse(r.result));
          remount();
          flash("Personnage importé.");
        } catch (e) { flash("JSON illisible."); }
        file.value = "";
      };
      r.readAsText(f);
    });
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Importer");
      b.type = "button";
      b.addEventListener("click", function () { file.click(); });
      return b;
    })());
    lib.appendChild(file);
    top.appendChild(lib);
    container.appendChild(top);
  }

