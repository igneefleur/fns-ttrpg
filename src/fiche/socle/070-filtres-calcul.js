  // ---------- filtres de calcul ----------
  // Un filtre intercepte une valeur DÉRIVÉE (total de caractéristique, PV max,
  // initiative…) juste après son calcul. Le calcul lui-même garde son nom
  // suffixé « Brut » ; le nom public appelle le brut, puis passe la valeur aux
  // filtres enregistrés pour ce nom. C'est par là qu'un mod change une règle de
  // calcul sans qu'on rouvre ce fichier, et sans avoir à réécrire le module qui
  // affiche la valeur : tout ce qui lit caracTotal() voit le même chiffre.
  //
  // Les CASCADES sont voulues, et elles tombent toutes seules : caracMod() lit
  // caracTotal(), compPlafond() lit caracMod(), et
  // jetBonus() lit tout le monde — un filtre posé sur la caractéristique se voit
  // donc jusque dans le jet d'une spécialité. De même, chargeMax() lit
  // caracMod() et les paliers de charge commandent l'initiative, la vitesse et
  // les sauts ; xpDepense() appelle compXp(). Les gardes ci-dessous sont par
  // NOM, jamais globales, pour ne pas couper ces chaînes-là.
  var filtres = {};            // nom -> [{ fn, prop, echecs }], ordre d'enregistrement
  var filtresEnCours = {};     // nom -> 1 pendant sa passe (garde de récursion)
  var FILTRE_FAUTES = 5;       // même seuil que la muselière des modules, même raison
  // À qui appartient ce qui s'enregistre : monteModules le pose autour du build
  // d'un module, l'exécution des mods autour du moteur. Hors de tout
  // propriétaire (console du navigateur), personne ne répond : « ? ».
  var proprietaireCourant = "?";
  // L'id du mod que le moteur est en train de lancer, ou null. Différent de
  // proprietaireCourant, qui vaut aussi pendant le build d'un module natif.
  var modEnExec = null;
  var PROP_MOD = "mod";        // repli quand le moteur ne nomme pas le mod qui tourne
  // Vrai pendant un montage. Ce qui s'enregistre HORS d'un montage (console du
  // navigateur, script tiers chargé après la fiche) n'a personne pour le
  // rejouer après la remise à zéro du prochain mount() : on le garde ici.
  var enMontage = false;
  // { mod: module, prop } ou { nom, fn, prop } pour un filtre : chaque entrée
  // dit à QUI elle est, faute de quoi rien ne saurait plus l'en défaire
  var horsMontage = [];
  // Les dix points de filtre. La table ne sert qu'à prévenir d'un nom mal
  // tapé : un filtre posé sur « pvmax » ne serait jamais appelé, et rien ne le
  // dirait.
  // ILS SUIVENT LES RÈGLES. Chaque nom est un point de calcul qu'un mod peut
  // détourner ; ils ont donc changé avec le système, et un mod écrit pour
  // l'ancien se verra prévenir plutôt que d'agir dans le vide.
  var FILTRES_CONNUS = {
    caracTotal: 1, caracMod: 1, caracLim: 1,
    compValue: 1, compPlafond: 1, compXp: 1,
    spePts: 1, jetBonus: 1,
    pvMax: 1, enduranceMax: 1, enduranceMalus: 1, recupJour: 1,
    initiative: 1, vitesse: 1, sautLong: 1, sautHaut: 1,
    poidsPorte: 1, chargeMax: 1, xpDepense: 1
  };
  // Appartenance RÉELLE à une table nommée par une chaîne venue d'ailleurs (mod,
  // état importé). Sans elle, un nom comme « toString » répond « oui » depuis
  // Object.prototype, et la suite manipule une méthode en croyant tenir une
  // donnée : c'est la façon la plus bête de casser un montage.
  function aClef(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
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
    // comptait double (+20, +40, +60…), sans que rien ne le montre. Même
    // nom, même propriétaire, même texte de fonction : c'est le même filtre,
    // et le reposer ne veut pas dire le vouloir deux fois.
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
  // Ce qui attend le prochain montage porte son PROPRIÉTAIRE (celui du filtre,
  // l'id du module pour un enregistrement) et ne s'inscrit qu'UNE FOIS. Sans ce
  // second point, un bouton qui repose le même filtre à chaque clic l'empile :
  // deux clics et le bonus compte double, à chaque montage, pour toujours.
  //
  // COMPARER LES FONCTIONS PAR RÉFÉRENCE NE SUFFIT PAS, et c'est le piège qui a
  // laissé passer ce défaut une première fois : « function (v) { return v + 20; } »
  // écrit DANS un gestionnaire de clic fabrique un objet NEUF à chaque clic.
  // Deux entrées identiques à la lettre près étaient donc jugées différentes et
  // s'empilaient (+20, +40, +60…). On compare donc aussi le TEXTE de la
  // fonction. Deux filtres vraiment distincts qui s'écriraient caractère pour
  // caractère pareil se confondraient, mais poser deux fois le même calcul pour
  // qu'il compte double n'est pas un usage : l'empilement sans fin, si.
  function signeFn(fn) {
    try { return String(fn); } catch (e) { return ""; }
  }
  function gardeHorsMontage(e) {
    if (!e.mod) e.src = signeFn(e.fn);
    // l'état des mods AU MOMENT du dépôt : le rejeu s'en sert pour savoir si la
    // liste a bougé depuis (voir rejoueHorsMontage)
    e.sig = signatureAuMontage;
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
  // Rejoué au début de chaque montage, dans l'ordre : le contrat promet qu'un
  // Mia.filtre ou un Mia.enregistre lancé depuis la console vaut « pour le
  // montage suivant » — et pour tous ceux d'après, rien d'autre ne le rejoue.
  //
  // Mais seulement ce qui a encore un ayant droit. Ce qui appartient à un MOD ne
  // se rejoue que tant que ce mod est sur le personnage, actif et accordé :
  // sinon le filtre posé par le bouton d'un mod refusé, coupé ou supprimé
  // continuerait de fausser les calculs à chaque montage, sans un mot et sans
  // rien pour le défaire — seul un rechargement complet de la page en viendrait
  // à bout, geste que le joueur n'a pas dans l'iframe Roll20. Le bilan du
  // montage précédent sert encore ici, c'est lui qui reconnaît un id de mod :
  // executeMods ne le remplace qu'après. Le propriétaire « ? » (console du
  // navigateur) est promis par le contrat, il se rejoue toujours.
  // Ce que les mods du personnage donnent à voir : leurs id, leur interrupteur
  // et l'accord du navigateur. Il change dès qu'un mod est ajouté, retiré,
  // coupé, autorisé ou refusé — et c'est exactement à ces moments-là que ce qui
  // n'a PAS d'ayant droit connu doit cesser d'être rejoué.
  function signatureMods() {
    var l = (state && Array.isArray(state.mods)) ? state.mods : [];
    return l.map(function (m) {
      return String(m.id) + ":" + (m.actif !== false ? "1" : "0") + ":" + avisMod(empreinteMod(m.id, m.src));
    }).join("|");
  }
  var signatureAuMontage = null;
  function rejoueHorsMontage() {
    var sig = signatureMods();
    var reste = [];
    horsMontage.forEach(function (h) {
      if (propEstUnMod(h.prop) && !modAutorise(h.prop)) return;
      // LE FILET. Un mod qui pose un filtre depuis un setTimeout, ou depuis un
      // écouteur qu'il a accroché lui-même, échappe à toute attribution : son
      // propriétaire vaut « ? », comme une ligne tapée dans la console, que le
      // contrat promet de conserver. On ne peut pas distinguer les deux — mais
      // on peut refuser de rejouer un « ? » anonyme dès que la liste des mods a
      // BOUGÉ. Le joueur qui refuse, coupe ou supprime un mod voit alors partir
      // ce que ce mod avait installé, quel qu'en soit le chemin. Une mise au
      // point à la console, elle, ne touche pas aux mods : elle survit.
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
  // pour cette passe (la valeur d'avant continue son chemin) et compte une
  // faute ; cinq fautes de SUITE et il part, parce qu'un filtre cassé fausserait
  // chaque calcul de la fiche sans que personne ne sache d'où vient le chiffre.
  // Une passe sans faute remet son compteur à zéro.
  function applique(nom, valeur, infos) {
    var liste = filtres[nom];
    if (!liste || !liste.length) return valeur;
    // Garde de récursion : pendant la passe, tout nouvel appel au MÊME calcul
    // rend le brut. Sans elle, un filtre qui lit ctx.calculs.caracTotal se
    // rappellerait sans fin et figerait l'onglet.
    if (filtresEnCours[nom]) return valeur;
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
    // le propriétaire porte l'erreur : c'est ce que Mia.etat(id) rend, et ce
    // que les listes de mods et de modules affichent
    etatModule(f.prop).erreur = texte;
  }
  // Mia.filtre : le propriétaire est celui du moment. ctx.filtreCalcul, lui,
  // fige l'id de son module à la construction du contexte (un module qui pose
  // un filtre depuis un bouton, longtemps après son build, reste chez lui).
  function filtreCalcul(nom, fn) { ajouteFiltre(nom, fn, proprietaireCourant); }

