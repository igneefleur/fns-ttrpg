/* Épreuve du moteur de migration de la fiche MIA.
 *
 *   node scripts/test_migrations.js
 *
 * Doit tourner en moins d'une seconde et BLOQUER une publication : une chaîne
 * de migration fautive ne se voit pas à l'oeil, elle se voit le jour où la
 * fiche d'un joueur revient d'une table en version d'archive avec un art
 * effacé. Le test tient donc l'invariant qui compte : monter puis redescendre
 * rend l'état de départ à l'identique.
 *
 * Aucune dépendance : pas de framework, pas de DOM, pas de réseau.
 */
"use strict";

var path = require("path");
var MiaMigr;
try {
  MiaMigr = require(path.join(__dirname, "..", "docs", "javascripts", "mia-migrations.js"));
} catch (e) {
  // un pas mal déclaré fait lever ajouter() au chargement : le dire en clair
  // vaut mieux qu'une trace de pile au milieu d'un journal de publication
  console.error("MIGRATIONS : le registre refuse de se charger — " + (e && e.message ? e.message : e));
  process.exit(1);
}

var faits = 0, echecs = [];

function ok(cond, quoi) {
  faits++;
  if (!cond) echecs.push(quoi);
}
function copie(o) { return JSON.parse(JSON.stringify(o)); }

// Égalité PROFONDE, sans dépendre de l'ordre des clés (JSON.stringify le
// respecte, lui, et deux états identiques écrits dans un ordre différent
// passeraient pour distincts).
function egal(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    // NaN mis à part, rien d'autre à départager
    return a !== a && b !== b;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  var ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  ka.sort(); kb.sort();
  for (var i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return false;
    if (!egal(a[ka[i]], b[ka[i]])) return false;
  }
  return true;
}
// L'horodatage de vHist ne se compare pas : il est écrit par l'horloge.
function sansQuand(s) {
  var c = copie(s);
  if (Array.isArray(c.vHist)) c.vHist.forEach(function (e) { if (e && typeof e === "object") e.quand = "?"; });
  return c;
}
function ecart(a, b, chemin) {
  // premier point de divergence, pour que l'échec se lise sans fouiller
  chemin = chemin || "état";
  if (egal(a, b)) return "";
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    return chemin + " : " + JSON.stringify(a) + " != " + JSON.stringify(b);
  }
  var cles = Object.keys(a).concat(Object.keys(b));
  for (var i = 0; i < cles.length; i++) {
    var k = cles[i];
    if (!egal(a[k], b[k])) return ecart(a[k], b[k], chemin + "." + k);
  }
  return chemin + " : structures différentes";
}

// ---------------------------------------------------------------- témoins
// Des états réalistes, pas des coquilles vides : ce sont les structures que
// normalize() reconstruit (techniques, art, objets d'inventaire, leviers du
// MJ) qui perdent des données quand un pas est mal écrit.
var TEMOINS = {
  // LES DEUX PREMIERS TÉMOINS SONT HÉRITÉS DE JJK, et c'est pour ça qu'il en
  // fallait un troisième : ils portent caracsBase, customComps, des techniques
  // et des armes, c'est-à-dire des structures qui n'existent nulle part dans
  // MIA. L'aller-retour du premier pas MIA tournerait à vide sur eux et
  // passerait sans rien prouver.
  //
  // Celui-ci porte les structures de MIA : le prestige, les huit sigles, une
  // spécialité. Il ne porte AUCUN levier, et c'est délibéré : le test
  // estampille le même témoin de tous les schémas et exige l'aller-retour dans
  // les deux sens, si bien qu'un état porteur d'une forme datée serait une
  // chimère dans l'autre. Le pas lui-même se contrôle plus bas, à part, dans
  // les deux sens et sur des états qui ont chacun leur schéma pour de bon.
  "fiche MIA, leviers remplis": {
    v: 1, name: "Riko", espece: "Humaine", age: "12",
    prestige: 12, prestigeMod: 2, prestigeForce: null,
    caracs: { FOR: 8, DEX: 14, "DÉT": 20 },
    caracsBonus: { DEX: 5 },
    ecartCoupe: false,
    // NI LES SIX TABLES DU SCHÉMA 2, NI compsLeviers DU SCHÉMA 3 : ce témoin est
    // estampillé de TOUS les schémas tour à tour, et l'aller-retour est exigé
    // dans les deux sens. Porter une forme datée le rendrait chimérique dans
    // l'autre. Le pas se contrôle plus bas, à part.
    comps: { PHY: 40, COM: 15 }, compsBonus: {},
    specialites: [
      // LA FORME DU SCHÉMA 3 : ni « mod », ni « mod2 », ni les deux forçages —
      // le pas 2 → 3 les a rangés dans « leviers ». Les porter ici ferait de ce
      // témoin une chimère, comme pour les compétences juste au-dessus.
      { nom: "Esquive", carac: "DEX", comp: "COM", pts: 60, bonus: 5 }
    ],
    inv: { texte: [], groupes: ["Sur soi"], objets: [], opts: { cols: 4, nom: true, qte: true, poids: false, total: true } },
    xpTotal: 1200, pv: 18, endurance: -4, de: "1d100cs>96cf<5"
  },
  "fiche vierge": {
    v: 1, name: "", caracsBase: { Mind: 0, Body: 0, Prestance: 0 },
    comps: {}, customComps: [], avantages: [], armes: [], armures: [],
    inv: { texte: [], groupes: ["Sur soi"], objets: [], opts: { cols: 4, nom: true, qte: true, poids: false, total: true } },
    xpTotal: 500, pv: null, endurance: null, de: "d100"
  },
  "fiche jouée": {
    v: 1, name: "Yûji Itadori", portrait: "", espece: "Humain", age: "16",
    qualites: ["Increvable", "Têtu"], background: "Club d'occultisme",
    caracsBase: { Mind: 30, Body: 55, Prestance: 35 },
    caracsXp: { Mind: 2, Body: 4, Prestance: 0 },
    caracsMod: { Mind: 0, Body: 5, Prestance: -5 },
    // LES QUATRE CLÉS DE COMPÉTENCE ONT ÉTÉ RETIRÉES DE CE TÉMOIN, et ce n'est
    // pas une facilité : héritées de JJK, elles portent les MÊMES NOMS que
    // celles que le pas 2 → 3 déplace. Un état estampillé du schéma 3 qui les
    // porterait encore est une chimère — le pas les migrerait, et l'aller-retour
    // ne pourrait pas être neutre. Le pas lui-même se contrôle plus bas, à part,
    // sur des états qui ont chacun leur schéma pour de bon.
    comps: {
      "Body/Pique longue": {
        stade: 3,
        techniques: [{ name: "Coup divergent", desc: "Deux impacts.", cout: 20 }, { name: "Garde basse", desc: "" }],
        art: { name: "Style de la Rivière noire", desc: "Trois frappes." }
      },
      "Mind/Concentration": { stade: 2, techniques: [] }
    },
    customComps: [{ name: "Cuisine", carac: "Prestance", stade: 1 }],
    avantages: [{ nom: "Réceptacle", cout: 3, desc: "Porte un doigt." }],
    armes: [{ nom: "Pique longue", degats: "2d6", notes: "" }],
    armures: [],
    langues: ["Japonais", "Anglais"], langueBase: "Japonais",
    armesComps: ["Fouet"],
    inv: {
      texte: [],
      groupes: ["Sur soi", "Sac"],
      objets: [
        { nom: "Ration", qte: 2.5, poids: 0.5, img: "", desc: "Demi-portions.", id: "ration", achat: 3, vente: 1, groupe: 1 },
        { nom: "Corde", qte: 1, poids: 3, img: "", desc: "", id: "", achat: 0, vente: 0, groupe: 0 }
      ],
      opts: { cols: 3, nom: true, qte: true, poids: true, total: true }
    },
    // NI « divers.pvMax » NI « pvMaxOverride » ICI : le pas 5 les déplace, et
    // ce témoin est estampillé de TOUS les schémas tour à tour. Une forme datée
    // y devient une chimère dans l'autre sens — c'est la leçon des pas 2 et 3,
    // et elle vaut à chaque pas qui déménage quelque chose. Le pas 5 a son bloc
    // dédié, plus bas.
    divers: { regen: [0, 0, 0], vitesse: [1.5, 0, 0] },
    vitesseOverride: 10.5, regenOverride: null,
    pv: 37, endurance: -4, xpTotal: 620, de: "d100"
  },
  // Une fiche déjà passée par le moteur : grenier et journal en place, pour
  // qu'un pas mal écrit qui écraserait le casier d'un autre se voie.
  "fiche déjà migrée": {
    v: 1, name: "Nobara", comps: {}, customComps: [], avantages: [],
    grenier: { "9": { detail: "réservé par une version future", nb: 3 } },
    vHist: [
      { de: 1, vers: 2, quand: "2026-08-01T10:00:00.000Z", par: "fiche" },
      { de: 2, vers: 1, quand: "2026-08-01T11:00:00.000Z", par: "archive 2.4.1" }
    ],
    inv: { texte: [], groupes: ["Sur soi"], objets: [], opts: { cols: 4, nom: true, qte: true, poids: false, total: true } },
    xpTotal: 500, pv: null
  },
  // Clés inconnues à la racine, dans une entrée de comps et dans un avantage :
  // les structures CONSERVATRICES de normalize(). Rien ne doit les toucher.
  "fiche d'une version plus récente": {
    v: 1, name: "Inconnue", champFutur: { a: 1, b: [2, 3] },
    comps: { "Mind/Observation": { stade: 4, techniques: [], champFutur: "gardé" } },
    avantages: [{ nom: "X", cout: 1, champFutur: true }],
    customComps: [], inv: { texte: [], groupes: ["Sur soi"], objets: [], opts: { cols: 4 } },
    xpTotal: 500, pv: null
  }
};

