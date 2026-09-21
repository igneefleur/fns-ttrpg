  // ---------- envoi au tchat : destinataire, modificateur, dés engagés ----------
  // Tout ce que la fiche envoie à Roll20 traverse ce bloc. La commande est
  // composée ICI, côté site, et part par window.__owdChat, que l'extension
  // relaie SANS RIEN RÉÉCRIRE : le format peut donc évoluer sans re-signature.
  // Les trois réglages vivent dans le VRAI localStorage du navigateur : ce ne
  // sont pas des données de personnage, et les écrire dans les Attributes
  // Roll20 à chaque clic n'aurait aucun sens.
  var ENVOI = {
    mode: "owd-r20-envoi",         // "public" | "gm" | "joueur"
    dest: "owd-r20-envoi-dest",    // nom d'affichage du destinataire
    input: "owd-r20-envoi-input",  // "0" sans | "1" avec
    des: "owd-r20-envoi-des",      // "0" au maximum | "1" au choix
    noms: "owd-r20-envoi-noms"     // liste de secours, si Roll20 ne la donne pas
  };
  // LES DEUX SEULS APPELS BRUTS AU localStorage DE TOUT LE BUNDLE, et c'est
  // délibéré : partout ailleurs on passe par STORE, donc par le shim de
  // l'amorce, qui n'est qu'un cache en MÉMOIRE et meurt avec la page. Y ranger
  // ces réglages les ferait oublier à chaque ouverture de la fiche. Ici on vise
  // au contraire la persistance, sur le site comme dans Roll20 quand le
  // navigateur autorise le stockage tiers. La contrepartie est assumée : dans
  // une iframe d'une autre origine, Chrome peut refuser l'accès — les deux
  // appels sont donc sous try/catch, l'échec est SILENCIEUX, et les réglages
  // d'envoi repartent alors de leur valeur par défaut à chaque ouverture. Rien
  // de ce qui est ici n'appartient au personnage : le perdre ne perd rien.
  function lpref(k, def) {
    try { var v = localStorage.getItem(k); return v == null ? def : v; } catch (e) { return def; }
  }
  function lset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function envMode() {
    var m = lpref(ENVOI.mode, "public");
    return m === "gm" || m === "joueur" ? m : "public";
  }
  function envDest() { return lpref(ENVOI.dest, ""); }
  function envInput() { return lpref(ENVOI.input, "0") === "1"; }
  function envDesChoix() { return lpref(ENVOI.des, "0") === "1"; }
  // TITRES et libellés : les accolades casseraient la carte, les blancs se
  // replient. Même assainissement que celui que l'extension ne fait pas.
  function envSan(s) {
    return String(s == null ? "" : s).replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  }
  // VALEURS de champ : les accolades d'une macro Roll20 (@{Perso|owd_force},
  // ?{…}) sont LÉGITIMES et doivent survivre. Un champ de gabarit se ferme sur
  // « }} » : c'est la SEULE séquence à briser, et une valeur qui finit par une
  // accolade prend une espace pour ne pas en fabriquer une avec la fermeture.
  function envVal(s) {
    var v = String(s == null ? "" : s).replace(/\s+/g, " ").trim().replace(/\}\}/g, "} }");
    return /\}$/.test(v) ? v + " " : v;
  }
  // Le préfixe de chuchotement OUVRE la commande : Roll20 exige que le message
  // COMMENCE par « / », un seul blanc devant et tout part en clair, en public.
  // Un nom qui contient une espace doit être entre guillemets droits.
  function envPrefixe() {
    var m = envMode();
    if (m === "gm") return "/w gm ";
    if (m === "joueur") {
      var d = envSan(envDest()).replace(/"/g, "");
      if (d) return "/w \"" + d + "\" ";
      // « à un joueur » sans destinataire : public plutôt qu'une commande cassée
    }
    return "";
  }
  // Requête Roll20, résolue à l'envoi. Les parenthèses laissent saisir un
  // modificateur négatif sans ambiguïté (« + (-3) »).
  var ENV_QUERY = " + (?{Modificateur|0})";
  // Combien de dés d'action le joueur engage. Le rang donne un PLAFOND (1, 2 ou
  // 3 dés) ; engager moins est un choix de jeu, pas une entorse. La requête se
  // pose EN FACTEUR du dé : « ?{Dés engagés|2}d8 ».
  function desQuery(n) { return "?{Dés engagés|" + Math.max(0, num(n, 0)) + "}"; }
  // Option de jet Roll20 : le résultat s'inscrit au compteur de tours. Elle se
  // pose DANS le jet en ligne, ENTRE les doubles crochets, jamais après « }} » :
  // hors d'un « /roll », Roll20 ne la lit qu'attachée au jet lui-même. AUCUN
  // bouton natif ne l'emploie — les règles publiées ne donnent pas d'ordre du
  // tour — mais le paramètre reste dans la signature pour qu'un mod puisse le
  // demander le jour où il arrivera.
  var ENV_TRACKER = " &{tracker}";
  function cmdJet(label, value, die, avecInput, desMax, tracker) {
    // « + 0 » est du bruit : une valeur nulle ne s'écrit pas.
    var v = value ? (value > 0 ? " + " + value : " - " + (-value)) : "";
    // Le dé voit ses blancs REPLIÉS : une commande multiligne est refusée par
    // l'extension, et le clic partirait alors sans rien envoyer. Ses accolades,
    // elles, restent : « ?{Dés engagés|2}d8 » est un dé légitime.
    var de = String(die == null ? "" : die).replace(/\s+/g, " ").trim() || (state.de || DE_DEFAUT);
    // « Dés au choix » : le nombre de dés devient une requête, le nombre du
    // rang restant proposé par défaut. On ne remplace que le FACTEUR, jamais
    // les faces — le d8 est la seule constante du jeu.
    if (desMax && envDesChoix()) de = de.replace(/^\s*\d+(?=d\d)/i, desQuery(desMax));
    return "&{template:default} {{name=" + (envSan(label) || "Jet") +
           "}} {{Jet=[[" + de + v +
           (avecInput ? ENV_QUERY : "") +
           (tracker ? ENV_TRACKER : "") + "]]}}";
  }
  function cmdCarte(title, fields) {
    var cmd = "&{template:default} {{name=" + envSan(title) + "}}";
    (fields || []).forEach(function (f) {
      if (!f) return;
      var k = envSan(f[0]), v = envVal(f[1]);
      if (v) cmd += " {{" + k + "=" + v + "}}";
    });
    return cmd;
  }
  // envoi effectif : préfixe + commande. Rend false hors Roll20, ce qui
  // déclenche les replis.
  function envoyer(cmd) {
    if (typeof window === "undefined" || typeof window.__owdChat !== "function") return false;
    window.__owdChat(envPrefixe() + cmd);
    return true;
  }

