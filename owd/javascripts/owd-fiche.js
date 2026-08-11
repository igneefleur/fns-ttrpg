/* Fiche de personnage Outward — le bundle servi par le site.
 *
 * Cette fiche vit à deux endroits, avec le MÊME code :
 *   - sur le site, dans le noeud #perso-fiche d'une page de creation ;
 *   - dans Roll20, sous roll20-fiche.html, où javascripts/owd-roll20-boot.js
 *     pose AVANT ce script window.__owdLocalStorage (persistance vers les
 *     Attributes du personnage), window.__owdCompact, window.__owdChat,
 *     window.__owdPlayers et window.__owdNight.
 *
 * Le contrat avec l'amorce est un contrat par EFFETS DE BORD, pas par appels :
 * l'amorce n'appelle aucune fonction d'ici. Ce fichier doit, dans cet ordre :
 *   1. prendre le shim de stockage en priorite, tout sous try/catch ;
 *   2. se monter dans #perso-fiche et y poser data-ready. CE MOT EST GELE :
 *      roll20-fiche.html est l'amorceur servi par la coquille signee, garde
 *      dix minutes par GitHub Pages et jamais re-signe ; il ecrit ce div-la,
 *      et le bundle le cherche par cet id. Les deux cotes doivent dire le
 *      MEME mot, et la page du site (docs/personnage/index.md) aussi, sinon
 *      la fiche ne se monte nulle part — sans la moindre erreur a lire ;
 *   3. ecrire l'etat entier par STORE.setItem("owd-perso", …) a chaque
 *      modification — c'est CETTE ecriture, et elle seule, qui declenche la
 *      sauvegarde vers Roll20 ;
 *   4. ecrire la carte calculee par STORE.setItem("owd-cards", {_current:…}) ;
 *   5. poser window.__owdOnTake des init(), avant meme le chargement des
 *      donnees : c'est le rendez-vous de la file d'attente de l'amorce, et un
 *      clic « Prendre » passe pendant le chargement y est rejoue ;
 *   6. lire window.__owdDataUrl pour son jeu de donnees ;
 *   7. porter RELEASE et SCHEMA, et les ecrire dans l'etat.
 *
 * LA FICHE NE PORTE AUCUNE REGLE. Pas de table de reference, pas de bareme,
 * pas de seuil imprime, pas de description de caracteristique — meme repliee
 * dans un details, meme recalculee pour le personnage. Elle se SERT des tables
 * (rangs, prix, degres d'activite) pour calculer ; elle ne les MONTRE pas. Les
 * regles vivent dans le livre, et c'est la qu'on les lit. Toute addition a
 * cette fiche se juge d'abord la-dessus.
 *
 * Ce que la fiche calcule, dans son ordre de dependance strict :
 *   caracteristiques -> capacites de base -> reserves courantes ->
 *   effondrement -> maxima effondres (PV MAX, PE MAX). Cet ordre n'est pas un
 *   detail de style : PV MAX depend de l'effondrement, qui depend des trois
 *   reserves de survie et de l'exposition, qui dependent chacune de leur
 *   maximum. Le casser rendrait des nombres faux sans rien casser d'autre.
 *
 * Les points de mana n'ont NI formule NI maximum aux regles : leur maximum est
 * une saisie, et aucune formule ne doit apparaitre pour eux. En inventer une
 * ici reviendrait a ecrire une regle dans la fiche.
 *
 * Persistance : « owd-perso » (l'etat), « owd-cards » (la carte calculee).
 * Les reglages d'affichage et d'envoi vivent dans le VRAI localStorage
 * (owd-r20-*) : une preference d'interface n'a rien a faire dans les
 * Attributes Roll20, qui voyagent entre joueurs et coutent une ecriture.
 */
