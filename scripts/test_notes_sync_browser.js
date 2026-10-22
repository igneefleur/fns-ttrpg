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
const seed=M.blank();seed.v=M.SCHEMA;seed.rel=M.release();seed.name='Fiche partagée';
seed.comps=[{id:'c1',nom:'Lutte',groupe:'Physique',rang:1},{id:'c2',nom:'Évasion',groupe:'Physique',rang:2}];
seed.inv.objets=[{ref:'o1',id:'',nom:'Dague',qte:1,ou:'sac',arme:{attaque:'6',degats:'16',parade:'8',reduction:'6',modsDegats:['Dexterite','',''],modsParade:['','',''],type:'',comp:''}}, {ref:'o2',id:'',nom:'Pain',qte:5,ou:'sac'}];
attrs=C.Compact.encode(seed);
const meta=JSON.parse(attrs[C.Compact.BASE].current);meta.phase='ready';attrs[C.Compact.BASE].current=JSON.stringify(meta);
attrs.owd_version={current:String(M.SCHEMA),max:M.release()};
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
    const pages=await Promise.all([ctx.newPage(),ctx.newPage()]);pages.forEach(p=>p.on('pageerror',e=>errors.push(e.message)));
    await Promise.all(pages.map(p=>p.goto(url+'/harness')));
    const frames=pages.map(p=>p.frameLocator('iframe'));
    await Promise.all(frames.map(async f=>{await f.locator('#owd-mode-bar').waitFor();await f.locator('#owd-mode-switch').click();}));
    const [a,b]=frames;
    // Live notes and a simultaneous PE change, using real input handlers.
    await a.locator('.pc-tab').filter({hasText:'Bio'}).click();
    const notes=a.locator('[data-module="notes"] .pc-notes-input');
    async function sendNote(text){await notes.fill(text);await a.locator('.pc-notes-compose').getByRole('button',{name:'Envoyer',exact:true}).click();}
    await sendNote('Texte partagé');await notes.fill('Brouillon conservé');await notes.evaluate(n=>{n.focus();n.setSelectionRange(5,5)});
    const pe=b.locator('[data-module="pe"] .pc-vital-num');await pe.fill('77');
    await pages[1].waitForFunction(()=>{const f=document.querySelector('iframe');return f.contentWindow.__owdLocalStorage.getItem('owd-perso').includes('Texte partagé')});
    await pages[0].waitForTimeout(3000);
    const focused=await notes.evaluate(n=>({focus:document.activeElement===n,start:n.selectionStart,value:n.value}));
    assert.equal(C.read(attrs).state.etat.pe,77);
    assert.equal(focused.focus,true);assert.equal(focused.start,5);assert.equal(focused.value,'Brouillon conservé');
    console.log('OK réception en direct, modifications simultanées, focus et curseur conservés');
    await b.locator('.pc-tab').filter({hasText:'Bio'}).click();
    const notesB=b.locator('[data-module="notes"] .pc-notes-input');
    await Promise.all([sendNote('Message du client A'),(async()=>{await notesB.fill('Message du client B');await b.locator('.pc-notes-compose').getByRole('button',{name:'Envoyer',exact:true}).click();})()]);
    await pages[0].waitForFunction(()=>{const s=JSON.parse(document.querySelector('iframe').contentWindow.__owdLocalStorage.getItem('owd-perso'));return s.notes.messages.some(m=>m.text==='Message du client B');});
    await pages[1].waitForFunction(()=>{const s=JSON.parse(document.querySelector('iframe').contentWindow.__owdLocalStorage.getItem('owd-perso'));return s.notes.messages.some(m=>m.text==='Message du client A');});
    const current=C.read(attrs).state;assert.equal(current.notes.messages.length,3);assert.equal(new Set(current.notes.messages.map(m=>m.id)).size,3);assert.equal(current.etat.pe,77);
    assert.deepEqual(Object.keys(attrs).filter(n=>/^owd_block_notes$/.test(n)),['owd_block_notes']);
    await pages[1].reload();await b.locator('.pc-sheet').waitFor();await b.locator('#owd-mode-bar').waitFor();if(await b.locator('#owd-mode-switch').textContent()==='Passer en Mode Edition')await b.locator('#owd-mode-switch').click();await pages[1].waitForFunction(()=>JSON.parse(document.querySelector('iframe').contentWindow.__owdLocalStorage.getItem('owd-perso')).notes.messages.length===3);
    console.log('OK Notes : envois simultanés, aucun doublon ni écrasement, un seul bloc Notes, réouverture depuis Roll20 simulé.');
    assert.ok(!writes.includes('owd_state'),'aucune photographie complète réécrite');
    assert.deepEqual(errors,[]);
    console.log('OK réouverture, état fusionné, aucune écriture owd_state, aucune erreur navigateur');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
