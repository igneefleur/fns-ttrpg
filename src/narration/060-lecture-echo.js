
  // ---------- lecture de l'état ----------
  // Un attribut revenu de Roll20 ne prime pas toujours : il perd contre le
  // jeton qu'on a dans la main, et contre une écriture toute fraîche qui n'a
  // pas encore fait l'aller-retour. Passé le délai de garde, il reprend la main
  // (notre écriture s'est perdue, ou quelqu'un a poussé le même jeton).
  // UNE PERTE PAR LOT, ET NON PAR ATTRIBUT. Une distribution écrit N attributs
  // d'un coup ; si deux joueurs poussent leur jeton dans la foulée — c'est
  // exactement ce qu'on fait après une donne — deux de ces attributs reviennent
  // différents, le compteur montait de deux d'un seul coup, et le plateau se
  // déclarait refusé DÉFINITIVEMENT sur un conflit parfaitement normal. On ne
  // compte donc qu'une perte pour un même instant d'écriture.
  var perdues = 0;
  var dernierePerte = 0;
  // Ce que Roll20 disait à la dernière lecture, attribut par attribut.
  var dernierLu = {};
  function retenu(nom, distant) {
    var a = attente[nom];
    if (!a) return false;
    // Une écriture qui REVIENT prouve que Roll20 accepte : le refus se lève.
    // Sans cela, un seul conflit passager condamnait le plateau jusqu'au
    // rechargement, et le joueur n'avait aucun moyen de le savoir.
    if (a.val === distant) {
      delete attente[nom];
      perdues = 0; refuse = false;
      // Un fond qui revient de Roll20, c'est la taille qui passe : c'est là,
      // et nulle part ailleurs, qu'on apprend la limite du serveur.
      if (envoi && nom === A_BG + envoi.id) fondPasse();
      return false;
    }
    if (Date.now() - a.t < (a.marge || GARDE)) return true;
    delete attente[nom];
    // UN FOND PERDU NE DIT RIEN DES DROITS DU JOUEUR : c'est très probablement
    // sa taille que Roll20 a refusée, et la réduction va le prouver. Le compter
    // comme une perte ordinaire mettait tout le plateau en lecture seule au bout
    // de deux images trop lourdes, et sans rapport avec le partage du personnage.
    if (envoi && nom === A_BG + envoi.id) { fondRefuse(); return false; }
    // Notre écriture n'est jamais revenue. Une fois, c'est quelqu'un qui a
    // poussé le même jeton en même temps ; deux fois de suite, c'est que Roll20
    // refuse nos écritures (le personnage n'est pas partagé avec ce joueur, ou
    // le pronostic du pont s'est trompé). On le DIT plutôt que de laisser les
    // jetons revenir en arrière sans explication.
    if (a.t !== dernierePerte) {
      dernierePerte = a.t;
      if (++perdues >= 2) { refuse = true; perdues = 0; }
      // Les homonymes, eux, sont relevés par le PONT et voyagent dans « ecrits » :
      // la note d'attente ne les a jamais portés, et les redemander ici ne
      // rendait qu'un « null » qui faisait croire à un attribut sans doublon.
      trace("ecriture perdue", { attribut: nom, attendu: a.val, recu: distant,
                                 avant: a.avant,
                                 verdict: (a.avant != null && String(distant) === String(a.avant))
                                   ? "notre ecriture n a pas pris"
                                   : "un autre a ecrit (ou valeur inconnue)" });
    }
    return false;
  }

  // Tous les identifiants de jetons VUS chez Roll20, y compris ceux dont la
  // valeur est vide (jeton retiré). La distribution s'en sert pour ne pas
  // laisser derrière elle les jetons créés par la distribution de quelqu'un
  // d'autre, qu'elle ne verrait pas autrement.
  var connus = {};
  var vide = 0;   // lectures vides consécutives
