'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../docs/javascripts/owd-sync.js'),M=require('../docs/javascripts/owd-attr-map.js');
let count=0;function test(name,fn){fn();console.log('OK '+name);count++;}
function fixture(){const s=M.blank();s.comps=[{id:'retirer',nom:'Survie',rang:0,groupe:''},{id:'garder',nom:'Escalade',rang:1,groupe:''}];return s;}
function ui(state){
 let refreshes=0,saved=null,confirmation=null,rebuilds=0;
 const make=(tag,cls,text)=>({tag,className:cls||'',textContent:text||'',setAttribute(){},dataset:{},children:[],listeners:{},classList:{add(){},remove(){},toggle(){}},appendChild(child){this.children.push(child);child.parentNode=this;},addEventListener(type,fn){this.listeners[type]=fn;}});
 const ctx={state,el:make,compHooks:[],rangs:()=>[{xp:0,rupture:0},{xp:10,rupture:0},{xp:20,rupture:1}],rangMax:()=>2,num:(n,d)=>Number.isFinite(Number(n))?Number(n):d,clamp:(n,min,max)=>Math.max(min,Math.min(max,n)),pub:(_,v)=>v,
 lireComp:(name,id)=>{const out={};Object.entries(state.compsLeviers?.[name]||{}).forEach(([box,values])=>{if(id in values)out[box]=values[id];});return out;},chaine:(x,v)=>x?.force??v,levierRegleDe:x=>Object.keys(x||{}).length>0,fmtP:String,rangInitiale:(_,i)=>String(i),rangTitre:()=>'',
 refresh(){refreshes++;saved=C.copy(state);},confirmer(titre,texte,libelle,fn){confirmation={titre,texte,libelle,fn};},optCompsRebuild(){rebuilds++;}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/fiche/socle/090-calculs-comps.js','utf8'),ctx);vm.runInContext(fs.readFileSync('src/fiche/fiche/comps.js','utf8'),ctx);ctx.rebuildComps=()=>rebuilds++;
 return {ctx,click(index=0){const row=ctx.compRow(state.comps[index],false,{onDrop(){rebuilds++;}});row.children[1].children.find(x=>x.className.includes('pc-comp-del')).listeners.click();},confirm(){assert.ok(confirmation);confirmation.fn();},get confirmation(){return confirmation;},get saved(){return saved;},get refreshes(){return refreshes;},get rebuilds(){return rebuilds;}};
}
test('clic réel : suppression sans anciennes tables, rafraîchissement et sauvegarde',()=>{const s=fixture(),w=ui(s);assert.equal(s.compsMod,undefined);assert.doesNotThrow(()=>w.click());assert.deepEqual(s.comps.map(c=>c.id),['garder']);assert.equal(w.refreshes,1);assert.deepEqual(w.saved.comps.map(c=>c.id),['garder']);assert.ok(w.rebuilds>0);});
test('confirmation : annuler conserve la compétence et ses XP ; valider les libère',()=>{const s=fixture();s.comps[0].rang=2;const w=ui(s);w.ctx.caracsXpDepense=()=>0;s.techniques=[];const xpBefore=w.ctx.xpDepenseBrut();w.click();assert.equal(s.comps.length,2);assert.equal(w.refreshes,0);assert.ok(w.confirmation.texte.includes('XP investis'));assert.ok(w.confirmation.texte.includes('point de rupture'));w.confirm();assert.equal(s.comps.length,1);assert.equal(xpBefore-w.ctx.xpDepenseBrut(),30);assert.equal(w.ctx.ruptureComps(),0);});
test('leviers actuels : retrait de toutes les boîtes de la seule compétence supprimée',()=>{const s=fixture();for(const name of ['bonus','des','xp','rupture','offerts']){s.compsLeviers[name]={};for(const box of ['a1','a2','a3','a4','m1','m2','m3','m4','force'])s.compsLeviers[name][box]={retirer:2,garder:3};}const w=ui(s);w.click();w.confirm();for(const name of Object.keys(s.compsLeviers))for(const box of Object.keys(s.compsLeviers[name]))assert.deepEqual(s.compsLeviers[name][box],{garder:3});});
test('armes liées : lien retiré après confirmation, autres armes intactes',()=>{const s=fixture();s.inv.objets=[{ref:'a',arme:{comp:'retirer'}},{ref:'b',arme:{comp:'garder'}}];const w=ui(s);w.click();assert.ok(w.confirmation.texte.includes('arme'));assert.equal(s.inv.objets[0].arme.comp,'retirer');w.confirm();assert.equal(s.inv.objets[0].arme.comp,'');assert.equal(s.inv.objets[1].arme.comp,'garder');});
test('anciens imports : nettoyage sans imposer les anciennes tables aux fiches récentes',()=>{const s=fixture();s.compsMod={retirer:5,garder:7};s.compsForce={retirer:12};const w=ui(s);w.click();assert.deepEqual(s.compsMod,{garder:7});assert.ok(!s.compsForce||!('retirer' in s.compsForce));assert.equal(s.compsMod2,undefined);});
test('sauvegarde partagée : la suppression reste effective après confirmation et réouverture',()=>{const s=fixture(),attrs=C.Compact.encode(s),session=new C.Compact.Session(attrs,s,Date.now,{id:'suppression'}),w=ui(s);w.click();session.capture(w.saved);const ops=Object.values(session.outgoing());attrs.owd_ops_test={current:JSON.stringify({epoch:session.epoch,ops})};const remote=C.Compact.read(attrs);assert.deepEqual(remote.state.comps.map(c=>c.id),['garder']);session.receive(attrs);assert.equal(Object.keys(session.pending).length,0);assert.deepEqual(new C.Compact.Session(attrs,remote.state).seed.comps.map(c=>c.id),['garder']);});
test('dernière compétence : liste vide et suppression des leviers devenus vides',()=>{const s=fixture();s.comps=s.comps.slice(0,1);s.compsLeviers={bonus:{force:{retirer:5}}};const before=C.copy(s),w=ui(s);w.click();w.confirm();assert.equal(s.comps.length,0);assert.deepEqual(s.compsLeviers,{});const attrs=C.Compact.encode(before),session=new C.Compact.Session(attrs,before);session.capture(w.saved);attrs.owd_ops_test={current:JSON.stringify({epoch:session.epoch,ops:Object.values(session.outgoing())})};assert.equal(C.Compact.read(attrs).state.comps.length,0);});
test('montée de rang sans quota malgré 500 compétences et anciennes données de limite',()=>{
 const s=fixture();s.comps=Array.from({length:500},(_,i)=>({id:'c'+i,nom:'Compétence '+i,rang:1,groupe:''}));s.xpTotal=100000;
 const w=ui(s);Object.assign(w.ctx,{D:()=>({limites:{competences:{diviseur:5}}}),caracsOrdre:()=>[],caracsXpDepense:()=>0,ruptureMax:()=>3,isEdit:()=>true,flash:message=>assert.fail(message)});
 const row=w.ctx.compRow(s.comps[0],false,{module:'optcomps'});row.children[1].children.find(c=>c.className==='pc-stadebar').children[2].listeners.click();
 assert.equal(s.comps[0].rang,2);assert.equal(w.saved.comps.length,500);assert.equal(w.ctx.compXp(s.comps[0]),30);assert.equal(w.ctx.ruptureComps(),1);
 const restored=C.Compact.read(C.Compact.encode(w.saved)).state;assert.equal(restored.comps.length,500);assert.equal(restored.comps[0].rang,2);
});
test('sans quota : XP et rupture restent requis, rangs offerts toujours gratuits en XP',()=>{
 const s=fixture(),w=ui(s),errors=[];s.techniques=[];s.xpTotal=0;Object.assign(w.ctx,{isEdit:()=>true,caracsXpDepense:()=>0,ruptureMax:()=>0,flash:m=>errors.push(m)});
 function rank(n){const row=w.ctx.compRow(s.comps[0],false,{module:'optcomps'});row.children[1].children.find(c=>c.className==='pc-stadebar').children[n].listeners.click();}
 rank(1);assert.equal(s.comps[0].rang,0);assert.equal(errors.pop(),'XP insuffisant.');
 s.xpTotal=100;rank(2);assert.equal(s.comps[0].rang,0);assert.equal(errors.pop(),'Aucun point de rupture disponible.');
 s.xpTotal=10;s.compsLeviers.offerts={force:{retirer:1}};rank(1);assert.equal(s.comps[0].rang,1);assert.equal(w.ctx.compXp(s.comps[0]),0);
});
console.log(count+' scénarios de suppression de compétence validés.');
