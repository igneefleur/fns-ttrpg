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

