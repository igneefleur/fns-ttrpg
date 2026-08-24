  // ---------- le corps ----------
  // Les valeurs issues d'une division s'arrondissent à l'INFÉRIEUR.

  // PV = (20 + MOD CON + PHY) / 2 + SPÉ PV. « PHY » y désigne les POINTS de la
  // compétence Physique, pas son jet : c'est ce que le personnage a investi
  // dedans. La spécialité s'ajoute APRÈS la division, telle qu'elle est écrite.
  function pvMaxAuto() {
    var base = (20 + caracMod("CON") + compPts("PHY")) / 2;
    return Math.floor(base) + spePtsParNom("PV") + modSum(state.divers.pvMax);
  }
  function pvMaxBrut() { return state.pvMaxOverride !== null ? state.pvMaxOverride : pvMaxAuto(); }
  function pvMax() {
    var v = pvMaxBrut();
    return aFiltre("pvMax") ? applique("pvMax", v, {}) : v;
  }
  function pvCourant() { return state.pv === null ? pvMax() : state.pv; }
  // LA BARRE NÉGATIVE. Le personnage meurt à −100 % de ses PV maximaux : le
  // plancher de la seconde barre est donc l'opposé du maximum.
  function pvPlancher() { return -pvMax(); }
  function pvMort() { return pvCourant() <= pvPlancher(); }
  // Le seuil du jet d'obstination, à faire chaque fois que des dégâts font
  // passer les PV dans le négatif : la part du maximum déjà creusée, en
  // pourcents. À −30 sur 60 de maximum, le seuil est 50.
  function obstinationDD() {
    var m = pvMax();
    if (m <= 0 || pvCourant() >= 0) return 0;
    return Math.round(Math.abs(pvCourant()) / m * 100);
  }

  // ---------- l'endurance ----------
  // Une réserve égale au MOD CON, qui descend jusqu'à son opposé. Dans le
  // négatif, sa valeur absolue devient un malus sur TOUS les jets — c'est le
  // seul malus général du système, et il se lit ici.
  function enduranceMaxAuto() { return caracMod("CON") + modSum(state.divers.endurance); }
  function enduranceMaxBrut() {
    return state.enduranceMaxOverride !== null ? state.enduranceMaxOverride : enduranceMaxAuto();
  }
  function enduranceMax() {
    var v = enduranceMaxBrut();
    return aFiltre("enduranceMax") ? applique("enduranceMax", v, {}) : v;
  }
  function endurancePlancher() { return -enduranceMax(); }
  function enduranceCourante() {
    return state.endurance === null ? enduranceMax() : state.endurance;
  }
  function enduranceMalusBrut() { return Math.max(0, -enduranceCourante()); }
  function enduranceMalus() {
    var v = enduranceMalusBrut();
    return aFiltre("enduranceMalus") ? applique("enduranceMalus", v, {}) : v;
  }
  // À −100 % de sa réserve, le personnage tombe et ne se relève qu'au plein.
  function enduranceAuTapis() {
    return enduranceMax() > 0 && enduranceCourante() <= endurancePlancher();
  }

  // ---------- la récupération ----------
  // Une spécialité unique, dont le plafond n'est PAS celui des autres : MOD CON
  // fois le multiplicateur des règles. Elle commande ce qu'on regagne par jour.
  function recupPlafond() { return caracMod("CON") * repli("recupMult"); }
  function recupPts() { return Math.min(spePtsParNom("Récupération"), recupPlafond()); }
  function recupJourAuto() {
    return Math.floor((caracMod("CON") + recupPts()) / 2) + modSum(state.divers.recup);
  }
  function recupJourBrut() {
    return state.recupOverride !== null ? state.recupOverride : recupJourAuto();
  }
  function recupJour() {
    var v = recupJourBrut();
    return aFiltre("recupJour") ? applique("recupJour", v, {}) : v;
  }

  // ---------- la charge ----------
  // Le poids des objets se calcule ICI et nulle part ailleurs : le module
  // d'inventaire lit les mêmes trois fonctions que poidsPorteBrut(). Deux
  // calculs séparés finiraient par se contredire à l'écran (le pied du module
  // annonçant un chiffre, l'initiative en supposant un autre), ce qui est pire
  // que l'absence du réglage.
  //
  // Un groupe décoché est posé au sol : ses objets restent dans la fiche, se
  // lisent, se donnent et se déplacent, mais leur poids ne pèse plus sur le
  // personnage.
  function invCompte(gi) { return state.inv.comptes[gi] !== false; }
  function poidsGroupe(gi) {
    var t = 0;
    state.inv.objets.forEach(function (o) {
      if (o.groupe === gi) t += pnum(o.qte) * pnum(o.poids);
    });
    return Math.round(t * 100) / 100;
  }
  // porte = true : ce qui est SUR le personnage ; false : ce qu'il a posé.
  function poidsObjets(porte) {
    var t = 0;
    state.inv.groupes.forEach(function (_, gi) {
      if (invCompte(gi) === porte) t += poidsGroupe(gi);
    });
    return Math.round(t * 100) / 100;
  }
  function poidsPorteBrut() {
    var t = 0;
    state.armes.forEach(function (a) { t += pnum(a.poids); });
    state.armures.forEach(function (a) { t += pnum(a.poids); });
    // les groupes posés au sol ne pèsent plus : c'est la case du bandeau. Les
    // armes et les armures, elles, sont toujours sur le personnage.
    t += poidsObjets(true);
    return Math.round(t * 100) / 100;
  }
  function poidsPorte() {
    var v = poidsPorteBrut();
    return aFiltre("poidsPorte") ? applique("poidsPorte", v, {}) : v;
  }
  // Ce que le personnage peut porter : le plus haut de ses deux modificateurs
  // de force et de constitution.
  function chargeMaxAuto() {
    return Math.max(caracMod("CON"), caracMod("FOR")) + modSum(state.divers.charge);
  }
  function chargeMaxBrut() {
    return state.chargeOverride !== null ? state.chargeOverride : chargeMaxAuto();
  }
  function chargeMax() {
    var v = chargeMaxBrut();
    return aFiltre("chargeMax") ? applique("chargeMax", v, {}) : v;
  }
  function chargePct() {
    var m = chargeMax();
    return m > 0 ? poidsPorte() / m * 100 : (poidsPorte() > 0 ? Infinity : 0);
  }
  // LES PALIERS FRANCHIS, du plus bas au plus haut. Ils se CUMULENT : à 100 %,
  // les trois s'appliquent l'un après l'autre. Les seuils viennent des règles,
  // leurs effets de CHARGE_EFFETS — les deux doivent bouger ensemble.
  function chargePaliers() {
    var pct = chargePct(), out = [];
    ((regles().charge) || []).forEach(function (p) {
      if (pct >= p.seuil && CHARGE_EFFETS[p.seuil]) {
        out.push({ seuil: p.seuil, effets: p.effets, calc: CHARGE_EFFETS[p.seuil] });
      }
    });
    out.sort(function (a, b) { return a.seuil - b.seuil; });
    return out;
  }
  // Le malus que la charge fait peser sur l'esquive, une fois les paliers
  // additionnés. Les modules et les infobulles le lisent ici plutôt que de le
  // recomposer, sinon ils finiraient par énumérer un terme que le total n'a pas
  // subi.
  function chargeMalusEsquive() {
    var t = 0;
    chargePaliers().forEach(function (p) { t += (p.calc.esq || 0); });
    return t;
  }
