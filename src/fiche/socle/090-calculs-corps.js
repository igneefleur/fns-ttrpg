  // ---------- le corps ----------
  // Les valeurs issues d'une division s'arrondissent à l'INFÉRIEUR.

  // PV = (20 + MOD CON + PHY) × 2 + SPÉ PV. « PHY » y désigne les POINTS de la
  // compétence Physique, pas son jet : c'est ce que le personnage a investi
  // dedans. La spécialité s'ajoute APRÈS le facteur, telle qu'elle est écrite.
  //
  // LE PLANCHER RESTE, bien qu'un produit d'entiers soit entier : les leviers
  // de l'onglet Options acceptent les décimales, et un facteur d'un demi posé
  // sur le MOD CON ou sur les points de PHY ferait rentrer une virgule ici.
  // LE LEVIER D'UNE RÉSERVE : la même chaîne que partout ailleurs, à ceci près
  // qu'une réserve n'a qu'UNE chose à régler — son maximum. Pas de troisième
  // niveau, donc : le nom du levier fait l'identité, comme sur une spécialité.
  function lireReserve(nom) {
    return function (boite) {
      var l = state.reservesLeviers && state.reservesLeviers[nom];
      return boiteNombre(l && l[boite]);
    };
  }
  // CE QUE LES RÈGLES DONNENT, et rien d'autre. Les trois modificateurs de
  // « divers » qui s'y ajoutaient sont passés dans la chaîne : ils y font ce
  // qu'ils faisaient, plus les facteurs et les deux groupes que trois cases ne
  // savaient pas dire.
  // LES NOMS SOUS LESQUELS LE MOTEUR RECONNAÎT SES DEUX SPÉCIALITÉS, et l'ordre
  // compte : le PREMIER est celui qu'on ÉCRIT, les suivants ceux qu'on ACCEPTE
  // ENCORE. « RÉCUP » s'est appelée « Récupération » jusqu'à la 1.25.2b, et une
  // fiche qui perdrait sa récupération sans un mot serait pire qu'un nom vieilli.
  //
  // speParNom() n'ôte PAS les accents : « Recuperation » n'est donc pas
  // « Récupération », et il n'y a pas de rattrapage à espérer de ce côté-là.
  // C'est cette liste, et elle seule, qui dit ce qui compte. Le module Vitalité
  // la lit aussi : les deux doivent chercher la même chose.
  var PV_NOMS = ["PV"];
  var RECUP_NOMS = ["RÉCUP", "Récupération"];
  function spePtsParNoms(noms) {
    for (var i = 0; i < noms.length; i++) {
      var s = speParNom(noms[i]);
      if (s) return spePts(s);
    }
    return 0;
  }
  function pvMaxAuto() {
    var base = (20 + caracMod("CON") + compPts("PHY")) * 2;
    return Math.floor(base) + spePtsParNoms(PV_NOMS);
  }
  // ON NE MATÉRIALISE RIEN, ET L'ON DÉFAIT LE CHEMIN quand la dernière valeur
  // s'en va : une table vide voyagerait jusque dans les Attributs Roll20 pour
  // ne rien dire. Même geste que boitesTable et boitesSpe (voir
  // commun-leviers.js), à un niveau de moins.
  function ecrireReserve(nom, boite, v) {
    if (!state.reservesLeviers || typeof state.reservesLeviers !== "object") {
      state.reservesLeviers = {};
    }
    var lv = state.reservesLeviers;
    if (v === undefined || v === null) {
      if (!lv[nom]) return;
      delete lv[nom][boite];
      if (!Object.keys(lv[nom]).length) delete lv[nom];
      return;
    }
    if (!lv[nom]) lv[nom] = {};
    lv[nom][boite] = v;
  }
  function pvMaxChaineAuto() { return chaineAuto(lireReserve("pvMax"), pvMaxAuto()); }
  function pvMaxBrut() { return chaine(lireReserve("pvMax"), pvMaxAuto()); }
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
  // CE QUE LES RÈGLES DONNENT, et rien d'autre — comme pour les PV. Les trois
  // modificateurs « divers » qui s'y ajoutaient sont passés dans la chaîne.
  function enduranceMaxAuto() { return caracMod("CON"); }
  function enduranceMaxChaineAuto() {
    return chaineAuto(lireReserve("enduranceMax"), enduranceMaxAuto());
  }
  function enduranceMaxBrut() {
    return chaine(lireReserve("enduranceMax"), enduranceMaxAuto());
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
  function recupPts() { return Math.min(spePtsParNoms(RECUP_NOMS), recupPlafond()); }
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
  // L'ENDURANCE SE REGAGNE EN ENTIER. Deux fois son maximum, dit la règle : la
  // réserve court de −max à +max, donc deux fois le maximum est exactement ce
  // qu'il faut pour la remplir depuis le fond. Une nuit suffit, quel que soit
  // l'état où l'on s'est couché.
  function recupEnduranceJourBrut() {
    return Math.floor(enduranceMax() * repli("recupEndurMult"));
  }
  function recupEnduranceJour() {
    var v = recupEnduranceJourBrut();
    return aFiltre("recupEnduranceJour") ? applique("recupEnduranceJour", v, {}) : v;
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
