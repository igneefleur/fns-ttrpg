  // ---------- démarrage : tout ce qui a un effet passe par ici ----------
  // Rien de ce fichier ne s'exécute avant que la garde n'ait appelé cette
  // fonction : ni écouteur, ni écriture dans le DOM, ni message posté. C'est la
  // condition pour que la copie qui n'est pas du mode, ou l'extension éteinte,
  // ne laisse aucune trace.
  function demarre() {
    ecouteNuit();
    posePriseTake();
    if (IS_TOP) {
      // FRAME DU HAUT : on n'injecte RIEN au chargement (l'injection main-world gênait
      // l'ouverture des fiches Roll20). On attend que l'utilisateur ouvre l'onglet
      // Fiche JJK (depuis une fiche déjà ouverte) : il pose alors le pont via need-bridge.
      // Reçoit aussi les JETS de la fiche -> tchat Roll20 (le tchat vit dans cette frame,
      // sauf popout : relais vers l'opener).
      window.addEventListener("message", function (ev) {
        try {
          var d = ev.data;
          if (!d || d.ns !== "jjk") return;
          // « take » descend vers les fiches : ne jamais retenir sa source comme
          // destinataire, sinon deux fenêtres se le renverraient sans fin
          if (d.type === "take") {
            if (d.payload) diffuseTake(d.payload);
            return;
          }
          rememberSheet(ev.source);
          // Le panneau règle sa propre taille : c'est LA page servie par le site
          // qui sait ce qu'elle a à montrer, et le châssis ne doit pas devenir la
          // pièce qu'il faut re-signer pour élargir un plateau. Les valeurs sont
          // bornées ici, comme tout ce qui vient d'une page.
          if (d.type === "panneau") {
            if (!panEtat) return;
            // le titre appartient à la page : elle peut se renommer sans qu'on
            // touche à l'extension
            if (d.titre != null && panTitre) panTitre.textContent = String(d.titre).slice(0, 40);
            // LA COULEUR DU CADRE SUIT CELLE DU PLATEAU, dès que le plateau la
            // dit. Le cadre est signé, le plateau ne l'est pas : le jour où il
            // se donne un réglage de nuit à lui, et il l'a fait, lui seul sait
            // de quelle couleur il s'est peint. Un cadre qui n'écouterait que
            // le réglage de l'extension resterait clair autour d'un plateau
            // devenu sombre, et c'est précisément ce qu'il ne doit jamais
            // arriver. Sans ce message, le cadre garde le réglage du popup,
            // que le plateau suit de toute façon par défaut.
            if (d.nuit != null && panBoite) panBoite.classList.toggle("jjk-nuit", !!d.nuit);
            // LE CADRE S'AGRANDIT POUR LES RÉGLAGES. Le plateau ne peut pas
            // faire sortir un dialogue de son iframe : serré dans une colonne
            // ancrée à la barre, il devenait illisible. Il demande donc de la
            // place, on la lui donne au centre de la page, et on la reprend à
            // la fermeture. L'état rangé n'est PAS touché : on ne mémorise pas
            // une géométrie de passage, sinon rouvrir Roll20 retrouverait le
            // plateau grand ouvert au milieu de l'écran.
            if (d.type === "pan-grand") { panGrand(!!d.grand); }
            if (d.w != null) panEtat.w = panNombre(d.w, panEtat.w);
            if (d.h != null) panEtat.h = panNombre(d.h, panEtat.h);
            panBorne(panEtat);
            if (d.replie != null) { panOuvre(!d.replie); return; }
            panApplique();
            panRange();
            return;
          }
          if (d.type === "need-bridge") injectPageScript();
          else if (d.type === "roll") {
            if (!sendToChat(document, rollCommand(d.die, d.value, d.label)) && IS_POPOUT) relayToOpener(d);
          } else if (d.type === "say") {
            if (!sendToChat(document, sayCommand(d.title, d.fields)) && IS_POPOUT) relayToOpener(d);
          } else if (d.type === "chat") {
            // commande COMPOSÉE par la fiche (carte d'objet donné + lien « Prendre ») :
            // envoyée telle quelle, sans rien en réécrire ici — son format vit
            // côté site, qui peut donc évoluer sans re-signer l'extension. Seule
            // la FORME est vérifiée (liste blanche), jamais le contenu.
            var brut = String(d.raw || "");
            if (!chatAutorise(brut)) return;   // hors liste blanche : rien ne part, ni ici ni à l'opener
            if (!sendToChat(document, brut) && IS_POPOUT) relayToOpener(d);
          }
        } catch (e) {}
      });
      // popout : la barre d'onglets de la fiche vit dans CE document, on y pose l'onglet.
      if (IS_POPOUT) startScan();
      // la partie elle-même (et elle seule) reçoit le plateau et son bouton
      if (IS_EDITEUR) panDemarre();
    } else {
      startScan();
    }
  }

