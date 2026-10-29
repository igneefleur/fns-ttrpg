'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const data=require('../docs/data/owd-boutique.json'),M=require('../docs/javascripts/owd-attr-map.js'),C=require('../docs/javascripts/owd-sync.js').Compact;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} ≠ ${b}`);
const defs=data.effets,byName=n=>defs.find(e=>e.nom===n),item=n=>structuredClone(data.equipements.find(o=>o.nom===n));
function setup(){let id=0;const state={effetsActifs:[],effetsPermanents:{},effAlcool:0,inv:{objets:[]},etat:{ps:0,ph:0,pv:0,pi:0,contenance:0}};
 const ctx={state,D:()=>data,uid:()=>String(++id),num:(v,d=0)=>v==null||!Number.isFinite(Number(v))?d:Number(v),snum:v=>Number(v)||0,pnum:v=>Math.max(0,Number(v)||0),clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),maxDe:()=>10000,courant:k=>state.etat[k]||0,bougeReserve:(k,n)=>{state.etat[k]=Math.max(0,Math.min(10000,(state.etat[k]||0)+n));},equipementsBonus:()=>[],casePermise:()=>false,casesDe:()=>[],defenseArme:()=>null,horlogeVersSecondes:()=>0,recupCoffre:()=>({}),reinitialiseHorlogeDigestion:()=>{},nettoieRecupCoffre:()=>{},recupOublieSuivi:()=>{},refresh:()=>{},rebuildRecuperation:()=>{},flash:()=>{},sayChat:()=>{},fmtP:String,invRender:null,contenancePrise:()=>state.etat.contenance,window:{OwdInventoryData:require('../docs/javascripts/owd-inventaire-data.js')}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/fiche/fiche/effets.js','utf8'),ctx);
 const inv=fs.readFileSync('src/fiche/equipement/inv-nouveaux.js','utf8');vm.runInContext(inv.slice(0,inv.indexOf('  function invConsommerDialogue(')),ctx);
 const vomit=fs.readFileSync('src/fiche/fiche/contenance.js','utf8');vm.runInContext(vomit.slice(vomit.indexOf('  function vomirContenu()'),vomit.indexOf('  function buildContenance()')),ctx);
 return {ctx,state,add:(name,factor)=>ctx.appliqueEffet(byName(name).id,'Test','',undefined,'digestive',factor),consume:(name,q=1)=>{const o=item(name);o.qte=q;o.ref='food'+(++id);state.inv.objets.push(o);assert.equal(ctx.invConsommer(o,q,''),true);return o;}};
}
// Every current food is represented exactly, without a made-up cadence.
for(const o of data.equipements.filter(o=>o.nourri))for(const res of ['ps','ph'])if(o[res]){
 const w=setup(),d=w.ctx.effetNutrition(o,res,o[res]);assert.ok(d,o.nom);assert.equal(d.nutrition.apport,o[res],o.nom+' '+res);
}
for(const source of ['Nourriture','Eau'])for(const res of ['ps','ph'])for(const loss of [false,true]){
 const d=defs.filter(e=>e.nutrition&&e.nutrition.source===source&&e.nutrition.reserve===res&&(e.nutrition.apport<0)===loss);
 assert.equal(d.length,source==='Eau'?5:10);assert.ok(d.every(e=>e.cumul==='Oui'&&e.description.endsWith('Cumulable.')));
}
{
 const w=setup();w.consume('Meat Stew');assert.equal(w.state.etat.ps,0);assert.equal(w.state.etat.ph,0);
 w.ctx.effetsAvance(3599);near(w.state.etat.ps,20*3599/3600);w.ctx.effetsAvance(1);assert.equal(w.state.etat.ps,20);assert.equal(w.state.etat.ph,15);
 w.ctx.effetsAvance(3600);assert.equal(w.state.etat.ps,40);assert.equal(w.state.etat.ph,30);assert.equal(w.state.effetsActifs.length,0);
}
{
 const w=setup();w.consume('Clean Water');w.ctx.effetsAvance(300);w.consume('Clean Water',2);w.ctx.effetsAvance(300);assert.equal(w.state.etat.ph,30);
 w.ctx.effetsNormalise(w.state);const s=M.blank();s.effetsActifs=w.state.effetsActifs;const restored=M.attrsToState(M.stateToAttrs(s));assert.deepEqual(restored.effetsActifs,JSON.parse(JSON.stringify(s.effetsActifs)));
 w.state.effetsActifs=restored.effetsActifs;w.ctx.effetsAvance(300);assert.equal(w.state.etat.ph,45,'Deux doses ultérieures, sans écraser la première');
}
{
 const w=setup(),o=item('Clean Water');o.qte=0.5;o.effets=[];w.state.inv.objets=[o];assert.equal(w.ctx.invConsommer(o,0.5,''),true);w.ctx.effetsAvance(600);assert.equal(w.state.etat.ph,7.5,'Demi-dose sans autres effets à dose entière');
}
{
 const w=setup();w.state.etat.ph=10;w.consume('Torcrab Jerky');w.ctx.effetsAvance(7199);near(w.state.etat.ph,10-5*7199/7200);w.ctx.effetsAvance(1);near(w.state.etat.ph,5,'Niveau 4 conserve son débit de 20 / 8 heures');
 w.consume('Popped Maize');w.ctx.vomirContenu();w.ctx.effetsAvance(7200);near(w.state.etat.ph,5);
}
{
 const w=setup();w.consume('Clean Water');w.ctx.effetsAvance(300);const snapshot=JSON.stringify(w.state);w.ctx.vomirContenu();w.ctx.effetsAvance(600);assert.equal(w.state.etat.ph,7.5);Object.assign(w.state,JSON.parse(snapshot));w.ctx.effetsAvance(300);assert.equal(w.state.etat.ph,15,'Reprise au milieu de la cadence');
}
{
 const w=setup();w.add('Récupération (Nourriture) PV V');w.add('Récupération (Nourriture) PV I');assert.equal(w.state.effetsActifs.length,1);w.ctx.effetsAvance(600);assert.equal(w.state.etat.pv,10,'Les autres récupérations restent non cumulables');
}
{
 const w=setup();w.add('Soulagement Total');w.add('Soulagement (Satiété) IV');for(const key of ['ps','ph','pr','froid','chaud','charge','contenance','alcool','pi'])assert.equal(w.ctx.effetBonus('effondrement',key),-10,key);assert.equal(w.ctx.effetBonus('effondrement','total'),0);
 const cap=fs.readFileSync('src/fiche/socle/080-calculs-capacites.js','utf8');Object.assign(w.ctx,{effPhotoPartie:()=>null,effReglage:()=>({}),effBasePartie:()=>14,pub:(key,value)=>value});
 vm.runInContext(cap.slice(cap.indexOf('  function effApresEffets('),cap.indexOf('  function effondrementAuto(')),w.ctx);assert.equal(w.ctx.effPartie('ps'),4,'14 points moins les 10 neutralisés ; pas de double soulagement');
 w.ctx.effBasePartie=()=>0;w.state.effAutre=14;assert.equal(w.ctx.effPartie('autre'),4);w.state.effAutre=0;assert.equal(w.ctx.effPartie('autre'),0,'Aucun bonus artificiel en absence d’effondrement Autre');w.state.effAutre=-5;assert.equal(w.ctx.effPartie('autre'),-5,'Les ajustements négatifs restent inchangés');
}
{
 const w=setup();w.add('Résistance à la corruption II');w.add('Résistance à la corruption V');assert.equal(w.ctx.effetBonus('innocence'),50);
 for(const [oldId,name] of [['Résistance à la corruption I','Résistance à la corruption II'],['Résistance à la corruption II','Résistance à la corruption V'],['Récupération de corruption','Récupération (Potion) PI II']])assert.equal(w.ctx.effetDefinition(oldId).nom,name);
}
// Two views consuming identical portions must keep two independent recoveries.
{
 const w=setup();w.consume('Food Waste');w.ctx.effetsAvance(7200);assert.equal(w.state.etat.ps,5);assert.equal(w.state.etat.ph,5);assert.equal(w.state.effetsActifs.length,0,'20 / 8 h donne 5 progressivement en 2 h');
}
{
 const s=M.blank(),attrs=C.encode(s),a=new C.Session(attrs,s),b=new C.Session(attrs,s);let i=0;
 for(const peer of [a,b]){const next=C.copy(s),d=byName('Récupération (Eau) PH II');next.effetsActifs=[{id:'dose'+(++i),effet:d.id,categorie:'digestive',actif:true,reste:600,duree:600,suivi:0,facteur:1}];peer.capture(next);Object.assign(attrs,peer.outgoing());}
 // Publish pending operations as the bridge does, then read the shared state.
 for(const peer of [a,b])attrs['owd_ops_'+peer.id]={current:JSON.stringify({epoch:peer.epoch,ops:Object.values(peer.pending)})};
 assert.equal(C.read(attrs).state.effetsActifs.length,2);
}
console.log('OK nutrition : tous les apports, rangs, cumul, fractions, consommation, échéances, pertes, vomissement, sauvegarde, concurrence et compatibilité des anciens effets.');
