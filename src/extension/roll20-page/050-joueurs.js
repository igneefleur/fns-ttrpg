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



  // Présence et mode Consultation/Édition partagés par tous les cadres d'un
  // personnage. Chaque joueur conserve SON mode, partagé entre ses fenêtres.
  // Le champ vit dans jjk_presence, séparément de jjk_state : une préférence
  // d'interface ne doit jamais modifier les règles ou les données du perso.
  // Format repris d'Outward : une entrée par vue, avec séquence et horodatage.
  var presenceLocal = {}, presenceKnown = {};

  function presenceAcces(ch) {
    if (!ch) return false;
    var d = droits(ch), ids = d.controlledby.split(",").map(function (v) { return v.trim(); });
    return d.gm || ids.indexOf("all") >= 0 || (!!d.moi && ids.indexOf(d.moi) >= 0);
  }

  function presenceMerge(a, b, now) {
    var out = {};
    [a, b].forEach(function (map) {
      Object.keys(map || {}).forEach(function (key) {
        if (["__proto__", "prototype", "constructor"].indexOf(key) >= 0) return;
        var r = map[key];
        if (!r || typeof r.player !== "string" || !r.player ||
            !Number.isSafeInteger(r.seq) || !Number.isFinite(r.at) ||
            now - r.at >= 60000 || r.at - now > 60000) return;
        var row = Object.assign({}, r);
        row.mode = row.mode === "edition" ? "edition" : "consultation";
        row.modeAt = Number.isFinite(Number(row.modeAt)) ? Number(row.modeAt) : 0;
        row.modeBy = String(row.modeBy || "");
        var old = out[key];
        if (!old || row.seq > old.seq || row.seq === old.seq && row.at > old.at) out[key] = row;
      });
    });
    return out;
  }

  function presenceData(attrs) {
    var raw = attrs && attrs[PREFIX + "presence"], data = null;
    try { data = raw && raw.current ? JSON.parse(raw.current) : null; } catch (e) {}
    if (!data || (data.format !== 1 && data.v !== 1) || !data.views || typeof data.views !== "object") return {};
    var views = {};
    Object.keys(data.views).forEach(function (key) {
      var row = data.views[key];
      if (!row || typeof row !== "object") return;
      var copy = Object.assign({}, row);
      // Les anciennes entrées (v:1) n'avaient ni séquence ni choix par vue.
      // Une séquence zéro les laisse migrer sans rivaliser avec une écriture neuve.
      if (data.v === 1 && !Number.isSafeInteger(copy.seq)) copy.seq = 0;
      // Migration transparente du mode global : on l'attribue au
      // joueur qui l'avait choisi, sans l'imposer aux autres joueurs.
      if (data.v === 1 && data.modeBy && copy.player === String(data.modeBy) && !copy.modeAt) {
        copy.mode = data.mode === "edition" ? "edition" : "consultation";
        copy.modeAt = Number(data.modeAt) || 0;
        copy.modeBy = "legacy:" + String(data.modeBy);
      }
      views[key] = copy;
    });
    return views;
  }

  function presenceChoice(rows, player) {
    var best = null;
    (rows || []).forEach(function (row) {
      if (!row || row.player !== player || row.left) return;
      var candidate = {
        mode: row.mode === "edition" ? "edition" : "consultation",
        modeAt: Number(row.modeAt) || 0,
        modeBy: String(row.modeBy || "")
      };
      if (!best || candidate.modeAt > best.modeAt ||
          candidate.modeAt === best.modeAt && candidate.modeBy > best.modeBy) best = candidate;
    });
    return best;
  }

  function presenceRead(id, attrs) {
    var now = Date.now();
    var known = presenceMerge(presenceKnown[id], presenceData(attrs || readAll(id)), now);
    known = presenceMerge(known, presenceLocal[id], now);
    presenceKnown[id] = known;
    var rows = Object.keys(known).map(function (key) { return known[key]; })
      .filter(function (row) { return !row.left && now - row.at < 30000; });
    return rows.map(function (row) {
      return Object.assign({}, row, presenceChoice(rows, row.player) || {
        mode: "consultation", modeAt: 0, modeBy: ""
      });
    });
  }

  function presenceModeState(rows, player) {
    return presenceChoice(rows, player) || { mode: "consultation", modeAt: 0, modeBy: "" };
  }

  function presenceDiffusion(charId, attrs) {
    var rows = presenceRead(charId, attrs || readAll(charId));
    var player = "", playerName = "Joueur";
    try {
      player = String((window.currentPlayer && window.currentPlayer.id) || "");
      playerName = String((window.currentPlayer && (window.currentPlayer.displayname || window.currentPlayer.name)) || playerName);
    } catch (e) {}
    var state = presenceModeState(rows, player);
    var views = {};
    rows.forEach(function (row) { views[row.view || row.player] = row; });
    var payload = {
      ns: "jjk", type: "presence-state", charId: charId,
      presence: rows, modeState: state, player: player ? { id: player, name: playerName } : null,
      // Compatibilité de lecture avec les anciennes fiches encore ouvertes.
      mode: state.mode, modeAt: state.modeAt, modeBy: state.modeBy,
      modeName: "", views: views
    };
    for (var i = srcFrames.length - 1; i >= 0; i--) {
      if (srcIds[i] !== charId) continue;
      try { srcFrames[i].postMessage(payload, "*"); } catch (e) {}
    }
  }

  function presencePublie(ch) {
    if (!ch) return;
    var attrs = readAll(ch.id);
    presenceRead(ch.id, attrs);
    var current = { format: 1, views: presenceKnown[ch.id] || {} };
    var json = JSON.stringify(current);
    if (!attrs[PREFIX + "presence"] || attrs[PREFIX + "presence"].current !== json) {
      var update = {}; update[PREFIX + "presence"] = { current: json, max: "" };
      enqueue(ch.id, update);
    }
  }

  function presenceTraite(ev, msg) {
    var id = String(msg.charId || "");
    var view = String(msg.viewId || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
    if (!id || !view) return;
    var ch = getChar(id);
    if (!presenceAcces(ch)) return;
    var player = "", name = "Joueur";
    try {
      player = String((window.currentPlayer && window.currentPlayer.id) || "");
      name = String((window.currentPlayer && (window.currentPlayer.displayname || window.currentPlayer.name)) || "Joueur");
    } catch (e) {}
    if (!player) return;

    var attrs = readAll(id), rows = presenceRead(id, attrs), map = presenceLocal[id] || (presenceLocal[id] = {});
    var previous = map[view] || (presenceKnown[id] || {})[view];
    var seq = (previous ? previous.seq : 0) + 1;
    var choice = presenceChoice(rows, player);
    var now = Date.now();
    if (msg.action === "mode" || !choice) {
      var askedAt = Number(msg.requestedAt) || 0;
      choice = {
        mode: msg.action === "mode" && msg.mode === "edition" ? "edition" : "consultation",
        modeAt: Math.max(now, askedAt, choice ? choice.modeAt + 1 : 0),
        modeBy: view + ":" + seq
      };
    }
    map[view] = Object.assign({
      player: player, name: name, view: view, at: now, seq: seq,
      left: msg.action === "leave"
    }, choice);
    presenceKnown[id] = presenceMerge(presenceKnown[id], map, now);
    presencePublie(ch);
    presenceDiffusion(id, readAll(id));
  }
