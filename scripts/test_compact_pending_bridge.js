#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('src/extension/roll20-page/085-stockage.js', 'utf8');

const helperStart = source.indexOf('function stockageStable');
const helperEnd = source.indexOf('var STOCKAGE_LEGACY');
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'fonctions de suivi pending introuvables');
const helperSource = source.slice(helperStart, helperEnd);
const harness = `(function(){
  var stockageFraiche = {}, stockageVues = Object.create(null), stockageEnAttente = Object.create(null);
  var queue = [], busy = false, activeJob = null;
  function readAll(){ return {}; }
  function str(v){ return String(v == null ? '' : v); }
  ${helperSource}
  return { stockageFraiche, stockageEnAttente, queue,
    suivre: stockageSuitVue, liberer: stockageLibereVue,
    enAttente: stockageOperationsEnAttente, confirmer: stockageConfirme,
    setActive: function(job){ activeJob = job; },
    setFresh: function(ch,attrs){ stockageFraiche[ch.id] = {at:Date.now(),attrs:attrs}; }
  };
})()`;
const api = vm.runInNewContext(harness, { Date, JSON, Object, Array, String, Math, Number, Error });
const ch = { id: 'character-1' };
const epoch = 'epoch-1';
const op = { id: 'session-a:1', clock: 1, changes: [{ k: '["v","x"]', n: ['v', 1] }] };
const payloadName = 'jjk_stack_inventory-1';
const payload = { current: '{"id":"inventory-1"}', max: '' };
api.setFresh(ch, {});

// Deux vues voient le même identifiant en attente : identique accepté, différent refusé.
api.suivre(ch, 'view-a', 'session-a', 'fiche', epoch, [op], { [payloadName]: payload });
let pending = api.enAttente(ch, 'fiche', epoch);
assert.deepEqual(JSON.parse(JSON.stringify(pending.ops[op.id])), op);
assert.equal(pending.payloads[payloadName], payload.current);
assert.throws(() => api.suivre(ch, 'view-b', 'session-b', 'fiche', epoch,
  [{ ...op, changes: [{ k: '["v","x"]', n: ['v', 2] }] }], {}), /contenu différent/);
api.suivre(ch, 'view-b', 'session-b', 'fiche', epoch, [op], { [payloadName]: payload });
assert.throws(() => api.suivre(ch, 'view-payload-conflict', 'session-p', 'fiche', epoch, [], { [payloadName]: { current: 'different' } }), /Bloc Compact en attente.*contenu différent/);

// La fermeture de la première vue ne détruit rien encore référencé par la seconde.
const journalName = 'jjk_ops_session-a_hash';
const journal = { current: JSON.stringify({ format: 2, epoch, session: 'session-a', ops: [op] }), max: '' };
api.queue.push({ id: ch.id, attrs: { [journalName]: journal, [payloadName]: payload }, tries: 0 });
api.liberer(ch, 'view-a');
assert.equal(api.queue.length, 1, 'le journal partagé doit rester en file');
assert.ok(api.queue[0].attrs[journalName]);
assert.ok(api.queue[0].attrs[payloadName]);

// Quand la dernière vue ferme, les écritures non commencées sont annulées.
api.liberer(ch, 'view-b');
assert.equal(api.queue.length, 0, 'les écritures non commencées d’une vue fermée sont annulées');
assert.equal(api.stockageEnAttente[ch.id], undefined, 'les opérations annulées sont libérées');

// Une écriture déjà sortie de la file survit à pagehide et reste suivie jusqu'à lecture fraîche.
api.suivre(ch, 'view-c', 'session-c', 'fiche', epoch, [op], { [payloadName]: payload });
const active = { id: ch.id, attrs: { [journalName]: journal, [payloadName]: payload }, tries: 0 };
api.setActive(active);
api.liberer(ch, 'view-c');
assert.ok(api.stockageEnAttente[ch.id], 'un job déjà commencé doit rester en attente de confirmation');
const meta = { current: JSON.stringify({ format: 2, phase: 'ready', epoch, blocks: {} }), max: '' };
const confirmed = {
  jjk_storage: meta,
  [journalName]: journal,
  [payloadName]: payload
};
api.setFresh(ch, confirmed);
api.setActive(null);
api.confirmer(ch, confirmed);
assert.equal(api.stockageEnAttente[ch.id], undefined, 'une lecture Roll20 fraîche acquitte opérations et payloads');

console.log('OK Compact pending : collisions inter-vues, références partagées, annulation pagehide, confirmation des jobs en vol');
