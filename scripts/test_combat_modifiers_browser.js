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
seed.inv.objets.forEach(o=>{for(const k of Object.keys(o))if(k.startsWith('prot_')||k.startsWith('res_'))delete o[k];});
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
  const custom=atk.locator('[data-attack-id="custom"]'),sans=def.locator('[data-defense-id="sans"]');
  await sans.getByRole('button',{name:'Agrandir',exact:true}).click();assert.equal(await sans.locator('table').count(),0);
  assert.equal(await sans.getByRole('button',{name:'Se défendre',exact:true}).count(),1);
  async function fill(box,label,n){const i=box.getByLabel(label,{exact:true});assert.equal(await i.isDisabled(),false);await i.fill(String(n));await i.dispatchEvent('change');}
  await fill(atk,'Dégâts Feu',5);await fill(atk,'Dégâts Froid',3);
  await custom.getByRole('button',{name:'Agrandir',exact:true}).click();
  assert.match(await custom.locator('span.touche').textContent(),/33 feu.*3 froid/);
  assert.match(await custom.locator('.passage').textContent(),/16 feu.*1 froid/);
  await custom.locator('.pc-attaque-coup').click();assert.match(await frame().evaluate(()=>chats.at(-1)),/33 feu.*3 froid/);
  await atk.getByRole('button',{name:'Attaque Lente',exact:true}).click();assert.match(await custom.locator('span.touche').textContent(),/16 feu.*1 froid/);
  await fill(def,'Protection Feu',4);await fill(def,'Résistance Feu',10);
  assert.equal(await sans.locator('[data-damage-type="feu"] .pc-defense-protection').textContent(),'4');
  await sans.getByRole('button',{name:'Se défendre',exact:true}).click();const modal=sheet.locator('.pc-modal');await modal.getByLabel('Dégâts subis',{exact:true}).fill('30');await modal.getByLabel('Type de dégâts').selectOption('feu');await modal.getByRole('button',{name:'Valider'}).click();
  assert.match(await frame().evaluate(()=>chats.at(-1)),/Dégâts subis.*23/);
  const shield=def.locator('[data-defense-id="shield"]');await shield.getByRole('button',{name:'Agrandir',exact:true}).click();assert.equal(await shield.locator('[data-damage-type="feu"] .pc-defense-protection').textContent(),'14');
  await atk.locator('.pc-gear').click();await def.locator('.pc-gear').click();await fill(def,'Protection Froid',-2);
  const sizes=await custom.evaluate(n=>{const bs=Array.from(n.querySelectorAll('.pc-attaque-editor-paint button,.pc-attaque-editor-erase button')).map(x=>x.getBoundingClientRect().height);const head=n.querySelector('.pc-combat-tete').getBoundingClientRect(),name=n.querySelector('.pc-attaque-nom').getBoundingClientRect();return {bs,mid:Math.abs((head.top+head.bottom-name.top-name.bottom)/2),font:getComputedStyle(n.querySelector('.pc-attaque-nom')).fontSize,radius:getComputedStyle(n.querySelector('.pc-attaque-editor-range button')).borderRadius};});
  assert.ok(Math.max(...sizes.bs)-Math.min(...sizes.bs)<1);assert.ok(sizes.mid<1);assert.ok(parseFloat(sizes.font)>=10);assert.equal(sizes.radius,'50%');
  await custom.screenshot({path:'/tmp/owd-combat-modifiers-313.png'});await shield.screenshot({path:'/tmp/owd-defense-modifiers-313.png'});
  for(let i=0;i<300;i++){const s=C.read(attrs).state;if(s.combatModifiers?.attaques?.feu===5&&s.combatModifiers?.protections?.froid===-2)break;await page.waitForTimeout(100);}
  assert.equal(C.read(attrs).state.combatModifiers.attaques.feu,5);await page.reload();await sheet.locator('.pc-sheet').waitFor();assert.equal((await state()).combatModifiers.protections.froid,-2);
  assert.deepEqual(errors,[]);console.log('OK disposition, hauteurs égales, portée identique température, défense vide sans tableau, modificateurs multisources, modes lents, chat et sauvegarde');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
