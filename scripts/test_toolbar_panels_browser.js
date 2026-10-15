/* Intégration : vrais scripts, coquilles, pont et fiches ; Roll20 simulé.
 * Playwright, Firefox/Chromium ; TEST_BROWSER=firefox CROSS_ORIGIN=1. */
'use strict';
const {chromium,firefox}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const M=require('../docs/javascripts/owd-attr-map.js'),C=require('../docs/javascripts/owd-sync.js');
const root=path.resolve(__dirname,'..'), states={},writes=[],chats=[],readFails=new Set(),writeFails=new Set();
for(const id of ['shared','other','private','empty','world']){
 const s=M.blank();s.v=M.SCHEMA;s.rel=M.release();s.name=id;
 s.inv.objets=[{ref:'o1',nom:'Dague',qte:1,ou:'sac'},{ref:'o2',nom:'Pain',qte:5,ou:'sac'}];
 if(id==='shared'){s.inv.objets[1].contenant='liquide';s.inv.objets[1].desc='Contenant personnel';s.inv.objets.push({ref:'o3',nom:'Eau claire',qte:3,contenu:'liquide',dans:'o2',desc:'Eau du puits',poids:2,ou:'sac'});}
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
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||chromium.executablePath(),args:['--no-sandbox']});
 try{
  const ctx=await browser.newContext({viewport:{width:1600,height:1050}}),errors=[];
  await ctx.exposeBinding('backend',async(_,m)=>{if(m.kind==='read')return C.copy(states[m.id]);if(m.kind==='chat'){chats.push(m.text);return;}if(m.kind==='write')states[m.id][m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};});
  await ctx.addInitScript(({url})=>{
   const base={owdBeta:true,owdNuit:'nuit',owd_site_url:url+'/',owd_sheet_url:url+'/roll20-fiche.html'},listeners=[];
   function emit(ch){listeners.forEach(f=>f(ch,'local'));}
   window.addEventListener('storage',e=>{if(e.key==='extension-store'){const before=JSON.parse(e.oldValue||'{}'),after=JSON.parse(e.newValue||'{}'),ch={};for(const k of new Set([...Object.keys(before),...Object.keys(after)]))if(JSON.stringify(before[k])!==JSON.stringify(after[k]))ch[k]={oldValue:before[k],newValue:after[k]};emit(ch);}});
   window.browser={runtime:{getURL:p=>url+'/ext/'+p,getManifest:()=>({version:'1.12.0'})},storage:{local:{get:async()=>({...base,...JSON.parse(localStorage.getItem('extension-store')||'{}')}),set:async o=>{const before=JSON.parse(localStorage.getItem('extension-store')||'{}'),ch={};Object.keys(o).forEach(k=>ch[k]={oldValue:before[k],newValue:o[k]});localStorage.setItem('extension-store',JSON.stringify({...before,...o}));emit(ch);}},onChanged:{addListener:f=>listeners.push(f)}},tabs:{query:async()=>[],reload:async()=>{}}};
  },{url});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url+'/editor');
  for(const id of ['monde','boutique','inventaire','attaques','defenses'])await page.locator('#owd-outil-'+id).waitFor();
  assert.equal(await page.locator('.owd-panneau-btn').filter({hasText:/⇲|⇱/}).count(),0);
  const heights={};
  for(const id of ['monde','boutique','inventaire','attaques','defenses']){
   await page.locator('#owd-outil-'+id).click();const panel=page.locator(id==='monde'?'#owd-panneau':'#owd-panneau-'+id);await panel.waitFor();
   heights[id]=(await panel.boundingBox()).height;assert.ok(heights[id]>300);
   await panel.locator('.owd-panneau-tete').dblclick({position:{x:100,y:12}});
   assert.ok((await panel.boundingBox()).height<60,id+' collapsed');assert.equal(await panel.locator('.owd-panneau-corps').isVisible(),false);
   await panel.locator('.owd-panneau-tete').dblclick({position:{x:100,y:12}});assert.equal((await panel.boundingBox()).height,heights[id]);
   await page.locator('#owd-outil-'+id).click();
  }
  console.log('OK cinq fenêtres : double-clic repli/réaffichage, dimensions restaurées, aucun bouton Détacher');
  await page.locator('#owd-outil-defenses').click();
  const def=page.frames().find(f=>f.url().includes('/roll20-defenses.html'));assert.ok(def);
  await def.locator('select option[value="shared"]').waitFor({state:'attached'});await def.locator('select').selectOption('shared');
  const sheet=def.frameLocator('iframe.inventaire-active');await sheet.locator('.pc-defenses').waitFor({timeout:12000}).catch(async e=>{console.log(await sheet.locator('body').innerText());console.log(await def.locator('iframe').getAttribute('src'));throw e;});assert.equal(await sheet.locator('.pc-attaques:not(.pc-defenses)').count(),0);
  await sheet.locator('.pc-attaque-tete').first().click();await sheet.getByRole('button',{name:'Se défendre',exact:true}).first().click();await sheet.locator('.pc-modal-body').waitFor();
  assert.equal(await sheet.locator('.pc-modal-body select').count(),1);assert.equal(await sheet.locator('.pc-modal-body input').count(),1);
  await page.locator('#owd-outil-defenses').click();
  console.log('OK Défenses : onglets personnage, module isolé et fenêtre dégâts/type');
  await page.locator('#owd-outil-boutique').click();
  const shop=page.frames().find(f=>f.url().includes('/roll20-boutique.html'));await shop.locator('.ob-item').first().waitFor();
  await shop.waitForFunction(()=>Array.from(document.querySelectorAll('.ob-item img')).every(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await shop.locator('.ob-item img').count(),24);assert.ok(await shop.locator('.ob-item').evaluateAll(ns=>ns.every(n=>n.querySelector('.ob-item-price').getBoundingClientRect().bottom<=n.getBoundingClientRect().bottom)), 'Prix contenus dans les cartes');
  const palette=await shop.locator('body').evaluate(n=>({bg:getComputedStyle(n).backgroundColor,gold:getComputedStyle(n).getPropertyValue('--ob-accent').trim()}));assert.equal(palette.bg,'rgb(0, 0, 0)');assert.equal(palette.gold,'#ffd77f');
  await shop.locator('#ob-recherche').fill('Palladium Sword');await shop.locator('.ob-item').first().waitFor();
  await shop.waitForFunction(()=>{const i=document.querySelector('.ob-portrait');return i&&i.complete&&i.naturalWidth>0;});
  const data=JSON.parse(fs.readFileSync(path.join(root,'site/owd-boutique.json')));assert.equal(data.objets.length,1256);assert.ok(data.objets.every(i=>i.img&&fs.existsSync(path.join(root,'site',i.img))));
  await page.locator('#owd-outil-boutique').click();
  console.log('OK 1 256 images présentes, images natives chargées dans Boutique, couleurs noir et doré');
  const settings=await ctx.newPage();settings.on('pageerror',e=>errors.push(e.message));await settings.goto(url+'/ext/popup/popup.html');
  assert.deepEqual(await settings.locator('#p-pieces .p-lib').allTextContents(),['Monde','Boutique','Inventaire','Attaques','Défenses','Beta']);assert.equal(await settings.locator('#p-pan-replacer').count(),0);assert.equal(await settings.locator('#p-pieces hr').count(),1);
  for(const id of ['monde','boutique','inventaire','attaques','defenses']){
   const sw=settings.locator(id==='monde'?'#p-panneau':'#p-'+id);await sw.click();await page.locator('#owd-outil-'+id).waitFor({state:'detached'});await sw.click();await page.locator('#owd-outil-'+id).waitFor();
  }
  console.log('OK paramètres : ordre, séparateur, cinq interrupteurs appliqués en direct, Replacer absent');
  await page.locator('#owd-outil-inventaire').click();let inv=page.locator('#owd-panneau-inventaire');await inv.locator('.owd-panneau-tete').dblclick({position:{x:100,y:12}});await page.waitForTimeout(700);await page.reload();await page.locator('#owd-panneau-inventaire.owd-panneau-replie').waitFor();assert.ok((await inv.boundingBox()).height<60);await inv.locator('.owd-panneau-tete').dblclick({position:{x:100,y:12}});assert.equal((await inv.boundingBox()).height,heights.inventaire);
  assert.deepEqual(errors,[]);console.log('OK état replié et hauteur conservés après rechargement ; aucune erreur JavaScript');
  if(process.env.PANEL_SCREENSHOT){await page.locator('#owd-outil-inventaire').click();await page.locator('#owd-outil-boutique').click();let shown;for(let i=0;i<50;i++){shown=page.frames().find(f=>f.url().includes('/roll20-boutique.html'));if(shown)break;await page.waitForTimeout(50);}await shown.locator('.ob-item').first().waitFor();await shown.waitForFunction(()=>Array.from(document.querySelectorAll('.ob-item img')).every(i=>i.complete&&i.naturalWidth>0));await page.screenshot({path:process.env.PANEL_SCREENSHOT});await settings.screenshot({path:process.env.PANEL_SCREENSHOT.replace('.png','-settings.png')});}
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
