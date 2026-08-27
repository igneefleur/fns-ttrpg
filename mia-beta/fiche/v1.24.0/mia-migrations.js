/* Moteur de migration de la fiche MIA : montée ET descente de schéma.
 *
 * Une fiche vit dans les Attributes d'un personnage Roll20 ou dans le
 * localStorage du site, et la version du code qui la rouvre n'est pas celle
 * qui l'a écrite : une table peut rester sur une version d'archive pendant
 * qu'une autre passe à la suivante. La fiche doit donc savoir DESCENDRE aussi
 * bien que monter, et le trajet aller-retour doit rendre l'état de départ au
 * bit près. C'est tout l'objet de ce fichier.
 *
 * Ce moteur ne connaît RIEN de la fiche : il ne lit ni ne construit un
 * personnage, il enchaîne des pas écrits ailleurs. Il tourne aussi bien dans
 * le navigateur (window.MiaMigr) que dans node (module.exports), pour que
 * scripts/test_migrations.js puisse le mettre à l'épreuve sans DOM.
 *
 * Vocabulaire :
 *   schéma   numéro de structure de l'état, porté par state.v ; il suit le
 *            MAJEUR de la version publiée (3.x.y -> schéma 3).
 *   pas      un couple monter/descendre entre deux schémas voisins, rangé
 *            sous son schéma CIBLE : le pas 3 fait 2 -> 3 en montant et
 *            3 -> 2 en descendant.
 *   grenier  ce qu'une version d'arrivée ne sait pas porter y attend le
 *            retour, plutôt que de disparaître.
 *   perte    ce qui, lui, ne reviendra pas : déclaré, pour que l'écran
 *            d'avertissement le dise AVANT que le joueur accepte.
 */
