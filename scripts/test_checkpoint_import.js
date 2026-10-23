'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../docs/javascripts/owd-sync.js').Compact,M=require('../docs/javascripts/owd-attr-map.js'),source=fs.readFileSync('extension/firefox/beta/roll20-page.js','utf8');
const code=source.slice(source.indexOf('  function storageHash('),source.indexOf('  window.__owdStorageBridge='));
function run(seed,change,hook){
  const attrs=C.encode(seed);JSON.parse(attrs.owd_storage.current);let tasks=[],time=1,serial=0,messages=[],nativeWrites=[];const expected=C.copy(attrs),next=C.copy(seed);change(next);
  const ch={id:'c',attribs:{fetch(o){o.success();}},get(){return 'Test';}};
  const ctx={JSON,Object,Array,Math,Number,String,Date:{now:()=>time},window:{},sessionStorage:{removeItem(){}},localStorage:{length:0},WeakMap,
    setTimeout(fn,ms){const id=++serial;tasks.push({id,at:time+ms,fn});return id;},clearTimeout(id){tasks=tasks.filter(t=>t.id!==id);},
    readAll(){return C.copy(attrs);},writeOne(ch,k,v){attrs[k]=C.copy(v);nativeWrites.push(k);if(hook)hook('stage',attrs,k);},
    enqueue(id,lot){if(hook)hook('commit',attrs,lot);Object.assign(attrs,C.copy(lot));},reply(ev,msg){messages.push(C.copy(msg));},resynchronise(){},WRITE_DELAY:60};
  vm.createContext(ctx);vm.runInContext(code,ctx);
  ctx.storageImport(ch,{expected,state:next,blocks:C.encode(next)},{source:{}});
  const mid=C.copy(attrs);assert.equal(C.read(mid).state.rel,seed.rel,'la nouvelle version reste inactive pendant la préparation');if(!hook)assert.deepEqual(C.read(mid).state,seed);
  for(let i=0;tasks.length&&i<20000;i++){tasks.sort((a,b)=>a.at-b.at);const task=tasks.shift();time=task.at;task.fn();}
  return {attrs,messages,next,nativeWrites};
}
const seed=M.blank();seed.name='Origine';seed.etat.pe=100;seed.inv.objets=Array.from({length:1000},(_,i)=>({ref:'r'+i,qte:1,nom:'Objet '+i}));
let r=run(seed,s=>{s.rel='9.1.0b';s.inv.objets.forEach(o=>{o.description='Données normalisées '+o.ref;});});
assert.equal(r.messages.at(-1).ok,true);assert.deepEqual(C.read(r.attrs).state,r.next);assert.ok(!Object.keys(r.attrs).some(k=>k.startsWith('owd_ops_')||k==='owd_backup'));assert.equal(r.nativeWrites.length,1001);
console.log('OK 1 000 équipements : photographie complète, aucun journal de migration, état initial intact jusqu’au manifeste.');
const small=M.blank();small.etat.pe=100;
let changed=false;r=run(small,s=>s.rel='9.1.0b',(step,attrs)=>{if(step==='stage'&&!changed){changed=true;const peer=new C.Session(attrs,small,null,{id:'peer'}),s=C.copy(small);s.name='Modification concurrente';peer.capture(s);attrs.owd_ops_peer={current:JSON.stringify({epoch:peer.epoch,ops:Object.values(peer.pending)}),max:''};}});
assert.equal(r.messages.at(-1).ok,false);assert.equal(C.read(r.attrs).state.name,'Modification concurrente');assert.equal(C.read(r.attrs).state.rel,small.rel);
console.log('OK modification pendant préparation : import refusé sans écraser la modification ni changer de version.');
r=run(small,s=>s.rel='9.1.0b',(step,attrs)=>{if(step==='commit'){const peer=new C.Session(attrs,small,null,{id:'late'}),s=C.copy(small);s.etat.pe=93;peer.capture(s);attrs.owd_ops_late={current:JSON.stringify({epoch:peer.epoch,ops:Object.values(peer.pending)}),max:''};}});
assert.equal(r.messages.at(-1).ok,true);assert.equal(C.read(r.attrs).state.etat.pe,93);assert.equal(C.read(r.attrs).state.rel,'9.1.0b');
console.log('OK opération entre vérification et publication : conservée et appliquée une seule fois.');
// Un changement préexistant absorbé ne doit pas être rejoué sur le nouveau JSON.
const attrs=C.encode(small),a=new C.Session(attrs,small,null,{id:'absorbed'}),s=C.copy(small);s.etat.pe=93;a.capture(s);const op=Object.values(a.pending)[0];
const base=C.encode(s,a.epoch),meta=JSON.parse(base.owd_storage.current);meta.absorbed={[op.id]:true};meta.clock=op.clock;base.owd_storage.current=JSON.stringify(meta);base.owd_ops_old={current:JSON.stringify({epoch:a.epoch,ops:[op]})};assert.equal(C.read(base).state.etat.pe,93);assert.equal(Object.keys(a.receive(base)&&a.pending).length,0);
console.log('OK opération absorbée : aucun double prélèvement et confirmation des anciennes vues.');
