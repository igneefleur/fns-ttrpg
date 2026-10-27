'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm');
const data=require('../docs/data/owd-boutique.json');
const items=data.equipements.filter(o=>o.acc==='sousvet');
assert.equal(items.length,69);
assert.equal(new Set(items.map(o=>o.id)).size,69);
assert.equal(new Set(items.map(o=>o.img)).size,69);
const retired=['Barrier','Petrified Wood','Copal','Green Copal','Manawall','Tsar','Horror','Chalcedony','Rust Lich','Gold-Lich'].map(n=>n+' Underwear');
for(const name of retired)assert.ok(!data.equipements.some(o=>o.nom===name),name+' retiré de la boutique');
for(const name of ['Virgin','Caged','Blue Sand','Orichalcum','Runic','Black Plate'])assert.ok(items.some(o=>o.nom===name+' Underwear'),name+' conservé');
const hashes=new Set;
for(const o of items){
 assert.equal(o.typeObjet,'accessoire',o.nom);assert.equal(o.sousCategorieBoutique,'Sous-vêtements',o.nom);
 assert.ok(Number.isFinite(o.poids)&&o.poids>0,o.nom);assert.ok(Number.isFinite(o.volume)&&o.volume>=0.1,o.nom);assert.ok(Number.isFinite(o.achat)&&Number.isFinite(o.vente),o.nom);assert.equal(o.taille,'Très petite',o.nom);
 assert.ok(o.froid>=1&&o.chaud>=0,o.nom);assert.ok(['physique','feu','froid','eclair','decomposition','ethere'].every(t=>o['res_'+t]>=0),o.nom);
 const file='docs/'+o.img;assert.ok(fs.existsSync(file),o.nom);hashes.add(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
}
assert.equal(hashes.size,69,'Chaque sous-vêtement a sa propre illustration');
const pockets={'Adventurer Underwear':2,'Brigand Underwear':1,'Elite Underwear':2,'Makeshift Leather Underwear':2,'Master Trader Underwear':4,'Pilgrim Underwear':5,'Scaled Leather Underwear':2,'Scavenger Underwear':2,'Trader Underwear':4};
for(const o of items)assert.equal(o.poches,pockets[o.nom]||0,o.nom+' poches');
const get=n=>structuredClone(items.find(o=>o.nom===n));
for(const [name,cold,hot,fire,frost] of [['Tattered Underwear',1,0,0,0],['Trader Underwear',1,0,0,0],['Adventurer Underwear',1,2,1,0],['Ammolite Underwear',2,0,0,1],['Desert Underwear',1,4,0,0]]){
 const o=get(name);assert.deepEqual([o.froid,o.chaud,o.res_feu,o.res_froid],[cold,hot,fire,frost],name);
}
const p=get('Adventurer Underwear');p.ref='underwear-test';p.ou='sousvet';
const state={inv:{objets:[p]},combatModifiers:{protections:{},resistances:{}},combatOptions:{defenses:{}}};
const ctx={state,INV_ACCESSOIRES:['sousvet'],INV_ACC_TYPES:{sousvet:['sousvet']},pnum:v=>Math.max(0,Number(v)||0),snum:v=>Number(v)||0,num:(v,d=0)=>Number.isFinite(Number(v))?Number(v):d,effetBonus:()=>0,effSpecifiques:()=>({}),effetAlerte:()=>0};
const cap=fs.readFileSync('src/fiche/socle/080-calculs-capacites.js','utf8');
const caseCode=cap.slice(cap.indexOf('  function casePermise('),cap.indexOf('  // LES EMPLACEMENTS'));
const worn=cap.slice(cap.indexOf('  function vetementsPortes()'),cap.indexOf('  function equipementsBonus()'));
const climate=fs.readFileSync('src/fiche/socle/100-calculs-climat.js','utf8');
const cold=climate.slice(climate.indexOf('  function protection('),climate.indexOf('  // ---- le temps qui passe'));
vm.createContext(ctx);vm.runInContext(caseCode+worn+cold+fs.readFileSync('src/fiche/fiche/defense.js','utf8'),ctx);
assert.equal(ctx.casePermise(p,'sousvet'),true);assert.equal(ctx.protection('froid'),1);assert.equal(ctx.protection('chaud'),2);assert.equal(ctx.defenseTotaux('feu',null,false).reduction,1);
p.ou='poches';assert.equal(ctx.protection('chaud'),0);assert.equal(ctx.defenseTotaux('feu',null,false).reduction,0);
p.ou='sousvet';p.qte=2;assert.equal(ctx.protection('chaud'),0,'Une pile ne donne aucun bonus porté');p.qte=1;
const M=require('../docs/javascripts/owd-attr-map.js'),s=M.blank();s.inv.objets=[p];const decoded=M.attrsToState(M.stateToAttrs(s)).inv.objets[0];
assert.equal(decoded.poids,0.5);assert.equal(decoded.volume,1);assert.equal(decoded.acc,'sousvet');assert.equal(decoded.res_feu,1);
const pocketCode=cap.slice(cap.indexOf('  function capPoches()'),cap.indexOf('  function capSac()'));
vm.runInContext(pocketCode,ctx);const trader=get('Trader Underwear');trader.ou='sousvet';state.inv.objets=[trader];assert.equal(ctx.capPoches(),4,'Sous-vêtement porté');
trader.ou='terre';assert.equal(ctx.capPoches(),0,'Sous-vêtement rangé');trader.ou='sousvet';trader.qte=2;assert.equal(ctx.capPoches(),0,'Pile non équipée');trader.qte=1;
state.inv.objets.push({vet:'haut',ou:'haut',qte:1,poches:5});assert.equal(ctx.capPoches(),9,'Poches cumulées avec le haut');
s.inv.objets=[trader];assert.equal(M.attrsToState(M.stateToAttrs(s)).inv.objets[0].poches,4,'Sauvegarde des poches');
console.log('OK 69 sous-vêtements distincts, retraits, images locales, valeurs, port, températures, résistance, pile et sauvegarde.');
