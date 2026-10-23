(function(){
  'use strict';
  var api=typeof browser!=='undefined'?browser:chrome;
  document.addEventListener('DOMContentLoaded',function(){
    var list=document.getElementById('backup-list'),status=document.getElementById('backup-status');
    function request(d){return api.runtime.sendMessage(Object.assign({ns:'owd-backups'},d));}
    function message(t){status.textContent=t;}
    function button(parent,label,fn){var b=document.createElement('button');b.type='button';b.className='p-mini';b.textContent=label;b.onclick=fn;parent.appendChild(b);}
    function load(){message('Chargement…');request({action:'list'}).then(function(rows){
      if(!Array.isArray(rows))throw Error(rows&&rows.error||'Sauvegardes indisponibles.');
      list.replaceChildren();message(rows.length?'':'Aucune sauvegarde.');api.storage.local.get('owdBackupFailure').then(function(r){if(r.owdBackupFailure)message('La dernière sauvegarde n’a pas pu être enregistrée dans ce navigateur.');});
      var groups={};rows.forEach(function(r){var section=groups[r.character];if(!section){section=document.createElement('section');section.className='p-bloc';var h=document.createElement('h2');h.textContent=r.name;section.appendChild(h);var part=document.createElement('small');part.textContent='Partie '+r.campaignId+' · Personnage '+r.charId;section.appendChild(part);list.appendChild(section);groups[r.character]=section;}
        var row=document.createElement('div');row.className='backup-row';var text=document.createElement('p');text.textContent=new Date(r.at).toLocaleString('fr-FR')+' · '+r.version+(r.reason==='migration'?' · Avant mise à jour':'');row.appendChild(text);
        button(row,'Exporter JSON',function(){request({action:'get',id:r.id}).then(function(saved){if(!saved||!saved.state)throw Error('Sauvegarde indisponible.');var u=URL.createObjectURL(new Blob([JSON.stringify(saved.state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=r.name.replace(/[^\p{L}\p{N}_-]/gu,'_')+'-'+new Date(r.at).toISOString().replace(/[:.]/g,'-')+'.json';a.click();setTimeout(function(){URL.revokeObjectURL(u);},30000);}).catch(function(e){message(e.message);});});
        button(row,'Restaurer',function(){if(!confirm('Restaurer '+r.name+' avec la sauvegarde du '+new Date(r.at).toLocaleString('fr-FR')+' ? Les données actuelles de ce personnage seront remplacées.'))return;
          request({action:'get',id:r.id}).then(function(saved){if(!saved||!saved.state)throw Error('Sauvegarde indisponible.');return api.tabs.query({active:true,currentWindow:true}).then(function(tabs){if(!tabs[0])throw Error('Ouvrez la partie Roll20 concernée.');return api.tabs.sendMessage(tabs[0].id,{ns:'owd-backups',action:'restore',snapshot:saved});});}).then(function(result){if(!result||!result.ok)throw Error(result&&result.error||'Restauration refusée.');message('Personnage restauré. Rechargez sa fiche.');}).catch(function(e){message(e.message);});
        });
        button(row,'Supprimer',function(){if(confirm('Supprimer cette sauvegarde ?'))request({action:'delete',id:r.id}).then(load).catch(function(e){message(e.message);});});
        section.appendChild(row);
      });
    }).catch(function(e){message(e.message);});}
    document.querySelectorAll('[data-popup-tab]').forEach(function(b){b.onclick=function(){var id=b.dataset.popupTab;document.querySelectorAll('[data-popup-panel]').forEach(function(p){p.hidden=p.dataset.popupPanel!==id;});document.querySelectorAll('[data-popup-tab]').forEach(function(t){t.setAttribute('aria-selected',String(t===b));});if(id==='backups')load();};});
    api.runtime.onMessage.addListener(function(d){if(d&&d.ns==='owd-backups'&&d.action==='changed'&&!document.querySelector('[data-popup-panel="backups"]').hidden)load();});
    load();
  });
})();
