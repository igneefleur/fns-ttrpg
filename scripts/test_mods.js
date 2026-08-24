/* Épreuve du moteur de mods de la fiche MIA.
 *
 *   node scripts/test_mods.js
 *
 * Un mod est du code qui VOYAGE AVEC LE PERSONNAGE : ouvrir la fiche d'un autre
 * joueur, c'est recevoir son code. Le seul rempart est le consentement, et il
 * ne vaut que s'il tient dans tous les cas tordus. Ce test tient donc trois
 * invariants, et il doit bloquer une publication si l'un cède :
 *
 *   1. rien ne tourne sans un « oui » explicite, sur CE navigateur ;
 *   2. la moindre lettre changée dans une source redemande l'accord ;
 *   3. aucune entrée de state.mods, si tordue soit-elle, ne fait lever
 *      execute() : un mod ne doit jamais pouvoir empêcher les suivants de
 *      tourner, ni faire tomber le montage de la fiche.
 *
 * Aucune dépendance : pas de framework, pas de DOM, pas de réseau. Un faux
 * localStorage tient lieu de navigateur, ce qui permet au passage de vérifier
 * ce qui s'écrit dedans, et ce qui NE s'y écrit pas.
 */
"use strict";

var path = require("path");

// ------------------------------------------------------- faux navigateur
// Posé AVANT le chargement du moteur : magasin() lit window.localStorage à
// chaque appel, mais autant que le module trouve un monde cohérent d'emblée.
var stock = {};
var refuse = false;      // pour éprouver le repli mémoire (navigation privée)
global.window = {
  get localStorage() {
    if (refuse) throw new Error("localStorage refusé");
    return {
      getItem: function (k) {
        if (refuse) throw new Error("localStorage refusé");
        return Object.prototype.hasOwnProperty.call(stock, k) ? stock[k] : null;
      },
      setItem: function (k, v) {
        if (refuse) throw new Error("localStorage refusé");
        stock[k] = String(v);
      },
      removeItem: function (k) { delete stock[k]; }
    };
  }
};

var MiaMods;
try {
  MiaMods = require(path.join(__dirname, "..", "docs", "javascripts", "mia-mods.js"));
} catch (e) {
  console.error("MODS : le moteur refuse de se charger — " + (e && e.message ? e.message : e));
  process.exit(1);
}

var faits = 0, echecs = [];

function ok(cond, quoi) {
  faits++;
  if (!cond) echecs.push(quoi);
}

function etats(bilan) {
  return bilan.map(function (b) { return b.id + ":" + b.etat; }).join(" ");
}

var INFOS = { version: "3.0.0", schema: 3 };
var SAGE = "Mia.__vu = (Mia.__vu || 0) + 1;";

function oublieTout() {
  stock = {};
  // MEM est interne au moteur : on l'efface en repassant un avis vide sur
  // chaque empreinte qu'on a pu poser (decide('') vaut oubli).
  return null;
}

// ------------------------------------------------------------ 1. empreinte
(function () {
  var a = MiaMods.empreinte("mod", SAGE);
  ok(a === MiaMods.empreinte("mod", SAGE), "empreinte : deux appels identiques donnent la même");
  ok(a !== MiaMods.empreinte("mod", SAGE + " "), "empreinte : un espace de plus la change");
  ok(a !== MiaMods.empreinte("autre", SAGE), "empreinte : l'id entre dedans");
  ok(/^[0-9a-f]{16}$/.test(a), "empreinte : seize chiffres hexadécimaux");

  // le piège du séparateur : sans la longueur de l'id dans le mélange,
  // ("a\nb", "c") et ("a", "b\nc") composeraient le même texte
  ok(MiaMods.empreinte("a\nb", "c") !== MiaMods.empreinte("a", "b\nc"),
     "empreinte : le saut de ligne ne peut pas déplacer la frontière id/source");

  // deux sources voisines : djb2 seul les rendrait presque identiques
  var voisines = {};
  for (var i = 0; i < 400; i++) voisines[MiaMods.empreinte("m", "var x = " + i + ";")] = 1;
  ok(Object.keys(voisines).length === 400, "empreinte : 400 sources voisines, 400 empreintes");
})();

