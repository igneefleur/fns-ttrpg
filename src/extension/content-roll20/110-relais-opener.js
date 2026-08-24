  // Fenêtre popout : pas de tchat ici. Le jet repart à la fenêtre qui a ouvert le
  // popout (l'éditeur, même origine) où ce même content script le rejouera.
  // On poste une COPIE (jamais muter ev.data, potentiellement Xray-wrappé) avec
  // relayed:true (un seul rebond, jamais de boucle) et une origine CIBLÉE : si
  // l'utilisateur a fait naviguer la fenêtre principale ailleurs, rien ne part.
  function relayToOpener(d) {
    if (d.relayed) return;
    try {
      var o = window.opener;
      if (!o || o.closed) return;
      o.postMessage({ ns: "mia", type: d.type, charId: d.charId, die: d.die, value: d.value,
                      label: d.label, title: d.title, fields: d.fields, raw: d.raw, relayed: true },
                    "https://app.roll20.net");
    } catch (e) {}
  }

