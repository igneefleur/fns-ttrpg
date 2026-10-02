  // ---- Attaque : raccourcis d'arme ----
  // Une entrée du module ne possède AUCUNE valeur de combat : elle pointe vers
  // un objet d'arme de l'inventaire. Dégâts et MOD restent donc modifiables à
  // un seul endroit, et le TYPE de l'arme relie l'objet aux six attaques du
  // livre (DATA.armes[].attaques).
  function buildAttaque() {
    var b = block("Attaque", null, "attaque", function () { rendre(); });
    var box = el("div", "pc-attaques");
    b.appendChild(box);

    function armesInventaire() {
      var objets = state.inv && Array.isArray(state.inv.objets) ? state.inv.objets : [];
      return objets.filter(function (o) { return o && o.arme; });
    }
    function assureRef(o) {
      if (!o) return "";
      if (!o.ref) o.ref = uid("o");
      return String(o.ref);
    }
    function objetArme(ref) {
      var trouve = null;
      armesInventaire().forEach(function (o) {
        if (!trouve && String(o.ref || "") === String(ref || "")) trouve = o;
      });
      return trouve;
    }
    function typeArme(cle) {
      var trouve = null;
      armesData().forEach(function (d) {
        if (!trouve && d && d.cle === cle) trouve = d;
      });
      return trouve;
    }
    function degatsArme(it) {
      if (!it || !it.arme) return 0;
      var a = it.arme;
      var total = snum(a.degats);
      (Array.isArray(a.modsDegats) ? a.modsDegats : []).slice(0, 3).forEach(function (c) {
        if (c) total += Math.floor(caracTotal(c) / 5);
      });
      return Math.round(total * 1000) / 1000;
    }
    function envoieCoup(entree, it, coup, def) {
      var types = def && Array.isArray(def.types) ? def.types : [];
      var typeTouche = types[0] || "—";
      var typePasse = types[1] || typeTouche;
      var plein = degatsArme(it);
      var passe = plein / 2;
      sayChat((coup && coup.nom ? coup.nom : "Attaque") + " — " + (it.nom || (def && def.nom) || "Arme"), [
        ["Case de touche", fmtP(plein) + " " + typeTouche],
        ["Case de passage", fmtP(passe) + " " + typePasse]
      ]);
    }

    function carte(entree) {
      var card = el("div", "pc-attaque-card");
      var it = objetArme(entree.arme);

      // Le choix de l'arme n'existe qu'en édition. On utilise une valeur
      // temporaire par rang pour ne PAS dépendre de l'identifiant public de
      // l'objet ; au choix, une `ref` interne lui est créée si nécessaire.
      var edit = el("div", "pc-attaque-edit pc-edit-only");
      var sel = el("select", "pc-select pc-edit-field");
      var armes = armesInventaire();
      var vide = el("option", null, "— Choisir une arme —");
      vide.value = "";
      sel.appendChild(vide);
      armes.forEach(function (o, i) {
        var op = el("option", null, o.nom || ((o.arme && o.arme.type) ? "Arme — " + o.arme.type : "Arme sans nom"));
        op.value = String(i);
        if (it === o) op.selected = true;
        sel.appendChild(op);
      });
      sel.addEventListener("change", function () {
        if (sel.value === "") entree.arme = "";
        else {
          var o = armes[parseInt(sel.value, 10)];
          entree.arme = assureRef(o);
        }
        refresh();
        rendre();
      });
      edit.appendChild(fld("Arme", sel));
      edit.appendChild(miniBtn("✕", "Retirer cette attaque", function () {
        state.attaques = state.attaques.filter(function (a) { return a.id !== entree.id; });
        refresh();
        rendre();
      }, "danger pc-attaque-retire"));
      card.appendChild(edit);

      if (!it) {
        card.appendChild(el("div", "pc-empty pc-attaque-vide",
          entree.arme ? "Arme introuvable. Choisissez-en une autre en édition." : "Aucune arme choisie."));
        return card;
      }

      var head = el("div", "pc-attaque-nom", it.nom || "Arme sans nom");
      card.appendChild(head);
      var def = typeArme(it.arme.type);
      var coups = def && Array.isArray(def.attaques) ? def.attaques : [];
      if (coups.length !== 6) {
        card.appendChild(el("div", "pc-empty pc-attaque-vide",
          it.arme.type ? "Ce type d'arme n'a pas six attaques définies." : "Cette arme n'a pas de type défini."));
        return card;
      }

      var grille = el("div", "pc-attaque-boutons");
      coups.forEach(function (coup) {
        grille.appendChild(miniBtn(coup.nom || "Attaque", "Envoyer les dégâts dans le tchat", function () {
          envoieCoup(entree, it, coup, def);
        }, "pc-attaque-coup"));
      });
      card.appendChild(grille);
      return card;
    }

    function rendre() {
      box.innerHTML = "";
      if (!Array.isArray(state.attaques)) state.attaques = [];
      state.attaques.forEach(function (a) { box.appendChild(carte(a)); });
      if (!state.attaques.length) box.appendChild(el("div", "pc-empty", "Aucune attaque."));
      box.appendChild(miniBtn("+ Ajouter une attaque", null, function () {
        state.attaques.push({ id: uid("atk"), arme: "" });
        refresh();
        rendre();
      }, "pc-edit-only pc-attaque-ajout"));
      applyEdit(b, "attaque");
    }
    rendre();
    return b;
  }