// ------------------------------------------------- 1. forme de la chaîne
var MAX = MiaMigr.max();
ok(MAX >= MiaMigr.SCHEMA_BASE, "le registre doit connaître au moins le socle");
ok(MiaMigr.verifier().length === 0, "chaîne incohérente : " + MiaMigr.verifier().join(" / "));

for (var s = MiaMigr.SCHEMA_BASE + 1; s <= MAX; s++) {
  var p = MiaMigr.pas(s);
  ok(!!p, "pas " + s + " absent : la chaîne doit être contiguë depuis le schéma " + MiaMigr.SCHEMA_BASE);
  ok(p && typeof p.monter === "function", "pas " + s + " : monter() doit être une fonction");
  ok(p && typeof p.descendre === "function", "pas " + s + " : descendre() doit être déclaré");
  ok(p && typeof p.notes === "string" && p.notes.length > 0, "pas " + s + " : notes exigées pour l'avertissement");
}
ok(MiaMigr.pas(MiaMigr.SCHEMA_BASE) === null, "le socle ne doit pas porter de pas");

// --------------------------------------- 2. aller-retour sur chaque paire
Object.keys(TEMOINS).forEach(function (nom) {
  for (var de = MiaMigr.SCHEMA_BASE; de <= MAX; de++) {
    for (var vers = MiaMigr.SCHEMA_BASE; vers <= MAX; vers++) {
      var depart = copie(TEMOINS[nom]);
      depart.v = de;
      var fige = JSON.stringify(depart);

      var aller = MiaMigr.appliquer(depart, de, vers);
      ok(aller.ok, nom + " " + de + "->" + vers + " : montée refusée (" + (aller.erreur && aller.erreur.message) + ")");
      if (!aller.ok) continue;
      ok(aller.state.v === vers, nom + " " + de + "->" + vers + " : le schéma doit être estampillé");
      ok(JSON.stringify(depart) === fige, nom + " " + de + "->" + vers + " : l'état d'origine a été modifié");

      var retour = MiaMigr.appliquer(aller.state, vers, de);
      ok(retour.ok, nom + " " + vers + "->" + de + " : descente refusée");
      if (!retour.ok) continue;

      var a = sansQuand(retour.state), b = sansQuand(depart);
      ok(egal(a, b), nom + " " + de + "->" + vers + "->" + de + " : aller-retour non neutre — " + ecart(a, b));

      var g = retour.state.grenier ? MiaMigr.octets(JSON.stringify(retour.state.grenier)) : 0;
      ok(g <= MiaMigr.GRENIER_MAX, nom + " " + de + "->" + vers + " : grenier de " + g + " octets, plafond " + MiaMigr.GRENIER_MAX);
    }
  }
});

// ------------------------------------------------------ 3. déterminisme
// Chaque pas, joué deux fois dans des contextes NEUFS, doit rendre exactement
// le même état, le même journal et les mêmes pertes. Un pas qui lirait
// l'horloge, un compteur global ou Math.random tomberait ici.
Object.keys(TEMOINS).forEach(function (nom) {
  for (var s = MiaMigr.SCHEMA_BASE + 1; s <= MAX; s++) {
    [[s - 1, s], [s, s - 1]].forEach(function (paire) {
      var t = copie(TEMOINS[nom]);
      t.v = paire[0];
      var opts = { par: "test", quand: "2026-08-03T00:00:00.000Z" };
      var r1 = MiaMigr.appliquer(t, paire[0], paire[1], opts);
      var r2 = MiaMigr.appliquer(t, paire[0], paire[1], opts);
      ok(r1.ok && r2.ok, nom + " pas " + paire[0] + "->" + paire[1] + " : refusé");
      ok(egal(r1.state, r2.state), nom + " pas " + paire[0] + "->" + paire[1] + " : état non déterministe — " + ecart(r1.state, r2.state));
      ok(egal(r1.journal, r2.journal), nom + " pas " + paire[0] + "->" + paire[1] + " : journal non déterministe");
      ok(egal(r1.pertes, r2.pertes), nom + " pas " + paire[0] + "->" + paire[1] + " : pertes non déterministes");
    });
  }
});

// ------------------------------------------------------------ 4. résumé
var res = MiaMigr.resume(MiaMigr.SCHEMA_BASE, MAX);
ok(Array.isArray(res) && res.length === MAX - MiaMigr.SCHEMA_BASE, "résumé : un bloc par pas traversé");
ok(res && res.every(function (e) { return e.sens === "montee" && e.notes; }), "résumé : sens et notes attendus en montée");
var resBas = MiaMigr.resume(MAX, MiaMigr.SCHEMA_BASE);
ok(resBas && resBas.every(function (e) { return e.sens === "descente"; }), "résumé : sens attendu en descente");
// La chaîne publiée est VIDE tant qu'aucune forme d'état n'a changé (MIA y est
// aujourd'hui) : resume(socle, socle) rend alors [], et non null, parce que le
// trajet est possible — il ne traverse simplement aucun pas. L'assertion
// « le premier bloc est le plus haut » n'a donc de sens qu'à partir d'un pas.
if (MAX > MiaMigr.SCHEMA_BASE) {
  ok(resBas && resBas[0] && resBas[0].schema === MAX, "résumé : la descente commence par le pas le plus haut");
}
ok(MiaMigr.resume(1, MAX + 5) === null, "résumé : un trajet impossible rend null, jamais un tableau vide");

// -------------------------------------------- 5. journal de bord (vHist)
(function () {
  var t = copie(TEMOINS["fiche vierge"]);
  var r = MiaMigr.appliquer(t, 1, MAX);
  ok(r.ok && r.state.vHist === undefined, "vHist : un aperçu (sans « par ») ne doit rien inscrire");

  r = MiaMigr.appliquer(t, 1, MAX, { par: "fiche" });
  ok(r.ok && r.state.vHist.length === 1, "vHist : une entrée par migration validée");
  ok(r.state.vHist[0].de === 1 && r.state.vHist[0].vers === MAX && r.state.vHist[0].par === "fiche", "vHist : de / vers / par attendus");
  ok(/^\d{4}-\d\d-\d\dT/.test(r.state.vHist[0].quand), "vHist : horodatage ISO attendu");

  var etat = copie(TEMOINS["fiche vierge"]);
  for (var i = 0; i < 15; i++) {
    var rr = MiaMigr.appliquer(etat, etat.v || 1, etat.v === MAX ? 1 : MAX, { par: "boucle " + i });
    etat = rr.state;
  }
  ok(etat.vHist.length === MiaMigr.VHIST_MAX, "vHist : plafonné à " + MiaMigr.VHIST_MAX + " entrées (" + etat.vHist.length + ")");
  ok(etat.vHist[etat.vHist.length - 1].par === "boucle 14", "vHist : ce sont les DERNIÈRES entrées qui restent");
})();

