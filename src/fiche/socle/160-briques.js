  // ---------- briques ----------
  function fld(labelTxt, input, span) {
    var w = el("div", "pc-f" + (span ? " " + span : ""));
    w.appendChild(el("label", null, labelTxt));
    w.appendChild(input);
    return w;
  }
  // reg : registre de rafraîchissement (le courant par défaut ; un module qui
  // fabrique un champ APRÈS son montage passe le sien, sinon sa fonction
  // atterrirait chez le voisin et échapperait à sa muselière).
  function textInput(get, set, placeholder, reg) {
    var i = el("input");
    i.type = "text";
    if (placeholder) i.placeholder = placeholder;
    i.value = get() || "";
    i.addEventListener("input", function () { set(i.value); refresh(); });
    (reg || hooks).push(function () { if (document.activeElement !== i) i.value = get() || ""; });
    return i;
  }
  function miniBtn(txt, title, fn, cls) {
    var b = el("button", "pc-mini" + (cls ? " " + cls : ""), txt);
    b.type = "button";
    if (title) b.title = title;
    b.addEventListener("click", fn);
    return b;
  }
  function stepBtn(txt, title, fn) {
    var b = el("button", null, txt);
    b.type = "button";
    if (title) b.title = title;
    b.addEventListener("click", fn);
    return b;
  }
  // stepper −/champ/+ : le champ du milieu est éditable (pc-num).
  // reg : registre de rafraîchissement (hooks par défaut ; optHooks pour le
  // bloc rebâtissable des modificateurs de compétences).
  function stepper(get, set, step, title, reg) {
    var w = el("span", "pc-step");
    w.appendChild(stepBtn("−", title ? "− " + step : null, function () { set(get() - step); refresh(); }));
    var i = el("input", "pc-num");
    i.type = "number";
    i.value = get();
    i.addEventListener("input", function () {
      var v = parseInt(i.value, 10);
      if (isFinite(v)) { set(v); refresh(); }
    });
    (reg || hooks).push(function () { if (document.activeElement !== i) i.value = get(); });
    w.appendChild(i);
    w.appendChild(stepBtn("+", title ? "+ " + step : null, function () { set(get() + step); refresh(); }));
    return w;
  }
  // ---------- les cases d'un bloc de nombres ----------
  // TROIS FORMES, UNE SEULE BOÎTE. Les trois listes de la fiche s'en servent :
  // sans cela leurs lignes n'auraient pas la même hauteur, et la ligne changerait
  // d'épaisseur en ouvrant le rouage.
  //
  // caseTexte   un nombre, rien d'autre
  // caseDouble  deux nombres, un par mode — la feuille n'en montre qu'un
  // caseSaisie  un TEXTE en jouant, un CHAMP sous le rouage. Les deux, et pas
  //             seulement le champ : un champ de type nombre ne sait pas écrire
  //             « +25 » et porte des compteurs que Roll20 n'a nulle part.
  function caseVide(hote, cls) {
    var c = el("span", "c" + (cls ? " " + cls : ""));
    hote.appendChild(c);
    return c;
  }
  function caseTexte(hote, cls) {
    var c = caseVide(hote, cls);
    var v = el("span", "v", "");
    c.appendChild(v);
    return v;
  }
  function caseDouble(hote, cls) {
    var c = caseVide(hote, cls);
    var a = el("span", "v pc-jeu-only", "");
    var b = el("span", "v pc-edit-only", "");
    c.appendChild(a); c.appendChild(b);
    return [a, b];
  }
  // Le champ ne se réécrit JAMAIS sous les doigts : tant qu'il a le focus, ce
  // qu'on tape y reste tel quel.
  function caseSaisie(hote, lire, ecrire, aide, reg) {
    var c = caseVide(hote, "reglable");
    var t = el("span", "v pc-jeu-only", "");
    var i = el("input", "v pc-edit-only pc-case-champ pc-edit-field");
    i.type = "number"; i.step = "1";
    i.title = aide;
    i.addEventListener("input", function () {
      var v = parseInt(i.value, 10);
      if (isFinite(v)) { ecrire(v); refresh(); }
    });
    (reg || hooks).push(function () {
      if (document.activeElement !== i) i.value = lire();
    });
    c.appendChild(t);
    c.appendChild(i);
    return { txt: t, champ: i };
  }

  // trois petits champs ± (équipement / art / décision du MJ), sommés dans la
  // valeur effective ; discrets, révélés au survol de l'hôte (.pc-mods-host).
  var MMOD_SLOTS = ["équipement", "art", "autre"];
  function multiMod(map, key) {
    var wrap = el("span", "pc-mmods");
    function arr() {
      if (!map[key]) map[key] = [0, 0, 0];
      return map[key];
    }
    for (var i = 0; i < MMOD_SLOTS.length; i++) (function (i) {
      var inp = el("input", "pc-mmod");
      inp.type = "number"; inp.step = "any"; inp.placeholder = "0";
      inp.title = "Bonus ou malus divers (" + MMOD_SLOTS[i] + ") — emplacement " +
                  (i + 1) + " sur " + MMOD_SLOTS.length + " ; les modificateurs s'additionnent.";
      var v0 = map[key] ? map[key][i] : 0;
      inp.value = v0 ? v0 : "";
      inp.classList.toggle("neg", v0 < 0);
      inp.addEventListener("input", function () {
        var n = parseFloat(String(inp.value).replace(",", "."));
        arr()[i] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -999, 999) : 0;
        inp.classList.toggle("neg", arr()[i] < 0);
        refresh();
      });
      hooks.push(function () {
        if (document.activeElement !== inp) {
          var v = map[key] ? map[key][i] : 0;
          inp.value = v ? v : "";
          inp.classList.toggle("neg", v < 0);
        }
      });
      wrap.appendChild(inp);
    })(i);
    return wrap;
  }
