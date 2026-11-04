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
 *     le dit, et on n'écrit plus rien tant que le joueur n'a pas tranché. Un
 *     jjk_state VIDÉ chez un personnage qui garde ses autres attributs jjk_
 *     donne exactement la même reconstruction amputée, et vaut donc le même
 *     gel : sans lui, vider l'attribut le plus lourd de l'onglet Attributes
 *     serait PLUS destructeur que le corrompre.
 *  7. ÉCRAN DE VERSION. Entre 2 et 3, toute fiche versionnée dont la release
 *     OU le schéma diffère de la version servie reste fermée. Le joueur choisit
 *     explicitement la mise à niveau ou l'ouverture avec une archive ; il peut
 *     exporter avant de trancher. C'est le seul endroit où ready vaut encore
 *     false alors que l'état est déjà connu : aucune écriture ne peut partir.
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
  var VIEW_ID = "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  var modePartage = "consultation", presenceRecu = false, presenceTimer = null, presenceDead = false;
  window.__jjkGlobalMode = modePartage;
  window.__jjkCanEdit = function () { return window.__jjkGlobalMode === "edition"; };

  var mem = {};                 // cache localStorage
  var SAVE_KEYS = { "jjk-perso": 1, "jjk-cards": 1 };
  var lastAttrs = {};           // ce que Roll20 a été VU contenir (base du diff)
  var enVol = null;             // lot posté, pas encore relu : ni oublié, ni tenu pour acquis
  var enVolTimer = null;
  var echecs = 0;               // confirmations manquées d'affilée
  var premierPendingAt = 0, saveStatusTimer = null, saveFailure = "";
  var ready = false;            // les sauvegardes ne partent qu'après hydratation + montage
  var saveTimer = null;
  var askTimer = null;          // relance de la demande d'hydratation
  var gardeArmee = false;       // le chien de garde ne se lance qu'une fois par session
  var taillesPostees = [];      // tailles récentes de jjk_state posté (repère du chien de garde)
  var gele = false;             // fiche lue à moitié ou transport non fiable : aucune écriture
  var compactActif = false, compactSession = null, compactPoll = null, compactPollEnCours = false;
  var compactRecovering = false, compactErrorMessage = "";
  var compactMigrationSentAt = 0;
  var compactStorageReady = false, compactCleanupAt = 0, versionBloquee = false;
  var backupLastAt = 0, backupPendingRequest = null, backupPendingAt = 0, backupRetryAt = 0;
  var pontVerifie = false, pontRefuse = false, pontChecking = false, hydrateEnAttente = null, relectureOuverture = false;

  window.__jjkLocalStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem: function (k, v) { mem[k] = String(v); if (ready && SAVE_KEYS[k]) scheduleSave(); },
    removeItem: function (k) { delete mem[k]; },
    clear: function () { mem = {}; },
    key: function (i) { return Object.keys(mem)[i] || null; },
    get length() { return Object.keys(mem).length; }
  };

  function post(msg) { msg.ns = "jjk"; msg.charId = CHAR_ID; try { window.top.postMessage(msg, "*"); } catch (e) {} }
  function sauvegardeLocale(attrs, reason, stateForce) {
    if (!attrs || !M || !CHAR_ID) return;
    var state = stateForce || null;
    if (!state) {
      try {
        if (attrs.jjk_storage && M.attrsToState) state = M.attrsToState(attrs);
        else { var raw = attrs[M.PREFIX + "state"]; state = raw && raw.current ? JSON.parse(raw.current) : null; }
      } catch (e) {}
    }
    if (!state || typeof state !== "object" || !Number.isSafeInteger(state.v) || state.degrade) return;
    var now = Date.now();
    if (backupPendingRequest && now - backupPendingAt <= 30000) return;
    if (backupPendingRequest) { backupPendingRequest = null; backupRetryAt = now + 30000; }
    if (now < backupRetryAt) return;
    if (reason !== "opening" && backupLastAt && now - backupLastAt < 3600000) return;
    var request = VIEW_ID + "-backup-" + now;
    backupPendingRequest = request; backupPendingAt = now;
    // Le pont ne reçoit jamais les attributs fournis par la page : il reconstruit
    // la photographie depuis sa dernière lecture Roll20 confirmée. viewId lie
    // cette demande au document qui a réellement été hydraté.
    post({ type: "backup-snapshot", request: request, reason: reason || "autosave", state: state, viewId: VIEW_ID });
  }

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
    if (gele || versionBloquee) return;           // rien ne sort d'une fiche qu'on n'a pas su lire en entier
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 400);
  }
  function doSave() {
    saveTimer = null;
    if (versionBloquee) return;
    var state;
    try { state = JSON.parse(mem["jjk-perso"] || "null"); } catch (e) { return; }
    if (!state) return;
    var card = null;
    try { var cards = JSON.parse(mem["jjk-cards"] || "{}"); card = cards && cards._current; } catch (e) {}
    if (compactActif && compactSession) { doSaveCompact(state, card); return; }
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
    actualiseStatutEnregistrement();
  }
  function erreurCompact(message) {
    gele = true;
    compactRecovering = true;
    compactErrorMessage = String(message || "Erreur de synchronisation inconnue");
    bandeau("Synchronisation suspendue pour protéger les données : " + compactErrorMessage + ". La fiche reste en lecture seule jusqu'à une relecture complète.", [
      { texte: "Réessayer", acte: "compact-retry", action: function () {
          fermerBandeau();
          planifieCompactPoll(0);
        } },
      { texte: "Exporter", acte: "compact-export", action: exporter }
    ]);
    planifieCompactPoll(1800);
  }

  function doSaveCompact(state, card) {
    try {
      if (versionBloquee) return;
      compactSession.capture(state);
      actualiseStatutEnregistrement();
      var mirrors = M.mirrorAttrs ? M.mirrorAttrs(state, card) : {};
      if (!compactSession.hasBase) {
        // Première écriture : tous les blocs de la photographie sont postés
        // ensemble, puis confirmés par relecture avant de devenir la base.
        // Cette photographie initialise le stockage ; ce n'est pas une
        // modification du joueur et elle ne doit pas déclencher le bandeau
        // « Enregistrement en attente ».
        var migration = fusion(compactSession.migration || {}, mirrors);
        var changedMigration = diff(lastAttrs, migration);
        if (Object.keys(changedMigration).length &&
            (!compactMigrationSentAt || Date.now() - compactMigrationSentAt >= 10000)) {
          compactMigrationSentAt = Date.now();
          post({ type: "save", attrs: changedMigration });
          var meta = changedMigration.jjk_storage || migration.jjk_storage;
          taillesPostees.push(meta ? String(meta.current).length : 0);
          if (taillesPostees.length > 5) taillesPostees.shift();
        }
        actualiseStatutEnregistrement();
        return;
      }
      // La photographie n'est utilisable qu'après le marqueur ready confirmé
      // par une lecture fraîche. Les saisies peuvent être capturées en mémoire,
      // mais aucun journal ne part avant cette bascule.
      var phase = null;
      try { phase = JSON.parse(String(val(lastAttrs.jjk_storage, "current") || "{}")).phase; } catch (ePhase) {}
      if (phase !== "ready" || !compactStorageReady) {
        post({ type: "storage-activate", storage: "fiche", viewId: VIEW_ID });
        planifieCompactPoll(1400);
        return;
      }
      // Après l'activation, les modifications vont dans le journal append-only.
      // Les attributs miroirs restent limités aux macros et barres de jetons.
      var changedMirrors = diff(fusion(lastAttrs, enVol), mirrors);
      if (Object.keys(changedMirrors).length) {
        enVol = fusion(enVol, changedMirrors);
        post({ type: "save", attrs: changedMirrors });
        armerConfirmation(); armerGarde();
      }
      var operations = compactSession.outgoing(), ids = Object.keys(operations);
      if (ids.length || Object.keys(compactSession.payloads || {}).length) {
        post({ type: "storage-ops", session: VIEW_ID, viewId: VIEW_ID, epoch: compactSession.epoch,
          ops: ids.map(function (id) { return operations[id]; }), payloads: compactSession.payloads });
        planifieCompactPoll(900);
      }
      actualiseStatutEnregistrement();
    } catch (e) {
      erreurCompact("La synchronisation par blocs a rencontré une erreur : " + String(e && e.message || e));
    }
  }
  function planifieCompactPoll(delai) {
    if (!compactActif || compactPoll !== null) return;
    compactPoll = setTimeout(function () { compactPoll = null; pollCompact(); }, delai || 1400);
  }
  function verrouilleVersionFuture(state) {
    if (!state || versionBloquee) return versionBloquee;
    var schemaDistant = Number(state.v), releaseDistante = String(state.rel || "");
    var plusRecent = (isFinite(schemaDistant) && schemaDistant > schemaSite()) || compare(releaseDistante, releaseSite()) === 1;
    if (!plusRecent) return false;
    versionBloquee = true; gele = true;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (compactPoll) { clearTimeout(compactPoll); compactPoll = null; }
    post({ type: "storage-release", storage: "fiche", viewId: VIEW_ID });
    ecranVersion({ schema: schemaDistant, release: releaseDistante }, releaseSite(), schemaSite());
    return true;
  }
  function phaseStockage(attrs) {
    try { return JSON.parse(String(val(attrs && attrs.jjk_storage, "current") || "{}")).phase || ""; }
    catch (e) { return ""; }
  }
  function appliqueCycleStockage(attrs) {
    if (!attrs || !attrs.jjk_storage) return false;
    var phase = phaseStockage(attrs);
    if (phase !== "ready") {
      compactStorageReady = false;
      post({ type: "storage-activate", storage: "fiche", viewId: VIEW_ID });
      return false;
    }
    compactStorageReady = true;
    if (Date.now() - compactCleanupAt > 15000) {
      compactCleanupAt = Date.now();
      post({ type: "storage-cleanup", storage: "fiche", viewId: VIEW_ID });
    }
    return true;
  }
  function appliqueLectureCompact(attrs) {
    if (!compactActif || !compactSession || !ready || gele || versionBloquee || !attrs) return;
    try {
      var distant = window.JjkSync.Compact.read(attrs);
      if (distant && !distant.incomplete && verrouilleVersionFuture(distant.state)) return;
      var resultat = compactSession.receive(attrs);
      if (!resultat) return;
      actualiseStatutEnregistrement();
      if (resultat.incomplete) throw new Error("La lecture actualisée contient des blocs ou des journaux incomplets.");
      appliqueCycleStockage(attrs);
      lastAttrs = attrs;
      if (resultat.conflict) bandeau("La synchronisation a détecté une modification concurrente sur les mêmes données. Vérifiez le personnage et ses sauvegardes avant de poursuivre.");
      if (resultat.lost) bandeauPerte();
      var prochain = JSON.stringify(resultat.state), avant = mem["jjk-perso"] || "";
      if (prochain !== avant) {
        mem["jjk-perso"] = prochain;
        try { window.dispatchEvent(new CustomEvent("jjk-compact-sync", { detail: resultat.state })); } catch (e) {}
      }
      if (!Object.keys(compactSession.pending).length && !Object.keys(compactSession.payloads || {}).length) {
        saveFailure = "";
        sauvegardeLocale(attrs, "autosave", resultat.state);
      }
    } catch (e) {
      erreurCompact("La relecture des modifications distantes a échoué : " + String(e && e.message || e));
    }
  }

  function pollCompact() {
    if (!compactActif || !compactSession || compactPollEnCours || !ready || versionBloquee || (gele && !compactRecovering)) return;
    compactPollEnCours = true;
    sonde(function (attrs) {
      compactPollEnCours = false;
      if (!attrs) {
        if (!compactSession.hasBase) scheduleSave();
        planifieCompactPoll(compactRecovering ? 2600 : 2200);
        return;
      }
      try {
        var distant = window.JjkSync.Compact.read(attrs);
        if (distant && !distant.incomplete && verrouilleVersionFuture(distant.state)) return;
        var resultat = compactSession.receive(attrs);
        if (!resultat) {
          if (!compactSession.hasBase) scheduleSave();
          planifieCompactPoll(1800);
          return;
        }
        actualiseStatutEnregistrement();
        if (resultat.incomplete) throw new Error("Des blocs référencés par le journal ne sont pas encore arrivés.");
        var stockagePret = appliqueCycleStockage(attrs);
        // La fiche ne se déverrouille qu'après une lecture Compact COMPLETE,
        // reconstruite par le même lecteur que celui qui applique les journaux.
        lastAttrs = attrs;
        if (compactRecovering) {
          compactRecovering = false;
          compactErrorMessage = "";
          gele = false;
          fermerBandeau();
          scheduleSave();
        }
        if (resultat.conflict) bandeau("La synchronisation a détecté une modification concurrente sur les mêmes données. Vérifiez le personnage et ses sauvegardes avant de poursuivre.");
        if (resultat.lost) bandeauPerte();
        var prochain = JSON.stringify(resultat.state), avant = mem["jjk-perso"] || "";
        if (prochain !== avant) {
          mem["jjk-perso"] = prochain;
          try { window.dispatchEvent(new CustomEvent("jjk-compact-sync", { detail: resultat.state })); } catch (e) {}
        }
        if (!Object.keys(compactSession.pending).length && !Object.keys(compactSession.payloads || {}).length) {
          saveFailure = "";
          sauvegardeLocale(attrs, "autosave", resultat.state);
        }
        else if (stockagePret) {
          var operations = compactSession.outgoing(), ids = Object.keys(operations);
          if (ids.length || Object.keys(compactSession.payloads || {}).length)
            post({ type: "storage-ops", session: VIEW_ID, epoch: compactSession.epoch, viewId: VIEW_ID,
              ops: ids.map(function (id) { return operations[id]; }), payloads: compactSession.payloads });
        }
      } catch (eCompact) {
        erreurCompact("Le journal Compact est incomplet ou illisible : " + String(eCompact && eCompact.message || eCompact));
      }
      planifieCompactPoll(compactRecovering ? 2600 : 1600);
    });
  }
  function demarreStockageCompact(spec) {
    if (!spec || spec.compactStorage !== true || !window.JjkSync || !window.JjkSync.Compact || !M) return false;
    var state;
    try { state = JSON.parse(mem["jjk-perso"] || "null"); } catch (e) {}
    if (!state || typeof state !== "object") return false;
    try {
      compactSession = new window.JjkSync.Compact.Session(lastAttrs || {}, state, Date.now,
        { id: VIEW_ID, actor: { id: VIEW_ID } });
      compactMigrationSentAt = 0;
      compactStorageReady = false; compactCleanupAt = 0;
      compactActif = true;
      planifieCompactPoll(1200);
      if (!compactSession.hasBase) scheduleSave();
      return true;
    } catch (e) {
      compactActif = false; compactSession = null; gele = true;
      compactErrorMessage = String(e && e.message || e);
      return false;
    }
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
    // Le pont doit d'abord rafraîchir la collection Roll20 depuis le serveur.
    // Ce fetch peut prendre jusqu'à 36 s ; une sonde courte ferait déclarer
    // perdu tout accusé de réception avant même que le pont ait répondu.
    s.t = setTimeout(function () {
      var i = sondes.indexOf(s);
      if (i >= 0) sondes.splice(i, 1);
      cb(null);
    }, 40000);
    sondes.push(s);
    post({ type: "load", resync: true, allege: true, viewId: VIEW_ID });
  }
  function completeOmis(attrs, noms) {
    var out = fusion({}, attrs || {});
    (noms || []).forEach(function (nom) {
      if (!Object.prototype.hasOwnProperty.call(out, nom) && lastAttrs && lastAttrs[nom]) out[nom] = lastAttrs[nom];
    });
    return out;
  }
  function sondeReponse(attrs) {
    var q = sondes.slice();
    sondes.length = 0;
    q.forEach(function (s) { clearTimeout(s.t); s.cb(attrs || null); });
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
    var fin = Date.now() + (delaiMax || 40000);
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
        if (ok) {
          lastAttrs = fusion(lastAttrs, lot); enVol = null; echecs = 0; saveFailure = "";
          if (compactActif && compactSession && !compactSession.hasBase) {
            try { compactSession.receive(lastAttrs); planifieCompactPoll(700); scheduleSave(); }
            catch (eCompact) { gele = true; bandeau("La photographie Compact a été écrite mais n'a pas pu être reconstruite : " + String(eCompact && eCompact.message || eCompact)); return; }
          }
          actualiseStatutEnregistrement();
          sauvegardeLocale(lastAttrs, "autosave"); return;
        }
        // Échec : le lot QUITTE la base du diff. Il redevient donc une
        // différence, et le prochain doSave le repostera de lui-même.
        enVol = null;
        echecs++;
        actualiseStatutEnregistrement();
        if (echecs < 2) { scheduleSave(); return; }   // une relance discrète suffit souvent
        // Deux fois de suite : ce n'est plus un contretemps. On prévient, et
        // on cesse de relancer tout seul — le lot part quand même à la
        // prochaine modification, le diff ne l'a pas oublié.
        bandeauPerte();
      }, 40000);
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
        var a = recu ? (recu.jjk_storage || recu[M.PREFIX + "state"]) : null;
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
    "gap:.5rem;padding:.5rem .7rem;background:#171D1E;color:#78BBC0;border-bottom:1px solid #285A60;" +
    "font-family:'Proxima Nova',proxima-nova,'Nunito Sans','Helvetica Neue',Helvetica,Arial,sans-serif;" +
    "font-size:.72rem;line-height:1.45}" +
    "#jjk-bandeau .jjk-bandeau-txt{flex:1 1 14rem;min-width:0}" +
    "#jjk-bandeau .jjk-bandeau-btn{flex:0 0 auto;padding:.2rem .6rem;border:1px solid #285A60;" +
    "border-radius:.2rem;background:#080B0C;color:#78BBC0;font:inherit;cursor:pointer}" +
    "#jjk-bandeau .jjk-bandeau-btn:hover{background:#1D292B;border-color:#4A9FA8}" +
    "html.night #jjk-bandeau{background:#171D1E;color:#78BBC0;border-bottom-color:#285A60}" +
    "html.night #jjk-bandeau .jjk-bandeau-btn{background:#080B0C;color:#78BBC0;border-color:#285A60}" +
    "#jjk-ecran{position:fixed;top:0;left:0;right:0;bottom:0;z-index:80;overflow:auto;" +
    "padding:1rem;background:#080B0C;color:#E4ECEC;" +
    "font-family:'Proxima Nova',proxima-nova,'Nunito Sans','Helvetica Neue',Helvetica,Arial,sans-serif;" +
    "font-size:.8rem;line-height:1.5}" +
    "#jjk-ecran .jjk-ecran-boite{box-sizing:border-box;max-width:34rem;margin:0 auto;background:#0F1415;" +
    "border:1px solid #285A60;border-radius:.3rem;padding:.9rem 1rem}" +
    "#jjk-ecran.jjk-ecran-rouge .jjk-ecran-boite{border-color:#A5342C;background:#171D1E}" +
    "#jjk-ecran h1{margin:0 0 .5rem;color:#78BBC0;font-family:'Proxima Nova Condensed','Proxima Nova',proxima-nova," +
    "'Nunito Sans',Helvetica,Arial,sans-serif;font-size:1.15rem;line-height:1.25}" +
    "#jjk-ecran h2{margin:.85rem 0 .25rem;color:#78BBC0;font-size:.88rem}" +
    "#jjk-ecran p{margin:.35rem 0}" +
    "#jjk-ecran ul{margin:.3rem 0;padding-left:1.1rem}" +
    "#jjk-ecran li{margin:.25rem 0}" +
    "#jjk-ecran .jjk-ecran-vers{display:flex;flex-wrap:wrap;gap:.2rem 1.4rem;margin:.5rem 0;" +
    "padding:.35rem .6rem;background:#171D1E;border-radius:.2rem}" +
    "#jjk-ecran .jjk-ecran-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin:.85rem 0 .4rem}" +
    "#jjk-ecran button{padding:.35rem .7rem;border:1px solid #285A60;border-radius:.2rem;" +
    "background:#0F1415;color:#E4ECEC;font:inherit;cursor:pointer}" +
    "#jjk-ecran button:hover:not([disabled]){background:#171D1E;border-color:#4A9FA8}" +
    "#jjk-ecran button.jjk-ecran-primaire{background:#4A9FA8;color:#071113;border-color:#4A9FA8}" +
    "#jjk-ecran button[disabled]{opacity:.45;cursor:not-allowed}" +
    "#jjk-ecran .jjk-ecran-note{font-size:.72rem;color:#A3B2B3;opacity:.85}" +
    "#jjk-ecran .jjk-ecran-telecharger{display:inline-block;padding:.35rem .7rem;border:1px solid #285A60;" +
    "border-radius:.2rem;color:#78BBC0;text-decoration:none}" +
    "#jjk-ecran textarea{box-sizing:border-box;width:100%;min-height:8rem;margin-top:.3rem;" +
    "background:#080B0C;color:#E4ECEC;border:1px solid #285A60;border-radius:.2rem;" +
    "font-family:'Roboto Mono',monospace;font-size:.66rem}";
  function poserStyles() {
    if (document.getElementById("jjk-bandeau-css")) return;
    var s = document.createElement("style");
    s.id = "jjk-bandeau-css";
    s.textContent = CSS_BANDEAU + "#jjk-save-status{padding:.2rem .6rem;font-size:12px}";
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
      b.setAttribute("role", "alert");
      b.setAttribute("aria-live", "assertive");
      b.setAttribute("aria-atomic", "true");
      document.body.insertBefore(b, document.body.firstChild);
    }
    b.innerHTML = "";
    if (b.dataset) delete b.dataset.jjkRaison;
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
  function statutEnregistrement(texte) {
    var n = document.getElementById("jjk-save-status");
    if (!n) return;
    n.textContent = texte || "";
    n.hidden = !texte;
    if (saveStatusTimer) clearTimeout(saveStatusTimer);
    if (texte === "Enregistré") saveStatusTimer = setTimeout(function () {
      var status = document.getElementById("jjk-save-status");
      if (status && status.textContent === "Enregistré") status.hidden = true;
    }, 2500);
  }
  function afficheErreurEnregistrement(failed) {
    if (!ready) return;
    var titre = failed ? "Impossible d’enregistrer le personnage" : "Enregistrement en attente";
    var texte = failed
      ? "Une erreur empêche l’enregistrement des dernières modifications. Réessayez dans quelques instants."
      : "Roll20 n’a pas confirmé les dernières modifications. Elles restent dans cette fenêtre et seront perdues si vous la fermez ou la rechargez. Réessayez dans quelques instants.";
    var b = bandeau(titre + " — " + texte, [
      { texte: "Réessayer", acte: "reessayer-enregistrement", action: function () {
          fermerBandeau(); saveFailure = ""; echecs = 0; premierPendingAt = Date.now();
          enVol = null; lastAttrs = {}; gardeArmee = false;
          post({ type: "load", resync: true, viewId: VIEW_ID });
          if (compactActif) planifieCompactPoll(0); else scheduleSave();
        } },
      { texte: "Exporter le personnage (JSON)", acte: "export", action: exporter }
    ]);
    if (b.dataset) b.dataset.jjkRaison = "recording";
  }
  function compteEnAttente() {
    var n = enVol ? Object.keys(enVol).length : 0;
    if (compactActif && compactSession) {
      n += Object.keys(compactSession.pending || {}).length;
      n += Object.keys(compactSession.payloads || {}).length;
    }
    return n;
  }
  function actualiseStatutEnregistrement() {
    if (!ready) return;
    var count = compteEnAttente();
    if (count) {
      if (!premierPendingAt) premierPendingAt = Date.now();
      statutEnregistrement("Enregistrement en cours…");
      if (Date.now() - premierPendingAt >= 12000 && !saveFailure) afficheErreurEnregistrement(false);
      return;
    }
    if (!saveFailure && premierPendingAt) {
      premierPendingAt = 0;
      var banner = document.getElementById("jjk-bandeau");
      if (banner && banner.dataset.jjkRaison === "recording") fermerBandeau();
      statutEnregistrement("Enregistré");
    }
  }
  function bandeauPerte() {
    saveFailure = "confirmation";
    afficheErreurEnregistrement(true);
  }

  // Fiche à moitié lue, dans les deux cas où cela arrive (voir hydrate).
  // attrsToState a rendu la meilleure reconstruction possible, qui a le droit
  // de s'AFFICHER mais jamais de se réécrire : elle ne porte pas ce que le
  // repli ne sait pas porter, et la première sauvegarde remplacerait la fiche
  // du personnage par cette version amputée. D'où le gel. Pas de bouton
  // « Masquer » ici : un bandeau caché laisserait croire que la fiche
  // s'enregistre. Le seul geste offert est explicite et dit ce qu'il coûte, et
  // c'est le même quelle que soit la façon dont la lecture a échoué.
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

  // Les anciennes versions stockaient un choix local permettant de contourner
  // l'écran de version. Ce choix n'existe plus : on purge les clés historiques
  // dès l'ouverture, pour tous les personnages de cette origine.
  function purgeAncienEpinglage() {
    try {
      var prefixe = "jjk-r20-version:";
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (k && k.indexOf(prefixe) === 0) localStorage.removeItem(k);
      }
    } catch (e) {}
  }
  purgeAncienEpinglage();

  // Ce que la montée met à l'abri, dans le personnage lui-même.
  var BACKUP = "backup";

  var attrsVus = null;          // les attributs reçus, gardés pour la décision
  var attrsPrets = false;
  var manifPret = false;
  var decide = false;           // decider() n'agit qu'une fois
  var boiteCourante = null;     // la boîte de l'écran affiché (pour y ajouter le JSON)

  function manifeste() { return window.__jjkManifeste || null; }
  function manifesteValide(m) {
    if (!m || typeof m !== "object" || !m.release || !lire(m.release) ||
        !Number.isInteger(m.schema) || m.schema < 1 ||
        (m.blocage !== "release" && m.blocage !== "schema") ||
        !Array.isArray(m.amorce) || !m.amorce.length) return false;
    var b = m.bundle, x = m.extension;
    if (!b || !Array.isArray(b.js) || !b.js.length || !Array.isArray(b.css) || !b.css.length || b.compactStorage !== true) return false;
    if (!x || !x.minVersion || !lire(x.minVersion) || x.bridgeProtocol !== 2 ||
        !Array.isArray(x.requiredCapabilities) || !x.requiredCapabilities.length ||
        !x.requiredCapabilities.every(function (nom) { return typeof nom === "string" && /^[A-Za-z][A-Za-z0-9]*$/.test(nom); })) return false;
    return m.amorce.every(urlSure) && b.js.every(urlSure) && b.css.every(urlSure) &&
      (!b.data || urlSure(b.data));
  }
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
    // changement de forme de l'état : le jour où X monte seul (4.0.0 en schéma
    // 3), le déduire du majeur ferait passer tout le parc pour périmé et
    // proposerait une montée que le moteur refuse, à chaque ouverture.
    var s = M && M.SCHEMA;
    return (typeof s === "number" && isFinite(s)) ? s : 1;
  }
  // Le manifeste choisit explicitement la politique. « release » impose un
  // choix dès qu'un numéro de release diffère ; « schema » autorise les
  // correctifs compatibles tant que la structure des données est identique.
  // Une release illisible n'est jamais considérée compatible par défaut.
  function accordVersionFiche(f, relSite, schSite, politique) {
    if (!f || !Number.isInteger(f.schema) || f.schema !== schSite) return false;
    politique = politique === "release" ? "release" : "schema";
    if (politique === "schema") return !f.release || !!lire(f.release);
    return !!(f.release && lire(f.release) && memeRang(f.release, relSite));
  }

  // LA lecture d'un numéro, seule de tout le fichier, et celle du contrat :
  // « v » facultatif, un à trois nombres (les manquants valent 0), « b » de
  // la beta COLLÉ au dernier, suffixe de fabrication [-+…] toléré. Rend
  // { rang: [x, y, z], beta } ou null. Trois lectures cohabitaient ici et
  // n'acceptaient pas les mêmes textes : le même numéro pouvait désigner une
  // ligne d'archive et rester illisible pour la comparaison, qui retombait
  // alors sur l'égalité de chaînes et déclarait deux versions différentes. Le
  // suffixe ne change PAS le rang, la beta étant ce que le stable recevra à la
  // fusion : une fiche écrite sur la beta ne paraît jamais plus récente que le
  // site stable du même numéro.
  function lire(rel) {
    var m = /^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(b?)(?:[-+][0-9A-Za-z.-]*)?\s*$/
      .exec(String(rel == null ? "" : rel));
    return m ? { rang: [parseInt(m[1], 10), parseInt(m[2] || "0", 10), parseInt(m[3] || "0", 10)],
                 beta: m[4] === "b" } : null;
  }
  // Même rang, ou même LIGNE X.Y quand `ligne` est vrai. Illisible d'un côté :
  // on retombe sur l'égalité de chaîne, ce que faisait le code avant la ligne —
  // une version qu'on ne sait pas lire ne doit rien casser, la fiche s'ouvre.
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
    if (!manifesteValide(m)) return null;
    var b = m.bundle;
    return {
      js: b.js.slice(), css: b.css.slice(), data: b.data || null,
      release: m.release, compactStorage: b.compactStorage === true
    };
  }

  // Archive d'une version passée, déclarée par le manifeste sous son numéro :
  //   "archives": { "2.9.0": { "js": [...], "css": [...], "data": "...",
  //                            "attrmap": "..." } }
  // Un simple tableau de scripts est accepté. Rend null si rien n'est publié
  // pour la LIGNE demandée, ou si une seule URL sort du site.
  //
  // Recherche par LIGNE X.Y, jamais par clé exacte : une ligne ne gèle qu'UNE
  // archive, à sa première release (« 3.6.0 » ouvre la ligne 3.6), et les
  // correctifs qui suivent n'ont donc pas de dossier à eux. Chercher
  // m.archives["3.6.4"] ne trouvait rien et grisait « ouvrir avec sa version »
  // pour toute une ligne. Le personnage descend alors à la release de l'archive
  // (3.6.4 ouvert par 3.6.0) : c'est le prix assumé du gel par ligne, et il ne
  // boucle pas, la ligne de 3.6.0 restant 3.6.
  function archiveDe(rel) {
    var r = lire(rel);
    var m = manifeste();
    var tout = (m && m.archives && typeof m.archives === "object") ? m.archives : null;
    if (!r || !tout) return null;
    var cles = Object.keys(tout).sort(), cle = null, cr = null;
    for (var i = 0; i < cles.length; i++) {
      var c = lire(cles[i]);
      if (!c || c.rang[0] !== r.rang[0] || c.rang[1] !== r.rang[1]) continue;
      // La plus récente de la ligne (3.1 en porte trois : 3.1.0, 3.1.1, 3.1.2).
      // X et Y sont déjà égaux par le filtre : comparer Z compare donc le rang
      // entier. En NOMBRE, car un tri de chaînes rangerait « 3.1.10 » avant
      // « 3.1.9 ». MÊME DÉPARTAGE que archive_de_ligne() de
      // scripts/version_fiche.py, à la lettre, sans quoi l'outil qui gèle les
      // archives et l'amorceur qui les sert désigneraient deux dossiers
      // différents pour la même fiche : clés parcourues TRIÉES et comparaison
      // STRICTE, donc à rang égal (« 3.1.2 » et « 3.1.2b ») c'est la plus
      // PETITE qui tranche, et rien ne dépend de l'ordre des clés du JSON, qui
      // n'est pas une garantie.
      if (!cr || c.rang[2] > cr.rang[2]) { cr = c; cle = cles[i]; }
    }
    if (!cle) return null;
    var a = tout[cle];
    if (!a) return null;
    // release portée par la spec : chargerBundle en fait la release EFFECTIVE,
    // celle que la carte d'attributs écrira dans jjk_version.max. C'est la CLÉ
    // retenue, jamais la version demandée : inscrire « 3.6.4 » alors que c'est
    // le code de 3.6.0 qui tourne ferait mentir la seule ligne qui dit ce qui
    // tourne vraiment.
    var spec = Array.isArray(a) ? { js: a, css: [], data: null, attrmap: null, release: cle, schema: null }
             : { js: a.js, css: Array.isArray(a.css) ? a.css : [], data: a.data == null ? null : a.data,
                 attrmap: a.attrmap == null ? null : a.attrmap, release: cle, schema: a.schema == null ? null : a.schema };
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

  function ecranErreurOuverture(titre, message, options) {
    options = options || {};
    ready = false;
    var b = ecran("Impossible d’ouvrir le personnage", true);
    b.appendChild(noeud("p", null, message || "Une erreur empêche l’ouverture du personnage. Réessayez dans quelques instants."));
    var z = zoneActions(b);
    var retry = options.reessayer || function () { try { location.reload(); } catch (e) {} };
    bouton(z, "Réessayer", "reessayer-ouverture", retry, true);
    var available = !!(attrsVus && Object.keys(attrsVus).length) ||
      !!(mem["jjk-perso"] && mem["jjk-perso"] !== "{}" && mem["jjk-perso"] !== "null");
    var exp = bouton(z, "Exporter le personnage (JSON)", "export", options.exporterAttrs ? exporterAttrsVus : exporter);
    if (options.noExport || !available) griser(exp, "Aucune donnée du personnage disponible à exporter.", b);
    return b;
  }
  function exporterAttrsVus() {
    var brut = "{}";
    try {
      var etat = attrsVus && M && typeof M.attrsToState === "function" ? M.attrsToState(attrsVus) : null;
      brut = JSON.stringify(etat || attrsVus || {}, null, 2);
    } catch (e) {
      try { brut = JSON.stringify(attrsVus || {}, null, 2); } catch (e2) {}
    }
    montrerJson(brut, "Personnage et attributs disponibles, tels qu'ils ont été reçus de Roll20. Vérifiez-les avant toute restauration.");
  }
  function relireOuverture() {
    if (relectureOuverture) return;
    relectureOuverture = true;
    ecranAttente("Relecture du personnage Roll20", "La fiche reste verrouillée. Attente d'une lecture complète et vérifiable avant toute ouverture.");
    post({ type: "load", resync: true, allege: true, viewId: VIEW_ID });
    setTimeout(function () {
      if (!relectureOuverture) return;
      relectureOuverture = false;
      ecranErreurOuverture("Roll20 n'a pas répondu à la relecture",
        "Aucune donnée n'a été modifiée. Vérifiez que le personnage est accessible et que la fenêtre principale de Roll20 est ouverte.",
        { reessayer: relireOuverture, exporterAttrs: true });
    }, 40000);
  }
  function ecranDonneesIncompletes(state) {
    var raison = state && state.raison ? String(state.raison) : "la reconstruction est incomplète";
    ecranErreurOuverture("Impossible d’ouvrir le personnage",
      "Roll20 n’a pas transmis toutes les données nécessaires pour ouvrir ce personnage. " +
      "La lecture a détecté des données manquantes ou illisibles (" + raison + "). " +
      "La fiche n’a PAS été montée : aucune écriture ne partira et les données restantes ne seront pas écrasées. " +
      "Vérifiez les attributs du personnage ou restaurez une sauvegarde locale depuis l’extension.",
      { reessayer: relireOuverture, exporterAttrs: true });
  }
  function versionCompare(a, b) {
    var x = lire(a), y = lire(b);
    if (!x || !y) return null;
    for (var i = 0; i < 3; i++) if (x.rang[i] !== y.rang[i]) return x.rang[i] > y.rang[i] ? 1 : -1;
    return 0;
  }
  function compareExtension(a, b) {
    function parts(v) {
      var m = /^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?b?$/.exec(String(v || ""));
      return m ? [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4] || 0)] : null;
    }
    var x = parts(a), y = parts(b);
    if (!x || !y) return null;
    for (var i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
    return 0;
  }
  function capacitesManquantes(d, contrat) {
    var m = manifeste();
    contrat = contrat || (m && m.extension);
    var ext = d && d.extension ? d.extension : d;
    if (!contrat || !ext || !Array.isArray(contrat.requiredCapabilities)) return [];
    var caps = ext.capabilities || {};
    return contrat.requiredCapabilities.filter(function (nom) { return caps[nom] !== 1; });
  }
  function pontCompatible(d) {
    var m = manifeste(), contrat = m && m.extension;
    var ext = d && d.extension;
    if (!contrat || !ext || ext.protocol !== contrat.bridgeProtocol) return false;
    var comparaison = compareExtension(ext.version, contrat.minVersion);
    if (comparaison === null || comparaison < 0) return false;
    return Array.isArray(contrat.requiredCapabilities) && contrat.requiredCapabilities.length > 0 &&
      capacitesManquantes(d).length === 0;
  }
  function ecranPontIncompatible(d, latest) {
    pontRefuse = true;
    pontChecking = false;
    hydrateEnAttente = null;
    if (askTimer) { clearTimeout(askTimer); askTimer = null; }
    attrsVus = d && d.attrs && typeof d.attrs === "object" ? d.attrs : null;
    var ext = d && d.extension || {};
    var m = manifeste() || {}, contrat = m.extension || {};
    var installed = ext.version || "inconnue";
    var current = latest || contrat.minVersion || "inconnue";
    var b = ecran("Extension Jujutsu Kaisen à mettre à jour", false);
    b.appendChild(noeud("p", null,
      "Votre extension Jujutsu Kaisen n’est pas à jour. Installez la dernière version, puis rechargez la page Roll20 pour ouvrir ce personnage."));
    var v = noeud("div", "jjk-ecran-vers");
    v.appendChild(noeud("span", null, "Votre version de l’extension : " + installed));
    v.appendChild(noeud("span", null, "Dernière version de l’extension : " + current));
    b.appendChild(v);
    var z = zoneActions(b);
    var exp = bouton(z, "Exporter le personnage (JSON)", "export", exporterAttrsVus);
    if (!attrsVus || !Object.keys(attrsVus).length) griser(exp, "Aucune donnée du personnage disponible à exporter.", b);
    var a = noeud("a", "jjk-ecran-telecharger", "Télécharger la mise à jour");
    a.href = new URL("extension/", location.href).href;
    a.target = "_blank";
    a.rel = "noopener";
    z.appendChild(a);
  }

  function verifierPont(d) {
    if (pontVerifie || pontRefuse) return;
    hydrateEnAttente = d;
    attrsVus = d && d.attrs && typeof d.attrs === "object" ? d.attrs : null;
    if (pontChecking) return;
    pontChecking = true;
    var installed = d && d.extension && d.extension.version || "";
    fetch("download/ext-signed.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("extension"); return r.json(); })
      .then(function (meta) {
        var mode = /b$/.test(releaseSite()) ? "beta" : "stable";
        var latest = meta && meta.parties && meta.parties[mode] && meta.parties[mode].version || meta && meta.version;
        var comparaison = compareExtension(installed, latest);
        var pending = hydrateEnAttente;
        if (!latest || comparaison === null) {
          pontChecking = false;
          ecranErreurOuverture("Impossible d’ouvrir le personnage",
            "Les informations nécessaires pour vérifier la version de l’extension n’ont pas pu être récupérées. Réessayez dans quelques instants.",
            { noExport: !attrsVus, exporterAttrs: true });
          return;
        }
        if (comparaison < 0 || !pontCompatible(pending)) {
          ecranPontIncompatible(pending, latest);
          return;
        }
        pontChecking = false;
        pontVerifie = true;
        hydrateEnAttente = null;
        if (pending && pending.attrs) hydrate(completeOmis(pending.attrs || {}, pending.omis));
      })
      .catch(function () {
        pontChecking = false;
        ecranErreurOuverture("Impossible d’ouvrir le personnage",
          "Les informations nécessaires pour vérifier la version de l’extension n’ont pas pu être récupérées. Réessayez dans quelques instants.",
          { noExport: !attrsVus, exporterAttrs: true });
      });
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

  // ---------- mode Consultation / Édition partagé ----------
  function appliqueMode(mode) {
    var state = mode && typeof mode === "object" ? mode : { mode: mode };
    var at = Number(state.modeAt) || 0, by = String(state.modeBy || "");
    if (sharedModeState && (at < sharedModeState.modeAt ||
        at === sharedModeState.modeAt && by < sharedModeState.modeBy)) return;
    sharedModeState = { mode: state.mode === "edition" ? "edition" : "consultation", modeAt: at, modeBy: by };
    var next = sharedModeState.mode === "edition";
    var changed = modePartage !== sharedModeState.mode;
    modePartage = sharedModeState.mode;
    window.__jjkGlobalMode = modePartage;
    if (!ready || !bundleCharge || !document.getElementById("jjk-mode-bar")) return;
    var bar = document.getElementById("jjk-mode-bar");
    var label = bar.querySelector(".jjk-mode-label"), button = document.getElementById("jjk-mode-toggle");
    if (label) label.textContent = next ? "Mode Edition" : "Mode Consultation";
    if (button) {
      button.textContent = next ? "Passer en Mode Consultation" : "Passer en Mode Edition";
      button.setAttribute("aria-pressed", next ? "true" : "false");
    }
    document.documentElement.classList.toggle("jjk-consultation", !next);
    if (changed && window.Jjk && typeof window.Jjk.remonte === "function") window.Jjk.remonte();
    if (typeof window.__jjkApplyMode === "function") window.__jjkApplyMode();
    renderPresence();
  }
  function poserModeBar() {
    var bar = document.getElementById("jjk-mode-bar");
    if (bar) { appliqueMode(sharedModeState); renderPresence(); return true; }
    var app = document.querySelector(".perso-atelier");
    if (!app || !app.parentNode) return false;
    bar = noeud("div", "jjk-mode-bar");
    bar.id = "jjk-mode-bar";
    var label = noeud("strong", "jjk-mode-label", "Mode Consultation");
    var button = noeud("button", "pc-btn", "Passer en Mode Edition");
    button.type = "button";
    button.id = "jjk-mode-toggle";
    button.setAttribute("aria-pressed", "false");
    button.onclick = function () {
      if (gele || versionBloquee || !ready || document.getElementById("jjk-ecran")) return;
      post({ type: "presence", action: "mode", mode: modePartage === "edition" ? "consultation" : "edition",
        requestedAt: Date.now(), viewId: VIEW_ID });
    };
    var controls = noeud("div", "jjk-mode-controls");
    var presence = noeud("div", "jjk-mode-presence");
    var status = document.getElementById("jjk-save-status");
    if (!status) {
      status = noeud("span");
      status.id = "jjk-save-status";
      status.setAttribute("role", "status");
      status.hidden = true;
    }
    controls.appendChild(label);
    controls.appendChild(button);
    if (status) controls.appendChild(status);
    presence.appendChild(noeud("div", "jjk-presence-edition"));
    presence.appendChild(noeud("div", "jjk-presence-consultation"));
    bar.appendChild(controls);
    bar.appendChild(presence);
    app.parentNode.insertBefore(bar, app);
    document.documentElement.classList.add("jjk-consultation");
    appliqueMode(sharedModeState);
    actualiseStatutEnregistrement();
    envoyerPresence("join");
    if (!presenceTimer) presenceTimer = setInterval(function () { envoyerPresence("heartbeat"); }, 10000);
    return true;
  }
  var ficheMountedListener = null, ficheMountedObserver = null;
  function finirAttenteMontageFiche() {
    if (ficheMountedListener) {
      window.removeEventListener("jjk-fiche-mounted", ficheMountedListener);
      ficheMountedListener = null;
    }
    if (ficheMountedObserver) {
      ficheMountedObserver.disconnect();
      ficheMountedObserver = null;
    }
  }
  function essayerModeBarAuMontage() {
    if (!poserModeBar()) return false;
    finirAttenteMontageFiche();
    return true;
  }
  function attendreMontageFiche() {
    if (essayerModeBarAuMontage()) return true;
    if (!ficheMountedListener) {
      ficheMountedListener = function () { essayerModeBarAuMontage(); };
      window.addEventListener("jjk-fiche-mounted", ficheMountedListener);
    }
    // Repli pour les anciennes archives qui ne diffusent pas encore
    // jjk-fiche-mounted : l'insertion réelle du DOM reste le signal fiable.
    if (!ficheMountedObserver && window.MutationObserver && document.body) {
      ficheMountedObserver = new MutationObserver(function () { essayerModeBarAuMontage(); });
      ficheMountedObserver.observe(document.body, { childList: true, subtree: true });
    }
    return false;
  }
  function renderPresence() {
    var bar = document.getElementById("jjk-mode-bar");
    if (!bar) return;
    var byPlayer = {};
    (presenceRows || []).forEach(function (r) {
      if (!r || r.left || Date.now() - Number(r.at || 0) >= 30000) return;
      var id = String(r.player || ""), name = r.name || id;
      if (!id) return;
      if (!byPlayer[id]) byPlayer[id] = { name: name, edition: false };
      if (r.mode === "edition") byPlayer[id].edition = true;
    });
    if (presencePlayer && presencePlayer.id) {
      var me = byPlayer[presencePlayer.id] ||
        (byPlayer[presencePlayer.id] = { name: presencePlayer.name || presencePlayer.id, edition: false });
      if (modePartage === "edition") me.edition = true;
    }
    var edit = [], read = [];
    Object.keys(byPlayer).sort().forEach(function (id) {
      (byPlayer[id].edition ? edit : read).push(byPlayer[id].name);
    });
    var e = bar.querySelector(".jjk-presence-edition"), c = bar.querySelector(".jjk-presence-consultation");
    var et = "En édition : " + (edit.join(", ") || "—");
    var ct = "En consultation : " + (read.join(", ") || "—");
    if (e && e.textContent !== et) e.textContent = et;
    if (c && c.textContent !== ct) c.textContent = ct;
  }
  var presenceRows = [], presencePlayer = null, sharedModeState = { mode: "consultation", modeAt: 0, modeBy: "" };
  function envoyerPresence(action) {
    if (ready && bundleCharge && !presenceDead) post({ type: "presence", action: action || "heartbeat", viewId: VIEW_ID });
  }

  window.addEventListener("pagehide", function () {
    presenceDead = true;
    try { post({ type: "storage-release", storage: "fiche", viewId: VIEW_ID }); } catch (e) {}
    try { post({ type: "presence", action: "leave", viewId: VIEW_ID }); } catch (e) {}
    if (presenceTimer) clearInterval(presenceTimer);
  });

  // ---------- chargement du bundle ----------
  // Le bundle n'est déclaré monté qu'après chargement et contrôle de TOUS les
  // fichiers essentiels. Une erreur arrête la chaîne : aucun faux « mounted ».
  var bundleCharge = false, bundleEnCours = false;
  function chargerBundle(spec, remplacerCss) {
    if (bundleCharge || bundleEnCours || !spec || !Array.isArray(spec.js) || !spec.js.length) return;
    bundleEnCours = true;
    ready = false;
    // Le bundle monte la fiche après une lecture asynchrone de ses données.
    // Écouter l'événement AVANT d'injecter le script évite de rater le montage.
    attendreMontageFiche();
    fermerEcran();
    window.__jjkDataUrl = spec.data || null;
    if (M && M.setRelease) M.setRelease(spec.release || null);

    function echec(fichier, detail) {
      bundleEnCours = false;
      bundleCharge = false;
      ready = false;
      post({ type: "error", error: fichier || "bundle", detail: String(detail || "") });
      ecranErreurOuverture("La fiche JJK n'a pas pu être montée",
        "Le composant obligatoire « " + String(fichier || "inconnu") + " » n'a pas pu être chargé ou validé. " +
        "La chaîne a été arrêtée : aucune fiche partielle n'est utilisable et aucune sauvegarde ne sera lancée. " +
        "Vérifiez le déploiement puis rechargez la page.");
    }
    function poserCssArchives(urls, cb) {
      var anciens = document.querySelectorAll("link[data-jjk]"), nouveaux = [], i = 0;
      if (!urls || !urls.length) { cb(); return; }
      function suivant() {
        if (i >= urls.length) {
          for (var k = 0; k < anciens.length; k++) if (anciens[k].parentNode) anciens[k].parentNode.removeChild(anciens[k]);
          for (var n = 0; n < nouveaux.length; n++) nouveaux[n].setAttribute("data-jjk", "1");
          cb(); return;
        }
        var u = urls[i++], l = document.createElement("link");
        l.rel = "stylesheet"; l.href = u; l.setAttribute("data-jjk-temp", "1");
        l.onload = suivant;
        l.onerror = function () { if (l.parentNode) l.parentNode.removeChild(l); echec(u, "feuille de style introuvable"); };
        nouveaux.push(l); document.head.appendChild(l);
      }
      suivant();
    }
    function chargerScripts() {
      var urls = spec.js, i = 0;
      if (!Array.isArray(urls) || !urls.length) { echec("bundle.js", "liste de scripts vide"); return; }
      function suivant() {
        if (i >= urls.length) {
          if (spec.compactStorage === true && (!window.JjkSync || !window.JjkSync.Compact || !window.JjkSync.Compact.Session)) {
            echec("jjk-sync.js", "API Compact absente après téléchargement"); return;
          }
          if (urls.some(function (u) { return /jjk-migrations/.test(u); }) &&
              (!window.JjkMigr || typeof window.JjkMigr.resume !== "function" || typeof window.JjkMigr.appliquer !== "function")) {
            echec("jjk-migrations.js", "moteur de migration absent après téléchargement"); return;
          }
          if (!M || typeof M.attrsToState !== "function" || typeof M.stateToAttrs !== "function") {
            echec("jjk-attr-map.js", "correspondance des attributs invalide"); return;
          }
          ready = true;
          if (spec.compactStorage === true && !demarreStockageCompact(spec)) {
            ready = false;
            echec("stockage Compact", compactErrorMessage || "impossible d'activer la session Compact");
            return;
          }
          bundleEnCours = false;
          bundleCharge = true;
          // Repli si la fiche était déjà montée ; sinon le listener créé avant
          // l'injection posera le bandeau à l'événement jjk-fiche-mounted.
          attendreMontageFiche();
          post({ type: "mounted" });
          return;
        }
        var u = urls[i++], script = document.createElement("script");
        script.src = u;
        script.onload = suivant;
        script.onerror = function () { echec(u, "script obligatoire introuvable"); };
        document.body.appendChild(script);
      }
      suivant();
    }
    function chargerApresAttrMap() {
      if (remplacerCss) poserCssArchives(spec.css || [], chargerScripts);
      else chargerScripts();
    }
    if (spec.attrmap) {
      if (!urlSure(spec.attrmap)) { echec("attrmap", "URL d'archive invalide"); return; }
      var sm = document.createElement("script");
      sm.src = spec.attrmap;
      sm.onload = function () {
        var neuf = window.JjkAttrMap;
        if (!neuf || typeof neuf.stateToAttrs !== "function" || typeof neuf.attrsToState !== "function" || !neuf.PREFIX) {
          echec(spec.attrmap, "correspondance des attributs invalide"); return;
        }
        M = neuf;
        chargerApresAttrMap();
      };
      sm.onerror = function () { echec(spec.attrmap, "correspondance des attributs introuvable"); };
      document.body.appendChild(sm);
      return;
    }
    chargerApresAttrMap();
  }

  // Le moteur de migration est livré avec le BUNDLE, pas avec l'amorce : au
  // moment de l'écran il n'est donc pas encore là, alors que c'est lui qui sait
  // dire ce que la montée change. On charge ce seul fichier (il ne fait que
  // poser window.JjkMigr, il ne touche à rien) ; s'il manque, l'écran le dit au
  // lieu d'inventer un « rien à signaler ».
  function avecMigrations(cb) {
    if (window.JjkMigr && typeof window.JjkMigr.resume === "function" && typeof window.JjkMigr.appliquer === "function") {
      cb(); return;
    }
    var u = null;
    (specCourant().js || []).forEach(function (x) { if (!u && /jjk-migrations/.test(x)) u = x; });
    if (!u || !urlSure(u)) {
      ecranErreurOuverture("Moteur de migration indisponible",
        "Le bundle publié ne déclare pas le moteur nécessaire pour expliquer et exécuter la migration. Aucune mise à niveau ne sera proposée.");
      return;
    }
    var fini = false, s = document.createElement("script");
    function echec() {
      if (fini) return; fini = true;
      ecranErreurOuverture("Impossible de charger les migrations JJK",
        "Le fichier « " + u + " » n'a pas pu être chargé ou ne fournit pas l'API attendue. La fiche reste fermée et aucune donnée n'a été modifiée.");
    }
    s.src = u;
    s.onload = function () {
      if (fini) return;
      if (!window.JjkMigr || typeof window.JjkMigr.resume !== "function" || typeof window.JjkMigr.appliquer !== "function") { echec(); return; }
      fini = true; cb();
    };
    s.onerror = echec;
    document.body.appendChild(s);
    setTimeout(echec, 5000);
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
    }, 40000);
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
      }, 40000);
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

  // Fiche écrite par une release PLUS RÉCENTE que le site, alors que le schéma
  // concorde. Le contrat ne bloque plus sur le numéro, et il a raison : la forme
  // des données est celle que ce code sait lire, un écran serait de trop. Reste
  // ce qu'une release plus jeune a pu ajouter SANS toucher au schéma : un champ
  // que ce code ne connaît pas et que la première sauvegarde laisserait tomber.
  // Trop peu pour barrer le passage, trop pour ouvrir sans un mot : un bandeau,
  // qui n'empêche rien mais met l'export à portée avant la première frappe. Il
  // se masque, contrairement à ceux du gel : ici la fiche s'enregistre vraiment,
  // le cacher ne fait donc croire à rien de faux.
  

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
    var duFutur = (f.schema != null && f.schema > schSite) || compare(f.release, relSite) === 1;
    var b = ecran(duFutur ? "Version du personnage incompatible" : "Personnage à mettre à jour", false);
    b.appendChild(noeud("p", null, duFutur
      ? "Ce personnage a été enregistré avec une version plus récente de la fiche Jujutsu Kaisen. La version actuellement disponible ne peut pas l’ouvrir."
      : "Ce personnage a été enregistré avec une ancienne version de la fiche Jujutsu Kaisen. Mettez-le à jour pour l’ouvrir avec la version actuelle."));
    var v = noeud("div", "jjk-ecran-vers");
    v.appendChild(noeud("span", null, "Version du personnage : " + (relFiche || "Inconnue")));
    v.appendChild(noeud("span", null, "Version actuelle de la fiche : " + relSite));
    b.appendChild(v);
    var z = zoneActions(b);
    if (!duFutur) {
      var update = bouton(z, "Mettre à jour le personnage", "monter", function () {
        if (!operationBusy && window.JjkMigr && typeof window.JjkMigr.appliquer === "function") monter(false, f);
      }, true);
      if (!window.JjkMigr || typeof window.JjkMigr.resume !== "function" ||
          typeof window.JjkMigr.appliquer !== "function") {
        griser(update, "La mise à jour du personnage n’a pas pu être préparée. Réessayez dans quelques instants.", b);
      }
    }
    var arch = archiveDe(relFiche);
    if (arch && (!memeRang(arch.release, relFiche) ||
        (arch.schema != null && Number(arch.schema) !== Number(f.schema)))) arch = null;
    var open = bouton(z, duFutur ? "Ouvrir avec la version du personnage" : "Ouvrir avec l’ancienne version", "archive", function () {
      if (!arch || operationBusy) return;
      miseANiveauDemandee = false;
      ecranAttente("Chargement du personnage", "Préparation de la fiche…");
      chargerBundle(arch, true);
    });
    if (!arch) {
      griser(open, relFiche
        ? "Cette version de la fiche n’est plus disponible. Le personnage ne peut pas être ouvert avec cette version."
        : "La version utilisée pour enregistrer ce personnage est inconnue. Le personnage ne peut pas être ouvert avec son ancienne version.", b);
    }
    if (duFutur) bouton(z, "Réessayer", "reessayer-version", function () { location.reload(); });
    boutonExport(z);
  }

  // ---------- la décision ----------
  function decider() {
    if (decide || !attrsPrets || !manifPret) return;
    decide = true;
    var attrs = attrsVus || {};
    var courant = specCourant();

    if (!manifesteValide(manifeste())) {
      ecranErreurOuverture("Manifeste JJK absent ou invalide",
        "Le contrat de version et de chargement n'est pas vérifiable. La fiche reste fermée ; aucune donnée ne sera écrite.");
      return;
    }

    // 0. Une lecture partielle ne doit jamais monter la fiche : une apparence
    // utilisable mais gelée a déjà été confondue avec une fiche opérationnelle.
    if (gele) {
      var etatGel = null;
      try { etatGel = mem["jjk-perso"] ? JSON.parse(mem["jjk-perso"]) : null; } catch (eGel) {}
      ecranDonneesIncompletes(etatGel); return;
    }

    var f = versionFiche(attrs);
    // 1. personnage sans fiche JJK : rien à dire, la fiche du jour se monte.
    if (!f || f.schema === null) { chargerBundle(courant); return; }

    var relSite = releaseSite(), schSite = schemaSite(), politique = manifeste().blocage;
    var plusRecente = (f.schema != null && f.schema > schSite) ||
      (politique === "release" && compare(f.release, relSite) === 1);
    if (plusRecente) {
      // Comme OWD, une fiche plus récente n'est jamais ouverte avec le bundle
      // courant. L'écran peut proposer l'archive de sa ligne si elle existe ;
      // contrairement à une fiche ancienne, aucune migration ascendante n'est
      // proposée. Sans archive, seul l'export et le rechargement restent possibles.
      avecMigrations(function () { ecranVersion(f, relSite, schSite); });
      return;
    }

    // La politique de blocage est une donnée du manifeste validé : ne pas la
    // recopier en dur ici, sinon le contrat publié et le comportement divergent.
    var accord = accordVersionFiche(f, relSite, schSite, politique);

    // 3. Accord avec le site : la fiche s'ouvre sans rien demander.
    if (accord) {
      // Sauf qu'elle peut venir d'une release plus JEUNE que celle servie ici
      // (fiche revenue de la beta, ou site en retard d'un déploiement). Le
      // contrat ne bloque plus sur le numéro, donc on ouvre ; mais ouvrir plus
      // vieux que le personnage se dit, sinon personne ne saurait qu'un champ
      // récent risque de tomber à la première sauvegarde.
      chargerBundle(courant);
      return;
    }

    // Toute fiche versionnée qui ne correspond pas exactement au contrat courant
    // passe par l'écran de version. Même les anciennes fiches doivent faire
    // l'objet d'un choix explicite avant migration ou ouverture sur archive.

    // 4. l'écran.
    avecMigrations(function () { ecranVersion(f, relSite, schSite); });
  }

  // Le manifeste est posé par l'amorceur AVANT l'amorce ; mais l'amorce peut
  // aussi être chargée par un repli qui ne l'a pas encore, ou plus du tout. On
  // l'attend donc un temps borné, puis on décide sans lui (les valeurs par
  // défaut de jjk-attr-map font foi).
  function attendreManifeste() {
    var fin = Date.now() + 5000;
    (function voir() {
      var m = manifeste();
      if (manifesteValide(m)) { manifPret = true; decider(); return; }
      if (Date.now() > fin) {
        ecranErreurOuverture("Le manifeste JJK ne peut pas être vérifié",
          "Le fichier de version n'est pas arrivé ou ne respecte pas le contrat attendu. La fiche n'a pas été montée et aucune donnée n'a été modifiée.",
          { noExport: true });
        return;
      }
      setTimeout(voir, 100);
    })();
  }

  // message d'attente / d'orientation de roll20-fiche.html
  function note(html) {
    var n = document.getElementById("jjk-roll20-note");
    if (n) { if (html == null) n.remove(); else n.innerHTML = html; }
  }

  var hydrated = false;
  function hydrate(attrs, relecture) {
    if (hydrated && !relecture) return;
    if (!pontVerifie) return;
    hydrated = true;
    if (askTimer) { clearTimeout(askTimer); askTimer = null; }
    if (relecture) {
      ready = false; gele = false; decide = false; attrsPrets = false;
      attrsVus = null; fermerEcran(); fermerBandeau();
    }
    note(null);
    attrs = attrs || {};
    var state = M.attrsToState(attrs);
    // attrsToState DIT dans quel état il a trouvé la fiche (propriétés non
    // énumérables, donc invisibles au JSON.stringify qui suit) :
    //   null        -> jjk_state lu, état complet ;
    //   "illisible" -> jjk_state présent mais cassé ;
    //   "partiel"   -> pas de jjk_state, et là tout dépend du RESTE.
    //
    // « partiel » couvre deux situations opposées, et le confondre en une
    // seule coûterait la fiche. Un personnage NEUF n'a aucun attribut jjk_ :
    // il n'y a rien à perdre, on ouvre et on écrit normalement. Un personnage
    // qui garde ses autres attributs jjk_ mais dont jjk_state a disparu, lui,
    // vient de perdre la seule copie complète de sa fiche : jjk_state est
    // l'attribut le plus lourd de l'onglet Attributes de Roll20, et le vider à
    // la main est un geste tentant. Ce qui reste est le repli, volontairement
    // allégé par jjk-attr-map (ni code des mods, ni vignettes d'inventaire) :
    // la reconstruction est donc amputée exactement comme dans le cas
    // « illisible », et le premier enregistrement la graverait par-dessus. Même
    // danger, même gel — sans quoi vider jjk_state serait PLUS destructeur que
    // le corrompre, puisqu'un caractère de travers, lui, arrête tout.
    //
    // La distinction ne se refait pas ici : elle est déjà dans la raison rendue
    // par attrsToState, et RAISON_SANS_FICHE la nomme. Une version antérieure
    // de jjk-attr-map.js (cache du navigateur) ne connaît pas cette constante,
    // et n'a alors pas de quoi séparer les deux cas : on ne gèle que sur
    // l'ancien critère, la fiche se comporte comme avant. Plus ancienne encore,
    // elle ne pose aucun diagnostic : `undefined` ne gèle rien non plus.
    var degrade = state ? state.degrade : null;
    var neuf = !M.RAISON_SANS_FICHE || !!(state && state.raison === M.RAISON_SANS_FICHE);
    var illisible = degrade === "illisible";
    var disparu = degrade === "partiel" && !neuf;
    if (illisible || disparu) gele = true;
    // Photographie locale de l'état original avant toute migration. Elle
    // n'est transmise qu'après une lecture Roll20 complète et contient les
    // Attributes bruts afin de pouvoir restaurer exactement le personnage.
    if (!illisible && !disparu) sauvegardeLocale(attrs, "opening");
    mem["jjk-perso"] = JSON.stringify(state);
    mem["jjk-cards"] = "{}";
    mem["jjk-persos"] = "[]";     // pas de bibliothèque multi-perso dans Roll20
    lastAttrs = attrs;                 // base du diff = ce qui est réellement en base
    enVol = null;
    // le bandeau vient APRÈS le cache : son bouton « écraser » déclenche une
    // sauvegarde, qui lit mem["jjk-perso"]
    // Les fiches partielles sont interceptées dans decider() et restent sous
    // écran bloquant. Aucun bundle ni champ d'édition n'est monté dans ce cas.
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
    // Les réponses du pont proviennent du cadre Roll20 parent uniquement.
    // Sans cette garde, un autre iframe de la page pourrait injecter un
    // hydrate, une présence ou un objet « take » falsifié dans cette fiche.
    if (ev.source !== window.top) return;
    var d = ev.data;
    if (!d || d.ns !== "jjk") return;
    if (d.type === "backup-status" && d.charId === CHAR_ID) {
      if (d.viewId !== VIEW_ID || d.request !== backupPendingRequest) return;
      backupPendingRequest = null;
      if (d.ok === true) {
        backupLastAt = Date.now(); backupRetryAt = 0; compactCleanupAt = 0;
        if (compactActif) planifieCompactPoll(0);
      } else {
        backupRetryAt = Date.now() + 30000;
        bandeau("La sauvegarde locale n'a pas été confirmée : " + String(d.error || "l'extension n'a pas répondu") + ". Les données Roll20 ne sont pas supprimées.", [
          { texte: "Réessayer", acte: "backup-retry", action: function () { backupRetryAt = 0; sauvegardeLocale(lastAttrs, "manual"); } },
          { texte: "Exporter le personnage (JSON)", acte: "export", action: exporter }
        ]);
      }
      return;
    }
    if (d.type === "storage-cleanup-status" && (!d.charId || d.charId === CHAR_ID)) {
      var report = d.report || {};
      if (report.status === "error") bandeau("Le nettoyage du stockage " + (d.storage === "narration" ? "Narration" : "de la fiche") +
        " a été interrompu : " + String(report.error || "erreur inconnue") + ". Les données non vérifiées sont conservées.");
      return;
    }
    if (d.type === "storage-error" && (!d.charId || d.charId === CHAR_ID)) {
      erreurCompact(String(d.error || "Le pont a refusé une opération Compact."));
      return;
    }
    // on n'accepte que l'hydratation de NOTRE personnage (plusieurs fiches peuvent être ouvertes)
    if (d.type === "hydrate" && (!d.charId || d.charId === CHAR_ID)) {
      // ROUTAGE CRITIQUE. Une fois la fiche hydratée, un « hydrate » n'hydrate
      // plus rien : c'est la réponse à une sonde de confirmation, qui n'a le
      // droit que de LIRE. Le passer à hydrate() — ou même le laisser tomber
      // dans son garde-fou — écraserait mem["jjk-perso"], donc la saisie en
      // cours, par un état lu il y a une seconde. Les réponses tardives à la
      // relance d'ouverture arrivent par ce même chemin et se perdent sans
      // dommage : aucune sonde ne les attend.
      if (!pontVerifie) {
        verifierPont(d);
        return;
      }
      if (versionBloquee) return;
      d.attrs = completeOmis(d.attrs || {}, d.omis);
      if (relectureOuverture) {
        relectureOuverture = false;
        hydrate(d.attrs, true);
      } else if (d.fresh === true && hydrated) {
        // Le pont ne répond qu'après un fetch Roll20 complet. Cette même
        // lecture actualise Compact ET doit acquitter les sondes en attente
        // (confirmation de sauvegarde, restauration et polling).
        appliqueLectureCompact(d.attrs);
        sondeReponse(d.attrs);
      } else if (hydrated) sondeReponse(d.attrs);
      else hydrate(d.attrs);
    }
    // objet pris au tchat : diffusé à TOUTES les fiches ouvertes (le lien est
    // public, chaque client décide s'il le prend), d'où l'absence de filtre
    // sur charId ; c'est le dialogue de réception qui demande confirmation.
    else if (d.type === "take" && d.payload) window.__jjkTake(d.payload);
    // liste des joueurs connectés, en réponse à __jjkPlayers
    else if (d.type === "players-result") playersReply(d.players || []);
    else if (d.type === "hydrate-refresh-error" && d.charId === CHAR_ID) {
      sondeReponse(null);
      if (relectureOuverture) {
        relectureOuverture = false;
        ecranErreurOuverture("La relecture distante a échoué",
          "Roll20 n'a pas pu confirmer une lecture complète. Aucune donnée n'a été modifiée ; la fiche reste fermée et verrouillée.",
          { reessayer: relireOuverture, texteReessayer: "Relire Roll20", exporterAttrs: true });
      } else if (!gele) bandeau("Roll20 n'a pas pu actualiser la lecture distante. Les dernières données vérifiées restent affichées ; nouvelle tentative automatique en cours.");
    }
    else if (d.type === "presence-state" && (!d.charId || d.charId === CHAR_ID)) {
      presenceRecu = true;
      presenceRows = Array.isArray(d.presence) ? d.presence : [];
      presencePlayer = d.player || null;
      appliqueMode(d.modeState || { mode: d.mode, modeAt: d.modeAt, modeBy: d.modeBy });
      renderPresence();
    }
    else if (d.type === "backup-restore-start" && (!d.charId || d.charId === CHAR_ID)) {
      // Geler cette vue : une session Compact ancienne ne doit pas republier
      // ses opérations pendant qu'une sauvegarde historique remplace Roll20.
      gele = true;
      ready = false;
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      if (compactPoll) { clearTimeout(compactPoll); compactPoll = null; }
      bandeau("Restauration d'une sauvegarde en cours. Cette fiche reste verrouillée jusqu'à son rechargement.");
    }
    else if (d.type === "backup-restore-status" && (!d.charId || d.charId === CHAR_ID)) {
      gele = true;
      ready = false;
      if (d.ok) bandeau("Sauvegarde restaurée et confirmée par Roll20. Rechargez cette fiche pour afficher l'état restauré.");
      else bandeau("Restauration incomplète : " + String(d.error || "erreur inconnue") + " La fiche reste verrouillée ; rechargez-la seulement après vérification.");
    }

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
  // Le chargeur ne considère pas le script prêt sur son seul événement onload :
  // il attend cette sentinelle, qui doit aussi être posée avant le retour standalone.
  window.__jjkRoll20BootReady = true;

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
    if (hydrated || pontChecking) return;
    tries++;
    if (pontRefuse) return;
    if (tries > 80) {
      ecranErreurOuverture("Le pont Roll20 ne répond pas",
        "La fiche n'a pas pu lire les attributs du personnage. Vérifiez que la partie est ouverte, que le personnage existe et que la fenêtre principale de Roll20 reste ouverte en cas de popout.",
        { reessayer: function () { tries = 0; ask(); }, noExport: true });
      return;
    }
    post({ type: "load", resync: true, allege: true, viewId: VIEW_ID });
    askTimer = setTimeout(ask, 500);
  })();
})();
