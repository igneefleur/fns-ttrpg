  // ---------- initiative ----------
  // L'INITIATIVE N'EST PLUS UNE COMPÉTENCE : les règles en font une VALEUR, que
  // l'équipement pousse et que la charge écrase. Elle garde son module parce
  // qu'on la relit à chaque combat, et parce qu'elle est le seul chiffre de la
  // fiche qui aille au compteur de tours de Roll20.
  //
  // AUCUN DÉ NE LA DÉCIDE : personne ne « lance » son initiative dans MIA. Le
  // bouton porte donc la valeur telle quelle au compteur, sans passer par
  // doJet, qui bâtirait un d100 que le jeu ne demande nulle part. « 0d0 + n »
  // est la forme dont le moteur se sert déjà pour faire voyager une constante
  // dans une expression de jet (jetExpr y pose la limite) ; le drapeau du
  // compteur s'y attache comme au reste.
  function initAuCompteur() {
    var v = initiative();
    if (envoyer(cmdJetExpr("Initiative", "0d0+" + v, true))) return;
    flash("Initiative : " + v + " (hors Roll20 : aucun compteur de tours où l'inscrire).");
  }

  // AUCUN ROUAGE : ce qui se CONSTRUIT — la valeur forcée, les modificateurs —
  // s'est retiré dans l'onglet Options, où l'initiative a la même chaîne de
  // leviers que tout le reste. Il ne reste ici que ce qui se JOUE : le chiffre
  // qu'on relit à chaque combat, et le bouton qui l'inscrit au compteur.
  function buildInitiative() {
    var b = block("Initiative");
    var row = el("div", "pc-kv");
    var val = el("span", "pc-cval");
    row.appendChild(val);
    row.appendChild(el("span", "sp"));
    row.appendChild(miniBtn("Compteur", "Inscrire l'initiative au compteur de tours de Roll20",
                            initAuCompteur));
    b.appendChild(row);

    hooks.push(function () {
      val.textContent = String(initiative());
      // la teinte dit qu'un levier mord, comme partout ailleurs
      val.classList.toggle("adj", levierRegleDe(lireReserve("initiative")));
      val.title = chaineTexteDe(lireReserve("initiative"), "des règles", initiativeAuto());
    });
    return b;
  }

