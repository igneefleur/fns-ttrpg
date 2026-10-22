/* Vrai content script, boutons natifs avec menus parasites et reconstructions. */
'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||chromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const mode of ['stable','beta'])for(const host of ['master-toolbar','vm-master-toolbar']){
  const p=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('https://toolbar.test/**',route=>{
   const u=new URL(route.request().url());
   if(u.pathname.startsWith('/icons/'))return route.fulfill({contentType:'image/svg+xml',body:fs.readFileSync(path.join(root,'extension/firefox',u.pathname))});
   if(u.pathname.endsWith('.js'))return route.fulfill({contentType:'application/javascript',body:''});
   return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Panneau</title>'});
  });
  await p.goto('https://toolbar.test/editor');
  await p.setContent(`<style>body{margin:0;background:#202020}.upper-buttons{display:flex;flex-direction:column;align-items:center;width:40px}.toolbar-button-outer{width:40px}.native-main{box-sizing:border-box;width:40px;height:36px;padding:0}.icon-slot{display:flex;width:30px;height:30px;color:rgb(190,190,190)}.native-menu{display:block;width:40px;height:25px}body.light .icon-slot{color:rgb(40,40,40)}#more-tools-button{height:30px}</style><div id="${host}"><div class="upper-buttons"><div class="spacer-outer"><div class="spacer-header">Roll20</div><span class="native-menu">☰</span></div><div id="native" class="toolbar-button-outer" data-native="true"><button class="native-main" data-action="select"><span class="icon-slot"><span class="grimoire__roll20-icon">↗</span></span></button><button class="native-menu" id="native-menu">☰</button><div class="new-submenu"><button>Autre commande</button></div></div><div id="more-tools-button">…</div><div class="vttk-outil toolbar-button-outer" id="vttk">VTTK</div></div></div>`);
  await p.addStyleTag({path:path.join(root,'extension/firefox/overlay.css')});
  await p.evaluate(({mode})=>{window.browser={runtime:{getManifest:()=>({version:'4.2.0',manifest_version:2}),getURL:n=>'https://toolbar.test/'+n},storage:{local:{get:async()=>({owdBeta:mode==='beta',owdNuit:'nuit'}),set:async()=>{}},onChanged:{addListener(){}}}};},{mode});
  const nativeBefore=await p.locator('#native').evaluate(n=>n.outerHTML);
  await p.addScriptTag({path:path.join(process.env.TOOLBAR_BASELINE||root,'extension/firefox',mode,'content-roll20.js')});
  await p.locator('#owd-outil-boutique').waitFor();
  const ids=['monde','inventaire','attaques','defenses','boutique'];
  async function check(){
   assert.equal(await p.locator('[data-owd-rang] .native-menu,[data-owd-rang] .new-submenu').count(),0,'aucun menu natif dans les outils OWD');
   assert.equal(await p.locator('.owd-toolbar-button').count(),5);
   assert.equal(await p.locator('#owd-outils-titre').count(),1);
   assert.equal(await p.locator('[data-owd-rang] .native-menu,[data-owd-rang] .new-submenu,[data-owd-rang] [data-native],[data-owd-rang] [data-action]').count(),0);
   assert.deepEqual(await p.locator('[data-owd-rang]').evaluateAll(ns=>ns.map(n=>n.id)),['owd-outils-titre',...ids.map(id=>'owd-outil-'+id)]);
   assert.equal(await p.locator('#native').evaluate(n=>n.outerHTML),nativeBefore);
   for(const id of ids){const n=p.locator('#owd-outil-'+id);assert.equal(await n.locator('button').count(),1);assert.equal(await n.locator('.icon-slot > .owd-tool-icon,.icon-slot > svg').count(),1);assert.deepEqual(await n.evaluate(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})),{w:40,h:36});}
  }
  await check();
  if(mode==='beta'&&host==='master-toolbar')await p.screenshot({path:'/tmp/owd-toolbar-after.png',clip:{x:0,y:0,width:70,height:420}});
  const monde=p.locator('#owd-outil-monde button');await monde.focus();await p.keyboard.press('Enter');await p.locator('#owd-panneau').waitFor();assert.equal(await monde.getAttribute('aria-expanded'),'true');await p.keyboard.press('Space');assert.equal(await p.locator('#owd-panneau').isVisible(),false);
  for(const id of ids.slice(1)){await p.locator('#owd-outil-'+id).click();assert.equal(await p.locator('#owd-panneau-'+id).isVisible(),true);await p.locator('#owd-outil-'+id).click();assert.equal(await p.locator('#owd-panneau-'+id).isVisible(),false);}
  await p.evaluate(()=>document.body.classList.add('light'));await p.waitForFunction(()=>document.querySelector('.owd-toolbar-button').style.color==='rgb(40, 40, 40)');
  await p.evaluate(()=>{const z=document.querySelector('.upper-buttons');z.innerHTML=Array.from(z.children).filter(n=>!n.hasAttribute('data-owd-rang')).map(n=>n.outerHTML).join('');});
  await p.locator('#owd-outil-boutique').waitFor();await check();
  await p.locator('#owd-outil-monde').click();assert.equal(await p.locator('#owd-panneau').isVisible(),true);await p.locator('#owd-outil-monde').click();
  await p.evaluate(()=>{document.getElementById('native').remove();document.querySelectorAll('[data-owd-rang]').forEach(n=>n.remove());});await p.locator('#owd-outil-boutique').waitFor();assert.equal(await p.locator('.owd-toolbar-button').count(),5);
  await p.evaluate(()=>{const z=document.querySelector('.upper-buttons');z.className='modern-tools';z.setAttribute('role','toolbar');z.querySelectorAll('[data-owd-rang]').forEach(n=>n.remove());});await p.locator('#owd-outil-boutique').waitFor();assert.equal(await p.locator('.owd-toolbar-button').count(),5);
  assert.deepEqual(errors,[]);console.log('OK '+mode+' / '+host+' : menus non recopiés, dimensions, clavier, cinq panneaux, thème, reconstruction et absence de modèle natif.');await p.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
