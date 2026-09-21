  // ---- 12. Vêtements ----
  function buildVetements() {
    var b = block("Vêtements", null, "vetements", function () { rendre(); });
    var box = el("div");
    b.appendChild(box);
    var pied = el("div", "pc-comp-tools");
    var resume = el("div", "row");
    var tot = el("span", "pc-comp-total", "");
    resume.appendChild(tot);
    resume.appendChild(chatBtn(
      function () {
        return "Protections — froid " + sign(protection("froid")) + " · chaud " + sign(protection("chaud"));
      },
      function () {
        var c = confort();
        return [["Froid", sign(protection("froid"))], ["Chaud", sign(protection("chaud"))],
                ["Zone de confort", c ? fmtP(c.bas) + " à " + fmtP(c.haut) + " °C" : ""],
                ["Poids porté", fmtP(protectionPoids())]];
      }));
    pied.appendChild(resume);
    b.appendChild(pied);

    function protectionPoids() {
      var t = 0;
      state.vetements.forEach(function (v) { if (v.porte) t += pnum(v.poids); });
      return Math.round(t * 100) / 100;
    }
    function nombre(libelle, v, cle, titre) {
      var i = el("input", "pc-edit-field");
      i.type = "number"; i.step = "any";
      i.value = v[cle] ? fmtP(v[cle]) : "";
      i.placeholder = "0";
      i.title = titre;
      i.addEventListener("input", function () {
        v[cle] = cle === "poids" ? pnum(i.value) : snum(i.value);
        refresh();
      });
      return fld(libelle, i);
    }
    function rendre() {
      box.innerHTML = "";
      state.vetements.forEach(function (v) {
        var l = el("div", "pc-arme-line");
        l.appendChild(champTexte("Pièce", v, "nom", true));
        l.appendChild(nombre("Froid", v, "froid", "Degrés de protection contre le froid."));
        l.appendChild(nombre("Chaud", v, "chaud", "Degrés de protection contre le chaud."));
        l.appendChild(nombre("Poids", v, "poids", "Ce que la pièce pèse quand elle est portée."));
        var kv = el("div", "pc-kv");
        var lab = el("label", null, "");
        var cb = el("input");
        cb.type = "checkbox";
        cb.checked = !!v.porte;
        cb.title = "Décoché, la pièce est dans le sac : elle ne protège plus, et son poids passe " +
                   "avec le groupe qui la contient.";
        cb.addEventListener("change", function () { v.porte = cb.checked; refresh(); });
        lab.appendChild(cb);
        lab.appendChild(el("span", null, " porté"));
        kv.appendChild(lab);
        l.appendChild(kv);
        l.appendChild(miniBtn("✕", "Retirer cette pièce", function () {
          state.vetements = state.vetements.filter(function (x) { return x.id !== v.id; });
          refresh();
          rendre();
        }, "danger pc-edit-only"));
        box.appendChild(l);
      });
      if (!state.vetements.length) box.appendChild(el("div", "pc-empty", "Aucun vêtement."));
      box.appendChild(miniBtn("+ Ajouter", null, function () {
        state.vetements.push({ id: uid("v"), nom: "", froid: 0, chaud: 0, poids: 0, porte: true, note: "" });
        refresh();
        rendre();
      }, "pc-edit-only"));
      applyEdit(b, "vetements");
    }
    hooks.push(function () {
      var c = confort();
      tot.textContent = "Protection froid " + sign(protection("froid")) +
                        " · chaud " + sign(protection("chaud")) +
                        (c ? " · confort " + fmtP(c.bas) + " à " + fmtP(c.haut) + " °C" : "");
      tot.title = c
        ? "La zone où le personnage habillé est à l'aise, calculée depuis les degrés de ce qu'il porte."
        : "La zone de confort demande les bornes du corps nu, que le jeu de données n'a pas fournies.";
    });
    rendre();
    return b;
  }

