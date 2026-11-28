/* Monde : calendrier, horloge et température. Session OwdSync identique à
 * celle de la fiche, écritures par registre, confirmation serveur et reprise. */
(function(){
  'use strict';
  var D=window.OwdMondeData,C=D&&D.sync,root=document.getElementById('monde-panneau')||document.getElementById('camp-panneau');
  if(!root)return;
  var charId=null,session=null,state=null,rights=false,capable=false,autoCapable=false,frozen=false,lastRead=0,timer=null,composing=false,tick=0;
  function post(m){m.ns='owd';if(charId)m.charId=charId;window.top.postMessage(m,'*');}
  function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
  var notice=el('p','om-notice'),clockFields={},dateFields={},controls=[],worldDate;
  notice.setAttribute('role','status');root.appendChild(notice);
  function message(t){notice.textContent=t||'';notice.hidden=!t;}
  function enabled(){return !!session&&rights&&capable&&!frozen;}
  function rendu(force){
    controls.forEach(function(n){n.disabled=!enabled();});
    if(!state)return;
    Object.keys(clockFields).forEach(function(k){var n=clockFields[k];if(force||document.activeElement!==n)n.value=state.horloge[k];});
    var depart=D.dateDepart(state.dateDepart),date=D.dateMonde(state.horloge,depart);
    Object.keys(dateFields).forEach(function(k){var n=dateFields[k];if(force||document.activeElement!==n)n.value=depart[k];});
    worldDate.textContent=String(date.jour).padStart(2,'0')+' / '+String(date.mois).padStart(2,'0')+' / '+date.annee;
    worldDate.setAttribute('aria-label','Jour '+date.jour+', mois '+date.mois+', année '+date.annee);
    seasonBadge.textContent=date.saison;
    seasonDay.textContent='Jour '+(((date.mois-1)%3)*28+date.jour)+' / 84';
    var automatique=state.temperatureAuto===true,t=D.temperatureMonde(state);
    source.value=automatique?'auto':'manuel';region.value=state.temperatureRegion||'chersonese';mode.value=state.temperatureMode||'brut';saisonMode.value=state.temperatureSaisonMode||'brut';
    autoOption.disabled=!autoCapable;autoFields.hidden=!automatique;modeInfo.hidden=!automatique;
    var soleil=D.soleil(state),climat=D.climat(state);
    tempSummary.textContent=automatique?D.regions[state.temperatureRegion||'chersonese']+' · Automatique':'Température manuelle';
    tempBox.dataset.automatique=automatique?'1':'0';
    modeInfo.textContent=mode.value==='brut'?'Jour : '+soleil.lever+' h–'+soleil.coucher+' h · '+D.arrondi(climat.jour)+' °C / '+D.arrondi(climat.nuit)+' °C':'Minimum : '+D.arrondi(climat.nuit-2)+' °C à '+(soleil.lever-1)+' h · Maximum : '+D.arrondi(climat.jour+2)+' °C à 16 h';
    autoNotice.hidden=autoCapable;autoNotice.textContent='Mettre à jour l’extension et recharger Roll20 pour activer la température automatique.';
    tempControls.forEach(function(n){n.disabled=!enabled()||automatique;});
    if(force||automatique||document.activeElement!==temperature)temperature.value=t==null?'':D.arrondi(t);
    sunPosition.textContent=soleil.position;
    sunPhase.textContent=soleil.jour?'☀ Jour':'☾ Nuit';
    sunPhase.dataset.jour=soleil.jour?'1':'0';
    sunLever.textContent=soleil.lever+' h';sunPeak.textContent=soleil.pic+' h';sunSet.textContent=soleil.coucher+' h';
    sunTimes.setAttribute('aria-label','Lever : '+soleil.lever+' h · Au plus haut : '+soleil.pic+' h · Coucher : '+soleil.coucher+' h');
    sunPosition.dataset.jour=soleil.jour?'1':'0';
    hourlyRows.forEach(function(r,h){
      var s=C.copy(state);s.horloge={jours:state.horloge.jours,heures:h,minutes:0,secondes:0};
      var temp=D.temperatureMonde(s),sun=D.soleil(s);r.temperature.textContent=temp==null?'—':D.arrondi(temp)+' °C';r.position.textContent=sun.position;r.phase.textContent=sun.jour?'☀ Jour':'☾ Nuit';r.phase.dataset.jour=sun.jour?'1':'0';
      r.row.classList.toggle('om-current-hour',h===state.horloge.heures);
      if(h===state.horloge.heures)r.row.setAttribute('aria-current','time');else r.row.removeAttribute('aria-current');
    });
  }
  function stop(err){frozen=true;message(err.message||String(err));rendu();}
  function transmit(){
    timer=null;if(!enabled())return;
    var lot=session.outgoing();if(Object.keys(lot).length)post({type:'save',attrs:lot});
  }
  function edit(fn){
    if(!enabled())return;
    try{fn();D.validate(state);session.capture(state);if(timer)clearTimeout(timer);timer=setTimeout(transmit,400);rendu();}
    catch(e){stop(e);}
  }
  function button(label,aria,fn){var b=el('button','om-button',label);b.type='button';b.setAttribute('aria-label',aria);b.addEventListener('click',fn);controls.push(b);return b;}
  var dateBox=el('section','om-date');dateBox.appendChild(el('h2','','Date du monde'));
  var dateHeader=el('div','om-date-header');worldDate=el('div','om-date-actuelle');dateHeader.appendChild(worldDate);dateBox.appendChild(dateHeader);
  var seasonInfo=el('div','om-season'),seasonBadge=el('span','om-badge'),seasonDay=el('span','om-season-day');seasonInfo.appendChild(seasonBadge);seasonInfo.appendChild(seasonDay);dateBox.appendChild(seasonInfo);
  var start=el('details','om-date-depart'),summary=el('summary','','Date de départ'),startRow=el('div','om-start-fields');start.appendChild(summary);
  [['jour','Jour',28],['mois','Mois',12],['annee','Année',1000000000]].forEach(function(a){
    var label=el('label','om-unit'),input=el('input','om-number');input.type='number';input.min='1';input.max=String(a[2]);input.step='1';input.setAttribute('aria-label',a[1]+' de début de campagne');
    input.addEventListener('change',function(){var v=Number(input.value);if(!Number.isSafeInteger(v)||v<1||v>a[2]){rendu(true);return;}
      edit(function(){var depart=D.dateDepart(state.dateDepart);depart[a[0]]=v;state.dateDepart=depart;});});
    label.appendChild(input);label.appendChild(el('span','',a[1]));startRow.appendChild(label);dateFields[a[0]]=input;controls.push(input);
  });start.appendChild(startRow);dateBox.appendChild(start);root.appendChild(dateBox);
  var clockBox=el('section','om-clock');clockBox.appendChild(el('h2','','Horloge'));
  var row=el('div','om-clock-fields');
  [['jours','Jour de campagne'],['heures','Heures'],['minutes','Minutes'],['secondes','Secondes']].forEach(function(a){
    var label=el('label','om-unit'),input=el('input','om-number');input.type='number';input.min='0';input.step='1';input.setAttribute('aria-label',a[1]);
    var baseSaisie=null;input.addEventListener('focus',function(){baseSaisie=state?C.copy(state.horloge):null;});
    input.addEventListener('input',function(){var v=Number(input.value);if(input.value===''||!Number.isFinite(v)||v<0)return;
      edit(function(){var h=C.copy(baseSaisie||state.horloge);h[a[0]]=v;state.horloge=D.clock(h);});});
    input.addEventListener('blur',function(){baseSaisie=null;if(!composing)rendu();});
    label.appendChild(input);label.appendChild(el('span','',a[1]));row.appendChild(label);clockFields[a[0]]=input;controls.push(input);
  });clockBox.appendChild(row);
  var timeTabs=el('div','om-time-tabs');timeTabs.setAttribute('role','group');timeTabs.setAttribute('aria-label','Unité de temps');clockBox.appendChild(timeTabs);
  var timeCommands=[],timeButtons=[];
  [['Round',3],['Minute',60],['Heure',3600]].forEach(function(a,i){
    var cmd=el('div','om-command');
    var tab=button(a[0],'Unité de temps : '+a[0],function(){timeCommands.forEach(function(n,k){n.hidden=k!==i;timeButtons[k].setAttribute('aria-pressed',k===i?'true':'false');});});
    tab.setAttribute('aria-pressed',i===0?'true':'false');timeTabs.appendChild(tab);timeButtons.push(tab);timeCommands.push(cmd);cmd.hidden=i!==0;
    cmd.appendChild(button('−','Reculer de 1 '+a[0].toLowerCase(),function(){edit(function(){state.horloge=D.advance(state.horloge,-a[1]);});}));
    var amount=el('input','om-number');amount.type='text';amount.inputMode='numeric';amount.step='1';amount.placeholder='±';amount.setAttribute('aria-label',a[0]+'s à appliquer');controls.push(amount);cmd.appendChild(amount);
    function apply(){var n=Number(amount.value);if(!Number.isSafeInteger(n)||!n)return;edit(function(){state.horloge=D.advance(state.horloge,n*a[1]);});amount.value='';}
    amount.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();apply();}});
    cmd.appendChild(button('Appliquer','Appliquer les '+a[0].toLowerCase()+'s',apply));
    cmd.appendChild(button('+','Avancer de 1 '+a[0].toLowerCase(),function(){edit(function(){state.horloge=D.advance(state.horloge,a[1]);});}));clockBox.appendChild(cmd);
  });root.appendChild(clockBox);
  var tempBox=el('section','om-temperature');tempBox.appendChild(el('h2','','Température'));
  var tempSummary=el('p','om-temp-summary');tempBox.appendChild(tempSummary);
  var tempSettings=el('details','om-temp-settings'),settingsTitle=el('summary','','Réglages');var settingsIcon=el('span','om-settings-icon','⚙');settingsIcon.setAttribute('aria-hidden','true');settingsTitle.insertBefore(settingsIcon,settingsTitle.firstChild);settingsTitle.setAttribute('aria-label','Réglages de température');tempSettings.appendChild(settingsTitle);
  var settingsBody=el('div','om-settings-body');tempSettings.appendChild(settingsBody);
  function choix(label,options){
    var l=el('label','om-choice'),s=el('select','om-select');s.setAttribute('aria-label',label);l.appendChild(el('span','',label));
    options.forEach(function(o){var option=el('option','',o[1]);option.value=o[0];s.appendChild(option);});l.appendChild(s);controls.push(s);return {label:l,input:s};
  }
  var sourceChoix=choix('Gestion',[['manuel','Manuelle'],['auto','Automatique']]),source=sourceChoix.input,autoOption=source.options[1];settingsBody.appendChild(sourceChoix.label);
  var autoFields=el('div','om-auto-fields'),regionChoix=choix('Région',Object.keys(D.regions).map(function(k){return [k,D.regions[k]];})),region=regionChoix.input;
  var modeChoix=choix('Journée',[['brut','Brut'],['progressif','Progressif']]),mode=modeChoix.input;
  var saisonChoix=choix('Saisons',[['brut','Brut'],['progressif','Progressif']]),saisonMode=saisonChoix.input;
  autoFields.appendChild(regionChoix.label);autoFields.appendChild(modeChoix.label);autoFields.appendChild(saisonChoix.label);settingsBody.appendChild(autoFields);
  var autoNotice=el('p','om-auto-notice');settingsBody.appendChild(autoNotice);
  var modeInfo=el('p','om-auto-notice om-climate-info');tempBox.appendChild(modeInfo);
  source.addEventListener('change',function(){edit(function(){state.temperatureAuto=source.value==='auto';});});
  region.addEventListener('change',function(){edit(function(){state.temperatureRegion=region.value;});});
  mode.addEventListener('change',function(){edit(function(){state.temperatureMode=mode.value;});});
  saisonMode.addEventListener('change',function(){edit(function(){state.temperatureSaisonMode=saisonMode.value;});});
  var tempControls=[];
  var tempRow=el('div','om-temperature-row'),temperature=el('input','om-number');temperature.type='number';temperature.step='1';temperature.min='-999';temperature.max='999';temperature.placeholder='—';temperature.setAttribute('aria-label','Température en °C');controls.push(temperature);
  temperature.addEventListener('input',function(){var n=Number(temperature.value);if(temperature.value!==''&&(!Number.isFinite(n)||Math.abs(n)>999))return;
    if(!state||state.temperatureAuto===true)return;
    edit(function(){state.temperature=temperature.value===''?null:D.arrondi(n);});});
  temperature.addEventListener('blur',function(){rendu();});
  function addTemp(n){if(!state||state.temperatureAuto===true)return;edit(function(){state.temperature=Math.max(-999,Math.min(999,D.arrondi((state.temperature||0)+n)));});}
  var moins=button('−','Réduire la température de 1 °C',function(){addTemp(-1);}),plus=button('+','Augmenter la température de 1 °C',function(){addTemp(1);});tempControls.push(moins,temperature,plus);
  tempRow.appendChild(moins);tempRow.appendChild(temperature);tempRow.appendChild(el('span','om-temp-unit','°C'));tempRow.appendChild(plus);tempBox.insertBefore(tempRow,modeInfo);tempBox.appendChild(tempSettings);root.appendChild(tempBox);
  var sunBox=el('section','om-sun');sunBox.appendChild(el('h2','','Soleil'));
  var sunStatus=el('div','om-sun-status'),sunPosition=el('p','om-sun-position'),sunPhase=el('span','om-badge om-sun-phase'),sunTimes=el('div','om-sun-times');sunStatus.appendChild(sunPosition);sunStatus.appendChild(sunPhase);sunBox.appendChild(sunStatus);sunBox.appendChild(sunTimes);
  function sunStat(label){var box=el('div','om-sun-stat'),v=el('strong');box.appendChild(v);box.appendChild(el('span','',label));sunTimes.appendChild(box);return v;}
  var sunLever=sunStat('Lever'),sunPeak=sunStat('Au plus haut'),sunSet=sunStat('Coucher');
  var forecastBox=el('section','om-forecast'),hourly=el('details','om-hourly');hourly.appendChild(el('summary','','Prévisions par heure'));
  var table=el('table','om-hourly-table'),head=el('thead'),headRow=el('tr');
  ['Jour / nuit','Créneau','Température','Soleil'].forEach(function(t){var th=el('th','',t);th.scope='col';headRow.appendChild(th);});head.appendChild(headRow);table.appendChild(head);
  var body=el('tbody'),hourlyRows=[];
  for(var hour=0;hour<24;hour++){
    var tr=el('tr'),phase=el('td','om-phase'),hh=String(hour).padStart(2,'0'),th=el('th','om-hour-range',hh+'h00 - '+hh+'h59'),tdTemp=el('td'),tdSun=el('td');th.scope='row';tr.appendChild(phase);tr.appendChild(th);tr.appendChild(tdTemp);tr.appendChild(tdSun);body.appendChild(tr);hourlyRows.push({row:tr,phase:phase,temperature:tdTemp,position:tdSun});
  }
  table.appendChild(body);var tableWrap=el('div','om-table-wrap');tableWrap.appendChild(table);hourly.appendChild(tableWrap);forecastBox.appendChild(hourly);root.appendChild(sunBox);root.appendChild(forecastBox);
  document.addEventListener('compositionstart',function(){composing=true;});document.addEventListener('compositionend',function(){composing=false;rendu();});
  function load(){if(charId)post({type:'load',resync:true});}
  function discovery(){post({type:'need-bridge'});post({type:'monde-char'});}
  function juge(d){return d.gm===true||String(d.controlledby||'').split(',').some(function(s){return s==='all'||(d.moi&&s===d.moi);});}
  window.addEventListener('message',function(ev){
    if(ev.data&&ev.data.ns==='owd'&&ev.data.type==='panel-theme'&&(ev.source===window.parent||ev.source===window.top)){document.documentElement.classList.toggle('night',!!ev.data.nuit);return;}
    var d=ev.data;if(ev.source!==window.top||!d||d.ns!=='owd')return;
    if(d.type==='monde-char-result'){
      if(!d.charId){if(d.pret!==false)message('Créer un personnage Roll20 nommé « Monde » et le partager avec les joueurs.');rights=false;rendu();return;}
      // Une frame reste liée au premier personnage pour toute sa vie.
      if(charId&&charId!==d.charId){stop('Le personnage Monde a changé : rouvrir le panneau.');return;}
      charId=d.charId;rights=juge(d);capable=d.monde===1;autoCapable=d.mondeData===1;if(!capable){message('Mettre à jour l’extension et recharger Roll20.');rendu();return;}load();
    }else if(d.type==='hydrate'&&d.charId===charId){
      if(d.collaboration!==1||d.resync!==true){capable=false;message('Mettre à jour l’extension et recharger Roll20.');rendu();return;}
      if(d.fresh!==true||d.sur!==true||frozen)return;
      try{
        if(!session){state=D.read(d.attrs||{});session=new C.Session(d.attrs||{},state);}
        else{var rec=session.receive(d.attrs||{});if(rec){state=D.validate(rec.state);if(rec.lost)message('Certaines modifications restent en attente de confirmation Roll20.');}}
        lastRead=Date.now();rendu();
        if(!rights)message('Lecture seule : partager le personnage Monde avec ce joueur.');
        else if(!Object.keys(session.pending).length)message('');
        transmit();
      }catch(e){stop(e);}
    }
  });
  message('Lecture de Monde…');rendu();post({type:'panneau',titre:'Monde',nuit:document.documentElement.classList.contains('night'),w:360,h:650});discovery();
  setInterval(function(){if(!charId||++tick%10===0)discovery();load();transmit();if(lastRead&&Date.now()-lastRead>12000)message('La synchronisation ne répond plus. Les modifications locales restent en attente.');},1200);
})();
