/* Données du transfert : copies complètes, références distinctes et reçu
 * durable. Aucun don par le chat, aucune réduction des métadonnées d'objet. */
(function(root){'use strict';
  function copy(v){return JSON.parse(JSON.stringify(v));}
  function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+stable(v[k]);}).join(',')+'}';return JSON.stringify(v);}
  function group(inv,ref){var items=inv&&inv.objets||[],first=items.filter(function(x){return x.ref===ref;})[0];if(!first)throw Error('Cet objet n’est plus dans cet inventaire.');
    var out=[first],ids={};ids[first.ref]=true;for(var i=0;i<out.length;i++)items.forEach(function(x){if(x.dans===out[i].ref&&!ids[x.ref]){ids[x.ref]=true;out.push(x);}});return copy(out);}
  function prepare(source,target,items,id){if(!source||!target||source===target||!items||!items.length)throw Error('Transfert invalide.');
    var refs={};items.forEach(function(x,i){if(!x.ref||refs[x.ref])throw Error('Référence d’objet invalide.');refs[x.ref]='ot'+id.replace(/[^a-zA-Z0-9]/g,'')+'_'+i;});
    var dest=copy(items);dest.forEach(function(x){var ref=x.ref;x.ref=refs[ref];x.dans=refs[x.dans]||'';x.ou='sac';x.emp=-1;});
    return {id:id,source:source,target:target,items:copy(items),dest:dest,phase:'receive'};}
  function received(state,job){var items=state&&state.inv&&state.inv.objets||[];return job.dest.every(function(x){var a=items.filter(function(o){return o.ref===x.ref;})[0];return !!a&&stable(a)===stable(x);});}
  function committed(state,job){return !!(state&&state.inv&&state.inv.transferts&&state.inv.transferts[job.id]===true);}
  function removed(state,job){var items=state&&state.inv&&state.inv.objets||[];return job.items.every(function(x){return !items.some(function(o){return o.ref===x.ref;});});}
  var api={copy:copy,stable:stable,group:group,prepare:prepare,received:received,committed:committed,removed:removed,cancelled:function(state,job){return removed(state,{items:job.dest});}};
  root.OwdInventoryData=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