// -------------------------------------------------------- 2. consentement
(function () {
  oublieTout();
  var mods = [{ id: "sage", nom: "Sage", src: SAGE }];
  var emp = MiaMods.empreinte("sage", SAGE);
  var Mia = {};

  var b = MiaMods.execute(mods, Mia, INFOS);
  ok(etats(b) === "sage:attente", "sans avis : le mod attend (" + etats(b) + ")");
  ok(Mia.__vu === undefined, "sans avis : LE MOD N'A PAS TOURNÉ");
  ok(MiaMods.enAttente(mods, INFOS).length === 1, "sans avis : il figure dans les mods en attente");

  MiaMods.decide(emp, "oui");
  b = MiaMods.execute(mods, Mia, INFOS);
  ok(etats(b) === "sage:ok", "avec un oui : le mod tourne (" + etats(b) + ")");
  ok(Mia.__vu === 1, "avec un oui : son code s'est exécuté une fois");
  ok(MiaMods.enAttente(mods, INFOS).length === 0, "avec un oui : plus rien n'attend");

  // le « oui » est rangé dans le navigateur, PAS dans le personnage
  ok(JSON.stringify(mods).indexOf(emp) < 0, "le consentement n'entre pas dans state.mods");
  ok(stock["mia.mods.avis"] && stock["mia.mods.avis"].indexOf(emp) >= 0,
     "le consentement est rangé dans le localStorage du navigateur");
  ok(Object.keys(stock).length === 1, "le moteur n'écrit rien d'autre que sa table d'avis");

  // une lettre de plus : l'accord ne suit pas
  var retouche = [{ id: "sage", nom: "Sage", src: SAGE + "\n// retouche" }];
  b = MiaMods.execute(retouche, {}, INFOS);
  ok(etats(b) === "sage:attente", "un mod retouché redemande l'accord (" + etats(b) + ")");

  MiaMods.decide(emp, "non");
  b = MiaMods.execute(mods, {}, INFOS);
  ok(etats(b) === "sage:refuse", "un refus est une décision, pas une attente (" + etats(b) + ")");
  ok(MiaMods.enAttente(mods, INFOS).length === 0, "un mod refusé ne réclame plus rien");

  MiaMods.decide(emp, "");
  b = MiaMods.execute(mods, {}, INFOS);
  ok(etats(b) === "sage:attente", "l'oubli remet le mod en attente (" + etats(b) + ")");
})();

// ------------------------------------------- 3. localStorage indisponible
(function () {
  oublieTout();
  refuse = true;
  var mods = [{ id: "sage", nom: "Sage", src: SAGE }];
  var emp = MiaMods.empreinte("sage", SAGE);
  var Mia = {};
  var b = MiaMods.execute(mods, Mia, INFOS);
  ok(etats(b) === "sage:attente", "stockage refusé : le mod attend, il ne tourne pas");
  MiaMods.decide(emp, "oui");
  b = MiaMods.execute(mods, Mia, INFOS);
  ok(etats(b) === "sage:ok", "stockage refusé : la décision tient quand même pour la session");
  ok(Mia.__vu === 1, "stockage refusé : le mod a bien tourné");
  refuse = false;
  MiaMods.decide(emp, "");
})();

