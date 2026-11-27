/* Fiche complète et raccourcis réels dans un DOM : npm install jsdom.
 * NODE_PATH=/chemin/node_modules node scripts/test_history_time_dom.js */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),M=require('../docs/javascripts/owd-attr-map.js');
const source=f=>fs.readFileSync(path.join(root,f),'utf8');
const boot=source('docs/javascripts/owd-roll20-boot.js');
const historyCode=boot.slice(boot.indexOf('  window.__owdJournal ='),boot.indexOf('  var saveTimer ='));
function snapshot(s){return Object.fromEntries(['etat','horloge','horlogeDigestion','horlogeExposition','horlogeAlcool','effetsActifs','effAlcool','effParties'].map(k=>[k,s[k]]).concat([['recuperation',s.modData.recuperation]]));}
async function open(seed,existing){
 const dom=new JSDOM('<div id="perso-fiche"></div>',{url:'https://owd.test/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,errors=[];
 w.addEventListener('error',e=>errors.push(e.error));w.scrollTo=()=>{};
 w.fetch=async()=>({ok:true,json:async()=>JSON.parse(source('site/owd-creation.json'))});
 w.eval(source('docs/javascripts/owd-sync.js'));
 const mem={'owd-perso':JSON.stringify(seed)};
 w.__owdLocalStorage={getItem:k=>mem[k]||null,setItem:(k,v)=>{mem[k]=v;if(k==='owd-perso'&&w.__captureHistory)w.__captureHistory(JSON.parse(v));},removeItem:k=>delete mem[k]};
 for(const f of JSON.parse(source('docs/owd-manifeste.json')).bundle.js){const p=f.split('?')[0];w.eval(source(fs.existsSync(path.join(root,'docs',p))?'docs/'+p:'site/'+p));}
 for(let i=0;i<100&&!w.Owd?.__pret;i++)await new Promise(r=>setTimeout(r,10));assert.equal(w.Owd?.__pret,true,'fiche montée');
 w.__historyMemory=mem;w.__historyAttrs=existing;
 w.eval(`(function(){
 var mem=window.__historyMemory,C=window.OwdSync.Compact,ready=true,gele=false,versionBloquee=false,collaborationApplique=false,storageIntent={absolute:{}};
 var journalPlayer={id:'alice',name:'Alice'},lastAttrs=window.__historyAttrs||C.encode(JSON.parse(mem['owd-perso'])),journalRemote=C.read(lastAttrs);
 var collaboration=new C.Session(lastAttrs,JSON.parse(mem['owd-perso']),Date.now,{id:'dom'+Math.random(),actor:journalPlayer});
 window.__owdCanEdit=function(){return true;};
 window.__captureHistory=function(s){if(!collaborationApplique){collaboration.capture(s,storageIntent);storageIntent={absolute:{}};}};
 ${historyCode}
 window.__historyTest={
 publish:function(){
  var ops=C.read(lastAttrs).ops.concat(Object.values(collaboration.outgoing()));Object.assign(lastAttrs,collaboration.payloads);
  lastAttrs[C.PREFIX+'test']={current:JSON.stringify({epoch:collaboration.epoch,ops:ops})};
  journalRemote=C.read(lastAttrs);var r=collaboration.receive(lastAttrs);
  collaborationApplique=true;try{window.Owd.__recoitEtat(r.state);collaboration.local=C.flatten(JSON.parse(mem['owd-perso']));}finally{collaborationApplique=false;}
  return JSON.parse(JSON.stringify(lastAttrs));
 },peer:function(path,value){
  var s=JSON.parse(mem['owd-perso']),flat=C.flatten(s),key=JSON.stringify(path),tree=C.copy(flat);tree[key]=['v',value];
  var peer=new C.Session(lastAttrs,s,Date.now,{id:'bob'+Math.random(),actor:{id:'bob'}});peer.capture(C.rebuild(tree));
  lastAttrs[C.PREFIX+'peer'+Math.random()]={current:JSON.stringify({epoch:collaboration.epoch,ops:Object.values(peer.outgoing())})};
  journalRemote=C.read(lastAttrs);var r=collaboration.receive(lastAttrs);collaborationApplique=true;
  try{window.Owd.__recoitEtat(r.state);collaboration.local=C.flatten(JSON.parse(mem['owd-perso']));}finally{collaborationApplique=false;}
 }
 };
 })();`);
 const read=()=>JSON.parse(mem['owd-perso']);
 function click(title){const button=[...w.document.querySelectorAll('[data-module="effort"] button')].find(b=>b.title===title);assert.ok(button,title);button.click();}
 function key(redo=false,success=true){w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:redo?'y':'z',ctrlKey:true,bubbles:true,cancelable:true}));const message=w.document.getElementById('owd-history-notice').textContent;assert.match(message,success?(redo?/Modification rétablie/:/Modification annulée/):/Une valeur concernée a changé/);return message;}
 return {dom,w,read,click,key,errors,publish:()=>w.__historyTest.publish(),peer:(p,v)=>w.__historyTest.peer(p,v)};
}
(async()=>{
 const seed=M.blank();seed.v=M.SCHEMA;seed.rel=M.release();seed.name='Temps';seed.effort='repos';
 for(const k of ['pv','pe','pm','pr','ps','ph','pi'])seed.etat[k]=40;
 let a=await open(seed);try{
 const states=[snapshot(a.read())];
 for(const [title,label] of [["Avancer le temps d'un round (3 secondes)",'round'],["Avancer le temps d'une minute",'minute'],["Avancer le temps d'une heure",'heure']]){
  const before=snapshot(a.read());a.click(title);const after=snapshot(a.read());assert.notDeepEqual(after,before);a.publish();assert.deepEqual(snapshot(a.read()),after,'relecture sans perte de précision');
  a.peer([['k','name']],'Autre champ '+label);a.key();assert.deepEqual(snapshot(a.read()),before,'Ctrl-Z restaure tout après '+label);assert.equal(a.read().name,'Autre champ '+label);a.publish();a.key(true);assert.deepEqual(snapshot(a.read()),after,'Ctrl-Y restaure tout après '+label);a.publish();
  states.push(after);
  console.log('OK '+label+' : vrai calcul, synchronisation, raccourcis et restauration exacte');
 }
 for(let i=states.length-2;i>=0;i--){a.key();a.publish();assert.deepEqual(snapshot(a.read()),states[i]);}
 for(let i=1;i<states.length;i++){a.key(true);a.publish();assert.deepEqual(snapshot(a.read()),states[i]);}
 console.log('OK trois annulations puis trois rétablissements successifs');
 const attrs=a.publish(),after=snapshot(a.read());assert.deepEqual(a.errors,[]);a.dom.window.close();a=await open(a.read(),attrs);assert.deepEqual(snapshot(a.read()),after);a.key();a.publish();a.key(true);a.publish();assert.deepEqual(snapshot(a.read()),after);console.log('OK réouverture et historique conservé');
 a.peer([['k','etat'],['k','pr']],12.345678);a.key(false,false);assert.equal(a.read().etat.pr,12.345678);assert.deepEqual(a.errors,[]);console.log('OK modification concurrente réelle toujours protégée');
 }finally{a.dom.window.close();}
 // Effets expirés, récupération temporaire, digestion et horloges fractionnaires.
 const timed=M.blank();timed.v=M.SCHEMA;timed.rel=M.release();timed.effort='repos';timed.etat.pv=10;timed.etat.pe=10;timed.etat.contenance=5;timed.effAlcool=2;
 timed.horloge={jours:0,heures:0,minutes:0,secondes:0.25};timed.horlogeAlcool={jours:0,heures:1,minutes:59,secondes:59.5};
 timed.modData.recuperation={ajouts:[{id:'temp',nom:'Soin temporaire',perso:true,reserve:'pv',niveau:4,actif:true,type:'2h',temps:1/120,resteSecondes:60}]};
 a=await open(timed);try{
  assert.equal(a.read().horloge.secondes,0.25);
  assert.equal(a.w.Owd.effets.ajoute('Récupération Potion PE I','Test','',0.5),true);a.publish();
  const before=snapshot(a.read());a.w.Owd.__calculs.avancerSecondes(3600);const after=snapshot(a.read());
  assert.ok(before.effetsActifs.length>after.effetsActifs.length,'effet expiré');assert.equal((after.recuperation?.ajouts||[]).length,0,'récupération expirée');assert.notEqual(after.effAlcool,before.effAlcool);
  a.publish();assert.deepEqual(snapshot(a.read()),after);a.key();assert.deepEqual(snapshot(a.read()),before);a.publish();a.key(true);a.publish();assert.deepEqual(snapshot(a.read()),after);assert.deepEqual(a.errors,[]);console.log('OK expirations, digestion, alcool et fractions de seconde');
 }finally{a.dom.window.close();}
 // Une baisse d'effondrement peut laisser PV/PE au nouveau maximum (null).
 // La restauration du niveau antérieur ne doit pas réappliquer son ajustement.
 const tired=M.blank();tired.v=M.SCHEMA;tired.rel=M.release();tired.effort='sommeil';tired.temperature=30;tired.etat.pr=719.999;tired.etat.ps=null;tired.etat.ph=null;tired.etat.pv=null;tired.etat.pe=null;
 a=await open(tired);try{
  const before=snapshot(a.read()),level=a.w.Owd.__calculs.effondrement();a.w.Owd.__calculs.avancerSecondes(3600);const after=snapshot(a.read());assert.ok(a.w.Owd.__calculs.effondrement()<level,'niveau franchi');
  a.publish();a.key();assert.deepEqual(snapshot(a.read()),before);a.publish();a.key(true);assert.deepEqual(snapshot(a.read()),after);a.publish();assert.deepEqual(snapshot(a.read()),after);assert.deepEqual(a.errors,[]);console.log('OK franchissement d’effondrement et réserves au maximum');
 }finally{a.dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
