  // Transfert entre les inventaires contrôlés : le destinataire est confirmé
  // avant le retrait source. Les refs déterministes rendent la reprise idempotente.
  function objetsTransfert(ref) {
    return {items:window.OwdInventoryData.group(state.inv, ref),competences:window.OwdInventoryData.copy(state.comps)};
  }
  function importeTransfert(job) {
    var D = window.OwdInventoryData, items = state.inv.objets;
    if (D.committed(state, job)) return true;
    job.dest.forEach(function (it) {
      var old = items.filter(function (o) { return o.ref === it.ref; })[0];
      if (old) { Object.keys(old).forEach(function (k) { delete old[k]; }); Object.assign(old, D.copy(it)); }
      else items.push(D.copy(it));
    });
    save(); remount(); return true;
  }
  function confirmeTransfert(job) {
    state.inv.transferts = state.inv.transferts || {};
    state.inv.transferts[job.id] = true;
    save(); return true;
  }
  function retireTransfert(job) {
    var D = window.OwdInventoryData, items = state.inv.objets;
    // Un objet retouché pendant le transfert ne doit pas être supprimé.
    job.items.forEach(function (expected) {
      var current = items.filter(function (o) { return o.ref === expected.ref; })[0];
      if (current && D.stable(current) !== D.stable(expected)) throw new Error('L’objet a été modifié pendant le transfert. Le retrait reste en attente.');
    });
    var ids = job.items.map(function (x) { return x.ref; });
    for (var i = items.length - 1; i >= 0; i--) if (ids.indexOf(items[i].ref) >= 0) items.splice(i, 1);
    invSelectionLocale = ''; save(); remount(); return true;
  }
  function annuleTransfert(job) {
    var D=window.OwdInventoryData,items=state.inv.objets;
    job.dest.forEach(function(expected){var current=items.filter(function(o){return o.ref===expected.ref;})[0];if(current&&D.stable(current)!==D.stable(expected))throw new Error('L’objet reçu a été modifié : annulation automatique impossible.');});
    var ids=job.dest.map(function(x){return x.ref;});
    for(var i=items.length-1;i>=0;i--)if(ids.indexOf(items[i].ref)>=0)items.splice(i,1);
    state.inv.transferts=state.inv.transferts||{};state.inv.transferts[job.id]=true;
    save();remount();return true;
  }
  function prepareTransfert(job) {
    var D=window.OwdInventoryData,future=D.copy(state),dest=D.copy(job.dest);
    // Les IDs de compétences appartiennent au personnage. On retrouve la même
    // compétence chez le destinataire par son nom et son groupe, sinon aucun lien.
    dest.forEach(function(it){if(!it.arme||!it.arme.comp)return;var original=(job.competences||[]).filter(function(c){return c.id===it.arme.comp;})[0];var matches=original?state.comps.filter(function(c){return c.nom===original.nom&&c.groupe===original.groupe;}):[];it.arme.comp=matches.length===1?matches[0].id:'';});
    future.inv.objets=future.inv.objets.concat(dest);future=normalize(future);
    return dest.map(function(it){return future.inv.objets.filter(function(o){return o.ref===it.ref;})[0];});
  }
