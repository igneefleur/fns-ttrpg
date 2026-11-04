#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const map = require('../docs/javascripts/jjk-attr-map.js');

const state = map.blank();
state.pv = 37;
state.em = 18;
state.emMax = 52;
const attrs = map.stateToAttrs(state);
assert.deepEqual(JSON.parse(attrs.jjk_etat_courant.current), { pv: 37, em: 18 });
assert.equal(attrs.jjk_em.current, '18');
assert.equal(attrs.jjk_em.max, '52');
assert.equal(attrs.jjk_em_max.current, '52');

// Le chemin de repli sans jjk_state doit aussi préserver la ressource et son maximum.
const fallback = Object.assign({}, attrs);
delete fallback.jjk_state;
const rebuilt = map.attrsToState(fallback);
assert.equal(rebuilt.pv, 37);
assert.equal(rebuilt.em, 18);
assert.equal(rebuilt.emMax, 52);

const mirrors = map.mirrorAttrs(state);
assert.equal(mirrors.jjk_em.current, '18');
assert.equal(mirrors.jjk_em.max, '52');
assert.equal(mirrors.jjk_em_max.current, '52');

const syncSource = fs.readFileSync(require.resolve('../docs/javascripts/jjk-sync.js'), 'utf8');
assert.match(syncSource, /vitales:\['pv','pvMaxOverride','em','emMax'/,
  'Compact doit ranger EM dans le bloc des réserves vitales');
const ficheSource = fs.readFileSync(require.resolve('../src/fiche/fiche/pv.js'), 'utf8');
assert.match(ficheSource, /function buildEm\(\)/);
assert.match(ficheSource, /themeClass: "pc-vital-em"/);
assert.match(ficheSource, /function buildReserve\(cfg\)/);
console.log('OK réserves : PV et EM conservés dans l’état, le repli Roll20 et les attributs miroirs');
