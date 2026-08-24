
  // ---------- jour / nuit ----------
  // Même règle de priorité que la fiche, et dans le même ordre : le choix
  // mémorisé de ce joueur, puis l'indice n=1/0 du hash (posé par la coquille
  // d'après le réglage miaNuit de l'extension, et ABSENT quand ce réglage vaut
  // « auto »), puis le thème du navigateur. Jusqu'ici personne ne pouvait
  // CHOISIR la nuit du plateau : il subissait le hash.
  //
  // La clé est propre au plateau. La fiche a la sienne (« mia-r20-night ») et
  // les deux pages sont servies par la même origine : partager la clé ferait
  // qu'éclairer le plateau repeindrait la fiche du même joueur.
  //
  // Et surtout, cette préférence ne va PAS dans mia_narr_conf : c'est un
  // réglage d'affichage, propre à chacun. Dans la configuration partagée, le
  // choix d'un joueur repeindrait l'écran de toute la table, et chaque bascule
  // coûterait une écriture Roll20.
  var NUIT_CLE = "mia-r20-night-plateau";
  var NUIT_INDICE = (function () {
    var h = location.hash || "";
    if (/[#&]n=1/.test(h)) return true;
    if (/[#&]n=0/.test(h)) return false;
    try { return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches); }
    catch (e) { return false; }
  })();
  function nuitPref() {
    // localStorage peut manquer dans une iframe tierce dont les cookies sont
    // bloqués : la lecture lève, et le plateau doit alors simplement suivre
    // Roll20 au lieu de ne pas démarrer.
    try { var v = localStorage.getItem(NUIT_CLE); return v === "1" || v === "0" ? v : "auto"; }
    catch (e) { return "auto"; }
  }
  function nuitActive() { var p = nuitPref(); return p === "1" || (p === "auto" && NUIT_INDICE); }
  function appliqueNuit() {
    var on = nuitActive();
    document.documentElement.classList.toggle("night", on);
    if (btnNuit) {
      var t = on ? "Repasser en mode jour" : "Passer en mode nuit";
      btnNuit.title = t;
      btnNuit.setAttribute("aria-label", t);
      btnNuit.setAttribute("aria-pressed", on ? "true" : "false");
    }
    // ON LE DIT AU CADRE. Le cadre flottant est peint par l'extension, qui ne
    // connaît que son propre réglage ; lui seul ne peut pas deviner qu'un
    // joueur a mis CE plateau en nuit alors que le reste est en jour. Sans ce
    // message, on aurait une barre de titre claire autour d'un plateau sombre,
    // c'est-à-dire l'objet cassé en deux. Le canal l'accepte, et le cadre
    // ignore ce qu'il ne comprend pas : une extension plus ancienne ne fera
    // rien de ce champ, sans casser pour autant.
    post({ type: "panneau", nuit: on });
  }
  function poseNuit(v) {
    try {
      if (v === "1" || v === "0") localStorage.setItem(NUIT_CLE, v);
      else localStorage.removeItem(NUIT_CLE);
    } catch (e) {}
    appliqueNuit();
  }
  // Les deux icônes du bouton du site (docs/javascripts/night.js), recopiées :
  // la page ne charge rien d'autre. Laquelle des deux paraît est décidé en CSS
  // pur par html.night, jamais ici.
  var SVG_NUIT =
    '<svg class="nb-croissant" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,10.5L19.61,11.76L20.2,13.74L18.5,12.56L16.8,13.74L17.39,11.76L15.75,10.5L17.81,10.43L18.5,8.5L19.19,10.43L21.25,10.5M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95Z"/></svg>' +
    '<svg class="nb-soleil" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M3.55,19.09L4.96,20.5L6.76,18.71L5.34,17.29M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M20,13H23V11H20M17.24,18.71L19.04,20.5L20.45,19.09L18.66,17.29M20.45,5L19.04,3.5L17.24,5.29L18.66,6.71M13,1H11V4H13M6.76,5.29L4.96,3.5L3.55,4.91L5.34,6.71M1,13H4V11H1M13,20H11V23H13V20Z"/></svg>';
