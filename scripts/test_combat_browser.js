/* Harnais navigateur : vrai bundle et vrai pont, deux collections Backbone
 * indépendantes, serveur simulé partagé. Aucun compte Roll20 nécessaire.
 * NODE_PATH=/chemin/node_modules node scripts/test_sync_browser.js
 * Dépendance de vérification : playwright + Chromium.
 */
'use strict';
const {chromium,firefox}=require('playwright');
const fs=require('node:fs'), path=require('node:path'), http=require('node:http'), assert=require('node:assert/strict');
const M=require('../docs/javascripts/owd-attr-map.js'), C=require('../docs/javascripts/owd-sync.js');
const root=path.resolve(__dirname,'..');
let attrs, writes=[], blockWrites=false;
const seed=M.blank();seed.v=M.SCHEMA;seed.rel=M.release();seed.name='Fiche partagée';
seed.comps=[{id:'c1',nom:'Lutte',groupe:'Physique',rang:1},{id:'c2',nom:'Évasion',groupe:'Physique',rang:2}];
seed.etat.pv=100;seed.etat.pe=100;seed.combatOptions={attaques:{utiliseEndurance:true,utiliseMunition:false},defenses:{utiliseEndurance:true}};
seed.inv.objets=[{ref:'top',nom:'Tunique',qte:1,ou:'haut',vet:'haut',prot_feu:4,res_feu:5},
 {ref:'legs',nom:'Pantalon',qte:1,ou:'bas',vet:'bas',prot_feu:2,res_feu:4},
 {ref:'blade',nom:'Dague',qte:1,ou:'mainG',arme:{attaque:'6',degats:'16',parade:'8',reduction:'6',modsParade:['Force','',''],modsDegats:[],type:'dague',comp:'c1'}}];
seed.attaques=[{id:'old',arme:'blade'}, {id:'custom',nom:'Onde de feu',utiliseEndurance:true,personnalisee:{attaque:'5',degats:'20',modsDegats:['Force','',''],type:'',comp:'c1',mult:'1.2',trajet:'1:passe>6:frappe',garde:'1>9',touche:'feu',passage:'feu'}},
 {id:'simple',nom:'Poing',personnalisee:{attaque:'4',degats:'10',modsDegats:[],type:'',touche:'contondant'}}];
seed.defenses={esquive:{comp:'c2',utiliseEndurance:true},entrees:[{id:'shield',arme:'blade',utiliseEndurance:true},
 {id:'customDef',nom:'Barrière',personnalisee:{parade:'5',reduction:'3',modsParade:[],comp:'c1'},utiliseEndurance:true}]};
