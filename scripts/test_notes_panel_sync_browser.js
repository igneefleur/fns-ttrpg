/* Harnais navigateur : fiche complète et panneau Notes réellement imbriqué,
 * vrai bundle et vrai pont, une collection Backbone et un serveur simulé.
 * node scripts/test_notes_panel_sync_browser.js [--migration | --fresh | --partial | --damage | --no-version]
 * Dépendance de vérification : playwright + Chromium.
 */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'), path=require('node:path'), http=require('node:http'), assert=require('node:assert/strict');
const M=require('../docs/javascripts/owd-attr-map.js'), C=require('../docs/javascripts/owd-sync.js');
const root=path.resolve(__dirname,'..');
let attrs, writes=[], blockWrites=false,holdMigration=process.argv.includes('--migration'),worldStep=0,worldOps=[];const migration=holdMigration,damage=process.argv.includes('--damage'),partial=process.argv.includes('--partial'),fresh=process.argv.includes('--fresh')||partial;
const journal=process.argv.includes('--journal'),exposition=process.argv.includes('--exposition');
const seed=M.blank();seed.v=M.SCHEMA;seed.rel=M.release();seed.name='Fiche partagée';
seed.comps=[{id:'c1',nom:'Lutte',groupe:'Physique',rang:1},{id:'c2',nom:'Évasion',groupe:'Physique',rang:2}];
seed.inv.objets=[{ref:'o1',id:'',nom:'Dague',qte:1,ou:'sac',arme:{attaque:'6',degats:'16',parade:'8',reduction:'6',modsDegats:['Dexterite','',''],modsParade:['','',''],type:'',comp:''}}, {ref:'o2',id:'',nom:'Pain',qte:5,ou:'sac'}];
if(migration){seed.v=17;seed.rel='4.5.2b';seed.notes='Notes avant migration';}
if(journal)seed.modules={place:{inv:{onglet:'equipement',colonne:'bas'},defense:{onglet:'equipement',colonne:'gauche'}}};
attrs=C.Compact.encode(seed);
const meta=JSON.parse(attrs[C.Compact.BASE].current);meta.phase='ready';attrs[C.Compact.BASE].current=JSON.stringify(meta);
attrs.owd_version={current:String(seed.v),max:seed.rel};
if(process.argv.includes('--no-version'))delete attrs.owd_version;
if(fresh){if(partial){delete attrs.owd_storage;delete attrs.owd_version;}else attrs={};}
function harness() { return `<!doctype html><meta charset="utf-8"><style>iframe{width:1500px;height:1000px}</style><script>
function model(data) {return {attributes:{...data},get(k){return this.attributes[k]},set(d){Object.assign(this.attributes,d)},save(data,opts){Object.assign(this.attributes,data||{});window.backend({kind:'write',data:this.attributes}).then(()=>opts&&opts.success&&opts.success())}}}
const collection={models:[],create(data){const m=model(data);this.models.push(m);return m},fetch(opts){window.backend({kind:'read'}).then(attrs=>{this.models=Object.keys(attrs).map(name=>model({name,...attrs[name]}));opts&&opts.success&&opts.success()})}};
const ch={id:'shared',attribs:collection,get(k){return k==='name'?'Fiche partagée':k==='controlledby'?'all':''}};
window.currentPlayer={id:'p1',get(k){return k==='displayname'?'Alice':null}};
window.Campaign={characters:{get(id){return id==='shared'?ch:null},models:[ch]},players:{models:[]}};
</script><script data-owd-version="4.2.0" data-owd-mode="beta" data-owd-browser="firefox" src="/bridge.js"></script><iframe id="sheet" src="/roll20-fiche.html#c=shared"></iframe><iframe id="panel" src="/roll20-notes.html"></iframe>`; }
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
    if(partial)await ctx.addInitScript(({epoch})=>localStorage.setItem('owd-recovery-v2:shared:false-copy',JSON.stringify({source:'owd-pending-v2:shared:old',raw:JSON.stringify({epoch,ops:[{id:'old:1',clock:1,changes:[{k:'[["k","name"]]',before:['v','Fiche partagée'],n:['v','Fiche reprise']}]}],payloads:{}}),reason:"Cannot read properties of null (reading 'ids')"})),{epoch:meta.epoch});
    if(!fresh)await ctx.addInitScript(()=>localStorage.setItem('owd-recovery-v2:shared:fixture',JSON.stringify({source:'ancien-journal',raw:'copie conservée',reason:'fixture',at:1})));
    await ctx.exposeBinding('backend',async(_,m)=>{
      if(m.kind==='read'){await new Promise(r=>setTimeout(r,70));if(migration&&C.Compact.read(attrs).state.v===17){const state=C.Compact.read(attrs).state,peer=new C.Compact.Session(attrs,state,null,{id:'world'+(++worldStep)}),next=C.copy(state);next.horloge.secondes++;peer.capture(next);worldOps.push(...Object.values(peer.pending));attrs.owd_ops_world={current:JSON.stringify({epoch:peer.epoch,ops:worldOps})};}return C.copy(attrs);}
      if(m.kind==='write'){if(holdMigration&&m.data.name.startsWith(C.Compact.PREFIX)&&JSON.parse(m.data.current).ops.some(o=>o.changes.some(c=>c.k==='[["k","v"]]'&&c.n[1]===18)))return;if(blockWrites && (m.data.name.startsWith(C.PREFIX)||m.data.name.startsWith(C.Compact.PREFIX)))return;await new Promise(r=>setTimeout(r,30));attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};writes.push(m.data.name);}
    });
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url+'/harness');
    const sheet=page.frameLocator('#sheet'),panel=page.frameLocator('#panel');
    if(!migration){await sheet.locator('#owd-mode-bar').waitFor();await sheet.locator('#owd-mode-switch').click();}
    await panel.getByLabel('Personnage du nouvel onglet').selectOption('shared');
    const notesView=panel.frameLocator('.inventaire-frame');
    if(migration){
      await notesView.locator('[data-owd-act="monter"]').waitFor();
      await sheet.locator('[data-owd-act="monter"]').click();
      await sheet.locator('.pc-sheet').waitFor({timeout:30000});
      assert.equal(await sheet.locator('#owd-local-recovery').count(),0);
      blockWrites=true;await sheet.locator('[data-module="pe"] .pc-vital-num').fill('77');
      await sheet.locator('.pc-tab').filter({hasText:'Bio'}).click();
      await sheet.locator('.pc-note-message').getByRole('button',{name:'Modifier',exact:true}).click();
      await sheet.locator('.pc-notes-editor textarea').fill('Note éditée avant confirmation');
      await sheet.locator('.pc-notes-editor').getByRole('button',{name:'Enregistrer',exact:true}).click();
      assert.equal(C.Compact.read(attrs).state.v,17,'confirmation volontairement retardée');
      const confirmedPe=attrs.owd_pe ? Number(attrs.owd_pe.current) : C.Compact.read(attrs).state.etat.pe;
      await page.reload();await sheet.locator('[data-owd-act="monter"]').waitFor({timeout:15000});
      holdMigration=false;blockWrites=false;await sheet.locator('[data-owd-act="monter"]').click();await sheet.locator('.pc-sheet').waitFor();
      await notesView.locator('.pc-sheet').waitFor({timeout:20000});
      for(let i=0;i<100&&C.Compact.read(attrs).state.v!==18;i++)await page.waitForTimeout(100);
      assert.equal(C.Compact.read(attrs).state.v,18);assert.ok(worldStep>1);
      await notesView.locator('.pc-notes-body').filter({hasText:'Notes avant migration'}).waitFor({timeout:15000});
      assert.equal(C.Compact.read(attrs).state.etat.pe,confirmedPe,'réserve relue depuis Roll20');
      console.log('OK migration avec horloge active, rechargement avant confirmation, nouvelle confirmation sans reprise locale et panneau ouvert automatiquement.');
    }else await notesView.locator('#owd-mode-bar').waitFor();
    if(await notesView.locator('#owd-mode-switch').textContent()==='Passer en Mode Edition')await notesView.locator('#owd-mode-switch').click();
    if(partial)await sheet.locator('#owd-local-recovery').waitFor({state:'detached',timeout:15000});
    assert.equal(await notesView.locator('#owd-local-recovery').count(),0);assert.equal(await sheet.locator('#owd-local-recovery').count(),0);
    if(exposition){
      const frame=page.frames().find(f=>f.url().includes('/roll20-fiche.html#c=shared'));
      await frame.waitForFunction(()=>window.Owd&&Owd.__pret);
      assert.equal(await sheet.locator('[data-module="recuperation"] .pc-rec-group').count(),7);
      assert.equal(await sheet.locator('[data-module="recuperation"] .pc-rec-label').filter({hasText:/^Naturelle · /}).count(),35);
      assert.equal(await sheet.locator('[data-module="recuperation"] .pc-rec-row:not(.head)').count(),35);
      await frame.evaluate(()=>{const s=JSON.parse(__owdLocalStorage.getItem('owd-perso'));s.etat.expo=80;s.temperature=48;s.effort='repos';s.capsLeviers.max=s.capsLeviers.max||{};s.capsLeviers.max.force=s.capsLeviers.max.force||{};s.capsLeviers.max.force.expo=100;s.horlogeExposition={jours:0,heures:0,minutes:0,secondes:0,regime:''};Owd.__recoitEtat(s);Owd.__calculs.avancerSecondes(2100);});
      assert.equal(await sheet.getByLabel('Exposition',{exact:true}).inputValue(),'80');
      assert.equal(await sheet.getByLabel('Prochaine résorption naturelle',{exact:true}).innerText(),'4');
      for(let i=0;i<150&&C.Compact.read(attrs).state.horlogeExposition.minutes!==35;i++)await page.waitForTimeout(100);
      assert.equal(C.Compact.read(attrs).state.horlogeExposition.minutes,35);
      await page.reload();await sheet.locator('#owd-mode-bar').waitFor();await sheet.locator('#owd-mode-switch').click();await notesView.locator('#owd-mode-bar').waitFor();await notesView.locator('#owd-mode-switch').click();
      const reloaded=page.frames().find(f=>f.url().includes('/roll20-fiche.html#c=shared'));
      await reloaded.waitForFunction(()=>window.Owd&&Owd.__pret);
      assert.equal(await sheet.getByLabel('Prochaine résorption naturelle',{exact:true}).innerText(),'4');
      const result=await reloaded.evaluate(()=>{
        function climate(t,seconds){const s=JSON.parse(__owdLocalStorage.getItem('owd-perso'));s.temperature=t;Owd.__recoitEtat(s);Owd.__calculs.avancerSecondes(seconds);}
        climate(20,100);climate(30,100);climate(44,100);
        return JSON.parse(__owdLocalStorage.getItem('owd-perso'));
      });
      assert.equal(result.etat.expo,79);assert.equal(result.horlogeExposition.minutes,40);assert.equal(result.horlogeExposition.regime,'resorption:chaud');
      assert.equal(await sheet.getByLabel('Prochaine résorption naturelle',{exact:true}).innerText(),'5');
      for(let i=0;i<150&&C.Compact.read(attrs).state.etat.expo!==79;i++)await page.waitForTimeout(100);
      assert.equal(C.Compact.read(attrs).state.etat.expo,79);
      assert.deepEqual(errors,[]);console.log('OK navigateur : 35 conditions naturelles sans ligne permanente supplémentaire, vraie résorption affichée, 35 minutes conservées après synchronisation et rechargement, trois changements de climat favorables, tranche à 4 puis prochaine à 5, aucun nouvel attribut.');return;
    }
    if(journal){
      await sheet.locator('.pc-tab').filter({hasText:'Options'}).click();
      const jm=sheet.locator('[data-module="journal"]');await jm.waitFor();
      assert.equal(await jm.evaluate(n=>n.previousElementSibling.dataset.module),'modules');
      const layout=await sheet.locator('[data-module="modules"]').evaluate(n=>{const h=Array.from(n.querySelectorAll('.pc-modgroupe')).find(x=>x.textContent==='Équipement');return Array.from(h.nextElementSibling.querySelectorAll('.pc-modplan-col-nom')).map(x=>x.textContent);});assert.deepEqual(layout,['Milieu']);
      assert.equal(await sheet.locator('[data-module="modules"] .pc-modplan-carte[data-etat="perdu"]').count(),0);
      await sheet.locator('.pc-tab').filter({hasText:'Fiche',exact:true}).click();
      blockWrites=true;await sheet.locator('[data-module="pe"] .pc-vital-num').fill('77');
      await notesView.locator('.pc-notes-input').fill('Message traçable');await notesView.locator('.pc-notes-compose').getByRole('button',{name:'Envoyer',exact:true}).click();
      await sheet.locator('.pc-tab').filter({hasText:'Options'}).click();
      await jm.locator('.pc-journal-entry').filter({hasText:'Alice'}).first().waitFor({timeout:15000});
      await jm.getByRole('searchbox').fill('Message traçable');await page.waitForTimeout(1600);assert.equal(await jm.locator('.pc-journal-entry').count(),1);
      await jm.locator('summary').click();await jm.locator('.pc-journal-details').getByText(/Message traçable/).waitFor();assert.equal(await jm.locator('time[datetime]').count(),1);
      await page.waitForTimeout(2500);assert.equal(await jm.locator('.pc-journal-entry').count(),1);
      const state=C.Compact.read(attrs).state,peer=new C.Compact.Session(attrs,state,()=>1700000000000,{id:'peer-journal',actor:{id:'p2',name:'Bob'}});const next=C.copy(state);
      for(let i=1;i<=123;i++){next.age=i;peer.capture(next);peer.outgoing();}
      attrs.owd_ops_peer_journal={current:JSON.stringify({epoch:peer.epoch,ops:Object.values(peer.pending)})};
      await jm.getByRole('searchbox').fill('Bob');await page.waitForTimeout(2200);assert.equal(await jm.locator('.pc-journal-entry').count(),50);
      await jm.getByRole('button',{name:'Plus anciens',exact:true}).click();assert.equal(await jm.locator('.pc-journal-entry').count(),50);
      await jm.getByRole('button',{name:'Plus anciens',exact:true}).click();assert.equal(await jm.locator('.pc-journal-entry').count(),23);
      await jm.getByRole('button',{name:'Plus récents',exact:true}).click();assert.equal(await jm.locator('.pc-journal-entry').count(),50);
      await page.reload();await sheet.locator('#owd-mode-bar').waitFor();await sheet.locator('#owd-mode-switch').click();await notesView.locator('#owd-mode-bar').waitFor();await notesView.locator('#owd-mode-switch').click();await sheet.locator('.pc-tab').filter({hasText:'Options'}).click();await jm.getByRole('searchbox').fill('Message traçable');await page.waitForTimeout(1700);assert.equal(await jm.locator('.pc-journal-entry').count(),1);assert.match(await jm.locator('.pc-journal-entry').innerText(),/Alice/);
      assert.deepEqual(errors,[]);console.log('OK Journal navigateur : Equipement normalisé avec anciennes dispositions, module sous Modules, identité depuis le vrai pont, changements fiche/panneau, détail daté, aucune duplication, joueur distant, pagination de 123 événements et persistance après rechargement.');return;
    }
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
    await page.reload();await sheet.locator('#owd-mode-bar').waitFor();await sheet.locator('#owd-mode-switch').click();await notesView.locator('#owd-mode-bar').waitFor();await notesView.locator('#owd-mode-switch').click();await notesView.locator('.pc-sheet').waitFor();
    await sheet.locator('.pc-tab').filter({hasText:'Bio'}).click();
    await sheet.locator('.pc-notes-body').filter({hasText:'Modifié dans la fiche'}).waitFor({timeout:15000});
    await notesView.locator('.pc-notes-body').filter({hasText:'Modifié dans la fiche'}).waitFor({timeout:15000});
    await send(notesView,'Après rechargement');await sheet.locator('.pc-notes-body').filter({hasText:'Après rechargement'}).waitFor({timeout:15000});
    console.log('OK panneau masqué, réouverture et persistance');
    if(damage){
      const recoveryKeys=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('owd-recovery-v2:shared:')).sort());
      const good=attrs.owd_block_notes.current;attrs.owd_block_notes.current='{broken';
      await sheet.locator('[data-owd-act="reessayer-lecture"]').waitFor({timeout:12000});
      assert.equal(await sheet.locator('[data-owd-act="ecraser"]').count(),0);
      const downloaded=page.waitForEvent('download');await sheet.locator('[data-owd-act="export-recuperation"]').click();const file=await downloaded;const report=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(report.character,'shared');assert.equal(report.attrs.owd_block_notes.current,'{broken');
      for(let i=0;i<150&&attrs.owd_block_notes.current!==good;i++)await page.waitForTimeout(100);assert.equal(attrs.owd_block_notes.current,good);
      await sheet.locator('[data-owd-act="reessayer-lecture"]').waitFor({state:'detached',timeout:15000});
      await send(notesView,'Après réparation');await sheet.locator('.pc-notes-body').filter({hasText:'Après réparation'}).waitFor({timeout:15000});
      attrs.owd_block_notes.current='{broken';await page.reload();
      await sheet.locator('[data-owd-act="reessayer-lecture"]').waitFor();attrs.owd_block_notes.current=good;await sheet.locator('[data-owd-act="reessayer-lecture"]').click();
      await sheet.locator('.pc-sheet').waitFor();await notesView.locator('.pc-sheet').waitFor();
      await sheet.locator('.pc-tab').filter({hasText:'Bio'}).click();
      await sheet.locator('.pc-notes-body').filter({hasText:'Après réparation'}).waitFor({timeout:20000});
      await sheet.locator('[data-owd-act="reessayer-lecture"]').waitFor({state:'detached',timeout:15000});
      await send(sheet,'Après récupération au démarrage');await notesView.locator('.pc-notes-body').filter({hasText:'Après récupération au démarrage'}).waitFor({timeout:15000});
      assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('owd-recovery-v2:shared:')).sort()),recoveryKeys);
      console.log('OK bloc corrompu : réparation depuis la lecture en mémoire pendant la session ; après rechargement, attente du retour de données Roll20 valides.');
    }
    if(fresh){assert.equal(await sheet.locator('#owd-local-recovery').count(),0);if(partial){assert.equal(await page.evaluate(()=>localStorage.getItem('owd-recovery-v2:shared:false-copy')),null);assert.equal(C.Compact.read(attrs).state.name,'Fiche partagée');}else assert.equal((await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('owd-recovery-v2:shared:')))).length,0);console.log('OK création depuis zéro : aucun faux journal de secours ni bouton après rechargement.');}
    await ctx.close();
    assert.ok(!writes.includes('owd_state'),'aucune photographie complète réécrite');
    assert.deepEqual(errors,[]);
    console.log('OK panneau réel imbriqué et fiche, aucune erreur navigateur');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
