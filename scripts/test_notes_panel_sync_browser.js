/* Harnais navigateur : fiche complète et panneau Notes réellement imbriqué,
 * vrai bundle et vrai pont, une collection Backbone et un serveur simulé.
 * node scripts/test_notes_panel_sync_browser.js [--migration]
 * Dépendance de vérification : playwright + Chromium.
 */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'), path=require('node:path'), http=require('node:http'), assert=require('node:assert/strict');
const M=require('../docs/javascripts/owd-attr-map.js'), C=require('../docs/javascripts/owd-sync.js');
const root=path.resolve(__dirname,'..');
let attrs, writes=[], blockWrites=false,holdMigration=process.argv.includes('--migration'),worldStep=0,worldOps=[];const migration=holdMigration;
const seed=M.blank();seed.v=M.SCHEMA;seed.rel=M.release();seed.name='Fiche partagée';
seed.comps=[{id:'c1',nom:'Lutte',groupe:'Physique',rang:1},{id:'c2',nom:'Évasion',groupe:'Physique',rang:2}];
seed.inv.objets=[{ref:'o1',id:'',nom:'Dague',qte:1,ou:'sac',arme:{attaque:'6',degats:'16',parade:'8',reduction:'6',modsDegats:['Dexterite','',''],modsParade:['','',''],type:'',comp:''}}, {ref:'o2',id:'',nom:'Pain',qte:5,ou:'sac'}];
if(migration){seed.v=17;seed.rel='4.5.2b';seed.notes='Notes avant migration';}
attrs=C.Compact.encode(seed);
const meta=JSON.parse(attrs[C.Compact.BASE].current);meta.phase='ready';attrs[C.Compact.BASE].current=JSON.stringify(meta);
attrs.owd_version={current:String(seed.v),max:seed.rel};
function harness() { return `<!doctype html><meta charset="utf-8"><style>iframe{width:1500px;height:1000px}</style><script>
function model(data) {return {attributes:{...data},get(k){return this.attributes[k]},set(d){Object.assign(this.attributes,d)},save(data,opts){Object.assign(this.attributes,data||{});window.backend({kind:'write',data:this.attributes}).then(()=>opts&&opts.success&&opts.success())}}}
const collection={models:[],create(data){const m=model(data);this.models.push(m);return m},fetch(opts){window.backend({kind:'read'}).then(attrs=>{this.models=Object.keys(attrs).map(name=>model({name,...attrs[name]}));opts&&opts.success&&opts.success()})}};
const ch={id:'shared',attribs:collection,get(k){return k==='name'?'Fiche partagée':k==='controlledby'?'all':''}};
window.Campaign={characters:{get(id){return id==='shared'?ch:null},models:[ch]},players:{models:[]}};
</script><script src="/bridge.js"></script><iframe id="sheet" src="/roll20-fiche.html#c=shared"></iframe><iframe id="panel" src="/roll20-notes.html"></iframe>`; }
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
    await ctx.addInitScript(()=>localStorage.setItem('owd-recovery-v2:shared:fixture',JSON.stringify({source:'ancien-journal',raw:'copie conservée',reason:'fixture',at:1})));
    await ctx.exposeBinding('backend',async(_,m)=>{
      if(m.kind==='read'){await new Promise(r=>setTimeout(r,70));if(migration&&C.Compact.read(attrs).state.v===17){const state=C.Compact.read(attrs).state,peer=new C.Compact.Session(attrs,state,null,{id:'world'+(++worldStep)}),next=C.copy(state);next.horloge.secondes++;peer.capture(next);worldOps.push(...Object.values(peer.pending));attrs.owd_ops_world={current:JSON.stringify({epoch:peer.epoch,ops:worldOps})};}return C.copy(attrs);}
      if(m.kind==='write'){if(holdMigration&&m.data.name.startsWith(C.Compact.PREFIX)&&JSON.parse(m.data.current).ops.some(o=>o.changes.some(c=>c.k==='[["k","v"]]'&&c.n[1]===18)))return;if(blockWrites && (m.data.name.startsWith(C.PREFIX)||m.data.name.startsWith(C.Compact.PREFIX)))return;await new Promise(r=>setTimeout(r,30));attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};writes.push(m.data.name);}
    });
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url+'/harness');
    const sheet=page.frameLocator('#sheet'),panel=page.frameLocator('#panel');
    if(!migration)await sheet.locator('.pc-sheet').waitFor();
    await panel.getByLabel('Personnage du nouvel onglet').selectOption('shared');
    const notesView=panel.frameLocator('.inventaire-frame');
    if(migration){
      await notesView.locator('[data-owd-act="monter"]').waitFor();
      await sheet.locator('[data-owd-act="monter"]').click();
      await sheet.locator('.pc-sheet').waitFor({timeout:30000});
      await sheet.locator('#owd-local-recovery').waitFor();
      await sheet.locator('[data-module="pe"] .pc-vital-num').fill('77');
      await sheet.locator('.pc-tab').filter({hasText:'Bio'}).click();
      await sheet.locator('.pc-note-message').getByRole('button',{name:'Modifier',exact:true}).click();
      await sheet.locator('.pc-notes-editor textarea').fill('Note éditée avant confirmation');
      await sheet.locator('.pc-notes-editor').getByRole('button',{name:'Enregistrer',exact:true}).click();
      assert.equal(C.Compact.read(attrs).state.v,17,'confirmation volontairement retardée');
      await page.reload();await sheet.locator('.pc-sheet').waitFor({timeout:15000});
      assert.equal(await sheet.locator('[data-owd-act="monter"]').count(),0);
      holdMigration=false;
      await notesView.locator('.pc-sheet').waitFor({timeout:20000});
      for(let i=0;i<100&&C.Compact.read(attrs).state.v!==18;i++)await page.waitForTimeout(100);
      assert.equal(C.Compact.read(attrs).state.v,18);assert.ok(worldStep>1);
      await notesView.locator('.pc-notes-body').filter({hasText:'Note éditée avant confirmation'}).waitFor({timeout:15000});
      assert.equal(C.Compact.read(attrs).state.etat.pe,77,'dépense reprise une seule fois');
      console.log('OK migration avec horloge active, rechargement avant confirmation, reprise sans nouvelle demande et panneau ouvert automatiquement.');
    }else await notesView.locator('.pc-sheet').waitFor();
    assert.equal(await notesView.locator('#owd-local-recovery').count(),0);assert.equal(await sheet.locator('#owd-local-recovery').count(),1);
    await sheet.locator('.pc-tab').filter({hasText:'Bio'}).click();
    async function send(f,text){await f.locator('.pc-notes-input').fill(text);await f.locator('.pc-notes-compose').getByRole('button',{name:'Envoyer',exact:true}).click();}
    await send(notesView,'Du panneau vers la fiche');
    await sheet.locator('.pc-notes-body').filter({hasText:'Du panneau vers la fiche'}).waitFor({timeout:15000});
    console.log('OK panneau Notes → fiche');
    await send(sheet,'De la fiche vers le panneau');
    await notesView.locator('.pc-notes-body').filter({hasText:'De la fiche vers le panneau'}).waitFor({timeout:15000});
    console.log('OK fiche → panneau Notes');
    async function edit(f,before,after){const row=f.locator('.pc-note-message').filter({hasText:before});await row.getByRole('button',{name:'Modifier',exact:true}).click();await f.locator('.pc-notes-editor textarea').fill(after);await f.locator('.pc-notes-editor').getByRole('button',{name:'Enregistrer',exact:true}).click();}
    await edit(notesView,'Du panneau vers la fiche','Modifié dans le panneau');
    await sheet.locator('.pc-notes-body').filter({hasText:'Modifié dans le panneau'}).waitFor({timeout:15000});
    await edit(sheet,'De la fiche vers le panneau','Modifié dans la fiche');
    await notesView.locator('.pc-notes-body').filter({hasText:'Modifié dans la fiche'}).waitFor({timeout:15000});
    console.log('OK édition de messages existants dans les deux sens');
    await Promise.all([send(sheet,'Envoi simultané fiche'),send(notesView,'Envoi simultané panneau')]);
    await sheet.locator('.pc-notes-body').filter({hasText:'Envoi simultané panneau'}).waitFor({timeout:15000});
    await notesView.locator('.pc-notes-body').filter({hasText:'Envoi simultané fiche'}).waitFor({timeout:15000});
    const row=notesView.locator('.pc-note-message').filter({hasText:'Modifié dans le panneau'});await row.getByRole('button',{name:'Supprimer',exact:true}).click();await notesView.locator('.pc-modal').getByRole('button',{name:'Supprimer',exact:true}).click();
    await sheet.locator('.pc-note-message').filter({hasText:'Modifié dans le panneau'}).waitFor({state:'detached',timeout:15000});
    console.log('OK envois simultanés et suppression depuis le panneau');
    await page.locator('#panel').evaluate(n=>n.style.display='none');
    await send(sheet,'Panneau masqué');
    await page.waitForTimeout(3500);await page.locator('#panel').evaluate(n=>n.style.display='');
    await notesView.locator('.pc-notes-body').filter({hasText:'Panneau masqué'}).waitFor({timeout:15000});
    await page.reload();await sheet.locator('.pc-sheet').waitFor();await notesView.locator('.pc-sheet').waitFor();
    await sheet.locator('.pc-tab').filter({hasText:'Bio'}).click();
    await sheet.locator('.pc-notes-body').filter({hasText:'Modifié dans la fiche'}).waitFor({timeout:15000});
    await notesView.locator('.pc-notes-body').filter({hasText:'Modifié dans la fiche'}).waitFor({timeout:15000});
    await send(notesView,'Après rechargement');await sheet.locator('.pc-notes-body').filter({hasText:'Après rechargement'}).waitFor({timeout:15000});
    console.log('OK panneau masqué, réouverture et persistance');
    await ctx.close();
    assert.ok(!writes.includes('owd_state'),'aucune photographie complète réécrite');
    assert.deepEqual(errors,[]);
    console.log('OK panneau réel imbriqué et fiche, aucune erreur navigateur');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
