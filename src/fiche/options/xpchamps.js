  // ---------- xp par champ ----------
  // Où le personnage a mis son xp : la caractéristique elle-même et toutes ses
  // compétences. Les barres se comparent entre elles (part du dépensé), pas au
  // total disponible : c'est la répartition qui intéresse.
  function buildXpChamps() {
    var b = block("XP par champ", null, null);
    CHAMPS.forEach(function (carac) {
      var row = el("div", "pc-xpchamp");
      row.appendChild(el("span", "pc-abbr", ABBR[carac] || carac));
      var m = el("span", "pc-meter");
      var v = el("b", null, "");
      m.appendChild(v);
      var bar = el("span", "bar");
      var fill = el("i");
      bar.appendChild(fill);
      m.appendChild(bar);
      var part = el("span", "pct", "");
      m.appendChild(part);
      row.appendChild(m);
      hooks.push(function () {
        var xp = xpChamp(carac), tot = xpDepense();
        v.textContent = xp + " xp";
        var p = tot > 0 ? (xp / tot) * 100 : 0;
        fill.style.width = clamp(p, 0, 100) + "%";
        part.textContent = tot > 0 ? Math.round(p) + " %" : "—";
        row.title = carac + " : " + (DATA.xpParStade * (state.caracsXp[carac] || 0)) +
                    " xp de caractéristique, " +
                    (xp - DATA.xpParStade * (state.caracsXp[carac] || 0)) + " xp de compétences";
      });
      b.appendChild(row);
    });
    return b;
  }

