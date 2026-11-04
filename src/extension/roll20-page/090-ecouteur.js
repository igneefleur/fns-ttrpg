  // Écouteur PASSIF : n'agit QUE sur nos messages (ns:"jjk" + charId), qui ne sont
  // émis que sur interaction (ouverture de l'onglet Fiche JJK). On NE poste RIEN de
  // spontané au chargement — Roll20 ouvre ses fiches via postMessage, un message
  // inattendu casserait son gestionnaire. Tout est en try/catch pour ne jamais
  // laisser une exception remonter dans le contexte de Roll20.
  // Une sauvegarde n'est validée qu'après l'accusé du relais IndexedDB.
  // Le pont associe l'accusé à une demande précise et à l'époque Compact lue.
  var stockageBackupDemandes = Object.create(null);
  document.addEventListener("jjk-backup-saved", function (ev) {
    try {
      var data = JSON.parse(ev.detail || "{}");
      if (!data || typeof data.request !== "string" ||
          !Object.prototype.hasOwnProperty.call(stockageBackupDemandes, data.request)) return;
      var pending = stockageBackupDemandes[data.request];
      delete stockageBackupDemandes[data.request];
      if (data.ok === true) {
        var saved = stockageSauvegardes[pending.charId] || {};
        if (pending.fiche) saved.fiche = pending.fiche;
        if (pending.narration) saved.narration = pending.narration;
        saved.at = Date.now();
        stockageSauvegardes[pending.charId] = saved;
      }
      for (var i = srcFrames.length - 1; i >= 0; i--) {
        if (srcIds[i] !== pending.charId || srcViewIds[i] !== pending.viewId) continue;
        try {
          srcFrames[i].postMessage({ ns: "jjk", type: "backup-status", charId: pending.charId,
            viewId: pending.viewId, request: data.request, ok: data.ok === true,
            error: data.ok === true ? "" : String(data.error || "Sauvegarde locale refusée.") }, "*");
        } catch (eFrame) {}
      }
    } catch (e) {}
  }, false);

  window.addEventListener("message", function (ev) {
    try {
      var d = ev.data;
      if (!d || d.ns !== "jjk") return;
      // la liste des joueurs ne dépend d'aucun personnage : traitée AVANT le
      // filtre charId
      if (d.type === "players") { reply(ev, { type: "players-result", players: players() }); return; }
      // Les sauvegardes locales ne quittent jamais le personnage courant :
      // le pont ajoute les identifiants réels de campagne/personnage et relaie
      // uniquement une photographie déjà confirmée par la fiche.
      if (d.type === "storage-ops") {
        try {
        var storageChar = d.charId && getChar(d.charId);
        if (!storageChar || !liee(ev.source, d.charId) || !stockageAcces(storageChar) ||
            !Array.isArray(d.ops) || !d.epoch) return;
        if (d.storage !== undefined && d.storage !== "fiche" && d.storage !== "narration")
          throw new Error("Espace de stockage Compact inconnu.");
        var freshStorage = stockageFraichePour(storageChar), kindStorage = d.storage === "narration" ? "narration" : "fiche";
        if (!freshStorage) { reply(ev, { type: "storage-error", charId: d.charId, error: "Lecture Roll20 trop ancienne : nouvelle lecture requise." }); return; }
        var activeMeta = stockageMeta(freshStorage.attrs, kindStorage);
        if (!activeMeta || activeMeta.phase !== "ready" || activeMeta.epoch !== d.epoch) {
          reply(ev, { type: "storage-error", charId: d.charId, error: "Le stockage Compact n'est pas activé ou son époque a changé. Rechargez la lecture avant de renvoyer les opérations." }); return;
        }
        var viewIndex = srcFrames.indexOf(ev.source), viewId = String(d.viewId || "");
        if (viewIndex < 0 || !viewId || viewId.length > 128 || srcViewIds[viewIndex] !== viewId)
          throw new Error("Identifiant de vue Compact invalide : rechargez la fiche.");
        var operationsRecues = [], incomingOps = Object.create(null);
        d.ops.forEach(function (op) {
          if (!op || typeof op.id !== "string" || !op.id.length || op.id.length > 256 ||
              ["__proto__", "prototype", "constructor"].indexOf(op.id) >= 0 ||
              !Number.isSafeInteger(op.clock) || op.clock < 0 || !Array.isArray(op.changes) || op.changes.length > 20000 ||
              op.changes.some(function (change) {
                return !change || typeof change.k !== "string" || change.k.length > 4096 ||
                  change.k.indexOf("__proto__") >= 0 || change.k.indexOf("constructor") >= 0 ||
                  !Array.isArray(change.n) || !change.n.length || ["v", "o", "a", "d", "l", "i"].indexOf(change.n[0]) < 0;
              })) throw new Error("Le journal contient une opération invalide.");
          if (incomingOps[op.id] && stockageStable(incomingOps[op.id]) !== stockageStable(op))
            throw new Error("Identifiant d'opération répété dans le même envoi avec un contenu différent : " + op.id);
          if (!incomingOps[op.id]) { incomingOps[op.id] = op; operationsRecues.push(op); }
        });
        var ops = operationsRecues.slice();
        var narrationStorage = d.storage === "narration";
        var opsPrefix = narrationStorage ? "jjk_narr_ops_" : "jjk_ops_";
        var blockPrefix = narrationStorage ? "jjk_narr_block_" : "jjk_block_";
        var stackPrefix = narrationStorage ? "jjk_narr_stack_" : "jjk_stack_";
        var payloads = {}, payloadSource = d.payloads && typeof d.payloads === "object" && !Array.isArray(d.payloads) ? d.payloads : {};
        if (d.payloads != null && (typeof d.payloads !== "object" || Array.isArray(d.payloads)))
          throw new Error("Les blocs du journal sont invalides.");
        Object.keys(payloadSource).forEach(function (name) {
          var value = payloadSource[name];
          if ((name.indexOf(blockPrefix) !== 0 && name.indexOf(stackPrefix) !== 0) ||
              name.indexOf("__proto__") >= 0 || name.indexOf("constructor") >= 0 ||
              !value || typeof value.current !== "string" || value.current.length > 950000)
            throw new Error("Bloc de données non autorisé ou trop volumineux : " + name);
          payloads[name] = { current: value.current, max: "" };
        });
        if (!ops.length && !Object.keys(payloads).length) return;
        var currentAttrs = freshStorage.attrs, seenOps = Object.create(null), sessionId = String(d.session || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
        if (!sessionId) { reply(ev, { type: "storage-error", charId: d.charId, error: "Identifiant de session Compact absent." }); return; }
        var attenteStorage = stockageOperationsEnAttente(storageChar, kindStorage, d.epoch);
        Object.keys(attenteStorage.ops).forEach(function (id) {
          var op = attenteStorage.ops[id];
          if (seenOps[id] && stockageStable(seenOps[id]) !== stockageStable(op))
            throw new Error("Identifiant d'opération en attente réutilisé avec un contenu différent : " + id);
          seenOps[id] = op;
        });
        Object.keys(currentAttrs).forEach(function (name) {
          if (name.indexOf(opsPrefix) !== 0) return;
          try {
            var journal = JSON.parse(currentAttrs[name].current || "{}");
            if (journal.epoch !== d.epoch) return;
            if (!Array.isArray(journal.ops)) throw new Error("Journal Compact mal formé : " + name);
            journal.ops.forEach(function (op) {
              if (!op || typeof op.id !== "string") throw new Error("Opération illisible dans " + name);
              if (seenOps[op.id] && stockageStable(seenOps[op.id]) !== stockageStable(op))
                throw new Error("Identifiant d'opération réutilisé avec un contenu différent : " + op.id);
              seenOps[op.id] = op;
            });
          } catch (e) { throw new Error("Journal Compact illisible : " + name + " (" + String(e.message || e) + ")"); }
        });
        Object.keys(payloads).forEach(function (name) {
          if (Object.prototype.hasOwnProperty.call(attenteStorage.payloads, name)) {
            if (attenteStorage.payloads[name] !== payloads[name].current)
              throw new Error("Identifiant de bloc en attente réutilisé avec un contenu différent : " + name);
            delete payloads[name];
            return;
          }
          if (currentAttrs[name]) {
            if (String(currentAttrs[name].current || "") !== payloads[name].current)
              throw new Error("Identifiant de bloc déjà utilisé avec un contenu différent : " + name);
            delete payloads[name];
          }
        });
        ops = ops.filter(function (op) {
          if (!seenOps[op.id]) return true;
          if (stockageStable(seenOps[op.id]) !== stockageStable(op))
            throw new Error("Identifiant d'opération déjà enregistré avec un contenu différent : " + op.id);
          return false;
        });
        var lotStorage = {}, payloadNames = Object.keys(payloads);
        payloadNames.forEach(function (name) { lotStorage[name] = payloads[name]; });
        // Journaux immuables par lot : en cas de nouvelle tentative, les IDs
        // déjà relus sont ignorés. Le payload des piles/modules est écrit avant
        // l'opération qui le référence, dans la même file Roll20.
        var paquet = [], taille = 0, numero = 0;
        function empreinteJournal(texte) {
          var h = 2166136261;
          for (var hi = 0; hi < texte.length; hi++) { h ^= texte.charCodeAt(hi); h = Math.imul(h, 16777619); }
          return (h >>> 0).toString(36);
        }
        function pousserPaquet() {
          if (!paquet.length) return;
          var brutJournal = JSON.stringify({ format: 2, epoch: d.epoch, session: sessionId, ops: paquet });
          // Le nom est déterministe à partir du contenu : réessayer exactement
          // le même lot retrouve son attribut immuable, tandis qu'un lot suivant
          // obtient un autre nom. Un compteur remis à zéro à chaque message
          // écraserait sinon le premier journal de la session.
          var nomJournal = opsPrefix + (sessionId || "session") + "_" + empreinteJournal(brutJournal);
          var existant = currentAttrs[nomJournal] || lotStorage[nomJournal];
          if (existant && String(existant.current || "") !== brutJournal)
            throw new Error("Collision de nom de journal Compact : " + nomJournal);
          if (!existant) lotStorage[nomJournal] = { current: brutJournal, max: "" };
          numero++;
          paquet = []; taille = 0;
        }
        ops.forEach(function (op) {
          var raw = JSON.stringify(op), n = raw.length;
          if (paquet.length && taille + n + 2 > 18000) pousserPaquet();
          paquet.push(op); taille += n + 1;
        });
        pousserPaquet();
        // Valider et enregistrer les références de vue AVANT de mettre en file :
        // une collision ou un changement de session ne doit jamais laisser un
        // job partir après que le message a été refusé.
        stockageSuitVue(storageChar, viewId, sessionId, kindStorage, d.epoch, operationsRecues, payloadSource);
        if (Object.keys(lotStorage).length) enqueue(d.charId, lotStorage);
        reply(ev, { type: "storage-ops-queued", charId: d.charId, count: ops.length, payloads: payloadNames.length });
        return;
        } catch (storageOpsError) {
          reply(ev, { type: "storage-error", charId: d.charId, error: String(storageOpsError.message || storageOpsError) });
          return;
        }
      }
      if (d.type === "storage-release") {
        var releaseChar = d.charId && getChar(d.charId), releaseIndex = srcFrames.indexOf(ev.source);
        var releaseView = String(d.viewId || "");
        if (!releaseChar || !liee(ev.source, d.charId) || releaseIndex < 0 ||
            !releaseView || srcViewIds[releaseIndex] !== releaseView) return;
        try { stockageLibereVue(releaseChar, releaseView); } catch (releaseError) {}
        return;
      }
      if (d.type === "storage-activate") {
        var activationChar = d.charId && getChar(d.charId), activationIndex = srcFrames.indexOf(ev.source);
        var activationView = String(d.viewId || ""), activationKind = d.storage === "narration" ? "narration" : "fiche";
        if (d.storage !== undefined && d.storage !== "fiche" && d.storage !== "narration") return;
        if (!activationChar || !liee(ev.source, d.charId) || !stockageAcces(activationChar) ||
            activationIndex < 0 || !activationView || srcViewIds[activationIndex] !== activationView) return;
        try {
          var activation = stockageActiver(activationChar, activationKind);
          reply(ev, Object.assign({ type: "storage-activate-status", charId: d.charId, storage: activationKind }, activation));
        } catch (activationError) {
          reply(ev, { type: "storage-error", charId: d.charId, storage: activationKind, error: String(activationError.message || activationError) });
        }
        return;
      }
      if (d.type === "storage-cleanup") {
        if (d.storage !== undefined && d.storage !== "fiche" && d.storage !== "narration") return;
        var cleanupChar = d.charId && getChar(d.charId), cleanupKind = d.storage === "narration" ? "narration" : "fiche";
        var cleanupIndex = srcFrames.indexOf(ev.source), cleanupView = String(d.viewId || "");
        if (!cleanupChar || !liee(ev.source, d.charId) || cleanupIndex < 0 || !cleanupView || srcViewIds[cleanupIndex] !== cleanupView) return;
        if (!stockageAcces(cleanupChar)) { reply(ev, { type: "storage-cleanup-status", charId: d.charId, storage: cleanupKind, report: { status: "error", error: "Accès en écriture requis pour nettoyer le stockage." } }); return; }
        try { reply(ev, { type: "storage-cleanup-status", charId: d.charId, storage: cleanupKind, report: stockageNettoie(cleanupChar, cleanupKind) }); }
        catch (cleanupError) { reply(ev, { type: "storage-cleanup-status", charId: d.charId, storage: cleanupKind, report: { status: "error", error: String(cleanupError.message || cleanupError) } }); }
        return;
      }
      if (d.type === "backup-snapshot") {
        var backupIndex = srcFrames.indexOf(ev.source), backupView = String(d.viewId || "");
        if (!d.charId || !d.state || typeof d.state !== "object" || Array.isArray(d.state) ||
            !Number.isSafeInteger(d.state.v) || backupIndex < 0 ||
            srcIds[backupIndex] !== d.charId || !backupView || backupView.length > 128 ||
            srcViewIds[backupIndex] !== backupView) return;
        var backupRequest = String(d.request || "");
        if (!backupRequest || backupRequest.length > 160 || backupRequest.indexOf(backupView + "-backup-") !== 0 ||
            stockageBackupDemandes[backupRequest]) return;
        var bc = campaign(), bch = getChar(d.charId), freshBackup = bch && stockageFraichePour(bch);
        if (!bc || !bc.id || !bch) return;
        if (!freshBackup) {
          if (typeof resynchronise === "function") resynchronise(bch);
          reply(ev, { type: "backup-status", charId: d.charId, viewId: backupView, request: backupRequest,
            ok: false, error: "La lecture Roll20 n'est plus assez récente. Une nouvelle lecture a été demandée ; réessayez." });
          return;
        }
        // La liste des attributs vient exclusivement de readAll(), après fetch
        // serveur. Ne jamais prendre d.attrs : la page et les mods ne peuvent
        // pas choisir les données qui seront prises pour une sauvegarde validée.
        var ba = freshBackup.attrs || {}, bs = ba[PREFIX + "state"], bm = ba[PREFIX + "storage"];
        if ((!(bs && bs.current) && !(bm && bm.current)) || !ba[PREFIX + "version"]) {
          reply(ev, { type: "backup-status", charId: d.charId, viewId: backupView, request: backupRequest,
            ok: false, error: "La photographie Roll20 ne contient pas une fiche JJK complète." });
          return;
        }
        var propres = {}, bn, totalBackup = 0;
        for (bn in ba) if (Object.prototype.hasOwnProperty.call(ba, bn) && ecrivable(bn)) {
          var boxBackup = ba[bn];
          if (!boxBackup || typeof boxBackup.current !== "string" || typeof boxBackup.max !== "string" ||
              boxBackup.current.length > 950000 || boxBackup.max.length > 950000) {
            reply(ev, { type: "backup-status", charId: d.charId, viewId: backupView, request: backupRequest,
              ok: false, error: "Un attribut dépasse la taille autorisée ou est illisible. Les données Roll20 sont conservées." });
            return;
          }
          propres[bn] = { current: boxBackup.current, max: boxBackup.max };
          totalBackup += bn.length + boxBackup.current.length + boxBackup.max.length;
          if (totalBackup > 20000000) {
            reply(ev, { type: "backup-status", charId: d.charId, viewId: backupView, request: backupRequest,
              ok: false, error: "La photographie dépasse la taille maximale de sauvegarde locale (20 Mo). Les données Roll20 sont conservées." });
            return;
          }
        }
        function epochOf(raw) {
          try { var meta = JSON.parse(raw && raw.current || "{}"); return meta && meta.format === 2 ? String(meta.epoch || "") : ""; }
          catch (e) { return ""; }
        }
        stockageBackupDemandes[backupRequest] = {
          charId: String(d.charId), viewId: backupView,
          fiche: epochOf(propres.jjk_storage), narration: epochOf(propres.jjk_narr_storage), at: Date.now()
        };
        Object.keys(stockageBackupDemandes).forEach(function (key) {
          if (Date.now() - stockageBackupDemandes[key].at > 120000) delete stockageBackupDemandes[key];
        });
        document.dispatchEvent(new CustomEvent("jjk-backup-save", { detail: JSON.stringify({
          request: backupRequest, campaignId: String(bc.id), charId: String(d.charId),
          name: String((bch.get ? bch.get("name") : "") || d.state.name || "Sans nom"),
          state: d.state, attrs: propres, reason: d.reason || "autosave"
        }) }));
        return;
      }
      // le plateau de Narration ne dépend d'aucun personnage CONNU du panneau :
      // c'est justement ce qu'il vient demander, donc avant le filtre charId
      if (d.type === "narration-char") {
        // « pas de plateau » et « campagne pas encore chargée » ne se disent pas
        // pareil : au démarrage, characters est vide pendant une seconde ou
        // deux, et annoncer l'absence ferait afficher un écran d'erreur pour
        // rien (même prudence que has-sheet, qui répond exists:null).
        var nc = narrationChar();
        var rep = { type: "narration-char-result", pret: !!campaign(), charId: null, nom: "" };
        if (nc) {
          rep.charId = nc.id;
          rep.nom = String((nc.get ? nc.get("name") : "") || "");
          var dr = droits(nc);
          rep.gm = dr.gm;
          rep.moi = dr.moi;
          rep.controlledby = dr.controlledby;
          narrId = nc.id;
          // « Réessayer » côté plateau : on repart de zéro. Sans ce mot, la
          // demande périodique effacerait l'échec toutes les douze secondes et
          // l'écran d'état clignoterait entre les deux.
          if (d.encore) relanceOuverture(nc.id);
          // le plus tôt est le mieux : l'ouverture de la fiche commence ici,
          // sans attendre la première lecture d'état
          etatAttributs(nc);
        }
        reply(ev, rep);
        return;
      }
      if (!d.charId) return;
      if (d.type === "presence") {
        if (!lier(ev.source, d.charId, d.viewId)) return;
        presenceTraite(ev, d);
        return;
      }
      if (d.type === "has-sheet") {
        // perso injoignable (Campaign pas prêt, opener fermé...) : exists:null
        // (« Roll20 n'a pas répondu ») — surtout pas false, qui proposerait de
        // CRÉER une fiche par-dessus une fiche existante mais illisible.
        if (!getChar(d.charId)) {
          reply(ev, { type: "has-sheet-result", charId: d.charId, exists: null });
        } else {
          var a = readAll(d.charId);
          reply(ev, { type: "has-sheet-result", charId: d.charId, exists: !!a[PREFIX + "version"] });
        }
      } else if (d.type === "load") {
        // première demande de cette frame : elle se lie à ce personnage ; une
        // demande ultérieure pour un autre personnage est refusée (verrou 2).
        if (!lier(ev.source, d.charId, d.viewId)) return;
        // LA LISTE DES PRÉFIXES DU PLATEAU, envoyée par la page qui les écrit.
        // C'est elle qui rend le ménage possible : sans elle, aMoi() garde tout
        // et rien n'est jamais détruit. On ne retient que des chaînes commençant
        // par le préfixe général, pour qu'une page malveillante ne puisse pas
        // faire passer les attributs NATIFS de Roll20 pour les siens.
        if (d.menageGarde && d.menageGarde.length) {
          var g = [], gi;
          for (gi = 0; gi < d.menageGarde.length; gi++) {
            var gp = String(d.menageGarde[gi] || "");
            if (gp.length > 4 && gp.indexOf(PREFIX) === 0) g.push(gp);
          }
          if (g.length) menageGarde = g;
        }
        // perso injoignable : ne pas hydrater avec du vide (la fiche relance load
        // toutes les 500 ms, le Campaign peut arriver après nous)
        var chl = getChar(d.charId);
        if (!chl) return;
        // Comme Outward, une ouverture demande une lecture serveur fraîche.
        // Le pont diffuse ensuite un hydrate avec fresh:true ou fresh:false ;
        // aucune réponse d'erreur privée à JJK n'existe dans ce protocole.
        if (d.resync === true) {
          resynchronise(chl);
          return;
        }
        var lecture = readAll(d.charId);
        var omis = d.allege === true ? allege(lecture, ev.source, d.complet === true) : [];
        var rl = { type: "hydrate", charId: d.charId, attrs: lecture, omis: omis };
        // Contrat explicite entre la fiche servie par le site et le pont signé.
        // La fiche bloque son ouverture si la version installée ne sait pas
        // transporter Compact, confirmer les écritures ou relayer les sessions.
        rl.extension = extensionCapacites();
        // CE QUE VAUT CETTE LECTURE, dit avec elle. Seul le plateau est concerné :
        // pour tout autre personnage la fiche est ouverte, donc les attributs
        // chargés, et rien ne change. Le champ est neuf ; une page servie par un
        // site plus ancien l'ignore, comme la fiche l'ignore de toute façon.
        if (d.charId === narrId) {
          var e = etatAttributs(chl);
          rl.sur = e === "sur";
          if (e === "echec") rl.raison = "ouverture";
          // Le ménage attend que la lecture vaille vérité : sur une collection
          // que Roll20 n'a pas encore peuplée, tout paraîtrait absent.
          if (rl.sur) menagePlateau(chl);
          if (menageRapport) { rl.menage = menageRapport; menageRapport = null; }
          // « omis » a déjà été calculé pour la lecture commune ci-dessus.
          // CE PONT-CI SAIT ALLER RECHERCHER. Sa seule présence le dit, comme
          // « omis » dit qu'il sait alléger : devant un pont plus ancien, le
          // champ manque, et la page sait alors que sa demande de
          // resynchronisation n'a été entendue par personne — au lieu de croire
          // qu'elle voit les autres joueurs alors qu'elle relit sa propre copie.
          rl.resync = true;
          // Le relevé de la dernière écriture voyage avec la lecture : c'est le
          // seul moyen, sans compte Roll20, de savoir si le modèle a pris notre
          // valeur. Vidé une fois transmis, pour ne rien répéter.
          var _n; for (_n in dernieresEcritures) { if (dernieresEcritures.hasOwnProperty(_n)) { rl.ecrits = dernieresEcritures; break; } }
          dernieresEcritures = {};
        }
        reply(ev, rl);
      } else if (d.type === "save") {
        if (!liee(ev.source, d.charId)) return;
        enqueue(d.charId, d.attrs);
      }
    } catch (e) {}
  }, false);

  // La restauration arrive depuis le relais de l'extension par événement DOM.
  // Elle remplace un ÉTAT, pas seulement quelques valeurs : les journaux Compact
  // et les attributs JJK apparus après la sauvegarde doivent donc disparaître.
  // Les attributs jjk_narr_* restent indépendants et ne sont jamais touchés.
  document.addEventListener("jjk-backup-restore", function (ev) {
    var d; try { d = JSON.parse(ev.detail); } catch (e) { return; }
    var snap = d && d.snapshot || {}, c = campaign(), ch = snap.charId && getChar(snap.charId);
    var attrs = snap.attrs, allowed = {}, valid = !!(c && c.id && String(c.id) === String(snap.campaignId) && ch && attrs && typeof attrs === "object");
    if (valid) Object.keys(attrs).forEach(function (name) {
      if (!ecrivable(name) || !attrs[name] || typeof attrs[name] !== "object") { valid = false; return; }
      allowed[name] = { current: str(attrs[name].current), max: str(attrs[name].max) };
    });
    if (!valid || !(allowed[PREFIX + "state"] || allowed[PREFIX + "storage"]) || !allowed[PREFIX + "version"]) {
      document.dispatchEvent(new CustomEvent("jjk-backup-restore-result", { detail: JSON.stringify({ token: d && d.token, ok: false, error: "Sauvegarde incompatible avec ce personnage." }) }));
      return;
    }

    var id = String(snap.charId), started = Date.now(), fini = false, suppression = null;
    function frames(message) {
      for (var i = srcFrames.length - 1; i >= 0; i--) {
        if (srcIds[i] !== id) continue;
        try { srcFrames[i].postMessage(Object.assign({ ns: "jjk", charId: id }, message), "*"); } catch (e) {}
      }
    }
    function termine(ok, error) {
      if (fini) return;
      fini = true;
      frames({ type: "backup-restore-status", ok: ok, error: error || "" });
      document.dispatchEvent(new CustomEvent("jjk-backup-restore-result", { detail: JSON.stringify({ token: d.token, ok: ok, error: error || "" }) }));
    }
    function valeursLocalesConformes() {
      var got = readAll(id), keys = Object.keys(allowed);
      for (var i = 0; i < keys.length; i++) {
        var name = keys[i];
        if (!got[name] || str(got[name].current) !== allowed[name].current || str(got[name].max) !== allowed[name].max) return false;
      }
      return true;
    }
    function ecrituresConfirmees() {
      var keys = Object.keys(allowed);
      for (var i = 0; i < keys.length; i++) {
        var name = keys[i], r = dernieresEcritures[name];
        if (!r || r.serveur !== "accepte" || r.voulu !== allowed[name].current) return false;
      }
      return true;
    }
    function echecEcriture() {
      var keys = Object.keys(allowed);
      for (var i = 0; i < keys.length; i++) {
        var r = dernieresEcritures[keys[i]];
        if (r && r.serveur && r.serveur !== "accepte" && r.serveur !== "en-attente") return "Roll20 a refusé l’écriture de « " + keys[i] + " » (" + r.serveur + (r.detail ? " : " + r.detail : "") + ").";
      }
      return "";
    }
    function retireObsoletes() {
      // Une restauration plus ancienne ne doit pas rejouer des opérations
      // postérieures. Retirer tout attribut JJK absent de la sauvegarde rétablit
      // exactement son espace de stockage, sauf le plateau Narration qui est
      // volontairement indépendant du personnage.
      var ms = models(ch), morts = [];
      for (var i = 0; i < ms.length; i++) {
        var name = attrVal(ms[i], "name");
        if (ecrivable(name) && name.indexOf("jjk_narr_") !== 0 && !Object.prototype.hasOwnProperty.call(allowed, name))
          morts.push(ms[i]);
      }
      var index = 0;
      function suivant() {
        if (index >= morts.length) {
          resynchronise(ch);
          verifierFin();
          return;
        }
        var m = morts[index++], name = attrVal(m, "name");
        // Un autre cadre peut avoir déjà supprimé l'attribut : on ne recommence
        // jamais une suppression et on ne touche pas un nom restauré entre-temps.
        if (!encoreLa(ch, m) || Object.prototype.hasOwnProperty.call(allowed, name)) { suivant(); return; }
        detruit(m, suivant, function (raison) {
          termine(false, "La sauvegarde a été écrite, mais l'ancien attribut « " + name + " » n'a pas pu être retiré : " + raison + ". Rechargez la fiche après vérification des sauvegardes.");
        });
      }
      suivant();
    }
    function verifierFin() {
      if (!valeursLocalesConformes()) {
        if (Date.now() - started > 110000) { termine(false, "Roll20 n'a pas confirmé toutes les valeurs de la sauvegarde."); return; }
        setTimeout(verifierFin, 500); return;
      }
      // Les attributs obsolètes ont été détruits avec succès. Les valeurs restent
      // relues depuis la collection et le serveur a confirmé chaque écriture.
      var restants = models(ch).some(function (m) {
        var name = attrVal(m, "name");
        return ecrivable(name) && name.indexOf("jjk_narr_") !== 0 && !Object.prototype.hasOwnProperty.call(allowed, name);
      });
      if (restants) {
        if (Date.now() - started > 110000) { termine(false, "Certains anciens attributs JJK sont encore présents après restauration."); return; }
        setTimeout(verifierFin, 500); return;
      }
      termine(true, "");
    }
    function verifierEcritures() {
      if (fini) return;
      var refus = echecEcriture();
      if (refus) { termine(false, refus + " Une sauvegarde antérieure reste disponible dans l’extension."); return; }
      if (valeursLocalesConformes() && ecrituresConfirmees()) { retireObsoletes(); return; }
      if (Date.now() - started > 110000) { termine(false, "Roll20 n'a pas confirmé toutes les écritures de restauration. Une sauvegarde antérieure reste disponible."); return; }
      setTimeout(verifierEcritures, 500);
    }

    // Les cadres ouverts sont gelés avant la première écriture : leurs sessions
    // ne doivent pas republier leurs opérations locales pendant la restauration.
    frames({ type: "backup-restore-start" });
    dernieresEcritures = {};
    enqueue(id, allowed);
    verifierEcritures();
  }, false);
})();
