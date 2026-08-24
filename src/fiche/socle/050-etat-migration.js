  // Toute donnée entrante (localStorage, import JSON, Attributes Roll20) passe
  // par cette normalisation : champ manquant -> valeur par défaut, types sûrs.
  // La validation est PROFONDE (éléments des tableaux, sous-objets compris) :
  // un état corrompu ne doit ni briquer la page ni s'effacer en silence.
  // Migration de schéma, AVANT toute normalisation : normalize() complète et
  // nettoie selon la forme d'AUJOURD'HUI, donc il faut d'abord amener l'état
  // jusqu'ici. Le moteur est facultatif de naissance : le repli gelé de
  // roll20-fiche.html ne charge que le bundle, et une fiche sans moteur doit
  // s'ouvrir quand même — d'où le garde, qui restera pour toujours.
  // Une fiche VENUE DU FUTUR (v > SCHEMA) n'est pas migrée à la baisse en
  // douce : on la laisse telle quelle et l'amorce s'en occupe (écran de
  // version). Écrire dessus avec un code qui ne la comprend pas serait le
  // seul vrai moyen de la perdre. Le schéma est d'ailleurs le SEUL axe qui
  // fasse encore paraître cet écran : un simple écart de numéro de release ne
  // le déclenche plus, sans quoi un correctif de feuille de style barrerait
  // le passage à toute une table.
  function migre(s) {
    if (!s || typeof s !== "object") return s;
    var de = parseInt(s.v, 10);
    if (!isFinite(de)) de = 1;
    if (de === SCHEMA) return s;
    if (de > SCHEMA) return s;                     // du futur : ne rien toucher
    if (!window.MiaMigr || !window.MiaMigr.appliquer) return s;
    var r = window.MiaMigr.appliquer(s, de, SCHEMA);
    if (!r || !r.ok) return s;                     // échec : l'état d'origine, intact
    r.state.v = SCHEMA;
    r.state.rel = RELEASE;
    return r.state;
  }

