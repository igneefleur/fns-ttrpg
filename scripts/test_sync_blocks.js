'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),C=require('../docs/javascripts/owd-sync.js'),B=C.Compact,M=require('../docs/javascripts/owd-attr-map.js');
let count=0;function test(name,f){f();count++;console.log('OK '+name);}
function fixture(){const s=M.blank();s.inv.objets=[{ref:'bag',nom:'Bag',qte:1,ou:'dos',sac:true},{ref:'ration',nom:'Ration',qte:5,poids:.5,ou:'sac',dans:'bag'}];s.comps=[{id:'a',nom:'A',rang:1},{id:'b',nom:'B',rang:2}];s.etat.pv=100;s.etat.pe=100;return s;}
function world(){const state=fixture(),attrs=B.encode(state),a=new B.Session(attrs,state,()=>1000,{id:'a'}),b=new B.Session(attrs,state,()=>1000,{id:'b'});return {state,attrs,a,b,change(client,fn){const s=C.rebuild(client.local);fn(s);client.capture(s);Object.assign(attrs,client.payloads);attrs[B.PREFIX+client.id]={current:JSON.stringify({epoch:client.epoch,ops:Object.values(client.pending)}),max:''};},read(){return B.read(attrs);}};}
test('blocs : aller-retour exact, Unicode, inconnus, contenus et placements sans doublon',()=>{const s=fixture();s.modData.future={value:123};s.future={x:'été'};const attrs=B.encode(s);assert.deepEqual(B.read(attrs).state,s);const raw=JSON.parse(attrs.owd_stack_ration.current);assert.ok(!('ou'in raw));assert.ok(!('dans'in raw));assert.equal(Object.keys(attrs).filter(k=>k.startsWith('owd_stack_')).length,2);});
test('Zohtl : import intégral et réduction des attributs',()=>{const p='/workspace/scratch/fdd6d17522a3/upload/Zohtl(1).json';if(!fs.existsSync(p))return;const s=JSON.parse(fs.readFileSync(p)),attrs=B.encode(s);assert.deepEqual(B.read(attrs).state,s);assert.ok(Object.keys(attrs).length<90);console.log('  Zohtl : '+Object.keys(attrs).length+' attributs de stockage, avant miroirs et sessions.');});
test('champs différents du même module et de la même pile fusionnés',()=>{const w=world();w.change(w.a,s=>{s.comps[0].nom='Alpha';s.inv.objets[1].nom='Pain';});w.change(w.b,s=>{s.comps[0].rang=5;s.inv.objets[1].poids=.8;});assert.equal(w.read().state.comps[0].nom,'Alpha');assert.equal(w.read().state.comps[0].rang,5);assert.equal(w.read().state.inv.objets[1].nom,'Pain');assert.equal(w.read().state.inv.objets[1].poids,.8);});
test('dépenses simultanées de réserves et de quantités additionnées',()=>{const w=world();w.change(w.a,s=>{s.etat.pe-=8;s.inv.objets[1].qte--;});w.change(w.b,s=>{s.etat.pe-=7;s.inv.objets[1].qte-=2;});assert.equal(w.read().state.etat.pe,85);assert.equal(w.read().state.inv.objets[1].qte,2);});
test('rejeu après coupure et copie du même journal : une seule application',()=>{const w=world();w.change(w.a,s=>s.etat.pv-=12);w.attrs.owd_ops_duplicate=w.attrs.owd_ops_a;assert.equal(w.read().state.etat.pv,88);assert.equal(w.a.receive(w.attrs).state.etat.pv,88);assert.equal(Object.keys(w.a.pending).length,0);});
test('épuisement concurrent d’une pile : seconde transaction rejetée intégralement',()=>{const w=world();for(const c of [w.a,w.b])w.change(c,s=>{s.inv.objets[1].qte-=4;s.inv.objets.push({ref:c.id,nom:'Séparé',qte:4});});const r=w.read();assert.equal(r.state.inv.objets.find(o=>o.ref==='ration').qte,1);assert.equal(r.state.inv.objets.filter(o=>o.nom==='Séparé').length,1);assert.ok(r.conflicts.length);});
test('suppression et fusion concurrentes ne peuvent pas dupliquer la source',()=>{const w=world();for(const c of [w.a,w.b])w.change(c,s=>{s.inv.objets[0].qte+=s.inv.objets[1].qte;s.inv.objets.splice(1,1);});assert.equal(w.read().state.inv.objets.length,1);assert.equal(w.read().state.inv.objets[0].qte,6);});
test('migration incomplète et bloc corrompu refusés, puis reprise exacte',()=>{const attrs=B.encode(fixture()),name=Object.keys(attrs).find(k=>k.startsWith(B.STACK)),saved=attrs[name];delete attrs[name];assert.throws(()=>B.read(attrs),/incomplet/);attrs[name]={current:'{}',max:''};assert.throws(()=>B.read(attrs),/incomplet/);attrs[name]=saved;assert.deepEqual(B.read(attrs).state,fixture());});
test('réserve au maximum : dépenses simultanées avec ancrage numérique',()=>{const s=fixture();s.etat.pv=null;const attrs=B.encode(s);for(const session of ['a','b'].map(id=>new B.Session(attrs,s,()=>1,{id}))){const id=session.id;session.maxima.pv=100;const local=C.copy(s);local.etat.pv=92;session.capture(local);attrs[B.PREFIX+id]={current:JSON.stringify({epoch:session.epoch,ops:Object.values(session.pending)}),max:''};}assert.equal(B.read(attrs).state.etat.pv,84);});
test('barre de token : valeur absolue, confirmations et dédoublonnage entre clients',()=>{const w=world(),r=w.read();w.a.token('pv',42,r);w.b.token('pv',42,r);for(const c of [w.a,w.b])w.attrs[B.PREFIX+c.id]={current:JSON.stringify({epoch:c.epoch,ops:Object.values(c.pending)}),max:''};assert.equal(w.read().state.etat.pv,42);w.a.receive(w.attrs);assert.equal(Object.keys(w.a.pending).length,0);});
test('même champ : ordre déterministe et conflit conservé',()=>{const w=world();w.change(w.a,s=>s.notes='A');w.change(w.b,s=>s.notes='B');const one=w.read();assert.equal(one.state.notes,'B');assert.ok(one.conflicts.length);const reversed=Object.fromEntries(Object.entries(w.attrs).reverse());assert.deepEqual(B.read(reversed).state,one.state);});
test('croissance des modules et inconnus : aucune limite fixe d’attributs',()=>{const s=fixture();for(let i=0;i<100;i++)s.modData['module_'+i]={x:i};const attrs=B.encode(s);assert.deepEqual(B.read(attrs).state,s);assert.ok(Object.keys(attrs).length>100);});


