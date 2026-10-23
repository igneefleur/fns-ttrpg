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
  function backpack(items){return items.filter(function(o){return o.sac&&!o.dans&&Number(o.qte)===1&&o.ou==='dos';})[0]||null;}
  function weight(items,item){var tree=group({objets:items},item.ref);tree[0].dans='';return tree.reduce(function(n,o){return n+(Number(o.poids)||0)*totalQuantity(tree,o);},0);}
  function bind(items){var bag=backpack(items);items.forEach(function(o){
    if(o.ou==='poches'&&!o.dans&&!pocketFits(o)){o.ou='terre';o.emp=-1;}
    if(o!==bag&&!o.dans&&(o.ou==='sac'||o.ou==='sacep')){
      if(bag){var max=bag.tailleInterieure||(bag.cap>=100?'Moyenne':bag.cap>=50?'Petite':'Très petite');
        if(o.ou==='sac'&&o.taille&&TAILLES.indexOf(o.taille)>TAILLES.indexOf(max)){o.ou='terre';o.emp=-1;}
        else o.dans=bag.ref;
      }else{o.ou='terre';o.emp=-1;}
    }
  });} 
  // Les descendants décrivent le contenu d'UN exemplaire de la pile.
  var slots=['mainG','mainD','ceinture','dos','tete','haut','mains','bas','pieds','oreilles','collier','sousvet','poignetG','poignetD','bagueG','bagueD','chevilleG','chevilleD','cape','ceint','sacep'];
  function equipped(o){return slots.indexOf(o.ou)>=0&&(!o.dans||o.ou==='sacep');}
  function fresh(items,base){var ref=base,i=0;while(items.some(function(o){return o.ref===ref;}))ref=base+'_'+(++i);return ref;}
  function split(items,item,q,ref){q=Number(q);if(!(q>0&&q<Number(item.qte)))throw Error('Indiquez une quantité inférieure à la pile.');
    if(!ref||items.some(function(o){return o.ref===ref;}))throw Error('Référence de pile invalide.');
    isolateAncestors(items,item);
    var tree=group({objets:items},item.ref),refs={};refs[item.ref]=ref;
    tree.slice(1).forEach(function(o,i){refs[o.ref]=fresh(items,ref+'c'+i);});
    tree.forEach(function(o,i){o.ref=refs[o.ref];o.dans=refs[o.dans]||o.dans;if(i===0){o.qte=q;if(equipped(o)){o.ou='terre';o.emp=-1;o.dans='';}}});
    item.qte=Math.round((Number(item.qte)-q)*100)/100;Array.prototype.push.apply(items,tree);return tree[0];}
  function isolateAncestors(items,item,seen){seen=seen||{};if(!item.dans||seen[item.ref])return;seen[item.ref]=true;
    var p=items.filter(function(o){return o.ref===item.dans;})[0];if(p){isolateAncestors(items,p,seen);isolateSelf(items,p);}}
  function isolateSelf(items,item){if(Number(item.qte)>1)split(items,item,Math.round((Number(item.qte)-1)*100)/100,fresh(items,item.ref+'pile'));return item;}
  function isolate(items,item){isolateAncestors(items,item);return isolateSelf(items,item);}
  function normalizeSlots(items){items.slice().forEach(function(o){if(!equipped(o))return;
    if(Number(o.qte)<1||!isFinite(Number(o.qte))){o.ou='terre';o.dans='';o.emp=-1;}
    else if(Number(o.qte)>1)isolate(items,o);
  });}
  function signature(items,item,seen,child){seen=seen||{};if(seen[item.ref])throw Error('Contenu cyclique.');var next=Object.assign({},seen);next[item.ref]=true;var value={};
    Object.keys(item).forEach(function(k){if(['ref','dans','ou','emp','qte'].indexOf(k)<0)value[k]=item[k];});
    if(child&&item.ou==='sacep'){value.ou='sacep';value.emp=item.emp;}
    var contents=Object.create(null);items.filter(function(o){return o.dans===item.ref;}).forEach(function(o){var key=signature(items,o,next,true);contents[key]=Math.round(((contents[key]||0)+Number(o.qte))*100)/100;});
    return stable({objet:value,contenu:contents});}
  function canMerge(items,a,b){if(!a||!b||a===b||equipped(a)||equipped(b)||a.ou!==b.ou||(a.dans||'')!==(b.dans||'')||!(Number(a.qte)>0&&Number(b.qte)>0))return false;
    try{return signature(items,a)===signature(items,b);}catch(e){return false;}}
  function merge(items,target,source){if(!canMerge(items,target,source))throw Error('Ces objets ne sont pas identiques.');
    isolateAncestors(items,target);isolateAncestors(items,source);
    var refs=group({objets:items},source.ref).map(function(o){return o.ref;});target.qte=Math.round((Number(target.qte)+Number(source.qte))*100)/100;
    for(var i=items.length-1;i>=0;i--)if(refs.indexOf(items[i].ref)>=0)items.splice(i,1);return target;}
  function totalQuantity(items,item){var q=Number(item.qte)||0,seen={},p=item;while(p&&p.dans){if(seen[p.ref])return 0;seen[p.ref]=true;p=items.filter(function(o){return o.ref===p.dans;})[0];if(p)q*=Number(p.qte)||0;}return q;}
  function takeCost(item){var hands=item&&item.mains;if(hands==null&&item&&item.arme)hands=item.arme.mains;return Math.max(0,(hands==='2 obligatoires'?2:1)-(item&&item.rapide?1:0));}
  var api={takeCost:takeCost,equipped:equipped,isolate:isolate,isolateAncestors:isolateAncestors,normalizeSlots:normalizeSlots,signature:signature,canMerge:canMerge,merge:merge,totalQuantity:totalQuantity,backpack:backpack,pocketFits:pocketFits,carrier:carrier,isCarried:isCarried,weight:weight,bind:bind,split:split,copy:copy,stable:stable,group:group,prepare:prepare,received:received,committed:committed,removed:removed,cancelled:function(state,job){return removed(state,{items:job.dest});}};
  root.OwdInventoryData=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
