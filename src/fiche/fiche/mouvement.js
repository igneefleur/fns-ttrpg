  // ---- Mouvement ----
  // Les pas par round que donne l'EFFORT choisi dans le module Temps : l'effort
  // y est l'allure, on ne la choisit pas deux fois. Endormi, le personnage n'a
  // pas d'allure, donc aucun pas. L'allure lourde se prend par crans, chacun
  // avec son coût en dés d'action et en PE : c'est le seul choix de ce module.
  // Aucune règle n'est écrite ici : les allures, leurs pas et leurs coûts
  // viennent des données (clé « mouvement »).
  function mouvementListe() { var m = D().mouvement; return Array.isArray(m) ? m : []; }
  // l'allure de l'effort courant : « leger » est l'allure « legere », « lourd »
  // la « lourde » ; le sommeil n'en a aucune
  function allureCourante() {
    var e = String(state.effort || ""), out = null;
    if (!e) return null;
    mouvementListe().forEach(function (a) { if (!out && a.cle.indexOf(e) === 0) out = a; });
    return out;
  }
  function buildMouvement() {
    var b = block("Mouvement");

    // LES CRANS, pour l'allure qui en a plusieurs : foncer. Mêmes cases
    // soudées que les efforts, en parts égales, chacune marquée des pas
    // qu'elle ajoute à l'allure d'avant (+3 | +6 | +9 | +12 | +15).
    var crans = el("div", "pc-segs pc-crans");
    b.appendChild(crans);

    var aff = el("div", "pc-mouv");
    var pas = el("b");
    aff.appendChild(pas);
    aff.appendChild(el("span", "u", "pas par round"));
    var cout = el("span", "cout");
    aff.appendChild(cout);
    b.appendChild(aff);

    function libCout(c) {
      var t = [];
      if (c.des) t.push(c.des + " dé" + (c.des > 1 ? "s" : ""));
      if (c.pe) t.push(c.pe + " PE");
      return t.join(" · ");
    }
    hooks.push(function () {
      var a = allureCourante();
      crans.innerHTML = "";
      crans.style.display = a && a.crans.length > 1 ? "" : "none";
      if (!a) { pas.textContent = "0"; cout.textContent = ""; return; }
      var k = clamp(num(state.allureCran, 1), 1, a.crans.length);
      if (a.crans.length > 1) {
        // les pas de l'allure d'avant : le point de départ des crans
        var liste = mouvementListe(), avant = liste[liste.indexOf(a) - 1];
        var base = avant ? avant.crans[avant.crans.length - 1].pas : 0;
        a.crans.forEach(function (c, i) {
          var bt = el("button", "c" + (i + 1 === k ? " on" : ""), "+" + (c.pas - base));
          bt.title = libCout(c);
          bt.type = "button";
          bt.addEventListener("click", function () { state.allureCran = i + 1; refresh(); });
          crans.appendChild(bt);
        });
      }
      var c = a.crans[k - 1];
      pas.textContent = String(c.pas);
      cout.textContent = libCout(c) ? "coût : " + libCout(c) : "";
    });
    return b;
  }
