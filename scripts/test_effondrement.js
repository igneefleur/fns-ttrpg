'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const M=require('../docs/javascripts/owd-attr-map.js'),C=require('../docs/javascripts/owd-sync.js').Compact;
const data=JSON.parse(cp.execFileSync('python3',['-c',`import json
from pathlib import Path
from hooks.owd_creation import _temps,_effondrement
s=Path('docs/content/regles/base/capacites-physiques.md').read_text()
print(json.dumps(dict(temps=_temps(s),effondrement=_effondrement(s,[{'cle':'pr','libelle':'points de repos'}]))))`],{encoding:'utf8'}));
let count=0;function test(n,f){f();console.log('OK '+n);count++;}
function setup(causes={}){
 const state=M.blank(),maxima={pv:100,pe:100,pm:100,pr:800,ps:1200,ph:400,pi:100};state.effort='repos';state.etat={pv:50,pe:50,pm:50,pr:800,ps:1200,ph:400,pi:100,expo:0,contenance:0};
 const ctx={aClef:(o,k)=>Object.hasOwn(o,k),state,D:()=>data,effDef:()=>data.effondrement,num:(x,d)=>Number.isFinite(Number(x))?Number(x):d,snum:x=>Number(x)||0,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),pub:(k,n)=>n,uid:()=>String(Math.random()),maxDe:k=>maxima[k],courant:k=>state.etat[k],window:{},hooks:[],effetBonus:()=>0};vm.createContext(ctx);
 for(const f of ['socle/080-calculs-capacites.js','socle/100-calculs-climat.js'])vm.runInContext(fs.readFileSync('src/fiche/'+f,'utf8'),ctx);
 ctx.effPartie=k=>causes[k]||0;ctx.effetBonus=()=>0;ctx.equipementsPortes=()=>[];ctx.maxDe=k=>maxima[k];ctx.courant=k=>state.etat[k];ctx.confort=()=>({bas:28,haut:32});ctx.expoMax=()=>100;ctx.effetsAvance=()=>{};ctx.suitEffondrement=()=>{};ctx.effVu=null;
 return {ctx,state,niveau:(res,act='repos')=>ctx.recupEtat(data.temps.recuperations.find(r=>r.id===res+':'+act)).niveau};
}
test('Repos : PE peut devenir négatif ; PM +1, quatre activités éveillées seulement',()=>{const w=setup({pr:10});for(const a of ['repos','leger','intermediaire','lourd']){w.state.effort=a;assert.equal(w.niveau('pe',a),{repos:10,leger:9,intermediaire:8,lourd:7}[a]-10);assert.equal(w.niveau('pm',a),10);}w.state.effort='sommeil';assert.equal(w.niveau('pe','sommeil'),11);assert.equal(w.niveau('pm','sommeil'),-5);});
test('Chaud/Froid : seuils pairs, PS/PH naturels et sommeil inclus',()=>{const causes={};const w=setup(causes);for(let n=0;n<=10;n++){causes.froid=n;causes.chaud=n;assert.equal(w.niveau('ps'),-4-Math.floor(n/2));assert.equal(w.niveau('ph'),-4-Math.floor(n/2));w.state.effort='sommeil';assert.equal(w.niveau('ps','sommeil'),-3-Math.floor(n/2));w.state.effort='repos';}});
test('Faim et soif diminuent les protections, peuvent descendre sous zéro',()=>{const w=setup({ps:3,ph:2});assert.equal(w.ctx.protection('froid'),-6);assert.equal(w.ctx.protection('chaud'),-4);});
test('Charge et Contenance se cumulent ; aucun coût PE spécifique',()=>{const w=setup({charge:2,contenance:3});assert.equal(w.ctx.effSpecifiques().pas,-5);assert.ok(w.ctx.effSpecifiques().pe===0);});
test('Désactivation annule les effets spécifiques ; dormir conserve ceux qui ne dépendent pas de Repos',()=>{const w=setup({pr:4,ps:3,ph:2,froid:4,chaud:6,alcool:2});w.state.effort='sommeil';assert.ok(w.ctx.effSpecifiques().pe===0);assert.equal(w.ctx.effSpecifiques().ph,-3);w.state.effDesactive=true;for(const v of Object.values(w.ctx.effSpecifiques()))assert.ok(v===0);});
test('Effets : coût mana borné, difficulté informative et récupérations digestives/spéciales indépendantes',()=>{const w=setup({alcool:2,pr:10,chaud:10});vm.runInContext(fs.readFileSync('src/fiche/fiche/effets.js','utf8'),w.ctx);w.ctx.effetBonus=()=>0;assert.equal(w.ctx.effetCout('pm',20),18);assert.equal(w.ctx.effetCout('pe',20),20);assert.equal(w.ctx.effSpecifiques().difficulte,2);for(const categorie of ['digestive','speciale'])assert.equal(w.ctx.recupEtat({id:'custom',categorie,reserve:'ph',niveau:5,condition:'toujours'}).niveau,5);});
test('PE naturels négatifs : perte passive à la cadence complète',()=>{const w=setup({pr:8});w.state.effort='lourd';w.ctx.recupAppliquePas(28800,1);assert.equal(w.state.etat.pe,45);});
test('Horloge : boire conserve 1 h 30, puis un seul point disparaît à 2 h',()=>{const w=setup();w.state.effAlcool=3;w.ctx.avanceAlcoolSecondes(5400);w.state.effAlcool++;w.ctx.avanceAlcoolSecondes(1800);assert.equal(w.state.effAlcool,3);assert.equal(w.ctx.secondesHorlogeProcessus('horlogeAlcool'),7200);w.ctx.avanceAlcoolSecondes(21600);assert.equal(w.state.effAlcool,0);assert.equal(w.ctx.secondesHorlogeProcessus('horlogeAlcool'),0);w.ctx.avanceAlcoolSecondes(86400);w.state.effAlcool=1;w.ctx.avanceAlcoolSecondes(7199);assert.equal(w.state.effAlcool,1);w.ctx.avanceAlcoolSecondes(1);assert.equal(w.state.effAlcool,0);});
test('Horloge : sauvegarde compacte/rechargement sans attribut dédié de plus',()=>{const w=setup();w.state.effAlcool=2;w.ctx.avanceAlcoolSecondes(5401);const attrs=C.encode(w.state),restored=C.read(attrs).state;assert.equal(restored.horlogeAlcool.heures,1);assert.equal(restored.horlogeAlcool.minutes,30);assert.equal(restored.horlogeAlcool.secondes,1);assert.ok(attrs.owd_block_effondrement);assert.equal(Object.keys(attrs).some(k=>k==='owd_block_horlogeAlcool'),false);});
test('Avance et annulation : alcool, horloge et réserves restaurés exactement',()=>{const w=setup();w.state.effAlcool=3;w.ctx.avanceAlcoolSecondes(5400);const before=JSON.stringify(w.ctx.photoTemps());w.ctx.avancerSecondes(7200);assert.equal(w.state.effAlcool,2);w.ctx.reculerSecondes(7200);assert.equal(JSON.stringify(w.ctx.photoTemps()),before);});
test('Deux consommations simultanées fusionnent sans perdre un point',()=>{const s=M.blank(),attrs=C.encode(s),a=new C.Session(attrs,s),b=new C.Session(attrs,s);for(const peer of [a,b]){const next=C.copy(s);next.effAlcool=1;peer.capture(next);attrs['owd_ops_'+peer.id]={current:JSON.stringify({epoch:peer.epoch,ops:Object.values(peer.pending)})};}assert.equal(C.read(attrs).state.effAlcool,2);});
test('PV/PE : ajouts et multiplicateurs avant effondrement, base de réglage inchangée',()=>{
 const w=setup();w.ctx.capAuto=()=>100;w.ctx.effondrement=()=>2;
 w.state.capsLeviers={max:{a1:{pv:20,pe:-20},m1:{pv:2},a3:{pv:10},m3:{pv:0.5}}};
 assert.equal(w.ctx.pvMaxAuto(),100);assert.equal(w.ctx.peMaxAuto(),100);
 assert.equal(w.ctx.capMax('pv',w.ctx.pvMaxAuto),125);assert.equal(w.ctx.pvMax(),112);assert.equal(w.ctx.peMax(),64);
});
test('PV/PE forcés : pénalité appliquée après Forcé, annulée si effondrement désactivé',()=>{
 const w=setup();w.ctx.capAuto=()=>100;w.ctx.effondrement=()=>w.state.effDesactive?0:2;
 w.state.capsLeviers={max:{force:{pv:200,pe:200,pm:200}}};assert.equal(w.ctx.pvMax(),180);assert.equal(w.ctx.peMax(),160);assert.equal(w.ctx.pmMax(),200);
 w.state.effDesactive=true;assert.equal(w.ctx.pvMax(),200);assert.equal(w.ctx.peMax(),200);
 w.ctx.effondrement=()=>10;assert.equal(w.ctx.pvMax(),100);assert.equal(w.ctx.peMax(),0);
});
console.log(count+' scénarios d’effondrement validés.');
