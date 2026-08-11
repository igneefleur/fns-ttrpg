/* Amorce Roll20 de la fiche Outward — chargée UNIQUEMENT par
 * roll20-fiche.html, la page que l'extension Roll20 affiche dans son iframe.
 *
 * Architecture « coquille » : l'extension signée ne contient pas la fiche.
 * Elle pose l'onglet « Fiche Outward », le pont d20 (Attributes) et le relais
 * tchat, puis affiche CETTE page servie par le site : chaque mise à jour du
 * site met à jour la fiche dans Roll20, sans re-signer l'extension.
 *
 * Rôle :
 *  1. Poser window.__owdLocalStorage : un shim SYNCHRONE adossé à un cache
 *     mémoire. owd-fiche.js (via STORE) persiste dedans à la place du
 *     localStorage réel.
 *  2. Demander au pont d20 les Attributes du perso (type "load", relancé tant
 *     que le pont n'a pas répondu) ; à la réception ("hydrate"),
 *     OwdAttrMap.attrsToState() reconstruit l'état -> cache sous « owd-perso ».
 *  3. SEULEMENT ALORS injecter le bundle : son init()/load() lit l'état déjà
 *     hydraté et monte la fiche dans #perso-fiche.
 *  4. À chaque sauvegarde (setItem « owd-perso » / « owd-cards »),
 *     OwdAttrMap.stateToAttrs() redécompose l'état ; seuls les attributs
 *     CHANGÉS partent au pont (type "save"), qui throttle les écritures d20.
 *  5. ACCUSÉ DE RÉCEPTION. Le pont n'en émet aucun sur "save" : il avale
 *     l'échec d'un attribut (writeOne est en try/catch) et abandonne un job
 *     au 61e essai sans relancer la file. Une écriture perdue l'était donc
 *     définitivement, et ce sont justement les écritures uniques (sauvegarde
 *     de secours, version, état migré) qui ne repassent jamais. On se fabrique
 *     donc l'accusé de réception qui manque avec le seul canal disponible :
 *     "load", auquel le pont répond autant de fois qu'on le demande. Le lot
 *     posté attend dans `enVol` et n'entre dans la base du diff qu'une fois
 *     RELU dans le personnage ; sinon il est re-diffé et repart.
 *  6. GEL. attrsToState() rend son diagnostic avec l'état. Un owd_state présent
 *     mais illisible ne donne qu'une reconstruction amputée : on l'affiche, on
 *     le dit, et on n'écrit plus rien tant que le joueur n'a pas tranché. Un
 *     owd_state VIDÉ chez un personnage qui garde ses autres attributs owd_
 *     donne exactement la même reconstruction amputée, et vaut donc le même
 *     gel : sans lui, vider l'attribut le plus lourd de l'onglet Attributes
 *     serait PLUS destructeur que le corrompre.
 *  7. ÉCRAN DE VERSION. Entre 2 et 3, quand la fiche trouvée dans le
 *     personnage n'a pas la FORME que le site sait lire — son SCHÉMA diffère —,
 *     on n'ouvre RIEN : on montre ce qui change et on laisse choisir (mettre à
 *     niveau, ouvrir avec sa version, exporter). Le NUMÉRO de version, lui, ne
 *     barre pas le passage : un correctif de CSS sortirait l'écran chez toute
 *     une table alors qu'aucune donnée n'a changé de forme. C'est le seul
 *     endroit du dispositif où ready vaut encore false alors que l'état est
 *     déjà connu : aucune écriture ne peut partir d'ici.
 *
 * Chemin des messages : cette page est imbriquée sous la page d'extension
 * creator.html, elle-même sous la frame de la feuille Roll20. Le pont d20 vit
 * dans le monde principal de la frame du HAUT : window.top.postMessage y
 * arrive directement, et le pont répond via ev.source (donc ici), quelles que
 * soient les origines intermédiaires. Messages tagués ns:"owd" + charId.
 */