// ------------------------------------- 6. grenier : aller-retour et plafond
(function () {
  var R = MiaMigr.creer();
  R.ajouter({
    schema: 2,
    titre: "Essai grenier",
    notes: "Essai.",
    monter: function (st, ctx) {
      var repris = ctx.reprendre("surnom");
      if (repris !== undefined) st.surnom = repris;
      ctx.log("montée");
    },
    descendre: function (st, ctx) {
      if (st.surnom !== undefined) { ctx.grenier("surnom", st.surnom); delete st.surnom; }
      ctx.log("descente");
    }
  });
  var t = { v: 2, name: "A", surnom: { court: "Y", long: "Yûji" } };
  var bas = R.appliquer(t, 2, 1);
  ok(bas.ok && bas.state.surnom === undefined, "grenier : la donnée quitte l'état à la descente");
  ok(bas.state.grenier && bas.state.grenier["2"] && bas.state.grenier["2"].surnom.long === "Yûji", "grenier : rangée dans le casier du pas");
  var haut = R.appliquer(bas.state, 1, 2);
  ok(haut.ok && egal(haut.state, t), "grenier : la remontée rend l'état d'origine — " + ecart(haut.state, t));
  ok(haut.state.grenier === undefined, "grenier : un casier vidé disparaît (sinon l'aller-retour n'est plus neutre)");

  // le grenier ne doit pas servir de cave sans fond : au-delà du plafond, la
  // donnée est REFUSÉE et la perte déclarée, l'état reste publiable.
  var R2 = MiaMigr.creer();
  R2.ajouter({
    schema: 2, titre: "Essai plafond", notes: "Essai.",
    monter: function () {},
    descendre: function (st, ctx) {
      ctx.grenier("un", new Array(20000).join("a"));      // ~20 Ko : passe, sous l'alerte
      ctx.grenier("deux", new Array(20000).join("b"));    // ~40 Ko cumulés : alerte
      ctx.grenier("gros", new Array(80000).join("c"));    // ~120 Ko cumulés : refusé
    }
  });
  var r2 = R2.appliquer({ v: 2 }, 2, 1);
  ok(r2.ok, "grenier plein : la migration continue, elle ne casse pas");
  ok(r2.state.grenier["2"].un !== undefined && r2.state.grenier["2"].deux !== undefined, "grenier plein : ce qui tenait reste rangé");
  ok(r2.state.grenier["2"].gros === undefined, "grenier plein : ce qui déborde n'est pas rangé");
  ok(r2.pertes.length === 1 && /grenier plein/.test(r2.pertes[0].pourquoi), "grenier plein : une perte déclarée");
  ok(r2.alerte === true, "grenier : alerte levée au-delà de " + R2.GRENIER_ALERTE + " octets");
  ok(/grenier chargé/.test(JSON.stringify(r2.journal)), "grenier : le franchissement des " + R2.GRENIER_ALERTE + " octets est journalisé");
  ok(MiaMigr.octets(JSON.stringify(r2.state.grenier)) <= MiaMigr.GRENIER_MAX, "grenier : plafond de 64 Ko tenu");

  ok(MiaMigr.octets("é") === 2 && MiaMigr.octets("a") === 1 && MiaMigr.octets("😀") === 4, "octets : mesure UTF-8, pas UTF-16");
})();

// ----------------------------------- 7. échec d'un pas : rien ne bouge
(function () {
  var R = MiaMigr.creer();
  R.ajouter({
    schema: 2, titre: "Réversible", notes: "Essai.",
    monter: function (st) { st.marque = 1; },
    descendre: function (st) { delete st.marque; }
  });
  R.ajouter({
    schema: 3, titre: "Sans retour", notes: "Essai.",
    monter: function (st) { st.fusion = 1; },
    descendre: function () { throw R.IRREVERSIBLE("la fusion ne se défait pas"); }
  });
  var t = { v: 1, name: "A" };
  var haut = R.appliquer(t, 1, 3);
  ok(haut.ok && haut.state.marque === 1 && haut.state.fusion === 1, "chaîne de deux pas : les deux montées jouées");

  var fige = JSON.stringify(haut.state);
  var bas = R.appliquer(haut.state, 3, 1);
  ok(!bas.ok, "descente impossible : la migration doit être refusée");
  ok(bas.erreur && bas.erreur.irreversible === true, "descente impossible : l'erreur doit être marquée irréversible");
  ok(bas.erreur && /ne se défait pas/.test(bas.erreur.message), "descente impossible : la raison doit remonter");
  ok(JSON.stringify(haut.state) === fige, "descente impossible : l'état d'origine doit rester intact");
  ok(bas.state === haut.state, "descente impossible : appliquer rend l'état d'origine");

  // un pas qui casse au MILIEU de la chaîne ne doit rien laisser à moitié fait
  var R3 = MiaMigr.creer();
  R3.ajouter({ schema: 2, titre: "A", notes: "n", monter: function (st) { st.a = 1; }, descendre: function (st) { delete st.a; } });
  R3.ajouter({ schema: 3, titre: "B", notes: "n", monter: function () { throw new Error("boum"); }, descendre: function () {} });
  var t3 = { v: 1 };
  var r3 = R3.appliquer(t3, 1, 3);
  ok(!r3.ok && t3.a === undefined && t3.v === 1, "échec en milieu de chaîne : l'état d'origine reste vierge");
})();

// ------------------------------- 8. refus d'une chaîne trouée et des abus
(function () {
  var R = MiaMigr.creer();
  R.ajouter({ schema: 3, titre: "Orpheline", notes: "n", monter: function () {}, descendre: function () {} });
  ok(R.verifier().length === 1, "chaîne trouée : verifier() doit le dire");
  ok(!R.appliquer({ v: 1 }, 1, 3).ok, "chaîne trouée : appliquer doit refuser de partir");
  ok(R.resume(1, 3) === null, "chaîne trouée : resume doit rendre null");

  var R2 = MiaMigr.creer();
  var leve = function (f) { try { f(); return false; } catch (e) { return true; } };
  ok(leve(function () { R2.ajouter({ schema: 2, titre: "T", notes: "n", monter: function () {} }); }), "ajouter : descendre() manquant doit lever");
  ok(leve(function () { R2.ajouter({ schema: 2, titre: "T", notes: "n", descendre: function () {} }); }), "ajouter : monter() manquant doit lever");
  ok(leve(function () { R2.ajouter({ schema: 1, titre: "T", notes: "n", monter: function () {}, descendre: function () {} }); }), "ajouter : le socle ne peut pas porter de pas");
  ok(leve(function () { R2.ajouter({ schema: 2, titre: "T", monter: function () {}, descendre: function () {} }); }), "ajouter : notes exigées");
  R2.ajouter({ schema: 2, titre: "T", notes: "n", monter: function () {}, descendre: function () {} });
  ok(leve(function () { R2.ajouter({ schema: 2, titre: "T", notes: "n", monter: function () {}, descendre: function () {} }); }), "ajouter : deux pas pour le même schéma doivent lever");

  ok(!MiaMigr.appliquer(null, 1, MAX).ok, "appliquer : un état absent est refusé");
  ok(!MiaMigr.appliquer({ v: 1 }, 1, MAX + 4).ok, "appliquer : un schéma inconnu est refusé");
  ok(!MiaMigr.appliquer({ v: 1 }, "x", 2).ok, "appliquer : un schéma illisible est refusé");
  // MAX, et non « 2 » en dur : sur une chaîne vide le schéma 2 n'existe pas et
  // appliquer() le refuse comme inconnu, ce qui ferait échouer une épreuve qui
  // ne parle pas de ça. MAX est toujours un schéma valide, chaîne vide comprise.
  var memeSchema = MiaMigr.appliquer({ v: MAX, name: "A" }, MAX, MAX);
  ok(memeSchema.ok && memeSchema.journal.length === 0, "appliquer : de == vers ne joue aucun pas");
})();

