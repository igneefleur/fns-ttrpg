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

  // ---------- LES CINQ LEVIERS DU MENEUR ----------
  // UNE SEULE CHAÎNE, LA MÊME POUR LES CINQ. Le plafond, le coût en xp, le
  // modificateur, la limite et l'écart se règlent du même geste :
  //
  //     le forcé, s'il est rempli
  //     sinon ((base + a1 + a2) × m1 × m2) + a3 + a4
  //
  // « base » est ce que la RÈGLE donne pour ce levier, et rien d'autre : le
  // prestige, l'xp cumulé de la ligne, le MOD de la table, sa limite, l'écart
  // des règles.
  //
  // L'ORDRE DANS UN GROUPE EST SANS EFFET — l'addition commute, la
  // multiplication associe. C'est la coupure en TROIS groupes qui fait tout, et
  // la grille des Options la montre telle quelle, de gauche à droite : deux
  // ajouts qui portent sur la base, deux facteurs qui portent sur ce qu'ils
  // trouvent, deux ajouts qui ne se multiplient plus.
  function levierBoite(nom, boite, c) {
    var l = state.caracsLeviers && state.caracsLeviers[nom];
    var tb = l && l[boite];
    var v = tb && tb[c];
    return (typeof v === "number" && isFinite(v)) ? v : undefined;
  }
  // UN AJOUT VIDE VAUT ZÉRO, UN FACTEUR VIDE VAUT UN, et c'est toute la
  // différence entre les deux. Lire un facteur absent comme un zéro mettrait la
  // caractéristique à zéro au premier champ qu'on tape puis qu'on efface.
  function levierAdd(nom, boite, c) {
    var v = levierBoite(nom, boite, c);
    return v === undefined ? 0 : v;
  }
  function levierMul(nom, boite, c) {
    var v = levierBoite(nom, boite, c);
    return v === undefined ? 1 : v;
  }
  function levierForce(nom, c) { return levierBoite(nom, "force", c); }
  // La chaîne SANS le forçage : c'est elle que le champ « Forcé » montre en
  // filigrane, et c'est ce que les fonctions <nom>Auto rendent.
  function levierAuto(nom, c, base) {
    var v = ((base + levierAdd(nom, "a1", c) + levierAdd(nom, "a2", c)) *
             levierMul(nom, "m1", c) * levierMul(nom, "m2", c)) +
            levierAdd(nom, "a3", c) + levierAdd(nom, "a4", c);
    // UN RÉSULTAT NON FINI REND LA BASE. applique() refuse déjà ce qu'un FILTRE
    // rend d'infini ou d'illisible, mais elle ne voit pas ce qui se fabrique
    // ici : un NaN né dans la chaîne traverserait la fiche entière sans un mot.
    if (!isFinite(v)) return base;
    // ARRONDI AU CENTIÈME, ET À LA TOUTE FIN. Les leviers acceptent les
    // décimales depuis toujours ; arrondir entre les deux facteurs empilerait
    // deux erreurs, et arrondir à l'unité mentirait sur l'xp, décimal par
    // décision. Ce qui doit être entier l'est chez celui qui le consomme.
    return Math.round(v * 100) / 100;
  }
  function levierChaine(nom, c, base) {
    var f = levierForce(nom, c);
    return f === undefined ? levierAuto(nom, c, base) : f;
  }

  // ---------- le prestige ----------
  function prestigeAuto() { return (state.prestige || 0) + (state.prestigeMod || 0); }
  function prestige() {
    if (state.prestigeForce !== null && state.prestigeForce !== undefined) return state.prestigeForce;
    return prestigeAuto();
  }
  // Plafond d'une caractéristique : le prestige, passé par la chaîne du levier.
  // UN SEUL endroit le calcule — les garde-fous des boutons, l'infobulle et le
  // champ forcé des Options lisent tous cette fonction, sinon trois chiffres
  // différents finissent à l'écran.
  function caracPlafondAuto(c) { return levierAuto("plafond", c, prestige()); }
  function caracPlafond(c) { return levierChaine("plafond", c, prestige()); }

  // ---------- les caractéristiques ----------
  function caracBase(c) { return state.caracs[c] || 0; }
  function caracTotalBrut(c) {
    var v = Math.min(caracBase(c), caracPlafond(c));
    // le BONUS s'applique APRÈS le plafond : il peut porter le total au-delà
    // du prestige comme en dessous de zéro.
    return v + (state.caracsBonus[c] || 0);
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
  // LA VALEUR NATURELLE : ce que la caractéristique vaut sans le bonus. Elle
  // ne sert qu'à la règle de l'écart, qui se calcule sur l'état d'AVANT les
  // leviers (voir speRetire).
  function caracValeurNat(c) { return Math.min(caracBase(c), caracPlafond(c)); }
  function caracModNat(c) { return ligneValeur(caracValeurNat(c)).mod; }
  function caracLimNat(c) { return ligneValeur(caracValeurNat(c)).lim; }
  // Ce que la TABLE donne pour la valeur courante, bonus compris — avant le
  // levier du meneur. C'est la BASE de la chaîne, et c'est ce que le bloc des
  // Options montre en filigrane du champ forcé.
  function caracModTable(c) { return ligneValeur(caracTotal(c)).mod; }
  function caracLimTable(c) { return ligneValeur(caracTotal(c)).lim; }
  // LE FORÇAGE SE TESTE DANS LE BRUT, ET NON APRÈS LE FILTRE : posé dans
  // caracMod(), il sauterait applique() et couperait en silence tout mod déjà
  // écrit. Testé ici, un mod garde le dernier mot sur un MOD forcé —
  // exactement ce qu'il voit aujourd'hui d'un MOD décalé.
  function caracModAuto(c) { return levierAuto("mod", c, caracModTable(c)); }
  function caracModBrut(c) { return levierChaine("mod", c, caracModTable(c)); }
  function caracMod(c) {
    var v = caracModBrut(c);
    return aFiltre("caracMod") ? applique("caracMod", v, { carac: c }) : v;
  }
  function caracLimAuto(c) { return levierAuto("lim", c, caracLimTable(c)); }
  function caracLimBrut(c) { return levierChaine("lim", c, caracLimTable(c)); }
  function caracLim(c) {
    var v = caracLimBrut(c);
    return aFiltre("caracLim") ? applique("caracLim", v, { carac: c }) : v;
  }
  // L'ÉCART MINIMUM entre le total d'une spécialité et la limite naturelle de
  // sa caractéristique. La base vient des règles ; le meneur la passe par la
  // même chaîne que les quatre autres leviers — et son « forcé » est l'ancienne
  // case unique, une VALEUR et non un décalage : on pense « l'écart doit être
  // de 30 », pas « je décale de −20 ».
  function ecartMinAuto(c) { return levierAuto("ecart", c, repli("speMarge")); }
  function ecartMinBrut(c) { return levierChaine("ecart", c, repli("speMarge")); }
  function ecartMin(c) {
    var v = ecartMinBrut(c);
    return aFiltre("ecartMin") ? applique("ecartMin", v, { carac: c }) : v;
  }
  // Ce qu'une caractéristique coûte : l'XP CUMULÉ de sa ligne, et non une somme
  // de pas. La table porte déjà les 20 XP le +1 jusqu'à 5 puis 40 au-delà, donc
  // un barème corrigé dans les règles arrive ici sans qu'on rouvre ce fichier.
  function caracXpAuto(c) { return levierAuto("xp", c, ligneValeur(caracBase(c)).xp); }
  function caracXp(c) { return levierChaine("xp", c, ligneValeur(caracBase(c)).xp); }

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
    // le bonus s'applique APRÈS le plafond, comme celui d'une caractéristique
    return v + (state.compsBonus[code] || 0) +
           (state.compsMod[code] || 0) + (state.compsMod2[code] || 0);
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
  // LA CARACTÉRISTIQUE EMPLOYÉE, qui n'est pas toujours celle de la spécialité.
  // Le réglage « Au choix » de la barre d'envoi fait demander à Roll20, avant
  // de lancer, LAQUELLE porte le jet : une spécialité rangée sous DEX peut
  // très bien partir sous FOR. Tout ce qui suit accepte donc une
  // caractéristique en second argument, et retombe sur la sienne sans elle.
  //
  // C'EST UN DÉFAUT SIGNALÉ EN PARTIE, et il coûtait des points pour de bon :
  // une spécialité ramenée par la règle de l'écart sous SA caractéristique
  // gardait son retrait quand on la lançait sous une AUTRE, plus haute — donc
  // sous une limite qui ne la ramenait pas. Le joueur perdait un retrait que
  // rien ne justifiait plus, et le plafond du jet, lui, employait bien la
  // caractéristique choisie : les deux moitiés du calcul ne parlaient pas de
  // la même.
  function speCarac(spe, carac) {
    return carac || (spe && spe.carac) || "";
  }
  // LE TOTAL D'UNE SPÉCIALITÉ : ses points, le MOD de la caractéristique
  // employée, les points de sa compétence. C'est ce nombre-là que la règle de
  // l'écart borne.
  function speTotalBrut(spe, carac) {
    if (!spe || !speCarac(spe, carac)) return 0;
    return spePts(spe) + caracMod(speCarac(spe, carac)) + (spe.comp ? compPts(spe.comp) : 0);
  }
  // ET SON RABATTAGE. Rien n'est bloqué à l'achat : on met dans une spécialité
  // ce qu'on veut. C'est le total EMPLOYÉ AU JET qui redescend.
  //
  // CE QUE LA RÈGLE RETIRE SE CALCULE UNE FOIS, SUR L'ÉTAT NATUREL — la
  // caractéristique sans son bonus, sa limite sans décalage — puis se CONSERVE
  // tel quel. Les leviers du meneur s'appliquent par-dessus, ils ne le
  // recalculent pas.
  //
  // C'est de là que sortent, d'une seule règle, les deux exceptions que le
  // système admet :
  //   — le meneur abaisse la SEULE limite : le retrait ne bouge pas, donc
  //     l'écart se resserre sous son minimum ;
  //   — le meneur abaisse la CARACTÉRISTIQUE : le total baisse, le retrait ne
  //     bouge pas, l'écart se resserre aussi.
  // Recalculer le retrait après coup effacerait les deux : l'écart reviendrait
  // à son minimum et les leviers n'auraient servi à rien.
  //
  // Le levier d'ÉCART, lui, entre bien dans le calcul : il ne suspend pas la
  // règle, il en déplace le seuil.
  //
  // LE RETRAIT SE CALCULE SOUS LA CARACTÉRISTIQUE EMPLOYÉE, et c'est tout le
  // sujet du défaut corrigé : c'est SA limite qui décide s'il y a lieu de
  // ramener quelque chose. Une caractéristique plus haute ne ramène rien.
  function speTotalNat(spe, carac) {
    var c = speCarac(spe, carac);
    if (!spe || !c) return 0;
    return spePts(spe) + caracModNat(c) + (spe.comp ? compPts(spe.comp) : 0);
  }
  function speRetire(spe, carac) {
    var c = speCarac(spe, carac);
    if (!spe || !c) return 0;
    if (state.ecartCoupe) return 0;   // règle suspendue pour ce personnage
    var haut = Math.max(0, caracLimNat(c) - ecartMin(c));
    return Math.max(0, speTotalNat(spe, c) - haut);
  }
  function speTotal(spe, carac) {
    var c = speCarac(spe, carac);
    if (!spe || !c) return 0;
    var v = speTotalBrut(spe, c) - speRetire(spe, c);
    return aFiltre("speTotal") ? applique("speTotal", v, { spe: spe, carac: c }) : v;
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
