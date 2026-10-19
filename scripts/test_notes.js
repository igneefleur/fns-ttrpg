'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
let count=0;function test(n,f){f();console.log('OK '+n);count++;}
function node(tag,attrs={}){
 const classes=new Set(),values={},priorities={};return {tagName:tag.toUpperCase(),attrs:{...attrs},dataset:{},children:[],listeners:{},textContent:'',hidden:false,
 classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle(c,on){if(on)classes.add(c);else classes.delete(c);}},
 style:{getPropertyValue:k=>values[k]||'',getPropertyPriority:k=>priorities[k]||'',setProperty(k,v,p){values[k]=v;priorities[k]=p||'';},removeProperty(k){delete values[k];delete priorities[k];}},
 getAttribute(k){return this.attrs[k]??null;},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},
 appendChild(n){this.children.push(n);n.parentNode=this;return n;},contains(n){return this===n||this.children.some(c=>c.contains(n));},
 addEventListener(k,fn){this.listeners[k]=fn;},getBoundingClientRect(){return {top:0,bottom:40};}};
}
for(const mode of ['stable','beta'])test('barre Notes '+mode+' : masquage, retour natif et réouverture sans recréer le cadre',()=>{
 const src=read('extension/firefox/'+mode+'/content-roll20.js'),start=src.indexOf('  var notesSidebar ='),end=src.indexOf('  // La barre latérale ENTIÈRE',start);
 const chat=node('div'),settings=node('div'),tab=node('li'),link=node('a'),chatTab=node('li'),chatLink=node('a',{href:'#textchat','aria-selected':'true'}),settingsTab=node('li'),settingsLink=node('a',{href:'#mysettings','aria-selected':'false'});
 tab.appendChild(link);chatTab.appendChild(chatLink);settingsTab.appendChild(settingsLink);chatTab.classList.add('active');chat.style.setProperty('display','block');settings.style.setProperty('display','none');
 const sidebar=node('div'),nav=node('ul'),panel=node('div');sidebar.appendChild(chat);sidebar.appendChild(settings);sidebar.appendChild(panel);nav.appendChild(chatTab);nav.appendChild(tab);nav.appendChild(settingsTab);sidebar.appendChild(nav);
 sidebar.querySelector=()=>null;nav.querySelectorAll=s=>s.startsWith('a[')?[chatLink,link,settingsLink]:[chatTab,chatLink,tab,link,settingsTab,settingsLink];
 const ctx={document:{getElementById:id=>({textchat:chat,mysettings:settings}[id])},window:{},MODE:mode,browser:{runtime:{getURL:p=>'extension://'+p}},nuitEffective:()=>false,el:(t,c)=>Object.assign(node(t),{className:c})};vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
 ctx.notesSidebar={sidebar,nav,tab,link,panel,active:false,frame:null,saved:[],selection:[]};ctx.notesOuvre();
 const frame=ctx.notesSidebar.frame;assert.ok(frame.src.includes('p=roll20-notes.html'));assert.ok(frame.src.endsWith('&m='+mode));assert.equal(panel.hidden,false);assert.equal(panel.style.display,'flex');assert.equal(chat.style.getPropertyValue('display'),'none');assert.equal(link.getAttribute('aria-selected'),'true');
 ctx.notesFerme();assert.equal(chat.style.getPropertyValue('display'),'block');assert.equal(settings.style.getPropertyValue('display'),'none');assert.equal(chatLink.getAttribute('aria-selected'),'true');assert.equal(panel.hidden,true);
 // Roll20 peut avoir masqué aussi le panneau ajouté : l'ouverture le réaffiche.
 panel.style.display='none';ctx.notesOuvre();assert.equal(panel.style.display,'flex');assert.equal(ctx.notesSidebar.frame,frame);ctx.notesFerme();assert.equal(ctx.notesSidebar.frame,frame);
});
test('amorce : Notes isolées et jamais destinataires des objets Prendre',()=>{
 const s=read('docs/javascripts/owd-roll20-boot.js');
 for(const view of ['notes','attaques','defenses','inventaire','']){
  const sent=[],parentSent=[],events={};const w={top:{postMessage:d=>sent.push(d)},parent:{postMessage:d=>parentSent.push(d)},addEventListener:(k,fn)=>events[k]=fn};
  const ctx={window:w,document:{documentElement:{classList:{toggle(){}}}},location:{hash:'#c=a&view='+view},CHAR_ID:'a',Date};vm.createContext(ctx);
  vm.runInContext(s.slice(s.indexOf('  window.__owdVueAttaques ='),s.indexOf('  var objetDrag =')),ctx);
  vm.runInContext(s.slice(s.indexOf('  var takeOpenedAt ='),s.indexOf('  // ---------- mode jour / nuit')),ctx);
  ctx.post({type:'load'});assert.equal(w.__owdVueNotes,view==='notes');assert.equal(sent[0].inventory,!!view||undefined);
  if(view==='notes'||view==='attaques'||view==='defenses'){assert.equal('takeEnabled' in sent[0],false);assert.equal(parentSent.length,0);events.message({source:w.parent,data:{ns:'owd',type:'take-active',active:true}});assert.equal(sent.length,1);}
  else {assert.equal(parentSent[0].type,'take-ready');}
 }
});
test('vue Notes : montage du seul module existant, sans nouvelle donnée de personnage',()=>{
 const src=read('src/fiche/socle/320-montage.js');assert.ok(src.includes('onlyModule: window.__owdVueNotes ? "notes"'));
 assert.ok(read('docs/roll20-notes.html').includes('data-view="notes"'));
 const manager=read('docs/javascripts/owd-inventaire.js');assert.ok(manager.includes("inventory=kind==='inventaire'"));assert.ok(manager.includes("job=inventory?JSON.parse"));assert.ok(manager.includes("if(inventory&&d.type==='take-ready')"));
});
const hashes={
  "notes": "6cf5e93a27a71f457a739024ed5cbfa52f28568517798671f64d34fced86657e",
  "defenses": "ae14ef9d479cb1ec824935f4ef930e9c77b408e26d2d3a17657599158354ab60",
  "boutique": "830a12dda0ade52bb786c667248755d292130f99ccd5d489d8c244c4b1079fc5"
};
for(const [id,expected] of Object.entries(hashes))test('icône '+id+' : source fournie conservée à l’octet près',()=>{
 const svg=read('extension/firefox/icons/owd-'+id+'.svg'),source=Buffer.from(/base64,([^\"]+)/.exec(svg)[1],'base64');assert.equal(crypto.createHash('sha256').update(source).digest('hex'),expected);assert.ok(svg.includes('feColorMatrix'));assert.ok(!svg.includes('<path'));
});
console.log(count+' scénarios Notes et icônes validés.');
