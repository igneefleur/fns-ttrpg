'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const boot = read('docs/javascripts/jjk-roll20-boot.js');
const fiche = read('docs/javascripts/jjk-fiche.js');

function extractFunction(source, name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{', 'm');
  const match = re.exec(source);
  assert.ok(match, `fonction absente : ${name}`);
  let i = match.index + match[0].length;
  let depth = 1, quote = null, escape = false;
  for (; i < source.length && depth; i++) {
    const c = source[i];
    if (quote) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}') depth--;
  }
  assert.equal(depth, 0, `fonction non fermée : ${name}`);
  return source.slice(match.index, i);
}

// Le mode bar doit attendre le vrai montage DOM, pas seulement le onload du script.
const poser = extractFunction(boot, 'poserModeBar');
const attendre = extractFunction(boot, 'attendreMontageFiche');
const charger = extractFunction(boot, 'chargerBundle');
assert.match(poser, /document\.querySelector\("\.perso-atelier"\)/);
assert.match(poser, /if \(!app \|\| !app\.parentNode\) return false/);
assert.match(poser, /return true/);
const essayer = extractFunction(boot, 'essayerModeBarAuMontage');
assert.match(essayer, /poserModeBar\(\)/);
assert.match(attendre, /addEventListener\("jjk-fiche-mounted"/);
assert.match(attendre, /MutationObserver/);
assert.match(attendre, /observe\(document\.body, \{ childList: true, subtree: true \}\)/);
assert.match(boot, /function finirAttenteMontageFiche\(\)/);
assert.match(boot, /removeEventListener\("jjk-fiche-mounted"/);
assert.ok(charger.indexOf('attendreMontageFiche();') < charger.indexOf('function chargerScripts()'),
  'le listener est installé avant l’injection des scripts');
assert.match(charger, /bundleCharge = true;[\s\S]*?attendreMontageFiche\(\)/,
  'une vérification de secours est faite après le chargement du bundle');
assert.match(fiche, /dispatchEvent\(new CustomEvent\("jjk-fiche-mounted"\)\)/,
  'la fiche signale le montage effectif de son DOM');

// L'écran de sécurité reprend la palette sombre turquoise de la fiche ; plus d'accent jaune.
const cssEcran = boot.slice(boot.indexOf('"#jjk-ecran{'), boot.indexOf('";\n  function poserStyles'));
assert(cssEcran.includes('#080B0C'));
assert(cssEcran.includes('#0F1415'));
assert(cssEcran.includes('#4A9FA8'));
assert(cssEcran.includes('#78BBC0'));
assert(!/ffd77f|e0cfa0|6b5a2e|#f5f2ea/i.test(cssEcran), 'ancienne palette jaune/beige encore présente dans l’écran');
assert.match(cssEcran, /jjk-ecran-primaire\{background:#4A9FA8;color:#071113;border-color:#4A9FA8/);

console.log('OK écran de sécurité turquoise et bandeau Édition/Consultation après montage réel de la fiche.');
