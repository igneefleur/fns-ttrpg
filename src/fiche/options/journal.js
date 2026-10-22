  // Lecture des opérations existantes : ouvrir, chercher et paginer n'écrit
  // rien sur la fiche et ne produit donc jamais de logs récursifs.
  var journalVue = {query:"", page:0, ouverts:{}};
  var JOURNAL_LIBELLES = {
    name:"Nom", age:"Âge", espece:"Espèce", genre:"Genre", sexe:"Sexe", taille:"Taille", portrait:"Portrait", background:"Bio",
    caracs:"Caractéristiques", caracsXp:"XP des caractéristiques", xpTotal:"XP", etat:"Réserves", pv:"PV", pe:"PE", pm:"PM", ps:"PS", pr:"PR", ph:"PH", pi:"PI", pc:"PC",
    comps:"Compétences", techniques:"Techniques", notes:"Notes", messages:"Messages", text:"Texte", mode:"Format", at:"Date", format:"Format",
    inv:"Inventaire", objets:"Objets", nom:"Nom", qte:"Quantité", ou:"Emplacement", dans:"Contenant", emp:"Accroche", rang:"Rang", groupe:"Groupe", ordre:"Ordre", order:"Ordre",
    attaques:"Attaques", defenses:"Défenses", avantages:"Avantages", modules:"Disposition des modules", modActifs:"Modules actifs", mods:"Mods", modData:"Données des modules",
    effort:"Effort", horloge:"Horloge", horlogeDigestion:"Digestion", horlogeExposition:"Exposition", horlogeAlcool:"Alcool", temperature:"Température", qualiteSommeil:"Qualité du sommeil",
    effetsActifs:"Effets actifs", effetsPermanents:"Effets permanents", effParties:"Effondrement", effDesactive:"Désactiver Effondrement", allure:"Allure", allureCran:"Vitesse",
    capsLeviers:"Réglages des capacités", caracsLeviers:"Réglages des caractéristiques", compsLeviers:"Réglages des compétences", combatOptions:"Options de combat", impregnation:"Imprégnation", combatModifiers:"Modificateurs de combat", combatAffichage:"Affichage de combat",
    desTailles:"Dés d’action", desUtilises:"Dés utilisés", v:"Format de fiche", rel:"Version", de:"Jets"
  };
  function journalLib(k) { return JOURNAL_LIBELLES[k] || String(k).replace(/([a-z])([A-Z])/g,"$1 $2").replace(/_/g," "); }
  function journalValeur(n) {
    if(!n) return "Absent";
    if(n[0]==="d") return "Supprimé";
    if(n[0]==="o") return "Objet";
    if(n[0]==="l") return "Liste";
    if(n[0]==="i") return "Liste de "+n[1]+" éléments";
    return typeof n[1]==="string" ? n[1] : JSON.stringify(n[1]);
  }
  function journalChemin(c, op) {
    var p;try{p=JSON.parse(c.k);}catch(e){return "Champ inconnu";}
    return p.map(function(seg,i){
      if(seg[0]==="e") {
        var name=(op.labels||{})[seg[1]];
        if(!name) {var source=p[0][1]==="inv" ? state.inv.objets : state[p[0][1]];
          if(Array.isArray(source)){var item=source.filter(function(x){return x&&(x.id===seg[1]||x.ref===seg[1]);})[0];if(item)name=item.nom||item.name||item.text;}}
        return name ? String(name).slice(0,100) : "Élément "+seg[1];
      }
      return seg[0]==="order" ? "Ordre" : seg[0]==="index" ? "Emplacement "+(Number(seg[1])+1) : journalLib(seg[1]);
    }).join(" · ");
  }
  function buildJournal() {
    var b=block("Journal"), search=el("input","pc-input"), info=el("div","pc-journal-info"), list=el("div","pc-journal-list"), pages=el("div","pc-journal-pages");
    search.type="search";search.placeholder="Rechercher un changement ou un joueur…";search.setAttribute("aria-label","Rechercher dans le journal");search.value=journalVue.query;
    b.appendChild(search);b.appendChild(info);b.appendChild(list);b.appendChild(pages);
    var previous="",dead=false,timer=null;
    function render(force) {
      if(dead || (!force && (window.__owdViewVisible===false||!b.getClientRects().length)))return;
      if(typeof window.__owdJournal!=="function") {info.textContent="Le journal des changements est disponible dans Roll20.";return;}
      var data=window.__owdJournal(), rows=data.ops.filter(function(op){return op.changes&&op.changes.length;});
      var signature=rows.map(function(op){return op.id;}).join("|")+"/"+Object.keys(data.pending).join("|")+"/"+data.conflicts.length+"/"+data.identity;
      if(!force&&signature===previous)return;previous=signature;
      var conflicts={};data.conflicts.forEach(function(c){conflicts[c.id]=true;});
      rows.sort(function(a,b){return b.clock-a.clock || (a.id<b.id?1:-1);});
      function payloadText(op){return Object.keys(op.creates||{}).map(function(ref){var value=data.payload&&data.payload(op.creates[ref].attribute);return value?JSON.stringify(value):"";}).join(" ");}
      var query=journalVue.query.toLocaleLowerCase("fr");
      if(query)rows=rows.filter(function(op){return ((op.actor&&op.actor.name||"")+" "+payloadText(op)+" "+op.changes.map(function(c){return journalChemin(c,op)+" "+journalValeur(c.before)+" "+journalValeur(c.n);}).join(" ")).toLocaleLowerCase("fr").indexOf(query)>=0;});
      var max=Math.max(0,Math.ceil(rows.length/50)-1);journalVue.page=Math.min(max,journalVue.page);
      list.textContent="";pages.textContent="";
      info.textContent=rows.length+" changement"+(rows.length===1?"":"s")+(data.identity?"":" · Auteur non identifié avec ce pont Roll20");
      if(!rows.length)list.appendChild(el("div","pc-empty",query?"Aucun changement trouvé.":"Aucun changement enregistré."));
      rows.slice(journalVue.page*50,(journalVue.page+1)*50).forEach(function(op){
        var row=el("details","pc-journal-entry"),summary=el("summary"),head=el("div","pc-journal-head"),time=el("time"),date=new Date(op.at);
        row.dataset.id=op.id;
        if(op.at>0&&isFinite(date.getTime())){time.dateTime=date.toISOString();time.textContent=date.toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"medium"});}else time.textContent="Date non enregistrée";
        head.appendChild(time);
        head.appendChild(el("strong",null,op.actor&&op.actor.name ? op.actor.name : /^token(?:-max)?:/.test(op.id)?"Token · joueur non identifié":"Joueur non identifié"));
        if(conflicts[op.id])head.appendChild(el("span","pc-journal-status","Conflit détecté"));
        else if(data.pending[op.id])head.appendChild(el("span","pc-journal-status","En attente de sauvegarde"));
        summary.appendChild(head);
        var groups=[];op.changes.forEach(function(c){var path;try{path=JSON.parse(c.k);var name=path.length?journalLib(path[0][1]):"Fiche";if(groups.indexOf(name)<0)groups.push(name);}catch(e){}});
        summary.appendChild(el("div","pc-journal-summary",groups.join(" · ")+" ("+op.changes.length+")"));row.appendChild(summary);
        var content=el("div","pc-journal-details"),loaded=false;row.appendChild(content);
        function detail(){if(loaded)return;loaded=true;op.changes.forEach(function(c){var line=el("div","pc-journal-change");line.appendChild(el("strong",null,journalChemin(c,op)));
          line.appendChild(el("pre",null,journalValeur(c.before)+" → "+journalValeur(c.n)));
          if(c.delta!==undefined)line.appendChild(el("small",null,"Variation : "+(c.delta>0?"+":"")+c.delta));content.appendChild(line);});
          [op.creates||{},op.modules||{}].forEach(function(map){Object.keys(map).forEach(function(id){var value=data.payload&&data.payload(map[id].attribute);if(value){var line=el("div","pc-journal-change");line.appendChild(el("strong",null,"Création · "+((op.labels||{})[id]||id)));line.appendChild(el("pre",null,JSON.stringify(value,null,2)));content.appendChild(line);}});});}
        row.open=!!journalVue.ouverts[op.id];if(row.open)detail();
        row.addEventListener("toggle",function(){journalVue.ouverts[op.id]=row.open;if(row.open)detail();});list.appendChild(row);
      });
      function page(text,step,disabled){var button=miniBtn(text,null,function(){journalVue.page+=step;render(true);});button.disabled=disabled;pages.appendChild(button);}
      page("Plus récents",-1,journalVue.page===0);pages.appendChild(el("span",null,(journalVue.page+1)+" / "+(max+1)));page("Plus anciens",1,journalVue.page===max);
    }
    search.addEventListener("input",function(){journalVue.query=search.value;journalVue.page=0;clearTimeout(timer);timer=setTimeout(function(){render(true);},150);});
    var poll=setInterval(function(){render(false);},1000);
    remontageNettoyage.push(function(){dead=true;clearInterval(poll);clearTimeout(timer);});
    hooks.push(function(){render(false);});render(true);return b;
  }
