'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../docs/javascripts/owd-monde-data.js'),C=D.sync;
const state=(mois,h=0,m=0,s=0)=>({v:1,temperature:17.5,temperatureAuto:true,temperatureMode:'progressif',temperatureRegion:'chersonese',dateDepart:{annee:412,mois,jour:1},horloge:{jours:1,heures:h,minutes:m,secondes:s}});
const at=(s,h,m=0,sec=0)=>({...s,horloge:{...s.horloge,heures:h,minutes:m,secondes:sec}});
const proche=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
for(const [mois,lever,coucher,nuit,jour] of [[1,8,20,8,16],[4,7,21,18,32],[7,8,20,8,16],[10,9,19,-6,0]]){
 const s=state(mois);assert.deepEqual(D.soleil(at(s,14)),{lever,pic:14,coucher,position:'Soleil au plus haut',jour:true});
 assert.equal(D.soleil(at(s,lever)).position,'Lever du soleil');assert.equal(D.soleil(at(s,coucher)).position,'Coucher du soleil');
 assert.equal(D.soleil(at(s,lever,1)).position,'Soleil montant');assert.equal(D.soleil(at(s,16)).position,'Soleil descendant');
 assert.equal(D.soleil(at(s,0)).position,'Nuit');
 const brut={...s,temperatureMode:'brut'};
 assert.equal(D.temperatureMonde(at(brut,lever-1,59,59)),nuit);assert.equal(D.temperatureMonde(at(brut,lever)),jour);
 assert.equal(D.temperatureMonde(at(brut,coucher-1,59,59)),jour);assert.equal(D.temperatureMonde(at(brut,coucher)),nuit);
 for(const region of Object.keys(D.regions)){
  const r={...s,temperatureRegion:region};proche(D.temperatureMonde(at(r,lever-1)),nuit-2);proche(D.temperatureMonde(at(r,16)),jour+2);
  let prev=null;
  for(let minutes=0;minutes<1440;minutes++){
   const t=D.temperatureMonde(at(r,Math.floor(minutes/60),minutes%60));assert.ok(t>=nuit-2-1e-9&&t<=jour+2+1e-9);
   if(prev!==null){if(minutes>(lever-1)*60&&minutes<=16*60)assert.ok(t>=prev-1e-9);else assert.ok(t<=prev+1e-9);}prev=t;
  }
  assert.ok(Math.abs(D.temperatureMonde(at(r,23,59,59))-D.temperatureMonde(at(r,0)))<0.001);
 }
}
const ete=state(4);assert.equal(D.arrondi(D.temperatureMonde(at(ete,0))),23);assert.equal(D.arrondi(D.temperatureMonde(at(ete,12))),28);
assert.notEqual(D.temperatureMonde(at(ete,12)),D.arrondi(D.temperatureMonde(at(ete,12))));
assert.notEqual(D.temperatureMonde(at(ete,12,30)),D.temperatureMonde(at(ete,12,30,3)));
for(const n of [-7.5,-0.5,0,0.5,7.5])assert.equal(D.arrondi(n),Math.sign(n)*Math.ceil(Math.abs(n))||0);
assert.equal(D.temperatureMonde({...ete,temperatureAuto:false}),17.5);assert.equal(D.temperatureMonde({...ete,temperatureAuto:false,temperature:null}),null);
for(const invalid of [{temperatureAuto:1},{temperatureMode:'x'},{temperatureRegion:'__proto__'}])assert.throws(()=>D.validate({...ete,...invalid}));
// Une modification d'horloge et un changement de mode simultanés convergent.
const store={[C.BASE]:{current:JSON.stringify({format:1,state:ete})}},a=new C.Session(store,ete),b=new C.Session(store,ete);
a.capture(at(ete,16));b.capture({...ete,temperatureMode:'brut',temperatureRegion:'enmerkar'});Object.assign(store,a.outgoing(),b.outgoing());
const merged=D.read(store);assert.equal(merged.horloge.heures,16);assert.equal(merged.temperatureMode,'brut');assert.equal(D.temperatureMonde(merged),32);assert.equal(merged.temperature,17.5);
// Le calendrier recalcule le climat au changement de saison et d'année.
let fin={...state(3,23,59,59),dateDepart:{annee:412,mois:3,jour:28}};
fin.horloge=D.advance(fin.horloge,1);assert.equal(D.soleil(fin).lever,7);assert.equal(D.climat(fin).jour,32);
fin={...state(12),dateDepart:{annee:412,mois:12,jour:28}};fin.horloge=D.advance(fin.horloge,86400);assert.equal(D.climat(fin).jour,16);
// Le pont lit les mêmes calculs, sans panneau ouvert ni température dérivée écrite.
assert.equal(fs.readFileSync('extension/firefox/monde-data.js','utf8'),fs.readFileSync('docs/javascripts/owd-monde-data.js','utf8'));
const bridge=fs.readFileSync('extension/firefox/beta/roll20-page.js','utf8'),start=bridge.indexOf('  function temperatureMondeDepuisAttrs(attrs) {'),end=bridge.indexOf('\n\n  // ---------- le camp ----------',start);
const lire=vm.runInNewContext('('+bridge.slice(start,end).trim()+')',{window:{OwdMondeData:D}});
assert.equal(lire(store),32);const c=new C.Session(store,D.read(store));c.capture({...D.read(store),temperatureMode:'progressif',horloge:at(ete,12,30).horloge});Object.assign(store,c.outgoing());proche(lire(store),D.temperatureMonde(D.read(store)));
assert.equal(lire({owd_monde_base:{current:'cassé'}}),null);
console.log('OK climat : 4 saisons, 3 régions, transitions jour/nuit, extrema, courbes minute par minute, précision, calendrier, synchronisation et pont Roll20.');
