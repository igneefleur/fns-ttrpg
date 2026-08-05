/* Panneau de l'extension, au strict nécessaire : un lien vers les règles,
 * l'interrupteur du mode beta, celui du plateau de Narration, et les numéros de
 * version. (L'ancienne liste des fiches synchronisées a été retirée : la fiche
 * vit dans le personnage Roll20, pas ici.)
 *
 * PARTAGÉ par les deux parties, et il doit le rester : c'est le poste
 * d'aiguillage, le seul endroit qui ÉCRIVE jjkBeta. Le dédoubler donnerait deux
 * interrupteurs pour un seul réglage. */
// compat : Chrome expose `chrome.*`, Firefox `browser.*` (les deux rendent des promesses).
if (typeof browser === "undefined") { var browser = chrome; }
(function () {
  "use strict";

  // Mode beta : la fiche affichée dans Roll20 vient du site de chantier.
  // L'extension porte les DEUX parties, stable/ et beta/, et cette case est le
  // seul aiguillage : elle écrit jjkBeta, que chaque copie relit au chargement
  // d'une page Roll20 pour savoir si elle doit vivre ou se taire. Le lien des
  // règles suit, et l'onglet Roll20 s'annonce « Fiche JJK beta ».
  //
  // La bascule ne prend effet qu'au RECHARGEMENT de la page Roll20, et c'est
  // dit à l'utilisateur : la copie déjà réveillée garde son onglet, ses
  // écouteurs et son panneau, et le pont d20 déjà posé dans le monde principal
  // n'est pas démontable. Rien dans le code ne sait se retirer.
  var REGLES = {
    stable: "https://igneefleur.github.io/HxH-Regles-JDR/jjk/content/regles/",
    beta: "https://igneefleur.github.io/HxH-Regles-JDR/jjk-beta/content/regles/"
  };
  var beta = document.getElementById("p-beta");
  var regles = document.getElementById("p-regles");

  // Les deux numéros du projet, déclarés dans version.js (partagé), plus celui
  // du paquet signé, que seul le manifeste connaît. runtime.getManifest() évite
  // de le recopier à la main : il ne se désaccordera jamais.
  var vStable = document.getElementById("p-v-stable");
  var vBeta = document.getElementById("p-v-beta");
  var vPaquet = document.getElementById("p-v-paquet");
  try {
    vPaquet.textContent = "paquet signé " + browser.runtime.getManifest().version;
  } catch (e) {}

  function appliquerMode(on) {
    beta.checked = !!on;
    regles.href = on ? REGLES.beta : REGLES.stable;
    document.body.classList.toggle("beta", !!on);
    // « CHOISIE », ET NON « EN SERVICE ». Ce que la case dit, c'est ce qui sera
    // chargé au prochain affichage d'une page Roll20 : les onglets déjà ouverts
    // gardent la partie qu'ils ont montée, puisque les deux copies partagent
    // leurs marqueurs de frame et qu'un second pont d20 dans la même page
    // écrirait tout en double. Annoncer « en service » juste après une bascule
    // était donc faux pour toutes les fenêtres déjà là, et personne n'avait de
    // quoi s'en apercevoir.
    var v = (typeof VERSIONS !== "undefined" && VERSIONS) || { stable: "?", beta: "?" };
    vStable.textContent = "stable " + v.stable + (on ? "" : " (choisie)");
    vBeta.textContent = "beta " + v.beta + (on ? " (choisie)" : "");
    vStable.classList.toggle("actif", !on);
    vBeta.classList.toggle("actif", !!on);
  }

  browser.storage.local.get("jjkBeta").then(
    function (r) { appliquerMode(r && r.jjkBeta); },
    function () { appliquerMode(false); }
  );
  beta.addEventListener("change", function () {
    var on = beta.checked;
    browser.storage.local.set({ jjkBeta: on }).then(function () { appliquerMode(on); });
  });

  // Plateau de Narration : le panneau flottant posé dans la partie. Allumé tant
  // qu'on ne l'a pas éteint (clé absente = allumé) — une partie Roll20 qui n'a
  // rien à voir avec JJK doit pouvoir s'en débarrasser sans désinstaller.
  var panneau = document.getElementById("p-panneau");
  browser.storage.local.get("jjkPanneauActif").then(
    function (r) { panneau.checked = !(r && r.jjkPanneauActif === false); },
    function () { panneau.checked = true; }
  );
  panneau.addEventListener("change", function () {
    browser.storage.local.set({ jjkPanneauActif: panneau.checked });
  });
})();
