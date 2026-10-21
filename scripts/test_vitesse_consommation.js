/* Seuils de vitesse et arrondi final des coûts, indépendants de l'interface. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let reduction=0,alcool=0;
const ctx={effetBonus:()=>reduction,effSpecifiques:()=>({mana:alcool})};vm.createContext(ctx);
const fx=fs.readFileSync('src/fiche/fiche/effets.js','utf8');
vm.runInContext(fx.slice(fx.indexOf('  function effetConsommation('),fx.indexOf('\n',fx.indexOf('  function effetCout('))),ctx);
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
