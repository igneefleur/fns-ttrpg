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

  // ÉCHAPPER UNE EXPRESSION POUR L'INTÉRIEUR D'UNE REQUÊTE ROLL20. Une requête
  // ?{…} se découpe sur « | » et sur la PREMIÈRE virgule de chaque option : une
  // expression de jet, qui porte {…,…}, la casserait donc en deux. Roll20 rend
  // les entités HTML à leur caractère après avoir résolu la requête, ce qui est
  // le seul moyen de faire voyager une accolade ou une virgule là-dedans.
  function echapQuery(expr) {
    return String(expr)
      .replace(/\{/g, "&#123;").replace(/\}/g, "&#125;")
      .replace(/,/g, "&#44;").replace(/\|/g, "&#124;");
  }
  // Les réglages « Au choix » de la barre d'envoi : Roll20 demande AVANT de
  // lancer ce qui porte le jet — la caractéristique, la compétence, ou les deux
  // — celle de la ligne proposée en premier.
  //
  // LA REQUÊTE NE PORTE PAS UN NOMBRE MAIS L'EXPRESSION ENTIÈRE, parce que
  // changer de caractéristique change à la fois le MOD et la LIMITE, et que
  // changer de compétence change le total — donc aussi ce que la règle de
  // l'écart en retire. Rien de tout cela ne s'additionne terme à terme.
  //
  // DEUX QUESTIONS QUAND LES DEUX SONT AU CHOIX, ET QUAND ROLL20 LE PERMET.
  // La macro sait recomposer le jet à partir de deux réponses indépendantes
  // dès lors qu'on lui écrit la forme décomposée (voir jetPieces,
  // 100-calculs-jets.js) : tout ce qui dépend de la caractéristique y est
  // CONTIGU, et la compétence n'insère plus qu'un nombre, à un seul endroit.
  // La réponse de la caractéristique porte le début de l'expression, accolades
  // comprises et échappées ; la compétence donne son nombre ; la fermeture est
  // écrite en clair — deux « } » que rien ne colle l'un à l'autre, ce qui
  // compte parce qu'un « }} » fermerait le champ du gabarit.
  //
  // MAIS ROLL20 REFUSE UN GROUPE DANS UN GROUPE, et c'est mesuré dans une vraie
  // partie, pas déduit : « /r {0d0+250,1d100+{0d0+200,150+100}kl1}kl1 » répond
  // « Cannot mix sum and M rolls in a roll group ». Un groupe comme TERME d'une
  // somme est refusé de même. Or c'est exactement ce que demande la règle de
  // l'écart : un premier « plus bas des deux » pour ramener le total, un second
  // pour le plafond du jet.
  //
  // (Les deux autres voies ont été éprouvées et sont mortes aussi : une requête
  // DANS une requête, écrite en entités, n'est pas relue par Roll20 — elle rend
  // « There was an error with your formula ». Et rien ne permet de faire
  // apparaître le même dé à deux endroits d'un groupe.)
  //
  // Reste ce qui EST possible, et qui couvre le cas où la règle ne mord pas :
  // si AUCUNE compétence offerte ne peut déclencher le rabattage — parce que le
  // total le plus fort reste sous le plafond de l'écart —, alors il n'y a plus
  // qu'un seul « plus bas des deux » à écrire, et les deux questions tiennent.
  // Sinon on énumère les couples : c'est long, mais c'est juste, et c'est la
  // seule forme que le moteur de dés accepte.
  //
  // La requête ne porte que le GROUPE PLAFONNÉ, sans le modificateur d'envoi :
  // celui-ci s'ajoutant après le plafond, il se pose une seule fois, dehors,
  // quel que soit le couple choisi.
  //
  // LE CHOIX DE COMPÉTENCE NE VAUT QUE POUR UNE SPÉCIALITÉ. Sur un jet de
  // compétence, la compétence EST le jet : en choisir une autre reviendrait à
  // lancer l'autre, ce qui se fait en cliquant sur sa ligne.
  function choixQuery(carac, comp, spe) {
    var surCarac = envCaracChoix();
    var surComp = envCompChoix() && !!spe;
    var cs = surCarac
      ? [carac].concat(champs().filter(function (c) { return c !== carac; }))
      : [carac];
    var ks;
    if (!surComp) ks = [comp];
    else {
      // « — » est la réponse « aucune compétence », et elle est légitime : une
      // spécialité peut ne relever d'aucune, et on peut vouloir la lancer sans.
      var propre = comp || "";
      ks = [propre].concat(champsComp().filter(function (k) { return k !== propre; }));
      if (propre !== "") ks.push("");
    }
    // LES DEUX : deux requêtes, et la forme décomposée.
    //
    // ELLE NE VAUT QUE SI PERSONNE N'A DÉTOURNÉ LE TOTAL. Un mod qui filtre
    // « speTotal » ou « jetBonus » peut rendre n'importe quoi de n'importe
    // quoi : la décomposition ne le prédirait pas. Dans ce cas seulement, on
    // retombe sur l'énumération des couples, qui appelle jetBonus pour chacun
    // et reste donc exacte quoi qu'un mod fasse.
    // AUCUN RABATTAGE POSSIBLE ? Alors deux questions suffisent. On le vérifie
    // sur le PIRE cas : la compétence la plus fournie de la liste, contre le
    // plafond de chaque caractéristique offerte. Il suffit d'un couple qui
    // mordrait pour que la forme courte cesse d'être exacte.
    var kMax = 0;
    ks.forEach(function (k) { if (k) { kMax = Math.max(kMax, compPts(k)); } });
    var sansRabat = surCarac && surComp && !aFiltre("speTotal") && !aFiltre("jetBonus") &&
      cs.every(function (c) {
        var q = jetPieces(spe, c, comp);
        return q.A + kMax <= q.H;
      });
    if (sansRabat) {
      var qCar = cs.map(function (c) {
        var q = jetPieces(spe, c, comp);
        // { 0d0+LIM , dé ±(P+D) + A+   ← la compétence ajoute son nombre ici
        // « +0 » est du bruit dans une macro qu'on relit parfois à la main
        var pd = q.P + q.D;
        var tete = "{0d0+" + q.L + "," + deTest() + (pd ? sign(pd) : "") +
                   "+" + q.A + "+";
        return c + "," + echapQuery(tete);
      });
      var qCmp = ks.map(function (k) {
        return (k || "—") + "," + (k ? compPts(k) : 0);
      });
      return "?{Caractéristique|" + qCar.join("|") + "}" +
             "?{Compétence|" + qCmp.join("|") + "}" + "}kl1";
    }
    var opts = [];
    cs.forEach(function (c) {
      ks.forEach(function (k) {
        // le libellé dit ce qu'on choisit : le couple quand les deux sont
        // offerts, sans quoi soixante-douze lignes portent le même mot
        var nom = surCarac && surComp ? c + "·" + (k || "—")
                : (surCarac ? c : (k || "—"));
        opts.push(nom + "," + echapQuery(jetExpr(jetBonus(c, k, spe), caracLim(c), false)));
      });
    });
    return "?{" + (surCarac && surComp ? "Caractéristique et compétence"
                 : (surCarac ? "Caractéristique" : "Compétence")) + "|" +
           opts.join("|") + "}";
  }

  // LE JET DE TEST : caractéristique, compétence ou spécialité. C'est le seul
  // chemin par lequel un jet plafonné part au tchat.
  function doJet(label, carac, comp, spe, tracker) {
    var demande = envCaracChoix() || (envCompChoix() && !!spe);
    var expr = demande
      ? choixQuery(carac, comp, spe) + (envInput() ? ENV_QUERY : "")
      : jetExpr(jetBonus(carac, comp, spe), caracLim(carac), envInput());
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
    var brut = de + bonus, total = Math.min(brut, lim);
    var det = "dé " + de + (bonus ? " " + (bonus >= 0 ? "+ " : "− ") + Math.abs(bonus) : "");
    if (total < brut) det += " = " + brut + ", plafonné à " + lim;
    // le critique se lit sur LE DÉ, jamais sur le total : c'est le dé qui est
    // critique, et le plafond n'y change rien
    var seuils = seuilsCrit(deTest());
    if (seuils.reussite !== null && de >= seuils.reussite) det += " · réussite critique";
    else if (seuils.echec !== null && de <= seuils.echec) det += " · échec critique";
    flash(label + " : " + total + " (" + det + ")");
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
