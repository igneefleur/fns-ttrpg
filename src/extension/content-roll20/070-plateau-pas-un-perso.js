  // ---------- « Narration » porte un plateau, pas un personnage ----------
  // Ce personnage-là existe pour ranger l'état du plateau dans ses Attributes,
  // et pour rien d'autre : le MJ le rend contrôlable par tous, c'est le seul
  // objet d'une campagne où chacun a lecture et écriture. Lui poser l'onglet
  // « Fiche JJK », c'est inviter à créer une fiche de personnage dessus — et
  // c'est déjà arrivé : la carte d'attributs d'une fiche en produit une
  // soixantaine, mesurés à 82 attributs « jjk_ » pour 18 attendus, que le pont
  // doit maintenant retirer au démarrage. On coupe donc à la racine.
  //
  // LE NOM EST CELUI QUE LE PONT CONNAÎT (roll20-page.js, NARR_NOM) : c'est la
  // même chaîne, comparée de la même façon, et les deux doivent bouger
  // ensemble. Ici on ne peut pas interroger le pont — un script de contenu ne
  // voit pas window.Campaign — et surtout on ne veut pas l'INJECTER pour si
  // peu : ce fichier tient à ne rien injecter de son propre chef.
  //
  // Trois sources, de la plus fiable à la plus lointaine, parce qu'aucune n'est
  // garantie : le journal de la partie (là où Roll20 écrit les noms, et où le
  // pont va déjà chercher de quoi ouvrir la fiche), le titre du dialogue, et en
  // fenêtre séparée le titre du document. AUCUN NOM TROUVÉ VAUT « ce n'est pas
  // le plateau » : on ne retire jamais un chemin d'accès sur un doute.
  var NARR_NOM = "narration";
  function docsDeNoms() {
    var out = [];
    function ajoute(d) { try { if (d && out.indexOf(d) < 0) out.push(d); } catch (e) {} }
    ajoute(document);
    try { ajoute(window.top && window.top.document); } catch (e) {}
    try { var o = window.opener; if (o && !o.closed) ajoute(o.document); } catch (e) {}
    return out;
  }
  function nomJournal(charId) {
    if (!/^[-A-Za-z0-9_]{1,40}$/.test(String(charId || ""))) return "";
    var docs = docsDeNoms();
    for (var i = 0; i < docs.length; i++) {
      try {
        var li = docs[i].querySelector('[data-itemid="' + charId + '"]');
        var n = li && (li.querySelector(".namecontainer") || li.querySelector(".name"));
        if (n && n.textContent) return n.textContent;
      } catch (e) {}
    }
    return "";
  }
  function nomDialogue() {
    try {
      var fe = window.frameElement;
      var dlg = fe && fe.closest && fe.closest(".ui-dialog");
      var t = dlg && dlg.querySelector(".ui-dialog-title");
      if (t && t.textContent) return t.textContent;
    } catch (e) {}
    return "";
  }
  function estPlateau(charId) {
    var n = nomJournal(charId) || nomDialogue() || (IS_POPOUT ? document.title : "");
    return !!n && norm(n) === NARR_NOM;
  }