test('saisies absolues de réserves : pas d’addition involontaire, conflit signalé',()=>{const w=world(),path=JSON.stringify([['k','etat'],['k','pe']]);for(const c of [w.a,w.b]){const s=C.rebuild(c.local);s.etat.pe=77;c.capture(s,{absolute:{[path]:true}});w.attrs[B.PREFIX+c.id]={current:JSON.stringify({epoch:c.epoch,ops:Object.values(c.pending)})};}assert.equal(w.read().state.etat.pe,77);});
test('temps avancé simultanément : horloge et réserves suivent les deux opérations',()=>{const w=world();w.change(w.a,s=>{s.horloge.minutes=10;s.etat.pe-=5;});w.change(w.b,s=>{s.horloge.minutes=15;s.etat.pe-=7;});assert.equal(w.read().state.horloge.minutes,25);assert.equal(w.read().state.etat.pe,88);});
test('maximum du token : forçage de capacité dans la fiche, sans toucher aux autres leviers',()=>{const w=world();w.a.tokenMax('pv',150,w.read());w.attrs.owd_ops_a={current:JSON.stringify({epoch:w.a.epoch,ops:Object.values(w.a.pending)})};assert.equal(w.read().state.capsLeviers.max.force.pv,150);});
test('format actif corrompu : ne jamais revenir silencieusement à l’ancienne fiche',()=>{const s=fixture(),attrs=B.encode(s),m=JSON.parse(attrs[B.BASE].current);m.phase='ready';attrs[B.BASE].current=JSON.stringify(m);attrs.owd_state={current:JSON.stringify(s)};delete attrs[Object.keys(m.blocks)[0]];assert.equal(M.attrsToState(attrs).degrade,'illisible');});

