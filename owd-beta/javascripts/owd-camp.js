/* Panneau de Camp — le contenu du panneau flottant de Roll20.
 *
 * CE QUE C'EST. Le camp de la troupe : l'heure qu'il est, où l'on se tient, et
 * ce que le froid ou le chaud y fait. Tout le monde voit le même camp, en même
 * temps, et n'importe qui peut avancer l'horloge — comme la feuille de papier
 * qu'on posait au milieu de la table et que tout le monde pouvait tourner vers
 * soi.
 *
 * POURQUOI CE PANNEAU EXISTE. Dans Outward, tout ce qui coûte quelque chose se
 * compte par tranches de DIX MINUTES : les points de repos, la satiété,
 * l'hydratation, l'exposition. Et ce qui décide de la dépense — l'heure, donc
 * le jour ou la nuit, et le milieu, donc la température de l'air — est le même
 * pour toute la troupe. Chacun le tenant dans son coin, la table dérivait :
 * l'un comptait deux heures de marche, l'autre trois, et personne ne savait
 * plus quand la nuit était tombée. Le camp est ce compteur-là, tenu une fois
 * pour tous.
 *
 * CE QUE CE N'EST PAS. Une fiche de personnage, ni un calculateur. Le panneau
 * ne connaît PERSONNE : ni les vêtements, ni les protections, ni l'intensité
 * d'activité de qui que ce soit. Il donne la température de l'air et le repère
 * du corps nu au repos ; chaque joueur y ajoute ses protections et son
 * intensité sur SA fiche, où ces nombres vivent. Rien de ce qui est ici n'a de
 * conséquence automatique sur une fiche : c'est le MJ qui applique.
 *
 * OÙ VIT L'ÉTAT. Dans les Attributes d'un personnage Roll20 nommé « Camp », que
 * le MJ partage à tous les joueurs (c'est le seul objet de la campagne où
 * chacun a lecture ET écriture : un joueur ne peut pas lire la fiche d'un autre
 * joueur). Quatre natures d'attributs, et quatre seulement :
 *
 *   owd_camp_conf     le lieu, en JSON : le milieu, un forçage de température,
 *                     le nom qu'on donne à l'endroit. Cela change rarement, et
 *                     une seule main à la fois y touche : un seul attribut
 *                     convient.
 *   owd_camp_h        L'HORLOGE, « jour,minute ». Les deux nombres ENSEMBLE,
 *                     dans un seul attribut : minuit ne doit jamais s'écrire
 *                     en deux fois. Séparés, le jour partirait avant l'heure,
 *                     et pendant l'aller-retour toute la table lirait une date
 *                     qui n'a jamais existé.
 *   owd_camp_i_<clé>  UNE INSTALLATION du camp (le feu, l'abri, l'eau), « 1 »
 *                     ou vide. Un attribut chacune, et c'est le point : deux
 *                     joueurs allument le feu et montent l'abri dans le même
 *                     geste, or Roll20 n'a pas de transaction — le dernier qui
 *                     écrit gagne. Réunies dans un seul attribut, l'une
 *                     effacerait l'autre.
 *   owd_camp_veille   le nom de qui monte la garde, texte libre.
 *
 * COMMENT ÇA PARLE À ROLL20. Par le pont d20 de l'extension, exactement comme
 * la fiche : postMessage vers window.top, réponses par ev.source. Le pont ne
 * laisse écrire que des attributs « owd_ », et lie une frame au premier
 * personnage qu'elle charge — cette page ne charge donc que « Camp », et ne
 * peut rien écrire ailleurs.
 *
 * FRAÎCHEUR. Le pont ne pousse rien de lui-même : le camp redemande l'état
 * toutes les 1.2 s. Sur une table dont l'heure avance trois fois par heure,
 * personne ne verra la différence avec du temps réel, et rien ne peut
 * s'emballer.
 *
 * CE QUE VAUT UNE LECTURE. Roll20 ne peuple les Attributes d'un personnage qu'à
 * l'ouverture de sa fiche : le pont ouvre donc « Camp » lui-même, hors champ,
 * et dit avec chaque lecture si elle vaut vérité. Tant qu'elle ne vaut rien, le
 * camp ne touche à rien — c'est la règle qui tient tout le reste. L'oublier ne
 * donne pas une panne visible : le panneau montre un camp neuf, la table écrit
 * dessus, et rien ne revient jamais.
 *
 * LES NOMBRES DU LIVRE SONT RECOPIÉS ICI, ET C'EST LE SEUL ENDROIT OÙ ILS LE
 * SONT. Deux tables : les milieux et leurs températures, les quatre intensités
 * et ce qu'elles coûtent en dix minutes. Toutes deux viennent de
 * docs/content/regles/base/capacites-physiques.md, sections « Le climat des
 * milieux » et « L'activité ». LE LIVRE FAIT FOI : le jour où l'une de ces
 * lignes y change, elle change ici dans le même geste, et un panneau qui
 * annoncerait une autre température que le chapitre serait pire qu'un panneau
 * qui n'annonce rien.
 *
 * LES CLASSES CSS PORTENT « oc- », pour « Outward camp ». Pas « owd- » : le
 * préfixe de la fiche, dont la feuille n'est PAS chargée sur cette page, et
 * dont les règles ne doivent jamais paraître s'appliquer ici par mégarde.
 * owd-camp.css est la seule feuille qui habille ce fichier.
 *
 * LA TRACE DE DÉPANNAGE EST ÉTEINTE, ET VOICI COMMENT LA RALLUMER. Allumée,
 * elle écrit « [camp Outward] … » dans la console à chaque changement d'avis,
 * chez chaque joueur et pendant toute la partie : inutilisable pour tout le
 * reste. Pour la rallumer, au choix :
 *
 *   - ajouter « #diag » à l'adresse du panneau. La coquille y pose déjà
 *     l'indice de nuit, l'adresse devient donc « …/roll20-camp.html#n=1&diag » ;
 *   - ou, dans la console du CADRE du panneau (celui de igneefleur.github.io,
 *     pas celui de Roll20) : localStorage.setItem("owd-camp-diag", "1"), puis
 *     rouvrir le panneau. localStorage.removeItem("owd-camp-diag") l'éteint.
 *     C'est le seul des deux qui survive à une réouverture.
 *
 * Par défaut, trace() ne dit RIEN : ni console, ni message vers la fenêtre du
 * haut.
 */
