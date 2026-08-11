/* Correspondance fiche Outward <-> Attributes Roll20 (natifs par valeur).
 *
 * La fiche (owd-fiche.js, réutilisée telle quelle sur le site et dans Roll20)
 * travaille sur un objet `state` imbriqué. Roll20 stocke des Attributes plats
 * {name, current, max}. Ce module fait la traduction, DANS LES DEUX SENS et
 * SANS PERTE :
 *   - stateToAttrs(state, card) : décompose l'état en attributs Roll20.
 *   - attrsToState(attrs)       : reconstruit l'état depuis les attributs,
 *                                 EN DISANT dans quel état il l'a trouvé.
 *   - ficheDe(attrs)            : la version de la fiche, sans reconstruire.
 *   - setRelease(r)             : dit quelle release TOURNE (voir release()).
 *
 * TOUS les attributs produits commencent par « owd_ ». Trois familles :
 *   - SOURCE DE VÉRITÉ : `owd_state` porte l'état ENTIER en JSON. C'est lui
 *     qu'on relit pour reconstruire la fiche : il ne dérive JAMAIS quand
 *     owd-fiche.js gagne un champ. attrsToState le préfère à tout le reste ;
 *     la reconstruction champ par champ n'est qu'un repli.
 *   - NATIFS (repli + macros) : un attribut par valeur / collection.
 *   - MIROIR (écrits seulement si `card` est fourni) : valeurs DÉRIVÉES pour
 *     les macros et les barres de jetons — caractéristiques TOTALES
 *     (@{Perso|owd_resistance}), jauges courant/max, charge, effondrement.
 *     Jamais relus : la fiche les recalcule.
 *
 * LA RÈGLE DU MIROIR EXACT, à vérifier AVANT d'ajouter la moindre ligne :
 * toute clé de blank() figure dans SCALARS ou dans COLLECTIONS, et AUCUN
 * suffixe ne sert deux fois. Un miroir qui reprendrait le nom d'un scalaire
 * l'écraserait en silence, et le repli relirait la valeur DÉRIVÉE en croyant
 * relire la saisie. C'est pour tenir cette règle sans exception que les treize
 * maximums forcés vivent dans UNE collection éparse (`maxForce`) et les dix
 * valeurs courantes dans UNE autre (`etat`, suffixe `etat_courant`) : les
 * suffixes owd_pv, owd_pe, owd_charge… restent alors libres pour le MIROIR,
 * qui est justement ce que les barres de jetons veulent lire.
 *
 * LE PIÈGE QUE CE MODULE DOIT ÉVITER. Un owd_state impossible à lire (il
 * suffit qu'un joueur tape un caractère dans l'onglet Attributes de Roll20)
 * ferait tomber SANS UN MOT sur la reconstruction champ par champ. La fiche
 * monterait quand même, puis la première sauvegarde réécrirait un owd_state
 * AMPUTÉ de tout ce que le repli ne sait pas porter. D'où le diagnostic
 * `degrade` : l'appelant peut GELER la fiche au lieu d'écraser des données
 * qu'il n'a pas su lire.
 *
 * Le même piège a une SECONDE porte, et elle est plus large : un owd_state
 * VIDÉ. Il pèse des centaines de kilo-octets dans l'onglet Attributes, ce qui
 * donne très envie d'y faire le ménage. L'attribut disparu, le diagnostic
 * n'est plus « illisible » mais « partiel », qui couvre aussi le personnage
 * NEUF, où il n'y a rien à perdre. La raison sépare les deux
 * (RAISON_SANS_FICHE), pour que l'appelant gèle le premier cas sans geler le
 * second. Sans cette séparation, VIDER l'attribut le plus lourd du personnage
 * serait PLUS destructeur que le corrompre.
 *
 * Logique PURE, sans API navigateur : testable en node.
 *
 * Ce fichier vit sur le SITE (chargé par roll20-fiche.html avant
 * owd-roll20-boot.js) : le format des Attributes évolue avec la fiche, sans
 * jamais re-signer l'extension Roll20, qui n'est qu'une coquille — et dont le
 * paquet 1.0.0.1 est SIGNÉ et GELÉ.
 */
