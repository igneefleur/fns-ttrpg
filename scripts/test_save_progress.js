#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { Tracker, progress } = require('../docs/javascripts/jjk-save-progress.js');

assert.equal(progress(0), 0);
assert.equal(progress(12000), 0.75);
assert.equal(progress(60000), 0.95);
assert.equal(progress(120000), 0.98);
assert.equal(progress(180000), 0.98, 'le contour reste à 98 % tant que Roll20 ne confirme pas');

let now = 100;
const tracker = new Tracker(() => now);
tracker.capture({ pv: 'plein', em: 'plein' }, {}, false); // photographie de départ
now = 250;
tracker.capture({ pv: 'blessé', em: 'plein' }, { 'op:pv:1': true }, true);
assert.equal(tracker.records.pv.phase, 'pending');
assert.equal(tracker.records.pv.start, 250);
assert.deepEqual(tracker.records.pv.ids, ['op:pv:1']);
assert.equal(tracker.records.em, undefined, 'un module inchangé ne reçoit pas de contour');

now = 12000;
tracker.confirm({ incomplete: true, ids: { 'op:pv:1': true } });
assert.equal(tracker.records.pv.phase, 'pending', 'une lecture incomplète ne vaut jamais un accusé');
tracker.confirm({ ids: {} });
assert.equal(tracker.records.pv.phase, 'pending', 'un identifiant absent ne confirme rien');

// Une opération remplacée avant envoi transmet la dépendance au nouvel ID.
now = 13000;
tracker.capture({ pv: 'blessé', em: 'plein' }, { 'op:pv:2': true }, true);
assert.deepEqual(tracker.records.pv.ids, ['op:pv:2']);
tracker.confirm({ ids: { 'op:pv:1': true } });
assert.equal(tracker.records.pv.phase, 'pending', 'un ancien ID ne valide pas la nouvelle écriture');
now = 14000;
tracker.confirm({ ids: { 'op:pv:2': true } });
assert.equal(tracker.records.pv.phase, 'finishing');
assert.equal(tracker.records.pv.finish, 14000);

const painter = fs.readFileSync(require.resolve('../docs/javascripts/jjk-save-progress.js'), 'utf8');
assert.match(painter, /duration: 120000/);
assert.match(painter, /400 - \(now - r\.finish\)/);
assert.match(painter, /duration: left/);
console.log('OK progression : 75 % à 12 s, 95 % à 60 s, 98 % à 120 s, fin sur accusé Roll20 en 400 ms');
