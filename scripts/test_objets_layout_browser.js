/* Régressions qualité de vie : vraie fiche et pont Roll20 simulé.
 * node scripts/test_qol_browser.js (Playwright + Chromium)
 * OWD_CHROMIUM peut désigner un exécutable Chromium déjà installé.
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
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.OWD_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const errors=[];
 try {
  const ctx=await browser.newContext({viewport:{width:1600,height:1100}});
  await ctx.exposeBinding('backend',async(_,m)=>{if(m.kind==='read')return C.copy(attrs);if(m.kind==='write')attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/harness');
  const sheet=page.frameLocator('iframe');await sheet.locator('.pc-sheet').waitFor();
  let frame=page.frames().find(f=>f.url().includes('roll20-fiche'));
  const state=()=>frame.evaluate(()=>JSON.parse(__owdLocalStorage.getItem('owd-perso')));
  const replace=async fn=>{let s=await state();fn(s);await frame.evaluate(s=>Owd.__recoitEtat(s),s);};
  const add=id=>frame.evaluate(id=>Owd.effets.ajoute(id,'Test'),id);
  const advance=n=>frame.evaluate(n=>Owd.__calculs.avancerSecondes(n),n);
  const reset=async()=>{await replace(s=>{s.effetsActifs=[];s.effetsPermanents={};s.effAlcool=0;s.effParties={};s.effAutre=0;s.etat.pr=null;s.etat.ps=null;s.etat.ph=null;s.etat.pi=null;s.etat.expo=0;s.etat.contenance=0;s.effort='repos';s.etat.pv=0;s.inv.objets=[];});};
  await frame.evaluate(()=>{window.chats=[];window.__owdChat=c=>chats.push(c);});

  await sheet.locator('.pc-tab').filter({hasText:'Équipement'}).click();
  await replace(s=>{s.inv.objets=[{ref:'sample',nom:'Objet test',typeObjet:'autre',qte:2,poids:.2,volume:.3,taille:'Petite',mains:1,ou:'poches',id:'sample',desc:'Description test'}];});
  const panel=frame.locator('.pc-obj-panel');
  const field=name=>panel.locator('.pc-f').filter({has:frame.locator('label').filter({hasText:new RegExp('^'+name+'$')})});
  const choose=async()=>{await sheet.locator('[data-object-ref="sample"]').first().click();};
  await choose();
  const common=await panel.locator('.pc-obj-body').evaluate(n=>Array.from(n.children).filter(c=>!c.matches('.pc-obj-specifics,.pc-obj-actions')).map(c=>c.matches('input.nm')?'NOM':Array.from(c.querySelectorAll(':scope > label,:scope > .pc-f > label')).map(l=>l.textContent).join('|')).filter(Boolean));
  assert.deepEqual(common.slice(0,9),['NOM','Type|Accès rapide','Quantité','Poids|Volume','Taille|Mains',"Prix d'achat|Prix de vente",'Identifiant','Image|Fichier','Description']);
  assert.equal(await field('Image').isVisible(),false);assert.equal(await field('Identifiant').isVisible(),true);
  assert.equal(await panel.getByRole('button',{name:'Activer',exact:true}).getAttribute('aria-pressed'),'false');
  await panel.getByRole('button',{name:'Activer',exact:true}).click();assert.equal((await state()).inv.objets[0].rapide,true);
  assert.equal(await panel.getByRole('button',{name:'Activer',exact:true}).getAttribute('aria-pressed'),'true');
  await sheet.locator('[data-module="inv"] .pc-gear').click();
  assert.equal(await field('Image').isVisible(),true);assert.equal(await field('Fichier').getByRole('button',{name:'Choisir'}).isVisible(),true);
  const mediaWidths=await panel.locator('.pc-obj-media').evaluate(n=>Array.from(n.children).map(c=>c.getBoundingClientRect().width));
  assert.ok(mediaWidths[0] >= mediaWidths[1]*2.8 && mediaWidths[0] <= mediaWidths[1]*3.2,'Image/Fichier environ 75/25');
  assert.equal(await field('Construction').count(),0);assert.equal(await field('Modèle de consommable').count(),0);assert.equal(await field('Effet 1').count(),0);
  const types=await field('Type').locator('option').allTextContents();assert.ok(!types.includes('Éclairage')&&!types.includes('Couchage'));assert.ok(types.includes('Consommable'));assert.ok(!types.includes('Solide')&&!types.includes('Pâte')&&!types.includes('Liquide'));
  await field('Mains').locator('select').selectOption('2');assert.equal((await state()).inv.objets[0].mains,2);
  await frame.evaluate(()=>Owd.remonte());await choose();assert.equal(await field('Mains').locator('select').inputValue(),'2');
  await replace(s=>{s.inv.objets[0].ou='mainG';});
  assert.equal(await sheet.locator('[data-ou="mainD"] [data-object-ref="sample"]').count(),0);
  assert.equal(await sheet.locator('[data-ou="mainG"] [data-object-ref="sample"]').count(),1);
  assert.equal(await sheet.locator('.pc-inv-twohand-target').count(),1);
  // 2 autorise le port dans une main ; seul le dépôt sur 2 Mains occupe les deux.
  for(const type of ['solide','pate','liquide']){
   await replace(s=>{const o=s.inv.objets[0];o.typeObjet=type;o.sousType='ingerable';o.nourri=true;o.ou='poches';});await choose();
   assert.equal(await field('Type').locator('select').inputValue(),'consommable');
   assert.equal(await field('Sous-type').locator('select').inputValue(),type+'_ingerable');
   assert.deepEqual(await field('Sous-type').locator('optgroup').evaluateAll(els=>els.map(e=>e.label)),['Solide','Pâte','Liquide']);
   assert.equal(await field('Effet 1').count(),1);assert.equal(await field('Effet 8').count(),1);
   assert.equal(await panel.locator('.pc-obj-restauration').evaluate(n=>getComputedStyle(n).borderTopStyle),'none');
   assert.equal(await panel.locator('.pc-obj-effets-grid > .pc-f').count(),8);
   assert.equal(await panel.locator('.pc-obj-effets-grid').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),2);
   assert.equal(await panel.locator('.pc-obj-subtype-card .pc-obj-pair').first().locator('.pc-f').count(),2);
   assert.equal(await panel.locator('.pc-obj-subtype-row > .pc-f').count(),1);
   assert.equal(await panel.locator('.pc-obj-subtype-card').count(),1);
   assert.ok(await panel.locator('.pc-obj-body').evaluate(n=>Array.from(n.children).findIndex(c=>c.classList.contains('pc-obj-subtype-row')) < Array.from(n.children).findIndex(c=>c.classList.contains('pc-obj-subtype-card'))));
   assert.equal(await field('Effet 1').locator('option').first().textContent(),'Aucun');
   await replace(s=>{s.inv.objets[0].sousType='consommable';s.inv.objets[0].nourri=false;});await choose();assert.equal(await field('Effet 1').count(),1);
   assert.equal(await field('Sous-type').locator('select').inputValue(),type+'_autre');
   await replace(s=>{s.inv.objets[0].sousType='autre';});await choose();assert.equal(await field('Effet 1').count(),1);
  }
  // Sac : deux lignes compactes, 50/50, et labels lisibles sans débordement.
  await replace(s=>{const o=s.inv.objets[0];o.typeObjet='rangement';o.sousType='sac';o.sac=true;o.ceint=false;o.cap=35;o.ep=4;o.tailleInterieure='Petite';o.tailleAccroche='Très petite';});await choose();
  const sacLabels=await panel.locator('.pc-obj-subtype-card .pc-obj-subcard > .pc-obj-pair').evaluateAll(els=>els.map(n=>Array.from(n.querySelectorAll('label')).map(l=>l.textContent)));
  assert.deepEqual(sacLabels,[['Capacité','Taille INT. max'],['Accroches','Taille ACC. max']]);
  // Migration d’anciens types et conservation des choix de mains des armes.
  await replace(s=>{s.inv.objets[0].typeObjet='eclairage';s.inv.objets[0].sousType='lanterne';s.inv.objets[0].construction='Rigide';});
  assert.equal((await state()).inv.objets[0].typeObjet,'autre');assert.equal((await state()).inv.objets[0].construction,undefined);
  await replace(s=>{s.inv.objets[0].typeObjet='arme';s.inv.objets[0].arme={type:'dague',mains:2};s.inv.objets[0].mains=2;});await choose();
  assert.equal((await state()).inv.objets[0].arme.mains,2);
  assert.equal(await field('Coups').count(),0);
  assert.equal(await panel.locator('.pc-obj-type-properties .pc-arme').count(),1);
  assert.equal(await panel.locator('.pc-obj-subtype-row .pc-f').count(),1);
  await replace(s=>{const o=s.inv.objets[0];o.typeObjet='liquide';o.arme=null;o.sousType='ingerable';o.nourri=true;});await choose();
  for(const night of [true,false])for(const width of [1500,850,600]){
   await frame.evaluate(({night,width})=>{document.documentElement.classList.toggle('night',night);frameElement.style.width=width+'px';},{night,width});
   assert.equal(await panel.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
   if(width===1500)await panel.screenshot({path:'/tmp/owd-object-'+(night?'night':'day')+'.png'});
  }
  assert.equal(await sheet.locator('select option').evaluateAll(ns=>ns.some(n=>/^\s*(?:—|--|–)/.test(n.textContent))),false);
  assert.deepEqual(errors,[]);
  console.log('OK disposition des objets, accès rapide, édition des images, types autorisés, mains persistantes/deux cases, effets selon sous-type, choix sans tirets, rendu jour/nuit et trois largeurs.');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
