  // ---- mods : le code ajouté au personnage ----
  // Ce bloc dit ce que chaque mod fait (ou pourquoi il ne fait rien), donne de
  // quoi trancher, et permet d'en écrire un. Le moteur (jjk-mods.js) juge,
  // exécute et range les accords ; sans lui, ce bloc se contente de le dire.
  //
  // Aucun bac à sable : un mod autorisé tourne dans la page de la fiche avec
  // exactement ses droits. Les textes d'ici ne doivent jamais laisser croire
  // autre chose.
  var ETATS_MOD = {
    ok: "tourne",
    panne: "en panne",
    attente: "en attente d'autorisation",
    coupe: "coupé",
    recent: "trop récent",
    refuse: "refusé sur ce navigateur"
  };
  function moteurMods() {
    return (window.JjkMods && typeof window.JjkMods.execute === "function") ? window.JjkMods : null;
  }
  function bilanDeMod(id) {
    for (var i = 0; i < bilanMods.length; i++) if (bilanMods[i].id === id) return bilanMods[i];
    return null;
  }
  // Le moteur fait foi pour l'empreinte comme pour l'avis : la recalculer ici
  // ferait deux règles pour une seule décision, et un mod se remettrait à
  // demander l'autorisation dès que les deux dérivent d'un caractère.
  function empreinteMod(id, src) {
    var mm = moteurMods();
    try { return mm ? mm.empreinte(id, src) : ""; } catch (e) { return ""; }
  }
  function avisMod(emp) {
    var mm = moteurMods();
    try { return mm ? mm.avis(emp) : ""; } catch (e) { return ""; }
  }
  // Même règle d'id que le moteur (idPropre) et que normalize() : les trois
  // chemins doivent donner le MÊME id, sans quoi l'empreinte changerait selon
  // le chemin pris et le joueur réautoriserait un mod qu'il connaît déjà.
  function idMod(v) {
    return String(v == null ? "" : v).toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  }
  // Un « pour » illisible est SILENCIEUSEMENT oublié par le moteur : autant le
  // dire tout de suite, sinon le joueur croit avoir posé un garde-fou qui
  // n'existe pas. La règle de lecture est CELLE DU MOTEUR, jamais une copie
  // locale : cette fonction tenait sa propre expression régulière, restée en
  // arrière quand le suffixe de beta est apparu, et le formulaire refusait
  // alors le numéro qu'il proposait lui-même en filigrane.
  function versionLisible(v) {
    var mm = window.JjkMods;
    // Sans moteur, le bloc Mods n'affiche même pas ce formulaire : ce repli ne
    // sert qu'au moteur trop ancien pour exporter sa lecture. Laisser passer
    // vaut mieux que refuser au nom d'une règle qu'on ne connaît plus, et le
    // moteur garde de toute façon le champ tel quel.
    if (!mm || typeof mm.lireVersion !== "function") return true;
    try { return !!mm.lireVersion(v); } catch (e) { return true; }
  }
  // Le formulaire d'un mod, celui de l'ajout comme celui de la modification.
  // « appliquer » reçoit des valeurs déjà validées ; rendre false laisse le
  // dialogue ouvert, avec le message qui dit pourquoi.
  function formulaireMod(base, titre, libelleValider, appliquer) {
    base = base || {};
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "Ce code tourne dans la page de la fiche, avec les mêmes droits qu'elle : il n'y a pas de bac à sable. " +
      "Il part avec le personnage, et les autres joueurs auront à l'autoriser chez eux avant qu'il ne tourne."));
    var nom = el("input");
    nom.type = "text";
    nom.value = base.nom || "";
    var id = el("input");
    id.type = "text";
    id.value = base.id || "";
    // l'id se déduit du nom TANT QUE personne n'y a touché : un id corrigé à la
    // main ne doit pas se faire réécrire à la frappe suivante
    var idTenu = !!base.id;
    nom.addEventListener("input", function () { if (!idTenu) id.value = idMod(nom.value); });
    id.addEventListener("input", function () { idTenu = true; });
    var src = el("textarea", "pc-code");
    src.value = base.src || "";
    src.spellcheck = false;
    var pour = el("input");
    pour.type = "text";
    pour.placeholder = RELEASE;
    pour.value = base.pour || "";
    corps.appendChild(fld("Nom", nom));
    corps.appendChild(fld("Identifiant", id));
    corps.appendChild(fld("Code JavaScript (Jjk, ctx)", src));
    corps.appendChild(fld("Pour la fiche, au moins (facultatif)", pour));
    dialogue(titre, corps, function () {
      var vid = idMod(id.value) || idMod(nom.value);
      var vp = String(pour.value == null ? "" : pour.value).trim();
      var pris = false;
      if (!vid) { flash("Il faut un identifiant : des lettres, des chiffres ou des tirets."); return false; }
      (state.mods || []).forEach(function (x) { if (x !== base && x.id === vid) pris = true; });
      if (pris) { flash("L'identifiant « " + vid + " » est déjà pris par un autre mod."); return false; }
      if (vp && !versionLisible(vp)) {
        flash("« Pour la fiche » attend un numéro de version, comme " + RELEASE + ".");
        return false;
      }
      appliquer(vid, String(nom.value == null ? "" : nom.value).trim() || vid,
                String(src.value == null ? "" : src.value), vp);
    }, libelleValider);
  }
  function ajouteMod() {
    formulaireMod(null, "Ajouter un mod", "Ajouter", function (id, nom, src, pour) {
      var neuf = { id: id, nom: nom, actif: true, src: src };
      if (pour) neuf.pour = pour;
      if (!Array.isArray(state.mods)) state.mods = [];
      state.mods.push(neuf);
      // Le joueur vient de le taper : il n'a pas à s'autoriser lui-même. Le oui
      // porte sur CE code et sur ce navigateur seulement ; retoucher le mod
      // change son empreinte, donc le fait redemander, et il ne vaut rien chez
      // les autres joueurs.
      decideMod(empreinteMod(id, src), "oui");
      save();
      remount();
      flash("Mod « " + nom + " » ajouté.");
    });
  }
  function modifieMod(m) {
    var avant = empreinteMod(m.id, m.src);
    formulaireMod(m, "Modifier « " + (m.nom || m.id) + " »", "Enregistrer",
      function (id, nom, src, pour) {
        m.id = id;
        m.nom = nom;
        m.src = src;
        if (pour) m.pour = pour; else delete m.pour;
        var apres = empreinteMod(id, src);
        // Le oui ne se pose QUE si l'empreinte a changé : le joueur vient alors
        // d'écrire ce code, et sans lui son propre mod lui redemanderait
        // l'autorisation à l'instant. Ouvrir puis refermer l'éditeur sans rien
        // toucher, en revanche, ne décide de rien : cela écrasait un refus
        // sans un mot, alors que la note du formulaire promet l'inverse.
        if (apres && apres !== avant) decideMod(apres, "oui");
        save();
        remount();
        flash("Mod « " + nom + " » enregistré.");
      });
  }
  // LIRE le code d'un mod ne doit pas supposer d'ouvrir l'éditeur : « Modifier »
  // sert à écrire, et valider son formulaire vaut accord. Ici rien ne bouge tant
  // que le joueur ne tranche pas, et les deux boutons sont là pour qu'il puisse
  // trancher en connaissance de cause.
  function voirMod(m) {
    var emp = empreinteMod(m.id, m.src);
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "Un mod autorisé tourne dans la page de la fiche, avec les mêmes droits qu'elle : " +
      "il n'y a pas de bac à sable. Lire ce code ne décide de rien."));
    var ligne = el("div", "pc-modrow");
    ligne.appendChild(el("span", "nom", m.nom || m.id));
    ligne.appendChild(el("span", "id", m.id));
    corps.appendChild(ligne);
    var ta = el("textarea", "pc-code");
    ta.readOnly = true;
    ta.spellcheck = false;
    ta.value = String(m.src == null ? "" : m.src);
    corps.appendChild(ta);
    var boutons = el("div", "row");
    boutons.appendChild(miniBtn("Autoriser", "Ce code tournera à chaque ouverture, sur ce navigateur", function () {
      decideMod(emp, "oui");
      remount();
    }));
    boutons.appendChild(miniBtn("Refuser", "Ce code ne tournera pas ; il reste sur le personnage", function () {
      decideMod(emp, "non");
      remount();
    }, "danger"));
    corps.appendChild(boutons);
    // le dialogue ne valide rien : ses deux boutons ont déjà tout dit
    dialogue("Code de « " + (m.nom || m.id) + " »", corps, function () {}, "Fermer");
  }
  function supprimeMod(m) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "Le mod et son code quittent le personnage. Ce qu'il a déjà écrit dans la fiche reste ; " +
      "l'accord donné à ce code sur ce navigateur reste lui aussi, et vaudrait encore si le mod revenait."));
    dialogue("Supprimer « " + (m.nom || m.id) + " » ?", corps, function () {
      var i = state.mods.indexOf(m);
      if (i >= 0) state.mods.splice(i, 1);
      save();
      remount();
      flash("Mod supprimé.");
    }, "Supprimer");
  }
  // UNE LIGNE, ET LE MOINS DE BOUTONS POSSIBLE.
  //
  // Il y en avait cinq, plus trois textes, et la ligne se repliait n'importe
  // comment. Deux d'entre eux, « Autoriser » et « Refuser », sont les deux
  // faces d'une même question : ils deviennent UNE puce, qui se lit comme
  // celle d'à côté. Les deux gestes de construction, « Modifier » et
  // « Supprimer », passent derrière le rouage du bloc, comme partout ailleurs
  // sur la fiche.
  //
  // Reste en permanence ce qu'on regarde tous les jours : le nom, l'état, de
  // quoi LIRE le code, et les deux interrupteurs.
  //
  // Les deux puces ne disent PAS la même chose, et c'est pour cela qu'elles
  // sont deux :
  //   « Actif »    appartient au PERSONNAGE et voyage avec lui ;
  //   « Autorisé » appartient à CE NAVIGATEUR et n'en sort jamais.
  // L'infobulle de chacune le dit en toutes lettres.
  function ligneMod(m) {
    var ligne = el("div", "pc-modrow pc-modrow-mod");
    ligne.dataset.id = m.id;
    var bil = bilanDeMod(m.id);
    var etat = bil ? bil.etat : "";
    var emp = empreinteMod(m.id, m.src);
    var avis = avisMod(emp);
    var on = m.actif !== false;
    var barre = el("div", "l");
    ligne.appendChild(barre);

    // l'identifiant ne s'affiche plus : il ne parle qu'au code, il est dans le
    // dialogue de lecture et dans celui de modification, et il volait la place
    // qui manquait pour tenir sur une ligne
    // L'ÉTAT NE S'ÉCRIT PLUS SUR LA LIGNE : les deux puces le disent déjà.
    // « tourne » quand les deux sont allumées, « coupé » quand Actif est
    // éteinte, « refusé » quand Autorisé l'est. Le mot en gris répétait ce que
    // l'oeil voyait, et prenait la place du nom. Il reste dans l'infobulle,
    // avec l'identifiant, pour les deux cas qu'une puce ne distingue pas : en
    // attente et refusé s'éteignent pareil.
    var nom = el("span", "nom", m.nom || m.id);
    nom.title = (m.nom || m.id) + " · identifiant " + m.id + " · " +
                (aClef(ETATS_MOD, etat) ? ETATS_MOD[etat] : "état inconnu");
    barre.appendChild(nom);
    // La panne, elle, garde son marquage : le liseré rouge de la ligne et le
    // message du moteur en dessous. C'est la seule chose qu'une puce ne dit pas.
    if (etat === "panne") ligne.setAttribute("data-etat", "panne");

    // Lire d'abord : c'est le geste qu'on attend de celui qui reçoit le code
    // d'un autre, et il ne décide de rien.
    barre.appendChild(miniBtn("Voir le code", "Lire le code de ce mod sans y toucher", function () {
      voirMod(m);
    }, "voir"));

    var puceA = el("span", "pc-chip", "Actif");
    puceA.title = "Sur LE PERSONNAGE, et voyage avec lui : couper ce mod le met " +
                  "en veille pour tout le monde, sans rien effacer.";
    puceA.classList.toggle("on", on);
    puceA.addEventListener("click", function () {
      m.actif = !on;
      save();
      remount();
    });
    barre.appendChild(puceA);

    var puceO = el("span", "pc-chip", "Autorisé");
    puceO.title = avis === "oui"
      ? "Sur CE NAVIGATEUR seulement : retirer l'accord, le code cessera de tourner ici."
      : "Sur CE NAVIGATEUR seulement : donner l'accord, le code tournera à chaque ouverture.";
    puceO.classList.toggle("on", avis === "oui");
    puceO.addEventListener("click", function () {
      decideMod(emp, avis === "oui" ? "non" : "oui");
      remount();
    });
    barre.appendChild(puceO);

    // Modifier et supprimer sont des gestes de CONSTRUCTION : ils ne s'offrent
    // que le rouage du bloc ouvert, comme les compétences et l'inventaire.
    // pc-edit-only, et non un test à la construction : le rouage bascule une
    // classe sur le bloc, il ne rebâtit pas ses lignes.
    barre.appendChild(miniBtn("Modifier", "Changer le nom, l'identifiant ou le code", function () {
      modifieMod(m);
    }, "pc-edit-only"));
    barre.appendChild(miniBtn("Supprimer", "Retirer ce mod du personnage", function () {
      supprimeMod(m);
    }, "danger pc-edit-only"));

    // Le message du moteur (la panne à réparer, la version qui manque) : c'est
    // tout ce que le joueur a pour comprendre, il prend sa propre ligne.
    if (bil && bil.message) ligne.appendChild(el("div", "pc-block-note", bil.message));
    return ligne;
  }
  function buildMods() {
    // le rouage ouvre les gestes de construction (modifier, supprimer)
    var b = block("Mods", null, "mods");
    // AUCUNE explication en tête de bloc. La fiche montre les données du
    // personnage, pas un mode d'emploi : ce qu'il faut savoir avant d'autoriser
    // du code est dit là où la décision se prend (le dialogue d'examen et le
    // formulaire), et le reste est dans la page Mods du livre.
    // Le moteur est facultatif de naissance (un repli gelé peut ne charger que
    // le bundle) : sans lui, on le dit et on ne propose rien qui n'aurait aucun
    // effet — un mod ajouté ici n'aurait ni empreinte ni accord possible.
    if (!moteurMods()) {
      b.appendChild(el("div", "pc-empty",
        "Le moteur de mods n'est pas chargé : les mods du personnage sont conservés tels quels, aucun ne tourne."));
      return b;
    }
    var mods = Array.isArray(state.mods) ? state.mods : [];
    var box = el("div");
    mods.forEach(function (m) { box.appendChild(ligneMod(m)); });
    if (!mods.length) box.appendChild(el("div", "pc-empty", "Aucun mod sur cette fiche personnage."));
    b.appendChild(box);
    var tools = el("div", "pc-comp-tools");
    var line = el("div", "row");
    line.appendChild(miniBtn("Ajouter un mod", "Écrire un mod pour ce personnage", ajouteMod));
    tools.appendChild(line);
    b.appendChild(tools);
    return b;
  }

