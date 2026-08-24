  // ---------- inventaire : objets illustrés (tuiles par groupes + panneau) ----------
  // Des TUILES carrées rangées par groupes (Sur soi, Sacoche…), et le détail de
  // l'objet choisi dans la colonne de droite : image, quantité, poids, groupe,
  // description, envoi au tchat. On glisse une tuile d'un groupe à l'autre.
  //
  // Un registre en lignes a été essayé à la place, puis RETIRÉ : les tuiles
  // valent mieux ici, un inventaire se reconnaît à ses images. Si l'idée
  // revient, qu'elle revienne comme un choix d'affichage, pas comme un
  // remplacement.
  //
  // Le bandeau d'un groupe porte à droite son POIDS et sa case « Compté » :
  // décochée, le groupe est posé au sol, son poids sort du poids porté (donc du
  // malus de Body), mais ses objets restent entiers, consultables, déplaçables
  // et donnables. Le drapeau vit dans state.inv.comptes, parallèle aux groupes.
  //
  // Les images importées d'un fichier sont réduites en vignette pour tenir dans
  // la fiche (et dans les Attributes Roll20) ; préférer une URL quand c'est
  // possible.
  function invObjets(container, renderRef) {
    var G = state.inv.groupes;
    var items = state.inv.objets;
    var O = state.inv.opts;
    var sel = null;          // index dans items de l'objet affiché au panneau
    var dragIdx = null;
    var editGi = null;       // groupe à ouvrir en édition de nom au prochain render
    var tileRefs = {};       // idx -> { nom, badge, poids } pour maj sans re-render
    // Les poids des bandeaux se rafraîchissent SANS re-render : saisir un poids
    // dans le panneau recréerait sinon la tuile en cours d'édition, et le champ
    // frappé perdrait le focus au premier caractère.
    var grpPoids = [];

    // réglages d'affichage du module, en mode édition seulement
    var optRow = el("div", "pc-obj-opts pc-edit-only");
    var colIn = el("input", "n");
    colIn.type = "number"; colIn.min = "1"; colIn.max = "8"; colIn.step = "1";
    colIn.value = O.cols;
    colIn.title = "Objets par ligne";
    colIn.addEventListener("input", function () {
      O.cols = clamp(num(colIn.value, 4), 1, 8);
      render();
      refresh();
    });
    optRow.appendChild(fld("Par ligne", colIn));
    [["nom", "Nom"], ["qte", "Quantité"], ["poids", "Poids"], ["total", "Total"]].forEach(function (o) {
      var chip = el("span", "pc-chip");
      chip.textContent = o[1];
      chip.title = "Afficher « " + o[1] + " » sur les tuiles" + (o[0] === "total" ? " (total en bas du module)" : "");
      chip.classList.toggle("on", !!O[o[0]]);
      chip.addEventListener("click", function () {
        O[o[0]] = !O[o[0]];
        chip.classList.toggle("on", !!O[o[0]]);
        render();
        refresh();
      });
      optRow.appendChild(chip);
    });
    container.appendChild(optRow);

    var wrap = el("div", "pc-obj-wrap");
    var leftBox = el("div", "pc-obj-left");
    var panel = el("div", "pc-obj-panel");
    wrap.appendChild(leftBox);
    wrap.appendChild(panel);
    var tot = el("div", "pc-inv-total");

    // le poids de MIA n'a pas d'unité : c'est une valeur nue
    //
    // Le pied distingue ce que le personnage PORTE de ce qu'il a POSÉ : un
    // total unique laisserait croire qu'un sac décoché pèse encore, ou qu'il a
    // disparu. Les bandeaux se rafraîchissent ici aussi, pour qu'une saisie de
    // poids dans le panneau les mette à jour sans recréer les tuiles.
    function updateTotal() {
      tot.style.display = O.total ? "" : "none";
      grpPoids.forEach(function (f) { f(); });
      var porte = poidsObjets(true), pose = poidsObjets(false);
      tot.textContent = "Objets portés : " + fmtP(porte) +
        (pose ? " · posés : " + fmtP(pose) : "");
    }

    function vignette(file, cb) {
      var r = new FileReader();
      r.onerror = function () { flash("Image illisible."); };
      r.onload = function () {
        var img = new Image();
        img.onload = function () {
          if (!img.width || !img.height) { flash("Image illisible."); return; }   // ex. SVG sans dimensions
          var S = 96, c = document.createElement("canvas");
          c.width = S; c.height = S;
          var k = Math.max(S / img.width, S / img.height);
          var w = img.width * k, h = img.height * k;
          c.getContext("2d").drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
          cb(c.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = function () { flash("Image illisible."); };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    }

    function moveTo(from, gi, targetIt) {
      // déplace items[from] dans le groupe gi, juste avant targetIt (null : à la fin).
      // La position cible se recalcule APRÈS le retrait : retirer l'objet déplacé
      // décale les index de tout ce qui le suivait.
      var moved = items.splice(from, 1)[0];
      moved.groupe = gi;
      var at = targetIt ? items.indexOf(targetIt) : -1;
      if (at < 0) items.push(moved);
      else items.splice(at, 0, moved);
      sel = items.indexOf(moved);
    }

    function tile(it, idx) {
      var t = el("div", "pc-obj-tile" + (sel === idx ? " sel" : ""));
      if (it.img) {
        var im = el("img");
        im.alt = ""; im.draggable = false;
        im.src = it.img;
        t.appendChild(im);
      } else t.appendChild(el("div", "pc-obj-ph", "?"));
      // retrait direct depuis la tuile, en mode édition
      var del = el("button", "pc-obj-del pc-edit-only", "✕");
      del.type = "button";
      del.title = "Retirer cet objet";
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        // confirm() est MUET dans l'iframe Roll20 : il rend false sans rien
        // afficher, donc le retrait y était annulé en silence dès que l'objet
        // portait un nom. La modale de la fiche, elle, s'affiche partout.
        function retire() {
          var here = items.indexOf(it);
          items.splice(here, 1);
          if (sel === here) sel = null;
          else if (sel !== null && sel > here) sel--;
          render();
          refresh();
        }
        if (!(it.nom || it.desc)) { retire(); return; }
        confirmer("Retirer un objet",
                  "Retirer « " + (it.nom || "cet objet") + " » de l'inventaire ?",
                  "Retirer", retire);
        return;
      });
      t.appendChild(del);
      var foot = el("div", "pc-obj-foot");
      var nom = el("span", "nm", it.nom || "Objet");
      if (!O.nom) nom.style.display = "none";
      foot.appendChild(nom);
      var poids = el("span", "pds", it.poids ? fmtP(it.poids) : "");
      poids.title = "Poids unitaire";
      if (!O.poids) poids.style.display = "none";
      foot.appendChild(poids);
      var badge = el("span", "qte", "×" + fmtP(it.qte));
      if (!O.qte) badge.style.display = "none";
      foot.appendChild(badge);
      // pied inutile si tout est masqué : la tuile reste une vignette nette
      if (!O.nom && !O.poids && !O.qte) foot.style.display = "none";
      t.appendChild(foot);
      tileRefs[idx] = { nom: nom, badge: badge, poids: poids };

      t.addEventListener("click", function () { sel = idx; render(); });
      t.draggable = true;
      t.addEventListener("dragstart", function (e) {
        // réordonner et changer de groupe = construction : mode édition requis
        if (!isEdit("inv")) { e.preventDefault(); return; }
        dragIdx = idx;
        t.classList.add("drag");
        try { e.dataTransfer.setData("text/plain", ""); e.dataTransfer.effectAllowed = "move"; } catch (err) {}
      });
      t.addEventListener("dragend", function () { dragIdx = null; render(); });
      t.addEventListener("dragover", function (e) {
        if (dragIdx === null) return;
        // lâcher sur soi-même : cible invalide, et on N'EN LAISSE PAS le
        // conteneur du groupe la valider (sinon l'objet saute en fin de groupe)
        if (dragIdx === idx) { e.stopPropagation(); return; }
        e.preventDefault();
        e.stopPropagation();
        // le trait d'insertion se pose du côté visé : l'objet saura où il tombe
        var r = t.getBoundingClientRect();
        var avant = e.clientX < r.left + r.width / 2;
        t.classList.toggle("over-l", avant);
        t.classList.toggle("over-r", !avant);
      });
      t.addEventListener("dragleave", function () { t.classList.remove("over-l", "over-r"); });
      t.addEventListener("drop", function (e) {
        if (dragIdx === null) return;
        if (dragIdx === idx) { e.stopPropagation(); return; }
        e.preventDefault();
        e.stopPropagation();
        var r = t.getBoundingClientRect();
        var avant = e.clientX < r.left + r.width / 2;
        var from = dragIdx; dragIdx = null;
        // déposer à DROITE d'une tuile = s'insérer avant la suivante du groupe.
        // L'objet déplacé est exclu du calcul : sinon il serait sa propre cible
        // et moveTo, qui le retire d'abord, l'expédierait en fin de groupe.
        var cible = it;
        if (!avant) {
          var deplace = items[from];
          var suivants = items.filter(function (x) { return x.groupe === it.groupe && x !== deplace; });
          var k = suivants.indexOf(it);
          cible = k >= 0 && k + 1 < suivants.length ? suivants[k + 1] : null;
        }
        moveTo(from, it.groupe, cible);
        render();
        refresh();
      });
      return t;
    }

    function groupBox(gi) {
      var g = el("div", "pc-obj-group");
      var head = el("div", "pc-obj-ghead");
      var name = el("span", "nm", G[gi]);
      name.title = isEdit("inv") ? "Double-clic : renommer le groupe" : G[gi];
      // édition EN PLACE, jamais prompt() : dans Roll20 la fiche est une iframe
      // d'une autre origine, où Chrome fait échouer prompt() en silence
      function editName() {
        var inp = el("input", "nmedit");
        inp.type = "text";
        inp.value = G[gi];
        inp.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); inp.blur(); }
          else if (e.key === "Escape") { inp.value = G[gi]; inp.blur(); }
        });
        inp.addEventListener("blur", function () {
          G[gi] = inp.value.trim() || G[gi];
          render();
          refresh();
        });
        head.replaceChild(inp, name);
        setTimeout(function () { inp.focus(); inp.select(); }, 0);
      }
      name.addEventListener("dblclick", function () { if (isEdit("inv")) editName(); });
      head.appendChild(name);
      if (editGi === gi) { editGi = null; editName(); }

      // CE QUE PÈSE CE GROUPE, ET S'IL PÈSE. Un personnage qui pose son sac au
      // sol ne le porte plus : le décocher sort ses objets du poids porté, donc
      // du malus de Body, sans rien perdre de ce qu'il contient. Les deux vivent
      // à droite du nom, là où l'oeil descend pour lire des chiffres.
      var pdsG = el("span", "pds");
      pdsG.title = "Poids de ce groupe";
      head.appendChild(pdsG);
      var caseG = el("label", "pc-obj-cnt");
      var boite = el("input");
      boite.type = "checkbox";
      boite.checked = invCompte(gi);
      boite.title = "Décoché, ce groupe est posé au sol : il ne compte plus dans le poids porté.";
      boite.addEventListener("change", function () {
        state.inv.comptes[gi] = boite.checked;
        g.classList.toggle("pose", !boite.checked);
        majPoids();
        updateTotal();      // le pied distingue porté et posé : il doit suivre
        save();
        refresh();          // et le malus de Body avec, dans le même geste
      });
      caseG.appendChild(boite);
      caseG.appendChild(el("span", "t", "Compté"));
      head.appendChild(caseG);
      // Le poids d'un groupe posé s'écrit entre parenthèses : il existe, il est
      // rangé, mais il ne pèse pas. Rien ne disparaît de l'écran.
      function majPoids() {
        var p = poidsGroupe(gi);
        pdsG.textContent = invCompte(gi) ? fmtP(p) : "(" + fmtP(p) + ")";
        pdsG.classList.toggle("off", !invCompte(gi));
      }
      majPoids();
      grpPoids.push(majPoids);
      if (!invCompte(gi)) g.classList.add("pose");

      if (G.length > 1) {
        var delG = el("button", "x pc-edit-only", "✕");
        delG.type = "button";
        delG.title = "Supprimer le groupe (ses objets rejoignent le premier groupe)";
        delG.addEventListener("click", function () {
          function supprime() {
            G.splice(gi, 1);
            // le drapeau part AVEC son groupe : le laisser décalerait tous les
            // suivants, et un sac resterait posé au sol sans rien pour le dire
            state.inv.comptes.splice(gi, 1);
            items.forEach(function (it) {
              if (it.groupe === gi) it.groupe = 0;
              else if (it.groupe > gi) it.groupe--;
            });
            sel = null;
            render();
            refresh();
          }
          // Un groupe plein emporte ses objets ailleurs : on le dit avant, et
          // par la modale de la fiche, puisque confirm() est muet sous Roll20.
          var dedans = 0;
          items.forEach(function (it) { if (it.groupe === gi) dedans++; });
          if (!dedans) { supprime(); return; }
          confirmer("Supprimer un groupe",
                    "« " + G[gi] + " » contient " + dedans +
                    (dedans > 1 ? " objets" : " objet") +
                    ". Ils rejoindront « " + G[0] + " ».",
                    "Supprimer", supprime);
        });
        head.appendChild(delG);
      }
      g.appendChild(head);

      var tiles = el("div", "pc-obj-tiles");
      tiles.style.setProperty("--obj-cols", O.cols);   // objets par ligne, réglable
      items.forEach(function (it, idx) { if (it.groupe === gi) tiles.appendChild(tile(it, idx)); });
      var add = el("div", "pc-obj-addtile pc-edit-only", "+");
      add.title = "Ajouter un objet dans « " + G[gi] + " »";
      add.addEventListener("click", function () {
        items.push({ nom: "", qte: 1, poids: 0, img: "", desc: "", groupe: gi });
        sel = items.length - 1;
        render();
        refresh();
      });
      tiles.appendChild(add);
      // déposer dans le vide du groupe : l'objet rejoint la fin de ce groupe
      tiles.addEventListener("dragover", function (e) {
        if (dragIdx === null) return;
        e.preventDefault();
        tiles.classList.add("over");
      });
      tiles.addEventListener("dragleave", function () { tiles.classList.remove("over"); });
      tiles.addEventListener("drop", function (e) {
        if (dragIdx === null) return;
        e.preventDefault();
        var from = dragIdx; dragIdx = null;
        moveTo(from, gi, null);
        render();
        refresh();
      });
      g.appendChild(tiles);
      return g;
    }

    function renderPanel() {
      panel.innerHTML = "";
      if (sel === null || !items[sel]) {
        panel.appendChild(el("div", "pc-obj-empty", isEdit("inv")
          ? "Choisir un objet, ou en ajouter un avec « + »."
          : "Choisir un objet."));
        return;
      }
      var it = items[sel];
      var refs = function () { return tileRefs[sel]; };

      var imgbox = el("div", "pc-obj-imgbox");
      if (it.img) { var im = el("img"); im.alt = ""; im.src = it.img; imgbox.appendChild(im); }
      else imgbox.appendChild(el("div", "pc-obj-ph big", "?"));
      panel.appendChild(imgbox);

      var body = el("div", "pc-obj-body");

      var nm = el("input", "nm pc-edit-field");
      nm.type = "text"; nm.placeholder = "Nom de l'objet";
      nm.value = it.nom;
      nm.addEventListener("input", function () {
        it.nom = nm.value;
        if (refs()) refs().nom.textContent = it.nom || "Objet";
        save();
      });
      body.appendChild(nm);

      // quantité : curseur + champ
      var qRow = el("div", "pc-obj-qrow");
      var slider = el("input");
      slider.type = "range"; slider.min = "0";
      slider.max = String(Math.max(10, it.qte));
      slider.value = it.qte;
      slider.step = "any";
      var qIn = el("input", "n");
      qIn.type = "number"; qIn.min = "0"; qIn.step = "any";
      qIn.value = it.qte;
      function setQte(v) {
        // quantités DÉCIMALES : une demi-ration, 2.5 mètres de corde…
        it.qte = isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
        if (+slider.max < it.qte) slider.max = String(it.qte);
        if (document.activeElement !== slider) slider.value = it.qte;
        if (document.activeElement !== qIn) qIn.value = it.qte;
        if (refs()) refs().badge.textContent = "×" + fmtP(it.qte);
        majAct();
        majPile();
        save(); updateTotal();
        refresh();   // le poids porté vient de bouger : le malus de Body suit
      }
      slider.addEventListener("input", function () { setQte(parseFloat(slider.value)); });
      qIn.addEventListener("input", function () { setQte(parseFloat(qIn.value)); });
      qRow.appendChild(slider);
      qRow.appendChild(qIn);
      body.appendChild(fld("Quantité", qRow));

      var pair = el("div", "pc-obj-pair");
      var pd = el("input", "pc-edit-field");
      pd.type = "text"; pd.inputMode = "decimal";
      pd.value = it.poids ? fmtP(it.poids) : "";
      pd.placeholder = "0";
      pd.addEventListener("input", function () {
        it.poids = pnum(pd.value);
        if (refs()) refs().poids.textContent = it.poids ? fmtP(it.poids) : "";
        majPile();
        save(); updateTotal();
        refresh();   // idem : un poids unitaire change le poids porté
      });
      pd.addEventListener("blur", function () { pd.value = it.poids ? fmtP(it.poids) : ""; });
      pair.appendChild(fld("Poids", pd));
      var gSel = el("select", "pc-edit-field");
      G.forEach(function (gn, gi) {
        var o = el("option", null, gn);
        o.value = String(gi);
        if (gi === it.groupe) o.selected = true;
        gSel.appendChild(o);
      });
      gSel.addEventListener("change", function () {
        moveTo(sel, clamp(num(gSel.value, 0), 0, G.length - 1), null);
        render();
        refresh();
      });
      pair.appendChild(fld("Groupe", gSel));
      body.appendChild(pair);

      // achat / vente : la valeur marchande de l'objet, laissée nue comme le
      // poids (MIA ne nomme pas sa monnaie)
      var prix = el("div", "pc-obj-pair");
      [["achat", "Achat"], ["vente", "Vente"]].forEach(function (c) {
        var inp = el("input", "pc-edit-field");
        inp.type = "text"; inp.inputMode = "decimal";
        inp.value = it[c[0]] ? fmtP(it[c[0]]) : "";
        inp.placeholder = "0";
        inp.addEventListener("input", function () { it[c[0]] = pnum(inp.value); save(); });
        inp.addEventListener("blur", function () { inp.value = it[c[0]] ? fmtP(it[c[0]]) : ""; });
        prix.appendChild(fld(c[1], inp));
      });
      body.appendChild(prix);

      // identifiant : c'est LUI qui reconnaît le même objet d'une fiche à
      // l'autre quand on le donne (deux « Corde » sans rapport ne fusionnent
      // pas si elles portent des identifiants différents)
      var idIn = el("input", "pc-edit-field");
      idIn.type = "text"; idIn.placeholder = "libre (ex. corde-chanvre)";
      idIn.value = it.id || "";
      idIn.addEventListener("input", function () { it.id = idIn.value; save(); });
      body.appendChild(fld("Identifiant", idIn, "w pc-edit-only"));

      // total de la pile : ce que cet objet pèse en tout (quantité × poids)
      var pile = el("div", "pc-obj-pile");
      function majPile() {
        pile.textContent = "Total : " + fmtP(it.qte * it.poids);
        pile.style.display = it.poids ? "" : "none";
      }
      majPile();
      body.appendChild(pile);

      var url = el("input", "pc-edit-field");
      url.type = "text"; url.placeholder = "https://…";
      url.value = /^data:/.test(it.img) ? "" : it.img;
      url.addEventListener("change", function () { it.img = url.value.trim(); render(); refresh(); });
      var urlFld = fld("Image (URL)", url);
      var file = el("input");
      file.type = "file"; file.accept = "image/*"; file.style.display = "none";
      file.addEventListener("change", function () {
        var f = file.files && file.files[0];
        file.value = "";   // vidé tout de suite : re-choisir le MÊME fichier redéclenche change
        if (!f) return;
        vignette(f, function (dataUrl) { it.img = dataUrl; render(); refresh(); });
      });
      urlFld.appendChild(file);
      urlFld.appendChild(miniBtn("Fichier…", "Importer une image (réduite en vignette 96 px)", function () { file.click(); }, "pc-edit-only"));
      body.appendChild(urlFld);

      var desc = el("textarea", "pc-notes pc-edit-field");
      desc.rows = 3;
      desc.placeholder = "Description, effets, notes…";
      desc.value = it.desc;
      desc.addEventListener("input", function () { it.desc = desc.value; save(); });
      body.appendChild(fld("Description", desc, "w"));

      // quantité d'ACTION : combien d'exemplaires les boutons ci-dessous
      // traitent. Elle ne touche pas la pile tant qu'on n'agit pas.
      var actQte = el("input", "n");
      actQte.type = "number"; actQte.min = "0"; actQte.step = "any";
      actQte.title = "Quantité traitée par les boutons ci-dessous";
      function bornerAct() {
        var v = pnum(actQte.value);
        if (!v || v > it.qte) v = it.qte;
        return Math.round(v * 100) / 100;
      }
      function majAct() {
        actQte.max = String(it.qte);
        if (document.activeElement !== actQte) actQte.value = fmtP(Math.min(pnum(actQte.value) || it.qte, it.qte));
      }
      actQte.value = fmtP(it.qte);
      actQte.addEventListener("blur", function () { actQte.value = fmtP(bornerAct()); });

      var actions = el("div", "pc-obj-actions");
      actions.appendChild(fld("Quantité", actQte, "qact"));
      actions.appendChild(chatBtn(
        function () { return "Objet — " + (it.nom || "objet"); },
        function () {
          var q = bornerAct();
          return [
            ["Groupe", G[it.groupe]],
            ["Quantité", fmtP(q) + (q < it.qte ? " (sur " + fmtP(it.qte) + ")" : "")],
            ["Poids", it.poids ? fmtP(it.poids) + (q > 1 ? " (total " + fmtP(q * it.poids) + ")" : "") : ""],
            ["Valeur", it.vente ? "vente " + fmtP(it.vente) + (it.achat ? " · achat " + fmtP(it.achat) : "")
                                : (it.achat ? "achat " + fmtP(it.achat) : "")],
            ["", it.desc]   // texte long : pleine largeur, sans libellé
          ];
        }));
      // donner : l'objet quitte CET inventaire et part au tchat sous forme de
      // lien « Prendre » ; le premier qui clique le reçoit dans sa fiche
      actions.appendChild(miniBtn("Donner", "Donner cette quantité à un autre joueur", function () {
        donnerDialogue(it, bornerAct());
      }));
      function retireQte(q, tout) {
        if (tout) {
          items.splice(sel, 1);
          sel = null;
        } else {
          it.qte = Math.round((it.qte - q) * 100) / 100;
        }
        render();
        refresh();
      }
      actions.appendChild(miniBtn("Retirer", "Retirer cette quantité (tout : l'objet disparaît)", function () {
        var q = bornerAct();
        var tout = q >= it.qte;
        // même raison que la croix de la tuile : la modale, jamais confirm(),
        // qui est muet dans l'iframe Roll20 et annulerait le retrait en silence
        if (tout && (it.nom || it.desc)) {
          confirmer("Retirer un objet",
                    "Retirer « " + (it.nom || "cet objet") + " » de l'inventaire ?",
                    "Retirer", function () { retireQte(q, true); });
          return;
        }
        retireQte(q, tout);
      }, "danger pc-edit-only"));
      body.appendChild(actions);
      panel.appendChild(body);
    }

    function render() {
      tileRefs = {};
      grpPoids = [];
      leftBox.innerHTML = "";
      G.forEach(function (_, gi) { leftBox.appendChild(groupBox(gi)); });
      var addG = miniBtn("+ Groupe", "Ajouter un groupe d'objets", function () {
        G.push("Groupe");
        // le drapeau naît AVEC son groupe : un groupe neuf est porté, jamais
        // posé, et le tableau reste parallèle à celui des groupes
        state.inv.comptes.push(true);
        editGi = G.length - 1;   // le nouveau groupe s'ouvre en édition de nom
        render();
        refresh();
      }, "pc-edit-only");
      addG.classList.add("pc-obj-addgroup");
      leftBox.appendChild(addG);
      renderPanel();
      updateTotal();
      applyEdit(container, "inv");
    }
    if (renderRef) renderRef.fn = render;
    invRender = render;   // un objet reçu du tchat redessine l'inventaire
    render();
    container.appendChild(wrap);
    container.appendChild(tot);
  }

