/* Harnais navigateur : vrai bundle et vrai pont, deux collections Backbone
 * indépendantes, serveur simulé partagé. Aucun compte Roll20 nécessaire.
 * NODE_PATH=/chemin/node_modules node scripts/test_notes_sync_browser.js
 * Dépendance de vérification : playwright + Chromium.
 */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'), path=require('node:path'), http=require('node:http'), assert=require('node:assert/strict');
const M=require('../docs/javascripts/owd-attr-map.js'), C=require('../docs/javascripts/owd-sync.js');
const root=path.resolve(__dirname,'..');
let attrs, writes=[], blockWrites=false;
const seed=M.blank();seed.v=M.SCHEMA;seed.rel=M.release();seed.etat.pe=100;seed.notes={format:1,messages:[{id:'original',text:'Note d’origine à préserver',mode:'plain',at:0}]};seed.name='Fiche partagée';
seed.comps=[{id:'c1',nom:'Lutte',groupe:'Physique',rang:1},{id:'c2',nom:'Évasion',groupe:'Physique',rang:2}];
seed.inv.objets=[{ref:'o1',id:'',nom:'Dague',qte:1,ou:'sac',arme:{attaque:'6',degats:'16',parade:'8',reduction:'6',modsDegats:['Dexterite','',''],modsParade:['','',''],type:'',comp:''}}, {ref:'o2',id:'',nom:'Pain',qte:5,ou:'sac'}];
attrs=C.Compact.encode(seed);
const meta=JSON.parse(attrs[C.Compact.BASE].current);meta.phase='ready';attrs[C.Compact.BASE].current=JSON.stringify(meta);
attrs.owd_version={current:String(seed.v),max:seed.rel};
attrs.owd_ops_historic={current:JSON.stringify({epoch:meta.epoch,ops:[{id:'pastA:1',clock:1,changes:[{k:'[[\"k\",\"name\"]]',before:['v',seed.name],n:['v','Nom A']}]},{id:'pastB:1',clock:2,changes:[{k:'[[\"k\",\"name\"]]',before:['v',seed.name],n:['v','Nom B']}]}]})};
function harness() { return `<!doctype html><meta charset="utf-8"><style>iframe{width:1500px;height:1000px}</style><script>
function model(data) {return {attributes:{...data},get(k){return this.attributes[k]},set(d){Object.assign(this.attributes,d)},save(data,opts){Object.assign(this.attributes,data||{});window.backend({kind:'write',data:this.attributes}).then(()=>opts&&opts.success&&opts.success())}}}
const collection={models:[],create(data){const m=model(data);this.models.push(m);return m},fetch(opts){window.backend({kind:'read'}).then(attrs=>{this.models=Object.keys(attrs).map(name=>model({name,...attrs[name]}));opts&&opts.success&&opts.success()})}};
const ch={id:'shared',attribs:collection,get(k){return k==='name'?'Fiche partagée':k==='controlledby'?'all':''}};
window.Campaign={characters:{get(id){return id==='shared'?ch:null},models:[ch]},players:{models:[]}};
</script><script data-owd-version="4.2.0" data-owd-mode="beta" data-owd-browser="firefox" src="/bridge.js"></script><iframe src="/roll20-fiche.html#c=shared"></iframe>`; }
const server=http.createServer((req,res)=> {
  const url=new URL(req.url,'http://localhost');let body,mime;
  if(url.pathname==='/harness'){body=harness();mime='text/html';}
  else if(url.pathname==='/bridge.js'){body=fs.readFileSync(path.join(root,'extension/firefox/beta/roll20-page.js'));mime='text/javascript';}
  else {let file=path.join(root,'docs',decodeURIComponent(url.pathname));if(!fs.existsSync(file))file=path.join(root,'site',decodeURIComponent(url.pathname));if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return;}body=fs.readFileSync(file);mime=file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream';}
  const send=()=>{res.writeHead(200,{'content-type':mime});res.end(body);};
  if(url.pathname.endsWith('/owd-creation.json'))setTimeout(send,800);else send();
});
(async()=> {
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE || chromium.executablePath(),args:['--no-sandbox']});const errors=[];
  try {
    const ctx=await browser.newContext({viewport:{width:1600,height:1100}});
    await ctx.addInitScript(()=>{if(localStorage.getItem('recovery-fixture'))return;
      localStorage.setItem('recovery-fixture','1');localStorage.setItem('owd-operations-v2:partie:shared:old','{invalid');sessionStorage.setItem('owd-session-v2','old');
      localStorage.setItem('owd-pending-v2:shared:corrupt','{invalid');
      localStorage.setItem('owd-pending-v2:shared:old',JSON.stringify({epoch:'previous-format',payloads:{},ops:[{id:'offline:1',clock:1,changes:[{k:'[["k","notes"]]',before:['v','Note d’origine à préserver'],n:['v','Note locale hors ligne']}]}]}));
    });
    await ctx.exposeBinding('backend',async(_,m)=>{
      if(m.kind==='read'){await new Promise(r=>setTimeout(r,70));return C.copy(attrs);}
      if(m.kind==='write'){if(blockWrites && (m.data.name.startsWith(C.PREFIX)||m.data.name.startsWith(C.Compact.PREFIX)))return;await new Promise(r=>setTimeout(r,30));attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};writes.push(m.data.name);}
    });
    const pages=[await ctx.newPage()];pages.forEach(p=>p.on('pageerror',e=>errors.push(e.message)));
    await Promise.all(pages.map(p=>p.goto(url+'/harness')));
    const frames=pages.map(p=>p.frameLocator('iframe'));
    const a=frames[0];
    await a.locator('.pc-sheet').waitFor({timeout:30000});await a.locator('#owd-mode-switch').click();
    assert.equal(C.Compact.read(attrs).state.notes.messages.length,1);
    assert.equal(await a.locator('#owd-local-recovery').count(),0);
    const storageKeys=await pages[0].evaluate(()=>Object.keys(localStorage));assert.ok(!storageKeys.some(k=>/^owd-(pending|recovery|operations|verified-base)-v2:/.test(k)));
    // Un nouveau conflit réel sur le même champ n’affiche aucun bandeau.
    attrs.owd_ops_new_conflict={current:JSON.stringify({epoch:meta.epoch,ops:[{id:'peerA:1',clock:40,changes:[{k:'[["k","name"]]',before:['v','Nom B'],n:['v','Premier nom']}]},{id:'peerB:1',clock:41,changes:[{k:'[["k","name"]]',before:['v','Nom B'],n:['v','Dernier nom']}]}]})};
    await pages[0].waitForFunction(()=>JSON.parse(document.querySelector('iframe').contentWindow.__owdLocalStorage.getItem('owd-perso')).name==='Dernier nom');
    assert.ok(C.Compact.read(attrs).conflicts.length);assert.equal(await a.locator('body').innerText().then(t=>t.includes('Des modifications simultanées')),false);
    // Une sauvegarde normale persiste ; le statut suit sa confirmation.
    await a.locator('[data-module="pe"] .pc-vital-num').fill('91');
    for(let i=0;i<120&&C.Compact.read(attrs).state.etat.pe!==91;i++)await pages[0].waitForTimeout(100);assert.equal(C.Compact.read(attrs).state.etat.pe,91);
    await a.locator('#owd-save-status').filter({hasText:'Enregistré'}).waitFor();
    // Roll20 refuse les écritures : la saisie demeure dans cette page seulement.
    blockWrites=true;await a.locator('[data-module="pe"] .pc-vital-num').fill('77');
    await a.locator('#owd-save-status').filter({hasText:'Enregistrement en cours'}).waitFor();
    await pages[0].waitForTimeout(1800);assert.equal(C.Compact.read(attrs).state.etat.pe,91);
    const sheetFrame=pages[0].frames().find(f=>f.url().includes('roll20-fiche.html'));const reopenedUrl=new URL(sheetFrame.url());reopenedUrl.searchParams.set('reload','1');await sheetFrame.goto(reopenedUrl.href);await a.locator('.pc-sheet').waitFor();
    assert.equal(await a.locator('[data-module="pe"] .pc-vital-num').inputValue(),'91');
    blockWrites=false;await a.locator('#owd-mode-switch').click();await a.locator('[data-module="pe"] .pc-vital-num').fill('83');
    for(let i=0;i<120&&C.Compact.read(attrs).state.etat.pe!==83;i++)await pages[0].waitForTimeout(100);assert.equal(C.Compact.read(attrs).state.etat.pe,83,'aucun rejeu de la dépense abandonnée');
    // Même comportement après rechargement de toute la partie.
    blockWrites=true;await a.locator('[data-module="pe"] .pc-vital-num').fill('65');await pages[0].waitForTimeout(1800);await pages[0].reload();await a.locator('.pc-sheet').waitFor();assert.equal(await a.locator('[data-module="pe"] .pc-vital-num').inputValue(),'83');blockWrites=false;
    assert.equal(await a.locator('#owd-local-recovery').count(),0);assert.equal(await a.locator('body').innerText().then(t=>t.includes('Des modifications simultanées')),false);
    const after=await pages[0].evaluate(()=>Object.keys(localStorage));assert.ok(!after.some(k=>/^owd-(pending|recovery|operations|verified-base)-v2:/.test(k)));
    assert.deepEqual(errors,[]);console.log('OK navigateur : anciens caches ignorés et retirés, conflit silencieux, confirmation visible, écritures refusées, rechargement de fiche puis de partie sans reprise, nouvelle saisie sauvegardée.');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
