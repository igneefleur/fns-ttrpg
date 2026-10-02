  // ---- Attaque : raccourcis d'arme et lecture des trajets ----
  // Une entrée ne possède AUCUNE valeur de combat : elle pointe vers un objet
  // d'arme de l'inventaire. Le TYPE de cette arme relie l'objet aux six coups
  // du livre (DATA.armes[].attaques), dont le trajet et la garde sont dessinés
  // ici. Le clic sur une carte de coup garde le geste du module précédent : il
  // envoie les dégâts dans le tchat.
  function buildAttaque() {
    var b = block("Attaque", null, "attaque", function () { rendre(); });
    var box = el("div", "pc-attaques");
    b.appendChild(box);
    var ouverts = Object.create(null);   // état d'interface seulement, jamais sauvegardé

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
    function degatsArme(it) {
      if (!it || !it.arme) return 0;
      var a = it.arme;
      var total = snum(a.degats);
      (Array.isArray(a.modsDegats) ? a.modsDegats : []).slice(0, 3).forEach(function (c) {
        if (c) total += Math.floor(caracTotal(c) / 5);
      });
      return Math.round(total * 1000) / 1000;
    }
    function typesCoup(def) {
      var types = def && Array.isArray(def.types) ? def.types : [];
      var touche = types[0] || "—";
      return { touche: touche, passage: types[1] || touche };
    }
    function envoieCoup(entree, it, coup, def) {
      var types = typesCoup(def);
      var plein = degatsArme(it);
      sayChat((coup && coup.nom ? coup.nom : "Attaque") + " — " + (it.nom || (def && def.nom) || "Arme"), [
        ["Case de touche", fmtP(plein) + " " + types.touche],
        ["Case de passage", fmtP(plein / 2) + " " + types.passage]
      ]);
    }

    // ---------- carte hexagonale ----------
    // Même géométrie que hooks/armes.py : hexagones à sommet plat, le porteur
    // au centre regardant vers le haut, trois anneaux autour de lui.
    var HX_NS = "http://www.w3.org/2000/svg";
    var HX_R = 10, HX_SQ3 = Math.sqrt(3), HX_PORTEE = 3;
    var HX_ANNEAUX = {};
    function svgEl(tag, attrs, txt) {
      var n = document.createElementNS(HX_NS, tag);
      Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      if (txt != null) n.textContent = txt;
      return n;
    }
    function hxDistance(q, r) { return (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2; }
    function hxCentre(q, r) { return [HX_R * 1.5 * q, HX_R * HX_SQ3 * (r + q / 2)]; }
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
    function hxEtapes(brut) {
      var out = [];
      String(brut || "").split(">").forEach(function (bout, i) {
        var p = bout.indexOf(":");
        if (p < 0) return;
        var c = hxCase(bout.slice(0, p));
        var role = bout.slice(p + 1).trim();
        if (c && (role === "frappe" || role === "passe")) out.push({ q: c[0], r: c[1], role: role, rang: i + 1 });
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
    function carteHex(brut) {
      var etapes = hxEtapes(brut), parCase = {};
      etapes.forEach(function (e) { parCase[e.q + "," + e.r] = e; });
      var largeur = HX_R * (1.5 * HX_PORTEE + 1);
      var hauteur = HX_R * HX_SQ3 * (HX_PORTEE + 0.5);
      var svg = svgEl("svg", {
        "class": "pc-attaque-carte", role: "img",
        "aria-label": "Trajet du coup : " + (brut || ""),
        viewBox: (-largeur).toFixed(1) + " " + (-hauteur).toFixed(1) + " " + (2 * largeur).toFixed(1) + " " + (2 * hauteur).toFixed(1)
      });
      for (var q = -HX_PORTEE; q <= HX_PORTEE; q++) for (var r = -HX_PORTEE; r <= HX_PORTEE; r++) {
        if (hxDistance(q, r) > HX_PORTEE) continue;
        var centre = hxCentre(q, r), e = parCase[q + "," + r];
        svg.appendChild(svgEl("polygon", {
          "class": e ? (e.role === "frappe" ? "hx-frappe" : "hx-passe") : "hx-vide",
          points: hxSommets(centre[0], centre[1], HX_R - 0.7)
        }));
      }
      etapes.forEach(function (e) {
        var c = hxCentre(e.q, e.r);
        svg.appendChild(svgEl("text", {
          "class": "hx-rang hx-rang--" + e.role, x: c[0].toFixed(2), y: c[1].toFixed(2), dy: "0.34em"
        }, String(e.rang)));
      });
      svg.appendChild(svgEl("polygon", { "class": "hx-soi", points: hxSommets(0, 0, HX_R - 0.7) }));
      return svg;
    }

    // ---------- carré de garde ----------
    function gardeCentre(i) {
      var col = (i - 1) % 3, rang = Math.floor((i - 1) / 3);
      return [4 + 8 * col, 4 + 8 * rang];
    }
    function gardeSvg(brut) {
      var m = /^(\d)\s*>\s*(\d)$/.exec(String(brut || "").trim());
      if (!m) return null;
      var depart = parseInt(m[1], 10), arrivee = parseInt(m[2], 10);
      if (depart < 1 || depart > 9 || arrivee < 1 || arrivee > 9) return null;
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
      var plein = degatsArme(it), types = typesCoup(def);
      var btn = el("button", "pc-attaque-coup");
      btn.type = "button";
      btn.title = "Envoyer les dégâts dans le tchat";
      btn.addEventListener("click", function () { envoieCoup(entree, it, coup, def); });
      btn.appendChild(carteHex(coup.trajet));

      var bas = el("div", "pc-attaque-coup-bas");
      var texte = el("div", "pc-attaque-coup-texte");
      texte.appendChild(el("div", "pc-attaque-coup-nom", coup.nom || "Attaque"));
      var chiffres = el("div", "pc-attaque-coup-degats");
      chiffres.appendChild(el("span", "touche", "Touche " + fmtP(plein) + " " + types.touche));
      chiffres.appendChild(el("span", "passage", "Passage " + fmtP(plein / 2) + " " + types.passage));
      texte.appendChild(chiffres);
      bas.appendChild(texte);
      var garde = gardeSvg(coup.garde);
      if (garde) bas.appendChild(garde);
      btn.appendChild(bas);
      return btn;
    }

    function carte(entree) {
      var card = el("div", "pc-attaque-card");
      var it = objetArme(entree.arme);

      // Le choix de l'arme n'existe qu'en édition. L'entrée garde une `ref`
      // interne : renommer l'objet dans l'inventaire ne casse pas le raccourci.
      var edit = el("div", "pc-attaque-edit pc-edit-only");
      var sel = el("select", "pc-select pc-edit-field");
      var armes = armesInventaire();
      var vide = el("option", null, "— Choisir une arme —");
      vide.value = "";
      sel.appendChild(vide);
      armes.forEach(function (o, i) {
        var op = el("option", null, o.nom || ((o.arme && o.arme.type) ? "Arme — " + o.arme.type : "Arme sans nom"));
        op.value = String(i);
        if (it === o) op.selected = true;
        sel.appendChild(op);
      });
      sel.addEventListener("change", function () {
        if (sel.value === "") entree.arme = "";
        else {
          var o = armes[parseInt(sel.value, 10)];
          entree.arme = assureRef(o);
          ouverts[entree.id] = true;
        }
        refresh();
      });
      edit.appendChild(fld("Arme", sel));
      edit.appendChild(miniBtn("✕", "Retirer cette attaque", function () {
        state.attaques = state.attaques.filter(function (a) { return a.id !== entree.id; });
        refresh();
      }, "danger pc-attaque-retire"));
      card.appendChild(edit);

      if (!it) {
        card.appendChild(el("div", "pc-empty pc-attaque-vide",
          entree.arme ? "Arme introuvable. Choisissez-en une autre en édition." : "Aucune arme choisie."));
        return card;
      }

      var def = typeArme(it.arme.type);
      var coups = def && Array.isArray(def.attaques) ? def.attaques : [];
      var ouvert = !!ouverts[entree.id];
      var tete = el("button", "pc-attaque-tete");
      tete.type = "button";
      tete.setAttribute("aria-expanded", ouvert ? "true" : "false");
      var nom = el("span", "pc-attaque-nom", it.nom || "Arme sans nom");
      tete.appendChild(nom);
      var meta = [];
      if (it.arme.type) meta.push((def && def.nom) || it.arme.type);
      if (String(it.arme.attaque || "").trim()) meta.push("Attaque " + it.arme.attaque);
      meta.push("Dégâts " + fmtP(degatsArme(it)));
      tete.appendChild(el("span", "pc-attaque-meta", meta.join(" · ")));
      tete.appendChild(el("span", "pc-attaque-chevron", ouvert ? "▾" : "▸"));
      tete.addEventListener("click", function () {
        ouverts[entree.id] = !ouverts[entree.id];
        rendre();
      });
      card.appendChild(tete);

      if (!ouvert) return card;
      var detail = el("div", "pc-attaque-detail");
      if (coups.length !== 6) {
        detail.appendChild(el("div", "pc-empty pc-attaque-vide",
          it.arme.type ? "Ce type d'arme n'a pas six attaques définies." : "Cette arme n'a pas de type défini."));
        card.appendChild(detail);
        return card;
      }

      var legende = el("div", "pc-attaque-legende");
      var lgSoi = el("span", null); lgSoi.appendChild(el("i", "soi")); lgSoi.appendChild(document.createTextNode("vous"));
      var lgTouche = el("span", null); lgTouche.appendChild(el("i", "touche")); lgTouche.appendChild(document.createTextNode("touche"));
      var lgPasse = el("span", null); lgPasse.appendChild(el("i", "passe")); lgPasse.appendChild(document.createTextNode("passage"));
      legende.appendChild(lgSoi); legende.appendChild(lgTouche); legende.appendChild(lgPasse);
      detail.appendChild(legende);

      var grille = el("div", "pc-attaque-coups");
      coups.forEach(function (coup) { grille.appendChild(carteCoup(entree, it, coup, def)); });
      detail.appendChild(grille);
      card.appendChild(detail);
      return card;
    }

    function rendre() {
      box.innerHTML = "";
      if (!Array.isArray(state.attaques)) state.attaques = [];
      state.attaques.forEach(function (a) { box.appendChild(carte(a)); });
      if (!state.attaques.length) box.appendChild(el("div", "pc-empty", "Aucune attaque."));
      box.appendChild(miniBtn("+ Ajouter une attaque", null, function () {
        var a = { id: uid("atk"), arme: "" };
        state.attaques.push(a);
        ouverts[a.id] = true;
        refresh();
      }, "pc-edit-only pc-attaque-ajout"));
      applyEdit(b, "attaque");
    }
    rendre();
    hooks.push(rendre);   // une arme modifiée dans l'inventaire se reflète ici immédiatement
    return b;
  }
