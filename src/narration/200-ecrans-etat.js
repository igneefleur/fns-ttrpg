
  // ---------- états visibles ----------
  var etatMontre = null;
  function montreEtat(quoi) {
    // un message peut arriver avant le premier rendu : rien à montrer, et
    // surtout rien à effacer
    if (!racine) return;
    // Le plateau redemande son personnage tant qu'il ne l'a pas : sans cette
    // garde, l'écran d'attente se reconstruirait toutes les 1.2 s et le bouton
    // se déroberait sous le doigt.
    if (quoi === etatMontre) return;
    etatMontre = quoi;
    var vieux = racine.querySelector(".nb-etat");
    if (vieux) racine.removeChild(vieux);
    if (!quoi) return;
    var e = el("div", "nb-etat");
    if (quoi === "absent") {
      e.appendChild(el("div", "nb-titre", "Aucun plateau dans cette campagne"));
      e.appendChild(el("div", "nb-detail",
        "Le MJ crée un personnage nommé exactement « Narration », le met dans le journal "
        + "des joueurs, et le rend modifiable et contrôlable par tous les joueurs."));
    } else if (quoi === "pont") {
      e.appendChild(el("div", "nb-titre", "Roll20 ne répond pas"));
      e.appendChild(el("div", "nb-detail",
        "Le plateau n'a pas trouvé le pont de l'extension. Recharger la partie suffit d'ordinaire."));
    } else if (quoi === "attente") {
      // Le temps que Roll20 charge les attributs du personnage. Deux secondes en
      // général, et rien à faire pendant : pas de bouton, pas d'explication.
      e.appendChild(el("div", "nb-titre", "Lecture du plateau…"));
    } else if (quoi === "ouverture") {
      // Le pont n'a pas réussi à ouvrir la fiche « Narration », donc les
      // attributs restent illisibles. Le dire pour ce que c'est : ce n'est pas
      // Roll20 qui refuse d'écrire, c'est l'état qu'on n'a pas pu lire.
      e.appendChild(el("div", "nb-titre", "Plateau illisible"));
      e.appendChild(el("div", "nb-detail", ecrivable
        ? "Ouvrir une fois le personnage « Narration » dans le journal."
        : "Ce personnage n'est pas partagé avec ce joueur."));
    }
    if (quoi !== "attente") {
      // seule action de l'écran, donc la seule qui ait droit au plein carmin
      var b = el("button", "nb-btn primary", "Réessayer");
      b.type = "button";
      b.addEventListener("click", function () { montreEtat(null); demandePerso(true); });
      e.appendChild(b);
    }
    racine.appendChild(e);
  }
