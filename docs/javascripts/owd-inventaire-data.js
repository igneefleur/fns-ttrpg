/* Données du transfert : copies complètes, références distinctes et reçu
 * durable. Aucun don par le chat, aucune réduction des métadonnées d'objet. */
(function(root){'use strict';
  function copy(v){return JSON.parse(JSON.stringify(v));}
  function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+stable(v[k]);}).join(',')+'}';return JSON.stringify(v);}
  function group(inv,ref){var items=inv&&inv.objets||[],first=items.filter(function(x){return x.ref===ref;})[0];if(!first)throw Error('Cet objet n’est plus dans cet inventaire.');
    var out=[first],ids=Object.create(null);ids[first.ref]=true;for(var i=0;i<out.length;i++)items.forEach(function(x){if(x.dans===out[i].ref&&!ids[x.ref]){ids[x.ref]=true;out.push(x);}});return copy(out);}
  function prepare(source,target,items,id){if(!source||!target||source===target||!items||!items.length)throw Error('Transfert invalide.');
    var refs=Object.create(null);items.forEach(function(x,i){if(!x.ref||refs[x.ref])throw Error('Référence d’objet invalide.');refs[x.ref]='ot'+id.replace(/[^a-zA-Z0-9]/g,'')+'_'+i;});
    var dest=copy(items);dest.forEach(function(x){var ref=x.ref;x.ref=refs[ref];x.dans=refs[x.dans]||'';x.ou='terre';x.emp=-1;});
    return {id:id,source:source,target:target,items:copy(items),dest:dest,phase:'receive'};}
  function received(state,job){var items=state&&state.inv&&state.inv.objets||[];return job.dest.every(function(x){var a=items.filter(function(o){return o.ref===x.ref;})[0];return !!a&&stable(a)===stable(x);});}
  function committed(state,job){return !!(state&&state.inv&&state.inv.transferts&&state.inv.transferts[job.id]===true);}
  function removed(state,job){var items=state&&state.inv&&state.inv.objets||[];return job.items.every(function(x){return !items.some(function(o){return o.ref===x.ref;});});}
  // Backpack links use the same stable refs as ordinary container contents.
  // « Par terre » appartient à la fiche, pas au chargement du personnage.
  // Les objets imbriqués suivent la localisation de leur contenant, même
  // lorsqu'ils conservent l'ancien repli technique ou="sac".
  var TAILLES=['Minuscule','Très petite','Petite','Moyenne','Grande','Très grande','Gigantesque'];
  function pocketFits(o){return !!o && TAILLES.indexOf(o.taille)>=0 && TAILLES.indexOf(o.taille)<=1;}
  function carrier(items){
    // Un seul index par calcul : le groupe au sol peut contenir des centaines
    // d'objets et leurs contenus sans multiplier les parcours de l'inventaire.
    var byRef=Object.create(null);
    (items||[]).forEach(function(o){if(o&&o.ref)byRef[o.ref]=o;});
    return function(item){
      var seen=Object.create(null),current=item;
      while(current){
        if(current.ref){if(seen[current.ref])return false;seen[current.ref]=true;}
        if(!current.dans || !byRef[current.dans])return current.ou!=='terre';
        current=byRef[current.dans];
      }
      return false;
    };
  }
  function isCarried(items,item){return carrier(items)(item);}
  function backpack(items){return items.filter(function(o){return o.sac&&!o.dans&&o.ou==='dos';})[0]||null;}
  function weight(items,item){return group({objets:items},item.ref).reduce(function(n,o){return n+(Number(o.poids)||0)*(Number(o.qte)||0);},0);}
  function bind(items){var bag=backpack(items);items.forEach(function(o){
    if(o.ou==='poches'&&!o.dans&&!pocketFits(o)){o.ou='terre';o.emp=-1;}
    if(o!==bag&&!o.dans&&(o.ou==='sac'||o.ou==='sacep')){
      if(bag){var max=bag.tailleInterieure||(bag.cap>=100?'Moyenne':bag.cap>=50?'Petite':'Très petite');
        if(o.ou==='sac'&&o.taille&&TAILLES.indexOf(o.taille)>TAILLES.indexOf(max)){o.ou='terre';o.emp=-1;}
        else o.dans=bag.ref;
      }else{o.ou='terre';o.emp=-1;}
    }
  });} 
  function split(items,item,q,ref){q=Number(q);if(item.sac||!(q>0&&q<Number(item.qte)))throw Error('Indiquez une quantité inférieure à la pile.');
    if(items.some(function(o){return o.dans===item.ref;}))throw Error('Videz ce contenant avant de séparer sa pile.');
    if(!ref||items.some(function(o){return o.ref===ref;}))throw Error("Référence de pile invalide.");
    var other=copy(item);other.ref=ref;other.qte=q;item.qte=Math.round((item.qte-q)*100)/100;
    if(other.ou!=='sac'&&other.ou!=='poches'&&other.ou!=='terre'){other.ou='sac';other.emp=-1;other.dans='';}
    items.splice(items.indexOf(item)+1,0,other);bind(items);return other;}
  var api={backpack:backpack,pocketFits:pocketFits,carrier:carrier,isCarried:isCarried,weight:weight,bind:bind,split:split,copy:copy,stable:stable,group:group,prepare:prepare,received:received,committed:committed,removed:removed,cancelled:function(state,job){return removed(state,{items:job.dest});}};
  root.OwdInventoryData=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
