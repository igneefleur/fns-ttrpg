  // ---------- garde-fous : la fiche peut exécuter du code qui n'est pas d'elle ----------
  // Un mod voyage DANS le personnage (il est rangé dans jjk_state) : quiconque
  // ouvre la fiche exécute son code, MJ compris. Le pont ne peut donc pas faire
  // confiance à ce qu'il reçoit, même sur ns:"jjk". Deux verrous, ci-dessous et
  // au traitement des messages.
  //
  // VERROU 1 — ÉCRITURE : seuls les attributs « jjk_* ». C'est tout ce que la
  // fiche produit (voir jjk-attr-map.js) ; un autre nom écraserait les attributs
  // NATIFS du personnage (barres de token, macros, feuille Roll20). Refus
  // silencieux : rien à signaler à qui l'a demandé.
  function ecrivable(name) { return typeof name === "string" && name.indexOf(PREFIX) === 0; }

  // VERROU 2 — LIAISON SOURCE <-> PERSONNAGE : une fiche n'écrit que dans le
  // personnage qu'elle affiche. Le premier « load » d'une frame fixe son
  // charId ; il vient de l'amorce du site, qui le poste AVANT de charger le
  // bundle, donc avant qu'un mod puisse parler. Ensuite tout « load » ou
  // « save » de cette même frame pour un AUTRE personnage est refusé : sans
  // ça, un mod déposé sur un seul personnage écrirait, dès que le MJ ouvre sa
  // fiche, dans toutes les fiches de la campagne.
  // La clé est l'objet fenêtre source lui-même (ev.source) : une fenêtre ne
  // peut pas se faire passer pour une autre. Le plafond borne la table ; au-
  // delà on REFUSE au lieu de recycler une entrée (recycler rouvrirait la
  // porte : il suffirait d'inonder le pont pour se relier ailleurs).
  // srcLourds tient, POUR CHAQUE FENÊTRE, l'empreinte des gros attributs qu'on
  // lui a déjà envoyés (voir allege). Il est parallèle aux deux autres tables et
  // suit exactement leur vie : une fenêtre qui entre, une fenêtre qui meurt.
  // Le tenir PAR FENÊTRE et non globalement est indispensable : l'iframe du
  // plateau est refaite au changement de nuit, et une fenêtre neuve doit tout
  // recevoir, sinon elle afficherait un plateau sans ses fonds.
  var srcFrames = [], srcIds = [], srcLourds = [], MAX_SRC = 64;
  // Les fenêtres MORTES quittent la table. Sans ce ménage, chaque cadre détruit
  // (une fiche qu'on ferme et rouvre, un panneau qu'on replie) gardait sa place
  // pour toujours : au soixante-cinquième, le pont refusait toute nouvelle
  // liaison et TOUT se figeait en silence — le plateau comme les fiches
  // ouvertes ensuite. Une fenêtre détruite rend closed = true, ou refuse qu'on
  // la lise : les deux cas se traitent pareil.
  function menage() {
    for (var i = srcFrames.length - 1; i >= 0; i--) {
      var mort;
      try { mort = !srcFrames[i] || srcFrames[i].closed; } catch (e) { mort = true; }
      if (mort) { srcFrames.splice(i, 1); srcIds.splice(i, 1); srcLourds.splice(i, 1); }
    }
  }
  function lier(src, id) {
    if (!src || !id) return false;
    var i = srcFrames.indexOf(src);
    if (i >= 0) return srcIds[i] === id;
    menage();
    if (srcFrames.length >= MAX_SRC) return false;
    srcFrames.push(src); srcIds.push(id); srcLourds.push(null);
    return true;
  }
  // vérifie sans jamais lier : un « save » d'une frame qui n'a jamais chargé
  // n'a aucune raison d'exister (l'amorce charge toujours avant d'écrire).
  function liee(src, id) {
    var i = srcFrames.indexOf(src);
    return i >= 0 && srcIds[i] === id;
  }

  function models(ch) { return (ch && ch.attribs && ch.attribs.models) || []; }
  function attrVal(m, key) { return m.get ? m.get(key) : (m.attributes && m.attributes[key]); }
  // TOUS LES HOMONYMES, et non le premier. Un personnage peut porter PLUSIEURS
  // attributs du même nom : Roll20 ne l'interdit pas, et le pont lui-même en a
  // fabriqué tant que la fiche de « Narration » n'était pas ouverte — la
  // collection était vide, findAttr ne trouvait rien, et chaque écriture créait
  // un doublon au lieu de mettre à jour l'existant.
  //
  // Le dégât est sournois parce que les deux moitiés du dispositif ne
  // choisissent pas le même : writeOne écrivait dans le PREMIER, readAll
  // parcourt tout et laisse le DERNIER gagner. L'écriture était donc réellement
  // enregistrée — le serveur répondait « accepté », mesuré chez l'auteur — et la
  // relecture rendait quand même l'ancienne valeur, indéfiniment. Le compte le
  // disait : 82 attributs pour 18 attendus.
  function findAllAttrs(ch, name) {
    var ms = models(ch), out = [];
    for (var i = 0; i < ms.length; i++) if (attrVal(ms[i], "name") === name) out.push(ms[i]);
    return out;
  }

  function readAll(id) {
    var ch = getChar(id), out = {};
    models(ch).forEach(function (m) {
      var n = attrVal(m, "name");
      if (typeof n === "string" && n.indexOf(PREFIX) === 0) {
        out[n] = { current: str(attrVal(m, "current")), max: str(attrVal(m, "max")) };
      }
    });
    return out;
  }

