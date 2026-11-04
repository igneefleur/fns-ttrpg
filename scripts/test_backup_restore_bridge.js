'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const bridgeCode = fs.readFileSync('extension/firefox/stable/roll20-page.js', 'utf8');

function attr(name, current, max = '', owner) {
  const model = {
    attributes: { name, current, max },
    get(k) { return this.attributes[k]; },
    set(values) { Object.assign(this.attributes, values); },
    save(_attrs, callbacks) {
      const self = this;
      setTimeout(() => {
        if (self.failSave) callbacks.error(self, { message: 'refus de test' });
        else callbacks.success(self);
      }, self.delay || 5);
    },
    destroy(callbacks) {
      const self = this;
      setTimeout(() => {
        const rows = self.owner && self.owner.models || [];
        const at = rows.indexOf(self);
        if (at >= 0) rows.splice(at, 1);
        callbacks.success(self);
      }, 2);
    }
  };
  model.owner = owner || null;
  return model;
}

async function run(failDuplicate) {
  const handlers = Object.create(null), docHandlers = Object.create(null);
  const results = [];
  const collection = { models: [], create(data) { const m = attr(data.name, data.current, data.max, this); this.models.push(m); return m; }, fetch(options) { if (options && options.success) options.success(this); } };
  const duplicateA = attr('jjk_block_core', 'old-first', '', collection);
  const duplicateB = attr('jjk_block_core', 'old-last', '', collection);
  duplicateA.delay = 8;
  duplicateB.delay = 40;
  duplicateB.failSave = failDuplicate;
  collection.models.push(
    attr('jjk_storage', 'old-photo', '', collection), attr('jjk_version', '3.6.1b', '', collection),
    duplicateA, duplicateB,
    attr('jjk_ops_after_backup', 'journal-after-backup', '', collection),
    attr('jjk_block_obsolete', 'payload-after-backup', '', collection),
    attr('jjk_presence', 'presence-current', '', collection),
    attr('jjk_narr_storage', 'narration-independent', '', collection),
    attr('native_hp', '42', '', collection)
  );
  const character = {
    id: 'character-1', attribs: collection,
    get(k) { return k === 'name' ? 'Test JJK' : ''; }
  };
  const campaign = { id: 'campaign-1', characters: { get(id) { return id === character.id ? character : null; }, models: [character] }, players: { models: [] } };
  const document = {
    addEventListener(name, fn) { (docHandlers[name] ||= []).push(fn); },
    dispatchEvent(ev) {
      (docHandlers[ev.type] || []).forEach(fn => fn(ev));
      if (ev.type === 'jjk-backup-restore-result') results.push(JSON.parse(ev.detail));
      return true;
    }
  };
  const ctx = {
    window: null, document, Campaign: campaign, location: { pathname: '/editor/' },
    CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
    Date, JSON, Object, Array, String, Number, Math, RegExp, Error, Promise,
    setTimeout, clearTimeout, setInterval() { return 1; }, clearInterval() {}, isFinite,
    console: { log() {}, warn() {}, error() {} }
  };
  ctx.window = ctx;
  ctx.top = ctx;
  ctx.closed = false;
  ctx.addEventListener = function (name, fn) { (handlers[name] ||= []).push(fn); };
  ctx.postMessage = function () {};
  vm.createContext(ctx);
  vm.runInContext(bridgeCode, ctx, { filename: 'roll20-page.js' });

  const snapshot = {
    campaignId: 'campaign-1', charId: 'character-1',
    state: { v: 4, rel: '4.0.1b', name: 'Test JJK', pv: 24 },
    attrs: {
      jjk_storage: { current: 'new-photo', max: '' },
      jjk_version: { current: '4.0.1b', max: '4' },
      jjk_block_core: { current: 'new-core-block', max: '' }
    }
  };
  document.dispatchEvent(new ctx.CustomEvent('jjk-backup-restore', {
    detail: JSON.stringify({ token: 'restore-test', snapshot })
  }));

  const deadline = Date.now() + 10000;
  while (!results.length && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(results.length, 1, 'le pont doit répondre exactement une fois');
  const result = results[0];
  assert.equal(result.token, 'restore-test');
  const values = Object.create(null);
  collection.models.forEach(m => { values[m.get('name')] = m.get('current'); });

  if (failDuplicate) {
    assert.equal(result.ok, false, 'un seul refus parmi les doublons doit faire échouer la restauration');
    assert.match(result.error, /refus/i);
    assert.equal(values.jjk_ops_after_backup, 'journal-after-backup', 'un échec ne doit pas lancer le ménage destructif');
  } else {
    assert.equal(result.ok, true, result.error || 'restauration attendue');
    assert.equal(values.jjk_storage, 'new-photo');
    assert.equal(values.jjk_version, '4.0.1b');
    assert.equal(values.jjk_block_core, 'new-core-block');
    assert.equal(Object.prototype.hasOwnProperty.call(values, 'jjk_ops_after_backup'), false, 'les journaux postérieurs doivent être retirés');
    assert.equal(Object.prototype.hasOwnProperty.call(values, 'jjk_block_obsolete'), false, 'les payloads postérieurs doivent être retirés');
    assert.equal(values.jjk_narr_storage, 'narration-independent', 'Narration reste isolé');
    assert.equal(values.native_hp, '42', 'les attributs natifs restent intacts');
  }
}

(async function main() {
  await run(false);
  console.log('OK restauration Roll20 : écritures confirmées, doublons, purge des journaux postérieurs, Narration et attributs natifs préservés');
  await run(true);
  console.log('OK restauration Roll20 : un refus tardif parmi les doublons bloque la confirmation et le ménage');
})().catch(e => { console.error(e); process.exitCode = 1; });
