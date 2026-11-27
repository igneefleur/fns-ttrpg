'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const D=require('../docs/javascripts/owd-monde-data.js'),C=D.sync,root=path.resolve(__dirname,'..');
let attrs={[C.BASE]:{current:JSON.stringify({format:1,state:{v:1,temperature:17.5,dateDepart:{annee:412,mois:4,jour:1},horloge:{jours:1,heures:12,minutes:30,secondes:0}}}),max:''}},writes=[];
const harness=`<!doctype html><meta charset="utf-8"><script>
function model(data){return {attributes:{...data},get(k){return this.attributes[k]},set(d){Object.assign(this.attributes,d)},save(_,opts){window.backend({kind:'write',data:this.attributes}).then(()=>opts&&opts.success&&opts.success())}}}
const collection={models:[],create(data){const m=model(data);this.models.push(m);return m},fetch(opts){window.backend({kind:'read'}).then(attrs=>{this.models=Object.keys(attrs).map(name=>model({name,...attrs[name]}));opts&&opts.success&&opts.success()})}};
const ch={id:'shared',attribs:collection,get(k){return k==='name'?'Monde':k==='controlledby'?(location.search.includes('readonly')?'':'all'):''}};
window.Campaign={characters:{get(id){return id==='shared'?ch:null},models:[ch]},players:{models:[]}};
</script><script src="/docs/javascripts/owd-sync.js"></script><script src="/docs/javascripts/owd-monde-data.js"></script><script data-owd-version="4.32.0" data-owd-mode="beta" data-owd-browser="firefox" src="/extension/firefox/beta/roll20-page.js"></script><iframe style="width:360px;height:700px;border:0" src="/panel"></iframe>`;
const panel=`<!doctype html><html lang="fr" class="night"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/docs/stylesheets/owd-monde.css"><body><div id="monde-panneau"></div><script src="/docs/javascripts/owd-sync.js"></script><script src="/docs/javascripts/owd-monde-data.js"></script><script src="/docs/javascripts/owd-monde.js"></script></body></html>`;
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');let body,mime='text/html';if(u.pathname==='/harness')body=harness;else if(u.pathname==='/panel')body=panel;else{const p=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.writeHead(404);res.end();return;}body=fs.readFileSync(p);mime=p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'application/octet-stream';}res.writeHead(200,{'content-type':mime});res.end(body);});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||chromium.executablePath(),args:['--no-sandbox']});
 try{
  const ctx=await browser.newContext({viewport:{width:450,height:900}}),errors=[];
  await ctx.exposeBinding('backend',async(_,m)=>{if(m.kind==='read')return C.copy(attrs);if(m.kind==='write'){attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};writes.push(m.data.name);}});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url+'/harness');const f=page.frameLocator('iframe');
  const temp=f.getByRole('spinbutton',{name:'Température en °C',exact:true});await f.locator('input[aria-label="Température en °C"]:enabled').waitFor();await f.getByLabel('Gestion',{exact:true}).locator('option[value="auto"]:enabled').waitFor({state:'attached'});
  assert.equal(await temp.inputValue(),'18');await f.getByLabel('Gestion',{exact:true}).selectOption('auto');await f.getByLabel('Journée',{exact:true}).selectOption('progressif');
  assert.equal(await temp.isDisabled(),true);assert.equal(await temp.inputValue(),'32');
  assert.match(await f.locator('.om-sun-times').textContent(),/Lever : 7 h · Au plus haut : 14 h · Coucher : 21 h/);
  await f.locator('.om-hourly summary').click();assert.equal(await f.locator('tbody tr').count(),24);assert.match(await f.locator('tbody tr').nth(16).textContent(),/34 °C/);
  assert.match(await f.locator('tbody tr').nth(7).textContent(),/Lever du soleil/);assert.match(await f.locator('tbody tr').nth(14).textContent(),/Soleil au plus haut/);
  const heures=f.getByRole('spinbutton',{name:'Heures',exact:true}),minutes=f.getByRole('spinbutton',{name:'Minutes',exact:true});await heures.fill('16');await minutes.fill('0');await minutes.blur();assert.equal(await temp.inputValue(),'34');
  await f.getByLabel('Région',{exact:true}).selectOption('enmerkar');assert.equal(await temp.inputValue(),'34');
  await f.locator('.om-date-depart summary').click();const mois=f.getByRole('spinbutton',{name:'Mois de début de campagne',exact:true});await mois.fill('10');await mois.blur();assert.equal(await temp.inputValue(),'2');
  assert.match(await f.locator('.om-sun-times').textContent(),/Lever : 9 h · Au plus haut : 14 h · Coucher : 19 h/);
  assert.match(await f.locator('.om-auto-fields').textContent(),/Minimum : −?(-8|8) °C à 8 h/);
  await heures.fill('8');await heures.blur();assert.equal(await temp.inputValue(),'-8');assert.equal(await f.locator('.om-sun-position').textContent(),'Nuit');
  await f.getByLabel('Journée',{exact:true}).selectOption('brut');assert.equal(await temp.inputValue(),'-6');await heures.fill('9');await heures.blur();assert.equal(await temp.inputValue(),'0');assert.equal(await f.locator('.om-sun-position').textContent(),'Lever du soleil');
  await f.getByLabel('Gestion',{exact:true}).selectOption('manuel');assert.equal(await temp.inputValue(),'18');assert.equal(await temp.isEnabled(),true);
  await f.getByLabel('Gestion',{exact:true}).selectOption('auto');await f.getByLabel('Journée',{exact:true}).selectOption('progressif');
  assert.equal(await temp.inputValue(),'-6');
  await f.getByLabel('Saisons',{exact:true}).selectOption('progressif');
  await mois.fill('4');await mois.blur();
  const jours=f.getByRole('spinbutton',{name:'Jour de campagne',exact:true});await jours.fill('42');await jours.blur();
  await heures.fill('16');await heures.blur();assert.equal(await temp.inputValue(),'38');
  await heures.fill('17');await heures.blur();assert.equal(await temp.inputValue(),'37');
  await minutes.fill('59');await minutes.blur();assert.equal(await temp.inputValue(),'37');
  await heures.fill('6');await heures.blur();assert.equal(await temp.inputValue(),'20');
  await heures.fill('7');await heures.blur();assert.equal(await temp.inputValue(),'23');
  await heures.fill('16');await heures.blur();assert.equal(await temp.inputValue(),'38');
  await new Promise(r=>setTimeout(r,1800));assert.equal(D.read(attrs).temperature,17.5);assert.equal(D.read(attrs).temperatureRegion,'enmerkar');
  await page.reload();await f.getByLabel('Gestion',{exact:true}).waitFor();await f.locator('.om-sun-position').filter({hasText:'Soleil descendant'}).waitFor();assert.equal(await f.getByLabel('Gestion',{exact:true}).inputValue(),'auto');assert.equal(await f.getByLabel('Journée',{exact:true}).inputValue(),'progressif');assert.equal(await f.getByLabel('Saisons',{exact:true}).inputValue(),'progressif');assert.equal(await temp.inputValue(),'38');
  const bridgeTemperature=await f.locator('body').evaluate(()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Température du pont absente')),5000);function recu(e){if(e.data&&e.data.type==='monde-temperature-result'){clearTimeout(timer);window.removeEventListener('message',recu);resolve(e.data.temperature);}}window.addEventListener('message',recu);window.top.postMessage({ns:'owd',type:'monde-temperature'},'*');}));
  assert.equal(bridgeTemperature,38);assert.ok(Number.isInteger(bridgeTemperature));
  const ro=await ctx.newPage();ro.on('pageerror',e=>errors.push(e.message));await ro.goto(url+'/harness?readonly=1');const rf=ro.frameLocator('iframe');await rf.locator('.om-notice').filter({hasText:'Lecture seule'}).waitFor();assert.equal(await rf.locator('input:enabled,select:enabled,button:enabled').count(),0);
  await f.locator('.om-hourly summary').click();await f.locator('body').evaluate(()=>document.documentElement.style.width='360px');
  assert.equal(await f.locator('body').evaluate(()=>document.documentElement.scrollWidth<=360),true);
  if(process.env.OWD_SCREENSHOT_PATH)await page.locator('iframe').screenshot({path:process.env.OWD_SCREENSHOT_PATH});
  assert.deepEqual(errors,[]);assert.ok(writes.every(n=>n===C.BASE||n.startsWith(C.PREFIX)));
  console.log('OK navigateur : panneau et pont réels, automatique, modes, régions, calendrier, soleil horaire, réouverture, précision, lecture seule et largeur 360 px.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
