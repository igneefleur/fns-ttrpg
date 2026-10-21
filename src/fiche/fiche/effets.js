  // Les définitions et les propriétés des objets sont celles de la Boutique.
  function effetsDefinitions() { return D().effets || []; }
  var effetsCacheListe=null,effetsCache={};
  function effetDefinition(id) { var liste=effetsDefinitions();if(liste!==effetsCacheListe){effetsCacheListe=liste;effetsCache=Object.create(null);liste.forEach(function(d){effetsCache[d.id]=d;});}return effetsCache[id] || null; }
  function effetsNormalise(s) {
    var ids = {};
    s.effetsActifs = (Array.isArray(s.effetsActifs) ? s.effetsActifs : []).filter(function (e) { return e && typeof e === "object" && e.effet; }).map(function (e) {
      var id = String(e.id || uid("eff")); if (ids[id]) id = uid("eff"); ids[id] = true;
      return { categorie: e.categorie === "digestive" ? "digestive" : "speciale", id: id, effet: String(e.effet), source: String(e.source || ""), cible: String(e.cible || ""),
        actif: e.actif !== false, reste: e.reste == null ? null : Math.max(0, num(e.reste, 0)),
        duree: e.duree == null ? null : Math.max(0, num(e.duree, 0)), suivi: Math.max(0, num(e.suivi, 0)),
        niveau: clamp(Math.floor(num(e.niveau, 1)), 1, 4) };
    }).filter(function (e) { return e.reste === null || e.reste > 0; });
    var alcool = 0, progression = 0;
    s.effetsActifs = s.effetsActifs.filter(function (e) {
      var d = effetDefinition(e.effet); if (!d || !d.ops.alcool || !e.actif) return true;
      alcool += Math.max(0, num(d.ops.alcool, 0));
      progression = Math.max(progression, Math.max(0, num(e.duree, 7200) - num(e.reste, 7200)));
      return false;
    });
    if (alcool) {
      s.effAlcool = num(s.effAlcool, 0) + alcool;
      if (!horlogeVersSecondes(s.horlogeAlcool)) {
        progression %= alcoolCadenceSecondes();
        s.horlogeAlcool = {jours:0, heures:Math.floor(progression / 3600), minutes:Math.floor(progression % 3600 / 60), secondes:progression % 60};
      }
    }
    // Les anciennes récupérations alimentaires et de potion viennent du catalogue.
    s.effetsActifs.forEach(function (e) {
      if ((D().equipements || []).concat(D().consommables || []).some(function (o) { return o.nom === e.source && (o.effets || []).indexOf(e.effet) >= 0 && invEstIngerable(o); })) e.categorie = "digestive";
    });
    if (!s.effetsPermanents || typeof s.effetsPermanents !== "object" || Array.isArray(s.effetsPermanents)) s.effetsPermanents = {};
  }
  function effetsSources() {
    var out = [];
    (state.effetsActifs || []).forEach(function (e) {
      var d = effetDefinition(e.effet);
      if (d && e.actif && (e.reste === null || e.reste > 0)) out.push({ e: e, d: d });
    });
    // Les bonus d'équipement sont dérivés : aucune copie temporaire à sauvegarder.
    (state.inv && state.inv.objets || []).forEach(function (o) {
      // Les effets des consommables sont activés par leur consommation, jamais par leur port.
      if (invType(o) === "consommable") return;
      if (o.dans || pnum(o.qte)!==1 || !(o.ou === "mainG" || o.ou === "mainD" || (o.vet || o.acc || o.sac || o.ceint) && casePermise(o,o.ou) && casesDe(o).length)) return;
      (o.effets || []).forEach(function (id) { var d = effetDefinition(id); if (d) out.push({e:{niveau:1,cible:o.arme ? o.ref : "",equipement:o.ref,source:o.nom}, d:d}); });
    });
    // Même famille portée plusieurs fois : le rang le plus élevé gagne.
    var families = {};
    return out.filter(function (x) {
      if (x.d.ops.alerte || x.d.ops.alcool) return true;
      var key = x.d.famille + "|" + (x.e.cible || "");
      var best = out.filter(function (y) { return y.d.famille + "|" + (y.e.cible || "") === key; }).sort(function (a,b) { return num(b.d.rang,0)-num(a.d.rang,0); })[0];
      if (families[key] || best !== x) return false; families[key] = true; return true;
    });
  }
  function effetBonus(cle, type, cible) {
    var n = 0;
    equipementsBonus().forEach(function(o){var v=o.stats&&o.stats[cle];if(type!==undefined)v=v&&v[type];n+=num(v,0);});
    effetsSources().forEach(function (x) {
      if (x.e.cible && x.e.cible !== cible) return;
      var v = x.d.ops[cle]; if (type !== undefined) v = v && v[type]; n += num(v,0);
    });
    return n;
  }
  function effetAlerte() {
    return (state.effetsActifs || []).reduce(function (n,e) { var d=effetDefinition(e.effet); return d && d.ops.alerte && e.actif && (e.reste===null || e.reste>0) ? Math.max(n,e.niveau) : n; },0);
  }
  function effetConsommation(res) { return Math.max(0, 100 + effetBonus("couts",res) + (res === "pm" ? effSpecifiques().mana : 0)); }
  function effetCout(res, valeur) { return Math.max(0, Math.floor(Math.max(0, Number(valeur) || 0) * effetConsommation(res) / 100 + 1e-9)); }
  function effetPerteInnocence(delta) { return delta < 0 ? -Math.ceil(-delta * Math.max(0,1 - effetBonus("innocence")/100) - 1e-9) : delta; }
  function retireEffet(id) { state.effetsActifs = state.effetsActifs.filter(function (e) { return e.id !== id; }); }
  function effetCoupRecu() {
    state.effetsActifs = state.effetsActifs.filter(function (e) {
      var d=effetDefinition(e.effet); if (!d || !d.ops.alerte || !e.actif) return true;
      e.niveau--; return e.niveau > 0;
    });
  }
  function effetFinTour() {
    if (!(effetBonus("finTour") > 0)) return;
    for (var i=0;i<desAction();i++) if (state.desUtilises[i]) { delete state.desUtilises[i]; break; }
  }
  function appliqueEffet(id, source, cible, duree, categorie) {
    var d=effetDefinition(id); if (!d) return false;
    var op=d.ops || {}, actifs=state.effetsActifs;
    if (op.alcool) { state.effAlcool = Math.max(0, num(state.effAlcool, 0)) + Math.max(0, num(op.alcool, 0)); return true; }
    if (op.permanent) {
      if (!state.effetsPermanents[id]) {
        Object.keys(op.permanent).forEach(function(k){ if(state.etat[k]==null)state.etat[k]=maxDe(k); });
        state.effetsPermanents[id]=true;
      }
      return true;
    }
    if (op.supprime || op.panacee) {
      state.effetsActifs = actifs.filter(function(e){
        var def=effetDefinition(e.effet);
        return !(def && (op.panacee ? def.negatif && def.dissipable : op.supprime.indexOf(def.famille)>=0 || op.supprime.indexOf(def.id)>=0));
      }); return true;
    }
    if (op.impregnation && !(cible && defenseArme(cible))) return false;
    var meme=actifs.filter(function(e){var def=effetDefinition(e.effet);return def && def.famille===d.famille && (e.cible||"")===(cible||"");})[0];
    var seconds=duree === undefined ? d.duree : duree;
    if (op.alerte) {
      if (!meme) { meme={id:uid("eff"),effet:id,cible:"",niveau:0};actifs.push(meme); }
      meme.niveau=clamp(num(meme.niveau,0)+op.alerte,1,4);seconds=60;
    } else if (meme && !op.alcool) {
      var previous=effetDefinition(meme.effet);if(previous && num(previous.rang,0)>num(d.rang,0))return true;
    } else { meme={id:uid("eff"),niveau:1};actifs.push(meme); }
    meme.categorie=categorie === "digestive" ? "digestive" : "speciale";meme.effet=id;meme.source=String(source||"");meme.cible=String(cible||"");meme.actif=true;
    meme.reste=seconds;meme.duree=seconds;meme.suivi=0;return true;
  }
  function effetsAvance(secondes) {
    var efficaces=Object.create(null);effetsSources().forEach(function(x){if(x.e.id)efficaces[x.e.id]=true;});
    (state.effetsActifs || []).forEach(function(e){
      if(!e.actif)return;
      var d=effetDefinition(e.effet),r=d && efficaces[e.id] && d.ops.regen,sec=e.reste===null?secondes:Math.min(secondes,e.reste);
      if(r && sec>0) {
        if(courant(r.reserve)>=maxDe(r.reserve))e.suivi=0;
        else {e.suivi+=sec;var ticks=Math.floor((e.suivi+1e-9)/r.cadence);e.suivi-=ticks*r.cadence;if(ticks)bougeReserve(r.reserve,ticks*r.points);}
      }
      if(e.reste!==null)e.reste=Math.max(0,e.reste-secondes);
    });
    state.effetsActifs=state.effetsActifs.filter(function(e){return e.reste===null || e.reste>0;});
  }
  function effetTemps(secondes) {
    if(secondes===null)return "—";
    secondes=Math.max(0,Math.ceil(secondes));var j=Math.floor(secondes/86400),h=Math.floor(secondes%86400/3600),m=Math.floor(secondes%3600/60),s=secondes%60;
    return [j?j+" j":"",h?h+" h":"",m?m+" min":"",s?s+" s":""].filter(Boolean).join(" ") || "0 s";
  }
  function selectEffet(value, change) {
    var s=el("select","pc-select pc-edit-field"),empty=el("option",null,"Aucun");empty.value="";s.appendChild(empty);
    effetsDefinitions().forEach(function(d){var o=el("option",null,d.nom);o.value=d.id;o.selected=d.id===value;s.appendChild(o);});
    if(value && !effetDefinition(value)){var o=el("option",null,value+" (inconnu)");o.value=value;o.selected=true;s.appendChild(o);}
    s.addEventListener("change",function(){change(s.value);});return s;
  }
  function buildEffets() {
    var b=block("Effets",null,"effets"),box=el("div","pc-effets-liste");b.appendChild(box);
    var add=miniBtn("+ Ajouter un effet",null,function(){
      var body=el("div","pc-modal-body"),id="",temps=el("input","pc-edit-field"),armes=el("select","pc-select");
      temps.type="text";temps.inputMode="decimal";temps.placeholder="Durée du référentiel";
      var select=selectEffet("",function(v){id=v;var d=effetDefinition(id);temps.placeholder=d?d.dureeTexte:"Durée du référentiel";});
      body.appendChild(fld("Effet",select));body.appendChild(fld("Durée en minutes (facultatif)",temps));
      var none=el("option",null,"Personnage");none.value="";armes.appendChild(none);
      state.inv.objets.filter(function(o){return o.arme;}).forEach(function(o){var p=el("option",null,o.nom||"Arme");p.value=o.ref;armes.appendChild(p);});
      body.appendChild(fld("Cible",armes));
      dialogue("Ajouter un effet",body,function(){
        if(!id)return false;
        var n=temps.value.trim()?litNombreSigne(temps.value):null;if(n!==null && (!isFinite(n)||n<=0))return false;
        if(!appliqueEffet(id,"Manuel",armes.value,n===null?undefined:n*60)){flash("Choisissez l’arme à imprégner.");return false;}refresh();
      },"Appliquer");
    });b.appendChild(add);
    var cost=el("div","pc-obj-pair"),n=el("input","pc-num");champNombreSigne(n);n.placeholder="Coût de base";n.setAttribute("aria-label","Coût en ressource avant effets");cost.appendChild(n);
    var cs=el("div","pc-segs");["pm","pe"].forEach(function(k){cs.appendChild(miniBtn("Consommer "+k.toUpperCase(),null,function(){var v=litNombreSigne(n.value);if(!isFinite(v)||v<0)return;bougeReserve(k,-effetCout(k,v));n.value="";refresh();}));});cost.appendChild(cs);b.appendChild(cost);
    var sig="";
    hooks.push(function(){
      var passifs=effetsSources().filter(function(x){return x.e.equipement;});
      var now=JSON.stringify([state.effetsActifs,state.effetsPermanents,effetAlerte(),passifs]);if(now===sig)return;sig=now;box.innerHTML="";
      (state.effetsActifs||[]).forEach(function(e){
        var d=effetDefinition(e.effet),row=el("div","pc-effet-row");row.dataset.syncEntity=e.id;
        var head=el("div","pc-effet-head"),name=el("span","pc-effet-nom",d&&d.ops.alerte?"Alerte — "+e.niveau:(d?d.nom:e.effet));head.appendChild(name);
        head.appendChild(el("span","pc-effet-temps",effetTemps(e.reste)));row.appendChild(head);
        var texte=d?d.description:"Effet inconnu : gestion manuelle.";
        if(d&&d.ops.alerte)texte="−"+e.niveau+" difficulté d’Esquive ; −"+(5*e.niveau)+" % de résistance aux dégâts. Un coup reçu retire un niveau.";
        var desc=el("div","pc-effet-desc",texte);row.appendChild(desc);
        if(d&&d.manuel)row.appendChild(el("small","pc-effet-manuel","Conséquences manuelles"));
        var actions=el("div","pc-segs");actions.appendChild(miniBtn(e.actif?"Pauser":"Reprendre",null,function(){e.actif=!e.actif;if(d && d.ops.alcool && e.actif)effetsNormalise(state);refresh();}));
        if(d&&d.ops.alerte)actions.appendChild(miniBtn("Coup reçu", "Retirer un niveau d’Alerte",function(){effetCoupRecu();refresh();}));
        actions.appendChild(miniBtn("Retirer",null,function(){retireEffet(e.id);refresh();}));row.appendChild(actions);box.appendChild(row);
      });
      passifs.forEach(function(x){var row=el("div","pc-effet-row"),head=el("div","pc-effet-head");head.appendChild(el("span","pc-effet-nom",x.d.nom));head.appendChild(el("span","pc-effet-temps","Équipé"));row.appendChild(head);row.appendChild(el("div","pc-effet-desc",x.d.description));row.title=x.e.source;box.appendChild(row);});
      Object.keys(state.effetsPermanents||{}).forEach(function(id){if(state.effetsPermanents[id])box.appendChild(el("div","pc-effet-row",id+" — Permanent"));});
      if(!box.childNodes.length)box.appendChild(el("div","pc-empty","Aucun effet actif."));
    });return b;
  }
