  // Écriture SILENCIEUSE — indispensable quand la fiche du perso est OUVERTE.
  // Un attribut modifié déclenche sinon onAttribChange -> updateSheetValues de Roll20,
  // qui plante (« u.childWindow.d20 is undefined ») -> la fiche charge à l'infini.
  // Deux précautions :
  //  - set(..., {silent:true}) (et NON .attributes=) : met à jour le suivi de changement
  //    Backbone, si bien que l'écho Firebase de notre écriture voit une valeur IDENTIQUE
  //    -> aucun événement change -> Roll20 ne rafraîchit pas la fiche -> pas de crash ;
  //  - save(null, {silent:true}) persiste dans Firebase (le sync ne dépend pas de silent).
  //
  // Le silence est CONSERVÉ : il n'est pas en cause, et il reste nécessaire dès
  // qu'une fiche de personnage est ouverte à côté pendant qu'on écrit.
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
  // Les attributs ne sont PAS repassés ici : c'est « m.save(null) », et null dit
  // à Backbone d'envoyer l'état courant du modèle, celui que le set juste
  // au-dessus vient d'y poser. Un second argument aurait laissé croire que save
  // écrit ce qu'on lui tend, alors qu'il n'en lit rien.
  //
  // CE QUE LE SERVEUR RÉPOND N'EST PLUS RELEVÉ. Le pont écoutait success et
  // error pour ranger l'issue de chaque écriture — accepté, refusé, exception,
  // aucune réponse — et ce relevé n'avait qu'un lecteur : la trace de dépannage
  // du plateau de Narration, qui n'existe plus. On remplissait donc une table
  // que personne ne lisait. Le jour où MIA voudra savoir si une écriture a été
  // refusée, ce relevé revient AVEC ce qui l'affiche, et pas avant.
  function sauve(m) {
    if (!m || !m.save) return;
    // Le try/catch reste : un save qui lève ne doit pas arrêter la boucle qui
    // écrit les autres homonymes.
    try { m.save(null); } catch (e) {}
  }
  function writeOne(ch, name, v) {
    if (!ecrivable(name)) return;   // double fond : writeOne reste sûr quel que soit l'appelant
    var data = { name: name, current: str(v && v.current), max: str(v && v.max) };
    // On écrit dans TOUS les homonymes : c'est le seul moyen que la relecture
    // rende ce qu'on vient d'écrire, quel que soit celui qu'elle retient. Le
    // ménage, lui, ramène le compte à un — mais il ne s'exécute qu'une fois par
    // chargement, et il peut échouer : cette boucle reste la seule garantie.
    var tous = findAllAttrs(ch, name);
    if (!tous.length) {
      var neuf = ch.attribs.create(data, { silent: true });
      sauve(neuf);
      return;
    }
    for (var k = 0; k < tous.length; k++) {
      var mk = tous[k];
      // On garde le set SILENCIEUX : c'est lui qui évite l'événement change, donc
      // onAttribChange puis updateSheetValues, qui plante quand la fiche du
      // personnage est ouverte à côté.
      if (mk.set) mk.set(data, { silent: true });
      else { mk.attributes = mk.attributes || {}; mk.attributes.name = data.name; mk.attributes.current = data.current; mk.attributes.max = data.max; }
      sauve(mk);
    }
    return;
  }

