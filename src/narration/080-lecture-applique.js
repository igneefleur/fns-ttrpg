
  function applique(attrs, d) {
    ditMenage(d);
    // Le pont dit ce qu'il sait faire ; on le retient une fois pour toutes, et
    // la trace de dépannage le porte. « false » ici veut dire : ce joueur ne
    // verra JAMAIS bouger le plateau des autres tant que son extension n'est pas
    // à jour — c'est le premier fait à vérifier devant une panne de ce genre.
    if (d && pontResync === null) { pontResync = d.resync === true; }
    trace("lecture", { pontSur: (d && d.sur), pontRaison: (d && d.raison),
                       pontResync: pontResync,
                       nbAttrs: attrs ? Object.keys(attrs).length : 0,
                       ecrits: resumeEcrits(d && d.ecrits) });
    try {
      var _k, _a = attrs || {};
      for (_k in _a) { if (_a.hasOwnProperty(_k)) { dernierLu[_k] = String(_a[_k] && _a[_k].current != null ? _a[_k].current : _a[_k]); } }
    } catch (e) {}
    // « JE NE SAIS PAS ENCORE » N'EST PAS « C'EST VIDE ». Roll20 ne peuple les
    // Attributes d'un personnage qu'à l'ouverture de sa fiche, et le plateau est
    // justement lu sans que personne n'ouvre celle de « Narration » : tant que le
    // pont ne l'a pas ouverte, ce qu'il rend n'est la vérité de rien. Le prendre
    // pour l'état effaçait le plateau à l'écran, et faisait redistribuer sur du
    // vide ; les écritures parties là-dessus ne revenaient jamais, et le plateau
    // finissait par accuser Roll20 de les refuser. On ne touche donc à RIEN tant
    // que ce n'est pas sûr : ni configuration, ni jetons, ni verdict de refus.
    var dit = !!d && d.sur !== undefined;
    if (dit && d.sur !== true) {
      etatSur = false;
      lu = false;
      vide = 0;
      // nos écritures ne peuvent pas revenir d'un personnage que Roll20 ne lit
      // pas encore : ce ne sont pas des pertes, et elles ne prouvent aucun refus
      attente = {};
      perdues = 0;
      montreEtat(d.raison ? "ouverture" : "attente");
      return;
    }
    var rien = true;
    Object.keys(attrs).forEach(function (n) { if (n.indexOf(PREF) === 0) rien = false; });
    // Une lecture vide n'efface pas un plateau sur un coup de tête : cinq
    // d'affilée, au cas où il aurait vraiment été vidé à la main. Et la règle
    // vaut dès la PREMIÈRE lecture quand le pont est trop ancien pour ouvrir la
    // fiche — c'est tout ce qu'on peut faire pour lui sans extension à jour ;
    // un pont récent, lui, a déjà répondu de ce vide-là.
    if (rien && (lu || !dit)) {
      if (++vide < 5) {
        if (!lu) montreEtat("attente");   // rien de lu : pas de table à montrer
        return;
      }
    } else {
      vide = 0;
    }
    lu = true;
    // On sait, maintenant.
    etatSur = true;
    montreEtat(null);

    // CE QUE LE SERVEUR A RÉPONDU À NOTRE FOND, quand le pont sait le dire. Il
    // arrive bien avant la garde d'écriture : une image trop lourde se réduit
    // alors en une seconde au lieu de six. Un pont plus ancien ne dit rien de
    // tout cela, et le minuteur d'envoi prend le relais.
    //
    // ICI ET PAS PLUS HAUT : c'est la règle qui tient tout le fichier. Sur une
    // lecture qui ne vaut pas vérité, on ne conclut rien — et surtout pas qu'une
    // écriture a été refusée, ce qui relancerait l'envoi dans le vide.
    try {
      if (envoi && d && d.ecrits) {
        var rep = d.ecrits[A_BG + envoi.id];
        if (rep && (rep.serveur === "refuse" || rep.serveur === "exception")) fondRefuse();
      }
    } catch (e) {}

    var brutConf = attrs[A_CONF] ? String(attrs[A_CONF].current || "") : "";
    if (!retenu(A_CONF, brutConf)) conf = litConf(brutConf);

    // LES FONDS, avant les jetons : ils changent la peinture des places, pas le
    // compte. Même règle que pour un jeton — notre écriture en attente prime sur
    // l'écho périmé — et même contrôle du nom, pour la même raison.
    var neufFonds = {};
    Object.keys(attrs).forEach(function (n) {
      if (n.indexOf(A_BG) !== 0) return;
      var idf = n.slice(A_BG.length);
      if (!/^[A-Za-z0-9_-]{1,16}$/.test(idf)) return;
      var brutF = String(attrs[n].current || "");
      if (retenu(n, brutF)) { if (fonds[idf]) neufFonds[idf] = fonds[idf]; return; }
      var sf = fondSur(brutF);
      if (sf) neufFonds[idf] = sf;
    });
    // Un fond qu'on vient d'envoyer et que Roll20 ne nous a pas encore rendu ne
    // doit pas clignoter : il reste affiché le temps de l'écho.
    Object.keys(attente).forEach(function (n) {
      if (n.indexOf(A_BG) !== 0) return;
      var idf = n.slice(A_BG.length);
      if (!neufFonds[idf] && fonds[idf] && attente[n].val) neufFonds[idf] = fonds[idf];
    });
    // CE QUE LE PONT A RETENU N'EST PAS EFFACÉ. « omis » liste les attributs
    // qu'il n'a pas renvoyés parce qu'ils n'ont pas changé : sans cette reprise,
    // le premier tour allégé ferait disparaître tous les fonds de l'écran.
    try {
      var om = (d && d.omis) || [];
      for (var io_ = 0; io_ < om.length; io_++) {
        var no = String(om[io_]);
        if (no.indexOf(A_BG) !== 0) { continue; }
        var ido = no.slice(A_BG.length);
        if (!neufFonds[ido] && fonds[ido]) { neufFonds[ido] = fonds[ido]; }
      }
    } catch (e) {}
    fonds = neufFonds;
    // À partir du moment où une lecture COMPLÈTE est passée, les suivantes
    // peuvent être allégées : on tient les fonds, le pont n'a plus à les
    // retransporter.
    if (!fondsTenus && !(d && d.allege)) { fondsTenus = true; }

    var neuf = {};
    Object.keys(attrs).forEach(function (n) {
      if (n.indexOf(A_PT) !== 0) return;
      var id = n.slice(A_PT.length);
      // Le nom de l'attribut vient de Roll20, donc de n'importe qui : un
      // identifiant fantaisiste finirait dans un sélecteur CSS et ferait
      // tomber tout le rafraîchissement, pour tout le monde et sans un mot.
      if (!/^[A-Za-z0-9_-]{1,16}$/.test(id)) return;
      connus[id] = 1;
      var brut = String(attrs[n].current || "");
      if (retenu(n, brut)) { if (points[id]) neuf[id] = points[id]; return; }
      var p = litPoint(brut);
      if (p) neuf[id] = p;
      // un jeton qu'on tient et que quelqu'un vient de retirer ne doit pas
      // ressusciter au lâcher
      else if (prise && prise.id === id) prise.mort = true;
    });
    // Nos écritures en attente sur des jetons que Roll20 ne connaît pas encore
    // (créés à l'instant) : elles ne doivent pas disparaître le temps de l'écho.
    Object.keys(attente).forEach(function (n) {
      if (n.indexOf(A_PT) !== 0) return;
      var id = n.slice(A_PT.length);
      if (!neuf[id] && points[id]) neuf[id] = points[id];
    });
    // le jeton qu'on tient reste sous le doigt, quoi qu'en dise Roll20
    if (prise && points[prise.id]) neuf[prise.id] = points[prise.id];
    points = neuf;
    rend();
  }
