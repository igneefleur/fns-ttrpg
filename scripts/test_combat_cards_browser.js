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
seed.etat.pv=100;seed.etat.pe=100;
seed.inv.objets=[{ref:'top',nom:'Tunique',qte:1,ou:'haut',vet:'haut',prot_feu:4,res_feu:5},
 {ref:'legs',nom:'Pantalon',qte:1,ou:'bas',vet:'bas',prot_feu:2,res_feu:4},
 {ref:'arrows',nom:'Flèches',qte:3,ou:'poches',contenu:'fleches'},
 {ref:'bow',nom:'Arc',qte:1,ou:'poches',arme:{attaque:'6',degats:'16',type:'arc-court'}},
 {ref:'blade',nom:'Dague',qte:1,ou:'mainG',arme:{attaque:'6',degats:'16',parade:'8',reduction:'6',modsParade:['Force','',''],modsDegats:[],type:'dague',comp:'c1'}}];
seed.attaques=[{id:'bow',arme:'bow',munition:'arrows'},{id:'old',arme:'blade'}, {id:'custom',nom:'Onde de feu',utiliseEndurance:true,personnalisee:{attaque:'5',degats:'20',modsDegats:['Force','',''],type:'',comp:'c1',mult:'1.2',trajet:'1:passe>6:frappe',garde:'1>9',touche:'feu',passage:'feu'}},
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
  const frame=()=>page.frames().find(f=>f.url().includes('roll20-fiche'));
  const state=()=>frame().evaluate(()=>JSON.parse(__owdLocalStorage.getItem('owd-perso')));
  const atk=sheet.locator('[data-module="attaque"]'),def=sheet.locator('[data-module="defense"]');
  await atk.locator('.pc-gear').click();await def.locator('.pc-gear').click();
  const custom=atk.locator('[data-attack-id="custom"]'),shield=def.locator('[data-defense-id="shield"]');
  assert.equal(await custom.locator('input').count(),0);assert.equal(await shield.locator('input').count(),0);
  await custom.getByRole('button',{name:'Agrandir',exact:true}).click();
  assert.equal(await custom.locator('.pc-attaque-custom-info').getByText('Garde',{exact:true}).count(),1);assert.equal(await custom.locator('.pc-garde-editor input').count(),0);
  const guard=custom.locator('.pc-garde-editor');assert.equal(await guard.locator('rect').count(),9);
  await guard.getByRole('button',{name:'Garde case 2',exact:true}).click();await guard.getByRole('button',{name:'Garde case 7',exact:true}).click();
  assert.equal((await state()).attaques.find(x=>x.id==='custom').personnalisee.garde,'2>7');
  assert.equal((await state()).attaques.find(x=>x.id==='custom').personnalisee.trajet,'1:passe>6:frappe');
  const layout=await custom.evaluate(n=>{
    const head=n.querySelector('.pc-combat-tete').getBoundingClientRect(),tools=n.querySelector('.pc-combat-outils').getBoundingClientRect();
    const trajet=n.querySelector('.pc-attaque-editor').getBoundingClientRect(),garde=n.querySelector('.pc-garde-editor').getBoundingClientRect();
    return {top:tools.top-head.top,right:head.right-tools.right,under:garde.left>=trajet.right,last:n.lastElementChild.className};
  });assert.ok(layout.top<10&&layout.right<10&&layout.under);
  const sizes=await custom.evaluate(n=>{const g=n.querySelector('.pc-garde-dessin').getBoundingClientRect(),mult=n.querySelector('.pc-attaque-editor-mult').getBoundingClientRect(),types=n.querySelector('.pc-attaque-editor-types').getBoundingClientRect(),cols=Array.from(n.querySelector('.pc-attaque-editor-types').children).map(x=>x.getBoundingClientRect());return {g:g.width,m:mult.width,t:types.width,c:cols.map(x=>x.width),y:cols.map(x=>x.y),border:getComputedStyle(n.querySelector('.pc-combat-ouvrir')).borderTopWidth};});assert.ok(sizes.g<60);assert.ok(Math.abs(sizes.m-sizes.t)<1);assert.ok(Math.abs(sizes.c[0]-sizes.c[1])<1&&sizes.y[0]===sizes.y[1]);assert.equal(sizes.border,'0px');assert.match(layout.last,/pc-combat-pied/);
  await custom.screenshot({path:'/tmp/owd-combat-cards-312.png'});
  await custom.getByRole('button',{name:'Réduire',exact:true}).click();assert.equal(await custom.locator('input').count(),0);assert.equal(await custom.getByRole('button',{name:'Supprimer',exact:true}).count(),0);
  // Real native drag, only the handle initiates it; dropped above the target.
  await custom.locator('.pc-combat-drag').dragTo(atk.locator('[data-attack-id="bow"] .pc-combat-tete'),{targetPosition:{x:30,y:3}});
  assert.equal((await state()).attaques[0].id,'custom');
  await shield.getByRole('button',{name:'Agrandir',exact:true}).click();assert.ok(await shield.locator('input').count()>0);
  assert.equal(await shield.locator('.pc-combat-pied').getByRole('button',{name:'Supprimer',exact:true}).count(),1);
  await shield.getByRole('button',{name:'Réduire',exact:true}).click();assert.equal(await shield.locator('input').count(),0);
  const barriere=def.locator('[data-defense-id="customDef"]');
  await barriere.locator('.pc-combat-drag').dragTo(shield.locator('.pc-combat-tete'),{targetPosition:{x:30,y:3}});
  assert.equal((await state()).defenses.entrees[0].id,'customDef');
  await barriere.getByRole('button',{name:'Agrandir',exact:true}).click();await barriere.getByRole('button',{name:'Supprimer',exact:true}).click();
  assert.equal((await state()).defenses.entrees.some(x=>x.id==='customDef'),false);
  await atk.getByRole('button',{name:'+ Ajouter une attaque',exact:true}).click();const added=atk.locator('.pc-attaque-card').last();
  assert.equal(await added.getByRole('button',{name:'Réduire',exact:true}).count(),1);await added.getByRole('button',{name:'Supprimer',exact:true}).click();
  for(let i=0;i<300;i++){const s=C.read(attrs).state;if(s.attaques[0].id==='custom'&&s.attaques[0].personnalisee.garde==='2>7'&&s.defenses.entrees.length===1)break;await page.waitForTimeout(100);}
  assert.equal(C.read(attrs).state.attaques[0].id,'custom');assert.equal(C.read(attrs).state.attaques[0].personnalisee.garde,'2>7');
  await page.reload();await sheet.locator('.pc-sheet').waitFor();assert.equal((await state()).attaques[0].id,'custom');assert.equal((await state()).defenses.entrees.length,1);
  assert.deepEqual(errors,[]);console.log('OK garde dessinée, cartes repliables en édition, commandes fixes, déplacements natifs, suppression et sauvegarde');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
