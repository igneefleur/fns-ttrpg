'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const bootPath = path.join(__dirname, '..', 'docs', 'javascripts', 'jjk-roll20-boot.js');
const boot = fs.readFileSync(bootPath, 'utf8');

// L'écran ne doit plus offrir ni mémoriser un choix de contournement.
for (const forbidden of [
  'jjk-ecran-epingle',
  'Ne plus me demander',
  'PIN_PREFIX',
  'epinglageLu',
  'epinglagePoser',
  'var pin =',
  'caseEp.checked'
]) {
  assert(!boot.includes(forbidden), `Le mécanisme interdit est encore présent : ${forbidden}`);
}

// Les clés laissées par une ancienne version sont purgées ; aucun ancien
// épinglage ne peut survivre à l'ouverture du nouvel amorceur.
assert(boot.includes('purgeAncienEpinglage'));
assert(boot.includes('jjk-r20-version:'));
assert(boot.includes('localStorage.removeItem(k)'));

// La divergence de version doit toujours afficher l'écran de décision.
assert(boot.includes('avecMigrations(function () { ecranVersion(f, relSite, schSite); });'));
console.log('OK : aucun épinglage de version ni écran contournable.');
