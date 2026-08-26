  // ---------- onglet Art : les techniques et les passifs ----------
  // UNE LISTE LIBRE, et c'est ce qui la distingue de l'onglet Art d'autrefois :
  // celui-là posait une carte par compétence éligible, au stade qui ouvrait les
  // passifs. Les stades ont disparu avec les règles de JJK ; ce qui reste est
  // une liste que le joueur remplit lui-même, une entrée par technique ou par
  // passif, sans rien qui la commande.
  //
  // DEUX TYPES, ET UNE SEULE DIFFÉRENCE ENTRE EUX : une technique coûte de
  // l'ENDURANCE quand on l'emploie, un passif ne coûte rien puisqu'il ne
  // s'emploie pas — il est. Tout le reste est identique, effets compris.
  //
  // UN ART PORTE DES EFFETS : celui de BASE, qu'il a toujours, puis autant
  // d'AMÉLIORATIONS qu'on veut. Les cinq champs d'un effet sont les mêmes
  // partout — un nom, un coût en avantage, un coût en xp, une description, une
  // macro. Aucune exception : une amélioration de passif porte un coût en
  // avantage comme les autres.
  //
  // AUCUNE RÈGLE ICI. La page de règles ne dit pas un mot des techniques ni des
  // passifs : rien à lire dans DATA, aucun barème, aucun plafond. Le module ne
  // fait que ranger ce que la table décide.
  function buildArt() {
    var b = block("Techniques et passifs", null, "arts");
    // LA BOÎTE EST APPENDUE UNE FOIS, hors de rendu() : c'est son contenu qui
    // se refait, jamais elle. Sans quoi le bloc perdrait sa place à chaque
    // ajout.
    var box = el("div", "pc-arts");
    b.appendChild(box);

    // LE REGISTRE DES CARTES, et le détour obligatoire. Pousser directement
    // dans « hooks » empilerait à jamais les fonctions des cartes détruites,
    // chacune tenant un art que l'état ne porte plus, jusqu'à ce que la
    // muselière éteigne le module.
    var lignes = [];
    hooks.push(function () {
      for (var i = 0; i < lignes.length; i++) lignes[i]();
    });

    // L'ORDRE APPARTIENT AU JOUEUR, comme celui des spécialités : on glisse la
    // POIGNÉE, jamais la carte — elle porte des champs de saisie, et une carte
    // « draggable » interdirait d'y sélectionner un mot à la souris.
    //
    // « pris » porte l'index dans l'ÉTAT, jamais le rang à l'écran : la liste
    // peut être filtrée, et un rang d'écran ne dirait alors pas où ranger.
    var pris = null;
    function eteintDepot() {
      var l = box.querySelectorAll(".pc-art");
      for (var i = 0; i < l.length; i++) {
        l[i].classList.remove("avant");
        l[i].classList.remove("apres");
      }
    }

    // ---------- un effet : cinq champs, et deux gestes ----------
    // MÊME FABRIQUE POUR LES TROIS SORTES D'EFFET — base de technique, base de
    // passif, amélioration. Ils portent exactement les mêmes champs, donc ils
    // n'ont pas à être écrits trois fois : trois copies finiraient par diverger
    // d'un placeholder, puis d'une borne.
    //
    // « retirer » vaut null pour un effet de base : un art a toujours le sien,
    // et une croix qui l'effacerait laisserait une carte sans effet.
    function bloc(e, titre, retirer) {
      var c = el("div", "pc-av pc-effet");

      var head = el("div", "pc-av-head");
      var nm = el("input", "nm pc-edit-field");
      nm.type = "text";
      nm.placeholder = titre;
      nm.value = e.nom || "";
      // UN NOM S'ENREGISTRE SANS RAFRAÎCHIR : refresh() rejouerait les registres
      // et reconstruirait la liste sous les doigts. Rien ici ne se calcule à
      // partir d'un nom, contrairement aux spécialités, que trois formules des
      // règles cherchent PAR LEUR NOM.
      nm.addEventListener("input", function () { e.nom = nm.value; save(); });
      head.appendChild(nm);

      // LES DEUX COÛTS NE SE VOIENT QU'EN CONSTRUISANT. Ce qu'on lit en jouant,
      // c'est ce que l'effet FAIT ; ce qu'il a coûté ne regarde que le moment où
      // on l'achète — même partage que sur une ligne de caractéristique.
      head.appendChild(cout(
        function () { return e.avantage; },
        function (v) { e.avantage = v; },
        999, "av", "Coût en avantage"));
      head.appendChild(cout(
        function () { return e.xp; },
        function (v) { e.xp = v; },
        9999, "xp", "Coût en xp"));

      head.appendChild(chatBtn(
        function () { return e.nom || titre; },
        function () { return [["", e.desc]]; }));
      if (retirer) head.appendChild(miniBtn("✕", "Retirer cet effet", retirer,
                                            "danger pc-edit-only"));
      c.appendChild(head);

      var d = el("textarea", "pc-notes pc-edit-field");
      d.rows = 3;
      d.placeholder = "Ce que fait l'effet";
      d.value = e.desc || "";
      d.addEventListener("input", function () { e.desc = d.value; save(); });
      c.appendChild(d);

      // ---- la macro liée ----
      // UN CHAMP LIBRE, ET UN BOUTON QUI L'ENVOIE TEL QUEL. La fiche ne
      // l'interprète pas : une macro Roll20 peut porter des @{…} et des ?{…}
      // que seul Roll20 sait résoudre, et les rogner ici la casserait.
      var ligne = el("div", "pc-art-macro");
      var mc = el("input", "pc-edit-field");
      mc.type = "text";
      mc.placeholder = "Macro liée — partira telle quelle dans le tchat";
      mc.value = e.macro || "";
      mc.addEventListener("input", function () { e.macro = mc.value; save(); });
      ligne.appendChild(mc);
      // LE BOUTON RESTE EN JEU, lui : c'est le geste qu'on fait à table. Il ne
      // porte pas pc-edit-only, et son champ, verrouillé hors construction, se
      // lit quand même.
      ligne.appendChild(miniBtn("Lancer", "Envoyer cette macro dans le tchat Roll20",
        function () {
          var m = String(e.macro || "").trim();
          if (!m) { flash("Aucune macro sur cet effet."); return; }
          // HORS ROLL20 ON LE DIT, on ne fait pas semblant : envoyer() rend
          // false, et un bouton qui ne répond rien passerait pour cassé.
          if (!envoyer(m)) flash("Hors Roll20 : la macro ne peut pas partir.");
        }, "primary"));
      c.appendChild(ligne);

      // les champs se relisent à chaque passe, SAUF celui qu'on est en train de
      // taper : un champ réécrit sous les doigts perd le curseur
      lignes.push(function () {
        if (document.activeElement !== nm) nm.value = e.nom || "";
        if (document.activeElement !== d) d.value = e.desc || "";
        if (document.activeElement !== mc) mc.value = e.macro || "";
        // EN JOUANT, UN CHAMP VIDE DISPARAÎT. Une zone de texte grise sans un
        // mot dedans et un bouton « Lancer » qui n'a rien à lancer occupent la
        // moitié d'une carte pour ne rien dire. En construisant ils reviennent,
        // évidemment : c'est là qu'on les remplit.
        d.classList.toggle("vide", !String(e.desc || "").trim());
        ligne.classList.toggle("vide", !String(e.macro || "").trim());
      });
      return c;
    }

    // Un coût : un nombre et son unité, comme le coût d'un passif d'autrefois.
    // VIDE VAUT ZÉRO, et zéro ne s'écrit pas : un effet gratuit ne doit pas
    // alourdir l'état d'un « 0 » que personne n'a tapé.
    function cout(lire, ecrire, borne, unite, aide) {
      var w = el("span", "pc-tech-cout pc-edit-only");
      var i = el("input");
      i.type = "number";
      i.min = "0";
      i.step = "5";
      i.placeholder = "0";
      i.value = lire() || "";
      i.title = aide + " — vide = 0.";
      i.addEventListener("input", function () {
        var v = parseFloat(i.value);
        // UN COÛT ALIMENTE LE TOTAL D'XP : celui-là rafraîchit, contrairement
        // aux champs de texte. C'est le partage constant de la maison.
        ecrire(isFinite(v) ? clamp(Math.round(v * 100) / 100, -borne, borne) : 0);
        refresh();
      });
      w.appendChild(i);
      w.appendChild(el("span", "u", unite));
      lignes.push(function () {
        if (document.activeElement !== i) i.value = lire() || "";
      });
      return w;
    }

    // ---------- une carte : un art entier ----------
    function carte(it) {
      // L'ART SE PREND VIVANT dans l'enveloppe, jamais capturé au montage : la
      // liste bouge sous la carte (ajout, retrait, glissement).
      var a = it.art;
      var c = el("div", "pc-av pc-art");

      var top = el("div", "pc-art-top");
      top.appendChild(miniBtn("✕", "Retirer", function () {
        // UN TEXTE RÉDIGÉ NE PART PAS SUR UN CLIC. Et la confirmation passe par
        // la modale de la fiche : confirm() natif est MUET dans l'iframe
        // Roll20 — il rend false sans rien montrer, et le retrait y serait
        // annulé en silence.
        if (!artVide(a)) {
          confirmer("Retirer « " + (a.nom || "sans nom") + " »",
                    "Ses effets et leurs descriptions partent avec.",
                    "Retirer", function () { retire(it.index); });
          return;
        }
        retire(it.index);
      }, "danger pc-croix pc-edit-only"));

      var poignee = el("span", "pc-poignee pc-edit-only");
      poignee.title = "Glisser pour ranger";
      poignee.draggable = true;
      poignee.addEventListener("dragstart", function (ev) {
        pris = it.index;
        c.classList.add("pris");
        try {
          ev.dataTransfer.effectAllowed = "move";
          // Firefox refuse de commencer un glissement sans donnée posée
          ev.dataTransfer.setData("text/plain", String(it.index));
          if (ev.dataTransfer.setDragImage) ev.dataTransfer.setDragImage(c, 16, 12);
        } catch (e) {}
      });
      poignee.addEventListener("dragend", function () {
        pris = null;
        c.classList.remove("pris");
        eteintDepot();
      });
      top.appendChild(poignee);

      // LE TYPE SE CHOISIT, et il ne se voit qu'en construisant : en jouant, la
      // pastille dit lequel c'est.
      var sel = el("select", "pc-select pc-edit-only pc-edit-field");
      [["technique", "Technique"], ["passif", "Passif"]].forEach(function (o) {
        var op = el("option", null, o[1]);
        op.value = o[0];
        sel.appendChild(op);
      });
      sel.value = a.type === "passif" ? "passif" : "technique";
      sel.addEventListener("change", function () {
        a.type = sel.value;
        // UN PASSIF NE PORTE PAS LA CLÉ : la laisser traîner ferait voyager
        // jusque dans les Attributs Roll20 un nombre dont personne ne saurait
        // dire s'il compte.
        if (a.type === "passif") delete a.endurance;
        else if (typeof a.endurance !== "number") a.endurance = 0;
        rendu();
        refresh();
      });
      top.appendChild(sel);
      var pastille = el("span", "pc-abbr pc-jeu-only");
      top.appendChild(pastille);

      var nm = el("input", "nm pc-edit-field");
      nm.type = "text";
      nm.placeholder = "Nom";
      nm.value = a.nom || "";
      nm.addEventListener("input", function () { a.nom = nm.value; save(); });
      top.appendChild(nm);

      // L'ENDURANCE N'EST QUE SUR UNE TECHNIQUE, et c'est la seule chose qui
      // sépare les deux types. Un passif ne s'emploie pas : il n'a rien à payer.
      var end = null;
      if (a.type !== "passif") {
        end = el("span", "pc-tech-cout pc-art-end");
        var ei = el("input");
        ei.type = "number";
        ei.min = "0";
        ei.step = "1";
        ei.placeholder = "0";
        ei.className = "pc-edit-field";
        ei.value = a.endurance || "";
        ei.title = "Ce que la technique coûte en endurance quand on l'emploie.";
        ei.addEventListener("input", function () {
          var v = parseFloat(ei.value);
          a.endurance = isFinite(v) ? clamp(Math.round(v), -9999, 9999) : 0;
          save();
        });
        end.appendChild(ei);
        end.appendChild(el("span", "u", "end"));
        top.appendChild(end);
        lignes.push(function () {
          if (document.activeElement !== ei) ei.value = a.endurance || "";
        });
      }

      // CE QUE L'ART COÛTE EN TOUT, effets compris : c'est le seul nombre
      // calculé de la carte, et il se lit en jouant comme en construisant.
      var somme = el("span", "pc-art-somme");
      top.appendChild(somme);
      c.appendChild(top);

      // ---- l'effet de base ----
      c.appendChild(el("div", "pc-art-sep", "Effet de base"));
      c.appendChild(bloc(a.base, "Nom de l'effet", null));

      // ---- les améliorations ----
      c.appendChild(el("div", "pc-art-sep pc-art-sep-am", "Améliorations"));
      var amBox = el("div", "pc-techniques");
      c.appendChild(amBox);
      a.ameliorations.forEach(function (e, i) {
        amBox.appendChild(bloc(e, "Nom de l'amélioration", function () {
          if (!effetVide(e)) {
            confirmer("Retirer « " + (e.nom || "sans nom") + " »",
                      "Sa description et sa macro partent avec.",
                      "Retirer", function () { retireAm(a, i); });
            return;
          }
          retireAm(a, i);
        }));
      });
      c.appendChild(miniBtn("+ Amélioration", null, function () {
        a.ameliorations.push(blankEffet());
        rendu();
        refresh();
      }, "pc-edit-only pc-comp-add"));

      // ---- le glisser-déposer ----
      // La MOITIÉ survolée décide : au-dessus, la carte prise se pose avant ;
      // en dessous, après.
      function moitieBasse(ev) {
        var r = c.getBoundingClientRect();
        return ev.clientY >= r.top + r.height / 2;
      }
      c.addEventListener("dragover", function (ev) {
        if (pris === null || pris === it.index) return;
        ev.preventDefault();            // sans ça, le navigateur refuse le dépôt
        try { ev.dataTransfer.dropEffect = "move"; } catch (e) {}
        eteintDepot();
        c.classList.add(moitieBasse(ev) ? "apres" : "avant");
      });
      c.addEventListener("dragleave", function (ev) {
        if (ev.target === c) { c.classList.remove("avant"); c.classList.remove("apres"); }
      });
      c.addEventListener("drop", function (ev) {
        ev.preventDefault();
        var src = pris;
        if (src === null) {
          try { src = parseInt(ev.dataTransfer.getData("text/plain"), 10); } catch (e) { src = NaN; }
        }
        eteintDepot();
        if (!isFinite(src) || src === it.index) return;
        var cible = it.index + (moitieBasse(ev) ? 1 : 0);
        var l = state.arts;
        var obj = l.splice(src, 1)[0];
        if (!obj) return;
        // le retrait a décalé tout ce qui suivait : la cible avec, si elle
        // était après la source
        if (src < cible) cible--;
        l.splice(clamp(cible, 0, l.length), 0, obj);
        rendu();
        refresh();
      });

      lignes.push(function () {
        var vivant = (state.arts || [])[it.index];
        if (!vivant) return;
        if (document.activeElement !== nm) nm.value = vivant.nom || "";
        if (document.activeElement !== sel) sel.value = vivant.type === "passif" ? "passif" : "technique";
        pastille.textContent = vivant.type === "passif" ? "PASSIF" : "TECHNIQUE";
        var x = artXp(vivant), av = artAvantage(vivant);
        // ON NE DIT QUE CE QUI EXISTE : « 0 xp · 0 av » sur un art qu'on vient
        // d'ouvrir est du bruit.
        somme.textContent = (x ? x + " xp" : "") + (x && av ? " · " : "") + (av ? av + " av" : "");
        somme.title = x || av
          ? "Ce que cet art coûte en tout, améliorations comprises."
          : "";
      });
      return c;
    }

    function retire(i) {
      state.arts.splice(i, 1);
      rendu();
      refresh();
    }
    function retireAm(a, i) {
      a.ameliorations.splice(i, 1);
      rendu();
      refresh();
    }

    function rendu() {
      box.innerHTML = "";
      // les fonctions des cartes effacées n'ont plus rien à rafraîchir ; le
      // tableau est vidé SUR PLACE, celui du registre étant le même objet
      lignes.length = 0;
      var items = allArts();
      items.forEach(function (it) { box.appendChild(carte(it)); });
      if (!items.length) box.appendChild(el("div", "pc-empty", "Aucune technique ni passif."));

      var pied = el("div", "pc-art-pied");
      pied.appendChild(miniBtn("+ Technique", null, function () {
        state.arts.push(blankArt("technique"));
        rendu();
        refresh();
      }, "pc-edit-only"));
      pied.appendChild(miniBtn("+ Passif", null, function () {
        state.arts.push(blankArt("passif"));
        rendu();
        refresh();
      }, "pc-edit-only"));
      var tot = el("span", "pc-art-total");
      pied.appendChild(tot);
      box.appendChild(pied);
      lignes.push(function () {
        var x = artsXp(), av = artsAvantage();
        tot.textContent = (x || av)
          ? "En tout : " + x + " xp" + (av ? " · " + av + " av" : "")
          : "";
      });

      // les cartes qui viennent de naître doivent obéir au verrou du bloc :
      // rien ne le leur dirait avant le prochain rafraîchissement
      applyEdit(b, "arts");
      // ET ELLES DOIVENT ÊTRE REMPLIES. Une carte naît vide : ses nombres, sa
      // pastille et ses relectures ne s'écrivent que dans les fonctions poussées
      // au registre, et ce registre n'est joué que par refresh(). Rejouer ICI,
      // et non chez l'appelant : un appelant peut oublier, une fin de rendu()
      // ne le peut pas. C'est la faute qui a vidé les spécialités filtrées.
      for (var i = 0; i < lignes.length; i++) {
        try { lignes[i](); } catch (e) { /* la muselière juge à la passe suivante */ }
      }
    }

    rendu();
    return b;
  }
