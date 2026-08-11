/* Fiche de personnage Outward — page « Personnage » du site, et fiche de
 * l'extension Roll20 (la coquille signée sert docs/roll20-fiche.html, qui
 * charge ce bundle d'après docs/owd-manifeste.json).
 *
 * Mise en page « dossier », la même qu'en HxH et en JJK : barre d'outils avec
 * la bibliothèque (site seulement), feuille à largeur fixe, en-tête portrait +
 * identité + compteurs de budgets, onglets, colonnes, valeurs cliquables qui
 * lancent les jets dans le tchat Roll20.
 *
 * TROIS onglets, et pas un de plus :
 *   Fiche       les huit caractéristiques, les capacités dérivées (PV, PE, PM,
 *               PI, PR, PS, PH), l'exposition, l'effondrement, la rupture,
 *               TOUTES les compétences d'un coup, et les techniques ;
 *   Inventaire  armes et gestes, charge et contenance, vêtements, bourse, et
 *               l'inventaire illustré par groupes ;
 *   Options     les leviers du MJ (forçages et modificateurs), les réglages
 *               d'envoi, l'export/import, le plan des modules et les mods.
 *
 * Chaque bloc de la fiche est un MODULE : un id stable, un onglet, une colonne,
 * un build() qui RETOURNE son élément. C'est ce qui permet de le déplacer
 * (bloc Modules), de le couper, de le museler quand il jette, et à un mod de le
 * remplacer sans qu'on rouvre ce fichier.
 *
 * Chaque module éditable porte un rouage : la CONSTRUCTION du personnage est
 * verrouillée hors édition (rangs, achats, forçages, modificateurs, textes),
 * seuls les gestes de JEU restent actifs (jets, envois au tchat, jauges
 * courantes, quantités d'objets, bourse, contenance).
 *
 * LES RÈGLES NE S'AFFICHENT PAS. Pas de table de récupération, pas de table du
 * froid ni du chaud, pas de table des milieux, pas de barème de prix, pas de
 * table de l'effondrement. La fiche CALCULE avec elles ; les infobulles
 * décomposent le calcul, le DOM ne montre aucun barème. Seule exception : les
 * avertissements, qui disent l'ÉTAT du personnage (« PE MAX à zéro :
 * inconscient »), jamais une règle.
 *
 * Le contenu des règles (caractéristiques, rangs, capacités et leurs formules,
 * effondrement, climat, armes, types de dégâts) vient de owd-creation.json,
 * produit AU BUILD par hooks/owd_creation.py depuis docs/content/regles/. Rien
 * de ce qui est une valeur de règle ne s'écrit ici : les données viennent des
 * règles, jamais du code.
 *
 * Persistance : STORE (« owd-perso » l'état, « owd-cards » la carte calculée,
 * « owd-persos » la bibliothèque). Dans Roll20, owd-roll20-boot.js pose AVANT
 * ce script :
 *   - window.__owdLocalStorage : persistance -> Attributes Roll20 (via STORE) ;
 *   - window.__owdCompact : affichage condensé, pas de bibliothèque ;
 *   - window.__owdChat / __owdRoll / __owdSay / __owdTake / __owdPlayers :
 *     les SEULS canaux du pont. LE PAQUET EST SIGNÉ ET GELÉ : un message de
 *     plus coûterait une re-signature chez Mozilla, dont le quota est très
 *     serré. On compose donc les commandes ICI et on les passe telles quelles.
 */
