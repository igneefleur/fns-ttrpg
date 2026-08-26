  // ---- la machinerie commune aux trois blocs de leviers de l'onglet Options ----
  // TROIS BLOCS PORTENT LA MÊME CHOSE : les caractéristiques, les compétences,
  // les spécialités. Chacun range ses réglages ailleurs — une table à trois
  // niveaux, une table sœur, ou l'objet de la spécialité lui-même — mais le
  // GESTE est identique : une bande d'onglets, une grille par onglet, et sur
  // chaque rangée la chaîne à neuf boîtes.
  //
  // TOUT CECI VIVAIT DANS buildOptCaracs, en fermetures. Trois modules ne
  // peuvent pas partager des fermetures : sans ce fichier, la même centaine de
  // lignes serait recopiée deux fois, et corrigée une fois sur trois. C'est
  // exactement ce qui était arrivé aux champs de saisie, dont l'ancien bloc des
  // compétences portait quatre variantes.

  // ---------- la bande d'onglets ----------
  // Rend { onglet, montre } : le bloc en garde ce qu'il veut. L'ONGLET OUVERT
  // NE S'ENREGISTRE PAS — ce n'est pas un état du personnage, et deux fiches du
  // même personnage n'ont pas à s'ouvrir sur le même réglage. On rouvre sur le
  // premier, comme un rouage d'édition se referme au rechargement.
  function bandeOnglets(bloc) {
    var bande = el("div", "pc-tabs mini");
    var corps = el("div");
    bloc.appendChild(bande);
    bloc.appendChild(corps);
    var pages = [];
    function montre(i) {
      pages.forEach(function (p, j) {
        p.bouton.classList.toggle("on", j === i);
        p.page.classList.toggle("on", j === i);
        // UN SEUL ARRÊT DE TABULATION POUR TOUTE LA BANDE. Cinq boutons
        // focalisables, ce sont cinq tabulations entre le titre du bloc et le
        // premier champ qu'on vient régler : la bande coûterait plus cher à
        // traverser qu'à employer. On entre sur l'onglet ouvert, les flèches
        // font le reste.
        p.bouton.tabIndex = j === i ? 0 : -1;
      });
    }
    function onglet(nom, aide, bati) {
      var i = pages.length;
      // UN BOUTON, ET NON UN DIV. Les onglets de la feuille sont des div et ne
      // s'atteignent qu'à la souris ; les segments de la barre d'envoi sont des
      // boutons, et c'est ce précédent-là qui vaut ici. Le navigateur donne
      // alors le focus, Entrée et Espace sans qu'on écrive une ligne pour ça.
      var bouton = el("button", "pc-tab", nom);
      bouton.type = "button";
      // UNE INFOBULLE SEULEMENT QUAND LE MOT EST ABRÉGÉ, et elle ne dit alors
      // que le mot entier : la fiche ne récite pas les règles.
      if (aide) bouton.title = aide;
      bouton.addEventListener("click", function () { montre(i); });
      bouton.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : (e.key === "ArrowLeft" ? -1 : 0);
        if (!d) return;
        e.preventDefault();
        var j = (i + d + pages.length) % pages.length;
        montre(j);
        pages[j].bouton.focus();
      });
      bande.appendChild(bouton);
      // LE COMPTE PART DANS LE HTML : le CSS ne sait pas compter ses enfants, et
      // c'est lui qui décide comment couper une bande longue en deux rangs.
      bande.setAttribute("data-n", String(pages.length + 1));
      var page = el("div", "pc-souspage");
      bati(page);
      corps.appendChild(page);
      pages.push({ bouton: bouton, page: page });
    }
    return { onglet: onglet, montre: montre };
  }

  // ---------- la grille, son entête, ses rangées ----------
  // LA GRILLE ET SON DÉFILEMENT. Les colonnes d'une grille d'Options ont une
  // largeur en rem, pas en parts : sous une certaine largeur de colonne, elles
  // ne rentrent plus, et c'est voulu — un champ de saisie qui se réduit à deux
  // millimètres ne sert plus à rien. L'enveloppe laisse alors défiler.
  function grilleOpt(hote) {
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    hote.appendChild(wrap);
    return box;
  }
  // UN MOT NUL POSE UN FILET, et non un entête vide : la grille des leviers
  // porte des colonnes d'un pixel qui séparent les groupes, et un entête de
  // texte à leur place décalerait tout d'une colonne.
  function enteteOpt(hote, cls, mots) {
    var head = el("div", "pc-optcomp-row " + cls + " head");
    mots.forEach(function (h) {
      if (!h) { head.appendChild(el("span", "rule")); return; }
      var sp = el("span", h[2] || null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    hote.appendChild(head);
    return head;
  }
  function rangeeOpt(hote, cls, i) {
    var row = el("div", "pc-optcomp-row " + cls + (i % 2 === 1 ? " odd" : ""));
    hote.appendChild(row);
    return row;
  }
  // Une rangée qui se nomme par un SIGLE : caractéristiques et compétences. Le
  // nom entier tient dans l'infobulle — la colonne est trop étroite pour
  // « Détermination ».
  function rangeeSigle(hote, cls, code, i, nom) {
    var row = rangeeOpt(hote, cls, i);
    var nameBox = el("span", "pc-comp-name");
    var chip = el("span", "pc-abbr", code);
    chip.title = nom || code;
    nameBox.appendChild(chip);
    row.appendChild(nameBox);
    return row;
  }
  // Une rangée qui se nomme par un NOM : les spécialités, qui n'ont pas de
  // sigle. Le nom se coupe à l'ellipse et se lit entier en infobulle.
  function rangeeNom(hote, cls, nom, i, titre) {
    var row = rangeeOpt(hote, cls, i);
    var nameBox = el("span", "pc-comp-name");
    var lab = el("span", "pc-comp-label", nom || "Sans nom");
    lab.title = titre || nom || "";
    nameBox.appendChild(lab);
    row.appendChild(nameBox);
    return row;
  }

  // ---------- lire et écrire une boîte, sans rien matérialiser ----------
  // On ne passe PAS par champMod(map, clé, …), qui exige une table existante :
  // l'appeler au montage créerait toutes les sous-tables chez tout personnage
  // qui ouvre simplement les Options, et l'état, qui voyage dans un seul
  // attribut Roll20, s'alourdirait d'objets vides pour rien.
  //
  // Ces fermetures ne créent qu'à l'écriture, et DÉFONT le chemin quand la
  // dernière valeur s'en va.
  function boitesTable(nomTable) {
    return {
      lire: function (nom, cle) {
        return function (boite) {
          var t = state[nomTable] && state[nomTable][nom];
          var tb = t && t[boite];
          var v = tb && tb[cle];
          return (typeof v === "number" && isFinite(v)) ? v : undefined;
        };
      },
      ecrire: function (nom, boite, cle, v) {
        if (!state[nomTable] || typeof state[nomTable] !== "object") state[nomTable] = {};
        var lv = state[nomTable];
        if (v === undefined || v === null) {
          if (!lv[nom] || !lv[nom][boite]) return;
          delete lv[nom][boite][cle];
          if (!Object.keys(lv[nom][boite]).length) delete lv[nom][boite];
          if (!Object.keys(lv[nom]).length) delete lv[nom];
          return;
        }
        if (!lv[nom]) lv[nom] = {};
        if (!lv[nom][boite]) lv[nom][boite] = {};
        lv[nom][boite][cle] = v;
      }
    };
  }
  // LA SPÉCIALITÉ SE PREND VIVANTE, jamais capturée au montage : la liste bouge
  // sous la ligne (ajout, suppression, glissement), et une référence figée
  // écrirait dans un objet que l'état ne porte plus.
  function boitesSpe() {
    return {
      lire: function (nom, vivante) {
        return function (boite) {
          var s = vivante();
          var l = s && s.leviers && s.leviers[nom];
          var v = l && l[boite];
          return (typeof v === "number" && isFinite(v)) ? v : undefined;
        };
      },
      ecrire: function (nom, boite, vivante, v) {
        var s = vivante();
        if (!s) return;
        if (v === undefined || v === null) {
          if (!s.leviers || !s.leviers[nom]) return;
          delete s.leviers[nom][boite];
          if (!Object.keys(s.leviers[nom]).length) delete s.leviers[nom];
          if (!Object.keys(s.leviers).length) delete s.leviers;
          return;
        }
        if (!s.leviers) s.leviers = {};
        if (!s.leviers[nom]) s.leviers[nom] = {};
        s.leviers[nom][boite] = v;
      }
    };
  }

  // ---------- ce qui compte comme « réglé », et ce que la chaîne a fait ----------
  // UNE BOÎTE QUI NE CHANGE RIEN NE COMPTE PAS : un ajout de zéro et un facteur
  // de un sont le NEUTRE de leur opération. Un forçage, si — forcer une valeur
  // à zéro est un réglage, et le seul moyen d'obtenir zéro à coup sûr.
  var BOITES_LEV = [["force", null], ["a1", 0], ["a2", 0], ["m1", 1], ["m2", 1],
                    ["a3", 0], ["a4", 0], ["m3", 1], ["m4", 1]];
  function levierRegleDe(lire) {
    for (var i = 0; i < BOITES_LEV.length; i++) {
      var v = lire(BOITES_LEV[i][0]);
      if (v === undefined) continue;
      if (BOITES_LEV[i][1] !== null && v === BOITES_LEV[i][1]) continue;
      return true;
    }
    return false;
  }
  // CE QUE LA CHAÎNE A FAIT, RELU DANS L'ORDRE : la base d'abord, puis chaque
  // boîte réglée. C'est l'infobulle du dernier nombre, et la seule façon
  // honnête de dire d'où il sort — une phrase écrite d'avance mentirait dès
  // qu'un facteur est posé.
  function chaineTexteDe(lire, motBase, base) {
    var f = lire("force");
    if (f !== undefined) return "Forcé à " + f;
    var out = motBase + " " + base;
    [["a1", " · ", 0], ["a2", " · ", 0], ["m1", " · ×", 1], ["m2", " · ×", 1],
     ["a3", " · ", 0], ["a4", " · ", 0], ["m3", " · ×", 1], ["m4", " · ×", 1]]
      .forEach(function (d) {
        var v = lire(d[0]);
        // le neutre ne se dit pas : « de la table 400 · +0 » se lit deux fois
        // avant de vouloir dire qu'il ne s'est rien passé
        if (v === undefined || v === d[2]) return;
        out += d[1] + (d[0].charAt(0) === "m" ? v : sign(v));
      });
    return out;
  }

  // ---------- LA GRILLE D'UN LEVIER ----------
  // Les onglets des trois blocs l'appellent, et ne diffèrent que par ce qu'ils
  // lui passent.
  //
  // LES ENTÊTES DES HUIT CHAMPS SONT DES SIGNES, et il n'y a pas d'alternative
  // honnête : la colonne fait 1,25 rem, aucun mot n'y tient, et deux « MODIF. »
  // de suite ne diraient pas lequel vient avant l'autre. « ＋ » et « × » disent
  // ce que la case CONTIENT ; « avant » et « après » diraient où elle tombe
  // dans un calcul, c'est-à-dire la règle, qui n'a pas sa place ici.
  //
  // opts :
  //   cls     la classe de grille ("levier")
  //   lignes  [{ cle, nom, titre }] — ce qui va en colonne de gauche
  //   rangee  (hote, cls, ligne, i) -> l'élément de rangée
  //   lire    (cle) -> (boîte) -> nombre|undefined
  //   ecrire  (cle, boîte, v) ; v undefined DÉFAIT le chemin
  //   mot     [libellé, infobulle] de la dernière colonne
  //   borne   999 ou 9999, l'échelle des ajouts
  //   auto    (cle) -> le filigrane du champ forcé
  //   rendu   (cle) -> { texte, titre, zero }
  //   reg     le registre de rafraîchissement où pousser
  function grilleLevier(page, opts) {
    var box = grilleOpt(page);
    var reg = opts.reg || hooks;
    enteteOpt(box, opts.cls, [
      opts.entete || ["Nom", "Ce que la rangée règle"],
      ["Forcé", "Valeur imposée — vide = valeur calculée", "fo"],
      ["＋", "Deux nombres qui s'ajoutent avant les facteurs", "duo op"],
      null,
      ["×", "Deux facteurs — vide = ×1", "duo op"],
      null,
      ["＋", "Deux nombres qui s'ajoutent après les premiers facteurs", "duo op"],
      null,
      ["×", "Deux facteurs de plus — vide = ×1", "duo op"],
      opts.mot
    ]);
    opts.lignes.forEach(function (ligne, i) {
      var cle = ligne.cle;
      var lire = opts.lire(cle);
      var row = opts.rangee(box, opts.cls, ligne, i);
      row.appendChild(champForceVal(
        function () { return lire("force"); },
        function (v) { opts.ecrire(cle, "force", v); },
        function () { return opts.auto(cle); },
        "Valeur imposée — vide = valeur calculée.", reg));
      ["a1", "a2"].forEach(function (bx) { row.appendChild(ajout(bx)); });
      row.appendChild(el("span", "rule"));
      ["m1", "m2"].forEach(function (bx) { row.appendChild(facteur(bx)); });
      row.appendChild(el("span", "rule"));
      ["a3", "a4"].forEach(function (bx) { row.appendChild(ajout(bx)); });
      row.appendChild(el("span", "rule"));
      ["m3", "m4"].forEach(function (bx) { row.appendChild(facteur(bx)); });
      var out = el("span", "pc-comp-total", "");
      row.appendChild(out);
      reg.push(function () {
        var r = opts.rendu(cle);
        var regle = levierRegleDe(opts.lire(cle));
        out.textContent = r.texte;
        out.classList.toggle("adj", regle);
        if (r.zero !== undefined) out.classList.toggle("zero", r.zero);
        out.title = r.titre;
        row.classList.toggle("on", regle);
      });
      function ajout(bx) {
        return champModVal(
          function () { return opts.lire(cle)(bx); },
          function (v) { opts.ecrire(cle, bx, v ? v : undefined); }, opts.borne,
          "Nombre qui s'ajoute — vide = aucun.", reg);
      }
      function facteur(bx) {
        return champMultVal(
          function () { return opts.lire(cle)(bx); },
          function (v) { opts.ecrire(cle, bx, v); },
          "Facteur — vide = ×1.", reg);
      }
    });
  }