// ------------------------------ 6. le pas 3, dans les deux sens, en detail
// MEME RAISON QU'AU BLOC 5 : les temoins du bloc 2 ne peuvent pas controler un
// pas, puisqu'ils sont estampilles de tous les schemas tour a tour. On part
// donc de deux etats qui ont chacun le leur pour de bon.
(function () {
  var M = MiaMigr;

  // ---- 2 -> 3 : les six tables et les quatre champs vont dans la bonne boite ----
  var v2 = {
    v: 2, name: "Riko",
    comps: { PHY: 40 }, compsBonus: { PHY: 5 },
    compsForce: { PHY: 120 }, compsMod: { PHY: -10, COM: 0 }, compsMod2: { COM: 15 },
    compsXpForce: { COM: 60 }, compsXpMod: { PHY: -20 }, compsXpMod2: {},
    specialites: [
      { nom: "Esquive", carac: "DEX", comp: "COM", pts: 60, bonus: 5,
        mod: -10, mod2: 0, force: null, xpForce: 12 },
      { nom: "PV", carac: "CON", comp: "PHY", pts: 20, bonus: 0,
        mod: 0, mod2: 0, force: null, xpForce: null }
    ]
  };
  var fige2 = JSON.stringify(v2);
  var m = M.appliquer(copie(v2), 2, 3);
  ok(m.ok, "pas 3 : la montee doit passer (" + (m.erreur && m.erreur.message) + ")");
  if (m.ok) {
    var lv = m.state.compsLeviers || {};
    ok(JSON.stringify(lv.valeur && lv.valeur.force) === '{"PHY":120}', "pas 3 : valeur forcee d'une competence");
    ok(JSON.stringify(lv.valeur && lv.valeur.a1) === '{"PHY":-10}', "pas 3 : decalage de valeur -> a1 (et le zero de COM ne passe pas)");
    ok(JSON.stringify(lv.valeur && lv.valeur.a2) === '{"COM":15}', "pas 3 : second decalage -> a2");
    ok(JSON.stringify(lv.xp && lv.xp.force) === '{"COM":60}', "pas 3 : cout force");
    ok(JSON.stringify(lv.xp && lv.xp.a1) === '{"PHY":-20}', "pas 3 : modificateur de cout -> a1");
    ok(m.state.compsMod === undefined, "pas 3 : les anciennes tables doivent partir de la racine");
    ok(JSON.stringify(m.state.comps) === '{"PHY":40}', "pas 3 : les points achetes ne bougent pas");
    ok(JSON.stringify(m.state.compsBonus) === '{"PHY":5}', "pas 3 : le bonus ne bouge pas");
    var s0 = m.state.specialites[0], s1 = m.state.specialites[1];
    ok(s0.leviers && s0.leviers.valeur && s0.leviers.valeur.a1 === -10, "pas 3 : le decalage d'une specialite -> a1");
    ok(s0.leviers && s0.leviers.xp && s0.leviers.xp.force === 12, "pas 3 : le cout force d'une specialite");
    ok(s0.mod === undefined && s0.force === undefined, "pas 3 : les anciens champs quittent l'objet");
    ok(s0.pts === 60 && s0.bonus === 5, "pas 3 : les points et le bonus d'une specialite ne bougent pas");
    ok(s1.leviers === undefined, "pas 3 : une specialite sans reglage ne porte pas de leviers");
    ok(JSON.stringify(v2) === fige2, "pas 3 : l'etat d'origine ne doit pas etre modifie");

    var r = M.appliquer(m.state, 3, 2);
    ok(r.ok, "pas 3 : la descente doit passer");
    if (r.ok) ok(egal(sansQuand(r.state), sansQuand(copie(v2))),
                 "pas 3 : 2->3->2 doit tout rendre, zeros compris — " +
                 ecart(sansQuand(r.state), sansQuand(copie(v2))));
  }

  // ---- 3 -> 2 : ce que le schema 2 ne porte pas va au grenier ----
  var v3 = {
    v: 3, name: "Riko",
    comps: { PHY: 40 },
    compsLeviers: {
      valeur: { a1: { PHY: -10 }, m1: { PHY: 2 } },
      plafond: { a1: { COM: 30 } },
      ecart: { force: { COM: 25 } }
    },
    specialites: [
      { nom: "Esquive", carac: "DEX", comp: "COM", pts: 60, bonus: 0,
        leviers: { valeur: { a1: -10, m2: 3 }, ecart: { force: 30 } } }
    ]
  };
  var fige3 = JSON.stringify(v3);
  var d = M.appliquer(copie(v3), 3, 2);
  ok(d.ok, "pas 3 : la descente d'un etat natif doit passer");
  if (d.ok) {
    ok(JSON.stringify(d.state.compsMod) === '{"PHY":-10}', "pas 3 : a1 de valeur redescend");
    ok(d.state.compsLeviers === undefined, "pas 3 : la table neuve doit partir");
    ok(d.state.specialites[0].mod === -10, "pas 3 : a1 d'une specialite redescend");
    ok(d.state.specialites[0].leviers === undefined, "pas 3 : les leviers quittent l'objet");
    var g = d.state.grenier && d.state.grenier["3"];
    ok(!!g, "pas 3 : ce que le schema 2 ne porte pas doit aller au grenier");
    ok(g && g.compsLeviers && JSON.stringify(g.compsLeviers.plafond) === '{"a1":{"COM":30}}',
       "pas 3 : un levier de plafond au grenier");
    ok(g && g.compsLeviers && JSON.stringify(g.compsLeviers.ecart) === '{"force":{"COM":25}}',
       "pas 3 : un ecart de competence au grenier");
    ok(g && Array.isArray(g.spes) && g.spes[0] && g.spes[0].reste &&
       JSON.stringify(g.spes[0].reste.ecart) === '{"force":30}',
       "pas 3 : l'ecart d'une specialite au grenier");
    ok(JSON.stringify(v3) === fige3, "pas 3 : l'etat d'origine ne doit pas etre modifie");

    var r2 = M.appliquer(d.state, 2, 3);
    ok(r2.ok, "pas 3 : la remontee doit passer");
    if (r2.ok) ok(egal(sansQuand(r2.state), sansQuand(copie(v3))),
                  "pas 3 : 3->2->3 doit tout rendre — " +
                  ecart(sansQuand(r2.state), sansQuand(copie(v3))));
  }

  // ---- la garde de longueur : une specialite ajoutee pendant la descente ----
  var d2 = M.appliquer(copie(v3), 3, 2);
  if (d2.ok) {
    d2.state.specialites.push({ nom: "Neuve", carac: "", comp: "", pts: 0, bonus: 0 });
    var r3 = M.appliquer(d2.state, 2, 3);
    ok(r3.ok, "pas 3 : la remontee doit passer meme si la liste a change");
    ok(r3.ok && r3.pertes && r3.pertes.length > 0,
       "pas 3 : une liste de longueur differente doit etre DITE, pas appliquee en silence");
  }
})();

