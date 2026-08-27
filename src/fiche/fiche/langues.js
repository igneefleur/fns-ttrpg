  // ---------- les langues ----------
  // UNE LANGUE EST UNE SPÉCIALITÉ « PASSIVE », et le mot dit exactement ce qui
  // la sépare des autres : ON N'AJOUTE PAS LE MODIFICATEUR de sa
  // caractéristique. Une spécialité ordinaire vaut ses points PLUS le MOD de sa
  // caractéristique PLUS les points de sa compétence ; une langue ne vaut que
  // ses points. Elle ne se lance pas contre une difficulté, elle se possède.
  //
  // ELLE RELÈVE DE MEN, ET DE RIEN D'AUTRE : aucune compétence. Mais elle
  // RESPECTE LA LIMITE de MEN — c'est le seul emprunt qu'elle lui fait, et il
  // suffit à la borner.
  //
  // TROIS NIVEAUX, LUS SUR LE TOTAL. Ce ne sont pas trois cases à cocher : le
  // niveau se DÉDUIT de ce qu'on a mis dedans, comme le MOD se déduit d'une
  // valeur. On ne le règle donc nulle part.
  function buildLangues() {
    var b = block("Langues", null, "langues");

    // l'entête des trois colonnes, du même squelette que le trio des lignes :
    // c'est ce qui garantit que chaque mot tombe en face de sa colonne
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "sp"));
    var teteTrio = el("span", "pc-trio tete");
    // LA PREMIÈRE CASE CHANGE DE SENS SOUS LE ROUAGE, comme celle d'une
    // compétence : en jouant on lit ce que la langue VAUT, en construisant ce
    // qu'on y a MIS. Les deux ne diffèrent que si la limite mord.
    [["Total", "Points"], "Limite", "Niveau"].forEach(function (k) {
      var c = el("span", "c");
      if (typeof k === "string") c.appendChild(el("span", "k", k));
      else {
        c.appendChild(el("span", "k pc-jeu-only", k[0]));
        c.appendChild(el("span", "k pc-edit-only", k[1]));
      }
      teteTrio.appendChild(c);
    });
    tete.appendChild(teteTrio);
    b.appendChild(tete);

    // LA BOÎTE EST APPENDUE UNE FOIS, hors de rendu() : c'est son contenu qui
    // se refait, jamais elle.
    var box = el("div");
    b.appendChild(box);

    // LE REGISTRE DES LIGNES, et le détour obligatoire : pousser directement
    // dans « hooks » empilerait à jamais les fonctions des lignes détruites,
    // chacune tenant une langue que l'état ne porte plus.
    var lignes = [];
    hooks.push(function () {
      for (var i = 0; i < lignes.length; i++) lignes[i]();
    });

    function ligne(it, odd) {
      // la langue VIVANTE, jamais capturée : la liste bouge sous la ligne
      var l = it.langue;
      var row = el("div", "pc-crow" + (odd ? " odd" : ""));
      var top = el("div", "pc-crow-top");

      // LA CROIX D'ABORD, TOUT À GAUCHE : c'est le geste qu'on cherche des yeux
      // quand on veut retirer une ligne. Un point d'arrêt de plus la protège —
      // des points sont de l'xp dépensé.
      top.appendChild(miniBtn("✕", "Retirer cette langue", function () {
        if (l.pts) {
          // la modale de la fiche, jamais confirm() natif : celui-là est MUET
          // dans l'iframe Roll20 et le retrait y serait annulé en silence
          confirmer("Retirer « " + (l.nom || "sans nom") + " »",
                    "Ses " + l.pts + " points partent avec.",
                    "Retirer", function () { retire(it.index); });
          return;
        }
        retire(it.index);
      }, "danger pc-croix pc-edit-only"));

      var nom = el("input", "nm pc-edit-field");
      nom.type = "text";
      nom.placeholder = "Nom de la langue";
      nom.value = l.nom || "";
      // UN NOM S'ENREGISTRE SANS RAFRAÎCHIR : rien ne se calcule à partir de
      // lui, et refresh() reconstruirait la liste sous les doigts.
      nom.addEventListener("input", function () { l.nom = nom.value; save(); });
      top.appendChild(nom);
      top.appendChild(el("span", "sp"));

      var trio = el("span", "pc-trio");
      var vTot = caseSaisie(trio,
        function () { return l.pts || 0; },
        function (v) {
          var n = Math.max(0, Math.round(v));
          // zéro n'est pas une donnée : une langue sans point reste dans la
          // liste, elle ne vaut simplement rien
          l.pts = n;
        }, "Points mis dans cette langue", lignes);
      var vLim = caseTexte(trio);
      var vNiv = caseTexte(trio);
      top.appendChild(trio);
      row.appendChild(top);

      lignes.push(function () {
        var c = langueCarac();
        var brut = l.pts || 0;
        var tot = langueTotal(l);
        var niv = langueNiveau(l);
        var mord = brut > tot;
        vTot.txt.textContent = String(tot);
        vTot.txt.classList.toggle("adj", mord);
        vLim.textContent = String(caracLim(c));
        // LE NIVEAU EST UN RANG, PAS UN NOMBRE À LIRE : un tiret dit mieux
        // « pas encore » qu'un zéro, qui se lirait comme un niveau.
        vNiv.textContent = niv ? String(niv) : "—";
        vNiv.classList.toggle("adj", niv > 0);
        var seuils = langueSeuils();
        var prochain = seuils[niv];   // undefined au dernier niveau
        trio.title = "Points " + brut +
                     (mord ? ", ramenés à " + tot + " par la limite de " + c : "") +
                     " · niveau " + (niv || "aucun") +
                     (prochain ? " · niveau " + (niv + 1) + " à " + prochain : "") +
                     " — une langue n'ajoute pas le " + c + " au total.";
        // LE NOM SE COUPE DANS UN QUART DE COLONNE : « Chuchotement » y tient
        // en « Chucho… ». L'infobulle le rend entier, faute de place.
        nom.title = l.nom || "";
        if (document.activeElement !== nom) nom.value = l.nom || "";
      });
      return row;
    }

    function retire(i) {
      state.langues.splice(i, 1);
      rendu();
      refresh();
    }

    function rendu() {
      box.innerHTML = "";
      // les fonctions des lignes effacées n'ont plus rien à rafraîchir ; le
      // tableau est vidé SUR PLACE, celui du registre étant le même objet
      lignes.length = 0;
      var items = allLangues();
      if (!items.length) box.appendChild(el("div", "pc-empty", "—"));
      else items.forEach(function (it, i) { box.appendChild(ligne(it, i % 2 === 1)); });
      box.appendChild(miniBtn("+ Ajouter une langue", null, function () {
        state.langues.push(blankLangue());
        rendu();
        refresh();
      }, "pc-edit-only"));
      // les lignes qui viennent de naître doivent obéir au verrou du bloc :
      // rien ne le leur dirait avant le prochain rafraîchissement
      applyEdit(b, "langues");
      // ET ELLES DOIVENT ÊTRE REMPLIES : une ligne naît vide, ses nombres ne
      // s'écrivant que dans les fonctions poussées au registre — et ce registre
      // n'est joué que par refresh(). Rejouer ICI, jamais chez l'appelant.
      for (var i = 0; i < lignes.length; i++) {
        try { lignes[i](); } catch (e) { /* la muselière juge à la passe suivante */ }
      }
    }

    rendu();
    return b;
  }
