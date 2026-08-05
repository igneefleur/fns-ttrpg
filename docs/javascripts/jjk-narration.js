/* Plateau de Narration — le contenu du panneau flottant de Roll20.
 *
 * CE QUE C'EST. La table de narration, celle qu'on faisait avec de vrais
 * jetons posés dans un coin de la carte : la réserve du MJ à gauche, les
 * joueurs à droite, et des jetons qu'on pousse de l'un vers l'autre au fil de
 * la partie. Tout le monde voit le même plateau, en même temps.
 *
 * CE QUE CE N'EST PAS. Une comptabilité. Aucun jeton n'appartient à personne :
 * il est POSÉ quelque part, et c'est sa position qui dit à qui il est. Le
 * compte affiché sur chaque place est un calcul de géométrie, jamais une valeur
 * enregistrée. D'où l'absence totale de protocole d'échange : donner un point,
 * c'est le pousser, comme sur la table.
 *
 * OÙ VIT L'ÉTAT. Dans les Attributes d'un personnage Roll20 nommé
 * « Narration », que le MJ partage à tous les joueurs (c'est le seul objet de
 * la campagne où chacun a lecture ET écriture : un joueur ne peut pas lire la
 * fiche d'un autre joueur). Deux natures d'attributs, et deux seulement :
 *
 *   jjk_narr_conf     la configuration (les places, les portraits, la donne),
 *                     en JSON. Elle change rarement, et une seule personne à la
 *                     fois y touche : un seul attribut convient.
 *   jjk_narr_pt_<id>  UN JETON, « x,y » en millièmes du plateau. Un attribut
 *                     par jeton, et x et y ENSEMBLE : plus fin serait deux
 *                     écritures pour un seul geste, plus gros ferait qu'un
 *                     joueur qui pousse son jeton écraserait le geste
 *                     simultané d'un autre (Roll20 n'a pas de transaction :
 *                     le dernier qui écrit gagne). Une valeur vide = jeton
 *                     retiré du plateau.
 *
 * COMMENT ÇA PARLE À ROLL20. Par le pont d20 de l'extension, exactement comme
 * la fiche : postMessage vers window.top, réponses par ev.source. Le pont ne
 * laisse écrire que des attributs « jjk_ », et lie une frame au premier
 * personnage qu'elle charge — cette page ne charge donc que « Narration », et
 * ne peut rien écrire ailleurs.
 *
 * FRAÎCHEUR. Le pont ne pousse rien de lui-même : le plateau redemande l'état
 * toutes les 1.2 s. Sur une table qui bouge trois fois par heure, personne ne
 * verra la différence avec du temps réel, et rien ne peut s'emballer.
 */
