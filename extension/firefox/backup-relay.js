/* Pont DOM commun aux deux modes. Les détails sont des chaînes JSON pour
 * traverser les compartiments Firefox sans objets de page privilégiés. */
(function(){
  'use strict';
  if(window.top!==window)return;
  var api=typeof browser!=='undefined'?browser:chrome;
  function emit(name,data){document.dispatchEvent(new CustomEvent(name,{detail:JSON.stringify(data)}));}
  function failure(message){try{api.storage.local.set({owdBackupFailure:message}).catch(function(){});}catch(e){}}
  document.addEventListener('owd-backup-save',function(ev){
    var d;try{d=JSON.parse(ev.detail);}catch(e){return;}
    if(!d||typeof d.request!=='string'||!d.campaignId||!d.charId||!d.state)return;
    Promise.resolve().then(function(){return api.runtime.sendMessage(Object.assign({},d,{ns:'owd-backups',action:'save'}));}).then(function(r){
      if(!r||!r.ok)throw Error(r&&r.error||'Sauvegarde locale non confirmée.');
      emit('owd-backup-saved',{request:d.request,ok:true});
    }).catch(function(e){failure(String(e.message||e));emit('owd-backup-saved',{request:d.request,ok:false});});
  });
  api.runtime.onMessage.addListener(function(d,sender,respond){
    if(!d||d.ns!=='owd-backups'||d.action!=='restore')return;
    var token='restore-'+Date.now()+'-'+Math.random(),timer;
    function done(ev){var r;try{r=JSON.parse(ev.detail);}catch(e){return;}if(r.token!==token)return;clearTimeout(timer);document.removeEventListener('owd-backup-restore-result',done);respond(r);}
    document.addEventListener('owd-backup-restore-result',done);
    timer=setTimeout(function(){document.removeEventListener('owd-backup-restore-result',done);respond({ok:false,error:'Roll20 ne répond pas. Réessayez dans quelques instants.'});},36000);
    emit('owd-backup-restore',{token:token,snapshot:d.snapshot});return true;
  });
})();
