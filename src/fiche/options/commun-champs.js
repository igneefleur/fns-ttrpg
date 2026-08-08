  // ---- modificateurs de caractéristiques (hors limite : au-delà de 80, sous 0) ----
  // équipement, art et décisions du MJ confondus : UN modificateur par
  // caractéristique, appliqué au total affiché sur la Fiche
  // MÊME GRILLE QUE LES COMPÉTENCES, et c'est voulu : régler une
  // caractéristique et régler une compétence sont le même geste pour le MJ, il
  // n'a pas à apprendre deux dispositions. Sans le filtre, le menu des champs
  // ni les puces : sur trois lignes, ils ne servent à rien.
  // Les deux champs des grilles d'Options vivent ICI, et non dans un bloc :
  // trois blocs s'en servent désormais (modificateurs de caractéristiques,
  // compétences, Création). Chacun existe en deux formes, une valeur d'un
  // ensemble (map + clé, la plupart des leviers) ou une valeur seule (le
  // budget de points de création) : la première délègue à la seconde, il n'y a
  // donc qu'une implémentation à corriger le jour où l'une d'elles bouge.
  // un champ de modificateur, nu, comme dans le bloc des compétences
  function champModVal(lire, ecrire, borne, titre) {
    var inp = el("input", "pc-num modif");
    inp.type = "number"; inp.step = String(MOD_PAS);
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      ecrire(isFinite(v) ? clamp(Math.round(v), -borne, borne) : 0);
      refresh();
    });
    hooks.push(function () {
      if (document.activeElement !== inp) inp.value = lire() ? lire() : "";
    });
    return inp;
  }
  function champMod(map, cle, borne, titre) {
    return champModVal(function () { return map[cle]; },
                       function (v) { map[cle] = v; }, borne, titre);
  }
  // un champ de forçage : vide = valeur calculée (undefined = pas de forçage)
  function champForceVal(lire, ecrire, auto, titre) {
    var inp = el("input", "force");
    inp.type = "number"; inp.step = "1";
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      ecrire(isFinite(v) ? clamp(Math.round(v), -9999, 9999) : undefined);
      refresh();
    });
    hooks.push(function () {
      inp.placeholder = String(auto());
      var cur = lire();
      if (document.activeElement !== inp) inp.value = cur === undefined ? "" : cur;
    });
    return inp;
  }
  function champForce(map, cle, auto, titre) {
    return champForceVal(
      function () { return map[cle]; },
      function (v) { if (v === undefined) delete map[cle]; else map[cle] = v; },
      auto, titre);
  }

