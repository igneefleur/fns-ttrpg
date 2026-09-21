  // LES EMPLACEMENTS DE L'INVENTAIRE. Les huit cases de Sur soi, dans l'ordre
  // de l'écran (les trois de la première ligne, puis les cinq vêtements), puis
  // les deux groupes libres.
  var INV_VETEMENTS = ["tete", "mains", "haut", "bas", "pieds"];
  var INV_CASES = ["mainG", "mainD", "dos"].concat(INV_VETEMENTS);
  var INV_LIEUX = INV_CASES.concat(["poches", "sac"]);
  function normGestes(liste) {
    return (Array.isArray(liste) ? liste : []).filter(function (g) { return g && typeof g === "object"; })
      .map(function (g) {
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
      });
  }
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
    s.effort = String(s.effort == null ? "" : s.effort) || b.effort;
    s.effAutre = clamp(Math.round(num(s.effAutre, 0)), 0, 99);
    s.desTailles = Array.isArray(s.desTailles)
      ? s.desTailles.slice(0, 99).map(function (t) {
          t = num(t, 0);
          return [4, 6, 8, 10, 12].indexOf(t) >= 0 ? t : null;
        })
      : [];
    s.temperature = clamp(Math.round(num(s.temperature, b.temperature) * 10) / 10, -999, 999);
    s.argent = pnum(s.argent);

    // ---- caractéristiques ----
    // Les huit du socle, plus toute caractéristique que les règles déclarent
    // aujourd'hui : une caractéristique ajoutée demain arrive à sa valeur
    // moyenne sans migration ni montée de schéma.
    if (!s.caracs || typeof s.caracs !== "object" || Array.isArray(s.caracs)) s.caracs = b.caracs;
    var moyenne = num(D().moyenneHumaine, 20);
    var listeCaracs = CARACS.slice();
    caracsData().forEach(function (c) {
      if (c && c.cle && listeCaracs.indexOf(c.cle) < 0) listeCaracs.push(c.cle);
    });
    Object.keys(s.caracs).forEach(function (k) { if (listeCaracs.indexOf(k) < 0) listeCaracs.push(k); });
    listeCaracs.forEach(function (c) {
      s.caracs[c] = clamp(num(s.caracs[c], moyenne), -9999, 9999);
    });
    // Les points achetés : entiers positifs, et un zéro ne s'écrit pas. Une
    // clé qui n'est plus une caractéristique connue est GARDÉE, comme dans
    // `caracs` : on ne jette pas ce que le joueur a payé.
    var achats = (s.caracsXp && typeof s.caracsXp === "object" && !Array.isArray(s.caracsXp))
      ? s.caracsXp : {};
    s.caracsXp = {};
    Object.keys(achats).forEach(function (c) {
      var n = clamp(Math.round(num(achats[c], 0)), 0, 99999);
      if (n > 0) s.caracsXp[c] = n;
    });
    // LES LEVIERS. Le rangement boucle sur le CATALOGUE, jamais sur l'état : un
    // levier dont le nom n'est pas au catalogue disparaît au premier
    // enregistrement, sans un mot. C'est le prix d'un état qui ne grossit pas
    // tout seul, et c'est pourquoi le catalogue se tient à jour AVANT d'écrire
    // le module qui pose le levier.
    s.caracsLeviers = tableLeviers(s.caracsLeviers, CARAC_LEVIERS);

    // ---- valeurs courantes ----
    if (!s.etat || typeof s.etat !== "object" || Array.isArray(s.etat)) s.etat = b.etat;
    ["pv", "pe", "pm", "pi", "pr", "ps", "ph", "pc", "rupture"].forEach(function (k) {
      var v = s.etat[k];
      if (v === null || v === undefined || v === "") { s.etat[k] = null; return; }
      var n = parseFloat(v);
      s.etat[k] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -99999, 99999) : null;
    });
    // expo et contenance ne sont PAS nullables : 0 y est une vraie valeur
    s.etat.expo = clamp(snum(s.etat.expo), -99999, 99999);
    s.etat.contenance = clamp(pnum(s.etat.contenance), 0, 99999);

    // ---- les leviers des capacités ----
    // Aucune liste de clés n'est imposée : une capacité ajoutée demain dans les
    // règles reçoit ses neuf boîtes sans qu'on rouvre ce fichier.
    s.capsLeviers = tableLeviers(s.capsLeviers, CAP_LEVIERS);

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
    // Les leviers ne parlent que de compétences qui existent : une clé orpheline
    // (compétence supprimée par une version qui l'ignorait) voyagerait pour rien.
    s.compsLeviers = tableLeviers(s.compsLeviers, COMP_LEVIERS, vusComps);

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
          offert: clamp(num(t.offert, 0), 0, nb),
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
        gestes: normGestes(gestes)
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
    s.inv.opts.cols = clamp(num(s.inv.opts.cols, b.inv.opts.cols), 1, 5);
    // chaque réglage garde SON défaut quand il manque (un opts partiel ne doit
    // pas allumer un affichage éteint par défaut)
    ["nom", "qte", "poids", "total", "vign"].forEach(function (k) {
      s.inv.opts[k] = s.inv.opts[k] === undefined ? b.inv.opts[k] : !!s.inv.opts[k];
    });
    // Les anciens groupes libres ne survivent pas : le schéma 3 les a remis au
    // grenier, et l'emplacement « ou » les remplace.
    delete s.inv.groupes;
    delete s.inv.comptes;
    if (!Array.isArray(s.inv.objets)) s.inv.objets = [];
    s.inv.objets = s.inv.objets.filter(function (o) { return o && typeof o === "object"; }).map(function (o) {
      var a = o.arme && typeof o.arme === "object" && !Array.isArray(o.arme) ? o.arme : null;
      return {
        id: String(o.id == null ? "" : o.id),   // LIBRE et facultatif : c'est le joueur qui le pose
        nom: o.nom == null ? "" : String(o.nom),
        img: o.img == null ? "" : String(o.img),
        qte: pnum(o.qte === undefined ? 1 : o.qte),
        poids: pnum(o.poids),
        places: pnum(o.places),
        achat: pnum(o.achat), vente: pnum(o.vente),
        desc: o.desc == null ? "" : String(o.desc),
        ou: INV_LIEUX.indexOf(o.ou) >= 0 ? o.ou : "sac",
        rapide: !!o.rapide,
        vet: INV_VETEMENTS.indexOf(o.vet) >= 0 ? o.vet : "",
        poches: pnum(o.poches),
        froid: snum(o.froid), chaud: snum(o.chaud),
        sac: !!o.sac,
        cap: pnum(o.cap),
        arme: a ? {
          prise: String(a.prise == null ? "" : a.prise),
          parade: String(a.parade == null ? "" : a.parade),
          reduction: String(a.reduction == null ? "" : a.reduction),
          // l'ID d'une compétence, jamais son nom : le nom se renomme
          comp: a.comp && vusComps[a.comp] ? String(a.comp) : "",
          gestes: normGestes(a.gestes)
        } : null
      };
    });
    // UNE CASE, UN OBJET, ET LE BON : une case de vêtement ne prend que son
    // type de vêtement, la case du sac à dos qu'un sac. Ce qui n'y a pas sa
    // place, ou arrive second, retourne au sac plutôt que de disparaître.
    var prises = {};
    s.inv.objets.forEach(function (o) {
      if (INV_CASES.indexOf(o.ou) < 0) return;
      var ok = !prises[o.ou] &&
               (INV_VETEMENTS.indexOf(o.ou) < 0 || o.vet === o.ou) &&
               (o.ou !== "dos" || o.sac);
      if (ok) prises[o.ou] = 1;
      else o.ou = "sac";
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
  // ---------- LES TROIS CATALOGUES DE LEVIERS ----------
  // UN LEVIER ABSENT D'ICI EST JETÉ EN SILENCE au premier rangement : le
  // rangement boucle sur ces tables, jamais sur l'état. Écrire le module avant
  // le catalogue, c'est écrire un réglage qui disparaît au rechargement sans
  // qu'aucune erreur ne paraisse. La valeur est la BORNE des ajouts de ce
  // levier — l'échelle de ce qu'il règle, pas un plafond de jeu.
  var CARAC_LEVIERS = { total: 9999, xp: 99999 };
  var CAP_LEVIERS = { max: 99999 };
  var COMP_LEVIERS = { bonus: 999, des: 99, xp: 9999, rupture: 99, offerts: 99 };

  var BOITES_AJOUT = ["a1", "a2", "a3", "a4"];
  var BOITES_FACTEUR = ["m1", "m2", "m3", "m4"];

  // Une table de leviers : levier -> boîte -> clé. Trois niveaux, tous ÉPARS.
  //
  // LES NEUTRES NE SE RANGENT PAS, et ils ne sont pas les mêmes : un ajout de
  // zéro et un facteur de un ne changent rien, donc ils s'effacent ; un FORÇAGE
  // à zéro, lui, se range — c'est le seul moyen d'obtenir zéro à coup sûr, et
  // le confondre avec « pas de forçage » perdrait le réglage.
  //
  // `cles`, s'il est donné, est la table des clés encore vivantes : tout ce qui
  // ne s'y trouve plus s'en va.
  function tableLeviers(src, bornes, cles) {
    var out = {};
    if (!src || typeof src !== "object" || Array.isArray(src)) src = {};
    Object.keys(bornes).forEach(function (nom) {
      var t = src[nom];
      if (!t || typeof t !== "object" || Array.isArray(t)) return;
      var borne = bornes[nom];
      var boites = {};
      var pose = function (boite, cle, v) {
        if (!boites[boite]) boites[boite] = {};
        boites[boite][cle] = v;
      };
      var force = t.force;
      if (force && typeof force === "object" && !Array.isArray(force)) {
        Object.keys(force).forEach(function (cle) {
          if (cles && !cles[cle]) return;
          var v = parseFloat(force[cle]);
          if (!isFinite(v)) return;          // vide = pas de forçage
          pose("force", cle, clamp(Math.round(v * 100) / 100, -99999, 99999));
        });
      }
      BOITES_AJOUT.forEach(function (boite) {
        var m = t[boite];
        if (!m || typeof m !== "object" || Array.isArray(m)) return;
        Object.keys(m).forEach(function (cle) {
          if (cles && !cles[cle]) return;
          var v = parseFloat(m[cle]);
          if (!isFinite(v) || v === 0) return;   // un ajout de zéro n'est pas un réglage
          pose(boite, cle, clamp(Math.round(v * 100) / 100, -borne, borne));
        });
      });
      BOITES_FACTEUR.forEach(function (boite) {
        var m = t[boite];
        if (!m || typeof m !== "object" || Array.isArray(m)) return;
        Object.keys(m).forEach(function (cle) {
          if (cles && !cles[cle]) return;
          var v = parseFloat(m[cle]);
          if (!isFinite(v) || v === 1) return;   // un facteur de un n'est pas un réglage
          pose(boite, cle, clamp(Math.round(v * 100) / 100, -MULT_BORNE, MULT_BORNE));
        });
      });
      if (Object.keys(boites).length) out[nom] = boites;
    });
    return out;
  }

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
