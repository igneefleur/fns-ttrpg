  // ---------- jets ----------
  // Les dés se jettent dans Roll20 : mia-roll20-boot.js (amorce Roll20 servie
  // par le site) pose window.__miaRoll et le jet part au TCHAT. Sur le site
  // (pas de Roll20), un clic lance quand même le dé et montre le résultat dans
  // un toast discret — aucun panneau de jets.
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
  // Le réglage « Au choix » de la barre d'envoi : Roll20 demande AVANT de
  // lancer quelle caractéristique porte le jet, la sienne proposée en premier.
  //
  // La requête ne porte pas un nombre mais L'EXPRESSION ENTIÈRE, parce que
  // changer de caractéristique change à la fois le MOD et la LIMITE. Deux
  // requêtes séparées poseraient deux questions au joueur, qui pourrait
  // répondre deux choses différentes et obtenir un jet incohérent.
  // Le modificateur d'envoi est emporté DANS chaque option, échappé avec le
  // reste : la requête intérieure ne se pose qu'une fois, son texte étant le
  // même partout, et le bonus reste sous la limite quelle que soit la
  // caractéristique choisie.
  function caracQuery(propre, comp, spe, avecInput) {
    var ordre = [propre].concat(champs().filter(function (c) { return c !== propre; }));
    var opts = ordre.map(function (c) {
      return c + "," + echapQuery(jetExpr(jetBonus(c, comp, spe), caracLim(c), avecInput));
    });
    return "?{Caractéristique|" + opts.join("|") + "}";
  }

  // LE JET DE TEST : caractéristique, compétence ou spécialité. C'est le seul
  // chemin par lequel un jet plafonné part au tchat.
  function doJet(label, carac, comp, spe, tracker) {
    var avecInput = envInput();
    var expr = envCaracChoix()
      ? caracQuery(carac, comp, spe, avecInput)
      : jetExpr(jetBonus(carac, comp, spe), caracLim(carac), avecInput);
    if (envoyer(cmdJetExpr(label, expr, tracker))) return;
    // Hors Roll20, ou sous une extension antérieure au canal brut : la fiche
    // lance elle-même et applique le plafond, en le DISANT — un résultat rogné
    // sans explication passerait pour une faute de calcul.
    var de = 1 + Math.floor(Math.random() * 100);
    var bonus = jetBonus(carac, comp, spe), lim = caracLim(carac);
    var brut = de + bonus, total = Math.min(brut, lim);
    var det = "dé " + de + (bonus ? " " + (bonus >= 0 ? "+ " : "− ") + Math.abs(bonus) : "");
    if (total < brut) det += " = " + brut + ", plafonné à " + lim;
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
