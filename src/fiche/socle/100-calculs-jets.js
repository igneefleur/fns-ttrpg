  function caracJet(c) {
    return caracTotal(c);
  }
  // Initiative : une compétence de Body comme les autres, malus de poids compris.
  function initComp() { return state.comps[INIT_KEY] || blankComp(); }
  // LE POIDS NE SE SOUSTRAIT PLUS ICI (arbitrage du MJ, 2026-08-04). Body/Initiative
  // est une compétence de Body : compValue() lui applique déjà le malus, comme à
  // l'esquive ou à la course, et l'ôter une seconde fois le comptait deux fois.
  // Un seul mécanisme, appliqué une seule fois.
  //
  // Conséquence voulue : le malus de l'initiative est désormais ARRONDI à la
  // dizaine inférieure (19 de poids porté valent −10), là où cette ligne
  // soustrayait le poids exact. La formule des règles (« Initiative = D100 +
  // Body − poids ») reste vraie : « poids » y désigne ce malus arrondi.
  //
  // compValue() (le public, pas le brut) : un filtre sur le total d'une
  // compétence doit se voir dans l'initiative. L'arrondi au centième reste, les
  // modificateurs de compétence acceptant les décimales.
  function initiativeBrut() {
    return Math.round(compValue("Body", initComp(), INIT_KEY) * 100) / 100;
  }
  function initiative() {
    var v = initiativeBrut();
    return aFiltre("initiative") ? applique("initiative", v, {}) : v;
  }
  // Le Body qui INDEXE la table des vitesses : le POIDS NE S'EN RETRANCHE PLUS
  // (arbitrage du MJ, 2026-08-04). Porter lourd ne fait plus descendre le
  // personnage dans la table ; la charge ne touche la vitesse que par la
  // surcharge ci-dessous, et seulement quand elle dépasse le Body. Un seul
  // endroit le calcule, l'infobulle de la tuile le lit ici aussi, sinon elle
  // annoncerait un palier lu sur un autre chiffre que celui qui a servi.
  function bodyVitesse() { return caracTotal("Body"); }
  // La surcharge est un MALUS DE VITESSE, et la règle l'énonce désormais comme
  // tel (« notre vitesse diminue de 3 m »). L'ancienne formulation annonçait la
  // vitesse RÉSULTANTE (« passe à 6 m ») : elle ne tenait que parce que le poids
  // ramenait alors le palier au premier, ce qu'il ne fait plus. Un personnage
  // robuste et surchargé garde donc son palier, moins ces mètres-là.
  //
  // La valeur se LIT dans les données plutôt que de s'écrire ici : la fiche ne
  // porte aucune valeur de règles, et le jour où la phrase change, le malus suit
  // sans qu'on rouvre ce fichier. Données trop anciennes ou phrase reformulée :
  // la fiche n'invente rien, la surcharge ne s'applique simplement pas.
  function surchargeMalus() {
    var malus = parseFloat(DATA && DATA.vitesseSurcharge);
    return isFinite(malus) && malus > 0 ? malus : null;
  }
  function estSurcharge() {
    return surchargeMalus() !== null && poidsMalus() > caracTotal("Body");
  }
  // la table des règles donne une CHAÎNE (« 10.5 m ») : le palier s'extrait en
  // nombre pour recevoir les divers, puis se réaffiche avec son unité
  function vitessePalier() {
    // arrondi à l'inférieur : un Body décimal (divers) tomberait sinon dans
    // les trous de la table (39.5 entre les lignes 0-39 et 40-79) et
    // retomberait sur la DERNIÈRE ligne, la vitesse maximale
    var b = Math.floor(Math.max(0, bodyVitesse()));   // négatif : 1er palier
    var rows = DATA.vitesses || [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (b >= r.min && (r.max === null || b <= r.max)) return r.vitesse;
    }
    return rows.length ? rows[rows.length - 1].vitesse : "";
  }
  function vitesseBase() {
    // UNE SEULE PRISE DE LA CHARGE SUR LA VITESSE, et c'est la surcharge : le
    // palier se lit sur le Body plein, puis, si la charge dépasse ce Body, la
    // règle retranche ses mètres. Le poids ne fait plus descendre le personnage
    // dans la table (il le faisait avant l'arbitrage du 2026-08-04, et les deux
    // effets se cumulaient alors).
    //
    // Les modificateurs divers et le forçage du MJ restent en aval : ici comme
    // partout ailleurs, ils ont le dernier mot.
    var n = parseFloat(vitessePalier());
    if (!isFinite(n)) return 0;
    if (estSurcharge()) n -= surchargeMalus();
    // jamais négatif : on ne recule pas parce qu'on porte trop
    return Math.max(0, n);
  }
  function vitesseAuto() {
    return Math.max(0, vitesseBase() + modSum(state.divers.vitesse));
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
