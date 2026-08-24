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

  function buildInitiative() {
    var b = block("Initiative", null, "initiative");
    var row = el("div", "pc-kv");
    var val = el("span", "pc-cval");
    row.appendChild(val);
    row.appendChild(el("span", "sp"));
    row.appendChild(miniBtn("Compteur", "Inscrire l'initiative au compteur de tours de Roll20",
                            initAuCompteur));
    b.appendChild(row);


    // construction : valeur forcée (vide = calculée) + divers, comme les PV.
    // Le forçage accepte le NÉGATIF, et c'est voulu : deux armures dans le sac
    // suffisent à passer sous zéro, et un plancher à zéro mentirait sur l'état
    // d'un personnage qui a tout chargé sur son dos.
    var mrow = el("div", "pc-pvmax pc-mods-host pc-edit-only");
    mrow.appendChild(el("span", "lbl", "Forcée"));
    var force = el("input", "force");
    force.type = "number"; force.step = "1";
    force.title = "Vide = calculée ; une valeur la force.";
    force.addEventListener("input", function () {
      var v = parseFloat(force.value);
      state.initiativeOverride = isFinite(v) ? clamp(Math.floor(v), -9999, 9999) : null;
      refresh();
    });
    hooks.push(function () {
      force.placeholder = String(initiativeAuto());
      if (document.activeElement !== force) {
        force.value = state.initiativeOverride === null ? "" : state.initiativeOverride;
      }
    });
    mrow.appendChild(force);
    mrow.appendChild(el("span", "lbl", "Modificateurs"));
    mrow.appendChild(multiMod(state.divers, "initiative"));
    mrow.appendChild(el("span", "sp"));
    b.appendChild(mrow);

    hooks.push(function () {
      val.textContent = String(initiative());
      var d = modSum(state.divers.initiative);
      val.classList.toggle("adj", state.initiativeOverride !== null || d !== 0);
    });
    return b;
  }

