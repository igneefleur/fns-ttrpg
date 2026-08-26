  // ---------- jets ----------
  // Les dés se jettent dans Roll20 : mia-roll20-boot.js (amorce Roll20 servie
  // par le site) pose window.__miaRoll et le jet part au TCHAT. Sur le site
  // (pas de Roll20), un clic lance quand même le dé et montre le résultat dans
  // un toast discret — aucun panneau de jets.
  // CE QUE LA FICHE LANCE POUR UN JET DE TEST : le dé du réglage, ou celui des
  // règles. Une seule fonction le dit, pour que l'expression envoyée au tchat,
  // le tirage local et les infobulles ne puissent pas se contredire.
  function deTest() { return (state && state.de) || DE_TEST_DEFAUT; }
  // LE MÊME, DÉBARRASSÉ DE SES MARQUEURS. « cs> » et « cf< » ne parlent qu'à
  // Roll20 : ni parseDice ni une infobulle n'en font quoi que ce soit, et
  // « 1d100cs>96cf<5 » écrit dans une phrase se lit très mal.
  function deNu(expr) {
    return String(expr == null ? "" : expr).replace(/c[sf][<>]=?\d+/gi, "").trim();
  }
  // LES DEUX SEUILS PORTÉS PAR UNE EXPRESSION, s'ils y sont. C'est le joueur qui
  // écrit son dé : on lit ses seuils à lui, jamais ceux des règles.
  function seuilsCrit(expr) {
    var s = String(expr == null ? "" : expr);
    var r = /cs>=?(\d+)/i.exec(s), e = /cf<=?(\d+)/i.exec(s);
    return { reussite: r ? +r[1] : null, echec: e ? +e[1] : null };
  }
  function parseDice(expr) {
    var m = /^(\d{1,2})d(\d{1,4})([+-]\d{1,4})?$/i.exec(String(expr || "").replace(/\s/g, ""));
    if (!m) return null;   // expression illisible : doRoll prévient au lieu de lancer autre chose
    return { n: clamp(+m[1], 1, 20), faces: clamp(+m[2], 2, 1000), plus: +(m[3] || 0) };
  }

  // ---------- CE QUI SE DEMANDE AVANT DE LANCER, ET QUI SE DEMANDE ICI ----------
  // UNE SEULE BOÎTE, DANS LA FICHE, ET PLUS AUCUNE REQUÊTE ROLL20. C'est une
  // question de cohérence avant tout : dès qu'UNE des trois questions doit se
  // poser dans la fiche, les poser ailleurs en même temps ferait répondre à
  // deux endroits pour un seul jet.
  //
  // ET LA COMPÉTENCE DOIT S'Y POSER — le moteur de dés de Roll20 ne sait pas
  // écrire ce qu'il faudrait, et c'est mesuré dans une vraie partie, pas
  // déduit :
  //   — un groupe DANS un groupe est refusé (« Cannot mix sum and M rolls in a
  //     roll group »), et un groupe comme terme d'une somme aussi. Or la règle
  //     de l'écart en demande deux : un « plus bas des deux » pour ramener le
  //     total, un second pour le plafond du jet ;
  //   — une requête DANS une requête, écrite en entités, n'est pas relue :
  //     « There was an error with your formula » ;
  //   — un même dé ne peut pas apparaître à deux endroits d'un groupe.
  // Il ne restait donc, côté Roll20, qu'à énumérer les COUPLES dans une requête
  // unique : huit caractéristiques par neuf compétences, soixante-douze
  // réponses à dérouler. Exact, et inutilisable.
  //
  // Ce qu'on y gagne, au passage : la fiche CONNAÎT la réponse. Elle peut donc
  // envoyer une expression entièrement calculée — pas de requête, pas
  // d'échappement, pas d'entités, et une macro de soixante-seize signes au lieu
  // de quatre mille.
  function demandeJet(label, carac, comp, spe, suite) {
    var surCarac = envCaracChoix();
    var surComp = envCompChoix() && !!spe;
    var surModif = envInput();
    if (!surCarac && !surComp && !surModif) { suite(carac, comp, 0); return; }

    var corps = el("div", "pc-modal-body");
    var prisC = carac, prisK = comp, modif = null;

    // Une rangée de sigles : on choisit d'un clic, et celui de la ligne est
    // allumé. Une liste déroulante demanderait deux clics pour la même chose.
    function rangee(titre, codes, courant, nomDe, poser) {
      corps.appendChild(el("div", "pc-comp-champ", titre));
      var g = el("div", "pc-choix-jet");
      var btns = [];
      codes.forEach(function (k) {
        var b = el("button", "pc-modal-choix" + (k === courant ? " on" : ""), k || "—");
        b.type = "button";
        b.title = k ? nomDe(k) : "Sans compétence";
        b.addEventListener("click", function () {
          poser(k);
          btns.forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
        });
        btns.push(b);
        g.appendChild(b);
      });
      corps.appendChild(g);
    }

    if (surCarac) {
      var cs = [carac].concat(champs().filter(function (c) { return c !== carac; }));
      rangee("Caractéristique", cs, carac,
             function (c) { return caracInfo(c).nom; },
             function (c) { prisC = c; });
    }
    if (surComp) {
      // « — » est une réponse LÉGITIME : une spécialité peut ne relever d'aucune
      // compétence, et on peut vouloir la lancer sans.
      var propre = spe.comp || "";
      var ks = [propre].concat(champsComp().filter(function (k) { return k !== propre; }));
      if (propre !== "") ks.push("");
      rangee("Compétence", ks, propre,
             function (k) { return compInfo(k).nom; },
             function (k) { prisK = k; });
    }
    var champModif = null;
    if (surModif) {
      // LE MODIFICATEUR S'AJOUTE APRÈS LE PLAFOND, hors du groupe : c'est la
      // règle de l'endurance — ce qu'on dépense « est un bonus qu'on ajoute à
      // la fin », et la limite borne ce que le personnage vaut par lui-même.
      champModif = el("input", "pc-num");
      champModif.type = "number";
      champModif.step = "1";
      champModif.value = "0";
      corps.appendChild(fld("Modificateur", champModif));
    }
    dialogue("Lancer « " + (label || "jet") + " »", corps, function () {
      modif = champModif ? Math.round(parseFloat(champModif.value) || 0) : 0;
      suite(prisC, prisK, modif);
    }, "Lancer");
  }

  // LE JET DE TEST : caractéristique, compétence ou spécialité. C'est le seul
  // chemin par lequel un jet plafonné part au tchat.
  function doJet(label, carac, comp, spe, tracker) {
    // ON DEMANDE, PUIS ON LANCE. Et l'on ne se rappelle PAS doJet : les réglages
    // seraient toujours armés, les questions se reposeraient, et la boîte se
    // rouvrirait sans fin. Le reste du jet vit donc dans lance().
    demandeJet(label, carac, comp, spe, lance);
    return;

    function lance(carac, comp, modif) {
      var expr = jetExpr(jetBonus(carac, comp, spe), caracLim(carac), modif);
      if (envoyer(cmdJetExpr(label, expr, tracker))) return;
      // Hors Roll20, ou sous une extension antérieure au canal brut : la fiche
      // lance elle-même et applique le plafond, en le DISANT — un résultat rogné
      // sans explication passerait pour une faute de calcul.
      // LE MÊME DÉ QUE DANS ROLL20, et ses seuils. Le tirage local jetait un d100
      // écrit en dur : une fiche réglée sur un autre dé donnait ici un résultat
      // qui ne pouvait pas arriver là-bas.
      var d = parseDice(deNu(deTest())) || { n: 1, faces: 100, plus: 0 };
      var de = d.plus, i;
      for (i = 0; i < d.n; i++) de += 1 + Math.floor(Math.random() * d.faces);
      var bonus = jetBonus(carac, comp, spe), lim = caracLim(carac);
      var brut = de + bonus, total = Math.min(brut, lim) + (modif || 0);
      var det = "dé " + de + (bonus ? " " + (bonus >= 0 ? "+ " : "− ") + Math.abs(bonus) : "");
      if (Math.min(brut, lim) < brut) det += " = " + brut + ", plafonné à " + lim;
      if (modif) det += " · modificateur " + sign(modif);
      // le critique se lit sur LE DÉ, jamais sur le total : c'est le dé qui est
      // critique, et le plafond n'y change rien
      var seuils = seuilsCrit(deTest());
      if (seuils.reussite !== null && de >= seuils.reussite) det += " · réussite critique";
      else if (seuils.echec !== null && de <= seuils.echec) det += " · échec critique";
      flash(label + " : " + total + " (" + det + ")");
    }
  }

  // LE JET BRUT : dégâts d'une arme, protection d'une armure. Ni MOD, ni
  // plafond, ni requête — c'est un dé, et rien d'autre.
  function doRoll(label, value, die) {
    die = die || DE_DEFAUT;
    if (envoyer(cmdJet(label, value, die))) return;
    if (typeof window !== "undefined" && typeof window.__miaRoll === "function") {
      window.__miaRoll(die, value, label);
      return;
    }
    var d = parseDice(die);
    // Hors Roll20 la fiche lance le dé elle-même : elle sait faire « NdM ±k »,
    // pas résoudre une macro Roll20 (@{…}, ?{…}), qui n'a de sens que là-bas.
    if (!d) {
      flash(/[@?]\{/.test(String(die))
        ? "« " + die + " » est une macro Roll20 : elle ne se lance que dans Roll20."
        : "Dé illisible : « " + die + " » (attendu : NdM, ex. 1d100).");
      return;
    }
    var dice = [];
    for (var i = 0; i < d.n; i++) dice.push(1 + Math.floor(Math.random() * d.faces));
    var sum = dice.reduce(function (a, b) { return a + b; }, 0) + d.plus;
    var total = sum + value;
    var det = "dé " + dice.join(" + ") + (value ? " " + (value >= 0 ? "+ " : "− ") + Math.abs(value) : "");
    flash(label + " : " + total + " (" + det + ")");
  }

  // ---------- envoi d'un élément au tchat ----------
  // Dans Roll20, l'élément part au TCHAT en carte (mia-roll20-boot.js pose __miaSay) ;
  // sur le site, il s'affiche en toast. fields : [[libellé, valeur], …],
  // les valeurs vides sont ignorées.
  // Une étiquette VIDE ("") est volontaire : la carte Roll20 rend alors
  // « {{=texte}} », une ligne pleine largeur sans colonne de libellé. Réservée
  // aux TEXTES LONGS, dont le libellé n'apprend rien que le titre ne dise déjà ;
  // les champs courts et tabulaires (poids, dégâts, quantité…) gardent le leur.
  // Une seule étiquette vide par carte : le template les indexe par clé.
  function sayChat(title, fields) {
    var clean = (fields || []).filter(function (f) { return f && String(f[1] || "").trim(); });
    if (envoyer(cmdCarte(title, clean))) return;
    // extension antérieure au canal brut : carte publique
    if (typeof window !== "undefined" && typeof window.__miaSay === "function") {
      window.__miaSay(title, clean);
      return;
    }
    flash(title + (clean.length
      ? " — " + clean.map(function (f) { return f[0] ? f[0] + " : " + f[1] : f[1]; }).join(" · ")
      : ""));
  }
  function chatBtn(getTitle, getFields) {
    return miniBtn("Chat", "Envoyer dans le tchat Roll20", function () {
      sayChat(getTitle(), getFields());
    });
  }
