  // ---------- calculs ----------
  // Chaque valeur dérivée existe en deux temps : <nom>Brut fait le calcul,
  // <nom> le passe aux filtres. Les fonctions <nom>Auto, elles, sont AUTRE
  // CHOSE : la valeur avant le forçage du MJ, et elles ne bougent pas.

  // ---------- ce que disent les règles ----------
  // Tout ce qui suit LIT les données engendrées par hooks/mia_creation.py
  // depuis la page de règles. Rien n'est recalculé ici : la table des valeurs
  // porte déjà le MOD, la LIM et l'XP cumulé de 0 à 20.
  function regles() { return (typeof DATA === "object" && DATA) || {}; }
  function repli(cle) {
    var v = regles()[cle];
    return (v === undefined || v === null) ? REPLI[cle] : v;
  }
  function caracsRegles() { return regles().caracs || []; }
  function compsRegles() { return regles().comps || []; }
  // Les sigles des caractéristiques, dans l'ordre de la page. Remplace la
  // liste écrite en dur qu'était CHAMPS : l'ordre d'affichage est celui des
  // règles, et une caractéristique ajoutée à la page arrive sans toucher au code.
  function champs() { return caracsRegles().map(function (c) { return c.code; }); }
  function champsComp() { return compsRegles().map(function (c) { return c.code; }); }
  function caracInfo(code) {
    var l = caracsRegles(), i;
    for (i = 0; i < l.length; i++) if (l[i].code === code) return l[i];
    return { code: code, nom: code, groupe: "" };
  }
  function compInfo(code) {
    var l = compsRegles(), i;
    for (i = 0; i < l.length; i++) if (l[i].code === code) return l[i];
    return { code: code, nom: code, mod: [], lim: "" };
  }

  // LA TABLE DES VALEURS, et le seul endroit qui la lise. Une valeur hors table
  // (un modificateur qui pousse au-delà de 20, un total négatif) se rabat sur la
  // ligne la plus proche : la fiche ne fabrique pas de MOD que les règles
  // n'annoncent pas.
  function ligneValeur(v) {
    var t = regles().valeurs || [];
    if (!t.length) return { v: v, mod: 0, lim: 0, xp: 0 };
    var n = Math.floor(v);
    if (n <= t[0].v) return t[0];
    if (n >= t[t.length - 1].v) return t[t.length - 1];
    for (var i = 0; i < t.length; i++) if (t[i].v === n) return t[i];
    return t[t.length - 1];
  }

  // ---------- le prestige ----------
  function prestigeAuto() { return (state.prestige || 0) + (state.prestigeMod || 0); }
  function prestige() {
    if (state.prestigeForce !== null && state.prestigeForce !== undefined) return state.prestigeForce;
    return prestigeAuto();
  }
  // Plafond d'une caractéristique : le prestige, décalé caractéristique par
  // caractéristique, ou remplacé net. UN SEUL endroit le calcule — les
  // garde-fous des boutons, l'infobulle et le champ forcé des Options lisent
  // tous cette fonction, sinon trois chiffres différents finissent à l'écran.
  function caracPlafondAuto(c) { return prestige() + (state.caracsPlafondMod[c] || 0); }
  function caracPlafond(c) {
    if (state.caracsPlafondForce[c] !== undefined) return state.caracsPlafondForce[c];
    return caracPlafondAuto(c);
  }

  // ---------- les caractéristiques ----------
  function caracBase(c) { return state.caracs[c] || 0; }
  function caracTotalBrut(c) {
    // total FORCÉ : il court-circuite tout, plafond et modificateurs compris
    if (state.caracsForce[c] !== undefined) return state.caracsForce[c];
    var v = Math.min(caracBase(c), caracPlafond(c));
    // le modificateur (bloc Options) s'applique APRÈS le plafond : il peut
    // porter le total au-delà du prestige comme en dessous de zéro.
    return v + (state.caracsMod[c] || 0) + (state.caracsMod2[c] || 0);
  }
  function caracTotal(c) {
    var v = caracTotalBrut(c);
    // le test évite de fabriquer l'objet d'infos pour rien : ce calcul-là est
    // rappelé des centaines de fois par rafraîchissement
    return aFiltre("caracTotal") ? applique("caracTotal", v, { carac: c }) : v;
  }
  // LE MODIFICATEUR, qui s'ajoute à tous les jets passant par la
  // caractéristique, et LA LIMITE, qui les plafonne. Les deux se lisent dans la
  // table, jamais ne se recalculent.
  function caracModBrut(c) { return ligneValeur(caracTotal(c)).mod; }
  function caracMod(c) {
    var v = caracModBrut(c);
    return aFiltre("caracMod") ? applique("caracMod", v, { carac: c }) : v;
  }
  function caracLimBrut(c) { return ligneValeur(caracTotal(c)).lim; }
  function caracLim(c) {
    var v = caracLimBrut(c);
    return aFiltre("caracLim") ? applique("caracLim", v, { carac: c }) : v;
  }
  // Ce qu'une caractéristique coûte : l'XP CUMULÉ de sa ligne, et non une somme
  // de pas. La table porte déjà les 20 XP le +1 jusqu'à 5 puis 40 au-delà, donc
  // un barème corrigé dans les règles arrive ici sans qu'on rouvre ce fichier.
  function caracXpAuto(c) {
    return ligneValeur(caracBase(c)).xp +
           (state.caracsXpMod[c] || 0) + (state.caracsXpMod2[c] || 0);
  }
  function caracXp(c) {
    if (state.caracsXpForce[c] !== undefined) return state.caracsXpForce[c];
    return caracXpAuto(c);
  }

  // ---------- les compétences ----------
  // LE PLAFOND DE POINTS : le MOD le plus haut des caractéristiques qui
  // commandent la compétence. PHY en compte quatre, COM deux, les six autres
  // une seule — et c'est la page de règles qui le dit, pas ce fichier.
  function compPlafondBrut(code) {
    var mods = compInfo(code).mod || [], best = 0;
    for (var i = 0; i < mods.length; i++) best = Math.max(best, caracMod(mods[i]));
    return best;
  }
  function compPlafond(code) {
    var v = compPlafondBrut(code);
    return aFiltre("compPlafond") ? applique("compPlafond", v, { cle: code }) : v;
  }
  // La caractéristique par DÉFAUT d'une compétence : celle qui fournit le MOD
  // et la LIM quand le joueur ne demande rien d'autre. Il peut en demander une
  // autre — c'est tout l'intérêt d'avoir séparé les deux colonnes.
  function compCarac(code) { return compInfo(code).lim || champs()[0] || ""; }
  function compPtsBrut(code) {
    if (state.compsForce[code] !== undefined) return state.compsForce[code];
    var v = Math.min(state.comps[code] || 0, compPlafond(code));
    return v + (state.compsMod[code] || 0) + (state.compsMod2[code] || 0);
  }
  function compPts(code) {
    var v = compPtsBrut(code);
    return aFiltre("compValue") ? applique("compValue", v, { cle: code }) : v;
  }
  function compXpAuto(code) {
    return (state.comps[code] || 0) * repli("xpComp") +
           (state.compsXpMod[code] || 0) + (state.compsXpMod2[code] || 0);
  }
  function compXp(code) {
    if (state.compsXpForce[code] !== undefined) return state.compsXpForce[code];
    var v = compXpAuto(code);
    return aFiltre("compXp") ? applique("compXp", v, { cle: code }) : v;
  }

  // ---------- les spécialités ----------
  // Une spécialité relève d'UNE caractéristique et d'UNE compétence, qui ne
  // sont pas forcément accordées : Esquive tient de DEX, sa compétence COM
  // plafonne sur le meilleur de DEX et d'AGI. Le plafond de la spécialité les
  // fait donc entrer tous les deux, chacun compté pour 30 au minimum — sans quoi
  // on accumulerait des points à 2 en caractéristique pour les emporter à 3.
  // AUCUN PLAFOND SUR UNE SPÉCIALITÉ. On y met ce qu'on veut : rien ne borne
  // les points, ni au calcul ni à la saisie. Ce qui reste de l'ancienne borne,
  // c'est un AVERTISSEMENT — jaune, dans les garde-fous de l'en-tête — dès que
  // le total dépasse la limite moins la marge des règles : au-delà, la limite
  // rogne le jet et les points achetés ne rapportent plus rien.
  function spePtsBrut(spe) {
    if (!spe) return 0;
    if (spe.force !== null && spe.force !== undefined) return spe.force;
    return (spe.pts || 0) + (spe.mod || 0) + (spe.mod2 || 0);
  }
  function spePts(spe) {
    var v = spePtsBrut(spe);
    return aFiltre("spePts") ? applique("spePts", v, { spe: spe }) : v;
  }
  // Un point de spécialité coûte un QUART d'XP : le total est donc décimal, et
  // c'est voulu. On l'arrondit au centième pour que l'en-tête n'affiche pas
  // 12.750000000000002.
  function speXp(spe) {
    if (!spe) return 0;
    if (spe.xpForce !== null && spe.xpForce !== undefined) return spe.xpForce;
    return Math.round((spe.pts || 0) * repli("xpSpe") * 100) / 100;
  }
  // Retrouver une spécialité par son nom, pour les formules qui la nomment :
  // les PV ajoutent « SPÉ PV », la récupération EST une spécialité, et
  // l'obstination en lance une. La comparaison ignore la casse et les espaces.
  function speParNom(nom) {
    var cible = String(nom || "").trim().toLowerCase(), l = state.specialites || [], i;
    for (i = 0; i < l.length; i++) {
      if (String(l[i].nom || "").trim().toLowerCase() === cible) return l[i];
    }
    return null;
  }
  function spePtsParNom(nom) {
    var s = speParNom(nom);
    return s ? spePts(s) : 0;
  }

  // ---------- l'expérience ----------
  function xpDepenseBrut() {
    var xp = 0;
    champs().forEach(function (c) { xp += caracXp(c); });
    champsComp().forEach(function (c) { xp += compXp(c); });
    (state.specialites || []).forEach(function (s) { xp += speXp(s); });
    return Math.round(xp * 100) / 100;
  }
  function xpDepense() {
    var v = xpDepenseBrut();
    return aFiltre("xpDepense") ? applique("xpDepense", v, {}) : v;
  }
  function xpRestant() { return Math.round((state.xpTotal - xpDepense()) * 100) / 100; }
  // XP dépensé DANS un champ : la montée de la caractéristique elle-même, plus
  // les compétences qu'elle commande et les spécialités qui en relèvent. Une
  // compétence qui plafonne sur plusieurs caractéristiques compte dans celle
  // qu'elle lance par défaut, pour n'être comptée qu'une fois.
  function xpChamp(carac) {
    var xp = caracXp(carac);
    champsComp().forEach(function (c) { if (compCarac(c) === carac) xp += compXp(c); });
    (state.specialites || []).forEach(function (s) { if (s.carac === carac) xp += speXp(s); });
    return Math.round(xp * 100) / 100;
  }
