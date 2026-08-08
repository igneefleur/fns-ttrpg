  // ---------- jets ----------
  // Les dés se jettent dans Roll20 : jjk-roll20-boot.js (amorce Roll20 servie
  // par le site) pose window.__jjkRoll et le
  // jet part au TCHAT. Sur le site (pas de Roll20), un clic lance quand même le
  // dé et montre le résultat dans un toast discret — aucun panneau de jets.
  function parseDice(expr) {
    var m = /^(\d{1,2})d(\d{1,4})([+-]\d{1,4})?$/i.exec(String(expr || "").replace(/\s/g, ""));
    if (!m) return null;   // expression illisible : doRoll prévient au lieu de lancer autre chose
    return { n: clamp(+m[1], 1, 20), faces: clamp(+m[2], 2, 1000), plus: +(m[3] || 0) };
  }
  // isCheck : vrai pour un jet de test (carac/compétence) — seuls ces jets
  // critent (96+/5-). Les jets d'équipement (dégâts, invu) restent des dés bruts.
  // caracDe : caractéristique propre d'un jet de COMPÉTENCE. Avec le réglage
  // « Au choix » de la barre d'envoi, la macro Roll20 demande alors quelle
  // caractéristique porte le jet (la sienne proposée en premier) : le total
  // envoyé se décompose en (carac choisie) + (stade et modificateur).
  function caracQuery(propre) {
    var ordre = [propre].concat(CHAMPS.filter(function (c) { return c !== propre; }));
    return "?{Caractéristique|" + ordre.map(function (c) { return c + "," + caracTotal(c); }).join("|") + "}";
  }
  // tracker : le jet s'inscrit dans le compteur de tours de Roll20 (initiative).
  function doRoll(label, value, die, isCheck, caracDe, tracker) {
    die = die || state.de || DE_DEFAUT;
    // « avec input » ne vaut QUE pour les jets de test : isCheck est vrai
    // exactement aux caractéristiques et aux compétences, faux aux dégâts et
    // à l'invulnérabilité — aucun autre filtre à écrire.
    // Le choix de carac ne vit que sur le canal brut (macro) : les replis
    // (vieille extension, hors Roll20) partent avec la carac automatique.
    var q = (isCheck && caracDe && envCaracChoix()) ? caracQuery(caracDe) : null;
    if (envoyer(cmdJet(label, q ? value - caracTotal(caracDe) : value, die,
                       isCheck && envInput(), q, tracker))) return;
    // extension antérieure au canal brut : jet public, sans modificateur — et
    // sans compteur de tours, ce canal-là n'envoyant pas de commande Roll20
    if (typeof window !== "undefined" && typeof window.__jjkRoll === "function") {
      window.__jjkRoll(die, value, label);
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
    // 96+ au dé : coup critique (le résultat au d100 devient 100) ; 5 ou moins :
    // échec critique (il devient 0). Les modificateurs (d.plus, valeur) restent.
    if (isCheck && d.n === 1 && d.faces === 100) {
      if (dice[0] >= 96) {
        total = 100 + d.plus + value;
        det = "coup critique — le dé devient 100";
      } else if (dice[0] <= 5) {
        total = 0 + d.plus + value;
        det = "échec critique — le dé devient 0";
      }
    }
    flash(label + " : " + total + " (" + det + ")");
  }

  // ---------- envoi d'un élément au tchat ----------
  // Dans Roll20, l'élément part au TCHAT en carte (jjk-roll20-boot.js pose __jjkSay) ;
  // sur le site, il s'affiche en toast. fields : [[libellé, valeur], …],
  // les valeurs vides sont ignorées.
  // Une étiquette VIDE ("") est volontaire : la carte Roll20 rend alors
  // « {{=texte}} », une ligne pleine largeur sans colonne de libellé. Réservée
  // aux TEXTES LONGS (effet d'un passif, description d'un art, avantage…),
  // dont le libellé n'apprend rien que le titre ne dise déjà ; les champs
  // courts et tabulaires (poids, dégâts, quantité…) gardent le leur.
  // Une seule étiquette vide par carte : le template les indexe par clé.
  function sayChat(title, fields) {
    var clean = (fields || []).filter(function (f) { return f && String(f[1] || "").trim(); });
    if (envoyer(cmdCarte(title, clean))) return;
    // extension antérieure au canal brut : carte publique
    if (typeof window !== "undefined" && typeof window.__jjkSay === "function") {
      window.__jjkSay(title, clean);
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

