  // ---------- donner / prendre un objet (entre joueurs, par le tchat) ----------
  // Le donneur envoie au tchat une carte portant un lien « Prendre » : le
  // payload de l'objet y voyage en base64. L'extension intercepte le clic (la
  // fiche, dans son iframe, ne voit pas le tchat) et renvoie le payload à la
  // fiche du preneur. L'ENCODAGE VIT ICI, CÔTÉ SITE : son format peut évoluer
  // sans jamais re-signer l'extension, qui ne fait que relayer.
  var TAKE_CMD = "/owd_take";
  var IMG_MAX = 4000;   // une vignette plus lourde ne tient pas dans un message
  function b64encode(txt) {
    try {
      if (typeof TextEncoder !== "undefined") {
        var oct = new TextEncoder().encode(txt), s = "";
        for (var i = 0; i < oct.length; i++) s += String.fromCharCode(oct[i]);
        return btoa(s);
      }
    } catch (e) {}
    return btoa(unescape(encodeURIComponent(txt)));
  }
  function b64decode(b64) {
    var bin = atob(String(b64 || "").replace(/-/g, "+").replace(/_/g, "/"));
    try {
      if (typeof TextDecoder !== "undefined") {
        var oct = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) oct[i] = bin.charCodeAt(i);
        return new TextDecoder().decode(oct);
      }
    } catch (e) {}
    return decodeURIComponent(escape(bin));
  }
  // objet -> payload compact. CLÉS COURTES : le message de tchat est borné.
  //   n nom · q quantité · p poids · l places de contenance · d description
  //   k identifiant · a achat · v vente · i image · r accès rapide
  function packObjet(it, qte) {
    var p = {
      n: String(it.nom || ""), q: Math.max(0, pnum(qte)) || 1, p: pnum(it.poids),
      l: pnum(it.places), d: String(it.desc || ""), k: String(it.id || ""),
      a: pnum(it.achat)
    };
    if (it.vente != null) p.v = pnum(it.vente);   // absent : automatique
    if (it.rapide) p.r = 1;
    var img = String(it.img || "");
    if (img && (img.length <= IMG_MAX || !/^data:/.test(img))) p.i = img;
    return b64encode(JSON.stringify(p));
  }
  function unpackObjet(b64) {
    var o;
    try { o = JSON.parse(b64decode(b64)); } catch (e) { return null; }
    if (!o || typeof o !== "object") return null;
    return {
      nom: String(o.n || "Objet"), qte: Math.max(0, pnum(o.q)) || 1, poids: pnum(o.p),
      places: pnum(o.l), desc: String(o.d || ""), img: String(o.i || ""),
      id: String(o.k || ""), achat: pnum(o.a), vente: venteNum(o.v), rapide: !!o.r
    };
  }

  // Donner : combien, puis la carte part au tchat et la pile diminue d'autant.
  function donnerDialogue(it, qteDefaut) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "L'objet quitte l'inventaire et part dans le tchat : le premier joueur qui clique « Prendre » le reçoit."));
    var qIn = el("input", "n");
    qIn.type = "number"; qIn.min = "0"; qIn.max = String(it.qte); qIn.step = "any";
    qIn.value = fmtP(Math.min(pnum(qteDefaut) || it.qte, it.qte));
    corps.appendChild(fld("Quantité à donner (sur " + fmtP(it.qte) + ")", qIn));
    dialogue("Donner « " + (it.nom || "objet") + " »", corps, function () {
      var q = Math.min(pnum(qIn.value) || it.qte, it.qte);
      if (!it.qte || !q) { flash("Cet objet n'est plus en stock."); return; }
      // LE NOM PASSE PAR envSan : sans lui, un nom porteur d'une accolade ou
      // d'un saut de ligne compose une commande que l'extension refuse — et
      // l'objet serait quand même retiré de l'inventaire, donc perdu.
      var cmd = "&{template:default} {{name=Objet donné — " + (envSan(it.nom) || "objet") + "}}" +
                (q > 1 ? " {{Quantité=" + fmtP(q) + "}}" : "") +
                (it.desc ? " {{=" + envSan(it.desc) + "}}" : "") +
                " {{Prendre=[Prendre](" + TAKE_CMD + " " + packObjet(it, q) + ")}}";
      var enRoll20 = typeof window.__owdChat === "function";
      if (enRoll20) envoyer(cmd);
      else flash("Hors de Roll20 : rien n'est envoyé au tchat (l'objet reste dans l'inventaire).");
      // LA PILE NE DIMINUE QUE SI LE CANAL EXISTE : sinon l'objet partirait
      // sans que personne ne puisse le prendre.
      if (!enRoll20) return;
      it.qte = Math.max(0, Math.round((it.qte - q) * 100) / 100);
      if (!it.qte) {
        var i = state.inv.objets.indexOf(it);
        if (i >= 0) state.inv.objets.splice(i, 1);
      }
      refresh();
      if (invRender) invRender();
    }, "Donner");
  }

  // Prendre : l'objet arrive du tchat (relayé par l'extension). S'il existe
  // déjà, on empile les quantités et on tranche champ par champ ce qui diffère.
  var invRender = null;   // posé par invObjets : re-rendu de l'inventaire
  function recevoirObjet(payload) {
    var recu = unpackObjet(payload);
    if (!recu) { flash("Objet illisible (message abîmé)."); return; }
    var items = state.inv.objets;
    // Reconnaissance : d'abord l'IDENTIFIANT (deux homonymes distincts ne
    // fusionnent pas), à défaut le nom, insensible à la casse.
    var jumeau = null;
    if (recu.id) items.forEach(function (x) { if (!jumeau && x.id && x.id === recu.id) jumeau = x; });
    if (!jumeau) {
      items.forEach(function (x) {
        if (!jumeau && !x.id && !recu.id && pli(x.nom) === pli(recu.nom)) jumeau = x;
      });
    }

    var corps = el("div", "pc-modal-body");
    if (recu.img) {
      var imb = el("div", "pc-modal-img");
      var im = el("img"); im.alt = ""; im.src = recu.img;
      imb.appendChild(im);
      corps.appendChild(imb);
    }
    var qIn = el("input", "n");
    qIn.type = "number"; qIn.min = "0"; qIn.max = String(recu.qte); qIn.step = "any";
    qIn.value = fmtP(recu.qte);
    corps.appendChild(fld("Quantité à prendre (sur " + fmtP(recu.qte) + ")", qIn));

    var gSel = null;
    if (!jumeau) {
      gSel = el("select");
      [["sac", "Sac à dos"], ["poches", "Poches"]].forEach(function (g) {
        var o = el("option", null, g[1]);
        o.value = g[0];
        gSel.appendChild(o);
      });
      corps.appendChild(fld("Ranger dans", gSel));
    }

    // conflits : pour chaque champ qui diffère, garder le sien ou prendre le neuf
    var choix = {};
    if (jumeau) {
      corps.appendChild(el("div", "pc-modal-note",
        "« " + jumeau.nom + " » est déjà dans l'inventaire (" + fmtP(jumeau.qte) + ")" +
        (recu.id ? " — même identifiant" : "") + " : les quantités s'additionnent."));
      [["nom", "Nom"], ["img", "Image"], ["poids", "Poids"], ["places", "Volume"],
       ["desc", "Description"], ["achat", "Achat"], ["vente", "Vente"]].forEach(function (c) {
        function dit(o) {
          if (c[0] === "vente") return o.vente == null ? "automatique" : fmtP(o.vente);
          return String(o[c[0]] || "");
        }
        var mien = dit(jumeau), neuf = dit(recu);
        if (mien === neuf || (!mien && !neuf)) return;
        choix[c[0]] = "mien";
        var bloc = el("div", "pc-modal-conflit");
        bloc.appendChild(el("div", "lbl", c[1] + " : deux versions"));
        var row = el("div", "row");
        [["mien", "Garder le mien", mien], ["neuf", "Prendre le nouveau", neuf]].forEach(function (opt) {
          var bt = el("button", "pc-modal-choix" + (opt[0] === "mien" ? " on" : ""));
          bt.type = "button";
          bt.appendChild(el("div", "tag", opt[1]));
          if (c[0] === "img" && opt[2]) {
            var mi = el("img"); mi.alt = ""; mi.src = opt[2];
            bt.appendChild(mi);
          } else {
            bt.appendChild(el("div", "val", opt[2] ? opt[2] : "— vide —"));
          }
          bt.addEventListener("click", function () {
            choix[c[0]] = opt[0];
            Array.prototype.forEach.call(row.children, function (x) { x.classList.remove("on"); });
            bt.classList.add("on");
          });
          row.appendChild(bt);
        });
        bloc.appendChild(row);
        corps.appendChild(bloc);
      });
    }

    dialogue("Prendre « " + recu.nom + " »", corps, function () {
      var q = Math.min(pnum(qIn.value) || recu.qte, recu.qte);
      if (jumeau) {
        jumeau.qte = Math.round((jumeau.qte + q) * 100) / 100;
        ["nom", "img", "poids", "places", "desc", "achat", "vente"].forEach(function (k) {
          if (choix[k] === "neuf") jumeau[k] = recu[k];
        });
        if (!jumeau.id && recu.id) jumeau.id = recu.id;
      } else {
        items.push({
          id: recu.id, nom: recu.nom, img: recu.img, qte: q, poids: recu.poids,
          places: recu.places, achat: recu.achat, vente: recu.vente, desc: recu.desc,
          ou: gSel && gSel.value === "poches" ? "poches" : "sac",
          rapide: recu.rapide, vet: "", poches: 0, froid: 0, chaud: 0,
          sac: false, cap: 0, arme: null
        });
      }
      refresh();
      if (invRender) invRender();
      flash(fmtP(q) + " × « " + recu.nom + " » ajouté à l'inventaire.");
    }, "Prendre");
  }

