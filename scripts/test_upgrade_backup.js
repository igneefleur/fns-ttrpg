'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),C=require('../docs/javascripts/owd-sync.js').Compact,M=require('../docs/javascripts/owd-attr-map.js');
const boot=fs.readFileSync('docs/javascripts/owd-roll20-boot.js','utf8');let count=0;function test(n,fn){fn();count++;console.log('OK '+n);}
function setup(){const state=M.blank();state.v=17;state.notes='ancien texte'+ '\"\\\n'.repeat(20000);const attrs=C.encode(state);attrs.owd_state={current:JSON.stringify({...state,notes:'copie périmée'})};const ctx={backupAttempt:null,operationSerial:1,updateLoading(){},startLoading(){},C,M,JSON,Object,String,Number,Math,Date,mem:{'owd-perso':JSON.stringify(state)},attrsVus:attrs,BACKUP:'backup',val:(a,k)=>a&&a[k]||'',setTimeout(){},clearTimeout(){}};vm.createContext(ctx);vm.runInContext(boot.slice(boot.indexOf('  function lotBackup('),boot.indexOf('  function monter(')),ctx);return {ctx,attrs,state};}
function recorded(w,packet){return {...w.attrs,owd_ops_test:{current:JSON.stringify({epoch:packet.epoch,ops:packet.ops})}};}
test('source active complète, jamais un ancien owd_state resté dans les attributs',()=>{const w=setup(),lot=w.ctx.lotBackup({schema:17});assert.equal(JSON.parse(lot.owd_backup.current).notes,w.state.notes);});
test('grosse sauvegarde fragmentée, exacte et sans modification de la fiche',()=>{const w=setup(),lot=w.ctx.lotBackup({schema:17}),packet=w.ctx.lotBackupBlocs(lot,w.attrs),attrs=recorded(w,packet);assert.ok(packet.ops.length>10);assert.ok(packet.ops.every(o=>JSON.stringify(o).length<24000));assert.deepEqual(C.read(attrs).state,w.state);const backup=w.ctx.backupBlocs(attrs);assert.equal(backup.current,lot.owd_backup.current);assert.equal(backup.max,lot.owd_backup.max);});
test('fragment absent ou contenu altéré : la copie ne peut pas être déclarée complète',()=>{const w=setup(),p=w.ctx.lotBackupBlocs(w.ctx.lotBackup({schema:17}),w.attrs),a=recorded(w,{...p,ops:p.ops.slice(1)});assert.equal(w.ctx.backupBlocs(a),null);p.ops[0].legacyBackup.fragments[0].data='corrompu';assert.equal(w.ctx.backupBlocs(recorded(w,p)),null);});
test('confirmation par relecture de toutes les opérations, pas par accusé mémoire',()=>{const w=setup(),p=w.ctx.lotBackupBlocs(w.ctx.lotBackup({schema:17}),w.attrs);let result;w.ctx.sonde=(cb,fresh)=>{assert.equal(fresh,true);cb(recorded(w,p));};w.ctx.confirmeOperations(p,ok=>result=ok);assert.equal(result,true);});
test('une réponse de cache laisse la sonde fraîche en attente',()=>{let completed=0;const ctx={post(){},setTimeout(){return 1;},clearTimeout(){},sondes:[]};vm.createContext(ctx);vm.runInContext(boot.slice(boot.indexOf('  var sondes ='),boot.indexOf('  // Empreinte d’une valeur')>0?boot.indexOf('  // Empreinte d’une valeur'):boot.indexOf('  // Empreinte d\'une valeur')),ctx);ctx.sonde(()=>completed++,true);ctx.sondeReponse({},false);assert.equal(completed,0);assert.equal(ctx.sondes.length,1);ctx.sondeReponse({},true);assert.equal(completed,1);});
test('modification concurrente pendant la sauvegarde : migrer le dernier état sans recommencer en boucle',()=>{
 const w=setup();let opened=0,restarted=0;const lot=w.ctx.lotBackup({schema:17}),packet=w.ctx.lotBackupBlocs(lot,w.attrs),changed=recorded(w,packet);
 const peer=new C.Session(changed,w.state,null,{id:'world'}),next=C.copy(w.state);next.horloge.secondes=3;peer.capture(next);changed.owd_ops_world={current:JSON.stringify({epoch:peer.epoch,ops:Object.values(peer.pending)})};
 w.ctx.bundleCharge=false;w.ctx.schemaSite=()=>18;w.ctx.post=()=>{};w.ctx.confirmeOperations=(_,cb)=>cb(true,changed,C.read(changed));w.ctx.monter=()=>restarted++;w.ctx.fermerEcran=()=>{};w.ctx.bandeauMisAJour=()=>{};w.ctx.specCourant=()=>({});w.ctx.chargerBundle=()=>opened++;
 w.ctx.tenterBackupBlocs(lot,false);assert.equal(restarted,0,'la copie vérifiée doit rester valable si l’horloge avance');assert.equal(opened,1);assert.equal(JSON.parse(w.ctx.mem['owd-perso']).horloge.secondes,3);
 assert.equal(w.ctx.backupBlocs(changed).current,lot.owd_backup.current);
});
test('panneau en attente : prendre la migration confirmée dans une autre fiche sans redemander',()=>{
 const w=setup(),state=C.copy(w.state);state.v=18;state.notes={format:1,messages:[]};const attrs=C.encode(state);let opens=0;Object.assign(w.ctx,{bundleCharge:false,gele:false,attrsPrets:true,operationBusy:false,releaseSite:M.release,memeRang:(a,b)=>a===b,schemaSite:()=>18,versionFiche:M.ficheDe,decider:()=>opens++});
 vm.runInContext(boot.slice(boot.indexOf('  function actualiseAvantMontage('),boot.indexOf('  // ---------- la décision ----------')),w.ctx);
 w.ctx.actualiseAvantMontage(w.attrs);assert.equal(opens,0);w.ctx.actualiseAvantMontage(attrs);assert.equal(opens,1);assert.equal(JSON.parse(w.ctx.mem['owd-perso']).v,18);
 w.ctx.bundleCharge=true;w.ctx.actualiseAvantMontage(attrs);assert.equal(opens,1,'ne jamais remplacer la mémoire d’une fiche déjà montée');
});
test('réponse de sauvegarde tardive : ne pas écraser une fiche déjà montée',()=>{
 const w=setup(),lot=w.ctx.lotBackup({schema:17}),packet=w.ctx.lotBackupBlocs(lot,w.attrs),attrs=recorded(w,packet),current=C.copy(w.state);current.v=18;current.notes={format:1,messages:[]};w.ctx.mem['owd-perso']=JSON.stringify(current);w.ctx.bundleCharge=true;w.ctx.post=()=>{};w.ctx.confirmeOperations=(_,cb)=>cb(true,attrs,C.read(attrs));
 w.ctx.tenterBackupBlocs(lot,false);assert.equal(JSON.parse(w.ctx.mem['owd-perso']).v,18);
});
test('archive autorisée par le pont existant même si le cache local est plein',()=>{
 const w=setup(),packet=w.ctx.lotBackupBlocs(w.ctx.lotBackup({schema:17}),w.attrs),source=fs.readFileSync('extension/firefox/beta/roll20-page.js','utf8'),out=[];
 const ctx={JSON,Math,Number,Object,Array,String,Error,Date,window:{},winCampagne:null,sessionStorage:{getItem(){return null;},setItem(){}},localStorage:{getItem(){return null;},setItem(){throw Error('quota');},removeItem(){}},campaign:()=>({id:'p'}),readAll:()=>w.attrs,enqueue:(id,attrs)=>out.push(attrs)};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('  function storageHash('),source.indexOf('  function reply(ev, msg)')),ctx);
 ctx.storageOps({id:'c'},packet);assert.ok(out.length);for(const attrs of out)Object.assign(w.attrs,attrs);assert.equal(w.ctx.backupBlocs(w.attrs).current,w.ctx.mem['owd-perso']);
});
console.log(count+' scénarios de sauvegarde avant mise à niveau validés.');
