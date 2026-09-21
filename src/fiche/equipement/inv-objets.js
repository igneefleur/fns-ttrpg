  // ---- 14. Inventaire (pleine largeur) ----
  // TROIS GROUPES FIXES, et rien d'autre dans l'onglet Équipement :
  //
  //   SUR SOI     [main gauche] [main droite] [sac à dos]
  //               [tête] [mains] [haut] [bas] [pieds]
  //   POCHES      ce que les vêtements portés laissent emporter (en kg)
  //   SAC À DOS   ce que le sac porté laisse emporter (en kg)
  //
  // Les huit cases de Sur soi sont TOUJOURS là, vides ou pleines ; une case
  // de vêtement ne prend que son type de vêtement, la case du sac à dos qu'un
  // sac. Poches et sac à dos se remplissent de tuiles, cinq par ligne au plus.
  // Le détail de l'objet choisi occupe la colonne de droite : c'est là qu'on
  // dit ce qu'est un objet (vêtement, sac à dos, arme) et où il se trouve.
  //
  // Les images importées d'un fichier sont réduites en vignette pour tenir dans
  // la fiche (et dans les Attributes Roll20) ; préférer une URL quand c'est
  // possible.
  var INV_NOMS = {
    mainG: "Main gauche", mainD: "Main droite", dos: "Sac à dos",
    tete: "Tête", mains: "Mains", haut: "Haut", bas: "Bas", pieds: "Pieds",
    poches: "Poches", sac: "Sac à dos"
  };
  // Un objet peut-il aller là ? Les mains, les poches et le sac prennent
  // tout ; la case du sac à dos, un sac ; une case de vêtement, son type.
  function lieuPermis(o, ou) {
    if (ou === "poches" || ou === "sac" || ou === "mainG" || ou === "mainD") return true;
    if (ou === "dos") return !!o.sac;
    return o.vet === ou;
  }
  function invObjets(container, renderRef) {
    var items = state.inv.objets;
    var O = state.inv.opts;
    var sel = null;          // l'OBJET affiché au panneau
    var drag = null;         // l'objet qu'on glisse
    var panelHooks = [];     // ce que le panneau rafraîchit, vidé à chaque rendu

    // réglages d'affichage du module, en mode édition seulement
    // CINQ PAR LIGNE, fixe : les tuiles des poches et du sac ont la taille des
    // cases de Sur soi, qui sont cinq sur leur ligne de vêtements.
    var optRow = el("div", "pc-obj-opts pc-edit-only");
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
    var majGroupes = [];     // les poids des bandeaux, rafraîchis sans re-rendu

    function updateTotal() {
      tot.style.display = O.total ? "" : "none";
      majGroupes.forEach(function (f) { f(); });
      tot.textContent = "Poids porté : " + fmtP(poidsPorte()) + " / " + fmtP(charge()) + " kg";
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

    // DÉPLACER un objet vers `ou`, juste avant `cible` (null : à la fin). Une
    // case déjà prise ÉCHANGE : ce qu'elle tenait part là d'où l'objet vient,
    // ou au sac s'il n'y a pas sa place.
    function deplace(o, ou, cible) {
      if (!lieuPermis(o, ou)) { flash("« " + INV_NOMS[ou] + " » ne prend pas cet objet."); return false; }
      if (INV_CASES.indexOf(ou) >= 0) {
        var occupant = objetEn(ou);
        if (occupant && occupant !== o) occupant.ou = lieuPermis(occupant, o.ou) ? o.ou : "sac";
      }
      o.ou = ou;
      if (cible !== undefined) {
        items.splice(items.indexOf(o), 1);
        var at = cible ? items.indexOf(cible) : -1;
        if (at < 0) items.push(o);
        else items.splice(at, 0, o);
      }
      return true;
    }

    function tile(it) {
      var t = el("div", "pc-obj-tile" + (sel === it ? " sel" : ""));
      if (it.img) {
        var im = el("img");
        im.alt = ""; im.draggable = false;
        im.src = it.img;
        t.appendChild(im);
      } else t.appendChild(el("div", "pc-obj-ph", "?"));
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
      if (!O.nom && !O.poids && !O.qte) foot.style.display = "none";
      t.appendChild(foot);
      t.title = (it.nom || "Objet") + (it.rapide ? " — prise rapide" : "");
      if (it.rapide) t.classList.add("rapide");

      t.addEventListener("click", function (e) { e.stopPropagation(); sel = it; render(); });
      t.draggable = true;
      t.addEventListener("dragstart", function (e) {
        // ranger = construction : mode édition requis
        if (!isEdit("inv")) { e.preventDefault(); return; }
        drag = it;
        t.classList.add("drag");
        try { e.dataTransfer.setData("text/plain", ""); e.dataTransfer.effectAllowed = "move"; } catch (err) {}
      });
      t.addEventListener("dragend", function () { drag = null; render(); });
      // dans les poches et le sac, déposer SUR une tuile range avant ou après
      // elle ; dans une case, c'est la case qui reçoit
      if (it.ou === "poches" || it.ou === "sac") {
        t.addEventListener("dragover", function (e) {
          if (!drag || drag === it) return;
          e.preventDefault();
          e.stopPropagation();
          var r = t.getBoundingClientRect();
          var avant = e.clientX < r.left + r.width / 2;
          t.classList.toggle("over-l", avant);
          t.classList.toggle("over-r", !avant);
        });
        t.addEventListener("dragleave", function () { t.classList.remove("over-l", "over-r"); });
        t.addEventListener("drop", function (e) {
          if (!drag || drag === it) return;
          e.preventDefault();
          e.stopPropagation();
          var r = t.getBoundingClientRect();
          var avant = e.clientX < r.left + r.width / 2;
          var o = drag; drag = null;
          var cible = it;
          if (!avant) {
            var suivants = items.filter(function (x) { return x.ou === it.ou && x !== o; });
            var k = suivants.indexOf(it);
            cible = k >= 0 && k + 1 < suivants.length ? suivants[k + 1] : null;
          }
          if (deplace(o, it.ou, cible)) { sel = o; refresh(); }
          render();
        });
      }
      return t;
    }

    // une CASE de Sur soi : l'objet qu'elle tient, ou son nom en creux
    function caseSurSoi(ou) {
      var c = el("div", "pc-inv-case");
      c.dataset.ou = ou;
      var o = objetEn(ou);
      if (o) c.appendChild(tile(o));
      else c.appendChild(el("div", "pc-inv-vide", INV_NOMS[ou]));
      c.title = INV_NOMS[ou];
      c.addEventListener("dragover", function (e) {
        if (!drag || !lieuPermis(drag, ou)) return;
        e.preventDefault();
        c.classList.add("over");
      });
      c.addEventListener("dragleave", function () { c.classList.remove("over"); });
      c.addEventListener("drop", function (e) {
        if (!drag) return;
        e.preventDefault();
        var d = drag; drag = null;
        if (deplace(d, ou)) { sel = d; refresh(); }
        render();
      });
      return c;
    }

    function bandeau(titre, pds) {
      var head = el("div", "pc-obj-ghead");
      head.appendChild(el("span", "nm", titre));
      if (pds) head.appendChild(pds);
      return head;
    }

    function groupeSurSoi() {
      var g = el("div", "pc-obj-group");
      g.appendChild(bandeau("Sur soi"));
      var l1 = el("div", "pc-inv-cases");
      ["mainG", "mainD", "dos"].forEach(function (ou) { l1.appendChild(caseSurSoi(ou)); });
      var l2 = el("div", "pc-inv-cases");
      INV_VETEMENTS.forEach(function (ou) { l2.appendChild(caseSurSoi(ou)); });
      g.appendChild(l1);
      g.appendChild(l2);
      return g;
    }

    // POCHES et SAC À DOS : des tuiles, et le poids contre la capacité
    function groupeLibre(ou, titre, poids, cap) {
      var g = el("div", "pc-obj-group");
      var pds = el("span", "pds");
      pds.title = "Poids contre capacité";
      function maj() {
        var p = poids(), c = cap();
        pds.textContent = fmtP(p) + " / " + fmtP(c) + " kg";
        pds.classList.toggle("over", p > c);
      }
      maj();
      majGroupes.push(maj);
      g.appendChild(bandeau(titre, pds));
      var tiles = el("div", "pc-obj-tiles");
      tiles.style.setProperty("--obj-cols", 5);
      items.forEach(function (it) { if (it.ou === ou) tiles.appendChild(tile(it)); });
      var add = el("div", "pc-obj-addtile pc-edit-only", "+");
      add.title = "Ajouter un objet dans « " + titre + " »";
      add.addEventListener("click", function () {
        var o = { id: "", nom: "", img: "", qte: 1, poids: 0, places: 0, achat: 0, vente: 0,
                  desc: "", ou: ou, rapide: false, vet: "", poches: 0, froid: 0, chaud: 0,
                  sac: false, cap: 0, arme: null };
        items.push(o);
        sel = o;
        render();
        refresh();
      });
      tiles.appendChild(add);
      tiles.addEventListener("dragover", function (e) {
        if (!drag) return;
        e.preventDefault();
        tiles.classList.add("over");
      });
      tiles.addEventListener("dragleave", function () { tiles.classList.remove("over"); });
      tiles.addEventListener("drop", function (e) {
        if (!drag) return;
        e.preventDefault();
        var o = drag; drag = null;
        if (deplace(o, ou, null)) { sel = o; refresh(); }
        render();
      });
      g.appendChild(tiles);
      return g;
    }

    // ---- le détail de l'objet ----
    function champNombre(libelle, lire, ecrire, titre) {
      var i = el("input", "pc-edit-field");
      i.type = "text"; i.inputMode = "decimal";
      i.value = lire() ? fmtP(lire()) : "";
      i.placeholder = "0";
      if (titre) i.title = titre;
      i.addEventListener("input", function () { ecrire(i.value); save(); updateTotal(); refresh(); });
      i.addEventListener("blur", function () { i.value = lire() ? fmtP(lire()) : ""; });
      return fld(libelle, i);
    }
    function renderPanel() {
      panel.innerHTML = "";
      if (!sel || items.indexOf(sel) < 0) {
        sel = null;
        panel.appendChild(el("div", "pc-obj-empty", isEdit("inv")
          ? "Choisir un objet, ou en ajouter un avec « + »."
          : "Choisir un objet."));
        return;
      }
      var it = sel;

      var imgbox = el("div", "pc-obj-imgbox");
      if (it.img) { var im = el("img"); im.alt = ""; im.src = it.img; imgbox.appendChild(im); }
      else imgbox.appendChild(el("div", "pc-obj-ph big", "?"));
      panel.appendChild(imgbox);

      var body = el("div", "pc-obj-body");

      var nm = el("input", "nm pc-edit-field");
      nm.type = "text"; nm.placeholder = "Nom de l'objet";
      nm.value = it.nom;
      nm.addEventListener("input", function () { it.nom = nm.value; save(); });
      nm.addEventListener("change", function () { render(); });
      body.appendChild(nm);

      // quantité : curseur + champ, décimale (une demi-ration, 2.5 m de corde)
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
        it.qte = isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
        if (+slider.max < it.qte) slider.max = String(it.qte);
        if (document.activeElement !== slider) slider.value = it.qte;
        if (document.activeElement !== qIn) qIn.value = it.qte;
        majAct();
        majPile();
        save(); updateTotal();
        refresh();   // le poids porté vient de bouger : la charge suit
      }
      slider.addEventListener("input", function () { setQte(parseFloat(slider.value)); });
      qIn.addEventListener("input", function () { setQte(parseFloat(qIn.value)); });
      qRow.appendChild(slider);
      qRow.appendChild(qIn);
      body.appendChild(fld("Quantité", qRow));

      // poids et EMPLACEMENT : seuls les lieux qui acceptent l'objet sont offerts
      var pair = el("div", "pc-obj-pair");
      pair.appendChild(champNombre("Poids", function () { return it.poids; },
        function (v) { it.poids = pnum(v); majPile(); }));
      var ouSel = el("select", "pc-edit-field");
      INV_LIEUX.forEach(function (ou) {
        if (!lieuPermis(it, ou) && it.ou !== ou) return;
        var o = el("option", null, ou === "sac" ? "Sac à dos (contenu)" : INV_NOMS[ou]);
        o.value = ou;
        if (ou === it.ou) o.selected = true;
        ouSel.appendChild(o);
      });
      ouSel.addEventListener("change", function () {
        deplace(it, ouSel.value, null);
        render();
        refresh();
      });
      pair.appendChild(fld("Emplacement", ouSel));
      body.appendChild(pair);

      // CE QU'EST L'OBJET : un objet simple, un vêtement ou un sac à dos ; et,
      // en plus, une arme ou non. Changer de nature renvoie au sac un objet
      // qui n'a plus sa place dans sa case.
      var pair2 = el("div", "pc-obj-pair");
      var nat = el("select", "pc-edit-field");
      [["", "Objet"], ["vet", "Vêtement"], ["sac", "Sac à dos"]].forEach(function (n) {
        var o = el("option", null, n[1]);
        o.value = n[0];
        if ((n[0] === "vet" && it.vet) || (n[0] === "sac" && it.sac && !it.vet) ||
            (!n[0] && !it.vet && !it.sac)) o.selected = true;
        nat.appendChild(o);
      });
      nat.addEventListener("change", function () {
        it.sac = nat.value === "sac";
        it.vet = nat.value === "vet" ? (it.vet || "haut") : "";
        if (!lieuPermis(it, it.ou)) it.ou = "sac";
        render();
        refresh();
      });
      pair2.appendChild(fld("Nature", nat));
      var kvA = el("div", "pc-kv");
      var labA = el("label", null, "");
      var cbA = el("input", "pc-edit-field");
      cbA.type = "checkbox";
      cbA.checked = !!it.arme;
      cbA.addEventListener("change", function () {
        it.arme = cbA.checked ? (it.arme || { prise: "", parade: "", reduction: "", comp: "", gestes: [] }) : null;
        render();
        refresh();
      });
      labA.appendChild(cbA);
      labA.appendChild(el("span", null, " arme"));
      kvA.appendChild(labA);
      pair2.appendChild(kvA);
      body.appendChild(pair2);

      if (it.vet) {
        var pv = el("div", "pc-obj-pair");
        var typ = el("select", "pc-edit-field");
        INV_VETEMENTS.forEach(function (v) {
          var o = el("option", null, INV_NOMS[v]);
          o.value = v;
          if (v === it.vet) o.selected = true;
          typ.appendChild(o);
        });
        typ.addEventListener("change", function () {
          it.vet = typ.value;
          if (!lieuPermis(it, it.ou)) it.ou = "sac";
          render();
          refresh();
        });
        pv.appendChild(fld("Se porte", typ));
        pv.appendChild(champNombre("Poches", function () { return it.poches; },
          function (v) { it.poches = pnum(v); }, "Ce que ce vêtement porté ajoute aux Poches, en kg"));
        body.appendChild(pv);
        var pp = el("div", "pc-obj-pair");
        pp.appendChild(champNombre("Froid", function () { return it.froid; },
          function (v) { it.froid = snum(v); }, "Protection contre le froid, en degrés"));
        pp.appendChild(champNombre("Chaud", function () { return it.chaud; },
          function (v) { it.chaud = snum(v); }, "Protection contre le chaud, en degrés"));
        body.appendChild(pp);
      }
      if (it.sac) {
        var ps = el("div", "pc-obj-pair");
        ps.appendChild(champNombre("Capacité", function () { return it.cap; },
          function (v) { it.cap = pnum(v); }, "Ce que ce sac porte, en kg"));
        body.appendChild(ps);
      }

      // PLACES DE CONTENANCE et PRISE RAPIDE
      var pair3 = el("div", "pc-obj-pair");
      pair3.appendChild(champNombre("Places", function () { return it.places; },
        function (v) { it.places = pnum(v); }, "La contenance qu'occupe cet objet une fois avalé."));
      var kvR = el("div", "pc-kv");
      var labR = el("label", null, "");
      var cbR = el("input");
      cbR.type = "checkbox";
      cbR.checked = !!it.rapide;
      cbR.addEventListener("change", function () {
        it.rapide = cbR.checked;
        render();
        refresh();
      });
      labR.appendChild(cbR);
      labR.appendChild(el("span", null, " prise rapide"));
      kvR.appendChild(labR);
      pair3.appendChild(kvR);
      body.appendChild(pair3);

      // achat / vente, en pièces d'argent : la monnaie du livre est NOMMÉE
      var prix = el("div", "pc-obj-pair");
      [["achat", "Achat"], ["vente", "Vente"]].forEach(function (c) {
        prix.appendChild(champNombre(c[1], function () { return it[c[0]]; },
          function (v) { it[c[0]] = pnum(v); }, c[1] + " en " + monnaie(true)));
      });
      body.appendChild(prix);

      // identifiant : c'est LUI qui reconnaît le même objet d'une fiche à
      // l'autre quand on le donne
      var idIn = el("input", "pc-edit-field");
      idIn.type = "text"; idIn.placeholder = "libre (ex. corde-chanvre)";
      idIn.value = it.id || "";
      idIn.addEventListener("input", function () { it.id = idIn.value; save(); });
      body.appendChild(fld("Identifiant", idIn, "w pc-edit-only"));

      var pile = el("div", "pc-obj-pile");
      function majPile() {
        pile.textContent = "Total : " + fmtP(it.qte * it.poids) + " kg";
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
        file.value = "";
        if (!f) return;
        vignette(f, function (data) { it.img = data; render(); refresh(); });
      });
      urlFld.appendChild(file);
      urlFld.appendChild(miniBtn("Fichier…", "Importer une image (réduite en vignette 96 px)",
        function () { file.click(); }, "pc-edit-only"));
      body.appendChild(urlFld);

      var desc = el("textarea", "pc-notes pc-edit-field");
      desc.rows = 3;
      desc.placeholder = "Description, effets, notes…";
      desc.value = it.desc;
      desc.addEventListener("input", function () { it.desc = desc.value; save(); });
      body.appendChild(fld("Description", desc, "w"));

      // L'ARME : ses gestes et ses jets, sous l'objet. Ses rafraîchissements
      // vont au registre du PANNEAU, vidé à chaque rendu : sinon chaque clic
      // sur une tuile laisserait des fonctions pointer sur un détail disparu.
      if (it.arme) {
        var ancien = hooks;
        hooks = panelHooks;
        try { body.appendChild(carteArme(it, function () { render(); })); }
        finally { hooks = ancien; }
      }

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
        if (document.activeElement !== actQte)
          actQte.value = fmtP(Math.min(pnum(actQte.value) || it.qte, it.qte));
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
            ["Emplacement", INV_NOMS[it.ou]],
            ["Quantité", fmtP(q) + (q < it.qte ? " (sur " + fmtP(it.qte) + ")" : "")],
            ["Poids", it.poids ? fmtP(it.poids) + (q > 1 ? " (total " + fmtP(q * it.poids) + ")" : "") : ""],
            ["Places", it.places ? fmtP(it.places) : ""],
            ["Valeur", it.vente ? "vente " + fmtP(it.vente) + (it.achat ? " · achat " + fmtP(it.achat) : "")
                                : (it.achat ? "achat " + fmtP(it.achat) : "")],
            ["", it.desc]
          ];
        }));
      actions.appendChild(miniBtn("Donner", "Donner cette quantité à un autre joueur", function () {
        donnerDialogue(it, bornerAct());
      }));
      function retireQte(q, tout) {
        if (tout) { items.splice(items.indexOf(it), 1); sel = null; }
        else it.qte = Math.round((it.qte - q) * 100) / 100;
        render();
        refresh();
      }
      actions.appendChild(miniBtn("Retirer", "Retirer cette quantité (tout : l'objet disparaît)", function () {
        var q = bornerAct();
        var tout = q >= it.qte;
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
      majGroupes = [];
      panelHooks.length = 0;
      leftBox.innerHTML = "";
      leftBox.appendChild(groupeSurSoi());
      leftBox.appendChild(groupeLibre("poches", "Poches", poidsPoches, capPoches));
      leftBox.appendChild(groupeLibre("sac", "Sac à dos", poidsSac, capSac));
      renderPanel();
      updateTotal();
      applyEdit(container, "inv");
      panelHooks.forEach(function (f) { try { f(); } catch (e) {} });
    }
    hooks.push(function () {
      updateTotal();
      panelHooks.forEach(function (f) { try { f(); } catch (e) {} });
    });
    if (renderRef) renderRef.fn = render;
    invRender = render;   // un objet reçu du tchat redessine l'inventaire
    render();
    container.appendChild(wrap);
    container.appendChild(tot);
  }
