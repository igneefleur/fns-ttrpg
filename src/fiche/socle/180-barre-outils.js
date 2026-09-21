  // ---------- barre d'outils + bibliothèque (site seulement) ----------
  function buildTop(container) {
    if (COMPACT) return;   // dans Roll20, la fiche EST le personnage
    var top = el("div", "pc-top");
    top.appendChild(el("span", "pc-top-title", "Fiche Outward"));
    top.appendChild(el("span", "pc-top-hint", "Personnage — règles de base Outward"));

    var lib = el("div", "pc-lib");
    var sel = el("select");
    function fillSel() {
      // refait après CHAQUE écriture de la bibliothèque, sinon le select ment
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

    function btn(txt, cls, title, fn) {
      var b = el("button", "pc-btn" + (cls ? " " + cls : ""), txt);
      b.type = "button";
      if (title) b.title = title;
      b.addEventListener("click", fn);
      return b;
    }
    lib.appendChild(btn("Charger", null, null, function () {
      var p = loadPersos().filter(function (q) { return q.id === sel.value; })[0];
      if (!p) { flash("Choisir un personnage dans la liste."); return; }
      // COPIE : sans elle, la fiche et l'entrée de bibliothèque partageraient
      // les mêmes objets, et jouer écraserait la sauvegarde
      try { state = normalize(JSON.parse(JSON.stringify(p.state))); }
      catch (e) { flash("Fiche illisible."); return; }
      remount();
      flash("« " + (p.name || "Sans nom") + " » chargé.");
    }));
    lib.appendChild(btn("Enregistrer", null, "Enregistrer le personnage courant dans la bibliothèque", function () {
      var persos = loadPersos();
      var name = state.name || "Sans nom";
      var existant = null;
      persos.forEach(function (p) { if (p.name === name) existant = p; });
      var copie = JSON.parse(JSON.stringify(state));
      if (existant) existant.state = copie;
      else persos.push({ id: "p" + Date.now().toString(36), name: name, state: copie });
      savePersos(persos);
      fillSel();
      flash("« " + name + " » enregistré.");
    }));
    lib.appendChild(btn("Supprimer", "danger", "Supprimer le personnage choisi de la bibliothèque", function () {
      if (!sel.value) { flash("Choisir un personnage dans la liste."); return; }
      savePersos(loadPersos().filter(function (q) { return q.id !== sel.value; }));
      fillSel();
    }));
    lib.appendChild(btn("Nouveau", null, null, function () { state = blank(); remount(); }));
    lib.appendChild(btn("Exporter", null, null, exporterJson));
    var file = el("input");
    file.type = "file"; file.accept = "application/json"; file.style.display = "none";
    file.addEventListener("change", function () { importerJson(file); });
    lib.appendChild(btn("Importer", null, null, function () { file.click(); }));
    lib.appendChild(file);
    top.appendChild(lib);
    container.appendChild(top);
  }
  // Exporter / importer : le même geste que dans le bloc « Fiche » des Options,
  // qui les REDONNE parce que la barre d'outils n'existe pas dans Roll20.
  function exporterJson() {
    var a = document.createElement("a");
    a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    a.download = (state.name || "personnage-outward") + ".json";
    a.click();
  }
  function importerJson(file) {
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
  }

