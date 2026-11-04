  // ---------- stockage Compact : validation, activation et ménage ----------
  // Une photographie n'est « active » qu'après sa relecture intégrale côté
  // Roll20. La phase staging est volontaire : elle interdit les journaux avant
  // que tous les blocs aient été écrits et vérifiés.
  var stockageFraiche = {}, stockageNettoyage = {}, stockageRapports = {}, stockageActivation = {}, stockageSauvegardes = {}, stockageVues = Object.create(null), stockageEnAttente = Object.create(null);
  function stockageAcces(ch) {
    if (!ch) return false;
    var d = droits(ch), ids = String(d.controlledby || '').split(',').map(function (v) { return v.trim(); });
    return d.gm === true || ids.indexOf('all') >= 0 || (!!d.moi && ids.indexOf(d.moi) >= 0);
  }
  function stockageHash(s) {
    s = String(s); var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16);
  }
  function stockageStable(v) {
    if (Array.isArray(v)) return '[' + v.map(stockageStable).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(function (k) {
      return JSON.stringify(k) + ':' + stockageStable(v[k]);
    }).join(',') + '}';
    return JSON.stringify(v);
  }
  function stockageConfig(kind) {
    return kind === 'narration'
      ? { meta: 'jjk_narr_storage', block: 'jjk_narr_block_', stack: 'jjk_narr_stack_', ops: 'jjk_narr_ops_' }
      : { meta: 'jjk_storage', block: 'jjk_block_', stack: 'jjk_stack_', ops: 'jjk_ops_' };
  }
  function stockageMeta(attrs, kind) {
    var cfg = stockageConfig(kind), raw = attrs && attrs[cfg.meta];
    if (!raw || typeof raw.current !== 'string' || !raw.current) return null;
    var meta = JSON.parse(raw.current);
    if (!meta || meta.format !== 2 || typeof meta.epoch !== 'string' || !meta.epoch ||
        ['staging', 'ready'].indexOf(meta.phase) < 0 ||
        !meta.blocks || typeof meta.blocks !== 'object' || Array.isArray(meta.blocks))
      throw new Error('Manifeste Compact invalide.');
    Object.keys(meta.blocks).forEach(function (name) {
      if (name.indexOf(cfg.block) !== 0 && name.indexOf(cfg.stack) !== 0)
        throw new Error('Nom de bloc Compact non autorisé : ' + name);
      if (name.indexOf('__proto__') >= 0 || name.indexOf('constructor') >= 0 ||
          typeof meta.blocks[name] !== 'string')
        throw new Error('Nom ou empreinte de bloc Compact réservé.');
      var box = attrs[name];
      if (!box || typeof box.current !== 'string' || stockageHash(box.current) !== meta.blocks[name])
        throw new Error('Bloc Compact absent ou invalide : ' + name);
    });
    if (meta.names && typeof meta.names === 'object') Object.keys(meta.names).forEach(function (logical) {
      var physical = meta.names[logical];
      if (typeof logical !== 'string' || typeof physical !== 'string' ||
          (logical.indexOf(cfg.block) !== 0 && logical.indexOf(cfg.stack) !== 0) ||
          (physical.indexOf(cfg.block) !== 0 && physical.indexOf(cfg.stack) !== 0) ||
          physical.indexOf('__proto__') >= 0 || physical.indexOf('constructor') >= 0 ||
          !Object.prototype.hasOwnProperty.call(meta.blocks, physical))
        throw new Error('Référence de bloc Compact invalide.');
    });
    return meta;
  }
  function stockageFraichePour(ch) {
    var f = ch && stockageFraiche[ch.id];
    return f && Date.now() - f.at <= 15000 ? f : null;
  }
  function stockageTravailEnCours(ch) {
    return !!(ch && ((activeJob && activeJob.id === ch.id) || queue.some(function (job) { return job.id === ch.id; })));
  }
  function stockageActiver(ch, kind) {
    var f = stockageFraichePour(ch);
    if (!f) return { status: 'pending', stage: 'confirmation' };
    var cfg = stockageConfig(kind), meta = stockageMeta(f.attrs, kind);
    if (!meta) return { status: 'absent' };
    if (meta.phase === 'ready') return { status: 'ready' };
    var key = ch.id + ':' + kind, now = Date.now();
    if (stockageActivation[key] && now - stockageActivation[key] < 6000)
      return { status: 'pending', stage: 'writing' };
    if (stockageTravailEnCours(ch))
      return { status: 'pending', stage: 'writing' };
    // L'écriture du marqueur ne part qu'après vérification de CHAQUE bloc.
    // Le verrou court évite que plusieurs vues n'empilent le même marqueur.
    stockageActivation[key] = now;
    meta.phase = 'ready';
    var attrs = {}; attrs[cfg.meta] = { current: JSON.stringify(meta), max: '' };
    enqueue(ch.id, attrs);
    return { status: 'activating' };
  }
  function stockageClePending(kind, epoch, id) { return JSON.stringify([kind, epoch, String(id)]); }
  function stockageBucketPending(ch) {
    return stockageEnAttente[ch.id] || (stockageEnAttente[ch.id] = { ops: Object.create(null), payloads: Object.create(null) });
  }
  function stockageOperationsEnAttente(ch, kind, epoch) {
    var bucket = ch && stockageEnAttente[ch.id], ops = Object.create(null), payloads = Object.create(null);
    if (!bucket) return { ops: ops, payloads: payloads };
    Object.keys(bucket.ops).forEach(function (key) {
      var item = bucket.ops[key];
      if (item.kind === kind && item.epoch === epoch) ops[item.id] = item.op;
    });
    Object.keys(bucket.payloads).forEach(function (key) {
      var item = bucket.payloads[key];
      if (item.kind === kind && item.epoch === epoch) payloads[item.name] = item.current;
    });
    return { ops: ops, payloads: payloads };
  }
  function stockageTravailContient(ch, item, isPayload) {
    var jobs = [];
    if (activeJob) jobs.push(activeJob);
    queue.forEach(function (job) { jobs.push(job); });
    var cfg = stockageConfig(item.kind), prefix = cfg.ops;
    for (var i = 0; i < jobs.length; i++) {
      var job = jobs[i];
      if (job.id !== ch.id) continue;
      var attrs = job.attrs || {};
      if (isPayload) {
        if (attrs[item.name] && String(attrs[item.name].current || '') === item.current) return true;
      } else {
        var names = Object.keys(attrs);
        for (var j = 0; j < names.length; j++) {
          if (names[j].indexOf(prefix) !== 0) continue;
          try {
            var box = JSON.parse(attrs[names[j]].current || '{}');
            if (box.epoch === item.epoch && Array.isArray(box.ops) && box.ops.some(function (op) {
              return op.id === item.id && stockageStable(op) === stockageStable(item.op);
            })) return true;
          } catch (e) {}
        }
      }
    }
    return false;
  }
  // Après une relecture fraîche, les opérations présentes sont confirmées.
  // Celles absentes ne sont libérées que si aucune écriture n'est encore en vol.
  function stockageConfirme(ch, attrs) {
    if (!ch || !attrs) return;
    var bucket = stockageEnAttente[ch.id];
    if (!bucket) return;
    var metas = {};
    ['fiche', 'narration'].forEach(function (kind) {
      var cfg = stockageConfig(kind), meta = null;
      try { meta = stockageMeta(attrs, kind); } catch (e) {}
      if (!meta) return;
      metas[kind] = meta.epoch;
      var found = Object.create(null);
      Object.keys(attrs).forEach(function (name) {
        if (name.indexOf(cfg.ops) !== 0) return;
        try {
          var box = JSON.parse(attrs[name].current || '{}');
          if (box.format !== 2 || box.epoch !== meta.epoch || !Array.isArray(box.ops)) return;
          box.ops.forEach(function (op) { if (op && typeof op.id === 'string') found[op.id] = op; });
        } catch (e) {}
      });
      Object.keys(bucket.ops).forEach(function (key) {
        var item = bucket.ops[key];
        if (item.kind !== kind || item.epoch !== meta.epoch) return;
        if (found[item.id] && stockageStable(found[item.id]) === stockageStable(item.op)) delete bucket.ops[key];
        else if (!stockageTravailContient(ch, item, false)) delete bucket.ops[key];
      });
      Object.keys(bucket.payloads).forEach(function (key) {
        var item = bucket.payloads[key];
        if (item.kind !== kind || item.epoch !== meta.epoch) return;
        if (attrs[item.name] && String(attrs[item.name].current || '') === item.current) delete bucket.payloads[key];
        else if (!stockageTravailContient(ch, item, true)) delete bucket.payloads[key];
      });
    });
    // Une époque qui a changé invalide les références pending de l'ancienne.
    ['ops', 'payloads'].forEach(function (type) {
      Object.keys(bucket[type]).forEach(function (key) {
        var item = bucket[type][key];
        if (metas[item.kind] && metas[item.kind] !== item.epoch && !stockageTravailContient(ch, item, type === 'payloads')) delete bucket[type][key];
      });
    });
    if (!Object.keys(bucket.ops).length && !Object.keys(bucket.payloads).length) delete stockageEnAttente[ch.id];
  }
  // Chaque fenêtre possède une session Compact. Les opérations en attente sont
  // suivies globalement au personnage : deux fenêtres ne peuvent donc pas
  // réutiliser un même ID avec un contenu différent avant la relecture Roll20.
  function stockageSuitVue(ch, viewId, sessionId, kind, epoch, ops, payloads) {
    if (!ch || !viewId || !sessionId || !epoch) return;
    var genre = kind === 'narration' ? 'narration' : 'fiche';
    var parVue = stockageVues[ch.id] || (stockageVues[ch.id] = Object.create(null));
    var vue = parVue[viewId], bucket = stockageBucketPending(ch);
    if (vue && (vue.session !== sessionId || vue.kind !== genre || vue.epoch !== epoch))
      throw new Error('Une vue a changé de session Compact sans se recharger.');
    // Prévalidation complète avant toute mutation : un lot rejeté ne doit pas
    // laisser de référence fantôme ni de moitié de session dans le pont.
    (ops || []).forEach(function (op) {
      if (!op || typeof op.id !== 'string') throw new Error('Opération Compact sans identifiant.');
      var pending = bucket.ops[stockageClePending(genre, epoch, op.id)];
      if (pending && stockageStable(pending.op) !== stockageStable(op))
        throw new Error('Identifiant d’opération en attente réutilisé avec un contenu différent : ' + op.id);
    });
    Object.keys(payloads || {}).forEach(function (name) {
      var value = payloads[name], current = value && typeof value.current === 'string' ? value.current : String(value || '');
      var pending = bucket.payloads[stockageClePending(genre, epoch, name)];
      if (pending && pending.current !== current)
        throw new Error('Bloc Compact en attente réutilisé avec un contenu différent : ' + name);
    });
    if (!vue) vue = parVue[viewId] = { session: sessionId, kind: genre, epoch: epoch, ops: Object.create(null), payloads: Object.create(null) };
    (ops || []).forEach(function (op) {
      vue.ops[op.id] = op;
      var key = stockageClePending(genre, epoch, op.id), pending = bucket.ops[key];
      if (!pending) pending = bucket.ops[key] = { kind: genre, epoch: epoch, id: op.id, op: op, refs: Object.create(null) };
      pending.refs[viewId] = true;
    });
    Object.keys(payloads || {}).forEach(function (name) {
      var value = payloads[name], current = value && typeof value.current === 'string' ? value.current : String(value || '');
      vue.payloads[name] = current;
      var key = stockageClePending(genre, epoch, name), pending = bucket.payloads[key];
      if (!pending) pending = bucket.payloads[key] = { kind: genre, epoch: epoch, name: name, current: current, refs: Object.create(null) };
      pending.refs[viewId] = true;
    });
  }
  function stockageLibereVue(ch, viewId) {
    if (!ch || !viewId) return { status: 'absent' };
    var parVue = stockageVues[ch.id] || {}, vue = parVue[viewId];
    if (!vue) return { status: 'absent' };
    delete parVue[viewId];
    var autresOps = Object.create(null), autresPayloads = Object.create(null);
    Object.keys(parVue).forEach(function (id) {
      Object.keys(parVue[id].ops || {}).forEach(function (op) { autresOps[op] = true; });
      Object.keys(parVue[id].payloads || {}).forEach(function (name) { autresPayloads[name] = true; });
    });
    var fresh = stockageFraichePour(ch), attrs = fresh ? fresh.attrs : readAll(ch.id);
    var cfg = stockageConfig(vue.kind), prefix = cfg.ops, annules = 0;
    // Un job sorti de la file est déjà en cours : il reste suivi jusqu'à sa
    // confirmation distante. Les jobs non commencés peuvent être annulés.
    queue.forEach(function (job) {
      if (job.id !== ch.id) return;
      Object.keys(job.attrs || {}).forEach(function (name) {
        if (name.indexOf(prefix) === 0 && !attrs[name]) {
          try {
            var box = JSON.parse(job.attrs[name].current || '{}');
            var owned = (box.ops || []).some(function (op) { return !!vue.ops[op.id]; });
            var shared = (box.ops || []).some(function (op) { return !!autresOps[op.id]; });
            // Si un lot contient aussi une opération encore référencée par une
            // autre vue, on conserve le lot entier : journal immuable, pas de
            // réécriture d'un contenu sous un nom dérivé de l'ancien hash.
            if (owned && !shared) { delete job.attrs[name]; annules++; }
          } catch (e) { /* un job illisible ne se supprime jamais */ }
        } else if (Object.prototype.hasOwnProperty.call(vue.payloads, name) && !autresPayloads[name] && !attrs[name]) {
          delete job.attrs[name]; annules++;
        }
      });
    });
    for (var i = queue.length - 1; i >= 0; i--) {
      if (queue[i].id === ch.id && !Object.keys(queue[i].attrs || {}).length) queue.splice(i, 1);
    }
    var bucket = stockageEnAttente[ch.id];
    if (bucket) {
      Object.keys(bucket.ops).forEach(function (key) {
        var item = bucket.ops[key];
        delete item.refs[viewId];
        if (!Object.keys(item.refs).length && !stockageTravailContient(ch, item, false)) delete bucket.ops[key];
      });
      Object.keys(bucket.payloads).forEach(function (key) {
        var item = bucket.payloads[key];
        delete item.refs[viewId];
        if (!Object.keys(item.refs).length && !stockageTravailContient(ch, item, true)) delete bucket.payloads[key];
      });
      if (!Object.keys(bucket.ops).length && !Object.keys(bucket.payloads).length) delete stockageEnAttente[ch.id];
    }
    if (!Object.keys(parVue).length) delete stockageVues[ch.id];
    return { status: 'done', cancelled: annules };
  }

  var STOCKAGE_LEGACY = [
    'jjk_nom','jjk_espece','jjk_age','jjk_sexe','jjk_genre','jjk_portrait',
    'jjk_defaut','jjk_background','jjk_notes','jjk_inventaire','jjk_de','jjk_xp_total',
    'jjk_narration','jjk_pv_max_force','jjk_vitesse_force','jjk_regen_force','jjk_langue_base',
    'jjk_pts_crea_mod','jjk_pts_crea_force','jjk_sans_limite','jjk_release',
    'jjk_qualites','jjk_avantages','jjk_caracs_base','jjk_caracs_xp','jjk_caracs_mod',
    'jjk_caracs_mod2','jjk_caracs_force','jjk_caracs_xp_force','jjk_caracs_xp_mod',
    'jjk_caracs_xp_mod2','jjk_caracs_plafond_mod','jjk_caracs_plafond_force',
    'jjk_comps_mod','jjk_comps_mod2','jjk_comps_force','jjk_comps_xp_force',
    'jjk_comps_xp_mod','jjk_comps_xp_mod2','jjk_competences','jjk_comp_perso',
    'jjk_langues','jjk_armes_comps','jjk_armes','jjk_armures','jjk_inventaire_sys',
    'jjk_divers','jjk_modules','jjk_mod_donnees','jjk_mod_actifs','jjk_mods',
    'jjk_grenier','jjk_v_hist','jjk_notes_journal','jjk_etat_courant'
  ];
  // Les jjk_narr_bg_<id> sont volontairement absents : ce sont de gros fonds
  // autonomes, toujours lus directement par Narration et jamais compactés.
  // Seule la configuration et les anciens jetons migrés sont nettoyés.
  function stockageAncien(name, kind) {
    if (kind === 'narration') return name === 'jjk_narr_conf' || name.indexOf('jjk_narr_pt_') === 0;
    return STOCKAGE_LEGACY.indexOf(name) >= 0;
  }
  function stockageNettoie(ch, kind) {
    var f = stockageFraichePour(ch), cfg = stockageConfig(kind), meta, report;
    function dit(r) { stockageRapports[ch.id + ':' + kind] = r; return r; }
    if (!f) return dit({ status: 'pending', stage: 'confirmation' });
    if (stockageNettoyage[ch.id + ':' + kind]) return dit({ status: 'pending', stage: 'deleting' });
    if (stockageTravailEnCours(ch))
      return dit({ status: 'pending', stage: 'writing' });
    try { meta = stockageMeta(f.attrs, kind); }
    catch (e) { return dit({ status: 'error', error: String(e.message || e) }); }
    if (!meta || meta.phase !== 'ready') return dit({ status: 'pending', stage: 'migration' });
    // Les miroirs historiques ne sont supprimés qu'après confirmation d'une
    // photographie locale réellement écrite dans IndexedDB par l'extension.
    // jjk_state, lui, reste conservé comme dernier recours de récupération.
    var backup = stockageSauvegardes[ch.id];
    if (!backup || backup[kind] !== meta.epoch)
      return dit({ status: 'pending', stage: 'backup' });

    // Un payload créé par une opération reste vivant tant qu'un journal le cite.
    var retenus = {}, morts = [], ms = models(ch), i;
    Object.keys(f.attrs).forEach(function (name) {
      if (name.indexOf(cfg.ops) !== 0) return;
      try {
        var box = JSON.parse(f.attrs[name].current || '{}');
        if (box.epoch !== meta.epoch || !Array.isArray(box.ops)) return;
        box.ops.forEach(function (op) {
          ['creates','modules'].forEach(function (prop) {
            Object.keys(op && op[prop] || {}).forEach(function (id) {
              var spec = op[prop][id]; if (spec && typeof spec.attribute === 'string') retenus[spec.attribute] = true;
            });
          });
        });
      } catch (e) {}
    });
    for (i = 0; i < ms.length; i++) {
      var m = ms[i], name = attrVal(m, 'name');
      if (typeof name !== 'string') continue;
      var legacy = stockageAncien(name, kind), ancienJournal = false;
      // Les journaux d'une ancienne époque ne peuvent plus contribuer à la
      // photographie active. Ils ne sont supprimés qu'après la sauvegarde
      // IndexedDB de la nouvelle époque ; un journal illisible reste intact.
      if (name.indexOf(cfg.ops) === 0) {
        try {
          var ancien = JSON.parse(str(attrVal(m, 'current')) || '{}');
          ancienJournal = ancien && ancien.format === 2 && typeof ancien.epoch === 'string' &&
            ancien.epoch !== meta.epoch && Array.isArray(ancien.ops);
        } catch (eJournal) {}
      }
      var orphan = (name.indexOf(cfg.block) === 0 || name.indexOf(cfg.stack) === 0) &&
        !Object.prototype.hasOwnProperty.call(meta.blocks, name) && !retenus[name];
      if (legacy || ancienJournal || orphan) morts.push({ model: m, name: name });
    }
    if (!morts.length) return dit({ status: 'done', remaining: 0 });

    stockageNettoyage[ch.id + ':' + kind] = true;
    var index = 0, supprimes = 0, started = Date.now();
    function fin(r) { delete stockageNettoyage[ch.id + ':' + kind]; dit(r); }
    function suivant() {
      if (index >= morts.length) { fin({ status: 'done', remaining: 0, removed: supprimes }); return; }
      if (Date.now() - started > 110000) { fin({ status: 'error', error: 'Nettoyage interrompu : délai de sécurité dépassé.', remaining: morts.length - index }); return; }
      var item = morts[index++], actuel = readAll(ch.id), mf;
      try { mf = stockageMeta(actuel, kind); } catch (e) { fin({ status: 'error', error: String(e.message || e) }); return; }
      // La photographie et le manifeste doivent être identiques à ceux que
      // nous avons validés. Si un joueur a écrit depuis, on s'arrête sans rien
      // supprimer de plus : la prochaine lecture repartira d'un état frais.
      if (!mf || mf.phase !== 'ready' || mf.epoch !== meta.epoch ||
          stockageStable(actuel[cfg.meta]) !== stockageStable(f.attrs[cfg.meta])) {
        fin({ status: 'pending', stage: 'changed' }); return;
      }
      if (!encoreLa(ch, item.model)) { setTimeout(suivant, WRITE_DELAY); return; }
      var observed = actuel[item.name], snap = f.attrs[item.name];
      if (!observed || !snap || str(observed.current) !== str(snap.current) || str(observed.max) !== str(snap.max)) {
        setTimeout(suivant, WRITE_DELAY); return;
      }
      detruit(item.model, function () { supprimes++; setTimeout(suivant, WRITE_DELAY); }, function (why) {
        fin({ status: 'error', error: 'Suppression refusée pour ' + item.name + ' : ' + why, remaining: morts.length - index });
      });
    }
    setTimeout(suivant, WRITE_DELAY);
    return dit({ status: 'pending', stage: 'deleting', remaining: morts.length });
  }
