  // ---- 20. Fiche : exporter / importer / réinitialiser ----
  // REDONNÉ ici parce que la barre d'outils n'existe pas dans Roll20, où la
  // fiche EST le personnage.
  function buildActions() {
    var b = block("Fiche");
    var act = el("div", "pc-opt-actions");
    function btn(txt, cls, fn) {
      var x = el("button", "pc-btn" + (cls ? " " + cls : ""), txt);
      x.type = "button";
      x.addEventListener("click", fn);
      return x;
    }
    act.appendChild(btn("Exporter (JSON)", null, exporterJson));
    var file = el("input");
    file.type = "file"; file.accept = "application/json"; file.style.display = "none";
    file.addEventListener("change", function () { importerJson(file); });
    act.appendChild(btn("Importer (JSON)", null, function () { file.click(); }));
    act.appendChild(file);
    act.appendChild(btn("Réinitialiser la fiche", "danger", function () {
      // confirmer(), jamais confirm() : muet dans l'iframe Roll20, il rendrait
      // false sans rien afficher et le geste serait annulé en silence.
      confirmer("Réinitialiser la fiche",
                "Tout le personnage sera effacé : caractéristiques, compétences, techniques, " +
                "équipement, inventaire, mods. Exporter d'abord si le doute existe.",
                "Réinitialiser", function () {
        state = blank();
        remount();
        flash("Fiche réinitialisée.");
      });
    }));
    b.appendChild(act);
    return b;
  }

