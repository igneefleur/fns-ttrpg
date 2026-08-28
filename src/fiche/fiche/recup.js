  // ---------- la récupération ----------
  // DEUX RÉSERVES SE REGAGNENT, ET IL FAUT SAVOIR LAQUELLE. Le module portait
  // ses deux nombres côte à côte, sans un mot : deux cadres identiques, l'un
  // pour les points de vie, l'autre pour l'endurance, et rien pour les
  // distinguer qu'une infobulle qu'il fallait aller chercher. Ils ont donc
  // désormais chacun leur rangée, nommée comme partout ailleurs sur la feuille.
  //
  //   ┌──────────────────────────────┐
  //   │ RÉCUP / Jour               ⚙ │
  //   │                  MULTI TOTAL │
  //   │ PV                 ×1    157 │
  //   │ END                ×1     70 │
  //   │                 [Récupérer]  │
  //   └──────────────────────────────┘
  //
  // DEUX COLONNES, LES MÊMES DANS LES DEUX MODES. On lit le multiplicateur en
  // jouant, on le règle en construisant — la colonne ne bouge pas, seule la
  // case s'ouvre. C'est la forme du module Vitalité, et pour la même raison :
  // ce qui se lit et ce qui se règle est ici la même chose.
  //
  // LE MULTIPLICATEUR VIENT À LA TOUTE FIN du calcul de sa réserve, et il vaut
  // UN tant qu'on n'y touche pas. Il ne se range dans l'état que s'il change
  // quelque chose, comme les facteurs de la chaîne de leviers.
  function buildRecup() {
    var b = block("RÉCUP / Jour", null, "recup");

    // l'entête des deux colonnes, du même squelette que le trio des lignes :
    // c'est ce qui garantit que chaque mot tombe en face de sa colonne
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "sp"));
    var teteTrio = el("span", "pc-trio tete");
    ["Multi", "Total"].forEach(function (k) {
      var c = el("span", "c");
      c.appendChild(el("span", "k", k));
      teteTrio.appendChild(c);
    });
    tete.appendChild(teteTrio);
    b.appendChild(tete);

    // UNE CASE DE MULTIPLICATEUR : un texte quand on joue, un champ quand on
    // construit — la brique commune caseSaisie, à ceci près qu'elle lit des
    // ENTIERS et qu'un facteur se compte en dixièmes. Vide vaut UN, comme les
    // facteurs de la chaîne : c'est le neutre de l'opération, et le neutre ne
    // se range pas.
    function caseMulti(hote, cle) {
      var c = el("span", "c reglable");
      var t = el("span", "v pc-jeu-only", "");
      var i = el("input", "v pc-edit-only pc-case-champ pc-edit-field");
      i.type = "number";
      i.step = "any";
      i.title = "Multiplicateur — vide = ×1.";
      i.addEventListener("input", function () {
        var v = parseFloat(i.value);
        if (!state.recupMulti || typeof state.recupMulti !== "object") state.recupMulti = {};
        if (isFinite(v)) {
          var n = clamp(Math.round(v * 100) / 100, -MULT_BORNE, MULT_BORNE);
          // ON NE MATÉRIALISE PAS LE NEUTRE, et l'on défait le chemin : un
          // facteur de un ne dit rien de plus qu'une case vide, et voyagerait
          // jusque dans les Attributs Roll20 pour ne rien dire.
          if (n === 1) delete state.recupMulti[cle];
          else state.recupMulti[cle] = n;
        } else {
          delete state.recupMulti[cle];
        }
        refresh();
      });
      c.appendChild(t);
      c.appendChild(i);
      hote.appendChild(c);
      hooks.push(function () {
        var pose = state.recupMulti && state.recupMulti[cle] !== undefined;
        t.textContent = "×" + fmtP(recupMulti(cle));
        // ×1 est le neutre du facteur : il se retire comme un bonus de zéro.
        t.classList.toggle("zero", recupMulti(cle) === 1);
        i.placeholder = "1";
        if (document.activeElement !== i) {
          i.value = pose ? state.recupMulti[cle] : "";
        }
      });
    }

    // LES DEUX RANGÉES, connues d'avance : rien ne s'ajoute ni ne se retire.
    // Chaque case pousse donc directement dans le registre du module, qui vit
    // aussi longtemps que lui — pas de tableau local, pas de rebâti.
    [{ nom: "PV", cle: "pv", total: recupJour, aide: "Points de vie regagnés par jour" },
     { nom: "END", cle: "end", total: recupEnduranceJour, aide: "Endurance regagnée par jour" }
    ].forEach(function (def, i) {
      var row = el("div", "pc-crow" + (i % 2 === 1 ? " odd" : ""));
      var top = el("div", "pc-crow-top");
      var nom = el("span", "nm", def.nom);
      nom.title = def.aide;
      top.appendChild(nom);
      var trio = el("span", "pc-trio");
      caseMulti(trio, def.cle);
      var tot = caseTexte(trio, "reglable");
      top.appendChild(trio);
      row.appendChild(top);
      b.appendChild(row);
      hooks.push(function () {
        tot.textContent = String(def.total());
        // LA TEINTE SE POSE SUR LE TRIO, jamais sur la valeur : c'est la règle
        // « .pc-trio.adj .v » qui la porte, et une classe posée sur le « .v »
        // ne correspondait à rien. Le bloc entier vire, multiplicateur ET total,
        // parce que c'est bien le total que le facteur déplace.
        var d = modSum(state.divers.recup);
        var pose = recupMulti(def.cle) !== 1 ||
                   (def.cle === "pv" && (state.recupOverride !== null || d !== 0));
        trio.classList.toggle("adj", pose);
        tot.title = def.cle === "pv" && state.recupOverride !== null
          ? "Forçée (calculée : " + recupJourAuto() + ")"
          : def.aide;
      });
    });

    // UN SEUL GESTE POUR LES DEUX. Une journée rend des points de vie ET de
    // l'endurance : on ne se repose pas à moitié.
    var geste = el("div", "pc-kv pc-recup-geste");
    geste.appendChild(el("span", "sp"));
    geste.appendChild(miniBtn("Récupérer", "Rendre au personnage ses points de vie et son endurance du jour",
                              function () {
      // on ne dépasse jamais le maximum : une journée de repos ne fabrique ni
      // points de vie ni endurance en trop
      var n = recupJour(), nE = recupEnduranceJour();
      var pAv = pvCourant(), pAp = n > 0 ? Math.min(pvMax(), pAv + n) : pAv;
      var eAv = enduranceCourante(), eAp = nE > 0 ? Math.min(enduranceMax(), eAv + nE) : eAv;
      if (pAp === pAv && eAp === eAv) { flash("Rien à récupérer."); return; }
      state.pv = pAp;
      state.endurance = eAp;
      refresh();
      var dit = [];
      if (pAp !== pAv) dit.push("PV " + fmtP(pAv) + " → " + fmtP(pAp));
      if (eAp !== eAv) dit.push("endurance " + fmtP(eAv) + " → " + fmtP(eAp));
      flash(dit.join(" · "));
    }));
    b.appendChild(geste);

    // LA CONSTRUCTION DE LA SEULE RANGÉE PV : une valeur forcée (vide =
    // calculée) et trois modificateurs. Les libellés le disent, maintenant que
    // les rangées sont nommées — sans quoi on ne saurait pas laquelle des deux
    // cette ligne règle, ce qui était précisément le défaut du module.
    var mrow = el("div", "pc-pvmax pc-mods-host pc-edit-only");
    mrow.appendChild(el("span", "lbl", "PV forcés"));
    var force = el("input", "force");
    force.type = "number"; force.step = "1"; force.min = "0";
    force.title = "Vide = calculée ; une valeur la force.";
    force.addEventListener("input", function () {
      var v = parseFloat(force.value);
      state.recupOverride = isFinite(v) ? clamp(Math.floor(v), 0, 9999) : null;
      refresh();
    });
    hooks.push(function () {
      force.placeholder = String(recupJourAuto());
      if (document.activeElement !== force) {
        force.value = state.recupOverride === null ? "" : state.recupOverride;
      }
    });
    mrow.appendChild(force);
    mrow.appendChild(el("span", "lbl", "PV modificateurs"));
    mrow.appendChild(multiMod(state.divers, "recup"));
    mrow.appendChild(el("span", "sp"));
    b.appendChild(mrow);

    return b;
  }
