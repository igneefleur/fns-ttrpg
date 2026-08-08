
  // ---------- réglages ----------
  // Tout ce que le MJ (ou n'importe qui, les droits Roll20 sont par personnage)
  // règle une fois par campagne : qui joue, sur quel fond, et combien de jetons
  // chacun reçoit au début d'une session.
  //
  // C'est un DIALOGUE posé sur le plateau, et non plus un voile opaque qui le
  // remplaçait : on règle qui joue en voyant la table. Les deux gestes qui
  // effacent les positions de tout le monde (distribuer, tout ramasser) ont leur
  // propre bloc « Session » : ce ne sont pas des réglages, ce sont des gestes de
  // partie, et ils n'ont rien à faire dans la même rangée que « Enregistrer ».
  // LES RÉGLAGES DEMANDENT DE LA PLACE, ET LE CADRE LA DONNE. Le plateau vit
  // dans une iframe dont la taille est fixée par l'extension : un dialogue ne
  // peut pas en sortir, et serré dans une colonne ancrée à la barre d'outils il
  // devenait illisible. On demande donc au cadre de s'agrandir et de se centrer
  // le temps du réglage, puis de reprendre sa place.
  //
  // Si personne n'écoute — page ouverte hors de Roll20, extension plus ancienne
  // que ce site — il ne se passe rien de fâcheux : le dialogue s'affiche comme
  // avant, à l'étroit mais entier.
  function cadreGrand(on) {
    try { window.top.postMessage({ ns: NS, type: "pan-grand", grand: !!on }, "*"); }
    catch (e) {}
  }
  function ouvreReglages() {
    var over = el("div", "nb-modal-over");
    var boite = el("div", "nb-modal");
    over.appendChild(boite);
    cadreGrand(true);
    var brouillon = JSON.parse(JSON.stringify(conf));

    boite.appendChild(el("div", "nb-modal-titre", "Réglages du plateau"));

    // ---- les places ----
    // Une liste, donc une ligne d'en-tête et des colonnes, comme les listes de
    // la fiche : répéter « NOM » et « FOND » sur chacune des douze lignes
    // faisait deux fois plus d'étiquettes que de valeurs. C'est aussi ce qui
    // laisse la ligne assez large pour ses deux boutons.
    boite.appendChild(groupe("Places", true));
    var head = el("div", "nb-ligne head");
    head.appendChild(el("span", "nb-rang", ""));
    head.appendChild(el("span", "nb-col nom", "Nom"));
    head.appendChild(el("span", "nb-col img", "Fond"));
    head.appendChild(el("span", "nb-creux", ""));   // colonne du bouton d'image
    head.appendChild(el("span", "nb-creux", ""));   // colonne du bouton « − »
    boite.appendChild(head);

    var lMj = el("div", "nb-ligne");
    lMj.appendChild(el("span", "nb-rang", "MJ"));
    var nomMj = champ("text", "Nom", brouillon.mj.nom, "MJ", "nom");
    var imgMj = champ("text", "Fond", brouillon.mj.img, "https://…", "img");
    lMj.appendChild(nomMj.f); lMj.appendChild(imgMj.f);
    lMj.appendChild(boutonFond("mj", imgMj.i));
    // le creux tient la colonne du bouton « − » que la ligne du MJ n'a pas :
    // sans lui, son champ de fond déborde de vingt-sept pixels sur les autres
    // et la colonne cesse d'être une colonne
    lMj.appendChild(el("span", "nb-creux", ""));
    boite.appendChild(lMj);

    var hote = el("div");
    boite.appendChild(hote);
    function rendJoueurs() {
      hote.innerHTML = "";
      brouillon.joueurs.forEach(function (j, i) {
        // une ligne sur deux prend la bande : c'est le zébrage de la fiche,
        // posé en JS parce que le nombre de lignes change
        var l = el("div", "nb-ligne" + (i % 2 ? " odd" : ""));
        l.appendChild(el("span", "nb-rang", String(i + 1)));
        var n = champ("text", "Nom", j.nom, "Nom du personnage", "nom");
        var g = champ("text", "Fond", j.img, "https://…", "img");
        n.i.addEventListener("input", function () { j.nom = n.i.value; });
        g.i.addEventListener("input", function () { j.img = g.i.value; });
        var moins = el("button", "nb-btn danger", "−");
        moins.type = "button";
        moins.title = "Retirer cette place";
        moins.setAttribute("aria-label", "Retirer cette place");
        moins.addEventListener("click", function () {
          brouillon.joueurs.splice(i, 1);
          rendJoueurs();
        });
        l.appendChild(n.f); l.appendChild(g.f);
        l.appendChild(boutonFond(j.id, g.i));
        l.appendChild(moins);
        hote.appendChild(l);
      });
      var rangee = el("div", "nb-session");
      var plus = el("button", "nb-btn", "Ajouter un joueur");
      plus.type = "button";
      plus.addEventListener("click", function () {
        var id;
        do {
          brouillon.seq++;
          id = "j" + brouillon.seq;
        } while (brouillon.joueurs.some(function (x) { return x.id === id; }));
        brouillon.joueurs.push({ id: id, nom: "", img: "" });
        rendJoueurs();
      });
      rangee.appendChild(plus);
      hote.appendChild(rangee);
      // la liste vient d'être refaite : ses boutons neufs doivent retomber sous
      // le même verrou que le reste
      verrouille();
    }
    rendJoueurs();

    // ---- la donne ----
    boite.appendChild(groupe("Donne"));
    boite.appendChild(el("p", "nb-note", "Jetons posés sur chaque place au début d'une session."));
    var lDonne = el("div", "nb-ligne");
    var dMj = champ("number", "MJ", brouillon.donne.mj, "", "don");
    var dJ = champ("number", "Par joueur", brouillon.donne.joueur, "", "don");
    lDonne.appendChild(dMj.f); lDonne.appendChild(dJ.f);
    boite.appendChild(lDonne);

    // ---- l'affichage ----
    // Le menu à trois états de la fiche, à l'identique : c'est le seul qui sache
    // dire « auto ». Le bouton de la barre, lui, ne fait que basculer.
    boite.appendChild(groupe("Affichage"));
    var lAff = el("div", "nb-ligne");
    var fAff = el("div", "nb-f");
    fAff.appendChild(el("label", null, "Mode"));
    var selNuit = el("select", "nb-select");
    [["auto", "Selon Roll20"], ["0", "Jour"], ["1", "Nuit"]].forEach(function (o) {
      var op = el("option", null, o[1]);
      op.value = o[0];
      selNuit.appendChild(op);
    });
    selNuit.value = nuitPref();
    selNuit.setAttribute("aria-label", "Mode d'affichage");
    // Un réglage d'affichage n'est pas un réglage de plateau : il reste ouvert
    // même en lecture seule, où l'on ne fait justement que regarder.
    selNuit.dataset.libre = "1";
    selNuit.addEventListener("change", function () { poseNuit(selNuit.value); });
    fAff.appendChild(selNuit);
    lAff.appendChild(fAff);
    boite.appendChild(lAff);

    // ---- la session ----
    boite.appendChild(groupe("Session"));
    boite.appendChild(el("p", "nb-note", "Ces deux gestes replacent les jetons de toute la table."));
    var session = el("div", "nb-session");
    var bDist = el("button", "nb-btn danger", "Distribuer");
    bDist.type = "button";
    bDist.title = "Replace les jetons : la donne de chacun sur sa place";
    // Deux temps. Le premier clic ne fait que demander : distribuer efface les
    // positions de tout le monde, et le bouton d'à côté est celui qu'on presse
    // le plus souvent (corriger un nom).
    var arme = null;
    bDist.addEventListener("click", function () {
      if (!arme) {
        arme = setTimeout(function () { arme = null; bDist.textContent = "Distribuer"; bDist.classList.remove("arme"); }, 3000);
        bDist.textContent = "Confirmer ?";
        bDist.classList.add("arme");
        return;
      }
      clearTimeout(arme);
      arme = null;
      recolte();
      conf = litConf(JSON.stringify(brouillon));
      ferme();
      rend();
      distribue();
    });
    var bRamasse = el("button", "nb-btn danger", "Tout ramasser");
    bRamasse.type = "button";
    bRamasse.title = "Ramène tous les jetons du plateau chez le MJ";
    bRamasse.addEventListener("click", function () { ferme(); ramasse(); });
    session.appendChild(bDist);
    session.appendChild(bRamasse);
    boite.appendChild(session);

    // ---- les actions du dialogue ----
    var actions = el("div", "nb-actions");
    var bFerme = el("button", "nb-btn", "Fermer");
    bFerme.type = "button";
    bFerme.dataset.libre = "1";   // on peut toujours sortir, même sans droit d'écrire
    bFerme.addEventListener("click", ferme);
    var bOk = el("button", "nb-btn primary", "Enregistrer");
    bOk.type = "button";
    bOk.addEventListener("click", function () {
      recolte();
      conf = litConf(JSON.stringify(brouillon));
      var lot = defObj(A_CONF, JSON.stringify(conf));
      // UNE PLACE RETIRÉE EMPORTE SON FOND. Un attribut de deux cent mille
      // caractères qui ne se rattache plus à rien resterait sinon dans le
      // personnage, invisible, et serait relu par chaque joueur à chaque tour.
      // C'est le seul endroit qui sache qu'une place vient de disparaître.
      var vivants = { mj: 1 };
      conf.joueurs.forEach(function (j) { vivants[j.id] = 1; });
      Object.keys(fonds).forEach(function (id) { if (!vivants[id]) lot[A_BG + id] = ""; });
      ecrire(lot);
      ferme();
      rend();
    });
    actions.appendChild(bFerme);
    actions.appendChild(bOk);
    boite.appendChild(actions);

    boite.appendChild(el("p", "nb-aide",
      "Le plateau vit dans les Attributes du personnage « Narration ». "
      + "Tous ceux qui le contrôlent peuvent pousser les jetons."));

    if (!peutPousser()) {
      boite.appendChild(el("p", "nb-aide", "Lecture seule : les réglages ne peuvent pas être enregistrés."));
    }
    verrouille();

    // Le voile se ferme au clic à côté et à la touche d'échappement : le
    // dialogue couvre un panneau qui fait parfois 260 pixels de large, où le
    // bouton « Fermer » peut avoir défilé hors de vue.
    over.addEventListener("pointerdown", function (ev) { if (ev.target === over) ferme(); });
    document.addEventListener("keydown", auClavier);
    racine.appendChild(over);
    (nomMj.i).focus();

    function auClavier(ev) { if (ev.key === "Escape" || ev.key === "Esc") ferme(); }
    function ferme() {
      document.removeEventListener("keydown", auClavier);
      if (over.parentNode) over.parentNode.removeChild(over);
      cadreGrand(false);   // le cadre reprend sa place
    }
    // Les champs qui ne se surveillent pas au fil de la frappe (le MJ, la donne)
    // sont relus ICI, au moment d'agir : les deux boutons qui écrivent doivent
    // partir du même brouillon, et le compteur d'identifiants ne redescend
    // jamais (le brouillon date de l'ouverture, quelqu'un a pu distribuer
    // entre-temps).
    function recolte() {
      brouillon.mj.nom = nomMj.i.value;
      brouillon.mj.img = imgMj.i.value;
      brouillon.donne.mj = clamp(entier(dMj.i.value, 3), 0, 40);
      brouillon.donne.joueur = clamp(entier(dJ.i.value, 3), 0, 40);
      brouillon.seq = Math.max(entier(brouillon.seq, 0), entier(conf.seq, 0));
    }
    function verrouille() {
      if (peutPousser()) return;
      Array.prototype.forEach.call(boite.querySelectorAll("button, input, select"), function (e) {
        if (e.dataset && e.dataset.libre === "1") return;
        e.disabled = true;
      });
    }
    // UN SEUL BOUTON POUR LE FOND, DONT LE SENS SUIT L'ÉTAT : « … » ouvre le
    // sélecteur de fichier, « × » retire l'image déjà importée. Deux boutons
    // côte à côte dans une ligne de deux cent quatre-vingts pixels, c'est la
    // colonne du nom qui disparaît ; et l'un des deux serait toujours inutile.
    //
    // L'image est écrite TOUT DE SUITE, sans passer par « Enregistrer » :
    // l'image a son propre attribut, elle n'attend pas la configuration, et
    // faire attendre un envoi de deux cent mille caractères derrière un bouton
    // qu'on peut oublier de presser serait le meilleur moyen de le perdre.
    function boutonFond(id, entree) {
      var b = el("button", "nb-btn", "…");
      b.type = "button";
      function etat() {
        var pose = !!fonds[id];
        b.textContent = pose ? "×" : "…";
        var t = pose ? "Retirer l'image" : "Importer une image";
        b.title = t;
        b.setAttribute("aria-label", t);
        // Une URL sous une image importée ne sert à rien tant que l'image est
        // là : le champ se tait plutôt que de mentir sur ce qu'on voit.
        entree.disabled = pose || !peutPousser();
        entree.placeholder = pose ? "image importée" : "https://…";
      }
      b.addEventListener("click", function () {
        if (fonds[id]) { retireFond(id); etat(); return; }
        // L'entrée de fichier n'est pas dans le dialogue : elle n'y servirait
        // qu'à occuper une colonne. Créée au clic, elle meurt avec lui.
        var f = el("input");
        f.type = "file";
        f.accept = "image/*";
        f.addEventListener("change", function () {
          if (f.files && f.files[0]) poseFond(id, f.files[0], etat);
        });
        f.click();
      });
      etat();
      return b;
    }
    // Un titre de groupe : Cinzel, prolongé par un filet jusqu'au bord.
    function groupe(t, premier) { return el("div", "nb-groupe" + (premier ? " premier" : ""), t); }
    // Un champ du livre : une micro-étiquette en capitales espacées, et un
    // souligné qui rougit au focus. Jamais une boîte.
    function champ(type, lab, val, ph, cls) {
      var f = el("div", "nb-f" + (cls ? " " + cls : ""));
      // Dans une liste, l'étiquette est en tête de colonne et non sur chaque
      // ligne : le champ ne porte alors que son aria-label, pour que la colonne
      // reste nommée au lecteur d'écran.
      if (!cls || (cls !== "nom" && cls !== "img")) f.appendChild(el("label", null, lab));
      var i = el("input");
      i.type = type;
      i.value = val == null ? "" : val;
      if (ph) i.placeholder = ph;
      if (type === "number") { i.min = 0; i.max = 40; }
      i.setAttribute("aria-label", lab);
      f.appendChild(i);
      return { f: f, i: i };
    }
  }
