  // ---------- le moteur de mods ----------
  // jjk-mods.js est FACULTATIF DE NAISSANCE, exactement comme jjk-migrations.js :
  // sans lui la fiche s'ouvre, simplement sans mods. Il ne touche ni au DOM ni à
  // l'état, il reçoit la liste des mods et rend un bilan.
  //
  // Bilan du dernier passage : le bloc Options « Mods » et le bandeau de
  // consentement le lisent. Vide tant que le moteur n'a pas tourné.
  var bilanMods = [];
  function modActifDe(id) {
    var a = true;
    ((state && state.mods) || []).forEach(function (m) { if (m && m.id === id) a = m.actif !== false; });
    return a;
  }
  function modDe(id) {
    var out = null;
    ((state && state.mods) || []).forEach(function (m) { if (m && m.id === id) out = m; });
    return out;
  }
  // Ce propriétaire est-il un MOD ? Son id figure alors parmi les mods du
  // personnage, ou dans le bilan du montage précédent — un mod qu'on vient de
  // supprimer n'est plus que là, et c'est justement celui-là qu'il faut
  // reconnaître. « mod » est le repli du moteur : un mod dont on ignore le nom.
  function propEstUnMod(prop) {
    if (!prop || prop === "?") return false;
    if (prop === PROP_MOD) return true;
    return !!modDe(prop) || !!bilanDeMod(prop);
  }
  // Un mod n'a plus rien à faire tourner dès qu'il quitte le personnage, qu'on
  // le coupe ou qu'on lui retire son accord : ce qu'il a inscrit hors montage
  // (le filtre posé par l'un de ses boutons) s'arrête avec son code.
  function modAutorise(prop) {
    var m = modDe(prop);
    if (!m || m.actif === false) return false;
    return avisMod(empreinteMod(m.id, m.src)) === "oui";
  }
  function executeMods() {
    bilanMods = [];
    if (!state || !state.mods || !state.mods.length) return;
    if (!window.JjkMods || typeof window.JjkMods.execute !== "function") return;
    var avant = proprietaireCourant;
    // Un mod qui pose un filtre le fait pendant que le moteur l'exécute : le
    // propriétaire du moment lui revient. Le moteur peut nommer le mod qu'il
    // lance (Jjk.__proprietaire) ; s'il ne le fait pas, faute de mieux, tout ce
    // qui s'enregistre là appartient à « mod ».
    proprietaireCourant = PROP_MOD;
    try {
      var b = window.JjkMods.execute(state.mods, window.Jjk, { version: RELEASE, schema: SCHEMA });
      if (Array.isArray(b)) bilanMods = b;
      // Le bilan se range et se tait : une faute de syntaxe dans un mod ne
      // laissait RIEN dans la console du navigateur, alors que la page Mods dit
      // d'y regarder en premier. Le message part au même format que les autres
      // ennuis de module (« [mod:<id>] »), pour qu'un filtre sur « [mod: »
      // ramasse tout ce qui concerne un mod, d'où que ça vienne.
      bilanMods.forEach(function (x) {
        if (!x || x.etat !== "panne") return;
        if (window.console && window.console.warn)
          window.console.warn("[mod:" + x.id + "] en panne : " + (x.message || "sans message"));
      });
    } catch (err) {
      // le moteur lui-même en panne : la fiche s'ouvre quand même, sans mods
      if (window.console && window.console.warn)
        window.console.warn("[mods] moteur en panne : " + messageErreur(err));
    }
    proprietaireCourant = avant;
  }

