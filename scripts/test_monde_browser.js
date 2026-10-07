/* Harnais Monde : vrai panneau et vrai pont, deux collections Backbone
 * indépendantes, serveur simulé partagé. Aucun compte Roll20 nécessaire.
 * NODE_PATH=/chemin/node_modules node scripts/test_sync_browser.js
 * Dépendance de vérification : playwright + Chromium.
 */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'), path=require('node:path'), http=require('node:http'), assert=require('node:assert/strict');
const D=require('../docs/javascripts/owd-monde-data.js'), C=D.sync;
const root=path.resolve(__dirname,'..');
let attrs={owd_camp_h:{current:'7,1430',max:''},owd_camp_conf:{current:'{"v":1,"degres":18,"lieu":"Berg"}',max:''},owd_camp_veille:{current:'Ancien garde',max:''}},writes=[],dropOnce=false;
function harness() { return `<!doctype html><meta charset="utf-8"><style>iframe{width:360px;height:350px}</style><script>
function model(data) {return {attributes:{...data},get(k){return this.attributes[k]},set(d){Object.assign(this.attributes,d)},save(_,opts){window.backend({kind:'write',data:this.attributes}).then(()=>opts&&opts.success&&opts.success())}}}
const collection={models:[],create(data){const m=model(data);this.models.push(m);return m},fetch(opts){window.backend({kind:'read'}).then(attrs=>{this.models=Object.keys(attrs).map(name=>model({name,...attrs[name]}));opts&&opts.success&&opts.success()})}};
const ch={id:'shared',attribs:collection,get(k){return k==='name'?new URL(location.href).searchParams.get('name')||'Camp':k==='controlledby'?(new URL(location.href).searchParams.get('readonly')?'':'all'):''}};
window.Campaign={characters:{get(id){return id==='shared'?ch:null},models:[ch]},players:{models:[]}};
</script><script src="/bridge.js"></script><iframe src="/roll20-camp.html"></iframe>`; }
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
    await ctx.exposeBinding('backend',async(_,m)=>{
      if(m.kind==='read'){await new Promise(r=>setTimeout(r,70));return C.copy(attrs);}
      if(m.kind==='write'){if(dropOnce&&m.data.name.startsWith(C.PREFIX)){dropOnce=false;return;}await new Promise(r=>setTimeout(r,30));attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};writes.push(m.data.name);}
    });
    const pages=await Promise.all([ctx.newPage(),ctx.newPage()]);pages.forEach(p=>p.on('pageerror',e=>errors.push(e.message)));
    await Promise.all(pages.map(p=>p.goto(url+'/harness')));
    const frames=pages.map(p=>p.frameLocator('iframe'));
    await Promise.all(frames.map(f=>f.locator('input[aria-label="Température en °C"]:enabled').waitFor()));
    const [a,b]=frames;
    const temp=f=>f.locator('input[aria-label="Température en °C"]');
    assert.equal(await a.locator('input[aria-label="Jours"]').inputValue(),'7');
    assert.equal(await a.locator('input[aria-label="Heures"]').inputValue(),'23');
    assert.equal(await temp(a).inputValue(),'18');
    assert.deepEqual(await a.locator('h2').allTextContents(),['Horloge','Température']);
    console.log('OK ancien Camp converti, interface limitée à horloge et température');
    await temp(a).fill('-8.5');
    await b.locator('input[aria-label="Minutes à appliquer"]').fill('20');
    await b.locator('button[aria-label="Appliquer les minutes"]').click();
    await pages[0].waitForFunction(()=>document.querySelector('iframe').contentDocument.querySelector('input[aria-label="Jours"]').value==='8');
    await temp(b).waitFor();
    await pages[1].waitForFunction(()=>document.querySelector('iframe').contentDocument.querySelector('input[aria-label="Température en °C"]').value==='-8.5');
    assert.equal(await temp(a).evaluate(n=>document.activeElement===n),true);
    assert.equal(await a.locator('input[aria-label="Heures"]').inputValue(),'0');
    assert.equal(await a.locator('input[aria-label="Minutes"]').inputValue(),'10');
    assert.equal(D.read(attrs).temperature,-8.5);
    console.log('OK horloge et température simultanées, minuit et focus conservé');
    // Le dernier serveur gagne, même si chacun gardait son champ sous les doigts.
    await temp(a).fill('12');await temp(b).fill('30');
    await pages[0].waitForTimeout(5500);
    await temp(a).evaluate(n=>n.blur());await temp(b).evaluate(n=>n.blur());
    await pages[0].waitForTimeout(2500);
    assert.equal(await temp(a).inputValue(),await temp(b).inputValue());
    assert.equal(Number(await temp(a).inputValue()),D.read(attrs).temperature);
    console.log('OK conflit du même champ : convergence sans boucle');
    dropOnce=true;await temp(a).fill('19.5');await temp(a).evaluate(n=>n.blur());
    await pages[1].waitForFunction(()=>document.querySelector('iframe').contentDocument.querySelector('input[aria-label="Température en °C"]').value==='19.5');
    assert.equal(D.read(attrs).temperature,19.5);
    console.log('OK écriture perdue reprise sans perdre la modification locale');
    await pages[1].reload();await b.locator('input[aria-label="Température en °C"]:enabled').waitFor();
    assert.equal(await temp(b).inputValue(),'19.5');
    assert.equal(await b.locator('input[aria-label="Jours"]').inputValue(),'8');
    assert.ok(writes.every(n=>n===C.BASE||n.startsWith(C.PREFIX)));
    assert.equal(attrs.owd_camp_h.current,'7,1430');assert.ok(attrs.owd_camp_conf.current.includes('Berg'));
    // Le vrai pont retrouve aussi un personnage déjà nommé Monde.
    const page=await ctx.newPage();await page.goto(url+'/harness?name=Monde');
    const f=page.frameLocator('iframe');await f.locator('input[aria-label="Température en °C"]:enabled').waitFor();assert.equal(await temp(f).inputValue(),'19.5');
    await pages[0].locator('iframe').screenshot({path:path.join(root,'../../..','deliverables','monde-preview.png')});
    // Une frappe 60 puis 61 minutes reporte une seule heure, pas deux.
    const minutes=a.locator('input[aria-label="Minutes"]');await minutes.fill('60');await minutes.fill('61');await minutes.evaluate(n=>n.blur());
    assert.equal(await a.locator('input[aria-label="Heures"]').inputValue(),'1');assert.equal(await minutes.inputValue(),'1');
    // Un utilisateur sans contrôle peut lire sans activer d'écriture.
    const readOnly=await ctx.newPage();await readOnly.goto(url+'/harness?name=Monde&readonly=1');const rf=readOnly.frameLocator('iframe');
    await rf.locator('.om-notice').filter({hasText:'Lecture seule'}).waitFor();assert.equal(await rf.locator('input:enabled').count(),0);
    assert.deepEqual(errors,[]);
    console.log('OK réouverture, découverte Monde, anciennes données conservées, aucun attribut de fiche écrit');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
