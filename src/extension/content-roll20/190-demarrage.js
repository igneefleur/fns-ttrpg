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
      // Fiche MIA (depuis une fiche déjà ouverte) : il pose alors le pont via need-bridge.
      // Reçoit aussi les JETS de la fiche -> tchat Roll20 (le tchat vit dans cette frame,
      // sauf popout : relais vers l'opener).
      window.addEventListener("message", function (ev) {
        try {
          var d = ev.data;
          if (!d || d.ns !== "mia") return;
          // « take » descend vers les fiches : ne jamais retenir sa source comme
          // destinataire, sinon deux fenêtres se le renverraient sans fin
          if (d.type === "take") {
            if (d.payload) diffuseTake(d.payload);
            return;
          }
          rememberSheet(ev.source);
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
    } else {
      startScan();
    }
  }