// ---------------------------------------------------------------- verdict
var duree = Math.round(process.uptime() * 1000);
// ------------------------------ 5. le pas 2, dans les deux sens, en détail
// LES TÉMOINS DU BLOC 2 NE PEUVENT PAS CONTRÔLER UN PAS, et il faut le dire :
// le test y estampille le MÊME état de tous les schémas et exige l'aller-retour
// dans les deux sens. Un état qui porte une forme datée est donc une chimère
// dans l'autre sens, et le seul témoin qui passe est celui qu'aucun pas ne
// touche. C'est pourquoi ce bloc-ci existe : deux états qui ont chacun leur
// schéma pour de bon, et l'on vérifie ce que le pas FAIT, pas seulement qu'il
// se défait.
(function () {
  var M = MiaMigr;

  // ---- 1 -> 2 : les huit clés vont dans la bonne boîte ----
  var v1 = {
    v: 1, name: "Riko",
    caracsPlafondForce: { "DÉT": 18 }, caracsPlafondMod: { FOR: 3 },
    caracsXpForce: { FOR: 120 }, caracsXpMod: { DEX: -20 }, caracsXpMod2: { "DÉT": 15 },
    caracsModMod: { DEX: -10 }, caracsLimMod: { FOR: 50, DEX: -25 },
    caracsEcart: { DEX: 30, "DÉT": 0 }
  };
  var fige1 = JSON.stringify(v1);
  var m = M.appliquer(copie(v1), 1, 2);
  ok(m.ok, "pas 2 : la montée doit passer (" + (m.erreur && m.erreur.message) + ")");
  if (m.ok) {
    var lv = m.state.caracsLeviers || {};
    ok(JSON.stringify(lv.plafond && lv.plafond.force) === '{"DÉT":18}', "pas 2 : plafond forcé");
    ok(JSON.stringify(lv.plafond && lv.plafond.a1) === '{"FOR":3}', "pas 2 : plafond décalé -> a1");
    ok(JSON.stringify(lv.xp && lv.xp.force) === '{"FOR":120}', "pas 2 : xp forcé");
    ok(JSON.stringify(lv.xp && lv.xp.a1) === '{"DEX":-20}', "pas 2 : premier modificateur d'xp -> a1");
    ok(JSON.stringify(lv.xp && lv.xp.a2) === '{"DÉT":15}', "pas 2 : second modificateur d'xp -> a2");
    ok(JSON.stringify(lv.mod && lv.mod.a1) === '{"DEX":-10}', "pas 2 : décalage du MOD -> a1");
    ok(JSON.stringify(lv.lim && lv.lim.a1) === '{"FOR":50,"DEX":-25}', "pas 2 : décalage de la limite -> a1");
    // CELLE-CI EST LA SEULE QUI DEMANDE DE RÉFLÉCHIR : l'écart n'était pas un
    // décalage mais une VALEUR. Rangé en « a1 », un écart réglé à 30 en
    // donnerait 80.
    ok(JSON.stringify(lv.ecart && lv.ecart.force) === '{"DEX":30,"DÉT":0}', "pas 2 : l'écart est un FORÇAGE, pas un ajout");
    ok(lv.ecart && lv.ecart.a1 === undefined, "pas 2 : l'écart ne doit rien poser en a1");
    ok(m.state.caracsEcart === undefined, "pas 2 : les anciennes clés doivent partir de la racine");
    ok(JSON.stringify(v1) === fige1, "pas 2 : l'état d'origine ne doit pas être modifié");

    var r = M.appliquer(m.state, 2, 1);
    ok(r.ok, "pas 2 : la descente doit passer");
    if (r.ok) ok(egal(sansQuand(r.state), sansQuand(copie(v1))), "pas 2 : 1->2->1 doit rendre les huit clés — " + ecart(sansQuand(r.state), sansQuand(copie(v1))));
  }

  // ---- 2 -> 1 : les boîtes que le schéma 1 ne sait pas porter vont au grenier ----
  var v2 = {
    v: 2, name: "Riko",
    caracsLeviers: {
      plafond: { a1: { FOR: 3 }, m1: { DEX: 1.5 } },
      mod: { a1: { DEX: -10 }, m2: { FOR: 2 }, a3: { "DÉT": -7 } },
      xp: { a2: { "DÉT": 15 }, a4: { FOR: 5 } }
    }
  };
  var fige2 = JSON.stringify(v2);
  var d = M.appliquer(copie(v2), 2, 1);
  ok(d.ok, "pas 2 : la descente d'un état natif doit passer");
  if (d.ok) {
    ok(JSON.stringify(d.state.caracsPlafondMod) === '{"FOR":3}', "pas 2 : a1 du plafond redescend");
    ok(JSON.stringify(d.state.caracsModMod) === '{"DEX":-10}', "pas 2 : a1 du MOD redescend");
    ok(d.state.caracsLeviers === undefined, "pas 2 : la table neuve doit partir");
    var g = d.state.grenier && d.state.grenier["2"] && d.state.grenier["2"].caracsLeviers;
    ok(!!g, "pas 2 : ce que le schéma 1 ne porte pas doit aller au grenier");
    ok(g && g.plafond && JSON.stringify(g.plafond.m1) === '{"DEX":1.5}', "pas 2 : un facteur au grenier");
    ok(g && g.mod && JSON.stringify(g.mod.a3) === '{"DÉT":-7}', "pas 2 : un ajout de fin au grenier");
    ok(JSON.stringify(v2) === fige2, "pas 2 : l'état d'origine ne doit pas être modifié");

    var r2 = M.appliquer(d.state, 1, 2);
    ok(r2.ok, "pas 2 : la remontée doit passer");
    if (r2.ok) ok(egal(sansQuand(r2.state), sansQuand(copie(v2))), "pas 2 : 2->1->2 doit tout rendre — " + ecart(sansQuand(r2.state), sansQuand(copie(v2))));
  }
})();


// --------------------------- 7. le pas 4, dans les deux sens, en détail
// LES TÉMOINS GÉNÉRIQUES NE PEUVENT PAS LE CONTRÔLER, et c'est la leçon du pas
// précédent : ils estampillent le MÊME état de tous les schémas et exigent
// l'aller-retour dans les deux sens, donc aucun ne peut porter une forme datée.
// D'où ce bloc, avec des états qui ont chacun leur schéma pour de bon.
//
// CE QUE LE PAS FAIT : le levier « valeur » d'une compétence portait sur le
// TOUT — coiffe et bonus compris. Ses huit boîtes de calcul passent donc au
// levier « bonus », le seul qui s'applique encore après la coiffe ; son
// FORÇAGE reste à la valeur, où il dit toujours « cette compétence vaut F ».
//
// ATTENTION : une boîte de compétence porte une TABLE de sigles, pas un nombre.
(function () {
  var M = MiaMigr;

  // ---- 3 -> 4 : les boîtes de calcul vont au bonus, le forçage reste ----
  var v3 = {
    v: 3, name: "Riko",
    compsLeviers: {
      valeur: { force: { PHY: 90 }, a1: { COM: 10 }, m1: { CLA: 2 } },
      plafond: { a1: { PHY: 5 } },
      xp: { a2: { COM: 3 } },
      ecart: { force: { PHY: 40 } }
    },
    caracsLeviers: { mod: { a1: { FOR: -10 } } },
    specialites: [{ nom: "Esquive", carac: "DEX", comp: "COM", pts: 40, bonus: 3 }]
  };
  var fige3 = JSON.stringify(v3);
  var m = M.appliquer(copie(v3), 3, 4);
  ok(m.ok, "pas 4 : la montée doit passer (" + (m.erreur && m.erreur.message) + ")");
  if (m.ok) {
    var lv = m.state.compsLeviers || {};
    ok(JSON.stringify(lv.valeur) === '{"force":{"PHY":90}}',
       "pas 4 : le forçage RESTE à la valeur, et lui seul");
    ok(lv.bonus && JSON.stringify(lv.bonus.a1) === '{"COM":10}',
       "pas 4 : l'ajout passe au bonus");
    ok(lv.bonus && JSON.stringify(lv.bonus.m1) === '{"CLA":2}',
       "pas 4 : le facteur passe au bonus");
    ok(lv.bonus && lv.bonus.force === undefined,
       "pas 4 : le bonus ne doit PAS recevoir le forçage");
    ok(JSON.stringify(lv.plafond) === '{"a1":{"PHY":5}}',
       "pas 4 : le plafond ne bouge pas");
    ok(JSON.stringify(lv.xp) === '{"a2":{"COM":3}}', "pas 4 : l'xp ne bouge pas");
    ok(JSON.stringify(lv.ecart) === '{"force":{"PHY":40}}', "pas 4 : l'écart ne bouge pas");
    ok(JSON.stringify(m.state.caracsLeviers) === '{"mod":{"a1":{"FOR":-10}}}',
       "pas 4 : les leviers de caractéristique ne bougent pas");
    ok(JSON.stringify(v3) === fige3, "pas 4 : l'état d'origine ne doit pas être modifié");

    var r = M.appliquer(m.state, 4, 3);
    ok(r.ok, "pas 4 : la descente doit passer");
    if (r.ok) ok(egal(sansQuand(r.state), sansQuand(copie(v3))),
                 "pas 4 : 3->4->3 doit tout rendre — " + ecart(sansQuand(r.state), sansQuand(copie(v3))));
  }

  // ---- 4 -> 3 : ce que le schéma 3 ne sait pas porter va au grenier ----
  // LES DEUX RÉGLAGES NEUFS : les boîtes de calcul de la VALEUR (là-bas, elles
  // portaient sur le tout, donc elles n'ont pas cette place) et le FORÇAGE du
  // bonus (il n'existait pas). Le reste se reconstruit.
  var v4 = {
    v: 4, name: "Riko",
    compsLeviers: {
      valeur: { a1: { PHY: 7 }, force: { COM: 50 } },
      bonus: { force: { CLA: 12 }, a2: { PHY: 3 }, m3: { COM: 0.5 } }
    },
    // CES TROIS-LÀ N'ONT AUCUNE PLACE AU SCHÉMA 3 non plus, et la descente les
    // RANGE : les laisser ne les protégerait de rien, puisque la normalisation
    // du schéma 3 reconstruit ces tables sans eux.
    caracsLeviers: { valeur: { a1: { FOR: 4 } }, bonus: { force: { DEX: 8 } } },
    specialites: [{ nom: "Esquive", carac: "DEX", comp: "COM", pts: 40, bonus: 3,
                    leviers: { bonus: { a1: 6 } } }]
  };
  var fige4 = JSON.stringify(v4);
  var d = M.appliquer(copie(v4), 4, 3);
  ok(d.ok, "pas 4 : la descente d'un état natif doit passer");
  if (d.ok) {
    var lv2 = d.state.compsLeviers || {};
    ok(lv2.bonus === undefined, "pas 4 : le levier de bonus doit partir");
    ok(lv2.valeur && JSON.stringify(lv2.valeur.force) === '{"COM":50}',
       "pas 4 : le forçage de la valeur redescend tel quel");
    ok(lv2.valeur && JSON.stringify(lv2.valeur.a2) === '{"PHY":3}',
       "pas 4 : un ajout du bonus redescend dans la valeur");
    ok(lv2.valeur && JSON.stringify(lv2.valeur.m3) === '{"COM":0.5}',
       "pas 4 : un facteur du bonus redescend dans la valeur");
    ok(lv2.valeur && lv2.valeur.a1 === undefined,
       "pas 4 : l'ajout NEUF de la valeur ne redescend pas — il va au grenier");
    var g = d.state.grenier && d.state.grenier["4"] && d.state.grenier["4"].comps4;
    ok(!!g, "pas 4 : ce que le schéma 3 ne porte pas doit aller au grenier");
    ok(g && JSON.stringify(g.valeurAM) === '{"a1":{"PHY":7}}',
       "pas 4 : l'ajout neuf de la valeur au grenier");
    ok(g && JSON.stringify(g.bonusForce) === '{"CLA":12}',
       "pas 4 : le forçage du bonus au grenier");
    ok(JSON.stringify(d.state.caracsLeviers) === '{}',
       "pas 4 : les leviers NEUFS d'une caractéristique quittent la table");
    ok(g && JSON.stringify(g.carac_valeur) === '{"a1":{"FOR":4}}',
       "pas 4 : le levier de valeur d'une caractéristique au grenier");
    ok(g && JSON.stringify(g.carac_bonus) === '{"force":{"DEX":8}}',
       "pas 4 : le levier de bonus d'une caractéristique au grenier");
    ok(d.state.specialites && d.state.specialites[0] &&
       d.state.specialites[0].leviers === undefined,
       "pas 4 : la spécialité vidée de son seul levier ne garde pas de table vide");
    ok(g && JSON.stringify(g.spesBonus) === '[{"a1":6}]',
       "pas 4 : le levier de bonus d'une spécialité au grenier, par RANG");
    ok(JSON.stringify(v4) === fige4, "pas 4 : l'état d'origine ne doit pas être modifié");

    var r2 = M.appliquer(d.state, 3, 4);
    ok(r2.ok, "pas 4 : la remontée doit passer");
    if (r2.ok) ok(egal(sansQuand(r2.state), sansQuand(copie(v4))),
                  "pas 4 : 4->3->4 doit tout rendre — " + ecart(sansQuand(r2.state), sansQuand(copie(v4))));
  }

  // ---- un état SANS levier de compétence traverse sans une trace ----
  var nu = { v: 3, name: "Nanachi", comps: { PHY: 40 } };
  var mn = M.appliquer(copie(nu), 3, 4);
  ok(mn.ok && mn.state.compsLeviers === undefined,
     "pas 4 : un état sans levier ne doit pas se voir poser de table vide");
  if (mn.ok) {
    var rn = M.appliquer(mn.state, 4, 3);
    ok(rn.ok && egal(sansQuand(rn.state), sansQuand(copie(nu))),
       "pas 4 : un état sans levier fait l'aller-retour sans une trace");
  }

  // ---- un levier de valeur SANS forçage ne laisse pas de table vide ----
  var sf = { v: 3, name: "Reg", compsLeviers: { valeur: { a1: { PHY: 10 } } } };
  var ms = M.appliquer(copie(sf), 3, 4);
  ok(ms.ok, "pas 4 : la montée sans forçage doit passer");
  if (ms.ok) {
    ok(ms.state.compsLeviers && ms.state.compsLeviers.valeur === undefined,
       "pas 4 : la valeur vidée de ses boîtes doit disparaître, pas rester vide");
    var rs = M.appliquer(ms.state, 4, 3);
    ok(rs.ok && egal(sansQuand(rs.state), sansQuand(copie(sf))),
       "pas 4 : aller-retour sans forçage — " + (rs.ok ? ecart(sansQuand(rs.state), sansQuand(copie(sf))) : ""));
  }
})();


