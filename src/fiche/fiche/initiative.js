  // ---------- initiative ----------
  // L'INITIATIVE N'EST PLUS UNE COMPÉTENCE : les règles en font une VALEUR, que
  // l'équipement pousse et que la charge écrase. Elle garde son module parce
  // qu'on la relit à chaque combat, et parce qu'elle est le seul chiffre de la
  // fiche qui aille au compteur de tours de Roll20.
  //
  // ELLE SE LANCE : un d100, plus la valeur. Le bouton portait la valeur nue au
  // compteur, par un « 0d0 + n » qui faisait voyager une constante dans une
  // expression de jet — c'était une lecture déguisée en jet, et deux
  // personnages de même agilité agissaient toujours dans le même ordre.
  //
  // LE DÉ EST UN d100 NU, sans les seuils de critique du dé de test : on ne
  // réussit ni ne rate une initiative, on la compare.
  //
  // LE SIGNE SE POSE À LA MAIN : une valeur négative — deux armures dans le sac
  // suffisent — donnerait « 1d100+-5 », que le moteur de dés de Roll20 refuse.
  function initExpr(v) {
    return "1d100" + (v < 0 ? "-" + fmtP(-v) : "+" + fmtP(v));
  }
  function initAuCompteur() {
    var v = initiative();
    if (envoyer(cmdJetExpr("Initiative", initExpr(v), true))) return;
    flash("Initiative " + sign(v) + " : hors Roll20, aucun dé à lancer ni compteur où l'inscrire.");
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
    row.appendChild(miniBtn("Lancer", "Lancer 1d100 + l'initiative, et l'inscrire au compteur de tours de Roll20",
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

