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
 if(id==='shared'){for(let i=0;i<60;i++)s.inv.objets.push({ref:'extra'+i,nom:'Objet '+i,qte:1,ou:'sac'});s.attaques=Array.from({length:20},(_,i)=>({id:'atk'+i,arme:'blade'}));}
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
 const inner=()=>a.frames().find(f=>f.url().includes('c=shared')&&f.url().includes('roll20-fiche')&&!f.url().includes('view=attaques'));
 async function metrics(frame){return frame.evaluate(()=>{let ns=[document.documentElement,document.body,document.getElementById('perso-fiche'),document.querySelector('.perso-fiche'),document.querySelector('.pc-sheet'),document.querySelector('[data-module]'),document.querySelector('.pc-obj-wrap'),document.querySelector('.pc-obj-left'),document.querySelector('.pc-obj-panel'),document.querySelector('.pc-attaques')];return ns.map(n=>n?{name:n.className||n.id||n.tagName,h:n.clientHeight,sh:n.scrollHeight,overflow:getComputedStyle(n).overflowY,top:n.getBoundingClientRect().top,bottom:n.getBoundingClientRect().bottom,w:n.getBoundingClientRect().width}:null).concat({h:innerHeight});});}
 async function resizeTool(id,size){const box=a.locator('#owd-panneau-'+id),before=await box.boundingBox(),gr=await box.locator('.owd-panneau-grip').boundingBox();await a.mouse.move(gr.x+7,gr.y+7);await a.mouse.down();await a.mouse.move(gr.x+7+size.w-before.width,gr.y+7+size.h-before.height,{steps:15});await a.mouse.up();await a.waitForTimeout(250);const after=await box.boundingBox();assert.ok(Math.abs(after.width-size.w)<=2&&Math.abs(after.height-size.h)<=2,JSON.stringify(after));}
 async function checkInventory(){let m=await metrics(inner());for(let i=0;i<6;i++)assert.ok(m[i].sh<=m[i].h+1,'unexpected outer overflow '+JSON.stringify(m));assert.ok(m[6].h>0);assert.ok(m[7].sh>m[7].h);assert.ok(m[8].sh>m[8].h);assert.equal(m[7].overflow,'auto');assert.equal(m[8].overflow,'auto');assert.ok(m[6].bottom<m[10].h);assert.ok(m[10].h-m[5].bottom<12,JSON.stringify(m));assert.ok(Math.abs(m[7].bottom-m[8].bottom)<=1);return m;}
 await ia.locator('.pc-obj-tile[data-object-ref="bag"]').first().click();
 // Both column scrollbars remain useful; the page and module do not scroll.
 await checkInventory();await ia.locator('.pc-obj-left').evaluate(n=>n.scrollTop=120);await ia.locator('.pc-obj-panel').evaluate(n=>n.scrollTop=100);assert.equal(await ia.locator('.pc-obj-left').evaluate(n=>n.scrollTop),120);assert.equal(await ia.locator('.pc-obj-panel').evaluate(n=>n.scrollTop),100);
 for(const size of [{w:1100,h:370},{w:550,h:420},{w:1100,h:700}]){await resizeTool('inventaire',size);await checkInventory();}
 console.log('OK inventaire : seulement deux colonnes défilantes, fenêtre basse/étroite et hauteur remplie après redimensionnement');
 await a.locator('#owd-outil-attaques').click();await a.waitForFunction(()=>Array.from(document.querySelectorAll('iframe')).some(f=>f.src.includes('roll20-attaques')));let attacks;for(let i=0;i<100;i++){attacks=a.frames().find(f=>f.url().includes('/roll20-attaques.html'));if(attacks&&await attacks.locator('select option[value="shared"]').count())break;await a.waitForTimeout(100);}await choose(attacks,'shared');const attackFrame=()=>a.frames().find(f=>f.url().includes('c=shared')&&f.url().includes('view=attaques'));
 await attacks.frameLocator('.inventaire-active').locator('.pc-attaque-card').first().waitFor();await attacks.frameLocator('.inventaire-active').locator('.pc-attaque-tete').first().click();
 for(const size of [{w:1000,h:330},{w:550,h:420},{w:1100,h:700}]){await resizeTool('attaques',size);let m=await metrics(attackFrame());for(let i=0;i<6;i++)assert.ok(m[i].sh<=m[i].h+1,'attack outer overflow '+JSON.stringify(m));assert.equal(m[9].overflow,'auto');assert.ok(m[9].sh>m[9].h,JSON.stringify(m));assert.ok(m[10].h-m[5].bottom<12,JSON.stringify(m));await attackFrame().locator('.pc-attaques').evaluate(n=>n.scrollTop=200);assert.ok(Math.abs(await attackFrame().locator('.pc-attaques').evaluate(n=>n.scrollTop)-200)<1);}
 console.log('OK attaques : une seule liste défilante, cartes ouvertes et redimensionnement');
 // Every intermediate document also fits its iframe exactly.
 for(const f of a.frames().filter(f=>/panneau.html|roll20-inventaire.html|roll20-attaques.html/.test(f.url()))){let m=await f.evaluate(()=>({h:innerHeight,sh:document.documentElement.scrollHeight}));assert.ok(m.sh<=m.h+1, f.url()+JSON.stringify(m));}
 await a.evaluate(()=>{const f=document.createElement('iframe');f.id='full';f.style='position:fixed;left:60px;top:20px;width:1300px;height:800px;z-index:200000';f.src='/roll20-fiche.html#c=shared';document.body.appendChild(f)});
 const full=a.frameLocator('#full');await full.locator('.pc-tab').filter({hasText:'Équipement'}).click();let ff=a.frames().find(f=>f.url().endsWith('#c=shared'));let fm=await metrics(ff);assert.ok(fm[0].sh>fm[10].h);assert.equal(await ff.evaluate(()=>document.documentElement.classList.contains('owd-vue-outil')),false);assert.ok(await full.locator('.pc-obj-wrap').evaluate(n=>parseFloat(n.style.getPropertyValue('--inv-h'))>=420));
 assert.deepEqual(errors,[]);console.log('OK iframes intermédiaires sans scroll, fiche complète conservée, aucune erreur navigateur');
 await a.locator('#full').evaluate(n=>n.remove());await a.locator('#owd-outil-attaques').click();await a.screenshot({path:process.env.LAYOUT_SCREENSHOT||'/tmp/owd-tool-layout.png'});
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
