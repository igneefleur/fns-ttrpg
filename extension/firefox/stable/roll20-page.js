/* Pont d20 — s'exécute dans le MONDE PRINCIPAL de la page Roll20 (là où vit
 * window.d20 / window.Campaign, invisible depuis un content-script isolé). Injecté
 * par content-roll20.js dans la frame du haut via <script src=web_accessible>.
 *
 * Rôle : lire, créer et mettre à jour les Attributes « owd_* » d'un personnage, à la
 * demande de l'iframe du créateur (qui poste des messages vers window.top). Modèle
 * client confirmé par VTTES / Beyond20 / roll20-character-exporter-importer :
 *   Campaign.characters.get(id).attribs -> collection Backbone
 *     .models                 -> [{ get('name'|'current'|'max'), attributes, save() }]
 *     .create()               -> nouvel attribut (on remplit .attributes puis .save())
 *   attr.save({current,max})  -> persiste (Firebase) et synchronise à tous les joueurs.
 *
 * Écritures THROTTLÉES : Roll20 déconnecte / perd des écritures sur des rafales
 * (importateurs tiers insèrent un « Rest Time »). On écrit un attribut à la fois,
 * espacés, en file séquentielle.
 *
 * COPIE. Ce fichier existe DEUX FOIS, stable/roll20-page.js et
 * beta/roll20-page.js. Une seule des deux est jamais chargée : content-roll20.js
 * choisit l'adresse à l'exécution, et l'isolation est donc ici RÉELLE. Les deux
 * copies sont IDENTIQUES À L'OCTET, et c'est normal : ce pont ne connaît pas le
 * mode et n'a pas à le connaître. Il n'écrit que les Attributes owd_* du
 * personnage, que les deux parties se partagent de toute façon. La séparation
 * n'existe ici que pour laisser la partie beta changer son pont sans toucher à
 * celui qui tourne en partie. Un « diff stable/roll20-page.js
 * beta/roll20-page.js » ne doit RIEN rendre.
 *
 * TOUTE CORRECTION DE SÛRETÉ DOIT ÊTRE APPLIQUÉE AUX DEUX COPIES. Les verrous
 * de ce fichier (window.__owdBridge, ecrivable(), lier()/liee() et sa table de
 * soixante-quatre places, le repli sur l'opener strictement réservé au popout,
 * l'ouverture forcée de la fiche du camp et le « sûr » qu'elle seule donne,
 * et les trois verrous du ménage des attributs, qui est la seule opération
 * DESTRUCTRICE du dispositif) vivent en double exemplaire : un correctif posé
 * d'un seul côté laisse le trou grand ouvert de l'autre, et rien ne le
 * signalera.
 *
 * Le verrou window.__owdBridge est COMMUN aux deux copies, tout comme le
 * marqueur data-owd-bridge que pose content-roll20.js : deux ponts dans le même
 * monde principal écriraient chaque attribut deux fois et rempliraient la table
 * des liaisons deux fois plus vite. Ne jamais y faire entrer le mode.
 */
