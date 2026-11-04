  var queue = [], busy = false, activeJob = null;

  // Même file que la fiche Outward : un seul attribut par passage, les lots
  // encore en attente sont regroupés par personnage et les données Compact
  // passent avant les attributs secondaires.
  function priorite(name) {
    if (name.indexOf("jjk_block_") === 0 || name.indexOf("jjk_stack_") === 0 ||
        name.indexOf("jjk_narr_block_") === 0 || name.indexOf("jjk_narr_stack_") === 0 ||
        name === "jjk_legacy_base" || name === "jjk_aux_legacy_base") return 0;
    if (name.indexOf("jjk_ops_") === 0 || name.indexOf("jjk_narr_ops_") === 0 ||
        name.indexOf("jjk_legacy_p_") === 0 || name.indexOf("jjk_aux_legacy_p_") === 0) return 1;
    if (name === "jjk_storage" || name === "jjk_narr_storage") return 2;
    return 2;
  }

  // Le filtre de préfixe s'applique À L'ENTRÉE : ce qui n'est pas à nous
  // n'entre même pas dans la file (rien à réexaminer, rien à jeter en route).
  function enqueue(id, attrs) {
    var src = attrs || {}, garde = {};
    Object.keys(src).forEach(function (n) { if (ecrivable(n)) garde[n] = src[n]; });
    // Coalescer les lots EN ATTENTE : une ancienne photographie de macro ne
    // doit pas empiler des dizaines de lots derrière une frappe récente.
    var attente = null;
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].id === id) { attente = queue[i]; break; }
    }
    if (attente) Object.keys(garde).forEach(function (n) { attente.attrs[n] = garde[n]; });
    else if (Object.keys(garde).length) queue.push({ id: id, attrs: garde, tries: 0 });
    pump();
  }

  function pump() {
    if (busy) return;
    // Même arbitrage qu'Outward : dès qu'un lot contient un bloc ou un journal,
    // il passe avant les attributs ordinaires. À l'intérieur du lot, les noms
    // sont triés selon la même priorité.
    var choisi = 0;
    for (var j = 0; j < queue.length; j++) {
      if (Object.keys(queue[j].attrs || {}).some(function (n) { return priorite(n) < 2; })) {
        choisi = j;
        break;
      }
    }
    var job = queue.splice(choisi, 1)[0];
    if (!job) return;
    busy = true;
    activeJob = job;
    var ch = getChar(job.id);
    // Deux raisons d'attendre, une seule conduite. Campaign injoignable ou
    // personnage pas encore chargé : on réessaie au lieu de perdre le lot.
    // Le contrôle d'état ne vise QUE Narration ; une fiche est ouverte depuis
    // un dialogue déjà chargé, comme dans le pont d'origine.
    if (!ch || (job.id && job.id === narrId && etatAttributs(ch) !== "sur")) {
      busy = false;
      activeJob = null;
      if (++job.tries <= 60) { queue.unshift(job); setTimeout(pump, 1000); }
      return;
    }
    var names = Object.keys(job.attrs).sort(function (a, b) { return priorite(a) - priorite(b); });
    var name = names[0];
    if (!name) {
      busy = false;
      activeJob = null;
      setTimeout(pump, 0);
      return;
    }
    var value = job.attrs[name];
    delete job.attrs[name];
    // Réinsérer le reste AVANT l'attente : enqueue() peut alors remplacer les
    // valeurs encore périmées au lieu de les laisser s'empiler.
    if (Object.keys(job.attrs).length) queue.unshift(job);
    // activeJob ne représente que l'attribut actuellement en cours. Le suivi
    // des vues Compact peut donc distinguer une écriture commencée du reste.
    activeJob = { id: job.id, attrs: {} };
    activeJob.attrs[name] = value;
    try { writeOne(ch, name, value); } catch (e) {}
    // Pas de render Roll20 : la persistance passe par Firebase.
    setTimeout(function () {
      busy = false;
      activeJob = null;
      pump();
    }, WRITE_DELAY);
  }
