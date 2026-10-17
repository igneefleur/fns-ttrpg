'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),ext=path.join(root,'extension/firefox');
const sources=['stable','beta'].map(mode=>fs.readFileSync(path.join(ext,mode,'content-roll20.js'),'utf8'));
const ids=['monde','inventaire','attaques','defenses','boutique'];
const keys={monde:'owdPanneauActif',inventaire:'owdOutilInventaireActif',attaques:'owdOutilAttaquesActif',defenses:'owdOutilDefensesActif',boutique:'owdOutilBoutiqueActif'};
const popupHtml=fs.readFileSync(path.join(ext,'popup/popup.html'),'utf8');
const popupJs=fs.readFileSync(path.join(ext,'popup/popup.js'),'utf8');
let lastIndex=-1;
for(const id of ['p-panneau','p-boutique','p-inventaire','p-attaques','p-defenses','p-beta']){
 const i=popupHtml.indexOf('id="'+id+'"');assert(i>lastIndex,'Ordre interrupteur : '+id);lastIndex=i;
}
for(const old of ['p-pan-replacer','Ancrer ou détacher','head.appendChild(p.anchor)','head.appendChild(p.minimize)']){
 assert(!popupHtml.includes(old),'Ancien contrôle dans popup : '+old);
 for(const src of sources)assert(!src.includes(old),'Ancien contrôle dans script : '+old);
}
assert(popupHtml.includes('class="p-separation"'));
for(const [i,mode] of ['stable','beta'].entries()){
 const src=sources[i];
 for(const id of ids){assert(src.includes("id:'"+id+"'"),'Manque outil '+id+' '+mode);assert(src.includes("'"+keys[id]+"'"),'Clé '+id+' absente '+mode);}
 assert(src.includes("head.addEventListener('dblclick'"));
 assert(src.includes("head.addEventListener('keydown'"));
 assert(src.includes('if(r[CLES_OUTILS[d.id]]===false)return;'));
 assert(src.includes('function basculeRepli(p)'));
 assert(!src.includes('p.etat.ancre'),'Ancrage persistant dans '+mode);
 // Runtime exercise of the actual panel functions; deliberately no fake DnD code.
 const slice=src.slice(src.indexOf('  var IS_EDITEUR ='),src.indexOf('  var OUTIL_ICONS='));
 class FakeEl {
   constructor(tag,cls,txt){this.tagName=tag;this.className=cls||'';this.textContent=txt||'';this.children=[];this.listeners={};this.style={};this.attrs={};this.classList={add:()=>{},remove:()=>{},toggle:()=>{}};this.hidden=false;}
   appendChild(n){this.children.push(n);return n;}
   setAttribute(k,v){this.attrs[k]=v;}
   addEventListener(k,fn){(this.listeners[k]||(this.listeners[k]=[])).push(fn);}
   removeEventListener(k,fn){this.listeners[k]=(this.listeners[k]||[]).filter(f=>f!==fn);}
   closest(s){return s==='button'&&this.tagName==='button'?this:null;}
   get(){return this.children;}
 }
 const appended=[],saved=[];
 const doc={body:{appendChild(n){appended.push(n);}},getElementById(){return null;},querySelector(){return null;}};
 const context={IS_TOP:true,IS_POPOUT:false,location:{pathname:'/editor'},document:doc,window:{innerWidth:1600,innerHeight:900,addEventListener(){},removeEventListener(){}},MODE:mode,
   browser:{storage:{local:{set(o){saved.push(o)}}}},nuitEffective:()=>false,
   el:(t,c,v)=>new FakeEl(t,c,v),poseNuit:n=>n,
   clearTimeout,setTimeout(fn,ms){return 1;}};
 vm.createContext(context);vm.runInContext(slice,context);
 for(const id of ids){
   const d=context.OUTILS.find(o=>o.id===id),p={def:d,etat:{ouvert:false,x:100,y:110,w:d.w,h:d.h,replie:false,tailleChoisie:false}};
   context.monte(p);
   assert.equal(p.box.children.length,3);
   const head=p.box.children[0];assert.equal(head.children.length,2,'Titre et fermeture seulement '+id);
   assert.equal(head.children[0].textContent,d.titre);
   assert.equal(head.children[1].textContent,'×');
   assert.equal(p.box.style.height,d.h+'px');
   const span=head.children[0];
   const dbl={target:span,preventDefault(){},stopPropagation(){}};
   head.listeners.dblclick[0](dbl);assert(p.etat.replie,id+' doit se replier');assert.equal(p.box.style.height,'28px');
   head.listeners.dblclick[0](dbl);assert(!p.etat.replie,id+' doit se déplier');assert.equal(p.box.style.height,d.h+'px');
   // No accidental collapse on the close button.
   head.listeners.dblclick[0]({...dbl,target:head.children[1]});assert(!p.etat.replie);
   const kb={target:head,key:'Enter',preventDefault(){}};head.listeners.keydown[0](kb);assert(p.etat.replie);head.listeners.keydown[0](kb);assert(!p.etat.replie);
   const start={target:span,button:0,clientX:100,clientY:120,currentTarget:head,pointerId:1};
   head.listeners.pointerdown[0](start);
   assert.equal(p.etat.x,100);
   head.listeners.pointermove[0]({clientX:102,clientY:120});assert.equal(p.etat.x,100,'Un clic ne doit pas déplacer la fenêtre');
   head.listeners.pointermove[0]({clientX:135,clientY:150});assert.equal(p.etat.x,135);assert.equal(p.etat.y,140);
   head.listeners.pointerup[0]({});
   // The geometry survives collapsing.
   head.listeners.dblclick[0](dbl);head.listeners.dblclick[0](dbl);assert.equal(p.box.style.left,'135px');assert.equal(p.box.style.width,d.w+'px');
 }
 // Disabled tool must not mount; old saves with ancre:true become floating.
 const testPan=src.slice(src.indexOf('  var CLES_OUTILS='),src.indexOf('  function panRepeint()'));
 const fakePanels=[];
 const cc={OUTILS:context.OUTILS,outils:{},CLES_OUTILS:null,
  browser:{storage:{local:{get(){return Promise.resolve({owdPanneauActif:false,owdOutilDefensesActif:false,'owdPanneau:roll20-attaques.html':{ouvert:true,ancre:true,x:271,y:123,w:700,h:710}})}}}},
  monte:p=>fakePanels.push(p),barrePose:()=>{},MutationObserver:class{observe(){}},document:{body:{}},window:{addEventListener(){}},setTimeout(){}};
 // Promises resolved via a setImmediate after vm; source itself statically tested here.
 vm.runInNewContext(testPan,cc);
 cc.panDemarre();
 setImmediate(()=>{
   assert.equal(fakePanels.length,3,'Deux outils désactivés seulement');
   const attack=fakePanels.find(p=>p.def.id==='attaques');assert(attack);
   assert.equal(attack.etat.x,271);assert.equal(attack.etat.y,123);assert.equal(attack.etat.h,710);
   assert(!('ancre' in attack.etat));
 });
}
// Each checkbox must write only its own storage key and preserve early clicks.
for(const id of ['boutique','inventaire','attaques','defenses']){
 assert(popupJs.includes("elsOutils[id].addEventListener('click'"));
 assert(popupJs.includes("etat.outils[id]=!etat.outils[id]"));
}
console.log('OK récupération : cinq outils + réglages individuels, ancien ancrage supprimé, double-clic et clavier, déplacement, repli sans perte de géométrie, stable et beta.');

