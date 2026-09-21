  // ---- climat ----
  // La zone de confort du personnage HABILLÉ : les deux bornes du corps nu
  // viennent des règles (owd-creation.json), les degrés de protection de ce
  // qu'il porte. Les bornes nues ne sont jamais montrées seules : ce serait une
  // règle affichée.
  function protection(champ) {
    var t = 0;
    state.vetements.forEach(function (v) { if (v.porte) t += snum(v[champ]); });
    return Math.round(t * 10) / 10;
  }
  function confort() {
    var c = climatDef();
    if (c.nuBas === undefined || c.nuHaut === undefined) return null;
    return { bas: snum(c.nuBas) - protection("froid"), haut: snum(c.nuHaut) + protection("chaud") };
  }

