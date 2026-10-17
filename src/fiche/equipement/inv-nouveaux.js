  // Propriétés communes ajoutées sans réinterpréter les anciennes clés de stockage.
  var INV_TAILLES = ["Minuscule","Très petite","Petite","Moyenne","Grande","Très grande","Gigantesque"];
  var INV_TYPES_OBJETS = {arme:"Arme",vetement:"Vêtement",accessoire:"Accessoire",rangement:"Rangement",contenant:"Contenant",consommable:"Consommable",munition:"Munition",autre:"Objet divers"};
  function invType(o) {
    var ancien=String(o.typeObjet||"");
    if(/^(eclairage|couchage)$/.test(ancien))return "autre";
    // Les trois anciens types deviennent un même type de formulaire sans
    // réécrire la catégorie physique `contenu` des objets déjà stockés.
    if(["solide","pate","liquide"].indexOf(ancien)>=0)return "consommable";
    if(ancien)return ancien;
    if(o.arme)return "arme";
    if(o.vet)return "vetement";
    if(o.acc)return "accessoire";
    if(o.sac||o.ceint)return "rangement";
    if(o.contenant)return "contenant";
    if(/^(fleche|carreau|balle|pierre)/.test(o.contenu||""))return "munition";
    if(o.nourri||["solide","pate","liquide"].indexOf(o.contenu)>=0)return "consommable";
    return "autre";
  }
  function invFormeConsommable(o) {
    var raw=String(o.typeObjet||"");
    if(["solide","pate","liquide"].indexOf(raw)>=0)return raw;
    var sub=String(o.sousType||"");
    if(/^(solide|pate|liquide)_(ingerable|autre)$/.test(sub))return sub.split("_")[0];
    if(o.contenu==="liquide"||o.contenu==="pate")return o.contenu;
    return "solide";
  }
  function invSousTypeConsommable(o) {
    var sub=String(o.sousType||"");
    if(/^(solide|pate|liquide)_(ingerable|autre)$/.test(sub))return sub;
    // Avant la fusion, `consommable` désignait l'usage sans ingestion :
    // il devient « autre », mais conserve ses effets et ses restaurations.
    var use=(sub==="ingerable"||(!sub && o.nourri))?"ingerable":"autre";
    return invFormeConsommable(o)+"_"+use;
  }
  function invEstIngerable(it){return /^(solide|pate|liquide)_ingerable$/.test(it.sousType||"");}
  function invSousTypes(type) {
    if(type==="rangement")return [["sac","Sac à dos"],["ceint","Ceinture"]];
    if(type==="consommable")return [
      ["solide_ingerable","Solide ingérable"],["solide_autre","Solide autre"],
      ["pate_ingerable","Pâte ingérable"],["pate_autre","Pâte autre"],
      ["liquide_ingerable","Liquide ingérable"],["liquide_autre","Liquide autre"]
    ];
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
      ["typeObjet","sousType","taille","tailleInterieure","tailleAccroche","effets","stats","restaurations","unitesRestauration","ps","ph","places","emplacements","prerequis","tenueDeuxMains","tempsConsommation","conditionsEffets","proprietes"].forEach(function(k){if(modele[k]!==undefined)o[k]=JSON.parse(JSON.stringify(modele[k]));});
      ["arme","vet","sac","ceint","acc","contenant","contenu","cap","ep","froid","chaud","poches","prot_physique","res_physique"].forEach(function(k){if(modele[k]!==undefined)n[k]=JSON.parse(JSON.stringify(modele[k]));});
      combatTypes().forEach(function(t){["prot_","res_"].forEach(function(p){if(modele[p+t]!==undefined){n[p+t]=modele[p+t];o[p+t]=modele[p+t];}});});
      if(n.arme)o.arme=n.arme;
    }
    n.versionObjet=1;
    n.typeObjet=invType(o);if(!INV_TYPES_OBJETS[n.typeObjet])n.typeObjet="autre";
    n.sousType=n.typeObjet==="consommable"?invSousTypeConsommable(o):
      String(o.sousType || (o.sac?"sac":o.ceint?"ceint":o.vet?o.vet:o.acc?o.acc:o.arme?o.arme.type:n.typeObjet==="munition"?o.contenu:"autre"));
    if(/^(eclairage|couchage)$/.test(o.typeObjet))n.sousType="autre";
    // La catégorie technique du contenant EST son sous-type affiché.
    if(n.typeObjet==="contenant" && n.contenant)n.sousType=String(n.contenant);
    n.nourri=invEstIngerable(n);n.places=pnum(o.places);
    n.taille=INV_TAILLES.indexOf(o.taille)>=0?o.taille:modele&&modele.taille||"";
    var mainsBase=o.arme&&o.arme.mains;
    if(mainsBase==null && o.arme)armesData().forEach(function(d){if(d.cle===o.arme.type || !o.arme.type&&pli(d.nom)===pli(o.nom))mainsBase=d.mains;});
    // 1 : une main suffit ; 2 : deux mains pour l'utilisation, une pour le port ;
    // 2 obligatoires : occupation simultanée des deux mains.
    n.mains=o.mains==="2 obligatoires"?"2 obligatoires":num(o.mains,mainsBase===2?2:1)===2?2:1;
    n.tenueDeuxMains=(o.tenueDeuxMains===true || n.mains==="2 obligatoires") && (o.ou==="mainG" || o.ou==="mainD");
    if(n.arme)n.arme.mains=n.mains;
    n.emplacements=Math.max(0,Math.floor(num(o.emplacements,1)));
    n.prerequis={};["for","dex","vig","end","res","fer","int","cha"].forEach(function(k){n.prerequis[k]=pnum(o.prerequis&&o.prerequis[k]);});
    n.volume=pnum(o.volume===undefined?o.encombre:o.volume);n.encombre=n.volume;
    n.tailleInterieure=String(o.tailleInterieure||"");n.tailleAccroche=String(o.tailleAccroche || (n.sac?"Moyenne":""));
    n.effets=(Array.isArray(o.effets)?o.effets:[]).slice(0,8).map(String);
    n.restaurations={};n.unitesRestauration={};
    ["pv","pe","pm","pr","ps","ph","pi"].forEach(function(k){n.restaurations[k]=snum(o.restaurations&&o.restaurations[k]);n.unitesRestauration[k]=o.unitesRestauration&&o.unitesRestauration[k]==="% max"?"% max":"points";});
    n.ps=snum(o.ps);n.ph=snum(o.ph);n.tempsConsommation=pnum(o.tempsConsommation);
    n.conditionsEffets=o.conditionsEffets&&typeof o.conditionsEffets==="object"?JSON.parse(JSON.stringify(o.conditionsEffets)):{};
    n.stats=o.stats&&typeof o.stats==="object"?JSON.parse(JSON.stringify(o.stats)):{};
    // Le choix des huit lignes est purement visuel ; les effets conservent
    // leurs clés historiques, utilisées par les attaques et les défenses.
    n.effetsEquipement=Array.isArray(o.effetsEquipement)?o.effetsEquipement.slice(0,8).map(String):null;
    n.proprietes=o.proprietes&&typeof o.proprietes==="object"?JSON.parse(JSON.stringify(o.proprietes)):{};
    n.munitionStats=o.munitionStats&&typeof o.munitionStats==="object"?JSON.parse(JSON.stringify(o.munitionStats)):{degats:0,repartition:{physique:100}};
    ["prot","res"].forEach(function(k){n[k+"_physique"]=o[k+"_physique"]===undefined?(modele&&modele[k+"_physique"]!==undefined?snum(modele[k+"_physique"]):Math.max(snum(o[k+"_contondant"]),snum(o[k+"_perforant"]),snum(o[k+"_tranchant"]))):snum(o[k+"_physique"]);});
    if(n.arme){var rep=o.arme&&o.arme.repartition || modele&&modele.arme&&modele.arme.repartition || {physique:100};n.arme.repartition={};combatTypes().forEach(function(k){if(isFinite(Number(rep[k])))n.arme.repartition[k]=pnum(rep[k]);});if(!Object.keys(n.arme.repartition).length)n.arme.repartition={physique:100};n.arme.hits=Math.max(1,Math.floor(pnum(o.arme&&o.arme.hits)||1));["for","dex","vig","end","res","fer","int","cha"].forEach(function(k){n.arme[k]=pnum(o.arme&&o.arme[k]);});}
    if(n.typeObjet==="munition"){n.sousType={fleche:"fleches",carreau:"carreaux",balle:"balles",pierre:"pierres"}[n.sousType]||n.sousType;n.contenu=n.sousType;}
    return n;
  }
  function invChoix(label,values,current,change) {
    var s=el("select","pc-select pc-edit-field");values.forEach(function(v){var k=Array.isArray(v)?v[0]:v,t=Array.isArray(v)?v[1]:v;var op=el("option",null,t);op.value=k;op.selected=k===current;s.appendChild(op);});
    s.addEventListener("change",function(){change(s.value);save();refresh();});return fld(label,s);
  }
  // Toutes les propriétés chiffrées d'un vêtement passent par les mêmes
  // accès que l'ancien formulaire, afin que les calculs continuent à fonctionner.
  function invOptionsEquipement() {
    var out = [];
    combatTypes().forEach(function(k){out.push(["prot_"+k,"Protection "+combatLibType(k)+" (points)"]);});
    combatTypes().forEach(function(k){out.push(["res_"+k,"Résistance "+combatLibType(k)+" (%)"]);});
    out.push(["poches","Poches (L)"],["froid","Défense froid (°)"],["chaud","Défense chaud (°)"]);
    combatTypes().forEach(function(k){out.push(["degats:"+k,"Dégâts "+combatLibType(k)+" (%)"]);});
    out.push(["couts:pm","Coût PM (%)"],["couts:pe","Coût PE (%)"],
      ["vitesse","Déplacement (%)"],["innocence","Résistance corruption (%)"],
      ["alterations","Résistance altérations (%)"]);
    return out;
  }
  function invValeurEquipement(it,cle) {
    if (!cle) return 0;
    if (cle.indexOf("degats:")===0) return snum(it.stats&&it.stats.degats&&it.stats.degats[cle.slice(7)]);
    if (cle.indexOf("couts:")===0) return snum(it.stats&&it.stats.couts&&it.stats.couts[cle.slice(6)]);
    if (["vitesse","innocence","alterations"].indexOf(cle)>=0) return snum(it.stats&&it.stats[cle]);
    return snum(it[cle]);
  }
  function invPoseValeurEquipement(it,cle,val) {
    if (!cle) return;
    if (cle.indexOf("degats:")===0 || cle.indexOf("couts:")===0) {
      if (!it.stats || typeof it.stats!=="object") it.stats={};
      var nom=cle.split(":")[0], k=cle.split(":")[1];
      if(!it.stats[nom] || typeof it.stats[nom]!=="object") it.stats[nom]={};
      it.stats[nom][k]=val;
    } else if (["vitesse","innocence","alterations"].indexOf(cle)>=0) {
      if(!it.stats || typeof it.stats!=="object")it.stats={};
      it.stats[cle]=val;
    } else it[cle]=val;
  }
  function invLignesEquipement(it) {
    var liste=invOptionsEquipement().map(function(x){return x[0];});
    if(!Array.isArray(it.effetsEquipement))it.effetsEquipement=liste.filter(function(k){return invValeurEquipement(it,k)!==0;}).slice(0,8);
    var present={};
    it.effetsEquipement=Array.from({length:8},function(_,i){
      var k=it.effetsEquipement[i]||"";
      if(!k || liste.indexOf(k)<0 || present[k]) return "";
      present[k]=true;return k;
    });
    return it.effetsEquipement;
  }
  function invChampsVetement(host,it) {
    var choices=invOptionsEquipement(), lignes=invLignesEquipement(it);
    var carte=el("div","pc-obj-effets-equipement");
    for(var index=0;index<8;index++)(function(i){
      var ligne=el("div","pc-obj-pair pc-obj-effet-ligne");
      var montant=el("input","pc-edit-field");montant.type="text";montant.inputMode="decimal";
      champNombreSigne(montant);
      var select=el("select","pc-select pc-edit-field");
      var vide=el("option",null,"Aucun effet");vide.value="";select.appendChild(vide);
      choices.forEach(function(c){var opt=el("option",null,c[1]);opt.value=c[0];select.appendChild(opt);});
      function afficher(){var cle=lignes[i]||"";select.value=cle;montant.value=cle?fmtP(invValeurEquipement(it,cle)):"";montant.disabled=!cle;}
      select.addEventListener("change",function(){
        var ancien=lignes[i]||"",nouveau=select.value;
        if(nouveau && lignes.some(function(x,j){return j!==i&&x===nouveau;})){
          select.value=ancien;flash("Cet effet est déjà utilisé dans une autre ligne.");return;
        }
        if(ancien!==nouveau){invPoseValeurEquipement(it,ancien,0);lignes[i]=nouveau;it.effetsEquipement=lignes;}
        afficher();save();refresh();
      });
      montant.addEventListener("input",function(){
        var v=litNombreSigne(montant.value);
        if(isFinite(v) && lignes[i]){invPoseValeurEquipement(it,lignes[i],v);save();refresh();}
      });
      ligne.appendChild(fld("Valeur",montant));
      ligne.appendChild(fld("Type d’effet",select));
      carte.appendChild(ligne);
      afficher();
    })(index);
    host.appendChild(carte);
    // Les anciennes sauvegardes peuvent avoir davantage de huit valeurs.
    // Ne jamais les supprimer silencieusement : elles restent actives.
    var caches=choices.filter(function(c){return invValeurEquipement(it,c[0])!==0 && lignes.indexOf(c[0])<0;});
    if(caches.length){var a=el("div","pc-obj-effets-anciens");a.appendChild(el("small",null,
      caches.length+" effet(s) historique(s) hors des huit lignes, toujours actifs : "+caches.map(function(c){return c[1]+" "+fmtP(invValeurEquipement(it,c[0]));}).join(" ; ")));host.appendChild(a);}
  }
  // Un seul tableau de prérequis pour les vêtements et les accessoires.
  // Les valeurs restent en données, même si les règles d'équipement évoluent.
  function invChampsPrerequis(host,it) {
    if(!it.prerequis || typeof it.prerequis!=="object")it.prerequis={};
    var grille=el("div","pc-obj-pre-requis");
    [["for","FOR"],["dex","DEX"],["vig","VIG"],["end","END"],
     ["res","RES"],["fer","FER"],["int","INT"],["cha","CHA"]].forEach(function(x){
      var n=el("input","pc-edit-field");n.type="text";n.inputMode="numeric";
      n.value=fmtP(pnum(it.prerequis[x[0]]));n.addEventListener("input",function(){
        var v=litNombreSigne(n.value);if(isFinite(v) && v>=0){it.prerequis[x[0]]=v;save();}
      });
      grille.appendChild(fld("PRÉ. "+x[1],n));
    });
    host.appendChild(grille);
  }
  function invAvecEffets(it) {return invType(it)==="consommable" && /^(solide|pate|liquide)_(ingerable|autre)$/.test(it.sousType||"");}
  function invChampsCommuns(body,it,render) {
    if(invAvecEffets(it)){
      body.appendChild(el("div","lbl","Effets"));var card=el("div","pc-arme pc-obj-effets-grid");
      if(!Array.isArray(it.effets))it.effets=[];
      for(var i=0;i<8;i++)(function(index){card.appendChild(fld("Effet "+(index+1),selectEffet(it.effets[index]||"",function(v){it.effets[index]=v;save();refresh();})));})(i);
      body.appendChild(card);
    }
    if(it.proprietes && Object.keys(it.proprietes).some(function(k){return it.proprietes[k]!=null;})){
      var props=el("div","pc-arme");Object.keys(it.proprietes).forEach(function(k){if(it.proprietes[k]==null)return;var i=el("input","pc-edit-field");i.type="text";i.value=it.proprietes[k];i.addEventListener("input",function(){it.proprietes[k]=i.value;save();});props.appendChild(fld({autonomie:"Autonomie",accrochable:"Accrochable",recharge:"Recharge"}[k]||k,i));});body.appendChild(props);
    }
    if(invType(it)==="munition"){
      if(!it.munitionStats)it.munitionStats={degats:0,repartition:{physique:100}};
      var mun=el("div","pc-arme");mun.appendChild(champArme("Dégâts supplémentaires",it.munitionStats,"degats"));
      if(!it.munitionStats.repartition)it.munitionStats.repartition={physique:100};
      combatTypes().forEach(function(k){mun.appendChild(champArme(combatLibType(k)+" (%)",it.munitionStats.repartition,k));});body.appendChild(mun);
    }
    if(invAvecEffets(it)){
      var rs=el("div","pc-arme pc-obj-restauration");
      if(!it.restaurations)it.restaurations={};if(!it.unitesRestauration)it.unitesRestauration={};
      ["pv","pe","pm","pr","ps","ph","pi"].forEach(function(k){
        var line=el("div","pc-obj-pair"),n=el("input","pc-edit-field");champNombreSigne(n);n.value=snum(it.restaurations[k]);n.setAttribute("aria-label","Restauration "+k.toUpperCase());
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
    var ingere=invEstIngerable(it),avant={};
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
      var v=snum(it.restaurations&&it.restaurations[k]);
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
