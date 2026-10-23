/* Migration sans sauvegarde de secours dans les attributs Roll20. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const boot=fs.readFileSync('docs/javascripts/owd-roll20-boot.js','utf8'),C=require('../docs/javascripts/owd-sync.js').Compact,M=require('../docs/javascripts/owd-attr-map.js');
assert.doesNotMatch(boot,/function (lotBackup|tenterBackup|erreurSauvegarde)\(/);
assert.doesNotMatch(boot,/sauvegarde de secours.*Roll20/);
const state=M.blank();state.v=17;state.rel='4.5.2b';state.notes='ancienne note';const attrs=C.encode(state),events=[];
const ctx={operationBusy:false,miseANiveauDemandee:false,operationSerial:7,bundleCharge:false,M,C,mem:{},JSON,attrsVus:null,lastAttrs:null,
  startLoading(k){events.push(k);return 7;},sonde(cb,fresh){assert.equal(fresh,true);cb(attrs);},post(m){events.push(m);},chargerBundle(){events.push('bundle');},specCourant(){return {};},erreurMiseAJour(){throw Error('Migration refusée');}};
vm.createContext(ctx);vm.runInContext(boot.slice(boot.indexOf('  function monter('),boot.indexOf("  // ---------- l'écran lui-même")),ctx);ctx.monter(false,{});
assert.equal(ctx.miseANiveauDemandee,true);assert.deepEqual(JSON.parse(ctx.mem['owd-perso']),state);assert.equal(events[1].type,'backup-snapshot');assert.equal(events[1].reason,'migration');assert.equal(events[2],'bundle');assert.ok(!events.some(m=>m.type==='storage-ops'||m.type==='save'));
// Un dépôt local n'est pas attendu pour continuer à ouvrir/migrer.
assert.equal(events.at(-1),'bundle');
console.log('OK mise à niveau : source fraîche, copie locale avant migration, aucun backup/journal Roll20 et aucune attente de stockage local.');
assert.deepEqual(fs.readFileSync('extension/firefox/sync-engine.js'),fs.readFileSync('docs/javascripts/owd-sync.js'));
console.log('OK même moteur de stockage pour la fiche et la restauration dans l’extension.');
