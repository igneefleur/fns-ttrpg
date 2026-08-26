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

  global.MiaMigr = MiaMigr;
  if (typeof module === "object" && module && module.exports) module.exports = MiaMigr;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
