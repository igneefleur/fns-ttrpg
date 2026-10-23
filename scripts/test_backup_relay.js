'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('extension/firefox/beta/roll20-page.js','utf8');
(async()=>{
const document=new EventTarget(),sent=[],errors=[],listeners=[];let now=1000,accept=true;
const browser={storage:{local:{set:d=>{errors.push(d);return Promise.resolve();}}},runtime:{onMessage:{addListener:f=>listeners.push(f)},sendMessage:d=>{sent.push(d);return Promise.resolve(accept?{ok:true}:{ok:false,error:'quota'});}}};
const win={};win.top=win;const relay={document,window:win,browser,CustomEvent,JSON,Promise,Date,Math,Error,setTimeout,clearTimeout};vm.createContext(relay);vm.runInContext(fs.readFileSync('extension/firefox/backup-relay.js','utf8'),relay);
const campaign={get:k=>k==='id'?'game-from-model':undefined},state={v:18,rel:'4.19.1b',name:'Fiche'},ch={id:'c',get:()=>state.name};
const ctx={document,CustomEvent,JSON,Math,Number,Object,Array,String,Date:{now:()=>now},campaign:()=>campaign,winCampagne:null,window:win,storageImports:{},backupRequests:{},readSubscriptions:true};ctx.window.OwdSync={Compact:{read:()=>({state,incomplete:false})}};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('  function backupCampaignId('),source.indexOf('  function storageImport(')),ctx);
const settle=()=>new Promise(r=>setImmediate(r));
ctx.backupVerifiedRead(ch,{});assert.equal(ctx.backupRequests['c:automatic'],undefined,'ne pas annoncer de copie avant accusé du stockage');await settle();assert.equal(sent.length,1);assert.equal(sent[0].campaignId,'game-from-model');assert.equal(ctx.backupRequests['c:automatic'],now);
ctx.backupVerifiedRead(ch,{});await settle();assert.equal(sent.length,1);now+=3600001;ctx.backupVerifiedRead(ch,{});await settle();assert.equal(sent.length,2);assert.equal(sent[1].reason,'hourly');
ctx.backupSnapshot(ch,state,'migration');await settle();assert.equal(sent[2].reason,'migration');
ctx.backupSnapshot(ch,state,'opening');await settle();assert.equal(sent[3].reason,'opening','une réouverture produit bien une demande');
now+=3600001;accept=false;ctx.backupVerifiedRead(ch,{});await settle();assert.equal(sent.length,5);assert.ok(errors.length);assert.notEqual(ctx.backupRequests['c:automatic'],now);ctx.backupVerifiedRead(ch,{});await settle();assert.equal(sent.length,5);now+=30001;accept=true;ctx.backupVerifiedRead(ch,{});await settle();assert.equal(sent.length,6);
ctx.campaign=()=>({});win.campaign_id='global-game';assert.equal(ctx.backupCampaignId(),'global-game');delete win.campaign_id;win.location={pathname:'/editor/character/popout-game/c/'};assert.equal(ctx.backupCampaignId(),'popout-game');
let restored;document.addEventListener('owd-backup-restore',ev=>{const d=JSON.parse(ev.detail);document.dispatchEvent(new CustomEvent('owd-backup-restore-result',{detail:JSON.stringify({token:d.token,ok:true})}));});listeners[0]({ns:'owd-backups',action:'restore',snapshot:{state}},null,r=>restored=r);assert.equal(restored.ok,true);
console.log('OK trajet page → relais de contenu → stockage → accusé : identité Backbone sans .id, ouverture, migration, heure simulée, échec non confirmé puis reprise, restauration JSON et fenêtre séparée.');
})().catch(e=>{console.error(e);process.exitCode=1});
