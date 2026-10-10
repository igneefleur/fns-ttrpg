  // Inventaire du plateau : aucun attribut n'est supprimé ou fusionné ici.
  // writeOne met à jour tous les homonymes, comme le pont MIA original.
  var menageFait = false;
  var menageRapport = null;
  function menagePlateau(ch) {
    if (menageFait || !ch || !narrId || ch.id !== narrId) return;
    menageFait = true;
    var rap = { trouves: 0, etrangers: 0, doublons: 0, retires: 0 }, vus = {};
    models(ch).forEach(function (m) {
      var n = attrVal(m, "name");
      if (typeof n !== "string" || n.indexOf("mia_narr_") !== 0) return;
      rap.trouves++;
      if (vus[n]) rap.doublons++;
      vus[n] = true;
    });
    menageRapport = rap;
  }
