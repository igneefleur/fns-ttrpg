  var queue = [], busy = false;
  // Le filtre de préfixe s'applique À L'ENTRÉE : ce qui n'est pas à nous
  // n'entre même pas dans la file (rien à réexaminer, rien à jeter en route).
  function enqueue(id, attrs) {
    var src = attrs || {}, garde = {};
    Object.keys(src).forEach(function (n) { if (ecrivable(n)) garde[n] = src[n]; });
    queue.push({ id: id, attrs: garde, tries: 0 });
    pump();
  }
  function pump() {
    if (busy) return;
    var job = queue.shift();
    if (!job) return;
    busy = true;
    var ch = getChar(job.id);
    // Campaign injoignable (opener du popout en cours de rechargement…) : on
    // RE-TENTE au lieu de jeter, la fiche ayant déjà avancé sa base de diff, si
    // bien qu'une écriture jetée serait définitivement perdue. ~1 min de patience.
    //
    // Il y avait ici un SECOND motif d'attente, le personnage du plateau dont les
    // attributs n'étaient pas encore chargés. Il est parti avec le plateau : une
    // fiche, elle, n'est ouverte que depuis un dialogue déjà ouvert, donc déjà
    // peuplé, et rien ne doit changer pour elle.
    if (!ch) {
      busy = false;
      if (++job.tries <= 60) { queue.unshift(job); setTimeout(pump, 1000); }
      return;
    }
    var names = Object.keys(job.attrs), i = 0;
    function step() {
      if (!ch || i >= names.length) {
        // PAS de ch.view.render() ici : re-render déclencherait la mise à jour de fiche
        // de Roll20 (celle qui plante). Les attributs sont persistés via Firebase ;
        // l'onglet Attributes se met à jour de lui-même (au pire à la réouverture).
        busy = false;
        setTimeout(pump, 0);
        return;
      }
      var name = names[i++];
      try { writeOne(ch, name, job.attrs[name]); } catch (e) {}
      setTimeout(step, WRITE_DELAY);   // throttle
    }
    step();
  }

