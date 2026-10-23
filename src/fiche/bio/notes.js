  // Un seul bloc Notes ; aucun attribut n'est créé par message.
  function normaliseNotes(value,strict) {
    if(typeof value==='string'||value==null){var text=value==null?'':value;return {format:1,messages:text.length?[{id:'legacy',at:0,text:text,mode:'plain'}]:[]};}
    if(!value||value.format!==1||!Array.isArray(value.messages)){if(strict)throw Error('Format des Notes illisible. Exportez la fiche avant de le remplacer.');return value;}
    var ids=Object.create(null),invalid=false;
    value.messages.forEach(function(m){
      if(!m||typeof m.id!=='string'||!m.id||ids[m.id]||['__proto__','prototype','constructor'].indexOf(m.id)>=0||typeof m.text!=='string'){invalid=true;return;}
      ids[m.id]=true;if(m.mode!=='markdown')m.mode='plain';if(!Number.isFinite(m.at)||m.at<0||m.at>8640000000000000)m.at=0;
    });if(invalid&&strict)throw Error("Message de Notes illisible.");return value;
  }
  var notesMarkdown=null;
  function moteurNotesMarkdown(){if(!notesMarkdown&&window.markdownit)notesMarkdown=window.markdownit({html:false,breaks:true,linkify:true});return notesMarkdown;}
  function notesTexteRecherche(message){
    var md=moteurNotesMarkdown(),words=[];
    function visit(tokens){tokens.forEach(function(t){if(t.children)visit(t.children);else if(['text','code_inline','code_block','fence'].indexOf(t.type)>=0)words.push(t.content);else if(t.type==='softbreak'||t.type==='hardbreak'||t.block&&t.nesting===-1)words.push(' ');});}
    if(message.mode==='markdown'&&md){visit(md.parse(message.text,{}));return words.join('');}return message.text;
  }
  function notesPlie(text){return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
  function notesRendu(target,text,mode){
    target.classList.toggle('pc-notes-markdown',mode==='markdown');var md=moteurNotesMarkdown();
    if(mode!=='markdown'||!md||!window.DOMPurify){target.textContent=text;return;}
    target.innerHTML=window.DOMPurify.sanitize(md.render(text),{ALLOWED_TAGS:['p','br','hr','h1','h2','h3','h4','h5','h6','strong','em','s','ul','ol','li','blockquote','pre','code','a','img','table','thead','tbody','tr','th','td'],ALLOWED_ATTR:['href','src','alt','title','start','align']});
    Array.prototype.forEach.call(target.querySelectorAll('a'),function(a){a.target='_blank';a.rel='noopener noreferrer';});
    Array.prototype.forEach.call(target.querySelectorAll('img'),function(img){img.loading='lazy';img.decoding='async';});
  }
  var notesVues=Object.create(null);
  function buildNotes(){
    var vueKey=(location.hash.match(/(?:^#|&)c=([^&]+)/)||[])[1]||state.name||"local";
    var remembered=notesVues[vueKey]||null;
    var b=block('Notes');b.classList.add('pc-notes-chat');
    var searchBar=el('div','pc-notes-search'),search=el('input');search.type='search';search.placeholder='Rechercher dans les notes…';search.setAttribute('aria-label','Rechercher dans toutes les notes');
    var clear=miniBtn('×','Effacer la recherche',function(){search.value='';recherche();search.focus();});searchBar.appendChild(search);searchBar.appendChild(clear);b.appendChild(searchBar);
    var count=el('div','pc-notes-count');count.setAttribute('role','status');b.appendChild(count);
    var history=el('div','pc-notes-history'),messages=el('div','pc-notes-messages');history.tabIndex=0;history.setAttribute('aria-label','Historique des notes');history.appendChild(messages);b.appendChild(history);
    var latest=miniBtn('Dernières notes',null,function(){resetWindow();render(true);});latest.classList.add('pc-notes-latest');latest.hidden=true;b.appendChild(latest);
    var compose=el('div','pc-notes-compose'),input=el('textarea','pc-notes pc-notes-input'),controls=el('div','pc-notes-controls'),preview=el('div','pc-notes-body pc-notes-preview');
    input.rows=3;input.placeholder='Écrire une note…';input.setAttribute('aria-label','Nouvelle note');input.title='Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne';preview.hidden=true;
    compose.appendChild(input);compose.appendChild(preview);compose.appendChild(controls);b.appendChild(compose);
    input.value=remembered?remembered.text:'';search.value=remembered?remembered.search:'';
    var mode=remembered?remembered.mode:'plain',previewing=false,rows=[],results=[],from=0,to=0,lastValue=null,lastKey=null,query=notesPlie(search.value),editing=remembered?remembered.editing:null,following=true,dead=false,timer=null,scrollFrame=null;
    var searchCache=remembered?remembered.searchCache:Object.create(null),drafts=remembered?remembered.drafts:Object.create(null),BATCH=50,MAX=100;
    if(!ficheModifiable()&&editing){drafts[editing.id]=editing;editing=null;}
    function modes(parent,get,set){
      var group=el('div','pc-notes-modes'),buttons=[];group.setAttribute('role','group');group.setAttribute('aria-label','Format du message');
      [['plain','Brut'],['markdown','Markdown']].forEach(function(pair){var button=miniBtn(pair[1],null,function(){set(pair[0]);sync();});buttons.push([button,pair[0]]);group.appendChild(button);});
      function sync(){buttons.forEach(function(pair){pair[0].setAttribute('aria-pressed',String(get()===pair[1]));});}sync();parent.appendChild(group);
    }
    modes(controls,function(){return mode;},function(v){mode=v;updatePreview();});
    var previewButton=miniBtn('Aperçu',null,function(){previewing=!previewing;updatePreview();});controls.appendChild(previewButton);
    var send=miniBtn('Envoyer',null,envoie,'primary');controls.appendChild(send);
    function updatePreview(){previewButton.hidden=mode!=='markdown';preview.hidden=!previewing||mode!=='markdown';input.hidden=!preview.hidden;previewButton.setAttribute('aria-pressed',String(!preview.hidden));previewButton.textContent=preview.hidden?'Aperçu':'Écrire';if(!preview.hidden)notesRendu(preview,input.value,mode);send.disabled=!ficheModifiable()||!input.value.trim();}
    function data(){return normaliseNotes(state.notes,true);}
    function resetWindow(){to=results.length;from=Math.max(0,to-BATCH);following=true;}
    function filter(){results=query?rows.filter(function(m){var c=searchCache[m.id];if(!c||c.text!==m.text||c.mode!==m.mode)c=searchCache[m.id]={text:m.text,mode:m.mode,plain:notesPlie(notesTexteRecherche(m))};return c.plain.indexOf(query)>=0;}):rows;}
    function recherche(){clearTimeout(timer);query=notesPlie(search.value);filter();resetWindow();render(true);}
    search.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(recherche,150);});
    search.addEventListener('keydown',function(e){if(e.key==='Escape'){search.value='';recherche();}});
    function redrawData(forceBottom){
      var value=state.notes;if(value===lastValue&&!forceBottom)return;
      var d=data(),key=JSON.stringify(d.messages);lastValue=value;if(key===lastKey&&!forceBottom)return;
      var nearBottom=history.scrollHeight-history.clientHeight-history.scrollTop<45,first=results[from]&&results[from].id;
      lastKey=key;rows=d.messages.slice().sort(function(a,c){return a.at-c.at||(a.id<c.id?-1:a.id>c.id?1:0);});filter();
      var live=Object.create(null);rows.forEach(function(m){live[m.id]=true;});Object.keys(searchCache).forEach(function(id){if(!live[id])delete searchCache[id];});
      if(forceBottom||following&&nearBottom)resetWindow();else{var i=results.findIndex(function(m){return m.id===first;});from=i<0?Math.min(from,Math.max(0,results.length-BATCH)):i;to=Math.min(results.length,Math.max(from+BATCH,Math.min(to,from+MAX)));}
      render(forceBottom||following&&nearBottom);
    }
    function commit(){state.notes=data();save();lastValue=null;redrawData(false);}
    function ajoute(text,format){clearTimeout(timer);search.value='';query='';var d=data();d.messages.push({id:'n-'+uid()+'-'+Math.random().toString(36).slice(2),at:Date.now(),text:text,mode:format});state.notes=d;save();lastValue=null;redrawData(true);}
    function envoie(){if(!ficheModifiable()||!input.value.trim())return;ajoute(input.value,mode);input.value='';previewing=false;updatePreview();input.focus();}
    input.addEventListener('input',updatePreview);
    input.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();envoie();}});
    function record(id){return data().messages.find(function(m){return m.id===id;});}
    function version(m){return m?JSON.stringify([m.text,m.mode]):null;}
    function commence(m){if(!ficheModifiable())return;if(editing&&editing.id!==m.id)drafts[editing.id]=editing;editing=drafts[m.id]||{id:m.id,text:m.text,mode:m.mode,base:version(m)};render(false);var area=messages.querySelector('.pc-notes-editor textarea');if(area)area.focus();}
    function edition(box,m){
      var draft=editing,editor=el('div','pc-notes-editor'),area=el('textarea','pc-notes'),actions=el('div','pc-notes-controls');area.rows=4;area.value=draft.text;area.setAttribute('aria-label','Modifier la note');editor.appendChild(area);editor.appendChild(actions);box.appendChild(editor);
      area.addEventListener('input',function(){draft.text=area.value;});modes(actions,function(){return draft.mode;},function(v){draft.mode=v;});
      actions.appendChild(miniBtn('Annuler',null,function(){delete drafts[m.id];editing=null;render(false);}));
      function saveEdit(){if(!ficheModifiable())return;var current=record(m.id);if(version(current)!==draft.base){flash('Cette note a changé ailleurs ou a été supprimée. Votre brouillon est conservé.');warning.hidden=false;return;}if(!draft.text.trim()){flash('Une note vide ne peut pas être enregistrée.');return;}current.text=draft.text;current.mode=draft.mode;delete drafts[m.id];editing=null;commit();}
      actions.appendChild(miniBtn('Enregistrer',null,saveEdit,'primary'));
      area.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();delete drafts[m.id];editing=null;render(false);}else if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&!e.isComposing){e.preventDefault();saveEdit();}});
      var warning=el('div','pc-notes-conflict');warning.hidden=version(record(m.id))===draft.base;warning.appendChild(el('p',null,'Cette note a changé ailleurs. Vous pouvez conserver votre texte dans une nouvelle note.'));
      warning.appendChild(miniBtn('Envoyer comme nouvelle note',null,function(){if(!draft.text.trim())return;delete drafts[m.id];editing=null;ajoute(draft.text,draft.mode);}));editor.appendChild(warning);
    }
    function page(direction){if(direction<0){from=Math.max(0,from-BATCH);to=Math.min(to,from+MAX);}else{to=Math.min(results.length,to+BATCH);from=Math.max(from,to-MAX);}following=false;render(false);}
    function render(bottom){
      if(dead)return;
      var anchor=null,offset=0,top=history.getBoundingClientRect().top,scroll=history.scrollTop;
      Array.prototype.some.call(messages.querySelectorAll('.pc-note-message'),function(n){if(n.getBoundingClientRect().bottom>top){anchor=n.dataset.id;offset=n.getBoundingClientRect().top;return true;}return false;});
      var active=document.activeElement,caret=active&&active.closest&&active.closest('.pc-notes-editor')?{start:active.selectionStart,end:active.selectionEnd}:null;
      messages.textContent='';if(from>0)messages.appendChild(miniBtn('Notes précédentes ('+from+')',null,function(){page(-1);},'pc-notes-older'));
      if(!results.length)messages.appendChild(el('div','pc-notes-empty',query?'Aucune note trouvée.':'Aucune note pour le moment.'));
      results.slice(from,to).forEach(function(m){
        var message=el('article','pc-note-message');message.dataset.id=m.id;var head=el('div','pc-note-head'),time=el('time');
        if(m.at){var date=new Date(m.at);time.dateTime=date.toISOString();time.textContent=date.toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'});}else time.textContent='Anciennes notes';head.appendChild(time);
        var tools=el('div','pc-note-actions');tools.appendChild(miniBtn('Modifier',null,function(){commence(m);}));
        tools.appendChild(miniBtn('Supprimer',null,function(){var before=version(m);confirmer('Supprimer cette note ?','Cette note sera retirée de l’historique.','Supprimer',function(){var current=record(m.id);if(!current)return;if(version(current)!==before){flash('La note a changé depuis l’ouverture de la confirmation. Relisez-la avant de la supprimer.');return;}var d=data();d.messages=d.messages.filter(function(n){return n.id!==m.id;});state.notes=d;if(editing&&editing.id===m.id)editing=null;delete drafts[m.id];commit();});}));head.appendChild(tools);message.appendChild(head);
        if(editing&&editing.id===m.id)edition(message,m);else{var body=el('div','pc-notes-body');notesRendu(body,m.text,m.mode);message.appendChild(body);}messages.appendChild(message);
      });
      // Préserver le brouillon même si son message est supprimé à distance.
      if(editing&&!record(editing.id)){var orphan=el('article','pc-note-message');edition(orphan,{id:editing.id});messages.appendChild(orphan);}
      if(to<results.length)messages.appendChild(miniBtn('Notes suivantes ('+(results.length-to)+')',null,function(){page(1);},'pc-notes-newer'));
      count.textContent=query?results.length+' résultat'+(results.length===1?'':'s')+' · '+rows.length+' notes':rows.length+' note'+(rows.length===1?'':'s');clear.disabled=!search.value;latest.hidden=to===results.length;following=!!bottom;
      if(bottom)history.scrollTop=history.scrollHeight;else{var found=Array.prototype.find.call(messages.querySelectorAll('.pc-note-message'),function(n){return n.dataset.id===anchor;});history.scrollTop=found?scroll+found.getBoundingClientRect().top-offset:scroll;}
      if(caret){var area=messages.querySelector('.pc-notes-editor textarea');if(area){area.focus({preventScroll:true});area.setSelectionRange(caret.start,caret.end);}}
      if(window.__owdApplyMode)window.__owdApplyMode(b);
    }
    history.addEventListener('scroll',function(){following=to===results.length&&history.scrollHeight-history.clientHeight-history.scrollTop<45;if(scrollFrame!==null)return;scrollFrame=requestAnimationFrame(function(){scrollFrame=null;if(dead||!history.clientHeight)return;if(history.scrollTop<35&&from>0)page(-1);else if(history.scrollHeight-history.clientHeight-history.scrollTop<35&&to<results.length)page(1);});},{passive:true});
    var observer=typeof ResizeObserver==='function'?new ResizeObserver(function(){if(following)history.scrollTop=history.scrollHeight;}):null;if(observer)observer.observe(messages);
    remontageNettoyage.push(function(){notesVues[vueKey]={text:input.value,mode:mode,search:search.value,editing:editing,drafts:drafts,searchCache:searchCache,first:results[from]&&results[from].id,count:to-from,scroll:history.scrollTop,following:following};dead=true;clearTimeout(timer);if(scrollFrame!==null)cancelAnimationFrame(scrollFrame);if(observer)observer.disconnect();});hooks.push(function(){redrawData(false);});
    updatePreview();redrawData(true);
    if(remembered&&!remembered.following){var index=results.findIndex(function(m){return m.id===remembered.first;});if(index>=0){from=index;to=Math.min(results.length,from+Math.max(BATCH,remembered.count));render(false);}}
    requestAnimationFrame(function(){if(dead)return;if(remembered&&!remembered.following){following=false;history.scrollTop=remembered.scroll;}else if(following)history.scrollTop=history.scrollHeight;});return b;
  }
