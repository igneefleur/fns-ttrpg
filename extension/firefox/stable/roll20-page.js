/* Pont d20 — s'exécute dans le MONDE PRINCIPAL de la page Roll20 (là où vit
 * window.d20 / window.Campaign, invisible depuis un content-script isolé). Injecté
 * par content-roll20.js dans la frame du haut via <script src=web_accessible>.
 *
 * Rôle : lire, créer et mettre à jour les Attributes « jjk_* » d'un personnage, à la
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
 * copies sont AUJOURD'HUI IDENTIQUES À L'OCTET, et c'est normal : ce pont ne
 * connaît pas le mode et n'a pas à le connaître. Il n'écrit que les Attributes
 * jjk_* du personnage, que les deux parties se partagent de toute façon. La
 * séparation n'existe ici que pour laisser la partie de chantier changer son
 * pont sans toucher à celui qui tourne en partie.
 *
 * TOUTE CORRECTION DE SÛRETÉ DOIT ÊTRE APPLIQUÉE AUX DEUX COPIES. Les verrous
 * de ce fichier (window.__jjkBridge, ecrivable(), lier()/liee() et sa table de
 * soixante-quatre places, le repli sur l'opener strictement réservé au popout,
 * l'ouverture forcée de la fiche du plateau et le « sûr » qu'elle seule donne,
 * et les trois verrous du ménage des attributs, qui est la seule opération
 * DESTRUCTRICE du dispositif) vivent désormais en double exemplaire : un
 * correctif posé d'un seul côté laisse le trou grand ouvert de l'autre, et
 * rien ne le signalera.
 * scripts/build_extension.py --verifie compare mécaniquement les deux copies.
 *
 * Le verrou window.__jjkBridge est COMMUN aux deux copies, tout comme le
 * marqueur data-jjk-bridge que pose content-roll20.js : deux ponts dans le même
 * monde principal écriraient chaque attribut deux fois et rempliraient la table
 * des liaisons deux fois plus vite. Ne jamais y faire entrer le mode.
 */
