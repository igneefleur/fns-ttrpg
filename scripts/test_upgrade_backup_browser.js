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
const seed=M.blank();seed.v=17;seed.rel='4.5.2b';seed.notes='Note d’origine à préserver';seed.name='Fiche partagée';
seed.comps=[{id:'c1',nom:'Lutte',groupe:'Physique',rang:1},{id:'c2',nom:'Évasion',groupe:'Physique',rang:2}];
seed.inv.objets=[{ref:'o1',id:'',nom:'Dague',qte:1,ou:'sac',arme:{attaque:'6',degats:'16',parade:'8',reduction:'6',modsDegats:['Dexterite','',''],modsParade:['','',''],type:'',comp:''}}, {ref:'o2',id:'',nom:'Pain',qte:5,ou:'sac'}];
attrs=C.Compact.encode(seed);
const meta=JSON.parse(attrs[C.Compact.BASE].current);meta.phase='ready';attrs[C.Compact.BASE].current=JSON.stringify(meta);
attrs.owd_version={current:'17',max:'4.5.2b'};
function harness() { return `<!doctype html><meta charset="utf-8"><style>iframe{width:1500px;height:1000px}</style><script>
function model(data) {return {attributes:{...data},get(k){return this.attributes[k]},set(d){Object.assign(this.attributes,d)},save(data,opts){Object.assign(this.attributes,data||{});window.backend({kind:'write',data:this.attributes}).then(()=>opts&&opts.success&&opts.success())}}}
const collection={models:[],create(data){const m=model(data);this.models.push(m);return m},fetch(opts){window.backend({kind:'read'}).then(attrs=>{this.models=Object.keys(attrs).map(name=>model({name,...attrs[name]}));opts&&opts.success&&opts.success()})}};
const ch={id:'shared',attribs:collection,get(k){return k==='name'?'Fiche partagée':k==='controlledby'?'all':''}};
window.Campaign={characters:{get(id){return id==='shared'?ch:null},models:[ch]},players:{models:[]}};
</script><script src="/bridge.js"></script><iframe src="/roll20-fiche.html#c=shared"></iframe>`; }
const server=http.createServer((req,res)=> {
  const url=new URL(req.url,'http://localhost');let body,mime;
  if(url.pathname==='/harness'){body=harness();mime='text/html';}
  else if(url.pathname==='/bridge.js'){body=fs.readFileSync(path.join(root,'extension/firefox/beta/roll20-page.js'));mime='text/javascript';}
  else {const file=path.join(root,'site',decodeURIComponent(url.pathname));if(!file.startsWith(path.join(root,'site'))||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return;}body=fs.readFileSync(file);mime=file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream';}
  res.writeHead(200,{'content-type':mime});res.end(body);
});
(async()=> {
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE || chromium.executablePath(),args:['--no-sandbox']});const errors=[];
  try {
    const ctx=await browser.newContext({viewport:{width:1600,height:1100}});
    await ctx.exposeBinding('backend',async(_,m)=>{
      if(m.kind==='read'){await new Promise(r=>setTimeout(r,70));return C.copy(attrs);}
      if(m.kind==='write'){if(blockWrites && (m.data.name.startsWith(C.PREFIX)||m.data.name.startsWith(C.Compact.PREFIX)))return;await new Promise(r=>setTimeout(r,30));attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};writes.push(m.data.name);}
    });
    const pages=[await ctx.newPage()];pages.forEach(p=>p.on('pageerror',e=>errors.push(e.message)));
    await Promise.all(pages.map(p=>p.goto(url+'/harness')));
    const frames=pages.map(p=>p.frameLocator('iframe'));
    const a=frames[0];
    await a.locator('[data-owd-act="monter"]').click();
    await a.locator('.pc-sheet').waitFor({timeout:30000});
    await pages[0].waitForFunction(()=>JSON.parse(document.querySelector('iframe').contentWindow.__owdLocalStorage.getItem('owd-perso')).v===18);
    for(let i=0;i<150&&C.Compact.read(attrs).state.v!==18;i++)await pages[0].waitForTimeout(100);
    const now=C.Compact.read(attrs);assert.equal(now.state.v,18);assert.equal(now.state.notes.messages[0].text,'Note d’origine à préserver');assert.ok(now.ops.some(o=>o.legacyBackup&&o.legacyBackup.fragments.some(f=>f.name==='owd_backup')));assert.equal(writes.includes('owd_backup'),false);
    await a.locator('[data-owd-act="restaurer"]').click();
    for(let i=0;i<150&&C.Compact.read(attrs).state.v!==17;i++)await pages[0].waitForTimeout(100);
    assert.equal(C.Compact.read(attrs).state.v,17);assert.equal(C.Compact.read(attrs).state.notes,'Note d’origine à préserver');
    await pages[0].reload();await a.locator('[data-owd-act="monter"]').click();await a.locator('.pc-sheet').waitFor();
    for(let i=0;i<150&&C.Compact.read(attrs).state.v!==18;i++)await pages[0].waitForTimeout(100);assert.equal(C.Compact.read(attrs).state.v,18);
    console.log('OK restauration vérifiée puis nouvelle mise à niveau.');
    await a.locator('.pc-tab').filter({hasText:'Bio'}).click();await a.locator('.pc-notes-input').fill('Après mise à niveau');await a.locator('.pc-notes-compose').getByRole('button',{name:'Envoyer',exact:true}).click();
    await pages[0].waitForFunction(()=>JSON.parse(document.querySelector('iframe').contentWindow.__owdLocalStorage.getItem('owd-perso')).notes.messages.length===2);
    for(let i=0;i<150&&C.Compact.read(attrs).state.notes.messages.length!==2;i++)await pages[0].waitForTimeout(100);assert.equal(C.Compact.read(attrs).state.notes.messages.length,2);
    await pages[0].reload();await a.locator('.pc-sheet').waitFor();await pages[0].waitForFunction(()=>JSON.parse(document.querySelector('iframe').contentWindow.__owdLocalStorage.getItem('owd-perso')).notes.messages.length===2);
    assert.ok(C.Compact.read(attrs).ops.some(o=>o.legacyBackup&&o.legacyBackup.fragments.some(f=>f.name==='owd_backup')));
    console.log('OK mise à niveau réelle 17 → 18 : ancien pont inchangé, sauvegarde relue, notes conservées et nouvelles notes persistées après rechargement.');
    assert.ok(!writes.includes('owd_state'),'aucune photographie complète réécrite');
    assert.deepEqual(errors,[]);
    console.log('OK réouverture, état fusionné, aucune écriture owd_state, aucune erreur navigateur');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
