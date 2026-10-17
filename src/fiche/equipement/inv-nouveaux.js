  // Propriétés communes ajoutées sans réinterpréter les anciennes clés de stockage.
  var INV_TAILLES = ["Minuscule","Très petite","Petite","Moyenne","Grande","Très grande","Gigantesque"];
  var INV_TYPES_OBJETS = {arme:"Arme",vetement:"Vêtement",accessoire:"Accessoire",rangement:"Rangement",contenant:"Contenant",solide:"Solide",pate:"Pâte",liquide:"Liquide",munition:"Munition",autre:"Objet divers"};
  function invType(o) {return /^(eclairage|couchage)$/.test(o.typeObjet)?"autre":o.typeObjet || (o.arme?"arme":o.vet?"vetement":o.acc?"accessoire":o.sac||o.ceint?"rangement":o.contenant?"contenant":o.nourri?"solide":/^(fleche|carreau|balle|pierre)/.test(o.contenu||"")?"munition":o.contenu||"autre");}
  function invSousTypes(type) {
    if(type==="rangement")return [["sac","Sac à dos"],["ceint","Ceinture"]];
    if(["solide","pate","liquide"].indexOf(type)>=0)return [["ingerable","Ingérable"],["consommable","Consommable"],["autre","Autre"]];
    if(type==="munition")return [["fleches","Flèche"],["carreaux","Carreau"],["balles","Balle"],["pierres","Pierre"]];
    return [];
  }
  function invTailleAccepte(taille, max) {return !taille || !max || INV_TAILLES.indexOf(taille)<=INV_TAILLES.indexOf(max);}
  function invCoutAcc(o,lieu) {return lieu==="sacep" && o.taille==="Moyenne" ? 2 : 1;}
  function invTailleMaxSac(o) {return o && (o.tailleInterieure || (o.cap>=100?"Moyenne":o.cap>=50?"Petite":"Très petite"));}
  function enrichitObjet(n,o) {
    var modele=(D().equipements||[]).concat(D().consommables||[]).filter(function(x){return x.nom===o.nom;})[0];
    // Les anciens achats de Boutique ne transportaient aucun champ technique.
    // Leurs quantités, prix, poids, image et description restent ceux du joueur.
    if(!o.versionObjet && /^boutique:/.test(o.id||"") && modele){
      o=Object.assign({},modele,o);
      ["typeObjet","sousType","taille","tailleInterieure","tailleAccroche","effets","stats","restaurations","unitesRestauration","ps","ph","places","tempsConsommation","conditionsEffets","proprietes"].forEach(function(k){if(modele[k]!==undefined)o[k]=JSON.parse(JSON.stringify(modele[k]));});
      ["arme","vet","sac","ceint","acc","contenant","contenu","cap","ep","froid","chaud","poches","prot_physique","res_physique"].forEach(function(k){if(modele[k]!==undefined)n[k]=JSON.parse(JSON.stringify(modele[k]));});
      combatTypes().forEach(function(t){["prot_","res_"].forEach(function(p){if(modele[p+t]!==undefined){n[p+t]=modele[p+t];o[p+t]=modele[p+t];}});});
      if(n.arme)o.arme=n.arme;
    }
    n.versionObjet=1;
    n.typeObjet=invType(o);if(!INV_TYPES_OBJETS[n.typeObjet])n.typeObjet="autre";
    n.sousType=String(o.sousType || (o.sac?"sac":o.ceint?"ceint":o.vet?o.vet:o.acc?o.acc:o.arme?o.arme.type:o.nourri?"ingerable":n.typeObjet==="munition"?o.contenu:"autre"));
    if(/^(eclairage|couchage)$/.test(o.typeObjet))n.sousType="autre";
    n.nourri=n.sousType==="ingerable";n.places=pnum(o.places);
    n.taille=INV_TAILLES.indexOf(o.taille)>=0?o.taille:modele&&modele.taille||"";
    var mainsBase=o.arme&&o.arme.mains;
    if(mainsBase==null && o.arme)armesData().forEach(function(d){if(d.cle===o.arme.type || !o.arme.type&&pli(d.nom)===pli(o.nom))mainsBase=d.mains;});
    n.mains=num(o.mains,mainsBase===2?2:1)===2?2:1;
    if(n.arme)n.arme.mains=n.mains;
    n.volume=pnum(o.volume===undefined?o.encombre:o.volume);n.encombre=n.volume;
    n.tailleInterieure=String(o.tailleInterieure||"");n.tailleAccroche=String(o.tailleAccroche || (n.sac?"Moyenne":""));
    n.effets=(Array.isArray(o.effets)?o.effets:[]).slice(0,5).map(String);
    n.restaurations={};n.unitesRestauration={};
    ["pv","pe","pm","pr","ps","ph","pi"].forEach(function(k){n.restaurations[k]=snum(o.restaurations&&o.restaurations[k]);n.unitesRestauration[k]=o.unitesRestauration&&o.unitesRestauration[k]==="% max"?"% max":"points";});
    n.ps=snum(o.ps);n.ph=snum(o.ph);n.tempsConsommation=pnum(o.tempsConsommation);
    n.conditionsEffets=o.conditionsEffets&&typeof o.conditionsEffets==="object"?JSON.parse(JSON.stringify(o.conditionsEffets)):{};
    n.stats=o.stats&&typeof o.stats==="object"?JSON.parse(JSON.stringify(o.stats)):{};
    n.proprietes=o.proprietes&&typeof o.proprietes==="object"?JSON.parse(JSON.stringify(o.proprietes)):{};
    n.munitionStats=o.munitionStats&&typeof o.munitionStats==="object"?JSON.parse(JSON.stringify(o.munitionStats)):{degats:0,repartition:{physique:100}};
    ["prot","res"].forEach(function(k){n[k+"_physique"]=o[k+"_physique"]===undefined?(modele&&modele[k+"_physique"]!==undefined?snum(modele[k+"_physique"]):Math.max(snum(o[k+"_contondant"]),snum(o[k+"_perforant"]),snum(o[k+"_tranchant"]))):snum(o[k+"_physique"]);});
    if(n.arme){var rep=o.arme&&o.arme.repartition || modele&&modele.arme&&modele.arme.repartition || {physique:100};n.arme.repartition={};combatTypes().forEach(function(k){if(isFinite(Number(rep[k])))n.arme.repartition[k]=pnum(rep[k]);});if(!Object.keys(n.arme.repartition).length)n.arme.repartition={physique:100};n.arme.hits=Math.max(1,Math.floor(pnum(o.arme&&o.arme.hits)||1));n.arme.dex=pnum(o.arme&&o.arme.dex);n.arme.for=pnum(o.arme&&o.arme.for);}
    if(n.typeObjet==="munition"){n.sousType={fleche:"fleches",carreau:"carreaux",balle:"balles",pierre:"pierres"}[n.sousType]||n.sousType;n.contenu=n.sousType;}
    return n;
  }
  function invChoix(label,values,current,change) {
    var s=el("select","pc-select pc-edit-field");values.forEach(function(v){var k=Array.isArray(v)?v[0]:v,t=Array.isArray(v)?v[1]:v;var op=el("option",null,t);op.value=k;op.selected=k===current;s.appendChild(op);});
    s.addEventListener("change",function(){change(s.value);save();refresh();});return fld(label,s);
  }
  function invAvecEffets(it) {return ["solide","pate","liquide"].indexOf(invType(it))>=0 && ["ingerable","consommable"].indexOf(it.sousType)>=0;}
  function invChampsCommuns(body,it,render) {
    if(invAvecEffets(it)){
      body.appendChild(el("div","lbl","Effets"));var card=el("div","pc-arme");
      if(!Array.isArray(it.effets))it.effets=[];
      for(var i=0;i<5;i++)(function(index){card.appendChild(fld("Effet "+(index+1),selectEffet(it.effets[index]||"",function(v){it.effets[index]=v;save();refresh();})));})(i);
      body.appendChild(card);
    }
    if(it.proprietes && Object.keys(it.proprietes).some(function(k){return it.proprietes[k]!=null;})){
      var props=el("div","pc-arme");Object.keys(it.proprietes).forEach(function(k){if(it.proprietes[k]==null)return;var i=el("input","pc-edit-field");i.type="text";i.value=it.proprietes[k];i.addEventListener("input",function(){it.proprietes[k]=i.value;save();});props.appendChild(fld({autonomie:"Autonomie",accrochable:"Accrochable",recharge:"Recharge"}[k]||k,i));});body.appendChild(props);
    }
    if(it.vet || it.acc){
      if(!it.stats)it.stats={};var stats=el("div","pc-arme-repartition");
      function nombre(label,read,write){var n=el("input","pc-edit-field");champNombreSigne(n);n.value=read();n.addEventListener("input",function(){var v=litNombreSigne(n.value);if(isFinite(v)){write(v);save();}});n.addEventListener("change",refresh);return fld(label,n);}
      if(!it.stats.degats)it.stats.degats={};if(!it.stats.couts)it.stats.couts={};
      combatTypes().forEach(function(k){stats.appendChild(nombre("Dégâts "+combatLibType(k)+" (%)",function(){return num(it.stats.degats[k],0);},function(v){it.stats.degats[k]=v;}));});
      ["pm","pe"].forEach(function(k){stats.appendChild(nombre("Coût "+k.toUpperCase()+" (%)",function(){return num(it.stats.couts[k],0);},function(v){it.stats.couts[k]=v;}));});
      [["vitesse","Déplacement (%)"],["innocence","Résistance corruption (%)"],["alterations","Résistance altérations (%)"]].forEach(function(x){stats.appendChild(nombre(x[1],function(){return num(it.stats[x[0]],0);},function(v){it.stats[x[0]]=v;}));});body.appendChild(stats);
    }
    if(invType(it)==="munition"){
      if(!it.munitionStats)it.munitionStats={degats:0,repartition:{physique:100}};
      var mun=el("div","pc-arme");mun.appendChild(champArme("Dégâts supplémentaires",it.munitionStats,"degats"));
      if(!it.munitionStats.repartition)it.munitionStats.repartition={physique:100};
      combatTypes().forEach(function(k){mun.appendChild(champArme(combatLibType(k)+" (%)",it.munitionStats.repartition,k));});body.appendChild(mun);
    }
    if(invAvecEffets(it)){
      var rs=el("div","pc-arme");
      if(!it.restaurations)it.restaurations={};if(!it.unitesRestauration)it.unitesRestauration={};
      ["pv","pe","pm","pr","ps","ph","pi"].forEach(function(k){
        var line=el("div","pc-obj-pair"),n=el("input","pc-edit-field");champNombreSigne(n);n.value=num(it.restaurations[k],0);n.setAttribute("aria-label","Restauration "+k.toUpperCase());
        n.addEventListener("input",function(){var v=litNombreSigne(n.value);if(isFinite(v)){it.restaurations[k]=v;save();}});
        line.appendChild(fld("Restauration "+k.toUpperCase(),n));line.appendChild(invChoix("Unité",[["points","Points"],["% max","% du maximum"]],it.unitesRestauration[k]||"points",function(v){it.unitesRestauration[k]=v;}));rs.appendChild(line);
      });body.appendChild(rs);
    }
  }
  function invConsommer(it,q,cible) {
    q=Math.min(pnum(q),pnum(it.qte));if(!(q>0))return false;
    var effects=(it.effets||[]).map(effetDefinition).filter(Boolean);
    if(effects.length && Math.abs(q-Math.round(q))>1e-9){flash("Les effets sont définis par dose entière : choisissez une quantité entière.");return false;}
    if(effects.some(function(d){return d.ops.impregnation;})&&!defenseArme(cible)){flash("Choisissez l’arme à imprégner.");return false;}
    var ingere=it.nourri || it.sousType==="ingerable",avant={};
    ["pv","pe","pm","pr","ps","ph","pi"].forEach(function(k){avant[k]=maxDe(k);});
    var results=[];
    // Les probabilités sont testées à la consommation, jamais au rafraîchissement.
    effects.forEach(function(d){
      if(d.categorie==="Maladie" || d.categorie==="Traitement"){results.push([d.nom,"À gérer avec les maladies"]);return;}
      var seuil=Number(it.conditionsEffets&&it.conditionsEffets[d.id]);
      if(seuil>0){var jet=1+Math.floor(Math.random()*8)+1+Math.floor(Math.random()*8);results.push([d.nom,"2d8 = "+jet+" ; seuil ≤ "+seuil]);if(jet>seuil)return;}
      var count=d.ops.alcool?Math.floor(q):1;
      while(count-->0)appliqueEffet(d.id,it.nom,cible);
    });
    ["pv","pe","pm","pr","ps","ph","pi"].forEach(function(k){
      var v=num(it.restaurations&&it.restaurations[k],0);
      if(it.unitesRestauration&&it.unitesRestauration[k]==="% max")v=avant[k]*v/100;
      if(ingere && (k==="ps"||k==="ph"))v+=num(it[k],0);
      v*=q;if(k==="pi")v=effetPerteInnocence(v);
      if(v)bougeReserve(k,v);
    });
    if(ingere)state.etat.contenance=Math.round((contenancePrise()+q*pnum(it.places))*1000)/1000;
    it.qte=Math.round((it.qte-q)*100)/100;
    if(!it.qte)state.inv.objets.splice(state.inv.objets.indexOf(it),1);
    results.unshift(["Quantité",fmtP(q)],["Temps",fmtP(q*pnum(it.tempsConsommation))+" DA"]);
    sayChat("Consommer — "+it.nom,results);refresh();if(invRender)invRender();return true;
  }
  function invConsommerDialogue(it,q) {
    var impr=(it.effets||[]).some(function(id){var d=effetDefinition(id);return d&&d.ops.impregnation;});
    if(!impr){invConsommer(it,q,"");return;}
    var body=el("div","pc-modal-body"),s=el("select","pc-select");
    state.inv.objets.filter(function(o){return o.arme;}).forEach(function(o){var op=el("option",null,o.nom||"Arme");op.value=o.ref;s.appendChild(op);});body.appendChild(fld("Arme à imprégner",s));
    dialogue("Appliquer — "+it.nom,body,function(){return invConsommer(it,q,s.value);},"Appliquer");
  }