(function () {
  "use strict";
  if (window.__jjkBridge) return;   // jamais deux ponts (écouteurs en double)
  window.__jjkBridge = true;
  var PREFIX = "jjk_";
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
  var srcFrames = [], srcIds = [], srcLourds = [], srcViewIds = [], MAX_SRC = 64;
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
      if (mort) { srcFrames.splice(i, 1); srcIds.splice(i, 1); srcLourds.splice(i, 1); srcViewIds.splice(i, 1); }
    }
  }
  function lier(src, id, viewId) {
    if (!src || !id) return false;
    var i = srcFrames.indexOf(src), vue = String(viewId || "");
    if (i >= 0) {
      if (srcIds[i] !== id) return false;
      // Roll20 peut garder le même WindowProxy après navigation de l'iframe.
      // Une nouvelle VIEW_ID signifie un nouveau document : son cache local
      // n'a plus les attributs lourds omis à la session précédente.
      if (vue && srcViewIds[i] !== vue) {
        var ancienneVue = srcViewIds[i];
        if (ancienneVue && typeof stockageLibereVue === "function") {
          try { stockageLibereVue(getChar(id), ancienneVue); } catch (eRelease) {}
        }
        srcViewIds[i] = vue;
        srcLourds[i] = null;
      }
      return true;
    }
    menage();
    if (srcFrames.length >= MAX_SRC) return false;
    srcFrames.push(src); srcIds.push(id); srcLourds.push(null); srcViewIds.push(vue);
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

  // ---------- les gros attributs ne repartent qu'AU CHANGEMENT ----------
  // Un fond de zone téléversé est rangé en base64 DANS l'attribut : quelques
  // centaines de milliers de caractères, parfois plus. Or le plateau relit tout
  // toutes les 1.2 s, et postMessage RECOPIE la chaîne à chaque envoi : renvoyer
  // les images à chaque tour étouffe la liaison, et c'est le plateau entier qui
  // se met à traîner, jetons compris. On envoie donc un gros attribut une
  // première fois, puis on ne le renvoie que si son EMPREINTE a changé.
  //
  // Le tri se fait sur la TAILLE, jamais sur le nom. Le nom des attributs de
  // fond appartient à la page servie par le site, qui doit pouvoir en changer
  // sans re-signature ; la taille, elle, est le vrai critère — c'est elle qui
  // étouffe la liaison, pas l'orthographe.
  //
  // C'EST LE PLATEAU QUI DEMANDE À ÊTRE ALLÉGÉ, et rien ne s'allège sans qu'il
  // l'ait dit (« allege: true » dans son « load »). Ce n'est pas de la
  // prudence de principe, c'est la seule conduite tenable ici : le pont est
  // SIGNÉ et le plateau ne l'est pas, ils ne sont donc jamais déployés le même
  // jour — la moitié stable du pont part chez Mozilla maintenant, la page de
  // /jjk/ arrivera quand elle arrivera. Un pont qui allégerait de son propre
  // chef ferait disparaître les fonds d'un plateau plus ancien, qui reconstruit
  // ses images à chaque lecture et prendrait l'absence pour un retrait. Il
  // faudrait alors une signature pour réparer. Dans l'autre sens, un plateau
  // neuf devant un pont ancien reçoit tout à chaque tour, comme avant : c'est
  // lent, ce n'est pas cassé.
  //
  // LE PLATEAU DOIT SAVOIR CE QU'ON LUI A TU. La réponse porte toujours
  // « omis » (le tableau des noms retenus, vide s'il n'y en a pas) : sa seule
  // présence dit au plateau que ce pont-ci sait alléger, et qu'un nom manquant
  // veut dire « inchangé », jamais « effacé ».
  //
  // DEUX FILETS, parce qu'une empreinte qui se désaccorde ne se voit pas.
  //   - « complet » : le plateau peut réclamer tout, et doit le faire à sa
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
  //  - save(null, {silent:true}) persiste dans Firebase (le sync ne dépend pas de silent).
  //
  // Le silence est CONSERVÉ : il n'est pas en cause, et il est plus nécessaire
  // que jamais depuis que le pont ouvre lui-même la fiche de Narration.
  //
  // SAVE N'EST PLUS SILENCIEUX, ET C'EST TOUTE LA CORRECTION.
  //
  // Backbone transmet ses options jusqu'à la synchronisation. Pour Roll20,
  // « silencieux » veut dire NE PAS PROPAGER : on demandait donc au serveur de
  // ne rien recevoir, et l'écho Firebase de la valeur inchangée restaurait
  // ensuite l'ancienne, jusque dans le modèle. Mesuré chez l'auteur : le
  // modèle prenait bien la valeur (voulu et modele identiques), puis la
  // relecture rendait la position d'avant, à l'identique, indéfiniment.
  //
  // ON ÉCOUTE ENFIN CE QUE LE SERVEUR RÉPOND. save() accepte success et error
  // depuis toujours ; personne ne les avait jamais lus, si bien qu'on écrivait
  // sans jamais demander si l'écriture avait été acceptée. Quatre issues, et
  // elles appellent quatre corrections différentes : le serveur accepte (et le
  // problème est ailleurs), le serveur REFUSE en le disant (permission), l'appel
  // lève, ou rien ne répond du tout (l'écriture n'est même pas partie).
  // Le plateau en a un usage concret depuis les fonds de zone : une image trop
  // lourde se fait refuser, et c'est en le SACHANT qu'il peut la réduire et
  // réessayer, au lieu de croire qu'elle est passée.
  function texteReponse(rep) {
    var txt = "";
    try { txt = String((rep && (rep.message || rep.statusText || rep.status)) || rep || ""); }
    catch (e) {}
    return txt.slice(0, 120);
  }
  // Les attributs ne sont PAS repassés ici : c'est « m.save(null, …) », et null
  // dit à Backbone d'envoyer l'état courant du modèle, celui que le set juste
  // au-dessus vient d'y poser. Un troisième argument aurait laissé croire que
  // save écrit ce qu'on lui tend, alors qu'il n'en lisait rien.
  function sauve(m, name, trace) {
    if (!m || !m.save) { issue(name, "exception", "save absent", trace); return; }
    var fini = false;
    function conclut(quoi, detail) { if (fini) return; fini = true; issue(name, quoi, detail, trace); }
    try {
      m.save(null, {
        success: function () { conclut("accepte", null); },
        error: function (mm, rep) { conclut("refuse", texteReponse(rep)); }
      });
    } catch (e) {
      conclut("exception", String((e && e.message) || e).slice(0, 120));
      return;
    }
    setTimeout(function () { conclut("aucune reponse", null); }, 2500);
  }
  function writeOne(ch, name, v) {
    if (!ecrivable(name)) return;   // double fond : writeOne reste sûr quel que soit l'appelant
    var data = { name: name, current: str(v && v.current), max: str(v && v.max) };
    // On écrit dans TOUS les homonymes : c'est le seul moyen que la relecture
    // rende ce qu'on vient d'écrire, quel que soit celui qu'elle retient. Le
    // ménage, lui, ramène le compte à un — mais il ne s'exécute qu'une fois par
    // chargement, et il peut échouer : cette boucle reste la seule garantie.
    var tous = findAllAttrs(ch, name);
    var trace = debutEcriture(name, data, Math.max(1, tous.length));
    if (tous.length > 1) doublons(name, tous.length);
    if (!tous.length) {
      var neuf = ch.attribs.create(data, { silent: true });
      relu(neuf, name, data);
      sauve(neuf, name, trace);
      return neuf;
    }
    for (var k = 0; k < tous.length; k++) {
      var mk = tous[k];
      // On garde le set SILENCIEUX : c'est lui qui évite l'événement change, donc
      // onAttribChange puis updateSheetValues, qui plante quand la fiche est
      // ouverte — et le pont ouvre justement celle de « Narration ».
      if (mk.set) mk.set(data, { silent: true });
      else { mk.attributes = mk.attributes || {}; mk.attributes.name = data.name; mk.attributes.current = data.current; mk.attributes.max = data.max; }
    }
    relu(tous[0], name, data);
    for (var j = 0; j < tous.length; j++) sauve(tous[j], name, trace);
    return tous[0];
  }

  // CE QUE LE MODÈLE DIT JUSTE APRÈS L'ÉCRITURE. Deux pannes se ressemblent trait
  // pour trait vues du plateau : le modèle n'a pas pris notre valeur, ou il l'a
  // prise mais Firebase ne l'a pas reçue. Sans ce relevé, il faut une signature
  // par hypothèse ; avec lui, le prochain retour tranche.
  var dernieresEcritures = {};
  function debutEcriture(name, data, attendus) {
    var e = { voulu: data.current, modele: null, serveur: "en-attente", detail: "",
      attendus: Math.max(1, attendus || 1), reponses: 0, refus: null };
    dernieresEcritures[name] = e;
    return e;
  }
  function relu(m, name, data) {
    try {
      var e = dernieresEcritures[name] || {};
      e.voulu = data.current;
      e.modele = m ? str(attrVal(m, "current")) : null;
      dernieresEcritures[name] = e;
    } catch (err) {}
  }
  // Ce que le SERVEUR a répondu à cette écriture. Rangé au même endroit, il
  // voyage avec la lecture suivante jusqu'au plateau, donc jusqu'à la console.
  // Combien d'homonymes portait cet attribut : c'est le fait qui a manqué le plus
  // longtemps, et il se lit d'un coup d'oeil dans la trace du plateau.
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
  // effacerait le refus qui, lui, dit au plateau qu'il doit réduire son image
  // et réessayer. La plus grave gagne, quel que soit l'ordre.
  function issue(name, quoi, detail, trace) {
    try {
      var e = dernieresEcritures[name] || {};
      // Un nom peut exister en plusieurs exemplaires sur Roll20. Une restauration
      // n'est confirmée que lorsque CHAQUE homonyme a répondu ; une acceptation
      // précoce ne peut donc plus masquer le refus tardif d'un autre exemplaire.
      if (trace) {
        if (trace !== e) return; // réponse tardive d'une écriture remplacée
        trace.reponses++;
        if (quoi !== "accepte" && !trace.refus) trace.refus = { quoi: quoi, detail: detail || "" };
        if (trace.reponses >= trace.attendus) {
          trace.serveur = trace.refus ? trace.refus.quoi : "accepte";
          trace.detail = trace.refus ? trace.refus.detail : "";
          trace.termine = true;
        }
      } else {
        if (!(quoi === "accepte" && e.serveur && e.serveur !== "accepte")) {
          e.serveur = quoi;
          if (detail) { e.detail = detail; }
        }
      }
      dernieresEcritures[name] = e;
    } catch (err) {}
  }

  var queue = [], busy = false, activeJob = null;
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
    activeJob = job;
    var ch = getChar(job.id);
    // Deux raisons d'attendre, une seule conduite. Campaign injoignable (opener
    // du popout en cours de rechargement...), ou attributs pas encore chargés
    // par Roll20 : dans le second cas, écrire créerait des doublons dans une
    // collection liée à rien — la valeur ne reviendrait jamais et l'ancienne
    // resterait sous elle. On RE-TENTE au lieu de jeter : la fiche a déjà avancé
    // sa base de diff, une écriture jetée serait définitivement perdue.
    // ~1 min de patience. Le contrôle de chargement ne vise QUE le plateau
    // (narrId, posé plus bas) : une fiche, elle, n'est ouverte que depuis un
    // dialogue déjà ouvert, donc déjà peuplé, et rien ne doit changer pour elle.
    if (!ch || (job.id && job.id === narrId && etatAttributs(ch) !== "sur")) {
      busy = false;
      activeJob = null;
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
        activeJob = null;
        setTimeout(pump, 0);
        return;
      }
      var name = names[i++];
      try { writeOne(ch, name, job.attrs[name]); } catch (e) {}
      setTimeout(step, WRITE_DELAY);   // throttle
    }
    step();
  }

  function reply(ev, msg) { msg.ns = "jjk"; try { ev.source.postMessage(msg, "*"); } catch (e) {} }

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



  // Présence et mode Consultation/Édition partagés par tous les cadres d'un
  // personnage. Chaque joueur conserve SON mode, partagé entre ses fenêtres.
  // Le champ vit dans jjk_presence, séparément de jjk_state : une préférence
  // d'interface ne doit jamais modifier les règles ou les données du perso.
  // Format repris d'Outward : une entrée par vue, avec séquence et horodatage.
  var presenceLocal = {}, presenceKnown = {};

  function presenceAcces(ch) {
    if (!ch) return false;
    var d = droits(ch), ids = d.controlledby.split(",").map(function (v) { return v.trim(); });
    return d.gm || ids.indexOf("all") >= 0 || (!!d.moi && ids.indexOf(d.moi) >= 0);
  }

  function presenceMerge(a, b, now) {
    var out = {};
    [a, b].forEach(function (map) {
      Object.keys(map || {}).forEach(function (key) {
        if (["__proto__", "prototype", "constructor"].indexOf(key) >= 0) return;
        var r = map[key];
        if (!r || typeof r.player !== "string" || !r.player ||
            !Number.isSafeInteger(r.seq) || !Number.isFinite(r.at) ||
            now - r.at >= 60000 || r.at - now > 60000) return;
        var row = Object.assign({}, r);
        row.mode = row.mode === "edition" ? "edition" : "consultation";
        row.modeAt = Number.isFinite(Number(row.modeAt)) ? Number(row.modeAt) : 0;
        row.modeBy = String(row.modeBy || "");
        var old = out[key];
        if (!old || row.seq > old.seq || row.seq === old.seq && row.at > old.at) out[key] = row;
      });
    });
    return out;
  }

  function presenceData(attrs) {
    var raw = attrs && attrs[PREFIX + "presence"], data = null;
    try { data = raw && raw.current ? JSON.parse(raw.current) : null; } catch (e) {}
    if (!data || (data.format !== 1 && data.v !== 1) || !data.views || typeof data.views !== "object") return {};
    var views = {};
    Object.keys(data.views).forEach(function (key) {
      var row = data.views[key];
      if (!row || typeof row !== "object") return;
      var copy = Object.assign({}, row);
      // Les anciennes entrées (v:1) n'avaient ni séquence ni choix par vue.
      // Une séquence zéro les laisse migrer sans rivaliser avec une écriture neuve.
      if (data.v === 1 && !Number.isSafeInteger(copy.seq)) copy.seq = 0;
      // Migration transparente du mode global : on l'attribue au
      // joueur qui l'avait choisi, sans l'imposer aux autres joueurs.
      if (data.v === 1 && data.modeBy && copy.player === String(data.modeBy) && !copy.modeAt) {
        copy.mode = data.mode === "edition" ? "edition" : "consultation";
        copy.modeAt = Number(data.modeAt) || 0;
        copy.modeBy = "legacy:" + String(data.modeBy);
      }
      views[key] = copy;
    });
    return views;
  }

  function presenceChoice(rows, player) {
    var best = null;
    (rows || []).forEach(function (row) {
      if (!row || row.player !== player || row.left) return;
      var candidate = {
        mode: row.mode === "edition" ? "edition" : "consultation",
        modeAt: Number(row.modeAt) || 0,
        modeBy: String(row.modeBy || "")
      };
      if (!best || candidate.modeAt > best.modeAt ||
          candidate.modeAt === best.modeAt && candidate.modeBy > best.modeBy) best = candidate;
    });
    return best;
  }

  function presenceRead(id, attrs) {
    var now = Date.now();
    var known = presenceMerge(presenceKnown[id], presenceData(attrs || readAll(id)), now);
    known = presenceMerge(known, presenceLocal[id], now);
    presenceKnown[id] = known;
    var rows = Object.keys(known).map(function (key) { return known[key]; })
      .filter(function (row) { return !row.left && now - row.at < 30000; });
    return rows.map(function (row) {
      return Object.assign({}, row, presenceChoice(rows, row.player) || {
        mode: "consultation", modeAt: 0, modeBy: ""
      });
    });
  }

  function presenceModeState(rows, player) {
    return presenceChoice(rows, player) || { mode: "consultation", modeAt: 0, modeBy: "" };
  }

  function presenceDiffusion(charId, attrs) {
    var rows = presenceRead(charId, attrs || readAll(charId));
    var player = "", playerName = "Joueur";
    try {
      player = String((window.currentPlayer && window.currentPlayer.id) || "");
      playerName = String((window.currentPlayer && (window.currentPlayer.displayname || window.currentPlayer.name)) || playerName);
    } catch (e) {}
    var state = presenceModeState(rows, player);
    var views = {};
    rows.forEach(function (row) { views[row.view || row.player] = row; });
    var payload = {
      ns: "jjk", type: "presence-state", charId: charId,
      presence: rows, modeState: state, player: player ? { id: player, name: playerName } : null,
      // Compatibilité de lecture avec les anciennes fiches encore ouvertes.
      mode: state.mode, modeAt: state.modeAt, modeBy: state.modeBy,
      modeName: "", views: views
    };
    for (var i = srcFrames.length - 1; i >= 0; i--) {
      if (srcIds[i] !== charId) continue;
      try { srcFrames[i].postMessage(payload, "*"); } catch (e) {}
    }
  }

  function presencePublie(ch) {
    if (!ch) return;
    var attrs = readAll(ch.id);
    presenceRead(ch.id, attrs);
    var current = { format: 1, views: presenceKnown[ch.id] || {} };
    var json = JSON.stringify(current);
    if (!attrs[PREFIX + "presence"] || attrs[PREFIX + "presence"].current !== json) {
      var update = {}; update[PREFIX + "presence"] = { current: json, max: "" };
      enqueue(ch.id, update);
    }
  }

  function presenceTraite(ev, msg) {
    var id = String(msg.charId || "");
    var view = String(msg.viewId || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
    if (!id || !view) return;
    var ch = getChar(id);
    if (!presenceAcces(ch)) return;
    var player = "", name = "Joueur";
    try {
      player = String((window.currentPlayer && window.currentPlayer.id) || "");
      name = String((window.currentPlayer && (window.currentPlayer.displayname || window.currentPlayer.name)) || "Joueur");
    } catch (e) {}
    if (!player) return;

    var attrs = readAll(id), rows = presenceRead(id, attrs), map = presenceLocal[id] || (presenceLocal[id] = {});
    var previous = map[view] || (presenceKnown[id] || {})[view];
    var seq = (previous ? previous.seq : 0) + 1;
    var choice = presenceChoice(rows, player);
    var now = Date.now();
    if (msg.action === "mode" || !choice) {
      var askedAt = Number(msg.requestedAt) || 0;
      choice = {
        mode: msg.action === "mode" && msg.mode === "edition" ? "edition" : "consultation",
        modeAt: Math.max(now, askedAt, choice ? choice.modeAt + 1 : 0),
        modeBy: view + ":" + seq
      };
    }
    map[view] = Object.assign({
      player: player, name: name, view: view, at: now, seq: seq,
      left: msg.action === "leave"
    }, choice);
    presenceKnown[id] = presenceMerge(presenceKnown[id], map, now);
    presencePublie(ch);
    presenceDiffusion(id, readAll(id));
  }
  // ---------- plateau de Narration ----------
  // Le plateau partagé vit dans les Attributes d'un personnage nommé
  // « Narration », que le MJ rend contrôlable par tous les joueurs : c'est le
  // SEUL objet d'une campagne où chacun a lecture et écriture (un joueur ne
  // peut pas lire la fiche d'un autre joueur).
  //
  // Le panneau ne connaît aucun identifiant : il demande ICI lequel c'est.
  // C'est le pont qui choisit, jamais la page, et il ne sait désigner que
  // celui-là : le verrou source <-> personnage garde ainsi tout son sens, une
  // frame ne pouvant se lier qu'à un personnage qu'on lui a nommé. Que
  // n'importe qui puisse ensuite écrire ce plateau n'est pas une faiblesse,
  // c'est sa raison d'être — comme la table où chacun peut tendre le bras.
  var NARR_NOM = "narration";
  function narrationChar() {
    var c = campaign(), ms = (c && c.characters && c.characters.models) || [];
    for (var i = 0; i < ms.length; i++) {
      var n = ms[i].get ? ms[i].get("name") : (ms[i].attributes || {}).name;
      if (String(n == null ? "" : n).replace(/\s+/g, " ").trim().toLowerCase() === NARR_NOM) return ms[i];
    }
    return null;
  }
  // Le panneau a besoin de savoir s'il peut pousser les jetons ou seulement les
  // regarder : Roll20 refuse l'écriture côté serveur, en silence, et un plateau
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
  // FICHE. Tant que « Narration » n'a jamais été ouvert dans la partie, readAll
  // rend {} — un vide qui ressemble trait pour trait à un plateau neuf — et
  // writeOne crée ses attributs dans une collection qui n'est liée à rien : ils
  // ne reviennent jamais. C'est l'unique cause des deux pannes vues en partie :
  // le plateau redistribuait sur du vide, puis annonçait « Roll20 a refusé les
  // dernières écritures » au bout de deux allers-retours manqués.
  //
  // Le pont ouvre donc la fiche lui-même, hors champ, et ne répond « sûr »
  // qu'une fois Roll20 passé par là. RIEN DE TOUT CECI N'EST DOCUMENTÉ par
  // Roll20 : chaque chemin d'ouverture est SONDÉ, du plus discret au plus
  // brutal, et seul le RÉSULTAT observé fait foi — des attributs peuplés, ou le
  // dialogue apparu dans le document. Aucun appel n'est cru sur parole.
  //
  // LA FICHE RESTE OUVERTE, cachée, au lieu d'être refermée sitôt les attributs
  // lus. C'est le choix le plus sûr des deux : rien ne garantit qu'une collection
  // reste synchronisée avec Firebase une fois la fiche fermée, et un plateau qui
  // cesserait de voir les jetons poussés par les autres serait une panne bien plus
  // sournoise que celle qu'on répare. Le joueur, lui, ne perd rien : la fiche est
  // hors champ, et elle reparaît s'il l'ouvre lui-même (guet ci-dessous).
  var OUV_ESSAI = 700;      // ms entre deux tentatives d'ouverture
  var OUV_GRACE = 1500;     // ms de fiche ouverte avant de croire un plateau vraiment vide
  var OUV_LIMITE = 12000;   // ms au bout desquelles on dit franchement que ça n'a pas marché
  var suivis = {};          // charId -> avancement de l'ouverture
  var narrId = null;        // le personnage du plateau, seul concerné (voir pump)

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
  // LE GUET. Roll20 remploie le même dialogue : le joueur qui ouvre « Narration »
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
        if (!ev.isTrusted || !idSur(narrId)) return;
        var s = suivis[narrId];
        if (!s || s.sienne) return;
        var t = ev.target;
        if (!t || !t.closest || !t.closest('[data-itemid="' + narrId + '"]')) return;
        s.sienne = true;
        var dlg = dialogueDe(narrId);
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
    if (s.sur) return "sur";   // plateau lu et VRAIMENT vide : rien à rouvrir
    if (s.echec) return "echec";
    var dlg = ficheOuverte(id);
    // Une fiche ouverte AVANT notre première tentative est au joueur : on ne la
    // cache pas. Son ouverture charge les attributs aussi bien que la nôtre.
    if (dlg && !s.tente) s.sienne = true;
    if (dlg) {
      if (!s.sienne) cacheFiche(dlg);   // à chaque passage : jQuery UI replace ses dialogues
      if (!s.vue) s.vue = n;
      // Fiche ouverte et toujours aucun attribut : passé un instant, c'est que le
      // personnage est VRAIMENT vide (plateau neuf). C'est le seul moment où une
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

  // ---------- LA COLLECTION NE SE MET PAS À JOUR TOUTE SEULE ----------
  // MESURÉ, à deux clients sur une vraie partie : un attribut écrit par l'un, et
  // ACCEPTÉ par le serveur, n'arrive JAMAIS chez l'autre. Douze secondes
  // d'observation, rien — ni sur une création, ni sur une modification. Un seul
  // attribs.fetch(), et la valeur est là.
  //
  // La collection d'Attributes est donc un INSTANTANÉ, pas un abonnement :
  // ouvrir la fiche la remplit UNE FOIS, et plus rien ne la nourrit ensuite.
  // C'est l'unique cause du plateau qui ne bougeait pas chez les autres joueurs.
  // Chacun relisait fidèlement, toutes les 1,2 s, la copie figée qu'il tenait
  // depuis son arrivée dans la partie ; seul un rechargement complet la
  // renouvelait, et c'est bien ce que les joueurs avaient fini par faire.
  //
  // C'ÉTAIT LE PARI QUI MANQUAIT. Plus haut, ce fichier explique qu'on laisse la
  // fiche OUVERTE plutôt que de la refermer, « rien ne garantissant qu'une
  // collection reste synchronisée avec Firebase une fois la fiche fermée ». La
  // mesure tranche : elle ne l'est pas davantage fiche ouverte. Laisser ouvert
  // ne coûte rien et reste bien ; cela ne suffisait simplement pas.
  //
  // LE PONT FOURNIT LE GESTE, LA PAGE CHOISIT QUAND. Un fetch rapporte TOUS les
  // attributs du personnage, fonds de zone compris : sa cadence est un réglage,
  // et un réglage n'a pas sa place dans un paquet signé — la page du plateau se
  // déploie en un après-midi, ce fichier-ci demande une signature. Le pont se
  // borne donc à refuser de marteler, et ne conclut rien.
  //
  // LE FETCH FUSIONNE, IL NE REMPLACE PAS : mesuré, 295 attributs deviennent 296
  // et aucun ne disparaît le temps de la requête. C'est ce qui rend l'opération
  // sûre ici — une collection vidée un instant ferait créer un HOMONYME à la
  // première écriture qui tomberait dans le trou, et les homonymes sont
  // exactement la plaie que le ménage, plus bas, passe son temps à réparer.
  var RESYNC_MIN = 1500;    // même cadence minimale que le pont Outward
  var resyncJobs = {};      // même ordonnanceur de lectures que le pont Outward
  function extensionCapacites() {
    var racine = document.documentElement;
    return {
      version: racine ? String(racine.getAttribute("data-jjk-extension-version") || "") : "",
      protocol: racine ? Number(racine.getAttribute("data-jjk-bridge-protocol") || 0) : 0,
      capabilities: {
        compactStorage: 1, operationJournal: 1, readAfterWrite: 1,
        storageActivation: 1, storageCleanup: 1, storageRelease: 1, sharedMode: 1, localBackups: 1,
        backupRestore: 1, narrationIndependent: 1, sessionRelay: 1, perPlayerPresence: 1
      }
    };
  }
  function publieLecture(ch, ok) {
    if (!ch) return;
    var attrs = readAll(ch.id);
    if (ok) {
      stockageFraiche[ch.id] = { at: Date.now(), attrs: attrs };
      stockageConfirme(ch, attrs);
      if (typeof presenceDiffusion === "function") presenceDiffusion(ch.id, attrs);
    }
    for (var i = srcFrames.length - 1; i >= 0; i--) {
      if (srcIds[i] !== ch.id) continue;
      try {
        // Les blocs contenant des images peuvent être très lourds. Le pont
        // mémorise ce qu'il a déjà envoyé à chaque fenêtre et n'en renvoie le
        // contenu qu'à sa première lecture, à son changement ou au renvoi forcé.
        var pour = {}, omis = [];
        Object.keys(attrs).forEach(function (nom) { pour[nom] = attrs[nom]; });
        omis = allege(pour, srcFrames[i], false);
        srcFrames[i].postMessage({ ns: "jjk", type: "hydrate",
          charId: ch.id, attrs: pour, omis: omis, fresh: !!ok, extension: extensionCapacites() }, "*");
      } catch (e) {}
    }
  }
  function resynchronise(ch) {
    if (!ch || !ch.attribs || typeof ch.attribs.fetch !== "function") {
      if (ch) publieLecture(ch, false);
      return false;
    }
    var job = resyncJobs[ch.id] || (resyncJobs[ch.id] = {
      last: 0, running: false, timer: null, serial: 0
    });
    if (job.running || job.timer) return true;
    var delay = RESYNC_MIN - (Date.now() - job.last);
    if (delay > 0) {
      job.timer = setTimeout(function () {
        job.timer = null;
        resynchronise(ch);
      }, delay);
      return true;
    }
    job.last = Date.now();
    job.running = true;
    var serial = ++job.serial, timeout;
    function termine(ok) {
      if (serial !== job.serial || !job.running) return;
      clearTimeout(timeout);
      job.running = false;
      publieLecture(ch, ok);
    }
    timeout = setTimeout(function () { termine(false); }, 36000);
    try {
      // Même fetch serveur, cadence, délai maximal et verrou que dans Outward.
      ch.attribs.fetch({
        success: function () { termine(true); },
        error: function () { termine(false); }
      });
    } catch (e) { termine(false); }
    return true;
  }
  // Les fiches et le plateau restent abonnés tant que leur fenêtre existe.
  // Les collections Roll20 ne se rafraîchissent pas toutes seules : une lecture
  // périodique est donc indispensable à la synchronisation inter-fenêtres.
  setInterval(function () {
    menage();
    var vus = {};
    for (var i = 0; i < srcIds.length; i++) {
      var id = srcIds[i];
      if (!id || vus[id]) continue;
      vus[id] = true;
      var ch = getChar(id);
      if (ch) resynchronise(ch);
    }
  }, RESYNC_MIN);

  // ---------- le ménage des attributs du plateau ----------
  // Mesuré chez l'auteur : 82 attributs « jjk_ » sur « Narration » pour 18
  // attendus. Deux causes, deux remèdes, et la SEULE opération destructrice de
  // ce fichier — donc la plus surveillée.
  //   - LES ÉTRANGERS. Une fiche de personnage JJK a été ouverte un jour sur ce
  //     personnage : sa carte d'attributs en produit une soixantaine (jjk_pv,
  //     jjk_state…). Elles n'ont rien à faire sur un plateau, alourdissent
  //     chaque lecture, et font passer le plateau pour un personnage.
  //   - LES HOMONYMES. Le pont lui-même en a fabriqué tant que la fiche de
  //     « Narration » n'était pas ouverte : la collection était vide, chaque
  //     écriture créait un doublon au lieu de mettre à jour l'existant.
  //
  // L'ORDRE N'EST PAS NÉGOCIABLE. On écrit D'ABORD la valeur retenue dans TOUS
  // les homonymes, on ne supprime qu'ENSUITE. Si une suppression échoue au
  // milieu, ce qui survit dit déjà la bonne chose ; l'ordre inverse pourrait
  // laisser un survivant porteur d'une valeur périmée, et le plateau reculerait
  // d'un tour sans que personne ne comprenne pourquoi.
  //
  // TROIS VERROUS.
  //   1. LE PERSONNAGE DU PLATEAU, ET LUI SEUL. narrId est choisi par le pont
  //      lui-même, d'après le nom ; aucun autre personnage n'est jamais touché,
  //      et surtout pas une fiche de joueur.
  //   2. JAMAIS LE DERNIER EXEMPLAIRE D'UN NOM « jjk_narr_ » : c'est l'état du
  //      plateau, et une place perdue ne se retrouve pas. Le contrôle est refait
  //      JUSTE AVANT chaque suppression, sur la collection vivante, parce que
  //      les autres joueurs font le même ménage au même moment sur le même
  //      personnage partagé. Les étrangers, eux, se retirent jusqu'au dernier :
  //      ils ne portent aucun état de plateau, c'est même toute la raison de les
  //      retirer — leur appliquer ce verrou reviendrait à ne rien faire.
  //   3. UNE SUPPRESSION QUI ÉCHOUE ARRÊTE TOUT. Insister sur un serveur qui
  //      refuse (un joueur sans droit d'écriture, par exemple), c'est marteler
  //      Roll20 à chaque chargement de partie pour rien. On note où l'on s'est
  //      arrêté, et le plateau pourra le dire.
  //
  // Le ménage ne se fait qu'UNE FOIS PAR CHARGEMENT DE PAGE, et seulement quand
  // la lecture vaut vérité (« sur ») : sur une collection non peuplée, tout
  // paraîtrait absent et il n'y aurait rien à retirer — mais rien ne le dirait.
  // Repli si la page ne dit rien : le ménage garde alors TOUT, donc ne détruit
  // rien. Le préfixe n'est plus écrit ici — c'est le site qui le donne.
  var menageFait = false;     // une fois par chargement, pas une fois par lecture
  var menageRapport = null;   // ce qu'il a fait, transmis avec la lecture suivante

  // AUCUN « silent » ICI, contrairement aux écritures, et c'est un choix.
  // Pour Roll20, silencieux veut dire NE PAS PROPAGER (c'est exactement ce qui
  // rendait save() inopérant, voir plus haut) : une suppression silencieuse
  // resterait donc locale, l'attribut reviendrait au rechargement suivant, et
  // le ménage aurait l'air de marcher sans rien retirer. On accepte en échange
  // que Roll20 rafraîchisse la fiche de « Narration » — qui est ouverte, mais
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

  // CE QUI APPARTIENT AU PLATEAU EST DIT PAR LE SITE, jamais deviné ici.
  //
  // « tout jjk_ qui n'est pas jjk_narr_ est un reste de fiche » est un critère
  // NÉGATIF : gravé dans un paquet signé, il condamnerait tout nom que la page
  // du plateau se mettrait à écrire plus tard — et cette page, elle, change sans
  // signature. Le site envoie donc SES préfixes avec la demande de ménage, et
  // rien d'autre n'est jamais conservé. Sans cette liste, on ne détruit RIEN :
  // un ménage qui ne sait pas ce qu'il garde n'est pas un ménage.
  var menageGarde = null;   // liste de préfixes, donnée par la page du plateau
  function aMoi(n) {
    if (!menageGarde || !menageGarde.length) return true;   // on ne sait pas -> on garde
    for (var i = 0; i < menageGarde.length; i++) {
      if (n.indexOf(menageGarde[i]) === 0) return true;
    }
    return false;
  }
  function menagePlateau(ch) {
    if (menageFait) return;
    if (!ch || !narrId || ch.id !== narrId) return;   // VERROU 1
    menageFait = true;   // posé AVANT le travail : un échec ne doit pas le relancer
    var rap = { trouves: 0, etrangers: 0, doublons: 0, retires: 0 };
    var ms = models(ch), parNom = {}, noms = [], fusions = [], morts = [], i, n;
    for (i = 0; i < ms.length; i++) {
      n = attrVal(ms[i], "name");
      if (typeof n !== "string" || n.indexOf(PREFIX) !== 0) continue;
      rap.trouves++;
      if (!aMoi(n)) {
        rap.etrangers++;
        morts.push({ nom: n, m: ms[i], plateau: false });
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
      for (var k = 1; k < l.length; k++) morts.push({ nom: noms[i], m: l[k], plateau: true });
    }
    if (!fusions.length && !morts.length) { menageRapport = rap; return; }

    // Les étapes se déroulent UNE À UNE et espacées, comme les écritures du
    // plateau : Roll20 perd des écritures sur une rafale, et une rafale de
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
        // plateau écrit pendant ce temps-là, et une valeur d'il y a trois
        // secondes écraserait un jeton qu'on vient de pousser.
        var tous = findAllAttrs(ch, nom);
        if (tous.length > 1) {
          // Le DERNIER fait foi : c'est celui que readAll retient (elle parcourt
          // tout et laisse le dernier gagner), donc celui que le plateau montre.
          var d0 = tous[tous.length - 1];
          var data = { name: nom, current: str(attrVal(d0, "current")), max: str(attrVal(d0, "max")) };
          // ON RETIENT CELUI QU'ON GARDE, ET ON ATTEND SA CONFIRMATION. Les
          // copies ne seront détruites que si le serveur a dit « accepté » pour
          // lui : supprimer avant de savoir si la valeur conservée a pris, c'est
          // la perdre. On a passé la journée à découvrir qu'une écriture peut
          // être acceptée en mémoire et jamais persistée.
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
      if (mort.plateau) {
        // VERROU 2, EN DEUX TEMPS, parce qu'un seul ne suffisait pas.
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

  // ---------- stockage Compact : validation, activation et ménage ----------
  // Une photographie n'est « active » qu'après sa relecture intégrale côté
  // Roll20. La phase staging est volontaire : elle interdit les journaux avant
  // que tous les blocs aient été écrits et vérifiés.
  var stockageFraiche = {}, stockageNettoyage = {}, stockageRapports = {}, stockageActivation = {}, stockageSauvegardes = {}, stockageVues = Object.create(null), stockageEnAttente = Object.create(null);
  function stockageAcces(ch) {
    if (!ch) return false;
    var d = droits(ch), ids = String(d.controlledby || '').split(',').map(function (v) { return v.trim(); });
    return d.gm === true || ids.indexOf('all') >= 0 || (!!d.moi && ids.indexOf(d.moi) >= 0);
  }
  function stockageHash(s) {
    s = String(s); var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16);
  }
  function stockageStable(v) {
    if (Array.isArray(v)) return '[' + v.map(stockageStable).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(function (k) {
      return JSON.stringify(k) + ':' + stockageStable(v[k]);
    }).join(',') + '}';
    return JSON.stringify(v);
  }
  function stockageConfig(kind) {
    return kind === 'narration'
      ? { meta: 'jjk_narr_storage', block: 'jjk_narr_block_', stack: 'jjk_narr_stack_', ops: 'jjk_narr_ops_' }
      : { meta: 'jjk_storage', block: 'jjk_block_', stack: 'jjk_stack_', ops: 'jjk_ops_' };
  }
  function stockageMeta(attrs, kind) {
    var cfg = stockageConfig(kind), raw = attrs && attrs[cfg.meta];
    if (!raw || typeof raw.current !== 'string' || !raw.current) return null;
    var meta = JSON.parse(raw.current);
    if (!meta || meta.format !== 2 || typeof meta.epoch !== 'string' || !meta.epoch ||
        ['staging', 'ready'].indexOf(meta.phase) < 0 ||
        !meta.blocks || typeof meta.blocks !== 'object' || Array.isArray(meta.blocks))
      throw new Error('Manifeste Compact invalide.');
    Object.keys(meta.blocks).forEach(function (name) {
      if (name.indexOf(cfg.block) !== 0 && name.indexOf(cfg.stack) !== 0)
        throw new Error('Nom de bloc Compact non autorisé : ' + name);
      if (name.indexOf('__proto__') >= 0 || name.indexOf('constructor') >= 0 ||
          typeof meta.blocks[name] !== 'string')
        throw new Error('Nom ou empreinte de bloc Compact réservé.');
      var box = attrs[name];
      if (!box || typeof box.current !== 'string' || stockageHash(box.current) !== meta.blocks[name])
        throw new Error('Bloc Compact absent ou invalide : ' + name);
    });
    if (meta.names && typeof meta.names === 'object') Object.keys(meta.names).forEach(function (logical) {
      var physical = meta.names[logical];
      if (typeof logical !== 'string' || typeof physical !== 'string' ||
          (logical.indexOf(cfg.block) !== 0 && logical.indexOf(cfg.stack) !== 0) ||
          (physical.indexOf(cfg.block) !== 0 && physical.indexOf(cfg.stack) !== 0) ||
          physical.indexOf('__proto__') >= 0 || physical.indexOf('constructor') >= 0 ||
          !Object.prototype.hasOwnProperty.call(meta.blocks, physical))
        throw new Error('Référence de bloc Compact invalide.');
    });
    return meta;
  }
  function stockageFraichePour(ch) {
    var f = ch && stockageFraiche[ch.id];
    return f && Date.now() - f.at <= 15000 ? f : null;
  }
  function stockageTravailEnCours(ch) {
    return !!(ch && ((activeJob && activeJob.id === ch.id) || queue.some(function (job) { return job.id === ch.id; })));
  }
  function stockageActiver(ch, kind) {
    var f = stockageFraichePour(ch);
    if (!f) return { status: 'pending', stage: 'confirmation' };
    var cfg = stockageConfig(kind), meta = stockageMeta(f.attrs, kind);
    if (!meta) return { status: 'absent' };
    if (meta.phase === 'ready') return { status: 'ready' };
    var key = ch.id + ':' + kind, now = Date.now();
    if (stockageActivation[key] && now - stockageActivation[key] < 6000)
      return { status: 'pending', stage: 'writing' };
    if (stockageTravailEnCours(ch))
      return { status: 'pending', stage: 'writing' };
    // L'écriture du marqueur ne part qu'après vérification de CHAQUE bloc.
    // Le verrou court évite que plusieurs vues n'empilent le même marqueur.
    stockageActivation[key] = now;
    meta.phase = 'ready';
    var attrs = {}; attrs[cfg.meta] = { current: JSON.stringify(meta), max: '' };
    enqueue(ch.id, attrs);
    return { status: 'activating' };
  }
  function stockageClePending(kind, epoch, id) { return JSON.stringify([kind, epoch, String(id)]); }
  function stockageBucketPending(ch) {
    return stockageEnAttente[ch.id] || (stockageEnAttente[ch.id] = { ops: Object.create(null), payloads: Object.create(null) });
  }
  function stockageOperationsEnAttente(ch, kind, epoch) {
    var bucket = ch && stockageEnAttente[ch.id], ops = Object.create(null), payloads = Object.create(null);
    if (!bucket) return { ops: ops, payloads: payloads };
    Object.keys(bucket.ops).forEach(function (key) {
      var item = bucket.ops[key];
      if (item.kind === kind && item.epoch === epoch) ops[item.id] = item.op;
    });
    Object.keys(bucket.payloads).forEach(function (key) {
      var item = bucket.payloads[key];
      if (item.kind === kind && item.epoch === epoch) payloads[item.name] = item.current;
    });
    return { ops: ops, payloads: payloads };
  }
  function stockageTravailContient(ch, item, isPayload) {
    var jobs = [];
    if (activeJob) jobs.push(activeJob);
    queue.forEach(function (job) { jobs.push(job); });
    var cfg = stockageConfig(item.kind), prefix = cfg.ops;
    for (var i = 0; i < jobs.length; i++) {
      var job = jobs[i];
      if (job.id !== ch.id) continue;
      var attrs = job.attrs || {};
      if (isPayload) {
        if (attrs[item.name] && String(attrs[item.name].current || '') === item.current) return true;
      } else {
        var names = Object.keys(attrs);
        for (var j = 0; j < names.length; j++) {
          if (names[j].indexOf(prefix) !== 0) continue;
          try {
            var box = JSON.parse(attrs[names[j]].current || '{}');
            if (box.epoch === item.epoch && Array.isArray(box.ops) && box.ops.some(function (op) {
              return op.id === item.id && stockageStable(op) === stockageStable(item.op);
            })) return true;
          } catch (e) {}
        }
      }
    }
    return false;
  }
  // Après une relecture fraîche, les opérations présentes sont confirmées.
  // Celles absentes ne sont libérées que si aucune écriture n'est encore en vol.
  function stockageConfirme(ch, attrs) {
    if (!ch || !attrs) return;
    var bucket = stockageEnAttente[ch.id];
    if (!bucket) return;
    var metas = {};
    ['fiche', 'narration'].forEach(function (kind) {
      var cfg = stockageConfig(kind), meta = null;
      try { meta = stockageMeta(attrs, kind); } catch (e) {}
      if (!meta) return;
      metas[kind] = meta.epoch;
      var found = Object.create(null);
      Object.keys(attrs).forEach(function (name) {
        if (name.indexOf(cfg.ops) !== 0) return;
        try {
          var box = JSON.parse(attrs[name].current || '{}');
          if (box.format !== 2 || box.epoch !== meta.epoch || !Array.isArray(box.ops)) return;
          box.ops.forEach(function (op) { if (op && typeof op.id === 'string') found[op.id] = op; });
        } catch (e) {}
      });
      Object.keys(bucket.ops).forEach(function (key) {
        var item = bucket.ops[key];
        if (item.kind !== kind || item.epoch !== meta.epoch) return;
        if (found[item.id] && stockageStable(found[item.id]) === stockageStable(item.op)) delete bucket.ops[key];
        else if (!stockageTravailContient(ch, item, false)) delete bucket.ops[key];
      });
      Object.keys(bucket.payloads).forEach(function (key) {
        var item = bucket.payloads[key];
        if (item.kind !== kind || item.epoch !== meta.epoch) return;
        if (attrs[item.name] && String(attrs[item.name].current || '') === item.current) delete bucket.payloads[key];
        else if (!stockageTravailContient(ch, item, true)) delete bucket.payloads[key];
      });
    });
    // Une époque qui a changé invalide les références pending de l'ancienne.
    ['ops', 'payloads'].forEach(function (type) {
      Object.keys(bucket[type]).forEach(function (key) {
        var item = bucket[type][key];
        if (metas[item.kind] && metas[item.kind] !== item.epoch && !stockageTravailContient(ch, item, type === 'payloads')) delete bucket[type][key];
      });
    });
    if (!Object.keys(bucket.ops).length && !Object.keys(bucket.payloads).length) delete stockageEnAttente[ch.id];
  }
  // Chaque fenêtre possède une session Compact. Les opérations en attente sont
  // suivies globalement au personnage : deux fenêtres ne peuvent donc pas
  // réutiliser un même ID avec un contenu différent avant la relecture Roll20.
  function stockageSuitVue(ch, viewId, sessionId, kind, epoch, ops, payloads) {
    if (!ch || !viewId || !sessionId || !epoch) return;
    var genre = kind === 'narration' ? 'narration' : 'fiche';
    var parVue = stockageVues[ch.id] || (stockageVues[ch.id] = Object.create(null));
    var vue = parVue[viewId], bucket = stockageBucketPending(ch);
    if (vue && (vue.session !== sessionId || vue.kind !== genre || vue.epoch !== epoch))
      throw new Error('Une vue a changé de session Compact sans se recharger.');
    // Prévalidation complète avant toute mutation : un lot rejeté ne doit pas
    // laisser de référence fantôme ni de moitié de session dans le pont.
    (ops || []).forEach(function (op) {
      if (!op || typeof op.id !== 'string') throw new Error('Opération Compact sans identifiant.');
      var pending = bucket.ops[stockageClePending(genre, epoch, op.id)];
      if (pending && stockageStable(pending.op) !== stockageStable(op))
        throw new Error('Identifiant d’opération en attente réutilisé avec un contenu différent : ' + op.id);
    });
    Object.keys(payloads || {}).forEach(function (name) {
      var value = payloads[name], current = value && typeof value.current === 'string' ? value.current : String(value || '');
      var pending = bucket.payloads[stockageClePending(genre, epoch, name)];
      if (pending && pending.current !== current)
        throw new Error('Bloc Compact en attente réutilisé avec un contenu différent : ' + name);
    });
    if (!vue) vue = parVue[viewId] = { session: sessionId, kind: genre, epoch: epoch, ops: Object.create(null), payloads: Object.create(null) };
    (ops || []).forEach(function (op) {
      vue.ops[op.id] = op;
      var key = stockageClePending(genre, epoch, op.id), pending = bucket.ops[key];
      if (!pending) pending = bucket.ops[key] = { kind: genre, epoch: epoch, id: op.id, op: op, refs: Object.create(null) };
      pending.refs[viewId] = true;
    });
    Object.keys(payloads || {}).forEach(function (name) {
      var value = payloads[name], current = value && typeof value.current === 'string' ? value.current : String(value || '');
      vue.payloads[name] = current;
      var key = stockageClePending(genre, epoch, name), pending = bucket.payloads[key];
      if (!pending) pending = bucket.payloads[key] = { kind: genre, epoch: epoch, name: name, current: current, refs: Object.create(null) };
      pending.refs[viewId] = true;
    });
  }
  function stockageLibereVue(ch, viewId) {
    if (!ch || !viewId) return { status: 'absent' };
    var parVue = stockageVues[ch.id] || {}, vue = parVue[viewId];
    if (!vue) return { status: 'absent' };
    delete parVue[viewId];
    var autresOps = Object.create(null), autresPayloads = Object.create(null);
    Object.keys(parVue).forEach(function (id) {
      Object.keys(parVue[id].ops || {}).forEach(function (op) { autresOps[op] = true; });
      Object.keys(parVue[id].payloads || {}).forEach(function (name) { autresPayloads[name] = true; });
    });
    var fresh = stockageFraichePour(ch), attrs = fresh ? fresh.attrs : readAll(ch.id);
    var cfg = stockageConfig(vue.kind), prefix = cfg.ops, annules = 0;
    // Un job sorti de la file est déjà en cours : il reste suivi jusqu'à sa
    // confirmation distante. Les jobs non commencés peuvent être annulés.
    queue.forEach(function (job) {
      if (job.id !== ch.id) return;
      Object.keys(job.attrs || {}).forEach(function (name) {
        if (name.indexOf(prefix) === 0 && !attrs[name]) {
          try {
            var box = JSON.parse(job.attrs[name].current || '{}');
            var owned = (box.ops || []).some(function (op) { return !!vue.ops[op.id]; });
            var shared = (box.ops || []).some(function (op) { return !!autresOps[op.id]; });
            // Si un lot contient aussi une opération encore référencée par une
            // autre vue, on conserve le lot entier : journal immuable, pas de
            // réécriture d'un contenu sous un nom dérivé de l'ancien hash.
            if (owned && !shared) { delete job.attrs[name]; annules++; }
          } catch (e) { /* un job illisible ne se supprime jamais */ }
        } else if (Object.prototype.hasOwnProperty.call(vue.payloads, name) && !autresPayloads[name] && !attrs[name]) {
          delete job.attrs[name]; annules++;
        }
      });
    });
    for (var i = queue.length - 1; i >= 0; i--) {
      if (queue[i].id === ch.id && !Object.keys(queue[i].attrs || {}).length) queue.splice(i, 1);
    }
    var bucket = stockageEnAttente[ch.id];
    if (bucket) {
      Object.keys(bucket.ops).forEach(function (key) {
        var item = bucket.ops[key];
        delete item.refs[viewId];
        if (!Object.keys(item.refs).length && !stockageTravailContient(ch, item, false)) delete bucket.ops[key];
      });
      Object.keys(bucket.payloads).forEach(function (key) {
        var item = bucket.payloads[key];
        delete item.refs[viewId];
        if (!Object.keys(item.refs).length && !stockageTravailContient(ch, item, true)) delete bucket.payloads[key];
      });
      if (!Object.keys(bucket.ops).length && !Object.keys(bucket.payloads).length) delete stockageEnAttente[ch.id];
    }
    if (!Object.keys(parVue).length) delete stockageVues[ch.id];
    return { status: 'done', cancelled: annules };
  }

  var STOCKAGE_LEGACY = [
    'jjk_nom','jjk_espece','jjk_age','jjk_sexe','jjk_genre','jjk_portrait',
    'jjk_defaut','jjk_background','jjk_notes','jjk_inventaire','jjk_de','jjk_xp_total',
    'jjk_narration','jjk_pv_max_force','jjk_vitesse_force','jjk_regen_force','jjk_langue_base',
    'jjk_pts_crea_mod','jjk_pts_crea_force','jjk_sans_limite','jjk_release',
    'jjk_qualites','jjk_avantages','jjk_caracs_base','jjk_caracs_xp','jjk_caracs_mod',
    'jjk_caracs_mod2','jjk_caracs_force','jjk_caracs_xp_force','jjk_caracs_xp_mod',
    'jjk_caracs_xp_mod2','jjk_caracs_plafond_mod','jjk_caracs_plafond_force',
    'jjk_comps_mod','jjk_comps_mod2','jjk_comps_force','jjk_comps_xp_force',
    'jjk_comps_xp_mod','jjk_comps_xp_mod2','jjk_competences','jjk_comp_perso',
    'jjk_langues','jjk_armes_comps','jjk_armes','jjk_armures','jjk_inventaire_sys',
    'jjk_divers','jjk_modules','jjk_mod_donnees','jjk_mod_actifs','jjk_mods',
    'jjk_grenier','jjk_v_hist','jjk_notes_journal','jjk_etat_courant'
  ];
  // Les jjk_narr_bg_<id> sont volontairement absents : ce sont de gros fonds
  // autonomes, toujours lus directement par Narration et jamais compactés.
  // Seule la configuration et les anciens jetons migrés sont nettoyés.
  function stockageAncien(name, kind) {
    if (kind === 'narration') return name === 'jjk_narr_conf' || name.indexOf('jjk_narr_pt_') === 0;
    return STOCKAGE_LEGACY.indexOf(name) >= 0;
  }
  function stockageNettoie(ch, kind) {
    var f = stockageFraichePour(ch), cfg = stockageConfig(kind), meta, report;
    function dit(r) { stockageRapports[ch.id + ':' + kind] = r; return r; }
    if (!f) return dit({ status: 'pending', stage: 'confirmation' });
    if (stockageNettoyage[ch.id + ':' + kind]) return dit({ status: 'pending', stage: 'deleting' });
    if (stockageTravailEnCours(ch))
      return dit({ status: 'pending', stage: 'writing' });
    try { meta = stockageMeta(f.attrs, kind); }
    catch (e) { return dit({ status: 'error', error: String(e.message || e) }); }
    if (!meta || meta.phase !== 'ready') return dit({ status: 'pending', stage: 'migration' });
    // Les miroirs historiques ne sont supprimés qu'après confirmation d'une
    // photographie locale réellement écrite dans IndexedDB par l'extension.
    // jjk_state, lui, reste conservé comme dernier recours de récupération.
    var backup = stockageSauvegardes[ch.id];
    if (!backup || backup[kind] !== meta.epoch)
      return dit({ status: 'pending', stage: 'backup' });

    // Un payload créé par une opération reste vivant tant qu'un journal le cite.
    var retenus = {}, morts = [], ms = models(ch), i;
    Object.keys(f.attrs).forEach(function (name) {
      if (name.indexOf(cfg.ops) !== 0) return;
      try {
        var box = JSON.parse(f.attrs[name].current || '{}');
        if (box.epoch !== meta.epoch || !Array.isArray(box.ops)) return;
        box.ops.forEach(function (op) {
          ['creates','modules'].forEach(function (prop) {
            Object.keys(op && op[prop] || {}).forEach(function (id) {
              var spec = op[prop][id]; if (spec && typeof spec.attribute === 'string') retenus[spec.attribute] = true;
            });
          });
        });
      } catch (e) {}
    });
    for (i = 0; i < ms.length; i++) {
      var m = ms[i], name = attrVal(m, 'name');
      if (typeof name !== 'string') continue;
      var legacy = stockageAncien(name, kind), ancienJournal = false;
      // Les journaux d'une ancienne époque ne peuvent plus contribuer à la
      // photographie active. Ils ne sont supprimés qu'après la sauvegarde
      // IndexedDB de la nouvelle époque ; un journal illisible reste intact.
      if (name.indexOf(cfg.ops) === 0) {
        try {
          var ancien = JSON.parse(str(attrVal(m, 'current')) || '{}');
          ancienJournal = ancien && ancien.format === 2 && typeof ancien.epoch === 'string' &&
            ancien.epoch !== meta.epoch && Array.isArray(ancien.ops);
        } catch (eJournal) {}
      }
      var orphan = (name.indexOf(cfg.block) === 0 || name.indexOf(cfg.stack) === 0) &&
        !Object.prototype.hasOwnProperty.call(meta.blocks, name) && !retenus[name];
      if (legacy || ancienJournal || orphan) morts.push({ model: m, name: name });
    }
    if (!morts.length) return dit({ status: 'done', remaining: 0 });

    stockageNettoyage[ch.id + ':' + kind] = true;
    var index = 0, supprimes = 0, started = Date.now();
    function fin(r) { delete stockageNettoyage[ch.id + ':' + kind]; dit(r); }
    function suivant() {
      if (index >= morts.length) { fin({ status: 'done', remaining: 0, removed: supprimes }); return; }
      if (Date.now() - started > 110000) { fin({ status: 'error', error: 'Nettoyage interrompu : délai de sécurité dépassé.', remaining: morts.length - index }); return; }
      var item = morts[index++], actuel = readAll(ch.id), mf;
      try { mf = stockageMeta(actuel, kind); } catch (e) { fin({ status: 'error', error: String(e.message || e) }); return; }
      // La photographie et le manifeste doivent être identiques à ceux que
      // nous avons validés. Si un joueur a écrit depuis, on s'arrête sans rien
      // supprimer de plus : la prochaine lecture repartira d'un état frais.
      if (!mf || mf.phase !== 'ready' || mf.epoch !== meta.epoch ||
          stockageStable(actuel[cfg.meta]) !== stockageStable(f.attrs[cfg.meta])) {
        fin({ status: 'pending', stage: 'changed' }); return;
      }
      if (!encoreLa(ch, item.model)) { setTimeout(suivant, WRITE_DELAY); return; }
      var observed = actuel[item.name], snap = f.attrs[item.name];
      if (!observed || !snap || str(observed.current) !== str(snap.current) || str(observed.max) !== str(snap.max)) {
        setTimeout(suivant, WRITE_DELAY); return;
      }
      detruit(item.model, function () { supprimes++; setTimeout(suivant, WRITE_DELAY); }, function (why) {
        fin({ status: 'error', error: 'Suppression refusée pour ' + item.name + ' : ' + why, remaining: morts.length - index });
      });
    }
    setTimeout(suivant, WRITE_DELAY);
    return dit({ status: 'pending', stage: 'deleting', remaining: morts.length });
  }
  // Écouteur PASSIF : n'agit QUE sur nos messages (ns:"jjk" + charId), qui ne sont
  // émis que sur interaction (ouverture de l'onglet Fiche JJK). On NE poste RIEN de
  // spontané au chargement — Roll20 ouvre ses fiches via postMessage, un message
  // inattendu casserait son gestionnaire. Tout est en try/catch pour ne jamais
  // laisser une exception remonter dans le contexte de Roll20.
  // Une sauvegarde n'est validée qu'après l'accusé du relais IndexedDB.
  // Le pont associe l'accusé à une demande précise et à l'époque Compact lue.
  var stockageBackupDemandes = Object.create(null);
  document.addEventListener("jjk-backup-saved", function (ev) {
    try {
      var data = JSON.parse(ev.detail || "{}");
      if (!data || typeof data.request !== "string" ||
          !Object.prototype.hasOwnProperty.call(stockageBackupDemandes, data.request)) return;
      var pending = stockageBackupDemandes[data.request];
      delete stockageBackupDemandes[data.request];
      if (data.ok === true) {
        var saved = stockageSauvegardes[pending.charId] || {};
        if (pending.fiche) saved.fiche = pending.fiche;
        if (pending.narration) saved.narration = pending.narration;
        saved.at = Date.now();
        stockageSauvegardes[pending.charId] = saved;
      }
      for (var i = srcFrames.length - 1; i >= 0; i--) {
        if (srcIds[i] !== pending.charId || srcViewIds[i] !== pending.viewId) continue;
        try {
          srcFrames[i].postMessage({ ns: "jjk", type: "backup-status", charId: pending.charId,
            viewId: pending.viewId, request: data.request, ok: data.ok === true,
            error: data.ok === true ? "" : String(data.error || "Sauvegarde locale refusée.") }, "*");
        } catch (eFrame) {}
      }
    } catch (e) {}
  }, false);

  window.addEventListener("message", function (ev) {
    try {
      var d = ev.data;
      if (!d || d.ns !== "jjk") return;
      // la liste des joueurs ne dépend d'aucun personnage : traitée AVANT le
      // filtre charId
      if (d.type === "players") { reply(ev, { type: "players-result", players: players() }); return; }
      // Les sauvegardes locales ne quittent jamais le personnage courant :
      // le pont ajoute les identifiants réels de campagne/personnage et relaie
      // uniquement une photographie déjà confirmée par la fiche.
      if (d.type === "storage-ops") {
        try {
        var storageChar = d.charId && getChar(d.charId);
        if (!storageChar || !liee(ev.source, d.charId) || !stockageAcces(storageChar) ||
            !Array.isArray(d.ops) || !d.epoch) return;
        if (d.storage !== undefined && d.storage !== "fiche" && d.storage !== "narration")
          throw new Error("Espace de stockage Compact inconnu.");
        var freshStorage = stockageFraichePour(storageChar), kindStorage = d.storage === "narration" ? "narration" : "fiche";
        if (!freshStorage) { reply(ev, { type: "storage-error", charId: d.charId, error: "Lecture Roll20 trop ancienne : nouvelle lecture requise." }); return; }
        var activeMeta = stockageMeta(freshStorage.attrs, kindStorage);
        if (!activeMeta || activeMeta.phase !== "ready" || activeMeta.epoch !== d.epoch) {
          reply(ev, { type: "storage-error", charId: d.charId, error: "Le stockage Compact n'est pas activé ou son époque a changé. Rechargez la lecture avant de renvoyer les opérations." }); return;
        }
        var viewIndex = srcFrames.indexOf(ev.source), viewId = String(d.viewId || "");
        if (viewIndex < 0 || !viewId || viewId.length > 128 || srcViewIds[viewIndex] !== viewId)
          throw new Error("Identifiant de vue Compact invalide : rechargez la fiche.");
        var operationsRecues = [], incomingOps = Object.create(null);
        d.ops.forEach(function (op) {
          if (!op || typeof op.id !== "string" || !op.id.length || op.id.length > 256 ||
              ["__proto__", "prototype", "constructor"].indexOf(op.id) >= 0 ||
              !Number.isSafeInteger(op.clock) || op.clock < 0 || !Array.isArray(op.changes) || op.changes.length > 20000 ||
              op.changes.some(function (change) {
                return !change || typeof change.k !== "string" || change.k.length > 4096 ||
                  change.k.indexOf("__proto__") >= 0 || change.k.indexOf("constructor") >= 0 ||
                  !Array.isArray(change.n) || !change.n.length || ["v", "o", "a", "d", "l", "i"].indexOf(change.n[0]) < 0;
              })) throw new Error("Le journal contient une opération invalide.");
          if (incomingOps[op.id] && stockageStable(incomingOps[op.id]) !== stockageStable(op))
            throw new Error("Identifiant d'opération répété dans le même envoi avec un contenu différent : " + op.id);
          if (!incomingOps[op.id]) { incomingOps[op.id] = op; operationsRecues.push(op); }
        });
        var ops = operationsRecues.slice();
        var narrationStorage = d.storage === "narration";
        var opsPrefix = narrationStorage ? "jjk_narr_ops_" : "jjk_ops_";
        var blockPrefix = narrationStorage ? "jjk_narr_block_" : "jjk_block_";
        var stackPrefix = narrationStorage ? "jjk_narr_stack_" : "jjk_stack_";
        var payloads = {}, payloadSource = d.payloads && typeof d.payloads === "object" && !Array.isArray(d.payloads) ? d.payloads : {};
        if (d.payloads != null && (typeof d.payloads !== "object" || Array.isArray(d.payloads)))
          throw new Error("Les blocs du journal sont invalides.");
        Object.keys(payloadSource).forEach(function (name) {
          var value = payloadSource[name];
          if ((name.indexOf(blockPrefix) !== 0 && name.indexOf(stackPrefix) !== 0) ||
              name.indexOf("__proto__") >= 0 || name.indexOf("constructor") >= 0 ||
              !value || typeof value.current !== "string" || value.current.length > 950000)
            throw new Error("Bloc de données non autorisé ou trop volumineux : " + name);
          payloads[name] = { current: value.current, max: "" };
        });
        if (!ops.length && !Object.keys(payloads).length) return;
        var currentAttrs = freshStorage.attrs, seenOps = Object.create(null), sessionId = String(d.session || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
        if (!sessionId) { reply(ev, { type: "storage-error", charId: d.charId, error: "Identifiant de session Compact absent." }); return; }
        var attenteStorage = stockageOperationsEnAttente(storageChar, kindStorage, d.epoch);
        Object.keys(attenteStorage.ops).forEach(function (id) {
          var op = attenteStorage.ops[id];
          if (seenOps[id] && stockageStable(seenOps[id]) !== stockageStable(op))
            throw new Error("Identifiant d'opération en attente réutilisé avec un contenu différent : " + id);
          seenOps[id] = op;
        });
        Object.keys(currentAttrs).forEach(function (name) {
          if (name.indexOf(opsPrefix) !== 0) return;
          try {
            var journal = JSON.parse(currentAttrs[name].current || "{}");
            if (journal.epoch !== d.epoch) return;
            if (!Array.isArray(journal.ops)) throw new Error("Journal Compact mal formé : " + name);
            journal.ops.forEach(function (op) {
              if (!op || typeof op.id !== "string") throw new Error("Opération illisible dans " + name);
              if (seenOps[op.id] && stockageStable(seenOps[op.id]) !== stockageStable(op))
                throw new Error("Identifiant d'opération réutilisé avec un contenu différent : " + op.id);
              seenOps[op.id] = op;
            });
          } catch (e) { throw new Error("Journal Compact illisible : " + name + " (" + String(e.message || e) + ")"); }
        });
        Object.keys(payloads).forEach(function (name) {
          if (Object.prototype.hasOwnProperty.call(attenteStorage.payloads, name)) {
            if (attenteStorage.payloads[name] !== payloads[name].current)
              throw new Error("Identifiant de bloc en attente réutilisé avec un contenu différent : " + name);
            delete payloads[name];
            return;
          }
          if (currentAttrs[name]) {
            if (String(currentAttrs[name].current || "") !== payloads[name].current)
              throw new Error("Identifiant de bloc déjà utilisé avec un contenu différent : " + name);
            delete payloads[name];
          }
        });
        ops = ops.filter(function (op) {
          if (!seenOps[op.id]) return true;
          if (stockageStable(seenOps[op.id]) !== stockageStable(op))
            throw new Error("Identifiant d'opération déjà enregistré avec un contenu différent : " + op.id);
          return false;
        });
        var lotStorage = {}, payloadNames = Object.keys(payloads);
        payloadNames.forEach(function (name) { lotStorage[name] = payloads[name]; });
        // Journaux immuables par lot : en cas de nouvelle tentative, les IDs
        // déjà relus sont ignorés. Le payload des piles/modules est écrit avant
        // l'opération qui le référence, dans la même file Roll20.
        var paquet = [], taille = 0, numero = 0;
        function empreinteJournal(texte) {
          var h = 2166136261;
          for (var hi = 0; hi < texte.length; hi++) { h ^= texte.charCodeAt(hi); h = Math.imul(h, 16777619); }
          return (h >>> 0).toString(36);
        }
        function pousserPaquet() {
          if (!paquet.length) return;
          var brutJournal = JSON.stringify({ format: 2, epoch: d.epoch, session: sessionId, ops: paquet });
          // Le nom est déterministe à partir du contenu : réessayer exactement
          // le même lot retrouve son attribut immuable, tandis qu'un lot suivant
          // obtient un autre nom. Un compteur remis à zéro à chaque message
          // écraserait sinon le premier journal de la session.
          var nomJournal = opsPrefix + (sessionId || "session") + "_" + empreinteJournal(brutJournal);
          var existant = currentAttrs[nomJournal] || lotStorage[nomJournal];
          if (existant && String(existant.current || "") !== brutJournal)
            throw new Error("Collision de nom de journal Compact : " + nomJournal);
          if (!existant) lotStorage[nomJournal] = { current: brutJournal, max: "" };
          numero++;
          paquet = []; taille = 0;
        }
        ops.forEach(function (op) {
          var raw = JSON.stringify(op), n = raw.length;
          if (paquet.length && taille + n + 2 > 18000) pousserPaquet();
          paquet.push(op); taille += n + 1;
        });
        pousserPaquet();
        // Valider et enregistrer les références de vue AVANT de mettre en file :
        // une collision ou un changement de session ne doit jamais laisser un
        // job partir après que le message a été refusé.
        stockageSuitVue(storageChar, viewId, sessionId, kindStorage, d.epoch, operationsRecues, payloadSource);
        if (Object.keys(lotStorage).length) enqueue(d.charId, lotStorage);
        reply(ev, { type: "storage-ops-queued", charId: d.charId, count: ops.length, payloads: payloadNames.length });
        return;
        } catch (storageOpsError) {
          reply(ev, { type: "storage-error", charId: d.charId, error: String(storageOpsError.message || storageOpsError) });
          return;
        }
      }
      if (d.type === "storage-release") {
        var releaseChar = d.charId && getChar(d.charId), releaseIndex = srcFrames.indexOf(ev.source);
        var releaseView = String(d.viewId || "");
        if (!releaseChar || !liee(ev.source, d.charId) || releaseIndex < 0 ||
            !releaseView || srcViewIds[releaseIndex] !== releaseView) return;
        try { stockageLibereVue(releaseChar, releaseView); } catch (releaseError) {}
        return;
      }
      if (d.type === "storage-activate") {
        var activationChar = d.charId && getChar(d.charId), activationIndex = srcFrames.indexOf(ev.source);
        var activationView = String(d.viewId || ""), activationKind = d.storage === "narration" ? "narration" : "fiche";
        if (d.storage !== undefined && d.storage !== "fiche" && d.storage !== "narration") return;
        if (!activationChar || !liee(ev.source, d.charId) || !stockageAcces(activationChar) ||
            activationIndex < 0 || !activationView || srcViewIds[activationIndex] !== activationView) return;
        try {
          var activation = stockageActiver(activationChar, activationKind);
          reply(ev, Object.assign({ type: "storage-activate-status", charId: d.charId, storage: activationKind }, activation));
        } catch (activationError) {
          reply(ev, { type: "storage-error", charId: d.charId, storage: activationKind, error: String(activationError.message || activationError) });
        }
        return;
      }
      if (d.type === "storage-cleanup") {
        if (d.storage !== undefined && d.storage !== "fiche" && d.storage !== "narration") return;
        var cleanupChar = d.charId && getChar(d.charId), cleanupKind = d.storage === "narration" ? "narration" : "fiche";
        var cleanupIndex = srcFrames.indexOf(ev.source), cleanupView = String(d.viewId || "");
        if (!cleanupChar || !liee(ev.source, d.charId) || cleanupIndex < 0 || !cleanupView || srcViewIds[cleanupIndex] !== cleanupView) return;
        if (!stockageAcces(cleanupChar)) { reply(ev, { type: "storage-cleanup-status", charId: d.charId, storage: cleanupKind, report: { status: "error", error: "Accès en écriture requis pour nettoyer le stockage." } }); return; }
        try { reply(ev, { type: "storage-cleanup-status", charId: d.charId, storage: cleanupKind, report: stockageNettoie(cleanupChar, cleanupKind) }); }
        catch (cleanupError) { reply(ev, { type: "storage-cleanup-status", charId: d.charId, storage: cleanupKind, report: { status: "error", error: String(cleanupError.message || cleanupError) } }); }
        return;
      }
      if (d.type === "backup-snapshot") {
        var backupIndex = srcFrames.indexOf(ev.source), backupView = String(d.viewId || "");
        if (!d.charId || !d.state || typeof d.state !== "object" || Array.isArray(d.state) ||
            !Number.isSafeInteger(d.state.v) || backupIndex < 0 ||
            srcIds[backupIndex] !== d.charId || !backupView || backupView.length > 128 ||
            srcViewIds[backupIndex] !== backupView) return;
        var backupRequest = String(d.request || "");
        if (!backupRequest || backupRequest.length > 160 || backupRequest.indexOf(backupView + "-backup-") !== 0 ||
            stockageBackupDemandes[backupRequest]) return;
        var bc = campaign(), bch = getChar(d.charId), freshBackup = bch && stockageFraichePour(bch);
        if (!bc || !bc.id || !bch) return;
        if (!freshBackup) {
          if (typeof resynchronise === "function") resynchronise(bch);
          reply(ev, { type: "backup-status", charId: d.charId, viewId: backupView, request: backupRequest,
            ok: false, error: "La lecture Roll20 n'est plus assez récente. Une nouvelle lecture a été demandée ; réessayez." });
          return;
        }
        // La liste des attributs vient exclusivement de readAll(), après fetch
        // serveur. Ne jamais prendre d.attrs : la page et les mods ne peuvent
        // pas choisir les données qui seront prises pour une sauvegarde validée.
        var ba = freshBackup.attrs || {}, bs = ba[PREFIX + "state"], bm = ba[PREFIX + "storage"];
        if ((!(bs && bs.current) && !(bm && bm.current)) || !ba[PREFIX + "version"]) {
          reply(ev, { type: "backup-status", charId: d.charId, viewId: backupView, request: backupRequest,
            ok: false, error: "La photographie Roll20 ne contient pas une fiche JJK complète." });
          return;
        }
        var propres = {}, bn, totalBackup = 0;
        for (bn in ba) if (Object.prototype.hasOwnProperty.call(ba, bn) && ecrivable(bn)) {
          var boxBackup = ba[bn];
          if (!boxBackup || typeof boxBackup.current !== "string" || typeof boxBackup.max !== "string" ||
              boxBackup.current.length > 950000 || boxBackup.max.length > 950000) {
            reply(ev, { type: "backup-status", charId: d.charId, viewId: backupView, request: backupRequest,
              ok: false, error: "Un attribut dépasse la taille autorisée ou est illisible. Les données Roll20 sont conservées." });
            return;
          }
          propres[bn] = { current: boxBackup.current, max: boxBackup.max };
          totalBackup += bn.length + boxBackup.current.length + boxBackup.max.length;
          if (totalBackup > 20000000) {
            reply(ev, { type: "backup-status", charId: d.charId, viewId: backupView, request: backupRequest,
              ok: false, error: "La photographie dépasse la taille maximale de sauvegarde locale (20 Mo). Les données Roll20 sont conservées." });
            return;
          }
        }
        function epochOf(raw) {
          try { var meta = JSON.parse(raw && raw.current || "{}"); return meta && meta.format === 2 ? String(meta.epoch || "") : ""; }
          catch (e) { return ""; }
        }
        stockageBackupDemandes[backupRequest] = {
          charId: String(d.charId), viewId: backupView,
          fiche: epochOf(propres.jjk_storage), narration: epochOf(propres.jjk_narr_storage), at: Date.now()
        };
        Object.keys(stockageBackupDemandes).forEach(function (key) {
          if (Date.now() - stockageBackupDemandes[key].at > 120000) delete stockageBackupDemandes[key];
        });
        document.dispatchEvent(new CustomEvent("jjk-backup-save", { detail: JSON.stringify({
          request: backupRequest, campaignId: String(bc.id), charId: String(d.charId),
          name: String((bch.get ? bch.get("name") : "") || d.state.name || "Sans nom"),
          state: d.state, attrs: propres, reason: d.reason || "autosave"
        }) }));
        return;
      }
      // le plateau de Narration ne dépend d'aucun personnage CONNU du panneau :
      // c'est justement ce qu'il vient demander, donc avant le filtre charId
      if (d.type === "narration-char") {
        // « pas de plateau » et « campagne pas encore chargée » ne se disent pas
        // pareil : au démarrage, characters est vide pendant une seconde ou
        // deux, et annoncer l'absence ferait afficher un écran d'erreur pour
        // rien (même prudence que has-sheet, qui répond exists:null).
        var nc = narrationChar();
        var rep = { type: "narration-char-result", pret: !!campaign(), charId: null, nom: "" };
        if (nc) {
          rep.charId = nc.id;
          rep.nom = String((nc.get ? nc.get("name") : "") || "");
          var dr = droits(nc);
          rep.gm = dr.gm;
          rep.moi = dr.moi;
          rep.controlledby = dr.controlledby;
          narrId = nc.id;
          // « Réessayer » côté plateau : on repart de zéro. Sans ce mot, la
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
      if (d.type === "presence") {
        if (!lier(ev.source, d.charId, d.viewId)) return;
        presenceTraite(ev, d);
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
        if (!lier(ev.source, d.charId, d.viewId)) return;
        // LA LISTE DES PRÉFIXES DU PLATEAU, envoyée par la page qui les écrit.
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
        // Comme Outward, une ouverture demande une lecture serveur fraîche.
        // Le pont diffuse ensuite un hydrate avec fresh:true ou fresh:false ;
        // aucune réponse d'erreur privée à JJK n'existe dans ce protocole.
        if (d.resync === true) {
          resynchronise(chl);
          return;
        }
        var lecture = readAll(d.charId);
        var omis = d.allege === true ? allege(lecture, ev.source, d.complet === true) : [];
        var rl = { type: "hydrate", charId: d.charId, attrs: lecture, omis: omis };
        // Contrat explicite entre la fiche servie par le site et le pont signé.
        // La fiche bloque son ouverture si la version installée ne sait pas
        // transporter Compact, confirmer les écritures ou relayer les sessions.
        rl.extension = extensionCapacites();
        // CE QUE VAUT CETTE LECTURE, dit avec elle. Seul le plateau est concerné :
        // pour tout autre personnage la fiche est ouverte, donc les attributs
        // chargés, et rien ne change. Le champ est neuf ; une page servie par un
        // site plus ancien l'ignore, comme la fiche l'ignore de toute façon.
        if (d.charId === narrId) {
          var e = etatAttributs(chl);
          rl.sur = e === "sur";
          if (e === "echec") rl.raison = "ouverture";
          // Le ménage attend que la lecture vaille vérité : sur une collection
          // que Roll20 n'a pas encore peuplée, tout paraîtrait absent.
          if (rl.sur) menagePlateau(chl);
          if (menageRapport) { rl.menage = menageRapport; menageRapport = null; }
          // « omis » a déjà été calculé pour la lecture commune ci-dessus.
          // CE PONT-CI SAIT ALLER RECHERCHER. Sa seule présence le dit, comme
          // « omis » dit qu'il sait alléger : devant un pont plus ancien, le
          // champ manque, et la page sait alors que sa demande de
          // resynchronisation n'a été entendue par personne — au lieu de croire
          // qu'elle voit les autres joueurs alors qu'elle relit sa propre copie.
          rl.resync = true;
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

  // La restauration arrive depuis le relais de l'extension par événement DOM.
  // Elle remplace un ÉTAT, pas seulement quelques valeurs : les journaux Compact
  // et les attributs JJK apparus après la sauvegarde doivent donc disparaître.
  // Les attributs jjk_narr_* restent indépendants et ne sont jamais touchés.
  document.addEventListener("jjk-backup-restore", function (ev) {
    var d; try { d = JSON.parse(ev.detail); } catch (e) { return; }
    var snap = d && d.snapshot || {}, c = campaign(), ch = snap.charId && getChar(snap.charId);
    var attrs = snap.attrs, allowed = {}, valid = !!(c && c.id && String(c.id) === String(snap.campaignId) && ch && attrs && typeof attrs === "object");
    if (valid) Object.keys(attrs).forEach(function (name) {
      if (!ecrivable(name) || !attrs[name] || typeof attrs[name] !== "object") { valid = false; return; }
      allowed[name] = { current: str(attrs[name].current), max: str(attrs[name].max) };
    });
    if (!valid || !(allowed[PREFIX + "state"] || allowed[PREFIX + "storage"]) || !allowed[PREFIX + "version"]) {
      document.dispatchEvent(new CustomEvent("jjk-backup-restore-result", { detail: JSON.stringify({ token: d && d.token, ok: false, error: "Sauvegarde incompatible avec ce personnage." }) }));
      return;
    }

    var id = String(snap.charId), started = Date.now(), fini = false, suppression = null;
    function frames(message) {
      for (var i = srcFrames.length - 1; i >= 0; i--) {
        if (srcIds[i] !== id) continue;
        try { srcFrames[i].postMessage(Object.assign({ ns: "jjk", charId: id }, message), "*"); } catch (e) {}
      }
    }
    function termine(ok, error) {
      if (fini) return;
      fini = true;
      frames({ type: "backup-restore-status", ok: ok, error: error || "" });
      document.dispatchEvent(new CustomEvent("jjk-backup-restore-result", { detail: JSON.stringify({ token: d.token, ok: ok, error: error || "" }) }));
    }
    function valeursLocalesConformes() {
      var got = readAll(id), keys = Object.keys(allowed);
      for (var i = 0; i < keys.length; i++) {
        var name = keys[i];
        if (!got[name] || str(got[name].current) !== allowed[name].current || str(got[name].max) !== allowed[name].max) return false;
      }
      return true;
    }
    function ecrituresConfirmees() {
      var keys = Object.keys(allowed);
      for (var i = 0; i < keys.length; i++) {
        var name = keys[i], r = dernieresEcritures[name];
        if (!r || r.serveur !== "accepte" || r.voulu !== allowed[name].current) return false;
      }
      return true;
    }
    function echecEcriture() {
      var keys = Object.keys(allowed);
      for (var i = 0; i < keys.length; i++) {
        var r = dernieresEcritures[keys[i]];
        if (r && r.serveur && r.serveur !== "accepte" && r.serveur !== "en-attente") return "Roll20 a refusé l’écriture de « " + keys[i] + " » (" + r.serveur + (r.detail ? " : " + r.detail : "") + ").";
      }
      return "";
    }
    function retireObsoletes() {
      // Une restauration plus ancienne ne doit pas rejouer des opérations
      // postérieures. Retirer tout attribut JJK absent de la sauvegarde rétablit
      // exactement son espace de stockage, sauf le plateau Narration qui est
      // volontairement indépendant du personnage.
      var ms = models(ch), morts = [];
      for (var i = 0; i < ms.length; i++) {
        var name = attrVal(ms[i], "name");
        if (ecrivable(name) && name.indexOf("jjk_narr_") !== 0 && !Object.prototype.hasOwnProperty.call(allowed, name))
          morts.push(ms[i]);
      }
      var index = 0;
      function suivant() {
        if (index >= morts.length) {
          resynchronise(ch);
          verifierFin();
          return;
        }
        var m = morts[index++], name = attrVal(m, "name");
        // Un autre cadre peut avoir déjà supprimé l'attribut : on ne recommence
        // jamais une suppression et on ne touche pas un nom restauré entre-temps.
        if (!encoreLa(ch, m) || Object.prototype.hasOwnProperty.call(allowed, name)) { suivant(); return; }
        detruit(m, suivant, function (raison) {
          termine(false, "La sauvegarde a été écrite, mais l'ancien attribut « " + name + " » n'a pas pu être retiré : " + raison + ". Rechargez la fiche après vérification des sauvegardes.");
        });
      }
      suivant();
    }
    function verifierFin() {
      if (!valeursLocalesConformes()) {
        if (Date.now() - started > 110000) { termine(false, "Roll20 n'a pas confirmé toutes les valeurs de la sauvegarde."); return; }
        setTimeout(verifierFin, 500); return;
      }
      // Les attributs obsolètes ont été détruits avec succès. Les valeurs restent
      // relues depuis la collection et le serveur a confirmé chaque écriture.
      var restants = models(ch).some(function (m) {
        var name = attrVal(m, "name");
        return ecrivable(name) && name.indexOf("jjk_narr_") !== 0 && !Object.prototype.hasOwnProperty.call(allowed, name);
      });
      if (restants) {
        if (Date.now() - started > 110000) { termine(false, "Certains anciens attributs JJK sont encore présents après restauration."); return; }
        setTimeout(verifierFin, 500); return;
      }
      termine(true, "");
    }
    function verifierEcritures() {
      if (fini) return;
      var refus = echecEcriture();
      if (refus) { termine(false, refus + " Une sauvegarde antérieure reste disponible dans l’extension."); return; }
      if (valeursLocalesConformes() && ecrituresConfirmees()) { retireObsoletes(); return; }
      if (Date.now() - started > 110000) { termine(false, "Roll20 n'a pas confirmé toutes les écritures de restauration. Une sauvegarde antérieure reste disponible."); return; }
      setTimeout(verifierEcritures, 500);
    }

    // Les cadres ouverts sont gelés avant la première écriture : leurs sessions
    // ne doivent pas republier leurs opérations locales pendant la restauration.
    frames({ type: "backup-restore-start" });
    dernieresEcritures = {};
    enqueue(id, allowed);
    verifierEcritures();
  }, false);
})();
