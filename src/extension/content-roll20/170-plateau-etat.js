  function panMonte(etat) {
    if (document.getElementById("jjk-panneau")) return;
    panEtat = panBorne(etat);
    panBoite = poseNuit(el("div", "jjk-panneau"));
    panBoite.id = "jjk-panneau";

    var tete = el("div", "jjk-panneau-tete");
    panTitre = el("span", "jjk-panneau-titre", "Narration");
    tete.appendChild(panTitre);
    // Deux boutons, et aucune phrase d'explication sous eux : l'infobulle suffit.
    panBtnAncre = el("button", "jjk-panneau-btn", "⇲");
    panBtnAncre.type = "button";
    panBtnAncre.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); });
    panBtnAncre.addEventListener("click", function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      panDetache(!panEtat.ancre);
    });
    tete.appendChild(panBtnAncre);
    panBtn = el("button", "jjk-panneau-btn", "–");
    panBtn.type = "button";
    panBtn.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); });
    panBtn.addEventListener("click", function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      panOuvre(!panEtat.ouvert);
    });
    tete.appendChild(panBtn);
    tete.addEventListener("pointerdown", function (ev) { panGeste(ev, true); });
    panBoite.appendChild(tete);

    panCorps = el("div", "jjk-panneau-corps");
    panBoite.appendChild(panCorps);

    var grip = el("div", "jjk-panneau-grip");
    grip.title = "Redimensionner";
    grip.addEventListener("pointerdown", function (ev) { panGeste(ev, false); });
    panBoite.appendChild(grip);

    document.body.appendChild(panBoite);
    panApplique();
    // Rouvert d'une session à l'autre : on attend que la partie ait FINI de
    // charger avant de monter l'iframe. C'est un événement, pas un nombre de
    // millisecondes choisi au doigt mouillé — et le pont, lui, n'est plus posé
    // d'ici du tout.
    if (panEtat.ouvert) {
      if (document.readyState === "complete") setTimeout(panRemplit, 400);
      else window.addEventListener("load", function () { setTimeout(panRemplit, 400); });
    }
    window.addEventListener("resize", function () { panBorne(panEtat); panApplique(); });
  }
  function panDefaut() {
    return { ouvert: PAN_DEF.ouvert, ancre: PAN_DEF.ancre,
             x: PAN_DEF.x, y: PAN_DEF.y, w: PAN_DEF.w, h: PAN_DEF.h };
  }
  // Éteint seulement si on l'a dit : les deux clés absentes valent allumé, une
  // partie fraîchement installée montre donc le plateau.
  function panEteint(r) {
    if (!r) return false;
    if (r[PAN_ACTIF_BIS] !== undefined) return r[PAN_ACTIF_BIS] === false;
    return r[PAN_ACTIF] === false;
  }
  // LA BARRE D'ABORD, LA BOÎTE ENSUITE, et l'ordre compte : c'est la présence du
  // bouton qui décide de quoi « fermé » a l'air (effacé, ou replié à son
  // étiquette). Monter la boîte avant de savoir la ferait clignoter d'un état à
  // l'autre au chargement de la partie. Vue construit sa barre en quelques
  // centaines de millisecondes ; on lui en laisse huit secondes, puis on monte
  // sans elle plutôt que d'attendre indéfiniment.
  //
  // Le guet, lui, continue après : une barre qui arrive en retard (reconnexion,
  // changement de page de la partie) trouvera son bouton reposé, et le plateau
  // s'ancrera à la première ouverture qui suit.
  function panPrepare(etat) {
    var essais = 0;
    (function cherche() {
      barreGuet();
      if (barrePose()) { panMonte(etat); return; }
      if (++essais > 20) {
        panMonte(etat);
        // dernier filet : une minute de rappels espacés, au cas où la barre se
        // peindrait après tout le monde. barrePose() ne fait rien si le bouton
        // est déjà là, et repeint le plateau s'il vient d'arriver.
        var n = 0, iv = setInterval(function () {
          // LE GUET S'ARME ICI AUSSI. Il n'était appelé que dans la boucle des
          // vingt essais : une barre peinte après huit secondes — partie lourde,
          // reconnexion, onglet ouvert en arrière-plan — recevait bien le bouton
          // par ce filet, mais plus aucun observateur. Vue le retirait au premier
          // re-rendu et il ne revenait jamais.
          barreGuet();
          if (barrePose()) { panApplique(); clearInterval(iv); return; }
          if (++n > 30) clearInterval(iv);
        }, 2000);
        return;
      }
      setTimeout(cherche, 400);
    })();
  }
  function panDemarre() {
    try {
      browser.storage.local.get([PAN_CLE, PAN_ACTIF, PAN_ACTIF_BIS]).then(function (r) {
        // l'interrupteur du popup : une partie Roll20 qui n'a rien à voir avec
        // JJK ne doit pas se voir imposer une étiquette à demeure
        if (panEteint(r)) return;
        var e = (r && r[PAN_CLE]) || {};
        panPrepare({
          ouvert: !!e.ouvert,
          ancre: e.ancre === undefined ? PAN_DEF.ancre : !!e.ancre,
          x: panNombre(e.x, PAN_DEF.x), y: panNombre(e.y, PAN_DEF.y),
          w: panNombre(e.w, PAN_DEF.w), h: panNombre(e.h, PAN_DEF.h)
        });
      }, function () { panPrepare(panDefaut()); });
    } catch (e) {
      panPrepare(panDefaut());
    }
  }

