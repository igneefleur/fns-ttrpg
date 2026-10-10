  // Diagnostic uniquement : les doublons restent conservés et sont tous mis à jour.
  function ditMenage(d) {
    if (!d || !d.menage || typeof d.menage !== "object") return;
    trace("menage", { menage: d.menage });
  }
