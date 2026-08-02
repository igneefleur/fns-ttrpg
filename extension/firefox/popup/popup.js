/* Panneau de l'extension : deux choses seulement — un lien vers les règles et
 * l'interrupteur du mode beta. (L'ancienne liste des fiches synchronisées a
 * été retirée : la fiche vit dans le personnage Roll20, pas ici.) */
// compat : Chrome expose `chrome.*`, Firefox `browser.*` (les deux rendent des promesses).
if (typeof browser === "undefined") { var browser = chrome; }
(function () {
  "use strict";

  // Mode beta : la fiche affichée dans Roll20 vient du site de chantier.
  // Une seule extension, deux sites (creator-shell.js lit ce réglage) ; le
  // lien des règles suit, et l'onglet Roll20 s'annonce « Fiche JJK beta ».
  var REGLES = {
    stable: "https://igneefleur.github.io/HxH-Regles-JDR/jjk/content/regles/",
    beta: "https://igneefleur.github.io/HxH-Regles-JDR/jjk-beta/content/regles/"
  };
  var beta = document.getElementById("p-beta");
  var regles = document.getElementById("p-regles");

  function appliquerMode(on) {
    beta.checked = !!on;
    regles.href = on ? REGLES.beta : REGLES.stable;
    document.body.classList.toggle("beta", !!on);
  }

  browser.storage.local.get("jjkBeta").then(
    function (r) { appliquerMode(r && r.jjkBeta); },
    function () { appliquerMode(false); }
  );
  beta.addEventListener("change", function () {
    var on = beta.checked;
    browser.storage.local.set({ jjkBeta: on }).then(function () { appliquerMode(on); });
  });
})();