(function () {
  "use strict";

  var COMPACT = typeof window !== "undefined" && window.__owdCompact === true;
  // Persistance : le localStorage du navigateur sur le site ; dans Roll20,
  // l'amorce pose window.__owdLocalStorage (shim -> Attributes Roll20) avant ce
  // script. Tous les appels sont sous try/catch : STORE peut être nul (stockage
  // refusé par le navigateur) sans casser la fiche.
  var STORE = (typeof window !== "undefined" && window.__owdLocalStorage) ||
              (function () { try { return window.localStorage; } catch (e) { return null; } })();
  var DATA = null;
  var state = null;

  // ---------- version ----------
  // RELEASE est ce qu'on montre, SCHEMA est ce qui compte, et les deux sont
  // INDÉPENDANTS : le schéma est un entier libre que rien ne déduit du majeur
  // de la release. Un mod qui ferait parseInt(Owd.version) pour en tirer le
  // schéma se tromperait à la première divergence.
  //
  // Le SCHÉMA ne monte QUE lorsqu'une donnée EXISTANTE change de forme ou de
  // sens. Ajouter une clé racine avec un défaut n'en est pas un : normalize()
  // la complète et ne purge aucune clé racine inconnue, donc une telle fiche
  // s'ouvre dans les deux sens sans migration.
  //
  // Le suffixe « b » marque la beta. Il ne change PAS le rang : « 1.0.0b » et
  // « 1.0.0 » sont de même version, la beta étant ce que le site public
  // recevra à la fusion. Les TROIS porteurs du numéro montent ensemble :
  // docs/owd-manifeste.json, RELEASE ici, RELEASE_DEFAUT de owd-attr-map.js.
  var RELEASE = "1.1.0b";
  var SCHEMA = 1;

  // Les modificateurs d'Outward se règlent de 1 en 1 : l'échelle des
  // caractéristiques est ouverte mais serrée (20 est la moyenne humaine), un
  // pas de 5 y serait un bond.
  var MOD_PAS = 1;

  // LES HUIT CARACTÉRISTIQUES. Les CLÉS sont SANS ACCENT : elles voyagent en
  // nom d'attribut Roll20 et en fragment de macro (@{Perso|owd_resistance}),
  // deux endroits où un accent ne passe pas. Les libellés accentués vivent
  // dans LIBELLES_CARAC, jamais dans l'état.
  //
  // Cette liste est le SOCLE de blank(), et le miroir exact de celle de
  // owd-attr-map.js : c'est à ce titre qu'elle est écrite ici, et non pour
  // doubler les règles. L'ORDRE D'AFFICHAGE et les libellés, eux, viennent de
  // DATA.caracs dès que le jeu de données est là (voir caracsOrdre) ; une
  // caractéristique ajoutée demain dans les règles arrive donc sans qu'on
  // rouvre ce fichier, normalize() lui posant sa valeur de départ.
  var CARACS = ["Force", "Dexterite", "Intelligence", "Ferveur",
                "Vigueur", "Endurance", "Resistance", "Chance"];
  var LIBELLES_CARAC = {
    Force: "Force", Dexterite: "Dextérité", Intelligence: "Intelligence",
    Ferveur: "Ferveur", Vigueur: "Vigueur", Endurance: "Endurance",
    Resistance: "Résistance", Chance: "Chance"
  };
  var ABBR = {
    Force: "FOR", Dexterite: "DEX", Intelligence: "INT", Ferveur: "FER",
    Vigueur: "VIG", Endurance: "END", Resistance: "RES", Chance: "CHA"
  };

  // Trois emplacements de modificateur, fantômes au repos, révélés par le
  // survol de leur hôte : le geste de la fiche HxH. Un seul champ obligeait à
  // sommer de tête avant d'écrire, et à défaire le calcul pour retirer l'un
  // des trois.
  var MMOD_SLOTS = ["équipement", "technique", "autre"];

  // LE DÉ DES JETS. Tous les dés d'Outward sont des d8 : le champ reste
  // modifiable parce que c'est un réglage de table, pas une règle que la fiche
  // imposerait.
  var DE_DEFAUT = "1d8";

  // Le bloc des réglages de disposition, nommé une fois pour toutes : trois
  // endroits doivent l'épargner (activeModule, monteModules, blocEnPanne), et
  // un id recopié à la main finirait par manquer à l'un d'eux.
  var MODULE_REGLAGES = "modules";

  // ---------- outils ----------
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  // URL du jeu de données. Une ARCHIVE de version embarque son propre
  // owd-creation.json, gelé à sa date : l'amorce le désigne par
  // window.__owdDataUrl avant d'injecter le bundle. Sans lui, un bundle
  // d'archive lirait les règles d'AUJOURD'HUI, et un rang renommé suffirait à
  // trahir la version qu'on croit rejouer.
  function dataUrl() {
    var u = typeof window !== "undefined" ? window.__owdDataUrl : null;
    return u || (siteBase() + "owd-creation.json");
  }
  function siteBase() {
    var l = document.querySelector('link[href*="assets/"], script[src*="assets/"]');
    var u = l ? (l.href || l.getAttribute("src")) : null;
    if (u) { var i = u.indexOf("assets/"); if (i >= 0) return u.slice(0, i); }
    return new URL(".", location.href).href;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(v, d) { var n = parseInt(v, 10); return isNaN(n) ? d : n; }
  // poids, quantités, prix : décimal positif, virgule tolérée, arrondi au centième
  function pnum(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
  }
  // nombre SIGNÉ (l'exposition va de −120 à +120) : même tolérance, sans plancher
  function snum(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }
  // affichage : point décimal, sans zéros de traîne (« 0.5 », « 3 »)
  function fmtP(n) { return String(Math.round(n * 100) / 100); }
  // modificateurs divers : TOUJOURS un tableau de 3 emplacements, sommés dans
  // la valeur effective. modArr assainit ce qui entre, modSum totalise.
  function modArr(a) {
    if (!Array.isArray(a)) a = [];
    var out = [0, 0, 0];
    for (var i = 0; i < 3; i++) {
      var n = parseFloat(a[i]);
      out[i] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -9999, 9999) : 0;
    }
    return out;
  }
  function modSum(a) {
    var t = 0;
    (a || []).forEach(function (n) { if (isFinite(n)) t += n; });
    return Math.round(t * 100) / 100;
  }
  // Le signe s'écrit avec le VRAI moins typographique en négatif (« −3 ») et le
  // plus ordinaire en positif : c'est la convention du livre, et elle vaut
  // aussi pour l'écran.
  function sign(n) { return n >= 0 ? "+" + n : String(n).replace("-", "−"); }
  function capFirst(t) { t = String(t == null ? "" : t); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
  // Identifiant STABLE d'une entrée (compétence, technique, arme, geste,
  // vêtement, objet). Il naît une fois et ne se réécrit jamais : c'est lui qui
  // relie une arme à sa compétence et un objet donné à son jumeau chez l'autre
  // joueur. Le compteur écarte les collisions du même millième de seconde.
  var idSeq = 0;
  function uid(prefixe) {
    idSeq++;
    return (prefixe || "x") + Date.now().toString(36) + idSeq.toString(36);
  }
  // Comparaison de noms insensible à la casse ET aux accents : « Épée » et
  // « epee » sont le même nom pour un refus de doublon.
  function pli(s) {
    s = String(s == null ? "" : s).trim().toLowerCase();
    try { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }
    catch (e) { return s; }   // vieux moteur : la casse suffit
  }
  // Appartenance RÉELLE à une table nommée par une chaîne venue d'ailleurs
  // (mod, état importé). Sans elle, un nom comme « toString » répond « oui »
  // depuis Object.prototype, et la suite manipule une méthode en croyant tenir
  // une donnée : c'est la façon la plus bête de casser un montage.
  function aClef(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }

  // ---------- le jeu de données ----------
  // Tout ce qui suit LIT owd-creation.json et n'invente rien. Une clé absente
  // rend une valeur neutre (liste vide, null) : le bloc qui s'en sert affiche
  // alors un vide honnête plutôt qu'un chiffre inventé qui passerait pour une
  // règle du livre.
  function D() { return DATA || {}; }
  function caracsData() { return Array.isArray(D().caracs) ? D().caracs : []; }
  // L'ordre d'affichage des caractéristiques : celui des règles quand elles
  // sont là (les quatre maîtrises, puis les quatre réserves), la liste socle
  // sinon. Une caractéristique de l'état qui n'est plus dans les règles reste
  // affichée en queue : on ne masque pas une donnée du personnage.
  function caracsOrdre() {
    var out = [], vus = {};
    caracsData().forEach(function (c) {
      var k = c && c.cle;
      if (k && !vus[k]) { vus[k] = 1; out.push(k); }
    });
    CARACS.concat(state ? Object.keys(state.caracs || {}) : []).forEach(function (k) {
      if (!vus[k]) { vus[k] = 1; out.push(k); }
    });
    return out;
  }
  function libCarac(c) {
    var d = null;
    caracsData().forEach(function (x) { if (x && x.cle === c) d = x; });
    return (d && d.libelle) || LIBELLES_CARAC[c] || c;
  }
  function abbrCarac(c) {
    var d = null;
    caracsData().forEach(function (x) { if (x && x.cle === c) d = x; });
    return (d && d.abbr) || ABBR[c] || String(c).slice(0, 3).toUpperCase();
  }
  // Les rangs de compétence, du 0 (non initié) au Rang Max. Dés, bonus, prix et
  // point de rupture viennent tous d'ici : AUCUN barème n'est écrit dans ce
  // fichier, et aucune table n'est affichée — ce sont les infobulles des crans
  // qui portent la décomposition.
  function rangs() { return Array.isArray(D().rangs) ? D().rangs : []; }
  function rangMax() { return Math.max(0, rangs().length - 1); }
  function rangInfo(i) {
    var r = rangs();
    if (!r.length) return { rang: 0, nom: "", des: 0, bonus: 0, xp: 0, rupture: 0, initiale: "?" };
    return r[clamp(num(i, 0), 0, r.length - 1)];
  }
  function rangInitiale(r) {
    if (r && r.initiale) return String(r.initiale).charAt(0).toUpperCase();
    return String((r && r.nom) || "?").charAt(0).toUpperCase();
  }
  // L'infobulle d'un cran : le rang COMPLET, tel que les règles le donnent.
  // C'est le seul endroit où le barème paraît, et il ne paraît qu'au survol.
  function rangTitre(r) {
    if (!r) return "";
    var t = (r.nom || "Rang " + r.rang) + " — Rang " + r.rang +
            " · " + r.des + (r.des > 1 ? " dés" : " dé") +
            " · " + sign(r.bonus || 0);
    if (r.xp) t += " · " + r.xp + " XP";
    if (r.rupture) t += " · " + r.rupture + " point de rupture";
    return t;
  }
  function faces() { var n = num((D().des || {}).faces, 8); return n > 1 ? n : 8; }
  function deDe(n) { return String(n) + "d" + faces(); }
  // Dés d'action reçus par tour, et ce qu'une technique peut en engager.
  function desActionBase() { return num((D().des || {}).actionParTour, 0); }
  function desTechnique() { return num((D().des || {}).techniqueMax, desActionBase()); }
  function rupturePoints() { return num((D().rupture || {}).points, 0); }
  // La définition d'une capacité dérivée : base, caractéristique, facteur ou
  // diviseur, et la formule VERBATIM du livre (que la fiche n'affiche pas,
  // mais dont elle se sert pour décomposer une infobulle).
  function capacites() { return Array.isArray(D().capacites) ? D().capacites : []; }
  function capDef(cle) {
    var out = null;
    capacites().forEach(function (c) { if (c && c.cle === cle) out = c; });
    return out;
  }
  function libCap(cle, repli) {
    var d = capDef(cle);
    return (d && d.libelle) || repli || cle;
  }
  function abbrCap(cle, repli) {
    var d = capDef(cle);
    return (d && d.abbr) || repli || String(cle).toUpperCase();
  }
  function effDef() { return D().effondrement || {}; }
  function climatDef() { return D().climat || {}; }
  function monnaie(pluriel) {
    var m = D().monnaie || {};
    return (pluriel ? m.pluriel : m.nom) || (pluriel ? "pièces d'argent" : "pièce d'argent");
  }
  function typesDegats() { return Array.isArray(D().typesDegats) ? D().typesDegats : []; }
  function armesData() { return Array.isArray(D().armes) ? D().armes : []; }

  // ---------- état ----------
  // L'état VIERGE, et la SEULE table qui fasse autorité sur les clés racine.
  // Trois règles tiennent ce bloc, et chacune a déjà coûté quelque chose :
  //   - toute clé ajoutée ici doit arriver dans SCALARS ou COLLECTIONS de
  //     owd-attr-map.js, sinon le chemin de repli (une fiche relue sans
  //     owd_state) la perd EN SILENCE ;
  //   - ajouter une clé racine avec un défaut ne fait PAS monter le SCHEMA :
  //     normalize() complète une clé absente et ne purge aucune clé racine
  //     inconnue, donc une telle fiche s'ouvre dans les deux sens sans migration ;
  //   - les cartes ÉPARSES ({} au départ) ne se matérialisent que le jour où le
  //     joueur y range quelque chose : une carte pleine de zéros voyagerait
  //     jusque dans les Attributes Roll20 sans rien dire de plus qu'un vide.
  function blank() {
    return {
      // v porte le SCHÉMA, rel la release lisible. Les deux voyagent : une
      // fiche relue sans eux repartirait en schéma 1, c'est-à-dire qu'elle se
      // ferait re-migrer indéfiniment.
      v: SCHEMA, rel: RELEASE,

      // ---- identité ----
      name: "", portrait: "", espece: "", age: "", sexe: "", genre: "",
      background: "", notes: "",

      // ---- expérience ----
      // Les règles ne donnent AUCUNE dotation de départ : le total part à zéro
      // et se saisit dans l'en-tête. Le dépensé, lui, se CALCULE (rangs des
      // compétences + coût saisi des techniques) et ne se range jamais ici :
      // deux endroits pour dire la même chose finiraient par se contredire.
      xpTotal: 0,

      // ---- caractéristiques ----
      // Les CLÉS sont SANS ACCENT : elles voyagent en nom d'attribut Roll20 et
      // en fragment de macro (@{Perso|owd_resistance}). Les libellés accentués
      // vivent dans LIBELLES_CARAC, jamais dans l'état.
      // 20 est la moyenne humaine ; l'échelle n'a pas de plafond et la fiche
      // n'en invente pas — aucune borne haute n'est écrite ici.
      caracs: { Force: 20, Dexterite: 20, Intelligence: 20, Ferveur: 20,
                Vigueur: 20, Endurance: 20, Resistance: 20, Chance: 20 },
      // DEUX modificateurs qui s'additionnent (équipement / décision du MJ) :
      // un seul champ obligeait à sommer de tête avant d'écrire.
      caracsMod: { Force: 0, Dexterite: 0, Intelligence: 0, Ferveur: 0,
                   Vigueur: 0, Endurance: 0, Resistance: 0, Chance: 0 },
      caracsMod2: { Force: 0, Dexterite: 0, Intelligence: 0, Ferveur: 0,
                    Vigueur: 0, Endurance: 0, Resistance: 0, Chance: 0 },
      // ÉPARSE, et NULLABLE par l'absence : une clé présente REMPLACE la somme,
      // elle ne s'y ajoute pas. Absente n'est pas 0 — confondre les deux
      // clouerait une caractéristique à zéro sur le chemin de repli.
      caracsForce: {},

      // ---- ce que le personnage porte à l'instant ----
      // null = « au maximum » : la valeur SUIT le maximum quand il bouge, ce
      // qu'un nombre figé ne ferait pas — et le maximum de PV et de PE bouge
      // tout seul, à chaque niveau d'effondrement.
      // expo et contenance partent de 0, qui est une VRAIE valeur (exposition
      // nulle, ventre vide) et non un repli : elles ne sont donc pas nullables.
      // Un courant supérieur à son maximum est signalé mais JAMAIS réécrit :
      // l'écraser perdrait la valeur le jour où le maximum remonte.
      etat: { pv: null, pe: null, pm: null, pi: null,
              pr: null, ps: null, ph: null,
              expo: 0, contenance: 0, rupture: null },

      // Maximums FORCÉS, épars : une clé présente remplace le calcul, une clé
      // absente laisse calculer. Une SEULE carte pour les treize capacités
      // plutôt que treize champs : une capacité de plus n'ajoute alors ni clé
      // racine, ni attribut Roll20, ni ligne de carte d'attributs.
      // Clés connues : pv pe pm pi pr ps ph charge acces contenance expo
      // rupture desAction effondrement.
      maxForce: {},

      // Modificateurs à TROIS emplacements (MMOD_SLOTS = équipement / technique
      // / autre), le geste de la fiche HxH : fantômes au repos, révélés par le
      // survol de leur hôte, sommés dans la valeur effective.
      divers: {
        pv: [0, 0, 0], pe: [0, 0, 0], pm: [0, 0, 0], pi: [0, 0, 0],
        pr: [0, 0, 0], ps: [0, 0, 0], ph: [0, 0, 0],
        charge: [0, 0, 0], acces: [0, 0, 0], contenance: [0, 0, 0],
        expo: [0, 0, 0], rupture: [0, 0, 0], desAction: [0, 0, 0],
        // Le seul modificateur qui joue sur un NIVEAU et non sur des points :
        // le MJ y pose l'effondrement que les quatre réserves ne savent pas dire.
        effondrement: [0, 0, 0]
      },

      // ---- compétences ----
      // LES RÈGLES NE DONNENT AUCUNE LISTE DE COMPÉTENCES : le joueur les nomme
      // toutes. D'où un TABLEAU d'entrées à `id` STABLE, et non une carte
      // indexée par le nom — renommer une compétence perdrait sinon son rang et
      // ses modificateurs du même geste, sans un mot.
      // Une entrée : { id, nom, groupe, rang }.
      //   id     « c » + horodatage en base 36, posé à la création, jamais réécrit
      //   groupe texte LIBRE qui titre les rangées ; vide = « Sans groupe ».
      //          Ce n'est pas une règle : c'est le rangement du joueur.
      //   rang   entier 0 à 5 (non initié, initié, apprenti, maître, expert,
      //          Rang Max). Les dés, le bonus et le prix viennent de
      //          owd-creation.json, jamais d'une table écrite ici.
      // L'ordre du tableau EST l'ordre d'affichage dans son groupe.
      comps: [],
      // Cartes ÉPARSES indexées par l'ID de la compétence, jamais par son nom.
      compsMod: {}, compsMod2: {},
      compsForce: {},        // bonus TOTAL forcé : remplace rang + modificateurs
      compsDesForce: {},     // nombre de dés engageables forcé : remplace le rang

      // ---- techniques ----
      // Les rangs d'une technique LUI APPARTIENNENT : les règles le disent, la
      // fiche ne les barème donc pas et se contente de les compter.
      // Une entrée : { id, nom, rang, rangs, xp, rupture, desc }.
      //   rangs   combien de rangs cette technique-là possède
      //   xp      ce que le joueur a payé pour elle, saisi (aucune règle ne le fixe)
      //   rupture combien de points de rupture elle a demandés
      techniques: [],

      // ---- équipement ----
      // Une arme est un RÉPERTOIRE, pas une attaque : sa ligne (prise, parade,
      // réduction, compétence qui porte le jet) et ses gestes.
      // Une entrée : { id, nom, prise, parade, reduction, comp, note,
      //   gestes: [{ id, nom, seuil, portee, degats, type, degatsDemi, typeDemi }] }.
      // `comp` est l'ID d'une entrée de `comps` — jamais son nom, qui se renomme.
      armes: [],
      // Ce que le personnage porte contre le froid et le chaud, compté en
      // degrés, et ce qu'il pèse. Une entrée :
      // { id, nom, froid, chaud, poids, porte, note }.
      vetements: [],
      argent: 0,             // pièces d'argent : la monnaie du livre, nommée

      // Inventaire illustré. `groupes` est un tableau de CHAÎNES et `comptes`
      // un tableau PARALLÈLE de booléens : décocher pose le groupe au sol — son
      // poids sort de la charge, ses objets restent entiers, consultables,
      // déplaçables et donnables. Supprimer un groupe splice les DEUX.
      // Un objet : { id, nom, img, qte, poids, places, achat, vente, desc,
      //              grp, rapide }.
      //   places  la contenance qu'occupe ce qu'on avale (règle du livre)
      //   rapide  l'objet tient dans un accès rapide : il compte alors contre
      //           Dextérité ÷ 4, et pas seulement contre la charge
      //   id      c'est LUI qui reconnaît le même objet d'une fiche à l'autre
      inv: {
        groupes: ["Sur soi"], comptes: [true], objets: [],
        opts: { cols: 4, nom: true, qte: true, poids: false, total: true, vign: true }
      },

      // ---- le dé des jets ----
      // Tous les dés du jeu sont des d8. Le champ reste modifiable : c'est un
      // réglage de table, pas une règle que la fiche imposerait.
      de: DE_DEFAUT,

      // ---- le dispositif de modules et de mods : QUATRE clés racine ----
      // modules   le RANGEMENT SEUL : { ordre: [ids], place: { id: {onglet, colonne} } },
      //           épars, et VIDE tant que le joueur n'a rien rangé. Aucune clé
      //           « off » n'y existe ni n'y existera.
      // modData   les coffres privés des modules et des mods, contenu NON interprété.
      // modActifs le SEUL interrupteur : { id: false } pour les seuls modules COUPÉS.
      // mods      les mods du personnage, [{ id, nom, actif, pour, apiMin, src }].
      // Une clé racine du bundle absente de la carte d'attributs serait une
      // perte sèche au repli : les quatre sont aussi dans blank() d'owd-attr-map.js.
      modules: {}, modData: {}, modActifs: {}, mods: []
    };
  }

  // Migration de schéma, AVANT toute normalisation : normalize() complète et
  // nettoie selon la forme d'AUJOURD'HUI, il faut donc d'abord amener l'état
  // jusqu'ici. Le moteur est facultatif de naissance (le repli gelé de
  // roll20-fiche.html ne le nomme pas) : d'où le garde, qui restera pour
  // toujours. Une fiche VENUE DU FUTUR (v > SCHEMA) n'est pas rabaissée en
  // douce : on la laisse telle quelle et l'amorce s'en occupe (écran de
  // version). Écrire dessus avec un code qui ne la comprend pas serait le seul
  // vrai moyen de la perdre.
  function migre(s) {
    if (!s || typeof s !== "object") return s;
    var de = parseInt(s.v, 10);
    if (!isFinite(de)) de = 1;
    if (de === SCHEMA) return s;
    if (de > SCHEMA) return s;
    if (!window.OwdMigr || !window.OwdMigr.appliquer) return s;
    var r = window.OwdMigr.appliquer(s, de, SCHEMA);
    if (!r || !r.ok) return s;                    // échec : l'état d'origine, intact
    r.state.v = SCHEMA;
    r.state.rel = RELEASE;
    return r.state;
  }

  // Toute donnée entrante (localStorage, import JSON, Attributes Roll20) passe
  // par ici : champ manquant -> défaut, types sûrs, entrées sans id pourvues.
  // La validation est PROFONDE ; elle ne PURGE AUCUNE clé racine inconnue,
  // c'est ce qui permet à un mod et à une version future de faire voyager
  // leurs données sans que la fiche les efface au passage.
  function normalize(s) {
    var b = blank();
    if (!s || typeof s !== "object") return b;
    s = migre(s);
    Object.keys(b).forEach(function (k) { if (s[k] === undefined) s[k] = b[k]; });
    // La release suit toujours le code qui vient d'écrire : c'est lui qui fait
    // foi. Sur la beta cela tamponne le suffixe sur un personnage seulement
    // ouvert puis réenregistré ; sans danger tant que le suffixe ne change pas
    // le rang.
    if (parseInt(s.v, 10) === SCHEMA) s.rel = RELEASE;

    // ---- identité et textes ----
    ["name", "portrait", "espece", "age", "sexe", "genre", "background", "notes", "de"]
      .forEach(function (k) { s[k] = s[k] == null ? "" : String(s[k]); });
    if (!s.de) s.de = DE_DEFAUT;
    s.xpTotal = Math.max(0, num(s.xpTotal, 0));
    s.argent = pnum(s.argent);

    // ---- caractéristiques ----
    // Les huit du socle, plus toute caractéristique que les règles déclarent
    // aujourd'hui : une caractéristique ajoutée demain arrive à sa valeur
    // moyenne sans migration ni montée de schéma.
    if (!s.caracs || typeof s.caracs !== "object" || Array.isArray(s.caracs)) s.caracs = b.caracs;
    ["caracsMod", "caracsMod2"].forEach(function (k) {
      if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k])) s[k] = {};
    });
    if (!s.caracsForce || typeof s.caracsForce !== "object" || Array.isArray(s.caracsForce)) s.caracsForce = {};
    var moyenne = num(D().moyenneHumaine, 20);
    var listeCaracs = CARACS.slice();
    caracsData().forEach(function (c) {
      if (c && c.cle && listeCaracs.indexOf(c.cle) < 0) listeCaracs.push(c.cle);
    });
    Object.keys(s.caracs).forEach(function (k) { if (listeCaracs.indexOf(k) < 0) listeCaracs.push(k); });
    listeCaracs.forEach(function (c) {
      s.caracs[c] = clamp(num(s.caracs[c], moyenne), -9999, 9999);
      s.caracsMod[c] = modNombre(s.caracsMod[c]);
      s.caracsMod2[c] = modNombre(s.caracsMod2[c]);
    });
    // forçages : ABSENTS par défaut, une valeur les pose. Le vide EFFACE la clé
    // (absent = calculé) ; y ranger 0 clouerait la caractéristique à zéro.
    s.caracsForce = carteForcages(s.caracsForce);

    // ---- valeurs courantes ----
    if (!s.etat || typeof s.etat !== "object" || Array.isArray(s.etat)) s.etat = b.etat;
    ["pv", "pe", "pm", "pi", "pr", "ps", "ph", "rupture"].forEach(function (k) {
      var v = s.etat[k];
      if (v === null || v === undefined || v === "") { s.etat[k] = null; return; }
      var n = parseFloat(v);
      s.etat[k] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -99999, 99999) : null;
    });
    // expo et contenance ne sont PAS nullables : 0 y est une vraie valeur
    s.etat.expo = clamp(snum(s.etat.expo), -99999, 99999);
    s.etat.contenance = clamp(pnum(s.etat.contenance), 0, 99999);

    // ---- maximums forcés et modificateurs ----
    s.maxForce = carteForcages(s.maxForce);
    if (!s.divers || typeof s.divers !== "object" || Array.isArray(s.divers)) s.divers = b.divers;
    Object.keys(b.divers).forEach(function (k) { s.divers[k] = modArr(s.divers[k]); });
    // une capacité ajoutée par les règles reçoit son emplacement de
    // modificateurs sans qu'on rouvre ce fichier
    capacites().forEach(function (c) {
      if (c && c.cle && !Array.isArray(s.divers[c.cle])) s.divers[c.cle] = [0, 0, 0];
      else if (c && c.cle) s.divers[c.cle] = modArr(s.divers[c.cle]);
    });

    // ---- compétences ----
    if (!Array.isArray(s.comps)) s.comps = [];
    var vusComps = {};
    s.comps = s.comps.filter(function (c) { return c && typeof c === "object"; }).map(function (c) {
      var id = String(c.id == null ? "" : c.id);
      if (!id || vusComps[id]) id = uid("c");   // deux entrées de même id se confondraient
      vusComps[id] = 1;
      return {
        id: id,
        nom: capFirst(String(c.nom == null ? "" : c.nom).trim()),
        groupe: String(c.groupe == null ? "" : c.groupe).trim(),
        rang: clamp(num(c.rang, 0), 0, rangs().length ? rangMax() : 5)
      };
    });
    ["compsMod", "compsMod2"].forEach(function (k) {
      s[k] = carteNombres(s[k]);
    });
    s.compsForce = carteForcages(s.compsForce);
    s.compsDesForce = carteForcages(s.compsDesForce);
    // Les cartes éparses ne parlent que de compétences qui existent : une clé
    // orpheline (compétence supprimée par une version qui l'ignorait)
    // ressusciterait son modificateur sur la prochaine compétence à recevoir
    // le même id, ce qui n'arrive jamais — mais elle voyagerait pour rien.
    ["compsMod", "compsMod2", "compsForce", "compsDesForce"].forEach(function (k) {
      Object.keys(s[k]).forEach(function (id) { if (!vusComps[id]) delete s[k][id]; });
    });

    // ---- techniques ----
    if (!Array.isArray(s.techniques)) s.techniques = [];
    s.techniques = s.techniques.filter(function (t) { return t && typeof t === "object"; })
      .map(function (t) {
        var nb = clamp(num(t.rangs, 1), 1, 20);
        return {
          id: String(t.id || "") || uid("t"),
          nom: String(t.nom == null ? "" : t.nom),
          rangs: nb,
          rang: clamp(num(t.rang, 0), 0, nb),
          xp: Math.max(0, num(t.xp, 0)),
          rupture: clamp(num(t.rupture, 0), 0, 99),
          desc: String(t.desc == null ? "" : t.desc)
        };
      });

    // ---- armes et leurs gestes ----
    if (!Array.isArray(s.armes)) s.armes = [];
    s.armes = s.armes.filter(function (a) { return a && typeof a === "object"; }).map(function (a) {
      var gestes = Array.isArray(a.gestes) ? a.gestes : [];
      return {
        id: String(a.id || "") || uid("a"),
        nom: String(a.nom == null ? "" : a.nom),
        prise: String(a.prise == null ? "" : a.prise),
        parade: String(a.parade == null ? "" : a.parade),
        reduction: String(a.reduction == null ? "" : a.reduction),
        // l'ID d'une compétence, jamais son nom : le nom se renomme
        comp: String(a.comp == null ? "" : a.comp),
        note: String(a.note == null ? "" : a.note),
        gestes: gestes.filter(function (g) { return g && typeof g === "object"; }).map(function (g) {
          return {
            id: String(g.id || "") || uid("g"),
            nom: String(g.nom == null ? "" : g.nom),
            seuil: String(g.seuil == null ? "" : g.seuil),
            portee: String(g.portee == null ? "" : g.portee),
            degats: String(g.degats == null ? "" : g.degats),
            type: String(g.type == null ? "" : g.type),
            degatsDemi: String(g.degatsDemi == null ? "" : g.degatsDemi),
            typeDemi: String(g.typeDemi == null ? "" : g.typeDemi)
          };
        })
      };
    });
    // une arme qui pointe sur une compétence disparue perd son lien plutôt que
    // de lancer un jet au nom de rien
    s.armes.forEach(function (a) { if (a.comp && !vusComps[a.comp]) a.comp = ""; });

    // ---- vêtements ----
    if (!Array.isArray(s.vetements)) s.vetements = [];
    s.vetements = s.vetements.filter(function (v) { return v && typeof v === "object"; }).map(function (v) {
      return {
        id: String(v.id || "") || uid("v"),
        nom: String(v.nom == null ? "" : v.nom),
        froid: snum(v.froid), chaud: snum(v.chaud), poids: pnum(v.poids),
        porte: v.porte !== false,
        note: String(v.note == null ? "" : v.note)
      };
    });

    // ---- inventaire illustré ----
    if (!s.inv || typeof s.inv !== "object" || Array.isArray(s.inv)) s.inv = b.inv;
    if (!s.inv.opts || typeof s.inv.opts !== "object" || Array.isArray(s.inv.opts)) s.inv.opts = b.inv.opts;
    s.inv.opts.cols = clamp(num(s.inv.opts.cols, b.inv.opts.cols), 1, 8);
    // chaque réglage garde SON défaut quand il manque (un opts partiel ne doit
    // pas allumer un affichage éteint par défaut)
    ["nom", "qte", "poids", "total", "vign"].forEach(function (k) {
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
    // sinon du poids disparaîtrait en silence) ; PLUS de drapeaux que de
    // groupes veut dire qu'une version qui ignore « comptes » a supprimé un
    // groupe sans retirer le sien, et plus personne ne peut dire lequel : on
    // rend tout au poids porté. Perdre un décochage se voit et se refait ;
    // perdre du poids en silence fausse la fiche sans prévenir.
    if (!Array.isArray(s.inv.comptes) || s.inv.comptes.length > s.inv.groupes.length) s.inv.comptes = [];
    s.inv.comptes = s.inv.groupes.map(function (_, gi) { return s.inv.comptes[gi] !== false; });
    if (!Array.isArray(s.inv.objets)) s.inv.objets = [];
    s.inv.objets = s.inv.objets.filter(function (o) { return o && typeof o === "object"; }).map(function (o) {
      return {
        id: String(o.id == null ? "" : o.id),   // LIBRE et facultatif : c'est le joueur qui le pose
        nom: o.nom == null ? "" : String(o.nom),
        img: o.img == null ? "" : String(o.img),
        qte: pnum(o.qte === undefined ? 1 : o.qte),
        poids: pnum(o.poids),
        places: pnum(o.places),
        achat: pnum(o.achat), vente: pnum(o.vente),
        desc: o.desc == null ? "" : String(o.desc),
        grp: clamp(num(o.grp, 0), 0, s.inv.groupes.length - 1),
        rapide: !!o.rapide
      };
    });

    // ---- coffres, interrupteurs, disposition, mods ----
    if (!s.modData || typeof s.modData !== "object" || Array.isArray(s.modData)) s.modData = {};
    Object.keys(s.modData).forEach(function (k) {
      var d = s.modData[k];
      if (!d || typeof d !== "object") delete s.modData[k];
    });
    // interrupteurs : seuls les modules COUPÉS y figurent (false). Tout le
    // reste s'efface, pour qu'un module retiré un jour ne laisse pas de trace.
    if (!s.modActifs || typeof s.modActifs !== "object" || Array.isArray(s.modActifs)) s.modActifs = {};
    Object.keys(s.modActifs).forEach(function (k) { if (s.modActifs[k] !== false) delete s.modActifs[k]; });
    // Disposition ÉPARSE : on valide ce qui est là sans rien matérialiser.
    // Écrire un « ordre » vide chez tout le monde ferait voyager une liste
    // inutile jusque dans les Attributes Roll20, et un module ajouté demain
    // n'apparaîtrait pas chez un personnage rangé avant lui.
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
      var src = s.modules.place, place = {};
      if (src && typeof src === "object" && !Array.isArray(src)) {
        Object.keys(src).forEach(function (id) {
          var p = src[id];
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
    // Mods du personnage. Le moteur (owd-mods.js) fait foi quand il est là :
    // c'est lui qui connaît la forme d'un mod. Sans lui, la fiche s'en tient au
    // strict nécessaire, mais elle ne s'en dispense JAMAIS : un état venu
    // d'ailleurs (import, Attributes d'un autre joueur) ne doit pas entrer sans
    // contrôle, et un mod sans id ni code ne pourrait ni tourner ni se nommer.
    if (!Array.isArray(s.mods)) s.mods = [];
    if (window.OwdMods && typeof window.OwdMods.normalise === "function") {
      try {
        var normes = window.OwdMods.normalise(s.mods);
        if (Array.isArray(normes)) s.mods = normes;
      } catch (e) {}
    }
    var vusMods = {};
    s.mods = s.mods.filter(function (m) { return m && typeof m === "object"; }).filter(function (m) {
      // L'id impose son alphabet : il sert de clé partout (avis du navigateur,
      // journal « [mod:<id>] », coffre du module qu'il remplacerait). MÊME
      // règle que le moteur (idPropre) et que le formulaire : les trois chemins
      // doivent donner le MÊME id, sans quoi l'empreinte changerait selon le
      // chemin pris et le joueur réautoriserait un mod qu'il connaît déjà.
      m.id = idMod(m.id);
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
    return s;
  }
  // un modificateur : décimal borné, jamais nul par accident
  function modNombre(v) {
    var n = parseFloat(v);
    return isFinite(n) ? clamp(Math.round(n * 100) / 100, -9999, 9999) : 0;
  }
  // Carte de FORÇAGES : le vide EFFACE la clé (absent = calculé), une valeur la
  // pose. Zéro est une valeur légitime — « forcé à 0 » n'est pas « pas forcé ».
  function carteForcages(src) {
    var out = {};
    if (!src || typeof src !== "object" || Array.isArray(src)) return out;
    Object.keys(src).forEach(function (k) {
      var v = src[k];
      if (v === null || v === undefined || v === "") return;
      var n = parseFloat(v);
      if (isFinite(n)) out[k] = clamp(Math.round(n * 100) / 100, -99999, 99999);
    });
    return out;
  }
  // Carte de MODIFICATEURS : zéro = pas d'entrée, la clé s'efface. L'inverse
  // exact de la précédente, et c'est voulu — un zéro n'est pas un réglage.
  function carteNombres(src) {
    var out = {};
    if (!src || typeof src !== "object" || Array.isArray(src)) return out;
    Object.keys(src).forEach(function (k) {
      var n = modNombre(src[k]);
      if (n) out[k] = n;
    });
    return out;
  }
  // ---------- filtres de calcul ----------
  // Un filtre intercepte une valeur DÉRIVÉE (total de caractéristique, PV max,
  // niveau d'effondrement…) juste après son calcul. Le calcul lui-même garde
  // son nom suffixé « Brut » ; le nom public appelle le brut, puis passe la
  // valeur aux filtres enregistrés pour ce nom. C'est par là qu'un mod change
  // une règle de calcul sans qu'on rouvre ce fichier, et sans réécrire le
  // module qui affiche la valeur : tout ce qui lit pvMax() voit le même chiffre.
  //
  // Les CASCADES sont voulues et tombent toutes seules : pvMaxAuto() appelle
  // effondrement() qui appelle prMax() qui appelle caracTotal(). Les gardes
  // sont donc par NOM, jamais globales, pour ne pas couper ces chaînes-là.
  //
  // ET L'EFFONDREMENT NE BOUCLE PAS : il se calcule sur PR, PS, PH et
  // l'exposition, dont les maximums ne dépendent QUE des caractéristiques.
  // Seuls PV MAX et PE MAX dépendent de lui. Un filtre de mod posé sur
  // « effondrement » qui lirait ctx.calculs.pvMax refermerait la boucle : c'est
  // la garde par nom qui l'attrape, en rendant le brut au second appel.
  var filtres = {};            // nom -> [{ fn, prop, echecs, src }]
  var filtresEnCours = {};     // nom -> 1 pendant sa passe (garde de récursion)
  var FILTRE_FAUTES = 5;       // même seuil que la muselière, même raison
  // À qui appartient ce qui s'enregistre : monteModules le pose autour du build
  // d'un module, l'exécution des mods autour du moteur. Hors de tout
  // propriétaire (console du navigateur), personne ne répond : « ? ».
  var proprietaireCourant = "?";
  var modEnExec = null;        // l'id du mod que le moteur lance, ou null
  var PROP_MOD = "mod";        // repli quand le moteur ne nomme pas le mod
  // Vrai pendant un montage. Ce qui s'enregistre HORS d'un montage (console du
  // navigateur, script tiers chargé après la fiche) n'a personne pour le
  // rejouer après la remise à zéro du prochain mount() : on le garde ici.
  var enMontage = false;
  var horsMontage = [];
  // Les points de filtre d'Outward. LA TABLE N'EST LÀ QUE POUR PRÉVENIR D'UN
  // NOM MAL TAPÉ : un filtre posé sur « pvmax » ne serait jamais appelé, et
  // rien ne le dirait. Un nom hors table passe quand même, avec un avertissement.
  var FILTRES_CONNUS = {
    caracTotal: 1, compBonus: 1, compDes: 1, compXp: 1,
    pvMax: 1, peMax: 1, pmMax: 1, piMax: 1, prMax: 1, psMax: 1, phMax: 1,
    charge: 1, accesRapides: 1, contenance: 1, expoMax: 1, effondrement: 1,
    poidsPorte: 1, desAction: 1, ruptureMax: 1, xpDepense: 1
  };
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
    // comptait double (+2, +4, +6…), sans que rien ne le montre.
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
  // COMPARER LES FONCTIONS PAR RÉFÉRENCE NE SUFFIT PAS : « function (v) {
  // return v + 2; } » écrit DANS un gestionnaire de clic fabrique un objet NEUF
  // à chaque clic. On compare donc aussi le TEXTE de la fonction. Deux filtres
  // vraiment distincts écrits caractère pour caractère pareil se confondraient,
  // mais poser deux fois le même calcul pour qu'il compte double n'est pas un
  // usage : l'empilement sans fin, si.
  function signeFn(fn) { try { return String(fn); } catch (e) { return ""; } }
  function gardeHorsMontage(e) {
    if (!e.mod) e.src = signeFn(e.fn);
    e.sig = signatureAuMontage;   // l'état des mods AU MOMENT du dépôt
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
  // Ce que les mods du personnage donnent à voir : leurs id, leur interrupteur
  // et l'accord du navigateur. Elle change dès qu'un mod est ajouté, retiré,
  // coupé, autorisé ou refusé — et c'est exactement à ces moments-là que ce qui
  // n'a PAS d'ayant droit connu doit cesser d'être rejoué.
  function signatureMods() {
    var l = (state && Array.isArray(state.mods)) ? state.mods : [];
    return l.map(function (m) {
      return String(m.id) + ":" + (m.actif !== false ? "1" : "0") + ":" + avisMod(empreinteMod(m.id, m.src));
    }).join("|");
  }
  var signatureAuMontage = null;
  // Rejoué au début de chaque montage : le contrat promet qu'un Owd.filtre ou
  // un Owd.enregistre lancé depuis la console vaut « pour le montage suivant »,
  // et pour tous ceux d'après. Mais seulement ce qui a encore un AYANT DROIT :
  // le filtre posé par le bouton d'un mod refusé, coupé ou supprimé
  // continuerait sinon de fausser les calculs à chaque montage, sans un mot et
  // sans rien pour le défaire — seul un rechargement complet de la page en
  // viendrait à bout, geste que le joueur n'a pas dans l'iframe Roll20.
  function rejoueHorsMontage() {
    var sig = signatureMods();
    var reste = [];
    horsMontage.forEach(function (h) {
      if (propEstUnMod(h.prop) && !modAutorise(h.prop)) return;
      // LE FILET. Un mod qui pose un filtre depuis un setTimeout échappe à
      // toute attribution : son propriétaire vaut « ? », comme une ligne tapée
      // à la console, que le contrat promet de conserver. On ne peut pas
      // distinguer les deux — mais on peut refuser de rejouer un « ? » anonyme
      // dès que la liste des mods a BOUGÉ. Une mise au point à la console, elle,
      // ne touche pas aux mods : elle survit.
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
  // pour cette passe et compte une faute ; cinq fautes de SUITE et il part,
  // parce qu'un filtre cassé fausserait chaque calcul de la fiche sans que
  // personne ne sache d'où vient le chiffre.
  function applique(nom, valeur, infos) {
    var liste = filtres[nom];
    if (!liste || !liste.length) return valeur;
    if (filtresEnCours[nom]) return valeur;   // garde de récursion, PAR NOM
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
    // le propriétaire porte l'erreur : c'est ce que Owd.etat(id) rend, et ce
    // que les listes de mods et de modules affichent
    etatModule(f.prop).erreur = texte;
  }
  // Owd.filtre : le propriétaire est celui du moment. ctx.filtreCalcul, lui,
  // fige l'id de son mod à la construction du contexte.
  function filtreCalcul(nom, fn) { ajouteFiltre(nom, fn, proprietaireCourant); }
  // le passage public d'un calcul : le brut, puis les filtres. Le test évite de
  // fabriquer l'objet d'infos pour rien — ces calculs sont rappelés des
  // centaines de fois par rafraîchissement.
  function pub(nom, valeur, infos) {
    return aFiltre(nom) ? applique(nom, valeur, infos || {}) : valeur;
  }

  // ---------- calculs ----------
  // Chaque valeur dérivée existe en DEUX TEMPS : <nom>Brut fait le calcul,
  // <nom> le passe aux filtres. Les fonctions <nom>Auto, elles, sont AUTRE
  // CHOSE : la valeur AVANT le forçage du MJ — c'est ce que montre le
  // placeholder du champ « Forcé », et ce que dit l'infobulle quand un forçage
  // est en place.

  // ---- caractéristiques ----
  function caracVal(c) { return num(state.caracs[c], 0); }
  function caracMods(c) { return (state.caracsMod[c] || 0) + (state.caracsMod2[c] || 0); }
  function caracAuto(c) { return caracVal(c) + caracMods(c); }
  function caracTotalBrut(c) {
    // total FORCÉ : il court-circuite tout, modificateurs compris. L'afficher
    // en somme le ferait mentir, d'où l'infobulle « Total forcé (Options) ».
    if (state.caracsForce[c] !== undefined) return state.caracsForce[c];
    return caracAuto(c);
  }
  function caracTotal(c) { return pub("caracTotal", caracTotalBrut(c), { carac: c }); }

  // ---- capacités dérivées ----
  // UNE SEULE fonction de calcul pour toutes : la formule vient de
  // owd-creation.json (base + carac × facteur, ou carac ÷ diviseur), et les
  // trois emplacements de modificateurs s'y ajoutent. Une capacité de plus ne
  // demande alors ni ligne de calcul, ni clé racine, ni suffixe d'attribut.
  //
  // Une capacité SANS FORMULE (carac null et base nulle, comme les points de
  // mana aujourd'hui) rend 0, et ce zéro se VOIT sur la fiche : c'est la donnée
  // qui le dit, pas un cas particulier codé ici.
  function capAuto(cle) {
    var d = capDef(cle);
    var v = 0;
    if (d) {
      v = num(d.base, 0);
      if (d.carac) {
        var t = caracTotal(d.carac);
        if (d.diviseur) {
          var q = t / num(d.diviseur, 1);
          v += (d.arrondi === "haut") ? Math.ceil(q) : Math.floor(q);
        } else {
          v += t * (d.facteur === undefined ? 1 : num(d.facteur, 1));
        }
      }
    }
    return v + modSum(state.divers[cle]);
  }
  // Le maximum EFFECTIF d'une capacité : le forçage du MJ s'il existe, la
  // valeur calculée sinon. `auto` est passée à part parce que PV et PE portent
  // en plus le poids de l'effondrement.
  function capMax(cle, auto) {
    if (state.maxForce[cle] !== undefined) return state.maxForce[cle];
    return auto();
  }
  function capForce(cle) { return state.maxForce[cle] !== undefined; }

  // ---- effondrement ----
  // Un niveau par tranche de 10 % PERDUE sur les réserves que les règles
  // nomment (repos, satiété, hydratation) et par tranche d'exposition ; les
  // niveaux s'additionnent, plafonnés. Rien de tout cela n'est écrit ici : la
  // tranche, le plafond, les pourcentages et la LISTE des réserves viennent de
  // owd-creation.json, et la table des dix lignes du livre n'apparaît nulle
  // part dans le DOM.
  function effTranche() { return Math.max(1, num(effDef().tranche, 10)); }
  function effPlafond() { return Math.max(0, num(effDef().plafond, 10)); }
  function effReserves() {
    var r = effDef().reserves;
    return Array.isArray(r) ? r : [];
  }
  // Ce qu'une réserve apporte au niveau. L'exposition est un cas à part, et
  // c'est la DONNÉE qui le dit (« signe: true ») : ce n'est pas une perte mais
  // un ÉCART à zéro, et il compte dans les deux sens — un homme gelé et un
  // homme cuit s'effondrent pareil.
  function effNiveauDe(cle) {
    var d = capDef(cle);
    if (d && d.signe) {
      var max = expoMax();
      if (max <= 0) return 0;
      return Math.floor((Math.abs(state.etat.expo) / max) * 100 / effTranche());
    }
    var m = maxDe(cle);
    if (m <= 0) return 0;
    var perte = (m - courantBrut(cle)) / m * 100;
    if (perte <= 0) return 0;
    return Math.floor(perte / effTranche());
  }
  function effondrementAuto() {
    var t = 0;
    effReserves().forEach(function (cle) { t += effNiveauDe(cle); });
    // le seul modificateur qui joue sur un NIVEAU et non sur des points
    t += modSum(state.divers.effondrement);
    return clamp(Math.floor(t), 0, effPlafond());
  }
  function effondrementBrut() {
    if (state.maxForce.effondrement !== undefined)
      return clamp(Math.floor(state.maxForce.effondrement), 0, effPlafond());
    return effondrementAuto();
  }
  function effondrement() { return pub("effondrement", effondrementBrut(), {}); }
  // Ce que l'effondrement laisse d'un maximum, en pour cent. À appliquer sur le
  // maximum ENTIER (modificateurs compris) : l'effondrement diminue ce que le
  // corps peut porter, pas seulement ce que la caractéristique lui donnait.
  function effReste(pct) {
    return clamp(100 - pct * effondrement(), 0, 100) / 100;
  }
  function pvMaxAuto() {
    return Math.floor(capAuto("pv") * effReste(num(effDef().pvParNiveau, 0)));
  }
  function peMaxAuto() {
    return Math.floor(capAuto("pe") * effReste(num(effDef().peParNiveau, 0)));
  }

  // ---- les treize maximums, un par un ----
  // Chacun existe en trois temps : Auto (avant forçage), Brut (après forçage),
  // public (après filtres). C'est ce qui permet au champ « Forcé » de montrer
  // la valeur calculée en filigrane, et à un mod de changer le résultat sans
  // toucher au forçage du MJ.
  function pvMax() { return pub("pvMax", capMax("pv", pvMaxAuto), {}); }
  function peMax() { return pub("peMax", capMax("pe", peMaxAuto), {}); }
  function pmMaxAuto() { return capAuto("pm"); }
  function pmMax() { return pub("pmMax", capMax("pm", pmMaxAuto), {}); }
  function piMaxAuto() { return capAuto("pi"); }
  function piMax() { return pub("piMax", capMax("pi", piMaxAuto), {}); }
  function prMaxAuto() { return capAuto("pr"); }
  function prMax() { return pub("prMax", capMax("pr", prMaxAuto), {}); }
  function psMaxAuto() { return capAuto("ps"); }
  function psMax() { return pub("psMax", capMax("ps", psMaxAuto), {}); }
  function phMaxAuto() { return capAuto("ph"); }
  function phMax() { return pub("phMax", capMax("ph", phMaxAuto), {}); }
  function chargeAuto() { return capAuto("charge"); }
  function charge() { return pub("charge", capMax("charge", chargeAuto), {}); }
  function accesAuto() { return capAuto("acces"); }
  function accesRapides() { return pub("accesRapides", capMax("acces", accesAuto), {}); }
  function contenanceAuto() { return capAuto("contenance"); }
  function contenance() { return pub("contenance", capMax("contenance", contenanceAuto), {}); }
  function expoMaxAuto() { return capAuto("expo"); }
  function expoMax() { return pub("expoMax", capMax("expo", expoMaxAuto), {}); }
  function ruptureMaxAuto() { return rupturePoints() + modSum(state.divers.rupture); }
  function ruptureMax() { return pub("ruptureMax", capMax("rupture", ruptureMaxAuto), {}); }
  function desActionAuto() { return desActionBase() + modSum(state.divers.desAction); }
  function desAction() { return pub("desAction", capMax("desAction", desActionAuto), {}); }

  // La table des maximums, par clé d'état : un seul endroit où le nom d'une
  // jauge se relie à son calcul. Les blocs, les cartes de tchat et les leviers
  // du MJ la lisent tous — deux tables se seraient contredites.
  var MAX_DE = {
    pv: pvMax, pe: peMax, pm: pmMax, pi: piMax,
    pr: prMax, ps: psMax, ph: phMax,
    charge: charge, acces: accesRapides, contenance: contenance,
    expo: expoMax, rupture: ruptureMax, desAction: desAction,
    effondrement: function () { return effPlafond(); }
  };
  var AUTO_DE = {
    pv: pvMaxAuto, pe: peMaxAuto, pm: pmMaxAuto, pi: piMaxAuto,
    pr: prMaxAuto, ps: psMaxAuto, ph: phMaxAuto,
    charge: chargeAuto, acces: accesAuto, contenance: contenanceAuto,
    expo: expoMaxAuto, rupture: ruptureMaxAuto, desAction: desActionAuto,
    effondrement: effondrementAuto
  };
  function maxDe(cle) { return aClef(MAX_DE, cle) ? MAX_DE[cle]() : 0; }
  function autoDe(cle) { return aClef(AUTO_DE, cle) ? AUTO_DE[cle]() : 0; }
  // La valeur COURANTE d'une jauge : null veut dire « au maximum », et la
  // valeur suit alors le maximum quand il bouge — ce qu'un nombre figé ne
  // ferait pas, et le maximum de PV et de PE bouge à chaque niveau
  // d'effondrement.
  function courantBrut(cle) {
    var v = state.etat[cle];
    return v === null || v === undefined ? maxDe(cle) : v;
  }
  function courant(cle) { return courantBrut(cle); }

  // ---- charge, accès rapides, contenance ----
  function invCompte(gi) { return state.inv.comptes[gi] !== false; }
  function poidsGroupe(gi) {
    var t = 0;
    state.inv.objets.forEach(function (o) { if (o.grp === gi) t += pnum(o.qte) * pnum(o.poids); });
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
  // Le poids porté se calcule ICI et nulle part ailleurs : le module
  // d'inventaire lit les mêmes fonctions. Deux calculs séparés finiraient par
  // se contredire à l'écran, le pied du module annonçant un chiffre et la jauge
  // de charge un autre, ce qui est pire que l'absence du réglage.
  function poidsPorteBrut() {
    var t = poidsObjets(true);
    state.vetements.forEach(function (v) { if (v.porte) t += pnum(v.poids); });
    return Math.round(t * 100) / 100;
  }
  function poidsPorte() { return pub("poidsPorte", poidsPorteBrut(), {}); }
  // Les objets marqués « accès rapide », comptés à l'unité et non à la
  // quantité : un carquois de vingt flèches occupe UN accès, pas vingt. Les
  // groupes posés au sol n'en occupent aucun — ce qui est au sol ne se dégaine
  // pas.
  function accesPris() {
    var n = 0;
    state.inv.objets.forEach(function (o) {
      if (o.rapide && invCompte(o.grp) && pnum(o.qte) > 0) n++;
    });
    return n;
  }
  // La contenance OCCUPÉE se compte à la main (le pas du bloc Corps) : la fiche
  // ne devine pas ce qu'un personnage a dans le ventre à partir de son sac. Les
  // « places » d'un objet disent ce qu'il occuperait une fois avalé ; c'est une
  // aide à la saisie, pas un calcul automatique.
  function contenancePrise() { return state.etat.contenance; }

  // ---- compétences ----
  function compDe(id) {
    var out = null;
    state.comps.forEach(function (c) { if (c.id === id) out = c; });
    return out;
  }
  function compRang(c) { return c ? clamp(num(c.rang, 0), 0, rangMax()) : 0; }
  // Les DÉS qu'une compétence engage au plus : ceux de son rang, ou le nombre
  // forcé par le MJ. Le joueur peut toujours en engager moins (barre d'envoi,
  // segment « Dés engagés ») : c'est un plafond, pas une obligation.
  function compDesBrut(c) {
    if (c && state.compsDesForce[c.id] !== undefined) return Math.floor(state.compsDesForce[c.id]);
    return num(rangInfo(compRang(c)).des, 0);
  }
  function compDes(c) { return pub("compDes", compDesBrut(c), { comp: c }); }
  function compMods(c) {
    if (!c) return 0;
    return (state.compsMod[c.id] || 0) + (state.compsMod2[c.id] || 0);
  }
  // Le BONUS d'une compétence : celui de son rang, plus les modificateurs — ou
  // le total forcé, qui remplace les deux.
  function compBonusAuto(c) { return num(rangInfo(compRang(c)).bonus, 0) + compMods(c); }
  function compBonusBrut(c) {
    if (c && state.compsForce[c.id] !== undefined) return state.compsForce[c.id];
    return compBonusAuto(c);
  }
  function compBonus(c) { return pub("compBonus", compBonusBrut(c), { comp: c }); }
  // Ce qu'une compétence a coûté : la somme des rangs pris, prix par prix. Les
  // prix viennent des règles, jamais d'ici.
  function compXpBrut(c) {
    var xp = 0, r = rangs(), i;
    for (i = 1; i <= compRang(c) && i < r.length; i++) xp += num(r[i].xp, 0);
    return xp;
  }
  function compXp(c) { return pub("compXp", compXpBrut(c), { comp: c }); }
  // Les points de rupture qu'une compétence engage : ceux de ses rangs.
  function compRupture(c) {
    var t = 0, r = rangs(), i;
    for (i = 1; i <= compRang(c) && i < r.length; i++) t += num(r[i].rupture, 0);
    return t;
  }
  // Une compétence est INVESTIE dès que quelque chose y est posé : un rang, un
  // modificateur, un forçage. Sans ce dernier point, la puce « Investies »
  // cacherait la compétence qu'on vient justement de régler.
  function compInvestie(c) {
    return compRang(c) > 0 || compMods(c) !== 0 ||
           state.compsForce[c.id] !== undefined ||
           state.compsDesForce[c.id] !== undefined;
  }
  function compGroupe(c) { return String(c.groupe || "").trim(); }

  // ---- techniques, expérience, rupture ----
  function techXp(t) { return Math.max(0, num(t.xp, 0)); }
  function techRupture(t) { return Math.max(0, num(t.rupture, 0)); }
  function xpDepenseBrut() {
    var xp = 0;
    state.comps.forEach(function (c) { xp += compXp(c); });
    state.techniques.forEach(function (t) { xp += techXp(t); });
    return xp;
  }
  function xpDepense() { return pub("xpDepense", xpDepenseBrut(), {}); }
  function xpRestant() { return state.xpTotal - xpDepense(); }
  // Les points de rupture ENGAGÉS : ceux des Rangs Max et ceux que les
  // techniques ont demandés. Le compteur de l'en-tête et le bloc Rupture lisent
  // tous deux ces fonctions.
  function ruptureComps() {
    var t = 0;
    state.comps.forEach(function (c) { t += compRupture(c); });
    return t;
  }
  function ruptureTechs() {
    var t = 0;
    state.techniques.forEach(function (x) { t += techRupture(x); });
    return t;
  }
  function ruptureDepense() { return ruptureComps() + ruptureTechs(); }
  function ruptureRestante() { return ruptureMax() - ruptureDepense(); }

  // ---- climat ----
  // La zone de confort du personnage HABILLÉ : les deux bornes du corps nu
  // viennent des règles (owd-creation.json), les degrés de protection de ce
  // qu'il porte. Les bornes nues ne sont jamais montrées seules : ce serait une
  // règle affichée.
  function protection(champ) {
    var t = 0;
    state.vetements.forEach(function (v) { if (v.porte) t += snum(v[champ]); });
    return Math.round(t * 10) / 10;
  }
  function confort() {
    var c = climatDef();
    if (c.nuBas === undefined || c.nuHaut === undefined) return null;
    return { bas: snum(c.nuBas) - protection("froid"), haut: snum(c.nuHaut) + protection("chaud") };
  }

  // La « carte » : le résumé CALCULÉ de la fiche, pour la bibliothèque, le
  // popup de l'extension et les attributs miroir Roll20 (barres de jetons,
  // macros). Elle ne se relit jamais : elle se recalcule.
  function computeCard() {
    var caracs = {};
    caracsOrdre().forEach(function (c) { caracs[c] = caracTotal(c); });
    return {
      name: state.name || "Sans nom",
      caracs: caracs,
      capacites: {
        pv: state.etat.pv, pvMax: pvMax(),
        pe: state.etat.pe, peMax: peMax(),
        pm: state.etat.pm, pmMax: pmMax(),
        pi: state.etat.pi, piMax: piMax(),
        pr: state.etat.pr, prMax: prMax(),
        ps: state.etat.ps, psMax: psMax(),
        ph: state.etat.ph, phMax: phMax(),
        expo: state.etat.expo, expoMax: expoMax(),
        charge: charge(), chargePorte: poidsPorte(),
        acces: accesRapides(), accesPris: accesPris(),
        contenance: contenance(), contenancePrise: contenancePrise(),
        rupture: state.etat.rupture === null ? ruptureRestante() : state.etat.rupture,
        ruptureMax: ruptureMax(),
        effondrement: effondrement(),
        desAction: desAction(),
        xpDepense: xpDepense()
      }
    };
  }

  // ---------- persistance ----------
  // Le bandeau du dernier enregistrement raté : absent tant que ça passe. Une
  // panne d'enregistrement ne se dit PAS en un éclair de 2,6 s vu une seule
  // fois : la fiche continuerait de s'afficher, parfaitement normale, pendant
  // qu'une session entière de travail se perd à la fermeture. Tant que ça ne
  // repasse pas, le bandeau reste.
  var elSavePanne = null;
  function save() {
    // La mise en forme se fait HORS du try du stockage, et son échec se dit
    // autrement. Un mod qui range une donnée circulaire dans ctx.state fait
    // jeter stringify : setItem n'est alors jamais atteint, donc sous Roll20 le
    // cache mémoire du pont n'est même pas à jour, donc aucune écriture
    // programmée, ni accusé de réception, ni chien de garde, ni bandeau de
    // perte. Rien ne s'enregistrerait plus et rien ne le dirait.
    var json = null, panne = "";
    try { json = JSON.stringify(state); }
    catch (e) {
      panne = "La fiche ne peut plus se mettre en forme pour l'enregistrement (" + messageErreur(e) +
              "). Un mod a sans doute rangé une donnée qui se contient elle-même : plus rien n'est enregistré.";
    }
    if (json !== null) {
      try { STORE.setItem("owd-perso", json); }
      catch (e2) { panne = "Impossible d'enregistrer (stockage plein ou bloqué) : exporter la fiche en JSON."; }
    }
    montrePanneSave(panne);
    var cards;
    try { cards = JSON.parse(STORE.getItem("owd-cards")) || {}; } catch (e3) { cards = {}; }
    var card;
    try { card = computeCard(); } catch (e4) { card = null; }
    if (card) {
      card.id = "_current";
      cards._current = card;
      try { STORE.setItem("owd-cards", JSON.stringify(cards)); } catch (e5) {}
    }
  }
  function montrePanneSave(msg) {
    if (!msg) {
      if (elSavePanne && elSavePanne.parentNode) elSavePanne.parentNode.removeChild(elSavePanne);
      return;
    }
    if (!appEl) return;   // pas encore monté : le prochain enregistrement le posera
    if (!elSavePanne) {
      // SA PROPRE CLASSE, en plus de la commune : .pc-avis est réservée au
      // bandeau de consentement des mods, les deux peuvent coexister, et sans
      // marque distincte ni le code ni une sonde ne sait lequel il tient.
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
    try { return normalize(JSON.parse(STORE.getItem("owd-perso"))); }
    catch (e) { return null; }
  }
  function curTab() { try { return STORE.getItem("owd-tab") || "fiche"; } catch (e) { return "fiche"; } }
  function setTab(id) { try { STORE.setItem("owd-tab", id); } catch (e) {} }

  // bibliothèque (site seulement : dans Roll20, une fiche par personnage)
  var PKEY = "owd-persos";
  function loadPersos() {
    try { var a = JSON.parse(STORE.getItem(PKEY)); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function savePersos(a) { try { STORE.setItem(PKEY, JSON.stringify(a)); } catch (e) {} }

  // ---------- envoi au tchat : destinataire, modificateur, dés engagés ----------
  // Tout ce que la fiche envoie à Roll20 traverse ce bloc. La commande est
  // composée ICI, côté site, et part par window.__owdChat, que l'extension
  // relaie SANS RIEN RÉÉCRIRE : le format peut donc évoluer sans re-signature.
  // Les trois réglages vivent dans le VRAI localStorage du navigateur : ce ne
  // sont pas des données de personnage, et les écrire dans les Attributes
  // Roll20 à chaque clic n'aurait aucun sens.
  var ENVOI = {
    mode: "owd-r20-envoi",         // "public" | "gm" | "joueur"
    dest: "owd-r20-envoi-dest",    // nom d'affichage du destinataire
    input: "owd-r20-envoi-input",  // "0" sans | "1" avec
    des: "owd-r20-envoi-des",      // "0" au maximum | "1" au choix
    noms: "owd-r20-envoi-noms"     // liste de secours, si Roll20 ne la donne pas
  };
  // LES DEUX SEULS APPELS BRUTS AU localStorage DE TOUT LE BUNDLE, et c'est
  // délibéré : partout ailleurs on passe par STORE, donc par le shim de
  // l'amorce, qui n'est qu'un cache en MÉMOIRE et meurt avec la page. Y ranger
  // ces réglages les ferait oublier à chaque ouverture de la fiche. Ici on vise
  // au contraire la persistance, sur le site comme dans Roll20 quand le
  // navigateur autorise le stockage tiers. La contrepartie est assumée : dans
  // une iframe d'une autre origine, Chrome peut refuser l'accès — les deux
  // appels sont donc sous try/catch, l'échec est SILENCIEUX, et les réglages
  // d'envoi repartent alors de leur valeur par défaut à chaque ouverture. Rien
  // de ce qui est ici n'appartient au personnage : le perdre ne perd rien.
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
  function envDesChoix() { return lpref(ENVOI.des, "0") === "1"; }
  // TITRES et libellés : les accolades casseraient la carte, les blancs se
  // replient. Même assainissement que celui que l'extension ne fait pas.
  function envSan(s) {
    return String(s == null ? "" : s).replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  }
  // VALEURS de champ : les accolades d'une macro Roll20 (@{Perso|owd_force},
  // ?{…}) sont LÉGITIMES et doivent survivre. Un champ de gabarit se ferme sur
  // « }} » : c'est la SEULE séquence à briser, et une valeur qui finit par une
  // accolade prend une espace pour ne pas en fabriquer une avec la fermeture.
  function envVal(s) {
    var v = String(s == null ? "" : s).replace(/\s+/g, " ").trim().replace(/\}\}/g, "} }");
    return /\}$/.test(v) ? v + " " : v;
  }
  // Le préfixe de chuchotement OUVRE la commande : Roll20 exige que le message
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
  // Requête Roll20, résolue à l'envoi. Les parenthèses laissent saisir un
  // modificateur négatif sans ambiguïté (« + (-3) »).
  var ENV_QUERY = " + (?{Modificateur|0})";
  // Combien de dés d'action le joueur engage. Le rang donne un PLAFOND (1, 2 ou
  // 3 dés) ; engager moins est un choix de jeu, pas une entorse. La requête se
  // pose EN FACTEUR du dé : « ?{Dés engagés|2}d8 ».
  function desQuery(n) { return "?{Dés engagés|" + Math.max(0, num(n, 0)) + "}"; }
  // Option de jet Roll20 : le résultat s'inscrit au compteur de tours. Elle se
  // pose DANS le jet en ligne, ENTRE les doubles crochets, jamais après « }} » :
  // hors d'un « /roll », Roll20 ne la lit qu'attachée au jet lui-même. AUCUN
  // bouton natif ne l'emploie — les règles publiées ne donnent pas d'ordre du
  // tour — mais le paramètre reste dans la signature pour qu'un mod puisse le
  // demander le jour où il arrivera.
  var ENV_TRACKER = " &{tracker}";
  function cmdJet(label, value, die, avecInput, desMax, tracker) {
    // « + 0 » est du bruit : une valeur nulle ne s'écrit pas.
    var v = value ? (value > 0 ? " + " + value : " - " + (-value)) : "";
    // Le dé voit ses blancs REPLIÉS : une commande multiligne est refusée par
    // l'extension, et le clic partirait alors sans rien envoyer. Ses accolades,
    // elles, restent : « ?{Dés engagés|2}d8 » est un dé légitime.
    var de = String(die == null ? "" : die).replace(/\s+/g, " ").trim() || (state.de || DE_DEFAUT);
    // « Dés au choix » : le nombre de dés devient une requête, le nombre du
    // rang restant proposé par défaut. On ne remplace que le FACTEUR, jamais
    // les faces — le d8 est la seule constante du jeu.
    if (desMax && envDesChoix()) de = de.replace(/^\s*\d+(?=d\d)/i, desQuery(desMax));
    return "&{template:default} {{name=" + (envSan(label) || "Jet") +
           "}} {{Jet=[[" + de + v +
           (avecInput ? ENV_QUERY : "") +
           (tracker ? ENV_TRACKER : "") + "]]}}";
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
  // envoi effectif : préfixe + commande. Rend false hors Roll20, ce qui
  // déclenche les replis.
  function envoyer(cmd) {
    if (typeof window === "undefined" || typeof window.__owdChat !== "function") return false;
    window.__owdChat(envPrefixe() + cmd);
    return true;
  }

  // ---------- jets ----------
  // Trois voies, dans cet ordre : le canal brut (la commande composée ici), le
  // repli historique __owdRoll (l'extension recompose alors elle-même : jet
  // public, sans modificateur), et hors Roll20 le tirage local.
  function parseDice(expr) {
    var m = /^(\d{1,2})d(\d{1,4})([+-]\d{1,4})?$/i.exec(String(expr || "").replace(/\s/g, ""));
    if (!m) return null;
    return { n: clamp(+m[1], 1, 20), faces: clamp(+m[2], 2, 1000), plus: +(m[3] || 0) };
  }
  // isCheck : vrai EXACTEMENT pour les jets qui acceptent un modificateur au
  // lancer — compétence, attaque, parade, technique. Aucun autre filtre à
  // écrire. Les DÉGÂTS n'en sont pas : ils ne se lancent pas du tout.
  function doRoll(label, value, die, isCheck, desMax, tracker) {
    die = die || state.de || DE_DEFAUT;
    if (envoyer(cmdJet(label, value, die, isCheck && envInput(), desMax, tracker))) return;
    if (typeof window !== "undefined" && typeof window.__owdRoll === "function") {
      window.__owdRoll(die, value, label);
      return;
    }
    var d = parseDice(die);
    // Hors Roll20 la fiche lance le dé elle-même : elle sait faire « NdM ±k »,
    // pas résoudre une macro Roll20, qui n'a de sens que là-bas.
    if (!d) {
      flash(/[@?]\{/.test(String(die))
        ? "« " + die + " » est une macro Roll20 : elle ne se lance que dans Roll20."
        : "Dé illisible : « " + die + " » (attendu : NdM, ex. " + deDe(2) + ").");
      return;
    }
    var dice = [];
    for (var i = 0; i < d.n; i++) dice.push(1 + Math.floor(Math.random() * d.faces));
    var somme = dice.reduce(function (a, b) { return a + b; }, 0) + d.plus;
    var total = somme + value;
    flash(label + " : " + total + " (dé " + dice.join(" + ") +
          (value ? " " + (value >= 0 ? "+ " : "− ") + Math.abs(value) : "") + ")");
  }

  // ---------- envoi d'un élément au tchat ----------
  // fields : [[libellé, valeur], …], les valeurs vides sont ignorées.
  // Une étiquette VIDE ("") est volontaire : la carte Roll20 rend alors
  // « {{=texte}} », une ligne pleine largeur sans colonne de libellé, réservée
  // aux TEXTES LONGS (description d'une technique, d'un objet). UNE SEULE par
  // carte : le gabarit les indexe par clé.
  function sayChat(title, fields) {
    var clean = (fields || []).filter(function (f) { return f && String(f[1] == null ? "" : f[1]).trim(); });
    if (envoyer(cmdCarte(title, clean))) return;
    if (typeof window !== "undefined" && typeof window.__owdSay === "function") {
      window.__owdSay(title, clean);
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
  // à chaque mount() : les anciens pointent sur un DOM qui n'existe plus.
  //
  // « hooks » désigne le registre COURANT : monteModules le fait pointer sur
  // celui du module en construction. Les briques (textInput, stepper, bigTile,
  // gearBtn…) écrivent donc dans « hooks » sans rien savoir des modules, et
  // chaque fonction atterrit chez son propriétaire. C'est ce qui permet de
  // museler un module sans toucher aux autres.
  var regHors = [];
  var regsModules = {};
  var hooks = regHors;
  var compHooks = [];           // lignes de compétences, vidées par rebuildComps()
  var optHooks = [];            // bloc Options rebâtissable
  var optCompsRebuild = null;   // posé par le module « optcomps »
  // filtres de VUE du bloc Options, propres à lui : les siens ne doivent pas
  // suivre ceux de l'onglet Fiche, on n'y cherche pas la même chose
  var optFilter = "";
  var optOnly = COMPACT;

  function regModule(id) {
    if (!regsModules[id]) regsModules[id] = [];
    return regsModules[id];
  }
  // Musellement : un module dont le registre jette EN CHAÎNE finit par se
  // taire. Cinq échecs consécutifs, parce qu'un hook peut échouer une fois sur
  // un état transitoire (une frappe en cours) sans être cassé pour autant ;
  // cinq fois d'affilée, c'est le module qui est en faute. Une seule réussite
  // remet le compteur à zéro.
  var MUSELIERE = 5;
  var etatsModules = {};
  function etatModule(id) {
    if (!etatsModules[id])
      etatsModules[id] = { echecs: 0, musele: false, erreur: "", panne: "", vide: false };
    return etatsModules[id];
  }
  function messageErreur(e) {
    return String((e && (e.message || e.toString())) || "erreur inconnue");
  }
  // Le résultat n'est pas jugé ici mais RETENU dans le bilan de la passe, et le
  // compteur ne bouge qu'une fois la passe finie. C'est nécessaire parce qu'un
  // même id peut avoir DEUX registres (« comps » et « optcomps » ont aussi
  // celui de leurs lignes rebâties) : en jugeant registre par registre, la
  // réussite du premier remettait le compteur à zéro juste avant l'échec du
  // second, et la muselière de ces deux modules-là ne serait jamais tombée.
  function joue(id, reg, bilan) {
    if (etatModule(id).musele) return;
    if (bilan[id] === undefined) bilan[id] = null;
    for (var i = 0; i < reg.length; i++) {
      try { reg[i](); } catch (err) { if (!bilan[id]) bilan[id] = err; }
    }
  }
  function refresh() {
    save();
    var bilan = {};
    joue("", regHors, bilan);
    // les clés d'un objet se parcourent dans leur ordre de création : c'est
    // l'ordre de montage des modules, donc l'affichage ne bouge pas
    Object.keys(regsModules).forEach(function (id) { joue(id, regsModules[id], bilan); });
    joue("comps", compHooks, bilan);
    joue("optcomps", optHooks, bilan);
    Object.keys(bilan).forEach(function (id) {
      var e = etatModule(id);
      if (e.musele) return;
      if (!bilan[id]) { e.echecs = 0; return; }
      e.echecs++;
      e.erreur = messageErreur(bilan[id]);
      // « » n'est pas un module mais ce qui encadre les onglets : le museler
      // éteindrait la fiche elle-même, sans bloc à marquer ni interrupteur pour
      // le rallumer. Ses hooks restent sous try/catch, c'est là qu'est la
      // protection.
      if (id && e.echecs >= MUSELIERE) {
        e.musele = true;
        museleAffiche(id, e);
      }
    });
  }
  var rootEl = null;
  var appEl = null;      // le .perso-fiche monté : porte les jetons de couleur
  // Remplacement d'état COMPLET (import, bibliothèque, nouveau personnage) :
  // toutes les sections tiennent des références sur l'ancien état, on remonte
  // donc la fiche entière. C'est aussi ce que rendent ctx.reconstruire et
  // Owd.remonte ; appelé PENDANT un montage, il ne relance rien sur-le-champ
  // (mount() note la demande et l'honore une fois le montage fini).
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
    // le champ ne se réécrit JAMAIS pendant la frappe : c'est le motif de tous
    // les champs du fichier
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
  // stepper −/champ/+ : le champ du milieu reste saisissable au point près, ce
  // qui compte sur les grands nombres d'Outward (960 points de repos ne se
  // remontent pas de 10 en 10 à la main).
  function stepper(get, set, step, title, reg) {
    var w = el("span", "pc-step");
    w.appendChild(stepBtn("−", title ? "− " + step + (title === true ? "" : " (" + title + ")") : null,
      function () { set(get() - step); refresh(); }));
    var i = el("input", "pc-num");
    i.type = "number";
    i.step = String(step);
    i.value = get();
    i.addEventListener("input", function () {
      var v = parseFloat(String(i.value).replace(",", "."));
      if (isFinite(v)) { set(v); refresh(); }
    });
    (reg || hooks).push(function () { if (document.activeElement !== i) i.value = get(); });
    w.appendChild(i);
    w.appendChild(stepBtn("+", title ? "+ " + step + (title === true ? "" : " (" + title + ")") : null,
      function () { set(get() + step); refresh(); }));
    return w;
  }
  // trois petits champs ± (équipement / technique / décision du MJ), sommés
  // dans la valeur effective ; discrets, révélés au survol de l'hôte
  // (.pc-mods-host).
  function multiMod(map, key, reg) {
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
        arr()[i] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -9999, 9999) : 0;
        inp.classList.toggle("neg", arr()[i] < 0);
        refresh();
      });
      (reg || hooks).push(function () {
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
  // CONSTRUCTION du personnage (rangs, forçages, modificateurs, ajouts,
  // suppressions, textes). Hors édition, seuls les gestes de JEU restent
  // actifs : jets, tchat, jauges courantes, contenance, bourse, quantités
  // d'objets. Réglage d'interface PUR : ni dans l'état du personnage, ni
  // persisté — chaque chargement repart verrouillé.
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
      // data-module est le point d'accroche des sondes ; les modules sans
      // rouage le reçoivent quand même, posé par monteModules
      b.dataset.module = editId;
      t.appendChild(gearBtn(b, editId, onToggle));
    }
    b.appendChild(t);
    return b;
  }
  function bigTile(label, getV, onClick, reg) {
    var d = el("div", "pc-big" + (onClick ? " pc-rollable" : ""));
    d.appendChild(el("span", "k", label));
    var v = el("span", "v", "");
    d.appendChild(v);
    (reg || hooks).push(function () { v.textContent = String(getV()); });
    if (onClick) d.addEventListener("click", onClick);
    return d;
  }
  // Une note sous un bloc : ce que la fiche a besoin de dire sur l'ÉTAT du
  // personnage ou sur le sens d'un champ. Jamais une règle du livre.
  function note(txt) { return el("div", "pc-block-note", txt); }
  // ---------- barre d'outils + bibliothèque (site seulement) ----------
  function buildTop(container) {
    if (COMPACT) return;   // dans Roll20, la fiche EST le personnage
    var top = el("div", "pc-top");
    top.appendChild(el("span", "pc-top-title", "Fiche Outward"));
    top.appendChild(el("span", "pc-top-hint", "Personnage — règles de base Outward"));

    var lib = el("div", "pc-lib");
    var sel = el("select");
    function fillSel() {
      // refait après CHAQUE écriture de la bibliothèque, sinon le select ment
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

    function btn(txt, cls, title, fn) {
      var b = el("button", "pc-btn" + (cls ? " " + cls : ""), txt);
      b.type = "button";
      if (title) b.title = title;
      b.addEventListener("click", fn);
      return b;
    }
    lib.appendChild(btn("Charger", null, null, function () {
      var p = loadPersos().filter(function (q) { return q.id === sel.value; })[0];
      if (!p) { flash("Choisir un personnage dans la liste."); return; }
      // COPIE : sans elle, la fiche et l'entrée de bibliothèque partageraient
      // les mêmes objets, et jouer écraserait la sauvegarde
      try { state = normalize(JSON.parse(JSON.stringify(p.state))); }
      catch (e) { flash("Fiche illisible."); return; }
      remount();
      flash("« " + (p.name || "Sans nom") + " » chargé.");
    }));
    lib.appendChild(btn("Enregistrer", null, "Enregistrer le personnage courant dans la bibliothèque", function () {
      var persos = loadPersos();
      var name = state.name || "Sans nom";
      var existant = null;
      persos.forEach(function (p) { if (p.name === name) existant = p; });
      var copie = JSON.parse(JSON.stringify(state));
      if (existant) existant.state = copie;
      else persos.push({ id: "p" + Date.now().toString(36), name: name, state: copie });
      savePersos(persos);
      fillSel();
      flash("« " + name + " » enregistré.");
    }));
    lib.appendChild(btn("Supprimer", "danger", "Supprimer le personnage choisi de la bibliothèque", function () {
      if (!sel.value) { flash("Choisir un personnage dans la liste."); return; }
      savePersos(loadPersos().filter(function (q) { return q.id !== sel.value; }));
      fillSel();
    }));
    lib.appendChild(btn("Nouveau", null, null, function () { state = blank(); remount(); }));
    lib.appendChild(btn("Exporter", null, null, exporterJson));
    var file = el("input");
    file.type = "file"; file.accept = "application/json"; file.style.display = "none";
    file.addEventListener("change", function () { importerJson(file); });
    lib.appendChild(btn("Importer", null, null, function () { file.click(); }));
    lib.appendChild(file);
    top.appendChild(lib);
    container.appendChild(top);
  }
  // Exporter / importer : le même geste que dans le bloc « Fiche » des Options,
  // qui les REDONNE parce que la barre d'outils n'existe pas dans Roll20.
  function exporterJson() {
    var a = document.createElement("a");
    a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    a.download = (state.name || "personnage-outward") + ".json";
    a.click();
  }
  function importerJson(file) {
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
  }

  // ---------- barre d'envoi (Roll20 seulement) ----------
  // À qui part la macro, faut-il demander un modificateur, et combien de dés le
  // joueur engage. Geste de JEU : aucun rouage, aucun mode édition. Posée en
  // FRÈRE de .pc-head, jamais dans .pc-id — dont les douze colonnes sont
  // pleines, et dont la hauteur commande la taille du portrait.
  function buildEnvoi(sheet) {
    if (!COMPACT) return;   // hors Roll20 il n'y a pas de tchat : rien à régler
    var bar = el("div", "pc-envoi");
    bar.appendChild(el("span", "lbl", "Envoi"));

    var destSel = el("select", "pc-select");
    destSel.title = "Destinataire du chuchotement";
    var editNoms = null;
    var listeRoll20 = null;

    function majDest() {
      var joueur = envMode() === "joueur";
      destSel.style.display = joueur ? "" : "none";
      if (editNoms) editNoms.style.display = joueur && !listeRoll20 ? "" : "none";
    }
    // fabrique de segments accolés : trois réglages, la même mécanique
    function segments(cle, actuel, choix, apres) {
      var segs = el("div", "pc-envoi-segs");
      var boutons = [];
      choix.forEach(function (o) {
        var b = el("button", "seg" + (actuel === o[0] ? " on" : ""), o[1]);
        b.type = "button";
        b.title = o[2];
        b.addEventListener("click", function () {
          lset(cle, o[0]);
          boutons.forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
          if (apres) apres(o[0]);
        });
        boutons.push(b);
        segs.appendChild(b);
      });
      return segs;
    }

    bar.appendChild(segments(ENVOI.mode, envMode(), [
      ["public", "Publique", "Tout le monde voit la carte"],
      ["gm", "Au MJ", "Chuchoté au MJ (/w gm)"],
      ["joueur", "À un joueur", "Chuchoté au joueur choisi à droite"]
    ], function (v) { majDest(); if (v === "joueur") demanderJoueurs(); }));

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
      // CE QUI EST AFFICHÉ EST CE QUI SERA UTILISÉ. Sans cette ligne, un
      // sélecteur qui ne porte qu'un nom n'émet jamais « change » (le
      // navigateur le choisit tout seul) : le destinataire restait vide et la
      // macro repartait en public alors que son nom s'affichait.
      lset(ENVOI.dest, destSel.value);
    }
    destSel.addEventListener("change", function () { lset(ENVOI.dest, destSel.value); });
    // Roll20 ne livre sa liste que par l'extension (la fiche est une iframe
    // d'une autre origine) : sans réponse, la saisie manuelle prend le relais.
    function demanderJoueurs() {
      if (typeof window.__owdPlayers !== "function") { remplirDest(nomsManuels()); return; }
      window.__owdPlayers(function (noms) {
        if (noms && noms.length) { listeRoll20 = noms; remplirDest(noms); }
        else remplirDest(nomsManuels());
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

    var sepM = el("span", "lbl", "Modificateur");
    sepM.title = "Ne s'applique qu'aux jets : compétence, attaque, parade, technique";
    bar.appendChild(sepM);
    bar.appendChild(segments(ENVOI.input, envInput() ? "1" : "0", [
      ["0", "Sans input", "Le jet part tel quel"],
      ["1", "Avec input", "Roll20 demande un modificateur avant de lancer"]
    ]));

    // LE TROISIÈME SEGMENT, propre à Outward. Une caractéristique n'entre
    // jamais dans un jet ici : elle ouvre l'usage d'une arme et fixe ses
    // dégâts. Ce qui varie, c'est le NOMBRE DE DÉS ENGAGÉS — le rang donne un
    // plafond, le joueur peut en engager moins.
    var sepD = el("span", "lbl", "Dés engagés");
    sepD.title = "Le rang donne un plafond de dés d'action ; on peut toujours en engager moins";
    bar.appendChild(sepD);
    bar.appendChild(segments(ENVOI.des, envDesChoix() ? "1" : "0", [
      ["0", "Au maximum", "Le jet engage tous les dés que le rang autorise"],
      ["1", "Au choix", "Roll20 demande combien de dés engager avant de lancer"]
    ]));

    sheet.appendChild(bar);
    remplirDest(nomsManuels());
    majDest();
    demanderJoueurs();
  }

  // ---------- en-tête : portrait + identité + compteurs + garde-fous ----------
  function buildHead(sheet) {
    var head = el("div", "pc-head");
    var idBox = el("div", "pc-id");   // créé tôt : le portrait s'aligne sur SA hauteur

    // portrait compact 1:1, coins arrondis. L'URL s'édite EN PLACE au clic —
    // JAMAIS prompt(), muet dans l'iframe Roll20 sous Chrome.
    var pbox = el("div", "pc-portrait-box");
    pbox.title = "Portrait — clic : changer l'image (URL)";
    var pclip = el("div", "clip");
    var pimg = el("img");
    pimg.alt = "";
    pclip.appendChild(pimg);
    pclip.appendChild(el("span", "ph", "?"));
    pbox.appendChild(pclip);
    hooks.push(function () {
      var want = state.portrait || "";
      // ne toucher à src QUE s'il change : sinon l'image se recharge à chaque frappe
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
    // Carré 1:1 haut comme l'en-tête : largeur = hauteur MESURÉE. Aucun
    // transfert aspect-ratio (infiable depuis un étirement flex sous Firefox)
    // et aucune règle de largeur en CSS, qui contredirait le calcul. Boucle
    // BORNÉE à 3 passes : régler le côté rétrécit le bloc d'identité, qui peut
    // se replier et changer de hauteur.
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
    // suit les redimensionnements (dialogue Roll20, fenêtre séparée)
    try { new ResizeObserver(function () { carrePortrait(0); }).observe(idBox); } catch (e) {}

    idBox.appendChild(fld("Nom", textInput(function () { return state.name; },
      function (v) { state.name = v; }, "Nom du personnage"), "c4"));
    idBox.appendChild(fld("Espèce", textInput(function () { return state.espece; },
      function (v) { state.espece = v; }), "c2"));
    idBox.appendChild(fld("Âge", textInput(function () { return state.age; },
      function (v) { state.age = v; }), "c2"));
    idBox.appendChild(fld("Sexe", textInput(function () { return state.sexe; },
      function (v) { state.sexe = v; }), "c2"));
    idBox.appendChild(fld("Genre", textInput(function () { return state.genre; },
      function (v) { state.genre = v; }), "c2"));

    // 2e ligne, pleine largeur : les deux budgets et le total d'XP.
    var mrow = el("div", "pc-id-meters");
    function meter(label, getUsed, getTotal, titre) {
      var m = el("span", "pc-meter");
      m.appendChild(el("span", null, label));
      var b = el("b", null, "");
      m.appendChild(b);
      var bar = el("span", "bar");
      var fill = el("i");
      bar.appendChild(fill);
      m.appendChild(bar);
      if (titre) m.title = titre;
      hooks.push(function () {
        var used = getUsed(), total = getTotal();
        b.textContent = fmtP(used) + " / " + fmtP(total);
        var over = used > total;
        b.classList.toggle("over", over);
        fill.classList.toggle("over", over);
        fill.style.width = clamp(total ? (used / total) * 100 : 0, 0, 100) + "%";
      });
      return m;
    }
    mrow.appendChild(meter("XP dépensé", xpDepense, function () { return state.xpTotal; },
      "Ce que les rangs de compétence et les techniques ont coûté"));
    mrow.appendChild(meter("Rupture", ruptureDepense, ruptureMax,
      "Points de rupture engagés par les Rangs Max et par les techniques"));
    var xpIn = el("input");
    xpIn.type = "number"; xpIn.min = 0; xpIn.step = 25;
    xpIn.value = state.xpTotal;
    xpIn.addEventListener("input", function () {
      var v = parseInt(xpIn.value, 10);
      if (isFinite(v)) { state.xpTotal = Math.max(0, v); refresh(); }
    });
    hooks.push(function () { if (document.activeElement !== xpIn) xpIn.value = state.xpTotal; });
    mrow.appendChild(fld("XP total", xpIn));
    idBox.appendChild(mrow);

    head.appendChild(idBox);
    sheet.appendChild(head);
    buildEnvoi(sheet);

    // ---- garde-fous ----
    // Ils disent l'ÉTAT du personnage, jamais une règle : c'est la seule
    // exception au « rien du livre ne s'affiche ». Le conteneur est toujours
    // là ; .pc-warns:empty le fait disparaître tout seul quand il n'a rien à
    // dire.
    var warns = el("div", "pc-warns");
    hooks.push(function () {
      warns.innerHTML = "";
      function dire(t) { warns.appendChild(el("div", "pc-warn", t)); }
      if (xpRestant() < 0)
        dire("XP dépensé au-delà du total (" + fmtP(xpDepense()) + " / " + fmtP(state.xpTotal) + ").");
      if (ruptureRestante() < 0)
        dire("Points de rupture engagés au-delà du compte (" + fmtP(ruptureDepense()) +
             " / " + fmtP(ruptureMax()) + ").");
      if (peMax() <= 0)
        dire("Points d'endurance au maximum de zéro : le personnage est inconscient.");
      if (poidsPorte() > charge())
        dire("Charge dépassée : " + fmtP(poidsPorte()) + " pour " + fmtP(charge()) + ".");
      if (accesPris() > accesRapides())
        dire("Accès rapides dépassés : " + accesPris() + " pour " + accesRapides() + ".");
      if (contenancePrise() > contenance())
        dire("Contenance dépassée : " + fmtP(contenancePrise()) + " pour " + fmtP(contenance()) + ".");
      if (state.etat.pm !== null && state.etat.pm > pmMax())
        dire("Points de mana au-delà du maximum (" + fmtP(state.etat.pm) + " / " + fmtP(pmMax()) +
             ") : aucune règle ne donne ce maximum aujourd'hui.");
      if (effondrement() >= effPlafond() && effPlafond() > 0)
        dire("Effondrement au dernier niveau (" + effondrement() + ").");
    });
    sheet.appendChild(warns);
  }

  // ---------- onglets ----------
  // TROIS, et l'auteur les a nommés. Le contrôle segmenté est celui de JJK,
  // repris tel quel.
  var TABS = [
    { id: "fiche", label: "Fiche" },
    { id: "inventaire", label: "Inventaire" },
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
      // L'onglet se nomme sur son panneau : c'est le SEUL moyen, de
      // l'extérieur, de dire dans QUELLE colonne de QUEL onglet un module a
      // atterri. À ne pas omettre.
      panes[t.id].dataset.tab = t.id;
    });
    function activate(id) {
      if (!panes[id]) id = "fiche";
      TABS.forEach(function (t) {
        btns[t.id].classList.toggle("on", t.id === id);
        panes[t.id].classList.toggle("on", t.id === id);
      });
      setTab(id);   // l'onglet ouvert survit au remontage
    }
    sheet.appendChild(bar);
    TABS.forEach(function (t) { sheet.appendChild(panes[t.id]); });
    activate(curTab());
    return panes;
  }

  // ---------- registre de modules ----------
  // Un module = un bloc autonome de la fiche, désigné par un id STABLE (celui
  // que porte son attribut data-module, et sur lequel les sondes s'accrochent).
  // Le registre ne fait rien de plus que ce que le montage ferait en dur : il
  // le rend NOMMABLE. C'est la condition pour qu'un mod se substitue à un
  // module natif, ou change la disposition, sans qu'on rouvre ce fichier.
  //
  //   id      identifiant stable, unique
  //   titre   ce que le module affiche (repris par le plan et les cartes de panne)
  //   onglet  clé d'un onglet de TABS
  //   colonne clé d'une colonne du squelette de cet onglet
  //   pour    prédicat facultatif : le module n'existe que s'il rend vrai
  //   build   fonction SANS effet de bord sur la page : elle RETOURNE son bloc
  var modules = [];
  var moduleOrdre = [];    // ordre partiel demandé par ordonne() ; brut, filtré au montage
  var placeOrigine = {};   // id -> place déclarée, relevée AVANT toute consigne

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
    // refuse. Posée une fois pour toutes, elle survit au rejeu.
    if (m && modEnExec && !m.__mod) m.__mod = modEnExec;
    if (i >= 0) modules[i] = m;
    else modules.push(m);
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

  // Squelette de chaque onglet : ses colonnes, dans l'ordre. Il vit ICI, et pas
  // dans les modules, pour qu'un mod n'ait qu'un bloc à fournir sans rien
  // savoir de la charpente.
  //
  // Une colonne PLEINE LARGEUR se reconnaît à ce qu'elle rend le PANNEAU
  // lui-même (c[k] === pane) : c'est ainsi que l'inventaire passe sous les deux
  // colonnes, et c'est ce que squeletteColonnes() exploite pour dessiner le
  // plan. L'onglet Fiche en gagne une (JJK n'en avait pas) : les techniques
  // s'étalent sous les trois colonnes, le CSS le porte déjà
  // (.pc-cols-fiche + .pc-block { margin-top: var(--gut) }).
  var SQUELETTES = {
    fiche: function (pane) {
      var cols = el("div", "pc-cols-fiche");
      var c1 = el("div", "pc-col");
      var c2 = el("div", "pc-col");
      var c3 = el("div", "pc-col");
      cols.appendChild(c1);
      cols.appendChild(c2);
      cols.appendChild(c3);
      pane.appendChild(cols);
      return { gauche: c1, milieu: c2, droite: c3, bas: pane };
    },
    inventaire: function (pane) {
      var cols = el("div", "pc-cols2");
      var left = el("div", "pc-col");
      var right = el("div", "pc-col");
      cols.appendChild(left);
      cols.appendChild(right);
      pane.appendChild(cols);
      return { gauche: left, droite: right, bas: pane };
    },
    options: function (pane) {
      var cols = el("div", "pc-cols2");
      var a = el("div", "pc-col");
      var b = el("div", "pc-col");
      cols.appendChild(a);
      cols.appendChild(b);
      pane.appendChild(cols);
      return { gauche: a, droite: b };
    }
  };
  // Libellés COURTS : ils coiffent une colonne du plan, qui est étroite.
  var LIB_COLONNES = {
    gauche: "Gauche", milieu: "Milieu", droite: "Droite", bas: "Pleine largeur"
  };

  // L'interrupteur du module. SEULS les modules COUPÉS figurent dans
  // state.modActifs : tout le reste est actif, y compris un module inconnu de
  // la fiche qui l'ouvre.
  function actif(id) {
    return !state || !state.modActifs || state.modActifs[id] !== false;
  }
  // Couper un module le retire de la fiche SANS RIEN EFFACER : son coffre et
  // ses données restent, il ne s'affiche plus.
  function activeModule(id, oui) {
    if (!state) return;
    if (!state.modActifs) state.modActifs = {};
    // Le bloc des réglages ne se coupe pas, et LE REFUS EST ICI, DANS
    // L'ÉCRITURE, pas seulement au montage. Sinon un mod qui appelle
    // Owd.active("modules", false) laisse « modules: false » dans le personnage
    // pour toujours : le bloc s'affiche (le montage l'exempte) pendant que
    // Owd.actif("modules") répond faux, et le personnage transmis emporte une
    // incohérence que rien n'efface.
    if (String(id) === MODULE_REGLAGES) { delete state.modActifs[id]; save(); return; }
    if (oui === false) state.modActifs[id] = false;
    else delete state.modActifs[id];
    save();
  }
  var elModules = {};   // id -> l'élément monté (pour marquer une muselière)
  // Le prédicat « pour » d'un module natif dit s'il existe ICI (« affichage »
  // n'existe que dans Roll20). Il passe par cette enveloppe qui ATTRAPE ses
  // exceptions : un prédicat qui jette emportait sinon TOUT le montage, donc la
  // fiche, sans rien pour rouvrir.
  function moduleAffichable(m) {
    if (typeof m.pour !== "function") return true;
    try { return !!m.pour(); } catch (e) { return false; }
  }

  function monteModules(panes) {
    var colonnes = {};
    elModules = {};
    TABS.forEach(function (t) {
      if (SQUELETTES[t.id] && panes[t.id]) colonnes[t.id] = SQUELETTES[t.id](panes[t.id]);
    });
    ordreModules().forEach(function (m) {
      // Coupé : pas monté. Ce test passe AVANT celui de l'hôte — un module
      // coupé n'affiche rien parce que le joueur l'a voulu, il n'a pas à porter
      // la mention de ceux qui ne trouvent pas leur place.
      if (m.id !== MODULE_REGLAGES && !actif(m.id)) return;
      if (!moduleAffichable(m)) return;
      // Onglet ou colonne inconnus : le module est laissé de côté (un mod mal
      // réglé ne doit pas emporter la fiche), mais il est MARQUÉ — sans ce
      // « vide », il ne s'affiche nulle part ET ne se plaint nulle part.
      // aClef, et pas une simple lecture : une colonne nommée « constructor »
      // rendrait une méthode d'Object en guise d'hôte, et le montage tomberait
      // sur le premier appendChild.
      var cols = colonnes[m.onglet];
      var hote = (cols && aClef(cols, m.colonne)) ? cols[m.colonne] : null;
      if (!hote) { etatModule(m.id).vide = true; return; }
      var reg = regModule(m.id);
      var precedent = hooks;
      var propPrecedent = proprietaireCourant;
      var e;
      hooks = reg;
      // le MOD qui a posé ce module, s'il vient d'un mod : c'est lui l'ayant
      // droit de ce que le build enregistre, pas l'id du bloc
      proprietaireCourant = m.__mod || m.id;
      try {
        e = m.build(contexte(m, reg));
        // build qui rend autre chose qu'un ÉLÉMENT : rien à monter, et rien qui
        // porte un dataset. Le traiter comme muet coûte un bloc ; le poser dans
        // la page coûtait la fiche entière.
        if (e && e.nodeType !== 1) e = null;
        if (e && !e.dataset.module) e.dataset.module = m.id;
        etatModule(m.id).panne = "";
      } catch (err) {
        // build a pu pousser des fonctions avant de tomber : elles pointent sur
        // un bloc à moitié bâti et jetteraient à chaque rafraîchissement
        reg.length = 0;
        e = blocEnPanne(m, err);
      }
      hooks = precedent;
      proprietaireCourant = propPrecedent;
      // un build qui ne rend rien n'est PAS une erreur (un module a le droit de
      // s'effacer), mais la liste doit pouvoir le signaler
      etatModule(m.id).vide = !e;
      if (!e) return;
      // L'INSERTION AUSSI PEUT JETER, et c'était la dernière porte par laquelle
      // un mod fermait la fiche : un build qui rend document.body fait lever
      // appendChild, l'exception sortait de mount(), et comme le mod voyage
      // avec le personnage cela recommençait à CHAQUE ouverture, sans une ligne
      // d'interface pour couper le fautif.
      try {
        hote.appendChild(e);
        elModules[m.id] = e;
      } catch (err2) {
        reg.length = 0;
        var carte = blocEnPanne(m, err2);
        elModules[m.id] = carte;
        hote.appendChild(carte);   // la carte de panne, elle, s'insère forcément
      }
    });
  }

  // ---------- isolation des pannes ----------
  function blocEnPanne(m, err) {
    var msg = messageErreur(err);
    etatModule(m.id).panne = msg;
    if (window.console && window.console.error) window.console.error("[mod:" + m.id + "]", err);
    var b = el("div", "pc-block");
    b.dataset.module = m.id;
    b.dataset.panne = "1";
    var t = el("div", "pc-block-title", m.titre || m.id);
    // c'est l'ID, pas le titre, qui sert à retrouver le mod dans la liste et
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
    // couper retirerait le seul endroit d'où l'on rallume un module.
    if (m.id !== MODULE_REGLAGES)
      line.appendChild(miniBtn("Désactiver",
        "Retirer ce module de la fiche : rien n'est perdu, il ne s'affiche plus.", function () {
          // même garde qu'activeModule : une panne peut survenir sur un état
          // remplacé à la main, jamais repassé par normalize()
          if (!state.modActifs) state.modActifs = {};
          state.modActifs[m.id] = false;
          save();
          remount();
        }, "danger"));
    tools.appendChild(line);
    b.appendChild(tools);
    return b;
  }
  // Muselé : le module GARDE son bloc (ses valeurs sont celles du dernier
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
  // C'est TOUT ce qu'un module touche, natif comme mod. Les natifs ne s'en
  // servent pas (ils appellent les fonctions directement) mais ils le
  // REÇOIVENT : un mod qui reprend l'id de l'un d'eux dispose exactement du
  // même.
  //
  // Les libellés officiels des données du personnage : un mod nomme les choses
  // comme le reste de la fiche au lieu d'inventer son vocabulaire.
  var LIBELLES = {
    nom: "Nom", espece: "Espèce", age: "Âge", sexe: "Sexe", genre: "Genre",
    pv: "Points de vie", pe: "Points d'endurance", pm: "Points de mana",
    pi: "Points d'innocence", pr: "Points de repos", ps: "Points de satiété",
    ph: "Points d'hydratation", expo: "Exposition", effondrement: "Effondrement",
    charge: "Charge", acces: "Accès rapides", contenance: "Contenance",
    rupture: "Rupture", desAction: "Dés d'action",
    competence: "Compétence", rang: "Rang", total: "Total", groupe: "Groupe",
    technique: "Technique", arme: "Arme", geste: "Geste", parade: "Parade",
    reduction: "Réduction", degats: "Dégâts", portee: "Portée", seuil: "Seuil",
    vetement: "Vêtement", froid: "Froid", chaud: "Chaud", poids: "Poids",
    quantite: "Quantité", places: "Places", description: "Description",
    argent: "Bourse", xpTotal: "XP total", de: "Dé des jets"
  };
  function contexte(m, reg) {
    var id = m.id;
    // LE PROPRIÉTAIRE EST LE MOD, PAS LE MODULE : un mod enregistre presque
    // toujours un module dont l'id diffère du sien, et attribuer le filtre au
    // module rendrait la purge inopérante puisque c'est le MOD que le joueur
    // refuse ou supprime.
    var prop = m.__mod || id;
    // Ce qu'un module installe DEPUIS un gestionnaire (un clic, longtemps après
    // le montage) doit rester à son nom. Sans cette enveloppe,
    // proprietaireCourant est retombé à « ? » et le filtre posé par le bouton
    // d'un mod refusé survit à son refus.
    function aNous(fn) {
      if (typeof fn !== "function") return fn;
      return function () {
        var avant = proprietaireCourant;
        proprietaireCourant = prop;
        try { return fn.apply(this, arguments); }
        finally { proprietaireCourant = avant; }
      };
    }
    var donnees = {
      // LIRE NE SALIT PAS : on rend un objet DÉTACHÉ plutôt que de ranger un
      // objet vide dans l'état au premier get(). Sinon tout module qui se
      // contente de lire laisse sa trace dans le personnage.
      get: function () {
        var d = state.modData && state.modData[id];
        return (d && typeof d === "object") ? d : {};
      },
      // La validation est IMMÉDIATE et l'erreur remonte AU MODULE : un objet
      // circulaire doit casser le module qui l'écrit, jamais la sauvegarde de
      // la fiche entière.
      set: function (o) {
        if (o === null || o === undefined) o = {};
        if (typeof o !== "object") throw new TypeError("ctx.donnees.set attend un objet.");
        JSON.stringify(o);
        if (!state.modData) state.modData = {};
        state.modData[id] = o;
      }
    };
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
      id: id,
      // Le numéro tel qu'il est, suffixe de beta compris : qui veut le lire
      // passe par OwdMods.lireVersion, seul endroit qui sache ce que vaut ce
      // suffixe. Le découper à la main rendrait « 0b » sur le dernier nombre.
      version: RELEASE,
      state: state,
      data: DATA,
      donnees: donnees,
      bloc: function (titre, opts) {
        return block(titre, null, (opts && opts.edition) ? id : null);
      },
      el: el,
      fld: function (libelle, champ) { return fld(libelle, champ); },
      surRafraichissement: function (fn) { if (typeof fn === "function") reg.push(fn); },
      rafraichir: refresh,
      enregistrer: save,
      reconstruire: remount,
      edition: function () { return isEdit(id); },
      // briques : tout ce qui prend un GESTE du joueur passe par aNous()
      texte: function (lire, ecrire, indication) { return textInput(lire, aNous(ecrire), indication, reg); },
      bouton: function (libelle, infobulle, action) { return miniBtn(libelle, infobulle, aNous(action)); },
      pas: function (lire, ecrire, pas) { return stepper(lire, aNous(ecrire), pas || 1, null, reg); },
      tuile: function (libelle, valeur, action) { return bigTile(libelle, valeur, aNous(action), reg); },
      ligneComp: function (idComp) {
        var c = compDe(idComp);
        return c ? compRow(c, false, { module: id, reg: reg }) : el("div", "pc-empty", "Compétence inconnue.");
      },
      filtre: puce,
      dialogue: function (titre, corps, valider) { return dialogue(titre, corps, aNous(valider)); },
      message: flash,
      // sorties (le destinataire reste celui que le joueur a fixé)
      jet: function (libelle, valeur, des) { doRoll(libelle, valeur, deDe(des || 1), true, des || 1); },
      auTchat: function (titre, champs) { sayChat(titre, champs); },
      boutonTchat: function (libelle, titre, champs) {
        return miniBtn(libelle, "Envoyer dans le tchat Roll20", function () {
          sayChat(titre, typeof champs === "function" ? champs() : champs);
        });
      },
      // calculs : tous dérivés, donc en lecture seule
      calculs: {
        caracTotal: caracTotal, compBonus: compBonus, compDes: compDes, compXp: compXp,
        pvMax: pvMax, peMax: peMax, pmMax: pmMax, piMax: piMax,
        prMax: prMax, psMax: psMax, phMax: phMax,
        charge: charge, accesRapides: accesRapides, contenance: contenance,
        expoMax: expoMax, effondrement: effondrement,
        poidsPorte: poidsPorte, desAction: desAction, ruptureMax: ruptureMax,
        xpDepense: xpDepense, courant: courant, maxDe: maxDe
      },
      // …et de quoi les CHANGER. Le propriétaire est figé ici, à la
      // construction du contexte, et c'est celui du MOD : un module qui pose
      // son filtre depuis un bouton, longtemps après son build, reste chez lui.
      filtreCalcul: function (nom, fn) { ajouteFiltre(nom, fn, prop); },
      fmt: { signe: sign, nombre: fmtP },
      champs: LIBELLES,
      abbr: function (carac) { return abbrCarac(carac); }
    };
  }
  // ================= ONGLET FICHE =================

  // ---- les leviers d'une valeur : forçage et modificateurs ----
  // Vide = valeur CALCULÉE (le placeholder la montre en filigrane), une valeur
  // la FORCE. C'est le contrat de tous les champs « Forcé » de la fiche.
  function champForceMax(cle, auto, titre, reg) {
    var inp = el("input", "force");
    inp.type = "number"; inp.step = "any";
    inp.title = titre || "Vide = maximum calculé (modificateurs compris) ; une valeur le force.";
    inp.addEventListener("input", function () {
      var v = parseFloat(String(inp.value).replace(",", "."));
      if (isFinite(v)) state.maxForce[cle] = clamp(Math.round(v * 100) / 100, -99999, 99999);
      else delete state.maxForce[cle];   // le vide EFFACE : absent = calculé
      refresh();
    });
    (reg || hooks).push(function () {
      inp.placeholder = fmtP(auto());
      if (document.activeElement !== inp)
        inp.value = state.maxForce[cle] === undefined ? "" : state.maxForce[cle];
    });
    return inp;
  }
  // La ligne « Forcé + Modificateurs » sous une jauge, en mode édition.
  function ligneLeviers(cle, auto, titre) {
    var row = el("div", "pc-pvmax pc-mods-host pc-edit-only");
    row.appendChild(el("span", "lbl", "Forcé"));
    row.appendChild(champForceMax(cle, auto, titre));
    row.appendChild(el("span", "lbl", "Modificateurs"));
    row.appendChild(multiMod(state.divers, cle));
    row.appendChild(el("span", "sp"));
    return row;
  }
  // La même chose en version TUILE : le libellé au-dessus du contrôle, une
  // tuile étant trop étroite pour « Modificateurs » et trois cases côte à côte.
  function tuileForce(tile, cle, auto, titre) {
    var row = el("div", "pc-bigedit pc-edit-only");
    row.appendChild(el("span", "lbl", "Forcé"));
    row.appendChild(champForceMax(cle, auto, titre));
    tile.appendChild(row);
  }
  function tuileMods(tile, cle) {
    var row = el("div", "pc-bigedit pc-edit-only");
    row.appendChild(el("span", "lbl", "Modificateurs"));
    row.appendChild(multiMod(state.divers, cle));
    tile.appendChild(row);
  }

  // ---- UNE JAUGE ----
  // PV, PE, PM, PI, PR, PS, PH : sept fois le même geste, une seule fonction.
  //   - le pas −/champ/+ est un geste de JEU : toujours actif, jamais sous le
  //     rouage ;
  //   - « / max » porte l'accent quand le maximum est forcé ou modifié, et son
  //     infobulle dit D'OÙ il vient (la formule du livre, décomposée) ;
  //   - « Max » remet la valeur à null, c'est-à-dire « au maximum » : elle SUIT
  //     alors le maximum quand il bouge, et celui de PV et PE bouge à chaque
  //     niveau d'effondrement ;
  //   - le rouage ne déverrouille que le maximum forcé et ses modificateurs.
  //
  // Le nombre affiché est le nombre RÉEL, jamais borné : borner l'affichage
  // mentirait sur ce que porte le personnage, et les points de mana, dont le
  // maximum vaut zéro, seraient purement inutilisables. C'est l'ACCENT et
  // l'avertissement de l'en-tête qui disent le dépassement.
  function jauge(bloc, cle, opts) {
    opts = opts || {};
    var pas = opts.pas || 1;
    var row = el("div", "pc-kv");
    var k = el("span", "k", abbrCap(cle, cle.toUpperCase()));
    k.title = libCap(cle, cle);
    row.appendChild(k);
    row.appendChild(stepper(
      function () { return courant(cle); },
      function (v) { state.etat[cle] = Math.round(v * 100) / 100; },
      pas, libCap(cle, cle)));
    var max = el("span", "max", "");
    row.appendChild(max);
    row.appendChild(el("span", "sp"));
    row.appendChild(miniBtn("Max", "Revenir au maximum", function () {
      state.etat[cle] = null;
      refresh();
    }));
    bloc.appendChild(row);
    bloc.appendChild(ligneLeviers(cle, function () { return autoDe(cle); }, opts.titreForce));
    if (opts.note) bloc.appendChild(note(opts.note));
    hooks.push(function () {
      var m = maxDe(cle);
      var d = modSum(state.divers[cle]);
      var forcee = capForce(cle);
      var depasse = courant(cle) > m;
      max.textContent = "/ " + fmtP(m);
      max.classList.toggle("adj", forcee || d !== 0 || depasse);
      var t;
      if (forcee) t = "Maximum forcé à " + fmtP(state.maxForce[cle]) + " (calculé : " + fmtP(autoDe(cle)) + ")";
      else t = opts.provenance ? opts.provenance() : "Maximum calculé";
      if (d) t += " · modificateurs " + sign(d);
      if (depasse) t += " — la valeur courante dépasse ce maximum : elle est gardée telle quelle.";
      max.title = t;
    });
    return row;
  }
  // D'où vient un maximum, décomposé pour l'infobulle. La formule VERBATIM du
  // livre est dans les données ; on la cite, on ne la réécrit pas, et on ajoute
  // ce que la caractéristique du personnage y met aujourd'hui.
  function provenanceCap(cle) {
    return function () {
      var d = capDef(cle);
      if (!d) return "Aucune donnée pour cette capacité.";
      if (!d.formule) return "Aucune formule ne donne cette valeur.";
      var t = d.formule;
      if (d.carac) t += " — " + libCarac(d.carac) + " " + fmtP(caracTotal(d.carac));
      return t;
    };
  }

  // ---- 1. Caractéristiques ----
  function buildCaracs() {
    var b = block("Caractéristiques", null, "caracs");
    caracsOrdre().forEach(function (name) {
      var row = el("div", "pc-crow");
      var top = el("div", "pc-crow-top");
      var chip = el("span", "pc-abbr", abbrCarac(name));
      chip.title = libCarac(name);
      top.appendChild(chip);
      top.appendChild(el("span", "nm", libCarac(name)));
      // LA VALEUR N'EST PAS CLIQUABLE, et ce n'est pas un oubli : dans Outward
      // une caractéristique n'ouvre pas un jet. Elle ouvre l'usage d'une arme
      // et fixe ses dégâts ; le jet, lui, est fait de dés d'action et du bonus
      // de rang, seuls. D'où l'absence de pc-rollable.
      var val = el("span", "pc-cval", "");
      top.appendChild(val);
      row.appendChild(top);

      var bot = el("div", "pc-crow-bot pc-edit-only");
      bot.appendChild(el("span", "lbl", "Valeur"));
      bot.appendChild(stepper(
        function () { return caracVal(name); },
        function (v) { state.caracs[name] = clamp(Math.round(v), -9999, 9999); },
        1, libCarac(name)));
      row.appendChild(bot);

      hooks.push(function () {
        var d = caracMods(name);
        var forcee = state.caracsForce[name] !== undefined;
        val.textContent = String(caracTotal(name));
        val.classList.toggle("adj", d !== 0 || forcee);
        // Un total forcé REMPLACE la somme au lieu de s'y ajouter : l'afficher
        // quand même la ferait mentir.
        val.title = forcee
          ? "Total forcé (Options) : " + fmtP(state.caracsForce[name]) +
            " — calculé : " + fmtP(caracAuto(name))
          : "Valeur " + fmtP(caracVal(name)) +
            (d ? " · modificateurs " + sign(d) : "") +
            " = " + fmtP(caracTotal(name));
      });
      b.appendChild(row);
    });
    // La carte des huit totaux, d'un clic : ce que le MJ demande le plus.
    var pied = el("div", "pc-comp-tools");
    var ligne = el("div", "row");
    ligne.appendChild(chatBtn(
      function () { return "Caractéristiques — " + (state.name || "sans nom"); },
      function () {
        return caracsOrdre().map(function (c) { return [libCarac(c), String(caracTotal(c))]; });
      }));
    pied.appendChild(ligne);
    b.appendChild(pied);
    return b;
  }

  // ---- 2. Corps : charge, accès rapides, contenance, innocence ----
  function buildCorps() {
    var b = block("Corps", null, "corps");

    var r1 = el("div", "pc-bigrow");
    function tuileLimite(cle, libelle, pris, total) {
      var t = bigTile(libelle, function () {
        return fmtP(pris()) + " / " + fmtP(total());
      });
      t.classList.add("pc-mods-host");
      tuileForce(t, cle, function () { return autoDe(cle); });
      tuileMods(t, cle);
      hooks.push(function () {
        var over = pris() > total();
        t.classList.toggle("adj", over || capForce(cle) || modSum(state.divers[cle]) !== 0);
        t.title = libCap(cle, libelle) + " : " + fmtP(pris()) + " sur " + fmtP(total()) +
                  (over ? " — dépassé" : "") +
                  (capForce(cle) ? " · maximum forcé (calculé : " + fmtP(autoDe(cle)) + ")"
                                 : " · " + provenanceCap(cle)());
      });
      return t;
    }
    r1.appendChild(tuileLimite("charge", "CHARGE", poidsPorte, charge));
    r1.appendChild(tuileLimite("acces", "ACCÈS RAPIDES", accesPris, accesRapides));
    // La contenance, elle, porte SON pas : ce qu'on a avalé se compte en jeu,
    // et le geste doit rester actif hors du rouage.
    var tC = tuileLimite("contenance", "CONTENANCE", contenancePrise, contenance);
    var pasC = el("div", "pc-bigedit");
    pasC.appendChild(stepper(
      function () { return state.etat.contenance; },
      function (v) { state.etat.contenance = Math.max(0, Math.round(v * 100) / 100); },
      1, "contenance occupée"));
    tC.appendChild(pasC);
    r1.appendChild(tC);
    b.appendChild(r1);

    // Deuxième rangée : ce que le corps donne au tour, et l'innocence.
    var r2 = el("div", "pc-bigrow pc-bigrow-2");
    var tD = bigTile("DÉS D'ACTION", function () { return fmtP(desAction()); });
    tD.classList.add("pc-mods-host");
    tuileForce(tD, "desAction", desActionAuto);
    tuileMods(tD, "desAction");
    hooks.push(function () {
      tD.classList.toggle("adj", capForce("desAction") || modSum(state.divers.desAction) !== 0);
      tD.title = "Dés d'action reçus par tour" +
                 (capForce("desAction") ? " — forcé (calculé : " + fmtP(desActionAuto()) + ")" : "");
    });
    r2.appendChild(tD);

    var tPI = bigTile(abbrCap("pi", "PI"), function () {
      return fmtP(courant("pi")) + " / " + fmtP(piMax());
    });
    tPI.classList.add("pc-mods-host");
    var pasPI = el("div", "pc-bigedit");
    pasPI.appendChild(stepper(
      function () { return courant("pi"); },
      function (v) { state.etat.pi = Math.round(v * 100) / 100; },
      1, libCap("pi", "PI")));
    tPI.appendChild(pasPI);
    tuileForce(tPI, "pi", piMaxAuto);
    tuileMods(tPI, "pi");
    hooks.push(function () {
      tPI.classList.toggle("adj", capForce("pi") || modSum(state.divers.pi) !== 0);
      tPI.title = libCap("pi", "Points d'innocence") + " — " +
                  (capForce("pi") ? "maximum forcé (calculé : " + fmtP(piMaxAuto()) + ")"
                                  : provenanceCap("pi")());
    });
    r2.appendChild(tPI);
    b.appendChild(r2);
    return b;
  }

  // ---- 3. Rupture ----
  function buildRupture() {
    var b = block("Rupture", null, "rupture");
    var row = el("div", "pc-kv");
    row.appendChild(stepper(
      function () { return state.etat.rupture === null ? ruptureRestante() : state.etat.rupture; },
      function (v) { state.etat.rupture = Math.round(v); },
      1, "points de rupture"));
    var max = el("span", "max", "");
    row.appendChild(max);
    row.appendChild(el("span", "sp"));
    // « Max » remet à null : la valeur suit alors ce que les rangs et les
    // techniques laissent, sans qu'on ait à la recalculer de tête.
    row.appendChild(miniBtn("Max", "Revenir à ce que les rangs et les techniques laissent", function () {
      state.etat.rupture = null;
      refresh();
    }));
    b.appendChild(row);
    var n = note("");
    b.appendChild(n);
    b.appendChild(ligneLeviers("rupture", ruptureMaxAuto,
      "Vide = nombre de points calculé (celui du livre, modificateurs compris) ; une valeur le force."));
    hooks.push(function () {
      var d = modSum(state.divers.rupture);
      max.textContent = "/ " + fmtP(ruptureMax());
      max.classList.toggle("adj", capForce("rupture") || d !== 0);
      max.title = capForce("rupture")
        ? "Nombre forcé à " + fmtP(state.maxForce.rupture) + " (calculé : " + fmtP(ruptureMaxAuto()) + ")"
        : "Points de rupture du personnage" + (d ? " · modificateurs " + sign(d) : "");
      n.textContent = "Engagés : " + fmtP(ruptureComps()) + " par les rangs de compétence, " +
                      fmtP(ruptureTechs()) + " par les techniques.";
    });
    return b;
  }

  // ---- 4. Vitalité : PV, PE, PM ----
  function buildVitales() {
    var b = block("Vitalité", null, "vitales");
    jauge(b, "pv", { pas: 1, provenance: function () {
      var t = provenanceCap("pv")();
      var e = effondrement();
      // l'effondrement descend le maximum : le dire ici, ou le chiffre paraît
      // faux au joueur qui vérifie la formule de tête
      if (e > 0) t += " · effondrement " + e + " (−" + (num(effDef().pvParNiveau, 0) * e) + " %)";
      return t;
    } });
    jauge(b, "pe", { pas: 1, provenance: function () {
      var t = provenanceCap("pe")();
      var e = effondrement();
      if (e > 0) t += " · effondrement " + e + " (−" + (num(effDef().peParNiveau, 0) * e) + " %)";
      return t;
    } });
    // LES POINTS DE MANA. Aucune règle publiée ne donne leur maximum : il vaut
    // donc ZÉRO, et cela doit SE VOIR plutôt que se deviner. La donnée le dit
    // (formule nulle), la ligne affiche « / 0 », l'infobulle et la note le
    // redisent en clair, et le champ « Forcé » du rouage permet d'en poser un
    // en attendant. Le jour où une règle le donnera, ce sera UNE LIGNE de
    // owd-creation.json, pas une ligne de JavaScript.
    jauge(b, "pm", {
      pas: 1,
      titreForce: "Aucune formule ne donne le maximum de points de mana : ce champ permet d'en poser un.",
      provenance: function () {
        return "Aucune formule ne donne le maximum de points de mana : il vaut 0 tant qu'une " +
               "règle ne le fixe pas. Le champ Forcé (rouage) permet d'en poser un.";
      },
      note: "Le maximum de points de mana vaut 0 : aucune règle publiée ne le donne. " +
            "Les points saisis restent comptés, et le rouage permet de forcer un maximum."
    });
    var pied = el("div", "pc-comp-tools");
    var ligne = el("div", "row");
    ligne.appendChild(chatBtn(
      function () { return "État — " + (state.name || "sans nom"); },
      function () { return champsEtat(); }));
    pied.appendChild(ligne);
    b.appendChild(pied);
    return b;
  }
  // Les champs de la carte « État » : les sept jauges en courant / maximum, et
  // le niveau d'effondrement. Deux blocs l'envoient, une seule composition.
  function champsEtat() {
    var out = [];
    ["pv", "pe", "pm", "pi", "pr", "ps", "ph"].forEach(function (cle) {
      out.push([abbrCap(cle, cle.toUpperCase()), fmtP(courant(cle)) + " / " + fmtP(maxDe(cle))]);
    });
    out.push(["Exposition", fmtP(state.etat.expo) + " / " + fmtP(expoMax())]);
    out.push(["Effondrement", String(effondrement())]);
    return out;
  }

  // ---- 5. Survie : PR, PS, PH ----
  function buildSurvie() {
    var b = block("Survie", null, "survie");
    // Les nombres sont grands (des centaines, des milliers) : le pas vaut dix,
    // et le champ du milieu reste saisissable au point près pour le reste.
    ["pr", "ps", "ph"].forEach(function (cle) {
      jauge(b, cle, { pas: 10, provenance: provenanceCap(cle) });
    });
    var pied = el("div", "pc-comp-tools");
    var ligne = el("div", "row");
    ligne.appendChild(chatBtn(
      function () { return "Survie — " + (state.name || "sans nom"); },
      function () {
        return [
          [abbrCap("pr", "PR"), fmtP(courant("pr")) + " / " + fmtP(prMax())],
          [abbrCap("ps", "PS"), fmtP(courant("ps")) + " / " + fmtP(psMax())],
          [abbrCap("ph", "PH"), fmtP(courant("ph")) + " / " + fmtP(phMax())],
          ["Effondrement", String(effondrement())]
        ];
      }));
    pied.appendChild(ligne);
    b.appendChild(pied);
    return b;
  }

  // ---- 6. Exposition ----
  // UNE jauge SIGNÉE : de −(borne) à +(borne), zéro au milieu. Aucune table du
  // froid ni du chaud n'est affichée — la fiche compte les degrés, elle ne dit
  // pas ce qu'il en coûte.
  function buildExposition() {
    var b = block("Exposition", null, "exposition");
    var row = el("div", "pc-kv");
    var k = el("span", "k", abbrCap("expo", "EXP"));
    k.title = libCap("expo", "Exposition");
    row.appendChild(k);
    row.appendChild(stepper(
      function () { return state.etat.expo; },
      function (v) { state.etat.expo = Math.round(v * 100) / 100; },
      5, "exposition"));
    var max = el("span", "max", "");
    row.appendChild(max);
    row.appendChild(el("span", "sp"));
    row.appendChild(miniBtn("Zéro", "Revenir à une exposition nulle", function () {
      state.etat.expo = 0;
      refresh();
    }));
    b.appendChild(row);

    // La barre BIDIRECTIONNELLE : un remplissage qui part du milieu vers le
    // froid ou vers le chaud, l'axe du zéro par-dessus, le curseur au-dessus de
    // tout. Grammaire pc-, classe neuve — JJK n'a rien de signé à montrer.
    //
    // LES TROIS NOMS SONT CEUX DE LA FEUILLE, et l'ORDRE compte. « fill » et
    // « cur » sont attendus en ENFANTS DIRECTS de .pc-expobar : glisser le
    // remplissage DANS l'axe le noierait dans un trait d'un pixel, et le
    // rebaptiser « curseur » lui retirerait sa position absolue — dans les deux
    // cas la jauge paraît vide, sans la moindre erreur à lire. Les trois se
    // suivent dans l'ordre de peinture : le trait du zéro reste lisible sur le
    // remplissage, et le curseur sur les deux.
    var barre = el("div", "pc-expobar");
    var rempli = el("i", "fill");
    barre.appendChild(rempli);
    var axe = el("span", "axe");
    barre.appendChild(axe);
    var curseur = el("span", "cur");
    barre.appendChild(curseur);
    b.appendChild(barre);

    // Les deux bouts, aux couleurs de la jauge (.pc-expo-ends, déjà dessiné par
    // la feuille). Une barre SIGNÉE ne dit pas d'elle-même de quel côté elle
    // penche : sans ces deux mots, il faut deviner que la gauche est le froid,
    // et un curseur posé à gauche se lit à l'envers. Deux mots, et AUCUNE
    // règle — la fiche nomme le sens, elle ne dit pas ce que le froid coûte.
    var bouts = el("div", "pc-expo-ends");
    bouts.appendChild(el("span", "f", "Froid"));
    bouts.appendChild(el("span", "c", "Chaud"));
    b.appendChild(bouts);

    b.appendChild(ligneLeviers("expo", expoMaxAuto,
      "Vide = borne calculée ; une valeur la force. La borne basse est l'opposée de la haute."));

    var pied = el("div", "pc-comp-tools");
    var ligne = el("div", "row");
    ligne.appendChild(chatBtn(
      function () { return "Exposition — " + fmtP(state.etat.expo) + " / " + fmtP(expoMax()); },
      function () {
        return [["Niveau apporté", String(effNiveauDe("expo"))],
                ["Effondrement", String(effondrement())]];
      }));
    pied.appendChild(ligne);
    b.appendChild(pied);

    hooks.push(function () {
      var m = expoMax();
      var v = state.etat.expo;
      var d = modSum(state.divers.expo);
      max.textContent = "± " + fmtP(m);
      max.classList.toggle("adj", capForce("expo") || d !== 0 || Math.abs(v) > m);
      max.title = (capForce("expo")
        ? "Bornes forcées à ± " + fmtP(m) + " (calculées : ± " + fmtP(expoMaxAuto()) + ")"
        : provenanceCap("expo")()) +
        (d ? " · modificateurs " + sign(d) : "") +
        " — niveau d'effondrement apporté : " + effNiveauDe("expo");
      // Remplissage à partir du milieu, dans le sens du signe. Le POINT
      // D'ANCRAGE vient de la feuille et non d'ici : .fill.froid est accroché
      // par right:50 %, .fill.chaud par left:50 %. Poser un `left` en JS
      // écraserait l'ancrage du froid et ferait pousser la barre du mauvais
      // côté ; seule la LARGEUR se calcule, en pour-cent de la demi-barre.
      var part = m > 0 ? clamp(Math.abs(v) / m, 0, 1) * 50 : 0;
      rempli.classList.toggle("froid", v < 0);
      rempli.classList.toggle("chaud", v > 0);
      rempli.style.width = part + "%";
      // Le curseur est un TRAIT de deux pixels, pas une étiquette : la barre
      // est haute d'un demi-cadratin et coupe ce qui déborde, si bien qu'un
      // nombre écrit ici serait rogné. La valeur se lit au pas juste au-dessus,
      // et le maximum à côté ; le curseur ne porte que la position.
      curseur.style.left = clamp(50 + (m > 0 ? (v / m) * 50 : 0), 0, 100) + "%";
      curseur.title = "Exposition " + fmtP(v) + " sur ± " + fmtP(m);
    });
    return b;
  }

  // ---- 7. Effondrement ----
  // Le calcul que la fiche rend le mieux : quatre réserves qui s'usent, un
  // niveau par tranche perdue, et deux maximums qui descendent. La TABLE des
  // dix lignes du livre n'apparaît nulle part : c'est l'infobulle qui
  // décompose, et le DOM ne montre que l'état du personnage.
  function buildEffondrement() {
    var b = block("Effondrement", null, "effondrement");
    var r = el("div", "pc-bigrow pc-bigrow-2");
    var tN = bigTile("EFFONDREMENT", function () { return String(effondrement()); });
    tN.classList.add("pc-mods-host");
    tuileForce(tN, "effondrement", effondrementAuto,
      "Vide = niveau calculé sur les réserves ; une valeur le force.");
    tuileMods(tN, "effondrement");
    r.appendChild(tN);
    var tM = bigTile("MAXIMUMS", function () {
      var pe = num(effDef().peParNiveau, 0) * effondrement();
      var pv = num(effDef().pvParNiveau, 0) * effondrement();
      return (100 - clamp(pe, 0, 100)) + " % / " + (100 - clamp(pv, 0, 100)) + " %";
    });
    tM.title = "Ce qu'il reste du maximum de points d'endurance et de points de vie.";
    r.appendChild(tM);
    b.appendChild(r);

    // Une ligne par réserve contributrice, dans l'ordre que les règles donnent.
    var outils = el("div", "pc-comp-tools");
    var lignes = {};
    effReserves().forEach(function (cle) {
      var row = el("div", "row");
      var nom = el("span", "pc-comp-name");
      nom.appendChild(el("span", "pc-comp-label", libCap(cle, cle)));
      row.appendChild(nom);
      var tot = el("span", "pc-comp-total", "");
      row.appendChild(tot);
      lignes[cle] = tot;
      outils.appendChild(row);
    });
    b.appendChild(outils);

    var pied = el("div", "pc-comp-tools");
    var lg = el("div", "row");
    lg.appendChild(chatBtn(
      function () { return "Effondrement — niveau " + effondrement(); },
      function () {
        var out = effReserves().map(function (cle) {
          return [libCap(cle, cle), String(effNiveauDe(cle))];
        });
        var pe = num(effDef().peParNiveau, 0) * effondrement();
        var pv = num(effDef().pvParNiveau, 0) * effondrement();
        out.push(["Maximums", "PE " + (100 - clamp(pe, 0, 100)) + " % · PV " + (100 - clamp(pv, 0, 100)) + " %"]);
        return out;
      }));
    pied.appendChild(lg);
    b.appendChild(pied);

    hooks.push(function () {
      var parts = [], somme = 0;
      effReserves().forEach(function (cle) {
        var n = effNiveauDe(cle);
        somme += n;
        parts.push(libCap(cle, cle).toLowerCase() + " " + n);
        if (lignes[cle]) {
          lignes[cle].textContent = String(n);
          lignes[cle].classList.toggle("zero", !n);
        }
      });
      var d = modSum(state.divers.effondrement);
      if (d) { parts.push("modificateurs " + sign(d)); somme += d; }
      tN.classList.toggle("adj", effondrement() > 0);
      tN.title = capForce("effondrement")
        ? "Niveau forcé à " + fmtP(state.maxForce.effondrement) + " (calculé : " + effondrementAuto() + ")"
        : parts.join(" · ") + " = " + fmtP(somme) +
          (somme > effPlafond() ? ", plafonné à " + effPlafond() : "");
    });
    return b;
  }

  // ---- 8. Compétences ----
  // LES RÈGLES NE DONNENT AUCUNE LISTE DE COMPÉTENCES : le joueur nomme les
  // siennes, et la fiche n'en propose pas — une liste d'exemples passerait pour
  // une règle du livre alors qu'elle n'y est pas. D'où un tableau d'entrées à
  // id stable, un champ « groupe » libre pour que chacun range comme il veut,
  // et un bloc qui montre TOUT d'un coup, sans repli ni troncature.
  function xpJusque(r) {
    var t = 0, tab = rangs(), i;
    for (i = 1; i <= r && i < tab.length; i++) t += num(tab[i].xp, 0);
    return t;
  }
  function ruptureJusque(r) {
    var t = 0, tab = rangs(), i;
    for (i = 1; i <= r && i < tab.length; i++) t += num(tab[i].rupture, 0);
    return t;
  }
  // La ligne d'une compétence. opts : { module, reg, onDrop } — le module dont
  // le rouage déverrouille la barre de rangs, le registre où la ligne
  // s'inscrit (celui du module qui la reconstruit, sinon ses hooks fuiraient),
  // et le rappel de reconstruction.
  function compRow(item, odd, opts) {
    opts = opts || {};
    var mod = opts.module || "comps";
    var reg = opts.reg || compHooks;
    var row = el("div", "pc-comp-row" + (odd ? " odd" : ""));
    row.dataset.id = item.id;

    var nameBox = el("span", "pc-comp-name");
    var label = el("span", "pc-comp-label", item.nom || "Sans nom");
    nameBox.appendChild(label);
    // RENOMMAGE EN PLACE, au double-clic, en édition seulement. Jamais
    // prompt() : muet dans l'iframe Roll20 sous Chrome. Le renommage ne touche
    // PAS l'id — rang, modificateurs, forçages et les armes qui pointent dessus
    // survivent tous.
    label.addEventListener("dblclick", function () {
      if (!isEdit(mod)) return;
      var inp = el("input", "nmedit");
      inp.type = "text";
      inp.value = item.nom;
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); inp.blur(); }
        else if (e.key === "Escape") { inp.value = item.nom; inp.blur(); }
      });
      inp.addEventListener("blur", function () {
        var v = capFirst(inp.value.trim());
        if (v) item.nom = v;
        if (inp.parentNode) inp.parentNode.replaceChild(label, inp);
        refresh();
        if (opts.onDrop) opts.onDrop();
        if (optCompsRebuild) optCompsRebuild();
      });
      nameBox.replaceChild(inp, label);
      setTimeout(function () { inp.focus(); inp.select(); }, 0);
    });
    var del = el("button", "pc-comp-del pc-edit-only", "✕");
    del.type = "button";
    del.title = "Retirer cette compétence";
    del.addEventListener("click", function () {
      // LISTER ce qui sera perdu : la ligne ne montre ni les modificateurs, ni
      // le point de rupture d'un Rang Max, ni les armes qui s'en servent.
      var perdu = [];
      if (compRang(item) > 0) perdu.push(fmtP(compXp(item)) + " XP investis");
      if (compRupture(item) > 0) perdu.push(fmtP(compRupture(item)) + " point de rupture");
      if (compMods(item) !== 0) perdu.push("des modificateurs (Options)");
      if (state.compsForce[item.id] !== undefined || state.compsDesForce[item.id] !== undefined)
        perdu.push("des valeurs forcées (Options)");
      var armes = state.armes.filter(function (a) { return a.comp === item.id; });
      if (armes.length) perdu.push("le lien de " + armes.length + (armes.length > 1 ? " armes" : " arme"));
      function retire() {
        state.comps = state.comps.filter(function (c) { return c.id !== item.id; });
        ["compsMod", "compsMod2", "compsForce", "compsDesForce"].forEach(function (k) {
          delete state[k][item.id];
        });
        state.armes.forEach(function (a) { if (a.comp === item.id) a.comp = ""; });
        refresh();
        if (opts.onDrop) opts.onDrop();
        rebuildComps();
        if (optCompsRebuild) optCompsRebuild();
      }
      if (!perdu.length) { retire(); return; }
      confirmer("Retirer une compétence",
                "Supprimer « " + (item.nom || "sans nom") + " » effacera aussi " + perdu.join(", ") + ".",
                "Supprimer", retire);
    });
    nameBox.appendChild(del);
    row.appendChild(nameBox);

    // LA BARRE DE RANGS : un cran par rang, du non-initié au Rang Max. Le
    // dégradé monte avec le rang ; l'infobulle porte le rang COMPLET (dés,
    // bonus, prix), qui est la seule forme sous laquelle un barème paraît.
    function applyRang(cible) {
      var c = compDe(item.id);
      if (!c || cible === compRang(c)) return;
      var deltaXp = xpJusque(cible) - xpJusque(compRang(c));
      var deltaRup = ruptureJusque(cible) - ruptureJusque(compRang(c));
      if (deltaXp > 0 && xpRestant() < deltaXp) { flash("XP insuffisant."); return; }
      if (deltaRup > 0 && ruptureRestante() < deltaRup) { flash("Aucun point de rupture disponible."); return; }
      // REDESCENDRE REND l'XP et le point de rupture, et DESCENDRE AU RANG 0 NE
      // SUPPRIME PAS L'ENTRÉE : ici l'entrée EST la compétence que le joueur a
      // nommée, la perdre effacerait son travail.
      c.rang = cible;
      refresh();
    }
    var bar = el("span", "pc-stadebar");
    var segs = [];
    rangs().forEach(function (r, i) {
      var sg = el("button", "seg s" + i, rangInitiale(r));
      sg.type = "button";
      sg.title = rangTitre(r);
      sg.addEventListener("click", function () {
        if (!isEdit(mod)) return;   // construction : mode édition requis
        applyRang(i);
      });
      bar.appendChild(sg);
      segs.push(sg);
    });
    row.appendChild(bar);

    // Le total est un BOUTON de jet : c'est le bonus de rang plus les
    // modificateurs, et le clic lance les dés d'action que le rang autorise.
    var total = el("button", "pc-comp-total pc-comp-roll pc-rollable", "");
    total.type = "button";
    total.addEventListener("click", function () {
      var c = compDe(item.id) || item;
      var n = compDes(c);
      doRoll(c.nom || "Compétence", compBonus(c), deDe(n), true, n);
    });
    row.appendChild(total);

    // RÉORDONNANCEMENT par glisser-déposer natif : l'ordre du tableau EST
    // l'ordre d'affichage dans son groupe.
    row.draggable = true;
    row.addEventListener("dragstart", function (e) {
      if (!isEdit(mod)) { e.preventDefault(); return; }
      dragComp = item.id;
      row.classList.add("pris");
      // Firefox refuse de commencer un glissement sans donnée posée
      try { e.dataTransfer.setData("text/plain", item.id); e.dataTransfer.effectAllowed = "move"; }
      catch (err) {}
    });
    row.addEventListener("dragend", function () {
      dragComp = null;
      row.classList.remove("pris");
      row.classList.remove("avant");
    });
    row.addEventListener("dragover", function (e) {
      if (!dragComp || dragComp === item.id) return;
      e.preventDefault();          // sans lui, le navigateur refuse le dépôt
      var r = row.getBoundingClientRect();
      row.classList.toggle("avant", e.clientY < r.top + r.height / 2);
    });
    row.addEventListener("dragleave", function () { row.classList.remove("avant"); });
    row.addEventListener("drop", function (e) {
      if (!dragComp || dragComp === item.id) return;
      e.preventDefault();
      var r = row.getBoundingClientRect();
      var avant = e.clientY < r.top + r.height / 2;   // moitié haute = « avant elle »
      deplaceComp(dragComp, item.id, avant);
      dragComp = null;
      row.classList.remove("avant");
      if (opts.onDrop) opts.onDrop();
      else rebuildComps();
      if (optCompsRebuild) optCompsRebuild();
    });

    reg.push(function () {
      var c = compDe(item.id) || item;
      var rang = compRang(c);
      var d = compMods(c);
      var forcee = state.compsForce[c.id] !== undefined;
      var desForce = state.compsDesForce[c.id] !== undefined;
      segs.forEach(function (sg, i) {
        sg.classList.toggle("on", i <= rang);
        // « cur » MARQUE le rang courant et n'a AUCUNE règle de style : c'est
        // un REPÈRE lisible de l'extérieur, pas une décoration. Un audit l'a
        // retirée en JJK pour cette raison, et quatre sondes sont tombées. Une
        // marque sans peinture reste une marque.
        sg.classList.toggle("cur", i === rang);
      });
      var b = compBonus(c), n = compDes(c);
      total.textContent = sign(b);
      total.classList.toggle("zero", !rang && !d && !forcee);
      total.classList.toggle("adj", d !== 0 || forcee || desForce);
      var info = rangInfo(rang);
      total.title = (forcee
        ? "Bonus forcé à " + sign(state.compsForce[c.id])
        : "Rang " + rang + " (" + (info.nom || "?") + ") " + sign(num(info.bonus, 0)) +
          (d ? " · modificateurs (Options) " + sign(d) : "") +
          " = " + sign(b)) +
        (desForce ? " · dés forcés à " + n : "") +
        " — clic : lancer " + deDe(n) + " " + sign(b);
      label.title = (c.nom || "Sans nom") + " · rang " + rang +
                    (info.nom ? " (" + info.nom + ")" : "") +
                    " · " + (compGroupe(c) || "sans groupe");
    });
    return row;
  }
  var dragComp = null;   // l'id de la compétence qu'on tient
  // Déplacer une compétence devant (ou derrière) une autre. L'ordre du tableau
  // EST l'ordre d'affichage : il n'y a rien d'autre à écrire.
  function deplaceComp(id, cibleId, avant) {
    var from = -1, to = -1, i;
    for (i = 0; i < state.comps.length; i++) {
      if (state.comps[i].id === id) from = i;
      if (state.comps[i].id === cibleId) to = i;
    }
    if (from < 0 || to < 0) return;
    var m = state.comps.splice(from, 1)[0];
    // la cible se recalcule APRÈS le retrait : retirer l'entrée déplacée décale
    // tout ce qui la suivait
    var k = state.comps.indexOf(compDeDans(state.comps, cibleId));
    if (k < 0) state.comps.push(m);
    else state.comps.splice(avant ? k : k + 1, 0, m);
    save();
  }
  function compDeDans(liste, id) {
    var out = null;
    liste.forEach(function (c) { if (c.id === id) out = c; });
    return out;
  }

  var compBox = null;
  var compFilter = "";
  var compOnly = false;      // « Investies » : éteinte par défaut — l'auteur veut TOUT voir
  // L'outil de recherche se coupe depuis l'onglet Options. Coupé, il DISPARAÎT
  // et cesse d'agir : un filtre invisible qui masque encore des lignes est un
  // piège. Réglage d'AFFICHAGE, donc dans le vrai localStorage du navigateur,
  // jamais dans le personnage.
  var FILTRES = { texte: "owd-filtre-texte" };
  function filtreTexteOn() { return lpref(FILTRES.texte, "1") !== "0"; }
  function champFiltre(get, set, placeholder, onChange) {
    if (!filtreTexteOn()) return null;
    var s = el("input", "pc-comp-search");
    s.type = "search";
    s.placeholder = placeholder || "Filtrer…";
    s.value = get();   // le filtre survit au remontage : le champ doit le montrer
    s.addEventListener("input", function () { set(s.value); onChange(); });
    return s;
  }
  function filtreDe(v) { return filtreTexteOn() ? pli(v) : ""; }

  function rebuildComps() {
    if (!compBox) return;
    compHooks = [];   // les lignes vont être détruites : leurs hooks avec
    compBox.innerHTML = "";
    var flt = filtreDe(compFilter);
    var liste = state.comps.filter(function (c) {
      if (compOnly && !compInvestie(c)) return false;
      if (flt && pli(c.nom).indexOf(flt) < 0 && pli(c.groupe).indexOf(flt) < 0) return false;
      return true;
    });
    if (!liste.length) {
      // le message NOMME le filtre coupable : sans cela, le joueur cherche une
      // compétence qu'il a bien saisie et qu'un réglage masque
      compBox.appendChild(el("div", "pc-empty",
        !state.comps.length
          ? (isEdit("comps") ? "Aucune compétence : la ligne du bas en ajoute."
                             : "Aucune compétence. Le rouage en ajoute.")
          : flt ? "Aucune compétence ne correspond à la recherche."
                : "Aucune compétence investie : la puce « Investies » masque les autres."));
    } else {
      // Par GROUPE, dans l'ordre où les groupes apparaissent : c'est le
      // rangement du joueur, la fiche n'en impose aucun et n'en trie aucun.
      var ordre = [], vus = {};
      liste.forEach(function (c) {
        var g = compGroupe(c);
        if (!vus[g]) { vus[g] = 1; ordre.push(g); }
      });
      ordre.forEach(function (g) {
        compBox.appendChild(el("div", "pc-comp-champ", g || "Sans groupe"));
        var head = el("div", "pc-comp-row head");
        head.appendChild(el("span", null, "Compétence"));
        head.appendChild(el("span", null, "Rang"));
        head.appendChild(el("span", null, "Total"));
        compBox.appendChild(head);
        var i = 0;
        liste.forEach(function (c) {
          if (compGroupe(c) !== g) return;
          compBox.appendChild(compRow(c, i % 2 === 1, { module: "comps", reg: compHooks }));
          i++;
        });
      });
    }
    // AJOUT, en édition seulement : un nom, un groupe, et c'est tout.
    if (isEdit("comps")) {
      var add = el("div", "pc-comp-add");
      var nom = el("input");
      nom.type = "text"; nom.placeholder = "Nouvelle compétence…";
      var grp = el("input");
      grp.type = "text"; grp.placeholder = "Groupe (facultatif)";
      add.appendChild(nom);
      add.appendChild(grp);
      // Une EXPRESSION de fonction, pas une déclaration : une déclaration dans
      // un bloc est refusée par le mode strict d'ES5, que le vieux moteur d'une
      // iframe Roll20 peut encore appliquer à la lettre.
      var ajoute = function () {
        var n = capFirst(nom.value.trim());
        if (!n) return;
        // refus d'un doublon, insensible à la casse ET aux accents
        var doublon = false;
        state.comps.forEach(function (c) { if (pli(c.nom) === pli(n)) doublon = true; });
        if (doublon) { flash("« " + n + " » existe déjà."); return; }
        state.comps.push({ id: uid("c"), nom: n, groupe: grp.value.trim(), rang: 0 });
        nom.value = "";
        // ne jamais ajouter une compétence qui resterait invisible
        if (compOnly) compOnly = false;
        if (filtreDe(compFilter)) compFilter = "";
        refresh();
        rebuildComps();
        if (optCompsRebuild) optCompsRebuild();
      };
      nom.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); ajoute(); } });
      add.appendChild(miniBtn("+", "Ajouter cette compétence", ajoute));
      compBox.appendChild(add);
    }
    refresh();
  }
  function buildComps() {
    var b = block("Compétences", null, "comps", function () { rebuildComps(); });
    var tools = el("div", "pc-comp-tools");
    var l1 = el("div", "row");
    var search = champFiltre(function () { return compFilter; },
                             function (v) { compFilter = v; }, "Filtrer les compétences…", rebuildComps);
    if (search) l1.appendChild(search);
    if (l1.children.length) tools.appendChild(l1);
    var l2 = el("div", "row");
    var puce = el("span", "pc-chip", "Investies");
    puce.title = "N'afficher que les compétences où un rang, un modificateur ou un forçage est posé.";
    puce.classList.toggle("on", compOnly);
    puce.addEventListener("click", function () {
      compOnly = !compOnly;
      puce.classList.toggle("on", compOnly);
      rebuildComps();
    });
    l2.appendChild(puce);
    tools.appendChild(l2);
    b.appendChild(tools);
    compBox = el("div");
    b.appendChild(compBox);
    // La carte des compétences investies : une ligne par compétence, avec son
    // rang, ses dés et son bonus.
    var pied = el("div", "pc-comp-tools");
    var lg = el("div", "row");
    lg.appendChild(chatBtn(
      function () { return "Compétences — " + (state.name || "sans nom"); },
      function () {
        return state.comps.filter(compInvestie).map(function (c) {
          var i = rangInfo(compRang(c));
          return [c.nom || "Sans nom",
                  (i.nom || ("rang " + compRang(c))) + " · " + deDe(compDes(c)) + " " + sign(compBonus(c))];
        });
      }));
    pied.appendChild(lg);
    b.appendChild(pied);
    rebuildComps();
    return b;
  }

  // ---- 9. Techniques (pleine largeur, sous les trois colonnes) ----
  // LES RANGS D'UNE TECHNIQUE LUI APPARTIENNENT : les règles le disent, la
  // fiche ne les barème donc pas. Elle compte le nombre de rangs pris, le prix
  // que le joueur a payé et les points de rupture engagés ; ce que chaque rang
  // apporte s'écrit en texte libre.
  function buildTechniques() {
    var b = block("Techniques", null, "techniques", function () { rendre(); });
    var box = el("div");
    b.appendChild(box);

    function carte(t) {
      var card = el("div", "pc-av");
      var head = el("div", "pc-av-head");
      var nm = el("input", "nm pc-edit-field");
      nm.type = "text"; nm.placeholder = "Nom de la technique"; nm.value = t.nom || "";
      nm.addEventListener("input", function () { t.nom = nm.value; save(); });
      head.appendChild(nm);

      // la barre de rangs de CETTE technique : autant de crans qu'elle a de
      // rangs, sans nom ni prix — ils lui appartiennent
      var bar = el("span", "pc-stadebar");
      var segs = [];
      for (var i = 0; i <= t.rangs; i++) (function (i) {
        var sg = el("button", "seg s" + clamp(i, 0, 5), String(i));
        sg.type = "button";
        sg.title = "Rang " + i + " de « " + (t.nom || "cette technique") + " »";
        sg.addEventListener("click", function () {
          if (!isEdit("techniques")) return;
          t.rang = i;
          refresh();
          rendre();
        });
        bar.appendChild(sg);
        segs.push(sg);
      })(i);
      head.appendChild(bar);

      var chip = el("span", "pc-roll-chip", "Jet");
      chip.title = "Lancer les dés d'action de cette technique";
      chip.addEventListener("click", function () {
        var n = desTechnique();
        doRoll(t.nom || "Technique", 0, desQuery(n) + "d" + faces(), true, n);
      });
      head.appendChild(chip);
      head.appendChild(chatBtn(
        function () { return "Technique — " + (t.nom || "sans nom"); },
        function () {
          return [["Rang", t.rang + " / " + t.rangs], ["", t.desc]];
        }));
      head.appendChild(miniBtn("✕", "Retirer cette technique", function () {
        function retire() {
          state.techniques = state.techniques.filter(function (x) { return x.id !== t.id; });
          refresh();
          rendre();
        }
        if (!String(t.nom || "").trim() && !String(t.desc || "").trim() && !t.xp) { retire(); return; }
        confirmer("Retirer une technique",
                  "Retirer « " + (t.nom || "cette technique") + " » ? Son coût en XP et son point de " +
                  "rupture reviendront au personnage.",
                  "Retirer", retire);
      }, "danger pc-edit-only"));
      card.appendChild(head);

      var d = el("textarea", "pc-notes pc-edit-field");
      d.rows = 3;
      d.placeholder = "Ce que chaque rang apporte";
      d.value = t.desc || "";
      d.addEventListener("input", function () { t.desc = d.value; save(); });
      card.appendChild(d);

      var ligne = el("div", "pc-arme-line");
      function nombre(libelle, lire, ecrire, min, max, titre, large) {
        var inp = el("input", "pc-edit-field");
        inp.type = "number"; inp.step = "1";
        if (min !== null) inp.min = String(min);
        inp.value = lire();
        inp.title = titre;
        inp.addEventListener("input", function () {
          var v = parseInt(inp.value, 10);
          ecrire(isFinite(v) ? clamp(v, min, max) : min);
          refresh();
        });
        hooks.push(function () { if (document.activeElement !== inp) inp.value = lire(); });
        return fld(libelle, inp, large ? "w" : null);
      }
      ligne.appendChild(nombre("Rangs", function () { return t.rangs; },
        function (v) { t.rangs = v; if (t.rang > v) t.rang = v; rendre(); }, 1, 20,
        "Combien de rangs cette technique possède — les règles laissent chaque technique en décider."));
      ligne.appendChild(nombre("XP", function () { return t.xp; },
        function (v) { t.xp = v; }, 0, 99999,
        "Ce que cette technique a coûté — aucune règle ne le fixe, c'est la décision de la table."));
      ligne.appendChild(nombre("Rupture", function () { return t.rupture; },
        function (v) { t.rupture = v; }, 0, 99,
        "Combien de points de rupture cette technique a demandés."));
      card.appendChild(ligne);

      hooks.push(function () {
        segs.forEach(function (sg, i) {
          sg.classList.toggle("on", i <= t.rang);
          sg.classList.toggle("cur", i === t.rang);
        });
      });
      return card;
    }

    function rendre() {
      box.innerHTML = "";
      state.techniques.forEach(function (t) { box.appendChild(carte(t)); });
      if (!state.techniques.length) box.appendChild(el("div", "pc-empty", "Aucune technique."));
      box.appendChild(miniBtn("+ Ajouter une technique", null, function () {
        state.techniques.push({ id: uid("t"), nom: "", rang: 0, rangs: 1, xp: 0, rupture: 0, desc: "" });
        refresh();
        rendre();
      }, "pc-edit-only"));
      applyEdit(b, "techniques");
    }
    rendre();
    return b;
  }

  // ---------- Bio et Notes ----------
  // Les deux seules zones de PROSE LIBRE de la fiche. `state.background` et
  // `state.notes` existaient déjà — normalisés avec les champs d'identité,
  // initialisés par owd-attr-map.js et mappés vers les attributs Roll20
  // `owd_background` / `owd_notes` — mais AUCUN module ne les lisait ni ne les
  // écrivait : le joueur n'avait nulle part où écrire son personnage, et deux
  // champs morts faisaient l'aller-retour à vide dans les Attributes, dans
  // l'export et dans la migration. C'est le modèle de JJK
  // (buildBackground / buildNotes), repris tel quel, et le dernier trou de
  // parité avec elle.
  //
  // ILS VIVENT EN BAS DE L'ONGLET FICHE, sous les Techniques : Outward n'a que
  // trois onglets, il n'existe donc aucun onglet Bio où les ranger, et l'onglet
  // Options ne porte que des réglages — jamais du personnage. La colonne
  // « bas » leur donne la pleine largeur, seule mesure où de la prose se lit.
  // Ce sont DEUX modules et non un seul : chacun se déplace, se replie et se
  // masque de son côté, et une table qui ne veut pas d'histoire écrite peut
  // retirer la Bio sans perdre son carnet.
  function buildBio() {
    // Rouage : l'histoire s'écrit à la création et se relit ensuite. Le champ
    // se verrouille donc comme les autres champs de conception, contre la
    // frappe distraite au milieu d'une partie.
    // L'identifiant d'édition est « bg », celui du module, et non « bio » :
    // block() en fait le data-module du bloc, et monteModules ne le repose que
    // s'il manque (« if (!e.dataset.module) »). Deux mots différents, et le
    // bloc serait attribué à un module qui n'existe pas — les sondes, le
    // museau d'un module en panne et le plan chercheraient tous « bg » sans
    // jamais le trouver.
    var b = block("Bio", null, "bg");
    var bg = el("textarea", "pc-notes pc-edit-field");
    bg.rows = 7;
    bg.placeholder = "D'où il vient, ce qu'il fuit, ce qu'il doit.";
    bg.value = state.background || "";
    bg.addEventListener("input", function () { state.background = bg.value; save(); });
    // Le champ ne se réécrit JAMAIS pendant la frappe : c'est le motif de tous
    // les champs du fichier. Sans cette garde, une hydratation ou un import
    // arrivé en cours de phrase remettrait la valeur enregistrée et renverrait
    // le curseur au début.
    hooks.push(function () { if (document.activeElement !== bg) bg.value = state.background || ""; });
    b.appendChild(bg);
    // le rouage peut être déjà ouvert au remontage : sans cet appel le champ
    // resterait grisé jusqu'au premier refresh()
    applyEdit(b, "bg");
    return b;
  }
  function buildNotes() {
    // Les notes restent LIBRES, sans rouage : c'est le carnet de la session, il
    // s'écrit en jeu, la main sur le clavier. Un verrou à ouvrir avant chaque
    // ligne le rendrait inutilisable — et rien ici ne se calcule, donc rien ne
    // se casse à l'écrire de travers.
    var b = block("Notes");
    var nt = el("textarea", "pc-notes");
    nt.rows = 6;
    nt.placeholder = "Ce que la table a dit, ce qu'il reste à faire.";
    nt.value = state.notes || "";
    nt.addEventListener("input", function () { state.notes = nt.value; save(); });
    hooks.push(function () { if (document.activeElement !== nt) nt.value = state.notes || ""; });
    b.appendChild(nt);
    return b;
  }
  // ---------- boîte de dialogue ----------
  // Dans Roll20 la fiche est une iframe d'une AUTRE ORIGINE : prompt() et
  // confirm() y sont muets sous Chrome — ils rendent false sans rien afficher,
  // et un retrait y était annulé en silence. TOUT formulaire, TOUTE
  // confirmation passe donc par cette couche, posée dans le document de la
  // fiche. Il n'y a pas une seule exception dans ce fichier.
  function dialogue(titre, corps, valider, libelleValider) {
    var over = el("div", "pc-modal-over");
    var box = el("div", "pc-modal");
    box.appendChild(el("div", "pc-modal-title", titre));
    box.appendChild(corps);
    var pied = el("div", "pc-modal-actions");
    function fermer() { if (over.parentNode) over.parentNode.removeChild(over); }
    pied.appendChild(miniBtn("Annuler", null, fermer));
    // valider() qui rend explicitement false LAISSE le dialogue ouvert ; toute
    // autre valeur ferme.
    pied.appendChild(miniBtn(libelleValider || "Valider", null, function () {
      if (valider() !== false) fermer();
    }, "primary"));
    box.appendChild(pied);
    over.appendChild(box);
    over.addEventListener("mousedown", function (e) { if (e.target === over) fermer(); });
    // DANS .perso-fiche : c'est lui qui porte les jetons de couleur (jour et
    // nuit) ; accroché plus haut, le dialogue perdrait tout son habillage.
    (appEl || rootEl || document.body).appendChild(over);
    setTimeout(function () {
      var f = box.querySelector("input, textarea, select");
      if (f) { f.focus(); if (f.select) f.select(); }
    }, 0);
    return { fermer: fermer };
  }
  function confirmer(titre, texte, libelle, fn) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note", texte));
    dialogue(titre, corps, fn, libelle);
  }

  // ---------- donner / prendre un objet (entre joueurs, par le tchat) ----------
  // Le donneur envoie au tchat une carte portant un lien « Prendre » : le
  // payload de l'objet y voyage en base64. L'extension intercepte le clic (la
  // fiche, dans son iframe, ne voit pas le tchat) et renvoie le payload à la
  // fiche du preneur. L'ENCODAGE VIT ICI, CÔTÉ SITE : son format peut évoluer
  // sans jamais re-signer l'extension, qui ne fait que relayer.
  var TAKE_CMD = "/owd_take";
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
  // objet -> payload compact. CLÉS COURTES : le message de tchat est borné.
  //   n nom · q quantité · p poids · l places de contenance · d description
  //   k identifiant · a achat · v vente · i image · r accès rapide
  function packObjet(it, qte) {
    var p = {
      n: String(it.nom || ""), q: Math.max(0, pnum(qte)) || 1, p: pnum(it.poids),
      l: pnum(it.places), d: String(it.desc || ""), k: String(it.id || ""),
      a: pnum(it.achat), v: pnum(it.vente)
    };
    if (it.rapide) p.r = 1;
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
      places: pnum(o.l), desc: String(o.d || ""), img: String(o.i || ""),
      id: String(o.k || ""), achat: pnum(o.a), vente: pnum(o.v), rapide: !!o.r
    };
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
      // LE NOM PASSE PAR envSan : sans lui, un nom porteur d'une accolade ou
      // d'un saut de ligne compose une commande que l'extension refuse — et
      // l'objet serait quand même retiré de l'inventaire, donc perdu.
      var cmd = "&{template:default} {{name=Objet donné — " + (envSan(it.nom) || "objet") + "}}" +
                (q > 1 ? " {{Quantité=" + fmtP(q) + "}}" : "") +
                (it.desc ? " {{=" + envSan(it.desc) + "}}" : "") +
                " {{Prendre=[Prendre](" + TAKE_CMD + " " + packObjet(it, q) + ")}}";
      var enRoll20 = typeof window.__owdChat === "function";
      if (enRoll20) envoyer(cmd);
      else flash("Hors de Roll20 : rien n'est envoyé au tchat (l'objet reste dans l'inventaire).");
      // LA PILE NE DIMINUE QUE SI LE CANAL EXISTE : sinon l'objet partirait
      // sans que personne ne puisse le prendre.
      if (!enRoll20) return;
      it.qte = Math.max(0, Math.round((it.qte - q) * 100) / 100);
      if (!it.qte) {
        var i = state.inv.objets.indexOf(it);
        if (i >= 0) state.inv.objets.splice(i, 1);
      }
      refresh();
      if (invRender) invRender();
    }, "Donner");
  }

  // Prendre : l'objet arrive du tchat (relayé par l'extension). S'il existe
  // déjà, on empile les quantités et on tranche champ par champ ce qui diffère.
  var invRender = null;   // posé par invObjets : re-rendu de l'inventaire
  function recevoirObjet(payload) {
    var recu = unpackObjet(payload);
    if (!recu) { flash("Objet illisible (message abîmé)."); return; }
    var G = state.inv.groupes, items = state.inv.objets;
    // Reconnaissance : d'abord l'IDENTIFIANT (deux homonymes distincts ne
    // fusionnent pas), à défaut le nom, insensible à la casse.
    var jumeau = null;
    if (recu.id) items.forEach(function (x) { if (!jumeau && x.id && x.id === recu.id) jumeau = x; });
    if (!jumeau) {
      items.forEach(function (x) {
        if (!jumeau && !x.id && !recu.id && pli(x.nom) === pli(recu.nom)) jumeau = x;
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
      [["nom", "Nom"], ["img", "Image"], ["poids", "Poids"], ["places", "Places"],
       ["desc", "Description"], ["achat", "Achat"], ["vente", "Vente"]].forEach(function (c) {
        var mien = String(jumeau[c[0]] || ""), neuf = String(recu[c[0]] || "");
        if (mien === neuf || (!mien && !neuf)) return;
        choix[c[0]] = "mien";
        var bloc = el("div", "pc-modal-conflit");
        bloc.appendChild(el("div", "lbl", c[1] + " : deux versions"));
        var row = el("div", "row");
        [["mien", "Garder le mien", mien], ["neuf", "Prendre le nouveau", neuf]].forEach(function (opt) {
          var bt = el("button", "pc-modal-choix" + (opt[0] === "mien" ? " on" : ""));
          bt.type = "button";
          bt.appendChild(el("div", "tag", opt[1]));
          if (c[0] === "img" && opt[2]) {
            var mi = el("img"); mi.alt = ""; mi.src = opt[2];
            bt.appendChild(mi);
          } else {
            bt.appendChild(el("div", "val", opt[2] ? opt[2] : "— vide —"));
          }
          bt.addEventListener("click", function () {
            choix[c[0]] = opt[0];
            Array.prototype.forEach.call(row.children, function (x) { x.classList.remove("on"); });
            bt.classList.add("on");
          });
          row.appendChild(bt);
        });
        bloc.appendChild(row);
        corps.appendChild(bloc);
      });
    }

    dialogue("Prendre « " + recu.nom + " »", corps, function () {
      var q = Math.min(pnum(qIn.value) || recu.qte, recu.qte);
      if (jumeau) {
        jumeau.qte = Math.round((jumeau.qte + q) * 100) / 100;
        ["nom", "img", "poids", "places", "desc", "achat", "vente"].forEach(function (k) {
          if (choix[k] === "neuf") jumeau[k] = recu[k];
        });
        if (!jumeau.id && recu.id) jumeau.id = recu.id;
      } else {
        items.push({
          id: recu.id, nom: recu.nom, img: recu.img, qte: q, poids: recu.poids,
          places: recu.places, achat: recu.achat, vente: recu.vente, desc: recu.desc,
          grp: gSel ? clamp(num(gSel.value, 0), 0, G.length - 1) : 0,
          rapide: recu.rapide
        });
      }
      refresh();
      if (invRender) invRender();
      flash(fmtP(q) + " × « " + recu.nom + " » ajouté à l'inventaire.");
    }, "Prendre");
  }

  // ================= ONGLET INVENTAIRE =================

  // ---- 10. Armes ----
  // Une arme est un RÉPERTOIRE, pas une attaque : sa ligne (prise, parade,
  // réduction, compétence qui porte le jet) et ses GESTES, un par façon de
  // frapper. Les dégâts d'Outward sont des nombres FIXES : le jeton « Dégâts »
  // ENVOIE une carte, il ne lance rien — un « jet de dégâts » serait une règle
  // inventée, et c'est la coupure à ne pas rater.
  function champTexte(libelle, obj, cle, large, titre) {
    var i = el("input", "pc-edit-field");
    i.type = "text";
    i.placeholder = libelle;
    i.value = obj[cle] || "";
    if (titre) i.title = titre;
    i.addEventListener("input", function () { obj[cle] = i.value; save(); });
    return fld(libelle, i, large ? "w" : null);
  }
  function buildArmes() {
    var b = block("Armes", null, "armes", function () { rendre(); });
    var box = el("div");
    b.appendChild(box);

    // Le préréglage : choisir une arme du livre remplit parade et réduction.
    // C'EST UN RACCOURCI DE SAISIE, PAS UNE CONTRAINTE — les champs restent
    // libres, et la liste ne s'affiche pas comme un barème.
    function selArme(a) {
      var s = el("select", "pc-select pc-edit-field");
      var o0 = el("option", null, "— Préréglage —");
      o0.value = "";
      s.appendChild(o0);
      armesData().forEach(function (d) {
        var o = el("option", null, d.nom);
        o.value = d.cle;
        s.appendChild(o);
      });
      s.title = "Remplit parade et réduction d'après le livre. Les champs restent modifiables.";
      s.addEventListener("change", function () {
        var d = null;
        armesData().forEach(function (x) { if (x.cle === s.value) d = x; });
        s.value = "";
        if (!d) return;
        if (!String(a.nom || "").trim()) a.nom = d.nom;
        a.parade = String(d.parade);
        a.reduction = String(d.reduction);
        refresh();
        rendre();
      });
      return s;
    }
    // Le sélecteur de compétence : alimenté par state.comps, et il range l'ID.
    function selComp(a) {
      var s = el("select", "pc-select pc-edit-field");
      function remplir() {
        s.innerHTML = "";
        var o0 = el("option", null, "— Aucune —");
        o0.value = "";
        s.appendChild(o0);
        state.comps.forEach(function (c) {
          var o = el("option", null, c.nom || "Sans nom");
          o.value = c.id;
          if (c.id === a.comp) o.selected = true;
          s.appendChild(o);
        });
      }
      remplir();
      s.title = "La compétence qui porte le jet de cette arme.";
      s.addEventListener("change", function () { a.comp = s.value; refresh(); });
      hooks.push(function () { if (document.activeElement !== s) remplir(); });
      return s;
    }
    // Le bonus et les dés de l'arme viennent de SA compétence : sans lien, le
    // jet part à zéro dé, et la fiche le dit plutôt que d'en inventer un.
    function compArme(a) { return a.comp ? compDe(a.comp) : null; }
    function jetArme(a, libelle) {
      var c = compArme(a);
      if (!c) { flash("Cette arme n'est liée à aucune compétence (rouage)."); return; }
      var n = compDes(c);
      doRoll(libelle, compBonus(c), deDe(n), true, n);
    }

    function carte(a) {
      var card = el("div", "pc-arme");
      var head = el("div", "pc-arme-head");
      var nm = el("input", "nm pc-edit-field");
      nm.type = "text"; nm.placeholder = "Nom de l'arme"; nm.value = a.nom || "";
      nm.addEventListener("input", function () { a.nom = nm.value; save(); });
      head.appendChild(nm);
      head.appendChild(chatBtn(
        function () { return "Arme — " + (a.nom || "sans nom"); },
        function () {
          var c = compArme(a);
          return [
            ["Prise", a.prise], ["Parade", a.parade], ["Réduction", a.reduction],
            ["Compétence", c ? (c.nom + " " + sign(compBonus(c))) : ""],
            // les gestes en champ SANS libellé : c'est le texte long de la carte
            ["", a.gestes.map(function (g) {
              return (g.nom || "geste") + " — seuil " + (g.seuil || "?") +
                     " · " + (g.portee || "?") + " pas · " + (g.degats || "?") + " " + (g.type || "");
            }).join(" | ")]
          ];
        }));
      head.appendChild(miniBtn("✕", "Retirer cette arme", function () {
        function retire() {
          state.armes = state.armes.filter(function (x) { return x.id !== a.id; });
          refresh();
          rendre();
        }
        if (!String(a.nom || "").trim() && !a.gestes.length) { retire(); return; }
        confirmer("Retirer une arme", "Retirer « " + (a.nom || "cette arme") + " » et ses gestes ?",
                  "Retirer", retire);
      }, "danger pc-edit-only"));
      card.appendChild(head);

      var l1 = el("div", "pc-arme-line");
      l1.appendChild(champTexte("Prise", a, "prise", true, "À une main, à deux mains, d'hast…"));
      l1.appendChild(champTexte("Parade", a, "parade", false, "La difficulté de parade de cette arme."));
      l1.appendChild(champTexte("Réduction", a, "reduction", false,
        "Ce que cette arme retire aux dégâts qu'elle pare."));
      l1.appendChild(fld("Compétence", selComp(a), "w"));
      var chipP = el("span", "pc-roll-chip", "Parade");
      chipP.addEventListener("click", function () { jetArme(a, "Parade — " + (a.nom || "arme")); });
      l1.appendChild(chipP);
      var preregl = fld("Préréglage", selArme(a));
      preregl.classList.add("pc-edit-only");
      l1.appendChild(preregl);
      card.appendChild(l1);
      hooks.push(function () {
        var c = compArme(a);
        chipP.title = c
          ? "Lancer la parade : " + deDe(compDes(c)) + " " + sign(compBonus(c)) +
            " (parade " + (a.parade || "?") + " · réduction " + (a.reduction || "?") + ")"
          : "Aucune compétence liée : le jet ne peut pas partir.";
      });

      // ---- les gestes ----
      a.gestes.forEach(function (g) {
        var lg = el("div", "pc-arme-line");
        lg.appendChild(champTexte("Geste", g, "nom", true));
        lg.appendChild(champTexte("Seuil", g, "seuil", false,
          "Le seuil d'attaque de ce geste. Il ne part pas dans le jet : Roll20 ne compare pas."));
        lg.appendChild(champTexte("Portée", g, "portee", false, "En pas."));
        lg.appendChild(champTexte("Dégâts", g, "degats", false));
        lg.appendChild(selType(g, "type"));
        lg.appendChild(champTexte("Moitié", g, "degatsDemi", false,
          "Ce que le geste inflige sur une case blanche."));
        lg.appendChild(selType(g, "typeDemi"));
        var chipA = el("span", "pc-roll-chip", "Attaque");
        chipA.addEventListener("click", function () {
          jetArme(a, (a.nom || "Arme") + " — " + (g.nom || "attaque"));
        });
        lg.appendChild(chipA);
        // LES DÉGÂTS NE SE LANCENT PAS : ce sont des nombres fixes. Le jeton
        // ENVOIE une carte, par sayChat, et non par doRoll.
        var chipD = el("span", "pc-roll-chip", "Dégâts");
        chipD.title = "Envoyer les dégâts au tchat — ils sont fixes, ils ne se lancent pas.";
        chipD.addEventListener("click", function () {
          sayChat("Dégâts — " + (g.nom || a.nom || "geste"), [
            ["Pleins", (g.degats || "") + (g.type ? " " + g.type : "")],
            ["Moitié", (g.degatsDemi || "") + (g.typeDemi ? " " + g.typeDemi : "")],
            ["Portée", g.portee ? g.portee + " pas" : ""],
            ["Seuil", g.seuil]
          ]);
        });
        lg.appendChild(chipD);
        lg.appendChild(miniBtn("✕", "Retirer ce geste", function () {
          a.gestes = a.gestes.filter(function (x) { return x.id !== g.id; });
          refresh();
          rendre();
        }, "danger pc-edit-only"));
        card.appendChild(lg);
        hooks.push(function () {
          var c = compArme(a);
          chipA.title = c
            ? "Lancer l'attaque : " + deDe(compDes(c)) + " " + sign(compBonus(c)) +
              (g.seuil ? " — seuil " + g.seuil : "")
            : "Aucune compétence liée : le jet ne peut pas partir.";
        });
      });
      card.appendChild(miniBtn("+ Geste", "Ajouter une façon de frapper", function () {
        a.gestes.push({ id: uid("g"), nom: "", seuil: "", portee: "", degats: "", type: "",
                        degatsDemi: "", typeDemi: "" });
        refresh();
        rendre();
      }, "pc-edit-only"));
      return card;
    }
    // Les types de dégâts viennent des règles : tranchant, perforant,
    // contondant. La liste n'est pas un barème, c'est un vocabulaire.
    function selType(g, cle) {
      var s = el("select", "pc-select pc-edit-field");
      var o0 = el("option", null, "—");
      o0.value = "";
      s.appendChild(o0);
      typesDegats().forEach(function (t) {
        var o = el("option", null, t.cle);
        o.value = t.cle;
        o.title = t.libelle;
        if (g[cle] === t.cle) o.selected = true;
        s.appendChild(o);
      });
      s.addEventListener("change", function () { g[cle] = s.value; save(); });
      return fld("Type", s);
    }

    function rendre() {
      box.innerHTML = "";
      state.armes.forEach(function (a) { box.appendChild(carte(a)); });
      if (!state.armes.length) box.appendChild(el("div", "pc-empty", "Aucune arme."));
      box.appendChild(miniBtn("+ Ajouter une arme", null, function () {
        state.armes.push({ id: uid("a"), nom: "", prise: "", parade: "", reduction: "",
                           comp: "", note: "", gestes: [] });
        refresh();
        rendre();
      }, "pc-edit-only"));
      applyEdit(b, "armes");
    }
    rendre();
    return b;
  }

  // ---- 11. Charge et contenance ----
  // Les trois limites du corps, en jauges lisibles. Aucun rouage n'est
  // nécessaire pour LIRE ; les forçages vivent dans le bloc Corps, et le
  // rouage n'est là que pour les modificateurs de poids.
  function buildCharge() {
    var b = block("Charge et contenance", null, "charge");
    function jaugeLimite(libelle, pris, total, unite) {
      var m = el("span", "pc-meter");
      m.appendChild(el("span", null, libelle));
      var v = el("b", null, "");
      m.appendChild(v);
      var bar = el("span", "bar");
      var fill = el("i");
      bar.appendChild(fill);
      m.appendChild(bar);
      hooks.push(function () {
        var p = pris(), t = total();
        v.textContent = fmtP(p) + " / " + fmtP(t) + (unite ? " " + unite : "");
        var over = p > t;
        v.classList.toggle("over", over);
        fill.classList.toggle("over", over);
        fill.style.width = clamp(t ? (p / t) * 100 : 0, 0, 100) + "%";
      });
      b.appendChild(m);
      return m;
    }
    jaugeLimite("Charge", poidsPorte, charge);
    jaugeLimite("Accès rapides", accesPris, accesRapides);
    jaugeLimite("Contenance", contenancePrise, contenance);
    var mrow = el("div", "pc-pvmax pc-mods-host pc-edit-only");
    mrow.appendChild(el("span", "lbl", "Charge"));
    mrow.appendChild(multiMod(state.divers, "charge"));
    mrow.appendChild(el("span", "sp"));
    b.appendChild(mrow);
    // La fiche COMPTE et AVERTIT, elle n'interdit rien : une fiche qui refuse
    // une saisie oblige le joueur à mentir à sa fiche.
    b.appendChild(note("Le poids porté vient des groupes cochés de l'inventaire et des vêtements portés."));
    return b;
  }

  // ---- 12. Vêtements ----
  function buildVetements() {
    var b = block("Vêtements", null, "vetements", function () { rendre(); });
    var box = el("div");
    b.appendChild(box);
    var pied = el("div", "pc-comp-tools");
    var resume = el("div", "row");
    var tot = el("span", "pc-comp-total", "");
    resume.appendChild(tot);
    resume.appendChild(chatBtn(
      function () {
        return "Protections — froid " + sign(protection("froid")) + " · chaud " + sign(protection("chaud"));
      },
      function () {
        var c = confort();
        return [["Froid", sign(protection("froid"))], ["Chaud", sign(protection("chaud"))],
                ["Zone de confort", c ? fmtP(c.bas) + " à " + fmtP(c.haut) + " °C" : ""],
                ["Poids porté", fmtP(protectionPoids())]];
      }));
    pied.appendChild(resume);
    b.appendChild(pied);

    function protectionPoids() {
      var t = 0;
      state.vetements.forEach(function (v) { if (v.porte) t += pnum(v.poids); });
      return Math.round(t * 100) / 100;
    }
    function nombre(libelle, v, cle, titre) {
      var i = el("input", "pc-edit-field");
      i.type = "number"; i.step = "any";
      i.value = v[cle] ? fmtP(v[cle]) : "";
      i.placeholder = "0";
      i.title = titre;
      i.addEventListener("input", function () {
        v[cle] = cle === "poids" ? pnum(i.value) : snum(i.value);
        refresh();
      });
      return fld(libelle, i);
    }
    function rendre() {
      box.innerHTML = "";
      state.vetements.forEach(function (v) {
        var l = el("div", "pc-arme-line");
        l.appendChild(champTexte("Pièce", v, "nom", true));
        l.appendChild(nombre("Froid", v, "froid", "Degrés de protection contre le froid."));
        l.appendChild(nombre("Chaud", v, "chaud", "Degrés de protection contre le chaud."));
        l.appendChild(nombre("Poids", v, "poids", "Ce que la pièce pèse quand elle est portée."));
        var kv = el("div", "pc-kv");
        var lab = el("label", null, "");
        var cb = el("input");
        cb.type = "checkbox";
        cb.checked = !!v.porte;
        cb.title = "Décoché, la pièce est dans le sac : elle ne protège plus, et son poids passe " +
                   "avec le groupe qui la contient.";
        cb.addEventListener("change", function () { v.porte = cb.checked; refresh(); });
        lab.appendChild(cb);
        lab.appendChild(el("span", null, " porté"));
        kv.appendChild(lab);
        l.appendChild(kv);
        l.appendChild(miniBtn("✕", "Retirer cette pièce", function () {
          state.vetements = state.vetements.filter(function (x) { return x.id !== v.id; });
          refresh();
          rendre();
        }, "danger pc-edit-only"));
        box.appendChild(l);
      });
      if (!state.vetements.length) box.appendChild(el("div", "pc-empty", "Aucun vêtement."));
      box.appendChild(miniBtn("+ Ajouter", null, function () {
        state.vetements.push({ id: uid("v"), nom: "", froid: 0, chaud: 0, poids: 0, porte: true, note: "" });
        refresh();
        rendre();
      }, "pc-edit-only"));
      applyEdit(b, "vetements");
    }
    hooks.push(function () {
      var c = confort();
      tot.textContent = "Protection froid " + sign(protection("froid")) +
                        " · chaud " + sign(protection("chaud")) +
                        (c ? " · confort " + fmtP(c.bas) + " à " + fmtP(c.haut) + " °C" : "");
      tot.title = c
        ? "La zone où le personnage habillé est à l'aise, calculée depuis les degrés de ce qu'il porte."
        : "La zone de confort demande les bornes du corps nu, que le jeu de données n'a pas fournies.";
    });
    rendre();
    return b;
  }

  // ---- 13. Bourse ----
  function buildBourse() {
    var b = block("Bourse", null, "bourse");
    var row = el("div", "pc-kv");
    // Geste de JEU : toujours actif, jamais sous le rouage. On dépense en jeu.
    row.appendChild(stepper(
      function () { return state.argent; },
      function (v) { state.argent = Math.max(0, Math.round(v * 100) / 100); },
      1, monnaie(true)));
    row.appendChild(el("span", "k", monnaie(true)));
    row.appendChild(el("span", "sp"));
    row.appendChild(chatBtn(
      function () { return "Bourse — " + fmtP(state.argent) + " " + monnaie(state.argent !== 1); },
      function () { return [[capFirst(monnaie(true)), fmtP(state.argent)]]; }));
    b.appendChild(row);
    return b;
  }
  // ---- 14. Inventaire illustré (pleine largeur) ----
  // Des TUILES carrées rangées par groupes (Sur soi, Sacoche…), et le détail de
  // l'objet choisi dans la colonne de droite. On glisse une tuile d'un groupe à
  // l'autre.
  //
  // Le bandeau d'un groupe porte à droite son POIDS et sa case « Compté » :
  // décochée, le groupe est POSÉ AU SOL — son poids sort de la charge, mais ses
  // objets restent entiers, consultables, déplaçables et donnables. Le drapeau
  // vit dans state.inv.comptes, parallèle aux groupes.
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

    // Le pied distingue ce que le personnage PORTE de ce qu'il a POSÉ : un
    // total unique laisserait croire qu'un sac décoché pèse encore, ou qu'il a
    // disparu. Il dit aussi la contenance, l'autre limite d'Outward.
    function updateTotal() {
      tot.style.display = O.total ? "" : "none";
      grpPoids.forEach(function (f) { f(); });
      var porte = poidsObjets(true), pose = poidsObjets(false);
      tot.textContent = "Objets portés : " + fmtP(porte) + " kg" +
        (pose ? " · posés : " + fmtP(pose) + " kg" : "") +
        " · contenance : " + fmtP(contenancePrise()) + "/" + fmtP(contenance());
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

    function moveTo(from, gi, cible) {
      // déplace items[from] dans le groupe gi, juste avant `cible` (null : à la
      // fin). La position se recalcule APRÈS le retrait : retirer l'objet
      // déplacé décale les index de tout ce qui le suivait.
      var moved = items.splice(from, 1)[0];
      moved.grp = gi;
      var at = cible ? items.indexOf(cible) : -1;
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
      var del = el("button", "pc-obj-del pc-edit-only", "✕");
      del.type = "button";
      del.title = "Retirer cet objet";
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        function retire() {
          var ici = items.indexOf(it);
          items.splice(ici, 1);
          if (sel === ici) sel = null;
          else if (sel !== null && sel > ici) sel--;
          render();
          refresh();
        }
        if (!(it.nom || it.desc)) { retire(); return; }
        confirmer("Retirer un objet",
                  "Retirer « " + (it.nom || "cet objet") + " » de l'inventaire ?",
                  "Retirer", retire);
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
      // un objet en accès rapide se reconnaît d'un coup d'œil : c'est ce qu'on
      // cherche quand on cherche à dégainer
      if (it.rapide) {
        t.classList.add("rapide");
        t.title = (it.nom || "Objet") + " — accès rapide";
      }

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
          var suivants = items.filter(function (x) { return x.grp === it.grp && x !== deplace; });
          var k = suivants.indexOf(it);
          cible = k >= 0 && k + 1 < suivants.length ? suivants[k + 1] : null;
        }
        moveTo(from, it.grp, cible);
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

      var pdsG = el("span", "pds");
      pdsG.title = "Poids de ce groupe";
      head.appendChild(pdsG);
      // LA CASE ET SON MOT FORMENT UN SEUL BOUTON : une case nue de douze
      // pixels ne pardonne pas au tactile.
      var caseG = el("label", "pc-obj-cnt");
      var boite = el("input");
      boite.type = "checkbox";
      boite.checked = invCompte(gi);
      boite.title = "Décoché, ce groupe est posé au sol : il ne compte plus dans la charge.";
      boite.addEventListener("change", function () {
        state.inv.comptes[gi] = boite.checked;
        g.classList.toggle("pose", !boite.checked);
        majPoids();
        updateTotal();
        save();
        refresh();          // la charge vient de bouger : les jauges suivent
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
              if (it.grp === gi) it.grp = 0;
              else if (it.grp > gi) it.grp--;
            });
            sel = null;
            render();
            refresh();
          }
          var dedans = 0;
          items.forEach(function (it) { if (it.grp === gi) dedans++; });
          if (!dedans) { supprime(); return; }
          confirmer("Supprimer un groupe",
                    "« " + G[gi] + " » contient " + dedans + (dedans > 1 ? " objets" : " objet") +
                    ". Ils rejoindront « " + G[0] + " ».",
                    "Supprimer", supprime);
        });
        head.appendChild(delG);
      }
      g.appendChild(head);

      var tiles = el("div", "pc-obj-tiles");
      tiles.style.setProperty("--obj-cols", O.cols);
      items.forEach(function (it, idx) { if (it.grp === gi) tiles.appendChild(tile(it, idx)); });
      var add = el("div", "pc-obj-addtile pc-edit-only", "+");
      add.title = "Ajouter un objet dans « " + G[gi] + " »";
      add.addEventListener("click", function () {
        items.push({ id: "", nom: "", img: "", qte: 1, poids: 0, places: 0,
                     achat: 0, vente: 0, desc: "", grp: gi, rapide: false });
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

      // quantité : curseur + champ, décimale (une demi-ration, 2.5 m de corde)
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
        it.qte = isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
        if (+slider.max < it.qte) slider.max = String(it.qte);
        if (document.activeElement !== slider) slider.value = it.qte;
        if (document.activeElement !== qIn) qIn.value = it.qte;
        if (refs()) refs().badge.textContent = "×" + fmtP(it.qte);
        majAct();
        majPile();
        save(); updateTotal();
        refresh();   // le poids porté vient de bouger : la charge suit
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
        refresh();
      });
      pd.addEventListener("blur", function () { pd.value = it.poids ? fmtP(it.poids) : ""; });
      pair.appendChild(fld("Poids", pd));
      var gSel = el("select", "pc-edit-field");
      G.forEach(function (gn, gi) {
        var o = el("option", null, gn);
        o.value = String(gi);
        if (gi === it.grp) o.selected = true;
        gSel.appendChild(o);
      });
      gSel.addEventListener("change", function () {
        moveTo(sel, clamp(num(gSel.value, 0), 0, G.length - 1), null);
        render();
        refresh();
      });
      pair.appendChild(fld("Groupe", gSel));
      body.appendChild(pair);

      // PLACES DE CONTENANCE et ACCÈS RAPIDE : les deux limites propres à
      // Outward. Les places disent ce que l'objet occuperait une fois avalé ;
      // l'accès rapide dit qu'il se dégaine sans fouiller.
      var pair2 = el("div", "pc-obj-pair");
      var pl = el("input", "pc-edit-field");
      pl.type = "text"; pl.inputMode = "decimal";
      pl.value = it.places ? fmtP(it.places) : "";
      pl.placeholder = "0";
      pl.title = "La contenance qu'occupe cet objet une fois avalé.";
      pl.addEventListener("input", function () { it.places = pnum(pl.value); save(); });
      pl.addEventListener("blur", function () { pl.value = it.places ? fmtP(it.places) : ""; });
      pair2.appendChild(fld("Places", pl));
      var kvR = el("div", "pc-kv");
      var labR = el("label", null, "");
      var cbR = el("input");
      cbR.type = "checkbox";
      cbR.checked = !!it.rapide;
      cbR.title = "L'objet tient dans un accès rapide : il compte alors contre la Dextérité, " +
                  "et pas seulement contre la charge.";
      cbR.addEventListener("change", function () {
        it.rapide = cbR.checked;
        render();
        refresh();
      });
      labR.appendChild(cbR);
      labR.appendChild(el("span", null, " accès rapide"));
      kvR.appendChild(labR);
      pair2.appendChild(kvR);
      body.appendChild(pair2);

      // achat / vente, en pièces d'argent : la monnaie du livre est NOMMÉE
      var prix = el("div", "pc-obj-pair");
      [["achat", "Achat"], ["vente", "Vente"]].forEach(function (c) {
        var inp = el("input", "pc-edit-field");
        inp.type = "text"; inp.inputMode = "decimal";
        inp.value = it[c[0]] ? fmtP(it[c[0]]) : "";
        inp.placeholder = "0";
        inp.title = c[1] + " en " + monnaie(true);
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

      var pile = el("div", "pc-obj-pile");
      function majPile() {
        pile.textContent = "Total : " + fmtP(it.qte * it.poids) + " kg";
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
        vignette(f, function (data) { it.img = data; render(); refresh(); });
      });
      urlFld.appendChild(file);
      urlFld.appendChild(miniBtn("Fichier…", "Importer une image (réduite en vignette 96 px)",
        function () { file.click(); }, "pc-edit-only"));
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
        if (document.activeElement !== actQte)
          actQte.value = fmtP(Math.min(pnum(actQte.value) || it.qte, it.qte));
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
            ["Groupe", G[it.grp]],
            ["Quantité", fmtP(q) + (q < it.qte ? " (sur " + fmtP(it.qte) + ")" : "")],
            ["Poids", it.poids ? fmtP(it.poids) + (q > 1 ? " (total " + fmtP(q * it.poids) + ")" : "") : ""],
            ["Places", it.places ? fmtP(it.places) : ""],
            ["Valeur", it.vente ? "vente " + fmtP(it.vente) + (it.achat ? " · achat " + fmtP(it.achat) : "")
                                : (it.achat ? "achat " + fmtP(it.achat) : "")],
            ["", it.desc]   // texte long : pleine largeur, sans libellé
          ];
        }));
      actions.appendChild(miniBtn("Donner", "Donner cette quantité à un autre joueur", function () {
        donnerDialogue(it, bornerAct());
      }));
      function retireQte(q, tout) {
        if (tout) { items.splice(sel, 1); sel = null; }
        else it.qte = Math.round((it.qte - q) * 100) / 100;
        render();
        refresh();
      }
      actions.appendChild(miniBtn("Retirer", "Retirer cette quantité (tout : l'objet disparaît)", function () {
        var q = bornerAct();
        var tout = q >= it.qte;
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
        // le drapeau naît AVEC son groupe : un groupe neuf est PORTÉ, jamais
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
    var ref = { fn: null };
    var b = block("Inventaire", "objets par groupes", "inv", function () {
      if (ref.fn) ref.fn();
    });
    invObjets(b, ref);
    return b;
  }

  // ================= ONGLET OPTIONS =================

  // ---- 15. Jets ----
  function buildJets() {
    var b = block("Jets");
    var de = el("input", "de");
    de.type = "text";
    de.title = "Ce que la fiche lance par dé d'action. Toute expression Roll20 est acceptée.";
    de.value = state.de || DE_DEFAUT;
    de.addEventListener("input", function () { state.de = de.value || DE_DEFAUT; save(); });
    hooks.push(function () { if (document.activeElement !== de) de.value = state.de || DE_DEFAUT; });
    // Le champ et son bouton sur la MÊME ligne : sous le champ, le bouton
    // occupait une rangée entière pour un mot, et le bloc paraissait deux fois
    // plus haut.
    var ligne = el("div", "pc-jet-de");
    ligne.appendChild(fld("Dé des jets", de));
    ligne.appendChild(miniBtn("Réinitialiser", "Revenir au dé du livre : " + deDe(1),
      function () { state.de = deDe(1); refresh(); }));
    b.appendChild(ligne);
    b.appendChild(note("Tous les dés du jeu sont des dés à " + faces() +
                       " faces ; ce champ reste un réglage de table."));
    return b;
  }

  // ---- les deux champs partagés des grilles d'Options ----
  // Un champ de MODIFICATEUR : nu, sans − ni +. Sur cinquante lignes de quatre
  // colonnes, les boutons mangeaient la place et n'apportaient rien qu'on ne
  // fasse au clavier. Vide affiché quand la valeur est 0 : un zéro n'est pas un
  // réglage.
  function champModVal(lire, ecrire, borne, titre, reg) {
    var inp = el("input", "pc-num modif");
    inp.type = "number"; inp.step = String(MOD_PAS);
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(String(inp.value).replace(",", "."));
      ecrire(isFinite(v) ? clamp(Math.round(v * 100) / 100, -borne, borne) : 0);
      refresh();
    });
    (reg || hooks).push(function () {
      if (document.activeElement !== inp) inp.value = lire() ? lire() : "";
    });
    return inp;
  }
  function champMod(map, cle, borne, titre, reg) {
    return champModVal(function () { return map[cle]; },
                       function (v) { if (v) map[cle] = v; else delete map[cle]; },
                       borne, titre, reg);
  }
  // Un champ de FORÇAGE : vide = valeur calculée (undefined, distinct de 0).
  function champForceVal(lire, ecrire, auto, titre, reg) {
    var inp = el("input", "force");
    inp.type = "number"; inp.step = "any";
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(String(inp.value).replace(",", "."));
      ecrire(isFinite(v) ? clamp(Math.round(v * 100) / 100, -99999, 99999) : undefined);
      refresh();
    });
    (reg || hooks).push(function () {
      inp.placeholder = fmtP(auto());
      var cur = lire();
      if (document.activeElement !== inp) inp.value = cur === undefined ? "" : cur;
    });
    return inp;
  }
  function champForce(map, cle, auto, titre, reg) {
    return champForceVal(
      function () { return map[cle]; },
      function (v) { if (v === undefined) delete map[cle]; else map[cle] = v; },
      auto, titre, reg);
  }
  // L'entête d'une grille de leviers. Libellés COURTS : quatre colonnes dans
  // une demi-largeur ne laissent pas la place aux noms complets, que portent
  // les infobulles.
  function entete(box, colonnes, cls) {
    var head = el("div", "pc-optcomp-row " + (cls || "quatre") + " head");
    colonnes.forEach(function (h) {
      var sp = el("span", h[2] || null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    box.appendChild(head);
    return head;
  }

  // ---- 16. Modificateurs de caractéristiques ----
  // MÊME GRILLE que les compétences et les capacités, et c'est voulu : régler
  // une caractéristique et régler une compétence sont le même geste pour le MJ,
  // il n'a pas à apprendre deux dispositions. Pas de colonne « coût en xp » :
  // les caractéristiques d'Outward ne s'achètent pas.
  function buildModCaracs() {
    var b = block("Modificateurs de caractéristiques");
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    b.appendChild(wrap);
    entete(box, [
      ["Carac.", "Caractéristique"],
      ["Forcé", "Total forcé — vide = total calculé"],
      ["Modif.", "Deux modificateurs du total, qui s'additionnent", "duo"],
      ["Total", "Total effectif de la caractéristique"]
    ]);
    caracsOrdre().forEach(function (name, i) {
      var row = el("div", "pc-optcomp-row quatre pc-mods-host" + (i % 2 === 1 ? " odd" : ""));
      var nameBox = el("span", "pc-comp-name");
      var chip = el("span", "pc-abbr", abbrCarac(name));
      chip.title = libCarac(name);
      nameBox.appendChild(chip);
      row.appendChild(nameBox);
      row.appendChild(champForce(state.caracsForce, name,
        function () { return caracAuto(name); },
        "Total forcé — vide = total calculé (valeur + modificateurs)."));
      row.appendChild(champMod(state.caracsMod, name, 9999, "Premier modificateur du total — vide = aucun."));
      row.appendChild(champMod(state.caracsMod2, name, 9999, "Second modificateur du total — vide = aucun."));
      var tot = el("span", "pc-comp-total", "");
      row.appendChild(tot);
      hooks.push(function () {
        var d = caracMods(name);
        var f = state.caracsForce[name];
        tot.textContent = String(caracTotal(name));
        tot.classList.toggle("adj", d !== 0 || f !== undefined);
        tot.title = f !== undefined
          ? "Total forcé à " + fmtP(f) + " (calculé : " + fmtP(caracAuto(name)) + ")"
          : "valeur " + fmtP(caracVal(name)) + (d ? " · modificateurs " + sign(d) : "");
        // liseré à gauche dès qu'un levier est posé : une ligne réglée s'allume
        // sans décaler ses voisines
        row.classList.toggle("on", d !== 0 || f !== undefined);
      });
      box.appendChild(row);
    });
    return b;
  }

  // ---- 17. Affichage (Roll20 seulement) ----
  // window.__owdNight n'existe que sous roll20-fiche.html : sur le site, le
  // bouton d'en-tête gère déjà la nuit.
  function affichagePresent() { return !!window.__owdNight; }
  function buildAffichage() {
    var b = block("Affichage");
    var mode = el("select", "pc-select");
    [["auto", "Selon Roll20"], ["0", "Jour"], ["1", "Nuit"]].forEach(function (o) {
      var op = el("option", null, o[1]);
      op.value = o[0];
      mode.appendChild(op);
    });
    mode.value = window.__owdNight.pref();
    mode.addEventListener("change", function () { window.__owdNight.set(mode.value); });
    b.appendChild(fld("Mode par défaut", mode));
    return b;
  }

  // ---- 20. Fiche : exporter / importer / réinitialiser ----
  // REDONNÉ ici parce que la barre d'outils n'existe pas dans Roll20, où la
  // fiche EST le personnage.
  function buildActions() {
    var b = block("Fiche");
    var act = el("div", "pc-opt-actions");
    function btn(txt, cls, fn) {
      var x = el("button", "pc-btn" + (cls ? " " + cls : ""), txt);
      x.type = "button";
      x.addEventListener("click", fn);
      return x;
    }
    act.appendChild(btn("Exporter (JSON)", null, exporterJson));
    var file = el("input");
    file.type = "file"; file.accept = "application/json"; file.style.display = "none";
    file.addEventListener("change", function () { importerJson(file); });
    act.appendChild(btn("Importer (JSON)", null, function () { file.click(); }));
    act.appendChild(file);
    act.appendChild(btn("Réinitialiser la fiche", "danger", function () {
      // confirmer(), jamais confirm() : muet dans l'iframe Roll20, il rendrait
      // false sans rien afficher et le geste serait annulé en silence.
      confirmer("Réinitialiser la fiche",
                "Tout le personnage sera effacé : caractéristiques, compétences, techniques, " +
                "équipement, inventaire, mods. Exporter d'abord si le doute existe.",
                "Réinitialiser", function () {
        state = blank();
        remount();
        flash("Fiche réinitialisée.");
      });
    }));
    b.appendChild(act);
    return b;
  }

  // ---- 21. Modificateurs de capacités ----
  // LE TABLEAU DE BORD DU MJ : une rangée par capacité dérivée, forçage,
  // modificateurs, total. C'est le même geste que pour une caractéristique ou
  // une compétence.
  function buildOptCaps() {
    var b = block("Modificateurs de capacités");
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    b.appendChild(wrap);
    entete(box, [
      ["Capacité", "La valeur dérivée à régler"],
      ["Forcé", "Valeur forcée — vide = valeur calculée"],
      ["Modif.", "Trois modificateurs, qui s'additionnent", "duo"],
      ["Total", "Valeur effective"]
    ]);
    // L'ordre est celui de la fiche : les jauges d'abord, les limites du corps
    // ensuite, les compteurs à la fin.
    var LIGNES = [
      ["pv", "Points de vie"], ["pe", "Points d'endurance"], ["pm", "Points de mana"],
      ["pi", "Points d'innocence"], ["pr", "Points de repos"], ["ps", "Points de satiété"],
      ["ph", "Points d'hydratation"], ["charge", "Charge"], ["acces", "Accès rapides"],
      ["contenance", "Contenance"], ["expo", "Exposition"], ["rupture", "Rupture"],
      ["desAction", "Dés d'action"], ["effondrement", "Effondrement"]
    ];
    LIGNES.forEach(function (L, i) {
      var cle = L[0];
      var row = el("div", "pc-optcomp-row quatre pc-mods-host" + (i % 2 === 1 ? " odd" : ""));
      var nameBox = el("span", "pc-comp-name");
      var lab = el("span", "pc-comp-label", libCap(cle, L[1]));
      lab.title = libCap(cle, L[1]);
      nameBox.appendChild(lab);
      row.appendChild(nameBox);
      row.appendChild(champForce(state.maxForce, cle, function () { return autoDe(cle); },
        "Valeur forcée — vide = valeur calculée (formule du livre et modificateurs)."));
      // Trois emplacements ici aussi : ce sont les MÊMES que ceux des blocs de
      // la Fiche, pas un second jeu — deux endroits pour la même donnée
      // finiraient par se contredire.
      var mm = multiMod(state.divers, cle);
      // La colonne « Modif. » de l'entête coiffe DEUX pistes de la grille (c'est
      // ce que fait .duo) : la cellule qui porte les trois emplacements doit
      // s'étendre autant, sinon la rangée se décale d'une colonne par rapport à
      // son entête. Posé en clair plutôt que par une classe, parce que
      // l'alignement d'une grille ne doit dépendre d'aucune feuille : la fiche
      // s'ouvre aussi quand le CSS n'a pas été chargé.
      mm.classList.add("duo");
      mm.style.gridColumn = "span 2";
      row.appendChild(mm);
      var tot = el("span", "pc-comp-total", "");
      row.appendChild(tot);
      hooks.push(function () {
        var d = modSum(state.divers[cle]);
        var f = state.maxForce[cle];
        tot.textContent = fmtP(maxDe(cle));
        tot.classList.toggle("adj", d !== 0 || f !== undefined);
        tot.title = f !== undefined
          ? "Valeur forcée à " + fmtP(f) + " (calculée : " + fmtP(autoDe(cle)) + ")"
          : (capDef(cle) && capDef(cle).formule ? capDef(cle).formule : "Valeur calculée") +
            (d ? " · modificateurs " + sign(d) : "");
        row.classList.toggle("on", d !== 0 || f !== undefined);
      });
      box.appendChild(row);
    });
    return b;
  }

  // ---- 22. Modificateurs de compétences ----
  // Le pendant du bloc précédent, compétence par compétence. Ses variables de
  // vue lui sont PROPRES (optFilter, optOnly) : on ne cherche pas la même chose
  // ici que dans l'onglet Fiche. Rebâti par optCompsRebuild, qui vide optHooks
  // à chaque passe (sinon chaque rebâti fuirait des hooks) et finit par
  // refresh() pour peupler les totaux qui viennent de naître.
  function buildOptComps() {
    var b = block("Modificateurs de compétences");
    var tools = el("div", "pc-comp-tools");
    var l1 = el("div", "row");
    var search = champFiltre(function () { return optFilter; },
                             function (v) { optFilter = v; }, "Filtrer les compétences…",
                             function () { optCompsRebuild(); });
    if (search) l1.appendChild(search);
    if (l1.children.length) tools.appendChild(l1);
    var l2 = el("div", "row");
    var puce = el("span", "pc-chip", "Investies");
    puce.title = "N'afficher que les compétences où un rang, un modificateur ou un forçage est posé.";
    puce.classList.toggle("on", optOnly);
    puce.addEventListener("click", function () {
      optOnly = !optOnly;
      puce.classList.toggle("on", optOnly);
      optCompsRebuild();
    });
    l2.appendChild(puce);
    tools.appendChild(l2);
    b.appendChild(tools);
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    b.appendChild(wrap);

    optCompsRebuild = function () {
      optHooks = [];
      box.innerHTML = "";
      var flt = filtreDe(optFilter);
      var liste = state.comps.filter(function (c) {
        if (optOnly && !compInvestie(c)) return false;
        if (flt && pli(c.nom).indexOf(flt) < 0 && pli(c.groupe).indexOf(flt) < 0) return false;
        return true;
      });
      if (!liste.length) {
        box.appendChild(el("div", "pc-empty",
          !state.comps.length ? "Aucune compétence sur cette fiche."
            : flt ? "Aucune compétence ne correspond à la recherche."
                  : "Aucune compétence investie : la puce « Investies » masque les autres."));
        refresh();
        return;
      }
      var head = el("div", "pc-optcomp-row head");
      [["Compétence", "Nom de la compétence"],
       ["Dés", "Nombre de dés engageables forcé — vide = celui du rang"],
       ["Bonus", "Bonus total forcé — vide = rang et modificateurs"],
       ["Modif.", "Deux modificateurs du bonus, qui s'additionnent", "duo"],
       ["Total", "Bonus effectif"]].forEach(function (h) {
        var sp = el("span", h[2] || null, h[0]);
        sp.title = h[1];
        head.appendChild(sp);
      });
      box.appendChild(head);
      liste.forEach(function (c, i) {
        var row = el("div", "pc-optcomp-row pc-mods-host" + (i % 2 === 1 ? " odd" : ""));
        var nameBox = el("span", "pc-comp-name");
        var lab = el("span", "pc-comp-label", c.nom || "Sans nom");
        lab.title = (c.nom || "Sans nom") + " · " + (compGroupe(c) || "sans groupe");
        nameBox.appendChild(lab);
        row.appendChild(nameBox);
        row.appendChild(champForce(state.compsDesForce, c.id,
          function () { return num(rangInfo(compRang(c)).des, 0); },
          "Dés engageables forcés — vide = ceux du rang.", optHooks));
        row.appendChild(champForce(state.compsForce, c.id,
          function () { return compBonusAuto(c); },
          "Bonus total forcé — vide = bonus du rang et modificateurs.", optHooks));
        row.appendChild(champMod(state.compsMod, c.id, 9999,
          "Premier modificateur du bonus — vide = aucun.", optHooks));
        row.appendChild(champMod(state.compsMod2, c.id, 9999,
          "Second modificateur du bonus — vide = aucun.", optHooks));
        var tot = el("span", "pc-comp-total", "");
        row.appendChild(tot);
        optHooks.push(function () {
          var d = compMods(c);
          var f = state.compsForce[c.id];
          tot.textContent = sign(compBonus(c));
          tot.classList.toggle("zero", !compRang(c) && !d && f === undefined);
          tot.classList.toggle("adj", d !== 0 || f !== undefined);
          tot.title = f !== undefined
            ? "Bonus forcé à " + sign(f) + " (calculé : " + sign(compBonusAuto(c)) + ")"
            : "rang " + compRang(c) + " " + sign(num(rangInfo(compRang(c)).bonus, 0)) +
              (d ? " · modificateurs " + sign(d) : "");
          row.classList.toggle("on", d !== 0 || f !== undefined ||
                                     state.compsDesForce[c.id] !== undefined);
        });
        box.appendChild(row);
      });
      refresh();   // peupler les totaux qui viennent de naître
    };
    optCompsRebuild();
    return b;
  }

  // ---- 23. Outils de filtre ----
  // Couper un outil le fait DISPARAÎTRE partout et cesser d'agir : un filtre
  // invisible qui masque encore des lignes serait un piège. La puce porte le
  // nom de l'OUTIL, jamais celui de son réglage par défaut.
  function buildFiltres() {
    var b = block("Outils de filtre");
    var tools = el("div", "pc-comp-tools");
    var line = el("div", "row");
    var chip = el("span", "pc-chip", "Champ de recherche");
    chip.title = "La case où l'on tape pour filtrer les compétences, sur la Fiche comme ici. " +
                 "Éteinte : l'outil disparaît, et ne filtre plus rien.";
    chip.classList.toggle("on", filtreTexteOn());
    chip.addEventListener("click", function () {
      var on = filtreTexteOn();
      lset(FILTRES.texte, on ? "0" : "1");
      chip.classList.toggle("on", !on);
      remount();   // l'outil vit dans un autre onglet : tout se rebâtit
    });
    line.appendChild(chip);
    tools.appendChild(line);
    b.appendChild(tools);
    return b;
  }
  // ---- 19. Modules : le plan de la fiche ----
  // Ce bloc-ci parle de TOUS les autres. Il n'écrit que deux choses : la
  // disposition (state.modules) et les interrupteurs (state.modActifs) ; rien
  // du personnage ne passe par lui. Les outils qu'il appelle sont ceux du
  // MONTAGE (ordreModules, squeletteColonnes, MODULES_NATIFS), pour que le plan
  // dise exactement ce que la fiche a fait.
  function disposition() {
    if (!state.modules || typeof state.modules !== "object" || Array.isArray(state.modules))
      state.modules = {};
    return state.modules;
  }
  // La place qu'un module DEMANDE : la consigne enregistrée si elle existe,
  // sinon celle qu'il a déclarée au montage. On ne lit surtout pas
  // modules[i].onglet : appliqueDisposition l'a déjà remanié, il porte la place
  // FORCÉE — et « Disposition d'origine » ne montrerait rien avant le
  // rechargement, un module déplacé deux fois repartant de sa place forcée.
  function placeDemandee(m) {
    var p = (disposition().place || {})[m.id];
    if (p && typeof p === "object" && typeof p.onglet === "string" && typeof p.colonne === "string")
      return { onglet: p.onglet, colonne: p.colonne };
    var o = placeOrigine[m.id];
    if (o) return { onglet: o.onglet, colonne: o.colonne };
    return { onglet: m.onglet, colonne: m.colonne };
  }
  function idsConnus() { return ordreModules().map(function (m) { return m.id; }); }
  function memeColonne(id, onglet, colonne) {
    var i = rangModule(id);
    if (i < 0) return false;
    var p = placeDemandee(modules[i]);
    return p.onglet === onglet && p.colonne === colonne;
  }
  // ON N'ÉPINGLE QUE LA COLONNE TOUCHÉE, et c'est tout le sujet. L'ancienne
  // version écrivait l'ordre COMPLET de tous les modules, tous onglets
  // confondus : un seul clic n'importe où, et la disposition du personnage
  // était gelée pour toujours — la fiche pouvait ensuite réagencer un onglet
  // auquel le joueur n'avait jamais touché, il ne le voyait jamais. C'est
  // arrivé pour de bon en JJK.
  //
  // ordonne() accepte un ordre PARTIEL : c'est ce qui rend la chose possible.
  function ecritOrdre(ids, onglet, colonne) {
    var d = disposition();
    var ancien = Array.isArray(d.ordre) ? d.ordre : [];
    var neuf = [], vus = {}, i;
    for (i = 0; i < ancien.length; i++) {
      if (onglet && memeColonne(ancien[i], onglet, colonne)) continue;
      if (!vus[ancien[i]]) { vus[ancien[i]] = 1; neuf.push(ancien[i]); }
    }
    for (i = 0; i < ids.length; i++) {
      if (onglet && !memeColonne(ids[i], onglet, colonne)) continue;
      if (!vus[ids[i]]) { vus[ids[i]] = 1; neuf.push(ids[i]); }
    }
    d.ordre = neuf;
    // L'ordre vivant suit tout de suite, mais LA FICHE NE SE REMONTE PAS : elle
    // se remontait, et ranger trois modules reconstruisait trois fois la fiche
    // entière, l'onglet sautait, et le moindre clic coûtait une seconde.
    ordonne(d.ordre);
    save();
  }
  function natifDe(id) {
    for (var i = 0; i < MODULES_NATIFS.length; i++)
      if (MODULES_NATIFS[i].id === id) return MODULES_NATIFS[i];
    return null;
  }
  function deplaceModule(id, onglet, colonne, avantId) {
    var d = disposition();
    var nat = placeOrigine[id] || natifDe(id);
    if (!d.place || typeof d.place !== "object" || Array.isArray(d.place)) d.place = {};
    // Revenir à sa place d'origine EFFACE l'entrée plutôt que d'y ranger cette
    // place : la disposition reste éparse, et un module que la fiche
    // déménagera un jour suivra son déménagement au lieu d'être épinglé ici.
    if (nat && nat.onglet === onglet && nat.colonne === colonne) delete d.place[id];
    else d.place[id] = { onglet: onglet, colonne: colonne };
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
  // Redessiner LE PLAN SEUL, sans reconstruire la fiche. Enveloppé : un plan
  // qui échoue ne doit pas emporter la fiche avec lui.
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
  // La colonne d'un module existe-t-elle dans le squelette de son onglet ? Un
  // mod qui recopie « milieu » dans un onglet qui n'en a pas se retrouve sans
  // hôte : il ne se monte nulle part, alors que sa ligne, elle, figure bien
  // sous son onglet, l'air d'un module ordinaire. Il faut le reconnaître pour
  // le dire.
  function colonneRepli(p) {
    var cols = colonnesDe(p.onglet);
    if (!cols) return null;                    // onglet inconnu : autre cas
    if (aClef(cols, p.colonne)) return p.colonne;
    return Object.keys(cols)[0] || null;
  }
  function colonneInconnue(p) {
    var r = colonneRepli(p);
    return !!r && r !== p.colonne;
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
    // HAUTE d'une carte veut dire « avant elle ».
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
      // L'œil : affiché ou masqué. Le bloc des réglages lui-même n'en a pas,
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
        if (avant && avant.dataset.id === id) return;   // se lâcher sur soi-même ne range rien
        deplaceModule(id, onglet, colonne, avant ? avant.dataset.id : null);
      });
      return { bloc: z, liste: liste };
    }
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
      // Une colonne PLEINE LARGEUR n'est pas une colonne de la grille : sur la
      // fiche elle court sous les autres. Le plan la met donc SOUS elles, dans
      // sa propre rangée, au lieu de la serrer entre deux voisines à qui elle
      // prendrait un tiers de la place.
      var etroites = noms.filter(function (c) { return !d.larges[c]; });
      var larges = noms.filter(function (c) { return !!d.larges[c]; });
      if (!etroites.length) { etroites = larges; larges = []; }
      plan.appendChild(remplit(t.id, dedans, etroites, etroites[0]));
      larges.forEach(function (c) { plan.appendChild(remplit(t.id, dedans, [c], null)); });
    });

    // Un module dont l'ONGLET n'existe pas (un mod mal réglé) ne se monte nulle
    // part. Sans cette rangée il serait invisible ET impossible à ranger : le
    // joueur n'aurait plus qu'à effacer le mod pour s'en défaire.
    var perdus = visibles.filter(function (m) { return !vus[m.id]; });
    if (perdus.length) {
      plan.appendChild(el("div", "pc-modgroupe", "Onglet inconnu"));
      var rp = el("div", "pc-modplan-cols");
      rp.style.gridTemplateColumns = "minmax(0, 1fr)";
      var zp = zone(TABS[0].id, "gauche", "À ranger");
      perdus.forEach(function (m) {
        zp.liste.appendChild(carte(m, "onglet « " + placeDemandee(m).onglet +
          " » inconnu : ce module ne s'affiche nulle part"));
      });
      rp.appendChild(zp.bloc);
      plan.appendChild(rp);
    }

    if (!plan.children.length) plan.appendChild(el("div", "pc-empty", "Aucun module."));
    b.appendChild(plan);
    var tools = el("div", "pc-comp-tools");
    // Ranger n'agit plus tout de suite, et IL FAUT LE DIRE : sans cette ligne,
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
    duo.appendChild(miniBtn("Recharger la fiche", "Reconstruire la fiche avec le rangement du plan.",
      function () { remount(); flash("Fiche rechargée."); }));
    tools.appendChild(duo);
    b.appendChild(tools);
    return b;
  }

  // ---- 18. Mods : le code ajouté au personnage ----
  // Ce bloc dit ce que chaque mod fait (ou pourquoi il ne fait rien), donne de
  // quoi trancher, et permet d'en écrire un. Le moteur (owd-mods.js) juge,
  // exécute et range les accords ; sans lui, ce bloc se contente de le dire.
  //
  // AUCUN BAC À SABLE : un mod autorisé tourne dans la page de la fiche avec
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
    return (window.OwdMods && typeof window.OwdMods.execute === "function") ? window.OwdMods : null;
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
  function decideMod(empreinte, avis) {
    if (!window.OwdMods || typeof window.OwdMods.decide !== "function") return;
    try { window.OwdMods.decide(empreinte, avis); } catch (e) {}
  }
  // Même règle d'id que le moteur (idPropre) et que normalize() : les trois
  // chemins doivent donner le MÊME id, sans quoi l'empreinte changerait selon
  // le chemin pris et le joueur réautoriserait un mod qu'il connaît déjà.
  function idMod(v) {
    return String(v == null ? "" : v).toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  }
  // Un « pour » illisible est SILENCIEUSEMENT oublié par le moteur : autant le
  // dire tout de suite. La règle de lecture est CELLE DU MOTEUR, jamais une
  // copie locale — en JJK, une copie restée en arrière a fait refuser au
  // formulaire le numéro qu'il proposait lui-même en filigrane.
  function versionLisible(v) {
    var mm = window.OwdMods;
    if (!mm || typeof mm.lireVersion !== "function") return true;
    try { return !!mm.lireVersion(v); } catch (e) { return true; }
  }
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
    corps.appendChild(fld("Code JavaScript (Owd, ctx)", src));
    corps.appendChild(fld("Pour la fiche, au moins (facultatif)", pour));
    dialogue(titre, corps, function () {
      var vid = idMod(id.value) || idMod(nom.value);
      var vp = String(pour.value == null ? "" : pour.value).trim();
      var prisId = false;
      if (!vid) { flash("Il faut un identifiant : des lettres, des chiffres ou des tirets."); return false; }
      (state.mods || []).forEach(function (x) { if (x !== base && x.id === vid) prisId = true; });
      if (prisId) { flash("L'identifiant « " + vid + " » est déjà pris par un autre mod."); return false; }
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
      // porte sur CE code et sur CE navigateur seulement.
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
        // Le oui ne se pose QUE si l'empreinte a changé. Ouvrir puis refermer
        // l'éditeur sans rien toucher ne décide de rien : cela écrasait un
        // refus sans un mot, alors que la note du formulaire promet l'inverse.
        if (apres && apres !== avant) decideMod(apres, "oui");
        save();
        remount();
        flash("Mod « " + nom + " » enregistré.");
      });
  }
  // LIRE le code d'un mod ne doit pas supposer d'ouvrir l'éditeur : « Modifier »
  // sert à écrire, et valider son formulaire vaut accord. Ici rien ne bouge
  // tant que le joueur ne tranche pas.
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
    boutons.appendChild(miniBtn("Autoriser", "Ce code tournera à chaque ouverture, sur ce navigateur",
      function () { decideMod(emp, "oui"); remount(); }));
    boutons.appendChild(miniBtn("Refuser", "Ce code ne tournera pas ; il reste sur le personnage",
      function () { decideMod(emp, "non"); remount(); }, "danger"));
    corps.appendChild(boutons);
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
  // UNE LIGNE, ET LE MOINS DE BOUTONS POSSIBLE. « Autoriser » et « Refuser »
  // sont les deux faces d'une même question : une PUCE. « Modifier » et
  // « Supprimer » sont des gestes de CONSTRUCTION : derrière le rouage, par la
  // classe pc-edit-only — une classe, pas un test à la construction, le rouage
  // bascule une classe et ne rebâtit pas ses lignes.
  //
  // LES DEUX PUCES NE DISENT PAS LA MÊME CHOSE, et c'est pour cela qu'elles
  // sont deux : « Actif » appartient au PERSONNAGE et voyage avec lui,
  // « Autorisé » appartient à CE NAVIGATEUR et n'en sort jamais.
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

    var nom = el("span", "nom", m.nom || m.id);
    nom.title = (m.nom || m.id) + " · identifiant " + m.id + " · " +
                (aClef(ETATS_MOD, etat) ? ETATS_MOD[etat] : "état inconnu");
    barre.appendChild(nom);
    // La panne garde son marquage : le liseré de la ligne et le message du
    // moteur en dessous. C'est la seule chose qu'une puce ne dit pas.
    if (etat === "panne") ligne.setAttribute("data-etat", "panne");

    barre.appendChild(miniBtn("Voir le code", "Lire le code de ce mod sans y toucher",
      function () { voirMod(m); }, "voir"));

    var puceA = el("span", "pc-chip", "Actif");
    puceA.title = "Sur LE PERSONNAGE, et voyage avec lui : couper ce mod le met en veille pour " +
                  "tout le monde, sans rien effacer.";
    puceA.classList.toggle("on", on);
    puceA.addEventListener("click", function () { m.actif = !on; save(); remount(); });
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

    barre.appendChild(miniBtn("Modifier", "Changer le nom, l'identifiant ou le code",
      function () { modifieMod(m); }, "pc-edit-only"));
    barre.appendChild(miniBtn("Supprimer", "Retirer ce mod du personnage",
      function () { supprimeMod(m); }, "danger pc-edit-only"));

    if (bil && bil.message) ligne.appendChild(note(bil.message));
    return ligne;
  }
  function buildMods() {
    var b = block("Mods", null, "mods");
    // AUCUNE explication en tête de bloc : la fiche montre les données du
    // personnage, pas un mode d'emploi. Ce qu'il faut savoir avant d'autoriser
    // du code est dit LÀ OÙ LA DÉCISION SE PREND.
    //
    // Le moteur est FACULTATIF DE NAISSANCE (le repli gelé de roll20-fiche.html
    // ne le nomme pas) : sans lui, on le dit et ON NE PROPOSE RIEN qui n'aurait
    // aucun effet — un mod ajouté ici n'aurait ni empreinte ni accord possible.
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
  // CETTE TABLE NE SE REMANIE JAMAIS : chaque mount() en repart
  // (modules = MODULES_NATIFS.slice()). Sans cette copie intacte, un mod qui
  // remplace un module natif le remplacerait pour toujours — même désinstallé,
  // la fiche n'aurait plus l'original à remettre.
  var MODULES_NATIFS = [
    // ---- onglet Fiche ----
    { id: "caracs",       titre: "Caractéristiques", onglet: "fiche", colonne: "gauche", build: buildCaracs },
    { id: "corps",        titre: "Corps",            onglet: "fiche", colonne: "gauche", build: buildCorps },
    { id: "rupture",      titre: "Rupture",          onglet: "fiche", colonne: "gauche", build: buildRupture },
    { id: "vitales",      titre: "Vitalité",         onglet: "fiche", colonne: "milieu", build: buildVitales },
    { id: "survie",       titre: "Survie",           onglet: "fiche", colonne: "milieu", build: buildSurvie },
    { id: "exposition",   titre: "Exposition",       onglet: "fiche", colonne: "milieu", build: buildExposition },
    { id: "effondrement", titre: "Effondrement",     onglet: "fiche", colonne: "milieu", build: buildEffondrement },
    { id: "comps",        titre: "Compétences",      onglet: "fiche", colonne: "droite", build: buildComps },
    // pleine largeur, sous les trois colonnes
    { id: "techniques",   titre: "Techniques",       onglet: "fiche", colonne: "bas",    build: buildTechniques },
    // la prose, tout en bas : ce qui se lit ne se met pas devant ce qui se
    // joue, et ces deux zones sont les seules de la fiche qu'on ne consulte pas
    // en combat. « bg » porte le nom de son champ d'état, comme en JJK.
    { id: "bg",           titre: "Bio",              onglet: "fiche", colonne: "bas",    build: buildBio },
    { id: "notes",        titre: "Notes",            onglet: "fiche", colonne: "bas",    build: buildNotes },
    // ---- onglet Inventaire ----
    { id: "armes",        titre: "Armes",            onglet: "inventaire", colonne: "gauche", build: buildArmes },
    { id: "charge",       titre: "Charge et contenance", onglet: "inventaire", colonne: "droite", build: buildCharge },
    { id: "vetements",    titre: "Vêtements",        onglet: "inventaire", colonne: "droite", build: buildVetements },
    { id: "bourse",       titre: "Bourse",           onglet: "inventaire", colonne: "droite", build: buildBourse },
    { id: "inv",          titre: "Inventaire",       onglet: "inventaire", colonne: "bas",    build: buildInv },
    // ---- onglet Options ----
    // Deux colonnes qui se répondent : à gauche ce qui touche aux valeurs et au
    // dispositif, à droite ce qui touche à la fiche et aux longues listes.
    { id: "jets",         titre: "Jets",             onglet: "options", colonne: "gauche", build: buildJets },
    { id: "actions",      titre: "Fiche",            onglet: "options", colonne: "droite", build: buildActions },
    { id: "modcaracs",    titre: "Modificateurs de caractéristiques", onglet: "options", colonne: "gauche", build: buildModCaracs },
    { id: "optcaps",      titre: "Modificateurs de capacités", onglet: "options", colonne: "droite", build: buildOptCaps },
    // « Affichage » n'existe que dans Roll20 ; son absence sur le site laisse
    // les deux colonnes à égalité.
    { id: "affichage",    titre: "Affichage",        onglet: "options", colonne: "gauche", build: buildAffichage, pour: affichagePresent },
    { id: "filtres",      titre: "Outils de filtre", onglet: "options", colonne: "droite", build: buildFiltres },
    { id: "mods",         titre: "Mods",             onglet: "options", colonne: "gauche", build: buildMods },
    { id: "modules",      titre: "Modules",          onglet: "options", colonne: "gauche", build: buildModules },
    // le titre dit ce que le bloc AFFICHE : « Compétences » le confondrait avec
    // celui de l'onglet Fiche, dans le plan comme partout où les modules se
    // nomment
    { id: "optcomps",     titre: "Modificateurs de compétences", onglet: "options", colonne: "droite", build: buildOptComps }
  ];
  modules = MODULES_NATIFS.slice();

  // ---------- le moteur de mods ----------
  // owd-mods.js est FACULTATIF DE NAISSANCE, exactement comme owd-migrations.js :
  // sans lui la fiche s'ouvre, simplement sans mods. Il ne touche ni au DOM ni à
  // l'état ; il reçoit la liste des mods et rend un bilan.
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
  // reconnaître.
  function propEstUnMod(prop) {
    if (!prop || prop === "?") return false;
    if (prop === PROP_MOD) return true;
    return !!modDe(prop) || !!bilanDeMod(prop);
  }
  // Un mod n'a plus rien à faire tourner dès qu'il quitte le personnage, qu'on
  // le coupe ou qu'on lui retire son accord.
  function modAutorise(prop) {
    var m = modDe(prop);
    if (!m || m.actif === false) return false;
    return avisMod(empreinteMod(m.id, m.src)) === "oui";
  }
  function executeMods() {
    bilanMods = [];
    if (!state || !state.mods || !state.mods.length) return;
    if (!window.OwdMods || typeof window.OwdMods.execute !== "function") return;
    var avant = proprietaireCourant;
    proprietaireCourant = PROP_MOD;
    try {
      var b = window.OwdMods.execute(state.mods, window.Owd, { version: RELEASE, schema: SCHEMA });
      if (Array.isArray(b)) bilanMods = b;
      // Une faute de syntaxe dans un mod ne laissait RIEN dans la console,
      // alors que la page Mods dit d'y regarder en premier. Le message part au
      // même format que les autres ennuis (« [mod:<id>] »), pour qu'un filtre
      // sur « [mod: » ramasse tout ce qui concerne un mod, d'où que ça vienne.
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
  // on le bâtit UNE FOIS À VIDE, dans un élément détaché, plutôt que de
  // recopier ici une liste de colonnes qui dériverait au premier onglet
  // remanié.
  function colonnesDe(onglet) {
    if (!aClef(SQUELETTES, onglet)) return null;
    var noms = {};
    var c = SQUELETTES[onglet](el("div"));
    Object.keys(c || {}).forEach(function (k) { noms[k] = 1; });
    return noms;
  }
  // Les colonnes d'un onglet, DANS L'ORDRE, en distinguant celles qui courent
  // sur toute la largeur. Le squelette les reconnaît lui-même : une colonne
  // pleine largeur rend le PANNEAU au lieu d'une colonne de la grille.
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
  // Une consigne qui ne désigne rien de valide (module inconnu, onglet disparu,
  // colonne qui n'existe plus dans ce squelette) est simplement IGNORÉE : elle
  // laisserait sinon le module hors de la fiche, sans rien pour l'y ramener.
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
  // LA FICHE S'OUVRE TOUJOURS : un mod en attente ne bloque rien, il ne tourne
  // pas, c'est tout.
  function modsEnAttente() {
    if (!state || !state.mods || !state.mods.length) return [];
    if (!window.OwdMods || typeof window.OwdMods.enAttente !== "function") return [];
    try {
      // MÊME repère qu'executeMods, sans quoi les deux écrans se contredisent :
      // sans version ni schéma, le moteur saute ses contrôles, un mod
      // « pour: 4.0.0 » est annoncé « pas autorisé », le joueur l'autorise, et
      // le bloc Mods lui répond « trop récent » — le oui ainsi arraché dort
      // dans le navigateur et s'appliquerait tout seul le jour de la 4.0.0.
      var a = window.OwdMods.enAttente(state.mods, { version: RELEASE, schema: SCHEMA });
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
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
      boutons.appendChild(miniBtn("Autoriser", "Ce mod tournera à chaque ouverture, sur ce navigateur",
        function () { decideMod(m.empreinte, "oui"); remount(); }, "primary"));
      boutons.appendChild(miniBtn("Refuser", "Ce mod ne tournera pas ; il reste sur le personnage",
        function () { decideMod(m.empreinte, "non"); remount(); }, "danger"));
      corps.appendChild(boutons);
    });
    dialogue("Mods en attente d'autorisation", corps, function () { remount(); }, "Terminer");
  }
  function bandeauAvis(app) {
    var attente = modsEnAttente();
    if (!attente.length) return;
    var n = attente.length;
    // .pc-avis-mods : le bandeau de CONSENTEMENT, distinct de celui de perte
    // d'enregistrement, qui partage la même mise en forme.
    var av = el("div", "pc-avis pc-avis-mods");
    av.appendChild(el("div", "pc-avis-txt",
      "Ce personnage porte " + n + " mod" + (n > 1 ? "s" : "") + " qui n'" +
      (n > 1 ? "ont" : "a") + " pas été autorisé" + (n > 1 ? "s" : "") +
      " sur ce navigateur. " + (n > 1 ? "Ils ne tournent" : "Il ne tourne") + " pas."));
    var row = el("div", "row");
    row.appendChild(miniBtn("Examiner", "Lire le code de chaque mod avant de décider",
      function () { examinerMods(attente); }));
    row.appendChild(miniBtn("Tout refuser", "Aucun de ces mods ne tournera sur ce navigateur", function () {
      attente.forEach(function (m) { decideMod(m.empreinte, "non"); });
      remount();
    }, "danger"));
    av.appendChild(row);
    app.appendChild(av);
  }

  // ---------- l'objet public ----------
  // La fiche expose UN objet : c'est par là qu'un mod remplace un module,
  // change la disposition ou détourne un calcul. Elle n'exécute rien
  // d'elle-même. window.__owdModules est un ALIAS du MÊME objet.
  window.Owd = {
    // Les deux ne se déduisent pas l'un de l'autre : version porte le suffixe
    // de beta le cas échéant, schema est un entier libre. Un mod qui tirerait
    // le schéma du majeur de la version se tromperait à la première
    // divergence ; OwdMods.lireVersion existe pour ne pas avoir à découper le
    // numéro soi-même.
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
    active: activeModule,
    etat: function (id) {
      var e = etatModule(id);
      return { echecs: e.echecs, musele: e.musele, erreur: e.erreur,
               panne: e.panne, vide: e.vide, actif: actif(id) };
    },
    remonte: remount,
    filtre: filtreCalcul,
    // bilan du dernier passage du moteur, en COPIE : vide tant qu'il n'a pas
    // tourné. « actif » vient de l'état (l'interrupteur du joueur), « etat » du
    // moteur (ok, panne, attente, coupe, recent, refuse).
    mods: function () {
      return bilanMods.map(function (b) {
        return { id: b.id, nom: b.nom, actif: modActifDe(b.id), etat: b.etat,
                 message: b.message || "", empreinte: b.empreinte };
      });
    },
    // INTERNE, pour le moteur de mods : nommer le mod qu'il lance, afin que les
    // filtres enregistrés pendant son exécution portent SON id.
    __proprietaire: function (id) {
      proprietaireCourant = id ? String(id) : PROP_MOD;
      // modEnExec ne vaut que PENDANT le lancement d'un mod : le moteur rend la
      // main avec null. C'est lui qui permet à enregistre() de marquer le
      // module au nom du mod qui l'a posé.
      modEnExec = id ? String(id) : null;
    },
    // INTERNE, pour les sondes. Le double tiret bas dit ce qu'il faut : ce
    // n'est pas le contrat public, et un mod qui s'y appuie le fait à ses
    // risques. Ils existent parce qu'une sonde qui lirait les valeurs dans le
    // DOM mesurerait la MISE EN FORME autant que le calcul.
    __calculs: {
      caracTotal: caracTotal, compBonus: compBonus, compDes: compDes, compXp: compXp,
      pvMax: pvMax, peMax: peMax, pmMax: pmMax, piMax: piMax,
      prMax: prMax, psMax: psMax, phMax: phMax,
      charge: charge, accesRapides: accesRapides, contenance: contenance,
      expoMax: expoMax, effondrement: effondrement, effNiveauDe: effNiveauDe,
      poidsPorte: poidsPorte, accesPris: accesPris, contenancePrise: contenancePrise,
      desAction: desAction, ruptureMax: ruptureMax, ruptureDepense: ruptureDepense,
      xpDepense: xpDepense, courant: courant, maxDe: maxDe, autoDe: autoDe,
      confort: confort
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
  window.__owdModules = window.Owd;

  // ---------- montage ----------
  // UN MONTAGE NE SE RELANCE JAMAIS DEPUIS LUI-MÊME. Un mod qui finit par
  // Owd.remonte() (geste naturel, et la documentation le donne sans réserve) ou
  // par ctx.reconstruire() rappellerait mount() DEPUIS mount() : les mods
  // repartiraient, redemanderaient un remontage, la pile déborderait, et chaque
  // niveau qui se dépile reprendrait son montage là où il en était. L'onglet
  // gèle, à CHAQUE ouverture puisque le mod voyage avec le personnage, et le
  // joueur n'atteint plus le bloc Mods pour couper le fautif.
  //
  // La demande est donc NOTÉE et honorée UNE SEULE FOIS, le montage courant
  // fini. La garde est ici et pas dans remount() : tout ce qui remonte la fiche
  // passe par mount().
  var montageEnCours = false;
  var remontageDu = false;
  var remontagesDus = 0;
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
      // et il a pu laisser une demande de remontage en l'air : le PROCHAIN
      // montage, réussi celui-là, payait un remontage gratuit hérité d'un
      // montage qui n'a jamais abouti
      if (!abouti) { remontageDu = false; remontagesDus = 0; }
    }
    if (!remontageDu) { remontagesDus = 0; return; }
    remontageDu = false;
    if (remontagesDus >= REMONTAGES_MAX) {
      if (window.console && window.console.warn)
        window.console.warn("[fiche] remontage en boucle : demande ignorée. Un mod appelle Owd.remonte() à chaque montage.");
      remontagesDus = 0;
      return;
    }
    remontagesDus++;
    mount(root);
  }
  function montage(root) {
    rootEl = root;
    enMontage = true;
    // Tous les registres repartent à vide : les anciens pointent sur un DOM qui
    // n'existe plus. Les compteurs de panne aussi — un remontage est une
    // seconde chance, c'est ce que fait le bouton « Réessayer ».
    regHors = [];
    regsModules = {};
    etatsModules = {};
    hooks = regHors;
    compHooks = [];
    optHooks = [];
    optCompsRebuild = null;
    compBox = null;
    invRender = null;
    // Filtres et table des modules : même remise à zéro, même raison. Ce sont
    // les mods et les modules qui les repeuplent à chaque montage. Sans elle,
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
    // ne remanie la table : c'est elle qui dit où un module retourne quand on
    // rétablit la disposition d'origine, et le plan s'en sert pour montrer un
    // rangement encore en attente.
    placeOrigine = {};
    modules.forEach(function (m) {
      placeOrigine[m.id] = { onglet: m.onglet, colonne: m.colonne };
    });
    appliqueDisposition();
    root.innerHTML = "";
    // La racine porte les jetons de couleur (jour et nuit) : c'est sur elle que
    // dialogue() accroche ses modales. Le mot « atelier » est réservé au Nen
    // par consigne du dépôt — ici, c'est « perso-fiche », le même mot que l'id
    // GELÉ de roll20-fiche.html.
    var app = el("div", "perso-fiche");
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

  // CHARGER LES DONNÉES ET MONTER SONT DEUX PANNES DIFFÉRENTES, et elles ne se
  // disent pas de la même façon. Le montage vivait dans le .then() du fetch :
  // tout ce qui tombait pendant lui (le plus souvent un mod) se faisait
  // rattraper par le .catch d'à côté, qui accusait le fichier de données d'une
  // faute qui n'était pas la sienne — et data-ready interdisant le réessai, la
  // fiche restait close sur un message faux. Chacun son filet.
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
    // « perso-fiche » : le mot est GELÉ par roll20-fiche.html, que la coquille
    // signée charge en dur. Les deux côtés doivent dire le même mot.
    var root = document.getElementById("perso-fiche");
    if (!root || root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    // point d'entrée des objets donnés au tchat : l'amorce Roll20 appelle ceci
    // quand le joueur clique « Prendre » (et rejoue ce qui attendait le montage)
    window.__owdOnTake = function (payload) {
      if (!state) { flash("La fiche n'est pas encore prête : recliquer « Prendre »."); return; }
      recevoirObjet(payload);
    };
    if (DATA) { demarre(root); return; }
    fetch(dataUrl(), { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      // DATA vide vaut échec : sans lui le montage partirait sans données, et
      // c'est bien du fichier qu'il faudrait alors se plaindre
      .then(function (d) { if (!d) throw new Error("données vides"); DATA = d; })
      .catch(function (e) {
        root.innerHTML = '<p style="padding:2rem;color:#b0402c">La fiche n\'a pas pu charger ses données (' +
          e.message + ").</p>";
      })
      // hors de portée du .catch ci-dessus : DATA dit si les données sont là
      .then(function () { if (DATA) demarre(root); });
  }

  if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
