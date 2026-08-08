/* Plateau de Narration — le contenu du panneau flottant de Roll20.
 *
 * CE QUE C'EST. La table de narration, celle qu'on faisait avec de vrais
 * jetons posés dans un coin de la carte : la réserve du MJ à gauche, les
 * joueurs à droite, et des jetons qu'on pousse de l'un vers l'autre au fil de
 * la partie. Tout le monde voit le même plateau, en même temps.
 *
 * CE QUE CE N'EST PAS. Une comptabilité. Aucun jeton n'appartient à personne :
 * il est POSÉ quelque part, et c'est sa position qui dit à qui il est. Le
 * compte affiché sur chaque place est un calcul de géométrie, jamais une valeur
 * enregistrée. D'où l'absence totale de protocole d'échange : donner un point,
 * c'est le pousser, comme sur la table.
 *
 * OÙ VIT L'ÉTAT. Dans les Attributes d'un personnage Roll20 nommé
 * « Narration », que le MJ partage à tous les joueurs (c'est le seul objet de
 * la campagne où chacun a lecture ET écriture : un joueur ne peut pas lire la
 * fiche d'un autre joueur). Trois natures d'attributs, et trois seulement :
 *
 *   jjk_narr_conf     la configuration (les places, les fonds en URL, la
 *                     donne), en JSON. Elle change rarement, et une seule
 *                     personne à la fois y touche : un seul attribut convient.
 *   jjk_narr_pt_<id>  UN JETON, « x,y » en millièmes du plateau. Un attribut
 *                     par jeton, et x et y ENSEMBLE : plus fin serait deux
 *                     écritures pour un seul geste, plus gros ferait qu'un
 *                     joueur qui pousse son jeton écraserait le geste
 *                     simultané d'un autre (Roll20 n'a pas de transaction :
 *                     le dernier qui écrit gagne). Une valeur vide = jeton
 *                     retiré du plateau.
 *   jjk_narr_bg_<id>  LE FOND D'UNE PLACE importé, en data: WebP. Son propre
 *                     attribut, et surtout pas un champ de jjk_narr_conf :
 *                     changer un fond réécrirait sinon toute la configuration
 *                     de la table, donc les places et la donne de tout le
 *                     monde, pour une image. Vide = pas de fond importé.
 *
 * COMMENT ÇA PARLE À ROLL20. Par le pont d20 de l'extension, exactement comme
 * la fiche : postMessage vers window.top, réponses par ev.source. Le pont ne
 * laisse écrire que des attributs « jjk_ », et lie une frame au premier
 * personnage qu'elle charge — cette page ne charge donc que « Narration », et
 * ne peut rien écrire ailleurs.
 *
 * FRAÎCHEUR. Le pont ne pousse rien de lui-même : le plateau redemande l'état
 * toutes les 1.2 s. Sur une table qui bouge trois fois par heure, personne ne
 * verra la différence avec du temps réel, et rien ne peut s'emballer.
 *
 * CE QUE VAUT UNE LECTURE. Roll20 ne peuple les Attributes d'un personnage qu'à
 * l'ouverture de sa fiche : le pont ouvre donc « Narration » lui-même, hors
 * champ, et dit avec chaque lecture si elle vaut vérité. Tant qu'elle ne vaut
 * rien, le plateau ne touche à rien — c'est la règle qui tient tout le reste.
 *
 * LA TRACE DE DÉPANNAGE EST ÉTEINTE, ET VOICI COMMENT LA RALLUMER. Elle écrivait
 * « [plateau JJK] … » dans la console à chaque lecture, c'est-à-dire deux fois
 * par seconde et chez chaque joueur pendant toute une partie. Elle a servi, elle
 * resservira, elle est intacte — mais sous condition. Pour la ralentir, au
 * choix :
 *
 *   - ajouter « #diag » à l'adresse du plateau. La coquille y pose déjà l'indice
 *     de nuit, l'adresse devient donc « …/roll20-narration.html#n=1&diag » ;
 *   - ou, dans la console du CADRE du plateau (celui de igneefleur.github.io,
 *     pas celui de Roll20) : localStorage.setItem("jjk-plateau-diag", "1"),
 *     puis rouvrir le plateau. localStorage.removeItem("jjk-plateau-diag")
 *     l'éteint. C'est le seul des deux qui survive à une réouverture.
 *
 * Par défaut, trace() ne dit RIEN : ni console, ni message vers la fenêtre du
 * haut.
 */
