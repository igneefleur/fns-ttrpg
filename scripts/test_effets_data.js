'use strict';
const assert=require('node:assert/strict'),registry=require('../docs/data/owd-boutique.json');
const data={...registry,objets:registry.equipements.filter(o=>o.typeObjet==='consommable')};
const defs=new Map(data.effets.map(e=>[e.id,e]));
assert.equal(defs.size,data.effets.length);
for(const o of data.objets){assert.ok(o.effets.length<=5,o.nom);for(const id of o.effets)assert.ok(defs.has(id),o.nom+': '+id);}
assert.equal(defs.get('Récupération Nourriture PV V').duree,7200);
assert.equal(defs.get('Récupération Nourriture PV V').ops.regen.cadence,600);
assert.equal(defs.get('Récupération Potion PV V').duree,60);
assert.equal(defs.get('Récupération Potion PV V').ops.regen.cadence,3);
assert.equal(defs.get('Récupération Eau ordinaire PE').duree,600);
const robe=data.equipements.find(o=>o.nom==='Arcane Robe');
assert.equal(robe.res_physique,10);assert.equal(robe.stats.couts.pm,-16);assert.equal(robe.stats.degats.froid,7);
const dagger=data.equipements.find(o=>o.nom==='Astral Dagger');
assert.equal(dagger.arme.repartition.physique,80);assert.equal(dagger.arme.repartition.eclair,20);
for(const o of data.equipements.filter(o=>o.arme))assert.ok(Math.abs(Object.values(o.arme.repartition).reduce((a,b)=>a+b,0)-100)<1e-8,o.nom);
const bag=data.equipements.find(o=>o.nom==='Nomad Backpack');assert.equal(bag.tailleInterieure,'Petite');assert.equal(bag.tailleAccroche,'Moyenne');assert.equal(bag.ep,5);
assert.ok(defs.get('Poison').manuel);assert.ok(!defs.get('Poison').ops.regen);
console.log('OK références, durées distinctes, pourcentages entiers des vêtements, ratios des armes, tailles des sacs et dégâts manuels.');

const types=new Set(['arme','vetement','accessoire','rangement','contenant','consommable','munition','autre']);
for(const o of data.equipements.concat(data.objets)){
 assert.ok(types.has(o.typeObjet),o.nom+': type non demandé');
 assert.equal(Object.hasOwn(o,'construction'),false,o.nom);
 assert.ok(o.mains===1||o.mains===2,o.nom+': mains');
}
console.log('OK types autorisés, absence de Construction et nombre de mains pour chaque objet du catalogue');
