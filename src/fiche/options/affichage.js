  // ---- 17. Affichage (Roll20 seulement) ----
  // window.__owdNight n'existe que sous roll20-fiche.html : sur le site, le
  // bouton d'en-tête gère déjà la nuit.
  function affichagePresent() { return !!window.__owdNight; }
  function buildAffichage() {
    var b = block("Affichage");
    var mode = el("select", "pc-select");
    [["auto", "Selon Roll20"], ["0", "Jour"], ["1", "Nuit"]].forEach(function (o) {
      var op = el("option", null, o[1]);
      op.value = o[0];
      mode.appendChild(op);
    });
    mode.value = window.__owdNight.pref();
    mode.addEventListener("change", function () { window.__owdNight.set(mode.value); });
    b.appendChild(fld("Mode par défaut", mode));
    return b;
  }

