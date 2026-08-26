
  // ---------- dialogue avec le pont ----------
  function post(msg) {
    msg.ns = NS;
    try { window.top.postMessage(msg, "*"); } catch (e) {}
  }
  // Le pont d20 n'est injecté par l'extension que sur demande, et rien ne dit
  // qu'une fiche a déjà été ouverte dans cette partie : le plateau réclame donc
  // le pont lui-même avant de parler. L'injection est idempotente, le redemander
  // ne coûte rien.
  // « encore » ne part qu'au clic sur Réessayer : il fait recommencer au pont son
  // ouverture de fiche. La demande périodique, elle, ne doit rien relancer, sinon
  // un échec s'effacerait tout seul toutes les douze secondes.
  function demandePerso(encore) {
    post({ type: "need-bridge" });
    post({ type: "narration-char", encore: !!encore });
  }
  // L'ALLÈGEMENT SE DEMANDE, SINON IL NE SERT À RIEN. Le pont sait retenir les
  // gros attributs — les fonds importés, qui pèsent jusqu'à deux cents kilos en
  // base64 — mais seulement si la page le lui demande. Personne ne le demandait :
  // les images repartaient donc à chaque tour, toutes les 1.2 seconde, pour rien.
  //
  // On ne l'allège QU'UNE FOIS QU'ON LES TIENT. La toute première lecture doit
  // être complète, sinon le plateau n'aurait jamais vu les fonds ; et « omis »
  // dit lesquels le pont a retenus, pour qu'on garde les nôtres au lieu de les
  // croire effacés.
  var fondsTenus = false;
  // CE QUI APPARTIENT AU PLATEAU, dit par le plateau lui-même. Le pont range les
  // attributs de « Narration » : il retire les restes d'une fiche de personnage
  // ouverte un jour dessus, et dédoublonne les nôtres. Mais il ne peut pas
  // DEVINER lesquels sont les nôtres — et un critère gravé dans un paquet signé
  // condamnerait tout nom qu'on se mettrait à écrire plus tard, puisque cette
  // page-ci change sans signature. On envoie donc la liste, et le pont ne
  // détruit rien sans elle.
  var MENAGE_GARDE = [A_CONF, A_PT, A_BG];
  // ON DEMANDE À VOIR LES AUTRES. « load » seul ne rend que ce que ce client-ci
  // tient déjà ; « resync » lui fait d'abord poser la question au serveur. Deux
  // choses distinctes, et c'est toute la réparation : sans la seconde, un
  // plateau relit sa propre copie et paraît immobile pendant que les autres
  // jouent.
  //
  // Ce n'est pas demandé à chaque tour : le pont refuserait de toute façon
  // d'aller plus vite que son propre plancher, et le lui demander pour rien
  // n'apprend rien à personne. La demande arrive donc à SA cadence, et la
  // lecture qui suit — celle d'après, le temps que le serveur réponde — porte ce
  // qu'ont fait les autres.
  var resyncQuand = 0;
  // Ce pont-ci sait-il seulement aller chercher ? Un paquet signé plus ancien ne
  // le sait pas, et il n'y a alors rien à faire depuis ici : le noter permet au
  // moins de le DIRE, au lieu de laisser croire que le plateau est à jour.
  var pontResync = null;
  function demandeEtat() {
    if (!charId) { return; }
    var n = Date.now(), rs = false;
    if (n - resyncQuand >= RESYNC) { resyncQuand = n; rs = true; }
    post({ type: "load", charId: charId, allege: fondsTenus === true,
           menageGarde: MENAGE_GARDE, resync: rs });
  }
  // Une écriture = un lot d'attributs. On note ce qu'on vient d'écrire : l'écho
  // met un aller-retour à revenir, et sans cette note la relecture suivante
  // remettrait le jeton là où il était avant notre geste.
  function ecrire(attrs) {
    if (!charId || !peutPousser()) return;
    var lot = {}, t = Date.now();
    var noms = Object.keys(attrs);
    // Le pont écrit un attribut à la fois, espacés : le dernier d'un gros lot
    // n'arrive chez Roll20 que bien après le premier. La garde qui protège nos
    // valeurs de l'écho périmé doit donc tenir compte de la LONGUEUR du lot,
    // sinon la queue d'une distribution revient visiblement en arrière avant
    // d'être enfin écrite.
    var marge = GARDE + noms.length * PONT_PAS;
    noms.forEach(function (n) {
      var v = String(attrs[n] == null ? "" : attrs[n]);
      lot[n] = { current: v, max: "" };
      // « avant » : la valeur que Roll20 nous avait donnée juste avant qu'on
      // écrive. Si la valeur qui revient lui est ÉGALE, notre écriture n'a pas
      // pris ; si elle en diffère, c'est quelqu'un d'autre qui a écrit. Sans ce
      // repère, les deux pannes se ressemblent trait pour trait.
      attente[n] = { val: v, t: t, marge: marge, avant: (dernierLu[n] == null ? null : dernierLu[n]) };
    });
    post({ type: "save", charId: charId, attrs: lot });
  }

  window.addEventListener("message", function (ev) {
    try {
      var d = ev.data;
      if (!d || d.ns !== NS) return;
      // Le pont vit dans la fenêtre du haut de Roll20 : ses réponses en
      // viennent, et de nulle part ailleurs. Sans ce contrôle, n'importe quelle
      // frame de la page (un mod, par exemple) pourrait faire pointer le
      // plateau sur un autre personnage.
      if (ev.source !== window.top) return;
      if (d.type === "narration-char-result") {
        repondu = true;
        if (!d.charId) {
          charId = null;
          // « pas de plateau » ne se dit que si la campagne est chargée : au
          // démarrage, Roll20 met une seconde ou deux à peupler ses
          // personnages, et l'annoncer alors afficherait un écran d'erreur qui
          // ne partirait plus.
          if (d.pret !== false) montreEtat("absent");
          return;
        }
        // LE PERSONNAGE A CHANGÉ : ON REPART DE ZÉRO. Le MJ qui suit la consigne
        // « aucun plateau dans cette campagne » supprime et recrée « Narration » ;
        // deux personnages du même nom suffisent aussi à faire changer d'avis la
        // recherche quand la collection se retrie. Chez un joueur dont le panneau
        // est déjà ouvert, le nouvel identifiant remplaçait l'ancien SANS rien
        // remettre à zéro : le plateau gardait les jetons, la configuration et
        // les attentes de l'ancien personnage, se croyait sûr de ce qu'il n'avait
        // jamais lu, et pouvait écrire par-dessus la table neuve.
        if (charId && d.charId !== charId) {
          etatSur = false; lu = false; vide = 0; perdues = 0; refuse = false;
          confFuture = false; points = {}; conf = confVide(); fonds = {};
          attente = {}; connus = {}; prise = null;
          annuleEnvoi();
          montreEtat("attente");
        }
        charId = d.charId;
        ecrivable = jugeDroits(d);
        // le personnage est trouvé : ces deux écrans-là n'ont plus lieu d'être.
        // Les autres disent l'état de la LECTURE, que seule la lecture peut lever.
        if (etatMontre === "absent" || etatMontre === "pont") montreEtat(null);
        demandeEtat();
      } else if (d.type === "hydrate" && d.charId === charId) {
        applique(d.attrs || {}, d);
      }
    } catch (e) {}
  }, false);

  // Le pont ne rend que la matière : qui je suis, si je suis MJ, et la liste
  // brute des contrôleurs du personnage. La conclusion se tire ICI, côté site,
  // pour que le jour où Roll20 renomme un de ces globaux la réparation soit un
  // déploiement et non une signature. Sans matière du tout (vieux pont), on
  // laisse essayer : une écriture refusée se verra, et le plateau le dira.
  function jugeDroits(d) {
    if (d.gm === undefined && d.controlledby === undefined) return d.ecrivable !== false;
    if (d.gm === true) return true;
    var l = String(d.controlledby || "").split(",").map(function (x) { return x.replace(/\s+/g, ""); });
    if (l.indexOf("all") >= 0) return true;
    return !!d.moi && l.indexOf(String(d.moi)) >= 0;
  }
