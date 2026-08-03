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
    "html.night #jjk-bandeau .jjk-bandeau-btn{background:#4a3a26;color:#e8dcc6;border-color:#6b5636}";
  function poserStyles() {
    if (document.getElementById("jjk-bandeau-css")) return;
    var s = document.createElement("style");
    s.id = "jjk-bandeau-css";
    s.textContent = CSS_BANDEAU;
    document.head.appendChild(s);
  }
  // txt : texte brut (jamais de HTML, il peut venir d'un message d'erreur).
  // actions : [{ texte, action }] rendues en boutons à droite du texte.
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
    // Charger le bundle de la fiche APRÈS hydratation (son init lit jjk-perso).
    // Les fichiers ne sont plus nommés ici : c'est le MANIFESTE qui les donne
    // (window.__jjkManifeste, posé par l'amorceur), pour qu'une page en cache
    // ne puisse jamais figer une version du bundle. Repli si le manifeste
    // manque : le nom courant, sans ?v=.
    var m = window.__jjkManifeste;
    var spec = (m && m.bundle) || { js: ["javascripts/jjk-fiche.js"], data: null };
    // data : le jjk-creation.json à lire. Une archive embarque le sien, gelé à
    // sa date ; sans lui un ancien bundle lirait les règles d'aujourd'hui.
    window.__jjkDataUrl = spec.data || null;
    var urls = spec.js || [];
    var i = 0;
    (function suivant() {
      if (i >= urls.length) { ready = true; post({ type: "mounted" }); return; }
      var s = document.createElement("script");
      var u = urls[i++];
      s.src = u;
      s.onload = suivant;
      s.onerror = function () { post({ type: "error", error: u }); suivant(); };
      document.body.appendChild(s);
    })();
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
