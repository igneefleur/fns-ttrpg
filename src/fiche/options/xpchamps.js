  // ---------- xp par champ ----------
  // Où le personnage a mis son xp : la caractéristique elle-même, les
  // compétences qu'elle commande et les spécialités qui en relèvent. Ce
  // partage-là est tranché par xpChamp(), pas ici — une compétence que
  // plusieurs caractéristiques plafonnent ne doit être comptée qu'une fois, et
  // ce n'est pas à l'affichage d'en décider. Les barres se comparent entre
  // elles (part du dépensé), pas au total disponible : c'est la répartition
  // qui intéresse.
  function buildXpChamps() {
    var b = block("XP par champ");
    // Huit lignes désormais, et non trois : les deux groupes des règles se
    // séparent d'une bande, sans quoi l'œil ne voit qu'une colonne de huit
    // barres. Le groupe se lit dans les données ; s'il manque, la bande ne
    // paraît pas plutôt que de porter un titre vide.
    var groupe = "";
    champs().forEach(function (c) {
      var g = caracInfo(c).groupe || "";
      if (g && g !== groupe) b.appendChild(el("div", "pc-comp-champ", capFirst(g)));
      groupe = g;

      var row = el("div", "pc-xpchamp");
      var chip = el("span", "pc-abbr", c);
      chip.title = caracInfo(c).nom;
      row.appendChild(chip);
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
        var xp = xpChamp(c), tot = xpDepense();
        v.textContent = xp + " xp";
        var p = tot > 0 ? (xp / tot) * 100 : 0;
        fill.style.width = clamp(p, 0, 100) + "%";
        part.textContent = tot > 0 ? Math.round(p) + " %" : "—";
        // Le reste, c'est ce que xpChamp() a ramassé AUTOUR de la
        // caractéristique. Il s'arrondit au centième parce qu'un point de
        // spécialité coûte un quart d'xp : sans cela, l'infobulle affiche
        // 3.9999999999999996.
        var propre = caracXp(c);
        row.title = caracInfo(c).nom + " : " + propre + " xp de caractéristique, " +
                    (Math.round((xp - propre) * 100) / 100) +
                    " xp de compétences et de spécialités";
      });
      b.appendChild(row);
    });
    return b;
  }

