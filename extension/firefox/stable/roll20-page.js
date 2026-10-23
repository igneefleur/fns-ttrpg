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
  var bridgeTag=typeof document!=='undefined'?document.currentScript:null;
  var installedExtension={version:bridgeTag&&bridgeTag.getAttribute('data-owd-version'),mode:bridgeTag&&bridgeTag.getAttribute('data-owd-mode'),browser:bridgeTag&&bridgeTag.getAttribute('data-owd-browser'),sessionUi:1};
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
    var ca=campaign(), total=ca&&ca.characters&&ca.characters.models&&ca.characters.models.length||0;
    if (srcFrames.length >= Math.max(MAX_SRC,total*4+32)) return false;
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
  function enqueue(id, attrs, inventory) {
    var src = attrs || {}, garde = {};
    Object.keys(src).forEach(function (n) { if (ecrivable(n)) garde[n] = src[n]; });
    // Coalescer les lots EN ATTENTE : une ancienne photographie de macro
    // ne doit pas empiler des dizaines de lots derrière une frappe récente.
    var attente = null;
    for (var i = 0; i < queue.length; i++) if (queue[i].id === id) { attente = queue[i]; break; }
    if (attente && inventory) attente.inventory = true;
    if (attente) Object.keys(garde).forEach(function (n) { attente.attrs[n] = garde[n]; });
    else if (Object.keys(garde).length) queue.push({ id: id, attrs: garde, tries: 0, inventory: !!inventory });
    pump();
  }
  function pump() {
    if (busy) return;
    // Une écriture à la fois, avec priorité à la base puis aux registres.
    // Les miroirs de macros ne bloquent jamais une fiche qui continue à saisir.
    function priorite(n) { if(n.indexOf('owd_block_')===0||n.indexOf('owd_stack_')===0)return 0;if(n.indexOf('owd_ops_')===0)return 1;if(n==='owd_storage')return 2;return (n === "owd_sync_base" || n === "owd_monde_base") ? 0 : (n.indexOf("owd_sync_p_") === 0 || n.indexOf("owd_monde_p_") === 0) ? 1 : 2; }
    var choisi = 0;
    for (var j = 0; j < queue.length; j++) {
      if (Object.keys(queue[j].attrs).some(function (n) { return priorite(n) < 2; })) { choisi = j; break; }
    }
    var job = queue.splice(choisi, 1)[0];
    if (!job) return;
    busy = true;
    var ch = getChar(job.id);
    if (job.inventory && !inventoryAccess(ch)) { busy = false; pump(); return; }
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
    var names = Object.keys(job.attrs).sort(function (a, b) { return priorite(a) - priorite(b); });
    var name = names[0], value = job.attrs[name];
    delete job.attrs[name];
    if (Object.keys(job.attrs).length) queue.unshift(job);
    try { if (name) writeOne(ch, name, value); } catch (e) {}
    // Pas de render Roll20 : la persistance passe par Firebase. Réinsérer le
    // reste AVANT l'attente permet à enqueue() de remplacer les valeurs périmées.
    setTimeout(function () { busy = false; pump(); }, WRITE_DELAY);
  }

  // Journaux de session : une seule file par fenêtre de partie et personnage.
  // Les popouts délèguent à la partie d'origine ; chaque journal n'a qu'un auteur.
  function storageHash(s){s=String(s);var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
  function storageStable(v){if(Array.isArray(v))return '['+v.map(storageStable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+storageStable(v[k]);}).join(',')+'}';return JSON.stringify(v);}
  var storageSession='s'+Date.now().toString(36)+Math.random().toString(36).slice(2),storagePending={},storageConfirmed={},storagePayloads={},storageTimers={},storageCleanupChecks={},storageViewOps={},storageViewSources=new WeakMap();
  try {
    var obsolete=[];
    for(var i=0;i<localStorage.length;i++){var key=localStorage.key(i);if(key&&key.indexOf('owd-operations-v2:')===0)obsolete.push(key);}
    obsolete.forEach(function(key){try{localStorage.removeItem(key);}catch(e){}});
    sessionStorage.removeItem('owd-session-v2');
  } catch(e) {}
  function storageOwner(){campaign();try{if(winCampagne&&winCampagne!==window&&winCampagne.__owdStorageBridge)return winCampagne.__owdStorageBridge;}catch(e){}return null;}
  var manifestChecks=[];
  function storageManifest(attrs){var raw=attrs.owd_storage&&attrs.owd_storage.current;if(!raw)return null;
    var cached=manifestChecks.filter(function(c){return c.raw===raw&&c.blocks.every(function(x){return attrs[x[0]]&&attrs[x[0]].current===x[1];});})[0];
    if(cached)return JSON.parse(raw);
    var m=JSON.parse(raw);if(m.format!==2)throw Error('Version de stockage inconnue.');var blocks=[];
    Object.keys(m.blocks).forEach(function(k){if(!attrs[k]||storageHash(attrs[k].current)!==m.blocks[k])throw Error('Migration incomplète.');blocks.push([k,attrs[k].current]);});
    manifestChecks.push({raw:raw,blocks:blocks});if(manifestChecks.length>8)manifestChecks.shift();return m;
  }
  function storageSessionName(){var owner=storageOwner();return owner?owner.session:storageSession;}
  function storageOps(ch,data,confirmedAttrs){var owner=storageOwner();if(owner){owner.ops(ch.id,data);return;}var attrs=confirmedAttrs||readAll(ch.id),meta=storageManifest(attrs);if(!meta||meta.epoch!==data.epoch)throw Error('Format de fiche modifié : rechargez avant de renvoyer les opérations.');
    var payloads=Object.assign({},storagePayloads[ch.id]||{},data.payloads||{});
    var map=Object.assign({},storagePending[ch.id]||{});{Object.keys(attrs).filter(function(k){return k.indexOf('owd_ops_'+storageSession+'_')===0;}).sort().forEach(function(k){var b=JSON.parse(attrs[k].current);if(b.epoch===meta.epoch)b.ops.forEach(function(o){map[o.id]=o;});});}
    var recorded={};Object.keys(attrs).filter(function(k){return k.indexOf('owd_ops_')===0;}).forEach(function(k){try{var b=JSON.parse(attrs[k].current);if(b.epoch===meta.epoch)b.ops.forEach(function(op){recorded[op.id]=op;});}catch(e){}});
    (data.ops||[]).forEach(function(op){if(recorded[op.id]){if(storageStable(recorded[op.id])!==storageStable(op))throw Error('Identifiant d’opération réutilisé.');return;}if(!op.id||!Array.isArray(op.changes)||!Number.isSafeInteger(op.clock))throw Error('Opération invalide.');if(map[op.id]&&storageStable(map[op.id])!==storageStable(op))throw Error('Identifiant d’opération réutilisé.');map[op.id]=op;});
    var ordered=Object.keys(map).map(function(k){return map[k];});
    // Un journal trop gros est segmenté ; jamais tronqué, jamais plafonné.
    var chunks=[],part=[];ordered.forEach(function(o){var trial=part.concat([o]);if(part.length&&JSON.stringify(trial).length>24000){chunks.push(part);part=[o];}else part=trial;});if(part.length)chunks.push(part);var out={};Object.keys(payloads).forEach(function(k){if(k.indexOf('owd_stack_')!==0&&k.indexOf('owd_block_module_')!==0)throw Error('Bloc de données invalide.');if(attrs[k]&&attrs[k].current!==payloads[k].current)throw Error('Identifiant de pile déjà utilisé.');if(!attrs[k])out[k]=payloads[k];});chunks.forEach(function(ops,i){out['owd_ops_'+storageSession+'_'+String(i).padStart(5,'0')]={current:JSON.stringify({format:2,epoch:meta.epoch,session:storageSession,ops:ops}),max:''};});Object.keys(out).forEach(function(k){if(attrs[k]&&attrs[k].current===out[k].current)delete out[k];});
    // Valider tout le lot avant de modifier la file en mémoire.
    storagePending[ch.id]=map;storagePayloads[ch.id]=payloads;
    if(data.viewId){var views=storageViewOps[ch.id]||(storageViewOps[ch.id]={}),view=views[data.viewId]||(views[data.viewId]={ops:{},payloads:{}});(data.ops||[]).forEach(function(op){view.ops[op.id]=true;});Object.keys(data.payloads||{}).forEach(function(k){view.payloads[k]=true;});}
    enqueue(ch.id,out,true);
  }
  function storageRelease(ch,viewId){
    var owner=storageOwner();if(owner){if(owner.release)owner.release(ch.id,viewId);return;}
    var views=storageViewOps[ch.id]||{},view=views[viewId];if(!view)return;delete views[viewId];
    var attrs=storageFresh[ch.id] ? storageFresh[ch.id].attrs : readAll(ch.id),retainedOps={},retainedPayloads={},recorded={};
    Object.keys(views).forEach(function(k){Object.assign(retainedOps,views[k].ops);Object.assign(retainedPayloads,views[k].payloads);});
    Object.keys(attrs).filter(function(k){return k.indexOf('owd_ops_')===0;}).forEach(function(k){try{JSON.parse(attrs[k].current).ops.forEach(function(op){recorded[op.id]=true;});}catch(e){}});
    Object.keys(view.ops).forEach(function(id){if(!retainedOps[id]&&!recorded[id]&&storagePending[ch.id])delete storagePending[ch.id][id];});
    Object.keys(view.payloads).forEach(function(k){if(!retainedPayloads[k]&&storagePayloads[ch.id])delete storagePayloads[ch.id][k];});
    // Retirer les écritures pas encore commencées, puis recomposer avec les
    // opérations confirmées et celles des autres vues toujours ouvertes.
    if(typeof queue!=='undefined')queue.forEach(function(job){if(job.id!==ch.id)return;Object.keys(job.attrs).forEach(function(k){if(k.indexOf('owd_ops_'+storageSession+'_')===0||view.payloads[k]&&!retainedPayloads[k]&&!attrs[k])delete job.attrs[k];});});
    var meta=storageManifest(attrs);if(meta)storageOps(ch,{epoch:meta.epoch,ops:[]},attrs);
  }
  function storageRegisterView(source,ch,viewId){
    if(!viewId)return;var old=storageViewSources.get(source);
    if(old&&old.id===ch.id&&old.viewId!==viewId)storageRelease(ch,old.viewId);
    storageViewSources.set(source,{id:ch.id,viewId:viewId});
  }
  function storageConfirmLocal(ch,attrs){var seen={};Object.keys(attrs).filter(function(k){return k.indexOf('owd_ops_'+storageSession+'_')===0;}).forEach(function(k){try{JSON.parse(attrs[k].current).ops.forEach(function(op){seen[op.id]=true;});}catch(e){}});storageConfirmed[ch.id]=seen;
    Object.keys(storagePayloads[ch.id]||{}).forEach(function(k){if(attrs[k]&&attrs[k].current===storagePayloads[ch.id][k].current)delete storagePayloads[ch.id][k];});
  }
  var presenceLocal={},presenceKnown={};
  function mergePresence(a,b,now){var out={};[a,b].forEach(function(map){Object.keys(map||{}).forEach(function(k){var r=map[k];if(['__proto__','prototype','constructor'].indexOf(k)>=0||!r||typeof r.player!=='string'||!Number.isSafeInteger(r.seq)||!Number.isFinite(r.at)||now-r.at>=60000||r.at-now>60000)return;var old=out[k];if(!old||r.seq>old.seq||r.seq===old.seq&&r.at>old.at)out[k]=r;});});return out;}
  function presenceData(attrs){try{var p=JSON.parse(attrs.owd_presence.current);return p.format===1&&p.views&&typeof p.views==='object'?p.views:{};}catch(e){return {};}}
  function presenceRead(ch,attrs){var now=Date.now();var known=mergePresence(presenceKnown[ch.id],presenceData(attrs),now);known=mergePresence(known,presenceLocal[ch.id],now);presenceKnown[ch.id]=known;return Object.keys(known).map(function(k){return known[k];}).filter(function(r){return !r.left&&now-r.at<30000;});}
  function publishPresence(ch){var attrs=readAll(ch.id);presenceRead(ch,attrs);var current={format:1,views:presenceKnown[ch.id]||{}},json=storageStable(current);if(!attrs.owd_presence||attrs.owd_presence.current!==json)enqueue(ch.id,{owd_presence:{current:json,max:''}},true);}
  function updatePresence(ch,data){
    var owner=storageOwner();if(owner&&owner.presence){owner.presence(ch.id,data);return;}
    var player=journalPlayer();if(!player||!data.viewId||typeof data.viewId!=='string')return;
    var map=presenceLocal[ch.id]||(presenceLocal[ch.id]={}),prev=map[data.viewId];
    map[data.viewId]={player:player.id,name:player.name,view:data.viewId,mode:data.mode==='edition'?'edition':'consultation',at:Date.now(),seq:(prev?prev.seq:0)+1,left:data.action==='leave'};publishPresence(ch);
  }
  var storageFresh={},storageCleanupReports={};
  function storageObsolete(k){return typeof k==='string'&&k!=='owd_version'&&['owd_pv','owd_pe','owd_pm'].indexOf(k)<0&&(k==='owd_backup'||k==='owd_state'||k.indexOf('owd_sync_')===0||STORAGE_LEGACY.indexOf(k)>=0);}
  var STORAGE_LEGACY=["owd_state", "owd_nom", "owd_espece", "owd_taille", "owd_age", "owd_sexe", "owd_genre", "owd_portrait", "owd_background", "owd_notes", "owd_de", "owd_xp_total", "owd_eff_autre", "owd_eff_desactive", "owd_eff_alcool", "owd_eff_alcool_secondes", "owd_effort", "owd_temperature", "owd_qualite_sommeil", "owd_allure", "owd_allure_cran", "owd_argent", "owd_version", "owd_release", "owd_caracs", "owd_horloge", "owd_horloge_digestion", "owd_horloge_exposition", "owd_caracs_xp", "owd_des_tailles", "owd_des_utilises", "owd_eff_parties", "owd_eff_pause", "owd_effets_actifs", "owd_effets_permanents", "owd_caracs_leviers", "owd_etat_courant", "owd_caps_leviers", "owd_competences", "owd_comps_leviers", "owd_techniques", "owd_attaques", "owd_defenses", "owd_combat_options", "owd_combat_modifiers", "owd_avantages", "owd_armes", "owd_vetements", "owd_inventaire", "owd_modules", "owd_mod_donnees", "owd_mod_actifs", "owd_mods", "owd_force", "owd_dexterite", "owd_intelligence", "owd_ferveur", "owd_vigueur", "owd_endurance", "owd_resistance", "owd_chance", "owd_pv", "owd_pe", "owd_pm", "owd_pi", "owd_pr", "owd_ps", "owd_ph", "owd_expo", "owd_charge", "owd_acces", "owd_contenance", "owd_rupture", "owd_effondrement", "owd_des_action", "owd_xp_depense"];
  function storageLegacyRecords(ch){
    var out={};models(ch).forEach(function(m){var k=attrVal(m,'name');if(typeof k!=='string'||!storageObsolete(k))return;
      var v={current:String(attrVal(m,'current')==null?'':attrVal(m,'current')),max:String(attrVal(m,'max')==null?'':attrVal(m,'max'))};
      var rows=out[k]||(out[k]=[]);if(!rows.some(function(x){return storageStable(x)===storageStable(v);}))rows.push(v);
    });Object.keys(out).forEach(function(k){out[k].sort(function(a,b){return storageStable(a).localeCompare(storageStable(b));});});return out;
  }
  // Les anciennes copies de secours ne sont plus réécrites sur Roll20.
  function storageCleanup(ch){
    var fresh=storageFresh[ch.id],meta;
    function report(r){storageCleanupReports[ch.id]=r;return r;}
    if(!fresh||Date.now()-fresh.at>15000||storageImports[ch.id])return report({status:'pending',stage:'confirmation'});
    try{meta=storageManifest(fresh.attrs);}catch(e){return report({status:'error',error:String(e.message||e)});}
    if(!meta||meta.phase!=='ready')return report({status:'pending',stage:'migration'});
    if(storageTimers[ch.id])return report({status:'pending',stage:'deleting'});
    var retained={},retired=meta.retired||[];Object.keys(fresh.attrs).filter(function(k){return k.indexOf('owd_ops_')===0;}).forEach(function(k){try{JSON.parse(fresh.attrs[k].current).ops.forEach(function(op){[op.creates,op.modules].forEach(function(map){Object.keys(map||{}).forEach(function(id){retained[map[id].attribute]=true;});});});}catch(e){}});
    var work=models(ch).filter(function(m){var name=attrVal(m,'name')||'';return storageObsolete(name)||((name.indexOf('owd_block_')===0||name.indexOf('owd_stack_')===0)&&retired.indexOf(name)>=0&&!meta.blocks[name]&&!retained[name]);});
    if(!work.length){
      if(Object.keys(fresh.attrs).some(storageObsolete)||retired.some(function(k){return fresh.attrs[k]&&!meta.blocks[k]&&!retained[k];}))return report({status:'pending',stage:'confirmation'});
      var left=retired.filter(function(k){return !!fresh.attrs[k];});if(left.length!==retired.length){meta.retired=left;enqueue(ch.id,{owd_storage:{current:JSON.stringify(meta),max:''}},true);}
      return report({status:'done',remaining:0});
    }
    storageTimers[ch.id]=true;
    function next(){
      var m=work.shift();if(!m){delete storageTimers[ch.id];return;}
      var name=attrVal(m,'name'),now=readAll(ch.id),live=now[name],seen=fresh.attrs[name];
      if(now.owd_storage&&now.owd_storage.current===fresh.attrs.owd_storage.current&&live&&seen&&storageStable(live)===storageStable(seen))detruit(m,function(){},function(){});
      setTimeout(next,WRITE_DELAY);
    }
    next();return report({status:'pending',stage:'deleting',remaining:work.length});
  }

  var storageImports={},backupRequests={};
  function storageBasis(attrs){
    var out={};
    Object.keys(attrs||{}).sort().forEach(function(k){
      if(k==='owd_presence'||k==='owd_backup'||k.indexOf('owd_block_cp_')===0)return;
      if(k==='owd_storage'){
        try{var m=JSON.parse(attrs[k].current);out[k]={epoch:m.epoch,blocks:m.blocks,absorbed:m.absorbed||{},names:m.names||{}};}catch(e){out[k]=attrs[k];}
      }else if(k.indexOf('owd_ops_')===0||(!attrs.owd_storage&&k.indexOf('owd_')===0)||['owd_pv','owd_pe','owd_pm'].indexOf(k)>=0)out[k]=attrs[k];
    });
    return storageStable(out);
  }
  function backupSnapshot(ch,state,reason){
    if(!state||typeof state!=='object'||Array.isArray(state)||!Number.isSafeInteger(state.v))return;
    
    var c=campaign();if(!c||!c.id)return;
    window.postMessage({ns:'owd-local-backup',type:'save',campaignId:String(c.id),charId:String(ch.id),name:String(ch.get('name')||state.name||'Sans nom'),reason:reason,state:state},location.origin);
  }
  function backupVerifiedRead(ch,attrs){if(!storageImports[ch.id]&&window.OwdSync&&readSubscriptions){try{var verified=window.OwdSync.Compact.read(attrs);if(verified&&!verified.incomplete){var previous=backupRequests[ch.id+':automatic'];if(!previous||Date.now()-previous>=3600000){backupSnapshot(ch,verified.state,previous?'hourly':'opening');backupRequests[ch.id+':automatic']=Date.now();}}}catch(e){}}}
  function storageImport(ch,data,ev){
    if(storageImports[ch.id])throw Error('Une importation est déjà en cours.');
    var expected=data.expected,encoded=data.blocks,meta=storageManifest(encoded),state=data.state;
    if(!expected||!meta||!state||!Number.isSafeInteger(state.v)||!encoded.owd_block_fiche||JSON.parse(encoded.owd_block_fiche.current).rel!==state.rel)throw Error('Importation incomplète.');
    Object.keys(encoded).forEach(function(k){if(k!=='owd_storage'&&k.indexOf('owd_block_')!==0&&k.indexOf('owd_stack_')!==0)throw Error('Bloc non autorisé.');});
    var original=null;try{original=expected.owd_storage?JSON.parse(expected.owd_storage.current):null;}catch(e){if(!data.restore)throw e;}
    if(original&&!data.restore){meta.epoch=original.epoch;meta.absorbed=Object.assign({},original.absorbed||{});meta.clock=Number(original.clock)||0;
      Object.keys(expected).filter(function(k){return k.indexOf('owd_ops_')===0;}).forEach(function(k){var box=JSON.parse(expected[k].current);if(box.epoch===original.epoch)(box.ops||[]).forEach(function(op){meta.absorbed[op.id]=true;meta.clock=Math.max(meta.clock,op.clock||0);});});
    }
    var names={},blocks={},staged={},oldNames=original&&original.names||{},stamp=storageHash(storageBasis(expected)+storageStable(encoded))+Math.random().toString(36).slice(2),i=0;
    Object.keys(meta.blocks).forEach(function(k){var old=oldNames[k]||k,physical;
      if(expected[old]&&expected[old].current===encoded[k].current)physical=old;
      else{physical='owd_block_cp_'+stamp+'_'+(i++);staged[physical]=encoded[k];}
      names[k]=physical;blocks[physical]=meta.blocks[k];
    });
    meta.names=names;meta.blocks=blocks;meta.retired=Object.keys(Object.assign({},(original&&original.retired||[]).reduce(function(out,k){out[k]=true;return out;},{}),original&&original.blocks||{})).filter(function(k){return !blocks[k]&&(k.indexOf('owd_block_')===0||k.indexOf('owd_stack_')===0);});meta.phase='ready';delete meta.legacyFingerprint;delete meta.source;
    // Les références de piles/modules/réserves restent logiques ; snapshot()
    // les résout à l'aide de names. Aucun bloc actif n'est modifié en place.
    var published={current:JSON.stringify(meta),max:''},job={started:Date.now()};storageImports[ch.id]=job;
    var deadline=Date.now()+36000;
    function progress(){if(!job.progress||Date.now()-job.progress>=1000){job.progress=Date.now();reply(ev,{type:'storage-import-progress',charId:ch.id});}}
    function fail(error){delete storageImports[ch.id];try{var active=storageManifest(readAll(ch.id));Object.keys(staged).forEach(function(k){if(!active||!active.blocks[k])findAllAttrs(ch,k).forEach(function(m){detruit(m,function(){},function(){});});});}catch(e){}reply(ev,{type:'storage-import-result',charId:ch.id,ok:false,error:String(error&&error.message||error)});}
    function fetchFresh(cb){
      var done=false,t=setTimeout(function(){if(done)return;done=true;fail('Roll20 ne répond pas.');},36000);
      try{ch.attribs.fetch({success:function(){if(done)return;done=true;clearTimeout(t);cb(readAll(ch.id));},error:function(){if(done)return;done=true;clearTimeout(t);fail('Lecture refusée.');}});}catch(e){clearTimeout(t);fail(e);}
    }
    function finish(attrs){
      delete storageImports[ch.id];storagePending[ch.id]={};storagePayloads[ch.id]={};storageViewOps[ch.id]={};
      storageFresh[ch.id]={at:Date.now(),attrs:attrs};reply(ev,{type:'storage-import-result',charId:ch.id,ok:true,attrs:attrs});resynchronise(ch);
    }
    function verify(){fetchFresh(function(attrs){
      try{
        if(attrs.owd_storage&&attrs.owd_storage.current===published.current&&attrs.owd_version&&attrs.owd_version.max===state.rel&&Number(attrs.owd_version.current)===state.v){storageManifest(attrs);finish(attrs);return;}
        if(Date.now()>deadline)throw Error('Importation non confirmée.');
        if(attrs.owd_storage&&attrs.owd_storage.current===published.current)enqueue(ch.id,{owd_version:{current:String(state.v),max:String(state.rel||'')}},true);
        setTimeout(verify,700);
      }catch(e){fail(e);}
    });}
    function commit(){fetchFresh(function(attrs){
      try{
        try{storageManifest(Object.assign({},attrs,{owd_storage:published}));}catch(incomplete){if(Date.now()>deadline)throw incomplete;setTimeout(commit,700);return;}
        if(storageBasis(attrs)!==storageBasis(expected))throw Error('Le personnage a changé pendant la préparation. Réessayez la mise à jour.');
        // Les opérations tardives conservent le même epoch et se rejouent au
        // dessus de la photographie ; les opérations absorbées ne rejouent pas.
        enqueue(ch.id,{owd_storage:published,owd_version:{current:String(state.v),max:String(state.rel||'')}},true);
        deadline=Date.now()+36000;verify();
      }catch(e){fail(e);}
    });}
    var keys=Object.keys(staged);
    function stage(){
      if(!keys.length){deadline=Date.now()+36000;commit();return;}
      var k=keys.shift();try{writeOne(ch,k,staged[k]);progress();}catch(e){fail(e);return;}
      setTimeout(stage,WRITE_DELAY);
    }
    fetchFresh(function(attrs){if(storageBasis(attrs)!==storageBasis(expected)){fail('Le personnage a changé pendant la préparation. Réessayez la mise à jour.');return;}stage();});
  }

  window.__owdStorageBridge={session:storageSession,presence:function(id,data){var ch=getChar(id);if(ch&&inventoryAccess(ch))updatePresence(ch,data);},release:function(id,viewId){var ch=getChar(id);if(ch&&inventoryAccess(ch))storageRelease(ch,viewId);},ops:function(id,data){var ch=getChar(id);if(ch&&inventoryAccess(ch))storageOps(ch,data);}};

  function journalPlayer() {
    try {
      campaign();
      var w = winCampagne || window, p = w.currentPlayer || window.currentPlayer;
      var id = p && (p.id || (p.get && p.get("id"))) || w.currentPlayerId || window.currentPlayerId;
      var c = w.Campaign || (w.d20 && w.d20.Campaign);
      if (id && c && c.players && c.players.get) p = c.players.get(id) || p;
      var name = p && ((p.get && p.get("displayname")) || (p.attributes && p.attributes.displayname) || p.displayname);
      return id && name ? {id:String(id), name:String(name)} : null;
    } catch (e) { return null; }
  }
  function reply(ev, msg) { if(msg.type === "hydrate") {msg.player = journalPlayer();msg.extension=installedExtension;} msg.ns = "owd"; try { ev.source.postMessage(msg, "*"); } catch (e) {} }

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
  // Le camp partagé vit dans les Attributes d'un personnage nommé « Monde » (ancien « Camp » accepté), que
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
  var CAMP_NOM = "monde";
  function campChar() {
    var c = campaign(), ms = (c && c.characters && c.characters.models) || [];
    var ancien = null;
    for (var i = 0; i < ms.length; i++) {
      var n = ms[i].get ? ms[i].get("name") : (ms[i].attributes || {}).name;
      n = String(n == null ? "" : n).replace(/\s+/g, " ").trim().toLowerCase();
      if (n === CAMP_NOM) return ms[i];
      if (n === "camp" && !ancien) ancien = ms[i];
    }
    if (ancien) return ancien;
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
  var inventoryFrames = new WeakMap();
  function inventoryAccess(ch) {
    if (!ch) return false;
    var d = droits(ch), ids = d.controlledby.split(",").map(function (v) { return v.trim(); });
    return d.gm || ids.indexOf("all") >= 0 || (!!d.moi && ids.indexOf(d.moi) >= 0);
  }
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

  // Les collections locales ne sont pas un abonnement aux autres joueurs.
  // Le site demande la cadence ; le pont borne les requêtes par personnage.
  var RESYNC_MIN = 1500, resyncJobs = {}, readSubscriptions = new WeakMap();
  var readRevisions={},readRevisionCounter=0,readRevisionSession=Math.random().toString(36).slice(2);
  function revisionLecture(id,attrs){
    var old=readRevisions[id],keys=Object.keys(attrs).filter(function(k){return k!=='owd_presence';});
    var same=old&&keys.length===old.keys.length&&keys.every(function(k){return old.attrs[k]&&attrs[k].current===old.attrs[k].current&&attrs[k].max===old.attrs[k].max;});
    if(!same)readRevisions[id]={attrs:attrs,keys:keys,revision:readRevisionSession+':'+(++readRevisionCounter)};
    return readRevisions[id].revision;
  }
  function publieLecture(ch, ok) {
    menage(); var attrs = readAll(ch.id), at = Date.now();
    if(ok&&typeof backupVerifiedRead==='function')backupVerifiedRead(ch,attrs);
    if(ok){presenceRead(ch,attrs);if(Object.keys(presenceLocal[ch.id]||{}).length)publishPresence(ch);}
    var revision=ok?revisionLecture(ch.id,attrs):null;
    var cleanup=null;
    if(ok&&attrs.owd_storage&&inventoryAccess(ch)){storageConfirmLocal(ch,attrs);storageFresh[ch.id]={at:at,attrs:attrs};try{cleanup=storageCleanup(ch);}catch(e){cleanup={status:'error',error:String(e.message||e)};}}
    srcFrames.forEach(function (w, i) {
      if (srcIds[i] !== ch.id) return;
      var base = readSubscriptions.get(w); if (!base) return;
      if (inventoryFrames.has(w) && !inventoryAccess(ch)) {
        reply({source:w}, {type:'hydrate',charId:ch.id,inventoryAccess:false}); return;
      }
      var msg = {}; Object.keys(base).forEach(function(k){msg[k]=base[k];});
      delete msg.lightRead;delete msg.readRevision;
      if(ok&&base.lightRead===1&&base.readRevision===revision){delete msg.attrs;msg.unchanged=true;}else msg.attrs=attrs;
      if(ok)msg.revision=revision;
      msg.presence=presenceRead(ch,attrs); msg.fresh = !!ok; msg.readAt = ok ? at : 0;
      if (inventoryFrames.has(w)) msg.inventoryAccess = true;
      reply({source:w}, msg);
      if(cleanup)reply({source:w},Object.assign({type:'storage-cleanup-status',charId:ch.id},cleanup));
    });
  }
  function resynchronise(ch) {
    if (!ch || !ch.attribs || typeof ch.attribs.fetch !== 'function') {
      if (ch) publieLecture(ch, false); return false;
    }
    var job = resyncJobs[ch.id] || (resyncJobs[ch.id] = {last:0,running:false,timer:null,serial:0});
    if (job.running || job.timer) return true;
    var delay = RESYNC_MIN - (Date.now() - job.last);
    if (delay > 0) {job.timer=setTimeout(function(){job.timer=null;resynchronise(ch);},delay);return true;}
    job.last=Date.now();job.running=true;var serial=++job.serial, timeout;
    function done(ok){if(serial!==job.serial||!job.running)return;clearTimeout(timeout);job.running=false;publieLecture(ch,ok);}
    timeout=setTimeout(function(){done(false);},36000);
    try {ch.attribs.fetch({success:function(){done(true);},error:function(){done(false);}});}
    catch(e){done(false);}
    return true;
  }
  // Toutes les frames liées restent abonnées, même masquées. La cadence vit
  // dans la partie, et ne dépend pas des timers d'une iframe en arrière-plan.
  setInterval(function(){
    menage();var seen={};srcFrames.forEach(function(w,i){var id=srcIds[i];if(seen[id]||!readSubscriptions.has(w))return;
      var ch=getChar(id);if(ch && (!inventoryFrames.has(w)||inventoryAccess(ch))){seen[id]=true;resynchronise(ch);}
    });
  },1500);

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

  window.addEventListener('message',function(ev){
    var d=ev.data;if(ev.source!==window||ev.origin!==location.origin||!d||d.ns!=='owd-backup-restore')return;
    function result(ok,error){window.postMessage({ns:'owd-backup-restore-result',token:d.token,ok:ok,error:error},location.origin);}
    try{
      var saved=d.snapshot,c=campaign(),ch=saved&&getChar(saved.charId);
      if(!saved||!c||String(c.id)!==saved.campaignId||!ch||!inventoryAccess(ch))throw Error('Ouvrez la partie de ce personnage avec un accès en écriture.');
      if(!window.OwdSync)throw Error('Rechargez la partie Roll20.');
      ch.attribs.fetch({success:function(){try{
        var attrs=readAll(ch.id),old=null;try{old=window.OwdSync.Compact.read(attrs);}catch(e){}
        if(old&&!old.incomplete)backupSnapshot(ch,old.state,'restoration');
        var proxy={source:{postMessage:function(msg){if(msg.type==='storage-import-result'){if(msg.ok)srcFrames.forEach(function(w,i){if(srcIds[i]===ch.id)reply({source:w},{type:'backup-restored',charId:ch.id});});result(msg.ok,msg.error);}}}};
        storageImport(ch,{state:saved.state,blocks:window.OwdSync.Compact.encode(saved.state,'restore-'+Date.now()+'-'+Math.random().toString(36).slice(2)),expected:attrs,restore:true},proxy);
      }catch(e){result(false,String(e.message||e));}},error:function(){result(false,'Roll20 ne répond pas.');}});
    }catch(e){result(false,String(e.message||e));}
  });

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
      if (d.type === "camp-char" || d.type === "monde-char") {
        // « pas de camp » et « campagne pas encore chargée » ne se disent pas
        // pareil : au démarrage, characters est vide pendant une seconde ou
        // deux, et annoncer l'absence ferait afficher un écran d'erreur pour
        // rien (même prudence que has-sheet, qui répond exists:null).
        var nc = campChar();
        var rep = { type: d.type === "monde-char" ? "monde-char-result" : "camp-char-result", monde: 1, pret: !!campaign(), charId: null, nom: "" };
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
      if (d.type === "inventory-characters") {
        var ca = campaign(), cs = ca && ca.characters && ca.characters.models || [];
        reply(ev, {type: "inventory-characters-result", pret: !!ca, campaignId: ca && ca.id || "partie",
          characters: cs.filter(function (ch) { return inventoryAccess(ch) && !/^(Camp|Monde)$/i.test(String(ch.get("name") || "")); })
            .map(function (ch) { return {id: ch.id, name: String(ch.get("name") || "Sans nom")}; })});
        return;
      }
      if (!d.charId) return;
      if (d.type === "attack-preview") {
        if (!liee(ev.source,d.charId)||!inventoryFrames.has(ev.source)||!inventoryAccess(getChar(d.charId))) return;
        if (window.OwdAttackMap) window.OwdAttackMap.preview(ev.source,d);
        return;
      }
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
        if (d.inventory === true) inventoryFrames.set(ev.source, d.charId);
        if (inventoryFrames.has(ev.source) && !inventoryAccess(getChar(d.charId))) {
          reply(ev, {type: "hydrate", charId: d.charId, inventoryAccess: false}); return;
        }
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
        storageRegisterView(ev.source,chl,d.viewId);
        var rl = { type: "hydrate", charId: d.charId, attrs: readAll(d.charId), resync: true, collaboration: 1, storageBlocks: 2, storageVolatile: 1, storageVersion:1, storageImport:1, localBackups:1, storageCleanup:3, storageSession: storageSessionName() };
        if (inventoryFrames.has(ev.source)) {
          rl.inventoryAccess = true;
          if (etatAttributs(chl) !== "sur") return;
        }
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
        if(d.lightRead===1){rl.lightRead=1;rl.readRevision=typeof d.readRevision==='string'?d.readRevision:null;}
        readSubscriptions.set(ev.source, rl);
        if (d.resync === true) {resynchronise(chl);return;}
        rl.fresh = false;reply(ev,rl);
      } else if (d.type === "presence") {
        if(!liee(ev.source,d.charId)||!inventoryAccess(getChar(d.charId)))return;
        updatePresence(getChar(d.charId),d);
      } else if (d.type === "storage-release") {
        if(!liee(ev.source,d.charId)||!inventoryAccess(getChar(d.charId)))return;
        try{storageRelease(getChar(d.charId),d.viewId);}catch(error){}
      } else if (d.type === "backup-snapshot") {
        if(!liee(ev.source,d.charId)||!inventoryAccess(getChar(d.charId)))return;
        backupSnapshot(getChar(d.charId),d.state,d.reason);
      } else if (d.type === "storage-import") {
        if(!liee(ev.source,d.charId)||!inventoryAccess(getChar(d.charId)))return;
        try{storageImport(getChar(d.charId),d,ev);}catch(error){reply(ev,{type:'storage-import-result',charId:d.charId,ok:false,error:String(error.message||error)});}
      } else if (d.type === "storage-ops") {
        if(!liee(ev.source,d.charId)||!inventoryAccess(getChar(d.charId)))return;
        try{storageOps(getChar(d.charId),d);}catch(error){reply(ev,{type:'storage-error',charId:d.charId,error:String(error.message||error)});}
      } else if (d.type === "storage-activate") {
        if(!liee(ev.source,d.charId)||!inventoryAccess(getChar(d.charId)))return;
        try{var manifest=storageManifest(readAll(d.charId));if(manifest&&manifest.phase==='staging'){manifest.phase='ready';enqueue(d.charId,{owd_storage:{current:JSON.stringify(manifest),max:''}},true);}}catch(error){reply(ev,{type:'storage-error',charId:d.charId,error:String(error.message||error)});}
      } else if (d.type === "storage-cleanup") {
        if(!liee(ev.source,d.charId))return;
        if(!inventoryAccess(getChar(d.charId))){reply(ev,{type:'storage-cleanup-status',charId:d.charId,status:'error',error:'Roll20 refuse le nettoyage : accès en écriture au personnage requis.'});return;}
        try{var report=storageCleanup(getChar(d.charId));reply(ev,Object.assign({type:'storage-cleanup-status',charId:d.charId},report));}catch(error){reply(ev,{type:'storage-cleanup-status',charId:d.charId,status:'error',error:String(error.message||error)});}
      } else if (d.type === "save") {
        if (!liee(ev.source, d.charId)) return;
        var inv = inventoryFrames.has(ev.source);
        if (inv && !inventoryAccess(getChar(d.charId))) return;
        var current=readAll(d.charId);
        if(current.owd_storage){
          var allowed={};Object.keys(d.attrs||{}).forEach(function(k){if(k==='owd_pv'||k==='owd_pe'||k==='owd_pm'||k==='owd_version')allowed[k]=d.attrs[k];});
          // Blocs initiaux immuables : seuls les morceaux manquants peuvent être repris.
          try{var header=JSON.parse(current.owd_storage.current);Object.keys(header.blocks||{}).forEach(function(k){if((!current[k]||storageHash(current[k].current)!==header.blocks[k])&&d.attrs&&d.attrs[k]&&storageHash(d.attrs[k].current)===header.blocks[k])allowed[k]=d.attrs[k];});}catch(e){}
          enqueue(d.charId,allowed,inv);return;
        }
        enqueue(d.charId, d.attrs, inv);
      }
    } catch (e) {}
  }, false);
})();
