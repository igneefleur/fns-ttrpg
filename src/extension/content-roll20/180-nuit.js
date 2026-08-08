  // ---------- le seul réglage relu en cours de partie : la nuit ----------
  // Une nuit qui réclame de recharger la partie n'est pas une nuit : on l'allume
  // le soir venu, entre deux jets, et l'écran doit suivre. Elle est aussi le
  // seul réglage qu'on peut appliquer à chaud SANS RIEN DÉMONTER : repeindre
  // n'enlève ni un onglet, ni un écouteur, ni un pont, et ne peut donc pas
  // laisser Roll20 dans un état où il n'était pas prévu.
  //
  // L'extinction (jjkOff) et l'interrupteur du plateau ne sont volontairement
  // PAS relus ici : ils démontent, et démonter à chaud est ce qui casse (voir
  // la garde, tout en bas, pour ce que « éteindre » peut et ne peut pas).
  //
  // La fiche servie par le site n'est pas repeinte : ce serait la RECHARGER
  // sous les doigts du joueur, au milieu d'une saisie. Elle a son propre
  // réglage dans son onglet Options, et prendra celui du popup à sa prochaine
  // ouverture.
  function repeintTout() {
    panRepeint();
    var n = document.querySelectorAll(".jjk-create, .jjk-creator-frame");
    for (var i = 0; i < n.length; i++) poseNuit(n[i]);
  }
  function ecouteNuit() {
    try {
      browser.storage.onChanged.addListener(function (ch, zone) {
        if (zone && zone !== "local") return;
        if (!ch || !ch.jjkNuit) return;
        var v = normNuit(ch.jjkNuit.newValue);
        if (v === NUIT_ORDRE) return;
        NUIT_ORDRE = v;
        repeintTout();
      });
    } catch (e) {}
  }

