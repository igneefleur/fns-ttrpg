  // ---------- onglet Art ----------
  // La personnalisation d'une compétence vit ICI : au stade qui ouvre les
  // passifs et l'art (« Artiste » sous les règles actuelles), sa carte porte les
  // fiches de passifs, le nom et la description de l'art. Aucun
  // contenu de règles : seulement les données du personnage. La liste se
  // reconstruit seulement quand les compétences éligibles (ou leur stade)
  // changent, pas à chaque frappe.
  // porteArt : la compétence a un art non vide (même si le stade est redescendu)
  function porteArt(c) {
    return !!(c && c.art && (String(c.art.name || "").trim() || String(c.art.desc || "").trim()));
  }
  function artComps() {
    // même ordre que la Fiche : Body, puis Mind, puis Prestance, puis alphabétique
    var rang = {};
    CHAMPS.forEach(function (ch, i) { rang[ch] = i; });
    return allComps().filter(function (it) {
      var c = state.comps[it.key];
      // les passifs rédigés et l'art restent VISIBLES même si le stade ne les
      // ouvre plus (stade redescendu, ou stade d'ouverture déplacé) : les
      // données du joueur ne disparaissent jamais en silence
      return !!(c && (stadeInfo(c.stade).techniques || stadeInfo(c.stade).art ||
                      (c.techniques && c.techniques.length) || porteArt(c)));
    }).sort(function (a, b) {
      return (rang[a.carac] || 0) - (rang[b.carac] || 0)
        || a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
    });
  }
  function artStadeNom() {
    // premier stade qui ouvre quelque chose (techniques ou art)
    for (var i = 0; i < DATA.stades.length; i++)
      if (DATA.stades[i].techniques || DATA.stades[i].art) return DATA.stades[i].nom;
    return null;
  }
  function buildArt() {
    // jeu : lire les arts et passifs, les envoyer au tchat ; édition :
    // rédiger, ajouter, retirer
    var b = block("Arts et passifs", null, "arts");
    var box = el("div", "pc-arts");
    b.appendChild(box);

    function artCard(it) {
      var c = state.comps[it.key];
      var card = el("div", "pc-av pc-art");

      var top = el("div", "pc-art-top");
      var chip = el("span", "pc-abbr", ABBR[it.carac] || it.carac);
      chip.title = it.carac;
      top.appendChild(chip);
      top.appendChild(el("span", "pc-art-comp", it.name));
      top.appendChild(el("span", "pc-art-stade", stadeInfo(c.stade).nom));
      card.appendChild(top);

      // l'art, au stade qui l'ouvre — et un art DÉJÀ rédigé reste visible et
      // éditable même si le stade ne l'ouvre plus (même échappatoire que les
      // passifs : les données du joueur ne disparaissent jamais en silence).
      // Il n'entre dans l'état qu'à la première frappe : un art resté vierge
      // ne doit pas générer d'écriture (Attributes Roll20) à la simple
      // ouverture de la fiche.
      if (stadeInfo(c.stade).art || porteArt(c)) {
        var a = c.art || { name: "", desc: "" };
        var keep = function () { c.art = a; };
        var head = el("div", "pc-av-head");
        var nm = el("input", "nm pc-edit-field");
        nm.type = "text"; nm.placeholder = "Nom du passif"; nm.value = a.name || "";
        nm.addEventListener("input", function () { a.name = nm.value; keep(); save(); });
        head.appendChild(nm);

        // coût de l'art, à droite de son nom : rien par défaut (il vient avec
        // son stade), une valeur le force
        var aCout = el("span", "pc-tech-cout pc-edit-only");
        var aIn = el("input");
        aIn.type = "number"; aIn.min = "0"; aIn.step = "5";
        aIn.placeholder = "0";
        aIn.value = (a.cout === null || a.cout === undefined) ? "" : a.cout;
        aIn.addEventListener("input", function () {
          var v = parseFloat(aIn.value);
          if (isFinite(v)) a.cout = clamp(Math.floor(v), 0, 9999);
          else delete a.cout;
          keep();
          refresh();
        });
        aCout.title = "Coût de l'art — vide = 0 xp (il vient avec son stade) ; une valeur le force.";
        aCout.appendChild(aIn);
        aCout.appendChild(el("span", "u", "xp"));
        head.appendChild(aCout);
        // la compétence tient dans le titre : la carte n'a plus de colonne de
        // libellé, sa description occupe toute la largeur
        head.appendChild(chatBtn(
          function () { return "Passif — " + (a.name || it.name) + " (" + it.name + ")"; },
          function () { return [["", a.desc]]; }));
        head.appendChild(miniBtn("✕", "Effacer cet art", function () {
          // un texte rédigé ne part pas sur un simple clic (le ✕ jouxte Chat)
          if ((String(a.name || "").trim() || String(a.desc || "").trim()) &&
              !confirm("Effacer l'art « " + (a.name || it.name) + " » et sa description ?")) return;
          delete c.art;
          refresh();
          render();
        }, "danger pc-edit-only"));
        card.appendChild(head);

        var d = el("textarea", "pc-notes pc-edit-field");
        d.rows = 5;
        d.placeholder = "Effet";
        d.value = a.desc || "";
        d.addEventListener("input", function () { a.desc = d.value; keep(); save(); });
        card.appendChild(d);
      }

      // les passifs, dès le stade qui les ouvre
      var techBox = el("div", "pc-techniques");
      card.appendChild(techBox);
      function renderTechs() {
        var cc = state.comps[it.key];
        techBox.innerHTML = "";
        // même échappatoire que compXp et artComps : des passifs EXISTANTS
        // restent lisibles, éditables et supprimables même si le stade courant
        // ne les ouvre plus (fiche migrée : leur stade d'ouverture a bougé)
        if (!cc || (!stadeInfo(cc.stade).techniques && !(cc.techniques && cc.techniques.length))) return;
        cc.techniques.forEach(function (t, i) {
          var tCard = el("div", "pc-av pc-technique");
          var tHead = el("div", "pc-av-head");
          var tNm = el("input", "nm pc-edit-field");
          tNm.type = "text"; tNm.placeholder = "Nom du passif"; tNm.value = t.name || "";
          tNm.addEventListener("input", function () { t.name = tNm.value; state.comps[it.key] = cc; save(); });
          tHead.appendChild(tNm);

          // coût du passif, à droite du nom : vide = tarif de base, une valeur
          // le force (décision du MJ, passif hors barème)
          var tCout = el("span", "pc-tech-cout pc-edit-only");
          var cIn = el("input");
          cIn.type = "number"; cIn.min = "0"; cIn.step = "5";
          cIn.value = (t.cout === null || t.cout === undefined) ? "" : t.cout;
          cIn.addEventListener("input", function () {
            var v = parseFloat(cIn.value);
            if (isFinite(v)) t.cout = clamp(Math.floor(v), 0, 9999);
            else delete t.cout;
            state.comps[it.key] = cc;
            refresh();
          });
          tCout.appendChild(cIn);
          tCout.appendChild(el("span", "u", "xp"));
          // état posé ICI (renderTechs se rejoue à chaque ajout, retrait ou
          // changement de stade) : un hook global fuirait, cette fonction
          // n'étant pas vidée par mount()
          cIn.placeholder = String(DATA.xpParStade);
          tCout.title = "Coût de ce passif — vide = " + DATA.xpParStade +
                        " xp (tarif de base) ; une valeur le force.";
          tHead.appendChild(tCout);
          tHead.appendChild(chatBtn(
            function () { return "Passif — " + (t.name || it.name) + " (" + it.name + ")"; },
            function () { return [["", t.desc]]; }));
          tHead.appendChild(miniBtn("✕", "Retirer ce passif", function () {
            if ((String(t.name || "").trim() || String(t.desc || "").trim()) &&
                !confirm("Retirer le passif « " + (t.name || "sans nom") + " » ?")) return;
            cc.techniques.splice(i, 1); state.comps[it.key] = cc; refresh(); renderTechs();
          }, "danger pc-edit-only"));
          tCard.appendChild(tHead);
          var tD = el("textarea", "pc-notes pc-edit-field");
          tD.rows = 3;
          tD.placeholder = "Effet";
          tD.value = t.desc || "";
          tD.addEventListener("input", function () { t.desc = tD.value; state.comps[it.key] = cc; save(); });
          tCard.appendChild(tD);
          techBox.appendChild(tCard);
        });
        // en acheter de NOUVEAUX reste réservé au stade qui les ouvre
        if (!stadeInfo(cc.stade).techniques) { applyEdit(b, "arts"); return; }
        // le coût annoncé est celui d'un passif neuf : le tarif de base
        // (l'art de la compétence est repris dans la comparaison, sinon son
        // coût forcé fausserait la différence)
        function avecPassifNeuf() {
          return { stade: cc.stade, art: cc.art, techniques: cc.techniques.concat([{ name: "", desc: "" }]) };
        }
        var prochaine = compXp(avecPassifNeuf()) - compXp(cc);
        techBox.appendChild(miniBtn("+ passif (" + prochaine + " xp)", null, function () {
          var test = avecPassifNeuf();
          var delta = compXp(test) - compXp(cc);
          if (delta > 0 && xpRestant() < delta) { flash("XP insuffisant."); return; }
          if (delta > 0 && compXp(test) > compCap()) { flash("Pas plus d'un quart de l'xp total (" + compCap() + " xp) dans une seule compétence."); return; }
          cc.techniques.push({ name: "", desc: "" }); state.comps[it.key] = cc; refresh(); renderTechs();
        }, "pc-edit-only"));
        applyEdit(b, "arts");
      }
      renderTechs();
      return card;
    }

    function render() {
      box.innerHTML = "";
      var items = artComps();
      if (!items.length) {
        var nom = artStadeNom();
        box.appendChild(el("div", "pc-empty",
          nom ? "Aucune compétence n'a atteint le stade " + nom + "." : "Aucun stade n'ouvre de passif ou d'art."));
        return;
      }
      items.forEach(function (it) { box.appendChild(artCard(it)); });
      applyEdit(b, "arts");
    }

    // reconstruire seulement quand les compétences éligibles ou leur stade
    // changent : les frappes (save sans refresh) ne détruisent pas le focus
    var lastSig = null;
    hooks.push(function () {
      var sig = artComps().map(function (it) {
        var c = state.comps[it.key];
        return it.key + ":" + (c ? c.stade : 0);
      }).join("|");
      if (sig !== lastSig) { lastSig = sig; render(); }
    });
    return b;
  }

