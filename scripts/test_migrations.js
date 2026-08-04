/* Épreuve du moteur de migration de la fiche JJK.
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
var JjkMigr;
try {
  JjkMigr = require(path.join(__dirname, "..", "docs", "javascripts", "jjk-migrations.js"));
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
  "fiche vierge": {
    v: 1, name: "", caracsBase: { Mind: 0, Body: 0, Prestance: 0 },
    comps: {}, customComps: [], avantages: [], armes: [], armures: [],
    inv: { texte: [], groupes: ["Sur soi"], objets: [], opts: { cols: 4, nom: true, qte: true, poids: false, total: true } },
    xpTotal: 500, narration: 3, pv: null, de: "1d100"
  },
  "fiche jouée": {
    v: 1, name: "Yûji Itadori", portrait: "", espece: "Humain", age: "16",
    qualites: ["Increvable", "Têtu"], background: "Club d'occultisme",
    caracsBase: { Mind: 30, Body: 55, Prestance: 35 },
    caracsXp: { Mind: 2, Body: 4, Prestance: 0 },
    caracsMod: { Mind: 0, Body: 5, Prestance: -5 },
    compsMod: { "Body/Pique longue": 10, "Mind/Sang-froid": -5 },
    compsForce: { "Body/Discrétion": 40 },
    compsXpForce: {},
    compsXpMod: { "Mind/Concentration": -20 },
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
    divers: { pvMax: [0, 5, 0], regen: [0, 0, 0], vitesse: [1.5, 0, 0] },
    pvMaxOverride: null, vitesseOverride: 10.5, regenOverride: null,
    pv: 37, narration: 2, xpTotal: 620, sansLimite: false, de: "1d100"
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
var MAX = JjkMigr.max();
ok(MAX >= JjkMigr.SCHEMA_BASE, "le registre doit connaître au moins le socle");
ok(JjkMigr.verifier().length === 0, "chaîne incohérente : " + JjkMigr.verifier().join(" / "));

for (var s = JjkMigr.SCHEMA_BASE + 1; s <= MAX; s++) {
  var p = JjkMigr.pas(s);
  ok(!!p, "pas " + s + " absent : la chaîne doit être contiguë depuis le schéma " + JjkMigr.SCHEMA_BASE);
  ok(p && typeof p.monter === "function", "pas " + s + " : monter() doit être une fonction");
  ok(p && typeof p.descendre === "function", "pas " + s + " : descendre() doit être déclaré");
  ok(p && typeof p.notes === "string" && p.notes.length > 0, "pas " + s + " : notes exigées pour l'avertissement");
}
ok(JjkMigr.pas(JjkMigr.SCHEMA_BASE) === null, "le socle ne doit pas porter de pas");

// --------------------------------------- 2. aller-retour sur chaque paire
Object.keys(TEMOINS).forEach(function (nom) {
  for (var de = JjkMigr.SCHEMA_BASE; de <= MAX; de++) {
    for (var vers = JjkMigr.SCHEMA_BASE; vers <= MAX; vers++) {
      var depart = copie(TEMOINS[nom]);
      depart.v = de;
      var fige = JSON.stringify(depart);

      var aller = JjkMigr.appliquer(depart, de, vers);
      ok(aller.ok, nom + " " + de + "->" + vers + " : montée refusée (" + (aller.erreur && aller.erreur.message) + ")");
      if (!aller.ok) continue;
      ok(aller.state.v === vers, nom + " " + de + "->" + vers + " : le schéma doit être estampillé");
      ok(JSON.stringify(depart) === fige, nom + " " + de + "->" + vers + " : l'état d'origine a été modifié");

      var retour = JjkMigr.appliquer(aller.state, vers, de);
      ok(retour.ok, nom + " " + vers + "->" + de + " : descente refusée");
      if (!retour.ok) continue;

      var a = sansQuand(retour.state), b = sansQuand(depart);
      ok(egal(a, b), nom + " " + de + "->" + vers + "->" + de + " : aller-retour non neutre — " + ecart(a, b));

      var g = retour.state.grenier ? JjkMigr.octets(JSON.stringify(retour.state.grenier)) : 0;
      ok(g <= JjkMigr.GRENIER_MAX, nom + " " + de + "->" + vers + " : grenier de " + g + " octets, plafond " + JjkMigr.GRENIER_MAX);
    }
  }
});

// ------------------------------------------------------ 3. déterminisme
// Chaque pas, joué deux fois dans des contextes NEUFS, doit rendre exactement
// le même état, le même journal et les mêmes pertes. Un pas qui lirait
// l'horloge, un compteur global ou Math.random tomberait ici.
Object.keys(TEMOINS).forEach(function (nom) {
  for (var s = JjkMigr.SCHEMA_BASE + 1; s <= MAX; s++) {
    [[s - 1, s], [s, s - 1]].forEach(function (paire) {
      var t = copie(TEMOINS[nom]);
      t.v = paire[0];
      var opts = { par: "test", quand: "2026-08-03T00:00:00.000Z" };
      var r1 = JjkMigr.appliquer(t, paire[0], paire[1], opts);
      var r2 = JjkMigr.appliquer(t, paire[0], paire[1], opts);
      ok(r1.ok && r2.ok, nom + " pas " + paire[0] + "->" + paire[1] + " : refusé");
      ok(egal(r1.state, r2.state), nom + " pas " + paire[0] + "->" + paire[1] + " : état non déterministe — " + ecart(r1.state, r2.state));
      ok(egal(r1.journal, r2.journal), nom + " pas " + paire[0] + "->" + paire[1] + " : journal non déterministe");
      ok(egal(r1.pertes, r2.pertes), nom + " pas " + paire[0] + "->" + paire[1] + " : pertes non déterministes");
    });
  }
});

// ------------------------------------------------------------ 4. résumé
var res = JjkMigr.resume(JjkMigr.SCHEMA_BASE, MAX);
ok(Array.isArray(res) && res.length === MAX - JjkMigr.SCHEMA_BASE, "résumé : un bloc par pas traversé");
ok(res && res.every(function (e) { return e.sens === "montee" && e.notes; }), "résumé : sens et notes attendus en montée");
var resBas = JjkMigr.resume(MAX, JjkMigr.SCHEMA_BASE);
ok(resBas && resBas.every(function (e) { return e.sens === "descente"; }), "résumé : sens attendu en descente");
ok(resBas && resBas[0] && resBas[0].schema === MAX, "résumé : la descente commence par le pas le plus haut");
ok(JjkMigr.resume(1, MAX + 5) === null, "résumé : un trajet impossible rend null, jamais un tableau vide");

// -------------------------------------------- 5. journal de bord (vHist)
(function () {
  var t = copie(TEMOINS["fiche vierge"]);
  var r = JjkMigr.appliquer(t, 1, MAX);
  ok(r.ok && r.state.vHist === undefined, "vHist : un aperçu (sans « par ») ne doit rien inscrire");

  r = JjkMigr.appliquer(t, 1, MAX, { par: "fiche" });
  ok(r.ok && r.state.vHist.length === 1, "vHist : une entrée par migration validée");
  ok(r.state.vHist[0].de === 1 && r.state.vHist[0].vers === MAX && r.state.vHist[0].par === "fiche", "vHist : de / vers / par attendus");
  ok(/^\d{4}-\d\d-\d\dT/.test(r.state.vHist[0].quand), "vHist : horodatage ISO attendu");

  var etat = copie(TEMOINS["fiche vierge"]);
  for (var i = 0; i < 15; i++) {
    var rr = JjkMigr.appliquer(etat, etat.v || 1, etat.v === MAX ? 1 : MAX, { par: "boucle " + i });
    etat = rr.state;
  }
  ok(etat.vHist.length === JjkMigr.VHIST_MAX, "vHist : plafonné à " + JjkMigr.VHIST_MAX + " entrées (" + etat.vHist.length + ")");
  ok(etat.vHist[etat.vHist.length - 1].par === "boucle 14", "vHist : ce sont les DERNIÈRES entrées qui restent");
})();

// ------------------------------------- 6. grenier : aller-retour et plafond
(function () {
  var R = JjkMigr.creer();
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
  var R2 = JjkMigr.creer();
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
  ok(JjkMigr.octets(JSON.stringify(r2.state.grenier)) <= JjkMigr.GRENIER_MAX, "grenier : plafond de 64 Ko tenu");

  ok(JjkMigr.octets("é") === 2 && JjkMigr.octets("a") === 1 && JjkMigr.octets("😀") === 4, "octets : mesure UTF-8, pas UTF-16");
})();

// ----------------------------------- 7. échec d'un pas : rien ne bouge
(function () {
  var R = JjkMigr.creer();
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
  var R3 = JjkMigr.creer();
  R3.ajouter({ schema: 2, titre: "A", notes: "n", monter: function (st) { st.a = 1; }, descendre: function (st) { delete st.a; } });
  R3.ajouter({ schema: 3, titre: "B", notes: "n", monter: function () { throw new Error("boum"); }, descendre: function () {} });
  var t3 = { v: 1 };
  var r3 = R3.appliquer(t3, 1, 3);
  ok(!r3.ok && t3.a === undefined && t3.v === 1, "échec en milieu de chaîne : l'état d'origine reste vierge");
})();

// ------------------------------- 8. refus d'une chaîne trouée et des abus
(function () {
  var R = JjkMigr.creer();
  R.ajouter({ schema: 3, titre: "Orpheline", notes: "n", monter: function () {}, descendre: function () {} });
  ok(R.verifier().length === 1, "chaîne trouée : verifier() doit le dire");
  ok(!R.appliquer({ v: 1 }, 1, 3).ok, "chaîne trouée : appliquer doit refuser de partir");
  ok(R.resume(1, 3) === null, "chaîne trouée : resume doit rendre null");

  var R2 = JjkMigr.creer();
  var leve = function (f) { try { f(); return false; } catch (e) { return true; } };
  ok(leve(function () { R2.ajouter({ schema: 2, titre: "T", notes: "n", monter: function () {} }); }), "ajouter : descendre() manquant doit lever");
  ok(leve(function () { R2.ajouter({ schema: 2, titre: "T", notes: "n", descendre: function () {} }); }), "ajouter : monter() manquant doit lever");
  ok(leve(function () { R2.ajouter({ schema: 1, titre: "T", notes: "n", monter: function () {}, descendre: function () {} }); }), "ajouter : le socle ne peut pas porter de pas");
  ok(leve(function () { R2.ajouter({ schema: 2, titre: "T", monter: function () {}, descendre: function () {} }); }), "ajouter : notes exigées");
  R2.ajouter({ schema: 2, titre: "T", notes: "n", monter: function () {}, descendre: function () {} });
  ok(leve(function () { R2.ajouter({ schema: 2, titre: "T", notes: "n", monter: function () {}, descendre: function () {} }); }), "ajouter : deux pas pour le même schéma doivent lever");

  ok(!JjkMigr.appliquer(null, 1, MAX).ok, "appliquer : un état absent est refusé");
  ok(!JjkMigr.appliquer({ v: 1 }, 1, MAX + 4).ok, "appliquer : un schéma inconnu est refusé");
  ok(!JjkMigr.appliquer({ v: 1 }, "x", 2).ok, "appliquer : un schéma illisible est refusé");
  var memeSchema = JjkMigr.appliquer({ v: 2, name: "A" }, 2, 2);
  ok(memeSchema.ok && memeSchema.journal.length === 0, "appliquer : de == vers ne joue aucun pas");
})();

// ---------------------------------------------------------------- verdict
var duree = Math.round(process.uptime() * 1000);
if (echecs.length) {
  console.error("MIGRATIONS : " + echecs.length + " échec(s) sur " + faits + " vérifications (" + duree + " ms)");
  echecs.forEach(function (e) { console.error("  - " + e); });
  process.exit(1);
}
console.log("MIGRATIONS : " + faits + " vérifications, aucune faute (" + duree + " ms)");
console.log("  chaîne " + JjkMigr.SCHEMA_BASE + " -> " + MAX + ", " + Object.keys(TEMOINS).length + " états témoins, aller-retour sur toutes les paires");
