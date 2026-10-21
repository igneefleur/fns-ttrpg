'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const read=n=>fs.readFileSync(n,'utf8'),types=['physique','feu','froid','eclair','decomposition','ethere','brut'];
const ctx={window:{__owdChat:raw=>ctx.sent=raw},state:{name:'Théo'},localStorage:{getItem:()=>null},b64encode:s=>Buffer.from(s).toString('base64'),flash(){},num:(x,d)=>Number(x)||d};
vm.createContext(ctx);vm.runInContext(read('src/fiche/socle/130-envoi-tchat.js'),ctx);vm.runInContext(read('src/fiche/socle/140-jets.js'),ctx);
for(const kind of ['attack','defense']){
 const data=kind==='attack'?{kind,hit:[{type:'feu',valeur:12}],pass:[{type:'feu',valeur:6}]}:{kind,final:[{type:'feu',valeur:7}],total:7};
 ctx.sayChat('Épée — Touche',[['Dégâts subis','7']],data);assert.ok(ctx.sent.includes('name=OWD '+(kind==='attack'?'Attack':'Defense')));assert.ok(ctx.sent.includes('Personnage=Théo'));assert.ok(ctx.sent.includes('Dégâts subis=7'));
 const payload=/\/owd_defen[ds]e?\s+([\w-]+)/.exec(ctx.sent)[1];const decoded=JSON.parse(Buffer.from(payload,'base64url'));assert.equal(decoded.character,'Théo');assert.equal(decoded.title,'Épée — Touche');
 for(const mode of ['stable','beta']){const code=read('extension/firefox/'+mode+'/content-roll20.js'),a=code.indexOf('  var COMBAT_TYPES='),b=code.indexOf('  function rememberDefense(',a),c={TextDecoder,Uint8Array,atob,browser:{runtime:{getURL:x=>x}}};vm.createContext(c);vm.runInContext(code.slice(a,b),c);assert.equal(c.combatData(payload).kind,kind);
  const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');assert.equal(c.combatData(encode({...decoded,v:999})),null);for(const list of [[{type:'bad',valeur:1}],[{type:'feu',valeur:-1}],[{type:'feu',valeur:'12'}],[{type:'feu',valeur:1},{type:'feu',valeur:2}]])assert.equal(c.combatData(encode({...decoded,[kind==='attack'?'hit':'final']:list})),null);
 }
}
// Les images fournies sont conservées octet pour octet et déclarées aux deux navigateurs.
const hashes={"feu": "887b6f80e12b451cbd29664ec93cf64f6cfe4022c71f0c036faaf3871cba5621", "froid": "019f2e34f33eff1d585d3b881942555a2ca6c8d47705c45337a539eb317977cf", "eclair": "130a4e9dc847cf2fb1ada820f1d0473db50f84aad775db979406dcd66cb66b9d", "decomposition": "c52f1e233bff8fc63896886b056e3e951e1bea03d26cd6b89d3d5a4ad4806cef", "ethere": "6fec9e043fef2f25f73c40e7392987699138490452b38700117046bb7095a6f1", "physique": "0ac4fe96890bc6db7f5368ea922b666f885cdad0aafc14824af0ea3e07b34d14", "brut": "db8d5fdc676463c534f2b87f14baff9dd1da8fc20efbdb205237787369c2ecfe"};
for(const t of types){const file='icons/damage-'+t+'.png';assert.equal(crypto.createHash('sha256').update(fs.readFileSync('extension/firefox/'+file)).digest('hex'),hashes[t]);for(const n of ['firefox','chrome']){const manifest=JSON.parse(read('extension/'+n+'/manifest.json')),war=manifest.web_accessible_resources;assert.ok((typeof war[0]==='string'?war:war[0].resources).includes(file));}}
console.log('OK cartes de combat : macros textuelles, données Unicode, validation stricte et sept icônes locales déclarées.');
