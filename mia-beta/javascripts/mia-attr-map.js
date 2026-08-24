/* Correspondance fiche MIA <-> Attributes Roll20 (natifs par valeur).
 *
 * Le créateur (mia-fiche.js, réutilisé tel quel) travaille sur un objet
 * `state` imbriqué. Roll20 stocke des Attributes plats {name, current, max}.
 * Ce module fait la traduction, DANS LES DEUX SENS et SANS PERTE :
 *   - stateToAttrs(state, card) : décompose l'état en attributs Roll20.
 *   - attrsToState(attrs)       : reconstruit l'état depuis les attributs,
 *                                 EN DISANT dans quel état il l'a trouvé.
 *   - ficheDe(attrs)            : la version de la fiche, sans reconstruire.
 *   - setRelease(r)             : dit quelle release TOURNE (voir release()).
 *
 * TOUS les attributs produits commencent par « mia_ ». Trois familles :
 *   - SOURCE DE VÉRITÉ : `mia_state` porte l'état ENTIER en JSON. C'est lui
 *     qu'on relit pour reconstruire la fiche : il ne dérive JAMAIS quand
 *     mia-fiche.js gagne un champ. attrsToState le préfère à tout le reste ;
 *     la reconstruction champ par champ n'est qu'un repli.
 *   - NATIFS (repli + macros) : un attribut par valeur/collection.
 *   - MIROIR (écrits seulement si `card` fourni) : valeurs DÉRIVÉES pour les
 *     macros et barres de jetons Roll20 — caractéristiques et compétences
 *     TOTALES (@{perso|mia_for}, @{perso|mia_comp_phy}), PV et endurance
 *     courants/max, prestige, initiative, vitesse, poids, charge et
 *     récupération. Non relus (le créateur les recalcule), et jamais écrits
 *     par-dessus une donnée : leurs noms viennent des SIGLES des règles, que
 *     la fiche ne fige nulle part.
 *
 * LE PIÈGE QUE CE MODULE DOIT ÉVITER (3.0.0). Jusqu'ici, un mia_state
 * impossible à lire (il suffit qu'un joueur tape un caractère dans l'onglet
 * Attributes de Roll20) faisait tomber SANS UN MOT sur la reconstruction champ
 * par champ. La fiche montait quand même, puis la première sauvegarde
 * réécrivait un mia_state AMPUTÉ de tout ce que le repli ne sait pas porter.
 * D'où le diagnostic `degrade` : l'appelant peut GELER la fiche au lieu
 * d'écraser des données qu'il n'a pas su lire.
 *
 * Le même piège a une SECONDE porte, et elle est plus large : un mia_state
 * VIDÉ. Il pèse des centaines de kilo-octets dans l'onglet Attributes de
 * Roll20, ce qui donne très envie d'y faire le ménage. L'attribut disparu, le
 * diagnostic n'est plus « illisible » mais « partiel », qui couvre aussi le
 * personnage NEUF, où il n'y a rien à perdre. La raison sépare les deux
 * (RAISON_SANS_FICHE), pour que l'appelant gèle le premier cas sans geler le
 * second.
 *
 * Logique PURE, sans API navigateur : testable en node.
 *
 * Ce fichier vit sur le SITE (chargé par roll20-fiche.html avant
 * mia-roll20-boot.js) : le format des Attributes évolue avec la fiche, sans
 * jamais re-signer l'extension Roll20, qui n'est qu'une coquille.
 */
