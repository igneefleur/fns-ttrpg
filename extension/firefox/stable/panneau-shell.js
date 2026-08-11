/* Coquille générique d'un panneau flottant : elle pointe son iframe vers une
 * page SERVIE PAR LE SITE, dont le nom vient du hash (#p=roll20-camp.html, posé
 * par content-roll20.js). Rien n'est en dur ici que la racine du site : un
 * panneau de plus, ou une refonte de celui-ci, ne coûtera pas de signature.
 *
 * COPIE. Ce fichier existe DEUX FOIS, stable/panneau-shell.js et
 * beta/panneau-shell.js, et une seule des deux est jamais chargée : panneau.html
 * ne les nomme pas, c'est shell-loader.js qui ajoute la balise <script> d'après
 * le mode écrit dans le hash. L'isolation est donc ici RÉELLE, et chaque copie
 * n'a qu'une seule racine de site au lieu d'un aiguillage. La ligne qui
 * appartient à cette copie porte un commentaire en bout de ligne ; il n'y en a
 * qu'une, et tout le reste doit rester rigoureusement identique.
 *
 * LES DEUX COPIES S'ÉCRIVENT ET SE RELISENT À LA MAIN : il n'y a pas
 * d'assembleur dans ce dépôt-ci, donc pas de filet. TOUTE CORRECTION DE SÛRETÉ
 * DOIT ÊTRE APPLIQUÉE AUX DEUX COPIES. sure(), plus bas, est exactement le genre
 * de garde qu'une duplication distraite laisse tomber d'un côté : sans elle,
 * cette coquille devient un iframeur universel, et le trou reste ouvert alors
 * que l'autre copie est saine.
 *
 * Dépannage : browser.storage.local.owd_site_url remplace la racine du site
 * (ex. http://localhost:8000/fns-ttrpg/owd/ pour un mkdocs serve local),
 * à poser depuis la console de débogage de l'extension. Cette clé reste COMMUNE
 * aux deux parties, comme owd_sheet_url : elle épingle la coquille effectivement
 * chargée, quelle qu'elle soit. */
if (typeof browser === "undefined") { var browser = chrome; }
(function () {
  "use strict";
  var SITE = "https://igneefleur.github.io/fns-ttrpg/owd/";   // propre à cette copie
  var DEFAUT = "roll20-camp.html";

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
  // decodeURIComponent jette sur une séquence % invalide, et un panneau qui ne
  // s'ouvre pas est pire qu'un panneau qui s'ouvre sur sa page par défaut.
  try { page = m ? decodeURIComponent(m[1]) : ""; } catch (e) { page = ""; }
  if (!sure(page)) page = DEFAUT;

  function mount(base) {
    // le hash entier suit : la page distante y lit le thème (n=1/0) comme la fiche
    document.getElementById("owd-remote").src = String(base) + page + hash;
  }
  try {
    browser.storage.local.get("owd_site_url").then(
      function (r) { mount((r && r.owd_site_url) || SITE); },
      function () { mount(SITE); }
    );
  } catch (e) { mount(SITE); }
})();