(function () {
  "use strict";

  var NS = "owd";
  var PREF = "owd_camp_";
  var A_CONF = PREF + "conf";
  var A_H = PREF + "h";
  var A_I = PREF + "i_";        // une installation, un attribut chacune
  var A_VEILLE = PREF + "veille";
  var POLL = 1200;              // ms entre deux relectures
  var GARDE = 4000;             // ms pendant lesquelles une écriture locale prime sur l'écho
  var PONT_PAS = 60;            // ms entre deux écritures d'attribut, côté pont
  var ATTENTE_PONT = 2500;      // ms avant de déclarer que Roll20 ne répond pas

  // ---------- les nombres du livre ----------
  // Le pas de TOUT ce qui se compte dans la durée : points de repos, satiété,
  // hydratation, exposition. L'horloge du camp ne connaît pas d'autre unité, et
  // c'est voulu — une minute isolée n'a aucun sens dans ce livre.
  var PAS = 10;
  // « Le jour court de cinq heures du matin à dix heures du soir ; le reste est
  // la nuit. » (Le climat des milieux)
  var JOUR_DEBUT = 5 * 60;
  var JOUR_FIN = 22 * 60;
  // « Un corps nu est à l'aise de 28 à 32 °C. » (Le climat)
  var NU_BAS = 28, NU_HAUT = 32;
  // « un palier par tranche de 4 degrés d'écart entamée » (Le climat)
  var PALIER = 4;

  // Le climat des milieux, table du chapitre, dans son ordre. Les clés ne
  // portent ni accent ni espace : elles s'écrivent dans un Attribute Roll20,
  // que l'onglet Attributes montre en clair, et un joueur finira par les lire.
  var MILIEUX = [
    { cle: "souterrain",  nom: "Souterrain, grotte",       jour:  12, nuit:  12 },
    { cle: "toundra",     nom: "Toundra",                  jour: -10, nuit: -25 },
    { cle: "montagne",    nom: "Montagne enneigée",        jour:  -5, nuit: -15 },
    { cle: "foret-hiver", nom: "Forêt tempérée, en hiver", jour:   3, nuit:  -3 },
    { cle: "plateau",     nom: "Haut plateau",             jour:  12, nuit:   0 },
    { cle: "cote",        nom: "Côte tempérée",            jour:  20, nuit:  14 },
    { cle: "foret-ete",   nom: "Forêt tempérée, en été",   jour:  22, nuit:  12 },
    { cle: "marais",      nom: "Marais chaud",             jour:  28, nuit:  22 },
    { cle: "tropicale",   nom: "Forêt tropicale",          jour:  30, nuit:  24 },
    { cle: "volcanique",  nom: "Terre volcanique",         jour:  40, nuit:  32 },
    { cle: "desert",      nom: "Désert",                   jour:  42, nuit:  18 }
  ];

  // Les quatre intensités, et ce que coûtent DIX MINUTES à chacune. Rappel pur :
  // le panneau ne l'applique à personne, il le pose sous les yeux de la table.
  //   repos    points de repos, gagnés (+) ou perdus (−)  — Les points de repos
  //   ventre   points de satiété ET d'hydratation, perdus — La satiété et l'hydratation
  //   degres   degrés ajoutés à la température            — Le climat
  var INTENSITES = [
    { nom: "Repos",         repos:  3, ventre: 1, degres:  0 },
    { nom: "Légère",        repos: -1, ventre: 1, degres:  5 },
    { nom: "Intermédiaire", repos: -2, ventre: 2, degres: 15 },
    { nom: "Lourde",        repos: -4, ventre: 4, degres: 25 }
  ];

  // Les installations du camp. Elles ne portent AUCUNE règle — le livre ne donne
  // ni bonus de feu ni bonus d'abri — et n'en porteront pas d'elles-mêmes : ce
  // sont des repères de table, comme les jetons qu'on posait au milieu. Le jour
  // où le livre en chiffrera une, le chiffre viendra du livre et se lira ici.
  var INSTALLATIONS = [
    { cle: "feu",  nom: "Le feu",    mis: "allumé", pas: "éteint" },
    { cle: "abri", nom: "L'abri",    mis: "monté",  pas: "à monter" },
    { cle: "eau",  nom: "L'eau",     mis: "à portée", pas: "hors de portée" }
  ];

  // ---------- état ----------
  var charId = null;        // personnage « Camp » (null = pas trouvé)
  var ecrivable = false;    // ce que le pont ANNONCE des droits du joueur
  var refuse = false;       // ce que Roll20 a montré en refusant nos écritures
  // L'ÉTAT LU EST-IL UNE VÉRITÉ ? Roll20 ne peuple les attributs d'un personnage
  // qu'à l'ouverture de sa fiche : avant, la lecture rend du vide qui n'est la
  // vérité de rien. Le pont ouvre donc la fiche lui-même et le dit ici. Faux au
  // départ : on ne sait rien avant d'avoir lu.
  var etatSur = false;
  // Version du FORMAT de la configuration. Elle ne sert qu'à une chose, mais
  // elle y sert vraiment : un camp configuré par une version plus récente passe
  // en lecture seule au lieu de se faire réécrire en silence par un code qui
  // n'en comprend qu'une partie. Le camp n'a ni migrations ni archives,
  // contrairement à la fiche : c'est son seul filet.
  var V_CONF = 1;
  var confFuture = false;
  // Quatre raisons de ne pas toucher au camp, et une seule question à poser : on
  // ne sait pas encore ce qu'il porte, le pont annonce que ce joueur n'a pas la
  // main, Roll20 a refusé nos écritures, ou le camp a été écrit par une version
  // plus récente. La première est la plus importante : avancer l'horloge sur un
  // état qu'on n'a pas lu, c'est écraser le camp de tout le monde.
  function peutPousser() { return etatSur && ecrivable && !refuse && !confFuture; }

  var conf = confVide();
  var horloge = horlogeVide();
  var install = {};         // clé -> true
  var veille = "";
  var attente = {};         // nom d'attribut -> {val, t, marge, avant}
  var lu = false;           // au moins une lecture réussie
  var repondu = false;      // le pont a parlé, même pour dire qu'il n'y a rien
  var vide = 0;             // lectures vides consécutives

  function confVide() {
    return {
      v: V_CONF,
      milieu: "",     // clé d'un MILIEUX, ou "" (pas de milieu choisi)
      degres: null,   // forçage à la main, en °C ; null = la table décide
      lieu: ""        // le nom qu'on donne à l'endroit, texte libre
    };
  }
  // Huit heures du matin du premier jour : une aube, plutôt qu'un minuit qui
  // ferait ouvrir toutes les parties en pleine nuit.
  function horlogeVide() { return { j: 1, m: 8 * 60 }; }

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function entier(v, def) { var n = parseInt(v, 10); return isFinite(n) ? n : def; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function deuxChiffres(n) { return (n < 10 ? "0" : "") + n; }
  // Le degré s'écrit avec l'espace insécable du typographe, et le moins avec le
  // vrai signe : « −10 °C », jamais « -10°C ».
  function degre(n) { return (n < 0 ? "−" + (-n) : String(n)) + " °C"; }

  // ---------- jour / nuit ----------
  // Même règle de priorité que la fiche, et dans le même ordre : le choix
  // mémorisé de ce joueur, puis l'indice n=1/0 du hash (posé par la coquille
  // d'après le réglage owdNuit de l'extension, et ABSENT quand ce réglage vaut
  // « auto »), puis le thème du navigateur.
  //
  // La clé est propre au camp. La fiche a la sienne (« owd-r20-night ») et les
  // deux pages sont servies par la même origine : partager la clé ferait
  // qu'éclairer le camp repeindrait la fiche du même joueur.
  //
  // Et surtout, cette préférence ne va PAS dans owd_camp_conf : c'est un réglage
  // d'affichage, propre à chacun. Dans la configuration partagée, le choix d'un
  // joueur repeindrait l'écran de toute la table, et chaque bascule coûterait
  // une écriture Roll20.
  var NUIT_CLE = "owd-r20-night-camp";
  var NUIT_INDICE = (function () {
    var h = location.hash || "";
    if (/[#&]n=1/.test(h)) return true;
    if (/[#&]n=0/.test(h)) return false;
    try { return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches); }
    catch (e) { return false; }
  })();
  function nuitPref() {
    // localStorage peut manquer dans une iframe tierce dont les cookies sont
    // bloqués : la lecture lève, et le camp doit alors simplement suivre Roll20
    // au lieu de ne pas démarrer.
    try { var v = localStorage.getItem(NUIT_CLE); return v === "1" || v === "0" ? v : "auto"; }
    catch (e) { return "auto"; }
  }
  function nuitActive() { var p = nuitPref(); return p === "1" || (p === "auto" && NUIT_INDICE); }
  function appliqueNuit() {
    var on = nuitActive();
    document.documentElement.classList.toggle("night", on);
    if (btnNuit) {
      var t = on ? "Repasser en mode jour" : "Passer en mode nuit";
      btnNuit.title = t;
      btnNuit.setAttribute("aria-label", t);
      btnNuit.setAttribute("aria-pressed", on ? "true" : "false");
    }
    // ON LE DIT AU CADRE. Le cadre flottant est peint par l'extension, qui ne
    // connaît que son propre réglage ; lui seul ne peut pas deviner qu'un
    // joueur a mis CE panneau en nuit alors que le reste est en jour. Sans ce
    // message, on aurait une barre de titre claire autour d'un camp sombre,
    // c'est-à-dire l'objet cassé en deux. Le canal l'accepte, et le cadre
    // ignore ce qu'il ne comprend pas.
    post({ type: "panneau", nuit: on });
  }
  function poseNuit(v) {
    try {
      if (v === "1" || v === "0") localStorage.setItem(NUIT_CLE, v);
      else localStorage.removeItem(NUIT_CLE);
    } catch (e) {}
    appliqueNuit();
  }
  // Les deux icônes du bouton du site (docs/javascripts/night.js), recopiées :
  // la page ne charge rien d'autre. Laquelle des deux paraît est décidé en CSS
  // pur par html.night, jamais ici.
  var SVG_NUIT =
    '<svg class="oc-croissant" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,10.5L19.61,11.76L20.2,13.74L18.5,12.56L16.8,13.74L17.39,11.76L15.75,10.5L17.81,10.43L18.5,8.5L19.19,10.43L21.25,10.5M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95Z"/></svg>' +
    '<svg class="oc-soleil" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M3.55,19.09L4.96,20.5L6.76,18.71L5.34,17.29M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M20,13H23V11H20M17.24,18.71L19.04,20.5L20.45,19.09L18.66,17.29M20.45,5L19.04,3.5L17.24,5.29L18.66,6.71M13,1H11V4H13M6.76,5.29L4.96,3.5L3.55,4.91L5.34,6.71M1,13H4V11H1M13,20H11V23H13V20Z"/></svg>';

  // ---------- ce que dit l'horloge ----------
  function estJour() { return horloge.m >= JOUR_DEBUT && horloge.m < JOUR_FIN; }
  function heureTexte() {
    var h = Math.floor(horloge.m / 60), mn = horloge.m % 60;
    return deuxChiffres(h) + ":" + deuxChiffres(mn);
  }
  function milieuDe(cle) {
    for (var i = 0; i < MILIEUX.length; i++) { if (MILIEUX[i].cle === cle) return MILIEUX[i]; }
    return null;
  }
  // La température de l'air, ou null quand on ne la sait pas. Le forçage à la
  // main PRIME sur la table : le MJ qui pose « il gèle à pierre fendre » n'a pas
  // à trouver le milieu qui rend ce chiffre-là.
  function degresAir() {
    if (conf.degres != null) return conf.degres;
    var m = milieuDe(conf.milieu);
    if (!m) return null;
    return estJour() ? m.jour : m.nuit;
  }
  // Le repère du CORPS NU AU REPOS, et il faut le lire pour ce qu'il est : le
  // plancher commun, celui de l'exemple du chapitre. Chaque joueur descend sa
  // borne basse de ses protections contre le froid, monte sa borne haute de ses
  // protections contre la chaleur, et ajoute à la température les degrés de son
  // intensité. Le panneau ne connaît aucun de ces trois nombres, et ne doit
  // jamais faire mine de les connaître.
  function repereNu() {
    var t = degresAir();
    if (t == null) return null;
    if (t < NU_BAS) return { sens: "froid", ecart: NU_BAS - t, paliers: Math.ceil((NU_BAS - t) / PALIER) };
    if (t > NU_HAUT) return { sens: "chaud", ecart: t - NU_HAUT, paliers: Math.ceil((t - NU_HAUT) / PALIER) };
    return { sens: "zone", ecart: 0, paliers: 0 };
  }

  // ---------- dialogue avec le pont ----------
  function post(msg) {
    msg.ns = NS;
    try { window.top.postMessage(msg, "*"); } catch (e) {}
  }
  // Le pont d20 n'est injecté par l'extension que sur demande, et rien ne dit
  // qu'une fiche a déjà été ouverte dans cette partie : le camp réclame donc le
  // pont lui-même avant de parler. L'injection est idempotente, le redemander ne
  // coûte rien.
  // « encore » ne part qu'au clic sur Réessayer : il fait recommencer au pont
  // son ouverture de fiche. La demande périodique, elle, ne doit rien relancer,
  // sinon un échec s'effacerait tout seul toutes les douze secondes.
  function demandePerso(encore) {
    post({ type: "need-bridge" });
    post({ type: "camp-char", encore: !!encore });
  }
  // CE QUI APPARTIENT AU CAMP, dit par le camp lui-même. Le pont range les
  // attributs de « Camp » : il retire les restes d'une fiche de personnage
  // ouverte un jour dessus, et dédoublonne les nôtres. Mais il ne peut pas
  // DEVINER lesquels sont les nôtres — et un critère gravé dans un paquet signé
  // condamnerait tout nom qu'on se mettrait à écrire plus tard, puisque cette
  // page-ci change sans signature. On envoie donc le préfixe, et le pont ne
  // détruit rien sans lui.
  //
  // UN SEUL PRÉFIXE SUFFIT, et il les couvre tous : owd_camp_conf, owd_camp_h,
  // owd_camp_i_… et owd_camp_veille commencent tous par « owd_camp_ ». Un nom
  // futur qui ne commencerait pas par là serait détruit au chargement suivant,
  // en silence : toute addition se nomme donc sous ce préfixe, sans exception.
  var MENAGE_GARDE = [PREF];
  function demandeEtat() {
    if (!charId) return;
    // Pas d'allègement demandé, et ce n'est pas un oubli : le camp n'écrit
    // aucun gros attribut — pas d'image, pas de fond — et l'allègement du pont
    // n'existe que pour ceux-là. Le jour où le camp porterait une carte
    // importée, c'est ici que « allege: true » se poserait, et il faudrait alors
    // reprendre « omis » à la lecture.
    post({ type: "load", charId: charId, menageGarde: MENAGE_GARDE });
  }
  // Une écriture = un lot d'attributs. On note ce qu'on vient d'écrire : l'écho
  // met un aller-retour à revenir, et sans cette note la relecture suivante
  // remettrait l'horloge où elle était avant notre geste.
  function ecrire(attrs) {
    if (!charId || !peutPousser()) return;
    var lot = {}, t = Date.now();
    var noms = Object.keys(attrs);
    // Le pont écrit un attribut à la fois, espacés : le dernier d'un gros lot
    // n'arrive chez Roll20 que bien après le premier. La garde qui protège nos
    // valeurs de l'écho périmé doit donc tenir compte de la LONGUEUR du lot.
    var marge = GARDE + noms.length * PONT_PAS;
    noms.forEach(function (n) {
      var v = String(attrs[n] == null ? "" : attrs[n]);
      lot[n] = { current: v, max: "" };
      // « avant » : la valeur que Roll20 nous avait donnée juste avant qu'on
      // écrive. Si la valeur qui revient lui est ÉGALE, notre écriture n'a pas
      // pris ; si elle en diffère, c'est quelqu'un d'autre qui a écrit. Sans ce
      // repère, les deux pannes se ressemblent trait pour trait.
      attente[n] = { val: v, t: t, marge: marge, avant: (dernierLu[n] == null ? null : dernierLu[n]) };
    });
    post({ type: "save", charId: charId, attrs: lot });
    rend();
  }

  window.addEventListener("message", function (ev) {
    try {
      var d = ev.data;
      if (!d || d.ns !== NS) return;
      // Le pont vit dans la fenêtre du haut de Roll20 : ses réponses en
      // viennent, et de nulle part ailleurs. Sans ce contrôle, n'importe quelle
      // frame de la page (un mod, par exemple) pourrait faire pointer le camp
      // sur un autre personnage.
      if (ev.source !== window.top) return;
      if (d.type === "camp-char-result") {
        repondu = true;
        if (!d.charId) {
          charId = null;
          // « pas de camp » ne se dit que si la campagne est chargée : au
          // démarrage, Roll20 met une seconde ou deux à peupler ses
          // personnages, et l'annoncer alors afficherait un écran d'erreur qui
          // ne partirait plus.
          if (d.pret !== false) montreEtat("absent");
          return;
        }
        // LE PERSONNAGE A CHANGÉ : ON REPART DE ZÉRO. Le MJ qui suit la consigne
        // « aucun camp dans cette campagne » supprime et recrée « Camp » ; deux
        // personnages du même nom suffisent aussi à faire changer d'avis la
        // recherche quand la collection se retrie. Chez un joueur dont le
        // panneau est déjà ouvert, le nouvel identifiant remplacerait l'ancien
        // SANS rien remettre à zéro : le camp garderait l'horloge, le lieu et
        // les attentes de l'ancien personnage, se croirait sûr de ce qu'il n'a
        // jamais lu, et pourrait écrire par-dessus le camp neuf.
        if (charId && d.charId !== charId) {
          etatSur = false; lu = false; vide = 0; perdues = 0; refuse = false;
          confFuture = false; conf = confVide(); horloge = horlogeVide();
          install = {}; veille = ""; attente = {}; dernierLu = {};
          montreEtat("attente");
        }
        charId = d.charId;
        ecrivable = jugeDroits(d);
        // le personnage est trouvé : ces deux écrans-là n'ont plus lieu d'être.
        // Les autres disent l'état de la LECTURE, que seule la lecture peut lever.
        if (etatMontre === "absent" || etatMontre === "pont") montreEtat(null);
        demandeEtat();
      } else if (d.type === "hydrate" && d.charId === charId) {
        applique(d.attrs || {}, d);
      }
    } catch (e) {}
  }, false);

  // Le pont ne rend que la matière : qui je suis, si je suis MJ, et la liste
  // brute des contrôleurs du personnage. La conclusion se tire ICI, côté site,
  // pour que le jour où Roll20 renomme un de ces globaux la réparation soit un
  // déploiement et non une signature. Sans matière du tout (vieux pont), on
  // laisse essayer : une écriture refusée se verra, et le camp le dira.
  function jugeDroits(d) {
    if (d.gm === undefined && d.controlledby === undefined) return d.ecrivable !== false;
    if (d.gm === true) return true;
    var l = String(d.controlledby || "").split(",").map(function (x) { return x.replace(/\s+/g, ""); });
    if (l.indexOf("all") >= 0) return true;
    return !!d.moi && l.indexOf(String(d.moi)) >= 0;
  }

  // ---------- lecture de l'état ----------
  // Un attribut revenu de Roll20 ne prime pas toujours : il perd contre une
  // écriture toute fraîche qui n'a pas encore fait l'aller-retour. Passé le
  // délai de garde, il reprend la main (notre écriture s'est perdue, ou
  // quelqu'un a poussé la même chose).
  //
  // UNE PERTE PAR LOT, ET NON PAR ATTRIBUT. Une écriture peut porter plusieurs
  // attributs d'un coup ; si deux joueurs touchent au camp dans la foulée, deux
  // de ces attributs reviennent différents, le compteur monterait de deux d'un
  // seul coup, et le camp se déclarerait refusé DÉFINITIVEMENT sur un conflit
  // parfaitement normal. On ne compte donc qu'une perte pour un même instant
  // d'écriture.
  var perdues = 0;
  var dernierePerte = 0;
  // Ce que Roll20 disait à la dernière lecture, attribut par attribut.
  var dernierLu = {};
  function retenu(nom, distant) {
    var a = attente[nom];
    if (!a) return false;
    // Une écriture qui REVIENT prouve que Roll20 accepte : le refus se lève.
    // Sans cela, un seul conflit passager condamnerait le camp jusqu'au
    // rechargement, et le joueur n'aurait aucun moyen de le savoir.
    if (a.val === distant) {
      delete attente[nom];
      perdues = 0; refuse = false;
      return false;
    }
    if (Date.now() - a.t < (a.marge || GARDE)) return true;
    delete attente[nom];
    // Notre écriture n'est jamais revenue. Une fois, c'est quelqu'un qui a
    // touché à la même chose en même temps ; deux fois de suite, c'est que
    // Roll20 refuse nos écritures (le personnage n'est pas partagé avec ce
    // joueur, ou le pronostic du pont s'est trompé). On le DIT plutôt que de
    // laisser l'horloge revenir en arrière sans explication.
    if (a.t !== dernierePerte) {
      dernierePerte = a.t;
      if (++perdues >= 2) { refuse = true; perdues = 0; }
      trace("ecriture perdue", { attribut: nom, attendu: a.val, recu: distant,
                                 avant: a.avant,
                                 verdict: (a.avant != null && String(distant) === String(a.avant))
                                   ? "notre écriture n'a pas pris"
                                   : "un autre a écrit (ou valeur inconnue)" });
    }
    return false;
  }

  // SONDE DE DÉPANNAGE. Le camp vit dans un iframe d'une autre origine : ni la
  // page Roll20 ni une sonde collée dans sa console ne peuvent lire ces
  // variables, et le message « hydrate » est adressé au panneau, pas à la
  // fenêtre du haut. Sans cette trace, un joueur qui constate une panne n'a
  // aucun moyen de dire ce que son camp a vu.
  //
  // Elle n'écrit rien et ne change rien. ÉTEINTE PAR DÉFAUT : deux lignes par
  // seconde dans la console de chaque joueur pendant toute une partie, c'est une
  // console inutilisable pour tout le reste. Les deux façons de la rallumer sont
  // en tête de fichier ; DIAG est lu une seule fois, au chargement, pour qu'une
  // partie ne puisse pas se mettre à parler en cours de route.
  var DIAG = (function () {
    if (/[#&]diag\b/.test(location.hash || "")) return true;
    try { return localStorage.getItem("owd-camp-diag") === "1"; } catch (e) { return false; }
  })();
  var traceQuoi = "", traceQuand = 0;
  function trace(ou, sup) {
    if (!DIAG) return;
    try {
      var e = { ou: ou, charId: charId, ecrivable: ecrivable, etatSur: etatSur,
                refuse: refuse, confFuture: confFuture, lu: lu, vide: vide,
                perdues: perdues, attentes: Object.keys(attente).length,
                jour: horloge.j, minute: horloge.m, milieu: conf.milieu,
                ecran: etatMontre };
      var k;
      for (k in (sup || {})) { if (sup.hasOwnProperty(k)) { e[k] = sup[k]; } }
      var sig = JSON.stringify(e);
      var t = Date.now();
      if (sig === traceQuoi && t - traceQuand < 10000) return;
      traceQuoi = sig; traceQuand = t;
      if (window.console && console.log) { console.log("[camp Outward] " + sig); }
      // ET ON LA FAIT REMONTER. Les messages de console d'un iframe d'une autre
      // origine n'apparaissent pas dans celle de Roll20 sans aller sélectionner
      // le cadre à la main, ce que personne n'a envie de faire pour signaler une
      // panne. « owd-diag » et non « owd » : le pont ne doit jamais confondre
      // ceci avec un ordre — il ignore tout ce qui ne porte pas son propre nom.
      try { (window.top || window).postMessage({ ns: "owd-diag", ligne: sig }, "*"); } catch (e2) {}
    } catch (err) {}
  }

  // Ce que le pont a rangé sur le personnage du camp, transmis avec une lecture.
  // Rien à faire de ces nombres à l'écran : ils ne parlent qu'au dépannage, et
  // un panneau qui annoncerait « 3 attributs retirés » inquiéterait pour rien.
  function ditMenage(d) {
    if (!d || !d.menage) return;
    trace("menage", { menage: d.menage });
  }

  function brut(attrs, nom) {
    var a = attrs[nom];
    if (!a) return "";
    return String(a.current == null ? "" : a.current);
  }

  function litConf(s) {
    if (!s) return confVide();
    var o = null;
    try { o = JSON.parse(s); } catch (e) { o = null; }
    if (!o || typeof o !== "object") return confVide();
    // UNE CONFIGURATION VENUE DU FUTUR NE SE RÉÉCRIT PAS. On la montre telle
    // qu'on la comprend, et on passe en lecture seule : réécrire ce qu'on ne
    // comprend qu'à moitié effacerait ce qu'une version plus récente y a mis.
    confFuture = entier(o.v, V_CONF) > V_CONF;
    var c = confVide();
    if (typeof o.milieu === "string" && milieuDe(o.milieu)) c.milieu = o.milieu;
    // Le forçage est un DEGRÉ, pas un texte : une valeur qui n'est pas un nombre
    // vaut « pas de forçage », et non zéro — qui serait un froid mordant.
    if (o.degres != null && isFinite(parseInt(o.degres, 10))) {
      c.degres = clamp(entier(o.degres, 0), -120, 120);
    }
    if (typeof o.lieu === "string") c.lieu = o.lieu.slice(0, 80);
    c.v = entier(o.v, V_CONF);
    return c;
  }
  function ecritConf(c) {
    // La version écrite est TOUJOURS la nôtre : on n'a pas le droit de repasser
    // pour une version qu'on n'est pas. Et l'on n'écrit jamais quand la
    // configuration lue vient du futur — peutPousser() s'en charge, ecrire() le
    // refusera.
    return JSON.stringify({ v: V_CONF, milieu: c.milieu, degres: c.degres, lieu: c.lieu });
  }
  // « jour,minute ». Un seul attribut, les deux nombres ensemble : voir l'en-tête.
  function litHorloge(s) {
    var m = /^(-?\d{1,6}),(-?\d{1,5})$/.exec(String(s || ""));
    if (!m) return horlogeVide();
    var j = clamp(entier(m[1], 1), 1, 999999);
    var mn = clamp(entier(m[2], 0), 0, 24 * 60 - 1);
    // Les minutes retombent sur le pas de dix : une valeur tapée à la main dans
    // l'onglet Attributes de Roll20 ne doit pas faire dériver l'horloge d'un
    // pas qui n'existe pas dans le livre.
    mn = Math.floor(mn / PAS) * PAS;
    return { j: j, m: mn };
  }
  function ecritHorloge(h) { return h.j + "," + h.m; }

  function applique(attrs, d) {
    ditMenage(d);
    trace("lecture", { pontSur: (d && d.sur), pontRaison: (d && d.raison),
                       nbAttrs: attrs ? Object.keys(attrs).length : 0 });
    try {
      var _k, _a = attrs || {};
      for (_k in _a) { if (_a.hasOwnProperty(_k)) { dernierLu[_k] = brut(_a, _k); } }
    } catch (e) {}
    // « JE NE SAIS PAS ENCORE » N'EST PAS « C'EST VIDE ». Roll20 ne peuple les
    // Attributes d'un personnage qu'à l'ouverture de sa fiche, et le camp est
    // justement lu sans que personne n'ouvre celle de « Camp » : tant que le
    // pont ne l'a pas ouverte, ce qu'il rend n'est la vérité de rien. Le prendre
    // pour l'état remettrait l'horloge de toute la table au premier jour à huit
    // heures, et les écritures parties là-dessus ne reviendraient jamais. On ne
    // touche donc à RIEN tant que ce n'est pas sûr : ni lieu, ni horloge, ni
    // verdict de refus.
    var dit = !!d && d.sur !== undefined;
    if (dit && d.sur !== true) {
      etatSur = false;
      lu = false;
      vide = 0;
      // nos écritures ne peuvent pas revenir d'un personnage que Roll20 ne lit
      // pas encore : ce ne sont pas des pertes, et elles ne prouvent aucun refus
      attente = {};
      perdues = 0;
      montreEtat(d.raison ? "ouverture" : "attente");
      return;
    }
    var rien = true;
    Object.keys(attrs).forEach(function (n) { if (n.indexOf(PREF) === 0) rien = false; });
    // Une lecture vide n'efface pas un camp sur un coup de tête : cinq
    // d'affilée, au cas où il aurait vraiment été vidé à la main. Et la règle
    // vaut dès la PREMIÈRE lecture quand le pont est trop ancien pour ouvrir la
    // fiche — c'est tout ce qu'on peut faire pour lui sans extension à jour ;
    // un pont récent, lui, a déjà répondu de ce vide-là.
    if (rien && (lu || !dit)) {
      if (++vide < 5) {
        if (!lu) montreEtat("attente");   // rien de lu : pas de camp à montrer
        return;
      }
    } else {
      vide = 0;
    }
    lu = true;
    // On sait, maintenant.
    etatSur = true;
    montreEtat(null);

    var sConf = brut(attrs, A_CONF);
    if (!retenu(A_CONF, sConf)) conf = litConf(sConf);

    var sH = brut(attrs, A_H);
    if (!retenu(A_H, sH)) horloge = litHorloge(sH);

    var sV = brut(attrs, A_VEILLE);
    if (!retenu(A_VEILLE, sV)) veille = sV.slice(0, 40);

    // Les installations. Une par attribut, et l'on ne retient QUE les clés que
    // ce code connaît : un attribut owd_camp_i_ inventé ailleurs ne doit pas
    // faire pousser une case fantôme dans le panneau.
    var neuf = {};
    for (var i = 0; i < INSTALLATIONS.length; i++) {
      var cle = INSTALLATIONS[i].cle, nom = A_I + cle;
      var s = brut(attrs, nom);
      if (retenu(nom, s)) { if (install[cle]) neuf[cle] = true; continue; }
      if (s === "1") neuf[cle] = true;
    }
    install = neuf;

    rend();
  }

  // ---------- les gestes ----------
  // Avancer l'horloge. Le pas de dix minutes est celui du livre : rien ici n'en
  // connaît d'autre, et un pas de sept minutes ne voudrait rien dire.
  function avance(minutes) {
    if (!peutPousser()) return;
    var total = horloge.j * 24 * 60 + horloge.m + minutes;
    // On ne remonte jamais avant le premier jour à minuit : une horloge
    // négative rendrait une date que rien ne sait écrire.
    var plancher = 1 * 24 * 60;
    if (total < plancher) total = plancher;
    var h = { j: Math.floor(total / (24 * 60)), m: total % (24 * 60) };
    h.m = Math.floor(h.m / PAS) * PAS;
    horloge = h;
    var lot = {};
    lot[A_H] = ecritHorloge(h);
    ecrire(lot);
  }
  function poseConf(champ, valeur) {
    if (!peutPousser()) return;
    var c = { v: V_CONF, milieu: conf.milieu, degres: conf.degres, lieu: conf.lieu };
    c[champ] = valeur;
    conf = c;
    var lot = {};
    lot[A_CONF] = ecritConf(c);
    ecrire(lot);
  }
  function bascule(cle) {
    if (!peutPousser()) return;
    var on = !install[cle];
    if (on) install[cle] = true; else delete install[cle];
    var lot = {};
    lot[A_I + cle] = on ? "1" : "";
    ecrire(lot);
  }
  function poseVeille(s) {
    if (!peutPousser()) return;
    veille = String(s || "").slice(0, 40);
    var lot = {};
    lot[A_VEILLE] = veille;
    ecrire(lot);
  }

  // ---------- l'écran ----------
  // LE PANNEAU SE BÂTIT UNE FOIS, ET SE REMPLIT ENSUITE. C'est le choix qui
  // décide de tout le reste : reconstruire les nœuds à chaque lecture — donc
  // toutes les 1.2 s — arracherait le curseur du champ où le MJ est en train
  // d'écrire le nom du lieu, et déroberait les boutons sous le doigt. rend()
  // n'écrit donc que des valeurs, jamais de structure, et laisse tranquille tout
  // champ qui a le focus.
  var racine = null, btnNuit = null;
  var elLieu = null, elMilieu = null, elDegres = null, elVeille = null;
  var elJour = null, elHeure = null, elMoment = null, elAir = null, elRepere = null;
  var elBandeau = null, elVersion = null;
  var elsInstall = {};

  function bati() {
    racine = document.getElementById("camp-panneau");
    if (!racine) return;
    racine.textContent = "";
    racine.className = "oc-camp";

    // --- la tête : l'heure, le moment, le bouton de nuit ---
    var tete = el("div", "oc-tete");
    var date = el("div", "oc-date");
    elJour = el("span", "oc-jour", "");
    elHeure = el("span", "oc-heure", "");
    date.appendChild(elJour);
    date.appendChild(elHeure);
    tete.appendChild(date);
    elMoment = el("span", "oc-moment", "");
    tete.appendChild(elMoment);

    btnNuit = el("button", "oc-nuit");
    btnNuit.type = "button";
    // Les deux icônes sont recopiées du bouton du site, et posées en innerHTML
    // parce qu'un SVG ne se construit pas au createElement sans namespace. La
    // chaîne est une CONSTANTE de ce fichier, jamais rien qui vienne de Roll20
    // ni d'un attribut : aucune donnée n'y entre.
    btnNuit.innerHTML = SVG_NUIT;
    btnNuit.addEventListener("click", function () {
      // Trois états, comme sur le site : la préférence bascule entre « jour » et
      // « nuit », et « auto » n'est qu'un point de départ.
      poseNuit(nuitActive() ? "0" : "1");
    });
    tete.appendChild(btnNuit);
    racine.appendChild(tete);

    // --- le bandeau d'avertissement (lecture seule, refus…) ---
    elBandeau = el("div", "oc-bandeau");
    elBandeau.hidden = true;
    racine.appendChild(elBandeau);

    // --- l'horloge ---
    var bloc = el("section", "oc-bloc");
    bloc.appendChild(el("h2", "oc-titre", "L'horloge"));
    var pas = el("div", "oc-pas");
    // Les quatre pas qui servent à une table : la tranche du livre, l'heure, la
    // veille de garde, la nuit de sommeil. Le pas en arrière existe pour
    // rattraper un clic de trop, pas pour remonter le temps.
    [
      { t: "−10 min", m: -PAS, cls: "oc-arriere" },
      { t: "+10 min", m: PAS },
      { t: "+1 h", m: 60 },
      { t: "+4 h", m: 240 },
      { t: "+8 h", m: 480 }
    ].forEach(function (p) {
      var b = el("button", "oc-btn" + (p.cls ? " " + p.cls : ""), p.t);
      b.type = "button";
      b.addEventListener("click", function () { avance(p.m); });
      pas.appendChild(b);
    });
    bloc.appendChild(pas);
    racine.appendChild(bloc);

    // --- le lieu ---
    var bl = el("section", "oc-bloc");
    bl.appendChild(el("h2", "oc-titre", "Le lieu"));

    var lg = el("label", "oc-ligne");
    lg.appendChild(el("span", "oc-lib", "Nom"));
    elLieu = document.createElement("input");
    elLieu.type = "text";
    elLieu.className = "oc-champ";
    elLieu.maxLength = 80;
    elLieu.placeholder = "au bord du gué…";
    // « change » et non « input » : une écriture Roll20 par frappe étoufferait
    // la liaison, et le camp entier se figerait le temps d'une phrase.
    elLieu.addEventListener("change", function () { poseConf("lieu", elLieu.value.slice(0, 80)); });
    lg.appendChild(elLieu);
    bl.appendChild(lg);

    var lm = el("label", "oc-ligne");
    lm.appendChild(el("span", "oc-lib", "Milieu"));
    elMilieu = document.createElement("select");
    elMilieu.className = "oc-champ";
    var o0 = document.createElement("option");
    o0.value = "";
    o0.textContent = "— aucun —";
    elMilieu.appendChild(o0);
    MILIEUX.forEach(function (m) {
      var o = document.createElement("option");
      o.value = m.cle;
      o.textContent = m.nom;
      elMilieu.appendChild(o);
    });
    elMilieu.addEventListener("change", function () { poseConf("milieu", elMilieu.value); });
    lm.appendChild(elMilieu);
    bl.appendChild(lm);

    var ld = el("label", "oc-ligne");
    ld.appendChild(el("span", "oc-lib", "Forçage"));
    elDegres = document.createElement("input");
    elDegres.type = "number";
    elDegres.className = "oc-champ oc-court";
    elDegres.min = "-120";
    elDegres.max = "120";
    elDegres.step = "1";
    elDegres.placeholder = "°C";
    elDegres.addEventListener("change", function () {
      var v = elDegres.value.replace(/\s+/g, "");
      // Vide = pas de forçage, et surtout pas zéro : le milieu reprend la main.
      poseConf("degres", v === "" ? null : clamp(entier(v, 0), -120, 120));
    });
    ld.appendChild(elDegres);
    bl.appendChild(ld);
    racine.appendChild(bl);

    // --- la température ---
    var bt = el("section", "oc-bloc");
    bt.appendChild(el("h2", "oc-titre", "L'air"));
    elAir = el("div", "oc-air", "");
    bt.appendChild(elAir);
    elRepere = el("p", "oc-repere", "");
    bt.appendChild(elRepere);
    bt.appendChild(el("p", "oc-note",
      "Repère du corps nu au repos, zone 28 à 32 °C. Chacun descend sa borne "
      + "basse de ses protections contre le froid, monte sa borne haute de ses "
      + "protections contre la chaleur, et ajoute à l'air les degrés de son "
      + "intensité."));
    racine.appendChild(bt);

    // --- ce que coûtent dix minutes ---
    var bc = el("section", "oc-bloc");
    bc.appendChild(el("h2", "oc-titre", "Dix minutes"));
    var tab = el("table", "oc-table");
    var thead = el("thead");
    var tr = el("tr");
    ["Intensité", "Repos", "Ventre", "Degrés"].forEach(function (t) {
      tr.appendChild(el("th", null, t));
    });
    thead.appendChild(tr);
    tab.appendChild(thead);
    var tb = el("tbody");
    INTENSITES.forEach(function (it) {
      var l = el("tr");
      l.appendChild(el("td", "oc-nom", it.nom));
      // Le repos se GAGNE au repos et se PERD ailleurs : le signe est porté à
      // l'écran, faute de quoi la colonne se lirait à l'envers une fois sur deux.
      l.appendChild(el("td", null, (it.repos > 0 ? "+" : "−") + Math.abs(it.repos)));
      l.appendChild(el("td", null, "−" + it.ventre));
      l.appendChild(el("td", null, "+" + it.degres));
      tb.appendChild(l);
    });
    tab.appendChild(tb);
    bc.appendChild(tab);
    bc.appendChild(el("p", "oc-note",
      "Le ventre compte pour la satiété comme pour l'hydratation. Les degrés "
      + "s'ajoutent à l'air avant de mesurer l'écart à la zone."));
    racine.appendChild(bc);

    // --- le camp ---
    var bi = el("section", "oc-bloc");
    bi.appendChild(el("h2", "oc-titre", "Le camp"));
    var grille = el("div", "oc-grille");
    INSTALLATIONS.forEach(function (it) {
      var b = el("button", "oc-case");
      b.type = "button";
      var n = el("span", "oc-case-nom", it.nom);
      var e = el("span", "oc-case-etat", it.pas);
      b.appendChild(n);
      b.appendChild(e);
      b.addEventListener("click", function () { bascule(it.cle); });
      elsInstall[it.cle] = { btn: b, etat: e, def: it };
      grille.appendChild(b);
    });
    bi.appendChild(grille);

    var lv = el("label", "oc-ligne");
    lv.appendChild(el("span", "oc-lib", "Qui veille"));
    elVeille = document.createElement("input");
    elVeille.type = "text";
    elVeille.className = "oc-champ";
    elVeille.maxLength = 40;
    elVeille.placeholder = "personne";
    elVeille.addEventListener("change", function () { poseVeille(elVeille.value); });
    lv.appendChild(elVeille);
    bi.appendChild(lv);
    racine.appendChild(bi);

    // --- le pied ---
    elVersion = el("div", "oc-pied", "");
    racine.appendChild(elVersion);
  }

  // Le champ qu'on est en train de remplir ne se fait pas réécrire sous les
  // doigts par une lecture qui arrive : c'est toute la raison du rendu en deux
  // temps. Sans cette garde, écrire le nom du lieu serait impossible — la
  // relecture le remplacerait toutes les 1.2 s par ce que Roll20 en sait.
  function pose(champ, valeur) {
    if (!champ) return;
    if (document.activeElement === champ) return;
    if (champ.value !== valeur) champ.value = valeur;
  }

  function rend() {
    if (!racine || etatMontre) return;

    elJour.textContent = "Jour " + horloge.j;
    elHeure.textContent = heureTexte();
    elMoment.textContent = estJour() ? "le jour" : "la nuit";
    racine.classList.toggle("oc-nuit-jeu", !estJour());

    pose(elLieu, conf.lieu);
    pose(elMilieu, conf.milieu);
    pose(elDegres, conf.degres == null ? "" : String(conf.degres));
    pose(elVeille, veille);

    var t = degresAir();
    var m = milieuDe(conf.milieu);
    if (t == null) {
      elAir.textContent = "—";
      elAir.className = "oc-air";
      elRepere.textContent = "Choisir un milieu, ou forcer une température.";
    } else {
      elAir.textContent = degre(t);
      var r = repereNu();
      elAir.className = "oc-air oc-air-" + r.sens;
      if (r.sens === "zone") {
        elRepere.textContent = "Dans la zone : aucun palier.";
      } else {
        elRepere.textContent = r.paliers + " palier" + (r.paliers > 1 ? "s" : "")
          + " de " + r.sens + " — " + r.ecart + " degré" + (r.ecart > 1 ? "s" : "") + " d'écart.";
      }
      // D'où vient ce chiffre : la table, ou la main du MJ. Un panneau qui
      // afficherait « 42 °C » sans dire lequel des deux laisserait la table se
      // demander pourquoi le désert ne refroidit pas la nuit.
      if (conf.degres != null) {
        elRepere.textContent += " Température forcée.";
      } else if (m) {
        elRepere.textContent += " " + m.nom + ", " + (estJour() ? "le jour" : "la nuit") + ".";
      }
    }

    INSTALLATIONS.forEach(function (it) {
      var n = elsInstall[it.cle];
      if (!n) return;
      var on = !!install[it.cle];
      n.btn.classList.toggle("oc-case-on", on);
      n.btn.setAttribute("aria-pressed", on ? "true" : "false");
      n.etat.textContent = on ? it.mis : it.pas;
    });

    // Ce qui empêche d'écrire, dit en une phrase. L'ordre compte : la raison la
    // plus profonde d'abord, sinon on annoncerait « lecture seule » à un joueur
    // dont le camp n'est simplement pas encore lu.
    var mot = "";
    if (!etatSur) mot = "Lecture du camp en cours.";
    else if (confFuture) mot = "Ce camp a été réglé par une version plus récente du site : lecture seule.";
    else if (!ecrivable) mot = "Le personnage « Camp » n'est pas partagé avec ce joueur : lecture seule.";
    else if (refuse) mot = "Roll20 a refusé les dernières écritures : lecture seule.";
    elBandeau.textContent = mot;
    elBandeau.hidden = !mot;
    racine.classList.toggle("oc-fige", !peutPousser());

    // La release publiée, prise au manifeste s'il est là. Le camp n'a ni
    // schéma ni migrations : il ne porte que ce numéro-là, et seulement pour
    // qu'un joueur puisse le dire en signalant une panne.
    var rel = "";
    try {
      var mf = window.__owdManifeste;
      if (mf && typeof mf.release === "string") rel = mf.release;
    } catch (e) {}
    elVersion.textContent = rel ? "Fiche Outward " + rel : "";
  }

  // ---------- les écrans d'état ----------
  var etatMontre = null;
  function montreEtat(quoi) {
    // un message peut arriver avant le premier rendu : rien à montrer, et
    // surtout rien à effacer
    if (!racine) return;
    // Le camp redemande son personnage tant qu'il ne l'a pas : sans cette garde,
    // l'écran d'attente se reconstruirait toutes les 1.2 s et le bouton se
    // déroberait sous le doigt.
    if (quoi === etatMontre) return;
    etatMontre = quoi;
    var vieux = racine.querySelector(".oc-etat");
    if (vieux) racine.removeChild(vieux);
    racine.classList.toggle("oc-masque", !!quoi);
    if (!quoi) { rend(); return; }
    var e = el("div", "oc-etat");
    if (quoi === "absent") {
      e.appendChild(el("div", "oc-etat-titre", "Aucun camp dans cette campagne"));
      e.appendChild(el("div", "oc-etat-detail",
        "Le MJ crée un personnage nommé exactement « Camp », le met dans le journal "
        + "des joueurs, et le rend modifiable et contrôlable par tous les joueurs."));
    } else if (quoi === "pont") {
      e.appendChild(el("div", "oc-etat-titre", "Roll20 ne répond pas"));
      e.appendChild(el("div", "oc-etat-detail",
        "Le camp n'a pas trouvé le pont de l'extension. Recharger la partie suffit d'ordinaire."));
    } else if (quoi === "attente") {
      // Le temps que Roll20 charge les attributs du personnage. Deux secondes en
      // général, et rien à faire pendant : pas de bouton, pas d'explication.
      e.appendChild(el("div", "oc-etat-titre", "Lecture du camp…"));
    } else if (quoi === "ouverture") {
      // Le pont n'a pas réussi à ouvrir la fiche « Camp », donc les attributs
      // restent illisibles. Le dire pour ce que c'est : ce n'est pas Roll20 qui
      // refuse d'écrire, c'est l'état qu'on n'a pas pu lire.
      e.appendChild(el("div", "oc-etat-titre", "Camp illisible"));
      e.appendChild(el("div", "oc-etat-detail", ecrivable
        ? "Ouvrir une fois le personnage « Camp » dans le journal."
        : "Ce personnage n'est pas partagé avec ce joueur."));
    }
    if (quoi !== "attente") {
      var b = el("button", "oc-btn oc-btn-fort", "Réessayer");
      b.type = "button";
      b.addEventListener("click", function () { montreEtat(null); demandePerso(true); });
      e.appendChild(b);
    }
    racine.appendChild(e);
  }

  // ---------- amorce ----------
  function demarre() {
    bati();
    if (!racine) return;
    // Le châssis accepte qu'une page se NOMME elle-même : le titre appartient à
    // la page, donc le renommer ne coûte pas une signature. On ne pousse en
    // revanche NI largeur NI hauteur : le châssis les range, et les imposer à
    // chaque chargement écraserait la taille choisie par le joueur.
    post({ type: "panneau", titre: "Camp" });
    // ET LA NUIT PASSE PAR appliqueNuit(), jamais par un post écrit à la main.
    // L'amorceur gelé a déjà posé la classe sur <html> avant le premier rendu,
    // si bien qu'un panneau qui se contenterait de dire sa nuit au cadre
    // PARAÎTRAIT juste : c'est le bouton qui resterait muet, sans titre ni
    // aria-pressed, jusqu'au premier clic. Un seul chemin, et il fait les trois.
    appliqueNuit();
    // Un camp vide tant qu'on n'a rien lu serait un mensonge : on ne le montre
    // qu'une fois qu'on sait ce qu'il porte.
    montreEtat("attente");
    demandePerso();
    // « Roll20 ne répond pas » ne vaut que si le pont n'a RIEN dit. S'il a
    // répondu qu'il n'y a pas de camp, c'est cet écran-là qu'il faut garder : le
    // premier est plus tardif, il effacerait le second.
    setTimeout(function () { if (!repondu) montreEtat("pont"); }, ATTENTE_PONT);

    // Relecture régulière : c'est tout le « temps réel » du camp.
    var tour = 0;
    setInterval(function () {
      tour++;
      // Panneau replié : l'extension masque l'iframe, dont la fenêtre tombe
      // alors à zéro pixel. Rien à interroger pour un camp que personne ne
      // regarde — et c'est la PAGE qui en décide, donc cela se change sans
      // toucher à l'extension signée.
      if (document.hidden || !window.innerWidth || !window.innerHeight) return;
      if (!charId) {
        // pas de camp dans cette campagne : on regarde de loin en loin, au cas
        // où le MJ viendrait de créer le personnage
        if (repondu && tour % 4) return;
        demandePerso();
        return;
      }
      // De temps en temps, redemander le personnage : un partage accordé en
      // cours de partie doit finir par se voir, sans recharger la page.
      if (tour % 10 === 0) post({ type: "camp-char" });
      demandeEtat();
    }, POLL);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarre);
  else demarre();
})();
