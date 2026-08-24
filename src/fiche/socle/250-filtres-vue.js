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
    var c = state.comps[it.key];
    // l'art compte : une compétence redescendue qui garde son art reste
    // visible ; un modificateur (Options) non nul aussi (sinon « Investies
    // seulement » cache une valeur pourtant modifiée)
    return !!(c && (c.stade > 0 || (c.techniques && c.techniques.length) || porteArt(c))) ||
           (state.compsMod[it.key] || 0) !== 0 ||
           (state.compsMod2[it.key] || 0) !== 0 ||
           // un total ou un coût forcé compte aussi : sinon « Investies »
           // cacherait la compétence qu'on vient justement de régler
           state.compsForce[it.key] !== undefined ||
           state.compsXpForce[it.key] !== undefined ||
           (state.compsXpMod[it.key] || 0) !== 0 ||
           (state.compsXpMod2[it.key] || 0) !== 0;
  }
  // l'ordre des champs, partout sur la Fiche : Body, puis Mind, puis Prestance
  var CHAMPS = ["Body", "Mind", "Prestance"];