// --------------------------- 8. le pas 5, dans les deux sens, en détail
// MÊME RAISON QU'AUX PAS 2, 3 ET 4 : les témoins généraux ne peuvent pas
// contrôler un pas, puisqu'ils sont estampillés de tous les schémas tour à
// tour. C'est d'ailleurs pour ce pas-ci que le témoin « fiche jouée » a dû
// perdre « divers.pvMax » et « pvMaxOverride » : il les portait, et l'aller-
// retour cessait d'être exact dans un sens sur deux.
(function () {
  var M = MiaMigr;

  // ---- 4 -> 5 : le forçage et les trois modificateurs entrent dans la chaîne ----
  var v4 = {
    v: 4, name: "Riko",
    pvMaxOverride: 90,
    divers: { pvMax: [7, 0, -3], endurance: [1, 0, 0], vitesse: [0, 0, 0] },
    enduranceMaxOverride: 12
  };
  var fige4 = JSON.stringify(v4);
  var m = M.appliquer(copie(v4), 4, 5);
  ok(m.ok, "pas 5 : la montée doit passer (" + (m.erreur && m.erreur.message) + ")");
  if (m.ok) {
    var mx = (m.state.reservesLeviers || {}).pvMax || {};
    ok(mx.force === 90, "pas 5 : le maximum forcé devient le forçage de la chaîne");
    ok(mx.a1 === 7, "pas 5 : le premier modificateur -> a1");
    ok(mx.a2 === undefined, "pas 5 : un modificateur de ZÉRO ne se range pas");
    ok(mx.a3 === -3, "pas 5 : le troisième modificateur -> a3, signe compris");
    ok(m.state.pvMaxOverride === undefined, "pas 5 : l'ancienne clé quitte la racine");
    ok(m.state.divers && m.state.divers.pvMax === undefined,
       "pas 5 : les trois cases quittent « divers »");
    ok(m.state.divers && JSON.stringify(m.state.divers.endurance) === "[1,0,0]",
       "pas 5 : l'endurance de « divers » ne bouge PAS — ce n'est pas son tour");
    ok(m.state.enduranceMaxOverride === 12,
       "pas 5 : le maximum d'endurance ne bouge pas non plus");
    ok(JSON.stringify(v4) === fige4, "pas 5 : l'état d'origine ne doit pas être modifié");

    var r = M.appliquer(m.state, 5, 4);
    ok(r.ok, "pas 5 : la descente doit passer");
    if (r.ok) ok(egal(sansQuand(r.state), sansQuand(copie(v4))),
                 "pas 5 : 4->5->4 doit tout rendre — " + ecart(sansQuand(r.state), sansQuand(copie(v4))));
  }

  // ---- 5 -> 4 : ce que trois cases ne savent pas porter va au grenier ----
  var v5 = {
    v: 5, name: "Riko",
    reservesLeviers: { pvMax: { force: 80, a1: 5, m1: 2, a4: 9, m3: 0.5 } },
    divers: { endurance: [0, 0, 0] }
  };
  var fige5 = JSON.stringify(v5);
  var d = M.appliquer(copie(v5), 5, 4);
  ok(d.ok, "pas 5 : la descente d'un état natif doit passer");
  if (d.ok) {
    ok(d.state.pvMaxOverride === 80, "pas 5 : le forçage redescend en pvMaxOverride");
    ok(JSON.stringify(d.state.divers.pvMax) === "[5,0,0]",
       "pas 5 : a1 redescend dans la première case, les autres à zéro");
    ok(d.state.reservesLeviers === undefined,
       "pas 5 : la table vidée s'en va, le schéma 4 ne la connaît pas");
    var g = d.state.grenier && d.state.grenier["5"] && d.state.grenier["5"].pv5reste;
    ok(!!g, "pas 5 : les boîtes que trois cases ne portent pas vont au grenier");
    ok(g && g.m1 === 2 && g.a4 === 9 && g.m3 === 0.5,
       "pas 5 : un facteur, un ajout de fin et un second facteur au grenier");
    ok(JSON.stringify(v5) === fige5, "pas 5 : l'état d'origine ne doit pas être modifié");

    var r2 = M.appliquer(d.state, 4, 5);
    ok(r2.ok, "pas 5 : la remontée doit passer");
    if (r2.ok) ok(egal(sansQuand(r2.state), sansQuand(copie(v5))),
                  "pas 5 : 5->4->5 doit tout rendre — " + ecart(sansQuand(r2.state), sansQuand(copie(v5))));
  }

  // ---- un état SANS aucun réglage de PV traverse sans une trace ----
  var nu = { v: 4, name: "Nanachi", pv: 12 };
  var mn = M.appliquer(copie(nu), 4, 5);
  ok(mn.ok && mn.state.reservesLeviers === undefined,
     "pas 5 : un état sans réglage ne doit pas se voir poser de table vide");
  if (mn.ok) {
    var rn = M.appliquer(mn.state, 5, 4);
    ok(rn.ok && egal(sansQuand(rn.state), sansQuand(copie(nu))),
       "pas 5 : un état sans réglage fait l'aller-retour sans une trace");
  }

  // ---- LE CHIFFRE NE BOUGE PAS, et c'est la promesse du pas ----
  // trois modificateurs qui s'additionnent à la base d'un côté, trois ajouts
  // qui s'y additionnent de l'autre : même somme, à la virgule près.
  var av = 7 + 0 + (-3);
  var mm = M.appliquer(copie({ v: 4, divers: { pvMax: [7, 0, -3] } }), 4, 5);
  if (mm.ok) {
    var b = mm.state.reservesLeviers.pvMax;
    var ap = (b.a1 || 0) + (b.a2 || 0) + (b.a3 || 0);
    ok(av === ap, "pas 5 : la somme des trois modificateurs est celle des trois ajouts (" +
                  av + " / " + ap + ")");
  }
})();

