  // ---------- calculs ----------
  // Chaque valeur dérivée existe en deux temps : <nom>Brut fait le calcul,
  // <nom> le passe aux filtres. Les fonctions <nom>Auto, elles, sont AUTRE
  // CHOSE : la valeur avant le forçage du MJ, et elles ne bougent pas.
  // Plafond d'une caractéristique : le barème (80), décalé par le modificateur
  // du bloc Création, ou remplacé net par un plafond forcé. UN SEUL endroit le
  // calcule : les garde-fous des boutons, l'infobulle et le champ forcé des
  // Options lisent tous cette fonction, sinon deux d'entre eux finissent par
  // dire des chiffres différents du total réellement retenu.
  function caracPlafondAuto(c) { return CARAC_MAX + (state.caracsPlafondMod[c] || 0); }
  function caracPlafond(c) {
    if (state.caracsPlafondForce[c] !== undefined) return state.caracsPlafondForce[c];
    return caracPlafondAuto(c);
  }
  // budget de points de caractéristiques à la création : même grammaire
  function ptsCreaAuto() { return PTS_CREATION + (state.ptsCreaMod || 0); }
  function ptsCreaMax() {
    if (state.ptsCreaForce !== null && state.ptsCreaForce !== undefined) return state.ptsCreaForce;
    return ptsCreaAuto();
  }
  function caracTotalBrut(c) {
    // total FORCÉ : il court-circuite tout, plafond et modificateurs compris
    if (state.caracsForce[c] !== undefined) return state.caracsForce[c];
    var v = state.caracsBase[c] + CARAC_PAS * state.caracsXp[c];
    v = Math.min(v, caracPlafond(c));
    // le modificateur (bloc Options) s'applique APRÈS le plafond : il peut
    // porter le total au-delà de 80 comme en dessous de 0.
    return v + (state.caracsMod[c] || 0) + (state.caracsMod2[c] || 0);
  }
  function caracTotal(c) {
    var v = caracTotalBrut(c);
    // le test évite de fabriquer l'objet d'infos pour rien : ce calcul-là est
    // rappelé des centaines de fois par rafraîchissement
    return aFiltre("caracTotal") ? applique("caracTotal", v, { carac: c }) : v;
  }
  function stadeInfo(i) { return DATA.stades[clamp(i, 0, DATA.stades.length - 1)]; }
  // coût d'un passif : son coût forcé s'il en porte un, sinon le tarif de base
  // (20 xp) — TOUS les passifs sont payants, aucun n'est offert par un stade
  function techXp(t) {
    return (t && t.cout !== null && t.cout !== undefined && isFinite(t.cout))
      ? t.cout : DATA.xpParStade;
  }
  // coût de l'art : rien par défaut (il vient avec son stade), sauf coût forcé
  function artXp(c) {
    return (c && c.art && c.art.cout !== null && c.art.cout !== undefined && isFinite(c.art.cout))
      ? c.art.cout : 0;
  }
  // clés et repères des compétences que la fiche traite à part
  var INIT_KEY = "Body/Initiative";
  var LANGUE_CARAC = "Mind";
  // les compétences d'ARMES sont TOUJOURS des compétences de Body
  var ARME_CARAC = "Body";
  function armeKey(nom) { return ARME_CARAC + "/" + nom; }
  // celles des règles, puis celles que le joueur a ajoutées
  function armesNoms() {
    return ((DATA && DATA.compsArmes) || []).concat(state.armesComps);
  }
  // Reconnaître une compétence d'arme par sa CLÉ, et surtout pas par le drapeau
  // « arme » que allComps() pose sur ses items : compValue() ne reçoit jamais
  // l'item, et ctx.ligneComp construit le sien SANS ce drapeau. Un mod qui
  // afficherait une ligne de Katana verrait alors le malus de poids tomber sur
  // une attaque, que la règle exempte. Passer par armesNoms() plutôt que par une
  // liste figée fait qu'une arme ajoutée par le joueur en est exempte aussitôt.
  // Une compétence d'arme, c'est-à-dire l'attaque et la parade, que le malus de
  // poids épargne.
  //
  // Les armes des règles font foi. Une arme PERSONNALISÉE, elle, n'exempte que
  // si son nom ne recouvre pas une compétence de Body existante : sans cette
  // réserve, un joueur qui baptise son arme « Esquive » ou « Sprint » retirerait
  // le malus de poids à la compétence du même nom, initiative comprise, et rien
  // à l'écran ne le dirait.
  function estArme(key) {
    var rgl = (DATA && DATA.compsArmes) || [];
    var i;
    for (i = 0; i < rgl.length; i++) if (armeKey(rgl[i]) === key) return true;
    var body = (DATA && DATA.comps && DATA.comps[ARME_CARAC]) || [];
    for (i = 0; i < state.armesComps.length; i++) {
      if (armeKey(state.armesComps[i]) !== key) continue;
      return body.indexOf(state.armesComps[i]) < 0;
    }
    return false;
  }
  function langueKey(nom) { return LANGUE_CARAC + "/" + nom; }
  // index du stade « Expert » : la langue du personnage y monte gratuitement
  function stadeIndex(nom) {
    for (var i = 0; i < DATA.stades.length; i++) {
      if ((DATA.stades[i].nom || "").toLowerCase() === nom) return i;
    }
    return -1;
  }
  function stadeExpert() {
    var i = stadeIndex("expert");
    return i >= 0 ? i : Math.max(0, DATA.stades.length - 2);
  }
  function compXpBrut(c, key) {
    // coût forcé (Options) : il court-circuite tout le calcul
    if (key && state.compsXpForce[key] !== undefined) return state.compsXpForce[key];
    // la langue du personnage est acquise : ses stades ne coûtent rien
    // jusqu'à Expert, au-delà seule la différence se paie
    var stadesDus = c.stade;
    if (key && state.langueBase && key === langueKey(state.langueBase)) {
      stadesDus = Math.max(0, c.stade - stadeExpert());
    }
    var xp = DATA.xpParStade * stadesDus;
    // les passifs PRÉSENTS restent facturés même si le stade ne les ouvre
    // plus (fiches d'avant un déplacement du stade d'ouverture : rien ne
    // doit disparaître ni se re-créditer en silence)
    (c.techniques || []).forEach(function (t) { xp += techXp(t); });
    return xp + artXp(c) +
           (key ? (state.compsXpMod[key] || 0) + (state.compsXpMod2[key] || 0) : 0);
  }
  function compXp(c, key) {
    var v = compXpBrut(c, key);
    return aFiltre("compXp") ? applique("compXp", v, { cle: key, comp: c }) : v;
  }
  // Ce qu'une caractéristique coûte, forçage et modificateurs compris. Elle
  // se règle désormais comme une compétence : c'est le même geste pour le MJ.
  function caracXp(c) {
    if (state.caracsXpForce[c] !== undefined) return state.caracsXpForce[c];
    return DATA.xpParStade * (state.caracsXp[c] || 0) +
           (state.caracsXpMod[c] || 0) + (state.caracsXpMod2[c] || 0);
  }
  function caracXpAuto(c) {
    return DATA.xpParStade * (state.caracsXp[c] || 0) +
           (state.caracsXpMod[c] || 0) + (state.caracsXpMod2[c] || 0);
  }
  function compCap() { return Math.floor(state.xpTotal / QUART); }
  // le total appelle compXp() et non compXpBrut() : un filtre sur le coût d'une
  // compétence doit se voir dans l'xp dépensé, sinon les deux chiffres de
  // l'en-tête se contrediraient
  function xpDepenseBrut() {
    var xp = 0;
    ["Mind", "Body", "Prestance"].forEach(function (c) { xp += caracXp(c); });
    Object.keys(state.comps).forEach(function (k) { xp += compXp(state.comps[k], k); });
    return xp;
  }
  function xpDepense() {
    var v = xpDepenseBrut();
    return aFiltre("xpDepense") ? applique("xpDepense", v, {}) : v;
  }
  function xpRestant() { return state.xpTotal - xpDepense(); }
  // xp dépensé DANS un champ : la montée de la caractéristique elle-même, plus
  // toutes les compétences qui s'y rattachent (armes et langues comprises,
  // elles sont des compétences de Body et de Mind)
  function xpChamp(carac) {
    var xp = caracXp(carac);
    Object.keys(state.comps).forEach(function (k) {
      if (k.slice(0, carac.length + 1) === carac + "/") xp += compXp(state.comps[k], k);
    });
    return xp;
  }
  function ptsCreation() {
    return state.caracsBase.Mind + state.caracsBase.Body + state.caracsBase.Prestance;
  }
