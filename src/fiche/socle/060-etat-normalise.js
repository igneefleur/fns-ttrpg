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
    var COMP_BORNE = { valeur: 999, plafond: 999, bonus: 999, xp: 9999, ecart: 9999 };
    // UNE SPÉCIALITÉ N'A PAS DE PLAFOND : les règles n'en donnent aucun, et
    // l'absence de « plafond » dans cette table n'est pas un oubli.
    var SPE_BORNE = { valeur: 999, bonus: 999, xp: 9999, ecart: 9999 };
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
