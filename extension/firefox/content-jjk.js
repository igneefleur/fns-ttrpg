/* Content script sur le site JJK : recopie les fiches calculées vers l'extension.
 *
 * Le site écrit ses fiches (calculées, lecture seule) dans son localStorage,
 * sous « jjk-cards » (un objet { id -> carte }) et « jjk-persos » (la
 * bibliothèque, pour les noms). Ce script, qui partage l'origine du site,
 * lit ce localStorage et le pousse dans browser.storage.local, d'où le popup
 * de l'extension le récupère. Aucune règle n'est recopiée : rien que des cartes.
 */
// compat : Chrome expose `chrome.*`, Firefox `browser.*` (les deux rendent des promesses).
if (typeof browser === "undefined") { var browser = chrome; }
(function () {
  "use strict";

  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }

  var lastHash = "";
  function sync() {
    var cards = readJSON("jjk-cards", {});
    if (typeof cards !== "object" || !cards) cards = {};
    var persos = readJSON("jjk-persos", []);
    var names = {};
    if (Array.isArray(persos)) persos.forEach(function (p) { if (p && p.id) names[p.id] = p.name; });

    var hash = JSON.stringify([Object.keys(cards).sort(), names]);
    // on n'écrit que si le contenu a bougé (évite d'écraser sans cesse)
    var payload = JSON.stringify(cards);
    var h = hash + ":" + payload.length;
    if (h === lastHash) return;
    lastHash = h;

    try {
      browser.storage.local.set({ jjkCards: cards, jjkNames: names, jjkSyncedAt: Date.now() });
    } catch (e) { /* API absente hors extension : sans effet */ }
  }

  function demarre() {
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("pageshow", sync);
    // le site réécrit son localStorage à chaque frappe ; on relit périodiquement
    setInterval(sync, 3000);
  }

  // L'INTERRUPTEUR GÉNÉRAL VAUT AUSSI ICI. Cette moitié-là ne touche pas à
  // Roll20, elle lit le site, et c'est justement pour cela qu'on l'oubliait :
  // le popup annonçait « éteinte » pendant que ce script continuait de lire le
  // localStorage du site toutes les trois secondes et d'écrire dans le stockage
  // de l'extension. Une extension arrêtée qui recopie encore des fiches n'est
  // pas une extension arrêtée.
  //
  // Un stockage qui refuse de répondre DÉMARRE : le contraire éteindrait
  // l'extension sur une panne de lecture, alors que la position par défaut est
  // « allumée ». Comme ailleurs, on ne se tait que sur un « oui » explicite.
  try {
    browser.storage.local.get("jjkOff").then(
      function (r) { if (!(r && r.jjkOff === true)) { demarre(); } },
      function () { demarre(); }
    );
  } catch (e) { demarre(); }
})();
