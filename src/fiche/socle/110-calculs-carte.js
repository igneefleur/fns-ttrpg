  // La « carte » : le résumé CALCULÉ de la fiche, pour la bibliothèque, le
  // popup de l'extension et les attributs miroir Roll20 (barres de jetons,
  // macros). Elle ne se relit jamais : elle se recalcule.
  function computeCard() {
    function visible(k){return state.etat[k]==null?null:Math.floor(state.etat[k]);}
    var caracs = {};
    caracsOrdre().forEach(function (c) { caracs[c] = caracTotal(c); });
    return {
      name: state.name || "Sans nom",
      caracs: caracs,
      capacites: {
        pv: visible("pv"), pvMax: pvMax(),
        pe: visible("pe"), peMax: peMax(),
        pm: visible("pm"), pmMax: pmMax(),
        pi: visible("pi"), piMax: piMax(),
        pr: visible("pr"), prMax: prMax(),
        ps: visible("ps"), psMax: psMax(),
        ph: visible("ph"), phMax: phMax(),
        pc: visible("pc"), pcMax: pcMax(),
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

