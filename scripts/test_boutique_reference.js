'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),js=fs.readFileSync(path.join(root,'docs/javascripts/owd-boutique.js'),'utf8');
const list=JSON.parse(fs.readFileSync(path.join(root,'site/owd-boutique.json'))).objets;
const helpers=js.slice(js.indexOf('  function num('),js.indexOf('  function imageCandidates('));
const methods=js.slice(js.indexOf('  function safe('),js.indexOf('  function ask('));
const command=vm.runInNewContext(helpers+methods+';command',{TextEncoder,btoa,URL,location:{href:'https://example.test/owd-beta/roll20-boutique.html'}});
function payload(it){const raw=command(it,'donner',3);return JSON.parse(Buffer.from(/\/owd_take ([\w-]+)/.exec(raw)[1],'base64url'));}
for(const it of list){
 const p=payload(it);
 for(const [top,key] of [['a','achat'],['v','vente'],['p','poids'],['l','volume']])assert.equal(p[top],it.objet[key],it.nom+': '+key);
 assert.equal(p.item.nom,it.nom);assert.equal(p.item.qte,3);assert.deepEqual(p.item.effets,it.objet.effets);
 assert.equal(p.item.catalogueId,it.objet.id);assert.ok(p.s.every(f=>f.every(v=>typeof v==='string')));
 assert.ok(p.i.startsWith('https://example.test/owd-beta/assets/'));
}
const poisoned=structuredClone(list.find(x=>x.nom==='Arcane Robe'));
for(const f of poisoned.champs)if(['Achat (argent)','Vente (argent)','Poids (kg)','Volume (L)'].includes(f[0]))f[1]='999999';
const p=payload(poisoned);assert.equal(p.a,174);assert.equal(p.p,2.5);assert.equal(p.l,7.5);
console.log('OK '+list.length+' objets : données, cartes et réception concordent ; champs d’affichage sans autorité mécanique.');
// Les propriétés doivent survivre à la normalisation et à une sauvegarde, pas seulement au lien Prendre.
const registry=require('../docs/data/owd-boutique.json');
const inv=fs.readFileSync(path.join(root,'src/fiche/equipement/inv-nouveaux.js'),'utf8');
const ctx={D:()=>({equipements:registry.equipements.filter(o=>o.typeObjet!=='consommable'),consommables:registry.equipements.filter(o=>o.typeObjet==='consommable'),catalogueVersion:registry.version}),pnum:v=>Math.max(0,Number(v)||0),snum:v=>Number(v)||0,num:(v,d=0)=>v==null?d:Number(v),combatTypes:()=>['physique','feu','froid','eclair','decomposition','ethere','brut'],armesData:()=>registry.typesArmes,pli:s=>String(s).toLowerCase()};
vm.createContext(ctx);vm.runInContext(inv.slice(0,inv.indexOf('  function invChoix('))+';this.normalize=enrichitObjet;',ctx);
for(const o of registry.equipements){
 const base={nom:o.nom,id:o.id,arme:o.arme?structuredClone(o.arme):null,sac:o.sac||false,ceint:o.ceint||false,vet:o.vet||''};
 const n=JSON.parse(JSON.stringify(ctx.normalize(base,o)));
 assert.equal(n.taille,o.taille,o.nom);assert.equal(n.mains,o.mains,o.nom);assert.equal(n.catalogueId,o.id,o.nom);
 assert.deepEqual(n.stats,o.stats||{},o.nom+' stats');assert.deepEqual(n.proprietes,o.proprietes||{},o.nom+' propriétés');assert.deepEqual(n.reglesManuelles,o.reglesManuelles||[],o.nom+' règles');
}
const legacy=ctx.normalize({nom:'Gourde en cuir'}, {nom:'Gourde en cuir',typeObjet:'contenant',mains:1});assert.equal(legacy.nom,'Waterskin');assert.equal(legacy.catalogueId,'tableur:outils-de-survie-waterskin');
console.log('OK normalisation persistante des '+registry.equipements.length+' objets et alias de migration.');

const water=registry.equipements.find(o=>o.nom==='Clean Water');
const migrated=ctx.normalize({nom:water.nom,achat:.1,vente:.03},{...water,achat:.1,vente:.03});
assert.equal(migrated.achat,null);assert.equal(migrated.vente,null);
for(const nom of ['Clean Water','River Water','Rancid Water','Salt Water']){
 const it=list.find(x=>x.nom===nom),p=payload(it);assert.equal(p.a,null);assert.equal(p.v,null);
 assert.ok(p.s.some(f=>f[0]==='Achat'&&f[1]==='Prix non renseigné'));
}
console.log('OK prix absents conservés, anciens tarifs inventés retirés à la normalisation.');
