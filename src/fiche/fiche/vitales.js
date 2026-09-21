  // ---- 4. Vitalité : PV, PE, PM ----
  function buildVitales() {
    var b = block("Vitalité", null, "vitales");
    jauge(b, "pv", { pas: 1, provenance: function () {
      var t = provenanceCap("pv")();
      var e = effondrement();
      // l'effondrement descend le maximum : le dire ici, ou le chiffre paraît
      // faux au joueur qui vérifie la formule de tête
      if (e > 0) t += " · effondrement " + e + " (−" + (num(effDef().pvParNiveau, 0) * e) + " %)";
      return t;
    } });
    jauge(b, "pe", { pas: 1, provenance: function () {
      var t = provenanceCap("pe")();
      var e = effondrement();
      if (e > 0) t += " · effondrement " + e + " (−" + (num(effDef().peParNiveau, 0) * e) + " %)";
      return t;
    } });
    // LES POINTS DE MANA. Aucune règle publiée ne donne leur maximum : il vaut
    // donc ZÉRO, et cela doit SE VOIR plutôt que se deviner. La donnée le dit
    // (formule nulle), la ligne affiche « / 0 », l'infobulle et la note le
    // redisent en clair, et le champ « Forcé » du rouage permet d'en poser un
    // en attendant. Le jour où une règle le donnera, ce sera UNE LIGNE de
    // owd-creation.json, pas une ligne de JavaScript.
    jauge(b, "pm", {
      pas: 1,
      titreForce: "Vide = maximum calculé ; une valeur le force.",
      // AUCUNE NOTE, ET AUCUNE INFOBULLE QUI GLOSE. Le maximum vaut zéro tant
      // qu'aucune formule ne le donne, et c'est le zéro affiché qui le dit :
      // l'écrire en toutes lettres serait réciter le livre dans l'outil, et
      // cette phrase-là vieillirait sans que la fiche plante.
      provenance: function () { return "Maximum calculé : " + fmtP(autoDe("pm")); }
    });
    var pied = el("div", "pc-comp-tools");
    var ligne = el("div", "row");
    ligne.appendChild(chatBtn(
      function () { return "État — " + (state.name || "sans nom"); },
      function () { return champsEtat(); }));
    pied.appendChild(ligne);
    b.appendChild(pied);
    return b;
  }
  // Les champs de la carte « État » : les sept jauges en courant / maximum, et
  // le niveau d'effondrement. Deux blocs l'envoient, une seule composition.
  function champsEtat() {
    var out = [];
    ["pv", "pe", "pm", "pi", "pr", "ps", "ph"].forEach(function (cle) {
      out.push([abbrCap(cle, cle.toUpperCase()), fmtP(courant(cle)) + " / " + fmtP(maxDe(cle))]);
    });
    out.push(["Exposition", fmtP(state.etat.expo) + " / " + fmtP(expoMax())]);
    out.push(["Effondrement", String(effondrement())]);
    return out;
  }

