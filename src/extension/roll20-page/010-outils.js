  var PREFIX = "mia_";
  var WRITE_DELAY = 60;   // ms entre deux écritures d'attribut

  function str(v) { return v == null ? "" : String(v); }
  function usable(c) { return (c && c.characters && c.characters.get) ? c : null; }
  // même prédicat qu'IS_POPOUT côté content-script (ce fichier vit dans le monde principal)
  var IS_POPOUT = /^\/editor\/character\/[^/]+\//.test(location.pathname);
  // Fenêtre popout d'une fiche : le d20 de la campagne vit dans la fenêtre qui a
  // ouvert le popout (même origine app.roll20.net -> accès direct autorisé) ; on
  // s'y rabat quand cette fenêtre n'a pas de Campaign utilisable à elle. Repli
  // STRICTEMENT réservé au popout : dans l'éditeur, un opener n'est jamais consulté.
  // La FENÊTRE d'où vient le Campaign retenu : c'est là que vivent le journal et
  // les dialogues de fiche, dont l'ouverture forcée plus bas a besoin. Sans elle,
  // le popout irait chercher un journal qu'il n'a pas.
  var winCampagne = null;
  function campaign() {
    var c = usable(window.Campaign || (window.d20 && window.d20.Campaign) || null);
    if (c) { winCampagne = window; return c; }
    if (!IS_POPOUT) return null;
    try {
      var o = window.opener;
      if (o && !o.closed) {
        var co = usable(o.Campaign || (o.d20 && o.d20.Campaign) || null);
        if (co) { winCampagne = o; return co; }
      }
    } catch (e) {}
    return null;
  }
  function getChar(id) {
    var c = campaign();
    return (c && c.characters && c.characters.get) ? c.characters.get(id) : null;
  }
