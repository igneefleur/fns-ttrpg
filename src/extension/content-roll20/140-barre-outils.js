  // ---------- le bouton dans la barre d'outils de Roll20 ----------
  // LE BOUTON EST UN CLONE, jamais un bouton reconstruit à la main, et c'est le
  // point qui décide de tout le reste. La barre est une application VUE et son
  // CSS est « scopé » : chaque règle est écrite « .toolbar-button-inner[data-v-
  // 0dd4681e] », « .grimoire__roll20-icon[data-v-2f0bc668] ». Un bouton
  // reconstruit porterait les bonnes CLASSES et pas ces attributs : ni la
  // police d'icônes, ni les marges, ni le fond de l'état actif ne s'y
  // appliqueraient, et l'icône s'afficherait en toutes lettres. Cloner un
  // bouton natif emporte les attributs avec, sans avoir à deviner un seul de
  // ces condensats — qui changent à chaque déploiement de Roll20, alors que ce
  // fichier est figé par la signature.
  //
  // Relevé dans un vrai document (2026) :
  //   #vm-master-toolbar > #master-toolbar.master-toolbar-outer > .upper-buttons
  //     > .toolbar-button-outer#select-button
  //        > .toolbar-button-mid > button.toolbar-button-inner
  //             > .icon-slot > span.grimoire__roll20-icon
  // L'icône est le TEXTE de ce span (une ligature de la police d'icônes).
  //
  // L'ICÔNE EST NATIVE et discrète : « dualSheets », deux feuillets posés l'un
  // sur l'autre, relevée dans ce même document donc certainement présente dans
  // la police. Elle n'est utilisée par aucun bouton de la barre, elle est du
  // même trait que les autres, et elle ne crie pas.
  var BARRE_ICONE = "dualSheets";
  var BARRE_ID = "jjk-barre-bouton";
  var BARRE_TITRE = "Plateau de narration";
  var barreOK = false;     // le bouton a été posé au moins une fois
  var barreObs = null;

  function barreZone() {
    return document.querySelector("#master-toolbar .upper-buttons") ||
           document.querySelector("#vm-master-toolbar .upper-buttons") || null;
  }
  // Le modèle à cloner : un bouton SANS sous-menu (pas de caret à retirer), avec
  // une icône, et surtout VISIBLE. On ne nomme pas #select-button : un
  // identifiant de Roll20 se renomme, la forme, elle, tient.
  //
  // La visibilité n'est pas une coquetterie : la barre porte un
  // #more-tools-button rangé en « display: none » inline, et le cloner nous
  // donnerait un bouton invisible — posé, compté comme posé, et introuvable.
  function barreModele(zone) {
    var l = zone.querySelectorAll(".toolbar-button-outer");
    for (var i = 0; i < l.length; i++) {
      if (l[i].id === BARRE_ID) continue;
      if (!l[i].offsetWidth && !l[i].offsetHeight) continue;
      if (l[i].querySelector(".submenu-caret")) continue;
      if (l[i].querySelector(".icon-slot") && l[i].querySelector("button")) return l[i];
    }
    return null;
  }
  function barreFabrique(modele) {
    var n = modele.cloneNode(true);   // cloneNode ne copie AUCUN écouteur : le
    n.id = BARRE_ID;                  // clone est inerte tant qu'on ne lui en pose pas
    n.className = ((n.className || "") + " jjk-barre-bouton").replace(/^\s+/, "");
    // ceinture : un modèle masqué ne doit pas transmettre son invisibilité
    try { n.style.removeProperty("display"); } catch (e) {}
    var slot = n.querySelector(".icon-slot");
    if (slot) {
      // l'état actif du modèle ne doit pas voyager : notre bouton s'allume
      // quand NOTRE plateau est ouvert, pas quand l'outil cloné est choisi
      slot.classList.remove("icon-selected");
      try { slot.style.removeProperty("background-color"); } catch (e) {}
    }
    var caret = n.querySelector(".submenu-caret");
    if (caret && caret.parentNode) caret.parentNode.removeChild(caret);
    var icone = n.querySelector(".grimoire__roll20-icon");
    if (icone) icone.textContent = BARRE_ICONE;
    var btn = n.querySelector("button");
    if (btn) {
      btn.setAttribute("title", BARRE_TITRE);
      btn.setAttribute("aria-label", BARRE_TITRE);
      btn.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        if (panEtat) panOuvre(!panEtat.ouvert);
      });
    }
    return n;
  }
  // Le bouton s'allume comme un outil natif choisi : Roll20 pose .icon-selected
  // et le fond --vtt-toolbar-active-selection-bg sur la pastille d'icône. On
  // rejoue exactement ce geste plutôt que d'inventer une couleur à nous, qui
  // jurerait le jour où Roll20 change de thème.
  function barrePeint() {
    var n = document.getElementById(BARRE_ID);
    var slot = n && n.querySelector(".icon-slot");
    if (!slot) return;
    var actif = !!(panEtat && panEtat.ouvert);
    slot.classList.toggle("icon-selected", actif);
    try {
      if (actif) slot.style.setProperty("background-color", "var(--vtt-toolbar-active-selection-bg)");
      else slot.style.removeProperty("background-color");
    } catch (e) {}
  }
  // Pose, ou repose. Vue reconstruit sa barre (au repli, à un changement
  // d'outils, à une reconnexion) et emporte notre noeud avec : le guet plus bas
  // rappelle cette fonction, qui ne fait rien tant que le bouton est en place.
  // On l'ajoute EN FIN de barre, là où le patch de Vue a le moins de raisons de
  // passer, et jamais au milieu de ses propres enfants.
  function barrePose() {
    var zone = barreZone();
    if (!zone) return false;
    var deja = document.getElementById(BARRE_ID);
    if (deja && deja.parentNode === zone) { barrePeint(); return true; }
    var modele = barreModele(zone);
    if (!modele) return false;
    if (deja && deja.parentNode) deja.parentNode.removeChild(deja);
    barreInsere(zone, barreFabrique(modele));
    barreOK = true;
    barrePeint();
    return true;
  }
  // DANS « OUTILS », PAS DANS « EFFETS ». Ajouté à la fin de la liste, le bouton
  // tombait après effects-button, donc sous l'intitulé « Effets » — l'auteur l'a
  // vu sur sa capture. La barre est faite de groupes séparés par des
  // « .spacer-outer » : settings | select, pan | draw, text, measure, dice |
  // effects, more. Le groupe des outils finit donc juste avant le séparateur qui
  // précède le bouton des effets.
  //
  // On vise ce séparateur-là par le bouton des effets, et non par un rang : un
  // rang se décale au premier outil que Roll20 ajoute. Si rien n'est reconnu, on
  // ajoute à la fin comme avant : mal placé vaut mieux qu'absent.
  function barreInsere(zone, noeud) {
    var ancre = null;
    try {
      var eff = zone.querySelector("#effects-button");
      if (eff) {
        var p = eff.previousElementSibling;
        ancre = (p && p.className && String(p.className).indexOf("spacer") >= 0) ? p : eff;
      }
      if (!ancre) {
        var sp = zone.querySelectorAll(".spacer-outer");
        if (sp.length) ancre = sp[sp.length - 1];
      }
    } catch (e) { ancre = null; }
    if (ancre && ancre.parentNode === zone) zone.insertBefore(noeud, ancre);
    else zone.appendChild(noeud);
  }
  function barreGuet() {
    if (barreObs) return;
    var racine = document.getElementById("vm-master-toolbar") ||
                 document.getElementById("master-toolbar");
    if (!racine) return;
    var pendant = false;
    try {
      barreObs = new MutationObserver(function () {
        if (pendant) return;
        pendant = true;
        setTimeout(function () {
          pendant = false;
          barrePose();
          // la barre a pu changer de largeur (repli) : le plateau ancré la suit
          if (panEtat) panApplique();
        }, 200);
      });
      barreObs.observe(racine, { childList: true, subtree: true });
    } catch (e) {}
  }
