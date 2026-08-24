  // ---------- en-tête : portrait + identité + compteurs + garde-fous ----------
  // En-tête réduit aux seules infos importantes (2026-08-02) : plus de
  // portrait ni de cartouche « MIA Système JDR » ; PV, Vitesse et Narration
  // (doublons en lecture seule de l'onglet Fiche) n'y figurent plus.
  //   Nom | Espèce | Âge | Sexe | Genre
  //   Création ———— | XP dépensé ———— | XP total
  // ---------- barre d'envoi (Roll20 seulement) ----------
  // À qui part la macro, et faut-il demander un modificateur. Geste de JEU :
  // aucun rouage, aucun mode édition. Posée en FRÈRE de .pc-head, jamais dans
  // .pc-id (dont les 12 colonnes sont pleines, et dont la hauteur commande la
  // taille du portrait).
  function buildEnvoi(sheet) {
    if (!COMPACT) return;   // hors Roll20 il n'y a pas de tchat : rien à régler
    var bar = el("div", "pc-envoi");
    bar.appendChild(el("span", "lbl", "Envoi"));

    var destSel = el("select", "pc-select");
    destSel.title = "Destinataire du chuchotement";
    var editNoms = null;

    function majDest() {
      var joueur = envMode() === "joueur";
      destSel.style.display = joueur ? "" : "none";
      if (editNoms) editNoms.style.display = joueur && !listeRoll20 ? "" : "none";
    }

    // segments : Publique | Au MJ | À un joueur
    var segs = el("div", "pc-envoi-segs");
    var boutons = [];
    [["public", "Publique", "Tout le monde voit la carte"],
     ["gm", "Au MJ", "Chuchoté au MJ (/w gm)"],
     ["joueur", "À un joueur", "Chuchoté au joueur choisi à droite"]].forEach(function (o) {
      var b = el("button", "seg" + (envMode() === o[0] ? " on" : ""), o[1]);
      b.type = "button";
      b.title = o[2];
      b.addEventListener("click", function () {
        lset(ENVOI.mode, o[0]);
        boutons.forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        majDest();
        if (o[0] === "joueur") demanderJoueurs();
      });
      boutons.push(b);
      segs.appendChild(b);
    });
    bar.appendChild(segs);

    // liste des destinataires : celle de Roll20 si l'extension sait la donner,
    // sinon celle que l'utilisateur saisit (et qui reste dans son navigateur)
    var listeRoll20 = null;
    function nomsManuels() {
      return lpref(ENVOI.noms, "").split("\n").map(function (s) { return s.trim(); })
        .filter(function (s) { return s; });
    }
    function remplirDest(noms) {
      var actuel = envDest();
      destSel.innerHTML = "";
      if (!noms.length) {
        var vide = el("option", null, listeRoll20 ? "Aucun autre joueur connecté" : "Aucun joueur enregistré");
        vide.value = "";
        destSel.appendChild(vide);
      }
      noms.forEach(function (n) {
        var o = el("option", null, n);
        o.value = n;
        if (n === actuel) o.selected = true;
        destSel.appendChild(o);
      });
      // un destinataire choisi avant que la liste change reste sélectionnable
      if (actuel && noms.indexOf(actuel) < 0) {
        var o2 = el("option", null, actuel + " (absent)");
        o2.value = actuel; o2.selected = true;
        destSel.appendChild(o2);
      }
      // Ce qui est AFFICHÉ est ce qui sera utilisé. Sans cette ligne, un
      // sélecteur qui ne porte qu'un nom n'émet jamais « change » (le
      // navigateur le choisit tout seul) : le destinataire restait vide et la
      // macro repartait en public alors que son nom s'affichait.
      lset(ENVOI.dest, destSel.value);
    }
    destSel.addEventListener("change", function () { lset(ENVOI.dest, destSel.value); });
    // Roll20 ne livre sa liste que par l'extension (la fiche est une iframe
    // d'une autre origine) : si elle ne répond pas, la saisie manuelle prend
    // le relais et rien n'est perdu.
    function demanderJoueurs() {
      if (typeof window.__miaPlayers !== "function") { remplirDest(nomsManuels()); return; }
      window.__miaPlayers(function (noms) {
        if (noms && noms.length) {
          listeRoll20 = noms;
          remplirDest(noms);
        } else remplirDest(nomsManuels());
        majDest();
      });
    }
    bar.appendChild(destSel);

    editNoms = miniBtn("Joueurs…", "Saisir les noms des joueurs de la table", function () {
      var corps = el("div", "pc-modal-body");
      corps.appendChild(el("div", "pc-modal-note",
        "Un nom par ligne, tel qu'il s'affiche dans Roll20. Cette liste reste dans ce navigateur."));
      var ta = el("textarea", "pc-notes");
      ta.rows = 6;
      ta.value = lpref(ENVOI.noms, "");
      corps.appendChild(ta);
      dialogue("Joueurs de la table", corps, function () {
        lset(ENVOI.noms, ta.value);
        remplirDest(nomsManuels());
      }, "Enregistrer");
    });
    bar.appendChild(editNoms);

    // sans input / avec input : la requête ?{…} n'a de sens que sur un jet de
    // test, elle est donc posée par doRoll et ignorée partout ailleurs
    var sep = el("span", "lbl", "Modificateur");
    sep.title = "Ne s'applique qu'aux jets de caractéristique et de compétence";
    bar.appendChild(sep);
    var segs2 = el("div", "pc-envoi-segs");
    var bin = [];
    [["0", "Sans input", "Le jet part tel quel"],
     ["1", "Avec input", "Roll20 demande un modificateur avant de lancer"]].forEach(function (o) {
      var b = el("button", "seg" + ((envInput() ? "1" : "0") === o[0] ? " on" : ""), o[1]);
      b.type = "button";
      b.title = o[2];
      b.addEventListener("click", function () {
        lset(ENVOI.input, o[0]);
        bin.forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      });
      bin.push(b);
      segs2.appendChild(b);
    });
    bar.appendChild(segs2);

    // automatique / au choix : sur un jet de COMPÉTENCE, « au choix » fait
    // demander par Roll20 quelle caractéristique porte le jet (Body / Mind /
    // Prestance, la sienne en tête) — ex. une Esquive lancée sur la Prestance.
    var sep3 = el("span", "lbl", "Caractéristique");
    sep3.title = "Ne s'applique qu'aux jets de compétence";
    bar.appendChild(sep3);
    var segs3 = el("div", "pc-envoi-segs");
    var cbtn = [];
    [["0", "Automatique", "La compétence part avec sa caractéristique"],
     ["1", "Au choix", "Roll20 demande quelle caractéristique utiliser avant de lancer"]].forEach(function (o) {
      var b = el("button", "seg" + ((envCaracChoix() ? "1" : "0") === o[0] ? " on" : ""), o[1]);
      b.type = "button";
      b.title = o[2];
      b.addEventListener("click", function () {
        lset(ENVOI.carac, o[0]);
        cbtn.forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      });
      cbtn.push(b);
      segs3.appendChild(b);
    });
    bar.appendChild(segs3);

    sheet.appendChild(bar);
    remplirDest(nomsManuels());
    majDest();
    demanderJoueurs();
  }

  function buildHead(sheet) {
    var head = el("div", "pc-head");
    var idBox = el("div", "pc-id");   // créé tôt : le portrait s'aligne sur sa hauteur

    // portrait compact 1:1, coins arrondis. L'URL s'édite EN PLACE au clic
    // (jamais prompt() : muet dans l'iframe Roll20 sous Chrome).
    var pbox = el("div", "pc-portrait-box");
    pbox.title = "Portrait — clic : changer l'image (URL)";
    var pclip = el("div", "clip");
    var pimg = el("img");
    pimg.alt = "";
    pclip.appendChild(pimg);
    var pph = el("span", "ph", "?");
    pclip.appendChild(pph);
    pbox.appendChild(pclip);
    hooks.push(function () {
      var want = state.portrait || "";
      if (pimg.getAttribute("src") !== want) {
        if (want) pimg.src = want;
        else pimg.removeAttribute("src");
      }
      pbox.classList.toggle("vide", !want);
    });
    var pedit = null;
    pbox.addEventListener("click", function () {
      if (pedit) return;
      pedit = el("input", "pc-portrait-edit");
      pedit.type = "text";
      pedit.placeholder = "URL de l'image…";
      pedit.value = state.portrait || "";
      pedit.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); pedit.blur(); }
        else if (e.key === "Escape") { pedit.value = state.portrait || ""; pedit.blur(); }
      });
      pedit.addEventListener("blur", function () {
        state.portrait = pedit.value.trim();
        if (pedit) { pedit.remove(); pedit = null; }
        refresh();
      });
      pbox.appendChild(pedit);
      setTimeout(function () { pedit.focus(); pedit.select(); }, 0);
    });
    head.appendChild(pbox);
    // carré 1:1 haut comme l'en-tête : largeur = hauteur MESURÉE (le transfert
    // aspect-ratio depuis un étirement flex n'est pas fiable sous Firefox).
    // Le carré fait la hauteur de l'en-tête PARTOUT (site, dialogue Roll20,
    // fenêtre séparée) : côté = hauteur du bloc d'identité, plafonné pour ne
    // pas dévorer la largeur quand l'en-tête se replie sur trois lignes.
    // Les deux dimensions sont posées en dur : aucun transfert aspect-ratio
    // (infiable depuis un étirement flex) et aucune règle de largeur en CSS.
    // Boucle bornée : régler le côté rétrécit le bloc d'identité, qui peut se
    // replier et changer de hauteur — on repasse au plus 3 fois, puis on garde.
    var PORTRAIT_MAX = 6;   // rem
    function carrePortrait(passe) {
      var un = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      var cible = Math.min(idBox.offsetHeight, Math.round(PORTRAIT_MAX * un));
      if (!cible) return;
      var actuel = parseFloat(pbox.style.width) || 0;
      if (Math.abs(actuel - cible) <= 1) return;
      pbox.style.width = cible + "px";
      pbox.style.height = cible + "px";
      if ((passe || 0) < 3) carrePortrait((passe || 0) + 1);
    }
    hooks.push(function () { carrePortrait(0); });
    setTimeout(function () { carrePortrait(0); }, 0);
    // suit les redimensionnements de la fenêtre (dialogue Roll20, popout)
    try { new ResizeObserver(function () { carrePortrait(0); }).observe(idBox); } catch (e) {}

    var id = idBox;
    id.appendChild(fld("Nom", textInput(function () { return state.name; }, function (v) { state.name = v; }, "Nom du personnage"), "c4"));
    id.appendChild(fld("Espèce", textInput(function () { return state.espece; }, function (v) { state.espece = v; }), "c2"));
    id.appendChild(fld("Âge", textInput(function () { return state.age; }, function (v) { state.age = v; }), "c2"));
    id.appendChild(fld("Sexe", textInput(function () { return state.sexe; }, function (v) { state.sexe = v; }), "c2"));
    id.appendChild(fld("Genre", textInput(function () { return state.genre; }, function (v) { state.genre = v; }), "c2"));

    // 2e ligne : compteurs de budgets + XP total
    var mrow = el("div", "pc-id-meters");
    function meter(label, getUsed, getTotal) {
      var m = el("span", "pc-meter");
      m.appendChild(el("span", null, label));
      var b = el("b", null, "");
      m.appendChild(b);
      var bar = el("span", "bar");
      var fill = el("i");
      bar.appendChild(fill);
      m.appendChild(bar);
      hooks.push(function () {
        var used = getUsed(), total = getTotal();
        b.textContent = used + " / " + total;
        var over = used > total;
        b.classList.toggle("over", over);
        fill.classList.toggle("over", over);
        fill.style.width = clamp(total ? (used / total) * 100 : 0, 0, 100) + "%";
      });
      return m;
    }
    mrow.appendChild(meter("Création", ptsCreation, ptsCreaMax));
    mrow.appendChild(meter("XP dépensé", xpDepense, function () { return state.xpTotal; }));
    var xpIn = el("input", null);
    xpIn.type = "number"; xpIn.min = 0; xpIn.step = 5;
    xpIn.value = state.xpTotal;
    xpIn.addEventListener("input", function () {
      var v = parseInt(xpIn.value, 10);
      if (isFinite(v)) { state.xpTotal = Math.max(0, v); refresh(); }
    });
    hooks.push(function () { if (document.activeElement !== xpIn) xpIn.value = state.xpTotal; });
    mrow.appendChild(fld("XP total", xpIn));
    id.appendChild(mrow);

    head.appendChild(id);
    sheet.appendChild(head);
    buildEnvoi(sheet);

    // garde-fous
    var warns = el("div", "pc-warns");
    hooks.push(function () {
      warns.innerHTML = "";
      if (ptsCreation() > ptsCreaMax())
        warns.appendChild(el("div", "pc-warn", "Points de création dépassés : " + ptsCreation() + " / " + ptsCreaMax() + "."));
      if (xpRestant() < 0)
        warns.appendChild(el("div", "pc-warn", "XP dépensé au-delà du total (" + xpDepense() + " / " + state.xpTotal + ")."));
      var cap = compCap();
      Object.keys(state.comps).forEach(function (k) {
        if (compXp(state.comps[k]) > cap)
          warns.appendChild(el("div", "pc-warn", "« " + k.split("/").slice(1).join("/") + " » dépasse le quart de l'xp total (" + compXp(state.comps[k]) + " / " + cap + " xp)."));
      });
    });
    sheet.appendChild(warns);
  }

