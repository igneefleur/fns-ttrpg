/* Amorce Roll20 de la fiche JJK — chargée UNIQUEMENT par roll20-fiche.html,
 * la page que l'extension Roll20 affiche dans son iframe.
 *
 * Architecture « coquille » : l'extension signée ne contient plus la fiche.
 * Elle pose l'onglet « Fiche JJK », le pont d20 (Attributes) et le relais
 * tchat, puis affiche CETTE page servie par le site : chaque mise à jour du
 * site met à jour la fiche dans Roll20, sans re-signer l'extension.
 *
 * Rôle (repris de l'ancienne amorce embarquée creator-boot.js) :
 *  1. Poser window.__jjkLocalStorage : un shim SYNCHRONE adossé à un cache
 *     mémoire. jjk-creation.js (via STORE) persiste dedans à la place du
 *     localStorage réel.
 *  2. Demander au pont d20 les Attributes du perso (type "load", relancé tant
 *     que le pont n'a pas répondu) ; à la réception ("hydrate"),
 *     JjkAttrMap.attrsToState() reconstruit l'état -> cache sous « jjk-perso ».
 *  3. SEULEMENT ALORS injecter javascripts/jjk-creation.js : son init()/load()
 *     lit l'état déjà hydraté et monte la fiche.
 *  4. À chaque sauvegarde (setItem « jjk-perso »/« jjk-cards »),
 *     JjkAttrMap.stateToAttrs() redécompose l'état ; seuls les attributs
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
 *  6. GEL. attrsToState() rend son diagnostic avec l'état. Un jjk_state présent
 *     mais illisible ne donne qu'une reconstruction amputée : on l'affiche, on
 *     le dit, et on n'écrit plus rien tant que le joueur n'a pas tranché.
 *  7. ÉCRAN DE VERSION. Entre 2 et 3, quand la fiche trouvée dans le
 *     personnage n'a pas été écrite par la version que le site sert
 *     aujourd'hui, on n'ouvre RIEN : on montre ce qui change et on laisse
 *     choisir (mettre à niveau, ouvrir avec sa version, exporter). C'est le
 *     seul endroit du dispositif où ready vaut encore false alors que l'état
 *     est déjà connu : aucune écriture ne peut partir d'ici.
 *
 * Chemin des messages : cette page est imbriquée sous la page d'extension
 * creator.html, elle-même sous la frame de la feuille Roll20. Le pont d20 vit
 * dans le monde principal de la frame du HAUT : window.top.postMessage y
 * arrive directement, et le pont répond via ev.source (donc ici), quelles que
 * soient les origines intermédiaires. Messages tagués ns:"jjk" + charId.
 */
