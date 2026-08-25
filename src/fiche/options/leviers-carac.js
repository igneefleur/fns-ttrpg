  // ---- les trois leviers du meneur, caractéristique par caractéristique ----
  // TROIS BLOCS ET NON UN, parce que ce sont trois gestes qui ne se font pas au
  // même moment et qui ne se rangent pas au même endroit : un module se déplace
  // et se coupe tout seul. Ils partagent la même grille à trois colonnes — le
  // sigle, le levier, ce que ça donne — pour qu'on n'ait à apprendre qu'une
  // disposition.
  //
  // AUCUN NE TOUCHE À LA VALEUR ni à ce qu'elle a coûté : ils décalent ce que la
  // caractéristique DONNE. La valeur, elle, se décale sur la fiche (case Bonus).
  function levierCarac(titre, aide, entete, champ, lire, borne, rendu) {
    var b = block(titre);
    if (aide) b.appendChild(el("div", "pc-block-note", aide));
    var box = el("div");
    b.appendChild(box);

    var head = el("div", "pc-optcomp-row trois head");
    [["Carac.", "Caractéristique"], ["Décal.", "Décalage — vide = aucun"], entete].forEach(function (h) {
      var sp = el("span", null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    box.appendChild(head);

    champs().forEach(function (c, i) {
      var row = el("div", "pc-optcomp-row trois" + (i % 2 === 1 ? " odd" : ""));
      var nameBox = el("span", "pc-comp-name");
      var chip = el("span", "pc-abbr", c);
      chip.title = caracInfo(c).nom;
      nameBox.appendChild(chip);
      row.appendChild(nameBox);
      row.appendChild(champMod(state[champ], c, borne, aide));
      var out = el("span", "pc-comp-total", "");
      row.appendChild(out);
      hooks.push(function () {
        var d = state[champ][c] || 0;
        var r = rendu(c);
        out.textContent = r.texte;
        out.classList.toggle("adj", d !== 0);
        out.title = r.titre;
        row.classList.toggle("on", d !== 0);
      });
      box.appendChild(row);
    });
    return b;
  }

  function buildLimCaracs() {
    // LA LIMITE SEULE. C'est le seul levier qui resserre l'écart d'une
    // spécialité sous son minimum : le rabattage se calcule sur la limite
    // NATURELLE, celle-ci ne la touche pas (voir caracLimNat).
    return levierCarac("Limite des caractéristiques",
      "Décale la limite sans toucher à la valeur : c'est le seul levier qui resserre l'écart d'une spécialité.",
      ["Limite", "Limite effective, celle qui coiffe le jet"],
      "caracsLimMod", null, 9999,
      function (c) {
        var d = state.caracsLimMod[c] || 0;
        return { texte: String(caracLim(c)),
                 titre: "De la table " + caracLimTable(c) + (d ? " · décalage " + sign(d) : "") };
      });
  }

  function buildModCaracs() {
    // LE MODIFICATEUR SEUL. Il ne bouge ni la valeur ni la limite : seulement
    // ce que la caractéristique ajoute au jet.
    return levierCarac("Modificateur des caractéristiques",
      "Décale le modificateur sans toucher à la valeur ni à la limite.",
      ["MOD", "Modificateur effectif, celui qui s'ajoute au jet"],
      "caracsModMod", null, 999,
      function (c) {
        var d = state.caracsModMod[c] || 0;
        return { texte: sign(caracMod(c)),
                 titre: "De la table " + sign(caracModTable(c)) +
                        (d ? " · décalage " + sign(d) : "") };
      });
  }

  // ---- couper la règle de l'écart ----
  // UN INTERRUPTEUR, ET IL PORTE SUR TOUT LE PERSONNAGE. Les trois leviers
  // ci-dessus DÉCALENT ; celui-ci SUSPEND. Il est à part pour cette raison, et
  // pas seulement parce qu'il n'a pas de ligne par caractéristique : décaler un
  // seuil et suspendre une règle ne se font pas dans le même état d'esprit, et
  // on ne coche pas l'un en croyant régler l'autre.
  //
  // Il ne pose AUCUN avertissement en tête de fiche : c'est un réglage voulu,
  // pas un état du personnage. Ce qu'il fait se lit ici, là où on le coche.
  function buildEcartCoupe() {
    var b = block("Règle de l'écart");
    b.appendChild(el("div", "pc-block-note",
      "Coupée, aucun total de spécialité n'est ramené — quelle que soit sa limite."));
    var row = el("div", "pc-kv");
    var lab = el("label", "pc-case-mot");
    var boite = el("input");
    boite.type = "checkbox";
    boite.title = "Coché, la règle de l'écart ne retire plus rien à ce personnage.";
    boite.addEventListener("change", function () {
      state.ecartCoupe = boite.checked;
      save();
      refresh();
    });
    hooks.push(function () { boite.checked = !!state.ecartCoupe; });
    lab.appendChild(boite);
    lab.appendChild(el("span", "t", "Couper la règle pour ce personnage"));
    row.appendChild(lab);
    b.appendChild(row);
    return b;
  }

  // L'ÉCART MINIMUM entre le total d'une spécialité et la limite de sa
  // caractéristique. SEUL DES QUATRE BLOCS À DEMANDER UNE VALEUR et non un
  // décalage, et c'est voulu : on pense « l'écart doit être de 30 », jamais
  // « je décale de −20 ». Le champ montre en filigrane celui des règles, et
  // l'effacer y revient. Deux colonnes suffisent donc — une troisième
  // répéterait ce que le champ dit déjà.
  function buildEcartCaracs() {
    var b = block("Écart des spécialités");
    b.appendChild(el("div", "pc-block-note",
      "Écart minimum entre le total d'une spécialité et la limite de sa caractéristique. Vide = celui des règles."));
    var box = el("div");
    b.appendChild(box);

    var head = el("div", "pc-optcomp-row paire head");
    [["Carac.", "Caractéristique"], ["Écart", "Vide = l'écart des règles"]].forEach(function (h) {
      var sp = el("span", null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    box.appendChild(head);

    champs().forEach(function (c, i) {
      var row = el("div", "pc-optcomp-row paire" + (i % 2 === 1 ? " odd" : ""));
      var nameBox = el("span", "pc-comp-name");
      var chip = el("span", "pc-abbr", c);
      chip.title = caracInfo(c).nom;
      nameBox.appendChild(chip);
      row.appendChild(nameBox);
      row.appendChild(champForce(state.caracsEcart, c,
        function () { return repli("speMarge"); },
        "Écart minimum — vide = celui des règles."));
      hooks.push(function () {
        row.classList.toggle("on", state.caracsEcart[c] !== undefined);
      });
      box.appendChild(row);
    });
    return b;
  }
