/* Tests de concurrence sur deux clients, serveur simulé séparé de leur cache. */
'use strict';
const assert = require('node:assert/strict');
const C = require('../docs/javascripts/owd-sync.js');
const M = require('../docs/javascripts/owd-attr-map.js');
const Migr = require('../docs/javascripts/owd-migrations.js');
let checks = 0;
function test(name, fn) { fn(); checks++; console.log('OK', name); }
const cp = C.copy;
function seed() {
  const s=M.blank(); s.v=11; s.rel='3.0.0b';
  s.comps=[{id:'c1',nom:'Lutte',rang:1},{id:'c2',nom:'Évasion',rang:2}];
  s.inv.objets=[{ref:'o1',id:'libre',nom:'Dague',qte:1,arme:{degats:'16',modsDegats:['Force','','']}}, {ref:'o2',id:'libre',nom:'Pain',qte:5}];
  s.avantages=[{id:'av1',nom:'A',desc:'texte',cout:1}];
  return s;
}
function world() {
  const s=seed(), attrs={[C.BASE]:{current:JSON.stringify({format:1,state:s}),max:''}};
  let clock=1000;
  const a=new C.Session(cp(attrs),cp(s),()=>clock), b=new C.Session(cp(attrs),cp(s),()=>clock);
  return {attrs,a,b,s, tick:n=>clock+=n, write(lot){Object.assign(attrs,cp(lot));}, value(){return C.read(attrs).state;}};
}
function change(w, client, fn) { let s=C.rebuild(client.local); fn(s); client.capture(s); w.write(client.outgoing()); }
test('round-trip intégral, accents, tableaux fixes, clés inconnues',()=> {
  const s=seed();s.modData.extra={'étrange / clef':{x:false,n:null}};
  assert.deepEqual(C.rebuild(C.flatten(s)),s);
});
test('deux caractéristiques simultanées',()=> {
  const w=world();change(w,w.a,s=>s.caracs.Force=42);change(w,w.b,s=>s.caracs.Intelligence=37);
  assert.equal(w.value().caracs.Force,42);assert.equal(w.value().caracs.Intelligence,37);
  assert.deepEqual(w.a.receive(w.attrs).state,w.b.receive(w.attrs).state);
});
test('deux champs de la même compétence',()=> {
  const w=world();change(w,w.a,s=>s.comps[0].nom='Bagarre');change(w,w.b,s=>s.comps[0].rang=4);
  assert.equal(w.value().comps[0].nom,'Bagarre');assert.equal(w.value().comps[0].rang,4);
});
test('deux objets et deux champs du même objet',()=> {
  const w=world();change(w,w.a,s=>{s.inv.objets[0].qte=2;s.inv.objets[1].nom='Galette';});
  change(w,w.b,s=>{s.inv.objets[0].arme.degats='20';s.inv.objets[1].qte=8;});
  assert.equal(w.value().inv.objets[0].qte,2);assert.equal(w.value().inv.objets[0].arme.degats,'20');
  assert.equal(w.value().inv.objets[1].nom,'Galette');assert.equal(w.value().inv.objets[1].qte,8);
});
test('ajouts simultanés dans la même liste',()=> {
  const w=world();change(w,w.a,s=>s.comps.push({id:'a-new',nom:'A',rang:1}));change(w,w.b,s=>s.comps.push({id:'b-new',nom:'B',rang:2}));
  assert.deepEqual(w.value().comps.map(x=>x.id),['c1','c2','a-new','b-new']);
});
test('suppression A et édition B sans dépendance aux index',()=> {
  const w=world();change(w,w.a,s=>s.comps.splice(0,1));change(w,w.b,s=>s.comps[1].rang=5);
  assert.equal(w.value().comps.length,1);assert.equal(w.value().comps[0].id,'c2');assert.equal(w.value().comps[0].rang,5);
});
test('édition d’une ligne supprimée ne la ressuscite pas',()=> {
  const w=world();change(w,w.a,s=>s.comps.splice(0,1));change(w,w.b,s=>s.comps[0].nom='fantôme');
  assert.deepEqual(w.value().comps.map(x=>x.id),['c2']);
});
test('même champ : dernier arrivé au serveur, convergence après garde',()=> {
  const w=world();change(w,w.a,s=>s.notes='A');change(w,w.b,s=>s.notes='B');
  assert.equal(w.a.receive(w.attrs).state.notes,'A');w.tick(9000);
  assert.equal(w.a.receive(w.attrs).state.notes,'B');assert.equal(w.b.receive(w.attrs).state.notes,'B');
  assert.equal(Object.keys(w.a.outgoing()).length,0);
});
test('frappe non encore envoyée protégée pendant une réception',()=> {
  const w=world();const s=cp(w.s);s.notes='en cours';w.a.capture(s);
  change(w,w.b,s=>s.caracs.Force=50);
  const merged=w.a.receive(w.attrs).state;assert.equal(merged.notes,'en cours');assert.equal(merged.caracs.Force,50);
  w.write(w.a.outgoing());assert.equal(w.value().notes,'en cours');assert.equal(w.value().caracs.Force,50);
});
test('tables éparses : retirer la dernière clé ne détruit pas celle ajoutée ailleurs',()=> {
  const w=world();change(w,w.a,s=>s.caracsLeviers={total:{a1:{Force:3}}});
  w.a.receive(w.attrs);w.b.receive(w.attrs);
  change(w,w.a,s=>s.caracsLeviers={});change(w,w.b,s=>s.caracsLeviers.total.a1.Intelligence=7);
  assert.equal(w.value().caracsLeviers.total.a1.Intelligence,7);assert.equal(w.value().caracsLeviers.total.a1.Force,undefined);
});
test('trois MOD d’arme : cases modifiées indépendamment',()=> {
  const w=world();change(w,w.a,s=>s.inv.objets[0].arme.modsDegats[0]='Dexterite');change(w,w.b,s=>s.inv.objets[0].arme.modsDegats[1]='Force');
  assert.deepEqual(w.value().inv.objets[0].arme.modsDegats,['Dexterite','Force','']);
});
test('horloge : jours/heures/minutes/secondes forment un élément indivisible',()=> {
  const w=world();const s=cp(w.s);s.horloge={jours:3,heures:1,minutes:0,secondes:0};w.a.capture(s);
  const lot=w.a.outgoing();assert.equal(Object.keys(lot).length,1);
});
test('réseau/refus : une écriture non reçue reste en attente et repart',()=> {
  const w=world();const s=cp(w.s);s.notes='à conserver';w.a.capture(s);w.a.outgoing();w.tick(9000);
  assert.equal(w.a.receive(w.attrs).state.notes,'à conserver');assert.ok(Object.keys(w.a.outgoing()).length);
});
test('activation : aucune modification avant confirmation de la photographie',()=> {
  const s=seed(), a=new C.Session({},s), attrs={};s.notes='après ouverture';a.capture(s);
  Object.assign(attrs,a.outgoing());assert.equal(Object.keys(attrs).length,1);
  assert.equal(JSON.parse(attrs[C.BASE].current).state.notes,'');
  a.receive(attrs);Object.assign(attrs,a.outgoing());assert.equal(C.read(attrs).state.notes,'après ouverture');
});
test('relecture après fermeture : source collaborative prime sur owd_state périmé',()=> {
  const w=world();w.attrs.owd_state={current:JSON.stringify({...w.s,notes:'ancien'})};change(w,w.a,s=>s.notes='nouveau');
  assert.equal(M.attrsToState(w.attrs).notes,'nouveau');assert.equal(M.ficheDe(w.attrs).schema,11);
});
test('import/remplacement conserve l’identité et supprime les anciennes lignes',()=> {
  const w=world();const s=cp(w.s);s.comps=[];s.inv.objets=[{ref:'nouveau',nom:'Arc',qte:2}];s.notes='import';w.a.capture(s);w.write(w.a.outgoing());
  assert.deepEqual(w.value().comps,[]);assert.equal(w.value().inv.objets.length,1);assert.equal(w.value().inv.objets[0].ref,'nouveau');
});
test('données corrompues : diagnostic et aucune reconstruction silencieuse',()=> {
  const w=world();w.attrs[C.BASE].current='{cassé';assert.equal(M.attrsToState(w.attrs).degrade,'illisible');
  assert.throws(()=>w.a.receive(w.attrs));
});
test('chemins hostiles : rejet de prototype pollution',()=> {
  const w=world(),path=[['k','__proto__'],['k','polluted']];Object.assign(w.attrs,C.pack({[JSON.stringify(path)]:['v',true]}));
  assert.throws(()=>C.read(w.attrs));assert.equal({}.polluted,undefined);
});
test('migration 10 → 11 → 10 sans perte',()=> {
  const s=seed();s.v=10;s.avantages=[{nom:'ancien',cout:2,desc:'texte'}];
  const up=Migr.appliquer(s,10,11);assert.ok(up.ok);assert.equal(up.state.avantages[0].id,'av-legacy-0');
  const down=Migr.appliquer(up.state,11,10);assert.ok(down.ok);assert.deepEqual(down.state,s);
});
test('migration 12 → 11 → 12 conserve les liens et les emplacements des sacs',()=>{const s=seed();s.v=12;s.inv.objets=[{ref:'bag',sac:true,qte:1,ou:'dos'},{ref:'a',dans:'bag',ou:'sac',emp:-1},{ref:'b',dans:'bag',ou:'sacep',emp:2}];const down=Migr.appliquer(s,12,11);assert.ok(down.ok);assert.equal(down.state.inv.objets[1].dans,'');const up=Migr.appliquer(down.state,11,12);assert.ok(up.ok);assert.deepEqual(up.state,s);});
console.log(checks+' scénarios de concurrence validés.');