(function (root) {
  "use strict";

  var PREFIX = "mia_";

  // Numéro de version LISIBLE de la fiche, publié dans le `max` de
  // mia_version. Le manifeste en est la source unique quand il est là ; la
  // constante n'est qu'un repli (node, et l'amorceur de secours qui charge
  // sans manifeste).
  // Le « b » final marque la branche beta : le joueur voit sur quel site il
  // est. Il ne change PAS le rang du numéro (« 1.0.1b » et « 1.0.1 » sont la
  // même version, la beta étant ce que le stable recevra à la fusion) : ce qui
  // compare des versions doit donc l'ôter avant de lire les nombres.
  var RELEASE_DEFAUT = "1.4.2b";
  // Entier INDÉPENDANT de la release : il ne monte qu'au changement de forme de
  // l'état du personnage, jamais parce que le majeur a bougé. Le manifeste
  // publie les deux séparément, et c'est ce repli-ci que l'amorce prend quand le
  // manifeste manque.
  var SCHEMA_DEFAUT = 1;

  // Release EFFECTIVE : celle du code qui TOURNE, pas celle que le site publie.
  //
  // Le manifeste dit ce que le site sert AUJOURD'HUI. Quand l'amorce charge une
  // ARCHIVE (« ouvrir avec sa version »), c'est un bundle plus ancien qui écrit
  // les Attributes, sous le manifeste du jour : lire le manifeste inscrivait
  // alors la version DU SITE dans le max de mia_version, et la fiche d'archive
  // paraissait à jour. D'où ce réglage, posé par l'amorce AVANT la première
  // écriture : M.setRelease("2.9.0").
  //
  // Il est rangé sur `root` (window) et non dans une variable de module, parce
  // qu'une archive amène souvent SA carte d'attributs (archives[…].attrmap) :
  // le module est alors remplacé, et une variable interne serait perdue au
  // remplacement. Le global, lui, survit — et la carte de l'archive, qui porte
  // le même code, le relira.
  function setRelease(r) {
    if (typeof r === "string" && r) { try { root.__miaRelease = r; } catch (e) {} }
    else { try { root.__miaRelease = null; } catch (e2) {} }   // null = revenir au manifeste
    return release();
  }
  function release() {
    // 1. la release effective posée par l'amorce (archive en cours) ;
    var r = root && root.__miaRelease;
    if (typeof r === "string" && r) return r;
    // 2. sinon le manifeste, qui dit la version servie par le site ;
    var m = root && root.__miaManifeste;
    if (m && typeof m.release === "string" && m.release) return m.release;
    // 3. sinon la constante (node, et l'amorceur de secours sans manifeste).
    return RELEASE_DEFAUT;
  }

  // champ d'état scalaire -> [suffixe, type]
  //   n = nombre, s = chaîne libre, b = booléen (plus aucun champ racine n'en
  //       est un ; le type reste, pour ne pas avoir à le réinventer),
  //   N = nombre NULLABLE : "" vaut null et non 0 (les « forcé » du MJ, où
  //       vide veut dire « valeur calculée » — les confondre avec 0 clouerait
  //       les PV max à zéro sur le chemin de repli).
  var SCALARS = [
    ["name", "nom", "s"], ["espece", "espece", "s"], ["age", "age", "s"],
    ["sexe", "sexe", "s"], ["genre", "genre", "s"],
    ["portrait", "portrait", "s"], ["defaut", "defaut", "s"],
    ["background", "background", "s"], ["notes", "notes", "s"],
    ["inventaire", "inventaire", "s"], ["de", "de", "s"],
    ["xpTotal", "xp_total", "n"],
    // LE PRESTIGE, qui plafonne chaque caractéristique. Trois attributs, parce
    // que l'état porte trois leviers et pas un de plus : la valeur notée, son
    // modificateur, son forçage. Le prestige EFFECTIF, lui, est une valeur
    // dérivée : il part dans le miroir sous « mia_prestige » et ne se relit
    // jamais — d'où le suffixe « _base » ici, qui laisse le nom court au
    // chiffre que les macros veulent vraiment.
    ["prestige", "prestige_base", "n"],
    ["prestigeMod", "prestige_mod", "n"],
    ["prestigeForce", "prestige_force", "N"],
    // Les valeurs dérivées que le MJ remplace net. Toutes NULLABLES, et pour
    // la même raison : vide veut dire « laisse la fiche calculer ».
    ["pvMaxOverride", "pv_max_force", "N"],
    ["enduranceMaxOverride", "endurance_max_force", "N"],
    ["vitesseOverride", "vitesse_force", "N"],
    ["initiativeOverride", "initiative_force", "N"],
    ["chargeOverride", "charge_force", "N"],
    ["recupOverride", "recup_force", "N"],
    ["sautLongOverride", "saut_long_force", "N"],
    ["sautHautOverride", "saut_haut_force", "N"],
    ["v", "version", "n"], ["rel", "release", "s"]
  ];

  // champ d'état collection (objet/tableau) -> suffixe (stocké en JSON)
  var COLLECTIONS = [
    ["qualites", "qualites"], ["avantages", "avantages"],
    // LES CARACTÉRISTIQUES, sigle -> points achetés. Aucun sigle n'est écrit
    // ici, et c'est la même décision que dans blank() : DATA n'est jamais
    // chargé de ce côté-ci du pont, donc la table voyage telle quelle, ses
    // clés avec. Une liste en dur divergerait de la page de règles au premier
    // sigle ajouté, sans que rien ne le dise.
    ["caracs", "caracs"],
    // Tous les leviers des Options voyagent, y compris sur le chemin de repli :
    // ils changent des totaux affichés, et une fiche reconstruite sans eux
    // mentirait en silence.
    ["caracsMod", "caracs_mod"], ["caracsMod2", "caracs_mod2"],
    ["caracsForce", "caracs_force"],
    ["caracsXpForce", "caracs_xp_force"],
    ["caracsXpMod", "caracs_xp_mod"], ["caracsXpMod2", "caracs_xp_mod2"],
    // plafond par caractéristique : ce que le prestige donne, relevé ou
    // remplacé caractéristique par caractéristique
    ["caracsPlafondMod", "caracs_plafond_mod"],
    ["caracsPlafondForce", "caracs_plafond_force"],
    // LES COMPÉTENCES, sigle -> points investis. Mêmes leviers, mêmes raisons.
    ["comps", "competences"],
    ["compsMod", "comps_mod"], ["compsMod2", "comps_mod2"],
    ["compsForce", "comps_force"], ["compsXpForce", "comps_xp_force"],
    ["compsXpMod", "comps_xp_mod"], ["compsXpMod2", "comps_xp_mod2"],
    // LES SPÉCIALITÉS sont une LISTE et non une table : le joueur les nomme
    // lui-même. Chacune porte ses propres leviers ({ nom, carac, comp, pts,
    // mod, mod2, bonus, force, xpForce }), donc tout tient dans ce seul attribut.
    ["specialites", "specialites"],
    ["armes", "armes"], ["armures", "armures"],
    ["inv", "inventaire_sys"],
    ["divers", "divers"],
    // Disposition des modules (incrément 10). Format ÉPARS : seules les
    // DIFFÉRENCES avec la disposition d'origine sont écrites, jamais la liste
    // complète des identifiants. Deux raisons, et elles sont durables :
    //   - un module natif ajouté par une version ultérieure apparaît quand
    //     même chez un personnage rangé avant lui (il n'est simplement pas
    //     cité, donc il garde sa place d'origine) ;
    //   - un identifiant disparu (mod retiré, natif renommé) ne casse rien :
    //     il reste une clé que personne ne réclame.
    // Forme : { ordre: [ids], place: {id:{onglet,colonne}} }, et RIEN d'autre.
    // La disposition ne dit QUE le rangement : ce qui est allumé ou coupé vit
    // dans modActifs, seul interrupteur (voir plus bas). Deux endroits pour
    // dire la même chose finiraient par se contredire chez un joueur, et la
    // carte n'aurait aucun moyen de trancher lequel a raison.
    ["modules", "modules"],
    // Coffres privés des mods et des modules, { id: objet libre }. Leur contenu
    // n'est PAS interprété ici : c'est la donnée d'un module, la carte se
    // contente de la faire voyager entière.
    ["modData", "mod_donnees"],
    // Interrupteurs des modules, { id: false } pour les SEULS modules coupés
    // (clé posée par le bundle). Épars lui aussi, et pour la même raison : un
    // module qui n'y figure pas est allumé, donc un module ajouté demain
    // s'affiche chez tout le monde. C'est le SEUL interrupteur : `modules` ne
    // porte que le rangement ({ ordre, place }), et aucune clé `off` n'y existe
    // ni n'y existera.
    ["modActifs", "mod_actifs"],
    // Liste des mods, [{ id, nom, actif, pour, apiMin, src }]. L'attribut de
    // repli passe par modsSansCode() : voir plus bas, le code source ne se
    // duplique pas hors de mia_state.
    ["mods", "mods"]
  ];

  // Collections qui n'existent PAS dans blank() : elles ne sont écrites que si
  // l'état en porte, et relues que si l'attribut est là. Sans ça, la
  // reconstruction inventerait un champ que la fiche ne connaît pas.
  // grenier et vHist viennent du moteur de migration (mia-migrations.js) : ils
  // vivent à la RACINE de l'état, hors de blank(), et n'apparaissent que le
  // jour où un pas de migration s'en sert. Ils comptent doublement ici : le
  // grenier porte ce qu'une version d'arrivée ne sait pas encore afficher mais
  // doit rendre en redescendant, et le laisser hors du repli le perdrait
  // précisément le jour où la fiche redescend de version.
  var COLLECTIONS_OPT = [
    ["grenier", "grenier"],
    ["vHist", "v_hist"]
  ];

  // état par défaut : MIROIR EXACT de blank() de mia-fiche.js (mêmes clés,
  // mêmes valeurs). Il sert de socle à la reconstruction champ par champ : un
  // attribut absent laisse la valeur par défaut. Toute clé ajoutée là-bas doit
  // arriver ici ET dans SCALARS ou COLLECTIONS, sinon le repli la perd.
  function blank() {
    return {
      // miroir EXACT de blank() du bundle (docs/javascripts/mia-fiche.js) :
      // v porte le SCHÉMA, rel la release lisible. Le chemin de repli les
      // perdrait sans ça, et une fiche relue sans mia_state repartirait en
      // schéma 1 — c'est-à-dire qu'elle se ferait re-migrer indéfiniment.
      v: SCHEMA_DEFAUT, rel: RELEASE_DEFAUT,
      name: "", portrait: "", espece: "", age: "", sexe: "", genre: "",
      defaut: "", qualites: ["", ""], background: "", notes: "",
      avantages: [],

      // LE PRESTIGE et le plafond qu'il pose sur chaque caractéristique, que
      // l'avantage ou l'arbitrage peut relever une par une.
      prestige: 0, prestigeMod: 0, prestigeForce: null,
      caracsPlafondMod: {}, caracsPlafondForce: {},

      // TABLES VIDES, exactement comme dans le bundle. Leurs clés sont les
      // sigles des règles (FOR, DEX…, PHY, COM…), que seul DATA connaît — et
      // DATA n'est JAMAIS chargé ici, du côté Roll20. Les écrire en dur les
      // ferait diverger de la page de règles au premier sigle ajouté ; une clé
      // absente vaut zéro, et c'est tout ce dont la reconstruction a besoin.
      caracs: {}, caracsMod: {}, caracsMod2: {},
      caracsForce: {}, caracsXpForce: {}, caracsXpMod: {}, caracsXpMod2: {},

      comps: {}, compsMod: {}, compsMod2: {},
      compsForce: {}, compsXpForce: {}, compsXpMod: {}, compsXpMod2: {},

      specialites: [],

      xpTotal: 0,

      // courants nullables : null veut dire « au maximum », jamais zéro
      pv: null, endurance: null,
      armes: [], armures: [], inventaire: "",
      inv: {
        texte: [], groupes: ["Sur soi"], objets: [],
        // comptes : un drapeau « ce groupe pèse sur le personnage » par groupe,
        // dans un tableau PARALLÈLE à groupes. opts : les réglages d'affichage
        // du module. Deux clés du bundle, donc deux clés d'ici : une clé de
        // `inv` absente de ce miroir serait une perte sèche au repli.
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

      // Le rangement des modules et ce que les modules gardent pour eux.
      // Quatre clés RACINE, toutes avec un défaut vide : les ajouter ne fait
      // pas monter le schéma (normalize() complète une clé absente et ne purge
      // aucune clé racine inconnue), mais les omettre ici les perdrait sur le
      // chemin de repli.
      //
      // Le sens qu'il faut vérifier à chaque ajout est celui-ci : une clé
      // racine du bundle absente d'ici serait une perte sèche au repli.
      // L'inverse (une clé d'ici que le bundle ignore) reste sans danger : la
      // carte la fait voyager et normalize() ne purge pas les clés racine.
      //
      // modules part VIDE : sa forme, { ordre: [], place: {} }, ne se
      // matérialise que le jour où le joueur range quelque chose.
      modData: {}, modActifs: {}, modules: {}, mods: [],
      // La part ALÉATOIRE d'un jet, et rien d'autre : le reste de l'expression
      // (le bonus, la limite, le kl1) se bâtit dans le bundle. Ce littéral doit
      // suivre DE_DEFAUT de src/fiche/socle/020-version.js.
      de: "d100"
    };
  }

  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function str(v) { return v == null ? "" : String(v); }

  // Le nom d'ATTRIBUT que porte un sigle de règle. Les sigles sont en
  // capitales et peuvent être accentués (DÉT) : un nom d'Attribute Roll20
  // accentué se tape de travers dans une macro et se recopie plus mal encore.
  // On le ramène donc à l'alphabet nu, ici et une seule fois — deux sigles qui
  // ne différeraient que par un accent se confondraient, mais aucun jeu
  // n'écrit deux sigles pareils.
  var SANS_ACCENT = {
    "À": "A", "Á": "A", "Â": "A", "Ä": "A", "Ç": "C", "È": "E", "É": "E",
    "Ê": "E", "Ë": "E", "Ì": "I", "Í": "I", "Î": "I", "Ï": "I", "Ñ": "N",
    "Ò": "O", "Ó": "O", "Ô": "O", "Ö": "O", "Ù": "U", "Ú": "U", "Û": "U",
    "Ü": "U", "Ý": "Y", "Ÿ": "Y"
  };
  function sigleAttr(code) {
    var s = String(code == null ? "" : code).toUpperCase(), r = "", i;
    for (i = 0; i < s.length; i++) r += (SANS_ACCENT[s.charAt(i)] || s.charAt(i));
    return r.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }


  // Copie de l'inventaire SANS les vignettes en data: pour l'attribut de repli
  // mia_inventaire_sys : mia_state (source de vérité) les porte déjà, les
  // dupliquer doublerait le poids des Attributes de la campagne. Le repli n'est
  // relu que pour des fiches partielles : il perd seulement les images fichier.
  // Les autres clés de `inv` (dont opts, les réglages d'affichage) sont
  // recopiées TELLES QUELLES : les énumérer ici les aurait perdues en silence
  // à chaque champ nouveau.
  function invSansVignettes(inv) {
    if (!inv || typeof inv !== "object" || !Array.isArray(inv.objets)) return inv;
    var c = {};
    Object.keys(inv).forEach(function (k) { c[k] = inv[k]; });
    c.objets = inv.objets.map(function (o) {
      if (!o || typeof o !== "object" || String(o.img || "").indexOf("data:") !== 0) return o;
      var oc = {};
      Object.keys(o).forEach(function (k) { oc[k] = o[k]; });
      oc.img = "";
      return oc;
    });
    return c;
  }

  // Même principe pour les mods : leur code source pèse (des dizaines de
  // kilo-octets pour un seul mod bavard, et Roll20 fait voyager chaque
  // Attribute), et mia_state le porte déjà. L'attribut de repli garde de quoi
  // DIRE quels mods tournaient (id, nom, actif, pour, apiMin) sans dupliquer
  // une ligne de code.
  //
  // Le champ de code s'appelle « src » dans la liste des mods ; « code » et
  // « source » sont acceptés parce que la doc et les premiers essais ont connu
  // les deux noms, et qu'un champ de code oublié ici passerait en double sans
  // que rien ne le signale.
  var CLES_CODE = ["src", "code", "source"];
  function modsSansCode(mods) {
    if (!Array.isArray(mods)) return [];
    return mods.map(function (m) {
      if (!m || typeof m !== "object") return m;
      var c = {};
      Object.keys(m).forEach(function (k) { c[k] = m[k]; });
      CLES_CODE.forEach(function (k) {
        // la clé reste, vidée : sa présence dit « ce mod avait du code », et
        // sa disparition ferait croire à un mod sans code au chemin de repli
        if (typeof c[k] === "string" && c[k]) c[k] = "";
      });
      return c;
    });
  }

  // { fullAttrName -> {current, max} }
  function stateToAttrs(state, card) {
    state = state || blank();
    var out = {};
    function put(suffix, current, max) {
      out[PREFIX + suffix] = { current: str(current), max: str(max == null ? "" : max) };
    }

    // ROUND-TRIP COMPLET : l'état entier en un attribut, source de vérité.
    put("state", JSON.stringify(state));

    SCALARS.forEach(function (d) {
      var v = state[d[0]];
      put(d[1], d[2] === "b" ? (v ? 1 : 0) : v);
    });
    // mia_version, réécrit APRÈS la boucle : son `current` reste le SCHÉMA
    // (un entier, pour que hasSheet et les macros gardent un nombre), son
    // `max` porte la version lisible. Personne ne lit ce max ; il voyage avec
    // le diff et raconte à qui ouvre les Attributes quelle fiche a écrit là.
    put("version", state.v, release());
    COLLECTIONS.forEach(function (d) {
      var v = state[d[0]] == null ? blank()[d[0]] : state[d[0]];
      // deux collections partent ALLÉGÉES dans leur attribut de repli : les
      // vignettes en data: de l'inventaire, et le code source des mods. Dans
      // les deux cas mia_state porte l'original ; c'est la duplication, et elle
      // seule, qu'on refuse.
      if (d[0] === "inv") v = invSansVignettes(v);
      else if (d[0] === "mods") v = modsSansCode(v);
      put(d[1], JSON.stringify(v));
    });
    COLLECTIONS_OPT.forEach(function (d) {
      if (state[d[0]] === undefined) return;
      put(d[1], JSON.stringify(state[d[0]]));
    });
    // PV et endurance courants, nullables : conservés à l'exact (null = « au
    // maximum »). Ils ne passent pas par SCALARS parce que leurs noms courts,
    // mia_pv et mia_endurance, appartiennent aux barres de jetons du miroir —
    // qui, elles, remplacent un null par le maximum et perdraient la nuance.
    put("etat_courant", JSON.stringify({
      pv: state.pv == null ? null : state.pv,
      endurance: state.endurance == null ? null : state.endurance
    }));

    // ---- miroir dérivé (macros / barres de jetons), seulement si la carte est fournie ----
    // Il s'écrit APRÈS les attributs de données, et ne les écrase JAMAIS : ses
    // noms de sigles viennent de la page de règles, qui peut en ajouter ou en
    // renommer. Un sigle qui tomberait sur un nom déjà pris (« de », « mods »…)
    // perd son miroir, jamais la donnée — seule celle-ci se relit.
    function miroirSigles(table, prefixe) {
      if (!table || typeof table !== "object") return;
      Object.keys(table).forEach(function (code) {
        var s = sigleAttr(code);
        if (!s) return;
        s = prefixe + s;
        if (Object.prototype.hasOwnProperty.call(out, PREFIX + s)) return;
        put(s, table[code]);
      });
    }
    if (card) {
      var cb = card.combat || {};
      // barres de jetons : courant / max. Un courant null veut dire « au
      // maximum » côté fiche, quand une barre Roll20 vide, elle, se lirait
      // zéro : on écrit donc le maximum plutôt que rien.
      put("pv", cb.pv == null ? cb.pvMax : cb.pv, cb.pvMax);
      put("endurance", cb.endurance == null ? cb.enduranceMax : cb.endurance, cb.enduranceMax);
      // le prestige EFFECTIF, celui qui plafonne les caractéristiques
      if (card.prestige !== undefined) put("prestige", card.prestige);
      // utilisables dans les macros Roll20 : @{Perso|mia_initiative}, etc.
      if (cb.initiative !== undefined) put("initiative", cb.initiative);
      if (cb.vitesse !== undefined) put("vitesse", cb.vitesse);
      if (cb.poids !== undefined) put("poids", cb.poids);
      if (cb.charge !== undefined) put("charge", cb.charge);
      if (cb.recup !== undefined) put("recup", cb.recup);
      // Les totaux par SIGLE. Les compétences prennent un préfixe à elles :
      // rien n'interdit aux règles de donner un jour le même sigle à une
      // caractéristique et à une compétence, et le total de l'une écraserait
      // alors celui de l'autre sans que personne ne s'en aperçoive.
      miroirSigles(card.caracs, "");
      miroirSigles(card.comps, "comp_");
    }
    return out;
  }

  // lecteurs d'attribut : les appelants passent soit {current, max}, soit la
  // seule valeur courante (le pont d20 a connu les deux formes)
  function lecteur(attrs) {
    return function (suffix, champ) {
      var a = attrs[PREFIX + suffix];
      if (a == null) return undefined;
      if (typeof a === "object") return a[champ || "current"];
      return (champ === "max") ? undefined : a;
    };
  }

  // Reconstruction champ par champ : le REPLI. Elle ne connaît que SCALARS,
  // COLLECTIONS et COLLECTIONS_OPT — tout champ d'état qui n'y figure pas est
  // perdu. C'est pour ça qu'elle ne doit jamais servir en douce.
  //
  // ELLE RECONSTRUIT AVEC LA CARTE DU JOUR, toujours, y compris quand les
  // attributs ont été écrits par une AUTRE version de la fiche (une archive
  // qu'on rouvre, ou une fiche enregistrée avant une montée de schéma). Elle
  // rend donc un état dans la forme d'aujourd'hui, à charge pour migre() du
  // bundle de le ramener où il faut — sauf que migre() se fie à `s.v`, qui
  // vient ici de mia_version : c'est le schéma ÉCRIT, pas celui de la carte.
  //
  // Aujourd'hui cela reste sans conséquence : les cartes de la 3.0.0 et du site
  // sont identiques, une seule release de schéma 3 est publiée, et les archives
  // qui embarquent leur propre attrmap (archives[…].attrmap dans le manifeste)
  // remplacent ce module entier avant de lire quoi que ce soit.
  // Le jour où ce ne sera plus vrai, c'est-à-dire le jour où un suffixe
  // d'attribut changera DE FORME entre deux schémas (mia_armes qui passerait
  // d'un tableau à un objet, par exemple), lire un mia_armes de schéma 2 avec
  // la carte du schéma 3 donnerait un champ silencieusement faux. La condition
  // ci-dessous, dans attrsToState, rend ce cas VISIBLE dans la raison du
  // diagnostic : elle se déclenche dès que le schéma écrit diffère du nôtre,
  // avant même qu'un tel changement de forme existe.
  function reconstruire(cur) {
    var s = blank();
    SCALARS.forEach(function (d) {
      var v = cur(d[1]);
      if (v === undefined) return;
      if (d[2] === "n") { if (v !== "" && isFinite(parseFloat(v))) s[d[0]] = num(v); }
      else if (d[2] === "N") s[d[0]] = (v === "" || v == null || !isFinite(parseFloat(v))) ? null : num(v);
      else if (d[2] === "b") s[d[0]] = String(v) === "1" || String(v) === "true";
      else s[d[0]] = str(v);
    });
    COLLECTIONS.forEach(function (d) {
      var v = cur(d[1]);
      if (v === undefined || v === "") return;
      try { var o = JSON.parse(v); if (o != null) s[d[0]] = o; } catch (e) {}
    });
    COLLECTIONS_OPT.forEach(function (d) {
      var v = cur(d[1]);
      if (v === undefined || v === "") return;
      try { var o = JSON.parse(v); if (o != null) s[d[0]] = o; } catch (e) {}
    });
    var ec = cur("etat_courant");
    if (ec !== undefined && ec !== "") {
      try {
        var o2 = JSON.parse(ec);
        // une clé absente vaut null, c'est-à-dire « au maximum », et non zéro :
        // un mia_etat_courant écrit avant l'endurance ne porte que les PV, et
        // le lire comme un zéro coucherait le personnage à l'ouverture
        s.pv = (o2 && o2.pv != null) ? o2.pv : null;
        s.endurance = (o2 && o2.endurance != null) ? o2.endurance : null;
      } catch (e) {}
    }
    return s;
  }

  // Accroche le diagnostic à l'état SANS le rendre visible.
  //
  // Compatibilité : les appelants d'avant 3.0.0 écrivent
  // `var state = M.attrsToState(attrs)` puis JSON.stringify(state). Rendre un
  // objet enveloppe {state, …} leur ferait persister l'enveloppe. On rend donc
  // l'état LUI-MÊME, avec state/degrade/raison en propriétés NON ÉNUMÉRABLES :
  // JSON.stringify et Object.keys les ignorent, `r.degrade` et `r.state`
  // marchent. `r.state` pointe sur r : la boucle est sans danger, une
  // propriété non énumérable ne fait pas récurser JSON.stringify.
  function attacher(state, degrade, raison) {
    var diag = { state: state, degrade: degrade, raison: raison };
    ["state", "degrade", "raison"].forEach(function (k) {
      // un champ d'état qui porterait ce nom prime : on ne l'écrase pas (le
      // diagnostic reste lisible par M.diagnostic()).
      if (Object.prototype.hasOwnProperty.call(state, k)) return;
      try {
        Object.defineProperty(state, k, {
          value: diag[k], enumerable: false, writable: true, configurable: true
        });
      } catch (e) {}
    });
    return state;
  }

  // attrs : { fullAttrName -> {current, max} } ou { fullAttrName -> current }.
  //
  // Rend l'état, porteur de { state, degrade, raison } :
  //   degrade = null        -> mia_state lu normalement, état complet ;
  //   degrade = "illisible" -> mia_state PRÉSENT mais impossible à lire.
  //                            L'état rendu est la MEILLEURE reconstruction
  //                            possible, à afficher éventuellement, JAMAIS à
  //                            réécrire : la sauvegarder amputerait la fiche.
  //                            L'appelant doit geler les écritures.
  //   degrade = "partiel"   -> pas de mia_state, absent ou VIDÉ :
  //                            reconstruction champ par champ. Ce seul mot
  //                            recouvre deux situations opposées, que la raison
  //                            sépare :
  //                              - personnage NEUF (aucun attribut mia_) :
  //                                raison === RAISON_SANS_FICHE, il n'y a rien
  //                                à perdre, rien à geler ;
  //                              - personnage qui A une fiche, dont mia_state a
  //                                disparu pendant que ses autres attributs
  //                                mia_ sont restés : la reconstruction est
  //                                amputée exactement comme dans le cas
  //                                « illisible » (ni code des mods, ni
  //                                vignettes d'inventaire, ni champ sans
  //                                attribut à lui), et l'appelant doit geler
  //                                tout autant.
  // Note ajoutée à la raison quand on reconstruit des attributs qui ne sont pas
  // du schéma de cette carte (voir le long commentaire de reconstruire()).
  // Le schéma écrit se lit sur le scalaire mia_version, qui reste lisible même
  // quand mia_state ne l'est plus : c'est justement le cas qui compte.
  function noteDeCarte(cur) {
    var v = cur("version");
    var n = (v === undefined || v === "") ? NaN : parseFloat(v);
    if (!isFinite(n) || n === SCHEMA_DEFAUT) return "";
    return " ; attributs écrits en schéma " + n + ", reconstruits avec la carte" +
           " du schéma " + SCHEMA_DEFAUT + " (un champ qui aurait changé de forme" +
           " entre ces deux schémas serait lu de travers)";
  }

  // La raison du personnage NEUF, nommée et exportée. C'est le seul cas
  // « partiel » sans danger, et l'appelant a besoin de le reconnaître pour ne
  // pas geler une fiche qui n'existe pas encore. Il le fait en comparant à
  // cette constante plutôt qu'en relisant la prose (qui se réécrit) ou en
  // refaisant le compte des attributs de son côté (deux critères pour la même
  // question finiraient par se contredire).
  var RAISON_SANS_FICHE = "aucun attribut mia_ : personnage sans fiche";

  function attrsToState(attrs) {
    attrs = attrs || {};
    var cur = lecteur(attrs);
    var full = cur("state");

    if (full !== undefined && full !== "") {
      var lu = null, raison = null;
      try {
        var fs = JSON.parse(full);
        if (fs && typeof fs === "object" && !Array.isArray(fs)) lu = fs;
        else raison = "mia_state ne porte pas un objet d'état";
      } catch (e) {
        raison = "mia_state illisible : " + ((e && e.message) ? e.message : String(e));
      }
      if (lu) return attacher(lu, null, null);
      return attacher(reconstruire(cur), "illisible",
                      raison + " (" + String(full).length + " caractères)" + noteDeCarte(cur));
    }

    var vide = !Object.keys(attrs).some(isMiaAttr);
    return attacher(reconstruire(cur), "partiel",
                    vide ? RAISON_SANS_FICHE
                         : "mia_state absent : reconstruction champ par champ" + noteDeCarte(cur));
  }

  // Le diagnostic seul, en objet nu — pour l'appelant qui préfère ne pas
  // dépendre des propriétés accrochées à l'état.
  function diagnostic(attrs) {
    var s = attrsToState(attrs);
    return { state: s, degrade: s.degrade, raison: s.raison };
  }

  // Version de la fiche qui a écrit ces attributs, SANS reconstruire l'état :
  //   { schema, release } — schema = entier de format (state.v), release = le
  //   numéro lisible ("3.0.0") ; null si le personnage n'a pas de fiche.
  // Le schéma vient d'abord de mia_state (seule source que la fiche met à jour
  // en migrant), puis du scalaire mia_version — qui reste lisible même quand
  // mia_state ne l'est plus, et c'est justement ce cas-là qui compte.
  function ficheDe(attrs) {
    attrs = attrs || {};
    var cur = lecteur(attrs);
    var schema = null, rel = null;

    var full = cur("state");
    if (full !== undefined && full !== "") {
      try {
        var fs = JSON.parse(full);
        if (fs && typeof fs === "object" && !Array.isArray(fs)) {
          if (isFinite(parseFloat(fs.v))) schema = num(fs.v);
          // L'état porte sa release sous « rel » (voir SCALARS : ["rel",
          // "release", "s"]) ; « release » n'est lu qu'en second, pour un état
          // venu d'ailleurs. Ne chercher que « release » faisait toujours
          // retomber sur le max de mia_version, que l'amorce réécrit à la
          // version DU SITE : une fiche enregistrée par une archive paraissait
          // à jour et se rouvrait avec le bundle du jour.
          if (typeof fs.rel === "string" && fs.rel) rel = fs.rel;
          else if (typeof fs.release === "string" && fs.release) rel = fs.release;
        }
      } catch (e) {}
    }
    var vc = cur("version"), vm = cur("version", "max");
    if (schema === null && vc !== undefined && vc !== "" && isFinite(parseFloat(vc))) schema = num(vc);
    if (rel === null && typeof vm === "string" && vm) rel = vm;

    if (schema === null && rel === null) {
      // ni version ni état : reste le cas d'une fiche écrite avant mia_version
      if (!Object.keys(attrs).some(isMiaAttr)) return null;
      return { schema: null, release: null };
    }
    return { schema: schema, release: rel };
  }

  function isMiaAttr(name) { return typeof name === "string" && name.indexOf(PREFIX) === 0; }
  // une fiche MIA existe si l'attribut de version est présent
  function hasSheet(names) {
    if (!names) return false;
    var list = Array.isArray(names) ? names : Object.keys(names);
    return list.indexOf(PREFIX + "version") >= 0;
  }

  var api = {
    PREFIX: PREFIX,
    RELEASE: RELEASE_DEFAUT,
    SCHEMA: SCHEMA_DEFAUT,
    RAISON_SANS_FICHE: RAISON_SANS_FICHE,
    release: release,
    setRelease: setRelease,
    stateToAttrs: stateToAttrs,
    attrsToState: attrsToState,
    diagnostic: diagnostic,
    ficheDe: ficheDe,
    modsSansCode: modsSansCode,
    isMiaAttr: isMiaAttr,
    hasSheet: hasSheet,
    blank: blank
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MiaAttrMap = api;
})(typeof window !== "undefined" ? window : this);
