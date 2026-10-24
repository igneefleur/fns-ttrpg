'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const M=require('../docs/javascripts/owd-attr-map.js'),C=require('../docs/javascripts/owd-sync.js'),Migr=require('../docs/javascripts/owd-migrations.js');
const D=require('../docs/javascripts/owd-inventaire-data.js');
const ctx={window:{OwdInventoryData:D},snum:x=>Number(x)||0,pnum:x=>Math.max(0,Number(x)||0),caracTotal:()=>20,effetBonus:()=>0,effetAlerte:()=>0,state:{inv:{objets:[]}},vetementsPortes:()=>ctx.state.inv.objets.filter(o=>o.ou==='haut')};
ctx.equipementsPortes=ctx.vetementsPortes;
vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/fiche/fiche/defense.js','utf8'),ctx);
assert.equal(ctx.combatDegats(30,6,9),21);
assert.equal(ctx.combatDegats(5,10,0),0);
assert.equal(ctx.combatDegats(5,10,150),0);
assert.equal(ctx.combatDegats(30,0,100),0);
assert.equal(ctx.combatDegats(30,0,-50),45);
ctx.state.inv.objets=[{ref:'top',qte:1,ou:'haut',prot_feu:4,res_feu:5},{ref:'ignored',qte:1,ou:'poches',prot_feu:999,res_feu:999},
 {ref:'shield',qte:1,ou:'mainG',prot_feu:2,res_feu:4,arme:{parade:8,reduction:6,modsParade:['Force','','']}}];
let d=ctx.defenseValeurs({arme:'shield'});assert.equal(d.protection,10);assert.equal(d.difficulte,8);
// La défense et l’attaque acceptent une arme depuis tout l’inventaire.
for (const emplacement of ['terre', 'sac', 'poches', 'mainD', 'mainG']) {
 ctx.state.inv.objets[2].ou=emplacement;
 const valeur=ctx.defenseValeurs({arme:'shield'});
 assert.equal(valeur.item,ctx.state.inv.objets[2],emplacement);
 assert.equal(valeur.protection,10,emplacement);
 assert.equal(valeur.difficulte,8,emplacement);
}
const epeeHorsInventaire=ctx.state.inv.objets.pop();
assert.equal(ctx.defenseValeurs({arme:'shield'}).item,null);
ctx.state.inv.objets.push(epeeHorsInventaire);
ctx.state.inv.objets[2].ou='mainG';
let t=ctx.defenseTotaux('feu',d,true);assert.equal(t.protection,16);assert.equal(t.reduction,9);
t=ctx.defenseTotaux('feu',d,false);assert.equal(t.protection,4);assert.equal(t.reduction,5);
ctx.state.inv.objets[2].ou='haut';t=ctx.defenseTotaux('feu',d,true);assert.equal(t.protection,16);assert.equal(t.reduction,9);
const s=M.blank();s.v=13;s.attaques=[{id:'a',personnalisee:{degats:'20',trajet:'1:passe>6:frappe'}},{id:'b',arme:'shield'}];s.defenses.entrees=[{id:'d',personnalisee:{parade:'8',reduction:'6'}}];
assert.deepEqual(C.rebuild(C.flatten(s)),s);
const encoded=M.stateToAttrs(s);assert.ok(encoded.owd_defenses);const decoded=M.attrsToState(encoded);assert.deepEqual(decoded.defenses,s.defenses);
const down=Migr.appliquer(s,13,12);assert.ok(down.ok);assert.equal(down.state.attaques.length,1);
const up=Migr.appliquer(down.state,12,13);assert.ok(up.ok);assert.deepEqual(up.state.defenses,s.defenses);
assert.deepEqual(up.state.attaques,s.attaques);
console.log('OK dégâts, bornes, protections portées, parade et MOD, échec, objet hybride, stockage et migrations');
const legacy=M.blank();legacy.v=13;delete legacy.combatOptions;
legacy.attaques=[{id:'legacy',arme:'shield',utiliseEndurance:true,utiliseMunition:true}];legacy.defenses.esquive.utiliseEndurance=true;
const migrated=Migr.appliquer(legacy,13,14);assert.ok(migrated.ok);
assert.deepEqual(migrated.state.combatOptions,{attaques:{utiliseEndurance:true,utiliseMunition:true},defenses:{utiliseEndurance:true}});
const rollback=Migr.appliquer(migrated.state,14,13);assert.ok(rollback.ok);
const again=Migr.appliquer(rollback.state,13,14);assert.ok(again.ok);assert.deepEqual(again.state.combatOptions,migrated.state.combatOptions);
const identity=M.blank();identity.v=14;identity.taille='grande';identity.combatOptions.attaques.utiliseEndurance=true;
const roundtrip=M.attrsToState(M.stateToAttrs(identity));assert.equal(roundtrip.taille,'grande');assert.deepEqual(roundtrip.combatOptions,identity.combatOptions);
console.log('OK migration des anciennes options par entrée et conservation de la taille');
ctx.state.inv.objets[2].ou='mainG';ctx.state.combatOptions={defenses:{lente:true}};
d=ctx.defenseValeurs({arme:'shield'});t=ctx.defenseTotaux('feu',d,true);assert.equal(t.protection,10);assert.equal(t.reduction,9);
d.protection=5;t=ctx.defenseTotaux('feu',d,true);assert.equal(t.protection,7); // floor((5 + 2)/2) + 4
const slow=M.blank();slow.v=15;slow.combatOptions.attaques.lente=true;slow.combatOptions.defenses.lente=true;slow.combatOptions.defenses.toutAfficher=true;
const oldSlow=Migr.appliquer(slow,15,14);assert.ok(oldSlow.ok);assert.equal(oldSlow.state.combatOptions.attaques.lente,undefined);
const newSlow=Migr.appliquer(oldSlow.state,14,15);assert.ok(newSlow.ok);assert.deepEqual(newSlow.state.combatOptions,slow.combatOptions);
console.log('OK défense lente : cumul actif puis plancher, protections passives conservées, résistances intactes et migration réversible');

