'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../docs/javascripts/owd-monde-data.js'),C=D.sync;
const state=(day,h=0,m=0,sec=0)=>({v:1,temperature:17.5,temperatureAuto:true,temperatureMode:'progressif',temperatureSaisonMode:'progressif',temperatureRegion:'chersonese',dateDepart:{annee:412,mois:1,jour:1},horloge:{jours:day+1,heures:h,minutes:m,secondes:sec}});
const at=(s,h,m=0,sec=0)=>({...s,horloge:{...s.horloge,heures:h,minutes:m,secondes:sec}});
const proche=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const refs=[[16,8],[32,18],[16,8],[0,-6]],sun=[[8,20],[7,21],[8,20],[9,19]];
let checked=0;
for(const annuel of ['brut','progressif'])for(const region of Object.keys(D.regions))for(let day=0;day<336;day++){
 const s={...state(day),temperatureSaisonMode:annuel,temperatureRegion:region},c=D.climat(s),f=c.lever-1,values=[];
 assert.equal(c.pic,14);assert.equal(c.lever+c.coucher,28);
 assert.equal(c.jourSaison,day%84+1);
 if(annuel==='brut'){assert.equal(c.jour,refs[Math.floor(day/84)][0]);assert.equal(c.nuit,refs[Math.floor(day/84)][1]);assert.equal(c.lever,sun[Math.floor(day/84)][0]);assert.equal(c.coucher,sun[Math.floor(day/84)][1]);}
 for(let h=0;h<24;h++){
  const v=D.temperatureMonde(at(s,h));assert.ok(Number.isInteger(v));assert.equal(D.temperatureMonde(at(s,h,59,59)),v);values.push(v);checked++;
  const brut={...at(s,h),temperatureMode:'brut'};assert.equal(D.temperatureMonde(brut),D.arrondi(h>=c.lever&&h<c.coucher?c.jour:c.nuit));
  assert.equal(D.soleil(at(s,h,59,59)).position,D.soleil(at(s,h)).position);
 }
 assert.equal(values[16],D.arrondi(c.jour+2));assert.equal(values[f],D.arrondi(c.nuit-2));
 assert.equal(Math.max(...values),values[16]);assert.equal(Math.min(...values),values[f]);
 assert.equal(values.filter(v=>v===values[16]).length,1);assert.equal(values.filter(v=>v===values[f]).length,1);
 assert.ok(values[17]<values[16]);assert.ok(values[f+1]>values[f]);
 for(const h of [12,13,14,18])assert.equal(values[h],D.arrondi(c.jour));
 assert.equal(values[15],D.arrondi(c.jour+1));assert.equal(values[17],D.arrondi(c.jour+1));
 for(let h=f+1;h<=16;h++)assert.ok(values[h]>=values[h-1]);
 assert.equal(D.soleil(at(s,c.lever)).position,'Lever du soleil');assert.equal(D.soleil(at(s,14)).position,'Soleil au plus haut');assert.equal(D.soleil(at(s,c.coucher)).position,'Coucher du soleil');
}
// Profils de référence approuvés, y compris la descente nocturne après minuit.
const profils=[
 [8,8,8,8,8,8,7,6,8,10,12,14,16,16,16,17,18,17,16,16,16,14,12,10],
 [26,24,22,20,18,17,16,19,21,24,27,29,32,32,32,33,34,33,32,32,32,32,30,28],
 [8,8,8,8,8,8,7,6,8,10,12,14,16,16,16,17,18,17,16,16,16,14,12,10],
 [-6,-6,-6,-6,-6,-6,-6,-7,-8,-6,-4,-2,0,0,0,1,2,1,0,0,-2,-4,-6,-6]
];
for(let saison=0;saison<4;saison++){
 const s=state(saison*84+19);
 assert.deepEqual(Array.from({length:24},(_,h)=>D.temperatureMonde(at(s,h))),profils[saison]);
}
// En progression saisonnière, la cible du soir est bien la nuit du lendemain.
let ciblesDistinctes=0;
for(let day=0;day<336;day++){
 const s=state(day),c=D.climat(s),n=D.climatJour(s,day+1);
 const duree=Math.max(1,Math.min(Math.ceil(Math.abs(c.jour-n.nuit)/2),24+n.lever-3-c.coucher));
 const fin=c.coucher+duree;
 if(fin<24){
  assert.equal(D.temperatureMonde(at(s,fin)),D.arrondi(n.nuit));
  if(D.arrondi(n.nuit)!==D.arrondi(c.nuit))ciblesDistinctes++;
 }else{
  const lendemain=state((day+1)%336);
  assert.equal(D.temperatureMonde(at(lendemain,fin-24)),D.arrondi(n.nuit));
 }
}
assert.ok(ciblesDistinctes>0,'la cible du lendemain diffère réellement de celle du jour dans les transitions');
for(const [saison,pair] of refs.entries()){
 const peak=[],plateau=[];
 for(let j=1;j<=84;j++){
  const c=D.climat(state(saison*84+j-1));
  if(c.jour===pair[0]&&c.nuit===pair[1])plateau.push(j);
  if((saison===1&&D.temperatureMonde(state(84+j-1,16))===38)||(saison===3&&D.temperatureMonde(state(252+j-1,c.lever-1))===-12))peak.push(j);
 }
 if(saison===1||saison===3){assert.deepEqual(peak,[42,43]);assert.equal(plateau.length,56);}else assert.equal(plateau.length,56);
}
// Transitions de 21 jours : les deux extrémités d'une saison se rejoignent.
const summerStart=D.climat(state(84));proche(summerStart.jour,16+16*14.5/21);proche(summerStart.nuit,8+10*14.5/21);
const winterStart=D.climat(state(252));proche(winterStart.jour,16-16*14.5/21);proche(winterStart.nuit,8-14*14.5/21);
for(const day of [0,83,84,167,168,251,252,335]){
 const s=state(day),c=D.climat(s),n=D.climat(state((day+1)%336));assert.ok(Math.abs(c.jour-n.jour)<1);assert.ok(Math.abs(c.nuit-n.nuit)<1);
 assert.equal(D.temperatureMonde(at(s,23,59,59)),D.temperatureMonde(at(s,23)));
 const next={...s,horloge:D.advance(at(s,23,59,59).horloge,1)};assert.equal(D.temperatureMonde(next),D.temperatureMonde(state((day+1)%336)));
}
assert.notEqual(summerStart.jour,D.arrondi(summerStart.jour),'les références intermédiaires gardent leurs décimales');
for(const n of [-7.5,-0.5,0,0.5,7.5])assert.equal(D.arrondi(n),Math.sign(n)*Math.ceil(Math.abs(n))||0);
assert.equal(D.temperatureMonde({...state(0),temperatureAuto:false}),18);assert.equal(D.temperatureMonde({...state(0),temperatureAuto:false,temperature:null}),null);
for(const invalid of [{temperatureAuto:1},{temperatureMode:'x'},{temperatureSaisonMode:'x'},{temperatureRegion:'__proto__'}])assert.throws(()=>D.validate({...state(0),...invalid}));
// Compatibilité 4.40.0 : les réglages absents gardent les saisons brutes.
const legacy=state(84);delete legacy.temperatureSaisonMode;assert.equal(D.climat(legacy).jour,32);
// Concurrence : horloge, mode journalier et mode saisonnier indépendants.
const initial=state(0),store={[C.BASE]:{current:JSON.stringify({format:1,state:initial})}},a=new C.Session(store,initial),b=new C.Session(store,initial);
a.capture(at(initial,16));b.capture({...initial,temperatureMode:'brut',temperatureSaisonMode:'brut',temperatureRegion:'enmerkar'});Object.assign(store,a.outgoing(),b.outgoing());
const merged=D.read(store);assert.equal(merged.horloge.heures,16);assert.equal(merged.temperatureMode,'brut');assert.equal(merged.temperatureSaisonMode,'brut');assert.equal(D.temperatureMonde(merged),16);assert.equal(merged.temperature,17.5);
// Le moteur de climat vit seulement côté site ; le pont transporte les données.
const bridge=fs.readFileSync('extension/firefox/beta/roll20-page.js','utf8');
assert.ok(bridge.includes('donneesMondeDepuisAttrs'));
assert.ok(!bridge.includes('OwdMondeData'));
assert.ok(!fs.readFileSync('extension/firefox/monde-data.js','utf8').includes('function'));
console.log(`OK climat : ${checked} créneaux, 336 jours, 3 régions, 4 combinaisons Brut/Progressif, pics horaires et saisonniers uniques, sorties entières et calculs côté site.`);
