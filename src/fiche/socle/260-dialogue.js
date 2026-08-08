  // ---------- boîte de dialogue (jamais prompt/confirm pour un formulaire) ----------
  // Dans Roll20 la fiche est une iframe d'une autre origine : les fenêtres
  // natives y sont muettes sous Chrome. Tout formulaire passe donc par cette
  // couche, posée dans le document de la fiche.
  function dialogue(titre, corps, valider, libelleValider) {
    var over = el("div", "pc-modal-over");
    var box = el("div", "pc-modal");
    box.appendChild(el("div", "pc-modal-title", titre));
    box.appendChild(corps);
    var pied = el("div", "pc-modal-actions");
    function fermer() { if (over.parentNode) over.parentNode.removeChild(over); }
    pied.appendChild(miniBtn("Annuler", null, fermer));
    var ok = miniBtn(libelleValider || "Valider", null, function () {
      if (valider() !== false) fermer();
    }, "primary");
    pied.appendChild(ok);
    box.appendChild(pied);
    over.appendChild(box);
    over.addEventListener("mousedown", function (e) { if (e.target === over) fermer(); });
    // DANS .perso-atelier : c'est lui qui porte les jetons de couleur (jour et
    // nuit) ; accroché plus haut, le dialogue perdrait tout son habillage
    (appEl || rootEl || document.body).appendChild(over);
    setTimeout(function () {
      var f = box.querySelector("input, textarea, select");
      if (f) { f.focus(); if (f.select) f.select(); }
    }, 0);
    return { fermer: fermer };
  }
  // confirm() est MUET dans l'iframe Roll20 (autre origine) : il renvoie false
  // sans rien afficher, donc le retrait y était annulé en silence dès que
  // l'objet portait un nom. Toute confirmation passe par la modale de la fiche.
  function confirmer(titre, texte, libelle, fn) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note", texte));
    dialogue(titre, corps, fn, libelle);
  }

