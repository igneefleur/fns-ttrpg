'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),data=require('../docs/data/owd-boutique.json');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const cap=read('src/fiche/socle/080-calculs-capacites.js');
const helper=cap.slice(cap.indexOf('  function equipementsPortes()'),cap.indexOf('  function capPoches()'));
const fx=read('src/fiche/fiche/effets.js');const code=fx.slice(0,fx.indexOf('  function selectEffet('));
const get=n=>structuredClone(data.equipements.find(o=>o.nom===n));
const bag=get('Boozu Hide Backpack');bag.ou='dos';
const sword=get('Astral Dagger');sword.ou='mainD';
const state={inv:{objets:[bag,sword]},effetsActifs:[]};
const ctx={uid:()=>"effect-test",clamp:(n,a,b)=>Math.min(b,Math.max(a,n)),state,D:()=>({effets:data.effets}),num:(v,d=0)=>Number(v)||d,pnum:v=>Math.max(0,Number(v)||0),vetementsPortes:()=>[],casePermise:(o,where)=>where==='dos'?!!o.sac:['mainG','mainD'].includes(where),casesDe:o=>[o.ou]};
const invSource=read('src/fiche/equipement/inv-nouveaux.js');
const typeHelper=invSource.slice(invSource.indexOf('  function invType('),invSource.indexOf('  function invFormeConsommable('));
vm.createContext(ctx);vm.runInContext(typeHelper+helper+code+';this.bonus=effetBonus;this.sources=effetsSources;',ctx);
assert.equal(ctx.bonus('innocence'),10);assert.equal(ctx.bonus('degats','feu'),7);
bag.ou='poches';assert.equal(ctx.bonus('innocence'),0);
bag.ou='dos';bag.dans='other-bag';assert.equal(ctx.bonus('innocence'),0);bag.dans='';
const lamp=get("Djinn's Lamp");lamp.ou='mainD';state.inv.objets=[lamp];assert.equal(ctx.bonus('alterations'),15);lamp.ou='mainG';assert.equal(ctx.bonus('alterations'),15);lamp.ou='poches';assert.equal(ctx.bonus('alterations'),0);
const inv=read('src/fiche/equipement/inv-nouveaux.js');const sizes=inv.slice(inv.indexOf('  var INV_TAILLES'),inv.indexOf('  var INV_TYPES_OBJETS'));const accepts=inv.slice(inv.indexOf('  function invTailleAccepte('),inv.indexOf('  function invCoutAcc('));vm.runInContext(sizes+accepts+';this.accepts=invTailleAccepte;',ctx);
assert.equal(ctx.accepts('829','Petite'),false);assert.equal(ctx.accepts('Moyenne','Très petite'),false);assert.equal(ctx.accepts('Minuscule','Très petite'),true);
console.log('OK passifs Boutique : sacs équipés, arme tenue, lampe dans chaque main, exclusion du stockage et tailles invalides.');

// Tout consommable tenu reste inerte, même s’il porte des stats personnalisées.
for(const o of data.equipements.filter(o=>o.typeObjet==='consommable')){
 for(const hand of ['mainG','mainD']){
  const item={...structuredClone(o),ref:'held',ou:hand,stats:{degats:{feu:999}}};
  state.inv.objets=[item];state.effetsActifs=[];
  assert.equal(ctx.sources().length,0,o.nom+' '+hand);
  assert.equal(ctx.bonus('degats','feu'),0,o.nom+' stats');
 }
}
const potion=get('Blessed Potion');potion.ref='potion';potion.ou='mainD';state.inv.objets=[potion];
assert.equal(ctx.bonus('degats','eclair'),0);
assert.ok(ctx.appliqueEffet(potion.effets[0],potion.nom,''));
assert.equal(ctx.bonus('degats','eclair'),20,'La consommation continue à activer le bonus.');
state.inv.objets=[];assert.equal(ctx.bonus('degats','eclair'),20,'Effet consommé indépendant de l’objet tenu.');
console.log('OK tous les consommables : aucune activation passive en main ; effets consommés toujours actifs.');
