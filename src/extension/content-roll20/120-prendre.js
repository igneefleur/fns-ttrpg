  // ---------- « Prendre » : le lien d'un objet donné, cliqué dans le tchat ----------
  // La fiche vit dans une iframe : elle ne voit pas le tchat. C'est donc ICI
  // qu'on intercepte le clic sur le lien « [Prendre](/mia_take <payload>) »
  // composé par la fiche, pour renvoyer le payload — jamais interprété ici —
  // aux fiches ouvertes, qui affichent leur dialogue de réception.
  var TAKE_RE = /^\/mia_take\s+([A-Za-z0-9+/=_-]+)$/;
  var sheets = [];   // fenêtres de fiches (ou popouts) qui nous ont parlé
  function rememberSheet(w) {
    if (!w) return;
    try { if (sheets.indexOf(w) < 0) sheets.push(w); } catch (e) {}
  }
  function diffuseTake(payload) {
    sheets = sheets.filter(function (w) { try { return w && !w.closed; } catch (e) { return false; } });
    var n = 0;
    sheets.forEach(function (w) {
      try { w.postMessage({ ns: "mia", type: "take", payload: payload }, "*"); n++; } catch (e) {}
    });
    return n;
  }
  function toast(msg) {
    try {
      var t = el("div", null, msg);
      t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;" +
        "background:#2a2620;color:#f3ecdd;font:13px/1.4 sans-serif;padding:8px 14px;border-radius:7px;" +
        "box-shadow:0 4px 14px rgba(0,0,0,.35);max-width:80vw;text-align:center";
      document.body.appendChild(t);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
    } catch (e) {}
  }
  // Cet écouteur se posait au chargement du fichier. Il ne peut plus : tant que
  // le stockage n'a pas répondu, cette copie ignore si elle est celle du mode, et
  // une copie éteinte qui écoute déjà les clics n'est pas éteinte du tout. Il est
  // donc posé par demarre(), comme tous les autres effets.
  function posePriseTake() {
    document.addEventListener("click", function (e) {
      var a = e.target && (e.target.tagName === "A" ? e.target
              : (e.target.closest ? e.target.closest("a") : null));
      if (!a) return;
      var m = TAKE_RE.exec((a.getAttribute("href") || "").trim());
      if (!m) return;
      e.preventDefault(); e.stopPropagation();
      if (!diffuseTake(m[1])) {
        toast("Ouvre ta fiche MIA (onglet « Fiche MIA » du personnage), puis reclique « Prendre ».");
      }
    }, true);
  }

