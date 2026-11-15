  // ---- Contenance : l'estomac ----
  // Un estomac d'une seule couleur, qui se remplit par le bas à mesure que la
  // contenance occupée monte, et dont la couleur passe du vert au rouge en
  // approchant du plein. La valeur s'écrit dans l'estomac. Dessous, le geste
  // de jeu des réserves : on tape ce qu'on avale ou ce qui se libère, et
  // « Appliquer » l'ajoute.
  //
  // L'IMAGE est l'estomac « plasticine » d'Icons8, découpé en DEUX MASQUES
  // (docs/assets/fiche/) : le contour, peint à l'encre de la fiche, et
  // l'intérieur, peint d'un ton neutre puis rempli. Des masques et non l'image
  // telle quelle : c'est ce qui laisse la fiche choisir les couleurs, de jour
  // comme de nuit.
  //
  // Aucun rouage : le maximum se règle dans les Options (Réglages des
  // capacités, ligne Contenance).
  function vomirContenu() {
    state.etat.contenance = 0; reinitialiseHorlogeDigestion();
    state.effetsActifs = (state.effetsActifs || []).filter(function (e) { return e.categorie !== "digestive"; });
    var d = recupCoffre(false);
    if (Array.isArray(d.ajouts)) d.ajouts = d.ajouts.filter(function (r) {
      if (r.categorie !== "digestive") return true; recupOublieSuivi(r.id); return false;
    });
    nettoieRecupCoffre(); refresh(); rebuildRecuperation();
  }
  function buildContenance() {
    var b = block("Contenance");
    var fig = el("div", "pc-estomac");
    var fond = el("span", "pc-estomac-fond");
    var plein = el("span", "pc-estomac-plein");
    var trait = el("span", "pc-estomac-trait");
    var chiffre = el("span", "pc-estomac-val");
    var v = el("b", null, "");
    var mx = el("small", null, "");
    chiffre.appendChild(v);
    chiffre.appendChild(mx);
    fig.appendChild(fond);
    fig.appendChild(plein);
    fig.appendChild(trait);
    fig.appendChild(chiffre);
    b.appendChild(fig);

    b.appendChild(commandeVariation("Contenance à ajouter ou retirer", function (d) {
      state.etat.contenance = Math.max(0, Math.round((contenancePrise() + d) * 100) / 100);
      if (!(state.etat.contenance > 0)) reinitialiseHorlogeDigestion();
    }));
    b.appendChild(miniBtn("Vomir", "Vider la contenance et interrompre les effets digestifs en cours", vomirContenu));

    hooks.push(function () {
      var pris = contenancePrise(), m = contenance();
      var p = m > 0 ? clamp(pris / m, 0, 1) : (pris > 0 ? 1 : 0);
      v.textContent = fmtP(pris);
      mx.textContent = "/ " + fmtP(m);
      // la hauteur remplie, et la teinte : vert au ventre vide, rouge au plein
      fig.style.setProperty("--niveau", (p * 100).toFixed(1) + "%");
      fig.style.setProperty("--teinte", "hsl(" + Math.round(120 - 120 * p) + ", 60%, 42%)");
      fig.classList.toggle("over", pris > m);
      fig.title = "Contenance " + fmtP(pris) + " sur " + fmtP(m);
    });
    return b;
  }
