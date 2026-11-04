'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const palette = {
  fond: '#080B0C',
  surface: '#0F1415',
  carte: '#171D1E',
  turquoise: '#4A9FA8',
  turquoiseClair: '#78BBC0',
  turquoiseProfond: '#285A60',
  danger: '#C96B62'
};

const fiche = read('docs/stylesheets/jjk-fiche.css');
const narration = read('docs/stylesheets/jjk-narration.css');
const roll20 = read('docs/stylesheets/jjk-roll20.css');
const site = read('docs/stylesheets/night.css');
const overlay = read('extension/firefox/overlay.css');
const popup = read('extension/firefox/popup/popup.css');
const creator = read('extension/firefox/creator.css');
const icon = read('extension/firefox/icons/icon.svg');
const mkdocs = read('mkdocs.yml');
const main = read('overrides/main.html');
const firefoxManifest = JSON.parse(read('extension/firefox/manifest.json'));
const chromeManifest = JSON.parse(read('extension/chrome/manifest.json'));

for (const [label, css] of [
  ['fiche', fiche], ['narration', narration], ['Roll20', roll20],
  ['site', site], ['extension', overlay], ['popup', popup]
]) {
  assert(css.includes(palette.turquoise), `${label} : accent turquoise absent`);
  assert(css.includes(palette.fond) || css.includes(palette.surface), `${label} : fond sombre absent`);
}
assert(creator.includes(palette.fond), 'créateur extension : fond sombre absent');
assert(icon.includes(palette.turquoise), 'icône extension : accent turquoise absent');
assert(icon.includes(palette.fond), 'icône extension : fond sombre absent');
assert.strictEqual(firefoxManifest.version, '4.4.0', 'Firefox : version du paquet non incrémentée');
assert.strictEqual(chromeManifest.version, firefoxManifest.version, 'Chrome et Firefox doivent partager la version du paquet');
assert(fiche.includes(palette.danger), 'fiche : couleur de danger absente');
assert(popup.includes(palette.danger), 'popup : couleur de danger absente');
assert(main.includes('document.documentElement.classList.add("night")'), 'site : thème sombre non forcé avant rendu');
assert(mkdocs.includes('stylesheets/night.css'), 'site : feuille sombre absente');
assert(!mkdocs.includes('javascripts/night.js'), 'site : bouton de bascule jour/nuit encore chargé');

console.log('OK thème JJK : noir et turquoise assourdi sur le site, la fiche, Roll20 et l’extension ; alertes distinctes.');
