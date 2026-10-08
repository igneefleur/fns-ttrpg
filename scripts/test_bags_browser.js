/* Intégration : vrais scripts, coquilles, pont et fiches ; Roll20 simulé.
 * Playwright, Firefox/Chromium ; TEST_BROWSER=firefox CROSS_ORIGIN=1. */
'use strict';
const {chromium,firefox}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const M=require('../docs/javascripts/owd-attr-map.js'),C=require('../docs/javascripts/owd-sync.js');
const root=path.resolve(__dirname,'..'), states={},writes=[],chats=[],readFails=new Set(),writeFails=new Set();
for(const id of ['shared','other','private','empty','world']){
 const s=M.blank();s.v=M.SCHEMA;s.rel=M.release();s.name=id;
 s.inv.objets=[{ref:'o1',nom:'Dague',qte:1,ou:'sac'},{ref:'o2',nom:'Pain',qte:5,ou:'sac'}];
 if(id==='shared'){s.inv.objets.push({ref:'bag',id:'pack',nom:'Sac voyage',sac:true,qte:1,poids:2,cap:50,ou:'dos'});s.inv.objets[1].id='bread';s.inv.objets[1].poids=.5;s.inv.objets.push({ref:'flask',nom:'Gourde',contenant:'liquide',qte:1,poids:0,ou:'sac'});s.inv.objets[1].desc='Ration';s.inv.objets.push({ref:'o3',nom:'Eau claire',qte:3,contenu:'liquide',dans:'flask',desc:'Eau du puits',poids:2,ou:'sac'});}
 states[id]=id==='empty'?{native:{current:'x',max:''}}:{[C.BASE]:{current:JSON.stringify({format:1,state:s}),max:''},owd_version:{current:String(M.SCHEMA),max:M.release()},owd_state:{current:JSON.stringify(s),max:''}};
}
function harness(){return `<!doctype html><meta charset="utf-8"><style>body{margin:0}#master-toolbar{position:fixed;left:0;top:0;width:45px;height:100vh;background:#ddd}.toolbar-button-outer{width:40px;height:35px}.icon-slot{height:30px;width:30px}#rightsidebar{position:fixed;right:0;top:0;width:240px;height:100vh;background:#ddd}#textchat-input textarea{width:230px;height:250px}</style><link rel="stylesheet" href="/ext/overlay.css"><div id="master-toolbar"><div class="upper-buttons"><div class="spacer-outer"><div class="spacer-header">TOOLS</div></div><div class="toolbar-button-outer"><div class="icon-slot">↗</div></div><div id="more-tools-button">…</div></div></div><div id="rightsidebar"><div id="textchat"><div id="textchat-log"></div><div id="textchat-input"><textarea></textarea><button>Envoyer</button></div></div><div id="other-sidebar-tab" style="height:400px">Autre onglet de la barre latérale</div></div><script>
window.currentPlayer={id:'p1'};window.is_gm=new URL(location.href).searchParams.has('gm');window.controls={shared:'all',other:'p1',private:'p2',empty:'all',world:'all'};
function model(data,id){return {attributes:{...data},get(k){return this.attributes[k]},set(d){Object.assign(this.attributes,d)},save(_,opts){backend({kind:'write',id,data:this.attributes}).then(()=>opts&&opts.success&&opts.success())}}}
const chars=Object.keys(controls).map(id=>{const col={models:[],create(data){const m=model(data,id);this.models.push(m);return m},fetch(opts){backend({kind:'read',id}).then(attrs=>{this.models=Object.keys(attrs).map(name=>model({name,...attrs[name]},id));opts&&opts.success&&opts.success()}).catch(e=>opts&&opts.error&&opts.error(e))}};return {id,attribs:col,get(k){return k==='name'?(id==='world'?'Monde':id):k==='controlledby'?controls[id]:''}}});
window.Campaign={id:'test',characters:{models:chars,get(id){return chars.find(c=>c.id===id)}},players:{models:[]}};
document.querySelector('#textchat-input button').onclick=()=>{const t=document.querySelector('textarea');backend({kind:'chat',text:t.value});t.value=''};
Promise.all(chars.map(c=>backend({kind:'read',id:c.id}).then(attrs=>{c.attribs.models=Object.keys(attrs).map(name=>model({name,...attrs[name]},c.id));}))).then(()=>{const b=document.createElement('script');b.src='/ext/beta/content-roll20.js';document.body.appendChild(b)});
</script>`;}
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');let data,file;
 if(u.pathname==='/editor'){data=harness();file='index.html';}
 else {const ext=u.pathname.startsWith('/ext/');file=path.join(root,ext?'extension/firefox':'site',decodeURIComponent(ext?u.pathname.slice(5):u.pathname));if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return;}data=fs.readFileSync(file);}
 res.writeHead(200,{'content-type':file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream'});res.end(data);
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const engine=process.env.TEST_BROWSER==='firefox'?firefox:chromium;
 const browser=await engine.launch({headless:true,...(engine===chromium?{executablePath:process.env.CHROMIUM_EXECUTABLE||chromium.executablePath(),args:['--no-sandbox']}:{} )});const errors=[];
 try{const ctx=await browser.newContext({viewport:{width:1600,height:1000}});
 await ctx.exposeBinding('backend',async(_,m)=>{if(m.kind==='read'){if(readFails.has(m.id))throw Error('Réseau coupé');await new Promise(r=>setTimeout(r,30));return C.copy(states[m.id]);}if(m.kind==='chat'){chats.push(m.text);return;}if(m.kind==='write'){if(writeFails.has(m.id))return;states[m.id][m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};writes.push({id:m.id,name:m.data.name});}});
 await ctx.addInitScript(({url})=>{const store={owdBeta:true,owdNuit:'nuit',owd_site_url:url+'/'};window.dragTrace=[];for(const type of ['dragstart','dragenter','drop','dragend'])document.addEventListener(type,e=>dragTrace.push({type,trusted:e.isTrusted,target:e.target.id||e.target.className,types:e.dataTransfer&&Array.from(e.dataTransfer.types),data:type==='drop'&&e.dataTransfer?e.dataTransfer.getData('application/x-owd-item'):null}),true);window.addEventListener('message',e=>{if(e.data&&/inventory-(drag|drop)/.test(e.data.type))dragTrace.push(e.data)});window.browser={runtime:{getURL:p=>url+'/ext/'+p},storage:{local:{get:async()=>({...store,...JSON.parse(localStorage.getItem("extension-store")||"{}")}),set:async o=>localStorage.setItem("extension-store",JSON.stringify({...JSON.parse(localStorage.getItem("extension-store")||"{}"),...o}))},onChanged:{addListener(){}}}};},{url:process.env.CROSS_ORIGIN==='1'?url.replace('127.0.0.1','localhost'):url});
 
 const pages=await Promise.all([ctx.newPage(),ctx.newPage()]);pages.forEach(p=>p.on('pageerror',e=>errors.push(e.message)));
 await Promise.all(pages.map(p=>p.goto(url+'/editor')));const [a,b]=pages;
 await a.locator('#owd-outil-inventaire').click();await b.locator('#owd-outil-inventaire').click();
 // Panel IDs are stable; target the actual page if the outer box uses no data attribute.
 function wf(p){return p.frames().find(f=>f.url().includes('/roll20-inventaire.html'));}
 async function getView(p){await p.waitForFunction(()=>Array.from(document.querySelectorAll('iframe')).some(f=>f.src.includes('roll20-inventaire'))||document.querySelectorAll('.owd-panneau').length>0);for(let i=0;i<100;i++){const f=wf(p);if(f&&await f.locator('select option').count())return f;await p.waitForTimeout(100);}throw Error('Inventaire non monté');}
 async function choose(f,id){if(await f.locator('.inventaire-onglet[data-character="'+id+'"]').count())await f.locator('.inventaire-onglet[data-character="'+id+'"] .inventaire-tab').click();else{if(await f.locator('.inventaire-choix').isHidden())await f.locator('.inventaire-ajouter').click();await f.locator('select').selectOption(id);}}
 const inv=f=>f.frameLocator('.inventaire-vue iframe.inventaire-active');
 let wa=await getView(a);const wb=await getView(b);await choose(wa,'shared');await wb.locator('select').selectOption('shared');
const ia=inv(wa);await ia.locator('[data-module="inv"]').waitFor();
 const tile=n=>ia.locator('.pc-obj-tile').filter({hasText:n}).first();
 const panel=ia.locator('.pc-obj-panel');
 await tile('Pain').click();await ia.locator('.qact input').fill('2');await ia.getByRole('button',{name:'Séparer',exact:true}).click();await a.waitForTimeout(3200);
 for(let i=0;i<100&&C.read(states.shared).state.inv.objets.filter(o=>o.id==='bread'&&o.qte>0).length<2;i++)await a.waitForTimeout(150);let items=C.read(states.shared).state.inv.objets;assert.deepEqual(items.filter(o=>o.id==='bread').map(o=>o.qte).sort(),[2,3]);assert.ok(items.filter(o=>o.id==='bread').every(o=>o.dans==='bag'));
 console.log('OK séparation réelle dans le sac : deux piles de même catalogue');
 await tile('Sac voyage').click();assert.ok((await ia.locator('.pc-obj-panel').textContent()).includes('10.5 kg'));
 assert.equal(await ia.locator('.pc-obj-panel input[type=number][disabled]').count(),1);
 async function dragTo(source,target){await source.scrollIntoViewIfNeeded();let x=await source.locator(':scope > .pc-obj-ph').boundingBox();await target.scrollIntoViewIfNeeded();let y=await target.boundingBox();await a.mouse.move(x.x+10,x.y+10);await a.mouse.down();await a.mouse.move(x.x+23,x.y+10,{steps:5});await a.mouse.move(y.x+y.width/2,y.y+y.height/2,{steps:25});await a.mouse.up();await a.waitForTimeout(3200);}
 await dragTo(tile('Sac voyage'),ia.locator('.pc-inv-case[data-ou="mainD"]'));
 assert.equal(await ia.locator('.pc-obj-ghead').filter({hasText:'Sac à dos'}).count(),0);items=C.read(states.shared).state.inv.objets;assert.equal(items.find(o=>o.ref==='bag').ou,'mainD');assert.equal(items.filter(o=>o.dans==='bag').length,4);
 assert.ok((await ia.locator('.pc-obj-panel').textContent()).includes('Contenu du sac'));console.log('OK sac retiré : section masquée, poids et contenu conservés');
 await dragTo(tile('Sac voyage'),ia.locator('.pc-inv-case[data-ou="dos"]'));assert.equal(await ia.locator('.pc-obj-ghead').filter({hasText:'Sac à dos'}).count(),1);
 await tile('Sac voyage').click();await ia.getByRole('button',{name:'Donner',exact:true}).click();await ia.locator('.pc-modal-actions button').filter({hasText:'Donner'}).click();await a.waitForTimeout(3200);
 const payload=chats.at(-1).match(/\/owd_take ([A-Za-z0-9_-]+)/)[1],data=JSON.parse(Buffer.from(payload,'base64url'));assert.equal(data.bundle.length,6);assert.ok(!C.read(states.shared).state.inv.objets.some(o=>o.ref==='bag'||o.dans==='bag'));
 console.log('OK donner le sac embarque tout le contenu et retire les six objets');
 assert.equal(await ia.locator('.pc-obj-panel input[placeholder="Aucun objet"]').inputValue(),'');
 if(process.env.TEST_STOP_AFTER_GIVE)return;
 await choose(wa,'other');const recipient=inv(wa);await recipient.locator('[data-module="inv"]').waitFor();const actual=a.frames().find(f=>f.url().includes('c=other')&&f.url().includes('roll20-fiche'));
 await actual.evaluate(p=>window.__owdTake(p),payload);await recipient.locator('.pc-modal-actions button').filter({hasText:'Prendre'}).click();await a.waitForTimeout(3200);
 for(let i=0;i<250;i++){let l=C.read(states.other).state.inv.objets,b=l.find(o=>o.sac);let f=l.find(o=>b&&o.dans===b.ref&&o.contenant);if(b&&l.filter(o=>o.dans===b.ref&&o.qte>0).length===4&&f&&l.some(o=>o.dans===f.ref&&o.nom==='Eau claire'))break;await a.waitForTimeout(150);}items=C.read(states.other).state.inv.objets;let bag=items.find(o=>o.sac);assert.ok(bag);assert.equal(bag.qte,1);assert.equal(items.filter(o=>o.dans===bag.ref).length,4);const food=items.find(o=>o.dans===bag.ref&&o.contenant);assert.ok(items.some(o=>o.dans===food.ref&&o.nom==='Eau claire'));
 await actual.evaluate(p=>window.__owdTake(p),payload);await recipient.locator('.pc-modal-actions button').filter({hasText:'Prendre'}).click();await a.waitForTimeout(3200);for(let i=0;i<250&&C.read(states.other).state.inv.objets.filter(o=>o.sac).length<2;i++)await a.waitForTimeout(150);assert.equal(C.read(states.other).state.inv.objets.filter(o=>o.sac).length,2);
 // Ordinary receiving still merges into the first catalog match, despite separate piles.
 for(let i=0;i<250&&C.read(states.other).state.inv.objets.filter(o=>o.id==='bread'&&o.qte>0).length<4;i++)await a.waitForTimeout(150);await a.waitForTimeout(2000);const firstPile=C.read(states.other).state.inv.objets.find(o=>o.id==='bread'),firstBefore=firstPile.qte;const ordinary=Buffer.from(JSON.stringify({n:'Pain',k:'bread',q:1,p:.5})).toString('base64url');await actual.evaluate(p=>window.__owdTake(p),ordinary);await recipient.locator('.pc-modal-actions button').filter({hasText:'Prendre'}).click();await a.waitForTimeout(3200);for(let i=0;i<100&&C.read(states.other).state.inv.objets.find(o=>o.ref===firstPile.ref).qte!==firstBefore+1;i++)await a.waitForTimeout(150);assert.equal(C.read(states.other).state.inv.objets.find(o=>o.ref===firstPile.ref).qte,firstBefore+1);
 assert.deepEqual(errors,[]);console.log('OK réception du sac imbriqué, sacs non empilables et réception ordinaire fusionnée dans la première pile');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
