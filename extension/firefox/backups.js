/* Historique JSON local : accès aux données réservé aux pages de l'extension.
 * Les scripts Roll20 peuvent déposer une copie, jamais parcourir l'historique. */
(function(){
  'use strict';
  var api=typeof browser!=='undefined'?browser:chrome;
  function database(){return new Promise(function(resolve,reject){var r=indexedDB.open('outward-backups',1);r.onupgradeneeded=function(){var s=r.result.createObjectStore('snapshots',{keyPath:'id'});s.createIndex('character','character');};r.onsuccess=function(){resolve(r.result);};r.onerror=function(){reject(r.error);};});}
  function store(mode,action){return database().then(function(db){return new Promise(function(resolve,reject){var tx=db.transaction('snapshots',mode),value;tx.oncomplete=function(){db.close();resolve(value);};tx.onerror=tx.onabort=function(){db.close();reject(tx.error||Error('Stockage indisponible.'));};action(tx.objectStore('snapshots'),function(v){value=v;});});});}
  function metadata(r){return {id:r.id,character:r.character,campaignId:r.campaignId,charId:r.charId,name:r.name,at:r.at,reason:r.reason,version:r.version,bytes:r.bytes};}
  async function save(d){
    if(!d.state||typeof d.state!=='object'||Array.isArray(d.state)||!Number.isSafeInteger(d.state.v)||!d.campaignId||!d.charId)throw Error('Sauvegarde incomplète.');
    var raw=JSON.stringify(d.state),bytes=new TextEncoder().encode(raw),digest=await crypto.subtle.digest('SHA-256',bytes),hash=Array.from(new Uint8Array(digest)).map(function(n){return n.toString(16).padStart(2,'0');}).join('');
    var character=JSON.stringify([d.campaignId,d.charId]),at=Date.now();
    return store('readwrite',function(s,done){var q=s.index('character').getAll(character);q.onsuccess=function(){var rows=q.result.sort(function(a,b){return b.at-a.at;});
      if(rows[0]&&rows[0].hash===hash){done({ok:true,duplicate:true});return;}
      var r={id:character+':'+at+':'+hash,character:character,campaignId:d.campaignId,charId:d.charId,name:String(d.name||d.state.name||'Sans nom'),at:at,reason:d.reason||'opening',version:d.state.rel||String(d.state.v),bytes:bytes.length,hash:hash,raw:raw};
      s.put(r);rows.slice(19).forEach(function(old){s.delete(old.id);});done({ok:true,id:r.id});
    };});
  }
  function extensionPage(sender){return sender&&sender.url&&sender.url.indexOf(api.runtime.getURL(''))===0&&!sender.tab;}
  api.runtime.onMessage.addListener(function(d,sender,respond){
    if(!d||d.ns!=='owd-backups')return;
    var task;
    if(d.action==='save'&&sender.tab&&/^https:\/\/app\.roll20\.net\//.test(sender.url||''))task=save(d).then(function(r){return api.storage.local.remove('owdBackupFailure').catch(function(){}).then(function(){try{api.runtime.sendMessage({ns:'owd-backups',action:'changed'}).catch(function(){});}catch(e){}return r;});},function(e){api.storage.local.set({owdBackupFailure:String(e.message||e)}).catch(function(){});throw e;});
    else if(extensionPage(sender)&&d.action==='list')task=store('readonly',function(s,done){var q=s.getAll();q.onsuccess=function(){done(q.result.sort(function(a,b){return b.at-a.at;}).map(metadata));};});
    else if(extensionPage(sender)&&d.action==='get')task=store('readonly',function(s,done){var q=s.get(d.id);q.onsuccess=function(){done(q.result?Object.assign(metadata(q.result),{state:JSON.parse(q.result.raw)}):null);};});
    else if(extensionPage(sender)&&d.action==='delete')task=store('readwrite',function(s,done){s.delete(d.id);done({ok:true});});
    else return;
    task.then(respond,function(e){respond({ok:false,error:String(e.message||e)});});return true;
  });
})();
