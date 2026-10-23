'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('extension/firefox/beta/roll20-page.js','utf8'),code=source.slice(source.indexOf('  var presenceLocal='),source.indexOf('  var storageFresh='));
let now=100000;const server={},ch={id:'c'};
function client(player,views,owner=null){const messages=[];const ctx={Date:{now:()=>now},Number,Object,Array,String,JSON,Math,storageOwner:()=>owner,readAll:()=>server,storageStable:JSON.stringify,journalPlayer:()=>({id:player,name:player}),srcFrames:views,srcIds:views.map(()=>ch.id),getChar:()=>ch,reply:(ev,msg)=>messages.push({view:ev.source,...JSON.parse(JSON.stringify(msg))}),enqueue:(id,data)=>Object.assign(server,data)};vm.createContext(ctx);vm.runInContext(code,ctx);return {ctx,messages,send(view,action,mode){ctx.updatePresence(ch,{viewId:view,action,mode});},last(){return messages.at(-1);}};}
const a=client('Alice',['sheet','notes','inventory','attacks','defenses']),b=client('Bob',['bob']);
for(const view of a.ctx.srcFrames)a.send(view,'join','consultation');b.send('bob','join','consultation');
a.send('sheet','mode','edition');assert.equal(a.last().modeState.mode,'edition');assert.ok(a.last().presence.filter(r=>r.player==='Alice').every(r=>r.mode==='edition'));
a.send('notes','heartbeat','consultation');assert.equal(a.last().modeState.mode,'edition','un battement ancien ne doit pas annuler le choix partagé');
b.ctx.notifyPresence(ch);assert.equal(b.last().modeState.mode,'consultation');assert.ok(b.last().presence.some(r=>r.player==='Alice'&&r.mode==='edition'));
a.send('inventory','mode','consultation');assert.equal(a.last().modeState.mode,'consultation');assert.ok(a.last().presence.filter(r=>r.player==='Alice').every(r=>r.mode==='consultation'));
b.send('bob','mode','edition');a.ctx.notifyPresence(ch);assert.equal(a.last().modeState.mode,'consultation');assert.ok(a.last().presence.some(r=>r.player==='Bob'&&r.mode==='edition'));
const owner={presence:(id,d)=>a.ctx.updatePresence(ch,d),rows:()=>a.ctx.presenceRead(ch,server),watchPresence(fn){a.ctx.presenceWatchers.push(fn);return ()=>a.ctx.presenceWatchers.splice(a.ctx.presenceWatchers.indexOf(fn),1);}};
const pop=client('Alice',['popout'],owner);pop.send('popout','join');assert.equal(pop.last().modeState.mode,'consultation');a.send('attacks','mode','edition');assert.equal(pop.last().modeState.mode,'edition');pop.send('popout','mode','consultation');assert.equal(a.last().modeState.mode,'consultation');
a.send('sheet','mode','edition');a.send('new-view','join','consultation');assert.equal(a.last().modeState.mode,'edition','une vue ajoutée reprend le mode actif');a.send('new-view','leave');assert.equal(a.last().modeState.mode,'edition','fermer une vue ne change pas les autres');
now+=31000;a.send('sheet','heartbeat','edition');assert.equal(a.last().modeState.mode,'consultation','une présence expirée ne restaure pas un ancien mode');
assert.deepEqual(Object.keys(server),['owd_presence']);
console.log('OK mode partagé : cinq vues, nouveau panneau, battement retardé, indépendance des joueurs, présence, fenêtre séparée dans les deux sens, fermeture et expiration ; un seul attribut de présence.');
