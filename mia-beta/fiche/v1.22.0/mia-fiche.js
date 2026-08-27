/* Créateur de personnage MIA — onglet « Création » du site.
 *
 * Mise en page « dossier » transposée du créateur HxH : barre d'outils avec la
 * bibliothèque, feuille à largeur fixe, en-tête portrait + identité, compteurs
 * de budgets, onglets (Fiche / Art / Équipement / Bio / Options), colonnes,
 * valeurs cliquables pour lancer les jets, journal de jets flottant.
 * La Fiche a trois colonnes (caractéristiques | combat | compétences), tout
 * dans l'ordre Body, Mind, Prestance ; une ligne par compétence (nom | stade
 * en menu | total-jet). L'onglet Art porte les TECHNIQUES et les PASSIFS :
 * une liste libre, une entrée par art, chacune avec son effet de base et ses
 * améliorations. Une technique coûte de l'endurance à l'emploi, un passif non ;
 * pour le reste les deux sont identiques.
 *
 * ATTENTION : tout ce qui suit ce paragraphe décrit encore les règles de JJK
 * (trois caractéristiques, stades, 120 points à la création) et non celles de
 * MIA. C'est un fossile, à reprendre en entier — pas au détour d'un ajout.
 * Chaque module éditable porte un rouage (mode édition par module) : la
 * construction du personnage est verrouillée hors édition, seuls les gestes
 * de jeu restent actifs (jets, tchat, PV, endurance, quantités, notes).
 *
 * Le contenu des règles (caractéristiques, listes de compétences, stades,
 * vitesses, difficultés, blessures, courbes d'armes/armures, actions) vient de
 * mia-creation.json, généré au build par hooks/mia_creation.py depuis la page
 * de règles. Ce fichier porte la sémantique d'interface et les règles de
 * calcul prosaïques :
 *   - création : 120 points à répartir dans les 3 caractéristiques (0 à 80) ;
 *   - 500 xp à la création (total modifiable) ; 20 xp par stade de compétence
 *     (Non initié, Initié, Maitre, Expert, Artiste), 20 xp par +5 de
 *     caractéristique (limite 80 sans avantage) ; le stade Artiste (sans bonus
 *     propre) ouvre l'art et les passifs de la compétence : le passif
 *     original est inclus dans le stade, les suivants coûtent 20 xp pièce ;
 *   - pas plus d'un quart de l'xp total investi dans une seule compétence ;
 *   - PV max = (20 + Body) / 2 ; récupération Body/10 PV par jour ;
 *   - jet = 1d100 + caractéristique (+ bonus de stade pour une compétence) ;
 *     96+ au dé : coup critique ; 5 ou moins : échec critique.
 *
 * Persistance : localStorage « mia-perso » (état), « mia-cards » (cartes
 * calculées, _current = brouillon), « mia-persos » (bibliothèque). Clés
 * préfixées mia- : le site partage son origine avec le site HxH.
 *
 * Dans Roll20 (l'extension affiche roll20-fiche.html, servie par CE site),
 * javascripts/mia-roll20-boot.js pose AVANT ce script :
 *   - window.__miaLocalStorage : persistance -> Attributes Roll20 (via STORE) ;
 *   - window.__miaRoll : les jets partent dans le tchat Roll20 ;
 *   - window.__miaCompact : masque la barre d'outils et la bibliothèque.
 */
(function () {
  "use strict";

  var COMPACT = typeof window !== "undefined" && window.__miaCompact === true;
  // Persistance : le localStorage du navigateur sur le site ; dans Roll20, la
  // page d'amorce pose window.__miaLocalStorage (shim -> Attributes Roll20)
  // avant ce script. Les appels sont tous sous try/catch : STORE peut être nul
  // (stockage refusé par le navigateur) sans casser la fiche.
  var STORE = (typeof window !== "undefined" && window.__miaLocalStorage) ||
              (function () { try { return window.localStorage; } catch (e) { return null; } })();
  var DATA = null;
  var state = null;

  // ---------- version ----------
  // RELEASE est ce qu'on montre, SCHEMA est ce qui compte. Les deux sont
  // désormais INDÉPENDANTS : le schéma est un entier libre, que rien ne
  // déduit du majeur de la release, et le manifeste les publie séparément.
  // Un mod qui ferait parseInt(Mia.version) pour en tirer le schéma se
  // tromperait dès la première fois où les deux divergeront.
  //
  // Le SCHÉMA ne monte QUE lorsqu'une donnée EXISTANTE change de forme ou de
  // sens (renommage, fusion, déplacement, changement de type). Ajouter une
  // clé racine avec un défaut n'en est pas un : normalize() la complète et ne
  // purge aucune clé racine inconnue, donc une telle fiche s'ouvre dans les
  // deux sens sans migration. C'est ce qui permettra de livrer la disposition
  // des modules puis les mods sans forcer un 4.0.0 puis un 5.0.0.
  //
  // À l'inverse, une petite mise à jour (le Z de X.Y.Z) ne doit JAMAIS toucher
  // au format de l'état du personnage : c'est ce qui autorise une seule
  // archive par ligne X.Y, et c'est le seul garde-fou qui reste depuis que
  // l'écran de version ne paraît plus qu'au désaccord de schéma.
  //
  // Le suffixe « b » marque la branche beta, pour que le joueur voie sur quel
  // site il est. Il ne change PAS le rang : « 1.0.1b » et « 1.0.1 » sont de
  // même version, parce que la beta est ce que le site stable recevra à la
  // fusion (MiaMods.compareVersions tient cette règle).
  var RELEASE = "1.22.0";
  var SCHEMA = 4;

  // ---------- ce que la fiche ne décide PAS ----------
  // Les barèmes du jeu ne sont plus ici : ils viennent de DATA, c'est-à-dire de
  // la page de règles relue au build par hooks/mia_creation.py. La table
  // « Valeur / MOD / LIM / XP cumulés » donne les vingt et une lignes déjà
  // calculées, le prestige donne le plafond, et les multiplicateurs de
  // l'initiative, de la vitesse, des sauts et de la récupération sont pêchés
  // dans les formules de la page. Aucun nombre de règle ne s'écrit dans ce
  // fichier — c'est la seule façon qu'une règle corrigée arrive à l'outil.
  //
  // LES REPLIS CI-DESSOUS NE SONT PAS DES RÈGLES : ce sont les valeurs qu'on
  // sert quand DATA manque (données trop anciennes, fetch expiré, fiche ouverte
  // hors ligne). Ils évitent une fiche qui ne s'ouvre pas ; ils ne prétendent
  // pas dire le jeu, et lire une règle ici serait une faute.
  var REPLI = {
    prestigeMax: 20,
    xpComp: 1, xpSpe: 0.25,       // ce que coûte un point de compétence, de spécialité
    speMarge: 50,                 // la marge sous la limite au-delà de laquelle on avertit
    // LES LANGUES. La page de règles n'en dit pas un mot : ni la
    // caractéristique dont elles relèvent, ni les seuils de leurs trois
    // niveaux. Ces deux-là sont donc posés ICI, faute de mieux — et le jour où
    // la page les dira, DATA prendra le dessus sans qu'on rouvre un fichier.
    langueCarac: "MEN",
    langueNiveaux: [100, 150, 200],
    endurAction: 50,              // endurance dépensable sur une même action
    iniMult: 2, iniMainsNues: 20,
    vitesseCarre: true, vitesseMult: 2,   // « AGI × AGI » ; le second ne sert que si la page repasse à « AGI × n »
    sautLong: 1.75, sautHaut: 2, recupMult: 2, recupEndurMult: 2
  };

  var MOD_PAS = 5;            // tous les modificateurs se règlent de 5 en 5
  // LA BORNE D'UN FACTEUR, et elle n'est pas celle d'un ajout. Les ajouts vont
  // jusqu'à 999 ou 9999 selon l'échelle du levier ; un facteur, lui, MULTIPLIE :
  // ×999 sur une limite de 1000 en ferait 999 000, ce qui ne veut rien dire. Cent
  // fois la valeur des règles est déjà au-delà de tout ce qu'une partie demande.
  var MULT_BORNE = 100;

  // LES PALIERS DE CHARGE. Leurs SEUILS se lisent dans les données (la table
  // « Charge / Effets » de la page) ; leurs EFFETS, eux, sont du code, parce
  // qu'une division par 1,5 ne se lit pas dans une phrase française. Les deux
  // doivent donc bouger ENSEMBLE : un palier ajouté à la page sans sa ligne ici
  // s'afficherait au joueur sans rien peser sur ses chiffres.
  //
  // Ils se CUMULENT : à 100 % de charge, l'esquive a pris −10, −40 puis −100,
  // et les sauts ont été divisés par 3 puis par 4.
  var CHARGE_EFFETS = {
    50:  { ini: -50,  esq: -10 },
    75:  { esq: -40,  vitesseDiv: 1.5, sautDiv: 3 },
    100: { esq: -100, vitesseDiv: 2, iniDiv: 2, sautDiv: 4 }
  };
  // La charge frappe « l'esquive », et l'esquive est une SPÉCIALITÉ que le
  // joueur nomme lui-même. On la reconnaît donc par son nom, à la casse près :
  // une fiche qui n'en porte pas ne subit simplement rien.
  var CHARGE_ESQUIVE = "Esquive";

  // LE DÉ DES JETS. Un jet MIA n'est pas un dé nu : c'est un couple
  // « 1d100 + bonus » et « la limite », dont Roll20 ne garde que le plus bas
  // (kl1). La limite plafonne donc le résultat, et le tchat l'affiche déjà
  // plafonné. Ce champ ne porte que la partie ALÉATOIRE ; jetExpr() bâtit le
  // reste autour d'elle.
  var DE_DEFAUT = "1d100";

  // LES DEUX SEUILS DU CRITIQUE : échec de 1 à 5, réussite de 96 à 100. Écrits
  // en marqueurs Roll20 (« cs> » la réussite critique, « cf< » l'échec), ils
  // font surligner le dé dans le tchat — c'est Roll20 qui les rend, la fiche ne
  // fait que les transporter.
  //
  // CES DEUX NOMBRES SONT ÉCRITS ICI, ET ILS NE DEVRAIENT PAS L'ÊTRE. Tout le
  // reste des chiffres du jeu vient de la page de règles, relue au build ; le
  // critique, lui, n'y est pas encore écrit. Le jour où la page le dira, ces
  // deux-là doivent partir dans DATA comme les autres — sans quoi une règle
  // corrigée dans le livre laisserait l'outil sur l'ancienne.
  var CRIT_REUSSITE = 96;
  var CRIT_ECHEC = 5;
  var CRIT_DEFAUT = "cs>" + CRIT_REUSSITE + "cf<" + CRIT_ECHEC;
  var DE_TEST_DEFAUT = DE_DEFAUT + CRIT_DEFAUT;

  // ---------- outils ----------
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  // URL du jeu de données. Une ARCHIVE de version embarque son propre
  // mia-creation.json, gelé à sa date : l'amorce le désigne par
  // window.__miaDataUrl avant d'injecter le bundle. Sans lui, un bundle
  // d'archive lirait les règles d'AUJOURD'HUI, et un renommage de compétence
  // suffirait à trahir la version qu'on croit rejouer.
  // Une archive est gelée par LIGNE X.Y, à la première release de la ligne :
  // les règles qu'elle embarque sont donc celles de ce jour-là, et un
  // correctif ultérieur qui les retoucherait ne serait archivé nulle part.
  function dataUrl() {
    var u = typeof window !== "undefined" ? window.__miaDataUrl : null;
    return u || (siteBase() + "mia-creation.json");
  }
  function siteBase() {
    var l = document.querySelector('link[href*="assets/"], script[src*="assets/"]');
    var u = l ? (l.href || l.getAttribute("src")) : null;
    if (u) { var i = u.indexOf("assets/"); if (i >= 0) return u.slice(0, i); }
    return new URL(".", location.href).href;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(v, d) { var n = parseInt(v, 10); return isNaN(n) ? d : n; }
  // poids : décimal positif, virgule tolérée à la saisie, arrondi au centième
  function pnum(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
  }
  // affichage des poids : point décimal, sans zéros de traîne (« 0.5 », « 3 »)
  function fmtP(n) { return String(Math.round(n * 100) / 100); }
  // modificateurs divers : TOUJOURS un tableau de 3 emplacements (équipement /
  // art / décision du MJ), sommés dans la valeur effective — le geste de la
  // fiche HxH. modArr assainit ce qui entre, modSum totalise.
  function modArr(a) {
    if (!Array.isArray(a)) a = [];
    var out = [0, 0, 0];
    for (var i = 0; i < 3; i++) {
      var n = parseFloat(a[i]);
      out[i] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -999, 999) : 0;
    }
    return out;
  }
  function modSum(a) {
    var t = 0;
    (a || []).forEach(function (n) { if (isFinite(n)) t += n; });
    return Math.round(t * 100) / 100;
  }
  function nowStamp() { return new Date().toISOString(); }
  function sign(n) { return n >= 0 ? "+" + n : String(n).replace("-", "−"); }
  // les compétences commencent toujours par une majuscule (« apnée » -> « Apnée »)
  function capFirst(t) { t = String(t == null ? "" : t); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }

  // ---------- état ----------
  // LES CARACTÉRISTIQUES ET LES COMPÉTENCES SONT DES OBJETS VIDES, et c'est une
  // décision, pas un oubli. Leurs clés sont les sigles des règles (FOR, DEX…,
  // PHY, COM…), que seul DATA connaît — or blank() tourne AUSSI dans
  // mia-attr-map.js, du côté Roll20, où les données ne sont pas chargées. Une
  // liste écrite en dur y divergerait de la page de règles au premier sigle
  // ajouté, sans que rien ne le dise. Tout se lit donc par accesseur, et une
  // clé absente vaut zéro.
  function blank() {
    return {
      v: SCHEMA, rel: RELEASE,
      name: "", portrait: "", espece: "", age: "", sexe: "", genre: "",
      defaut: "", qualites: ["", ""], background: "", notes: "",
      avantages: [],

      // LE PRESTIGE, qui plafonne CHAQUE caractéristique. Il se force comme le
      // reste (bloc Création des Options) : une valeur imposée, ou un
      // modificateur du barème.
      prestige: 0, prestigeMod: 0, prestigeForce: null,

      // sigle -> points achetés. Les modificateurs sont DEUX (l'équipement,
      // puis l'arbitrage) : un seul champ obligeait à additionner de tête
      // avant de saisir, et à défaire le calcul pour en retirer un.
      // LE BONUS s'ajoute à la VALEUR, après le plafond du prestige : il peut
      // donc porter une caractéristique au-delà de ce que le prestige permet,
      // comme en dessous de zéro. Il se règle sur la FICHE, dans le module des
      // caractéristiques, et non plus dans les Options.
      // LES ARTS : techniques et passifs, une liste libre que le joueur remplit.
      // Clé RACINE, et c'est délibéré — normalize() complète l'état reçu sans
      // jamais reconstruire sa racine, donc une version qui ne connaît pas les
      // arts les garde intacts au lieu de les jeter.
      arts: [],
      // LES LANGUES : des spécialités « passives », qui n'ajoutent pas le MOD
      // de leur caractéristique. Liste à part et non un drapeau sur une
      // spécialité — elles ont leur module, et une entrée qui paraîtrait dans
      // les deux listes finirait par s'y contredire.
      langues: [],
      caracs: {}, caracsBonus: {},

      // LES CINQ LEVIERS DU MENEUR, ET UNE SEULE CLÉ POUR LES CINQ. Ils ne
      // touchent ni la valeur achetée ni le bonus qu'elle porte sur la fiche :
      // ils règlent ce que la caractéristique DONNE (son modificateur, sa
      // limite, l'écart qu'elle impose aux spécialités), ce qui la BORNE (son
      // plafond) et ce qu'elle COÛTE.
      //
      // Chacun porte la même chaîne, par caractéristique :
      //   force            une valeur imposée, qui court-circuite tout
      //   a1 a2  m1 m2  a3 a4   sinon ((base + a1 + a2) × m1 × m2) + a3 + a4
      //
      // ÉPARSE À TOUS LES NIVEAUX, et c'est ce qui la rend tenable : un levier
      // auquel personne n'a touché ne pèse pas un octet. La table entière
      // voyage dans UN attribut Roll20 — huit clés plates par boîte en auraient
      // fait trente-cinq, à recopier à la main dans trois fichiers que rien ne
      // contrôle.
      //
      // « ecart » porte l'écart minimum d'une spécialité, et son « force » est
      // l'ancienne case : une VALEUR et non un décalage — on pense « l'écart
      // doit être de 30 », pas « je décale de −20 ».
      caracsLeviers: {},
      // LA RÈGLE DE L'ÉCART, SUSPENDUE. Les cinq leviers ci-dessus DÉCALENT ;
      // celui-ci SUSPEND, et pour tout le personnage : plus rien n'est retiré
      // à aucune spécialité. C'est pour la construction que la règle ordinaire
      // ne sait pas décrire.
      ecartCoupe: false,

      // sigle -> points investis (1 XP le point). Mêmes leviers.
      // LE BONUS d'une compétence, réglé sur la FICHE comme celui d'une
      // caractéristique. Il s'ajoute APRÈS le plafond : il peut donc porter la
      // compétence au-delà de ce que le MOD de sa caractéristique permet.
      comps: {}, compsBonus: {},
      // LA SURCHARGE, ET JAMAIS LA RÈGLE. Clé absente = ce que dit la page de
      // règles. Recopier la règle dans l'état figerait une compétence sur
      // l'ancienne liste le jour où la page change — et DATA n'existe pas du
      // côté Roll20, donc rien ne pourrait la relire pour comparer.
      //
      // Elles existent parce qu'un AVANTAGE change une fiche : un avantage n'est
      // que du texte, et rien d'autre que ces réglages ne peut faire entrer sa
      // conséquence chiffrée.
      compsCarac: {}, compsCaracsPlafond: {},
      // LES QUATRE LEVIERS D'UNE COMPÉTENCE, même forme que caracsLeviers :
      // levier, puis boîte, puis sigle. Ni « mod » ni « lim » : une compétence
      // apporte des POINTS, et son jet est coiffé par la limite de sa
      // caractéristique.
      compsLeviers: {},

      // LES SPÉCIALITÉS sont une LISTE et non une table : leur nom est libre,
      // le joueur les crée. Chacune dit de quelle caractéristique et de quelle
      // compétence elle relève, parce que ces deux-là commandent son plafond et
      // le jet qui la lance.
      // { nom, carac, comp, pts, bonus, leviers }
      //
      // SES LEVIERS VIVENT SUR ELLE, et non dans une table à part : une
      // spécialité n'a pour identité que son RANG dans la liste, et ce rang se
      // décale au premier ajout comme au premier glissement. Son nom ne vaut pas
      // mieux — il est libre, parfois vide, parfois en double.
      specialites: [],

      xpTotal: 0,

      pv: null, endurance: null,
      armes: [], armures: [], inventaire: "",
      // inventaire illustré : groupes, objets, et les réglages d'affichage du
      // module (le poids de MIA est un nombre SANS unité)
      inv: {
        texte: [], groupes: ["Sur soi"], objets: [],
        // Un drapeau « compté » par groupe, dans un tableau PARALLÈLE et non
        // dans le groupe lui-même : inv.groupes est un tableau de CHAÎNES que
        // sept endroits lisent tel quel (bandeau, renommage, menus du tiroir et
        // du dialogue Prendre, carte de tchat).
        comptes: [true],
        opts: { cols: 4, nom: true, qte: true, poids: false, total: true }
      },

      // Les valeurs dérivées que le MJ peut décaler (trois modificateurs
      // chacune) ou remplacer net.
      divers: {
        pvMax: [0, 0, 0], endurance: [0, 0, 0], vitesse: [0, 0, 0],
        initiative: [0, 0, 0], charge: [0, 0, 0], recup: [0, 0, 0],
        sautLong: [0, 0, 0], sautHaut: [0, 0, 0]
      },
      pvMaxOverride: null, enduranceMaxOverride: null, vitesseOverride: null,
      initiativeOverride: null, chargeOverride: null, recupOverride: null,
      sautLongOverride: null, sautHautOverride: null,

      // modules : le coffre privé de chaque module (id -> objet libre) et les
      // interrupteurs (id -> false pour les seuls modules coupés).
      modData: {}, modActifs: {},
      // disposition des modules ({ ordre: [], place: {} }, éparse : seul ce que
      // le joueur a déplacé y figure) et mods du personnage (leur CODE voyage
      // avec lui).
      modules: {}, mods: [],
      de: DE_TEST_DEFAUT
    };
  }
  // Toute donnée entrante (localStorage, import JSON, Attributes Roll20) passe
  // par cette normalisation : champ manquant -> valeur par défaut, types sûrs.
  // La validation est PROFONDE (éléments des tableaux, sous-objets compris) :
  // un état corrompu ne doit ni briquer la page ni s'effacer en silence.
  // Migration de schéma, AVANT toute normalisation : normalize() complète et
  // nettoie selon la forme d'AUJOURD'HUI, donc il faut d'abord amener l'état
  // jusqu'ici. Le moteur est facultatif de naissance : le repli gelé de
  // roll20-fiche.html ne charge que le bundle, et une fiche sans moteur doit
  // s'ouvrir quand même — d'où le garde, qui restera pour toujours.
  // Une fiche VENUE DU FUTUR (v > SCHEMA) n'est pas migrée à la baisse en
  // douce : on la laisse telle quelle et l'amorce s'en occupe (écran de
  // version). Écrire dessus avec un code qui ne la comprend pas serait le
  // seul vrai moyen de la perdre. Le schéma est d'ailleurs le SEUL axe qui
  // fasse encore paraître cet écran : un simple écart de numéro de release ne
  // le déclenche plus, sans quoi un correctif de feuille de style barrerait
  // le passage à toute une table.
  function migre(s) {
    if (!s || typeof s !== "object") return s;
    var de = parseInt(s.v, 10);
    if (!isFinite(de)) de = 1;
    if (de === SCHEMA) return s;
    if (de > SCHEMA) return s;                     // du futur : ne rien toucher
    if (!window.MiaMigr || !window.MiaMigr.appliquer) return s;
    var r = window.MiaMigr.appliquer(s, de, SCHEMA);
    if (!r || !r.ok) return s;                     // échec : l'état d'origine, intact
    r.state.v = SCHEMA;
    r.state.rel = RELEASE;
    return r.state;
  }

  function normalize(s) {
    var b = blank();
    if (!s || typeof s !== "object") return b;
    s = migre(s);
    Object.keys(b).forEach(function (k) { if (s[k] === undefined) s[k] = b[k]; });
    // La release suit toujours le code qui vient d'écrire : c'est lui qui fait
    // foi. Sur la beta, cela tamponne le suffixe sur n'importe quel personnage
    // seulement ouvert puis réenregistré ; c'est sans danger tant que le
    // suffixe ne change pas le rang.
    if (parseInt(s.v, 10) === SCHEMA) s.rel = RELEASE;

    // ---------- outils ----------
    // les modificateurs (blocs Options) acceptent les décimales
    function modNum(v) {
      var n = parseFloat(v);
      return isFinite(n) ? clamp(Math.round(n * 100) / 100, -999, 999) : 0;
    }
    // LE MÊME, MAIS À LA BORNE DU LEVIER. modNum rabote à ±999 quelle que soit
    // la borne du champ : la limite, le coût en xp et l'écart acceptent 9999 au
    // clavier et se faisaient rogner au premier enregistrement. Défaut ancien,
    // corrigé ici plutôt que recopié trente-cinq fois.
    function nombreBorne(v, borne) {
      var n = parseFloat(v);
      return isFinite(n) ? clamp(Math.round(n * 100) / 100, -borne, borne) : 0;
    }
    // UN LEVIER QUI NE CHANGE RIEN N'EST PAS UN LEVIER, et les deux tables
    // ci-dessous l'appliquent : un ajout de ZÉRO et un facteur de UN sont le
    // NEUTRE de leur opération, ils ne se rangent donc pas.
    //
    // C'EST UN DÉFAUT SIGNALÉ EN PARTIE. tableNombres garde un zéro explicite
    // (« n !== 0 || src[k] === 0 »), ce qui est juste pour un modificateur
    // ordinaire mais pas ici : une case tapée puis vidée laissait « 0 » dans
    // l'état, et la fiche marquait la limite et le coût en xp comme RETOUCHÉS
    // alors que rien ne l'était. Le joueur voyait du rouge sans avoir rien
    // réglé, et rien ne lui disait quoi défaire.
    function tableAjout(v, borne) {
      var src = objet(v), out = {};
      Object.keys(src).forEach(function (k) {
        var n = nombreBorne(src[k], borne);
        if (n !== 0) out[k] = n;
      });
      return out;
    }
    // UN FACTEUR : vide vaut UN, jamais zéro. Il se range donc comme un forçage
    // (clé absente = pas de valeur) et surtout PAS comme un modificateur, qui
    // garde un zéro explicite — un facteur à zéro annulerait la
    // caractéristique, et c'est ce qu'on obtiendrait en tapant puis effaçant.
    function multNum(v) {
      if (v === null || v === undefined || v === "") return null;
      var n = parseFloat(v);
      return isFinite(n) ? clamp(Math.round(n * 100) / 100, -MULT_BORNE, MULT_BORNE) : null;
    }
    function tableMult(v) {
      var src = objet(v), out = {};
      Object.keys(src).forEach(function (k) {
        var n = multNum(src[k]);
        // ×1 ne multiplie rien : même sort qu'un ajout de zéro
        if (n !== null && n !== 1) out[k] = n;
      });
      return out;
    }
    // un champ FORCÉ : vide vaut « pas de forçage », et surtout pas zéro
    function forceVal(v) {
      if (v === null || v === undefined || v === "") return null;
      var n = parseFloat(v);
      return isFinite(n) ? Math.round(n * 100) / 100 : null;
    }
    function objArray(a) {
      if (!Array.isArray(a)) return [];
      return a.filter(function (x) { return x && typeof x === "object"; });
    }
    function objet(v) {
      return (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
    }

    // LES SIGLES VIENNENT DES RÈGLES, JAMAIS D'ICI. Quand DATA manque — fiche
    // ouverte hors ligne, données trop anciennes, chemin de repli des
    // Attributes Roll20 — les listes sont VIDES, et c'est la bonne réponse :
    // on ne touche alors à aucune clé plutôt que d'en inventer huit et
    // d'effacer ce que le joueur avait. Un état non normalisé se rouvre ; un
    // état amputé, non.
    var codesC = champs(), codesK = champsComp();
    function connu(v, codes) {
      v = v == null ? "" : String(v);
      return codes.indexOf(v) >= 0 ? v : "";
    }
    // Nettoie une table « sigle -> nombre » SANS y ajouter de clé : une
    // caractéristique jamais touchée n'a pas à peser dans l'état, les
    // accesseurs rendent zéro pour elle.
    function tableNombres(v, borne) {
      var src = objet(v), out = {};
      Object.keys(src).forEach(function (k) {
        var n = borne(src[k]);
        if (n !== 0 || src[k] === 0) out[k] = n;
      });
      return out;
    }
    function tableForce(v) {
      var src = objet(v), out = {};
      Object.keys(src).forEach(function (k) {
        var n = forceVal(src[k]);
        if (n !== null) out[k] = n;
      });
      return out;
    }
    function entier(v, min, max) { return clamp(num(v, 0), min, max); }

    // ---------- le prestige ----------
    var pMax = repli("prestigeMax");
    s.prestige = entier(s.prestige, 0, pMax);
    s.prestigeMod = modNum(s.prestigeMod);
    s.prestigeForce = forceVal(s.prestigeForce);

    // ---------- les caractéristiques ----------
    // Le plafond est affaire de CALCUL (caracPlafond), pas de rangement : un
    // joueur qui redescend son prestige ne doit pas voir ses achats effacés au
    // premier enregistrement.
    //
    // ET LA BORNE NE PEUT PLUS ÊTRE LE PRESTIGE MAXIMAL DES RÈGLES. Depuis que
    // la coiffe tombe sur la SORTIE de la chaîne, un levier qui divise rend
    // légitime d'acheter au-delà : sous un facteur d'un demi, il faut 40 pour
    // atteindre 20. La saisie l'accepte (voir caracs.js) — si le rangement,
    // lui, ramenait à 20, la moitié disparaîtrait au rechargement, sans un
    // bandeau, sans un éclair, sans une ligne d'xp qui bouge.
    //
    // UN RANGEMENT NE DOIT JAMAIS ÊTRE PLUS SÉVÈRE QUE LA SAISIE. Même borne
    // que les points d'une compétence, pour la même raison.
    s.caracs = tableNombres(s.caracs, function (v) { return entier(v, 0, 9999); });
    s.caracsBonus = tableNombres(s.caracsBonus, modNum);

    // ---------- les cinq leviers ----------
    // ÉPARS À TOUS LES NIVEAUX, sur le patron de s.modules.place : on valide ce
    // qui est là, on ne matérialise rien. Un levier auquel personne n'a touché
    // n'existe pas, et la table entière voyage dans un seul attribut Roll20.
    //
    // LA BORNE SUIT L'ÉCHELLE DU LEVIER : un plafond et un modificateur se
    // comptent en dizaines, une limite et un coût en xp en milliers. Les
    // facteurs, eux, ont la leur (MULT_BORNE), parce qu'ils MULTIPLIENT.
    // UNE TABLE DE LEVIERS : levier, puis boîte, puis sigle. Deux porteurs s'en
    // servent — les caractéristiques et les compétences — et le troisième, la
    // spécialité, a sa propre forme, sans le niveau du sigle (voir plus bas).
    function tableLeviers(v, bornes) {
      var lvSrc = objet(v), lv = {};
      Object.keys(bornes).forEach(function (nom) {
        var src = objet(lvSrc[nom]), out = {}, borne = bornes[nom];
        var f = tableForce(src.force);
        if (Object.keys(f).length) out.force = f;
        ["a1", "a2", "a3", "a4"].forEach(function (b) {
          var tb = tableAjout(src[b], borne);
          if (Object.keys(tb).length) out[b] = tb;
        });
        ["m1", "m2", "m3", "m4"].forEach(function (b) {
          var tb = tableMult(src[b]);
          if (Object.keys(tb).length) out[b] = tb;
        });
        if (Object.keys(out).length) lv[nom] = out;
      });
      return lv;
    }
    // LES LEVIERS D'UNE SPÉCIALITÉ : la même chaîne, MAIS sans le niveau du
    // sigle — la spécialité EST déjà l'individu. D'où ce second rangeur, qui
    // range des NOMBRES là où l'autre range des tables.
    function leviersPlats(v, bornes) {
      var src = objet(v), out = {};
      Object.keys(bornes).forEach(function (nom) {
        var b = objet(src[nom]), o = {}, borne = bornes[nom];
        var f = forceVal(b.force);
        if (f !== null) o.force = f;
        ["a1", "a2", "a3", "a4"].forEach(function (x) {
          var n = nombreBorne(b[x], borne);
          if (n !== 0) o[x] = n;
        });
        ["m1", "m2", "m3", "m4"].forEach(function (x) {
          var n = multNum(b[x]);
          if (n !== null && n !== 1) o[x] = n;
        });
        if (Object.keys(o).length) out[nom] = o;
      });
      return out;
    }
    // CES TROIS TABLES SONT LE CATALOGUE DES LEVIERS, et rien d'autre ne
    // l'est : tableLeviers et leviersPlats bouclent sur les BORNES et non sur
    // l'état, donc un levier dont le nom manque ici est jeté EN SILENCE au
    // premier rangement — écrit dans la page, disparu au rechargement.
    // Un levier qui s'ajoute s'inscrit ici d'abord.
    var LEVIER_BORNE = { valeur: 999, plafond: 999, bonus: 999,
                         xp: 9999, mod: 999, lim: 9999, ecart: 9999 };
    var COMP_BORNE = { valeur: 999, plafond: 999, bonus: 999, xp: 9999, lim: 9999, ecart: 9999 };
    // UNE SPÉCIALITÉ N'A PAS DE PLAFOND que les règles donnent — mais elle a
    // le levier, parce qu'un avantage peut lui en imposer un. Il ne mord que
    // s'il est réglé (voir spePlafond).
    var SPE_BORNE = { valeur: 999, plafond: 999, bonus: 999, xp: 9999, lim: 9999, ecart: 9999 };
    s.caracsLeviers = tableLeviers(s.caracsLeviers, LEVIER_BORNE);

    // ---------- les compétences ----------
    // Les points ne se bornent pas au plafond ici non plus, et pour la même
    // raison : compPts() le fait au calcul, et une caractéristique momentanément
    // baissée ne doit pas coûter au joueur ce qu'il avait investi.
    s.comps = tableNombres(s.comps, function (v) { return entier(v, 0, 9999); });
    s.compsBonus = tableNombres(s.compsBonus, modNum);
    s.compsLeviers = tableLeviers(s.compsLeviers, COMP_BORNE);

    // LES DEUX SURCHARGES. Quand DATA manque — fiche ouverte hors ligne,
    // données trop anciennes —, on ne touche à RIEN : connu() rendrait "" sur
    // une liste vide et EFFACERAIT ce que le meneur a réglé. Un état non
    // normalisé se rouvre ; un état amputé, non.
    if (codesC.length) {
      var cSrc = objet(s.compsCarac), cOut = {};
      Object.keys(cSrc).forEach(function (k) {
        var v = connu(cSrc[k], codesC);
        if (v) cOut[k] = v;
      });
      s.compsCarac = cOut;
      var pSrc = objet(s.compsCaracsPlafond), pOut = {};
      Object.keys(pSrc).forEach(function (k) {
        if (!Array.isArray(pSrc[k])) return;
        // L'ORDRE EST CELUI DES RÈGLES, jamais celui des clics : deux
        // personnages réglés pareil doivent porter la même chaîne.
        var liste = [];
        codesC.forEach(function (c) { if (pSrc[k].indexOf(c) >= 0) liste.push(c); });
        // LE TABLEAU VIDE SE GARDE : « rien ne commande ce plafond » n'est PAS
        // la même réponse que « les règles ». Trois états, trois réponses.
        pOut[k] = liste;
      });
      s.compsCaracsPlafond = pOut;
    }

    // ---------- les spécialités ----------
    // Une spécialité sans caractéristique ni compétence reste dans la fiche : le
    // joueur vient peut-être de l'ajouter et n'a pas fini de la remplir. Elle ne
    // vaut simplement rien tant qu'elle n'en désigne pas.
    s.specialites = objArray(s.specialites).map(function (sp) {
      var o = {
        nom: sp.nom == null ? "" : String(sp.nom),
        carac: connu(sp.carac, codesC),
        comp: connu(sp.comp, codesK),
        pts: entier(sp.pts, 0, 9999),
        // le bonus de la spécialité : une valeur EN PLUS, qui part de zéro et
        // qu'on peut vouloir négative (un malus permanent).
        //
        // IL A SA PROPRE CHAÎNE, et il n'entre pas dans celle de la valeur :
        // il s'ajoute APRÈS le rabattage de l'écart, et l'y faire entrer
        // ferait rabattre la spécialité par son propre bonus. C'est ce nombre
        // qui en est la BASE — le levier « bonus » se règle par-dessus.
        bonus: modNum(sp.bonus)
      };
      // épars comme le reste : une spécialité que personne n'a réglée ne porte
      // pas de clé « leviers »
      var lv = leviersPlats(sp.leviers, SPE_BORNE);
      if (Object.keys(lv).length) o.leviers = lv;
      return o;
    });

    // ---------- les langues ----------
    // Deux champs, et rien d'autre : le NIVEAU se déduit des points, il ne se
    // range pas. Le ranger serait s'exposer à ce qu'il contredise un jour ce
    // que les points disent.
    s.langues = objArray(s.langues).map(function (l) {
      return {
        nom: l.nom == null ? "" : String(l.nom),
        pts: entier(l.pts, 0, 9999)
      };
    });

    // ---------- les arts : techniques et passifs ----------
    // RANGEMENT PROFOND, comme les spécialités et non comme les avantages :
    // un art porte des nombres, une liste imbriquée et un type fermé. Le
    // rangement plat des avantages (objArray seul) laisserait passer un
    // « ameliorations: "trois" » venu d'un JSON écrit à la main, et le rendu
    // exploserait dessus.
    //
    // UNE ENTRÉE INCOMPLÈTE RESTE DANS LA FICHE : le joueur vient peut-être de
    // l'ajouter et n'a pas fini de la remplir. Elle ne vaut simplement rien.
    function effetArt(e) {
      e = objet(e);
      return {
        nom: e.nom == null ? "" : String(e.nom),
        // les deux coûts acceptent les DÉCIMALES et le négatif : l'xp est
        // décimale depuis les spécialités, et un meneur peut vouloir rendre ce
        // qu'un avantage avait pris
        avantage: nombreBorne(e.avantage, 999),
        xp: nombreBorne(e.xp, 9999),
        desc: e.desc == null ? "" : String(e.desc),
        macro: e.macro == null ? "" : String(e.macro)
      };
    }
    s.arts = objArray(s.arts).map(function (a) {
      // LE TYPE EST FERMÉ. Un art sans type est plus probablement une technique
      // inachevée qu'un passif : le rangement le tranche une fois pour toutes,
      // à chaque enregistrement.
      var t = a.type === "passif" ? "passif" : "technique";
      var o = {
        type: t,
        nom: a.nom == null ? "" : String(a.nom),
        base: effetArt(a.base),
        ameliorations: objArray(a.ameliorations).map(effetArt)
      };
      // un passif ne coûte pas d'endurance : la clé n'existe PAS chez lui,
      // sinon un art basculé de technique à passif la laisserait traîner
      if (t === "technique") o.endurance = entier(a.endurance, -9999, 9999);
      return o;
    });

    // ---------- identité, bio ----------
    ["name", "portrait", "espece", "age", "sexe", "genre", "defaut", "background", "notes"]
      .forEach(function (k) { s[k] = s[k] == null ? "" : String(s[k]); });
    if (!Array.isArray(s.qualites)) s.qualites = ["", ""];
    s.qualites = s.qualites.map(function (q) { return q == null ? "" : String(q); });
    while (s.qualites.length < 2) s.qualites.push("");
    s.avantages = objArray(s.avantages);
    s.armes = objArray(s.armes);
    s.armures = objArray(s.armures);

    // ---------- les valeurs dérivées ----------
    s.ecartCoupe = !!s.ecartCoupe;
    s.divers = objet(s.divers);
    ["pvMax", "endurance", "vitesse", "initiative", "charge", "recup",
     "sautLong", "sautHaut"].forEach(function (k) {
      var a = Array.isArray(s.divers[k]) ? s.divers[k] : [];
      s.divers[k] = [modNum(a[0]), modNum(a[1]), modNum(a[2])];
    });
    ["pvMaxOverride", "enduranceMaxOverride", "vitesseOverride",
     "initiativeOverride", "chargeOverride", "recupOverride",
     "sautLongOverride", "sautHautOverride"]
      .forEach(function (k) { s[k] = forceVal(s[k]); });

    // ---------- l'inventaire ----------
    // inventaire structuré : liste (texte) + objets illustrés par groupes
    // (un tableau passerait le typeof : ses propriétés nommées seraient
    // perdues par JSON.stringify au premier save)
    if (!s.inv || typeof s.inv !== "object" || Array.isArray(s.inv)) s.inv = b.inv;
    s.inv.texte = objArray(s.inv.texte).map(function (it) {
      return {
        nom: it.nom == null ? "" : String(it.nom),
        qte: Math.max(0, num(it.qte, 1)),
        poids: pnum(it.poids),
        compte: it.compte !== false
      };
    });
    // réglages d'affichage du module (bornés : une fiche corrompue ne doit pas
    // produire une grille de 0 colonne)
    if (!s.inv.opts || typeof s.inv.opts !== "object" || Array.isArray(s.inv.opts)) s.inv.opts = b.inv.opts;
    s.inv.opts.cols = clamp(num(s.inv.opts.cols, b.inv.opts.cols), 1, 8);
    // chaque réglage garde SON défaut quand il manque (un opts partiel ne doit
    // pas allumer un affichage éteint par défaut)
    ["nom", "qte", "poids", "total"].forEach(function (k) {
      s.inv.opts[k] = s.inv.opts[k] === undefined ? b.inv.opts[k] : !!s.inv.opts[k];
    });
    if (!Array.isArray(s.inv.groupes)) s.inv.groupes = [];
    s.inv.groupes = s.inv.groupes.map(function (g) {
      g = g == null ? "" : String(g).trim();
      return g || "Groupe";
    });
    if (!s.inv.groupes.length) s.inv.groupes = ["Sur soi"];
    // Les drapeaux « compté » se recalent sur les groupes à chaque chargement :
    // un tableau plus court se complète (un groupe neuf est PORTÉ, jamais posé,
    // sinon du poids disparaîtrait en silence), un tableau plus long se coupe.
    if (!Array.isArray(s.inv.comptes)) s.inv.comptes = [];
    // PLUS DE DRAPEAUX QUE DE GROUPES : personne ne peut plus dire LEQUEL a
    // sauté, et couper la fin décalerait tous les suivants. On rend donc tout au
    // poids porté. Perdre un décochage se voit et se refait ; perdre du poids en
    // silence fausse la fiche sans prévenir.
    if (s.inv.comptes.length > s.inv.groupes.length) s.inv.comptes = [];
    s.inv.comptes = s.inv.groupes.map(function (_, gi) {
      return s.inv.comptes[gi] !== false;
    });
    s.inv.objets = objArray(s.inv.objets).map(function (it) {
      return {
        nom: it.nom == null ? "" : String(it.nom),
        // quantités et poids DÉCIMAUX (une demi-ration, 0.5 de poids…)
        qte: pnum(it.qte === undefined ? 1 : it.qte),
        poids: pnum(it.poids),
        img: it.img == null ? "" : String(it.img),
        desc: it.desc == null ? "" : String(it.desc),
        // identifiant libre : c'est LUI qui reconnaît le même objet d'une fiche
        // à l'autre quand on le donne
        id: it.id == null ? "" : String(it.id),
        achat: pnum(it.achat),
        vente: pnum(it.vente),
        groupe: clamp(num(it.groupe, 0), 0, s.inv.groupes.length - 1)
      };
    });
    // l'ancien inventaire en texte libre se fond dans les objets illustrés
    if (s.inventaire && typeof s.inventaire === "string") {
      s.inventaire.split(/\r?\n/).forEach(function (line) {
        line = line.trim();
        if (line) s.inv.objets.push({ nom: line, qte: 1, poids: 0, img: "", desc: "", groupe: 0 });
      });
      s.inventaire = "";
    }
    if (s.inv.texte.length) {
      s.inv.texte.forEach(function (it) {
        s.inv.objets.push({ nom: it.nom, qte: it.qte, poids: it.poids, img: "", desc: "", groupe: 0 });
      });
      s.inv.texte = [];
    }

    // ---------- les modules ----------
    // coffres des modules : le contenu appartient au module, la fiche ne juge
    // que la forme. Une entrée qui n'est pas un objet est jetée : elle ferait
    // planter le get() du module sans que personne ne sache pourquoi.
    if (!s.modData || typeof s.modData !== "object" || Array.isArray(s.modData)) s.modData = {};
    Object.keys(s.modData).forEach(function (k) {
      var d = s.modData[k];
      if (!d || typeof d !== "object") delete s.modData[k];
    });
    // interrupteurs : seuls les modules COUPÉS y figurent (false). Tout le
    // reste s'efface, pour qu'un module retiré un jour ne laisse pas de trace.
    if (!s.modActifs || typeof s.modActifs !== "object" || Array.isArray(s.modActifs)) s.modActifs = {};
    Object.keys(s.modActifs).forEach(function (k) {
      if (s.modActifs[k] !== false) delete s.modActifs[k];
    });
    // Disposition des modules. ÉPARSE : on valide ce qui est là sans rien
    // matérialiser. Écrire un « ordre » vide chez tout le monde ferait voyager
    // une liste inutile jusque dans les Attributes Roll20, et un module ajouté
    // demain n'apparaîtrait pas chez un personnage rangé avant lui.
    if (!s.modules || typeof s.modules !== "object" || Array.isArray(s.modules)) s.modules = {};
    if (s.modules.ordre !== undefined) {
      var vusOrdre = {};
      s.modules.ordre = (Array.isArray(s.modules.ordre) ? s.modules.ordre : [])
        .map(function (id) { return String(id == null ? "" : id); })
        .filter(function (id) {
          if (!id || vusOrdre[id]) return false;   // un id en double décalerait le rangement
          vusOrdre[id] = 1;
          return true;
        });
    }
    if (s.modules.place !== undefined) {
      var placeSrc = s.modules.place;
      var place = {};
      if (placeSrc && typeof placeSrc === "object" && !Array.isArray(placeSrc)) {
        Object.keys(placeSrc).forEach(function (id) {
          var p = placeSrc[id];
          if (!id || !p || typeof p !== "object" || Array.isArray(p)) return;
          var q = {};
          if (typeof p.onglet === "string" && p.onglet) q.onglet = p.onglet;
          if (typeof p.colonne === "string" && p.colonne) q.colonne = p.colonne;
          // une entrée qui ne dit ni onglet ni colonne ne déplace rien : elle
          // ne ferait qu'occuper la place et voyager pour rien
          if (q.onglet || q.colonne) place[id] = q;
        });
      }
      s.modules.place = place;
    }
    // Mods du personnage. Le moteur (mia-mods.js) fait foi quand il est là :
    // c'est lui qui connaît la forme d'un mod. Sans lui, la fiche s'en tient au
    // strict nécessaire, mais elle ne s'en dispense JAMAIS : un état venu
    // d'ailleurs (import, Attributes d'un autre joueur) ne doit pas entrer sans
    // contrôle, et un mod sans id ni code ne pourrait ni tourner ni se nommer.
    if (!Array.isArray(s.mods)) s.mods = [];
    if (window.MiaMods && typeof window.MiaMods.normalise === "function") {
      try {
        var normes = window.MiaMods.normalise(s.mods);
        if (Array.isArray(normes)) s.mods = normes;
      } catch (e) {}
    }
    var vusMods = {};
    s.mods = objArray(s.mods).filter(function (m) {
      // L'id impose son alphabet : il sert de clé partout (avis du navigateur,
      // journal « [mod:<id>] », coffre du module qu'il remplacerait). Même
      // règle que le moteur (idPropre) : les deux chemins doivent donner le
      // MÊME id, sans quoi l'empreinte changerait selon le chemin pris.
      m.id = String(m.id == null ? "" : m.id).toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
      m.nom = String(m.nom == null ? "" : m.nom);
      m.actif = m.actif !== false;
      if (typeof m.pour !== "string" || !m.pour) delete m.pour;
      if (typeof m.notes !== "string" || !m.notes) delete m.notes;
      var api = parseInt(m.apiMin, 10);
      if (isFinite(api)) m.apiMin = clamp(api, 0, 999); else delete m.apiMin;
      if (!m.id || typeof m.src !== "string" || vusMods[m.id]) return false;
      vusMods[m.id] = 1;
      return true;
    });

    // ---------- l'expérience et les deux jauges ----------
    s.xpTotal = Math.max(0, num(s.xpTotal, 0));
    // pv et endurance : null veut dire « au maximum », et c'est différent de
    // zéro. Un personnage neuf est en pleine forme sans qu'on ait à recopier
    // son maximum dans son état.
    ["pv", "endurance"].forEach(function (k) {
      s[k] = (s[k] === null || s[k] === undefined || s[k] === "") ? null : parseFloat(s[k]);
      if (s[k] !== null && !isFinite(s[k])) s[k] = null;
    });
    s.de = s.de == null ? DE_TEST_DEFAUT : String(s.de);
    return s;
  }
  // ---------- filtres de calcul ----------
  // Un filtre intercepte une valeur DÉRIVÉE (total de caractéristique, PV max,
  // initiative…) juste après son calcul. Le calcul lui-même garde son nom
  // suffixé « Brut » ; le nom public appelle le brut, puis passe la valeur aux
  // filtres enregistrés pour ce nom. C'est par là qu'un mod change une règle de
  // calcul sans qu'on rouvre ce fichier, et sans avoir à réécrire le module qui
  // affiche la valeur : tout ce qui lit caracTotal() voit le même chiffre.
  //
  // Les CASCADES sont voulues, et elles tombent toutes seules : caracMod() lit
  // caracTotal(), compPlafond() lit caracMod(), et
  // jetBonus() lit tout le monde — un filtre posé sur la caractéristique se voit
  // donc jusque dans le jet d'une spécialité. De même, chargeMax() lit
  // caracMod() et les paliers de charge commandent l'initiative, la vitesse et
  // les sauts ; xpDepense() appelle compXp(). Les gardes ci-dessous sont par
  // NOM, jamais globales, pour ne pas couper ces chaînes-là.
  var filtres = {};            // nom -> [{ fn, prop, echecs }], ordre d'enregistrement
  var filtresEnCours = {};     // nom -> 1 pendant sa passe (garde de récursion)
  var FILTRE_FAUTES = 5;       // même seuil que la muselière des modules, même raison
  // À qui appartient ce qui s'enregistre : monteModules le pose autour du build
  // d'un module, l'exécution des mods autour du moteur. Hors de tout
  // propriétaire (console du navigateur), personne ne répond : « ? ».
  var proprietaireCourant = "?";
  // L'id du mod que le moteur est en train de lancer, ou null. Différent de
  // proprietaireCourant, qui vaut aussi pendant le build d'un module natif.
  var modEnExec = null;
  var PROP_MOD = "mod";        // repli quand le moteur ne nomme pas le mod qui tourne
  // Vrai pendant un montage. Ce qui s'enregistre HORS d'un montage (console du
  // navigateur, script tiers chargé après la fiche) n'a personne pour le
  // rejouer après la remise à zéro du prochain mount() : on le garde ici.
  var enMontage = false;
  // { mod: module, prop } ou { nom, fn, prop } pour un filtre : chaque entrée
  // dit à QUI elle est, faute de quoi rien ne saurait plus l'en défaire
  var horsMontage = [];
  // Les dix points de filtre. La table ne sert qu'à prévenir d'un nom mal
  // tapé : un filtre posé sur « pvmax » ne serait jamais appelé, et rien ne le
  // dirait.
  // ILS SUIVENT LES RÈGLES. Chaque nom est un point de calcul qu'un mod peut
  // détourner ; ils ont donc changé avec le système, et un mod écrit pour
  // l'ancien se verra prévenir plutôt que d'agir dans le vide.
  var FILTRES_CONNUS = {
    caracTotal: 1, caracMod: 1, caracLim: 1, compLim: 1, speLim: 1, ecartMin: 1,
    // L'ÉCART CASCADE SUR TROIS ÉTAGES, donc trois points de filtre distincts :
    // la garde de récursion se fait par NOM, et un seul nom pour les trois
    // rendrait le brut sur les deux autres dès que l'un est en cours.
    ecartComp: 1, ecartSpe: 1,
    compValue: 1, compPlafond: 1, compXp: 1,
    spePts: 1, speTotal: 1, langueTotal: 1, jetBonus: 1,
    pvMax: 1, enduranceMax: 1, enduranceMalus: 1, recupJour: 1, recupEnduranceJour: 1,
    initiative: 1, vitesse: 1, sautLong: 1, sautHaut: 1,
    poidsPorte: 1, chargeMax: 1, xpDepense: 1
  };
  // Appartenance RÉELLE à une table nommée par une chaîne venue d'ailleurs (mod,
  // état importé). Sans elle, un nom comme « toString » répond « oui » depuis
  // Object.prototype, et la suite manipule une méthode en croyant tenir une
  // donnée : c'est la façon la plus bête de casser un montage.
  function aClef(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function ajouteFiltre(nom, fn, prop) {
    nom = String(nom == null ? "" : nom);
    if (typeof fn !== "function" || !nom) return;
    prop = prop || "?";
    if (!aClef(FILTRES_CONNUS, nom) && window.console && window.console.warn)
      window.console.warn("[mod:" + prop + "] filtre " + nom + " inconnu : il ne sera jamais appelé.");
    if (!aClef(filtres, nom)) filtres[nom] = [];
    // DÉDOUBLONNAGE DANS LE REGISTRE LUI-MÊME, et pas seulement dans ce qui
    // attend le montage suivant. Un bouton de mod qui repose son filtre à
    // chaque clic l'empilait DANS LE MÊME MONTAGE : deux clics et le bonus
    // comptait double (+20, +40, +60…), sans que rien ne le montre. Même
    // nom, même propriétaire, même texte de fonction : c'est le même filtre,
    // et le reposer ne veut pas dire le vouloir deux fois.
    var texte = signeFn(fn);
    var liste = filtres[nom];
    for (var i = 0; i < liste.length; i++) {
      if (liste[i].prop === prop && (liste[i].fn === fn || (texte && liste[i].src === texte))) {
        liste[i].fn = fn;
        liste[i].echecs = 0;
        if (!enMontage) gardeHorsMontage({ nom: nom, fn: fn, prop: prop });
        return;
      }
    }
    liste.push({ fn: fn, prop: prop, echecs: 0, src: texte });
    if (!enMontage) gardeHorsMontage({ nom: nom, fn: fn, prop: prop });
  }
  // Ce qui attend le prochain montage porte son PROPRIÉTAIRE (celui du filtre,
  // l'id du module pour un enregistrement) et ne s'inscrit qu'UNE FOIS. Sans ce
  // second point, un bouton qui repose le même filtre à chaque clic l'empile :
  // deux clics et le bonus compte double, à chaque montage, pour toujours.
  //
  // COMPARER LES FONCTIONS PAR RÉFÉRENCE NE SUFFIT PAS, et c'est le piège qui a
  // laissé passer ce défaut une première fois : « function (v) { return v + 20; } »
  // écrit DANS un gestionnaire de clic fabrique un objet NEUF à chaque clic.
  // Deux entrées identiques à la lettre près étaient donc jugées différentes et
  // s'empilaient (+20, +40, +60…). On compare donc aussi le TEXTE de la
  // fonction. Deux filtres vraiment distincts qui s'écriraient caractère pour
  // caractère pareil se confondraient, mais poser deux fois le même calcul pour
  // qu'il compte double n'est pas un usage : l'empilement sans fin, si.
  function signeFn(fn) {
    try { return String(fn); } catch (e) { return ""; }
  }
  function gardeHorsMontage(e) {
    if (!e.mod) e.src = signeFn(e.fn);
    // l'état des mods AU MOMENT du dépôt : le rejeu s'en sert pour savoir si la
    // liste a bougé depuis (voir rejoueHorsMontage)
    e.sig = signatureAuMontage;
    for (var i = 0; i < horsMontage.length; i++) {
      var h = horsMontage[i];
      // un module se REMPLACE à son id (c'est ce que fait enregistre) ; un
      // filtre se reconnaît à son nom, son propriétaire et son texte
      if (e.mod || h.mod) {
        if (e.mod && h.mod && h.mod.id === e.mod.id) { horsMontage[i] = e; return; }
        continue;
      }
      if (h.nom === e.nom && h.prop === e.prop &&
          (h.fn === e.fn || (e.src && h.src === e.src))) { horsMontage[i] = e; return; }
    }
    horsMontage.push(e);
  }
  // Rejoué au début de chaque montage, dans l'ordre : le contrat promet qu'un
  // Mia.filtre ou un Mia.enregistre lancé depuis la console vaut « pour le
  // montage suivant » — et pour tous ceux d'après, rien d'autre ne le rejoue.
  //
  // Mais seulement ce qui a encore un ayant droit. Ce qui appartient à un MOD ne
  // se rejoue que tant que ce mod est sur le personnage, actif et accordé :
  // sinon le filtre posé par le bouton d'un mod refusé, coupé ou supprimé
  // continuerait de fausser les calculs à chaque montage, sans un mot et sans
  // rien pour le défaire — seul un rechargement complet de la page en viendrait
  // à bout, geste que le joueur n'a pas dans l'iframe Roll20. Le bilan du
  // montage précédent sert encore ici, c'est lui qui reconnaît un id de mod :
  // executeMods ne le remplace qu'après. Le propriétaire « ? » (console du
  // navigateur) est promis par le contrat, il se rejoue toujours.
  // Ce que les mods du personnage donnent à voir : leurs id, leur interrupteur
  // et l'accord du navigateur. Il change dès qu'un mod est ajouté, retiré,
  // coupé, autorisé ou refusé — et c'est exactement à ces moments-là que ce qui
  // n'a PAS d'ayant droit connu doit cesser d'être rejoué.
  function signatureMods() {
    var l = (state && Array.isArray(state.mods)) ? state.mods : [];
    return l.map(function (m) {
      return String(m.id) + ":" + (m.actif !== false ? "1" : "0") + ":" + avisMod(empreinteMod(m.id, m.src));
    }).join("|");
  }
  var signatureAuMontage = null;
  function rejoueHorsMontage() {
    var sig = signatureMods();
    var reste = [];
    horsMontage.forEach(function (h) {
      if (propEstUnMod(h.prop) && !modAutorise(h.prop)) return;
      // LE FILET. Un mod qui pose un filtre depuis un setTimeout, ou depuis un
      // écouteur qu'il a accroché lui-même, échappe à toute attribution : son
      // propriétaire vaut « ? », comme une ligne tapée dans la console, que le
      // contrat promet de conserver. On ne peut pas distinguer les deux — mais
      // on peut refuser de rejouer un « ? » anonyme dès que la liste des mods a
      // BOUGÉ. Le joueur qui refuse, coupe ou supprime un mod voit alors partir
      // ce que ce mod avait installé, quel qu'en soit le chemin. Une mise au
      // point à la console, elle, ne touche pas aux mods : elle survit.
      if (h.prop === "?" && signatureAuMontage !== null && h.sig !== sig) return;
      reste.push(h);
      if (h.mod) enregistre(h.mod);
      else ajouteFiltre(h.nom, h.fn, h.prop);
    });
    horsMontage = reste;
    signatureAuMontage = sig;
  }
  function aFiltre(nom) {
    var l = filtres[nom];
    return !!(l && l.length);
  }
  // La passe : chaque filtre reçoit la valeur rendue par le précédent. Un
  // filtre qui jette, ou qui rend autre chose qu'un nombre fini, est IGNORÉ
  // pour cette passe (la valeur d'avant continue son chemin) et compte une
  // faute ; cinq fautes de SUITE et il part, parce qu'un filtre cassé fausserait
  // chaque calcul de la fiche sans que personne ne sache d'où vient le chiffre.
  // Une passe sans faute remet son compteur à zéro.
  function applique(nom, valeur, infos) {
    var liste = filtres[nom];
    if (!liste || !liste.length) return valeur;
    // Garde de récursion : pendant la passe, tout nouvel appel au MÊME calcul
    // rend le brut. Sans elle, un filtre qui lit ctx.calculs.caracTotal se
    // rappellerait sans fin et figerait l'onglet.
    if (filtresEnCours[nom]) return valeur;
    filtresEnCours[nom] = 1;
    try {
      var i = 0;
      while (i < liste.length) {
        var f = liste[i], v = null, msg = "";
        try { v = f.fn(valeur, infos); }
        catch (err) { msg = messageErreur(err); }
        if (!msg && typeof v === "number" && isFinite(v)) {
          valeur = v;
          f.echecs = 0;
          i++;
          continue;
        }
        if (!msg) msg = typeof v === "number" ? "résultat non fini" : "résultat de type " + (typeof v);
        f.echecs++;
        if (f.echecs < FILTRE_FAUTES) { i++; continue; }
        liste.splice(i, 1);   // retiré : le suivant a pris la place, i ne bouge pas
        retireFiltre(nom, f, msg);
      }
    } finally { filtresEnCours[nom] = 0; }
    return valeur;
  }
  function retireFiltre(nom, f, msg) {
    var texte = "filtre " + nom + " retiré : " + msg;
    if (window.console && window.console.warn)
      window.console.warn("[mod:" + f.prop + "] " + texte);
    // le propriétaire porte l'erreur : c'est ce que Mia.etat(id) rend, et ce
    // que les listes de mods et de modules affichent
    etatModule(f.prop).erreur = texte;
  }
  // Mia.filtre : le propriétaire est celui du moment. ctx.filtreCalcul, lui,
  // fige l'id de son module à la construction du contexte (un module qui pose
  // un filtre depuis un bouton, longtemps après son build, reste chez lui).
  function filtreCalcul(nom, fn) { ajouteFiltre(nom, fn, proprietaireCourant); }

  // ---------- calculs ----------
  // Chaque valeur dérivée existe en deux temps : <nom>Brut fait le calcul,
  // <nom> le passe aux filtres. Les fonctions <nom>Auto, elles, sont AUTRE
  // CHOSE : la valeur avant le forçage du MJ, et elles ne bougent pas.

  // ---------- ce que disent les règles ----------
  // Tout ce qui suit LIT les données engendrées par hooks/mia_creation.py
  // depuis la page de règles. Rien n'est recalculé ici : la table des valeurs
  // porte déjà le MOD, la LIM et l'XP cumulé de 0 à 20.
  function regles() { return (typeof DATA === "object" && DATA) || {}; }
  function repli(cle) {
    var v = regles()[cle];
    return (v === undefined || v === null) ? REPLI[cle] : v;
  }
  function caracsRegles() { return regles().caracs || []; }
  function compsRegles() { return regles().comps || []; }
  // Les sigles des caractéristiques, dans l'ordre de la page. Remplace la
  // liste écrite en dur qu'était CHAMPS : l'ordre d'affichage est celui des
  // règles, et une caractéristique ajoutée à la page arrive sans toucher au code.
  function champs() { return caracsRegles().map(function (c) { return c.code; }); }
  function champsComp() { return compsRegles().map(function (c) { return c.code; }); }
  function caracInfo(code) {
    var l = caracsRegles(), i;
    for (i = 0; i < l.length; i++) if (l[i].code === code) return l[i];
    return { code: code, nom: code, groupe: "" };
  }
  function compInfo(code) {
    var l = compsRegles(), i;
    for (i = 0; i < l.length; i++) if (l[i].code === code) return l[i];
    return { code: code, nom: code, mod: [], lim: "" };
  }

  // LA TABLE DES VALEURS, et le seul endroit qui la lise. Une valeur hors table
  // (un modificateur qui pousse au-delà de 20, un total négatif) se rabat sur la
  // ligne la plus proche : la fiche ne fabrique pas de MOD que les règles
  // n'annoncent pas.
  function ligneValeur(v) {
    var t = regles().valeurs || [];
    if (!t.length) return { v: v, mod: 0, lim: 0, xp: 0 };
    var n = Math.floor(v);
    if (n <= t[0].v) return t[0];
    if (n >= t[t.length - 1].v) return t[t.length - 1];
    for (var i = 0; i < t.length; i++) if (t[i].v === n) return t[i];
    return t[t.length - 1];
  }

  // ---------- LES CINQ LEVIERS DU MENEUR ----------
  // UNE SEULE CHAÎNE, LA MÊME POUR LES CINQ. Le plafond, le coût en xp, le
  // modificateur, la limite et l'écart se règlent du même geste :
  //
  //     le forcé, s'il est rempli
  //     sinon (((base + a1 + a2) × m1 × m2) + a3 + a4) × m3 × m4
  //
  // « base » est ce que la RÈGLE donne pour ce levier, et rien d'autre : le
  // prestige, l'xp cumulé de la ligne, le MOD de la table, sa limite, l'écart
  // des règles.
  //
  // L'ORDRE DANS UN GROUPE EST SANS EFFET — l'addition commute, la
  // multiplication associe. C'est la coupure en QUATRE groupes qui fait tout, et
  // la grille des Options la montre telle quelle, de gauche à droite : deux
  // ajouts sur la base, deux facteurs, deux ajouts, deux facteurs encore.
  //
  // QUATRE GROUPES, ET NON TROIS, parce que trois ne savent pas tout dire : un
  // ajout posé APRÈS la dernière multiplication ne pouvait plus être multiplié,
  // et « ajoute 20 puis double le tout » n'avait aucune écriture. Alterner deux
  // fois les deux opérations donne toutes les combinaisons.
  //
  // LA CHAÎNE NE SAIT PAS OÙ DORMENT SES NOMBRES, et c'est ce qui permet aux
  // trois porteurs de la partager. Une caractéristique range les siens dans une
  // table à trois niveaux (levier, boîte, sigle) ; une compétence dans une table
  // sœur ; une SPÉCIALITÉ les porte sur elle-même, sans niveau de sigle — elle
  // EST déjà l'individu, et son seul identifiant serait son rang dans un tableau
  // qui se réordonne. On sépare donc le CALCUL de l'endroit où l'on range :
  // chaîne() ne reçoit qu'une fonction qui rend une boîte.
  function boiteNombre(v) {
    return (typeof v === "number" && isFinite(v)) ? v : undefined;
  }
  // UN AJOUT VIDE VAUT ZÉRO, UN FACTEUR VIDE VAUT UN, et c'est toute la
  // différence entre les deux. Lire un facteur absent comme un zéro mettrait la
  // valeur à zéro au premier champ qu'on tape puis qu'on efface.
  function chaineAdd(v) { return v === undefined ? 0 : v; }
  function chaineMul(v) { return v === undefined ? 1 : v; }
  // La chaîne SANS le forçage : c'est elle que le champ « Forcé » montre en
  // filigrane, et c'est ce que les fonctions <nom>Auto rendent.
  function chaineAuto(lire, base) {
    var v = (((base + chaineAdd(lire("a1")) + chaineAdd(lire("a2"))) *
              chaineMul(lire("m1")) * chaineMul(lire("m2"))) +
             chaineAdd(lire("a3")) + chaineAdd(lire("a4"))) *
            chaineMul(lire("m3")) * chaineMul(lire("m4"));
    // UN RÉSULTAT NON FINI REND LA BASE. applique() refuse déjà ce qu'un FILTRE
    // rend d'infini ou d'illisible, mais elle ne voit pas ce qui se fabrique
    // ici : un NaN né dans la chaîne traverserait la fiche entière sans un mot.
    if (!isFinite(v)) return base;
    // ARRONDI AU CENTIÈME, ET À LA TOUTE FIN. Les leviers acceptent les
    // décimales depuis toujours ; arrondir entre les deux facteurs empilerait
    // deux erreurs, et arrondir à l'unité mentirait sur l'xp, décimal par
    // décision. Ce qui doit être entier l'est chez celui qui le consomme.
    return Math.round(v * 100) / 100;
  }
  function chaine(lire, base) {
    var f = lire("force");
    return f === undefined ? chaineAuto(lire, base) : f;
  }
  // ---------- les trois porteurs ----------
  function lireCarac(nom, c) {
    return function (boite) {
      var l = state.caracsLeviers && state.caracsLeviers[nom];
      var tb = l && l[boite];
      return boiteNombre(tb && tb[c]);
    };
  }
  function lireComp(nom, code) {
    return function (boite) {
      var l = state.compsLeviers && state.compsLeviers[nom];
      var tb = l && l[boite];
      return boiteNombre(tb && tb[code]);
    };
  }
  function lireSpe(nom, spe) {
    return function (boite) {
      var l = spe && spe.leviers && spe.leviers[nom];
      return boiteNombre(l && l[boite]);
    };
  }
  // Les deux raccourcis des caractéristiques, qui gardent leurs appelants.
  function levierAuto(nom, c, base) { return chaineAuto(lireCarac(nom, c), base); }
  function levierChaine(nom, c, base) { return chaine(lireCarac(nom, c), base); }

  // ---------- le prestige ----------
  function prestigeAuto() { return (state.prestige || 0) + (state.prestigeMod || 0); }
  function prestige() {
    if (state.prestigeForce !== null && state.prestigeForce !== undefined) return state.prestigeForce;
    return prestigeAuto();
  }
  // Plafond d'une caractéristique : le prestige, passé par la chaîne du levier.
  // UN SEUL endroit le calcule — les garde-fous des boutons, l'infobulle et le
  // champ forcé des Options lisent tous cette fonction, sinon trois chiffres
  // différents finissent à l'écran.
  function caracPlafondAuto(c) { return levierAuto("plafond", c, prestige()); }
  function caracPlafond(c) { return levierChaine("plafond", c, prestige()); }

  // ---------- LES TROIS ÉTAGES D'UNE VALEUR ----------
  // LES TROIS FAMILLES SE CALCULENT DU MÊME GESTE, et dans cet ordre :
  //
  //     VALEUR   = chaîne(« valeur », base = ce qui est acheté)
  //     COIFFÉE  = min(VALEUR, PLAFOND)
  //     BONUS    = chaîne(« bonus », base = le bonus de la Fiche)
  //     TOTAL    = COIFFÉE + BONUS
  //
  // LE PLAFOND PASSE APRÈS LE LEVIER, et c'est tout le point : une valeur MÊME
  // MODIFIÉE ne dépasse pas son plafond. Le meneur qui veut passer outre lève le
  // plafond — il a son onglet à côté, et le dire deux fois au même endroit
  // rendrait la fiche illisible.
  //
  // LE BONUS S'AJOUTE APRÈS LA COIFFE, et lui n'est borné par rien : c'est ce
  // qui distingue un équipement d'un point acheté. Il a donc sa chaîne à lui, et
  // non une case dans celle de la valeur — sans quoi le plafond le mangerait.
  //
  // ---------- les caractéristiques ----------
  function caracBase(c) { return state.caracs[c] || 0; }
  function caracValeurAuto(c) { return levierAuto("valeur", c, caracBase(c)); }
  function caracValeurBrut(c) { return levierChaine("valeur", c, caracBase(c)); }
  // LA VALEUR COIFFÉE : le plafond mord sur ce que le levier a produit.
  function caracValeur(c) { return Math.min(caracValeurBrut(c), caracPlafond(c)); }
  function caracBonusSocle(c) { return state.caracsBonus[c] || 0; }
  function caracBonusAuto(c) { return levierAuto("bonus", c, caracBonusSocle(c)); }
  function caracBonus(c) { return levierChaine("bonus", c, caracBonusSocle(c)); }
  function caracTotalBrut(c) { return caracValeur(c) + caracBonus(c); }
  function caracTotal(c) {
    var v = caracTotalBrut(c);
    // le test évite de fabriquer l'objet d'infos pour rien : ce calcul-là est
    // rappelé des centaines de fois par rafraîchissement
    return aFiltre("caracTotal") ? applique("caracTotal", v, { carac: c }) : v;
  }
  // LE MODIFICATEUR, qui s'ajoute à tous les jets passant par la
  // caractéristique, et LA LIMITE, qui les plafonne. Les deux se lisent dans la
  // table, jamais ne se recalculent.
  // LA VALEUR NATURELLE : ce que la caractéristique vaut sans le bonus. Elle
  // ne sert qu'à la règle de l'écart, qui se calcule sur l'état d'AVANT les
  // leviers (voir speRetire).
  //
  // ELLE NE PASSE PAS PAR LE LEVIER DE VALEUR, et c'est délibéré : la règle de
  // l'écart lit ce que le JOUEUR a acheté, jamais ce que le meneur a accordé.
  // Sans quoi un levier posé pour dépanner un personnage lui reprendrait d'une
  // main ce qu'il lui donne de l'autre, en rabattant ses spécialités.
  function caracValeurNat(c) { return Math.min(caracBase(c), caracPlafond(c)); }
  function caracModNat(c) { return ligneValeur(caracValeurNat(c)).mod; }
  function caracLimNat(c) { return ligneValeur(caracValeurNat(c)).lim; }
  // Ce que la TABLE donne pour la valeur courante, bonus compris — avant le
  // levier du meneur. C'est la BASE de la chaîne, et c'est ce que le bloc des
  // Options montre en filigrane du champ forcé.
  function caracModTable(c) { return ligneValeur(caracTotal(c)).mod; }
  function caracLimTable(c) { return ligneValeur(caracTotal(c)).lim; }
  // LE FORÇAGE SE TESTE DANS LE BRUT, ET NON APRÈS LE FILTRE : posé dans
  // caracMod(), il sauterait applique() et couperait en silence tout mod déjà
  // écrit. Testé ici, un mod garde le dernier mot sur un MOD forcé —
  // exactement ce qu'il voit aujourd'hui d'un MOD décalé.
  function caracModAuto(c) { return levierAuto("mod", c, caracModTable(c)); }
  function caracModBrut(c) { return levierChaine("mod", c, caracModTable(c)); }
  function caracMod(c) {
    var v = caracModBrut(c);
    return aFiltre("caracMod") ? applique("caracMod", v, { carac: c }) : v;
  }
  function caracLimAuto(c) { return levierAuto("lim", c, caracLimTable(c)); }
  function caracLimBrut(c) { return levierChaine("lim", c, caracLimTable(c)); }
  function caracLim(c) {
    var v = caracLimBrut(c);
    return aFiltre("caracLim") ? applique("caracLim", v, { carac: c }) : v;
  }
  // L'ÉCART MINIMUM entre le total d'une spécialité et la limite naturelle de
  // sa caractéristique. La base vient des règles ; le meneur la passe par la
  // même chaîne que les quatre autres leviers — et son « forcé » est l'ancienne
  // case unique, une VALEUR et non un décalage : on pense « l'écart doit être
  // de 30 », pas « je décale de −20 ».
  function ecartMinAuto(c) { return levierAuto("ecart", c, repli("speMarge")); }
  function ecartMinBrut(c) { return levierChaine("ecart", c, repli("speMarge")); }
  function ecartMin(c) {
    var v = ecartMinBrut(c);
    return aFiltre("ecartMin") ? applique("ecartMin", v, { carac: c }) : v;
  }
  // Ce qu'une caractéristique coûte : l'XP CUMULÉ de sa ligne, et non une somme
  // de pas. La table porte déjà les 20 XP le +1 jusqu'à 5 puis 40 au-delà, donc
  // un barème corrigé dans les règles arrive ici sans qu'on rouvre ce fichier.
  function caracXpAuto(c) { return levierAuto("xp", c, ligneValeur(caracBase(c)).xp); }
  function caracXp(c) { return levierChaine("xp", c, ligneValeur(caracBase(c)).xp); }

  // ---------- les compétences ----------
  // LE PLAFOND DE POINTS : le MOD le plus haut des caractéristiques qui
  // commandent la compétence. PHY en compte quatre, COM deux, les six autres
  // une seule — et c'est la page de règles qui le dit, pas ce fichier.
  // LES CARACTÉRISTIQUES QUI COMMANDENT LE PLAFOND. Les règles le disent ; le
  // meneur peut le dire autrement POUR CE PERSONNAGE — un avantage change une
  // fiche, et rien d'autre que ces réglages ne peut le faire entrer, puisqu'un
  // avantage n'est que du texte.
  //
  // L'ÉTAT NE PORTE QUE LA SURCHARGE, jamais une copie des règles : sans quoi
  // une compétence dont la page change resterait sur l'ancienne liste, sans un
  // mot. Trois réponses, et non deux :
  //   clé absente        ce que disent les règles
  //   tableau non vide   celles-là
  //   tableau VIDE       rien ne commande ce plafond — c'est un réglage, pas
  //                      un oubli, et il vaut alors zéro
  function compsPlafondDe(code) {
    var tb = state.compsCaracsPlafond;
    if (tb && aClef(tb, code) && Array.isArray(tb[code])) return tb[code];
    return compInfo(code).mod || [];
  }
  function compPlafondSocle(code) {
    var mods = compsPlafondDe(code), best = 0;
    for (var i = 0; i < mods.length; i++) best = Math.max(best, caracMod(mods[i]));
    return best;
  }
  function compPlafondAuto(code) { return chaineAuto(lireComp("plafond", code), compPlafondSocle(code)); }
  function compPlafondBrut(code) { return chaine(lireComp("plafond", code), compPlafondSocle(code)); }
  function compPlafond(code) {
    var v = compPlafondBrut(code);
    return aFiltre("compPlafond") ? applique("compPlafond", v, { cle: code }) : v;
  }
  // La caractéristique par DÉFAUT d'une compétence : celle qui fournit le MOD
  // et la LIM quand le joueur ne demande rien d'autre. Il peut en demander une
  // autre au moment du jet — c'est tout l'intérêt d'avoir séparé les deux
  // colonnes. Même règle que le plafond : la surcharge seule, le repli sur les
  // règles quand elle manque.
  function compCarac(code) {
    var v = state.compsCarac && state.compsCarac[code];
    if (v) return v;
    return compInfo(code).lim || champs()[0] || "";
  }
  // LES TROIS ÉTAGES, ICI AUSSI. Le levier de valeur porte sur les points
  // ACHETÉS, et le plafond mord sur ce qu'il produit : « même modifiée, la
  // valeur ne dépasse pas le plafond ».
  //
  // C'ÉTAIT L'INVERSE, ET C'ÉTAIT FAUX : la chaîne partait d'une base déjà
  // coiffée ET déjà bonifiée, et son résultat n'était re-coiffé par rien. Un
  // levier de +10 sur une compétence à 100 points plafonnée à 70 rendait 80 —
  // il payait un plafond que le joueur avait déjà dépassé.
  function compValeurSocle(code) { return state.comps[code] || 0; }
  function compValeurAuto(code) { return chaineAuto(lireComp("valeur", code), compValeurSocle(code)); }
  function compValeurBrut(code) { return chaine(lireComp("valeur", code), compValeurSocle(code)); }
  function compValeur(code) { return Math.min(compValeurBrut(code), compPlafond(code)); }
  function compBonusSocle(code) { return state.compsBonus[code] || 0; }
  function compBonusAuto(code) { return chaineAuto(lireComp("bonus", code), compBonusSocle(code)); }
  function compBonus(code) { return chaine(lireComp("bonus", code), compBonusSocle(code)); }
  function compPtsBrut(code) { return compValeur(code) + compBonus(code); }
  function compPts(code) {
    var v = compPtsBrut(code);
    return aFiltre("compValue") ? applique("compValue", v, { cle: code }) : v;
  }
  function compXpSocle(code) { return (state.comps[code] || 0) * repli("xpComp"); }
  function compXpAuto(code) { return chaineAuto(lireComp("xp", code), compXpSocle(code)); }
  // LE FORÇAGE SE TESTE DANS LE BRUT, comme partout ailleurs. Il se testait ici
  // APRÈS le filtre : un coût forcé sautait applique(), et coupait en silence
  // tout mod qui filtre « compXp ».
  function compXpBrut(code) { return chaine(lireComp("xp", code), compXpSocle(code)); }
  function compXp(code) {
    var v = compXpBrut(code);
    return aFiltre("compXp") ? applique("compXp", v, { cle: code }) : v;
  }
  // L'ÉCART D'UNE COMPÉTENCE : celui de la caractéristique EMPLOYÉE, passé par
  // sa chaîne à elle.
  //
  // BÂTI SUR compCarac(code) SEUL, ON REJOUERAIT LE DÉFAUT SIGNALÉ EN PARTIE :
  // sous « Au choix », le jet part sous une caractéristique et le seuil
  // viendrait d'une autre. La grille des Options, elle, n'a pas de jet en
  // cours : elle montre celui de la caractéristique par défaut.
  function ecartCompAuto(code, carac) {
    return chaineAuto(lireComp("ecart", code), ecartMin(carac || compCarac(code)));
  }
  function ecartCompBrut(code, carac) {
    return chaine(lireComp("ecart", code), ecartMin(carac || compCarac(code)));
  }
  function ecartComp(code, carac) {
    var v = ecartCompBrut(code, carac);
    return aFiltre("ecartComp")
      ? applique("ecartComp", v, { cle: code, carac: carac || compCarac(code) })
      : v;
  }
  // LA LIMITE D'UNE COMPÉTENCE : celle de la caractéristique EMPLOYÉE, passée
  // par sa chaîne à elle. C'est le DEUXIÈME étage d'une cascade bâtie sur celle
  // de l'écart, et pour la même raison : les trois étages mesurent la MÊME
  // chose — un résultat de jet —, donc l'un peut servir de base au suivant.
  //
  // (C'est ce qui distingue la limite du PLAFOND, qui ne cascade pas : le
  // plafond d'une caractéristique est une VALEUR, celui d'une compétence un
  // NOMBRE DE POINTS. Deux unités, aucune base commune.)
  //
  // RIEN NE BOUGE TANT QUE PERSONNE NE RÈGLE : sans levier, chaque étage rend
  // sa base telle quelle, et le jet est coiffé comme avant.
  function compLimAuto(code, carac) {
    return chaineAuto(lireComp("lim", code), caracLim(carac || compCarac(code)));
  }
  function compLimBrut(code, carac) {
    return chaine(lireComp("lim", code), caracLim(carac || compCarac(code)));
  }
  function compLim(code, carac) {
    var v = compLimBrut(code, carac);
    return aFiltre("compLim")
      ? applique("compLim", v, { cle: code, carac: carac || compCarac(code) })
      : v;
  }

  // ---------- les spécialités ----------
  // Une spécialité relève d'UNE caractéristique et d'UNE compétence, qui ne
  // sont pas forcément accordées : Esquive tient de DEX, sa compétence COM
  // plafonne sur le meilleur de DEX et d'AGI. Le plafond de la spécialité les
  // fait donc entrer tous les deux, chacun compté pour 30 au minimum — sans quoi
  // on accumulerait des points à 2 en caractéristique pour les emporter à 3.
  // AUCUN PLAFOND SUR UNE SPÉCIALITÉ. On y met ce qu'on veut : rien ne borne
  // les points, ni au calcul ni à la saisie. Ce qui reste de l'ancienne borne,
  // c'est un AVERTISSEMENT — jaune, dans les garde-fous de l'en-tête — dès que
  // le total dépasse la limite moins la marge des règles : au-delà, la limite
  // rogne le jet et les points achetés ne rapportent plus rien.
  // ---------- LE PLAFOND D'UNE SPÉCIALITÉ ----------
  // LES RÈGLES NE LUI EN DONNENT AUCUN, et c'est pourquoi la coiffe NE MORD QUE
  // si le meneur a réglé quelque chose. Sans réglage, une spécialité n'est
  // bornée par rien — exactement comme avant —, et ce qui la retient reste la
  // règle de l'écart, qui rabat le TOTAL et non les points.
  //
  // FAIRE MORDRE UNE COIFFE PAR DÉFAUT AURAIT ÉTÉ UN CHANGEMENT DE RÈGLE : la
  // spécialité à 200 points d'une fiche réelle, dont la compétence plafonne à
  // 70, serait tombée à 70 sans que personne ne l'ait demandé.
  //
  // LA BASE EST CELLE DE SA COMPÉTENCE, et sans compétence le MOD de sa
  // caractéristique — c'est-à-dire ce que serait le plafond d'une compétence
  // qui n'en relèverait que d'une. Elle ne mord pas ; elle donne au meneur le
  // nombre à partir duquel il règle, et les huit boîtes le déplacent.
  function spePlafondSocle(spe, carac, comp) {
    var k = speComp(spe, comp);
    if (k) return compPlafond(k);
    var c = speCarac(spe, carac);
    return c ? caracMod(c) : 0;
  }
  function spePlafondAuto(spe) { return chaineAuto(lireSpe("plafond", spe), spePlafondSocle(spe)); }
  function spePlafond(spe) { return chaine(lireSpe("plafond", spe), spePlafondSocle(spe)); }
  // POSÉ OU NON : un plafond que personne n'a touché n'existe pas.
  function spePlafondPose(spe) { return levierRegleDe(lireSpe("plafond", spe)); }
  function speCoiffe(spe, v) {
    return spePlafondPose(spe) ? Math.min(v, spePlafond(spe)) : v;
  }

  function spePtsSocle(spe) { return (spe && spe.pts) || 0; }
  function spePtsAuto(spe) { return chaineAuto(lireSpe("valeur", spe), spePtsSocle(spe)); }
  function spePtsBrut(spe) {
    if (!spe) return 0;
    return speCoiffe(spe, chaine(lireSpe("valeur", spe), spePtsSocle(spe)));
  }
  function spePts(spe) {
    var v = spePtsBrut(spe);
    return aFiltre("spePts") ? applique("spePts", v, { spe: spe }) : v;
  }
  //
  // LE BONUS D'UNE SPÉCIALITÉ NE PASSE PAS PAR speTotal, et il ne le peut pas :
  // il s'ajoute APRÈS le rabattage de l'écart (voir 100-calculs-jets.js). Le
  // faire entrer dans le total ferait rabattre la spécialité par son propre
  // bonus. Il a donc sa chaîne, appliquée là où il tombe.
  function speBonusSocle(spe) { return (spe && spe.bonus) || 0; }
  function speBonusAuto(spe) { return chaineAuto(lireSpe("bonus", spe), speBonusSocle(spe)); }
  function speBonus(spe) {
    if (!spe) return 0;
    return chaine(lireSpe("bonus", spe), speBonusSocle(spe));
  }
  // LA CARACTÉRISTIQUE EMPLOYÉE, qui n'est pas toujours celle de la spécialité.
  // Le réglage « Au choix » de la barre d'envoi fait demander à Roll20, avant
  // de lancer, LAQUELLE porte le jet : une spécialité rangée sous DEX peut
  // très bien partir sous FOR. Tout ce qui suit accepte donc une
  // caractéristique en second argument, et retombe sur la sienne sans elle.
  //
  // C'EST UN DÉFAUT SIGNALÉ EN PARTIE, et il coûtait des points pour de bon :
  // une spécialité ramenée par la règle de l'écart sous SA caractéristique
  // gardait son retrait quand on la lançait sous une AUTRE, plus haute — donc
  // sous une limite qui ne la ramenait pas. Le joueur perdait un retrait que
  // rien ne justifiait plus, et le plafond du jet, lui, employait bien la
  // caractéristique choisie : les deux moitiés du calcul ne parlaient pas de
  // la même.
  function speCarac(spe, carac) {
    return carac || (spe && spe.carac) || "";
  }
  // ET LA COMPÉTENCE EMPLOYÉE, pour la même raison : le réglage « Compétence :
  // au choix » de la barre d'envoi fait demander à Roll20 LAQUELLE porte le
  // jet. Une spécialité rangée sous Combat peut très bien partir sous
  // Physique, et ce sont alors les points de CELLE-CI qui entrent dans le
  // total — donc aussi dans ce que la règle de l'écart ramène.
  //
  // La chaîne vide est une réponse LÉGITIME : une spécialité peut ne relever
  // d'aucune compétence, et on peut vouloir la lancer sans. D'où le second
  // argument testé sur « undefined » et non sur sa vérité.
  function speComp(spe, comp) {
    if (comp !== undefined && comp !== null) return comp;
    return (spe && spe.comp) || "";
  }
  // L'ÉCART D'UNE SPÉCIALITÉ, DERNIER MAILLON : celui de la compétence
  // EMPLOYÉE, passé par sa chaîne à elle. SANS COMPÉTENCE — et c'est une
  // réponse légitime, voir juste au-dessus — il n'y a pas d'étage du milieu :
  // la base est celle de la caractéristique, directement, et non un étage
  // fictif qui rendrait toujours la même chose.
  //
  // LA CASCADE EST STRICTEMENT DESCENDANTE : ecartSpe → ecartComp → ecartMin →
  // l'écart des règles. Rien ne remonte, jamais. La garde de récursion des
  // filtres ne protège QUE les filtres : un cycle écrit ICI ferait exploser la
  // pile sans qu'aucune garde ne le voie.
  function ecartSpeBase(spe, carac, comp) {
    var c = speCarac(spe, carac), k = speComp(spe, comp);
    return k ? ecartComp(k, c) : ecartMin(c);
  }
  function ecartSpeAuto(spe, carac, comp) {
    return chaineAuto(lireSpe("ecart", spe), ecartSpeBase(spe, carac, comp));
  }
  function ecartSpeBrut(spe, carac, comp) {
    return chaine(lireSpe("ecart", spe), ecartSpeBase(spe, carac, comp));
  }
  function ecartSpe(spe, carac, comp) {
    var v = ecartSpeBrut(spe, carac, comp);
    return aFiltre("ecartSpe")
      ? applique("ecartSpe", v, { spe: spe, carac: speCarac(spe, carac), comp: speComp(spe, comp) })
      : v;
  }
  // LA LIMITE D'UNE SPÉCIALITÉ, DERNIER MAILLON : celle de la compétence
  // EMPLOYÉE, passée par sa chaîne à elle. SANS COMPÉTENCE — réponse légitime —
  // l'étage du milieu n'existe pas et la base est celle de la caractéristique,
  // directement. Exactement la cascade de l'écart, et strictement descendante.
  function speLimBase(spe, carac, comp) {
    var c = speCarac(spe, carac), k = speComp(spe, comp);
    return k ? compLim(k, c) : caracLim(c);
  }
  function speLimAuto(spe, carac, comp) {
    return chaineAuto(lireSpe("lim", spe), speLimBase(spe, carac, comp));
  }
  function speLimBrut(spe, carac, comp) {
    return chaine(lireSpe("lim", spe), speLimBase(spe, carac, comp));
  }
  function speLim(spe, carac, comp) {
    var v = speLimBrut(spe, carac, comp);
    return aFiltre("speLim")
      ? applique("speLim", v, { spe: spe, carac: speCarac(spe, carac), comp: speComp(spe, comp) })
      : v;
  }
  // LA LIMITE QUI COIFFE UN JET, en bout de chaîne : celle de la spécialité
  // s'il y en a une, sinon celle de la compétence, sinon celle de la
  // caractéristique. UN SEUL endroit la décide — la ligne, le jet et
  // l'infobulle lisent tous celui-ci, sinon trois nombres différents finissent
  // à l'écran pour un même jet.
  //
  // LE RABATTAGE DE L'ÉCART NE LA LIT PAS : il se calcule sur caracLimNat, la
  // limite d'avant les leviers (voir speRetire). C'est ce qui permet au meneur
  // d'abaisser une limite sans que le retrait bouge — et c'était déjà vrai du
  // levier de limite des caractéristiques.
  function limiteJet(carac, comp, spe) {
    if (spe) return speLim(spe, carac, comp);
    if (comp) return compLim(comp, carac);
    return caracLim(carac);
  }

  // LE TOTAL D'UNE SPÉCIALITÉ : ses points, le MOD de la caractéristique
  // employée, les points de sa compétence. C'est ce nombre-là que la règle de
  // l'écart borne.
  function speTotalBrut(spe, carac, comp) {
    if (!spe || !speCarac(spe, carac)) return 0;
    var k = speComp(spe, comp);
    return spePts(spe) + caracMod(speCarac(spe, carac)) + (k ? compPts(k) : 0);
  }
  // ET SON RABATTAGE. Rien n'est bloqué à l'achat : on met dans une spécialité
  // ce qu'on veut. C'est le total EMPLOYÉ AU JET qui redescend.
  //
  // CE QUE LA RÈGLE RETIRE SE CALCULE UNE FOIS, SUR L'ÉTAT NATUREL — la
  // caractéristique sans son bonus, sa limite sans décalage — puis se CONSERVE
  // tel quel. Les leviers du meneur s'appliquent par-dessus, ils ne le
  // recalculent pas.
  //
  // C'est de là que sortent, d'une seule règle, les deux exceptions que le
  // système admet :
  //   — le meneur abaisse la SEULE limite : le retrait ne bouge pas, donc
  //     l'écart se resserre sous son minimum ;
  //   — le meneur abaisse la CARACTÉRISTIQUE : le total baisse, le retrait ne
  //     bouge pas, l'écart se resserre aussi.
  // Recalculer le retrait après coup effacerait les deux : l'écart reviendrait
  // à son minimum et les leviers n'auraient servi à rien.
  //
  // Le levier d'ÉCART, lui, entre bien dans le calcul : il ne suspend pas la
  // règle, il en déplace le seuil.
  //
  // LE RETRAIT SE CALCULE SOUS LA CARACTÉRISTIQUE EMPLOYÉE, et c'est tout le
  // sujet du défaut corrigé : c'est SA limite qui décide s'il y a lieu de
  // ramener quelque chose. Une caractéristique plus haute ne ramène rien.
  //
  // ET « NATUREL » VAUT POUR LES TROIS TERMES, pas seulement pour le MOD. Il
  // prenait spePts (déjà passé par le levier de valeur) et compPts (déjà coiffé
  // ET déjà bonifié) : un bonus de compétence montait donc dans les DEUX totaux
  // à la fois, le brut et le naturel, et le rabattage le remangeait en entier.
  // L'onglet « Bonus » des compétences agissait pour une caractéristique et ne
  // faisait RIEN pour une spécialité rabattue — un levier qui ne change rien
  // n'est pas un levier.
  function compPtsNat(code) { return Math.min(state.comps[code] || 0, compPlafond(code)); }
  // LA COIFFE ENTRE DANS L'ÉTAT NATUREL, comme celle d'une caractéristique et
  // celle d'une compétence : sans elle, rogner les points ferait baisser le
  // total brut ET le total naturel de la même quantité, le retrait ne bougerait
  // pas, et la coiffe n'aurait servi à rien.
  function spePtsNat(spe) { return speCoiffe(spe, (spe && spe.pts) || 0); }
  function speTotalNat(spe, carac, comp) {
    var c = speCarac(spe, carac);
    if (!spe || !c) return 0;
    var k = speComp(spe, comp);
    return spePtsNat(spe) + caracModNat(c) + (k ? compPtsNat(k) : 0);
  }
  function speRetire(spe, carac, comp) {
    var c = speCarac(spe, carac);
    if (!spe || !c) return 0;
    if (state.ecartCoupe) return 0;   // règle suspendue pour ce personnage
    // L'ÉCART EST CELUI DE LA SPÉCIALITÉ, en bout de cascade — et non plus
    // celui de sa caractéristique. « comp » passe BRUT, pour que la base de
    // l'écart et le total résolvent la compétence par le même chemin.
    var haut = Math.max(0, caracLimNat(c) - ecartSpe(spe, c, comp));
    return Math.max(0, speTotalNat(spe, c, comp) - haut);
  }
  function speTotal(spe, carac, comp) {
    var c = speCarac(spe, carac);
    if (!spe || !c) return 0;
    var k = speComp(spe, comp);
    var v = speTotalBrut(spe, c, k) - speRetire(spe, c, k);
    return aFiltre("speTotal") ? applique("speTotal", v, { spe: spe, carac: c, comp: k }) : v;
  }

  // Un point de spécialité coûte un QUART d'XP : le total est donc décimal, et
  // c'est voulu. On l'arrondit au centième pour que l'en-tête n'affiche pas
  // 12.750000000000002.
  function speXpSocle(spe) {
    return Math.round(((spe && spe.pts) || 0) * repli("xpSpe") * 100) / 100;
  }
  function speXpAuto(spe) { return chaineAuto(lireSpe("xp", spe), speXpSocle(spe)); }
  function speXp(spe) {
    if (!spe) return 0;
    return chaine(lireSpe("xp", spe), speXpSocle(spe));
  }
  // Retrouver une spécialité par son nom, pour les formules qui la nomment :
  // les PV ajoutent « SPÉ PV », la récupération EST une spécialité, et
  // l'obstination en lance une. La comparaison ignore la casse et les espaces.
  function speParNom(nom) {
    var cible = String(nom || "").trim().toLowerCase(), l = state.specialites || [], i;
    for (i = 0; i < l.length; i++) {
      if (String(l[i].nom || "").trim().toLowerCase() === cible) return l[i];
    }
    return null;
  }
  function spePtsParNom(nom) {
    var s = speParNom(nom);
    return s ? spePts(s) : 0;
  }

  // ---------- les langues ----------
  // UNE SPÉCIALITÉ « PASSIVE » : elle n'ajoute PAS le modificateur de sa
  // caractéristique. Là où speTotal fait « points + MOD + points de la
  // compétence », une langue ne vaut que ses points. Elle ne se lance pas, elle
  // se possède.
  //
  // MAIS ELLE RESPECTE LA LIMITE de sa caractéristique, et c'est le seul
  // emprunt qu'elle lui fait. On coiffe donc, on ne rabat pas : la règle de
  // l'écart borne un total À DISTANCE de la limite (voir speRetire), et ce n'est
  // pas ce qui a été demandé ici — c'est la limite elle-même qui borne.
  function langueCarac() { return repli("langueCarac"); }
  function langueSeuils() {
    var s = repli("langueNiveaux");
    return Array.isArray(s) ? s : [];
  }
  function languePts(l) { return (l && l.pts) || 0; }
  function langueTotalBrut(l) {
    var c = langueCarac();
    if (!c) return languePts(l);
    return Math.min(languePts(l), caracLim(c));
  }
  function langueTotal(l) {
    var v = langueTotalBrut(l);
    return aFiltre("langueTotal") ? applique("langueTotal", v, { langue: l }) : v;
  }
  // LE NIVEAU SE LIT SUR LE TOTAL, jamais sur les points achetés : une langue
  // ramenée par la limite ne vaut que ce qu'elle vaut, et annoncer un niveau
  // qu'elle n'atteint plus serait mentir.
  //
  // ZÉRO VEUT DIRE « AUCUN NIVEAU », pas « niveau zéro » : on peut mettre des
  // points dans une langue sans avoir encore atteint le premier seuil.
  function langueNiveau(l) {
    var t = langueTotal(l), s = langueSeuils(), n = 0, i;
    for (i = 0; i < s.length; i++) if (t >= s[i]) n = i + 1;
    return n;
  }
  // Un point de langue coûte comme un point de spécialité : c'en est une.
  function langueXp(l) {
    return Math.round(languePts(l) * repli("xpSpe") * 100) / 100;
  }
  function languesXp() {
    var t = 0, l = state.langues || [], i;
    for (i = 0; i < l.length; i++) t += langueXp(l[i]);
    return Math.round(t * 100) / 100;
  }

  // ---------- les arts ----------
  // CE QU'UN ART COÛTE, effets compris : celui de base et toutes les
  // améliorations. Les deux monnaies se comptent pareil, elles ne diffèrent que
  // par le champ lu.
  //
  // TOUT CE QUI EST ÉCRIT EST ACQUIS : une amélioration qui figure sur la fiche
  // est une amélioration que le personnage a. Il n'y a pas de liste de courses.
  function artSomme(a, champ) {
    if (!a) return 0;
    var t = (a.base && a.base[champ]) || 0, l = a.ameliorations || [], i;
    for (i = 0; i < l.length; i++) t += (l[i] && l[i][champ]) || 0;
    return Math.round(t * 100) / 100;
  }
  function artXp(a) { return artSomme(a, "xp"); }
  function artAvantage(a) { return artSomme(a, "avantage"); }
  function artsXp() {
    var t = 0, l = state.arts || [], i;
    for (i = 0; i < l.length; i++) t += artXp(l[i]);
    return Math.round(t * 100) / 100;
  }
  // AUCUN BUDGET D'AVANTAGE N'EXISTE : la page de règles ne dit pas un mot du
  // mot « avantage » comme monnaie. On totalise donc sans rien comparer — et le
  // jour où un total sera décidé, c'est ici qu'il se branchera.
  function artsAvantage() {
    var t = 0, l = state.arts || [], i;
    for (i = 0; i < l.length; i++) t += artAvantage(l[i]);
    return Math.round(t * 100) / 100;
  }

  // ---------- l'expérience ----------
  function xpDepenseBrut() {
    var xp = 0;
    champs().forEach(function (c) { xp += caracXp(c); });
    champsComp().forEach(function (c) { xp += compXp(c); });
    (state.specialites || []).forEach(function (s) { xp += speXp(s); });
    // LES ARTS COMPTENT, eux aussi : un coût qui n'entre pas dans le total
    // n'est pas un coût. Ils n'entrent en revanche pas dans xpChamp, qui
    // répartit l'xp par caractéristique — un art ne relève d'aucune.
    xp += artsXp();
    // LES LANGUES COMPTENT AUSSI : ce sont des spécialités, leurs points se
    // paient. Elles n'entrent pas dans xpChamp, qui répartit par
    // caractéristique — il faudrait décider si MEN les porte, et personne ne
    // l'a demandé.
    xp += languesXp();
    return Math.round(xp * 100) / 100;
  }
  function xpDepense() {
    var v = xpDepenseBrut();
    return aFiltre("xpDepense") ? applique("xpDepense", v, {}) : v;
  }
  function xpRestant() { return Math.round((state.xpTotal - xpDepense()) * 100) / 100; }
  // XP dépensé DANS un champ : la montée de la caractéristique elle-même, plus
  // les compétences qu'elle commande et les spécialités qui en relèvent. Une
  // compétence qui plafonne sur plusieurs caractéristiques compte dans celle
  // qu'elle lance par défaut, pour n'être comptée qu'une fois.
  function xpChamp(carac) {
    var xp = caracXp(carac);
    champsComp().forEach(function (c) { if (compCarac(c) === carac) xp += compXp(c); });
    (state.specialites || []).forEach(function (s) { if (s.carac === carac) xp += speXp(s); });
    return Math.round(xp * 100) / 100;
  }
  // ---------- le corps ----------
  // Les valeurs issues d'une division s'arrondissent à l'INFÉRIEUR.

  // PV = (20 + MOD CON + PHY) / 2 + SPÉ PV. « PHY » y désigne les POINTS de la
  // compétence Physique, pas son jet : c'est ce que le personnage a investi
  // dedans. La spécialité s'ajoute APRÈS la division, telle qu'elle est écrite.
  function pvMaxAuto() {
    var base = (20 + caracMod("CON") + compPts("PHY")) / 2;
    return Math.floor(base) + spePtsParNom("PV") + modSum(state.divers.pvMax);
  }
  function pvMaxBrut() { return state.pvMaxOverride !== null ? state.pvMaxOverride : pvMaxAuto(); }
  function pvMax() {
    var v = pvMaxBrut();
    return aFiltre("pvMax") ? applique("pvMax", v, {}) : v;
  }
  function pvCourant() { return state.pv === null ? pvMax() : state.pv; }
  // LA BARRE NÉGATIVE. Le personnage meurt à −100 % de ses PV maximaux : le
  // plancher de la seconde barre est donc l'opposé du maximum.
  function pvPlancher() { return -pvMax(); }
  function pvMort() { return pvCourant() <= pvPlancher(); }
  // Le seuil du jet d'obstination, à faire chaque fois que des dégâts font
  // passer les PV dans le négatif : la part du maximum déjà creusée, en
  // pourcents. À −30 sur 60 de maximum, le seuil est 50.
  function obstinationDD() {
    var m = pvMax();
    if (m <= 0 || pvCourant() >= 0) return 0;
    return Math.round(Math.abs(pvCourant()) / m * 100);
  }

  // ---------- l'endurance ----------
  // Une réserve égale au MOD CON, qui descend jusqu'à son opposé. Dans le
  // négatif, sa valeur absolue devient un malus sur TOUS les jets — c'est le
  // seul malus général du système, et il se lit ici.
  function enduranceMaxAuto() { return caracMod("CON") + modSum(state.divers.endurance); }
  function enduranceMaxBrut() {
    return state.enduranceMaxOverride !== null ? state.enduranceMaxOverride : enduranceMaxAuto();
  }
  function enduranceMax() {
    var v = enduranceMaxBrut();
    return aFiltre("enduranceMax") ? applique("enduranceMax", v, {}) : v;
  }
  function endurancePlancher() { return -enduranceMax(); }
  function enduranceCourante() {
    return state.endurance === null ? enduranceMax() : state.endurance;
  }
  function enduranceMalusBrut() { return Math.max(0, -enduranceCourante()); }
  function enduranceMalus() {
    var v = enduranceMalusBrut();
    return aFiltre("enduranceMalus") ? applique("enduranceMalus", v, {}) : v;
  }
  // À −100 % de sa réserve, le personnage tombe et ne se relève qu'au plein.
  function enduranceAuTapis() {
    return enduranceMax() > 0 && enduranceCourante() <= endurancePlancher();
  }

  // ---------- la récupération ----------
  // Une spécialité unique, dont le plafond n'est PAS celui des autres : MOD CON
  // fois le multiplicateur des règles. Elle commande ce qu'on regagne par jour.
  function recupPlafond() { return caracMod("CON") * repli("recupMult"); }
  function recupPts() { return Math.min(spePtsParNom("Récupération"), recupPlafond()); }
  function recupJourAuto() {
    return Math.floor((caracMod("CON") + recupPts()) / 2) + modSum(state.divers.recup);
  }
  function recupJourBrut() {
    return state.recupOverride !== null ? state.recupOverride : recupJourAuto();
  }
  function recupJour() {
    var v = recupJourBrut();
    return aFiltre("recupJour") ? applique("recupJour", v, {}) : v;
  }
  // L'ENDURANCE SE REGAGNE EN ENTIER. Deux fois son maximum, dit la règle : la
  // réserve court de −max à +max, donc deux fois le maximum est exactement ce
  // qu'il faut pour la remplir depuis le fond. Une nuit suffit, quel que soit
  // l'état où l'on s'est couché.
  function recupEnduranceJourBrut() {
    return Math.floor(enduranceMax() * repli("recupEndurMult"));
  }
  function recupEnduranceJour() {
    var v = recupEnduranceJourBrut();
    return aFiltre("recupEnduranceJour") ? applique("recupEnduranceJour", v, {}) : v;
  }

  // ---------- la charge ----------
  // Le poids des objets se calcule ICI et nulle part ailleurs : le module
  // d'inventaire lit les mêmes trois fonctions que poidsPorteBrut(). Deux
  // calculs séparés finiraient par se contredire à l'écran (le pied du module
  // annonçant un chiffre, l'initiative en supposant un autre), ce qui est pire
  // que l'absence du réglage.
  //
  // Un groupe décoché est posé au sol : ses objets restent dans la fiche, se
  // lisent, se donnent et se déplacent, mais leur poids ne pèse plus sur le
  // personnage.
  function invCompte(gi) { return state.inv.comptes[gi] !== false; }
  function poidsGroupe(gi) {
    var t = 0;
    state.inv.objets.forEach(function (o) {
      if (o.groupe === gi) t += pnum(o.qte) * pnum(o.poids);
    });
    return Math.round(t * 100) / 100;
  }
  // porte = true : ce qui est SUR le personnage ; false : ce qu'il a posé.
  function poidsObjets(porte) {
    var t = 0;
    state.inv.groupes.forEach(function (_, gi) {
      if (invCompte(gi) === porte) t += poidsGroupe(gi);
    });
    return Math.round(t * 100) / 100;
  }
  function poidsPorteBrut() {
    var t = 0;
    state.armes.forEach(function (a) { t += pnum(a.poids); });
    state.armures.forEach(function (a) { t += pnum(a.poids); });
    // les groupes posés au sol ne pèsent plus : c'est la case du bandeau. Les
    // armes et les armures, elles, sont toujours sur le personnage.
    t += poidsObjets(true);
    return Math.round(t * 100) / 100;
  }
  function poidsPorte() {
    var v = poidsPorteBrut();
    return aFiltre("poidsPorte") ? applique("poidsPorte", v, {}) : v;
  }
  // Ce que le personnage peut porter : le plus haut de ses deux modificateurs
  // de force et de constitution.
  function chargeMaxAuto() {
    return Math.max(caracMod("CON"), caracMod("FOR")) + modSum(state.divers.charge);
  }
  function chargeMaxBrut() {
    return state.chargeOverride !== null ? state.chargeOverride : chargeMaxAuto();
  }
  function chargeMax() {
    var v = chargeMaxBrut();
    return aFiltre("chargeMax") ? applique("chargeMax", v, {}) : v;
  }
  function chargePct() {
    var m = chargeMax();
    return m > 0 ? poidsPorte() / m * 100 : (poidsPorte() > 0 ? Infinity : 0);
  }
  // LES PALIERS FRANCHIS, du plus bas au plus haut. Ils se CUMULENT : à 100 %,
  // les trois s'appliquent l'un après l'autre. Les seuils viennent des règles,
  // leurs effets de CHARGE_EFFETS — les deux doivent bouger ensemble.
  function chargePaliers() {
    var pct = chargePct(), out = [];
    ((regles().charge) || []).forEach(function (p) {
      if (pct >= p.seuil && CHARGE_EFFETS[p.seuil]) {
        out.push({ seuil: p.seuil, effets: p.effets, calc: CHARGE_EFFETS[p.seuil] });
      }
    });
    out.sort(function (a, b) { return a.seuil - b.seuil; });
    return out;
  }
  // Le malus que la charge fait peser sur l'esquive, une fois les paliers
  // additionnés. Les modules et les infobulles le lisent ici plutôt que de le
  // recomposer, sinon ils finiraient par énumérer un terme que le total n'a pas
  // subi.
  function chargeMalusEsquive() {
    var t = 0;
    chargePaliers().forEach(function (p) { t += (p.calc.esq || 0); });
    return t;
  }
  // ---------- les jets ----------
  // UN JET N'EST PAS UN DÉ PLUS UN BONUS : c'est un couple, « d100 + bonus » et
  // « la limite », dont on garde le PLUS BAS. La limite plafonne donc le
  // résultat, et Roll20 l'affiche déjà plafonné, sans qu'un joueur ait à
  // comparer deux nombres au tchat. D'où la forme {…,0d0+LIM}kl1 : le second
  // terme est un dé à zéro face, c'est-à-dire une constante.
  //
  // Le MALUS D'ENDURANCE entre ici, et ici seulement : il pèse sur TOUS les
  // jets, donc l'écrire dans chaque appelant reviendrait à l'oublier une fois.
  // UNE SPÉCIALITÉ NE S'ADDITIONNE PAS TERME À TERME : son total est déjà
  // composé — ses points, le MOD de sa caractéristique, les points de sa
  // compétence — et surtout déjà RABATTU par la règle de l'écart. Le
  // recomposer ici rendrait le rabattage sans effet.
  //
  // Ce qui vient APRÈS le total, et qui n'entre donc pas dans le rabattage :
  // le bonus de la ligne, le malus de charge sur l'esquive, et le malus
  // d'endurance — qui pèse sur TOUS les jets, donc l'écrire dans chaque
  // appelant reviendrait à l'oublier une fois.
  //
  // LA CARACTÉRISTIQUE ET LA COMPÉTENCE PASSENT JUSQU'AU TOTAL, et il a fallu un
  // défaut de partie pour s'en apercevoir : sous « Au choix », le plafond du jet
  // employait la caractéristique choisie pendant que le total, lui, restait sur
  // celle de la spécialité — retrait de l'écart compris. Un joueur gardait donc
  // un retrait calculé sous une limite qui n'était plus la sienne.
  //
  // Pour une COMPÉTENCE, le second argument EST le jet : le choisir autre n'a
  // pas de sens, on lancerait l'autre compétence. Il ne sert donc qu'aux
  // spécialités, et c'est ce que dit la barre d'envoi.
  function jetBonusBrut(carac, comp, spe) {
    var b = -enduranceMalus();
    if (spe) b += speTotal(spe, carac, comp) + speBonus(spe) + speMalusCharge(spe);
    else {
      b += caracMod(carac);
      if (comp) b += compPts(comp);
    }
    return Math.round(b);
  }
  function jetBonus(carac, comp, spe) {
    var v = jetBonusBrut(carac, comp, spe);
    return aFiltre("jetBonus")
      ? applique("jetBonus", v, { carac: carac, cle: comp, spe: spe })
      : v;
  }
  // La charge ne mord que sur l'esquive, et l'esquive est une SPÉCIALITÉ : le
  // malus s'applique donc au jet qui la porte, pas à sa compétence entière.
  function speMalusCharge(spe) {
    if (!spe || String(spe.nom || "").trim().toLowerCase() !== CHARGE_ESQUIVE.toLowerCase()) return 0;
    return chargeMalusEsquive();
  }
  // L'expression Roll20 d'un jet, prête à poser entre les doubles crochets.
  //
  // LE MODIFICATEUR SAISI À L'ENVOI S'AJOUTE APRÈS LE PLAFOND, hors du groupe.
  // C'est la règle de l'endurance : ce qu'on dépense « est un bonus qu'on
  // ajoute à la fin ». La limite borne donc ce que le personnage vaut par
  // lui-même ; l'endurance est ce par quoi il la dépasse, et c'est tout son
  // prix. Posé dans le groupe, ce bonus serait rogné et ne servirait à rien
  // dès qu'un personnage atteint sa limite — c'est-à-dire justement quand il
  // en aurait besoin.
  //
  // LE DÉ EST CELUI DU RÉGLAGE, ET NON LA CONSTANTE. Le champ « Dé des jets de
  // test » écrivait dans l'état sans que rien ne le lise : on pouvait y mettre
  // ce qu'on voulait, la fiche lançait toujours le même dé. Il commande
  // maintenant ce qu'elle lance, marqueurs de critique compris.
  //
  // LE MODIFICATEUR EST UN NOMBRE, ET NON PLUS UNE REQUÊTE. La fiche le demande
  // elle-même, comme le reste : elle envoie donc une expression entièrement
  // calculée, sans requête ni entité — soixante-seize signes au lieu de quatre
  // mille, et rien à échapper.
  function jetExpr(bonus, lim, modif) {
    var b = Math.round(bonus);
    var m = Math.round(modif || 0);
    return "{" + deTest() + (b >= 0 ? "+" : "-") + Math.abs(b) +
           ",0d0+" + Math.round(lim) + "}kl1" +
           (m ? (m > 0 ? "+" : "-") + Math.abs(m) : "");
  }

  // ---------- l'initiative ----------
  // Base MOD AGI × 2. L'équipement s'y ajoute de deux façons qui ne sont PAS
  // symétriques, et c'est la règle : les BONUS ne comptent que pour ce qui est
  // porté activement, les MALUS comptent pour tout ce qu'on transporte. Un
  // personnage qui range une armure dans son sac en garde donc le malus.
  function equipInitBonus() {
    var t = 0;
    function prendre(o) {
      var v = pnum(o && o.ini);
      if (!v) return;
      if (v > 0) { if (o.porte !== false) t += v; }   // bonus : seulement porté
      else t += v;                                     // malus : toujours
    }
    state.armes.forEach(prendre);
    state.armures.forEach(prendre);
    return t;
  }
  // Mains nues : le bonus des règles, quand aucune arme n'est en main.
  function mainsNues() {
    for (var i = 0; i < state.armes.length; i++) if (state.armes[i].porte !== false) return false;
    return true;
  }
  function initiativeAuto() {
    var v = caracMod("AGI") * repli("iniMult") + equipInitBonus();
    if (mainsNues()) v += repli("iniMainsNues");
    chargePaliers().forEach(function (p) {
      if (p.calc.ini) v += p.calc.ini;
      if (p.calc.iniDiv) v = v / p.calc.iniDiv;
    });
    return Math.floor(v) + modSum(state.divers.initiative);
  }
  function initiativeBrut() {
    return state.initiativeOverride !== null ? state.initiativeOverride : initiativeAuto();
  }
  function initiative() {
    var v = initiativeBrut();
    return aFiltre("initiative") ? applique("initiative", v, {}) : v;
  }

  // ---------- la vitesse ----------
  // L'AGILITÉ SE MULTIPLIE PAR ELLE-MÊME : 5 en agilité valent 25 mètres, 10 en
  // valent 100. La progression n'est donc pas linéaire, et c'est la règle qui le
  // veut ; la forme carrée se lit dans la page, elle ne se décide pas ici.
  function vitesseAuto() {
    var agi = caracTotal("AGI");
    var v = repli("vitesseCarre") ? agi * agi : agi * repli("vitesseMult");
    chargePaliers().forEach(function (p) { if (p.calc.vitesseDiv) v = v / p.calc.vitesseDiv; });
    return Math.max(0, v + modSum(state.divers.vitesse));
  }
  function vitesseValBrut() {
    return state.vitesseOverride !== null ? state.vitesseOverride : vitesseAuto();
  }
  // le filtre porte sur le NOMBRE de mètres, jamais sur la chaîne rendue par
  // vitesse() : un mod qui double la vitesse fait une multiplication, pas une
  // opération de texte
  function vitesseVal() {
    var v = vitesseValBrut();
    return aFiltre("vitesse") ? applique("vitesse", v, {}) : v;
  }
  function vitesse() { return fmtP(vitesseVal()) + " m"; }

  // ---------- les sauts ----------
  // Les deux sauts partagent le diviseur de charge : c'est le même palier qui
  // les écrase, et la règle ne les sépare qu'au multiplicateur.
  function sautDiv() {
    var d = 1;
    chargePaliers().forEach(function (p) { if (p.calc.sautDiv) d *= p.calc.sautDiv; });
    return d;
  }
  // LES DEUX SAUTS SE RÈGLENT COMME LA VITESSE : valeur forcée, modificateurs,
  // point de filtre. Ce sont trois distances de déplacement, elles subissent
  // les mêmes paliers de charge, et un MJ qui peut décaler l'une sans pouvoir
  // décaler les autres n'a pas un réglage : il a un trou.
  // Les modificateurs entrent APRÈS la division de charge, comme pour la
  // vitesse : ce sont des mètres qu'on ajoute, pas un facteur qu'on rogne.
  function sautLongAuto() {
    var v = caracTotal("FOR") * repli("sautLong") / sautDiv();
    return Math.max(0, v + modSum(state.divers.sautLong));
  }
  function sautLongValBrut() {
    return state.sautLongOverride !== null ? state.sautLongOverride : sautLongAuto();
  }
  function sautLongVal() {
    var v = sautLongValBrut();
    return aFiltre("sautLong") ? applique("sautLong", v, {}) : v;
  }
  function sautHautAuto() {
    var d = repli("sautHaut") || 1;
    var v = caracTotal("FOR") / d / sautDiv();
    return Math.max(0, v + modSum(state.divers.sautHaut));
  }
  function sautHautValBrut() {
    return state.sautHautOverride !== null ? state.sautHautOverride : sautHautAuto();
  }
  function sautHautVal() {
    var v = sautHautValBrut();
    return aFiltre("sautHaut") ? applique("sautHaut", v, {}) : v;
  }
  function sautLong() { return fmtP(sautLongVal()) + " m"; }
  function sautHaut() { return fmtP(sautHautVal()) + " m"; }
  // ---------- la liste des compétences ----------
  // Les huit compétences des règles, dans leur ordre de page. Chaque entrée
  // porte de quoi l'afficher ET la lancer : son sigle, son nom, la
  // caractéristique qui la lance par défaut, et celles qui commandent son
  // plafond de points.
  function allComps() {
    return compsRegles().map(function (c) {
      return {
        key: c.code, name: c.nom, code: c.code,
        carac: compCarac(c.code), caracsPlafond: c.mod || []
      };
    });
  }

  // ---------- la liste des spécialités ----------
  // Elles sont la seule partie de la fiche que le joueur peuple lui-même : les
  // règles disent ce qu'est une spécialité et ce qu'elle coûte, pas lesquelles
  // existent. On rend donc l'état tel quel, en complétant les champs absents.
  // VESTIGE DU SCHÉMA 2 JETÉ : elle posait encore mod, mod2, force et xpForce,
  // que le pas 2 -> 3 a rangés dans spe.leviers et que la normalisation efface
  // aussitôt. Une spécialité neuve naissait donc avec quatre clés mortes.
  function blankSpe(nom, carac, comp) {
    return { nom: nom || "", carac: carac || "", comp: comp || "", pts: 0, bonus: 0 };
  }
  function allSpes() {
    return (state.specialites || []).map(function (s, i) {
      return {
        key: "spe/" + i, index: i, spe: s,
        name: s.nom || "Sans nom", carac: s.carac || "", comp: s.comp || ""
      };
    });
  }

  // ---------- les langues ----------
  // Même nature que les spécialités — une liste que le joueur peuple lui-même,
  // dont les règles ne disent pas lesquelles existent. Deux champs suffisent :
  // le niveau se DÉDUIT des points, il ne se range pas.
  function blankLangue(nom) {
    return { nom: nom || "", pts: 0 };
  }
  function allLangues() {
    return (state.langues || []).map(function (l, i) {
      return { key: "langue/" + i, index: i, langue: l, name: l.nom || "Sans nom" };
    });
  }

  // ---------- les arts : techniques et passifs ----------
  // MÊME NATURE QUE LES SPÉCIALITÉS — une liste que le joueur peuple lui-même,
  // dont les règles ne disent rien. D'où les mêmes trois pièces : une fabrique,
  // une enveloppe qui donne le RANG (seule identité d'une entrée sans clé), et
  // une normalisation champ par champ dans 060.
  //
  // LES CINQ CHAMPS D'UN EFFET SONT LES MÊMES PARTOUT : effet de base d'une
  // technique, effet de base d'un passif, amélioration de l'un ou de l'autre.
  // Une seule fabrique, donc, et aucune exception à retenir.
  function blankEffet() {
    return { nom: "", avantage: 0, xp: 0, desc: "", macro: "" };
  }
  function blankArt(type) {
    var a = {
      type: type === "passif" ? "passif" : "technique",
      nom: "",
      base: blankEffet(),
      ameliorations: []
    };
    // UN PASSIF NE PORTE PAS LA CLÉ. Il ne s'emploie pas, donc il ne coûte rien
    // à l'emploi ; poser un zéro ferait voyager jusqu'aux Attributs Roll20 un
    // nombre dont personne ne saurait dire s'il compte.
    if (a.type !== "passif") a.endurance = 0;
    return a;
  }
  function allArts() {
    return (state.arts || []).map(function (a, i) {
      return {
        key: "art/" + i, index: i, art: a,
        name: a.nom || "Sans nom", type: a.type === "passif" ? "passif" : "technique"
      };
    });
  }
  // « Vide » veut dire : rien de RÉDIGÉ. Les coûts ne comptent pas — on efface
  // sans confirmation une carte qu'on vient d'ouvrir par erreur, jamais un texte
  // que quelqu'un a écrit.
  function effetVide(e) {
    if (!e) return true;
    return !String(e.nom || "").trim() && !String(e.desc || "").trim() &&
           !String(e.macro || "").trim();
  }
  function artVide(a) {
    if (!a) return true;
    if (String(a.nom || "").trim()) return false;
    if (!effetVide(a.base)) return false;
    var l = a.ameliorations || [], i;
    for (i = 0; i < l.length; i++) if (!effetVide(l[i])) return false;
    return true;
  }

  // La « carte » : le résumé calculé de la fiche, pour la bibliothèque, le popup
  // de l'extension et les attributs miroir Roll20 (barres de jetons, macros).
  //
  // SA FORME EST LUE HORS DE CE FICHIER — par la bibliothèque, par le popup et
  // par les attributs de repli de mia-attr-map.js. Une clé qui change de nom ici
  // doit changer là-bas dans le même geste, sans quoi la barre d'un jeton
  // affiche l'ancienne valeur jusqu'à ce que quelqu'un s'en aperçoive.
  function computeCard() {
    var caracs = {};
    champs().forEach(function (c) { caracs[c] = caracTotal(c); });
    var comps = {};
    champsComp().forEach(function (c) { comps[c] = compPts(c); });
    return {
      name: state.name || "Sans nom",
      prestige: prestige(),
      caracs: caracs,
      comps: comps,
      combat: {
        pv: state.pv === null ? null : pvCourant(), pvMax: pvMax(),
        endurance: state.endurance === null ? null : enduranceCourante(),
        enduranceMax: enduranceMax(),
        initiative: initiative(), vitesse: vitesse(),
        poids: poidsPorte(), charge: chargeMax(), recup: recupJour()
      }
    };
  }
  // ---------- persistance ----------
  // Le bandeau du dernier enregistrement raté : absent tant que ça passe. Une
  // panne d'enregistrement ne se dit PAS en un éclair de 2.6 s vu une seule
  // fois, comme le faisait l'ancien flash : la fiche continuerait de s'afficher,
  // parfaitement normale, pendant qu'une session entière de travail se perd à
  // la fermeture. Tant que ça ne repasse pas, le bandeau reste.
  var elSavePanne = null;
  function save() {
    // La mise en forme se fait HORS du try du stockage, et son échec se dit
    // autrement. Un mod qui range une donnée circulaire dans ctx.state (la page
    // Mods invite justement à y écrire, et seul ctx.donnees.set s'en protège)
    // fait jeter stringify : setItem n'était alors jamais atteint, donc sous
    // Roll20 le cache mémoire du pont n'était même pas à jour, donc aucune
    // écriture programmée, donc ni accusé de réception, ni chien de garde, ni
    // bandeau de perte. Rien ne s'enregistrait plus et rien ne le disait.
    var json = null, panne = "";
    try { json = JSON.stringify(state); }
    catch (e) {
      panne = "La fiche ne peut plus se mettre en forme pour l'enregistrement (" + messageErreur(e) +
              "). Un mod a sans doute rangé une donnée qui se contient elle-même : plus rien n'est enregistré.";
    }
    if (json !== null) {
      try { STORE.setItem("mia-perso", json); }
      catch (e) { panne = "Impossible d'enregistrer (stockage plein ou bloqué) : exporter la fiche en JSON."; }
    }
    montrePanneSave(panne);
    var cards;
    try { cards = JSON.parse(STORE.getItem("mia-cards")) || {}; } catch (e) { cards = {}; }
    var card = computeCard();
    card.id = "_current";
    cards._current = card;
    try { STORE.setItem("mia-cards", JSON.stringify(cards)); } catch (e) {}
  }
  // Le bandeau de perte : même mise en forme que celui des mods, au même
  // endroit, juste avant la feuille. Il n'y en a qu'UN, gardé d'un montage à
  // l'autre : mount() vide la racine, l'élément se retrouve détaché, et le
  // premier enregistrement du nouveau montage le remet en tête. Il s'en va tout
  // seul dès qu'un enregistrement repasse, sans que personne ait à y penser.
  //
  // SA PROPRE CLASSE, en plus de la commune. Le contrat réserve .pc-avis au
  // bandeau de consentement ; les deux peuvent coexister (un mod en attente ET
  // un enregistrement en panne), et sans marque distincte plus personne, code
  // ou sonde, ne sait lequel des deux il tient.
  function montrePanneSave(msg) {
    if (!msg) {
      if (elSavePanne && elSavePanne.parentNode) elSavePanne.parentNode.removeChild(elSavePanne);
      return;
    }
    if (!appEl) return;   // pas encore monté : le prochain enregistrement le posera
    if (!elSavePanne) {
      elSavePanne = el("div", "pc-avis pc-avis-save");
      elSavePanne.appendChild(el("div", "pc-avis-txt", ""));
    }
    var txt = elSavePanne.firstChild;
    if (txt.textContent !== msg) txt.textContent = msg;
    // save() part à chaque frappe : ne toucher au DOM que si le bandeau n'est
    // pas déjà à sa place, sinon chaque lettre tapée le déplacerait.
    if (elSavePanne.parentNode === appEl) return;
    // la feuille est cherchée parmi les enfants DIRECTS : insertBefore veut un
    // repère qui soit bien un enfant de appEl, et un querySelector qui
    // descendrait dans l'arbre jetterait au lieu de poser le bandeau
    var avant = null, k;
    for (k = 0; k < appEl.children.length; k++)
      if (appEl.children[k].className === "pc-sheet") { avant = appEl.children[k]; break; }
    appEl.insertBefore(elSavePanne, avant);
  }
  function load() {
    try { return normalize(JSON.parse(STORE.getItem("mia-perso"))); }
    catch (e) { return null; }
  }
  function curTab() { try { return STORE.getItem("mia-tab") || "fiche"; } catch (e) { return "fiche"; } }
  function setTab(id) { try { STORE.setItem("mia-tab", id); } catch (e) {} }

  // bibliothèque (site seulement : dans Roll20, une fiche par personnage)
  var PKEY = "mia-persos";
  function loadPersos() { try { var a = JSON.parse(STORE.getItem(PKEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  // mia-cards ne porte QUE la fiche ouverte (« _current »), la seule que le
  // popup de l'extension et les attributs miroir lisent : y recalculer une carte
  // par personnage de la bibliothèque ne servait personne.
  function savePersos(a) {
    try { STORE.setItem(PKEY, JSON.stringify(a)); } catch (e) {}
  }

  // ---------- envoi au tchat : destinataire et modificateur ----------
  // Tout ce que la fiche envoie à Roll20 traverse ce bloc. La commande est
  // composée ICI, côté site, et part par window.__miaChat, que l'extension
  // relaie SANS RIEN RÉÉCRIRE : le format peut donc évoluer sans re-signature.
  // Les deux réglages (à qui, avec ou sans modificateur) vivent dans le VRAI
  // localStorage du navigateur, comme la préférence jour/nuit : ce ne sont pas
  // des données de personnage, et les écrire dans les Attributes Roll20 à
  // chaque clic n'aurait aucun sens.
  var ENVOI = {
    mode: "mia-r20-envoi",        // "public" | "gm" | "joueur"
    dest: "mia-r20-envoi-dest",   // nom d'affichage du destinataire
    input: "mia-r20-envoi-input", // "0" (sans) | "1" (avec)
    carac: "mia-r20-envoi-carac", // "0" (automatique) | "1" (carac au choix au lancer)
    comp: "mia-r20-envoi-comp",   // idem pour la compétence, spécialités seules
    noms: "mia-r20-envoi-noms"    // liste de secours, si Roll20 ne la donne pas
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
  function envCompChoix() { return lpref(ENVOI.comp, "0") === "1"; }
  // Même assainissement que l'extension (content-roll20.js) : sur le canal brut
  // elle n'en fait aucun, une accolade ou un retour à la ligne d'un texte de
  // fiche casserait la carte.
  function envSan(s) {
    return String(s == null ? "" : s).replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  }
  // Valeur de champ : les accolades d'une macro Roll20 (@{Perso|mia_body},
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
  // Option de jet Roll20 : le résultat s'inscrit dans le compteur de tours, à
  // la ligne du token sélectionné (créée si elle manque). Réservée à
  // l'initiative, seul jet dont dépend une place au tour.
  // Elle se pose DANS le jet en ligne, entre les doubles crochets, et non à la
  // fin du message : hors d'un « /roll », c'est-à-dire dès qu'on passe par un
  // gabarit, Roll20 ne la lit qu'attachée au jet lui-même
  // (wiki Macros/Initiative : {{Initiative=[[1d20+…&{tracker}]]}}). Posée après
  // « }} », elle s'afficherait en toutes lettres au tchat sans rien compter.
  var ENV_TRACKER = " &{tracker}";
  // LE JET DE TEST. L'expression entière est bâtie en amont (jetExpr, ou la
  // requête de choix de caractéristique) : elle porte déjà le dé, le bonus, la
  // limite et le kl1. Ce composeur ne fait que l'habiller du gabarit et, pour
  // l'initiative seule, du compteur de tours.
  function cmdJetExpr(label, expr, tracker) {
    // Le libellé passe par envSan comme les titres de cartes, et l'expression
    // voit ses blancs repliés : un saut de ligne (nom venu d'un import) ferait
    // une SECONDE ligne au tchat. L'extension refuse une commande multiligne,
    // et le clic partirait alors sans rien envoyer.
    var e = String(expr == null ? "" : expr).replace(/\s+/g, " ").trim();
    return "&{template:default} {{name=" + (envSan(label) || "Jet") +
           "}} {{Jet=[[" + e + (tracker ? ENV_TRACKER : "") + "]]}}";
  }
  // LE JET BRUT : dégâts d'une arme, protection d'une armure. Pas de limite,
  // pas de modificateur — un dé et, au plus, une constante.
  function cmdJet(label, value, die) {
    // « + 0 » est du bruit sur les jets d'équipement, qui n'ont jamais de
    // bonus : l'expression part seule.
    var v = value ? (value > 0 ? " + " + value : " - " + (-value)) : "";
    // Les accolades du dé restent : « ?{Dé|1d100} » et « @{…} » sont des dés
    // légitimes dans Roll20.
    var de = String(die == null ? "" : die).replace(/\s+/g, " ").trim() || DE_DEFAUT;
    return "&{template:default} {{name=" + (envSan(label) || "Jet") +
           "}} {{Jet=[[" + de + v + "]]}}";
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
    if (typeof window === "undefined" || typeof window.__miaChat !== "function") return false;
    window.__miaChat(envPrefixe() + cmd);
    return true;
  }

  // ---------- jets ----------
  // Les dés se jettent dans Roll20 : mia-roll20-boot.js (amorce Roll20 servie
  // par le site) pose window.__miaRoll et le jet part au TCHAT. Sur le site
  // (pas de Roll20), un clic lance quand même le dé et montre le résultat dans
  // un toast discret — aucun panneau de jets.
  // CE QUE LA FICHE LANCE POUR UN JET DE TEST : le dé du réglage, ou celui des
  // règles. Une seule fonction le dit, pour que l'expression envoyée au tchat,
  // le tirage local et les infobulles ne puissent pas se contredire.
  function deTest() { return (state && state.de) || DE_TEST_DEFAUT; }
  // LE MÊME, DÉBARRASSÉ DE SES MARQUEURS. « cs> » et « cf< » ne parlent qu'à
  // Roll20 : ni parseDice ni une infobulle n'en font quoi que ce soit, et
  // « 1d100cs>96cf<5 » écrit dans une phrase se lit très mal.
  function deNu(expr) {
    return String(expr == null ? "" : expr).replace(/c[sf][<>]=?\d+/gi, "").trim();
  }
  // LES DEUX SEUILS PORTÉS PAR UNE EXPRESSION, s'ils y sont. C'est le joueur qui
  // écrit son dé : on lit ses seuils à lui, jamais ceux des règles.
  function seuilsCrit(expr) {
    var s = String(expr == null ? "" : expr);
    var r = /cs>=?(\d+)/i.exec(s), e = /cf<=?(\d+)/i.exec(s);
    return { reussite: r ? +r[1] : null, echec: e ? +e[1] : null };
  }
  function parseDice(expr) {
    var m = /^(\d{1,2})d(\d{1,4})([+-]\d{1,4})?$/i.exec(String(expr || "").replace(/\s/g, ""));
    if (!m) return null;   // expression illisible : doRoll prévient au lieu de lancer autre chose
    return { n: clamp(+m[1], 1, 20), faces: clamp(+m[2], 2, 1000), plus: +(m[3] || 0) };
  }

  // ---------- CE QUI SE DEMANDE AVANT DE LANCER, ET QUI SE DEMANDE ICI ----------
  // UNE SEULE BOÎTE, DANS LA FICHE, ET PLUS AUCUNE REQUÊTE ROLL20. C'est une
  // question de cohérence avant tout : dès qu'UNE des trois questions doit se
  // poser dans la fiche, les poser ailleurs en même temps ferait répondre à
  // deux endroits pour un seul jet.
  //
  // ET LA COMPÉTENCE DOIT S'Y POSER — le moteur de dés de Roll20 ne sait pas
  // écrire ce qu'il faudrait, et c'est mesuré dans une vraie partie, pas
  // déduit :
  //   — un groupe DANS un groupe est refusé (« Cannot mix sum and M rolls in a
  //     roll group »), et un groupe comme terme d'une somme aussi. Or la règle
  //     de l'écart en demande deux : un « plus bas des deux » pour ramener le
  //     total, un second pour le plafond du jet ;
  //   — une requête DANS une requête, écrite en entités, n'est pas relue :
  //     « There was an error with your formula » ;
  //   — un même dé ne peut pas apparaître à deux endroits d'un groupe.
  // Il ne restait donc, côté Roll20, qu'à énumérer les COUPLES dans une requête
  // unique : huit caractéristiques par neuf compétences, soixante-douze
  // réponses à dérouler. Exact, et inutilisable.
  //
  // Ce qu'on y gagne, au passage : la fiche CONNAÎT la réponse. Elle peut donc
  // envoyer une expression entièrement calculée — pas de requête, pas
  // d'échappement, pas d'entités, et une macro de soixante-seize signes au lieu
  // de quatre mille.
  function demandeJet(label, carac, comp, spe, suite) {
    var surCarac = envCaracChoix();
    var surComp = envCompChoix() && !!spe;
    var surModif = envInput();
    if (!surCarac && !surComp && !surModif) { suite(carac, comp, 0); return; }

    var corps = el("div", "pc-modal-body");
    var prisC = carac, prisK = comp, modif = null;

    // Une rangée de sigles : on choisit d'un clic, et celui de la ligne est
    // allumé. Une liste déroulante demanderait deux clics pour la même chose.
    function rangee(titre, codes, courant, nomDe, poser) {
      corps.appendChild(el("div", "pc-comp-champ", titre));
      var g = el("div", "pc-choix-jet");
      var btns = [];
      codes.forEach(function (k) {
        // LE « SANS » PREND TOUT LE RANG, et il porte son nom en entier. Neuvième
        // d'une grille qui en range quatre par rangée, un tiret seul laissait un
        // vide à sa droite et se lisait comme un oubli. Il tient maintenant la
        // largeur, ce qui donne la place d'écrire ce dont il s'agit.
        var vide = (k === "");
        var b = el("button", "pc-modal-choix" + (k === courant ? " on" : "") +
                  (vide ? " large" : ""), vide ? "Aucune compétence" : k);
        b.type = "button";
        b.title = k ? nomDe(k) : "La spécialité part sans les points d'une compétence";
        b.addEventListener("click", function () {
          poser(k);
          btns.forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
        });
        btns.push(b);
        g.appendChild(b);
      });
      corps.appendChild(g);
    }

    if (surCarac) {
      var cs = [carac].concat(champs().filter(function (c) { return c !== carac; }));
      rangee("Caractéristique", cs, carac,
             function (c) { return caracInfo(c).nom; },
             function (c) { prisC = c; });
    }
    if (surComp) {
      // « — » est une réponse LÉGITIME : une spécialité peut ne relever d'aucune
      // compétence, et on peut vouloir la lancer sans.
      var propre = spe.comp || "";
      var ks = [propre].concat(champsComp().filter(function (k) { return k !== propre; }));
      if (propre !== "") ks.push("");
      rangee("Compétence", ks, propre,
             function (k) { return compInfo(k).nom; },
             function (k) { prisK = k; });
    }
    var champModif = null;
    if (surModif) {
      // LE MODIFICATEUR S'AJOUTE APRÈS LE PLAFOND, hors du groupe : c'est la
      // règle de l'endurance — ce qu'on dépense « est un bonus qu'on ajoute à
      // la fin », et la limite borne ce que le personnage vaut par lui-même.
      champModif = el("input", "pc-num");
      champModif.type = "number";
      champModif.step = "1";
      champModif.value = "0";
      corps.appendChild(fld("Modificateur", champModif));
    }
    dialogue("Lancer « " + (label || "jet") + " »", corps, function () {
      modif = champModif ? Math.round(parseFloat(champModif.value) || 0) : 0;
      suite(prisC, prisK, modif);
    }, "Lancer");
  }

  // LE JET DE TEST : caractéristique, compétence ou spécialité. C'est le seul
  // chemin par lequel un jet plafonné part au tchat.
  function doJet(label, carac, comp, spe, tracker) {
    // ON DEMANDE, PUIS ON LANCE. Et l'on ne se rappelle PAS doJet : les réglages
    // seraient toujours armés, les questions se reposeraient, et la boîte se
    // rouvrirait sans fin. Le reste du jet vit donc dans lance().
    demandeJet(label, carac, comp, spe, lance);
    return;

    function lance(carac, comp, modif) {
      var expr = jetExpr(jetBonus(carac, comp, spe), limiteJet(carac, comp, spe), modif);
      if (envoyer(cmdJetExpr(label, expr, tracker))) return;
      // Hors Roll20, ou sous une extension antérieure au canal brut : la fiche
      // lance elle-même et applique le plafond, en le DISANT — un résultat rogné
      // sans explication passerait pour une faute de calcul.
      // LE MÊME DÉ QUE DANS ROLL20, et ses seuils. Le tirage local jetait un d100
      // écrit en dur : une fiche réglée sur un autre dé donnait ici un résultat
      // qui ne pouvait pas arriver là-bas.
      var d = parseDice(deNu(deTest())) || { n: 1, faces: 100, plus: 0 };
      var de = d.plus, i;
      for (i = 0; i < d.n; i++) de += 1 + Math.floor(Math.random() * d.faces);
      var bonus = jetBonus(carac, comp, spe), lim = limiteJet(carac, comp, spe);
      var brut = de + bonus, total = Math.min(brut, lim) + (modif || 0);
      var det = "dé " + de + (bonus ? " " + (bonus >= 0 ? "+ " : "− ") + Math.abs(bonus) : "");
      if (Math.min(brut, lim) < brut) det += " = " + brut + ", plafonné à " + lim;
      if (modif) det += " · modificateur " + sign(modif);
      // le critique se lit sur LE DÉ, jamais sur le total : c'est le dé qui est
      // critique, et le plafond n'y change rien
      var seuils = seuilsCrit(deTest());
      if (seuils.reussite !== null && de >= seuils.reussite) det += " · réussite critique";
      else if (seuils.echec !== null && de <= seuils.echec) det += " · échec critique";
      flash(label + " : " + total + " (" + det + ")");
    }
  }

  // LE JET BRUT : dégâts d'une arme, protection d'une armure. Ni MOD, ni
  // plafond, ni requête — c'est un dé, et rien d'autre.
  function doRoll(label, value, die) {
    die = die || DE_DEFAUT;
    if (envoyer(cmdJet(label, value, die))) return;
    if (typeof window !== "undefined" && typeof window.__miaRoll === "function") {
      window.__miaRoll(die, value, label);
      return;
    }
    var d = parseDice(die);
    // Hors Roll20 la fiche lance le dé elle-même : elle sait faire « NdM ±k »,
    // pas résoudre une macro Roll20 (@{…}, ?{…}), qui n'a de sens que là-bas.
    if (!d) {
      flash(/[@?]\{/.test(String(die))
        ? "« " + die + " » est une macro Roll20 : elle ne se lance que dans Roll20."
        : "Dé illisible : « " + die + " » (attendu : NdM, ex. 1d100).");
      return;
    }
    var dice = [];
    for (var i = 0; i < d.n; i++) dice.push(1 + Math.floor(Math.random() * d.faces));
    var sum = dice.reduce(function (a, b) { return a + b; }, 0) + d.plus;
    var total = sum + value;
    var det = "dé " + dice.join(" + ") + (value ? " " + (value >= 0 ? "+ " : "− ") + Math.abs(value) : "");
    flash(label + " : " + total + " (" + det + ")");
  }

  // ---------- envoi d'un élément au tchat ----------
  // Dans Roll20, l'élément part au TCHAT en carte (mia-roll20-boot.js pose __miaSay) ;
  // sur le site, il s'affiche en toast. fields : [[libellé, valeur], …],
  // les valeurs vides sont ignorées.
  // Une étiquette VIDE ("") est volontaire : la carte Roll20 rend alors
  // « {{=texte}} », une ligne pleine largeur sans colonne de libellé. Réservée
  // aux TEXTES LONGS, dont le libellé n'apprend rien que le titre ne dise déjà ;
  // les champs courts et tabulaires (poids, dégâts, quantité…) gardent le leur.
  // Une seule étiquette vide par carte : le template les indexe par clé.
  function sayChat(title, fields) {
    var clean = (fields || []).filter(function (f) { return f && String(f[1] || "").trim(); });
    if (envoyer(cmdCarte(title, clean))) return;
    // extension antérieure au canal brut : carte publique
    if (typeof window !== "undefined" && typeof window.__miaSay === "function") {
      window.__miaSay(title, clean);
      return;
    }
    flash(title + (clean.length
      ? " — " + clean.map(function (f) { return f[0] ? f[0] + " : " + f[1] : f[1]; }).join(" · ")
      : ""));
  }
  function chatBtn(getTitle, getFields) {
    return miniBtn("Chat", "Envoyer dans le tchat Roll20", function () {
      sayChat(getTitle(), getFields());
    });
  }
  // ---------- refresh ----------
  // Registres de rafraîchissement : les fonctions rappelées à chaque
  // changement d'état. Il y en a UN PAR MODULE, plus un pour ce qui n'est pas
  // un module (barre d'outils, en-tête, barre d'envoi). Tous sont remis à zéro
  // à chaque mount() (navigation instantanée comprise) pour ne pas s'accumuler.
  //
  // « hooks » désigne le registre COURANT : monteModules le fait pointer sur
  // celui du module en construction, puis le rend. Les briques (textInput,
  // stepper, bigTile, gearBtn…) continuent donc d'écrire dans « hooks » sans
  // rien savoir des modules, et chaque fonction atterrit chez son propriétaire.
  // C'est ce qui permet de museler un module sans toucher aux autres.
  var regHors = [];             // hors module : ce qui encadre les onglets
  var regsModules = {};         // id -> tableau de fonctions (ordre de montage)
  var hooks = regHors;
  var compHooks = [];           // lignes de compétences, vidées par rebuildComps()
  // LE BLOC REBÂTISSABLE EST CELUI DES SPÉCIALITÉS, et non plus celui des
  // compétences : depuis que les deux sont séparés, c'est la liste OUVERTE qui
  // se rebâtit. Les compétences sont huit, connues d'avance, et repassent par
  // « hooks » comme n'importe quel module.
  var optSpesHooks = [];        // bloc Options « Spécialités », rebâtissable
  var optSpesRebuild = null;    // posé par le module « optspes » ; rappelé quand la liste change

  function regModule(id) {
    if (!regsModules[id]) regsModules[id] = [];
    return regsModules[id];
  }
  // Musellement : un module dont le registre jette EN CHAÎNE finit par se
  // taire. Cinq échecs consécutifs, parce qu'un hook peut échouer une fois sur
  // un état transitoire (une frappe en cours) sans être cassé pour autant ;
  // cinq fois d'affilée, c'est le module qui est en faute. Une seule
  // réussite remet le compteur à zéro.
  var MUSELIERE = 5;
  var etatsModules = {};        // id -> { echecs, musele, erreur, panne }
  function etatModule(id) {
    if (!etatsModules[id])
      etatsModules[id] = { echecs: 0, musele: false, erreur: "", panne: "", vide: false };
    return etatsModules[id];
  }
  function messageErreur(e) {
    return String((e && (e.message || e.toString())) || "erreur inconnue");
  }
  // Un registre tourne SOUS SON PROPRE try/catch, fonction par fonction : un
  // hook qui jette n'interrompt plus le rafraîchissement des autres, et ne
  // fige donc plus la fiche entière.
  //
  // Le résultat n'est pas jugé ici mais RETENU dans le bilan de la passe, et
  // le compteur ne bouge qu'une fois la passe finie. C'est nécessaire parce
  // qu'un même id peut avoir DEUX registres (« comps » et « optcomps » ont
  // aussi celui de leurs lignes rebâties) : en jugeant registre par registre,
  // la réussite du premier remettait le compteur à zéro juste avant l'échec du
  // second, et la muselière de ces deux modules-là n'aurait jamais pu tomber.
  function joue(id, reg, bilan) {
    if (etatModule(id).musele) return;
    if (bilan[id] === undefined) bilan[id] = null;   // registre vu, sans échec
    for (var i = 0; i < reg.length; i++) {
      try { reg[i](); } catch (err) { if (!bilan[id]) bilan[id] = err; }
    }
  }
  function refresh() {
    save();
    var bilan = {};
    joue("", regHors, bilan);
    // les clés d'un objet se parcourent dans leur ordre de création : c'est
    // l'ordre de montage des modules, donc l'ordre où les hooks se poussaient
    // avant qu'ils ne soient séparés — l'affichage ne bouge pas
    Object.keys(regsModules).forEach(function (id) { joue(id, regsModules[id], bilan); });
    // deux registres rebâtissables : ils appartiennent à leur module (même id,
    // donc même muselière) mais vivent à part, leurs lignes étant détruites et
    // recréées sans que le module le soit
    joue("comps", compHooks, bilan);
    joue("optspes", optSpesHooks, bilan);
    Object.keys(bilan).forEach(function (id) {
      var e = etatModule(id);
      if (e.musele) return;
      if (!bilan[id]) { e.echecs = 0; return; }
      e.echecs++;
      e.erreur = messageErreur(bilan[id]);
      // « » n'est pas un module mais ce qui encadre les onglets (barre
      // d'outils, en-tête, barre d'envoi) : le museler éteindrait la fiche
      // elle-même, sans bloc à marquer ni interrupteur pour le rallumer. Ses
      // hooks restent sous try/catch, c'est là qu'est la protection.
      if (id && e.echecs >= MUSELIERE) {
        e.musele = true;
        museleAffiche(id, e);
      }
    });
  }
  // Remplacement d'état COMPLET (import, bibliothèque, nouveau personnage) :
  // toutes les sections tiennent des références sur l'ancien état, on remonte
  // donc la fiche entière depuis le nouvel état.
  var rootEl = null;
  var appEl = null;      // le .perso-atelier monté : porte les jetons de couleur
  // C'est aussi ce que rend ctx.reconstruire et Mia.remonte. Appelé PENDANT un
  // montage (un mod, un hook), il ne relance rien sur-le-champ : mount() note
  // la demande et l'honore une fois le montage courant fini.
  function remount() { if (rootEl) mount(rootEl); }

  function flash(msg) {
    var f = document.querySelector(".pc-flash") || el("div", "pc-flash");
    f.textContent = msg;
    document.body.appendChild(f);
    f.classList.add("on");
    setTimeout(function () { f.classList.remove("on"); }, 2600);
  }

  // ---------- briques ----------
  function fld(labelTxt, input, span) {
    var w = el("div", "pc-f" + (span ? " " + span : ""));
    w.appendChild(el("label", null, labelTxt));
    w.appendChild(input);
    return w;
  }
  // reg : registre de rafraîchissement (le courant par défaut ; un module qui
  // fabrique un champ APRÈS son montage passe le sien, sinon sa fonction
  // atterrirait chez le voisin et échapperait à sa muselière).
  function textInput(get, set, placeholder, reg) {
    var i = el("input");
    i.type = "text";
    if (placeholder) i.placeholder = placeholder;
    i.value = get() || "";
    i.addEventListener("input", function () { set(i.value); refresh(); });
    (reg || hooks).push(function () { if (document.activeElement !== i) i.value = get() || ""; });
    return i;
  }
  function miniBtn(txt, title, fn, cls) {
    var b = el("button", "pc-mini" + (cls ? " " + cls : ""), txt);
    b.type = "button";
    if (title) b.title = title;
    b.addEventListener("click", fn);
    return b;
  }
  function stepBtn(txt, title, fn) {
    var b = el("button", null, txt);
    b.type = "button";
    if (title) b.title = title;
    b.addEventListener("click", fn);
    return b;
  }
  // stepper −/champ/+ : le champ du milieu est éditable (pc-num).
  // reg : registre de rafraîchissement (hooks par défaut ; optHooks pour le
  // bloc rebâtissable des modificateurs de compétences).
  function stepper(get, set, step, title, reg) {
    var w = el("span", "pc-step");
    w.appendChild(stepBtn("−", title ? "− " + step : null, function () { set(get() - step); refresh(); }));
    var i = el("input", "pc-num");
    i.type = "number";
    i.value = get();
    i.addEventListener("input", function () {
      var v = parseInt(i.value, 10);
      if (isFinite(v)) { set(v); refresh(); }
    });
    (reg || hooks).push(function () { if (document.activeElement !== i) i.value = get(); });
    w.appendChild(i);
    w.appendChild(stepBtn("+", title ? "+ " + step : null, function () { set(get() + step); refresh(); }));
    return w;
  }
  // ---------- les cases d'un bloc de nombres ----------
  // TROIS FORMES, UNE SEULE BOÎTE. Les trois listes de la fiche s'en servent :
  // sans cela leurs lignes n'auraient pas la même hauteur, et la ligne changerait
  // d'épaisseur en ouvrant le rouage.
  //
  // caseTexte   un nombre, rien d'autre
  // caseDouble  deux nombres, un par mode — la feuille n'en montre qu'un
  // caseSaisie  un TEXTE en jouant, un CHAMP sous le rouage. Les deux, et pas
  //             seulement le champ : un champ de type nombre ne sait pas écrire
  //             « +25 » et porte des compteurs que Roll20 n'a nulle part.
  function caseVide(hote, cls) {
    var c = el("span", "c" + (cls ? " " + cls : ""));
    hote.appendChild(c);
    return c;
  }
  function caseTexte(hote, cls) {
    var c = caseVide(hote, cls);
    var v = el("span", "v", "");
    c.appendChild(v);
    return v;
  }
  function caseDouble(hote, cls) {
    var c = caseVide(hote, cls);
    var a = el("span", "v pc-jeu-only", "");
    var b = el("span", "v pc-edit-only", "");
    c.appendChild(a); c.appendChild(b);
    return [a, b];
  }
  // Le champ ne se réécrit JAMAIS sous les doigts : tant qu'il a le focus, ce
  // qu'on tape y reste tel quel.
  function caseSaisie(hote, lire, ecrire, aide, reg) {
    var c = caseVide(hote, "reglable");
    var t = el("span", "v pc-jeu-only", "");
    var i = el("input", "v pc-edit-only pc-case-champ pc-edit-field");
    i.type = "number"; i.step = "1";
    i.title = aide;
    i.addEventListener("input", function () {
      var v = parseInt(i.value, 10);
      if (isFinite(v)) { ecrire(v); refresh(); }
    });
    (reg || hooks).push(function () {
      if (document.activeElement !== i) i.value = lire();
    });
    c.appendChild(t);
    c.appendChild(i);
    return { txt: t, champ: i };
  }

  // trois petits champs ± (équipement / art / décision du MJ), sommés dans la
  // valeur effective ; discrets, révélés au survol de l'hôte (.pc-mods-host).
  var MMOD_SLOTS = ["équipement", "art", "autre"];
  function multiMod(map, key) {
    var wrap = el("span", "pc-mmods");
    function arr() {
      if (!map[key]) map[key] = [0, 0, 0];
      return map[key];
    }
    for (var i = 0; i < MMOD_SLOTS.length; i++) (function (i) {
      var inp = el("input", "pc-mmod");
      inp.type = "number"; inp.step = "any"; inp.placeholder = "0";
      inp.title = "Bonus ou malus divers (" + MMOD_SLOTS[i] + ") — emplacement " +
                  (i + 1) + " sur " + MMOD_SLOTS.length + " ; les modificateurs s'additionnent.";
      var v0 = map[key] ? map[key][i] : 0;
      inp.value = v0 ? v0 : "";
      inp.classList.toggle("neg", v0 < 0);
      inp.addEventListener("input", function () {
        var n = parseFloat(String(inp.value).replace(",", "."));
        arr()[i] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -999, 999) : 0;
        inp.classList.toggle("neg", arr()[i] < 0);
        refresh();
      });
      hooks.push(function () {
        if (document.activeElement !== inp) {
          var v = map[key] ? map[key][i] : 0;
          inp.value = v ? v : "";
          inp.classList.toggle("neg", v < 0);
        }
      });
      wrap.appendChild(inp);
    })(i);
    return wrap;
  }
  // ---------- mode édition par module ----------
  // Chaque module éditable porte un rouage dans son titre : il déverrouille la
  // CONSTRUCTION du personnage (stades, ajouts, suppressions, textes, divers…).
  // Hors édition, seuls les gestes de JEU restent actifs : jets, tchat, PV
  // courant, endurance, quantités d'objets, notes de session. Les éléments
  // .pc-edit-only n'existent qu'en édition ; les champs .pc-edit-field
  // deviennent inertes (disabled + air d'un simple texte). Réglage d'interface
  // pur : ni dans l'état du personnage, ni persisté — chaque chargement
  // repart verrouillé.
  var editMods = {};
  function isEdit(id) { return !!editMods[id]; }
  function applyEdit(scope, id) {
    scope.classList.toggle("editing", isEdit(id));
    Array.prototype.forEach.call(scope.querySelectorAll(".pc-edit-field"), function (f) {
      f.disabled = !isEdit(id);
    });
  }
  function gearBtn(scope, id, onToggle) {
    var g = el("button", "pc-gear", "⚙");
    g.type = "button";
    g.title = "Modifier ce module";
    g.addEventListener("click", function () {
      editMods[id] = !editMods[id];
      g.title = isEdit(id) ? "Terminer les modifications" : "Modifier ce module";
      applyEdit(scope, id);
      if (onToggle) onToggle();
    });
    // resynchronise aussi les éléments recréés par les rebuilds internes
    hooks.push(function () { applyEdit(scope, id); });
    return g;
  }
  function block(title, small, editId, onToggle) {
    var b = el("div", "pc-block");
    var t = el("div", "pc-block-title", title);
    if (small) t.appendChild(el("small", null, small));
    if (editId) {
      b.classList.add("pc-editable");
      b.dataset.module = editId;
      t.appendChild(gearBtn(b, editId, onToggle));
    }
    b.appendChild(t);
    return b;
  }
  // reg : registre de rafraîchissement, comme textInput
  function bigTile(label, getV, onClick, reg) {
    var d = el("div", "pc-big" + (onClick ? " pc-rollable" : ""));
    d.appendChild(el("span", "k", label));
    var v = el("span", "v", "");
    d.appendChild(v);
    (reg || hooks).push(function () { v.textContent = String(getV()); });
    if (onClick) d.addEventListener("click", onClick);
    return d;
  }

  // ---------- barre d'outils + bibliothèque ----------
  function buildTop(container) {
    if (COMPACT) return;   // dans Roll20, la fiche EST le personnage
    var top = el("div", "pc-top");
    top.appendChild(el("span", "pc-top-title", "Fiche MIA"));
    top.appendChild(el("span", "pc-top-hint", "Créateur de personnage — règles de base MIA"));

    var lib = el("div", "pc-lib");
    var sel = el("select");
    function fillSel() {
      sel.innerHTML = "";
      var o0 = el("option", null, "— Bibliothèque —");
      o0.value = "";
      sel.appendChild(o0);
      loadPersos().forEach(function (p) {
        var o = el("option", null, p.name || "Sans nom");
        o.value = p.id;
        sel.appendChild(o);
      });
    }
    fillSel();
    lib.appendChild(sel);

    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Charger");
      b.type = "button";
      b.addEventListener("click", function () {
        var p = loadPersos().filter(function (q) { return q.id === sel.value; })[0];
        if (!p) { flash("Choisir un personnage dans la liste."); return; }
        try { state = normalize(JSON.parse(JSON.stringify(p.state))); }
        catch (e) { flash("Fiche illisible."); return; }
        remount();
        flash("« " + (p.name || "Sans nom") + " » chargé.");
      });
      return b;
    })());
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Enregistrer");
      b.type = "button";
      b.title = "Enregistrer le personnage courant dans la bibliothèque";
      b.addEventListener("click", function () {
        var persos = loadPersos();
        var name = state.name || "Sans nom";
        var existing = null;
        persos.forEach(function (p) { if (p.name === name) existing = p; });
        var copy = JSON.parse(JSON.stringify(state));
        if (existing) { existing.state = copy; }
        else persos.push({ id: "p" + Date.now().toString(36), name: name, state: copy });
        savePersos(persos);
        fillSel();
        flash("« " + name + " » enregistré.");
      });
      return b;
    })());
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Supprimer");
      b.type = "button";
      b.className = "pc-btn danger";
      b.title = "Supprimer le personnage choisi de la bibliothèque";
      b.addEventListener("click", function () {
        if (!sel.value) { flash("Choisir un personnage dans la liste."); return; }
        savePersos(loadPersos().filter(function (q) { return q.id !== sel.value; }));
        fillSel();
      });
      return b;
    })());
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Nouveau");
      b.type = "button";
      b.addEventListener("click", function () { state = blank(); remount(); });
      return b;
    })());
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Exporter");
      b.type = "button";
      b.addEventListener("click", function () {
        var a = document.createElement("a");
        a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        a.download = (state.name || "personnage-mia") + ".json";
        a.click();
      });
      return b;
    })());
    var file = el("input");
    file.type = "file"; file.accept = "application/json"; file.style.display = "none";
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          state = normalize(JSON.parse(r.result));
          remount();
          flash("Personnage importé.");
        } catch (e) { flash("JSON illisible."); }
        file.value = "";
      };
      r.readAsText(f);
    });
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Importer");
      b.type = "button";
      b.addEventListener("click", function () { file.click(); });
      return b;
    })());
    lib.appendChild(file);
    top.appendChild(lib);
    container.appendChild(top);
  }

  // ---------- en-tête : portrait + identité + compteurs + garde-fous ----------
  // En-tête réduit aux seules infos importantes (2026-08-02) : plus de
  // portrait ni de cartouche « MIA Système JDR » ; PV, endurance et vitesse
  // (doublons en lecture seule de l'onglet Fiche) n'y figurent plus.
  //   Nom | Espèce | Âge | Sexe | Genre
  //   Prestige | XP dépensé ———— | XP total
  // ---------- barre d'envoi (Roll20 seulement) ----------
  // À qui part la macro, et faut-il demander un modificateur. Geste de JEU :
  // aucun rouage, aucun mode édition. Posée en FRÈRE de .pc-head, jamais dans
  // .pc-id (dont les 12 colonnes sont pleines, et dont la hauteur commande la
  // taille du portrait).
  function buildEnvoi(sheet) {
    if (!COMPACT) return;   // hors Roll20 il n'y a pas de tchat : rien à régler
    var bar = el("div", "pc-envoi");
    bar.appendChild(el("span", "lbl", "Envoi"));

    var destSel = el("select", "pc-select");
    destSel.title = "Destinataire du chuchotement";
    var editNoms = null;

    function majDest() {
      var joueur = envMode() === "joueur";
      destSel.style.display = joueur ? "" : "none";
      if (editNoms) editNoms.style.display = joueur && !listeRoll20 ? "" : "none";
    }

    // segments : Publique | Au MJ | À un joueur
    var segs = el("div", "pc-envoi-segs");
    var boutons = [];
    [["public", "Publique", "Tout le monde voit la carte"],
     ["gm", "Au MJ", "Chuchoté au MJ (/w gm)"],
     ["joueur", "À un joueur", "Chuchoté au joueur choisi à droite"]].forEach(function (o) {
      var b = el("button", "seg" + (envMode() === o[0] ? " on" : ""), o[1]);
      b.type = "button";
      b.title = o[2];
      b.addEventListener("click", function () {
        lset(ENVOI.mode, o[0]);
        boutons.forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        majDest();
        if (o[0] === "joueur") demanderJoueurs();
      });
      boutons.push(b);
      segs.appendChild(b);
    });
    bar.appendChild(segs);

    // liste des destinataires : celle de Roll20 si l'extension sait la donner,
    // sinon celle que l'utilisateur saisit (et qui reste dans son navigateur)
    var listeRoll20 = null;
    function nomsManuels() {
      return lpref(ENVOI.noms, "").split("\n").map(function (s) { return s.trim(); })
        .filter(function (s) { return s; });
    }
    function remplirDest(noms) {
      var actuel = envDest();
      destSel.innerHTML = "";
      if (!noms.length) {
        var vide = el("option", null, listeRoll20 ? "Aucun autre joueur connecté" : "Aucun joueur enregistré");
        vide.value = "";
        destSel.appendChild(vide);
      }
      noms.forEach(function (n) {
        var o = el("option", null, n);
        o.value = n;
        if (n === actuel) o.selected = true;
        destSel.appendChild(o);
      });
      // un destinataire choisi avant que la liste change reste sélectionnable
      if (actuel && noms.indexOf(actuel) < 0) {
        var o2 = el("option", null, actuel + " (absent)");
        o2.value = actuel; o2.selected = true;
        destSel.appendChild(o2);
      }
      // Ce qui est AFFICHÉ est ce qui sera utilisé. Sans cette ligne, un
      // sélecteur qui ne porte qu'un nom n'émet jamais « change » (le
      // navigateur le choisit tout seul) : le destinataire restait vide et la
      // macro repartait en public alors que son nom s'affichait.
      lset(ENVOI.dest, destSel.value);
    }
    destSel.addEventListener("change", function () { lset(ENVOI.dest, destSel.value); });
    // Roll20 ne livre sa liste que par l'extension (la fiche est une iframe
    // d'une autre origine) : si elle ne répond pas, la saisie manuelle prend
    // le relais et rien n'est perdu.
    function demanderJoueurs() {
      if (typeof window.__miaPlayers !== "function") { remplirDest(nomsManuels()); return; }
      window.__miaPlayers(function (noms) {
        if (noms && noms.length) {
          listeRoll20 = noms;
          remplirDest(noms);
        } else remplirDest(nomsManuels());
        majDest();
      });
    }
    bar.appendChild(destSel);

    editNoms = miniBtn("Joueurs…", "Saisir les noms des joueurs de la table", function () {
      var corps = el("div", "pc-modal-body");
      corps.appendChild(el("div", "pc-modal-note",
        "Un nom par ligne, tel qu'il s'affiche dans Roll20. Cette liste reste dans ce navigateur."));
      var ta = el("textarea", "pc-notes");
      ta.rows = 6;
      ta.value = lpref(ENVOI.noms, "");
      corps.appendChild(ta);
      dialogue("Joueurs de la table", corps, function () {
        lset(ENVOI.noms, ta.value);
        remplirDest(nomsManuels());
      }, "Enregistrer");
    });
    bar.appendChild(editNoms);

    // sans input / avec input : le modificateur ne vaut que sur un jet de TEST
    // (caractéristique, compétence, spécialité), pas sur un jet brut. La fiche
    // le demande dans la même boîte que le reste, et l'envoie en NOMBRE : ce
    // fut une requête Roll20, elle ne l'est plus — voir demandeJet.
    var sep = el("span", "lbl", "Modificateur");
    sep.title = "S'ajoute APRÈS la limite — c'est par là que passe l'endurance dépensée";
    bar.appendChild(sep);
    var segs2 = el("div", "pc-envoi-segs");
    var bin = [];
    [["0", "Sans input", "Le jet part tel quel"],
     ["1", "Avec input", "La fiche demande un modificateur avant de lancer"]].forEach(function (o) {
      var b = el("button", "seg" + ((envInput() ? "1" : "0") === o[0] ? " on" : ""), o[1]);
      b.type = "button";
      b.title = o[2];
      b.addEventListener("click", function () {
        lset(ENVOI.input, o[0]);
        bin.forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      });
      bin.push(b);
      segs2.appendChild(b);
    });
    bar.appendChild(segs2);

    // automatique / au choix : sur un jet de COMPÉTENCE ou de SPÉCIALITÉ, « au
    // choix » fait demander par LA FICHE quelle caractéristique porte le jet
    // (les huit, la sienne en tête).
    //
    // DANS LA FICHE, ET NON PLUS DANS ROLL20, parce que la compétence, elle, ne
    // PEUT pas s'y demander (voir demandeJet) : poser une question ici et
    // l'autre là-bas ferait répondre à deux endroits pour un seul jet.
    var sep3 = el("span", "lbl", "Caractéristique");
    sep3.title = "Ne s'applique qu'aux jets de compétence";
    bar.appendChild(sep3);
    var segs3 = el("div", "pc-envoi-segs");
    var cbtn = [];
    [["0", "Automatique", "La compétence part avec sa caractéristique"],
     ["1", "Au choix", "La fiche demande quelle caractéristique employer avant de lancer"]].forEach(function (o) {
      var b = el("button", "seg" + ((envCaracChoix() ? "1" : "0") === o[0] ? " on" : ""), o[1]);
      b.type = "button";
      b.title = o[2];
      b.addEventListener("click", function () {
        lset(ENVOI.carac, o[0]);
        cbtn.forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      });
      cbtn.push(b);
      segs3.appendChild(b);
    });
    bar.appendChild(segs3);

    // LE MÊME, POUR LA COMPÉTENCE, et il ne vaut que pour les SPÉCIALITÉS : sur
    // un jet de compétence, la compétence EST le jet.
    //
    // ET C'EST ELLE QUI A TOUT FAIT DESCENDRE DANS LA FICHE : le moteur de dés
    // de Roll20 ne sait pas écrire deux plafonds imbriqués, et la seule forme
    // qu'il accepte énumère les soixante-douze couples dans une liste unique.
    // Une fois cette question-là posée dans la fiche, les deux autres l'y
    // rejoignent — on ne répond pas à deux endroits pour un seul jet.
    var sep4 = el("span", "lbl", "Compétence");
    sep4.title = "Ne s'applique qu'aux jets de spécialité";
    bar.appendChild(sep4);
    var segs4 = el("div", "pc-envoi-segs");
    var kbtn = [];
    [["0", "Automatique", "La spécialité part avec sa compétence"],
     ["1", "Au choix", "La fiche demande quelle compétence employer avant de lancer"]].forEach(function (o) {
      var b = el("button", "seg" + ((envCompChoix() ? "1" : "0") === o[0] ? " on" : ""), o[1]);
      b.type = "button";
      b.title = o[2];
      b.addEventListener("click", function () {
        lset(ENVOI.comp, o[0]);
        kbtn.forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      });
      kbtn.push(b);
      segs4.appendChild(b);
    });
    bar.appendChild(segs4);

    sheet.appendChild(bar);
    remplirDest(nomsManuels());
    majDest();
    demanderJoueurs();
  }

  function buildHead(sheet) {
    var head = el("div", "pc-head");
    var idBox = el("div", "pc-id");   // créé tôt : le portrait s'aligne sur sa hauteur

    // portrait compact 1:1, coins arrondis. L'URL s'édite EN PLACE au clic
    // (jamais prompt() : muet dans l'iframe Roll20 sous Chrome).
    var pbox = el("div", "pc-portrait-box");
    pbox.title = "Portrait — clic : changer l'image (URL)";
    var pclip = el("div", "clip");
    var pimg = el("img");
    pimg.alt = "";
    pclip.appendChild(pimg);
    var pph = el("span", "ph", "?");
    pclip.appendChild(pph);
    pbox.appendChild(pclip);
    hooks.push(function () {
      var want = state.portrait || "";
      if (pimg.getAttribute("src") !== want) {
        if (want) pimg.src = want;
        else pimg.removeAttribute("src");
      }
      pbox.classList.toggle("vide", !want);
    });
    var pedit = null;
    pbox.addEventListener("click", function () {
      if (pedit) return;
      pedit = el("input", "pc-portrait-edit");
      pedit.type = "text";
      pedit.placeholder = "URL de l'image…";
      pedit.value = state.portrait || "";
      pedit.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); pedit.blur(); }
        else if (e.key === "Escape") { pedit.value = state.portrait || ""; pedit.blur(); }
      });
      pedit.addEventListener("blur", function () {
        state.portrait = pedit.value.trim();
        if (pedit) { pedit.remove(); pedit = null; }
        refresh();
      });
      pbox.appendChild(pedit);
      setTimeout(function () { pedit.focus(); pedit.select(); }, 0);
    });
    head.appendChild(pbox);
    // carré 1:1 haut comme l'en-tête : largeur = hauteur MESURÉE (le transfert
    // aspect-ratio depuis un étirement flex n'est pas fiable sous Firefox).
    // Le carré fait la hauteur de l'en-tête PARTOUT (site, dialogue Roll20,
    // fenêtre séparée) : côté = hauteur du bloc d'identité, plafonné pour ne
    // pas dévorer la largeur quand l'en-tête se replie sur trois lignes.
    // Les deux dimensions sont posées en dur : aucun transfert aspect-ratio
    // (infiable depuis un étirement flex) et aucune règle de largeur en CSS.
    // Boucle bornée : régler le côté rétrécit le bloc d'identité, qui peut se
    // replier et changer de hauteur — on repasse au plus 3 fois, puis on garde.
    var PORTRAIT_MAX = 6;   // rem
    function carrePortrait(passe) {
      var un = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      var cible = Math.min(idBox.offsetHeight, Math.round(PORTRAIT_MAX * un));
      if (!cible) return;
      var actuel = parseFloat(pbox.style.width) || 0;
      if (Math.abs(actuel - cible) <= 1) return;
      pbox.style.width = cible + "px";
      pbox.style.height = cible + "px";
      if ((passe || 0) < 3) carrePortrait((passe || 0) + 1);
    }
    hooks.push(function () { carrePortrait(0); });
    setTimeout(function () { carrePortrait(0); }, 0);
    // suit les redimensionnements de la fenêtre (dialogue Roll20, popout)
    try { new ResizeObserver(function () { carrePortrait(0); }).observe(idBox); } catch (e) {}

    var id = idBox;
    id.appendChild(fld("Nom", textInput(function () { return state.name; }, function (v) { state.name = v; }, "Nom du personnage"), "c4"));
    id.appendChild(fld("Espèce", textInput(function () { return state.espece; }, function (v) { state.espece = v; }), "c2"));
    id.appendChild(fld("Âge", textInput(function () { return state.age; }, function (v) { state.age = v; }), "c2"));
    id.appendChild(fld("Sexe", textInput(function () { return state.sexe; }, function (v) { state.sexe = v; }), "c2"));
    id.appendChild(fld("Genre", textInput(function () { return state.genre; }, function (v) { state.genre = v; }), "c2"));

    // 2e ligne : compteurs de budgets + XP total
    var mrow = el("div", "pc-id-meters");
    function meter(label, getUsed, getTotal) {
      var m = el("span", "pc-meter");
      m.appendChild(el("span", null, label));
      var b = el("b", null, "");
      m.appendChild(b);
      var bar = el("span", "bar");
      var fill = el("i");
      bar.appendChild(fill);
      m.appendChild(bar);
      hooks.push(function () {
        var used = getUsed(), total = getTotal();
        b.textContent = used + " / " + total;
        var over = used > total;
        b.classList.toggle("over", over);
        fill.classList.toggle("over", over);
        fill.style.width = clamp(total ? (used / total) * 100 : 0, 0, 100) + "%";
      });
      return m;
    }
    mrow.appendChild(meter("XP dépensé", xpDepense, function () { return state.xpTotal; }));
    var xpIn = el("input", null);
    xpIn.type = "number"; xpIn.min = 0; xpIn.step = 5;
    xpIn.value = state.xpTotal;
    xpIn.addEventListener("input", function () {
      var v = parseInt(xpIn.value, 10);
      if (isFinite(v)) { state.xpTotal = Math.max(0, v); refresh(); }
    });
    hooks.push(function () { if (document.activeElement !== xpIn) xpIn.value = state.xpTotal; });
    mrow.appendChild(fld("XP total", xpIn));
    // LE PRESTIGE SE SAISIT ICI, COMME L'XP TOTAL, et nulle part ailleurs. Ce
    // sont les deux mêmes choses : ce que le meneur accorde, et que le
    // personnage dépense ensuite. Le mettre parmi les caractéristiques le
    // faisait passer pour l'une d'elles, alors qu'il les plafonne toutes.
    var prIn = el("input", null);
    prIn.type = "number"; prIn.min = 0; prIn.step = 1;
    prIn.addEventListener("input", function () {
      var v = parseInt(prIn.value, 10);
      if (isFinite(v)) { state.prestige = clamp(v, 0, repli("prestigeMax")); refresh(); }
    });
    hooks.push(function () {
      if (document.activeElement !== prIn) prIn.value = state.prestige || 0;
      // le total EFFECTIF peut différer de ce qui est saisi (forçage ou
      // modificateur des Options) : la case vire au rouge pour que personne ne
      // cherche pourquoi ses caractéristiques plafonnent ailleurs
      prIn.classList.toggle("adj", prestige() !== (state.prestige || 0));
      prIn.title = prestige() !== (state.prestige || 0) ? "Effectif : " + prestige() : "";
    });
    mrow.appendChild(fld("Prestige", prIn));
    id.appendChild(mrow);

    head.appendChild(id);
    sheet.appendChild(head);
    buildEnvoi(sheet);

    // garde-fous
    var warns = el("div", "pc-warns");
    hooks.push(function () {
      warns.innerHTML = "";
      if (xpRestant() < 0)
        warns.appendChild(el("div", "pc-warn", "XP dépensé au-delà du total (" + xpDepense() + " / " + state.xpTotal + ")."));
      // Une caractéristique au-dessus du prestige, des points au-dessus du
      // plafond : ce sont les deux murs du système. Le BONUS peut porter le
      // total au-delà sans que ce soit une faute — l'avertissement porte donc
      // sur la valeur ACHETÉE, jamais sur le total.
      // ON AVERTIT SUR CE QUE LE LEVIER A PRODUIT, FORÇAGE COMPRIS. Un total
      // forcé était exempté du garde-fou tant que le plafond ne le bornait
      // plus ; il le borne maintenant, donc il peut le dépasser, donc il faut
      // le DIRE — sans quoi des points disparaîtraient en silence, ce que ces
      // bandeaux existent précisément pour empêcher.
      champs().forEach(function (c) {
        if (caracValeurBrut(c) > caracPlafond(c))
          warns.appendChild(el("div", "pc-warn", "« " + caracInfo(c).nom + " » dépasse le plafond du prestige (" +
            caracValeurBrut(c) + " / " + caracPlafond(c) + ")."));
      });
      champsComp().forEach(function (c) {
        if (compValeurBrut(c) > compPlafond(c))
          warns.appendChild(el("div", "pc-warn", "« " + compInfo(c).nom + " » dépasse son plafond de points (" +
            compValeurBrut(c) + " / " + compPlafond(c) + ")."));
      });
      // AUCUN BANDEAU POUR LA RÈGLE COUPÉE : c'est un réglage volontaire, pas
      // un état du personnage. Les garde-fous ne portent que ce qui cloche.
      // L'ÉCART D'UNE SPÉCIALITÉ. Rien n'est bloqué à l'achat : quand l'écart
      // avec la limite descendrait sous son minimum, c'est le total employé au
      // jet qui est ramené. Ce n'est donc pas une faute — d'où le jaune — mais
      // il faut le DIRE, sinon des points achetés disparaissent en silence.
      (state.specialites || []).forEach(function (sp) {
        if (!sp.carac) return;
        var brut = speTotalBrut(sp), tot = speTotal(sp);
        if (speRetire(sp) <= 0) return;
        // On dit ce qui a été RETIRÉ, pas l'écart qu'on aurait eu : celui-là
        // est négatif dès que le total passe la limite, et un « écart −40 » se
        // lit deux fois avant de vouloir dire quelque chose.
        //
        // LES DEUX NOMBRES SONT CEUX QUI ONT SERVI, et ils ne l'étaient pas :
        // le message nommait l'écart de la CARACTÉRISTIQUE et sa limite
        // COURANTE, quand speRetire emploie l'écart de la SPÉCIALITÉ — bout de
        // la cascade — et la limite NATURELLE. Un bonus de caractéristique
        // suffisait à les séparer, et le joueur ne pouvait plus refaire la
        // soustraction qu'on lui montrait.
        warns.appendChild(el("div", "pc-warn doux", "« " + (sp.nom || "Spécialité") +
          " » : total ramené de " + brut + " à " + tot +
          " (écart " + ecartSpe(sp) + " sous la limite " + caracLimNat(sp.carac) + ")."));
      });
    });
    sheet.appendChild(warns);
  }

  // ---------- onglets ----------
  var TABS = [
    { id: "fiche", label: "Fiche" },
    { id: "art", label: "Art" },
    { id: "equipement", label: "Équipement" },
    { id: "bio", label: "Bio" },
    { id: "options", label: "Options" }
  ];
  function buildTabs(sheet) {
    var bar = el("div", "pc-tabs");
    var panes = {};
    var btns = {};
    TABS.forEach(function (t) {
      var b = el("div", "pc-tab", t.label);
      b.addEventListener("click", function () { activate(t.id); });
      bar.appendChild(b);
      btns[t.id] = b;
      panes[t.id] = el("div", "pc-pane");
      // l'onglet se nomme sur son panneau : c'est le seul moyen, de l'extérieur,
      // de dire dans QUELLE colonne de QUEL onglet un module a atterri
      panes[t.id].dataset.tab = t.id;
    });
    function activate(id) {
      if (!panes[id]) id = "fiche";
      TABS.forEach(function (t) {
        btns[t.id].classList.toggle("on", t.id === id);
        panes[t.id].classList.toggle("on", t.id === id);
      });
      setTab(id);
    }
    sheet.appendChild(bar);
    TABS.forEach(function (t) { sheet.appendChild(panes[t.id]); });
    activate(curTab());
    return panes;
  }

  // ---------- registre de modules ----------
  // Un module = un bloc autonome de la fiche, désigné par un id STABLE (celui
  // que porte son attribut data-module, et sur lequel les sondes s'accrochent).
  // Le registre ne fait rien de plus que ce que le montage faisait en dur : il
  // le rend NOMMABLE. C'est la condition pour qu'un mod puisse un jour se
  // substituer à un module natif, ou changer la disposition, sans qu'on
  // rouvre ce fichier.
  //
  // Un module se décrit ainsi :
  //   id      identifiant stable, unique
  //   titre   ce que le module affiche (pour les réglages de disposition)
  //   onglet  clé d'un onglet de TABS
  //   colonne clé d'une colonne du squelette de cet onglet
  //   pour    prédicat facultatif : le module n'existe que s'il rend vrai
  //   build   fonction sans effet de bord sur la page : elle RETOURNE son bloc
  var modules = [];        // dans l'ordre de déclaration
  var moduleOrdre = [];    // ordre partiel demandé par ordonne() ; brut, filtré au montage
  var placeOrigine = {};   // id -> place déclarée, relevée au montage avant toute consigne

  function rangModule(id) {
    for (var i = 0; i < modules.length; i++) if (modules[i].id === id) return i;
    return -1;
  }
  // Un id DÉJÀ PRÉSENT est REMPLACÉ, À SA PLACE : c'est ainsi qu'un mod se
  // substitue à un module natif. Le renvoyer en fin de colonne changerait la
  // disposition en douce, ce que personne n'a demandé.
  function enregistre(m) {
    var i = rangModule(m.id);
    // QUI a enregistré ce module. Un mod pose presque toujours un module dont
    // l'id diffère du sien : sans cette marque, ni la purge de horsMontage ni
    // les filtres du module ne sauraient remonter jusqu'au mod que le joueur
    // refuse ou supprime. Posée une fois pour toutes, elle survit au rejeu.
    if (m && modEnExec && !m.__mod) m.__mod = modEnExec;
    if (i >= 0) modules[i] = m;
    else modules.push(m);
    // Hors montage (console du navigateur, script tiers chargé après la fiche) :
    // le prochain mount() remet la table à la table native, et rien ne
    // rejouerait cet enregistrement. On le garde donc, comme le montage rejoue
    // les mods à chaque fois. Le propriétaire est le MOD s'il y en a un, sinon
    // l'id du module : c'est par lui que le rejeu saura s'il a encore un ayant
    // droit (rejoueHorsMontage).
    if (!enMontage)
      gardeHorsMontage({ mod: m, prop: (m && (m.__mod || m.id)) ? String(m.__mod || m.id) : "?" });
    return m;
  }
  // Ordre PARTIEL : les id listés passent devant, dans l'ordre donné ; tous les
  // autres suivent à leur rang de déclaration. La liste est gardée BRUTE et
  // filtrée seulement au montage : un id peut nommer un module pas encore
  // enregistré (un mod chargé après), et un module retiré un jour ne doit pas
  // casser une disposition enregistrée.
  function ordonne(liste) {
    moduleOrdre = [];
    if (!liste) return;
    for (var i = 0; i < liste.length; i++)
      if (moduleOrdre.indexOf(liste[i]) < 0) moduleOrdre.push(liste[i]);
  }
  function ordreModules() {
    var vus = {}, out = [];
    moduleOrdre.forEach(function (id) {
      var i = rangModule(id);
      if (i >= 0 && !vus[id]) { vus[id] = 1; out.push(modules[i]); }
    });
    modules.forEach(function (m) {
      if (!vus[m.id]) { vus[m.id] = 1; out.push(m); }
    });
    return out;
  }

  // Squelette de chaque onglet : ses colonnes, dans l'ordre exact où elles
  // existaient avant le registre. Il vit ici, et pas dans les modules, pour
  // qu'un mod n'ait qu'un bloc à fournir sans rien savoir de la charpente.
  var SQUELETTES = {
    fiche: function (pane) {
      // trois colonnes : prestige et caractéristiques | initiative, corps,
      // PV et endurance | compétences et spécialités
      var cols = el("div", "pc-cols-fiche");
      var c1 = el("div", "pc-col");
      var c2 = el("div", "pc-col");
      var c3 = el("div", "pc-col");
      cols.appendChild(c1);
      cols.appendChild(c2);
      cols.appendChild(c3);
      pane.appendChild(cols);
      return { gauche: c1, milieu: c2, droite: c3 };
    },
    // UNE SEULE COLONNE, ET C'EST LE PANNEAU LUI-MÊME. Rendre le panneau plutôt
    // qu'un enfant est ce qui marque la colonne « pleine largeur » : le plan des
    // modules le reconnaît en comparant c[k] === pane (voir squeletteColonnes).
    // Un art porte des descriptions et des macros — deux colonnes les
    // couperaient en deux pour rien.
    art: function (pane) {
      return { seule: pane };
    },
    equipement: function (pane) {
      var cols = el("div", "pc-cols2");
      var left = el("div", "pc-col");
      var right = el("div", "pc-col");
      cols.appendChild(left);
      cols.appendChild(right);
      pane.appendChild(cols);
      // « bas » = sous les deux colonnes, pleine largeur (l'inventaire)
      return { gauche: left, droite: right, bas: pane };
    },
    bio: function (pane) {
      var cols = el("div", "pc-cols2");
      var left = el("div", "pc-col");
      var right = el("div", "pc-col");
      cols.appendChild(left);
      cols.appendChild(right);
      pane.appendChild(cols);
      return { gauche: left, droite: right };
    },
    options: function (pane) {
      var cols = el("div", "pc-cols2");
      var colA = el("div", "pc-col");
      var colB = el("div", "pc-col");
      cols.appendChild(colA);
      cols.appendChild(colB);
      pane.appendChild(cols);
      return { gauche: colA, droite: colB };
    }
  };

  // L'interrupteur du module. Seuls les modules COUPÉS figurent dans
  // state.modActifs : tout le reste est actif, y compris un module inconnu de
  // la fiche qui l'ouvre.
  function actif(id) {
    return !state || !state.modActifs || state.modActifs[id] !== false;
  }
  // Couper un module le retire de la fiche sans rien effacer : son coffre et
  // ses données restent, il ne s'affiche plus. C'est le corps de Mia.active,
  // NOMMÉ ici parce que le bloc Options « Modules » s'en sert aussi : son
  // interrupteur ne doit pas passer par un window.Mia qu'un mod peut remplacer.
  function activeModule(id, oui) {
    if (!state) return;                  // avant le chargement : rien à couper
    if (!state.modActifs) state.modActifs = {};
    // Le bloc des réglages ne se coupe pas, et le REFUS EST ICI, dans l'écriture,
    // pas seulement dans le montage. Sinon un mod qui appelle Mia.active laisse
    // « modules: false » dans le personnage pour toujours : le bloc s'affiche
    // (le montage l'exempte) pendant que Mia.actif("modules") répond faux, et le
    // personnage transmis emporte une incohérence que rien n'efface.
    if (String(id) === MODULE_REGLAGES) { delete state.modActifs[id]; save(); return; }
    if (oui === false) state.modActifs[id] = false;
    else delete state.modActifs[id];
    save();
  }
  var elModules = {};   // id -> l'élément monté (pour marquer une muselière)
  // Le bloc des réglages d'affichage, nommé une fois pour toutes : trois
  // endroits doivent l'épargner, et un id recopié à la main finirait par
  // manquer à l'un d'eux.
  var MODULE_REGLAGES = "modules";

  function monteModules(panes) {
    var colonnes = {};
    elModules = {};
    TABS.forEach(function (t) {
      if (SQUELETTES[t.id] && panes[t.id]) colonnes[t.id] = SQUELETTES[t.id](panes[t.id]);
    });
    ordreModules().forEach(function (m) {
      // Le bloc des réglages ne se coupe pas. Sa puce est déjà absente de la
      // liste, mais un mod (ou une ligne de console) qui appelle
      // Mia.active("modules", false) écrit le refus DANS LE PERSONNAGE : le
      // bloc ne se monterait plus, et avec lui disparaîtrait le seul endroit
      // d'où l'on rallume un module ou d'où l'on rend la disposition d'origine.
      // Le blocage voyagerait même avec le personnage.
      //
      // Ce test passe AVANT celui de l'hôte : un module coupé n'affiche rien
      // parce que le joueur l'a voulu, il n'a pas à porter la mention de ceux
      // qui ne trouvent pas leur place.
      if (m.id !== MODULE_REGLAGES && !actif(m.id)) return;   // coupé : pas monté
      // « pour » de la table native est un PRÉDICAT (le module n'existe que
      // s'il rend vrai) ; celui d'un mod est une version, gérée ailleurs.
      // Il passe par moduleAffichable, qui l'attrape : un prédicat qui jette
      // emportait sinon TOUT le montage, donc la fiche, sans rien pour rouvrir.
      // Lui aussi avant l'hôte : un module qui n'existe pas ici n'a rien à dire
      // de sa colonne, et le bloc Modules ne lui donne d'ailleurs pas de ligne.
      if (!moduleAffichable(m)) return;
      // Onglet ou colonne inconnus : le module est laissé de côté (un mod mal
      // réglé ne doit pas emporter toute la fiche), mais il est MARQUÉ. Sans ce
      // « vide », un module qui déclare une colonne absente de son onglet ne
      // s'affiche nulle part ET ne se plaint nulle part : sa ligne du bloc
      // Modules le donne pour un module ordinaire, et le joueur cherche une
      // panne qui n'existe pas. aClef, et pas une simple lecture : une colonne
      // nommée « constructor » rendrait autrement une méthode d'Object en guise
      // d'hôte, et le montage tomberait sur le premier appendChild.
      var cols = colonnes[m.onglet];
      var hote = (cols && aClef(cols, m.colonne)) ? cols[m.colonne] : null;
      if (!hote) { etatModule(m.id).vide = true; return; }
      // le module construit DANS son propre registre : tout ce que ses briques
      // y poussent lui appartient, et lui seul en répond
      var reg = regModule(m.id);
      var precedent = hooks;
      // même idée pour les filtres : ceux qu'un module pose pendant son build
      // portent son id, et c'est lui que le journal nomme s'ils déraillent
      var propPrecedent = proprietaireCourant;
      var e;
      hooks = reg;
      // le MOD qui a posé ce module, s'il vient d'un mod : c'est lui l'ayant
      // droit de ce que le build enregistre, pas l'id du bloc
      proprietaireCourant = m.__mod || m.id;
      try {
        e = m.build(contexte(m, reg));
        // build qui rend autre chose qu'un ÉLÉMENT (une chaîne, un objet, un
        // texte) : rien à monter, et surtout rien qui porte un dataset. Le
        // traiter comme un build muet coûte un bloc ; le poser dans la page
        // coûtait la fiche entière.
        if (e && e.nodeType !== 1) e = null;
        // les modules à rouage se sont déjà nommés (block() pose data-module) ;
        // les autres le reçoivent ici, pour que TOUS soient repérables. DANS le
        // try : c'est encore le module qui répond de ce qu'il a rendu.
        if (e && !e.dataset.module) e.dataset.module = m.id;
        etatModule(m.id).panne = "";
      } catch (err) {
        // build a pu pousser des fonctions avant de tomber : elles pointent
        // sur un bloc à moitié bâti et jetteraient à chaque rafraîchissement
        reg.length = 0;
        e = blocEnPanne(m, err);
      }
      hooks = precedent;
      proprietaireCourant = propPrecedent;
      // build qui ne rend rien : ce n'est PAS une erreur (un module a le droit
      // de s'effacer), mais la liste des modules doit pouvoir le signaler
      etatModule(m.id).vide = !e;
      if (!e) return;
      // L'INSERTION AUSSI PEUT JETER, et c'était la dernière porte par laquelle
      // un mod fermait la fiche. Un build qui rend document.body (ou n'importe
      // quel ancêtre du point de montage) fait lever appendChild : hors try,
      // l'exception sortait de mount(), la feuille restait à moitié bâtie, et
      // comme le mod voyage avec le personnage cela recommençait à CHAQUE
      // ouverture, sans une ligne d'interface pour le couper. Ici, c'est une
      // carte de panne comme une autre, avec son bouton Désactiver.
      try {
        hote.appendChild(e);
        elModules[m.id] = e;
      } catch (err2) {
        reg.length = 0;
        var carte = blocEnPanne(m, err2);
        elModules[m.id] = carte;
        // la carte de panne, elle, est bâtie ici : elle s'insère forcément
        hote.appendChild(carte);
      }
    });
  }

  // ---------- isolation des pannes ----------
  // Un module dont build() jette ne fait pas tomber la fiche : il rend cette
  // carte à sa place, et le montage continue. Réessayer le reconstruit (une
  // panne peut tenir à l'état du moment) ; Désactiver le retire de la fiche
  // sans rien effacer de ce qu'il porte.
  function blocEnPanne(m, err) {
    var msg = messageErreur(err);
    etatModule(m.id).panne = msg;
    if (window.console && window.console.error) window.console.error("[mod:" + m.id + "]", err);
    var b = el("div", "pc-block");
    b.dataset.module = m.id;
    b.dataset.panne = "1";
    var t = el("div", "pc-block-title", m.titre || m.id);
    // la page Mods promet un cadre qui donne l'ID du module et le message :
    // c'est l'id, pas le titre, qui sert à retrouver le mod dans la liste et
    // dans le journal du navigateur (« [mod:<id>] »)
    t.appendChild(el("small", null, "module en panne — " + m.id));
    b.appendChild(t);
    b.appendChild(el("div", "pc-empty", msg));
    var tools = el("div", "pc-comp-tools");
    var line = el("div", "row");
    line.appendChild(miniBtn("Réessayer", "Reconstruire ce module", function () {
      delete etatsModules[m.id];
      remount();
    }));
    // Pas de « Désactiver » pour le bloc des réglages, même en panne : le
    // couper retirerait le seul endroit d'où l'on rallume un module, y compris
    // lui-même. « Réessayer » reste, et le montage suivant lui redonne sa
    // chance ; les modules coupés le sont, eux, sans que la fiche s'en mêle.
    if (m.id !== MODULE_REGLAGES)
      line.appendChild(miniBtn("Désactiver", "Retirer ce module de la fiche : rien n'est perdu, il ne s'affiche plus.", function () {
        // même garde que __miaModules.active : une panne peut survenir sur un
        // état remplacé à la main (import, bibliothèque) qui n'est pas repassé
        // par normalize(), et la clé manquerait
        if (!state.modActifs) state.modActifs = {};
        state.modActifs[m.id] = false;
        save();
        remount();
      }, "danger"));
    tools.appendChild(line);
    b.appendChild(tools);
    return b;
  }
  // Muselé : le module garde son bloc (ses valeurs sont celles du dernier
  // rafraîchissement réussi), il cesse seulement d'être rappelé. On marque son
  // bloc et on dit pourquoi, sans rien changer à la mise en page.
  function museleAffiche(id, e) {
    if (window.console && window.console.warn)
      window.console.warn("[mod:" + id + "] muselé après " + e.echecs +
                          " rafraîchissements en erreur : " + e.erreur);
    var n = elModules ? elModules[id] : null;
    if (!n) return;
    n.dataset.musele = "1";
    n.title = "Module muselé après " + e.echecs + " rafraîchissements en erreur : " + e.erreur;
  }

  // ---------- le contexte d'un module ----------
  // C'est TOUT ce qu'un module touche, natif comme mod : le contrat public
  // décrit dans la page Mods. Les modules natifs de ce fichier n'en font pas
  // usage (ils appellent les fonctions directement), mais ils le reçoivent :
  // un mod qui reprend l'id de l'un d'eux dispose exactement du même.
  //
  // Les libellés officiels des données du personnage : un mod nomme les choses
  // comme le reste de la fiche au lieu d'inventer son vocabulaire.
  var LIBELLES = {
    nom: "Nom", espece: "Espèce", age: "Âge", sexe: "Sexe", genre: "Genre",
    pv: "PV", pvMax: "PV max", endurance: "Endurance",
    initiative: "Initiative", vitesse: "Vitesse", recup: "Récupération / jour",
    poids: "Poids porté", charge: "Charge maximale", prestige: "Prestige",
    xpTotal: "XP total", total: "Total", mod: "MOD", lim: "LIM",
    points: "Points", plafond: "Plafond",
    caracteristique: "Caractéristique", competence: "Compétence",
    specialite: "Spécialité",
    arme: "Arme", degats: "Dégâts", armure: "Armure",
    quantite: "Quantité", groupe: "Groupe", description: "Description",
    avantage: "Avantage", defaut: "Défaut", qualite: "Qualité",
    background: "Background", notes: "Notes", de: "Dé des jets de test"
  };
  function contexte(m, reg) {
    var id = m.id;
    // LE PROPRIÉTAIRE EST LE MOD, PAS LE MODULE. Un mod enregistre presque
    // toujours un module dont l'id diffère du sien (« lmod » qui pose
    // « bloc-journal ») : attribuer le filtre au module rendrait la purge
    // inopérante, puisque c'est le MOD que le joueur refuse ou supprime.
    // m.__mod est posé par enregistre() quand un mod tourne.
    var prop = m.__mod || id;
    // Ce qu'un module installe DEPUIS un gestionnaire (un clic, longtemps après
    // le montage) doit rester à son nom. Sans cette enveloppe, proprietaireCourant
    // est retombé à « ? » et le filtre posé par le bouton d'un mod refusé
    // survivait à son refus : c'est exactement le défaut que la contre-relecture
    // a rouvert.
    function aNous(fn) {
      if (typeof fn !== "function") return fn;
      return function () {
        var avant = proprietaireCourant;
        proprietaireCourant = prop;
        try { return fn.apply(this, arguments); }
        finally { proprietaireCourant = avant; }
      };
    }
    // le coffre privé du module, rangé dans state.modData[id] : il voyage avec
    // le personnage (bibliothèque, export JSON, Attributes Roll20)
    var donnees = {
      // LIRE NE SALIT PAS. L'ancienne version rangeait un objet vide dans
      // l'état au premier get() : tout module qui se contentait de lire
      // laissait sa trace dans le personnage, et un personnage qui n'a jamais
      // rien réglé se retrouvait avec autant d'entrées que de modules. On rend
      // un objet détaché ; c'est set() qui écrit, lui seul.
      get: function () {
        var d = state.modData && state.modData[id];
        return (d && typeof d === "object") ? d : {};
      },
      // La validation est IMMÉDIATE et l'erreur remonte AU MODULE. Un objet
      // circulaire doit casser le module qui l'écrit, jamais la sauvegarde de
      // la fiche : rangé tel quel, il ferait échouer le JSON.stringify(state)
      // du premier save() et le personnage entier cesserait de s'enregistrer.
      set: function (o) {
        if (o === null || o === undefined) o = {};
        if (typeof o !== "object") throw new TypeError("ctx.donnees.set attend un objet.");
        JSON.stringify(o);              // circulaire : l'erreur part au module
        if (!state.modData) state.modData = {};
        state.modData[id] = o;
      }
    };
    // puce de filtre, comme celles des modules Armes et Compétences
    function puce(libelle, lire, ecrire) {
      var c = el("span", "pc-chip", libelle);
      c.classList.toggle("on", !!lire());
      c.addEventListener("click", function () {
        ecrire(!lire());
        c.classList.toggle("on", !!lire());
        refresh();
      });
      reg.push(function () { c.classList.toggle("on", !!lire()); });
      return c;
    }
    return {
      // identité
      id: id,
      // Le numéro tel qu'il est, suffixe de beta compris : qui voudrait le
      // lire passe par MiaMods.lireVersion, seul endroit qui sache ce que
      // vaut ce suffixe. Le découper à la main ici rendrait « 0b » sur le
      // dernier nombre, et le majeur n'apprend RIEN du schéma.
      version: RELEASE,
      // données (en lecture : ce qui appartient au personnage appartient aux
      // modules natifs, un module ne le corrige pas dans le dos des autres)
      state: state,
      data: DATA,
      donnees: donnees,
      // structure
      // Le rouage d'édition est OPTIONNEL : ctx.bloc("Titre", { edition: true }).
      // Sans lui, un module qui n'a rien à éditer affichait quand même le
      // bouton, qui ne faisait que basculer un mode dont il ne se servait pas.
      // Le bloc reste repérable sans : monteModules pose data-module lui-même.
      bloc: function (titre, opts) {
        return block(titre, null, (opts && opts.edition) ? id : null);
      },
      el: el,
      fld: function (libelle, champ) { return fld(libelle, champ); },
      // cycle
      surRafraichissement: function (fn) { if (typeof fn === "function") reg.push(fn); },
      rafraichir: refresh,
      enregistrer: save,
      reconstruire: remount,
      edition: function () { return isEdit(id); },
      // briques. Tout ce qui prend un GESTE du joueur passe par aNous() : le
      // code appelé au clic doit rester attribué à son mod, sinon ce qu'il
      // installe alors n'a plus d'ayant droit et survit à son refus.
      texte: function (lire, ecrire, indication) { return textInput(lire, aNous(ecrire), indication, reg); },
      bouton: function (libelle, infobulle, action) { return miniBtn(libelle, infobulle, aNous(action)); },
      pas: function (lire, ecrire, pas) { return stepper(lire, aNous(ecrire), pas || 1, null, reg); },
      tuile: function (libelle, valeur, action) { return bigTile(libelle, valeur, aNous(action), reg); },
      ligneComp: function (carac, nom) {
        return compRow({ key: carac + "/" + nom, name: nom, carac: carac, custom: false },
                       false, { module: id, reg: reg });
      },
      filtre: puce,
      dialogue: function (titre, corps, valider) { return dialogue(titre, corps, aNous(valider)); },
      message: flash,
      // sorties (le destinataire reste celui que le joueur a fixé)
      jet: function (libelle, valeur) { doRoll(libelle, valeur, null, true); },
      auTchat: function (titre, champs) { sayChat(titre, champs); },
      boutonTchat: function (libelle, titre, champs) {
        return miniBtn(libelle, "Envoyer dans le tchat Roll20", function () {
          sayChat(titre, typeof champs === "function" ? champs() : champs);
        });
      },
      // calculs : tous dérivés, donc en lecture seule
      calculs: {
        caracTotal: caracTotal,
        // les deux étages sous le total : la valeur coiffée et le bonus, tels
        // que leurs chaînes les rendent. Un module qui les recalculerait à
        // partir de l'état brut sauterait les leviers du meneur.
        caracValeur: caracValeur,
        caracBonus: caracBonus,
        caracMod: caracMod,
        caracLim: caracLim,
        // les deux étages sous elle : une compétence décale la limite de sa
        // caractéristique, une spécialité décale celle de sa compétence
        compLim: compLim,
        speLim: speLim,
        limiteJet: limiteJet,
        compPts: compPts,
        compValeur: compValeur,
        compBonus: compBonus,
        compPlafond: compPlafond,
        spePts: spePts,
        spePlafond: spePlafond,
        langueTotal: langueTotal,
        langueNiveau: langueNiveau,
        artXp: artXp,
        artAvantage: artAvantage,
        speBonus: speBonus,
        jetBonus: jetBonus,
        prestige: prestige,
        pvMax: pvMax,
        pvCourant: pvCourant,
        enduranceMax: enduranceMax,
        enduranceMalus: enduranceMalus,
        recupJour: recupJour,
        initiative: initiative,
        vitesse: vitesse,
        poidsPorte: poidsPorte,
        chargeMax: chargeMax
      },
      // …et de quoi les CHANGER : un filtre reçoit la valeur calculée et rend
      // celle qu'il veut, pour toute la fiche. Le propriétaire est figé ici, à
      // la construction du contexte, et c'est celui du MOD : un module qui pose
      // son filtre depuis un bouton, longtemps après son build, reste chez lui,
      // et refuser le mod emporte bien le filtre.
      filtreCalcul: function (nom, fn) { ajouteFiltre(nom, fn, prop); },
      // mise en forme
      fmt: { signe: sign, nombre: fmtP },
      champs: LIBELLES,
      abbr: function (carac) { return caracInfo(carac).code || carac; },
      nomDe: function (carac) { return caracInfo(carac).nom || carac; }
    };
  }

  // ---------- onglet Fiche : les caractéristiques ----------
  // LES HUIT, dans l'ordre de champs(), c'est-à-dire celui de la page de
  // règles. Aucune liste écrite en dur : une caractéristique renommée ou
  // déplacée dans les règles arrive ici sans qu'on rouvre ce fichier.
  //
  // LE PRESTIGE N'EST PAS ICI, et c'est délibéré : il n'est pas une
  // caractéristique, il les plafonne toutes. Il se saisit dans l'en-tête, à
  // côté de l'XP total — les deux mêmes choses, ce que le meneur accorde.
  function buildCaracs() {
    // jeu : le sigle et son trio ; édition : les mêmes cases, dont deux
    // s'ouvrent à la saisie
    var b = block("Caractéristiques", null, "caracs");

    // ---------- l'entête des trois colonnes ----------
    // MÊME SQUELETTE QUE LE TRIO, sans ses bordures : c'est la seule façon
    // d'être sûr que les étiquettes tombent en face de leurs nombres. Une
    // rangée bâtie à part dériverait d'un pixel au premier changement de
    // remplissage, et personne ne saurait plus laquelle des trois on lit.
    //
    // Une seule fois, en tête : répétées sur chacune des huit lignes, elles
    // disaient vingt-quatre fois ce que trois mots suffisent à dire, et
    // noyaient les nombres qu'on vient lire.
    //
    // LE MOT ENTIER, ET JAMAIS L'ABRÉGÉ. « VAL », « BON », « TOT » ne coûtaient
    // rien à écrire mais se lisaient trois fois : la place existe, l'entête ne
    // paraît qu'une fois pour huit lignes, et un mot entier n'a pas besoin
    // d'être appris. La règle vaut pour les trois listes de la fiche.
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "sp"));
    var teteTrio = el("span", "pc-trio tete");
    ["Valeur", "Bonus", "Total"].forEach(function (k) {
      var c = el("span", "c");
      c.appendChild(el("span", "k", k));
      teteTrio.appendChild(c);
    });
    tete.appendChild(teteTrio);
    b.appendChild(tete);

    // ---------- une caractéristique ----------
    function ligne(code) {
      var info = caracInfo(code);
      var row = el("div", "pc-crow");

      var top = el("div", "pc-crow-top");
      // le sigle est ce que le joueur lit sur ses jets et dans ses règles ; le
      // nom entier tient dans l'infobulle, pour la colonne trop étroite
      var chip = el("span", "pc-abbr", code);
      chip.title = info.nom;
      top.appendChild(chip);
      top.appendChild(el("span", "sp"));

      // ON NE LANCE PAS UNE CARACTÉRISTIQUE. Un jet part toujours d'une
      // compétence ou d'une spécialité — la caractéristique n'y entre que par
      // son MOD et sa limite. Le bloc ne se clique donc pas : il n'a ni
      // curseur, ni survol, ni action.
      var trio = el("span", "pc-trio");
      // TROIS NOMBRES, ET ILS DISENT UNE SEULE CHOSE : ce que la
      // caractéristique VAUT. Ce qu'elle DONNE au jet — son modificateur, sa
      // limite — ne s'écrit plus ici : les deux se lisent dans la table des
      // règles, et la compétence qui en relève les porte déjà sur sa propre
      // ligne. L'infobulle du bloc les rappelle, et le jet les emploie.
      //
      // DEUX SE SAISISSENT DANS LEUR CASE. Le rang de construction qui portait
      // leurs ± a disparu avec : la ligne garde la même hauteur, rouage ouvert
      // ou fermé, et la même que celle d'une spécialité.
      var vVal = caseSaisie(trio,
        function () { return caracBase(code); },
        function (v) {
          // le plafond ne bloque que les HAUSSES : une valeur passée au-dessus
          // (prestige abaissé après coup) redescend pas à pas au lieu d'être
          // écrasée d'un seul clic
          //
          // ET IL NE BLOQUE PLUS RIEN DÈS QU'UN LEVIER DE VALEUR S'INTERPOSE :
          // la coiffe tombe sur le RÉSULTAT de la chaîne, pas sur ce qu'on
          // tape. Sous un facteur d'un demi, s'arrêter au plafond empêcherait
          // d'acheter assez pour l'atteindre. Le garde-fou de l'en-tête, lui,
          // dit toujours la vérité — il lit la sortie.
          var plaf = caracPlafond(code);
          var n = Math.round(v);
          if (!levierRegleDe(lireCarac("valeur", code))) {
            var haut = Math.max(plaf, caracBase(code));
            if (n > haut) { flash("Plafond de " + plaf + "."); n = haut; }
          }
          state.caracs[code] = Math.max(0, n);
        }, "Valeur achetée");
      var vBon = caseSaisie(trio,
        function () { return state.caracsBonus[code] || 0; },
        function (v) {
          var n = clamp(Math.round(v), -999, 999);
          if (n) state.caracsBonus[code] = n; else delete state.caracsBonus[code];
        }, "Bonus de la caractéristique");
      var vTot = caseTexte(trio);
      top.appendChild(trio);
      row.appendChild(top);

      // L'XP N'EST PLUS ÉCRITE SUR LA LIGNE. Elle prenait un rang entier sous
      // les nombres, uniquement en édition — donc une ligne qui changeait de
      // hauteur au clic du rouage. Ce qu'une caractéristique coûte se lit dans
      // le total de l'en-tête, qui avertit dès qu'il est dépassé ; le détail par
      // caractéristique appartient au calibrage, pas à la fiche en jeu.
      hooks.push(function () {
        // LES DEUX CASES MONTRENT CE QUI COMPTE VRAIMENT, LEVIER COMPRIS : la
        // valeur coiffée et le bonus tel que sa chaîne le rend. Lire l'état brut
        // ici afficherait un nombre que le jet n'emploie pas, et le trio ne
        // s'additionnerait plus jusqu'au total écrit juste à côté.
        var base = caracBase(code);
        var vBrut = caracValeurBrut(code);
        var d = caracBonus(code);
        // LE LEVIER SE LIT PAR SON RÉSULTAT, et non par une de ses neuf cases :
        // un facteur ou un ajout de fin décalent le nombre sans toucher à celle
        // qu'on lisait ici, et la pastille « retouché » restait éteinte.
        var dv = vBrut - base;
        var db = d - caracBonusSocle(code);
        var dm = caracModBrut(code) - caracModTable(code);
        var dl = caracLimBrut(code) - caracLimTable(code);
        var plaf = caracPlafond(code);
        // LE PLAFOND MORD SUR CE QUE LE LEVIER A PRODUIT, jamais sur ce qui a
        // été acheté : une valeur poussée au-dessus par un levier est rognée
        // comme une autre, et une valeur ramenée en dessous ne l'est plus.
        var mord = vBrut > plaf;
        var retouche = d !== 0 || dv !== 0 || db !== 0 || dm !== 0 || dl !== 0 || mord;
        // LA VALEUR EST CELLE QU'ON A ACHETÉE, le bonus ce qui s'y ajoute, le
        // total leur somme — c'est de ce total-là que la table tire le MOD et
        // la limite du jet.
        vVal.txt.textContent = String(caracValeur(code));
        vBon.txt.textContent = sign(d);
        vTot.textContent = String(caracTotal(code));
        trio.classList.toggle("adj", retouche);
        // quand le plafond mord, le dire : sans cela, le joueur voit un total
        // qui ne correspond ni à ce qu'il a acheté ni à ce qu'il a modifié, et
        // rien ne dit pourquoi.
        trio.title = "Valeur " + base +
                     (dv ? " · valeur décalée de " + sign(dv) + " (Options)" : "") +
                     (mord ? ", plafonnée à " + plaf : "") +
                     (d ? " · bonus " + sign(d) : "") +
                     (db ? " (décalé de " + sign(db) + ", Options)" : "") +
                     (dm ? " · MOD décalé de " + sign(dm) + " (Options)" : "") +
                     (dl ? " · limite décalée de " + sign(dl) + " (Options)" : "") +
                     " — MOD " + sign(caracMod(code)) + ", LIM " + caracLim(code);
      });
      return row;
    }

    // ---------- les huit, dans l'ordre des règles ----------
    champs().forEach(function (code) { b.appendChild(ligne(code)); });
    return b;
  }
  // ---------- le corps : vitesse, charge, sauts ----------
  // Quatre tuiles autonomes plutôt qu'un bloc encadré : chacune est SON module
  // (rouage flottant, valeur forcée, modificateurs), et la grille à deux
  // colonnes les tient serrées au milieu de la fiche.
  //
  // La charge y entre parce qu'elle commande tout le reste : passé ses paliers,
  // elle rogne l'initiative, la vitesse, les sauts et l'esquive. Quand elle
  // mord, les tuiles atteintes se marquent — c'est tout ce que la fiche en dit.
  //
  // Valeur forcée d'une tuile : vide = valeur calculée. Même mécanique que le
  // maximum de PV, en version étroite (deux lignes empilées sous la valeur).
  function tuileForce(tile, champ, auto, dec) {
    var row = el("div", "pc-bigedit pc-edit-only");
    row.appendChild(el("span", "lbl", "Forcé"));
    var inp = el("input", "force");
    inp.type = "number"; inp.min = "0";
    inp.step = dec ? "0.5" : "1";
    inp.title = "Vide = calculée ; une valeur la force.";
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      state[champ] = isFinite(v)
        ? clamp(dec ? Math.round(v * 100) / 100 : Math.floor(v), 0, 9999)
        : null;
      refresh();
    });
    hooks.push(function () {
      inp.placeholder = fmtP(auto());
      if (document.activeElement !== inp) inp.value = state[champ] === null ? "" : state[champ];
    });
    row.appendChild(inp);
    tile.appendChild(row);
  }
  function tuileMods(tile, cle) {
    var row = el("div", "pc-bigedit pc-edit-only");
    row.appendChild(el("span", "lbl", "Modificateurs"));
    row.appendChild(multiMod(state.divers, cle));
    tile.appendChild(row);
  }
  // Le gréement commun d'une tuile réglable. LES QUATRE L'ONT : ce sont quatre
  // valeurs dérivées de la même façon, que les mêmes paliers de charge rognent,
  // et une seule qui refuserait le décalage du MJ serait un trou, pas un choix.
  function tuileReglable(tile, id, champ, auto, cle, dec) {
    tile.classList.add("pc-mods-host", "pc-editable");
    tile.dataset.module = id;
    var g = gearBtn(tile, id);
    g.classList.add("pc-gear-float");
    tile.appendChild(g);
    tuileForce(tile, champ, auto, dec);
    tuileMods(tile, cle);
    return tile;
  }
  // Ce que les paliers de charge font à UNE valeur, pour son infobulle. Le tri
  // par clé de calcul est ce qui empêche l'infobulle de la vitesse d'énumérer
  // des malus d'esquive : chaque tuile ne raconte que ce qui la concerne.
  function tuilePaliers(clef, verbe) {
    var out = [];
    chargePaliers().forEach(function (p) {
      if (p.calc[clef]) out.push("charge " + p.seuil + " % : " + verbe + " " + fmtP(p.calc[clef]));
    });
    return out;
  }

  function buildVitesse() {
    // DEUX RANGS DE DEUX : la vitesse et la charge d'abord, parce qu'on les lit
    // à chaque round ; les deux sauts en dessous, qui ne servent qu'au moment
    // où l'on saute. Les sauts sont SÉPARÉS : ce sont deux distances, dans deux
    // unités de geste différentes, et les empiler dans une seule case obligeait
    // à se rappeler laquelle venait en premier.
    var tiles = el("div", "pc-bigrow pc-bigrow-2");

    // ---- vitesse ----
    var tv = tuileReglable(bigTile("Vitesse", vitesse), "vitesse",
                           "vitesseOverride", vitesseAuto, "vitesse", true);
    hooks.push(function () {
      var d = modSum(state.divers.vitesse);
      var pal = tuilePaliers("vitesseDiv", "divisée par");
      // la charge ne marque la tuile que lorsqu'elle coûte vraiment des mètres :
      // un sac lourd mais sous le premier palier ne change rien
      tv.classList.toggle("adj", state.vitesseOverride !== null || d !== 0 || pal.length > 0);
      tv.title = state.vitesseOverride !== null
        ? "Vitesse forcée à " + fmtP(state.vitesseOverride) + " m (calculée : " +
          fmtP(vitesseAuto()) + " m)"
        : pal.concat(d ? ["modificateurs " + sign(d) + " m"] : []).join(" · ");
    });
    tiles.appendChild(tv);

    // ---- charge ----
    var tc = bigTile("Charge", function () {
      return fmtP(poidsPorte()) + " / " + fmtP(chargeMax());
    });
    tuileReglable(tc, "charge", "chargeOverride", chargeMaxAuto, "charge", true);
    hooks.push(function () {
      var d = modSum(state.divers.charge);
      var haut = chargePaliers().length;
      tc.classList.toggle("adj", !!haut || state.chargeOverride !== null || d !== 0);
      var pct = chargePct();
      tc.title = (state.chargeOverride !== null
        ? "Charge maximale forcée à " + fmtP(state.chargeOverride) + " (calculée : " +
          fmtP(chargeMaxAuto()) + ")"
        : (d ? "Modificateurs " + sign(d) : "")) +
        // une charge maximale nulle rend le pourcentage infini : on le dit au
        // lieu d'afficher « Infinity % », qui passerait pour une panne
        (isFinite(pct) ? " · porté : " + Math.round(pct) + " %" : " · aucune charge maximale");
    });
    tiles.appendChild(tc);

    // ---- les deux sauts ----
    // Chacun est son module, comme la vitesse et la charge : rouage, valeur
    // forcée, modificateurs. Ils partagent le diviseur de charge mais rien
    // d'autre, et se règlent donc séparément.
    [["Saut longueur", sautLong, "sautLong", "sautLongOverride", sautLongAuto],
     ["Saut hauteur",  sautHaut, "sautHaut", "sautHautOverride", sautHautAuto]
    ].forEach(function (o) {
      var ts = tuileReglable(bigTile(o[0], o[1]), o[2], o[3], o[4], o[2], true);
      hooks.push(function () {
        var d = modSum(state.divers[o[2]]);
        var pal = tuilePaliers("sautDiv", "divisés par");
        ts.classList.toggle("adj", state[o[3]] !== null || d !== 0 || pal.length > 0);
        ts.title = state[o[3]] !== null
          ? o[0] + " forcé à " + fmtP(state[o[3]]) + " m (calculé : " + fmtP(o[4]()) + " m)"
          : pal.concat(d ? ["modificateurs " + sign(d) + " m"] : []).join(" · ");
      });
      tiles.appendChild(ts);
    });

    return tiles;
  }
  // ---------- initiative ----------
  // L'INITIATIVE N'EST PLUS UNE COMPÉTENCE : les règles en font une VALEUR, que
  // l'équipement pousse et que la charge écrase. Elle garde son module parce
  // qu'on la relit à chaque combat, et parce qu'elle est le seul chiffre de la
  // fiche qui aille au compteur de tours de Roll20.
  //
  // AUCUN DÉ NE LA DÉCIDE : personne ne « lance » son initiative dans MIA. Le
  // bouton porte donc la valeur telle quelle au compteur, sans passer par
  // doJet, qui bâtirait un d100 que le jeu ne demande nulle part. « 0d0 + n »
  // est la forme dont le moteur se sert déjà pour faire voyager une constante
  // dans une expression de jet (jetExpr y pose la limite) ; le drapeau du
  // compteur s'y attache comme au reste.
  function initAuCompteur() {
    var v = initiative();
    if (envoyer(cmdJetExpr("Initiative", "0d0+" + v, true))) return;
    flash("Initiative : " + v + " (hors Roll20 : aucun compteur de tours où l'inscrire).");
  }

  function buildInitiative() {
    var b = block("Initiative", null, "initiative");
    var row = el("div", "pc-kv");
    var val = el("span", "pc-cval");
    row.appendChild(val);
    row.appendChild(el("span", "sp"));
    row.appendChild(miniBtn("Compteur", "Inscrire l'initiative au compteur de tours de Roll20",
                            initAuCompteur));
    b.appendChild(row);


    // construction : valeur forcée (vide = calculée) + divers, comme les PV.
    // Le forçage accepte le NÉGATIF, et c'est voulu : deux armures dans le sac
    // suffisent à passer sous zéro, et un plancher à zéro mentirait sur l'état
    // d'un personnage qui a tout chargé sur son dos.
    var mrow = el("div", "pc-pvmax pc-mods-host pc-edit-only");
    mrow.appendChild(el("span", "lbl", "Forcée"));
    var force = el("input", "force");
    force.type = "number"; force.step = "1";
    force.title = "Vide = calculée ; une valeur la force.";
    force.addEventListener("input", function () {
      var v = parseFloat(force.value);
      state.initiativeOverride = isFinite(v) ? clamp(Math.floor(v), -9999, 9999) : null;
      refresh();
    });
    hooks.push(function () {
      force.placeholder = String(initiativeAuto());
      if (document.activeElement !== force) {
        force.value = state.initiativeOverride === null ? "" : state.initiativeOverride;
      }
    });
    mrow.appendChild(force);
    mrow.appendChild(el("span", "lbl", "Modificateurs"));
    mrow.appendChild(multiMod(state.divers, "initiative"));
    mrow.appendChild(el("span", "sp"));
    b.appendChild(mrow);

    hooks.push(function () {
      val.textContent = String(initiative());
      var d = modSum(state.divers.initiative);
      val.classList.toggle("adj", state.initiativeOverride !== null || d !== 0);
    });
    return b;
  }

  // ---------- xp par champ ----------
  // Où le personnage a mis son xp : la caractéristique elle-même, les
  // compétences qu'elle commande et les spécialités qui en relèvent. Ce
  // partage-là est tranché par xpChamp(), pas ici — une compétence que
  // plusieurs caractéristiques plafonnent ne doit être comptée qu'une fois, et
  // ce n'est pas à l'affichage d'en décider. Les barres se comparent entre
  // elles (part du dépensé), pas au total disponible : c'est la répartition
  // qui intéresse.
  function buildXpChamps() {
    var b = block("XP par champ");
    // Huit lignes désormais, et non trois : les deux groupes des règles se
    // séparent d'une bande, sans quoi l'œil ne voit qu'une colonne de huit
    // barres. Le groupe se lit dans les données ; s'il manque, la bande ne
    // paraît pas plutôt que de porter un titre vide.
    var groupe = "";
    champs().forEach(function (c) {
      var g = caracInfo(c).groupe || "";
      if (g && g !== groupe) b.appendChild(el("div", "pc-comp-champ", capFirst(g)));
      groupe = g;

      var row = el("div", "pc-xpchamp");
      var chip = el("span", "pc-abbr", c);
      chip.title = caracInfo(c).nom;
      row.appendChild(chip);
      var m = el("span", "pc-meter");
      var v = el("b", null, "");
      m.appendChild(v);
      var bar = el("span", "bar");
      var fill = el("i");
      bar.appendChild(fill);
      m.appendChild(bar);
      var part = el("span", "pct", "");
      m.appendChild(part);
      row.appendChild(m);
      hooks.push(function () {
        var xp = xpChamp(c), tot = xpDepense();
        v.textContent = xp + " xp";
        var p = tot > 0 ? (xp / tot) * 100 : 0;
        fill.style.width = clamp(p, 0, 100) + "%";
        part.textContent = tot > 0 ? Math.round(p) + " %" : "—";
        // Le reste, c'est ce que xpChamp() a ramassé AUTOUR de la
        // caractéristique. Il s'arrondit au centième parce qu'un point de
        // spécialité coûte un quart d'xp : sans cela, l'infobulle affiche
        // 3.9999999999999996.
        var propre = caracXp(c);
        row.title = caracInfo(c).nom + " : " + propre + " xp de caractéristique, " +
                    (Math.round((xp - propre) * 100) / 100) +
                    " xp de compétences et de spécialités";
      });
      b.appendChild(row);
    });
    return b;
  }

  // ---------- les points de vie ----------
  // Ce qui relève du JEU reste toujours actif (la valeur courante, le retour au
  // maximum) : on perd des points de vie en pleine partie, pas en construisant
  // son personnage. Le rouage ne déverrouille que le maximum.

  // Le signe moins TYPOGRAPHIQUE (U+2212), comme dans sign() : à cette taille,
  // le trait d'union du clavier passe pour une césure, et un plancher de vie
  // n'a pas le droit d'être ambigu.
  function pvFmtNeg(n) { return n < 0 ? "−" + fmtP(-n) : fmtP(n); }

  // UNE SEULE BARRE, ET SON SENS DIT LE SIGNE. Verte, elle part de la GAUCHE et
  // montre ce qui reste ; rouge, elle part de la DROITE et montre ce qui a été
  // creusé sous zéro. Deux barres empilées obligeaient à chercher laquelle
  // bougeait avant de lire combien — et l'une des deux était toujours vide.
  //
  // ELLE PREND TOUTE LA LARGEUR, ET ELLE EST SEULE. Le chiffre qui la doublait
  // en bout de ligne disait exactement ce que le stepper dit déjà au-dessus :
  // deux fois la même valeur et le même maximum, dans le même bloc.
  //
  // Deux réglages se posent ici plutôt que dans la feuille : .pc-meter .bar est
  // figée à 84 px et les deux règles qui l'étirent nomment leur hôte, qui n'est
  // pas ce bloc-ci. Le passage en flex est ce qui permet à la barre rouge de
  // se coller à droite (marge automatique) sans une classe de plus.
  function pvJauge() {
    var m = el("span", "pc-meter");
    var bar = el("span", "bar");
    bar.style.flex = "1 1 100%";
    bar.style.width = "auto";
    bar.style.display = "flex";
    var f = el("i");
    bar.appendChild(f);
    m.appendChild(bar);
    return { el: m, fill: f };
  }
  // Une ligne d'état qui n'existe que lorsqu'elle a quelque chose à dire : le
  // texte vide l'efface, ses marges avec.
  function pvLigne(cls) {
    var d = el("div", cls);
    d.style.display = "none";
    return d;
  }
  function pvDit(ligne, texte) {
    ligne.textContent = texte || "";
    ligne.style.display = texte ? "" : "none";
  }

  // LA RÉSERVE : la valeur courante au stepper, son maximum, et sa barre.
  // infoMax dit ce que l'infobulle du maximum raconte et si le chiffre a été
  // retouché ; tout le reste est commun aux PV et à l'endurance, qui ont
  // exactement la même forme.
  function pvReserve(nom, lire, ecrire, maxi, plancher, infoMax) {
    var box = el("div");
    var row = el("div", "pc-kv");
    // PAS D'ÉTIQUETTE : le titre du bloc dit déjà « PV » ou « Endurance », et
    // le répéter en tête de la ligne juste dessous coûtait cinq lettres de
    // large dans une colonne qui n'en a pas de trop — au point que le bouton
    // « Max » passait à la ligne.
    var step = el("span", "pc-step");
    step.appendChild(stepBtn("−", null, function () { ecrire(lire() - 1); refresh(); }));
    var inp = el("input", "pc-num");
    inp.type = "number"; inp.step = "1";
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      // vide = « au maximum » : c'est ainsi que l'état dit qu'aucun point n'a
      // encore été perdu, et le maximum peut alors bouger sans traîner
      ecrire(isFinite(v) ? v : null);
      refresh();
    });
    hooks.push(function () { if (document.activeElement !== inp) inp.value = lire(); });
    step.appendChild(inp);
    step.appendChild(stepBtn("+", null, function () { ecrire(lire() + 1); refresh(); }));
    row.appendChild(step);
    var mx = el("span", "max", "");
    row.appendChild(mx);
    row.appendChild(el("span", "sp"));
    row.appendChild(miniBtn("Max", "Revenir au maximum", function () { ecrire(null); refresh(); }));
    box.appendChild(row);

    var j = pvJauge();
    box.appendChild(j.el);
    hooks.push(function () {
      var v = lire(), m = maxi(), p = plancher(), i = infoMax();
      mx.textContent = "/ " + fmtP(m);
      mx.classList.toggle("adj", !!i.adj);
      mx.title = i.titre;
      var neg = v < 0;
      j.fill.classList.toggle("over", neg);
      // la barre rouge se colle à droite : c'est la marge qui la pousse, la
      // barre étant passée en flex à sa construction
      j.fill.style.marginLeft = neg ? "auto" : "0";
      j.fill.style.width = clamp(neg ? (p < 0 ? v / p * 100 : 0)
                                     : (m > 0 ? v / m * 100 : 0), 0, 100) + "%";
      // la barre porte SON infobulle : c'est le seul endroit où le plancher
      // négatif se nomme, la ligne du dessus n'annonçant que le maximum
      j.el.title = nom + " " + pvFmtNeg(v) + " / " + pvFmtNeg(neg ? p : m);
    });
    return box;
  }

  // La ligne de construction d'un maximum : la valeur forcée (vide = calculée)
  // et les trois modificateurs. Les deux réserves ont la même.
  function pvForceRow(nom, champ, auto, cle, aide) {
    var row = el("div", "pc-pvmax pc-mods-host pc-edit-only");
    row.appendChild(el("span", "lbl", nom));
    var f = el("input", "force");
    f.type = "number"; f.step = "1"; f.min = "0";
    f.title = aide;
    f.addEventListener("input", function () {
      var v = parseFloat(f.value);
      state[champ] = isFinite(v) ? clamp(Math.floor(v), 0, 9999) : null;
      refresh();
    });
    hooks.push(function () {
      f.placeholder = String(auto());
      if (document.activeElement !== f) f.value = state[champ] === null ? "" : state[champ];
    });
    row.appendChild(f);
    row.appendChild(el("span", "lbl", "Modificateurs"));
    row.appendChild(multiMod(state.divers, cle));
    row.appendChild(el("span", "sp"));
    return row;
  }

  function buildPv() {
    var b = block("PV", null, "pv");
    b.appendChild(pvReserve("PV", pvCourant, function (v) { state.pv = v; },
                            pvMax, pvPlancher, function () {
      var d = modSum(state.divers.pvMax);
      return {
        adj: state.pvMaxOverride !== null || d !== 0,
        titre: state.pvMaxOverride !== null
          ? "Maximum forcé à " + state.pvMaxOverride + " (calculé : " + pvMaxAuto() + ")"
          : (d ? "Modificateurs " + sign(d) : "")
      };
    }));
    var mort = pvLigne("pc-warn");
    b.appendChild(mort);
    b.appendChild(pvForceRow("PV max", "pvMaxOverride", pvMaxAuto, "pvMax",
      "Vide = calculé ; une valeur le force."));
    // un ÉTAT du personnage, et rien d'autre : un fait sur lui, au même titre
    // que ses PV. La règle qui le produit n'a pas à être ici.
    hooks.push(function () { pvDit(mort, pvMort() ? "Mort" : ""); });
    return b;
  }
  // ---------- l'endurance ----------
  // SON PROPRE MODULE, et non une moitié du bloc des PV. Les deux réserves ont
  // la même forme, mais elles ne se lisent pas au même moment : les PV pendant
  // qu'on encaisse, l'endurance pendant qu'on décide de forcer. Séparées, elles
  // se déplacent l'une sans l'autre, et se coupent l'une sans l'autre.
  //
  // Tout son gréement est celui des PV (pvReserve, pvForceRow, pvLigne) : deux
  // réserves qui se ressemblent doivent se ressembler jusque dans le code, sans
  // quoi l'une finit corrigée et l'autre non.
  function buildEndurance() {
    var b = block("Endurance", null, "endurance");
    b.appendChild(pvReserve("Endurance", enduranceCourante,
                            function (v) { state.endurance = v; },
                            enduranceMax, endurancePlancher, function () {
      var d = modSum(state.divers.endurance);
      return {
        adj: state.enduranceMaxOverride !== null || d !== 0,
        titre: state.enduranceMaxOverride !== null
          ? "Maximum forcé à " + state.enduranceMaxOverride +
            " (calculé : " + enduranceMaxAuto() + ")"
          : (d ? "Modificateurs " + sign(d) : "")
      };
    }));
    var tapis = pvLigne("pc-warn");
    b.appendChild(tapis);
    b.appendChild(pvForceRow("Endurance max", "enduranceMaxOverride", enduranceMaxAuto,
                             "endurance", "Vide = calculé ; une valeur le force."));
    hooks.push(function () { pvDit(tapis, enduranceAuTapis() ? "Au tapis" : ""); });
    return b;
  }
  // ---------- la récupération ----------
  // MÊME FORME QUE L'INITIATIVE : une valeur qu'on relit, et un bouton qui en
  // fait quelque chose. L'initiative porte son chiffre au compteur de tours ;
  // la récupération rend ses points à la réserve. Ce n'est pas une tuile, parce
  // qu'une tuile ne fait rien — elle ne montre.
  function buildRecup() {
    var b = block("Récup / jour", null, "recup");
    // DEUX RÉSERVES, DEUX NOMBRES, UN SEUL GESTE. Une journée rend des points
    // de vie ET de l'endurance : les deux se lisent côte à côte, et le bouton
    // les rend ensemble — on ne se repose pas à moitié.
    var row = el("div", "pc-kv");
    var val = el("span", "pc-cval");
    val.title = "Points de vie regagnés par jour";
    row.appendChild(val);
    var valE = el("span", "pc-cval");
    valE.title = "Endurance regagnée par jour";
    row.appendChild(valE);
    row.appendChild(el("span", "sp"));
    row.appendChild(miniBtn("Récupérer", "Rendre au personnage ses points de vie et son endurance du jour",
                            function () {
      // on ne dépasse jamais le maximum : une journée de repos ne fabrique ni
      // points de vie ni endurance en trop
      var n = recupJour(), nE = recupEnduranceJour();
      var pAv = pvCourant(), pAp = n > 0 ? Math.min(pvMax(), pAv + n) : pAv;
      var eAv = enduranceCourante(), eAp = nE > 0 ? Math.min(enduranceMax(), eAv + nE) : eAv;
      if (pAp === pAv && eAp === eAv) { flash("Rien à récupérer."); return; }
      state.pv = pAp;
      state.endurance = eAp;
      refresh();
      var dit = [];
      if (pAp !== pAv) dit.push("PV " + fmtP(pAv) + " → " + fmtP(pAp));
      if (eAp !== eAv) dit.push("endurance " + fmtP(eAv) + " → " + fmtP(eAp));
      flash(dit.join(" · "));
    }));
    b.appendChild(row);

    // construction : valeur forcée (vide = calculée) + modificateurs, comme les
    // maximums de réserve
    var mrow = el("div", "pc-pvmax pc-mods-host pc-edit-only");
    mrow.appendChild(el("span", "lbl", "Forcée"));
    var force = el("input", "force");
    force.type = "number"; force.step = "1"; force.min = "0";
    force.title = "Vide = calculée ; une valeur la force.";
    force.addEventListener("input", function () {
      var v = parseFloat(force.value);
      state.recupOverride = isFinite(v) ? clamp(Math.floor(v), 0, 9999) : null;
      refresh();
    });
    hooks.push(function () {
      force.placeholder = String(recupJourAuto());
      if (document.activeElement !== force) {
        force.value = state.recupOverride === null ? "" : state.recupOverride;
      }
    });
    mrow.appendChild(force);
    mrow.appendChild(el("span", "lbl", "Modificateurs"));
    mrow.appendChild(multiMod(state.divers, "recup"));
    mrow.appendChild(el("span", "sp"));
    b.appendChild(mrow);

    hooks.push(function () {
      var d = modSum(state.divers.recup);
      val.textContent = String(recupJour());
      valE.textContent = String(recupEnduranceJour());
      val.classList.toggle("adj", state.recupOverride !== null || d !== 0);
      val.title = state.recupOverride !== null
        ? "Récupération forcée (calculée : " + recupJourAuto() + ")"
        : (d ? "Modificateurs " + sign(d) : "");
    });
    return b;
  }
  // ---------- la ligne d'une compétence ----------
  // MÊME CHARPENTE QU'UNE CARACTÉRISTIQUE (.pc-crow), et ce n'est pas une
  // économie de style : depuis que les stades ont disparu, les deux lignes
  // portent exactement les mêmes choses — un nombre qu'on achète, le MOD qui
  // s'y ajoute, la limite qui coiffe le jet, et le bloc lui-même comme bouton.
  // Deux charpentes pour un même contenu auraient fini par diverger d'un pixel,
  // puis d'une infobulle.
  //
  // opts : { reg } — le registre de rafraîchissement où la ligne s'inscrit,
  // celui du module qui la bâtit. Une ligne détruite emporte ses fonctions ;
  // laissées dans le registre du voisin, elles rafraîchiraient un élément qui
  // n'est plus dans la page. Par défaut : celui des lignes de compétences.
  function compRow(item, odd, opts) {
    opts = opts || {};
    var reg = opts.reg || compHooks;
    // Un appelant peut ne nommer sa ligne que par une clé (ctx.ligneComp d'un
    // mod) : ce sont les SIGLES que les calculs attendent, et allComps() les
    // donne dans « code ».
    var code = item.code || item.key;
    // La caractéristique par DÉFAUT : celle qui donne le MOD et la LIM du jet.
    // Le joueur peut en demander une autre au moment de lancer (réglage « Au
    // choix » de la barre d'envoi) ; c'est doJet qui le lui propose, pas la ligne.
    //
    // ELLE SE LIT VIVANTE, jamais figée au montage : l'onglet « Carac. » des
    // Options la change pour ce personnage, et rien ne rebâtit les lignes de
    // compétence — elles continuaient d'afficher le MOD et la LIM de l'ancienne
    // et de lancer sous elle, pendant que le bloc des Options montrait déjà la
    // nouvelle. Un appelant qui NOMME sa caractéristique (un mod) garde la
    // sienne : c'est un choix, pas un défaut.
    function carac() { return item.carac || compCarac(code); }
    var row = el("div", "pc-crow" + (odd ? " odd" : ""));

    var top = el("div", "pc-crow-top");
    var chip = el("span", "pc-abbr", code);
    chip.title = item.name;
    top.appendChild(chip);
    top.appendChild(el("span", "sp"));

    // LE TRIO EST LE BOUTON DE JET, d'un seul tenant : le total qui part au dé,
    // la limite qui le coiffe, le bonus qui s'y ajoute après. Aucun ne veut
    // rien dire sans les deux autres.
    var trio = el("span", "pc-trio pc-rollable");
    // TROIS CASES, ET CHACUNE DIT DEUX CHOSES : ce qu'on lit en jouant, ce
    // qu'on règle en construisant. Les deux valeurs sont écrites à chaque
    // rafraîchissement ; c'est la feuille qui n'en montre qu'une, selon l'état
    // du rouage.
    //
    // LES DEUX SAISIES SONT DANS LEUR PROPRE CASE. Le rang de construction qui
    // portait leurs ± sous la ligne a disparu avec : la ligne garde la même
    // hauteur, rouage ouvert ou fermé, et la même qu'une spécialité.
    var vVal = caseSaisie(trio,        // total au dé  /  points achetés
      function () { return state.comps[code] || 0; },
      function (v) {
        // le plafond ne bloque que les HAUSSES : des points investis avant
        // qu'un malus ne rabaisse la caractéristique redescendent pas à pas au
        // lieu d'être rognés d'un seul clic, ce qui rendrait l'xp introuvable
        // ET IL NE BLOQUE PLUS RIEN DÈS QU'UN LEVIER DE VALEUR S'INTERPOSE :
        // la coiffe tombe sur le RÉSULTAT de la chaîne, pas sur ce qu'on tape.
        var plaf = compPlafond(code);
        var n = Math.round(v);
        if (!levierRegleDe(lireComp("valeur", code))) {
          var haut = Math.max(plaf, state.comps[code] || 0);
          if (n > haut) { flash("Plafond de " + plaf + "."); n = haut; }
        }
        n = Math.max(0, n);
        // zéro n'est pas une donnée : une clé absente vaut zéro partout
        // (accesseurs, attributs Roll20), et l'état voyage d'autant plus léger
        if (n) state.comps[code] = n; else delete state.comps[code];
      }, "Points achetés", reg);
    var cLim = caseDouble(trio);       // limite du jet /  maximum qu'on peut mettre
    var vBon = caseSaisie(trio,        // le bonus, lu en jouant, réglé en construisant
      function () { return state.compsBonus[code] || 0; },
      function (v) {
        var n = clamp(Math.round(v), -999, 999);
        if (n) state.compsBonus[code] = n; else delete state.compsBonus[code];
      }, "Bonus de la compétence", reg);
    // rouage ouvert, on construit : le bloc ne lance pas (voir specialites.js)
    trio.addEventListener("click", function () {
      if (isEdit("comps")) return;
      doJet(code, carac(), code, null);
    });
    top.appendChild(trio);
    row.appendChild(top);

    // L'XP N'EST PLUS ÉCRITE SUR LA LIGNE. Elle prenait un rang entier sous les
    // nombres, uniquement en édition — donc une ligne qui changeait de hauteur
    // au clic du rouage. Ce qu'une compétence coûte se lit dans le total de
    // l'en-tête, qui avertit dès qu'il est dépassé.

    reg.push(function () {
      var base = state.comps[code] || 0;
      var plaf = compPlafond(code);
      var vBrut = compValeurBrut(code);
      // LE PLAFOND MORD SUR CE QUE LE LEVIER A PRODUIT, et non sur ce qui a été
      // acheté : « même modifiée, la valeur ne dépasse pas le plafond ».
      var mord = vBrut > plaf;
      // LE LEVIER SE LIT PAR SON RÉSULTAT, et non par une de ses neuf cases :
      // un facteur ou un ajout de fin décalent la valeur sans toucher à celle
      // qu'on lisait ici, et la pastille « retouché » restait éteinte.
      var d = vBrut - base;
      var force = lireComp("valeur", code)("force") !== undefined;
      // le malus d'endurance pèse sur TOUS les jets : il est déjà dans le
      // bonus, il n'est nommé ici que pour qu'on sache d'où vient l'écart
      var mal = enduranceMalus();
      var c = carac();
      var b = jetBonus(c, code, null);
      // LE TOTAL EST CELUI QUI PART AU DÉ, bonus EXCLU : le bonus a sa propre
      // case, et l'additionner ici le compterait deux fois. C'est la même
      // lecture que sur une spécialité — total, limite, bonus.
      // LE BONUS AFFICHÉ EST CELUI QUE SA CHAÎNE REND — le même que celui que
      // compPts a mis dedans, sans quoi la soustraction ci-dessous ne rendrait
      // ni le total du dé ni le total hors bonus.
      var bon = compBonus(code);
      var db = bon - compBonusSocle(code);
      vVal.txt.textContent = String(caracMod(c) + compPts(code) - bon);
      cLim[0].textContent = String(compLim(code, c));
      cLim[1].textContent = String(plaf);
      cLim[1].classList.toggle("adj", mord);
      vBon.txt.textContent = sign(bon);
      trio.classList.toggle("adj", force || d !== 0 || db !== 0 || mord || mal !== 0);
      trio.title = (force
                     ? "Points forcés à " + vBrut + " (Options)"
                     : "Points " + base +
                       (d ? " · modificateur (Options) " + sign(d) : "")) +
                   // LE PLAFOND SE DIT MÊME SUR UN FORÇAGE : il le rogne aussi,
                   // désormais, et taire la coiffe ferait disparaître des points
                   // sans un mot.
                   (mord ? ", plafonnés à " + plaf : "") +
                   (db ? " · bonus décalé de " + sign(db) + " (Options)" : "") +
                   (mal ? " · endurance " + sign(-mal) : "") +
                   " — clic : lancer " + deNu(deTest()) + " " + sign(b) +
                   ", plafonné à " + compLim(code, c);
    });
    return row;
  }
  var compBox = null;
  // LE FILTRE EST CELUI DES SPÉCIALITÉS, et de nulle part ailleurs. Les huit
  // compétences sont toujours toutes là et tiennent à l'écran : les filtrer ne
  // cache rien qu'on cherchait. Les spécialités, elles, sont une liste ouverte
  // que le joueur remplit lui-même — c'est la seule de la fiche qui puisse
  // devenir assez longue pour qu'on s'y perde.
  //
  // Réglage de VUE : il survit au remontage de la fiche, et ne voyage pas avec
  // le personnage.
  var speFilter = "";
  // DEUX SÉLECTEURS EN PLUS DU TEXTE : la caractéristique et la compétence dont
  // une spécialité relève. Ce sont les deux seules choses qu'une spécialité
  // porte en plus de son nom, et chercher « toutes celles qui tiennent de DEX »
  // ne se fait pas en tapant des lettres.
  var speFiltreCarac = "";
  var speFiltreComp = "";
  // Les filtres se coupent depuis l'onglet Options. Coupé, un filtre DISPARAÎT
  // et cesse d'agir : un filtre invisible qui masque encore des lignes est un
  // piège. Réglages d'AFFICHAGE, donc dans le vrai localStorage du navigateur,
  // jamais dans le personnage.
  var FILTRES = { texte: "mia-filtre-texte",
                  carac: "mia-filtre-carac",
                  comp: "mia-filtre-comp" };
  function filtreTexteOn() { return lpref(FILTRES.texte, "1") !== "0"; }
  function filtreCaracOn() { return lpref(FILTRES.carac, "1") !== "0"; }
  function filtreCompOn() { return lpref(FILTRES.comp, "1") !== "0"; }
  // champ de filtre d'un module ; rend null quand le réglage le coupe, et le
  // texte est alors ignoré par les listes (voir filtreDe)
  function champFiltre(get, set, placeholder, onChange) {
    if (!filtreTexteOn()) return null;
    var s = el("input", "pc-comp-search");
    s.type = "search";
    s.placeholder = placeholder || "Filtrer…";
    s.value = get();   // le filtre survit au remontage : le champ doit le montrer
    s.addEventListener("input", function () { set(s.value); onChange(); });
    return s;
  }
  function filtreDe(v) { return filtreTexteOn() ? String(v || "").trim().toLowerCase() : ""; }
  // Un sélecteur de filtre : rend null quand le réglage le coupe, comme le champ
  // de texte. La première réponse est le VIDE — « toutes » —, et elle porte le
  // nom de la colonne pour qu'on sache ce qu'on choisit sans avoir à déplier.
  function selFiltre(codes, mot, titres, get, set, onChange) {
    var s = el("select", "pc-select pc-comp-filtre");
    var tout = el("option", null, mot);
    tout.value = "";
    s.appendChild(tout);
    codes.forEach(function (c) {
      var o = el("option", null, c);
      o.value = c;
      o.title = (titres && titres[c]) || c;
      s.appendChild(o);
    });
    s.value = get();   // le filtre survit au remontage : le sélecteur doit le montrer
    s.addEventListener("change", function () { set(s.value); onChange(); });
    return s;
  }
  // Ce que les trois filtres laissent passer, une fois les coupés ignorés.
  function filtreSpes(items) {
    var flt = filtreDe(speFilter);
    var fc = filtreCaracOn() ? speFiltreCarac : "";
    var fk = filtreCompOn() ? speFiltreComp : "";
    if (flt) items = items.filter(function (it) {
      return it.name.toLowerCase().indexOf(flt) >= 0;
    });
    if (fc) items = items.filter(function (it) { return it.carac === fc; });
    if (fk) items = items.filter(function (it) { return it.comp === fk; });
    return items;
  }
  // ---------- onglet Fiche : les compétences ----------
  // HUIT compétences, celles des règles, dans l'ordre de la page. Ni filtre ni
  // puce : on ne filtre pas huit lignes qui tiennent à l'écran et qu'on connaît
  // par cœur, et « investies » ne trie rien puisqu'elles sont toutes là, tout
  // le temps. Ce qui se filtre, ce sont les SPÉCIALITÉS, dont la liste est
  // ouverte et n'appartient qu'au joueur — c'est leur module qui porte l'outil.
  function rebuildComps() {
    if (!compBox) return;
    compHooks = [];   // les lignes vont être détruites : leurs fonctions avec
    compBox.innerHTML = "";
    var items = allComps();
    // Aucun tri : l'ordre des règles est celui où le joueur lit ses compétences
    // dans son livre, et le même que dans le bloc des Options.
    if (!items.length) compBox.appendChild(el("div", "pc-empty", "—"));
    else items.forEach(function (it, i) { compBox.appendChild(compRow(it, i % 2 === 1)); });
    refresh();
  }
  function buildComps() {
    // jeu : le total, la limite et le bonus ; édition : les mêmes cases, deux
    // d'entre elles ouvertes à la saisie
    var b = block("Compétences", null, "comps");
    // l'entête des trois colonnes, du même squelette que le trio des lignes :
    // c'est ce qui garantit que chaque mot tombe en face de sa colonne
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "sp"));
    var teteTrio = el("span", "pc-trio tete");
    // « CARAC » ET NON « MOD » : dans une compétence, ce nombre n'est pas SON
    // modificateur, c'est celui de la caractéristique dont elle relève. Le mot
    // dit donc d'où il vient. (Sur une caractéristique, « MOD » reste juste :
    // c'est le sien.)
    // DEUX DES TROIS COLONNES CHANGENT DE SENS SOUS LE ROUAGE. En jouant on
    // lit ce que la compétence DONNE — son total au dé, la limite qui le
    // coiffe ; en construisant, ce qu'on y a MIS et ce qu'on peut y mettre.
    // Deux mots dans la même case, dont un seul s'affiche.
    [["Total", "Valeur"], ["Limite", "Maximum"], "Bonus"].forEach(function (k) {
      var c = el("span", "c");
      if (typeof k === "string") c.appendChild(el("span", "k", k));
      else {
        c.appendChild(el("span", "k pc-jeu-only", k[0]));
        c.appendChild(el("span", "k pc-edit-only", k[1]));
      }
      teteTrio.appendChild(c);
    });
    tete.appendChild(teteTrio);
    b.appendChild(tete);
    compBox = el("div");
    b.appendChild(compBox);
    rebuildComps();
    return b;
  }
  // ---------- les langues ----------
  // UNE LANGUE EST UNE SPÉCIALITÉ « PASSIVE », et le mot dit exactement ce qui
  // la sépare des autres : ON N'AJOUTE PAS LE MODIFICATEUR de sa
  // caractéristique. Une spécialité ordinaire vaut ses points PLUS le MOD de sa
  // caractéristique PLUS les points de sa compétence ; une langue ne vaut que
  // ses points. Elle ne se lance pas contre une difficulté, elle se possède.
  //
  // ELLE RELÈVE DE MEN, ET DE RIEN D'AUTRE : aucune compétence. Mais elle
  // RESPECTE LA LIMITE de MEN — c'est le seul emprunt qu'elle lui fait, et il
  // suffit à la borner.
  //
  // TROIS NIVEAUX, LUS SUR LE TOTAL. Ce ne sont pas trois cases à cocher : le
  // niveau se DÉDUIT de ce qu'on a mis dedans, comme le MOD se déduit d'une
  // valeur. On ne le règle donc nulle part.
  function buildLangues() {
    var b = block("Langues", null, "langues");

    // l'entête des trois colonnes, du même squelette que le trio des lignes :
    // c'est ce qui garantit que chaque mot tombe en face de sa colonne
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "sp"));
    var teteTrio = el("span", "pc-trio tete");
    // LA PREMIÈRE CASE CHANGE DE SENS SOUS LE ROUAGE, comme celle d'une
    // compétence : en jouant on lit ce que la langue VAUT, en construisant ce
    // qu'on y a MIS. Les deux ne diffèrent que si la limite mord.
    [["Total", "Points"], "Limite", "Niveau"].forEach(function (k) {
      var c = el("span", "c");
      if (typeof k === "string") c.appendChild(el("span", "k", k));
      else {
        c.appendChild(el("span", "k pc-jeu-only", k[0]));
        c.appendChild(el("span", "k pc-edit-only", k[1]));
      }
      teteTrio.appendChild(c);
    });
    tete.appendChild(teteTrio);
    b.appendChild(tete);

    // LA BOÎTE EST APPENDUE UNE FOIS, hors de rendu() : c'est son contenu qui
    // se refait, jamais elle.
    var box = el("div");
    b.appendChild(box);

    // LE REGISTRE DES LIGNES, et le détour obligatoire : pousser directement
    // dans « hooks » empilerait à jamais les fonctions des lignes détruites,
    // chacune tenant une langue que l'état ne porte plus.
    var lignes = [];
    hooks.push(function () {
      for (var i = 0; i < lignes.length; i++) lignes[i]();
    });

    function ligne(it, odd) {
      // la langue VIVANTE, jamais capturée : la liste bouge sous la ligne
      var l = it.langue;
      var row = el("div", "pc-crow" + (odd ? " odd" : ""));
      var top = el("div", "pc-crow-top");

      // LA CROIX D'ABORD, TOUT À GAUCHE : c'est le geste qu'on cherche des yeux
      // quand on veut retirer une ligne. Un point d'arrêt de plus la protège —
      // des points sont de l'xp dépensé.
      top.appendChild(miniBtn("✕", "Retirer cette langue", function () {
        if (l.pts) {
          // la modale de la fiche, jamais confirm() natif : celui-là est MUET
          // dans l'iframe Roll20 et le retrait y serait annulé en silence
          confirmer("Retirer « " + (l.nom || "sans nom") + " »",
                    "Ses " + l.pts + " points partent avec.",
                    "Retirer", function () { retire(it.index); });
          return;
        }
        retire(it.index);
      }, "danger pc-croix pc-edit-only"));

      var nom = el("input", "nm pc-edit-field");
      nom.type = "text";
      nom.placeholder = "Nom de la langue";
      nom.value = l.nom || "";
      // UN NOM S'ENREGISTRE SANS RAFRAÎCHIR : rien ne se calcule à partir de
      // lui, et refresh() reconstruirait la liste sous les doigts.
      nom.addEventListener("input", function () { l.nom = nom.value; save(); });
      top.appendChild(nom);
      top.appendChild(el("span", "sp"));

      var trio = el("span", "pc-trio");
      var vTot = caseSaisie(trio,
        function () { return l.pts || 0; },
        function (v) {
          var n = Math.max(0, Math.round(v));
          // zéro n'est pas une donnée : une langue sans point reste dans la
          // liste, elle ne vaut simplement rien
          l.pts = n;
        }, "Points mis dans cette langue", lignes);
      var vLim = caseTexte(trio);
      var vNiv = caseTexte(trio);
      top.appendChild(trio);
      row.appendChild(top);

      lignes.push(function () {
        var c = langueCarac();
        var brut = l.pts || 0;
        var tot = langueTotal(l);
        var niv = langueNiveau(l);
        var mord = brut > tot;
        vTot.txt.textContent = String(tot);
        vTot.txt.classList.toggle("adj", mord);
        vLim.textContent = String(caracLim(c));
        // LE NIVEAU EST UN RANG, PAS UN NOMBRE À LIRE : un tiret dit mieux
        // « pas encore » qu'un zéro, qui se lirait comme un niveau.
        vNiv.textContent = niv ? String(niv) : "—";
        vNiv.classList.toggle("adj", niv > 0);
        var seuils = langueSeuils();
        var prochain = seuils[niv];   // undefined au dernier niveau
        trio.title = "Points " + brut +
                     (mord ? ", ramenés à " + tot + " par la limite de " + c : "") +
                     " · niveau " + (niv || "aucun") +
                     (prochain ? " · niveau " + (niv + 1) + " à " + prochain : "") +
                     " — une langue n'ajoute pas le " + c + " au total.";
        // LE NOM SE COUPE DANS UN QUART DE COLONNE : « Chuchotement » y tient
        // en « Chucho… ». L'infobulle le rend entier, faute de place.
        nom.title = l.nom || "";
        if (document.activeElement !== nom) nom.value = l.nom || "";
      });
      return row;
    }

    function retire(i) {
      state.langues.splice(i, 1);
      rendu();
      refresh();
    }

    function rendu() {
      box.innerHTML = "";
      // les fonctions des lignes effacées n'ont plus rien à rafraîchir ; le
      // tableau est vidé SUR PLACE, celui du registre étant le même objet
      lignes.length = 0;
      var items = allLangues();
      if (!items.length) box.appendChild(el("div", "pc-empty", "—"));
      else items.forEach(function (it, i) { box.appendChild(ligne(it, i % 2 === 1)); });
      box.appendChild(miniBtn("+ Ajouter une langue", null, function () {
        state.langues.push(blankLangue());
        rendu();
        refresh();
      }, "pc-edit-only"));
      // les lignes qui viennent de naître doivent obéir au verrou du bloc :
      // rien ne le leur dirait avant le prochain rafraîchissement
      applyEdit(b, "langues");
      // ET ELLES DOIVENT ÊTRE REMPLIES : une ligne naît vide, ses nombres ne
      // s'écrivant que dans les fonctions poussées au registre — et ce registre
      // n'est joué que par refresh(). Rejouer ICI, jamais chez l'appelant.
      for (var i = 0; i < lignes.length; i++) {
        try { lignes[i](); } catch (e) { /* la muselière juge à la passe suivante */ }
      }
    }

    rendu();
    return b;
  }
  // ---------- onglet Fiche : les spécialités ----------
  // C'est la SEULE liste de la fiche que le joueur écrit entièrement. Les
  // règles disent ce qu'est une spécialité, ce qu'elle coûte et ce qui la
  // coûte ; elles ne disent pas lesquelles existent. Le module ne propose
  // donc aucun catalogue : un nom libre, et deux sigles pour dire de quoi elle
  // relève.
  //
  // Les deux sélecteurs ne sont pas de l'ornement. La caractéristique donne le
  // MOD et la LIMITE du jet ; la compétence ajoute ses points au total.
  // Tant qu'ils sont vides, la ligne ne vaut rien, et elle le MONTRE — un
  // « — · — » à la place des sigles — plutôt que d'afficher un zéro qu'on
  // prendrait pour un calcul.
  function buildSpecialites() {
    // jeu : les points, la limite et le jet ; édition : le nom, les deux
    // sigles, les ± et le retrait
    var b = block("Spécialités", null, "specialites");
    var box = el("div");
    // LE FILTRE VIT ICI. C'est la seule liste ouverte de la fiche : le joueur
    // la remplit lui-même, et elle est la seule à pouvoir devenir assez longue
    // pour qu'on s'y perde. rendu() est passée en avant-déclaration parce que
    // la case doit pouvoir la rappeler à chaque frappe.
    var tools = el("div", "pc-comp-tools");
    var line = el("div", "row");
    var search = champFiltre(function () { return speFilter; },
                             function (v) { speFilter = v; }, null,
                             function () { rendu(); });
    if (search) line.appendChild(search);
    // LES DEUX SÉLECTEURS, chacun coupable à part depuis les Options. Leurs
    // libellés nomment la colonne — « Carac. », « Comp. » — parce qu'une liste
    // repliée sur « — » ne dirait pas sur quoi elle porte.
    var noms = {}, nomsK = {};
    champs().forEach(function (c) { noms[c] = caracInfo(c).nom; });
    champsComp().forEach(function (k) { nomsK[k] = compInfo(k).nom; });
    if (filtreCaracOn()) {
      line.appendChild(selFiltre(champs(), "Carac.", noms,
        function () { return speFiltreCarac; },
        function (v) { speFiltreCarac = v; }, function () { rendu(); }));
    }
    if (filtreCompOn()) {
      line.appendChild(selFiltre(champsComp(), "Comp.", nomsK,
        function () { return speFiltreComp; },
        function (v) { speFiltreComp = v; }, function () { rendu(); }));
    }
    tools.appendChild(line);
    if (line.children.length) b.appendChild(tools);
    // l'entête des cinq colonnes, du même squelette que le quintuple des
    // lignes : c'est ce qui garantit que chaque mot tombe en face de sa colonne
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "sp"));
    // EN JOUANT, TROIS NOMBRES ; SOUS LE ROUAGE, CINQ. Ce qu'on lit en jouant,
    // c'est ce que la spécialité VAUT (total), ce qui la coiffe (limite) et ce
    // qu'on lui a posé (bonus). Ses points propres n'intéressent qu'au moment
    // de les acheter, et n'apparaissent qu'alors.
    // LE MOT ENTIER DANS LES TROIS LISTES : « LIMITE » et non « LIM »,
    // « VALEUR » et non « VAL ». L'entête ne paraît qu'une fois par bloc et la
    // place y est ; ce sont les NOMBRES qui doivent être serrés, pas les mots
    // qui disent lesquels. Seuls « CARAC » et « COMP » restent abrégés — les
    // écrire en entier demanderait deux fois la largeur d'une case.
    function teteBloc(cls, mots) {
      var t = el("span", "pc-trio " + cls + " tete");
      mots.forEach(function (k) {
        var edit = typeof k !== "string";
        var c = el("span", "c" + (edit ? " pc-edit-only" : ""));
        c.appendChild(el("span", "k", edit ? k[0] : k));
        t.appendChild(c);
      });
      tete.appendChild(t);
    }
    teteBloc("deux", ["Carac", "Comp"]);
    teteBloc("cinq", [["Valeur"], "Total", "Limite", "Bonus"]);
    b.appendChild(tete);
    b.appendChild(box);
    // Les lignes sont détruites et refaites à chaque ajout ou retrait ; le
    // registre du module, lui, survit au geste. UNE SEULE fonction y entre, qui
    // rappelle celles des lignes du moment : sans ce détour, les
    // rafraîchissements des lignes effacées s'y empileraient, chacun tenant une
    // spécialité que l'état ne porte plus.
    var lignes = [];
    hooks.push(function () {
      for (var i = 0; i < lignes.length; i++) lignes[i]();
    });

    // LE RANGEMENT AU GLISSER-DÉPOSER. C'est la seule liste de la fiche dont
    // l'ORDRE appartient au joueur : les caractéristiques et les compétences
    // suivent celui des règles, les spécialités suivent celui qu'il leur donne.
    // Glisser-déposer natif du navigateur, comme le plan des modules : aucune
    // bibliothèque, et ça marche tel quel dans l'iframe Roll20.
    // « pris » porte l'index dans l'ÉTAT, jamais le rang à l'écran : la liste
    // peut être filtrée, et un rang d'écran ne dirait alors pas où ranger.
    var pris = null;
    function eteintDepot() {
      var l = box.querySelectorAll(".pc-crow");
      for (var i = 0; i < l.length; i++) {
        l[i].classList.remove("avant");
        l[i].classList.remove("apres");
      }
    }

    // LE SIGLE SE CHOISIT DANS SA PROPRE CASE. Il n'y a plus de ligne « Carac »
    // ni de ligne « Compétence » sous le rouage : la case qui MONTRE le sigle
    // est celle qui le CHANGE, et deux lignes de moins rendent le bloc lisible.
    // LE SIGLE EST LA VALEUR : c'est lui que l'état garde et que les calculs
    // lisent. Le nom entier ne s'écrit pas dans la liste — il tiendrait mal
    // dans une case, et le sigle suffit — mais il reste en infobulle de chaque
    // choix. La liste vient des règles : une caractéristique renommée arrive
    // ici sans qu'on rouvre ce fichier.
    function caseSigle(hote, codes, nomDe, lire, ecrire) {
      var c = el("span", "c reglable");
      var s = el("select", "v pc-case-champ pc-edit-field");
      var neant = el("option", null, "—");
      neant.value = "";
      s.appendChild(neant);
      codes.forEach(function (code) {
        var o = el("option", null, code);
        o.value = code;
        o.title = nomDe(code);
        s.appendChild(o);
      });
      s.addEventListener("change", function () { ecrire(s.value); refresh(); });
      c.appendChild(s);
      hote.appendChild(c);
      return s;
    }
    // Un nombre qui se saisit dans sa case. Le champ ne se réécrit JAMAIS sous
    // les doigts : tant qu'il a le focus, ce qu'on tape reste tel quel.
    function caseNombre(hote, lire, ecrire, aide, cls) {
      var c = el("span", "c reglable" + (cls ? " " + cls : ""));
      // EN JOUANT, UN TEXTE ; EN CONSTRUISANT, UN CHAMP. Un champ de type
      // nombre ne sait pas écrire « +25 » et porte des compteurs que Roll20
      // n'a nulle part : la lecture garde donc sa mise en forme, et seule
      // l'édition montre le champ.
      var t = el("span", "v pc-jeu-only", "");
      var i = el("input", "v pc-edit-only pc-case-champ pc-edit-field");
      i.type = "number"; i.step = "1";
      i.title = aide;
      i.addEventListener("input", function () {
        var v = parseInt(i.value, 10);
        if (isFinite(v)) { ecrire(v); refresh(); }
      });
      c.appendChild(t);
      c.appendChild(i);
      hote.appendChild(c);
      return { txt: t, champ: i };
    }

    function ligne(it) {
      // la spécialité VIVANTE, et non l'objet capturé au montage : la liste
      // peut avoir bougé sous la ligne entre deux rendus
      var spe = it.spe;
      var row = el("div", "pc-crow");

      var top = el("div", "pc-crow-top");
      // LA CROIX D'ABORD, TOUT À GAUCHE : c'est le geste qu'on cherche des yeux
      // quand on veut retirer une ligne, et il n'a pas à se chercher au bout.
      // Un point d'arrêt de plus le protège : des points sont de l'xp dépensé.
      top.appendChild(miniBtn("✕", "Retirer cette spécialité", function () {
        if (spe.pts &&
            !confirm("Retirer « " + (spe.nom || "sans nom") + " » et ses " + spe.pts + " points ?")) return;
        state.specialites.splice(it.index, 1);
        rendu();
        refresh();
        if (optSpesRebuild) optSpesRebuild();   // sa ligne quitte aussi le bloc des Options
      }, "danger pc-croix pc-edit-only"));
      // LA POIGNÉE. Elle seule se glisse — pas la ligne entière : le nom est un
      // champ de saisie, et une ligne « draggable » interdirait d'y sélectionner
      // un mot à la souris.
      var poignee = el("span", "pc-poignee pc-edit-only");
      poignee.title = "Glisser pour ranger cette spécialité";
      poignee.draggable = true;
      poignee.addEventListener("dragstart", function (ev) {
        pris = it.index;
        row.classList.add("pris");
        try {
          ev.dataTransfer.effectAllowed = "move";
          // Firefox refuse de commencer un glissement sans donnée posée
          ev.dataTransfer.setData("text/plain", String(it.index));
          if (ev.dataTransfer.setDragImage) ev.dataTransfer.setDragImage(row, 16, 12);
        } catch (e) {}
      });
      poignee.addEventListener("dragend", function () {
        pris = null;
        row.classList.remove("pris");
        eteintDepot();
      });
      top.appendChild(poignee);
      // AUCUN SIGLE À GAUCHE. Le couple « caractéristique · compétence » y
      // tenait la place qu'un sigle occupe sur une caractéristique — mais ici
      // il ne nommait pas la ligne, il répétait ce que les colonnes MOD et
      // COMP chiffrent déjà. Le nom de la spécialité commence donc la ligne.
      // Quelles caractéristique et compétence elle tient se règle sous le
      // rouage, et se relit dans l'infobulle du bloc de nombres.
      // LE NOM COMPTE POUR LES CALCULS : trois formules des règles vont
      // chercher une spécialité par son nom. Il se saisit donc tel quel, sans
      // capitale forcée ni correction, et l'infobulle dit lesquels sont lus.
      var nom = el("input", "nm pc-edit-field");
      nom.type = "text";
      nom.placeholder = "Nom de la spécialité";
      nom.value = spe.nom || "";
      nom.addEventListener("input", function () { spe.nom = nom.value; refresh(); });
      top.appendChild(nom);
      // LE COUPLE DES SIGLES, dans la même case que les nombres qui suivent.
      // Il dit de quoi la spécialité relève, et sous le rouage c'est LUI qui le
      // règle : chaque case est son propre sélecteur.
      var paire = el("span", "pc-trio deux");
      var selCar = caseSigle(paire, champs(), function (c) { return caracInfo(c).nom; },
                             function () { return spe.carac; },
                             function (v) { spe.carac = v; });
      var selCmp = caseSigle(paire, champsComp(), function (c) { return compInfo(c).nom; },
                             function () { return spe.comp; },
                             function (v) { spe.comp = v; });
      top.appendChild(paire);

      // LES CINQ NOMBRES D'UN SEUL TENANT, et c'est le bloc ENTIER qui lance.
      // Une spécialité en demande deux de plus qu'une compétence, et les deux se
      // méritent : ses propres points ne font pas seuls le jet — le MOD de sa
      // caractéristique et les points de sa compétence y entrent aussi, et ce
      // sont eux qui disent d'où elle tient.
      var quint = el("span", "pc-trio cinq pc-rollable");
      function case5(cls) {
        var c = el("span", "c" + (cls ? " " + cls : ""));
        var v = el("span", "v", "");
        c.appendChild(v);
        quint.appendChild(c);
        return v;
      }
      // LES POINTS SE SAISISSENT DANS LEUR CASE, ET RIEN NE LES BORNE : une
      // spécialité n'a plus de plafond. Le garde-fou de l'en-tête avertit,
      // en jaune, quand le total approche de la limite — il n'interdit rien.
      var vPts = caseNombre(quint,
        function () { return spe.pts || 0; },
        function (v) { spe.pts = Math.max(0, Math.round(v)); },
        "Points de la spécialité", "pc-edit-only");
      var vTot = case5();
      var vLim = case5();
      // LE BONUS aussi : une valeur EN PLUS, qui part de zéro, que rien ne
      // déduit — et qui se saisit donc là où elle se lit.
      var vBon = caseNombre(quint,
        function () { return spe.bonus || 0; },
        function (v) { spe.bonus = clamp(Math.round(v), -999, 999); },
        "Bonus de la spécialité");
      quint.addEventListener("click", function (e) {
        // ROUAGE OUVERT, ON CONSTRUIT : le bloc ne lance pas. Il porte
        // maintenant des champs, et un clic à côté de l'un d'eux enverrait un
        // jet au tchat sans qu'on l'ait voulu.
        if (isEdit("specialites")) return;
        // un clic DANS un champ édite, il ne lance pas. Hors édition les champs
        // sont inertes (pointer-events: none) et le clic revient bien au bloc.
        var t = e.target && e.target.tagName;
        if (t === "INPUT" || t === "SELECT" || t === "OPTION") return;
        // sans caractéristique, la limite vaut zéro et le jet ne rendrait
        // jamais que zéro : le dire vaut mieux que de le lancer
        if (!spe.carac) { flash("Cette spécialité ne dit pas de quelle caractéristique elle tient."); return; }
        doJet(spe.nom || "Spécialité", spe.carac, spe.comp, spe);
      });
      top.appendChild(quint);
      row.appendChild(top);

      // La MOITIÉ survolée décide : au-dessus, la ligne prise se pose avant ;
      // en dessous, après. Le liseré le montre pendant qu'on tient.
      function moitieBasse(ev) {
        var r = row.getBoundingClientRect();
        return ev.clientY >= r.top + r.height / 2;
      }
      row.addEventListener("dragover", function (ev) {
        if (pris === null || pris === it.index) return;
        ev.preventDefault();            // sans ça, le navigateur refuse le dépôt
        try { ev.dataTransfer.dropEffect = "move"; } catch (e) {}
        eteintDepot();
        row.classList.add(moitieBasse(ev) ? "apres" : "avant");
      });
      row.addEventListener("dragleave", function (ev) {
        if (ev.target === row) { row.classList.remove("avant"); row.classList.remove("apres"); }
      });
      row.addEventListener("drop", function (ev) {
        ev.preventDefault();
        var src = pris;
        if (src === null) {
          try { src = parseInt(ev.dataTransfer.getData("text/plain"), 10); } catch (e) { src = NaN; }
        }
        eteintDepot();
        if (!isFinite(src) || src === it.index) return;
        var cible = it.index + (moitieBasse(ev) ? 1 : 0);
        var l = state.specialites;
        var obj = l.splice(src, 1)[0];
        if (!obj) return;
        // le retrait a décalé tout ce qui suivait : la cible avec, si elle était
        // après la source
        if (src < cible) cible--;
        l.splice(clamp(cible, 0, l.length), 0, obj);
        rendu();
        refresh();
        if (optSpesRebuild) optSpesRebuild();   // l'ordre du bloc des Options suit
      });

      // PLUS DE RANG DE CONSTRUCTION. Tout s'y est vidé : les quatre réglages
      // sont passés dans leurs cases, le retrait est monté à gauche de la
      // ligne, et le coût en xp en est retiré — on le lit au compteur de
      // l'en-tête et, ligne par ligne, dans le bloc des Options.

      lignes.push(function () {
        // même lecture qu'ailleurs : le RÉSULTAT du levier, pas une de ses cases
        var d = spePtsBrut(spe) - (spe.pts || 0);
        var force = lireSpe("valeur", spe)("force") !== undefined;
        var mal = enduranceMalus();
        // la charge ne mord que sur l'esquive, et l'esquive est une spécialité :
        // un −100 apparu sans être nommé passerait pour une faute de calcul
        var ch = speMalusCharge(spe);
        var lim = spe.carac ? speLim(spe) : 0;
        var bonus = jetBonus(spe.carac, spe.comp, spe);
        // UN CHAMP NE SE RÉÉCRIT JAMAIS SOUS LES DOIGTS : tant qu'il a le
        // focus, ce qu'on tape y reste tel quel.
        if (document.activeElement !== selCar) selCar.value = spe.carac || "";
        if (document.activeElement !== selCmp) selCmp.value = spe.comp || "";
        paire.title = (spe.carac ? caracInfo(spe.carac).nom : "aucune caractéristique") +
                      " · " + (spe.comp ? compInfo(spe.comp).nom : "aucune compétence");
        // LES CINQ CASES, dans l'ordre où la phrase se compose : ce que la
        // spécialité vaut EN TOUT, ce qui coiffe le résultat, et le bonus
        // qu'on lui a posé. Sous le rouage s'y ajoute une case : les points
        // propres, ceux qu'on achète.
        var modC = spe.carac ? caracMod(spe.carac) : 0;
        var compC = spe.comp ? compPts(spe.comp) : 0;
        vPts.txt.textContent = String(spePts(spe));
        if (document.activeElement !== vPts.champ) vPts.champ.value = spe.pts || 0;
        // LE TOTAL EST CELUI QU'ON LANCE, donc le RABATTU : si l'écart avec la
        // limite descendait sous son minimum, c'est le nombre déjà ramené qui
        // s'affiche. Montrer celui d'avant afficherait un chiffre que le dé ne
        // verra jamais.
        //
        // SANS SIGNE. Ce n'est pas un terme qu'on ajoute à quelque chose — c'est
        // une valeur, comme la limite à côté. Le « + » ne se met qu'à ce qui
        // s'ajoute : le MOD d'une caractéristique, le bonus.
        var brut = speTotalBrut(spe);
        var tot = speTotal(spe);
        var rabat = spe.carac && speRetire(spe) > 0;
        vTot.textContent = spe.carac ? String(tot).replace("-", "−") : "—";
        vTot.classList.toggle("adj", !!rabat);
        // LES DEUX NOMBRES SONT CEUX QUI ONT SERVI : l'écart de la SPÉCIALITÉ,
        // bout de la cascade, et la limite NATURELLE — ceux que speRetire
        // emploie, et non ceux de la caractéristique telle qu'elle se lit.
        vTot.title = rabat
          ? "Ramené de " + brut + " — écart " + ecartSpe(spe) +
            " sous la limite " + caracLimNat(spe.carac) + "."
          : "";
        vLim.textContent = spe.carac ? String(lim) : "—";
        // LA CASE MONTRE LE BONUS TEL QUE SA CHAÎNE LE REND ; le CHAMP, lui,
        // garde ce qui a été saisi — c'est lui qu'on modifie, et il est la base
        // de la chaîne.
        var bon = speBonus(spe);
        var db = bon - speBonusSocle(spe);
        vBon.txt.textContent = sign(bon);
        if (document.activeElement !== vBon.champ) vBon.champ.value = spe.bonus || 0;
        quint.classList.toggle("adj", force || d !== 0 || db !== 0 || mal !== 0 || ch !== 0);
        quint.title = !spe.carac
          ? "Cette spécialité ne dit pas de quelle caractéristique elle tient."
          : (force
               ? "Points forcés (Options)"
               : "Points " + (spe.pts || 0) +
                 (d ? " · modificateur (Options) " + sign(d) : "")) +
            " · " + spe.carac + " " + sign(caracMod(spe.carac)) +
            (spe.comp ? " · " + spe.comp + " " + sign(compPts(spe.comp)) : "") +
            (rabat ? " · total ramené de " + brut + " à " + tot : "") +
            (bon ? " · bonus " + sign(bon) : "") +
            (db ? " (décalé de " + sign(db) + ", Options)" : "") +
            (ch ? " · charge " + sign(ch) : "") +
            (mal ? " · endurance " + sign(-mal) : "") +
            " — clic : lancer " + deNu(deTest()) + " " + sign(bonus) +
            ", plafonné à " + lim;
      });
      return row;
    }

    function rendu() {
      box.innerHTML = "";
      // les fonctions des lignes effacées n'ont plus rien à rafraîchir ; le
      // tableau est vidé SUR PLACE, celui du registre étant le même objet
      lignes.length = 0;
      var items = filtreSpes(allSpes());
      items.forEach(function (it) { box.appendChild(ligne(it)); });
      if (!items.length) box.appendChild(el("div", "pc-empty", "—"));
      box.appendChild(miniBtn("+ Ajouter une spécialité", null, function () {
        state.specialites.push(blankSpe());
        rendu();
        refresh();
        if (optSpesRebuild) optSpesRebuild();   // la nouvelle gagne sa ligne dans Options
      }, "pc-edit-only"));
      // les lignes qui viennent de naître doivent obéir au verrou du bloc :
      // rien ne le leur dirait avant le prochain rafraîchissement
      applyEdit(b, "specialites");
      // ET ELLES DOIVENT ÊTRE REMPLIES. Les lignes naissent VIDES : leurs
      // nombres, leurs deux sigles et leurs infobulles ne s'écrivent que dans
      // la fonction poussée au registre, et ce registre n'est joué que par
      // refresh(). Trois des quatre appelants de rendu() enchaînent sur
      // refresh() — pas le FILTRE, qui ne doit rien enregistrer : filtrer
      // laissait donc les rangées survivantes avec des tirets à la place des
      // sigles et des cases vides à la place des nombres.
      //
      // On rejoue ici, et non chez l'appelant : un appelant peut oublier, une
      // fin de rendu() ne le peut pas. Les trois autres rejouent une fois de
      // plus au rafraîchissement suivant, ce qui ne coûte que d'écrire deux
      // fois les mêmes nombres.
      for (var i = 0; i < lignes.length; i++) {
        try { lignes[i](); } catch (e) { /* la muselière juge à la passe suivante */ }
      }
    }
    rendu();
    return b;
  }

  // ---------- onglet Art : les techniques et les passifs ----------
  // UNE LISTE LIBRE, et c'est ce qui la distingue de l'onglet Art d'autrefois :
  // celui-là posait une carte par compétence éligible, au stade qui ouvrait les
  // passifs. Les stades ont disparu avec les règles de JJK ; ce qui reste est
  // une liste que le joueur remplit lui-même, une entrée par technique ou par
  // passif, sans rien qui la commande.
  //
  // DEUX TYPES, ET UNE SEULE DIFFÉRENCE ENTRE EUX : une technique coûte de
  // l'ENDURANCE quand on l'emploie, un passif ne coûte rien puisqu'il ne
  // s'emploie pas — il est. Tout le reste est identique, effets compris.
  //
  // UN ART PORTE DES EFFETS : celui de BASE, qu'il a toujours, puis autant
  // d'AMÉLIORATIONS qu'on veut. Les cinq champs d'un effet sont les mêmes
  // partout — un nom, un coût en avantage, un coût en xp, une description, une
  // macro. Aucune exception : une amélioration de passif porte un coût en
  // avantage comme les autres.
  //
  // AUCUNE RÈGLE ICI. La page de règles ne dit pas un mot des techniques ni des
  // passifs : rien à lire dans DATA, aucun barème, aucun plafond. Le module ne
  // fait que ranger ce que la table décide.
  function buildArt() {
    var b = block("Techniques et passifs", null, "arts");
    // LA BOÎTE EST APPENDUE UNE FOIS, hors de rendu() : c'est son contenu qui
    // se refait, jamais elle. Sans quoi le bloc perdrait sa place à chaque
    // ajout.
    var box = el("div", "pc-arts");
    b.appendChild(box);

    // LE REGISTRE DES CARTES, et le détour obligatoire. Pousser directement
    // dans « hooks » empilerait à jamais les fonctions des cartes détruites,
    // chacune tenant un art que l'état ne porte plus, jusqu'à ce que la
    // muselière éteigne le module.
    var lignes = [];
    hooks.push(function () {
      for (var i = 0; i < lignes.length; i++) lignes[i]();
    });

    // L'ORDRE APPARTIENT AU JOUEUR, comme celui des spécialités : on glisse la
    // POIGNÉE, jamais la carte — elle porte des champs de saisie, et une carte
    // « draggable » interdirait d'y sélectionner un mot à la souris.
    //
    // « pris » porte l'index dans l'ÉTAT, jamais le rang à l'écran : la liste
    // peut être filtrée, et un rang d'écran ne dirait alors pas où ranger.
    var pris = null;
    function eteintDepot() {
      var l = box.querySelectorAll(".pc-art");
      for (var i = 0; i < l.length; i++) {
        l[i].classList.remove("avant");
        l[i].classList.remove("apres");
      }
    }

    // ---------- un effet : cinq champs, et deux gestes ----------
    // MÊME FABRIQUE POUR LES TROIS SORTES D'EFFET — base de technique, base de
    // passif, amélioration. Ils portent exactement les mêmes champs, donc ils
    // n'ont pas à être écrits trois fois : trois copies finiraient par diverger
    // d'un placeholder, puis d'une borne.
    //
    // « retirer » vaut null pour un effet de base : un art a toujours le sien,
    // et une croix qui l'effacerait laisserait une carte sans effet.
    function bloc(e, titre, retirer) {
      var c = el("div", "pc-av pc-effet");

      var head = el("div", "pc-av-head");
      var nm = el("input", "nm pc-edit-field");
      nm.type = "text";
      nm.placeholder = titre;
      nm.value = e.nom || "";
      // UN NOM S'ENREGISTRE SANS RAFRAÎCHIR : refresh() rejouerait les registres
      // et reconstruirait la liste sous les doigts. Rien ici ne se calcule à
      // partir d'un nom, contrairement aux spécialités, que trois formules des
      // règles cherchent PAR LEUR NOM.
      nm.addEventListener("input", function () { e.nom = nm.value; save(); });
      head.appendChild(nm);

      // LES DEUX COÛTS NE SE VOIENT QU'EN CONSTRUISANT. Ce qu'on lit en jouant,
      // c'est ce que l'effet FAIT ; ce qu'il a coûté ne regarde que le moment où
      // on l'achète — même partage que sur une ligne de caractéristique.
      head.appendChild(cout(
        function () { return e.avantage; },
        function (v) { e.avantage = v; },
        999, "av", "Coût en avantage"));
      head.appendChild(cout(
        function () { return e.xp; },
        function (v) { e.xp = v; },
        9999, "xp", "Coût en xp"));

      head.appendChild(chatBtn(
        function () { return e.nom || titre; },
        function () { return [["", e.desc]]; }));
      if (retirer) head.appendChild(miniBtn("✕", "Retirer cet effet", retirer,
                                            "danger pc-edit-only"));
      c.appendChild(head);

      var d = el("textarea", "pc-notes pc-edit-field");
      d.rows = 3;
      d.placeholder = "Ce que fait l'effet";
      d.value = e.desc || "";
      d.addEventListener("input", function () { e.desc = d.value; majVides(); save(); });
      c.appendChild(d);

      // ---- la macro liée ----
      // UN CHAMP LIBRE, ET UN BOUTON QUI L'ENVOIE TEL QUEL. La fiche ne
      // l'interprète pas : une macro Roll20 peut porter des @{…} et des ?{…}
      // que seul Roll20 sait résoudre, et les rogner ici la casserait.
      var ligne = el("div", "pc-art-macro");
      var mc = el("input", "pc-edit-field");
      mc.type = "text";
      mc.placeholder = "Macro liée — partira telle quelle dans le tchat";
      mc.value = e.macro || "";
      mc.addEventListener("input", function () { e.macro = mc.value; majVides(); save(); });
      ligne.appendChild(mc);
      // LE BOUTON RESTE EN JEU, lui : c'est le geste qu'on fait à table. Il ne
      // porte pas pc-edit-only, et son champ, verrouillé hors construction, se
      // lit quand même.
      ligne.appendChild(miniBtn("Lancer", "Envoyer cette macro dans le tchat Roll20",
        function () {
          var m = String(e.macro || "").trim();
          if (!m) { flash("Aucune macro sur cet effet."); return; }
          // HORS ROLL20 ON LE DIT, on ne fait pas semblant : envoyer() rend
          // false, et un bouton qui ne répond rien passerait pour cassé.
          if (!envoyer(m)) flash("Hors Roll20 : la macro ne peut pas partir.");
        }, "primary"));
      c.appendChild(ligne);

      // EN JOUANT, UN CHAMP VIDE DISPARAÎT. Une zone de texte grise sans un mot
      // dedans et un bouton « Lancer » qui n'a rien à lancer occupent la moitié
      // d'une carte pour ne rien dire. En construisant ils reviennent : c'est là
      // qu'on les remplit.
      //
      // CE CALCUL SE FAIT LÀ OÙ L'ON TAPE, et pas seulement au registre. Le
      // registre n'est joué que par refresh(), et un champ de TEXTE appelle
      // save() — jamais refresh(), qui reconstruirait la liste sous les doigts.
      // La marque restait donc posée sur une description qu'on venait d'écrire,
      // et seul un coût tapé par-dessus — lui rafraîchit — la faisait
      // disparaître. « Ni avantage ni xp, donc pas de description » : le défaut
      // était là, et il liait deux choses qui n'ont rien à voir.
      function majVides() {
        d.classList.toggle("vide", !String(e.desc || "").trim());
        ligne.classList.toggle("vide", !String(e.macro || "").trim());
      }
      // les champs se relisent à chaque passe, SAUF celui qu'on est en train de
      // taper : un champ réécrit sous les doigts perd le curseur
      lignes.push(function () {
        if (document.activeElement !== nm) nm.value = e.nom || "";
        if (document.activeElement !== d) d.value = e.desc || "";
        if (document.activeElement !== mc) mc.value = e.macro || "";
        majVides();
      });
      return c;
    }

    // Un coût : un nombre et son unité, comme le coût d'un passif d'autrefois.
    // VIDE VAUT ZÉRO, et zéro ne s'écrit pas : un effet gratuit ne doit pas
    // alourdir l'état d'un « 0 » que personne n'a tapé.
    function cout(lire, ecrire, borne, unite, aide) {
      var w = el("span", "pc-tech-cout pc-edit-only");
      var i = el("input");
      i.type = "number";
      i.min = "0";
      i.step = "5";
      i.placeholder = "0";
      i.value = lire() || "";
      i.title = aide + " — vide = 0.";
      i.addEventListener("input", function () {
        var v = parseFloat(i.value);
        // UN COÛT ALIMENTE LE TOTAL D'XP : celui-là rafraîchit, contrairement
        // aux champs de texte. C'est le partage constant de la maison.
        ecrire(isFinite(v) ? clamp(Math.round(v * 100) / 100, -borne, borne) : 0);
        refresh();
      });
      w.appendChild(i);
      w.appendChild(el("span", "u", unite));
      lignes.push(function () {
        if (document.activeElement !== i) i.value = lire() || "";
      });
      return w;
    }

    // ---------- une carte : un art entier ----------
    function carte(it) {
      // L'ART SE PREND VIVANT dans l'enveloppe, jamais capturé au montage : la
      // liste bouge sous la carte (ajout, retrait, glissement).
      var a = it.art;
      var c = el("div", "pc-av pc-art");

      var top = el("div", "pc-art-top");
      top.appendChild(miniBtn("✕", "Retirer", function () {
        // UN TEXTE RÉDIGÉ NE PART PAS SUR UN CLIC. Et la confirmation passe par
        // la modale de la fiche : confirm() natif est MUET dans l'iframe
        // Roll20 — il rend false sans rien montrer, et le retrait y serait
        // annulé en silence.
        if (!artVide(a)) {
          confirmer("Retirer « " + (a.nom || "sans nom") + " »",
                    "Ses effets et leurs descriptions partent avec.",
                    "Retirer", function () { retire(it.index); });
          return;
        }
        retire(it.index);
      }, "danger pc-croix pc-edit-only"));

      var poignee = el("span", "pc-poignee pc-edit-only");
      poignee.title = "Glisser pour ranger";
      poignee.draggable = true;
      poignee.addEventListener("dragstart", function (ev) {
        pris = it.index;
        c.classList.add("pris");
        try {
          ev.dataTransfer.effectAllowed = "move";
          // Firefox refuse de commencer un glissement sans donnée posée
          ev.dataTransfer.setData("text/plain", String(it.index));
          if (ev.dataTransfer.setDragImage) ev.dataTransfer.setDragImage(c, 16, 12);
        } catch (e) {}
      });
      poignee.addEventListener("dragend", function () {
        pris = null;
        c.classList.remove("pris");
        eteintDepot();
      });
      top.appendChild(poignee);

      // LE TYPE SE CHOISIT, et il ne se voit qu'en construisant : en jouant, la
      // pastille dit lequel c'est.
      var sel = el("select", "pc-select pc-edit-only pc-edit-field");
      [["technique", "Technique"], ["passif", "Passif"]].forEach(function (o) {
        var op = el("option", null, o[1]);
        op.value = o[0];
        sel.appendChild(op);
      });
      sel.value = a.type === "passif" ? "passif" : "technique";
      sel.addEventListener("change", function () {
        a.type = sel.value;
        // UN PASSIF NE PORTE PAS LA CLÉ : la laisser traîner ferait voyager
        // jusque dans les Attributs Roll20 un nombre dont personne ne saurait
        // dire s'il compte.
        if (a.type === "passif") delete a.endurance;
        else if (typeof a.endurance !== "number") a.endurance = 0;
        rendu();
        refresh();
      });
      top.appendChild(sel);
      var pastille = el("span", "pc-abbr pc-jeu-only");
      top.appendChild(pastille);

      var nm = el("input", "nm pc-edit-field");
      nm.type = "text";
      nm.placeholder = "Nom";
      nm.value = a.nom || "";
      nm.addEventListener("input", function () { a.nom = nm.value; save(); });
      top.appendChild(nm);

      // L'ENDURANCE N'EST QUE SUR UNE TECHNIQUE, et c'est la seule chose qui
      // sépare les deux types. Un passif ne s'emploie pas : il n'a rien à payer.
      var end = null;
      if (a.type !== "passif") {
        end = el("span", "pc-tech-cout pc-art-end");
        var ei = el("input");
        ei.type = "number";
        ei.min = "0";
        ei.step = "1";
        ei.placeholder = "0";
        ei.className = "pc-edit-field";
        ei.value = a.endurance || "";
        ei.title = "Ce que la technique coûte en endurance quand on l'emploie.";
        ei.addEventListener("input", function () {
          var v = parseFloat(ei.value);
          a.endurance = isFinite(v) ? clamp(Math.round(v), -9999, 9999) : 0;
          save();
        });
        end.appendChild(ei);
        end.appendChild(el("span", "u", "end"));
        top.appendChild(end);
        lignes.push(function () {
          if (document.activeElement !== ei) ei.value = a.endurance || "";
        });
      }

      // CE QUE L'ART COÛTE EN TOUT, effets compris : c'est le seul nombre
      // calculé de la carte, et il se lit en jouant comme en construisant.
      var somme = el("span", "pc-art-somme");
      top.appendChild(somme);
      c.appendChild(top);

      // ---- l'effet de base ----
      c.appendChild(el("div", "pc-art-sep", "Effet de base"));
      c.appendChild(bloc(a.base, "Nom de l'effet", null));

      // ---- les améliorations ----
      c.appendChild(el("div", "pc-art-sep pc-art-sep-am", "Améliorations"));
      var amBox = el("div", "pc-techniques");
      c.appendChild(amBox);
      a.ameliorations.forEach(function (e, i) {
        amBox.appendChild(bloc(e, "Nom de l'amélioration", function () {
          if (!effetVide(e)) {
            confirmer("Retirer « " + (e.nom || "sans nom") + " »",
                      "Sa description et sa macro partent avec.",
                      "Retirer", function () { retireAm(a, i); });
            return;
          }
          retireAm(a, i);
        }));
      });
      c.appendChild(miniBtn("+ Amélioration", null, function () {
        a.ameliorations.push(blankEffet());
        rendu();
        refresh();
      }, "pc-edit-only pc-comp-add"));

      // ---- le glisser-déposer ----
      // La MOITIÉ survolée décide : au-dessus, la carte prise se pose avant ;
      // en dessous, après.
      function moitieBasse(ev) {
        var r = c.getBoundingClientRect();
        return ev.clientY >= r.top + r.height / 2;
      }
      c.addEventListener("dragover", function (ev) {
        if (pris === null || pris === it.index) return;
        ev.preventDefault();            // sans ça, le navigateur refuse le dépôt
        try { ev.dataTransfer.dropEffect = "move"; } catch (e) {}
        eteintDepot();
        c.classList.add(moitieBasse(ev) ? "apres" : "avant");
      });
      c.addEventListener("dragleave", function (ev) {
        if (ev.target === c) { c.classList.remove("avant"); c.classList.remove("apres"); }
      });
      c.addEventListener("drop", function (ev) {
        ev.preventDefault();
        var src = pris;
        if (src === null) {
          try { src = parseInt(ev.dataTransfer.getData("text/plain"), 10); } catch (e) { src = NaN; }
        }
        eteintDepot();
        if (!isFinite(src) || src === it.index) return;
        var cible = it.index + (moitieBasse(ev) ? 1 : 0);
        var l = state.arts;
        var obj = l.splice(src, 1)[0];
        if (!obj) return;
        // le retrait a décalé tout ce qui suivait : la cible avec, si elle
        // était après la source
        if (src < cible) cible--;
        l.splice(clamp(cible, 0, l.length), 0, obj);
        rendu();
        refresh();
      });

      lignes.push(function () {
        var vivant = (state.arts || [])[it.index];
        if (!vivant) return;
        if (document.activeElement !== nm) nm.value = vivant.nom || "";
        if (document.activeElement !== sel) sel.value = vivant.type === "passif" ? "passif" : "technique";
        pastille.textContent = vivant.type === "passif" ? "PASSIF" : "TECHNIQUE";
        var x = artXp(vivant), av = artAvantage(vivant);
        // ON NE DIT QUE CE QUI EXISTE : « 0 xp · 0 av » sur un art qu'on vient
        // d'ouvrir est du bruit.
        somme.textContent = (x ? x + " xp" : "") + (x && av ? " · " : "") + (av ? av + " av" : "");
        somme.title = x || av
          ? "Ce que cet art coûte en tout, améliorations comprises."
          : "";
      });
      return c;
    }

    function retire(i) {
      state.arts.splice(i, 1);
      rendu();
      refresh();
    }
    function retireAm(a, i) {
      a.ameliorations.splice(i, 1);
      rendu();
      refresh();
    }

    function rendu() {
      box.innerHTML = "";
      // les fonctions des cartes effacées n'ont plus rien à rafraîchir ; le
      // tableau est vidé SUR PLACE, celui du registre étant le même objet
      lignes.length = 0;
      var items = allArts();
      items.forEach(function (it) { box.appendChild(carte(it)); });
      if (!items.length) box.appendChild(el("div", "pc-empty", "Aucune technique ni passif."));

      var pied = el("div", "pc-art-pied");
      pied.appendChild(miniBtn("+ Technique", null, function () {
        state.arts.push(blankArt("technique"));
        rendu();
        refresh();
      }, "pc-edit-only"));
      pied.appendChild(miniBtn("+ Passif", null, function () {
        state.arts.push(blankArt("passif"));
        rendu();
        refresh();
      }, "pc-edit-only"));
      var tot = el("span", "pc-art-total");
      pied.appendChild(tot);
      box.appendChild(pied);
      lignes.push(function () {
        var x = artsXp(), av = artsAvantage();
        tot.textContent = (x || av)
          ? "En tout : " + x + " xp" + (av ? " · " + av + " av" : "")
          : "";
      });

      // les cartes qui viennent de naître doivent obéir au verrou du bloc :
      // rien ne le leur dirait avant le prochain rafraîchissement
      applyEdit(b, "arts");
      // ET ELLES DOIVENT ÊTRE REMPLIES. Une carte naît vide : ses nombres, sa
      // pastille et ses relectures ne s'écrivent que dans les fonctions poussées
      // au registre, et ce registre n'est joué que par refresh(). Rejouer ICI,
      // et non chez l'appelant : un appelant peut oublier, une fin de rendu()
      // ne le peut pas. C'est la faute qui a vidé les spécialités filtrées.
      for (var i = 0; i < lignes.length; i++) {
        try { lignes[i](); } catch (e) { /* la muselière juge à la passe suivante */ }
      }
    }

    rendu();
    return b;
  }
  // ---------- donner / prendre un objet (entre joueurs, par le tchat) ----------
  // Le donneur envoie au tchat une carte portant un lien « Prendre » : le
  // payload de l'objet y voyage encodé en base64. L'extension Roll20 intercepte
  // le clic sur ce lien (la fiche, dans son iframe, ne voit pas le tchat) et
  // renvoie le payload à la fiche du preneur, qui affiche son dialogue de
  // réception. L'encodage vit ICI, côté site : son format peut donc évoluer
  // sans jamais re-signer l'extension, qui ne fait que relayer.
  var TAKE_CMD = "/mia_take";
  var IMG_MAX = 4000;   // une vignette plus lourde ne tient pas dans un message
  function b64encode(txt) {
    try {
      if (typeof TextEncoder !== "undefined") {
        var oct = new TextEncoder().encode(txt), s = "";
        for (var i = 0; i < oct.length; i++) s += String.fromCharCode(oct[i]);
        return btoa(s);
      }
    } catch (e) {}
    return btoa(unescape(encodeURIComponent(txt)));
  }
  function b64decode(b64) {
    var bin = atob(String(b64 || "").replace(/-/g, "+").replace(/_/g, "/"));
    try {
      if (typeof TextDecoder !== "undefined") {
        var oct = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) oct[i] = bin.charCodeAt(i);
        return new TextDecoder().decode(oct);
      }
    } catch (e) {}
    return decodeURIComponent(escape(bin));
  }
  // objet -> payload compact (clés courtes : le message de tchat est borné)
  function packObjet(it, qte) {
    var p = {
      n: String(it.nom || ""), q: Math.max(0, pnum(qte)) || 1, p: pnum(it.poids),
      d: String(it.desc || ""), k: String(it.id || ""),
      a: pnum(it.achat), v: pnum(it.vente)
    };
    var img = String(it.img || "");
    if (img && (img.length <= IMG_MAX || !/^data:/.test(img))) p.i = img;
    return b64encode(JSON.stringify(p));
  }
  function unpackObjet(b64) {
    var o;
    try { o = JSON.parse(b64decode(b64)); } catch (e) { return null; }
    if (!o || typeof o !== "object") return null;
    return {
      nom: String(o.n || "Objet"), qte: Math.max(0, pnum(o.q)) || 1, poids: pnum(o.p),
      desc: String(o.d || ""), img: String(o.i || ""),
      id: String(o.k || ""), achat: pnum(o.a), vente: pnum(o.v)
    };
  }

  // ---------- boîte de dialogue (jamais prompt/confirm pour un formulaire) ----------
  // Dans Roll20 la fiche est une iframe d'une autre origine : les fenêtres
  // natives y sont muettes sous Chrome. Tout formulaire passe donc par cette
  // couche, posée dans le document de la fiche.
  function dialogue(titre, corps, valider, libelleValider) {
    var over = el("div", "pc-modal-over");
    var box = el("div", "pc-modal");
    box.appendChild(el("div", "pc-modal-title", titre));
    box.appendChild(corps);
    var pied = el("div", "pc-modal-actions");
    function fermer() { if (over.parentNode) over.parentNode.removeChild(over); }
    pied.appendChild(miniBtn("Annuler", null, fermer));
    var ok = miniBtn(libelleValider || "Valider", null, function () {
      if (valider() !== false) fermer();
    }, "primary");
    pied.appendChild(ok);
    box.appendChild(pied);
    over.appendChild(box);
    over.addEventListener("mousedown", function (e) { if (e.target === over) fermer(); });
    // DANS .perso-atelier : c'est lui qui porte les jetons de couleur (jour et
    // nuit) ; accroché plus haut, le dialogue perdrait tout son habillage
    (appEl || rootEl || document.body).appendChild(over);
    setTimeout(function () {
      var f = box.querySelector("input, textarea, select");
      if (f) { f.focus(); if (f.select) f.select(); }
    }, 0);
    return { fermer: fermer };
  }
  // confirm() est MUET dans l'iframe Roll20 (autre origine) : il renvoie false
  // sans rien afficher, donc le retrait y était annulé en silence dès que
  // l'objet portait un nom. Toute confirmation passe par la modale de la fiche.
  function confirmer(titre, texte, libelle, fn) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note", texte));
    dialogue(titre, corps, fn, libelle);
  }

  // Donner : combien, puis la carte part au tchat et la pile diminue d'autant.
  function donnerDialogue(it, qteDefaut) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "L'objet quitte l'inventaire et part dans le tchat : le premier joueur qui clique « Prendre » le reçoit."));
    var qIn = el("input", "n");
    qIn.type = "number"; qIn.min = "0"; qIn.max = String(it.qte); qIn.step = "any";
    qIn.value = fmtP(Math.min(pnum(qteDefaut) || it.qte, it.qte));
    corps.appendChild(fld("Quantité à donner (sur " + fmtP(it.qte) + ")", qIn));
    dialogue("Donner « " + (it.nom || "objet") + " »", corps, function () {
      var q = Math.min(pnum(qIn.value) || it.qte, it.qte);
      if (!it.qte || !q) { flash("Cet objet n'est plus en stock."); return; }
      // le nom passe par envSan comme partout ailleurs : sans lui, un nom qui
      // porte une accolade ou un saut de ligne (objet importé, objet reçu d'un
      // autre joueur) compose une commande que l'extension refuse — et l'objet
      // serait quand même retiré de l'inventaire, donc perdu.
      var cmd = "&{template:default} {{name=Objet donné — " + (envSan(it.nom) || "objet") + "}}" +
                (q > 1 ? " {{Quantité=" + fmtP(q) + "}}" : "") +
                (it.desc ? " {{=" + String(it.desc).replace(/[{}]/g, "").replace(/\s+/g, " ").trim() + "}}" : "") +
                " {{Prendre=[Prendre](" + TAKE_CMD + " " + packObjet(it, q) + ")}}";
      if (typeof window.__miaChat === "function") envoyer(cmd);
      else flash("Hors de Roll20 : rien n'est envoyé au tchat (l'objet reste dans l'inventaire).");
      if (typeof window.__miaChat === "function") {
        it.qte = Math.max(0, Math.round((it.qte - q) * 100) / 100);
        if (!it.qte) {
          var i = state.inv.objets.indexOf(it);
          if (i >= 0) state.inv.objets.splice(i, 1);
        }
        refresh();
        if (invRender) invRender();
      }
    }, "Donner");
  }

  // Prendre : l'objet arrive du tchat (relayé par l'extension). S'il existe
  // déjà, on empile les quantités et on tranche champ par champ ce qui diffère.
  var invRender = null;   // posé par invObjets : re-rendu de l'inventaire
  function recevoirObjet(payload) {
    var recu = unpackObjet(payload);
    if (!recu) { flash("Objet illisible (message abîmé)."); return; }
    var G = state.inv.groupes, items = state.inv.objets;
    // reconnaissance : d'abord l'identifiant (deux objets homonymes mais
    // distincts ne fusionnent pas), à défaut le nom
    var jumeau = null;
    if (recu.id) {
      items.forEach(function (x) { if (!jumeau && x.id && x.id === recu.id) jumeau = x; });
    }
    if (!jumeau) {
      items.forEach(function (x) {
        if (!jumeau && !x.id && !recu.id &&
            String(x.nom).trim().toLowerCase() === recu.nom.trim().toLowerCase()) jumeau = x;
      });
    }

    var corps = el("div", "pc-modal-body");
    if (recu.img) {
      var imb = el("div", "pc-modal-img");
      var im = el("img"); im.alt = ""; im.src = recu.img;
      imb.appendChild(im);
      corps.appendChild(imb);
    }
    var qIn = el("input", "n");
    qIn.type = "number"; qIn.min = "0"; qIn.max = String(recu.qte); qIn.step = "any";
    qIn.value = fmtP(recu.qte);
    corps.appendChild(fld("Quantité à prendre (sur " + fmtP(recu.qte) + ")", qIn));

    var gSel = null;
    if (!jumeau) {
      gSel = el("select");
      G.forEach(function (gn, gi) {
        var o = el("option", null, gn);
        o.value = String(gi);
        gSel.appendChild(o);
      });
      corps.appendChild(fld("Ranger dans", gSel));
    }

    // conflits : pour chaque champ qui diffère, garder le sien ou prendre le neuf
    var choix = {};
    if (jumeau) {
      corps.appendChild(el("div", "pc-modal-note",
        "« " + jumeau.nom + " » est déjà dans l'inventaire (" + fmtP(jumeau.qte) + ")" +
        (recu.id ? " — même identifiant" : "") + " : les quantités s'additionnent."));
      [["nom", "Nom"], ["img", "Image"], ["poids", "Poids"],
       ["desc", "Description"], ["achat", "Achat"], ["vente", "Vente"]].forEach(function (c) {
        var mien = String(jumeau[c[0]] || ""), neuf = String(recu[c[0]] || "");
        if (mien === neuf || (!mien && !neuf)) return;
        choix[c[0]] = "mien";
        var bloc = el("div", "pc-modal-conflit");
        bloc.appendChild(el("div", "lbl", c[1] + " : deux versions"));
        var row = el("div", "row");
        [["mien", "Garder le mien", mien], ["neuf", "Prendre le nouveau", neuf]].forEach(function (opt) {
          var b = el("button", "pc-modal-choix" + (opt[0] === "mien" ? " on" : ""));
          b.type = "button";
          b.appendChild(el("div", "tag", opt[1]));
          if (c[0] === "img" && opt[2]) {
            var mi = el("img"); mi.alt = ""; mi.src = opt[2];
            b.appendChild(mi);
          } else {
            b.appendChild(el("div", "val", opt[2] ? (c[0] === "poids" ? fmtP(pnum(opt[2])) : opt[2]) : "— vide —"));
          }
          b.addEventListener("click", function () {
            choix[c[0]] = opt[0];
            Array.prototype.forEach.call(row.children, function (x) { x.classList.remove("on"); });
            b.classList.add("on");
          });
          row.appendChild(b);
        });
        bloc.appendChild(row);
        corps.appendChild(bloc);
      });
    }

    dialogue("Prendre « " + recu.nom + " »", corps, function () {
      var q = Math.min(pnum(qIn.value) || recu.qte, recu.qte);
      if (jumeau) {
        jumeau.qte = Math.round((jumeau.qte + q) * 100) / 100;
        ["nom", "img", "poids", "desc", "achat", "vente"].forEach(function (k) {
          if (choix[k] === "neuf") jumeau[k] = recu[k];
        });
        if (!jumeau.id && recu.id) jumeau.id = recu.id;
      } else {
        items.push({
          nom: recu.nom, qte: q, poids: recu.poids, img: recu.img, desc: recu.desc,
          id: recu.id, achat: recu.achat, vente: recu.vente,
          groupe: gSel ? clamp(num(gSel.value, 0), 0, G.length - 1) : 0
        });
      }
      refresh();
      if (invRender) invRender();
      flash(fmtP(q) + " × « " + recu.nom + " » ajouté à l'inventaire.");
    }, "Prendre");
  }

  // ---------- inventaire : objets illustrés (tuiles par groupes + panneau) ----------
  // Des TUILES carrées rangées par groupes (Sur soi, Sacoche…), et le détail de
  // l'objet choisi dans la colonne de droite : image, quantité, poids, groupe,
  // description, envoi au tchat. On glisse une tuile d'un groupe à l'autre.
  //
  // Un registre en lignes a été essayé à la place, puis RETIRÉ : les tuiles
  // valent mieux ici, un inventaire se reconnaît à ses images. Si l'idée
  // revient, qu'elle revienne comme un choix d'affichage, pas comme un
  // remplacement.
  //
  // Le bandeau d'un groupe porte à droite son POIDS et sa case « Compté » :
  // décochée, le groupe est posé au sol, son poids sort du poids porté (donc du
  // malus de Body), mais ses objets restent entiers, consultables, déplaçables
  // et donnables. Le drapeau vit dans state.inv.comptes, parallèle aux groupes.
  //
  // Les images importées d'un fichier sont réduites en vignette pour tenir dans
  // la fiche (et dans les Attributes Roll20) ; préférer une URL quand c'est
  // possible.
  function invObjets(container, renderRef) {
    var G = state.inv.groupes;
    var items = state.inv.objets;
    var O = state.inv.opts;
    var sel = null;          // index dans items de l'objet affiché au panneau
    var dragIdx = null;
    var editGi = null;       // groupe à ouvrir en édition de nom au prochain render
    var tileRefs = {};       // idx -> { nom, badge, poids } pour maj sans re-render
    // Les poids des bandeaux se rafraîchissent SANS re-render : saisir un poids
    // dans le panneau recréerait sinon la tuile en cours d'édition, et le champ
    // frappé perdrait le focus au premier caractère.
    var grpPoids = [];

    // réglages d'affichage du module, en mode édition seulement
    var optRow = el("div", "pc-obj-opts pc-edit-only");
    var colIn = el("input", "n");
    colIn.type = "number"; colIn.min = "1"; colIn.max = "8"; colIn.step = "1";
    colIn.value = O.cols;
    colIn.title = "Objets par ligne";
    colIn.addEventListener("input", function () {
      O.cols = clamp(num(colIn.value, 4), 1, 8);
      render();
      refresh();
    });
    optRow.appendChild(fld("Par ligne", colIn));
    [["nom", "Nom"], ["qte", "Quantité"], ["poids", "Poids"], ["total", "Total"]].forEach(function (o) {
      var chip = el("span", "pc-chip");
      chip.textContent = o[1];
      chip.title = "Afficher « " + o[1] + " » sur les tuiles" + (o[0] === "total" ? " (total en bas du module)" : "");
      chip.classList.toggle("on", !!O[o[0]]);
      chip.addEventListener("click", function () {
        O[o[0]] = !O[o[0]];
        chip.classList.toggle("on", !!O[o[0]]);
        render();
        refresh();
      });
      optRow.appendChild(chip);
    });
    container.appendChild(optRow);

    var wrap = el("div", "pc-obj-wrap");
    var leftBox = el("div", "pc-obj-left");
    var panel = el("div", "pc-obj-panel");
    wrap.appendChild(leftBox);
    wrap.appendChild(panel);
    var tot = el("div", "pc-inv-total");

    // le poids de MIA n'a pas d'unité : c'est une valeur nue
    //
    // Le pied distingue ce que le personnage PORTE de ce qu'il a POSÉ : un
    // total unique laisserait croire qu'un sac décoché pèse encore, ou qu'il a
    // disparu. Les bandeaux se rafraîchissent ici aussi, pour qu'une saisie de
    // poids dans le panneau les mette à jour sans recréer les tuiles.
    function updateTotal() {
      tot.style.display = O.total ? "" : "none";
      grpPoids.forEach(function (f) { f(); });
      var porte = poidsObjets(true), pose = poidsObjets(false);
      tot.textContent = "Objets portés : " + fmtP(porte) +
        (pose ? " · posés : " + fmtP(pose) : "");
    }

    function vignette(file, cb) {
      var r = new FileReader();
      r.onerror = function () { flash("Image illisible."); };
      r.onload = function () {
        var img = new Image();
        img.onload = function () {
          if (!img.width || !img.height) { flash("Image illisible."); return; }   // ex. SVG sans dimensions
          var S = 96, c = document.createElement("canvas");
          c.width = S; c.height = S;
          var k = Math.max(S / img.width, S / img.height);
          var w = img.width * k, h = img.height * k;
          c.getContext("2d").drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
          cb(c.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = function () { flash("Image illisible."); };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    }

    function moveTo(from, gi, targetIt) {
      // déplace items[from] dans le groupe gi, juste avant targetIt (null : à la fin).
      // La position cible se recalcule APRÈS le retrait : retirer l'objet déplacé
      // décale les index de tout ce qui le suivait.
      var moved = items.splice(from, 1)[0];
      moved.groupe = gi;
      var at = targetIt ? items.indexOf(targetIt) : -1;
      if (at < 0) items.push(moved);
      else items.splice(at, 0, moved);
      sel = items.indexOf(moved);
    }

    function tile(it, idx) {
      var t = el("div", "pc-obj-tile" + (sel === idx ? " sel" : ""));
      if (it.img) {
        var im = el("img");
        im.alt = ""; im.draggable = false;
        im.src = it.img;
        t.appendChild(im);
      } else t.appendChild(el("div", "pc-obj-ph", "?"));
      // retrait direct depuis la tuile, en mode édition
      var del = el("button", "pc-obj-del pc-edit-only", "✕");
      del.type = "button";
      del.title = "Retirer cet objet";
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        // confirm() est MUET dans l'iframe Roll20 : il rend false sans rien
        // afficher, donc le retrait y était annulé en silence dès que l'objet
        // portait un nom. La modale de la fiche, elle, s'affiche partout.
        function retire() {
          var here = items.indexOf(it);
          items.splice(here, 1);
          if (sel === here) sel = null;
          else if (sel !== null && sel > here) sel--;
          render();
          refresh();
        }
        if (!(it.nom || it.desc)) { retire(); return; }
        confirmer("Retirer un objet",
                  "Retirer « " + (it.nom || "cet objet") + " » de l'inventaire ?",
                  "Retirer", retire);
        return;
      });
      t.appendChild(del);
      var foot = el("div", "pc-obj-foot");
      var nom = el("span", "nm", it.nom || "Objet");
      if (!O.nom) nom.style.display = "none";
      foot.appendChild(nom);
      var poids = el("span", "pds", it.poids ? fmtP(it.poids) : "");
      poids.title = "Poids unitaire";
      if (!O.poids) poids.style.display = "none";
      foot.appendChild(poids);
      var badge = el("span", "qte", "×" + fmtP(it.qte));
      if (!O.qte) badge.style.display = "none";
      foot.appendChild(badge);
      // pied inutile si tout est masqué : la tuile reste une vignette nette
      if (!O.nom && !O.poids && !O.qte) foot.style.display = "none";
      t.appendChild(foot);
      tileRefs[idx] = { nom: nom, badge: badge, poids: poids };

      t.addEventListener("click", function () { sel = idx; render(); });
      t.draggable = true;
      t.addEventListener("dragstart", function (e) {
        // réordonner et changer de groupe = construction : mode édition requis
        if (!isEdit("inv")) { e.preventDefault(); return; }
        dragIdx = idx;
        t.classList.add("drag");
        try { e.dataTransfer.setData("text/plain", ""); e.dataTransfer.effectAllowed = "move"; } catch (err) {}
      });
      t.addEventListener("dragend", function () { dragIdx = null; render(); });
      t.addEventListener("dragover", function (e) {
        if (dragIdx === null) return;
        // lâcher sur soi-même : cible invalide, et on N'EN LAISSE PAS le
        // conteneur du groupe la valider (sinon l'objet saute en fin de groupe)
        if (dragIdx === idx) { e.stopPropagation(); return; }
        e.preventDefault();
        e.stopPropagation();
        // le trait d'insertion se pose du côté visé : l'objet saura où il tombe
        var r = t.getBoundingClientRect();
        var avant = e.clientX < r.left + r.width / 2;
        t.classList.toggle("over-l", avant);
        t.classList.toggle("over-r", !avant);
      });
      t.addEventListener("dragleave", function () { t.classList.remove("over-l", "over-r"); });
      t.addEventListener("drop", function (e) {
        if (dragIdx === null) return;
        if (dragIdx === idx) { e.stopPropagation(); return; }
        e.preventDefault();
        e.stopPropagation();
        var r = t.getBoundingClientRect();
        var avant = e.clientX < r.left + r.width / 2;
        var from = dragIdx; dragIdx = null;
        // déposer à DROITE d'une tuile = s'insérer avant la suivante du groupe.
        // L'objet déplacé est exclu du calcul : sinon il serait sa propre cible
        // et moveTo, qui le retire d'abord, l'expédierait en fin de groupe.
        var cible = it;
        if (!avant) {
          var deplace = items[from];
          var suivants = items.filter(function (x) { return x.groupe === it.groupe && x !== deplace; });
          var k = suivants.indexOf(it);
          cible = k >= 0 && k + 1 < suivants.length ? suivants[k + 1] : null;
        }
        moveTo(from, it.groupe, cible);
        render();
        refresh();
      });
      return t;
    }

    function groupBox(gi) {
      var g = el("div", "pc-obj-group");
      var head = el("div", "pc-obj-ghead");
      var name = el("span", "nm", G[gi]);
      name.title = isEdit("inv") ? "Double-clic : renommer le groupe" : G[gi];
      // édition EN PLACE, jamais prompt() : dans Roll20 la fiche est une iframe
      // d'une autre origine, où Chrome fait échouer prompt() en silence
      function editName() {
        var inp = el("input", "nmedit");
        inp.type = "text";
        inp.value = G[gi];
        inp.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); inp.blur(); }
          else if (e.key === "Escape") { inp.value = G[gi]; inp.blur(); }
        });
        inp.addEventListener("blur", function () {
          G[gi] = inp.value.trim() || G[gi];
          render();
          refresh();
        });
        head.replaceChild(inp, name);
        setTimeout(function () { inp.focus(); inp.select(); }, 0);
      }
      name.addEventListener("dblclick", function () { if (isEdit("inv")) editName(); });
      head.appendChild(name);
      if (editGi === gi) { editGi = null; editName(); }

      // CE QUE PÈSE CE GROUPE, ET S'IL PÈSE. Un personnage qui pose son sac au
      // sol ne le porte plus : le décocher sort ses objets du poids porté, donc
      // du malus de Body, sans rien perdre de ce qu'il contient. Les deux vivent
      // à droite du nom, là où l'oeil descend pour lire des chiffres.
      var pdsG = el("span", "pds");
      pdsG.title = "Poids de ce groupe";
      head.appendChild(pdsG);
      var caseG = el("label", "pc-obj-cnt");
      var boite = el("input");
      boite.type = "checkbox";
      boite.checked = invCompte(gi);
      boite.title = "Décoché, ce groupe est posé au sol : il ne compte plus dans le poids porté.";
      boite.addEventListener("change", function () {
        state.inv.comptes[gi] = boite.checked;
        g.classList.toggle("pose", !boite.checked);
        majPoids();
        updateTotal();      // le pied distingue porté et posé : il doit suivre
        save();
        refresh();          // et le malus de Body avec, dans le même geste
      });
      caseG.appendChild(boite);
      caseG.appendChild(el("span", "t", "Compté"));
      head.appendChild(caseG);
      // Le poids d'un groupe posé s'écrit entre parenthèses : il existe, il est
      // rangé, mais il ne pèse pas. Rien ne disparaît de l'écran.
      function majPoids() {
        var p = poidsGroupe(gi);
        pdsG.textContent = invCompte(gi) ? fmtP(p) : "(" + fmtP(p) + ")";
        pdsG.classList.toggle("off", !invCompte(gi));
      }
      majPoids();
      grpPoids.push(majPoids);
      if (!invCompte(gi)) g.classList.add("pose");

      if (G.length > 1) {
        var delG = el("button", "x pc-edit-only", "✕");
        delG.type = "button";
        delG.title = "Supprimer le groupe (ses objets rejoignent le premier groupe)";
        delG.addEventListener("click", function () {
          function supprime() {
            G.splice(gi, 1);
            // le drapeau part AVEC son groupe : le laisser décalerait tous les
            // suivants, et un sac resterait posé au sol sans rien pour le dire
            state.inv.comptes.splice(gi, 1);
            items.forEach(function (it) {
              if (it.groupe === gi) it.groupe = 0;
              else if (it.groupe > gi) it.groupe--;
            });
            sel = null;
            render();
            refresh();
          }
          // Un groupe plein emporte ses objets ailleurs : on le dit avant, et
          // par la modale de la fiche, puisque confirm() est muet sous Roll20.
          var dedans = 0;
          items.forEach(function (it) { if (it.groupe === gi) dedans++; });
          if (!dedans) { supprime(); return; }
          confirmer("Supprimer un groupe",
                    "« " + G[gi] + " » contient " + dedans +
                    (dedans > 1 ? " objets" : " objet") +
                    ". Ils rejoindront « " + G[0] + " ».",
                    "Supprimer", supprime);
        });
        head.appendChild(delG);
      }
      g.appendChild(head);

      var tiles = el("div", "pc-obj-tiles");
      tiles.style.setProperty("--obj-cols", O.cols);   // objets par ligne, réglable
      items.forEach(function (it, idx) { if (it.groupe === gi) tiles.appendChild(tile(it, idx)); });
      var add = el("div", "pc-obj-addtile pc-edit-only", "+");
      add.title = "Ajouter un objet dans « " + G[gi] + " »";
      add.addEventListener("click", function () {
        items.push({ nom: "", qte: 1, poids: 0, img: "", desc: "", groupe: gi });
        sel = items.length - 1;
        render();
        refresh();
      });
      tiles.appendChild(add);
      // déposer dans le vide du groupe : l'objet rejoint la fin de ce groupe
      tiles.addEventListener("dragover", function (e) {
        if (dragIdx === null) return;
        e.preventDefault();
        tiles.classList.add("over");
      });
      tiles.addEventListener("dragleave", function () { tiles.classList.remove("over"); });
      tiles.addEventListener("drop", function (e) {
        if (dragIdx === null) return;
        e.preventDefault();
        var from = dragIdx; dragIdx = null;
        moveTo(from, gi, null);
        render();
        refresh();
      });
      g.appendChild(tiles);
      return g;
    }

    function renderPanel() {
      panel.innerHTML = "";
      if (sel === null || !items[sel]) {
        panel.appendChild(el("div", "pc-obj-empty", isEdit("inv")
          ? "Choisir un objet, ou en ajouter un avec « + »."
          : "Choisir un objet."));
        return;
      }
      var it = items[sel];
      var refs = function () { return tileRefs[sel]; };

      var imgbox = el("div", "pc-obj-imgbox");
      if (it.img) { var im = el("img"); im.alt = ""; im.src = it.img; imgbox.appendChild(im); }
      else imgbox.appendChild(el("div", "pc-obj-ph big", "?"));
      panel.appendChild(imgbox);

      var body = el("div", "pc-obj-body");

      var nm = el("input", "nm pc-edit-field");
      nm.type = "text"; nm.placeholder = "Nom de l'objet";
      nm.value = it.nom;
      nm.addEventListener("input", function () {
        it.nom = nm.value;
        if (refs()) refs().nom.textContent = it.nom || "Objet";
        save();
      });
      body.appendChild(nm);

      // quantité : curseur + champ
      var qRow = el("div", "pc-obj-qrow");
      var slider = el("input");
      slider.type = "range"; slider.min = "0";
      slider.max = String(Math.max(10, it.qte));
      slider.value = it.qte;
      slider.step = "any";
      var qIn = el("input", "n");
      qIn.type = "number"; qIn.min = "0"; qIn.step = "any";
      qIn.value = it.qte;
      function setQte(v) {
        // quantités DÉCIMALES : une demi-ration, 2.5 mètres de corde…
        it.qte = isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
        if (+slider.max < it.qte) slider.max = String(it.qte);
        if (document.activeElement !== slider) slider.value = it.qte;
        if (document.activeElement !== qIn) qIn.value = it.qte;
        if (refs()) refs().badge.textContent = "×" + fmtP(it.qte);
        majAct();
        majPile();
        save(); updateTotal();
        refresh();   // le poids porté vient de bouger : le malus de Body suit
      }
      slider.addEventListener("input", function () { setQte(parseFloat(slider.value)); });
      qIn.addEventListener("input", function () { setQte(parseFloat(qIn.value)); });
      qRow.appendChild(slider);
      qRow.appendChild(qIn);
      body.appendChild(fld("Quantité", qRow));

      var pair = el("div", "pc-obj-pair");
      var pd = el("input", "pc-edit-field");
      pd.type = "text"; pd.inputMode = "decimal";
      pd.value = it.poids ? fmtP(it.poids) : "";
      pd.placeholder = "0";
      pd.addEventListener("input", function () {
        it.poids = pnum(pd.value);
        if (refs()) refs().poids.textContent = it.poids ? fmtP(it.poids) : "";
        majPile();
        save(); updateTotal();
        refresh();   // idem : un poids unitaire change le poids porté
      });
      pd.addEventListener("blur", function () { pd.value = it.poids ? fmtP(it.poids) : ""; });
      pair.appendChild(fld("Poids", pd));
      var gSel = el("select", "pc-edit-field");
      G.forEach(function (gn, gi) {
        var o = el("option", null, gn);
        o.value = String(gi);
        if (gi === it.groupe) o.selected = true;
        gSel.appendChild(o);
      });
      gSel.addEventListener("change", function () {
        moveTo(sel, clamp(num(gSel.value, 0), 0, G.length - 1), null);
        render();
        refresh();
      });
      pair.appendChild(fld("Groupe", gSel));
      body.appendChild(pair);

      // achat / vente : la valeur marchande de l'objet, laissée nue comme le
      // poids (MIA ne nomme pas sa monnaie)
      var prix = el("div", "pc-obj-pair");
      [["achat", "Achat"], ["vente", "Vente"]].forEach(function (c) {
        var inp = el("input", "pc-edit-field");
        inp.type = "text"; inp.inputMode = "decimal";
        inp.value = it[c[0]] ? fmtP(it[c[0]]) : "";
        inp.placeholder = "0";
        inp.addEventListener("input", function () { it[c[0]] = pnum(inp.value); save(); });
        inp.addEventListener("blur", function () { inp.value = it[c[0]] ? fmtP(it[c[0]]) : ""; });
        prix.appendChild(fld(c[1], inp));
      });
      body.appendChild(prix);

      // identifiant : c'est LUI qui reconnaît le même objet d'une fiche à
      // l'autre quand on le donne (deux « Corde » sans rapport ne fusionnent
      // pas si elles portent des identifiants différents)
      var idIn = el("input", "pc-edit-field");
      idIn.type = "text"; idIn.placeholder = "libre (ex. corde-chanvre)";
      idIn.value = it.id || "";
      idIn.addEventListener("input", function () { it.id = idIn.value; save(); });
      body.appendChild(fld("Identifiant", idIn, "w pc-edit-only"));

      // total de la pile : ce que cet objet pèse en tout (quantité × poids)
      var pile = el("div", "pc-obj-pile");
      function majPile() {
        pile.textContent = "Total : " + fmtP(it.qte * it.poids);
        pile.style.display = it.poids ? "" : "none";
      }
      majPile();
      body.appendChild(pile);

      var url = el("input", "pc-edit-field");
      url.type = "text"; url.placeholder = "https://…";
      url.value = /^data:/.test(it.img) ? "" : it.img;
      url.addEventListener("change", function () { it.img = url.value.trim(); render(); refresh(); });
      var urlFld = fld("Image (URL)", url);
      var file = el("input");
      file.type = "file"; file.accept = "image/*"; file.style.display = "none";
      file.addEventListener("change", function () {
        var f = file.files && file.files[0];
        file.value = "";   // vidé tout de suite : re-choisir le MÊME fichier redéclenche change
        if (!f) return;
        vignette(f, function (dataUrl) { it.img = dataUrl; render(); refresh(); });
      });
      urlFld.appendChild(file);
      urlFld.appendChild(miniBtn("Fichier…", "Importer une image (réduite en vignette 96 px)", function () { file.click(); }, "pc-edit-only"));
      body.appendChild(urlFld);

      var desc = el("textarea", "pc-notes pc-edit-field");
      desc.rows = 3;
      desc.placeholder = "Description, effets, notes…";
      desc.value = it.desc;
      desc.addEventListener("input", function () { it.desc = desc.value; save(); });
      body.appendChild(fld("Description", desc, "w"));

      // quantité d'ACTION : combien d'exemplaires les boutons ci-dessous
      // traitent. Elle ne touche pas la pile tant qu'on n'agit pas.
      var actQte = el("input", "n");
      actQte.type = "number"; actQte.min = "0"; actQte.step = "any";
      actQte.title = "Quantité traitée par les boutons ci-dessous";
      function bornerAct() {
        var v = pnum(actQte.value);
        if (!v || v > it.qte) v = it.qte;
        return Math.round(v * 100) / 100;
      }
      function majAct() {
        actQte.max = String(it.qte);
        if (document.activeElement !== actQte) actQte.value = fmtP(Math.min(pnum(actQte.value) || it.qte, it.qte));
      }
      actQte.value = fmtP(it.qte);
      actQte.addEventListener("blur", function () { actQte.value = fmtP(bornerAct()); });

      var actions = el("div", "pc-obj-actions");
      actions.appendChild(fld("Quantité", actQte, "qact"));
      actions.appendChild(chatBtn(
        function () { return "Objet — " + (it.nom || "objet"); },
        function () {
          var q = bornerAct();
          return [
            ["Groupe", G[it.groupe]],
            ["Quantité", fmtP(q) + (q < it.qte ? " (sur " + fmtP(it.qte) + ")" : "")],
            ["Poids", it.poids ? fmtP(it.poids) + (q > 1 ? " (total " + fmtP(q * it.poids) + ")" : "") : ""],
            ["Valeur", it.vente ? "vente " + fmtP(it.vente) + (it.achat ? " · achat " + fmtP(it.achat) : "")
                                : (it.achat ? "achat " + fmtP(it.achat) : "")],
            ["", it.desc]   // texte long : pleine largeur, sans libellé
          ];
        }));
      // donner : l'objet quitte CET inventaire et part au tchat sous forme de
      // lien « Prendre » ; le premier qui clique le reçoit dans sa fiche
      actions.appendChild(miniBtn("Donner", "Donner cette quantité à un autre joueur", function () {
        donnerDialogue(it, bornerAct());
      }));
      function retireQte(q, tout) {
        if (tout) {
          items.splice(sel, 1);
          sel = null;
        } else {
          it.qte = Math.round((it.qte - q) * 100) / 100;
        }
        render();
        refresh();
      }
      actions.appendChild(miniBtn("Retirer", "Retirer cette quantité (tout : l'objet disparaît)", function () {
        var q = bornerAct();
        var tout = q >= it.qte;
        // même raison que la croix de la tuile : la modale, jamais confirm(),
        // qui est muet dans l'iframe Roll20 et annulerait le retrait en silence
        if (tout && (it.nom || it.desc)) {
          confirmer("Retirer un objet",
                    "Retirer « " + (it.nom || "cet objet") + " » de l'inventaire ?",
                    "Retirer", function () { retireQte(q, true); });
          return;
        }
        retireQte(q, tout);
      }, "danger pc-edit-only"));
      body.appendChild(actions);
      panel.appendChild(body);
    }

    function render() {
      tileRefs = {};
      grpPoids = [];
      leftBox.innerHTML = "";
      G.forEach(function (_, gi) { leftBox.appendChild(groupBox(gi)); });
      var addG = miniBtn("+ Groupe", "Ajouter un groupe d'objets", function () {
        G.push("Groupe");
        // le drapeau naît AVEC son groupe : un groupe neuf est porté, jamais
        // posé, et le tableau reste parallèle à celui des groupes
        state.inv.comptes.push(true);
        editGi = G.length - 1;   // le nouveau groupe s'ouvre en édition de nom
        render();
        refresh();
      }, "pc-edit-only");
      addG.classList.add("pc-obj-addgroup");
      leftBox.appendChild(addG);
      renderPanel();
      updateTotal();
      applyEdit(container, "inv");
    }
    if (renderRef) renderRef.fn = render;
    invRender = render;   // un objet reçu du tchat redessine l'inventaire
    render();
    container.appendChild(wrap);
    container.appendChild(tot);
  }

  function buildInv() {
    // le rouage re-rend l'inventaire : messages et titres suivent le mode
    var invRenderRef = { fn: null };
    var bO = block("Inventaire", "objets par groupes", "inv", function () {
      if (invRenderRef.fn) invRenderRef.fn();
    });
    invObjets(bO, invRenderRef);
    return bO;
  }

  // ---------- onglet Bio ----------
  function buildPerso() {
    var bP = block("Personnalité", null, "perso");
    var g = el("div", "pc-id");
    var defIn = el("textarea", "pc-notes pc-edit-field");
    defIn.rows = 3;
    defIn.value = state.defaut || "";
    defIn.addEventListener("input", function () { state.defaut = defIn.value; save(); });
    var defFld = fld("Défaut", defIn, "c12");
    defFld.appendChild(chatBtn(
      function () { return "Défaut" + (state.name ? " — " + state.name : ""); },
      function () { return [["", state.defaut]]; }));
    g.appendChild(defFld);
    [0, 1].forEach(function (qi) {
      var qIn = el("textarea", "pc-notes pc-edit-field");
      qIn.rows = 3;
      qIn.value = state.qualites[qi] || "";
      qIn.addEventListener("input", function () { state.qualites[qi] = qIn.value; save(); });
      var qFld = fld("Qualité " + (qi + 1), qIn, "c6");
      qFld.appendChild(chatBtn(
        function () { return "Qualité " + (qi + 1) + (state.name ? " — " + state.name : ""); },
        function () { return [["", state.qualites[qi]]]; }));
      g.appendChild(qFld);
    });
    bP.appendChild(g);
    return bP;
  }

  function buildAvantages() {
    var bA = block("Avantages", null, "avantages");
    var avBox = el("div");
    bA.appendChild(avBox);
    function renderAv() {
      avBox.innerHTML = "";
      state.avantages.forEach(function (a, i) {
        var card = el("div", "pc-av");
        var head = el("div", "pc-av-head");
        var n = el("input", "nm pc-edit-field");
        n.type = "text"; n.placeholder = "Nom"; n.value = a.name || "";
        n.addEventListener("input", function () { a.name = n.value; save(); });
        head.appendChild(n);
        head.appendChild(chatBtn(
          function () { return "Avantage — " + (a.name || "sans nom"); },
          function () { return [["", a.desc]]; }));
        head.appendChild(miniBtn("✕", "Retirer", function () { state.avantages.splice(i, 1); renderAv(); refresh(); }, "danger pc-edit-only"));
        card.appendChild(head);
        var d = el("textarea", "pc-notes pc-edit-field");
        d.rows = 3;
        d.placeholder = "Effet";
        d.value = a.desc || "";
        d.addEventListener("input", function () { a.desc = d.value; save(); });
        card.appendChild(d);
        avBox.appendChild(card);
      });
      if (!state.avantages.length) avBox.appendChild(el("div", "pc-empty", "Aucun avantage."));
      avBox.appendChild(miniBtn("+ Ajouter un avantage", null, function () {
        state.avantages.push({ name: "", desc: "" });
        renderAv();
        refresh();
      }, "pc-edit-only"));
      applyEdit(bA, "avantages");
    }
    renderAv();
    return bA;
  }

  function buildBackground() {
    var bB = block("Background", null, "bg");
    var bg = el("textarea", "pc-notes pc-edit-field");
    bg.rows = 9;
    bg.value = state.background || "";
    bg.addEventListener("input", function () { state.background = bg.value; save(); });
    bB.appendChild(bg);
    return bB;
  }

  function buildNotes() {
    // les Notes restent libres : c'est le carnet de la session, il s'écrit en jeu
    var bN = block("Notes");
    var nt = el("textarea", "pc-notes");
    nt.rows = 6;
    nt.value = state.notes || "";
    nt.addEventListener("input", function () { state.notes = nt.value; save(); });
    bN.appendChild(nt);
    return bN;
  }

  // ---------- onglet Options ----------
  // ---- jets ----
  function buildJets() {
    var bJ = block("Jets");
    var de = el("input", "de");
    de.type = "text";
    de.title = "Ce que la fiche lance pour un jet de test, en macro Roll20.";
    de.value = deTest();
    de.addEventListener("input", function () { state.de = de.value || DE_TEST_DEFAUT; save(); });
    hooks.push(function () { if (document.activeElement !== de) de.value = deTest(); });
    // Le champ et son bouton sur la MÊME ligne : le champ prend toute la place
    // que le bouton lui laisse. Sous le champ, le bouton occupait une rangée
    // entière pour un mot, et le bloc en paraissait deux fois plus haut.
    var ligneDe = el("div", "pc-jet-de");
    ligneDe.appendChild(fld("Dé des jets de test", de));
    ligneDe.appendChild(miniBtn("Réinitialiser", "Revenir à " + DE_TEST_DEFAUT,
      function () { state.de = DE_TEST_DEFAUT; refresh(); }));
    bJ.appendChild(ligneDe);
    return bJ;
  }

  // ---- modificateurs de caractéristiques (hors limite : au-delà de 80, sous 0) ----
  // équipement, art et décisions du MJ confondus : UN modificateur par
  // caractéristique, appliqué au total affiché sur la Fiche
  // MÊME GRILLE QUE LES COMPÉTENCES, et c'est voulu : régler une
  // caractéristique et régler une compétence sont le même geste pour le MJ, il
  // n'a pas à apprendre deux dispositions. Sans le filtre, le menu des champs
  // ni les puces : sur trois lignes, ils ne servent à rien.
  // Les deux champs des grilles d'Options vivent ICI, et non dans un bloc :
  // trois blocs s'en servent désormais (modificateurs de caractéristiques,
  // compétences, Création). Chacun existe en deux formes, une valeur d'un
  // ensemble (map + clé, la plupart des leviers) ou une valeur seule (le
  // budget de points de création) : la première délègue à la seconde, il n'y a
  // donc qu'une implémentation à corriger le jour où l'une d'elles bouge.
  // UN REGISTRE EN DERNIER ARGUMENT, ET IL EST FACULTATIF. Sans lui, le champ
  // s'inscrit dans « hooks », celui de la fiche montée — juste pour un bloc à
  // liste fermée. Une liste OUVERTE (les spécialités) se rebâtit : ses champs
  // doivent s'inscrire dans le registre du rebâti, qui est REMPLACÉ à chaque
  // fois. D'où la règle qui va avec : remettre ce registre à vide AVANT de
  // bâtir le moindre champ, sans quoi les champs poussent dans l'ancien
  // tableau, que plus personne ne joue.
  //
  // C'est l'unique raison pour laquelle l'ancien bloc des compétences avait
  // recopié quatre variantes de ces trois fonctions.
  // un champ de modificateur, nu, comme dans le bloc des compétences
  function champModVal(lire, ecrire, borne, titre, reg) {
    var inp = el("input", "pc-num modif");
    inp.type = "number"; inp.step = String(MOD_PAS);
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      ecrire(isFinite(v) ? clamp(Math.round(v), -borne, borne) : 0);
      refresh();
    });
    (reg || hooks).push(function () {
      if (document.activeElement !== inp) inp.value = lire() ? lire() : "";
    });
    return inp;
  }
  function champMod(map, cle, borne, titre) {
    return champModVal(function () { return map[cle]; },
                       function (v) { map[cle] = v; }, borne, titre);
  }
  // un champ de forçage : vide = valeur calculée (undefined = pas de forçage)
  function champForceVal(lire, ecrire, auto, titre, reg) {
    var inp = el("input", "force");
    inp.type = "number"; inp.step = "1";
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      ecrire(isFinite(v) ? clamp(Math.round(v), -9999, 9999) : undefined);
      refresh();
    });
    (reg || hooks).push(function () {
      inp.placeholder = String(auto());
      var cur = lire();
      if (document.activeElement !== inp) inp.value = cur === undefined ? "" : cur;
    });
    return inp;
  }
  // UN CHAMP DE FACTEUR : vide vaut ×1, et surtout pas zéro. Calqué sur le champ
  // de forçage et non sur celui de modificateur, parce que c'est le NEUTRE qui
  // change — un modificateur vide vaut 0, un facteur vide vaut 1, et un champ
  // qui écrirait 0 en s'effaçant annulerait la caractéristique.
  //
  // LE PAS EST LIBRE : les flèches d'un champ réglé de 5 en 5 (MOD_PAS)
  // sauteraient de ×1 à ×6. Et le forçage, lui, arrondit à l'entier — il ne
  // convenait pas non plus, ×1,5 doit pouvoir se saisir.
  function champMultVal(lire, ecrire, titre, reg) {
    var inp = el("input", "pc-num modif mult");
    inp.type = "number"; inp.step = "any";
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      ecrire(isFinite(v) ? clamp(Math.round(v * 100) / 100, -MULT_BORNE, MULT_BORNE) : undefined);
      refresh();
    });
    (reg || hooks).push(function () {
      inp.placeholder = "1";
      var cur = lire();
      if (document.activeElement !== inp) inp.value = cur === undefined ? "" : cur;
    });
    return inp;
  }
  function champForce(map, cle, auto, titre) {
    return champForceVal(
      function () { return map[cle]; },
      function (v) { if (v === undefined) delete map[cle]; else map[cle] = v; },
      auto, titre);
  }

  // ---- la machinerie commune aux trois blocs de leviers de l'onglet Options ----
  // TROIS BLOCS PORTENT LA MÊME CHOSE : les caractéristiques, les compétences,
  // les spécialités. Chacun range ses réglages ailleurs — une table à trois
  // niveaux, une table sœur, ou l'objet de la spécialité lui-même — mais le
  // GESTE est identique : une bande d'onglets, une grille par onglet, et sur
  // chaque rangée la chaîne à neuf boîtes.
  //
  // TOUT CECI VIVAIT DANS buildOptCaracs, en fermetures. Trois modules ne
  // peuvent pas partager des fermetures : sans ce fichier, la même centaine de
  // lignes serait recopiée deux fois, et corrigée une fois sur trois. C'est
  // exactement ce qui était arrivé aux champs de saisie, dont l'ancien bloc des
  // compétences portait quatre variantes.

  // ---------- la bande d'onglets ----------
  // Rend { onglet, montre } : le bloc en garde ce qu'il veut. L'ONGLET OUVERT
  // NE S'ENREGISTRE PAS — ce n'est pas un état du personnage, et deux fiches du
  // même personnage n'ont pas à s'ouvrir sur le même réglage. On rouvre sur le
  // premier, comme un rouage d'édition se referme au rechargement.
  function bandeOnglets(bloc) {
    var bande = el("div", "pc-tabs mini");
    var corps = el("div");
    bloc.appendChild(bande);
    bloc.appendChild(corps);
    var pages = [];
    function montre(i) {
      pages.forEach(function (p, j) {
        p.bouton.classList.toggle("on", j === i);
        p.page.classList.toggle("on", j === i);
        // UN SEUL ARRÊT DE TABULATION POUR TOUTE LA BANDE. Cinq boutons
        // focalisables, ce sont cinq tabulations entre le titre du bloc et le
        // premier champ qu'on vient régler : la bande coûterait plus cher à
        // traverser qu'à employer. On entre sur l'onglet ouvert, les flèches
        // font le reste.
        p.bouton.tabIndex = j === i ? 0 : -1;
      });
    }
    function onglet(nom, aide, bati) {
      var i = pages.length;
      // UN BOUTON, ET NON UN DIV. Les onglets de la feuille sont des div et ne
      // s'atteignent qu'à la souris ; les segments de la barre d'envoi sont des
      // boutons, et c'est ce précédent-là qui vaut ici. Le navigateur donne
      // alors le focus, Entrée et Espace sans qu'on écrive une ligne pour ça.
      var bouton = el("button", "pc-tab", nom);
      bouton.type = "button";
      // UNE INFOBULLE SEULEMENT QUAND LE MOT EST ABRÉGÉ, et elle ne dit alors
      // que le mot entier : la fiche ne récite pas les règles.
      if (aide) bouton.title = aide;
      bouton.addEventListener("click", function () { montre(i); });
      bouton.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : (e.key === "ArrowLeft" ? -1 : 0);
        if (!d) return;
        e.preventDefault();
        var j = (i + d + pages.length) % pages.length;
        montre(j);
        pages[j].bouton.focus();
      });
      bande.appendChild(bouton);
      // LE COMPTE PART DANS LE HTML : le CSS ne sait pas compter ses enfants, et
      // c'est lui qui décide comment couper une bande longue en deux rangs.
      bande.setAttribute("data-n", String(pages.length + 1));
      var page = el("div", "pc-souspage");
      bati(page);
      corps.appendChild(page);
      pages.push({ bouton: bouton, page: page });
    }
    return { onglet: onglet, montre: montre };
  }

  // ---------- la grille, son entête, ses rangées ----------
  // LA GRILLE ET SON DÉFILEMENT. Les colonnes d'une grille d'Options ont une
  // largeur en rem, pas en parts : sous une certaine largeur de colonne, elles
  // ne rentrent plus, et c'est voulu — un champ de saisie qui se réduit à deux
  // millimètres ne sert plus à rien. L'enveloppe laisse alors défiler.
  function grilleOpt(hote) {
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    hote.appendChild(wrap);
    return box;
  }
  // UN MOT NUL POSE UN FILET, et non un entête vide : la grille des leviers
  // porte des colonnes d'un pixel qui séparent les groupes, et un entête de
  // texte à leur place décalerait tout d'une colonne.
  function enteteOpt(hote, cls, mots) {
    var head = el("div", "pc-optcomp-row " + cls + " head");
    mots.forEach(function (h) {
      if (!h) { head.appendChild(el("span", "rule")); return; }
      var sp = el("span", h[2] || null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    hote.appendChild(head);
    return head;
  }
  function rangeeOpt(hote, cls, i) {
    var row = el("div", "pc-optcomp-row " + cls + (i % 2 === 1 ? " odd" : ""));
    hote.appendChild(row);
    return row;
  }
  // Une rangée qui se nomme par un SIGLE : caractéristiques et compétences. Le
  // nom entier tient dans l'infobulle — la colonne est trop étroite pour
  // « Détermination ».
  function rangeeSigle(hote, cls, code, i, nom) {
    var row = rangeeOpt(hote, cls, i);
    var nameBox = el("span", "pc-comp-name");
    var chip = el("span", "pc-abbr", code);
    chip.title = nom || code;
    nameBox.appendChild(chip);
    row.appendChild(nameBox);
    return row;
  }
  // Une rangée qui se nomme par un NOM : les spécialités, qui n'ont pas de
  // sigle. Le nom se coupe à l'ellipse et se lit entier en infobulle.
  function rangeeNom(hote, cls, nom, i, titre) {
    var row = rangeeOpt(hote, cls, i);
    var nameBox = el("span", "pc-comp-name");
    var lab = el("span", "pc-comp-label", nom || "Sans nom");
    lab.title = titre || nom || "";
    nameBox.appendChild(lab);
    row.appendChild(nameBox);
    return row;
  }

  // ---------- lire et écrire une boîte, sans rien matérialiser ----------
  // On ne passe PAS par champMod(map, clé, …), qui exige une table existante :
  // l'appeler au montage créerait toutes les sous-tables chez tout personnage
  // qui ouvre simplement les Options, et l'état, qui voyage dans un seul
  // attribut Roll20, s'alourdirait d'objets vides pour rien.
  //
  // Ces fermetures ne créent qu'à l'écriture, et DÉFONT le chemin quand la
  // dernière valeur s'en va.
  function boitesTable(nomTable) {
    return {
      lire: function (nom, cle) {
        return function (boite) {
          var t = state[nomTable] && state[nomTable][nom];
          var tb = t && t[boite];
          var v = tb && tb[cle];
          return (typeof v === "number" && isFinite(v)) ? v : undefined;
        };
      },
      ecrire: function (nom, boite, cle, v) {
        if (!state[nomTable] || typeof state[nomTable] !== "object") state[nomTable] = {};
        var lv = state[nomTable];
        if (v === undefined || v === null) {
          if (!lv[nom] || !lv[nom][boite]) return;
          delete lv[nom][boite][cle];
          if (!Object.keys(lv[nom][boite]).length) delete lv[nom][boite];
          if (!Object.keys(lv[nom]).length) delete lv[nom];
          return;
        }
        if (!lv[nom]) lv[nom] = {};
        if (!lv[nom][boite]) lv[nom][boite] = {};
        lv[nom][boite][cle] = v;
      }
    };
  }
  // LA SPÉCIALITÉ SE PREND VIVANTE, jamais capturée au montage : la liste bouge
  // sous la ligne (ajout, suppression, glissement), et une référence figée
  // écrirait dans un objet que l'état ne porte plus.
  function boitesSpe() {
    return {
      lire: function (nom, vivante) {
        return function (boite) {
          var s = vivante();
          var l = s && s.leviers && s.leviers[nom];
          var v = l && l[boite];
          return (typeof v === "number" && isFinite(v)) ? v : undefined;
        };
      },
      ecrire: function (nom, boite, vivante, v) {
        var s = vivante();
        if (!s) return;
        if (v === undefined || v === null) {
          if (!s.leviers || !s.leviers[nom]) return;
          delete s.leviers[nom][boite];
          if (!Object.keys(s.leviers[nom]).length) delete s.leviers[nom];
          if (!Object.keys(s.leviers).length) delete s.leviers;
          return;
        }
        if (!s.leviers) s.leviers = {};
        if (!s.leviers[nom]) s.leviers[nom] = {};
        s.leviers[nom][boite] = v;
      }
    };
  }

  // ---------- ce qui compte comme « réglé », et ce que la chaîne a fait ----------
  // UNE BOÎTE QUI NE CHANGE RIEN NE COMPTE PAS : un ajout de zéro et un facteur
  // de un sont le NEUTRE de leur opération. Un forçage, si — forcer une valeur
  // à zéro est un réglage, et le seul moyen d'obtenir zéro à coup sûr.
  var BOITES_LEV = [["force", null], ["a1", 0], ["a2", 0], ["m1", 1], ["m2", 1],
                    ["a3", 0], ["a4", 0], ["m3", 1], ["m4", 1]];
  function levierRegleDe(lire) {
    for (var i = 0; i < BOITES_LEV.length; i++) {
      var v = lire(BOITES_LEV[i][0]);
      if (v === undefined) continue;
      if (BOITES_LEV[i][1] !== null && v === BOITES_LEV[i][1]) continue;
      return true;
    }
    return false;
  }
  // CE QUE LA CHAÎNE A FAIT, RELU DANS L'ORDRE : la base d'abord, puis chaque
  // boîte réglée. C'est l'infobulle du dernier nombre, et la seule façon
  // honnête de dire d'où il sort — une phrase écrite d'avance mentirait dès
  // qu'un facteur est posé.
  function chaineTexteDe(lire, motBase, base) {
    var f = lire("force");
    if (f !== undefined) return "Forcé à " + f;
    var out = motBase + " " + base;
    [["a1", " · ", 0], ["a2", " · ", 0], ["m1", " · ×", 1], ["m2", " · ×", 1],
     ["a3", " · ", 0], ["a4", " · ", 0], ["m3", " · ×", 1], ["m4", " · ×", 1]]
      .forEach(function (d) {
        var v = lire(d[0]);
        // le neutre ne se dit pas : « de la table 400 · +0 » se lit deux fois
        // avant de vouloir dire qu'il ne s'est rien passé
        if (v === undefined || v === d[2]) return;
        out += d[1] + (d[0].charAt(0) === "m" ? v : sign(v));
      });
    return out;
  }

  // ---------- LA GRILLE D'UN LEVIER ----------
  // Les onglets des trois blocs l'appellent, et ne diffèrent que par ce qu'ils
  // lui passent.
  //
  // LES ENTÊTES DES HUIT CHAMPS SONT DES SIGNES, et il n'y a pas d'alternative
  // honnête : la colonne fait 1,25 rem, aucun mot n'y tient, et deux « MODIF. »
  // de suite ne diraient pas lequel vient avant l'autre. « ＋ » et « × » disent
  // ce que la case CONTIENT ; « avant » et « après » diraient où elle tombe
  // dans un calcul, c'est-à-dire la règle, qui n'a pas sa place ici.
  //
  // opts :
  //   cls     la classe de grille ("levier")
  //   lignes  [{ cle, nom, titre }] — ce qui va en colonne de gauche
  //   rangee  (hote, cls, ligne, i) -> l'élément de rangée
  //   lire    (cle) -> (boîte) -> nombre|undefined
  //   ecrire  (cle, boîte, v) ; v undefined DÉFAIT le chemin
  //   mot     [libellé, infobulle] de la dernière colonne
  //   borne   999 ou 9999, l'échelle des ajouts
  //   auto    (cle) -> le filigrane du champ forcé
  //   rendu   (cle) -> { texte, titre, zero }
  //   reg     le registre de rafraîchissement où pousser
  function grilleLevier(page, opts) {
    var box = grilleOpt(page);
    var reg = opts.reg || hooks;
    enteteOpt(box, opts.cls, [
      opts.entete || ["Nom", "Ce que la rangée règle"],
      ["Forcé", "Valeur imposée — vide = valeur calculée", "fo"],
      ["＋", "Deux nombres qui s'ajoutent avant les facteurs", "duo op"],
      null,
      ["×", "Deux facteurs — vide = ×1", "duo op"],
      null,
      ["＋", "Deux nombres qui s'ajoutent après les premiers facteurs", "duo op"],
      null,
      ["×", "Deux facteurs de plus — vide = ×1", "duo op"],
      opts.mot
    ]);
    opts.lignes.forEach(function (ligne, i) {
      var cle = ligne.cle;
      var lire = opts.lire(cle);
      var row = opts.rangee(box, opts.cls, ligne, i);
      row.appendChild(champForceVal(
        function () { return lire("force"); },
        function (v) { opts.ecrire(cle, "force", v); },
        function () { return opts.auto(cle); },
        "Valeur imposée — vide = valeur calculée.", reg));
      ["a1", "a2"].forEach(function (bx) { row.appendChild(ajout(bx)); });
      row.appendChild(el("span", "rule"));
      ["m1", "m2"].forEach(function (bx) { row.appendChild(facteur(bx)); });
      row.appendChild(el("span", "rule"));
      ["a3", "a4"].forEach(function (bx) { row.appendChild(ajout(bx)); });
      row.appendChild(el("span", "rule"));
      ["m3", "m4"].forEach(function (bx) { row.appendChild(facteur(bx)); });
      var out = el("span", "pc-comp-total", "");
      row.appendChild(out);
      reg.push(function () {
        var r = opts.rendu(cle);
        var regle = levierRegleDe(opts.lire(cle));
        out.textContent = r.texte;
        out.classList.toggle("adj", regle);
        if (r.zero !== undefined) out.classList.toggle("zero", r.zero);
        out.title = r.titre;
        row.classList.toggle("on", regle);
      });
      function ajout(bx) {
        return champModVal(
          function () { return opts.lire(cle)(bx); },
          function (v) { opts.ecrire(cle, bx, v ? v : undefined); }, opts.borne,
          "Nombre qui s'ajoute — vide = aucun.", reg);
      }
      function facteur(bx) {
        return champMultVal(
          function () { return opts.lire(cle)(bx); },
          function (v) { opts.ecrire(cle, bx, v); },
          "Facteur — vide = ×1.", reg);
      }
    });
  }
  // ---- onglet Options : LES CARACTÉRISTIQUES, TOUT CE QUI SE RÈGLE ----
  // UN SEUL BLOC, ET SEPT ONGLETS DEDANS. Il y avait quatre blocs — plafond,
  // modificateur, limite, écart — plus le coût en xp, soit autant de titres pour
  // un seul et même geste : régler les huit caractéristiques.
  //
  // LES SEPT ONGLETS PORTENT LA MÊME GRILLE, et c'est tout le sujet : ce qui
  // change de l'un à l'autre, ce n'est pas le geste, c'est ce sur quoi il porte.
  //
  //     Carac. | Forcé | ＋ ＋ | × × | ＋ ＋ | × × | ce que ça donne
  //
  // soit, de gauche à droite, la chaîne elle-même (voir chaine() dans
  // 080-calculs-caracs.js) : le forcé s'il est rempli, sinon deux ajouts sur la
  // base, deux facteurs, deux ajouts, deux facteurs encore — QUATRE groupes,
  // parce que trois ne savent pas tout dire : un ajout posé après la dernière
  // multiplication ne pouvait plus être multiplié.
  //
  // LA MACHINERIE EST COMMUNE (voir commun-leviers.js) : les compétences et les
  // spécialités portent la même, et une correction ne s'écrit qu'une fois.
  //
  // SEPT ONGLETS, ET LES TROIS PREMIERS SE LISENT DANS L'ORDRE DU CALCUL :
  //
  //     VALEUR (chaîne)  →  coiffée par le PLAFOND  →  plus le BONUS (chaîne)
  //
  // « Valeur » est à GAUCHE de « Plafond » parce que le plafond mord sur ce que
  // la valeur a produit, et non l'inverse. Le bonus vient après la coiffe : il
  // n'est borné par rien, et c'est ce qui le distingue d'un point acheté.
  //
  // Les quatre suivants ne touchent plus à ce que la caractéristique VAUT, mais
  // à ce qu'elle COÛTE (xp) et à ce qu'elle DONNE — son modificateur, sa
  // limite, l'écart qu'elle impose aux spécialités.
  function buildOptCaracs() {
    var b = block("Caractéristiques");
    var bande = bandeOnglets(b);
    var B = boitesTable("caracsLeviers");

    // L'ORDRE DES SEPT SUIT CELUI DE LA VIE D'UNE CARACTÉRISTIQUE, et il se lit
    // en deux temps. D'abord ce qu'elle VAUT : la valeur, ce qu'elle ne peut pas
    // dépasser (plafond), ce qui s'y ajoute ensuite (bonus), ce qu'elle coûte
    // (xp). Ensuite ce qu'elle DONNE une fois achetée : ce qu'elle ajoute au jet
    // (modificateur), ce qui coiffe le résultat (limite), et l'écart que cette
    // limite impose aux spécialités — chacun découlant du précédent.
    function tab(titre, aide, nom, mot, borne, auto, rendu) {
      bande.onglet(titre, aide, function (p) {
        grilleLevier(p, {
          cls: "levier",
          entete: ["Carac.", "Caractéristique"],
          lignes: champs().map(function (c) {
            return { cle: c, nom: c, titre: caracInfo(c).nom };
          }),
          rangee: function (hote, cls, ligne, i) {
            return rangeeSigle(hote, cls, ligne.nom, i, ligne.titre);
          },
          lire: function (c) { return B.lire(nom, c); },
          ecrire: function (c, boite, v) { B.ecrire(nom, boite, c, v); },
          mot: mot, borne: borne, auto: auto, rendu: rendu
        });
      });
    }

    // ---------- Valeur ----------
    // CE QUE LA CARACTÉRISTIQUE VAUT. La base est ce que le joueur a acheté sur
    // la Fiche ; le plafond mord ensuite sur ce que la chaîne rend, et le
    // dernier nombre de la rangée le montre déjà coiffé.
    //
    // LE FORÇAGE EST COIFFÉ LUI AUSSI. Forcer n'est pas passer outre : pour
    // dépasser, on lève le plafond, qui a son onglet juste à droite.
    tab("Valeur", "", "valeur", ["Valeur", "Valeur effective"], 999,
      caracValeurAuto,
      function (c) {
        var v = caracValeur(c), brut = caracValeurBrut(c);
        return { texte: String(v),
                 titre: chaineTexteDe(lireCarac("valeur", c), "achetée", caracBase(c)) +
                        (brut > caracPlafond(c) ? " · plafonnée à " + caracPlafond(c) : "") };
      });

    // ---------- Plafond ----------
    // CE QU'UNE CARACTÉRISTIQUE NE PEUT PAS DÉPASSER. La base est le prestige,
    // qui range le personnage. Le prestige lui-même reste dans « Création » : il
    // n'appartient à aucune des huit, il les coiffe toutes.
    tab("Plafond", "", "plafond", ["Plafond", "Plafond effectif"], 999,
      caracPlafondAuto,
      function (c) {
        return { texte: String(caracPlafond(c)),
                 titre: chaineTexteDe(lireCarac("plafond", c), "prestige", prestige()) };
      });

    // ---------- Bonus ----------
    // CE QUI S'AJOUTE APRÈS LA COIFFE, et que rien ne borne : un équipement, un
    // avantage, une bénédiction. La base est la case Bonus de la Fiche.
    tab("Bonus", "", "bonus", ["Bonus", "Bonus effectif"], 999,
      caracBonusAuto,
      function (c) {
        var b = caracBonus(c);
        return { texte: sign(b), zero: !b,
                 titre: chaineTexteDe(lireCarac("bonus", c), "de la Fiche", caracBonusSocle(c)) };
      });

    // ---------- XP ----------
    // CE QU'ELLE COÛTE. Le coût se lit sur la valeur ACHETÉE, jamais sur le
    // total : ni le bonus ni la valeur accordée par un levier ne se paient.
    tab("XP", "", "xp", ["Coût", "Coût effectif en xp"], 9999,
      caracXpAuto,
      function (c) {
        var xp = caracXp(c);
        return { texte: xp + " xp", zero: !xp,
                 titre: chaineTexteDe(lireCarac("xp", c), "valeur " + caracBase(c) + " :",
                                      ligneValeur(caracBase(c)).xp) };
      });

    // ---------- Modificateur ----------
    tab("Modif.", "Modificateur", "mod", ["MOD", "Modificateur effectif"], 999,
      caracModAuto,
      function (c) {
        return { texte: sign(caracMod(c)),
                 titre: chaineTexteDe(lireCarac("mod", c), "de la table", caracModTable(c)) };
      });

    // ---------- Limite ----------
    // LA LIMITE SEULE, et c'est le seul levier qui resserre l'écart d'une
    // spécialité sous son minimum : le rabattage se calcule sur la limite
    // NATURELLE, que celui-ci ne touche pas (voir caracLimNat).
    tab("Limite", "", "lim", ["Limite", "Limite effective"], 9999,
      caracLimAuto,
      function (c) {
        return { texte: String(caracLim(c)),
                 titre: chaineTexteDe(lireCarac("lim", c), "de la table", caracLimTable(c)) };
      });

    // ---------- Écart ----------
    // PREMIER ÉTAGE DE LA CASCADE : ce qui se règle ici descend sur les
    // compétences, et des compétences sur les spécialités.
    //
    // Son forçage est l'ancienne case unique : une valeur, et non un décalage —
    // on pense « l'écart doit être de 30 », jamais « je décale de −20 ».
    //
    // L'interrupteur qui SUSPEND la règle n'est pas ici : il a son bloc (voir
    // ecart-regle.js). Les cinq onglets décalent un seuil, caractéristique par
    // caractéristique ; lui suspend la règle pour le personnage entier.
    tab("Écart", "", "ecart", ["Écart", "Écart minimum effectif"], 9999,
      ecartMinAuto,
      function (c) {
        return { texte: String(ecartMin(c)),
                 titre: chaineTexteDe(lireCarac("ecart", c), "des règles", repli("speMarge")) };
      });

    bande.montre(0);
    return b;
  }
  // ---- la règle de l'écart : un interrupteur, et rien d'autre ----
  // UN BLOC À LUI SEUL, ET IL LE REDEVIENT. Il avait été rangé en tête de
  // l'onglet Écart du bloc des caractéristiques, au motif qu'on ne le cherche
  // nulle part ailleurs qu'à l'endroit où l'écart se règle. C'était une erreur
  // de nature : les cinq onglets d'à côté DÉCALENT un seuil, caractéristique
  // par caractéristique ; celui-ci SUSPEND une règle, pour le personnage
  // entier. On ne coche pas l'un en croyant régler l'autre, et un réglage qui
  // porte sur toute la fiche n'a pas à se cacher dans l'onglet d'une des huit.
  //
  // Il ne pose AUCUN avertissement en tête de fiche : c'est un réglage voulu,
  // pas un état du personnage. Ce qu'il fait se lit ici, là où on le coche.
  function buildEcartRegle() {
    var b = block("Règle de l'écart");
    var row = el("div", "pc-kv");
    var lab = el("label", "pc-case-mot");
    var boite = el("input");
    boite.type = "checkbox";
    boite.addEventListener("change", function () {
      state.ecartCoupe = boite.checked;
      save();
      refresh();
    });
    hooks.push(function () { boite.checked = !!state.ecartCoupe; });
    lab.appendChild(boite);
    lab.appendChild(el("span", "t", "Désactiver la règle d'écart pour ce personnage"));
    row.appendChild(lab);
    b.appendChild(row);
    return b;
  }
  // ---- onglet Options : LES COMPÉTENCES, TOUT CE QUI SE RÈGLE ----
  // SIX ONGLETS, MÊME GRILLE QUE LES CARACTÉRISTIQUES, et pour la même raison :
  // ce qui change de l'un à l'autre, ce n'est pas le geste, c'est ce sur quoi il
  // porte. Ce bloc portait autrefois les compétences ET les spécialités dans une
  // seule grille à dix colonnes ; les spécialités ont maintenant le leur.
  //
  // L'ORDRE SUIT CE QU'UNE COMPÉTENCE EST : d'où elle tient (sa
  // caractéristique), puis les trois étages du calcul —
  //
  //     VALEUR (chaîne)  →  coiffée par le PLAFOND  →  plus le BONUS (chaîne)
  //
  // — puis ce qu'elle coûte (l'xp) et le seuil qu'elle transmet à ses
  // spécialités (l'écart). « Valeur » est à GAUCHE de « Plafond » parce que le
  // plafond mord sur ce que la valeur a produit, et non l'inverse.
  //
  // « LIMITE » EST UN ÉTAGE, PAS UNE VALEUR PROPRE : une compétence n'a pas de
  // limite à elle, elle DÉCALE celle de la caractéristique employée, et passe
  // la sienne à ses spécialités. Même cascade que l'écart, et pour la même
  // raison : les trois étages mesurent un résultat de jet, donc l'un peut
  // servir de base au suivant.
  //
  // PAS D'ONGLET « MOD » en revanche : une compétence apporte des POINTS, et le
  // mot « CARAC » de sa ligne dit bien que le modificateur vient d'ailleurs.
  function buildOptComps() {
    var b = block("Compétences");
    var bande = bandeOnglets(b);
    var B = boitesTable("compsLeviers");

    function lignes() {
      return champsComp().map(function (k) {
        return { cle: k, nom: k, titre: compInfo(k).nom };
      });
    }
    function tab(titre, aide, nom, mot, borne, auto, rendu) {
      bande.onglet(titre, aide, function (p) {
        grilleLevier(p, {
          cls: "levier",
          entete: ["Comp.", "Compétence"],
          lignes: lignes(),
          rangee: function (hote, cls, ligne, i) {
            return rangeeSigle(hote, cls, ligne.nom, i, ligne.titre);
          },
          lire: function (k) { return B.lire(nom, k); },
          ecrire: function (k, boite, v) { B.ecrire(nom, boite, k, v); },
          mot: mot, borne: borne, auto: auto, rendu: rendu
        });
      });
    }

    // ---------- Caractéristique ----------
    // DEUX CHOSES QUE LES RÈGLES DISENT, ET QUE LE MENEUR PEUT DIRE AUTREMENT :
    // la caractéristique qui lance la compétence par défaut, et celles dont le
    // MOD commande son plafond de points.
    //
    // ELLES SE RÈGLENT PARCE QU'UN AVANTAGE CHANGE UNE FICHE. Un avantage n'est
    // que du texte : rien d'autre que ces réglages ne peut faire entrer sa
    // conséquence chiffrée.
    //
    // L'ÉTAT NE PORTE QUE LA SURCHARGE. Choisir ce que disent les règles, c'est
    // ne rien régler : on efface alors la clé, sans quoi la ligne cesserait de
    // dire ce qui a été touché, et un sigle changé dans la page laisserait le
    // personnage sur l'ancien sans que rien ne le dise.
    bande.onglet("Carac.", "Caractéristique", function (p) {
      var box = grilleOpt(p);
      var mots = [["Comp.", "Compétence"], ["Jet", "La caractéristique qui la lance par défaut"], null];
      champs().forEach(function (c) { mots.push([c, caracInfo(c).nom]); });
      enteteOpt(box, "carac", mots);
      champsComp().forEach(function (k, i) {
        var row = rangeeSigle(box, "carac", k, i, compInfo(k).nom);
        // le sélecteur : les huit sigles, le nom entier en infobulle de chacun
        var sel = el("select", "pc-select");
        champs().forEach(function (c) {
          var o = el("option", null, c);
          o.value = c;
          o.title = caracInfo(c).nom + (c === (compInfo(k).lim || "") ? " — des règles" : "");
          sel.appendChild(o);
        });
        sel.addEventListener("change", function () {
          if (!state.compsCarac) state.compsCarac = {};
          if (sel.value === (compInfo(k).lim || "")) delete state.compsCarac[k];
          else state.compsCarac[k] = sel.value;
          refresh();
        });
        row.appendChild(sel);
        row.appendChild(el("span", "rule"));
        // les huit cases : indépendantes les unes des autres, parce que le
        // plafond peut relever de plusieurs caractéristiques à la fois
        var cases = [];
        champs().forEach(function (c) {
          var bt = el("button", "pc-case-plaf");
          bt.type = "button";
          bt.title = caracInfo(c).nom;
          bt.addEventListener("click", function () {
            var liste = compsPlafondDe(k).slice();
            var j = liste.indexOf(c);
            if (j >= 0) liste.splice(j, 1); else liste.push(c);
            if (!state.compsCaracsPlafond) state.compsCaracsPlafond = {};
            // MÊME LISTE QUE LES RÈGLES = AUCUN RÉGLAGE. On compare sur l'ordre
            // des règles, que la normalisation impose déjà aux deux côtés.
            var regle = compInfo(k).mod || [];
            var ordonnee = champs().filter(function (x) { return liste.indexOf(x) >= 0; });
            var pareil = ordonnee.length === regle.length &&
                         ordonnee.every(function (x, n) { return x === regle[n]; });
            if (pareil) delete state.compsCaracsPlafond[k];
            else state.compsCaracsPlafond[k] = ordonnee;
            refresh();
          });
          cases.push({ code: c, bt: bt });
          row.appendChild(bt);
        });
        hooks.push(function () {
          var surcharge = state.compsCarac && state.compsCarac[k] !== undefined;
          if (document.activeElement !== sel) sel.value = compCarac(k);
          var liste = compsPlafondDe(k);
          cases.forEach(function (x) {
            x.bt.classList.toggle("on", liste.indexOf(x.code) >= 0);
          });
          var surP = state.compsCaracsPlafond && state.compsCaracsPlafond[k] !== undefined;
          row.classList.toggle("on", !!surcharge || !!surP);
        });
      });
    });

    // ---------- Valeur ----------
    // LES POINTS DE LA COMPÉTENCE. La base est ce que le joueur a acheté, BRUT :
    // le plafond mord ensuite sur ce que la chaîne rend.
    //
    // C'ÉTAIT L'INVERSE, ET C'ÉTAIT FAUX : la chaîne partait d'une base déjà
    // coiffée ET déjà bonifiée, et son résultat n'était re-coiffé par rien.
    tab("Valeur", "", "valeur", ["Valeur", "Points effectifs"], 999,
      compValeurAuto,
      function (k) {
        var brut = compValeurBrut(k);
        return { texte: String(compValeur(k)),
                 titre: chaineTexteDe(lireComp("valeur", k), "achetés", compValeurSocle(k)) +
                        (brut > compPlafond(k) ? " · plafonnés à " + compPlafond(k) : "") };
      });

    // ---------- Plafond ----------
    // CE QU'UNE COMPÉTENCE NE PEUT PAS DÉPASSER EN POINTS : le meilleur MOD des
    // caractéristiques qui la commandent — celles du premier onglet.
    tab("Plafond", "", "plafond", ["Plafond", "Plafond effectif de points"], 999,
      compPlafondAuto,
      function (k) {
        return { texte: String(compPlafond(k)),
                 titre: chaineTexteDe(lireComp("plafond", k), "le meilleur MOD :",
                                      compPlafondSocle(k)) };
      });

    // ---------- Bonus ----------
    // CE QUI S'AJOUTE APRÈS LA COIFFE, et que rien ne borne. La base est la case
    // Bonus de la ligne, sur la Fiche.
    tab("Bonus", "", "bonus", ["Bonus", "Bonus effectif"], 999,
      compBonusAuto,
      function (k) {
        var b = compBonus(k);
        return { texte: sign(b), zero: !b,
                 titre: chaineTexteDe(lireComp("bonus", k), "de la Fiche", compBonusSocle(k)) };
      });

    // ---------- XP ----------
    tab("XP", "", "xp", ["Coût", "Coût effectif en xp"], 9999,
      compXpAuto,
      function (k) {
        var xp = compXp(k);
        return { texte: xp + " xp", zero: !xp,
                 titre: chaineTexteDe(lireComp("xp", k), "points achetés :", compXpSocle(k)) };
      });

    // ---------- Limite ----------
    // DEUXIÈME ÉTAGE DE SA CASCADE : la base est la limite de la
    // caractéristique qui lance la compétence, et ce qu'on règle ici descend
    // sur les spécialités qui en relèvent.
    tab("Limite", "", "lim", ["Limite", "Limite effective du jet"], 9999,
      function (k) { return compLimAuto(k); },
      function (k) {
        return { texte: String(compLim(k)),
                 titre: chaineTexteDe(lireComp("lim", k),
                                      "de " + compCarac(k) + " :", caracLim(compCarac(k))) };
      });

    // ---------- Écart ----------
    // DEUXIÈME ÉTAGE DE LA CASCADE : la base est l'écart de la caractéristique
    // qui lance la compétence, et ce qu'on règle ici descend sur les
    // spécialités qui en relèvent.
    tab("Écart", "", "ecart", ["Écart", "Écart minimum effectif"], 9999,
      function (k) { return ecartCompAuto(k); },
      function (k) {
        return { texte: String(ecartComp(k)),
                 titre: chaineTexteDe(lireComp("ecart", k),
                                      "de " + compCarac(k) + " :", ecartMin(compCarac(k))) };
      });

    bande.montre(0);
    return b;
  }
  // ---- onglet Options : LES SPÉCIALITÉS, TOUT CE QUI SE RÈGLE ----
  // SON PROPRE BLOC, ET NON PLUS LA MOITIÉ DROITE DE CELUI DES COMPÉTENCES. Une
  // spécialité n'est pas une compétence : sa liste est OUVERTE, elle se nomme au
  // lieu de porter un sigle, et elle se rebâtit à chaque ajout.
  //
  // SIX ONGLETS : Valeur, Plafond, Bonus, XP, Limite, Écart — le même ordre
  // que les deux autres blocs, « Valeur » à gauche de « Plafond », et la limite
  // juste avant l'écart, qui en découle.
  //
  // SON PLAFOND NE MORD QUE S'IL EST RÉGLÉ, et c'est la seule différence avec
  // les deux autres blocs : les règles n'en donnent aucun à une spécialité. Le
  // nombre montré est celui qui mordrait, non celui qui mord.
  //
  // LE BONUS A SA CHAÎNE À LUI, et il ne pouvait pas entrer dans celle de la
  // valeur : il s'ajoute APRÈS le rabattage de l'écart, et l'y faire entrer
  // ferait rabattre la spécialité par son propre bonus.
  //
  // CE QUI N'A TOUJOURS PAS D'ONGLET : la CARACTÉRISTIQUE et la COMPÉTENCE.
  // Deux sélecteurs les portent déjà sur la ligne de la Fiche, et deux endroits
  // pour dire la même chose finissent par se contredire.
  function buildOptSpes() {
    var b = block("Spécialités");
    var bande = bandeOnglets(b);
    var B = boitesSpe();
    // LE REGISTRE EST CELUI DU SOCLE, « optSpesHooks », et surtout pas un
    // tableau à nous : refresh() ne joue que les registres qu'il connaît
    // (voir 150-refresh.js). Un tableau local recueillait bien les fonctions,
    // et PERSONNE ne les appelait — le bloc restait vide, sans une faute, sans
    // un message : les champs s'affichaient, aucun nombre n'y entrait jamais.
    //
    // LA LISTE EST OUVERTE : elle se rebâtit, donc le registre se remet à vide
    // AVANT qu'un seul champ ne s'y inscrive — sans quoi les fonctions des
    // lignes détruites rafraîchiraient des éléments qui ont quitté la page.

    // LA SPÉCIALITÉ SE PREND VIVANTE, jamais capturée au montage : la liste
    // bouge sous la ligne (ajout, suppression, glissement), et une référence
    // figée écrirait dans un objet que l'état ne porte plus.
    function vivante(i) {
      return function () { return (state.specialites || [])[i]; };
    }

    function lignes() {
      return (state.specialites || []).map(function (sp, i) {
        return { cle: i, index: i, spe: sp,
                 nom: sp.nom || "Sans nom",
                 titre: (sp.nom || "Sans nom") +
                        (sp.carac || sp.comp ? " — " + (sp.carac || "—") + " · " + (sp.comp || "—") : "") };
      });
    }

    function tab(titre, aide, nom, mot, borne, auto, rendu) {
      bande.onglet(titre, aide, function (p) {
        var corps = el("div");
        p.appendChild(corps);
        function bati() {
          corps.innerHTML = "";
          var liste = lignes();
          if (!liste.length) {
            corps.appendChild(el("div", "pc-empty", "Aucune spécialité."));
            return;
          }
          grilleLevier(corps, {
            cls: "levier",
            entete: ["Spé.", "Spécialité"],
            lignes: liste,
            rangee: function (hote, cls, ligne, i) {
              var row = rangeeNom(hote, cls, ligne.nom, i, ligne.titre);
              // LE NOM SE RELIT À CHAQUE PASSE : rangeeNom l'écrit une fois, et
              // renommer une spécialité ne rebâtit rien. Le bloc gardait donc
              // l'ancien nom jusqu'au prochain ajout ou retrait.
              var lab = row.querySelector(".pc-comp-label");
              if (lab) optSpesHooks.push(function () {
                var sp = (state.specialites || [])[ligne.index];
                if (!sp) return;
                var n = sp.nom || "Sans nom";
                if (lab.textContent !== n) lab.textContent = n;
                lab.title = n + (sp.carac || sp.comp
                  ? " — " + (sp.carac || "—") + " · " + (sp.comp || "—") : "");
              });
              return row;
            },
            lire: function (i) { return B.lire(nom, vivante(i)); },
            ecrire: function (i, boite, v) { B.ecrire(nom, boite, vivante(i), v); },
            mot: mot, borne: borne,
            auto: function (i) { return auto((state.specialites || [])[i]); },
            rendu: function (i) { return rendu((state.specialites || [])[i], i); },
            reg: optSpesHooks
          });
        }
        bati();
        rebatis.push(bati);
      });
    }
    // Les onglets se rebâtissent ENSEMBLE : une spécialité ajoutée apparaît
    // partout, pas seulement dans celui qu'on regarde.
    var rebatis = [];

    // ---------- Valeur ----------
    tab("Valeur", "", "valeur", ["Valeur", "Les points employés au jet"], 999,
      spePtsAuto,
      function (sp, i) {
        return { texte: String(spePts(sp)),
                 titre: chaineTexteDe(B.lire("valeur", vivante(i)), "points achetés :",
                                      (sp && sp.pts) || 0) };
      });

    // ---------- Plafond ----------
    // LA BASE VIENT DE SA COMPÉTENCE, et sans compétence du MOD de sa
    // caractéristique. Tant qu'aucune boîte n'est réglée, rien ne mord.
    tab("Plafond", "", "plafond", ["Plafond", "Plafond effectif des points"], 999,
      spePlafondAuto,
      function (sp, i) {
        var pose = sp ? spePlafondPose(sp) : false;
        return { texte: sp && pose ? String(spePlafond(sp)) : "—", zero: !pose,
                 titre: chaineTexteDe(B.lire("plafond", vivante(i)),
                                      sp && sp.comp ? "de " + sp.comp + " :"
                                                    : "de " + ((sp && sp.carac) || "—") + " :",
                                      sp ? spePlafondSocle(sp) : 0) };
      });

    // ---------- Bonus ----------
    // CE QUI S'AJOUTE APRÈS LE RABATTAGE DE L'ÉCART. La base est la case Bonus
    // de la ligne, sur la Fiche.
    tab("Bonus", "", "bonus", ["Bonus", "Bonus effectif"], 999,
      speBonusAuto,
      function (sp, i) {
        var b = speBonus(sp);
        return { texte: sign(b), zero: !b,
                 titre: chaineTexteDe(B.lire("bonus", vivante(i)), "de la Fiche",
                                      speBonusSocle(sp)) };
      });

    // ---------- XP ----------
    // Un point de spécialité coûte un QUART d'xp : le total est décimal, et
    // c'est voulu.
    tab("XP", "", "xp", ["Coût", "Coût effectif en xp"], 9999,
      speXpAuto,
      function (sp, i) {
        var xp = speXp(sp);
        return { texte: xp + " xp", zero: !xp,
                 titre: chaineTexteDe(B.lire("xp", vivante(i)), "points achetés :",
                                      speXpSocle(sp)) };
      });

    // ---------- Limite ----------
    // DERNIER ÉTAGE DE SA CASCADE : la base est la limite de sa compétence,
    // qui tient elle-même celle de sa caractéristique. Sans compétence, la base
    // est celle de la caractéristique, directement.
    tab("Limite", "", "lim", ["Limite", "Limite effective du jet"], 9999,
      function (sp) { return speLimAuto(sp); },
      function (sp, i) {
        var mot = sp && sp.comp ? "de " + sp.comp + " :"
                                : "de " + ((sp && sp.carac) || "—") + " :";
        return { texte: String(sp ? speLim(sp) : 0),
                 titre: chaineTexteDe(B.lire("lim", vivante(i)), mot,
                                      sp ? speLimBase(sp) : 0) };
      });

    // ---------- Écart ----------
    // DERNIER ÉTAGE DE LA CASCADE : la base est l'écart de sa compétence, qui
    // tient lui-même celui de sa caractéristique. Sans compétence — et c'est
    // une réponse légitime — l'étage du milieu n'existe pas et la base est
    // celle de la caractéristique, directement.
    tab("Écart", "", "ecart", ["Écart", "Écart minimum effectif"], 9999,
      function (sp) { return ecartSpeAuto(sp); },
      function (sp, i) {
        var base = sp ? ecartSpeBase(sp) : 0;
        var mot = sp && sp.comp ? "de " + sp.comp + " :" : "de " + (sp && sp.carac ? sp.carac : "—") + " :";
        return { texte: String(sp ? ecartSpe(sp) : 0),
                 titre: chaineTexteDe(B.lire("ecart", vivante(i)), mot, base) };
      });

    // Le rebâti que la Fiche appelle quand la liste change.
    optSpesRebuild = function () {
      optSpesHooks.length = 0;
      rebatis.forEach(function (f) { f(); });
      // ET ON REJOUE CE QU'ON VIENT D'INSCRIRE. Les trois appelants (ajout,
      // retrait, glissement) lancent refresh() PUIS ce rebâti : les fonctions
      // fraîches naissent donc après la passe, et le bloc restait entièrement
      // vide — neuf champs sans un chiffre, sans même le filigrane — jusqu'à
      // la frappe suivante.
      for (var i = 0; i < optSpesHooks.length; i++) {
        try { optSpesHooks[i](); } catch (e) { /* la muselière jugera à la passe suivante */ }
      }
    };
    bande.montre(0);
    return b;
  }
  // ---- outils de filtre ----
  // TROIS PUCES, et elles ne servent qu'aux spécialités : c'est la seule liste
  // ouverte de la fiche, la seule qui puisse devenir assez longue pour qu'on
  // s'y perde. Éteinte, une puce fait DISPARAÎTRE son outil et cesser d'agir —
  // un filtre invisible qui masque encore des lignes serait un piège. Réglages
  // d'affichage, donc locaux au navigateur ; ils ne suivent pas le personnage.
  function buildFiltres() {
    var bF = block("Outils de filtre");
    var fRow = el("div", "pc-comp-tools");
    var fLine = el("div", "row");
    function puce(cle, mot, aide) {
      var chip = el("span", "pc-chip");
      chip.textContent = mot;
      chip.title = aide;
      function on() { return lpref(cle, "1") !== "0"; }
      chip.classList.toggle("on", on());
      chip.addEventListener("click", function () {
        var etait = on();
        lset(cle, etait ? "0" : "1");
        chip.classList.toggle("on", !etait);
        remount();   // l'outil vit dans un autre onglet : tout se rebâtit
      });
      fLine.appendChild(chip);
    }
    puce(FILTRES.texte, "Champ de recherche",
         "La case où l'on tape pour filtrer les spécialités.");
    puce(FILTRES.carac, "Caractéristique",
         "Le sélecteur qui ne garde que les spécialités d'une caractéristique.");
    puce(FILTRES.comp, "Compétence",
         "Le sélecteur qui ne garde que les spécialités d'une compétence.");
    fRow.appendChild(fLine);
    bF.appendChild(fRow);
    return bF;
  }

  // ---- affichage (fiche dans Roll20 seulement) ----
  // window.__miaNight n'existe que sous roll20-fiche.html (posé par
  // mia-roll20-boot.js) : sur le site, le bouton d'en-tête gère déjà la nuit.
  // Préférence locale au navigateur (pas dans l'état : réglage d'affichage,
  // pas de personnage) ; "auto" suit le mode jour/nuit de ROLL20 (indice
  // n=1/0 posé par l'extension 2.0.3+ ; repli navigateur sans indice).
  function affichagePresent() { return !!window.__miaNight; }
  function buildAffichage() {
    var bAff = block("Affichage");
    var mode = el("select", "pc-select");
    [["auto", "Selon Roll20"], ["0", "Jour"], ["1", "Nuit"]].forEach(function (o) {
      var op = el("option", null, o[1]);
      op.value = o[0];
      mode.appendChild(op);
    });
    mode.value = window.__miaNight.pref();
    mode.addEventListener("change", function () { window.__miaNight.set(mode.value); });
    bAff.appendChild(fld("Mode par défaut", mode));
    return bAff;
  }

  // ---- actions sur la fiche (exporter / importer / réinitialiser) ----
  function buildActions() {
    var bAct = block("Fiche");
    var act = el("div", "pc-opt-actions");
    act.appendChild((function () {
      var b = el("button", "pc-btn", "Exporter (JSON)");
      b.type = "button";
      b.addEventListener("click", function () {
        var a = document.createElement("a");
        a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        a.download = (state.name || "personnage-mia") + ".json";
        a.click();
      });
      return b;
    })());
    var file = el("input");
    file.type = "file"; file.accept = "application/json"; file.style.display = "none";
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          state = normalize(JSON.parse(r.result));
          remount();
          flash("Personnage importé.");
        } catch (e) { flash("JSON illisible."); }
        file.value = "";
      };
      r.readAsText(f);
    });
    act.appendChild((function () {
      var b = el("button", "pc-btn", "Importer (JSON)");
      b.type = "button";
      b.addEventListener("click", function () { file.click(); });
      return b;
    })());
    act.appendChild(file);
    act.appendChild((function () {
      var b = el("button", "pc-btn danger", "Réinitialiser la fiche");
      b.type = "button";
      b.addEventListener("click", function () {
        if (!confirm("Réinitialiser la fiche ? Tout le personnage sera effacé.")) return;
        state = blank();
        remount();
        flash("Fiche réinitialisée.");
      });
      return b;
    })());
    bAct.appendChild(act);
    return bAct;
  }

  // ---- modules : ce que la fiche affiche, et où ----
  // Ce bloc-ci parle de TOUS les autres. Il n'écrit que deux choses : la
  // disposition (state.modules) et les interrupteurs (state.modActifs) ; rien
  // du personnage ne passe par lui. Les outils qu'il appelle vivent plus bas
  // (ordreModules, colonnesDe, MODULES_NATIFS) : ce sont ceux du montage, pour
  // que le plan dise exactement ce que la fiche a fait.
  //
  // Libellés COURTS : ils coiffent une colonne du plan, qui est étroite (trois
  // colonnes côte à côte dans un bloc lui-même en colonne). « Colonne du
  // milieu » y passerait à la ligne.
  var LIB_COLONNES = {
    gauche: "Gauche", milieu: "Milieu", droite: "Droite", bas: "Pleine largeur"
  };
  // Le prédicat « pour » d'un module natif dit s'il existe ICI (« affichage »
  // n'existe que dans Roll20). Un module qui n'existe pas n'a pas de ligne : il
  // n'y a rien à en régler. Son id, lui, reste dans l'ordre enregistré — sans
  // quoi ouvrir la fiche sur le site effacerait le rangement fait dans Roll20.
  function moduleAffichable(m) {
    if (typeof m.pour !== "function") return true;
    try { return !!m.pour(); } catch (e) { return false; }
  }
  // La colonne d'un module existe-t-elle dans le squelette de son onglet ? Un
  // mod qui recopie « milieu » (une colonne de l'onglet Fiche) dans un onglet
  // qui n'en a pas se retrouve sans hôte : il ne se monte nulle part, tout
  // comme un module dont l'ONGLET est inconnu. La différence est que sa ligne,
  // elle, figure bien sous son onglet, l'air d'un module ordinaire. Il faut
  // donc la reconnaître pour le dire.
  function colonneRepli(p) {
    var cols = colonnesDe(p.onglet);
    if (!cols) return null;                          // onglet inconnu : autre cas
    if (aClef(cols, p.colonne)) return p.colonne;
    return Object.keys(cols)[0] || null;             // le repli d'appliqueDisposition
  }
  function colonneInconnue(p) {
    var r = colonneRepli(p);
    return !!r && r !== p.colonne;
  }
  // La place qu'un module DEMANDE : la consigne enregistrée si elle existe,
  // sinon celle qu'il a déclarée au montage.
  //
  // On ne lit surtout pas modules[i].onglet : appliqueDisposition l'a déjà
  // remanié au montage, donc il porte la place FORCÉE. Tant que le plan
  // rechargeait la fiche à chaque geste, les deux se confondaient ; maintenant
  // que le rangement attend le prochain chargement, il faut la consigne elle-
  // même — sans quoi « Disposition d'origine » ne montrerait rien avant le
  // rechargement, et un module déplacé deux fois de suite repartirait de sa
  // place forcée au lieu de sa place d'origine.
  function placeDemandee(m) {
    var p = (disposition().place || {})[m.id];
    if (p && typeof p === "object" && typeof p.onglet === "string"
        && typeof p.colonne === "string")
      return { onglet: p.onglet, colonne: p.colonne };
    var o = placeOrigine[m.id];
    if (o) return { onglet: o.onglet, colonne: o.colonne };
    return { onglet: m.onglet, colonne: m.colonne };
  }
  function idsConnus() {
    return ordreModules().map(function (m) { return m.id; });
  }
  function disposition() {
    if (!state.modules || typeof state.modules !== "object" || Array.isArray(state.modules))
      state.modules = {};
    return state.modules;
  }
  // ON N'ÉPINGLE QUE LA COLONNE TOUCHÉE, et c'est tout le sujet.
  //
  // L'ancienne version écrivait l'ordre COMPLET de tous les modules, tous
  // onglets confondus. Un seul clic sur une flèche, n'importe où, et la
  // disposition du personnage était gelée pour toujours : la fiche pouvait
  // ensuite changer l'agencement d'un onglet auquel le joueur n'avait jamais
  // touché, il ne le voyait jamais. C'est arrivé pour de bon — l'onglet Options
  // a été réagencé et les personnages qui avaient cliqué une fois gardaient
  // l'ancien, sans aucun moyen de le savoir.
  //
  // Désormais l'ordre enregistré ne retient que les colonnes RÉELLEMENT
  // remaniées. Les autres n'y figurent pas, donc elles suivent la table de la
  // fiche : un module ajouté ou déplacé par une mise à jour arrive chez tout le
  // monde, sauf là où le joueur a fait son propre rangement.
  //
  // ordonne() accepte un ordre PARTIEL, c'est ce qui rend la chose possible :
  // les id nommés passent devant dans l'ordre donné, les autres suivent à leur
  // rang de déclaration. Comme les colonnes sont séparées au montage, épingler
  // une colonne ne dérange pas les voisines.
  function memeColonne(id, onglet, colonne) {
    var i = rangModule(id);
    if (i < 0) return false;
    var p = placeDemandee(modules[i]);
    return p.onglet === onglet && p.colonne === colonne;
  }
  // ids : l'ordre voulu, complet. onglet/colonne : la colonne remaniée.
  function ecritOrdre(ids, onglet, colonne) {
    var d = disposition();
    var ancien = Array.isArray(d.ordre) ? d.ordre : [];
    var neuf = [], vus = {}, i;
    // ce qui était déjà épinglé AILLEURS reste épinglé, dans son ordre
    for (i = 0; i < ancien.length; i++) {
      if (onglet && memeColonne(ancien[i], onglet, colonne)) continue;
      if (!vus[ancien[i]]) { vus[ancien[i]] = 1; neuf.push(ancien[i]); }
    }
    // puis la colonne qu'on vient de remanier, dans son ordre nouveau
    for (i = 0; i < ids.length; i++) {
      if (onglet && !memeColonne(ids[i], onglet, colonne)) continue;
      if (!vus[ids[i]]) { vus[ids[i]] = 1; neuf.push(ids[i]); }
    }
    d.ordre = neuf;
    // L'ordre vivant suit tout de suite, mais LA FICHE NE SE REMONTE PAS.
    //
    // Elle se remontait à chaque geste : ranger trois modules reconstruisait
    // trois fois la fiche entière, l'onglet sautait, et le moindre clic coûtait
    // une seconde. Le plan se redessine seul (redessinePlan), le rangement est
    // enregistré, et « Recharger la fiche » l'applique quand on a fini.
    ordonne(d.ordre);
    save();
  }
  function natifDe(id) {
    for (var i = 0; i < MODULES_NATIFS.length; i++)
      if (MODULES_NATIFS[i].id === id) return MODULES_NATIFS[i];
    return null;
  }
  // ---- le plan de la fiche : on range en FAISANT GLISSER ----
  //
  // La version d'avant réglait la disposition avec deux flèches et une liste
  // déroulante par module : pour descendre un bloc de trois rangs il fallait
  // trois clics, et pour le changer de colonne il fallait deviner quelle
  // colonne portait quel nom. On ne voyait jamais la fiche, seulement une liste
  // de lignes.
  //
  // Ici, chaque onglet est dessiné avec SES colonnes, côte à côte, et chaque
  // module est une carte qu'on prend et qu'on lâche où on veut : dans la même
  // colonne pour changer son rang, dans une autre pour l'y envoyer. Le plan
  // ressemble à la fiche, donc on range en regardant ce qu'on range.
  //
  // Glisser-déposer natif du navigateur (draggable, dragover, drop) : aucune
  // bibliothèque, et ça marche tel quel dans l'iframe Roll20.

  // Déplacer un module : sa colonne d'arrivée, et devant qui il se pose.
  // « avantId » nul = à la fin de la colonne.
  function deplaceModule(id, onglet, colonne, avantId) {
    var d = disposition();
    var nat = placeOrigine[id] || natifDe(id);
    if (!d.place || typeof d.place !== "object" || Array.isArray(d.place)) d.place = {};
    // Revenir à sa place d'origine EFFACE l'entrée plutôt que d'y ranger cette
    // place : la disposition reste éparse, et un module que la fiche déménagera
    // un jour suivra son déménagement au lieu d'être épinglé ici.
    if (nat && nat.onglet === onglet && nat.colonne === colonne) delete d.place[id];
    else d.place[id] = { onglet: onglet, colonne: colonne };
    // La consigne écrite suffit : memeColonne() la lit (placeDemandee), donc
    // l'ordre qu'on s'apprête à calculer voit déjà le module dans sa nouvelle
    // colonne. La table des modules, elle, n'est pas touchée : elle décrit la
    // fiche MONTÉE, qui ne bougera qu'au prochain chargement.
    var ids = idsConnus();
    var j = ids.indexOf(id);
    if (j >= 0) ids.splice(j, 1);
    var k = avantId ? ids.indexOf(avantId) : -1;
    if (k >= 0) ids.splice(k, 0, id);
    else {
      // à la fin de SA colonne, et non à la fin de tout : sinon un module lâché
      // au bas d'une colonne se rangerait derrière ceux des autres onglets
      var dernier = -1, q;
      for (q = 0; q < ids.length; q++) if (memeColonne(ids[q], onglet, colonne)) dernier = q;
      if (dernier >= 0) ids.splice(dernier + 1, 0, id);
      else ids.push(id);
    }
    ecritOrdre(ids, onglet, colonne);
    redessinePlan();
  }

  // Redessiner LE PLAN SEUL, sans reconstruire la fiche. C'est ce qui permet de
  // ranger dix modules d'affilée sans la moindre secousse : seul ce bloc-ci
  // change, et ce qu'il montre est le rangement enregistré, pas la fiche montée.
  // Enveloppé : un plan qui échoue ne doit pas emporter la fiche avec lui.
  function redessinePlan() {
    try {
      var vieux = document.querySelector('[data-module="' + MODULE_REGLAGES + '"]');
      if (!vieux || !vieux.parentNode) return;
      var neuf = buildModules();
      if (!neuf) return;
      neuf.dataset.module = MODULE_REGLAGES;
      vieux.parentNode.replaceChild(neuf, vieux);
      elModules[MODULE_REGLAGES] = neuf;
    } catch (e) {}
  }

  function buildModules() {
    var b = block("Modules");
    var plan = el("div", "pc-modplan");
    var visibles = ordreModules().filter(moduleAffichable);
    var vus = {};
    var pris = null;        // l'id qu'on tient
    var listes = [];        // toutes les zones de dépôt, pour les éteindre

    function eteintTout() {
      listes.forEach(function (z) { z.classList.remove("survol"); });
      var c = plan.querySelectorAll(".pc-modplan-carte.avant");
      for (var i = 0; i < c.length; i++) c[i].classList.remove("avant");
    }

    // Devant quelle carte se pose ce qu'on lâche à cette hauteur ? La moitié
    // haute d'une carte veut dire « avant elle », la moitié basse « après ».
    function cibleDe(liste, y) {
      var cartes = liste.querySelectorAll(".pc-modplan-carte");
      for (var i = 0; i < cartes.length; i++) {
        var r = cartes[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) return cartes[i];
      }
      return null;
    }

    function carte(m, souci) {
      var c = el("div", "pc-modplan-carte");
      c.dataset.id = m.id;
      c.draggable = true;
      var t = el("span", "t", m.titre || m.id);
      t.title = (m.titre || m.id) + (souci ? " — " + souci : "");
      c.appendChild(t);
      // L'oeil : affiché ou masqué. Le bloc des réglages lui-même n'en a pas,
      // c'est lui qui rallume les autres.
      if (m.id !== MODULE_REGLAGES) {
        var oeil = el("span", "pc-modplan-oeil");
        oeil.textContent = actif(m.id) ? "●" : "○";
        oeil.title = actif(m.id)
          ? "Affiché sur la fiche. Cliquer pour le masquer : rien n'est effacé."
          : "Masqué. Cliquer pour le réafficher.";
        oeil.addEventListener("click", function (e) {
          e.stopPropagation();
          activeModule(m.id, !actif(m.id));
          redessinePlan();       // comme le rangement : la fiche attend son chargement
        });
        c.appendChild(oeil);
      }
      var e = etatModule(m.id);
      if (e.panne) { c.dataset.etat = "panne"; t.title += " — en panne : " + e.panne; }
      else if (e.musele) { c.dataset.etat = "panne"; t.title += " — muselé : " + e.erreur; }
      if (souci) c.dataset.etat = "perdu";
      if (!actif(m.id)) c.classList.add("off");

      c.addEventListener("dragstart", function (ev) {
        pris = m.id;
        c.classList.add("pris");
        try {
          ev.dataTransfer.effectAllowed = "move";
          // Firefox refuse de commencer un glissement sans donnée posée
          ev.dataTransfer.setData("text/plain", m.id);
        } catch (err) {}
      });
      c.addEventListener("dragend", function () {
        pris = null;
        c.classList.remove("pris");
        eteintTout();
      });
      return c;
    }

    function zone(onglet, colonne, libelle) {
      var z = el("div", "pc-modplan-col");
      z.appendChild(el("div", "pc-modplan-col-nom", libelle));
      var liste = el("div", "pc-modplan-liste");
      z.appendChild(liste);
      listes.push(liste);
      liste.addEventListener("dragover", function (ev) {
        if (!pris) return;
        ev.preventDefault();           // sans ça, le navigateur refuse le dépôt
        try { ev.dataTransfer.dropEffect = "move"; } catch (err) {}
        eteintTout();
        liste.classList.add("survol");
        var avant = cibleDe(liste, ev.clientY);
        if (avant) avant.classList.add("avant");
      });
      liste.addEventListener("dragleave", function (ev) {
        if (ev.target === liste) liste.classList.remove("survol");
      });
      liste.addEventListener("drop", function (ev) {
        ev.preventDefault();
        var id = pris;
        if (!id) { try { id = ev.dataTransfer.getData("text/plain"); } catch (err) { id = null; } }
        eteintTout();
        if (!id) return;
        var avant = cibleDe(liste, ev.clientY);
        // se lâcher sur soi-même ne range rien
        if (avant && avant.dataset.id === id) return;
        deplaceModule(id, onglet, colonne, avant ? avant.dataset.id : null);
      });
      return { bloc: z, liste: liste };
    }

    // Remplit une rangée de colonnes du plan, et retient qui a trouvé sa place.
    // « premiere » reçoit en plus les cartes dont la colonne n'existe pas dans
    // cet onglet, comme la fiche les y replie au montage.
    function remplit(onglet, dedans, noms, premiere) {
      var rangee = el("div", "pc-modplan-cols");
      rangee.style.gridTemplateColumns = "repeat(" + noms.length + ", minmax(0, 1fr))";
      noms.forEach(function (c) {
        var z = zone(onglet, c, LIB_COLONNES[c] || capFirst(c));
        dedans.forEach(function (o) {
          // une colonne que l'onglet ne connaît pas : la carte se pose dans la
          // PREMIÈRE colonne, marquée, plutôt que de n'apparaître nulle part —
          // sinon le module serait invisible ET impossible à ranger
          var perdue = colonneInconnue(o.place);
          var ici = perdue ? (c === premiere) : (o.place.colonne === c);
          if (!ici) return;
          vus[o.m.id] = 1;
          z.liste.appendChild(carte(o.m, perdue
            ? "colonne « " + o.place.colonne + " » inconnue dans cet onglet : ce module ne s'affiche nulle part"
            : ""));
        });
        rangee.appendChild(z.bloc);
      });
      return rangee;
    }

    TABS.forEach(function (t) {
      var dedans = [];
      visibles.forEach(function (m) {
        var p = placeDemandee(m);
        if (p.onglet === t.id) dedans.push({ m: m, place: p });
      });
      if (!dedans.length) return;
      plan.appendChild(el("div", "pc-modgroupe", t.label));
      var d = squeletteColonnes(t.id) || { noms: [], larges: {} };
      var noms = d.noms.length ? d.noms : ["gauche"];
      // Une colonne PLEINE LARGEUR (l'inventaire de l'Équipement) n'est pas une
      // colonne de la grille : sur la fiche elle court sous les autres. Le plan
      // la met donc sous elles, dans sa propre rangée, au lieu de la serrer
      // entre deux voisines à qui elle prendrait un tiers de la place.
      var etroites = noms.filter(function (c) { return !d.larges[c]; });
      var larges = noms.filter(function (c) { return !!d.larges[c]; });
      // un onglet qui n'a QUE du pleine largeur (Art) garde sa rangée à lui
      if (!etroites.length) { etroites = larges; larges = []; }
      plan.appendChild(remplit(t.id, dedans, etroites, etroites[0]));
      larges.forEach(function (c) {
        plan.appendChild(remplit(t.id, dedans, [c], null));
      });
    });

    // Un module dont l'onglet n'existe pas (un mod mal réglé) ne se monte nulle
    // part. Sans cette rangée il serait invisible ET impossible à ranger : le
    // joueur n'aurait plus qu'à effacer le mod pour s'en défaire. Le déposer
    // dans n'importe quelle colonne d'un onglet réel le remet en jeu.
    var perdus = visibles.filter(function (m) { return !vus[m.id]; });
    if (perdus.length) {
      plan.appendChild(el("div", "pc-modgroupe", "Onglet inconnu"));
      var rp = el("div", "pc-modplan-cols");
      rp.style.gridTemplateColumns = "minmax(0, 1fr)";
      var zp = zone(TABS[0].id, "gauche", "À ranger");
      perdus.forEach(function (m) {
        zp.liste.appendChild(carte(m, "onglet « " + placeDemandee(m).onglet
          + " » inconnu : ce module ne s'affiche nulle part"));
      });
      rp.appendChild(zp.bloc);
      plan.appendChild(rp);
    }

    if (!plan.children.length) plan.appendChild(el("div", "pc-empty", "Aucun module."));
    b.appendChild(plan);
    var tools = el("div", "pc-comp-tools");
    // Ranger n'agit plus tout de suite, et il faut le DIRE : sans cette ligne,
    // le plan montrerait un rangement que la fiche derrière ne suit pas, et on
    // le croirait cassé.
    tools.appendChild(el("div", "pc-modplan-avis",
      "La disposition ne change qu'au chargement de la fiche."));
    var duo = el("div", "pc-modplan-duo");
    duo.appendChild(miniBtn("Disposition d'origine",
      "Rendre à chaque module son onglet, sa colonne et son rang d'origine. Les modules masqués le restent.",
      function () {
        state.modules = {};
        ordonne([]);
        save();
        redessinePlan();
        flash("Disposition d'origine rétablie. Recharger la fiche pour la voir.");
      }));
    duo.appendChild(miniBtn("Recharger la fiche",
      "Reconstruire la fiche avec le rangement du plan.",
      function () {
        remount();
        flash("Fiche rechargée.");
      }));
    tools.appendChild(duo);
    b.appendChild(tools);
    return b;
  }

  // ---- mods : le code ajouté au personnage ----
  // Ce bloc dit ce que chaque mod fait (ou pourquoi il ne fait rien), donne de
  // quoi trancher, et permet d'en écrire un. Le moteur (mia-mods.js) juge,
  // exécute et range les accords ; sans lui, ce bloc se contente de le dire.
  //
  // Aucun bac à sable : un mod autorisé tourne dans la page de la fiche avec
  // exactement ses droits. Les textes d'ici ne doivent jamais laisser croire
  // autre chose.
  var ETATS_MOD = {
    ok: "tourne",
    panne: "en panne",
    attente: "en attente d'autorisation",
    coupe: "coupé",
    recent: "trop récent",
    refuse: "refusé sur ce navigateur"
  };
  function moteurMods() {
    return (window.MiaMods && typeof window.MiaMods.execute === "function") ? window.MiaMods : null;
  }
  function bilanDeMod(id) {
    for (var i = 0; i < bilanMods.length; i++) if (bilanMods[i].id === id) return bilanMods[i];
    return null;
  }
  // Le moteur fait foi pour l'empreinte comme pour l'avis : la recalculer ici
  // ferait deux règles pour une seule décision, et un mod se remettrait à
  // demander l'autorisation dès que les deux dérivent d'un caractère.
  function empreinteMod(id, src) {
    var mm = moteurMods();
    try { return mm ? mm.empreinte(id, src) : ""; } catch (e) { return ""; }
  }
  function avisMod(emp) {
    var mm = moteurMods();
    try { return mm ? mm.avis(emp) : ""; } catch (e) { return ""; }
  }
  // Même règle d'id que le moteur (idPropre) et que normalize() : les trois
  // chemins doivent donner le MÊME id, sans quoi l'empreinte changerait selon
  // le chemin pris et le joueur réautoriserait un mod qu'il connaît déjà.
  function idMod(v) {
    return String(v == null ? "" : v).toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  }
  // Un « pour » illisible est SILENCIEUSEMENT oublié par le moteur : autant le
  // dire tout de suite, sinon le joueur croit avoir posé un garde-fou qui
  // n'existe pas. La règle de lecture est CELLE DU MOTEUR, jamais une copie
  // locale : cette fonction tenait sa propre expression régulière, restée en
  // arrière quand le suffixe de beta est apparu, et le formulaire refusait
  // alors le numéro qu'il proposait lui-même en filigrane.
  function versionLisible(v) {
    var mm = window.MiaMods;
    // Sans moteur, le bloc Mods n'affiche même pas ce formulaire : ce repli ne
    // sert qu'au moteur trop ancien pour exporter sa lecture. Laisser passer
    // vaut mieux que refuser au nom d'une règle qu'on ne connaît plus, et le
    // moteur garde de toute façon le champ tel quel.
    if (!mm || typeof mm.lireVersion !== "function") return true;
    try { return !!mm.lireVersion(v); } catch (e) { return true; }
  }
  // Le formulaire d'un mod, celui de l'ajout comme celui de la modification.
  // « appliquer » reçoit des valeurs déjà validées ; rendre false laisse le
  // dialogue ouvert, avec le message qui dit pourquoi.
  function formulaireMod(base, titre, libelleValider, appliquer) {
    base = base || {};
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "Ce code tourne dans la page de la fiche, avec les mêmes droits qu'elle : il n'y a pas de bac à sable. " +
      "Il part avec le personnage, et les autres joueurs auront à l'autoriser chez eux avant qu'il ne tourne."));
    var nom = el("input");
    nom.type = "text";
    nom.value = base.nom || "";
    var id = el("input");
    id.type = "text";
    id.value = base.id || "";
    // l'id se déduit du nom TANT QUE personne n'y a touché : un id corrigé à la
    // main ne doit pas se faire réécrire à la frappe suivante
    var idTenu = !!base.id;
    nom.addEventListener("input", function () { if (!idTenu) id.value = idMod(nom.value); });
    id.addEventListener("input", function () { idTenu = true; });
    var src = el("textarea", "pc-code");
    src.value = base.src || "";
    src.spellcheck = false;
    var pour = el("input");
    pour.type = "text";
    pour.placeholder = RELEASE;
    pour.value = base.pour || "";
    corps.appendChild(fld("Nom", nom));
    corps.appendChild(fld("Identifiant", id));
    corps.appendChild(fld("Code JavaScript (Mia, ctx)", src));
    corps.appendChild(fld("Pour la fiche, au moins (facultatif)", pour));
    dialogue(titre, corps, function () {
      var vid = idMod(id.value) || idMod(nom.value);
      var vp = String(pour.value == null ? "" : pour.value).trim();
      var pris = false;
      if (!vid) { flash("Il faut un identifiant : des lettres, des chiffres ou des tirets."); return false; }
      (state.mods || []).forEach(function (x) { if (x !== base && x.id === vid) pris = true; });
      if (pris) { flash("L'identifiant « " + vid + " » est déjà pris par un autre mod."); return false; }
      if (vp && !versionLisible(vp)) {
        flash("« Pour la fiche » attend un numéro de version, comme " + RELEASE + ".");
        return false;
      }
      appliquer(vid, String(nom.value == null ? "" : nom.value).trim() || vid,
                String(src.value == null ? "" : src.value), vp);
    }, libelleValider);
  }
  function ajouteMod() {
    formulaireMod(null, "Ajouter un mod", "Ajouter", function (id, nom, src, pour) {
      var neuf = { id: id, nom: nom, actif: true, src: src };
      if (pour) neuf.pour = pour;
      if (!Array.isArray(state.mods)) state.mods = [];
      state.mods.push(neuf);
      // Le joueur vient de le taper : il n'a pas à s'autoriser lui-même. Le oui
      // porte sur CE code et sur ce navigateur seulement ; retoucher le mod
      // change son empreinte, donc le fait redemander, et il ne vaut rien chez
      // les autres joueurs.
      decideMod(empreinteMod(id, src), "oui");
      save();
      remount();
      flash("Mod « " + nom + " » ajouté.");
    });
  }
  function modifieMod(m) {
    var avant = empreinteMod(m.id, m.src);
    formulaireMod(m, "Modifier « " + (m.nom || m.id) + " »", "Enregistrer",
      function (id, nom, src, pour) {
        m.id = id;
        m.nom = nom;
        m.src = src;
        if (pour) m.pour = pour; else delete m.pour;
        var apres = empreinteMod(id, src);
        // Le oui ne se pose QUE si l'empreinte a changé : le joueur vient alors
        // d'écrire ce code, et sans lui son propre mod lui redemanderait
        // l'autorisation à l'instant. Ouvrir puis refermer l'éditeur sans rien
        // toucher, en revanche, ne décide de rien : cela écrasait un refus
        // sans un mot, alors que la note du formulaire promet l'inverse.
        if (apres && apres !== avant) decideMod(apres, "oui");
        save();
        remount();
        flash("Mod « " + nom + " » enregistré.");
      });
  }
  // LIRE le code d'un mod ne doit pas supposer d'ouvrir l'éditeur : « Modifier »
  // sert à écrire, et valider son formulaire vaut accord. Ici rien ne bouge tant
  // que le joueur ne tranche pas, et les deux boutons sont là pour qu'il puisse
  // trancher en connaissance de cause.
  function voirMod(m) {
    var emp = empreinteMod(m.id, m.src);
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "Un mod autorisé tourne dans la page de la fiche, avec les mêmes droits qu'elle : " +
      "il n'y a pas de bac à sable. Lire ce code ne décide de rien."));
    var ligne = el("div", "pc-modrow");
    ligne.appendChild(el("span", "nom", m.nom || m.id));
    ligne.appendChild(el("span", "id", m.id));
    corps.appendChild(ligne);
    var ta = el("textarea", "pc-code");
    ta.readOnly = true;
    ta.spellcheck = false;
    ta.value = String(m.src == null ? "" : m.src);
    corps.appendChild(ta);
    var boutons = el("div", "row");
    boutons.appendChild(miniBtn("Autoriser", "Ce code tournera à chaque ouverture, sur ce navigateur", function () {
      decideMod(emp, "oui");
      remount();
    }));
    boutons.appendChild(miniBtn("Refuser", "Ce code ne tournera pas ; il reste sur le personnage", function () {
      decideMod(emp, "non");
      remount();
    }, "danger"));
    corps.appendChild(boutons);
    // le dialogue ne valide rien : ses deux boutons ont déjà tout dit
    dialogue("Code de « " + (m.nom || m.id) + " »", corps, function () {}, "Fermer");
  }
  function supprimeMod(m) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "Le mod et son code quittent le personnage. Ce qu'il a déjà écrit dans la fiche reste ; " +
      "l'accord donné à ce code sur ce navigateur reste lui aussi, et vaudrait encore si le mod revenait."));
    dialogue("Supprimer « " + (m.nom || m.id) + " » ?", corps, function () {
      var i = state.mods.indexOf(m);
      if (i >= 0) state.mods.splice(i, 1);
      save();
      remount();
      flash("Mod supprimé.");
    }, "Supprimer");
  }
  // UNE LIGNE, ET LE MOINS DE BOUTONS POSSIBLE.
  //
  // Il y en avait cinq, plus trois textes, et la ligne se repliait n'importe
  // comment. Deux d'entre eux, « Autoriser » et « Refuser », sont les deux
  // faces d'une même question : ils deviennent UNE puce, qui se lit comme
  // celle d'à côté. Les deux gestes de construction, « Modifier » et
  // « Supprimer », passent derrière le rouage du bloc, comme partout ailleurs
  // sur la fiche.
  //
  // Reste en permanence ce qu'on regarde tous les jours : le nom, l'état, de
  // quoi LIRE le code, et les deux interrupteurs.
  //
  // Les deux puces ne disent PAS la même chose, et c'est pour cela qu'elles
  // sont deux :
  //   « Actif »    appartient au PERSONNAGE et voyage avec lui ;
  //   « Autorisé » appartient à CE NAVIGATEUR et n'en sort jamais.
  // L'infobulle de chacune le dit en toutes lettres.
  function ligneMod(m) {
    var ligne = el("div", "pc-modrow pc-modrow-mod");
    ligne.dataset.id = m.id;
    var bil = bilanDeMod(m.id);
    var etat = bil ? bil.etat : "";
    var emp = empreinteMod(m.id, m.src);
    var avis = avisMod(emp);
    var on = m.actif !== false;
    var barre = el("div", "l");
    ligne.appendChild(barre);

    // l'identifiant ne s'affiche plus : il ne parle qu'au code, il est dans le
    // dialogue de lecture et dans celui de modification, et il volait la place
    // qui manquait pour tenir sur une ligne
    // L'ÉTAT NE S'ÉCRIT PLUS SUR LA LIGNE : les deux puces le disent déjà.
    // « tourne » quand les deux sont allumées, « coupé » quand Actif est
    // éteinte, « refusé » quand Autorisé l'est. Le mot en gris répétait ce que
    // l'oeil voyait, et prenait la place du nom. Il reste dans l'infobulle,
    // avec l'identifiant, pour les deux cas qu'une puce ne distingue pas : en
    // attente et refusé s'éteignent pareil.
    var nom = el("span", "nom", m.nom || m.id);
    nom.title = (m.nom || m.id) + " · identifiant " + m.id + " · " +
                (aClef(ETATS_MOD, etat) ? ETATS_MOD[etat] : "état inconnu");
    barre.appendChild(nom);
    // La panne, elle, garde son marquage : le liseré rouge de la ligne et le
    // message du moteur en dessous. C'est la seule chose qu'une puce ne dit pas.
    if (etat === "panne") ligne.setAttribute("data-etat", "panne");

    // Lire d'abord : c'est le geste qu'on attend de celui qui reçoit le code
    // d'un autre, et il ne décide de rien.
    barre.appendChild(miniBtn("Voir le code", "Lire le code de ce mod sans y toucher", function () {
      voirMod(m);
    }, "voir"));

    var puceA = el("span", "pc-chip", "Actif");
    puceA.title = "Sur LE PERSONNAGE, et voyage avec lui : couper ce mod le met " +
                  "en veille pour tout le monde, sans rien effacer.";
    puceA.classList.toggle("on", on);
    puceA.addEventListener("click", function () {
      m.actif = !on;
      save();
      remount();
    });
    barre.appendChild(puceA);

    var puceO = el("span", "pc-chip", "Autorisé");
    puceO.title = avis === "oui"
      ? "Sur CE NAVIGATEUR seulement : retirer l'accord, le code cessera de tourner ici."
      : "Sur CE NAVIGATEUR seulement : donner l'accord, le code tournera à chaque ouverture.";
    puceO.classList.toggle("on", avis === "oui");
    puceO.addEventListener("click", function () {
      decideMod(emp, avis === "oui" ? "non" : "oui");
      remount();
    });
    barre.appendChild(puceO);

    // Modifier et supprimer sont des gestes de CONSTRUCTION : ils ne s'offrent
    // que le rouage du bloc ouvert, comme les compétences et l'inventaire.
    // pc-edit-only, et non un test à la construction : le rouage bascule une
    // classe sur le bloc, il ne rebâtit pas ses lignes.
    barre.appendChild(miniBtn("Modifier", "Changer le nom, l'identifiant ou le code", function () {
      modifieMod(m);
    }, "pc-edit-only"));
    barre.appendChild(miniBtn("Supprimer", "Retirer ce mod du personnage", function () {
      supprimeMod(m);
    }, "danger pc-edit-only"));

    // Le message du moteur (la panne à réparer, la version qui manque) : c'est
    // tout ce que le joueur a pour comprendre, il prend sa propre ligne.
    if (bil && bil.message) ligne.appendChild(el("div", "pc-block-note", bil.message));
    return ligne;
  }
  function buildMods() {
    // le rouage ouvre les gestes de construction (modifier, supprimer)
    var b = block("Mods", null, "mods");
    // AUCUNE explication en tête de bloc. La fiche montre les données du
    // personnage, pas un mode d'emploi : ce qu'il faut savoir avant d'autoriser
    // du code est dit là où la décision se prend (le dialogue d'examen et le
    // formulaire), et le reste est dans la page Mods du livre.
    // Le moteur est facultatif de naissance (un repli gelé peut ne charger que
    // le bundle) : sans lui, on le dit et on ne propose rien qui n'aurait aucun
    // effet — un mod ajouté ici n'aurait ni empreinte ni accord possible.
    if (!moteurMods()) {
      b.appendChild(el("div", "pc-empty",
        "Le moteur de mods n'est pas chargé : les mods du personnage sont conservés tels quels, aucun ne tourne."));
      return b;
    }
    var mods = Array.isArray(state.mods) ? state.mods : [];
    var box = el("div");
    mods.forEach(function (m) { box.appendChild(ligneMod(m)); });
    if (!mods.length) box.appendChild(el("div", "pc-empty", "Aucun mod sur cette fiche personnage."));
    b.appendChild(box);
    var tools = el("div", "pc-comp-tools");
    var line = el("div", "row");
    line.appendChild(miniBtn("Ajouter un mod", "Écrire un mod pour ce personnage", ajouteMod));
    tools.appendChild(line);
    b.appendChild(tools);
    return b;
  }

  // ---------- les modules natifs ----------
  // L'ordre de cette table EST l'ordre par défaut de la fiche : chaque module
  // tombe dans sa colonne, à la suite de ceux déjà déclarés pour elle.
  // buildTop, buildHead et buildEnvoi n'y sont pas : la barre d'outils,
  // l'en-tête et la barre d'envoi ne sont pas des modules, ils encadrent les
  // onglets et ne se déplacent pas.
  //
  // Cette table-ci ne se remanie JAMAIS : chaque mount() en repart (modules =
  // MODULES_NATIFS.slice()). Sans cette copie intacte, un mod qui remplace un
  // module natif le remplacerait pour toujours — même désinstallé, la fiche
  // n'aurait plus l'original à remettre. Un module déplacé se recopie donc
  // avant d'être touché (appliqueDisposition).
  var MODULES_NATIFS = [
    // ---- onglet Fiche ----
    // TROIS COLONNES INÉGALES : un quart, un quart, une moitié. Les deux listes
    // fermées — huit caractéristiques, huit compétences — tiennent dans un quart
    // parce qu'elles ne portent que trois nombres chacune ; les valeurs du corps
    // tiennent dans le deuxième. LA MOITIÉ EST AUX SPÉCIALITÉS : c'est la seule
    // liste OUVERTE de la fiche, la seule qui s'allonge sans fin, et la seule
    // dont chaque ligne porte cinq nombres, un nom libre et deux sigles.
    { id: "caracs",     titre: "Caractéristiques",  onglet: "fiche", colonne: "gauche", build: buildCaracs },
    // Les compétences suivent les caractéristiques, dans la même colonne : ce
    // sont deux listes de huit lignes, de la même forme, qu'on lit l'une après
    // l'autre — la compétence dit à quelle caractéristique elle emprunte.
    { id: "comps",      titre: "Compétences",       onglet: "fiche", colonne: "gauche", build: buildComps },
    // LES LANGUES SUIVENT LES COMPÉTENCES, dans la même colonne : ce sont des
    // spécialités passives de MEN, et on les lit après ce dont elles relèvent.
    { id: "langues",    titre: "Langues",           onglet: "fiche", colonne: "gauche", build: buildLangues },
    // Initiative et récupération vont ensemble : deux valeurs qu'on relit, et
    // qui portent chacune le bouton qui en fait quelque chose.
    { id: "initiative", titre: "Initiative",        onglet: "fiche", colonne: "milieu", build: buildInitiative },
    { id: "recup",      titre: "Récup / jour",      onglet: "fiche", colonne: "milieu", build: buildRecup },
    // Vitesse, charge et les deux sauts partagent une grille de cases qui ne se
    // découpe pas : elles ne forment qu'UN module, même si chacune garde son
    // rouage.
    { id: "tuiles",     titre: "Corps",             onglet: "fiche", colonne: "milieu", build: buildVitesse },
    // DEUX RÉSERVES, DEUX MODULES : même forme, mais on ne les lit pas au même
    // moment, et elles se déplacent — ou se coupent — l'une sans l'autre.
    { id: "pv",         titre: "PV",                onglet: "fiche", colonne: "milieu", build: buildPv },
    { id: "endurance",  titre: "Endurance",         onglet: "fiche", colonne: "milieu", build: buildEndurance },
    // Les spécialités ont la colonne large POUR ELLES SEULES : cinq nombres,
    // un nom qu'on écrit, deux sigles à choisir et un filtre, sur une liste qui
    // n'a pas de fin. Elles étouffaient sous un tiers de feuille.
    { id: "specialites", titre: "Spécialités",      onglet: "fiche", colonne: "droite", build: buildSpecialites },
    // ---- onglet Art ----
    { id: "arts",       titre: "Techniques et passifs", onglet: "art",  colonne: "seule",  build: buildArt },

    // ---- onglet Équipement ----
    // PLUS D'ARMES NI D'ARMURES : les deux modules ont été retirés le
    // 25/08/2026. Ce qu'on porte se tient dans l'inventaire, qui pèse déjà.
    { id: "inv",        titre: "Inventaire",        onglet: "equipement", colonne: "bas",    build: buildInv },
    // ---- onglet Bio ----
    { id: "perso",      titre: "Personnalité",      onglet: "bio", colonne: "gauche", build: buildPerso },
    { id: "avantages",  titre: "Avantages",         onglet: "bio", colonne: "gauche", build: buildAvantages },
    { id: "bg",         titre: "Background",        onglet: "bio", colonne: "droite", build: buildBackground },
    { id: "notes",      titre: "Notes",             onglet: "bio", colonne: "droite", build: buildNotes },
    // ---- onglet Options ----
    // À GAUCHE, dans l'ordre de la Fiche : ce qui touche aux caractéristiques
    // d'abord (leurs modificateurs, puis où est parti l'xp), la création
    // ensuite, le jeu après, et les réglages d'affichage en bas.
    // L'onglet Options se lit en DEUX COLONNES QUI SE RÉPONDENT, du plus
    // employé au plus long :
    //   en tête, ce qu'on ouvre le plus souvent : les Jets à gauche, la Fiche
    //     (exporter, importer, réinitialiser) à droite ;
    //   au deuxième rang, les deux faces de l'xp, côte à côte : ce qu'on ajoute
    //     aux caractéristiques à gauche, où l'xp est parti à droite ;
    //   au milieu, les réglages courts, répartis pour que les deux colonnes
    //     arrivent à la même hauteur ;
    //   tout en bas, les deux longues listes, qui déroulent sans fin : les
    //     Modules à gauche, les Compétences à droite.
    // L'ordre de déclaration EST l'ordre d'affichage, colonne par colonne.
    { id: "jets",       titre: "Jets",              onglet: "options", colonne: "gauche", build: buildJets },
    { id: "actions",    titre: "Fiche",             onglet: "options", colonne: "droite", build: buildActions },
    // TOUT CE QUI SE RÈGLE SUR UNE CARACTÉRISTIQUE, EN UN SEUL BLOC : son
    // plafond, son modificateur, sa limite, l'écart qu'elle impose aux
    // spécialités, ce qu'elle coûte. C'étaient cinq blocs, et cinq titres à
    // départager pour un seul et même geste ; ce sont cinq onglets dans un
    // bloc. La valeur, elle, ne se règle pas ici : elle a sa case Bonus sur la
    // fiche.
    //
    // « Réglages des caractéristiques » ET NON « Caractéristiques », pour la
    // raison écrite plus bas à propos des compétences : le titre du module se
    // lit dans le plan, dans Mia.liste() et sur sa carte, où deux
    // « Caractéristiques » seraient indiscernables. Le bloc, lui, s'intitule
    // court : il est dans l'onglet Options, on sait où on est.
    { id: "optcaracs",  titre: "Réglages des caractéristiques", onglet: "options", colonne: "gauche", build: buildOptCaracs },
    { id: "xpchamps",   titre: "XP par champ",      onglet: "options", colonne: "droite", build: buildXpChamps },
    // Création est à DROITE. La mesure qui l'y avait mise (139 px d'écart entre
    // les deux colonnes contre 12 une fois déplacé) ne vaut plus : elle datait
    // d'une gauche qui portait cinq blocs de caractéristiques et d'un Création
    // deux fois plus long — le plafond en est parti. REMESURÉ, au demi-écran et
    // sous Firefox : 1481 px à gauche contre 1231 à droite, soit 250 d'écart, et
    // c'est la GAUCHE qui dépasse. Le rééquilibrer demanderait d'envoyer à
    // droite un bloc court (« Jets » suffirait, à 70 px près) : ça ne se décide
    // pas dans un commentaire, et le bloc reste où il est en attendant. (Depuis,
    // la « Règle de l'écart » est venue à droite : l'écart est retombé à 153.)
    // Il tient d'ailleurs de l'xp autant que « XP par champ », son voisin.
    // À DROITE, et pour deux raisons qui vont ensemble. La première tient à ce
    // qu'il EST : un interrupteur qui suspend une règle pour tout le
    // personnage, quand la gauche porte les leviers qui décalent un seuil
    // caractéristique par caractéristique. La seconde est une mesure : la
    // gauche dépassait la droite de 250 px, elle n'en dépasse plus que 153.
    { id: "ecartcoupe", titre: "Règle de l'écart",   onglet: "options", colonne: "droite", build: buildEcartRegle },
    { id: "filtres",    titre: "Outils de filtre",  onglet: "options", colonne: "droite", build: buildFiltres },
    // « Affichage » n'existe que dans Roll20 : à gauche, il y compense les deux
    // blocs de réglages que porte la droite, et son absence sur le site laisse
    // les deux colonnes à égalité.
    { id: "affichage",  titre: "Affichage",         onglet: "options", colonne: "gauche", build: buildAffichage, pour: affichagePresent },
    { id: "mods",       titre: "Mods",              onglet: "options", colonne: "gauche", build: buildMods },
    { id: "modules",    titre: "Modules",           onglet: "options", colonne: "gauche", build: buildModules },
    // le titre dit ce que le bloc AFFICHE : « Compétences » le confondait avec
    // celui de l'onglet Fiche, dans le plan comme partout où les modules se
    // nomment
    { id: "optcomps",  titre: "Réglages des compétences", onglet: "options", colonne: "droite", build: buildOptComps },
    // UN BLOC À ELLES. Les spécialités partageaient la grille des compétences ;
    // elles ont maintenant leurs propres onglets, et il le fallait : leur liste
    // est OUVERTE, elle se rebâtit, et elles se nomment au lieu de porter un
    // sigle.
    //
    // L'ID DES COMPÉTENCES NE CHANGE PAS, et c'est délibéré : state.modActifs
    // garde à jamais un « false », que personne ne relit. Renommer l'id ferait
    // RÉAPPARAÎTRE allumé un bloc que le joueur avait coupé.
    { id: "optspes",   titre: "Réglages des spécialités", onglet: "options", colonne: "droite", build: buildOptSpes }
  ];
  modules = MODULES_NATIFS.slice();

  // ---------- le moteur de mods ----------
  // mia-mods.js est FACULTATIF DE NAISSANCE, exactement comme mia-migrations.js :
  // sans lui la fiche s'ouvre, simplement sans mods. Il ne touche ni au DOM ni à
  // l'état, il reçoit la liste des mods et rend un bilan.
  //
  // Bilan du dernier passage : le bloc Options « Mods » et le bandeau de
  // consentement le lisent. Vide tant que le moteur n'a pas tourné.
  var bilanMods = [];
  function modActifDe(id) {
    var a = true;
    ((state && state.mods) || []).forEach(function (m) { if (m && m.id === id) a = m.actif !== false; });
    return a;
  }
  function modDe(id) {
    var out = null;
    ((state && state.mods) || []).forEach(function (m) { if (m && m.id === id) out = m; });
    return out;
  }
  // Ce propriétaire est-il un MOD ? Son id figure alors parmi les mods du
  // personnage, ou dans le bilan du montage précédent — un mod qu'on vient de
  // supprimer n'est plus que là, et c'est justement celui-là qu'il faut
  // reconnaître. « mod » est le repli du moteur : un mod dont on ignore le nom.
  function propEstUnMod(prop) {
    if (!prop || prop === "?") return false;
    if (prop === PROP_MOD) return true;
    return !!modDe(prop) || !!bilanDeMod(prop);
  }
  // Un mod n'a plus rien à faire tourner dès qu'il quitte le personnage, qu'on
  // le coupe ou qu'on lui retire son accord : ce qu'il a inscrit hors montage
  // (le filtre posé par l'un de ses boutons) s'arrête avec son code.
  function modAutorise(prop) {
    var m = modDe(prop);
    if (!m || m.actif === false) return false;
    return avisMod(empreinteMod(m.id, m.src)) === "oui";
  }
  function executeMods() {
    bilanMods = [];
    if (!state || !state.mods || !state.mods.length) return;
    if (!window.MiaMods || typeof window.MiaMods.execute !== "function") return;
    var avant = proprietaireCourant;
    // Un mod qui pose un filtre le fait pendant que le moteur l'exécute : le
    // propriétaire du moment lui revient. Le moteur peut nommer le mod qu'il
    // lance (Mia.__proprietaire) ; s'il ne le fait pas, faute de mieux, tout ce
    // qui s'enregistre là appartient à « mod ».
    proprietaireCourant = PROP_MOD;
    try {
      var b = window.MiaMods.execute(state.mods, window.Mia, { version: RELEASE, schema: SCHEMA });
      if (Array.isArray(b)) bilanMods = b;
      // Le bilan se range et se tait : une faute de syntaxe dans un mod ne
      // laissait RIEN dans la console du navigateur, alors que la page Mods dit
      // d'y regarder en premier. Le message part au même format que les autres
      // ennuis de module (« [mod:<id>] »), pour qu'un filtre sur « [mod: »
      // ramasse tout ce qui concerne un mod, d'où que ça vienne.
      bilanMods.forEach(function (x) {
        if (!x || x.etat !== "panne") return;
        if (window.console && window.console.warn)
          window.console.warn("[mod:" + x.id + "] en panne : " + (x.message || "sans message"));
      });
    } catch (err) {
      // le moteur lui-même en panne : la fiche s'ouvre quand même, sans mods
      if (window.console && window.console.warn)
        window.console.warn("[mods] moteur en panne : " + messageErreur(err));
    }
    proprietaireCourant = avant;
  }

  // ---------- la disposition enregistrée ----------
  // Les colonnes d'un onglet ne se connaissent qu'en bâtissant son squelette :
  // on le bâtit une fois à vide, dans un élément détaché, plutôt que de recopier
  // ici une liste de colonnes qui dériverait au premier onglet remanié.
  function colonnesDe(onglet) {
    if (!aClef(SQUELETTES, onglet)) return null;
    var noms = {};
    var c = SQUELETTES[onglet](el("div"));
    Object.keys(c || {}).forEach(function (k) { noms[k] = 1; });
    return noms;
  }
  // Les colonnes d'un onglet, DANS L'ORDRE, en distinguant celles qui courent
  // sur toute la largeur. Le squelette les reconnaît lui-même : une colonne
  // pleine largeur rend le PANNEAU au lieu d'une colonne de la grille (c'est
  // ainsi que l'inventaire passe sous les deux colonnes de l'Équipement). Le
  // plan a besoin de la distinction pour se dessiner comme la fiche.
  function squeletteColonnes(onglet) {
    if (!aClef(SQUELETTES, onglet)) return null;
    var pane = el("div");
    var c = SQUELETTES[onglet](pane) || {};
    var noms = [], larges = {};
    Object.keys(c).forEach(function (k) {
      noms.push(k);
      if (c[k] === pane) larges[k] = 1;
    });
    return { noms: noms, larges: larges };
  }
  // state.modules : l'ordre d'abord, la place ensuite. Une consigne qui ne
  // désigne rien de valide (module inconnu, onglet disparu, colonne qui
  // n'existe plus dans ce squelette) est simplement ignorée : elle laisserait
  // sinon le module hors de la fiche, sans rien pour l'y ramener.
  function appliqueDisposition() {
    var d = state && state.modules;
    if (!d || typeof d !== "object") return;
    if (Array.isArray(d.ordre)) ordonne(d.ordre);
    var place = d.place;
    if (!place || typeof place !== "object") return;
    Object.keys(place).forEach(function (id) {
      var p = place[id];
      if (!p || typeof p !== "object") return;
      var i = rangModule(id);
      if (i < 0) return;
      var m = modules[i];
      var onglet = (typeof p.onglet === "string" && aClef(SQUELETTES, p.onglet)) ? p.onglet : m.onglet;
      var cols = colonnesDe(onglet) || {};
      var colonne = (typeof p.colonne === "string" && aClef(cols, p.colonne)) ? p.colonne : null;
      // l'onglet change sans que la colonne suive : celle du module n'existe
      // peut-être pas là-bas, on prend alors la première du squelette
      if (!colonne) colonne = aClef(cols, m.colonne) ? m.colonne : Object.keys(cols)[0];
      if (!colonne || (onglet === m.onglet && colonne === m.colonne)) return;
      // COPIE : la table native ne se laisse pas remanier, elle est le seul
      // moyen de rendre à un module sa place d'origine
      var copie = {};
      Object.keys(m).forEach(function (k) { copie[k] = m[k]; });
      copie.onglet = onglet;
      copie.colonne = colonne;
      modules[i] = copie;
    });
  }

  // ---------- le bandeau de consentement ----------
  // Le code d'un mod voyage AVEC le personnage : ouvrir la fiche d'un autre
  // joueur ne doit jamais exécuter son code sans un oui explicite. Ce oui reste
  // dans CE navigateur (le moteur le range), il ne voyage pas — sinon l'auteur
  // consentirait pour tout le monde.
  //
  // La fiche s'ouvre TOUJOURS : un mod en attente ne bloque rien, il ne tourne
  // pas, c'est tout. (L'écran de version, lui, protège des données : il bloque.
  // Mais il ne paraît plus qu'au désaccord de SCHÉMA, jamais sur un simple
  // écart de numéro de release.)
  function modsEnAttente() {
    if (!state || !state.mods || !state.mods.length) return [];
    if (!window.MiaMods || typeof window.MiaMods.enAttente !== "function") return [];
    try {
      // MÊME repère que executeMods, sans quoi les deux écrans se contredisent :
      // sans version ni schéma, le moteur saute ses deux contrôles, un mod
      // « pour: 4.0.0 » est annoncé « pas autorisé », le joueur l'autorise, et
      // le bloc Mods lui répond « trop récent ». Le oui ainsi arraché dort dans
      // le navigateur et s'appliquerait tout seul le jour de la 4.0.0.
      var a = window.MiaMods.enAttente(state.mods, { version: RELEASE, schema: SCHEMA });
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function decideMod(empreinte, avis) {
    if (!window.MiaMods || typeof window.MiaMods.decide !== "function") return;
    try { window.MiaMods.decide(empreinte, avis); } catch (e) {}
  }
  // Le dialogue d'examen : le code de chaque mod, en clair, et deux boutons.
  // Une décision remonte la fiche aussitôt (le mod autorisé doit tourner, et
  // le bandeau doit dire la vérité) : le dialogue part avec l'ancien DOM,
  // le bandeau restant se rouvre d'un clic s'il reste des mods à juger.
  function examinerMods(attente) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "Un mod autorisé tourne dans la page de la fiche, avec les mêmes droits qu'elle : " +
      "il fait ce qu'il veut de ce qui s'y affiche et de ce qui s'y enregistre. " +
      "N'autoriser que du code dont la provenance est sûre."));
    attente.forEach(function (m) {
      var ligne = el("div", "pc-modrow");
      ligne.appendChild(el("span", "nom", m.nom || m.id));
      ligne.appendChild(el("span", "id", m.id));
      corps.appendChild(ligne);
      var ta = el("textarea", "pc-code");
      ta.readOnly = true;
      ta.value = String(m.src == null ? "" : m.src);
      corps.appendChild(ta);
      var boutons = el("div", "row");
      boutons.appendChild(miniBtn("Autoriser", "Ce mod tournera à chaque ouverture, sur ce navigateur", function () {
        decideMod(m.empreinte, "oui");
        remount();
      }, "primary"));
      boutons.appendChild(miniBtn("Refuser", "Ce mod ne tournera pas ; il reste sur le personnage", function () {
        decideMod(m.empreinte, "non");
        remount();
      }, "danger"));
      corps.appendChild(boutons);
    });
    dialogue("Mods en attente d'autorisation", corps, function () { remount(); }, "Terminer");
  }
  function bandeauAvis(app) {
    var attente = modsEnAttente();
    if (!attente.length) return;
    var n = attente.length;
    // .pc-avis-mods : le bandeau de CONSENTEMENT, distinct de celui de perte
    // d'enregistrement, qui partage la même mise en forme (voir montrePanneSave)
    var av = el("div", "pc-avis pc-avis-mods");
    av.appendChild(el("div", "pc-avis-txt",
      "Ce personnage porte " + n + " mod" + (n > 1 ? "s" : "") + " qui n'" +
      (n > 1 ? "ont" : "a") + " pas été autorisé" + (n > 1 ? "s" : "") +
      " sur ce navigateur. " + (n > 1 ? "Ils ne tournent" : "Il ne tourne") + " pas."));
    var row = el("div", "row");
    row.appendChild(miniBtn("Examiner", "Lire le code de chaque mod avant de décider", function () {
      examinerMods(attente);
    }));
    row.appendChild(miniBtn("Tout refuser", "Aucun de ces mods ne tournera sur ce navigateur", function () {
      attente.forEach(function (m) { decideMod(m.empreinte, "non"); });
      remount();
    }, "danger"));
    av.appendChild(row);
    app.appendChild(av);
  }

  // La fiche expose UN objet public : c'est par là qu'un mod remplace un
  // module, change la disposition ou détourne un calcul. Elle n'exécute rien
  // d'elle-même. window.__miaModules est l'ANCIEN nom du MÊME objet : ce qui a
  // été écrit avant la 3.0.0 continue de marcher tel quel.
  window.Mia = {
    // Les deux annoncent ce qu'ils ont toujours annoncé, mais ils ne se
    // déduisent plus l'un de l'autre : version porte le suffixe de beta le
    // cas échéant, schema est un entier libre. Un mod qui tirerait le schéma
    // du majeur de la version se tromperait à la première divergence, et le
    // moteur de mods offre MiaMods.lireVersion pour ne pas avoir à découper
    // le numéro soi-même.
    version: RELEASE,
    schema: SCHEMA,
    enregistre: enregistre,
    ordonne: ordonne,
    // une COPIE de la description : personne ne remanie la table de l'extérieur
    liste: function () {
      return ordreModules().map(function (m) {
        return { id: m.id, titre: m.titre, onglet: m.onglet, colonne: m.colonne, actif: actif(m.id) };
      });
    },
    actif: actif,
    // l'interrupteur : couper un module le retire de la fiche sans rien
    // effacer (son coffre et ses données restent, il ne s'affiche plus)
    active: activeModule,
    // de quoi afficher l'état d'un module : ses pannes, sa muselière
    etat: function (id) {
      var e = etatModule(id);
      return { echecs: e.echecs, musele: e.musele, erreur: e.erreur,
               panne: e.panne, vide: e.vide, actif: actif(id) };
    },
    remonte: remount,
    // filtrer un calcul de la fiche (les neuf points de FILTRES_CONNUS)
    filtre: filtreCalcul,
    // bilan du dernier passage du moteur de mods, en COPIE : vide tant qu'il
    // n'a pas tourné. « actif » vient de l'état (l'interrupteur du joueur),
    // « etat » du moteur (ok, panne, attente, coupe, recent, refuse).
    mods: function () {
      return bilanMods.map(function (b) {
        return { id: b.id, nom: b.nom, actif: modActifDe(b.id), etat: b.etat,
                 message: b.message || "", empreinte: b.empreinte };
      });
    },
    // INTERNE, pour le moteur de mods : nommer le mod qu'il lance, afin que les
    // filtres enregistrés pendant son exécution portent SON id. Sans cet appel
    // ils reviennent tous à « mod », ce qui n'est faux que dans le journal.
    __proprietaire: function (id) {
      proprietaireCourant = id ? String(id) : PROP_MOD;
      // modEnExec ne vaut que PENDANT le lancement d'un mod : le moteur rend la
      // main avec null. C'est lui qui permet à enregistre() de marquer le module
      // au nom du mod qui l'a posé.
      modEnExec = id ? String(id) : null;
    },
    // INTERNE, pour les sondes. Le double tiret bas dit ce qu'il faut : ce
    // n'est pas le contrat public, la page Mods ne les nomme pas, et un mod qui
    // s'y appuie le fait à ses risques. Ils existent parce qu'une sonde qui
    // lirait les valeurs dans le DOM mesurerait la MISE EN FORME autant que le
    // calcul : « 30 » et « 30 m » se ressemblent trop pour juger d'un filtre.
    __calculs: {
      caracTotal: caracTotal, caracMod: caracMod, caracLim: caracLim,
      caracPlafond: caracPlafond, caracXp: caracXp,
      caracValeur: caracValeur, caracValeurBrut: caracValeurBrut, caracBonus: caracBonus,
      compPts: compPts, compPlafond: compPlafond, compXp: compXp,
      compValeur: compValeur, compValeurBrut: compValeurBrut, compBonus: compBonus,
      compCarac: compCarac, ecartComp: ecartComp, ecartSpe: ecartSpe,
      compLim: compLim, speLim: speLim, limiteJet: limiteJet,
      spePts: spePts, speXp: speXp, speBonus: speBonus, jetBonus: jetBonus,
      artXp: artXp, artAvantage: artAvantage, artsXp: artsXp, artsAvantage: artsAvantage,
      langueTotal: langueTotal, langueNiveau: langueNiveau, langueXp: langueXp, languesXp: languesXp,
      spePlafond: spePlafond, spePlafondPose: spePlafondPose,
      speTotal: speTotal, speRetire: speRetire,
      ecartMin: ecartMin,
      prestige: prestige, enduranceMax: enduranceMax, enduranceMalus: enduranceMalus,
      recupJour: recupJour, chargeMax: chargeMax,
      pvMax: pvMax, pvCourant: pvCourant, initiative: initiative,
      vitesse: vitesse, vitesseVal: vitesseVal,
      sautLong: sautLong, sautHaut: sautHaut,
      poidsPorte: poidsPorte, xpDepense: xpDepense
    },
    // le registre des filtres, à plat et en copie : nom, propriétaire, fautes
    __filtres: function () {
      var out = [];
      Object.keys(filtres).forEach(function (nom) {
        (filtres[nom] || []).forEach(function (f) {
          out.push({ nom: nom, prop: f.prop, echecs: f.echecs });
        });
      });
      return out;
    }
  };
  window.__miaModules = window.Mia;

  // ---------- montage ----------
  // Un montage ne se relance JAMAIS depuis lui-même. Un mod qui finit par
  // Mia.remonte() (geste naturel, et la page Mods documente remonte() sans
  // réserve) ou par ctx.reconstruire() rappellerait mount() DEPUIS mount() :
  // les mods repartiraient, redemanderaient un remontage, la pile déborderait,
  // et chaque niveau qui se dépile reprendrait son montage là où il en était
  // (page vidée, vingt-cinq blocs rebâtis, refresh, save). L'onglet gèle, à
  // CHAQUE ouverture puisque le mod voyage avec le personnage, et le joueur
  // n'atteint plus le bloc Mods pour couper le fautif. La demande est donc
  // notée et honorée UNE SEULE FOIS, le montage courant fini.
  //
  // La garde est ici et pas dans remount() : tout ce qui remonte la fiche passe
  // par mount(), remount() comme le premier montage.
  var montageEnCours = false;
  var remontageDu = false;
  var remontagesDus = 0;       // enchaînements, pour le mod qui en redemande à chaque fois
  var REMONTAGES_MAX = 3;
  function mount(root) {
    if (montageEnCours) { remontageDu = true; return; }
    montageEnCours = true;
    var abouti = false;
    try { montage(root); abouti = true; }
    finally {
      montageEnCours = false;
      // un montage tombé en route l'a laissé levé : ce qui s'enregistrerait
      // ensuite serait perdu au lieu d'attendre le montage suivant
      enMontage = false;
      // et il a pu laisser une demande de remontage en l'air : la queue de
      // mount() est sautée quand l'exception passe, si bien que le PROCHAIN
      // montage, réussi celui-là, payait un remontage gratuit hérité d'un
      // montage qui n'a jamais abouti.
      if (!abouti) { remontageDu = false; remontagesDus = 0; }
    }
    if (!remontageDu) { remontagesDus = 0; return; }
    remontageDu = false;
    // Un mod qui redemande un remontage à chaque montage boucle sans fin : on
    // s'arrête au bout de trois enchaînements et on le dit dans le journal. La
    // fiche reste utilisable, donc le bloc Mods aussi.
    if (remontagesDus >= REMONTAGES_MAX) {
      if (window.console && window.console.warn)
        window.console.warn("[fiche] remontage en boucle : demande ignorée. Un mod appelle Mia.remonte() à chaque montage.");
      remontagesDus = 0;
      return;
    }
    remontagesDus++;
    mount(root);
  }
  function montage(root) {
    rootEl = root;
    enMontage = true;
    // tous les registres repartent à vide : les anciens pointent sur un DOM
    // qui n'existe plus. Les compteurs de panne aussi : un remontage est une
    // seconde chance, c'est ce que fait le bouton « Réessayer ».
    regHors = [];
    regsModules = {};
    etatsModules = {};
    hooks = regHors;
    compHooks = [];
    optSpesHooks = [];
    optSpesRebuild = null;
    // Filtres et table des modules : même remise à zéro, même raison. Ce sont
    // les mods et les modules qui les repeuplent, à chaque montage. Sans elle,
    // un mod désinstallé garderait pour toujours la place du module natif qu'il
    // avait remplacé, et ses filtres s'empileraient à chaque remontage.
    filtres = {};
    filtresEnCours = {};
    proprietaireCourant = "?";
    modules = MODULES_NATIFS.slice();
    moduleOrdre = [];
    rejoueHorsMontage();
    // les mods d'abord (ils enregistrent modules et filtres), la disposition
    // ensuite : elle peut nommer un module qu'un mod vient d'ajouter
    executeMods();
    // La place D'ORIGINE de chaque module, relevée AVANT qu'appliqueDisposition
    // ne remanie la table. C'est elle qui dit où un module retourne quand on
    // rétablit la disposition d'origine, et le plan s'en sert pour montrer un
    // rangement encore en attente : sans elle, la table en mémoire porte déjà
    // la place forcée et plus rien ne sait d'où le module venait.
    placeOrigine = {};
    modules.forEach(function (m) {
      placeOrigine[m.id] = { onglet: m.onglet, colonne: m.colonne };
    });
    appliqueDisposition();
    root.innerHTML = "";
    var app = el("div", "perso-atelier");
    appEl = app;

    buildTop(app);
    bandeauAvis(app);
    var sheet = el("div", "pc-sheet");
    app.appendChild(sheet);
    root.appendChild(app);

    buildHead(sheet);
    monteModules(buildTabs(sheet));
    enMontage = false;   // ce qui s'enregistre après (console) vaut pour le montage suivant
    refresh();
  }

  // Charger les données et MONTER sont deux pannes différentes, et elles ne se
  // disent pas de la même façon. Le montage vivait dans le .then() du fetch :
  // tout ce qui tombait pendant lui (le plus souvent un mod) se faisait
  // rattraper par le .catch d'à côté, qui accusait alors le fichier de données
  // d'une faute qui n'était pas la sienne — et data-ready interdisant le
  // réessai, la fiche restait close sur un message faux. Chacun son filet.
  function demarre(root) {
    state = load() || blank();
    try { mount(root); }
    catch (e) {
      if (window.console && window.console.error) window.console.error("[fiche] montage", e);
      root.innerHTML = '<p style="padding:2rem;color:#b0402c">La fiche n\'a pas pu se monter (' +
        messageErreur(e) + "). Les données, elles, sont chargées : la cause est dans la fiche ou dans un mod.</p>";
    }
  }
  function init() {
    var root = document.getElementById("perso-atelier");
    if (!root || root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    // point d'entrée des objets donnés au tchat : l'amorce Roll20 appelle ceci
    // quand le joueur clique « Prendre » (et rejoue ce qui attendait le montage)
    window.__miaOnTake = function (payload) {
      if (!state) { flash("La fiche n'est pas encore prête : reclique « Prendre »."); return; }
      recevoirObjet(payload);
    };
    if (DATA) { demarre(root); return; }
    fetch(dataUrl(), { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      // DATA vide vaut échec : sans lui le montage partirait sans données, et
      // c'est bien du fichier qu'il faudrait alors se plaindre
      .then(function (d) { if (!d) throw new Error("données vides"); DATA = d; })
      .catch(function (e) {
        root.innerHTML = '<p style="padding:2rem;color:#b0402c">Le créateur n\'a pas pu charger ses données (' + e.message + ").</p>";
      })
      // hors de portée du .catch ci-dessus : DATA dit si les données sont là
      .then(function () { if (DATA) demarre(root); });
  }

  if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
