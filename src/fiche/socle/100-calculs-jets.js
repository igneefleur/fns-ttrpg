  // ---------- les jets ----------
  // UN JET N'EST PAS UN DÉ PLUS UN BONUS : c'est un couple, « d100 + bonus » et
  // « la limite », dont on garde le PLUS BAS. La limite plafonne donc le
  // résultat, et Roll20 l'affiche déjà plafonné, sans qu'un joueur ait à
  // comparer deux nombres au tchat. D'où la forme {…,0d0+LIM}kl1 : le second
  // terme est un dé à zéro face, c'est-à-dire une constante.
  //
  // Le MALUS D'ENDURANCE entre ici, et ici seulement : il pèse sur TOUS les
  // jets, donc l'écrire dans chaque appelant reviendrait à l'oublier une fois.
  // UNE SPÉCIALITÉ NE S'ADDITIONNE PAS TERME À TERME : son total est déjà
  // composé — ses points, le MOD de sa caractéristique, les points de sa
  // compétence — et surtout déjà RABATTU par la règle de l'écart. Le
  // recomposer ici rendrait le rabattage sans effet.
  //
  // Ce qui vient APRÈS le total, et qui n'entre donc pas dans le rabattage :
  // le bonus de la ligne, le malus de charge sur l'esquive, et le malus
  // d'endurance — qui pèse sur TOUS les jets, donc l'écrire dans chaque
  // appelant reviendrait à l'oublier une fois.
  //
  // LA CARACTÉRISTIQUE ET LA COMPÉTENCE PASSENT JUSQU'AU TOTAL, et il a fallu un
  // défaut de partie pour s'en apercevoir : sous « Au choix », le plafond du jet
  // employait la caractéristique choisie pendant que le total, lui, restait sur
  // celle de la spécialité — retrait de l'écart compris. Un joueur gardait donc
  // un retrait calculé sous une limite qui n'était plus la sienne.
  //
  // Pour une COMPÉTENCE, le second argument EST le jet : le choisir autre n'a
  // pas de sens, on lancerait l'autre compétence. Il ne sert donc qu'aux
  // spécialités, et c'est ce que dit la barre d'envoi.
  function jetBonusBrut(carac, comp, spe) {
    var b = -enduranceMalus();
    if (spe) b += speTotal(spe, carac, comp) + speBonus(spe) + speMalusCharge(spe);
    else {
      b += caracMod(carac);
      if (comp) b += compPts(comp);
    }
    return Math.round(b);
  }
  function jetBonus(carac, comp, spe) {
    var v = jetBonusBrut(carac, comp, spe);
    return aFiltre("jetBonus")
      ? applique("jetBonus", v, { carac: carac, cle: comp, spe: spe })
      : v;
  }
  // La charge ne mord que sur l'esquive, et l'esquive est une SPÉCIALITÉ : le
  // malus s'applique donc au jet qui la porte, pas à sa compétence entière.
  function speMalusCharge(spe) {
    if (!spe || String(spe.nom || "").trim().toLowerCase() !== CHARGE_ESQUIVE.toLowerCase()) return 0;
    return chargeMalusEsquive();
  }
  // L'expression Roll20 d'un jet, prête à poser entre les doubles crochets.
  //
  // LE MODIFICATEUR SAISI À L'ENVOI S'AJOUTE APRÈS LE PLAFOND, hors du groupe.
  // C'est la règle de l'endurance : ce qu'on dépense « est un bonus qu'on
  // ajoute à la fin ». La limite borne donc ce que le personnage vaut par
  // lui-même ; l'endurance est ce par quoi il la dépasse, et c'est tout son
  // prix. Posé dans le groupe, ce bonus serait rogné et ne servirait à rien
  // dès qu'un personnage atteint sa limite — c'est-à-dire justement quand il
  // en aurait besoin.
  //
  // LE DÉ EST CELUI DU RÉGLAGE, ET NON LA CONSTANTE. Le champ « Dé des jets de
  // test » écrivait dans l'état sans que rien ne le lise : on pouvait y mettre
  // ce qu'on voulait, la fiche lançait toujours le même dé. Il commande
  // maintenant ce qu'elle lance, marqueurs de critique compris.
  //
  // LE MODIFICATEUR EST UN NOMBRE, ET NON PLUS UNE REQUÊTE. La fiche le demande
  // elle-même, comme le reste : elle envoie donc une expression entièrement
  // calculée, sans requête ni entité — soixante-seize signes au lieu de quatre
  // mille, et rien à échapper.
  function jetExpr(bonus, lim, modif) {
    var b = Math.round(bonus);
    var m = Math.round(modif || 0);
    return "{" + deTest() + (b >= 0 ? "+" : "-") + Math.abs(b) +
           ",0d0+" + Math.round(lim) + "}kl1" +
           (m ? (m > 0 ? "+" : "-") + Math.abs(m) : "");
  }

  // ---------- l'initiative ----------
  // Base MOD AGI × 2. L'équipement s'y ajoute de deux façons qui ne sont PAS
  // symétriques, et c'est la règle : les BONUS ne comptent que pour ce qui est
  // porté activement, les MALUS comptent pour tout ce qu'on transporte. Un
  // personnage qui range une armure dans son sac en garde donc le malus.
  function equipInitBonus() {
    var t = 0;
    function prendre(o) {
      var v = pnum(o && o.ini);
      if (!v) return;
      if (v > 0) { if (o.porte !== false) t += v; }   // bonus : seulement porté
      else t += v;                                     // malus : toujours
    }
    state.armes.forEach(prendre);
    state.armures.forEach(prendre);
    return t;
  }
  // Mains nues : le bonus des règles, quand aucune arme n'est en main.
  function mainsNues() {
    for (var i = 0; i < state.armes.length; i++) if (state.armes[i].porte !== false) return false;
    return true;
  }
  function initiativeAuto() {
    var v = caracMod("AGI") * repli("iniMult") + equipInitBonus();
    if (mainsNues()) v += repli("iniMainsNues");
    chargePaliers().forEach(function (p) {
      if (p.calc.ini) v += p.calc.ini;
      if (p.calc.iniDiv) v = v / p.calc.iniDiv;
    });
    return Math.floor(v) + modSum(state.divers.initiative);
  }
  function initiativeBrut() {
    return state.initiativeOverride !== null ? state.initiativeOverride : initiativeAuto();
  }
  function initiative() {
    var v = initiativeBrut();
    return aFiltre("initiative") ? applique("initiative", v, {}) : v;
  }

  // ---------- la vitesse ----------
  // L'AGILITÉ SE MULTIPLIE PAR ELLE-MÊME : 5 en agilité valent 25 mètres, 10 en
  // valent 100. La progression n'est donc pas linéaire, et c'est la règle qui le
  // veut ; la forme carrée se lit dans la page, elle ne se décide pas ici.
  function vitesseAuto() {
    var agi = caracTotal("AGI");
    var v = repli("vitesseCarre") ? agi * agi : agi * repli("vitesseMult");
    chargePaliers().forEach(function (p) { if (p.calc.vitesseDiv) v = v / p.calc.vitesseDiv; });
    return Math.max(0, v + modSum(state.divers.vitesse));
  }
  function vitesseValBrut() {
    return state.vitesseOverride !== null ? state.vitesseOverride : vitesseAuto();
  }
  // le filtre porte sur le NOMBRE de mètres, jamais sur la chaîne rendue par
  // vitesse() : un mod qui double la vitesse fait une multiplication, pas une
  // opération de texte
  function vitesseVal() {
    var v = vitesseValBrut();
    return aFiltre("vitesse") ? applique("vitesse", v, {}) : v;
  }
  function vitesse() { return fmtP(vitesseVal()) + " m"; }

  // ---------- les sauts ----------
  // Les deux sauts partagent le diviseur de charge : c'est le même palier qui
  // les écrase, et la règle ne les sépare qu'au multiplicateur.
  function sautDiv() {
    var d = 1;
    chargePaliers().forEach(function (p) { if (p.calc.sautDiv) d *= p.calc.sautDiv; });
    return d;
  }
  // LES DEUX SAUTS SE RÈGLENT COMME LA VITESSE : valeur forcée, modificateurs,
  // point de filtre. Ce sont trois distances de déplacement, elles subissent
  // les mêmes paliers de charge, et un MJ qui peut décaler l'une sans pouvoir
  // décaler les autres n'a pas un réglage : il a un trou.
  // Les modificateurs entrent APRÈS la division de charge, comme pour la
  // vitesse : ce sont des mètres qu'on ajoute, pas un facteur qu'on rogne.
  function sautLongAuto() {
    var v = caracTotal("FOR") * repli("sautLong") / sautDiv();
    return Math.max(0, v + modSum(state.divers.sautLong));
  }
  function sautLongValBrut() {
    return state.sautLongOverride !== null ? state.sautLongOverride : sautLongAuto();
  }
  function sautLongVal() {
    var v = sautLongValBrut();
    return aFiltre("sautLong") ? applique("sautLong", v, {}) : v;
  }
  function sautHautAuto() {
    var d = repli("sautHaut") || 1;
    var v = caracTotal("FOR") / d / sautDiv();
    return Math.max(0, v + modSum(state.divers.sautHaut));
  }
  function sautHautValBrut() {
    return state.sautHautOverride !== null ? state.sautHautOverride : sautHautAuto();
  }
  function sautHautVal() {
    var v = sautHautValBrut();
    return aFiltre("sautHaut") ? applique("sautHaut", v, {}) : v;
  }
  function sautLong() { return fmtP(sautLongVal()) + " m"; }
  function sautHaut() { return fmtP(sautHautVal()) + " m"; }