// ------------------------------------------------------------ 4. verrous
(function () {
  oublieTout();
  var mods = [
    { id: "coupe", nom: "Coupé", actif: false, src: SAGE },
    { id: "futur", nom: "Futur", pour: "9.0.0", src: SAGE },
    { id: "schema", nom: "Schéma", apiMin: 99, src: SAGE },
    { id: "dix", nom: "Dix", pour: "3.10.0", src: SAGE },
    { id: "vieux", nom: "Vieux", pour: "2.0.0", src: SAGE }
  ];
  mods.forEach(function (m) { MiaMods.decide(MiaMods.empreinte(m.id, m.src), "oui"); });
  var b = MiaMods.execute(mods, {}, INFOS);
  var par = {};
  b.forEach(function (x) { par[x.id] = x.etat; });
  ok(par.coupe === "coupe", "l'interrupteur du joueur prime sur tout (" + par.coupe + ")");
  ok(par.futur === "recent", "un mod qui demande une fiche plus récente ne tourne pas");
  ok(par.schema === "recent", "un mod qui demande un schéma plus récent ne tourne pas");
  ok(par.dix === "recent", "3.10.0 est bien PLUS RÉCENT que 3.0.0 (comparaison numérique)");
  ok(par.vieux === "ok", "un mod écrit pour une fiche plus ancienne tourne");

  // même chose sans repère : faute de version connue, on laisse tourner
  var sans = MiaMods.execute([{ id: "futur", pour: "9.0.0", src: SAGE }], {}, null);
  ok(sans[0].etat === "ok", "sans repère de version, le verrou est sauté plutôt qu'inventé");
})();

// --------------------------------------------------- 5. entrées tordues
(function () {
  oublieTout();
  var piege = { id: "piege", nom: "Piégé" };
  Object.defineProperty(piege, "src", { get: function () { throw new Error("accesseur piégé"); },
                                        enumerable: true });
  var mods = [
    null, undefined, 42, "texte", [],
    { id: "" }, { id: "   " },
    { id: "Deux Fois", src: "1" }, { id: "deux-fois", src: "2" },
    piege,
    { id: "vide", src: "" },
    { id: "casse", src: "function ( {" },
    { id: "jette", src: "throw new Error('boum')" },
    { id: "jette-texte", src: "throw 'juste du texte'" },
    { id: "jette-rien", src: "throw null" },
    { id: "boucle", src: "var o = {}; o.o = o; JSON.stringify(o);" },
    { id: "apres", src: SAGE }
  ];
  var n = MiaMods.normalise(mods);
  ok(n.length === 8, "normalise : 8 entrées valides sur " + mods.length + " (obtenu " + n.length + ")");
  ok(n[0].id === "deux-fois", "normalise : « Deux Fois » devient « deux-fois »");
  ok(n.filter(function (m) { return m.id === "deux-fois"; }).length === 1,
     "normalise : le doublon d'id est écarté, le premier garde la place");
  ok(JSON.stringify(mods[7]) === JSON.stringify({ id: "Deux Fois", src: "1" }),
     "normalise : l'entrée d'origine n'est jamais modifiée");

  n.forEach(function (m) { MiaMods.decide(MiaMods.empreinte(m.id, m.src), "oui"); });
  var Mia = {};
  var b;
  try {
    b = MiaMods.execute(mods, Mia, INFOS);
  } catch (e) {
    b = null;
  }
  ok(b !== null, "execute NE LÈVE JAMAIS, quelles que soient les entrées");
  if (b) {
    var par = {};
    b.forEach(function (x) { par[x.id] = x; });
    ok(par.casse && par.casse.etat === "panne", "une source qui ne compile pas est une panne");
    ok(par.casse && par.casse.message, "et la panne porte son message");
    ok(par.jette && par.jette.etat === "panne", "un mod qui jette est une panne");
    ok(par.jette && par.jette.message.indexOf("boum") >= 0, "le message dit pourquoi");
    ok(par["jette-texte"] && par["jette-texte"].etat === "panne", "jeter du texte est une panne");
    ok(par["jette-rien"] && par["jette-rien"].etat === "panne", "jeter null est une panne");
    ok(par.boucle && par.boucle.etat === "panne", "un objet circulaire casse SON mod, pas le moteur");
    ok(par.apres && par.apres.etat === "ok", "LE MOD SUIVANT TOURNE QUAND MÊME");
    ok(Mia.__vu === 1, "et son code s'est bien exécuté");
    ok(b.length === n.length, "le bilan porte tous les mods normalisés, tournés ou non");
  }
})();

