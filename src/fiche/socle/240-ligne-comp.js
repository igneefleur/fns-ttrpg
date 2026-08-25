  // ---------- la ligne d'une compétence ----------
  // MÊME CHARPENTE QU'UNE CARACTÉRISTIQUE (.pc-crow), et ce n'est pas une
  // économie de style : depuis que les stades ont disparu, les deux lignes
  // portent exactement les mêmes choses — un nombre qu'on achète, le MOD qui
  // s'y ajoute, la limite qui coiffe le jet, et le bloc lui-même comme bouton.
  // Deux charpentes pour un même contenu auraient fini par diverger d'un pixel,
  // puis d'une infobulle.
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
    top.appendChild(el("span", "sp"));

    // LE TRIO EST LE BOUTON DE JET, d'un seul tenant : les points qu'on a
    // investis, le MOD de la caractéristique qui la porte, la limite qui coiffe
    // le résultat. Aucun ne veut rien dire sans les deux autres.
    var trio = el("span", "pc-trio pc-rollable");
    function case3() {
      var c = el("span", "c");
      var v = el("span", "v", "");
      c.appendChild(v);
      trio.appendChild(c);
      return v;
    }
    var vPts = case3();
    var vMod = case3();
    var vLim = case3();
    // rouage ouvert, on construit : le bloc ne lance pas (voir specialites.js)
    trio.addEventListener("click", function () {
      if (isEdit("comps")) return;
      doJet(code, carac, code, null);
    });
    top.appendChild(trio);
    row.appendChild(top);

    // LES ± ACHÈTENT LES POINTS, et rien ne les retient faute d'xp : l'en-tête
    // avertit dès que le total est dépassé, là où un blocage figerait toute
    // fiche remplie à l'envers — les points d'abord, l'xp total ensuite. Le
    // plafond, lui, borne pour de bon : il vient des règles.
    //
    // LE PLAFOND ET L'XP SONT ICI, ET NON EN PERMANENCE : on ne les regarde
    // qu'en construisant. En jouant, ce qu'on cherche est sur la ligne du haut.
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
    bot.appendChild(el("span", "lbl", "Plafond"));
    var vPlaf = el("span", "max", "");
    vPlaf.style.justifySelf = "end";
    bot.appendChild(vPlaf);
    bot.appendChild(el("span", "lbl", "XP"));
    var vXp = el("span", "max", "");
    vXp.style.justifySelf = "end";
    bot.appendChild(vXp);
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
      vPts.textContent = String(compPts(code));
      vMod.textContent = sign(caracMod(carac));
      vLim.textContent = String(caracLim(carac));
      trio.classList.toggle("adj", force || d !== 0 || mord || mal !== 0);
      trio.title = (force
                     ? "Points forcés (Options)"
                     : "Points " + base +
                       (mord ? ", plafonnés à " + plaf : "") +
                       (d ? " · modificateur (Options) " + sign(d) : "")) +
                   (mal ? " · endurance " + sign(-mal) : "") +
                   " — clic : lancer " + DE_DEFAUT + " " + sign(b) +
                   ", plafonné à " + caracLim(carac);
      vPlaf.textContent = String(plaf);
      vPlaf.classList.toggle("adj", mord);
      vXp.textContent = String(compXp(code));
      vXp.classList.toggle("adj", xpF || xpD !== 0);
      vXp.title = xpF ? "Coût forcé (Options) — calculé : " + compXpAuto(code)
                      : (xpD ? "Modificateur (Options) " + sign(xpD) : "");
    });
    return row;
  }
