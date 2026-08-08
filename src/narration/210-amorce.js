
  // ---------- amorce ----------
  function demarre() {
    bati();
    // Le châssis de l'extension accepte depuis toujours qu'une page se NOMME
    // elle-même (canal { type: "panneau", titre }), et personne ne s'en était
    // jamais servi : la barre de titre disait « Narration » en dur. Le titre
    // appartient à la page, donc le renommer ne coûte pas une signature. On ne
    // pousse en revanche NI largeur NI hauteur : le châssis les range, et les
    // imposer à chaque chargement écraserait la taille choisie par le joueur.
    post({ type: "panneau", titre: "Plateau de Narration", nuit: nuitActive() });
    // Un plateau vide tant qu'on n'a rien lu serait un mensonge : on ne montre
    // la table qu'une fois qu'on sait ce qu'il y a dessus.
    montreEtat("attente");
    demandePerso();
    // « Roll20 ne répond pas » ne vaut que si le pont n'a RIEN dit. S'il a
    // répondu qu'il n'y a pas de plateau, c'est cet écran-là qu'il faut garder :
    // le premier était plus tardif, il effaçait le second.
    setTimeout(function () { if (!repondu) montreEtat("pont"); }, ATTENTE_PONT);
    document.addEventListener("pointermove", deplace);
    document.addEventListener("pointerup", lache);
    document.addEventListener("pointercancel", lache);
    // Relecture régulière : c'est tout le « temps réel » du plateau. La page
    // cachée (panneau replié, onglet en arrière-plan) ne demande rien.
    var tour = 0;
    timer = setInterval(function () {
      tour++;
      // Panneau replié : l'extension masque l'iframe, dont la fenêtre tombe
      // alors à zéro pixel. Rien à interroger pour un plateau que personne ne
      // regarde — et c'est la PAGE qui en décide, donc cela se change sans
      // toucher à l'extension signée.
      if (document.hidden || !window.innerWidth || !window.innerHeight) return;
      if (!charId) {
        // pas de plateau dans cette campagne : on regarde de loin en loin, au
        // cas où le MJ viendrait de créer le personnage
        if (repondu && tour % 4) return;
        demandePerso();
        return;
      }
      // De temps en temps, redemander le personnage : un partage accordé en
      // cours de partie doit finir par se voir, sans recharger la page.
      if (tour % 10 === 0) post({ type: "narration-char" });
      demandeEtat();
    }, POLL);
    rend();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarre);
  else demarre();
})();
