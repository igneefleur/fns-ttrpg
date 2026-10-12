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
seed.inv.objets=[{ref:'negative',nom:'Capuche',qte:1,ou:'tete',vet:'tete',prot_ethere:-3,res_froid:-5},
 {ref:'top',nom:'Tunique',qte:1,ou:'haut',vet:'haut',prot_feu:4,res_feu:5},
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
 const browser=await firefox.launch({headless:true});const errors=[];
 try {
  const ctx=await browser.newContext({viewport:{width:1600,height:1100}});
  await ctx.exposeBinding('backend',async(_,m)=>{if(m.kind==='read')return C.copy(attrs);if(m.kind==='write')attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url+'/harness');
  const sheet=page.frameLocator('iframe');await sheet.locator('.pc-sheet').waitFor();const frame=page.frames().find(f=>f.url().includes('roll20-fiche'));
  await frame.evaluate(()=>{window.chats=[];window.__owdChat=c=>chats.push(c);});
  const state=()=>frame.evaluate(()=>JSON.parse(__owdLocalStorage.getItem('owd-perso')));
  const def=sheet.locator('[data-module="defense"]'),atk=sheet.locator('[data-module="attaque"]');
  assert.deepEqual(await atk.locator('.pc-combat-ressources button').allTextContents(),['Attaque Lente','Consommer Endurance','Consommer Munition']);
  assert.deepEqual(await def.locator('.pc-combat-ressources button').allTextContents(),['Défense Lente','Consommer Endurance','Tout afficher']);
  for(const mod of [atk,def]) {const widths=await mod.locator('.pc-combat-ressources button').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().width));assert.ok(Math.max(...widths)-Math.min(...widths)<1);assert.equal(await mod.locator('.pc-combat-ressources .pc-chip').count(),3);}
  const sans=def.locator('[data-defense-id="sans"]');await sans.locator('.pc-defense-tete').click();
  assert.equal(await sans.locator('tr[data-damage-type]').count(),3);
  assert.equal(await sans.locator('[data-damage-type="froid"] .pc-defense-resistance').textContent(),'-5 %');
  assert.equal(await sans.locator('[data-damage-type="ethere"] .pc-defense-protection').textContent(),'-3');
  assert.equal(await sans.locator('[data-damage-type="ethere"] .pc-defense-resistance').textContent(),'');
  await def.getByRole('button',{name:'Tout afficher',exact:true}).click();assert.equal(await sans.locator('tr[data-damage-type]').count(),9);
  await def.getByRole('button',{name:'Tout afficher',exact:true}).click();await sans.locator('.pc-defense-tete').click();assert.equal(await sans.locator('.pc-defense-detail').count(),0);
  await atk.getByRole('button',{name:'Attaque Lente',exact:true}).click();await atk.locator('.pc-attaque-tete').filter({hasText:'Onde de feu'}).click();
  const custom=atk.locator('[data-attack-id="custom"]');assert.match(await custom.locator('span.touche').textContent(),/14/);assert.match(await custom.locator('span.passage').textContent(),/7/);
  await custom.locator('.pc-attaque-coup').click();assert.equal((await state()).etat.pe,100);
  await def.getByRole('button',{name:'Défense Lente',exact:true}).click();const shield=def.locator('[data-defense-id="shield"]');await shield.locator('.pc-defense-tete').click();
  assert.equal(await shield.locator('[data-damage-type="feu"] .pc-defense-protection').textContent(),'11');
  await shield.locator('.pc-defense-bouton').click();const modal=sheet.locator('.pc-modal');assert.equal(await modal.locator('input').count(),1);assert.equal(await modal.locator('select').count(),1);
  await modal.getByLabel('Dégâts subis',{exact:true}).fill('30');await modal.getByLabel('Type de dégâts',{exact:true}).selectOption('feu');await modal.getByRole('button',{name:'Valider',exact:true}).click();
  assert.equal((await state()).etat.pe,100);assert.match(await frame.evaluate(()=>chats.at(-1)),/Protection=11/);assert.match(await frame.evaluate(()=>chats.at(-1)),/Dégâts subis=17/);
  await def.getByRole('button',{name:'Défense Lente',exact:true}).click();assert.equal(await shield.locator('[data-damage-type="feu"] .pc-defense-protection').textContent(),'16');
  await page.screenshot({path:'/tmp/owd-slow-defenses-311.png'});assert.deepEqual(errors,[]);
  console.log('OK cartes dépliables, valeurs négatives/positives, zéros masqués, Tout afficher, tiers égaux, style Investies, attaque/parade lente, arrondis et PE');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
