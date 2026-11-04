#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const sourcePont = fs.readFileSync('src/extension/content-roll20/050-pont-page.js', 'utf8')
  .replace(/@@partie@@/g, 'beta')
  .replace(/@@colonne:\d+@@/g, ' ');
const sourceDemande = fs.readFileSync('src/extension/content-roll20/060-has-sheet.js', 'utf8');
const sourceOnglet = fs.readFileSync('src/extension/content-roll20/090-onglet.js', 'utf8');
const sourceDemarrage = fs.readFileSync('src/extension/content-roll20/190-demarrage.js', 'utf8');
const sourceCreateur = fs.readFileSync('src/extension/content-roll20/080-creator.js', 'utf8');
const sourcePageOuverture = fs.readFileSync('src/extension/roll20-page/070-ouverture-fiche.js', 'utf8');
const sourcePageEcouteur = fs.readFileSync('src/extension/roll20-page/090-ecouteur.js', 'utf8');
const sourceBoot = fs.readFileSync('docs/javascripts/jjk-roll20-boot.js', 'utf8');

function minuterie() {
  let prochain = 1;
  const jobs = new Map();
  return {
    jobs,
    setTimeout(fn, ms) { const id = prochain++; jobs.set(id, { fn, ms, active: true }); return id; },
    clearTimeout(id) { const job = jobs.get(id); if (job) job.active = false; },
    runNext() {
      const pair = [...jobs.entries()].find(([, job]) => job.active);
      assert.ok(pair, 'une minuterie active est attendue');
      pair[1].active = false;
      pair[1].fn();
      return pair[1].ms;
    }
  };
}

// L'injection est une demande ponctuelle, comme Outward. Le test de présence
// réel est la séquence has-sheet ci-dessous, pas un ACK JJK supplémentaire.
{
  const messages = [], ecouteurs = [], t = minuterie();
  const top = { postMessage(message) { messages.push(message); } };
  const ctx = {
    window: { top, addEventListener(type, fn) { if (type === 'message') ecouteurs.push(fn); } },
    setTimeout: t.setTimeout, clearTimeout: t.clearTimeout
  };
  vm.createContext(ctx);
  vm.runInContext(sourceDemande, ctx);
  ctx.requestBridge();
  assert.equal(JSON.stringify(messages[0]), JSON.stringify({ ns: 'jjk', type: 'need-bridge' }));
  assert.equal(t.jobs.size, 0, 'la demande d’injection ne crée ni boucle ni délai d’ACK');
  assert.equal(sourceDemande.includes('bridge-ready'), false);
  assert.equal(sourceDemande.includes('bridge-error'), false);
}

// Le pont ne s'injecte qu'une fois dans le document supérieur et garde le
// marqueur durable utilisé par Outward. Les attributs JJK ne portent que le
// contrat de version/capacités consommé par ses règles et ses modules.
{
  const scripts = [], t = minuterie();
  const root = {
    attrs: Object.create(null),
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    setAttribute(k, v) { this.attrs[k] = String(v); }
  };
  const ctx = {
    document: {
      documentElement: root,
      createElement() { const node = { remove() { this.removed = true; } }; scripts.push(node); return node; },
      head: { appendChild(node) { node.appended = true; } }
    },
    browser: { runtime: {
      getManifest() { return { version: '4.3.2.4' }; },
      getURL(path) { return 'moz-extension://test/' + path; }
    } },
    setTimeout: t.setTimeout, clearTimeout: t.clearTimeout
  };
  vm.createContext(ctx);
  vm.runInContext(sourcePont, ctx);
  ctx.injectPageScript();
  ctx.injectPageScript();
  assert.equal(scripts.length, 1, 'le marqueur durable empêche une seconde injection');
  assert.equal(root.getAttribute('data-jjk-bridge'), '1');
  assert.equal(root.getAttribute('data-jjk-extension-version'), '4.3.2.4');
  assert.equal(root.getAttribute('data-jjk-bridge-protocol'), '2');
  assert.match(scripts[0].src, /beta\/roll20-page\.js$/);
  scripts[0].onload.call(scripts[0]);
  assert.equal(scripts[0].removed, true);
  assert.equal(sourcePont.includes('bridge-ready'), false);
  assert.equal(sourcePont.includes('bridge-error'), false);
}

// Le contrôle has-sheet est commun : cinq requêtes espacées de 700 ms, une
// réponse explicite, puis arrêt. Le dernier délai rend null si Roll20 ne répond pas.
{
  const messages = [], ecouteurs = [], t = minuterie();
  const top = { postMessage(message) { messages.push(message); } };
  const ctx = {
    window: { top, addEventListener(type, fn) { if (type === 'message') ecouteurs.push(fn); } },
    setTimeout: t.setTimeout, clearTimeout: t.clearTimeout
  };
  vm.createContext(ctx);
  vm.runInContext(sourceDemande, ctx);
  let resultat = 'en-attente';
  ctx.queryHasSheet('char-1', value => { resultat = value; });
  assert.equal(messages.length, 1);
  assert.equal(JSON.stringify(messages[0]), JSON.stringify({ ns: 'jjk', type: 'has-sheet', charId: 'char-1' }));
  for (let i = 0; i < 4; i++) {
    assert.equal(t.runNext(), 700);
    assert.equal(messages.length, i + 2);
  }
  assert.equal(t.runNext(), 700); // délai final après la cinquième requête
  assert.equal(messages.length, 5);
  assert.equal(resultat, null, 'l’absence de réponse finit en inconnu, jamais en absence de fiche');
}