// ------------------------------------------------- 6. propriétaire des filtres
(function () {
  oublieTout();
  var vus = [];
  var Mia = { __proprietaire: function (id) { vus.push(id); } };
  var mods = [{ id: "un", src: SAGE }, { id: "deux", src: "throw new Error('x')" }];
  mods.forEach(function (m) { MiaMods.decide(MiaMods.empreinte(m.id, m.src), "oui"); });
  MiaMods.execute(mods, Mia, INFOS);
  ok(vus.length === 4, "le propriétaire est posé et rendu pour chaque mod (" + vus.join(",") + ")");
  ok(vus[0] === "un" && vus[1] === null, "posé à l'entrée, rendu à la sortie");
  ok(vus[2] === "deux" && vus[3] === null, "RENDU MÊME QUAND LE MOD JETTE");
})();

// --------------------------------------------- 7. deux onglets, un navigateur
// Le cas courant, pas le cas tordu : le joueur a la fiche ouverte sur le site
// ET dans l'iframe Roll20. Deux pages de même origine, donc UN localStorage
// partagé, mais deux exécutions du moteur, chacune avec son repli mémoire. Une
// décision prise dans l'une ne doit jamais être écrasée par la mémoire de
// l'autre : sinon une révocation disparaît sans un mot et le mod repart.
(function () {
  oublieTout();
  // Une instance du module = un onglet : son MEM lui appartient, le « stock »
  // est commun. Le cache de require est vidé pour en obtenir une neuve, ce qui
  // simule aussi bien un second onglet qu'un onglet rouvert.
  var chemin = require.resolve(path.join(__dirname, "..", "docs", "javascripts", "mia-mods.js"));
  function onglet() {
    delete require.cache[chemin];
    return require(chemin);
  }
  var A = MiaMods, B = onglet();
  ok(A !== B, "deux onglets : deux instances distinctes du moteur");

  var srcX = "Mia.__x = 1;", srcY = "Mia.__y = 1;";
  var modsX = [{ id: "x", nom: "X", src: srcX }];
  var eX = A.empreinte("x", srcX), eY = A.empreinte("y", srcY);

  A.decide(eX, "oui");
  ok(B.avis(eX) === "oui", "l'autorisation prise dans un onglet vaut dans l'autre");
  ok(B.execute(modsX, {}, INFOS)[0].etat === "ok", "et le mod y tourne");

  // le mod déraille : le joueur le refuse dans le second onglet
  B.decide(eX, "non");
  // puis il retourne au premier, TOUJOURS OUVERT, et y tranche autre chose
  A.decide(eY, "oui");

  // Le refus est masqué dans B par sa propre mémoire : c'est au MONTAGE
  // SUIVANT que le mod ressuscitait, quand un onglet neuf relit la table du
  // navigateur. D'où cette troisième instance, qui n'a rien retenu de rien.
  var C = onglet();
  ok(C.avis(eX) === "non", "LA RÉVOCATION TIENT : la mémoire d'un onglet ne réécrit pas la table entière");
  var b = C.execute(modsX, {}, INFOS);
  ok(etats(b) === "x:refuse", "le mod refusé ne repart pas au montage suivant (" + etats(b) + ")");
  ok(B.avis(eX) === "non", "l'onglet qui a refusé lit toujours son refus");
  ok(A.avis(eX) === "non", "l'onglet qui avait autorisé relit le refus au lieu de s'accrocher au sien");
  ok(A.avis(eY) === "oui", "sa propre décision, elle, tient");

  // sens inverse : le refus vient du premier onglet, la décision de trop du second
  B.decide(eX, "oui");
  A.decide(eX, "non");
  B.decide(eY, "");
  ok(A.avis(eX) === "non" && onglet().avis(eX) === "non", "le sens inverse tient aussi");

  A.decide(eX, "");
  ok(stock["mia.mods.avis"] === "{}", "une fois tout oublié, la table du navigateur est vide");
})();

// ---------------------------------------------------------------- verdict
var duree = Math.round(process.uptime() * 1000);
if (echecs.length) {
  console.error("MODS : " + echecs.length + " échec(s) sur " + faits + " vérifications (" + duree + " ms)");
  echecs.forEach(function (e) { console.error("  - " + e); });
  process.exit(1);
}
console.log("MODS : " + faits + " vérifications, aucune faute (" + duree + " ms)");
console.log("  consentement, empreinte, verrous de version, entrées tordues, propriétaire");