(function () {
  "use strict";
  var M = window.JjkAttrMap;

  // id du personnage Roll20, passé de creator.html au hash de cette page (#c=<id>).
  var CHAR_ID = (function () {
    var m = /[#&]c=([^&]+)/.exec(location.hash || "");
    return m ? decodeURIComponent(m[1]) : "";
  })();

  // Page ouverte directement dans un onglet (hors Roll20) : rien à hydrater,
  // on oriente le visiteur au lieu d'attendre un pont qui ne répondra jamais.
  var STANDALONE = (function () { try { return window.top === window; } catch (e) { return false; } })();

  var mem = {};                 // cache localStorage
  var SAVE_KEYS = { "jjk-perso": 1, "jjk-cards": 1 };
  var lastAttrs = {};           // ce que Roll20 a été VU contenir (base du diff)
  var enVol = null;             // lot posté, pas encore relu : ni oublié, ni tenu pour acquis
  var enVolTimer = null;
  var echecs = 0;               // confirmations manquées d'affilée
  var ready = false;            // les sauvegardes ne partent qu'après hydratation + montage
  var saveTimer = null;
  var askTimer = null;          // relance de la demande d'hydratation
  var gardeArmee = false;       // le chien de garde ne se lance qu'une fois par session
  var taillesPostees = [];      // tailles récentes de jjk_state posté (repère du chien de garde)
  var gele = false;             // fiche lue à moitié : on n'écrit plus rien (voir hydrate)

  window.__jjkLocalStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem: function (k, v) { mem[k] = String(v); if (ready && SAVE_KEYS[k]) scheduleSave(); },
    removeItem: function (k) { delete mem[k]; },
    clear: function () { mem = {}; },
    key: function (i) { return Object.keys(mem)[i] || null; },
    get length() { return Object.keys(mem).length; }
  };

  function post(msg) { msg.ns = "jjk"; msg.charId = CHAR_ID; try { window.top.postMessage(msg, "*"); } catch (e) {} }

  // ---------- mode jour / nuit ----------
  // Le CSS nuit existe déjà (jjk-creation.css : html.night .perso-atelier) ; ici
  // on ne fait que poser la classe. Préférence locale à CE navigateur (vrai
  // localStorage de la page, pas le shim) : "1" nuit, "0" jour, absente = auto.
  // L'« auto » suit ROLL20 : l'extension (2.0.3+) détecte le mode sombre de
  // Roll20 au montage de la fiche et le passe par le hash (n=1/0, décision
  // utilisateur du 2026-08-01 : re-signature explicitement accordée). Une
  // extension plus ancienne n'envoie pas d'indice : repli sur le mode sombre
  // du navigateur (prefers-color-scheme).
  // L'onglet Options de la fiche expose ce réglage via window.__jjkNight.
  var NIGHT_KEY = "jjk-r20-night";
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
  window.__jjkNight = {
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

  // Signale à jjk-creation.js qu'on est dans Roll20 : affichage condensé
  // « fiche » et jets envoyés au TCHAT Roll20 (au lieu du journal local).
  window.__jjkCompact = true;
  window.__jjkRoll = function (die, value, label) { post({ type: "roll", die: die, value: value, label: label }); };
  // envoi d'un ÉLÉMENT de la fiche (passif, arme, avantage…) au tchat Roll20
  window.__jjkSay = function (title, fields) { post({ type: "say", title: title, fields: fields }); };
  // commande de tchat COMPOSÉE par la fiche (carte « objet donné » et son lien
  // « Prendre ») : l'extension ne fait que l'envoyer, le format vit côté site
  window.__jjkChat = function (raw) { post({ type: "chat", raw: raw }); };
  // Objet pris au tchat : l'extension relaie le payload du lien. Il peut
  // arriver AVANT que jjk-creation.js soit monté (clic pendant le chargement) :
  // on le met alors en attente et on le rejoue dès que la fiche répond.
  var takeQueue = [];
  window.__jjkTake = function (payload) {
    if (typeof window.__jjkOnTake === "function") { window.__jjkOnTake(payload); return; }
    takeQueue.push(payload);
  };
  // Joueurs connectés, pour le sélecteur « À un joueur » de la barre d'envoi.
  // La fiche est une iframe d'une autre origine : elle ne peut pas lire la
  // liste de Roll20 elle-même, seule l'extension y accède. Une extension qui
  // ne connaît pas ce message ne répond RIEN (aucun accusé de réception dans
  // ce pont) : le délai rend alors la main avec null et la fiche retombe sur
  // la liste saisie à la main.
  var playersWait = [];
  window.__jjkPlayers = function (cb) {
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
    if (!takeQueue.length || typeof window.__jjkOnTake !== "function") return;
    var q = takeQueue.slice();
    takeQueue.length = 0;
    q.forEach(function (p) { window.__jjkOnTake(p); });
  }, 400);

  function scheduleSave() {
    if (gele) return;           // rien ne sort d'une fiche qu'on n'a pas su lire en entier
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 400);
  }
  function doSave() {
    saveTimer = null;
    var state;
    try { state = JSON.parse(mem["jjk-perso"] || "null"); } catch (e) { return; }
    if (!state) return;
    var card = null;
    try { var cards = JSON.parse(mem["jjk-cards"] || "{}"); card = cards && cards._current; } catch (e) {}
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
    // repère du chien de garde : la taille du jjk_state qu'on vient de poster
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
  // jjk_state pèse couramment des centaines de kilo-octets ; le comparer en
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
  // Les styles sont injectés d'ici et non posés dans stylesheets/jjk-roll20.css :
  // ce bandeau doit pouvoir s'afficher même quand la feuille n'a pas été
  // chargée (manifeste en repli, réseau coupé en cours de route) — or c'est
  // précisément dans ces moments qu'il a quelque chose à dire.
  var CSS_BANDEAU =
    "#jjk-bandeau{position:sticky;top:0;z-index:50;display:flex;flex-wrap:wrap;align-items:center;" +
    "gap:.5rem;padding:.5rem .7rem;background:#f6e2c8;color:#4c3a24;border-bottom:1px solid #c9a97c;" +
    "font-family:'Alegreya','EB Garamond',Garamond,serif;font-size:.72rem;line-height:1.45}" +
    "#jjk-bandeau .jjk-bandeau-txt{flex:1 1 14rem;min-width:0}" +
    "#jjk-bandeau .jjk-bandeau-btn{flex:0 0 auto;padding:.2rem .6rem;border:1px solid #c9a97c;" +
    "border-radius:.2rem;background:#fffaf0;color:#4c3a24;font:inherit;cursor:pointer}" +
    "#jjk-bandeau .jjk-bandeau-btn:hover{background:#fff}" +
    "html.night #jjk-bandeau{background:#3a2c1c;color:#e8dcc6;border-bottom-color:#6b5636}" +
    "html.night #jjk-bandeau .jjk-bandeau-btn{background:#4a3a26;color:#e8dcc6;border-color:#6b5636}" +
    // Écran de version : il RECOUVRE la page (position fixed, z-index au-dessus
    // du bandeau) parce qu'il n'annonce pas, il barre le passage. La fiche
    // n'est pas derrière : elle n'est pas encore chargée.
    "#jjk-ecran{position:fixed;top:0;left:0;right:0;bottom:0;z-index:80;overflow:auto;" +
    "padding:1rem;background:#f5ecdc;color:#3a2c1c;" +
    "font-family:'Alegreya','EB Garamond',Garamond,serif;font-size:.8rem;line-height:1.5}" +
    "#jjk-ecran .jjk-ecran-boite{box-sizing:border-box;max-width:34rem;margin:0 auto;background:#fffaf0;" +
    "border:1px solid #c9a97c;border-radius:.3rem;padding:.9rem 1rem}" +
    "#jjk-ecran.jjk-ecran-rouge .jjk-ecran-boite{border-color:#a5342c;background:#fff3f0}" +
    "#jjk-ecran h1{margin:0 0 .5rem;font-family:'Cinzel',serif;font-size:1.15rem;line-height:1.25}" +
    "#jjk-ecran h2{margin:.85rem 0 .25rem;font-size:.88rem}" +
    "#jjk-ecran p{margin:.35rem 0}" +
    "#jjk-ecran ul{margin:.3rem 0;padding-left:1.1rem}" +
    "#jjk-ecran li{margin:.25rem 0}" +
    "#jjk-ecran .jjk-ecran-vers{display:flex;flex-wrap:wrap;gap:.2rem 1.4rem;margin:.5rem 0;" +
    "padding:.35rem .6rem;background:#f6e2c8;border-radius:.2rem}" +
    "#jjk-ecran .jjk-ecran-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin:.85rem 0 .4rem}" +
    "#jjk-ecran button{padding:.35rem .7rem;border:1px solid #c9a97c;border-radius:.2rem;" +
    "background:#fffaf0;color:#4c3a24;font:inherit;cursor:pointer}" +
    "#jjk-ecran button:hover:not([disabled]){background:#fff}" +
    "#jjk-ecran button.jjk-ecran-primaire{background:#4c3a24;color:#fffaf0;border-color:#4c3a24}" +
    "#jjk-ecran button[disabled]{opacity:.45;cursor:not-allowed}" +
    "#jjk-ecran .jjk-ecran-note{font-size:.72rem;opacity:.85}" +
    "#jjk-ecran label.jjk-ecran-epingle{display:block;margin:.2rem 0}" +
    // box-sizing explicite : sans lui le textarea déborde de la boîte dans
    // l'iframe Roll20, où la feuille de la fiche n'est pas toujours chargée.
    "#jjk-ecran textarea{box-sizing:border-box;width:100%;min-height:8rem;margin-top:.3rem;" +
    "font-family:'Roboto Mono',monospace;font-size:.66rem}" +
    "html.night #jjk-ecran{background:#241b12;color:#e8dcc6}" +
    "html.night #jjk-ecran .jjk-ecran-boite{background:#33271a;border-color:#6b5636}" +
    "html.night #jjk-ecran.jjk-ecran-rouge .jjk-ecran-boite{background:#3a231f;border-color:#a5342c}" +
    "html.night #jjk-ecran .jjk-ecran-vers{background:#4a3a26}" +
    "html.night #jjk-ecran button{background:#4a3a26;color:#e8dcc6;border-color:#6b5636}" +
    "html.night #jjk-ecran button.jjk-ecran-primaire{background:#e8dcc6;color:#33271a;border-color:#e8dcc6}" +
    "html.night #jjk-ecran textarea{background:#241b12;color:#e8dcc6;border-color:#6b5636}";
  function poserStyles() {
    if (document.getElementById("jjk-bandeau-css")) return;
    var s = document.createElement("style");
    s.id = "jjk-bandeau-css";
    s.textContent = CSS_BANDEAU;
    document.head.appendChild(s);
  }
  // txt : texte brut (jamais de HTML, il peut venir d'un message d'erreur).
  // actions : [{ texte, action, acte }] rendues en boutons à droite du texte.
  // `acte` est un nom stable posé en data-jjk-act : les libellés se réécrivent,
  // les harnais de test s'accrochent à ça et non à la prose.
  function bandeau(txt, actions) {
    poserStyles();
    var b = document.getElementById("jjk-bandeau");
    if (!b) {
      b = document.createElement("div");
      b.id = "jjk-bandeau";
      document.body.insertBefore(b, document.body.firstChild);
    }
    b.innerHTML = "";
    var p = document.createElement("span");
    p.className = "jjk-bandeau-txt";
    p.textContent = txt;
    b.appendChild(p);
    (actions || []).forEach(function (a) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "jjk-bandeau-btn";
      btn.textContent = a.texte;
      if (a.acte) btn.setAttribute("data-jjk-act", a.acte);
      btn.onclick = a.action;
      b.appendChild(btn);
    });
    return b;
  }
  function fermerBandeau() {
    var b = document.getElementById("jjk-bandeau");
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }
  function bandeauPerte() {
    bandeau("Roll20 n'enregistre pas cette fiche. Les modifications restent dans cette fenêtre " +
            "et seront perdues en la fermant. Si la fiche est ouverte dans une fenêtre séparée, " +
            "garder la fenêtre principale de la partie ouverte ; sinon, vérifier que le " +
            "personnage n'est pas en lecture seule.", [
      { texte: "Réessayer", action: function () {
          fermerBandeau();
          echecs = 0;
          enVol = null;
          lastAttrs = {};        // on ne sait plus ce que Roll20 tient : tout réémettre
          gardeArmee = false;    // et refaire surveiller la première écriture qui suit
          scheduleSave();
        } },
      { texte: "Masquer", action: fermerBandeau }
    ]);
  }

  // Fiche à moitié lue : jjk_state est là mais ne se lit pas (un caractère tapé
  // dans l'onglet Attributes de Roll20 suffit). attrsToState a rendu la
  // meilleure reconstruction possible, qui a le droit de s'AFFICHER mais jamais
  // de se réécrire : elle ne porte pas ce que le repli ne sait pas porter, et
  // la première sauvegarde remplacerait l'original cassé par cette version
  // amputée. D'où le gel. Pas de bouton « Masquer » ici : un bandeau caché
  // laisserait croire que la fiche s'enregistre. Le seul geste offert est
  // explicite et dit ce qu'il coûte.
  function bandeauGel(raison) {
    bandeau("Cette fiche n'a pas pu être lue en entier (" + (raison || "état illisible") + "). " +
            "Ce qui s'affiche est une reconstruction incomplète : rien n'est enregistré, pour ne " +
            "pas écraser ce que Roll20 contient encore. Récupérer l'attribut jjk_state du " +
            "personnage avant toute chose ; il porte la fiche entière.", [
      { texte: "Écraser avec ce qui a pu être lu", action: function () {
          fermerBandeau();
          gele = false;
          lastAttrs = {};      // la base du diff ne vaut plus rien : tout réémettre
          enVol = null;
          scheduleSave();
        } }
    ]);
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
  var PIN_PREFIX = "jjk-r20-version:";
  // Ce que la montée met à l'abri, dans le personnage lui-même.
  var BACKUP = "backup";

  var attrsVus = null;          // les attributs reçus, gardés pour la décision
  var attrsPrets = false;
  var manifPret = false;
  var decide = false;           // decider() n'agit qu'une fois
  var boiteCourante = null;     // la boîte de l'écran affiché (pour y ajouter le JSON)

  function manifeste() { return window.__jjkManifeste || null; }
  function releaseSite() {
    var r = null;
    try { r = M.release ? M.release() : null; } catch (e) {}
    return r || M.RELEASE || "";
  }
  function schemaSite() {
    var m = manifeste();
    var n = m ? parseInt(m.schema, 10) : NaN;
    if (isFinite(n)) return n;
    // repli : l'invariant majeur(RELEASE) === SCHEMA, tenu par verif_versions.py
    var maj = parseInt(String(releaseSite()).split(".")[0], 10);
    return isFinite(maj) ? maj : 1;
  }
  // Décision produit : l'écran paraît dès que la RELEASE diffère, pas seulement
  // au changement de schéma. Le manifeste peut demander l'autre réglage.
  function blocage() {
    var m = manifeste();
    return (m && m.blocage === "schema") ? "schema" : "release";
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
      js: (b && listeSure(b.js)) ? b.js : ["javascripts/jjk-fiche.js"],
      css: (b && Array.isArray(b.css)) ? b.css : [],
      data: (b && b.data) || null
    };
  }

  // Archive d'une version passée, déclarée par le manifeste sous son numéro :
  //   "archives": { "2.9.0": { "js": [...], "css": [...], "data": "...",
  //                            "attrmap": "..." } }
  // Un simple tableau de scripts est accepté. Rend null si rien n'est publié
  // pour cette version, ou si une seule URL sort du site.
  function archiveDe(rel) {
    if (typeof rel !== "string" || !rel) return null;
    var m = manifeste();
    var a = (m && m.archives && typeof m.archives === "object") ? m.archives[rel] : null;
    if (!a) return null;
    var spec = Array.isArray(a) ? { js: a, css: [], data: null, attrmap: null }
             : { js: a.js, css: Array.isArray(a.css) ? a.css : [], data: a.data == null ? null : a.data,
                 attrmap: a.attrmap == null ? null : a.attrmap };
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
  function epinglagePoser(rel) {
    try {
      localStorage.setItem(PIN_PREFIX + CHAR_ID,
        JSON.stringify({ release: String(rel), quand: new Date().toISOString() }));
    } catch (e) {}
  }

  // Version de la fiche trouvée dans le personnage, { schema, release } ou null.
  //
  // C'est jjk_state qui fait foi : lui seul est réécrit par la version qui a
  // réellement enregistré la fiche. Le max de jjk_version, lui, porte la
  // release que l'amorce croyait servir au moment de l'écriture, et une archive
  // qui tourne sous le manifeste du jour y inscrit la version DU SITE : s'y
  // fier ferait passer une fiche d'archive pour une fiche à jour, et « ouvrir
  // avec sa version » n'aurait plus d'objet. ficheDe() applique cette priorité
  // (état d'abord, jjk_version en repli quand l'état ne se lit plus) sans
  // reconstruire l'état, ce qui reste bon marché sur un jjk_state énorme.
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
    var e = document.getElementById("jjk-ecran");
    if (e && e.parentNode) e.parentNode.removeChild(e);
    boiteCourante = null;
  }
  function ecran(titre, rouge) {
    poserStyles();
    fermerEcran();
    var fond = document.createElement("div");
    fond.id = "jjk-ecran";
    if (rouge) fond.className = "jjk-ecran-rouge";
    fond.setAttribute("role", "dialog");
    var boite = noeud("div", "jjk-ecran-boite");
    boite.appendChild(noeud("h1", null, titre));
    fond.appendChild(boite);
    document.body.appendChild(fond);
    boiteCourante = boite;
    return boite;
  }
  function zoneActions(boite) {
    var d = noeud("div", "jjk-ecran-actions");
    boite.appendChild(d);
    return d;
  }
  // acte : nom stable en data-jjk-act, sur lequel s'accrochent les harnais.
  function bouton(zone, texte, acte, action, primaire) {
    var b = noeud("button", primaire ? "jjk-ecran-primaire" : null, texte);
    b.type = "button";
    b.setAttribute("data-jjk-act", acte);
    b.onclick = action;
    zone.appendChild(b);
    return b;
  }
  function griser(btn, raison, boite) {
    btn.disabled = true;
    btn.title = raison;
    boite.appendChild(noeud("p", "jjk-ecran-note", raison));
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
    var brut = mem["jjk-perso"] || "{}";
    try { return JSON.stringify(JSON.parse(brut), null, 2); } catch (e) { return brut; }
  }
  function nomFichier() {
    var n = "";
    try { n = (JSON.parse(mem["jjk-perso"] || "{}") || {}).name || ""; } catch (e) {}
    return (n || "personnage-jjk") + ".json";
  }
  // Le JSON en clair, sélectionné, avec un bouton copier : c'est le REPLI de
  // l'export. L'iframe de l'extension n'a pas forcément allow-downloads, et un
  // téléchargement refusé là-dedans ne lève rien du tout — impossible de le
  // détecter. On propose donc toujours le texte après la tentative, plutôt que
  // de laisser croire à un fichier qui n'existe pas.
  function montrerJson(txt, intro) {
    var b = boiteCourante;
    if (!b) return;
    var zone = document.getElementById("jjk-ecran-json-zone");
    if (!zone) {
      zone = noeud("div");
      zone.id = "jjk-ecran-json-zone";
      b.appendChild(zone);
    }
    zone.innerHTML = "";
    zone.appendChild(noeud("p", "jjk-ecran-note", intro));
    var ta = noeud("textarea");
    ta.id = "jjk-ecran-json";
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
    // data : le jjk-creation.json à lire. Une archive embarque le sien, gelé à
    // sa date ; sans lui un ancien bundle lirait les règles d'aujourd'hui.
    window.__jjkDataUrl = spec.data || null;
    if (remplacerCss) {
      // Les feuilles du jour portent data-jjk (posé par l'amorceur) : une
      // archive amène les siennes, et faire cohabiter les deux donnerait une
      // fiche à moitié restylée.
      var vieux = document.querySelectorAll("link[data-jjk]");
      for (var k = 0; k < vieux.length; k++) {
        if (vieux[k].parentNode) vieux[k].parentNode.removeChild(vieux[k]);
      }
      (spec.css || []).forEach(function (u) {
        var l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = u;
        l.setAttribute("data-jjk", "1");
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
        var neuf = window.JjkAttrMap;
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
  // poser window.JjkMigr, il ne touche à rien) ; s'il manque, l'écran le dit au
  // lieu d'inventer un « rien à signaler ».
  function avecMigrations(cb) {
    if (window.JjkMigr && window.JjkMigr.resume) { cb(); return; }
    var u = null;
    (specCourant().js || []).forEach(function (x) { if (!u && /jjk-migrations/.test(x)) u = x; });
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
  // jjk_backup, on la RELIT dans le personnage, et seulement alors on injecte
  // le bundle qui migrera. Un backup qu'on n'a pas relu ne vaut rien : le pont
  // avale l'échec d'une écriture sans le dire (voir 5. en tête de fichier).
  function lotBackup(f) {
    var brut = val((attrsVus || {})[M.PREFIX + "state"], "current");
    // Sans jjk_state lisible, on met à l'abri la reconstruction champ par
    // champ : c'est exactement ce que la migration s'apprête à remplacer.
    var contenu = brut ? String(brut) : (mem["jjk-perso"] || "");
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

  // « Restaurer l'état d'origine » : relit jjk_backup DANS LE PERSONNAGE (pas
  // en mémoire : c'est Roll20 qui fait foi) et le réécrit dans jjk_state, avec
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
          "L'attribut jjk_backup du personnage est vide ou illisible. Rien n'a été touché ; la fiche reste " +
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
      // jjk_version repart au schéma d'origine, sinon la fiche restaurée serait
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
          montrerJson(brut, "L'état d'origine, tel qu'il était gardé dans jjk_backup.");
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
            "jjk_backup du personnage.", [
      { texte: "Restaurer l'état d'origine", acte: "restaurer", action: restaurer },
      { texte: "Exporter (JSON)", acte: "export", action: exporter },
      { texte: "Masquer", acte: "masquer", action: fermerBandeau }
    ]);
  }

  // ---------- l'écran lui-même ----------
  function ecranVersion(f, relSite, schSite) {
    var relFiche = f.release || null;
    var duFutur = (f.schema != null && f.schema > schSite);
    var b = ecran(duFutur ? "Cette fiche vient d'une version plus récente que le site"
                          : "Cette fiche n'a pas la version du site", false);
    var v = noeud("div", "jjk-ecran-vers");
    v.appendChild(noeud("span", null, "Fiche du personnage : " + texteVersion(relFiche, f.schema)));
    v.appendChild(noeud("span", null, "Site : " + texteVersion(relSite, schSite)));
    b.appendChild(v);
    b.appendChild(noeud("p", null,
      "Rien n'a été lu de travers et rien n'a été enregistré : aucune écriture ne partira tant qu'un " +
      "choix n'aura pas été fait."));

    b.appendChild(noeud("h2", null, "Ce que la mise à niveau change"));
    var pas = null;
    try {
      if (window.JjkMigr && window.JjkMigr.resume) pas = window.JjkMigr.resume(f.schema, schSite);
    } catch (e) { pas = null; }
    if (duFutur) {
      b.appendChild(noeud("p", null,
        "La fiche a été écrite par une version plus récente que celle servie ici. Le site ne sait pas la " +
        "redescendre, et l'ouvrir avec le code d'aujourd'hui lui ferait perdre ce qu'il ne connaît pas."));
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
        li.appendChild(noeud("span", "jjk-ecran-pas", e.titre + " : "));
        li.appendChild(document.createTextNode(e.notes));
        ul.appendChild(li);
      });
      b.appendChild(ul);
    }

    // L'épinglage ne vaut QUE pour « ouvrir avec sa version » : la case est
    // construite avant les boutons (leur gestionnaire la lit) mais posée après
    // eux. Elle n'est jamais honorée par la montée, qui est destructive et ne
    // se rejoue pas de mémoire.
    var lab = noeud("label", "jjk-ecran-epingle");
    var caseEp = document.createElement("input");
    caseEp.type = "checkbox";
    caseEp.id = "jjk-ecran-epingle";
    lab.appendChild(caseEp);
    lab.appendChild(document.createTextNode(" Ne plus me demander pour ce personnage"));

    var z = zoneActions(b);
    var bMonter = bouton(z, "Mettre la fiche à niveau (" + relSite + ")", "monter", function () {
      monter(false, f);
    }, !duFutur);
    var arch = archiveDe(relFiche);
    var bArch = bouton(z, "Ouvrir avec sa version (" + (relFiche || "inconnue") + ")", "archive", function () {
      if (!arch) return;   // bouton grisé : ceinture, au cas où un clic passe quand même
      if (caseEp.checked && relFiche) epinglagePoser(relFiche);
      chargerBundle(arch, true);
    }, duFutur);
    boutonExport(z);

    if (duFutur) {
      griser(bMonter, "La mise à niveau est indisponible : la fiche est plus récente que le site, la " +
                      "rétrograder ici lui ferait perdre ce qui n'existe pas encore de ce côté.", b);
    }
    if (!arch) {
      griser(bArch, relFiche
        ? "« Ouvrir avec sa version » est indisponible : aucune archive publiée pour " + relFiche + "."
        : "« Ouvrir avec sa version » est indisponible : la fiche ne dit pas quelle version l'a écrite.", b);
    }

    b.appendChild(lab);
    b.appendChild(noeud("p", "jjk-ecran-note",
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
    // geste que le gel existe pour empêcher.
    if (gele) { chargerBundle(courant); return; }

    var f = versionFiche(attrs);
    // 1. personnage sans fiche JJK : rien à dire, la fiche du jour se monte.
    if (!f || f.schema === null) { chargerBundle(courant); return; }

    var relSite = releaseSite(), schSite = schemaSite();
    // 2. même version que le site.
    if (f.release && f.release === relSite) { chargerBundle(courant); return; }
    if (blocage() === "schema" && f.schema === schSite) { chargerBundle(courant); return; }

    // 3. Parc historique : tout ce qui a été écrit avant le versionnage porte
    // le schéma 1. Personne n'a CHOISI d'être en v1, donc pas d'écran : montée
    // silencieuse (le moteur la fait dans normalize) et un bandeau qui le dit,
    // avec de quoi revenir en arrière.
    if (f.schema === 1 && schSite > 1) { monter(true, f); return; }

    // 4. Choix déjà fait pour ce personnage, dans ce navigateur : on ne
    // redemande pas. L'épinglage ne vaut que si l'archive est toujours
    // publiée ; sinon la question se repose, avec sa réponse grisée.
    var pin = epinglageLu();
    if (pin && f.release && pin.release === f.release) {
      var arch = archiveDe(f.release);
      if (arch) { chargerBundle(arch, true); return; }
    }

    // 5. l'écran.
    avecMigrations(function () { ecranVersion(f, relSite, schSite); });
  }

  // Le manifeste est posé par l'amorceur AVANT l'amorce ; mais l'amorce peut
  // aussi être chargée par un repli qui ne l'a pas encore, ou plus du tout. On
  // l'attend donc un temps borné, puis on décide sans lui (les valeurs par
  // défaut de jjk-attr-map font foi).
  function attendreManifeste() {
    var fin = Date.now() + 3500;
    (function voir() {
      if (manifeste() || Date.now() > fin) { manifPret = true; decider(); return; }
      setTimeout(voir, 100);
    })();
  }

  // message d'attente / d'orientation de roll20-fiche.html
  function note(html) {
    var n = document.getElementById("jjk-roll20-note");
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
    //   null      -> jjk_state lu, état complet ;
    //   "partiel" -> pas de jjk_state, fiche neuve ou d'avant : cas normal ;
    //   "illisible" -> jjk_state présent mais cassé : on gèle les écritures.
    // Une version antérieure de jjk-attr-map.js (cache du navigateur) ne pose
    // rien : `undefined` ne gèle pas, la fiche se comporte comme avant.
    var casse = !!(state && state.degrade === "illisible");
    if (casse) gele = true;
    mem["jjk-perso"] = JSON.stringify(state);
    mem["jjk-cards"] = "{}";
    mem["jjk-persos"] = "[]";     // pas de bibliothèque multi-perso dans Roll20
    lastAttrs = attrs;                 // base du diff = ce qui est réellement en base
    enVol = null;
    // le bandeau vient APRÈS le cache : son bouton « écraser » déclenche une
    // sauvegarde, qui lit mem["jjk-perso"]
    if (casse) bandeauGel(state.raison);
    // POINT D'INSERTION DE L'ÉCRAN DE VERSION. Les attributs sont là, le bundle
    // n'est pas encore chargé, `ready` vaut false : c'est le seul instant où
    // l'on connaît la fiche sans pouvoir l'écrire. decider() choisit quoi
    // charger — bundle du jour, archive, ou rien tant que le joueur n'a pas
    // tranché — et c'est lui, désormais, qui appelle chargerBundle().
    attrsVus = attrs;
    attrsPrets = true;
    decider();
  }

  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (!d || d.ns !== "jjk") return;
    // on n'accepte que l'hydratation de NOTRE personnage (plusieurs fiches peuvent être ouvertes)
    if (d.type === "hydrate" && (!d.charId || d.charId === CHAR_ID)) {
      // ROUTAGE CRITIQUE. Une fois la fiche hydratée, un « hydrate » n'hydrate
      // plus rien : c'est la réponse à une sonde de confirmation, qui n'a le
      // droit que de LIRE. Le passer à hydrate() — ou même le laisser tomber
      // dans son garde-fou — écraserait mem["jjk-perso"], donc la saisie en
      // cours, par un état lu il y a une seconde. Les réponses tardives à la
      // relance d'ouverture arrivent par ce même chemin et se perdent sans
      // dommage : aucune sonde ne les attend.
      if (hydrated) sondeReponse(d.attrs);
      else hydrate(d.attrs);
    }
    // objet pris au tchat : diffusé à TOUTES les fiches ouvertes (le lien est
    // public, chaque client décide s'il le prend), d'où l'absence de filtre
    // sur charId ; c'est le dialogue de réception qui demande confirmation.
    else if (d.type === "take" && d.payload) window.__jjkTake(d.payload);
    // liste des joueurs connectés, en réponse à __jjkPlayers
    else if (d.type === "players-result") playersReply(d.players || []);
  });

  // La décision de version attend DEUX entrées : les attributs (hydrate) et le
  // manifeste. Cette seconde attente démarre ici, en parallèle de la première.
  //
  // ELLE PASSE AVANT LE CAS « page ouverte seule ». Depuis que c'est decider()
  // qui charge le bundle, une hydratation arrivée sans que cette attente ait
  // démarré laisserait manifPret à false pour toujours : decider() ne
  // trancherait jamais, et la fiche ne s'ouvrirait pas du tout, en silence.
  // Le cas se produit dès qu'un « hydrate » atteint une page de premier niveau
  // (harnais de test, page rouverte hors de son cadre) ; le garder sous le
  // retour ci-dessous ferait dépendre le montage de la façon dont la page est
  // imbriquée, ce qui n'a rien à y voir. Démarrer l'attente ici ne coûte qu'un
  // drapeau quand personne n'hydrate.
  attendreManifeste();

  if (STANDALONE) {
    note("Cette page est le cœur de l'extension « Fiche JJK sur Roll20 » : elle " +
         "s'affiche dans l'onglet Fiche JJK d'un personnage Roll20 et n'a rien à " +
         "montrer ici. Pour créer un personnage : <a href='personnage/'>le créateur</a>. " +
         "Pour l'extension : <a href='extension/'>la page Extension</a>.");
    return;
  }

  // Réclamer les Attributes jjk_* au pont d20, avec relances : le pont vient
  // peut-être d'être injecté, et cette page arrive par le réseau (plus tard
  // que l'ancienne amorce embarquée).
  // La relance s'arrête à la PREMIÈRE hydratation : au-delà, un « load » de
  // plus produirait un « hydrate » de plus, et donc une réponse tardive qui
  // n'aurait plus rien à hydrater.
  var tries = 0;
  (function ask() {
    askTimer = null;
    if (hydrated) return;
    tries++;
    if (tries > 40) {             // ~20 s sans réponse : le pont n'est pas là
      note("Roll20 n'a pas répondu. Fermer et rouvrir l'onglet « Fiche JJK » ; " +
           "si rien ne change, recharger la page Roll20 (F5). Si la fiche est " +
           "dans une fenêtre séparée (popout), garder la fenêtre principale de " +
           "la partie ouverte, ou rouvrir la fiche depuis celle-ci.");
      return;
    }
    post({ type: "load" });
    askTimer = setTimeout(ask, 500);
  })();
})();
