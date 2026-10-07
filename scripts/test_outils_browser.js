/* Intégration : vrais content script, coquilles, pont et fiches ; serveur
 * Roll20 simulé avec collections indépendantes. Playwright + Chromium. */
'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const M=require('../docs/javascripts/owd-attr-map.js'),C=require('../docs/javascripts/owd-sync.js');
const root=path.resolve(__dirname,'..'), states={},writes=[],chats=[];
for(const id of ['shared','other','private','empty','world']){
 const s=M.blank();s.v=11;s.rel=M.release();s.name=id;
 s.inv.objets=[{ref:'o1',nom:'Dague',qte:1,ou:'sac'},{ref:'o2',nom:'Pain',qte:5,ou:'sac'}];
 states[id]=id==='empty'?{native:{current:'x',max:''}}:{[C.BASE]:{current:JSON.stringify({format:1,state:s}),max:''},owd_version:{current:'11',max:M.release()},owd_state:{current:JSON.stringify(s),max:''}};
}
function harness(){return `<!doctype html><meta charset="utf-8"><style>body{margin:0}#master-toolbar{position:fixed;left:0;top:0;width:45px;height:100vh;background:#ddd}.toolbar-button-outer{width:40px;height:35px}.icon-slot{height:30px;width:30px}#textchat{position:fixed;right:0;top:0;width:240px;height:100vh;background:#ddd}#textchat-input textarea{width:230px;height:250px}</style><link rel="stylesheet" href="/ext/overlay.css"><div id="master-toolbar"><div class="upper-buttons"><div class="spacer-outer"><div class="spacer-header">TOOLS</div></div><div class="toolbar-button-outer"><div class="icon-slot">↗</div></div><div id="more-tools-button">…</div></div></div><div id="textchat"><div id="textchat-log"></div><div id="textchat-input"><textarea></textarea><button>Envoyer</button></div></div><script>
window.currentPlayer={id:'p1'};window.is_gm=new URL(location.href).searchParams.has('gm');window.controls={shared:'all',other:'p1',private:'p2',empty:'all',world:'all'};
function model(data,id){return {attributes:{...data},get(k){return this.attributes[k]},set(d){Object.assign(this.attributes,d)},save(_,opts){backend({kind:'write',id,data:this.attributes}).then(()=>opts&&opts.success&&opts.success())}}}
const chars=Object.keys(controls).map(id=>{const col={models:[],create(data){const m=model(data,id);this.models.push(m);return m},fetch(opts){backend({kind:'read',id}).then(attrs=>{this.models=Object.keys(attrs).map(name=>model({name,...attrs[name]},id));opts&&opts.success&&opts.success()})}};return {id,attribs:col,get(k){return k==='name'?(id==='world'?'Monde':id):k==='controlledby'?controls[id]:''}}});
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
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||chromium.executablePath(),args:['--no-sandbox']});const errors=[];
 try{const ctx=await browser.newContext({viewport:{width:1600,height:1000}});
 await ctx.exposeBinding('backend',async(_,m)=>{if(m.kind==='read'){await new Promise(r=>setTimeout(r,30));return C.copy(states[m.id]);}if(m.kind==='chat'){chats.push(m.text);return;}if(m.kind==='write'){states[m.id][m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};writes.push({id:m.id,name:m.data.name});}});
 await ctx.addInitScript(({url})=>{const store={owdBeta:true,owdNuit:'nuit',owd_site_url:url+'/'};window.browser={runtime:{getURL:p=>url+'/ext/'+p},storage:{local:{get:async()=>({...store,...JSON.parse(localStorage.getItem("extension-store")||"{}")}),set:async o=>localStorage.setItem("extension-store",JSON.stringify({...JSON.parse(localStorage.getItem("extension-store")||"{}"),...o}))},onChanged:{addListener(){}}}};},{url});
 const pages=await Promise.all([ctx.newPage(),ctx.newPage()]);pages.forEach(p=>p.on('pageerror',e=>errors.push(e.message)));
 await Promise.all(pages.map(p=>p.goto(url+'/editor')));const [a,b]=pages;
 await a.locator('#owd-outil-inventaire').click();await b.locator('#owd-outil-inventaire').click();
 // Panel IDs are stable; target the actual page if the outer box uses no data attribute.
 function wf(p){return p.frames().find(f=>f.url().includes('/roll20-inventaire.html'));}
 async function getView(p){await p.waitForFunction(()=>Array.from(document.querySelectorAll('iframe')).some(f=>f.src.includes('roll20-inventaire'))||document.querySelectorAll('.owd-panneau').length>0);for(let i=0;i<100;i++){const f=wf(p);if(f&&await f.locator('select option').count())return f;await p.waitForTimeout(100);}throw Error('Inventaire non monté');}
 const wa=await getView(a),wb=await getView(b);await wa.locator('select').selectOption('shared');await wb.locator('select').selectOption('shared');
 const inv=f=>f.frameLocator('.inventaire-vue iframe:not([hidden])');const ia=inv(wa),ib=inv(wb);await ia.locator('[data-module="inv"]').waitFor();await ib.locator('[data-module="inv"]').waitFor();
 assert.deepEqual(await wa.locator('option').evaluateAll(os=>os.map(o=>o.value)),['empty','other','shared']);
 assert.equal(await ia.locator('[data-module]').count(),1);assert.equal(await ia.locator('.pc-tab').count(),0);
 console.log('OK personnages contrôlés, vue strictement Inventaire, même bundle natif');
 await a.locator('#owd-outil-monde').click();await a.locator('.owd-panneau').filter({hasText:'Monde'}).waitFor();
 const sizes=await a.locator('.owd-panneau').evaluateAll(ns=>ns.map(n=>({t:n.textContent,w:n.offsetWidth,h:n.offsetHeight})));
 assert.ok(sizes.some(s=>s.t.includes('Monde')&&s.h<500));assert.ok(sizes.some(s=>s.t.includes('Inventaire')&&s.h<800));
 console.log('OK Monde et Inventaire indépendants de la hauteur MJ');
 await a.locator('#owd-outil-monde').click();
 const grip=a.locator('#owd-panneau-inventaire .owd-panneau-grip'),gr=await grip.boundingBox();
 await a.mouse.move(gr.x+7,gr.y+7);await a.mouse.down();await a.mouse.move(gr.x+147,gr.y+97,{steps:12});await a.mouse.up();
 const resized=await a.locator('#owd-panneau-inventaire').boundingBox();assert.ok(resized.width>950);assert.ok(resized.height>700);
 const old=wf(a);await a.locator('#owd-outil-inventaire').click();await a.locator('#owd-outil-inventaire').click();assert.equal(wf(a),old);
 await a.evaluate(()=>{const z=document.querySelector('.upper-buttons');z.innerHTML='<div class="toolbar-button-outer"><button><span class="icon-slot">↗</span></button></div><div class="spacer-outer"></div><div id="more-tools-button">…</div>';});
 await a.locator('#owd-outil-inventaire button').waitFor();assert.equal(await a.locator('#owd-outils-titre').count(),1);assert.equal(await a.locator('[data-owd-rang]').count(),3);
 await a.waitForTimeout(600);const saved=await a.evaluate(()=>JSON.parse(localStorage.getItem('extension-store'))['owdPanneau:roll20-inventaire.html']);assert.ok(saved.w>950&&saved.h>700&&saved.tailleChoisie);
 console.log('OK redimensionnement souris, géométrie conservée, réouverture sans perdre la fiche, remontage des deux barres natives');
 await ia.locator('.pc-obj-tile').filter({hasText:'Pain'}).first().click();await ib.locator('.pc-obj-tile').filter({hasText:'Dague'}).first().click();
 await ia.locator('.pc-gear').click();await ib.locator('.pc-gear').click();
 await ia.locator('input[placeholder="Nom de l\'objet"]').fill('Galette');await ib.locator('input[placeholder="Nom de l\'objet"]').fill('Lame');
 await a.waitForTimeout(6500);
 assert.deepEqual(C.read(states.shared).state.inv.objets.map(o=>o.nom),['Lame','Galette']);assert.equal(await ia.locator('input[placeholder="Nom de l\'objet"]').inputValue(),'Galette');assert.equal(await ib.locator('input[placeholder="Nom de l\'objet"]').inputValue(),'Lame');
 console.log('OK deux inventaires simultanés, convergence et saisie conservée');
 // Full sheet and detached inventory use the same server registers.
 await a.evaluate(()=>{const f=document.createElement('iframe');f.id='full';f.style='position:fixed;left:60px;top:20px;width:1300px;height:900px;z-index:200000';f.src='/roll20-fiche.html#c=shared';document.body.appendChild(f)});
 const fiche=a.frameLocator('#full');await fiche.locator('.pc-tab').filter({hasText:'Équipement'}).click();assert.equal(await fiche.locator('.pc-obj-tile').filter({hasText:'Galette'}).count(),1);await a.locator('#full').evaluate(f=>f.remove());
 console.log('OK fiche complète et inventaire détaché partagent les modifications');
 // A real native drag crosses the nested iframes into the Roll20 chat.
 const tile=ib.locator('.pc-obj-tile').filter({hasText:'Galette'}).first();const tr=await tile.boundingBox(),cr=await b.locator('#textchat-input textarea').boundingBox();
 await b.mouse.move(tr.x+tr.width/2,tr.y+tr.height/2);await b.mouse.down();await b.mouse.move(tr.x+tr.width/2+12,tr.y+tr.height/2,{steps:5});await b.mouse.move(cr.x+80,cr.y+80,{steps:30});await b.mouse.up();await b.waitForTimeout(800);
 assert.equal(chats.length,1);assert.ok(chats[0].includes('Galette'));assert.equal(C.read(states.shared).state.inv.objets.find(o=>o.ref==='o2').qte,5);
 console.log('OK glisser-déposer natif dans le chat : une carte, quantité inchangée');
 // Internal move still uses the original inventory drop handlers.
 const pockets=ib.locator('.pc-obj-group').filter({has:ib.locator('.pc-obj-ghead .nm').filter({hasText:'Poches'})}).locator('.pc-obj-tiles');
 await tile.scrollIntoViewIfNeeded();const source=await tile.boundingBox();await pockets.scrollIntoViewIfNeeded();const target=await pockets.boundingBox();
 // Use dragTo's native mouse path; selected slots may scroll in their column.
 await tile.dragTo(pockets);await b.waitForTimeout(2500);
 assert.equal(C.read(states.shared).state.inv.objets.find(o=>o.ref==='o2').ou,'poches');assert.equal(chats.length,1);
 console.log('OK déplacement interne conservé, aucune publication supplémentaire');
 await wa.locator('select').selectOption('other');await inv(wa).locator('[data-module="inv"]').waitFor();assert.equal(await inv(wa).locator('.pc-obj-tile').filter({hasText:'Pain'}).count(),1);await wa.locator('select').selectOption('shared');assert.equal(await ia.locator('.pc-obj-tile').filter({hasText:'Galette'}).count(),1);
 await a.evaluate(()=>controls.shared='p2');await a.waitForTimeout(3000);assert.equal(await wa.locator('option[value="shared"]').count(),0);
 console.log('OK changement de personnage, état isolé, accès retiré');
 // Empty inventory must never create a sheet through the detached view.
 await wa.locator('select').selectOption('empty');await inv(wa).locator('#owd-roll20-note').filter({hasText:'pas encore de fiche'}).waitFor();assert.equal(writes.filter(w=>w.id==='empty').length,0);
 assert.deepEqual(errors,[]);console.log('OK personnage sans fiche : aucune création silencieuse ; aucune erreur navigateur');
 await b.screenshot({path:process.env.OUTILS_SCREENSHOT||'/tmp/owd-outils.png'});
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
