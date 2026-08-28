/* Moteur de mods de la fiche MIA : empreinte, consentement, exécution.
 *
 * Un mod est du code que le joueur ajoute à sa fiche. Il voyage AVEC le
 * personnage (state.mods, donc l'export JSON et les Attributes Roll20) :
 * ouvrir la fiche d'un autre joueur, c'est recevoir son code. D'où ce
 * fichier, qui ne sert qu'à ça : décider ce qui a le droit de tourner, et
 * faire tourner ce qui a ce droit sans que la fiche tombe avec lui.
 *
 * CE QUE CE MOTEUR PROTÈGE
 *   - Le consentement. Un mod ne tourne pas tant que son empreinte (son id et
 *     sa source) n'a pas reçu un « oui » sur CE navigateur. L'avis vit dans le
 *     localStorage du navigateur, jamais dans le personnage ni dans les
 *     Attributes : l'auteur d'un mod ne consent donc que pour lui-même, et
 *     son « oui » ne suit pas le personnage jusque chez les autres.
 *   - La révision. La moindre lettre changée dans la source change
 *     l'empreinte : le mod redemande, il ne se met pas à jour en douce.
 *   - La fiche elle-même. Une source qui ne compile pas, un mod qui jette, un
 *     mod qui jette autre chose qu'une Error : tout finit en état « panne »
 *     avec son message, les mods suivants tournent quand même, et rien ne
 *     remonte hors de execute().
 *
 * CE QU'IL NE PROTÈGE PAS, ET IL FAUT LE DIRE
 *   Il n'y a AUCUN bac à sable ici. new Function() n'isole rien, il compile :
 *   un mod autorisé tourne dans la page de la fiche avec exactement ses
 *   droits, il voit le DOM, le localStorage, le réseau, et tout ce que la
 *   page peut atteindre. Une boucle infinie dans un mod fige l'onglet et ce
 *   moteur n'a aucun moyen de l'interrompre.
 *   Ce qui BORNE un mod est ailleurs : c'est le pont d20 de l'extension
 *   (seuls les attributs préfixés mia_ sont écrits, seulement sur le
 *   personnage ouvert, et le tchat n'accepte que des commandes composées par
 *   la fiche). Autoriser un mod, c'est faire confiance à son auteur. Ni la
 *   page Mods ni le bloc Options ne doivent laisser croire autre chose.
 *
 * Ce fichier ne touche ni au DOM ni à state : il reçoit ce qu'il lui faut et
 * rend des bilans. Toute l'interface est dans mia-fiche.js. Il est facultatif
 * de naissance : si window.MiaMods manque, la fiche s'ouvre sans mods,
 * exactement comme elle s'ouvre sans window.MiaMigr.
 */
