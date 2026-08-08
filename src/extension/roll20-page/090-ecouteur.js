  // Écouteur PASSIF : n'agit QUE sur nos messages (ns:"jjk" + charId), qui ne sont
  // émis que sur interaction (ouverture de l'onglet Fiche JJK). On NE poste RIEN de
  // spontané au chargement — Roll20 ouvre ses fiches via postMessage, un message
  // inattendu casserait son gestionnaire. Tout est en try/catch pour ne jamais
  // laisser une exception remonter dans le contexte de Roll20.
  window.addEventListener("message", function (ev) {
    try {
      var d = ev.data;
      if (!d || d.ns !== "jjk") return;
      // la liste des joueurs ne dépend d'aucun personnage : traitée AVANT le
      // filtre charId
      if (d.type === "players") { reply(ev, { type: "players-result", players: players() }); return; }
      // le plateau de Narration ne dépend d'aucun personnage CONNU du panneau :
      // c'est justement ce qu'il vient demander, donc avant le filtre charId
      if (d.type === "narration-char") {
        // « pas de plateau » et « campagne pas encore chargée » ne se disent pas
        // pareil : au démarrage, characters est vide pendant une seconde ou
        // deux, et annoncer l'absence ferait afficher un écran d'erreur pour
        // rien (même prudence que has-sheet, qui répond exists:null).
        var nc = narrationChar();
        var rep = { type: "narration-char-result", pret: !!campaign(), charId: null, nom: "" };
        if (nc) {
          rep.charId = nc.id;
          rep.nom = String((nc.get ? nc.get("name") : "") || "");
          var dr = droits(nc);
          rep.gm = dr.gm;
          rep.moi = dr.moi;
          rep.controlledby = dr.controlledby;
          narrId = nc.id;
          // « Réessayer » côté plateau : on repart de zéro. Sans ce mot, la
          // demande périodique effacerait l'échec toutes les douze secondes et
          // l'écran d'état clignoterait entre les deux.
          if (d.encore) relanceOuverture(nc.id);
          // le plus tôt est le mieux : l'ouverture de la fiche commence ici,
          // sans attendre la première lecture d'état
          etatAttributs(nc);
        }
        reply(ev, rep);
        return;
      }
      if (!d.charId) return;
      if (d.type === "has-sheet") {
        // perso injoignable (Campaign pas prêt, opener fermé...) : exists:null
        // (« Roll20 n'a pas répondu ») — surtout pas false, qui proposerait de
        // CRÉER une fiche par-dessus une fiche existante mais illisible.
        if (!getChar(d.charId)) {
          reply(ev, { type: "has-sheet-result", charId: d.charId, exists: null });
        } else {
          var a = readAll(d.charId);
          reply(ev, { type: "has-sheet-result", charId: d.charId, exists: !!a[PREFIX + "version"] });
        }
      } else if (d.type === "load") {
        // première demande de cette frame : elle se lie à ce personnage ; une
        // demande ultérieure pour un autre personnage est refusée (verrou 2).
        if (!lier(ev.source, d.charId)) return;
        // LA LISTE DES PRÉFIXES DU PLATEAU, envoyée par la page qui les écrit.
        // C'est elle qui rend le ménage possible : sans elle, aMoi() garde tout
        // et rien n'est jamais détruit. On ne retient que des chaînes commençant
        // par le préfixe général, pour qu'une page malveillante ne puisse pas
        // faire passer les attributs NATIFS de Roll20 pour les siens.
        if (d.menageGarde && d.menageGarde.length) {
          var g = [], gi;
          for (gi = 0; gi < d.menageGarde.length; gi++) {
            var gp = String(d.menageGarde[gi] || "");
            if (gp.length > 4 && gp.indexOf(PREFIX) === 0) g.push(gp);
          }
          if (g.length) menageGarde = g;
        }
        // perso injoignable : ne pas hydrater avec du vide (la fiche relance load
        // toutes les 500 ms, le Campaign peut arriver après nous)
        var chl = getChar(d.charId);
        if (!chl) return;
        var rl = { type: "hydrate", charId: d.charId, attrs: readAll(d.charId) };
        // CE QUE VAUT CETTE LECTURE, dit avec elle. Seul le plateau est concerné :
        // pour tout autre personnage la fiche est ouverte, donc les attributs
        // chargés, et rien ne change. Le champ est neuf ; une page servie par un
        // site plus ancien l'ignore, comme la fiche l'ignore de toute façon.
        if (d.charId === narrId) {
          var e = etatAttributs(chl);
          rl.sur = e === "sur";
          if (e === "echec") rl.raison = "ouverture";
          // Le ménage attend que la lecture vaille vérité : sur une collection
          // que Roll20 n'a pas encore peuplée, tout paraîtrait absent.
          if (rl.sur) menagePlateau(chl);
          if (menageRapport) { rl.menage = menageRapport; menageRapport = null; }
          // « omis » est TOUJOURS posé, même vide : sa présence dit au plateau
          // que ce pont-ci sait alléger. Mais on n'allège QUE s'il l'a demandé
          // (d.allege), parce que le pont est signé et lui non : voir allege().
          rl.omis = d.allege === true ? allege(rl.attrs, ev.source, d.complet === true) : [];
          // Le relevé de la dernière écriture voyage avec la lecture : c'est le
          // seul moyen, sans compte Roll20, de savoir si le modèle a pris notre
          // valeur. Vidé une fois transmis, pour ne rien répéter.
          var _n; for (_n in dernieresEcritures) { if (dernieresEcritures.hasOwnProperty(_n)) { rl.ecrits = dernieresEcritures; break; } }
          dernieresEcritures = {};
        }
        reply(ev, rl);
      } else if (d.type === "save") {
        if (!liee(ev.source, d.charId)) return;
        enqueue(d.charId, d.attrs);
      }
    } catch (e) {}
  }, false);
})();
