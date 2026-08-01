/* Coquille de l'onglet « Fiche JJK » : pointe l'iframe vers la fiche SERVIE
 * PAR LE SITE (roll20-fiche.html) en lui passant le charId reçu dans le hash
 * (#c=<id>, posé par content-roll20.js). Tout le fonctionnement (créateur,
 * correspondance état <-> Attributes, amorce) vit côté site : l'extension n'a
 * plus besoin d'être re-signée quand la fiche évolue.
 *
 * Dépannage : browser.storage.local.jjk_sheet_url remplace l'URL par défaut
 * (ex. http://localhost:8000/HxH-Regles-JDR/jjk/roll20-fiche.html pour tester
 * un mkdocs serve local — mkdocs monte le site sous le chemin de site_url,
 * /jjk/ compris), à poser depuis la console de débogage de l'extension. */
if (typeof browser === "undefined") { var browser = chrome; }
(function () {
  "use strict";
  var DEFAULT_URL = "https://igneefleur.github.io/HxH-Regles-JDR/jjk/roll20-fiche.html";

  function mount(url) {
    document.getElementById("jjk-remote").src = url + (location.hash || "");
  }
  try {
    // storage.local.get : promesse sur Firefox (V2) comme sur Chrome (V3)
    browser.storage.local.get("jjk_sheet_url").then(
      function (r) { mount((r && r.jjk_sheet_url) || DEFAULT_URL); },
      function () { mount(DEFAULT_URL); }
    );
  } catch (e) { mount(DEFAULT_URL); }
})();
