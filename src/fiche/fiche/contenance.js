  // ---- Contenance : l'estomac ----
  // Un estomac d'une seule couleur, qui se remplit par le bas à mesure que la
  // contenance occupée monte, et dont la couleur passe du vert au rouge en
  // approchant du plein. La valeur s'écrit dans l'estomac. Dessous, le geste
  // de jeu des réserves : on tape ce qu'on avale ou ce qui se libère, et
  // « Appliquer » l'ajoute.
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
  function accelereDigestion() {
    var volume = contenancePrise(), t = tempsDef(), cadence = digestionCadenceSecondes();
    var parTranche = t && t.digestion ? num(t.digestion.volume, 0) : 0;
    var fait = volume > 0 && cadence > 0 && parTranche > 0;
    if (fait) {
      if (window.__owdDigestionAcceleree) window.__owdDigestionAcceleree(volume);
      var phase = secondesHorlogeProcessus("horlogeDigestion") % cadence;
      appliqueDigestionSecondes(Math.ceil(volume / parTranche) * cadence - phase, 1);
    }
    recupListeModule().forEach(function (r) {
      if (r.categorie === "digestive" && recupAccelereModule(r)) fait = true;
    });
    if (fait) refresh();
    return fait;
  }
  function jaugeEstomac() {
    var ns = "http://www.w3.org/2000/svg";
    function element(tag, attributs) {
      var n = document.createElementNS(ns, tag);
      Object.keys(attributs).forEach(function (cle) { n.setAttribute(cle, attributs[cle]); });
      return n;
    }
    var courbe = "M101 17 H124 V52 C124 59 125 66 127 71 C142 50 164 42 183 48 " +
      "C207 55 223 77 221 107 C219 143 203 185 179 207 C152 231 110 224 90 208 " +
      "C81 201 78 187 67 185 C55 181 43 194 42 211 C30 220 18 207 18 200 " +
      "C22 181 36 158 55 158 C71 158 82 169 94 169 C109 169 119 157 119 142 " +
      "L119 100 C108 85 101 69 101 55 Z";
    var id = uid("clip-estomac");
    var svg = element("svg", { viewBox: "0 0 240 240", "aria-hidden": "true", focusable: "false" });
    var defs = element("defs", {}), clip = element("clipPath", { id: id });
    clip.appendChild(element("path", { d: courbe }));
    defs.appendChild(clip);
    svg.appendChild(defs);
    svg.appendChild(element("path", { d: courbe, "class": "pc-estomac-fond" }));
    var liquide = element("g", { "clip-path": "url(#" + id + ")" });
    liquide.appendChild(element("rect", { x: "0", y: "17", width: "240", height: "207", "class": "pc-estomac-plein" }));
    svg.appendChild(liquide);
    svg.appendChild(element("path", { d: courbe, fill: "none", "class": "pc-estomac-trait", "vector-effect": "non-scaling-stroke" }));
    return svg;
  }
  function buildContenance() {
    var b = block("Contenance");
    var fig = el("div", "pc-estomac");
    var chiffre = el("span", "pc-estomac-val pc-vital-val");
    var v = champNombreSigne(el("input", "pc-vital-num"));
    v.setAttribute("aria-label", "Contenance actuelle");
    v.dataset.syncReserve = "contenance";
    var mx = el("span", "pc-vital-max");
    function ecritContenance(valeur) {
      state.etat.contenance = Math.max(0, Math.round(valeur * 100) / 100);
      if (!state.etat.contenance) reinitialiseHorlogeDigestion();
    }
    v.addEventListener("input", function () {
      var valeur = v.value.trim() ? litNombreSigne(v.value) : 0;
      if (!isFinite(valeur)) return;
      if (window.__owdReserveSet) window.__owdReserveSet("contenance");
      ecritContenance(valeur);
      refresh();
    });
    v.addEventListener("blur", function () { v.value = fmtP(contenancePrise()); });
    chiffre.appendChild(v);
    chiffre.appendChild(mx);
    fig.appendChild(jaugeEstomac());
    fig.appendChild(chiffre);
    b.appendChild(fig);

    var controles = el("div", "pc-contenance-controles");
    controles.appendChild(commandeVariation("Contenance à ajouter ou retirer", function (d) {
      ecritContenance(contenancePrise() + d);
    }));
    var commandes = el("div", "pc-segs pc-contenance-commandes");
    var vomir = boutonAction("Vomir"), accelerer = boutonAction("Accélérer");
    vomir.title = "Vider la contenance et interrompre les effets digestifs";
    accelerer.title = "Terminer la digestion et ses récupérations sans avancer l’horloge";
    vomir.addEventListener("click", function () {
      var revision = marqueAction();
      vomirContenu();
      confirmeAction(vomir, revision);
    });
    accelerer.addEventListener("click", function () {
      var revision = marqueAction();
      if (accelereDigestion()) confirmeAction(accelerer, revision);
    });
    commandes.appendChild(vomir); commandes.appendChild(accelerer);
    controles.appendChild(commandes);
    b.appendChild(controles);

    hooks.push(function () {
      var pris = contenancePrise(), m = contenance();
      var taux = m > 0 ? pris / m : (pris > 0 ? 1.45 : 0);
      if (document.activeElement !== v) v.value = fmtP(pris);
      v.style.width = Math.max(3.4, v.value.length + 0.3) + "ch";
      mx.textContent = "/ " + fmtP(m);
      fig.style.setProperty("--owd-contenance-taux", String(clamp(taux, 0, 1.45)));
      fig.classList.toggle("over", pris > m);
      fig.title = "Contenance " + fmtP(pris) + " sur " + fmtP(m);
    });
    return b;
  }
