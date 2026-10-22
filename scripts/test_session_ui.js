/* Délais et fusions de présence avec horloge déterministe. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const bridge=fs.readFileSync('extension/firefox/beta/roll20-page.js','utf8'),ctx={Date,Number,Object,Array,JSON};vm.createContext(ctx);vm.runInContext(bridge.slice(bridge.indexOf('  function mergePresence('),bridge.indexOf('  function presenceData(')),ctx);
const now=100000,r=(player,mode,at=now,seq=1,left=false)=>({player,name:player,mode,at,seq,left});
let merged=ctx.mergePresence({a:r('Alice','edition')},{b:r('Bob','consultation')},now);assert.deepEqual(Object.keys(merged).sort(),['a','b']);
merged=ctx.mergePresence(merged,{a:r('Alice','consultation',now+1,2)},now+1);assert.equal(merged.a.mode,'consultation');
merged=ctx.mergePresence(merged,{a:r('Alice','edition',now,1)},now+2);assert.equal(merged.a.mode,'consultation','un ancien paquet ne ressuscite pas le mode');
merged=ctx.mergePresence(merged,{a:r('Alice','consultation',now+3,3,true)},now+3);assert.equal(merged.a.left,true);
assert.equal(Object.values(merged).filter(r=>!r.left&&now+30000-r.at<30000).length,0,'expiration à 30 s');
const reverse=ctx.mergePresence({b:r('Bob','edition')},{a:r('Alice','consultation')},now);const forward=ctx.mergePresence({a:r('Alice','consultation')},{b:r('Bob','edition')},now);assert.equal(JSON.stringify(Object.keys(reverse).sort()),JSON.stringify(Object.keys(forward).sort()));
const boot=fs.readFileSync('docs/javascripts/owd-roll20-boot.js','utf8');
let time=0,banners=[],status=[],closed=0,pending={one:{}};const save={Date:{now:()=>time},window:{},document:{getElementById:()=>({dataset:{owdRaison:'recording'}})},setTimeout(){},clearTimeout(){},saveStatus:'',firstPendingAt:0,saveFailure:'',preparationFailed:false,ready:true,collaboration:{pending},bandeau(text){banners.push(text);return {dataset:{}};},fermerBandeau(){closed++;},scheduleSave(){},post(){},exporter(){}};vm.createContext(save);vm.runInContext(boot.slice(boot.indexOf('  function afficheErreurEnregistrement('),boot.indexOf('  function scheduleSave(')),save);save.statutEnregistrement=t=>status.push(t);
time=1;save.actualiseStatutEnregistrement(false);assert.equal(banners.length,0);time=9001;save.collaboration.pending.two={};save.actualiseStatutEnregistrement(false);assert.equal(banners.length,0);time=10001;save.actualiseStatutEnregistrement(false);assert.match(banners.at(-1),/^Enregistrement en attente/);save.saveFailure='préparation impossible';save.actualiseStatutEnregistrement(false);assert.match(banners.at(-1),/^Impossible d’enregistrer/);save.collaboration.pending={};save.actualiseStatutEnregistrement(false);assert.equal(closed,1);assert.equal(save.firstPendingAt,0);assert.equal(status.at(-1),'Enregistré');
vm.runInContext(boot.slice(boot.indexOf('  function compareExtension('),boot.indexOf('  function verifyExtension(')),save);
assert.equal(save.compareExtension('4.2.0.1','4.2.0.2'),-1);assert.equal(save.compareExtension('4.2.0','4.2.0.0'),0);assert.equal(save.compareExtension('invalid','4.2.0'),null);
save.window.__owdSaveFailure('invalid');save.actualiseStatutEnregistrement(false);assert.match(banners.at(-1),/^Impossible/);save.window.__owdSaveFailure('');assert.equal(save.saveFailure,'');
assert.doesNotMatch(boot,/Ne plus me demander|function epinglage|Afficher les détails techniques/);
console.log('OK présence : fusion, paquets retardés, départ, expiration ; enregistrement : premier délai conservé, deux erreurs exclusives, confirmation.');

// Les mises à jour natives ciblent leurs modules ; une clé inconnue garde le chemin complet.
const source=fs.readFileSync('src/fiche/socle/310-api-publique.js','utf8'),begin=source.indexOf('  function recoitEtatCollaboratif('),end=source.indexOf('  window.Owd =',begin);
const live={SCHEMA:18,JSON,Object,Array,Error,state:{v:18,name:'Alice',etat:{pv:100,pe:80,pm:20,ps:12},notes:{format:1,messages:[]}},normalize:s=>s,modulesPersoActifs:()=>false,rootEl:{querySelectorAll:()=>[]},document:{activeElement:null},window:{scrollX:0,scrollY:0,scrollTo(){}},journalTemps:[],effVu:null,effMaxVu:{},calls:0,mounts:0,rebuilt:[]};live.refresh=()=>live.calls++;live.remount=()=>live.mounts++;live.reconstruitModules=ids=>live.rebuilt.push(...ids);vm.createContext(live);vm.runInContext(source.slice(begin,end),live);
let next=JSON.parse(JSON.stringify(live.state));next.etat.pe=63;live.recoitEtatCollaboratif(next);assert.equal(live.state.etat.pe,63);assert.equal(live.mounts,0);assert.equal(live.calls,1);
next=JSON.parse(JSON.stringify(live.state));next.notes.messages.push({id:'n',text:'Note reçue'});live.recoitEtatCollaboratif(next);assert.deepEqual(live.rebuilt,[]);assert.equal(live.mounts,0);
next=JSON.parse(JSON.stringify(live.state));next.future={x:1};live.recoitEtatCollaboratif(next);assert.equal(live.mounts,1);assert.equal(live.state.future.x,1);
console.log('OK réceptions ciblées : réserves et Notes sans remontage ; clé inconnue avec reconstruction complète.');
