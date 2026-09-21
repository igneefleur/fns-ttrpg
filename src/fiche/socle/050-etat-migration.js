  function migre(s) {
    if (!s || typeof s !== "object") return s;
    var de = parseInt(s.v, 10);
    if (!isFinite(de)) de = 1;
    if (de === SCHEMA) return s;
    if (de > SCHEMA) return s;
    if (!window.OwdMigr || !window.OwdMigr.appliquer) return s;
    var r = window.OwdMigr.appliquer(s, de, SCHEMA);
    if (!r || !r.ok) return s;                    // échec : l'état d'origine, intact
    r.state.v = SCHEMA;
    r.state.rel = RELEASE;
    return r.state;
  }

  // Toute donnée entrante (localStorage, import JSON, Attributes Roll20) passe
  // par ici : champ manquant -> défaut, types sûrs, entrées sans id pourvues.
  // La validation est PROFONDE ; elle ne PURGE AUCUNE clé racine inconnue,
  // c'est ce qui permet à un mod et à une version future de faire voyager
  // leurs données sans que la fiche les efface au passage.
