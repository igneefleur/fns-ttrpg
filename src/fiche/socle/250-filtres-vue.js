  var compBox = null;
  // LE FILTRE EST CELUI DES SPÉCIALITÉS, et de nulle part ailleurs. Les huit
  // compétences sont toujours toutes là et tiennent à l'écran : les filtrer ne
  // cache rien qu'on cherchait. Les spécialités, elles, sont une liste ouverte
  // que le joueur remplit lui-même — c'est la seule de la fiche qui puisse
  // devenir assez longue pour qu'on s'y perde.
  //
  // Réglage de VUE : il survit au remontage de la fiche, et ne voyage pas avec
  // le personnage.
  var speFilter = "";
  // Le filtre se coupe depuis l'onglet Options. Coupé, il DISPARAÎT et cesse
  // d'agir : un filtre invisible qui masque encore des lignes est un piège.
  // Réglage d'AFFICHAGE, donc dans le vrai localStorage du navigateur, jamais
  // dans le personnage.
  var FILTRES = { texte: "mia-filtre-texte" };
  function filtreTexteOn() { return lpref(FILTRES.texte, "1") !== "0"; }
  // champ de filtre d'un module ; rend null quand le réglage le coupe, et le
  // texte est alors ignoré par les listes (voir filtreDe)
  function champFiltre(get, set, placeholder, onChange) {
    if (!filtreTexteOn()) return null;
    var s = el("input", "pc-comp-search");
    s.type = "search";
    s.placeholder = placeholder || "Filtrer…";
    s.value = get();   // le filtre survit au remontage : le champ doit le montrer
    s.addEventListener("input", function () { set(s.value); onChange(); });
    return s;
  }
  function filtreDe(v) { return filtreTexteOn() ? String(v || "").trim().toLowerCase() : ""; }
