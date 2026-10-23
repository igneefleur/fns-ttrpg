/* Prise en main et réglages des quatre coins, sans nouvel attribut. */
'use strict';
const assert=require('node:assert/strict'),D=require('../docs/javascripts/owd-inventaire-data.js'),M=require('../docs/javascripts/owd-attr-map.js'),C=require('../docs/javascripts/owd-sync.js').Compact;
for(const mains of [undefined,1,2,'2','1']){assert.equal(D.takeCost({mains}),1);assert.equal(D.takeCost({mains,rapide:true}),0);}
assert.equal(D.takeCost({mains:'2 obligatoires'}),2);assert.equal(D.takeCost({mains:'2 obligatoires',rapide:true}),1);assert.equal(D.takeCost({arme:{mains:'2 obligatoires'}}),2);assert.equal(D.takeCost({mains:1,arme:{mains:'2 obligatoires'}}),1);
const state=M.blank();assert.deepEqual(state.inv.opts.coins,{hautGauche:'volumeTotal',hautDroite:'poidsTotal',basGauche:'da',basDroite:'qte'});
state.inv.opts.coins={hautGauche:'nom',hautDroite:'aucun',basGauche:'qte',basDroite:'poidsTotal'};const attrs=C.encode(state);assert.deepEqual(C.read(attrs).state.inv.opts.coins,state.inv.opts.coins);assert.equal(Object.keys(attrs).filter(k=>/coin|display/.test(k)).length,0);
const items=[{ref:'flask',qte:2,poids:.2,encombre:.3,contenant:'liquide'},{ref:'water',qte:1,poids:.4,dans:'flask'}];assert.equal(Math.round(D.weight(items,items[0])*100),120);assert.equal(items[0].encombre*items[0].qte,.6);
console.log('OK affichage : quatre défauts, personnalisation et persistance dans le stockage existant ; DA de port distincts des mains d’utilisation, accès rapide, poids des piles et contenus.');
