  // ---- les deux champs partagés des grilles d'Options ----
  // Un champ de MODIFICATEUR : nu, sans − ni +. Sur cinquante lignes de quatre
  // colonnes, les boutons mangeaient la place et n'apportaient rien qu'on ne
  // fasse au clavier. Vide affiché quand la valeur est 0 : un zéro n'est pas un
  // réglage.
  function champModVal(lire, ecrire, borne, titre, reg) {
    var inp = el("input", "pc-num modif");
    inp.type = "number"; inp.step = String(MOD_PAS);
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(String(inp.value).replace(",", "."));
      ecrire(isFinite(v) ? clamp(Math.round(v * 100) / 100, -borne, borne) : 0);
      refresh();
    });
    (reg || hooks).push(function () {
      if (document.activeElement !== inp) inp.value = lire() ? lire() : "";
    });
    return inp;
  }
  function champMod(map, cle, borne, titre, reg) {
    return champModVal(function () { return map[cle]; },
                       function (v) { if (v) map[cle] = v; else delete map[cle]; },
                       borne, titre, reg);
  }
  // Un champ de FORÇAGE : vide = valeur calculée (undefined, distinct de 0).
  function champForceVal(lire, ecrire, auto, titre, reg) {
    var inp = el("input", "force");
    inp.type = "number"; inp.step = "any";
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(String(inp.value).replace(",", "."));
      ecrire(isFinite(v) ? clamp(Math.round(v * 100) / 100, -99999, 99999) : undefined);
      refresh();
    });
    (reg || hooks).push(function () {
      inp.placeholder = fmtP(auto());
      var cur = lire();
      if (document.activeElement !== inp) inp.value = cur === undefined ? "" : cur;
    });
    return inp;
  }
  function champForce(map, cle, auto, titre, reg) {
    return champForceVal(
      function () { return map[cle]; },
      function (v) { if (v === undefined) delete map[cle]; else map[cle] = v; },
      auto, titre, reg);
  }
  // Un champ de FACTEUR : vide = ×1, jamais ×0. Il se calque sur le champ de
  // forçage et NON sur celui de modificateur : bâti sur le second, il écrirait
  // zéro en s'effaçant et annulerait la valeur qu'il devait seulement laisser
  // tranquille. Son pas est libre, des flèches de 1 en 1 sautant de ×1 à ×6.
  function champMultVal(lire, ecrire, titre, reg) {
    var inp = el("input", "pc-num modif mult");
    inp.type = "number"; inp.step = "any";
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(String(inp.value).replace(",", "."));
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
  // L'entête d'une grille de leviers. Libellés COURTS : quatre colonnes dans
  // une demi-largeur ne laissent pas la place aux noms complets, que portent
  // les infobulles.
  function entete(box, colonnes, cls) {
    var head = el("div", "pc-optcomp-row " + (cls || "quatre") + " head");
    colonnes.forEach(function (h) {
      var sp = el("span", h[2] || null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    box.appendChild(head);
    return head;
  }

