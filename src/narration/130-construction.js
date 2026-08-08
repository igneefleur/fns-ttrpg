
  // ---------- construction ----------
  var racine, barre, plateau, coteMj, coteJoueurs, coucheJetons;
  var lblTotal, boiteTotal, lblHors, boiteHors, lblAvis, btnNuit, btnReglages;
  var boiteMot, lblMot;
  var jaugeRef = null;
  var placesDom = {};   // id de place -> élément
  var fondPose = {};    // id de place -> fond DÉJÀ peint, pour ne pas repeindre

  // Un couple libellé / valeur : la capitale minuscule et espacée face au
  // chiffre tabulaire. C'est ce contraste, plus que les couleurs, qui donne
  // l'air de formulaire imprimé ; l'ancienne barre disait « 12 jetons » en
  // texte courant, à la taille de tout le reste.
  function kv(cls, lab) {
    var b = el("div", "nb-kv " + cls);
    b.appendChild(el("span", "k", lab));
    b.appendChild(el("span", "v", "0"));
    return b;
  }

  function bati() {
    racine = document.getElementById("nb");
    racine.innerHTML = "";   // le mot d'attente de l'amorceur a fait son office

    barre = el("div", "nb-barre");
    boiteTotal = kv("nb-total", "Jetons");
    lblTotal = boiteTotal.lastChild;
    barre.appendChild(boiteTotal);
    // « hors place » et « lecture seule » sont deux choses distinctes : un
    // compte et un empêchement. Elles se disputaient la même case, et la plus
    // grave des deux se disait en gris clair.
    boiteHors = kv("nb-hors", "Hors place");
    lblHors = boiteHors.lastChild;
    boiteHors.hidden = true;
    barre.appendChild(boiteHors);

    var outils = el("div", "nb-outils");
    btnNuit = el("button", "nb-btn nb-lune");
    btnNuit.type = "button";
    btnNuit.innerHTML = SVG_NUIT;   // deux SVG écrits juste au-dessus, sans rien d'extérieur
    btnNuit.addEventListener("click", function () { poseNuit(nuitActive() ? "0" : "1"); });
    outils.appendChild(btnNuit);
    btnReglages = el("button", "nb-btn", "Réglages");
    btnReglages.type = "button";
    btnReglages.addEventListener("click", function () { ouvreReglages(); });
    outils.appendChild(btnReglages);
    barre.appendChild(outils);
    racine.appendChild(barre);
    appliqueNuit();   // le bouton vient d'exister : ses libellés doivent dire l'état

    lblAvis = el("div", "nb-avis");
    racine.appendChild(lblAvis);

    plateau = el("div", "nb-plateau");
    coteMj = el("div", "nb-cote nb-cote-mj");
    coteJoueurs = el("div", "nb-cote nb-cote-joueurs");
    coucheJetons = el("div", "nb-jetons");
    plateau.appendChild(coteMj);
    plateau.appendChild(coteJoueurs);
    plateau.appendChild(coucheJetons);

    // LE MOT, et ce n'est pas l'avis. L'avis dit un EMPÊCHEMENT, il reste tant
    // que sa cause dure. Le mot rend compte d'un geste qui vient d'aboutir (le
    // fond enregistré, à quelle taille) ou du ménage fait à l'ouverture : il se
    // dit une fois, se ferme d'un clic, s'efface tout seul, et ne bloque rien.
    //
    // IL EST POSÉ DANS LE PLATEAU, ET NON DANS LA COLONNE : dans la colonne il
    // couvrait la barre d'outils, c'est-à-dire les deux comptes et les deux
    // boutons, pendant les douze secondes où il se lit. Le CSS le range en bas
    // de la table et lui fait traverser les clics.
    boiteMot = el("div", "nb-mot");
    boiteMot.hidden = true;
    lblMot = el("span", "t");
    boiteMot.appendChild(lblMot);
    var croix = el("button", "x", "×");
    croix.type = "button";
    croix.title = "Fermer";
    croix.setAttribute("aria-label", "Fermer");
    croix.addEventListener("click", fermeMot);
    boiteMot.appendChild(croix);
    plateau.appendChild(boiteMot);

    racine.appendChild(plateau);

    // Le diamètre des jetons suit la largeur du plateau : agrandir le panneau
    // doit agrandir la table, pas semer des confettis.
    //
    // MONTÉ DE 5.5 À 6.8 POUR CENT depuis que le jeton porte une médaille
    // frappée et non plus un disque peint. Un dégradé se lit à seize pixels ;
    // une gravure, non : à l'ancienne taille le personnage devenait une tache
    // dorée et l'image ne servait à rien. Le plancher passe de 16 à 20 px, le
    // plafond de 30 à 38.
    function jauge() {
      var w = plateau.clientWidth || 320;
      plateau.style.setProperty("--jeton", clamp(Math.round(w * 0.068), 20, 38) + "px");
      // Le nombre de colonnes ne dépend QUE du nombre de joueurs, jamais de la
      // hauteur disponible. Quand il en dépendait, les places changeaient de
      // position d'un panneau à l'autre alors que les jetons, eux, sont en
      // millièmes du plateau entier : deux joueurs lisaient des comptes
      // différents du même état partagé (mesuré sur le même état : 3/2/3/2/2 à
      // 380x330 et 3/1/4/0/4 à 260x190). Les rangs, eux, se partagent la
      // hauteur à parts égales et les places n'ont plus de hauteur minimale :
      // aucune ne peut sortir du plateau, donc aucune ne devient inatteignable.
      var n = Math.max(1, conf.joueurs.length);
      var cols = Math.min(3, Math.ceil(n / 4));
      coteJoueurs.style.gridTemplateColumns = "repeat(" + cols + ", minmax(0, 1fr))";
      coteJoueurs.style.gridTemplateRows = "repeat(" + Math.ceil(n / cols) + ", minmax(0, 1fr))";
    }
    jaugeRef = jauge;
    if (window.ResizeObserver) new ResizeObserver(jauge).observe(plateau);
    window.addEventListener("resize", jauge);
    jauge();
  }
