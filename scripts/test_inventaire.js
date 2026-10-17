/* Transferts : données complètes, reprise d'une réception partielle, conflits
 * et confirmations serveur. Aucune API Roll20 ni dépendance externe. */
'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),D=require('../docs/javascripts/owd-inventaire-data.js'),C=require('../docs/javascripts/owd-sync.js'),M=require('../docs/javascripts/owd-attr-map.js');
let count=0;function test(label,fn){fn();count++;console.log('OK '+label);}
const original=[{ref:'bag',nom:'Sac',contenant:'liquide',qte:1,img:'https://example.invalid/sac.png',desc:'Été',arme:null,ou:'sac',emp:-1,dans:'',extras:{marque:'personnelle'}},{ref:'water',nom:'Eau',contenu:'liquide',dans:'bag',qte:3,ou:'sac',emp:-1},{ref:'weapon',nom:'Épée',qte:1,arme:{attaque:'2+3',modsDegats:['Force','Dexterite',''],comp:'c1'},ou:'mainG',emp:2,dans:''}];
const job=D.prepare('a','b',D.group({objets:original},'bag'),'test1');
test('conteneur et contenu copiés, références et liens internes remappés',()=>{assert.equal(job.dest.length,2);assert.equal(job.dest[1].dans,job.dest[0].ref);assert.notEqual(job.dest[0].ref,'bag');assert.deepEqual(job.dest[0].extras,original[0].extras);assert.equal(job.dest[0].img,original[0].img);assert.deepEqual(job.items,original.slice(0,2));assert.equal(original[1].dans,'bag');});
test('boucle de conteneurs bornée et objet absent refusé',()=>{assert.equal(D.group({objets:[{ref:'a',dans:'b'},{ref:'b',dans:'a'}]},'a').length,2);assert.throws(()=>D.group({objets:[]},'missing'));});
test('personnages identiques et références dupliquées refusés',()=>{assert.throws(()=>D.prepare('a','a',original,'x'));assert.throws(()=>D.prepare('a','b',[original[0],original[0]],'x'));});
test('armes, trois MOD et métadonnées conservés hors placement',()=>{const j=D.prepare('a','b',[original[2]],'test2');assert.deepEqual(j.dest[0].arme,original[2].arme);assert.equal(j.dest[0].ou,'terre');assert.equal(j.dest[0].emp,-1);});
function api(state){const ctx={state:D.copy(state),window:{OwdInventoryData:D},save(){ctx.saves++;},remount(){},invSelectionLocale:'',saves:0};vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../src/fiche/equipement/inv-transfert.js'),'utf8'),ctx);return ctx;}
test('réception rejouable après un envoi partiel, un seul exemplaire',()=>{const b=api({inv:{objets:[{ref:job.dest[0].ref,nom:'Sac'}]}});b.importeTransfert(job);b.importeTransfert(job);assert.equal(b.state.inv.objets.length,2);assert.ok(D.received(b.state,job));});
test('reçu durable empêche de recréer un objet retiré après réception',()=>{const b=api({inv:{objets:[]}});b.importeTransfert(job);b.confirmeTransfert(job);b.state.inv.objets=[];b.importeTransfert(job);assert.equal(b.state.inv.objets.length,0);assert.ok(D.committed(b.state,job));});
test('retrait source idempotent, autres objets intacts',()=>{const a=api({inv:{objets:original}});a.retireTransfert(job);a.retireTransfert(job);assert.ok(D.removed(a.state,job));assert.deepEqual(JSON.parse(JSON.stringify(a.state.inv.objets)),[original[2]]);});
test('modification concurrente source protège tous les objets du transfert',()=>{const a=api({inv:{objets:original}});a.state.inv.objets[1].qte=4;assert.throws(()=>a.retireTransfert(job),/modifié/);assert.equal(a.state.inv.objets.length,3);assert.equal(a.saves,0);});
test('annulation du reçu intact sans toucher les autres objets',()=>{const b=api({inv:{objets:job.dest.concat([original[2]])}});b.annuleTransfert(job);assert.ok(D.cancelled(b.state,job));assert.equal(b.state.inv.objets[0].ref,'weapon');});
test('annulation ne supprime jamais un reçu modifié ailleurs',()=>{const b=api({inv:{objets:job.dest}});b.state.inv.objets[0].desc='Retouché';assert.throws(()=>b.annuleTransfert(job),/modifié/);assert.equal(b.state.inv.objets.length,2);assert.equal(b.saves,0);});
test('photographie locale et réception partielle ne valent pas confirmation',()=>{const state={v:11,inv:{objets:[]}},attrs={[C.BASE]:{current:JSON.stringify({format:1,state}),max:''}},s=new C.Session(attrs,state);const next=D.copy(state);next.inv.objets=job.dest;s.capture(next);const outgoing=s.outgoing();assert.ok(!D.received(C.read(attrs).state,job));const first=Object.keys(outgoing)[0];attrs[first]=outgoing[first];assert.ok(!D.received(C.read(attrs).state,job));Object.assign(attrs,outgoing);assert.ok(D.received(C.read(attrs).state,job));assert.ok(!D.committed(C.read(attrs).state,job));});
test('sac retiré conserve ses descendants, poids sans double comptage et transfert complet',()=>{const bag={ref:'bag',id:'pack',sac:true,qte:1,poids:2,ou:'dos'},food={ref:'food',id:'ration',qte:6,poids:.5,ou:'sac'},bottle={ref:'flask',contenant:'liquide',qte:1,poids:1,ou:'sacep',emp:0},water={ref:'water',dans:'flask',qte:2,poids:1,ou:'sac'},items=[bag,food,bottle,water];D.bind(items);assert.equal(food.dans,'bag');assert.equal(bottle.dans,'bag');assert.equal(D.weight(items,bag),8);bag.ou='poches';D.bind(items);assert.equal(D.backpack(items),null);assert.equal(D.group({objets:items},'bag').length,4);const j=D.prepare('a','b',D.group({objets:items},'bag'),'bag-transfer');assert.equal(j.dest.length,4);assert.equal(j.dest[1].dans,j.dest[0].ref);assert.equal(j.dest[3].dans,j.dest[2].ref);bag.ou='dos';D.bind(items);assert.equal(D.backpack(items),bag);});
test('séparation garde le catalogue, les propriétés et le sac, avec une référence indépendante',()=>{const items=[{ref:'bag',sac:true,ou:'dos',qte:1},{ref:'pile',id:'ration',qte:6,ou:'sac',dans:'bag',desc:'Ancienne ration',poids:.5}];const out=D.split(items,items[1],2,'split');assert.equal(items[1].qte,4);assert.equal(out.qte,2);assert.equal(out.id,'ration');assert.equal(out.dans,'bag');assert.equal(out.desc,'Ancienne ration');assert.throws(()=>D.split(items,items[1],4,'bad'));assert.throws(()=>D.split(items,items[0],.5,'bad'));});
test('sans sac porté, les objets libres vont par terre, les contenus restent liés',()=>{const bag={ref:'bag',sac:true,ou:'poches',qte:1},child={ref:'child',ou:'sac',dans:'bag'},loose={ref:'loose',ou:'sac',emp:-1},slot={ref:'slot',ou:'sacep',emp:2};const items=[bag,child,loose,slot];D.bind(items);assert.equal(child.dans,'bag');assert.equal(child.ou,'sac');assert.equal(loose.ou,'terre');assert.equal(slot.ou,'terre');assert.equal(slot.emp,-1);bag.ou='dos';D.bind(items);assert.equal(loose.ou,'terre');assert.equal(child.dans,'bag');});
test('poches : Minuscule et Très petite uniquement, taille manquante exclue',()=>{
  for(const t of ['Minuscule','Très petite'])assert.ok(D.pocketFits({taille:t}));
  for(const t of ['Petite','Moyenne','Grande','Très grande','Gigantesque',''])assert.ok(!D.pocketFits({taille:t}));
  const items=[{ref:'a',ou:'poches',taille:'Petite'},{ref:'b',ou:'poches',taille:'Très petite'},{ref:'c',ou:'poches'},{ref:'d',ou:'terre',taille:'Gigantesque'}];
  D.bind(items);assert.deepEqual(items.map(x=>x.ou),['terre','poches','terre','terre']);
});
test('aucun objet au sol ni ses descendants ne sont portés',()=>{
  const items=[{ref:'s',ou:'terre',sac:true,poids:5},{ref:'a',dans:'s',ou:'sac',poids:10},{ref:'b',dans:'a',ou:'sac',poids:7},
               {ref:'w',ou:'mainG',poids:3},{ref:'f',ou:'poches',taille:'Minuscule',poids:2}];
  D.bind(items); assert.deepEqual(items.map(x=>D.isCarried(items,x)),[false,false,false,true,true]);
  items[0].ou='dos';D.bind(items);assert.deepEqual(items.map(x=>D.isCarried(items,x)),[true,true,true,true,true]);
  items[0].ou='terre';D.bind(items);assert.deepEqual(items.map(x=>D.isCarried(items,x)),[false,false,false,true,true]);
});
test('sol illimité, conservation du lieu à la séparation et au transfert',()=>{
  const items=Array.from({length:30},(_,i)=>({ref:'g'+i,ou:'terre',taille:'Gigantesque',qte:10,poids:100}));
  D.bind(items);assert.ok(items.every(x=>x.ou==='terre'));
  const detached=D.split(items,items[0],3,'new');assert.equal(detached.ou,'terre');assert.equal(detached.qte,3);
  const received=D.prepare('un','autre',[detached],'ground-transfer');assert.equal(received.dest[0].ou,'terre');
});
test('Par terre et objets imbriqués persistent dans les attributs Roll20',()=>{
  const state=M.blank();state.inv.objets=[
    {ref:'sac-sol',ou:'terre',sac:true,qte:1,poids:2,taille:'Grande'},
    {ref:'bouteille',ou:'sac',dans:'sac-sol',contenant:'liquide',qte:1},
    {ref:'eau',ou:'sac',dans:'bouteille',contenu:'liquide',qte:2},
    {ref:'piece',ou:'poches',taille:'Très petite',qte:4}
  ];
  const loaded=M.attrsToState(M.stateToAttrs(state));
  assert.deepEqual(loaded.inv.objets,state.inv.objets);
  assert.deepEqual(loaded.inv.objets.map(x=>D.isCarried(loaded.inv.objets,x)),[false,false,false,true]);
});
test('fusion Consommable : neuf valeurs anciennes sans perte de données',()=>{
  const sandbox={D:()=>({}),pnum:v=>Number(v)||0,snum:v=>Number(v)||0,
    num:(v,d)=>Number(v)||d,combatTypes:()=>['physique','feu','froid','eclair','decomposition','ethere','brut']};
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../src/fiche/equipement/inv-nouveaux.js'),'utf8'),sandbox);
  for(const t of ['solide','pate','liquide'])for(const sous of ['ingerable','consommable','autre']){
    const objet={typeObjet:t,sousType:sous,nourri:sous==='ingerable',contenu:t==='solide'?'':t,restaurations:{pv:-12.5},effets:['exemple']};
    const n=sandbox.enrichitObjet({contenu:objet.contenu},objet);
    assert.equal(n.typeObjet,'consommable');assert.equal(n.sousType,t+'_'+(sous==='ingerable'?'ingerable':'autre'));
    assert.equal(n.nourri,sous==='ingerable');assert.equal(n.restaurations.pv,-12.5);
    assert.ok(sandbox.invAvecEffets(n));assert.equal(n.contenu,objet.contenu);
  }
  const cont=sandbox.enrichitObjet({contenant:'liquide'},{typeObjet:'contenant',contenant:'liquide'});
  assert.equal(cont.typeObjet,'contenant');assert.equal(cont.sousType,'liquide');
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.invSousTypes('consommable').map(e=>e[0]))),
    ['solide_ingerable','solide_autre','pate_ingerable','pate_autre','liquide_ingerable','liquide_autre']);
});
console.log(count+' scénarios de transfert et de stockage validés.');
