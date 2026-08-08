  // PV, régénération et coûts d'xp lisent caracTotal("Body") SANS le malus de
  // poids, et c'est voulu : la charge ne mord que sur les compétences de Body
  // (hors armes) et sur la vitesse, or aucun de ces trois-là n'en est. Un sac
  // lourd ralentit et fait rater, il ne coûte ni points de vie maximum, ni
  // régénération quotidienne, ni xp.
  // les valeurs issues d'une division s'arrondissent à l'INFÉRIEUR
  function pvMaxAuto() { return Math.floor((20 + caracTotal("Body")) / 2) + modSum(state.divers.pvMax); }
  // PV max : la valeur forcée (Options du bloc PV) court-circuite le calcul
  function pvMaxBrut() { return state.pvMaxOverride !== null ? state.pvMaxOverride : pvMaxAuto(); }
  function pvMax() {
    var v = pvMaxBrut();
    return aFiltre("pvMax") ? applique("pvMax", v, {}) : v;
  }
  function pvCourant() { return state.pv === null ? pvMax() : state.pv; }
  function regenAuto() { return Math.max(0, Math.floor(caracTotal("Body") / 10) + modSum(state.divers.regen)); }
  function regenBrut() { return state.regenOverride !== null ? state.regenOverride : regenAuto(); }
  function regen() {
    var v = regenBrut();
    return aFiltre("regen") ? applique("regen", v, {}) : v;
  }
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
  // Poids porté : tout ce que le personnage a sur lui — armes, armures et
  // objets de l'inventaire (quantité comprise). C'est la SOURCE du malus, pas le
  // malus : il s'affiche tel quel partout où il s'affichait, et poidsMalus() en
  // tire le chiffre qui pénalise réellement les jets.
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
  // LE MALUS, qui n'est pas le poids : les règles arrondissent le total porté à
  // la dizaine INFÉRIEURE, si bien qu'un poids de 19 n'ôte que 10 et qu'un poids
  // de 9 n'ôte rien. Il se dérive de poidsPorte() (le public, pas le brut) pour
  // qu'un filtre de mod sur le poids se voie dans le malus.
  //
  // Math.max(0 : un filtre peut rendre un poids NÉGATIF (applique() ne vérifie
  // que la finitude), et Math.floor(−5 / 10) × 10 vaut −10, c'est-à-dire un
  // BONUS de 10 à tous les jets de Body que personne n'a demandé.
  function poidsMalusBrut() {
    return Math.max(0, Math.floor(poidsPorte() / 10) * 10);
  }
  function poidsMalus() {
    var v = poidsMalusBrut();
    return aFiltre("poidsMalus") ? applique("poidsMalus", v, {}) : v;
  }
  // La caractéristique telle qu'on la LANCE.
  //
  // LE POIDS NE PÈSE PLUS SUR LA CARACTÉRISTIQUE (arbitrage du MJ, 2026-08-04) :
  // lancer Body en direct se fait au total plein. La charge garde ses deux autres
  // prises, et elles seules : les COMPÉTENCES de Body hors armes (compPoidsMalus)
  // et la VITESSE, dont le palier se lit sur un Body diminué (bodyVitesse), la
  // surcharge en plus. Un seul mécanisme par endroit, jamais deux fois le même.
  //
  // La fonction reste, plutôt que d'appeler caracTotal partout : elle est le point
  // unique où la question « ce jet subit-il la charge ? » se pose, l'affichage en
  // tire le « · poids −N » de la tuile (nul, donc absent), et les mods l'appellent
  // par l'API. Si l'arbitrage rebasculait, une ligne suffirait.
