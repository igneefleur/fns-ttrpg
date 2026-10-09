
  // ---------- le mot au joueur ----------
  var motTimer = null, motsVus = {};
  var MOT_DUREE = 12000;
  function mot(txt, cle) {
    // « une fois » se tient ICI et non chez l'appelant : le pont répète son
    // rapport de ménage à chaque lecture, soit toutes les 1.2 s.
    if (cle) { if (motsVus[cle]) return; motsVus[cle] = 1; }
    if (!lblMot) return;
    lblMot.textContent = txt;
    boiteMot.hidden = false;
    if (motTimer) clearTimeout(motTimer);
    motTimer = setTimeout(fermeMot, MOT_DUREE);
  }
  function fermeMot() {
    if (motTimer) { clearTimeout(motTimer); motTimer = null; }
    if (!boiteMot) return;
    lblMot.textContent = "";
    boiteMot.hidden = true;
  }
