  // ---- 11. Charge et contenance ----
  // Les trois limites du corps, en jauges lisibles. Aucun rouage n'est
  // nécessaire pour LIRE ; les forçages vivent dans le bloc Corps, et le
  // rouage n'est là que pour les modificateurs de poids.
  function buildCharge() {
    var b = block("Charge et contenance", null, "charge");
    function jaugeLimite(libelle, pris, total, unite) {
      var m = el("span", "pc-meter");
      m.appendChild(el("span", null, libelle));
      var v = el("b", null, "");
      m.appendChild(v);
      var bar = el("span", "bar");
      var fill = el("i");
      bar.appendChild(fill);
      m.appendChild(bar);
      hooks.push(function () {
        var p = pris(), t = total();
        v.textContent = fmtP(p) + " / " + fmtP(t) + (unite ? " " + unite : "");
        var over = p > t;
        v.classList.toggle("over", over);
        fill.classList.toggle("over", over);
        fill.style.width = clamp(t ? (p / t) * 100 : 0, 0, 100) + "%";
      });
      b.appendChild(m);
      return m;
    }
    jaugeLimite("Charge", poidsPorte, charge);
    jaugeLimite("Accès rapides", accesPris, accesRapides);
    jaugeLimite("Contenance", contenancePrise, contenance);
    var mrow = el("div", "pc-pvmax pc-mods-host pc-edit-only");
    mrow.appendChild(el("span", "lbl", "Charge"));
    mrow.appendChild(multiModBoite("capsLeviers", "max", "charge"));
    mrow.appendChild(el("span", "sp"));
    b.appendChild(mrow);
    // La fiche COMPTE et AVERTIT, elle n'interdit rien : une fiche qui refuse
    // une saisie oblige le joueur à mentir à sa fiche.
    b.appendChild(note("Le poids porté vient des groupes cochés de l'inventaire et des vêtements portés."));
    return b;
  }

