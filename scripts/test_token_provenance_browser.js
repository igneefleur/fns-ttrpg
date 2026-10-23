/* Vrai pont Roll20 et vraie fiche : ouverture, consultation, présence et erreurs. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const M=require('../docs/javascripts/owd-attr-map.js'),C=require('../docs/javascripts/owd-sync.js').Compact;
const root=path.resolve(__dirname,'..');let echo=null,attrs,block=false,latest='4.2.0',metadataFailure=false,filesFailure=false;
function reset(release){const s=M.blank();s.name='Personnage test';s.etat.pe=100;s.etat.pv=100;s.rel=release||M.release();s.capsLeviers={max:{a1:{pv:20,pe:-10,pm:20}}};s.comps=[{id:'c1',nom:'Lutte',rang:1,groupe:'Physique'}];attrs=C.encode(s);const meta=JSON.parse(attrs.owd_storage.current);meta.phase='ready';attrs.owd_storage.current=JSON.stringify(meta);attrs.owd_version={current:String(s.v),max:s.rel};block=false;latest='4.2.0';metadataFailure=false;filesFailure=false;}
function harness(player){return `<!doctype html><meta charset="utf-8"><style>iframe{width:1100px;height:850px}</style><script>
function model(data){return {attributes:{...data},get(k){return this.attributes[k]},set(d){Object.assign(this.attributes,d)},save(d,o){if(typeof d==='string')this.attributes[d]=o;else Object.assign(this.attributes,d||{});backend({kind:'write',data:this.attributes}).then(()=>o&&o.success&&o.success())}}}
const col={models:[],create(d){const m=model(d);this.models.push(m);return m},fetch(o){backend({kind:'read'}).then(a=>{this.models=Object.keys(a).map(name=>model({name,...a[name]}));o&&o.success&&o.success()})}};
const ch={id:'test',attribs:col,get:k=>k==='controlledby'?'all':k==='name'?'Personnage test':''};window.Campaign={id:'game',characters:{get:id=>id==='test'?ch:null,models:[ch]},players:{models:[]}};
window.currentPlayer={id:${JSON.stringify(player)},get:k=>k==='displayname'?${JSON.stringify(player)}:null};</script><script src="/javascripts/owd-sync.js"></script><script data-owd-version="4.2.0" data-owd-mode="beta" data-owd-browser="firefox" src="/bridge.js"></script><iframe id="sheet" src="/roll20-fiche.html#c=test"></iframe>`;}
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://local');if(u.pathname==='/harness'){res.setHeader('Content-Type','text/html');return res.end(harness(u.searchParams.get('player')||'Alice'));}if(u.pathname==='/download/ext-signed.json'){res.setHeader('Content-Type','application/json');res.statusCode=metadataFailure?503:200;return res.end(JSON.stringify({version:latest}));}if(filesFailure&&(u.pathname==='/owd-creation.json'||u.pathname==='/owd-creation-runtime.json')){res.statusCode=503;return res.end();}let file=u.pathname==='/bridge.js'?path.join(root,'extension/firefox/beta/roll20-page.js'):path.join(root,'docs',u.pathname);if(!fs.existsSync(file))file=path.join(root,'site',u.pathname);if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.statusCode=404;return res.end();}res.setHeader('Content-Type',({'.js':'application/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{reset();await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});const errors=[];try{
 const context=await browser.newContext({viewport:{width:1250,height:1000}});
 await context.exposeBinding('backend',async(_,m)=>{if(m.kind==='read'){const a=JSON.parse(JSON.stringify(attrs));if(echo)for(const k of ['pv','pe','pm'])a['owd_'+k]={...echo[k]};return a;}if(m.kind==='write')attrs[m.data.name]={current:String(m.data.current??''),max:String(m.data.max??'')};});
 const open=async player=>{const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port+'/harness?player='+player);await p.frameLocator('#sheet').locator('#owd-mode-bar').waitFor();return p;};
 const state=()=>C.read(attrs).state,wait=async(fn,label)=>{for(let i=0;i<180&&!(await fn());i++)await new Promise(r=>setTimeout(r,100));assert.ok(await fn(),label);};
 const a=await open('Alice'),b=await open('Bob'),sheet=a.frameLocator('#sheet');await sheet.locator('#owd-mode-switch').click();
 await wait(()=>['pv','pe','pm'].every(k=>attrs['owd_'+k]),'barres projetées');
 const original=Object.fromEntries(['pv','pe','pm'].map(k=>[k,{...attrs['owd_'+k]}]));
 for(const value of ['90','80','70']){await sheet.locator('[data-module="pe"] .pc-vital-num').fill(value);await wait(()=>state().etat.pe===Number(value),'saisie '+value);}
 for(let i=0;i<3;i++){
  echo=Object.fromEntries(['pv','pe','pm'].map(k=>[k,{current:original[k].current,max:String(Number(original[k].max)-20)}]));
  await new Promise(r=>setTimeout(r,1900));assert.equal(state().etat.pe,70);for(const k of ['pv','pe','pm'])assert.equal(state().capsLeviers.max.force?.[k],undefined,'aucun Forcé pour '+k);echo=null;await new Promise(r=>setTimeout(r,1800));
 }
 async function native(page,k,values,setFirst=false){await page.evaluate(({k,values,setFirst})=>{const m=Campaign.characters.get('test').attribs.models.find(m=>m.get('name')==='owd_'+k);if(setFirst){m.set(values);m.save(null);}else m.save(values);},{k,values,setFirst});}
 await native(a,'pe',{current:'100'});await wait(()=>state().etat.pe===100,'retour volontaire à une ancienne valeur');
 await native(a,'pv',{current:'64',max:original.pv.max});await wait(()=>state().etat.pv===64,'sauvegarde complète');assert.equal(state().capsLeviers.max.force?.pv,undefined,'maximum inchangé conservé automatique');
 await native(b,'pm',{current:'-2'},true);await wait(()=>state().etat.pm===-2,'set puis save de PM négatifs');
 await a.evaluate(()=>{const m=Campaign.characters.get('test').attribs.models.find(m=>m.get('name')==='owd_pe');for(const value of ['90','80','100','0','-4','90'])m.save('current',value);});
 await wait(()=>state().etat.pe===90,'saisies rapides absolues');
 await native(a,'pv',{max:'200'});await wait(()=>state().capsLeviers.max.force?.pv===200,'maximum natif');
 await native(a,'pv',{max:original.pv.max});await wait(()=>state().capsLeviers.max.force?.pv===Number(original.pv.max),'maximum natif revenu à une ancienne valeur');
 await a.reload();await a.frameLocator('#sheet').locator('#owd-mode-bar').waitFor();
 assert.equal(state().etat.pe,90);assert.equal(state().etat.pv,64);assert.equal(state().etat.pm,-2);assert.equal(state().capsLeviers.max.force.pv,Number(original.pv.max));assert.equal(state().capsLeviers.max.force?.pe,undefined);assert.equal(state().capsLeviers.max.force?.pm,undefined);assert.deepEqual(errors,[]);
 console.log('OK vraie fiche et vrai pont : bonus/malus, retours natifs périmés répétés, deux joueurs, save complet, set puis save, saisies rapides, zéro/négatif, maximums et réouverture.');await context.close();
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
