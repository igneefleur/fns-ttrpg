  // ---- Attaques liées aux armes ou créées librement ----
  var attaqueVue = { ouverts: Object.create(null), orientation: 0, miroirs: Object.create(null), portees: Object.create(null), gardes: Object.create(null), pinceaux: Object.create(null) };
  function buildAttaque() {
    // L'id technique reste « attaque » pour préserver les dispositions déjà
    // sauvegardées ; le titre visible devient « Attaques ».
    var b = block("Attaques", null, "attaque", function () { rendre(); });
    var box = el("div", "pc-attaques");
    b.appendChild(box);
    var ouverts = attaqueVue.ouverts;   // état d'interface seulement, jamais sauvegardé
    var orientation = attaqueVue.orientation;                 // 0 = haut, puis six directions dans le sens horaire
    var miroirs = attaqueVue.miroirs;   // par raccourci d'arme : main droite par défaut, gauche en miroir

    function armesInventaire() {
      var objets = state.inv && Array.isArray(state.inv.objets) ? state.inv.objets : [];
      return objets.filter(function (o) { return o && o.arme; });
    }
    function assureRef(o) {
      if (!o) return "";
      if (!o.ref) o.ref = uid("o");
      return String(o.ref);
    }
    function objetArme(ref) {
      var trouve = null;
      armesInventaire().forEach(function (o) {
        if (!trouve && String(o.ref || "") === String(ref || "")) trouve = o;
      });
      return trouve;
    }
    function typeArme(cle) {
      var trouve = null;
      armesData().forEach(function (d) {
        if (!trouve && d && d.cle === cle) trouve = d;
      });
      return trouve;
    }
    function modsDegatsArme(it) {
      if (!it || !it.arme) return 0;
      var a = it.arme, total = 0;
      (Array.isArray(a.modsDegats) ? a.modsDegats : []).slice(0, 3).forEach(function (c) {
        // Chaque MOD vaut toujours floor(CARAC / 5), indépendamment du
        // multiplicateur propre au coup.
        if (c) total += Math.floor(caracTotal(c) / 5);
      });
      return total;
    }
    function degatsArme(it) {
      if (!it || !it.arme) return 0;
      var total = Math.round((snum(it.arme.degats) + modsDegatsArme(it)) * 1000) / 1000;
      return state.combatOptions.attaques.lente ? Math.floor(total / 2) : total;
    }
    function typesCoup(coup, def) {
      var types = coup && Array.isArray(coup.types) ? coup.types :
        (def && Array.isArray(def.types) ? def.types : []);
      var touche = types[0] || "—";
      return { touche: touche, passage: types[1] || touche };
    }
    function multiplicateurCoup(coup) {
      var n = Number(coup && coup.mult);
      return isFinite(n) && n > 0 ? n : 1;
    }
    function degatsCoup(it, coup) {
      var base = snum(it && it.arme ? it.arme.degats : 0);
      var mods = modsDegatsArme(it), mult = multiplicateurCoup(coup);
      // Équilibrage : le multiplicateur du coup ne porte QUE sur les dégâts
      // de base de l'arme. Les MOD sont ajoutés ensuite, chacun valant
      // floor(CARAC / 5). Le passage vaut la moitié du résultat final.
      // L'epsilon évite uniquement les imprécisions binaires de 0.8/1.2/1.4.
      var touche = Math.floor(base * mult + 1e-9) + mods;
      if (state.combatOptions.attaques.lente) touche = Math.floor(touche / 2);
      return {
        mult: mult,
        touche: touche,
        passage: Math.floor(touche / 2)
      };
    }
    function fmtMult(n) {
      return "×" + Number(n || 1).toFixed(1);
    }

    // ---------- ressources consommées par une attaque ----------
    function objetInventaire(ref) {
      var trouve = null, objets = state.inv && Array.isArray(state.inv.objets) ? state.inv.objets : [];
      objets.forEach(function (o) {
        if (!trouve && o && String(o.ref || "") === String(ref || "")) trouve = o;
      });
      return trouve;
    }
    function coutEndurance(it) {
      // La dépense vient de CET objet d'arme, pas de son type du livre : une
      // arme personnalisée à difficulté 5 coûte donc bien 5 PE.
      return Math.max(0, snum(it && it.arme ? it.arme.attaque : 0));
    }
    function categorieMunition(def) {
      return def && def.munition && def.munition.cle ? String(def.munition.cle) : "";
    }
    function munitionsCompatibles(def) {
      var cat = categorieMunition(def), objets = state.inv && Array.isArray(state.inv.objets) ? state.inv.objets : [];
      if (!cat) return [];
      return objets.filter(function (o) {
        return o && String(o.contenu || "") === cat && pnum(o.qte) > 0;
      });
    }
    function contenantDe(o) {
      if (!o || !o.dans) return null;
      return objetInventaire(o.dans);
    }
    function libelleMunition(o) {
      var t = (o && o.nom) ? String(o.nom) : "Munition";
      t += " ×" + fmtP(pnum(o && o.qte));
      var c = contenantDe(o);
      if (c) t += " — " + (c.nom || "contenant");
      return t;
    }
    function munitionSelectionnee(entree, def) {
      var o = objetInventaire(entree && entree.munition);
      return o && String(o.contenu || "") === categorieMunition(def) ? o : null;
    }
    function retireUneMunition(o) {
      var objets = state.inv && Array.isArray(state.inv.objets) ? state.inv.objets : [];
      if (!o) return;
      if (pnum(o.qte) <= 1) {
        var i = objets.indexOf(o);
        if (i >= 0) objets.splice(i, 1);
        return;
      }
      o.qte = Math.round((pnum(o.qte) - 1) * 100) / 100;
    }
    function prepareRessources(entree, it, def) {
      var out = { endurance: coutEndurance(it), munition: null };
      if (state.combatOptions.attaques.utiliseMunition && categorieMunition(def)) {
        out.munition = munitionSelectionnee(entree, def);
        if (!out.munition || pnum(out.munition.qte) < 1) {
          flash("Choisissez une munition disponible avant d'attaquer.");
          return null;
        }
      }
      return out;
    }
    function executeAttaque(entree, it, def, envoyer) {
      var r = prepareRessources(entree, it, def);
      if (!r) return;
      if (state.combatOptions.attaques.utiliseEndurance && !state.combatOptions.attaques.lente && r.endurance > 0)
        state.etat.pe = Math.round((courant("pe") - r.endurance) * 100) / 100;
      if (state.combatOptions.attaques.utiliseMunition && r.munition) {
        var ref = String(r.munition.ref || "");
        retireUneMunition(r.munition);
        // Si la pile entière vient de disparaître, le sélecteur redevient vide.
        if (!objetInventaire(ref)) entree.munition = "";
      }
      envoyer();
      refresh();
    }
    function envoieCoup(entree, it, coup, def) {
      executeAttaque(entree, it, def, function () {
        var types = typesCoup(coup, def), dg = degatsCoup(it, coup);
        sayChat((coup && coup.nom ? coup.nom : "Attaque") + " — " + (it.nom || (def && def.nom) || "Arme"), [
          ["Case de touche", fmtP(dg.touche) + " " + types.touche],
          ["Case de passage", fmtP(dg.passage) + " " + types.passage]
        ]);
      });
    }
    function envoieAttaqueSimple(entree, it, def) {
      executeAttaque(entree, it, def, function () {
        var types = def && Array.isArray(def.types) ? def.types : [], type = types[0] || "—";
        sayChat("Attaque — " + (it.nom || (def && def.nom) || "Arme"), [
          ["Dégâts", fmtP(degatsArme(it)) + " " + type]
        ]);
      });
    }

    // ---------- carte hexagonale ----------
    // Même géométrie que hooks/armes.py : hexagones à sommet plat, le porteur
    // au centre regardant vers le haut, trois anneaux autour de lui.
    var HX_NS = "http://www.w3.org/2000/svg";
    var HX_R = 10, HX_SQ3 = Math.sqrt(3);
    var HX_ANNEAUX = {};
    function svgEl(tag, attrs, txt) {
      var n = document.createElementNS(HX_NS, tag);
      Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      if (txt != null) n.textContent = txt;
      return n;
    }
    function hxDistance(q, r) { return (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2; }
    function hxCentre(q, r) { return [HX_R * 1.5 * q, HX_R * HX_SQ3 * (r + q / 2)]; }
    function hxTransforme(q, r, ori, miroir) {
      var nq, nr, i;
      // Le miroir est fait DANS le repère du porteur, avant sa rotation : sa
      // gauche et sa droite restent donc sa gauche et sa droite quelle que soit
      // la direction dans laquelle il regarde.
      if (miroir) { nq = -q; nr = r + q; q = nq; r = nr; }
      for (i = 0; i < ori; i++) {
        nq = -r; nr = q + r; q = nq; r = nr;
      }
      return [q, r];
    }
    function hxAnneau(n) {
      if (HX_ANNEAUX[n]) return HX_ANNEAUX[n];
      var cells = [];
      for (var q = -n; q <= n; q++) for (var r = -n; r <= n; r++) {
        if (hxDistance(q, r) === n) cells.push([q, r]);
      }
      cells.sort(function (a, z) {
        var ac = hxCentre(a[0], a[1]), zc = hxCentre(z[0], z[1]);
        return Math.atan2(ac[0], -ac[1]) - Math.atan2(zc[0], -zc[1]);
      });
      var i0 = 0, mieux = Infinity;
      cells.forEach(function (c, i) {
        var p = hxCentre(c[0], c[1]);
        var d = Math.abs(Math.atan2(p[0], -p[1]));
        if (d < mieux) { mieux = d; i0 = i; }
      });
      HX_ANNEAUX[n] = cells.slice(i0).concat(cells.slice(0, i0));
      return HX_ANNEAUX[n];
    }
    function hxCase(nom) {
      var m = /^(soi|(\d+)(g*|d*)(\d*))$/.exec(String(nom || "").trim());
      if (!m) return null;
      if (m[1] === "soi") return [0, 0];
      var n = parseInt(m[2], 10), cote = m[3] || "", compte = m[4] || "";
      if (!n) return null;
      if (compte && cote.length !== 1) return null;
      var k = compte ? parseInt(compte, 10) : cote.length;
      if (cote.charAt(0) === "g") k = -k;
      if (Math.abs(k) > 3 * n) return null;
      var anneau = hxAnneau(n);
      return anneau[((k % (6 * n)) + 6 * n) % (6 * n)] || null;
    }
    function hxEtapes(brut, ori, miroir) {
      var out = [];
      String(brut || "").split(">").forEach(function (bout, i) {
        var p = bout.indexOf(":");
        if (p < 0) return;
        var c = hxCase(bout.slice(0, p));
        var role = bout.slice(p + 1).trim();
        if (c && (role === "frappe" || role === "passe")) {
          c = hxTransforme(c[0], c[1], ori, miroir);
          out.push({ q: c[0], r: c[1], role: role, rang: i + 1 });
        }
      });
      return out;
    }
    function hxSommets(cx, cy, rayon) {
      var pts = [];
      for (var i = 0; i < 6; i++) {
        var a = Math.PI * i / 3;
        pts.push((cx + rayon * Math.cos(a)).toFixed(2) + "," + (cy + rayon * Math.sin(a)).toFixed(2));
      }
      return pts.join(" ");
    }
    function carteHex(brut, ori, miroir, minimum) {
      var etapes = hxEtapes(brut, ori, miroir), parCase = {};
      etapes.forEach(function (e) { parCase[e.q + "," + e.r] = e; });
      var portee = Math.max(minimum || 1, etapes.reduce(function (n, e) { return Math.max(n, hxDistance(e.q, e.r)); }, 1));
      var largeur = HX_R * (1.5 * portee + 1);
      var hauteur = HX_R * HX_SQ3 * (portee + 0.5);
      var svg = svgEl("svg", {
        "class": "pc-attaque-carte", role: "img",
        "aria-label": "Trajet du coup : " + (brut || ""),
        viewBox: (-largeur).toFixed(1) + " " + (-hauteur).toFixed(1) + " " + (2 * largeur).toFixed(1) + " " + (2 * hauteur).toFixed(1)
      });
      for (var q = -portee; q <= portee; q++) for (var r = -portee; r <= portee; r++) {
        if (hxDistance(q, r) > portee) continue;
        var centre = hxCentre(q, r), e = parCase[q + "," + r];
        svg.appendChild(svgEl("polygon", {
          "class": e ? (e.role === "frappe" ? "hx-frappe" : "hx-passe") : "hx-vide",
          "data-q": q, "data-r": r, points: hxSommets(centre[0], centre[1], HX_R - 0.7)
        }));
      }
      etapes.forEach(function (e) {
        var c = hxCentre(e.q, e.r);
        svg.appendChild(svgEl("text", {
          "class": "hx-rang hx-rang--" + e.role, x: c[0].toFixed(2), y: c[1].toFixed(2), dy: "0.34em"
        }, String(e.rang)));
      });
      svg.appendChild(svgEl("polygon", { "class": "hx-soi", points: hxSommets(0, 0, HX_R - 0.7) }));
      svg.appendChild(svgEl("path", {
        "class": "hx-visee",
        d: "M 0 4 L 0 -5 M -2.4 -2.1 L 0 -5 L 2.4 -2.1",
        transform: "rotate(" + (ori * 60) + " 0 0)"
      }));
      return svg;
    }

    // ---------- carré de garde ----------
    function gardeCentre(i) {
      var col = (i - 1) % 3, rang = Math.floor((i - 1) / 3);
      return [4 + 8 * col, 4 + 8 * rang];
    }
    function miroirGarde(i) {
      var col = (i - 1) % 3, rang = Math.floor((i - 1) / 3);
      return rang * 3 + (2 - col) + 1;
    }
    function gardeSvg(brut, miroir) {
      var m = /^(\d)\s*>\s*(\d)$/.exec(String(brut || "").trim());
      if (!m) return null;
      var depart = parseInt(m[1], 10), arrivee = parseInt(m[2], 10);
      if (depart < 1 || depart > 9 || arrivee < 1 || arrivee > 9) return null;
      if (miroir) { depart = miroirGarde(depart); arrivee = miroirGarde(arrivee); }
      var svg = svgEl("svg", { "class": "pc-attaque-garde", role: "img", "aria-label": "Déplacement de la garde", viewBox: "0 0 24 24" });
      for (var i = 1; i <= 9; i++) {
        var c = gardeCentre(i);
        svg.appendChild(svgEl("rect", { "class": "gd-case", x: (c[0] - 3.4).toFixed(1), y: (c[1] - 3.4).toFixed(1), width: "6.8", height: "6.8", rx: "1" }));
      }
      var a = gardeCentre(depart), z = gardeCentre(arrivee);
      if (depart === arrivee) {
        svg.appendChild(svgEl("circle", { "class": "gd-fixe", cx: a[0], cy: a[1], r: "2.6" }));
        return svg;
      }
      var dx = z[0] - a[0], dy = z[1] - a[1], d = Math.sqrt(dx * dx + dy * dy);
      var ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
      var qx = a[0] + ux * 1.5, qy = a[1] + uy * 1.5;
      var px = z[0] - ux * 1.5, py = z[1] - uy * 1.5;
      var barbe = Math.min(3, 0.42 * Math.sqrt((px - qx) * (px - qx) + (py - qy) * (py - qy)));
      var rec = barbe * 0.848, ouv = barbe * 0.530;
      svg.appendChild(svgEl("path", { "class": "gd-fleche", d: "M " + qx.toFixed(2) + " " + qy.toFixed(2) + " L " + px.toFixed(2) + " " + py.toFixed(2) }));
      svg.appendChild(svgEl("path", { "class": "gd-pointe", d:
        "M " + (px - ux * rec + nx * ouv).toFixed(2) + " " + (py - uy * rec + ny * ouv).toFixed(2) +
        " L " + px.toFixed(2) + " " + py.toFixed(2) +
        " L " + (px - ux * rec - nx * ouv).toFixed(2) + " " + (py - uy * rec - ny * ouv).toFixed(2)
      }));
      return svg;
    }

    function carteCoup(entree, it, coup, def) {
      var dg = degatsCoup(it, coup), types = typesCoup(coup, def);
      var miroir = !!miroirs[entree.id];
      var btn = el("button", "pc-attaque-coup");
      btn.type = "button";
      btn.title = "Envoyer les dégâts dans le tchat";
      btn.addEventListener("click", function () { envoieCoup(entree, it, coup, def); });
      btn.appendChild(carteHex(coup.trajet, orientation, miroir, entree.personnalisee ? 1 : 3));
      if (window.__owdVueAttaques && window.__owdAttackPreview) {
        btn.addEventListener("pointerenter", function () {
          var path = hxEtapes(coup.trajet, 0, false).map(function (e) { return [e.q,e.r,e.role === "frappe" ? "hit" : "pass"]; });
          if (path.length) window.__owdAttackPreview({mirror:miroir,orientation:orientation,path:path});
        });
        btn.addEventListener("pointerleave", function () { window.__owdAttackPreview(null); });
      }

      var bas = el("div", "pc-attaque-coup-bas");
      var texte = el("div", "pc-attaque-coup-texte");
      var nom = el("div", "pc-attaque-coup-nom");
      nom.appendChild(document.createTextNode(coup.nom || "Attaque"));
      nom.appendChild(el("span", "pc-attaque-mult", fmtMult(dg.mult)));
      texte.appendChild(nom);
      var chiffres = el("div", "pc-attaque-coup-degats");
      chiffres.appendChild(el("span", "touche", "Touche " + fmtP(dg.touche) + " " + types.touche));
      chiffres.appendChild(el("span", "passage", "Passage " + fmtP(dg.passage) + " " + types.passage));
      texte.appendChild(chiffres);
      bas.appendChild(texte);
      var garde = gardeSvg(coup.garde, miroir);
      if (garde) bas.appendChild(garde);
      btn.appendChild(bas);
      return btn;
    }

    function editeurTrajet(entree) {
      var box = el("div", "pc-attaque-editor"), path = hxEtapes(entree.personnalisee.trajet, 0, false);
      var rayon = Math.max(3, attaqueVue.portees[entree.id] || 3, path.reduce(function (n, e) { return Math.max(n, hxDistance(e.q, e.r)); }, 0));
      var brush = attaqueVue.pinceaux[entree.id] || "frappe";
      var tools = el("div", "pc-attaque-editor-tools pc-attaque-editor-paint");
      [["frappe", "Touche"], ["passe", "Passage"]].forEach(function (v) {
        var bt = miniBtn(v[1], null, function () { attaqueVue.pinceaux[entree.id] = v[0]; rendre(); }, brush === v[0] ? "on" : "");
        bt.setAttribute("aria-pressed", String(brush === v[0])); tools.appendChild(bt);
      });
      box.appendChild(tools);
      var svg = carteHex(entree.personnalisee.trajet, 0, false, rayon);
      function ecrit() {
        entree.personnalisee.trajet = path.map(function (e) {
          var n = hxDistance(e.q, e.r), cells = hxAnneau(n), at = -1;
          cells.some(function (c, i) { if (c[0] === e.q && c[1] === e.r) { at = i; return true; } return false; });
          var nom = String(n) + (at === 0 ? "" : at <= 3 * n ? "d" + at : "g" + (6 * n - at));
          return nom + ":" + e.role;
        }).join(">");
        refresh();
      }
      Array.prototype.forEach.call(svg.querySelectorAll("polygon[data-q]"), function (cell) {
        var q = Number(cell.getAttribute("data-q")), r = Number(cell.getAttribute("data-r"));
        if (!q && !r) return;
        cell.setAttribute("tabindex", "0"); cell.setAttribute("role", "button");
        cell.setAttribute("aria-label", "Case " + q + ", " + r);
        function peint() {
          var at = -1; path.some(function (e, i) { if (e.q === q && e.r === r) { at = i; return true; } return false; });
          if (brush === "efface") { if (at >= 0) path.splice(at, 1); }
          else if (at >= 0) path[at].role = brush;
          else path.push({ q: q, r: r, role: brush });
          ecrit();
        }
        cell.addEventListener("click", peint);
        cell.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); peint(); } });
      });
      box.appendChild(svg);
      var efface = el("div", "pc-attaque-editor-tools pc-attaque-editor-erase");
      var gomme = miniBtn("Effacer", null, function () { attaqueVue.pinceaux[entree.id] = "efface"; rendre(); }, brush === "efface" ? "on" : "");
      gomme.setAttribute("aria-pressed", String(brush === "efface")); efface.appendChild(gomme);
      efface.appendChild(miniBtn("Tout Effacer", null, function () { path = []; ecrit(); }));
      box.insertBefore(efface, svg);
      var pieds = el("div", "pc-attaque-editor-tools pc-attaque-editor-range");
      pieds.appendChild(miniBtn("−", "Réduire la grille", function () { attaqueVue.portees[entree.id] = Math.max(3, rayon - 1); rendre(); }));
      pieds.appendChild(el("span", null, "Portée " + rayon));
      pieds.appendChild(miniBtn("+", "Agrandir la grille", function () { attaqueVue.portees[entree.id] = rayon + 1; rendre(); }));
      box.appendChild(pieds);
      return box;
    }

    function editeurGarde(entree) {
      var box = el("div", "pc-garde-editor"); box.appendChild(el("div", "pc-attaque-section-titre", "Garde"));
      var svg = gardeSvg(entree.personnalisee.garde || "5>5", false); svg.classList.add("pc-garde-dessin");
      svg.setAttribute("aria-label", "Dessiner la garde"); svg.setAttribute("role", "group");
      if (!entree.personnalisee.garde) Array.prototype.forEach.call(svg.querySelectorAll("circle,path"), function (n) { n.remove(); });
      Array.prototype.forEach.call(svg.querySelectorAll("rect"), function (cell, i) {
        var n = i + 1; cell.setAttribute("role", "button"); cell.setAttribute("tabindex", "0"); cell.setAttribute("aria-label", "Garde case " + n);
        function dessine() {
          var depart = attaqueVue.gardes[entree.id];
          entree.personnalisee.garde = (depart || n) + ">" + n;
          if (depart) delete attaqueVue.gardes[entree.id]; else attaqueVue.gardes[entree.id] = n;
          refresh();
        }
        cell.addEventListener("click", dessine);
        cell.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); dessine(); } });
      });
      box.appendChild(svg); box.appendChild(miniBtn("Effacer la garde", null, function () { entree.personnalisee.garde = ""; delete attaqueVue.gardes[entree.id]; refresh(); })); return box;
    }

    function carte(entree) {
      var card = el("div", "pc-attaque-card"); card.dataset.attackId = entree.id;
      var it = entree.personnalisee ? { nom: entree.nom || "Attaque personnalisée", arme: entree.personnalisee } : objetArme(entree.arme);

      var ouvert = !!ouverts[entree.id], def = it && typeArme(it.arme.type), meta = [];
      if (it) {
        if (it.arme.type) meta.push((def && def.nom) || it.arme.type);
        if (String(it.arme.attaque || "").trim()) meta.push("Attaque " + it.arme.attaque);
        meta.push("Dégâts " + fmtP(degatsArme(it)));
      }
      combatCarteTete(card, it ? it.nom || "Arme sans nom" : "Nouvelle attaque", meta.join(" · "), ouvert, "attaque", entree.id,
        function () { ouverts[entree.id] = !ouverts[entree.id]; rendre(); }, function () { return state.attaques; });
      if (!ouvert) return card;
      function supprimer() { combatSupprimer(card, function () { state.attaques = state.attaques.filter(function (a) { return a.id !== entree.id; }); refresh(); }); }

      // Le choix de l'arme n'existe qu'en édition. L'entrée garde une `ref`
      // interne : renommer l'objet dans l'inventaire ne casse pas le raccourci.
      var edit = el("div", "pc-attaque-edit pc-edit-only");
      var choix = el("div", "pc-attaque-choix");
      var type = el("select", "pc-select pc-edit-field pc-attaque-type");
      [["arme", "Armes"], ["custom", "Attaque personnalisée"]].forEach(function (v) {
        var op = el("option", null, v[1]); op.value = v[0]; op.selected = (entree.personnalisee ? "custom" : "arme") === v[0]; type.appendChild(op);
      });
      type.addEventListener("change", function () {
        if (type.value === "custom") {
          entree.arme = "";
          entree.personnalisee = entree.personnalisee || { attaque: "8", degats: "0", modsDegats: ["", "", ""], modsParade: ["", "", ""], comp: "", type: "", mult: "1", trajet: "", garde: "", touche: "", passage: "" };
        } else entree.personnalisee = null;
        ouverts[entree.id] = true; refresh();
      });
      choix.appendChild(fld("Type", type));
      if (entree.personnalisee) choix.appendChild(combatTexte("Nom", entree, "nom"));
      else {
        var source = el("select", "pc-select pc-edit-field pc-attaque-source"), vide = el("option", null, "— Choisir une arme —"); vide.value = ""; source.appendChild(vide);
        armesInventaire().forEach(function (o) { var op = el("option", null, o.nom || "Arme sans nom"); op.value = assureRef(o); op.selected = it === o; source.appendChild(op); });
        if (entree.arme && !it) { var absent = el("option", null, "Arme introuvable"); absent.value = entree.arme; absent.selected = true; source.appendChild(absent); }
        source.addEventListener("change", function () { entree.arme = source.value; ouverts[entree.id] = true; refresh(); });
        choix.appendChild(fld("Source", source));
      }
      edit.appendChild(choix);
      if (entree.personnalisee) {
        var layout = el("div", "pc-attaque-custom-layout"), infos = el("div", "pc-attaque-custom-info");
        var dessin = el("div", "pc-attaque-custom-dessin"); dessin.appendChild(editeurTrajet(entree));
        var mult = el("div", "pc-attaque-editor-mult"); mult.appendChild(combatTexte("Multiplicateur", entree.personnalisee, "mult")); dessin.appendChild(mult);
        var types = el("div", "pc-attaque-editor-types");
        types.appendChild(fld("Type de touche", combatType(entree.personnalisee, "touche")));
        types.appendChild(fld("Type de passage", combatType(entree.personnalisee, "passage"))); dessin.appendChild(types);
        layout.appendChild(dessin); infos.appendChild(carteArme(it, true)); infos.appendChild(editeurGarde(entree)); layout.appendChild(infos); edit.appendChild(layout);
      }
      card.appendChild(edit);
      if (isEdit("attaque") && entree.personnalisee) { supprimer(); return card; }

      if (!it) {
        card.appendChild(el("div", "pc-empty pc-attaque-vide",
          entree.arme ? "Arme introuvable. Choisissez-en une autre en édition." : "Aucune arme choisie."));
        supprimer(); return card;
      }

      def = typeArme(it.arme.type);
      var coups = def && Array.isArray(def.attaques) ? def.attaques : [];
      if (entree.personnalisee && it.arme.trajet) coups = [{ nom: it.nom, mult: it.arme.mult,
        trajet: it.arme.trajet, garde: it.arme.garde, types: [it.arme.touche, it.arme.passage || it.arme.touche] }];
      if (entree.personnalisee && !it.arme.trajet && !it.arme.type) def = { types: [it.arme.touche] };
      var detail = el("div", "pc-attaque-detail");

      if (categorieMunition(def)) {
        var munBox = el("div", "pc-attaque-munitions");
        var sm = el("select", "pc-select pc-attaque-munition");
        var om0 = el("option", null, "— Choisir une munition —"); om0.value = ""; sm.appendChild(om0);
        var compatibles = munitionsCompatibles(def), trouveMunition = false;
        compatibles.forEach(function (o) {
          var op = el("option", null, libelleMunition(o));
          op.value = assureRef(o);
          if (op.value === String(entree.munition || "")) { op.selected = true; trouveMunition = true; }
          sm.appendChild(op);
        });
        if (entree.munition && !trouveMunition) {
          var ancienne = el("option", null, "Munition indisponible");
          ancienne.value = String(entree.munition); ancienne.selected = true; sm.appendChild(ancienne);
        }
        sm.addEventListener("change", function () { entree.munition = sm.value; refresh(); });
        munBox.appendChild(fld("Munitions", sm));
        detail.appendChild(munBox);
      }

      // Les armes de mêlée du livre ont six trajets. Les armes à distance,
      // boucliers et armes de jet sans trajet gardent néanmoins un vrai bouton
      // d'attaque : il envoie simplement leurs dégâts de base + MOD et leur type.
      if (!coups.length) {
        var simple = el("button", "pc-attaque-simple");
        simple.type = "button";
        var stypes = def && Array.isArray(def.types) ? def.types : [];
        simple.appendChild(el("strong", null, "Attaquer"));
        simple.appendChild(el("span", null, fmtP(degatsArme(it)) + " " + (stypes[0] || "—")));
        simple.addEventListener("click", function () { envoieAttaqueSimple(entree, it, def); });
        detail.appendChild(simple);
        card.appendChild(detail);
        supprimer(); return card;
      }

      detail.appendChild(el("div", "pc-attaque-section-titre", "Trajets et Attaques"));
      var legende = el("div", "pc-attaque-legende");
      var cles = el("div", "pc-attaque-legende-cles");
      var lgSoi = el("span", null); lgSoi.appendChild(el("i", "soi")); lgSoi.appendChild(document.createTextNode("vous"));
      var lgTouche = el("span", null); lgTouche.appendChild(el("i", "touche")); lgTouche.appendChild(document.createTextNode("touche"));
      var lgPasse = el("span", null); lgPasse.appendChild(el("i", "passe")); lgPasse.appendChild(document.createTextNode("passage"));
      cles.appendChild(lgSoi); cles.appendChild(lgTouche); cles.appendChild(lgPasse);
      legende.appendChild(cles);

      var controles = el("div", "pc-attaque-controles");
      var visee = el("label", "pc-attaque-visee");
      visee.appendChild(el("span", null, "Visée"));
      var selOri = el("select", "pc-select pc-attaque-orientation");
      ["↑", "↗", "↘", "↓", "↙", "↖"].forEach(function (sym, i) {
        var op = el("option", null, sym); op.value = String(i);
        if (i === orientation) op.selected = true;
        selOri.appendChild(op);
      });
      selOri.setAttribute("aria-label", "Orientation du personnage");
      selOri.addEventListener("change", function () {
        orientation = Math.max(0, Math.min(5, parseInt(selOri.value, 10) || 0));
        attaqueVue.orientation = orientation;
        rendre();
      });
      visee.appendChild(selOri);
      controles.appendChild(visee);

      var mir = el("button", "pc-mini pc-attaque-miroir" + (miroirs[entree.id] ? " on" : ""), "⇋ Miroir");
      mir.type = "button";
      mir.setAttribute("aria-pressed", miroirs[entree.id] ? "true" : "false");
      mir.title = miroirs[entree.id] ? "Arme tenue en main gauche : revenir en main droite" : "Passer l'arme de la main droite à la main gauche";
      mir.addEventListener("click", function () {
        miroirs[entree.id] = !miroirs[entree.id];
        rendre();
      });
      controles.appendChild(mir);
      legende.appendChild(controles);
      detail.appendChild(legende);

      var grille = el("div", "pc-attaque-coups");
      coups.forEach(function (coup) { grille.appendChild(carteCoup(entree, it, coup, def)); });
      detail.appendChild(grille);
      card.appendChild(detail);
      supprimer(); return card;
    }

    function rendre() {
      if (window.__owdVueAttaques && window.__owdAttackPreview) window.__owdAttackPreview(null);
      box.innerHTML = "";
      if (!Array.isArray(state.attaques)) state.attaques = [];
      var ressources = el("div", "pc-attaque-ressources pc-combat-ressources");
      ressources.appendChild(combatRessource(state.combatOptions.attaques, "lente", "Attaque Lente"));
      ressources.appendChild(combatEndurance(state.combatOptions.attaques));
      ressources.appendChild(combatRessource(state.combatOptions.attaques, "utiliseMunition", "Consommer Munition"));
      box.appendChild(ressources);
      state.attaques.forEach(function (a) { box.appendChild(carte(a)); });
      if (!state.attaques.length) box.appendChild(el("div", "pc-empty", "Aucune attaque."));
      box.appendChild(miniBtn("+ Ajouter une attaque", null, function () {
        var a = { id: uid("atk"), arme: "", munition: "" };
        state.attaques.push(a);
        ouverts[a.id] = true;
        refresh();
      }, "pc-edit-only pc-attaque-ajout"));
      applyEdit(b, "attaque");
    }
    if (window.__owdVueAttaques && window.__owdAttackPreview) remontageNettoyage.push(function () { window.__owdAttackPreview(null); });
    rendre();
    hooks.push(rendre);   // une arme modifiée dans l'inventaire se reflète ici immédiatement
    return b;
  }
