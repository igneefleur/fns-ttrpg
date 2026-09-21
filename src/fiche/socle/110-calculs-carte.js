  // La « carte » : le résumé CALCULÉ de la fiche, pour la bibliothèque, le
  // popup de l'extension et les attributs miroir Roll20 (barres de jetons,
  // macros). Elle ne se relit jamais : elle se recalcule.
  function computeCard() {
    var caracs = {};
    caracsOrdre().forEach(function (c) { caracs[c] = caracTotal(c); });
    return {
      name: state.name || "Sans nom",
      caracs: caracs,
      capacites: {
        pv: state.etat.pv, pvMax: pvMax(),
        pe: state.etat.pe, peMax: peMax(),
        pm: state.etat.pm, pmMax: pmMax(),
        pi: state.etat.pi, piMax: piMax(),
        pr: state.etat.pr, prMax: prMax(),
        ps: state.etat.ps, psMax: psMax(),
        ph: state.etat.ph, phMax: phMax(),
        pc: state.etat.pc, pcMax: pcMax(),
        expo: state.etat.expo, expoMax: expoMax(),
        charge: charge(), chargePorte: poidsPorte(),
        acces: accesRapides(), accesPris: accesPris(),
        contenance: contenance(), contenancePrise: contenancePrise(),
        rupture: state.etat.rupture === null ? ruptureRestante() : state.etat.rupture,
        ruptureMax: ruptureMax(),
        effondrement: effondrement(),
        desAction: desAction(),
        xpDepense: xpDepense()
      }
    };
  }

