'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'../extension/firefox/popup/popup.js'),'utf8');
const code=src.slice(src.indexOf('    elPan.addEventListener'),src.indexOf('    elBeta.addEventListener'));
(async()=>{
 const handlers={},writes=[],messages=[];let reloads=0;
 const c={elPan:{addEventListener:(n,f)=>handlers.toggle=f},elPanReplacer:{addEventListener:(n,f)=>handlers.reset=f},etat:{panneau:true},touche:{},CLE_PAN:'miaPanneauActif',CLE_PAN_BIS:'miaPanneau',CLE_PAN_GEO:'miaPanneauGeo',pose:o=>writes.push(o),rendPieces(){},proposeRechargement:()=>reloads++,flash:s=>messages.push(s),browser:{storage:{local:{remove:()=>Promise.resolve()}}}};
 vm.createContext(c);vm.runInContext(code,c);
 handlers.toggle();assert.equal(c.etat.panneau,false);assert.equal(writes[0].miaPanneau,false);assert.equal(writes[0].miaPanneauActif,false);assert.equal(reloads,1);
 handlers.reset();await Promise.resolve();assert.equal(reloads,2);assert.ok(messages.at(-1).includes('Rechargez'));
 c.browser.storage.local.remove=()=>Promise.reject(Error('storage failure'));handlers.reset();await Promise.resolve();assert.equal(reloads,2);assert.ok(messages.at(-1).includes('Impossible'));
 console.log('Popup narration: PASS (toggle reload, reset reload, storage failure reported).');
})().catch(e=>{console.error(e);process.exitCode=1;});