(function (global) {
  "use strict";

  var SCHEMA_BASE = 1;          // le parc existant : aucune fiche n'est en dessous
  var GRENIER_MAX = 64 * 1024;  // au-delà, le grenier refuse et déclare une perte
  var GRENIER_ALERTE = 32 * 1024;
  var VHIST_MAX = 10;

  // ------------------------------------------------------------------
  // CE QUE NORMALIZE() GARDE, CE QU'IL JETTE
  //
  // C'est la SEULE chose qu'un auteur de pas doit avoir en tête. normalize()
  // (docs/javascripts/mia-fiche.js) repasse sur l'état à chaque chargement,
  // à chaque import et à chaque relecture des Attributes Roll20 : il tourne
  // donc APRÈS toute migration. Ranger une donnée dans une structure qu'il
  // reconstruit revient à ne pas la ranger du tout, et le pas de descente
  // qui devait la rendre trouvera le vide.
  //
  // Relevé fait sur mia-fiche.js le 2026-08-03 (numéros de ligne indicatifs,
  // les ancres citées restent, elles, faciles à retrouver) :
  //
  // CONSERVATRICES — une clé inconnue y survit, on peut y ranger :
  //   la racine de l'état      l.162 « Object.keys(b).forEach(... if (s[k] ===
  //                            undefined) s[k] = b[k]) » puis l.410 « return s »
  //                            : normalize COMPLÈTE l'objet reçu et le rend
  //                            tel quel. C'est pourquoi grenier et vHist
  //                            vivent à la racine, et nulle part ailleurs.
  //   comps[k] (l'entrée)      l.285-322 : l'objet c est celui d'origine ;
  //                            seuls stade, techniques et art sont réécrits.
  //   avantages[]              l.279  objArray() ne fait que filtrer les
  //   customComps[]            l.280  non-objets ; les objets passent
  //   armes[]                  l.282  intacts, avec toutes leurs clés.
  //   armures[]                l.283
  //   divers (l'objet)         l.179-183 : seuls pvMax, regen et vitesse sont
  //                            réécrits ; caracs et comps y sont SUPPRIMÉS
  //                            (l.193, l.200), ne pas réemployer ces deux noms.
  //   inv.opts                 l.359-365 : conservatrice par ACCIDENT (les
  //                            réglages sont posés un à un sur l'objet reçu,
  //                            pas reconstruits). Fragile : la moindre
  //                            réécriture de ce bloc en littéral la ferait
  //                            basculer dans l'autre colonne. Ne rien y ranger.
  //                            Réglages lus : nom, qte, poids, total, vign
  //                            (vign = la colonne des vignettes du registre) ;
  //                            cols et nom survivent des tuiles, inertes.
  //
  // RECONSTRUITES champ par champ — tout le reste est JETÉ, ne rien y ranger :
  //   comps[k].techniques[]    l.296-309 : chaque entrée redevient
  //                            {name, desc} (+ cout).
  //   comps[k].art             l.310-315 : {name, desc} (+ cout), et l'art
  //                            vierge est effacé.
  //   inv.objets[]             l.372-390 : littéral de dix champs.
  //   inv.comptes[]            recalé sur inv.groupes à chaque normalize (un
  //                            drapeau par groupe, un groupe inconnu est
  //                            COMPTÉ) : rien d'autre ne peut y tenir.
  //   inv.texte[]              l.349-356 : littéral de quatre champs, et de
  //                            toute façon vidé dans inv.objets (l.400-404).
  //   compsMod                 l.203-210 : « var cmods = {} », une entrée non
  //                            numérique ou nulle disparaît.
  //   compsForce               l.213-230 : mapNombres construit « out = {} » ;
  //   compsXpForce             mêmes règles, les clés sont recapitalisées.
  //   compsXpMod
  //   divers.pvMax / regen     l.181-183 : modArr rend TOUJOURS trois
  //   divers.vitesse           emplacements de nombres.
  //   langues[] armesComps[]   l.250-272 : tableaux de chaînes reconstruits.
  //   qualites[]               l.273-274
  //
  // Corollaire pratique : un pas qui doit mettre une donnée à l'abri la range
  // au grenier (racine, conservatrice) ; il ne la cache jamais dans une
  // technique, un art, un objet d'inventaire ou un levier du MJ.
  // ------------------------------------------------------------------

  // Longueur en OCTETS d'une chaîne UTF-8. TextEncoder n'est pas garanti dans
  // l'iframe d'extension, et « .length » compterait des unités UTF-16 : un
  // grenier plein de « é » passerait sous la limite avant de faire déborder
  // l'Attribute Roll20, qui, lui, compte des octets.
  function octets(txt) {
    var n = 0, i, c;
    for (i = 0; i < txt.length; i++) {
      c = txt.charCodeAt(i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; }   // paire de substitution
      else n += 3;
    }
    return n;
  }
  function aClef(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function entier(v) {
    var n = typeof v === "number" ? v : parseInt(v, 10);
    return typeof n === "number" && isFinite(n) && Math.floor(n) === n ? n : null;
  }

  // L'erreur qu'un descendre lève quand il ne PEUT pas défaire sa montée.
  // Appelable avec ou sans « new » : un pas écrit « throw
  // MiaMigr.IRREVERSIBLE("la fusion des groupes ne se défait pas") ».
  function Irreversible(raison) {
    var e = new Error(String(raison || "descente impossible"));
    e.name = "MiaIrreversible";
    e.irreversible = true;
    e.raison = String(raison || "");
    return e;
  }

  // Un registre = une chaîne de pas indépendante. Le site en emploie un seul
  // (celui exporté), mais les tests en fabriquent des neufs : un pas d'essai
  // ne doit jamais s'ajouter à la chaîne publiée, et le déterminisme se
  // mesure en rejouant le même pas dans deux registres vierges.
  function Registre() {
    var PAS = {};   // indexé par schéma CIBLE

    function max() {
      var m = SCHEMA_BASE, k;
      for (k in PAS) { if (aClef(PAS, k)) { var n = entier(k); if (n !== null && n > m) m = n; } }
      return m;
    }

    function ajouter(def) {
      if (!def || typeof def !== "object") throw new Error("migration : définition absente");
      var s = entier(def.schema);
      if (s === null || s <= SCHEMA_BASE) {
        throw new Error("migration : schéma cible invalide (" + def.schema + "), le socle est " + SCHEMA_BASE);
      }
      if (aClef(PAS, s)) throw new Error("migration : le pas " + s + " existe déjà");
      // les deux sens sont EXIGÉS : une montée sans descente condamnerait
      // toute table restée sur la version d'avant.
      if (typeof def.monter !== "function") throw new Error("migration " + s + " : monter() manque");
      if (typeof def.descendre !== "function") {
        throw new Error("migration " + s + " : descendre() manque (un pas irréversible lève MiaMigr.IRREVERSIBLE)");
      }
      if (typeof def.titre !== "string" || !def.titre) throw new Error("migration " + s + " : titre manquant");
      if (typeof def.notes !== "string" || !def.notes) {
        throw new Error("migration " + s + " : notes manquantes (l'écran d'avertissement les affiche)");
      }
      PAS[s] = { schema: s, titre: def.titre, notes: def.notes, monter: def.monter, descendre: def.descendre };
      return api;
    }

    function pas(s) { var n = entier(s); return n === null ? null : (PAS[n] || null); }

    // Liste ordonnée des pas à jouer, ou null si la chaîne est trouée : mieux
    // vaut refuser de partir que de sauter un schéma en silence.
    function chemin(de, vers) {
      var liste = [], i;
      if (vers > de) {
        for (i = de + 1; i <= vers; i++) { if (!PAS[i]) return null; liste.push({ pas: PAS[i], sens: 1 }); }
      } else {
        for (i = de; i > vers; i--) { if (!PAS[i]) return null; liste.push({ pas: PAS[i], sens: -1 }); }
      }
      return liste;
    }

    // Les « notes » des pas traversés, pour l'écran d'avertissement. Rend null
    // (et non un tableau vide) quand le trajet est impossible : un écran qui
    // n'affiche rien se lit « rien à signaler », ce qui serait un mensonge.
    function resume(de, vers) {
      var d = entier(de), v = entier(vers);
      if (d === null || v === null || d < SCHEMA_BASE || v < SCHEMA_BASE) return null;
      var ch = chemin(d, v);
      if (!ch) return null;
      return ch.map(function (e) {
        return {
          schema: e.pas.schema,
          sens: e.sens > 0 ? "montee" : "descente",
          titre: e.pas.titre,
          notes: e.pas.notes
        };
      });
    }

    // Cohérence de la chaîne elle-même. Le test de publication l'appelle ;
    // rend la liste des reproches, vide si tout va bien.
    function verifier() {
      var pbs = [], i, m = max();
      for (i = SCHEMA_BASE + 1; i <= m; i++) {
        if (!PAS[i]) pbs.push("chaîne trouée : aucun pas vers le schéma " + i);
      }
      for (i = SCHEMA_BASE + 1; i <= m; i++) {
        if (!PAS[i]) continue;
        if (typeof PAS[i].monter !== "function") pbs.push("pas " + i + " : monter() manque");
        if (typeof PAS[i].descendre !== "function") pbs.push("pas " + i + " : descendre() manque");
      }
      return pbs;
    }

    /* Applique les pas de « de » vers « vers ».
     *
     * Travaille sur une COPIE PROFONDE : l'état reçu n'est jamais touché, même
     * quand tout se passe bien. Un pas qui échoue laisse donc exactement ce
     * qu'il y avait avant, et l'appelant peut garder son état sans rien
     * défaire lui-même.
     *
     * opts (facultatif) :
     *   par    qui migre (« fiche », « import », « archive 2.4.1 »…). SANS lui,
     *          rien n'est inscrit dans vHist : l'écran d'avertissement appelle
     *          appliquer() pour CALCULER les pertes avant que le joueur
     *          accepte, et un aperçu ne doit pas laisser de trace.
     *   quand  horodatage imposé (les tests en ont besoin pour comparer).
     *
     * Rend { ok, state, journal, pertes, alerte, erreur }.
     */
    function appliquer(etat, de, vers, opts) {
      opts = opts || {};
      var journal = [], pertes = [], alerte = false;
      var d = entier(de), v = entier(vers);

      function echec(msg, err) {
        return { ok: false, state: etat, journal: journal, pertes: pertes, alerte: alerte, erreur: err || new Error(msg) };
      }
      if (d === null || v === null) return echec("schémas illisibles (" + de + " -> " + vers + ")");
      if (d < SCHEMA_BASE || v < SCHEMA_BASE) return echec("schéma sous le socle " + SCHEMA_BASE);
      if (d > max() || v > max()) return echec("schéma inconnu de cette version (max " + max() + ")");
      var ch = chemin(d, v);
      if (!ch) return echec("chaîne trouée entre " + d + " et " + v);
      if (!etat || typeof etat !== "object" || Array.isArray(etat)) return echec("état absent ou pas un objet");

      var travail;
      try {
        travail = JSON.parse(JSON.stringify(etat));
      } catch (e) {
        return echec("état illisible (cycle ou valeur non sérialisable)", e);
      }

      function nettoyer() {
        // un casier vidé, puis un grenier vidé, DISPARAISSENT : sans quoi
        // l'aller-retour rendrait un état orné d'un grenier vide, et
        // l'égalité profonde du test tomberait.
        if (!travail.grenier || typeof travail.grenier !== "object") return;
        var k, vide = true;
        for (k in travail.grenier) {
          if (!aClef(travail.grenier, k)) continue;
          var c = travail.grenier[k];
          if (c && typeof c === "object" && !Object.keys(c).length) delete travail.grenier[k];
          else vide = false;
        }
        if (vide) delete travail.grenier;
      }

      function contexte(p, sens) {
        var casier = String(p.schema);
        var sensTxt = sens > 0 ? "montee" : "descente";
        function log(txt) { journal.push({ schema: p.schema, sens: sensTxt, txt: String(txt) }); }
        return {
          schema: p.schema,
          log: log,
          perte: function (quoi, pourquoi) {
            pertes.push({ schema: p.schema, sens: sensTxt, quoi: String(quoi), pourquoi: String(pourquoi == null ? "" : pourquoi) });
            log("perte : " + quoi);
          },
          // Le casier porte le numéro du pas : monter et descendre du MÊME pas
          // partagent donc le même, ce qui rend l'aller-retour exact.
          grenier: function (cle, valeur) {
            var copieVal;
            try {
              copieVal = valeur === undefined ? null : JSON.parse(JSON.stringify(valeur));
            } catch (e) {
              pertes.push({ schema: p.schema, sens: sensTxt, quoi: String(cle), pourquoi: "valeur non sérialisable" });
              log("grenier refusé (" + cle + ") : valeur non sérialisable");
              return false;
            }
            if (!travail.grenier || typeof travail.grenier !== "object" || Array.isArray(travail.grenier)) travail.grenier = {};
            if (!travail.grenier[casier] || typeof travail.grenier[casier] !== "object") travail.grenier[casier] = {};
            var g = travail.grenier[casier];
            var avait = aClef(g, cle), avant = g[cle];
            g[cle] = copieVal;
            var taille = octets(JSON.stringify(travail.grenier));
            if (taille > GRENIER_MAX) {
              // un état trop gros ne rentre plus dans un Attribute Roll20 :
              // mieux vaut perdre le détail, en le disant, que la fiche.
              if (avait) g[cle] = avant; else delete g[cle];
              nettoyer();
              alerte = true;   // un grenier plein mérite au moins l'alerte du grenier chargé
              pertes.push({ schema: p.schema, sens: sensTxt, quoi: String(cle), pourquoi: "grenier plein (" + GRENIER_MAX + " octets)" });
              log("grenier plein : « " + cle + " » n'a pas été rangé");
              return false;
            }
            if (taille > GRENIER_ALERTE) {
              alerte = true;
              log("grenier chargé : " + taille + " octets");
            }
            return true;
          },
          reprendre: function (cle) {
            var g = travail.grenier && travail.grenier[casier];
            if (!g || !aClef(g, cle)) return undefined;
            var val = g[cle];
            delete g[cle];
            nettoyer();
            return val;
          }
        };
      }

      var i;
      for (i = 0; i < ch.length; i++) {
        var p = ch[i].pas, sens = ch[i].sens;
        try {
          if (sens > 0) p.monter(travail, contexte(p, sens));
          else p.descendre(travail, contexte(p, sens));
        } catch (e) {
          journal.push({
            schema: p.schema,
            sens: sens > 0 ? "montee" : "descente",
            txt: "échec : " + (e && e.message ? e.message : String(e))
          });
          return echec("pas " + p.schema + " en échec", e);
        }
      }

      travail.v = v;
      if (opts.par) {
        // journal de bord de la fiche : seulement quand la migration est
        // VALIDÉE (l'aperçu de l'écran d'avertissement n'a pas de « par »).
        if (!Array.isArray(travail.vHist)) travail.vHist = [];
        travail.vHist.push({
          de: d, vers: v,
          quand: opts.quand || new Date().toISOString(),
          par: String(opts.par)
        });
        if (travail.vHist.length > VHIST_MAX) travail.vHist = travail.vHist.slice(-VHIST_MAX);
      }

      return { ok: true, state: travail, journal: journal, pertes: pertes, alerte: alerte, erreur: null };
    }

    var api = {
      SCHEMA_BASE: SCHEMA_BASE,
      GRENIER_MAX: GRENIER_MAX,
      GRENIER_ALERTE: GRENIER_ALERTE,
      VHIST_MAX: VHIST_MAX,
      IRREVERSIBLE: Irreversible,
      ajouter: ajouter,
      appliquer: appliquer,
      resume: resume,
      verifier: verifier,
      pas: pas,
      max: max,
      octets: octets,
      creer: Registre
    };
    return api;
  }

  var MiaMigr = Registre();

  /* ------------------------------------------------------------------
   * LA CHAÎNE PUBLIÉE
   *
   * Socle : schéma 1. Un pas doit porter monter() ET descendre() (ou lever
   * MiaMigr.IRREVERSIBLE), et la chaîne doit rester CONTIGUË : sans pas vers
   * le schéma n, appliquer(n-1, n) refuse de partir. SCHEMA du bundle
   * (src/fiche/socle/020-version.js) et « schema » du manifeste montent avec
   * le dernier pas écrit ici ; scripts/verif_versions.py refuse le contraire.
   * ------------------------------------------------------------------ */

  // ---------- 1 → 2 : les huit leviers deviennent une seule table ----------
  // CE QUI CHANGE DE FORME, ET RIEN D'AUTRE. Huit tables à plat, une par
  // réglage, devenaient ingérables : chaque levier gagnait une chaîne à sept
  // boîtes (un forçage, quatre ajouts, deux facteurs), soit trente-cinq tables
  // à recopier à la main dans trois fichiers que rien ne contrôle. Elles se
  // rangent dans state.caracsLeviers, à deux niveaux : le levier, puis la
  // boîte.
  //
  // LA CORRESPONDANCE N'EST PAS MÉCANIQUE, et c'est le seul endroit où il faut
  // réfléchir : sept des huit anciennes clés étaient des DÉCALAGES ou des
  // FORÇAGES, mais caracsEcart, lui, était une VALEUR — « l'écart doit être de
  // 30 ». Rangé en « a1 » il donnerait 80 à qui avait réglé 30 ; il va donc en
  // « force », qui est exactement ce qu'il a toujours été.
  var LEV_1_2 = [
    ["caracsPlafondForce", "plafond", "force"],
    ["caracsPlafondMod",   "plafond", "a1"],
    ["caracsXpForce",      "xp",      "force"],
    ["caracsXpMod",        "xp",      "a1"],
    ["caracsXpMod2",       "xp",      "a2"],
    ["caracsModMod",       "mod",     "a1"],
    ["caracsLimMod",       "lim",     "a1"],
    ["caracsEcart",        "ecart",   "force"]
  ];
  // UN PAS NE TOUCHE QUE CE QUI CHANGE DE FORME. La 1.9 a laissé un fantôme
  // (caracsEcartMod, retiré du calcul sans pas ni schéma) qui traîne encore
  // chez de vieux personnages : il n'est PAS de ce chantier. Un pas qui
  // supprimerait au passage une clé dont il n'a pas la charge ferait
  // disparaître une donnée que personne ne lui a confiée — et l'aller-retour
  // cesserait d'être exact dès qu'un état la porte des deux côtés.

  function estTable(v) {
    return v && typeof v === "object" && !Array.isArray(v);
  }

  MiaMigr.ajouter({
    schema: 2,
    titre: "Les leviers des caractéristiques en une seule table",
    notes: "Les huit réglages du meneur (plafond, modificateur, limite, écart, "
         + "coût en xp) se rangent dans une table unique, où chacun gagne une "
         + "chaîne : une valeur imposée, deux ajouts, deux facteurs, deux "
         + "ajouts. Aucun chiffre ne change.",
    monter: function (s, ctx) {
      // ON NE FABRIQUE RIEN QUI N'EXISTAIT PAS. Une table vide écrite ici, ou
      // une clé neuve posée d'office, casse l'aller-retour : le test de
      // publication compare les deux états à l'octet. On retient donc ce qui
      // était LÀ, et la descente le remettra tel quel — ni plus, ni moins.
      var avaitLeviers = Object.prototype.hasOwnProperty.call(s, "caracsLeviers");
      var presentes = [];
      // ON FUSIONNE, ON N'ÉCRASE PAS. Un état peut arriver ici avec un
      // caracsLeviers DÉJÀ rempli : le pont Roll20 repose les anciennes clés à
      // la racine d'un état reconstruit qui porte déjà la table neuve (chemin
      // de repli, mia_state vidé). Écraser perdrait ce qui vient d'être lu.
      var lv = estTable(s.caracsLeviers) ? s.caracsLeviers : {};
      // CE QUE LA DESCENTE AVAIT MIS DE CÔTÉ. Le schéma 1 ne sait porter ni le
      // second ajout, ni les facteurs, ni les ajouts de fin : ils l'attendent
      // au grenier. Sans cette reprise, un aller-retour les effacerait.
      var garde = ctx.reprendre("caracsLeviers");
      // QUI REVIENT NE RANGE RIEN. Le grenier sert au sens où l'on va : la
      // montée y laisse la forme du schéma 1, la descente celle du schéma 2.
      // Trouver quelque chose à reprendre, c'est refaire le chemin en sens
      // inverse — et y laisser une note de plus rendrait l'aller-retour inexact.
      var avaitStore = ctx.reprendre("avaitLeviers") === true;
      var revient = garde !== undefined || avaitStore;
      if (estTable(garde)) {
        Object.keys(garde).forEach(function (nom) {
          if (!estTable(garde[nom])) return;
          if (!lv[nom]) lv[nom] = {};
          Object.keys(garde[nom]).forEach(function (boite) {
            if (lv[nom][boite] === undefined) lv[nom][boite] = garde[nom][boite];
          });
        });
      }
      LEV_1_2.forEach(function (d) {
        var src = s[d[0]];
        if (Object.prototype.hasOwnProperty.call(s, d[0])) presentes.push(d[0]);
        delete s[d[0]];
        if (!estTable(src)) return;
        Object.keys(src).forEach(function (c) {
          var v = src[c];
          if (typeof v !== "number" || !isFinite(v)) return;
          // UN AJOUT DE ZÉRO NE PASSE PAS. Le schéma 1 gardait un zéro
          // explicite dans ses tables de modificateurs — une case tapée puis
          // vidée — et il n'y faisait rien. Transporté ici, il ferait d'une
          // boîte vide une boîte RÉGLÉE, et la fiche marquerait le levier
          // comme retouché sans que rien le soit.
          if (v === 0 && d[2] !== "force") return;
          if (!lv[d[1]]) lv[d[1]] = {};
          if (!lv[d[1]][d[2]]) lv[d[1]][d[2]] = {};
          // ce qui est déjà là a été écrit par la version d'arrivée : il gagne
          if (lv[d[1]][d[2]][c] === undefined) lv[d[1]][d[2]][c] = v;
        });
      });
      if (presentes.length && !revient) ctx.grenier("clesPresentes", presentes);
      if (Object.keys(lv).length || avaitLeviers || avaitStore) s.caracsLeviers = lv;
      else delete s.caracsLeviers;
      return s;
    },
    descendre: function (s, ctx) {
      var lv = estTable(s.caracsLeviers) ? s.caracsLeviers : {};
      // LA LISTE DES CLÉS QUI ÉTAIENT LÀ, si la montée l'a rangée. Sans elle —
      // une descente qui part d'un état natif du schéma 2 — on remet celles qui
      // portent quelque chose, et rien de plus : une table vide de plus serait
      // une différence de plus.
      var reprises = ctx.reprendre("clesPresentes");
      var liste = Array.isArray(reprises) ? reprises : null;
      // MÊME RÈGLE QU'EN MONTÉE : celui qui REVIENT ne range rien. « liste »
      // n'existe que si une montée l'a laissée.
      if (!liste && Object.prototype.hasOwnProperty.call(s, "caracsLeviers")) ctx.grenier("avaitLeviers", true);
      LEV_1_2.forEach(function (d) {
        var boite = lv[d[1]] && lv[d[1]][d[2]];
        var plein = estTable(boite) && Object.keys(boite).length > 0;
        // ON ÉCRIT, ON N'EFFACE PAS. Une descente ne pose que ce qu'elle a de
        // quoi poser : effacer une clé qu'on n'a pas produite reviendrait à
        // jeter ce qu'un état porte encore pour une raison qu'on ignore.
        if (plein || (liste && liste.indexOf(d[0]) >= 0)) s[d[0]] = estTable(boite) ? boite : {};
      });
      // LES CINQ BOÎTES QUE LE SCHÉMA 1 NE SAIT PAS PORTER. Le second ajout, les
      // deux facteurs et les deux ajouts de fin n'ont aucun logement là-bas :
      // ils vont au grenier, d'où la montée suivante les reprendra. Sans cela,
      // un aller-retour effacerait en silence ce que le meneur a réglé.
      var reste = {};
      Object.keys(lv).forEach(function (nom) {
        Object.keys(lv[nom] || {}).forEach(function (boite) {
          var garde = false;
          LEV_1_2.forEach(function (d) { if (d[1] === nom && d[2] === boite) garde = true; });
          if (garde) return;
          if (!reste[nom]) reste[nom] = {};
          reste[nom][boite] = lv[nom][boite];
        });
      });
      if (Object.keys(reste).length) ctx.grenier("caracsLeviers", reste);
      delete s.caracsLeviers;
      return s;
    }
  });

  // ---------- 2 → 3 : les compétences et les spécialités prennent la chaîne ----------
  // MÊME GESTE QU'AU PAS PRÉCÉDENT, sur deux familles à la fois. Les six tables
  // à plat des compétences se rangent dans state.compsLeviers (levier, boîte,
  // sigle) ; les quatre champs d'une spécialité se rangent SUR ELLE, dans
  // spe.leviers — sans niveau de sigle, parce qu'une spécialité n'a pour
  // identité que son rang dans une liste qui se réordonne.
  //
  // LA CORRESPONDANCE EST MÉCANIQUE, et c'est la différence avec le pas
  // précédent : aucune des dix clés n'est une valeur déguisée en décalage.
  // compsForce est déjà un forçage de total, compsMod un décalage, spe.force et
  // spe.xpForce des forçages.
  var LEV_2_3 = [
    ["compsForce",   "valeur", "force"],
    ["compsMod",     "valeur", "a1"],
    ["compsMod2",    "valeur", "a2"],
    ["compsXpForce", "xp",     "force"],
    ["compsXpMod",   "xp",     "a1"],
    ["compsXpMod2",  "xp",     "a2"]
  ];
  var SPE_2_3 = [
    ["force",   "valeur", "force"],
    ["mod",     "valeur", "a1"],
    ["mod2",    "valeur", "a2"],
    ["xpForce", "xp",     "force"]
  ];
  // Les boîtes que le schéma 2 ne sait pas porter : tout ce qui n'est pas dans
  // les listes ci-dessus. Elles passent par le grenier, comme au pas précédent.
  function boiteConnue(liste, nom, boite) {
    for (var i = 0; i < liste.length; i++) {
      if (liste[i][1] === nom && liste[i][2] === boite) return true;
    }
    return false;
  }

  MiaMigr.ajouter({
    schema: 3,
    titre: "Les leviers des compétences et des spécialités",
    notes: "Les réglages du meneur sur les compétences (valeur, coût en xp) et "
         + "sur les spécialités (valeur, coût en xp) prennent la même chaîne que "
         + "les caractéristiques : une valeur imposée, deux ajouts, deux "
         + "facteurs, deux ajouts, deux facteurs. Chacune gagne au passage un "
         + "plafond et un écart réglables. Aucun chiffre ne change.",
    monter: function (s, ctx) {
      // ---- les compétences ----
      var lv = estTable(s.compsLeviers) ? s.compsLeviers : {};
      var avaitLeviers = Object.prototype.hasOwnProperty.call(s, "compsLeviers");
      var garde = ctx.reprendre("compsLeviers");
      var zerosRepris = ctx.reprendre("zerosComps");
      var avaitStore = ctx.reprendre("avaitCompsLeviers") === true;
      var revient = garde !== undefined || avaitStore || zerosRepris !== undefined;
      if (estTable(garde)) {
        Object.keys(garde).forEach(function (nom) {
          if (!estTable(garde[nom])) return;
          if (!lv[nom]) lv[nom] = {};
          Object.keys(garde[nom]).forEach(function (boite) {
            if (lv[nom][boite] === undefined) lv[nom][boite] = garde[nom][boite];
          });
        });
      }
      var presentes = [], zeros = {};
      LEV_2_3.forEach(function (d) {
        var src = s[d[0]];
        if (Object.prototype.hasOwnProperty.call(s, d[0])) presentes.push(d[0]);
        delete s[d[0]];
        if (!estTable(src)) return;
        Object.keys(src).forEach(function (c) {
          var v = src[c];
          if (typeof v !== "number" || !isFinite(v)) return;
          // UN AJOUT DE ZÉRO NE PASSE PAS — il ne faisait rien là-bas et ferait
          // d'une boîte vide une boîte RÉGLÉE ici. MAIS IL SE RANGE, lui, au
          // lieu d'être jeté : le pas précédent le jetait, et l'aller-retour
          // rendait alors une table vide là où il y avait un zéro.
          if (v === 0 && d[2] !== "force") {
            if (!zeros[d[0]]) zeros[d[0]] = [];
            zeros[d[0]].push(c);
            return;
          }
          if (!lv[d[1]]) lv[d[1]] = {};
          if (!lv[d[1]][d[2]]) lv[d[1]][d[2]] = {};
          if (lv[d[1]][d[2]][c] === undefined) lv[d[1]][d[2]][c] = v;
        });
      });
      if (!revient) {
        if (presentes.length) ctx.grenier("clesComps", presentes);
        if (Object.keys(zeros).length) ctx.grenier("zerosComps", zeros);
      } else if (estTable(zerosRepris)) {
        // on redescend ce qu'on avait rangé : les zéros retournent d'où ils
        // viennent, sinon la descente suivante ne saurait plus les reposer
        Object.keys(zerosRepris).forEach(function (k) {
          if (!estTable(s[k]) && !Array.isArray(zerosRepris[k])) return;
          if (!estTable(s[k])) s[k] = {};
          zerosRepris[k].forEach(function (c) { s[k][c] = 0; });
        });
      }
      if (Object.keys(lv).length || avaitLeviers || avaitStore) s.compsLeviers = lv;
      else delete s.compsLeviers;

      // ---- les spécialités ----
      // LE GRENIER EST POSITIONNEL, et il n'y a pas d'autre choix : une
      // spécialité n'a ni clé ni nom fiable. On range donc un tableau PARALLÈLE
      // à state.specialites, et l'on refuse de l'appliquer si la longueur a
      // changé entre-temps — en le DISANT.
      var repriseSpes = ctx.reprendre("spes");
      var spes = Array.isArray(s.specialites) ? s.specialites : [];
      // note : « cles » dit quels champs étaient PRÉSENTS sur l'objet au moment
      // de la montée — c'est ce qui rend l'aller-retour exact même quand
      // « mod » valait zéro, puisqu'un zéro ne se transporte pas.
      var gardeSpes = Array.isArray(repriseSpes) && repriseSpes.length === spes.length;
      if (repriseSpes !== undefined && !gardeSpes) {
        ctx.perte("leviers de spécialités",
                  "la liste a changé de longueur pendant la descente");
      }
      var etatSpes = [];
      spes.forEach(function (sp, i) {
        if (!estTable(sp)) { etatSpes.push(null); return; }
        var l = estTable(sp.leviers) ? sp.leviers : {};
        var cles = [];
        SPE_2_3.forEach(function (d) {
          var v = sp[d[0]];
          if (Object.prototype.hasOwnProperty.call(sp, d[0])) cles.push(d[0]);
          delete sp[d[0]];
          // « null » n'est PAS un levier : c'est l'absence de forçage, telle que
          // le schéma 2 l'écrivait.
          if (typeof v !== "number" || !isFinite(v)) return;
          if (v === 0 && d[2] !== "force") return;
          if (!l[d[1]]) l[d[1]] = {};
          if (l[d[1]][d[2]] === undefined) l[d[1]][d[2]] = v;
        });
        var repris = gardeSpes ? repriseSpes[i] : null;
        if (estTable(repris) && estTable(repris.reste)) {
          Object.keys(repris.reste).forEach(function (nom) {
            if (!estTable(repris.reste[nom])) return;
            if (!l[nom]) l[nom] = {};
            Object.keys(repris.reste[nom]).forEach(function (boite) {
              if (l[nom][boite] === undefined) l[nom][boite] = repris.reste[nom][boite];
            });
          });
        }
        if (Object.keys(l).length) sp.leviers = l;
        else delete sp.leviers;
        etatSpes.push(cles.length ? { cles: cles } : null);
      });
      var utile = false;
      etatSpes.forEach(function (x) { if (x) utile = true; });
      if (!revient && repriseSpes === undefined && utile) ctx.grenier("spes", etatSpes);
      return s;
    },
    descendre: function (s, ctx) {
      // ---- les compétences ----
      var lv = estTable(s.compsLeviers) ? s.compsLeviers : {};
      var reprises = ctx.reprendre("clesComps");
      var liste = Array.isArray(reprises) ? reprises : null;
      var zeros = ctx.reprendre("zerosComps");
      if (!liste) {
        if (Object.prototype.hasOwnProperty.call(s, "compsLeviers")) {
          ctx.grenier("avaitCompsLeviers", true);
        }
      }
      LEV_2_3.forEach(function (d) {
        var boite = lv[d[1]] && lv[d[1]][d[2]];
        var plein = estTable(boite) && Object.keys(boite).length > 0;
        // ON ÉCRIT, ON N'EFFACE PAS : une clé qu'on n'a pas produite reste.
        if (plein || (liste && liste.indexOf(d[0]) >= 0)) {
          s[d[0]] = estTable(boite) ? JSON.parse(JSON.stringify(boite)) : {};
        }
      });
      if (estTable(zeros)) {
        Object.keys(zeros).forEach(function (k) {
          if (!Array.isArray(zeros[k])) return;
          if (!estTable(s[k])) s[k] = {};
          zeros[k].forEach(function (c) { s[k][c] = 0; });
        });
      }
      var reste = {};
      Object.keys(lv).forEach(function (nom) {
        Object.keys(lv[nom] || {}).forEach(function (boite) {
          if (boiteConnue(LEV_2_3, nom, boite)) return;
          if (!reste[nom]) reste[nom] = {};
          reste[nom][boite] = lv[nom][boite];
        });
      });
      if (!liste && Object.keys(reste).length) ctx.grenier("compsLeviers", reste);
      delete s.compsLeviers;

      // ---- les spécialités ----
      var spes = Array.isArray(s.specialites) ? s.specialites : [];
      var repriseSpes = ctx.reprendre("spes");
      var gardeSpes = Array.isArray(repriseSpes) && repriseSpes.length === spes.length;
      var etat = [], garde = false;
      spes.forEach(function (sp, iSpe) {
        if (!estTable(sp)) { etat.push(null); return; }
        var l = estTable(sp.leviers) ? sp.leviers : {};
        var resteSpe = {};
        var repris = gardeSpes && estTable(repriseSpes[iSpe]) ? repriseSpes[iSpe] : null;
        var avaient = repris && Array.isArray(repris.cles) ? repris.cles : null;
        SPE_2_3.forEach(function (d) {
          var v = l[d[1]] && l[d[1]][d[2]];
          if (typeof v === "number" && isFinite(v)) { sp[d[0]] = v; return; }
          // le champ était là, vide : on le repose tel que le schéma 2
          // l'écrivait — zéro pour un décalage, null pour un forçage
          if (avaient && avaient.indexOf(d[0]) >= 0) {
            sp[d[0]] = (d[2] === "force") ? null : 0;
          }
        });
        Object.keys(l).forEach(function (nom) {
          Object.keys(l[nom] || {}).forEach(function (boite) {
            if (boiteConnue(SPE_2_3, nom, boite)) return;
            if (!resteSpe[nom]) resteSpe[nom] = {};
            resteSpe[nom][boite] = l[nom][boite];
          });
        });
        delete sp.leviers;
        if (Object.keys(resteSpe).length) { etat.push({ reste: resteSpe }); garde = true; }
        else etat.push(null);
      });
      if (!liste && garde) ctx.grenier("spes", etat);
      return s;
    }
  });


  // ==================== SCHÉMA 4 ====================
  // LE LEVIER « VALEUR » DES COMPÉTENCES SE COUPE EN DEUX, parce que son sens
  // change. Il partait, au schéma 3, d'une base DÉJÀ coiffée par le plafond et
  // DÉJÀ bonifiée, et son résultat n'était re-coiffé par rien :
  //
  //     schéma 3   compPts = chaîne(min(points, plafond) + bonus)
  //     schéma 4   compPts = min(chaîne(points), plafond) + chaîne(bonus)
  //
  // Les huit boîtes de calcul agissaient donc sur le TOUT, coiffe et bonus
  // compris : leur place au schéma 4 est la chaîne du BONUS, la seule qui
  // s'applique encore après la coiffe. Un ajout y garde son effet À L'UNITÉ
  // PRÈS — min + bonus + 10 est exactement min + (bonus + 10).
  //
  // LE FORÇAGE, LUI, RESTE À LA VALEUR : il disait « cette compétence vaut F »,
  // et c'est encore ce qu'il dit. Ce qui change, et le journal le dit, c'est
  // qu'il est maintenant COIFFÉ comme le reste — « même modifiée, la valeur ne
  // dépasse pas le plafond ». Pour passer outre, on lève le plafond.
  //
  // UN FACTEUR CHANGE D'EFFET, et il n'y a pas de transport exact : ×2 sur
  // (coiffe + bonus) n'est pas ×2 sur le bonus seul. C'est dit au journal.
  //
  // LES TROIS LEVIERS NEUFS VONT AU GRENIER EN DESCENDANT — « valeur » et
  // « bonus » d'une caractéristique, « bonus » d'une spécialité. Les laisser en
  // place, au nom de « descendre écrit mais n'efface pas », ne les protégeait
  // de rien : la normalisation du schéma 3 RECONSTRUIT ces tables en bouclant
  // sur son catalogue de bornes, où ces trois noms n'existent pas. Elle les
  // jetait donc au premier rangement, et la remontée ne les retrouvait nulle
  // part. Ranger une donnée dans une structure qu'on sait reconstruite revient
  // à ne pas la ranger du tout.
  //
  // LE GRENIER DES SPÉCIALITÉS EST POSITIONNEL, faute de clé stable — même
  // raison qu'au pas précédent, et même garde de longueur.
  //
  // ATTENTION À CE QU'UNE BOÎTE CONTIENT ICI : pour une COMPÉTENCE, ce n'est pas
  // un nombre mais une TABLE de sigles — { PHY: 90, COM: -10 }. La table à trois
  // niveaux est levier → boîte → sigle, et c'est le deuxième niveau qu'on
  // déplace. Une seule boîte non vide suffit à faire exister le levier.
  var BOITES_CALCUL = ["a1", "a2", "a3", "a4", "m1", "m2", "m3", "m4"];
  function copieBoites(src, filtre) {
    var out = {};
    if (!estTable(src)) return out;
    Object.keys(src).forEach(function (b) {
      if (!filtre(b)) return;
      var v = src[b];
      if (!estTable(v) || !Object.keys(v).length) return;
      out[b] = JSON.parse(JSON.stringify(v));
    });
    return out;
  }
  function estCalcul(b) { return BOITES_CALCUL.indexOf(b) >= 0; }
  function estForce(b) { return b === "force"; }

  MiaMigr.ajouter({
    schema: 4,
    titre: "La valeur, le plafond, le bonus",
    notes: "Une valeur MÊME MODIFIÉE ne dépasse plus son plafond, et le bonus "
         + "s'ajoute après. Les caractéristiques, les compétences et les "
         + "spécialités gagnent au passage un levier de valeur et un levier de "
         + "bonus. Sur une compétence dont le meneur avait réglé la valeur, les "
         + "ajouts et les facteurs passent au bonus — un ajout garde son effet "
         + "exact, un facteur change ; une valeur FORCÉE reste une valeur "
         + "forcée, mais le plafond la coiffe désormais.",
    monter: function (s, ctx) {
      var reprise = ctx.reprendre("comps4");
      var revient = reprise !== undefined;
      var lv = estTable(s.compsLeviers) ? s.compsLeviers : null;
      if (lv) {
        var v = estTable(lv.valeur) ? lv.valeur : null;
        if (v) {
          var am = copieBoites(v, estCalcul);
          var f = copieBoites(v, estForce);
          if (Object.keys(am).length) {
            if (!estTable(lv.bonus)) lv.bonus = {};
            Object.keys(am).forEach(function (b) {
              // ON FUSIONNE AU SIGLE PRÈS, et non à la boîte : une boîte porte
              // une TABLE, et deux compétences différentes y tiennent sans se
              // gêner. Écraser la boîte entière perdrait la voisine.
              //
              // LE CAS NE PEUT PAS VENIR D'UN ÉTAT RANGÉ : au schéma 3, « bonus »
              // n'est pas un nom de levier connu, donc la normalisation l'a
              // déjà jeté. Il ne reste que le JSON écrit à la main, et on ne
              // veut pas qu'il perde quelque chose sans un mot.
              if (!estTable(lv.bonus[b])) { lv.bonus[b] = am[b]; return; }
              Object.keys(am[b]).forEach(function (code) {
                if (lv.bonus[b][code] === undefined) lv.bonus[b][code] = am[b][code];
                else ctx.perte("levier de bonus « " + b + " » de la compétence " + code,
                               "la case était déjà remplie");
              });
            });
            var mult = false;
            Object.keys(am).forEach(function (b) { if (b.charAt(0) === "m") mult = true; });
            if (mult) ctx.log("un facteur du levier de valeur d'une compétence " +
                              "portait sur le total bonus compris ; il ne porte " +
                              "plus que sur le bonus");
          }
          if (Object.keys(f).length) {
            lv.valeur = f;
            // DEUX CHANGEMENTS, PAS UN. Au schéma 3, le forçage remplaçait le
            // TOUT, bonus compris ; il ne remplace plus que la valeur, et le
            // bonus de la Fiche s'y ajoute par-dessus.
            ctx.log("une valeur de compétence forcée par le meneur est " +
                    "désormais coiffée par son plafond, et le bonus de la " +
                    "Fiche s'y ajoute au lieu d'être remplacé");
          } else {
            delete lv.valeur;
          }
        }
      }
      if (revient && estTable(reprise)) {
        if (!estTable(s.compsLeviers)) s.compsLeviers = {};
        var lv2 = s.compsLeviers;
        if (estTable(reprise.valeurAM)) {
          if (!estTable(lv2.valeur)) lv2.valeur = {};
          Object.keys(reprise.valeurAM).forEach(function (b) {
            if (lv2.valeur[b] === undefined) lv2.valeur[b] = reprise.valeurAM[b];
          });
        }
        if (estTable(reprise.bonusForce) && Object.keys(reprise.bonusForce).length) {
          if (!estTable(lv2.bonus)) lv2.bonus = {};
          if (lv2.bonus.force === undefined) {
            lv2.bonus.force = JSON.parse(JSON.stringify(reprise.bonusForce));
          }
        }
      }
      // ---- les trois leviers neufs, repris du grenier ----
      if (revient && estTable(reprise)) {
        ["valeur", "bonus"].forEach(function (nom) {
          var g = reprise["carac_" + nom];
          if (!estTable(g)) return;
          if (!estTable(s.caracsLeviers)) s.caracsLeviers = {};
          if (s.caracsLeviers[nom] === undefined) {
            s.caracsLeviers[nom] = JSON.parse(JSON.stringify(g));
          }
        });
        var spes = Array.isArray(s.specialites) ? s.specialites : [];
        var repSpes = reprise.spesBonus;
        if (Array.isArray(repSpes)) {
          if (repSpes.length !== spes.length) {
            ctx.perte("leviers de bonus des spécialités",
                      "la liste a changé de longueur pendant la descente");
          } else {
            spes.forEach(function (sp, i) {
              if (!estTable(sp) || !estTable(repSpes[i])) return;
              if (!estTable(sp.leviers)) sp.leviers = {};
              if (sp.leviers.bonus === undefined) {
                sp.leviers.bonus = JSON.parse(JSON.stringify(repSpes[i]));
              }
            });
          }
        }
      }
      return s;
    },
    descendre: function (s, ctx) {
      // ON NE SORT PAS TÔT SUR L'ABSENCE DE compsLeviers : les trois leviers
      // neufs à ranger vivent ailleurs, et un personnage peut n'avoir réglé
      // qu'eux.
      var lv = estTable(s.compsLeviers) ? s.compsLeviers : {};
      var v = estTable(lv.valeur) ? lv.valeur : {};
      var b = estTable(lv.bonus) ? lv.bonus : {};
      // CE QUI N'A AUCUNE PLACE AU SCHÉMA 3 : les huit boîtes de calcul de la
      // valeur (là-bas, elles portaient sur le tout) et le forçage du bonus (il
      // n'existait pas). Elles montent au grenier ; tout le reste se reconstruit.
      var garde = {};
      // LES TROIS LEVIERS NEUFS : la normalisation du schéma 3 les reconstruit
      // sans eux, donc les laisser en place serait les perdre. La table des
      // caractéristiques, elle, reste (même vide) : normalize la repose de
      // toute façon, et l'aller-retour est alors exact.
      var lvC = estTable(s.caracsLeviers) ? s.caracsLeviers : null;
      if (lvC) {
        ["valeur", "bonus"].forEach(function (nom) {
          if (!estTable(lvC[nom])) return;
          garde["carac_" + nom] = JSON.parse(JSON.stringify(lvC[nom]));
          delete lvC[nom];
        });
      }
      var spesD = Array.isArray(s.specialites) ? s.specialites : [];
      var listeSpes = [], utileSpes = false;
      spesD.forEach(function (sp) {
        if (estTable(sp) && estTable(sp.leviers) && estTable(sp.leviers.bonus)) {
          listeSpes.push(JSON.parse(JSON.stringify(sp.leviers.bonus)));
          utileSpes = true;
          delete sp.leviers.bonus;
          if (!Object.keys(sp.leviers).length) delete sp.leviers;
        } else {
          listeSpes.push(null);
        }
      });
      if (utileSpes) garde.spesBonus = listeSpes;
      var vAM = copieBoites(v, estCalcul);
      if (Object.keys(vAM).length) garde.valeurAM = vAM;
      var bF = copieBoites(b, estForce);
      if (bF.force !== undefined) garde.bonusForce = bF.force;
      if (Object.keys(garde).length) ctx.grenier("comps4", garde);
      // LA VALEUR DU SCHÉMA 3 SE REFAIT : le forçage de la valeur, plus les
      // huit boîtes du bonus, qui en venaient.
      var nv = copieBoites(v, estForce);
      var bAM = copieBoites(b, estCalcul);
      Object.keys(bAM).forEach(function (k) { if (nv[k] === undefined) nv[k] = bAM[k]; });
      if (Object.keys(nv).length) lv.valeur = nv;
      else delete lv.valeur;
      delete lv.bonus;
      return s;
    }
  });


  // ==================== SCHÉMA 5 ====================
  // LE MAXIMUM DE PV PREND LA CHAÎNE, comme tout le reste de la fiche. Il se
  // réglait sur la Fiche même, avec une valeur forcée et TROIS modificateurs
  // rangés dans « divers » — le dernier survivant d'un patron que les schémas 2
  // et 3 ont retiré partout ailleurs.
  //
  //     pvMaxOverride        ->  reservesLeviers.pvMax.force
  //     divers.pvMax[0,1,2]  ->  reservesLeviers.pvMax.a1, a2, a3
  //
  // LA CORRESPONDANCE EST EXACTE ET LES CHIFFRES NE BOUGENT PAS : les trois
  // modificateurs s'additionnaient à la base, et a1 + a2 + a3 s'y additionnent
  // de la même façon, avant les facteurs — qui valent un tant que personne n'y
  // touche. Un maximum forcé reste forcé.
  //
  // « divers.pvMax » RESTE UN TABLEAU DE TROIS À TOUS LES SCHÉMAS : la
  // normalisation le reconstruit ainsi. C'est pourquoi la descente y repose des
  // ZÉROS plutôt que d'effacer la clé, et pourquoi la montée n'en garde aucun.
  var PV_4_5 = [["a1", 0], ["a2", 1], ["a3", 2]];

  MiaMigr.ajouter({
    schema: 5,
    titre: "Le maximum de PV",
    notes: "Le maximum de points de vie se règle désormais dans l'onglet "
         + "Options, avec la même chaîne que les caractéristiques : une valeur "
         + "imposée, deux ajouts, deux facteurs, deux ajouts, deux facteurs. La "
         + "valeur forcée et les trois modificateurs qui vivaient sur la Fiche "
         + "y entrent tels quels. Aucun chiffre ne change.",
    monter: function (s, ctx) {
      var reprise = ctx.reprendre("pv5");
      // ET CE QUE LA DESCENTE AVAIT MIS DE CÔTÉ. Le ranger sans le reprendre
      // laissait le casier derrière soi, et l'aller-retour cessait d'être exact
      // — le grenier est à usage unique, qui y met doit y revenir.
      var reste = ctx.reprendre("pv5reste");
      var lv = estTable(s.reservesLeviers) ? s.reservesLeviers : {};
      var max = estTable(lv.pvMax) ? lv.pvMax : {};
      if (estTable(reste)) {
        Object.keys(reste).forEach(function (k) {
          if (max[k] === undefined) max[k] = reste[k];
        });
      }

      // le forçage
      if (typeof s.pvMaxOverride === "number" && isFinite(s.pvMaxOverride)) {
        if (max.force === undefined) max.force = s.pvMaxOverride;
      }
      var avaitForce = Object.prototype.hasOwnProperty.call(s, "pvMaxOverride");
      delete s.pvMaxOverride;

      // les trois modificateurs
      var d = estTable(s.divers) ? s.divers : null;
      var tab = d && Array.isArray(d.pvMax) ? d.pvMax : null;
      var avaitTab = !!tab;
      if (tab) {
        PV_4_5.forEach(function (p) {
          var v = tab[p[1]];
          if (typeof v !== "number" || !isFinite(v) || v === 0) return;
          // UN AJOUT DE ZÉRO NE PASSE PAS : il ne faisait rien là-bas et ferait
          // d'une boîte vide une boîte RÉGLÉE ici.
          if (max[p[0]] === undefined) max[p[0]] = v;
        });
        delete d.pvMax;
      }

      if (Object.keys(max).length) lv.pvMax = max;
      if (Object.keys(lv).length || Object.prototype.hasOwnProperty.call(s, "reservesLeviers")) {
        s.reservesLeviers = lv;
      }
      // QUI REVIENT NE RANGE RIEN : la descente a laissé de quoi se reconnaître.
      if (reprise === undefined) {
        var etat = {};
        if (avaitForce) etat.force = true;
        if (avaitTab) etat.tab = true;
        if (Object.keys(etat).length) ctx.grenier("pv5", etat);
      } else if (estTable(reprise) && reprise.avaitTable &&
                 !Object.prototype.hasOwnProperty.call(s, "reservesLeviers")) {
        // la table existait avant la descente, VIDE : on la repose telle quelle
        s.reservesLeviers = {};
      }
      return s;
    },
    descendre: function (s, ctx) {
      var repris = ctx.reprendre("pv5");
      var avaitTable = Object.prototype.hasOwnProperty.call(s, "reservesLeviers");
      var lv = estTable(s.reservesLeviers) ? s.reservesLeviers : {};
      var max = estTable(lv.pvMax) ? lv.pvMax : {};

      // ON ÉCRIT, ON N'EFFACE PAS : une clé qu'on n'a pas produite reste.
      if (typeof max.force === "number" && isFinite(max.force)) s.pvMaxOverride = max.force;
      else if (estTable(repris) && repris.force) s.pvMaxOverride = null;

      var pose = false, tab = [0, 0, 0];
      PV_4_5.forEach(function (p) {
        var v = max[p[0]];
        if (typeof v === "number" && isFinite(v)) { tab[p[1]] = v; pose = true; }
      });
      if (pose || (estTable(repris) && repris.tab)) {
        if (!estTable(s.divers)) s.divers = {};
        s.divers.pvMax = tab;
      }

      // LES BOÎTES QUE LE SCHÉMA 4 NE SAIT PAS PORTER vont au grenier : les deux
      // ajouts de fin et les quatre facteurs n'avaient aucune place dans trois
      // cases et une valeur forcée.
      var reste = {};
      Object.keys(max).forEach(function (k) {
        if (k === "force" || k === "a1" || k === "a2" || k === "a3") return;
        reste[k] = max[k];
      });
      if (Object.keys(reste).length) ctx.grenier("pv5reste", reste);
      delete lv.pvMax;
      // LE SCHÉMA 4 NE CONNAÎT PAS CETTE TABLE : vidée, elle s'en va. La laisser
      // à {} rendait l'aller-retour non neutre chez qui ne l'avait jamais eue —
      // ce que les témoins voient tout de suite. Qu'elle ait existé se range au
      // grenier, pour que la remontée la repose à l'identique.
      if (Object.keys(lv).length) s.reservesLeviers = lv;
      else delete s.reservesLeviers;
      if (repris === undefined && avaitTable) ctx.grenier("pv5", { avaitTable: true });
      return s;
    }
  });

  // ---------- 5 -> 6 : le maximum d'endurance ----------
  //
  //     enduranceMaxOverride    ->  reservesLeviers.enduranceMax.force
  //     divers.endurance[0,1,2] ->  reservesLeviers.enduranceMax.a1, a2, a3
  //
  // LE MÊME PAS QUE LE 5, sur l'autre réserve. Il vient un cran plus tard
  // parce que les PV sont passés les premiers, le temps de vérifier que la
  // chaîne tenait sur une réserve avant de la donner à la seconde.
  //
  // LA CORRESPONDANCE EST EXACTE ET LES CHIFFRES NE BOUGENT PAS : les trois
  // modificateurs s'additionnaient au MOD CON, et a1 + a2 + a3 s'y additionnent
  // de la même façon, avant les facteurs — qui valent un tant que personne n'y
  // touche. Un maximum forcé reste forcé.
  //
  // « divers.endurance » RESTE UN TABLEAU DE TROIS AU SCHÉMA 5 : la
  // normalisation le reconstruisait ainsi. C'est pourquoi la descente y repose
  // des ZÉROS plutôt que d'effacer la clé, et pourquoi la montée n'en garde
  // aucun.
  var END_5_6 = [["a1", 0], ["a2", 1], ["a3", 2]];

  MiaMigr.ajouter({
    schema: 6,
    titre: "Le maximum d'endurance",
    notes: "Le maximum d'endurance se règle désormais dans l'onglet Options, "
         + "avec la même chaîne que les PV : une valeur imposée, deux ajouts, "
         + "deux facteurs, deux ajouts, deux facteurs. La valeur forcée et les "
         + "trois modificateurs qui vivaient sur la Fiche y entrent tels quels. "
         + "Aucun chiffre ne change.",
    monter: function (s, ctx) {
      var reprise = ctx.reprendre("end6");
      // ET CE QUE LA DESCENTE AVAIT MIS DE CÔTÉ : le grenier est à usage unique,
      // qui y met doit y revenir, sinon l'aller-retour cesse d'être exact.
      var reste = ctx.reprendre("end6reste");
      var lv = estTable(s.reservesLeviers) ? s.reservesLeviers : {};
      var max = estTable(lv.enduranceMax) ? lv.enduranceMax : {};
      if (estTable(reste)) {
        Object.keys(reste).forEach(function (k) {
          if (max[k] === undefined) max[k] = reste[k];
        });
      }

      // le forçage
      if (typeof s.enduranceMaxOverride === "number" && isFinite(s.enduranceMaxOverride)) {
        if (max.force === undefined) max.force = s.enduranceMaxOverride;
      }
      var avaitForce = Object.prototype.hasOwnProperty.call(s, "enduranceMaxOverride");
      delete s.enduranceMaxOverride;

      // les trois modificateurs
      var d = estTable(s.divers) ? s.divers : null;
      var tab = d && Array.isArray(d.endurance) ? d.endurance : null;
      var avaitTab = !!tab;
      if (tab) {
        END_5_6.forEach(function (p) {
          var v = tab[p[1]];
          if (typeof v !== "number" || !isFinite(v) || v === 0) return;
          // UN AJOUT DE ZÉRO NE PASSE PAS : il ne faisait rien là-bas et ferait
          // d'une boîte vide une boîte RÉGLÉE ici.
          if (max[p[0]] === undefined) max[p[0]] = v;
        });
        delete d.endurance;
      }

      if (Object.keys(max).length) lv.enduranceMax = max;
      if (Object.keys(lv).length || Object.prototype.hasOwnProperty.call(s, "reservesLeviers")) {
        s.reservesLeviers = lv;
      }
      // QUI REVIENT NE RANGE RIEN : la descente a laissé de quoi se reconnaître.
      if (reprise === undefined) {
        var etat = {};
        if (avaitForce) etat.force = true;
        if (avaitTab) etat.tab = true;
        if (Object.keys(etat).length) ctx.grenier("end6", etat);
      } else if (estTable(reprise) && reprise.avaitTable &&
                 !Object.prototype.hasOwnProperty.call(s, "reservesLeviers")) {
        // la table existait avant la descente, VIDE : on la repose telle quelle
        s.reservesLeviers = {};
      }
      return s;
    },
    descendre: function (s, ctx) {
      var repris = ctx.reprendre("end6");
      var avaitTable = Object.prototype.hasOwnProperty.call(s, "reservesLeviers");
      var lv = estTable(s.reservesLeviers) ? s.reservesLeviers : {};
      var max = estTable(lv.enduranceMax) ? lv.enduranceMax : {};

      // ON ÉCRIT, ON N'EFFACE PAS : une clé qu'on n'a pas produite reste.
      if (typeof max.force === "number" && isFinite(max.force)) s.enduranceMaxOverride = max.force;
      else if (estTable(repris) && repris.force) s.enduranceMaxOverride = null;

      var pose = false, tab = [0, 0, 0];
      END_5_6.forEach(function (p) {
        var v = max[p[0]];
        if (typeof v === "number" && isFinite(v)) { tab[p[1]] = v; pose = true; }
      });
      if (pose || (estTable(repris) && repris.tab)) {
        if (!estTable(s.divers)) s.divers = {};
        s.divers.endurance = tab;
      }

      // LES BOÎTES QUE LE SCHÉMA 5 NE SAIT PAS PORTER vont au grenier : les deux
      // ajouts de fin et les quatre facteurs n'avaient aucune place dans trois
      // cases et une valeur forcée.
      var reste = {};
      Object.keys(max).forEach(function (k) {
        if (k === "force" || k === "a1" || k === "a2" || k === "a3") return;
        reste[k] = max[k];
      });
      if (Object.keys(reste).length) ctx.grenier("end6reste", reste);
      delete lv.enduranceMax;
      // ON NE TOUCHE PAS À « pvMax » : la table est commune aux deux réserves,
      // et le pas 5 est seul juge de ce qui lui appartient. Elle ne s'en va donc
      // que si elle est VIDE — c'est-à-dire si les PV n'y ont rien posé.
      if (Object.keys(lv).length) s.reservesLeviers = lv;
      else delete s.reservesLeviers;
      if (repris === undefined && avaitTable) ctx.grenier("end6", { avaitTable: true });
      return s;
    }
  });

  global.MiaMigr = MiaMigr;
  if (typeof module === "object" && module && module.exports) module.exports = MiaMigr;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
