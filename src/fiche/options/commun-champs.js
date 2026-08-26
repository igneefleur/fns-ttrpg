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
  // UN REGISTRE EN DERNIER ARGUMENT, ET IL EST FACULTATIF. Sans lui, le champ
  // s'inscrit dans « hooks », celui de la fiche montée — juste pour un bloc à
  // liste fermée. Une liste OUVERTE (les spécialités) se rebâtit : ses champs
  // doivent s'inscrire dans le registre du rebâti, qui est REMPLACÉ à chaque
  // fois. D'où la règle qui va avec : remettre ce registre à vide AVANT de
  // bâtir le moindre champ, sans quoi les champs poussent dans l'ancien
  // tableau, que plus personne ne joue.
  //
  // C'est l'unique raison pour laquelle l'ancien bloc des compétences avait
  // recopié quatre variantes de ces trois fonctions.
  // un champ de modificateur, nu, comme dans le bloc des compétences
  function champModVal(lire, ecrire, borne, titre, reg) {
    var inp = el("input", "pc-num modif");
    inp.type = "number"; inp.step = String(MOD_PAS);
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      ecrire(isFinite(v) ? clamp(Math.round(v), -borne, borne) : 0);
      refresh();
    });
    (reg || hooks).push(function () {
      if (document.activeElement !== inp) inp.value = lire() ? lire() : "";
    });
    return inp;
  }
  function champMod(map, cle, borne, titre) {
    return champModVal(function () { return map[cle]; },
                       function (v) { map[cle] = v; }, borne, titre);
  }
  // un champ de forçage : vide = valeur calculée (undefined = pas de forçage)
  function champForceVal(lire, ecrire, auto, titre, reg) {
    var inp = el("input", "force");
    inp.type = "number"; inp.step = "1";
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      ecrire(isFinite(v) ? clamp(Math.round(v), -9999, 9999) : undefined);
      refresh();
    });
    (reg || hooks).push(function () {
      inp.placeholder = String(auto());
      var cur = lire();
      if (document.activeElement !== inp) inp.value = cur === undefined ? "" : cur;
    });
    return inp;
  }
  // UN CHAMP DE FACTEUR : vide vaut ×1, et surtout pas zéro. Calqué sur le champ
  // de forçage et non sur celui de modificateur, parce que c'est le NEUTRE qui
  // change — un modificateur vide vaut 0, un facteur vide vaut 1, et un champ
  // qui écrirait 0 en s'effaçant annulerait la caractéristique.
  //
  // LE PAS EST LIBRE : les flèches d'un champ réglé de 5 en 5 (MOD_PAS)
  // sauteraient de ×1 à ×6. Et le forçage, lui, arrondit à l'entier — il ne
  // convenait pas non plus, ×1,5 doit pouvoir se saisir.
  function champMultVal(lire, ecrire, titre, reg) {
    var inp = el("input", "pc-num modif mult");
    inp.type = "number"; inp.step = "any";
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      ecrire(isFinite(v) ? clamp(Math.round(v * 100) / 100, -MULT_BORNE, MULT_BORNE) : undefined);
      refresh();
    });
    (reg || hooks).push(function () {
      inp.placeholder = "1";
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

