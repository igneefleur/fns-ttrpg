  // ---------- boîte de dialogue ----------
  // Dans Roll20 la fiche est une iframe d'une AUTRE ORIGINE : prompt() et
  // confirm() y sont muets sous Chrome — ils rendent false sans rien afficher,
  // et un retrait y était annulé en silence. TOUT formulaire, TOUTE
  // confirmation passe donc par cette couche, posée dans le document de la
  // fiche. Il n'y a pas une seule exception dans ce fichier.
  function dialogue(titre, corps, valider, libelleValider) {
    var over = el("div", "pc-modal-over");
    var box = el("div", "pc-modal");
    box.appendChild(el("div", "pc-modal-title", titre));
    box.appendChild(corps);
    var pied = el("div", "pc-modal-actions");
    function fermer() { if (over.parentNode) over.parentNode.removeChild(over); }
    pied.appendChild(miniBtn("Annuler", null, fermer));
    // valider() qui rend explicitement false LAISSE le dialogue ouvert ; toute
    // autre valeur ferme.
    pied.appendChild(miniBtn(libelleValider || "Valider", null, function () {
      if (valider() !== false) fermer();
    }, "primary"));
    box.appendChild(pied);
    over.appendChild(box);
    over.addEventListener("mousedown", function (e) { if (e.target === over) fermer(); });
    // DANS .perso-fiche : c'est lui qui porte les jetons de couleur (jour et
    // nuit) ; accroché plus haut, le dialogue perdrait tout son habillage.
    (appEl || rootEl || document.body).appendChild(over);
    setTimeout(function () {
      var f = box.querySelector("input, textarea, select");
      if (f) { f.focus(); if (f.select) f.select(); }
    }, 0);
    return { fermer: fermer };
  }
  function confirmer(titre, texte, libelle, fn) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note", texte));
    dialogue(titre, corps, fn, libelle);
  }

