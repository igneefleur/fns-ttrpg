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
  var DEPART={annee:412,mois:2,jour:3};
  function dateDepart(d){
    if(d===undefined)return {annee:DEPART.annee,mois:DEPART.mois,jour:DEPART.jour};
    if(!d||typeof d!=='object'||Array.isArray(d)||!Number.isSafeInteger(d.annee)||d.annee<1||d.annee>1000000000||!Number.isInteger(d.mois)||d.mois<1||d.mois>12||!Number.isInteger(d.jour)||d.jour<1||d.jour>28)throw new Error('Date de départ invalide');
    return {annee:d.annee,mois:d.mois,jour:d.jour};
  }
  function dateMonde(h,depart){
    h=clock(h);depart=dateDepart(depart);
    var jours=(depart.annee-1)*336+(depart.mois-1)*28+depart.jour-1+h.jours-1;
    var annee=Math.floor(jours/336)+1,reste=jours-(annee-1)*336,mois=Math.floor(reste/28)+1,jour=reste%28+1;
    return {annee:annee,mois:mois,jour:jour,saison:['Printemps','Été','Automne','Hiver'][Math.floor((mois-1)/3)]};
  }
  function validate(s){
    if(!s||s.v!==1)throw new Error('Version de Monde incompatible');
    var h=clock(s.horloge),t=s.temperature;dateDepart(s.dateDepart);
    if(t!==null&&(typeof t!=='number'||!Number.isFinite(t)||Math.abs(t)>999))throw new Error('Température invalide');
    if(s.temperatureAuto!==undefined&&typeof s.temperatureAuto!=='boolean')throw new Error('Mode automatique invalide');
    if(s.temperatureMode!==undefined&&['brut','progressif'].indexOf(s.temperatureMode)<0)throw new Error('Mode de température invalide');
    if(s.temperatureSaisonMode!==undefined&&['brut','progressif'].indexOf(s.temperatureSaisonMode)<0)throw new Error('Mode saisonnier invalide');
    if(s.temperatureRegion!==undefined&&!Object.prototype.hasOwnProperty.call(REGIONS,s.temperatureRegion))throw new Error('Région inconnue');
    // Une base mal formée n'est jamais réécrite après une lecture partielle.
    if(Object.keys(h).some(function(k){return h[k]!==s.horloge[k];}))throw new Error('Horloge distante non normalisée');
    return s;
  }
  var REGIONS={chersonese:'Chersonèse',enmerkar:'Enmerkar','plateau-antique':'Plateau antique'};
  var SAISONS={
    'Printemps':{lever:8,pic:14,coucher:20,jour:16,nuit:8},
    'Été':{lever:7,pic:14,coucher:21,jour:32,nuit:18},
    'Automne':{lever:8,pic:14,coucher:20,jour:16,nuit:8},
    'Hiver':{lever:9,pic:14,coucher:19,jour:0,nuit:-6}
  };
  var NOMS_SAISONS=['Printemps','Été','Automne','Hiver'],TRANSITIONS=[14,7,14,7];
  function arrondi(n){return Math.sign(n)*Math.floor(Math.abs(n)+0.5+1e-10)||0;}
  function jourAnnee(s){var d=dateMonde(s.horloge,s.dateDepart);return (d.mois-1)*28+d.jour-1;}
  function climatJour(s,jour){
    jour=((jour%336)+336)%336;
    var saison=Math.floor(jour/84),j=jour%84+1,x=j-0.5;
    var base=SAISONS[NOMS_SAISONS[saison]],out={lever:base.lever,pic:14,coucher:base.coucher,jour:base.jour,nuit:base.nuit,jourSaison:j};
    if(s.temperatureSaisonMode!=='progressif')return out;
    var avant=(saison+3)%4,apres=(saison+1)%4,r=TRANSITIONS[saison];
    // Une transition commune de 21 jours, échantillonnée au milieu du jour.
    ['jour','nuit'].forEach(function(k){
      if(x<r){var a=SAISONS[NOMS_SAISONS[avant]][k];out[k]=a+(base[k]-a)*(TRANSITIONS[avant]+x)/(TRANSITIONS[avant]+r);}
      else if(x>84-r){var b=SAISONS[NOMS_SAISONS[apres]][k];out[k]=base[k]+(b-base[k])*(x-(84-r))/(r+TRANSITIONS[apres]);}
    });
    // 6 jours d'approche, 2 jours de pic (42–43), 6 jours de retour.
    var p=j>=36&&j<=41?4*(j-35)/7:j===42||j===43?4:j>=44&&j<=49?4*(50-j)/7:0;
    var delta=saison===1?p:saison===3?-p:0;out.jour+=delta;out.nuit+=delta;
    // Soleil au plus haut à 14 h ; horaires retenus à l'heure entière.
    out.lever=arrondi(8-Math.sin(2*Math.PI*(jour+0.5-42)/336));out.coucher=28-out.lever;
    return out;
  }
  function climat(s){return climatJour(s,jourAnnee(s));}
  function soleil(s){
    var c=climat(s),h=s.horloge.heures,position='Nuit';
    if(h===c.lever)position='Lever du soleil';
    else if(h===c.coucher)position='Coucher du soleil';
    else if(h===c.pic)position='Soleil au plus haut';
    else if(h>c.lever&&h<c.pic)position='Soleil montant';
    else if(h>c.pic&&h<c.coucher)position='Soleil descendant';
    return {lever:c.lever,pic:c.pic,coucher:c.coucher,position:position,jour:h>=c.lever&&h<c.coucher};
  }
  function temperatureMonde(s){
    validate(s);
    if(s.temperatureAuto!==true)return s.temperature==null?null:arrondi(s.temperature);
    var jour=jourAnnee(s),c=climatJour(s,jour),h=s.horloge.heures;
    // Une seule valeur entière pour tout le créneau horaire.
    if(s.temperatureMode!=='progressif')return arrondi(h>=c.lever&&h<c.coucher?c.jour:c.nuit);
    var min=c.nuit-2,max=c.jour+2,f=c.lever-1,a,b,u;
    if(h<f){var veille=climatJour(s,jour-1);a=veille.jour+2;b=min;u=(h+8)/(f+8);}
    else if(h<=16){a=min;b=max;u=(h-f)/(16-f);}
    else{var demain=climatJour(s,jour+1);a=max;b=demain.nuit-2;u=(h-16)/(8+demain.lever-1);}
    var v=a+(b-a)*(1-Math.cos(Math.PI*u))/2,bas=arrondi(min),haut=arrondi(max);
    if(h===f)return bas;
    if(h===16)return haut;
    // L'arrondi ne doit pas prolonger un pic sur les heures voisines.
    return Math.max(bas+1,Math.min(haut-1,arrondi(v)));
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
  var api={sync:sync,clock:clock,advance:advance,dateDepart:dateDepart,dateMonde:dateMonde,validate:validate,read:read,fromLegacy:fromLegacy,regions:REGIONS,temperatureMonde:temperatureMonde,climat:climat,climatJour:climatJour,soleil:soleil,arrondi:arrondi};
  root.OwdMondeData=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
