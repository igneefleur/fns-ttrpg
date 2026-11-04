#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const comps = fs.readFileSync('src/fiche/fiche/comps.js', 'utf8');
const bundle = fs.readFileSync('docs/javascripts/jjk-fiche.js', 'utf8');
const css = fs.readFileSync('docs/stylesheets/jjk-consultation.css', 'utf8');
const manifest = fs.readFileSync('docs/jjk-manifeste.json', 'utf8');
for (const [name, source] of [['source', comps], ['bundle', bundle]]) {
  assert.match(source, /el\("select", "pc-select pc-edit-field"\)/,
    `${name}: le filtre Tous les champs suit le mode d’édition du module Compétences`);
}
assert.match(css, /html\.jjk-consultation #perso-atelier button:disabled[\s\S]*?cursor: default !important;[\s\S]*?pointer-events: none !important;/,
  'les boutons désactivés ne réagissent pas au survol en Consultation');
assert.match(manifest, /jjk-fiche\.js\?v=82/);
assert.match(manifest, /jjk-roll20\.css\?v=82/);
assert.match(manifest, /jjk-consultation\.css\?v=82/);
console.log('OK : filtre de champ éditable dans le module Compétences ; survol neutralisé pour les boutons désactivés en Consultation');