(function () {
  "use strict";

  var COMPACT = typeof window !== "undefined" && window.__owdCompact === true;
  // Persistance : le localStorage du navigateur sur le site ; dans Roll20, le
  // shim pose par l'amorce. Tous les acces sont sous try/catch : STORE peut
  // etre nul (stockage refuse) sans que la fiche cesse de s'ouvrir.
  var STORE = (typeof window !== "undefined" && window.__owdLocalStorage) ||
              (function () { try { return window.localStorage; } catch (e) { return null; } })();
  var DATA = null;
  var state = null;

  // ---------- version ----------
  // RELEASE est ce qu'on montre, SCHEMA est ce qui compte, et les deux sont
  // INDEPENDANTS : le schema est un entier libre que rien ne deduit du majeur
  // de la release. Le suffixe « b » marque la branche beta, pour que le joueur
  // voie sur quel site il est ; il ne change pas le rang.
  //
  // Le SCHEMA ne monte QUE lorsqu'une donnee EXISTANTE change de forme ou de
  // sens. Ajouter une cle racine avec un defaut n'en est pas un : normalize()
  // la complete et ne purge aucune cle racine inconnue, si bien qu'une telle
  // fiche s'ouvre dans les deux sens sans migration.
  var RELEASE = "1.0.0";
  var SCHEMA = 1;

  // ---------- les tables de CALCUL ----------
  // Elles servent au calcul et ne s'affichent nulle part comme un bareme.
  // C'est la frontiere de tout ce fichier : la fiche a le droit de savoir, pas
  // celui de reciter.

  // Les CLES des caracteristiques sont sans accent et sans espace : elles
  // voyagent en JSON, en nom d'attribut Roll20 (owd_dexterite) et en fragment
  // de macro (@{Perso|owd_resistance}). Les renommer casserait toutes les
  // macros ecrites par les joueurs : c'est aussi gele qu'un nom de fichier de
  // manifeste. L'ordre est celui du livre : les quatre maitrises, puis les
  // quatre reserves, et il commande l'ordre d'affichage du bloc.
  var CARACS = ["Force", "Dexterite", "Intelligence", "Ferveur",
                "Vigueur", "Endurance", "Resistance", "Chance"];
  // Les libelles accentues vivent ici, jamais dans l'etat.
  var CARAC_LIB = {
    Force: "Force", Dexterite: "Dexterite", Intelligence: "Intelligence",
    Ferveur: "Ferveur", Vigueur: "Vigueur", Endurance: "Endurance",
    Resistance: "Resistance", Chance: "Chance"
  };
  CARAC_LIB.Dexterite = "Dextérité";
  CARAC_LIB.Resistance = "Résistance";

  // Les dix capacites derivees, dans l'ordre d'affichage des leviers.
  var CAPS = ["pv", "pe", "pi", "repos", "satiete", "hydra",
              "expo", "charge", "rapides", "contenance"];
  var CAP_LIB = {
    pv: "Points de vie", pe: "Points d'endurance", pi: "Points d'innocence",
    repos: "Points de repos", satiete: "Points de satiété",
    hydra: "Points d'hydratation", expo: "Borne d'exposition",
    charge: "Charge", rapides: "Accès rapides", contenance: "Contenance"
  };

  // Rangs de competence, indexes par le rang entier 0..5 (5 = Rang Max).
  // Une seule lecture, aucun cas particulier pour la rupture.
  var RANG_DES   = [1, 2, 2, 2, 2, 3];   // des d'action engageables au plus
  var RANG_BONUS = [0, 0, 1, 2, 3, 3];   // bonus ajoute au resultat
  var RANG_PRIX  = [0, 25, 50, 75, 100, 150];  // XP CUMULEE pour atteindre ce rang
  // Le nom du rang POSSEDE se dit (« Maitre ») : c'est l'etat du personnage.
  // Ce qu'il a coute ne se repete pas ligne a ligne.
  var RANG_NOM = ["", "Initié", "Apprenti", "Maître", "Expert", "Rupture"];
  var RANG_COURT = ["0", "1", "2", "3", "4", "M"];

  // Degres ajoutes a la temperature par l'intensite d'activite, indexes par
  // l'intensite 0..3. La table des milieux, elle, n'existe pas ici : le joueur
  // tape une temperature, il ne la choisit pas dans une liste qui serait la
  // table.
  var ACT_DEG = [0, 5, 15, 25];
  var ACT_LIB = ["Repos", "Légère", "Intermédiaire", "Lourde"];

  // Le corps NU : deux constantes de calcul, jamais affichees comme telles.
  // La fiche montre la zone DU PERSONNAGE, qui est son etat.
  var ZONE_BASSE = 28;
  var ZONE_HAUTE = 32;

  // Le de est un d8, en dur. Pas de de configurable : Outward n'en a qu'un, et
  // l'exposer en reglage inviterait a le changer.
  var FACES = "d8";

  // ---------- outils ----------
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function borne(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function plancher(v) { return Math.floor(v); }
  function plafond(v) { return Math.ceil(v); }
  function num(v, d) { var n = parseInt(v, 10); return isFinite(n) ? n : d; }
  // poids : decimal positif, virgule toleree a la saisie, arrondi au centieme
  function pnum(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
  }
  // affichage des poids : point decimal, sans zeros de traine (« 0.5 », « 3 »)
  function fmtP(n) { return String(Math.round(n * 100) / 100); }
  function signe(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }
  // le moins des nombres affiches est un vrai signe moins, pas un trait d'union
  function sgn(n) { return n >= 0 ? "+" + n : "−" + Math.abs(n); }
  function txt(v) { return String(v == null ? "" : v); }
  function capFirst(t) { t = txt(t); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
  // identifiant libre et STABLE : c'est lui qui suit une technique, une arme ou
  // un objet au renommage, et qui reconnait le meme objet d'une fiche a l'autre
  // quand on le donne.
  function uid(p) {
    return p + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }
  // URL du jeu de donnees. Une ARCHIVE de version embarque le sien, gele a sa
  // date : l'amorce le designe par window.__owdDataUrl avant d'injecter le
  // bundle. Sans lui, un bundle d'archive lirait les regles d'AUJOURD'HUI.
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

  // ============================================================================
  // ETAT
  // ============================================================================
  //
  // MIROIR EXACT de blank() de owd-attr-map.js : le même littéral, aux deux
  // seules substitutions près — SCHEMA -> SCHEMA_DEFAUT, RELEASE ->
  // RELEASE_DEFAUT. Toute clé ajoutée ici doit arriver là-bas ET dans SCALARS
  // ou COLLECTIONS, sinon le chemin de repli des Attributes la perd EN SILENCE.
  //
  // Le sens à vérifier est celui-là : une clé racine d'ici absente de la carte
  // est une PERTE SÈCHE au repli. L'inverse (une clé de la carte que ce
  // fichier ignore) est sans danger : normalize() ne purge aucune clé racine
  // inconnue.
  //
  // Les commentaires ci-dessous sont les mêmes des deux côtés, MOT POUR MOT,
  // et c'est tout leur intérêt : un diff des deux blocs doit rester vide, si
  // bien qu'une seule ligne divergente saute aux yeux. Les dé-accentuer, les
  // reformuler ou les abréger d'un côté noie la vraie divergence dans le
  // bruit et rend le garde-fou inutilisable.
  // ============================================================================

  function blank() {
    return {
      // v porte le SCHÉMA (entier), rel la release lisible. Les deux vivent
      // dans blank() parce que le chemin de repli les perdrait sinon : une
      // fiche relue sans owd_state repartirait en schéma 1, c'est-à-dire
      // qu'elle se ferait re-migrer indéfiniment à chaque ouverture.
      v: SCHEMA, rel: RELEASE,

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

  // ---------- migration ----------
  // La chaine de migrations d'Outward est VIDE au schema 1 : migre() ne fait
  // donc rien aujourd'hui. Les deux gardes restent pour toujours — le repli
  // gele de roll20-fiche.html ne charge pas forcement le moteur, et une fiche
  // sans moteur doit s'ouvrir quand meme.
  function migre(s) {
    if (!s || typeof s !== "object") return s;
    var de = parseInt(s.v, 10);  if (!isFinite(de)) de = 1;
    if (de === SCHEMA) return s;
    if (de > SCHEMA) return s;                        // du futur : ne rien toucher
    if (!window.OwdMigr || !window.OwdMigr.appliquer) return s;
    var r = window.OwdMigr.appliquer(s, de, SCHEMA, { par: "fiche" });
    if (!r || !r.ok) return s;                        // echec : l'etat d'origine, intact
    r.state.v = SCHEMA;  r.state.rel = RELEASE;
    return r.state;
  }

  // ---------- normalisation ----------
  // normalize() tourne APRES toute migration, a chaque chargement, chaque
  // import et chaque relecture des Attributes. Ranger une donnee dans une
  // structure qu'il reconstruit revient a ne pas la ranger du tout.
  //
  // RELEVE, a tenir a jour — c'est un commentaire vivant, pas une decoration :
  //   CONSERVATRICES (ce qui entre ressort) : toutes les cles racine inconnues
  //     (donc « grenier » et « vHist », qui viennent du moteur de migration),
  //     les cles eparses de caracsForce / capForce / compsForce / compsMod /
  //     compsDesMod / compsNote, et les noms de groupes d'equipement.
  //   RECONSTRUITES CHAMP PAR CHAMP : caracsBase / caracsXp / caracsMod (huit
  //     cles exactement), capMod (dix cles), climat, equip.opts, et chaque
  //     entree de techniques, armes, gestes et objets. Un pas de migration qui
  //     voudrait y mettre une donnee a l'abri la perdrait : qu'il la range au
  //     GRENIER, a la racine, qui est conservatrice.
  function normalize(s) {
    if (!s || typeof s !== "object") return null;
    s = migre(s);
    var b = blank(), out = {}, k;

    // les cles racine inconnues passent telles quelles : c'est ce qui permet
    // d'ajouter un champ sans monter le schema, et c'est ce qui garde le
    // grenier et le journal de bord des migrations
    for (k in s) if (has(s, k)) out[k] = s[k];

    out.v = num(s.v, SCHEMA);
    // on ne retamponne la release QUE si le schema concorde : une fiche d'un
    // autre schema se verrait sinon attribuer la release du code qui ne l'a
    // pas ecrite
    out.rel = out.v === SCHEMA ? RELEASE : txt(s.rel);

    ["name", "portrait", "espece", "origine", "age", "histoire", "notes"]
      .forEach(function (c) { out[c] = txt(s[c]); });

    // les huit caracteristiques, exactement : ni plus (une cle inventee ne
    // veut rien dire), ni moins (une cle absente casserait le calcul)
    ["caracsBase", "caracsXp", "caracsMod"].forEach(function (m) {
      var src = s[m] || {}, o = {};
      CARACS.forEach(function (c) { o[c] = borne(num(src[c], 0), -9999, 9999); });
      out[m] = o;
    });
    // forcage EPARS : une cle absente veut dire « calcule ». On ne recopie que
    // les cles connues et posees.
    out.caracsForce = {};
    CARACS.forEach(function (c) {
      if (s.caracsForce && has(s.caracsForce, c) && s.caracsForce[c] !== null && s.caracsForce[c] !== "")
        out.caracsForce[c] = borne(num(s.caracsForce[c], 0), 0, 9999);
    });

    var cm = s.capMod || {}, om = {};
    CAPS.forEach(function (c) { om[c] = borne(num(cm[c], 0), -999999, 999999); });
    out.capMod = om;
    out.capForce = {};
    CAPS.forEach(function (c) {
      if (s.capForce && has(s.capForce, c) && s.capForce[c] !== null && s.capForce[c] !== "")
        out.capForce[c] = borne(num(s.capForce[c], 0), 0, 999999);
    });

    // reserves courantes : nullables (null = au maximum). Attention au « 0 »,
    // qui est une valeur pleine et ne doit jamais devenir null.
    ["pv", "pe", "pi", "repos", "satiete", "hydratation"].forEach(function (c) {
      out[c] = (s[c] === null || s[c] === undefined || s[c] === "") ? null
             : Math.max(0, num(s[c], 0));
    });
    out.pm = Math.max(0, num(s.pm, 0));
    out.pmMax = (s.pmMax === null || s.pmMax === undefined || s.pmMax === "")
              ? null : Math.max(0, num(s.pmMax, 0));
    out.expo = borne(num(s.expo, 0), -999999, 999999);
    out.ventre = Math.max(0, num(s.ventre, 0));

    out.desTour = borne(num(s.desTour, b.desTour), 0, 20);
    out.desEngages = borne(num(s.desEngages, 0), 0, out.desTour);

    // competences : map eparse nom -> rang 1..5. Le Rang 0 ne se note pas, et
    // une entree a 0 posee par megarde se purge ici.
    out.comps = {};
    if (s.comps && typeof s.comps === "object") {
      Object.keys(s.comps).forEach(function (n) {
        var nom = txt(n).trim();
        var r = borne(num(s.comps[n], 0), 0, 5);
        if (nom && r > 0) out.comps[nom] = r;
      });
    }
    // competences personnalisees : dedoublonnees sur le nom, sans casse. Une
    // homonyme d'une competence des regles disparait : les regles gagnent.
    out.compsPerso = [];
    var vus = {};
    reglesNoms().forEach(function (n) { vus[n.toLowerCase()] = 1; });
    (Array.isArray(s.compsPerso) ? s.compsPerso : []).forEach(function (c) {
      var nom = capFirst(txt(c && typeof c === "object" ? c.nom : c).trim());
      if (!nom || vus[nom.toLowerCase()]) return;
      vus[nom.toLowerCase()] = 1;
      out.compsPerso.push({ nom: nom });
    });
    ["compsNote", "compsMod", "compsDesMod", "compsForce"].forEach(function (m) {
      var src = s[m] || {}, o = {};
      Object.keys(src).forEach(function (n) {
        var nom = txt(n).trim();
        if (!nom) return;
        if (m === "compsNote") { var t = txt(src[n]); if (t) o[nom] = t; return; }
        if (src[n] === null || src[n] === undefined || src[n] === "") return;
        o[nom] = borne(num(src[n], 0), -99, 99);
      });
      out[m] = o;
    });

    // techniques : la LONGUEUR de rangs EST le nombre de rangs, 5 au plus
    out.techniques = (Array.isArray(s.techniques) ? s.techniques : []).map(function (t) {
      t = t || {};
      var rangs = (Array.isArray(t.rangs) ? t.rangs : []).slice(0, 5).map(function (r) {
        r = r || {};
        return { texte: txt(r.texte), rupture: !!r.rupture, xp: Math.max(0, num(r.xp, 0)) };
      });
      return {
        id: txt(t.id) || uid("tech"),
        nom: txt(t.nom), source: txt(t.source), note: txt(t.note),
        rang: borne(num(t.rang, 0), 0, rangs.length),
        rangs: rangs,
        seuil: (t.seuil === null || t.seuil === undefined || t.seuil === "") ? null : num(t.seuil, 0),
        cout: txt(t.cout),
        des: borne(num(t.des, 5), 0, 9),
        desMod: borne(num(t.desMod, 0), -9, 9),
        degats: txt(t.degats), portee: txt(t.portee)
      };
    });

    // armes et leur repertoire de gestes
    out.armes = (Array.isArray(s.armes) ? s.armes : []).map(function (a) {
      a = a || {};
      return {
        id: txt(a.id) || uid("arme"),
        nom: txt(a.nom), note: txt(a.note),
        categorie: txt(a.categorie), portee: txt(a.portee),
        parade: (a.parade === null || a.parade === undefined || a.parade === "")
              ? null : borne(num(a.parade, 0), 0, 99),
        reduction: Math.max(0, num(a.reduction, 0)),
        comp: txt(a.comp),
        poids: pnum(a.poids), equipee: !!a.equipee,
        gestes: (Array.isArray(a.gestes) ? a.gestes : []).map(function (g) {
          g = g || {};
          return {
            nom: txt(g.nom),
            seuil: borne(num(g.seuil, 0), 0, 99),
            degats: Math.max(0, num(g.degats, 0)),
            type: txt(g.type).toUpperCase().slice(0, 6),
            typeMi: txt(g.typeMi).toUpperCase().slice(0, 6),
            portee: txt(g.portee), trajet: txt(g.trajet),
            garde: txt(g.garde), note: txt(g.note)
          };
        })
      };
    });

    // equipement : groupes (au moins un), comptes PARALLELE, objets, options
    var eq = s.equip && typeof s.equip === "object" ? s.equip : {};
    var groupes = (Array.isArray(eq.groupes) ? eq.groupes : [])
      .map(function (g) { return txt(g).trim(); })
      .filter(function (g) { return g; });
    if (!groupes.length) groupes = b.equip.groupes.slice();
    var comptes = groupes.map(function (_, i) {
      return !(Array.isArray(eq.comptes) && eq.comptes[i] === false);
    });
    var opts = eq.opts && typeof eq.opts === "object" ? eq.opts : {};
    out.equip = {
      groupes: groupes,
      comptes: comptes,
      objets: (Array.isArray(eq.objets) ? eq.objets : []).map(function (o) {
        o = o || {};
        return {
          id: txt(o.id) || uid("obj"),
          nom: txt(o.nom), qte: Math.max(0, pnum(o.qte === undefined ? 1 : o.qte)),
          poids: pnum(o.poids), places: Math.max(0, num(o.places, 0)),
          froid: borne(num(o.froid, 0), -999, 999),
          chaud: borne(num(o.chaud, 0), -999, 999),
          achat: pnum(o.achat), vente: pnum(o.vente),
          desc: txt(o.desc), img: txt(o.img),
          groupe: borne(num(o.groupe, 0), 0, groupes.length - 1),
          porte: !!o.porte, rapide: !!o.rapide
        };
      }),
      opts: {
        cols: borne(num(opts.cols, 4), 1, 8),
        nom: opts.nom !== false, qte: opts.qte !== false,
        poids: opts.poids !== false, total: opts.total !== false
      }
    };

    var cl = s.climat && typeof s.climat === "object" ? s.climat : {};
    out.climat = {
      temp: borne(num(cl.temp, b.climat.temp), -200, 200),
      activite: borne(num(cl.activite, b.climat.activite), 0, 3),
      froidMod: borne(num(cl.froidMod, 0), -999, 999),
      chaudMod: borne(num(cl.chaudMod, 0), -999, 999)
    };

    out.xpTotal = Math.max(0, num(s.xpTotal, 0));
    out.xpDepForce = (s.xpDepForce === null || s.xpDepForce === undefined || s.xpDepForce === "")
                   ? null : Math.max(0, num(s.xpDepForce, 0));
    out.ruptureTotal = Math.max(0, num(s.ruptureTotal, b.ruptureTotal));
    out.ruptureDepForce = (s.ruptureDepForce === null || s.ruptureDepForce === undefined || s.ruptureDepForce === "")
                        ? null : Math.max(0, num(s.ruptureDepForce, 0));
    return out;
  }

  // ============================================================================
  // VALEURS DERIVEES — ordre de dependance strict, arrondis explicites.
  // Toute l'arithmetique est ENTIERE, sauf les poids (deux decimales). Les
  // divisions sont ecrites en « multiplier PUIS diviser » pour ne jamais
  // passer par un flottant intermediaire arrondi de travers.
  // ============================================================================

  // --- 1. caracteristiques (aucune dependance) ---
  // L'echelle part de 0 et n'a pas de plafond : la borne haute n'est la que
  // contre une saisie folle.
  function caracTotal(c) {
    if (has(state.caracsForce, c)) return borne(state.caracsForce[c], 0, 9999);
    return borne((state.caracsBase[c] || 0) + (state.caracsXp[c] || 0) + (state.caracsMod[c] || 0), 0, 9999);
  }

  // --- 2. capacites de BASE (dependent de 1) ---
  function capBase(k) {
    if (k === "pv")         return 80 + caracTotal("Vigueur");
    if (k === "pe")         return 80 + caracTotal("Endurance");
    if (k === "pi")         return 80 + caracTotal("Ferveur");
    if (k === "repos")      return 800 + caracTotal("Vigueur") * 8;
    if (k === "satiete")    return 1600 + caracTotal("Endurance") * 16;
    if (k === "hydra")      return 400 + caracTotal("Endurance") * 4;
    if (k === "expo")       return 100 + caracTotal("Resistance");   // la BORNE, ± celle-ci
    if (k === "charge")     return 30 + caracTotal("Force");
    if (k === "rapides")    return plancher(caracTotal("Dexterite") / 4);  // arrondi a l'inferieur
    if (k === "contenance") return 60;                                     // constante
    return 0;
  }
  // capMax("pv") et capMax("pe") sont les maxima AVANT effondrement.
  function capMax(k) {
    if (has(state.capForce, k)) return borne(state.capForce[k], 0, 999999);
    return borne(capBase(k) + (state.capMod[k] || 0), 0, 999999);
  }

  // --- 3. courants bornes, hors PV et PE (dependent de 2) ---
  function cour(x, max) { return x === null ? max : borne(x, 0, max); }
  function piCourant()   { return cour(state.pi, capMax("pi")); }
  function reposCour()   { return cour(state.repos, capMax("repos")); }
  function satieteCour() { return cour(state.satiete, capMax("satiete")); }
  function hydraCour()   { return cour(state.hydratation, capMax("hydra")); }
  function expoBorne()   { return capMax("expo"); }
  function expoCour()    { var b = expoBorne(); return borne(state.expo, -b, b); }
  function ventreCour()  { return borne(state.ventre, 0, capMax("contenance")); }
  function pmCour() {
    return state.pmMax === null ? Math.max(0, state.pm) : borne(state.pm, 0, state.pmMax);
  }
  // PV et PE ne se bornent PAS ici : leur maximum depend de l'effondrement,
  // qui depend des trois reserves ci-dessus. C'est tout l'ordre de ce fichier.

  // --- 4. effondrement (depend de 3) ---
  // « Un niveau par tranche de 10 % PERDUE » : plancher, donc 9,9 % perdus ne
  // donnent rien et 10,0 % donnent un niveau. Vide (100 % perdu) donne 10.
  function nivReserve(c, max) {
    if (max <= 0) return 0;
    return borne(plancher((max - c) * 10 / max), 0, 10);
  }
  // L'exposition compte ses tranches dans les deux sens, et le froid ne vaut
  // ni plus ni moins que le chaud.
  function nivExpo() {
    var b = expoBorne();
    if (b <= 0) return 0;
    return borne(plancher(Math.abs(expoCour()) * 10 / b), 0, 10);
  }
  // Les niveaux s'ADDITIONNENT, plafond 10. Quatre reserves a dix niveaux
  // chacune donneraient quarante : le plafond n'est pas un garde-fou, c'est la
  // regle.
  function effondrement() {
    return Math.min(10,
      nivReserve(reposCour(),   capMax("repos")) +
      nivReserve(satieteCour(), capMax("satiete")) +
      nivReserve(hydraCour(),   capMax("hydra")) +
      nivExpo());
  }

  // --- 5. maxima effondres (dependent de 4) ---
  // Ecrit en vingtiemes et en dixiemes pour rester entier : (100-5e)/100 =
  // (20-e)/20, et (100-10e)/100 = (10-e)/10. ARRONDI A L'INFERIEUR.
  function pvMax() { return plancher(capMax("pv") * (20 - effondrement()) / 20); }
  function peMax() { return plancher(capMax("pe") * (10 - effondrement()) / 10); }
  function pvCourant() { return cour(state.pv, pvMax()); }
  function peCourant() { return cour(state.pe, peMax()); }
  function inconscient() { return peMax() === 0; }   // c'est-a-dire effondrement === 10

  // --- 6. exposition, lecture (depend de 3) ---
  function expoPct() {
    var b = expoBorne();
    return b > 0 ? Math.round(expoCour() * 100 / b) : 0;   // signe
  }
  function expoSens() {
    var e = expoCour();
    return e < 0 ? "froid" : e > 0 ? "chaud" : "";
  }

  // --- 7. climat (depend de 1, 2 et de l'equipement porte) ---
  function grCompte(gi) { return state.equip.comptes[gi] !== false; }
  // La QUANTITE ne multiplie pas : deux manteaux dans le sac ne rechauffent
  // pas deux fois, et le drapeau « porte » est le seul juge. Un groupe non
  // compte (un sac pose a terre) ne protege de rien.
  function protection(cle) {
    var t = cle === "froid" ? state.climat.froidMod : state.climat.chaudMod;
    state.equip.objets.forEach(function (o) {
      if (o.porte && grCompte(o.groupe)) t += (cle === "froid" ? o.froid : o.chaud) || 0;
    });
    return t;
  }
  function degresActivite() { return ACT_DEG[borne(state.climat.activite, 0, 3)]; }
  function ressentie() { return state.climat.temp + degresActivite(); }
  function borneBasse() { return ZONE_BASSE - protection("froid"); }
  function borneHaute() { return ZONE_HAUTE + protection("chaud"); }
  function ecartClimat() {
    var r = ressentie(), bb = borneBasse(), bh = borneHaute();
    return r < bb ? bb - r : r > bh ? r - bh : 0;
  }
  // ARRONDI AU SUPERIEUR : « par tranche de 4 degres ENTAMEE » — un degre
  // d'ecart fait deja un palier. C'est le seul plafond() de la fiche avec
  // celui du retour de l'exposition en zone.
  function paliers() { return plafond(ecartClimat() / 4); }
  function climatSens() {
    if (!ecartClimat()) return "zone";
    return ressentie() < borneBasse() ? "froid" : "chaud";
  }
  // Ce que l'exposition fait toutes les dix minutes. Dans la zone, elle
  // revient vers zero de 10 % de la BORNE, sans jamais depasser zero : le
  // retour se calcule sur la borne et non sur la valeur courante, sinon il ne
  // finirait jamais.
  function expoParDix() {
    var s = climatSens(), p = paliers(), e = expoCour();
    if (s === "froid") return -p;
    if (s === "chaud") return p;
    if (e === 0) return 0;
    return -signe(e) * Math.min(Math.abs(e), plafond(expoBorne() * 10 / 100));
  }

  // --- 8. charge, acces rapides, ventre (dependent de 2 et de l'equipement) ---
  function poidsPorte() {
    var t = 0;
    state.equip.objets.forEach(function (o) {
      if (grCompte(o.groupe)) t += o.qte * o.poids;
    });
    return Math.round(t * 100) / 100;
  }
  function charge() { return capMax("charge"); }
  function surcharge() { return poidsPorte() > charge(); }
  // Un objet compte pour UNE place quelle que soit sa quantite : ce sont les
  // mains qui comptent, pas le stock.
  function rapidesOccupes() {
    var n = 0;
    state.equip.objets.forEach(function (o) { if (o.rapide && grCompte(o.groupe)) n++; });
    return n;
  }
  function rapides() { return capMax("rapides"); }
  function ventreLibre() { return capMax("contenance") - ventreCour(); }

  // --- 9. competences ---
  // Les deux tables sont indexees par le rang : une seule lecture, aucun cas
  // particulier pour la rupture. Elles servent au CALCUL et ne s'affichent
  // nulle part comme un bareme.
  function compRang(nom) { return borne(state.comps[nom] || 0, 0, 5); }
  function compDes(nom) {
    return borne(RANG_DES[compRang(nom)] + (state.compsDesMod[nom] || 0), 0, 9);
  }
  function compBonus(nom) {
    if (has(state.compsForce, nom)) return borne(state.compsForce[nom], -99, 99);
    return borne(RANG_BONUS[compRang(nom)] + (state.compsMod[nom] || 0), -99, 99);
  }
  // La liste des competences des regles. Elle vient du jeu de donnees, et il
  // n'existe pas encore : tout est donc compsPerso pour l'instant, ce qui est
  // la situation prevue et non une panne.
  function reglesNoms() {
    var l = (DATA && DATA.competences) || [];
    if (!Array.isArray(l)) return [];
    return l.map(function (c) { return capFirst(txt(c && typeof c === "object" ? c.nom : c).trim()); })
            .filter(function (n) { return n; });
  }
  function compsToutes() {
    var out = reglesNoms().slice(), vus = {};
    out.forEach(function (n) { vus[n.toLowerCase()] = 1; });
    state.compsPerso.forEach(function (c) {
      if (!vus[c.nom.toLowerCase()]) { vus[c.nom.toLowerCase()] = 1; out.push(c.nom); }
    });
    // les rangs poses sur une competence qui n'est plus servie restent
    // visibles : la faire disparaitre effacerait sa progression a l'ecran sans
    // rien effacer dans l'etat, ce qui est le pire des deux mondes
    Object.keys(state.comps).forEach(function (n) {
      if (!vus[n.toLowerCase()]) { vus[n.toLowerCase()] = 1; out.push(n); }
    });
    return out;
  }

  // --- 10. progression (depend de 9 et des techniques) ---
  function prixRang(r) { return RANG_PRIX[borne(r, 0, 5)]; }
  function ruptureRang(r) { return r === 5 ? 1 : 0; }
  function xpDepComps() {
    var t = 0;
    Object.keys(state.comps).forEach(function (n) { t += prixRang(compRang(n)); });
    return t;
  }
  // Les regles ne donnent aucun prix de technique : c'est la saisie du joueur
  // qui fait foi, et seuls les rangs PRIS sont comptes.
  function xpDepTech() {
    var t = 0;
    state.techniques.forEach(function (tk) {
      for (var i = 0; i < techRangCour(tk); i++) t += tk.rangs[i].xp;
    });
    return t;
  }
  function xpDepense() {
    return state.xpDepForce !== null ? state.xpDepForce : xpDepComps() + xpDepTech();
  }
  function xpReste() { return state.xpTotal - xpDepense(); }   // peut etre negatif
  function ruptureDepComps() {
    var t = 0;
    Object.keys(state.comps).forEach(function (n) { t += ruptureRang(compRang(n)); });
    return t;
  }
  function ruptureDepTech() {
    var t = 0;
    state.techniques.forEach(function (tk) {
      for (var i = 0; i < techRangCour(tk); i++) if (tk.rangs[i].rupture) t++;
    });
    return t;
  }
  function ruptureDep() {
    return state.ruptureDepForce !== null ? state.ruptureDepForce
         : ruptureDepComps() + ruptureDepTech();
  }
  function ruptureReste() { return state.ruptureTotal - ruptureDep(); }

  // --- 11. techniques ---
  function techDes(t) { return borne(t.des + t.desMod, 0, 9); }
  function techRangMax(t) { return t.rangs.length; }   // le dernier se NOMME Rang Max
  function techRangCour(t) { return borne(t.rang, 0, techRangMax(t)); }
  function techTexte(t) {
    var r = techRangCour(t);
    return r > 0 ? t.rangs[r - 1].texte : "";
  }
  // Le nom du rang, du point de vue du personnage : le dernier se nomme
  // toujours Rang Max, quel que soit leur nombre.
  function techRangNom(t, i) {
    return (i + 1) === techRangMax(t) ? "Rang Max" : "Rang " + (i + 1);
  }

  // --- 12. le tour ---
  function desRestants() { return borne(state.desTour - state.desEngages, 0, state.desTour); }

  // ============================================================================
  // LA CARTE — ce que le popup de l'extension et les attributs miroir lisent.
  // Seul _current est ecrit : recalculer une carte par personnage ne sert
  // personne dans Roll20. Les valeurs nulles voyagent telles quelles (pmMax
  // peut etre null) : c'est stateToAttrs qui decide d'ecrire "" plutot que
  // "null".
  // ============================================================================
  function computeCard() {
    var caracs = {};
    CARACS.forEach(function (c) { caracs[c] = caracTotal(c); });
    return {
      id: "_current",
      name: state.name || "Sans nom",
      caracs: caracs,
      reserves: {
        pv: pvCourant(), pvMax: pvMax(),
        pe: peCourant(), peMax: peMax(),
        pi: piCourant(), piMax: capMax("pi"),
        pm: pmCour(), pmMax: state.pmMax,
        repos: reposCour(), reposMax: capMax("repos"),
        satiete: satieteCour(), satieteMax: capMax("satiete"),
        hydratation: hydraCour(), hydraMax: capMax("hydra"),
        expo: expoCour(), expoMax: expoBorne()
      },
      corps: {
        charge: charge(), poids: poidsPorte(),
        rapides: rapides(), rapidesOccupes: rapidesOccupes(),
        contenance: capMax("contenance"), ventre: ventreCour(),
        effondrement: effondrement()
      },
      tour: { des: desRestants(), desMax: state.desTour },
      climat: {
        ressentie: ressentie(), paliers: paliers(), sens: climatSens(),
        borneBasse: borneBasse(), borneHaute: borneHaute()
      }
    };
  }

  // ============================================================================
  // PERSISTANCE
  // ============================================================================
  // Le bandeau du dernier enregistrement rate : absent tant que ca passe. Une
  // panne d'enregistrement ne se dit pas en un eclair de deux secondes vu une
  // seule fois : la fiche continuerait de s'afficher, parfaitement normale,
  // pendant qu'une session entiere de travail se perd a la fermeture.
  var elSavePanne = null;
  function save() {
    // La mise en forme se fait HORS du try du stockage. Si stringify jette,
    // setItem n'est jamais atteint, le cache memoire du pont n'est pas a jour,
    // aucune ecriture n'est programmee, et donc ni accuse de reception, ni
    // chien de garde, ni bandeau : plus rien ne s'enregistre et rien ne le dit.
    var json = null, panne = "";
    try { json = JSON.stringify(state); }
    catch (e) {
      panne = "La fiche ne peut plus se mettre en forme pour l'enregistrement (" +
              messageErreur(e) + ") : plus rien n'est enregistré.";
    }
    if (json !== null && STORE) {
      try { STORE.setItem("owd-perso", json); }
      catch (e) { panne = "Impossible d'enregistrer (stockage plein ou bloqué) : exporter la fiche en JSON."; }
    }
    montrePanneSave(panne);
    if (!STORE) return;
    var cards;
    try { cards = JSON.parse(STORE.getItem("owd-cards")) || {}; } catch (e) { cards = {}; }
    cards._current = computeCard();
    try { STORE.setItem("owd-cards", JSON.stringify(cards)); } catch (e) {}
  }
  function montrePanneSave(msg) {
    if (!msg) {
      if (elSavePanne && elSavePanne.parentNode) elSavePanne.parentNode.removeChild(elSavePanne);
      return;
    }
    if (!appEl) return;   // pas encore monte : le prochain enregistrement le posera
    if (!elSavePanne) elSavePanne = el("div", "owd-avis owd-avis-save");
    if (elSavePanne.textContent !== msg) elSavePanne.textContent = msg;
    // save() part a chaque frappe : ne toucher au DOM que si le bandeau n'est
    // pas deja a sa place, sinon chaque lettre tapee le deplacerait.
    if (elSavePanne.parentNode === appEl) return;
    appEl.insertBefore(elSavePanne, appEl.firstChild);
  }
  function load() {
    if (!STORE) return null;
    try { return normalize(JSON.parse(STORE.getItem("owd-perso"))); }
    catch (e) { return null; }
  }
  // L'onglet courant vit dans le stockage NON sauvegarde : sous Roll20 le shim
  // le garde en memoire et il meurt avec la page, ce qui est voulu — quel
  // onglet on regarde n'est pas une donnee de personnage.
  function curTab() { try { return STORE.getItem("owd-tab") || "fiche"; } catch (e) { return "fiche"; } }
  function setTab(id) { try { STORE.setItem("owd-tab", id); } catch (e) {} }
  function messageErreur(e) {
    if (!e) return "erreur inconnue";
    return txt(e.message || e) || "erreur inconnue";
  }

  // ============================================================================
  // ENVOI AU TCHAT
  // ============================================================================
  // Tout ce que la fiche envoie a Roll20 traverse ce bloc. La commande est
  // composee ICI, cote site, et part par window.__owdChat, que l'extension
  // relaie SANS RIEN REECRIRE : le format peut donc evoluer sans re-signature.
  // Les reglages vivent dans le VRAI localStorage, comme le jour/nuit : ce ne
  // sont pas des donnees de personnage, et les ecrire dans les Attributes a
  // chaque clic n'aurait aucun sens.
  var ENVOI = {
    mode: "owd-r20-envoi",              // "public" | "gm" | "joueur"
    dest: "owd-r20-envoi-dest",         // nom d'affichage du destinataire
    input: "owd-r20-envoi-input",       // "0" sans modificateur de RESULTAT | "1" avec
    seuil: "owd-r20-envoi-seuil",       // "1" demander le seuil au lancer (defaut)
    situation: "owd-r20-envoi-situation", // "1" demander un modificateur de SITUATION (defaut)
    noms: "owd-r20-envoi-noms"          // liste de secours, si Roll20 ne donne pas la sienne
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
  function envSeuil() { return lpref(ENVOI.seuil, "1") === "1"; }
  function envSituation() { return lpref(ENVOI.situation, "1") === "1"; }
  // Meme assainissement que l'extension : sur le canal brut elle n'en fait
  // aucun, et une accolade ou un retour a la ligne d'un texte de fiche
  // casserait la carte — ou, pire, ferait une SECONDE ligne, que l'extension
  // refuse en bloc.
  function envSan(s) {
    return txt(s).replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  }
  // Valeur de champ : les accolades d'une macro Roll20 sont legitimes et
  // doivent survivre. Un champ de gabarit se ferme sur « }} » : c'est la SEULE
  // sequence a briser, et une valeur qui finit par une accolade prend une
  // espace pour ne pas en fabriquer une avec la fermeture.
  function envVal(s) {
    var v = txt(s).replace(/\s+/g, " ").trim().replace(/\}\}/g, "} }");
    return /\}$/.test(v) ? v + " " : v;
  }
  // Le prefixe de chuchotement OUVRE la commande : Roll20 exige que le message
  // commence par « / », un seul blanc devant et tout part en clair, en public.
  // Un nom qui contient une espace doit etre entre guillemets droits.
  function envPrefixe() {
    var m = envMode();
    if (m === "gm") return "/w gm ";
    if (m === "joueur") {
      var d = envSan(envDest()).replace(/"/g, "");
      if (d) return "/w \"" + d + "\" ";
      // « a un joueur » sans destinataire : public plutot qu'une commande cassee
    }
    return "";
  }
  // Les parentheses laissent saisir un modificateur negatif sans ambiguite.
  var ENV_QUERY = " + (?{Modificateur|0})";
  // Roll20 ne pose une requete qu'UNE FOIS par texte d'invite identique dans un
  // meme message : « ?{Situation|0} » ecrit deux fois est demande une fois. Le
  // texte d'invite ne doit donc jamais varier d'un champ a l'autre.
  var ENV_SITUATION = "?{Situation|0}";
  var ENV_SEUIL = "?{Seuil|0}";
  // Option de jet Roll20 : le resultat s'inscrit dans le compteur de tours.
  // Outward n'a pas de regle d'initiative ecrite : AUCUN bouton ne passe
  // tracker a vrai, et ENV_TRACKER n'est employe nulle part. Les deux restent
  // parce qu'ils coutent une ligne et serviront le jour ou la regle existe.
  var ENV_TRACKER = " &{tracker}";
  // Le de est toujours un d8 : « 2d8 », jamais un de configurable.
  function des(n) { return borne(n, 1, 20) + FACES; }
  function champs(fields) {
    var out = "";
    (fields || []).forEach(function (f) {
      if (!f) return;
      var k = envSan(f[0]), v = envVal(f[1]);
      if (v) out += " {{" + k + "=" + v + "}}";
    });
    return out;
  }
  // seuil : deja compose par l'appelant (« 6 + (?{Situation|0}) », « ?{Seuil|0} »),
  // ou null quand le jet ne se compare a rien d'annonce.
  function cmdJet(label, value, die, avecInput, seuil, tracker) {
    // « + 0 » est du bruit : l'expression part seule quand le bonus est nul.
    var v = value ? (value > 0 ? " + " + value : " - " + (-value)) : "";
    var de = txt(die).replace(/\s+/g, " ").trim() || des(1);
    var cmd = "&{template:default} {{name=" + (envSan(label) || "Jet") +
              "}} {{Jet=[[" + de + v +
              (avecInput ? ENV_QUERY : "") +
              (tracker ? ENV_TRACKER : "") + "]]}}";
    if (seuil) cmd += " {{Seuil=[[" + seuil + "]]}}";
    return cmd;
  }
  function cmdCarte(title, fields) {
    return "&{template:default} {{name=" + envSan(title) + "}}" + champs(fields);
  }
  // envoi effectif : prefixe + commande. Rend false hors Roll20.
  function envoyer(cmd) {
    if (typeof window === "undefined" || typeof window.__owdChat !== "function") return false;
    window.__owdChat(envPrefixe() + cmd);
    return true;
  }
  // Le seuil d'un jet qui en a un de base : la situation s'AJOUTE AU SEUIL, et
  // jamais au resultat. C'est ce que disent les regles, et c'est ce qu'on
  // annonce a la table. Le porter au resultat avec le signe inverse aurait ete
  // egal en arithmetique et faux en lecture.
  function seuilDe(base) {
    if (base === null || base === undefined) return envSeuil() ? ENV_SEUIL : null;
    return envSituation() ? (base + " + (" + ENV_SITUATION + ")") : String(base);
  }
  // Un jet de la fiche. Hors Roll20 (ou sur une extension anterieure au canal
  // brut) les replis ne savent ni annoncer un seuil ni poser une requete : un
  // jet parti par la est un « Nd8 + bonus » public, et c'est tout ce qu'on peut
  // lui demander.
  function doJet(label, nbDes, bonus, seuilBase, extra) {
    var cmd = cmdJet(label, bonus, des(nbDes), envInput(), seuilDe(seuilBase), false) +
              champs(extra || []);
    if (envoyer(cmd)) return;
    if (typeof window !== "undefined" && typeof window.__owdRoll === "function") {
      window.__owdRoll(des(nbDes), bonus, label);
      return;
    }
    // Hors Roll20, la fiche lance le de elle-meme : elle n'a qu'un d8 a jeter,
    // et elle sait le faire.
    var t = 0, det = [];
    for (var i = 0; i < borne(nbDes, 1, 20); i++) {
      var d = 1 + Math.floor(Math.random() * 8);
      det.push(d); t += d;
    }
    flash(label + " : " + (t + bonus) + " (dés " + det.join(" + ") +
          (bonus ? " " + (bonus >= 0 ? "+ " : "− ") + Math.abs(bonus) : "") + ")");
  }
  // Une carte : elle ne se jette pas, elle se montre. Les champs vides sont
  // omis. Une etiquette VIDE ("") donne « {{=texte}} », une ligne pleine
  // largeur sans colonne de libelle, reservee aux textes longs — UNE SEULE par
  // carte, le gabarit indexant par cle.
  function sayChat(title, fields) {
    var clean = (fields || []).filter(function (f) { return f && txt(f[1]).trim(); });
    if (envoyer(cmdCarte(title, clean))) return;
    if (typeof window !== "undefined" && typeof window.__owdSay === "function") {
      window.__owdSay(title, clean);
      return;
    }
    flash(title + (clean.length ? " — " + clean.map(function (f) {
      return f[0] ? f[0] + " : " + f[1] : f[1];
    }).join(" · ") : ""));
  }

  // ============================================================================
  // RAFRAICHISSEMENT ET BRIQUES
  // ============================================================================
  // Un seul registre courant, « hooks », plus quelques registres rebatissables
  // pour les listes que l'on detruit et recree sans remonter la fiche (les
  // competences, les armes, les techniques, les objets). Tous repartent a vide
  // a chaque montage : les anciens pointent sur un DOM qui n'existe plus.
  var regPrinc = [];
  var hooks = regPrinc;
  var regComps = [], regArmes = [], regTechs = [], regObjets = [], regLeviers = [];
  var rootEl = null, appEl = null;

  function avecReg(reg, fn) {
    var old = hooks;
    hooks = reg;
    try { fn(); } finally { hooks = old; }
  }
  function joue(reg) {
    for (var i = 0; i < reg.length; i++) {
      try { reg[i](); }
      catch (e) { if (window.console && window.console.error) window.console.error("[fiche]", e); }
    }
  }
  function refresh() {
    save();
    joue(regPrinc);
    joue(regComps); joue(regArmes); joue(regTechs); joue(regObjets); joue(regLeviers);
  }
  // Remplacement d'etat COMPLET (import, remise a neuf) : toutes les sections
  // tiennent des references sur l'ancien etat, on remonte donc la fiche
  // entiere depuis le nouvel etat.
  function remount() { if (rootEl) mount(rootEl); }

  function flash(msg) {
    var f = document.querySelector(".owd-flash") || el("div", "owd-flash");
    f.textContent = msg;
    document.body.appendChild(f);
    f.classList.add("on");
    clearTimeout(f.__t);
    f.__t = setTimeout(function () { f.classList.remove("on"); }, 2600);
  }

  function fld(labelTxt, input, cls) {
    var w = el("div", "owd-f" + (cls ? " " + cls : ""));
    if (labelTxt) w.appendChild(el("label", null, labelTxt));
    w.appendChild(input);
    return w;
  }
  function textInput(get, set, placeholder, reg) {
    var i = el("input");
    i.type = "text";
    if (placeholder) i.placeholder = placeholder;
    i.value = get() || "";
    i.addEventListener("input", function () { set(i.value); refresh(); });
    (reg || hooks).push(function () { if (document.activeElement !== i) i.value = get() || ""; });
    return i;
  }
  function areaInput(get, set, rows, placeholder, reg) {
    var a = el("textarea", "owd-area");
    a.rows = rows || 6;
    if (placeholder) a.placeholder = placeholder;
    a.value = get() || "";
    a.addEventListener("input", function () { set(a.value); refresh(); });
    (reg || hooks).push(function () { if (document.activeElement !== a) a.value = get() || ""; });
    return a;
  }
  // Entier. min/max bornent la SAISIE, pas le calcul : le calcul a ses propres
  // bornes et n'a pas a faire confiance a un champ.
  function numInput(get, set, opts, reg) {
    opts = opts || {};
    var i = el("input", "owd-num");
    i.type = "number";
    if (opts.min !== undefined) i.min = String(opts.min);
    if (opts.max !== undefined) i.max = String(opts.max);
    i.step = String(opts.step || 1);
    i.value = get();
    i.addEventListener("input", function () {
      var v = parseInt(i.value, 10);
      if (isFinite(v)) { set(v); refresh(); }
    });
    (reg || hooks).push(function () { if (document.activeElement !== i) i.value = get(); });
    return i;
  }
  // Decimal positif (les poids et les prix) : virgule toleree a la saisie.
  function decInput(get, set, reg) {
    var i = el("input", "owd-num");
    i.type = "number"; i.step = "any"; i.min = "0";
    i.value = get();
    i.addEventListener("input", function () { set(pnum(i.value)); refresh(); });
    (reg || hooks).push(function () { if (document.activeElement !== i) i.value = get(); });
    return i;
  }
  // Champ NULLABLE : vide veut dire « calcule » (un forcage) ou « au maximum »
  // (une reserve). Un zero tape est une valeur pleine et legitime, et le
  // confondre avec le vide clouerait la valeur a zero.
  function nullInput(get, set, placeholder, reg) {
    var i = el("input", "owd-num");
    i.type = "number";
    if (placeholder) i.placeholder = placeholder;
    var v0 = get();
    i.value = v0 === null ? "" : v0;
    i.addEventListener("input", function () {
      var s = String(i.value).trim();
      set(s === "" ? null : num(s, 0));
      refresh();
    });
    (reg || hooks).push(function () {
      if (document.activeElement === i) return;
      var v = get();
      i.value = v === null ? "" : v;
    });
    return i;
  }
  function checkbox(labelTxt, get, set, reg) {
    var w = el("label", "owd-check");
    var c = el("input");
    c.type = "checkbox";
    c.checked = !!get();
    c.addEventListener("change", function () { set(c.checked); refresh(); });
    (reg || hooks).push(function () { c.checked = !!get(); });
    w.appendChild(c);
    w.appendChild(el("span", null, labelTxt));
    return w;
  }
  function miniBtn(t, title, fn, cls) {
    var b = el("button", "owd-mini" + (cls ? " " + cls : ""), t);
    b.type = "button";
    if (title) b.title = title;
    b.addEventListener("click", fn);
    return b;
  }
  function block(title, small) {
    var b = el("div", "owd-block");
    var t = el("div", "owd-block-title", title);
    if (small) t.appendChild(el("small", null, small));
    b.appendChild(t);
    return b;
  }
  function ligne(cls) { return el("div", "owd-row" + (cls ? " " + cls : "")); }
  // La grande valeur d'un bloc : ce que l'oeil cherche en premier.
  function bigTile(label, getV, sub, reg) {
    var d = el("div", "owd-big");
    d.appendChild(el("span", "k", label));
    var v = el("span", "v", "");
    d.appendChild(v);
    var s = sub ? el("span", "s", "") : null;
    if (s) d.appendChild(s);
    (reg || hooks).push(function () {
      v.textContent = String(getV());
      if (s) s.textContent = String(sub());
    });
    return d;
  }
  // Barre de jauge. Une seule fonction pour les sept reserves, la charge, la
  // contenance et les acces rapides : elles se lisent toutes de la meme facon.
  function barre(getCour, getMax, cls, reg) {
    var b = el("div", "owd-barre" + (cls ? " " + cls : ""));
    var f = el("i");
    b.appendChild(f);
    (reg || hooks).push(function () {
      var m = getMax(), c = getCour();
      f.style.width = borne(m > 0 ? c * 100 / m : 0, 0, 100) + "%";
      b.classList.toggle("over", m > 0 && c > m);
    });
    return b;
  }

  // ---------- boite de dialogue ----------
  // Dans Roll20 la fiche est une iframe d'une AUTRE ORIGINE : prompt() et
  // confirm() y sont muets sous Chrome, ils rendent false sans rien afficher.
  // Tout formulaire et toute confirmation passent donc par cette couche, posee
  // dans le document de la fiche. Aucune exception, jamais.
  function dialogue(titre, corps, valider, libelleValider) {
    var over = el("div", "owd-modal-over");
    var box = el("div", "owd-modal");
    box.appendChild(el("div", "owd-modal-title", titre));
    box.appendChild(corps);
    var pied = el("div", "owd-modal-actions");
    function fermer() { if (over.parentNode) over.parentNode.removeChild(over); }
    pied.appendChild(miniBtn("Annuler", null, fermer));
    if (valider) pied.appendChild(miniBtn(libelleValider || "Valider", null, function () {
      if (valider() !== false) fermer();
    }, "primary"));
    box.appendChild(pied);
    over.appendChild(box);
    over.addEventListener("mousedown", function (e) { if (e.target === over) fermer(); });
    // DANS la racine montee : c'est elle qui porte les jetons de couleur (jour
    // et nuit) ; accroche plus haut, le dialogue perdrait tout son habillage.
    (appEl || rootEl || document.body).appendChild(over);
    setTimeout(function () {
      var f = box.querySelector("input, textarea, select");
      if (f) { f.focus(); if (f.select) f.select(); }
    }, 0);
    return { fermer: fermer };
  }
  function confirmer(titre, texte, libelle, fn) {
    var corps = el("div", "owd-modal-body");
    corps.appendChild(el("div", "owd-modal-note", texte));
    dialogue(titre, corps, fn, libelle);
  }
  // Choix du nombre de des a engager. Zero de n'a pas de bouton : le jet n'a
  // pas lieu et l'echec est automatique, il n'y a rien a envoyer au tchat.
  function choixDes(titre, max, fn) {
    var corps = el("div", "owd-modal-body");
    corps.appendChild(el("div", "owd-modal-note",
      "Combien de dés d'action le personnage engage-t-il ?"));
    var row = ligne("owd-des-choix");
    var d = null;
    for (var i = 1; i <= borne(max, 1, 9); i++) (function (n) {
      row.appendChild(miniBtn(n + (n > 1 ? " dés" : " dé"), null, function () {
        if (d) d.fermer();
        fn(n);
      }, "primary"));
    })(i);
    corps.appendChild(row);
    d = dialogue(titre, corps, null);
  }

  // ============================================================================
  // DONNER ET PRENDRE UN OBJET (entre joueurs, par le tchat)
  // ============================================================================
  // Le donneur envoie au tchat une carte portant un lien « Prendre » : le
  // payload de l'objet y voyage encode en base64. L'extension intercepte le
  // clic sur ce lien (la fiche, dans son iframe, ne voit pas le tchat) et
  // renvoie le payload a la fiche du preneur. L'encodage vit ICI, cote site :
  // son format peut donc evoluer sans jamais re-signer l'extension, qui ne
  // fait que relayer.
  var TAKE_CMD = "/owd_take";
  var IMG_MAX = 4000;   // une vignette plus lourde ne tient pas dans un message
  function b64encode(t) {
    try {
      if (typeof TextEncoder !== "undefined") {
        var oct = new TextEncoder().encode(t), s = "";
        for (var i = 0; i < oct.length; i++) s += String.fromCharCode(oct[i]);
        return btoa(s);
      }
    } catch (e) {}
    return btoa(unescape(encodeURIComponent(t)));
  }
  function b64decode(b64) {
    var bin = atob(txt(b64).replace(/-/g, "+").replace(/_/g, "/"));
    try {
      if (typeof TextDecoder !== "undefined") {
        var oct = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) oct[i] = bin.charCodeAt(i);
        return new TextDecoder().decode(oct);
      }
    } catch (e) {}
    return decodeURIComponent(escape(bin));
  }
  // objet -> payload compact (cles courtes : le message de tchat est borne).
  // Les places, le froid et le chaud voyagent : ce sont eux qui font qu'un
  // manteau donne rechauffe vraiment celui qui le recoit.
  function packObjet(it, qte) {
    var p = {
      n: txt(it.nom), q: Math.max(0, pnum(qte)) || 1, p: pnum(it.poids),
      l: it.places || 0, f: it.froid || 0, c: it.chaud || 0,
      a: pnum(it.achat), v: pnum(it.vente), d: txt(it.desc), k: txt(it.id)
    };
    var img = txt(it.img);
    if (img && (img.length <= IMG_MAX || !/^data:/.test(img))) p.i = img;
    return b64encode(JSON.stringify(p));
  }
  function unpackObjet(b64) {
    var o;
    try { o = JSON.parse(b64decode(b64)); } catch (e) { return null; }
    if (!o || typeof o !== "object") return null;
    return {
      nom: txt(o.n) || "Objet", qte: Math.max(0, pnum(o.q)) || 1, poids: pnum(o.p),
      places: Math.max(0, num(o.l, 0)), froid: num(o.f, 0), chaud: num(o.c, 0),
      achat: pnum(o.a), vente: pnum(o.v), desc: txt(o.d), img: txt(o.i), id: txt(o.k)
    };
  }
  // Donner : combien, puis la carte part au tchat et la pile diminue d'autant.
  function donnerDialogue(it) {
    var corps = el("div", "owd-modal-body");
    corps.appendChild(el("div", "owd-modal-note",
      "L'objet quitte l'équipement et part dans le tchat : le premier joueur qui clique « Prendre » le reçoit."));
    var qIn = el("input", "owd-num");
    qIn.type = "number"; qIn.min = "0"; qIn.max = String(it.qte); qIn.step = "any";
    qIn.value = fmtP(it.qte);
    corps.appendChild(fld("Quantité à donner (sur " + fmtP(it.qte) + ")", qIn));
    dialogue("Donner « " + (it.nom || "objet") + " »", corps, function () {
      var q = Math.min(pnum(qIn.value) || it.qte, it.qte);
      if (!it.qte || !q) { flash("Cet objet n'est plus en stock."); return; }
      // le nom passe par envSan comme partout ailleurs : sans lui, un nom qui
      // porte une accolade ou un saut de ligne compose une commande que
      // l'extension refuse — et l'objet serait quand meme retire, donc perdu
      var cmd = "&{template:default} {{name=Objet donné — " + (envSan(it.nom) || "objet") + "}}" +
                (q > 1 ? " {{Quantité=" + fmtP(q) + "}}" : "") +
                (it.desc ? " {{=" + envSan(it.desc) + "}}" : "") +
                " {{Prendre=[Prendre](" + TAKE_CMD + " " + packObjet(it, q) + ")}}";
      if (!envoyer(cmd)) {
        flash("Hors de Roll20 : rien n'est envoyé au tchat (l'objet reste dans l'équipement).");
        return;
      }
      it.qte = Math.max(0, Math.round((it.qte - q) * 100) / 100);
      if (!it.qte) {
        var i = state.equip.objets.indexOf(it);
        if (i >= 0) state.equip.objets.splice(i, 1);
      }
      refresh();
      rebuildObjets();
    }, "Donner");
  }
  // Prendre : l'objet arrive du tchat, relaye par l'extension. S'il existe
  // deja, on empile les quantites et on tranche champ par champ ce qui differe.
  function recevoirObjet(payload) {
    var recu = unpackObjet(payload);
    if (!recu) { flash("Objet illisible (message abîmé)."); return; }
    var G = state.equip.groupes, items = state.equip.objets;
    // reconnaissance : d'abord l'identifiant (deux objets homonymes mais
    // distincts ne fusionnent pas), a defaut le nom
    var jumeau = null;
    if (recu.id) items.forEach(function (x) { if (!jumeau && x.id && x.id === recu.id) jumeau = x; });
    if (!jumeau) items.forEach(function (x) {
      if (!jumeau && !recu.id && txt(x.nom).trim().toLowerCase() === recu.nom.trim().toLowerCase()) jumeau = x;
    });

    var corps = el("div", "owd-modal-body");
    if (recu.img) {
      var imb = el("div", "owd-modal-img");
      var im = el("img"); im.alt = ""; im.src = recu.img;
      imb.appendChild(im);
      corps.appendChild(imb);
    }
    var qIn = el("input", "owd-num");
    qIn.type = "number"; qIn.min = "0"; qIn.max = String(recu.qte); qIn.step = "any";
    qIn.value = fmtP(recu.qte);
    corps.appendChild(fld("Quantité à prendre (sur " + fmtP(recu.qte) + ")", qIn));

    var gSel = null;
    if (!jumeau) {
      gSel = el("select", "owd-select");
      G.forEach(function (gn, gi) {
        var o = el("option", null, gn);
        o.value = String(gi);
        gSel.appendChild(o);
      });
      corps.appendChild(fld("Ranger dans", gSel));
    }

    var choix = {};
    if (jumeau) {
      corps.appendChild(el("div", "owd-modal-note",
        "« " + jumeau.nom + " » est déjà dans l'équipement (" + fmtP(jumeau.qte) + ")" +
        (recu.id ? " — même identifiant" : "") + " : les quantités s'additionnent."));
      [["nom", "Nom"], ["img", "Image"], ["poids", "Poids"], ["places", "Places"],
       ["froid", "Froid"], ["chaud", "Chaud"], ["desc", "Description"],
       ["achat", "Achat"], ["vente", "Vente"]].forEach(function (c) {
        var mien = txt(jumeau[c[0]]), neuf = txt(recu[c[0]]);
        if (mien === neuf || (!mien && !neuf)) return;
        choix[c[0]] = "mien";
        var bloc = el("div", "owd-modal-conflit");
        bloc.appendChild(el("div", "lbl", c[1] + " : deux versions"));
        var row = ligne("choix");
        [["mien", "Garder le mien", mien], ["neuf", "Prendre le nouveau", neuf]].forEach(function (opt) {
          var b = el("button", "owd-modal-choix" + (opt[0] === "mien" ? " on" : ""));
          b.type = "button";
          b.appendChild(el("div", "tag", opt[1]));
          if (c[0] === "img" && opt[2]) {
            var mi = el("img"); mi.alt = ""; mi.src = opt[2];
            b.appendChild(mi);
          } else b.appendChild(el("div", "val", opt[2] ? opt[2] : "— vide —"));
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
        ["nom", "img", "poids", "places", "froid", "chaud", "desc", "achat", "vente"]
          .forEach(function (k) { if (choix[k] === "neuf") jumeau[k] = recu[k]; });
        if (!jumeau.id && recu.id) jumeau.id = recu.id;
      } else {
        items.push({
          id: recu.id || uid("obj"), nom: recu.nom, qte: q, poids: recu.poids,
          places: recu.places, froid: recu.froid, chaud: recu.chaud,
          achat: recu.achat, vente: recu.vente, desc: recu.desc, img: recu.img,
          groupe: gSel ? borne(num(gSel.value, 0), 0, G.length - 1) : 0,
          porte: false, rapide: false
        });
      }
      refresh();
      rebuildObjets();
      flash(fmtP(q) + " × « " + recu.nom + " » ajouté à l'équipement.");
    }, "Prendre");
  }

  // ============================================================================
  // ONGLET « FICHE »
  // ============================================================================

  // ---------- caracteristiques ----------
  // Une ligne par caracteristique : libelle, base, XP, et le TOTAL en gros. Le
  // modificateur et le forcage ne paraissent pas ici — ils vivent dans les
  // Options, et une pastille discrete signale la ligne qui en porte un.
  // Aucun bouton de jet : LES CARACTERISTIQUES NE SE JETTENT PAS. Elles
  // ouvrent les armes et la magie, elles fixent les degats, elles donnent les
  // capacites du corps ; elles n'entrent jamais dans un jet.
  function buildCaracs() {
    var b = block("Caractéristiques");
    var t = el("div", "owd-caracs");
    CARACS.forEach(function (c) {
      var r = ligne("owd-carac");
      var nom = el("span", "nom", CARAC_LIB[c]);
      var pastille = el("i", "owd-levier");
      pastille.title = "Un levier des Options agit sur cette caractéristique";
      nom.appendChild(pastille);
      r.appendChild(nom);
      r.appendChild(fld("Base", numInput(
        function () { return state.caracsBase[c]; },
        function (v) { state.caracsBase[c] = borne(v, -9999, 9999); }, { min: 0 })));
      r.appendChild(fld("XP", numInput(
        function () { return state.caracsXp[c]; },
        function (v) { state.caracsXp[c] = borne(v, -9999, 9999); })));
      var tot = el("span", "tot", "");
      r.appendChild(tot);
      hooks.push(function () {
        tot.textContent = String(caracTotal(c));
        var force = has(state.caracsForce, c);
        var mod = (state.caracsMod[c] || 0) !== 0;
        pastille.classList.toggle("on", force || mod);
        tot.classList.toggle("force", force);
        pastille.title = force ? "Total forcé dans les Options"
                       : mod ? "Modificateur posé dans les Options" : "";
      });
      t.appendChild(r);
    });
    b.appendChild(t);
    return b;
  }

  // ---------- progression ----------
  // Le total depense est l'ETAT du personnage ; le bareme qui le produit est
  // une regle et n'est nulle part a l'ecran.
  function buildProgression() {
    var b = block("Progression");
    b.appendChild(fld("Expérience totale", numInput(
      function () { return state.xpTotal; },
      function (v) { state.xpTotal = Math.max(0, v); }, { min: 0, step: 5 })));
    var xpl = ligne("owd-compte");
    var xpD = el("span", "v", ""), xpR = el("span", "v", "");
    xpl.appendChild(el("span", "k", "Dépensée"));
    xpl.appendChild(xpD);
    xpl.appendChild(el("span", "k", "Restante"));
    xpl.appendChild(xpR);
    b.appendChild(xpl);

    b.appendChild(fld("Points de rupture", numInput(
      function () { return state.ruptureTotal; },
      function (v) { state.ruptureTotal = Math.max(0, v); }, { min: 0 })));
    var rl = ligne("owd-compte");
    var rD = el("span", "v", ""), rR = el("span", "v", "");
    rl.appendChild(el("span", "k", "Dépensés"));
    rl.appendChild(rD);
    rl.appendChild(el("span", "k", "Restants"));
    rl.appendChild(rR);
    b.appendChild(rl);

    hooks.push(function () {
      xpD.textContent = String(xpDepense());
      xpR.textContent = String(xpReste());
      // le restant negatif se dit en rouge et ne bloque rien : c'est au
      // meneur d'en decider, pas a la fiche
      xpR.classList.toggle("neg", xpReste() < 0);
      xpD.classList.toggle("force", state.xpDepForce !== null);
      rD.textContent = String(ruptureDep());
      rR.textContent = String(ruptureReste());
      rR.classList.toggle("neg", ruptureReste() < 0);
      rD.classList.toggle("force", state.ruptureDepForce !== null);
    });
    return b;
  }

  // ---------- des d'action ----------
  // Rien ne se remet a zero tout seul : la fiche ne sait pas quand le tour
  // tourne, et le deviner ferait perdre le compte au mauvais moment.
  function buildDes() {
    var b = block("Dés d'action");
    var g = el("div", "owd-des");
    var pastilles = el("div", "owd-pastilles");
    g.appendChild(pastilles);
    var compte = el("div", "owd-des-compte", "");
    g.appendChild(compte);
    hooks.push(function () {
      var n = state.desTour;
      while (pastilles.children.length > n) pastilles.removeChild(pastilles.lastChild);
      while (pastilles.children.length < n) (function (i) {
        var p = el("button", "owd-pastille");
        p.type = "button";
        p.addEventListener("click", function () {
          // recliquer sur la derniere pastille allumee la rend : c'est le
          // geste attendu quand on en a engage un de trop
          state.desEngages = state.desEngages === i + 1 ? i : i + 1;
          state.desEngages = borne(state.desEngages, 0, state.desTour);
          refresh();
        });
        pastilles.appendChild(p);
      })(pastilles.children.length);
      for (var i = 0; i < pastilles.children.length; i++) {
        pastilles.children[i].classList.toggle("on", i < state.desEngages);
        pastilles.children[i].title = (i + 1) + (i ? " dés engagés" : " dé engagé");
      }
      compte.textContent = desRestants() + " / " + state.desTour;
    });
    b.appendChild(g);
    var act = ligne("owd-actions");
    act.appendChild(miniBtn("Nouveau tour", "Rend tous les dés d'action", function () {
      state.desEngages = 0;
      refresh();
    }, "primary"));
    // Un jet libre, pour ce que la fiche ne prevoit pas.
    act.appendChild(miniBtn("Jet libre", "Lancer un nombre de dés au choix", function () {
      envoyer("&{template:default} {{name=Jet}} {{Jet=[[?{Dés|1}" + FACES + " + (?{Bonus|0})]]}}") ||
        flash("Hors de Roll20 : aucun jet libre à envoyer.");
    }));
    b.appendChild(act);
    return b;
  }

  // ---------- reserves ----------
  // Sept jauges. On ne stocke QUE le courant, le maximum se recalcule : le
  // ranger aussi donnerait deux verites pour la meme valeur.
  function buildReserves() {
    var b = block("Réserves");
    // pas de 1, ou de 10 avec Maj : soigner ou perdre cent points a l'unite
    // serait un supplice, et un pas de 10 par defaut raterait toujours la
    // derniere unite
    function jauge(cfg) {
      var w = el("div", "owd-jauge");
      var tete = ligne("tete");
      tete.appendChild(el("span", "nom", cfg.titre));
      var val = el("span", "val", "");
      tete.appendChild(val);
      w.appendChild(tete);
      var ba = barre(cfg.get, cfg.max, cfg.cls);
      w.appendChild(ba);
      var pct = cfg.pct ? el("div", "owd-pct", "") : null;
      if (pct) w.appendChild(pct);
      var cmd = ligne("owd-jauge-cmd");
      function bouge(sens, ev) {
        var pas = ev && ev.shiftKey ? 10 : 1;
        cfg.set(borne(cfg.get() + sens * pas, 0, cfg.max()));
        refresh();
      }
      cmd.appendChild(miniBtn("−", "Retirer 1 (Maj : 10)", function (e) { bouge(-1, e); }));
      cmd.appendChild(numInput(cfg.get, function (v) { cfg.set(borne(v, 0, cfg.max())); }, { min: 0 }));
      cmd.appendChild(miniBtn("+", "Ajouter 1 (Maj : 10)", function (e) { bouge(1, e); }));
      if (cfg.aMax) cmd.appendChild(miniBtn("max", "Remettre au maximum, et l'y laisser suivre la caractéristique", cfg.aMax));
      w.appendChild(cmd);
      hooks.push(function () {
        val.textContent = cfg.get() + " / " + cfg.max();
        if (pct) {
          var m = cfg.max();
          pct.textContent = m > 0 ? Math.round(cfg.get() * 100 / m) + " %" : "—";
        }
      });
      return w;
    }
    function auMax(cle) {
      return function () { state[cle] = null; refresh(); };
    }
    b.appendChild(jauge({ titre: "PV", cls: "pv", pct: false, get: pvCourant, max: pvMax,
      set: function (v) { state.pv = v; }, aMax: auMax("pv") }));
    b.appendChild(jauge({ titre: "PE", cls: "pe", pct: false, get: peCourant, max: peMax,
      set: function (v) { state.pe = v; }, aMax: auMax("pe") }));

    // PM : le SEUL endroit de la fiche ou un maximum se tape. Tant qu'il est
    // vide, pas de barre — un nombre seul, parce qu'une barre sans borne
    // mentirait sur ce qui reste.
    var pmW = el("div", "owd-jauge owd-jauge-pm");
    var pmT = ligne("tete");
    pmT.appendChild(el("span", "nom", "PM"));
    var pmV = el("span", "val", "");
    pmT.appendChild(pmV);
    pmW.appendChild(pmT);
    var pmB = barre(pmCour, function () { return state.pmMax === null ? 0 : state.pmMax; }, "pm");
    pmW.appendChild(pmB);
    var pmC = ligne("owd-jauge-cmd");
    pmC.appendChild(miniBtn("−", "Retirer 1 (Maj : 10)", function (e) {
      state.pm = Math.max(0, pmCour() - (e && e.shiftKey ? 10 : 1)); refresh();
    }));
    pmC.appendChild(numInput(pmCour, function (v) { state.pm = Math.max(0, v); }, { min: 0 }));
    pmC.appendChild(miniBtn("+", "Ajouter 1 (Maj : 10)", function (e) {
      state.pm = Math.max(0, pmCour() + (e && e.shiftKey ? 10 : 1)); refresh();
    }));
    pmC.appendChild(fld("max", nullInput(
      function () { return state.pmMax; },
      function (v) { state.pmMax = v === null ? null : Math.max(0, v); }, "libre"), "owd-f-mini"));
    pmW.appendChild(pmC);
    hooks.push(function () {
      pmV.textContent = state.pmMax === null ? String(pmCour()) : pmCour() + " / " + state.pmMax;
      pmB.style.display = state.pmMax === null ? "none" : "";
    });
    b.appendChild(pmW);

    b.appendChild(jauge({ titre: "PI", cls: "pi", get: piCourant,
      max: function () { return capMax("pi"); },
      set: function (v) { state.pi = v; }, aMax: auMax("pi") }));
    // les trois reserves de survie portent leur pourcentage restant : c'est
    // ce qui rend l'effondrement lisible sans montrer la regle qui le produit
    b.appendChild(jauge({ titre: "Repos", cls: "repos", pct: true, get: reposCour,
      max: function () { return capMax("repos"); },
      set: function (v) { state.repos = v; }, aMax: auMax("repos") }));
    b.appendChild(jauge({ titre: "Satiété", cls: "satiete", pct: true, get: satieteCour,
      max: function () { return capMax("satiete"); },
      set: function (v) { state.satiete = v; }, aMax: auMax("satiete") }));
    b.appendChild(jauge({ titre: "Hydratation", cls: "hydra", pct: true, get: hydraCour,
      max: function () { return capMax("hydra"); },
      set: function (v) { state.hydratation = v; }, aMax: auMax("hydratation") }));

    var act = ligne("owd-actions");
    act.appendChild(miniBtn("Carte d'état", "Envoyer au tchat où en est le personnage", function () {
      sayChat(state.name || "Personnage", [
        ["PV", pvCourant() + " / " + pvMax()],
        ["PE", peCourant() + " / " + peMax()],
        ["PM", state.pmMax === null ? String(pmCour()) : pmCour() + " / " + state.pmMax],
        ["PI", piCourant() + " / " + capMax("pi")],
        ["Repos", reposCour() + " / " + capMax("repos")],
        ["Satiété", satieteCour() + " / " + capMax("satiete")],
        ["Hydratation", hydraCour() + " / " + capMax("hydra")],
        ["Effondrement", String(effondrement())],
        ["Exposition", expoCour() + (expoSens() ? " (" + expoSens() + ", niveau " + nivExpo() + ")" : "")],
        ["Climat", "ressentie " + ressentie() + " °C · zone " + borneBasse() + " – " + borneHaute() +
                   (paliers() ? " · " + paliers() + " palier" + (paliers() > 1 ? "s" : "") + " de " + climatSens() : "")]
      ]);
    }));
    b.appendChild(act);
    return b;
  }

  // ---------- effondrement ----------
  // La valeur ajoutee de cette fiche : il croise quatre reserves, il est
  // penible a tenir a la main, et il change PV MAX et PE MAX. On montre le
  // niveau, d'ou viennent ses parts, et ce qu'il retire AU PERSONNAGE — jamais
  // la table des dix niveaux, qui est une regle.
  function buildEffondrement() {
    var b = block("Effondrement");
    b.appendChild(bigTile("Niveau", effondrement, function () {
      return inconscient() ? "inconscient" : effondrement() >= 1 ? "sur 10" : "aucun";
    }));
    var parts = el("div", "owd-parts");
    [["Repos", function () { return nivReserve(reposCour(), capMax("repos")); }],
     ["Satiété", function () { return nivReserve(satieteCour(), capMax("satiete")); }],
     ["Hydratation", function () { return nivReserve(hydraCour(), capMax("hydra")); }],
     ["Exposition", nivExpo]].forEach(function (p) {
      var r = ligne("owd-part");
      r.appendChild(el("span", "k", p[0]));
      var v = el("span", "v", "");
      r.appendChild(v);
      hooks.push(function () {
        var n = p[1]();
        v.textContent = String(n);
        r.classList.toggle("nul", n === 0);
      });
      parts.appendChild(r);
    });
    b.appendChild(parts);
    var eff = el("div", "owd-effet", "");
    b.appendChild(eff);
    hooks.push(function () {
      var e = effondrement();
      // les deux valeurs DU PERSONNAGE, pas la table : ce qu'il lui reste, et
      // en regard le pourcentage qui l'a produit
      eff.textContent = "PE MAX " + (100 - e * 10) + " % — " + peMax() +
                        " · PV MAX " + (100 - e * 5) + " % — " + pvMax();
      eff.classList.toggle("ko", inconscient());
      b.classList.toggle("owd-alerte", e >= 5);
    });
    var note = el("div", "owd-note", "");
    b.appendChild(note);
    hooks.push(function () {
      note.textContent = inconscient()
        ? "Le maximum de points d'endurance est à zéro : le personnage est inconscient."
        : "";
    });
    return b;
  }

  // ---------- climat et exposition ----------
  // La fiche montre la ZONE DU PERSONNAGE et ce que dix minutes lui font. Elle
  // ne montre ni les degrés que chaque intensité ajoute, ni la table des
  // milieux, ni les deux tables du froid et du chaud, ni les maladies.
  function buildClimat() {
    var b = block("Climat et exposition");
    var g = ligne("owd-grid2");
    g.appendChild(fld("Température de l'air (°C)", numInput(
      function () { return state.climat.temp; },
      function (v) { state.climat.temp = borne(v, -200, 200); })));
    b.appendChild(g);

    var segs = el("div", "owd-segs");
    var btns = [];
    ACT_LIB.forEach(function (lib, i) {
      var s = el("button", "seg", lib);
      s.type = "button";
      s.title = "Intensité de l'activité du moment";
      s.addEventListener("click", function () { state.climat.activite = i; refresh(); });
      btns.push(s);
      segs.appendChild(s);
    });
    hooks.push(function () {
      btns.forEach(function (s, i) { s.classList.toggle("on", state.climat.activite === i); });
    });
    b.appendChild(fld("Activité", segs));

    var g2 = ligne("owd-grid2");
    g2.appendChild(fld("Froid, hors équipement", numInput(
      function () { return state.climat.froidMod; },
      function (v) { state.climat.froidMod = borne(v, -999, 999); })));
    g2.appendChild(fld("Chaud, hors équipement", numInput(
      function () { return state.climat.chaudMod; },
      function (v) { state.climat.chaudMod = borne(v, -999, 999); })));
    b.appendChild(g2);

    var lect = el("div", "owd-lecture");
    var lRes = el("div", "l", ""), lZone = el("div", "l", ""), lPal = el("div", "l", "");
    lect.appendChild(lRes); lect.appendChild(lZone); lect.appendChild(lPal);
    b.appendChild(lect);

    // barre a deux sens, de −borne a +borne : le zero est au milieu, et c'est
    // la seule facon de lire d'un coup d'oeil de quel cote le corps penche
    var bar = el("div", "owd-expo");
    var zero = el("i", "zero");
    var fill = el("i", "fill");
    bar.appendChild(fill); bar.appendChild(zero);
    b.appendChild(bar);
    var lExpo = el("div", "owd-expo-val", "");
    b.appendChild(lExpo);

    var cmd = ligne("owd-jauge-cmd");
    cmd.appendChild(miniBtn("−", "Retirer 1 (Maj : 10)", function (e) {
      state.expo = borne(expoCour() - (e && e.shiftKey ? 10 : 1), -expoBorne(), expoBorne());
      refresh();
    }));
    cmd.appendChild(numInput(expoCour, function (v) {
      state.expo = borne(v, -expoBorne(), expoBorne());
    }));
    cmd.appendChild(miniBtn("+", "Ajouter 1 (Maj : 10)", function (e) {
      state.expo = borne(expoCour() + (e && e.shiftKey ? 10 : 1), -expoBorne(), expoBorne());
      refresh();
    }));
    var btn10 = miniBtn("+ 10 min", "Applique à l'exposition ce que dix minutes lui font", function () {
      state.expo = borne(expoCour() + expoParDix(), -expoBorne(), expoBorne());
      refresh();
    }, "primary");
    cmd.appendChild(btn10);
    b.appendChild(cmd);

    hooks.push(function () {
      lRes.textContent = "Ressentie " + ressentie() + " °C";
      lZone.textContent = "Zone " + borneBasse() + " – " + borneHaute() + " °C";
      var p = paliers(), s = climatSens();
      lPal.textContent = s === "zone" ? "Dans sa zone"
        : ecartClimat() + " ° d'écart · " + p + " palier" + (p > 1 ? "s" : "") + " de " + s;
      lPal.className = "l" + (s === "zone" ? " ok" : " " + s);
      var bo = expoBorne(), e = expoCour();
      var pc = bo > 0 ? borne(Math.abs(e) * 50 / bo, 0, 50) : 0;
      fill.style.width = pc + "%";
      fill.style.left = e < 0 ? (50 - pc) + "%" : "50%";
      fill.className = "fill" + (e < 0 ? " froid" : e > 0 ? " chaud" : "");
      lExpo.textContent = "Exposition " + (e > 0 ? "+" : "") + e + " / ± " + bo +
        " (" + (expoPct() > 0 ? "+" : "") + expoPct() + " %)" +
        (nivExpo() ? " · niveau " + nivExpo() : "");
      var d = expoParDix();
      btn10.textContent = "+ 10 min (" + (d > 0 ? "+" : "") + d + ")";
      btn10.disabled = d === 0;
    });
    return b;
  }

  // ---------- competences ----------
  // Le rang du personnage se dit (« Maitre ») ; ce qu'il a coute ne se repete
  // pas ligne a ligne, et le bareme n'est nulle part.
  var FILTRE = { posees: "owd-r20-filtre-posees" };
  var compFiltre = "";
  var compPosees = COMPACT;   // dans Roll20 on joue : les rangs poses d'abord
  function buildComps() {
    var b = block("Compétences");
    var tete = ligne("owd-comps-tete");
    var f = el("input", "owd-filtre");
    f.type = "search";
    f.placeholder = "Filtrer…";
    f.value = compFiltre;
    f.addEventListener("input", function () { compFiltre = f.value; rebuildComps(); });
    tete.appendChild(f);
    var only = el("label", "owd-check");
    var oc = el("input");
    oc.type = "checkbox";
    oc.checked = compPosees;
    oc.addEventListener("change", function () {
      compPosees = oc.checked;
      lset(FILTRE.posees, compPosees ? "1" : "0");
      rebuildComps();
    });
    only.appendChild(oc);
    only.appendChild(el("span", null, "Rangs posés seulement"));
    tete.appendChild(only);
    b.appendChild(tete);

    var liste = el("div", "owd-comps");
    b.appendChild(liste);
    compsListe = liste;

    var ajout = ligne("owd-ajout");
    var ai = el("input");
    ai.type = "text";
    ai.placeholder = "Ajouter une compétence…";
    function ajouter() {
      var nom = capFirst(ai.value.trim());
      if (!nom) return;
      var vus = {};
      compsToutes().forEach(function (n) { vus[n.toLowerCase()] = 1; });
      if (vus[nom.toLowerCase()]) { flash("« " + nom + " » est déjà dans la liste."); return; }
      state.compsPerso.push({ nom: nom });
      ai.value = "";
      refresh();
      rebuildComps();
    }
    ai.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); ajouter(); } });
    ajout.appendChild(ai);
    ajout.appendChild(miniBtn("Ajouter", "Ajouter une compétence personnalisée", ajouter));
    b.appendChild(ajout);

    rebuildComps();
    return b;
  }
  var compsListe = null;
  function rebuildComps() {
    if (!compsListe) return;
    regComps.length = 0;
    compsListe.innerHTML = "";
    var q = compFiltre.trim().toLowerCase();
    avecReg(regComps, function () {
      var noms = compsToutes().filter(function (n) {
        if (q && n.toLowerCase().indexOf(q) < 0) return false;
        if (compPosees && !compRang(n)) return false;
        return true;
      });
      if (!noms.length) {
        compsListe.appendChild(el("div", "owd-vide",
          compsToutes().length ? "Aucune compétence ne répond au filtre."
                               : "Aucune compétence : en ajouter une ci-dessous."));
        return;
      }
      noms.forEach(function (n, i) { compsListe.appendChild(compRow(n, i % 2 === 1)); });
    });
  }
  function compRow(nom, impair) {
    var r = el("div", "owd-comp" + (impair ? " impair" : ""));
    var t = ligne("tete");
    var perso = !!state.compsPerso.filter(function (c) { return c.nom === nom; }).length;
    var nm = el("span", "nom", nom);
    if (perso) nm.appendChild(el("i", "owd-perso-mark", "·"));
    t.appendChild(nm);
    var rangNom = el("span", "rang", "");
    t.appendChild(rangNom);
    r.appendChild(t);

    var past = el("div", "owd-pastilles owd-rangs");
    var boutons = [];
    for (var i = 0; i <= 5; i++) (function (rg) {
      var p = el("button", "owd-pastille", RANG_COURT[rg]);
      p.type = "button";
      p.title = rg ? RANG_NOM[rg] : "Non initié";
      p.addEventListener("click", function () {
        // le Rang 0 NE SE NOTE PAS : la cle disparait
        if (rg === 0) delete state.comps[nom];
        else state.comps[nom] = rg;
        refresh();
        rebuildComps();
      });
      boutons.push(p);
      past.appendChild(p);
    })(i);
    r.appendChild(past);

    var jets = ligne("owd-comp-jets");
    var infos = el("span", "infos", "");
    jets.appendChild(infos);
    var btns = [];
    for (var d = 1; d <= 3; d++) (function (n) {
      var b = miniBtn(n + (n > 1 ? " dés" : " dé"), "Employer la compétence avec " + n + " dé" + (n > 1 ? "s" : ""), function () {
        doJet(nom + " — " + n + (n > 1 ? " dés" : " dé"), n, compBonus(nom), null);
      });
      btns.push(b);
      jets.appendChild(b);
    })(d);
    var note = miniBtn("Note", "Ouvrir la note de cette compétence", function () {
      zone.classList.toggle("on");
    });
    jets.appendChild(note);
    r.appendChild(jets);

    var zone = el("div", "owd-comp-note");
    zone.appendChild(areaInput(
      function () { return state.compsNote[nom] || ""; },
      function (v) {
        if (v) state.compsNote[nom] = v; else delete state.compsNote[nom];
      }, 2, "À quoi le personnage s'en sert…"));
    if (state.compsNote[nom]) zone.classList.add("on");
    r.appendChild(zone);

    hooks.push(function () {
      var rg = compRang(nom), nd = compDes(nom), bo = compBonus(nom);
      boutons.forEach(function (p, i) { p.classList.toggle("on", i === rg); });
      rangNom.textContent = rg ? RANG_NOM[rg] : "";
      infos.textContent = nd + (nd > 1 ? " dés" : " dé") + " · " + sgn(bo);
      infos.classList.toggle("force", has(state.compsForce, nom));
      // le bouton d'un nombre de des que la competence n'autorise pas
      // disparait : il ne s'agit pas de le griser, il n'existe pas
      btns.forEach(function (b, i) { b.style.display = (i + 1) <= nd ? "" : "none"; });
      note.classList.toggle("on", !!state.compsNote[nom]);
    });
    return r;
  }

  // ============================================================================
  // ONGLET « COMBAT »
  // ============================================================================

  // ---------- armes ----------
  // La fiche ne porte QUE les armes du personnage, recopiees par lui : le
  // repertoire du livre est une regle et reste au livre. Une arme n'est pas
  // une attaque — sa ligne porte la difficulte de parade et la reduction, et
  // chaque geste porte son propre seuil, ses degats et sa portee.
  var armesListe = null;
  function buildArmes() {
    var b = block("Armes");
    armesListe = el("div", "owd-armes");
    b.appendChild(armesListe);
    var act = ligne("owd-actions");
    act.appendChild(miniBtn("Ajouter une arme", null, function () {
      state.armes.push({
        id: uid("arme"), nom: "Nouvelle arme", note: "", categorie: "", portee: "",
        parade: null, reduction: 0, comp: "", poids: 0, equipee: false, gestes: []
      });
      refresh();
      rebuildArmes();
    }, "primary"));
    b.appendChild(act);
    rebuildArmes();
    return b;
  }
  function rebuildArmes() {
    if (!armesListe) return;
    regArmes.length = 0;
    armesListe.innerHTML = "";
    avecReg(regArmes, function () {
      if (!state.armes.length) {
        armesListe.appendChild(el("div", "owd-vide",
          "Aucune arme. Recopier ici celles du personnage, avec leur répertoire de gestes."));
        return;
      }
      state.armes.forEach(function (a) { armesListe.appendChild(armePanneau(a)); });
    });
  }
  // Les des et le bonus d'une arme viennent de sa COMPETENCE, une chaine libre
  // et jamais un index : renommer une competence ne doit pas decrocher l'arme
  // en silence. Elle retombe alors sur 1 dé et +0, ce qui se voit.
  function armeDes(a) { return compDes(a.comp); }
  function armeBonus(a) { return compBonus(a.comp); }
  function armePanneau(a) {
    var p = el("details", "owd-arme");
    p.open = true;
    var s = el("summary");
    var nm = el("span", "nom", "");
    s.appendChild(nm);
    var res = el("span", "res", "");
    s.appendChild(res);
    p.appendChild(s);

    var g = ligne("owd-grid3");
    g.appendChild(fld("Nom", textInput(
      function () { return a.nom; }, function (v) { a.nom = v; })));
    g.appendChild(fld("Catégorie", textInput(
      function () { return a.categorie; }, function (v) { a.categorie = v; }, "Épée à une main")));
    g.appendChild(fld("Portée", textInput(
      function () { return a.portee; }, function (v) { a.portee = v; }, "2 pas")));
    p.appendChild(g);

    var g2 = ligne("owd-grid4");
    // liste des competences connues, plus la saisie libre : c'est une chaine,
    // et une competence qui n'existe pas encore doit pouvoir s'ecrire
    var cin = el("input");
    cin.type = "text";
    cin.setAttribute("list", "owd-comps-datalist");
    cin.placeholder = "Compétence employée";
    cin.value = a.comp;
    cin.addEventListener("input", function () { a.comp = cin.value; refresh(); });
    hooks.push(function () { if (document.activeElement !== cin) cin.value = a.comp; });
    g2.appendChild(fld("Compétence", cin));
    g2.appendChild(fld("Parade", nullInput(
      function () { return a.parade; },
      function (v) { a.parade = v === null ? null : borne(v, 0, 99); }, "—")));
    g2.appendChild(fld("Réduction", numInput(
      function () { return a.reduction; },
      function (v) { a.reduction = Math.max(0, v); }, { min: 0 })));
    g2.appendChild(fld("Poids", decInput(
      function () { return a.poids; }, function (v) { a.poids = v; })));
    p.appendChild(g2);

    var g3 = ligne("owd-arme-cmd");
    g3.appendChild(checkbox("Équipée", function () { return a.equipee; },
      function (v) { a.equipee = v; }));
    var parer = miniBtn("Parer", "Jet de parade avec cette arme", function () {
      // La parade est un jet comme un autre : elle prend le plafond de des et
      // le bonus de la competence de l'arme. Pas de requete de situation ici,
      // la difficulte appartenant a l'arme et rien ne l'ajustant aux regles.
      choixDes("Parer — " + (a.nom || "arme"), armeDes(a), function (n) {
        var f = [["Jet", "[[" + des(n) + (armeBonus(a) ? (armeBonus(a) > 0 ? " + " : " - ") +
                 Math.abs(armeBonus(a)) : "") + (envInput() ? ENV_QUERY : "") + "]]"]];
        if (a.parade !== null) f.push(["Difficulté", String(a.parade)]);
        if (a.reduction) f.push(["Réduction", String(a.reduction)]);
        sayChat("Parade — " + (a.nom || "arme"), f);
      });
    }, "primary");
    g3.appendChild(parer);
    g3.appendChild(miniBtn("Carte", "Envoyer l'arme et son répertoire au tchat", function () {
      var f = [["Catégorie", a.categorie], ["Portée", a.portee]];
      if (a.parade !== null) f.push(["Parade", String(a.parade)]);
      if (a.reduction) f.push(["Réduction", String(a.reduction)]);
      // un champ par geste : c'est exactement l'usage prevu du gabarit
      a.gestes.forEach(function (ge) {
        f.push([ge.nom || "Geste",
                "seuil " + ge.seuil + " · " + ge.degats + (ge.type ? " " + ge.type : "") +
                (ge.portee ? " · " + ge.portee : "")]);
      });
      sayChat(a.nom || "Arme", f);
    }));
    g3.appendChild(miniBtn("Ajouter un geste", null, function () {
      a.gestes.push({ nom: "", seuil: 0, degats: 0, type: "", typeMi: "",
                      portee: "", trajet: "", garde: "", note: "" });
      refresh();
      rebuildArmes();
    }));
    g3.appendChild(miniBtn("Supprimer", "Retirer cette arme de la fiche", function () {
      confirmer("Supprimer « " + (a.nom || "arme") + " »",
        "L'arme et son répertoire quittent la fiche.", "Supprimer", function () {
          var i = state.armes.indexOf(a);
          if (i >= 0) state.armes.splice(i, 1);
          refresh();
          rebuildArmes();
        });
    }, "danger"));
    p.appendChild(g3);

    var tab = el("div", "owd-gestes");
    a.gestes.forEach(function (ge) { tab.appendChild(gesteLigne(a, ge)); });
    p.appendChild(tab);

    p.appendChild(fld("Note", areaInput(
      function () { return a.note; }, function (v) { a.note = v; }, 2, "")));

    hooks.push(function () {
      nm.textContent = (a.nom || "Arme") + (a.categorie ? " — " + a.categorie : "");
      var d = armeDes(a), bo = armeBonus(a);
      res.textContent = (a.parade !== null ? "parade " + a.parade + " · " : "") +
        "réduction " + a.reduction + " · " + d + (d > 1 ? " dés " : " dé ") + sgn(bo) +
        (a.equipee ? " · équipée" : "");
      p.classList.toggle("equipee", a.equipee);
      parer.style.display = a.parade === null ? "none" : "";
    });
    return p;
  }
  function gesteLigne(a, ge) {
    var w = el("div", "owd-geste");
    var l1 = ligne("owd-geste-l1");
    l1.appendChild(fld("Geste", textInput(
      function () { return ge.nom; }, function (v) { ge.nom = v; }, "Fendant du côté droit"), "grand"));
    l1.appendChild(fld("Seuil", numInput(
      function () { return ge.seuil; },
      function (v) { ge.seuil = borne(v, 0, 99); }, { min: 0 })));
    l1.appendChild(fld("Dégâts", numInput(
      function () { return ge.degats; },
      function (v) { ge.degats = Math.max(0, v); }, { min: 0, step: 2 })));
    l1.appendChild(fld("Type", textInput(
      function () { return ge.type; },
      function (v) { ge.type = v.toUpperCase().slice(0, 6); }, "TRA")));
    // Le type de la MOITIE change souvent : ce n'est pas la meme partie de
    // l'arme qui touche, et le confondre avec le type plein ferait passer du
    // bois pour du fer.
    l1.appendChild(fld("Au passage", textInput(
      function () { return ge.typeMi; },
      function (v) { ge.typeMi = v.toUpperCase().slice(0, 6); }, "CON")));
    l1.appendChild(fld("Portée", textInput(
      function () { return ge.portee; }, function (v) { ge.portee = v; }, "2")));
    w.appendChild(l1);

    var l2 = ligne("owd-geste-l2");
    var att = miniBtn("Attaquer", "Jet d'attaque de ce geste", function () {
      choixDes((a.nom || "Arme") + " — " + (ge.nom || "geste"), armeDes(a), function (n) {
        var extra = [];
        // les degats ne se JETTENT jamais : ce sont des nombres fixes, et
        // aucun [[ ]] ne doit les entourer, sous aucun pretexte
        if (ge.degats) extra.push(["Dégâts", ge.degats + (ge.type ? " " + ge.type : "")]);
        if (ge.typeMi) extra.push(["Au passage", plancher(ge.degats / 2) + " " + ge.typeMi]);
        if (ge.portee) extra.push(["Portée", ge.portee]);
        doJet((a.nom || "Arme") + " — " + (ge.nom || "geste"), n, armeBonus(a), ge.seuil, extra);
      });
    }, "primary");
    l2.appendChild(att);
    var det = miniBtn("Trajet", "Le trajet et la garde, recopiés du livre", function () {
      plus.classList.toggle("on");
    });
    l2.appendChild(det);
    l2.appendChild(miniBtn("×", "Retirer ce geste", function () {
      var i = a.gestes.indexOf(ge);
      if (i >= 0) a.gestes.splice(i, 1);
      refresh();
      rebuildArmes();
    }, "danger"));
    var res = el("span", "res", "");
    l2.appendChild(res);
    w.appendChild(l2);

    // On les LIT, on ne les dessine pas : la carte hexagonale est au livre.
    var plus = el("div", "owd-geste-plus");
    plus.appendChild(fld("Trajet", textInput(
      function () { return ge.trajet; }, function (v) { ge.trajet = v; }, "1d2:passe>2:frappe>1:passe")));
    plus.appendChild(fld("Garde", textInput(
      function () { return ge.garde; }, function (v) { ge.garde = v; }, "3>9")));
    plus.appendChild(fld("Note", textInput(
      function () { return ge.note; }, function (v) { ge.note = v; })));
    w.appendChild(plus);

    hooks.push(function () {
      res.textContent = ge.degats
        ? ge.degats + (ge.type ? " " + ge.type : "") +
          (ge.typeMi ? " · " + plancher(ge.degats / 2) + " " + ge.typeMi + " au passage" : "")
        : "";
    });
    return w;
  }

  // ---------- techniques ----------
  // Les rangs au-dela du rang courant sont grises, jamais caches : c'est ce
  // qui reste a prendre.
  var techsListe = null;
  function buildTechniques() {
    var b = block("Techniques");
    techsListe = el("div", "owd-techs");
    b.appendChild(techsListe);
    var act = ligne("owd-actions");
    act.appendChild(miniBtn("Ajouter une technique", null, function () {
      state.techniques.push({
        id: uid("tech"), nom: "Nouvelle technique", source: "", note: "",
        rang: 0, rangs: [{ texte: "", rupture: false, xp: 0 }],
        seuil: null, cout: "", des: 5, desMod: 0, degats: "", portee: ""
      });
      refresh();
      rebuildTechs();
    }, "primary"));
    b.appendChild(act);
    rebuildTechs();
    return b;
  }
  function rebuildTechs() {
    if (!techsListe) return;
    regTechs.length = 0;
    techsListe.innerHTML = "";
    avecReg(regTechs, function () {
      if (!state.techniques.length) {
        techsListe.appendChild(el("div", "owd-vide",
          "Aucune technique. Recopier ici les gestes que le personnage a appris."));
        return;
      }
      state.techniques.forEach(function (t) { techsListe.appendChild(techPanneau(t)); });
    });
  }
  function techPanneau(t) {
    var p = el("details", "owd-tech");
    p.open = true;
    var s = el("summary");
    var nm = el("span", "nom", "");
    s.appendChild(nm);
    var res = el("span", "res", "");
    s.appendChild(res);
    p.appendChild(s);

    var g = ligne("owd-grid3");
    g.appendChild(fld("Nom", textInput(function () { return t.nom; }, function (v) { t.nom = v; })));
    g.appendChild(fld("Source", textInput(function () { return t.source; }, function (v) { t.source = v; })));
    g.appendChild(fld("Dés au plus", numInput(
      function () { return t.des; }, function (v) { t.des = borne(v, 0, 9); }, { min: 0, max: 9 })));
    p.appendChild(g);

    var g2 = ligne("owd-grid4");
    // seuil nul = technique a COUT : elle ne se jette pas, elle se paie
    g2.appendChild(fld("Seuil", nullInput(
      function () { return t.seuil; },
      function (v) { t.seuil = v === null ? null : borne(v, 0, 99); }, "à coût")));
    g2.appendChild(fld("Coût", textInput(
      function () { return t.cout; }, function (v) { t.cout = v; }, "2 DÉ et 10 PM")));
    g2.appendChild(fld("Portée", textInput(
      function () { return t.portee; }, function (v) { t.portee = v; })));
    g2.appendChild(fld("Dégâts", textInput(
      function () { return t.degats; }, function (v) { t.degats = v; })));
    p.appendChild(g2);

    var past = el("div", "owd-pastilles owd-rangs");
    var boutons = [];
    for (var i = 0; i <= techRangMax(t); i++) (function (rg) {
      var pb = el("button", "owd-pastille", rg ? String(rg) : "0");
      pb.type = "button";
      pb.title = rg ? techRangNom(t, rg - 1) : "Pas apprise";
      pb.addEventListener("click", function () { t.rang = rg; refresh(); rebuildTechs(); });
      boutons.push(pb);
      past.appendChild(pb);
    })(i);
    p.appendChild(past);

    var corps = el("div", "owd-tech-rangs");
    t.rangs.forEach(function (r, i) {
      var w = el("div", "owd-tech-rang");
      var tete = ligne("tete");
      tete.appendChild(el("span", "k", techRangNom(t, i)));
      tete.appendChild(checkbox("Rupture", function () { return r.rupture; },
        function (v) { r.rupture = v; }));
      // Les regles ne donnent AUCUN prix en XP pour une technique : ce champ
      // est une saisie, et surtout pas un bareme calcule.
      tete.appendChild(fld("XP", numInput(
        function () { return r.xp; }, function (v) { r.xp = Math.max(0, v); }, { min: 0, step: 5 }), "owd-f-mini"));
      tete.appendChild(miniBtn("×", "Retirer ce rang", function () {
        var k = t.rangs.indexOf(r);
        if (k >= 0) t.rangs.splice(k, 1);
        t.rang = borne(t.rang, 0, t.rangs.length);
        refresh();
        rebuildTechs();
      }, "danger"));
      w.appendChild(tete);
      w.appendChild(areaInput(function () { return r.texte; },
        function (v) { r.texte = v; }, 2, "Ce que ce rang apporte…"));
      hooks.push(function () { w.classList.toggle("pris", i < techRangCour(t)); });
      corps.appendChild(w);
    });
    p.appendChild(corps);

    var act = ligne("owd-actions");
    // La LONGUEUR de rangs EST le nombre de rangs : pas de champ nbRangs a
    // cote, qui donnerait deux verites a departager. Cinq au plus.
    var addR = miniBtn("Ajouter un rang", null, function () {
      if (t.rangs.length >= 5) { flash("Une technique compte cinq rangs au plus."); return; }
      t.rangs.push({ texte: "", rupture: false, xp: 0 });
      refresh();
      rebuildTechs();
    });
    act.appendChild(addR);
    act.appendChild(miniBtn("Employer", "Jet ou carte, selon que la technique a un seuil ou un coût", function () {
      var titre = (t.nom || "Technique") +
                  (techRangCour(t) ? " — " + techRangNom(t, techRangCour(t) - 1) : "");
      // technique a COUT : une carte, sans jet. Le cout se paie, l'action se
      // fait, elle ne peut pas echouer, et un jet affiche laisserait croire le
      // contraire.
      if (t.seuil === null) {
        sayChat(titre, [["Coût", t.cout], ["Portée", t.portee],
                        ["Dégâts", t.degats], ["", techTexte(t)]]);
        return;
      }
      choixDes(titre, techDes(t) || 1, function (n) {
        // aucun bonus de rang n'entre dans le jet : les rangs d'une technique
        // lui appartiennent, ils ne donnent pas un bonus uniforme
        doJet(titre, n, 0, t.seuil,
          [["Coût", t.cout], ["Portée", t.portee], ["Dégâts", t.degats], ["", techTexte(t)]]);
      });
    }, "primary"));
    act.appendChild(miniBtn("Carte", "Envoyer la technique au tchat", function () {
      sayChat((t.nom || "Technique") +
              (techRangCour(t) ? " — " + techRangNom(t, techRangCour(t) - 1) : ""),
        [["Source", t.source], ["Coût", t.cout],
         ["Seuil", t.seuil === null ? "" : String(t.seuil)],
         ["Portée", t.portee], ["Dégâts", t.degats], ["", techTexte(t)]]);
    }));
    act.appendChild(miniBtn("Supprimer", null, function () {
      confirmer("Supprimer « " + (t.nom || "technique") + " »",
        "La technique et tous ses rangs quittent la fiche.", "Supprimer", function () {
          var i = state.techniques.indexOf(t);
          if (i >= 0) state.techniques.splice(i, 1);
          refresh();
          rebuildTechs();
        });
    }, "danger"));
    p.appendChild(act);
    p.appendChild(fld("Note", areaInput(function () { return t.note; },
      function (v) { t.note = v; }, 2, "")));

    hooks.push(function () {
      var rc = techRangCour(t);
      nm.textContent = (t.nom || "Technique") + (t.source ? " — " + t.source : "");
      res.textContent = (rc ? techRangNom(t, rc - 1) : "pas apprise") +
        " · " + techDes(t) + " dés" +
        (t.seuil !== null ? " · seuil " + t.seuil : t.cout ? " · " + t.cout : "");
      boutons.forEach(function (pb, i) { pb.classList.toggle("on", i === rc); });
      addR.disabled = t.rangs.length >= 5;
    });
    return p;
  }

  // ============================================================================
  // ONGLET « EQUIPEMENT »
  // ============================================================================

  function buildCharge() {
    var b = block("Charge");
    b.appendChild(bigTile("Porté", function () { return fmtP(poidsPorte()); },
      function () { return "sur " + charge(); }));
    b.appendChild(barre(poidsPorte, charge, "charge"));
    var s = el("div", "owd-note", "");
    b.appendChild(s);
    var det = el("div", "owd-parts");
    b.appendChild(det);
    hooks.push(function () {
      s.textContent = surcharge()
        ? "Surchargé de " + fmtP(poidsPorte() - charge()) + "."
        : "Il reste " + fmtP(charge() - poidsPorte()) + " avant la surcharge.";
      s.classList.toggle("ko", surcharge());
      det.innerHTML = "";
      state.equip.groupes.forEach(function (g, gi) {
        if (!grCompte(gi)) return;
        var t = 0;
        state.equip.objets.forEach(function (o) { if (o.groupe === gi) t += o.qte * o.poids; });
        var r = ligne("owd-part");
        r.appendChild(el("span", "k", g));
        r.appendChild(el("span", "v", fmtP(Math.round(t * 100) / 100)));
        det.appendChild(r);
      });
    });
    return b;
  }
  function buildContenance() {
    var b = block("Contenance");
    b.appendChild(bigTile("Occupé", ventreCour, function () {
      return "sur " + capMax("contenance");
    }));
    b.appendChild(barre(ventreCour, function () { return capMax("contenance"); }, "ventre"));
    var cmd = ligne("owd-jauge-cmd");
    cmd.appendChild(miniBtn("−", "Retirer 1 (Maj : 10)", function (e) {
      state.ventre = borne(ventreCour() - (e && e.shiftKey ? 10 : 1), 0, capMax("contenance"));
      refresh();
    }));
    cmd.appendChild(numInput(ventreCour, function (v) {
      state.ventre = borne(v, 0, capMax("contenance"));
    }, { min: 0 }));
    cmd.appendChild(miniBtn("+", "Ajouter 1 (Maj : 10)", function (e) {
      state.ventre = borne(ventreCour() + (e && e.shiftKey ? 10 : 1), 0, capMax("contenance"));
      refresh();
    }));
    // une place se libere toutes les dix minutes : le bouton fait passer ces
    // dix minutes-la, et lui seul — le repos, la satiete et l'hydratation
    // demanderaient une horloge de table, donc un etat partage
    cmd.appendChild(miniBtn("− 1 place", "Le passage de dix minutes", function () {
      state.ventre = Math.max(0, ventreCour() - 1);
      refresh();
    }, "primary"));
    b.appendChild(cmd);
    var s = el("div", "owd-note", "");
    b.appendChild(s);
    hooks.push(function () { s.textContent = ventreLibre() + " places libres."; });
    return b;
  }
  function buildRapides() {
    var b = block("Accès rapides");
    b.appendChild(bigTile("Occupés", rapidesOccupes, function () { return "sur " + rapides(); }));
    b.appendChild(barre(rapidesOccupes, rapides, "rapides"));
    var l = el("div", "owd-parts");
    b.appendChild(l);
    hooks.push(function () {
      l.innerHTML = "";
      state.equip.objets.forEach(function (o) {
        if (!o.rapide || !grCompte(o.groupe)) return;
        var r = ligne("owd-part");
        r.appendChild(el("span", "k", o.nom || "(sans nom)"));
        r.appendChild(el("span", "v", fmtP(o.qte)));
        l.appendChild(r);
      });
      if (!l.children.length) l.appendChild(el("div", "owd-vide", "Rien sous la main."));
      b.classList.toggle("owd-alerte", rapidesOccupes() > rapides());
    });
    return b;
  }
  function buildProtections() {
    var b = block("Protections", "ce qui est porté");
    var g = ligne("owd-grid2");
    var f = el("div", "owd-big"), c = el("div", "owd-big");
    f.appendChild(el("span", "k", "Froid"));
    var fv = el("span", "v", ""); f.appendChild(fv);
    c.appendChild(el("span", "k", "Chaud"));
    var cv = el("span", "v", ""); c.appendChild(cv);
    g.appendChild(f); g.appendChild(c);
    b.appendChild(g);
    var z = el("div", "owd-note", "");
    b.appendChild(z);
    hooks.push(function () {
      fv.textContent = String(protection("froid"));
      cv.textContent = String(protection("chaud"));
      z.textContent = "Zone " + borneBasse() + " – " + borneHaute() + " °C.";
    });
    return b;
  }

  // ---------- objets ----------
  // Des tuiles rangees par groupes, et le detail de l'objet choisi juste
  // dessous. Le bandeau d'un groupe porte sa case « ce groupe pèse » :
  // decochee, le groupe est pose au sol, son poids sort du poids porte et ses
  // vetements ne protegent plus, mais ses objets restent entiers,
  // consultables, deplacables et donnables.
  var objListe = null, objGroupe = 0, objChoisi = null;
  function buildObjets() {
    var b = block("Objets");
    objListe = el("div", "owd-objets");
    b.appendChild(objListe);
    rebuildObjets();
    return b;
  }
  function rebuildObjets() {
    if (!objListe) return;
    regObjets.length = 0;
    objListe.innerHTML = "";
    avecReg(regObjets, function () {
      objGroupe = borne(objGroupe, 0, state.equip.groupes.length - 1);

      // onglets internes des groupes
      var tabs = el("div", "owd-gtabs");
      state.equip.groupes.forEach(function (g, gi) {
        var t = el("button", "owd-gtab" + (gi === objGroupe ? " on" : ""), g);
        t.type = "button";
        t.addEventListener("click", function () { objGroupe = gi; objChoisi = null; rebuildObjets(); });
        tabs.appendChild(t);
      });
      tabs.appendChild(miniBtn("+", "Ajouter un rangement", function () {
        state.equip.groupes.push("Rangement " + (state.equip.groupes.length + 1));
        state.equip.comptes.push(true);
        refresh();
        rebuildObjets();
      }));
      objListe.appendChild(tabs);

      var bandeau = ligne("owd-gbandeau");
      bandeau.appendChild(fld("Nom du rangement", textInput(
        function () { return state.equip.groupes[objGroupe]; },
        function (v) { state.equip.groupes[objGroupe] = v; }, "", regObjets)));
      bandeau.appendChild(checkbox("Ce rangement pèse", function () { return grCompte(objGroupe); },
        function (v) { state.equip.comptes[objGroupe] = v; }, regObjets));
      bandeau.appendChild(miniBtn("Ajouter un objet", null, function () {
        var o = { id: uid("obj"), nom: "Nouvel objet", qte: 1, poids: 0, places: 0,
                  froid: 0, chaud: 0, achat: 0, vente: 0, desc: "", img: "",
                  groupe: objGroupe, porte: false, rapide: false };
        state.equip.objets.push(o);
        objChoisi = o.id;
        refresh();
        rebuildObjets();
      }, "primary"));
      if (state.equip.groupes.length > 1) {
        bandeau.appendChild(miniBtn("Supprimer le rangement", null, function () {
          confirmer("Supprimer « " + state.equip.groupes[objGroupe] + " »",
            "Les objets qu'il porte passent dans le premier rangement.", "Supprimer", function () {
              var gi = objGroupe;
              state.equip.objets.forEach(function (o) {
                if (o.groupe === gi) o.groupe = 0;
                else if (o.groupe > gi) o.groupe--;
              });
              state.equip.groupes.splice(gi, 1);
              state.equip.comptes.splice(gi, 1);
              objGroupe = 0;
              refresh();
              rebuildObjets();
            });
        }, "danger"));
      }
      objListe.appendChild(bandeau);

      // reglages d'affichage des tuiles : rien de plus qu'un affichage
      var opt = ligne("owd-obj-opts");
      opt.appendChild(fld("Colonnes", numInput(
        function () { return state.equip.opts.cols; },
        function (v) { state.equip.opts.cols = borne(v, 1, 8); rebuildObjets(); },
        { min: 1, max: 8 }, regObjets), "owd-f-mini"));
      [["nom", "Nom"], ["qte", "Quantité"], ["poids", "Poids"], ["total", "Total"]]
        .forEach(function (o) {
          opt.appendChild(checkbox(o[1], function () { return state.equip.opts[o[0]]; },
            function (v) { state.equip.opts[o[0]] = v; rebuildObjets(); }, regObjets));
        });
      objListe.appendChild(opt);

      var grille = el("div", "owd-tuiles");
      grille.style.gridTemplateColumns = "repeat(" + state.equip.opts.cols + ", minmax(0, 1fr))";
      var dedans = state.equip.objets.filter(function (o) { return o.groupe === objGroupe; });
      if (!dedans.length) grille.appendChild(el("div", "owd-vide", "Ce rangement est vide."));
      dedans.forEach(function (o) { grille.appendChild(objTuile(o)); });
      objListe.appendChild(grille);

      var courant = null;
      state.equip.objets.forEach(function (o) { if (o.id === objChoisi) courant = o; });
      if (courant) objListe.appendChild(objDetail(courant));
    });
  }
  function objTuile(o) {
    var t = el("button", "owd-tuile" + (o.id === objChoisi ? " on" : ""));
    t.type = "button";
    var clip = el("div", "clip");
    if (o.img) {
      var im = el("img"); im.alt = ""; im.src = o.img;
      clip.appendChild(im);
    } else clip.appendChild(el("span", "ph", (o.nom || "?").charAt(0).toUpperCase()));
    t.appendChild(clip);
    var pied = el("div", "pied");
    var op = state.equip.opts;
    if (op.nom) pied.appendChild(el("span", "n", o.nom || "(sans nom)"));
    var chiffres = [];
    if (op.qte) chiffres.push("× " + fmtP(o.qte));
    if (op.poids) chiffres.push(fmtP(o.poids));
    if (op.total) chiffres.push("= " + fmtP(Math.round(o.qte * o.poids * 100) / 100));
    if (chiffres.length) pied.appendChild(el("span", "c", chiffres.join(" · ")));
    t.appendChild(pied);
    var marques = el("div", "marques");
    if (o.porte) marques.appendChild(el("i", "porte", "◆"));
    if (o.rapide) marques.appendChild(el("i", "rapide", "▸"));
    t.appendChild(marques);
    t.addEventListener("click", function () {
      objChoisi = objChoisi === o.id ? null : o.id;
      rebuildObjets();
    });
    return t;
  }
  function objDetail(o) {
    var d = el("div", "owd-objet");
    var g = ligne("owd-grid4");
    g.appendChild(fld("Nom", textInput(function () { return o.nom; },
      function (v) { o.nom = v; }, "", regObjets), "grand"));
    g.appendChild(fld("Quantité", decInput(function () { return o.qte; },
      function (v) { o.qte = v; }, regObjets)));
    g.appendChild(fld("Poids", decInput(function () { return o.poids; },
      function (v) { o.poids = v; }, regObjets)));
    g.appendChild(fld("Places", numInput(function () { return o.places; },
      function (v) { o.places = Math.max(0, v); }, { min: 0 }, regObjets)));
    d.appendChild(g);

    var g2 = ligne("owd-grid4");
    g2.appendChild(fld("Froid", numInput(function () { return o.froid; },
      function (v) { o.froid = borne(v, -999, 999); }, {}, regObjets)));
    g2.appendChild(fld("Chaud", numInput(function () { return o.chaud; },
      function (v) { o.chaud = borne(v, -999, 999); }, {}, regObjets)));
    g2.appendChild(fld("Achat", decInput(function () { return o.achat; },
      function (v) { o.achat = v; }, regObjets)));
    g2.appendChild(fld("Vente", decInput(function () { return o.vente; },
      function (v) { o.vente = v; }, regObjets)));
    d.appendChild(g2);

    var g3 = ligne("owd-obj-cmd");
    // porte : ses protections comptent alors dans la zone de temperature.
    g3.appendChild(checkbox("Porté", function () { return o.porte; },
      function (v) { o.porte = v; }, regObjets));
    // rapide : une place, quelle que soit la quantite — c'est la main qui
    // compte, pas le stock.
    g3.appendChild(checkbox("Accès rapide", function () { return o.rapide; },
      function (v) { o.rapide = v; }, regObjets));
    var gsel = el("select", "owd-select");
    state.equip.groupes.forEach(function (gn, gi) {
      var op = el("option", null, gn);
      op.value = String(gi);
      if (gi === o.groupe) op.selected = true;
      gsel.appendChild(op);
    });
    gsel.addEventListener("change", function () {
      o.groupe = borne(num(gsel.value, 0), 0, state.equip.groupes.length - 1);
      refresh();
      rebuildObjets();
    });
    g3.appendChild(fld("Rangement", gsel));
    d.appendChild(g3);

    d.appendChild(fld("Image (URL)", textInput(function () { return o.img; },
      function (v) { o.img = v.trim(); }, "https://…", regObjets)));
    d.appendChild(fld("Description", areaInput(function () { return o.desc; },
      function (v) { o.desc = v; }, 3, "", regObjets)));

    var act = ligne("owd-actions");
    act.appendChild(miniBtn("Carte", "Envoyer l'objet au tchat", function () {
      sayChat(o.nom || "Objet", [
        ["Quantité", o.qte > 1 ? fmtP(o.qte) : ""],
        ["Poids", o.poids ? fmtP(o.poids) + " kg" : ""],
        ["Places", o.places ? String(o.places) : ""],
        ["Froid", o.froid ? sgn(o.froid) : ""],
        ["Chaud", o.chaud ? sgn(o.chaud) : ""],
        ["", o.desc]
      ]);
    }));
    act.appendChild(miniBtn("Donner", "Envoyer l'objet au tchat avec un lien « Prendre »", function () {
      donnerDialogue(o);
    }, "primary"));
    act.appendChild(miniBtn("Dupliquer", null, function () {
      var c = JSON.parse(JSON.stringify(o));
      c.id = uid("obj");
      state.equip.objets.push(c);
      objChoisi = c.id;
      refresh();
      rebuildObjets();
    }));
    act.appendChild(miniBtn("Supprimer", null, function () {
      confirmer("Supprimer « " + (o.nom || "objet") + " »",
        "L'objet quitte l'équipement.", "Supprimer", function () {
          var i = state.equip.objets.indexOf(o);
          if (i >= 0) state.equip.objets.splice(i, 1);
          objChoisi = null;
          refresh();
          rebuildObjets();
        });
    }, "danger"));
    d.appendChild(act);
    return d;
  }

  // ============================================================================
  // ONGLET « BIO »
  // ============================================================================
  function buildIdentite() {
    var b = block("Identité");
    // le portrait s'edite EN PLACE au clic : jamais prompt(), muet dans
    // l'iframe Roll20 sous Chrome
    var pbox = el("div", "owd-portrait");
    pbox.title = "Portrait — clic : changer l'image (URL)";
    var pclip = el("div", "clip");
    var pimg = el("img");
    pimg.alt = "";
    pclip.appendChild(pimg);
    pclip.appendChild(el("span", "ph", "?"));
    pbox.appendChild(pclip);
    hooks.push(function () {
      var want = state.portrait || "";
      if (pimg.getAttribute("src") !== want) {
        if (want) pimg.src = want; else pimg.removeAttribute("src");
      }
      pbox.classList.toggle("vide", !want);
    });
    var pedit = null;
    pbox.addEventListener("click", function () {
      if (pedit) return;
      pedit = el("input", "owd-portrait-edit");
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
    b.appendChild(pbox);
    b.appendChild(fld("Nom", textInput(function () { return state.name; },
      function (v) { state.name = v; }, "Nom du personnage")));
    b.appendChild(fld("Espèce", textInput(function () { return state.espece; },
      function (v) { state.espece = v; })));
    b.appendChild(fld("Origine", textInput(function () { return state.origine; },
      function (v) { state.origine = v; })));
    b.appendChild(fld("Âge", textInput(function () { return state.age; },
      function (v) { state.age = v; })));
    return b;
  }
  function buildHistoire() {
    var b = block("Histoire");
    b.appendChild(areaInput(function () { return state.histoire; },
      function (v) { state.histoire = v; }, 10, "D'où il vient, ce qu'il a fait…"));
    return b;
  }
  function buildNotes() {
    var b = block("Notes");
    b.appendChild(areaInput(function () { return state.notes; },
      function (v) { state.notes = v; }, 10, "Notes de séance…"));
    return b;
  }

  // ============================================================================
  // ONGLET « OPTIONS »
  // ============================================================================

  // ---------- envoi au tchat ----------
  // Tous ces reglages vivent dans le VRAI localStorage : ce sont ceux du
  // joueur devant l'ecran, pas ceux du personnage. Deux joueurs qui controlent
  // le meme personnage n'ont aucune raison de les partager, et le meneur qui
  // ouvre la fiche d'un PNJ ne doit pas heriter du destinataire d'un autre.
  function buildEnvoi() {
    var b = block("Envoi au tchat");
    if (!COMPACT) {
      b.appendChild(el("div", "owd-note",
        "Hors de Roll20, la fiche lance les dés elle-même : ces réglages n'ont d'effet que dans la partie."));
    }
    function segments(cle, options, defaut, onChange) {
      var w = el("div", "owd-segs");
      var btns = [];
      options.forEach(function (o) {
        var s = el("button", "seg", o[1]);
        s.type = "button";
        if (o[2]) s.title = o[2];
        s.addEventListener("click", function () {
          lset(cle, o[0]);
          btns.forEach(function (x) { x.classList.remove("on"); });
          s.classList.add("on");
          if (onChange) onChange(o[0]);
        });
        // la valeur persistee est relue A LA CONSTRUCTION, pas seulement au
        // changement : sans ca, rouvrir la fiche montrerait le defaut alors
        // que le reglage, lui, aurait tenu
        if (lpref(cle, defaut) === o[0]) s.classList.add("on");
        btns.push(s);
        w.appendChild(s);
      });
      return w;
    }

    var destSel = el("select", "owd-select");
    destSel.title = "Destinataire du chuchotement";
    var listeRoll20 = null;
    var editNoms = null;
    function nomsManuels() {
      return lpref(ENVOI.noms, "").split("\n")
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s; });
    }
    function remplirDest(noms) {
      var actuel = envDest();
      destSel.innerHTML = "";
      if (!noms.length) {
        var vide = el("option", null,
          listeRoll20 ? "Aucun autre joueur connecté" : "Aucun joueur enregistré");
        vide.value = "";
        destSel.appendChild(vide);
      }
      noms.forEach(function (n) {
        var o = el("option", null, n);
        o.value = n;
        if (n === actuel) o.selected = true;
        destSel.appendChild(o);
      });
      if (actuel && noms.indexOf(actuel) < 0) {
        var o2 = el("option", null, actuel + " (absent)");
        o2.value = actuel; o2.selected = true;
        destSel.appendChild(o2);
      }
      // Ce qui est AFFICHE est ce qui sera utilise. Sans cette ligne, un
      // selecteur qui ne porte qu'un nom n'emet jamais « change » (le
      // navigateur le choisit tout seul) : le destinataire restait vide et la
      // commande repartait en public alors que son nom s'affichait.
      lset(ENVOI.dest, destSel.value);
    }
    destSel.addEventListener("change", function () { lset(ENVOI.dest, destSel.value); });
    // Roll20 ne livre sa liste que par l'extension (la fiche est une iframe
    // d'une autre origine) et le pont n'accuse pas reception : une extension
    // trop ancienne ne repond rien, d'ou le repli sur la liste saisie a la main.
    function demanderJoueurs() {
      if (typeof window.__owdPlayers !== "function") { remplirDest(nomsManuels()); return; }
      window.__owdPlayers(function (noms) {
        if (noms && noms.length) { listeRoll20 = noms; remplirDest(noms); }
        else remplirDest(nomsManuels());
        majDest();
      });
    }
    function majDest() {
      var joueur = envMode() === "joueur";
      destSel.style.display = joueur ? "" : "none";
      if (editNoms) editNoms.style.display = joueur && !listeRoll20 ? "" : "none";
    }
    b.appendChild(fld("À qui", segments(ENVOI.mode, [
      ["public", "Publique", "Tout le monde voit la carte"],
      ["gm", "Au MJ", "Chuchoté au MJ (/w gm)"],
      ["joueur", "À un joueur", "Chuchoté au joueur choisi"]
    ], "public", function (v) {
      majDest();
      if (v === "joueur") demanderJoueurs();
    })));
    b.appendChild(destSel);
    editNoms = miniBtn("Joueurs…", "Saisir les noms des joueurs de la table", function () {
      var corps = el("div", "owd-modal-body");
      corps.appendChild(el("div", "owd-modal-note",
        "Un nom par ligne, tel qu'il s'affiche dans Roll20. Cette liste reste dans ce navigateur."));
      var ta = el("textarea", "owd-area");
      ta.rows = 6;
      ta.value = lpref(ENVOI.noms, "");
      corps.appendChild(ta);
      dialogue("Joueurs de la table", corps, function () {
        lset(ENVOI.noms, ta.value);
        remplirDest(nomsManuels());
      }, "Enregistrer");
    });
    b.appendChild(editNoms);

    b.appendChild(fld("Seuil", segments(ENVOI.seuil, [
      ["1", "Demandé au lancer", "Roll20 demande le seuil avant de lancer"],
      ["0", "Pas de seuil", "Le jet part seul, sans seuil annoncé"]
    ], "1")));
    // La situation ajuste le SEUIL, pas le resultat : la requete se pose donc
    // dans le champ Seuil des jets qui en ont un de base. L'ajouter au
    // resultat avec le signe inverse serait egal en arithmetique et illisible
    // a la table, ou l'on annonce un seuil.
    b.appendChild(fld("Modificateur de situation", segments(ENVOI.situation, [
      ["1", "Demandé", "Roll20 demande un modificateur, qui s'ajoute au seuil"],
      ["0", "Aucun", "Le seuil de base part tel quel"]
    ], "1")));
    b.appendChild(fld("Modificateur de résultat", segments(ENVOI.input, [
      ["0", "Aucun", "Le jet part tel quel"],
      ["1", "Demandé", "Pour les effets qui s'ajoutent vraiment au résultat"]
    ], "0")));

    remplirDest(nomsManuels());
    majDest();
    demanderJoueurs();
    return b;
  }

  // ---------- affichage ----------
  // window.__owdNight n'existe que sous roll20-fiche.html : sur le site, le
  // bouton d'en-tete gere deja la nuit. Preference locale a CE navigateur,
  // jamais dans l'etat — c'est un reglage d'affichage, pas de personnage.
  function buildAffichage() {
    if (!window.__owdNight) return null;
    var b = block("Affichage");
    var mode = el("select", "owd-select");
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

  // ---------- leviers ----------
  // Un modificateur s'ajoute, un forcage remplace. Le forcage est NULLABLE et
  // vide veut dire « calculé » : un zero force est une valeur legitime, et le
  // confondre avec l'absence de forcage clouerait la valeur a zero.
  function levierForce(map, cle, auto) {
    var w = el("span", "owd-force");
    var i = nullInput(
      function () { return has(map, cle) ? map[cle] : null; },
      function (v) { if (v === null) delete map[cle]; else map[cle] = v; }, "calculé");
    w.appendChild(i);
    var a = el("span", "auto", "");
    w.appendChild(a);
    hooks.push(function () { a.textContent = has(map, cle) ? "" : "= " + auto(); });
    return w;
  }
  function buildLeviersCaracs() {
    var b = block("Leviers : caractéristiques");
    CARACS.forEach(function (c) {
      var r = ligne("owd-levier-row");
      r.appendChild(el("span", "k", CARAC_LIB[c]));
      r.appendChild(fld("Mod.", numInput(
        function () { return state.caracsMod[c]; },
        function (v) { state.caracsMod[c] = borne(v, -9999, 9999); }), "owd-f-mini"));
      r.appendChild(fld("Forcé", levierForce(state.caracsForce, c, function () {
        return borne((state.caracsBase[c] || 0) + (state.caracsXp[c] || 0) + (state.caracsMod[c] || 0), 0, 9999);
      }), "owd-f-mini"));
      b.appendChild(r);
    });
    return b;
  }
  function buildLeviersCaps() {
    var b = block("Leviers : capacités");
    CAPS.forEach(function (c) {
      var r = ligne("owd-levier-row");
      r.appendChild(el("span", "k", CAP_LIB[c]));
      r.appendChild(fld("Mod.", numInput(
        function () { return state.capMod[c]; },
        function (v) { state.capMod[c] = borne(v, -999999, 999999); }), "owd-f-mini"));
      r.appendChild(fld("Forcé", levierForce(state.capForce, c, function () {
        return borne(capBase(c) + (state.capMod[c] || 0), 0, 999999);
      }), "owd-f-mini"));
      b.appendChild(r);
    });
    // les des du tour vivent ici : c'est le genre de nombre qu'un objet ou une
    // decision de table deplace, et le regler en plein combat obligerait a
    // ouvrir cet onglet — d'ou aussi les pastilles du bloc Dés d'action
    var rd = ligne("owd-levier-row");
    rd.appendChild(el("span", "k", "Dés du tour"));
    rd.appendChild(fld("Nombre", numInput(
      function () { return state.desTour; },
      function (v) {
        state.desTour = borne(v, 0, 20);
        state.desEngages = borne(state.desEngages, 0, state.desTour);
      }, { min: 0, max: 20 }), "owd-f-mini"));
    b.appendChild(rd);
    return b;
  }
  function buildLeviersComps() {
    var b = block("Leviers : compétences");
    var liste = el("div", "owd-leviers-comps");
    b.appendChild(liste);
    hooks.push(function () {
      // La liste des competences bouge (ajout, import) : ce bloc se refait a
      // chaque rafraichissement, il est court et personne n'y tape en continu
      // sauf dans le champ qui a le focus — que l'on preserve.
      // Ses lignes ecrivent dans regLeviers, JAMAIS dans le registre principal :
      // rebati depuis un hook de ce registre-la, elles s'y empileraient a
      // chaque frappe, et la fiche ralentirait sans que rien ne le dise.
      if (liste.contains(document.activeElement)) return;
      liste.innerHTML = "";
      regLeviers.length = 0;
      avecReg(regLeviers, function () {
        var noms = compsToutes();
        if (!noms.length) {
          liste.appendChild(el("div", "owd-vide", "Aucune compétence."));
          return;
        }
        noms.forEach(function (n) {
          var d = el("details", "owd-levier-comp");
          var s = el("summary");
          s.appendChild(el("span", "k", n));
          var m = el("span", "m", "");
          s.appendChild(m);
          d.appendChild(s);
          var r = ligne("owd-levier-row");
          r.appendChild(fld("Bonus", numInput(
            function () { return state.compsMod[n] || 0; },
            function (v) {
              if (v) state.compsMod[n] = borne(v, -99, 99); else delete state.compsMod[n];
            }), "owd-f-mini"));
          r.appendChild(fld("Dés", numInput(
            function () { return state.compsDesMod[n] || 0; },
            function (v) {
              if (v) state.compsDesMod[n] = borne(v, -9, 9); else delete state.compsDesMod[n];
            }), "owd-f-mini"));
          r.appendChild(fld("Bonus forcé", levierForce(state.compsForce, n, function () {
            return borne(RANG_BONUS[compRang(n)] + (state.compsMod[n] || 0), -99, 99);
          }), "owd-f-mini"));
          d.appendChild(r);
          var actif = (state.compsMod[n] || 0) || (state.compsDesMod[n] || 0) || has(state.compsForce, n);
          if (actif) { d.open = true; m.textContent = "levier posé"; }
          liste.appendChild(d);
        });
      });
    });
    return b;
  }

  // ---------- la fiche elle-meme ----------
  function buildActions() {
    var b = block("Fiche");
    var act = ligne("owd-actions");
    act.appendChild(miniBtn("Exporter (JSON)", null, function () {
      var a = document.createElement("a");
      a.href = "data:application/json;charset=utf-8," +
               encodeURIComponent(JSON.stringify(state, null, 2));
      a.download = (state.name || "personnage-outward") + ".json";
      a.click();
    }));
    var file = el("input");
    file.type = "file"; file.accept = "application/json"; file.style.display = "none";
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var s = normalize(JSON.parse(r.result));
          if (!s) throw new Error("fiche vide");
          state = s;
          remount();
          flash("Personnage importé.");
        } catch (e) { flash("JSON illisible (" + messageErreur(e) + ")."); }
        file.value = "";
      };
      r.readAsText(f);
    });
    act.appendChild(miniBtn("Importer (JSON)", null, function () { file.click(); }));
    act.appendChild(file);
    // confirm() est MUET dans l'iframe Roll20 : la confirmation passe par la
    // modale de la fiche, sans quoi la remise a neuf serait annulee en silence
    act.appendChild(miniBtn("Vider la fiche", null, function () {
      confirmer("Vider la fiche", "Tout le personnage sera effacé.", "Vider", function () {
        state = blank();
        remount();
        flash("Fiche vidée.");
      });
    }, "danger"));
    b.appendChild(act);

    var v = el("div", "owd-versions");
    b.appendChild(v);
    hooks.push(function () {
      var m = window.__owdManifeste || {};
      v.innerHTML = "";
      [["Fiche servie", (m.release || RELEASE) + " · schéma " + (m.schema || SCHEMA)],
       ["Code", RELEASE + " · schéma " + SCHEMA],
       ["Fiche ouverte", (state.rel || "?") + " · schéma " + (state.v || "?")]]
        .forEach(function (l) {
          var r = ligne("owd-part");
          r.appendChild(el("span", "k", l[0]));
          r.appendChild(el("span", "v", l[1]));
          v.appendChild(r);
        });
    });
    return b;
  }

  // ============================================================================
  // ONGLETS ET MONTAGE
  // ============================================================================
  // Cinq onglets, trois colonnes (gauche / milieu / droite), plus deux
  // colonnes speciales : « seule » (pleine largeur) et « bas » (pleine
  // largeur, en pied d'onglet). La largeur de reference est le demi-ecran,
  // ~940 px : c'est la que tout se juge, et les trois colonnes s'y tiennent.
  var TABS = [
    { id: "fiche", label: "Fiche" },
    { id: "combat", label: "Combat" },
    { id: "equipement", label: "Équipement" },
    { id: "bio", label: "Bio" },
    { id: "options", label: "Options" }
  ];
  function buildTabs(sheet) {
    var bar = el("div", "owd-tabs");
    var panes = {}, btns = {};
    TABS.forEach(function (t) {
      var b = el("div", "owd-tab", t.label);
      b.addEventListener("click", function () { activate(t.id); });
      bar.appendChild(b);
      btns[t.id] = b;
      var p = el("div", "owd-pane");
      p.dataset.tab = t.id;
      panes[t.id] = p;
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
  // Un onglet recoit ses trois colonnes, et deux bandes pleine largeur : la
  // premiere avant les colonnes (« seule »), la seconde apres (« bas »).
  function colonnes(pane) {
    var seule = el("div", "owd-seule");
    var cols = el("div", "owd-cols");
    var g = el("div", "owd-col"), m = el("div", "owd-col"), d = el("div", "owd-col");
    cols.appendChild(g); cols.appendChild(m); cols.appendChild(d);
    var bas = el("div", "owd-bas");
    pane.appendChild(seule);
    pane.appendChild(cols);
    pane.appendChild(bas);
    return { seule: seule, gauche: g, milieu: m, droite: d, bas: bas };
  }
  function pose(cible, bloc) { if (bloc) cible.appendChild(bloc); }

  function montage(root) {
    rootEl = root;
    // tous les registres repartent a vide : les anciens pointent sur un DOM
    // qui n'existe plus
    regPrinc = []; hooks = regPrinc;
    regComps = []; regArmes = []; regTechs = []; regObjets = []; regLeviers = [];
    compsListe = armesListe = techsListe = objListe = null;
    compPosees = lpref(FILTRE.posees, COMPACT ? "1" : "0") === "1";

    root.innerHTML = "";
    var app = el("div", "owd-fiche" + (COMPACT ? " owd-compact" : ""));
    appEl = app;
    var sheet = el("div", "owd-sheet");
    app.appendChild(sheet);
    root.appendChild(app);

    // La liste des competences connues, offerte a la saisie de la competence
    // d'une arme. Un datalist ne CONTRAINT pas : une competence qui n'existe
    // pas encore doit pouvoir s'ecrire.
    var dl = el("datalist");
    dl.id = "owd-comps-datalist";
    app.appendChild(dl);
    hooks.push(function () {
      var noms = compsToutes().join("\n");
      if (dl.__noms === noms) return;
      dl.__noms = noms;
      dl.innerHTML = "";
      compsToutes().forEach(function (n) {
        var o = el("option");
        o.value = n;
        dl.appendChild(o);
      });
    });

    var panes = buildTabs(sheet);

    var f = colonnes(panes.fiche);
    pose(f.gauche, buildCaracs());
    pose(f.gauche, buildProgression());
    pose(f.milieu, buildDes());
    pose(f.milieu, buildReserves());
    pose(f.milieu, buildEffondrement());
    pose(f.milieu, buildClimat());
    pose(f.droite, buildComps());

    var c = colonnes(panes.combat);
    pose(c.seule, buildArmes());
    pose(c.seule, buildTechniques());

    var e = colonnes(panes.equipement);
    pose(e.gauche, buildCharge());
    pose(e.gauche, buildContenance());
    pose(e.droite, buildRapides());
    pose(e.droite, buildProtections());
    pose(e.bas, buildObjets());

    var bi = colonnes(panes.bio);
    pose(bi.gauche, buildIdentite());
    pose(bi.droite, buildHistoire());
    pose(bi.droite, buildNotes());

    var o = colonnes(panes.options);
    pose(o.gauche, buildEnvoi());
    pose(o.gauche, buildAffichage());
    pose(o.gauche, buildLeviersComps());
    pose(o.droite, buildLeviersCaracs());
    pose(o.droite, buildLeviersCaps());
    pose(o.droite, buildActions());

    refresh();
  }
  // Un montage ne se relance jamais depuis lui-meme : la demande est notee et
  // honoree une seule fois, le montage courant fini.
  var montageEnCours = false, remontageDu = false;
  function mount(root) {
    if (montageEnCours) { remontageDu = true; return; }
    montageEnCours = true;
    var abouti = false;
    try { montage(root); abouti = true; }
    finally {
      montageEnCours = false;
      if (!abouti) remontageDu = false;
    }
    if (remontageDu) { remontageDu = false; mount(root); }
  }

  // Charger les donnees et MONTER sont deux pannes differentes, et elles ne se
  // disent pas de la meme facon : chacune son filet. Le montage a longtemps
  // vecu dans le .then() du fetch, et tout ce qui tombait pendant lui se
  // faisait rattraper par le .catch d'a cote, qui accusait le fichier de
  // donnees d'une faute qui n'etait pas la sienne.
  function demarre(root) {
    state = load() || blank();
    try { mount(root); }
    catch (err) {
      if (window.console && window.console.error) window.console.error("[fiche] montage", err);
      root.innerHTML = '<p style="padding:2rem;color:#b0402c">La fiche n\'a pas pu se monter (' +
        messageErreur(err) + ").</p>";
    }
  }
  function init() {
    // « perso-fiche », et pas un autre mot : c'est l'id que roll20-fiche.html
    // ecrit, et cet amorceur est GELE — servi sans ?v= par la coquille signee
    // et garde dix minutes par GitHub Pages. Le changer ici sans l'y changer
    // (ce qui est impossible en pratique) donne une fiche qui ne se monte
    // jamais dans Roll20, sans erreur a lire : le bundle se charge, ne trouve
    // pas sa racine, et sort en silence. La page du site le dit aussi.
    var root = document.getElementById("perso-fiche");
    if (!root || root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    // Point d'entree des objets donnes au tchat, pose DES init() et avant le
    // chargement des donnees : c'est le rendez-vous de la file d'attente de
    // l'amorce, qui rejoue tout ce qui a ete clique pendant le chargement. Si
    // l'etat n'est pas encore la, on dit au joueur de recliquer plutot que de
    // perdre l'objet.
    window.__owdOnTake = function (payload) {
      if (!state) { flash("La fiche n'est pas encore prête : recliquer « Prendre »."); return; }
      recevoirObjet(payload);
    };
    if (DATA) { demarre(root); return; }
    // Le jeu de donnees porte la liste des competences des regles. Il N'EXISTE
    // PAS ENCORE : les regles n'en donnent aucune, et tout passe pour l'instant
    // par les competences personnalisees. Son absence ne doit donc PAS empecher
    // la fiche de s'ouvrir — c'est la situation prevue, pas une panne, et une
    // fiche qui refuserait de se monter la-dessus serait inutilisable.
    fetch(dataUrl(), { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (d) {
        DATA = (d && typeof d === "object") ? d : { competences: [] };
        demarre(root);
      });
  }

  // ============================================================================
  // CE QUE LA FICHE EXPOSE
  // ============================================================================
  // Le contrat avec l'amorce ne demande que __owdOnTake. Le reste est offert
  // aux sondes et aux pages du site : lire des valeurs dans le DOM mesurerait
  // la MISE EN FORME autant que le calcul, et « 30 » ressemble trop a « 30 m »
  // pour juger d'un calcul.
  window.Owd = {
    version: RELEASE,
    schema: SCHEMA,
    blank: blank,
    normalize: normalize,
    etat: function () { return state; },
    remonte: remount,
    // les calculs, en lecture : ce sont ceux que la fiche affiche, pas des
    // copies qui pourraient diverger
    calculs: {
      caracTotal: caracTotal, capBase: capBase, capMax: capMax,
      pvMax: pvMax, peMax: peMax, pvCourant: pvCourant, peCourant: peCourant,
      effondrement: effondrement, nivExpo: nivExpo,
      ressentie: ressentie, borneBasse: borneBasse, borneHaute: borneHaute,
      paliers: paliers, climatSens: climatSens, expoParDix: expoParDix,
      poidsPorte: poidsPorte, charge: charge,
      rapidesOccupes: rapidesOccupes, rapides: rapides,
      compRang: compRang, compDes: compDes, compBonus: compBonus,
      xpDepense: xpDepense, xpReste: xpReste,
      ruptureDep: ruptureDep, ruptureReste: ruptureReste,
      desRestants: desRestants, carte: computeCard
    }
  };

  if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