const s16=M.blank();s16.v=16;s16.combatModifiers={attaques:{feu:5},protections:{feu:4},resistances:{feu:10}};
const dn16=Migr.appliquer(s16,16,15);assert.ok(dn16.ok);assert.equal(dn16.state.combatModifiers,undefined);
const up16=Migr.appliquer(dn16.state,15,16);assert.ok(up16.ok);assert.deepEqual(up16.state.combatModifiers,s16.combatModifiers);
assert.deepEqual(M.attrsToState(M.stateToAttrs(s16)).combatModifiers,s16.combatModifiers);
ctx.state.combatModifiers={protections:{feu:4},resistances:{feu:10}};ctx.state.combatOptions={defenses:{lente:false}};
t=ctx.defenseTotaux('feu',null,false);assert.equal(t.protection,8);assert.equal(t.reduction,15);
console.log('OK modificateurs de défense, attributs et migration réversible 16');

// Le test isolé injecte les dépendances du moteur d’effets, puis vérifie
// leur contribution sans modifier les protections de base du personnage.
ctx.effetBonus=(cle,type)=>cle==='parade'?-2:cle==='protections'&&type==='feu'?10:cle==='resistances'&&type==='feu'?15:0;
ctx.effetAlerte=()=>2;
d=ctx.defenseValeurs({arme:'shield'});assert.equal(d.difficulte,6);
t=ctx.defenseTotaux('feu',d,true);assert.equal(t.protection,30);assert.equal(t.reduction,24);
ctx.effetBonus=(cle,type)=>cle==='immunites'&&type==='feu'?100:0;
t=ctx.defenseTotaux('feu',null,false);assert.equal(t.reduction,100);
ctx.effetBonus=()=>-100;assert.equal(ctx.defenseValeurs({arme:'shield'}).difficulte,1);
console.log('OK effets de parade/protection/résistance, pénalité Alerte, immunité et difficulté minimale');

