#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const read = p => fs.readFileSync(p, 'utf8');
function extractFunction(source, name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{', 'm');
  const match = re.exec(source);
  assert.ok(match, 'fonction absente : ' + name);
  let i = match.index + match[0].length, depth = 1, quote = null, escape = false;
  for (; i < source.length && depth; i++) {
    const c = source[i];
    if (quote) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}') depth--;
  }
  assert.equal(depth, 0, 'fonction non fermée : ' + name);
  return source.slice(match.index, i);
}

const source = read('src/extension/roll20-page/050-joueurs.js');
const bridge = read('extension/firefox/beta/roll20-page.js');
const stable = read('extension/firefox/stable/roll20-page.js');
const boot = read('docs/javascripts/jjk-roll20-boot.js');
const html = read('docs/roll20-fiche.html');
const css = read('docs/stylesheets/jjk-roll20.css');
const manifest = JSON.parse(read('docs/jjk-manifeste.json'));
const extManifest = JSON.parse(read('extension/firefox/manifest.json'));

// La présence est stockée dans jjk_presence et diffusée seulement aux vues du personnage concerné.
assert.match(bridge, /function presenceTraite\(/);
assert.match(stable, /function presenceTraite\(/);
assert.match(bridge, /sharedMode:\s*1/);
assert.equal(manifest.extension.requiredCapabilities.includes('sharedMode'), true);
assert.equal(manifest.extension.requiredCapabilities.includes('perPlayerPresence'), false);
assert.equal(manifest.extension.minVersion, '4.3.2');
assert.equal(extManifest.version, '4.4.0');

const declarations = 'var presenceLocal = {}, presenceKnown = {};';
const funcs = [
  'presenceAcces', 'presenceMerge', 'presenceData', 'presenceChoice', 'presenceRead',
  'presenceModeState', 'presenceDiffusion', 'presencePublie', 'presenceTraite'
].map(n => extractFunction(source, n)).join('\n');
let now = 1000000;
const attrs = {};
const writes = [];
const messages = [];
const ctx = {
  PREFIX: 'jjk_',
  Date: Object.assign(class extends Date {}, { now: () => now }),
  readAll: id => id === 'char-1' ? attrs : {},
  srcFrames: [{ postMessage: msg => messages.push(msg) }, { postMessage: () => assert.fail('diffusion vers un autre personnage') }],
  srcIds: ['char-1', 'char-2'],
  window: { currentPlayer: { id: 'p1', displayname: 'Alice' }, Campaign: {} },
  droits: ch => ({ gm: true, controlledby: '', moi: ch ? 'p1' : '' }),
  getChar: id => id === 'char-1' ? { id } : null,
  enqueue: (id, update) => { writes.push({ id, attrs: update }); Object.assign(attrs, update); }
};
vm.createContext(ctx);
vm.runInContext(declarations + '\n' + funcs, ctx);

// Une fiche neuve ou une valeur historique illisible repart en Consultation.
assert.equal(ctx.presenceRead('char-1').length, 0);
attrs.jjk_presence = { current: '{illisible', max: '' };
assert.equal(ctx.presenceRead('char-1').length, 0);

// Chaque joueur conserve son choix entre ses fenêtres ; le heartbeat d'un autre joueur ne le remplace pas.
ctx.presenceTraite({}, { charId: 'char-1', viewId: 'view-1', action: 'join' });
let rows = ctx.presenceRead('char-1');
assert.equal(rows.length, 1);
assert.equal(rows[0].mode, 'consultation');
ctx.presenceTraite({}, { charId: 'char-1', viewId: 'view-1', action: 'mode', mode: 'edition', requestedAt: now });
rows = ctx.presenceRead('char-1');
assert.equal(rows.find(x => x.view === 'view-1').mode, 'edition');
ctx.window.currentPlayer = { id: 'p2', displayname: 'Bob' };
ctx.presenceTraite({}, { charId: 'char-1', viewId: 'view-2', action: 'heartbeat' });
rows = ctx.presenceRead('char-1');
assert.equal(rows.find(x => x.view === 'view-1').mode, 'edition', 'le mode d’Alice reste partagé entre ses fenêtres');
assert.equal(rows.find(x => x.view === 'view-2').mode, 'consultation', 'un autre joueur ne remplace pas le mode d’Alice');
assert.ok(writes.length >= 2);
assert.ok(messages.length >= 3);
assert.equal(messages.at(-1).charId, 'char-1');
assert.equal(messages.at(-1).modeState.mode, 'consultation', 'le message reflète le mode du joueur à qui il est diffusé');

// Les vues expirées sont retirées et leave ne retire que la fenêtre concernée.
const before = ctx.presenceRead('char-1');
assert.ok(before.some(x => x.view === 'view-1'));
ctx.presenceTraite({}, { charId: 'char-1', viewId: 'view-1', action: 'leave' });
rows = ctx.presenceRead('char-1');
assert.equal(rows.some(x => x.view === 'view-1'), false);
assert.ok(rows.some(x => x.view === 'view-2'));
now += 70000;
assert.equal(ctx.presenceRead('char-1').length, 0, 'les vues trop anciennes expirent');

// Le boot reprend le mode partagé et la présentation des présences d'Outward.
assert.match(boot, /function appliqueMode\(mode\)/);
assert.match(boot, /sharedModeState\.modeAt/);
assert.match(boot, /type: "presence", action: "mode", mode: modePartage === "edition" \? "consultation" : "edition"/);
assert.doesNotMatch(boot, /appliqueMode\(next, presenceViews/);
assert.match(boot, /function renderPresence\(\)/);
assert.match(boot, /En édition : /);
assert.match(boot, /En consultation : /);
assert.match(boot, /function envoyerPresence\(action\)/);
assert.match(boot, /setInterval\(function \(\) \{ envoyerPresence\("heartbeat"\); \}, 10000\)/);
assert.match(boot, /presenceRows = Array\.isArray\(d\.presence\)/);
assert.match(boot, /presencePlayer = d\.player/);
assert.match(css, /#jjk-mode-bar \.jjk-mode-controls/);
assert.match(css, /\.jjk-presence-edition/);
assert.match(css, /justify-content: space-between/);
assert.match(html, /Vérification de l’extension…/);
console.log('OK présence : modes par joueur partagés entre fenêtres, heartbeat neutre, expiration, leave et accusé Roll20');
