/* Données de Monde et conversion de l'ancien Camp. Aucune règle de personnage. */
(function(root){
  'use strict';
  var C=root.OwdSync||(typeof module==='object'&&module.exports?require('./owd-sync.js'):null);
  var sync=C.create({base:'owd_monde_base',prefix:'owd_monde_p_'});
  function value(a){return String(a&&typeof a==='object'?(a.current==null?'':a.current):(a==null?'':a));}
  function entier(n){n=Number(n);if(!Number.isFinite(n)||n<0)throw new Error('Horloge invalide');return Math.floor(n);}
  function clock(h){
    if(!h||typeof h!=='object'||Array.isArray(h))throw new Error('Horloge invalide');
    var s=entier(h.secondes),m=entier(h.minutes)+Math.floor(s/60),he=entier(h.heures)+Math.floor(m/60),j=entier(h.jours)+Math.floor(he/24);
    if(!Number.isSafeInteger(j)||j>999999999)throw new Error('Horloge hors limites');
    return {jours:j,heures:he%24,minutes:m%60,secondes:s%60};
  }
  function validate(s){
    if(!s||s.v!==1)throw new Error('Version de Monde incompatible');
    var h=clock(s.horloge),t=s.temperature;
    if(t!==null&&(typeof t!=='number'||!Number.isFinite(t)||Math.abs(t)>999))throw new Error('Température invalide');
    // Une base mal formée n'est jamais réécrite après une lecture partielle.
    if(Object.keys(h).some(function(k){return h[k]!==s.horloge[k];}))throw new Error('Horloge distante non normalisée');
    return s;
  }
  function advance(h,seconds){
    h=clock(h);var n=Number(seconds);
    if(!Number.isSafeInteger(n))throw new Error('Durée invalide');
    var total=Math.max(0,h.jours*86400+h.heures*3600+h.minutes*60+h.secondes+n);
    return clock({jours:Math.floor(total/86400),heures:Math.floor(total%86400/3600),minutes:Math.floor(total%3600/60),secondes:total%60});
  }
  function fromLegacy(attrs){
    var h={jours:1,heures:8,minutes:0,secondes:0},raw=value(attrs.owd_camp_h),c={},t=null;
    if(raw){
      var m=/^(\d+),(\d+)$/.exec(raw);if(!m)throw new Error('Ancienne horloge Camp illisible');
      h=clock({jours:Number(m[1]),heures:0,minutes:Number(m[2]),secondes:0});
    }
    raw=value(attrs.owd_camp_conf);
    if(raw){c=JSON.parse(raw);if(!c||typeof c!=='object'||Array.isArray(c)||Number(c.v||1)>1)throw new Error('Ancienne configuration Camp incompatible');}
    if(c.degres!=null){t=Number(c.degres);if(!Number.isFinite(t)||Math.abs(t)>999)throw new Error('Ancienne température illisible');}
    else if(c.milieu){
      // Table historique, utilisée UNIQUEMENT pour conserver la température
      // affichée à la conversion. Monde n'offre plus de milieu ni de calcul.
      var anciens={'souterrain':[12,12],'toundra':[-10,-25],'montagne':[-5,-15],'foret-hiver':[3,-3],'plateau':[12,0],'cote':[20,14],'foret-ete':[22,12],'marais':[28,22],'tropicale':[30,24],'volcanique':[40,32],'desert':[42,18]};
      var paire=anciens[c.milieu];if(paire)t=paire[h.heures>=5&&h.heures<22?0:1];
    }
    return {v:1,horloge:h,temperature:t};
  }
  function read(attrs){var r=sync.read(attrs);return r?validate(r.state):fromLegacy(attrs||{});}
  var api={sync:sync,clock:clock,advance:advance,validate:validate,read:read,fromLegacy:fromLegacy};
  root.OwdMondeData=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
