  // ---- modules : ce que la fiche affiche, et où ----
  // Ce bloc-ci parle de TOUS les autres. Il n'écrit que deux choses : la
  // disposition (state.modules) et les interrupteurs (state.modActifs) ; rien
  // du personnage ne passe par lui. Les outils qu'il appelle vivent plus bas
  // (ordreModules, colonnesDe, MODULES_NATIFS) : ce sont ceux du montage, pour
  // que le plan dise exactement ce que la fiche a fait.
  //
  // Libellés COURTS : ils coiffent une colonne du plan, qui est étroite (trois
  // colonnes côte à côte dans un bloc lui-même en colonne). « Colonne du
  // milieu » y passerait à la ligne.
  var LIB_COLONNES = {
    gauche: "Gauche", milieu: "Milieu", droite: "Droite", bas: "Pleine largeur"
  };
  // Le prédicat « pour » d'un module natif dit s'il existe ICI (« affichage »
  // n'existe que dans Roll20). Un module qui n'existe pas n'a pas de ligne : il
  // n'y a rien à en régler. Son id, lui, reste dans l'ordre enregistré — sans
  // quoi ouvrir la fiche sur le site effacerait le rangement fait dans Roll20.
  function moduleAffichable(m) {
    if (typeof m.pour !== "function") return true;
    try { return !!m.pour(); } catch (e) { return false; }
  }
  // La colonne d'un module existe-t-elle dans le squelette de son onglet ? Un
  // mod qui recopie « milieu » (une colonne de l'onglet Fiche) dans un onglet
  // qui n'en a pas se retrouve sans hôte : il ne se monte nulle part, tout
  // comme un module dont l'ONGLET est inconnu. La différence est que sa ligne,
  // elle, figure bien sous son onglet, l'air d'un module ordinaire. Il faut
  // donc la reconnaître pour le dire.
  function colonneRepli(p) {
    var cols = colonnesDe(p.onglet);
    if (!cols) return null;                          // onglet inconnu : autre cas
    if (aClef(cols, p.colonne)) return p.colonne;
    return Object.keys(cols)[0] || null;             // le repli d'appliqueDisposition
  }
  function colonneInconnue(p) {
    var r = colonneRepli(p);
    return !!r && r !== p.colonne;
  }
  // La place qu'un module DEMANDE : la consigne enregistrée si elle existe,
  // sinon celle qu'il a déclarée au montage.
  //
  // On ne lit surtout pas modules[i].onglet : appliqueDisposition l'a déjà
  // remanié au montage, donc il porte la place FORCÉE. Tant que le plan
  // rechargeait la fiche à chaque geste, les deux se confondaient ; maintenant
  // que le rangement attend le prochain chargement, il faut la consigne elle-
  // même — sans quoi « Disposition d'origine » ne montrerait rien avant le
  // rechargement, et un module déplacé deux fois de suite repartirait de sa
  // place forcée au lieu de sa place d'origine.
  function placeDemandee(m) {
    var p = (disposition().place || {})[m.id];
    if (p && typeof p === "object" && typeof p.onglet === "string"
        && typeof p.colonne === "string")
      return { onglet: p.onglet, colonne: p.colonne };
    var o = placeOrigine[m.id];
    if (o) return { onglet: o.onglet, colonne: o.colonne };
    return { onglet: m.onglet, colonne: m.colonne };
  }
  function idsConnus() {
    return ordreModules().map(function (m) { return m.id; });
  }
  function disposition() {
    if (!state.modules || typeof state.modules !== "object" || Array.isArray(state.modules))
      state.modules = {};
    return state.modules;
  }
  // L'ordre COMPLET des id connus, et pas seulement les deux qui bougent : relu
  // à froid, state.modules.ordre doit dire la disposition entière.
  //
  // Mais ce montage-ci ne connaît que les modules qui existent CHEZ LUI, et
  // l'ordre, lui, voyage avec le personnage. Écrire la seule liste du jour
  // effacerait le rang des autres : le mod « journal » de l'auteur, rangé en
  // tête de colonne, est en attente d'autorisation chez le joueur qui ouvre la
  // fiche ; une flèche cliquée là-bas suffisait à le renvoyer en fin de colonne,
  // sans un mot, jusque dans les Attributes. Les id inconnus d'ici gardent donc
  // leur rang, et les connus se rangent dans les places qui restent.
  //
  // Un module retiré POUR DE BON garde son rang lui aussi : rien ne le distingue
  // d'un mod qui attend son autorisation. Ça ne coûte qu'une ligne morte dans
  // l'ordre enregistré, qu'ordreModules() écarte de toute façon, quand oublier
  // coûtait la disposition d'un autre joueur. « Disposition d'origine » vide
  // tout, pour qui voudrait faire le ménage.
  function fusionneOrdre(ids) {
    var ancien = disposition().ordre;
    if (!Array.isArray(ancien) || !ancien.length) return ids.slice();
    var connu = {}, vu = {}, out = [], k = 0, i, id;
    for (i = 0; i < ids.length; i++) connu[ids[i]] = 1;
    for (i = 0; i < ancien.length; i++) {
      id = ancien[i];
      // un doublon consommerait deux places : l'ordre enregistré vient d'un
      // fichier importé ou d'une autre version, il n'est pas garanti propre
      if (typeof id !== "string" || !id || aClef(vu, id)) continue;
      vu[id] = 1;
      if (!aClef(connu, id)) { out.push(id); continue; }   // inconnu ici : il tient sa place
      if (k < ids.length) out.push(ids[k++]);
    }
    while (k < ids.length) out.push(ids[k++]);
    return out;
  }
  // ON N'ÉPINGLE QUE LA COLONNE TOUCHÉE, et c'est tout le sujet.
  //
  // L'ancienne version écrivait l'ordre COMPLET de tous les modules, tous
  // onglets confondus. Un seul clic sur une flèche, n'importe où, et la
  // disposition du personnage était gelée pour toujours : la fiche pouvait
  // ensuite changer l'agencement d'un onglet auquel le joueur n'avait jamais
  // touché, il ne le voyait jamais. C'est arrivé pour de bon — l'onglet Options
  // a été réagencé et les personnages qui avaient cliqué une fois gardaient
  // l'ancien, sans aucun moyen de le savoir.
  //
  // Désormais l'ordre enregistré ne retient que les colonnes RÉELLEMENT
  // remaniées. Les autres n'y figurent pas, donc elles suivent la table de la
  // fiche : un module ajouté ou déplacé par une mise à jour arrive chez tout le
  // monde, sauf là où le joueur a fait son propre rangement.
  //
  // ordonne() accepte un ordre PARTIEL, c'est ce qui rend la chose possible :
  // les id nommés passent devant dans l'ordre donné, les autres suivent à leur
  // rang de déclaration. Comme les colonnes sont séparées au montage, épingler
  // une colonne ne dérange pas les voisines.
  function memeColonne(id, onglet, colonne) {
    var i = rangModule(id);
    if (i < 0) return false;
    var p = placeDemandee(modules[i]);
    return p.onglet === onglet && p.colonne === colonne;
  }
  // ids : l'ordre voulu, complet. onglet/colonne : la colonne remaniée.
  function ecritOrdre(ids, onglet, colonne) {
    var d = disposition();
    var ancien = Array.isArray(d.ordre) ? d.ordre : [];
    var neuf = [], vus = {}, i;
    // ce qui était déjà épinglé AILLEURS reste épinglé, dans son ordre
    for (i = 0; i < ancien.length; i++) {
      if (onglet && memeColonne(ancien[i], onglet, colonne)) continue;
      if (!vus[ancien[i]]) { vus[ancien[i]] = 1; neuf.push(ancien[i]); }
    }
    // puis la colonne qu'on vient de remanier, dans son ordre nouveau
    for (i = 0; i < ids.length; i++) {
      if (onglet && !memeColonne(ids[i], onglet, colonne)) continue;
      if (!vus[ids[i]]) { vus[ids[i]] = 1; neuf.push(ids[i]); }
    }
    d.ordre = onglet ? neuf : fusionneOrdre(ids);
    // L'ordre vivant suit tout de suite, mais LA FICHE NE SE REMONTE PAS.
    //
    // Elle se remontait à chaque geste : ranger trois modules reconstruisait
    // trois fois la fiche entière, l'onglet sautait, et le moindre clic coûtait
    // une seconde. Le plan se redessine seul (redessinePlan), le rangement est
    // enregistré, et « Recharger la fiche » l'applique quand on a fini.
    ordonne(d.ordre);
    save();
  }
  function natifDe(id) {
    for (var i = 0; i < MODULES_NATIFS.length; i++)
      if (MODULES_NATIFS[i].id === id) return MODULES_NATIFS[i];
    return null;
  }