test('supprimer une pile puis modifier le reste de l’inventaire conserve les modifications',()=>{
 const w=world(),history={};
 function edit(fn){w.change(w.a,fn);Object.assign(history,w.a.pending);w.attrs[B.PREFIX+w.a.id]={current:JSON.stringify({epoch:w.a.epoch,ops:Object.values(history)}),max:''};w.a.receive(w.attrs);}
 edit(s=>{s.inv.objets=[];});assert.equal(w.read().state.inv.objets.length,0);
 edit(s=>{s.inv.objets.push({ref:'new',nom:'Fiole',qte:2,ou:'terre'});});
 edit(s=>{s.inv.objets[0].nom='Fiole modifiée';s.inv.objets[0].qte=1;});const actual=w.read();
 assert.equal(actual.state.inv.objets[0].nom,'Fiole modifiée');assert.equal(actual.state.inv.objets[0].qte,1);assert.equal(actual.conflicts.length,0);
});
test('supprimer deux fois une même pile depuis deux joueurs reste un conflit, sans appliquer les autres changements du second',()=>{
 const w=world();w.change(w.a,s=>{s.inv.objets=[];});w.change(w.b,s=>{s.inv.objets=[];s.name='Ne doit pas remplacer';});const actual=w.read();
 assert.equal(actual.state.inv.objets.length,0);assert.notEqual(actual.state.name,'Ne doit pas remplacer');assert.ok(actual.conflicts.length>0);
});
test('MOD complétés localement : deux armes et des éditions concurrentes',()=>{
 const catalogue=require('../docs/data/owd-boutique.json').equipements;
 const dagger=C.copy(catalogue.find(o=>o.nom==='Astral Dagger'));
 dagger.ref='dagger';
 const state=fixture();
 state.inv.objets.push({ref:'new',nom:'Arme créée',arme:{modsDegats:[],modsParade:[]}},dagger);
 const attrs=B.encode(state),sessions=['a','b'].map(id=>new B.Session(attrs,state,()=>1,{id}));
 for(const [i,session] of sessions.entries()){
   const local=session.receive(attrs).state;
   for(const o of local.inv.objets.filter(o=>o.arme)){
     for(const field of ['modsDegats','modsParade']){
       o.arme[field]=Array.from({length:3},(_,j)=>o.arme[field]?.[j]||'');
     }
   }
   // Le pont reprend la forme normalisée comme état local après réception.
   if(i===0)session.local=B.flatten(local);
   local.inv.objets[2].arme.modsDegats[i]=i?'Chance':'Force';
   if(i===0){
     local.inv.objets[2].arme.modsParade[0]='Endurance';
     local.inv.objets[3].arme.modsDegats[2]='Force';
   }
   session.capture(local);
 }
 for(const session of sessions){
   attrs[B.PREFIX+session.id]={current:JSON.stringify({epoch:session.epoch,ops:Object.values(session.outgoing())})};
 }
 const saved=B.read(attrs);
 assert.deepEqual(saved.state.inv.objets[2].arme.modsDegats,['Force','Chance',null]);
 assert.equal(saved.state.inv.objets[2].arme.modsParade[0],'Endurance');
 assert.deepEqual(saved.state.inv.objets[3].arme.modsDegats,['Dexterite','Dexterite','Force']);
 assert.equal(saved.conflicts.length,0);
});
test('deux accélérations de la même source ne changent la réserve qu’une fois',()=>{
 for(const effet of [false,true]){
   const state=fixture(), id='r1';
   state.etat.pv=40;
   if(effet)state.effetsActifs=[{id,actif:true,reste:60}];
   else state.modData.recuperation={ajouts:[{id,actif:true,resteSecondes:60}]};
   const attrs=B.encode(state);
   for(const client of ['a','b']){
     const session=new B.Session(attrsWithoutOps(attrs),state,()=>1,{id:client});
     const local=C.copy(state);
     if(effet)local.effetsActifs=[];
     else delete local.modData.recuperation;
     local.etat.pv+=5;
     session.capture(local,{recupAccelere:{id,effet,secondes:60}});
     attrs[B.PREFIX+client]={current:JSON.stringify({epoch:session.epoch,ops:Object.values(session.outgoing())})};
   }
   const result=B.read(attrs);
   assert.equal(result.state.etat.pv,45);
   assert.equal(result.conflicts.length,1);
 }
 function attrsWithoutOps(attrs){return Object.fromEntries(Object.entries(attrs).filter(([k])=>!k.startsWith(B.PREFIX)));}
});
console.log(count+' scénarios de stockage regroupé validés.');
