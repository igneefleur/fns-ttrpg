#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const edition = fs.readFileSync('src/fiche/socle/170-edition.js', 'utf8');
const bundle = fs.readFileSync('docs/javascripts/jjk-fiche.js', 'utf8');
const boot = fs.readFileSync('docs/javascripts/jjk-roll20-boot.js', 'utf8');

for (const [name, source] of [['source', edition], ['bundle servi', bundle]]) {
  const start = source.indexOf('var verrouObserver = new MutationObserver');
  assert.notEqual(start, -1, `${name}: le verrou dynamique est présent`);
  const end = source.indexOf('verrouObserver.observe', start);
  assert.notEqual(end, -1, `${name}: le verrou dynamique est complet`);
  const observer = source.slice(start, end);
  assert.match(observer, /var root = document\.getElementById\("perso-atelier"\)/,
    `${name}: la racine réelle de la fiche est identifiée`);
  assert.match(observer, /if \(node !== root && !root\.contains\(node\)\)/,
    `${name}: les éléments frères de la fiche ne sont jamais verrouillés`);
  assert.match(observer, /if \(node\.contains && node\.contains\(root\)\) window\.__jjkApplyMode\(root\)/,
    `${name}: le montage d'un conteneur de fiche reste couvert`);
}

assert.match(boot, /button\.id = "jjk-mode-toggle"/,
  'le bouton de changement de mode existe');
assert.match(boot, /document\.body\.insertBefore\(bar, anchor\)/,
  'la barre de mode reste hors de la racine reconstruite de la fiche');
assert.match(boot, /button\.onclick = function \(\)[\s\S]*?post\(\{ type: "presence", action: "mode"/,
  'le bouton reste capable de demander le passage en Édition');
console.log('OK : le verrou Consultation ignore la barre de mode et conserve le bouton de sortie');
