/* Vrai pont Roll20 et vraie fiche : ouverture, consultation, présence et erreurs. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const M=require('../docs/javascripts/owd-attr-map.js'),C=require('../docs/javascripts/owd-sync.js').Compact;
const root=path.resolve(__dirname,'..');let attrs,block=false,latest='4.2.0',metadataFailure=false,filesFailure=false;
function reset(){const s=M.blank();s.name='Campagne longue';s.etat.pe=100;s.etat.pv=100;s.rel=M.release();
s.comps=Array.from({length:150},(_,i)=>({id:'c'+i,nom:'Compétence '+i,rang:i%6,groupe:'Groupe '+Math.floor(i/10)}));
s.inv.objets=Array.from({length:150},(_,i)=>({ref:'o'+i,nom:'Objet '+i,qte:1,ou:'sac',taille:'Minuscule',description:'Description de campagne. '.repeat(12)}));
s.notes={format:1,messages:Array.from({length:600},(_,i)=>({id:'n'+i,text:'Note '+i+' '+ 'Texte de campagne. '.repeat(15),mode:i%2?'plain':'markdown',at:i*1000}))};
attrs=C.encode(s);const meta=JSON.parse(attrs.owd_storage.current);meta.phase='ready';meta.cleanupComplete=true;attrs.owd_storage.current=JSON.stringify(meta);attrs.owd_version={current:String(s.v),max:s.rel};}
function harness(player){return `<!doctype html><meta charset="utf-8"><style>iframe{width:1100px;height:850px}</style><script>
function model(data){return {attributes:{...data},get(k){return this.attributes[k]},set(d){Object.assign(this.attributes,d)},save(d,o){Object.assign(this.attributes,d||{});backend({kind:'write',data:this.attributes}).then(()=>o&&o.success&&o.success())}}}
const col={models:[],create(d){const m=model(d);this.models.push(m);return m},fetch(o){backend({kind:'read'}).then(a=>{this.models=Object.keys(a).map(name=>model({name,...a[name]}));o&&o.success&&o.success()})}};
const ch={id:'test',attribs:col,get:k=>k==='controlledby'?'all':k==='name'?'Personnage test':''};window.Campaign={id:'game',characters:{get:id=>id==='test'?ch:null,models:[ch]},players:{models:[]}};
window.currentPlayer={id:${JSON.stringify(player)},get:k=>k==='displayname'?${JSON.stringify(player)}:null};</script><script data-owd-version="4.2.0" data-owd-mode="beta" data-owd-browser="firefox" src="/bridge.js"></script><iframe id="sheet" src="/roll20-fiche.html#c=test"></iframe>`;}
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://local');if(u.pathname==='/harness'){res.setHeader('Content-Type','text/html');return res.end(harness(u.searchParams.get('player')||'Alice'));}if(u.pathname==='/download/ext-signed.json'){res.setHeader('Content-Type','application/json');res.statusCode=metadataFailure?503:200;return res.end(JSON.stringify({version:latest}));}if(filesFailure&&(u.pathname==='/owd-creation.json'||u.pathname==='/owd-creation-runtime.json')){res.statusCode=503;return res.end();}let file=u.pathname==='/bridge.js'?path.join(root,'extension/firefox/beta/roll20-page.js'):path.join(root,'docs',u.pathname);if(!fs.existsSync(file))file=path.join(root,'site',u.pathname);if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.statusCode=404;return res.end();}res.setHeader('Content-Type',({'.js':'application/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});

// Mesure reproductible, sans compte Roll20 : mêmes données et mêmes gestes avant/après.
(async()=>{reset();await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const context=await browser.newContext({viewport:{width:1250,height:1000}});let reads=0,writes=0;const errors=[];
 await context.addInitScript(()=>{const counts={parse:0,stringify:0,parseMs:0,stringifyMs:0,longTasks:0,longMs:0};window.__perf=counts;
 for(const key of ['parse','stringify']){const original=JSON[key];JSON[key]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{counts[key]++;counts[key+'Ms']+=performance.now()-t;}};}
 try{new PerformanceObserver(list=>{for(const e of list.getEntries()){counts.longTasks++;counts.longMs+=e.duration;}}).observe({type:'longtask',buffered:true});}catch(e){}
 });
 await context.exposeBinding('backend',async(_,m)=>{if(m.kind==='read'){reads++;return JSON.parse(JSON.stringify(attrs));}if(m.kind==='write'){writes++;attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};}});
 const pages=[],frames=[];const t0=Date.now();for(const player of ['Alice','Bob']){const p=await context.newPage();pages.push(p);p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port+'/harness?player='+player);await p.frameLocator('#sheet').locator('#owd-mode-bar').waitFor({timeout:60000});frames.push(p.frames().find(f=>f.url().includes('roll20-fiche.html')));}
 const openMs=Date.now()-t0;await pages[0].frameLocator('#sheet').locator('#owd-mode-switch').click();await new Promise(r=>setTimeout(r,2500));
 const snapshot=async()=>({views:await Promise.all(frames.map(f=>f.evaluate(()=>({...__perf})))),reads,writes});
 const start=await snapshot();const cdp=await context.newCDPSession(pages[0]);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');await new Promise(r=>setTimeout(r,10000));const idle=await snapshot();
 const inp=pages[0].frameLocator('#sheet').locator('[data-module="pe"] .pc-vital-num');const editStart=Date.now();await inp.fill('79');await pages[0].waitForFunction(()=>JSON.parse(document.querySelector('iframe').contentWindow.__owdLocalStorage.getItem('owd-perso')).etat.pe===79);const inputMs=Date.now()-editStart;
 for(let i=0;i<200&&C.read(attrs).state.etat.pe!==79;i++)await new Promise(r=>setTimeout(r,100));assert.equal(C.read(attrs).state.etat.pe,79);
 await pages[1].waitForFunction(()=>JSON.parse(document.querySelector('iframe').contentWindow.__owdLocalStorage.getItem('owd-perso')).etat.pe===79,{timeout:30000});const edit=await snapshot();
 const {profile}=await cdp.send('Profiler.stop');const hits={};for(const node of profile.nodes)if(node.hitCount)hits[node.callFrame.functionName||'(anonymous)']=(hits[node.callFrame.functionName||'(anonymous)']||0)+node.hitCount;
 const delta=(a,b)=>({reads:b.reads-a.reads,writes:b.writes-a.writes,views:b.views.map((v,i)=>Object.fromEntries(Object.keys(v).map(k=>[k,Math.round((v[k]-a.views[i][k])*100)/100])))});
 const result={fixture:{items:150,skills:150,notes:600,views:2},openMs,inputMs,idle10s:delta(start,idle),edit:delta(idle,edit),profileTop:Object.entries(hits).sort((a,b)=>b[1]-a[1]).slice(0,15),errors};assert.deepEqual(errors,[]);if(!process.env.OWD_PERF_BASELINE)assert.ok(result.idle10s.views.every(v=>v.parse+v.stringify<15000),'Une vue inchangée retraite le personnage');fs.writeFileSync(process.env.OWD_PERF_OUTPUT||'/tmp/owd-performance.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await context.close();
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