{
  const messages = [], ecouteurs = [], t = minuterie();
  const top = { postMessage(message) { messages.push(message); } };
  const ctx = {
    window: { top, addEventListener(type, fn) { if (type === 'message') ecouteurs.push(fn); } },
    setTimeout: t.setTimeout, clearTimeout: t.clearTimeout
  };
  vm.createContext(ctx);
  vm.runInContext(sourceDemande, ctx);
  let resultat = null;
  ctx.queryHasSheet('char-2', value => { resultat = value; });
  ecouteurs[0]({ data: { ns: 'jjk', type: 'has-sheet-result', charId: 'char-2', exists: true } });
  assert.equal(resultat, true);
  t.runNext();
  assert.equal(messages.length, 1, 'une réponse reçue arrête les relances');
}

assert.match(sourceDemarrage, /if \(d\.type === "need-bridge"\) \{\s*injectPageScript\(\);/,
  'la frame supérieure utilise la même injection ponctuelle que Outward');
assert.doesNotMatch(sourceDemarrage, /injectPageScript\(ev\.source|requestId/);
assert.match(sourceDemarrage, /if \(IS_EDITEUR\) \{\s*injectPageScript\(\);\s*panDemarre\(\);\s*\}/,
  'le pont est injecté au démarrage de l’éditeur comme dans Outward');
assert.match(sourceOnglet, /requestBridge\(\);\s*populate\(pane, charId\)/,
  'l’onglet demande le pont puis montre exactement l’état de chargement de populate');
assert.doesNotMatch(sourceOnglet, /ouvrePaneJjk|Connexion à l’extension Roll20/);
assert.match(sourceCreateur, /el\("div", "jjk-create", "Chargement…"\)/);
assert.match(sourcePageOuverture, /var attrs = readAll\(ch\.id\)/,
  'la photographie Roll20 reste publiée même quand fetch échoue');
assert.match(sourcePageOuverture, /type: "hydrate",[\s\S]*?fresh: !!ok/,
  'un échec de fetch est signalé comme lecture non fraîche, sans protocole d’erreur JJK');
assert.doesNotMatch(sourcePageOuverture, /hydrate-refresh-error/);
assert.match(sourcePageOuverture, /var resyncJobs = \{\}/,
  'le pont JJK utilise le même ordonnanceur de resynchronisation qu’Outward');
assert.match(sourcePageOuverture, /job\.timer = setTimeout\(function \(\) \{[\s\S]*?resynchronise\(ch\)/,
  'la cadence minimale diffère la lecture sans perdre la demande');
assert.match(sourcePageOuverture, /if \(!ch \|\| !ch\.attribs \|\| typeof ch\.attribs\.fetch !== "function"\) \{[\s\S]*?if \(ch\) publieLecture\(ch, false\)/,
  'une collection sans fetch suit le même chemin de lecture échouée que Outward');
assert.doesNotMatch(sourcePageEcouteur, /hydrate-refresh-error/);
assert.doesNotMatch(sourceBoot, /hydrate-refresh-error/);
assert.match(sourceBoot, /if \(d\.fresh !== true\) \{\s*if \(hydrated\) sondeReponse\(null\);\s*return;/,
  'une lecture non fraîche est ignorée avant hydratation et libère les sondes après hydratation');
assert.match(sourceBoot, /var OPERATION_TIMEOUT = 36000/);
assert.match(sourceBoot, /function startLoading\(kind, step\)/);
assert.match(sourceBoot, /function relireOuverture\(\)[\s\S]*?startLoading\(\"opening\"[\s\S]*?post\(\{ type: \"load\", resync: true, allege: true, viewId: VIEW_ID \}\);/,
  'la relance après erreur reprend le chargement commun et demande une nouvelle lecture');
assert.doesNotMatch(sourceBoot.slice(sourceBoot.indexOf('function relireOuverture()'), sourceBoot.indexOf('function ecranDonneesIncompletes')),
  /setTimeout\(ask, 500\)/, 'le délai central borne également une relance');
assert.match(sourceBoot, /updateLoading\(\"Préparation de la fiche…\"\)/);
assert.match(sourceBoot, /stopLoading\(\);\s*fermerEcran\(\);\s*poserModeBar\(\)/,
  'l’écran de chargement reste présent jusqu’au montage réellement terminé');
assert.doesNotMatch(sourceBoot, /tries > 80/);
console.log('OK parité Outward/JJK : injection ponctuelle, vérification has-sheet, chargement commun et erreur de lecture non fraîche');
