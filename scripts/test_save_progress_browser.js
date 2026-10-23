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
window.currentPlayer={id:${JSON.stringify(player)},get:k=>k==='displayname'?${JSON.stringify(player)}:null};</script><script data-owd-version="4.2.0" data-owd-mode="beta" data-owd-browser="firefox" src="/bridge.js"></script><iframe id="sheet" src="/roll20-fiche.html#c=test"></iframe>`;}
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://local');if(u.pathname==='/harness'){res.setHeader('Content-Type','text/html');return res.end(harness(u.searchParams.get('player')||'Alice'));}if(u.pathname==='/download/ext-signed.json'){res.setHeader('Content-Type','application/json');res.statusCode=metadataFailure?503:200;return res.end(JSON.stringify({version:latest}));}if(filesFailure&&(u.pathname==='/owd-creation.json'||u.pathname==='/owd-creation-runtime.json')){res.statusCode=503;return res.end();}let file=u.pathname==='/bridge.js'?path.join(root,'extension/firefox/beta/roll20-page.js'):path.join(root,'docs',u.pathname);if(!fs.existsSync(file))file=path.join(root,'site',u.pathname);if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.statusCode=404;return res.end();}res.setHeader('Content-Type',({'.js':'application/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});

(async()=>{reset();await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});const errors=[];let held=null;
try{const context=await browser.newContext({viewport:{width:1250,height:1000}});
 await context.exposeBinding('backend',async(_,m)=>{if(m.kind==='read')return JSON.parse(JSON.stringify(attrs));if(m.kind==='write'){if(block&&m.data.name.startsWith('owd_ops_')){held=JSON.parse(JSON.stringify(m.data));return;}attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/harness?player=Alice');
 const sheet=page.frameLocator('#sheet'),frame=()=>page.frames().find(f=>f.url().includes('roll20-fiche.html'));
 const wait=async fn=>{for(let i=0;i<150&&!(await fn());i++)await new Promise(r=>setTimeout(r,100));assert.ok(await fn());};
 await sheet.locator('#owd-mode-bar').waitFor();await sheet.locator('#owd-mode-switch').click();await sheet.locator('[data-module="pe"] .pc-vital-num').waitFor();
 assert.equal(await sheet.locator('.owd-save-outline').count(),0,'aucune animation à l’ouverture');
 const layout=await frame().evaluate(()=>{const b=document.querySelector('#owd-mode-bar'),l=b.querySelector('.owd-mode-controls'),r=b.querySelector('.owd-mode-presence');return {height:b.getBoundingClientRect().height,left:l.getBoundingClientRect().right,right:r.getBoundingClientRect().left,bg:getComputedStyle(b).backgroundColor,panel:getComputedStyle(document.querySelector('[data-module="pe"]')).backgroundColor};});assert.ok(layout.height<55,JSON.stringify(layout));assert.ok(layout.left<layout.right);assert.equal(layout.bg,layout.panel);
 await page.screenshot({path:'/tmp/4200-mode-night.png'});
 block=true;await sheet.locator('[data-module="pe"] .pc-vital-num').fill('77');
 await sheet.locator('[data-module="pe"][data-owd-save-phase="pending"] .owd-save-outline').waitFor();
 assert.equal(await sheet.locator('[data-module="notes"] .owd-save-outline').count(),0);
 await new Promise(r=>setTimeout(r,12000));
 let off=await sheet.locator('[data-module="pe"] .owd-save-outline path').evaluate(n=>parseFloat(getComputedStyle(n).strokeDashoffset));assert.ok(off<.27&&off>.20,'¾ du contour en 12 s : '+off);
 await sheet.locator('[data-module="pe"] .pc-vital-num').fill('76');off=await sheet.locator('[data-module="pe"] .owd-save-outline path').evaluate(n=>parseFloat(getComputedStyle(n).strokeDashoffset));assert.ok(off>.95,'nouvelle saisie repart de zéro : '+off);
 await wait(()=>held&&JSON.parse(held.current).ops.length>=2);
 const box=JSON.parse(held.current);attrs[held.name]={current:JSON.stringify({...box,ops:[box.ops[0]]}),max:''};await new Promise(r=>setTimeout(r,1800));assert.equal(await sheet.locator('[data-module="pe"]').getAttribute('data-owd-save-phase'),'pending','confirmation précédente ne termine pas la nouvelle saisie');
 // Remontage pendant l’attente : même cycle conservé, aucune duplication.
 await frame().evaluate(()=>Owd.remonte());assert.equal(await sheet.locator('[data-module="pe"] .owd-save-outline').count(),1);
 const delay=Date.now();block=false;await wait(()=>C.read(attrs).state.etat.pe===76);await wait(async()=>await sheet.locator('[data-module="pe"] .owd-save-outline').count()===0);assert.ok(Date.now()-delay<12000);assert.equal(attrs.owd_pe.current,'76');
 // Une action change plusieurs attributs et des valeurs calculées ailleurs.
 block=true;await sheet.locator('[data-eff-partie="alcool"] input[aria-label="Alcool — Base"]').fill('2');
 await sheet.locator('[data-module="effondrement"][data-owd-save-phase="pending"]').waitFor();
 for(const id of ['pv','pe','pm'])assert.equal(await sheet.locator('[data-module="'+id+'"] .owd-save-outline').count(),1,'module dépendant '+id);
 assert.equal(await sheet.locator('[data-module="mouvement"] .owd-save-outline').count(),0,'mouvement inchangé');
 await page.screenshot({path:'/tmp/4200-contours-night.png'});
 block=false;await wait(()=>C.read(attrs).state.effAlcool===2);await wait(async()=>await sheet.locator('.owd-save-outline').count()===0);
 // Un changement de thème et une vue étroite restent dans la palette, sans débordement.
 await frame().evaluate(()=>{document.documentElement.classList.remove('night');});await page.screenshot({path:'/tmp/4200-mode-day.png'});
 await page.locator('#sheet').evaluate(n=>n.style.width='380px');await new Promise(r=>setTimeout(r,250));
 const narrow=await frame().evaluate(()=>{const b=document.querySelector('#owd-mode-bar');return {width:b.clientWidth,scroll:b.scrollWidth,height:b.getBoundingClientRect().height};});assert.ok(narrow.scroll<=narrow.width);assert.ok(narrow.height<100);await frame().evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'/tmp/4200-mode-narrow.png'});
 assert.deepEqual(errors,[]);console.log('OK vrai pont + fiche : contour à 75 % en 12 s, réinitialisation, ancienne confirmation ignorée, miroirs relus, remontage, effets automatiques PV/PE/PM, modules inchangés exclus ; bandeau compact jour/nuit et étroit.');await context.close();
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