(function () {
  "use strict";

  var NS = "jjk";
  var PREF = "jjk_narr_";
  var A_CONF = PREF + "conf";
  var A_PT = PREF + "pt_";
  var A_BG = PREF + "bg_";  // le fond importé d'une place, un attribut chacun
  var POLL = 1200;          // ms entre deux relectures
  var GARDE = 4000;         // ms pendant lesquelles une écriture locale prime sur l'écho
  var PONT_PAS = 60;        // ms entre deux écritures d'attribut, côté pont
  var ATTENTE_PONT = 2500;  // ms avant de déclarer que Roll20 ne répond pas
  var MILLE = 1000;         // les coordonnées sont des millièmes du plateau

  // ---------- état ----------
  var charId = null;        // personnage « Narration » (null = pas trouvé)
  var ecrivable = false;    // ce que le pont ANNONCE des droits du joueur
  var refuse = false;       // ce que Roll20 a montré en refusant nos écritures
  // L'ÉTAT LU EST-IL UNE VÉRITÉ ? Roll20 ne peuple les attributs d'un personnage
  // qu'à l'ouverture de sa fiche : avant, la lecture rend du vide qui n'est la
  // vérité de rien. Le pont ouvre donc la fiche lui-même et le dit ici. Faux au
  // départ : on ne sait rien avant d'avoir lu.
  var etatSur = false;
  // Quatre raisons de ne pas toucher au plateau, et une seule question à poser :
  // on ne sait pas encore ce qu'il y a dessus, le pont annonce que ce joueur n'a
  // pas la main, Roll20 a refusé nos écritures, ou le plateau a été écrit par une
  // version plus récente. La première est la plus importante : pousser un jeton
  // sur un état qu'on n'a pas lu, c'est écraser la table de tout le monde.
  function peutPousser() { return etatSur && ecrivable && !refuse && !confFuture; }
  var conf = confVide();
  var points = {};          // id -> {x, y}
  var fonds = {};           // id de place -> fond TÉLÉVERSÉ (data: WebP), lu de Roll20
  var attente = {};         // nom d'attribut -> {val, t} : nos écritures pas encore revenues
  var prise = null;         // jeton en cours de déplacement
  var lu = false;           // au moins une lecture réussie
  var repondu = false;      // le pont a parlé, même pour dire qu'il n'y a rien

  // Version du FORMAT de la configuration. Elle ne sert qu'à une chose, mais
  // elle y sert vraiment : une table dont le plateau a été configuré par une
  // version plus récente passe en lecture seule au lieu de se faire réécrire
  // en silence par un code qui n'en comprend qu'une partie. Le plateau n'a ni
  // migrations ni archives, contrairement à la fiche : c'est son seul filet.
  var V_CONF = 1;
  var confFuture = false;

  function confVide() {
    return {
      v: V_CONF,
      seq: 0,                             // compteur d'identifiants de jetons
      // « img » est l'URL du fond de la place, celle qu'on tape à la main. Le
      // fichier TÉLÉVERSÉ, lui, n'est pas ici : il vit dans jjk_narr_bg_<id>.
      mj: { nom: "MJ", img: "" },
      joueurs: [],                        // [{ id, nom, img }]
      donne: { mj: 3, joueur: 3 }         // jetons créés à la distribution
    };
  }

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function entier(v, def) { var n = parseInt(v, 10); return isFinite(n) ? n : def; }

  // ---------- jour / nuit ----------
  // Même règle de priorité que la fiche, et dans le même ordre : le choix
  // mémorisé de ce joueur, puis l'indice n=1/0 du hash (posé par la coquille
  // d'après le réglage jjkNuit de l'extension, et ABSENT quand ce réglage vaut
  // « auto »), puis le thème du navigateur. Jusqu'ici personne ne pouvait
  // CHOISIR la nuit du plateau : il subissait le hash.
  //
  // La clé est propre au plateau. La fiche a la sienne (« jjk-r20-night ») et
  // les deux pages sont servies par la même origine : partager la clé ferait
  // qu'éclairer le plateau repeindrait la fiche du même joueur.
  //
  // Et surtout, cette préférence ne va PAS dans jjk_narr_conf : c'est un
  // réglage d'affichage, propre à chacun. Dans la configuration partagée, le
  // choix d'un joueur repeindrait l'écran de toute la table, et chaque bascule
  // coûterait une écriture Roll20.
  var NUIT_CLE = "jjk-r20-night-plateau";
  var NUIT_INDICE = (function () {
    var h = location.hash || "";
    if (/[#&]n=1/.test(h)) return true;
    if (/[#&]n=0/.test(h)) return false;
    try { return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches); }
    catch (e) { return false; }
  })();
  function nuitPref() {
    // localStorage peut manquer dans une iframe tierce dont les cookies sont
    // bloqués : la lecture lève, et le plateau doit alors simplement suivre
    // Roll20 au lieu de ne pas démarrer.
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
    // joueur a mis CE plateau en nuit alors que le reste est en jour. Sans ce
    // message, on aurait une barre de titre claire autour d'un plateau sombre,
    // c'est-à-dire l'objet cassé en deux. Le canal l'accepte, et le cadre
    // ignore ce qu'il ne comprend pas : une extension plus ancienne ne fera
    // rien de ce champ, sans casser pour autant.
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
    '<svg class="nb-croissant" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,10.5L19.61,11.76L20.2,13.74L18.5,12.56L16.8,13.74L17.39,11.76L15.75,10.5L17.81,10.43L18.5,8.5L19.19,10.43L21.25,10.5M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95Z"/></svg>' +
    '<svg class="nb-soleil" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M3.55,19.09L4.96,20.5L6.76,18.71L5.34,17.29M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M20,13H23V11H20M17.24,18.71L19.04,20.5L20.45,19.09L18.66,17.29M20.45,5L19.04,3.5L17.24,5.29L18.66,6.71M13,1H11V4H13M6.76,5.29L4.96,3.5L3.55,4.91L5.34,6.71M1,13H4V11H1M13,20H11V23H13V20Z"/></svg>';

  // ---------- dialogue avec le pont ----------
  function post(msg) {
    msg.ns = NS;
    try { window.top.postMessage(msg, "*"); } catch (e) {}
  }
  // Le pont d20 n'est injecté par l'extension que sur demande, et rien ne dit
  // qu'une fiche a déjà été ouverte dans cette partie : le plateau réclame donc
  // le pont lui-même avant de parler. L'injection est idempotente, le redemander
  // ne coûte rien.
  // « encore » ne part qu'au clic sur Réessayer : il fait recommencer au pont son
  // ouverture de fiche. La demande périodique, elle, ne doit rien relancer, sinon
  // un échec s'effacerait tout seul toutes les douze secondes.
  function demandePerso(encore) {
    post({ type: "need-bridge" });
    post({ type: "narration-char", encore: !!encore });
  }
  // L'ALLÈGEMENT SE DEMANDE, SINON IL NE SERT À RIEN. Le pont sait retenir les
  // gros attributs — les fonds importés, qui pèsent jusqu'à deux cents kilos en
  // base64 — mais seulement si la page le lui demande. Personne ne le demandait :
  // les images repartaient donc à chaque tour, toutes les 1.2 seconde, pour rien.
  //
  // On ne l'allège QU'UNE FOIS QU'ON LES TIENT. La toute première lecture doit
  // être complète, sinon le plateau n'aurait jamais vu les fonds ; et « omis »
  // dit lesquels le pont a retenus, pour qu'on garde les nôtres au lieu de les
  // croire effacés.
  var fondsTenus = false;
  // CE QUI APPARTIENT AU PLATEAU, dit par le plateau lui-même. Le pont range les
  // attributs de « Narration » : il retire les restes d'une fiche de personnage
  // ouverte un jour dessus, et dédoublonne les nôtres. Mais il ne peut pas
  // DEVINER lesquels sont les nôtres — et un critère gravé dans un paquet signé
  // condamnerait tout nom qu'on se mettrait à écrire plus tard, puisque cette
  // page-ci change sans signature. On envoie donc la liste, et le pont ne
  // détruit rien sans elle.
  var MENAGE_GARDE = [A_CONF, A_PT, A_BG];
  function demandeEtat() {
    if (!charId) { return; }
    post({ type: "load", charId: charId, allege: fondsTenus === true,
           menageGarde: MENAGE_GARDE });
  }
  // Une écriture = un lot d'attributs. On note ce qu'on vient d'écrire : l'écho
  // met un aller-retour à revenir, et sans cette note la relecture suivante
  // remettrait le jeton là où il était avant notre geste.
  function ecrire(attrs) {
    if (!charId || !peutPousser()) return;
    var lot = {}, t = Date.now();
    var noms = Object.keys(attrs);
    // Le pont écrit un attribut à la fois, espacés : le dernier d'un gros lot
    // n'arrive chez Roll20 que bien après le premier. La garde qui protège nos
    // valeurs de l'écho périmé doit donc tenir compte de la LONGUEUR du lot,
    // sinon la queue d'une distribution revient visiblement en arrière avant
    // d'être enfin écrite.
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
  }

  window.addEventListener("message", function (ev) {
    try {
      var d = ev.data;
      if (!d || d.ns !== NS) return;
      // Le pont vit dans la fenêtre du haut de Roll20 : ses réponses en
      // viennent, et de nulle part ailleurs. Sans ce contrôle, n'importe quelle
      // frame de la page (un mod, par exemple) pourrait faire pointer le
      // plateau sur un autre personnage.
      if (ev.source !== window.top) return;
      if (d.type === "narration-char-result") {
        repondu = true;
        if (!d.charId) {
          charId = null;
          // « pas de plateau » ne se dit que si la campagne est chargée : au
          // démarrage, Roll20 met une seconde ou deux à peupler ses
          // personnages, et l'annoncer alors afficherait un écran d'erreur qui
          // ne partirait plus.
          if (d.pret !== false) montreEtat("absent");
          return;
        }
        // LE PERSONNAGE A CHANGÉ : ON REPART DE ZÉRO. Le MJ qui suit la consigne
        // « aucun plateau dans cette campagne » supprime et recrée « Narration » ;
        // deux personnages du même nom suffisent aussi à faire changer d'avis la
        // recherche quand la collection se retrie. Chez un joueur dont le panneau
        // est déjà ouvert, le nouvel identifiant remplaçait l'ancien SANS rien
        // remettre à zéro : le plateau gardait les jetons, la configuration et
        // les attentes de l'ancien personnage, se croyait sûr de ce qu'il n'avait
        // jamais lu, et pouvait écrire par-dessus la table neuve.
        if (charId && d.charId !== charId) {
          etatSur = false; lu = false; vide = 0; perdues = 0; refuse = false;
          confFuture = false; points = {}; conf = confVide(); fonds = {};
          attente = {}; connus = {}; prise = null;
          annuleEnvoi();
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
  // laisse essayer : une écriture refusée se verra, et le plateau le dira.
  function jugeDroits(d) {
    if (d.gm === undefined && d.controlledby === undefined) return d.ecrivable !== false;
    if (d.gm === true) return true;
    var l = String(d.controlledby || "").split(",").map(function (x) { return x.replace(/\s+/g, ""); });
    if (l.indexOf("all") >= 0) return true;
    return !!d.moi && l.indexOf(String(d.moi)) >= 0;
  }

  // ---------- lecture de l'état ----------
  // Un attribut revenu de Roll20 ne prime pas toujours : il perd contre le
  // jeton qu'on a dans la main, et contre une écriture toute fraîche qui n'a
  // pas encore fait l'aller-retour. Passé le délai de garde, il reprend la main
  // (notre écriture s'est perdue, ou quelqu'un a poussé le même jeton).
  // UNE PERTE PAR LOT, ET NON PAR ATTRIBUT. Une distribution écrit N attributs
  // d'un coup ; si deux joueurs poussent leur jeton dans la foulée — c'est
  // exactement ce qu'on fait après une donne — deux de ces attributs reviennent
  // différents, le compteur montait de deux d'un seul coup, et le plateau se
  // déclarait refusé DÉFINITIVEMENT sur un conflit parfaitement normal. On ne
  // compte donc qu'une perte pour un même instant d'écriture.
  var perdues = 0;
  var dernierePerte = 0;
  // Ce que Roll20 disait à la dernière lecture, attribut par attribut.
  var dernierLu = {};
  function retenu(nom, distant) {
    var a = attente[nom];
    if (!a) return false;
    // Une écriture qui REVIENT prouve que Roll20 accepte : le refus se lève.
    // Sans cela, un seul conflit passager condamnait le plateau jusqu'au
    // rechargement, et le joueur n'avait aucun moyen de le savoir.
    if (a.val === distant) {
      delete attente[nom];
      perdues = 0; refuse = false;
      // Un fond qui revient de Roll20, c'est la taille qui passe : c'est là,
      // et nulle part ailleurs, qu'on apprend la limite du serveur.
      if (envoi && nom === A_BG + envoi.id) fondPasse();
      return false;
    }
    if (Date.now() - a.t < (a.marge || GARDE)) return true;
    delete attente[nom];
    // UN FOND PERDU NE DIT RIEN DES DROITS DU JOUEUR : c'est très probablement
    // sa taille que Roll20 a refusée, et la réduction va le prouver. Le compter
    // comme une perte ordinaire mettait tout le plateau en lecture seule au bout
    // de deux images trop lourdes, et sans rapport avec le partage du personnage.
    if (envoi && nom === A_BG + envoi.id) { fondRefuse(); return false; }
    // Notre écriture n'est jamais revenue. Une fois, c'est quelqu'un qui a
    // poussé le même jeton en même temps ; deux fois de suite, c'est que Roll20
    // refuse nos écritures (le personnage n'est pas partagé avec ce joueur, ou
    // le pronostic du pont s'est trompé). On le DIT plutôt que de laisser les
    // jetons revenir en arrière sans explication.
    if (a.t !== dernierePerte) {
      dernierePerte = a.t;
      if (++perdues >= 2) { refuse = true; perdues = 0; }
      // Les homonymes, eux, sont relevés par le PONT et voyagent dans « ecrits » :
      // la note d'attente ne les a jamais portés, et les redemander ici ne
      // rendait qu'un « null » qui faisait croire à un attribut sans doublon.
      trace("ecriture perdue", { attribut: nom, attendu: a.val, recu: distant,
                                 avant: a.avant,
                                 verdict: (a.avant != null && String(distant) === String(a.avant))
                                   ? "notre ecriture n a pas pris"
                                   : "un autre a ecrit (ou valeur inconnue)" });
    }
    return false;
  }

  // Tous les identifiants de jetons VUS chez Roll20, y compris ceux dont la
  // valeur est vide (jeton retiré). La distribution s'en sert pour ne pas
  // laisser derrière elle les jetons créés par la distribution de quelqu'un
  // d'autre, qu'elle ne verrait pas autrement.
  var connus = {};
  var vide = 0;   // lectures vides consécutives

  // SONDE DE DÉPANNAGE. Le plateau vit dans un iframe d'une autre origine : ni
  // la page Roll20 ni une sonde collée dans sa console ne peuvent lire ces
  // variables, et le message « hydrate » est adressé au panneau, pas à la
  // fenêtre du haut. Sans cette trace, un joueur qui constate une panne n'a
  // aucun moyen de dire ce que son plateau a vu, et moi aucun moyen de le
  // savoir : je n'ai pas de compte Roll20.
  //
  // Elle n'écrit rien et ne change rien. Elle se déclenche seulement quand le
  // plateau change d'avis (état sûr, refus, droits) ou toutes les dix secondes,
  // pour ne pas noyer la console d'une partie.
  //
  // ET ELLE EST ÉTEINTE PAR DÉFAUT depuis qu'elle a servi : deux lignes par
  // seconde dans la console de chaque joueur pendant toute une partie, c'est une
  // console inutilisable pour tout le reste. Les deux façons de la rallumer sont
  // en tête de fichier ; DIAG est lu une seule fois, au chargement, pour qu'une
  // partie ne puisse pas se mettre à parler en cours de route.
  var DIAG = (function () {
    if (/[#&]diag\b/.test(location.hash || "")) return true;
    // localStorage peut lever dans une iframe tierce aux cookies bloqués : la
    // trace n'est pas une raison de ne pas démarrer.
    try { return localStorage.getItem("jjk-plateau-diag") === "1"; } catch (e) { return false; }
  })();
  var traceQuoi = "", traceQuand = 0;
  function trace(ou, sup) {
    if (!DIAG) return;
    try {
      var e = { ou: ou, charId: charId, ecrivable: ecrivable, etatSur: etatSur,
                refuse: refuse, confFuture: confFuture, lu: lu, vide: vide,
                perdues: perdues, attentes: Object.keys(attente).length,
                jetons: Object.keys(points).length, ecran: etatMontre };
      var k;
      for (k in (sup || {})) { if (sup.hasOwnProperty(k)) { e[k] = sup[k]; } }
      var sig = JSON.stringify(e);
      var t = Date.now();
      if (sig === traceQuoi && t - traceQuand < 10000) { return; }
      traceQuoi = sig; traceQuand = t;
      if (window.console && console.log) { console.log("[plateau JJK] " + sig); }
      // ET ON LA FAIT REMONTER. Le plateau vit dans un iframe d'une autre
      // origine : ses messages de console n'apparaissent pas dans celle de
      // Roll20 sans aller sélectionner le cadre à la main, ce que personne n'a
      // envie de faire pour signaler une panne. On la poste donc vers la fenêtre
      // du haut, où un script de dépannage peut les ramasser toutes.
      //
      // « jjk-diag » et non « jjk » : le pont ne doit jamais confondre ceci avec
      // un ordre. Il ignore tout ce qui ne porte pas son propre nom.
      try { (window.top || window).postMessage({ ns: "jjk-diag", ligne: sig }, "*"); } catch (e2) {}
    } catch (err) {}
  }

  // Ce que le pont a relevé du modèle juste après avoir écrit, RACCOURCI. Un
  // fond de zone pèse deux cent mille caractères : recopié tel quel dans la
  // trace, il la rend illisible et fait ramer la console qu'on venait consulter.
  // Seule la LONGUEUR importe pour ces valeurs-là.
  function resumeEcrits(e) {
    if (!e) return null;
    var r = {}, k, s, v;
    for (k in e) {
      if (!e.hasOwnProperty(k)) continue;
      s = {}; v = e[k] || {};
      s.serveur = v.serveur; s.detail = v.detail; s.homonymes = v.homonymes;
      s.voulu = court(v.voulu); s.modele = court(v.modele);
      r[k] = s;
    }
    return r;
  }
  function court(v) {
    if (v == null) return v;
    var s = String(v);
    return s.length > 80 ? "(" + s.length + " caracteres)" : s;
  }

  function applique(attrs, d) {
    ditMenage(d);
    trace("lecture", { pontSur: (d && d.sur), pontRaison: (d && d.raison),
                       nbAttrs: attrs ? Object.keys(attrs).length : 0,
                       ecrits: resumeEcrits(d && d.ecrits) });
    try {
      var _k, _a = attrs || {};
      for (_k in _a) { if (_a.hasOwnProperty(_k)) { dernierLu[_k] = String(_a[_k] && _a[_k].current != null ? _a[_k].current : _a[_k]); } }
    } catch (e) {}
    // « JE NE SAIS PAS ENCORE » N'EST PAS « C'EST VIDE ». Roll20 ne peuple les
    // Attributes d'un personnage qu'à l'ouverture de sa fiche, et le plateau est
    // justement lu sans que personne n'ouvre celle de « Narration » : tant que le
    // pont ne l'a pas ouverte, ce qu'il rend n'est la vérité de rien. Le prendre
    // pour l'état effaçait le plateau à l'écran, et faisait redistribuer sur du
    // vide ; les écritures parties là-dessus ne revenaient jamais, et le plateau
    // finissait par accuser Roll20 de les refuser. On ne touche donc à RIEN tant
    // que ce n'est pas sûr : ni configuration, ni jetons, ni verdict de refus.
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
    // Une lecture vide n'efface pas un plateau sur un coup de tête : cinq
    // d'affilée, au cas où il aurait vraiment été vidé à la main. Et la règle
    // vaut dès la PREMIÈRE lecture quand le pont est trop ancien pour ouvrir la
    // fiche — c'est tout ce qu'on peut faire pour lui sans extension à jour ;
    // un pont récent, lui, a déjà répondu de ce vide-là.
    if (rien && (lu || !dit)) {
      if (++vide < 5) {
        if (!lu) montreEtat("attente");   // rien de lu : pas de table à montrer
        return;
      }
    } else {
      vide = 0;
    }
    lu = true;
    // On sait, maintenant.
    etatSur = true;
    montreEtat(null);

    // CE QUE LE SERVEUR A RÉPONDU À NOTRE FOND, quand le pont sait le dire. Il
    // arrive bien avant la garde d'écriture : une image trop lourde se réduit
    // alors en une seconde au lieu de six. Un pont plus ancien ne dit rien de
    // tout cela, et le minuteur d'envoi prend le relais.
    //
    // ICI ET PAS PLUS HAUT : c'est la règle qui tient tout le fichier. Sur une
    // lecture qui ne vaut pas vérité, on ne conclut rien — et surtout pas qu'une
    // écriture a été refusée, ce qui relancerait l'envoi dans le vide.
    try {
      if (envoi && d && d.ecrits) {
        var rep = d.ecrits[A_BG + envoi.id];
        if (rep && (rep.serveur === "refuse" || rep.serveur === "exception")) fondRefuse();
      }
    } catch (e) {}

    var brutConf = attrs[A_CONF] ? String(attrs[A_CONF].current || "") : "";
    if (!retenu(A_CONF, brutConf)) conf = litConf(brutConf);

    // LES FONDS, avant les jetons : ils changent la peinture des places, pas le
    // compte. Même règle que pour un jeton — notre écriture en attente prime sur
    // l'écho périmé — et même contrôle du nom, pour la même raison.
    var neufFonds = {};
    Object.keys(attrs).forEach(function (n) {
      if (n.indexOf(A_BG) !== 0) return;
      var idf = n.slice(A_BG.length);
      if (!/^[A-Za-z0-9_-]{1,16}$/.test(idf)) return;
      var brutF = String(attrs[n].current || "");
      if (retenu(n, brutF)) { if (fonds[idf]) neufFonds[idf] = fonds[idf]; return; }
      var sf = fondSur(brutF);
      if (sf) neufFonds[idf] = sf;
    });
    // Un fond qu'on vient d'envoyer et que Roll20 ne nous a pas encore rendu ne
    // doit pas clignoter : il reste affiché le temps de l'écho.
    Object.keys(attente).forEach(function (n) {
      if (n.indexOf(A_BG) !== 0) return;
      var idf = n.slice(A_BG.length);
      if (!neufFonds[idf] && fonds[idf] && attente[n].val) neufFonds[idf] = fonds[idf];
    });
    // CE QUE LE PONT A RETENU N'EST PAS EFFACÉ. « omis » liste les attributs
    // qu'il n'a pas renvoyés parce qu'ils n'ont pas changé : sans cette reprise,
    // le premier tour allégé ferait disparaître tous les fonds de l'écran.
    try {
      var om = (d && d.omis) || [];
      for (var io_ = 0; io_ < om.length; io_++) {
        var no = String(om[io_]);
        if (no.indexOf(A_BG) !== 0) { continue; }
        var ido = no.slice(A_BG.length);
        if (!neufFonds[ido] && fonds[ido]) { neufFonds[ido] = fonds[ido]; }
      }
    } catch (e) {}
    fonds = neufFonds;
    // À partir du moment où une lecture COMPLÈTE est passée, les suivantes
    // peuvent être allégées : on tient les fonds, le pont n'a plus à les
    // retransporter.
    if (!fondsTenus && !(d && d.allege)) { fondsTenus = true; }

    var neuf = {};
    Object.keys(attrs).forEach(function (n) {
      if (n.indexOf(A_PT) !== 0) return;
      var id = n.slice(A_PT.length);
      // Le nom de l'attribut vient de Roll20, donc de n'importe qui : un
      // identifiant fantaisiste finirait dans un sélecteur CSS et ferait
      // tomber tout le rafraîchissement, pour tout le monde et sans un mot.
      if (!/^[A-Za-z0-9_-]{1,16}$/.test(id)) return;
      connus[id] = 1;
      var brut = String(attrs[n].current || "");
      if (retenu(n, brut)) { if (points[id]) neuf[id] = points[id]; return; }
      var p = litPoint(brut);
      if (p) neuf[id] = p;
      // un jeton qu'on tient et que quelqu'un vient de retirer ne doit pas
      // ressusciter au lâcher
      else if (prise && prise.id === id) prise.mort = true;
    });
    // Nos écritures en attente sur des jetons que Roll20 ne connaît pas encore
    // (créés à l'instant) : elles ne doivent pas disparaître le temps de l'écho.
    Object.keys(attente).forEach(function (n) {
      if (n.indexOf(A_PT) !== 0) return;
      var id = n.slice(A_PT.length);
      if (!neuf[id] && points[id]) neuf[id] = points[id];
    });
    // le jeton qu'on tient reste sous le doigt, quoi qu'en dise Roll20
    if (prise && points[prise.id]) neuf[prise.id] = points[prise.id];
    points = neuf;
    rend();
  }

  function litConf(brut) {
    var c = confVide();
    if (!brut) return c;
    var o = null;
    try { o = JSON.parse(brut); } catch (e) { return c; }
    if (!o || typeof o !== "object") return c;
    if (entier(o.v, V_CONF) > V_CONF) confFuture = true;
    c.seq = Math.max(0, entier(o.seq, 0));
    if (o.mj && typeof o.mj === "object") {
      c.mj.nom = String(o.mj.nom || "MJ").slice(0, 40) || "MJ";
      c.mj.img = urlSure(o.mj.img);
    }
    if (Array.isArray(o.joueurs)) {
      o.joueurs.slice(0, 12).forEach(function (j, i) {
        if (!j || typeof j !== "object") return;
        c.joueurs.push({
          id: String(j.id || ("j" + (i + 1))).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 12) || ("j" + (i + 1)),
          nom: String(j.nom || "").slice(0, 40),
          img: urlSure(j.img)
        });
      });
    }
    if (o.donne && typeof o.donne === "object") {
      c.donne.mj = clamp(entier(o.donne.mj, 3), 0, 40);
      c.donne.joueur = clamp(entier(o.donne.joueur, 3), 0, 40);
    }
    return c;
  }
  // Une image vient d'un attribut que n'importe quel joueur peut écrire : on
  // n'accepte que du http(s), jamais un « javascript: ». Et jamais un data: ICI :
  // la configuration entière est réécrite à chaque enregistrement, une image
  // dedans la ferait peser deux cent mille caractères. Le fichier importé a
  // son propre attribut, et fondSur() le relit.
  function urlSure(u) {
    var s = String(u == null ? "" : u).trim();
    return /^https?:\/\//i.test(s) ? s.slice(0, 400) : "";
  }
  // Le fond d'une place, tel qu'il revient de Roll20. C'est une valeur que
  // n'importe quel joueur de la table peut écrire, et elle finit dans un
  // background-image : on n'accepte donc que ce qui ne peut être qu'une image.
  //
  // Pas de SVG, même en data: — c'est le seul format d'image qui puisse porter
  // autre chose qu'une image. Et un plafond de longueur, parce qu'une chaîne de
  // plusieurs mégaoctets recopiée à chaque relecture suffirait à figer l'onglet
  // de tout le monde.
  var BG_LIRE_MAX = 1400 * 1024;
  function fondSur(brut) {
    var s = String(brut == null ? "" : brut).trim();
    if (!s || s.length > BG_LIRE_MAX) return "";
    if (/^data:image\/(?:webp|png|jpeg|gif|avif);base64,[A-Za-z0-9+/=]+$/.test(s)) return s;
    return urlSure(s);
  }
  function litPoint(brut) {
    var m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(String(brut).trim());
    if (!m) return null;   // vide ou illisible = jeton absent du plateau
    return { x: clamp(parseFloat(m[1]), 0, MILLE), y: clamp(parseFloat(m[2]), 0, MILLE) };
  }
  function ecritPoint(p) { return Math.round(p.x) + "," + Math.round(p.y); }

  // ---------- le mot au joueur ----------
  var motTimer = null, motsVus = {};
  var MOT_DUREE = 12000;
  function mot(txt, cle) {
    // « une fois » se tient ICI et non chez l'appelant : le pont répète son
    // rapport de ménage à chaque lecture, soit toutes les 1.2 s.
    if (cle) { if (motsVus[cle]) return; motsVus[cle] = 1; }
    if (!lblMot) return;
    lblMot.textContent = txt;
    boiteMot.hidden = false;
    if (motTimer) clearTimeout(motTimer);
    motTimer = setTimeout(fermeMot, MOT_DUREE);
  }
  function fermeMot() {
    if (motTimer) { clearTimeout(motTimer); motTimer = null; }
    if (!boiteMot) return;
    lblMot.textContent = "";
    boiteMot.hidden = true;
  }

  // CE QUE LE PONT A RETIRÉ DE « NARRATION ». Une fois par chargement, il en
  // enlève tout attribut « jjk_ » qui n'est pas « jjk_narr_ » — la trace d'une
  // fiche de personnage ouverte un jour sur ce personnage-là (mesuré chez
  // l'auteur : 82 attributs pour 18 attendus) — et fusionne les homonymes. Il
  // rapporte { trouves, etrangers, doublons, retires } avec la lecture suivante.
  //
  // Le plateau n'en montre QUE le compte de ce qui a disparu, et une seule fois :
  // ce n'est pas une panne, c'est un ménage, et le reste du rapport (dont l'arrêt
  // sur refus) part dans la trace de dépannage. Le mot ne dit pas « de fiche » :
  // les homonymes fusionnés, eux, étaient bien du plateau.
  //
  // La lecture est tolérante à dessein. Le pont est signé et le plateau ne l'est
  // pas : ils ne sont jamais déployés le même jour, et le nombre nu comme
  // l'objet détaillé doivent tous deux se lire.
  function ditMenage(d) {
    if (!d || d.menage == null) return;
    var m = d.menage, n = 0;
    if (typeof m === "number") n = m;
    else if (Object.prototype.toString.call(m) === "[object Array]") n = m.length;
    else if (typeof m === "object") {
      n = entier(m.retires != null ? m.retires : (m.n != null ? m.n : m.nb), 0);
      trace("menage", { menage: m });
    }
    if (!(n > 0)) return;
    mot(n > 1 ? ("Ménage : " + n + " attributs retirés du plateau.")
              : "Ménage : 1 attribut retiré du plateau.", "menage");
  }

  // ---------- les fonds de zone ----------
  // Chaque place porte une IMAGE DE FOND, à la place du portrait qu'elle avait :
  // une vignette de seize pixels dans un en-tête ne montrait rien de personne.
  // Deux façons de la donner, et l'ordre entre elles compte : une URL, rangée
  // dans la configuration, ou un FICHIER, rangé dans son propre attribut. Le
  // fichier l'emporte, parce que c'est le plus explicite des deux gestes.
  //
  // POURQUOI ON REDIMENSIONNE. Un attribut Roll20 n'est pas un entrepôt
  // d'images, et personne n'a mesuré ce qu'il accepte. On plafonne donc la
  // largeur, on encode en WebP, et on descend la qualité jusqu'à tenir sous la
  // cible. Ce qui revient de Roll20 est relu à chaque tour : chaque millier de
  // caractères se paie une fois par seconde et par joueur.
  var BG_LARGEURS = [800, 600, 400];
  var BG_CIBLE = 200 * 1024;   // caractères visés pour la chaîne enregistrée
  var BG_QUALITES = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38, 0.3];

  function reduitImage(fichier, largeur, pret, rate) {
    var lect = new FileReader();
    lect.onerror = function () { rate("Image illisible."); };
    lect.onload = function () {
      var im = new Image();
      im.onerror = function () { rate("Image illisible."); };
      im.onload = function () {
        try {
          var w0 = im.naturalWidth || im.width, h0 = im.naturalHeight || im.height;
          if (!(w0 > 0) || !(h0 > 0)) { rate("Image illisible."); return; }
          // On n'AGRANDIT jamais : une petite image étirée à 800 px ne gagne que
          // du poids.
          var w = Math.min(largeur, w0);
          var h = Math.max(1, Math.round(h0 * (w / w0)));
          var c = document.createElement("canvas");
          c.width = w; c.height = h;
          c.getContext("2d").drawImage(im, 0, 0, w, h);
          var i, url = "";
          for (i = 0; i < BG_QUALITES.length; i++) {
            url = c.toDataURL("image/webp", BG_QUALITES[i]);
            // toDataURL ne SAIT PAS refuser : un navigateur sans encodeur WebP
            // rend du PNG sans le dire, et un PNG de photo pèse trois fois le
            // budget. On vérifie donc ce qu'on a obtenu, et on retombe sur le
            // JPEG, qui n'a jamais manqué nulle part.
            if (url.indexOf("data:image/webp") !== 0) url = c.toDataURL("image/jpeg", BG_QUALITES[i]);
            if (url.length <= BG_CIBLE) break;
          }
          if (url.length > BG_CIBLE) { rate("Image trop lourde, même réduite."); return; }
          pret(url, w);
        } catch (e) { rate("Image illisible."); }
      };
      im.src = String(lect.result || "");
    };
    lect.readAsDataURL(fichier);
  }

  // L'ENVOI D'UN FOND, ET LA SEULE FAÇON DE DÉCOUVRIR LA LIMITE DE ROLL20.
  // Personne ne l'a mesurée, et l'essayer à l'aveugle coûterait une soirée. On
  // tente donc la plus grande taille ; si le serveur refuse (le pont rapporte sa
  // réponse) ou si l'écriture ne revient jamais, on descend d'un cran et on
  // recommence. À l'arrivée, on DIT à quelle taille c'est passé : la limite se
  // découvre une fois, pas à chaque image.
  var envoi = null;   // { id, fichier, rang, largeur, apres, minuteur }

  function annuleEnvoi() {
    if (!envoi) return;
    if (envoi.minuteur) clearTimeout(envoi.minuteur);
    envoi = null;
  }
  function poseFond(id, fichier, apres) {
    if (!peutPousser()) { mot("Lecture seule : le fond n'a pas pu être enregistré."); return; }
    annuleEnvoi();
    envoi = { id: id, fichier: fichier, rang: 0, apres: apres, minuteur: null };
    mot("Réduction de l'image…");
    envoieFond();
  }
  function envoieFond() {
    var e = envoi;
    if (!e) return;
    reduitImage(e.fichier, BG_LARGEURS[e.rang], function (url, w) {
      if (envoi !== e) return;   // un autre envoi a commencé pendant l'encodage
      e.largeur = w;
      fonds[e.id] = url;         // à l'écran tout de suite, l'écho suivra
      ecrire(defObj(A_BG + e.id, url));
      mot("Enregistrement du fond en " + w + " px…");
      if (e.apres) { try { e.apres(); } catch (err) {} }
      rend();
      // LE FILET, pour le jour où le pont ne dit rien. Un attribut refusé peut
      // ne jamais reparaître dans la lecture : retenu() ne sera alors jamais
      // appelé pour lui, et l'envoi resterait en attente pour toujours. Deux
      // tours de relecture après la garde suffisent à trancher.
      if (e.minuteur) clearTimeout(e.minuteur);
      e.minuteur = setTimeout(function () { if (envoi === e) fondRefuse(); },
                              GARDE + PONT_PAS + 2 * POLL);
    }, function (m) { if (envoi === e) { annuleEnvoi(); mot(m); } });
  }
  function fondRefuse() {
    var e = envoi;
    if (!e) return;
    if (e.minuteur) { clearTimeout(e.minuteur); e.minuteur = null; }
    var refusee = e.largeur || BG_LARGEURS[e.rang];
    if (e.rang + 1 < BG_LARGEURS.length) {
      e.rang++;
      mot("Roll20 a refusé " + refusee + " px : nouvel essai en " + BG_LARGEURS[e.rang] + " px.");
      envoieFond();
      return;
    }
    var id = e.id, apres = e.apres;
    annuleEnvoi();
    delete fonds[id];
    mot("Roll20 refuse cette image, même en " + refusee + " px.");
    if (apres) { try { apres(); } catch (err) {} }
    rend();
  }
  function fondPasse() {
    var e = envoi;
    if (!e) return;
    var w = e.largeur;
    annuleEnvoi();
    mot("Fond enregistré en " + w + " px.");
  }
  function retireFond(id) {
    if (!peutPousser()) { mot("Lecture seule : le fond n'a pas pu être retiré."); return; }
    if (envoi && envoi.id === id) annuleEnvoi();
    delete fonds[id];
    ecrire(defObj(A_BG + id, ""));
    rend();
  }
  // Le fichier importé l'emporte sur l'URL : c'est le geste le plus explicite
  // des deux, et il vit dans son propre attribut. Vider l'un ne touche pas
  // l'autre, on peut donc garder une URL de secours sous une image.
  function fondDe(p) { return fonds[p.id] || p.img || ""; }

  // ---------- construction ----------
  var racine, coteMj, coteJoueurs, coucheJetons;
  var lblTotal, boiteTotal, lblHors, boiteHors, lblAvis, btnNuit;
  var boiteMot, lblMot;
  var jaugeRef = null;
  var placesDom = {};   // id de place -> élément
  var fondPose = {};    // id de place -> fond DÉJÀ peint, pour ne pas repeindre

  // Un couple libellé / valeur : la capitale minuscule et espacée face au
  // chiffre tabulaire. C'est ce contraste, plus que les couleurs, qui donne
  // l'air de formulaire imprimé ; l'ancienne barre disait « 12 jetons » en
  // texte courant, à la taille de tout le reste.
  function kv(cls, lab) {
    var b = el("div", "nb-kv " + cls);
    b.appendChild(el("span", "k", lab));
    b.appendChild(el("span", "v", "0"));
    return b;
  }

  function bati() {
    racine = document.getElementById("nb");
    racine.innerHTML = "";   // le mot d'attente de l'amorceur a fait son office

    var barre = el("div", "nb-barre");
    boiteTotal = kv("nb-total", "Jetons");
    lblTotal = boiteTotal.lastChild;
    barre.appendChild(boiteTotal);
    // « hors place » et « lecture seule » sont deux choses distinctes : un
    // compte et un empêchement. Elles se disputaient la même case, et la plus
    // grave des deux se disait en gris clair.
    boiteHors = kv("nb-hors", "Hors place");
    lblHors = boiteHors.lastChild;
    boiteHors.hidden = true;
    barre.appendChild(boiteHors);

    var outils = el("div", "nb-outils");
    btnNuit = el("button", "nb-btn nb-lune");
    btnNuit.type = "button";
    btnNuit.innerHTML = SVG_NUIT;   // deux SVG écrits juste au-dessus, sans rien d'extérieur
    btnNuit.addEventListener("click", function () { poseNuit(nuitActive() ? "0" : "1"); });
    outils.appendChild(btnNuit);
    var btnReglages = el("button", "nb-btn", "Réglages");
    btnReglages.type = "button";
    btnReglages.addEventListener("click", function () { ouvreReglages(); });
    outils.appendChild(btnReglages);
    barre.appendChild(outils);
    racine.appendChild(barre);
    appliqueNuit();   // le bouton vient d'exister : ses libellés doivent dire l'état

    lblAvis = el("div", "nb-avis");
    racine.appendChild(lblAvis);

    var plateau = el("div", "nb-plateau");
    coteMj = el("div", "nb-cote nb-cote-mj");
    coteJoueurs = el("div", "nb-cote nb-cote-joueurs");
    coucheJetons = el("div", "nb-jetons");
    plateau.appendChild(coteMj);
    plateau.appendChild(coteJoueurs);
    plateau.appendChild(coucheJetons);

    // LE MOT, et ce n'est pas l'avis. L'avis dit un EMPÊCHEMENT, il reste tant
    // que sa cause dure. Le mot rend compte d'un geste qui vient d'aboutir (le
    // fond enregistré, à quelle taille) ou du ménage fait à l'ouverture : il se
    // dit une fois, se ferme d'un clic, s'efface tout seul, et ne bloque rien.
    //
    // IL EST POSÉ DANS LE PLATEAU, ET NON DANS LA COLONNE : dans la colonne il
    // couvrait la barre d'outils, c'est-à-dire les deux comptes et les deux
    // boutons, pendant les douze secondes où il se lit. Le CSS le range en bas
    // de la table et lui fait traverser les clics.
    boiteMot = el("div", "nb-mot");
    boiteMot.hidden = true;
    lblMot = el("span", "t");
    boiteMot.appendChild(lblMot);
    var croix = el("button", "x", "×");
    croix.type = "button";
    croix.title = "Fermer";
    croix.setAttribute("aria-label", "Fermer");
    croix.addEventListener("click", fermeMot);
    boiteMot.appendChild(croix);
    plateau.appendChild(boiteMot);

    racine.appendChild(plateau);

    // Le diamètre des jetons suit la largeur du plateau : agrandir le panneau
    // doit agrandir la table, pas semer des confettis.
    //
    // MONTÉ DE 5.5 À 6.8 POUR CENT depuis que le jeton porte une médaille
    // frappée et non plus un disque peint. Un dégradé se lit à seize pixels ;
    // une gravure, non : à l'ancienne taille le personnage devenait une tache
    // dorée et l'image ne servait à rien. Le plancher passe de 16 à 20 px, le
    // plafond de 30 à 38.
    function jauge() {
      var w = plateau.clientWidth || 320;
      plateau.style.setProperty("--jeton", clamp(Math.round(w * 0.068), 20, 38) + "px");
      // Le nombre de colonnes ne dépend QUE du nombre de joueurs, jamais de la
      // hauteur disponible. Quand il en dépendait, les places changeaient de
      // position d'un panneau à l'autre alors que les jetons, eux, sont en
      // millièmes du plateau entier : deux joueurs lisaient des comptes
      // différents du même état partagé (mesuré sur le même état : 3/2/3/2/2 à
      // 380x330 et 3/1/4/0/4 à 260x190). Les rangs, eux, se partagent la
      // hauteur à parts égales et les places n'ont plus de hauteur minimale :
      // aucune ne peut sortir du plateau, donc aucune ne devient inatteignable.
      var n = Math.max(1, conf.joueurs.length);
      var cols = Math.min(3, Math.ceil(n / 4));
      coteJoueurs.style.gridTemplateColumns = "repeat(" + cols + ", minmax(0, 1fr))";
      coteJoueurs.style.gridTemplateRows = "repeat(" + Math.ceil(n / cols) + ", minmax(0, 1fr))";
    }
    jaugeRef = jauge;
    if (window.ResizeObserver) new ResizeObserver(jauge).observe(plateau);
    window.addEventListener("resize", jauge);
    jauge();
  }

  // ---------- rendu ----------
  function places() {
    var l = [{ id: "mj", nom: conf.mj.nom || "MJ", img: conf.mj.img, mj: true }];
    conf.joueurs.forEach(function (j) { l.push({ id: j.id, nom: j.nom || "—", img: j.img, mj: false }); });
    return l;
  }

  function rend() {
    if (!racine) return;
    var l = places();
    var vus = {};
    // MJ à gauche, joueurs à droite : deux colonnes, chaque place occupant une
    // part égale de la sienne. Rien ne défile — un plateau qui défile perdrait
    // ses jetons hors de l'écran, et leurs coordonnées n'auraient plus de sens.
    l.forEach(function (p) {
      vus[p.id] = 1;
      var d = placesDom[p.id];
      var hote = p.mj ? coteMj : coteJoueurs;
      if (!d) {
        d = el("div", "nb-place" + (p.mj ? " nb-place-mj" : ""));
        // Une place est une CARTE du livre : un en-tête (nom en Cinzel, compte à
        // droite) souligné d'un filet, puis la table. Le nom n'est plus une
        // légende posée en bas à gauche qui se disputait la place avec le
        // portrait et se tronquait dès 260 pixels.
        var tete = el("div", "nb-place-tete");
        tete.appendChild(el("div", "nb-place-nom"));
        tete.appendChild(el("div", "nb-place-compte"));
        d.appendChild(tete);
        placesDom[p.id] = d;
      }
      if (d.parentNode !== hote) hote.appendChild(d);
      // LE FOND DE LA ZONE, à la place du portrait. Une image en fond, et non
      // plus une vignette de seize pixels dans l'en-tête, où elle ne montrait
      // rien de personne.
      //
      // On ne repeint que si la valeur CHANGE. Deux raisons, et la seconde
      // suffirait : réaffecter la même adresse relance la requête, ce qui
      // faisait clignoter l'ancien portrait cassé une fois par seconde ; et un
      // fond importé pèse deux cent mille caractères, qu'il serait absurde de
      // repasser au moteur de style à chaque relecture. Le repère est gardé en
      // JS et non dans un data- : une chaîne pareille dans un attribut du DOM
      // s'inspecte mal et se recopie deux fois.
      var f = fondDe(p);
      if (fondPose[p.id] !== f) {
        fondPose[p.id] = f;
        // Les guillemets et les obliques inverses sont ôtés de l'adresse : sans
        // cela, une URL fabriquée par n'importe quel joueur de la table
        // refermerait le url() et poserait ce qu'elle veut dans la règle de
        // style. Une adresse d'image n'en contient jamais, et un data: est du
        // base64, donc rien à perdre.
        d.style.backgroundImage = f ? 'url("' + f.replace(/["\\\s]/g, "") + '")' : "";
        d.classList.toggle("nb-fond", !!f);
      }
      var nom = d.querySelector(".nb-place-nom");
      nom.textContent = p.nom;
      // Un nom se tronque dans une place étroite, et c'est inévitable à 260
      // pixels de large : l'infobulle le rend entier, la table ne devient donc
      // jamais anonyme.
      nom.title = p.nom;
    });
    Object.keys(placesDom).forEach(function (id) {
      if (vus[id]) return;
      if (placesDom[id].parentNode) placesDom[id].parentNode.removeChild(placesDom[id]);
      delete placesDom[id];
      // le repère de fond suit la carte : le garder ferait qu'une place recréée
      // sous le même identifiant se croirait déjà peinte
      delete fondPose[id];
    });
    // l'ordre des cartes suit celui de la configuration
    l.forEach(function (p) { if (!p.mj) coteJoueurs.appendChild(placesDom[p.id]); });

    if (jaugeRef) jaugeRef();
    rendJetons();
    compte();
  }

  function rendJetons() {
    var vus = {}, deja = {};
    // une seule traversée pour retrouver les jetons déjà posés : un
    // querySelector par jeton et par tour, c'est cinquante recherches par
    // seconde sur l'onglet de chaque joueur
    Array.prototype.forEach.call(coucheJetons.children, function (e) {
      if (e.dataset && e.dataset.jeton) deja[e.dataset.jeton] = e;
    });
    Object.keys(points).forEach(function (id) {
      vus[id] = 1;
      var j = deja[id];
      if (!j) {
        j = el("div", "nb-jeton");
        j.dataset.jeton = id;
        // Le mot « narration » était GRAVÉ sur la face du jeton : mesuré à
        // 4.83 px de haut dans un disque de 21, à 3.64:1 de contraste en nuit,
        // ce n'était plus du texte mais une tache. Il ne reste que dans
        // l'infobulle, et le jeton porte un sillon (CSS) à la place.
        j.title = "Jeton de narration";
        j.addEventListener("pointerdown", saisit);
        coucheJetons.appendChild(j);
        // un jeton neuf ne glisse pas : il apparaît là où il est
        pose(j, points[id], false);
        return;
      }
      if (prise && prise.id === id) return;   // celui qu'on tient
      pose(j, points[id], true);
    });
    Array.prototype.forEach.call(coucheJetons.querySelectorAll("[data-jeton]"), function (j) {
      if (!vus[j.dataset.jeton]) coucheJetons.removeChild(j);
    });
  }
  function pose(j, p, anime) {
    var g = (p.x / MILLE * 100) + "%", h = (p.y / MILLE * 100) + "%";
    if (j.style.left === g && j.style.top === h) return;
    j.classList.toggle("glisse", !!anime);
    j.style.left = g;
    j.style.top = h;
  }

  // Le compte d'une place est une question de GÉOMÉTRIE : combien de jetons
  // tombent dans son rectangle. Rien n'est stocké, donc rien ne peut mentir.
  // Un plateau qu'on ne peut pas toucher doit le DIRE : sinon on pousse un
  // jeton, rien ne bouge, et on ne sait pas si c'est le droit qui manque ou le
  // logiciel qui a lâché. Trois empêchements, donc trois phrases distinctes, et
  // rien du tout quand tout va bien (le bandeau disparaît alors du panneau).
  function ditEmpechement() {
    if (!lblAvis) return;
    // Tant que le pont n'a pas dit quel est le personnage, on n'accuse
    // personne : « ecrivable » vaut faux au démarrage, et l'annoncer ferait
    // paraître un bandeau d'alerte pendant les deux premières secondes de
    // chaque ouverture, alors que rien n'est encore su. L'écran d'état, lui,
    // dit déjà ce qu'il faut si le pont ne répond pas.
    // Et tant que l'état n'est pas lu, on n'accuse pas davantage : l'écran de
    // lecture dit déjà où l'on en est, et « lecture seule » y ajouterait un
    // reproche qui n'est encore la faute de personne.
    if (!charId || !etatSur) { lblAvis.textContent = ""; return; }
    lblAvis.textContent =
      confFuture ? "Plateau réglé par une version plus récente : lecture seule."
      : !ecrivable ? "Lecture seule : ce personnage n'est pas partagé avec ce joueur."
      : refuse ? "Roll20 a refusé les dernières écritures : lecture seule."
      : "";
  }

  function compte() {
    ditEmpechement();   // avant la sortie anticipée : un empêchement se dit même panneau replié
    var base = coucheJetons.getBoundingClientRect();
    if (!base.width || !base.height) return;
    var zones = [];
    Object.keys(placesDom).forEach(function (id) {
      var r = placesDom[id].getBoundingClientRect();
      zones.push({ id: id, x1: r.left, y1: r.top, x2: r.right, y2: r.bottom, n: 0 });
    });
    var libres = 0, total = 0;
    Object.keys(points).forEach(function (id) {
      total++;
      var px = base.left + points[id].x / MILLE * base.width;
      var py = base.top + points[id].y / MILLE * base.height;
      var dans = null, meilleure = null, dmin = Infinity;
      for (var i = 0; i < zones.length; i++) {
        var z = zones[i];
        if (px >= z.x1 && px <= z.x2 && py >= z.y1 && py <= z.y2) { dans = z; break; }
        // distance au rectangle, pour la gouttière (voir plus bas)
        var dx = px < z.x1 ? z.x1 - px : px > z.x2 ? px - z.x2 : 0;
        var dy = py < z.y1 ? z.y1 - py : py > z.y2 ? py - z.y2 : 0;
        var d = Math.max(dx, dy);
        if (d < dmin) { dmin = d; meilleure = z; }
      }
      // Un jeton tombé dans le filet de quelques pixels qui sépare deux places
      // revient à la plus proche. Sans cela il serait « hors place » chez celui
      // qui a un grand panneau et chez son voisin sur un petit : le filet est
      // en pixels, tout le reste en proportions, et deux joueurs liraient des
      // comptes différents du même plateau.
      if (!dans && meilleure && dmin <= 6) dans = meilleure;
      if (dans) dans.n++; else libres++;
    });
    zones.forEach(function (z) {
      var c = placesDom[z.id].querySelector(".nb-place-compte");
      c.textContent = String(z.n);
      c.classList.toggle("zero", !z.n);
    });
    lblTotal.textContent = String(total);
    // Le zéro se dit en encre pâle et perd sa graisse, comme partout dans la
    // fiche : c'est un état neutre, pas une valeur à lire.
    boiteTotal.classList.toggle("zero", !total);
    lblHors.textContent = String(libres);
    boiteHors.hidden = !libres;
  }

  // ---------- déplacer un jeton ----------
  function saisit(ev) {
    // Un jeton qu'on ne peut pas enregistrer ne doit pas bouger du tout :
    // le voir glisser puis revenir au rafraîchissement suivant serait pire que
    // de ne pas pouvoir le prendre.
    if (!peutPousser() || (ev.button != null && ev.button !== 0)) return;
    var j = ev.currentTarget, id = j.dataset.jeton;
    if (!points[id]) return;
    var base = coucheJetons.getBoundingClientRect();
    prise = { id: id, el: j, bouge: false, x0: ev.clientX, y0: ev.clientY, base: base };
    j.classList.add("prise");
    j.classList.remove("glisse");
    try { j.setPointerCapture(ev.pointerId); } catch (e) {}
    ev.preventDefault();
  }
  function deplace(ev) {
    if (!prise) return;
    if (!prise.bouge &&
        Math.abs(ev.clientX - prise.x0) < 3 && Math.abs(ev.clientY - prise.y0) < 3) return;
    prise.bouge = true;
    var b = prise.base;
    var x = clamp((ev.clientX - b.left) / b.width * MILLE, 0, MILLE);
    var y = clamp((ev.clientY - b.top) / b.height * MILLE, 0, MILLE);
    points[prise.id] = { x: x, y: y };
    pose(prise.el, points[prise.id], false);
    vise(ev.clientX, ev.clientY);
  }
  function lache(ev) {
    if (!prise) return;
    var p = prise;
    prise = null;
    p.el.classList.remove("prise");
    vise(-1, -1);
    // UNE seule écriture, au lâcher : le pont écrit un attribut à la fois,
    // espacés, et Roll20 perd les rafales. Pendant le geste, personne d'autre
    // n'a besoin de voir chaque pixel.
    if (p.mort) {
      // quelqu'un a retiré ce jeton du plateau pendant qu'on le tenait : on ne
      // le remet pas sur la table par le seul fait de l'avoir eu en main
      delete points[p.id];
      rend();
      return;
    }
    if (p.bouge) ecrire(defObj(A_PT + p.id, ecritPoint(points[p.id])));
    compte();
  }
  function vise(x, y) {
    Object.keys(placesDom).forEach(function (id) {
      var r = placesDom[id].getBoundingClientRect();
      placesDom[id].classList.toggle("vise", x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
    });
  }
  function defObj(k, v) { var o = {}; o[k] = v; return o; }

  // ---------- réglages ----------
  // Tout ce que le MJ (ou n'importe qui, les droits Roll20 sont par personnage)
  // règle une fois par campagne : qui joue, sur quel fond, et combien de jetons
  // chacun reçoit au début d'une session.
  //
  // C'est un DIALOGUE posé sur le plateau, et non plus un voile opaque qui le
  // remplaçait : on règle qui joue en voyant la table. Les deux gestes qui
  // effacent les positions de tout le monde (distribuer, tout ramasser) ont leur
  // propre bloc « Session » : ce ne sont pas des réglages, ce sont des gestes de
  // partie, et ils n'ont rien à faire dans la même rangée que « Enregistrer ».
  // LES RÉGLAGES DEMANDENT DE LA PLACE, ET LE CADRE LA DONNE. Le plateau vit
  // dans une iframe dont la taille est fixée par l'extension : un dialogue ne
  // peut pas en sortir, et serré dans une colonne ancrée à la barre d'outils il
  // devenait illisible. On demande donc au cadre de s'agrandir et de se centrer
  // le temps du réglage, puis de reprendre sa place.
  //
  // Si personne n'écoute — page ouverte hors de Roll20, extension plus ancienne
  // que ce site — il ne se passe rien de fâcheux : le dialogue s'affiche comme
  // avant, à l'étroit mais entier.
  function cadreGrand(on) {
    try { window.top.postMessage({ ns: NS, type: "pan-grand", grand: !!on }, "*"); }
    catch (e) {}
  }
  function ouvreReglages() {
    var over = el("div", "nb-modal-over");
    var boite = el("div", "nb-modal");
    over.appendChild(boite);
    cadreGrand(true);
    var brouillon = JSON.parse(JSON.stringify(conf));

    boite.appendChild(el("div", "nb-modal-titre", "Réglages du plateau"));

    // ---- les places ----
    // Une liste, donc une ligne d'en-tête et des colonnes, comme les listes de
    // la fiche : répéter « NOM » et « FOND » sur chacune des douze lignes
    // faisait deux fois plus d'étiquettes que de valeurs. C'est aussi ce qui
    // laisse la ligne assez large pour ses deux boutons.
    boite.appendChild(groupe("Places", true));
    var head = el("div", "nb-ligne head");
    head.appendChild(el("span", "nb-rang", ""));
    head.appendChild(el("span", "nb-col nom", "Nom"));
    head.appendChild(el("span", "nb-col img", "Fond"));
    head.appendChild(el("span", "nb-creux", ""));   // colonne du bouton d'image
    head.appendChild(el("span", "nb-creux", ""));   // colonne du bouton « − »
    boite.appendChild(head);

    var lMj = el("div", "nb-ligne");
    lMj.appendChild(el("span", "nb-rang", "MJ"));
    var nomMj = champ("text", "Nom", brouillon.mj.nom, "MJ", "nom");
    var imgMj = champ("text", "Fond", brouillon.mj.img, "https://…", "img");
    lMj.appendChild(nomMj.f); lMj.appendChild(imgMj.f);
    lMj.appendChild(boutonFond("mj", imgMj.i));
    // le creux tient la colonne du bouton « − » que la ligne du MJ n'a pas :
    // sans lui, son champ de fond déborde de vingt-sept pixels sur les autres
    // et la colonne cesse d'être une colonne
    lMj.appendChild(el("span", "nb-creux", ""));
    boite.appendChild(lMj);

    var hote = el("div");
    boite.appendChild(hote);
    function rendJoueurs() {
      hote.innerHTML = "";
      brouillon.joueurs.forEach(function (j, i) {
        // une ligne sur deux prend la bande : c'est le zébrage de la fiche,
        // posé en JS parce que le nombre de lignes change
        var l = el("div", "nb-ligne" + (i % 2 ? " odd" : ""));
        l.appendChild(el("span", "nb-rang", String(i + 1)));
        var n = champ("text", "Nom", j.nom, "Nom du personnage", "nom");
        var g = champ("text", "Fond", j.img, "https://…", "img");
        n.i.addEventListener("input", function () { j.nom = n.i.value; });
        g.i.addEventListener("input", function () { j.img = g.i.value; });
        var moins = el("button", "nb-btn danger", "−");
        moins.type = "button";
        moins.title = "Retirer cette place";
        moins.setAttribute("aria-label", "Retirer cette place");
        moins.addEventListener("click", function () {
          brouillon.joueurs.splice(i, 1);
          rendJoueurs();
        });
        l.appendChild(n.f); l.appendChild(g.f);
        l.appendChild(boutonFond(j.id, g.i));
        l.appendChild(moins);
        hote.appendChild(l);
      });
      var rangee = el("div", "nb-session");
      var plus = el("button", "nb-btn", "Ajouter un joueur");
      plus.type = "button";
      plus.addEventListener("click", function () {
        var id;
        do {
          brouillon.seq++;
          id = "j" + brouillon.seq;
        } while (brouillon.joueurs.some(function (x) { return x.id === id; }));
        brouillon.joueurs.push({ id: id, nom: "", img: "" });
        rendJoueurs();
      });
      rangee.appendChild(plus);
      hote.appendChild(rangee);
      // la liste vient d'être refaite : ses boutons neufs doivent retomber sous
      // le même verrou que le reste
      verrouille();
    }
    rendJoueurs();

    // ---- la donne ----
    boite.appendChild(groupe("Donne"));
    boite.appendChild(el("p", "nb-note", "Jetons posés sur chaque place au début d'une session."));
    var lDonne = el("div", "nb-ligne");
    var dMj = champ("number", "MJ", brouillon.donne.mj, "", "don");
    var dJ = champ("number", "Par joueur", brouillon.donne.joueur, "", "don");
    lDonne.appendChild(dMj.f); lDonne.appendChild(dJ.f);
    boite.appendChild(lDonne);

    // ---- l'affichage ----
    // Le menu à trois états de la fiche, à l'identique : c'est le seul qui sache
    // dire « auto ». Le bouton de la barre, lui, ne fait que basculer.
    boite.appendChild(groupe("Affichage"));
    var lAff = el("div", "nb-ligne");
    var fAff = el("div", "nb-f");
    fAff.appendChild(el("label", null, "Mode"));
    var selNuit = el("select", "nb-select");
    [["auto", "Selon Roll20"], ["0", "Jour"], ["1", "Nuit"]].forEach(function (o) {
      var op = el("option", null, o[1]);
      op.value = o[0];
      selNuit.appendChild(op);
    });
    selNuit.value = nuitPref();
    selNuit.setAttribute("aria-label", "Mode d'affichage");
    // Un réglage d'affichage n'est pas un réglage de plateau : il reste ouvert
    // même en lecture seule, où l'on ne fait justement que regarder.
    selNuit.dataset.libre = "1";
    selNuit.addEventListener("change", function () { poseNuit(selNuit.value); });
    fAff.appendChild(selNuit);
    lAff.appendChild(fAff);
    boite.appendChild(lAff);

    // ---- la session ----
    boite.appendChild(groupe("Session"));
    boite.appendChild(el("p", "nb-note", "Ces deux gestes replacent les jetons de toute la table."));
    var session = el("div", "nb-session");
    var bDist = el("button", "nb-btn danger", "Distribuer");
    bDist.type = "button";
    bDist.title = "Replace les jetons : la donne de chacun sur sa place";
    // Deux temps. Le premier clic ne fait que demander : distribuer efface les
    // positions de tout le monde, et le bouton d'à côté est celui qu'on presse
    // le plus souvent (corriger un nom).
    var arme = null;
    bDist.addEventListener("click", function () {
      if (!arme) {
        arme = setTimeout(function () { arme = null; bDist.textContent = "Distribuer"; bDist.classList.remove("arme"); }, 3000);
        bDist.textContent = "Confirmer ?";
        bDist.classList.add("arme");
        return;
      }
      clearTimeout(arme);
      arme = null;
      recolte();
      conf = litConf(JSON.stringify(brouillon));
      ferme();
      rend();
      distribue();
    });
    var bRamasse = el("button", "nb-btn danger", "Tout ramasser");
    bRamasse.type = "button";
    bRamasse.title = "Ramène tous les jetons du plateau chez le MJ";
    bRamasse.addEventListener("click", function () { ferme(); ramasse(); });
    session.appendChild(bDist);
    session.appendChild(bRamasse);
    boite.appendChild(session);

    // ---- les actions du dialogue ----
    var actions = el("div", "nb-actions");
    var bFerme = el("button", "nb-btn", "Fermer");
    bFerme.type = "button";
    bFerme.dataset.libre = "1";   // on peut toujours sortir, même sans droit d'écrire
    bFerme.addEventListener("click", ferme);
    var bOk = el("button", "nb-btn primary", "Enregistrer");
    bOk.type = "button";
    bOk.addEventListener("click", function () {
      recolte();
      conf = litConf(JSON.stringify(brouillon));
      var lot = defObj(A_CONF, JSON.stringify(conf));
      // UNE PLACE RETIRÉE EMPORTE SON FOND. Un attribut de deux cent mille
      // caractères qui ne se rattache plus à rien resterait sinon dans le
      // personnage, invisible, et serait relu par chaque joueur à chaque tour.
      // C'est le seul endroit qui sache qu'une place vient de disparaître.
      var vivants = { mj: 1 };
      conf.joueurs.forEach(function (j) { vivants[j.id] = 1; });
      Object.keys(fonds).forEach(function (id) { if (!vivants[id]) lot[A_BG + id] = ""; });
      ecrire(lot);
      ferme();
      rend();
    });
    actions.appendChild(bFerme);
    actions.appendChild(bOk);
    boite.appendChild(actions);

    boite.appendChild(el("p", "nb-aide",
      "Le plateau vit dans les Attributes du personnage « Narration ». "
      + "Tous ceux qui le contrôlent peuvent pousser les jetons."));

    if (!peutPousser()) {
      boite.appendChild(el("p", "nb-aide", "Lecture seule : les réglages ne peuvent pas être enregistrés."));
    }
    verrouille();

    // Le voile se ferme au clic à côté et à la touche d'échappement : le
    // dialogue couvre un panneau qui fait parfois 260 pixels de large, où le
    // bouton « Fermer » peut avoir défilé hors de vue.
    over.addEventListener("pointerdown", function (ev) { if (ev.target === over) ferme(); });
    document.addEventListener("keydown", auClavier);
    racine.appendChild(over);
    (nomMj.i).focus();

    function auClavier(ev) { if (ev.key === "Escape" || ev.key === "Esc") ferme(); }
    function ferme() {
      document.removeEventListener("keydown", auClavier);
      if (over.parentNode) over.parentNode.removeChild(over);
      cadreGrand(false);   // le cadre reprend sa place
    }
    // Les champs qui ne se surveillent pas au fil de la frappe (le MJ, la donne)
    // sont relus ICI, au moment d'agir : les deux boutons qui écrivent doivent
    // partir du même brouillon, et le compteur d'identifiants ne redescend
    // jamais (le brouillon date de l'ouverture, quelqu'un a pu distribuer
    // entre-temps).
    function recolte() {
      brouillon.mj.nom = nomMj.i.value;
      brouillon.mj.img = imgMj.i.value;
      brouillon.donne.mj = clamp(entier(dMj.i.value, 3), 0, 40);
      brouillon.donne.joueur = clamp(entier(dJ.i.value, 3), 0, 40);
      brouillon.seq = Math.max(entier(brouillon.seq, 0), entier(conf.seq, 0));
    }
    function verrouille() {
      if (peutPousser()) return;
      Array.prototype.forEach.call(boite.querySelectorAll("button, input, select"), function (e) {
        if (e.dataset && e.dataset.libre === "1") return;
        e.disabled = true;
      });
    }
    // UN SEUL BOUTON POUR LE FOND, DONT LE SENS SUIT L'ÉTAT : « … » ouvre le
    // sélecteur de fichier, « × » retire l'image déjà importée. Deux boutons
    // côte à côte dans une ligne de deux cent quatre-vingts pixels, c'est la
    // colonne du nom qui disparaît ; et l'un des deux serait toujours inutile.
    //
    // L'image est écrite TOUT DE SUITE, sans passer par « Enregistrer » :
    // l'image a son propre attribut, elle n'attend pas la configuration, et
    // faire attendre un envoi de deux cent mille caractères derrière un bouton
    // qu'on peut oublier de presser serait le meilleur moyen de le perdre.
    function boutonFond(id, entree) {
      var b = el("button", "nb-btn", "…");
      b.type = "button";
      function etat() {
        var pose = !!fonds[id];
        b.textContent = pose ? "×" : "…";
        var t = pose ? "Retirer l'image" : "Importer une image";
        b.title = t;
        b.setAttribute("aria-label", t);
        // Une URL sous une image importée ne sert à rien tant que l'image est
        // là : le champ se tait plutôt que de mentir sur ce qu'on voit.
        entree.disabled = pose || !peutPousser();
        entree.placeholder = pose ? "image importée" : "https://…";
      }
      b.addEventListener("click", function () {
        if (fonds[id]) { retireFond(id); etat(); return; }
        // L'entrée de fichier n'est pas dans le dialogue : elle n'y servirait
        // qu'à occuper une colonne. Créée au clic, elle meurt avec lui.
        var f = el("input");
        f.type = "file";
        f.accept = "image/*";
        f.addEventListener("change", function () {
          if (f.files && f.files[0]) poseFond(id, f.files[0], etat);
        });
        f.click();
      });
      etat();
      return b;
    }
    // Un titre de groupe : Cinzel, prolongé par un filet jusqu'au bord.
    function groupe(t, premier) { return el("div", "nb-groupe" + (premier ? " premier" : ""), t); }
    // Un champ du livre : une micro-étiquette en capitales espacées, et un
    // souligné qui rougit au focus. Jamais une boîte.
    function champ(type, lab, val, ph, cls) {
      var f = el("div", "nb-f" + (cls ? " " + cls : ""));
      // Dans une liste, l'étiquette est en tête de colonne et non sur chaque
      // ligne : le champ ne porte alors que son aria-label, pour que la colonne
      // reste nommée au lecteur d'écran.
      if (!cls || (cls !== "nom" && cls !== "img")) f.appendChild(el("label", null, lab));
      var i = el("input");
      i.type = type;
      i.value = val == null ? "" : val;
      if (ph) i.placeholder = ph;
      if (type === "number") { i.min = 0; i.max = 40; }
      i.setAttribute("aria-label", lab);
      f.appendChild(i);
      return { f: f, i: i };
    }
  }

  // ---------- distribution ----------
  // Réutiliser les identifiants existants avant d'en créer : sur dix sessions,
  // créer à chaque fois laisserait des dizaines d'attributs morts dans le
  // personnage. Ce qui dépasse est vidé (valeur vide = jeton retiré).
  function distribue() {
    var l = places();
    var voulus = [];
    l.forEach(function (p) {
      var n = p.mj ? conf.donne.mj : conf.donne.joueur;
      for (var i = 0; i < n; i++) voulus.push(p.id);
    });
    // Réutiliser d'abord ce qu'on a sous les yeux, puis tout ce que Roll20
    // connaît : sans cette union, deux distributions successives par deux
    // joueurs laissaient sur le plateau les jetons créés par l'autre.
    var libres = Object.keys(points);
    Object.keys(connus).forEach(function (id) { if (libres.indexOf(id) < 0) libres.push(id); });
    var lot = {}, neuf = {};
    voulus.forEach(function (placeId, i) {
      // On REPREND d'abord les jetons existants (les nôtres, puis ceux que
      // Roll20 connaît) : les recréer laisserait les anciens sur la table.
      var id = libres[i];
      if (!id || neuf[id]) {
        // Un identifiant NEUF, lui, ne doit jamais retomber sur un vivant : le
        // compteur peut avoir régressé (configuration relue vide, brouillon
        // ouvert avant une distribution), et deux jetons de même nom, c'est un
        // jeton perdu sans un mot.
        do {
          conf.seq++;
          id = "p" + conf.seq;
        } while (points[id] || neuf[id] || connus[id]);
      }
      var pos = auHasardDans(placeId);
      neuf[id] = pos;
      lot[A_PT + id] = ecritPoint(pos);
    });
    libres.slice(voulus.length).forEach(function (id) { lot[A_PT + id] = ""; });
    points = neuf;
    lot[A_CONF] = JSON.stringify(conf);
    ecrire(lot);
    rend();
  }
  function ramasse() {
    var lot = {};
    Object.keys(points).forEach(function (id) {
      points[id] = auHasardDans("mj");
      lot[A_PT + id] = ecritPoint(points[id]);
    });
    ecrire(lot);
    rend();
  }
  // Une position au hasard DANS une place, avec une marge : les jetons se
  // chevauchent un peu, comme sur une vraie table, mais aucun ne déborde chez
  // le voisin ni ne se pose sur l'en-tête de la carte : la distribution
  // masquerait justement le nom et le compte qu'elle vient de changer.
  function auHasardDans(placeId) {
    var d = placesDom[placeId], base = coucheJetons.getBoundingClientRect();
    if (!d || !base.width) return { x: 500, y: 500 };
    var r = d.getBoundingClientRect();
    var tete = d.querySelector(".nb-place-tete");
    // La réserve d'en-tête est bornée à 40 % de la carte : dans une place très
    // basse (douze joueurs dans un panneau minimal), la réserve entière ne
    // laisserait plus de hauteur, et les jetons tomberaient sous la carte,
    // c'est-à-dire « hors place ».
    var haut = tete ? Math.min(tete.getBoundingClientRect().height + 2, r.height * 0.4) : 0;
    var mx = Math.min(18, r.width * 0.18), my = Math.min(12, r.height * 0.12);
    var x = r.left + mx + Math.random() * Math.max(1, r.width - 2 * mx);
    var y = r.top + haut + my + Math.random() * Math.max(1, r.height - haut - 2 * my);
    return {
      x: clamp((x - base.left) / base.width * MILLE, 0, MILLE),
      y: clamp((y - base.top) / base.height * MILLE, 0, MILLE)
    };
  }

  // ---------- états visibles ----------
  var etatMontre = null;
  function montreEtat(quoi) {
    // un message peut arriver avant le premier rendu : rien à montrer, et
    // surtout rien à effacer
    if (!racine) return;
    // Le plateau redemande son personnage tant qu'il ne l'a pas : sans cette
    // garde, l'écran d'attente se reconstruirait toutes les 1.2 s et le bouton
    // se déroberait sous le doigt.
    if (quoi === etatMontre) return;
    etatMontre = quoi;
    var vieux = racine.querySelector(".nb-etat");
    if (vieux) racine.removeChild(vieux);
    if (!quoi) return;
    var e = el("div", "nb-etat");
    if (quoi === "absent") {
      e.appendChild(el("div", "nb-titre", "Aucun plateau dans cette campagne"));
      e.appendChild(el("div", "nb-detail",
        "Le MJ crée un personnage nommé exactement « Narration », le met dans le journal "
        + "des joueurs, et le rend modifiable et contrôlable par tous les joueurs."));
    } else if (quoi === "pont") {
      e.appendChild(el("div", "nb-titre", "Roll20 ne répond pas"));
      e.appendChild(el("div", "nb-detail",
        "Le plateau n'a pas trouvé le pont de l'extension. Recharger la partie suffit d'ordinaire."));
    } else if (quoi === "attente") {
      // Le temps que Roll20 charge les attributs du personnage. Deux secondes en
      // général, et rien à faire pendant : pas de bouton, pas d'explication.
      e.appendChild(el("div", "nb-titre", "Lecture du plateau…"));
    } else if (quoi === "ouverture") {
      // Le pont n'a pas réussi à ouvrir la fiche « Narration », donc les
      // attributs restent illisibles. Le dire pour ce que c'est : ce n'est pas
      // Roll20 qui refuse d'écrire, c'est l'état qu'on n'a pas pu lire.
      e.appendChild(el("div", "nb-titre", "Plateau illisible"));
      e.appendChild(el("div", "nb-detail", ecrivable
        ? "Ouvrir une fois le personnage « Narration » dans le journal."
        : "Ce personnage n'est pas partagé avec ce joueur."));
    }
    if (quoi !== "attente") {
      // seule action de l'écran, donc la seule qui ait droit au plein carmin
      var b = el("button", "nb-btn primary", "Réessayer");
      b.type = "button";
      b.addEventListener("click", function () { montreEtat(null); demandePerso(true); });
      e.appendChild(b);
    }
    racine.appendChild(e);
  }

  // ---------- amorce ----------
  function demarre() {
    bati();
    // Le châssis de l'extension accepte depuis toujours qu'une page se NOMME
    // elle-même (canal { type: "panneau", titre }), et personne ne s'en était
    // jamais servi : la barre de titre disait « Narration » en dur. Le titre
    // appartient à la page, donc le renommer ne coûte pas une signature. On ne
    // pousse en revanche NI largeur NI hauteur : le châssis les range, et les
    // imposer à chaque chargement écraserait la taille choisie par le joueur.
    post({ type: "panneau", titre: "Plateau de Narration", nuit: nuitActive() });
    // Un plateau vide tant qu'on n'a rien lu serait un mensonge : on ne montre
    // la table qu'une fois qu'on sait ce qu'il y a dessus.
    montreEtat("attente");
    demandePerso();
    // « Roll20 ne répond pas » ne vaut que si le pont n'a RIEN dit. S'il a
    // répondu qu'il n'y a pas de plateau, c'est cet écran-là qu'il faut garder :
    // le premier était plus tardif, il effaçait le second.
    setTimeout(function () { if (!repondu) montreEtat("pont"); }, ATTENTE_PONT);
    document.addEventListener("pointermove", deplace);
    document.addEventListener("pointerup", lache);
    document.addEventListener("pointercancel", lache);
    // Relecture régulière : c'est tout le « temps réel » du plateau. La page
    // cachée (panneau replié, onglet en arrière-plan) ne demande rien.
    var tour = 0;
    setInterval(function () {
      tour++;
      // Panneau replié : l'extension masque l'iframe, dont la fenêtre tombe
      // alors à zéro pixel. Rien à interroger pour un plateau que personne ne
      // regarde — et c'est la PAGE qui en décide, donc cela se change sans
      // toucher à l'extension signée.
      if (document.hidden || !window.innerWidth || !window.innerHeight) return;
      if (!charId) {
        // pas de plateau dans cette campagne : on regarde de loin en loin, au
        // cas où le MJ viendrait de créer le personnage
        if (repondu && tour % 4) return;
        demandePerso();
        return;
      }
      // De temps en temps, redemander le personnage : un partage accordé en
      // cours de partie doit finir par se voir, sans recharger la page.
      if (tour % 10 === 0) post({ type: "narration-char" });
      demandeEtat();
    }, POLL);
    rend();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarre);
  else demarre();
})();
