
  // SONDE DE DÉPANNAGE. Le plateau vit dans un iframe d'une autre origine : ni
  // la page Roll20 ni une sonde collée dans sa console ne peuvent lire ces
  // variables, et le message « hydrate » est adressé au panneau, pas à la
  // fenêtre du haut. Sans cette trace, un joueur qui constate une panne n'a
  // aucun moyen de dire ce que son plateau a vu, et moi aucun moyen de le
  // savoir : je n'ai pas de compte Roll20.
  //
  // Elle n'écrit rien et ne change rien. Elle se déclenche seulement quand le
  // plateau change d'avis (état sûr, refus, droits) ou toutes les dix secondes,
  // pour ne pas noyer la console d'une partie.
  //
  // ET ELLE EST ÉTEINTE PAR DÉFAUT depuis qu'elle a servi : deux lignes par
  // seconde dans la console de chaque joueur pendant toute une partie, c'est une
  // console inutilisable pour tout le reste. Les deux façons de la rallumer sont
  // en tête de fichier ; DIAG est lu une seule fois, au chargement, pour qu'une
  // partie ne puisse pas se mettre à parler en cours de route.
  var DIAG = (function () {
    if (/[#&]diag\b/.test(location.hash || "")) return true;
    // localStorage peut lever dans une iframe tierce aux cookies bloqués : la
    // trace n'est pas une raison de ne pas démarrer.
    try { return localStorage.getItem("mia-plateau-diag") === "1"; } catch (e) { return false; }
  })();
  var traceQuoi = "", traceQuand = 0;
  function trace(ou, sup) {
    if (!DIAG) return;
    try {
      var e = { ou: ou, charId: charId, ecrivable: ecrivable, etatSur: etatSur,
                refuse: refuse, confFuture: confFuture, lu: lu, vide: vide,
                perdues: perdues, attentes: Object.keys(attente).length,
                jetons: Object.keys(points).length, ecran: etatMontre };
      var k;
      for (k in (sup || {})) { if (sup.hasOwnProperty(k)) { e[k] = sup[k]; } }
      var sig = JSON.stringify(e);
      var t = Date.now();
      if (sig === traceQuoi && t - traceQuand < 10000) { return; }
      traceQuoi = sig; traceQuand = t;
      if (window.console && console.log) { console.log("[plateau MIA] " + sig); }
      // ET ON LA FAIT REMONTER. Le plateau vit dans un iframe d'une autre
      // origine : ses messages de console n'apparaissent pas dans celle de
      // Roll20 sans aller sélectionner le cadre à la main, ce que personne n'a
      // envie de faire pour signaler une panne. On la poste donc vers la fenêtre
      // du haut, où un script de dépannage peut les ramasser toutes.
      //
      // « mia-diag » et non « mia » : le pont ne doit jamais confondre ceci avec
      // un ordre. Il ignore tout ce qui ne porte pas son propre nom.
      try { (window.top || window).postMessage({ ns: "mia-diag", ligne: sig }, "*"); } catch (e2) {}
    } catch (err) {}
  }

  // Ce que le pont a relevé du modèle juste après avoir écrit, RACCOURCI. Un
  // fond de zone pèse deux cent mille caractères : recopié tel quel dans la
  // trace, il la rend illisible et fait ramer la console qu'on venait consulter.
  // Seule la LONGUEUR importe pour ces valeurs-là.
  function resumeEcrits(e) {
    if (!e) return null;
    var r = {}, k, s, v;
    for (k in e) {
      if (!e.hasOwnProperty(k)) continue;
      s = {}; v = e[k] || {};
      s.serveur = v.serveur; s.detail = v.detail; s.homonymes = v.homonymes;
      s.voulu = court(v.voulu); s.modele = court(v.modele);
      r[k] = s;
    }
    return r;
  }
  function court(v) {
    if (v == null) return v;
    var s = String(v);
    return s.length > 80 ? "(" + s.length + " caracteres)" : s;
  }
