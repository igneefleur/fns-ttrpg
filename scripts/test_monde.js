'use strict';
const assert=require('node:assert/strict'),D=require('../docs/javascripts/owd-monde-data.js'),C=D.sync,F=require('../docs/javascripts/owd-sync.js');
let total=0;function test(n,f){f();total++;console.log('OK '+n);}
const empty={v:1,horloge:{jours:1,heures:8,minutes:0,secondes:0},temperature:20};
const attrs=s=>({[C.BASE]:{current:JSON.stringify({format:1,state:s}),max:''}});
function merge(store,lot){Object.assign(store,lot);}
test('horloge : reports secondes/minutes/heures vers les jours',()=>assert.deepEqual(D.clock({jours:2,heures:25,minutes:61,secondes:61}),{jours:3,heures:2,minutes:2,secondes:1}));
test('horloge : round de 3 s, minuit, recul sans temps négatif',()=>{assert.deepEqual(D.advance({jours:12,heures:23,minutes:59,secondes:59},3),{jours:13,heures:0,minutes:0,secondes:2});assert.deepEqual(D.advance(empty.horloge,-999999),{jours:0,heures:0,minutes:0,secondes:0});});
test('conversion Camp : date et température manuelle conservées',()=>assert.deepEqual(D.read({owd_camp_h:{current:'5,1430'},owd_camp_conf:{current:'{"v":1,"degres":-12,"lieu":"Berg"}'}}),{v:1,horloge:{jours:5,heures:23,minutes:50,secondes:0},temperature:-12}));
test('conversion Camp : température calculée avant conversion conservée',()=>{assert.equal(D.read({owd_camp_h:'3,60',owd_camp_conf:'{"v":1,"milieu":"desert"}'}).temperature,18);assert.equal(D.read({owd_camp_h:'3,480',owd_camp_conf:'{"v":1,"milieu":"desert"}'}).temperature,42);});
test('Camp neuf : premier jour à 8 h, température inconnue',()=>{assert.equal(D.read({}).temperature,null);assert.equal(D.read({}).horloge.heures,8);});
test('calendrier : origine, changement de mois et année de 336 jours',()=>{
 const h=j=>({...empty.horloge,jours:j});
 assert.deepEqual(D.dateMonde(h(1)),{annee:412,mois:2,jour:3,saison:'Printemps'});
 assert.deepEqual(D.dateMonde(h(26)),{annee:412,mois:2,jour:28,saison:'Printemps'});
 assert.deepEqual(D.dateMonde(h(27)),{annee:412,mois:3,jour:1,saison:'Printemps'});
 assert.deepEqual(D.dateMonde(h(1),{annee:412,mois:12,jour:28}),{annee:412,mois:12,jour:28,saison:'Hiver'});
 assert.deepEqual(D.dateMonde(h(2),{annee:412,mois:12,jour:28}),{annee:413,mois:1,jour:1,saison:'Printemps'});
 assert.deepEqual(D.dateMonde(h(337)),{annee:413,mois:2,jour:3,saison:'Printemps'});
 assert.deepEqual(D.dateMonde(h(0)),{annee:412,mois:2,jour:2,saison:'Printemps'});
 for(const [mois,saison] of [[1,'Printemps'],[3,'Printemps'],[4,'Été'],[6,'Été'],[7,'Automne'],[9,'Automne'],[10,'Hiver'],[12,'Hiver']])assert.equal(D.dateMonde(h(1),{annee:412,mois,jour:1}).saison,saison);
});
test('calendrier : saisie, validation et synchronisation sans modifier les anciennes horloges',()=>{
 assert.deepEqual(D.dateDepart(),{annee:412,mois:2,jour:3});
 for(const d of [{annee:1,mois:13,jour:1},{annee:1,mois:1,jour:29},{annee:0,mois:1,jour:1},{annee:1,mois:1}])assert.throws(()=>D.dateDepart(d));
 const store=attrs(empty),a=new C.Session(store,empty),b=new C.Session(store,empty),sa=C.copy(empty),sb=C.copy(empty);sa.dateDepart={annee:418,mois:6,jour:20};sb.horloge=D.advance(sb.horloge,86400);a.capture(sa);b.capture(sb);merge(store,a.outgoing());merge(store,b.outgoing());let r=D.read(store);assert.deepEqual(r.dateDepart,sa.dateDepart);assert.equal(r.horloge.jours,2);assert.deepEqual(D.dateMonde(r.horloge,r.dateDepart),{annee:418,mois:6,jour:21,saison:'Été'});
 assert.equal(D.read(attrs(empty)).dateDepart,undefined);
});
test('horloge et température simultanées : aucun écrasement',()=>{const s=attrs(empty),a=new C.Session(s,empty),b=new C.Session(s,empty),sa=C.copy(empty),sb=C.copy(empty);sa.horloge=D.advance(sa.horloge,3600);sb.temperature=-5;a.capture(sa);b.capture(sb);const la=a.outgoing(),lb=b.outgoing();assert.equal(Object.keys(la).length,1);assert.equal(Object.keys(lb).length,1);merge(s,la);merge(s,lb);assert.deepEqual(a.receive(s).state,b.receive(s).state);assert.equal(D.read(s).temperature,-5);assert.equal(D.read(s).horloge.heures,9);});
test('espaces séparés : Monde utilise le moteur de fiche sans écrire la fiche',()=>{assert.equal(C.create,F.create);assert.equal(F.read(attrs(empty)),null);assert.ok(Object.keys(C.pack(C.flatten(empty))).every(n=>n.startsWith('owd_monde_p_')));});
test('une frappe non envoyée survit à une réception',()=>{const s=attrs(empty),a=new C.Session(s,empty),b=new C.Session(s,empty),sa=C.copy(empty),sb=C.copy(empty);sa.temperature=17.5;a.capture(sa);sb.horloge=D.advance(sb.horloge,3);b.capture(sb);merge(s,b.outgoing());assert.equal(a.receive(s).state.temperature,17.5);});
test('même champ : convergence, pas de renvoi du conflit en boucle',()=>{let now=1000;const s=attrs(empty),a=new C.Session(s,empty,()=>now),b=new C.Session(s,empty,()=>now);a.capture({...empty,temperature:10});b.capture({...empty,temperature:30});merge(s,a.outgoing());merge(s,b.outgoing());now+=5000;assert.equal(a.receive(s).state.temperature,30);assert.equal(b.receive(s).state.temperature,30);assert.deepEqual(a.outgoing(),{});});
test('écriture perdue : conservée et renvoyée',()=>{let now=1000;const s=attrs(empty),a=new C.Session(s,empty,()=>now);a.capture({...empty,temperature:9});a.outgoing();now+=5000;assert.equal(a.receive(s).state.temperature,9);assert.equal(Object.keys(a.outgoing()).length,1);});
test('activation confirmée avant les registres, anciennes données intactes',()=>{const s={owd_camp_h:'8,520',owd_camp_conf:'{"v":1,"degres":21}'},a=new C.Session(s,D.read(s));a.capture({...D.read(s),temperature:25});assert.deepEqual(Object.keys(a.outgoing()),[C.BASE]);assert.equal(Object.keys(a.outgoing()).length,0);merge(s,{[C.BASE]:{current:JSON.stringify({format:1,state:D.read(s)})}});a.receive(s);merge(s,a.outgoing());assert.equal(D.read(s).temperature,25);assert.equal(s.owd_camp_h,'8,520');});
test('données illisibles ou futures : arrêt, aucune remise à zéro',()=>{assert.throws(()=>D.read({owd_camp_h:'cassé'}));assert.throws(()=>D.read({owd_camp_conf:'{"v":9}'}));assert.throws(()=>D.read(attrs({...empty,v:2})));assert.throws(()=>D.read(attrs({...empty,temperature:'20'})));assert.throws(()=>D.read(attrs({...empty,horloge:{...empty.horloge,secondes:60}})));});
console.log(total+' scénarios Monde validés.');