// ---------- LE PAS 6, EN PROPRE ----------
// LE CALQUE DU PAS 5 SUR L'AUTRE RÉSERVE, et il se contrôle pareil. Un point
// lui est propre et n'existait pas au pas 5 : les deux réserves partagent LA
// MÊME TABLE « reservesLeviers ». La descente du 6 doit donc y laisser
// « pvMax » intact et n'emporter que « enduranceMax » — c'est le seul endroit
// où un pas peut manger le travail d'un autre.
(function () {
  var M = MiaMigr;

  // ---- 5 -> 6 : le forçage et les trois modificateurs entrent dans la chaîne ----
  var v5 = {
    v: 5, name: "Riko",
    enduranceMaxOverride: 12,
    divers: { endurance: [4, 0, -1], vitesse: [0, 0, 0] },
    reservesLeviers: { pvMax: { force: 90, a1: 7 } }
  };
  var fige5 = JSON.stringify(v5);
  var m = M.appliquer(copie(v5), 5, 6);
  ok(m.ok, "pas 6 : la montée doit passer (" + (m.erreur && m.erreur.message) + ")");
  if (m.ok) {
    var mx = (m.state.reservesLeviers || {}).enduranceMax || {};
    ok(mx.force === 12, "pas 6 : le maximum forcé devient le forçage de la chaîne");
    ok(mx.a1 === 4, "pas 6 : le premier modificateur -> a1");
    ok(mx.a2 === undefined, "pas 6 : un modificateur de ZÉRO ne se range pas");
    ok(mx.a3 === -1, "pas 6 : le troisième modificateur -> a3, signe compris");
    ok(m.state.enduranceMaxOverride === undefined, "pas 6 : l'ancienne clé quitte la racine");
    ok(m.state.divers && m.state.divers.endurance === undefined,
       "pas 6 : les trois cases quittent « divers »");
    var pv = (m.state.reservesLeviers || {}).pvMax || {};
    ok(pv.force === 90 && pv.a1 === 7,
       "pas 6 : les leviers des PV ne bougent pas — la table est commune");
    ok(JSON.stringify(v5) === fige5, "pas 6 : l'état d'origine ne doit pas être modifié");

    var r = M.appliquer(m.state, 6, 5);
    ok(r.ok, "pas 6 : la descente doit passer");
    if (r.ok) ok(egal(sansQuand(r.state), sansQuand(copie(v5))),
                 "pas 6 : 5->6->5 doit tout rendre — " + ecart(sansQuand(r.state), sansQuand(copie(v5))));
  }

  // ---- 6 -> 5 : ce que trois cases ne savent pas porter va au grenier ----
  var v6 = {
    v: 6, name: "Riko",
    reservesLeviers: { enduranceMax: { force: 20, a1: 3, m1: 2, a4: 6, m3: 0.5 } },
    divers: {}
  };
  var fige6 = JSON.stringify(v6);
  var d = M.appliquer(copie(v6), 6, 5);
  ok(d.ok, "pas 6 : la descente d'un état natif doit passer");
  if (d.ok) {
    ok(d.state.enduranceMaxOverride === 20, "pas 6 : le forçage redescend en enduranceMaxOverride");
    ok(JSON.stringify(d.state.divers.endurance) === "[3,0,0]",
       "pas 6 : a1 redescend dans la première case, les autres à zéro");
    // LA TABLE RESTE, MÊME VIDE. Elle a sa place au schéma 5 — blank() la porte
    // et normalize() la repose sans condition — et c'est ce qui distingue ce
    // pas du 5, qui descend vers un schéma 4 où elle n'existe pas. La faire
    // disparaître rendait un état que le schéma 5 n'écrit jamais.
    ok(d.state.reservesLeviers && !Object.keys(d.state.reservesLeviers).length,
       "pas 6 : la table vidée reste, le schéma 5 la connaît");
    var g = d.state.grenier && d.state.grenier["6"] && d.state.grenier["6"].end6reste;
    ok(!!g, "pas 6 : les boîtes que trois cases ne portent pas vont au grenier");
    ok(g && g.m1 === 2 && g.a4 === 6 && g.m3 === 0.5,
       "pas 6 : un facteur, un ajout de fin et un second facteur au grenier");
    ok(JSON.stringify(v6) === fige6, "pas 6 : l'état d'origine ne doit pas être modifié");

    var r2 = M.appliquer(d.state, 5, 6);
    ok(r2.ok, "pas 6 : la remontée doit passer");
    if (r2.ok) ok(egal(sansQuand(r2.state), sansQuand(copie(v6))),
                  "pas 6 : 6->5->6 doit tout rendre — " + ecart(sansQuand(r2.state), sansQuand(copie(v6))));
  }

  // ---- LA TABLE COMMUNE SURVIT À LA DESCENTE DU 6 ----
  // le seul piège propre à ce pas : « pvMax » appartient au 5, et le 6 n'a pas
  // le droit d'emporter la table avec lui parce qu'il a vidé SA clé.
  var duo = { v: 6, reservesLeviers: { pvMax: { a1: 5 }, enduranceMax: { a1: 2 } } };
  var dd = M.appliquer(copie(duo), 6, 5);
  ok(dd.ok && dd.state.reservesLeviers && dd.state.reservesLeviers.pvMax &&
     dd.state.reservesLeviers.pvMax.a1 === 5,
     "pas 6 : la descente laisse « pvMax » dans la table commune");
  ok(dd.ok && dd.state.reservesLeviers && dd.state.reservesLeviers.enduranceMax === undefined,
     "pas 6 : la descente n'emporte que « enduranceMax »");

  // ---- un état SANS aucun réglage d'endurance traverse sans une trace ----
  var nu = { v: 5, name: "Nanachi", endurance: 3 };
  var mn = M.appliquer(copie(nu), 5, 6);
  ok(mn.ok && mn.state.reservesLeviers === undefined,
     "pas 6 : un état sans réglage ne doit pas se voir poser de table vide");
  if (mn.ok) {
    var rn = M.appliquer(mn.state, 6, 5);
    ok(rn.ok && egal(sansQuand(rn.state), sansQuand(copie(nu))),
       "pas 6 : un état sans réglage fait l'aller-retour sans une trace");
  }

  // ---- LA TABLE COMMUNE EXISTE AU SCHÉMA 5, et l'aller-retour doit la rendre ----
  // C'EST LE DÉFAUT QU'UNE REVUE A TROUVÉ ET QUE CE BANC NE VOYAIT PAS : aucun
  // état témoin ne portait « reservesLeviers », alors que blank() la pose et que
  // normalize() la repose SANS CONDITION — cent pour cent des fiches réelles au
  // schéma 5 l'ont, le plus souvent vide. La descente du 6 l'effaçait, et le
  // casier « end6 », déjà pris par la montée, ne pouvait plus le noter.
  var FORMES_5 = [
    ["table vide, forçage nul", { v: 5, name: "Riko", enduranceMaxOverride: null,
      divers: { endurance: [0, 0, 0], vitesse: [0, 0, 0] }, reservesLeviers: {} }],
    ["pvMax seul, rien en END", { v: 5, name: "Riko",
      divers: { vitesse: [0, 0, 0] }, reservesLeviers: { pvMax: { a1: 5 } } }],
    ["table vide sans divers", { v: 5, name: "Riko", reservesLeviers: {} }],
    ["forçage et trois modificateurs", { v: 5, name: "Riko", enduranceMaxOverride: 12,
      divers: { endurance: [4, 0, -1] }, reservesLeviers: {} }]
  ];
  FORMES_5.forEach(function (f) {
    var m6 = M.appliquer(copie(f[1]), 5, 6);
    ok(m6.ok, "pas 6 : " + f[0] + " doit monter");
    if (!m6.ok) return;
    var r5 = M.appliquer(m6.state, 6, 5);
    ok(r5.ok && egal(sansQuand(r5.state), sansQuand(copie(f[1]))),
       "pas 6 : 5->6->5 exact — " + f[0] + " — " +
       ecart(sansQuand(r5.state), sansQuand(copie(f[1]))));
  });

  var FORMES_6 = [
    ["leviers END complets", { v: 6, name: "Riko", divers: {},
      reservesLeviers: { enduranceMax: { force: 20, a1: 3, m1: 2, a4: 6, m3: 0.5 } } }],
    ["END sans forçage", { v: 6, name: "Riko", divers: {},
      reservesLeviers: { enduranceMax: { a1: 3 } } }],
    ["END hors des trois cases", { v: 6, name: "Riko", divers: {},
      reservesLeviers: { enduranceMax: { m1: 2, a4: 6 } } }],
    ["table présente et vide", { v: 6, name: "Riko", divers: {}, reservesLeviers: {} }],
    ["PV seul", { v: 6, name: "Riko", divers: {}, reservesLeviers: { pvMax: { a1: 5 } } }]
  ];
  FORMES_6.forEach(function (f) {
    var d5 = M.appliquer(copie(f[1]), 6, 5);
    ok(d5.ok, "pas 6 : " + f[0] + " doit descendre");
    if (!d5.ok) return;
    ok(d5.state.reservesLeviers !== undefined,
       "pas 6 : " + f[0] + " — la table reste au schéma 5, même vidée");
    var r6 = M.appliquer(d5.state, 5, 6);
    ok(r6.ok && egal(sansQuand(r6.state), sansQuand(copie(f[1]))),
       "pas 6 : 6->5->6 exact — " + f[0] + " — " +
       ecart(sansQuand(r6.state), sansQuand(copie(f[1]))));
  });

  // ---- LE CHIFFRE NE BOUGE PAS, et c'est la promesse du pas ----
  var av = 4 + 0 + (-1);
  var mm = M.appliquer(copie({ v: 5, divers: { endurance: [4, 0, -1] } }), 5, 6);
  if (mm.ok) {
    var b = mm.state.reservesLeviers.enduranceMax;
    var ap = (b.a1 || 0) + (b.a2 || 0) + (b.a3 || 0);
    ok(av === ap, "pas 6 : la somme des trois modificateurs est celle des trois ajouts (" +
                  av + " / " + ap + ")");
  }
})();

