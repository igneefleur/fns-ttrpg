  // ---------- pont léger vers le page-script (has-sheet) ----------
  // L'écouteur n'est POSÉ QU'À LA PREMIÈRE requête (aucun code au chargement de la page).
  var pendingHas = {}, hasListener = false;
  function ensureHasListener() {
    if (hasListener) return;
    hasListener = true;
    window.addEventListener("message", function (ev) {
      try {
        var d = ev.data;
        if (!d || d.ns !== "mia") return;   // ignore tout ce qui n'est pas à nous
        if (d.type === "has-sheet-result" && pendingHas[d.charId]) {
          // exists:null = perso injoignable POUR L'INSTANT (Campaign pas prêt) :
          // on laisse les relances retenter ; le délai final rendra null au pire.
          if (d.exists === null || d.exists === undefined) return;
          var cb = pendingHas[d.charId]; delete pendingHas[d.charId]; cb(d.exists);
        }
      } catch (e) {}
    });
  }
  // Demande au page-script d20 de s'injecter (l'injection ne se fait QUE là, sur
  // interaction — jamais au chargement de l'éditeur, pour ne pas gêner Roll20).
  function requestBridge() { try { window.top.postMessage({ ns: "mia", type: "need-bridge" }, "*"); } catch (e) {} }
  // interroge has-sheet, avec relances (le page-script vient peut-être d'être injecté)
  function queryHasSheet(charId, cb) {
    ensureHasListener();
    if (!charId) { cb(null); return; }
    pendingHas[charId] = cb;
    var tries = 0;
    (function send() {
      if (!pendingHas[charId]) return;   // déjà répondu
      tries++;
      try { window.top.postMessage({ ns: "mia", type: "has-sheet", charId: charId }, "*"); } catch (e) {}
      if (tries < 5) setTimeout(send, 700);
      // dernier essai : laisser sa réponse arriver avant de conclure null
      else setTimeout(function () {
        if (pendingHas[charId]) { delete pendingHas[charId]; cb(null); }
      }, 700);
    })();
  }

  // charId du personnage dont CETTE frame (la feuille) est la vue.
  function charIdOfFrame(dialog) {
    try {
      var fe = window.frameElement;
      var dlg = fe && fe.closest && fe.closest(".characterdialog");
      if (dlg && dlg.getAttribute("data-characterid")) return dlg.getAttribute("data-characterid");
    } catch (e) {}
    var n = (dialog && dialog.querySelector && dialog.querySelector("[data-characterid]")) ||
            document.querySelector("[data-characterid]");
    if (n) return n.getAttribute("data-characterid");
    // fenêtre popout : pas de dialogue autour, mais l'id est le 2e segment de
    // l'URL (/editor/character/<campagne>/<perso>/...)
    var m = /^\/editor\/character\/[^/]+\/([^/?#]+)/.exec(location.pathname);
    if (m) { try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } }
    return "";
  }

