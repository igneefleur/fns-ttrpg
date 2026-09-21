  // ================= ONGLET FICHE =================

  // ---- les leviers d'une valeur : forçage et modificateurs ----
  // Vide = valeur CALCULÉE (le placeholder la montre en filigrane), une valeur
  // la FORCE. C'est le contrat de tous les champs « Forcé » de la fiche.
  function champForceMax(cle, auto, titre, reg) {
    return champForceBoite("capsLeviers", "max", cle, auto,
      titre || "Vide = maximum calculé (modificateurs compris) ; une valeur le force.", reg);
  }
  // La ligne « Forcé + Modificateurs » sous une jauge, en mode édition.
  function ligneLeviers(cle, auto, titre) {
    var row = el("div", "pc-pvmax pc-mods-host pc-edit-only");
    row.appendChild(el("span", "lbl", "Forcé"));
    row.appendChild(champForceMax(cle, auto, titre));
    row.appendChild(el("span", "lbl", "Modificateurs"));
    row.appendChild(multiModBoite("capsLeviers", "max", cle));
    row.appendChild(el("span", "sp"));
    return row;
  }

  // D'où vient un maximum, décomposé pour l'infobulle. La formule VERBATIM du
  // livre est dans les données ; on la cite, on ne la réécrit pas, et on ajoute
  // ce que la caractéristique du personnage y met aujourd'hui.
  function provenanceCap(cle) {
    return function () {
      var d = capDef(cle);
      if (!d) return "Aucune donnée pour cette capacité.";
      if (!d.formule) return "Aucune formule ne donne cette valeur.";
      var t = d.formule;
      if (d.carac) t += " — " + libCarac(d.carac) + " " + fmtP(caracTotal(d.carac));
      return t;
    };
  }

