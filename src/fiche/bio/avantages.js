  // ---------- avantages et désavantages ----------
  // DEUX LISTES JUMELLES, UNE SEULE FABRIQUE. Elles ne diffèrent que par leur
  // nom, leur clé dans l'état et le mot qu'elles emploient ; tout le reste —
  // la carte, le champ de nom, l'effet, le bouton de tchat, la croix, l'ajout —
  // est le même geste. Deux listes qui se ressemblent doivent se ressembler
  // JUSQUE DANS LE CODE, sans quoi l'une finit corrigée et l'autre non : c'est
  // la faute qu'ont faite les PV et l'endurance avant d'être remis ensemble.
  //
  // UN AVANTAGE EST DU TEXTE, et un désavantage aussi : { name, desc } et rien
  // d'autre. Aucune conséquence chiffrée n'entre par là — elle passe par un
  // réglage de l'onglet Options, qui est le seul endroit où un nombre se règle.
  function bioCartes(titre, editId, cle, mot, Mot) {
    var b = block(titre, null, editId);
    var box = el("div");
    b.appendChild(box);
    function rendu() {
      box.innerHTML = "";
      state[cle].forEach(function (a, i) {
        var card = el("div", "pc-av");
        var head = el("div", "pc-av-head");
        var n = el("input", "nm pc-edit-field");
        n.type = "text"; n.placeholder = "Nom"; n.value = a.name || "";
        // UN NOM S'ENREGISTRE SANS RAFRAÎCHIR : rien ne se calcule à partir de
        // lui, et refresh() reconstruirait la liste sous les doigts.
        n.addEventListener("input", function () { a.name = n.value; save(); });
        head.appendChild(n);
        head.appendChild(chatBtn(
          function () { return Mot + " — " + (a.name || "sans nom"); },
          function () { return [["", a.desc]]; }));
        head.appendChild(miniBtn("✕", "Retirer", function () {
          state[cle].splice(i, 1);
          rendu();
          refresh();
        }, "danger pc-edit-only"));
        card.appendChild(head);
        var d = el("textarea", "pc-notes pc-edit-field");
        d.rows = 3;
        d.placeholder = "Effet";
        d.value = a.desc || "";
        d.addEventListener("input", function () { a.desc = d.value; save(); });
        card.appendChild(d);
        box.appendChild(card);
      });
      if (!state[cle].length) box.appendChild(el("div", "pc-empty", "Aucun " + mot + "."));
      box.appendChild(miniBtn("+ Ajouter un " + mot, null, function () {
        state[cle].push({ name: "", desc: "" });
        rendu();
        refresh();
      }, "pc-edit-only"));
      // LA LISTE SE REFAIT ENTIÈREMENT à chaque ajout et à chaque retrait : les
      // cartes neuves naissent hors du mode courant, et c'est applyEdit qui les
      // y remet. Sans cet appel, une carte ajoutée sous le rouage garderait ses
      // champs verrouillés jusqu'au montage suivant.
      applyEdit(b, editId);
    }
    rendu();
    return b;
  }

  function buildAvantages() {
    return bioCartes("Avantages", "avantages", "avantages", "avantage", "Avantage");
  }
  function buildDesavantages() {
    return bioCartes("Désavantages", "desavantages", "desavantages", "désavantage", "Désavantage");
  }
