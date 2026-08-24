  var compBox = null;
  var compFilter = "";
  var compChamp = "";           // "" = tous les champs
  var compOnly = COMPACT;       // fiche condensée (Roll20) : investies seulement par défaut
  // décoché : seules les compétences de base du jeu (listes des règles) sont
  // affichées ; coché : les compétences personnalisées s'y ajoutent
  var compPerso = true;
  var compPersoChip = null;     // la puce, rallumée quand on ajoute une comp perso
  // mêmes filtres pour les modules Armes et Langues (réglages de VUE : ils
  // survivent au remontage de la fiche, comme ceux des compétences)
  var armesPerso = true;
  var armesOnly = COMPACT;
  var armesFilter = "";
  var languesPerso = true;
  var languesOnly = false;
  var languesFilter = "";
  // Les deux outils de filtre se coupent depuis l'onglet Options. Coupés, ils
  // DISPARAISSENT et cessent d'agir : un filtre invisible qui masque encore
  // des lignes est un piège. Réglage d'AFFICHAGE, donc dans le vrai
  // localStorage du navigateur, jamais dans le personnage.
  var FILTRES = { texte: "mia-filtre-texte", champ: "mia-filtre-champ" };
  function filtreTexteOn() { return lpref(FILTRES.texte, "1") !== "0"; }
  function filtreChampOn() { return lpref(FILTRES.champ, "1") !== "0"; }
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
  function compInvestie(it) {
    // Un modificateur non nul compte autant que des points : sinon
    // « Investies seulement » cacherait la compétence qu'on vient justement de
    // régler.
    return (state.comps[it.key] || 0) > 0 ||
           (state.compsMod[it.key] || 0) !== 0 ||
           (state.compsMod2[it.key] || 0) !== 0 ||
           state.compsForce[it.key] !== undefined ||
           state.compsXpForce[it.key] !== undefined ||
           (state.compsXpMod[it.key] || 0) !== 0 ||
           (state.compsXpMod2[it.key] || 0) !== 0;
  }
  // Une spécialité est « investie » dès qu'elle porte un point ou un réglage :
  // son existence seule ne suffit pas, le joueur venant peut-être de l'ajouter.
  function speInvestie(spe) {
    if (!spe) return false;
    return (spe.pts || 0) > 0 || (spe.mod || 0) !== 0 || (spe.mod2 || 0) !== 0 ||
           spe.force !== null || spe.xpForce !== null;
  }
