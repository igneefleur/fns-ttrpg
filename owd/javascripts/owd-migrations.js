/* Moteur de migration de la fiche Outward : montée ET descente de schéma.
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
 * le navigateur (window.OwdMigr) que dans node (module.exports), pour qu'un
 * test puisse le mettre à l'épreuve sans DOM.
 *
 * IL NE FAIT QUE POSER window.OwdMigr : aucun DOM, aucune lecture d'état,
 * aucun effet de bord. C'est une obligation, pas un état de fait — l'amorce
 * le charge SEUL, hors du bundle, pour composer l'écran de version
 * (avecMigrations), et le bundle le rechargera ensuite dans sa propre série.
 * Un fichier qui ferait quoi que ce soit d'autre le ferait donc deux fois.
 *
 * Vocabulaire :
 *   schéma   numéro de structure de l'état, porté par state.v. Entier
 *            INDÉPENDANT de la release : il ne monte QUE lorsque la forme de
 *            l'état change, jamais parce que le majeur a bougé.
 *   pas      un couple monter/descendre entre deux schémas voisins, rangé
 *            sous son schéma CIBLE : le pas 3 fait 2 -> 3 en montant et
 *            3 -> 2 en descendant.
 *   grenier  ce qu'une version d'arrivée ne sait pas porter y attend le
 *            retour, plutôt que de disparaître.
 *   perte    ce qui, lui, ne reviendra pas : déclaré, pour que l'écran
 *            d'avertissement le dise AVANT que le joueur accepte.
 *
 * ------------------------------------------------------------------
 * COMMENT ON ÉCRIT UN PAS
 *
 *   OwdMigr.ajouter({
 *     schema: 2,                          // le schéma CIBLE, > SCHEMA_BASE
 *     titre:  "Armes en répertoire",      // court, affiché en tête de ligne
 *     notes:  "Chaque arme gagne …",      // l'écran de version l'affiche TEL
 *                                         // QUEL : c'est ce que le joueur lit
 *                                         // avant d'accepter
 *     monter:    function (etat, ctx) { … },
 *     descendre: function (etat, ctx) { … }
 *   });
 *
 * ajouter() REFUSE : une définition absente, un schéma cible ≤ socle, un pas
 * déjà défini, un monter ou un descendre manquant, un titre ou des notes
 * manquants. LES DEUX SENS SONT EXIGÉS : une montée sans descente
 * condamnerait toute table restée sur la version d'avant. Un pas réellement
 * irréversible lève OwdMigr.IRREVERSIBLE("raison") depuis son descendre.
 *
 * ctx offre : schema, log(txt), perte(quoi, pourquoi), grenier(cle, valeur),
 * reprendre(cle). Le casier du grenier porte le NUMÉRO DU PAS : monter et
 * descendre du même pas partagent le même casier, ce qui rend l'aller-retour
 * exact.
 *
 * LA SEULE CHOSE QU'UN AUTEUR DE PAS DOIT AVOIR EN TÊTE : normalize() (dans
 * docs/javascripts/owd-fiche.js) repasse sur l'état à chaque chargement, à
 * chaque import et à chaque relecture des Attributes Roll20 — il tourne donc
 * APRÈS toute migration. Ranger une donnée dans une structure qu'il
 * reconstruit revient à ne pas la ranger du tout, et le pas de descente qui
 * devait la rendre trouvera le vide.
 *
 * Règle pratique : un pas qui met une donnée à l'abri la range AU GRENIER
 * (racine de l'état, que normalize() complète sans jamais purger ses clés
 * inconnues) ; jamais dans une sous-structure reconstruite — ni dans un geste
 * d'arme, ni dans un rang de technique, ni dans un objet d'équipement, ni
 * dans un levier des Options.
 *
 * RELEVÉ À FAIRE, ET À TENIR À JOUR. Le fichier JJK dont ce moteur est repris
 * porte, à cet endroit, le relevé complet du normalize() de sa fiche, en deux
 * colonnes : « conservatrices » (une clé inconnue y survit, on peut y ranger)
 * et « reconstruites champ par champ » (tout le reste est jeté). Le même
 * relevé est à faire ici contre le normalize() d'Outward, le jour où le
 * premier pas s'écrit — c'est-à-dire AVANT lui, pas après. C'est un
 * commentaire vivant, pas une décoration : un relevé périmé est pire que pas
 * de relevé, puisqu'on s'y fie.
 * ------------------------------------------------------------------
 */
(function (global) {
  "use strict";

  var SCHEMA_BASE = 1;          // le parc existant : aucune fiche n'est en dessous
  var GRENIER_MAX = 64 * 1024;  // au-delà, le grenier refuse et déclare une perte
  var GRENIER_ALERTE = 32 * 1024;
  var VHIST_MAX = 10;

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
  // OwdMigr.IRREVERSIBLE("la fusion des groupes ne se défait pas") ».
  function Irreversible(raison) {
    var e = new Error(String(raison || "descente impossible"));
    e.name = "OwdIrreversible";
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
        throw new Error("migration " + s + " : descendre() manque (un pas irréversible lève OwdMigr.IRREVERSIBLE)");
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
    // Un trajet VIDE, lui — resume(1, 1) tant que la chaîne est vide — rend
    // bien [], et l'écran dit alors « seul le numéro de version change ».
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
    // rend la liste des reproches, vide si tout va bien. Sur une chaîne vide
    // (max() === SCHEMA_BASE), les deux boucles ne tournent pas et le verdict
    // est « rien à redire » — ce qui est exact : il n'y a rien à traverser.
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
     *   par    qui migre (« fiche », « import », « archive 1.2.1 »…). SANS lui,
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

  var OwdMigr = Registre();

  /* ------------------------------------------------------------------
   * LA CHAÎNE PUBLIÉE — VIDE, ET C'EST NORMAL
   *
   * Socle : schéma 1. C'est le PREMIER schéma d'Outward : la 1.0.0b est la
   * première fiche publiée, aucun état n'a jamais porté autre chose, et il n'y
   * a donc rien à traverser. Conséquences, toutes voulues :
   *   - max() vaut SCHEMA_BASE, soit 1 ;
   *   - migre() du bundle sort immédiatement (de === SCHEMA) et ne touche à
   *     rien ;
   *   - resume(1, 1) rend [], et l'écran de version dirait « seul le numéro de
   *     version change » — mais il ne paraît pas, puisque les schémas
   *     s'accordent ;
   *   - verifier() ne trouve rien à redire.
   *
   * Ce fichier existe QUAND MÊME, dès la première publication, et il doit y
   * rester : c'est lui qui rend possible le premier pas, le jour venu, et
   * l'amorce le cherche par son nom (owd-migrations) dans manifeste.bundle.js
   * pour composer l'écran de version. Le publier plus tard obligerait à le
   * faire arriver dans un parc de fiches déjà écrites, ce qui est exactement
   * la situation qu'on veut éviter.
   *
   * Le jour du premier changement de forme de l'état : monter le schéma à 2
   * dans le manifeste, dans SCHEMA du bundle et dans SCHEMA_DEFAUT de la carte
   * d'attributs, et ajouter ICI le pas 2 — les deux sens, titre et notes. La
   * chaîne doit être CONTIGUË et monter exactement jusqu'au schéma publié :
   * un cran de moins et appliquer() refuse de partir ; un cran de plus et une
   * fiche déjà migrée trouve un moteur qui la redescendrait.
   * ------------------------------------------------------------------ */

  global.OwdMigr = OwdMigr;
  if (typeof module === "object" && module && module.exports) module.exports = OwdMigr;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
