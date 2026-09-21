  // ---------- filtres de calcul ----------
  // Un filtre intercepte une valeur DÉRIVÉE (total de caractéristique, PV max,
  // niveau d'effondrement…) juste après son calcul. Le calcul lui-même garde
  // son nom suffixé « Brut » ; le nom public appelle le brut, puis passe la
  // valeur aux filtres enregistrés pour ce nom. C'est par là qu'un mod change
  // une règle de calcul sans qu'on rouvre ce fichier, et sans réécrire le
  // module qui affiche la valeur : tout ce qui lit pvMax() voit le même chiffre.
  //
  // Les CASCADES sont voulues et tombent toutes seules : pvMaxAuto() appelle
  // effondrement() qui appelle prMax() qui appelle caracTotal(). Les gardes
  // sont donc par NOM, jamais globales, pour ne pas couper ces chaînes-là.
  //
  // ET L'EFFONDREMENT NE BOUCLE PAS : il se calcule sur PR, PS, PH et
  // l'exposition, dont les maximums ne dépendent QUE des caractéristiques.
  // Seuls PV MAX et PE MAX dépendent de lui. Un filtre de mod posé sur
  // « effondrement » qui lirait ctx.calculs.pvMax refermerait la boucle : c'est
  // la garde par nom qui l'attrape, en rendant le brut au second appel.
  var filtres = {};            // nom -> [{ fn, prop, echecs, src }]
  var filtresEnCours = {};     // nom -> 1 pendant sa passe (garde de récursion)
  var FILTRE_FAUTES = 5;       // même seuil que la muselière, même raison
  // À qui appartient ce qui s'enregistre : monteModules le pose autour du build
  // d'un module, l'exécution des mods autour du moteur. Hors de tout
  // propriétaire (console du navigateur), personne ne répond : « ? ».
  var proprietaireCourant = "?";
  var modEnExec = null;        // l'id du mod que le moteur lance, ou null
  var PROP_MOD = "mod";        // repli quand le moteur ne nomme pas le mod
  // Vrai pendant un montage. Ce qui s'enregistre HORS d'un montage (console du
  // navigateur, script tiers chargé après la fiche) n'a personne pour le
  // rejouer après la remise à zéro du prochain mount() : on le garde ici.
  var enMontage = false;
  var horsMontage = [];
  // Les points de filtre d'Outward. LA TABLE N'EST LÀ QUE POUR PRÉVENIR D'UN
  // NOM MAL TAPÉ : un filtre posé sur « pvmax » ne serait jamais appelé, et
  // rien ne le dirait. Un nom hors table passe quand même, avec un avertissement.
  var FILTRES_CONNUS = {
    caracTotal: 1, compBonus: 1, compDes: 1, compXp: 1,
    pvMax: 1, peMax: 1, pmMax: 1, piMax: 1, prMax: 1, psMax: 1, phMax: 1, pcMax: 1,
    charge: 1, accesRapides: 1, contenance: 1, expoMax: 1, effondrement: 1,
    poidsPorte: 1, desAction: 1, ruptureMax: 1, xpDepense: 1
  };
  function ajouteFiltre(nom, fn, prop) {
    nom = String(nom == null ? "" : nom);
    if (typeof fn !== "function" || !nom) return;
    prop = prop || "?";
    if (!aClef(FILTRES_CONNUS, nom) && window.console && window.console.warn)
      window.console.warn("[mod:" + prop + "] filtre " + nom + " inconnu : il ne sera jamais appelé.");
    if (!aClef(filtres, nom)) filtres[nom] = [];
    // DÉDOUBLONNAGE DANS LE REGISTRE LUI-MÊME, et pas seulement dans ce qui
    // attend le montage suivant. Un bouton de mod qui repose son filtre à
    // chaque clic l'empilait DANS LE MÊME MONTAGE : deux clics et le bonus
    // comptait double (+2, +4, +6…), sans que rien ne le montre.
    var texte = signeFn(fn);
    var liste = filtres[nom];
    for (var i = 0; i < liste.length; i++) {
      if (liste[i].prop === prop && (liste[i].fn === fn || (texte && liste[i].src === texte))) {
        liste[i].fn = fn;
        liste[i].echecs = 0;
        if (!enMontage) gardeHorsMontage({ nom: nom, fn: fn, prop: prop });
        return;
      }
    }
    liste.push({ fn: fn, prop: prop, echecs: 0, src: texte });
    if (!enMontage) gardeHorsMontage({ nom: nom, fn: fn, prop: prop });
  }
  // COMPARER LES FONCTIONS PAR RÉFÉRENCE NE SUFFIT PAS : « function (v) {
  // return v + 2; } » écrit DANS un gestionnaire de clic fabrique un objet NEUF
  // à chaque clic. On compare donc aussi le TEXTE de la fonction. Deux filtres
  // vraiment distincts écrits caractère pour caractère pareil se confondraient,
  // mais poser deux fois le même calcul pour qu'il compte double n'est pas un
  // usage : l'empilement sans fin, si.
  function signeFn(fn) { try { return String(fn); } catch (e) { return ""; } }
  function gardeHorsMontage(e) {
    if (!e.mod) e.src = signeFn(e.fn);
    e.sig = signatureAuMontage;   // l'état des mods AU MOMENT du dépôt
    for (var i = 0; i < horsMontage.length; i++) {
      var h = horsMontage[i];
      // un module se REMPLACE à son id (c'est ce que fait enregistre) ; un
      // filtre se reconnaît à son nom, son propriétaire et son texte
      if (e.mod || h.mod) {
        if (e.mod && h.mod && h.mod.id === e.mod.id) { horsMontage[i] = e; return; }
        continue;
      }
      if (h.nom === e.nom && h.prop === e.prop &&
          (h.fn === e.fn || (e.src && h.src === e.src))) { horsMontage[i] = e; return; }
    }
    horsMontage.push(e);
  }
  // Ce que les mods du personnage donnent à voir : leurs id, leur interrupteur
  // et l'accord du navigateur. Elle change dès qu'un mod est ajouté, retiré,
  // coupé, autorisé ou refusé — et c'est exactement à ces moments-là que ce qui
  // n'a PAS d'ayant droit connu doit cesser d'être rejoué.
  function signatureMods() {
    var l = (state && Array.isArray(state.mods)) ? state.mods : [];
    return l.map(function (m) {
      return String(m.id) + ":" + (m.actif !== false ? "1" : "0") + ":" + avisMod(empreinteMod(m.id, m.src));
    }).join("|");
  }
  var signatureAuMontage = null;
  // Rejoué au début de chaque montage : le contrat promet qu'un Owd.filtre ou
  // un Owd.enregistre lancé depuis la console vaut « pour le montage suivant »,
  // et pour tous ceux d'après. Mais seulement ce qui a encore un AYANT DROIT :
  // le filtre posé par le bouton d'un mod refusé, coupé ou supprimé
  // continuerait sinon de fausser les calculs à chaque montage, sans un mot et
  // sans rien pour le défaire — seul un rechargement complet de la page en
  // viendrait à bout, geste que le joueur n'a pas dans l'iframe Roll20.
  function rejoueHorsMontage() {
    var sig = signatureMods();
    var reste = [];
    horsMontage.forEach(function (h) {
      if (propEstUnMod(h.prop) && !modAutorise(h.prop)) return;
      // LE FILET. Un mod qui pose un filtre depuis un setTimeout échappe à
      // toute attribution : son propriétaire vaut « ? », comme une ligne tapée
      // à la console, que le contrat promet de conserver. On ne peut pas
      // distinguer les deux — mais on peut refuser de rejouer un « ? » anonyme
      // dès que la liste des mods a BOUGÉ. Une mise au point à la console, elle,
      // ne touche pas aux mods : elle survit.
      if (h.prop === "?" && signatureAuMontage !== null && h.sig !== sig) return;
      reste.push(h);
      if (h.mod) enregistre(h.mod);
      else ajouteFiltre(h.nom, h.fn, h.prop);
    });
    horsMontage = reste;
    signatureAuMontage = sig;
  }
  function aFiltre(nom) {
    var l = filtres[nom];
    return !!(l && l.length);
  }
  // La passe : chaque filtre reçoit la valeur rendue par le précédent. Un
  // filtre qui jette, ou qui rend autre chose qu'un nombre fini, est IGNORÉ
  // pour cette passe et compte une faute ; cinq fautes de SUITE et il part,
  // parce qu'un filtre cassé fausserait chaque calcul de la fiche sans que
  // personne ne sache d'où vient le chiffre.
  function applique(nom, valeur, infos) {
    var liste = filtres[nom];
    if (!liste || !liste.length) return valeur;
    if (filtresEnCours[nom]) return valeur;   // garde de récursion, PAR NOM
    filtresEnCours[nom] = 1;
    try {
      var i = 0;
      while (i < liste.length) {
        var f = liste[i], v = null, msg = "";
        try { v = f.fn(valeur, infos); }
        catch (err) { msg = messageErreur(err); }
        if (!msg && typeof v === "number" && isFinite(v)) {
          valeur = v;
          f.echecs = 0;
          i++;
          continue;
        }
        if (!msg) msg = typeof v === "number" ? "résultat non fini" : "résultat de type " + (typeof v);
        f.echecs++;
        if (f.echecs < FILTRE_FAUTES) { i++; continue; }
        liste.splice(i, 1);   // retiré : le suivant a pris la place, i ne bouge pas
        retireFiltre(nom, f, msg);
      }
    } finally { filtresEnCours[nom] = 0; }
    return valeur;
  }
  function retireFiltre(nom, f, msg) {
    var texte = "filtre " + nom + " retiré : " + msg;
    if (window.console && window.console.warn)
      window.console.warn("[mod:" + f.prop + "] " + texte);
    // le propriétaire porte l'erreur : c'est ce que Owd.etat(id) rend, et ce
    // que les listes de mods et de modules affichent
    etatModule(f.prop).erreur = texte;
  }
  // Owd.filtre : le propriétaire est celui du moment. ctx.filtreCalcul, lui,
  // fige l'id de son mod à la construction du contexte.
  function filtreCalcul(nom, fn) { ajouteFiltre(nom, fn, proprietaireCourant); }
  // le passage public d'un calcul : le brut, puis les filtres. Le test évite de
  // fabriquer l'objet d'infos pour rien — ces calculs sont rappelés des
  // centaines de fois par rafraîchissement.
  function pub(nom, valeur, infos) {
    return aFiltre(nom) ? applique(nom, valeur, infos || {}) : valeur;
  }

