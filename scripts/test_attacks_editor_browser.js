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
  await frame().evaluate(()=>{window.chats=[];window.__owdChat=c=>chats.push(c);});
  const atk=sheet.locator('[data-module="attaque"]'),def=sheet.locator('[data-module="defense"]');
  assert.equal(await atk.getByRole('button',{name:'Consommer Endurance',exact:true}).count(),1);
  assert.equal(await atk.getByRole('button',{name:'Consommer Munition',exact:true}).count(),1);
  assert.equal(await def.getByRole('button',{name:'Consommer Endurance',exact:true}).count(),1);
  assert.equal(await def.getByRole('button',{name:'Consommer Munition',exact:true}).count(),0);
  await atk.locator('.pc-attaque-tete').filter({hasText:'Dague'}).click();const dague=atk.locator('.pc-attaque-card[data-attack-id="old"]');
  assert.equal(await dague.locator('.pc-attaque-coup').count(),6);
  for(let i=0;i<6;i++)assert.equal(await dague.locator('.pc-attaque-coup').nth(i).locator('polygon[data-q]').count(),37);
  assert.equal(await atk.locator('.pc-attaque-card .pc-attaque-toggle').count(),0);
  console.log('OK six coups normaux : trois anneaux complets et centre, options uniques en haut de chaque module');
  await atk.locator('.pc-gear').click();assert.equal(await dague.locator('.pc-attaque-type').inputValue(),'arme');assert.equal(await dague.locator('.pc-attaque-source').inputValue(),'blade');await atk.getByRole('button',{name:'+ Ajouter une attaque'}).click();
  const custom=atk.locator('.pc-attaque-card').last();await custom.locator('select').first().selectOption('custom');
  await custom.locator('input').first().fill('Trajet dessiné');await custom.locator('input').first().dispatchEvent('change');
  const editor=custom.locator('.pc-attaque-editor');await editor.getByRole('button',{name:'Passage',exact:true}).click();
  await editor.locator('polygon[data-q="0"][data-r="-1"]').click();
  await editor.getByRole('button',{name:'Touche',exact:true}).click();await editor.locator('polygon[data-q="0"][data-r="-2"]').click();
  for(let i=0;i<3;i++)await editor.getByRole('button',{name:'+',exact:true}).click();
  await editor.locator('polygon[data-q="0"][data-r="-6"]').click();
  assert.equal((await state()).attaques.at(-1).personnalisee.trajet,'1:passe>2:frappe>6:frappe');
  assert.deepEqual(await editor.locator('.hx-rang').allTextContents(),['1','2','3']);
  await editor.getByRole('button',{name:'Effacer',exact:true}).click();await editor.locator('polygon[data-q="0"][data-r="-2"]').click();
  assert.equal((await state()).attaques.at(-1).personnalisee.trajet,'1:passe>6:frappe');
  const layout=await custom.locator('.pc-attaque-custom-layout').evaluate(n=>({left:n.firstElementChild.getBoundingClientRect().right,right:n.lastElementChild.getBoundingClientRect().left}));assert.ok(layout.left<=layout.right);
  const checks=await editor.evaluate(n=>{
    const row=c=>{const b=Array.from(n.querySelectorAll(c+' button')).map(x=>x.getBoundingClientRect());return {widths:b.map(x=>x.width),ys:b.map(x=>x.y)};};
    const range=n.querySelector('.pc-attaque-editor-range').getBoundingClientRect(), kids=Array.from(n.querySelector('.pc-attaque-editor-range').children).map(x=>x.getBoundingClientRect());
    return {paint:row('.pc-attaque-editor-paint'),erase:row('.pc-attaque-editor-erase'),mid:(kids[0].left+kids.at(-1).right)/2,centre:(range.left+range.right)/2};
  });
  for(const row of [checks.paint,checks.erase]) {assert.ok(Math.abs(row.widths[0]-row.widths[1])<1);assert.ok(Math.abs(row.ys[0]-row.ys[1])<1);}
  assert.ok(Math.abs(checks.mid-checks.centre)<1);
  assert.equal(await custom.locator('.pc-attaque-source').count(),0);assert.equal(await custom.locator('.pc-arme label').filter({hasText:/^Type$/}).count(),0);
  assert.equal(await custom.locator('.pc-arme label').filter({hasText:/^Compétence$/}).count(),1);
  assert.equal(await custom.getByText('Cliquez les cases dans l’ordre du trajet. Le centre représente le personnage.',{exact:true}).count(),0);
  const info=custom.locator('.pc-attaque-custom-dessin');assert.equal(await info.getByText('Multiplicateur',{exact:true}).count(),1);assert.equal(await info.getByText('Type de touche',{exact:true}).count(),1);assert.equal(await info.getByText('Type de passage',{exact:true}).count(),1);
  await custom.screenshot({path:'/tmp/owd-attack-editor-3102.png'});
  // Cost for a custom attack is its difficulty; bow consumes the chosen pile only.
  await atk.getByRole('button',{name:'Consommer Endurance',exact:true}).click();await atk.getByRole('button',{name:'Consommer Munition',exact:true}).click();
  await atk.locator('.pc-gear').click();await atk.locator('.pc-attaque-tete').filter({hasText:'Onde de feu'}).click();
  await atk.locator('.pc-attaque-card').filter({hasText:'Onde de feu'}).locator('.pc-attaque-coup').click();assert.equal((await state()).etat.pe,95);
  await atk.locator('.pc-attaque-tete').filter({hasText:'Arc'}).click();const bow=atk.locator('.pc-attaque-card[data-attack-id="bow"]');
  await bow.locator('.pc-attaque-simple').click();assert.equal((await state()).etat.pe,89);assert.equal((await state()).inv.objets.find(o=>o.ref==='arrows').qte,2);
  await atk.getByRole('button',{name:'Consommer Endurance',exact:true}).click();await bow.locator('.pc-attaque-simple').click();assert.equal((await state()).etat.pe,89);assert.equal((await state()).inv.objets.find(o=>o.ref==='arrows').qte,1);
  await atk.getByRole('button',{name:'Consommer Munition',exact:true}).click();await bow.locator('.pc-attaque-simple').click();assert.equal((await state()).inv.objets.find(o=>o.ref==='arrows').qte,1);
  await def.getByRole('button',{name:'Consommer Endurance',exact:true}).click();await def.getByRole('button',{name:'Esquive',exact:false}).click();await def.locator('[data-defense-id="esquive"] .pc-defense-bouton').click();
  await sheet.locator('.pc-modal').getByLabel('Dégâts subis', {exact:true}).fill('30');await sheet.locator('.pc-modal').getByRole('button',{name:'Valider'}).click();assert.equal((await state()).etat.pe,81);
  await sheet.getByLabel('Taille du personnage').selectOption('grande');
  for(let i=0;i<300;i++){const s=C.read(attrs).state;if(s.taille==='grande'&&s.attaques.at(-1).personnalisee?.trajet==='1:passe>6:frappe'&&s.combatOptions.defenses.utiliseEndurance&&s.etat.pe===81)break;await page.waitForTimeout(100);}
  assert.equal(C.read(attrs).state.taille,'grande');await page.reload();await sheet.locator('.pc-sheet').waitFor();
  assert.equal(await sheet.getByLabel('Taille du personnage').inputValue(),'grande');assert.equal((await state()).attaques.at(-1).personnalisee.trajet,'1:passe>6:frappe');
  assert.equal((await state()).combatOptions.attaques.utiliseEndurance,false);assert.equal((await state()).combatOptions.attaques.utiliseMunition,false);assert.equal((await state()).combatOptions.defenses.utiliseEndurance,true);
  assert.deepEqual(errors,[]);
  console.log('OK dessin, ordre, effacement, portée six, options globales, coûts réels, munitions, taille et réouverture');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
