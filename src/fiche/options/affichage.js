  // ---- affichage (fiche dans Roll20 seulement) ----
  // window.__miaNight n'existe que sous roll20-fiche.html (posé par
  // mia-roll20-boot.js) : sur le site, le bouton d'en-tête gère déjà la nuit.
  // Préférence locale au navigateur (pas dans l'état : réglage d'affichage,
  // pas de personnage) ; "auto" suit le mode jour/nuit de ROLL20 (indice
  // n=1/0 posé par l'extension 2.0.3+ ; repli navigateur sans indice).
  function affichagePresent() { return !!window.__miaNight; }
  function buildAffichage() {
    var bAff = block("Affichage");
    var mode = el("select", "pc-select");
    [["auto", "Selon Roll20"], ["0", "Jour"], ["1", "Nuit"]].forEach(function (o) {
      var op = el("option", null, o[1]);
      op.value = o[0];
      mode.appendChild(op);
    });
    mode.value = window.__miaNight.pref();
    mode.addEventListener("change", function () { window.__miaNight.set(mode.value); });
    bAff.appendChild(fld("Mode par défaut", mode));
    return bAff;
  }

