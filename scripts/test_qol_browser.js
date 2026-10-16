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
 const url='http://127.0.0.1:'+server.address().port;
 const extra=process.env.OWD_CHROMIUM ? {executablePath:process.env.OWD_CHROMIUM,args:['--no-sandbox']} : {};
 const browser=await chromium.launch({headless:true,...extra}); const errors=[];
 try {
  const ctx=await browser.newContext({viewport:{width:1600,height:1100}});
  await ctx.exposeBinding('backend',async(_,m)=>{if(m.kind==='read')return C.copy(attrs);if(m.kind==='write'){writes.push(m.data.name);attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};}});
  const page=await ctx.newPage(); page.on('pageerror',e=>errors.push(e.message)); await page.goto(url+'/harness');
  const sheet=page.frameLocator('iframe'); await sheet.locator('.pc-sheet').waitFor();
  let frame=page.frames().find(f=>f.url().includes('roll20-fiche'));
  const state=()=>frame.evaluate(()=>JSON.parse(__owdLocalStorage.getItem('owd-perso')));
  const replace=async(fn)=>{let s=await state();fn(s);await frame.evaluate(s=>Owd.__recoitEtat(s),s);};
  await frame.evaluate(()=>{window.chats=[];window.__owdChat=c=>chats.push(c);});
  assert.equal(await sheet.locator('[data-module="survie"] button').filter({hasText:/chat/i}).count(),0);
  assert.equal(await sheet.locator('[data-module="survie"] .pc-vital-palier').count(),27);
  assert.equal(await sheet.locator('[data-module="pi"] .pc-vital-palier').count(),9);
  assert.equal(await sheet.locator('.pc-expo-jauge .pc-vital-palier').count(),9);
  for(const id of ['pv','pe','pm','pc','contenance']) assert.equal(await sheet.locator('[data-module="'+id+'"] .pc-vital-palier').count(),0);
  assert.equal(await sheet.locator('[data-module="pi"] .pc-vital-nom').textContent(),'Innocence');
  assert.equal(await sheet.locator('[data-module="pi"]').evaluate(n=>n.previousElementSibling.dataset.module),'exposition');
  const pv=sheet.locator('[data-module="pv"] .pc-vital-delta');
  for(const [text,expected] of [['+20',120],['-20',100],['20',120],['−20',100]]){
    await pv.fill(text);await pv.press('Enter');assert.equal((await state()).etat.pv,expected);
  }
  await pv.fill('+garbage');await pv.press('Enter');assert.equal((await state()).etat.pv,100);
  const belly=sheet.locator('[data-module="contenance"] .pc-vital-delta');
  await belly.fill('+2,5');await belly.press('Enter');assert.equal((await state()).etat.contenance,2.5);
  const expo=sheet.locator('[data-module="exposition"] .pc-vital-delta');
  await expo.fill('+20');await expo.press('Enter');assert.equal((await state()).etat.expo,20);
  const hour=sheet.getByLabel('Heures, en plus ou en moins');
  const minute=sheet.getByLabel('Minutes, en plus ou en moins');
  const before=(await state()).horloge.minutes;
  await minute.fill('+1');await minute.press('Enter');assert.equal((await state()).horloge.minutes,before+1);
  const colors=await frame.evaluate(()=>{const a=document.querySelector('.pc-temps-val'),b=document.querySelector('.pc-vital-delta');return [getComputedStyle(a).backgroundColor,getComputedStyle(b).backgroundColor];});assert.equal(colors[0],colors[1]);
  // Exposition : chaque sens utilise la largeur entière et zéro est vide.
  const exFill=sheet.locator('.pc-expo-jauge > i');
  for(const [factor,left,width,filled] of [[.3,'0%','30%',3],[-.3,'70%','30%',3],[0,'0%','0%',0]]){
    const m=await frame.evaluate(()=>Owd.__calculs.expoMax());
    await replace(s=>s.etat.expo=m*factor);
    assert.equal(await exFill.evaluate(n=>n.style.left),left);
    assert.equal(await exFill.evaluate(n=>n.style.width),width);
    assert.equal(await sheet.locator('.pc-expo-jauge .plein').count(),filled);
  
  }
  // Individual use and recovery, send, remount, theme and received state preserve use.
  const action=sheet.locator('[data-module="desaction"]');
  await action.getByRole('button',{name:'Consommer le dé 1',exact:true}).click();
  assert.equal((await state()).desUtilises[0],true);
  assert.equal(await action.locator('.pc-desaction-pose').nth(0).isDisabled(),true);
  await frame.evaluate(()=>Owd.remonte());
  assert.equal(await action.locator('.pc-desaction-pose').nth(0).isDisabled(),true);
  await frame.evaluate(()=>document.documentElement.classList.toggle('night'));
  await page.waitForTimeout(50);
  assert.equal(await action.locator('.pc-desaction-pose').nth(0).isDisabled(),true);
  await replace(s=>s.notes='réception distante');
  assert.equal(await action.locator('.pc-desaction-pose').nth(0).isDisabled(),true);
  await action.getByRole('button',{name:'Récupérer le dé 1',exact:true}).click();
  await action.locator('.pc-desaction-pose').nth(0).click();
  await action.getByRole('button',{name:'Envoyer',exact:true}).click();
  assert.equal((await state()).desUtilises[0],true);
  for(let attempt=0;attempt<400&&!C.read(attrs).state.desUtilises?.[0];attempt++)await page.waitForTimeout(100);
  assert.equal(C.read(attrs).state.desUtilises[0],true);
  await page.reload();await sheet.locator('.pc-sheet').waitFor();
  frame=page.frames().find(f=>f.url().includes('roll20-fiche'));
  assert.equal(await action.locator('.pc-desaction-pose').nth(0).isDisabled(),true);
  await replace(s=>{s.allure='lourd';s.allureCran=5;});
  assert.equal(await action.locator('.pc-desaction-de.perdu').count(),0);
  assert.equal(await action.locator('.pc-desaction-pose:not(:disabled)').count(),await action.locator('.pc-desaction-pose').count()-1);
  await action.getByRole('button',{name:'Récupérer',exact:true}).click();
  assert.equal(await action.locator('.pc-desaction-pose:disabled').count(),0);
  // Raw bases and effects do not cancel another category. Additional modifiers apply once.
  const max=await frame.evaluate(()=>{const c=Owd.__calculs;return {pr:c.prMax(),ps:c.psMax(),ph:c.phMax(),expo:c.expoMax()};});
  await replace(s=>{s.etat.pr=max.pr*.7;s.etat.ps=max.ps*.5;s.etat.ph=max.ph*.8;s.etat.expo=0;s.effAlcool=0;s.effAutre=0;s.effParties={pr:{effet:-1,mod:0},ps:{effet:-20,mod:0}};});
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effNiveauDe('ps')),5);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effPartie('ps')),0);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effPartie('ph')),2);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),4);
  const collapse=sheet.locator('[data-module="effondrement"]');
  assert.deepEqual(await collapse.locator('.pc-eff-partie').evaluateAll(ns=>ns.map(n=>n.dataset.effPartie)),['pr','pi','froid','chaud','ps','ph','alcool','autre']);
  for(const label of ['Repos','Innocence','Froid','Chaud','Satiété','Hydratation','Alcool','Autre']){
    for(const field of ['Base','Effets']) assert.equal(await sheet.getByLabel(label+' — '+field,{exact:true}).getAttribute('readonly'),'');
  }
  // Les effets sont alimentés par l’état/mods, jamais édités dans cette grille.
  await replace(s=>s.effParties.ph={effet:-1,mod:0});
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),3);
  const deltaRepos=sheet.getByLabel('Repos — ±',{exact:true});
  await deltaRepos.fill('+2');await deltaRepos.press('Enter');
  assert.equal(await deltaRepos.inputValue(),'');
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),5);
  const deltaAutre=sheet.getByLabel('Autre — ±',{exact:true});
  await deltaAutre.fill('-1');await deltaAutre.press('Enter');
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),4);
  await frame.evaluate(()=>Owd.remonte());
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),4);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effNiveauDe('ps')),5);
  await replace(s=>{s.etat.pi=80;});
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effPartie('pi')),2);
  assert.equal(await sheet.getByLabel('Innocence — Base',{exact:true}).inputValue(),'2');
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),6);
  // Les deux signes de l’exposition restent exclusifs, les modificateurs sont indépendants.
  await replace(s=>{s.etat.expo=-max.expo*.3;s.effParties.froid={effet:-1,mod:0};s.effParties.chaud={effet:0,mod:0};});
  assert.equal(await sheet.getByLabel('Froid — Base',{exact:true}).inputValue(),'3');
  assert.equal(await sheet.getByLabel('Chaud — Base',{exact:true}).inputValue(),'0');
  await replace(s=>s.etat.expo=max.expo*.3);
  assert.equal(await sheet.getByLabel('Froid — Base',{exact:true}).inputValue(),'0');
  assert.equal(await sheet.getByLabel('Chaud — Base',{exact:true}).inputValue(),'3');
  // Migration des réglages d’exposition de la version précédente.
  await replace(s=>{s.etat.expo=-max.expo*.2;s.effParties={expo:{effet:-1,mod:1}};});
  assert.equal((await state()).effParties.froid.effet,-1);
  assert.equal((await state()).effParties.froid.mod,1);
  // Alcohol counts only occupied time and expires one level per two hours; exact undo.
  await replace(s=>{s.effParties={};s.effAutre=0;s.effAlcool=2;s.effAlcoolSecondes=0;s.effort='repos';});
  await hour.fill('+1');await hour.press('Enter'); assert.equal((await state()).effAlcool,2);assert.equal((await state()).effAlcoolSecondes,3600);
  await hour.fill('+1');await hour.press('Enter'); assert.equal((await state()).effAlcool,1);assert.equal((await state()).effAlcoolSecondes,0);
  await hour.fill('-1');await hour.press('Enter'); assert.equal((await state()).effAlcool,2);assert.equal((await state()).effAlcoolSecondes,3600);
  await hour.fill('+3');await hour.press('Enter'); assert.equal((await state()).effAlcool,0);assert.equal((await state()).effAlcoolSecondes,0);
  // Fallback attributes and sync preserve all added fields.
  const sample=await state();sample.desUtilises={0:true,2:true};sample.effParties.pr={effet:-3,mod:1};sample.effAlcool=1;sample.effAlcoolSecondes=99;
  sample.effParties.pi={base:2,effet:-1,mod:1};
  const packed=M.stateToAttrs(sample,null);delete packed.owd_state;
  const back=M.attrsToState(packed);assert.deepEqual(back.desUtilises,sample.desUtilises);assert.deepEqual(back.effParties,sample.effParties);assert.equal(back.effAlcool,1);assert.equal(back.effAlcoolSecondes,99);
  assert.deepEqual(C.rebuild(C.flatten(sample)),sample);
  // Preview representative values, check bounds in both themes and compact width.
  await replace(s=>{s.etat.pi=50;s.etat.pr=max.pr*.8;s.etat.ps=max.ps*.8;s.etat.ph=max.ph*.9;s.etat.expo=max.expo*.1;s.effAlcool=1;s.effAlcoolSecondes=0;s.effParties={pr:{effet:-1,mod:0},ps:{effet:-1,mod:0}};s.effAutre=0;s.desUtilises=[true,false,true];});
  async function capture(locator,file){
    for(let attempt=0;attempt<5;attempt++){
      try{await locator.screenshot({path:file});return;}
      catch(e){if(attempt===4)throw e;await page.waitForTimeout(150);}
    }
  }
  for(const night of [true,false]){
   await frame.evaluate(n=>document.documentElement.classList.toggle('night',n),night);await page.waitForTimeout(50);
   await page.mouse.move(0,0);
   await capture(collapse,'/tmp/owd-effondrement-'+(night?'night':'day')+'.png');
   await capture(sheet.locator('[data-module="pi"]'),'/tmp/owd-innocence-'+(night?'night':'day')+'.png');
   await capture(sheet.locator('[data-module="exposition"]'),'/tmp/owd-exposition-'+(night?'night':'day')+'.png');
   const layout=await collapse.locator('.pc-eff-partie').evaluateAll(ns=>ns.map(n=>({key:n.dataset.effPartie,x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,w:n.getBoundingClientRect().width,bg:getComputedStyle(n).backgroundColor})));
   for(let i=0;i<8;i+=2)assert.equal(layout[i].y,layout[i+1].y);
   for(let i=2;i<8;i+=2)assert.ok(layout[i].y>layout[i-2].y);
   const fonts=await collapse.locator('.pc-big .k, .pc-eff-partie > .k').evaluateAll(ns=>ns.map(n=>{const s=getComputedStyle(n);return [s.fontSize,s.fontFamily,s.fontWeight,s.letterSpacing].join('|')}));
   assert.equal(new Set(fonts).size,1);
   assert.equal(await collapse.locator('.pc-eff-partie .pc-vital-jauge').count(),8);
   assert.ok(await collapse.locator('.pc-eff-partie .pc-vital-max').evaluateAll(ns=>ns.every(n=>n.textContent==='/ 10')));
   assert.ok(await collapse.locator('.pc-eff-champs').evaluateAll(ns=>ns.every(n=>{const a=n.getBoundingClientRect(),b=n.parentElement.getBoundingClientRect();return Math.abs(a.left-b.left)<=1&&Math.abs(a.right-b.right)<=1;})));
   assert.ok(await sheet.locator('.pc-temps-val').evaluateAll(ns=>ns.every(n=>getComputedStyle(n).boxShadow==='none'&&getComputedStyle(n).borderTopWidth==='0px')));
   assert.ok(await action.locator('.pc-desaction-bascule').evaluateAll(ns=>ns.every(n=>{const a=n.getBoundingClientRect(),b=n.parentElement.getBoundingClientRect();return Math.abs(a.top-b.top)<1&&Math.abs(a.right-b.right)<1&&a.width>20;})));
   assert.ok(!(await collapse.textContent()).includes('Aucune'));
   const ticks=await sheet.locator('[data-module="pi"] .pc-vital-palier').evaluateAll(ns=>ns.map(n=>({filled:n.classList.contains('plein'),color:getComputedStyle(n).backgroundColor})));
   if(night)assert.ok(ticks.filter(t=>t.filled).every(t=>t.color==='rgb(48, 52, 59)'));
   await capture(action,'/tmp/owd-actions-'+(night?'night':'day')+'.png');
   assert.ok(await collapse.locator('.pc-eff-valeur').evaluateAll(ns=>ns.every(n=>{let r=n.getBoundingClientRect(),p=n.closest('.pc-eff-partie').getBoundingClientRect();return r.left>=p.left&&r.right<=p.right+1;})));
  }
  assert.deepEqual(errors,[]);
  console.log('OK survie sans chat, paliers, saisies +/−/virgule, couleurs, dés persistants/manuels sans blocage mouvement, effets locaux et total, alcool 2h/recul, fallback/sync, rendu jour/nuit sans débordement.');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
