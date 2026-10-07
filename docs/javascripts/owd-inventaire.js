/* Vue détachée : aucune copie de l'état, chaque personnage utilise l'amorce
 * et le module de sa vraie fiche. Les frames masquées finissent leurs envois. */
(function () {
  'use strict';
  var root=document.getElementById('inventaire-panneau'), frames={}, selected='', campaign='', ready=false, signature='';
  var bar=document.createElement('label');bar.className='inventaire-choix';bar.textContent='Personnage ';
  var select=document.createElement('select');select.setAttribute('aria-label','Personnage de l’inventaire');bar.appendChild(select);
  var notice=document.createElement('p');notice.className='inventaire-notice';notice.setAttribute('role','status');
  var view=document.createElement('div');view.className='inventaire-vue';root.replaceChildren(bar,notice,view);
  function post(d){d.ns='owd';try{window.top.postMessage(d,'*');}catch(e){}}
  function key(){return 'owd-inventaire-personnage:'+campaign;}
  function choose(id){
    selected=id;select.value=id;
    Object.keys(frames).forEach(function(k){frames[k].hidden=k!==id;});
    if(!id)return;
    try{localStorage.setItem(key(),id);}catch(e){}
    if(!frames[id]){
      var f=document.createElement('iframe');f.title='Inventaire du personnage';
      f.src='roll20-fiche.html#c='+encodeURIComponent(id)+'&view=inventaire&n='+(document.documentElement.classList.contains('night')?'1':'0');
      frames[id]=f;view.appendChild(f);
    }
  }
  select.addEventListener('change',function(){choose(select.value);});
  window.addEventListener('message',function(ev){
    var d=ev.data;if(!d||d.ns!=='owd')return;
    if(d.type==='panel-theme'&&(ev.source===window.parent||ev.source===window.top)){
      document.documentElement.classList.toggle('night',!!d.nuit);
      Object.keys(frames).forEach(function(k){frames[k].contentWindow.postMessage(d,'*');});return;
    }
    if(d.type!=='inventory-characters-result'||ev.source!==window.top)return;
    if(!d.pret){notice.textContent='Chargement des personnages…';return;}
    var cs=(d.characters||[]).slice().sort(function(a,b){return a.name.localeCompare(b.name,'fr');});
    if(campaign&&campaign!==d.campaignId){Object.keys(frames).forEach(function(k){frames[k].remove();});frames={};selected='';}
    campaign=d.campaignId;
    var ids=cs.map(function(c){return c.id;});
    var sig=JSON.stringify(cs);if(sig!==signature){signature=sig;select.replaceChildren();cs.forEach(function(c){var o=document.createElement('option');o.value=c.id;o.textContent=c.name;select.appendChild(o);});}
    // Un droit retiré masque immédiatement la vue ; le pont bloque ses écritures.
    Object.keys(frames).forEach(function(k){if(ids.indexOf(k)<0)frames[k].hidden=true;});
    if(ids.indexOf(selected)<0){selected='';try{var last=localStorage.getItem(key());if(ids.indexOf(last)>=0)selected=last;}catch(e){}selected=selected||ids[0]||'';}
    select.disabled=!cs.length;notice.hidden=!!cs.length;
    notice.textContent=cs.length?'':'Aucun personnage contrôlé. Le MJ peut vous donner accès à un personnage dans Roll20.';
    choose(selected);ready=true;
  });
  notice.textContent='Chargement des personnages…';
  post({type:'panneau',panel:'inventaire',titre:'Inventaire',nuit:document.documentElement.classList.contains('night'),w:850,h:650});
  function discovery(){if(!ready)post({type:'need-bridge'});post({type:'inventory-characters'});}discovery();
  setInterval(discovery,2000);
})();
