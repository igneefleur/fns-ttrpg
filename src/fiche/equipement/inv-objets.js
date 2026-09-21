  // ---- 14. Inventaire (pleine largeur) ----
  // QUATRE GROUPES FIXES, et rien d'autre dans l'onglet Équipement :
  //
  //   SUR SOI     [main gauche] [main droite]  ·  [ceinture] [sac à dos]
  //               [tête] [haut] [mains] [bas] [pieds]
  //               [boucles d'oreilles] [collier] [sous-vêtement] [poignet G] [poignet D]
  //               [bague G] [bague D] [cheville G] [cheville D] [cape]
  //   CEINTURE    les emplacements (ep) de la ceinture portée
  //   POCHES      ce que les vêtements et accessoires portés laissent emporter (en eb)
  //   SAC À DOS   les emplacements du sac porté, PUIS ce qu'il contient (en eb)
  //
  // Les cases de Sur soi sont TOUJOURS là, vides ou pleines ; chacune ne prend
  // que ce qui s'y porte. Un EMPLACEMENT tient un seul exemplaire, jusqu'à
  // l'encombrance au plus de sa ceinture ou de son sac, et ne compte dans
  // aucune capacité ; ils se montrent tous, même vides, avant tout le reste et
  // sur leurs propres lignes. Poches et sac se remplissent de tuiles, cinq par
  // ligne au plus.
  // Le détail de l'objet choisi occupe la colonne de droite : c'est là qu'on
  // dit ce qu'est un objet (vêtement, sac à dos, arme) et où il se trouve.
  //
  // Les images importées d'un fichier sont réduites en vignette pour tenir dans
  // la fiche (et dans les Attributes Roll20) ; préférer une URL quand c'est
  // possible.
  var INV_NOMS = {
    mainG: "Main gauche", mainD: "Main droite", ceinture: "Ceinture", dos: "Sac à dos",
    tete: "Tête", mains: "Mains", haut: "Haut", bas: "Bas", pieds: "Pieds",
    sousvet: "Sous-vêtement", hautbas: "Haut + Bas",
    oreilles: "Boucles d'oreilles", collier: "Collier",
    poignetG: "Poignet gauche", poignetD: "Poignet droit",
    bagueG: "Bague gauche", bagueD: "Bague droite",
    chevilleG: "Cheville gauche", chevilleD: "Cheville droite", cape: "Cape",
    poignet: "Poignet", bague: "Bague", cheville: "Cheville",
    ceint: "Ceinture", sacep: "Sac à dos", poches: "Poches", sac: "Sac à dos"
  };
  // le nom d'une case vide coupé à la main : les deux côtés d'une paire se
  // coupent au même endroit, jamais l'un seul parce que l'autre tient
  var CASE_LIGNES = {
    poignetG: "Poignet\ngauche", poignetD: "Poignet\ndroit",
    chevilleG: "Cheville\ngauche", chevilleD: "Cheville\ndroite"
  };
  // Un objet peut-il aller là ? Les poches et le sac prennent tout ; une case
  // de Sur soi, ce qui s'y porte. Les emplacements ont leur propre dépôt.
  function lieuPermis(o, ou) {
    if (ou === "poches" || ou === "sac") return true;
    return casePermise(o, ou);
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
          // le PORTRAIT des images du livre, 84 × 128
          var W = 84, H = 128, c = document.createElement("canvas");
          c.width = W; c.height = H;
          var k = Math.max(W / img.width, H / img.height);
          var w = img.width * k, h = img.height * k;
          c.getContext("2d").drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
          cb(c.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = function () { flash("Image illisible."); };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    }

    // DÉPLACER un objet vers `ou`, juste avant `cible` (null : à la fin). Une
    // case déjà prise ÉCHANGE : ce qu'elle tenait part là d'où l'objet vient,
    // ou au sac s'il n'y a pas sa place. Un objet à deux cases (robe, arme à
    // deux mains) libère les DEUX, et ce qui les tenait part au sac.
    function deplace(o, ou, cible) {
      if (!lieuPermis(o, ou)) { flash("« " + INV_NOMS[ou] + " » ne prend pas cet objet."); return false; }
      var dest = ancrage(o, ou), cases = casesDe(o, dest), vient = o.ou;
      var chasses = [];
      cases.forEach(function (c) {
        var occ = objetEn(c);
        if (occ && occ !== o && chasses.indexOf(occ) < 0) chasses.push(occ);
      });
      o.ou = dest;
      o.emp = -1;
      chasses.forEach(function (occ) {
        // l'échange simple : un seul occupant, qui tient là d'où l'objet vient
        var retour = chasses.length === 1 && lieuPermis(occ, vient) &&
                     casesDe(occ, vient).every(function (c) { return casesDe(o).indexOf(c) < 0; });
        occ.ou = retour ? ancrage(occ, vient) : "sac";
      });
      if (cible !== undefined) {
        items.splice(items.indexOf(o), 1);
        var at = cible ? items.indexOf(cible) : -1;
        if (at < 0) items.push(o);
        else items.splice(at, 0, o);
      }
      rangeEmplacements(items);   // une ceinture ôtée rend ses emplacements
      return true;
    }

    // POSER dans l'emplacement k de la ceinture (« ceint ») ou du sac
    // (« sacep ») : UN exemplaire, qu'on détache d'une pile, et pas plus
    // encombrant que l'emplacement ne l'accepte. Ce qui l'occupait retourne
    // d'où l'objet vient s'il y tient, au sac sinon.
    function poseEp(o, lieu, k) {
      if (!epPermis(o, lieu)) {
        flash(o === porteurEp(lieu) ? "Un contenant ne s'accroche pas à lui-même."
          : "Trop encombrant pour cet emplacement (" + fmtP(ebMaxEp(lieu)) + " eb au plus).");
        return null;
      }
      var vient = o.ou, vientK = o.emp;
      var pose = o;
      if (pnum(o.qte) > 1) {
        pose = JSON.parse(JSON.stringify(o));
        pose.qte = 1;
        o.qte = Math.round((o.qte - 1) * 100) / 100;
        items.splice(items.indexOf(o) + 1, 0, pose);
        vient = null;   // la pile reste où elle est : l'occupant va au sac
      }
      var occ = objetEp(lieu, k);
      pose.ou = lieu;
      pose.emp = k;
      if (occ && occ !== pose) {
        if (vient && INV_EP.indexOf(vient) >= 0 && epPermis(occ, vient)) { occ.ou = vient; occ.emp = vientK; }
        else if (vient === "poches" || vient === "sac") { occ.ou = vient; occ.emp = -1; }
        else { occ.ou = "sac"; occ.emp = -1; }
      }
      rangeEmplacements(items);
      return pose;
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
      // RANGER SE JOUE : on passe l'épée d'une main à l'autre, on range une
      // fiole dans les poches en pleine partie. Le glisser-déposer marche donc
      // hors du mode édition comme dedans.
      t.addEventListener("dragstart", function (e) {
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
      if (o) {
        c.appendChild(tile(o));
        // la SECONDE case d'un objet qui en tient deux : le même objet, en écho
        if (o.ou !== ou) c.classList.add("echo");
      } else c.appendChild(el("div", "pc-inv-vide", CASE_LIGNES[ou] || INV_NOMS[ou]));
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

    // un EMPLACEMENT : l'objet qu'il tient, ou l'encombrance qu'il accepte en creux
    function caseEp(lieu, k) {
      var c = el("div", "pc-inv-case pc-inv-ep");
      var o = objetEp(lieu, k);
      if (o) c.appendChild(tile(o));
      else c.appendChild(el("div", "pc-inv-vide", "≤ " + fmtP(ebMaxEp(lieu)) + " eb"));
      c.title = "Emplacement " + (k + 1) + " — " + fmtP(ebMaxEp(lieu)) + " eb au plus, un exemplaire";
      c.addEventListener("dragover", function (e) {
        if (!drag || !epPermis(drag, lieu)) return;
        e.preventDefault();
        e.stopPropagation();
        c.classList.add("over");
      });
      c.addEventListener("dragleave", function () { c.classList.remove("over"); });
      c.addEventListener("drop", function (e) {
        if (!drag) return;
        e.preventDefault();
        e.stopPropagation();
        var d = drag; drag = null;
        var pose = poseEp(d, lieu, k);
        if (pose) { sel = pose; refresh(); }
        render();
      });
      return c;
    }
    // les emplacements d'un lieu, cinq par ligne, sur leurs PROPRES lignes :
    // la dernière se complète de blancs, aucun objet libre ne s'y glisse
    function lignesEp(lieu) {
      var n = nbEp(lieu), box = el("div", "pc-inv-eps");
      for (var i = 0; i < n; i += 5) {
        var l = el("div", "pc-inv-cases");
        for (var k = i; k < i + 5; k++)
          l.appendChild(k < n ? caseEp(lieu, k) : el("div", "pc-inv-case pc-inv-rien"));
        box.appendChild(l);
      }
      return box;
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
      // l'ordre arrêté par l'auteur ; null laisse la case vide
      [["mainG", "mainD", null, "ceinture", "dos"],
       ["tete", "haut", "mains", "bas", "pieds"],
       ["oreilles", "collier", "sousvet", "poignetG", "poignetD"],
       ["bagueG", "bagueD", "chevilleG", "chevilleD", "cape"]].forEach(function (ligne) {
        var l = el("div", "pc-inv-cases");
        ligne.forEach(function (ou) {
          l.appendChild(ou ? caseSurSoi(ou) : el("div", "pc-inv-case pc-inv-rien"));
        });
        g.appendChild(l);
      });
      return g;
    }

    // le compte des emplacements tenus, pour un bandeau
    function compteEp(lieu) {
      var pds = el("span", "pds");
      pds.title = "Emplacements tenus contre emplacements";
      function maj() {
        var n = nbEp(lieu), pris = items.filter(function (o) { return o.ou === lieu; }).length;
        pds.textContent = pris + " / " + n + " ep";
      }
      maj();
      majGroupes.push(maj);
      return pds;
    }
    // CEINTURE : ses emplacements seuls, une ligne en pointillé sans ceinture
    function groupeCeinture() {
      var g = el("div", "pc-obj-group");
      g.appendChild(bandeau("Ceinture", compteEp("ceint")));
      if (nbEp("ceint")) g.appendChild(lignesEp("ceint"));
      else {
        var l = el("div", "pc-obj-tiles");
        l.style.setProperty("--obj-cols", 5);
        for (var k = 0; k < 5; k++) l.appendChild(el("div", "pc-obj-tile pc-inv-trou"));
        g.appendChild(l);
      }
      return g;
    }

    // POCHES et SAC À DOS : des tuiles, et l'encombrance contre la capacité.
    // Le sac montre D'ABORD ses emplacements, sur leurs propres lignes.
    function groupeLibre(ou, titre, poids, cap) {
      var g = el("div", "pc-obj-group");
      var pds = el("span", "pds");
      pds.title = "Encombrance contre capacité";
      function maj() {
        var p = poids(), c = cap();
        pds.textContent = fmtP(p) + " / " + fmtP(c) + " eb";
        pds.classList.toggle("over", p > c);
      }
      maj();
      majGroupes.push(maj);
      var head = bandeau(titre, pds);
      if (ou === "sac" && nbEp("sacep")) head.insertBefore(compteEp("sacep"), pds);
      g.appendChild(head);
      if (ou === "sac" && nbEp("sacep")) g.appendChild(lignesEp("sacep"));
      var tiles = el("div", "pc-obj-tiles");
      tiles.style.setProperty("--obj-cols", 5);
      items.forEach(function (it) { if (it.ou === ou) tiles.appendChild(tile(it)); });
      var add = el("div", "pc-obj-addtile pc-edit-only", "+");
      add.title = "Ajouter un objet dans « " + titre + " »";
      add.addEventListener("click", function () {
        var o = { id: "", nom: "", img: "", qte: 1, poids: 0, encombre: 0, places: 0, nourri: false, achat: 0, vente: null,
                  desc: "", ou: ou, emp: -1, rapide: false, vet: "", acc: "", poches: 0, froid: 0, chaud: 0,
                  sac: false, cap: 0, ceint: false, ep: 0, ebMax: 0, arme: null };
        items.push(o);
        sel = o;
        render();
        refresh();
      });
      tiles.appendChild(add);
      // LA LIGNE SE COMPLÈTE de cases vides en pointillé, et un groupe vide en
      // garde une entière : on voit la place qui reste. La case « + » de
      // l'édition compte dans la ligne.
      var n = items.filter(function (x) { return x.ou === ou; }).length + (isEdit("inv") ? 1 : 0);
      var trous = Math.max(5, Math.ceil(n / 5) * 5) - n;
      for (var k = 0; k < trous; k++) tiles.appendChild(el("div", "pc-obj-tile pc-inv-trou"));
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
      // SANS OBJET CHOISI, le panneau montre un objet FANTÔME : la même fiche,
      // vide et inerte. Le panneau garde ainsi sa forme et sa taille, et l'on
      // voit d'avance ce qu'un objet porte.
      if (sel && items.indexOf(sel) < 0) sel = null;
      var fantome = !sel;
      panel.classList.toggle("fantome", fantome);
      var it = sel || { id: "", nom: "", img: "", qte: 0, poids: 0, encombre: 0, places: 0, achat: 0, vente: null,
                        desc: "", ou: "sac", emp: -1, rapide: false, vet: "", acc: "", poches: 0, froid: 0, chaud: 0,
                        sac: false, cap: 0, ceint: false, ep: 0, ebMax: 0, arme: null };

      var imgbox = el("div", "pc-obj-imgbox");
      if (it.img) { var im = el("img"); im.alt = ""; im.src = it.img; imgbox.appendChild(im); }
      else imgbox.appendChild(el("div", "pc-obj-ph big", "?"));
      panel.appendChild(imgbox);

      var body = el("div", "pc-obj-body");

      // L'ORDRE DU DÉTAIL, arrêté par l'auteur :
      //   NOM
      //   NATURE | prise rapide      (puis ce que la nature demande)
      //   QUANTITÉ
      //   POIDS | ENCOMBRANCE
      //   ACHAT | VENTE
      //   IDENTIFIANT | IMAGE (URL)  (en édition seulement)
      //   DESCRIPTION
      //   [quantité] [Montrer] [Donner] [Supprimer]
      // L'emplacement ne s'y choisit pas : on range au glisser-déposer.
      var nm = el("input", "nm pc-edit-field");
      nm.type = "text"; nm.placeholder = fantome ? "Aucun objet" : "Nom de l'objet";
      nm.value = it.nom;
      nm.addEventListener("input", function () { it.nom = nm.value; save(); });
      nm.addEventListener("change", function () { render(); });
      body.appendChild(nm);

      // NATURE : objet, vêtement, sac à dos ou arme — une seule à la fois. En
      // changer renvoie au sac un objet qui n'a plus sa place dans sa case.
      var ligneNat = el("div", "pc-obj-pair");
      var nat = el("select", "pc-edit-field");
      var natureDe = it.arme ? "arme" : it.vet ? "vet" : it.acc ? "acc" : it.sac ? "sac" :
                     it.ceint ? "ceint" : it.nourri ? "nourri" : "";
      [["", "Objet"], ["nourri", "Nourriture"], ["vet", "Vêtement"], ["acc", "Accessoire"],
       ["sac", "Sac à dos"], ["ceint", "Ceinture"], ["arme", "Arme"]].forEach(function (n) {
        var o = el("option", null, n[1]);
        o.value = n[0];
        if (n[0] === natureDe) o.selected = true;
        nat.appendChild(o);
      });
      nat.addEventListener("change", function () {
        var v = nat.value;
        it.nourri = v === "nourri";
        it.sac = v === "sac";
        it.ceint = v === "ceint";
        it.vet = v === "vet" ? (it.vet || "haut") : "";
        it.acc = v === "acc" ? (it.acc || "collier") : "";
        it.arme = v === "arme" ? (it.arme || { prise: "", parade: "", reduction: "", comp: "", mains: 1, gestes: [] }) : null;
        if (INV_EP.indexOf(it.ou) < 0 && !lieuPermis(it, it.ou)) it.ou = "sac";
        rangeEmplacements(items);
        render();
        refresh();
      });
      ligneNat.appendChild(fld("Nature", nat));
      var kvR = el("div", "pc-kv");
      var labR = el("label", null, "");
      var cbR = el("input", "pc-edit-field");
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
      ligneNat.appendChild(kvR);
      body.appendChild(ligneNat);

      // ce que la nature demande, juste sous elle
      if (it.vet) {
        var pv = el("div", "pc-obj-pair");
        var typ = el("select", "pc-edit-field");
        INV_VETEMENTS.concat(["hautbas"]).forEach(function (v) {
          var o = el("option", null, INV_NOMS[v]);
          o.value = v;
          if (v === it.vet) o.selected = true;
          typ.appendChild(o);
        });
        typ.addEventListener("change", function () {
          it.vet = typ.value;
          if (!lieuPermis(it, it.ou)) it.ou = "sac";
          else if (INV_CASES.indexOf(it.ou) >= 0) deplace(it, it.ou);   // la robe prend aussi le bas
          render();
          refresh();
        });
        pv.appendChild(fld("Se porte", typ));
        pv.appendChild(champNombre("Poches", function () { return it.poches; },
          function (v) { it.poches = pnum(v); }, "Ce que ce vêtement porté ajoute aux Poches, en eb"));
        body.appendChild(pv);
        var pp = el("div", "pc-obj-pair");
        pp.appendChild(champNombre("Froid", function () { return it.froid; },
          function (v) { it.froid = snum(v); }, "Protection contre le froid, en degrés"));
        pp.appendChild(champNombre("Chaud", function () { return it.chaud; },
          function (v) { it.chaud = snum(v); }, "Protection contre le chaud, en degrés"));
        body.appendChild(pp);
      }
      // l'ACCESSOIRE : sa case, ses poches, sa protection
      if (it.acc) {
        var pa = el("div", "pc-obj-pair");
        var tya = el("select", "pc-edit-field");
        Object.keys(INV_ACC_TYPES).forEach(function (v) {
          var o = el("option", null, INV_NOMS[v]);
          o.value = v;
          if (v === it.acc) o.selected = true;
          tya.appendChild(o);
        });
        tya.addEventListener("change", function () {
          it.acc = tya.value;
          if (INV_EP.indexOf(it.ou) < 0 && !lieuPermis(it, it.ou)) it.ou = "sac";
          render();
          refresh();
        });
        pa.appendChild(fld("Se porte", tya));
        pa.appendChild(champNombre("Poches", function () { return it.poches; },
          function (v) { it.poches = pnum(v); }, "Ce que cet accessoire porté ajoute aux Poches, en eb"));
        body.appendChild(pa);
        var ppa = el("div", "pc-obj-pair");
        ppa.appendChild(champNombre("Froid", function () { return it.froid; },
          function (v) { it.froid = snum(v); }, "Protection contre le froid, en degrés"));
        ppa.appendChild(champNombre("Chaud", function () { return it.chaud; },
          function (v) { it.chaud = snum(v); }, "Protection contre le chaud, en degrés"));
        body.appendChild(ppa);
      }
      // les EMPLACEMENTS d'une ceinture ou d'un sac : leur nombre, et
      // l'encombrance au plus de chacun. Les changer redessine les groupes.
      function champsEp() {
        var pe = el("div", "pc-obj-pair");
        pe.appendChild(champNombre("Emplacements", function () { return it.ep; },
          function (v) { it.ep = Math.floor(pnum(v)); rangeEmplacements(items); }, "Nombre d'emplacements, en ep"));
        pe.appendChild(champNombre("Eb max", function () { return it.ebMax; },
          function (v) { it.ebMax = pnum(v); rangeEmplacements(items); }, "Encombrance au plus d'un emplacement, en eb"));
        Array.prototype.forEach.call(pe.querySelectorAll("input"), function (i) {
          i.addEventListener("change", function () { render(); });
        });
        return pe;
      }
      if (it.ceint) body.appendChild(champsEp());
      // la nourriture porte son VOLUME : ce qu'une dose ou une part occupe de
      // contenance une fois avalée
      if (it.nourri) {
        var pn = el("div", "pc-obj-pair");
        pn.appendChild(champNombre("Volume", function () { return it.places; },
          function (v) { it.places = pnum(v); }, "Ce qu'une dose ou une part occupe de contenance"));
        body.appendChild(pn);
      }
      if (it.sac) {
        var ps = el("div", "pc-obj-pair");
        ps.appendChild(champNombre("Capacité", function () { return it.cap; },
          function (v) { it.cap = pnum(v); }, "Ce que ce sac contient, en eb"));
        body.appendChild(ps);
        body.appendChild(champsEp());
      }
      // L'ARME : ses gestes et ses jets. Ses rafraîchissements vont au registre
      // du PANNEAU, vidé à chaque rendu : sinon chaque clic sur une tuile
      // laisserait des fonctions pointer sur un détail disparu.
      if (it.arme) {
        var pm = el("div", "pc-obj-pair");
        var mains = el("select", "pc-edit-field");
        [[1, "1 main"], [2, "2 mains"]].forEach(function (m) {
          var o = el("option", null, m[1]);
          o.value = String(m[0]);
          if (m[0] === (it.arme.mains || 1)) o.selected = true;
          mains.appendChild(o);
        });
        mains.addEventListener("change", function () {
          it.arme.mains = mains.value === "2" ? 2 : 1;
          // tenue en main, elle prend (ou rend) l'autre main tout de suite
          if (it.ou === "mainG" || it.ou === "mainD") deplace(it, it.ou);
          render();
          refresh();
        });
        pm.appendChild(fld("Se porte", mains));
        body.appendChild(pm);
      }
      if (it.arme && !fantome) {
        var ancien = hooks;
        hooks = panelHooks;
        try { body.appendChild(carteArme(it, function () { render(); })); }
        finally { hooks = ancien; }
      }

      // quantité : curseur à l'unité + champ, décimal (une demi-ration)
      var qRow = el("div", "pc-obj-qrow");
      var slider = el("input");
      slider.type = "range"; slider.min = "0";
      slider.max = String(Math.max(10, it.qte));
      slider.value = it.qte;
      slider.step = "1";   // à l'UNITÉ : on ne prend pas 3,27 fioles au curseur
      var qIn = el("input", "n");
      qIn.type = "number"; qIn.min = "0"; qIn.step = "any";
      qIn.value = it.qte;
      function setQte(v) {
        it.qte = isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
        if (+slider.max < it.qte) slider.max = String(it.qte);
        if (document.activeElement !== slider) slider.value = it.qte;
        if (document.activeElement !== qIn) qIn.value = it.qte;
        majAct();
        save(); updateTotal();
        refresh();   // le poids porté vient de bouger : la charge suit
      }
      slider.addEventListener("input", function () { setQte(Math.round(parseFloat(slider.value))); });
      qIn.addEventListener("input", function () { setQte(parseFloat(qIn.value)); });
      qRow.appendChild(slider);
      qRow.appendChild(qIn);
      body.appendChild(fld("Quantité", qRow));

      var pair = el("div", "pc-obj-pair");
      pair.appendChild(champNombre("Poids", function () { return it.poids; },
        function (v) { it.poids = pnum(v); }));
      pair.appendChild(champNombre("Encombrance", function () { return it.encombre; },
        function (v) { it.encombre = pnum(v); }, "En eb"));
      body.appendChild(pair);

      // achat / vente, en pièces d'argent : la monnaie du livre est NOMMÉE
      var prix = el("div", "pc-obj-pair");
      prix.appendChild(champNombre("Prix d'achat", function () { return it.achat; },
        function (v) { it.achat = pnum(v); majVente(); }, "Prix d'achat en " + monnaie(true)));
      // le prix de vente laissé vide est AUTOMATIQUE ; un nombre saisi, 0
      // compris, s'affiche tel quel
      var vIn = el("input", "pc-edit-field");
      vIn.type = "text"; vIn.inputMode = "decimal";
      vIn.placeholder = "automatique";
      function majVente() {
        if (document.activeElement !== vIn) vIn.value = it.vente == null ? "" : fmtP(it.vente);
        vIn.title = "Prix de vente en " + monnaie(true) + (it.vente == null ? " : " + fmtP(prixVente(it)) : "");
      }
      majVente();
      vIn.addEventListener("input", function () { it.vente = venteNum(vIn.value); save(); refresh(); majVente(); });
      vIn.addEventListener("blur", majVente);
      prix.appendChild(fld("Prix de vente", vIn));
      body.appendChild(prix);

      // identifiant et image : de la construction, en édition seulement.
      // L'identifiant reconnaît le même objet d'une fiche à l'autre quand on
      // le donne.
      var pairE = el("div", "pc-obj-pair pc-edit-only");
      var idIn = el("input", "pc-edit-field");
      idIn.type = "text"; idIn.placeholder = "ex. iron_sword";
      idIn.value = it.id || "";
      idIn.addEventListener("input", function () { it.id = idIn.value; save(); });
      pairE.appendChild(fld("Identifiant", idIn));
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
      urlFld.appendChild(miniBtn("Fichier…", "Importer une image (réduite en vignette 84 × 128)",
        function () { file.click(); }));
      pairE.appendChild(urlFld);
      body.appendChild(pairE);

      var desc = el("textarea", "pc-notes pc-edit-field");
      desc.rows = 3;
      desc.placeholder = "Description, effets, notes…";
      desc.value = it.desc;
      desc.addEventListener("input", function () { it.desc = desc.value; save(); });
      body.appendChild(fld("Description", desc, "w"));

      if (fantome) {
        Array.prototype.forEach.call(body.querySelectorAll("input, select, textarea, button"),
          function (x) { x.disabled = true; });
        panel.appendChild(body);
        return;
      }

      // quantité d'ACTION : combien d'exemplaires les boutons traitent. Elle
      // ne touche pas la pile tant qu'on n'agit pas.
      var actQte = el("input", "n");
      actQte.type = "number"; actQte.min = "0"; actQte.step = "any";
      actQte.title = "Quantité traitée par les boutons";
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
      var montrer = chatBtn(
        function () { return "Objet — " + (it.nom || "objet"); },
        function () {
          var q = bornerAct();
          return [
            ["Quantité", fmtP(q) + (q < it.qte ? " (sur " + fmtP(it.qte) + ")" : "")],
            ["Poids", it.poids ? fmtP(it.poids) + (q > 1 ? " (total " + fmtP(q * it.poids) + ")" : "") : ""],
            ["Encombrance", it.encombre ? fmtP(it.encombre) + " eb" : ""],
            ["Volume", it.nourri && it.places ? fmtP(it.places) : ""],
            ["Valeur", prixVente(it) ? "vente " + fmtP(prixVente(it)) + (it.achat ? " · achat " + fmtP(it.achat) : "")
                                : (it.achat ? "achat " + fmtP(it.achat) : "")],
            ["", it.desc]
          ];
        });
      montrer.textContent = "Montrer";
      actions.appendChild(montrer);
      actions.appendChild(miniBtn("Donner", "Donner cette quantité à un autre joueur", function () {
        donnerDialogue(it, bornerAct());
      }));
      function retireQte(q, tout) {
        if (tout) { items.splice(items.indexOf(it), 1); sel = null; }
        else it.qte = Math.round((it.qte - q) * 100) / 100;
        render();
        refresh();
      }
      actions.appendChild(miniBtn("Supprimer", "Supprimer cette quantité (tout : l'objet disparaît)", function () {
        var q = bornerAct();
        var tout = q >= it.qte;
        if (tout && (it.nom || it.desc)) {
          confirmer("Supprimer un objet",
                    "Supprimer « " + (it.nom || "cet objet") + " » de l'inventaire ?",
                    "Supprimer", function () { retireQte(q, true); });
          return;
        }
        retireQte(q, tout);
      }, "danger"));
      body.appendChild(actions);
      panel.appendChild(body);
    }

    // TOUTE LA HAUTEUR DE LA FENÊTRE (la page du site, ou l'iframe de Roll20),
    // moins le titre du module et son pied : défilé jusqu'à lui, le module
    // occupe l'écran entier, et ses deux colonnes défilent chacune dans cette
    // hauteur. Une fenêtre trop basse garde un plancher ; le module invisible
    // (onglet fermé) ne se mesure pas.
    function ajusteHauteur() {
      if (!wrap.isConnected || !wrap.offsetParent) return;
      // l'en-tête FIXE du site (absent dans Roll20) couvre le haut de l'écran
      var fixe = document.querySelector(".md-header");
      var autour = (wrap.getBoundingClientRect().top - container.getBoundingClientRect().top) +
                   tot.offsetHeight + 28 + (fixe ? fixe.offsetHeight : 0);
      var h = Math.max(420, Math.floor(window.innerHeight - autour));
      wrap.style.setProperty("--inv-h", h + "px");
    }
    window.addEventListener("resize", ajusteHauteur);
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (e) { if (e[0] && e[0].isIntersecting) ajusteHauteur(); })
        .observe(wrap);
    }
    function render() {
      majGroupes = [];
      panelHooks.length = 0;
      leftBox.innerHTML = "";
      leftBox.appendChild(groupeSurSoi());
      leftBox.appendChild(groupeCeinture());
      leftBox.appendChild(groupeLibre("poches", "Poches", ebPoches, capPoches));
      leftBox.appendChild(groupeLibre("sac", "Sac à dos", ebSac, capSac));
      renderPanel();
      updateTotal();
      applyEdit(container, "inv");
      panelHooks.forEach(function (f) { try { f(); } catch (e) {} });
    }
    hooks.push(function () {
      ajusteHauteur();
      updateTotal();
      panelHooks.forEach(function (f) { try { f(); } catch (e) {} });
    });
    if (renderRef) renderRef.fn = render;
    invRender = render;   // un objet reçu du tchat redessine l'inventaire
    render();
    container.appendChild(wrap);
    container.appendChild(tot);
  }