(function () {
  "use strict";

  var NS = "jjk";
  var PREF = "jjk_narr_";
  var A_CONF = PREF + "conf";
  var A_PT = PREF + "pt_";
  var POLL = 1200;          // ms entre deux relectures
  var GARDE = 4000;         // ms pendant lesquelles une écriture locale prime sur l'écho
  var PONT_PAS = 60;        // ms entre deux écritures d'attribut, côté pont
  var ATTENTE_PONT = 2500;  // ms avant de déclarer que Roll20 ne répond pas
  var MILLE = 1000;         // les coordonnées sont des millièmes du plateau

  // ---------- état ----------
  var charId = null;        // personnage « Narration » (null = pas trouvé)
  var ecrivable = false;    // ce que le pont ANNONCE des droits du joueur
  var refuse = false;       // ce que Roll20 a montré en refusant nos écritures
  // Trois raisons de ne pas toucher au plateau, et une seule question à poser :
  // le pont annonce que ce joueur n'a pas la main, Roll20 a refusé nos
  // écritures, ou le plateau a été écrit par une version plus récente.
  function peutPousser() { return ecrivable && !refuse && !confFuture; }
  var conf = confVide();
  var points = {};          // id -> {x, y}
  var attente = {};         // nom d'attribut -> {val, t} : nos écritures pas encore revenues
  var prise = null;         // jeton en cours de déplacement
  var timer = null;
  var lu = false;           // au moins une lecture réussie
  var repondu = false;      // le pont a parlé, même pour dire qu'il n'y a rien

  // Version du FORMAT de la configuration. Elle ne sert qu'à une chose, mais
  // elle y sert vraiment : une table dont le plateau a été configuré par une
  // version plus récente passe en lecture seule au lieu de se faire réécrire
  // en silence par un code qui n'en comprend qu'une partie. Le plateau n'a ni
  // migrations ni archives, contrairement à la fiche : c'est son seul filet.
  var V_CONF = 1;
  var confFuture = false;

  function confVide() {
    return {
      v: V_CONF,
      seq: 0,                             // compteur d'identifiants de jetons
      mj: { nom: "MJ", img: "" },
      joueurs: [],                        // [{ id, nom, img }]
      donne: { mj: 3, joueur: 3 }         // jetons créés à la distribution
    };
  }

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function entier(v, def) { var n = parseInt(v, 10); return isFinite(n) ? n : def; }

  // ---------- dialogue avec le pont ----------
  function post(msg) {
    msg.ns = NS;
    try { window.top.postMessage(msg, "*"); } catch (e) {}
  }
  // Le pont d20 n'est injecté par l'extension que sur demande, et rien ne dit
  // qu'une fiche a déjà été ouverte dans cette partie : le plateau réclame donc
  // le pont lui-même avant de parler. L'injection est idempotente, le redemander
  // ne coûte rien.
  function demandePerso() {
    post({ type: "need-bridge" });
    post({ type: "narration-char" });
  }
  function demandeEtat() { if (charId) post({ type: "load", charId: charId }); }
  // Une écriture = un lot d'attributs. On note ce qu'on vient d'écrire : l'écho
  // met un aller-retour à revenir, et sans cette note la relecture suivante
  // remettrait le jeton là où il était avant notre geste.
  function ecrire(attrs) {
    if (!charId || !peutPousser()) return;
    var lot = {}, t = Date.now();
    var noms = Object.keys(attrs);
    // Le pont écrit un attribut à la fois, espacés : le dernier d'un gros lot
    // n'arrive chez Roll20 que bien après le premier. La garde qui protège nos
    // valeurs de l'écho périmé doit donc tenir compte de la LONGUEUR du lot,
    // sinon la queue d'une distribution revient visiblement en arrière avant
    // d'être enfin écrite.
    var marge = GARDE + noms.length * PONT_PAS;
    noms.forEach(function (n) {
      var v = String(attrs[n] == null ? "" : attrs[n]);
      lot[n] = { current: v, max: "" };
      attente[n] = { val: v, t: t, marge: marge };
    });
    post({ type: "save", charId: charId, attrs: lot });
  }

  window.addEventListener("message", function (ev) {
    try {
      var d = ev.data;
      if (!d || d.ns !== NS) return;
      // Le pont vit dans la fenêtre du haut de Roll20 : ses réponses en
      // viennent, et de nulle part ailleurs. Sans ce contrôle, n'importe quelle
      // frame de la page (un mod, par exemple) pourrait faire pointer le
      // plateau sur un autre personnage.
      if (ev.source !== window.top) return;
      if (d.type === "narration-char-result") {
        repondu = true;
        if (!d.charId) {
          charId = null;
          // « pas de plateau » ne se dit que si la campagne est chargée : au
          // démarrage, Roll20 met une seconde ou deux à peupler ses
          // personnages, et l'annoncer alors afficherait un écran d'erreur qui
          // ne partirait plus.
          if (d.pret !== false) montreEtat("absent");
          return;
        }
        charId = d.charId;
        ecrivable = jugeDroits(d);
        montreEtat(null);      // tout va bien : l'écran d'attente s'efface
        demandeEtat();
      } else if (d.type === "hydrate" && d.charId === charId) {
        montreEtat(null);
        applique(d.attrs || {});
      }
    } catch (e) {}
  }, false);

  // Le pont ne rend que la matière : qui je suis, si je suis MJ, et la liste
  // brute des contrôleurs du personnage. La conclusion se tire ICI, côté site,
  // pour que le jour où Roll20 renomme un de ces globaux la réparation soit un
  // déploiement et non une signature. Sans matière du tout (vieux pont), on
  // laisse essayer : une écriture refusée se verra, et le plateau le dira.
  function jugeDroits(d) {
    if (d.gm === undefined && d.controlledby === undefined) return d.ecrivable !== false;
    if (d.gm === true) return true;
    var l = String(d.controlledby || "").split(",").map(function (x) { return x.replace(/\s+/g, ""); });
    if (l.indexOf("all") >= 0) return true;
    return !!d.moi && l.indexOf(String(d.moi)) >= 0;
  }

  // ---------- lecture de l'état ----------
  // Un attribut revenu de Roll20 ne prime pas toujours : il perd contre le
  // jeton qu'on a dans la main, et contre une écriture toute fraîche qui n'a
  // pas encore fait l'aller-retour. Passé le délai de garde, il reprend la main
  // (notre écriture s'est perdue, ou quelqu'un a poussé le même jeton).
  var perdues = 0;
  function retenu(nom, distant) {
    var a = attente[nom];
    if (!a) return false;
    if (a.val === distant) { delete attente[nom]; perdues = 0; return false; }
    if (Date.now() - a.t < (a.marge || GARDE)) return true;
    delete attente[nom];
    // Notre écriture n'est jamais revenue. Une fois, c'est quelqu'un qui a
    // poussé le même jeton en même temps ; deux fois de suite, c'est que Roll20
    // refuse nos écritures (le personnage n'est pas partagé avec ce joueur, ou
    // le pronostic du pont s'est trompé). On le DIT plutôt que de laisser les
    // jetons revenir en arrière sans explication, et on ne revient pas en
    // arrière là-dessus : un refus observé vaut mieux qu'un droit annoncé.
    if (++perdues >= 2) { refuse = true; perdues = 0; }
    return false;
  }

  // Tous les identifiants de jetons VUS chez Roll20, y compris ceux dont la
  // valeur est vide (jeton retiré). La distribution s'en sert pour ne pas
  // laisser derrière elle les jetons créés par la distribution de quelqu'un
  // d'autre, qu'elle ne verrait pas autrement.
  var connus = {};
  var vide = 0;   // lectures vides consécutives

  function applique(attrs) {
    // UNE LECTURE VIDE N'EST PAS UNE VÉRITÉ. Roll20 ne peuple les Attributes
    // d'un personnage que paresseusement, et le plateau est justement lu sans
    // que personne n'ouvre sa fiche : les premières réponses peuvent être
    // vides. Les croire effacerait le plateau à l'écran — et si quelqu'un
    // distribue dans cette fenêtre-là, il double tous les jetons. On ne cède
    // qu'après plusieurs lectures vides d'affilée, au cas où le plateau aurait
    // vraiment été vidé à la main.
    var rien = true;
    Object.keys(attrs).forEach(function (n) { if (n.indexOf(PREF) === 0) rien = false; });
    if (rien && lu) {
      if (++vide < 5) return;
    } else {
      vide = 0;
    }
    lu = true;
    var brutConf = attrs[A_CONF] ? String(attrs[A_CONF].current || "") : "";
    if (!retenu(A_CONF, brutConf)) conf = litConf(brutConf);

    var neuf = {};
    Object.keys(attrs).forEach(function (n) {
      if (n.indexOf(A_PT) !== 0) return;
      var id = n.slice(A_PT.length);
      // Le nom de l'attribut vient de Roll20, donc de n'importe qui : un
      // identifiant fantaisiste finirait dans un sélecteur CSS et ferait
      // tomber tout le rafraîchissement, pour tout le monde et sans un mot.
      if (!/^[A-Za-z0-9_-]{1,16}$/.test(id)) return;
      connus[id] = 1;
      var brut = String(attrs[n].current || "");
      if (retenu(n, brut)) { if (points[id]) neuf[id] = points[id]; return; }
      var p = litPoint(brut);
      if (p) neuf[id] = p;
      // un jeton qu'on tient et que quelqu'un vient de retirer ne doit pas
      // ressusciter au lâcher
      else if (prise && prise.id === id) prise.mort = true;
    });
    // Nos écritures en attente sur des jetons que Roll20 ne connaît pas encore
    // (créés à l'instant) : elles ne doivent pas disparaître le temps de l'écho.
    Object.keys(attente).forEach(function (n) {
      if (n.indexOf(A_PT) !== 0) return;
      var id = n.slice(A_PT.length);
      if (!neuf[id] && points[id]) neuf[id] = points[id];
    });
    // le jeton qu'on tient reste sous le doigt, quoi qu'en dise Roll20
    if (prise && points[prise.id]) neuf[prise.id] = points[prise.id];
    points = neuf;
    rend();
  }

  function litConf(brut) {
    var c = confVide();
    if (!brut) return c;
    var o = null;
    try { o = JSON.parse(brut); } catch (e) { return c; }
    if (!o || typeof o !== "object") return c;
    if (entier(o.v, V_CONF) > V_CONF) confFuture = true;
    c.seq = Math.max(0, entier(o.seq, 0));
    if (o.mj && typeof o.mj === "object") {
      c.mj.nom = String(o.mj.nom || "MJ").slice(0, 40) || "MJ";
      c.mj.img = urlSure(o.mj.img);
    }
    if (Array.isArray(o.joueurs)) {
      o.joueurs.slice(0, 12).forEach(function (j, i) {
        if (!j || typeof j !== "object") return;
        c.joueurs.push({
          id: String(j.id || ("j" + (i + 1))).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 12) || ("j" + (i + 1)),
          nom: String(j.nom || "").slice(0, 40),
          img: urlSure(j.img)
        });
      });
    }
    if (o.donne && typeof o.donne === "object") {
      c.donne.mj = clamp(entier(o.donne.mj, 3), 0, 40);
      c.donne.joueur = clamp(entier(o.donne.joueur, 3), 0, 40);
    }
    return c;
  }
  // Une image vient d'un attribut que n'importe quel joueur peut écrire : on
  // n'accepte que du http(s), jamais un « javascript: » ni une image en data:
  // (qui pèserait bien plus que ce qu'un attribut Roll20 sait porter).
  function urlSure(u) {
    var s = String(u == null ? "" : u).trim();
    return /^https?:\/\//i.test(s) ? s.slice(0, 400) : "";
  }
  function litPoint(brut) {
    var m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(String(brut).trim());
    if (!m) return null;   // vide ou illisible = jeton absent du plateau
    return { x: clamp(parseFloat(m[1]), 0, MILLE), y: clamp(parseFloat(m[2]), 0, MILLE) };
  }
  function ecritPoint(p) { return Math.round(p.x) + "," + Math.round(p.y); }

  // ---------- construction ----------
  var racine, barre, plateau, coteMj, coteJoueurs, coucheJetons, lblTotal, lblLibres, btnReglages;
  var jaugeRef = null;
  var placesDom = {};   // id de place -> élément

  function bati() {
    racine = document.getElementById("nb");
    racine.innerHTML = "";   // le mot d'attente de l'amorceur a fait son office
    barre = el("div", "nb-barre");
    lblTotal = el("span", "nb-total", "");
    lblLibres = el("span", "nb-libres", "");
    btnReglages = el("button", "nb-btn", "Réglages");
    btnReglages.type = "button";
    btnReglages.addEventListener("click", function () { ouvreReglages(); });
    barre.appendChild(lblTotal);
    barre.appendChild(lblLibres);
    barre.appendChild(btnReglages);
    racine.appendChild(barre);

    plateau = el("div", "nb-plateau");
    coteMj = el("div", "nb-cote nb-cote-mj");
    coteJoueurs = el("div", "nb-cote nb-cote-joueurs");
    coucheJetons = el("div", "nb-jetons");
    plateau.appendChild(coteMj);
    plateau.appendChild(coteJoueurs);
    plateau.appendChild(coucheJetons);
    racine.appendChild(plateau);

    // Le diamètre des jetons suit la largeur du plateau : agrandir le panneau
    // doit agrandir la table, pas semer des confettis.
    function jauge() {
      var w = plateau.clientWidth || 320, h = plateau.clientHeight || 260;
      plateau.style.setProperty("--jeton", clamp(Math.round(w * 0.055), 16, 30) + "px");
      // Douze joueurs empilés dans une colonne de 270 pixels donneraient des
      // places hautes de rien, puis des places SOUS le plateau : invisibles, et
      // surtout impossibles à atteindre (un jeton n'y tomberait jamais). Passé
      // ce que la hauteur permet, la colonne devient une grille.
      var n = Math.max(1, conf.joueurs.length);
      var rangs = Math.max(1, Math.floor(h / 44));
      var cols = Math.max(1, Math.ceil(n / rangs));
      coteJoueurs.style.gridTemplateColumns = "repeat(" + cols + ", minmax(0, 1fr))";
      coteJoueurs.style.gridTemplateRows = "repeat(" + Math.ceil(n / cols) + ", minmax(0, 1fr))";
    }
    jaugeRef = jauge;
    if (window.ResizeObserver) new ResizeObserver(jauge).observe(plateau);
    window.addEventListener("resize", jauge);
    jauge();
  }

  // ---------- rendu ----------
  function places() {
    var l = [{ id: "mj", nom: conf.mj.nom || "MJ", img: conf.mj.img, mj: true }];
    conf.joueurs.forEach(function (j) { l.push({ id: j.id, nom: j.nom || "—", img: j.img, mj: false }); });
    return l;
  }

  function rend() {
    if (!racine) return;
    var l = places();
    var vus = {};
    // MJ à gauche, joueurs à droite : deux colonnes, chaque place occupant une
    // part égale de la sienne. Rien ne défile — un plateau qui défile perdrait
    // ses jetons hors de l'écran, et leurs coordonnées n'auraient plus de sens.
    l.forEach(function (p) {
      vus[p.id] = 1;
      var d = placesDom[p.id];
      var hote = p.mj ? coteMj : coteJoueurs;
      if (!d) {
        d = el("div", "nb-place" + (p.mj ? " nb-place-mj" : ""));
        var im = el("img", "nb-place-portrait");
        im.alt = "";
        // une URL de portrait qui ne répond plus (image supprimée, campagne
        // d'un autre) ne doit pas laisser une icône brisée sur la table
        im.addEventListener("error", function () { im.classList.add("nb-cache"); });
        d.appendChild(im);
        d.appendChild(el("div", "nb-place-nom"));
        d.appendChild(el("div", "nb-place-compte"));
        placesDom[p.id] = d;
      }
      if (d.parentNode !== hote) hote.appendChild(d);
      var img = d.querySelector(".nb-place-portrait");
      // ne toucher à src que s'il CHANGE : réaffecter la même URL morte
      // relançait la requête et faisait clignoter une image brisée à chaque
      // relecture, c'est-à-dire une fois par seconde
      if (img.dataset.url !== (p.img || "")) {
        img.dataset.url = p.img || "";
        if (p.img) { img.src = p.img; img.classList.remove("nb-cache"); }
        else { img.removeAttribute("src"); img.classList.add("nb-cache"); }
      }
      d.querySelector(".nb-place-nom").textContent = p.nom;
      d.dataset.place = p.id;
    });
    Object.keys(placesDom).forEach(function (id) {
      if (vus[id]) return;
      if (placesDom[id].parentNode) placesDom[id].parentNode.removeChild(placesDom[id]);
      delete placesDom[id];
    });
    // l'ordre des cartes suit celui de la configuration
    l.forEach(function (p) { if (!p.mj) coteJoueurs.appendChild(placesDom[p.id]); });

    if (jaugeRef) jaugeRef();
    rendJetons();
    compte();
  }

  function rendJetons() {
    var vus = {}, deja = {};
    // une seule traversée pour retrouver les jetons déjà posés : un
    // querySelector par jeton et par tour, c'est cinquante recherches par
    // seconde sur l'onglet de chaque joueur
    Array.prototype.forEach.call(coucheJetons.children, function (e) {
      if (e.dataset && e.dataset.jeton) deja[e.dataset.jeton] = e;
    });
    Object.keys(points).forEach(function (id) {
      vus[id] = 1;
      var j = deja[id];
      if (!j) {
        j = el("div", "nb-jeton");
        j.dataset.jeton = id;
        j.title = "narration";
        j.appendChild(el("span", null, "narration"));
        j.addEventListener("pointerdown", saisit);
        coucheJetons.appendChild(j);
        // un jeton neuf ne glisse pas : il apparaît là où il est
        pose(j, points[id], false);
        return;
      }
      if (prise && prise.id === id) return;   // celui qu'on tient
      pose(j, points[id], true);
    });
    Array.prototype.forEach.call(coucheJetons.querySelectorAll("[data-jeton]"), function (j) {
      if (!vus[j.dataset.jeton]) coucheJetons.removeChild(j);
    });
  }
  function pose(j, p, anime) {
    var g = (p.x / MILLE * 100) + "%", h = (p.y / MILLE * 100) + "%";
    if (j.style.left === g && j.style.top === h) return;
    j.classList.toggle("glisse", !!anime);
    j.style.left = g;
    j.style.top = h;
  }

  // Le compte d'une place est une question de GÉOMÉTRIE : combien de jetons
  // tombent dans son rectangle. Rien n'est stocké, donc rien ne peut mentir.
  function compte() {
    var base = coucheJetons.getBoundingClientRect();
    if (!base.width || !base.height) return;
    var zones = [];
    Object.keys(placesDom).forEach(function (id) {
      var r = placesDom[id].getBoundingClientRect();
      zones.push({ id: id, x1: r.left, y1: r.top, x2: r.right, y2: r.bottom, n: 0 });
    });
    var libres = 0, total = 0;
    Object.keys(points).forEach(function (id) {
      total++;
      var px = base.left + points[id].x / MILLE * base.width;
      var py = base.top + points[id].y / MILLE * base.height;
      var dans = null, meilleure = null, dmin = Infinity;
      for (var i = 0; i < zones.length; i++) {
        var z = zones[i];
        if (px >= z.x1 && px <= z.x2 && py >= z.y1 && py <= z.y2) { dans = z; break; }
        // distance au rectangle, pour la gouttière (voir plus bas)
        var dx = px < z.x1 ? z.x1 - px : px > z.x2 ? px - z.x2 : 0;
        var dy = py < z.y1 ? z.y1 - py : py > z.y2 ? py - z.y2 : 0;
        var d = Math.max(dx, dy);
        if (d < dmin) { dmin = d; meilleure = z; }
      }
      // Un jeton tombé dans le filet de quelques pixels qui sépare deux places
      // revient à la plus proche. Sans cela il serait « hors place » chez celui
      // qui a un grand panneau et chez son voisin sur un petit : le filet est
      // en pixels, tout le reste en proportions, et deux joueurs liraient des
      // comptes différents du même plateau.
      if (!dans && meilleure && dmin <= 6) dans = meilleure;
      if (dans) dans.n++; else libres++;
    });
    zones.forEach(function (z) {
      var c = placesDom[z.id].querySelector(".nb-place-compte");
      c.textContent = String(z.n);
      c.classList.toggle("zero", !z.n);
    });
    lblTotal.textContent = total + " jeton" + (total > 1 ? "s" : "");
    // Un plateau qu'on ne peut pas toucher doit le DIRE : sinon on pousse un
    // jeton, rien ne bouge, et on ne sait pas si c'est le droit qui manque ou
    // le logiciel qui a lâché.
    lblLibres.textContent = confFuture ? "plateau plus récent : lecture seule"
      : !peutPousser() ? "lecture seule"
      : libres ? "hors place : " + libres : "";
  }

  // ---------- déplacer un jeton ----------
  function saisit(ev) {
    // Un jeton qu'on ne peut pas enregistrer ne doit pas bouger du tout :
    // le voir glisser puis revenir au rafraîchissement suivant serait pire que
    // de ne pas pouvoir le prendre.
    if (!peutPousser() || (ev.button != null && ev.button !== 0)) return;
    var j = ev.currentTarget, id = j.dataset.jeton;
    if (!points[id]) return;
    var base = coucheJetons.getBoundingClientRect();
    prise = { id: id, el: j, bouge: false, x0: ev.clientX, y0: ev.clientY, base: base };
    j.classList.add("prise");
    j.classList.remove("glisse");
    try { j.setPointerCapture(ev.pointerId); } catch (e) {}
    ev.preventDefault();
  }
  function deplace(ev) {
    if (!prise) return;
    if (!prise.bouge &&
        Math.abs(ev.clientX - prise.x0) < 3 && Math.abs(ev.clientY - prise.y0) < 3) return;
    prise.bouge = true;
    var b = prise.base;
    var x = clamp((ev.clientX - b.left) / b.width * MILLE, 0, MILLE);
    var y = clamp((ev.clientY - b.top) / b.height * MILLE, 0, MILLE);
    points[prise.id] = { x: x, y: y };
    pose(prise.el, points[prise.id], false);
    vise(ev.clientX, ev.clientY);
  }
  function lache(ev) {
    if (!prise) return;
    var p = prise;
    prise = null;
    p.el.classList.remove("prise");
    vise(-1, -1);
    // UNE seule écriture, au lâcher : le pont écrit un attribut à la fois,
    // espacés, et Roll20 perd les rafales. Pendant le geste, personne d'autre
    // n'a besoin de voir chaque pixel.
    if (p.mort) {
      // quelqu'un a retiré ce jeton du plateau pendant qu'on le tenait : on ne
      // le remet pas sur la table par le seul fait de l'avoir eu en main
      delete points[p.id];
      rend();
      return;
    }
    if (p.bouge) ecrire(defObj(A_PT + p.id, ecritPoint(points[p.id])));
    compte();
  }
  function vise(x, y) {
    Object.keys(placesDom).forEach(function (id) {
      var r = placesDom[id].getBoundingClientRect();
      placesDom[id].classList.toggle("vise", x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
    });
  }
  function defObj(k, v) { var o = {}; o[k] = v; return o; }

  // ---------- réglages ----------
  // Tout ce que le MJ (ou n'importe qui, les droits Roll20 sont par personnage)
  // règle une fois par campagne : qui joue, avec quel portrait, et combien de
  // jetons chacun reçoit au début d'une session.
  function ouvreReglages() {
    var v = el("div", "nb-voile");
    var brouillon = JSON.parse(JSON.stringify(conf));

    v.appendChild(el("h2", null, "Réglages du plateau"));

    var lMj = el("div", "nb-ligne");
    lMj.appendChild(el("span", "nb-lab", "MJ"));
    var nomMj = champ("text", "nom", brouillon.mj.nom, "Nom");
    var imgMj = champ("text", "img", brouillon.mj.img, "URL du portrait");
    lMj.appendChild(nomMj); lMj.appendChild(imgMj);
    v.appendChild(lMj);

    var hote = el("div");
    v.appendChild(hote);
    function rendJoueurs() {
      hote.innerHTML = "";
      brouillon.joueurs.forEach(function (j, i) {
        var l = el("div", "nb-ligne");
        l.appendChild(el("span", "nb-lab", String(i + 1)));
        var n = champ("text", "nom", j.nom, "Nom du personnage");
        var g = champ("text", "img", j.img, "URL du portrait");
        n.addEventListener("input", function () { j.nom = n.value; });
        g.addEventListener("input", function () { j.img = g.value; });
        var moins = el("button", "nb-btn", "−");
        moins.type = "button";
        moins.title = "Retirer cette place";
        moins.addEventListener("click", function () {
          brouillon.joueurs.splice(i, 1);
          rendJoueurs();
        });
        l.appendChild(n); l.appendChild(g); l.appendChild(moins);
        hote.appendChild(l);
      });
      var plus = el("button", "nb-btn", "Ajouter un joueur");
      plus.type = "button";
      plus.addEventListener("click", function () {
        var id;
        do {
          brouillon.seq++;
          id = "j" + brouillon.seq;
        } while (brouillon.joueurs.some(function (x) { return x.id === id; }));
        brouillon.joueurs.push({ id: id, nom: "", img: "" });
        rendJoueurs();
      });
      hote.appendChild(plus);
    }
    rendJoueurs();

    var lDonne = el("div", "nb-ligne");
    lDonne.appendChild(el("span", "nb-lab", "Jetons au début de session — MJ"));
    var dMj = champ("number", null, brouillon.donne.mj, "");
    lDonne.appendChild(dMj);
    lDonne.appendChild(el("span", "nb-lab", "par joueur"));
    var dJ = champ("number", null, brouillon.donne.joueur, "");
    lDonne.appendChild(dJ);
    v.appendChild(lDonne);

    var actions = el("div", "nb-actions");
    var bOk = el("button", "nb-btn on", "Enregistrer");
    bOk.type = "button";
    bOk.addEventListener("click", function () {
      brouillon.mj.nom = nomMj.value;
      brouillon.mj.img = imgMj.value;
      brouillon.donne.mj = clamp(entier(dMj.value, 3), 0, 40);
      brouillon.donne.joueur = clamp(entier(dJ.value, 3), 0, 40);
      // Le compteur d'identifiants ne redescend jamais : le brouillon date de
      // l'ouverture du voile, et quelqu'un a pu distribuer entre-temps.
      brouillon.seq = Math.max(entier(brouillon.seq, 0), entier(conf.seq, 0));
      conf = litConf(JSON.stringify(brouillon));
      ecrire(defObj(A_CONF, JSON.stringify(conf)));
      ferme();
      rend();
    });
    var bDist = el("button", "nb-btn", "Distribuer");
    bDist.type = "button";
    bDist.title = "Replace les jetons : la donne de chacun sur sa place";
    // Deux temps. Le premier clic ne fait que demander : distribuer efface les
    // positions de tout le monde, et le bouton d'à côté est celui qu'on presse
    // le plus souvent (corriger un nom).
    var arme = null;
    bDist.addEventListener("click", function () {
      if (!arme) {
        arme = setTimeout(function () { arme = null; bDist.textContent = "Distribuer"; bDist.classList.remove("on"); }, 3000);
        bDist.textContent = "Confirmer ?";
        bDist.classList.add("on");
        return;
      }
      clearTimeout(arme);
      arme = null;
      brouillon.mj.nom = nomMj.value;
      brouillon.mj.img = imgMj.value;
      brouillon.donne.mj = clamp(entier(dMj.value, 3), 0, 40);
      brouillon.donne.joueur = clamp(entier(dJ.value, 3), 0, 40);
      brouillon.seq = Math.max(entier(brouillon.seq, 0), entier(conf.seq, 0));
      conf = litConf(JSON.stringify(brouillon));
      ferme();
      rend();
      distribue();
    });
    var bRamasse = el("button", "nb-btn", "Tout ramasser");
    bRamasse.type = "button";
    bRamasse.title = "Ramène tous les jetons du plateau chez le MJ";
    bRamasse.addEventListener("click", function () { ferme(); ramasse(); });
    var bFerme = el("button", "nb-btn", "Fermer");
    bFerme.type = "button";
    bFerme.addEventListener("click", ferme);
    actions.appendChild(bOk);
    actions.appendChild(bDist);
    actions.appendChild(bRamasse);
    actions.appendChild(bFerme);
    v.appendChild(actions);

    v.appendChild(el("p", "nb-aide",
      "Le plateau vit dans les Attributes du personnage « Narration ». "
      + "Tous ceux qui le contrôlent peuvent pousser les jetons."));

    function ferme() { if (v.parentNode) v.parentNode.removeChild(v); }
    if (!peutPousser()) {
      bOk.disabled = bDist.disabled = bRamasse.disabled = true;
      v.appendChild(el("p", "nb-aide", "Lecture seule : ce personnage n'est pas partagé avec ce joueur."));
    }
    racine.appendChild(v);

    function champ(type, cls, val, ph) {
      var i = el("input", cls);
      i.type = type;
      i.value = val == null ? "" : val;
      if (ph) i.placeholder = ph;
      if (type === "number") { i.min = 0; i.max = 40; }
      return i;
    }
  }

  // ---------- distribution ----------
  // Réutiliser les identifiants existants avant d'en créer : sur dix sessions,
  // créer à chaque fois laisserait des dizaines d'attributs morts dans le
  // personnage. Ce qui dépasse est vidé (valeur vide = jeton retiré).
  function distribue() {
    var l = places();
    var voulus = [];
    l.forEach(function (p) {
      var n = p.mj ? conf.donne.mj : conf.donne.joueur;
      for (var i = 0; i < n; i++) voulus.push(p.id);
    });
    // Réutiliser d'abord ce qu'on a sous les yeux, puis tout ce que Roll20
    // connaît : sans cette union, deux distributions successives par deux
    // joueurs laissaient sur le plateau les jetons créés par l'autre.
    var libres = Object.keys(points);
    Object.keys(connus).forEach(function (id) { if (libres.indexOf(id) < 0) libres.push(id); });
    var lot = {}, neuf = {};
    voulus.forEach(function (placeId, i) {
      // On REPREND d'abord les jetons existants (les nôtres, puis ceux que
      // Roll20 connaît) : les recréer laisserait les anciens sur la table.
      var id = libres[i];
      if (!id || neuf[id]) {
        // Un identifiant NEUF, lui, ne doit jamais retomber sur un vivant : le
        // compteur peut avoir régressé (configuration relue vide, brouillon
        // ouvert avant une distribution), et deux jetons de même nom, c'est un
        // jeton perdu sans un mot.
        do {
          conf.seq++;
          id = "p" + conf.seq;
        } while (points[id] || neuf[id] || connus[id]);
      }
      var pos = auHasardDans(placeId);
      neuf[id] = pos;
      lot[A_PT + id] = ecritPoint(pos);
    });
    libres.slice(voulus.length).forEach(function (id) { lot[A_PT + id] = ""; });
    points = neuf;
    lot[A_CONF] = JSON.stringify(conf);
    ecrire(lot);
    rend();
  }
  function ramasse() {
    var lot = {};
    Object.keys(points).forEach(function (id) {
      points[id] = auHasardDans("mj");
      lot[A_PT + id] = ecritPoint(points[id]);
    });
    ecrire(lot);
    rend();
  }
  // Une position au hasard DANS une place, avec une marge : les jetons se
  // chevauchent un peu, comme sur une vraie table, mais aucun ne déborde chez
  // le voisin ni ne se cache sous le portrait.
  function auHasardDans(placeId) {
    var d = placesDom[placeId], base = coucheJetons.getBoundingClientRect();
    if (!d || !base.width) return { x: 500, y: 500 };
    var r = d.getBoundingClientRect();
    var mx = Math.min(18, r.width * 0.18), my = Math.min(18, r.height * 0.18);
    var x = r.left + mx + Math.random() * Math.max(1, r.width - 2 * mx - r.width * 0.22);
    var y = r.top + my + Math.random() * Math.max(1, r.height - 2 * my);
    return {
      x: clamp((x - base.left) / base.width * MILLE, 0, MILLE),
      y: clamp((y - base.top) / base.height * MILLE, 0, MILLE)
    };
  }

  // ---------- états visibles ----------
  var etatMontre = null;
  function montreEtat(quoi) {
    // Le plateau redemande son personnage tant qu'il ne l'a pas : sans cette
    // garde, l'écran d'attente se reconstruirait toutes les 1.2 s et le bouton
    // se déroberait sous le doigt.
    if (quoi === etatMontre) return;
    etatMontre = quoi;
    var vieux = racine.querySelector(".nb-etat");
    if (vieux) racine.removeChild(vieux);
    if (!quoi) return;
    var e = el("div", "nb-etat");
    if (quoi === "absent") {
      e.appendChild(el("div", "nb-titre", "Aucun plateau dans cette campagne"));
      e.appendChild(el("div", "nb-detail",
        "Le MJ crée un personnage nommé exactement « Narration », le met dans le journal "
        + "des joueurs, et le rend modifiable et contrôlable par tous les joueurs."));
    } else if (quoi === "pont") {
      e.appendChild(el("div", "nb-titre", "Roll20 ne répond pas"));
      e.appendChild(el("div", "nb-detail",
        "Le plateau n'a pas trouvé le pont de l'extension. Recharger la partie suffit d'ordinaire."));
    }
    var b = el("button", "nb-btn", "Réessayer");
    b.type = "button";
    b.addEventListener("click", function () { montreEtat(null); demandePerso(); });
    e.appendChild(b);
    racine.appendChild(e);
  }

  // ---------- amorce ----------
  function demarre() {
    bati();
    demandePerso();
    // « Roll20 ne répond pas » ne vaut que si le pont n'a RIEN dit. S'il a
    // répondu qu'il n'y a pas de plateau, c'est cet écran-là qu'il faut garder :
    // le premier était plus tardif, il effaçait le second.
    setTimeout(function () { if (!repondu) montreEtat("pont"); }, ATTENTE_PONT);
    document.addEventListener("pointermove", deplace);
    document.addEventListener("pointerup", lache);
    document.addEventListener("pointercancel", lache);
    // Relecture régulière : c'est tout le « temps réel » du plateau. La page
    // cachée (panneau replié, onglet en arrière-plan) ne demande rien.
    var tour = 0;
    timer = setInterval(function () {
      tour++;
      // Panneau replié : l'extension masque l'iframe, dont la fenêtre tombe
      // alors à zéro pixel. Rien à interroger pour un plateau que personne ne
      // regarde — et c'est la PAGE qui en décide, donc cela se change sans
      // toucher à l'extension signée.
      if (document.hidden || !window.innerWidth || !window.innerHeight) return;
      if (!charId) {
        // pas de plateau dans cette campagne : on regarde de loin en loin, au
        // cas où le MJ viendrait de créer le personnage
        if (repondu && tour % 4) return;
        demandePerso();
        return;
      }
      // De temps en temps, redemander le personnage : un partage accordé en
      // cours de partie doit finir par se voir, sans recharger la page.
      if (tour % 10 === 0) post({ type: "narration-char" });
      demandeEtat();
    }, POLL);
    rend();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarre);
  else demarre();
})();
