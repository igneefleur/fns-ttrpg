  // ---- Mouvement ----
  // Les pas par round que donne l'ALLURE, choisie ici avec les mêmes cases que
  // l'effort : on peut se déplacer moins vite que l'effort qu'on fournit, les
  // deux ne se confondent donc pas. Endormi, le personnage n'a pas d'allure,
  // donc aucun pas. L'allure lourde se prend par crans, chacun
  // avec son coût en dés d'action et en PE : c'est le seul choix de ce module.
  // Aucune règle n'est écrite ici : les allures, leurs pas et leurs coûts
  // viennent des données (clé « mouvement »).
  function mouvementListe() { var m = D().mouvement; return Array.isArray(m) ? m : []; }
  // l'allure de l'effort courant : « leger » est l'allure « legere », « lourd »
  // la « lourde » ; le sommeil n'en a aucune
  function allureCourante() {
    var e = String(state.allure || ""), out = null;
    if (!e) return null;
    mouvementListe().forEach(function (a) { if (!out && a.cle.indexOf(e) === 0) out = a; });
    return out;
  }
  function num0(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function buildMouvement() {
    var b = block("Mouvement");

    // L'ALLURE, en cases soudées sur deux lignes, comme les efforts du module
    // Effort et Temps : [sommeil | repos], puis [léger | inter | lourd].
    var boutons = [];
    var liste = effortsListe();
    [liste.slice(0, 2), liste.slice(2)].forEach(function (rang) {
      if (!rang.length) return;
      var bloc = el("div", "pc-segs");
      rang.forEach(function (e) {
        var bt = el("button", "c", EFFORT_COURT[e.cle] || e.nom);
        bt.title = e.nom;
        bt.type = "button";
        bt.addEventListener("click", function () { state.allure = e.cle; refresh(); });
        bloc.appendChild(bt);
        boutons.push([bt, e.cle]);
      });
      b.appendChild(bloc);
    });

    // UN TABLEAU DE BORD, dans l'ordre arrêté par l'auteur :
    //   [ pas / round | m / minute | km / heure ]   la grande case d'abord
    //   [ +3 | +6 | +9 | +12 | +15 ]                les crans, en effort lourd
    //   [ DA | PE ]                                 ce que le cran coûte
    // Les cases sont soudées, comme le trio de MIA : la valeur en grand,
    // l'étiquette en petites capitales dessous.
    function cases(cls, defs) {
      var box = el("div", "pc-stat " + cls), out = {};
      defs.forEach(function (d) {
        var c = el("div", "c" + (d[2] ? " " + d[2] : ""));
        var v = el("span", "v", "");
        c.appendChild(v);
        c.appendChild(el("span", "k", d[1]));
        box.appendChild(c);
        out[d[0]] = v;
      });
      b.appendChild(box);
      return { box: box, v: out };
    }
    var dist = cases("pc-mouv-dist", [["pas", "pas / rnd", "grand"], ["min", "m / min"], ["h", "km / h"]]);
    // les crans : foncer, chacun marqué des pas qu'il ajoute à l'allure d'avant
    var crans = el("div", "pc-segs pc-crans");
    b.appendChild(crans);
    var cout = cases("pc-mouv-cout", [["da", "dés d'action"], ["pe", "PE"]]);

    hooks.push(function () {
      boutons.forEach(function (x) { x[0].classList.toggle("on", x[1] === state.allure); });
      var a = allureCourante();
      crans.innerHTML = "";
      var lourd = !!a && a.crans.length > 1;
      crans.style.display = lourd ? "" : "none";
      cout.box.style.display = lourd ? "" : "none";
      var c = { pas: 0, minute: 0, heure: 0, des: 0, pe: 0 };
      if (a) {
        var k = clamp(num(state.allureCran, 1), 1, a.crans.length);
        c = a.crans[k - 1];
        if (lourd) {
          // les pas de l'allure d'avant : le point de départ des crans
          var liste = mouvementListe(), avant = liste[liste.indexOf(a) - 1];
          var base = avant ? avant.crans[avant.crans.length - 1].pas : 0;
          a.crans.forEach(function (x, i) {
            var bt = el("button", "c" + (i + 1 === k ? " on" : ""), "+" + (x.pas - base));
            bt.title = x.des + "DA" + (x.pe ? " · " + x.pe + " PE" : "");
            bt.type = "button";
            bt.addEventListener("click", function () { state.allureCran = i + 1; refresh(); });
            crans.appendChild(bt);
          });
        }
      }
      dist.v.pas.textContent = String(c.pas);
      dist.v.min.textContent = fmtP(num0(c.minute));
      dist.v.h.textContent = fmtP(num0(c.heure));
      cout.v.da.textContent = String(c.des || 0);
      cout.v.pe.textContent = String(c.pe || 0);
    });
    return b;
  }
