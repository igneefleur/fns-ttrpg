// Cartes d'armes : dessine, sous chaque arme, la carte hexagonale de sa portée.
//
// La source de vérité est l'attribut data-cases de la carte, qui reprend
// exactement la ligne de l'arme dans la table des portées : six valeurs séparées
// par des virgules, une par anneau, de la case 0 à la case 5.
//
//   "2,1,0,,,"     épée d'armes : +2 au contact, +1 à une case, idéale à deux
//   "0,0,,,,"      couteau : aucune dégradation, rien au-delà d'une case
//   "x,4,3,2,1,0"  pique : inutilisable au contact, idéale à cinq cases
//
// Une valeur vide signifie hors d'atteinte, « x » signifie trop près pour servir.
// Le rendu est purement décoratif : les caractéristiques de l'arme sont dans le
// HTML de la carte et restent lisibles sans JavaScript.
(function () {
  "use strict";

  var RAYON_CASE = 10;   // rayon du cercle circonscrit d'un hexagone, en unités SVG
  var PORTEE_MAX = 5;    // rayon de la carte, en cases
  var SQ3 = Math.sqrt(3);

  // Hexagone « pointe en haut » : le premier sommet est à midi.
  function sommets(cx, cy, r) {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI / 180) * (60 * i - 90);
      pts.push((cx + r * Math.cos(a)).toFixed(2) + "," + (cy + r * Math.sin(a)).toFixed(2));
    }
    return pts.join(" ");
  }

  // Distance en cases entre l'origine et (q, r), en coordonnées axiales.
  function distance(q, r) {
    return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
  }

  function classeEtLibelle(valeur) {
    if (valeur === "x" || valeur === "X") return { classe: "hx-x", texte: "×" };
    if (valeur === "") return { classe: "hx-off", texte: "" };
    var n = parseInt(valeur, 10);
    if (isNaN(n)) return { classe: "hx-off", texte: "" };
    if (n === 0) return { classe: "hx-0", texte: "0" };
    return { classe: "hx-" + Math.min(n, 4), texte: "+" + n };
  }

  function dessiner(carte) {
    var brut = carte.getAttribute("data-cases");
    if (!brut) return;
    var cases = brut.split(",");

    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    var largeur = RAYON_CASE * SQ3 * (PORTEE_MAX + 0.5);
    var hauteur = RAYON_CASE * (1.5 * PORTEE_MAX + 1);
    svg.setAttribute("viewBox", (-largeur).toFixed(1) + " " + (-hauteur).toFixed(1) +
                                " " + (2 * largeur).toFixed(1) + " " + (2 * hauteur).toFixed(1));
    svg.setAttribute("class", "arme-carte");
    svg.setAttribute("role", "img");

    var nom = carte.querySelector(".arme-nom");
    svg.setAttribute("aria-label", "Carte des portées" + (nom ? " de : " + nom.textContent : ""));

    for (var q = -PORTEE_MAX; q <= PORTEE_MAX; q++) {
      for (var r = -PORTEE_MAX; r <= PORTEE_MAX; r++) {
        var d = distance(q, r);
        if (d > PORTEE_MAX) continue;

        var etat = classeEtLibelle((cases[d] || "").trim());
        var cx = RAYON_CASE * SQ3 * (q + r / 2);
        var cy = RAYON_CASE * 1.5 * r;

        var g = document.createElementNS(svgNS, "g");
        g.setAttribute("class", "hx " + etat.classe);

        var poly = document.createElementNS(svgNS, "polygon");
        poly.setAttribute("points", sommets(cx, cy, RAYON_CASE - 0.6));
        g.appendChild(poly);

        if (etat.texte) {
          var t = document.createElementNS(svgNS, "text");
          t.setAttribute("x", cx.toFixed(2));
          t.setAttribute("y", cy.toFixed(2));
          t.setAttribute("dy", "0.34em");
          t.textContent = etat.texte;
          g.appendChild(t);
        }
        svg.appendChild(g);
      }
    }

    var hote = carte.querySelector(".arme-map");
    if (hote) hote.appendChild(svg);
    carte.setAttribute("data-dessinee", "1");
  }

  function init() {
    var cartes = document.querySelectorAll(".arme[data-cases]:not([data-dessinee])");
    if (!cartes.length) return;

    // Soixante-quatre cartes de quatre-vingt-onze hexagones font beaucoup de
    // noeuds SVG : on ne dessine une carte qu'à son entrée dans la fenêtre.
    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(cartes, dessiner);
      return;
    }
    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (e.isIntersecting) {
          dessiner(e.target);
          obs.unobserve(e.target);
        }
      });
    }, { rootMargin: "300px" });
    Array.prototype.forEach.call(cartes, function (c) { obs.observe(c); });
  }

  // Material navigue en SPA (navigation.instant) : on redessine à chaque page.
  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
