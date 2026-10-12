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
 const browser=await firefox.launch({headless:true});const errors=[];
 try {
  const ctx=await browser.newContext({viewport:{width:1600,height:1100}});
  await ctx.exposeBinding('backend',async(_,m)=>{if(m.kind==='read')return C.copy(attrs);if(m.kind==='write')attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url+'/harness');
  const sheet=page.frameLocator('iframe');await sheet.locator('.pc-sheet').waitFor();
  const frame=page.frames().find(f=>f.url().includes('roll20-fiche'));
  await frame.evaluate(()=>{window.chats=[];window.__owdChat=c=>chats.push(c);});
  const state=()=>frame.evaluate(()=>JSON.parse(__owdLocalStorage.getItem('owd-perso')));
  const def=sheet.locator('[data-module="defense"]');
  const scenarios=[['Sans Défense',21,100],['Parade — Dague',12,92],['Esquive',0,84],['Barrière',19,79]];
  for(let i=0;i<scenarios.length;i++) {
   const [name,damage,pe]=scenarios[i];await def.getByRole('button',{name,exact:false}).click();
   const modal=sheet.locator('.pc-modal');assert.equal(await modal.locator('input').count(),1);assert.equal(await modal.locator('select').count(),1);
   assert.deepEqual(await modal.getByRole('button').allTextContents(),['Annuler','Valider']);
   assert.equal(await modal.locator('.pc-defense-total,.pc-defense-reussite,input[type="checkbox"]').count(),0);
   await modal.getByLabel('Dégâts subis',{exact:true}).fill('30');await modal.getByLabel('Type de dégâts',{exact:true}).selectOption('feu');
   if(i===0)await page.screenshot({path:'/tmp/owd-defense-simple-3101.png'});
   await modal.getByRole('button',{name:'Valider',exact:true}).click();
   const chats=await frame.evaluate(()=>chats);assert.equal(chats.length,i+1);assert.match(chats.at(-1),new RegExp('Dégâts subis='+damage+'(?:}| )'));
   assert.ok(!chats.at(-1).includes('Réussite'));assert.ok(!chats.at(-1).includes('/roll'));
   assert.equal((await state()).etat.pv,100);assert.equal((await state()).etat.pe,pe);
  }
  await def.getByRole('button',{name:'Parade — Dague',exact:false}).click();let modal=sheet.locator('.pc-modal');
  await modal.getByLabel('Dégâts subis',{exact:true}).fill('-1');await modal.getByRole('button',{name:'Valider',exact:true}).click();assert.equal(await modal.count(),1);
  await modal.getByRole('button',{name:'Annuler',exact:true}).click();assert.equal((await state()).etat.pe,79);assert.equal(await frame.evaluate(()=>chats.length),4);
  await def.getByRole('button',{name:'Utiliser Endurance',exact:true}).click();await def.getByRole('button',{name:'Esquive',exact:false}).click();
  modal=sheet.locator('.pc-modal');await modal.getByLabel('Dégâts subis',{exact:true}).fill('12,5');await modal.getByRole('button',{name:'Valider',exact:true}).click();assert.equal((await state()).etat.pe,79);
  assert.deepEqual(errors,[]);
  console.log('OK fenêtre à deux champs, envoi unique, calculs, coûts PE, PV inchangés, annulation et saisie décimale');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
