'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const B=require('../docs/javascripts/owd-sync.js').Compact,M=require('../docs/javascripts/owd-attr-map.js');
const boot=fs.readFileSync('docs/javascripts/owd-roll20-boot.js','utf8');
const operationTimeout=Number(boot.match(/var OPERATION_TIMEOUT=(\d+)/)[1]);assert.equal(operationTimeout,36000);
function client(remoteRel,localRel){
  const state=M.blank();state.rel=remoteRel;state.etat.pe=100;
  const attrs=B.encode(state);attrs.owd_version={current:String(state.v),max:'4.16.0b'};
  const session=new B.Session(attrs,state,Date.now,{id:'wait-test'}),local=B.copy(state);
  local.rel=localRel;local.name='Opération indépendante';session.capture(local);
  const sent=[],ctx={OPERATION_TIMEOUT:operationTimeout,gele:false,versionBloquee:false,accesInventaire:true,saveTimer:null,
    collaboration:session,miseANiveauDemandee:true,migrationEnvoyee:false,miroirsEnAttente:false,lastSavePerson:null,lastSaveCards:null,lastSaveAttrs:null,
    lastCapturedPerson:JSON.stringify(local),mem:{'owd-perso':JSON.stringify(local)},edition:false,journalPlayer:null,
    journalRemote:B.read(attrs),lastAttrs:attrs,post:m=>sent.push(m),JSON,Object,String,Date};
  vm.createContext(ctx);vm.runInContext(boot.slice(boot.indexOf('  function doSave()'),boot.indexOf('  // ---------- accusé de réception')),ctx);
  return {ctx,sent};
}
const target=M.release(),confirmed=client(target,target);confirmed.ctx.doSave();
assert.ok(Object.keys(confirmed.ctx.collaboration.pending).length);
assert.equal(confirmed.sent.find(m=>m.type==='save').attrs.owd_version.max,target);
assert.deepEqual(Object.keys(confirmed.sent.find(m=>m.type==='save').attrs),['owd_version']);
const unconfirmed=client('4.16.0b',target);unconfirmed.ctx.doSave();
assert.equal(unconfirmed.sent.filter(m=>m.type==='save').length,0,'ne jamais publier une version seulement locale');
console.log('OK version : publication malgré une autre opération en attente, sans anticiper une mise à jour non confirmée.');

let now=0,callback,delay,shown='';
const timer={OPERATION_TIMEOUT:operationTimeout,Date:{now:()=>now},Math,operationSerial:0,operationTimer:null,operationBusy:false,
  loadingKind:'opening',failureKind:'',openingStartedAt:0,extensionReady:true,ecranAttente(){},
  setTimeout(fn,ms){callback=fn;delay=ms;return 1;},clearTimeout(){},
  erreurSauvegarde(){shown='backup';},erreurMiseAJour(){shown='upgrade';},erreurOuverture(){shown='opening';}};
vm.createContext(timer);vm.runInContext(boot.slice(boot.indexOf('  function startLoading('),boot.indexOf('  function updateLoading(')),timer);
for(const kind of ['opening','upgrade']){
  shown='';now=0;timer.startLoading(kind);assert.equal(delay,36000);now=36000;callback();assert.equal(shown,kind);
}
now=12000;timer.operationBusy=true;timer.openingStartedAt=0;timer.startLoading('opening');assert.equal(delay,24000,'le délai de chargement ne repart pas à chaque étape');
const errorLine=boot.split('\n').find(s=>s.trim().startsWith("if(d.type==='storage-error'"));
Object.assign(timer,{CHAR_ID:'c',miseANiveauDemandee:true,migrationEnvoyee:false,statutEnregistrement(){shown='recording';}});
vm.runInContext('function storageError(d){'+errorLine+'}',timer);
timer.operationBusy=false;
timer.loadingKind='upgrade';timer.storageError({type:'storage-error',charId:'c'});assert.equal(shown,'upgrade');
console.log('OK délais : 36 secondes, budget de chargement conservé et erreur tardive de sauvegarde jamais présentée comme échec de mise à jour.');

let link;
for(const branch of ['owd-beta','owd']){
  const dom={URL,location:{href:'https://igneefleur.github.io/fns-ttrpg/'+branch+'/roll20-fiche.html'},stopLoading(){},
    ecran(){return {appendChild(){}};},zoneActions(){return {appendChild(){}};},boutonExport(){},
    noeud(tag){const n={appendChild(){}};if(tag==='a')link=n;return n;}};
  vm.createContext(dom);vm.runInContext(boot.slice(boot.indexOf('  function extensionUpdate('),boot.indexOf('  function compareExtension(')),dom);
  dom.extensionUpdate('ancienne','nouvelle');assert.equal(link.href,'https://igneefleur.github.io/fns-ttrpg/'+branch+'/extension/');
}
console.log('OK téléchargement : page Extension du site beta ou stable, aucun téléchargement direct du paquet.');

const bridge=fs.readFileSync('extension/firefox/beta/roll20-page.js','utf8');let readDelay,readTimeout,readSuccess,readResults=[];
const fresh={Date:{now:()=>100000},resyncJobs:{},RESYNC_MIN:1500,setTimeout(fn,ms){readTimeout=fn;readDelay=ms;return 1;},clearTimeout(){},publieLecture(ch,ok){readResults.push(ok);}};
vm.createContext(fresh);vm.runInContext(bridge.slice(bridge.indexOf('  function resynchronise('),bridge.indexOf('  // Toutes les frames liées')),fresh);
fresh.resynchronise({id:'test',attribs:{fetch(o){readSuccess=o.success;}}});assert.equal(readDelay,36000);readSuccess();readTimeout();assert.deepEqual(readResults,[true]);
console.log('OK pont : lecture fraîche attendue 36 secondes, réponse tardive ignorée après confirmation.');