// Test des interrupteurs du vrai script de popup avec un DOM minimal.
(async function verifiePopup(){
  class E{
    constructor(id){this.id=id;this.attrs={};this.handlers={};this.disabled=false;this.hidden=false;this.textContent='';this.classList={toggle(){}};this.tabIndex=0;this.children=[];}
    addEventListener(k,f){(this.handlers[k]||(this.handlers[k]=[])).push(f);}
    setAttribute(k,v){this.attrs[k]=String(v);}
    getAttribute(k){return this.attrs[k]||'';}
    querySelector(k){return new E(this.id+'-'+k);}
    querySelectorAll(k){return k==='.seg'?['auto','jour','nuit'].map(v=>{const n=new E('seg-'+v);n.setAttribute('data-v',v);return n;}):[];}
    click(){for(const f of (this.handlers.click||[]))f.call(this,{preventDefault(){}});}
    focus(){}
  }
  const els={};for(const id of Array.from(popupHtml.matchAll(/id="([a-z][a-z0-9-]+)"/g),a=>a[1]))els[id]=new E(id);
  const saved=[];
  const browser={runtime:{getManifest(){return{version:'1.12.0'}}},storage:{local:{get(){return Promise.resolve({owdPanneauActif:false,owdOutilBoutiqueActif:false});},set(v){saved.push(v);return Promise.resolve();}}},tabs:{reload(){return Promise.resolve();}}};
  const context={browser,document:{body:new E('body'),documentElement:new E('html'),readyState:'complete',getElementById(id){if(!els[id])throw Error('missing popup ID '+id);return els[id];}},
    window:{matchMedia:()=>({matches:false,addEventListener(){}}),close(){}},localStorage:{getItem(){return null;},setItem(){}},
    fetch:()=>Promise.resolve({ok:false,json:()=>Promise.resolve(null)}),AbortController:class{abort(){}},setTimeout(){return 1;},clearTimeout(){},console};
  vm.runInNewContext(popupJs,context);await new Promise(r=>setImmediate(r));
  assert.equal(els['p-panneau'].attrs['aria-checked'],'false','Monde historique désactivé respecté');
  assert.equal(els['p-boutique'].attrs['aria-checked'],'false','Boutique désactivée respectée');
  assert.equal(els['p-defenses'].attrs['aria-checked'],'true','Défenses active par défaut');
  for(const id of ['boutique','inventaire','attaques','defenses']){
    const control=els['p-'+id],before=control.attrs['aria-checked'];control.click();
    assert.notEqual(control.attrs['aria-checked'],before,id+' ne bascule pas');
    assert(Object.hasOwn(saved.at(-1),'owdOutil'+id.charAt(0).toUpperCase()+id.slice(1)+'Actif'),'Écriture stockage '+id);
  }
  assert.equal(els['p-recharge'].hidden,false,'Nouvelle configuration doit proposer rechargement');
  assert(!('p-pan-replacer' in els));
  console.log('OK popup réel : paramètres sauvegardés individuellement, états anciens respectés, rechargement proposé.');
})().catch(e=>{console.error(e);process.exitCode=1;});
