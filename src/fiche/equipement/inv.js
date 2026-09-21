  function buildInv() {
    // le rouage re-rend l'inventaire : messages et titres suivent le mode
    var ref = { fn: null };
    var b = block("Inventaire", null, "inv", function () {
      if (ref.fn) ref.fn();
    });
    invObjets(b, ref);
    return b;
  }

  // ================= ONGLET OPTIONS =================

