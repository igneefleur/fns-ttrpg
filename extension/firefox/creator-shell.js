/* Coquille de l'onglet « Fiche JJK » : pointe l'iframe vers la fiche SERVIE
 * PAR LE SITE (roll20-fiche.html) en lui passant le charId reçu dans le hash
 * (#c=<id>, posé par content-roll20.js). Tout le fonctionnement (créateur,
 * correspondance état <-> Attributes, amorce) vit côté site : l'extension n'a
 * plus besoin d'être re-signée quand la fiche évolue.
 *
 * MODE BETA : le réglage du popup (jjkBeta) fait charger la fiche du site de
 * chantier au lieu de la fiche normale. Une seule extension, deux sites — les
 * deux écrivent les mêmes Attributes du personnage.
 *
 * Dépannage : browser.storage.local.jjk_sheet_url remplace l'URL choisie
 * (ex. http://localhost:8000/HxH-Regles-JDR/jjk/roll20-fiche.html pour tester
 * un mkdocs serve local — mkdocs monte le site sous le chemin de site_url,
 * /jjk/ compris), à poser depuis la console de débogage de l'extension. */
if (typeof browser === "undefined") { var browser = chrome; }
(function () {
  "use strict";
  var STABLE_URL = "https://igneefleur.github.io/HxH-Regles-JDR/jjk/roll20-fiche.html";
  var BETA_URL = "https://igneefleur.github.io/HxH-Regles-JDR/jjk-beta/roll20-fiche.html";

  function mount(url) {
    document.getElementById("jjk-remote").src = url + (location.hash || "");
  }
  try {
    // storage.local.get : promesse sur Firefox (V2) comme sur Chrome (V3)
    browser.storage.local.get(["jjk_sheet_url", "jjkBeta"]).then(
      function (r) { mount((r && r.jjk_sheet_url) || (r && r.jjkBeta ? BETA_URL : STABLE_URL)); },
      function () { mount(STABLE_URL); }
    );
  } catch (e) { mount(STABLE_URL); }
})();
