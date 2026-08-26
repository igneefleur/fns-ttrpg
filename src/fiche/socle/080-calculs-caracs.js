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
  //     sinon (((base + a1 + a2) × m1 × m2) + a3 + a4) × m3 × m4
  //
  // « base » est ce que la RÈGLE donne pour ce levier, et rien d'autre : le
  // prestige, l'xp cumulé de la ligne, le MOD de la table, sa limite, l'écart
  // des règles.
  //
  // L'ORDRE DANS UN GROUPE EST SANS EFFET — l'addition commute, la
  // multiplication associe. C'est la coupure en QUATRE groupes qui fait tout, et
  // la grille des Options la montre telle quelle, de gauche à droite : deux
  // ajouts sur la base, deux facteurs, deux ajouts, deux facteurs encore.
  //
  // QUATRE GROUPES, ET NON TROIS, parce que trois ne savent pas tout dire : un
  // ajout posé APRÈS la dernière multiplication ne pouvait plus être multiplié,
  // et « ajoute 20 puis double le tout » n'avait aucune écriture. Alterner deux
  // fois les deux opérations donne toutes les combinaisons.
  //
  // LA CHAÎNE NE SAIT PAS OÙ DORMENT SES NOMBRES, et c'est ce qui permet aux
  // trois porteurs de la partager. Une caractéristique range les siens dans une
  // table à trois niveaux (levier, boîte, sigle) ; une compétence dans une table
  // sœur ; une SPÉCIALITÉ les porte sur elle-même, sans niveau de sigle — elle
  // EST déjà l'individu, et son seul identifiant serait son rang dans un tableau
  // qui se réordonne. On sépare donc le CALCUL de l'endroit où l'on range :
  // chaîne() ne reçoit qu'une fonction qui rend une boîte.
  function boiteNombre(v) {
    return (typeof v === "number" && isFinite(v)) ? v : undefined;
  }
  // UN AJOUT VIDE VAUT ZÉRO, UN FACTEUR VIDE VAUT UN, et c'est toute la
  // différence entre les deux. Lire un facteur absent comme un zéro mettrait la
  // valeur à zéro au premier champ qu'on tape puis qu'on efface.
  function chaineAdd(v) { return v === undefined ? 0 : v; }
  function chaineMul(v) { return v === undefined ? 1 : v; }
  // La chaîne SANS le forçage : c'est elle que le champ « Forcé » montre en
  // filigrane, et c'est ce que les fonctions <nom>Auto rendent.
  function chaineAuto(lire, base) {
    var v = (((base + chaineAdd(lire("a1")) + chaineAdd(lire("a2"))) *
              chaineMul(lire("m1")) * chaineMul(lire("m2"))) +
             chaineAdd(lire("a3")) + chaineAdd(lire("a4"))) *
            chaineMul(lire("m3")) * chaineMul(lire("m4"));
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
  function chaine(lire, base) {
    var f = lire("force");
    return f === undefined ? chaineAuto(lire, base) : f;
  }
  // ---------- les trois porteurs ----------
  function lireCarac(nom, c) {
    return function (boite) {
      var l = state.caracsLeviers && state.caracsLeviers[nom];
      var tb = l && l[boite];
      return boiteNombre(tb && tb[c]);
    };
  }
  function lireComp(nom, code) {
    return function (boite) {
      var l = state.compsLeviers && state.compsLeviers[nom];
      var tb = l && l[boite];
      return boiteNombre(tb && tb[code]);
    };
  }
  function lireSpe(nom, spe) {
    return function (boite) {
      var l = spe && spe.leviers && spe.leviers[nom];
      return boiteNombre(l && l[boite]);
    };
  }
  // Les deux raccourcis des caractéristiques, qui gardent leurs appelants.
  function levierAuto(nom, c, base) { return chaineAuto(lireCarac(nom, c), base); }
  function levierChaine(nom, c, base) { return chaine(lireCarac(nom, c), base); }

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

  // ---------- LES TROIS ÉTAGES D'UNE VALEUR ----------
  // LES TROIS FAMILLES SE CALCULENT DU MÊME GESTE, et dans cet ordre :
  //
  //     VALEUR   = chaîne(« valeur », base = ce qui est acheté)
  //     COIFFÉE  = min(VALEUR, PLAFOND)
  //     BONUS    = chaîne(« bonus », base = le bonus de la Fiche)
  //     TOTAL    = COIFFÉE + BONUS
  //
  // LE PLAFOND PASSE APRÈS LE LEVIER, et c'est tout le point : une valeur MÊME
  // MODIFIÉE ne dépasse pas son plafond. Le meneur qui veut passer outre lève le
  // plafond — il a son onglet à côté, et le dire deux fois au même endroit
  // rendrait la fiche illisible.
  //
  // LE BONUS S'AJOUTE APRÈS LA COIFFE, et lui n'est borné par rien : c'est ce
  // qui distingue un équipement d'un point acheté. Il a donc sa chaîne à lui, et
  // non une case dans celle de la valeur — sans quoi le plafond le mangerait.
  //
  // ---------- les caractéristiques ----------
  function caracBase(c) { return state.caracs[c] || 0; }
  function caracValeurAuto(c) { return levierAuto("valeur", c, caracBase(c)); }
  function caracValeurBrut(c) { return levierChaine("valeur", c, caracBase(c)); }
  // LA VALEUR COIFFÉE : le plafond mord sur ce que le levier a produit.
  function caracValeur(c) { return Math.min(caracValeurBrut(c), caracPlafond(c)); }
  function caracBonusSocle(c) { return state.caracsBonus[c] || 0; }
  function caracBonusAuto(c) { return levierAuto("bonus", c, caracBonusSocle(c)); }
  function caracBonus(c) { return levierChaine("bonus", c, caracBonusSocle(c)); }
  function caracTotalBrut(c) { return caracValeur(c) + caracBonus(c); }
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
  //
  // ELLE NE PASSE PAS PAR LE LEVIER DE VALEUR, et c'est délibéré : la règle de
  // l'écart lit ce que le JOUEUR a acheté, jamais ce que le meneur a accordé.
  // Sans quoi un levier posé pour dépanner un personnage lui reprendrait d'une
  // main ce qu'il lui donne de l'autre, en rabattant ses spécialités.
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
  // LES CARACTÉRISTIQUES QUI COMMANDENT LE PLAFOND. Les règles le disent ; le
  // meneur peut le dire autrement POUR CE PERSONNAGE — un avantage change une
  // fiche, et rien d'autre que ces réglages ne peut le faire entrer, puisqu'un
  // avantage n'est que du texte.
  //
  // L'ÉTAT NE PORTE QUE LA SURCHARGE, jamais une copie des règles : sans quoi
  // une compétence dont la page change resterait sur l'ancienne liste, sans un
  // mot. Trois réponses, et non deux :
  //   clé absente        ce que disent les règles
  //   tableau non vide   celles-là
  //   tableau VIDE       rien ne commande ce plafond — c'est un réglage, pas
  //                      un oubli, et il vaut alors zéro
  function compsPlafondDe(code) {
    var tb = state.compsCaracsPlafond;
    if (tb && aClef(tb, code) && Array.isArray(tb[code])) return tb[code];
    return compInfo(code).mod || [];
  }
  function compPlafondSocle(code) {
    var mods = compsPlafondDe(code), best = 0;
    for (var i = 0; i < mods.length; i++) best = Math.max(best, caracMod(mods[i]));
    return best;
  }
  function compPlafondAuto(code) { return chaineAuto(lireComp("plafond", code), compPlafondSocle(code)); }
  function compPlafondBrut(code) { return chaine(lireComp("plafond", code), compPlafondSocle(code)); }
  function compPlafond(code) {
    var v = compPlafondBrut(code);
    return aFiltre("compPlafond") ? applique("compPlafond", v, { cle: code }) : v;
  }
  // La caractéristique par DÉFAUT d'une compétence : celle qui fournit le MOD
  // et la LIM quand le joueur ne demande rien d'autre. Il peut en demander une
  // autre au moment du jet — c'est tout l'intérêt d'avoir séparé les deux
  // colonnes. Même règle que le plafond : la surcharge seule, le repli sur les
  // règles quand elle manque.
  function compCarac(code) {
    var v = state.compsCarac && state.compsCarac[code];
    if (v) return v;
    return compInfo(code).lim || champs()[0] || "";
  }
  // LES TROIS ÉTAGES, ICI AUSSI. Le levier de valeur porte sur les points
  // ACHETÉS, et le plafond mord sur ce qu'il produit : « même modifiée, la
  // valeur ne dépasse pas le plafond ».
  //
  // C'ÉTAIT L'INVERSE, ET C'ÉTAIT FAUX : la chaîne partait d'une base déjà
  // coiffée ET déjà bonifiée, et son résultat n'était re-coiffé par rien. Un
  // levier de +10 sur une compétence à 100 points plafonnée à 70 rendait 80 —
  // il payait un plafond que le joueur avait déjà dépassé.
  function compValeurSocle(code) { return state.comps[code] || 0; }
  function compValeurAuto(code) { return chaineAuto(lireComp("valeur", code), compValeurSocle(code)); }
  function compValeurBrut(code) { return chaine(lireComp("valeur", code), compValeurSocle(code)); }
  function compValeur(code) { return Math.min(compValeurBrut(code), compPlafond(code)); }
  function compBonusSocle(code) { return state.compsBonus[code] || 0; }
  function compBonusAuto(code) { return chaineAuto(lireComp("bonus", code), compBonusSocle(code)); }
  function compBonus(code) { return chaine(lireComp("bonus", code), compBonusSocle(code)); }
  function compPtsBrut(code) { return compValeur(code) + compBonus(code); }
  function compPts(code) {
    var v = compPtsBrut(code);
    return aFiltre("compValue") ? applique("compValue", v, { cle: code }) : v;
  }
  function compXpSocle(code) { return (state.comps[code] || 0) * repli("xpComp"); }
  function compXpAuto(code) { return chaineAuto(lireComp("xp", code), compXpSocle(code)); }
  // LE FORÇAGE SE TESTE DANS LE BRUT, comme partout ailleurs. Il se testait ici
  // APRÈS le filtre : un coût forcé sautait applique(), et coupait en silence
  // tout mod qui filtre « compXp ».
  function compXpBrut(code) { return chaine(lireComp("xp", code), compXpSocle(code)); }
  function compXp(code) {
    var v = compXpBrut(code);
    return aFiltre("compXp") ? applique("compXp", v, { cle: code }) : v;
  }
  // L'ÉCART D'UNE COMPÉTENCE : celui de la caractéristique EMPLOYÉE, passé par
  // sa chaîne à elle.
  //
  // BÂTI SUR compCarac(code) SEUL, ON REJOUERAIT LE DÉFAUT SIGNALÉ EN PARTIE :
  // sous « Au choix », le jet part sous une caractéristique et le seuil
  // viendrait d'une autre. La grille des Options, elle, n'a pas de jet en
  // cours : elle montre celui de la caractéristique par défaut.
  function ecartCompAuto(code, carac) {
    return chaineAuto(lireComp("ecart", code), ecartMin(carac || compCarac(code)));
  }
  function ecartCompBrut(code, carac) {
    return chaine(lireComp("ecart", code), ecartMin(carac || compCarac(code)));
  }
  function ecartComp(code, carac) {
    var v = ecartCompBrut(code, carac);
    return aFiltre("ecartComp")
      ? applique("ecartComp", v, { cle: code, carac: carac || compCarac(code) })
      : v;
  }
  // LA LIMITE D'UNE COMPÉTENCE : celle de la caractéristique EMPLOYÉE, passée
  // par sa chaîne à elle. C'est le DEUXIÈME étage d'une cascade bâtie sur celle
  // de l'écart, et pour la même raison : les trois étages mesurent la MÊME
  // chose — un résultat de jet —, donc l'un peut servir de base au suivant.
  //
  // (C'est ce qui distingue la limite du PLAFOND, qui ne cascade pas : le
  // plafond d'une caractéristique est une VALEUR, celui d'une compétence un
  // NOMBRE DE POINTS. Deux unités, aucune base commune.)
  //
  // RIEN NE BOUGE TANT QUE PERSONNE NE RÈGLE : sans levier, chaque étage rend
  // sa base telle quelle, et le jet est coiffé comme avant.
  function compLimAuto(code, carac) {
    return chaineAuto(lireComp("lim", code), caracLim(carac || compCarac(code)));
  }
  function compLimBrut(code, carac) {
    return chaine(lireComp("lim", code), caracLim(carac || compCarac(code)));
  }
  function compLim(code, carac) {
    var v = compLimBrut(code, carac);
    return aFiltre("compLim")
      ? applique("compLim", v, { cle: code, carac: carac || compCarac(code) })
      : v;
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
  // ---------- LE PLAFOND D'UNE SPÉCIALITÉ ----------
  // LES RÈGLES NE LUI EN DONNENT AUCUN, et c'est pourquoi la coiffe NE MORD QUE
  // si le meneur a réglé quelque chose. Sans réglage, une spécialité n'est
  // bornée par rien — exactement comme avant —, et ce qui la retient reste la
  // règle de l'écart, qui rabat le TOTAL et non les points.
  //
  // FAIRE MORDRE UNE COIFFE PAR DÉFAUT AURAIT ÉTÉ UN CHANGEMENT DE RÈGLE : la
  // spécialité à 200 points d'une fiche réelle, dont la compétence plafonne à
  // 70, serait tombée à 70 sans que personne ne l'ait demandé.
  //
  // LA BASE EST CELLE DE SA COMPÉTENCE, et sans compétence le MOD de sa
  // caractéristique — c'est-à-dire ce que serait le plafond d'une compétence
  // qui n'en relèverait que d'une. Elle ne mord pas ; elle donne au meneur le
  // nombre à partir duquel il règle, et les huit boîtes le déplacent.
  function spePlafondSocle(spe, carac, comp) {
    var k = speComp(spe, comp);
    if (k) return compPlafond(k);
    var c = speCarac(spe, carac);
    return c ? caracMod(c) : 0;
  }
  function spePlafondAuto(spe) { return chaineAuto(lireSpe("plafond", spe), spePlafondSocle(spe)); }
  function spePlafond(spe) { return chaine(lireSpe("plafond", spe), spePlafondSocle(spe)); }
  // POSÉ OU NON : un plafond que personne n'a touché n'existe pas.
  function spePlafondPose(spe) { return levierRegleDe(lireSpe("plafond", spe)); }
  function speCoiffe(spe, v) {
    return spePlafondPose(spe) ? Math.min(v, spePlafond(spe)) : v;
  }

  function spePtsSocle(spe) { return (spe && spe.pts) || 0; }
  function spePtsAuto(spe) { return chaineAuto(lireSpe("valeur", spe), spePtsSocle(spe)); }
  function spePtsBrut(spe) {
    if (!spe) return 0;
    return speCoiffe(spe, chaine(lireSpe("valeur", spe), spePtsSocle(spe)));
  }
  function spePts(spe) {
    var v = spePtsBrut(spe);
    return aFiltre("spePts") ? applique("spePts", v, { spe: spe }) : v;
  }
  //
  // LE BONUS D'UNE SPÉCIALITÉ NE PASSE PAS PAR speTotal, et il ne le peut pas :
  // il s'ajoute APRÈS le rabattage de l'écart (voir 100-calculs-jets.js). Le
  // faire entrer dans le total ferait rabattre la spécialité par son propre
  // bonus. Il a donc sa chaîne, appliquée là où il tombe.
  function speBonusSocle(spe) { return (spe && spe.bonus) || 0; }
  function speBonusAuto(spe) { return chaineAuto(lireSpe("bonus", spe), speBonusSocle(spe)); }
  function speBonus(spe) {
    if (!spe) return 0;
    return chaine(lireSpe("bonus", spe), speBonusSocle(spe));
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
  // ET LA COMPÉTENCE EMPLOYÉE, pour la même raison : le réglage « Compétence :
  // au choix » de la barre d'envoi fait demander à Roll20 LAQUELLE porte le
  // jet. Une spécialité rangée sous Combat peut très bien partir sous
  // Physique, et ce sont alors les points de CELLE-CI qui entrent dans le
  // total — donc aussi dans ce que la règle de l'écart ramène.
  //
  // La chaîne vide est une réponse LÉGITIME : une spécialité peut ne relever
  // d'aucune compétence, et on peut vouloir la lancer sans. D'où le second
  // argument testé sur « undefined » et non sur sa vérité.
  function speComp(spe, comp) {
    if (comp !== undefined && comp !== null) return comp;
    return (spe && spe.comp) || "";
  }
  // L'ÉCART D'UNE SPÉCIALITÉ, DERNIER MAILLON : celui de la compétence
  // EMPLOYÉE, passé par sa chaîne à elle. SANS COMPÉTENCE — et c'est une
  // réponse légitime, voir juste au-dessus — il n'y a pas d'étage du milieu :
  // la base est celle de la caractéristique, directement, et non un étage
  // fictif qui rendrait toujours la même chose.
  //
  // LA CASCADE EST STRICTEMENT DESCENDANTE : ecartSpe → ecartComp → ecartMin →
  // l'écart des règles. Rien ne remonte, jamais. La garde de récursion des
  // filtres ne protège QUE les filtres : un cycle écrit ICI ferait exploser la
  // pile sans qu'aucune garde ne le voie.
  function ecartSpeBase(spe, carac, comp) {
    var c = speCarac(spe, carac), k = speComp(spe, comp);
    return k ? ecartComp(k, c) : ecartMin(c);
  }
  function ecartSpeAuto(spe, carac, comp) {
    return chaineAuto(lireSpe("ecart", spe), ecartSpeBase(spe, carac, comp));
  }
  function ecartSpeBrut(spe, carac, comp) {
    return chaine(lireSpe("ecart", spe), ecartSpeBase(spe, carac, comp));
  }
  function ecartSpe(spe, carac, comp) {
    var v = ecartSpeBrut(spe, carac, comp);
    return aFiltre("ecartSpe")
      ? applique("ecartSpe", v, { spe: spe, carac: speCarac(spe, carac), comp: speComp(spe, comp) })
      : v;
  }
  // LA LIMITE D'UNE SPÉCIALITÉ, DERNIER MAILLON : celle de la compétence
  // EMPLOYÉE, passée par sa chaîne à elle. SANS COMPÉTENCE — réponse légitime —
  // l'étage du milieu n'existe pas et la base est celle de la caractéristique,
  // directement. Exactement la cascade de l'écart, et strictement descendante.
  function speLimBase(spe, carac, comp) {
    var c = speCarac(spe, carac), k = speComp(spe, comp);
    return k ? compLim(k, c) : caracLim(c);
  }
  function speLimAuto(spe, carac, comp) {
    return chaineAuto(lireSpe("lim", spe), speLimBase(spe, carac, comp));
  }
  function speLimBrut(spe, carac, comp) {
    return chaine(lireSpe("lim", spe), speLimBase(spe, carac, comp));
  }
  function speLim(spe, carac, comp) {
    var v = speLimBrut(spe, carac, comp);
    return aFiltre("speLim")
      ? applique("speLim", v, { spe: spe, carac: speCarac(spe, carac), comp: speComp(spe, comp) })
      : v;
  }
  // LA LIMITE QUI COIFFE UN JET, en bout de chaîne : celle de la spécialité
  // s'il y en a une, sinon celle de la compétence, sinon celle de la
  // caractéristique. UN SEUL endroit la décide — la ligne, le jet et
  // l'infobulle lisent tous celui-ci, sinon trois nombres différents finissent
  // à l'écran pour un même jet.
  //
  // LE RABATTAGE DE L'ÉCART NE LA LIT PAS : il se calcule sur caracLimNat, la
  // limite d'avant les leviers (voir speRetire). C'est ce qui permet au meneur
  // d'abaisser une limite sans que le retrait bouge — et c'était déjà vrai du
  // levier de limite des caractéristiques.
  function limiteJet(carac, comp, spe) {
    if (spe) return speLim(spe, carac, comp);
    if (comp) return compLim(comp, carac);
    return caracLim(carac);
  }

  // LE TOTAL D'UNE SPÉCIALITÉ : ses points, le MOD de la caractéristique
  // employée, les points de sa compétence. C'est ce nombre-là que la règle de
  // l'écart borne.
  function speTotalBrut(spe, carac, comp) {
    if (!spe || !speCarac(spe, carac)) return 0;
    var k = speComp(spe, comp);
    return spePts(spe) + caracMod(speCarac(spe, carac)) + (k ? compPts(k) : 0);
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
  //
  // ET « NATUREL » VAUT POUR LES TROIS TERMES, pas seulement pour le MOD. Il
  // prenait spePts (déjà passé par le levier de valeur) et compPts (déjà coiffé
  // ET déjà bonifié) : un bonus de compétence montait donc dans les DEUX totaux
  // à la fois, le brut et le naturel, et le rabattage le remangeait en entier.
  // L'onglet « Bonus » des compétences agissait pour une caractéristique et ne
  // faisait RIEN pour une spécialité rabattue — un levier qui ne change rien
  // n'est pas un levier.
  function compPtsNat(code) { return Math.min(state.comps[code] || 0, compPlafond(code)); }
  // LA COIFFE ENTRE DANS L'ÉTAT NATUREL, comme celle d'une caractéristique et
  // celle d'une compétence : sans elle, rogner les points ferait baisser le
  // total brut ET le total naturel de la même quantité, le retrait ne bougerait
  // pas, et la coiffe n'aurait servi à rien.
  function spePtsNat(spe) { return speCoiffe(spe, (spe && spe.pts) || 0); }
  function speTotalNat(spe, carac, comp) {
    var c = speCarac(spe, carac);
    if (!spe || !c) return 0;
    var k = speComp(spe, comp);
    return spePtsNat(spe) + caracModNat(c) + (k ? compPtsNat(k) : 0);
  }
  function speRetire(spe, carac, comp) {
    var c = speCarac(spe, carac);
    if (!spe || !c) return 0;
    if (state.ecartCoupe) return 0;   // règle suspendue pour ce personnage
    // L'ÉCART EST CELUI DE LA SPÉCIALITÉ, en bout de cascade — et non plus
    // celui de sa caractéristique. « comp » passe BRUT, pour que la base de
    // l'écart et le total résolvent la compétence par le même chemin.
    var haut = Math.max(0, caracLimNat(c) - ecartSpe(spe, c, comp));
    return Math.max(0, speTotalNat(spe, c, comp) - haut);
  }
  function speTotal(spe, carac, comp) {
    var c = speCarac(spe, carac);
    if (!spe || !c) return 0;
    var k = speComp(spe, comp);
    var v = speTotalBrut(spe, c, k) - speRetire(spe, c, k);
    return aFiltre("speTotal") ? applique("speTotal", v, { spe: spe, carac: c, comp: k }) : v;
  }

  // Un point de spécialité coûte un QUART d'XP : le total est donc décimal, et
  // c'est voulu. On l'arrondit au centième pour que l'en-tête n'affiche pas
  // 12.750000000000002.
  function speXpSocle(spe) {
    return Math.round(((spe && spe.pts) || 0) * repli("xpSpe") * 100) / 100;
  }
  function speXpAuto(spe) { return chaineAuto(lireSpe("xp", spe), speXpSocle(spe)); }
  function speXp(spe) {
    if (!spe) return 0;
    return chaine(lireSpe("xp", spe), speXpSocle(spe));
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

  // ---------- les arts ----------
  // CE QU'UN ART COÛTE, effets compris : celui de base et toutes les
  // améliorations. Les deux monnaies se comptent pareil, elles ne diffèrent que
  // par le champ lu.
  //
  // TOUT CE QUI EST ÉCRIT EST ACQUIS : une amélioration qui figure sur la fiche
  // est une amélioration que le personnage a. Il n'y a pas de liste de courses.
  function artSomme(a, champ) {
    if (!a) return 0;
    var t = (a.base && a.base[champ]) || 0, l = a.ameliorations || [], i;
    for (i = 0; i < l.length; i++) t += (l[i] && l[i][champ]) || 0;
    return Math.round(t * 100) / 100;
  }
  function artXp(a) { return artSomme(a, "xp"); }
  function artAvantage(a) { return artSomme(a, "avantage"); }
  function artsXp() {
    var t = 0, l = state.arts || [], i;
    for (i = 0; i < l.length; i++) t += artXp(l[i]);
    return Math.round(t * 100) / 100;
  }
  // AUCUN BUDGET D'AVANTAGE N'EXISTE : la page de règles ne dit pas un mot du
  // mot « avantage » comme monnaie. On totalise donc sans rien comparer — et le
  // jour où un total sera décidé, c'est ici qu'il se branchera.
  function artsAvantage() {
    var t = 0, l = state.arts || [], i;
    for (i = 0; i < l.length; i++) t += artAvantage(l[i]);
    return Math.round(t * 100) / 100;
  }

  // ---------- l'expérience ----------
  function xpDepenseBrut() {
    var xp = 0;
    champs().forEach(function (c) { xp += caracXp(c); });
    champsComp().forEach(function (c) { xp += compXp(c); });
    (state.specialites || []).forEach(function (s) { xp += speXp(s); });
    // LES ARTS COMPTENT, eux aussi : un coût qui n'entre pas dans le total
    // n'est pas un coût. Ils n'entrent en revanche pas dans xpChamp, qui
    // répartit l'xp par caractéristique — un art ne relève d'aucune.
    xp += artsXp();
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
