#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p, 'utf8');

const edition = read('src/fiche/socle/170-edition.js');
const boot = read('docs/javascripts/jjk-roll20-boot.js');
const roll20Css = read('docs/stylesheets/jjk-roll20.css');
const reserve = read('src/fiche/fiche/pv.js');
const header = read('src/fiche/socle/190-entete.js');

assert.match(edition, /f\.disabled = !actif/,
  'les champs de construction sont réellement désactivés hors édition');
assert.match(edition, /f\.disabled = !ficheModifiable\(\)/,
  'les champs globaux sont réellement désactivés en Consultation');
assert.match(edition, /MutationObserver/,
  'les champs insérés dynamiquement reçoivent aussi le verrou');
assert.match(edition, /beforeinput[\s\S]*?keydown/,
  'les tentatives de modification clavier et édition sont interceptées');
assert.match(edition, /function guardConsultation/,
  'le mode Consultation possède le verrou global commun à Outward');
assert.match(edition, /\.pc-obj-tile/,
  'les tuiles restent des actions de jeu en Consultation');
assert.doesNotMatch(edition, /\.pc-vital-num/,
  'les champs de ressources restent verrouillés en Consultation comme dans Outward');
assert.match(edition, /\.pc-obj-context-action:not\(\[data-jjk-requires-edit\]\)/,
  'Montrer et Donner restent disponibles sans autoriser les actions de construction');
assert.doesNotMatch(boot, /\bmiseANiveauDemandee\b/,
  'le bouton de mise à niveau ne référence plus une variable inexistante en mode strict');
assert.match(boot, /compactMigrationSentAt/,
  'la photographie initiale Compact est renvoyée à cadence bornée');
assert.doesNotMatch(boot, /enVol\s*=\s*fusion\(enVol,\s*changedMigration\)/,
  'la création initiale du stockage ne devient pas une modification joueur en attente');
assert.match(edition, /if \(!canUseControl\(node\)\)[\s\S]*?node\.disabled = true/,
  'les boutons de construction sont désactivés en Consultation comme dans Outward');
assert.match(roll20Css, /html\.jjk-consultation \.pc-editable \.pc-gear \{ opacity: 1; cursor: default; \}/);
assert.doesNotMatch(roll20Css, /html\.jjk-consultation[^\n]*cursor:\s*not-allowed/);
assert.match(reserve, /el\("input", "pc-vital-num"\)/,
  'la valeur courante PV/EM existe toujours mais reste verrouillée en Consultation');
assert.match(reserve, /el\("input", "pc-vital-delta"\)/);
assert.doesNotMatch(reserve, /pc-vital-num[^\n]*pc-edit-field/);
assert.match(header, /pc-em-max-input/);
assert.match(header, /pc-global-edit-field/,
  'le maximum EM de l’en-tête est verrouillé en Consultation');
console.log('OK consultation : construction et jauges verrouillées, actions de lecture et de jeu conservées');
