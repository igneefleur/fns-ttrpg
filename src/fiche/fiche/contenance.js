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

    var cmd = el("div", "pc-vital-cmd pc-temps");
    var delta = el("input", "pc-vital-delta");
    delta.type = "number";
    delta.step = "1";
    delta.placeholder = "±";
    delta.setAttribute("aria-label", "Contenance à ajouter ou retirer");
    function applique() {
      var d = parseFloat(delta.value);
      if (!isFinite(d) || !d) return;
      state.etat.contenance = Math.max(0, Math.round((contenancePrise() + d) * 100) / 100);
      delta.value = "";
      refresh();
    }
    delta.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); applique(); }
    });
    cmd.appendChild(delta);
    cmd.appendChild(miniBtn("Appliquer", "Ajouter cette variation", applique));
    b.appendChild(cmd);

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
