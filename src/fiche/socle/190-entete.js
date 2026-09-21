  // ---------- barre d'envoi (Roll20 seulement) ----------
  // À qui part la macro, faut-il demander un modificateur, et combien de dés le
  // joueur engage. Geste de JEU : aucun rouage, aucun mode édition. Posée en
  // FRÈRE de .pc-head, jamais dans .pc-id — dont les douze colonnes sont
  // pleines, et dont la hauteur commande la taille du portrait.
  function buildEnvoi(sheet) {
    if (!COMPACT) return;   // hors Roll20 il n'y a pas de tchat : rien à régler
    var bar = el("div", "pc-envoi");
    bar.appendChild(el("span", "lbl", "Envoi"));

    var destSel = el("select", "pc-select");
    destSel.title = "Destinataire du chuchotement";
    var editNoms = null;
    var listeRoll20 = null;

    function majDest() {
      var joueur = envMode() === "joueur";
      destSel.style.display = joueur ? "" : "none";
      if (editNoms) editNoms.style.display = joueur && !listeRoll20 ? "" : "none";
    }
    // fabrique de segments accolés : trois réglages, la même mécanique
    function segments(cle, actuel, choix, apres) {
      var segs = el("div", "pc-envoi-segs");
      var boutons = [];
      choix.forEach(function (o) {
        var b = el("button", "seg" + (actuel === o[0] ? " on" : ""), o[1]);
        b.type = "button";
        b.title = o[2];
        b.addEventListener("click", function () {
          lset(cle, o[0]);
          boutons.forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
          if (apres) apres(o[0]);
        });
        boutons.push(b);
        segs.appendChild(b);
      });
      return segs;
    }

    bar.appendChild(segments(ENVOI.mode, envMode(), [
      ["public", "Publique", "Tout le monde voit la carte"],
      ["gm", "Au MJ", "Chuchoté au MJ (/w gm)"],
      ["joueur", "À un joueur", "Chuchoté au joueur choisi à droite"]
    ], function (v) { majDest(); if (v === "joueur") demanderJoueurs(); }));

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
      // CE QUI EST AFFICHÉ EST CE QUI SERA UTILISÉ. Sans cette ligne, un
      // sélecteur qui ne porte qu'un nom n'émet jamais « change » (le
      // navigateur le choisit tout seul) : le destinataire restait vide et la
      // macro repartait en public alors que son nom s'affichait.
      lset(ENVOI.dest, destSel.value);
    }
    destSel.addEventListener("change", function () { lset(ENVOI.dest, destSel.value); });
    // Roll20 ne livre sa liste que par l'extension (la fiche est une iframe
    // d'une autre origine) : sans réponse, la saisie manuelle prend le relais.
    function demanderJoueurs() {
      if (typeof window.__owdPlayers !== "function") { remplirDest(nomsManuels()); return; }
      window.__owdPlayers(function (noms) {
        if (noms && noms.length) { listeRoll20 = noms; remplirDest(noms); }
        else remplirDest(nomsManuels());
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

    var sepM = el("span", "lbl", "Modificateur");
    sepM.title = "Ne s'applique qu'aux jets : compétence, attaque, parade, technique";
    bar.appendChild(sepM);
    bar.appendChild(segments(ENVOI.input, envInput() ? "1" : "0", [
      ["0", "Sans input", "Le jet part tel quel"],
      ["1", "Avec input", "Roll20 demande un modificateur avant de lancer"]
    ]));

    // LE TROISIÈME SEGMENT, propre à Outward. Une caractéristique n'entre
    // jamais dans un jet ici : elle ouvre l'usage d'une arme et fixe ses
    // dégâts. Ce qui varie, c'est le NOMBRE DE DÉS ENGAGÉS — le rang donne un
    // plafond, le joueur peut en engager moins.
    var sepD = el("span", "lbl", "Dés engagés");
    sepD.title = "Le rang donne un plafond de dés d'action ; on peut toujours en engager moins";
    bar.appendChild(sepD);
    bar.appendChild(segments(ENVOI.des, envDesChoix() ? "1" : "0", [
      ["0", "Au maximum", "Le jet engage tous les dés que le rang autorise"],
      ["1", "Au choix", "Roll20 demande combien de dés engager avant de lancer"]
    ]));

    sheet.appendChild(bar);
    remplirDest(nomsManuels());
    majDest();
    demanderJoueurs();
  }

  // ---------- en-tête : portrait + identité + compteurs + garde-fous ----------
  function buildHead(sheet) {
    var head = el("div", "pc-head");
    var idBox = el("div", "pc-id");   // créé tôt : le portrait s'aligne sur SA hauteur

    // portrait compact 1:1, coins arrondis. L'URL s'édite EN PLACE au clic —
    // JAMAIS prompt(), muet dans l'iframe Roll20 sous Chrome.
    var pbox = el("div", "pc-portrait-box");
    pbox.title = "Portrait — clic : changer l'image (URL)";
    var pclip = el("div", "clip");
    var pimg = el("img");
    pimg.alt = "";
    pclip.appendChild(pimg);
    pclip.appendChild(el("span", "ph", "?"));
    pbox.appendChild(pclip);
    hooks.push(function () {
      var want = state.portrait || "";
      // ne toucher à src QUE s'il change : sinon l'image se recharge à chaque frappe
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
    // Carré 1:1 haut comme l'en-tête : largeur = hauteur MESURÉE. Aucun
    // transfert aspect-ratio (infiable depuis un étirement flex sous Firefox)
    // et aucune règle de largeur en CSS, qui contredirait le calcul. Boucle
    // BORNÉE à 3 passes : régler le côté rétrécit le bloc d'identité, qui peut
    // se replier et changer de hauteur.
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
    // suit les redimensionnements (dialogue Roll20, fenêtre séparée)
    try { new ResizeObserver(function () { carrePortrait(0); }).observe(idBox); } catch (e) {}

    idBox.appendChild(fld("Nom", textInput(function () { return state.name; },
      function (v) { state.name = v; }, "Nom du personnage"), "c4"));
    idBox.appendChild(fld("Espèce", textInput(function () { return state.espece; },
      function (v) { state.espece = v; }), "c2"));
    idBox.appendChild(fld("Âge", textInput(function () { return state.age; },
      function (v) { state.age = v; }), "c2"));
    idBox.appendChild(fld("Sexe", textInput(function () { return state.sexe; },
      function (v) { state.sexe = v; }), "c2"));
    idBox.appendChild(fld("Genre", textInput(function () { return state.genre; },
      function (v) { state.genre = v; }), "c2"));

    // 2e ligne, pleine largeur : les deux budgets et le total d'XP.
    var mrow = el("div", "pc-id-meters");
    function meter(label, getUsed, getTotal, titre) {
      var m = el("span", "pc-meter");
      m.appendChild(el("span", null, label));
      var b = el("b", null, "");
      m.appendChild(b);
      var bar = el("span", "bar");
      var fill = el("i");
      bar.appendChild(fill);
      m.appendChild(bar);
      if (titre) m.title = titre;
      hooks.push(function () {
        var used = getUsed(), total = getTotal();
        b.textContent = fmtP(used) + " / " + fmtP(total);
        var over = used > total;
        b.classList.toggle("over", over);
        fill.classList.toggle("over", over);
        fill.style.width = clamp(total ? (used / total) * 100 : 0, 0, 100) + "%";
      });
      return m;
    }
    if (creation()) mrow.appendChild(meter("Création", creationDepense, creationPoints));
    mrow.appendChild(meter("XP dépensé", xpDepense, function () { return state.xpTotal; },
      "Ce que les rangs de compétence, les techniques et les caractéristiques ont coûté"));
    if (limiteRangs("competences") !== null)
      mrow.appendChild(meter("Compétences", compRangsComptes,
        function () { return limiteRangs("competences"); }, "Rangs de compétence"));
    if (limiteRangs("techniques") !== null)
      mrow.appendChild(meter("Techniques", techRangsComptes,
        function () { return limiteRangs("techniques"); }, "Rangs de technique"));
    mrow.appendChild(meter("Rupture", ruptureDepense, ruptureMax,
      "Points de rupture engagés par les Rangs Max et par les techniques"));
    var xpIn = el("input");
    xpIn.type = "number"; xpIn.min = 0; xpIn.step = 25;
    xpIn.value = state.xpTotal;
    xpIn.addEventListener("input", function () {
      var v = parseInt(xpIn.value, 10);
      if (isFinite(v)) { state.xpTotal = Math.max(0, v); refresh(); }
    });
    hooks.push(function () { if (document.activeElement !== xpIn) xpIn.value = state.xpTotal; });
    mrow.appendChild(fld("XP total", xpIn));
    idBox.appendChild(mrow);

    head.appendChild(idBox);
    sheet.appendChild(head);
    buildEnvoi(sheet);

    // ---- garde-fous ----
    // Ils disent l'ÉTAT du personnage, jamais une règle : c'est la seule
    // exception au « rien du livre ne s'affiche ». Le conteneur est toujours
    // là ; .pc-warns:empty le fait disparaître tout seul quand il n'a rien à
    // dire.
    var warns = el("div", "pc-warns");
    hooks.push(function () {
      warns.innerHTML = "";
      function dire(t) { warns.appendChild(el("div", "pc-warn", t)); }
      if (xpRestant() < 0)
        dire("XP dépensé au-delà du total (" + fmtP(xpDepense()) + " / " + fmtP(state.xpTotal) + ").");
      if (creation()) {
        if (creationDepense() > creationPoints())
          dire("Points de création répartis au-delà du compte (" + fmtP(creationDepense()) +
               " / " + fmtP(creationPoints()) + ").");
        var hors = caracsOrdre().filter(function (c) {
          var v = caracBase(c);
          return v < num(creation().min, 0) || v > num(creation().max, 9999);
        });
        if (hors.length)
          dire("Création hors des bornes : " + hors.map(function (c) {
            return libCarac(c) + " " + fmtP(caracBase(c));
          }).join(", ") + ".");
      }
      [["competences", compRangsComptes, "compétence"],
       ["techniques", techRangsComptes, "technique"]].forEach(function (x) {
        var lim = limiteRangs(x[0]);
        if (lim !== null && x[1]() > lim)
          dire("Rangs de " + x[2] + " au-delà de la limite (" + fmtP(x[1]()) + " / " + fmtP(lim) + ").");
      });
      if (ruptureRestante() < 0)
        dire("Points de rupture engagés au-delà du compte (" + fmtP(ruptureDepense()) +
             " / " + fmtP(ruptureMax()) + ").");
      if (peMax() <= 0)
        dire("Points d'endurance au maximum de zéro : le personnage est inconscient.");
      if (poidsPorte() > charge())
        dire("Charge dépassée : " + fmtP(poidsPorte()) + " pour " + fmtP(charge()) + ".");
      if (poidsPoches() > capPoches())
        dire("Poches trop chargées : " + fmtP(poidsPoches()) + " kg pour " + fmtP(capPoches()) + ".");
      if (poidsSac() > capSac())
        dire("Sac à dos trop chargé : " + fmtP(poidsSac()) + " kg pour " + fmtP(capSac()) + ".");
      if (accesPris() > accesRapides())
        dire("Accès rapides dépassés : " + accesPris() + " pour " + accesRapides() + ".");
      if (contenancePrise() > contenance())
        dire("Contenance dépassée : " + fmtP(contenancePrise()) + " pour " + fmtP(contenance()) + ".");
      if (state.etat.pm !== null && state.etat.pm > pmMax())
        dire("Points de mana au-delà du maximum (" + fmtP(state.etat.pm) + " / " + fmtP(pmMax()) +
             ") : aucune règle ne donne ce maximum aujourd'hui.");
      if (effondrement() >= effPlafond() && effPlafond() > 0)
        dire("Effondrement au dernier niveau (" + effondrement() + ").");
    });
    sheet.appendChild(warns);
  }

