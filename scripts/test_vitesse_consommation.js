/* Seuils de vitesse et arrondi final des coûts, indépendants de l'interface. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let reduction=0,alcool=0;
const state={modData:{}};
const maxima={pv:100,pe:80,pm:20};
const ctx={state,num:(v,d=0)=>v==null||!Number.isFinite(Number(v))?d:Number(v),capMax:(k,auto)=>auto(),capAuto:k=>maxima[k],
 clamp:(v,min,max)=>Math.max(min,Math.min(max,v)),effDef:()=>({pvParNiveau:5,peParNiveau:10}),effondrement:()=>0,pub:(_,v)=>v,
 effetBonus:()=>reduction,effSpecifiques:()=>({mana:alcool})};vm.createContext(ctx);
const cap=fs.readFileSync('src/fiche/socle/080-calculs-capacites.js','utf8');
vm.runInContext(cap.slice(cap.indexOf('  function tauxMaximumEffondrement('),cap.indexOf('  function piMaxAuto(')),ctx);
const fx=fs.readFileSync('src/fiche/fiche/effets.js','utf8');
vm.runInContext(fx.slice(fx.indexOf('  function reserveAvecTaux('),fx.indexOf('  function retireEffet(')),ctx);
vm.runInContext(fs.readFileSync('src/fiche/fiche/mouvement.js','utf8'),ctx);
for(const [v,bonus] of [[-29,-2],[-20,-2],[-19,-1],[-10,-1],[-9,0],[0,0],[9,0],[10,1],[19,1],[20,2],[29,2]])assert.equal(ctx.mouvementPas(6,0,v,0),6+bonus);
assert.equal(ctx.mouvementPas(6,0,6+6,-2),5,'Cumul avant tranche et effondrement après vitesse');
assert.equal(ctx.mouvementPas(1,0,10,-2),0);assert.equal(ctx.mouvementPas(0,5,30,0),0);
for(const k of ['pv','pe','pm']){assert.equal(ctx.effetConsommation(k),100);assert.equal(ctx.effetCout(k,13.4),13);}
reduction=-20;assert.equal(ctx.effetCout('pm',16.75),13);assert.equal(ctx.effetCout('pe',13.4),10);
alcool=-10;assert.equal(ctx.effetConsommation('pm'),70);assert.equal(ctx.effetConsommation('pe'),80);assert.equal(ctx.effetCout('pm',19.2),13);
reduction=25;alcool=0;assert.equal(ctx.effetCout('pv',13.4),16);
reduction=-150;assert.equal(ctx.effetConsommation('pm'),0);assert.equal(ctx.effetCout('pm',99),0);
console.log('OK Vitesse : seuils signés, cumul, sommeil, effondrement ; coûts PV/PE/PM décimaux, bonus, malus, alcool et borne zéro.');

reduction=-20;
state.modData.reservesVitales={pe:-10,pm:5,sacrifice:5};
assert.equal(ctx.effetConsommation('pe'),70);
assert.equal(ctx.effetConsommation('pm'),85);
assert.equal(ctx.effetCout('pe',10),7);
assert.deepEqual([ctx.pvMax(),ctx.peMax(),ctx.pmMax()],[95,75,30]);
state.modData.reservesVitales.sacrifice=3;
assert.deepEqual([ctx.pvMax(),ctx.peMax(),ctx.pmMax()],[97,77,26]);
state.modData.reservesVitales.sacrifice=200;
assert.deepEqual([ctx.pvMax(),ctx.peMax(),ctx.pmMax()],[20,0,180]);
ctx.effondrement=()=>2;
state.modData.reservesVitales.sacrifice=5;
assert.deepEqual([ctx.pvMax(),ctx.peMax(),ctx.pmMax()],[85,60,30]);
delete state.modData.reservesVitales;
assert.deepEqual([ctx.pvMax(),ctx.peMax(),ctx.pmMax()],[90,64,20]);
console.log('OK ajustements additifs et sacrifice tellurique réversible, borné et appliqué avant effondrement.');

state.modData.reservesVitales={pv:-20,gain_pv:20,gain_pm:-120};
reduction=0;
assert.equal(ctx.effetVariationImmediate('pv',10),12);
assert.equal(ctx.effetVariationImmediate('pv',-10),-8);
assert.equal(ctx.effetVariationImmediate('pe',2.5),2.5);
assert.equal(ctx.effetVariationImmediate('pm',10),0);
assert.equal(ctx.effetVariationImmediate('ps',-2.5),-2.5);
ctx.pub=(nom,v,info)=>info.reserve==='expo'&&info.sens==='gain'?10:v;
ctx.effetBonus=(type,res,cible,detail)=>{
 if(type==='gains'&&res==='expo'){detail.eqp=5;return 8;}
 if(type==='innocence'){detail.eqp=20;return 25;}
 return 0;
};
state.modData.reservesVitales.gain_expo=7;
assert.deepEqual({...ctx.tauxReserve('expo','gain')},{art:10,eqp:5,eft:3,atr:7,total:125});
assert.equal(ctx.effetVariationImmediate('expo',8),10);
assert.equal(ctx.effetVariationImmediate('pi',-10),-8);
state.modData.reservesVitales.ps=50;
assert.equal(ctx.effetVariationImmediate('ps',-10),-15);
console.log('OK taux de gain et de perte immédiats distincts, neutres par défaut.');

state.modData.reservesVitales.eff_pv=15;
state.modData.reservesVitales.eff_pe=-5;
assert.deepEqual({...ctx.tauxMaximumEffondrement('pv')},{base:100,eft:-10,total:105});
assert.equal(ctx.pvMax(),105);
assert.equal(ctx.peMax(),60);
state.effDesactive=true;
assert.equal(ctx.pvMax(),100);
assert.equal(ctx.peMax(),80);
