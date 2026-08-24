  // ---------- la ligne d'une compétence ----------
  // MÊME CHARPENTE QU'UNE CARACTÉRISTIQUE (.pc-crow), et ce n'est pas une
  // économie de style : depuis que les stades ont disparu, les deux lignes
  // portent exactement les mêmes choses — un nombre qu'on achète, un plafond
  // qui le retient, une limite qui coiffe le jet, et le chiffre lui-même comme
  // bouton. Deux charpentes pour un même contenu auraient fini par diverger
  // d'un pixel, puis d'une infobulle.
  //
  // opts : { reg } — le registre de rafraîchissement où la ligne s'inscrit,
  // celui du module qui la bâtit. Une ligne détruite emporte ses fonctions ;
  // laissées dans le registre du voisin, elles rafraîchiraient un élément qui
  // n'est plus dans la page. Par défaut : celui des lignes de compétences.
  function compRow(item, odd, opts) {
    opts = opts || {};
    var reg = opts.reg || compHooks;
    // Un appelant peut ne nommer sa ligne que par une clé (ctx.ligneComp d'un
    // mod) : ce sont les SIGLES que les calculs attendent, et allComps() les
    // donne dans « code ».
    var code = item.code || item.key;
    // La caractéristique par DÉFAUT : celle qui donne le MOD et la LIM du jet.
    // Le joueur peut en demander une autre au moment de lancer (réglage « Au
    // choix » de la barre d'envoi) ; c'est doJet qui le lui propose, pas la ligne.
    var carac = item.carac || compCarac(code);
    var row = el("div", "pc-crow" + (odd ? " odd" : ""));

    var top = el("div", "pc-crow-top");
    var chip = el("span", "pc-abbr", code);
    chip.title = item.name;
    top.appendChild(chip);
    // LA VALEUR EST LE BOUTON DE JET, comme sur une caractéristique. Ce qu'elle
    // affiche est le BONUS et non les points : c'est lui qui part sur le dé,
    // points et MOD confondus, et c'est le seul nombre qu'on cherche en jouant.
    var val = el("span", "pc-cval pc-rollable", "");
    val.addEventListener("click", function () { doJet(code, carac, code, null); });
    top.appendChild(val);
    row.appendChild(top);

    // PTS, LIM et XP restent lisibles ROUAGE FERMÉ. Le plafond suit les points
    // dans la même case : sans lui, on découvre qu'on est au bout quand un « + »
    // cesse de répondre, ce qui passe pour une panne du bouton.
    var meta = el("div", "pc-kv");
    meta.appendChild(el("span", "k", "PTS"));
    var vPts = el("span", "max", "");
    meta.appendChild(vPts);
    meta.appendChild(el("span", "k", "LIM"));
    var vLim = el("span", "max", "");
    meta.appendChild(vLim);
    meta.appendChild(el("span", "sp"));
    meta.appendChild(el("span", "k", "XP"));
    var vXp = el("span", "max", "");
    meta.appendChild(vXp);
    row.appendChild(meta);

    // LES ± ACHÈTENT LES POINTS, et rien ne les retient faute d'xp : l'en-tête
    // avertit dès que le total est dépassé, là où un blocage figerait toute
    // fiche remplie à l'envers — les points d'abord, l'xp total ensuite. Le
    // plafond, lui, borne pour de bon : il vient des règles.
    var bot = el("div", "pc-crow-bot pc-edit-only");
    bot.appendChild(el("span", "lbl", "Points"));
    bot.appendChild(stepper(
      function () { return state.comps[code] || 0; },
      function (v) {
        // le plafond ne bloque que les HAUSSES : des points investis avant
        // qu'un malus ne rabaisse la caractéristique redescendent pas à pas au
        // lieu d'être rognés d'un seul clic, ce qui rendrait l'xp introuvable
        var plaf = compPlafond(code);
        var haut = Math.max(plaf, state.comps[code] || 0);
        var n = Math.round(v);
        if (n > haut) {
          flash(haut === plaf
            ? "Plafond de " + plaf + "."
            : code + " est au-delà du plafond (" + plaf + ").");
          n = haut;
        }
        n = Math.max(0, n);
        // zéro n'est pas une donnée : une clé absente vaut zéro partout
        // (accesseurs, attributs Roll20), et l'état voyage d'autant plus léger
        if (n) state.comps[code] = n; else delete state.comps[code];
      }, 1, "points", reg));
    row.appendChild(bot);

    reg.push(function () {
      var base = state.comps[code] || 0;
      var plaf = compPlafond(code);
      var mord = base > plaf;
      var d = (state.compsMod[code] || 0) + (state.compsMod2[code] || 0);
      var force = state.compsForce[code] !== undefined;
      var xpF = state.compsXpForce[code] !== undefined;
      var xpD = (state.compsXpMod[code] || 0) + (state.compsXpMod2[code] || 0);
      // le malus d'endurance pèse sur TOUS les jets : il est déjà dans le
      // bonus, il n'est nommé ici que pour qu'on sache d'où vient l'écart
      var mal = enduranceMalus();
      var b = jetBonus(carac, code, null);
      val.textContent = sign(b);
      val.classList.toggle("adj", force || d !== 0 || mord || mal !== 0);
      val.title = (force
                    ? "Points forcés (Options)"
                    : "Points " + base +
                      (mord ? ", plafonnés à " + plaf : "") +
                      (d ? " · modificateur (Options) " + sign(d) : "")) +
                  " · " + carac + " " + sign(caracMod(carac)) +
                  (mal ? " · endurance " + sign(-mal) : "") +
                  " — clic : lancer " + DE_DEFAUT + " " + sign(b) +
                  ", plafonné à " + caracLim(carac);
      vPts.textContent = compPts(code) + " / " + plaf;
      vPts.classList.toggle("adj", force || d !== 0 || mord);
      vLim.textContent = String(caracLim(carac));
      vXp.textContent = String(compXp(code));
      vXp.classList.toggle("adj", xpF || xpD !== 0);
      vXp.title = xpF
        ? "Coût forcé (Options) — calculé : " + compXpAuto(code)
        : "Un point de compétence coûte " + repli("xpComp") + " xp" +
          (xpD ? " · modificateur (Options) " + sign(xpD) : "");
    });
    return row;
  }

