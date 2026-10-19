'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const C = require('../docs/javascripts/owd-sync.js'), M = require('../docs/javascripts/owd-attr-map.js');
let count = 0;
function test(name, fn) { fn(); console.log('OK ' + name); count++; }
function fixture() {
  const state = M.blank();
  state.comps = [{id:'a',nom:'Alpha',groupe:'Nature',rang:1},{id:'b',nom:'Beta',groupe:'Nature',rang:0},
    {id:'c',nom:'Gamma',groupe:'Combat',rang:2},{id:'d',nom:'Delta',groupe:'Combat',rang:0}];
  let editing = true, saves = 0;
  function el(tag, cls, text) {
    const n = {tag,className:cls||'',textContent:text||'',dataset:{},children:[],listeners:{},attrs:{},value:'',hidden:false,
      setAttribute(k,v){this.attrs[k]=v;},appendChild(c){this.children.push(c);c.parentNode=this; if(this.tag==='select'&&this.children.length===1)this.value=c.value;return c;},
      addEventListener(k,f){this.listeners[k]=f;},focus(){},getBoundingClientRect(){return {top:0,height:20};},
      contains(c){return c===this||this.children.some(x=>x.contains(c));},closest(q){return this.tag===q?this:this.parentNode?.closest(q);},
      querySelectorAll(q){return walk(this).filter(x=>q.split(', ').some(c=>x.className.split(' ').includes(c.slice(1))));}};
    n.classList={add(c){n.className+=' '+c;},remove(c){n.className=n.className.split(' ').filter(x=>x!==c).join(' ');},toggle(c,on){this.remove(c);if(on)this.add(c);}};
    Object.defineProperty(n,'innerHTML',{set(){n.children=[];}});return n;
  }
  const ctx={state,el,compHooks:[],isEdit:()=>editing,save(){saves++;},refresh(){},lpref:(_,d)=>d,pli:s=>String(s||'').toLowerCase(),
    compGroupe:c=>c.groupe||'',compInvestie:c=>c.rang>0,rangs:()=>Array.from({length:6},(_,i)=>({nom:String(i)})),rangInitiale:r=>r.nom,rangTitre:()=>'',
    capFirst:s=>s.charAt(0).toUpperCase()+s.slice(1),uid:()=> 'new',flash(){},miniBtn:(text,title,fn)=>{const n=el('button','',text);n.addEventListener('click',fn);return n;},optCompsRebuild(){}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/fiche/fiche/comps.js','utf8'),ctx);ctx.compBox=el('div');ctx.rebuildComps();
  return {ctx,state,el,get saves(){return saves;},edit(v){editing=v;},rebuild(){ctx.rebuildComps();},find(cls){return walk(ctx.compBox).filter(n=>n.className.split(' ').includes(cls));},group(g){return this.find('pc-comp-groupe').find(n=>n.dataset.groupe===g);}};
}
function walk(n){return [n,...n.children.flatMap(walk)];}
function event(n,y=1){return {target:n,clientY:y,preventDefault(){},stopPropagation(){},dataTransfer:{setData(){},effectAllowed:'',dropEffect:''}};}
function drag(w,source,target,y=1){source.listeners.dragstart(event(source));target.listeners.dragover(event(target,y));target.listeners.drop(event(target,y));}
function ids(w){return Array.from(w.state.comps,c=>c.id);}
test('un seul en-tête, commandes avant le nom et juste avant N',()=>{const w=fixture();assert.equal(w.find('head').length,1);const row=w.find('pc-comp-row').find(n=>n.dataset.id==='a');assert.match(row.children[0].children[0].className,/pc-comp-drag/);assert.match(row.children[1].children[0].className,/pc-comp-del/);assert.match(row.children[1].children[1].className,/pc-stadebar/);assert.equal(row.draggable,undefined);});
test('repli par triangle et double-clic, sans changer la sauvegarde',()=>{const w=fixture();const b=w.find('pc-comp-repli')[0];b.listeners.click(event(b));assert.equal(w.group('Nature').children.length,1);assert.equal(w.find('pc-comp-repli')[0].attrs['aria-expanded'],'false');const t=w.group('Nature').children[0];t.listeners.dblclick(event(t));assert.equal(w.group('Nature').children.length,3);assert.equal(w.saves,0);});
test('déplacer une compétence dans un autre groupe conserve identité et rang',()=>{const w=fixture(),a=w.find('pc-comp-row').find(n=>n.dataset.id==='a'),c=w.find('pc-comp-row').find(n=>n.dataset.id==='c');drag(w,a.children[0].children[0],c);assert.deepEqual(ids(w),['b','a','c','d']);assert.equal(w.state.comps[1].groupe,'Combat');assert.equal(w.state.comps[1].rang,1);});
test('réordonner après une ligne dans le même groupe',()=>{const w=fixture();w.ctx.deplaceComp('a','b',false);assert.deepEqual(ids(w),['b','a','c','d']);});
test('dépôt sur groupe replié et disparition du dernier ancien groupe',()=>{const w=fixture();w.ctx.compReplies.Combat=true;w.rebuild();for(const id of ['a','b']){const row=w.find('pc-comp-row').find(n=>n.dataset.id===id);drag(w,row.children[0].children[0],w.group('Combat').children[0]);}assert.equal(w.group('Nature'),undefined);assert.equal(w.group('Combat').children.length,1);assert.deepEqual(ids(w),['c','d','a','b']);});
test('déplacer un groupe filtré inclut ses compétences masquées',()=>{const w=fixture();w.ctx.compOnly=true;w.rebuild();drag(w,w.group('Combat').children[0].children[0],w.group('Nature').children[0]);assert.deepEqual(ids(w),['c','d','a','b']);});
test('dépôt sans groupe, puis dépôt vers ce groupe',()=>{const w=fixture();let a=w.find('pc-comp-row').find(n=>n.dataset.id==='a');drag(w,a.children[0].children[0],w.find('pc-comp-sans-groupe')[0]);assert.equal(w.state.comps.find(c=>c.id==='a').groupe,'');w.ctx.compVersGroupe('b','');assert.deepEqual(w.state.comps.filter(c=>!c.groupe).map(c=>c.id),['a','b']);});
test('création dans groupe existant ou nouveau, y compris nom spécial',()=>{const w=fixture();let add=w.find('pc-comp-add')[0];add.children[0].value='epsilon';add.children[1].value='g1';add.children.at(-1).listeners.click();assert.equal(w.state.comps.at(-1).groupe,'Combat');w.state.comps.pop();w.rebuild();add=w.find('pc-comp-add')[0];add.children[0].value='zeta';add.children[1].value='nouveau';add.children[1].listeners.change();assert.equal(add.children[2].hidden,false);add.children[2].value='__proto__';add.children.at(-1).listeners.click();assert.equal(w.state.comps.at(-1).groupe,'__proto__');assert.ok(w.group('__proto__'));});
test('édition désactivée et glissement externe ne modifient rien',()=>{const w=fixture(),before=JSON.stringify(w.state);w.edit(false);let h=w.find('pc-comp-drag')[0];h.listeners.dragstart(event(h));assert.equal(w.ctx.dragComp,null);const t=w.group('Combat').children[0];t.listeners.drop(event(t));assert.equal(JSON.stringify(w.state),before);});
test('sauvegarde partagée : ordre des groupes, rangs et affectation survivent à la réouverture',()=>{const w=fixture(),before=C.copy(w.state);w.ctx.deplaceGroupe('Combat','Nature',true);w.ctx.deplaceComp('a','c',false);const attrs=C.Compact.encode(before),session=new C.Compact.Session(attrs,before);session.capture(w.state);attrs.owd_ops_test={current:JSON.stringify({epoch:session.epoch,ops:Object.values(session.outgoing())})};assert.deepEqual(C.Compact.read(attrs).state.comps,JSON.parse(JSON.stringify(w.state.comps)));});
console.log(count+' scénarios de groupes de compétences validés.');
