/* Confirmation réelle, invalidation et horloge déterministe. */
'use strict';
const assert=require('node:assert/strict'),{Tracker,progress}=require('../docs/javascripts/owd-save-progress.js');
let t=0;const x=new Tracker(()=>t),op=id=>({id}),snap=(pe,pv=100,pm=100)=>({pe:JSON.stringify(pe),pv:JSON.stringify(pv),pm:JSON.stringify(pm)});
x.capture(snap(100),{},true);assert.deepEqual(x.records,{});
t=1;x.capture(snap(90),{a:op('a')},true);assert.deepEqual(Object.keys(x.records),['pe']);const rev=x.records.pe.revision;
x.confirm({ids:{},incomplete:false});assert.equal(x.records.pe.phase,'pending');
t=6001;x.capture(snap(80),{a:op('a'),b:op('b')},true);assert.equal(x.records.pe.start,6001);assert.ok(x.records.pe.revision>rev);
x.confirm({ids:{a:true}});assert.equal(x.records.pe.phase,'pending','ancienne confirmation insuffisante');
t=6100;x.capture(snap(80,95,90),{a:op('a'),b:op('b'),c:op('c')},true);assert.equal(x.records.pe.start,6001,'un autre module ne réinitialise pas PE');assert.deepEqual(x.records.pv.ids,['c']);assert.deepEqual(x.records.pm.ids,['c']);
x.confirm({ids:{a:true,b:true,c:true},incomplete:true});assert.equal(x.records.pe.phase,'pending');
x.confirm({ids:{a:true,b:true,c:true}},k=>k!=='pv');assert.equal(x.records.pe.phase,'finishing');assert.equal(x.records.pv.phase,'pending','miroir de jeton encore non confirmé');
x.confirm({ids:{a:true,b:true,c:true}});assert.equal(x.records.pv.phase,'finishing');
t=6200;x.capture(snap(79,95,90),{d:op('d')},true);assert.equal(x.records.pe.phase,'pending','nouveau changement pendant les 400 ms');assert.equal(x.records.pe.start,6200);assert.deepEqual(x.records.pe.ids,['d']);
x.confirm({ids:{a:true,b:true,c:true}});assert.equal(x.records.pe.phase,'pending');x.confirm({ids:{d:true}});assert.equal(x.records.pe.phase,'finishing');
const y=new Tracker(()=>t);y.capture({notes:'a'}, {},false);y.capture({notes:'b'},{one:op('one')},true);y.capture({notes:'c'},{two:op('two')},true);assert.deepEqual(y.records.notes.ids,['two'],'opération coalescée remplacée');y.confirm({ids:{one:true}});assert.equal(y.records.notes.phase,'pending');y.confirm({ids:{two:true}});assert.equal(y.records.notes.phase,'finishing');
assert.equal(progress(0),0);assert.equal(progress(12000),.75);assert.ok(progress(36000)>.75);assert.ok(progress(999999999)<1);
console.log('OK contours : départ ciblé, dépendances, réinitialisation, confirmation ancienne refusée, lecture incomplète, miroir de jeton, coalescence, ¾ en 12 s et attente sans faux succès.');
// Le libellé global attend lui aussi les miroirs, comme les contours.
const fs=require('node:fs'),vm=require('node:vm'),boot=fs.readFileSync('docs/javascripts/owd-roll20-boot.js','utf8'),messages=[];
const ctx={updateSaveContours(){},collaboration:{pending:{}},saveContours:{records:{pe:{phase:'pending'}}},firstPendingAt:1,saveFailure:'',preparationFailed:false,Date:{now:()=>1000},statutEnregistrement:s=>messages.push(s),afficheErreurEnregistrement(){},document:{getElementById:()=>null}};
vm.createContext(ctx);vm.runInContext(boot.slice(boot.indexOf('  function actualiseStatutEnregistrement('),boot.indexOf('  function scheduleSave(')),ctx);
ctx.actualiseStatutEnregistrement();assert.equal(messages.at(-1),'Enregistrement en cours…');ctx.saveContours.records.pe.phase='finishing';ctx.actualiseStatutEnregistrement();assert.equal(messages.at(-1),'Enregistré');
console.log('OK statut : aucune annonce de réussite tant que le miroir du module attend sa confirmation.');

const plateau=new Tracker(()=>t);plateau.capture({source:'0',derived:'0'},{},true);plateau.capture({source:'1',derived:'1'},{old:op('old')},true);const start=plateau.records.derived.start;plateau.capture({source:'2',derived:'1'},{replacement:op('replacement')},true);assert.deepEqual(plateau.records.derived.ids,['replacement']);assert.equal(plateau.records.derived.start,start);plateau.confirm({ids:{replacement:true}});assert.equal(plateau.records.derived.phase,'finishing');console.log('OK module calculé inchangé : suit le remplacement de son opération source sans rester bloqué ni recommencer.');
