/* Coquille générique d'un panneau flottant : elle pointe son iframe vers une
 * page SERVIE PAR LE SITE, dont le nom vient du hash (#p=roll20-narration.html,
 * posé par content-roll20.js). Rien n'est en dur ici que la racine du site : un
 * panneau de plus, ou une refonte de celui-ci, ne coûtera pas de signature.
 *
 * COPIE. Ce fichier existe DEUX FOIS, stable/panneau-shell.js et
 * beta/panneau-shell.js, et une seule des deux est jamais chargée : panneau.html
 * ne le nomme plus, c'est shell-loader.js qui ajoute la balise <script> d'après
 * le mode écrit dans le hash. L'isolation est donc ici RÉELLE, et chaque copie
 * n'a plus qu'une seule racine de site au lieu d'un aiguillage. La ligne qui
 * appartient à cette copie porte un commentaire en bout de ligne ; il n'y en a
 * qu'une, et tout le reste doit rester rigoureusement identique.
 *
 * TOUTE CORRECTION DE SÛRETÉ DOIT ÊTRE APPLIQUÉE AUX DEUX COPIES. sure(), plus
 * bas, est exactement le genre de garde qu'une duplication distraite laisse
 * tomber d'un côté : sans elle, cette coquille devient un iframeur universel,
 * et le trou reste ouvert alors que l'autre copie est saine.
 *
 * Dépannage : browser.storage.local.jjk_site_url remplace la racine du site
 * (ex. http://localhost:8000/FNS-TTRPG-RULES/jjk/ pour un mkdocs serve local),
 * à poser depuis la console de débogage de l'extension. Cette clé reste COMMUNE
 * aux deux parties, comme jjk_sheet_url : elle épingle la coquille effectivement
 * chargée, quelle qu'elle soit. */
if (typeof browser === "undefined") { var browser = chrome; }
(function () {
  "use strict";
  var SITE = "https://igneefleur.github.io/FNS-TTRPG-RULES/@@site@@/";   // propre à cette copie
  var DEFAUT = "roll20-narration.html";

