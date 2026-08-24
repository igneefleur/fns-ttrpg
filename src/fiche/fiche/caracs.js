  // ---------- onglet Fiche : les caractéristiques ----------
  // LES HUIT, dans l'ordre de champs(), c'est-à-dire celui de la page de
  // règles. Aucune liste écrite en dur : une caractéristique renommée ou
  // déplacée dans les règles arrive ici sans qu'on rouvre ce fichier.
  //
  // LE PRESTIGE N'EST PAS ICI, et c'est délibéré : il n'est pas une
  // caractéristique, il les plafonne toutes. Il se saisit dans l'en-tête, à
  // côté de l'XP total — les deux mêmes choses, ce que le meneur accorde.
  function buildCaracs() {
    // jeu : le sigle et son trio ; édition : les ± qui achètent la valeur, et
    // ce qu'elle a coûté
    var b = block("Caractéristiques", null, "caracs");

    // ---------- l'entête des trois colonnes ----------
    // MÊME SQUELETTE QUE LE TRIO, sans ses bordures : c'est la seule façon
    // d'être sûr que les étiquettes tombent en face de leurs nombres. Une
    // rangée bâtie à part dériverait d'un pixel au premier changement de
    // remplissage, et personne ne saurait plus laquelle des trois on lit.
    //
    // Une seule fois, en tête : répétées sur chacune des huit lignes, elles
    // disaient vingt-quatre fois ce que trois mots suffisent à dire, et
    // noyaient les nombres qu'on vient lire.
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "sp"));
    var teteTrio = el("span", "pc-trio tete");
    ["Val", "Mod", "Lim"].forEach(function (k) {
      var c = el("span", "c");
      c.appendChild(el("span", "k", k));
      teteTrio.appendChild(c);
    });
    tete.appendChild(teteTrio);
    b.appendChild(tete);

    // ---------- une caractéristique ----------
    function ligne(code) {
      var info = caracInfo(code);
      var row = el("div", "pc-crow");

      var top = el("div", "pc-crow-top");
      // le sigle est ce que le joueur lit sur ses jets et dans ses règles ; le
      // nom entier tient dans l'infobulle, pour la colonne trop étroite
      var chip = el("span", "pc-abbr", code);
      chip.title = info.nom;
      top.appendChild(chip);
      top.appendChild(el("span", "sp"));

      // LE TRIO EST LE BOUTON DE JET, d'un seul tenant. Les trois nombres se
      // lisent dans l'ordre où ils se composent — la valeur qu'on a achetée, le
      // modificateur qu'elle donne au jet, la limite qui le coiffe — et aucun
      // ne veut rien dire sans les deux autres : c'est donc le BLOC qui lance,
      // et non l'un des trois. doJet est le seul chemin d'un jet de test : il
      // pose le MOD, la limite et le malus d'endurance sans qu'on y pense.
      var trio = el("span", "pc-trio pc-rollable");
      function case3() {
        var c = el("span", "c");
        var v = el("span", "v", "");
        c.appendChild(v);
        trio.appendChild(c);
        return v;
      }
      var vVal = case3();
      var vMod = case3();
      var vLim = case3();
      trio.addEventListener("click", function () { doJet(code, code, null, null); });
      top.appendChild(trio);
      row.appendChild(top);

      // LES ± ACHÈTENT LA VALEUR, et rien ne les retient faute d'xp : l'en-tête
      // AVERTIT dès que le total est dépassé, là où un blocage figerait à zéro
      // toute fiche remplie à l'envers — les valeurs d'abord, l'xp total
      // ensuite. Le prestige, lui, borne pour de bon.
      //
      // L'XP EST ICI, ET NON EN PERMANENCE : ce qu'une caractéristique a coûté
      // ne se lit qu'en construisant le personnage. En jouant, il n'apprend
      // rien et prend une ligne.
      var bot = el("div", "pc-crow-bot pc-edit-only");
      bot.appendChild(el("span", "lbl", "Valeur"));
      bot.appendChild(stepper(
        function () { return caracBase(code); },
        function (v) {
          // le plafond ne bloque que les HAUSSES : une valeur passée au-dessus
          // (prestige abaissé après coup, relèvement retiré des Options)
          // redescend pas à pas au lieu d'être écrasée d'un seul clic
          var plaf = caracPlafond(code);
          var haut = Math.max(plaf, caracBase(code));
          var n = Math.round(v);
          if (n > haut) {
            flash(haut === plaf
              ? "Plafond de " + plaf + "."
              : code + " est au-delà du plafond (" + plaf + ").");
            n = haut;
          }
          state.caracs[code] = Math.max(0, n);
        }, 1, "valeur"));
      bot.appendChild(el("span", "lbl", "XP"));
      var vXp = el("span", "max", "");
      vXp.style.justifySelf = "end";
      bot.appendChild(vXp);
      row.appendChild(bot);

      hooks.push(function () {
        var d = (state.caracsMod[code] || 0) + (state.caracsMod2[code] || 0);
        var force = state.caracsForce[code] !== undefined;
        var plaf = caracPlafond(code);
        var base = caracBase(code);
        var mord = base > plaf;
        var xpF = state.caracsXpForce[code] !== undefined;
        var xpD = (state.caracsXpMod[code] || 0) + (state.caracsXpMod2[code] || 0);
        var retouche = force || d !== 0 || mord;
        vVal.textContent = String(caracTotal(code));
        vMod.textContent = sign(caracMod(code));
        vLim.textContent = String(caracLim(code));
        trio.classList.toggle("adj", retouche);
        // quand le plafond mord, le dire : sans cela, le joueur voit un total
        // qui ne correspond ni à ce qu'il a acheté ni à ce qu'il a modifié, et
        // rien ne dit pourquoi. Un total forcé, lui, REMPLACE la somme :
        // l'afficher quand même la ferait mentir.
        trio.title = (force
                       ? "Total forcé (Options)"
                       : "Valeur " + base +
                         (mord ? ", plafonnée à " + plaf : "") +
                         (d ? " · modificateur (Options) " + sign(d) : "")) +
                     " — clic : lancer " + DE_DEFAUT + " " + sign(caracMod(code)) +
                     ", plafonné à " + caracLim(code);
        // l'XP se lit sur la valeur ACHETÉE, jamais sur le total : un
        // modificateur d'équipement ne se paie pas.
        vXp.textContent = String(caracXp(code));
        vXp.classList.toggle("adj", xpF || xpD !== 0);
        vXp.title = xpF ? "Coût forcé (Options) — calculé : " + caracXpAuto(code)
                        : (xpD ? "Modificateur (Options) " + sign(xpD) : "");
      });
      return row;
    }

    // ---------- les huit, dans l'ordre des règles ----------
    champs().forEach(function (code) { b.appendChild(ligne(code)); });
    return b;
  }
