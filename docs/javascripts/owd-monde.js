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
    worldDate.textContent='Jour '+date.jour+' · Mois '+date.mois+' · Année '+date.annee+' · '+date.saison;
    var automatique=state.temperatureAuto===true,t=D.temperatureMonde(state);
    source.value=automatique?'auto':'manuel';region.value=state.temperatureRegion||'chersonese';mode.value=state.temperatureMode||'brut';saisonMode.value=state.temperatureSaisonMode||'brut';
    autoOption.disabled=!autoCapable;autoFields.hidden=!automatique;
    var soleil=D.soleil(state),climat=D.climat(state);
    modeInfo.textContent=mode.value==='brut'?'Jour : '+soleil.lever+' h–'+soleil.coucher+' h · '+D.arrondi(climat.jour)+' °C / '+D.arrondi(climat.nuit)+' °C':'Minimum : '+D.arrondi(climat.nuit-2)+' °C à '+(soleil.lever-1)+' h · Maximum : '+D.arrondi(climat.jour+2)+' °C à 16 h';
    autoNotice.hidden=autoCapable;autoNotice.textContent='Mettre à jour l’extension et recharger Roll20 pour activer la température automatique.';
    tempControls.forEach(function(n){n.disabled=!enabled()||automatique;});
    if(force||automatique||document.activeElement!==temperature)temperature.value=t==null?'':D.arrondi(t);
    sunPosition.textContent=soleil.position;
    sunTimes.textContent='Lever : '+soleil.lever+' h · Au plus haut : '+soleil.pic+' h · Coucher : '+soleil.coucher+' h';
    sunPosition.dataset.jour=soleil.jour?'1':'0';
    hourlyRows.forEach(function(r,h){
      var s=C.copy(state);s.horloge={jours:state.horloge.jours,heures:h,minutes:0,secondes:0};
      var temp=D.temperatureMonde(s);r.temperature.textContent=temp==null?'—':D.arrondi(temp)+' °C';r.position.textContent=D.soleil(s).position;
      r.row.classList.toggle('om-current-hour',h===state.horloge.heures);
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
  worldDate=el('div','om-date-actuelle');worldDate.setAttribute('aria-live','polite');dateBox.appendChild(worldDate);
  var start=el('details','om-date-depart'),summary=el('summary','','Début de la campagne'),startRow=el('div','om-start-fields');start.appendChild(summary);
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
  [['Round',3],['Minute',60],['Heure',3600]].forEach(function(a){
    var cmd=el('div','om-command');
    cmd.appendChild(button('−','Reculer de 1 '+a[0].toLowerCase(),function(){edit(function(){state.horloge=D.advance(state.horloge,-a[1]);});}));
    var amount=el('input','om-number');amount.type='text';amount.inputMode='numeric';amount.step='1';amount.placeholder='±';amount.setAttribute('aria-label',a[0]+'s à appliquer');controls.push(amount);cmd.appendChild(amount);cmd.appendChild(el('span','om-unit-name',a[0]));
    function apply(){var n=Number(amount.value);if(!Number.isSafeInteger(n)||!n)return;edit(function(){state.horloge=D.advance(state.horloge,n*a[1]);});amount.value='';}
    amount.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();apply();}});
    cmd.appendChild(button('Appliquer','Appliquer les '+a[0].toLowerCase()+'s',apply));
    cmd.appendChild(button('+','Avancer de 1 '+a[0].toLowerCase(),function(){edit(function(){state.horloge=D.advance(state.horloge,a[1]);});}));clockBox.appendChild(cmd);
  });root.appendChild(clockBox);
  var tempBox=el('section','om-temperature');tempBox.appendChild(el('h2','','Température'));
  function choix(label,options){
    var l=el('label','om-choice'),s=el('select','om-select');s.setAttribute('aria-label',label);l.appendChild(el('span','',label));
    options.forEach(function(o){var option=el('option','',o[1]);option.value=o[0];s.appendChild(option);});l.appendChild(s);controls.push(s);return {label:l,input:s};
  }
  var sourceChoix=choix('Gestion',[['manuel','Manuelle'],['auto','Automatique']]),source=sourceChoix.input,autoOption=source.options[1];tempBox.appendChild(sourceChoix.label);
  var autoFields=el('div','om-auto-fields'),regionChoix=choix('Région',Object.keys(D.regions).map(function(k){return [k,D.regions[k]];})),region=regionChoix.input;
  var modeChoix=choix('Journée',[['brut','Brut'],['progressif','Progressif']]),mode=modeChoix.input;
  var saisonChoix=choix('Saisons',[['brut','Brut'],['progressif','Progressif']]),saisonMode=saisonChoix.input;
  autoFields.appendChild(regionChoix.label);autoFields.appendChild(modeChoix.label);autoFields.appendChild(saisonChoix.label);tempBox.appendChild(autoFields);
  var autoNotice=el('p','om-auto-notice');tempBox.appendChild(autoNotice);
  var modeInfo=el('p','om-auto-notice');autoFields.appendChild(modeInfo);
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
  tempRow.appendChild(moins);tempRow.appendChild(temperature);tempRow.appendChild(el('span','','°C'));tempRow.appendChild(plus);tempBox.appendChild(tempRow);root.appendChild(tempBox);
  var sunBox=el('section','om-sun');sunBox.appendChild(el('h2','','Soleil'));
  var sunPosition=el('p','om-sun-position'),sunTimes=el('p','om-sun-times');sunBox.appendChild(sunPosition);sunBox.appendChild(sunTimes);
  var hourly=el('details','om-hourly');hourly.appendChild(el('summary','','Prévisions par heure'));
  var table=el('table','om-hourly-table'),head=el('thead'),headRow=el('tr');
  ['Heure','Température','Soleil'].forEach(function(t){var th=el('th','',t);th.scope='col';headRow.appendChild(th);});head.appendChild(headRow);table.appendChild(head);
  var body=el('tbody'),hourlyRows=[];
  for(var hour=0;hour<24;hour++){
    var tr=el('tr'),th=el('th','',String(hour).padStart(2,'0')+' h'),tdTemp=el('td'),tdSun=el('td');th.scope='row';tr.appendChild(th);tr.appendChild(tdTemp);tr.appendChild(tdSun);body.appendChild(tr);hourlyRows.push({row:tr,temperature:tdTemp,position:tdSun});
  }
  table.appendChild(body);hourly.appendChild(table);sunBox.appendChild(hourly);root.appendChild(sunBox);
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
      charId=d.charId;rights=juge(d);capable=d.monde===1;autoCapable=d.temperatureAuto===1&&d.climat===2;if(!capable){message('Mettre à jour l’extension et recharger Roll20.');rendu();return;}load();
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
