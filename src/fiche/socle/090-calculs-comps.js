  // ---- compétences ----
  function compDe(id) {
    var out = null;
    state.comps.forEach(function (c) { if (c.id === id) out = c; });
    return out;
  }
  function compRang(c) { return c ? clamp(num(c.rang, 0), 0, rangMax()) : 0; }
  // Les DÉS qu'une compétence engage au plus : ceux de son rang, ou le nombre
  // forcé par le MJ. Le joueur peut toujours en engager moins (barre d'envoi,
  // segment « Dés engagés ») : c'est un plafond, pas une obligation.
  function compDesBrut(c) {
    if (!c) return 0;
    return Math.floor(chaine(lireComp("des", c.id), num(rangInfo(compRang(c)).des, 0)));
  }
  function compDes(c) { return pub("compDes", compDesBrut(c), { comp: c }); }
  // Le BONUS d'une compétence : celui de son rang, passé à la chaîne.
  function compBonusAuto(c) { return num(rangInfo(compRang(c)).bonus, 0); }
  function compBonusBrut(c) {
    if (!c) return 0;
    return chaine(lireComp("bonus", c.id), compBonusAuto(c));
  }
  function compBonus(c) { return pub("compBonus", compBonusBrut(c), { comp: c }); }
  // Les rangs OFFERTS d'une compétence : ceux qu'elle a reçus sans XP. Ils se
  // posent au levier « offerts » des Options et valent pour les PREMIERS
  // rangs. La valeur brute n'est pas coiffée par le rang : offrir deux rangs
  // à une compétence encore au Rang 0 rend gratuits les deux qu'elle prendra.
  function compOffertsBrut(c) {
    return c ? Math.max(0, Math.round(chaine(lireComp("offerts", c.id), 0))) : 0;
  }
  function compOfferts(c) { return Math.min(compOffertsBrut(c), compRang(c)); }
  // Ce qu'une compétence a coûté : la somme des rangs pris, prix par prix, hors
  // rangs offerts. Les prix viennent des règles, jamais d'ici.
  function compXpAuto(c) {
    var xp = 0, r = rangs(), i;
    for (i = compOfferts(c) + 1; i <= compRang(c) && i < r.length; i++) xp += num(r[i].xp, 0);
    return xp;
  }
  function compXpBrut(c) {
    if (!c) return 0;
    return chaine(lireComp("xp", c.id), compXpAuto(c));
  }
  function compXp(c) { return pub("compXp", compXpBrut(c), { comp: c }); }
  // Les points de rupture qu'une compétence engage : ceux de ses rangs.
  function compRuptureAuto(c) {
    var t = 0, r = rangs(), i;
    for (i = 1; i <= compRang(c) && i < r.length; i++) t += num(r[i].rupture, 0);
    return t;
  }
  function compRupture(c) {
    if (!c) return 0;
    return chaine(lireComp("rupture", c.id), compRuptureAuto(c));
  }
  // Une compétence est INVESTIE dès que quelque chose y est posé : un rang, un
  // modificateur, un forçage. Sans ce dernier point, la puce « Investies »
  // cacherait la compétence qu'on vient justement de régler.
  function compInvestie(c) {
    if (!c) return false;
    return compRang(c) > 0 ||
           levierRegleDe(lireComp("bonus", c.id)) ||
           levierRegleDe(lireComp("des", c.id)) ||
           levierRegleDe(lireComp("offerts", c.id));
  }
  function compGroupe(c) { return String(c.groupe || "").trim(); }

  // ---- limites de rangs ----
  // Combien de rangs de compétence et de technique le personnage porte en
  // tout : la somme de ses caractéristiques (création + expérience, SANS les
  // leviers du MJ) divisée comme les règles le disent. null quand les règles
  // manquent : aucune limite inventée.
  function sommeCaracs() {
    var t = 0;
    caracsOrdre().forEach(function (c) { t += caracVal(c); });
    return t;
  }
  function limiteRangs(cle) {
    var l = (D().limites || {})[cle];
    if (!l) return null;
    var q = sommeCaracs() / Math.max(1, num(l.diviseur, 1));
    return l.arrondi === "haut" ? Math.ceil(q) : Math.floor(q);
  }
  // Les rangs qui COMPTENT : les rangs pris, moins les rangs offerts.
  function compRangsComptes() {
    var t = 0;
    state.comps.forEach(function (c) { t += compRang(c) - compOfferts(c); });
    return t;
  }
  function techOfferts(t) { return clamp(num(t.offert, 0), 0, num(t.rang, 0)); }
  function techRangsComptes() {
    var n = 0;
    state.techniques.forEach(function (t) { n += Math.max(0, num(t.rang, 0) - techOfferts(t)); });
    return n;
  }
  // Ce qu'une montée de `de` à `a` ajoute au compte, les rangs offerts
  // (les `offert` premiers) n'y entrant pas.
  function rangsComptesEntre(de, a, offert) {
    var n = 0, i;
    for (i = de + 1; i <= a; i++) if (i > offert) n++;
    return n;
  }

  // ---- techniques, expérience, rupture ----
  function techXp(t) { return Math.max(0, num(t.xp, 0)); }
  function techRupture(t) { return Math.max(0, num(t.rupture, 0)); }
  function xpDepenseBrut() {
    var xp = 0;
    state.comps.forEach(function (c) { xp += compXp(c); });
    state.techniques.forEach(function (t) { xp += techXp(t); });
    return xp + caracsXpDepense();
  }
  function xpDepense() { return pub("xpDepense", xpDepenseBrut(), {}); }
  function xpRestant() { return state.xpTotal - xpDepense(); }
  // Les points de rupture ENGAGÉS : ceux des Rangs Max et ceux que les
  // techniques ont demandés. Le compteur de l'en-tête et le bloc Rupture lisent
  // tous deux ces fonctions.
  function ruptureComps() {
    var t = 0;
    state.comps.forEach(function (c) { t += compRupture(c); });
    return t;
  }
  function ruptureTechs() {
    var t = 0;
    state.techniques.forEach(function (x) { t += techRupture(x); });
    return t;
  }
  function ruptureDepense() { return ruptureComps() + ruptureTechs(); }
  function ruptureRestante() { return ruptureMax() - ruptureDepense(); }

