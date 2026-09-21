  // ---------- jets ----------
  // Trois voies, dans cet ordre : le canal brut (la commande composée ici), le
  // repli historique __owdRoll (l'extension recompose alors elle-même : jet
  // public, sans modificateur), et hors Roll20 le tirage local.
  function parseDice(expr) {
    var m = /^(\d{1,2})d(\d{1,4})([+-]\d{1,4})?$/i.exec(String(expr || "").replace(/\s/g, ""));
    if (!m) return null;
    return { n: clamp(+m[1], 1, 20), faces: clamp(+m[2], 2, 1000), plus: +(m[3] || 0) };
  }
  // isCheck : vrai EXACTEMENT pour les jets qui acceptent un modificateur au
  // lancer — compétence, attaque, parade, technique. Aucun autre filtre à
  // écrire. Les DÉGÂTS n'en sont pas : ils ne se lancent pas du tout.
  function doRoll(label, value, die, isCheck, desMax, tracker) {
    die = die || state.de || DE_DEFAUT;
    if (envoyer(cmdJet(label, value, die, isCheck && envInput(), desMax, tracker))) return;
    if (typeof window !== "undefined" && typeof window.__owdRoll === "function") {
      window.__owdRoll(die, value, label);
      return;
    }
    var d = parseDice(die);
    // Hors Roll20 la fiche lance le dé elle-même : elle sait faire « NdM ±k »,
    // pas résoudre une macro Roll20, qui n'a de sens que là-bas.
    if (!d) {
      flash(/[@?]\{/.test(String(die))
        ? "« " + die + " » est une macro Roll20 : elle ne se lance que dans Roll20."
        : "Dé illisible : « " + die + " » (attendu : NdM, ex. " + deDe(2) + ").");
      return;
    }
    var dice = [];
    for (var i = 0; i < d.n; i++) dice.push(1 + Math.floor(Math.random() * d.faces));
    var somme = dice.reduce(function (a, b) { return a + b; }, 0) + d.plus;
    var total = somme + value;
    flash(label + " : " + total + " (dé " + dice.join(" + ") +
          (value ? " " + (value >= 0 ? "+ " : "− ") + Math.abs(value) : "") + ")");
  }

  // ---------- envoi d'un élément au tchat ----------
  // fields : [[libellé, valeur], …], les valeurs vides sont ignorées.
  // Une étiquette VIDE ("") est volontaire : la carte Roll20 rend alors
  // « {{=texte}} », une ligne pleine largeur sans colonne de libellé, réservée
  // aux TEXTES LONGS (description d'une technique, d'un objet). UNE SEULE par
  // carte : le gabarit les indexe par clé.
  function sayChat(title, fields) {
    var clean = (fields || []).filter(function (f) { return f && String(f[1] == null ? "" : f[1]).trim(); });
    if (envoyer(cmdCarte(title, clean))) return;
    if (typeof window !== "undefined" && typeof window.__owdSay === "function") {
      window.__owdSay(title, clean);
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

