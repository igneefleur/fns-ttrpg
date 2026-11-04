#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync('src/extension/roll20-page/085-stockage.js', 'utf8');
const records = new Map();
const timers = [];
const ctx = {
  Date, JSON, Object, Array, String, Number, Math, Error,
  WRITE_DELAY: 0,
  queue: [], activeJob: null,
  getChar(id) { return records.get(id) || null; },
  models(ch) { return ch && ch.attribs ? ch.attribs.models : []; },
  attrVal(model, key) { return model.get(key); },
  str(value) { return String(value == null ? '' : value); },
  readAll(id) {
    const ch = records.get(id), out = {};
    if (!ch) return out;
    ch.attribs.models.forEach(model => {
      const name = model.get('name');
      if (typeof name === 'string' && name.indexOf('jjk_') === 0)
        out[name] = { current: String(model.get('current') || ''), max: String(model.get('max') || '') };
    });
    return out;
  },
  encoreLa(ch, model) { return ch.attribs.models.indexOf(model) >= 0; },
  detruit(model, ok, fail) {
    const ch = [...records.values()].find(c => c.attribs.models.indexOf(model) >= 0);
    if (!ch) return fail('attribut absent');
    ch.attribs.models.splice(ch.attribs.models.indexOf(model), 1);
    ok();
  },
  setTimeout(fn) { timers.push(fn); return timers.length; }
};
vm.createContext(ctx);
vm.runInContext(source, ctx);
function drainTimers() { while (timers.length) timers.shift()(); }

function model(name, current = '', max = '') {
  const values = { name, current, max };
  return { get(key) { return values[key]; }, values };
}
function character(id, attrs) {
  const ch = { id, attribs: { models: Object.entries(attrs).map(([name, value]) =>
    model(name, typeof value === 'object' && value !== null ? value.current : value,
      typeof value === 'object' && value !== null ? (value.max || '') : '')) } };
  records.set(id, ch);
  return ch;
}
function meta(kind, epoch, payload) {
  const conf = kind === 'narration'
    ? { meta: 'jjk_narr_storage', block: 'jjk_narr_block_' }
    : { meta: 'jjk_storage', block: 'jjk_block_' };
  const name = conf.block + 'live';
  const hash = ctx.stockageHash(payload);
  return { [conf.meta]: JSON.stringify({ format: 2, phase: 'ready', epoch, blocks: { [name]: hash } }), [name]: payload };
}
function refresh(ch) {
  ctx.stockageFraiche[ch.id] = { at: Date.now(), attrs: ctx.readAll(ch.id) };
}

// Fiche : le nettoyage attend la sauvegarde locale de la même époque.
const ficheAttrs = Object.assign(meta('fiche', 'epoch-fiche', '{"ok":true}'), {
  jjk_state: '{"v":4,"name":"Test"}',
  jjk_version: '4.1.0b',
  jjk_nom: 'Test',
  jjk_v_hist: '[{"v":3}]',
  jjk_notes_journal: '{"messages":["ancien"]}',
  jjk_block_orphan: 'bloc orphelin',
  jjk_ops_old: JSON.stringify({ format: 2, epoch: 'ancienne-epoch', ops: [] }),
  jjk_ops_current: JSON.stringify({ format: 2, epoch: 'epoch-fiche', ops: [] }),
  jjk_pv: '12',
  jjk_narr_bg_map: 'data:image/webp;base64,IMAGE',
  bar1_value: '12'
});
const fiche = character('fiche-1', ficheAttrs);
refresh(fiche);
let report = ctx.stockageNettoie(fiche, 'fiche');
assert.equal(report.status, 'pending');
assert.equal(report.stage, 'backup');
assert.ok(fiche.attribs.models.some(m => m.get('name') === 'jjk_nom'), 'aucun attribut ne doit être supprimé avant la sauvegarde');
ctx.stockageSauvegardes[fiche.id] = { fiche: 'epoch-fiche' };
refresh(fiche);
ctx.stockageNettoie(fiche, 'fiche');
drainTimers();
assert.equal(ctx.stockageRapports[fiche.id + ':fiche'].status, 'done');
const ficheNames = new Set(fiche.attribs.models.map(m => m.get('name')));
for (const name of ['jjk_nom', 'jjk_v_hist', 'jjk_notes_journal', 'jjk_block_orphan', 'jjk_ops_old'])
  assert.equal(ficheNames.has(name), false, name + ' doit être nettoyé après sauvegarde');
for (const name of ['jjk_storage', 'jjk_block_live', 'jjk_state', 'jjk_ops_current', 'jjk_version', 'jjk_pv', 'jjk_narr_bg_map', 'bar1_value'])
  assert.equal(ficheNames.has(name), true, name + ' doit être conservé');

// Narration : configuration/jetons migrés nettoyés, images séparées conservées.
const narrAttrs = Object.assign(meta('narration', 'epoch-narr', '{"points":[]}'), {
  jjk_narr_conf: '{"places":[]}',
  jjk_narr_pt_p1: '12,34',
  jjk_narr_bg_p1: 'data:image/webp;base64,FOND',
  jjk_narr_ops_old: JSON.stringify({ format: 2, epoch: 'ancienne-epoch', ops: [] }),
  jjk_narr_ops_current: JSON.stringify({ format: 2, epoch: 'epoch-narr', ops: [] }),
  bar2_value: '7'
});
const narration = character('narr-1', narrAttrs);
refresh(narration);
assert.equal(ctx.stockageNettoie(narration, 'narration').stage, 'backup');
ctx.stockageSauvegardes[narration.id] = { narration: 'epoch-narr' };
refresh(narration);
ctx.stockageNettoie(narration, 'narration');
drainTimers();
assert.equal(ctx.stockageRapports[narration.id + ':narration'].status, 'done');
const narrNames = new Set(narration.attribs.models.map(m => m.get('name')));
for (const name of ['jjk_narr_conf', 'jjk_narr_pt_p1', 'jjk_narr_ops_old'])
  assert.equal(narrNames.has(name), false, name + ' doit être nettoyé après sauvegarde');
for (const name of ['jjk_narr_storage', 'jjk_narr_block_live', 'jjk_narr_ops_current', 'jjk_narr_bg_p1', 'bar2_value'])
  assert.equal(narrNames.has(name), true, name + ' doit être conservé');

console.log('OK nettoyage Compact : sauvegarde préalable, anciens journaux, blocs orphelins, historique, images et attributs natifs');
