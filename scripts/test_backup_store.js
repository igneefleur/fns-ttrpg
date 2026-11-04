'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { TextEncoder } = require('node:util');

const records = new Map();
function requestFor(tx, work) {
  const req = {};
  tx.pending++;
  setTimeout(() => {
    try { req.result = work(); if (req.onsuccess) req.onsuccess(); }
    catch (e) { req.error = e; if (req.onerror) req.onerror(); }
    finally {
      tx.pending--;
      if (!tx.pending) setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
    }
  }, 0);
  return req;
}
function objectStore(tx) {
  const base = {
    createIndex() {},
    getAll() { return requestFor(tx, () => Array.from(records.values()).map(x => structuredClone(x))); },
    get(id) { return requestFor(tx, () => records.has(id) ? structuredClone(records.get(id)) : undefined); },
    put(row) { return requestFor(tx, () => { records.set(row.id, structuredClone(row)); return row.id; }); },
    delete(id) { return requestFor(tx, () => records.delete(id)); },
    index(name) {
      assert.equal(name, 'character');
      return { getAll(character) { return requestFor(tx, () => Array.from(records.values()).filter(x => x.character === character).map(x => structuredClone(x))); } };
    }
  };
  return base;
}
const db = {
  createObjectStore() { return objectStore({ pending: 0 }); },
  transaction() {
    const tx = { pending: 0, objectStore() { return objectStore(tx); }, oncomplete: null, onerror: null, onabort: null };
    return tx;
  },
  close() {}
};
const indexedDB = { open() {
  const req = {};
  setTimeout(() => {
    req.result = db;
    if (!indexedDB.created) { indexedDB.created = true; if (req.onupgradeneeded) req.onupgradeneeded(); }
    if (req.onsuccess) req.onsuccess();
  }, 0);
  return req;
} };
const listeners = [];
const runtime = { getURL() { return 'moz-extension://jjk/'; }, onMessage: { addListener(fn) { listeners.push(fn); } }, sendMessage() { return Promise.resolve({}); } };
const api = { runtime, storage: { local: { remove() { return Promise.resolve(); }, set() { return Promise.resolve(); } } } };
const context = {
  browser: api, chrome: api, indexedDB, crypto: webcrypto, TextEncoder, Uint8Array,
  JSON, Object, Array, String, Number, Math, Date, Promise, Error, setTimeout, clearTimeout,
  Blob: global.Blob, URL: global.URL, console
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('extension/firefox/backups.js', 'utf8'), context);
const listener = listeners[0];
function ask(message, sender) {
  return new Promise(resolve => {
    const async = listener(message, sender, resolve);
    if (async !== true) resolve(undefined);
  });
}
(async function main() {
  const payload = {
    ns: 'jjk-backups', action: 'save', campaignId: 'campaign-1', charId: 'character-1',
    name: 'Personnage test', reason: 'autosave',
    state: { v: 4, rel: '4.0.1b', name: 'Personnage test', pv: 24 },
    attrs: { jjk_storage: { current: 'photo', max: '' }, jjk_version: { current: '4.0.1b', max: '4' } }
  };
  const saved = await ask(payload, { url: 'https://app.roll20.net/editor/', tab: { id: 7 } });
  assert.equal(saved.ok, true);
  const ext = { url: 'moz-extension://jjk/popup/popup.html' };
  const rows = await ask({ ns: 'jjk-backups', action: 'list' }, ext);
  assert.equal(rows.length, 1);
  const loaded = await ask({ ns: 'jjk-backups', action: 'get', id: rows[0].id }, ext);
  assert.equal(loaded.state.pv, 24);
  assert.equal(loaded.attrs.jjk_storage.current, 'photo');
  console.log('OK sauvegardes IndexedDB : écriture, index personnage, liste et lecture d’un snapshot complet');
  const stored = records.get(rows[0].id);
  stored.raw = stored.raw.replace('photo', 'tampered');
  records.set(stored.id, stored);
  const corrupt = await ask({ ns: 'jjk-backups', action: 'get', id: rows[0].id }, ext);
  assert.equal(corrupt.ok, false);
  assert.match(corrupt.error, /SHA-256/);
  console.log('OK sauvegardes IndexedDB : contenu modifié détecté avant export ou restauration');
})().catch(e => { console.error(e); process.exitCode = 1; });
