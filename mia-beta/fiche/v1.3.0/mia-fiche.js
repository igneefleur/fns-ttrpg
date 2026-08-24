/* Créateur de personnage MIA — onglet « Création » du site.
 *
 * Mise en page « dossier » transposée du créateur HxH : barre d'outils avec la
 * bibliothèque, feuille à largeur fixe, en-tête portrait + identité, compteurs
 * de budgets, onglets (Fiche / Art / Équipement / Bio / Options), colonnes,
 * valeurs cliquables pour lancer les jets, journal de jets flottant.
 * La Fiche a trois colonnes (caractéristiques | combat | compétences), tout
 * dans l'ordre Body, Mind, Prestance ; une ligne par compétence (nom | stade
 * en menu | total-jet). L'onglet Art porte la personnalisation : les
 * passifs d'une compétence et son art (au stade Artiste).
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
  var RELEASE = "1.3.0";
  var SCHEMA = 1;

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
    speMarge: 50, speMin: 30,     // plafond d'une spécialité : LIM − 50 − MOD − plafond
    endurAction: 50,              // endurance dépensable sur une même action
    iniMult: 2, iniMainsNues: 20,
    vitesseCarre: true, vitesseMult: 2,   // « AGI × AGI » ; le second ne sert que si la page repasse à « AGI × n »
    sautLong: 1.75, sautHaut: 2, recupMult: 2
  };

  var MOD_PAS = 5;            // tous les modificateurs se règlent de 5 en 5

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
  // « d100 + bonus » et « la limite », dont Roll20 ne garde que le plus bas
  // (kl1). La limite plafonne donc le résultat, et le tchat l'affiche déjà
  // plafonné. Ce champ ne porte que la partie ALÉATOIRE ; jetCommande() bâtit
  // le reste autour d'elle.
  var DE_DEFAUT = "d100";

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
      // et le plafond peut se relever caractéristique par caractéristique,
      // pour l'avantage ou l'arbitrage qui déborde la règle
      caracsPlafondMod: {}, caracsPlafondForce: {},

      // sigle -> points achetés. Les modificateurs sont DEUX (l'équipement,
      // puis l'arbitrage) : un seul champ obligeait à additionner de tête
      // avant de saisir, et à défaire le calcul pour en retirer un.
      caracs: {}, caracsMod: {}, caracsMod2: {},
      caracsForce: {}, caracsXpForce: {}, caracsXpMod: {}, caracsXpMod2: {},

      // sigle -> points investis (1 XP le point). Mêmes leviers.
      comps: {}, compsMod: {}, compsMod2: {},
      compsForce: {}, compsXpForce: {}, compsXpMod: {}, compsXpMod2: {},

      // LES SPÉCIALITÉS sont une LISTE et non une table : leur nom est libre,
      // le joueur les crée. Chacune dit de quelle caractéristique et de quelle
      // compétence elle relève, parce que ces deux-là commandent son plafond et
      // le jet qui la lance.
      // { nom, carac, comp, pts, mod, mod2, force, xpForce }
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
      de: DE_DEFAUT
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
    // La valeur achetée se borne au prestige maximal des règles et non au
    // prestige du personnage : le plafond est affaire de CALCUL (caracPlafond),
    // pas de rangement. Un joueur qui redescend son prestige ne doit pas voir
    // ses achats effacés au premier enregistrement.
    s.caracs = tableNombres(s.caracs, function (v) { return entier(v, 0, pMax); });
    ["caracsMod", "caracsMod2", "caracsXpMod", "caracsXpMod2", "caracsPlafondMod"]
      .forEach(function (k) { s[k] = tableNombres(s[k], modNum); });
    ["caracsForce", "caracsXpForce", "caracsPlafondForce"]
      .forEach(function (k) { s[k] = tableForce(s[k]); });

    // ---------- les compétences ----------
    // Les points ne se bornent pas au plafond ici non plus, et pour la même
    // raison : compPts() le fait au calcul, et une caractéristique momentanément
    // baissée ne doit pas coûter au joueur ce qu'il avait investi.
    s.comps = tableNombres(s.comps, function (v) { return entier(v, 0, 9999); });
    ["compsMod", "compsMod2", "compsXpMod", "compsXpMod2"]
      .forEach(function (k) { s[k] = tableNombres(s[k], modNum); });
    ["compsForce", "compsXpForce"].forEach(function (k) { s[k] = tableForce(s[k]); });

    // ---------- les spécialités ----------
    // Une spécialité sans caractéristique ni compétence reste dans la fiche : le
    // joueur vient peut-être de l'ajouter et n'a pas fini de la remplir. Elle ne
    // vaut simplement rien tant qu'elle n'en désigne pas.
    s.specialites = objArray(s.specialites).map(function (sp) {
      return {
        nom: sp.nom == null ? "" : String(sp.nom),
        carac: connu(sp.carac, codesC),
        comp: connu(sp.comp, codesK),
        pts: entier(sp.pts, 0, 9999),
        mod: modNum(sp.mod), mod2: modNum(sp.mod2),
        // le bonus de la spécialité : une valeur EN PLUS, qui part de zéro et
        // qu'on peut vouloir négative (un malus permanent)
        bonus: modNum(sp.bonus),
        force: forceVal(sp.force), xpForce: forceVal(sp.xpForce)
      };
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
    s.de = s.de == null ? DE_DEFAUT : String(s.de);
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
  // caracTotal(), compPlafond() lit caracMod(), spePlafond() lit les deux, et
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
    caracTotal: 1, caracMod: 1, caracLim: 1,
    compValue: 1, compPlafond: 1, compXp: 1,
    spePts: 1, spePlafond: 1, jetBonus: 1,
    pvMax: 1, enduranceMax: 1, enduranceMalus: 1, recupJour: 1,
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

  // ---------- le prestige ----------
  function prestigeAuto() { return (state.prestige || 0) + (state.prestigeMod || 0); }
  function prestige() {
    if (state.prestigeForce !== null && state.prestigeForce !== undefined) return state.prestigeForce;
    return prestigeAuto();
  }
  // Plafond d'une caractéristique : le prestige, décalé caractéristique par
  // caractéristique, ou remplacé net. UN SEUL endroit le calcule — les
  // garde-fous des boutons, l'infobulle et le champ forcé des Options lisent
  // tous cette fonction, sinon trois chiffres différents finissent à l'écran.
  function caracPlafondAuto(c) { return prestige() + (state.caracsPlafondMod[c] || 0); }
  function caracPlafond(c) {
    if (state.caracsPlafondForce[c] !== undefined) return state.caracsPlafondForce[c];
    return caracPlafondAuto(c);
  }

  // ---------- les caractéristiques ----------
  function caracBase(c) { return state.caracs[c] || 0; }
  function caracTotalBrut(c) {
    // total FORCÉ : il court-circuite tout, plafond et modificateurs compris
    if (state.caracsForce[c] !== undefined) return state.caracsForce[c];
    var v = Math.min(caracBase(c), caracPlafond(c));
    // le modificateur (bloc Options) s'applique APRÈS le plafond : il peut
    // porter le total au-delà du prestige comme en dessous de zéro.
    return v + (state.caracsMod[c] || 0) + (state.caracsMod2[c] || 0);
  }
  function caracTotal(c) {
    var v = caracTotalBrut(c);
    // le test évite de fabriquer l'objet d'infos pour rien : ce calcul-là est
    // rappelé des centaines de fois par rafraîchissement
    return aFiltre("caracTotal") ? applique("caracTotal", v, { carac: c }) : v;
  }
  // LE MODIFICATEUR, qui s'ajoute à tous les jets passant par la
  // caractéristique, et LA LIMITE, qui les plafonne. Les deux se lisent dans la
  // table, jamais ne se recalculent.
  function caracModBrut(c) { return ligneValeur(caracTotal(c)).mod; }
  function caracMod(c) {
    var v = caracModBrut(c);
    return aFiltre("caracMod") ? applique("caracMod", v, { carac: c }) : v;
  }
  function caracLimBrut(c) { return ligneValeur(caracTotal(c)).lim; }
  function caracLim(c) {
    var v = caracLimBrut(c);
    return aFiltre("caracLim") ? applique("caracLim", v, { carac: c }) : v;
  }
  // Ce qu'une caractéristique coûte : l'XP CUMULÉ de sa ligne, et non une somme
  // de pas. La table porte déjà les 20 XP le +1 jusqu'à 5 puis 40 au-delà, donc
  // un barème corrigé dans les règles arrive ici sans qu'on rouvre ce fichier.
  function caracXpAuto(c) {
    return ligneValeur(caracBase(c)).xp +
           (state.caracsXpMod[c] || 0) + (state.caracsXpMod2[c] || 0);
  }
  function caracXp(c) {
    if (state.caracsXpForce[c] !== undefined) return state.caracsXpForce[c];
    return caracXpAuto(c);
  }

  // ---------- les compétences ----------
  // LE PLAFOND DE POINTS : le MOD le plus haut des caractéristiques qui
  // commandent la compétence. PHY en compte quatre, COM deux, les six autres
  // une seule — et c'est la page de règles qui le dit, pas ce fichier.
  function compPlafondBrut(code) {
    var mods = compInfo(code).mod || [], best = 0;
    for (var i = 0; i < mods.length; i++) best = Math.max(best, caracMod(mods[i]));
    return best;
  }
  function compPlafond(code) {
    var v = compPlafondBrut(code);
    return aFiltre("compPlafond") ? applique("compPlafond", v, { cle: code }) : v;
  }
  // La caractéristique par DÉFAUT d'une compétence : celle qui fournit le MOD
  // et la LIM quand le joueur ne demande rien d'autre. Il peut en demander une
  // autre — c'est tout l'intérêt d'avoir séparé les deux colonnes.
  function compCarac(code) { return compInfo(code).lim || champs()[0] || ""; }
  function compPtsBrut(code) {
    if (state.compsForce[code] !== undefined) return state.compsForce[code];
    var v = Math.min(state.comps[code] || 0, compPlafond(code));
    return v + (state.compsMod[code] || 0) + (state.compsMod2[code] || 0);
  }
  function compPts(code) {
    var v = compPtsBrut(code);
    return aFiltre("compValue") ? applique("compValue", v, { cle: code }) : v;
  }
  function compXpAuto(code) {
    return (state.comps[code] || 0) * repli("xpComp") +
           (state.compsXpMod[code] || 0) + (state.compsXpMod2[code] || 0);
  }
  function compXp(code) {
    if (state.compsXpForce[code] !== undefined) return state.compsXpForce[code];
    var v = compXpAuto(code);
    return aFiltre("compXp") ? applique("compXp", v, { cle: code }) : v;
  }

  // ---------- les spécialités ----------
  // Une spécialité relève d'UNE caractéristique et d'UNE compétence, qui ne
  // sont pas forcément accordées : Esquive tient de DEX, sa compétence COM
  // plafonne sur le meilleur de DEX et d'AGI. Le plafond de la spécialité les
  // fait donc entrer tous les deux, chacun compté pour 30 au minimum — sans quoi
  // on accumulerait des points à 2 en caractéristique pour les emporter à 3.
  function spePlafondBrut(spe) {
    if (!spe || !spe.carac) return 0;
    var min = repli("speMin");
    var v = caracLim(spe.carac) - repli("speMarge") -
            Math.max(caracMod(spe.carac), min) -
            Math.max(spe.comp ? compPlafond(spe.comp) : 0, min);
    return Math.max(0, v);
  }
  function spePlafond(spe) {
    var v = spePlafondBrut(spe);
    return aFiltre("spePlafond") ? applique("spePlafond", v, { spe: spe }) : v;
  }
  function spePtsBrut(spe) {
    if (!spe) return 0;
    if (spe.force !== null && spe.force !== undefined) return spe.force;
    return Math.min(spe.pts || 0, spePlafond(spe)) + (spe.mod || 0) + (spe.mod2 || 0);
  }
  function spePts(spe) {
    var v = spePtsBrut(spe);
    return aFiltre("spePts") ? applique("spePts", v, { spe: spe }) : v;
  }
  // Un point de spécialité coûte un QUART d'XP : le total est donc décimal, et
  // c'est voulu. On l'arrondit au centième pour que l'en-tête n'affiche pas
  // 12.750000000000002.
  function speXp(spe) {
    if (!spe) return 0;
    if (spe.xpForce !== null && spe.xpForce !== undefined) return spe.xpForce;
    return Math.round((spe.pts || 0) * repli("xpSpe") * 100) / 100;
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

  // ---------- l'expérience ----------
  function xpDepenseBrut() {
    var xp = 0;
    champs().forEach(function (c) { xp += caracXp(c); });
    champsComp().forEach(function (c) { xp += compXp(c); });
    (state.specialites || []).forEach(function (s) { xp += speXp(s); });
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
  // LE BONUS D'UNE SPÉCIALITÉ s'ajoute ici, en dernier : c'est une valeur EN
  // PLUS, qui part de zéro, et non un terme du calcul de base. Elle entre DANS
  // le groupe, donc sous la limite : dépasser la limite reste le privilège de
  // l'endurance, et d'elle seule (voir jetExpr).
  function jetBonusBrut(carac, comp, spe) {
    var b = caracMod(carac) - enduranceMalus();
    if (comp) b += compPts(comp);
    if (spe) b += spePts(spe) + speMalusCharge(spe) + (spe.bonus || 0);
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
  function jetExpr(bonus, lim, avecInput) {
    var b = Math.round(bonus);
    return "{" + DE_DEFAUT + (b >= 0 ? "+" : "-") + Math.abs(b) +
           ",0d0+" + Math.round(lim) + "}kl1" +
           (avecInput ? ENV_QUERY : "");
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
  function blankSpe(nom, carac, comp) {
    return {
      nom: nom || "", carac: carac || "", comp: comp || "",
      pts: 0, mod: 0, mod2: 0, bonus: 0, force: null, xpForce: null
    };
  }
  function allSpes() {
    return (state.specialites || []).map(function (s, i) {
      return {
        key: "spe/" + i, index: i, spe: s,
        name: s.nom || "Sans nom", carac: s.carac || "", comp: s.comp || ""
      };
    });
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
  function parseDice(expr) {
    var m = /^(\d{1,2})d(\d{1,4})([+-]\d{1,4})?$/i.exec(String(expr || "").replace(/\s/g, ""));
    if (!m) return null;   // expression illisible : doRoll prévient au lieu de lancer autre chose
    return { n: clamp(+m[1], 1, 20), faces: clamp(+m[2], 2, 1000), plus: +(m[3] || 0) };
  }

  // ÉCHAPPER UNE EXPRESSION POUR L'INTÉRIEUR D'UNE REQUÊTE ROLL20. Une requête
  // ?{…} se découpe sur « | » et sur la PREMIÈRE virgule de chaque option : une
  // expression de jet, qui porte {…,…}, la casserait donc en deux. Roll20 rend
  // les entités HTML à leur caractère après avoir résolu la requête, ce qui est
  // le seul moyen de faire voyager une accolade ou une virgule là-dedans.
  function echapQuery(expr) {
    return String(expr)
      .replace(/\{/g, "&#123;").replace(/\}/g, "&#125;")
      .replace(/,/g, "&#44;").replace(/\|/g, "&#124;");
  }
  // Le réglage « Au choix » de la barre d'envoi : Roll20 demande AVANT de
  // lancer quelle caractéristique porte le jet, la sienne proposée en premier.
  //
  // La requête ne porte pas un nombre mais L'EXPRESSION ENTIÈRE, parce que
  // changer de caractéristique change à la fois le MOD et la LIMITE. Deux
  // requêtes séparées poseraient deux questions au joueur, qui pourrait
  // répondre deux choses différentes et obtenir un jet incohérent.
  // La requête ne porte que le GROUPE PLAFONNÉ, sans le modificateur d'envoi :
  // celui-ci s'ajoutant après le plafond, il se pose une seule fois, dehors,
  // quelle que soit la caractéristique choisie. Une requête dans une requête
  // n'a donc pas à exister.
  function caracQuery(propre, comp, spe) {
    var ordre = [propre].concat(champs().filter(function (c) { return c !== propre; }));
    var opts = ordre.map(function (c) {
      return c + "," + echapQuery(jetExpr(jetBonus(c, comp, spe), caracLim(c), false));
    });
    return "?{Caractéristique|" + opts.join("|") + "}";
  }

  // LE JET DE TEST : caractéristique, compétence ou spécialité. C'est le seul
  // chemin par lequel un jet plafonné part au tchat.
  function doJet(label, carac, comp, spe, tracker) {
    var expr = envCaracChoix()
      ? caracQuery(carac, comp, spe) + (envInput() ? ENV_QUERY : "")
      : jetExpr(jetBonus(carac, comp, spe), caracLim(carac), envInput());
    if (envoyer(cmdJetExpr(label, expr, tracker))) return;
    // Hors Roll20, ou sous une extension antérieure au canal brut : la fiche
    // lance elle-même et applique le plafond, en le DISANT — un résultat rogné
    // sans explication passerait pour une faute de calcul.
    var de = 1 + Math.floor(Math.random() * 100);
    var bonus = jetBonus(carac, comp, spe), lim = caracLim(carac);
    var brut = de + bonus, total = Math.min(brut, lim);
    var det = "dé " + de + (bonus ? " " + (bonus >= 0 ? "+ " : "− ") + Math.abs(bonus) : "");
    if (total < brut) det += " = " + brut + ", plafonné à " + lim;
    flash(label + " : " + total + " (" + det + ")");
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
  var optHooks = [];            // bloc Options « Modificateurs de compétences », rebâtissable
  var optCompsRebuild = null;   // posé par le module « optcomps » ; rappelé quand les comps perso changent

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
    joue("optcomps", optHooks, bilan);
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

    // sans input / avec input : la requête ?{…} n'a de sens que sur un jet de
    // test, elle est donc posée par doRoll et ignorée partout ailleurs
    var sep = el("span", "lbl", "Modificateur");
    sep.title = "S'ajoute APRÈS la limite — c'est par là que passe l'endurance dépensée";
    bar.appendChild(sep);
    var segs2 = el("div", "pc-envoi-segs");
    var bin = [];
    [["0", "Sans input", "Le jet part tel quel"],
     ["1", "Avec input", "Roll20 demande un modificateur avant de lancer"]].forEach(function (o) {
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
    // choix » fait demander par Roll20 quelle caractéristique porte le jet (les
    // huit, la sienne en tête). Elle change à la fois le MOD et la LIMITE, d'où
    // une requête qui porte l'expression entière et non un nombre.
    var sep3 = el("span", "lbl", "Caractéristique");
    sep3.title = "Ne s'applique qu'aux jets de compétence";
    bar.appendChild(sep3);
    var segs3 = el("div", "pc-envoi-segs");
    var cbtn = [];
    [["0", "Automatique", "La compétence part avec sa caractéristique"],
     ["1", "Au choix", "Roll20 demande quelle caractéristique utiliser avant de lancer"]].forEach(function (o) {
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
      // plafond : ce sont les deux murs du système, et ils ne se franchissent
      // que par un forçage du MJ — qu'on ne signale donc pas.
      champs().forEach(function (c) {
        if (state.caracsForce[c] !== undefined) return;
        if (caracBase(c) > caracPlafond(c))
          warns.appendChild(el("div", "pc-warn", "« " + caracInfo(c).nom + " » dépasse le plafond du prestige (" +
            caracBase(c) + " / " + caracPlafond(c) + ")."));
      });
      champsComp().forEach(function (c) {
        if (state.compsForce[c] !== undefined) return;
        if ((state.comps[c] || 0) > compPlafond(c))
          warns.appendChild(el("div", "pc-warn", "« " + compInfo(c).nom + " » dépasse son plafond de points (" +
            (state.comps[c] || 0) + " / " + compPlafond(c) + ")."));
      });
      (state.specialites || []).forEach(function (sp) {
        if (!sp.carac || sp.force !== null) return;
        if ((sp.pts || 0) > spePlafond(sp))
          warns.appendChild(el("div", "pc-warn", "« " + (sp.nom || "Spécialité") + " » dépasse son plafond (" +
            (sp.pts || 0) + " / " + spePlafond(sp) + ")."));
      });
    });
    sheet.appendChild(warns);
  }

  // ---------- onglets ----------
  var TABS = [
    { id: "fiche", label: "Fiche" },
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
        caracMod: caracMod,
        caracLim: caracLim,
        compPts: compPts,
        compPlafond: compPlafond,
        spePts: spePts,
        spePlafond: spePlafond,
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
    // jeu : le sigle et son trio ; édition : les ± qui achètent la valeur, et
    // ce qu'elle a coûté
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
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "sp"));
    var teteTrio = el("span", "pc-trio tete");
    ["Val", "Mod", "Lim"].forEach(function (k) {
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

      // LE TRIO EST LE BOUTON DE JET, d'un seul tenant. Les trois nombres se
      // lisent dans l'ordre où ils se composent — la valeur qu'on a achetée, le
      // modificateur qu'elle donne au jet, la limite qui le coiffe — et aucun
      // ne veut rien dire sans les deux autres : c'est donc le BLOC qui lance,
      // et non l'un des trois. doJet est le seul chemin d'un jet de test : il
      // pose le MOD, la limite et le malus d'endurance sans qu'on y pense.
      var trio = el("span", "pc-trio pc-rollable");
      function case3() {
        var c = el("span", "c");
        var v = el("span", "v", "");
        c.appendChild(v);
        trio.appendChild(c);
        return v;
      }
      var vVal = case3();
      var vMod = case3();
      var vLim = case3();
      trio.addEventListener("click", function () { doJet(code, code, null, null); });
      top.appendChild(trio);
      row.appendChild(top);

      // LES ± ACHÈTENT LA VALEUR, et rien ne les retient faute d'xp : l'en-tête
      // AVERTIT dès que le total est dépassé, là où un blocage figerait à zéro
      // toute fiche remplie à l'envers — les valeurs d'abord, l'xp total
      // ensuite. Le prestige, lui, borne pour de bon.
      //
      // L'XP EST ICI, ET NON EN PERMANENCE : ce qu'une caractéristique a coûté
      // ne se lit qu'en construisant le personnage. En jouant, il n'apprend
      // rien et prend une ligne.
      var bot = el("div", "pc-crow-bot pc-edit-only");
      bot.appendChild(el("span", "lbl", "Valeur"));
      bot.appendChild(stepper(
        function () { return caracBase(code); },
        function (v) {
          // le plafond ne bloque que les HAUSSES : une valeur passée au-dessus
          // (prestige abaissé après coup, relèvement retiré des Options)
          // redescend pas à pas au lieu d'être écrasée d'un seul clic
          var plaf = caracPlafond(code);
          var haut = Math.max(plaf, caracBase(code));
          var n = Math.round(v);
          if (n > haut) {
            flash(haut === plaf
              ? "Plafond de " + plaf + "."
              : code + " est au-delà du plafond (" + plaf + ").");
            n = haut;
          }
          state.caracs[code] = Math.max(0, n);
        }, 1, "valeur"));
      bot.appendChild(el("span", "lbl", "XP"));
      var vXp = el("span", "max", "");
      vXp.style.justifySelf = "end";
      bot.appendChild(vXp);
      row.appendChild(bot);

      hooks.push(function () {
        var d = (state.caracsMod[code] || 0) + (state.caracsMod2[code] || 0);
        var force = state.caracsForce[code] !== undefined;
        var plaf = caracPlafond(code);
        var base = caracBase(code);
        var mord = base > plaf;
        var xpF = state.caracsXpForce[code] !== undefined;
        var xpD = (state.caracsXpMod[code] || 0) + (state.caracsXpMod2[code] || 0);
        var retouche = force || d !== 0 || mord;
        vVal.textContent = String(caracTotal(code));
        vMod.textContent = sign(caracMod(code));
        vLim.textContent = String(caracLim(code));
        trio.classList.toggle("adj", retouche);
        // quand le plafond mord, le dire : sans cela, le joueur voit un total
        // qui ne correspond ni à ce qu'il a acheté ni à ce qu'il a modifié, et
        // rien ne dit pourquoi. Un total forcé, lui, REMPLACE la somme :
        // l'afficher quand même la ferait mentir.
        trio.title = (force
                       ? "Total forcé (Options)"
                       : "Valeur " + base +
                         (mord ? ", plafonnée à " + plaf : "") +
                         (d ? " · modificateur (Options) " + sign(d) : "")) +
                     " — clic : lancer " + DE_DEFAUT + " " + sign(caracMod(code)) +
                     ", plafonné à " + caracLim(code);
        // l'XP se lit sur la valeur ACHETÉE, jamais sur le total : un
        // modificateur d'équipement ne se paie pas.
        vXp.textContent = String(caracXp(code));
        vXp.classList.toggle("adj", xpF || xpD !== 0);
        vXp.title = xpF ? "Coût forcé (Options) — calculé : " + caracXpAuto(code)
                        : (xpD ? "Modificateur (Options) " + sign(xpD) : "");
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
    var row = el("div", "pc-kv");
    var val = el("span", "pc-cval");
    row.appendChild(val);
    row.appendChild(el("span", "sp"));
    row.appendChild(miniBtn("Récupérer", "Rendre au personnage ses points de vie du jour",
                            function () {
      var n = recupJour();
      if (n <= 0) { flash("Rien à récupérer."); return; }
      // on ne dépasse jamais le maximum : une journée de repos ne fabrique pas
      // de points de vie en trop, et un personnage déjà au plein ne bouge pas
      var avant = pvCourant(), apres = Math.min(pvMax(), avant + n);
      if (apres === avant) { flash("Déjà au maximum."); return; }
      state.pv = apres;
      refresh();
      flash("PV : " + fmtP(avant) + " → " + fmtP(apres));
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
    var carac = item.carac || compCarac(code);
    var row = el("div", "pc-crow" + (odd ? " odd" : ""));

    var top = el("div", "pc-crow-top");
    var chip = el("span", "pc-abbr", code);
    chip.title = item.name;
    top.appendChild(chip);
    top.appendChild(el("span", "sp"));

    // LE TRIO EST LE BOUTON DE JET, d'un seul tenant : les points qu'on a
    // investis, le MOD de la caractéristique qui la porte, la limite qui coiffe
    // le résultat. Aucun ne veut rien dire sans les deux autres.
    var trio = el("span", "pc-trio pc-rollable");
    function case3() {
      var c = el("span", "c");
      var v = el("span", "v", "");
      c.appendChild(v);
      trio.appendChild(c);
      return v;
    }
    var vPts = case3();
    var vMod = case3();
    var vLim = case3();
    trio.addEventListener("click", function () { doJet(code, carac, code, null); });
    top.appendChild(trio);
    row.appendChild(top);

    // LES ± ACHÈTENT LES POINTS, et rien ne les retient faute d'xp : l'en-tête
    // avertit dès que le total est dépassé, là où un blocage figerait toute
    // fiche remplie à l'envers — les points d'abord, l'xp total ensuite. Le
    // plafond, lui, borne pour de bon : il vient des règles.
    //
    // LE PLAFOND ET L'XP SONT ICI, ET NON EN PERMANENCE : on ne les regarde
    // qu'en construisant. En jouant, ce qu'on cherche est sur la ligne du haut.
    var bot = el("div", "pc-crow-bot pc-edit-only");
    bot.appendChild(el("span", "lbl", "Points"));
    bot.appendChild(stepper(
      function () { return state.comps[code] || 0; },
      function (v) {
        // le plafond ne bloque que les HAUSSES : des points investis avant
        // qu'un malus ne rabaisse la caractéristique redescendent pas à pas au
        // lieu d'être rognés d'un seul clic, ce qui rendrait l'xp introuvable
        var plaf = compPlafond(code);
        var haut = Math.max(plaf, state.comps[code] || 0);
        var n = Math.round(v);
        if (n > haut) {
          flash(haut === plaf
            ? "Plafond de " + plaf + "."
            : code + " est au-delà du plafond (" + plaf + ").");
          n = haut;
        }
        n = Math.max(0, n);
        // zéro n'est pas une donnée : une clé absente vaut zéro partout
        // (accesseurs, attributs Roll20), et l'état voyage d'autant plus léger
        if (n) state.comps[code] = n; else delete state.comps[code];
      }, 1, "points", reg));
    bot.appendChild(el("span", "lbl", "Plafond"));
    var vPlaf = el("span", "max", "");
    vPlaf.style.justifySelf = "end";
    bot.appendChild(vPlaf);
    bot.appendChild(el("span", "lbl", "XP"));
    var vXp = el("span", "max", "");
    vXp.style.justifySelf = "end";
    bot.appendChild(vXp);
    row.appendChild(bot);

    reg.push(function () {
      var base = state.comps[code] || 0;
      var plaf = compPlafond(code);
      var mord = base > plaf;
      var d = (state.compsMod[code] || 0) + (state.compsMod2[code] || 0);
      var force = state.compsForce[code] !== undefined;
      var xpF = state.compsXpForce[code] !== undefined;
      var xpD = (state.compsXpMod[code] || 0) + (state.compsXpMod2[code] || 0);
      // le malus d'endurance pèse sur TOUS les jets : il est déjà dans le
      // bonus, il n'est nommé ici que pour qu'on sache d'où vient l'écart
      var mal = enduranceMalus();
      var b = jetBonus(carac, code, null);
      vPts.textContent = String(compPts(code));
      vMod.textContent = sign(caracMod(carac));
      vLim.textContent = String(caracLim(carac));
      trio.classList.toggle("adj", force || d !== 0 || mord || mal !== 0);
      trio.title = (force
                     ? "Points forcés (Options)"
                     : "Points " + base +
                       (mord ? ", plafonnés à " + plaf : "") +
                       (d ? " · modificateur (Options) " + sign(d) : "")) +
                   (mal ? " · endurance " + sign(-mal) : "") +
                   " — clic : lancer " + DE_DEFAUT + " " + sign(b) +
                   ", plafonné à " + caracLim(carac);
      vPlaf.textContent = String(plaf);
      vPlaf.classList.toggle("adj", mord);
      vXp.textContent = String(compXp(code));
      vXp.classList.toggle("adj", xpF || xpD !== 0);
      vXp.title = xpF ? "Coût forcé (Options) — calculé : " + compXpAuto(code)
                      : (xpD ? "Modificateur (Options) " + sign(xpD) : "");
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
  // Le filtre se coupe depuis l'onglet Options. Coupé, il DISPARAÎT et cesse
  // d'agir : un filtre invisible qui masque encore des lignes est un piège.
  // Réglage d'AFFICHAGE, donc dans le vrai localStorage du navigateur, jamais
  // dans le personnage.
  var FILTRES = { texte: "mia-filtre-texte" };
  function filtreTexteOn() { return lpref(FILTRES.texte, "1") !== "0"; }
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
    // jeu : les points, la limite et le jet ; édition : les ± qui achètent les
    // points, ligne par ligne
    var b = block("Compétences", null, "comps");
    // l'entête des trois colonnes, du même squelette que le trio des lignes :
    // c'est ce qui garantit que chaque mot tombe en face de sa colonne
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "sp"));
    var teteTrio = el("span", "pc-trio tete");
    ["Val", "Mod", "Lim"].forEach(function (k) {
      var c = el("span", "c");
      c.appendChild(el("span", "k", k));
      teteTrio.appendChild(c);
    });
    tete.appendChild(teteTrio);
    b.appendChild(tete);
    compBox = el("div");
    b.appendChild(compBox);
    rebuildComps();
    return b;
  }
  // ---------- onglet Fiche : les spécialités ----------
  // C'est la SEULE liste de la fiche que le joueur écrit entièrement. Les
  // règles disent ce qu'est une spécialité, ce qu'elle coûte et ce qui la
  // plafonne ; elles ne disent pas lesquelles existent. Le module ne propose
  // donc aucun catalogue : un nom libre, et deux sigles pour dire de quoi elle
  // relève.
  //
  // Les deux sélecteurs ne sont pas de l'ornement. La caractéristique donne le
  // MOD et la LIMITE du jet ; la compétence entre dans le plafond de points.
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
    tools.appendChild(line);
    if (search) b.appendChild(tools);
    // l'entête des trois colonnes, du même squelette que le trio des lignes :
    // c'est ce qui garantit que chaque mot tombe en face de sa colonne
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "sp"));
    var teteTrio = el("span", "pc-trio tete");
    ["Val", "Lim", "Bonus"].forEach(function (k) {
      var c = el("span", "c");
      c.appendChild(el("span", "k", k));
      teteTrio.appendChild(c);
    });
    tete.appendChild(teteTrio);
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

    // Un sélecteur de sigle. LE SIGLE EST LA VALEUR : c'est lui que l'état
    // garde et que les calculs lisent ; le nom entier n'est là que pour
    // choisir. La liste vient des règles, donc une caractéristique renommée
    // arrive ici sans qu'on rouvre ce fichier.
    function choixSigle(codes, nomDe, vide, lire, ecrire) {
      var s = el("select", "pc-select pc-edit-field");
      var neant = el("option", null, vide);
      neant.value = "";
      s.appendChild(neant);
      codes.forEach(function (c) {
        var o = el("option", null, c + " — " + nomDe(c));
        o.value = c;
        s.appendChild(o);
      });
      s.value = lire() || "";
      s.addEventListener("change", function () { ecrire(s.value); refresh(); });
      return s;
    }

    function ligne(it) {
      // la spécialité VIVANTE, et non l'objet capturé au montage : la liste
      // peut avoir bougé sous la ligne entre deux rendus
      var spe = it.spe;
      var row = el("div", "pc-crow");

      var top = el("div", "pc-crow-top");
      // le couple « caractéristique · compétence » tient la place du sigle
      // d'une caractéristique : c'est ce qu'on lit en premier pour savoir ce
      // que la ligne teste
      var chip = el("span", "pc-abbr", "");
      top.appendChild(chip);
      // LE NOM COMPTE POUR LES CALCULS : trois formules des règles vont
      // chercher une spécialité par son nom. Il se saisit donc tel quel, sans
      // capitale forcée ni correction, et l'infobulle dit lesquels sont lus.
      var nom = el("input", "nm pc-edit-field");
      nom.type = "text";
      nom.placeholder = "Nom de la spécialité";
      nom.value = spe.nom || "";
      nom.addEventListener("input", function () { spe.nom = nom.value; refresh(); });
      top.appendChild(nom);
      // LE MÊME TRIO QUE PARTOUT AILLEURS, et c'est le bloc ENTIER qui lance.
      // Ce que la caractéristique et la compétence apportent ne s'écrit PAS ici :
      // le sigle de gauche dit lesquelles, et leurs deux modules les portent déjà,
      // à deux colonnes de là. Restent les trois nombres qui n'appartiennent qu'à
      // la spécialité : ses points, la limite qui la coiffe, et son bonus.
      var quint = el("span", "pc-trio pc-rollable");
      function case5() {
        var c = el("span", "c");
        var v = el("span", "v", "");
        c.appendChild(v);
        quint.appendChild(c);
        return v;
      }
      var vPts = case5();
      var vLim = case5();
      var vBon = case5();
      quint.addEventListener("click", function () {
        // sans caractéristique, la limite vaut zéro et le jet ne rendrait
        // jamais que zéro : le dire vaut mieux que de le lancer
        if (!spe.carac) { flash("Cette spécialité ne dit pas de quelle caractéristique elle tient."); return; }
        doJet(spe.nom || "Spécialité", spe.carac, spe.comp, spe);
      });
      top.appendChild(quint);
      row.appendChild(top);

      var bot = el("div", "pc-crow-bot pc-edit-only");
      bot.appendChild(el("span", "lbl", "Carac"));
      bot.appendChild(choixSigle(champs(), function (c) { return caracInfo(c).nom; },
        "— caractéristique —",
        function () { return spe.carac; },
        function (v) { spe.carac = v; }));
      bot.appendChild(el("span", "lbl", "Compétence"));
      bot.appendChild(choixSigle(champsComp(), function (c) { return compInfo(c).nom; },
        "— compétence —",
        function () { return spe.comp; },
        function (v) { spe.comp = v; }));
      bot.appendChild(el("span", "lbl", "Points"));
      bot.appendChild(stepper(
        function () { return spe.pts || 0; },
        function (v) {
          // le plafond ne bloque que les HAUSSES, comme partout ailleurs : il
          // tient de la limite d'une caractéristique et du plafond d'une
          // compétence, qui bougent tous deux sous les pieds de la spécialité
          var plaf = spePlafond(spe);
          var haut = Math.max(plaf, spe.pts || 0);
          var n = Math.round(v);
          if (n > haut) {
            flash(haut === plaf
              ? "Plafond de " + plaf + "."
              : "Cette spécialité est déjà au-delà de son plafond (" + plaf + ") : elle ne peut que redescendre.");
            n = haut;
          }
          spe.pts = Math.max(0, n);
        }, 1, "points", lignes));
      // LE BONUS : une valeur EN PLUS, qui part de zéro. Elle ne se déduit de
      // rien — ni des points, ni de la caractéristique, ni de la compétence —
      // et c'est pour cela qu'elle se saisit, au pas des modificateurs.
      bot.appendChild(el("span", "lbl", "Bonus"));
      bot.appendChild(stepper(
        function () { return spe.bonus || 0; },
        function (v) { spe.bonus = clamp(Math.round(v), -999, 999); },
        MOD_PAS, "bonus", lignes));
      bot.appendChild(el("span", "lbl", "Plafond"));
      var vPlaf = el("span", "max", "");
      vPlaf.style.justifySelf = "end";
      bot.appendChild(vPlaf);
      // LE COÛT EST NOMMÉ ICI, avec le reste de la construction : un point de
      // spécialité ne coûte pas un point d'xp, et on ne le regarde qu'en
      // achetant. En jouant, ce qu'on cherche est sur la ligne du haut.
      bot.appendChild(el("span", "lbl", "XP"));
      var vXp = el("span", "max", "");
      vXp.style.justifySelf = "end";
      bot.appendChild(vXp);
      // le retrait descend avec le reste : c'est un geste de construction, et
      // le laisser en haut décalait le quintuple d'une ligne à l'autre selon
      // que le rouage était ouvert ou fermé
      var sup = el("span");
      sup.style.gridColumn = "1 / -1";
      sup.style.justifySelf = "end";
      sup.appendChild(miniBtn("✕ Retirer", "Retirer cette spécialité", function () {
        // des points sont de l'xp dépensé : on ne les efface pas sur un clic
        // malheureux sans demander
        if (spe.pts &&
            !confirm("Retirer « " + (spe.nom || "sans nom") + " » et ses " + spe.pts + " points ?")) return;
        state.specialites.splice(it.index, 1);
        rendu();
        refresh();
        if (optCompsRebuild) optCompsRebuild();   // sa ligne quitte aussi le bloc des Options
      }, "danger"));
      bot.appendChild(sup);
      row.appendChild(bot);

      lignes.push(function () {
        var plaf = spePlafond(spe);
        var mord = (spe.pts || 0) > plaf;
        var d = (spe.mod || 0) + (spe.mod2 || 0);
        var force = spe.force !== null && spe.force !== undefined;
        var xpF = spe.xpForce !== null && spe.xpForce !== undefined;
        var mal = enduranceMalus();
        // la charge ne mord que sur l'esquive, et l'esquive est une spécialité :
        // un −100 apparu sans être nommé passerait pour une faute de calcul
        var ch = speMalusCharge(spe);
        var lim = spe.carac ? caracLim(spe.carac) : 0;
        var bonus = jetBonus(spe.carac, spe.comp, spe);
        chip.textContent = (spe.carac || "—") + " · " + (spe.comp || "—");
        chip.title = (spe.carac ? caracInfo(spe.carac).nom : "aucune caractéristique") +
                     " · " + (spe.comp ? compInfo(spe.comp).nom : "aucune compétence");
        // LES TROIS CASES NE DISENT QUE LA SPÉCIALITÉ : ses points, sa limite,
        // son bonus. Ce que la caractéristique et la compétence apportent se lit
        // dans leurs propres modules, à deux colonnes de là ; le répéter ici
        // mettait quatre nombres sur la ligne pour n'en expliquer qu'un.
        vPts.textContent = String(spePts(spe));
        vLim.textContent = spe.carac ? String(lim) : "—";
        vBon.textContent = sign(spe.bonus || 0);
        quint.classList.toggle("adj", force || d !== 0 || mord || mal !== 0 || ch !== 0);
        quint.title = !spe.carac
          ? ""
          : (force
               ? "Points forcés (Options)"
               : "Points " + (spe.pts || 0) +
                 (mord ? ", plafonnés à " + plaf : "") +
                 (d ? " · modificateur (Options) " + sign(d) : "")) +
            " · " + spe.carac + " " + sign(caracMod(spe.carac)) +
            (spe.comp ? " · " + spe.comp + " " + sign(compPts(spe.comp)) : "") +
            ((spe.bonus || 0) ? " · bonus " + sign(spe.bonus) : "") +
            (ch ? " · charge " + sign(ch) : "") +
            (mal ? " · endurance " + sign(-mal) : "") +
            " — clic : lancer " + DE_DEFAUT + " " + sign(bonus) +
            ", plafonné à " + lim;
        vPlaf.textContent = String(plaf);
        vPlaf.classList.toggle("adj", mord);
        vXp.textContent = String(speXp(spe));
        vXp.classList.toggle("adj", xpF);
        vXp.title = xpF ? "Coût forcé (Options)" : "";
      });
      return row;
    }

    function rendu() {
      box.innerHTML = "";
      // les fonctions des lignes effacées n'ont plus rien à rafraîchir ; le
      // tableau est vidé SUR PLACE, celui du registre étant le même objet
      lignes.length = 0;
      var flt = filtreDe(speFilter);
      var items = allSpes();
      if (flt) items = items.filter(function (it) {
        return it.name.toLowerCase().indexOf(flt) >= 0;
      });
      items.forEach(function (it) { box.appendChild(ligne(it)); });
      if (!items.length) box.appendChild(el("div", "pc-empty", "—"));
      box.appendChild(miniBtn("+ Ajouter une spécialité", null, function () {
        state.specialites.push(blankSpe());
        rendu();
        refresh();
        if (optCompsRebuild) optCompsRebuild();   // la nouvelle gagne sa ligne dans Options
      }, "pc-edit-only"));
      // les lignes qui viennent de naître doivent obéir au verrou du bloc :
      // rien ne le leur dirait avant le prochain rafraîchissement
      applyEdit(b, "specialites");
    }
    rendu();
    return b;
  }

  // ---------- onglet Équipement ----------
  function eqField(labelTxt, obj, key, wide) {
    var i = el("input", "pc-edit-field");
    i.type = "text";
    i.placeholder = labelTxt;
    i.value = obj[key] || "";
    i.addEventListener("input", function () { obj[key] = i.value; save(); });
    return fld(labelTxt, i, wide ? "w" : null);
  }
  function eqArea(labelTxt, obj, key, rows) {
    var t = el("textarea", "pc-notes pc-edit-field");
    t.rows = rows || 3;
    t.value = obj[key] || "";
    t.addEventListener("input", function () { obj[key] = t.value; save(); });
    return fld(labelTxt, t, "w");
  }
  // Le champ accepte TOUTE expression Roll20, pas seulement « 5D8 » : dés,
  // références d'attribut @{Perso|mia_body}, requêtes ?{…}, arithmétique.
  // L'expression part telle quelle dans le jet en ligne. Elle n'est PAS
  // réécrite : l'ancienne extraction n'en gardait que les premiers dés et
  // jetait le reste en silence (« 5d6+@{Zhalian|mia_body}/10 » devenait
  // « 5d6 »).
  function diceOf(txt) {
    return String(txt == null ? "" : txt).replace(/\s+/g, " ").trim() || null;
  }
  function eqCards(box, items, kind, blk, mid) {
    // kind : "arme" (poids/dégâts/reach/propriétés) ou "armure" (poids/invu/zones)
    // blk / mid : le bloc hôte et son id de module d'édition (jeu : Jet et
    // Chat ; édition : fiches, ajout, retrait)
    function render() {
      box.innerHTML = "";
      items.forEach(function (it, idx) {
        var card = el("div", "pc-arme");
        var head = el("div", "pc-arme-head");
        var nm = el("input", "nm pc-edit-field");
        nm.type = "text";
        nm.placeholder = kind === "arme" ? "Nom de l'arme" : "Nom de l'armure";
        nm.value = it.nom || "";
        nm.addEventListener("input", function () { it.nom = nm.value; save(); });
        head.appendChild(nm);
        head.appendChild(chatBtn(
          function () { return (kind === "arme" ? "Arme — " : "Armure — ") + (it.nom || (kind === "arme" ? "arme" : "armure")); },
          function () {
            // valeurs courtes étiquetées, propriétés (texte long) pleine largeur
            return kind === "arme"
              ? [["Poids", it.poids], ["Ini", it.ini], ["Dégâts", it.degats], ["Reach", it.reach], ["", it.props]]
              : [["Poids", it.poids], ["Ini", it.ini], ["Invu", it.invu], ["Zones protégées", it.zones]];
          }));
        head.appendChild(miniBtn("✕", "Retirer", function () { items.splice(idx, 1); render(); refresh(); }, "danger pc-edit-only"));
        card.appendChild(head);

        var line = el("div", "pc-arme-line");
        line.appendChild(eqField("Poids", it, "poids"));
        // L'INITIATIVE PORTE DEUX RÈGLES DANS UN SEUL CHAMP, et c'est la case
        // « porté » qui les départage : un bonus ne compte QUE si l'objet est
        // porté activement, un malus compte TOUJOURS, même au fond du sac. Le
        // calcul est dans equipInitBonus() ; ici on ne fait que saisir.
        line.appendChild(eqField("Ini", it, "ini"));
        if (kind === "arme") {
          line.appendChild(eqField("Dégâts", it, "degats"));
          line.appendChild(eqField("Reach", it, "reach"));
        } else {
          line.appendChild(eqField("Invu", it, "invu"));
        }
        var porte = el("label", "pc-eq-porte");
        var pcb = el("input", null);
        pcb.type = "checkbox";
        pcb.checked = it.porte !== false;
        pcb.title = kind === "arme" ? "Arme en main" : "Armure portée";
        pcb.addEventListener("change", function () { it.porte = pcb.checked; save(); refresh(); });
        porte.appendChild(pcb);
        porte.appendChild(el("span", null, kind === "arme" ? "En main" : "Portée"));
        line.appendChild(porte);
        var chip = el("span", "pc-roll-chip", "Jet");
        chip.title = kind === "arme" ? "Lancer les dégâts" : "Lancer l'invu";
        chip.addEventListener("click", function () {
          var d = diceOf(kind === "arme" ? it.degats : it.invu);
          if (!d) { flash("Renseigner d'abord " + (kind === "arme" ? "les dégâts" : "l'invu") +
                          " (ex. 5D8, ou toute expression Roll20)."); return; }
          doRoll((kind === "arme" ? "Dégâts — " : "Invu — ") + (it.nom || (kind === "arme" ? "arme" : "armure")), 0, d, false);
        });
        line.appendChild(chip);
        card.appendChild(line);

        var line2 = el("div", "pc-arme-line");
        if (kind === "arme") line2.appendChild(eqArea("Avantages / désavantages", it, "props", 3));
        else line2.appendChild(eqArea("Zones protégées", it, "zones", 2));
        card.appendChild(line2);

        box.appendChild(card);
      });
      if (!items.length) box.appendChild(el("div", "pc-empty", kind === "arme" ? "Aucune arme." : "Aucune armure."));
      var add = miniBtn(kind === "arme" ? "+ Ajouter une arme" : "+ Ajouter une armure", null, function () {
        items.push({});
        render();
        refresh();
      }, "pc-edit-only");
      box.appendChild(add);
      if (blk) applyEdit(blk, mid);
    }
    render();
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

  function buildArmes() {
    var bA = block("Armes", null, "armes");
    var boxA = el("div");
    bA.appendChild(boxA);
    eqCards(boxA, state.armes, "arme", bA, "armes");
    return bA;
  }

  function buildArmures() {
    var bB = block("Armures", null, "armures");
    var boxB = el("div");
    bB.appendChild(boxB);
    eqCards(boxB, state.armures, "armure", bB, "armures");
    return bB;
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
    de.title = "Ce que la fiche lance pour un jet de test. Écrit en macro Roll20 : " +
               "cs> marque le coup critique, cf< l'échec critique.";
    de.value = state.de || DE_DEFAUT;
    de.addEventListener("input", function () { state.de = de.value || DE_DEFAUT; save(); });
    hooks.push(function () { if (document.activeElement !== de) de.value = state.de || DE_DEFAUT; });
    // Le champ et son bouton sur la MÊME ligne : le champ prend toute la place
    // que le bouton lui laisse. Sous le champ, le bouton occupait une rangée
    // entière pour un mot, et le bloc en paraissait deux fois plus haut.
    var ligneDe = el("div", "pc-jet-de");
    ligneDe.appendChild(fld("Dé des jets de test", de));
    ligneDe.appendChild(miniBtn("Réinitialiser", "Revenir au dé des règles : " + DE_DEFAUT,
      function () { state.de = DE_DEFAUT; refresh(); }));
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
  // un champ de modificateur, nu, comme dans le bloc des compétences
  function champModVal(lire, ecrire, borne, titre) {
    var inp = el("input", "pc-num modif");
    inp.type = "number"; inp.step = String(MOD_PAS);
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      ecrire(isFinite(v) ? clamp(Math.round(v), -borne, borne) : 0);
      refresh();
    });
    hooks.push(function () {
      if (document.activeElement !== inp) inp.value = lire() ? lire() : "";
    });
    return inp;
  }
  function champMod(map, cle, borne, titre) {
    return champModVal(function () { return map[cle]; },
                       function (v) { map[cle] = v; }, borne, titre);
  }
  // un champ de forçage : vide = valeur calculée (undefined = pas de forçage)
  function champForceVal(lire, ecrire, auto, titre) {
    var inp = el("input", "force");
    inp.type = "number"; inp.step = "1";
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      ecrire(isFinite(v) ? clamp(Math.round(v), -9999, 9999) : undefined);
      refresh();
    });
    hooks.push(function () {
      inp.placeholder = String(auto());
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

  // ---- modificateurs de caractéristiques ----
  // Les HUIT des règles, dans leur ordre de page. Même grille au dixième de
  // rem près que le bloc des compétences : régler une caractéristique et
  // régler une compétence sont le même geste pour le MJ, il n'a pas à
  // apprendre deux dispositions. Ni filtre ni puces ici : sur huit lignes
  // fixées par les règles, ils ne serviraient à rien.
  function buildModCaracs() {
    var bM = block("Modificateurs de caractéristiques");
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    bM.appendChild(wrap);

    var grp = el("div", "pc-optcomp-row grp");
    grp.appendChild(el("span"));
    var gV = el("span", "g", "Valeur");
    gV.title = "Ce que vaut la caractéristique, d'où se lisent son MOD et sa LIM";
    grp.appendChild(gV);
    grp.appendChild(el("span", "rule"));
    var gX = el("span", "g", "Coût en xp");
    gX.title = "Ce que la caractéristique coûte sur l'xp du personnage";
    grp.appendChild(gX);
    box.appendChild(grp);

    var head = el("div", "pc-optcomp-row head");
    [["Carac.", "Caractéristique"],
     ["Forcé", "Total forcé — vide = total calculé"],
     ["Modif.", "Deux modificateurs du total, qui s'additionnent", "duo"],
     ["Total", "Total effectif de la caractéristique"],
     null,
     ["Forcé", "Coût en xp forcé — vide = coût calculé"],
     ["Modif.", "Deux modificateurs du coût en xp, qui s'additionnent", "duo"],
     ["Coût", "Coût effectif en xp"]].forEach(function (h) {
      if (!h) { head.appendChild(el("span", "rule")); return; }
      var sp = el("span", h[2] || null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    box.appendChild(head);

    champs().forEach(function (c, i) {
      var row = el("div", "pc-optcomp-row pc-mods-host" + (i % 2 === 1 ? " odd" : ""));
      var nameBox = el("span", "pc-comp-name");
      var chip = el("span", "pc-abbr", c);
      chip.title = caracInfo(c).nom;
      nameBox.appendChild(chip);
      row.appendChild(nameBox);

      // Le repère du champ forcé est caracTotal() lui-même, et non la formule
      // refaite ici : un champ VIDE est justement le cas non forcé, celui où
      // caracTotal() rend déjà ce que la valeur, le plafond et les
      // modificateurs donnent. Le repère ne paraît d'ailleurs QUE là.
      // Recopier le calcul en dupliquerait une règle pour rien.
      row.appendChild(champForce(state.caracsForce, c,
        function () { return caracTotal(c); },
        "Total forcé — vide = total calculé (valeur, plafond, modificateurs)."));
      row.appendChild(champMod(state.caracsMod, c, 999,
        "Premier modificateur du total — vide = aucun."));
      row.appendChild(champMod(state.caracsMod2, c, 999,
        "Second modificateur du total — vide = aucun."));
      var tot = el("span", "pc-comp-total", "");
      row.appendChild(tot);

      row.appendChild(el("span", "rule"));
      row.appendChild(champForce(state.caracsXpForce, c,
        function () { return caracXpAuto(c); },
        "Coût en xp forcé — vide = coût calculé (barème des règles et modificateurs)."));
      row.appendChild(champMod(state.caracsXpMod, c, 9999,
        "Premier modificateur du coût en xp — vide = aucun."));
      row.appendChild(champMod(state.caracsXpMod2, c, 9999,
        "Second modificateur du coût en xp — vide = aucun."));
      var cout = el("span", "pc-comp-total", "");
      row.appendChild(cout);

      hooks.push(function () {
        var d = (state.caracsMod[c] || 0) + (state.caracsMod2[c] || 0);
        var f = state.caracsForce[c];
        tot.textContent = String(caracTotal(c));
        tot.classList.toggle("adj", d !== 0 || f !== undefined);
        // Ce que le MJ règle est une valeur de 0 à 20 ; ce que le joueur
        // LANCE, ce sont le MOD et la LIM de cette ligne-là. Les deux
        // s'affichent donc dans la même infobulle, sinon il faut aller les
        // chercher dans la table des règles pour savoir ce qu'on vient de
        // changer.
        tot.title = (f !== undefined
          ? "Total forcé à " + f
          : "valeur " + caracBase(c) + " · plafond " + caracPlafond(c) +
            (d ? " · modificateurs " + sign(d) : "")) +
          " — MOD " + sign(caracMod(c)) + ", LIM " + caracLim(c);

        var xf = state.caracsXpForce[c];
        var xm = (state.caracsXpMod[c] || 0) + (state.caracsXpMod2[c] || 0);
        var xp = caracXp(c);
        cout.textContent = xp + " xp";
        cout.classList.toggle("zero", !xp);
        cout.classList.toggle("adj", xf !== undefined || xm !== 0);
        cout.title = xf !== undefined
          ? "Coût forcé à " + xf + " xp (calculé : " + caracXpAuto(c) + " xp)"
          : "XP cumulé de la valeur " + caracBase(c) +
            (xm ? " · modificateurs " + sign(xm) + " xp" : "");

        row.classList.toggle("on", d !== 0 || xm !== 0 ||
                             f !== undefined || xf !== undefined);
      });
      box.appendChild(row);
    });
    return bM;
  }

  // ---- création : le prestige, et le plafond qu'il pose ----
  // Ce bloc réglait un budget de « points de création » : il n'y en a plus.
  // MIA ne distribue pas de points au départ, il RANGE le personnage : le
  // prestige dit son rang, et ce rang plafonne chacune de ses
  // caractéristiques. Ce sont donc ces deux choses-là que le MJ arbitre ici,
  // et rien d'autre — la valeur achetée, elle, appartient au joueur et se
  // règle sur la Fiche.
  // Mêmes colonnes que les deux autres grilles de l'onglet, à quatre au lieu
  // de dix : un demi-bloc suffit ici, il n'y a pas de coût en xp à régler.
  function buildCreation() {
    var bC = block("Création");
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    bC.appendChild(wrap);

    // Un seul entête pour toute la grille, en tête : les deux bandes qui
    // suivent nomment les rangées, pas les colonnes. D'où « Valeur » et non
    // « Plafond », qui aurait menti sur la rangée du prestige.
    var head = el("div", "pc-optcomp-row quatre head");
    [["Réglage", "Ce que la rangée règle"],
     ["Forcé", "Valeur forcée — vide = valeur calculée"],
     ["Modif.", "Modificateur du barème — vide = aucun"],
     ["Valeur", "Valeur effective"]].forEach(function (h) {
      var sp = el("span", null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    box.appendChild(head);

    // Les deux sections se titrent comme les champs du bloc des compétences
    // (« Compétences ———— ») : un titre de RANGÉES, à gauche, filet jusqu'au
    // bord. La bande centrée des autres grilles ne convenait pas ici : elle
    // titre des COLONNES, et se lisait comme un second entête posé sur les
    // chiffres.
    function bande(titre, aide) {
      var t = el("div", "pc-comp-champ", titre);
      t.title = aide;
      box.appendChild(t);
    }

    // LE PRESTIGE D'ABORD, le plafond ensuite : le second n'est que le premier
    // décalé, et la grille se lisait à l'envers quand la cause venait après
    // l'effet.
    bande("Prestige",
          "Le rang du personnage, qui plafonne chacune de ses caractéristiques "
          + "(0 à " + repli("prestigeMax") + " dans les règles)");
    var rowP = el("div", "pc-optcomp-row quatre");
    var nomP = el("span", "pc-comp-name");
    nomP.appendChild(el("span", "pc-comp-label", "Prestige"));
    rowP.appendChild(nomP);
    // Le prestige n'est pas une entrée de table mais une clé de l'état : son
    // forçage vaut null quand il est absent, là où une table n'a simplement
    // pas la clé. D'où la forme LIBRE des deux champs, et la traduction
    // null ↔ vide faite ici.
    rowP.appendChild(champForceVal(
      function () { return state.prestigeForce === null ? undefined : state.prestigeForce; },
      function (v) { state.prestigeForce = v === undefined ? null : v; },
      prestigeAuto,
      "Prestige forcé — vide = prestige calculé (acquis + modificateur)."));
    rowP.appendChild(champModVal(
      function () { return state.prestigeMod; },
      function (v) { state.prestigeMod = v; }, 999,
      "Modificateur du prestige — vide = aucun."));
    var totP = el("span", "pc-comp-total", "");
    rowP.appendChild(totP);
    hooks.push(function () {
      var m = state.prestigeMod || 0;
      var f = state.prestigeForce;
      totP.textContent = String(prestige());
      totP.classList.toggle("adj", m !== 0 || f !== null);
      totP.title = f !== null
        ? "Prestige forcé à " + f
        : "acquis " + (state.prestige || 0) + (m ? " · modificateur " + sign(m) : "");
      rowP.classList.toggle("on", m !== 0 || f !== null);
    });
    box.appendChild(rowP);

    bande("Plafond des caractéristiques",
          "Ce qu'une caractéristique ne peut pas dépasser : le prestige, "
          + "relevé ou abaissé caractéristique par caractéristique");
    // « le plafond de Agilité » : les noms viennent des règles, on n'en connaît
    // donc pas la liste d'avance et l'élision se décide ici, sur la lettre.
    function de(nom) {
      return (/^[aâàäeéèêëiîïoôöuùûü]/i.test(nom) ? "d'" : "de ") + nom;
    }
    champs().forEach(function (c, i) {
      var row = el("div", "pc-optcomp-row quatre" + (i % 2 === 1 ? " odd" : ""));
      var nameBox = el("span", "pc-comp-name");
      var chip = el("span", "pc-abbr", c);
      chip.title = caracInfo(c).nom;
      nameBox.appendChild(chip);
      row.appendChild(nameBox);

      row.appendChild(champForce(state.caracsPlafondForce, c,
        function () { return caracPlafondAuto(c); },
        "Plafond forcé — vide = plafond calculé (prestige + modificateur)."));
      row.appendChild(champModVal(
        function () { return state.caracsPlafondMod[c]; },
        function (v) { state.caracsPlafondMod[c] = v; }, 999,
        "Modificateur du plafond " + de(caracInfo(c).nom) + " — vide = aucun."));
      var tot = el("span", "pc-comp-total", "");
      row.appendChild(tot);

      hooks.push(function () {
        var m = state.caracsPlafondMod[c] || 0;
        var f = state.caracsPlafondForce[c];
        tot.textContent = String(caracPlafond(c));
        tot.classList.toggle("adj", m !== 0 || f !== undefined);
        tot.title = f !== undefined
          ? "Plafond forcé à " + f
          : "prestige " + prestige() + (m ? " · modificateur " + sign(m) : "");
        row.classList.toggle("on", m !== 0 || f !== undefined);
      });
      box.appendChild(row);
    });
    return bC;
  }

  // ---- modificateurs de compétences et de spécialités ----
  // Le pendant du bloc des caractéristiques, pour les HUIT compétences des
  // règles et pour les SPÉCIALITÉS. Les deux ne se règlent pas de la même
  // façon parce qu'elles ne sont pas de la même matière : les compétences sont
  // une liste fermée, rangée par sigle dans l'état, tandis que les spécialités
  // sont créées par le joueur, portent leurs leviers sur elles-mêmes, et vont
  // et viennent. D'où le rebâti (optCompsRebuild, rappelé par le module qui
  // les ajoute et les supprime) et optHooks, qui remplace hooks pour ces
  // lignes : sans lui, chaque rebâti fuirait des fonctions de rafraîchissement.
  function buildOptComps() {
    var bMC = block("Modificateurs de compétences", "et spécialités");
    // LE FILTRE NE PORTE QUE SUR LES SPÉCIALITÉS. Les huit compétences sont
    // toujours toutes là, et « investies » ne trie rien : on n'investit que
    // dans ses propres spécialités, et elles n'existent que parce qu'on les a
    // créées.
    var mcTools = el("div", "pc-comp-tools");
    var mcLine = el("div", "row");
    var mcSearch = champFiltre(function () { return speFilter; },
                               function (v) { speFilter = v; }, null,
                               function () { optCompsRebuild(); });
    if (mcSearch) mcLine.appendChild(mcSearch);
    mcTools.appendChild(mcLine);
    if (mcSearch) bMC.appendChild(mcTools);
    // la grille des leviers est large : elle défile dans son cadre
    var mcWrap = el("div", "pc-optcomp-wrap");
    var mcBox = el("div");
    mcWrap.appendChild(mcBox);
    bMC.appendChild(mcWrap);

    // Les deux champs de la grille, en version optHooks : ceux de
    // commun-champs.js écrivent dans « hooks », or ces lignes-ci sont détruites
    // et recréées à chaque rebâti. Chacun existe en forme LIBRE (lire/écrire),
    // parce qu'une spécialité n'est PAS une entrée de table : son forçage est
    // une propriété de l'objet, et il vaut null quand il est absent, là où une
    // table n'a tout simplement pas la clé. Les deux formes de table ne sont
    // donc qu'un habillage de la forme libre.
    //
    // Modificateur : un champ NU, sans − ni +. Sur une grille de dix colonnes,
    // les boutons mangeaient la place et n'apportaient rien qu'on ne fasse au
    // clavier.
    function optMod(lire, ecrire, borne, titre) {
      var inp = el("input", "pc-num modif");
      inp.type = "number"; inp.step = String(MOD_PAS);
      inp.title = titre;
      inp.addEventListener("input", function () {
        var v = parseFloat(inp.value);
        ecrire(isFinite(v) ? clamp(Math.round(v), -borne, borne) : 0);
        refresh();
      });
      optHooks.push(function () {
        if (document.activeElement !== inp) inp.value = lire() ? lire() : "";
      });
      return inp;
    }
    function optModTable(map, cle, borne, titre) {
      return optMod(function () { return map[cle]; },
                    function (v) { map[cle] = v; }, borne, titre);
    }
    // un champ de forçage : vide = valeur calculée, une valeur la remplace
    function optForce(lire, ecrire, auto, titre) {
      var inp = el("input", "force");
      inp.type = "number"; inp.step = "1";
      inp.title = titre;
      inp.addEventListener("input", function () {
        var v = parseFloat(inp.value);
        ecrire(isFinite(v) ? clamp(Math.round(v), -9999, 9999) : undefined);
        refresh();
      });
      optHooks.push(function () {
        inp.placeholder = String(auto());
        var cur = lire();
        if (document.activeElement !== inp) inp.value = cur === undefined ? "" : cur;
      });
      return inp;
    }
    function optForceTable(map, cle, auto, titre) {
      return optForce(function () { return map[cle]; },
                      function (v) { if (v === undefined) delete map[cle]; else map[cle] = v; },
                      auto, titre);
    }
    // le forçage d'une spécialité : même champ, mais null au lieu d'une clé
    // absente. « lire » prend la spécialité VIVANTE et non celle capturée au
    // montage, pour que la ligne écrive dans l'état même si la liste a bougé
    // sous elle entre deux rebâtis.
    function optForceSpe(vivante, cle, auto, titre) {
      return optForce(
        function () { var v = vivante()[cle]; return v === null ? undefined : v; },
        function (v) { vivante()[cle] = v === undefined ? null : v; },
        auto, titre);
    }
    function optModSpe(vivante, cle, borne, titre) {
      return optMod(function () { return vivante()[cle]; },
                    function (v) { vivante()[cle] = v; }, borne, titre);
    }

    // Deux rangées d'entête par section : les groupes (valeur | coût), puis les
    // colonnes. Libellés courts — dix colonnes dans une demi-largeur ne
    // laissent pas la place aux noms complets, que portent les infobulles. La
    // colonne « rule » est un vrai filet : une colonne de la grille, en place
    // sur CHAQUE rangée, qui court d'un bord à l'autre du module.
    function entetes(quoi, aideValeur, cols) {
      var grp = el("div", "pc-optcomp-row grp");
      grp.appendChild(el("span"));
      var gV = el("span", "g", "Valeur");
      gV.title = aideValeur;
      grp.appendChild(gV);
      grp.appendChild(el("span", "rule"));
      var gX = el("span", "g", "Coût en xp");
      gX.title = "Ce que " + quoi + " coûte sur l'xp du personnage";
      grp.appendChild(gX);
      mcBox.appendChild(grp);

      var head = el("div", "pc-optcomp-row head");
      cols.forEach(function (h) {
        if (!h) { head.appendChild(el("span", "rule")); return; }
        var s = el("span", h[2] || null, h[0]);
        s.title = h[1];
        head.appendChild(s);
      });
      mcBox.appendChild(head);
    }

    optCompsRebuild = function () {
      optHooks = [];
      mcBox.innerHTML = "";
      var flt = filtreDe(speFilter);
      var comps = allComps();
      var spes = allSpes();
      // le filtre ne mord que sur les spécialités : les huit compétences
      // restent, sans quoi on chercherait où sont passés ses leviers
      if (flt) spes = spes.filter(function (it) {
        return it.name.toLowerCase().indexOf(flt) >= 0;
      });
      // Aucun tri : l'ordre des compétences est celui de la page de règles, et
      // celui des spécialités celui où le joueur les a créées. Les deux listes
      // se retrouvent donc ici dans l'ordre où elles se lisent sur la Fiche.

      if (comps.length) {
        mcBox.appendChild(el("div", "pc-comp-champ", "Compétences"));
        entetes("la compétence", "Ce que valent les points de la compétence dans un jet",
          [["Compétence", "Nom de la compétence"],
           ["Forcé", "Total forcé — vide = total calculé"],
           ["Modif.", "Deux modificateurs du total, qui s'additionnent", "duo"],
           ["Total", "Points effectifs de la compétence"],
           null,
           ["Forcé", "Coût en xp forcé — vide = coût calculé"],
           ["Modif.", "Deux modificateurs du coût en xp, qui s'additionnent", "duo"],
           ["Coût", "Coût effectif en xp"]]);
        comps.forEach(function (it, i) {
          var row = el("div", "pc-optcomp-row pc-mods-host" + (i % 2 === 1 ? " odd" : ""));

          var nameBox = el("span", "pc-comp-name");
          var chip = el("span", "pc-abbr", it.code);
          chip.title = it.name;
          nameBox.appendChild(chip);
          var label = el("span", "pc-comp-label", it.name);
          label.title = it.name + " — lancée sur " + it.carac;
          nameBox.appendChild(label);
          row.appendChild(nameBox);

          // VALEUR : forcé, puis les deux modificateurs, puis le total
          // effectif. Le repère du champ forcé est compPts() lui-même : le
          // champ vide EST le cas non forcé, où compPts() rend déjà ce que les
          // points, le plafond et les modificateurs donnent.
          row.appendChild(optForceTable(state.compsForce, it.key,
            function () { return compPts(it.key); },
            "Total forcé — vide = total calculé (points, plafond, modificateurs)."));
          // DEUX champs : ils s'additionnent. Un seul obligeait à faire la
          // somme de tête avant de saisir, puis à la défaire pour retirer l'un
          // des deux apports.
          row.appendChild(optModTable(state.compsMod, it.key, 999,
            "Premier modificateur du total — vide = aucun."));
          row.appendChild(optModTable(state.compsMod2, it.key, 999,
            "Second modificateur du total — vide = aucun."));
          var tot = el("span", "pc-comp-total", "");
          row.appendChild(tot);

          // COÛT EN XP : même ordre, derrière le filet de séparation
          row.appendChild(el("span", "rule"));
          row.appendChild(optForceTable(state.compsXpForce, it.key,
            function () { return compXpAuto(it.key); },
            "Coût en xp forcé — vide = coût calculé (points achetés et modificateurs)."));
          row.appendChild(optModTable(state.compsXpMod, it.key, 9999,
            "Premier modificateur du coût en xp — vide = aucun."));
          row.appendChild(optModTable(state.compsXpMod2, it.key, 9999,
            "Second modificateur du coût en xp — vide = aucun."));
          var cout = el("span", "pc-comp-total", "");
          row.appendChild(cout);

          optHooks.push(function () {
            var pts = state.comps[it.key] || 0;
            var d = (state.compsMod[it.key] || 0) + (state.compsMod2[it.key] || 0);
            var f = state.compsForce[it.key];
            var v = compPts(it.key);
            tot.textContent = String(v);
            tot.classList.toggle("zero", !v);
            tot.classList.toggle("adj", d !== 0 || f !== undefined);
            // Le plafond paraît dans l'infobulle parce qu'il n'est écrit nulle
            // part ailleurs dans cette grille : c'est lui, et non le nombre
            // saisi, qui explique un total qui ne monte plus.
            tot.title = f !== undefined
              ? "Total forcé à " + f
              : "points " + pts + " · plafond " + compPlafond(it.key) +
                (d ? " · modificateurs " + sign(d) : "");

            var xf = state.compsXpForce[it.key];
            var xm = (state.compsXpMod[it.key] || 0) + (state.compsXpMod2[it.key] || 0);
            var xp = compXp(it.key);
            cout.textContent = xp + " xp";
            cout.classList.toggle("zero", !xp);
            cout.classList.toggle("adj", xf !== undefined || xm !== 0);
            cout.title = xf !== undefined
              ? "Coût forcé à " + xf + " xp (calculé : " + compXpAuto(it.key) + " xp)"
              : "points " + pts + " × " + repli("xpComp") + " xp" +
                (xm ? " · modificateurs " + sign(xm) + " xp" : "");

            // un liseré marque les lignes réglées : c'est le seul moyen de
            // retrouver d'un coup d'œil celles qu'on a touchées
            row.classList.toggle("on",
              d !== 0 || xm !== 0 || f !== undefined || xf !== undefined);
          });
          mcBox.appendChild(row);
        });
      }

      if (spes.length) {
        mcBox.appendChild(el("div", "pc-comp-champ", "Spécialités"));
        entetes("la spécialité", "Ce que valent les points de la spécialité dans un jet",
          [["Spécialité", "Nom de la spécialité"],
           ["Forcé", "Total forcé — vide = total calculé"],
           ["Modif.", "Deux modificateurs du total, qui s'additionnent", "duo"],
           ["Total", "Points effectifs de la spécialité"],
           null,
           ["Forcé", "Coût en xp forcé — vide = coût calculé"],
           // Une spécialité n'a PAS de modificateur de coût : l'état ne lui en
           // porte pas, et on n'en invente pas. Les deux colonnes restent
           // VIDES au lieu de disparaître, pour que ses chiffres tombent aux
           // mêmes abscisses que ceux des compétences, juste au-dessus.
           ["", "", "duo"],
           ["Coût", "Coût effectif en xp"]]);
        spes.forEach(function (it, i) {
          var row = el("div", "pc-optcomp-row pc-mods-host" + (i % 2 === 1 ? " odd" : ""));
          // la spécialité VIVANTE, relue à chaque geste : la ligne survit à un
          // rafraîchissement, l'objet capturé au montage pourrait ne plus être
          // celui de l'état (import, bibliothèque, suppression du voisin)
          var spe = function () { return state.specialites[it.index] || blankSpe(); };

          var nameBox = el("span", "pc-comp-name");
          var label = el("span", "pc-comp-label", it.name);
          label.title = it.name + " — " + (it.carac || "sans caractéristique") +
                        " · " + (it.comp || "sans compétence");
          nameBox.appendChild(label);
          row.appendChild(nameBox);

          row.appendChild(optForceSpe(spe, "force",
            function () { return spePts(spe()); },
            "Total forcé — vide = total calculé (points, plafond, modificateurs)."));
          row.appendChild(optModSpe(spe, "mod", 999,
            "Premier modificateur du total — vide = aucun."));
          row.appendChild(optModSpe(spe, "mod2", 999,
            "Second modificateur du total — vide = aucun."));
          var tot = el("span", "pc-comp-total", "");
          row.appendChild(tot);

          row.appendChild(el("span", "rule"));
          row.appendChild(optForceSpe(spe, "xpForce",
            function () { return speXp(spe()); },
            "Coût en xp forcé — vide = coût calculé (points achetés)."));
          row.appendChild(el("span"));
          row.appendChild(el("span"));
          var cout = el("span", "pc-comp-total", "");
          row.appendChild(cout);

          optHooks.push(function () {
            var s = spe();
            var d = (s.mod || 0) + (s.mod2 || 0);
            var v = spePts(s);
            tot.textContent = String(v);
            tot.classList.toggle("zero", !v);
            tot.classList.toggle("adj", d !== 0 || s.force !== null);
            tot.title = s.force !== null
              ? "Total forcé à " + s.force
              : "points " + (s.pts || 0) + " · plafond " + spePlafond(s) +
                (d ? " · modificateurs " + sign(d) : "");

            var xp = speXp(s);
            cout.textContent = xp + " xp";
            cout.classList.toggle("zero", !xp);
            cout.classList.toggle("adj", s.xpForce !== null);
            cout.title = s.xpForce !== null
              ? "Coût forcé à " + s.xpForce + " xp"
              : "points " + (s.pts || 0) + " × " + repli("xpSpe") + " xp";

            row.classList.toggle("on",
              d !== 0 || s.force !== null || s.xpForce !== null);
          });
          mcBox.appendChild(row);
        });
      }

      if (!comps.length && !spes.length) mcBox.appendChild(el("div", "pc-empty", "—"));
      refresh();   // les lignes viennent de naître : leurs totaux se peuplent ici
    };
    optCompsRebuild();
    return bMC;
  }

  // ---- outils de filtre ----
  // Une seule puce depuis que le filtre ne sert plus qu'aux spécialités : le
  // sélecteur de champ réglait une liste déroulante qui n'existe plus. Coupée,
  // la case de recherche DISPARAÎT et cesse d'agir — un filtre invisible qui
  // masque encore des lignes serait un piège. Réglage d'affichage, donc local
  // au navigateur ; il ne suit pas le personnage.
  function buildFiltres() {
    var bF = block("Outils de filtre");
    var fRow = el("div", "pc-comp-tools");
    var fLine = el("div", "row");
    var chip = el("span", "pc-chip");
    chip.textContent = "Champ de recherche";
    chip.title = "La case où l'on tape pour filtrer les spécialités. " +
                 "Éteinte : l'outil disparaît, et ne filtre plus rien.";
    chip.classList.toggle("on", filtreTexteOn());
    chip.addEventListener("click", function () {
      var on = filtreTexteOn();
      lset(FILTRES.texte, on ? "0" : "1");
      chip.classList.toggle("on", !on);
      remount();   // l'outil vit dans d'autres onglets : tout se rebâtit
    });
    fLine.appendChild(chip);
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
    // ---- onglet Équipement ----
    { id: "armes",      titre: "Armes",             onglet: "equipement", colonne: "gauche", build: buildArmes },
    { id: "armures",    titre: "Armures",           onglet: "equipement", colonne: "droite", build: buildArmures },
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
    { id: "modcaracs",  titre: "Modificateurs de caractéristiques", onglet: "options", colonne: "gauche", build: buildModCaracs },
    { id: "xpchamps",   titre: "XP par champ",      onglet: "options", colonne: "droite", build: buildXpChamps },
    // Création passe à DROITE, et ce n'est pas un choix de goût : mesuré sous
    // Firefox, les deux longues listes du bas démarraient à 139 px d'écart avec
    // ce bloc à gauche, contre 12 px une fois déplacé. Il tient d'ailleurs de
    // l'xp autant que « XP par champ », son voisin du dessus.
    { id: "creation",   titre: "Création",          onglet: "options", colonne: "droite", build: buildCreation },
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
    { id: "optcomps",   titre: "Modificateurs de compétences", onglet: "options", colonne: "droite", build: buildOptComps }
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
      compPts: compPts, compPlafond: compPlafond, compXp: compXp,
      spePts: spePts, spePlafond: spePlafond, speXp: speXp, jetBonus: jetBonus,
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
    optHooks = [];
    optCompsRebuild = null;
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