// Exécuter le vrai formulaire et sa validation avec un DOM minimal.
ctx.el=(tag,cls,text)=>({tag,value:tag==='select'?'physique':'',textContent:text,children:[],appendChild(n){this.children.push(n);return n;},setAttribute(){},focus(){this.focused=true;}});
ctx.fld=(label,input)=>({label,input});ctx.fmtP=String;ctx.capFirst=s=>s;ctx.compDe=()=>null;ctx.flash=message=>{ctx.error=message;};ctx.effetCout=(k,v)=>v;
ctx.dialogue=(title,body,validate)=>{ctx.form=body;ctx.validate=validate;};ctx.sayChat=(title,fields)=>{ctx.chat=fields;};ctx.refresh=()=>{ctx.persisted=JSON.parse(JSON.stringify(ctx.state));};
ctx.courant=k=>ctx.state.etat[k]==null?100:ctx.state.etat[k];ctx.effetBonus=()=>0;ctx.effetAlerte=()=>0;
function prompt({auto=true,pv=100,damage='30',mode='sans',slow=false,protection=6,resistance=9,endurance=false}={}){
 ctx.state={inv:{objets:[{ref:'armor',qte:1,ou:'haut',prot_physique:protection,res_physique:resistance}]},etat:{pv,pe:100},combatOptions:{defenses:{degatsAuto:auto,lente:slow,utiliseEndurance:endurance}}};ctx.error='';ctx.chat=null;ctx.persisted=null;
 ctx.defensePrompt('Défense',mode,{personnalisee:{parade:8,reduction:10,modsParade:[]}});ctx.form.children[0].input.value=damage;return ctx.validate();
}
prompt();assert.equal(ctx.state.etat.pv,79);assert.equal(ctx.persisted.etat.pv,79);assert.equal(ctx.chat.find(x=>x[0]==='Dégâts subis')[1],'21');
prompt({auto:false});assert.equal(ctx.state.etat.pv,100);assert.equal(ctx.chat.find(x=>x[0]==='Dégâts subis')[1],'21');
prompt({pv:null});assert.equal(ctx.state.etat.pv,79);
prompt({pv:10});assert.equal(ctx.state.etat.pv,-11);
prompt({pv:10.25});assert.equal(ctx.state.etat.pv,-10.75);
prompt({damage:'0',pv:null});assert.equal(ctx.state.etat.pv,null);
prompt({damage:'5',pv:null});assert.equal(ctx.state.etat.pv,null);
prompt({mode:'esquive',endurance:true});assert.equal(ctx.state.etat.pv,100);assert.equal(ctx.state.etat.pe,92);
prompt({mode:'parade',slow:true,endurance:true});assert.equal(ctx.state.etat.pv,83);assert.equal(ctx.state.etat.pe,100); // floor((30-6-5)*.91)=17
prompt({mode:'parade',endurance:true});assert.equal(ctx.state.etat.pv,88);assert.equal(ctx.state.etat.pe,92); // floor((30-6-10)*.91)=12
for(const damage of ['-1','abc','Infinity']){assert.equal(prompt({damage}),false);assert.equal(ctx.state.etat.pv,100);assert.equal(ctx.chat,null);assert.equal(ctx.persisted,null);}
ctx.state.combatOptions.defenses.degatsAuto=true;const synced=M.attrsToState(M.stateToAttrs({...M.blank(),...ctx.state}));assert.equal(synced.combatOptions.defenses.degatsAuto,true);
const defaults=M.blank();assert.equal(defaults.combatOptions.defenses.degatsAuto,false);assert.equal(defaults.combatOptions.defenses.toutAfficher,undefined);
const normalizer=fs.readFileSync('src/fiche/socle/060-etat-normalise.js','utf8'),start=normalizer.indexOf('    var options = s.combatOptions'),end=normalizer.indexOf('    var combatAffichage',start);
const normalizeOptions=s=>vm.runInNewContext(normalizer.slice(start,end)+';s.combatOptions',{s});
assert.equal(normalizeOptions({combatOptions:{defenses:{toutAfficher:true}}}).defenses.degatsAuto,false);
assert.equal(normalizeOptions({combatOptions:{defenses:{degatsAuto:true}}}).defenses.degatsAuto,true);
prompt({damage:''});assert.equal(ctx.state.etat.pv,100);
// Plusieurs types sont résolus indépendamment, avec un seul coût de défense.
prompt({auto:true,endurance:true,mode:'parade',damage:'0'});
ctx.form.children[0].input.value='30';ctx.form.children[1].input.value='20';
const beforePe=ctx.state.etat.pe;ctx.validate();assert.equal(ctx.state.etat.pv,78);assert.equal(ctx.state.etat.pe,beforePe-8);
assert.deepEqual(Array.from(ctx.form.children,x=>x.label),['physique','feu','froid','Éclair','Décomposition','Éthéré','brut']);
prompt({auto:true,endurance:true,mode:'parade',damage:'0'});ctx.form.children[1].input.value='-2';const snapshot=JSON.stringify(ctx.state);assert.equal(ctx.validate(),false);assert.equal(JSON.stringify(ctx.state),snapshot);
console.log('OK Dégâts Automatique : formulaire réel, dégâts finaux, option désactivée, PV maximum/négatifs/décimaux, absorption, esquive, parade lente, endurance, validation et persistance.');
