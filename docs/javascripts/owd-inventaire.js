/* Chaque onglet possède une fiche vivante. Masquer une vue ne suspend ni les
 * lectures ni les écritures. Les transferts gardent un journal de reprise. */
(function () {
  'use strict';
  var root=document.getElementById('inventaire-panneau'),D=window.OwdInventoryData;
  var attacks=root.dataset.view==='attaques',kind=attacks?'attaques':'inventaire',title=attacks?'Attaques':'Inventaire';
  var tabs=[],frames={},characters=[],active='',campaign='',ready=false,seq=0,rpcs={},drag=null,hover=null,job=null,running=false,retry=null,panelActive=true;
  var bar=document.createElement('div');bar.className='inventaire-onglets';bar.setAttribute('role','tablist');bar.setAttribute('aria-label',attacks?'Attaques ouvertes':'Inventaires ouverts');
  var plus=document.createElement('button');plus.type='button';plus.className='inventaire-ajouter';plus.textContent='+';plus.setAttribute('aria-label','Ajouter un onglet');
  var notice=document.createElement('p');notice.className='inventaire-notice';notice.setAttribute('role','status');
  var view=document.createElement('div');view.className='inventaire-vue';view.id='inventaire-contenu';
  var picker=document.createElement('label');picker.className='inventaire-choix';picker.textContent='Choisissez le personnage de cet onglet : ';
  var select=document.createElement('select');select.setAttribute('aria-label','Personnage du nouvel onglet');picker.appendChild(select);view.appendChild(picker);root.replaceChildren(bar,notice,view);
  function post(d){d.ns='owd';try{window.top.postMessage(d,'*');}catch(e){}}
  function send(f,d){d.ns='owd';try{f.node.contentWindow.postMessage(d,'*');}catch(e){}}
  function key(s){return 'owd-'+kind+'-'+s+':'+campaign;}
  function available(id){return characters.some(function(c){return c.id===id;});}
  function name(id){var c=characters.filter(function(c){return c.id===id;})[0];return c?c.name:'Personnage inaccessible';}
  function assigned(id){return tabs.some(function(t){return t.id===id;});}
  function tab(id){return tabs.filter(function(t){return t.key===id;})[0];}
  function saveTabs(){try{localStorage.setItem(key('onglets'),JSON.stringify({tabs:tabs.filter(function(t){return t.id;}).map(function(t){return t.id;}),active:tab(active)&&tab(active).id}));}catch(e){}}
  function persistJob(){localStorage.setItem(key('transfert'),JSON.stringify(job));if(localStorage.getItem(key('transfert'))!==JSON.stringify(job))throw Error('Impossible de conserver le transfert pour sa reprise.');}
  function newTab(id){var t={key:'tab-'+(++seq),id:id||''};tabs.push(t);if(id)ensure(id);return t;}
  function ensure(id){if(frames[id]){frames[id].closing=false;return frames[id];}
    var n=document.createElement('iframe');n.title=title+' — '+name(id);n.dataset.character=id;n.className='inventaire-frame';n.src='roll20-fiche.html#c='+encodeURIComponent(id)+'&view='+kind+'&n='+(document.documentElement.classList.contains('night')?'1':'0');
    var f={node:n,id:id,closing:false,disposing:false,takeActive:false};frames[id]=f;view.appendChild(n);n.addEventListener('load',function(){var t=tab(active);send(f,{type:'take-active',active:!!(panelActive&&t&&t.id===id&&!f.closing)});if(drag)send(f,{type:'inventory-external-drag',drag:drag});});return f;
  }
  function activate(t){if(!t)return;active=t.key;render();saveTabs();}
  function render(){
    bar.replaceChildren();tabs.forEach(function(t){var box=document.createElement('div');box.className='inventaire-onglet';box.dataset.tab=t.key;box.dataset.character=t.id;
      var b=document.createElement('button');b.type='button';b.className='inventaire-tab';b.textContent=t.id?name(t.id):'Nouvel onglet';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(t.key===active));b.setAttribute('aria-controls',view.id);b.tabIndex=t.key===active?0:-1;
      b.onclick=function(){activate(t);};b.onkeydown=function(e){if(['ArrowLeft','ArrowRight','Home','End'].indexOf(e.key)<0)return;e.preventDefault();var i=tabs.indexOf(t),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length;activate(tabs[next]);bar.querySelector('[aria-selected="true"]').focus();};
      var close=document.createElement('button');close.type='button';close.className='inventaire-fermer';close.textContent='×';close.setAttribute('aria-label','Fermer '+(t.id?name(t.id):'le nouvel onglet'));close.disabled=!!(job&&(job.source===t.id||job.target===t.id));close.onclick=function(){var i=tabs.indexOf(t);tabs.splice(i,1);if(t.id&&frames[t.id])frames[t.id].closing=true;if(active===t.key)active=(tabs[Math.min(i,tabs.length-1)]||newTab()).key;render();saveTabs();};
      function over(e){if(!drag||!t.id||t.id===drag.charId||!available(t.id))return;e.preventDefault();e.dataTransfer.dropEffect='move';if(hover&&hover.key===t.key)return;clearHover();hover={key:t.key,timer:setTimeout(function(){hover=null;activate(t);},550)};}
      box.addEventListener('dragenter',over);box.addEventListener('dragover',over);box.addEventListener('dragleave',function(e){if(!box.contains(e.relatedTarget))clearHover();});box.append(b,close);bar.appendChild(box);
    });
    var candidates=characters.filter(function(c){return !assigned(c.id);});plus.disabled=!candidates.length;bar.appendChild(plus);
    var current=tab(active);Object.keys(frames).forEach(function(id){var f=frames[id],visible=!!(current&&current.id===id&&available(id)&&!f.closing),eligible=visible&&panelActive;if(f.takeActive!==eligible){f.takeActive=eligible;send(f,{type:'take-active',active:eligible});}if(attacks&&!visible)send(f,{type:'attack-preview-cancel'});f.node.classList.toggle('inventaire-active',visible);f.node.setAttribute('aria-hidden',String(!visible));f.node.inert=!visible;});
    picker.hidden=!!(current&&current.id);select.replaceChildren();var o=document.createElement('option');o.value='';o.textContent=candidates.length?'Choisir un personnage…':'Tous les personnages accessibles ont déjà un onglet';select.appendChild(o);candidates.forEach(function(c){var o=document.createElement('option');o.value=c.id;o.textContent=c.name;select.appendChild(o);});select.disabled=!candidates.length;
    if(!job){notice.textContent=current&&current.id&&!available(current.id)?'Vous n’avez plus accès à ce personnage. Les écritures sont bloquées.':!characters.length?'Aucun personnage contrôlé. Le MJ peut vous donner accès à un personnage dans Roll20.':'';notice.hidden=!notice.textContent;}
  }
  function clearHover(){if(hover)clearTimeout(hover.timer);hover=null;}
  plus.onclick=function(){var blank=tabs.filter(function(t){return !t.id;})[0];activate(blank||newTab());};
  select.onchange=function(){var t=tab(active),id=select.value;if(!t||t.id||!available(id)||assigned(id))return;t.id=id;ensure(id);render();saveTabs();};
  function rpc(id,action,args){return new Promise(function(resolve,reject){var f=frames[id];if(!f)return reject(Error('Inventaire fermé.'));var request='i'+(++seq);var timer=setTimeout(function(){delete rpcs[request];reject(Error('L’inventaire ne répond pas encore.'));},5000);rpcs[request]={frame:f,resolve:resolve,reject:reject,timer:timer};send(f,Object.assign({type:'inventory-command',request:request,action:action},args||{}));});}
  function fresh(s){return s.ready&&Date.now()-s.lastRead<8000;}
  async function waitFor(id,field){var until=Date.now()+30000;do{var s=await rpc(id,'check',{job:job});if(fresh(s)&&s[field]&&s.pending===0)return;schedulePoll();await new Promise(function(r){setTimeout(r,400);});}while(Date.now()<until);throw Error('Confirmation de Roll20 en attente.');}
  function schedulePoll(){Object.keys(frames).forEach(function(id){send(frames[id],{type:'inventory-poll'});});}
  function status(text){notice.hidden=false;notice.replaceChildren(document.createTextNode(text));}
  async function lock(value){await Promise.all([job.source,job.target].map(function(id){return rpc(id,'lock',{lock:value}).catch(function(){});}));}
  async function run(){if(!job||running)return;running=true;clearTimeout(retry);try{
      [job.source,job.target].forEach(function(id){if(!assigned(id))newTab(id);ensure(id);});render();await lock(true);
      if(!available(job.source)||!available(job.target))throw Error('Accès retiré à un inventaire. Le transfert est conservé en attente.');
      for(var id of [job.source,job.target]){var s=await rpc(id,'status');if(!fresh(s)||s.pending)throw Error('Synchronisation des inventaires en cours.');}
      status('Transfert en cours — confirmation de Roll20…');
      if(job.phase==='receive'){
        var dest=await rpc(job.target,'check',{job:job});
        if(!dest.committed){await rpc(job.target,'import',{job:job});await waitFor(job.target,'received');}
        job.phase='commit';persistJob();
      }
      if(job.phase==='commit'){await rpc(job.target,'commit',{job:job});await waitFor(job.target,'committed');job.phase='remove';persistJob();}
      if(job.phase==='remove'){
        await waitFor(job.target,'committed');await rpc(job.source,'remove',{job:job});await waitFor(job.source,'removed');
      }
      if(job.phase==='cancel'){await rpc(job.target,'cancel',{job:job});await waitFor(job.target,'cancelled');}
      localStorage.removeItem(key('transfert'));await lock(false);job=null;render();saveTabs();
    }catch(e){status(e.message+' Le transfert sera repris automatiquement.');var button=document.createElement('button');button.type='button';button.textContent='Réessayer';button.onclick=function(){run();};notice.append(' ',button);
      if(job&&job.phase!=='remove'){var cancel=document.createElement('button');cancel.type='button';cancel.textContent='Annuler le transfert';cancel.onclick=function(){if(running)return;job.phase='cancel';try{persistJob();run();}catch(e){status(e.message);}};notice.append(' ',cancel);}
      if(job)retry=setTimeout(run,2500);
    }finally{running=false;}}
  async function transfer(source,target,ref){if(job||source===target||!available(source)||!available(target))return;try{
      for(var id of [source,target]){var s=await rpc(id,'status');if(!fresh(s)||s.pending)throw Error('Attendez la synchronisation avant de déplacer cet objet.');}
      var description=await rpc(source,'describe',{ref:ref});job=D.prepare(source,target,description.items,Date.now().toString(36)+Math.random().toString(36).slice(2));
      job.competences=description.competences;try{job.dest=await rpc(target,'prepare',{job:job});}catch(e){job=null;throw e;}
      try{persistJob();}catch(e){job=null;throw Error('Le stockage local est indisponible : le transfert ne peut pas être repris en cas d’interruption.');}
      render();await run();
    }catch(e){status(e.message);}}
  function endDrag(){clearHover();drag=null;Object.keys(frames).forEach(function(id){send(frames[id],{type:'inventory-external-drag',drag:null});});}
  window.addEventListener('message',function(ev){var d=ev.data;if(!d||d.ns!=='owd')return;
    var f=Object.keys(frames).map(function(id){return frames[id];}).filter(function(f){return ev.source===f.node.contentWindow;})[0];
    if(f){
      if(d.charId!==f.id)return;
      if(d.type==='take-ready'){var current=tab(active);send(f,{type:'take-active',active:!!(panelActive&&current&&current.id===f.id&&!f.closing&&available(f.id))});return;}
      if(d.type==='inventory-result'){var q=rpcs[d.request];if(q&&q.frame===f){clearTimeout(q.timer);delete rpcs[d.request];if(d.error)q.reject(Error(d.error));else q.resolve(d.value);}return;}
      if(!attacks&&d.type==='inventory-drag-start'&&!job){clearTimeout(retry);endDrag();drag={charId:f.id,ref:d.ref,token:d.token};Object.keys(frames).forEach(function(id){send(frames[id],{type:'inventory-external-drag',drag:drag});});return;}
      if(d.type==='inventory-drag-end'){clearHover();var token=d.token;setTimeout(function(){if(drag&&(!token||token===drag.token))endDrag();},400);return;}
      if(d.type==='inventory-tab-drop'&&drag&&d.drag&&d.drag.token===drag.token&&d.drag.charId===drag.charId&&d.drag.ref===drag.ref){var source=drag.charId,ref=drag.ref;endDrag();transfer(source,f.id,ref);return;}
    }
    if(d.type==='take-active'&&ev.source===window.parent){panelActive=!!d.active;render();return;}
    if(d.type==='attack-preview-cancel'&&(ev.source===window.parent||ev.source===window.top)){Object.keys(frames).forEach(function(id){send(frames[id],d);});return;}
    if(d.type==='panel-theme'&&(ev.source===window.parent||ev.source===window.top)){document.documentElement.classList.toggle('night',!!d.nuit);Object.keys(frames).forEach(function(id){send(frames[id],d);});return;}
    if(d.type!=='inventory-characters-result'||ev.source!==window.top)return;
    if(!d.pret){if(!ready)status('Chargement des personnages…');return;}
    if(campaign&&campaign!==d.campaignId){location.reload();return;}
    var before=JSON.stringify(characters);campaign=d.campaignId;characters=(d.characters||[]).slice().sort(function(a,b){return a.name.localeCompare(b.name,'fr');});
    if(!ready){ready=true;var saved;try{saved=JSON.parse(localStorage.getItem(key('onglets'))||'null');job=JSON.parse(localStorage.getItem(key('transfert'))||'null');}catch(e){status('Préférences d’onglets illisibles.');}
      var ids=saved&&saved.tabs||[];if(!ids.length){try{var old=attacks?null:localStorage.getItem('owd-inventaire-personnage:'+campaign);if(available(old))ids=[old];}catch(e){}}
      ids.forEach(function(id){if(available(id)&&!assigned(id))newTab(id);});
      if(job&&job.source&&job.target&&job.items&&job.dest){[job.source,job.target].forEach(function(id){if(!assigned(id))newTab(id);});}else job=null;
      if(!tabs.length)newTab();var last=tabs.filter(function(t){return saved&&t.id===saved.active;})[0];active=(last||tabs[0]).key;render();if(job)run();
    }else if(before!==JSON.stringify(characters))render();
  });
  notice.textContent='Chargement des personnages…';
  post({type:'panneau',panel:kind,titre:title,nuit:document.documentElement.classList.contains('night'),w:850,h:650});
  function discovery(){if(!ready)post({type:'need-bridge'});post({type:'inventory-characters'});}discovery();setInterval(discovery,2000);
  setInterval(function(){schedulePoll();Object.keys(frames).forEach(function(id){var f=frames[id];if(!f.closing||f.disposing)return;f.disposing=true;rpc(id,'status').then(function(s){if(f.closing&&fresh(s)&&s.pending===0){f.node.remove();delete frames[id];}}).catch(function(){}).finally(function(){f.disposing=false;});});},1200);
})();
