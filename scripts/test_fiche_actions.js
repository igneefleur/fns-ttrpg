'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..')+'/',I=require('../docs/javascripts/owd-inventaire-data.js'),C=require('../docs/javascripts/owd-sync.js'),M=require('../docs/javascripts/owd-attr-map.js');
let n=0;function test(label,fn){fn();console.log('OK '+label);n++;}
const attack=fs.readFileSync(root+'src/fiche/fiche/attaque.js','utf8');
function part(name,next){return attack.slice(attack.indexOf('    function '+name+'('),attack.indexOf('    function '+next+'('));}
function attackContext(items){const chats=[],errors=[];const ctx={state:{inv:{objets:items},etat:{pe:100},combatOptions:{attaques:{utiliseMunition:true,utiliseEndurance:true,lente:false}}},D:()=>({impregnations:JSON.parse(fs.readFileSync(root+'docs/data/owd-boutique.json')).impregnations||[]}),window:{OwdInventoryData:I},pnum:v=>Math.max(0,Number(v)||0),snum:v=>Number(v)||0,caracTotal:()=>20,fmtP:String,combatTypes:()=>['physique','feu'],combatMod:()=>0,effetsSources:()=>[],effetBonus:()=>0,effetCout:(_,v)=>v,armesData:()=>[{cle:'test',types:['physique'],munition:{cle:'balle'}}],flash:m=>errors.push(m),sayChat:(titre,champs)=>chats.push({titre,champs}),refresh(){I.normalizeSlots(items);},courant:k=>ctx.state.etat[k]};vm.createContext(ctx);for(const [a,b]of[['impregnationSelectionnee','bonusImpregnation'],['bonusImpregnation','armesInventaire'],['typeArme','modsDegatsArme'],['modsDegatsArme','degatsArme'],['typesCoup','multiplicateurCoup'],['multiplicateurCoup','degatsCoup'],['degatsTypes','brutArme'],['brutArme','brutCoup'],['brutCoup','fmtMult'],['objetInventaire','coutEndurance'],['coutEndurance','categorieMunition'],['categorieMunition','munitionsCompatibles'],['munitionSelectionnee','retireUneMunition'],['retireUneMunition','prepareRessources'],['prepareRessources','executeAttaque'],['executeAttaque','envoieCoup'],['envoieCoup','envoieAttaqueSimple']])vm.runInContext(part(a,b),ctx);const a=attack.indexOf('    function envoieAttaqueSimple('),b=attack.indexOf('    // ---------- carte hexagonale',a);vm.runInContext(attack.slice(a,b),ctx);return {ctx,chats,errors};}
function weapon(){return {ref:'w',nom:'Test',qte:1,ou:'mainD',arme:{attaque:6,degats:10,type:'test',modsDegats:[]}};}
function ammo(qte=1){return {ref:'ammo',nom:'Projectile spécial',qte,ou:'poches',taille:'Minuscule',typeObjet:'munition',sousType:'balle',desc:'Description conservée',munitionStats:{degats:7,repartition:{feu:100}}};}
function def(){return {types:['physique'],munition:{cle:'balle'}};}
test('contenants empilés : un tir retire une seule munition totale',()=>{const a=ammo(10);a.dans='q';const items=[weapon(),{ref:'q',qte:2,ou:'poches',taille:'Très petite'},a],w=attackContext(items),before=I.totalQuantity(items,a);w.ctx.envoieAttaqueSimple({munition:'ammo'},items[0],def());const total=items.filter(o=>o.typeObjet==='munition').reduce((n,o)=>n+I.totalQuantity(items,o),0);assert.equal(before,20);assert.equal(total,19);assert.equal(a.qte,9);assert.equal(items.find(o=>o.ref==='q').qte,1);assert.equal(w.ctx.state.etat.pe,94);});
test('imbrication de contenants : tous les autres exemplaires restent pleins',()=>{const a=ammo(2);a.dans='inner';const items=[weapon(),{ref:'outer',qte:3,ou:'poches'},{ref:'inner',qte:2,dans:'outer',ou:'poches'},a],w=attackContext(items);w.ctx.envoieAttaqueSimple({munition:'ammo'},items[0],def());assert.equal(items.filter(o=>o.typeObjet==='munition').reduce((n,o)=>n+I.totalQuantity(items,o),0),11);});
test('dernière munition : quantité zéro, référence et propriétés conservées, bonus inclus dans le tir',()=>{const a=ammo(),it=weapon(),items=[it,a],w=attackContext(items),entry={munition:'ammo'},properties=C.copy(a);w.ctx.envoieAttaqueSimple(entry,it,def());assert.equal(a.qte,0);assert.equal(entry.munition,'ammo');assert.equal(items.find(o=>o.ref==='ammo'),a);properties.qte=0;assert.deepEqual(a,properties);assert.ok(w.chats[0].champs[0][1].includes('7 feu'));assert.equal(w.ctx.state.etat.pe,94);});
test('munition zéro : nouveau tir refusé sans coût ; réassort réutilisable sans recréer l’objet',()=>{const a=ammo(),it=weapon(),w=attackContext([it,a]),entry={munition:'ammo'};w.ctx.envoieAttaqueSimple(entry,it,def());w.ctx.envoieAttaqueSimple(entry,it,def());assert.equal(w.chats.length,1);assert.equal(w.ctx.state.etat.pe,94);assert.ok(w.errors.length);a.qte=2;w.ctx.envoieAttaqueSimple(entry,it,def());assert.equal(w.chats.length,2);assert.equal(a.qte,1);assert.equal(w.ctx.state.etat.pe,88);});
test('coup dessiné : dégâts de touche et passage préparés avant consommation',()=>{const a=ammo(),it=weapon(),w=attackContext([it,a]);w.ctx.envoieCoup({munition:'ammo'},it,{nom:'Coup',mult:1,types:['physique','physique']},def());assert.ok(w.chats[0].champs[0][1].includes('7 feu'));assert.ok(w.chats[0].champs[1][1].includes('3 feu'));assert.equal(a.qte,0);});
test('options : consommation désactivée préserve la quantité ; attaque lente ne dépense pas de PE',()=>{const a=ammo(),it=weapon(),w=attackContext([it,a]);w.ctx.state.combatOptions.attaques.utiliseMunition=false;w.ctx.envoieAttaqueSimple({munition:'ammo'},it,def());assert.equal(a.qte,1);w.ctx.state.combatOptions.attaques.utiliseMunition=true;w.ctx.state.combatOptions.attaques.lente=true;w.ctx.envoieAttaqueSimple({munition:'ammo'},it,def());assert.equal(w.ctx.state.etat.pe,94);assert.equal(a.qte,0);});
test('munition équipée épuisée : objet conservé, emplacement libéré',()=>{const a=ammo();a.ou='ceint';const it=weapon(),w=attackContext([it,a]);w.ctx.envoieAttaqueSimple({munition:'ammo'},it,def());assert.equal(a.qte,0);assert.equal(a.ou,'terre');});
function consumption(){const state=M.blank();state.etat.pv=50;state.inv.objets=[{ref:'sac',qte:2,ou:'poches'},{ref:'potion',nom:'Potion',qte:2,dans:'sac',ou:'poches',effets:['test'],restaurations:{pv:5}}];const ctx={state,window:{OwdInventoryData:I},pnum:v=>Math.max(0,Number(v)||0),snum:v=>Number(v)||0,num:(v,d)=>Number.isFinite(Number(v))?Number(v):d,effetDefinition:id=>({id,ops:id==='impr'?{impregnation:{}}:{}}),flash(){},defenseArme:()=>null,invEstIngerable:()=>false,maxDe:()=>100,appliqueEffet(){},bougeReserve:(k,v)=>state.etat[k]+=v,effetPerteInnocence:v=>v,contenancePrise:()=>0,fmtP:String,sayChat(){},refresh(){},invRender:null};vm.createContext(ctx);const src=fs.readFileSync(root+'src/fiche/equipement/inv-nouveaux.js','utf8'),a=src.indexOf('  function invConsommer('),b=src.indexOf('  function invConsommerDialogue(',a);vm.runInContext(src.slice(a,b),ctx);return ctx;}
test('consommation refusée : demi-dose, quantité zéro et cible absente ne changent aucun objet',()=>{for(const scenario of ['demi','zero','cible']){const c=consumption(),it=c.state.inv.objets[1];if(scenario==='cible')it.effets=['impr'];const before=I.stable(c.state);assert.equal(c.invConsommer(it,scenario==='demi'?.5:scenario==='zero'?0:1,''),false);assert.equal(I.stable(c.state),before);}});
test('consommation valide : un seul contenant isolé, dose consommée et restauration appliquée',()=>{const c=consumption(),it=c.state.inv.objets[1];assert.equal(c.invConsommer(it,1,''),true);assert.equal(c.state.etat.pv,55);assert.equal(c.state.inv.objets.filter(o=>o.nom==='Potion').reduce((n,o)=>n+I.totalQuantity(c.state.inv.objets,o),0),3);});
function techniques(initial){
 function el(tag,cls,text){
  const classes=new Set(String(cls||'').split(/\s+/).filter(Boolean));
  const node={tag,className:cls||'',textContent:text||'',dataset:{},children:[],listeners:{},style:{setProperty(k,v){this[k]=v;}},attributes:{},
   classList:{add(...ks){ks.forEach(k=>classes.add(k));},remove(...ks){ks.forEach(k=>classes.delete(k));},toggle(k,on){if(on===undefined)on=!classes.has(k);if(on)classes.add(k);else classes.delete(k);return on;},contains:k=>classes.has(k)},
   appendChild(c){c.parentNode=this;this.children.push(c);return c;},
   addEventListener(k,fn){(this.listeners[k]||(this.listeners[k]=[])).push(fn);},
   setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return this.attributes[k];},
   set innerHTML(v){this.children=[];this._html=v;},get innerHTML(){return this._html||'';},
   get isConnected(){return true;},get offsetParent(){return this;},
   getBoundingClientRect(){return {top:100};},contains(n){return this.children.includes(n);},
   click(){(this.listeners.click||[]).forEach(fn=>fn({preventDefault(){},stopPropagation(){}}));}
  };
  return node;
 }
 const state=M.blank();
 state.techniques=initial||[{id:'art-a-classer',nom:'À classer',techniques:[{id:'t',nom:'Test',rang:1,rangs:[{id:'r1',nom:'Rang I',xp:10,rupture:2,desc:'Description du rang',mode:'plain'}],legacyXp:3,legacyRupture:1,legacyDesc:'Ancienne description',offert:0}]}];
 let id=0;const chats=[],ctx={state,hooks:[],remontageNettoyage:[],document:{activeElement:null,querySelector(){return null;}},window:{innerHeight:900,addEventListener(){},removeEventListener(){}},
  el,block:(title,small,id,onToggle)=>{const b=el('div','pc-block');b.appendChild(el('div','pc-block-title',title));return b;},
  miniBtn:(text,title,fn,cls)=>{const b=el('button','pc-mini '+(cls||''),text);b.listeners.click=[fn];return b;},
  sayChat:(title,fields)=>chats.push({title,fields}),notesRendu:(target,text,mode)=>{target.textContent=text;target.mode=mode;},
  num:(v,d)=>Number.isFinite(Number(v))?Number(v):d,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),
  applyEdit(){},refresh(){},save(){},isEdit:()=>true,confirmer:(_,__,___,fn)=>fn(),uid:()=>String(++id),flash(){}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(root+'src/fiche/art/techniques.js','utf8'),ctx);
 return {ctx,ui:ctx.buildTechniques(),chats,
  find(node,cls){if(String(node.className||'').split(/\s+/).includes(cls))return node;for(const c of node.children||[]){const found=this.find(c,cls);if(found)return found;}return null;},
  findAll(node,cls,out){out=out||[];if(String(node.className||'').split(/\s+/).includes(cls))out.push(node);for(const c of node.children||[])this.findAll(c,cls,out);return out;},
  findText(node,text){if(node.textContent===text)return node;for(const c of node.children||[]){const found=this.findText(c,text);if(found)return found;}return null;},
  fire(node,type,extra){assert.ok(node,'élément attendu pour '+type);(node.listeners[type]||[]).forEach(fn=>fn(Object.assign({preventDefault(){},stopPropagation(){},relatedTarget:null},extra||{})));}
 };
}
test('Techniques : arts, techniques et rangs détaillés, envoi au tchat utilisable en lecture',()=>{
 const w=techniques(),{ctx,ui,chats}=w;
 const firstRank=w.find(ui,'pc-tech-rank');assert.ok(firstRank);assert.equal(firstRank.dataset.syncEntity,'r1');
 const send=(function seek(n){if(n.textContent==='Envoyer')return n;for(const c of n.children||[]){const r=seek(c);if(r)return r;}return null;})(firstRank);
 assert.ok(send);send.click();assert.equal(chats.length,1);assert.equal(chats[0].fields[0][1],'À classer');assert.equal(chats[0].fields[2][1],'Rang I');
 const display=w.find(ui,'pc-tech-display-modes');assert.ok(display);assert.equal(display.children[0].getAttribute('aria-pressed'),'true');
 const hooks=ctx.hooks.length;assert.equal(hooks,2);
 const addArt=(function seek(n){if(n.textContent==='+ Art')return n;for(const c of n.children||[]){const r=seek(c);if(r)return r;}return null;})(ui);
 assert.ok(addArt);addArt.click();
 assert.equal(ctx.state.techniques.length,2);assert.equal(ctx.hooks.length,hooks);
});
test('Techniques : commandes d’édition, formats Notes, description et pied de rang respectent le placement demandé',()=>{
 const w=techniques(),ui=w.ui,rank=w.find(ui,'pc-tech-rank');assert.ok(rank);
 const head=w.find(rank,'pc-tech-rank-head');assert.ok(head);
 assert.equal(head.children[2].children[0].textContent,'×');assert.ok(String(head.children[2].children[0].className).includes('pc-edit-only'));
 assert.equal(head.children[3].children[1].type,'text');assert.equal(head.children[4].children[1].type,'text');
 const read=w.find(rank,'pc-tech-rank-read');assert.equal(read.textContent,'Description du rang');
 const footer=w.find(rank,'pc-tech-rank-footer');assert.ok(footer);
 assert.ok(rank.children.indexOf(read)<rank.children.indexOf(footer));
 const modes=w.find(footer,'pc-notes-modes');assert.ok(modes);
 assert.equal(modes.children[0].textContent,'Brut');assert.equal(modes.children[1].textContent,'Markdown');
 assert.equal(footer.children[1].textContent,'Envoyer');
 const arts=w.find(ui,'pc-tech-arts'),techs=w.find(ui,'pc-tech-list-pane');
 assert.ok(w.findText(arts,'Arts'));assert.ok(w.findText(techs,'Techniques'));assert.equal(arts.children[0].children.length,1);assert.equal(techs.children[0].children.length,1);
 assert.equal(w.find(ui,'pc-tech-item').children[0].textContent,'⠿');
 assert.ok(w.find(ui,'pc-tech-item').children[0].className.includes('pc-comp-drag'));
 const css=fs.readFileSync(root+'docs/stylesheets/owd-fiche.css','utf8');
 assert.ok(css.includes('.pc-editable:not(.editing) .pc-edit-only { display: none !important; }'));
 assert.ok(css.includes('.pc-editable.editing .pc-tech-rank-read { display: none; }'));
 assert.ok(css.includes('.pc-editable:not(.editing) .pc-tech-rank-editor { display: none; }'));
 assert.ok(css.includes('grid-template-columns: var(--tech-rank-action-width) minmax(0, 1fr) var(--tech-rank-action-width) 2.325rem 2.325rem;'));
 assert.ok(css.includes('--tech-rank-control-height: 1.75rem;'));
 assert.ok(css.includes('.pc-editable:not(.editing) .pc-tech-rank-number.is-zero { visibility: hidden; }'));
 assert.ok(css.includes('display: flex; align-items: center; justify-content: flex-end;'));
});
test('Techniques : sélecteur numérique et dégradé continu jusqu’à la teinte finale',()=>{
 const w=techniques([{id:'a',nom:'Art',techniques:[{id:'t',nom:'T',rang:4,rangs:Array.from({length:8},(_,i)=>({id:'r'+i,nom:'Rang '+(i+1),xp:i,rupture:i,desc:'',mode:'plain'}))}]}]);
 const bar=w.find(w.ui,'pc-tech-acquired-bar');assert.ok(bar);assert.deepEqual(bar.children.map(x=>x.textContent),['1','2','3','4','5','6','7','8']);
 assert.equal(bar.children[0].style['--tech-rang-debut'],'100%');assert.equal(bar.children[0].style['--tech-rang-fin'],'0%');
 assert.equal(bar.children[7].style['--tech-rang-debut'],'0%');assert.equal(bar.children[7].style['--tech-rang-fin'],'100%');
 const css=fs.readFileSync(root+'docs/stylesheets/owd-fiche.css','utf8');
 assert.ok(css.includes('color-mix(in srgb, var(--tech-rang-couleur-debut) var(--tech-rang-debut), var(--tech-rang-couleur-fin) var(--tech-rang-fin))'));
 assert.ok(css.includes('--tech-rang-couleur-fin: var(--accent-deep);'));
 assert.ok(css.includes('--tech-rang-couleur-fin: #6b5a2e;'));
 assert.ok(css.includes('flex: 0 0 1.2rem; width: 1.2rem;'));assert.ok(css.includes('justify-content: flex-end;'));
 assert.ok(css.includes('margin-left: auto; overflow-x: auto;'));
 assert.ok(css.includes('--tech-rank-action-width: 1.1rem;'));
 assert.ok(css.includes('height: var(--tech-rank-control-height); min-height: var(--tech-rank-control-height);\n  padding: 0; line-height: 1;'));
});
test('Techniques : affichage Tout, Acquis et Meilleur filtre les rangs sans modifier leur ordre',()=>{
 const data=[{id:'a',nom:'Art',techniques:[{id:'t',nom:'T',rang:2,affichage:'tout',rangs:[
  {id:'r1',nom:'I',xp:1,rupture:1,desc:'',mode:'plain'},
  {id:'r2',nom:'II',xp:2,rupture:2,desc:'',mode:'plain'},
  {id:'r3',nom:'III',xp:3,rupture:3,desc:'',mode:'plain'},
  {id:'r4',nom:'IV',xp:4,rupture:4,desc:'',mode:'plain'}]}]}];
 const w=techniques(data),cards=w.findAll(w.ui,'pc-tech-rank'),group=w.find(w.ui,'pc-tech-display-modes');
 assert.equal(cards.length,4);assert.ok(group);assert.deepEqual(group.children.map(x=>x.textContent),['Tout','Acquis','Meilleur']);
 assert.equal(group.children[0].getAttribute('aria-pressed'),'true');assert.ok(cards.every(x=>x.hidden!==true));
 group.children[1].click();assert.equal(data[0].techniques[0].affichage,'acquis');
 assert.deepEqual(cards.map(x=>x.hidden===true),[false,false,true,true]);
 assert.equal(group.children[1].getAttribute('aria-pressed'),'true');assert.equal(group.children[0].getAttribute('aria-pressed'),'false');
 group.children[2].click();assert.equal(data[0].techniques[0].affichage,'meilleur');
 assert.deepEqual(cards.map(x=>x.hidden===true),[true,false,false,false]);
 group.children[0].click();assert.deepEqual(cards.map(x=>x.hidden===true),[false,false,false,false]);
 const css=fs.readFileSync(root+'docs/stylesheets/owd-fiche.css','utf8');
 assert.ok(css.includes('.pc-tech-ranks-list > [hidden] { display: none !important; }'));
 assert.ok(css.includes('.pc-tech-display-modes { margin: 0; flex: 0 0 auto; }'));
});
test('Techniques : diviseurs alignés sur la typographie et la hauteur des lignes Arts/Techniques',()=>{
 const css=fs.readFileSync(root+'docs/stylesheets/owd-fiche.css','utf8');
 assert.ok(css.includes('padding: .12rem .18rem; border: 0; background: transparent;\n  color: var(--ink-2); font: inherit; font-size: .66rem; line-height: normal;'));
 assert.ok(css.includes('font-size: .66rem; line-height: normal; font-weight: 800;'));
 assert.ok(css.includes('padding: .1rem .15rem; border: 0; border-bottom: 1px solid var(--line-2);'));
 assert.ok(css.includes('.pc-tech-divider-del { flex: 0 0 auto; padding: .06rem .22rem; }'));
});
test('Techniques : valeurs XP et Rupture nulles identifiées sans supprimer leurs cases',()=>{ 
 const w=techniques([{id:'a',nom:'Art',techniques:[{id:'t',nom:'T',rang:0,rangs:[{id:'r',nom:'I',xp:0,rupture:0,desc:'',mode:'plain'}]}]}]);
 const rank=w.find(w.ui,'pc-tech-rank'),numbers=w.findAll(rank,'pc-tech-rank-number');assert.equal(numbers.length,2);
 assert.ok(numbers.every(n=>n.classList.contains('is-zero')));
 const css=fs.readFileSync(root+'docs/stylesheets/owd-fiche.css','utf8');
 assert.ok(css.includes('.pc-editable:not(.editing) .pc-tech-rank-number.is-zero { visibility: hidden; }'));
});
test('Techniques : une nouvelle technique et ses rangs se créent sans quotas artificiels',()=>{
 const w=techniques(),{ctx,ui}=w;
 const addTech=(function seek(n){if(n.textContent==='+ Technique')return n;for(const c of n.children||[]){const r=seek(c);if(r)return r;}return null;})(ui);
 assert.ok(addTech);addTech.click();const art=ctx.state.techniques[0];assert.equal(art.techniques.length,2);assert.equal(art.techniques[1].affichage,'tout');
 const addRank=(function seek(n){if(n.textContent==='+ Rang')return n;for(const c of n.children||[]){const r=seek(c);if(r)return r;}return null;})(ui);
 assert.ok(addRank);addRank.click();assert.equal(art.techniques[1].rangs.length,2);
 assert.equal(art.techniques[1].rangs[1].nom,'Rang 2');
});
test('Techniques : glisser vers un autre art conserve les rangs et leurs données, réordonner les arts',()=>{
 const w=techniques(),{ctx,ui}=w;
 const addArt=w.findText(ui,'+ Art');assert.ok(addArt);addArt.click();
 const sourceArt=w.findText(ui,'À classer');assert.ok(sourceArt);sourceArt.click();
 const techLabel=w.findText(ui,'Test');assert.ok(techLabel);const techRow=techLabel.parentNode,techGrip=techRow.children[0];
 const transfer={value:'',setData(type,value){this.value=value;},getData(){return this.value;}};
 w.fire(techGrip,'dragstart',{dataTransfer:transfer});
 const newArtLabel=w.findText(ui,'Nouvel art');assert.ok(newArtLabel);
 w.fire(newArtLabel.parentNode,'drop',{dataTransfer:transfer});
 assert.equal(ctx.state.techniques[1].techniques[0].id,'t');
 assert.equal(ctx.state.techniques[1].techniques[0].rangs[0].id,'r1');
 assert.equal(ctx.state.techniques[1].techniques[0].rangs[0].desc,'Description du rang');
 const movedArtLabel=w.findText(ui,'Nouvel art');const artGrip=movedArtLabel.parentNode.children[0];
 const firstArtLabel=w.findText(ui,'À classer');
 w.fire(artGrip,'dragstart',{dataTransfer:transfer});w.fire(firstArtLabel.parentNode,'drop',{dataTransfer:transfer});
 assert.equal(ctx.state.techniques[0].nom,'Nouvel art');
 assert.equal(ctx.state.techniques[0].techniques[0].id,'t');
});
test('Techniques : diviseurs nommés, repli des groupes et suppression sans toucher aux entrées',()=>{
 const data=[
  {id:'a1',nom:'Art premier',techniques:[
   {id:'t1',nom:'Technique première',rang:0,rangs:[{id:'r1',nom:'I',xp:1,rupture:1,desc:'',mode:'plain'}]},
   {id:'dt',type:'divider',nom:'Techniques avancées',replie:false},
   {id:'t2',nom:'Technique masquée',rang:0,rangs:[{id:'r2',nom:'II',xp:2,rupture:2,desc:'',mode:'plain'}]}
  ]},
  {id:'da',type:'divider',nom:'Arts de combat',replie:false},
  {id:'a2',nom:'Art second',techniques:[]}
 ];
 const w=techniques(data),artsList=w.find(w.ui,'pc-tech-art-list'),techList=w.find(w.ui,'pc-technique-list');
 const dividerArt=w.find(artsList,'pc-tech-divider-art'),dividerTech=w.find(techList,'pc-tech-divider-technique');
 assert.ok(dividerArt);assert.ok(dividerTech);
 const nameArt=dividerArt.children[2];nameArt.value='Arts martiaux';w.fire(nameArt,'input');assert.equal(data[1].nom,'Arts martiaux');
 const artRows=w.findAll(artsList,'pc-tech-item');assert.equal(artRows.length,2);assert.equal(artRows[1].hidden,false);
 dividerArt.children[1].click();assert.equal(data[1].replie,true);assert.equal(artRows[1].hidden,true);
 dividerArt.children[1].click();assert.equal(artRows[1].hidden,false);
 const techRows=w.findAll(techList,'pc-tech-item');assert.equal(techRows.length,2);assert.equal(techRows[1].hidden,false);
 dividerTech.children[1].click();assert.equal(data[0].techniques[1].replie,true);assert.equal(techRows[1].hidden,true);
 dividerTech.children[1].click();assert.equal(techRows[1].hidden,false);
 assert.ok(w.findText(artsList,'+ Diviseur')===null); // les actions d'ajout restent dans le pied du panneau
 assert.ok(w.findText(w.ui,'+ Diviseur'));
});
test('Techniques : les diviseurs se réorganisent par glisser-déposer sans déplacer leur contenu',()=>{
 const data=[
  {id:'a1',nom:'Art premier',techniques:[
   {id:'t1',nom:'Technique première',rang:0,rangs:[{id:'r1',nom:'I',xp:1,rupture:1,desc:'',mode:'plain'}]},
   {id:'dt',type:'divider',nom:'Groupe',replie:false},
   {id:'t2',nom:'Technique seconde',rang:0,rangs:[{id:'r2',nom:'II',xp:2,rupture:2,desc:'',mode:'plain'}]}
  ]},
  {id:'da',type:'divider',nom:'Groupe d’arts',replie:false},
  {id:'a2',nom:'Art second',techniques:[]}
 ];
 const w=techniques(data),transfer={value:'',setData(type,value){this.value=value;},getData(){return this.value;}};
 let artDivider=w.find(w.ui,'pc-tech-divider-art'),artList=w.find(w.ui,'pc-tech-art-list'),artFirst=w.findAll(artList,'pc-tech-item')[0];
 w.fire(artDivider.children[0],'dragstart',{dataTransfer:transfer});w.fire(artFirst,'drop',{dataTransfer:transfer});
 assert.deepEqual(data.map(x=>x.id),['da','a1','a2']);
 let techDivider=w.find(w.ui,'pc-tech-divider-technique'),techList=w.find(w.ui,'pc-technique-list'),techFirst=w.findAll(techList,'pc-tech-item')[0];
 w.fire(techDivider.children[0],'dragstart',{dataTransfer:transfer});w.fire(techFirst,'drop',{dataTransfer:transfer});
 assert.deepEqual(data[1].techniques.map(x=>x.id),['dt','t1','t2']);
 assert.equal(data[1].techniques[0].nom,'Groupe');assert.equal(data[1].techniques[2].rangs[0].id,'r2');
});
test('persistance : la munition zéro et les nouveaux contenus restent identiques après synchronisation',()=>{const before=M.blank();before.inv.objets=[weapon(),ammo()];const attrs=C.Compact.encode(before),session=new C.Compact.Session(attrs,before),w=attackContext(before.inv.objets);w.ctx.envoieAttaqueSimple({munition:'ammo'},before.inv.objets[0],def());session.capture(before);attrs.owd_ops_test={current:JSON.stringify({epoch:session.epoch,ops:Object.values(session.outgoing())})};const saved=C.Compact.read(attrs).state;assert.equal(saved.inv.objets.find(o=>o.ref==='ammo').qte,0);assert.deepEqual(saved.inv.objets.find(o=>o.ref==='ammo').munitionStats,before.inv.objets[1].munitionStats);});
test('imprégnation : pourcentage élémentaire indépendant du multiplicateur et des MOD',()=>{const it=weapon();it.arme.degats=100;it.arme.modsDegats=['Force'];it.arme.repartition={physique:80,feu:20};const w=attackContext([it]);w.ctx.state.combatOptions.attaques.impregnation='fire-imbue';assert.equal(w.ctx.brutCoup(it,{mult:1.2}),124);assert.equal(w.ctx.degatsTypes(w.ctx.brutCoup(it,{mult:1.2}),'physique',false,it), '99 physique + 38 feu');assert.equal(w.ctx.degatsTypes(w.ctx.brutCoup(it,{mult:1.2}),'physique',true,it), '49 physique + 19 feu');});
test('imprégnation : ×0.8 ne diminue pas le +20% élémentaire ; ciblage remplacé',()=>{const it=weapon();it.arme.degats=100;const w=attackContext([it]);w.ctx.state.combatOptions.attaques.impregnation='greater-decay-imbue';w.ctx.effetsSources=()=>[{d:{ops:{impregnation:{pct:10,flat:4,type:'feu'}}},e:{cible:'w'}}];assert.equal(w.ctx.brutCoup(it,{mult:.8}),80);assert.equal(w.ctx.degatsTypes(80,'physique',false,it),'80 physique + 35 decomposition');w.ctx.state.combatOptions.attaques.impregnation='';assert.equal(w.ctx.degatsTypes(80,'physique',false,it),'80 physique + 14 feu');});
test('imprégnation : bonus élémentaires avant flat, choix neutre et identifiant inconnu',()=>{const it=weapon(),w=attackContext([it]);w.ctx.state.combatOptions.attaques.impregnation='fire-imbue';w.ctx.effetBonus=()=>100;assert.equal(w.ctx.degatsTypes(w.ctx.brutArme(it),'physique',false,it),'20 physique + 6 feu');for(const id of ['poison-imbue','wind-imbue','unknown','']){w.ctx.state.combatOptions.attaques.impregnation=id;assert.equal(w.ctx.brutCoup(it,{mult:.8}),8);it.arme.degats=7;it.arme.repartition={physique:95,feu:5};w.ctx.effetBonus=()=>0;assert.equal(w.ctx.degatsTypes(w.ctx.brutCoup(it,{mult:1.4}),'physique',false,it),'8 physique');it.arme.degats=10;}});
test('imprégnation : +20 % de 100 feu distinct des 100 physiques, en touche et passage',()=>{const it=weapon();it.arme.degats=100;const w=attackContext([it]);w.ctx.state.combatOptions.attaques.impregnation='greater-decay-imbue';assert.equal(w.ctx.degatsTypes(w.ctx.brutCoup(it,{mult:1}),'physique',false,it),'100 physique + 35 decomposition');assert.equal(w.ctx.degatsTypes(w.ctx.brutCoup(it,{mult:1.4}),'physique',false,it),'140 physique + 35 decomposition');assert.equal(w.ctx.degatsTypes(w.ctx.brutCoup(it,{mult:1.4}),'physique',true,it),'70 physique + 17 decomposition');w.ctx.state.combatOptions.attaques.lente=true;assert.equal(w.ctx.degatsTypes(w.ctx.brutCoup(it,{mult:1.4}),'physique',false,it),'70 physique + 17 decomposition');assert.equal(w.ctx.degatsTypes(w.ctx.brutCoup(it,{mult:1.4}),'physique',true,it),'35 physique + 8 decomposition');});
test('imprégnation : 100 dégâts répartis 70/30 et +20 % feu sans dégâts fixes',()=>{const it=weapon();it.arme.degats=100;it.arme.repartition={physique:70,ethere:30};const w=attackContext([it]);w.ctx.D=()=>({impregnations:[{id:'test-fire',type:'feu',pct:20,flat:0}]});w.ctx.state.combatOptions.attaques.impregnation='test-fire';assert.equal(w.ctx.degatsTypes(w.ctx.brutCoup(it,{mult:1}),'physique',false,it),'70 physique + 30 ethere + 20 feu');assert.equal(w.ctx.degatsTypes(w.ctx.brutCoup(it,{mult:1.2}),'physique',false,it),'84 physique + 36 ethere + 20 feu');});
test('imprégnation : synchronisée dans le bloc combat existant',()=>{const before=M.blank(),after=C.copy(before);after.combatOptions.attaques.impregnation='infuse-mana';const attrs=C.Compact.encode(after),saved=C.Compact.read(attrs).state;assert.equal(saved.combatOptions.attaques.impregnation,'infuse-mana');assert.equal(Object.keys(attrs).length,Object.keys(C.Compact.encode(before)).length);});
console.log(n+' scénarios Techniques, consommation et munitions validés.');
