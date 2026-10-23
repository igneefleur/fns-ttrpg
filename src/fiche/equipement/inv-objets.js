  // ---- 14. Inventaire (pleine largeur) ----
  // QUATRE GROUPES FIXES, et rien d'autre dans l'onglet Équipement :
  //
  //   SUR SOI     [main gauche] [main droite]  ·  [ceinture] [sac à dos]
  //               [tête] [haut] [mains] [bas] [pieds]        ← les cinq VÊTEMENTS
  //               [boucles d'oreilles] [collier] [sous-vêtement] [poignet G] [poignet D]
  //               [bague G] [bague D] [cheville G] [cheville D] [cape]
  //   CEINTURE    les emplacements (ep) de la ceinture portée
  //   POCHES      ce que les vêtements et accessoires portés laissent emporter (en L)
  //   SAC À DOS   les emplacements du sac porté, PUIS ce qu'il contient (en L)
  //
  // Les cases de Sur soi sont TOUJOURS là, vides ou pleines ; chacune ne prend
  // que ce qui s'y porte. Un EMPLACEMENT tient un seul exemplaire, jusqu'à
  // l'encombrance au plus de sa ceinture ou de son sac, et ne compte dans
  // aucune capacité ; ils se montrent tous, même vides, avant tout le reste et
  // sur leurs propres lignes. Poches et sac se remplissent de tuiles, cinq par
  // ligne au plus.
  // Le détail de l'objet choisi occupe la colonne de droite : c'est là qu'on
  // dit ce qu'est un objet (vêtement, sac à dos, arme) et où il se trouve.
  //
  // Les images importées d'un fichier sont réduites en vignette pour tenir dans
  // la fiche (et dans les Attributes Roll20) ; préférer une URL quand c'est
  // possible.
  var INV_NOMS = {
    mainG: "Main gauche", mainD: "Main droite", deuxMains: "2 Mains", ceinture: "Ceinture", dos: "Sac à dos",
    tete: "Tête", mains: "Mains", haut: "Haut", bas: "Bas", pieds: "Pieds",
    sousvet: "Sous-vêtement", hautbas: "Robe",
    oreilles: "Boucles d'oreilles", collier: "Collier",
    poignetG: "Poignet gauche", poignetD: "Poignet droit",
    bagueG: "Bague gauche", bagueD: "Bague droite",
    chevilleG: "Cheville gauche", chevilleD: "Cheville droite", cape: "Cape",
    poignet: "Poignet", bague: "Bague", cheville: "Cheville",
    ceint: "Ceinture", sacep: "Sac à dos", poches: "Poches", sac: "Sac à dos", terre: "Par terre"
  };
  // le nom d'une case vide coupé à la main : les deux côtés d'une paire se
  // coupent au même endroit, jamais l'un seul parce que l'autre tient
  var CASE_LIGNES = {
    poignetG: "Poignet\ngauche", poignetD: "Poignet\ndroit",
    chevilleG: "Cheville\ngauche", chevilleD: "Cheville\ndroite"
  };
  // Les poches n'acceptent que Minuscule / Très petite. Le sol n'a aucune limite.
  function lieuPermis(o, ou) {
    if (ou === "terre" || ou === "sac") return true;
    if (ou === "poches") return window.OwdInventoryData.pocketFits(o);
    return casePermise(o, ou);
  }
  function champsObjet(it, q) {
    var bagWeight = it.sac ? window.OwdInventoryData.weight(state.inv.objets,it) * (pnum(it.qte)>0 ? pnum(q)/pnum(it.qte) : 0) : null;
    var fields = [["Quantité", fmtP(q)], ["Poids", fmtP(it.poids || 0) + (q > 1 ? " (total " + fmtP(q * (it.poids || 0)) + ")" : "")],
      ["Volume", it.encombre===null?"Non renseigné":fmtP(it.encombre || 0) + " L"],
      ["Achat", prixObjetTexte(it,false)], ["Vente", prixObjetTexte(it,true)]];
    function add(k,v){if(v!=null && String(v).trim()!=="")fields.push([k,String(v)]);}
    if(it.arme){var a=it.arme;add("Type",a.type || "Arme");add("Attaque",a.attaque);add("Dégâts",a.degats);
      add("Mods dégâts",(a.modsDegats||[]).filter(Boolean).join(" · "));add("Parade",a.parade);add("Réduction",a.reduction);
      add("Mods parade",(a.modsParade||[]).filter(Boolean).join(" · "));
      var comp=(state.comps||[]).filter(function(c){return c.id===a.comp;})[0];if(comp)add("Compétence",comp.nom);
    } else if(it.vet)add("Type",INV_NOMS[it.vet] || it.vet);
    else if(it.acc)add("Type",INV_NOMS[it.acc] || it.acc);
    else if(it.sac)add("Type","Sac à dos");else if(it.ceint)add("Type","Ceinture");
    if(it.contenant)add("Contenant",it.contenant);if(it.contenu)add("Contenu",it.contenu);
    add("Type",INV_TYPES_OBJETS[invType(it)]);add("Sous-type",it.sousType);add("Taille",it.taille);add("Mains",it.mains || it.arme&&it.arme.mains || 1);
    if(it.nourri){add("Contenance",it.places===null?"Non renseignée":fmtP(it.places || 0));add("PS",it.ps===null?"Non renseigné":fmtP(it.ps||0));add("PH",it.ph===null?"Non renseigné":fmtP(it.ph||0));}
    (it.effets||[]).filter(Boolean).forEach(function(id,i){add("Effet "+(i+1),id);});
    Object.keys(it.restaurations||{}).forEach(function(k){if(it.restaurations[k])add("Restauration "+k.toUpperCase(),fmtP(it.restaurations[k])+" "+(it.unitesRestauration[k]||"points"));});
    if(it.contenant)add("Emplacements",String(it.emplacements==null?1:it.emplacements));if(it.cap)add("Capacité",fmtP(it.cap)+" L");if(it.ep)add("Accroches",fmtP(it.ep)+" acc (max. "+(it.tailleAccroche || "non renseignée")+")");
    if(it.poches)add("Poches",fmtP(it.poches)+" L");if(it.froid)add("Protection froid",fmtP(it.froid));if(it.chaud)add("Protection chaleur",fmtP(it.chaud));
    ["physique","tranchant","contondant","perforant","feu","froid","eclair","decomposition","ethere","brut"].forEach(function(t){
      var labels={eclair:"éclair",decomposition:"décomposition",ethere:"éthéré"},label=labels[t]||t;
      if(it["res_"+t])add("Résistance "+label,fmtP(it["res_"+t])+" %");if(it["prot_"+t])add("Protection "+label,fmtP(it["prot_"+t]));
    });
    var stats=it.stats||{};
    ["degats","protections","resistances"].forEach(function(k){Object.keys(stats[k]||{}).forEach(function(t){if(stats[k][t])add(({degats:"Bonus dégâts ",protections:"Protection passive ",resistances:"Résistance passive "})[k]+combatLibType(t),fmtP(stats[k][t])+(k==="protections"?"":" %"));});});
    Object.keys(stats.couts||{}).forEach(function(k){if(stats.couts[k])add("Coût "+k.toUpperCase(),fmtP(stats.couts[k])+" %");});
    [["vitesse","Vitesse"],["innocence","Résistance corruption"],["alterations","Résistance altérations"]].forEach(function(x){if(stats[x[0]])add(x[1],fmtP(stats[x[0]])+(x[0]==="vitesse"?"":" %"));});
    if(it.sac||it.ceint){add("Accroches",it.ep);add("Taille maximale aux accroches",it.tailleAccroche);}
    if(it.sac||it.contenant)add("Capacité (L)",it.cap);
    (it.reglesManuelles||[]).forEach(function(rule){add("Propriété — gestion manuelle",rule);});
    if(bagWeight!==null)add("Poids avec contenu",fmtP(bagWeight)+" kg");
    if(it.rapide)add("Accès rapide","Oui");add("",it.desc);return fields;
  }
  function montreObjet(ref, qte) {
    var it = state && state.inv && state.inv.objets.filter(function (o) { return o.ref === ref; })[0];
    if (it) {var q=qte==null?it.qte:Math.min(pnum(qte),it.qte);if(!q)return;
      sayChat("OWD Item Show", [["Objet",it.nom || "objet"]].concat(champsObjet(it,q),
        [["Montrer","[Montrer](/owd_item_show "+packObjet(it,q)+")"]]));}
  }
  function actionObjet(ref, action) {
    function objet() { return state.inv.objets.filter(function (o) { return o.ref === ref; })[0]; }
    var it = objet(); if (!it) return;
    if (action === "montrer") { montreObjet(ref); return; }
    if (action === "donner") { donnerDialogue(it, it.qte); return; }
    if (action !== "supprimer") return;
    confirmer("Détruire un objet", "Détruire « " + (it.nom || "cet objet") + " » de l'inventaire" + (it.sac ? " avec tout son contenu" : "") + " ?", "Détruire", function () {
      var actuel = objet(); if (!actuel) return;
      window.OwdInventoryData.isolateAncestors(state.inv.objets,actuel);
      if(actuel.sac){var refs=window.OwdInventoryData.group(state.inv,actuel.ref).map(function(o){return o.ref;});
        for(var z=state.inv.objets.length-1;z>=0;z--)if(state.inv.objets[z]!==actuel&&refs.indexOf(state.inv.objets[z].ref)>=0)state.inv.objets.splice(z,1);}
      if (actuel.contenant) state.inv.objets.forEach(function (o) {
        if (String(o.dans || "") === String(ref)) { o.qte=Math.round(pnum(o.qte)*pnum(actuel.qte)*100)/100; o.dans = ""; o.ou = actuel.ou === "terre" ? "terre" : "sac"; o.emp = -1; }
      });
      state.inv.objets.splice(state.inv.objets.indexOf(actuel), 1);
      refresh(); if (invRender) invRender();
    });
  }
  var invSelectionLocale = "", invEditionObjetLocale = "";
  function invObjets(container, renderRef) {
    var items = state.inv.objets;
    var O = state.inv.opts;
    var sel = items.filter(function (o) { return o.ref === invSelectionLocale; })[0] || null;          // l'OBJET affiché au panneau
    var drag = null;         // l'objet qu'on glisse
    var panelHooks = [];     // ce que le panneau rafraîchit, vidé à chaque rendu

    // Le rouage du module ne règle que l’affichage commun aux tuiles.
    var optRow = el("div", "pc-obj-opts pc-edit-only");
    var choixCoins=[["aucun","Aucun"],["nom","Nom"],["qte","Quantité"],["poids","Poids unitaire"],["poidsTotal","Poids total"],["volume","Volume unitaire"],["volumeTotal","Volume total"],["da","Prise en main (DA)"]];
    [["hautGauche","En haut à gauche"],["hautDroite","En haut à droite"],["basGauche","En bas à gauche"],["basDroite","En bas à droite"]].forEach(function(c){
      var select=el("select","pc-select pc-edit-field");select.setAttribute("aria-label",c[1]);select.dataset.invCorner=c[0];
      choixCoins.forEach(function(v){var option=el("option",null,v[1]);option.value=v[0];option.selected=O.coins[c[0]]===v[0];select.appendChild(option);});
      select.addEventListener("change",function(){O.coins[c[0]]=select.value;render();refresh();});
      optRow.appendChild(fld(c[1],select));
    });
    var totalToggle=el("button","pc-chip"+(O.total?" on":""),"Total porté");totalToggle.type="button";totalToggle.setAttribute("aria-pressed",String(!!O.total));
    totalToggle.addEventListener("click",function(){O.total=!O.total;totalToggle.classList.toggle("on",O.total);totalToggle.setAttribute("aria-pressed",String(O.total));refresh();});optRow.appendChild(totalToggle);
    container.appendChild(optRow);

    var wrap = el("div", "pc-obj-wrap");
    var leftBox = el("div", "pc-obj-left");
    var panel = el("div", "pc-obj-panel");
    wrap.appendChild(leftBox);
    wrap.appendChild(panel);
    var tot = el("div", "pc-inv-total");
    var objetsAvecContenu=Object.create(null);
    function indexContenus(){objetsAvecContenu=Object.create(null);items.forEach(function(o){if(o.dans)objetsAvecContenu[o.dans]=true;});}
    var majGroupes = [];     // les poids des bandeaux, rafraîchis sans re-rendu

    function updateTotal() {
      indexContenus();
      tot.style.display = O.total ? "" : "none";
      majGroupes.forEach(function (f) { f(); });
      tot.textContent = "Poids porté : " + fmtP(poidsPorte()) + " / " + fmtP(charge()) + " kg";
    }

    // ---- Contenants / Contenus -------------------------------------------------
    // Un Contenant offre UN slot interne. Un Contenu est un objet complet dont
    // la catégorie doit être exactement celle du Contenant qui le reçoit. Le
    // lien voyage par `ref`, jamais par le nom affiché : renommer une gourde ne
    // fait donc pas tomber son eau.
    function assureRef(o) {
      if (o && !o.ref) o.ref = uid("o");
      return o && o.ref ? String(o.ref) : "";
    }
    function contenusDans(porteur) {
      var ref=assureRef(porteur);
      return ref?items.filter(function(o){return o!==porteur && String(o.dans||"")===ref;}):[];
    }
    function contenuDans(porteur) {return contenusDans(porteur)[0] || null;}
    function capaciteContenant(porteur) {return Math.max(0,Math.floor(num(porteur.emplacements,1)));}
    function nomCategorie(cle) {
      var noms = { liquide: "Liquide", poudre: "Poudre", pate: "Pâte" }, trouve = noms[cle] || "";
      if (trouve) return trouve;
      armesData().forEach(function (a) {
        var m = a && a.munition;
        if (!trouve && m && typeof m === "object" && String(m.cle || "") === String(cle || ""))
          trouve = String(m.nom || m.cle);
      });
      return trouve || String(cle || "");
    }
    function compatibleContenu(o, porteur) {
      return !!(o && o.contenu && porteur && porteur.contenant &&
                String(o.contenu) === String(porteur.contenant));
    }
    function libereContenu(porteur, silencieux) {
      if(!silencieux)window.OwdInventoryData.isolate(items,porteur);
      var ref = porteur && porteur.ref ? String(porteur.ref) : "", n = 0;
      if (!ref) return 0;
      items.forEach(function (o) {
        if (String(o.dans || "") !== ref) return;
        if(silencieux)o.qte=Math.round(pnum(o.qte)*pnum(porteur.qte)*100)/100;
        o.dans = ""; o.ou = porteur.ou === "terre" ? "terre" : "sac"; o.emp = -1; n++;
      });
      if (n && !silencieux) flash("Le contenu a été sorti du contenant.");
      return n;
    }
    function poseContenu(o, porteur) {
      if (!o || !porteur || o === porteur) return false;
      if (!o.contenu) { flash("Seul un objet de type Contenu peut être placé ici."); return false; }
      if (!porteur.contenant) { flash("Cet objet n'est pas un contenant."); return false; }
      if (!compatibleContenu(o, porteur)) {
        flash("Ce contenant accepte « " + nomCategorie(porteur.contenant) + " », pas « " +
              nomCategorie(o.contenu) + " ».");
        return false;
      }
      if(window.OwdInventoryData.group({objets:items},o.ref).some(function(x){return x.ref===porteur.ref;}))return false;
      window.OwdInventoryData.isolate(items,porteur);
      window.OwdInventoryData.isolateAncestors(items,o);
      var avant=contenusDans(porteur);
      assureRef(o); assureRef(porteur);
      if(avant.indexOf(o)<0 && avant.length>=capaciteContenant(porteur))
        flash("Attention : emplacements dépassés ("+(avant.length+1)+" / "+capaciteContenant(porteur)+"). Le contenu reste autorisé.");
      o.dans = porteur.ref;
      // `ou` reste un repli lisible par les anciens schémas. Tant que `dans`
      // est posé, le contenu n'apparaît pas dans le sac et n'en consomme pas
      // l'encombrement une seconde fois.
      o.ou = "sac"; o.emp = -1;
      return true;
    }

    function vignette(file, cb) {
      var r = new FileReader();
      r.onerror = function () { flash("Image illisible."); };
      r.onload = function () {
        var img = new Image();
        img.onload = function () {
          if (!img.width || !img.height) { flash("Image illisible."); return; }   // ex. SVG sans dimensions
          // le PORTRAIT des images du livre, 84 × 128
          var W = 84, H = 128, c = document.createElement("canvas");
          c.width = W; c.height = H;
          var k = Math.max(W / img.width, H / img.height);
          var w = img.width * k, h = img.height * k;
          c.getContext("2d").drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
          cb(c.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = function () { flash("Image illisible."); };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    }

    // DÉPLACER un objet vers `ou`, juste avant `cible` (null : à la fin). Une
    // case déjà prise ÉCHANGE : ce qu'elle tenait part là d'où l'objet vient,
    // ou au sac s'il n'y a pas sa place. Un objet à deux cases (robe, arme à
    // deux mains) libère les DEUX, et ce qui les tenait part au sac.
    function deplace(o, ou, cible) {
      if((INV_CASES.indexOf(ou)>=0 || ou==="deuxMains") && pnum(o.qte)<1){flash("Un emplacement exige un exemplaire entier.");return false;}
      var deuxMains=ou==="deuxMains" || o.mains==="2 obligatoires" && (ou==="mainG" || ou==="mainD");
      if(ou==="deuxMains")ou="mainD";
      if (!lieuPermis(o, ou)) {
        flash(ou === "poches" ? "Les poches acceptent uniquement les objets de taille Très petite ou Minuscule (renseignez la taille de l'objet)." : "« " + INV_NOMS[ou] + " » ne prend pas cet objet.");
        return false;
      }
      var bagCible=window.OwdInventoryData.backpack(items);
      if(ou === "sac" && bagCible && o!==bagCible && !invTailleAccepte(o.taille,invTailleMaxSac(bagCible))){flash("Cet objet dépasse la taille intérieure maximale du sac.");return false;}
      window.OwdInventoryData.isolateAncestors(items,o);
      if(INV_CASES.indexOf(ou)>=0)window.OwdInventoryData.isolate(items,o);
      var dest = ancrage(o, ou, deuxMains), cases = casesDe(o, dest, deuxMains), vient = o.ou;
      // Tirer un Contenu hors de son petit slot le redevient un objet libre.
      window.OwdInventoryData.bind(items);
      o.dans = "";
      var chasses = [];
      cases.forEach(function (c) {
        var occ = objetEn(c);
        if (occ && occ !== o && chasses.indexOf(occ) < 0) chasses.push(occ);
      });
      o.ou = dest;
      o.tenueDeuxMains = deuxMains;
      o.emp = -1;
      chasses.forEach(function (occ) {
        // l'échange simple : un seul occupant, qui tient là d'où l'objet vient
        var retour = chasses.length === 1 && lieuPermis(occ, vient) &&
                     casesDe(occ, vient).every(function (c) { return casesDe(o).indexOf(c) < 0; });
        occ.ou = retour ? ancrage(occ, vient, false) : "sac";
        occ.tenueDeuxMains = occ.mains === "2 obligatoires" && (occ.ou === "mainD" || occ.ou === "mainG");
      });
      if (cible !== undefined) {
        items.splice(items.indexOf(o), 1);
        var at = cible ? items.indexOf(cible) : -1;
        if (at < 0) items.push(o);
        else items.splice(at, 0, o);
      }
      var bag = window.OwdInventoryData.backpack(items);
      if(dest === "sac" && bag && bag!==o) o.dans=bag.ref;
      window.OwdInventoryData.bind(items);
      rangeEmplacements(items);   // une ceinture ôtée rend ses emplacements
      return true;
    }

    // POSER dans l'emplacement k de la ceinture (« ceint ») ou du sac
    // (« sacep ») : UN exemplaire, qu'on détache d'une pile, et pas plus
    // encombrant que l'emplacement ne l'accepte. Ce qui l'occupait retourne
    // d'où l'objet vient s'il y tient, au sac sinon.
    function poseEp(o, lieu, k) {
      if(k<0 || k+invCoutAcc(o,lieu)>nbEp(lieu)){flash("Pas assez d’accroches contiguës.");return null;}
      if (!epPermis(o, lieu)) {
        flash(o === porteurEp(lieu) ? "Un contenant ne s'accroche pas à lui-même."
          : "Cet objet dépasse la taille maximale des accroches (" + ebMaxEp(lieu) + ").");
        return null;
      }
      var vient = o.ou, vientK = o.emp;
      var pose = o;
      window.OwdInventoryData.isolateAncestors(items,o);
      if (pnum(o.qte)>1) { pose=window.OwdInventoryData.split(items,o,1,uid("o")); vient=null; }
      var occ = objetEp(lieu, k);
      for(var slot=1;slot<invCoutAcc(pose,lieu);slot++){var autre=objetEp(lieu,k+slot);if(autre && autre!==pose && autre!==occ){autre.ou="sac";autre.emp=-1;autre.dans="";}}
      pose.dans = "";
      pose.ou = lieu;
      pose.emp = k;
      if (occ && occ !== pose) {
        if (vient && INV_EP.indexOf(vient) >= 0 && epPermis(occ, vient)) { occ.ou = vient; occ.emp = vientK; }
        else if (vient === "terre" || vient === "sac" || (vient === "poches" && lieuPermis(occ, "poches"))) { occ.ou = vient; occ.emp = -1; }
        else { occ.ou = "sac"; occ.emp = -1; }
      }
      window.OwdInventoryData.bind(items);
      rangeEmplacements(items);
      return pose;
    }

    // Petit slot visible DANS la tuile d'un Contenant. Il est lui-même
    // draggable quand il est plein : on peut donc sortir son Contenu vers le
    // sac/les poches ou le déposer dans un autre Contenant compatible.
    function slotContenant(porteur) {
      var contenus=contenusDans(porteur), limite=capaciteContenant(porteur);
      var groupe=el("div","pc-obj-content-group"+(contenus.length>limite?" depasse":""));
      groupe.title="Contenus : "+contenus.length+" / "+limite+" emplacements";
      var visibles=contenus.slice(0,2);
      visibles.push(null); // Dépôt toujours visible, même au-delà de la limite.
      visibles.forEach(function(occ){
        var s=el("div","pc-obj-content-slot"+(occ?" plein":" vide")+(sel===occ?" sel":""));
        s.title=occ?(occ.nom||"Contenu"):"Déposer un contenu "+nomCategorie(porteur.contenant);
        if(occ){
          if(occ.img){var im=el("img");im.alt="";im.draggable=false;im.src=occ.img;s.appendChild(im);}
          else s.appendChild(el("span","pc-obj-content-ph",(nomCategorie(occ.contenu)||"?").slice(0,1).toUpperCase()));
          s.draggable=true;
          s.addEventListener("click",function(e){e.stopPropagation();sel=occ;render();});
          s.addEventListener("dragstart",function(e){e.stopPropagation();drag=occ;s.classList.add("drag");try{e.dataTransfer.setData("text/plain","");e.dataTransfer.effectAllowed="move";if(window.__owdObjetDrag)window.__owdObjetDrag(drag.ref,e.dataTransfer);}catch(err){}});
          s.addEventListener("dragend",function(e){e.stopPropagation();drag=null;if(window.__owdObjetDragFin)window.__owdObjetDragFin();render();});
        }else s.appendChild(el("span","pc-obj-content-ph","+"));
        s.addEventListener("dragover",function(e){if(!drag||drag===porteur)return;e.preventDefault();e.stopPropagation();s.classList.toggle("over",compatibleContenu(drag,porteur));});
        s.addEventListener("dragleave",function(e){e.stopPropagation();s.classList.remove("over");});
        s.addEventListener("drop",function(e){if(!drag)return;e.preventDefault();e.stopPropagation();var d=drag;drag=null;if(poseContenu(d,porteur)){sel=d;save();refresh();}render();});
        groupe.appendChild(s);
      });
      if(contenus.length>2)groupe.appendChild(el("span","pc-obj-content-more","+"+(contenus.length-2)));
      return groupe;
    }

    // Menu local aux objets : mêmes opérations que le panneau et le drag.
    var menuObjet = null, menuRef = "";
    function fermeMenu(retour) {
      var ref = menuRef;
      if (menuObjet && menuObjet.parentNode) menuObjet.parentNode.removeChild(menuObjet);
      menuObjet = null; menuRef = "";
      if (retour) Array.prototype.some.call(container.querySelectorAll(".pc-obj-tile"), function (t) {
        if (t.dataset.objectRef !== ref) return false;
        t.focus(); return true;
      });
    }
    function objetActuel(ref) {
      return items.filter(function (o) { return o.ref === ref; })[0] || null;
    }
    function avecQuantite(ref, titre, action) {
      var it = objetActuel(ref); if (!it) return;
      var body = el("div", "pc-modal-body"), q = el("input", "n");
      q.type = "number"; q.min = "0.01"; q.max = fmtP(it.qte); q.step = "any";
      q.value = fmtP(Math.min(1, it.qte / 2));
      body.appendChild(el("div", "pc-modal-note", "Indiquez une quantité inférieure à la pile (" + fmtP(it.qte) + ")."));
      body.appendChild(fld("Quantité", q));
      dialogue(titre + " — " + (it.nom || "objet"), body, function () {
        var actuel = objetActuel(ref), n = Math.round(pnum(q.value) * 100) / 100;
        if (!actuel) { flash("Cet objet n'est plus dans l'inventaire."); return; }
        if (!(n > 0 && n < actuel.qte)) { flash("Indiquez une quantité supérieure à zéro et inférieure à la pile."); q.focus(); return false; }
        try { action(actuel, n); } catch (e) { flash(e.message); return false; }
      }, titre);
    }
    function emplacementsEquipement(it) {
      if (it.arme) return ["mainD", "mainG"];
      if (it.sac) return ["dos"];
      if (it.ceint) return ["ceinture"];
      if (it.vet) return [it.vet === "hautbas" ? "haut" : it.vet];
      if (it.acc) return (INV_ACC_TYPES[it.acc] || []).slice();
      return [];
    }
    function rangeRemplace(it) {
      var bag = window.OwdInventoryData.backpack(items);
      deplace(it, bag && bag !== it ? "sac" : "terre");
    }
    function equipeObjet(it) {
      var lieux = emplacementsEquipement(it).filter(function (ou) { return casePermise(it, ou); });
      if (!lieux.length) return;
      var libre = lieux.filter(function (ou) { return casesDe(it, ou).every(function (c) { return !objetEn(c); }); });
      var ou = libre[0] || lieux[0], remplaces = [];
      casesDe(it, ou).forEach(function (c) { var o = objetEn(c); if (o && o !== it && remplaces.indexOf(o) < 0) remplaces.push(o); });
      var pose = it;
      if(pnum(it.qte)>1)pose=window.OwdInventoryData.split(items,it,1,uid("o"));
      if (deplace(pose, ou)) { remplaces.forEach(rangeRemplace); sel = pose; render(); refresh(); }
    }
    function accrocheObjet(it, lieu) {
      if (!nbEp(lieu) || !epPermis(it, lieu)) return;
      var k = 0;
      for (var i = 0; i < nbEp(lieu); i++) if (!objetEp(lieu, i)) { k = i; break; }
      var occ = objetEp(lieu, k), pose = poseEp(it, lieu, k);
      if (pose) { if (occ && occ !== pose) rangeRemplace(occ); sel = pose; render(); refresh(); }
    }
    function ouvreMenu(it, e) {
      e.preventDefault(); e.stopPropagation(); fermeMenu();
      if (!objetActuel(it.ref)) return;
      var r = e.currentTarget.getBoundingClientRect();
      menuRef = it.ref; menuObjet = el("div", "pc-inv-context");
      menuObjet.setAttribute("role", "menu");
      menuObjet.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
      menuObjet.setAttribute("aria-label", "Actions — " + (it.nom || "objet"));
      var groupes = [], part = pnum(it.qte) > 1;
      function entree(label, fn, danger) { return { label: label, fn: fn, danger: danger }; }
      groupes.push([entree("Montrer", function (o) { montreObjet(o.ref); })].concat(part ? [entree("Montrer une partie", function (o) {
        avecQuantite(o.ref, "Montrer une partie", function (a, q) { montreObjet(a.ref, q); });
      })] : []));
      groupes.push([entree("Donner", function (o) { donnerDialogue(o, o.qte, "all"); })].concat(part ? [entree("Donner une partie", function (o) {
        donnerDialogue(o, Math.min(1, o.qte / 2), "part");
      })] : []));
      if (part) groupes.push([entree("Séparer une partie", function (o) {
        avecQuantite(o.ref, "Séparer une partie", function (a, q) { window.OwdInventoryData.split(items, a, q, uid("o")); render(); refresh(); });
      })]);
      groupes.push([entree("Détruire", function (o) { actionObjet(o.ref, "supprimer"); }, true)].concat(part ? [entree("Détruire une partie", function (o) {
        avecQuantite(o.ref, "Détruire une partie", function (a, q) { window.OwdInventoryData.isolateAncestors(items,a); a.qte = Math.round((a.qte - q) * 100) / 100; render(); refresh(); });
      }, true)] : []));
      if (it.sac) groupes.push([entree("Voir son contenu", function (o) {
        sel = o; render(); var contenu = panel.querySelector(".pc-obj-tiles");
        if (contenu) contenu.scrollIntoView({ block: "nearest" });
      })]);
      var deplacements = [], bag = window.OwdInventoryData.backpack(items);
      if (bag && bag !== it && !(it.ou === "sac" && it.dans === bag.ref)) deplacements.push(entree("Déplacer dans le sac à dos", function (o) {
        if (deplace(o, "sac")) { sel = o; render(); refresh(); }
      }));
      if (lieuPermis(it, "poches") && (it.ou !== "poches" || it.dans)) deplacements.push(entree("Déplacer dans les poches", function (o) {
        if (deplace(o, "poches")) { sel = o; render(); refresh(); }
      }));
      if (it.ou !== "terre" || it.dans) deplacements.push(entree("Déplacer par terre", function (o) {
        if (deplace(o, "terre")) { sel = o; render(); refresh(); }
      }));
      if (deplacements.length) groupes.push(deplacements);
      var equipements = [], lieux = emplacementsEquipement(it);
      if (lieux.length && (!casesDe(it).length || lieux.indexOf(it.ou) < 0)) equipements.push(entree("Équiper", equipeObjet));
      [["ceint", "Accrocher à la ceinture"], ["sacep", "Accrocher au sac à dos"]].forEach(function (opt) {
        if (nbEp(opt[0]) > 0 && epPermis(it, opt[0]) && it.ou !== opt[0]) equipements.push(entree(opt[1], function (o) { accrocheObjet(o, opt[0]); }));
      });
      if (equipements.length) groupes.push(equipements);
      groupes.forEach(function (g, i) {
        if (i) { var sep = el("div", "pc-inv-context-separator"); sep.setAttribute("role", "separator"); menuObjet.appendChild(sep); }
        g.forEach(function (a) {
          var b = el("button", a.danger ? "danger" : "", a.label); b.type = "button"; b.setAttribute("role", "menuitem");
          b.addEventListener("click", function () {
            var o = objetActuel(it.ref); fermeMenu(); if (!o) return;
            try { a.fn(o); } catch (err) { flash(err.message); }
          }); menuObjet.appendChild(b);
        });
      });
      (appEl || rootEl || document.body).appendChild(menuObjet);
      var x = e.clientX || r.left + 8, y = e.clientY || r.top + 8, box = menuObjet.getBoundingClientRect();
      menuObjet.style.left = Math.max(8, Math.min(x, window.innerWidth - box.width - 8)) + "px";
      menuObjet.style.top = Math.max(8, Math.min(y, window.innerHeight - box.height - 8)) + "px";
      menuObjet.querySelector("button").focus();
    }
    function menuExterieur(e) { if (menuObjet && !menuObjet.contains(e.target)) fermeMenu(); }
    function menuClavier(e) {
      if (!menuObjet) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fermeMenu(true); return; }
      if (e.key === "Tab") { fermeMenu(); return; }
      var bs = Array.prototype.slice.call(menuObjet.querySelectorAll("button")), at = bs.indexOf(document.activeElement), next;
      if (e.key === "ArrowDown") next = (at + 1) % bs.length;
      else if (e.key === "ArrowUp") next = (at + bs.length - 1) % bs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = bs.length - 1;
      if (next !== undefined) { e.preventDefault(); bs[next].focus(); }
    }
    function menuScroll(e) { if (!menuObjet || menuObjet.contains(e.target)) return; fermeMenu(); }
    document.addEventListener("pointerdown", menuExterieur, true);
    document.addEventListener("keydown", menuClavier, true);
    document.addEventListener("scroll", menuScroll, true);
    function menuRedimensionne() { fermeMenu(); }
    window.addEventListener("resize", menuRedimensionne);
    window.addEventListener("blur", menuRedimensionne);
    remontageNettoyage.push(function () {
      fermeMenu(); document.removeEventListener("pointerdown", menuExterieur, true);
      document.removeEventListener("keydown", menuClavier, true); document.removeEventListener("scroll", menuScroll, true);
      window.removeEventListener("resize", menuRedimensionne);
      window.removeEventListener("blur", menuRedimensionne);
    });

    function tile(it) {
      var t = el("div", "pc-obj-tile" + (sel === it ? " sel" : ""));
      t.dataset.objectRef = assureRef(it); t.tabIndex = 0;
      t.addEventListener("contextmenu", function (e) { ouvreMenu(it, e); });
      t.addEventListener("keydown", function (e) {
        if (e.key === "ContextMenu" || (e.key === "F10" && e.shiftKey)) ouvreMenu(it, e);
      });
      if (it.img) {
        var im = el("img");
        im.alt = ""; im.draggable = false;
        im.src = it.img;
        t.appendChild(im);
      } else t.appendChild(el("div", "pc-obj-ph", "?"));
      ["hautGauche","hautDroite","basGauche","basDroite"].forEach(function(position){
        var key=O.coins[position];if(key==="aucun")return;
        var badge=el("span","pc-obj-corner "+position);badge.dataset.corner=position;badge.dataset.value=key;t.appendChild(badge);
        function update(){
          var q=pnum(it.qte),value="",label="";
          if(key==="nom"){value=it.nom||"Objet";label="Nom";}
          if(key==="qte"){value="x "+fmtP(q);label="Quantité";}
          if(key==="da"){value=window.OwdInventoryData.takeCost(it)+" DA";label="Prise en main";}
          if(key==="poids"||key==="poidsTotal"){value=it.poids==null?"—":fmtP(key==="poidsTotal"?(objetsAvecContenu[it.ref]?window.OwdInventoryData.weight(items,it):pnum(it.poids)*q):pnum(it.poids))+" kg";label=key==="poidsTotal"?"Poids total, contenu inclus":"Poids unitaire";}
          if(key==="volume"||key==="volumeTotal"){value=it.encombre==null?"—":fmtP(pnum(it.encombre)*(key==="volumeTotal"?q:1))+" L";label=key==="volumeTotal"?"Volume total":"Volume unitaire";}
          if(badge.textContent!==value)badge.textContent=value;
          badge.title=label+" : "+value;
        }
        majGroupes.push(update);update();
      });
      if (it.contenant) t.appendChild(slotContenant(it));
      t.title = (it.nom || "Objet") + (it.rapide ? " — accès rapide" : "");
      majGroupes.push(function(){var titre=(it.nom||"Objet")+(it.rapide?" — accès rapide":"");if(t.title!==titre)t.title=titre;});
      if (it.rapide) t.classList.add("rapide");

      t.addEventListener("click", function (e) { e.stopPropagation(); sel = it; render(); });
      t.draggable = true;
      // RANGER SE JOUE : on passe l'épée d'une main à l'autre, on range une
      // fiole dans les poches en pleine partie. Le glisser-déposer marche donc
      // hors du mode édition comme dedans.
      t.addEventListener("dragstart", function (e) {
        drag = it;
        t.classList.add("drag");
        try { e.dataTransfer.setData("text/plain", ""); e.dataTransfer.effectAllowed = "move"; if (window.__owdObjetDrag) window.__owdObjetDrag(drag.ref, e.dataTransfer); } catch (err) {}
      });
      t.addEventListener("dragend", function () { drag = null; if (window.__owdObjetDragFin) window.__owdObjetDragFin(); render(); });
      // dans les poches et le sac, déposer SUR une tuile range avant ou après
      // elle ; dans une case, c'est la case qui reçoit
      if (it.ou === "poches" || it.ou === "sac" || it.ou === "terre") {
        t.addEventListener("dragover", function (e) {
          if (!drag || drag === it) return;
          e.preventDefault();
          e.stopPropagation();
          var r = t.getBoundingClientRect();
          var avant = e.clientX < r.left + r.width / 2;
          t.classList.toggle("over-l", avant);
          t.classList.toggle("over-r", !avant);
        });
        t.addEventListener("dragleave", function () { t.classList.remove("over-l", "over-r"); });
        t.addEventListener("drop", function (e) {
          if (!drag || drag === it) return;
          e.preventDefault();
          e.stopPropagation();
          var r = t.getBoundingClientRect();
          var avant = e.clientX < r.left + r.width / 2;
          var o = drag; drag = null;
          var cible = it;
          if (!avant) {
            var suivants = items.filter(function (x) { return !x.dans && x.ou === it.ou && x !== o; });
            var k = suivants.indexOf(it);
            cible = k >= 0 && k + 1 < suivants.length ? suivants[k + 1] : null;
          }
          if (deplace(o, it.ou, cible)) { sel = o; refresh(); }
          render();
        });
      }
      return t;
    }

    // une CASE de Sur soi : l'objet qu'elle tient, ou son nom en creux
    function caseSurSoi(ou) {
      var c = el("div", "pc-inv-case");
      c.dataset.ou = ou;
      var o = objetEn(ou);
      if (o) {
        c.appendChild(tile(o));
        // la SECONDE case d'un objet qui en tient deux : le même objet, en écho
        if (o.ou !== ou) c.classList.add("echo");
      } else c.appendChild(el("div", "pc-inv-vide", CASE_LIGNES[ou] || INV_NOMS[ou]));
      c.title = INV_NOMS[ou];
      c.addEventListener("dragover", function (e) {
        if (!drag || !lieuPermis(drag, ou)) return;
        e.preventDefault();
        c.classList.add("over");
      });
      c.addEventListener("dragleave", function () { c.classList.remove("over"); });
      c.addEventListener("drop", function (e) {
        if (!drag) return;
        e.preventDefault();
        var d = drag; drag = null;
        if (deplace(d, ou)) { sel = d; refresh(); }
        render();
      });
      return c;
    }

    // un EMPLACEMENT : l'objet qu'il tient, ou l'encombrance qu'il accepte en creux
    function caseEp(lieu, k) {
      var c = el("div", "pc-inv-case pc-inv-ep");
      var o = objetEp(lieu, k);
      if (o) c.appendChild(tile(o));
      else c.appendChild(el("div", "pc-inv-vide", "≤ " + (ebMaxEp(lieu) || "Taille libre")));
      c.title = "Emplacement " + (k + 1) + " — " + (ebMaxEp(lieu) || "Taille libre") + " au plus, un exemplaire";
      c.addEventListener("dragover", function (e) {
        if (!drag || !epPermis(drag, lieu)) return;
        e.preventDefault();
        e.stopPropagation();
        c.classList.add("over");
      });
      c.addEventListener("dragleave", function () { c.classList.remove("over"); });
      c.addEventListener("drop", function (e) {
        if (!drag) return;
        e.preventDefault();
        e.stopPropagation();
        var d = drag; drag = null;
        var pose = poseEp(d, lieu, k);
        if (pose) { sel = pose; refresh(); }
        render();
      });
      return c;
    }
    // les emplacements d'un lieu, cinq par ligne, sur leurs PROPRES lignes :
    // la dernière se complète de blancs, aucun objet libre ne s'y glisse
    function lignesEp(lieu) {
      var n = nbEp(lieu), box = el("div", "pc-inv-eps");
      for (var i = 0; i < n; i += 5) {
        var l = el("div", "pc-inv-cases");
        for (var k = i; k < i + 5; k++)
          l.appendChild(k < n ? caseEp(lieu, k) : el("div", "pc-inv-case pc-inv-rien"));
        box.appendChild(l);
      }
      return box;
    }

    function bandeau(titre, pds) {
      var head = el("div", "pc-obj-ghead");
      head.appendChild(el("span", "nm", titre));
      if (pds) head.appendChild(pds);
      return head;
    }

    function caseDeuxMains() {
      var c=el("div","pc-inv-case pc-inv-rien pc-inv-twohand-cell");
      var zone=el("div","pc-obj-content-slot pc-inv-twohand-target","2 Mains");
      zone.title="Tenir cet objet à deux mains : disponible même si une seule main suffit";
      zone.setAttribute("role","group");zone.setAttribute("aria-label","Déposer pour tenir à deux mains");
      var occ=objetEn("mainG"),autre=objetEn("mainD");
      if(occ && occ===autre){zone.classList.add("plein");zone.title="Tenue à deux mains : "+(occ.nom||"Objet");}
      zone.addEventListener("dragover",function(e){if(!drag)return;e.preventDefault();e.stopPropagation();zone.classList.add("over");});
      zone.addEventListener("dragleave",function(e){e.stopPropagation();zone.classList.remove("over");});
      zone.addEventListener("drop",function(e){if(!drag)return;e.preventDefault();e.stopPropagation();var d=drag;drag=null;if(deplace(d,"deuxMains")){sel=d;refresh();}render();});
      c.appendChild(zone);return c;
    }
    function groupeSurSoi() {
      var g = el("div", "pc-obj-group");
      g.appendChild(bandeau("Sur soi"));
      // l'ordre arrêté par l'auteur ; null laisse la case vide
      [["mainG", "mainD", null, "ceinture", "dos"],
       ["tete", "haut", "mains", "bas", "pieds"],
       ["oreilles", "collier", "sousvet", "poignetG", "poignetD"],
       ["bagueG", "bagueD", "chevilleG", "chevilleD", "cape"]].forEach(function (ligne) {
        var l = el("div", "pc-inv-cases");
        ligne.forEach(function (ou) {
          l.appendChild(ou ? caseSurSoi(ou) : caseDeuxMains());
        });
        g.appendChild(l);
      });
      return g;
    }

    // le compte des emplacements tenus, pour un bandeau
    function compteEp(lieu) {
      var pds = el("span", "pds");
      pds.title = "Emplacements tenus contre emplacements";
      function maj() {
        var n = nbEp(lieu), pris = items.filter(function (o) { return o.ou === lieu; }).reduce(function(t,o){return t+invCoutAcc(o,lieu);},0);
        pds.textContent = pris + " / " + n + " acc";
      }
      maj();
      majGroupes.push(maj);
      return pds;
    }
    // CEINTURE : ses emplacements seuls, une ligne en pointillé sans ceinture
    function groupeCeinture() {
      var g = el("div", "pc-obj-group");
      g.appendChild(bandeau("Ceinture", compteEp("ceint")));
      if (nbEp("ceint")) g.appendChild(lignesEp("ceint"));
      else {
        var l = el("div", "pc-obj-tiles");
        l.style.setProperty("--obj-cols", 5);
        for (var k = 0; k < 5; k++) l.appendChild(el("div", "pc-obj-tile pc-inv-trou"));
        g.appendChild(l);
      }
      return g;
    }

    // POCHES et SAC À DOS : capacité affichée. PAR TERRE : illimité et hors charge.
    // Le sac montre D'ABORD ses emplacements, sur leurs propres lignes.
    function groupeLibre(ou, titre, poids, cap) {
      var bag=window.OwdInventoryData.backpack(items);
      function visible(it){return it.ou===ou && (ou==="sac" ? bag&&it.dans===bag.ref : !it.dans);}
      var g = el("div", "pc-obj-group");
      var pds = el("span", "pds");
      pds.title = ou === "terre" ? "Sans limite : hors du poids porté" : "Volume contre capacité";
      function maj() {
        if (ou === "terre") {
          pds.textContent = items.filter(visible).length + " objets · illimité";
          pds.classList.remove("over");
          return;
        }
        var p = poids(), c = cap();
        pds.textContent = fmtP(p) + " / " + fmtP(c) + " L";
        pds.classList.toggle("over", p > c);
      }
      maj();
      majGroupes.push(maj);
      var head = bandeau(titre, pds);
      if (ou === "sac" && nbEp("sacep")) head.insertBefore(compteEp("sacep"), pds);
      g.appendChild(head);
      if (ou === "sac" && nbEp("sacep")) g.appendChild(lignesEp("sacep"));
      var tiles = el("div", "pc-obj-tiles");
      tiles.style.setProperty("--obj-cols", 5);
      items.forEach(function (it) { if (visible(it)) tiles.appendChild(tile(it)); });
      if (ou === "terre") {
      var add = el("button", "pc-obj-addtile", "+");add.type="button";add.setAttribute("aria-label","Ajouter un objet");
      add.title = "Ajouter un objet dans « " + titre + " »";
      add.addEventListener("click", function () {
        if(window.__owdCanEdit&&!window.__owdCanEdit())return;
        var o = { id: "", ref: uid("o"), nom: "", img: "", qte: 1, poids: 0, encombre: 0, places: 0, nourri: false, achat: 0, vente: null,
                  desc: "", ou: ou, emp: -1, rapide: false, vet: "", acc: "", poches: 0, froid: 0, chaud: 0,
                  sac: false, cap: 0, ceint: false, ep: 0, ebMax: 0, contenant: "", contenu: "", dans: "", arme: null };
        if(ou === "sac" && bag) o.dans=bag.ref;
        items.push(o);
        invEditionObjetLocale=o.ref;
        sel = o;
        render();
        refresh();
      });
      tiles.appendChild(add);
      }
      // LA LIGNE SE COMPLÈTE de cases vides en pointillé, et un groupe vide en
      // garde une entière : on voit la place qui reste. La case « + » de
      // l'édition compte dans la ligne.
      var n = items.filter(function (x) { return visible(x); }).length + (ou === "terre" ? 1 : 0);
      var trous = Math.max(5, Math.ceil(n / 5) * 5) - n;
      for (var k = 0; k < trous; k++) tiles.appendChild(el("div", "pc-obj-tile pc-inv-trou"));
      tiles.addEventListener("dragover", function (e) {
        if (!drag) return;
        e.preventDefault();
        tiles.classList.add("over");
      });
      tiles.addEventListener("dragleave", function () { tiles.classList.remove("over"); });
      tiles.addEventListener("drop", function (e) {
        if (!drag) return;
        e.preventDefault();
        var o = drag; drag = null;
        if (deplace(o, ou, null)) { sel = o; refresh(); }
        render();
      });
      g.appendChild(tiles);
      return g;
    }

    // ---- le détail de l'objet ----
    function champNombre(libelle, lire, ecrire, titre) {
      var i = el("input", "pc-edit-field");
      i.type = "text"; i.inputMode = "decimal";
      i.value = lire() ? fmtP(lire()) : "";
      i.placeholder = libelle==="Prix d'achat" ? "Non renseigné" : "0";
      if (titre) i.title = titre;
      i.addEventListener("input", function () { ecrire(i.value); save(); updateTotal(); refresh(); });
      i.addEventListener("blur", function () { i.value = lire() ? fmtP(lire()) : ""; });
      return fld(libelle, i);
    }

    // Les sous-champs propres à un type vivent tous dans la même carte.
    // L'arme avait déjà cette lecture visuelle ; vêtements, accessoires,
    // nourriture, sacs, ceintures, contenants et contenus suivent la même règle.
    function carteNature() { return el("div", "pc-obj-subcard"); }

    function selCategorieStockage(it, cle) {
      var s = el("select", "pc-select pc-edit-field");
      var valeur = String(it[cle] || ""), trouve = false;
      var groupes = [
        { nom: "Matières", choix: [
          { cle: "liquide", nom: "Liquide" },
          { cle: "poudre", nom: "Poudre" },
          { cle: "pate", nom: "Pâte" }
        ] },
        { nom: "Munitions", choix: [] }
      ];
      var vus = Object.create(null);
      armesData().forEach(function (a) {
        var m = a && a.munition;
        if (!m || typeof m !== "object" || !m.cle || vus[m.cle]) return;
        vus[m.cle] = 1;
        groupes[1].choix.push({ cle: String(m.cle), nom: String(m.nom || m.cle) });
      });
      groupes[1].choix.sort(function (a, b) { return a.nom.localeCompare(b.nom, "fr"); });

      groupes.forEach(function (g) {
        if (!g.choix.length) return;
        var og = document.createElement("optgroup");
        og.label = g.nom;
        g.choix.forEach(function (c) {
          var o = el("option", null, c.nom);
          o.value = c.cle;
          if (c.cle === valeur) { o.selected = true; trouve = true; }
          og.appendChild(o);
        });
        s.appendChild(og);
      });
      // Même politique que le type d'arme : ne jamais faire disparaître une
      // ancienne valeur simplement parce que les règles actuelles l'ignorent.
      if (valeur && !trouve) {
        var ancien = el("option", null, valeur + " (inconnu)");
        ancien.value = valeur; ancien.selected = true;
        s.appendChild(ancien);
      }
      s.addEventListener("change", function () {
        it[cle] = s.value;
        if (cle === "contenant") {
          it.sousType=s.value;
          var occ = contenuDans(it);
          if (occ && !compatibleContenu(occ, it)) libereContenu(it);
        } else if (cle === "contenu" && it.dans) {
          var porteur = null;
          items.forEach(function (x) { if (!porteur && x.ref === it.dans) porteur = x; });
          if (!porteur || !compatibleContenu(it, porteur)) {
            it.dans = ""; it.ou = "sac"; it.emp = -1;
            flash("Le contenu ne correspond plus à son contenant : il retourne au sac à dos.");
          }
        }
        save();
        render();
        refresh();
      });
      return s;
    }
    function renderPanel() {
      panel.innerHTML = "";
      // SANS OBJET CHOISI, le panneau montre un objet FANTÔME : la même fiche,
      // vide et inerte. Le panneau garde ainsi sa forme et sa taille, et l'on
      // voit d'avance ce qu'un objet porte.
      if (sel && items.indexOf(sel) < 0) sel = null;
      invSelectionLocale = sel ? sel.ref : "";
      if(invEditionObjetLocale!==invSelectionLocale)invEditionObjetLocale="";
      panel.dataset.syncEntity = invSelectionLocale;
      var fantome = !sel;
      panel.classList.toggle("fantome", fantome);
      var types = ["physique", "feu", "froid", "eclair", "decomposition", "ethere", "brut"];
      var it = sel || { id: "", ref: "", nom: "", img: "", qte: 0, poids: 0, encombre: 0, places: 0, achat: 0, vente: null,
                        desc: "", ou: "sac", emp: -1, rapide: false, vet: "", acc: "", poches: 0, froid: 0, chaud: 0,
                        sac: false, cap: 0, ceint: false, ep: 0, ebMax: 0, contenant: "", contenu: "", dans: "", arme: null };
      types.forEach(function(t) {
        it["res_" + t] = it["res_" + t] || 0;
        it["prot_" + t] = it["prot_" + t] || 0;
      });

      // AUCUNE IMAGE AU PANNEAU, consigne de l'auteur : l'image se voit sur la
      // tuile, le panneau ne porte que le détail.

      var body = el("div", "pc-obj-body");

      // Champs communs d’abord, puis propriétés propres au type et quantité.
      var nm = el("input", "nm pc-edit-field");
      nm.type = "text"; nm.placeholder = fantome ? "Aucun objet" : "Nom de l'objet";
      nm.value = it.nom;
      nm.addEventListener("input", function () { it.nom = nm.value; save(); });
      nm.addEventListener("change", function () { updateTotal();refresh(); });
      var nameRow=el("div","pc-obj-name-row"),itemGear=el("button","pc-item-gear","⚙");itemGear.type="button";
      itemGear.addEventListener("click",function(){
        if(!sel||window.__owdCanEdit&&!window.__owdCanEdit())return;
        invEditionObjetLocale=invEditionObjetLocale===sel.ref?"":sel.ref;applyItemEdit();
      });nameRow.appendChild(nm);nameRow.appendChild(itemGear);body.appendChild(nameRow);

      // TYPE : une seule nature fonctionnelle à la fois. « Contenant » offre
      // un slot interne ; « Contenu » est ce qui peut y entrer. Changer de type
      // ne détruit jamais le contenu : un slot qui disparaît est vidé au sac.
      var ligneNat = el("div", "pc-obj-pair");
      var nat = el("select", "pc-edit-field");
      var natureDe = invType(it);
      Object.keys(INV_TYPES_OBJETS).forEach(function(k){var o=el("option",null,INV_TYPES_OBJETS[k]);o.value=k;o.selected=k===natureDe;nat.appendChild(o);});
      nat.addEventListener("change", function () {
        var type=nat.value, v={arme:"arme",vetement:"vet",accessoire:"acc",contenant:"contenant"}[type] || "";
        var sub=invSousTypes(type);it.typeObjet=type;it.sousType=sub.length?sub[0][0]:"";
        if(type==="rangement")v=it.sousType;
        if(it.contenant && v!=="contenant" || it.sac && v!=="sac")libereContenu(it,true);
        it.nourri=invEstIngerable(it);it.sac=v==="sac";it.ceint=v==="ceint";
        it.vet=v==="vet"?(it.vet||"haut"):"";it.acc=v==="acc"?(it.acc||"collier"):"";
        it.contenant=v==="contenant"?(it.contenant||"liquide"):"";
        if(type==="contenant")it.sousType=it.contenant;
        it.contenu=type==="munition"?it.sousType:type==="consommable"?"":"";
        it.arme=v==="arme"?(it.arme||{attaque:"",degats:"",parade:"",reduction:"",modsDegats:[],modsParade:[],comp:"",type:"",mains:1,repartition:{physique:100}}):null;
        if (INV_EP.indexOf(it.ou) < 0 && !lieuPermis(it, it.ou)) it.ou = "sac";
        rangeEmplacements(items);
        save();
        render();
        refresh();
      });
      ligneNat.appendChild(fld("Type", nat));
      var rapideBoite = el("div", "pc-f pc-obj-quick");
      rapideBoite.appendChild(el("label", null, "Accès rapide"));
      var rapide = miniBtn("Activer", "Activer ou désactiver l'accès rapide", function () {
        window.OwdInventoryData.isolate(items,it);
        it.rapide = !it.rapide;
        save(); render(); refresh();
      }, "pc-obj-quick-toggle" + (it.rapide ? " on" : ""));
      rapide.setAttribute("aria-pressed", String(!!it.rapide));
      rapideBoite.appendChild(rapide);
      ligneNat.appendChild(rapideBoite);
      body.appendChild(ligneNat);

      // Le type possède son bloc, puis le sous-type sa ligne indépendante et
      // son propre cadre. Les propriétés communes ne sont montrées qu'après.
      var specifiquesType = el("div", "pc-obj-specifics pc-obj-type-properties");
      var specifiquesSous = el("div", "pc-obj-specifics pc-obj-subtype-card");
      var sousLigne = el("div", "pc-obj-subtype-row");
      var sous = invSousTypes(invType(it));
      if(invType(it)==="consommable") {
        // Les familles sont des en-têtes natifs en gras, non sélectionnables,
        // comme dans la liste des types d'armes.
        var choixConso=el("select","pc-select pc-edit-field");
        [["Solide",sous.slice(0,2)],["Pâte",sous.slice(2,4)],["Liquide",sous.slice(4,6)]].forEach(function(gr){
          var optgroup=document.createElement("optgroup");optgroup.label=gr[0];
          gr[1].forEach(function(e){var opt=el("option",null,e[1]);opt.value=e[0];opt.selected=e[0]===it.sousType;optgroup.appendChild(opt);});
          choixConso.appendChild(optgroup);
        });
        choixConso.addEventListener("change",function(){
          it.sousType=choixConso.value;it.nourri=invEstIngerable(it);
          var forme=invFormeConsommable(it);
          // Conserver la compatibilité avec les Contenants : liquide/pâte
          // restent des catégories de contenu indépendantes du sous-type.
          if(["liquide","pate",""].indexOf(it.contenu||"")>=0)it.contenu=forme==="solide"?"":forme;
          if(it.dans){var porteur=items.find(function(o){return o.ref===it.dans;});
            if(porteur&&porteur.contenant&&it.contenu!==porteur.contenant){
              it.dans="";it.ou=porteur.ou==="terre"?"terre":"sac";it.emp=-1;
              flash("La matière ne correspond plus au contenant : l’objet en est sorti.");
            }
          }
          save();render();refresh();
        });
        sousLigne.appendChild(fld("Sous-type",choixConso));
      } else if(sous.length) sousLigne.appendChild(invChoix("Sous-type", sous,
        it.sousType || (it.ceint ? "ceint" : it.sac ? "sac" : "autre"), function (v) {
          it.sousType=v;it.nourri=invEstIngerable(it);
          if(invType(it)==="rangement"){
            if(it.sac&&v!=="sac")libereContenu(it,true);
            it.sac=v==="sac";it.ceint=v==="ceint";
          }
          if(invType(it)==="munition")it.contenu=v;
          if(INV_EP.indexOf(it.ou)<0 && !lieuPermis(it,it.ou)){
            it.ou="poches";it.dans="";
          }
          rangeEmplacements(items);render();
        }));


      // ce que le type demande, juste sous lui. Tous les types utilisent le
      // même cadre visuel que la carte d'arme : un seul bloc contient leurs
      // sous-champs, au lieu de lignes flottantes.
      if (it.vet) {
        var cv = carteNature();
        var pv = el("div", "pc-obj-pair");
        var typ = el("select", "pc-edit-field");
        INV_VETEMENTS.concat(["hautbas"]).forEach(function (v) {
          var o = el("option", null, INV_NOMS[v]);
          o.value = v;
          if (v === it.vet) o.selected = true;
          typ.appendChild(o);
        });
        typ.addEventListener("change", function () {
          it.vet = typ.value;it.sousType=typ.value;
          if (!lieuPermis(it, it.ou)) it.ou = "sac";
          else if (INV_CASES.indexOf(it.ou) >= 0) deplace(it, it.ou);   // la robe prend aussi le bas
          render();
          refresh();
        });
        sousLigne.appendChild(fld("Sous-type", typ));
        // Huit lignes uniques « Valeur | Type d'effet », données d'origine
        // conservées pour les calculs de protection/résistance et les bonus.
        invChampsVetement(cv,it);
        invChampsPrerequis(cv,it);
        specifiquesSous.appendChild(cv);
      }

      // l'ACCESSOIRE : sa case, ses poches, sa protection
      if (it.acc) {
        var ca = carteNature();
        var pa = el("div", "pc-obj-pair");
        var tya = el("select", "pc-edit-field");
        Object.keys(INV_ACC_TYPES).forEach(function (v) {
          var o = el("option", null, INV_NOMS[v]);
          o.value = v;
          if (v === it.acc) o.selected = true;
          tya.appendChild(o);
        });
        tya.addEventListener("change", function () {
          it.acc = tya.value;it.sousType=tya.value;
          if (INV_EP.indexOf(it.ou) < 0 && !lieuPermis(it, it.ou)) it.ou = "sac";
          render();
          refresh();
        });
        sousLigne.appendChild(fld("Sous-type", tya));
        invChampsVetement(ca,it);
        invChampsPrerequis(ca,it);
        specifiquesSous.appendChild(ca);
      }

      // les EMPLACEMENTS d'une ceinture ou d'un sac : leur nombre, et
      // l'encombrance au plus de chacun. Les changer redessine les groupes.
      function champsEp() {
        var pe = el("div", "pc-obj-pair");
        pe.appendChild(champNombre("Accroches", function () { return it.ep; },
          function (v) { it.ep = Math.floor(pnum(v)); rangeEmplacements(items); }, "Nombre de points d'accroche"));
        pe.appendChild(invChoix(it.sac?"Taille ACC. max":"Taille maximale",[["","Non renseignée"]].concat(INV_TAILLES.map(function(t){return [t,t];})),it.tailleAccroche || (it.sac?"Moyenne":""),function(v){it.tailleAccroche=v;rangeEmplacements(items);render();}));
        Array.prototype.forEach.call(pe.querySelectorAll("input"), function (i) {
          i.addEventListener("change", function () { render(); });
        });
        return pe;
      }
      if (it.ceint) {
        var cc = carteNature();
        cc.appendChild(champsEp());
        specifiquesSous.appendChild(cc);
      }

      // la nourriture porte son VOLUME : ce qu'une dose ou une part occupe de
      // contenance une fois avalée
      if (invAvecEffets(it)) {
        var cn = carteNature();
        var pn = el("div", "pc-obj-pair");
        pn.appendChild(champNombre("Contenance", function () { return it.places; },
          function (v) { it.places = pnum(v); }, "Ce qu'une dose ou une part occupe de contenance"));
        pn.appendChild(champNombre("Temps (DA)",function(){return num(it.tempsConsommation,0);},function(v){it.tempsConsommation=pnum(v);}));
        cn.appendChild(pn);
        if(it.nourri){
          var nutrition=el("div","pc-obj-pair");
          ["ps","ph"].forEach(function(k){nutrition.appendChild(champNombre(k.toUpperCase(),function(){return num(it[k],0);},function(v){it[k]=snum(v);}));});
          cn.appendChild(nutrition);
        }
        specifiquesSous.appendChild(cn);
      }

      if (it.sac) {
        var cs = carteNature();
        var ps = el("div", "pc-obj-pair");
        ps.appendChild(champNombre("Capacité", function () { return it.cap; },
          function (v) { it.cap = pnum(v); }, "Capacité intérieure du sac, en L"));
        ps.appendChild(invChoix("Taille INT. max",[["","Non renseignée"]].concat(INV_TAILLES.map(function(t){return [t,t];})),invTailleMaxSac(it),function(v){it.tailleInterieure=v;rangeEmplacements(items);render();}));
        cs.appendChild(ps);
        cs.appendChild(champsEp());
        specifiquesSous.appendChild(cs);
      }

      // CONTENANT et CONTENU partagent exactement les mêmes catégories. Le
      // premier expose un slot sur sa tuile ; le second peut y entrer si et
      // seulement si les deux chaînes sont identiques.
      if (it.contenant) {
        var ct = carteNature();
        var pct = el("div", "pc-obj-pair");
        sousLigne.appendChild(fld("Sous-type",selCategorieStockage(it,"contenant")));
        pct.appendChild(champNombre("Emplacements",function(){return capaciteContenant(it);},
          function(v){it.emplacements=Math.max(0,Math.floor(pnum(v)));},
          "Nombre de contenus conseillés : le dépassement affiche un avertissement, sans blocage"));
        ct.appendChild(pct);
        var entreeCap=pct.querySelector("input");
        if(entreeCap)entreeCap.addEventListener("change",function(){render();});
        var dedans=contenusDans(it);
        if(dedans.length){
          var liste=el("div","pc-obj-container-contents");
          liste.appendChild(el("small",dedans.length>capaciteContenant(it)?"pc-obj-overflow":"", 
            "Contenus : "+dedans.length+" / "+capaciteContenant(it)+(dedans.length>capaciteContenant(it)?" — capacité dépassée":"")));
          dedans.forEach(function(child){var b=miniBtn(child.nom||"Contenu","Sélectionner ce contenu",function(){sel=child;render();});liste.appendChild(b);});
          ct.appendChild(liste);
        }
        specifiquesType.appendChild(ct);
      }
      if (it.contenu && invType(it)==="autre") {
        var ctu = carteNature();
        var pctu = el("div", "pc-obj-pair");
        pctu.appendChild(fld("Catégorie", selCategorieStockage(it, "contenu")));
        ctu.appendChild(pctu);
        specifiquesType.appendChild(ctu);
      }

      // L'ARME : cinq lignes de données, sans gestes ni boutons. Ses
      // rafraîchissements vont au registre du PANNEAU, vidé à chaque rendu :
      // sinon chaque clic sur une tuile laisserait des fonctions pointer sur un
      // détail disparu.
      if (it.arme && !fantome) {
        var ancien = hooks;
        hooks = panelHooks;
        try { specifiquesType.appendChild(carteArme(it, false, sousLigne)); }
        finally { hooks = ancien; }
      }

      var pair = el("div", "pc-obj-pair");
      pair.appendChild(champNombre("Poids", function () { return it.poids; },
        function (v) { it.poids = pnum(v); }));
      pair.appendChild(champNombre("Volume", function () { return it.encombre; },
        function (v) { it.volume = it.encombre = pnum(v); }, "En L"));
      body.appendChild(pair);
      var tailleMains=el("div","pc-obj-pair");
      tailleMains.appendChild(invChoix("Taille",[["","Non renseignée"]].concat(INV_TAILLES.map(function(t){return [t,t];})),it.taille||"",function(v){it.taille=v;rangeEmplacements(items);render();}));
      tailleMains.appendChild(invChoix("Mains",[[1,"1"],[2,"2"],["2 obligatoires","2 obligatoires"]],it.mains||1,function(v){
        var nouvellesMains=v==="2 obligatoires"?v:Number(v);
        // Occuper les deux mains AVANT de modifier le nombre requis : sinon
        // l'objet masquerait l'occupant de l'autre main durant l'échange.
        if(nouvellesMains==="2 obligatoires" && (it.ou==="mainG"||it.ou==="mainD"))deplace(it,"deuxMains");
        it.mains=nouvellesMains;if(it.arme)it.arme.mains=it.mains;
        rangeEmplacements(items);render();}));
      body.appendChild(tailleMains);

      // achat / vente, en pièces d'argent : la monnaie du livre est NOMMÉE
      var prix = el("div", "pc-obj-pair");
      prix.appendChild(champNombre("Prix d'achat", function () { return it.achat; },
        function (v) { it.achat = venteNum(v); majVente(); }, "Prix d'achat en " + monnaie(true)));
      // le prix de vente laissé vide est AUTOMATIQUE ; un nombre saisi, 0
      // compris, s'affiche tel quel
      var vIn = el("input", "pc-edit-field");
      vIn.type = "text"; vIn.inputMode = "decimal";
      vIn.placeholder = it.achat==null ? "Non renseigné" : "automatique";
      function majVente() {
        if (document.activeElement !== vIn) vIn.value = it.vente == null ? "" : fmtP(it.vente);
        vIn.title = "Prix de vente en " + monnaie(true) + (it.vente == null ? " : " + prixObjetTexte(it,true) : "");
      }
      majVente();
      vIn.addEventListener("input", function () { it.vente = venteNum(vIn.value); save(); refresh(); majVente(); });
      vIn.addEventListener("blur", majVente);
      prix.appendChild(fld("Prix de vente", vIn));
      body.appendChild(prix);

      // Identifiant visible ; image et fichier uniquement en édition.
      // L'identifiant reconnaît le même objet d'une fiche à l'autre quand on
      // le donne.
      var pairE = el("div", "pc-obj-pair pc-obj-media pc-edit-only");
      var idIn = el("input", "pc-edit-field");
      idIn.type = "text"; idIn.placeholder = "ex. iron_sword";
      idIn.value = it.id || "";
      idIn.addEventListener("input", function () { it.id = idIn.value; save(); });
      body.appendChild(fld("Identifiant", idIn));
      var url = el("input", "pc-edit-field");
      url.type = "text"; url.placeholder = "https://…";
      url.value = /^data:/.test(it.img) ? "" : it.img;
      url.addEventListener("change", function () { it.img = url.value.trim(); render(); refresh(); });
      var urlFld = fld("Image", url);
      var file = el("input");
      file.type = "file"; file.accept = "image/*"; file.style.display = "none";
      file.addEventListener("change", function () {
        var f = file.files && file.files[0];
        file.value = "";
        if (!f) return;
        vignette(f, function (data) { window.OwdInventoryData.isolate(items,it); it.img = data; render(); refresh(); });
      });
      urlFld.appendChild(file);
      pairE.appendChild(fld("Fichier",miniBtn("Choisir", "Importer une image (réduite en vignette 84 × 128)",
        function () { file.click(); })));
      pairE.insertBefore(urlFld,pairE.firstChild);
      body.appendChild(pairE);

      var desc = el("textarea", "pc-notes pc-edit-field");
      desc.rows = 3;
      desc.placeholder = "Description, effets, notes…";
      desc.value = it.desc;
      desc.addEventListener("input", function () { it.desc = desc.value; save(); });
      body.appendChild(fld("Description", desc, "w"));
      if(it.reglesManuelles && it.reglesManuelles.length){
        var rules=el("div","pc-obj-regles");rules.appendChild(el("div","lbl","Propriétés — gestion manuelle"));
        it.reglesManuelles.forEach(function(rule){rules.appendChild(el("div","pc-notes",rule));});body.appendChild(rules);
      }

      invChampsCommuns(specifiquesSous,it,render);
      if (specifiquesType.childNodes.length) body.insertBefore(specifiquesType, pair);
      if (sousLigne.childNodes.length) body.insertBefore(sousLigne, pair);
      if (specifiquesSous.childNodes.length) body.insertBefore(specifiquesSous, pair);
      // quantité : curseur à l'unité + champ, décimal (une demi-ration)
      var qRow = el("div", "pc-obj-qrow");
      var slider = el("input");
      slider.type = "range"; slider.min = "0";
      slider.max = String(Math.max(10, it.qte));
      slider.value = it.qte;
      slider.step = "1";   // à l'UNITÉ : on ne prend pas 3,27 fioles au curseur
      var qIn = el("input", "n");
      qIn.type = "number"; qIn.min = "0"; qIn.step = "any";
      qIn.value = it.qte;
      function setQte(v) {
        if(window.OwdInventoryData.equipped(it))return;
        if(window.__owdInventorySet)window.__owdInventorySet(it.ref);
        window.OwdInventoryData.isolateAncestors(items,it);
        it.qte = isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
        if (+slider.max < it.qte) slider.max = String(it.qte);
        if (document.activeElement !== slider) slider.value = it.qte;
        if (document.activeElement !== qIn) qIn.value = it.qte;
        majAct();
        var etaitEquipe=window.OwdInventoryData.equipped(it);
        save(); updateTotal();
        if(etaitEquipe)render();
        refresh();   // le poids porté vient de bouger : la charge suit
      }
      slider.addEventListener("input", function () { setQte(Math.round(parseFloat(slider.value))); });
      qIn.addEventListener("input", function () { setQte(parseFloat(qIn.value)); });

      qRow.appendChild(slider);
      qRow.appendChild(qIn);
      if(!window.OwdInventoryData.equipped(it))body.insertBefore(fld("Quantité", qRow), ligneNat.nextSibling);


      if (fantome) {
        Array.prototype.forEach.call(body.querySelectorAll("input, select, textarea, button"),
          function (x) { x.disabled = true; });
        panel.appendChild(body);
        prepareItemFields();applyItemEdit();
        return;
      }

      // quantité d'ACTION : combien d'exemplaires les boutons traitent. Elle
      // ne touche pas la pile tant qu'on n'agit pas.
      var actQte = el("input", "n");
      actQte.type = "number"; actQte.min = "0"; actQte.step = "any";
      actQte.title = "Quantité traitée par les boutons";
      function bornerAct() {
        var v = pnum(actQte.value);
        if (!v || v > it.qte) v = it.qte;
        return Math.round(v * 100) / 100;
      }
      function majAct() {
        actQte.max = String(it.qte);
        if (document.activeElement !== actQte)
          actQte.value = fmtP(Math.min(pnum(actQte.value) || it.qte, it.qte));
      }
      actQte.value = fmtP(it.qte);
      actQte.addEventListener("blur", function () { actQte.value = fmtP(bornerAct()); });

      var actions = el("div", "pc-obj-actions");
      if(!window.OwdInventoryData.equipped(it))actions.appendChild(fld("Quantité", actQte, "qact"));
      var montrer = miniBtn("Montrer", "Montrer cet objet dans le tchat", function () {
        montreObjet(it.ref, bornerAct());
      });
      actions.appendChild(montrer);
      if(invAvecEffets(it))actions.appendChild(miniBtn("Consommer",null,function(){invConsommerDialogue(it,bornerAct());}));
      actions.appendChild(miniBtn("Donner", "Donner cette quantité à un autre joueur", function () {
        donnerDialogue(it, bornerAct());
      }));
      function retireQte(q, tout) {
        window.OwdInventoryData.isolateAncestors(items,it);
        if (tout) {
          if(it.sac){var refs=window.OwdInventoryData.group(state.inv,it.ref).map(function(o){return o.ref;});
            for(var z=items.length-1;z>=0;z--)if(items[z]!==it&&refs.indexOf(items[z].ref)>=0)items.splice(z,1);}
          if (it.contenant) libereContenu(it, true);
          items.splice(items.indexOf(it), 1); sel = null;
        } else it.qte = Math.round((it.qte - q) * 100) / 100;
        render();
        refresh();
      }
      actions.appendChild(miniBtn("Séparer", "Créer une pile avec la quantité indiquée", function(){
        try{window.OwdInventoryData.split(items,it,bornerAct(),uid("o"));render();refresh();}catch(e){flash(e.message);}
      }));
      if(it.sac){var contents=el("div","pc-obj-tiles");
        var deposit=el("div","pc-obj-addtile","Ranger dans le sac");deposit.title="Déposer un objet dans ce sac, même retiré";contents.appendChild(deposit);
        deposit.addEventListener("dragover",function(e){if(drag&&drag!==it){e.preventDefault();e.stopPropagation();}});
        deposit.addEventListener("drop",function(e){if(!drag)return;e.preventDefault();e.stopPropagation();var d=drag;drag=null;
          if(window.OwdInventoryData.group(state.inv,d.ref).some(function(o){return o.ref===it.ref;})){flash("Un sac ne peut pas contenir lui-même.");return;}
          if(!invTailleAccepte(d.taille,invTailleMaxSac(it))){flash("Cet objet dépasse la taille intérieure du sac.");return;}
          window.OwdInventoryData.isolate(items,it);
          if(deplace(d,"sac")){d.dans=it.ref;d.emp=-1;render();refresh();}});
        items.forEach(function(o){if(o.dans===it.ref)contents.appendChild(tile(o));});
        body.appendChild(el("div","lbl","Contenu du sac"));body.appendChild(contents);
        body.appendChild(el("div","pc-modal-note","Glissez un objet vers les poches ou une case pour le sortir du sac. Poids total : "+fmtP(window.OwdInventoryData.weight(items,it))+" kg"));}
      actions.appendChild(miniBtn("Détruire", "Détruire cette quantité (tout : l'objet disparaît)", function () {
        var q = bornerAct();
        var tout = q >= it.qte;
        if (tout && (it.nom || it.desc)) {
          confirmer("Détruire un objet",
                    "Détruire « " + (it.nom || "cet objet") + " » de l'inventaire" + (it.sac ? " avec tout son contenu" : "") + " ?",
                    "Détruire", function () { retireQte(q, true); });
          return;
        }
        retireQte(q, tout);
      }, "danger"));
      actions.appendChild(miniBtn("Empiler", "Réunir les objets et contenus strictement identiques au même endroit", function(){
        var target=items.filter(function(o){return window.OwdInventoryData.canMerge(items,o,it);})[0];
        if(!target){flash("Aucune pile strictement identique à cet emplacement.");return;}
        sel=window.OwdInventoryData.merge(items,target,it);render();refresh();
      }));
      function avantEdition(e){if(qRow.contains(e.target)||actions.contains(e.target))return;
        if(e.target.matches && e.target.matches('input,select,textarea'))window.OwdInventoryData.isolate(items,it);}
      body.addEventListener("input",avantEdition,true);body.addEventListener("change",avantEdition,true);
      body.addEventListener("change",function(e){if(!actions.contains(e.target)&&body.isConnected){if(e.target.tagName==="SELECT")render();refresh();}});
      body.appendChild(actions);
      panel.appendChild(body);
      prepareItemFields();applyItemEdit();
    }

    function prepareItemFields(){
      panel.querySelectorAll(".pc-edit-field").forEach(function(n){n.classList.replace("pc-edit-field","pc-item-edit-field");});
      panel.querySelectorAll(".pc-edit-only").forEach(function(n){n.classList.replace("pc-edit-only","pc-item-edit-only");});
    }
    function applyItemEdit(){
      var allowed=!window.__owdCanEdit||window.__owdCanEdit();
      if(!allowed||!sel||items.indexOf(sel)<0)invEditionObjetLocale="";
      var editing=!!sel&&allowed&&invEditionObjetLocale===sel.ref;
      panel.classList.toggle("pc-item-editing",editing);
      panel.querySelectorAll(".pc-item-edit-field").forEach(function(n){n.disabled=!editing;});
      var button=panel.querySelector(".pc-item-gear");if(button){button.disabled=!sel||!allowed;button.title=editing?"Terminer les modifications de cet objet":"Modifier cet objet";button.setAttribute("aria-label",button.title);button.setAttribute("aria-pressed",String(editing));}
      majTextesLecture(panel);
    }

    // TOUTE LA HAUTEUR DE LA FENÊTRE (la page du site, ou l'iframe de Roll20),
    // moins le titre du module et son pied : défilé jusqu'à lui, le module
    // occupe l'écran entier, et ses deux colonnes défilent chacune dans cette
    // hauteur. Une fenêtre trop basse garde un plancher ; le module invisible
    // (onglet fermé) ne se mesure pas.
    function ajusteHauteur() {
      if (window.__owdVueInventaire) { wrap.style.removeProperty("--inv-h"); return; }
      if (!wrap.isConnected || !wrap.offsetParent) return;
      // l'en-tête FIXE du site (absent dans Roll20) couvre le haut de l'écran
      var fixe = document.querySelector(".md-header");
      var autour = (wrap.getBoundingClientRect().top - container.getBoundingClientRect().top) +
                   tot.offsetHeight + 28 + (fixe ? fixe.offsetHeight : 0);
      var h = Math.max(420, Math.floor(window.innerHeight - autour));
      wrap.style.setProperty("--inv-h", h + "px");
    }
    window.addEventListener("resize", ajusteHauteur);
    remontageNettoyage.push(function () { window.removeEventListener("resize", ajusteHauteur); });
    if (window.IntersectionObserver) {
      var observateurInventaire = new IntersectionObserver(function (e) { if (e[0] && e[0].isIntersecting) ajusteHauteur(); });
      observateurInventaire.observe(wrap);
      remontageNettoyage.push(function () { observateurInventaire.disconnect(); });
    }
    function render() {
      fermeMenu();
      window.OwdInventoryData.bind(items);
      if(sel && items.indexOf(sel)<0) sel=null;
      majGroupes = [];
      indexContenus();
      panelHooks.length = 0;
      leftBox.innerHTML = "";
      leftBox.appendChild(groupeSurSoi());
      leftBox.appendChild(groupeCeinture());
      leftBox.appendChild(groupeLibre("poches", "Poches", ebPoches, capPoches));
      if(window.OwdInventoryData.backpack(items)) leftBox.appendChild(groupeLibre("sac", "Sac à dos", ebSac, capSac));
      leftBox.appendChild(groupeLibre("terre", "PAR TERRE"));
      renderPanel();
      updateTotal();
      applyEdit(container, "inv");
      panelHooks.forEach(function (f) { try { f(); } catch (e) {} });
    }
    hooks.push(function () {
      ajusteHauteur();
      updateTotal();
      panelHooks.forEach(function (f) { try { f(); } catch (e) {} });
      applyItemEdit();
    });
    if (renderRef) renderRef.fn = render;
    invRender = render;   // un objet reçu du tchat redessine l'inventaire
    render();
    container.appendChild(wrap);
    container.appendChild(tot);
  }
