/* Correspondance fiche Outward <-> Attributes Roll20 (natifs par valeur).
 *
 * La fiche (owd-fiche.js) travaille sur un objet `state` imbriqué. Roll20
 * stocke des Attributes plats {name, current, max}. Ce module fait la
 * traduction, DANS LES DEUX SENS et SANS PERTE :
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
 *   - NATIFS (repli + macros) : un attribut par valeur (SCALARS) ou par
 *     collection (COLLECTIONS, en JSON), plus COLLECTIONS_OPT pour ce qui
 *     n'existe pas dans blank() (grenier, historique de migration).
 *   - MIROIR (écrits seulement si `card` est fourni) : valeurs DÉRIVÉES pour
 *     les macros et les barres de jetons Roll20 — caractéristiques TOTALES
 *     (@{Perso|owd_resistance}), PV et PE courant/max effondrés, exposition.
 *     Non relus : la fiche les recalcule à chaque rendu.
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
 * owd-roll20-boot.js) : le format des Attributes évolue avec la fiche, sans
 * jamais re-signer l'extension Roll20, qui n'est qu'une coquille.
 */
(function (root) {
  "use strict";

  var PREFIX = "owd_";

  // Numéro de version LISIBLE de la fiche, publié dans le `max` de
  // owd_version. Le manifeste en est la source unique quand il est là ; la
  // constante n'est qu'un repli (node, et l'amorceur de secours qui charge
  // sans manifeste).
  // Le « b » final marque la branche beta : le joueur voit sur quel site il
  // est. Il ne change PAS le rang du numéro (« 1.0.0b » et « 1.0.0 » sont la
  // même version, la beta étant ce que le stable recevra à la fusion) : ce qui
  // compare des versions doit donc l'ôter avant de lire les nombres.
  var RELEASE_DEFAUT = "1.0.0";
  // Entier INDÉPENDANT de la release : il ne monte qu'au changement de forme de
  // l'état du personnage, jamais parce que le majeur a bougé. Le manifeste
  // publie les deux séparément, et c'est ce repli-ci que l'amorce prend quand
  // le manifeste manque. Le schéma 1 est le PREMIER : aucune fiche Outward n'a
  // jamais porté autre chose, et la chaîne de owd-migrations.js est vide.
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

  // ==========================================================================
  // PIÈGE À NE JAMAIS REFAIRE : aucun suffixe de SCALARS ni de COLLECTIONS ne
  // doit porter le nom d'un attribut MIROIR. Les miroirs s'écrivent APRÈS la
  // boucle et écraseraient l'attribut de repli du même nom, silencieusement.
  // C'est pourquoi les réserves courantes prennent « _cur » (owd_pv_cur) et les
  // miroirs le nom nu (owd_pv). Toute addition future se vérifie contre la
  // liste des miroirs, plus bas dans stateToAttrs.
  //
  // La seule exception est VOULUE : owd_version est écrit par la boucle des
  // scalaires puis RÉÉCRIT juste après, pour lui donner son `max`.
  // ==========================================================================

  // champ d'état scalaire -> [suffixe, type]
  //   n = nombre, s = chaîne libre, b = booléen (écrit 1/0),
  //   N = nombre NULLABLE : "" vaut null et NON 0. Les confondre clouerait les
  //       réserves « au maximum » à zéro sur le chemin de repli (un personnage
  //       jamais blessé se retrouverait à terre), et un forçage vide à une
  //       valeur forcée de 0.
  var SCALARS = [
    ["name",            "nom",               "s"],
    ["portrait",        "portrait",          "s"],
    ["espece",          "espece",            "s"],
    ["origine",         "origine",           "s"],
    ["age",             "age",               "s"],
    ["histoire",        "histoire",          "s"],
    ["notes",           "notes",             "s"],

    // réserves courantes : toutes NULLABLES (null = au maximum), sauf pm,
    // expo et ventre, dont zéro est une valeur pleine et légitime
    ["pv",              "pv_cur",            "N"],
    ["pe",              "pe_cur",            "N"],
    ["pi",              "pi_cur",            "N"],
    ["repos",           "repos_cur",         "N"],
    ["satiete",         "satiete_cur",       "N"],
    ["hydratation",     "hydra_cur",         "N"],
    ["pm",              "pm_cur",            "n"],
    ["pmMax",           "pm_max",            "N"],   // pas de formule : saisie libre
    ["expo",            "expo_cur",          "n"],
    ["ventre",          "ventre_cur",        "n"],

    ["desTour",         "des_tour",          "n"],
    ["desEngages",      "des_engages",       "n"],

    ["xpTotal",         "xp_total",          "n"],
    ["xpDepForce",      "xp_dep_force",      "N"],
    ["ruptureTotal",    "rupture_total",     "n"],
    ["ruptureDepForce", "rupture_dep_force", "N"],

    ["v",               "version",           "n"],
    ["rel",             "release",           "s"]
  ];

  // champ d'état collection (objet/tableau) -> suffixe (stocké en JSON)
  var COLLECTIONS = [
    ["caracsBase",  "caracs_base"],
    ["caracsXp",    "caracs_xp"],
    ["caracsMod",   "caracs_mod"],
    ["caracsForce", "caracs_force"],
    // Leviers des capacités dérivées : un modificateur par capacité, et un
    // forçage épars du maximum. Les deux voyagent au repli — ils changent des
    // totaux affichés, et une fiche reconstruite sans eux mentirait.
    ["capMod",      "cap_mod"],
    ["capForce",    "cap_force"],
    ["comps",       "competences"],
    ["compsPerso",  "comp_perso"],
    ["compsNote",   "comps_note"],
    ["compsMod",    "comps_mod"],
    ["compsDesMod", "comps_des_mod"],
    ["compsForce",  "comps_force"],
    ["techniques",  "techniques"],
    ["armes",       "armes"],
    // equip part ALLÉGÉ dans son attribut de repli : voir equipSansVignettes
    ["equip",       "equipement"],
    ["climat",      "climat"]
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
    ["vHist",   "v_hist"]
  ];

  // ==========================================================================
  // MIROIR EXACT de blank() de owd-fiche.js : le même littéral, aux deux seules
  // substitutions près — SCHEMA -> SCHEMA_DEFAUT, RELEASE -> RELEASE_DEFAUT.
  // Toute clé ajoutée là-bas doit arriver ici ET dans SCALARS ou COLLECTIONS,
  // sinon le chemin de repli des Attributes la perd EN SILENCE.
  //
  // Le sens à vérifier est celui-là : une clé racine du bundle absente d'ici
  // est une PERTE SÈCHE au repli. L'inverse (une clé d'ici que le bundle
  // ignore) est sans danger : normalize() ne purge aucune clé racine inconnue.
  //
  // Les commentaires ci-dessous sont les mêmes des deux côtés, mot pour mot :
  // ils sont la seule chose qui empêche la divergence.
  // ==========================================================================
  function blank() {
    return {
      // v porte le SCHÉMA (entier), rel la release lisible. Les deux vivent
      // dans blank() parce que le chemin de repli les perdrait sinon : une
      // fiche relue sans owd_state repartirait en schéma 1, c'est-à-dire
      // qu'elle se ferait re-migrer indéfiniment à chaque ouverture.
      v: SCHEMA_DEFAUT, rel: RELEASE_DEFAUT,

      // ---------- identité ----------
      // portrait : une image en data: ou une URL. Elle pèse, et c'est voulu :
      // owd_state la porte, l'attribut de repli owd_portrait la porte aussi
      // (une seule image, contrairement aux vignettes d'objets qui, elles,
      // partent allégées — voir equipSansVignettes plus bas).
      name: "", portrait: "", espece: "", origine: "", age: "",
      histoire: "", notes: "",

      // ---------- les huit caractéristiques ----------
      // Les CLÉS sont sans accent et sans espace : elles voyagent en JSON, en
      // noms d'attribut Roll20 (owd_dexterite) et en fragments de macro
      // (@{Perso|owd_resistance}). Les libellés accentués (« Dextérité »,
      // « Résistance ») vivent dans la table d'affichage du bundle, jamais
      // dans l'état. Renommer une clé ici casserait toutes les macros écrites
      // par les joueurs : c'est aussi gelé qu'un nom de fichier de manifeste.
      //
      // L'ordre est celui du livre : les quatre maîtrises (ce que le
      // personnage emploie et ce qu'il inflige), puis les quatre réserves (ce
      // que le corps tient). Il commande l'ordre d'affichage du bloc.
      //
      // Quatre leviers par caractéristique, la grammaire de JJK, qui a fait
      // ses preuves :
      //   caracsBase  la valeur de départ, saisie à la création ;
      //   caracsXp    ce que l'expérience y a ajouté, compté à part pour que
      //               le joueur voie d'où vient son total ;
      //   caracsMod   le modificateur du moment (équipement, bénédiction,
      //               décision du meneur) — il peut être négatif ;
      //   caracsForce le total FORCÉ. Épars : une clé absente veut dire
      //               « calculé ». C'est pourquoi caracsForce part à {} et non
      //               à un objet de huit zéros — un zéro forcé est une valeur
      //               légitime, et le confondre avec « pas de forçage »
      //               clouerait la caractéristique à zéro.
      caracsBase: {
        Force: 0, Dexterite: 0, Intelligence: 0, Ferveur: 0,
        Vigueur: 0, Endurance: 0, Resistance: 0, Chance: 0
      },
      caracsXp: {
        Force: 0, Dexterite: 0, Intelligence: 0, Ferveur: 0,
        Vigueur: 0, Endurance: 0, Resistance: 0, Chance: 0
      },
      caracsMod: {
        Force: 0, Dexterite: 0, Intelligence: 0, Ferveur: 0,
        Vigueur: 0, Endurance: 0, Resistance: 0, Chance: 0
      },
      caracsForce: {},

      // ---------- leviers des capacités dérivées ----------
      // Les dix capacités que les règles tirent des caractéristiques. Deux
      // objets et non vingt scalaires : un modificateur par capacité, et un
      // forçage ÉPARS du maximum (clé absente = calculé par la formule).
      // Les clés, une fois pour toutes :
      //   pv pe pi          les trois maxima de base, AVANT effondrement ;
      //   repos satiete hydra  les trois réserves de survie ;
      //   expo              la BORNE de l'exposition, symétrique (± la borne) ;
      //   charge rapides contenance.
      // Le mana n'est pas de la fête : il n'a NI formule NI maximum aux
      // règles, et son maximum se saisit à la main (pmMax, plus bas).
      capMod: {
        pv: 0, pe: 0, pi: 0, repos: 0, satiete: 0, hydra: 0,
        expo: 0, charge: 0, rapides: 0, contenance: 0
      },
      capForce: {},

      // ---------- réserves COURANTES ----------
      // On ne stocke QUE le courant : le maximum se recalcule à chaque rendu
      // depuis les caractéristiques et l'effondrement. Le ranger aussi
      // donnerait deux vérités pour la même valeur, qui finiraient par se
      // contredire chez un joueur dont la Vigueur a bougé.
      //
      // null veut dire « au maximum », et ce n'est pas la même chose que le
      // maximum écrit en chiffres : un personnage qui n'a jamais été blessé
      // suit sa Vigueur quand elle monte, alors qu'une valeur figée resterait
      // en arrière. C'est aussi pourquoi ces champs sont de type « N » dans
      // SCALARS et non « n » : sur le chemin de repli, "" doit redonner null
      // et surtout pas 0, qui laisserait le personnage à terre.
      pv: null,           // points de vie
      pe: null,           // points d'endurance
      pi: null,           // points d'innocence
      repos: null,        // points de repos (l'éveil qui reste)
      satiete: null,      // points de satiété
      hydratation: null,  // points d'hydratation

      // Points de mana. Aucune formule, aucun maximum aux règles : le courant
      // part de zéro et le maximum se saisit à la main. pmMax vaut null tant
      // que le joueur n'en pose pas, et la jauge s'affiche alors sans borne
      // (un nombre, pas une barre). Inventer « 80 + quelque chose » ici serait
      // écrire une règle dans la fiche.
      pm: 0,
      pmMax: null,

      // Exposition : part de zéro, descend au froid, monte au chaud, et ses
      // deux bornes découlent de la Résistance. Zéro est un état légitime et
      // fréquent, donc pas de null ici — la convention « null = au maximum »
      // n'a aucun sens pour une valeur qui se lit dans les deux sens.
      expo: 0,

      // Contenance occupée : les places prises dans le ventre. Elle monte à
      // mesure qu'on avale, redescend d'une place toutes les dix minutes.
      ventre: 0,

      // ---------- le tour ----------
      // desTour : ce que le personnage reçoit au début de son tour. 5 aux
      // règles, et le champ existe quand même : c'est exactement le genre de
      // nombre qu'un objet ou une décision de table déplace, et le forcer par
      // un levier d'Options obligerait à ouvrir un onglet en plein combat.
      // desEngages : ce qu'il a déjà engagé dans le tour en cours. Se remet à
      // zéro d'un bouton, jamais tout seul — la fiche ne sait pas quand le
      // tour tourne, et le deviner ferait perdre le compte au mauvais moment.
      desTour: 5,
      desEngages: 0,

      // ---------- compétences ----------
      // Les rangs se rangent par NOM, en clair. Pas de clé composée « Carac/Nom »
      // comme dans JJK : dans Outward une compétence n'appartient à aucune
      // caractéristique, les caractéristiques ouvrent et frappent mais
      // n'entrent jamais dans le jet.
      //
      // comps : nom -> rang entier, 0 à 5, où 5 est le Rang Max (la rupture).
      // Le Rang 0 NE SE NOTE PAS : la clé est simplement absente, et une
      // compétence à 0 posée par mégarde se purge à la normalisation. Une map
      // éparse, donc, et non une ligne par compétence du monde.
      //
      // compsPerso : les compétences que le joueur ajoute lui-même, [{ nom }].
      // Celles du jeu de données (owd-creation.json, désigné par
      // window.__owdDataUrl) n'y figurent pas : elles viennent des règles et
      // c'est la liste servie qui fait foi. Une compétence personnalisée dont
      // le nom finirait par entrer aux règles se retrouverait en double ; la
      // normalisation dédoublonne sur le nom, les règles gagnent.
      comps: {},
      compsPerso: [],
      compsNote: {},     // nom -> note libre (à quoi le joueur s'en sert)
      compsMod: {},      // nom -> modificateur du BONUS de rang
      compsDesMod: {},   // nom -> modificateur du NOMBRE de dés engageables
      compsForce: {},    // nom -> bonus total FORCÉ (épars : absent = calculé)

      // ---------- techniques ----------
      // Un geste appris pour lui-même : ses rangs lui appartiennent, chacun
      // dit ce qu'il apporte, et certains réclament un point de rupture.
      // Gabarit d'une entrée, tenu par normalize() :
      //   {
      //     id: "",        identifiant libre et STABLE : c'est lui qui suit la
      //                    technique au renommage, et qui la reconnaît d'une
      //                    fiche à l'autre quand on l'envoie au tchat ;
      //     nom: "", source: "", note: "",
      //     rang: 0,       le rang POSSÉDÉ, 0 = pas apprise. Les rangs se
      //                    prennent dans l'ordre, jamais en sautant ;
      //     rangs: [],     un objet par rang, du Rang 1 au dernier, qui se
      //                    nomme toujours Rang Max quel que soit leur nombre.
      //                    La LONGUEUR de ce tableau EST le nombre de rangs
      //                    (5 au plus) : le ranger une seconde fois dans un
      //                    champ nbRangs donnerait deux vérités à départager.
      //                    Chaque entrée : { texte: "", rupture: false, xp: 0 }
      //                    — texte = ce que ce rang apporte, rupture = ce rang
      //                    coûte un point de rupture, xp = ce qu'il a coûté en
      //                    expérience. Les règles ne donnent AUCUN prix en XP
      //                    pour une technique : ce champ est une saisie, et
      //                    surtout pas un barème calculé ;
      //     seuil: null,   seuil de base, quand la technique en a un. null
      //                    pour une technique à coût, qui ne se jette pas ;
      //     cout: "",      texte libre (« 2 DÉ », « 2 DÉ et 10 PM ») : les
      //                    coûts d'Outward ne sont pas tous en dés d'action ;
      //     des: 5,        dés d'action engageables au plus (5 aux règles) ;
      //     desMod: 0,
      //     degats: "", portee: ""   textes libres, recopiés de la technique
      //   }
      techniques: [],

      // ---------- armes ----------
      // Une arme n'est pas une attaque, c'est un répertoire : la ligne de
      // l'arme porte la difficulté de parade et la réduction, et chaque geste
      // porte son propre seuil, ses dégâts et sa portée. La fiche recopie ce
      // que le joueur lit sur la carte de son arme dans le livre ; elle ne
      // porte pas le répertoire du livre, qui est une règle.
      // Gabarit d'une entrée :
      //   {
      //     id: "", nom: "", note: "",
      //     categorie: "",   « Épée à une main », « Hallebarde »… texte libre
      //     portee: "",      le palier de la catégorie (« 2 pas ») ;
      //     parade: null,    difficulté de parade de l'ARME (nullable : une
      //                      arme qui ne pare pas n'a pas de difficulté 0) ;
      //     reduction: 0,    ce que la parade réussie retire aux dégâts ;
      //     comp: "",        nom de la compétence employée avec cette arme :
      //                      c'est elle qui donne les dés et le bonus du jet
      //                      d'attaque et de parade. Une chaîne libre, jamais
      //                      un index : renommer une compétence ne doit pas
      //                      décrocher l'arme en silence ;
      //     poids: 0, equipee: false,
      //     gestes: []       le répertoire, un objet par coup :
      //       {
      //         nom: "",
      //         seuil: 0,      la difficulté de base, avant la situation ;
      //         degats: 0,     les dégâts pleins (toujours pairs aux règles) ;
      //         type: "",      TRA | PER | CON, type des dégâts pleins ;
      //         typeMi: "",    le type de la MOITIÉ, sur la case traversée. Il
      //                        change souvent : ce n'est pas la même partie de
      //                        l'arme qui touche, et le confondre avec type
      //                        ferait passer du bois pour du fer ;
      //         portee: "",    les cases FRAPPÉES (« 2 », « 2 et 3 », « soi ») ;
      //         trajet: "",    recopie facultative de data-trajet du livre ;
      //         garde: "",     recopie facultative de data-garde (« 3>9 ») ;
      //         note: ""
      //       }
      //   }
      armes: [],

      // ---------- équipement ----------
      // Un objet porte son poids (la charge), ses places de contenance (ce
      // qu'il occupe dans le ventre quand on l'avale) et ses deux protections
      // en degrés, l'une contre le froid, l'autre contre la chaleur.
      //   groupes  les rangements, dans l'ordre d'affichage ;
      //   comptes  un drapeau « ce groupe pèse sur le personnage » par groupe,
      //            dans un tableau PARALLÈLE et non dans le groupe lui-même :
      //            groupes est un tableau de CHAÎNES que le bandeau, le
      //            renommage, les menus et la carte de tchat lisent tel quel.
      //            Le passer en objets obligerait à un pas de migration avec
      //            descente. Un sac posé à terre ne pèse plus : c'est à ça
      //            que sert le drapeau ;
      //   objets   { id, nom, qte, poids, places, froid, chaud, achat, vente,
      //              desc, img, groupe, porte, rapide }
      //            porte  = l'objet est SUR LUI : ses protections froid et
      //                     chaud comptent alors dans la zone de température,
      //                     celles du sac ne comptent pas ;
      //            rapide = l'objet occupe un accès rapide (saisi sans rien
      //                     fouiller). Un objet, une place, quelle que soit la
      //                     quantité : c'est la main qui compte, pas le stock ;
      //            id     = identifiant libre, celui qui reconnaît le même
      //                     objet d'une fiche à l'autre quand on le donne ;
      //   opts     réglages d'affichage des tuiles, rien de plus.
      equip: {
        groupes: ["Sur soi", "Sac"],
        comptes: [true, true],
        objets: [],
        opts: { cols: 4, nom: true, qte: true, poids: true, total: true }
      },

      // ---------- climat de la table ----------
      // L'état du personnage, pas une règle : où il se tient et ce qu'il y
      // fait. La fiche s'en sert pour calculer sa zone, son écart et ses
      // paliers ; elle ne montre ni la table des milieux, ni les degrés que
      // chaque intensité ajoute, ni les deux tables du froid et du chaud.
      //   temp      la température de l'air en °C, saisie ;
      //   activite  0 repos, 1 légère, 2 intermédiaire, 3 lourde. Défaut 1 :
      //             les règles la nomment l'intensité ordinaire d'une journée
      //             éveillée, et c'est l'état où un personnage se trouve le
      //             plus souvent ;
      //   froidMod  degrés de protection qui ne viennent d'aucun objet (un
      //             abri, un feu, un sort). Les vêtements, eux, sont dans
      //             equip et se somment tout seuls.
      climat: { temp: 20, activite: 1, froidMod: 0, chaudMod: 0 },

      // ---------- progression ----------
      // xpTotal        toute l'expérience gagnée. La dépensée se CALCULE
      //                (rangs de compétences + xp des rangs de techniques
      //                effectivement pris) : la ranger serait la laisser
      //                dériver du jour où un rang bouge ;
      // xpDepForce     forçage de cette dépense, nullable. Vide = calculée.
      //                Il existe pour la table qui compte autrement, pas pour
      //                réparer un calcul faux ;
      // ruptureTotal   les points de rupture que le personnage POSSÈDE. Trois
      //                aux règles, et le champ existe parce que c'est le
      //                genre de nombre qu'une campagne déplace ;
      // ruptureDepForce   forçage des points dépensés, nullable. Le calcul :
      //                un par compétence menée au Rang Max, plus les rangs de
      //                technique qui en réclament un et que le personnage a
      //                effectivement pris.
      xpTotal: 0,
      xpDepForce: null,
      ruptureTotal: 3,
      ruptureDepForce: null
    };
  }

  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function str(v) { return v == null ? "" : String(v); }

  // Copie de l'équipement SANS les vignettes en data: pour l'attribut de repli
  // owd_equipement : owd_state (source de vérité) les porte déjà, les dupliquer
  // doublerait le poids des Attributes de la campagne. Le repli n'est relu que
  // pour des fiches partielles : il perd seulement les images fichier.
  //
  // TOUTES LES AUTRES CLÉS D'EQUIP ET DE CHAQUE OBJET SONT RECOPIÉES TELLES
  // QUELLES (dont opts, groupes et comptes) : les énumérer ici les perdrait en
  // silence à chaque champ nouveau.
  //
  // Le portrait, lui, n'est PAS allégé : il y en a un par personnage, là où un
  // équipement en porte trente. Et il n'y a pas d'équivalent du modsSansCode de
  // JJK : Outward n'a pas de moteur de mods, donc pas de code source à ne pas
  // dupliquer.
  function equipSansVignettes(equip) {
    if (!equip || typeof equip !== "object" || !Array.isArray(equip.objets)) return equip;
    var c = {};
    Object.keys(equip).forEach(function (k) { c[k] = equip[k]; });
    c.objets = equip.objets.map(function (o) {
      if (!o || typeof o !== "object" || String(o.img || "").indexOf("data:") !== 0) return o;
      var oc = {};
      Object.keys(o).forEach(function (k) { oc[k] = o[k]; });
      oc.img = "";
      return oc;
    });
    return c;
  }

  // { fullAttrName -> {current, max} }
  //
  // `card` est ce que le bundle range dans STORE.setItem("owd-cards",
  // {_current: card}) : les valeurs DÉRIVÉES qu'il vient de calculer. Sans
  // elle, aucun attribut miroir n'est écrit — et c'est voulu, la carte
  // d'attributs ne refait pas l'arithmétique de la fiche.
  function stateToAttrs(state, card) {
    state = state || blank();
    var out = {};
    function put(suffix, current, max) {
      out[PREFIX + suffix] = { current: str(current), max: str(max == null ? "" : max) };
    }

    // ROUND-TRIP COMPLET : l'état entier en un attribut, source de vérité.
    // Écrit en tête, hors de toute condition sur `card`.
    put("state", JSON.stringify(state));

    SCALARS.forEach(function (d) {
      var v = state[d[0]];
      put(d[1], d[2] === "b" ? (v ? 1 : 0) : v);
    });
    // owd_version, réécrit APRÈS la boucle : son `current` reste le SCHÉMA
    // (un entier, pour que hasSheet et les macros gardent un nombre), son
    // `max` porte la version lisible. Personne ne lit ce max ; il voyage avec
    // le diff et raconte à qui ouvre les Attributes quelle fiche a écrit là.
    put("version", state.v, release());
    COLLECTIONS.forEach(function (d) {
      var v = state[d[0]] == null ? blank()[d[0]] : state[d[0]];
      // Une seule collection part ALLÉGÉE dans son attribut de repli : les
      // vignettes en data: de l'équipement. owd_state porte l'original ; c'est
      // la duplication, et elle seule, qu'on refuse.
      if (d[0] === "equip") v = equipSansVignettes(v);
      put(d[1], JSON.stringify(v));
    });
    COLLECTIONS_OPT.forEach(function (d) {
      if (state[d[0]] === undefined) return;
      put(d[1], JSON.stringify(state[d[0]]));
    });

    // ---- miroir dérivé (macros / barres de jetons), seulement si la carte est
    // fournie. JAMAIS RELUS : la fiche les recalcule à chaque rendu, et les
    // relire donnerait deux vérités pour la même valeur. ----
    if (card) {
      var cc = card.caracs || {};
      put("force",        cc.Force);
      put("dexterite",    cc.Dexterite);
      put("intelligence", cc.Intelligence);
      put("ferveur",      cc.Ferveur);
      put("vigueur",      cc.Vigueur);
      put("endurance",    cc.Endurance);
      put("resistance",   cc.Resistance);
      put("chance",       cc.Chance);

      var rs = card.reserves || {};
      // barres de jetons : courant / max. PV et PE portent les maxima
      // EFFONDRÉS, ceux du personnage à cet instant, pas ceux de sa Vigueur.
      put("pv",          rs.pv == null ? rs.pvMax : rs.pv, rs.pvMax);
      put("pe",          rs.pe == null ? rs.peMax : rs.pe, rs.peMax);
      put("pi",          rs.pi == null ? rs.piMax : rs.pi, rs.piMax);
      // Le mana n'a pas de maximum aux règles : tant que le joueur n'en pose
      // pas, le `max` part VIDE et la barre de jeton reste un nombre sans
      // borne. Y écrire un maximum inventé serait écrire une règle.
      put("pm",          rs.pm, rs.pmMax);
      put("repos",       rs.repos == null ? rs.reposMax : rs.repos, rs.reposMax);
      put("satiete",     rs.satiete == null ? rs.satieteMax : rs.satiete, rs.satieteMax);
      put("hydratation", rs.hydratation == null ? rs.hydraMax : rs.hydratation, rs.hydraMax);
      // exposition : le courant est SIGNÉ (négatif au froid, positif au
      // chaud) et le max porte la borne, la même des deux côtés.
      put("exposition",  rs.expo, rs.expoMax);

      var co = card.corps || {};
      put("charge",       co.poids, co.charge);
      put("effondrement", co.effondrement, 10);
      put("contenance",   co.ventre, co.contenance);
      put("rapides",      co.rapidesOccupes, co.rapides);

      var to = card.tour || {};
      put("des", to.des, to.desMax);

      var cl = card.climat || {};
      put("ressentie", cl.ressentie);
      // le `max` porte le SENS (« froid », « chaud », « zone ») : un palier
      // sans son sens ne dit rien, et Roll20 n'offre pas d'autre place.
      put("paliers", cl.paliers, cl.sens);
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
  // vient ici de owd_version : c'est le schéma ÉCRIT, pas celui de la carte.
  //
  // Aujourd'hui cela reste sans conséquence : le schéma 1 est le seul publié
  // et aucune archive n'existe. Le jour où ce ne sera plus vrai, c'est-à-dire
  // le jour où un suffixe d'attribut changera DE FORME entre deux schémas
  // (owd_armes qui passerait d'un tableau à un objet, par exemple), lire un
  // owd_armes de schéma 1 avec la carte du schéma 2 donnerait un champ
  // silencieusement faux. La note de noteDeCarte(), dans attrsToState, rend ce
  // cas VISIBLE dans la raison du diagnostic : elle se déclenche dès que le
  // schéma écrit diffère du nôtre, avant même qu'un tel changement de forme
  // existe.
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
  // Les appelants écrivent « var state = M.attrsToState(attrs) » puis
  // JSON.stringify(state) : rendre un objet enveloppe {state, …} leur ferait
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
  // du schéma de cette carte (voir le long commentaire de reconstruire()).
  // Le schéma écrit se lit sur le scalaire owd_version, qui reste lisible même
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
  //                                « illisible » (ni vignettes d'équipement, ni
  //                                champ sans attribut à lui), et l'appelant
  //                                doit geler tout autant.
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
  //   numéro lisible ("1.0.0") ; null si le personnage n'a pas de fiche.
  // Le schéma vient d'abord de owd_state (seule source que la fiche met à jour
  // en migrant), puis du scalaire owd_version — qui reste lisible même quand
  // owd_state ne l'est plus, et c'est justement ce cas-là qui compte.
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
  // une fiche Outward existe si l'attribut de version est présent. C'est le
  // test que l'extension emploie pour décider si l'onglet montre la fiche ou
  // un bouton « créer ».
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
    equipSansVignettes: equipSansVignettes,
    isOwdAttr: isOwdAttr,
    hasSheet: hasSheet,
    blank: blank
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.OwdAttrMap = api;
})(typeof window !== "undefined" ? window : this);