(function () {
  "use strict";
  var M = window.OwdAttrMap;

  // id du personnage Roll20, passé de creator.html au hash de cette page (#c=<id>).
  var CHAR_ID = (function () {
    var m = /[#&]c=([^&]+)/.exec(location.hash || "");
    return m ? decodeURIComponent(m[1]) : "";
  })();

  // Page ouverte directement dans un onglet (hors Roll20) : rien à hydrater,
  // on oriente le visiteur au lieu d'attendre un pont qui ne répondra jamais.
  var STANDALONE = (function () { try { return window.top === window; } catch (e) { return false; } })();

  var mem = {};                 // cache localStorage
  var SAVE_KEYS = { "owd-perso": 1, "owd-cards": 1 };
  var lastAttrs = {};           // ce que Roll20 a été VU contenir (base du diff)
  var enVol = null;             // lot posté, pas encore relu : ni oublié, ni tenu pour acquis
  var enVolTimer = null;
  var echecs = 0;               // confirmations manquées d'affilée
  var ready = false;            // les sauvegardes ne partent qu'après hydratation + montage
  var saveTimer = null;
  var askTimer = null;          // relance de la demande d'hydratation
  var gardeArmee = false;       // le chien de garde ne se lance qu'une fois par session
  var taillesPostees = [];      // tailles récentes de owd_state posté (repère du chien de garde)
  var gele = false;             // fiche lue à moitié : on n'écrit plus rien (voir hydrate)

  // Le shim que le bundle prend en priorité (var STORE = window.__owdLocalStorage
  // || localStorage). setItem ne déclenche une sauvegarde que si `ready` est
  // vrai ET si la clé est une des deux qui portent le personnage : l'onglet
  // courant et les réglages d'affichage vivent aussi ici, en mémoire, et
  // meurent avec la page — c'est voulu.
  window.__owdLocalStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem: function (k, v) { mem[k] = String(v); if (ready && SAVE_KEYS[k]) scheduleSave(); },
    removeItem: function (k) { delete mem[k]; },
    clear: function () { mem = {}; },
    key: function (i) { return Object.keys(mem)[i] || null; },
    get length() { return Object.keys(mem).length; }
  };

  function post(msg) { msg.ns = "owd"; msg.charId = CHAR_ID; try { window.top.postMessage(msg, "*"); } catch (e) {} }

  // ---------- mode jour / nuit ----------
  // Le CSS nuit existe déjà dans la feuille de la fiche (html.night …) ; ici on
  // ne fait que poser la classe. Préférence locale à CE navigateur (vrai
  // localStorage de la page, pas le shim) : "1" nuit, "0" jour, absente = auto.
  // L'« auto » suit ROLL20 : l'extension détecte le mode sombre de Roll20 au
  // montage de la fiche et le passe par le hash (n=1/0). Une extension plus
  // ancienne n'envoie pas d'indice : repli sur le mode sombre du navigateur
  // (prefers-color-scheme).
  // L'onglet Options de la fiche expose ce réglage via window.__owdNight.
  var NIGHT_KEY = "owd-r20-night";
  var NIGHT_HINT = (function () {
    if (/[#&]n=1/.test(location.hash || "")) return true;
    if (/[#&]n=0/.test(location.hash || "")) return false;
    try { return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches); }
    catch (e) { return false; }
  })();
  function nightPref() {
    try { var v = localStorage.getItem(NIGHT_KEY); return v === "1" || v === "0" ? v : "auto"; }
    catch (e) { return "auto"; }
  }
  function applyNight() {
    var p = nightPref();
    var on = p === "1" || (p === "auto" && NIGHT_HINT === true);
    document.documentElement.classList.toggle("night", on);
  }
  window.__owdNight = {
    pref: nightPref,          // "auto" | "0" (jour) | "1" (nuit)
    auto: NIGHT_HINT,         // ce que donne l'« auto » (mode de Roll20 ; repli navigateur)
    set: function (v) {
      try {
        if (v === "1" || v === "0") localStorage.setItem(NIGHT_KEY, v);
        else localStorage.removeItem(NIGHT_KEY);
      } catch (e) {}
      applyNight();
    }
  };
  applyNight();

  // Signale au bundle qu'on est dans Roll20 : affichage condensé (pas de barre
  // d'outils ni de bibliothèque) et jets envoyés au TCHAT Roll20.
  window.__owdCompact = true;
  // CANAUX HISTORIQUES, conservés en REPLI. Sur ce chemin-là c'est l'extension
  // qui recompose la commande : elle n'ajoute ni seuil, ni requête, et un jet
  // parti par là est un « <n>d8 + bonus » public, point. Le canal du jour est
  // __owdChat, plus bas.
  window.__owdRoll = function (die, value, label) { post({ type: "roll", die: die, value: value, label: label }); };
  // envoi d'un ÉLÉMENT de la fiche (objet, arme, technique) au tchat Roll20
  window.__owdSay = function (title, fields) { post({ type: "say", title: title, fields: fields }); };
  // CANAL BRUT : commande de tchat COMPOSÉE par la fiche. L'extension ne
  // réécrit rien et se contente d'une liste blanche (une seule ligne, préfixe
  // de chuchotement facultatif, corps qui commence par &{template:…}) : le
  // format des cartes et des jets vit donc côté site et peut évoluer sans
  // re-signature.
  window.__owdChat = function (raw) { post({ type: "chat", raw: raw }); };
  // Objet pris au tchat : l'extension relaie le payload du lien /owd_take. Il
  // peut arriver AVANT que le bundle soit monté (clic pendant le chargement) :
  // on le met alors en attente et on le rejoue dès que la fiche répond.
  var takeQueue = [];
  window.__owdTake = function (payload) {
    if (typeof window.__owdOnTake === "function") { window.__owdOnTake(payload); return; }
    takeQueue.push(payload);
  };
  // Joueurs connectés, pour le sélecteur « À un joueur » de la barre d'envoi.
  // La fiche est une iframe d'une autre origine : elle ne peut pas lire la
  // liste de Roll20 elle-même, seule l'extension y accède. Une extension qui
  // ne connaît pas ce message ne répond RIEN (aucun accusé de réception dans
  // ce pont) : le délai rend alors la main avec null et la fiche retombe sur
  // la liste saisie à la main.
  var playersWait = [];
  window.__owdPlayers = function (cb) {
    if (typeof cb !== "function") return;
    playersWait.push(cb);
    post({ type: "players" });
    setTimeout(function () {
      var i = playersWait.indexOf(cb);
      if (i >= 0) { playersWait.splice(i, 1); cb(null); }
    }, 1200);
  };
  function playersReply(noms) {
    var q = playersWait.slice();
    playersWait.length = 0;
    q.forEach(function (cb) { cb(noms); });
  }
  setInterval(function () {
    if (!takeQueue.length || typeof window.__owdOnTake !== "function") return;
    var q = takeQueue.slice();
    takeQueue.length = 0;
    q.forEach(function (p) { window.__owdOnTake(p); });
  }, 400);

  function scheduleSave() {
    if (gele) return;           // rien ne sort d'une fiche qu'on n'a pas su lire en entier
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 400);
  }
  function doSave() {
    saveTimer = null;
    var state;
    try { state = JSON.parse(mem["owd-perso"] || "null"); } catch (e) { return; }
    if (!state) return;
    var card = null;
    try { var cards = JSON.parse(mem["owd-cards"] || "{}"); card = cards && cards._current; } catch (e) {}
    var attrs = M.stateToAttrs(state, card);
    // Diff contre ce que Roll20 est CENSÉ contenir : le relu (lastAttrs) plus
    // le lot encore en vol. Le supposer arrivé évite de tout réémettre à
    // chaque frappe ; s'il ne se confirme pas il quitte cette base et repart
    // au save suivant, donc rien ne se perd à le supposer.
    var changed = diff(fusion(lastAttrs, enVol), attrs);
    var names = Object.keys(changed);
    if (!names.length) return;
    enVol = fusion(enVol, changed);
    post({ type: "save", attrs: changed });
    // repère du chien de garde : la taille du owd_state qu'on vient de poster
    var st = attrs[M.PREFIX + "state"];
    taillesPostees.push(st ? String(st.current).length : 0);
    if (taillesPostees.length > 5) taillesPostees.shift();
    armerConfirmation();
    armerGarde();
  }
  function val(a, key) { return a && typeof a === "object" ? a[key] : (key === "current" ? a : ""); }
  function diff(oldA, newA) {
    var out = {};
    Object.keys(newA).forEach(function (k) {
      var o = oldA[k], n = newA[k];
      if (!o || String(val(o, "current")) !== n.current || String(val(o, "max")) !== n.max) out[k] = n;
    });
    return out;
  }
  function fusion(a, b) {
    var out = {};
    if (a) Object.keys(a).forEach(function (k) { out[k] = a[k]; });
    if (b) Object.keys(b).forEach(function (k) { out[k] = b[k]; });
    return out;
  }

  // ---------- accusé de réception ----------
  // Sonde : un « load » dont on attend la réponse. Le pont répond au load par
  // un « hydrate » ; APRÈS la première hydratation ce message n'hydrate plus
  // rien, il vient ici (voir le routage de l'écouteur). Une absence de réponse
  // rend la main avec null : c'est déjà un verdict (personnage injoignable).
  var sondes = [];
  function sonde(cb) {
    var s = { cb: cb, t: null };
    s.t = setTimeout(function () {
      var i = sondes.indexOf(s);
      if (i >= 0) sondes.splice(i, 1);
      cb(null);
    }, 1500);
    sondes.push(s);
    post({ type: "load" });
  }
  function sondeReponse(attrs) {
    var q = sondes.slice();
    sondes.length = 0;
    q.forEach(function (s) { clearTimeout(s.t); s.cb(attrs || {}); });
  }

  // Empreinte d'une valeur : longueur, 64 premiers et 64 derniers caractères.
  // owd_state pèse couramment des centaines de kilo-octets ; le comparer en
  // entier à chaque sonde figerait le fil de la fiche pour rien. Une écriture
  // perdue, tronquée ou restée à sa valeur précédente change la longueur ou
  // l'une des deux extrémités.
  function empreinte(v) {
    var s = v == null ? "" : String(v);
    // Séparateur en caractère de contrôle, écrit en échappement pour rester
    // visible dans le source. Sans lui, une longueur de 12 suivie de « ab »
    // et une longueur de 1 suivie de « 2ab » donneraient la même empreinte.
    return s.length + "\u0001" + s.slice(0, 64) + "\u0001" + s.slice(-64);
  }
  function concorde(recu, attendu) {
    var noms = Object.keys(attendu);
    for (var i = 0; i < noms.length; i++) {
      var n = noms[i], r = recu[n], a = attendu[n];
      if (r == null) return false;
      if (empreinte(val(r, "current")) !== empreinte(a.current)) return false;
      if (empreinte(val(r, "max")) !== empreinte(a.max)) return false;
    }
    return true;
  }

  // Poste un « load », compare ce qui revient au lot attendu, rappelle
  // cb(true/false). Le pont écrit un attribut toutes les 60 ms en file
  // séquentielle : un gros lot met plusieurs secondes à se poser, d'où les
  // relectures espacées jusqu'au délai maximum.
  function confirme(attrs, cb, delaiMax) {
    if (!attrs || !Object.keys(attrs).length) { cb(true); return; }
    var fin = Date.now() + (delaiMax || 8000);
    (function essai() {
      sonde(function (recu) {
        if (recu && concorde(recu, attrs)) { cb(true); return; }
        if (Date.now() >= fin) { cb(false); return; }
        setTimeout(essai, 700);
      });
    })();
  }

  function armerConfirmation() {
    // 400 ms de grâce, et une seule confirmation à la fois : inutile de relire
    // le personnage pendant que le pont vide sa file, et un save plus récent
    // englobe le précédent (enVol cumule).
    if (enVolTimer) clearTimeout(enVolTimer);
    enVolTimer = setTimeout(function () {
      enVolTimer = null;
      var lot = enVol;
      if (!lot) return;
      confirme(lot, function (ok) {
        if (lot !== enVol) return;   // un save plus récent a repris la main
        if (ok) { lastAttrs = fusion(lastAttrs, lot); enVol = null; echecs = 0; return; }
        // Échec : le lot QUITTE la base du diff. Il redevient donc une
        // différence, et le prochain doSave le repostera de lui-même.
        enVol = null;
        echecs++;
        if (echecs < 2) { scheduleSave(); return; }   // une relance discrète suffit souvent
        // Deux fois de suite : ce n'est plus un contretemps. On prévient, et
        // on cesse de relancer tout seul — le lot part quand même à la
        // prochaine modification, le diff ne l'a pas oublié.
        bandeauPerte();
      }, 8000);
    }, 400);
  }

  // Chien de garde : une seule fois par session, 5 s après la première
  // sauvegarde. Il ne cherche pas la perte d'un attribut (confirme() s'en
  // charge) mais le cas où RIEN ne s'écrit : fenêtre popout orpheline de sa
  // partie, personnage en lecture seule. C'est le seul détecteur de ces deux
  // situations, où le pont lit très bien mais n'écrit jamais.
  function armerGarde() {
    if (gardeArmee) return;
    gardeArmee = true;
    setTimeout(chienDeGarde, 5000);
  }
  function chienDeGarde() {
    // Deux divergences d'affilée sont exigées, et toute taille RÉCEMMENT
    // postée est acceptée : entre la sonde et sa réponse l'utilisateur a pu
    // taper une lettre de plus, et la taille attendue changer sous nos pieds.
    var restant = 2;
    (function verifier() {
      sonde(function (recu) {
        var a = recu ? recu[M.PREFIX + "state"] : null;
        var vu = a ? String(val(a, "current")).length : -1;
        if (taillesPostees.indexOf(vu) >= 0) return;
        if (--restant > 0) { setTimeout(verifier, 1500); return; }
        bandeauPerte();
      });
    })();
  }

  // ---------- bandeau ----------
  // Les styles sont injectés d'ici et non posés dans stylesheets/owd-roll20.css :
  // ces bandeaux doivent pouvoir s'afficher même quand la feuille n'a pas été
  // chargée (manifeste en repli, réseau coupé en cours de route) — or c'est
  // précisément dans ces moments qu'ils ont quelque chose à dire.
  var CSS_BANDEAU =
    "#owd-bandeau{position:sticky;top:0;z-index:50;display:flex;flex-wrap:wrap;align-items:center;" +
    "gap:.5rem;padding:.5rem .7rem;background:#e9e0c9;color:#3a3428;border-bottom:1px solid #c3b795;" +
    "font-family:'Alegreya','EB Garamond',Garamond,serif;font-size:.72rem;line-height:1.45}" +
    "#owd-bandeau .owd-bandeau-txt{flex:1 1 14rem;min-width:0}" +
    "#owd-bandeau .owd-bandeau-btn{flex:0 0 auto;padding:.2rem .6rem;border:1px solid #c3b795;" +
    "border-radius:.2rem;background:#faf6eb;color:#3a3428;font:inherit;cursor:pointer}" +
    "#owd-bandeau .owd-bandeau-btn:hover{background:#fff}" +
    "html.night #owd-bandeau{background:#2a2519;color:#e8dfcb;border-bottom-color:#3c3527}" +
    "html.night #owd-bandeau .owd-bandeau-btn{background:#201c15;color:#e8dfcb;border-color:#3c3527}" +
    // Écran de version : il RECOUVRE la page (position fixed, z-index au-dessus
    // du bandeau) parce qu'il n'annonce pas, il barre le passage. La fiche
    // n'est pas derrière : elle n'est pas encore chargée.
    "#owd-ecran{position:fixed;top:0;left:0;right:0;bottom:0;z-index:80;overflow:auto;" +
    "padding:1rem;background:#e4ddcd;color:#1d1d1d;" +
    "font-family:'Alegreya','EB Garamond',Garamond,serif;font-size:.8rem;line-height:1.5}" +
    "#owd-ecran .owd-ecran-boite{box-sizing:border-box;max-width:34rem;margin:0 auto;background:#faf6eb;" +
    "border:1px solid #c3b795;border-radius:.3rem;padding:.9rem 1rem}" +
    "#owd-ecran.owd-ecran-rouge .owd-ecran-boite{border-color:#a5342c;background:#fdf1ec}" +
    "#owd-ecran h1{margin:0 0 .5rem;font-family:'Cinzel',serif;font-size:1.15rem;line-height:1.25}" +
    "#owd-ecran h2{margin:.85rem 0 .25rem;font-size:.88rem}" +
    "#owd-ecran p{margin:.35rem 0}" +
    "#owd-ecran ul{margin:.3rem 0;padding-left:1.1rem}" +
    "#owd-ecran li{margin:.25rem 0}" +
    "#owd-ecran .owd-ecran-vers{display:flex;flex-wrap:wrap;gap:.2rem 1.4rem;margin:.5rem 0;" +
    "padding:.35rem .6rem;background:#e9e0c9;border-radius:.2rem}" +
    "#owd-ecran .owd-ecran-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin:.85rem 0 .4rem}" +
    "#owd-ecran button{padding:.35rem .7rem;border:1px solid #c3b795;border-radius:.2rem;" +
    "background:#faf6eb;color:#3a3428;font:inherit;cursor:pointer}" +
    "#owd-ecran button:hover:not([disabled]){background:#fff}" +
    "#owd-ecran button.owd-ecran-primaire{background:#46543b;color:#faf6eb;border-color:#46543b}" +
    "#owd-ecran button[disabled]{opacity:.45;cursor:not-allowed}" +
    "#owd-ecran .owd-ecran-note{font-size:.72rem;opacity:.85}" +
    "#owd-ecran label.owd-ecran-epingle{display:block;margin:.2rem 0}" +
    // box-sizing explicite : sans lui le textarea déborde de la boîte dans
    // l'iframe Roll20, où la feuille de la fiche n'est pas toujours chargée.
    "#owd-ecran textarea{box-sizing:border-box;width:100%;min-height:8rem;margin-top:.3rem;" +
    "font-family:'Roboto Mono',monospace;font-size:.66rem}" +
    "html.night #owd-ecran{background:#14110c;color:#e8dfcb}" +
    "html.night #owd-ecran .owd-ecran-boite{background:#201c15;border-color:#3c3527}" +
    "html.night #owd-ecran.owd-ecran-rouge .owd-ecran-boite{background:#2e1d1a;border-color:#a5342c}" +
    "html.night #owd-ecran .owd-ecran-vers{background:#2a2519}" +
    "html.night #owd-ecran button{background:#2a2519;color:#e8dfcb;border-color:#3c3527}" +
    "html.night #owd-ecran button.owd-ecran-primaire{background:#adc08c;color:#201c15;border-color:#adc08c}" +
    "html.night #owd-ecran textarea{background:#14110c;color:#e8dfcb;border-color:#3c3527}";
  function poserStyles() {
    if (document.getElementById("owd-bandeau-css")) return;
    var s = document.createElement("style");
    s.id = "owd-bandeau-css";
    s.textContent = CSS_BANDEAU;
    document.head.appendChild(s);
  }
  // txt : texte brut (jamais de HTML, il peut venir d'un message d'erreur).
  // actions : [{ texte, action, acte }] rendues en boutons à droite du texte.
  // `acte` est un nom stable posé en data-owd-act : les libellés se réécrivent,
  // les harnais de test s'accrochent à ça et non à la prose.
  function bandeau(txt, actions) {
    poserStyles();
    var b = document.getElementById("owd-bandeau");
    if (!b) {
      b = document.createElement("div");
      b.id = "owd-bandeau";
      document.body.insertBefore(b, document.body.firstChild);
    }
    b.innerHTML = "";
    var p = document.createElement("span");
    p.className = "owd-bandeau-txt";
    p.textContent = txt;
    b.appendChild(p);
    (actions || []).forEach(function (a) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "owd-bandeau-btn";
      btn.textContent = a.texte;
      if (a.acte) btn.setAttribute("data-owd-act", a.acte);
      btn.onclick = a.action;
      b.appendChild(btn);
    });
    return b;
  }
  function fermerBandeau() {
    var b = document.getElementById("owd-bandeau");
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }
  function bandeauPerte() {
    bandeau("Roll20 n'enregistre pas cette fiche. Les modifications restent dans cette fenêtre " +
            "et seront perdues en la fermant. Si la fiche est ouverte dans une fenêtre séparée, " +
            "garder la fenêtre principale de la partie ouverte ; sinon, vérifier que le " +
            "personnage n'est pas en lecture seule.", [
      { texte: "Réessayer", acte: "reessayer", action: function () {
          fermerBandeau();
          echecs = 0;
          enVol = null;
          lastAttrs = {};        // on ne sait plus ce que Roll20 tient : tout réémettre
          gardeArmee = false;    // et refaire surveiller la première écriture qui suit
          scheduleSave();
        } },
      { texte: "Masquer", acte: "masquer", action: fermerBandeau }
    ]);
  }

  // Fiche à moitié lue, dans les deux cas où cela arrive (voir hydrate).
  // attrsToState a rendu la meilleure reconstruction possible, qui a le droit
  // de s'AFFICHER mais jamais de se réécrire : elle ne porte pas ce que le
  // repli ne sait pas porter, et la première sauvegarde remplacerait la fiche
  // du personnage par cette version amputée. D'où le gel. PAS DE BOUTON
  // « MASQUER » ici : un bandeau caché laisserait croire que la fiche
  // s'enregistre. C'est l'exception — le bandeau de perte et celui de « fiche
  // plus récente » se masquent, eux, parce que dans ces cas la fiche
  // s'enregistre vraiment. Le seul geste offert est explicite et dit ce qu'il
  // coûte, et c'est le même quelle que soit la façon dont la lecture a échoué.
  function bandeauGel(txt) {
    bandeau(txt, [
      { texte: "Écraser avec ce qui a pu être lu", acte: "ecraser", action: function () {
          fermerBandeau();
          gele = false;
          lastAttrs = {};      // la base du diff ne vaut plus rien : tout réémettre
          enVol = null;
          scheduleSave();
        } }
    ]);
  }
  // owd_state est là mais ne se lit pas : un caractère tapé dans l'onglet
  // Attributes de Roll20 suffit. L'original cassé est encore dans le
  // personnage, et c'est lui qu'il faut récupérer.
  function bandeauGelIllisible(raison) {
    bandeauGel("Cette fiche n'a pas pu être lue en entier (" + (raison || "état illisible") + "). " +
               "Ce qui s'affiche est une reconstruction incomplète : rien n'est enregistré, pour ne " +
               "pas écraser ce que Roll20 contient encore. Récupérer l'attribut owd_state du " +
               "personnage avant toute chose ; il porte la fiche entière.");
  }
  // owd_state a disparu alors que le reste de la fiche est là. Rien n'est
  // « cassé » à l'écran : la fiche s'affiche, presque complète, ce qui rend ce
  // cas plus traître que le précédent. Le bandeau doit donc NOMMER ce qui
  // manque, sinon le joueur croit à un simple oubli et se remet à taper.
  function bandeauGelDisparu() {
    bandeauGel("La fiche entière de ce personnage est introuvable : l'attribut owd_state, qui la " +
               "porte en un seul morceau, est vide, alors que les autres attributs owd_ sont " +
               "toujours là. Ce qui s'affiche a été reconstruit à partir d'eux, et il y manque des " +
               "choses : les images des objets de l'équipement, et tout ce qui n'a pas d'attribut " +
               "à lui. Rien n'est enregistré, pour ne pas remplacer la fiche par cette " +
               "reconstruction. Si owd_state a été vidé par erreur, y remettre son contenu puis " +
               "rouvrir cet onglet ; sinon, le bouton ci-dessous repart de ce qui a pu être lu, en " +
               "acceptant ces pertes.");
  }

  // ================= écran de version =================
  /* La fiche vit dans le personnage Roll20, le code vit sur le site, et les
   * deux ne bougent pas ensemble : une table peut ne pas rouvrir une fiche
   * pendant des mois, pendant que le site publie trois versions. Rouvrir en
   * silence, c'est réécrire une fiche avec un code qui ne l'a pas écrite —
   * exactement ce qu'un jeu refuse de faire avec une sauvegarde d'une autre
   * version.
   *
   * D'où cet écran, posé ENTRE la réception des attributs et l'injection du
   * bundle : à cet instant `ready` vaut encore false, donc setItem ne
   * déclenche aucun save, et le bundle n'est pas là pour en produire. Rien ne
   * peut être écrit tant que le joueur n'a pas tranché. C'est la seule
   * garantie qui compte ici, et elle est structurelle, pas déclarative.
   *
   * Deux entrées asynchrones mènent à la décision (les attributs qui
   * arrivent, le manifeste qui peut arriver après) : decider() ne fait rien
   * tant qu'il manque l'une des deux, et n'agit qu'une fois.
   */

  // Épinglage : « ne plus me demander pour ce personnage ». Vrai localStorage
  // de la page (pas le shim), donc PAR NAVIGATEUR : le choix d'un joueur
  // d'ouvrir une vieille fiche avec son ancien code ne s'impose pas à la table.
  var PIN_PREFIX = "owd-r20-version:";
  // Ce que la montée met à l'abri, dans le personnage lui-même.
  var BACKUP = "backup";

  var attrsVus = null;          // les attributs reçus, gardés pour la décision
  var attrsPrets = false;
  var manifPret = false;
  var decide = false;           // decider() n'agit qu'une fois
  var boiteCourante = null;     // la boîte de l'écran affiché (pour y ajouter le JSON)

  function manifeste() { return window.__owdManifeste || null; }
  function releaseSite() {
    var r = null;
    try { r = M.release ? M.release() : null; } catch (e) {}
    return r || M.RELEASE || "";
  }
  function schemaSite() {
    var m = manifeste();
    var n = m ? parseInt(m.schema, 10) : NaN;
    if (isFinite(n)) return n;
    // Repli sans manifeste : la constante de la carte d'attributs, JAMAIS le
    // majeur de la release. Le schéma est un entier indépendant, monté au seul
    // changement de forme de l'état : le jour où X monte seul (2.0.0 en schéma
    // 1), le déduire du majeur ferait passer tout le parc pour périmé et
    // proposerait une montée que le moteur refuse, à chaque ouverture.
    var s = M && M.SCHEMA;
    return (typeof s === "number" && isFinite(s)) ? s : 1;
  }
  // Décision produit : l'écran ne paraît qu'au désaccord de SCHÉMA. Le défaut
  // vaut aussi quand le manifeste manque ou tarde, car c'est là que l'écran est
  // le moins utile : bloquer sur le NUMÉRO le sortirait chez un joueur dont le
  // réseau a hoqueté, à chaque ouverture, alors qu'aucune donnée n'a changé de
  // forme. Le manifeste peut redemander l'ancien réglage, personne d'autre.
  function blocage() {
    var m = manifeste();
    return (m && m.blocage === "release") ? "release" : "schema";
  }

  // LA lecture d'un numéro, seule de tout le fichier, et celle du contrat :
  // « v » facultatif, un à trois nombres (les manquants valent 0), « b » de
  // la beta COLLÉ au dernier, suffixe de fabrication [-+…] toléré. Rend
  // { rang: [x, y, z], beta } ou null. UNE SEULE LECTURE DANS TOUT LE FICHIER,
  // c'est la règle : trois lectures cohabitaient dans le fichier dont celui-ci
  // est repris et n'acceptaient pas les mêmes textes, si bien que le même
  // numéro pouvait désigner une ligne d'archive et rester illisible pour la
  // comparaison, qui retombait alors sur l'égalité de chaînes et déclarait deux
  // versions différentes. Le suffixe ne change PAS le rang, la beta étant ce
  // que le stable recevra à la fusion : une fiche écrite sur la beta ne paraît
  // jamais plus récente que le site stable du même numéro.
  function lire(rel) {
    var m = /^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(b?)(?:[-+][0-9A-Za-z.-]*)?\s*$/
      .exec(String(rel == null ? "" : rel));
    return m ? { rang: [parseInt(m[1], 10), parseInt(m[2] || "0", 10), parseInt(m[3] || "0", 10)],
                 beta: m[4] === "b" } : null;
  }
  // Même rang, ou même LIGNE X.Y quand `ligne` est vrai. Illisible d'un côté :
  // on retombe sur l'égalité de chaîne — une version qu'on ne sait pas lire ne
  // doit rien casser, la fiche s'ouvre.
  function memeRang(a, b, ligne) {
    var x = lire(a), y = lire(b);
    if (!x || !y) return String(a) === String(b);
    return x.rang[0] === y.rang[0] && x.rang[1] === y.rang[1] &&
           (!!ligne || x.rang[2] === y.rang[2]);
  }
  // 1 si a est au-dessus de b, -1 en dessous, 0 au même rang, null dès que l'un
  // des deux est illisible : conclure « égal » en silence est justement ce qui
  // laisserait passer une fiche venue du futur sans un mot.
  function compare(a, b) {
    var x = lire(a), y = lire(b);
    if (!x || !y) return null;
    for (var i = 0; i < 3; i++) {
      if (x.rang[i] !== y.rang[i]) return x.rang[i] > y.rang[i] ? 1 : -1;
    }
    return 0;
  }

  // Une URL de manifeste doit rester dans le site : relative, sans schéma ni
  // « // », sans remontée de dossier. L'amorceur applique déjà cette règle à ce
  // qu'il charge, mais PAS aux archives, qu'il ne lit pas : c'est donc ici
  // qu'un manifeste trafiqué serait arrêté avant de faire injecter un script.
  function urlSure(u) {
    return typeof u === "string" && !!u &&
           !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u) && u.indexOf("//") !== 0 && u.indexOf("..") < 0;
  }
  function listeSure(l) { return Array.isArray(l) && !!l.length && l.every(urlSure); }

  // Le bundle du jour. Ses styles sont déjà posés par l'amorceur : on ne
  // recharge ici que les scripts.
  function specCourant() {
    var m = manifeste();
    var b = (m && m.bundle) || null;
    return {
      js: (b && listeSure(b.js)) ? b.js : ["javascripts/owd-fiche.js"],
      css: (b && Array.isArray(b.css)) ? b.css : [],
      data: (b && b.data) || null
    };
  }

  // Archive d'une version passée, déclarée par le manifeste sous son numéro :
  //   "archives": { "1.0.0": { "js": [...], "css": [...], "data": "...",
  //                            "attrmap": "..." } }
  // Un simple tableau de scripts est accepté. Rend null si rien n'est publié
  // pour la LIGNE demandée, ou si une seule URL sort du site. Outward part
  // avec « archives »: {} — le bouton est donc grisé, avec sa raison, ce qui
  // est le comportement correct tant qu'aucune ligne n'a été gelée.
  //
  // Recherche par LIGNE X.Y, jamais par clé exacte : une ligne ne gèle qu'UNE
  // archive, à sa première release (« 1.2.0 » ouvre la ligne 1.2), et les
  // correctifs qui suivent n'ont donc pas de dossier à eux. Chercher
  // m.archives["1.2.4"] ne trouverait rien et griserait « ouvrir avec sa
  // version » pour toute une ligne. Le personnage descend alors à la release de
  // l'archive (1.2.4 ouvert par 1.2.0) : c'est le prix assumé du gel par ligne,
  // et il ne boucle pas, la ligne de 1.2.0 restant 1.2.
  function archiveDe(rel) {
    var r = lire(rel);
    var m = manifeste();
    var tout = (m && m.archives && typeof m.archives === "object") ? m.archives : null;
    if (!r || !tout) return null;
    var cles = Object.keys(tout).sort(), cle = null, cr = null;
    for (var i = 0; i < cles.length; i++) {
      var c = lire(cles[i]);
      if (!c || c.rang[0] !== r.rang[0] || c.rang[1] !== r.rang[1]) continue;
      // La plus récente de la ligne. X et Y sont déjà égaux par le filtre :
      // comparer Z compare donc le rang entier. En NOMBRE, car un tri de
      // chaînes rangerait « 1.2.10 » avant « 1.2.9 ». Ce départage doit être
      // IDENTIQUE, à la lettre, dans l'outil qui gèle les archives et ici, sans
      // quoi les deux désigneraient deux dossiers différents pour la même
      // fiche : clés parcourues TRIÉES et comparaison STRICTE, donc à rang égal
      // (« 1.2.0 » et « 1.2.0b ») c'est la plus PETITE qui tranche, et rien ne
      // dépend de l'ordre des clés du JSON, qui n'est pas une garantie.
      if (!cr || c.rang[2] > cr.rang[2]) { cr = c; cle = cles[i]; }
    }
    if (!cle) return null;
    var a = tout[cle];
    if (!a) return null;
    // release portée par la spec : chargerBundle en fait la release EFFECTIVE,
    // celle que la carte d'attributs écrira dans owd_version.max. C'est la CLÉ
    // retenue, jamais la version demandée : inscrire « 1.2.4 » alors que c'est
    // le code de 1.2.0 qui tourne ferait mentir la seule ligne qui dit ce qui
    // tourne vraiment.
    var spec = Array.isArray(a) ? { js: a, css: [], data: null, attrmap: null, release: cle }
             : { js: a.js, css: Array.isArray(a.css) ? a.css : [], data: a.data == null ? null : a.data,
                 attrmap: a.attrmap == null ? null : a.attrmap, release: cle };
    // Contrôles d'URL sur la SEULE entrée retenue, et refus net si elle est mal
    // formée : redescendre à une clé plus ancienne de la ligne servirait un
    // autre code que celui qu'annonce le bouton. Un bouton grisé est honnête,
    // une archive de repli silencieuse ne l'est pas.
    if (!listeSure(spec.js)) return null;
    if (spec.css.length && !listeSure(spec.css)) return null;
    if (spec.data != null && !urlSure(spec.data)) return null;
    if (spec.attrmap != null && !urlSure(spec.attrmap)) return null;
    return spec;
  }

  function epinglageLu() {
    try {
      var v = localStorage.getItem(PIN_PREFIX + CHAR_ID);
      if (!v) return null;
      var o = JSON.parse(v);
      return (o && typeof o === "object" && typeof o.release === "string") ? o : null;
    } catch (e) { return null; }
  }
  // On range la release EXACTE, jamais sa ligne : la clé et la forme rangées
  // doivent rester lisibles pour les épinglages déjà posés chez les joueurs.
  // C'est la comparaison, elle, qui se fait ligne à ligne (voir decider()).
  function epinglagePoser(rel) {
    try {
      localStorage.setItem(PIN_PREFIX + CHAR_ID,
        JSON.stringify({ release: String(rel), quand: new Date().toISOString() }));
    } catch (e) {}
  }

  // Version de la fiche trouvée dans le personnage, { schema, release } ou null.
  //
  // C'est owd_state qui fait foi : lui seul est réécrit par la version qui a
  // réellement enregistré la fiche. Le max de owd_version, lui, porte la
  // release que l'amorce croyait servir au moment de l'écriture, et une archive
  // qui tourne sous le manifeste du jour y inscrit la version DU SITE : s'y
  // fier ferait passer une fiche d'archive pour une fiche à jour, et « ouvrir
  // avec sa version » n'aurait plus d'objet. ficheDe() applique cette priorité
  // (état d'abord, owd_version en repli quand l'état ne se lit plus) sans
  // reconstruire l'état, ce qui reste bon marché sur un owd_state énorme.
  function versionFiche(attrs) {
    var f = null;
    try { f = M.ficheDe(attrs); } catch (e) { f = null; }
    return f || null;
  }
  function texteVersion(rel, sch) {
    var s = (sch == null) ? "schéma inconnu" : ("schéma " + sch);
    return (rel ? rel : "version non inscrite") + " (" + s + ")";
  }

  // ---------- fabrique de l'écran ----------
  // Tout est construit noeud par noeud : aucun innerHTML avec du contenu
  // variable (un numéro de version ou une note de migration viennent d'un
  // fichier JSON, et un jour d'une archive).
  function noeud(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function fermerEcran() {
    var e = document.getElementById("owd-ecran");
    if (e && e.parentNode) e.parentNode.removeChild(e);
    boiteCourante = null;
  }
  function ecran(titre, rouge) {
    poserStyles();
    fermerEcran();
    var fond = document.createElement("div");
    fond.id = "owd-ecran";
    if (rouge) fond.className = "owd-ecran-rouge";
    fond.setAttribute("role", "dialog");
    var boite = noeud("div", "owd-ecran-boite");
    boite.appendChild(noeud("h1", null, titre));
    fond.appendChild(boite);
    document.body.appendChild(fond);
    boiteCourante = boite;
    return boite;
  }
  function zoneActions(boite) {
    var d = noeud("div", "owd-ecran-actions");
    boite.appendChild(d);
    return d;
  }
  // acte : nom stable en data-owd-act, sur lequel s'accrochent les harnais.
  function bouton(zone, texte, acte, action, primaire) {
    var b = noeud("button", primaire ? "owd-ecran-primaire" : null, texte);
    b.type = "button";
    b.setAttribute("data-owd-act", acte);
    b.onclick = action;
    zone.appendChild(b);
    return b;
  }
  function griser(btn, raison, boite) {
    btn.disabled = true;
    btn.title = raison;
    boite.appendChild(noeud("p", "owd-ecran-note", raison));
  }
  function ecranAttente(titre, txt) {
    var b = ecran(titre, false);
    b.appendChild(noeud("p", null, txt));
    return b;
  }

  // ---------- export ----------
  // Le JSON du personnage TEL QU'IL A ÉTÉ LU, avant toute migration : c'est
  // lui qu'il faut pouvoir garder de côté avant d'accepter quoi que ce soit.
  function jsonPerso() {
    var brut = mem["owd-perso"] || "{}";
    try { return JSON.stringify(JSON.parse(brut), null, 2); } catch (e) { return brut; }
  }
  function nomFichier() {
    var n = "";
    try { n = (JSON.parse(mem["owd-perso"] || "{}") || {}).name || ""; } catch (e) {}
    return (n || "personnage-outward") + ".json";
  }
  // Le JSON en clair, sélectionné, avec un bouton copier : c'est le REPLI de
  // l'export. L'iframe de l'extension n'a pas forcément allow-downloads, et un
  // téléchargement refusé là-dedans ne lève rien du tout — impossible de le
  // détecter. On propose donc toujours le texte après la tentative, plutôt que
  // de laisser croire à un fichier qui n'existe pas.
  function montrerJson(txt, intro) {
    var b = boiteCourante;
    if (!b) return;
    var zone = document.getElementById("owd-ecran-json-zone");
    if (!zone) {
      zone = noeud("div");
      zone.id = "owd-ecran-json-zone";
      b.appendChild(zone);
    }
    zone.innerHTML = "";
    zone.appendChild(noeud("p", "owd-ecran-note", intro));
    var ta = noeud("textarea");
    ta.id = "owd-ecran-json";
    ta.readOnly = true;
    ta.value = txt;
    zone.appendChild(ta);
    var z = zoneActions(zone);
    bouton(z, "Copier", "copier", function () {
      ta.focus();
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      if (!ok && navigator.clipboard && navigator.clipboard.writeText) {
        try { navigator.clipboard.writeText(txt); } catch (e) {}
      }
    });
    ta.focus();
    ta.select();
  }
  function exporter() {
    var txt = jsonPerso();
    var lance = false;
    try {
      var a = document.createElement("a");
      if ("download" in a) {
        var url = null;
        if (window.URL && window.URL.createObjectURL && window.Blob) {
          url = window.URL.createObjectURL(new Blob([txt], { type: "application/json" }));
        } else {
          url = "data:application/json;charset=utf-8," + encodeURIComponent(txt);
        }
        a.href = url;
        a.download = nomFichier();
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        lance = true;
        setTimeout(function () {
          if (a.parentNode) a.parentNode.removeChild(a);
          if (window.URL && window.URL.revokeObjectURL && url.indexOf("blob:") === 0) window.URL.revokeObjectURL(url);
        }, 4000);
      }
    } catch (e) { lance = false; }
    if (!lance) {
      montrerJson(txt, "Le téléchargement est impossible dans cette fenêtre. Voici le personnage en JSON, à copier dans un fichier.");
      return;
    }
    setTimeout(function () {
      montrerJson(txt, "Si aucun fichier ne s'est téléchargé (Roll20 le bloque parfois dans son cadre), voici le personnage en JSON, à copier dans un fichier.");
    }, 1200);
  }
  function boutonExport(zone) {
    return bouton(zone, "Exporter le personnage (JSON)", "export", exporter);
  }

  // ---------- chargement du bundle ----------
  // Point d'arrivée de TOUTES les branches de decider() : c'est le seul endroit
  // qui met `ready` à true, donc le seul qui rouvre le robinet des écritures.
  var bundleCharge = false;
  function chargerBundle(spec, remplacerCss) {
    // Un double clic sur « mettre à niveau » lancerait deux protocoles, donc
    // deux injections : la fiche se monterait deux fois dans la même page.
    if (bundleCharge || !spec) return;
    bundleCharge = true;
    fermerEcran();
    // data : le owd-creation.json à lire. Une archive embarque le sien, gelé à
    // sa date ; sans lui un ancien bundle lirait les règles d'aujourd'hui.
    window.__owdDataUrl = spec.data || null;
    // RELEASE EFFECTIVE : celle qui TOURNE, pas celle que le site publie. Sans
    // ça, une archive enregistrerait owd_version.max à la version du site, la
    // fiche paraîtrait à jour, et sa prochaine ouverture repartirait sur le
    // bundle du jour — « ouvrir avec sa version » ne tiendrait qu'une session.
    // Posé AVANT toute écriture et avant l'attr-map de l'archive, qui lira le
    // global (et non une variable de module, perdue au remplacement de M).
    if (M && M.setRelease) M.setRelease(spec.release || null);
    if (remplacerCss) {
      // Les feuilles du jour portent data-owd (posé par l'amorceur) : une
      // archive amène les siennes, et faire cohabiter les deux donnerait une
      // fiche à moitié restylée.
      var vieux = document.querySelectorAll("link[data-owd]");
      for (var k = 0; k < vieux.length; k++) {
        if (vieux[k].parentNode) vieux[k].parentNode.removeChild(vieux[k]);
      }
      (spec.css || []).forEach(function (u) {
        var l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = u;
        l.setAttribute("data-owd", "1");
        document.head.appendChild(l);
      });
    }
    var urls = spec.js || [];
    var i = 0;
    function serie() {
      if (i >= urls.length) { ready = true; post({ type: "mounted" }); return; }
      var s = document.createElement("script");
      var u = urls[i++];
      s.src = u;
      s.onload = serie;
      s.onerror = function () { post({ type: "error", error: u }); serie(); };
      document.body.appendChild(s);
    }
    // Une archive peut apporter SA correspondance état <-> Attributes. Elle
    // compte autant que le bundle : c'est elle qui décomposera l'état à chaque
    // sauvegarde, et la version du jour ne connaît pas forcément les champs
    // d'alors. `M` est capturé une fois pour toutes au démarrage de l'amorce :
    // charger le fichier ne suffit donc pas, il faut REPOINTER M dessus. On ne
    // le fait que si le module chargé expose bien ce que l'amorce lui demande,
    // sinon on garde celui du jour plutôt que de casser les sauvegardes.
    if (spec.attrmap) {
      var sm = document.createElement("script");
      sm.src = spec.attrmap;
      sm.onload = function () {
        var neuf = window.OwdAttrMap;
        if (neuf && typeof neuf.stateToAttrs === "function" && neuf.PREFIX) M = neuf;
        serie();
      };
      sm.onerror = function () { post({ type: "error", error: spec.attrmap }); serie(); };
      document.body.appendChild(sm);
      return;
    }
    serie();
  }

  // Le moteur de migration est livré avec le BUNDLE, pas avec l'amorce : au
  // moment de l'écran il n'est donc pas encore là, alors que c'est lui qui sait
  // dire ce que la montée change. On charge ce seul fichier (il ne fait que
  // poser window.OwdMigr, il ne touche à rien) ; s'il manque, l'écran le dit au
  // lieu d'inventer un « rien à signaler ».
  //
  // Le garde de tête reste POUR TOUJOURS, comme celui de migre() côté bundle :
  // le repli gelé de roll20-fiche.html ne nomme pas le moteur, et une fiche
  // sans moteur doit s'ouvrir quand même.
  function avecMigrations(cb) {
    if (window.OwdMigr && window.OwdMigr.resume) { cb(); return; }
    var u = null;
    (specCourant().js || []).forEach(function (x) { if (!u && /owd-migrations/.test(x)) u = x; });
    if (!u) { cb(); return; }
    var fini = false;
    function une() { if (fini) return; fini = true; cb(); }
    var s = document.createElement("script");
    s.src = u;
    s.onload = une;
    s.onerror = une;
    document.body.appendChild(s);
    setTimeout(une, 3000);
  }

  // ---------- protocole de mise à niveau ----------
  // Rien de destructif sans accusé de réception : la fiche d'origine part dans
  // owd_backup, on la RELIT dans le personnage, et seulement alors on injecte
  // le bundle qui migrera. Un backup qu'on n'a pas relu ne vaut rien : le pont
  // avale l'échec d'une écriture sans le dire (voir 5. en tête de fichier).
  function lotBackup(f) {
    var brut = val((attrsVus || {})[M.PREFIX + "state"], "current");
    // Sans owd_state lisible, on met à l'abri la reconstruction champ par
    // champ : c'est exactement ce que la migration s'apprête à remplacer.
    var contenu = brut ? String(brut) : (mem["owd-perso"] || "");
    var lot = {};
    lot[M.PREFIX + BACKUP] = {
      current: contenu,
      // max : d'où vient cette sauvegarde. « schéma|date », lisible à l'oeil nu
      // dans l'onglet Attributes de Roll20, et relu par la restauration.
      max: String(f && f.schema != null ? f.schema : "") + "|" + new Date().toISOString()
    };
    return lot;
  }
  function monter(silencieux, f) {
    var lot = lotBackup(f);
    tenterBackup(lot, silencieux);
  }
  function tenterBackup(lot, silencieux) {
    ecranAttente("Mise à niveau de la fiche",
      "Sauvegarde de secours de l'état d'origine dans le personnage Roll20, puis relecture pour vérifier " +
      "qu'elle est bien arrivée. Ne pas fermer cet onglet.");
    post({ type: "save", attrs: lot });
    confirme(lot, function (ok) {
      if (!ok) { ecranRouge(lot, silencieux); return; }
      // Confirmé : le lot entre dans la base du diff, il est en base.
      lastAttrs = fusion(lastAttrs, lot);
      fermerEcran();
      if (silencieux) bandeauMisAJour();
      chargerBundle(specCourant());
    }, 8000);
  }
  function ecranRouge(lot, silencieux) {
    var b = ecran("Roll20 n'a pas confirmé la sauvegarde de secours", true);
    b.appendChild(noeud("p", null,
      "L'état d'origine de la fiche a été envoyé au personnage, mais il n'a pas été relu à l'identique. " +
      "La mise à niveau n'a donc PAS eu lieu : rien n'a été modifié. Copier le personnage ci-dessous avant " +
      "de réessayer ; si la fiche est ouverte dans une fenêtre séparée, garder la fenêtre principale de la " +
      "partie ouverte, et vérifier que le personnage n'est pas en lecture seule."));
    var z = zoneActions(b);
    bouton(z, "Réessayer", "reessayer", function () { tenterBackup(lot, silencieux); }, true);
    bouton(z, "Copier le JSON", "copier-json", function () {
      montrerJson(jsonPerso(), "Le personnage tel qu'il a été lu, avant toute migration.");
    });
    boutonExport(z);
  }

  // « Restaurer l'état d'origine » : relit owd_backup DANS LE PERSONNAGE (pas
  // en mémoire : c'est Roll20 qui fait foi) et le réécrit dans owd_state, avec
  // confirmation. La fiche affichée, elle, reste la version migrée : elle
  // réécrirait l'état restauré à la première frappe. D'où le gel, et la
  // consigne de fermer l'onglet.
  function restaurer() {
    gele = true;
    fermerBandeau();
    ecranAttente("Restauration de l'état d'origine",
      "Relecture de la sauvegarde de secours dans le personnage Roll20.");
    sonde(function (recu) {
      var a = recu ? recu[M.PREFIX + BACKUP] : null;
      var brut = a ? String(val(a, "current") || "") : "";
      if (!brut) {
        var b0 = ecran("Aucune sauvegarde de secours à restaurer", true);
        b0.appendChild(noeud("p", null,
          "L'attribut owd_backup du personnage est vide ou illisible. Rien n'a été touché ; la fiche reste " +
          "gelée dans cette fenêtre (aucune écriture) tant qu'elle n'est pas rechargée."));
        var z0 = zoneActions(b0);
        bouton(z0, "Réessayer", "reessayer", restaurer, true);
        boutonExport(z0);
        return;
      }
      var meta = String(val(a, "max") || "");
      var sch = parseInt(meta, 10);
      var lot = {};
      lot[M.PREFIX + "state"] = { current: brut, max: "" };
      // owd_version repart au schéma d'origine, sinon la fiche restaurée serait
      // relue comme une fiche du jour au prochain chargement.
      if (isFinite(sch)) lot[M.PREFIX + "version"] = { current: String(sch), max: "" };
      post({ type: "save", attrs: lot });
      confirme(lot, function (ok) {
        if (!ok) {
          var b1 = ecran("Roll20 n'a pas confirmé la restauration", true);
          b1.appendChild(noeud("p", null,
            "L'état d'origine a été renvoyé au personnage mais n'a pas été relu à l'identique. Le voici en " +
            "clair : le copier avant toute chose. Aucune écriture ne part plus de cette fenêtre."));
          var z1 = zoneActions(b1);
          bouton(z1, "Réessayer", "reessayer", restaurer, true);
          boutonExport(z1);
          montrerJson(brut, "L'état d'origine, tel qu'il était gardé dans owd_backup.");
          return;
        }
        lastAttrs = fusion(lastAttrs, lot);
        fermerEcran();
        bandeau("État d'origine restauré dans le personnage. La fiche affichée ici est encore la version " +
                "migrée : fermer cet onglet sans y toucher, puis le rouvrir. Aucune écriture ne part plus " +
                "de cette fenêtre.", [
          { texte: "Exporter (JSON)", acte: "export", action: exporter }
        ]);
      }, 8000);
    });
  }

  function bandeauMisAJour() {
    bandeau("Fiche mise à niveau en " + releaseSite() + ". L'état d'origine est gardé dans l'attribut " +
            "owd_backup du personnage.", [
      { texte: "Restaurer l'état d'origine", acte: "restaurer", action: restaurer },
      { texte: "Exporter (JSON)", acte: "export", action: exporter },
      { texte: "Masquer", acte: "masquer", action: fermerBandeau }
    ]);
  }

  // Fiche écrite par une release PLUS RÉCENTE que le site, alors que le schéma
  // concorde. Le contrat ne bloque pas sur le numéro, et il a raison : la forme
  // des données est celle que ce code sait lire, un écran serait de trop. Reste
  // ce qu'une release plus jeune a pu ajouter SANS toucher au schéma : un champ
  // que ce code ne connaît pas et que la première sauvegarde laisserait tomber.
  // Trop peu pour barrer le passage, trop pour ouvrir sans un mot : un bandeau,
  // qui n'empêche rien mais met l'export à portée avant la première frappe. Il
  // se masque, contrairement à ceux du gel : ici la fiche s'enregistre vraiment,
  // le cacher ne fait donc croire à rien de faux.
  function bandeauPlusRecente(relFiche, relSite) {
    bandeau("Cette fiche a été enregistrée en " + relFiche + ", plus récent que la version servie ici (" +
            relSite + "). Elle s'ouvre quand même : ses données ont la forme que cette version sait lire. " +
            "Ce que " + relFiche + " a pu ajouter depuis, en revanche, cette version ne le connaît pas et " +
            "ne le réécrira pas. Exporter avant de modifier.", [
      { texte: "Exporter (JSON)", acte: "export", action: exporter },
      { texte: "Masquer", acte: "masquer", action: fermerBandeau }
    ]);
  }

  // ---------- l'écran lui-même ----------
  //
  // CE QUE LE JOUEUR LIT NE DIT JAMAIS « SITE ». Le numéro montré ici est celui
  // de la FICHE servie, et le popup de l'extension nomme ses deux lignes « fiche
  // stable » et « fiche beta » : un écran qui parlerait du « site » enverrait
  // chercher un numéro de pages de règles là où il n'y en a pas, et laisserait
  // croire que la fiche du personnage et « le site » sont deux choses sans
  // rapport. Les identifiants, eux, gardent « site » (relSite, releaseSite) :
  // ils nomment l'endroit d'où la version est lue, personne ne les lit en jeu,
  // et les renommer ne changerait rien pour un joueur.
  function ecranVersion(f, relSite, schSite) {
    var relFiche = f.release || null;
    var duFutur = (f.schema != null && f.schema > schSite);
    var b = ecran(duFutur ? "Cette fiche vient d'une version plus récente que celle servie ici"
                          : "Cette fiche n'a pas la version servie ici", false);
    var v = noeud("div", "owd-ecran-vers");
    v.appendChild(noeud("span", null, "Fiche du personnage : " + texteVersion(relFiche, f.schema)));
    v.appendChild(noeud("span", null, "Fiche servie ici : " + texteVersion(relSite, schSite)));
    b.appendChild(v);
    b.appendChild(noeud("p", null,
      "Rien n'a été lu de travers et rien n'a été enregistré : aucune écriture ne partira tant qu'un " +
      "choix n'aura pas été fait."));

    b.appendChild(noeud("h2", null, "Ce que la mise à niveau change"));
    var pas = null;
    try {
      if (window.OwdMigr && window.OwdMigr.resume) pas = window.OwdMigr.resume(f.schema, schSite);
    } catch (e) { pas = null; }
    if (duFutur) {
      b.appendChild(noeud("p", null,
        "La fiche a été écrite par une version plus récente que celle servie ici. La version servie ne " +
        "sait pas la redescendre, et l'ouvrir avec le code d'aujourd'hui lui ferait perdre ce qu'il ne " +
        "connaît pas."));
    } else if (!pas) {
      b.appendChild(noeud("p", null,
        "Cette version ne sait pas dire ce qui sépare le schéma " + f.schema + " du schéma " + schSite +
        " : le chemin de migration lui manque. Exporter le personnage avant de choisir."));
    } else if (!pas.length) {
      b.appendChild(noeud("p", null,
        "Rien dans la structure de la fiche : seul le numéro de version change."));
    } else {
      var ul = noeud("ul");
      pas.forEach(function (e) {
        var li = noeud("li");
        li.appendChild(noeud("span", "owd-ecran-pas", e.titre + " : "));
        li.appendChild(document.createTextNode(e.notes));
        ul.appendChild(li);
      });
      b.appendChild(ul);
    }

    // L'épinglage ne vaut QUE pour « ouvrir avec sa version » : la case est
    // construite avant les boutons (leur gestionnaire la lit) mais posée après
    // eux. Elle n'est jamais honorée par la montée, qui est destructive et ne
    // se rejoue pas de mémoire.
    var lab = noeud("label", "owd-ecran-epingle");
    var caseEp = document.createElement("input");
    caseEp.type = "checkbox";
    caseEp.id = "owd-ecran-epingle";
    lab.appendChild(caseEp);
    lab.appendChild(document.createTextNode(" Ne plus me demander pour ce personnage"));

    var z = zoneActions(b);
    var bMonter = bouton(z, "Mettre la fiche à niveau (" + relSite + ")", "monter", function () {
      monter(false, f);
    }, !duFutur);
    var arch = archiveDe(relFiche);
    // Le libellé dit ce qui va OUVRIR, pas ce que le joueur espère : une ligne
    // ne gèle qu'une archive, donc un personnage écrit en 1.2.4 s'ouvrira avec
    // 1.2.0. Promettre « sa version » mentirait sur le code qui va tourner.
    // Comparaison de RANG et non de texte : la clé « 1.2.0 » est bien la version
    // d'une fiche écrite en « 1.2.0b », et annoncer une archive « la plus proche
    // de sa version » pour un simple suffixe inquiéterait pour rien.
    var bArch = bouton(z, (arch && !memeRang(arch.release, relFiche))
      ? ("Ouvrir avec l'archive " + arch.release + " (la plus proche de sa version)")
      : ("Ouvrir avec sa version (" + (relFiche || "inconnue") + ")"), "archive", function () {
      if (!arch) return;   // bouton grisé : ceinture, au cas où un clic passe quand même
      if (caseEp.checked && relFiche) epinglagePoser(relFiche);
      chargerBundle(arch, true);
    }, duFutur);
    boutonExport(z);

    if (duFutur) {
      griser(bMonter, "La mise à niveau est indisponible : la fiche est plus récente que la version " +
                      "servie ici, la rétrograder lui ferait perdre ce qui n'existe pas encore de ce " +
                      "côté.", b);
    }
    if (!arch) {
      griser(bArch, relFiche
        ? "« Ouvrir avec sa version » est indisponible : aucune archive publiée pour la ligne de " +
          relFiche + "."
        : "« Ouvrir avec sa version » est indisponible : la fiche ne dit pas quelle version l'a écrite.", b);
    }

    b.appendChild(lab);
    b.appendChild(noeud("p", "owd-ecran-note",
      "La case ne vaut que pour « ouvrir avec sa version », et seulement dans ce navigateur. La mise à " +
      "niveau, elle, se redemande toujours."));
  }

  // ---------- la décision ----------
  function decider() {
    if (decide || !attrsPrets || !manifPret) return;
    decide = true;
    var attrs = attrsVus || {};
    var courant = specCourant();

    // 0. Fiche à moitié lue : le gel a déjà tranché et son bandeau dit tout.
    // Proposer de migrer un état qu'on n'a pas su lire serait exactement le
    // geste que le gel existe pour empêcher. Comme le gel couvre aussi le
    // owd_state disparu, c'est ici que s'arrête le personnage qui n'a plus que
    // ses attributs de repli : la montée silencieuse du cas 4 écrirait, elle
    // aussi, et écrirait cette reconstruction amputée.
    if (gele) { chargerBundle(courant); return; }

    var f = versionFiche(attrs);
    // 1. personnage sans fiche Outward : rien à dire, la fiche du jour se monte.
    if (!f || f.schema === null) { chargerBundle(courant); return; }

    var relSite = releaseSite(), schSite = schemaSite();

    // ACCORD : ce que ce site aurait fait sans le moindre épinglage, c'est-à-dire
    // aucun écran et le bundle du jour.
    //
    // UN SEUL JUGE À LA FOIS, ET C'EST CELUI QUE LE MANIFESTE DÉSIGNE. Sous
    // « blocage: schema », le schéma décide seul : le rang de release ne doit
    // PAS pouvoir accorder par-dessus un désaccord de schéma. Une disjonction
    // laisserait passer le cas {v: 1, rel: "1.2.0b"} sur un site 1.2.0b en
    // schéma 2 — même rang, donc accord — et la fiche du jour réécrirait en
    // silence un état d'un autre schéma, sans écran et sans sauvegarde de
    // secours. Le numéro de release d'un personnage n'est qu'une étiquette ;
    // seul le schéma dit ce que ses données valent. Ce n'est donc PAS une
    // disjonction, et ça a déjà été payé une fois.
    //
    // Le suffixe de la beta ne compte pas dans le rang : « 1.0.0b » et
    // « 1.0.0 » sont la même version, et une fiche écrite sur la beta ne doit
    // pas paraître venue d'ailleurs une fois rouverte sur le site stable du
    // même numéro.
    var accord = blocage() === "schema"
      ? f.schema === schSite
      : !!(f.release && memeRang(f.release, relSite));

    // 2. Choix déjà fait pour ce personnage, dans ce navigateur : on ne
    // redemande pas. Comparé LIGNE à ligne des deux côtés, parce que le bundle
    // d'archive réécrit state.rel avec SA constante dès la première
    // sauvegarde : sur une égalité stricte, l'épinglage ne tiendrait qu'une
    // session. L'épinglage ne vaut que si l'archive est toujours publiée ;
    // sinon la question se repose.
    //
    // L'ACCORD LE SAUTE. /owd/ et /owd-beta/ sont servis par la même origine,
    // donc partagent ce localStorage : le joueur qui coche « ne plus me
    // demander » sur la beta, dont le schéma a pris un cran d'avance, poserait
    // aussi son épinglage pour le site stable, où sa fiche s'accorde et où RIEN
    // ne lui aurait été demandé. Il y rouvrirait alors une archive de la ligne
    // précédente, sans écran pour le lui dire, et rejouerait une vieille fiche
    // sans le savoir. Partout ailleurs l'épinglage garde la tête, et doit la
    // garder : là, l'écran reparaîtrait à chaque ouverture, et le test 3 est
    // précisément celui qui, sur le schéma, rouvrirait la fiche avec le bundle
    // du jour en silence, contre un choix explicite.
    var pin = accord ? null : epinglageLu();
    if (pin && f.release && memeRang(pin.release, f.release, true)) {
      var arch = archiveDe(f.release);
      if (arch) { chargerBundle(arch, true); return; }
    }

    // 3. Accord avec le site : la fiche s'ouvre sans rien demander.
    if (accord) {
      // Sauf qu'elle peut venir d'une release plus JEUNE que celle servie ici
      // (fiche revenue de la beta, ou site en retard d'un déploiement). Le
      // contrat ne bloque pas sur le numéro, donc on ouvre ; mais ouvrir plus
      // vieux que le personnage se dit, sinon personne ne saurait qu'un champ
      // récent risque de tomber à la première sauvegarde.
      if (compare(f.release, relSite) === 1) bandeauPlusRecente(f.release, relSite);
      chargerBundle(courant);
      return;
    }

    // 4. Parc historique : tout ce qui aurait été écrit avant le versionnage
    // porterait le schéma 1. Personne n'a CHOISI d'être en v1, donc pas
    // d'écran : montée silencieuse (le moteur la fait dans normalize) et un
    // bandeau qui le dit, avec de quoi revenir en arrière.
    //
    // Ce cas ne se déclenchera jamais tant que le schéma servi vaut 1, puisque
    // schSite > 1 est faux : le laisser en place tel quel, il coûte une ligne
    // et il servira au premier changement de forme de l'état.
    if (f.schema === 1 && schSite > 1) { monter(true, f); return; }

    // 5. l'écran.
    avecMigrations(function () { ecranVersion(f, relSite, schSite); });
  }

  // Le manifeste est posé par l'amorceur AVANT l'amorce ; mais l'amorce peut
  // aussi être chargée par un repli qui ne l'a pas encore, ou plus du tout. On
  // l'attend donc un temps borné, puis on décide sans lui (les valeurs par
  // défaut de owd-attr-map font foi).
  function attendreManifeste() {
    var fin = Date.now() + 3500;
    (function voir() {
      if (manifeste() || Date.now() > fin) { manifPret = true; decider(); return; }
      setTimeout(voir, 100);
    })();
  }

  // message d'attente / d'orientation de roll20-fiche.html
  function note(html) {
    var n = document.getElementById("owd-roll20-note");
    if (n) { if (html == null) n.remove(); else n.innerHTML = html; }
  }

  var hydrated = false;
  function hydrate(attrs) {
    if (hydrated) return;         // une seule hydratation par vie de page
    hydrated = true;
    if (askTimer) { clearTimeout(askTimer); askTimer = null; }   // plus rien à réclamer
    note(null);
    attrs = attrs || {};
    var state = M.attrsToState(attrs);
    // attrsToState DIT dans quel état il a trouvé la fiche (propriétés non
    // énumérables, donc invisibles au JSON.stringify qui suit) :
    //   null        -> owd_state lu, état complet ;
    //   "illisible" -> owd_state présent mais cassé ;
    //   "partiel"   -> pas de owd_state, et là tout dépend du RESTE.
    //
    // « partiel » couvre deux situations opposées, et le confondre en une
    // seule coûterait la fiche. Un personnage NEUF n'a aucun attribut owd_ :
    // il n'y a rien à perdre, on ouvre et on écrit normalement. Un personnage
    // qui garde ses autres attributs owd_ mais dont owd_state a disparu, lui,
    // vient de perdre la seule copie complète de sa fiche : owd_state est
    // l'attribut le plus lourd de l'onglet Attributes de Roll20, et le vider à
    // la main est un geste tentant. Ce qui reste est le repli, volontairement
    // allégé par owd-attr-map (pas de vignettes d'équipement) : la
    // reconstruction est donc amputée exactement comme dans le cas
    // « illisible », et le premier enregistrement la graverait par-dessus. Même
    // danger, même gel — sans quoi vider owd_state serait PLUS destructeur que
    // le corrompre, puisqu'un caractère de travers, lui, arrête tout.
    //
    // La distinction ne se refait pas ici : elle est déjà dans la raison rendue
    // par attrsToState, et RAISON_SANS_FICHE la nomme. Une version antérieure
    // de owd-attr-map.js (cache du navigateur) ne connaîtrait pas cette
    // constante, et n'aurait alors pas de quoi séparer les deux cas : on ne
    // gèle que sur l'ancien critère, la fiche se comporte comme avant. Plus
    // ancienne encore, elle ne pose aucun diagnostic : `undefined` ne gèle rien
    // non plus. Compatibilité descendante voulue.
    var degrade = state ? state.degrade : null;
    var neuf = !M.RAISON_SANS_FICHE || !!(state && state.raison === M.RAISON_SANS_FICHE);
    var illisible = degrade === "illisible";
    var disparu = degrade === "partiel" && !neuf;
    if (illisible || disparu) gele = true;
    mem["owd-perso"] = JSON.stringify(state);
    mem["owd-cards"] = "{}";
    mem["owd-persos"] = "[]";     // pas de bibliothèque multi-perso dans Roll20
    lastAttrs = attrs;                 // base du diff = ce qui est réellement en base
    enVol = null;
    // le bandeau vient APRÈS le cache : son bouton « écraser » déclenche une
    // sauvegarde, qui lit mem["owd-perso"]
    if (illisible) bandeauGelIllisible(state.raison);
    else if (disparu) bandeauGelDisparu();
    // POINT D'INSERTION DE L'ÉCRAN DE VERSION. Les attributs sont là, le bundle
    // n'est pas encore chargé, `ready` vaut false : c'est le seul instant où
    // l'on connaît la fiche sans pouvoir l'écrire. decider() choisit quoi
    // charger — bundle du jour, archive, ou rien tant que le joueur n'a pas
    // tranché — et c'est lui qui appelle chargerBundle().
    attrsVus = attrs;
    attrsPrets = true;
    decider();
  }

  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (!d || d.ns !== "owd") return;
    // on n'accepte que l'hydratation de NOTRE personnage (plusieurs fiches peuvent être ouvertes)
    if (d.type === "hydrate" && (!d.charId || d.charId === CHAR_ID)) {
      // ROUTAGE CRITIQUE. Une fois la fiche hydratée, un « hydrate » n'hydrate
      // plus rien : c'est la réponse à une sonde de confirmation, qui n'a le
      // droit que de LIRE. Le passer à hydrate() — ou même le laisser tomber
      // dans son garde-fou — écraserait mem["owd-perso"], donc la saisie en
      // cours, par un état lu il y a une seconde. Les réponses tardives à la
      // relance d'ouverture arrivent par ce même chemin et se perdent sans
      // dommage : aucune sonde ne les attend.
      if (hydrated) sondeReponse(d.attrs);
      else hydrate(d.attrs);
    }
    // objet pris au tchat : diffusé à TOUTES les fiches ouvertes (le lien
    // /owd_take est public, chaque client décide s'il le prend), d'où l'absence
    // de filtre sur charId ; c'est le dialogue de réception qui demande
    // confirmation.
    else if (d.type === "take" && d.payload) window.__owdTake(d.payload);
    // liste des joueurs connectés, en réponse à __owdPlayers
    else if (d.type === "players-result") playersReply(d.players || []);
  });

  // La décision de version attend DEUX entrées : les attributs (hydrate) et le
  // manifeste. Cette seconde attente démarre ici, en parallèle de la première.
  //
  // ELLE PASSE AVANT LE CAS « page ouverte seule ». Comme c'est decider() qui
  // charge le bundle, une hydratation arrivée sans que cette attente ait
  // démarré laisserait manifPret à false pour toujours : decider() ne
  // trancherait jamais, et la fiche ne s'ouvrirait pas du tout, en silence.
  // Le cas se produit dès qu'un « hydrate » atteint une page de premier niveau
  // (harnais de test, page rouverte hors de son cadre) ; le garder sous le
  // retour ci-dessous ferait dépendre le montage de la façon dont la page est
  // imbriquée, ce qui n'a rien à y voir. Démarrer l'attente ici ne coûte qu'un
  // drapeau quand personne n'hydrate.
  attendreManifeste();

  if (STANDALONE) {
    note("Cette page est le cœur de l'extension « Fiche Outward sur Roll20 » : elle " +
         "s'affiche dans l'onglet Fiche Outward d'un personnage Roll20 et n'a rien à " +
         "montrer ici. Pour créer un personnage : <a href='personnage/'>le créateur</a>. " +
         "Pour l'extension : <a href='extension/'>la page Extension</a>.");
    return;
  }

  // Réclamer les Attributes owd_* au pont d20, avec relances : le pont vient
  // peut-être d'être injecté, et cette page arrive par le réseau.
  // La relance s'arrête à la PREMIÈRE hydratation : au-delà, un « load » de
  // plus produirait un « hydrate » de plus, et donc une réponse tardive qui
  // n'aurait plus rien à hydrater.
  var tries = 0;
  (function ask() {
    askTimer = null;
    if (hydrated) return;
    tries++;
    if (tries > 40) {             // ~20 s sans réponse : le pont n'est pas là
      note("Roll20 n'a pas répondu. Fermer et rouvrir l'onglet « Fiche Outward » ; " +
           "si rien ne change, recharger la page Roll20 (F5). Si la fiche est " +
           "dans une fenêtre séparée (popout), garder la fenêtre principale de " +
           "la partie ouverte, ou rouvrir la fiche depuis celle-ci.");
      return;
    }
    post({ type: "load" });
    askTimer = setTimeout(ask, 500);
  })();
})();
