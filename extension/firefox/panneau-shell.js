/* Coquille générique d'un panneau flottant : elle pointe son iframe vers une
 * page SERVIE PAR LE SITE, dont le nom vient du hash (#p=roll20-narration.html,
 * posé par content-roll20.js). Rien n'est en dur ici que les deux racines de
 * site : un panneau de plus, ou une refonte de celui-ci, ne coûtera pas de
 * signature.
 *
 * MODE BETA : même réglage que la fiche (jjkBeta, popup) — une seule extension,
 * deux sites. Les racines sont volontairement recopiées de creator-shell.js
 * plutôt que partagées : un fichier de plus dans la coquille, c'est une pièce
 * de plus à charger et à signer, et ces deux constantes n'ont pas bougé depuis
 * la création du dispositif. Les changer ICI et LÀ-BAS, jamais qu'ici.
 *
 * Dépannage : browser.storage.local.jjk_site_url remplace la racine choisie
 * (ex. http://localhost:8000/HxH-Regles-JDR/jjk/ pour un mkdocs serve local),
 * à poser depuis la console de débogage de l'extension. */
if (typeof browser === "undefined") { var browser = chrome; }
(function () {
  "use strict";
  var STABLE = "https://igneefleur.github.io/HxH-Regles-JDR/jjk/";
  var BETA = "https://igneefleur.github.io/HxH-Regles-JDR/jjk-beta/";
  var DEFAUT = "roll20-narration.html";

  // Même règle que l'amorceur du site : une page du site, relative, sans
  // schéma, sans « // » de tête, sans remontée de dossier. Le hash arrive du
  // content-script, mais rien n'empêche quiconque de rouvrir cette page avec
  // un autre : elle ne doit jamais devenir un iframeur universel.
  function sure(p) {
    return typeof p === "string" && /^[A-Za-z0-9._/-]+\.html$/.test(p) &&
           p.indexOf("//") !== 0 && p.indexOf("..") < 0;
  }

  var hash = location.hash || "";
  var m = /[#&]p=([^&]*)/.exec(hash);
  var page = "";
  try { page = m ? decodeURIComponent(m[1]) : ""; } catch (e) { page = ""; }
  if (!sure(page)) page = DEFAUT;

  function mount(base) {
    // le hash entier suit : la page distante y lit le thème (n=1/0) comme la fiche
    document.getElementById("jjk-remote").src = String(base) + page + hash;
  }
  try {
    browser.storage.local.get(["jjk_site_url", "jjkBeta"]).then(
      function (r) { mount((r && r.jjk_site_url) || (r && r.jjkBeta ? BETA : STABLE)); },
      function () { mount(STABLE); }
    );
  } catch (e) { mount(STABLE); }
})();