(function (root) {
  "use strict";

  var PREFIX = "owd_";

  // UN SUFFIXE RÉSERVÉ, ET IL N'EST PAS DANS LES TABLES : owd_backup appartient
  // à l'amorce, qui y met la fiche à l'abri avant une montée de version et la
  // relit dans le personnage pour « Restaurer l'état d'origine ». Cette carte ne
  // l'écrit JAMAIS et ne le lit jamais ; il est interdit à tout le reste. Le
  // reprendre pour un miroir ou un repli écraserait le seul filet du protocole
  // de mise à niveau, au moment précis où il sert.

  // Numéro de version LISIBLE de la fiche, publié dans le `max` de
  // owd_version. Le manifeste en est la source unique quand il est là ; la
  // constante n'est qu'un repli (node, et l'amorceur de secours qui charge
  // sans manifeste).
  // Le « b » final marque la branche beta : le joueur voit sur quel site il
  // est. Il ne change PAS le rang du numéro (« 1.0.0b » et « 1.0.0 » sont la
  // même version, la beta étant ce que le stable recevra à la fusion) : ce qui
  // compare des versions doit donc l'ôter avant de lire les nombres, et c'est
  // exactement ce que fait OwdMods.compareVersions.
  var RELEASE_DEFAUT = "1.1.0b";
  // Entier INDÉPENDANT de la release : il ne monte qu'au changement de forme de
  // l'état du personnage, jamais parce que le majeur a bougé. Ajouter une clé
  // racine avec un défaut n'en est PAS un : normalize() complète une clé
  // absente et ne purge aucune clé racine inconnue, donc une telle fiche
  // s'ouvre dans les deux sens sans migration. Le manifeste publie les deux
  // numéros séparément, et c'est ce repli-ci que l'amorce prend quand le
  // manifeste manque.
  var SCHEMA_DEFAUT = 1;

  // Release EFFECTIVE : celle du code qui TOURNE, pas celle que le site publie.
  //
  // Le manifeste dit ce que le site sert AUJOURD'HUI. Quand l'amorce charge une
  // ARCHIVE (« ouvrir avec sa version »), c'est un bundle plus ancien qui écrit
  // les Attributes, sous le manifeste du jour : lire le manifeste inscrirait
  // alors la version DU SITE dans le max de owd_version, et la fiche d'archive
  // paraîtrait à jour. D'où ce réglage, posé par l'amorce AVANT la première
  // écriture : M.setRelease("1.0.0").
  //
  // Il est rangé sur `root` (window) et non dans une variable de module, parce
  // qu'une archive amène souvent SA carte d'attributs (archives[…].attrmap) :
  // le module est alors remplacé, et une variable interne serait perdue au
  // remplacement. Le global, lui, survit — et la carte de l'archive, qui porte
  // le même code, le relira.
  function setRelease(r) {
    if (typeof r === "string" && r) { try { root.__owdRelease = r; } catch (e) {} }
    else { try { root.__owdRelease = null; } catch (e2) {} }   // null = revenir au manifeste
    return release();
  }
  function release() {
    // 1. la release effective posée par l'amorce (archive en cours) ;
    var r = root && root.__owdRelease;
    if (typeof r === "string" && r) return r;
    // 2. sinon le manifeste, qui dit la version servie par le site ;
    var m = root && root.__owdManifeste;
    if (m && typeof m.release === "string" && m.release) return m.release;
    // 3. sinon la constante (node, et l'amorceur de secours sans manifeste).
    return RELEASE_DEFAUT;
  }

  // champ d'état scalaire -> [clé d'état, suffixe, type]
  //   n = nombre, s = chaîne libre, b = booléen,
  //   N = nombre NULLABLE : "" vaut null et non 0 (les « forcé » du MJ, où vide
  //       veut dire « valeur calculée » — les confondre avec 0 clouerait une
  //       capacité à zéro sur le chemin de repli).
  //
  // TREIZE, et pas un de plus. Les maximums forcés du MJ ne sont PAS ici :
  // ils vivent tous dans la collection éparse `maxForce`. Une capacité de plus
  // n'ajoute alors ni clé racine, ni suffixe, ni ligne dans cette table — et
  // surtout, aucun d'eux ne vient disputer au MIROIR les suffixes que les
  // barres de jetons lisent.
  var SCALARS = [
    ["name", "nom", "s"], ["espece", "espece", "s"], ["age", "age", "s"],
    ["sexe", "sexe", "s"], ["genre", "genre", "s"],
    ["portrait", "portrait", "s"],
    ["background", "background", "s"], ["notes", "notes", "s"],
    ["de", "de", "s"],
    ["xpTotal", "xp_total", "n"],
    ["argent", "argent", "n"],
    ["v", "version", "n"], ["rel", "release", "s"]
  ];

  // champ d'état collection (objet/tableau) -> suffixe (stocké en JSON)
  var COLLECTIONS = [
    ["caracs", "caracs"],
    // Deux modificateurs qui s'additionnent (équipement / décision du MJ), et
    // un forçage épars où une clé présente REMPLACE la somme. Tous les leviers
    // des Options voyagent, y compris sur le chemin de repli : en JJK, les
    // seconds modificateurs et les forçages de caractéristiques ont manqué ici
    // depuis leur création, et une fiche reconstruite sans jjk_state les
    // perdait en silence alors même qu'ils changent des totaux affichés.
    ["caracsMod", "caracs_mod"], ["caracsMod2", "caracs_mod2"],
    ["caracsForce", "caracs_force"],
    // Les VALEURS COURANTES des jauges, toutes ensemble et à l'exact :
    // null = « au maximum » se conserve, ce qu'un attribut de nombre perdrait
    // (il rendrait 0, c'est-à-dire un personnage vidé de tout).
    ["etat", "etat_courant"],
    // Les maximums forcés, épars. Absent = calculé, et ce n'est PAS 0.
    ["maxForce", "max_force"],
    // Les modificateurs à trois emplacements de toutes les capacités.
    ["divers", "divers"],
    // Le tableau des compétences, à id stable : c'est LUI la liste, les règles
    // d'Outward n'en donnant aucune. Le perdre au repli effacerait des noms que
    // le joueur seul a écrits, et que rien d'autre ne sait redire.
    ["comps", "competences"],
    ["compsMod", "comps_mod"], ["compsMod2", "comps_mod2"],
    ["compsForce", "comps_force"], ["compsDesForce", "comps_des_force"],
    ["techniques", "techniques"],
    ["armes", "armes"], ["vetements", "vetements"],
    ["inv", "inventaire"],
    // Les quatre clés du dispositif de modules et de mods.
    // modules : le RANGEMENT SEUL, { ordre: [ids], place: {id:{onglet,colonne}} },
    // et RIEN d'autre. Format ÉPARS : seules les différences avec la disposition
    // d'origine sont écrites, jamais la liste complète des identifiants. Deux
    // raisons, et elles sont durables : un module natif ajouté par une version
    // ultérieure apparaît quand même chez un personnage rangé avant lui (il
    // n'est pas cité, donc il garde sa place d'origine) ; et un identifiant
    // disparu (mod retiré, natif renommé) ne casse rien, il reste une clé que
    // personne ne réclame.
    // La disposition ne dit QUE le rangement : ce qui est allumé ou coupé vit
    // dans modActifs, SEUL interrupteur. Deux endroits pour dire la même chose
    // finiraient par se contredire chez un joueur, et la carte n'aurait aucun
    // moyen de trancher lequel a raison.
    ["modules", "modules"],
    // Coffres privés des mods et des modules, { id: objet libre }. Leur contenu
    // n'est PAS interprété ici : c'est la donnée d'un module, la carte se
    // contente de la faire voyager entière.
    ["modData", "mod_donnees"],
    // Interrupteurs des modules, { id: false } pour les SEULS modules coupés.
    // Épars lui aussi, et pour la même raison : un module qui n'y figure pas est
    // allumé, donc un module ajouté demain s'affiche chez tout le monde, et un
    // module retiré ne laisse aucune trace.
    ["modActifs", "mod_actifs"],
    // Liste des mods, [{ id, nom, actif, pour, apiMin, src }]. L'attribut de
    // repli passe par modsSansCode() : voir plus bas, le code source ne se
    // duplique pas hors de owd_state.
    ["mods", "mods"]
  ];

  // Collections qui n'existent PAS dans blank() : elles ne sont écrites que si
  // l'état en porte, et relues que si l'attribut est là. Sans ça, la
  // reconstruction inventerait un champ que la fiche ne connaît pas.
  // grenier et vHist viennent du moteur de migration (owd-migrations.js) : ils
  // vivent à la RACINE de l'état, hors de blank(), et n'apparaissent que le
  // jour où un pas de migration s'en sert. Ils comptent doublement ici : le
  // grenier porte ce qu'une version d'arrivée ne sait pas encore afficher mais
  // doit rendre en redescendant, et le laisser hors du repli le perdrait
  // précisément le jour où la fiche redescend de version.
  var COLLECTIONS_OPT = [
    ["grenier", "grenier"],
    ["vHist", "v_hist"]
  ];

  // état par défaut : MIROIR EXACT de blank() de owd-fiche.js (mêmes clés,
  // mêmes valeurs). Il sert de socle à la reconstruction champ par champ : un
  // attribut absent laisse la valeur par défaut. Toute clé ajoutée là-bas doit
  // arriver ici ET dans SCALARS ou COLLECTIONS, sinon le repli la perd.
  function blank() {
    return {
      // v porte le SCHÉMA, rel la release lisible. Le chemin de repli les
      // perdrait sans ça, et une fiche relue sans owd_state repartirait en
      // schéma 1 — c'est-à-dire qu'elle se ferait re-migrer indéfiniment.
      v: SCHEMA_DEFAUT, rel: RELEASE_DEFAUT,

      // ---- identité ----
      name: "", portrait: "", espece: "", age: "", sexe: "", genre: "",
      background: "", notes: "",

      // ---- expérience ----
      // Les règles ne donnent AUCUNE dotation de départ : le total part à zéro
      // et se saisit dans l'en-tête. Le dépensé, lui, se CALCULE (rangs des
      // compétences + coût saisi des techniques) et ne se range jamais dans
      // l'état : deux endroits pour dire la même chose finiraient par se
      // contredire.
      xpTotal: 0,

      // ---- caractéristiques ----
      // Les CLÉS sont SANS ACCENT : elles voyagent en nom d'attribut Roll20 et
      // en fragment de macro (@{Perso|owd_resistance}). Les libellés accentués
      // vivent dans la table d'affichage du bundle, jamais dans l'état.
      // 20 est la moyenne humaine ; l'échelle n'a pas de plafond et la carte
      // n'en invente pas — aucune borne haute n'est écrite ici.
      caracs: { Force: 20, Dexterite: 20, Intelligence: 20, Ferveur: 20,
                Vigueur: 20, Endurance: 20, Resistance: 20, Chance: 20 },
      caracsMod: { Force: 0, Dexterite: 0, Intelligence: 0, Ferveur: 0,
                   Vigueur: 0, Endurance: 0, Resistance: 0, Chance: 0 },
      caracsMod2: { Force: 0, Dexterite: 0, Intelligence: 0, Ferveur: 0,
                    Vigueur: 0, Endurance: 0, Resistance: 0, Chance: 0 },
      // ÉPARSE, et NULLABLE par l'absence : une clé présente REMPLACE la somme,
      // elle ne s'y ajoute pas. Absente n'est pas 0.
      caracsForce: {},

      // ---- ce que le personnage porte à l'instant ----
      // null = « au maximum » : la valeur SUIT le maximum quand il bouge, ce
      // qu'un nombre figé ne ferait pas — et le maximum de PV et de PE bouge
      // tout seul, à chaque niveau d'effondrement.
      // expo et contenance partent de 0, qui est une VRAIE valeur (exposition
      // nulle, ventre vide) et non un repli : elles ne sont donc pas nullables.
      etat: { pv: null, pe: null, pm: null, pi: null,
              pr: null, ps: null, ph: null,
              expo: 0, contenance: 0, rupture: null },

      // Maximums FORCÉS, épars : une clé présente remplace le calcul, une clé
      // absente laisse calculer. Clés connues : pv pe pm pi pr ps ph charge
      // acces contenance expo rupture desAction effondrement.
      maxForce: {},

      // Modificateurs à TROIS emplacements (équipement / technique / autre).
      divers: {
        pv: [0, 0, 0], pe: [0, 0, 0], pm: [0, 0, 0], pi: [0, 0, 0],
        pr: [0, 0, 0], ps: [0, 0, 0], ph: [0, 0, 0],
        charge: [0, 0, 0], acces: [0, 0, 0], contenance: [0, 0, 0],
        expo: [0, 0, 0], rupture: [0, 0, 0], desAction: [0, 0, 0],
        // Le seul modificateur qui joue sur un NIVEAU et non sur des points.
        effondrement: [0, 0, 0]
      },

      // ---- compétences ----
      // LES RÈGLES NE DONNENT AUCUNE LISTE DE COMPÉTENCES : le joueur les nomme
      // toutes. D'où un TABLEAU d'entrées à `id` STABLE, et non une carte
      // indexée par le nom — renommer une compétence perdrait sinon son rang et
      // ses modificateurs du même geste, sans un mot.
      // Une entrée : { id, nom, groupe, rang }, rang entier de 0 à 5.
      comps: [],
      // Cartes ÉPARSES indexées par l'ID de la compétence, jamais par son nom.
      compsMod: {}, compsMod2: {},
      compsForce: {},        // bonus TOTAL forcé : remplace rang + modificateurs
      compsDesForce: {},     // nombre de dés engageables forcé : remplace le rang

      // ---- techniques ----
      // Les rangs d'une technique LUI APPARTIENNENT : les règles le disent, la
      // fiche ne les barème donc pas et se contente de les compter.
      // Une entrée : { id, nom, rang, rangs, xp, rupture, desc }.
      techniques: [],

      // ---- équipement ----
      // Une arme est un RÉPERTOIRE, pas une attaque : sa ligne (prise, parade,
      // réduction, compétence qui porte le jet) et ses gestes. `comp` est l'ID
      // d'une entrée de `comps` — jamais son nom, qui se renomme.
      armes: [],
      // Ce que le personnage porte contre le froid et le chaud, compté en
      // degrés, et ce qu'il pèse : { id, nom, froid, chaud, poids, porte, note }.
      vetements: [],
      argent: 0,             // pièces d'argent : la monnaie du livre, nommée

      // Inventaire illustré. `groupes` est un tableau de CHAÎNES et `comptes`
      // un tableau PARALLÈLE de booléens : décocher pose le groupe au sol — son
      // poids sort de la charge, ses objets restent entiers. Une clé de `inv`
      // absente de ce miroir serait une perte sèche au repli.
      inv: {
        groupes: ["Sur soi"], comptes: [true], objets: [],
        opts: { cols: 4, nom: true, qte: true, poids: false, total: true, vign: true }
      },

      // ---- le dé des jets ----
      // Tous les dés du jeu sont des d8. Le champ reste modifiable : c'est un
      // réglage de table, pas une règle que la fiche imposerait.
      de: "1d8",

      // ---- le dispositif de modules et de mods : QUATRE clés racine ----
      // Toutes avec un défaut vide : les ajouter ne fait pas monter le schéma,
      // mais les omettre ICI les perdrait sur le chemin de repli. Le sens qu'il
      // faut vérifier à chaque ajout est celui-là : une clé racine du bundle
      // absente de ce blank() serait une perte sèche. L'inverse (une clé d'ici
      // que le bundle ignore) reste sans danger : la carte la fait voyager et
      // normalize() ne purge pas les clés racine.
      modules: {}, modData: {}, modActifs: {}, mods: []
    };
  }

  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function str(v) { return v == null ? "" : String(v); }

  // Copie de l'inventaire SANS les vignettes en data: pour l'attribut de repli
  // owd_inventaire : owd_state (source de vérité) les porte déjà, les dupliquer
  // doublerait le poids des Attributes de la campagne. Le repli n'est relu que
  // pour des fiches partielles : il perd seulement les images fichier.
  // Les autres clés de `inv` (dont opts, les réglages d'affichage) sont
  // recopiées TELLES QUELLES : les énumérer ici les aurait perdues en silence à
  // chaque champ nouveau.
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
  // Attribute), et owd_state le porte déjà. L'attribut de repli garde de quoi
  // DIRE quels mods tournaient (id, nom, actif, pour, apiMin) sans dupliquer
  // une ligne de code.
  //
  // Le champ de code s'appelle « src » dans la liste des mods ; « code » et
  // « source » sont acceptés parce que la documentation et les premiers essais
  // ont connu les trois noms, et qu'un champ de code oublié ici passerait en
  // double sans que rien ne le signale.
  var CLES_CODE = ["src", "code", "source"];
  function modsSansCode(mods) {
    if (!Array.isArray(mods)) return [];
    return mods.map(function (m) {
      if (!m || typeof m !== "object") return m;
      var c = {};
      Object.keys(m).forEach(function (k) { c[k] = m[k]; });
      CLES_CODE.forEach(function (k) {
        // la clé reste, VIDÉE : sa présence dit « ce mod avait du code », et sa
        // disparition ferait croire à un mod sans code au chemin de repli
        if (typeof c[k] === "string" && c[k]) c[k] = "";
      });
      return c;
    });
  }

  // { fullAttrName -> {current, max} }
  //
  // `card` est le bilan des valeurs DÉRIVÉES que la fiche vient de calculer :
  //   { caracs: { Force, Dexterite, … },
  //     capacites: { pv, pvMax, pe, peMax, pm, pmMax, pi, piMax, pr, prMax,
  //                  ps, psMax, ph, phMax, expo, expoMax, chargePorte, charge,
  //                  accesPris, acces, contenancePrise, contenance,
  //                  rupture, ruptureMax, effondrement, desAction, xpDepense } }
  // Il est FACULTATIF : sans lui, aucun attribut miroir n'est écrit, et la
  // fiche se relit exactement pareil.
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
    // owd_version, réécrit APRÈS la boucle : son `current` reste le SCHÉMA (un
    // entier, pour que hasSheet et les macros gardent un nombre), son `max`
    // porte la version lisible. Personne ne lit ce max ; il voyage avec le diff
    // et raconte à qui ouvre l'onglet Attributes quelle fiche a écrit là.
    put("version", state.v, release());
    COLLECTIONS.forEach(function (d) {
      var v = state[d[0]] == null ? blank()[d[0]] : state[d[0]];
      // deux collections partent ALLÉGÉES dans leur attribut de repli : les
      // vignettes en data: de l'inventaire, et le code source des mods. Dans
      // les deux cas owd_state porte l'original ; c'est la duplication, et elle
      // seule, qu'on refuse.
      if (d[0] === "inv") v = invSansVignettes(v);
      else if (d[0] === "mods") v = modsSansCode(v);
      put(d[1], JSON.stringify(v));
    });
    COLLECTIONS_OPT.forEach(function (d) {
      if (state[d[0]] === undefined) return;
      put(d[1], JSON.stringify(state[d[0]]));
    });

    // ---- miroir dérivé (macros / barres de jetons), seulement si la carte est fournie ----
    // AUCUN de ces suffixes n'apparaît dans SCALARS ni dans COLLECTIONS : la
    // liste a été vérifiée une par une, et elle doit l'être à chaque ajout.
    if (card) {
      var cc = card.caracs || {};
      // TOTAUX, utilisables en macro : @{Perso|owd_force}, @{Perso|owd_resistance}
      put("force", cc.Force);               put("dexterite", cc.Dexterite);
      put("intelligence", cc.Intelligence); put("ferveur", cc.Ferveur);
      put("vigueur", cc.Vigueur);           put("endurance", cc.Endurance);
      put("resistance", cc.Resistance);     put("chance", cc.Chance);

      var k = card.capacites || {};
      // BARRES DE JETON : current / max. Un courant null vaut le maximum, sinon
      // la barre du jeton afficherait un vide pour un personnage intact.
      put("pv", k.pv == null ? k.pvMax : k.pv, k.pvMax);
      put("pe", k.pe == null ? k.peMax : k.pe, k.peMax);
      // PM : aucune règle ne donne son maximum, il vaut 0 tant qu'une règle ne
      // le fixe pas. Le miroir le dit tel quel plutôt que d'inventer un nombre.
      put("pm", k.pm == null ? k.pmMax : k.pm, k.pmMax);
      put("pi", k.pi == null ? k.piMax : k.pi, k.piMax);
      put("pr", k.pr == null ? k.prMax : k.pr, k.prMax);
      put("ps", k.ps == null ? k.psMax : k.ps, k.psMax);
      put("ph", k.ph == null ? k.phMax : k.ph, k.phMax);
      // L'exposition est SIGNÉE : le max porte la borne HAUTE, la borne basse
      // est son opposée. Deux attributs pour dire un nombre symétrique
      // n'apprendraient rien de plus à une macro, et le signe du courant suffit
      // à lire le sens.
      put("expo", k.expo, k.expoMax);
      put("charge", k.chargePorte, k.charge);
      put("acces", k.accesPris, k.acces);
      put("contenance", k.contenancePrise, k.contenance);
      put("rupture", k.rupture, k.ruptureMax);
      put("effondrement", k.effondrement, 10);
      put("des_action", k.desAction);
      put("xp_depense", k.xpDepense);
    }
    return out;
  }

  // lecteurs d'attribut : les appelants passent soit {current, max}, soit la
  // seule valeur courante (le pont de l'extension a connu les deux formes)
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
  // rend donc un état dans la forme d'aujourd'hui, à charge pour le moteur de
  // migration du bundle de le ramener où il faut — sauf que celui-ci se fie à
  // `s.v`, qui vient ici de owd_version : c'est le schéma ÉCRIT, pas celui de
  // la carte.
  //
  // Aujourd'hui cela reste sans conséquence : une seule release de schéma 1 est
  // publiée, aucune archive n'existe, et celles qui embarqueront leur propre
  // carte (archives[…].attrmap dans le manifeste) remplaceront ce module entier
  // avant de lire quoi que ce soit. Le jour où ce ne sera plus vrai,
  // c'est-à-dire le jour où un suffixe d'attribut changera DE FORME entre deux
  // schémas (owd_armes qui passerait d'un tableau à un objet, par exemple),
  // lire un owd_armes de schéma 1 avec la carte du schéma 2 donnerait un champ
  // silencieusement faux. noteDeCarte() rend ce cas VISIBLE dans la raison du
  // diagnostic, et se déclenche dès que le schéma écrit diffère du nôtre, avant
  // même qu'un tel changement de forme existe.
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
    return s;
  }

  // Accroche le diagnostic à l'état SANS le rendre visible.
  //
  // Un appelant écrit couramment `var state = M.attrsToState(attrs)` puis
  // JSON.stringify(state). Rendre un objet enveloppe {state, …} lui ferait
  // persister l'enveloppe. On rend donc l'état LUI-MÊME, avec
  // state/degrade/raison en propriétés NON ÉNUMÉRABLES : JSON.stringify et
  // Object.keys les ignorent, `r.degrade` et `r.state` marchent. `r.state`
  // pointe sur r : la boucle est sans danger, une propriété non énumérable ne
  // fait pas récurser JSON.stringify.
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

  // Note ajoutée à la raison quand on reconstruit des attributs qui ne sont pas
  // du schéma de cette carte (voir le long commentaire de reconstruire()). Le
  // schéma écrit se lit sur le scalaire owd_version, qui reste lisible même
  // quand owd_state ne l'est plus : c'est justement le cas qui compte.
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
  var RAISON_SANS_FICHE = "aucun attribut owd_ : personnage sans fiche";

  // attrs : { fullAttrName -> {current, max} } ou { fullAttrName -> current }.
  //
  // Rend l'état, porteur de { state, degrade, raison } :
  //   degrade = null        -> owd_state lu normalement, état complet ;
  //   degrade = "illisible" -> owd_state PRÉSENT mais impossible à lire.
  //                            L'état rendu est la MEILLEURE reconstruction
  //                            possible, à afficher éventuellement, JAMAIS à
  //                            réécrire : la sauvegarder amputerait la fiche.
  //                            L'appelant doit geler les écritures.
  //   degrade = "partiel"   -> pas de owd_state, absent ou VIDÉ :
  //                            reconstruction champ par champ. Ce seul mot
  //                            recouvre deux situations opposées, que la raison
  //                            sépare :
  //                              - personnage NEUF (aucun attribut owd_) :
  //                                raison === RAISON_SANS_FICHE, il n'y a rien
  //                                à perdre, rien à geler ;
  //                              - personnage qui A une fiche, dont owd_state a
  //                                disparu pendant que ses autres attributs
  //                                owd_ sont restés : la reconstruction est
  //                                amputée exactement comme dans le cas
  //                                « illisible » (ni code des mods, ni
  //                                vignettes d'inventaire, ni champ sans
  //                                attribut à lui), et l'appelant doit geler
  //                                tout autant.
  function attrsToState(attrs) {
    attrs = attrs || {};
    var cur = lecteur(attrs);
    var full = cur("state");

    if (full !== undefined && full !== "") {
      var lu = null, raison = null;
      try {
        var fs = JSON.parse(full);
        if (fs && typeof fs === "object" && !Array.isArray(fs)) lu = fs;
        else raison = "owd_state ne porte pas un objet d'état";
      } catch (e) {
        raison = "owd_state illisible : " + ((e && e.message) ? e.message : String(e));
      }
      if (lu) return attacher(lu, null, null);
      return attacher(reconstruire(cur), "illisible",
                      raison + " (" + String(full).length + " caractères)" + noteDeCarte(cur));
    }

    var vide = !Object.keys(attrs).some(isOwdAttr);
    return attacher(reconstruire(cur), "partiel",
                    vide ? RAISON_SANS_FICHE
                         : "owd_state absent : reconstruction champ par champ" + noteDeCarte(cur));
  }

  // Le diagnostic seul, en objet nu — pour l'appelant qui préfère ne pas
  // dépendre des propriétés accrochées à l'état.
  function diagnostic(attrs) {
    var s = attrsToState(attrs);
    return { state: s, degrade: s.degrade, raison: s.raison };
  }

  // Version de la fiche qui a écrit ces attributs, SANS reconstruire l'état :
  //   { schema, release } — schema = entier de format (state.v), release = le
  //   numéro lisible ("1.0.0b") ; null si le personnage n'a pas de fiche.
  // Le schéma vient d'abord de owd_state (seule source que la fiche met à jour
  // en migrant), puis du scalaire owd_version — qui reste lisible même quand
  // owd_state ne l'est plus, et c'est justement ce cas-là qui compte.
  //
  // Ne PAS reconstruire l'état est le point : l'amorce s'en sert pour l'écran
  // de version, sur un owd_state qui pèse des centaines de kilo-octets.
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
          // venu d'ailleurs. Ne chercher que « release » ferait toujours
          // retomber sur le max de owd_version, que l'amorce réécrit à la
          // version DU SITE : une fiche enregistrée par une archive paraîtrait
          // à jour et se rouvrirait avec le bundle du jour.
          if (typeof fs.rel === "string" && fs.rel) rel = fs.rel;
          else if (typeof fs.release === "string" && fs.release) rel = fs.release;
        }
      } catch (e) {}
    }
    var vc = cur("version"), vm = cur("version", "max");
    if (schema === null && vc !== undefined && vc !== "" && isFinite(parseFloat(vc))) schema = num(vc);
    if (rel === null && typeof vm === "string" && vm) rel = vm;

    if (schema === null && rel === null) {
      // ni version ni état : reste le cas d'une fiche écrite avant owd_version
      if (!Object.keys(attrs).some(isOwdAttr)) return null;
      return { schema: null, release: null };
    }
    return { schema: schema, release: rel };
  }

  function isOwdAttr(name) { return typeof name === "string" && name.indexOf(PREFIX) === 0; }
  // une fiche Outward existe si l'attribut de version est présent
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
    isOwdAttr: isOwdAttr,
    hasSheet: hasSheet,
    blank: blank
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.OwdAttrMap = api;
})(typeof window !== "undefined" ? window : this);
