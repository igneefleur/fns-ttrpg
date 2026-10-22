'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../docs/javascripts/owd-sync.js'),B=C.Compact,M=require('../docs/javascripts/owd-attr-map.js');
const state=M.blank();state.etat.pe=100;state.inv.objets=[{ref:'x',nom:'Ration',qte:3,ou:'sac'}];
const attrs=B.encode(state),epoch=JSON.parse(attrs[B.BASE].current).epoch,reader=new B.Reader(),key=JSON.stringify([['k','etat'],['k','pe']]);
let ops=[];function publish(){attrs.owd_ops_test={current:JSON.stringify({epoch,ops}),max:''};}function check(){const full=B.read(attrs),cached=reader.read(attrs);assert.deepEqual(cached,full);return cached;}
check();for(let i=0;i<40;i++){ops.push({id:'a:'+i,clock:i+1,at:i,changes:[{k:key,n:['v',99-i],before:['v',100-i],delta:-1,anchor:100-i}]});publish();check();}
// Une opération tardive oblige à refaire l'ordre causal.
ops.push({id:'early',clock:1,at:0,changes:[{k:key,n:['v',100],delta:5,anchor:100}]});publish();check();
ops[3].changes[0].delta=-3;publish();check();ops.splice(4,1);publish();check();
// Les données rendues ne sont jamais les objets privés du cache.
const one=check();one.state.etat.pe=-999;one.flat[key][1]=-999;one.ops[0].changes=[];one.meta.blocks={};check();
const op={id:'create',clock:100,at:0,changes:[{k:JSON.stringify([['k','inv'],['k','objets'],['e','new']]),n:['o']}]};
const payload={current:JSON.stringify({ref:'new',nom:'Nouvelle pile',qte:1}),max:''};op.creates={new:{attribute:'owd_stack_new',hash:B.hash(payload.current)}};ops.push(op);publish();assert.equal(check().incomplete,true);attrs.owd_stack_new=payload;assert.equal(check().incomplete,false);
const saved=attrs.owd_stack_x.current;attrs.owd_stack_x.current='{broken';assert.throws(()=>reader.read(attrs));attrs.owd_stack_x.current=saved;check();
const session=new B.Session(attrs,B.read(attrs).state);assert.equal(session.migration,null,'pas de migration calculée pour un format actif');
let local=C.rebuild(session.local);local.notes={format:1,messages:[{id:'n',at:0,text:'A',mode:'plain'}]};local.future={x:{a:1},list:[1,2]};session.capture(local);assert.deepEqual(C.rebuild(session.local),local);delete local.future;local.etat.pe=42;session.capture(local);assert.deepEqual(C.rebuild(session.local),local);
// Le format allégé garde chaque propriété de la Boutique et les champs inconnus.
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/fiche/socle/035-donnees.js','utf8'),ctx);const sample={caracs:[{cle:'Force'}],equipements:[{id:'a',qte:1,flag:false},{id:'b',qte:1,flag:0}],consommables:[]},packedSample={format:'owd-runtime-1',data:{caracs:sample.caracs},catalogue:{equipements:{defauts:{qte:1},lignes:[{id:'a',flag:false},{id:'b',flag:0}]},consommables:{defauts:{},lignes:[]}}};assert.deepEqual(JSON.parse(JSON.stringify(ctx.decodeRuntimeData(packedSample))),sample);
if(fs.existsSync('site/owd-creation-runtime.json')){const packed=JSON.parse(fs.readFileSync('site/owd-creation-runtime.json','utf8')),full=JSON.parse(fs.readFileSync('site/owd-creation.json','utf8'));assert.deepEqual(JSON.parse(JSON.stringify(ctx.decodeRuntimeData(packed))),full);}
console.log('OK caches : préfixe causal, arrivée tardive, remplacement, suppression, pile absente/réparée, corruption, isolation, capture partielle, démarrage actif, données allégées sans perte.');
// Confirmation légère : reprise complète à la première lecture, aux changements et pour les anciens clients.
const bridge=fs.readFileSync('extension/firefox/beta/roll20-page.js','utf8'),wire=[],frame={},sub={type:'hydrate',lightRead:1,readRevision:null},subscriptions=new WeakMap([[frame,sub]]);let serverAttrs={owd_pv:{current:'100',max:'100'}};
const transport={Object,Array,JSON,Math,Date,menage(){},readAll:()=>JSON.parse(JSON.stringify(serverAttrs)),srcFrames:[frame],srcIds:['c'],readSubscriptions:subscriptions,inventoryFrames:new WeakMap(),inventoryAccess:()=>true,presenceLocal:{},presenceRead:()=>[],reply:(_,m)=>wire.push(m)};vm.createContext(transport);vm.runInContext(bridge.slice(bridge.indexOf('  var readRevisions='),bridge.indexOf('  function resynchronise(')),transport);
transport.publieLecture({id:'c'},true);assert.ok(wire.at(-1).attrs);sub.readRevision=wire.at(-1).revision;transport.publieLecture({id:'c'},true);assert.equal(wire.at(-1).attrs,undefined);assert.equal(wire.at(-1).unchanged,true);
serverAttrs.owd_presence={current:'presence',max:''};transport.publieLecture({id:'c'},true);assert.equal(wire.at(-1).unchanged,true);serverAttrs.owd_pv.current='80';transport.publieLecture({id:'c'},true);assert.equal(wire.at(-1).attrs.owd_pv.current,'80');delete sub.lightRead;transport.publieLecture({id:'c'},true);assert.ok(wire.at(-1).attrs);
console.log('OK transport : première lecture complète, confirmation sans données, présence séparée, changement de token, ancien client.');
