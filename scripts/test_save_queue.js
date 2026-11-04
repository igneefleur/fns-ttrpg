#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
  const timers = [];
  const writes = [];
  const context = vm.createContext({
    WRITE_DELAY: 60,
    narrId: 'narration-id',
    ecrivable: name => typeof name === 'string' && name.indexOf('jjk_') === 0,
    getChar: id => ({ id }),
    etatAttributs: () => 'sur',
    writeOne: (ch, name, value) => writes.push({ id: ch.id, name, current: value.current }),
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }
  });
  const source = fs.readFileSync('src/extension/roll20-page/040-file-ecriture.js', 'utf8');
  vm.runInContext(source + '\nthis.__queueTest = { enqueue: enqueue, snapshot: function(){ return { busy: busy, queue: queue.map(function(j){ return {id:j.id, attrs:j.attrs, tries:j.tries}; }), active: activeJob }; } };', context);
  return {
    api: context.__queueTest,
    timers,
    writes,
    tick() {
      const timer = timers.shift();
      assert.ok(timer, 'un passage de file doit être programmé');
      assert.equal(timer.ms, 60, 'un attribut est espacé de WRITE_DELAY');
      timer.fn();
    },
    drain() { while (timers.length) this.tick(); }
  };
}

// Les lots en attente d'un même personnage sont fusionnés et la dernière
// valeur d'un attribut remplace la valeur périmée.
{
  const h = harness();
  h.api.enqueue('char-a', { jjk_nom: { current: 'initial', max: '' } });
  assert.equal(h.writes[0].name, 'jjk_nom');
  h.api.enqueue('char-a', {
    jjk_note: { current: 'note', max: '' },
    jjk_storage: { current: 'ancienne-meta', max: '' }
  });
  h.api.enqueue('char-a', { jjk_storage: { current: 'meta-récente', max: '' } });
  let snap = h.api.snapshot();
  assert.equal(snap.queue.length, 1, 'un seul lot en attente par personnage');
  assert.equal(snap.queue[0].attrs.jjk_storage.current, 'meta-récente');
  h.tick();
  assert.equal(h.writes[1].name, 'jjk_note');
  h.drain();
  assert.ok(h.writes.some(w => w.name === 'jjk_storage' && w.current === 'meta-récente'));
}

// Les blocs/piles passent avant les journaux, eux-mêmes avant le manifeste.
{
  const h = harness();
  h.api.enqueue('char-a', { jjk_nom: { current: 'départ', max: '' } });
  h.api.enqueue('char-a', { jjk_storage: { current: 'meta', max: '' } });
  h.api.enqueue('char-a', {
    jjk_storage: { current: 'meta', max: '' },
    jjk_ops_session: { current: 'journal', max: '' },
    jjk_stack_item: { current: 'pile', max: '' },
    jjk_block_base: { current: 'bloc', max: '' }
  });
  const avant = h.writes.length;
  h.drain(); // vide le premier attribut actif, puis les lots prioritaires
  const suite = h.writes.slice(avant).map(w => w.name);
  // Blocs et piles partagent la priorité 0 comme Outward ; à priorité égale,
  // l'ordre d'insertion est conservé (ici la pile précède le bloc).
  assert.deepEqual(suite, ['jjk_stack_item', 'jjk_block_base', 'jjk_ops_session', 'jjk_storage']);
}

// Un journal d'un autre personnage peut passer devant un lot ordinaire en attente.
{
  const h = harness();
  h.api.enqueue('char-a', { jjk_nom: { current: 'actif', max: '' } });
  h.api.enqueue('char-a', { jjk_note: { current: 'ordinaire', max: '' } });
  h.api.enqueue('char-b', { jjk_ops_b: { current: 'journal', max: '' } });
  h.tick();
  assert.equal(h.writes[1].id, 'char-b');
  assert.equal(h.writes[1].name, 'jjk_ops_b');
}

// L'indicateur `lost` est ramené à une confirmation en retard, sans retirer
// l'opération pending ni altérer le reste du résultat de lecture.
{
  const source = fs.readFileSync('docs/javascripts/jjk-save-flow.js', 'utf8');
  function Session() { this.pending = { op1: { id: 'op1' } }; }
  Session.prototype.receive = function () { return { state: { pv: 12 }, lost: true, conflict: false }; };
  const context = vm.createContext({ window: { JjkSync: { Compact: { Session } } } });
  vm.runInContext(source, context);
  const session = new Session();
  const result = session.receive({});
  assert.equal(result.lost, false);
  assert.equal(result.confirmationEnRetard, true);
  assert.equal(result.conflict, false);
  assert.equal(result.state.pv, 12);
  assert.ok(session.pending.op1, 'la modification reste en attente de son véritable accusé');
}

console.log('OK file de sauvegarde JJK : fusion, priorité Compact, inter-personnages et attente sans fausse erreur');