(function (global) {
  "use strict";

  // Le VRAI localStorage du navigateur, et lui seul (voir magasin()).
  var CLE_AVIS = "mia.mods.avis";
  var MSG_MAX = 240;   // au-delà, un message d'erreur n'informe plus, il noie

  var estTableau = (typeof Array.isArray === "function") ? Array.isArray :
    function (v) { return Object.prototype.toString.call(v) === "[object Array]"; };

  function aClef(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  // ------------------------------------------------------------------
  // Petits outils
  // ------------------------------------------------------------------

  // Toute valeur devient une chaîne SANS jamais jeter : ce que ce moteur reçoit
  // vient d'un JSON importé ou des Attributes Roll20, c'est-à-dire de n'importe
  // où, et String() lui-même peut lever (objet sans prototype, toString piégé).
  function chaine(v) {
    if (typeof v === "string") return v;
    if (v === null || v === undefined) return "";
    try { return String(v); } catch (e) { return ""; }
  }

  function borne(txt) {
    txt = chaine(txt);
    return txt.length > MSG_MAX ? txt.slice(0, MSG_MAX) + "…" : txt;
  }

  // Le message de ce qu'un mod a levé. Ce n'est pas forcément une Error : un
  // mod a le droit d'écrire « throw "raté" », ou de jeter un objet dont le
  // .message est un accesseur qui jette à son tour. D'où les deux essais.
  function messageDe(e) {
    if (e === null || e === undefined) return "erreur sans message";
    try {
      if (typeof e === "string") return borne(e);
      if (e.message) return borne(e.message);
    } catch (err) {}
    try { return borne(String(e)); } catch (err2) {}
    return "erreur illisible";
  }

  // ------------------------------------------------------------------
  // Empreinte
  //
  // djb2 sur « id + \n + src », rendu en hexadécimal non signé. Deux mods
  // identiques ont la même empreinte, un mod retouché en change.
  //
  // Deux précautions, parce que c'est cette empreinte qui décide de ce qui a
  // le droit de tourner :
  //   - DEUX mots de 32 bits plutôt qu'un, et surtout deux mots qui ne se
  //     ressemblent pas : djb2 (multiplicateur 33, mélange par XOR) et FNV-1a
  //     (multiplicateur 16777619). Un second djb2 semé autrement a été essayé
  //     et MESURÉ : sur 171399 sources voisines il rendait 7539 collisions,
  //     parce que les deux mots pèsent alors les caractères avec la même
  //     puissance de 33 et se trompent ensemble. Le couple actuel en rend 0
  //     sur le même jeu.
  //   - les deux LONGUEURS entrent dans les deux mots, celle du texte entier et
  //     celle de l'id. La première parce qu'une source tronquée ou deux lignes
  //     permutées se ressemblent beaucoup trop pour djb2, dont les bits de
  //     poids fort bougent peu sur des textes courts et voisins. La seconde
  //     parce que le « \n » ne sépare rien à lui seul : sans elle,
  //     ("a\nb", "c") et ("a", "b\nc") donnent le même texte, donc la même
  //     empreinte, donc le même accord. normalise() interdit ce cas de figure
  //     (un id est en [a-z0-9-]), mais empreinte() est publique et se fait
  //     appeler avec ce qui traîne.
  // ------------------------------------------------------------------

  // Multiplication 32 bits. Math.imul est ES6, le vieux moteur d'une iframe
  // Roll20 ne l'a pas forcément, et un simple a * b perdrait les bits de poids
  // faible dès que le produit dépasse 2^53.
  function mul32(a, b) {
    var ah = (a >>> 16) & 0xffff, al = a & 0xffff;
    return (((ah * b) << 16) + (al * b)) >>> 0;
  }

  // Finisseur d'avalanche (celui de murmur3) : djb2 seul laisse ses bits de
  // poids fort paresseux. Après ce passage, un bit d'entrée qui change fait
  // changer la moitié des bits de sortie.
  function avalanche(h) {
    h = (h ^ (h >>> 16)) >>> 0;
    h = mul32(h, 0x85ebca6b);
    h = (h ^ (h >>> 13)) >>> 0;
    h = mul32(h, 0xc2b2ae35);
    h = (h ^ (h >>> 16)) >>> 0;
    return h;
  }

  function hexa8(n) {
    var s = (n >>> 0).toString(16);
    while (s.length < 8) s = "0" + s;
    return s;
  }

  function empreinte(id, src) {
    var cle = chaine(id);
    var txt = cle + "\n" + chaine(src);
    var n = txt.length;
    var h1 = 5381;                        // djb2 canonique, mélange par XOR
    var h2 = (2166136261 ^ n) >>> 0;      // FNV-1a, semé par la longueur
    var lg, i, c;
    for (i = 0; i < n; i++) {
      c = txt.charCodeAt(i);
      h1 = ((((h1 << 5) + h1) >>> 0) ^ c) >>> 0;   // h1 * 33 ^ c
      h2 = mul32((h2 ^ c) >>> 0, 16777619);        // FNV-1a : XOR puis produit
    }
    // Les deux longueurs, étalées avant d'entrer : le nombre d'or sur 32 bits
    // fait bouger tous les bits, là où un simple XOR de longueur ne toucherait
    // que les derniers.
    lg = (n ^ mul32(cle.length + 1, 0x9e3779b1)) >>> 0;
    return hexa8(avalanche((h1 ^ lg) >>> 0)) + hexa8(avalanche((h2 + lg) >>> 0));
  }

  // ------------------------------------------------------------------
  // Avis : « oui », « non », ou rien
  //
  // Les avis vivent dans le VRAI localStorage du navigateur. Surtout PAS dans
  // window.__miaLocalStorage : ce shim écrit dans les Attributes du
  // personnage, et le « oui » de l'auteur voyagerait alors avec lui, donnant
  // son accord à la place de tous ceux qui ouvrent la fiche.
  //
  // Repli mémoire : dans une iframe tierce (Roll20) ou en navigation privée
  // stricte, certains navigateurs jettent à la simple LECTURE de
  // window.localStorage, et d'autres acceptent la lecture mais refusent
  // l'écriture. Les décisions tiennent alors dans MEM pour la session ; rien
  // ne remonte, la fiche ne s'en aperçoit pas.
  //
  // MEM ne retient QUE ce que le navigateur n'a pas voulu ranger : dès qu'une
  // décision est écrite, elle en sort et le stockage fait foi. Sans ça, la
  // mémoire d'un onglet primerait le stockage pour toute la vie de la page, et
  // cet onglet lirait encore son propre « oui » sur un mod que le joueur vient
  // de refuser dans l'onglet d'à côté (le site et l'iframe Roll20 ouverts
  // ensemble, c'est le cas courant, pas le cas tordu).
  // ------------------------------------------------------------------

  var MEM = {};   // empreinte -> "oui" | "non" | "" ("" = oubli explicite)

  function magasin() {
    try {
      var ls = (typeof window !== "undefined") ? window.localStorage : null;
      return (ls && typeof ls.getItem === "function") ? ls : null;
    } catch (e) { return null; }
  }

  function avisPropre(v) { return (v === "oui" || v === "non") ? v : ""; }

  // Ce que le navigateur a retenu, et rien d'autre : c'est la table PARTAGÉE
  // par tous les onglets de la même origine, donc la seule qui fasse foi.
  // Relue à chaque fois, jamais mise en cache : un autre onglet a pu trancher
  // entre deux appels.
  function tableStockee() {
    var out = {}, brut = null, ls = magasin(), k;
    if (ls) {
      try { brut = ls.getItem(CLE_AVIS); } catch (e) { brut = null; }
    }
    if (brut) {
      try { brut = JSON.parse(brut); } catch (e2) { brut = null; }
    }
    if (brut && typeof brut === "object" && !estTableau(brut)) {
      for (k in brut) {
        if (aClef(brut, k) && avisPropre(brut[k])) out[k] = brut[k];
      }
    }
    return out;
  }

  // La table de lecture : celle du navigateur, complétée par les décisions
  // qu'il a refusé de ranger. MEM ne recouvre donc que des empreintes dont le
  // stockage ne sait rien ; il comble un trou, il ne dicte plus.
  function table() {
    var out = tableStockee(), k;
    for (k in MEM) {
      if (aClef(MEM, k)) {
        if (MEM[k]) out[k] = MEM[k];
        else delete out[k];   // oubli non rangé : il masque ce qui reste stocké
      }
    }
    return out;
  }

  function avis(emp) {
    emp = chaine(emp);
    if (!emp) return "";
    return avisPropre(table()[emp]);
  }

  function decide(emp, verdict) {
    var t, ls, range = false;
    emp = chaine(emp);
    if (!emp) return;
    // Tout ce qui n'est ni « oui » ni « non » vaut oubli : le mod redemandera.
    verdict = avisPropre(verdict);
    // La table du navigateur est relue MAINTENANT, et SEULE la clé tranchée y
    // est posée. Y reverser tout MEM ferait ressusciter, à chaque décision,
    // tous les avis pris dans cet onglet depuis son ouverture : le joueur qui
    // autorise un mod dans un onglet, en refuse un autre dans le second, puis
    // revient trancher n'importe quoi dans le premier verrait son refus effacé
    // et le mod repartir au montage suivant.
    t = tableStockee();
    if (verdict) t[emp] = verdict; else delete t[emp];
    ls = magasin();
    if (ls) {
      try { ls.setItem(CLE_AVIS, JSON.stringify(t)); range = true; } catch (e) {}
    }
    // Rangée : le stockage porte la décision, et lui seul doit la porter.
    // Refusée (pas de stockage, écriture qui jette) : MEM la garde pour la
    // session, c'est tout ce qui reste au joueur.
    if (range) delete MEM[emp]; else MEM[emp] = verdict;
  }

  // ------------------------------------------------------------------
  // Versions
  //
  // UNE seule lecture de numéro pour tout le dispositif, et elle est exportée
  // (MiaMods.lireVersion, MiaMods.compareVersions). La fiche, les mods et les
  // sondes s'en servent au lieu de recopier chacun leur expression régulière.
  // mia-fiche.js tenait la sienne, et elle est restée en arrière : le jour du
  // suffixe de beta, son formulaire s'est mis à refuser le numéro qu'il
  // proposait lui-même en filigrane.
  //
  // L'amorceur (mia-roll20-boot.js) ne PEUT pas s'en servir : il tranche quelle
  // version ouvrir avant d'avoir chargé le moindre bundle, donc avant ce
  // fichier. Sa lecture à lui est une copie de nécessité, pas un oubli ; les
  // deux doivent avancer ensemble.
  // ------------------------------------------------------------------

  // « 3.12.9b » rend { x: 3, y: 12, z: 9, beta: true }, et null sur ce qui
  // n'est pas un numéro.
  //
  // Le suffixe « b » de la branche beta est COLLÉ au dernier nombre,
  // sans séparateur : ce n'est pas une pré-version au sens semver, et le motif
  // d'avant, qui n'acceptait un suffixe que derrière un « - » ou un « + »,
  // rendait null sur « 3.6.0b ». Silencieusement, ce qui est le pire :
  // compareVersions rend 0 sur un illisible, donc le verrou « pour la fiche »
  // de TOUS les mods s'éteignait sans un message le jour où la beta a pris son
  // suffixe. Un suffixe semver (« 3.1.0-beta ») reste toléré et reste lu comme
  // sa version de base ; « beta » ne dit QUE le b du contrat, parce que c'est
  // lui seul qui désigne le site beta.
  function lireVersion(v) {
    var m = /^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(b)?\s*(?:[-+][^\s]*)?\s*$/.exec(chaine(v));
    if (!m) return null;
    return {
      x: parseInt(m[1], 10),
      y: parseInt(m[2] || "0", 10),
      z: parseInt(m[3] || "0", 10),
      beta: !!m[4]
    };
  }

  // Comparer des CHAÎNES rendrait "3.10.0" inférieur à "3.9.0", et un mod
  // parfaitement compatible se déclarerait « trop récent » à l'infini. D'où ce
  // comparateur à trois nombres.
  //
  // Le suffixe de beta ne pèse RIEN dans le rang : « 3.12.9b » et « 3.12.9 »
  // rendent 0, parce que la beta EST ce que le site stable recevra à la
  // fusion. Le réflexe semver, qui range une pré-version SOUS la version
  // finale, ferait ici passer un personnage écrit sur la beta pour plus vieux
  // que le site stable du même numéro, et un mod « pour: 3.12.9 » refuserait
  // de tourner sur la beta qui le publie.
  function compareVersions(a, b) {
    var x = lireVersion(a), y = lireVersion(b);
    if (!x || !y) return 0;   // illisible : rien ne bloque, faute de repère
    if (x.x !== y.x) return x.x > y.x ? 1 : -1;
    if (x.y !== y.y) return x.y > y.y ? 1 : -1;
    if (x.z !== y.z) return x.z > y.z ? 1 : -1;
    return 0;
  }

  // ------------------------------------------------------------------
  // normalise()
  // ------------------------------------------------------------------

  // Un id sert de clé d'affichage ET entre dans l'empreinte : il est donc
  // ramené à sa forme canonique plutôt que refusé, sinon un « Mon Mod » saisi
  // à la main changerait d'empreinte au premier nettoyage venu.
  function idPropre(v) {
    var s = chaine(v).toLowerCase();
    s = s.replace(/[^a-z0-9-]+/g, "-");
    s = s.replace(/-+/g, "-");
    s = s.replace(/^-+|-+$/g, "");
    return s;
  }

  // « actif » arrive en booléen depuis l'état du site, mais un aller-retour
  // par les Attributes Roll20 ne connaît que du texte : "0" et "false" doivent
  // rester faux, et l'absence vaut vrai (défaut du contrat).
  function booleen(v, def) {
    var s;
    if (v === undefined || v === null) return def;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return isFinite(v) && v !== 0;
    s = chaine(v).trim().toLowerCase();
    if (s === "") return def;
    return !(s === "0" || s === "false" || s === "non" || s === "off");
  }

  function entierPositif(v) {
    var n = (typeof v === "number") ? v : parseInt(chaine(v), 10);
    if (typeof n !== "number" || !isFinite(n) || Math.floor(n) !== n || n < 0) return null;
    return n;
  }

  // Rend un TABLEAU NEUF d'entrées neuves : l'appelant peut le trier, le
  // couper, y écrire, sans jamais toucher à state.mods.
  function normalise(mods) {
    var out = [], vus = {}, i, m, id, e, n;
    if (!estTableau(mods)) return out;
    for (i = 0; i < mods.length; i++) {
      e = null;
      try {
        m = mods[i];
        if (!m || typeof m !== "object" || estTableau(m)) continue;
        id = idPropre(m.id);
        if (!id) continue;              // sans id : pas d'empreinte, donc pas d'avis possible
        if (aClef(vus, id)) continue;   // doublon : le premier garde la place
        vus[id] = true;
        // Entrée reconstruite champ par champ, jamais l'objet reçu : une clé
        // inconnue n'a rien à faire dans state.mods, et l'entrée d'origine ne
        // doit pas se retrouver partagée avec le bilan.
        e = {
          id: id,
          nom: chaine(m.nom).trim() || id,
          actif: booleen(m.actif, true),
          src: chaine(m.src),
          notes: chaine(m.notes)
        };
        // « pour » est GARDÉ TEL QUEL dès qu'il y a quelque chose, lisible ou
        // non. Un « 3.x » écrit à la main n'est pas une version au sens de
        // lireVersion, mais c'est la SAISIE DU JOUEUR : la jeter reviendrait à
        // effacer de son personnage un champ qu'il a rempli, sans un mot, au
        // premier chargement venu. Il ne bloque rien pour autant :
        // compareVersions rend 0 sur ce qu'il ne sait pas lire, donc verrou()
        // laisse le mod tourner comme s'il n'avait rien demandé. Revers de
        // cette conservation : un « pour: 3.7.0b » saisi du temps où le
        // suffixe était illisible dormait dans le personnage sans rien
        // demander, et se remet à compter maintenant que lireVersion le lit.
        if (chaine(m.pour).trim()) e.pour = chaine(m.pour).trim();
        n = entierPositif(m.apiMin);
        if (n !== null) e.apiMin = n;
      } catch (err) {
        // Une entrée dont la simple LECTURE jette (un accesseur piégé posé sur
        // state.mods par un mod déjà autorisé, par exemple) est écartée comme
        // une entrée mal formée. Elle ne doit emporter ni la normalisation des
        // autres, ni execute(), qui n'aurait alors plus rien à afficher.
        e = null;
      }
      if (e) out.push(e);
    }
    return out;
  }

  // ------------------------------------------------------------------
  // Exécution
  // ------------------------------------------------------------------

  // Ce que le moteur sait de la fiche qui l'appelle. Quand une information
  // manque (appel sans infos, objet Mia incomplet), le verrou correspondant
  // est SAUTÉ : mieux vaut laisser tourner un mod qu'on ne sait pas juger que
  // le déclarer trop récent faute de repère. Ce principe est bon, mais il ne
  // doit pas s'appliquer à un numéro de beta parfaitement valable : c'est ce
  // qui arrivait tant que lireVersion butait sur le suffixe.
  //
  // La version est gardée BRUTE (suffixe compris) : elle sert au message du
  // verrou, où le joueur doit lire qu'il est sur la beta. Seule la
  // comparaison, elle, ignore le suffixe.
  //
  // La version et le schéma se prennent chacun pour soi, sans que l'un se
  // déduise de l'autre : le schéma est un entier indépendant du majeur.
  function repere(Mia, infos) {
    var v = null, s = null, n;
    try {
      if (infos && typeof infos === "object") {
        if (lireVersion(infos.version)) v = chaine(infos.version).trim();
        n = entierPositif(infos.schema);
        if (n !== null) s = n;
      }
      if (v === null && Mia && lireVersion(Mia.version)) v = chaine(Mia.version).trim();
      if (s === null && Mia) {
        n = entierPositif(Mia.schema);
        if (n !== null) s = n;
      }
    } catch (e) {}
    return { version: v, schema: s, crochet: crochetDe(Mia, infos) };
  }

  // Le § 2 du contrat veut que les filtres posés PENDANT l'exécution d'un mod
  // lui soient attribués (c'est ce qui range le message d'un filtre retiré
  // dans Mia.etat(id).erreur). Or « proprietaireCourant » est une variable
  // interne de mia-fiche.js : ce moteur ne peut que la lui demander. Si la
  // fiche pose un crochet, il sert ; sinon tout marche pareil et le
  // propriétaire reste « ? ». Le crochet reçoit l'id du mod, puis null quand
  // il rend la main.
  function crochetDe(Mia, infos) {
    try {
      if (infos && typeof infos.proprietaire === "function") return infos.proprietaire;
      if (Mia && typeof Mia.__proprietaire === "function") return Mia.__proprietaire;
    } catch (e) {}
    return null;
  }

  function poseProprietaire(crochet, id) {
    if (!crochet) return function () {};
    try { crochet(id); } catch (e) {}
    return function () { try { crochet(null); } catch (e2) {} };
  }

  // Ce qui s'oppose à l'exécution d'un mod, dans l'ordre où le joueur a besoin
  // de le lire : son propre interrupteur d'abord (c'est sa décision, elle
  // prime), son refus ensuite, l'écart de version après, l'attente en dernier.
  // Rend null quand plus rien ne s'y oppose.
  //
  // Les deux verrous ne se parlent pas : « pour » vise la release seule,
  // « apiMin » le schéma seul, et rien ne déduit l'un de l'autre. Le message,
  // lui, montre le numéro BRUT (« celle-ci est en 3.6.0b ») alors que la
  // comparaison ignore le suffixe : le joueur voit sur quoi il tourne, le
  // verrou juge sur le rang.
  function verrou(mod, version, schema) {
    var a;
    if (!mod.actif) return { etat: "coupe", message: "" };
    a = avis(empreinte(mod.id, mod.src));
    if (a === "non") return { etat: "refuse", message: "" };
    if (mod.pour && version && compareVersions(mod.pour, version) > 0) {
      return { etat: "recent", message: "demande la fiche " + mod.pour + ", celle-ci est en " + version };
    }
    if (mod.apiMin !== undefined && schema !== null && mod.apiMin > schema) {
      return { etat: "recent", message: "demande le schéma " + mod.apiMin + ", celui-ci est le " + schema };
    }
    if (a !== "oui") return { etat: "attente", message: "" };
    return null;
  }

  // Compilation et appel, séparés. Une source qui ne compile PAS fait lever
  // new Function() (SyntaxError) : c'est une panne comme une autre, avec son
  // message, jamais une exception qui remonte dans mount().
  //
  // À savoir pour qui écrit un mod : new Function() compile TOUJOURS dans la
  // portée globale, sans hériter du « use strict » de ce fichier ni de ses
  // variables. Un mod ne voit donc rien d'ici ; il ne dispose que de Mia, de
  // ctx, et de ce que la page expose de toute façon.
  function lance(mod, Mia, rep) {
    var fn, ctx, rendre;
    try {
      fn = new Function("Mia", "ctx", mod.src);
    } catch (e) {
      return { etat: "panne", message: messageDe(e) };
    }
    ctx = {
      id: mod.id,
      nom: mod.nom,
      version: rep.version === null ? "" : rep.version,
      schema: rep.schema === null ? 0 : rep.schema
    };
    rendre = poseProprietaire(rep.crochet, mod.id);
    try {
      fn(Mia, ctx);
      return { etat: "ok", message: "" };
    } catch (e2) {
      return { etat: "panne", message: messageDe(e2) };
    } finally {
      // Rendu même sur panne : sans ça, un mod qui jette laisserait tous les
      // filtres suivants inscrits à son nom.
      rendre();
    }
  }

  // Le bilan porte TOUS les mods normalisés, dans leur ordre, y compris ceux
  // qui n'ont pas tourné : c'est lui qui remplit le bloc Options.
  function execute(mods, Mia, infos) {
    var liste = normalise(mods), rep = repere(Mia, infos), bilan = [], i, m, emp, v, res;
    for (i = 0; i < liste.length; i++) {
      m = liste[i];
      emp = "";
      try {
        emp = empreinte(m.id, m.src);
        v = verrou(m, rep.version, rep.schema);
        res = v ? v : lance(m, Mia, rep);
        bilan.push({ id: m.id, nom: m.nom, etat: res.etat, message: res.message, empreinte: emp });
      } catch (e) {
        // Ceinture et bretelles. lance() attrape déjà tout ce qu'un mod lève ;
        // ce filet-ci couvre l'imprévu du moteur lui-même (un accesseur piégé
        // sur l'entrée, par exemple), pour qu'un mod ne puisse jamais empêcher
        // les suivants de tourner en faisant tomber la boucle.
        bilan.push({ id: m.id, nom: m.nom, etat: "panne", message: messageDe(e), empreinte: emp });
      }
    }
    return bilan;
  }

  // Ceux qui attendent une décision, c'est-à-dire exactement ceux que
  // execute() marquerait « attente » : un mod coupé par le joueur ne réclame
  // rien, et un refus est une décision. « infos » est facultatif (le contrat
  // ne le demande pas) ; le passer aligne le décompte du bandeau sur le bilan
  // quand un mod porte un « pour » ou un « apiMin ».
  function enAttente(mods, infos) {
    var liste = normalise(mods), rep = repere(null, infos), out = [], i, m, v;
    for (i = 0; i < liste.length; i++) {
      m = liste[i];
      try {
        v = verrou(m, rep.version, rep.schema);
        if (v && v.etat === "attente") {
          out.push({ id: m.id, nom: m.nom, empreinte: empreinte(m.id, m.src), src: m.src });
        }
      } catch (e) {}
    }
    return out;
  }

  var MiaMods = {
    empreinte: empreinte,
    avis: avis,
    decide: decide,
    normalise: normalise,
    execute: execute,
    enAttente: enAttente,
    // La règle de lecture des numéros, offerte à qui en a besoin. Elle n'est
    // pas là pour les mods (ils reçoivent ctx.version tout lu) mais pour que
    // la fiche et les sondes cessent d'en tenir chacune une copie : deux
    // motifs pour une seule décision, c'est ainsi que le formulaire des mods
    // s'est mis à refuser le numéro qu'il proposait lui-même en filigrane.
    lireVersion: lireVersion,
    compareVersions: compareVersions
  };

  global.MiaMods = MiaMods;
  // Exporté aussi pour node, comme MiaMigr : le moteur n'a besoin d'aucun DOM,
  // un script de test peut donc l'éprouver hors du navigateur.
  if (typeof module === "object" && module && module.exports) module.exports = MiaMods;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
