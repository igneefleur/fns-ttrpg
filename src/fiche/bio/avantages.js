  // ---------- avantages ----------
  // LA MÊME CARTE QUE DANS MIA : le nom, puis la description. Outward y ajoute
  // le COÛT, en points d'avantage, à droite du nom : c'est lui que l'en-tête
  // additionne contre les points que donne le livre.
  //
  // UN AVANTAGE EST DU TEXTE : { nom, cout, desc } et rien d'autre. Aucune
  // conséquence chiffrée n'entre par là — elle passe par un réglage de
  // l'onglet Options, qui est le seul endroit où un nombre se règle.
  function buildAvantages() {
    var b = block("Avantages", null, "avantages");
    var box = el("div");
    b.appendChild(box);
    function rendu() {
      box.innerHTML = "";
      state.avantages.forEach(function (a, i) {
        var card = el("div", "pc-av");
        var head = el("div", "pc-av-head");
        var n = el("input", "nm pc-edit-field");
        n.type = "text"; n.placeholder = "Nom"; n.value = a.nom || "";
        // UN NOM S'ENREGISTRE SANS RAFRAÎCHIR : rien ne se calcule à partir de
        // lui, et refresh() reconstruirait la liste sous les doigts.
        n.addEventListener("input", function () { a.nom = n.value; save(); });
        head.appendChild(n);
        var c = el("input", "cout pc-edit-field");
        c.type = "text"; c.inputMode = "numeric"; c.placeholder = "0";
        c.value = a.cout ? fmtP(a.cout) : "";
        c.title = "Coût, en points d'avantage";
        c.addEventListener("input", function () { a.cout = pnum(c.value); save(); refresh(); });
        c.addEventListener("blur", function () { c.value = a.cout ? fmtP(a.cout) : ""; });
        head.appendChild(c);
        head.appendChild(chatBtn(
          function () { return "Avantage — " + (a.nom || "sans nom"); },
          function () { return [["Coût", a.cout ? fmtP(a.cout) : ""], ["", a.desc]]; }));
        head.appendChild(miniBtn("✕", "Retirer", function () {
          state.avantages.splice(i, 1);
          rendu();
          refresh();
        }, "danger pc-edit-only"));
        card.appendChild(head);
        var d = el("textarea", "pc-notes pc-edit-field");
        d.rows = 3;
        d.placeholder = "Description";
        d.value = a.desc || "";
        d.addEventListener("input", function () { a.desc = d.value; save(); });
        card.appendChild(d);
        box.appendChild(card);
      });
      if (!state.avantages.length) box.appendChild(el("div", "pc-empty", "Aucun avantage."));
      box.appendChild(miniBtn("+ Ajouter un avantage", null, function () {
        state.avantages.push({ nom: "", cout: 0, desc: "" });
        rendu();
        refresh();
      }, "pc-edit-only"));
      // LA LISTE SE REFAIT ENTIÈREMENT à chaque ajout et à chaque retrait : les
      // cartes neuves naissent hors du mode courant, et c'est applyEdit qui les
      // y remet.
      applyEdit(b, "avantages");
    }
    rendu();
    return b;
  }
