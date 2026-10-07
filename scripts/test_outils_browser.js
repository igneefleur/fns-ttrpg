/* Intégration : vrais scripts, coquilles, pont et fiches ; Roll20 simulé.
 * Playwright, Firefox/Chromium ; TEST_BROWSER=firefox CROSS_ORIGIN=1. */
'use strict';
const {chromium,firefox}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const M=require('../docs/javascripts/owd-attr-map.js'),C=require('../docs/javascripts/owd-sync.js');
const root=path.resolve(__dirname,'..'), states={},writes=[],chats=[],readFails=new Set(),writeFails=new Set();
for(const id of ['shared','other','private','empty','world']){
 const s=M.blank();s.v=11;s.rel=M.release();s.name=id;
 s.inv.objets=[{ref:'o1',nom:'Dague',qte:1,ou:'sac'},{ref:'o2',nom:'Pain',qte:5,ou:'sac'}];
 if(id==='shared'){s.inv.objets[1].contenant='liquide';s.inv.objets[1].desc='Contenant personnel';s.inv.objets.push({ref:'o3',nom:'Eau claire',qte:3,contenu:'liquide',dans:'o2',desc:'Eau du puits',poids:2,ou:'sac'});}
 states[id]=id==='empty'?{native:{current:'x',max:''}}:{[C.BASE]:{current:JSON.stringify({format:1,state:s}),max:''},owd_version:{current:'11',max:M.release()},owd_state:{current:JSON.stringify(s),max:''}};
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
const ia=inv(wa),ib=inv(wb);await ia.locator('[data-module="inv"]').waitFor();await ib.locator('[data-module="inv"]').waitFor();
 assert.deepEqual(await wa.locator('option').evaluateAll(os=>os.map(o=>o.value)),['','empty','other']);
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
 await ia.locator('.pc-obj-tile').filter({hasText:'Pain'}).first().click({position:{x:10,y:10}});await ib.locator('.pc-obj-tile').filter({hasText:'Dague'}).first().click();
 await ia.locator('.pc-gear').click();await ib.locator('.pc-gear').click();
 await ia.locator('input[placeholder="Nom de l\'objet"]').fill('Galette');await ib.locator('input[placeholder="Nom de l\'objet"]').fill('Lame');
 for(let i=0;i<150;i++){if(C.read(states.shared).state.inv.objets.slice(0,2).map(o=>o.nom).join('|')==='Lame|Galette')break;await a.waitForTimeout(200);}
 assert.deepEqual(C.read(states.shared).state.inv.objets.slice(0,2).map(o=>o.nom),['Lame','Galette']);assert.equal(await ia.locator('input[placeholder="Nom de l\'objet"]').inputValue(),'Galette');assert.equal(await ib.locator('input[placeholder="Nom de l\'objet"]').inputValue(),'Lame');
 console.log('OK deux inventaires simultanés, convergence et saisie conservée');
 // Full sheet and detached inventory use the same server registers.
 await a.evaluate(()=>{const f=document.createElement('iframe');f.id='full';f.style='position:fixed;left:60px;top:20px;width:1300px;height:900px;z-index:200000';f.src='/roll20-fiche.html#c=shared';document.body.appendChild(f)});
 const fiche=a.frameLocator('#full');await fiche.locator('.pc-tab').filter({hasText:'Équipement'}).click();assert.equal(await fiche.locator('.pc-obj-tile').filter({hasText:'Galette'}).count(),1);await a.locator('#full').evaluate(f=>f.style.display='none');
 console.log('OK fiche complète et inventaire détaché partagent les modifications');
 // A real native drag crosses the nested iframes into the Roll20 chat.
 const tile=ib.locator('.pc-obj-tile').filter({hasText:'Galette'}).first();const tr=await tile.locator(':scope > .pc-obj-ph').boundingBox(),cr=await b.locator('#rightsidebar').boundingBox();
 await b.mouse.move(tr.x+10,tr.y+10);await b.mouse.down();await b.mouse.move(tr.x+22,tr.y+10,{steps:5});await b.locator('.owd-chat-drop-hint').waitFor();
 const hr=await b.locator('.owd-chat-drop-hint').boundingBox();assert.deepEqual(hr,cr);
 await b.mouse.move(cr.x+80,cr.y+cr.height-80,{steps:30});await b.mouse.up();await b.waitForTimeout(800);
 assert.equal(await b.locator('.owd-chat-drop-hint').isVisible(),false);
 if(!chats.length)for(const f of b.frames())console.log('TRACE',f.url(),await f.evaluate(()=>window.dragTrace||[]));
 assert.equal(chats.length,1);assert.ok(chats[0].includes('Galette'),chats[0]);assert.equal(C.read(states.shared).state.inv.objets.find(o=>o.ref==='o2').qte,5);
 console.log('OK glisser-déposer natif dans le chat : une carte, quantité inchangée');
 // Internal move still uses the original inventory drop handlers.
 const pockets=ib.locator('.pc-obj-group').filter({has:ib.locator('.pc-obj-ghead .nm').filter({hasText:'Poches'})}).locator('.pc-obj-tiles');
 await tile.scrollIntoViewIfNeeded();await pockets.scrollIntoViewIfNeeded();
 // Use dragTo's native mouse path; selected slots may scroll in their column.
 await tile.dragTo(pockets,{sourcePosition:{x:10,y:10}});await b.waitForTimeout(2500);
 assert.equal(C.read(states.shared).state.inv.objets.find(o=>o.ref==='o2').ou,'poches');assert.equal(chats.length,1);
 console.log('OK déplacement interne conservé, aucune publication supplémentaire');
 // Full-sheet drag uses exactly the same overlay and card publication.
 await a.locator('#full').evaluate(f=>f.style.display='block');
 const ft=fiche.locator('.pc-obj-tile').filter({hasText:'Lame'}).first();await ft.scrollIntoViewIfNeeded();
 const fr=await ft.boundingBox(),sr=await a.locator('#rightsidebar').boundingBox();
 await a.mouse.move(fr.x+fr.width/2,fr.y+fr.height/2);await a.mouse.down();await a.mouse.move(fr.x+fr.width/2+12,fr.y+fr.height/2,{steps:5});
 await a.locator('.owd-chat-drop-hint').waitFor();await a.mouse.move(sr.x+80,sr.y+sr.height-80,{steps:30});await a.mouse.up();await a.waitForTimeout(800);
 assert.equal(chats.length,2);assert.ok(chats[1].includes('Lame'));assert.equal(await a.locator('.owd-chat-drop-hint').isVisible(),false);

 await a.locator('#full').evaluate(f=>f.style.display='none');
 console.log('OK dépôt sur la couche complète rightsidebar depuis fiche ET boîte à outils, indication retirée');
 // Cancelling outside the sidebar sends no card and clears the indication.
 await tile.scrollIntoViewIfNeeded();const cancel=await tile.locator(':scope > .pc-obj-ph').boundingBox();
 await b.mouse.move(cancel.x+10,cancel.y+10);await b.mouse.down();await b.mouse.move(cancel.x+22,cancel.y+10,{steps:5});await b.locator('.owd-chat-drop-hint').waitFor();
 await b.mouse.move(1200,850,{steps:15});await b.mouse.up();await b.waitForTimeout(300);assert.equal(chats.length,2);assert.equal(await b.locator('.owd-chat-drop-hint').isVisible(),false);
 // A window with no sidebar has no target; dragging still finishes normally.
 await b.locator('#rightsidebar').evaluate(n=>n.remove());
 const noSide=await tile.locator(':scope > .pc-obj-ph').boundingBox();await b.mouse.move(noSide.x+10,noSide.y+10);await b.mouse.down();await b.mouse.move(noSide.x+22,noSide.y+10,{steps:5});await b.waitForTimeout(100);
 assert.equal(await b.locator('.owd-chat-drop-hint').isVisible(),false);await b.mouse.move(1200,850,{steps:10});await b.mouse.up();assert.equal(chats.length,2);
 console.log('OK annulation sans carte et absence de cible dans une fenêtre sans rightsidebar');
 await choose(wa,'other');await inv(wa).locator('[data-module="inv"]').waitFor();assert.equal(await inv(wa).locator('.pc-obj-tile').filter({hasText:'Pain'}).count(),1);await choose(wa,'shared');assert.equal(await ia.locator('.pc-obj-tile').filter({hasText:'Galette'}).count(),1);

 await a.waitForTimeout(13000);
 for(const f of a.frames().filter(f=>f.url().includes('/roll20-fiche.html'))){assert.equal(await f.locator('#owd-bandeau').filter({hasText:'ne répond plus'}).count(),0);}
 console.log('OK aucune famine des relectures avec plusieurs fiches du même personnage');
 readFails.add('shared');await a.waitForTimeout(14000);
 const sharedViews=a.frames().filter(f=>f.url().includes('/roll20-fiche.html#c=shared'));assert.equal(sharedViews.length,2);
 for(const f of sharedViews)assert.equal(await f.locator('#owd-bandeau').filter({hasText:'ne répond plus'}).count(),1);
 readFails.delete('shared');await a.waitForTimeout(2500);
 for(const f of sharedViews)assert.equal(await f.locator('#owd-bandeau').filter({hasText:'ne répond plus'}).count(),0);
 await a.locator('#full').evaluate(f=>f.remove());
 console.log('OK panne réelle signalée dans toutes les vues, avertissement retiré à la reprise');

 // Hidden tabs stay hydrated before selecting them.
 const inactive=wa.frameLocator('iframe[data-character="other"]');
 let changed=C.copy(C.read(states.other).state);const external=new C.Session(C.copy(states.other),changed);changed.inv.objets.find(o=>o.ref==='o2').nom='Pain distant';external.capture(changed);Object.assign(states.other,external.outgoing());
 await a.waitForTimeout(3000);assert.equal(await inactive.locator('.pc-obj-tile').filter({hasText:'Pain distant'}).count(),1);
 console.log('OK onglet masqué actualisé sans activation');
 // Native drag over a tab, delayed activation, then actual drop into the destination.
 const sourceTile=ia.locator('.pc-obj-tile').filter({hasText:'Galette'}).first();await sourceTile.scrollIntoViewIfNeeded();
 const sourceRect=await sourceTile.locator(':scope > .pc-obj-ph').boundingBox(),targetTab=await wa.locator('.inventaire-onglet[data-character="other"] .inventaire-tab').boundingBox();
 await a.mouse.move(sourceRect.x+10,sourceRect.y+10);await a.mouse.down();await a.mouse.move(sourceRect.x+22,sourceRect.y+10,{steps:5});
 await a.mouse.move(targetTab.x+targetTab.width/2,targetTab.y+targetTab.height/2,{steps:20});await a.waitForTimeout(750);
 assert.equal(await wa.locator('.inventaire-onglet[data-character="other"] .inventaire-tab').getAttribute('aria-selected'),'true');
 const destBox=await inv(wa).locator('[data-module="inv"]').boundingBox();await a.mouse.move(destBox.x+destBox.width/2,destBox.y+destBox.height-35,{steps:20});await a.mouse.up();
 await a.waitForFunction(()=>!document.querySelector('.owd-chat-drop-hint')||document.querySelector('.owd-chat-drop-hint').hidden);
 for(let i=0;i<100;i++){if(!C.read(states.shared).state.inv.objets.some(o=>o.ref==='o2'||o.ref==='o3'))break;await a.waitForTimeout(200);}
 assert.ok(!C.read(states.shared).state.inv.objets.some(o=>o.ref==='o2'));
 const transferred=C.read(states.other).state.inv.objets.find(o=>o.nom==='Galette');assert.equal(transferred.qte,5);assert.ok(transferred.ref.startsWith('ot'));assert.equal(transferred.desc,'Contenant personnel');const water=C.read(states.other).state.inv.objets.find(o=>o.dans===transferred.ref);assert.equal(water.nom,'Eau claire');assert.equal(water.qte,3);assert.equal(water.desc,'Eau du puits');assert.ok(!C.read(states.shared).state.inv.objets.some(o=>o.ref==='o3'));assert.equal(chats.length,2);
 assert.equal(await inv(wa).locator('.pc-obj-tile').filter({hasText:'Galette'}).count(),1);
 console.log('OK survol différé et transfert natif entre onglets, sans message au chat');
 // Closing/reopening keeps selection and excludes already assigned characters.
 await wa.locator('.inventaire-ajouter').click();assert.deepEqual(await wa.locator('select option').evaluateAll(os=>os.map(o=>o.value)),['','empty']);
 await wa.locator('.inventaire-fermer').filter({hasText:'×'}).last().click();
 await wa.locator('.inventaire-onglet[data-character="other"] .inventaire-fermer').click();await choose(wa,'other');
 await inv(wa).locator('.pc-obj-tile').filter({hasText:'Galette'}).waitFor();
 assert.equal(await inv(wa).locator('.pc-obj-tile').filter({hasText:'Galette'}).count(),1);
 assert.equal(await wa.locator('.inventaire-onglet[data-character="other"]').count(),1);
 console.log('OK fermeture, réouverture et mémorisation des onglets sans doublon');
 // Destination writes silently refused: never remove the source before confirmation.
 writeFails.add('shared');
 const retryTile=inv(wa).locator('.pc-obj-tile').filter({hasText:'Pain distant'}).first();await retryTile.scrollIntoViewIfNeeded();
 const rr=await retryTile.boundingBox(),st=await wa.locator('.inventaire-onglet[data-character="shared"] .inventaire-tab').boundingBox();
 await a.mouse.move(rr.x+rr.width/2,rr.y+rr.height/2);await a.mouse.down();await a.mouse.move(rr.x+rr.width/2+12,rr.y+rr.height/2,{steps:5});await a.mouse.move(st.x+st.width/2,st.y+st.height/2,{steps:20});await a.waitForTimeout(750);
 const sb=await inv(wa).locator('[data-module="inv"]').boundingBox();await a.mouse.move(sb.x+sb.width/2,sb.y+sb.height-35,{steps:20});await a.mouse.up();
 await wa.waitForFunction(()=>localStorage.getItem('owd-inventaire-transfert:test'));
 await a.waitForTimeout(2500);assert.ok(C.read(states.other).state.inv.objets.some(o=>o.nom==='Pain distant'));assert.ok(!C.read(states.shared).state.inv.objets.some(o=>o.nom==='Pain distant'));
 await a.reload();await a.locator('#owd-outil-inventaire').waitFor();if(!await a.locator('#owd-panneau-inventaire').isVisible())await a.locator('#owd-outil-inventaire').click();wa=await getView(a);
 assert.equal(await wa.locator('.inventaire-onglet[data-character="shared"]').count(),1);assert.equal(await wa.locator('.inventaire-onglet[data-character="other"]').count(),1);
 writeFails.delete('shared');
 for(let i=0;i<180;i++){if(!C.read(states.other).state.inv.objets.some(o=>o.nom==='Pain distant'))break;await a.waitForTimeout(250);}
 assert.ok(!C.read(states.other).state.inv.objets.some(o=>o.nom==='Pain distant'));assert.equal(C.read(states.shared).state.inv.objets.filter(o=>o.nom==='Pain distant').length,1);
 await wa.waitForFunction(()=>!localStorage.getItem('owd-inventaire-transfert:test'));
 console.log('OK destination refusée : source conservée ; reprise après fermeture, aucun doublon');

 await a.evaluate(()=>controls.shared='p2');await a.waitForTimeout(3000);assert.equal(await wa.locator('option[value="shared"]').count(),0);
 console.log('OK changement de personnage, état isolé, accès retiré');
 // Empty inventory must never create a sheet through the detached view.
 await choose(wa,'empty');await inv(wa).locator('#owd-roll20-note').filter({hasText:'pas encore de fiche'}).waitFor();assert.equal(writes.filter(w=>w.id==='empty').length,0);
 assert.deepEqual(errors,[]);console.log('OK personnage sans fiche : aucune création silencieuse ; aucune erreur navigateur');
 await b.screenshot({path:process.env.OUTILS_SCREENSHOT||'/tmp/owd-outils.png'});
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
