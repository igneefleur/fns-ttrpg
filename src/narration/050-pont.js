
  // ---------- dialogue avec le pont ----------
  function post(msg) {
    msg.ns = NS;
    msg.viewId = VIEW_ID;
    try { window.top.postMessage(msg, "*"); } catch (e) {}
  }
  // Le pont d20 n'est injecté par l'extension que sur demande, et rien ne dit
  // qu'une fiche a déjà été ouverte dans cette partie : le plateau réclame donc
  // le pont lui-même avant de parler. L'injection est idempotente, le redemander
  // ne coûte rien.
  // « encore » ne part qu'au clic sur Réessayer : il fait recommencer au pont son
  // ouverture de fiche. La demande périodique, elle, ne doit rien relancer, sinon
  // un échec s'effacerait tout seul toutes les douze secondes.
  function demandePerso(encore) {
    if (encore) {
      lectureCompleteNarration = true;
      if (charId) montreEtat("attente");
    }
    post({ type: "need-bridge" });
    post({ type: "narration-char", encore: !!encore });
  }
  // L'ALLÈGEMENT SE DEMANDE, SINON IL NE SERT À RIEN. Le pont sait retenir les
  // gros attributs — les fonds importés, qui pèsent jusqu'à deux cents kilos en
  // base64 — mais seulement si la page le lui demande. Personne ne le demandait :
  // les images repartaient donc à chaque tour, toutes les 1.2 seconde, pour rien.
  //
  // On ne l'allège QU'UNE FOIS QU'ON LES TIENT. La toute première lecture doit
  // être complète, sinon le plateau n'aurait jamais vu les fonds ; et « omis »
  // dit lesquels le pont a retenus, pour qu'on garde les nôtres au lieu de les
  // croire effacés.
  var fondsTenus = false;
  var cacheAttributsNarration = Object.create(null);
  var lectureCompleteNarration = false;
  // CE QUI APPARTIENT AU PLATEAU, dit par le plateau lui-même. Le pont range les
  // attributs de « Narration » : il retire les restes d'une fiche de personnage
  // ouverte un jour dessus, et dédoublonne les nôtres. Mais il ne peut pas
  // DEVINER lesquels sont les nôtres — et un critère gravé dans un paquet signé
  // condamnerait tout nom qu'on se mettrait à écrire plus tard, puisque cette
  // page-ci change sans signature. On envoie donc la liste, et le pont ne
  // détruit rien sans elle.
  var MENAGE_GARDE = [A_CONF, A_PT, A_BG, A_STORAGE, A_BLOCK, A_STACK, A_OPS];

  // Le plateau partage le même moteur Compact que la fiche, mais possède son
  // espace d'attributs, son journal et son état propres. Les fonds base64
  // restent dans A_BG : ils ne transitent jamais dans les journaux d'opérations.
  var narrationCompact = null, narrationSession = null, narrationCompactActive = false;
  var narrationMigrationEnvoyee = 0, narrationSessionId = null;
  var narrationStorageReady = false, narrationCleanupAt = 0;
  function etatNarrationCompact() { return { v: 1, conf: conf, points: points, modData: {} }; }
  function appliqueEtatNarrationCompact(s) {
    if (!s || !s.conf || !s.points || typeof s.points !== "object") throw new Error("État du plateau Compact incomplet.");
    conf = litConf(JSON.stringify(s.conf));
    var p = {};
    Object.keys(s.points).forEach(function (id) {
      var v = s.points[id];
      if (!/^[A-Za-z0-9_-]{1,16}$/.test(id) || !v || !isFinite(v.x) || !isFinite(v.y)) return;
      p[id] = { x: clamp(Number(v.x), 0, MILLE), y: clamp(Number(v.y), 0, MILLE) };
    });
    points = p;
  }
  function envoieEtatCompact() {
    if (!narrationSession || !charId || !peutPousser()) return;
    narrationSession.capture(etatNarrationCompact());
    if (!narrationSession.hasBase) {
      // La photographie de migration est re-postée à intervalle borné tant
      // qu'une relecture Roll20 ne l'a pas confirmée.
      if (Date.now() - narrationMigrationEnvoyee < 2800) return;
      narrationMigrationEnvoyee = Date.now();
      post({ type: "save", charId: charId, attrs: narrationSession.migration || {} });
      return;
    }
    if (!narrationStorageReady) {
      post({ type: "storage-activate", storage: "narration", charId: charId });
      return;
    }
    var operations = narrationSession.outgoing(), ids = Object.keys(operations);
    if (!ids.length && !Object.keys(narrationSession.payloads || {}).length) return;
    post({ type: "storage-ops", storage: "narration", charId: charId,
      session: narrationSessionId, epoch: narrationSession.epoch,
      ops: ids.map(function (id) { return operations[id]; }), payloads: narrationSession.payloads });
  }
  function synchroniseNarrationCompact(attrs) {
    if (!window.JjkSync || typeof window.JjkSync.createCompact !== "function") return;
    try {
      if (!narrationCompact) {
        narrationCompact = window.JjkSync.createCompact({
          meta: A_STORAGE, block: A_BLOCK, stack: A_STACK, ops: A_OPS,
          inventory: false, reserves: false,
          owners: { narration: ["conf", "points"] }
        }).Compact;
      }
      if (!narrationSession) {
        narrationSessionId = "narr-" + String(charId || "table").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) + "-" + Date.now().toString(36);
        narrationSession = new narrationCompact.Session(attrs || {}, etatNarrationCompact(), Date.now,
          { id: narrationSessionId, actor: { id: narrationSessionId, name: "Narration" } });
      }
      // La première relecture arrive alors que hasBase vaut encore false :
      // c'est précisément elle qui confirme la photographie de migration.
      // Tester hasBase avant receive() empêchait cette confirmation et
      // renvoyait indéfiniment la même photographie.
      if (attrs && attrs[A_STORAGE]) {
        var distant = narrationCompact.read(attrs);
        if (distant && !distant.incomplete && (Number(distant.state.v) > 1)) {
          etatSur = false; montreEtat("perdu");
          trace("version-compact-future", { version: distant.state.v });
          return;
        }
        var resultat = narrationSession.receive(attrs);
        if (!resultat) return;
        if (resultat.incomplete) throw new Error("Le journal du plateau référence des données absentes.");
        var phaseNarr = "";
        try { phaseNarr = JSON.parse(String(attrs[A_STORAGE].current || "{}")).phase; } catch (ePhaseNarr) {}
        narrationStorageReady = phaseNarr === "ready";
        if (!narrationStorageReady) post({ type: "storage-activate", storage: "narration", charId: charId });
        else if (Date.now() - narrationCleanupAt > 15000) {
          narrationCleanupAt = Date.now();
          post({ type: "storage-cleanup", storage: "narration", charId: charId });
        }
        appliqueEtatNarrationCompact(resultat.state);
        narrationCompactActive = true;
        if (resultat.conflict) trace("conflit-compact", { conflicts: resultat.conflicts || [] });
        if (resultat.lost) { refuse = true; montreEtat("perdu"); }
        if (Object.keys(narrationSession.pending || {}).length || Object.keys(narrationSession.payloads || {}).length)
          envoieEtatCompact();
      } else if (!narrationSession.hasBase) {
        narrationSession.capture(etatNarrationCompact());
        envoieEtatCompact();
      } else {
        throw new Error("La photographie Compact du plateau a disparu.");
      }
    } catch (eCompact) {
      etatSur = false;
      trace("erreur-compact", { message: String(eCompact && eCompact.message || eCompact) });
      montreEtat("perdu");
    }
  }
  // ON DEMANDE À VOIR LES AUTRES. « load » seul ne rend que ce que ce client-ci
  // tient déjà ; « resync » lui fait d'abord poser la question au serveur. Deux
  // choses distinctes, et c'est toute la réparation : sans la seconde, un
  // plateau relit sa propre copie et paraît immobile pendant que les autres
  // jouent.
  //
  // Ce n'est pas demandé à chaque tour : le pont refuserait de toute façon
  // d'aller plus vite que son propre plancher, et le lui demander pour rien
  // n'apprend rien à personne. La demande arrive donc à SA cadence, et la
  // lecture qui suit — celle d'après, le temps que le serveur réponde — porte ce
  // qu'ont fait les autres.
  var resyncQuand = 0;
  // Ce pont-ci sait-il seulement aller chercher ? Un paquet signé plus ancien ne
  // le sait pas, et il n'y a alors rien à faire depuis ici : le noter permet au
  // moins de le DIRE, au lieu de laisser croire que le plateau est à jour.
  var pontResync = null;
  function demandeEtat() {
    if (!charId) { return; }
    var n = Date.now(), rs = false;
    if (!lectureCompleteNarration && n - resyncQuand >= RESYNC) { resyncQuand = n; rs = true; }
    post({ type: "load", charId: charId, allege: fondsTenus === true,
           menageGarde: MENAGE_GARDE, resync: rs, complet: lectureCompleteNarration });
  }
  // Une écriture = un lot d'attributs. On note ce qu'on vient d'écrire : l'écho
  // met un aller-retour à revenir, et sans cette note la relecture suivante
  // remettrait le jeton là où il était avant notre geste.
  function ecrire(attrs) {
    if (!charId || !peutPousser()) return;
    // Compact est la source canonique, mais les attributs historiques restent
    // des miroirs pour les anciennes pages encore ouvertes dans la campagne.
    // Les images de fond, elles, restent toujours des attributs autonomes.
    if (narrationSession) envoieEtatCompact();
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
      // « avant » : la valeur que Roll20 nous avait donnée juste avant qu'on
      // écrive. Si la valeur qui revient lui est ÉGALE, notre écriture n'a pas
      // pris ; si elle en diffère, c'est quelqu'un d'autre qui a écrit. Sans ce
      // repère, les deux pannes se ressemblent trait pour trait.
      attente[n] = { val: v, t: t, marge: marge, avant: (dernierLu[n] == null ? null : dernierLu[n]) };
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
          cacheAttributsNarration = Object.create(null);
          lectureCompleteNarration = false;
          // « pas de plateau » ne se dit que si la campagne est chargée : au
          // démarrage, Roll20 met une seconde ou deux à peupler ses
          // personnages, et l'annoncer alors afficherait un écran d'erreur qui
          // ne partirait plus.
          if (d.pret !== false) montreEtat("absent");
          return;
        }
        // LE PERSONNAGE A CHANGÉ : ON REPART DE ZÉRO. Le MJ qui suit la consigne
        // « aucun plateau dans cette campagne » supprime et recrée « Narration » ;
        // deux personnages du même nom suffisent aussi à faire changer d'avis la
        // recherche quand la collection se retrie. Chez un joueur dont le panneau
        // est déjà ouvert, le nouvel identifiant remplaçait l'ancien SANS rien
        // remettre à zéro : le plateau gardait les jetons, la configuration et
        // les attentes de l'ancien personnage, se croyait sûr de ce qu'il n'avait
        // jamais lu, et pouvait écrire par-dessus la table neuve.
        if (charId && d.charId !== charId) {
          etatSur = false; lu = false; vide = 0; perdues = 0; refuse = false;
          confFuture = false; points = {}; conf = confVide(); fonds = {};
          attente = {}; connus = {}; prise = null;
          annuleEnvoi();
          narrationCompact = null; narrationSession = null; narrationCompactActive = false;
          narrationMigrationEnvoyee = 0; narrationSessionId = null;
          narrationStorageReady = false; narrationCleanupAt = 0;
          cacheAttributsNarration = Object.create(null); lectureCompleteNarration = false;
          fondsTenus = false; resyncQuand = 0;
          montreEtat("attente");
        }
        charId = d.charId;
        ecrivable = jugeDroits(d);
        // le personnage est trouvé : ces deux écrans-là n'ont plus lieu d'être.
        // Les autres disent l'état de la LECTURE, que seule la lecture peut lever.
        if (etatMontre === "absent" || etatMontre === "pont") montreEtat(null);
        demandeEtat();
      } else if (d.type === "hydrate" && d.charId === charId) {
        recoitLectureNarration(d);
      } else if (d.type === "backup-status" && d.charId === charId && d.ok === true) {
        narrationCleanupAt = 0;
        demandeEtat();
      } else if (d.type === "backup-status" && d.charId === charId && d.ok === false) {
        trace("sauvegarde-locale-refusee", { message: String(d.error || "Sauvegarde locale non confirmée") });
      } else if (d.type === "storage-error" && d.charId === charId && d.storage === "narration") {
        refuse = true; trace("erreur-stockage", { message: String(d.error || "Erreur de stockage") }); montreEtat("perdu");
      } else if (d.type === "storage-cleanup-status" && d.charId === charId && d.storage === "narration" && d.report && d.report.status === "error") {
        trace("erreur-nettoyage", { message: String(d.report.error || "Nettoyage interrompu") });
      }
    } catch (e) {}
  }, false);

  function recoitLectureNarration(d) {
    // Un fetch raté peut diffuser une collection vide ou périmée.
    if (d.fresh === false) return;
    var attrs = Object.create(null);
    Object.keys(d.attrs || {}).forEach(function (nom) {
      if (nom.indexOf(PREF) === 0) attrs[nom] = d.attrs[nom];
    });
    var omis = Array.isArray(d.omis) ? d.omis : [];
    lectureCompleteNarration = omis.some(function (nom) {
      if (typeof nom !== "string" || nom.indexOf(PREF) !== 0 || attrs[nom]) return false;
      if (!cacheAttributsNarration[nom]) return true;
      attrs[nom] = cacheAttributsNarration[nom];
      return false;
    });
    if (lectureCompleteNarration) return;
    cacheAttributsNarration = attrs;
    if (d.sur === false) lectureCompleteNarration = true;
    applique(attrs, d);
  }

  window.addEventListener("pagehide", function () {
    if (!charId) return;
    try { post({ type: "storage-release", storage: "narration", charId: charId, viewId: VIEW_ID }); } catch (e) {}
  });

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
