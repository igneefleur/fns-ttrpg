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
    // DEUX CASES, ET LES DEUX CHANGENT DE SENS SOUS LE ROUAGE. En jouant on lit
    // ce que la langue VAUT et le rang que ça lui donne ; en construisant, ce
    // qu'on y a MIS et ce qu'elle ne peut pas dépasser. La limite ne sert qu'à
    // celui qui achète — l'afficher en jeu prenait une case pour rien, et cette
    // case manquait au nom.
    [["Total", "Valeur"], ["Niveau", "Limite"]].forEach(function (k) {
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

    // L'ORDRE APPARTIENT AU JOUEUR : rien dans les règles ne dit dans quel ordre
    // ses langues se lisent. On glisse la POIGNÉE, jamais la ligne entière — le
    // nom est un champ de saisie, et une ligne « draggable » interdirait d'y
    // sélectionner un mot à la souris.
    //
    // « pris » porte l'index dans l'ÉTAT, jamais le rang à l'écran.
    var pris = null;
    function eteintDepot() {
      var l = box.querySelectorAll(".pc-crow");
      for (var i = 0; i < l.length; i++) {
        l[i].classList.remove("avant");
        l[i].classList.remove("apres");
      }
    }

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

      var poignee = el("span", "pc-poignee pc-edit-only");
      poignee.title = "Glisser pour ranger cette langue";
      poignee.draggable = true;
      poignee.addEventListener("dragstart", function (ev) {
        pris = it.index;
        row.classList.add("pris");
        try {
          ev.dataTransfer.effectAllowed = "move";
          // Firefox refuse de commencer un glissement sans donnée posée
          ev.dataTransfer.setData("text/plain", String(it.index));
          if (ev.dataTransfer.setDragImage) ev.dataTransfer.setDragImage(row, 16, 12);
        } catch (e) {}
      });
      poignee.addEventListener("dragend", function () {
        pris = null;
        row.classList.remove("pris");
        eteintDepot();
      });
      top.appendChild(poignee);

      var nom = el("input", "nm pc-edit-field");
      nom.type = "text";
      nom.placeholder = "Nom de la langue";
      nom.value = l.nom || "";
      // UN NOM S'ENREGISTRE SANS RAFRAÎCHIR : rien ne se calcule à partir de
      // lui, et refresh() reconstruirait la liste sous les doigts.
      nom.addEventListener("input", function () { l.nom = nom.value; save(); });
      // AUCUN RESSORT ENTRE LE NOM ET LE TRIO, et c'est ce qui fait toute la
      // différence : une ligne de COMPÉTENCE en porte un, parce que son nom est
      // une pastille de largeur fixe et qu'il faut bien quelque chose pour
      // pousser le trio à droite. Ici le nom S'ÉCRIT — c'est LUI qui prend la
      // place, comme sur une ligne de spécialité. Un ressort à côté la lui
      // disputait, et sous le rouage, entre une croix, une poignée et trois
      // cases, il ne lui restait qu'un trait de deux pixels.
      top.appendChild(nom);

      // DEUX CASES ET NON TROIS, et c'est ce qui rend le nom lisible : trois
      // cases prenaient près de six dixièmes d'un quart de colonne, la croix et
      // la poignée le reste, et il ne restait au nom qu'un trait de deux pixels.
      var trio = el("span", "pc-trio");
      var vTot = caseSaisie(trio,
        function () { return l.pts || 0; },
        function (v) {
          var n = Math.max(0, Math.round(v));
          // zéro n'est pas une donnée : une langue sans point reste dans la
          // liste, elle ne vaut simplement rien
          l.pts = n;
        }, "Points mis dans cette langue", lignes);
      // LA SECONDE CASE DIT DEUX CHOSES SELON LE MOMENT : le NIVEAU quand on
      // joue — c'est le seul chiffre qui compte à table —, la LIMITE quand on
      // construit, puisque c'est elle qui borne ce qu'on achète.
      var cNivLim = caseDouble(trio);
      var vNiv = cNivLim[0], vLim = cNivLim[1];
      top.appendChild(trio);
      row.appendChild(top);

      // La MOITIÉ survolée décide : au-dessus, la ligne prise se pose avant ;
      // en dessous, après. Le liseré le montre pendant qu'on tient.
      function moitieBasse(ev) {
        var r = row.getBoundingClientRect();
        return ev.clientY >= r.top + r.height / 2;
      }
      row.addEventListener("dragover", function (ev) {
        if (pris === null || pris === it.index) return;
        ev.preventDefault();            // sans ça, le navigateur refuse le dépôt
        try { ev.dataTransfer.dropEffect = "move"; } catch (e) {}
        eteintDepot();
        row.classList.add(moitieBasse(ev) ? "apres" : "avant");
      });
      row.addEventListener("dragleave", function (ev) {
        if (ev.target === row) { row.classList.remove("avant"); row.classList.remove("apres"); }
      });
      row.addEventListener("drop", function (ev) {
        ev.preventDefault();
        var src = pris;
        if (src === null) {
          try { src = parseInt(ev.dataTransfer.getData("text/plain"), 10); } catch (e) { src = NaN; }
        }
        eteintDepot();
        if (!isFinite(src) || src === it.index) return;
        var cible = it.index + (moitieBasse(ev) ? 1 : 0);
        var lst = state.langues;
        var obj = lst.splice(src, 1)[0];
        if (!obj) return;
        // le retrait a décalé tout ce qui suivait : la cible avec, si elle était
        // après la source
        if (src < cible) cible--;
        lst.splice(clamp(cible, 0, lst.length), 0, obj);
        rendu();
        refresh();
      });

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
