  // Même règle que l'amorceur du site : une page du site, relative, sans
  // schéma, sans « // » de tête, sans remontée de dossier. Le hash arrive du
  // content-script, mais rien n'empêche quiconque de rouvrir cette page avec
  // un autre : elle ne doit jamais devenir un iframeur universel.
  function sure(p) {
    return typeof p === "string" && /^[A-Za-z0-9._/-]+\.html$/.test(p) &&
           p.indexOf("//") !== 0 && p.indexOf("..") < 0;
  }

