/* Vrai pont Roll20 et vraie fiche : ouverture, consultation, présence et erreurs. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const M=require('../docs/javascripts/owd-attr-map.js'),C=require('../docs/javascripts/owd-sync.js').Compact;
const root=path.resolve(__dirname,'..');let attrs,block=false,latest='4.2.0',metadataFailure=false,filesFailure=false;
function reset(release){const s=M.blank();s.name='Personnage test';s.etat.pe=100;s.etat.pv=100;s.rel=release||M.release();s.comps=[{id:'c1',nom:'Lutte',rang:1,groupe:'Physique'}];attrs=C.encode(s);const meta=JSON.parse(attrs.owd_storage.current);meta.phase='ready';attrs.owd_storage.current=JSON.stringify(meta);attrs.owd_version={current:String(s.v),max:s.rel};block=false;latest='4.2.0';metadataFailure=false;filesFailure=false;}
function harness(player){return `<!doctype html><meta charset="utf-8"><style>iframe{width:1100px;height:850px}</style><script>
function model(data){return {attributes:{...data},get(k){return this.attributes[k]},set(d){Object.assign(this.attributes,d)},save(d,o){Object.assign(this.attributes,d||{});backend({kind:'write',data:this.attributes}).then(()=>o&&o.success&&o.success())}}}
const col={models:[],create(d){const m=model(d);this.models.push(m);return m},fetch(o){backend({kind:'read'}).then(a=>{this.models=Object.keys(a).map(name=>model({name,...a[name]}));o&&o.success&&o.success()})}};
const ch={id:'test',attribs:col,get:k=>k==='controlledby'?'all':k==='name'?'Personnage test':''};window.Campaign={id:'game',characters:{get:id=>id==='test'?ch:null,models:[ch]},players:{models:[]}};
window.currentPlayer={id:${JSON.stringify(player)},get:k=>k==='displayname'?${JSON.stringify(player)}:null};</script><script data-owd-version="4.2.0" data-owd-mode="beta" data-owd-browser="firefox" src="/bridge.js"></script><iframe id="sheet" src="/roll20-fiche.html#c=test&view=inventaire"></iframe>`;}
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://local');if(u.pathname==='/harness'){res.setHeader('Content-Type','text/html');return res.end(harness(u.searchParams.get('player')||'Alice'));}if(u.pathname==='/download/ext-signed.json'){res.setHeader('Content-Type','application/json');res.statusCode=metadataFailure?503:200;return res.end(JSON.stringify({version:latest}));}if(filesFailure&&(u.pathname==='/owd-creation.json'||u.pathname==='/owd-creation-runtime.json')){res.statusCode=503;return res.end();}let file=u.pathname==='/bridge.js'?path.join(root,'extension/firefox/beta/roll20-page.js'):path.join(root,'docs',u.pathname);if(!fs.existsSync(file))file=path.join(root,'site',u.pathname);if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.statusCode=404;return res.end();}res.setHeader('Content-Type',({'.js':'application/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});

(async()=>{reset();const state=C.read(attrs).state;
 const water={ref:'water',nom:'Clean Water',qte:2,contenu:'liquide',poids:.1,encombre:.1,ou:'terre',img:'assets/equipements/p-es-1-main-iron-sword.png'};
 state.inv.objets=[{ref:'vial',nom:'Vial',qte:1,contenant:'liquide',ou:'terre'},water,{...water,ref:'extra',qte:3},{...water,ref:'antidote',nom:'Antidote'},{...water,ref:'powder',nom:'Powder',contenu:'poudre'}];attrs=C.encode(state);const meta=JSON.parse(attrs.owd_storage.current);meta.phase='ready';attrs.owd_storage.current=JSON.stringify(meta);attrs.owd_version={current:String(state.v),max:state.rel};
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});const errors=[];
 try{const context=await browser.newContext({viewport:{width:1250,height:1000}});await context.exposeBinding('backend',async(_,m)=>{if(m.kind==='read')return JSON.parse(JSON.stringify(attrs));if(m.kind==='write')attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};});
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port+'/harness?player=Alice');const f=p.frameLocator('#sheet'),inv=f.locator('[data-module="inv"]');await inv.waitFor();await f.locator('#owd-mode-switch').click();
 const tile=ref=>inv.locator('.pc-obj-tile[data-object-ref="'+ref+'"]').first(),slot=()=>tile('vial').locator('.pc-obj-content-slot'),items=()=>C.read(attrs).state.inv.objets;
 const wait=async fn=>{for(let i=0;i<150&&!(await fn());i++)await new Promise(r=>setTimeout(r,100));assert.ok(await fn());};
 assert.equal(await slot().count(),1);assert.equal(await slot().innerText(),'+');
 const box=await slot().boundingBox(),parent=await tile('vial').boundingBox();assert.ok(box.width>parent.width*.35&&box.width<parent.width*.4);
 await tile('water').dragTo(slot());await wait(()=>items().some(o=>o.ref==='water'&&o.dans==='vial'));
 assert.equal(await slot().count(),1);assert.equal(await slot().getAttribute('class').then(s=>s.includes('plein')),true);assert.equal(await slot().locator('img').count(),1);assert.equal(await slot().locator('.pc-obj-content-qte').innerText(),'x 2');assert.equal(await tile('vial').locator('.pc-obj-content-slot.vide').count(),0);
 await tile('antidote').dragTo(slot());await inv.locator('.pc-obj-panel').waitFor();assert.equal(items().find(o=>o.ref==='antidote').dans||'','');assert.equal(await slot().locator('.pc-obj-content-qte').innerText(),'x 2');
 await tile('extra').dragTo(slot());await wait(()=>items().find(o=>o.ref==='water').qte===5);assert.equal(items().some(o=>o.ref==='extra'),false);assert.equal(await slot().count(),1);assert.equal(await slot().locator('.pc-obj-content-qte').innerText(),'x 5');
 await tile('powder').dragTo(slot());assert.equal(items().find(o=>o.ref==='powder').dans||'','');assert.equal(items().filter(o=>o.dans==='vial').length,1);
 // Le contenu reste sélectionnable et ne déplace pas la case.
 await slot().click();
 const panel=inv.locator('.pc-obj-panel');assert.equal(await panel.locator('.nm').inputValue(),'Clean Water');
 const after=await slot().boundingBox();assert.ok(Math.abs(after.width-box.width)<1);
 assert.deepEqual(errors,[]);console.log('OK contenants : une case agrandie, contenu dedans, quantité fusionnée, mélange et mauvaise catégorie refusés, contenu sélectionnable.');await context.close();
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
