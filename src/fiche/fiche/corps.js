  // ---- 2. Corps : charge, accès rapides, dés d'action ----
  // (l'innocence a son propre module, sur le modèle des PV : voir vitales.js)
  function buildCorps() {
    var b = block("Corps", null, "corps");

    var r1 = el("div", "pc-bigrow pc-bigrow-2");
    function tuileLimite(cle, libelle, pris, total) {
      var t = bigTile(libelle, function () {
        return fmtP(pris()) + " / " + fmtP(total());
      });
      t.classList.add("pc-mods-host");
      tuileForce(t, cle, function () { return autoDe(cle); });
      tuileMods(t, cle);
      hooks.push(function () {
        var over = pris() > total();
        t.classList.toggle("adj", over || capForce(cle));
        t.title = libCap(cle, libelle) + " : " + fmtP(pris()) + " sur " + fmtP(total()) +
                  (over ? " — dépassé" : "") +
                  (capForce(cle) ? " · maximum forcé (calculé : " + fmtP(autoDe(cle)) + ")"
                                 : " · " + provenanceCap(cle)());
      });
      return t;
    }
    r1.appendChild(tuileLimite("charge", "CHARGE", poidsPorte, charge));
    r1.appendChild(tuileLimite("acces", "ACCÈS RAPIDES", accesPris, accesRapides));
    // (la contenance a son propre module, l'estomac : voir contenance.js)
    b.appendChild(r1);

    // Deuxième rangée : ce que le corps donne au tour, sur toute la largeur.
    var r2 = el("div", "pc-bigrow pc-bigrow-1");
    var tD = bigTile("DÉS D'ACTION", function () { return fmtP(desAction()); });
    tD.classList.add("pc-mods-host");
    tuileForce(tD, "desAction", desActionAuto);
    tuileMods(tD, "desAction");
    hooks.push(function () {
      tD.classList.toggle("adj", capForce("desAction"));
      tD.title = "Dés d'action reçus par tour" +
                 (capForce("desAction") ? " — forcé (calculé : " + fmtP(desActionAuto()) + ")" : "");
    });
    r2.appendChild(tD);

    b.appendChild(r2);
    return b;
  }

