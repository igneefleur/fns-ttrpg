  // ---------- onglets ----------
  // CINQ, et chacun tient une seule sorte de chose. Le contrôle segmenté est
  // celui de JJK, repris tel quel.
  //
  //   Fiche       ce qui se lit en jouant : caractéristiques, réserves, corps
  //   Art         les techniques, qui sont des CARTES et n'ont pas de colonne
  //   Équipement  ce qui se porte : armes, vêtements, bourse, inventaire
  //   Bio         la prose, qu'on ne consulte pas en combat
  //   Options     les leviers du meneur et les réglages de la fiche
  //
  // POURQUOI CINQ ET NON TROIS : les techniques, la bio et les notes vivaient
  // en pleine largeur SOUS l'onglet Fiche, c'est-à-dire sous huit blocs qu'il
  // fallait dépasser pour les atteindre. Une carte de technique n'a rien à
  // faire derrière une jauge de satiété.
  var TABS = [
    { id: "fiche", label: "Fiche" },
    { id: "art", label: "Art" },
    { id: "equipement", label: "Équipement" },
    { id: "bio", label: "Bio" },
    { id: "options", label: "Options" }
  ];
  function buildTabs(sheet) {
    var bar = el("div", "pc-tabs");
    var panes = {};
    var btns = {};
    TABS.forEach(function (t) {
      var b = el("div", "pc-tab", t.label);
      b.addEventListener("click", function () { activate(t.id); });
      bar.appendChild(b);
      btns[t.id] = b;
      panes[t.id] = el("div", "pc-pane");
      // L'onglet se nomme sur son panneau : c'est le SEUL moyen, de
      // l'extérieur, de dire dans QUELLE colonne de QUEL onglet un module a
      // atterri. À ne pas omettre.
      panes[t.id].dataset.tab = t.id;
    });
    function activate(id) {
      if (!panes[id]) id = "fiche";
      TABS.forEach(function (t) {
        btns[t.id].classList.toggle("on", t.id === id);
        panes[t.id].classList.toggle("on", t.id === id);
      });
      setTab(id);   // l'onglet ouvert survit au remontage
    }
    sheet.appendChild(bar);
    TABS.forEach(function (t) { sheet.appendChild(panes[t.id]); });
    activate(curTab());
    return panes;
  }

