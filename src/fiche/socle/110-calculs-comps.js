  // Le malus de poids RETENU par une compétence, et le seul endroit qui en
  // décide. Les infobulles le lisent ici plutôt que de le recalculer : sinon
  // elles finiraient par énumérer un terme que le total n'a pas subi, et la
  // somme affichée ne se vérifierait plus de tête.
  //
  // La règle le retranche « à chaque jet de Body (autre que l'attaque et la
  // parade) », d'où les trois refus. Les compétences d'arme SONT l'attaque et la
  // parade. Celles de Mind et de Prestance ne sont pas des jets de Body. Un total
  // forcé (Options) remplace le calcul entier, malus compris : c'est la règle de
  // ce champ depuis toujours, et l'infobulle « Total forcé à 50 » mentirait sur
  // un total affiché à 40.
  function compPoidsMalus(carac, key) {
    if (key && state.compsForce[key] !== undefined) return 0;
    if (carac !== "Body" || (key && estArme(key))) return 0;
    return poidsMalus();
  }
  // LE POINT DE BRANCHEMENT DU MALUS DE POIDS : le seul endroit qui voie à la
  // fois la caractéristique et la clé, donc le seul capable d'épargner les
  // compétences d'arme. Tout ce qui affiche ou lance une compétence passe par là,
  // l'initiative comprise.
  function compValueBrut(carac, comp, key) {
    // total forcé (Options) : il remplace le calcul, modificateur compris
    if (key && state.compsForce[key] !== undefined) return state.compsForce[key];
    return caracTotal(carac) + stadeInfo(comp ? comp.stade : 0).bonus +
           (key ? (state.compsMod[key] || 0) + (state.compsMod2[key] || 0) : 0) -
           compPoidsMalus(carac, key);
  }
  function compValue(carac, comp, key) {
    var v = compValueBrut(carac, comp, key);
    return aFiltre("compValue")
      ? applique("compValue", v, { carac: carac, cle: key, comp: comp })
      : v;
  }
  // Total SANS le forçage : ce que la compétence vaudrait normalement.
  // « Auto » ne veut pas dire « sans filtre » : ces deux fonctions passent par
  // les publiques (compValue, compXp), donc un filtre s'y voit aussi. C'est
  // voulu : ce sont les valeurs de repli affichées à côté des cases de forçage,
  // et elles doivent parler la même langue que le reste de la fiche. Recopier
  // le corps du brut donnait deux chiffres pour une seule compétence : la
  // colonne Total affichait 45 pendant que l'indication du champ « Total forcé »
  // proposait 40, et le joueur qui recopiait l'indication perdait les 5 points
  // du filtre sans rien voir. Le forçage s'ôte le temps du calcul, comme pour
  // l'xp : c'est la seule chose dont ces valeurs doivent se passer.
  //
  // finally, et pas une simple ligne de plus : le forçage est une donnée du
  // PERSONNAGE, retirée le temps d'un calcul. Ces fonctions tournent dans les
  // hooks de rafraîchissement, où chaque appel est déjà sous try/catch ; un
  // calcul qui jetterait entre le retrait et la remise ne ferait donc pas de
  // bruit, mais le chiffre saisi par le joueur serait effacé pour de bon, et le
  // save() suivant l'emporterait.
  function compValueAuto(carac, comp, key) {
    var f = state.compsForce[key];
    delete state.compsForce[key];
    try { return compValue(carac, comp, key); }
    finally { if (f !== undefined) state.compsForce[key] = f; }
  }
  function compXpAuto(c, key) {
    var f = state.compsXpForce[key];
    delete state.compsXpForce[key];
    try { return compXp(c, key); }
    finally { if (f !== undefined) state.compsXpForce[key] = f; }
  }
  function blankComp() { return { stade: 0, techniques: [] }; }
  function allComps() {
    var out = [];
    var armes = {};
    ((DATA && DATA.compsArmes) || []).forEach(function (n) { armes[n] = 1; });
    CHAMPS.forEach(function (c) {
      (DATA.comps[c] || []).forEach(function (n) {
        out.push({ key: c + "/" + n, name: n, carac: c, custom: false,
                   arme: c === ARME_CARAC && !!armes[n] });
      });
    });
    // armes ajoutées par le joueur : mêmes compétences de Body, personnalisées
    state.armesComps.forEach(function (n) {
      out.push({ key: armeKey(n), name: n, carac: ARME_CARAC, custom: true, arme: true });
    });
    state.customComps.forEach(function (cc) {
      if (cc && cc.name) out.push({ key: cc.carac + "/" + cc.name, name: cc.name, carac: cc.carac, custom: true });
    });
    // les langues sont des compétences de Mind à part entière : elles doivent
    // apparaître dans l'onglet Art et dans les modificateurs (Options) comme
    // les autres. Seule la liste de l'onglet Fiche les écarte, puisqu'elles
    // ont leur propre module.
    state.langues.forEach(function (n) {
      out.push({ key: langueKey(n), name: n, carac: LANGUE_CARAC, custom: true, langue: true });
    });
    return out;
  }

  // La « carte » : le résumé calculé de la fiche, pour la bibliothèque, le popup
  // de l'extension et les attributs miroir Roll20 (barres de jetons, macros).
  function computeCard() {
    return {
      name: state.name || "Sans nom",
      caracs: { Mind: caracTotal("Mind"), Body: caracTotal("Body"), Prestance: caracTotal("Prestance") },
      combat: {
        pv: state.pv === null ? null : pvCourant(), pvMax: pvMax(),
        vitesse: vitesse(), regen: regen(), initiative: initiative(), poids: poidsPorte()
      },
      narration: state.narration
    };
  }

