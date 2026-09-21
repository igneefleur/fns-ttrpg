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
  function num0(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function buildMouvement() {
    var b = block("Mouvement");

    // LES CRANS, pour l'allure qui en a plusieurs : foncer. Mêmes cases
    // soudées que les efforts, en parts égales, chacune marquée des pas
    // qu'elle ajoute à l'allure d'avant (+3 | +6 | +9 | +12 | +15).
    // Dans l'ordre arrêté par l'auteur : la valeur et « pas / round », la
    // distance par minute et par heure (comme les tables du livre), puis les
    // crans, puis leur coût.
    var aff = el("div", "pc-mouv");
    var pas = el("b");
    aff.appendChild(pas);
    aff.appendChild(el("span", "u", "pas / round"));
    b.appendChild(aff);
    var dist = el("div", "pc-mouv-dist");
    b.appendChild(dist);
    var crans = el("div", "pc-segs pc-crans");
    b.appendChild(crans);
    var cout = el("div", "pc-mouv-cout");
    b.appendChild(cout);

    function libCout(c) {
      var t = [];
      if (c.des) t.push(c.des + "DA");   // dés d'action
      if (c.pe) t.push(c.pe + " PE");
      return t.join(" · ");
    }
    hooks.push(function () {
      var a = allureCourante();
      crans.innerHTML = "";
      crans.style.display = a && a.crans.length > 1 ? "" : "none";
      if (!a) { pas.textContent = "0"; cout.textContent = ""; dist.textContent = "0 m / minute · 0 km / heure"; return; }
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
      dist.textContent = fmtP(num0(c.minute)) + " m / minute · " + fmtP(num0(c.heure)) + " km / heure";
      cout.textContent = libCout(c) ? "coût : " + libCout(c) : "";
    });
    return b;
  }
