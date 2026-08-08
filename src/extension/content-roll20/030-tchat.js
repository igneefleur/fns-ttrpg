  // ---------- jets au tchat Roll20 (frame du haut) ----------
  // Commande de jet : template par défaut + jet en ligne. Négatifs en « - N ».
  //
  // Le canal « roll » compose sa commande ICI : il ne traverse donc PAS la
  // liste blanche du canal brut, qui ne juge que du texte déjà composé. Or
  // n'importe quel code de la page de la fiche (un mod, qui voyage dans le
  // personnage) peut poster ce message. Ses deux champs libres se replient
  // donc ici : un saut de ligne dans « die » ou « label » ferait sortir une
  // SECONDE ligne au tchat, que Roll20 exécuterait comme une commande à part
  // (« !api », « /w gm »…) au nom du joueur.
  // Les accolades de « die » restent, elles : une macro Roll20 (?{Dé|1d100})
  // est un dé légitime sur ce canal, qui sert les extensions antérieures au
  // canal brut.
  function replie(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function rollCommand(die, value, label) {
    die = replie(die) || "1d100";
    var v = value >= 0 ? "+ " + value : "- " + (-value);
    var name = replie(label).replace(/[{}]/g, "") || "Jet";
    return "&{template:default} {{name=" + name + "}} {{Jet=[[" + die + " " + v + "]]}}";
  }
  // Carte d'ÉLÉMENT au tchat (passif, arme, avantage…) : template par défaut,
  // une ligne par champ non vide. Accolades et sauts de ligne neutralisés.
  // Une étiquette VIDE donne « {{=texte}} » : la ligne prend toute la largeur
  // de la carte, sans colonne de libellé — c'est ce que la fiche envoie pour
  // les textes libres (effet d'un passif, description d'un art…), dont le
  // libellé n'apprendrait rien que le titre ne dise déjà.
  function sanitizeField(s) { return String(s == null ? "" : s).replace(/[{}]/g, "").replace(/\s+/g, " ").trim(); }
  function sayCommand(title, fields) {
    var cmd = "&{template:default} {{name=" + sanitizeField(title) + "}}";
    (fields || []).forEach(function (f) {
      if (!f) return;
      var k = sanitizeField(f[0]);
      var v = sanitizeField(f[1]);
      if (v) cmd += " {{" + k + "=" + v + "}}";
    });
    return cmd;
  }
