/* Monde : seulement l'horloge et la température. Session OwdSync identique à
 * celle de la fiche, écritures par registre, confirmation serveur et reprise. */
(function(){
  'use strict';
  var D=window.OwdMondeData,C=D&&D.sync,root=document.getElementById('monde-panneau')||document.getElementById('camp-panneau');
  if(!root)return;
  var charId=null,session=null,state=null,rights=false,capable=false,frozen=false,lastRead=0,timer=null,composing=false,tick=0;
  function post(m){m.ns='owd';if(charId)m.charId=charId;window.top.postMessage(m,'*');}
  function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
  var notice=el('p','om-notice'),clockFields={},controls=[];
  notice.setAttribute('role','status');root.appendChild(notice);
  function message(t){notice.textContent=t||'';notice.hidden=!t;}
  function enabled(){return !!session&&rights&&capable&&!frozen;}
  function rendu(force){
    controls.forEach(function(n){n.disabled=!enabled();});
    if(!state)return;
    Object.keys(clockFields).forEach(function(k){var n=clockFields[k];if(force||document.activeElement!==n)n.value=state.horloge[k];});
    if(force||document.activeElement!==temperature)temperature.value=state.temperature==null?'':state.temperature;
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
  var clockBox=el('section','om-clock');clockBox.appendChild(el('h2','','Horloge'));
  var row=el('div','om-clock-fields');
  [['jours','Jours'],['heures','Heures'],['minutes','Minutes'],['secondes','Secondes']].forEach(function(a){
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
    var amount=el('input','om-number');amount.type='number';amount.step='1';amount.placeholder='±';amount.setAttribute('aria-label',a[0]+'s à appliquer');controls.push(amount);cmd.appendChild(amount);cmd.appendChild(el('span','om-unit-name',a[0]));
    function apply(){var n=Number(amount.value);if(!Number.isSafeInteger(n)||!n)return;edit(function(){state.horloge=D.advance(state.horloge,n*a[1]);});amount.value='';}
    amount.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();apply();}});
    cmd.appendChild(button('Appliquer','Appliquer les '+a[0].toLowerCase()+'s',apply));
    cmd.appendChild(button('+','Avancer de 1 '+a[0].toLowerCase(),function(){edit(function(){state.horloge=D.advance(state.horloge,a[1]);});}));clockBox.appendChild(cmd);
  });root.appendChild(clockBox);
  var tempBox=el('section','om-temperature');tempBox.appendChild(el('h2','','Température'));
  var tempRow=el('div','om-temperature-row'),temperature=el('input','om-number');temperature.type='number';temperature.step='0.1';temperature.min='-999';temperature.max='999';temperature.placeholder='—';temperature.setAttribute('aria-label','Température en °C');controls.push(temperature);
  temperature.addEventListener('input',function(){var n=Number(temperature.value);if(temperature.value!==''&&(!Number.isFinite(n)||Math.abs(n)>999))return;
    edit(function(){state.temperature=temperature.value===''?null:Math.round(n*10)/10;});});
  temperature.addEventListener('blur',function(){rendu();});
  function addTemp(n){edit(function(){state.temperature=Math.max(-999,Math.min(999,Math.round(((state.temperature||0)+n)*10)/10));});}
  tempRow.appendChild(button('−','Réduire la température de 1 °C',function(){addTemp(-1);}));tempRow.appendChild(temperature);tempRow.appendChild(el('span','','°C'));tempRow.appendChild(button('+','Augmenter la température de 1 °C',function(){addTemp(1);}));tempBox.appendChild(tempRow);root.appendChild(tempBox);
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
      charId=d.charId;rights=juge(d);capable=d.monde===1;if(!capable){message('Mettre à jour l’extension et recharger Roll20.');rendu();return;}load();
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
  message('Lecture de Monde…');rendu();post({type:'panneau',titre:'Monde',nuit:document.documentElement.classList.contains('night'),w:360,h:350});discovery();
  setInterval(function(){if(!charId||++tick%10===0)discovery();load();transmit();if(lastRead&&Date.now()-lastRead>12000)message('La synchronisation ne répond plus. Les modifications locales restent en attente.');},1200);
})();
