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
      // ouverte — et le pont ouvre justement celle de « Narration ».
      if (mk.set) mk.set(data, { silent: true });
      else { mk.attributes = mk.attributes || {}; mk.attributes.name = data.name; mk.attributes.current = data.current; mk.attributes.max = data.max; }
      sauve(mk, name);
    }
    return relu(tous[0], name, data);
  }

  // CE QUE LE MODÈLE DIT JUSTE APRÈS L'ÉCRITURE. Deux pannes se ressemblent trait
  // pour trait vues du plateau : le modèle n'a pas pris notre valeur, ou il l'a
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

