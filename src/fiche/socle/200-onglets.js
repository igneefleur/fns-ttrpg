  // ---------- onglets ----------
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
      // l'onglet se nomme sur son panneau : c'est le seul moyen, de l'extérieur,
      // de dire dans QUELLE colonne de QUEL onglet un module a atterri
      panes[t.id].dataset.tab = t.id;
    });
    function activate(id) {
      if (!panes[id]) id = "fiche";
      TABS.forEach(function (t) {
        btns[t.id].classList.toggle("on", t.id === id);
        panes[t.id].classList.toggle("on", t.id === id);
      });
      setTab(id);
    }
    sheet.appendChild(bar);
    TABS.forEach(function (t) { sheet.appendChild(panes[t.id]); });
    activate(curTab());
    return panes;
  }