(function () {
  "use strict";
  if (window.__owdBridge) return;   // jamais deux ponts (écouteurs en double)
  window.__owdBridge = true;
  var PREFIX = "owd_";
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
  // ---------- garde-fous : la page qui parle n'est pas signée ----------
  // La fiche et le camp sont servis par le site : n'importe quel code de ces
  // pages peut poster un message « ns:"owd" », et ces pages changent sans
  // signature alors que ce pont, lui, est figé par elle. Le pont ne peut donc
  // pas faire confiance à ce qu'il reçoit, même marqué. Deux verrous, ci-dessous
  // et au traitement des messages.
  //
  // VERROU 1 — ÉCRITURE : seuls les attributs « owd_* ». C'est tout ce que la
  // fiche produit (voir owd-attr-map.js) ; un autre nom écraserait les attributs
  // NATIFS du personnage (barres de token, macros, feuille Roll20). Refus
  // silencieux : rien à signaler à qui l'a demandé.
  function ecrivable(name) { return typeof name === "string" && name.indexOf(PREFIX) === 0; }

  // VERROU 2 — LIAISON SOURCE <-> PERSONNAGE : une fiche n'écrit que dans le
  // personnage qu'elle affiche. Le premier « load » d'une frame fixe son
  // charId ; il vient de l'amorce du site, qui le poste AVANT de charger le
  // bundle, donc avant que le moindre code de la page ait pu parler. Ensuite
  // tout « load » ou « save » de cette même frame pour un AUTRE personnage est
  // refusé : sans ça, un code déposé sur un seul personnage écrirait, dès que
  // le MJ ouvre sa fiche, dans toutes les fiches de la campagne.
  // La clé est l'objet fenêtre source lui-même (ev.source) : une fenêtre ne
  // peut pas se faire passer pour une autre. Le plafond borne la table ; au-
  // delà on REFUSE au lieu de recycler une entrée (recycler rouvrirait la
  // porte : il suffirait d'inonder le pont pour se relier ailleurs).
  // srcLourds tient, POUR CHAQUE FENÊTRE, l'empreinte des gros attributs qu'on
  // lui a déjà envoyés (voir allege). Il est parallèle aux deux autres tables et
  // suit exactement leur vie : une fenêtre qui entre, une fenêtre qui meurt.
  // Le tenir PAR FENÊTRE et non globalement est indispensable : l'iframe du
  // camp est refaite au changement de nuit, et une fenêtre neuve doit tout
  // recevoir, sinon elle afficherait un camp sans ses fonds.
  var srcFrames = [], srcIds = [], srcLourds = [], MAX_SRC = 64;
  // Les fenêtres MORTES quittent la table. Sans ce ménage, chaque cadre détruit
  // (une fiche qu'on ferme et rouvre, un panneau qu'on replie) garderait sa
  // place pour toujours : au soixante-cinquième, le pont refuserait toute
  // nouvelle liaison et TOUT se figerait en silence — le camp comme les fiches
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
  // attributs du même nom : Roll20 ne l'interdit pas, et le pont lui-même en
  // fabrique tant que la fiche de « Camp » n'a pas été ouverte — la collection
  // est vide, une recherche du premier ne trouve rien, et chaque écriture crée
  // un doublon au lieu de mettre à jour l'existant.
  //
  // Le dégât est sournois parce que les deux moitiés du dispositif ne
  // choisissent pas le même : writeOne écrirait dans le PREMIER, readAll
  // parcourt tout et laisse le DERNIER gagner. L'écriture serait donc réellement
  // enregistrée — le serveur répond « accepté » — et la relecture rendrait quand
  // même l'ancienne valeur, indéfiniment.
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

  // ---------- les gros attributs ne repartent qu'AU CHANGEMENT ----------
  // Un fond de zone téléversé est rangé en base64 DANS l'attribut : quelques
  // centaines de milliers de caractères, parfois plus. Or le camp relit tout
  // toutes les 1.2 s, et postMessage RECOPIE la chaîne à chaque envoi : renvoyer
  // les images à chaque tour étouffe la liaison, et c'est le camp entier qui
  // se met à traîner, jetons compris. On envoie donc un gros attribut une
  // première fois, puis on ne le renvoie que si son EMPREINTE a changé.
  //
  // Le tri se fait sur la TAILLE, jamais sur le nom. Le nom des attributs de
  // fond appartient à la page servie par le site, qui doit pouvoir en changer
  // sans re-signature ; la taille, elle, est le vrai critère — c'est elle qui
  // étouffe la liaison, pas l'orthographe.
  //
  // C'EST LE CAMP QUI DEMANDE À ÊTRE ALLÉGÉ, et rien ne s'allège sans qu'il
  // l'ait dit (« allege: true » dans son « load »). Ce n'est pas de la
  // prudence de principe, c'est la seule conduite tenable ici : le pont est
  // SIGNÉ et le camp ne l'est pas, ils ne sont donc jamais déployés le même
  // jour — la moitié stable du pont part chez Mozilla maintenant, la page de
  // /owd/ arrivera quand elle arrivera. Un pont qui allégerait de son propre
  // chef ferait disparaître les fonds d'un camp plus ancien, qui reconstruit
  // ses images à chaque lecture et prendrait l'absence pour un retrait. Il
  // faudrait alors une signature pour réparer. Dans l'autre sens, un camp
  // neuf devant un pont ancien reçoit tout à chaque tour : c'est lent, ce n'est
  // pas cassé.
  //
  // LE CAMP DOIT SAVOIR CE QU'ON LUI A TU. La réponse porte toujours
  // « omis » (le tableau des noms retenus, vide s'il n'y en a pas) : sa seule
  // présence dit au camp que ce pont-ci sait alléger, et qu'un nom manquant
  // veut dire « inchangé », jamais « effacé ».
  //
  // DEUX FILETS, parce qu'une empreinte qui se désaccorde ne se voit pas.
  //   - « complet » : le camp peut réclamer tout, et doit le faire à sa
  //     première lecture (une page rechargée dans la MÊME fenêtre garderait
  //     sinon des empreintes qui ne correspondent plus à rien chez elle) ;
  //   - RENVOI_TOUT : passé une minute, tout repart de toute façon.
  var LOURD_MIN = 512;        // caractères : en dessous, ça ne coûte rien, ça part
  var RENVOI_TOUT = 60000;    // ms : filet, tout repart de temps en temps
  function empreinte(s) {
    // djb2 : bon marché et suffisant. On ne compare pas deux mégaoctets à chaque
    // tour, on compare une longueur et un nombre.
    var h = 5381, i = 0;
    for (; i < s.length; i++) { h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0; }
    return String(s.length) + "." + String(h);
  }
  function allege(attrs, src, complet) {
    var i = srcFrames.indexOf(src);
    if (i < 0) return [];   // fenêtre inconnue : on n'allège rien
    var etat = srcLourds[i];
    if (!etat) { etat = srcLourds[i] = { vus: {}, t: 0 }; }
    var n = Date.now(), force = complet || (n - etat.t >= RENVOI_TOUT);
    if (force) etat.t = n;
    var omis = [], nom;
    for (nom in attrs) {
      if (!attrs.hasOwnProperty(nom)) continue;
      var v = attrs[nom];
      if ((v.current.length + v.max.length) < LOURD_MIN) {
        // redevenu léger (une adresse a remplacé une image) : plus rien à retenir
        if (etat.vus[nom]) delete etat.vus[nom];
        continue;
      }
      var e = empreinte(v.current) + "/" + empreinte(v.max);
      if (!force && etat.vus[nom] === e) { delete attrs[nom]; omis.push(nom); }
      else etat.vus[nom] = e;
    }
    return omis;
  }

  // Écriture SILENCIEUSE — indispensable quand la fiche du perso est OUVERTE.
  // Un attribut modifié déclenche sinon onAttribChange -> updateSheetValues de Roll20,
  // qui plante (« u.childWindow.d20 is undefined ») -> la fiche charge à l'infini.
  // Deux précautions :
  //  - set(..., {silent:true}) (et NON .attributes=) : met à jour le suivi de changement
  //    Backbone, si bien que l'écho Firebase de notre écriture voit une valeur IDENTIQUE
  //    -> aucun événement change -> Roll20 ne rafraîchit pas la fiche -> pas de crash ;
  //  - save(null, …) persiste dans Firebase.
  //
  // Le silence est sur le SET, et il est plus nécessaire que jamais depuis que
  // le pont ouvre lui-même la fiche de « Camp ».
  //
  // SAVE N'EST PAS SILENCIEUX, ET C'EST TOUTE LA DIFFÉRENCE.
  //
  // Backbone transmet ses options jusqu'à la synchronisation. Pour Roll20,
  // « silencieux » veut dire NE PAS PROPAGER : un save silencieux demanderait
  // donc au serveur de ne rien recevoir, et l'écho Firebase de la valeur
  // inchangée restaurerait ensuite l'ancienne, jusque dans le modèle. Le modèle
  // prendrait bien la valeur (voulu et modele identiques), puis la relecture
  // rendrait la position d'avant, à l'identique, indéfiniment.
  //
  // ON ÉCOUTE CE QUE LE SERVEUR RÉPOND. save() accepte success et error : sans
  // les lire, on écrit sans jamais demander si l'écriture a été acceptée.
  // Quatre issues, et elles appellent quatre corrections différentes : le
  // serveur accepte (et le problème est ailleurs), le serveur REFUSE en le
  // disant (permission), l'appel lève, ou rien ne répond du tout (l'écriture
  // n'est même pas partie). Le camp en a un usage concret dès qu'il porte des
  // fonds de zone : une image trop lourde se fait refuser, et c'est en le
  // SACHANT qu'il peut la réduire et réessayer, au lieu de croire qu'elle est
  // passée.
  function texteReponse(rep) {
    var txt = "";
    try { txt = String((rep && (rep.message || rep.statusText || rep.status)) || rep || ""); }
    catch (e) {}
    return txt.slice(0, 120);
  }
  // Les attributs ne sont PAS repassés ici : c'est « m.save(null, …) », et null
  // dit à Backbone d'envoyer l'état courant du modèle, celui que le set juste
  // au-dessus vient d'y poser. Un troisième argument laisserait croire que
  // save écrit ce qu'on lui tend, alors qu'il n'en lit rien.
  function sauve(m, name) {
    if (!m || !m.save) return;
    var fini = false;
    try {
      m.save(null, {
        success: function () { if (!fini) { fini = true; issue(name, "accepte", null); } },
        error: function (mm, rep) { if (!fini) { fini = true; issue(name, "refuse", texteReponse(rep)); } }
      });
    } catch (e) {
      fini = true;
      issue(name, "exception", String((e && e.message) || e).slice(0, 120));
      return;
    }
    setTimeout(function () { if (!fini) { fini = true; issue(name, "aucune reponse", null); } }, 2500);
  }
  function writeOne(ch, name, v) {
    if (!ecrivable(name)) return;   // double fond : writeOne reste sûr quel que soit l'appelant
    var data = { name: name, current: str(v && v.current), max: str(v && v.max) };
    // On écrit dans TOUS les homonymes : c'est le seul moyen que la relecture
    // rende ce qu'on vient d'écrire, quel que soit celui qu'elle retient. Le
    // ménage, lui, ramène le compte à un — mais il ne s'exécute qu'une fois par
    // chargement, et il peut échouer : cette boucle reste la seule garantie.
    var tous = findAllAttrs(ch, name);
    if (tous.length > 1) doublons(name, tous.length);
    if (!tous.length) {
      var neuf = ch.attribs.create(data, { silent: true });
      sauve(neuf, name);
      return relu(neuf, name, data);
    }
    for (var k = 0; k < tous.length; k++) {
      var mk = tous[k];
      // On garde le set SILENCIEUX : c'est lui qui évite l'événement change, donc
      // onAttribChange puis updateSheetValues, qui plante quand la fiche est
      // ouverte — et le pont ouvre justement celle de « Camp ».
      if (mk.set) mk.set(data, { silent: true });
      else { mk.attributes = mk.attributes || {}; mk.attributes.name = data.name; mk.attributes.current = data.current; mk.attributes.max = data.max; }
      sauve(mk, name);
    }
    return relu(tous[0], name, data);
  }

  // CE QUE LE MODÈLE DIT JUSTE APRÈS L'ÉCRITURE. Deux pannes se ressemblent trait
  // pour trait vues du camp : le modèle n'a pas pris notre valeur, ou il l'a
  // prise mais Firebase ne l'a pas reçue. Sans ce relevé, il faut une signature
  // par hypothèse ; avec lui, le prochain retour tranche.
  var dernieresEcritures = {};
  function relu(m, name, data) {
    try {
      var e = dernieresEcritures[name] || {};
      e.voulu = data.current;
      e.modele = m ? str(attrVal(m, "current")) : null;
      dernieresEcritures[name] = e;
    } catch (err) {}
  }
  // Ce que le SERVEUR a répondu à cette écriture. Rangé au même endroit, il
  // voyage avec la lecture suivante jusqu'au camp, donc jusqu'à la console.
  // Combien d'homonymes portait cet attribut : c'est le fait qui manque le plus
  // longtemps quand une valeur ne revient pas, et il se lit d'un coup d'oeil
  // dans la trace du camp.
  function doublons(name, n) {
    try {
      var e = dernieresEcritures[name] || {};
      e.homonymes = n;
      dernieresEcritures[name] = e;
    } catch (err) {}
  }
  // UN REFUS L'EMPORTE SUR UNE ACCEPTATION. Un attribut porté par plusieurs
  // homonymes reçoit autant de réponses que d'exemplaires, et elles n'arrivent
  // pas dans l'ordre : sans cette règle, une acceptation arrivée en dernier
  // effacerait le refus qui, lui, dit au camp qu'il doit réduire son image
  // et réessayer. La plus grave gagne, quel que soit l'ordre.
  function issue(name, quoi, detail) {
    try {
      var e = dernieresEcritures[name] || {};
      if (!(quoi === "accepte" && e.serveur && e.serveur !== "accepte")) {
        e.serveur = quoi;
        if (detail) { e.detail = detail; }
      }
      dernieresEcritures[name] = e;
    } catch (err) {}
  }

  var queue = [], busy = false;
  // Le filtre de préfixe s'applique À L'ENTRÉE : ce qui n'est pas à nous
  // n'entre même pas dans la file (rien à réexaminer, rien à jeter en route).
  function enqueue(id, attrs) {
    var src = attrs || {}, garde = {};
    Object.keys(src).forEach(function (n) { if (ecrivable(n)) garde[n] = src[n]; });
    queue.push({ id: id, attrs: garde, tries: 0 });
    pump();
  }
  function pump() {
    if (busy) return;
    var job = queue.shift();
    if (!job) return;
    busy = true;
    var ch = getChar(job.id);
    // Deux raisons d'attendre, une seule conduite. Campaign injoignable (opener
    // du popout en cours de rechargement...), ou attributs pas encore chargés
    // par Roll20 : dans le second cas, écrire créerait des doublons dans une
    // collection liée à rien — la valeur ne reviendrait jamais et l'ancienne
    // resterait sous elle. On RE-TENTE au lieu de jeter : la fiche a déjà avancé
    // sa base de diff, une écriture jetée serait définitivement perdue.
    // ~1 min de patience. Le contrôle de chargement ne vise QUE le camp
    // (campId, posé plus bas) : une fiche, elle, n'est ouverte que depuis un
    // dialogue déjà ouvert, donc déjà peuplé, et rien ne doit changer pour elle.
    if (!ch || (job.id && job.id === campId && etatAttributs(ch) !== "sur")) {
      busy = false;
      if (++job.tries <= 60) { queue.unshift(job); setTimeout(pump, 1000); }
      return;
    }
    var names = Object.keys(job.attrs), i = 0;
    function step() {
      if (!ch || i >= names.length) {
        // PAS de ch.view.render() ici : re-render déclencherait la mise à jour de fiche
        // de Roll20 (celle qui plante). Les attributs sont persistés via Firebase ;
        // l'onglet Attributes se met à jour de lui-même (au pire à la réouverture).
        busy = false;
        setTimeout(pump, 0);
        return;
      }
      var name = names[i++];
      try { writeOne(ch, name, job.attrs[name]); } catch (e) {}
      setTimeout(step, WRITE_DELAY);   // throttle
    }
    step();
  }

  function reply(ev, msg) { msg.ns = "owd"; try { ev.source.postMessage(msg, "*"); } catch (e) {} }

  // Joueurs de la partie, pour le sélecteur « À un joueur » de la barre d'envoi
  // de la fiche (qui est une iframe d'une autre origine et ne peut pas les lire
  // elle-même). Campaign.players est la collection sœur de Campaign.characters
  // déjà utilisée ici ; chaque modèle porte displayname et online. Rien de tout
  // cela n'est documenté par Roll20 : tout est sondé défensivement, une absence
  // rend une liste vide et la fiche retombe sur sa saisie manuelle.
  // Écartés : les DÉCONNECTÉS (chuchoter à un absent ne sert à rien) et
  // SOI-MÊME (on ne se chuchote pas la macro qu'on vient de lancer).
  function players() {
    var c = window.Campaign || (window.d20 && window.d20.Campaign) || null;
    var col = c && c.players;
    var ms = (col && col.models) || [];
    var moi = "";
    try { moi = window.currentPlayer && window.currentPlayer.id; } catch (e) {}
    var out = [];
    ms.forEach(function (m) {
      try {
        var a = m.attributes || {};
        var nom = (m.get ? m.get("displayname") : a.displayname) || "";
        var en = m.get ? m.get("online") : a.online;
        if (!nom || en === false || m.id === moi) return;
        if (out.indexOf(nom) < 0) out.push(nom);
      } catch (e) {}
    });
    return out;
  }

  // ---------- le camp ----------
  // Le camp partagé vit dans les Attributes d'un personnage nommé « Camp », que
  // le MJ rend contrôlable par tous les joueurs : c'est le SEUL objet d'une
  // campagne où chacun a lecture et écriture (un joueur ne peut pas lire la
  // fiche d'un autre joueur).
  //
  // Le panneau ne connaît aucun identifiant : il demande ICI lequel c'est.
  // C'est le pont qui choisit, jamais la page, et il ne sait désigner que
  // celui-là : le verrou source <-> personnage garde ainsi tout son sens, une
  // frame ne pouvant se lier qu'à un personnage qu'on lui a nommé. Que
  // n'importe qui puisse ensuite écrire ce camp n'est pas une faiblesse,
  // c'est sa raison d'être — comme la table où chacun peut tendre le bras.
  //
  // LE NOM EST CELUI QUE LE CONTENT SCRIPT CONNAÎT (content-roll20.js,
  // CAMP_NOM) : la même chaîne, comparée de la même façon, et les deux doivent
  // bouger ensemble.
  var CAMP_NOM = "camp";
  function campChar() {
    var c = campaign(), ms = (c && c.characters && c.characters.models) || [];
    for (var i = 0; i < ms.length; i++) {
      var n = ms[i].get ? ms[i].get("name") : (ms[i].attributes || {}).name;
      if (String(n == null ? "" : n).replace(/\s+/g, " ").trim().toLowerCase() === CAMP_NOM) return ms[i];
    }
    return null;
  }
  // Le panneau a besoin de savoir s'il peut pousser les jetons ou seulement les
  // regarder : Roll20 refuse l'écriture côté serveur, en silence, et un camp
  // qui ne bouge pas sans dire pourquoi serait incompréhensible.
  //
  // Le pont rend la MATIÈRE, pas la conclusion : qui je suis, si je suis MJ, et
  // la liste brute des contrôleurs. C'est la page servie par le site qui tranche
  // — le jour où Roll20 renomme un de ces globaux (aucun n'est documenté), la
  // réparation est un déploiement, pas une signature.
  function droits(ch) {
    var d = { gm: false, moi: "", controlledby: "" };
    try { d.gm = window.is_gm === true; } catch (e) {}
    try { d.moi = String((window.currentPlayer && window.currentPlayer.id) || ""); } catch (e) {}
    try {
      d.controlledby = String((ch.get ? ch.get("controlledby") : (ch.attributes || {}).controlledby) || "");
    } catch (e) {}
    return d;
  }

  // ---------- les attributs ne sont peuplés qu'à l'ouverture de la fiche ----------
  // ROLL20 NE CHARGE LES ATTRIBUTES D'UN PERSONNAGE QU'À L'OUVERTURE DE SA
  // FICHE. Tant que « Camp » n'a jamais été ouvert dans la partie, readAll
  // rend {} — un vide qui ressemble trait pour trait à un camp neuf — et
  // writeOne crée ses attributs dans une collection qui n'est liée à rien : ils
  // ne reviennent jamais. C'est l'unique cause des deux pannes vues en partie
  // sur le dispositif dont celui-ci est le port : le panneau redistribuait sur
  // du vide, puis annonçait « Roll20 a refusé les dernières écritures » au bout
  // de deux allers-retours manqués.
  //
  // Le pont ouvre donc la fiche lui-même, hors champ, et ne répond « sûr »
  // qu'une fois Roll20 passé par là. RIEN DE TOUT CECI N'EST DOCUMENTÉ par
  // Roll20 : chaque chemin d'ouverture est SONDÉ, du plus discret au plus
  // brutal, et seul le RÉSULTAT observé fait foi — des attributs peuplés, ou le
  // dialogue apparu dans le document. Aucun appel n'est cru sur parole.
  //
  // LA FICHE RESTE OUVERTE, cachée, au lieu d'être refermée sitôt les attributs
  // lus. C'est le choix le plus sûr des deux : rien ne garantit qu'une collection
  // reste synchronisée avec Firebase une fois la fiche fermée, et un camp qui
  // cesserait de voir les jetons poussés par les autres serait une panne bien plus
  // sournoise que celle qu'on répare. Le joueur, lui, ne perd rien : la fiche est
  // hors champ, et elle reparaît s'il l'ouvre lui-même (guet ci-dessous).
  var OUV_ESSAI = 700;      // ms entre deux tentatives d'ouverture
  var OUV_GRACE = 1500;     // ms de fiche ouverte avant de croire un camp vraiment vide
  var OUV_LIMITE = 12000;   // ms au bout desquelles on dit franchement que ça n'a pas marché
  var suivis = {};          // charId -> avancement de l'ouverture
  var campId = null;        // le personnage du camp, seul concerné (voir pump)

  function suivi(id) {
    var s = suivis[id];
    if (!s) {
      s = suivis[id] = { t0: Date.now(), dernier: 0, pas: 0, vue: 0,
                         sur: false, echec: false, tente: false, sienne: false };
    }
    return s;
  }
  function docCampagne() {
    var w = winCampagne || window;
    try { return w.document || null; } catch (e) { return null; }
  }
  // un identifiant inattendu ne part jamais dans un sélecteur bricolé
  function idSur(id) { return /^[-A-Za-z0-9_]{1,40}$/.test(String(id || "")); }
  // Le dialogue de fiche de CE personnage, quand Roll20 l'a ouvert. La classe et
  // l'attribut sont ceux par lesquels le script de contenu reconnaît déjà une
  // fiche ouverte (.characterdialog[data-characterid]).
  function dialogueDe(id) {
    var doc = docCampagne();
    if (!doc || !idSur(id)) return null;
    try { return doc.querySelector('.characterdialog[data-characterid="' + id + '"]'); }
    catch (e) { return null; }
  }
  function boiteDe(dlg) { return (dlg.closest && dlg.closest(".ui-dialog")) || dlg; }
  // La même, mais seulement si elle est VRAIMENT ouverte. Roll20 garde ses
  // dialogues dans le document après fermeture (display:none) : sans ce
  // contrôle, une fiche fermée par le joueur passerait pour ouverte et le pont
  // croirait avoir chargé ce qu'il n'a pas. Notre cachette, elle, ne touche
  // JAMAIS à display, justement pour que ce signe reste celui de Roll20 seul.
  function ficheOuverte(id) {
    var dlg = dialogueDe(id);
    if (!dlg) return null;
    try {
      var w = winCampagne || window;
      if (w.getComputedStyle && w.getComputedStyle(boiteDe(dlg)).display === "none") return null;
    } catch (e) {}
    return dlg;
  }
  // Hors champ, sans prise, mais VIVANTE : display:none déchargerait l'iframe de
  // feuille, c'est-à-dire peut-être ce qu'on est venu chercher. Les propriétés
  // sont posées en !important parce que jQuery UI replace ses dialogues (au
  // redimensionnement de la fenêtre, notamment) et écraserait sinon la cachette.
  function cacheFiche(dlg) {
    var b = boiteDe(dlg);
    if (!b || !b.style) return;
    try {
      b.style.setProperty("position", "fixed", "important");
      b.style.setProperty("left", "-20000px", "important");
      b.style.setProperty("top", "0", "important");
      b.style.setProperty("opacity", "0", "important");
      b.style.setProperty("pointer-events", "none", "important");
      b.setAttribute("aria-hidden", "true");
    } catch (e) {}
  }
  function montreFiche(dlg) {
    var b = boiteDe(dlg);
    if (!b || !b.style) return;
    ["position", "left", "top", "opacity", "pointer-events"].forEach(function (p) {
      try { b.style.removeProperty(p); } catch (e) {}
    });
    try { b.removeAttribute("aria-hidden"); } catch (e) {}
  }
  // LE GUET. Roll20 remploie le même dialogue : le joueur qui ouvre « Camp »
  // depuis le journal ne verrait rien s'ouvrir, notre cachette tenant toujours.
  // On lève donc la cachette à son clic, et on ne la repose plus — la fiche est
  // à lui désormais. isTrusted fait toute la différence entre son geste et le
  // nôtre : notre propre clic de journal est synthétique, il ne se réveille pas
  // lui-même.
  var guet = false;
  function poseGuet() {
    if (guet) return;
    var doc = docCampagne();
    if (!doc || !doc.addEventListener) return;
    guet = true;
    doc.addEventListener("click", function (ev) {
      try {
        if (!ev.isTrusted || !idSur(campId)) return;
        var s = suivis[campId];
        if (!s || s.sienne) return;
        var t = ev.target;
        if (!t || !t.closest || !t.closest('[data-itemid="' + campId + '"]')) return;
        s.sienne = true;
        var dlg = dialogueDe(campId);
        if (dlg) montreFiche(dlg);
      } catch (e) {}
    }, true);
  }
  // Roll20 ouvre une fiche au clic sur son nom dans le journal : faute d'API
  // publiée, on rejoue ce geste. Dernier chemin essayé, parce que c'est le plus
  // brutal — et le plus sûr.
  function clicJournal(id) {
    var doc = docCampagne();
    if (!doc || !idSur(id)) return;
    var li = null;
    try {
      li = doc.querySelector('#journalfolderroot [data-itemid="' + id + '"]') ||
           doc.querySelector('li[data-itemid="' + id + '"]');
    } catch (e) {}
    if (!li) return;
    var cible = li.querySelector(".namecontainer") || li.querySelector(".name") || li;
    var w = winCampagne || window;
    // trois événements parce qu'on ne sait pas lequel Roll20 écoute, et aucun
    // n'a d'effet ailleurs. Pas de dblclick : sur un dossier il le replierait.
    ["mousedown", "mouseup", "click"].forEach(function (t) {
      try {
        cible.dispatchEvent(new w.MouseEvent(t, { bubbles: true, cancelable: true, view: w }));
      } catch (e) {}
    });
  }
  // Du plus discret au plus brutal, un chemin par tentative : la collection sait
  // peut-être se charger seule, la vue du personnage sait peut-être s'ouvrir, et
  // à défaut il reste le geste du joueur. Rien n'est cru : c'est etatAttributs
  // qui regarde ensuite si quelque chose est arrivé.
  var CHEMINS = ["fetch", "showDialog", "render", "journal"];
  function tenteOuvrir(ch, s) {
    var pas = s.pas;
    s.pas = pas + 1;
    s.tente = true;
    var quoi = CHEMINS[pas < CHEMINS.length ? pas : CHEMINS.length - 1];
    try {
      if (quoi === "journal") { clicJournal(ch.id); return; }
      if (quoi === "fetch") {
        if (ch.attribs && typeof ch.attribs.fetch === "function") ch.attribs.fetch();
        return;
      }
      var v = ch.view;
      if (v && typeof v[quoi] === "function") v[quoi]();
    } catch (e) {}
  }
  // « sur » : ce que readAll rend vaut vérité. « attente » : on ne sait pas
  // encore, et personne ne doit conclure. « echec » : Roll20 n'a pas laissé
  // ouvrir la fiche, et il faut le DIRE plutôt que de laisser croire à un refus
  // d'écriture.
  function etatAttributs(ch) {
    var id = ch.id, s = suivi(id), n = Date.now();
    poseGuet();
    if (models(ch).length) {
      // des attributs sont là : Roll20 les a chargés. Vrai aussi quand c'est le
      // joueur qui a ouvert la fiche à la main, ce qui répare tout seul un échec.
      s.sur = true;
      s.echec = false;
      return "sur";
    }
    if (s.sur) return "sur";   // camp lu et VRAIMENT vide : rien à rouvrir
    if (s.echec) return "echec";
    var dlg = ficheOuverte(id);
    // Une fiche ouverte AVANT notre première tentative est au joueur : on ne la
    // cache pas. Son ouverture charge les attributs aussi bien que la nôtre.
    if (dlg && !s.tente) s.sienne = true;
    if (dlg) {
      if (!s.sienne) cacheFiche(dlg);   // à chaque passage : jQuery UI replace ses dialogues
      if (!s.vue) s.vue = n;
      // Fiche ouverte et toujours aucun attribut : passé un instant, c'est que le
      // personnage est VRAIMENT vide (camp neuf). C'est le seul moment où une
      // lecture vide devient une vérité.
      if (n - s.vue >= OUV_GRACE) { s.sur = true; return "sur"; }
      return "attente";
    }
    // fiche refermée entre-temps (par le joueur) : le délai de grâce doit
    // repartir de sa prochaine ouverture, jamais de l'ancienne
    s.vue = 0;
    if (n - s.dernier >= OUV_ESSAI) { s.dernier = n; tenteOuvrir(ch, s); }
    if (n - s.t0 >= OUV_LIMITE) { s.echec = true; return "echec"; }
    return "attente";
  }
  // Le joueur redemande : on repart de zéro, sans oublier À QUI est la fiche.
  // Effacer tout le suivi ferait de la fiche du joueur la nôtre au premier
  // « Réessayer », et on la lui cacherait sous les yeux.
  function relanceOuverture(id) {
    var s = suivis[id];
    if (!s) return;
    s.t0 = Date.now(); s.dernier = 0; s.pas = 0; s.vue = 0;
    s.sur = false; s.echec = false;
  }

  // ---------- le ménage des attributs du camp ----------
  // Deux causes, deux remèdes, et la SEULE opération destructrice de ce fichier
  // — donc la plus surveillée.
  //   - LES ÉTRANGERS. Une fiche de personnage Outward ouverte un jour sur ce
  //     personnage : sa carte d'attributs en produit une soixantaine. Elles
  //     n'ont rien à faire sur un camp, alourdissent chaque lecture, et font
  //     passer le camp pour un personnage. Le compte relevé sur le dispositif
  //     dont celui-ci est le port : 82 attributs pour 18 attendus.
  //   - LES HOMONYMES. Le pont lui-même en fabrique tant que la fiche de
  //     « Camp » n'a pas été ouverte : la collection est vide, chaque écriture
  //     crée un doublon au lieu de mettre à jour l'existant.
  //
  // L'ORDRE N'EST PAS NÉGOCIABLE. On écrit D'ABORD la valeur retenue dans TOUS
  // les homonymes, on ne supprime qu'ENSUITE. Si une suppression échoue au
  // milieu, ce qui survit dit déjà la bonne chose ; l'ordre inverse pourrait
  // laisser un survivant porteur d'une valeur périmée, et le camp reculerait
  // d'un tour sans que personne ne comprenne pourquoi.
  //
  // TROIS VERROUS.
  //   1. LE PERSONNAGE DU CAMP, ET LUI SEUL. campId est choisi par le pont
  //      lui-même, d'après le nom ; aucun autre personnage n'est jamais touché,
  //      et surtout pas une fiche de joueur.
  //   2. JAMAIS LE DERNIER EXEMPLAIRE D'UN NOM DU CAMP : c'est l'état du camp,
  //      et une place perdue ne se retrouve pas. Le contrôle est refait
  //      JUSTE AVANT chaque suppression, sur la collection vivante, parce que
  //      les autres joueurs font le même ménage au même moment sur le même
  //      personnage partagé. Les étrangers, eux, se retirent jusqu'au dernier :
  //      ils ne portent aucun état de camp, c'est même toute la raison de les
  //      retirer — leur appliquer ce verrou reviendrait à ne rien faire.
  //   3. UNE SUPPRESSION QUI ÉCHOUE ARRÊTE TOUT. Insister sur un serveur qui
  //      refuse (un joueur sans droit d'écriture, par exemple), c'est marteler
  //      Roll20 à chaque chargement de partie pour rien. On note où l'on s'est
  //      arrêté, et le camp pourra le dire.
  //
  // Le ménage ne se fait qu'UNE FOIS PAR CHARGEMENT DE PAGE, et seulement quand
  // la lecture vaut vérité (« sur ») : sur une collection non peuplée, tout
  // paraîtrait absent et il n'y aurait rien à retirer — mais rien ne le dirait.
  // Repli si la page ne dit rien : le ménage garde alors TOUT, donc ne détruit
  // rien. Le préfixe des noms du camp n'est pas écrit ici — c'est le site qui
  // le donne.
  var menageFait = false;     // une fois par chargement, pas une fois par lecture
  var menageRapport = null;   // ce qu'il a fait, transmis avec la lecture suivante

  // AUCUN « silent » ICI, contrairement aux écritures, et c'est un choix.
  // Pour Roll20, silencieux veut dire NE PAS PROPAGER (c'est exactement ce qui
  // rendrait save() inopérant, voir plus haut) : une suppression silencieuse
  // resterait donc locale, l'attribut reviendrait au rechargement suivant, et
  // le ménage aurait l'air de marcher sans rien retirer. On accepte en échange
  // que Roll20 rafraîchisse la fiche de « Camp » — qui est ouverte, mais
  // hors champ, et qu'aucun joueur ne regarde — au plus une fois par
  // chargement de partie, puisque le ménage ne se fait qu'une fois.
  function detruit(m, ok, ko) {
    var fini = false;
    function fin(f, a) { if (fini) return; fini = true; f(a); }
    try {
      if (!m || typeof m.destroy !== "function") { fin(ko, "destroy absent"); return; }
      m.destroy({
        success: function () { fin(ok); },
        error: function (mm, rep) { fin(ko, texteReponse(rep)); }
      });
    } catch (e) {
      fin(ko, String((e && e.message) || e).slice(0, 120));
      return;
    }
    setTimeout(function () { fin(ko, "aucune reponse"); }, 4000);
  }
  function encoreLa(ch, m) {
    var ms = models(ch);
    for (var i = 0; i < ms.length; i++) { if (ms[i] === m) return true; }
    return false;
  }

  // CE QUI APPARTIENT AU CAMP EST DIT PAR LE SITE, jamais deviné ici.
  //
  // « tout owd_ qui n'est pas owd_camp_ est un reste de fiche » est un critère
  // NÉGATIF : gravé dans un paquet signé, il condamnerait tout nom que la page
  // du camp se mettrait à écrire plus tard — et cette page, elle, change sans
  // signature. Le site envoie donc SES préfixes avec la demande de ménage, et
  // rien d'autre n'est jamais conservé. Sans cette liste, on ne détruit RIEN :
  // un ménage qui ne sait pas ce qu'il garde n'est pas un ménage.
  var menageGarde = null;   // liste de préfixes, donnée par la page du camp
  function aMoi(n) {
    if (!menageGarde || !menageGarde.length) return true;   // on ne sait pas -> on garde
    for (var i = 0; i < menageGarde.length; i++) {
      if (n.indexOf(menageGarde[i]) === 0) return true;
    }
    return false;
  }
  function menageCamp(ch) {
    if (menageFait) return;
    if (!ch || !campId || ch.id !== campId) return;   // VERROU 1
    menageFait = true;   // posé AVANT le travail : un échec ne doit pas le relancer
    var rap = { trouves: 0, etrangers: 0, doublons: 0, retires: 0 };
    var ms = models(ch), parNom = {}, noms = [], fusions = [], morts = [], i, n;
    for (i = 0; i < ms.length; i++) {
      n = attrVal(ms[i], "name");
      if (typeof n !== "string" || n.indexOf(PREFIX) !== 0) continue;
      rap.trouves++;
      if (!aMoi(n)) {
        rap.etrangers++;
        morts.push({ nom: n, m: ms[i], camp: false });
        continue;
      }
      if (!parNom[n]) { parNom[n] = []; noms.push(n); }
      parNom[n].push(ms[i]);
    }
    for (i = 0; i < noms.length; i++) {
      var l = parNom[noms[i]];
      if (l.length < 2) continue;
      rap.doublons += l.length - 1;
      fusions.push(noms[i]);
      for (var k = 1; k < l.length; k++) morts.push({ nom: noms[i], m: l[k], camp: true });
    }
    if (!fusions.length && !morts.length) { menageRapport = rap; return; }

    // Les étapes se déroulent UNE À UNE et espacées, comme les écritures du
    // camp : Roll20 perd des écritures sur une rafale, et une rafale de
    // suppressions n'est pas moins brutale.
    //
    // « garde » retient l'exemplaire conservé pour chaque nom, « confirme » dit
    // si le serveur a accepté SA valeur. Les copies ne meurent qu'après ce oui.
    var garde = {}, confirme = {};
    // Pas d'attributs en argument : comme sauve(), c'est « m.save(null, …) » qui
    // envoie l'état que le set juste avant a posé dans le modèle.
    function sauveConfirme(m, nom) {
      try {
        if (!m || !m.save) return;
        m.save(null, {
          success: function () { confirme[nom] = true; },
          error: function () { confirme[nom] = false; }
        });
      } catch (e) { confirme[nom] = false; }
    }
    var etape = 0;
    function suite() { setTimeout(pas, WRITE_DELAY); }
    function pas() {
      if (etape < fusions.length) {
        var nom = fusions[etape++];
        // La valeur est relue MAINTENANT, jamais celle de l'inventaire : le
        // camp écrit pendant ce temps-là, et une valeur d'il y a trois
        // secondes écraserait un jeton qu'on vient de pousser.
        var tous = findAllAttrs(ch, nom);
        if (tous.length > 1) {
          // Le DERNIER fait foi : c'est celui que readAll retient (elle parcourt
          // tout et laisse le dernier gagner), donc celui que le camp montre.
          var d0 = tous[tous.length - 1];
          var data = { name: nom, current: str(attrVal(d0, "current")), max: str(attrVal(d0, "max")) };
          // ON RETIENT CELUI QU'ON GARDE, ET ON ATTEND SA CONFIRMATION. Les
          // copies ne seront détruites que si le serveur a dit « accepté » pour
          // lui : supprimer avant de savoir si la valeur conservée a pris, c'est
          // la perdre. Une écriture peut être acceptée en mémoire et jamais
          // persistée.
          garde[nom] = d0;
          for (var j = 0; j < tous.length; j++) {
            try {
              if (tous[j].set) tous[j].set(data, { silent: true });
              if (tous[j] === d0) { sauveConfirme(tous[j], nom); }
              else { sauve(tous[j], nom); }
            } catch (e) {}
          }
        }
        return suite();
      }
      var mort = morts[etape - fusions.length];
      etape++;
      if (!mort) { menageRapport = rap; return; }
      if (!encoreLa(ch, mort.m)) return suite();   // un autre joueur est passé avant
      if (mort.camp) {
        // VERROU 2, EN DEUX TEMPS, parce qu'un seul ne suffit pas.
        //
        // a. jamais le DERNIER exemplaire, recompté sur la collection VIVANTE
        //    juste avant la suppression, et non sur l'inventaire du début ;
        // b. et seulement si le serveur a CONFIRMÉ la valeur de celui qu'on
        //    garde. Sans ce second temps, deux joueurs qui rangent en même temps
        //    voient chacun deux exemplaires, en suppriment chacun un, et il n'en
        //    reste zéro : leur collection locale ignore encore la suppression de
        //    l'autre. La confirmation les sérialise sur le serveur, qui lui ne
        //    ment pas.
        if (findAllAttrs(ch, mort.nom).length < 2) return suite();
        if (confirme[mort.nom] !== true) {
          rap.attendus = (rap.attendus || 0) + 1;
          return suite();
        }
      }
      detruit(mort.m,
        function () { rap.retires++; suite(); },
        function (pourquoi) {                       // VERROU 3 : on s'arrête, on ne s'acharne pas
          rap.arret = mort.nom + " : " + pourquoi;
          menageRapport = rap;
        });
    }
    pas();
  }

  // Écouteur PASSIF : n'agit QUE sur nos messages (ns:"owd" + charId), qui ne sont
  // émis que sur interaction (ouverture de l'onglet Fiche Outward). On NE poste RIEN
  // de spontané au chargement — Roll20 ouvre ses fiches via postMessage, un message
  // inattendu casserait son gestionnaire. Tout est en try/catch pour ne jamais
  // laisser une exception remonter dans le contexte de Roll20.
  window.addEventListener("message", function (ev) {
    try {
      var d = ev.data;
      if (!d || d.ns !== "owd") return;
      // la liste des joueurs ne dépend d'aucun personnage : traitée AVANT le
      // filtre charId
      if (d.type === "players") { reply(ev, { type: "players-result", players: players() }); return; }
      // le camp ne dépend d'aucun personnage CONNU du panneau : c'est justement
      // ce qu'il vient demander, donc avant le filtre charId
      if (d.type === "camp-char") {
        // « pas de camp » et « campagne pas encore chargée » ne se disent pas
        // pareil : au démarrage, characters est vide pendant une seconde ou
        // deux, et annoncer l'absence ferait afficher un écran d'erreur pour
        // rien (même prudence que has-sheet, qui répond exists:null).
        var nc = campChar();
        var rep = { type: "camp-char-result", pret: !!campaign(), charId: null, nom: "" };
        if (nc) {
          rep.charId = nc.id;
          rep.nom = String((nc.get ? nc.get("name") : "") || "");
          var dr = droits(nc);
          rep.gm = dr.gm;
          rep.moi = dr.moi;
          rep.controlledby = dr.controlledby;
          campId = nc.id;
          // « Réessayer » côté camp : on repart de zéro. Sans ce mot, la
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
        // LA LISTE DES PRÉFIXES DU CAMP, envoyée par la page qui les écrit.
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
        // CE QUE VAUT CETTE LECTURE, dit avec elle. Seul le camp est concerné :
        // pour tout autre personnage la fiche est ouverte, donc les attributs
        // chargés, et rien ne change. Une page servie par un site plus ancien
        // ignore ce champ, comme la fiche l'ignore de toute façon.
        if (d.charId === campId) {
          var e = etatAttributs(chl);
          rl.sur = e === "sur";
          if (e === "echec") rl.raison = "ouverture";
          // Le ménage attend que la lecture vaille vérité : sur une collection
          // que Roll20 n'a pas encore peuplée, tout paraîtrait absent.
          if (rl.sur) menageCamp(chl);
          if (menageRapport) { rl.menage = menageRapport; menageRapport = null; }
          // « omis » est TOUJOURS posé, même vide : sa présence dit au camp
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
