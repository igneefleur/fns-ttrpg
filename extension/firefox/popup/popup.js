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

  // LES NUMÉROS DES SITES SE LISENT À LA SOURCE, jamais en dur.
  //
  // Ils étaient déclarés dans version.js, donc figés dans le paquet signé. Or un
  // site avance sans qu'on signe quoi que ce soit : le numéro du site stable est
  // devenu faux en moins d'une heure, et il serait resté faux jusqu'à la
  // signature suivante. Le popup va donc les chercher dans les deux manifestes.
  //
  // Aucune permission n'est nécessaire pour cela : GitHub Pages répond
  // « Access-Control-Allow-Origin: * », donc une simple lecture depuis une autre
  // origine passe. Élargir les permissions aurait fait réexaminer l'extension et
  // redemandé leur accord aux joueurs, pour deux nombres d'affichage.
  //
  // Le numéro du PAQUET, lui, vient du manifeste : c'est la seule source qui ne
  // puisse pas se désaccorder de ce que Mozilla a signé.
  var MANIFESTES = {
    stable: "https://igneefleur.github.io/HxH-Regles-JDR/jjk/jjk-manifeste.json",
    beta: "https://igneefleur.github.io/HxH-Regles-JDR/jjk-beta/jjk-manifeste.json"
  };
  var vStable = document.getElementById("p-v-stable");
  var vBeta = document.getElementById("p-v-beta");
  var vPaquet = document.getElementById("p-v-paquet");
  var sites = { stable: null, beta: null };   // null : pas encore su
  try {
    vPaquet.textContent = "extension " + browser.runtime.getManifest().version;
  } catch (e) {}

  // Hors ligne, ou site injoignable : on écrit « ? » plutôt que de laisser une
  // ligne vide, qui se lirait comme une extension cassée. Le popup ne doit
  // jamais attendre le réseau pour s'afficher : la case et le lien sont posés
  // tout de suite, les numéros arrivent après.
  function litSite(quel) {
    var ctrl = null;
    try { ctrl = new AbortController(); setTimeout(function () { ctrl.abort(); }, 4000); }
    catch (e) { ctrl = null; }
    fetch(MANIFESTES[quel], ctrl ? { signal: ctrl.signal, cache: "no-store" }
                                 : { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (m) {
        sites[quel] = (m && typeof m.release === "string") ? m.release : "?";
        rendVersions();
      })
      .catch(function () { sites[quel] = "?"; rendVersions(); });
  }

  function rendVersions() {
    var on = !!(beta && beta.checked);
    vStable.textContent = "site stable " + (sites.stable || "…") + (on ? "" : " (choisi)");
    vBeta.textContent = "site chantier " + (sites.beta || "…") + (on ? " (choisi)" : "");
    vStable.classList.toggle("actif", !on);
    vBeta.classList.toggle("actif", on);
  }
  rendVersions();
  litSite("stable");
  litSite("beta");

  function appliquerMode(on) {
    beta.checked = !!on;
    regles.href = on ? REGLES.beta : REGLES.stable;
    document.body.classList.toggle("beta", !!on);
    // « CHOISI », ET NON « EN SERVICE ». Ce que la case dit, c'est le site qui
    // sera chargé au prochain affichage d'une page Roll20 : les onglets déjà
    // ouverts gardent la partie qu'ils ont montée, puisque les deux copies
    // partagent leurs marqueurs de frame et qu'un second pont d20 dans la même
    // page écrirait tout en double. Annoncer « en service » juste après une
    // bascule était faux pour toutes les fenêtres déjà là.
    rendVersions();
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
