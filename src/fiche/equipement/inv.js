  function buildInv() {
    // le rouage re-rend l'inventaire : messages et titres suivent le mode
    var invRenderRef = { fn: null };
    var bO = block("Inventaire", "objets par groupes", "inv", function () {
      if (invRenderRef.fn) invRenderRef.fn();
    });
    invObjets(bO, invRenderRef);
    return bO;
  }

