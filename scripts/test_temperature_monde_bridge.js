'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const D=require('../docs/javascripts/owd-monde-data.js');
const beta=fs.readFileSync('extension/firefox/beta/roll20-page.js','utf8');
assert.equal(beta,fs.readFileSync('extension/firefox/stable/roll20-page.js','utf8'));
assert.equal(fs.readFileSync('docs/javascripts/owd-sync.js','utf8'),fs.readFileSync('extension/firefox/sync-engine.js','utf8'));
const start=beta.indexOf('  function donneesMondeDepuisAttrs(attrs) {'),end=beta.indexOf('\n\n  // ---------- le camp ----------',start);
assert.ok(start>=0&&end>start);const transport=vm.runInNewContext('('+beta.slice(start,end).trim()+')');
const state={v:1,temperature:17.5,temperatureAuto:true,temperatureMode:'progressif',temperatureSaisonMode:'progressif',dateDepart:{annee:412,mois:4,jour:1},horloge:{jours:42,heures:16,minutes:59,secondes:0}};
const attrs={owd_monde_base:{current:JSON.stringify({format:1,state}),max:''},owd_monde_p_temperature:{current:'registre opaque',max:''},owd_camp_h:{current:'1,60'},owd_camp_conf:{current:'{}'},secret:{current:'ne doit pas sortir'}};
const out=transport(attrs);assert.equal(out.owd_monde_base,attrs.owd_monde_base);assert.equal(out.owd_monde_p_temperature.current,'registre opaque');assert.equal(out.secret,undefined);assert.equal(Object.keys(out).length,4);
assert.ok(!beta.includes('temperatureMondeDepuisAttrs'));assert.ok(!beta.includes('window.OwdMondeData'));assert.ok(!beta.includes('climatVersion'));
for(const part of ['beta','stable']){
 const content=fs.readFileSync(`extension/firefox/${part}/content-roll20.js`,'utf8');assert.ok(!content.includes('getURL("monde-data.js")'));assert.ok(content.includes("titre:'Monde',page:'roll20-monde.html'"));
}
const effort=fs.readFileSync('src/fiche/fiche/effort.js','utf8'),a=effort.indexOf('  function recoitTemperatureMonde(ev) {'),b=effort.indexOf('  function demandeTemperatureMonde()',a);
const top={},ctx={window:{top,OwdMondeData:D},state:{temperatureMonde:false},temperatureMondeValeur:null,temperatureMondeDisponible:false,temperatureMondeEtat:'attente'};
vm.createContext(ctx);vm.runInContext(effort.slice(a,b),ctx);
const payload={ns:'owd',type:'monde-temperature-result',mondeData:1,found:true,ready:true,status:'sur',attrs:transport({owd_monde_base:attrs.owd_monde_base})};
ctx.recoitTemperatureMonde({source:top,data:payload});assert.equal(ctx.temperatureMondeValeur,38);assert.equal(ctx.temperatureMondeDisponible,true);
// Une évolution du moteur côté site est utilisée sans changer le transport.
ctx.window.OwdMondeData={read:D.read,temperatureMonde:()=>39};ctx.recoitTemperatureMonde({source:top,data:payload});assert.equal(ctx.temperatureMondeValeur,39);
ctx.window.OwdMondeData=D;ctx.recoitTemperatureMonde({source:top,data:{...payload,attrs:{owd_monde_base:{current:'cassé'}}}});assert.equal(ctx.temperatureMondeEtat,'echec');assert.equal(ctx.temperatureMondeDisponible,false);
ctx.recoitTemperatureMonde({source:top,data:{...payload,found:false,ready:false,status:'absent'}});assert.equal(ctx.temperatureMondeEtat,'absent');
ctx.recoitTemperatureMonde({source:top,data:{...payload,attrs:{owd_camp_h:{current:'1,60'},owd_camp_conf:{current:'{"v":1,"degres":14.5}'}}}});assert.equal(ctx.temperatureMondeValeur,15);
const manifest=JSON.parse(fs.readFileSync('docs/owd-manifeste.json','utf8'));assert.ok(manifest.amorce.some(s=>s.startsWith('javascripts/owd-monde-data.js')));
console.log('OK transport Monde : attributs ciblés opaques, calcul uniquement côté site, évolution sans extension, erreurs, Camp historique et copies beta/stable.');
