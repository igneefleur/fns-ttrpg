'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../docs/javascripts/owd-sync.js').Compact,M=require('../docs/javascripts/owd-attr-map.js');
const seed=M.blank();seed.comps=[{id:'c1',nom:'Lutte',rang:1}];seed.inv.objets=[{ref:'r1',nom:'Ration',qte:3,ou:'sac'}];
const attrs=C.encode(seed),a=new C.Session(attrs,seed,()=>1700000000000,{id:'alice',actor:{id:'p1',name:'Alice'}}),b=new C.Session(attrs,seed,()=>1700000001000,{id:'bob',actor:{id:'p2',name:'Bob'}});
const next=C.copy(seed);next.comps[0].rang=2;a.capture(next);next.comps[0].rang=3;a.capture(next);
assert.equal(Object.keys(a.pending).length,1,'frappes non publiées coalescées');let op=Object.values(a.pending)[0];assert.equal(op.actor.name,'Alice');assert.equal(op.at,1700000000000);assert.equal(op.labels.c1,'Lutte');assert.deepEqual(op.changes.find(c=>c.k.endsWith('["k","rang"]]')).before,['v',1]);
let x=C.copy(seed);x.inv.objets=[];b.capture(x);let deleted=Object.values(b.pending)[0];assert.equal(deleted.labels.r1,'Ration');assert.equal(deleted.actor.name,'Bob');
const ops=[...Object.values(a.outgoing()),...Object.values(b.outgoing())];attrs.owd_ops_test={current:JSON.stringify({epoch:a.epoch,ops})};const remote=C.read(attrs);assert.equal(remote.state.comps[0].rang,3);assert.equal(remote.state.inv.objets.length,0);a.receive(attrs);b.receive(attrs);assert.equal(Object.keys(a.pending).length,0);assert.equal(remote.ops.length,2);assert.equal(remote.ops.find(o=>o.id.startsWith('alice:')).actor.name,'Alice');assert.equal(remote.ops.find(o=>o.id.startsWith('bob:')).actor.name,'Bob');
// Aucun historique transformé par la lecture, aucune nouvelle famille d'attributs.
const before=JSON.stringify(attrs);for(let i=0;i<10;i++)C.read(attrs);assert.equal(JSON.stringify(attrs),before);assert.ok(Object.keys(attrs).every(k=>k===C.BASE||k.startsWith(C.BLOCK)||k.startsWith(C.STACK)||k.startsWith(C.PREFIX)));
// L'identité vient du joueur de la session, y compris dans une fenêtre séparée.
const source=fs.readFileSync('extension/firefox/beta/roll20-page.js','utf8'),code=source.slice(source.indexOf('  function journalPlayer()'),source.indexOf('  function reply(ev, msg)'));
const player={id:'p1',get:k=>k==='displayname'?'Alice':null},context={window:{},winCampagne:{currentPlayer:player},campaign(){}};vm.createContext(context);vm.runInContext(code,context);assert.equal(context.journalPlayer().name,'Alice');context.winCampagne={};assert.equal(context.journalPlayer(),null);
console.log('OK Journal : date/auteur immuables, frappes coalescées, noms conservés après suppression, éditions simultanées, confirmation sans doublon, lecture sans écriture, identité des fenêtres séparées et auteur inconnu explicite.');

// Les placements hérités et les modules externes suivent la colonne unique.
const layout={state:{modules:{place:{inv:{onglet:"equipement",colonne:"droite"}}}},modules:[{id:"inv",onglet:"equipement",colonne:"bas"},{id:"custom",onglet:"equipement",colonne:"gauche"}],SQUELETTES:{equipement:p=>({milieu:p})},el:()=>({}),aClef:(o,k)=>Object.hasOwn(o,k),rangModule:id=>layout.modules.findIndex(m=>m.id===id),ordonne(){}};vm.createContext(layout);vm.runInContext(fs.readFileSync('src/fiche/socle/290-disposition.js','utf8'),layout);layout.appliqueDisposition();assert.equal(layout.modules[0].colonne,'milieu');assert.equal(layout.modules[1].colonne,'milieu');console.log('OK Equipement : anciennes dispositions et modules externes normalisés sans mutation des données.');
