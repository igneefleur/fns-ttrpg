  function reply(ev, msg) { msg.ns = "jjk"; try { ev.source.postMessage(msg, "*"); } catch (e) {} }

  // Joueurs de la partie, pour le sélecteur « À un joueur » de la barre d'envoi
  // de la fiche (qui est une iframe d'une autre origine et ne peut pas les lire
  // elle-même). Campaign.players est la collection sœur de Campaign.characters
  // déjà utilisée ici ; chaque modèle porte displayname et online. Rien de tout
  // cela n'est documenté par Roll20 : tout est sondé défensivement, une absence
  // rend une liste vide et la fiche retombe sur sa saisie manuelle.
  // Écartés : les DÉCONNECTÉS (chuchoter à un absent ne sert à rien) et
  // SOI-MÊME (on ne se chuchote pas la macro qu'on vient de lancer).
  function players() {
    var c = window.Campaign || (window.d20 && window.d20.Campaign) || null;
    var col = c && c.players;
    var ms = (col && col.models) || [];
    var moi = "";
    try { moi = window.currentPlayer && window.currentPlayer.id; } catch (e) {}
    var out = [];
    ms.forEach(function (m) {
      try {
        var a = m.attributes || {};
        var nom = (m.get ? m.get("displayname") : a.displayname) || "";
        var en = m.get ? m.get("online") : a.online;
        if (!nom || en === false || m.id === moi) return;
        if (out.indexOf(nom) < 0) out.push(nom);
      } catch (e) {}
    });
    return out;
  }

