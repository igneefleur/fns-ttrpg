  // ---- Mouvement ----
  // L'allure que prend le personnage, et le nombre de pas qu'elle lui donne
  // par round. L'allure lourde se prend par crans, chacun avec son coût en
  // dés d'action et en PE. Aucune règle n'est écrite ici : les allures, leurs
  // pas et leurs coûts viennent des données (clé « mouvement »).
  function mouvementListe() { var m = D().mouvement; return Array.isArray(m) ? m : []; }
  function allureDe(cle) {
    var out = null;
    mouvementListe().forEach(function (a) { if (a.cle === cle) out = a; });
    return out || mouvementListe()[0] || null;
  }
  function buildMouvement() {
    var b = block("Mouvement");

    // les allures, un bouton chacune, dans l'ordre des règles
    var bande = el("div", "pc-tabs mini pc-efforts");
    var boutons = [];
    mouvementListe().forEach(function (a) {
      var bt = el("button", "pc-tab", capFirst(a.nom));
      bt.type = "button";
      bt.addEventListener("click", function () { state.allure = a.cle; refresh(); });
      bande.appendChild(bt);
      boutons.push([bt, a.cle]);
    });
    b.appendChild(bande);

    // les crans, pour l'allure qui en a plusieurs
    var crans = el("div", "pc-tabs mini pc-efforts pc-crans");
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
      var a = allureDe(state.allure);
      boutons.forEach(function (x) { x[0].classList.toggle("on", a && x[1] === a.cle); });
      crans.innerHTML = "";
      if (!a) { pas.textContent = "—"; cout.textContent = ""; return; }
      var k = clamp(num(state.allureCran, 1), 1, a.crans.length);
      if (a.crans.length > 1) {
        a.crans.forEach(function (c, i) {
          var bt = el("button", "pc-tab" + (i + 1 === k ? " on" : ""), libCout(c) || String(i + 1));
          bt.type = "button";
          bt.addEventListener("click", function () { state.allureCran = i + 1; refresh(); });
          crans.appendChild(bt);
        });
      }
      crans.style.display = a.crans.length > 1 ? "" : "none";
      var c = a.crans[k - 1];
      pas.textContent = String(c.pas);
      cout.textContent = libCout(c) ? "coût : " + libCout(c) : "";
    });
    return b;
  }
