/* Intégration : vrais scripts, coquilles, pont et fiches ; Roll20 simulé.
 * Playwright, Firefox/Chromium ; TEST_BROWSER=firefox CROSS_ORIGIN=1. */
'use strict';
const {chromium,firefox}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const M=require('../docs/javascripts/owd-attr-map.js'),C=require('../docs/javascripts/owd-sync.js');
const root=path.resolve(__dirname,'..'), states={},writes=[],chats=[],readFails=new Set(),writeFails=new Set();
for(const id of ['shared','other','private','empty','world']){
 const s=M.blank();s.v=M.SCHEMA;s.rel=M.release();s.name=id;
 s.inv.objets=[{ref:'o1',nom:'Dague',qte:1,ou:'sac'},{ref:'o2',nom:'Pain',qte:5,ou:'sac'}];
 if(id==='shared') s.inv.objets=[
 {ref:'bag',id:'pack',nom:'Sac voyage',sac:true,qte:1,poids:2,cap:50,ep:1,ebMax:5,ou:'dos'},
 {ref:'belt',nom:'Ceinture',ceint:true,qte:1,ep:1,ebMax:5,ou:'ceinture'},
 {ref:'food',id:'bread',nom:'Rations',qte:8,poids:.5,encombre:1,ou:'sac'},
 {ref:'blade',nom:'Lame',qte:2,encombre:1,ou:'sac',arme:{type:'dague',mains:1}},
 {ref:'left',nom:'Arme gauche',qte:1,ou:'mainG',arme:{type:'dague',mains:1}},
 {ref:'ring1',nom:'Bague une',acc:'bague',qte:1,ou:'sac'},
 {ref:'ring2',nom:'Bague deux',acc:'bague',qte:1,ou:'sac'},
 {ref:'ring3',nom:'Bague trois',acc:'bague',qte:1,ou:'sac'},
 {ref:'top',nom:'Tunique',vet:'haut',qte:1,ou:'haut'},
 {ref:'robe',nom:'Robe',vet:'hautbas',qte:1,ou:'sac'},
 {ref:'heavy',nom:'Enclume',qte:1,encombre:99,ou:'sac'}];
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
 const actual=a.frames().find(f=>f.url().includes('c=shared')&&f.url().includes('roll20-fiche'));
 const tile=ref=>ia.locator('.pc-obj-tile[data-object-ref="'+ref+'"]');
 const menu=()=>ia.locator('.pc-inv-context');
 const snapshot=()=>actual.evaluate(()=>JSON.parse(window.__owdLocalStorage.getItem('owd-perso')).inv.objets);
 async function open(ref){await tile(ref).first().click({button:'right'});await menu().waitFor();}
 async function action(ref,name){await open(ref);await menu().getByRole('menuitem',{name,exact:true}).click();}
 const validate=()=>ia.locator('.pc-modal-actions button').last().click();
 async function quantity(n){await ia.locator('.pc-modal input').fill(String(n));await validate();}
 await open('food');assert.deepEqual(await menu().getByRole('menuitem').allTextContents(),['Montrer','Montrer une partie','Donner','Donner une partie','Séparer une partie','Détruire','Détruire une partie','Déplacer dans les poches','Accrocher à la ceinture','Accrocher au sac à dos']);
 assert.equal(await menu().getByRole('separator').count(),5);await menu().screenshot({path:process.env.CONTEXT_MENU_SCREENSHOT||'/tmp/owd-inventory-context-menu.png'});
 assert.equal(await menu().evaluate(n=>getComputedStyle(n).backgroundColor),await ia.locator('.perso-fiche').evaluate(n=>getComputedStyle(n).getPropertyValue('--card').trim()).then(x=>x==='#1a1a1a'?'rgb(26, 26, 26)':x==='#ffffff'?'rgb(255, 255, 255)':x));
 await a.keyboard.press('ArrowDown');assert.equal(await menu().evaluate(n=>document.activeElement.textContent),'Montrer une partie');await a.keyboard.press('Escape');assert.equal(await menu().count(),0);
 await tile('food').first().focus();await a.keyboard.press('Shift+F10');await menu().waitFor();await ia.locator('.pc-inv-total').click();assert.equal(await menu().count(),0);
 await tile('food').first().dispatchEvent('contextmenu',{clientX:10000,clientY:10000});let bounds=await menu().evaluate(n=>{let r=n.getBoundingClientRect();return {right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight}});assert.ok(bounds.right<=bounds.w&&bounds.bottom<=bounds.h);await a.keyboard.press('Escape');
 await open('food');await a.locator('#textchat-input textarea').click();assert.equal(await menu().count(),0);console.log('OK clic droit natif et clavier, groupes sans séparateurs vides, palette, limites et clic hors iframe');
 await action('food','Montrer une partie');let before=chats.length;await quantity(8);assert.equal(await ia.locator('.pc-modal').count(),1);assert.equal(chats.length,before);await quantity(2);for(let i=0;i<30&&chats.length===before;i++)await a.waitForTimeout(100);assert.ok(chats.at(-1).includes('OWD Item Show'));assert.ok(chats.at(-1).includes('{{Quantité=2}}'));assert.equal((await snapshot()).find(o=>o.ref==='food').qte,8);
 await action('food','Séparer une partie');await quantity(2);assert.deepEqual((await snapshot()).filter(o=>o.id==='bread').map(o=>o.qte).sort(),[2,6]);
 await action('food','Détruire une partie');await quantity(1);assert.equal((await snapshot()).find(o=>o.ref==='food').qte,5);
 await action('food','Donner une partie');await quantity(2);assert.equal((await snapshot()).find(o=>o.ref==='food').qte,3);
 await action('food','Donner');assert.equal(await ia.locator('.pc-modal input').count(),0);await ia.locator('.pc-modal-actions button').first().click();assert.equal((await snapshot()).find(o=>o.ref==='food').qte,3);
 console.log('OK quantités partielles validées, séparation et dons sans toucher toute la pile');
 await action('food','Accrocher à la ceinture');let items=await snapshot(),hook=items.find(o=>o.ou==='ceint'&&o.id==='bread');assert.ok(hook);assert.equal(hook.qte,1);assert.equal(items.find(o=>o.ref==='food').qte,2);
 await action('food','Accrocher au sac à dos');items=await snapshot();hook=items.find(o=>o.ou==='sacep'&&o.id==='bread');assert.ok(hook);assert.equal(hook.dans,'bag');assert.equal(items.find(o=>o.ref==='food').qte,1);
 await open('food');assert.equal(await menu().getByRole('menuitem',{name:'Séparer une partie',exact:true}).count(),0);await a.keyboard.press('Escape');
 await action('food','Déplacer dans les poches');await open('food');assert.equal(await menu().getByRole('menuitem',{name:'Déplacer dans les poches',exact:true}).count(),0);await menu().getByRole('menuitem',{name:'Déplacer dans le sac à dos',exact:true}).click();assert.equal((await snapshot()).find(o=>o.ref==='food').dans,'bag');
 await open('heavy');assert.equal(await menu().getByRole('menuitem',{name:/Accrocher/}).count(),0);await a.keyboard.press('Escape');
 console.log('OK déplacements conditionnels, accroches à l’unité et limite d’encombrement');
 await action('blade','Équiper');items=await snapshot();assert.equal(items.find(o=>o.ref==='blade').qte,1);let equipped=items.find(o=>o.nom==='Lame'&&o.ou==='mainD');assert.ok(equipped);assert.equal(equipped.qte,1);
 await action('blade','Équiper');items=await snapshot();assert.equal(items.find(o=>o.ref==='blade').ou,'mainD');assert.equal(items.find(o=>o.ref===equipped.ref).dans,'bag');
 await action('ring1','Équiper');await action('ring2','Équiper');await action('ring3','Équiper');items=await snapshot();assert.equal(items.find(o=>o.ref==='ring3').ou,'bagueG');assert.equal(items.find(o=>o.ref==='ring2').ou,'bagueD');assert.equal(items.find(o=>o.ref==='ring1').dans,'bag');
 await action('robe','Équiper');items=await snapshot();assert.equal(items.find(o=>o.ref==='robe').ou,'haut');assert.equal(items.find(o=>o.ref==='top').dans,'bag');assert.equal(await ia.locator('[data-ou="bas"] .pc-obj-tile[data-object-ref="robe"]').count(),1);
 console.log('OK équipement à l’unité, premier emplacement libre, remplacement et robe sur deux cases');
 await open('bag');assert.equal(await menu().getByRole('menuitem',{name:/une partie/}).count(),0);await menu().getByRole('menuitem',{name:'Voir son contenu',exact:true}).click();assert.ok((await ia.locator('.pc-obj-panel').textContent()).includes('Contenu du sac'));
 await action('bag','Déplacer dans les poches');await open('heavy');assert.equal(await menu().getByRole('menuitem',{name:/sac à dos/i}).count(),0);await a.keyboard.press('Escape');await action('bag','Équiper');
 await action('heavy','Détruire');assert.equal(await ia.locator('.pc-modal').count(),1);await ia.locator('.pc-modal-actions button').first().click();assert.ok((await snapshot()).some(o=>o.ref==='heavy'));
 await action('heavy','Détruire');await validate();assert.ok(!(await snapshot()).some(o=>o.ref==='heavy'));
 await action('blade','Montrer');await a.waitForTimeout(200);assert.equal((await snapshot()).find(o=>o.ref==='blade').qte,1);await action('blade','Donner');await validate();assert.ok(!(await snapshot()).some(o=>o.ref==='blade'));
 assert.deepEqual(errors,[]);console.log('OK contenu du sac, disponibilité du sac porté, destruction confirmée, aucune erreur navigateur');
 await a.screenshot({path:process.env.CONTEXT_SCREENSHOT||'/tmp/owd-context.png'});
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