// ---------- LE PAS 7, EN PROPRE ----------
// UN RENOMMAGE, ET C'EST TOUT CE QU'IL FAUT CONTRÔLER : que les points et les
// leviers ne bougent pas, que la PREMIÈRE seule soit renommée (speParNom ne lit
// qu'elle), et que la descente rende le nom d'AVANT et non un nom canonique.
(function () {
  var M = MiaMigr;

  function spe(nom, pts, lev) {
    var o = { nom: nom, carac: "", comp: "", pts: pts || 0, bonus: 0 };
    if (lev) o.leviers = lev;
    return o;
  }

  // ---- les deux anciens noms montent, et redescendent tels qu'ils étaient ----
  [["RÉCUP", "le nom du schéma 6"], ["Récupération", "le nom d'avant le 6"]].forEach(function (c) {
    var v6 = { v: 6, name: "Riko", specialites: [
      spe("Esquive", 60), spe(c[0], 280, { valeur: { a1: 5 } }) ] };
    var m = M.appliquer(copie(v6), 6, 7);
    ok(m.ok, "pas 7 : " + c[1] + " doit monter");
    if (!m.ok) return;
    ok(m.state.specialites[1].nom === "RÉCUP PV",
       "pas 7 : " + c[1] + " devient « RÉCUP PV »");
    ok(m.state.specialites[1].pts === 280,
       "pas 7 : " + c[1] + " garde ses points");
    ok(m.state.specialites[1].leviers && m.state.specialites[1].leviers.valeur.a1 === 5,
       "pas 7 : " + c[1] + " garde ses leviers");
    ok(m.state.specialites[0].nom === "Esquive",
       "pas 7 : " + c[1] + " ne touche pas aux autres spécialités");
    var d = M.appliquer(m.state, 7, 6);
    ok(d.ok && egal(sansQuand(d.state), sansQuand(copie(v6))),
       "pas 7 : 6->7->6 exact — " + c[1] + " — " +
       ecart(sansQuand(d.state), sansQuand(copie(v6))));
  });

  // ---- LA PREMIÈRE SEULE. speParNom rend la première et le moteur ignore la
  // seconde : les renommer toutes deux fabriquerait deux « RÉCUP PV », dont
  // l'une coûterait de l'xp sans rien produire. ----
  var deux = { v: 6, name: "Riko",
               specialites: [spe("RÉCUP", 100), spe("Récupération", 50)] };
  var md = M.appliquer(copie(deux), 6, 7);
  ok(md.ok && md.state.specialites[0].nom === "RÉCUP PV" &&
     md.state.specialites[1].nom === "Récupération",
     "pas 7 : la PREMIÈRE seule est renommée");
  if (md.ok) {
    var rd = M.appliquer(md.state, 7, 6);
    ok(rd.ok && egal(sansQuand(rd.state), sansQuand(copie(deux))),
       "pas 7 : 6->7->6 exact avec deux candidates — " +
       ecart(sansQuand(rd.state), sansQuand(copie(deux))));
  }

  // ---- une fiche NÉE au 7 redescend sous le nom que le 6 savait lire ----
  var v7 = { v: 7, name: "Riko", specialites: [spe("RÉCUP PV", 42)] };
  var d7 = M.appliquer(copie(v7), 7, 6);
  ok(d7.ok && d7.state.specialites[0].nom === "RÉCUP",
     "pas 7 : sans souvenir, la descente rend le nom du schéma 6");
  if (d7.ok) {
    var r7 = M.appliquer(d7.state, 6, 7);
    ok(r7.ok && egal(sansQuand(r7.state), sansQuand(copie(v7))),
       "pas 7 : 7->6->7 exact — " + ecart(sansQuand(r7.state), sansQuand(copie(v7))));
  }

  // ---- aucune spécialité de récupération : rien ne se passe, rien ne se range ----
  var nu = { v: 6, name: "Nanachi", specialites: [spe("Esquive", 60)] };
  var mn = M.appliquer(copie(nu), 6, 7);
  ok(mn.ok && mn.state.grenier === undefined,
     "pas 7 : sans candidate, aucun casier n'est posé");
  if (mn.ok) {
    var rn = M.appliquer(mn.state, 7, 6);
    ok(rn.ok && egal(sansQuand(rn.state), sansQuand(copie(nu))),
       "pas 7 : sans candidate, l'aller-retour ne laisse pas une trace");
  }

  // ---- la casse et les espaces ne comptent pas, les ACCENTS si ----
  var casse = { v: 6, name: "Riko", specialites: [spe("  récup  ", 10)] };
  var mc = M.appliquer(copie(casse), 6, 7);
  ok(mc.ok && mc.state.specialites[0].nom === "RÉCUP PV",
     "pas 7 : la casse et les espaces de bordure ne comptent pas");
  var sansAcc = { v: 6, name: "Riko", specialites: [spe("RECUP", 10)] };
  var ma = M.appliquer(copie(sansAcc), 6, 7);
  ok(ma.ok && ma.state.specialites[0].nom === "RECUP",
     "pas 7 : sans accent, ce n'est PAS la même — speParNom ne les ôte pas non plus");
})();

if (echecs.length) {
  console.error("MIGRATIONS : " + echecs.length + " échec(s) sur " + faits + " vérifications (" + duree + " ms)");
  echecs.forEach(function (e) { console.error("  - " + e); });
  process.exit(1);
}
console.log("MIGRATIONS : " + faits + " vérifications, aucune faute (" + duree + " ms)");
console.log("  chaîne " + MiaMigr.SCHEMA_BASE + " -> " + MAX + ", " + Object.keys(TEMOINS).length + " états témoins, aller-retour sur toutes les paires");
