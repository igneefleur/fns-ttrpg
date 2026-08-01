/* Popup de l'extension : liste les fiches synchronisées et choisit l'active. */
// compat : Chrome expose `chrome.*`, Firefox `browser.*` (les deux rendent des promesses).
if (typeof browser === "undefined") { var browser = chrome; }
(function () {
  "use strict";

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function render() {
    return browser.storage.local.get(["jjkCards", "jjkNames", "jjkActive", "jjkSyncedAt"]).then(function (r) {
      var cards = r.jjkCards || {};
      var names = r.jjkNames || {};
      var active = r.jjkActive || null;
      var ids = Object.keys(cards);
      var status = document.getElementById("p-status");
      var list = document.getElementById("p-list");
      list.innerHTML = "";

      if (!ids.length) {
        status.textContent = "Aucune fiche synchronisée.";
        status.className = "p-status warn";
        list.appendChild(el("li", "p-empty", "Ouvrez le créateur de personnage sur le site JJK : vos personnages enregistrés apparaîtront ici."));
        return;
      }
      var when = r.jjkSyncedAt ? new Date(r.jjkSyncedAt).toLocaleString("fr-FR") : "—";
      status.textContent = ids.length + " fiche(s) synchronisée(s) · " + when;
      status.className = "p-status";

      function label(id) {
        if (id === "_current") return (cards._current && cards._current.name || "Brouillon") + " (en cours)";
        return names[id] || (cards[id] && cards[id].name) || id;
      }
      ids.sort(function (a, b) {
        if (a === "_current") return -1;
        if (b === "_current") return 1;
        return label(a).localeCompare(label(b));
      }).forEach(function (id) {
        var li = el("li", "p-item" + (id === active ? " active" : ""));
        var nm = el("span", "p-name", label(id));
        li.appendChild(nm);
        var set = el("button", "p-set", id === active ? "active" : "choisir");
        set.addEventListener("click", function () {
          browser.storage.local.set({ jjkActive: id }).then(render);
        });
        li.appendChild(set);
        list.appendChild(li);
      });
    });
  }

  document.getElementById("p-refresh").addEventListener("click", render);
  render();
})();
