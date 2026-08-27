  // ---------- l'endurance ----------
  // SON PROPRE MODULE, et non une moitié du bloc des PV. Les deux réserves ont
  // la même forme, mais elles ne se lisent pas au même moment : les PV pendant
  // qu'on encaisse, l'endurance pendant qu'on décide de forcer. Séparées, elles
  // se déplacent l'une sans l'autre, et se coupent l'une sans l'autre.
  //
  // Tout son gréement est celui des PV (pvReserve, pvForceRow) : deux réserves
  // qui se ressemblent doivent se ressembler jusque dans le code, sans quoi
  // l'une finit corrigée et l'autre non. Elle prend donc le module refait tel
  // quel — bandeau, jauge en blocs, quatre pas.
  //
  // AUCUN ROUAGE, PAS PLUS QUE SUR LES PV. Son maximum se construit dans
  // l'onglet Options, avec la même chaîne de leviers ; ne reste ici que ce qui
  // se joue — la réserve qu'on entame et qu'on refait.
  //
  // AVEC LUI S'EN EST ALLÉE « pvForceRow », la ligne de réglage à l'ancienne
  // (une valeur forcée, trois modificateurs). Elle vivait dans pv.js, avait
  // déménagé ici quand les PV étaient passés à la chaîne, et n'avait plus
  // d'appelant du jour où l'endurance l'a suivie.

  function buildEndurance() {
    // LE MÊME MODULE QUE LES PV, jusqu'au bandeau : deux réserves qui se lisent
    // pareil doivent se lire pareil, sans quoi l'une finit soignée et l'autre
    // négligée.
    // « END », ET NON « ENDURANCE ». Le bandeau porte le nom À CÔTÉ de la
    // valeur, sur un seul rang : le mot entier prenait la moitié d'une colonne
    // de deux cent quatorze pixels et devait s'abréger tout seul, en « ENDU... ».
    // Abrégé franchement, il tient, et il se lit comme les sigles des
    // caractéristiques et des compétences qui remplissent le reste de la feuille.
    var r = pvReserve("END", enduranceCourante,
                      function (v) { state.endurance = v; },
                      enduranceMax, endurancePlancher, function () {
      var pose = levierRegleDe(lireReserve("enduranceMax"));
      return {
        adj: pose,
        titre: pose
          ? chaineTexteDe(lireReserve("enduranceMax"), "des règles", enduranceMaxAuto())
          : ""
      };
    });
    // un ÉTAT du personnage, et rien d'autre. La règle qui le produit — le
    // malus général, la chute à moins cent pour cent — n'a pas à être ici.
    hooks.push(function () {
      r.etat.textContent = enduranceAuTapis() ? "Au tapis" : "";
    });
    return r.el;
  }
