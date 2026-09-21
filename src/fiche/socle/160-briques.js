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
    // le champ ne se réécrit JAMAIS pendant la frappe : c'est le motif de tous
    // les champs du fichier
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
  // stepper −/champ/+ : le champ du milieu reste saisissable au point près, ce
  // qui compte sur les grands nombres d'Outward (1600 points de satiété ne se
  // remontent pas de 10 en 10 à la main).
  function stepper(get, set, step, title, reg) {
    var w = el("span", "pc-step");
    w.appendChild(stepBtn("−", title ? "− " + step + (title === true ? "" : " (" + title + ")") : null,
      function () { set(get() - step); refresh(); }));
    var i = el("input", "pc-num");
    i.type = "number";
    i.step = String(step);
    i.value = get();
    i.addEventListener("input", function () {
      var v = parseFloat(String(i.value).replace(",", "."));
      if (isFinite(v)) { set(v); refresh(); }
    });
    (reg || hooks).push(function () { if (document.activeElement !== i) i.value = get(); });
    w.appendChild(i);
    w.appendChild(stepBtn("+", title ? "+ " + step + (title === true ? "" : " (" + title + ")") : null,
      function () { set(get() + step); refresh(); }));
    return w;
  }
  // trois petits champs ± (équipement / technique / décision du MJ), sommés
  // dans la valeur effective ; discrets, révélés au survol de l'hôte
  // (.pc-mods-host).
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
  // ---------- écrire dans une boîte de la chaîne ----------
  // Le pendant des trois lecteurs (lireCarac, lireCap, lireComp) : ces deux-là
  // ÉCRIVENT, et ils ne créent rien tant qu'on ne leur donne rien. Le chemin se
  // DÉFAIT quand sa dernière valeur s'en va — sans quoi ouvrir un rouage
  // écrirait trois sous-tables vides dans un personnage qui voyage dans UN
  // attribut Roll20.
  function ecrireBoite(nomTable, levier, boite, cle, v) {
    if (!state[nomTable] || typeof state[nomTable] !== "object") state[nomTable] = {};
    var lv = state[nomTable];
    if (v === undefined || v === null) {
      if (!lv[levier] || !lv[levier][boite]) return;
      delete lv[levier][boite][cle];
      if (!Object.keys(lv[levier][boite]).length) delete lv[levier][boite];
      if (!Object.keys(lv[levier]).length) delete lv[levier];
      return;
    }
    if (!lv[levier]) lv[levier] = {};
    if (!lv[levier][boite]) lv[levier][boite] = {};
    lv[levier][boite][cle] = v;
  }
  // Le champ « Forcé » d'une valeur : vide = valeur CALCULÉE (le filigrane la
  // montre), une valeur la FORCE. Zéro est une valeur, et c'est le seul moyen
  // d'obtenir zéro à coup sûr.
  function champForceBoite(nomTable, levier, cle, auto, titre, reg) {
    var lire = lireTable(nomTable, levier, cle);
    var inp = el("input", "force");
    inp.type = "number"; inp.step = "any";
    inp.title = titre || "Vide = valeur calculée ; une valeur la force.";
    inp.addEventListener("input", function () {
      var v = parseFloat(String(inp.value).replace(",", "."));
      ecrireBoite(nomTable, levier, "force", cle,
                  isFinite(v) ? clamp(Math.round(v * 100) / 100, -99999, 99999) : undefined);
      refresh();
    });
    (reg || hooks).push(function () {
      inp.placeholder = fmtP(auto());
      var cur = lire("force");
      if (document.activeElement !== inp) inp.value = cur === undefined ? "" : cur;
    });
    return inp;
  }
  // Les trois emplacements de modificateur, fantômes au repos : ils écrivent
  // dans les trois PREMIERS ajouts de la chaîne. Le quatrième et les quatre
  // facteurs ne se règlent qu'en Options — la fiche ne porte que le geste
  // courant, le tableau de bord complet est ailleurs.
  var MMOD_BOITES = ["a1", "a2", "a3"];
  function multiModBoite(nomTable, levier, cle, reg) {
    var wrap = el("span", "pc-mmods");
    for (var i = 0; i < MMOD_BOITES.length; i++) (function (i) {
      var boite = MMOD_BOITES[i];
      var lire = lireTable(nomTable, levier, cle);
      var inp = el("input", "pc-mmod");
      inp.type = "number"; inp.step = "any"; inp.placeholder = "0";
      inp.title = "Bonus ou malus divers (" + MMOD_SLOTS[i] + ") — emplacement " +
                  (i + 1) + " sur " + MMOD_SLOTS.length + " ; les modificateurs s'additionnent.";
      inp.addEventListener("input", function () {
        var n = parseFloat(String(inp.value).replace(",", "."));
        ecrireBoite(nomTable, levier, boite, cle,
                    isFinite(n) && n !== 0 ? clamp(Math.round(n * 100) / 100, -9999, 9999) : undefined);
        inp.classList.toggle("neg", n < 0);
        refresh();
      });
      (reg || hooks).push(function () {
        var v = lire(boite);
        if (document.activeElement !== inp) {
          inp.value = v === undefined ? "" : v;
          inp.classList.toggle("neg", v !== undefined && v < 0);
        }
      });
      wrap.appendChild(inp);
    })(i);
    return wrap;
  }

  function multiMod(map, key, reg) {
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
        arr()[i] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -9999, 9999) : 0;
        inp.classList.toggle("neg", arr()[i] < 0);
        refresh();
      });
      (reg || hooks).push(function () {
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

