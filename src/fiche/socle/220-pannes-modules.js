  // ---------- isolation des pannes ----------
  // Un module dont build() jette ne fait pas tomber la fiche : il rend cette
  // carte à sa place, et le montage continue. Réessayer le reconstruit (une
  // panne peut tenir à l'état du moment) ; Désactiver le retire de la fiche
  // sans rien effacer de ce qu'il porte.
  function blocEnPanne(m, err) {
    var msg = messageErreur(err);
    etatModule(m.id).panne = msg;
    if (window.console && window.console.error) window.console.error("[mod:" + m.id + "]", err);
    var b = el("div", "pc-block");
    b.dataset.module = m.id;
    b.dataset.panne = "1";
    var t = el("div", "pc-block-title", m.titre || m.id);
    // la page Mods promet un cadre qui donne l'ID du module et le message :
    // c'est l'id, pas le titre, qui sert à retrouver le mod dans la liste et
    // dans le journal du navigateur (« [mod:<id>] »)
    t.appendChild(el("small", null, "module en panne — " + m.id));
    b.appendChild(t);
    b.appendChild(el("div", "pc-empty", msg));
    var tools = el("div", "pc-comp-tools");
    var line = el("div", "row");
    line.appendChild(miniBtn("Réessayer", "Reconstruire ce module", function () {
      delete etatsModules[m.id];
      remount();
    }));
    // Pas de « Désactiver » pour le bloc des réglages, même en panne : le
    // couper retirerait le seul endroit d'où l'on rallume un module, y compris
    // lui-même. « Réessayer » reste, et le montage suivant lui redonne sa
    // chance ; les modules coupés le sont, eux, sans que la fiche s'en mêle.
    if (m.id !== MODULE_REGLAGES)
      line.appendChild(miniBtn("Désactiver", "Retirer ce module de la fiche : rien n'est perdu, il ne s'affiche plus.", function () {
        // même garde que __jjkModules.active : une panne peut survenir sur un
        // état remplacé à la main (import, bibliothèque) qui n'est pas repassé
        // par normalize(), et la clé manquerait
        if (!state.modActifs) state.modActifs = {};
        state.modActifs[m.id] = false;
        save();
        remount();
      }, "danger"));
    tools.appendChild(line);
    b.appendChild(tools);
    return b;
  }
  // Muselé : le module garde son bloc (ses valeurs sont celles du dernier
  // rafraîchissement réussi), il cesse seulement d'être rappelé. On marque son
  // bloc et on dit pourquoi, sans rien changer à la mise en page.
  function museleAffiche(id, e) {
    if (window.console && window.console.warn)
      window.console.warn("[mod:" + id + "] muselé après " + e.echecs +
                          " rafraîchissements en erreur : " + e.erreur);
    var n = elModules ? elModules[id] : null;
    if (!n) return;
    n.dataset.musele = "1";
    n.title = "Module muselé après " + e.echecs + " rafraîchissements en erreur : " + e.erreur;
  }