attrs={[C.BASE]:{current:JSON.stringify({format:1,state:seed}),max:''},owd_version:{current:String(M.SCHEMA),max:M.release()},owd_state:{current:JSON.stringify(seed),max:''}};
function harness() { return `<!doctype html><meta charset="utf-8"><style>iframe{width:1500px;height:1000px}</style><script>
function model(data) {return {attributes:{...data},get(k){return this.attributes[k]},set(d){Object.assign(this.attributes,d)},save(_,opts){window.backend({kind:'write',data:this.attributes}).then(()=>opts&&opts.success&&opts.success())}}}
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
 const engine=process.env.TEST_BROWSER==='firefox'?firefox:chromium;
 const browser=await engine.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:engine===chromium?['--no-sandbox']:[]});const errors=[];
 try {
  const ctx=await browser.newContext({viewport:{width:1600,height:1100}});
  await ctx.exposeBinding('backend',async(_,m)=>{if(m.kind==='read')return C.copy(attrs);if(m.kind==='write'){attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};writes.push(m.data.name);}});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url+'/harness');
  const sheet=page.frameLocator('iframe');await sheet.locator('.pc-sheet').waitFor();
  const frame=page.frames().find(f=>f.url().includes('roll20-fiche'));
  await frame.evaluate(()=>{window.combatChats=[];window.__owdChat=c=>window.combatChats.push(c);});
  const state=()=>page.frames().find(f=>f.url().includes('roll20-fiche')).evaluate(()=>JSON.parse(__owdLocalStorage.getItem('owd-perso')));
  const def=sheet.locator('[data-module="defense"]'),atk=sheet.locator('[data-module="attaque"]');
  assert.match(await atk.locator('.pc-block-title').textContent(),/Attaques/);
  assert.equal(await atk.evaluate(n=>n.nextElementSibling.dataset.module),'defense');
  assert.equal(await def.locator('.pc-defense-bouton').count(),4);
  await def.getByRole('button',{name:'Sans Défense',exact:false}).click();
  let modal=sheet.locator('.pc-modal');await modal.locator('.pc-defense-ligne select').selectOption('feu');await modal.getByLabel('Dégâts de l’attaque').fill('30');
  assert.equal(await modal.locator('.pc-defense-total').textContent(),'Dégâts subis : 21');
  await page.screenshot({path:'/tmp/owd-defense-dialog-390.png'});
  await modal.getByRole('button',{name:'Appliquer les dégâts'}).click();let s=await state();assert.equal(s.etat.pv,79);assert.equal(s.etat.pe,100);
  console.log('OK Sans Défense : protections 6, réduction 9 %, 21 dégâts, aucun PE');
  await def.getByRole('button',{name:'Parade — Dague',exact:false}).click();modal=sheet.locator('.pc-modal');
  await modal.locator('.pc-defense-ligne select').selectOption('feu');await modal.getByLabel('Dégâts de l’attaque').fill('30');
  assert.equal(await modal.locator('.pc-defense-total').textContent(),'Dégâts subis : 12');
  await modal.getByRole('button',{name:'Lancer le jet'}).click();
  await modal.getByRole('button',{name:'Appliquer les dégâts'}).click();s=await state();assert.equal(s.etat.pv,67);assert.equal(s.etat.pe,92);
  assert.match((await frame.evaluate(()=>combatChats)).join('\n'),/Difficulté 8/);
  await def.getByRole('button',{name:'Parade — Dague',exact:false}).click();modal=sheet.locator('.pc-modal');
  await modal.locator('.pc-defense-ligne select').selectOption('feu');await modal.getByLabel('Dégâts de l’attaque').fill('30');await modal.getByLabel('Défense réussie').uncheck();
  assert.equal(await modal.locator('.pc-defense-total').textContent(),'Dégâts subis : 21');await modal.getByRole('button',{name:'Appliquer les dégâts'}).click();s=await state();assert.equal(s.etat.pv,46);assert.equal(s.etat.pe,84);
  console.log('OK parade réussie/ratée, MOD de protection, jet lié, coût 8 une seule fois');
  await def.getByRole('button',{name:'Esquive',exact:false}).click();modal=sheet.locator('.pc-modal');await modal.getByLabel('Dégâts de l’attaque').fill('999');
  assert.equal(await modal.locator('.pc-defense-total').textContent(),'Dégâts subis : 0');await modal.getByRole('button',{name:'Appliquer les dégâts'}).click();s=await state();assert.equal(s.etat.pv,46);assert.equal(s.etat.pe,76);
  // Duplicate types share a single protection and final rounding.
  await def.getByRole('button',{name:'Sans Défense',exact:false}).click();modal=sheet.locator('.pc-modal');
  await modal.locator('.pc-defense-ligne select').selectOption('feu');await modal.getByLabel('Dégâts de l’attaque').fill('15');await modal.getByRole('button',{name:'+ Ajouter un type de dégâts'}).click();
  await modal.locator('.pc-defense-ligne select').nth(1).selectOption('feu');await modal.getByLabel('Dégâts de l’attaque').nth(1).fill('15');assert.equal(await modal.locator('.pc-defense-total').textContent(),'Dégâts subis : 21');
  await modal.getByLabel('Dégâts de l’attaque').first().fill('-1');await modal.getByRole('button',{name:'Appliquer les dégâts'}).click();assert.equal(await modal.count(),1);await modal.getByRole('button',{name:'Annuler'}).click();
  assert.equal((await state()).etat.pv,46);
  console.log('OK esquive, saisie multi types, validation négative et annulation sans dépense');
  // Custom trajectory supports six cells, same attack controls and resource behavior.
  await atk.locator('.pc-attaque-tete').filter({hasText:'Onde de feu'}).click();let card=atk.locator('.pc-attaque-card').filter({hasText:'Onde de feu'});
  assert.equal(await card.locator('.pc-attaque-coup').count(),1);assert.match(await card.locator('span.touche').textContent(),/28/);assert.match(await card.locator('span.passage').textContent(),/14/);
  await card.locator('.pc-attaque-coup').click();assert.equal((await state()).etat.pe,71);
  await atk.locator('.pc-attaque-tete').filter({hasText:'Poing'}).click();await atk.locator('.pc-attaque-card').filter({hasText:'Poing'}).locator('.pc-attaque-simple').click();assert.equal((await state()).etat.pe,67);
  await def.getByRole('button',{name:'Barrière',exact:false}).click();modal=sheet.locator('.pc-modal');await modal.locator('.pc-defense-ligne select').selectOption('feu');await modal.getByLabel('Dégâts de l’attaque').fill('30');assert.equal(await modal.locator('.pc-defense-total').textContent(),'Dégâts subis : 19');await modal.getByRole('button',{name:'Appliquer les dégâts'}).click();assert.equal((await state()).etat.pe,62);
  // Create new source types via actual edition controls and preserve after reopen.
  await def.locator('.pc-gear').click();await def.getByRole('button',{name:'+ Ajouter une défense'}).click();
  await def.locator('.pc-attaque-card').last().locator('select').first().selectOption('custom');
  await def.locator('.pc-attaque-card').last().locator('input').first().fill('Protection libre');await def.locator('.pc-attaque-card').last().locator('input').first().dispatchEvent('change');
  await atk.locator('.pc-gear').click();await atk.getByRole('button',{name:'+ Ajouter une attaque'}).click();await atk.locator('.pc-attaque-card').last().locator('select').first().selectOption('custom');
  await atk.locator('.pc-attaque-card').last().locator('input').first().fill('Attaque libre');await atk.locator('.pc-attaque-card').last().locator('input').first().dispatchEvent('change');
  await atk.locator('.pc-attaque-card').last().screenshot({path:'/tmp/owd-attack-editor-390.png'});
  await page.waitForFunction(()=>{const s=JSON.parse(document.querySelector('iframe').contentWindow.__owdLocalStorage.getItem('owd-perso'));return s.attaques.some(a=>a.nom==='Attaque libre')&&s.defenses.entrees.some(a=>a.nom==='Protection libre');});
  for (let i=0;i<150;i++) {
    const saved=C.read(attrs).state;
    if (saved.attaques.some(a=>a.nom==='Attaque libre'&&a.personnalisee)&&saved.defenses.entrees.some(a=>a.nom==='Protection libre'&&a.personnalisee)) break;
    await page.waitForTimeout(100);
  }
  assert.ok(C.read(attrs).state.attaques.some(a=>a.nom==='Attaque libre'&&a.personnalisee),'serveur : attaque libre confirmée');
  assert.ok(C.read(attrs).state.defenses.entrees.some(a=>a.nom==='Protection libre'&&a.personnalisee),'serveur : défense libre confirmée');
  await page.reload();await sheet.locator('.pc-sheet').waitFor();
  assert.ok((await state()).attaques.some(a=>a.nom==='Attaque libre'&&a.personnalisee));assert.ok((await state()).defenses.entrees.some(a=>a.nom==='Protection libre'&&a.personnalisee));
  assert.equal((await state()).defenses.esquive.comp,'c2');assert.equal((await state()).etat.pe,62);
  assert.equal((await state()).attaques[0].arme,'blade');assert.deepEqual(errors,[]);
  await page.screenshot({path:'/tmp/owd-combat-390.png'});
  console.log('OK attaques personnalisées, portée 6, création, ancien lien conservé, réouverture et absence d’erreur navigateur');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
