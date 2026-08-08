  // ---------- envoi au tchat : destinataire et modificateur ----------
  // Tout ce que la fiche envoie à Roll20 traverse ce bloc. La commande est
  // composée ICI, côté site, et part par window.__jjkChat, que l'extension
  // relaie SANS RIEN RÉÉCRIRE : le format peut donc évoluer sans re-signature.
  // Les deux réglages (à qui, avec ou sans modificateur) vivent dans le VRAI
  // localStorage du navigateur, comme la préférence jour/nuit : ce ne sont pas
  // des données de personnage, et les écrire dans les Attributes Roll20 à
  // chaque clic n'aurait aucun sens.
  var ENVOI = {
    mode: "jjk-r20-envoi",        // "public" | "gm" | "joueur"
    dest: "jjk-r20-envoi-dest",   // nom d'affichage du destinataire
    input: "jjk-r20-envoi-input", // "0" (sans) | "1" (avec)
    carac: "jjk-r20-envoi-carac", // "0" (automatique) | "1" (carac au choix au lancer)
    noms: "jjk-r20-envoi-noms"    // liste de secours, si Roll20 ne la donne pas
  };
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
  function envCaracChoix() { return lpref(ENVOI.carac, "0") === "1"; }
  // Même assainissement que l'extension (content-roll20.js) : sur le canal brut
  // elle n'en fait aucun, une accolade ou un retour à la ligne d'un texte de
  // fiche casserait la carte.
  function envSan(s) {
    return String(s == null ? "" : s).replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  }
  // Valeur de champ : les accolades d'une macro Roll20 (@{Perso|jjk_body},
  // ?{…}) sont légitimes et doivent survivre. Un champ de gabarit se ferme sur
  // « }} » : c'est la SEULE séquence à briser, et une valeur qui finit par une
  // accolade prend une espace pour ne pas en fabriquer une avec la fermeture.
  function envVal(s) {
    var v = String(s == null ? "" : s).replace(/\s+/g, " ").trim().replace(/\}\}/g, "} }");
    return /\}$/.test(v) ? v + " " : v;
  }
  // Le préfixe de chuchotement ouvre la commande : Roll20 exige que le message
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
  // Requête Roll20 : résolue côté client à l'envoi, donc seulement parce que
  // l'extension écrit dans la zone de saisie du tchat. Les parenthèses laissent
  // saisir un modificateur négatif sans ambiguïté (« + (-5) »).
  var ENV_QUERY = " + (?{Modificateur|0})";
  // Option de jet Roll20 : le résultat s'inscrit dans le compteur de tours, à
  // la ligne du token sélectionné (créée si elle manque). Réservée à
  // l'initiative, seul jet dont dépend une place au tour.
  // Elle se pose DANS le jet en ligne, entre les doubles crochets, et non à la
  // fin du message : hors d'un « /roll », c'est-à-dire dès qu'on passe par un
  // gabarit, Roll20 ne la lit qu'attachée au jet lui-même
  // (wiki Macros/Initiative : {{Initiative=[[1d20+…&{tracker}]]}}). Posée après
  // « }} », elle s'afficherait en toutes lettres au tchat sans rien compter.
  var ENV_TRACKER = " &{tracker}";
  function cmdJet(label, value, die, avecInput, caracQ, tracker) {
    // « + 0 » est du bruit sur les jets d'équipement (dégâts, invu), qui
    // n'ont jamais de bonus : l'expression part seule.
    var v = value ? (value > 0 ? " + " + value : " - " + (-value)) : "";
    // Le libellé passe par envSan comme les titres de cartes, et le dé voit
    // ses blancs repliés : un saut de ligne (nom de compétence venu d'un
    // import, dé recopié depuis une macro) ferait une SECONDE ligne au tchat.
    // L'extension refuse une commande multiligne, et le clic partirait alors
    // sans rien envoyer. Les accolades du dé restent : « ?{Dé|1d100} » et
    // « @{…} » sont des dés légitimes dans Roll20.
    var de = String(die == null ? "" : die).replace(/\s+/g, " ").trim() || DE_DEFAUT;
    return "&{template:default} {{name=" + (envSan(label) || "Jet") +
           "}} {{Jet=[[" + de +
           (caracQ ? " + (" + caracQ + ")" : "") + v +
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
  // envoi effectif : préfixe + commande. Renvoie false hors Roll20.
  function envoyer(cmd) {
    if (typeof window === "undefined" || typeof window.__jjkChat !== "function") return false;
    window.__jjkChat(envPrefixe() + cmd);
    return true;
  }

