  function normalize(s) {
    var b = blank();
    if (!s || typeof s !== "object") return b;
    s = migre(s);
    Object.keys(b).forEach(function (k) { if (s[k] === undefined) s[k] = b[k]; });
    // La release suit toujours le code qui vient d'écrire : c'est lui qui fait
    // foi. Sur la beta, cela tamponne le suffixe sur n'importe quel personnage
    // seulement ouvert puis réenregistré ; c'est sans danger tant que le
    // suffixe ne change pas le rang, un « 3.6.0b » rouvert sur le site stable
    // 3.6.0 ne devant surtout pas passer pour venu du futur.
    if (parseInt(s.v, 10) === SCHEMA) s.rel = RELEASE;
    if (!s.caracsBase || typeof s.caracsBase !== "object") s.caracsBase = b.caracsBase;
    if (!s.caracsXp || typeof s.caracsXp !== "object") s.caracsXp = b.caracsXp;
    if (!s.caracsMod || typeof s.caracsMod !== "object") s.caracsMod = b.caracsMod;
    ["caracsMod2", "caracsXpMod", "caracsXpMod2", "caracsPlafondMod"].forEach(function (k) {
      if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k])) s[k] = { Mind: 0, Body: 0, Prestance: 0 };
    });
    ["caracsForce", "caracsXpForce", "caracsPlafondForce"].forEach(function (k) {
      if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k])) s[k] = {};
    });
    // les modificateurs (blocs Options) acceptent les décimales : les sommes
    // migrées depuis les anciens divers peuvent en porter
    function modNum(v) {
      var n = parseFloat(v);
      return isFinite(n) ? clamp(Math.round(n * 100) / 100, -999, 999) : 0;
    }
    ["Mind", "Body", "Prestance"].forEach(function (c) {
      s.caracsBase[c] = clamp(num(s.caracsBase[c], 0), 0, 999);
      s.caracsXp[c] = clamp(num(s.caracsXp[c], 0), 0, 99);
      s.caracsMod[c] = modNum(s.caracsMod[c]);
      s.caracsMod2[c] = modNum(s.caracsMod2[c]);
      s.caracsXpMod[c] = modNum(s.caracsXpMod[c]);
      s.caracsXpMod2[c] = modNum(s.caracsXpMod2[c]);
      s.caracsPlafondMod[c] = modNum(s.caracsPlafondMod[c]);
      // forçages : ABSENTS par défaut, une valeur les pose
      ["caracsForce", "caracsXpForce", "caracsPlafondForce"].forEach(function (k) {
        if (s[k][c] === undefined || s[k][c] === null || s[k][c] === "") { delete s[k][c]; return; }
        var n = parseFloat(s[k][c]);
        if (isFinite(n)) s[k][c] = clamp(Math.round(n), -9999, 9999); else delete s[k][c];
      });
    });
    // budget de points de création : un modificateur, et un forçage qui vaut
    // null quand il n'y en a pas (même convention que pvMaxOverride)
    s.ptsCreaMod = modNum(s.ptsCreaMod);
    if (s.ptsCreaForce === undefined || s.ptsCreaForce === null || s.ptsCreaForce === "") s.ptsCreaForce = null;
    else {
      var pcf = parseFloat(s.ptsCreaForce);
      s.ptsCreaForce = isFinite(pcf) ? clamp(Math.round(pcf), -9999, 9999) : null;
    }
    // Migration de l'ancienne case « Sans limite » (retirée le 2026-08-04) :
    // elle levait le plafond des trois caractéristiques d'un coup. Une fiche
    // qui la portait cochée garde ses chiffres, plafond forcé assez haut pour
    // ne jamais mordre — mais SEULEMENT là où le plafond mordrait vraiment.
    // Sinon la case, cochée « au cas où » sur une fiche que 80 n'a jamais
    // gênée, laissait trois plafonds forcés à 9999 en travers du bloc.
    if (s.sansLimite) {
      ["Mind", "Body", "Prestance"].forEach(function (c) {
        if (s.caracsPlafondForce[c] !== undefined) return;
        if (s.caracsBase[c] + CARAC_PAS * s.caracsXp[c] > CARAC_MAX) s.caracsPlafondForce[c] = 9999;
      });
    }
    s.sansLimite = false;
    // modificateurs divers (3 emplacements : équipement / art / MJ) : seuls
    // PV max, régén et vitesse en portent encore
    if (!s.divers || typeof s.divers !== "object" || Array.isArray(s.divers)) s.divers = b.divers;
    s.divers.pvMax = modArr(s.divers.pvMax);
    s.divers.regen = modArr(s.divers.regen);
    s.divers.vitesse = modArr(s.divers.vitesse);
    if (!s.compsMod || typeof s.compsMod !== "object" || Array.isArray(s.compsMod)) s.compsMod = {};
    // migration inverse (2026-08-02) : les divers de caractéristiques et de
    // compétences (essai en ligne du 2026-08-01) redeviennent le modificateur
    // UNIQUE des blocs Options — leurs sommes s'y replient, rien ne se perd
    if (s.divers.caracs && typeof s.divers.caracs === "object") {
      ["Mind", "Body", "Prestance"].forEach(function (c) {
        var d = modSum(modArr(s.divers.caracs[c]));
        if (d) s.caracsMod[c] = modNum(s.caracsMod[c] + d);
      });
    }
    delete s.divers.caracs;
    if (s.divers.comps && typeof s.divers.comps === "object" && !Array.isArray(s.divers.comps)) {
      Object.keys(s.divers.comps).forEach(function (k) {
        var d = modSum(modArr(s.divers.comps[k]));
        if (d) s.compsMod[k] = modNum((parseFloat(s.compsMod[k]) || 0) + d);
      });
    }
    delete s.divers.comps;
    // modificateur unique par compétence (bloc Options) : clés normalisées
    // comme les compétences, entrées nulles purgées
    var cmods = {};
    Object.keys(s.compsMod).forEach(function (k) {
      var n = modNum(s.compsMod[k]);
      if (!n) return;
      var di = k.indexOf("/");
      cmods[di > 0 ? k.slice(0, di + 1) + capFirst(k.slice(di + 1)) : k] = n;
    });
    s.compsMod = cmods;
    // leviers du MJ, par compétence : les cartes de forçage acceptent le vide
    // (= valeur calculée) ; le modificateur de coût, lui, est un nombre
    function mapNombres(src, force) {
      var out = {};
      if (!src || typeof src !== "object" || Array.isArray(src)) return out;
      Object.keys(src).forEach(function (k) {
        var v = src[k];
        if (force && (v === null || v === undefined || v === "")) return;
        var n = parseFloat(v);
        if (!isFinite(n)) return;
        n = clamp(Math.round(n), -9999, 9999);
        if (!force && !n) return;   // zéro = pas d'entrée
        var i = k.indexOf("/");
        out[i > 0 ? k.slice(0, i + 1) + capFirst(k.slice(i + 1)) : k] = n;
      });
      return out;
    }
    s.compsForce = mapNombres(s.compsForce, true);
    s.compsXpForce = mapNombres(s.compsXpForce, true);
    s.compsXpMod = mapNombres(s.compsXpMod, false);
    // PV max forcé : vide = valeur calculée ; borné comme le reste
    s.pvMaxOverride = (s.pvMaxOverride === null || s.pvMaxOverride === undefined || s.pvMaxOverride === "")
      ? null : Math.floor(parseFloat(s.pvMaxOverride));
    if (s.pvMaxOverride !== null && !isFinite(s.pvMaxOverride)) s.pvMaxOverride = null;
    if (s.pvMaxOverride !== null) s.pvMaxOverride = clamp(s.pvMaxOverride, 0, 9999);
    // vitesse et régénération forcées : même règle, la vitesse en décimales
    // (la table donne des paliers comme 10.5 m)
    function force(v, dec, max) {
      if (v === null || v === undefined || v === "") return null;
      var n = parseFloat(v);
      if (!isFinite(n)) return null;
      return clamp(dec ? Math.round(n * 100) / 100 : Math.floor(n), 0, max);
    }
    s.vitesseOverride = force(s.vitesseOverride, true, 9999);
    s.regenOverride = force(s.regenOverride, false, 9999);
    // langues : noms uniques, capitalisés ; la langue de base doit être l'une
    // d'elles (sinon la gratuité viserait une langue absente)
    if (!Array.isArray(s.langues)) s.langues = [];
    var vues = {};
    s.langues = s.langues
      .map(function (n) { return capFirst(String(n == null ? "" : n).trim()); })
      .filter(function (n) {
        if (!n || vues[n.toLowerCase()]) return false;
        vues[n.toLowerCase()] = 1;
        return true;
      });
    s.langueBase = capFirst(String(s.langueBase == null ? "" : s.langueBase).trim());
    if (s.langueBase && !vues[s.langueBase.toLowerCase()]) s.langueBase = "";
    // armes ajoutées à la main : noms uniques, et jamais un doublon de celles
    // des règles (qui sont déjà dans le module)
    if (!Array.isArray(s.armesComps)) s.armesComps = [];
    var basiques = {};
    ((DATA && DATA.compsArmes) || []).forEach(function (n) { basiques[String(n).toLowerCase()] = 1; });
    var vuesA = {};
    s.armesComps = s.armesComps
      .map(function (n) { return capFirst(String(n == null ? "" : n).trim()); })
      .filter(function (n) {
        if (!n || vuesA[n.toLowerCase()] || basiques[n.toLowerCase()]) return false;
        vuesA[n.toLowerCase()] = 1;
        return true;
      });
    if (!Array.isArray(s.qualites)) s.qualites = ["", ""];
    s.qualites = s.qualites.map(function (q) { return q == null ? "" : String(q); });
    while (s.qualites.length < 2) s.qualites.push("");
    function objArray(a) {
      if (!Array.isArray(a)) return [];
      return a.filter(function (x) { return x && typeof x === "object"; });
    }
    s.avantages = objArray(s.avantages);
    s.customComps = objArray(s.customComps);
    s.customComps.forEach(function (cc) { if (cc.name) cc.name = capFirst(cc.name); });
    s.armes = objArray(s.armes);
    s.armures = objArray(s.armures);
    if (typeof s.comps !== "object" || !s.comps) s.comps = {};
    var comps = {};
    Object.keys(s.comps).forEach(function (k) {
      var c = s.comps[k];
      if (!c || typeof c !== "object") c = {};
      c.stade = clamp(num(c.stade, 0), 0, DATA ? DATA.stades.length - 1 : 4);
      // la clé d'état s'appelle « techniques » (historique : elle a déjà été
      // migrée depuis « passifs », que l'interface réemploie aujourd'hui) ;
      // chaque entrée est un objet {name, desc} (l'ancien texte simple
      // devient le nom, description vide)
      if (!Array.isArray(c.techniques)) c.techniques = Array.isArray(c.passifs) ? c.passifs : [];
      delete c.passifs;
      c.techniques = c.techniques.map(function (p) {
        // cout : coût forcé de CE passif (null = le tarif de base) ; le joueur
        // peut le régler à droite du nom, en mode édition
        if (p && typeof p === "object") {
          var t = { name: String(p.name || ""), desc: String(p.desc || "") };
          var co = (p.cout === null || p.cout === undefined || p.cout === "") ? null : Math.floor(parseFloat(p.cout));
          if (co !== null && isFinite(co)) t.cout = clamp(co, 0, 9999);
          return t;
        }
        return { name: p == null ? "" : String(p), desc: "" };
      });
      // l'art du stade qui l'ouvre (Art) : {name, desc} ; un art resté vide s'efface
      if (c.art && typeof c.art === "object") {
        var aco = (c.art.cout === null || c.art.cout === undefined || c.art.cout === "")
          ? null : Math.floor(parseFloat(c.art.cout));
        c.art = { name: String(c.art.name || ""), desc: String(c.art.desc || "") };
        if (aco !== null && isFinite(aco)) c.art.cout = clamp(aco, 0, 9999);
        // un art vierge s'efface — son coût forcé n'aurait plus d'objet
        if (!c.art.name.trim() && !c.art.desc.trim()) delete c.art;
      } else delete c.art;
      // migration : noms de compétences capitalisés (« Body/apnée » -> « Body/Apnée »)
      var i = k.indexOf("/");
      comps[i > 0 ? k.slice(0, i + 1) + capFirst(k.slice(i + 1)) : k] = c;
    });
    s.comps = comps;
    // renommages de compétences (2026-08-02) : les fiches d'avant migrent
    // d'elles-mêmes — investissements, modificateurs et leviers du MJ suivent
    // le nouveau nom, rien ne se perd
    var RENOMMAGES = {
      "Body/Se cacher": "Body/Discrétion",
      "Body/Pique Longue": "Body/Pique longue",
      "Mind/Histoire Japon": "Mind/Histoire du Japon",
      "Mind/Se concentrer": "Mind/Concentration",
      "Mind/Résister à la douleur": "Mind/Résistance à la douleur",
      "Mind/Garder son calme": "Mind/Sang-froid",
      "Mind/Observer": "Mind/Observation",
      "Mind/Utiliser un autre de ses sens que la vue": "Mind/Sens autres que la vue",
      "Prestance/Déception": "Prestance/Tromperie",
      "Prestance/Commander": "Prestance/Commandement",
      "Prestance/Réconforter": "Prestance/Réconfort",
      // 26/08/2026, à la demande de l'auteur des règles
      "Mind/Politique régionale/nationale": "Mind/Politique du Japon"
    };
    // LES SEPT CARTES, ET NON CINQ. compsMod2 et compsXpMod2 sont le SECOND
    // levier du MJ : ils portent les mêmes clés que les autres et s'ajoutent à
    // eux dans les calculs (voir 110-calculs-comps.js et 080-calculs-caracs.js).
    // Les oublier ici faisait perdre ce second levier à chaque renommage — pour
    // les onze de 2026-08-02 comme pour celui d'aujourd'hui. Le commentaire
    // ci-dessus promet que « rien ne se perd » : il ne devient vrai que
    // maintenant.
    // ET L'ON VÉRIFIE QUE LA CARTE EXISTE. Les cinq premières sont normalisées
    // plus haut (lignes 69 et 114-116) et sont donc sûres ; les deux « 2 » ne
    // le sont PAS — rien ne les crée avant ce point sur un état venu de Roll20.
    // Sans ce garde, hasOwnProperty.call(undefined, …) lèverait, et c'est toute
    // la fiche qui ne s'ouvrirait plus.
    [s.comps, s.compsMod, s.compsMod2, s.compsForce,
     s.compsXpForce, s.compsXpMod, s.compsXpMod2].forEach(function (m) {
      if (!m || typeof m !== "object") return;
      Object.keys(RENOMMAGES).forEach(function (vieux) {
        if (Object.prototype.hasOwnProperty.call(m, vieux)) {
          if (m[RENOMMAGES[vieux]] === undefined) m[RENOMMAGES[vieux]] = m[vieux];
          delete m[vieux];
        }
      });
    });
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
    // sinon du poids disparaîtrait en silence), un tableau plus long se coupe
    // (le groupe a été supprimé ailleurs). C'est un tableau RECONSTRUIT : ne
    // rien y ranger d'autre.
    if (!Array.isArray(s.inv.comptes)) s.inv.comptes = [];
    // PLUS DE DRAPEAUX QUE DE GROUPES : un groupe a été supprimé par une version
    // qui ignore « comptes » (une archive antérieure sait ouvrir ce personnage,
    // c'est même son rôle). Elle n'a pas retiré le drapeau correspondant, et
    // personne ne peut plus dire LEQUEL : couper la fin décalerait tous les
    // suivants, et un sac resterait posé au sol sans que rien ne le montre.
    // On rend donc tout au poids porté. Perdre un décochage se voit et se
    // refait ; perdre du poids en silence fausse la fiche sans prévenir.
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
        // à l'autre quand on le donne (deux « Corde » différentes ne se
        // confondent pas si elles portent des identifiants distincts)
        id: it.id == null ? "" : String(it.id),
        achat: pnum(it.achat),
        vente: pnum(it.vente),
        groupe: clamp(num(it.groupe, 0), 0, s.inv.groupes.length - 1)
      };
    });
    // migration : l'ancien inventaire en texte libre (une ligne par objet)
    // devient des lignes de liste, quantité 1 et poids 0
    if (s.inventaire && typeof s.inventaire === "string" && !s.inv.texte.length) {
      s.inventaire.split(/\r?\n/).forEach(function (line) {
        line = line.trim();
        if (line) s.inv.texte.push({ nom: line, qte: 1, poids: 0, compte: true });
      });
      s.inventaire = "";
    }
    // migration : la liste (retirée de la fiche) se fond dans les objets
    // illustrés, au premier groupe ; sa case « compter le poids » disparaît
    if (s.inv.texte.length) {
      s.inv.texte.forEach(function (it) {
        s.inv.objets.push({ nom: it.nom, qte: it.qte, poids: it.poids, img: "", desc: "", groupe: 0 });
      });
      s.inv.texte = [];
    }
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
    // Mods du personnage. Le moteur (jjk-mods.js) fait foi quand il est là :
    // c'est lui qui connaît la forme d'un mod. Sans lui, la fiche s'en tient au
    // strict nécessaire, mais elle ne s'en dispense JAMAIS : un état venu
    // d'ailleurs (import, Attributes d'un autre joueur) ne doit pas entrer sans
    // contrôle, et un mod sans id ni code ne pourrait ni tourner ni se nommer.
    if (!Array.isArray(s.mods)) s.mods = [];
    if (window.JjkMods && typeof window.JjkMods.normalise === "function") {
      try {
        var normes = window.JjkMods.normalise(s.mods);
        if (Array.isArray(normes)) s.mods = normes;
      } catch (e) {}
    }
    var vusMods = {};
    s.mods = objArray(s.mods).filter(function (m) {
      // L'id impose son alphabet : il sert de clé partout (avis du navigateur,
      // journal « [mod:<id>] », coffre du module qu'il remplacerait). Même
      // règle que le moteur (idPropre) : les deux chemins doivent donner le
      // MÊME id, sans quoi l'empreinte changerait selon le chemin pris et le
      // joueur aurait à réautoriser un mod qu'il connaît déjà.
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
    s.xpTotal = Math.max(0, num(s.xpTotal, XP_CREATION));
    s.narration = clamp(num(s.narration, 3), 0, 99);
    s.pv = (s.pv === null || s.pv === undefined || s.pv === "") ? null : parseFloat(s.pv);
    if (s.pv !== null && !isFinite(s.pv)) s.pv = null;
    return s;
  }

