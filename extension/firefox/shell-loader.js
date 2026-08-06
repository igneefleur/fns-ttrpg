/* Chargeur des coquilles : il choisit stable/ ou beta/ à l'exécution.
 *
 * creator.html et panneau.html sont PARTAGÉES par les deux parties, parce que
 * rien en elles ne dépend du mode : ce sont deux iframes vides. La coquille
 * qu'elles chargent, elle, en dépend, puisque c'est elle qui sait de quel site
 * vient la page distante. Or ces pages nommaient leur coquille dans une balise
 * <script src> écrite en dur, ce qui interdisait tout choix à l'exécution.
 *
 * Une page d'extension ne peut pas porter de script en ligne (CSP script-src
 * 'self', en V2 comme en V3) et l'eval est refusée à la revue Mozilla. Ajouter
 * une balise <script> vers une ressource de l'extension, en revanche, est
 * parfaitement autorisé : c'est ce que fait ce fichier, et rien d'autre.
 *
 * LE MODE ARRIVE DANS LE HASH (« &m=beta »), posé par la copie de
 * content-roll20.js qui a monté l'iframe. Il n'est PAS relu dans le stockage, et
 * c'est le point important : une seconde lecture serait asynchrone, donc une
 * seconde course. On avait déjà de quoi voir l'onglet annoncer « Fiche JJK
 * beta » avec la fiche stable dedans, si l'utilisateur basculait entre les deux
 * lectures. Ici, la copie qui a construit l'adresse dicte la coquille, et il n'y
 * a plus rien à accorder.
 *
 * Tout mode absent ou inconnu vaut stable : une page d'extension ouverte à la
 * main doit montrer la fiche publiée, jamais celle du chantier.
 *
 * Les quatre adresses sont écrites en toutes lettres. Assemblées par
 * concaténation, elles deviendraient invisibles au contrôle de complétude comme
 * à l'analyse statique d'AMO, qui ne savent lire que des littéraux. */
(function () {
  "use strict";
  var COQUILLES = {
    creator: { stable: "stable/creator-shell.js", beta: "beta/creator-shell.js" },
    panneau: { stable: "stable/panneau-shell.js", beta: "beta/panneau-shell.js" }
  };
  // data-coquille dit QUELLE coquille ; le hash dit LAQUELLE DES DEUX. Le repli
  // sur querySelector couvre le cas où document.currentScript manquerait.
  var moi = document.currentScript || document.querySelector("script[data-coquille]");
  var choix = COQUILLES[(moi && moi.getAttribute("data-coquille")) || ""];
  if (!choix) return;   // page inconnue : on ne charge rien plutôt que n'importe quoi

  // LE FOND DE LA COQUILLE, AVANT LA PAGE DISTANTE. Cette page d'extension
  // reste seule à l'écran pendant tout le chargement réseau de la page servie
  // par le site, une bonne seconde le temps du manifeste et des scripts. Son
  // fond était toujours celui du jour : un éclair clair à chaque ouverture de
  // fiche ou de plateau au milieu d'une partie sombre. Le n=1/0 du hash dit
  // déjà de quelle couleur la page distante va se peindre, on prend la sienne
  // avant elle. Ici et pas dans le HTML : une page d'extension ne peut pas
  // porter de script en ligne (CSP script-src 'self', en V2 comme en V3).
  try {
    if (/[#&]n=1/.test(location.hash || "")) document.documentElement.classList.add("night");
  } catch (e) {}

  var mode = /[#&]m=beta(?:&|$)/.test(location.hash || "") ? "beta" : "stable";
  var s = document.createElement("script");
  s.src = choix[mode];
  (document.head || document.documentElement).appendChild(s);
})();
