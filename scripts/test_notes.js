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
 const input=node('div'),sidebar=node('div'),nav=node('ul'),panel=node('div');
 sidebar.getBoundingClientRect=()=>({left:780,top:10,width:420,bottom:750});nav.getBoundingClientRect=()=>({bottom:45});
 settingsTab.getBoundingClientRect=()=>({width:36,height:35});settingsLink.getBoundingClientRect=()=>({width:34,height:35});sidebar.appendChild(chat);sidebar.appendChild(settings);sidebar.appendChild(panel);nav.appendChild(chatTab);nav.appendChild(tab);nav.appendChild(settingsTab);sidebar.appendChild(nav);
 sidebar.querySelector=()=>null;nav.querySelectorAll=s=>s.startsWith('a[')?[chatLink,link,settingsLink]:[chatTab,chatLink,tab,link,settingsTab,settingsLink];
 const ctx={document:{getElementById:id=>({textchat:chat,mysettings:settings,'textchat-input':input}[id])},window:{},MODE:mode,browser:{runtime:{getURL:p=>'extension://'+p}},nuitEffective:()=>false,el:(t,c)=>Object.assign(node(t),{className:c})};vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
 ctx.notesSidebar={sidebar,nav,tab,link,panel,model:settingsTab,modelLink:settingsLink,active:false,frame:null,saved:[],selection:[]};ctx.notesOuvre();
 assert.equal(tab.style.width,'36px');assert.equal(tab.style.height,'35px');assert.equal(link.style.height,'35px');
 assert.equal(panel.style.top,'45px');assert.equal(panel.style.left,'780px');assert.equal(panel.style.width,'420px');
 assert.equal(input.style.getPropertyValue('display'),'none','saisie hors de la barre masquée');
 const frame=ctx.notesSidebar.frame;assert.ok(frame.src.includes('p=roll20-notes.html'));assert.ok(frame.src.endsWith('&m='+mode));assert.equal(panel.hidden,false);assert.equal(panel.style.display,'flex');assert.equal(chat.style.getPropertyValue('display'),'none');assert.equal(link.getAttribute('aria-selected'),'true');
 ctx.notesFerme();assert.equal(input.style.getPropertyValue('display'),'');assert.equal(chat.style.getPropertyValue('display'),'block');assert.equal(settings.style.getPropertyValue('display'),'none');assert.equal(chatLink.getAttribute('aria-selected'),'true');assert.equal(panel.hidden,true);
 // Roll20 peut avoir masqué aussi le panneau ajouté : l'ouverture le réaffiche.
 panel.style.display='none';ctx.notesOuvre();assert.equal(panel.style.display,'flex');assert.equal(ctx.notesSidebar.frame,frame);ctx.notesFerme();assert.equal(ctx.notesSidebar.frame,frame);
});
test('amorce : Notes isolées et jamais destinataires des objets Prendre',()=>{
 const s=read('docs/javascripts/owd-roll20-boot.js');
 for(const view of ['notes','attaques','defenses','inventaire','']){
  const sent=[],parentSent=[],events={};const w={top:{postMessage:d=>sent.push(d)},parent:{postMessage:d=>parentSent.push(d)},addEventListener:(k,fn)=>events[k]=fn};
  const ctx={gele:false,wireRevision:null,wireAttrs:null,edition:true,window:w,document:{documentElement:{classList:{toggle(){}}}},location:{hash:'#c=a&view='+view},VIEW_ID:'test-view',CHAR_ID:'a',Date};vm.createContext(ctx);
  vm.runInContext(s.slice(s.indexOf('  window.__owdVueAttaques ='),s.indexOf('  var objetDrag =')),ctx);
  vm.runInContext(s.slice(s.indexOf('  var takeOpenedAt ='),s.indexOf('  // ---------- mode jour / nuit')),ctx);
  ctx.post({type:'load'});assert.equal('defendEnabled' in sent[0],view!=='notes'&&view!=='attaques');assert.equal(w.__owdVueNotes,view==='notes');assert.equal(sent[0].inventory,!!view||undefined);
  if(view==='notes'||view==='attaques'||view==='defenses'){assert.equal('takeEnabled' in sent[0],false);assert.equal(parentSent.length,view==='defenses'?1:0);events.message({source:w.parent,data:{ns:'owd',type:'take-active',active:true}});assert.equal(sent.length,1);}
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

test('panneau Notes : superposition indépendante de la hauteur du chat',()=>{
 const css=read('extension/firefox/overlay.css');assert.match(css,/\.owd-sidebar-notes \{ position:fixed; bottom:0; z-index:10500;/);
 for(const mode of ['stable','beta'])assert.ok(read('extension/firefox/'+mode+'/content-roll20.js').includes('document.body.appendChild(p.panel)'));
});


const C=require('../docs/javascripts/owd-sync.js'),M=require('../docs/javascripts/owd-attr-map.js'),Migr=require('../docs/javascripts/owd-migrations.js');
const notesContext=vm.createContext({window:{markdownit:require('../src/fiche/vendor/markdown-it.min.js')}});
vm.runInContext(read('src/fiche/bio/notes.js'),notesContext);
function message(id,text='Texte',mode='plain'){return {id,at:1700000000000,text,mode};}
test('migration : ancien texte intégral en Brut, identifiant stable et aucune date inventée',()=>{
 const s=M.blank();s.v=17;s.notes='**ancien**\n\n<img src="x">\n  fin  ';
 const r=Migr.appliquer(s,17,18);assert.equal(r.ok,true);assert.deepEqual(r.state.notes,{format:1,messages:[{id:'legacy',at:0,text:s.notes,mode:'plain'}]});
 assert.deepEqual(Migr.appliquer(r.state,18,18).state.notes,r.state.notes);
 s.notes='';assert.deepEqual(Migr.appliquer(s,17,18).state.notes.messages,[]);
});
test('descente puis remontée : messages, identifiants et formats récupérés sans perte',()=>{
 const s=M.blank();s.notes.messages=[message('a','**texte**','markdown'),message('b','<br>','plain')];
 const down=Migr.appliquer(s,18,17);assert.equal(down.ok,true);assert.equal(down.state.notes,'**texte**\n\n<br>');
 assert.deepEqual(Migr.appliquer(down.state,17,18).state.notes,s.notes);
});
test('un seul attribut Notes, même avec 2000 messages ; export et repli préservés',()=>{
 const s=M.blank();s.notes.messages=Array.from({length:2000},(_,i)=>message('n'+i,'note '+i));
 const attrs=C.Compact.encode(s);assert.deepEqual(Object.keys(attrs).filter(k=>/notes/.test(k)),['owd_block_notes']);assert.deepEqual(C.Compact.read(attrs).state.notes,s.notes);
 const legacy=M.stateToAttrs(s);delete legacy.owd_state;assert.deepEqual(M.attrsToState(legacy).state.notes,s.notes);
 legacy.owd_notes={current:'{"texte":"ancien JSON littéral"}'};assert.equal(M.attrsToState(legacy).state.notes,legacy.owd_notes.current);
 legacy.owd_version.current='17';legacy.owd_notes.current='{"format":1,"messages":[]}';assert.equal(M.attrsToState(legacy).state.notes,legacy.owd_notes.current);
});
function notesWorld(initial){const s=M.blank();s.notes.messages=initial||[];const attrs=C.Compact.encode(s),a=new C.Compact.Session(attrs,s,()=>1,{id:'a'}),b=new C.Compact.Session(attrs,s,()=>1,{id:'b'});return {attrs,a,b,write(client,fn){const local=C.rebuild(client.local);fn(local.notes.messages);client.capture(local);attrs['owd_ops_'+client.id]={current:JSON.stringify({epoch:client.epoch,ops:Object.values(client.pending)})};},read(){return C.Compact.read(attrs);}};}
test('deux ajouts simultanés dans le même bloc : aucun écrasement',()=>{
 const w=notesWorld();w.write(w.a,m=>m.push(message('a')));w.write(w.b,m=>m.push(message('b')));assert.deepEqual(w.read().state.notes.messages.map(m=>m.id),['a','b']);assert.equal(w.read().conflicts.length,0);
});
test('modifier des messages distincts, supprimer pendant une édition et détecter un conflit',()=>{
 const w=notesWorld([message('a'),message('b')]);w.write(w.a,m=>m[0].text='A');w.write(w.b,m=>m[1].text='B');assert.deepEqual(w.read().state.notes.messages.map(m=>m.text),['A','B']);assert.equal(w.read().conflicts.length,0);
 const d=notesWorld([message('a')]);d.write(d.a,m=>m.splice(0,1));d.write(d.b,m=>m[0].text='Edition');assert.deepEqual(d.read().state.notes.messages,[]);
 const clash=notesWorld([message('a')]);clash.write(clash.a,m=>m[0].text='A');clash.write(clash.b,m=>m[0].text='B');assert.ok(clash.read().conflicts.length);
});
test('recherche Markdown : contenu textuel sans casse, accents ni syntaxe',()=>{
 const plain=notesContext.notesPlie(notesContext.notesTexteRecherche(message('a','Une **grande** porte à **Bérg**. ![Carte secrète](https://example.org/carte.png)','markdown')));
 assert.ok(plain.includes('une grande porte a berg'));assert.ok(plain.includes('carte secrete'));
 assert.equal(notesContext.notesTexteRecherche(message('b','**brut**')),'**brut**');
});
test('notes inconnues conservées pour export ; refus explicite dans le module',()=>{
 const unknown={format:2,future:'texte'};assert.equal(notesContext.normaliseNotes(unknown),unknown);assert.throws(()=>notesContext.normaliseNotes(unknown,true),/illisible/);
 const bad={format:1,messages:[{id:'a',text:'A'},{id:'a',text:'B'}]};assert.equal(notesContext.normaliseNotes(bad),bad);assert.throws(()=>notesContext.normaliseNotes(bad,true),/illisible/);
});
console.log(count+' scénarios Notes et icônes validés.');
