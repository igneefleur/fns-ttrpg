/* Coquille de l'onglet « Fiche Outward » : pointe l'iframe vers la fiche SERVIE
 * PAR LE SITE (roll20-fiche.html) en lui repassant LE HASH ENTIER, qui porte le
 * charId reçu de content-roll20.js (#c=<id>) et le thème (n=1/0). Tout le
 * fonctionnement (créateur, correspondance état <-> Attributes, amorce) vit
 * côté site : l'extension n'a pas à être re-signée quand la fiche évolue.
 *
 * COPIE. Ce fichier existe DEUX FOIS, stable/creator-shell.js et
 * beta/creator-shell.js, et une seule des deux est jamais chargée : creator.html
 * ne les nomme pas, c'est shell-loader.js qui ajoute la balise <script> d'après
 * le mode écrit dans le hash. L'isolation est donc ici RÉELLE, et chaque copie
 * n'a qu'une seule adresse de site au lieu d'un aiguillage. La ligne qui
 * appartient à cette copie porte un commentaire en bout de ligne ; il n'y en a
 * qu'une, et tout le reste doit rester rigoureusement identique.
 *
 * LES DEUX COPIES S'ÉCRIVENT ET SE RELISENT À LA MAIN : il n'y a pas
 * d'assembleur dans ce dépôt-ci, donc pas de filet. TOUTE CORRECTION DE SÛRETÉ
 * DOIT ÊTRE APPLIQUÉE AUX DEUX COPIES, dans le même geste : un correctif posé
 * d'un seul côté laisse le trou ouvert de l'autre, et rien ne le signalera.
 *
 * Dépannage : browser.storage.local.owd_sheet_url remplace l'URL du site
 * (ex. http://localhost:8000/fns-ttrpg/owd/roll20-fiche.html pour tester
 * un mkdocs serve local, mkdocs montant le site sous le chemin de site_url,
 * /owd/ compris), à poser depuis la console de débogage de l'extension. Cette
 * clé reste COMMUNE aux deux parties, et c'est assumé : elle épingle la coquille
 * effectivement chargée, quelle qu'elle soit. Oubliée en place, elle peut donc
 * faire afficher le site stable sous un onglet « Fiche Outward beta » — le
 * popup est le seul endroit qui le dise, et c'est à cela que sert son alerte. */
if (typeof browser === "undefined") { var browser = chrome; }
(function () {
  "use strict";
  var SITE_URL = "https://igneefleur.github.io/fns-ttrpg/owd-beta/roll20-fiche.html";   // propre à cette copie

  function mount(url) {
    document.getElementById("owd-remote").src = url + (location.hash || "");
  }
  try {
    // storage.local.get : promesse sur Firefox (V2) comme sur Chrome (V3)
    browser.storage.local.get("owd_sheet_url").then(
      function (r) { mount((r && r.owd_sheet_url) || SITE_URL); },
      function () { mount(SITE_URL); }
    );
  } catch (e) { mount(SITE_URL); }
})();
