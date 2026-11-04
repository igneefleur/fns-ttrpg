#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const boot=fs.readFileSync('docs/javascripts/jjk-roll20-boot.js','utf8');
function extract(name){
 const re=new RegExp('function\\s+'+name+'\\s*\\([^)]*\\)\\s*\\{','m');
 const m=re.exec(boot);assert.ok(m,'fonction absente '+name);
 let i=m.index+m[0].length,d=1,q=null,e=false;
 for(;i<boot.length&&d;i++){const c=boot[i];if(q){if(e)e=false;else if(c==='\\')e=true;else if(c===q)q=null;}else if(c==='"'||c==="'"||c==='`')q=c;else if(c==='{')d++;else if(c==='}')d--;}
 assert.equal(d,0,'fonction non fermée '+name);return boot.slice(m.index,i);
}
const code=`(function(){
 var sondes=[], VIEW_ID='view-test', posted=[], timers=[], alerteSyncSilencieuse=false, derniereLectureFraiche=0;
 var document={getElementById:function(){return null;}};
 function post(m){posted.push(m);}
 function setTimeout(fn,ms){var t={fn,ms,cleared:false};timers.push(t);return t;}
 function clearTimeout(t){if(t)t.cleared=true;}
 ${extract('noteLectureFraiche')}
 ${extract('sonde')}
 ${extract('sondeReponse')}
 return {sonde:sonde,reply:sondeReponse,sondes:sondes,posted:posted,timers:timers};
})()`;
const api=vm.runInNewContext(code,{Date,Math,Array,Object,String});
let got='pending';
api.sonde(v=>got=v);
assert.equal(api.sondes.length,1);
assert.equal(api.timers[0].ms,40000,'la sonde couvre le délai maximal du fetch Roll20');
assert.equal(api.posted[0].type,'load');assert.equal(api.posted[0].viewId,'view-test');
const attrs={jjk_storage:{current:'photo-fraîche',max:''}};
api.reply(attrs);
assert.equal(got,attrs,'une lecture fraîche acquitte la sonde en attente');
assert.equal(api.sondes.length,0);assert.equal(api.timers[0].cleared,true);
let failed='pending';api.sonde(v=>failed=v);api.reply(null);assert.equal(failed,null,'un fetch refusé libère immédiatement la sonde');
let timeout='pending';api.sonde(v=>timeout=v);const t=api.timers[2];t.fn();assert.equal(timeout,null,'absence de réponse finit par être signalée');assert.equal(api.sondes.length,0);
console.log('OK sondes Roll20 : accusé sur lecture fraîche, refus immédiat et délai aligné sur le fetch');
