#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p, 'utf8');
const boot = read('docs/javascripts/jjk-roll20-boot.js');
const edition = read('src/fiche/socle/170-edition.js');
const persistence = read('src/fiche/socle/120-persistance.js');
const montage = read('src/fiche/socle/320-montage.js');
const progress = read('docs/javascripts/jjk-save-progress.js');
const manifest = JSON.parse(read('docs/jjk-manifeste.json'));

// La barre de mode doit être hors de la racine que le montage vide à chaque
// remontage. C'est la même disposition que docs/javascripts/owd-roll20-boot.js
// sur la branche owd-beta (insertBefore(bar, #perso-fiche)).
assert.match(montage, /root\.innerHTML\s*=\s*""/);
assert.match(boot, /while\s*\(anchor\.parentNode\s*&&\s*anchor\.parentNode\s*!==\s*document\.body\)\s*anchor\s*=\s*anchor\.parentNode/);
assert.match(boot, /document\.body\.insertBefore\(bar,\s*anchor\)/);
assert.doesNotMatch(boot, /app\.parentNode\.insertBefore\(bar,\s*app\)/);

// Une consultation est verrouillée jusqu'au stockage : un contrôle oublié ne
// peut ni muter l'état mémoire ni déclencher une écriture locale.
assert.match(boot, /window\.__jjkCanEdit\s*=\s*function\s*\(\)\s*\{[\s\S]*?window\.__jjkGlobalMode\s*===\s*"edition"[\s\S]*?ready[\s\S]*?!gele[\s\S]*?!versionBloquee/);
assert.match(boot, /if\s*\(ready\s*&&\s*SAVE_KEYS\[k\]\s*&&\s*!window\.__jjkCanEdit\(\)\)\s*return/);
assert.match(boot, /compactSession\.capture\(JSON\.parse\(mem\[k\]\)\)/,
  'les opérations sont capturées synchroniquement avant le dessin du contour');
assert.doesNotMatch(boot, /if\s*\(versionBloquee\s*\|\|\s*\(ready\s*&&\s*!window\.__jjkCanEdit\(\)\)\)\s*return/,
  'les sauvegardes déjà en attente continuent d’être confirmées en Consultation');
assert.match(boot, /if\s*\(!compactSession\.hasBase\s*\|\|\s*window\.__jjkCanEdit\(\)\)\s*compactSession\.capture\(state\)/);

// Le verrou clavier/souris est global, mais conserve les actions de lecture et
// de jeu autorisées par la liste Outward. Les champs de jauge ne sont pas une
// exception à la lecture seule.
assert.match(edition, /function\s+canUseControl\s*\(/);
assert.match(edition, /\.pc-obj-tile/);
assert.match(edition, /\.pc-rollable/);
assert.doesNotMatch(edition, /\.pc-vital-num|\.pc-vital-delta|\.pc-obj-qrow\s+input/);
assert.match(edition, /function\s+guardConsultation\s*\(/);
assert.match(edition, /beforeinput[\s\S]*?keydown[\s\S]*?contextmenu/);
assert.match(edition, /data-jjk-readonly/);
const apply = edition.slice(edition.indexOf('window.__jjkApplyMode = function'), edition.indexOf('// Toutes les interactions'));
assert.ok(apply.indexOf('appliqueVerrouGlobal(surface)') < apply.indexOf('applyEdit(surface'),
  'le verrou global est retiré avant de réappliquer les verrous plus fins de chaque module');

// Chaque save de fiche produit ses instantanés modulaires. Le Tracker reçoit
// les IDs Compact en attente; le Painter ne complète qu'après un read complet
// et l'accusé contenant ces IDs.
assert.match(persistence, /function\s+enregistrementModules\s*\(/);
assert.match(persistence, /window\.__jjkSavingModules\(out\)/);
assert.match(boot, /saveContours\.capture\(values,\s*pending,\s*true\)/);
assert.match(boot, /compactRemote\s*=\s*distant\s*&&\s*!distant\.incomplete\s*\?\s*distant\s*:\s*null/);
assert.match(boot, /saveContours\.confirm\(compactRemote\)/);
assert.match(boot, /savePainter\.sync\(\)/);
assert.match(progress, /M '\s*\+\s*mid\s*\+\s*' '\s*\+\s*y/,
  'le tracé commence au milieu du bord supérieur');
assert.match(progress, /duration:\s*120000/);
assert.match(progress, /400\s*-\s*\(now\s*-\s*r\.finish\)/);
assert.match(progress, /#perso-atelier \.pc-editable\[data-module\]/);

assert.equal(manifest.release, '4.4.5b');
assert.ok(manifest.amorce.every(x => x.includes('?v=83')));
assert.ok(manifest.bundle.js.every(x => x.includes('?v=83')));
console.log('OK intégration : barre persistante, Consultation verrouillée, sauvegarde en attente maintenue et contours confirmés par Roll20');
