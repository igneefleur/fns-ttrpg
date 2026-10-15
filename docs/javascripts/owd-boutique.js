/* Boutique : données produites depuis les fiches du livre par hooks/boutique.py. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var items = [], filtered = [], selected = null, page = 0, size = 24, quantity = 1, drag = null, pending = null;
  var search = $('ob-recherche'), categories = $('ob-categorie'), list = $('ob-items'), details = $('ob-details'), status = $('ob-status');
  var dialog = $('ob-dialog'), chatQuantity = $('ob-quantite-chat');
  function post(d) { d.ns = 'owd'; window.top.postMessage(d, '*'); }
  function theme(on) { document.documentElement.classList.toggle('night', on); }
  theme(!/[#&]n=0(?:&|$)/.test(location.hash));
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.ns !== 'owd') return;
    if (d.type === 'panel-theme' && (e.source === window.parent || e.source === window.top)) theme(!!d.nuit);
    if (e.source !== window.top || d.type !== 'inventory-drop-chat' || !drag || d.token !== drag.token || d.ref !== drag.item.id || d.charId !== 'boutique') return;
    var job = drag; drag = null;
    if (d.action === 'montrer' || d.action === 'donner') ask(job.item, d.action, job.q);
  });
  function node(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function fold(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr'); }
  function num(s) { return Number(String(s || '').replace(',', '.').replace(/\s/g, '')) || 0; }
  function value(it, key) { var f = it.champs.find(function (c) { return c[0] === key; }); return f ? f[1] : ''; }
  function qvalid(v) { var n = Number(v); return Number.isSafeInteger(n) && n > 0 ? n : null; }
  function price(it) { var p = value(it, 'Achat (argent)'); return p ? p + ' argent' : '—'; }
  function picture(it, cls) { var im = node('img', cls); im.src = it.img || ''; im.alt = ''; im.loading = 'lazy'; im.draggable = false; im.onerror = function () { im.hidden = true; }; return im; }
  function select(it) { selected = it; quantity = 1; renderDetails(); Array.from(list.children).forEach(function (n) { n.setAttribute('aria-pressed', String(n.dataset.id === it.id)); }); }
  function renderDetails() {
    details.replaceChildren();
    if (!selected) { details.appendChild(node('p', '', 'Aucun équipement.')); return; }
    var it = selected;
    if (it.img) details.appendChild(picture(it, 'ob-portrait'));
    details.appendChild(node('h2', '', it.nom));
    details.appendChild(node('div', 'ob-categorie', it.categorie + (it.famille ? ' · ' + it.famille : '')));
    if (it.origine) details.appendChild(node('div', 'ob-origine', it.origine));
    var buy = node('div', 'ob-achat'), label = node('label', '', 'Quantité'), input = node('input');
    input.id = 'ob-quantite'; input.type = 'number'; input.min = '1'; input.step = '1'; input.value = String(quantity); input.required = true;
    input.oninput = function () { quantity = qvalid(input.value); }; label.appendChild(input); buy.appendChild(label);
    [['montrer', 'Montrer'], ['donner', 'Donner']].forEach(function (a) { var b = node('button', '', a[1]); b.type = 'button'; b.onclick = function () { if (!input.reportValidity() || !quantity) return; ask(it, a[0], quantity); }; buy.appendChild(b); });
    details.appendChild(buy);
    if (it.desc) details.appendChild(node('div', 'ob-description', it.desc));
    var table = node('table', 'ob-facts'), body = node('tbody');
    it.champs.forEach(function (f) { var row = node('tr'), th = node('th', '', f[0]); th.scope = 'row'; row.append(th, node('td', '', f[1])); body.appendChild(row); });
    table.appendChild(body); details.appendChild(table); details.scrollTop = 0;
  }
  function render() {
    var pages = Math.max(1, Math.ceil(filtered.length / size)); page = Math.max(0, Math.min(page, pages - 1));
    var visible = filtered.slice(page * size, (page + 1) * size);
    list.replaceChildren();
    visible.forEach(function (it) {
      var b = node('button', 'ob-item'); b.type = 'button'; b.draggable = true; b.dataset.id = it.id; b.title = it.nom; b.setAttribute('aria-pressed', String(!!selected && selected.id === it.id));
      if (it.img) b.appendChild(picture(it));
      b.append(node('span', 'ob-item-name', it.nom), node('span', 'ob-item-price', price(it)));
      b.onclick = function () { select(it); };
      b.ondragstart = function (e) {
        if (!selected || selected.id !== it.id) select(it);
        if (!quantity || !$('ob-quantite').reportValidity()) { e.preventDefault(); return; }
        var token = 'shop-' + Date.now() + '-' + Math.random().toString(36).slice(2);
        drag = {token: token, item: it, q: quantity};
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/x-owd-item', JSON.stringify({token: token, ref: it.id, charId: 'boutique'}));
        e.dataTransfer.setData('text/plain', it.nom);
        post({type: 'inventory-drag-start', token: token, ref: it.id, charId: 'boutique', boutique: true});
      };
      b.ondragend = function () { var old = drag; post({type: 'inventory-drag-end', token: old && old.token}); setTimeout(function () { if (drag === old) drag = null; }, 1500); };
      list.appendChild(b);
    });
    if (!selected || !visible.some(function (it) { return it.id === selected.id; })) { selected = visible[0] || null; quantity = 1; renderDetails(); }
    // The selected card must match the details, including after a page change.
    Array.from(list.children).forEach(function (b) { b.setAttribute('aria-pressed', String(!!selected && b.dataset.id === selected.id)); });
    status.textContent = filtered.length.toLocaleString('fr') + ' équipement' + (filtered.length === 1 ? '' : 's');
    $('ob-page').textContent = (page + 1) + ' / ' + pages;
    $('ob-precedent').disabled = page === 0; $('ob-suivant').disabled = page >= pages - 1;
    if (!visible.length) list.appendChild(node('p', '', 'Aucun résultat.'));
  }
  function filter() {
    var words = fold(search.value).trim().split(/\s+/).filter(Boolean);
    filtered = items.filter(function (it) { return (!categories.value || it.categorie === categories.value) && words.every(function (w) { return it.search.indexOf(w) >= 0; }); });
    page = 0; render();
  }
  search.oninput = filter; categories.onchange = filter;
  $('ob-precedent').onclick = function () { page--; render(); list.scrollTop = 0; };
  $('ob-suivant').onclick = function () { page++; render(); list.scrollTop = 0; };
  function safe(s) { return String(s == null ? '' : s).replace(/[{}]/g, '').replace(/\s+/g, ' ').trim(); }
  function encode(o) { var bytes = new TextEncoder().encode(JSON.stringify(o)), s = ''; bytes.forEach(function (x) { s += String.fromCharCode(x); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function command(it, action, q) {
    var fields = [['Quantité', q], ['Poids', value(it, 'Poids (kg)') + ' kg'], ['Volume', value(it, 'Volume (L)') + ' L'], ['Achat', price(it)], ['Vente', value(it, 'Vente (argent)') + ' argent'], ['Type', it.categorie]];
    it.champs.forEach(function (f) { if (!/^(Poids|Volume|Achat|Vente)\b/.test(f[0])) fields.push(f); });
    if (it.desc) fields.push(['Description', it.desc]);
    var description = [it.desc, it.champs.map(function (f) { return f[0] + ' : ' + f[1]; }).join('\n')].filter(Boolean).join('\n\n');
    var payload = encode({version: 1, n: it.nom, q: q, k: 'boutique:' + it.id, p: num(value(it, 'Poids (kg)')), l: num(value(it, 'Volume (L)')), a: num(value(it, 'Achat (argent)')), v: num(value(it, 'Vente (argent)')), d: description, i: it.img ? new URL(it.img, location.href).href : '', s: fields});
    var raw = '&{template:default} {{name=OWD Item ' + (action === 'donner' ? 'Give' : 'Show') + '}} {{Objet=' + safe(it.nom) + '}}';
    fields.forEach(function (f) { raw += ' {{' + safe(f[0]) + '=' + safe(f[1]) + '}}'; });
    raw += action === 'donner' ? ' {{Prendre=[Prendre](/owd_take ' + payload + ')}}' : ' {{Montrer=[Montrer](/owd_item_show ' + payload + ')}}';
    return raw;
  }
  function ask(it, action, q) {
    if (window.top === window) { status.textContent = 'Ouvrez Boutique depuis la barre d’outils Roll20 pour envoyer un objet dans le chat.'; return; }
    if (dialog.open) return;
    pending = {item: it, action: action}; chatQuantity.value = String(q || 1);
    $('ob-dialog-title').textContent = (action === 'donner' ? 'Donner' : 'Montrer') + ' « ' + it.nom + ' »';
    dialog.showModal(); chatQuantity.focus(); chatQuantity.select();
  }
  $('ob-annuler').onclick = function () { pending = null; dialog.close(); };
  dialog.addEventListener('cancel', function () { pending = null; });
  dialog.querySelector('form').onsubmit = function (e) {
    e.preventDefault(); var q = qvalid(chatQuantity.value);
    if (!pending || !q || !chatQuantity.reportValidity()) return;
    var job = pending; pending = null; dialog.close(); post({type: 'chat', raw: command(job.item, job.action, q)});
  };
  async function load() {
    search.disabled = categories.disabled = true;
    try {
      var response = await fetch('owd-boutique.json', {cache: 'no-store'});
      if (!response.ok) throw Error('HTTP ' + response.status);
      var data = await response.json();
      if (!data || !Array.isArray(data.objets) || !data.objets.length) throw Error('Catalogue vide');
      items = data.objets.sort(function (a, b) { return a.categorie.localeCompare(b.categorie, 'fr') || a.nom.localeCompare(b.nom, 'fr'); });
      var counts = Object.create(null);
      items.forEach(function (it) { it.search = fold([it.nom, it.categorie, it.famille, it.origine].join(' ')); counts[it.categorie] = (counts[it.categorie] || 0) + 1; });
      categories.replaceChildren(new Option('Toutes les catégories', ''));
      Object.keys(counts).sort(function (a, b) { return a.localeCompare(b, 'fr'); }).forEach(function (c) { categories.add(new Option(c + ' (' + counts[c] + ')', c)); });
      search.disabled = categories.disabled = false; filter();
    } catch (e) {
      status.textContent = 'Impossible de charger les équipements. ';
      var retry = node('button', '', 'Réessayer'); retry.onclick = load; status.appendChild(retry);
      $('ob-precedent').disabled = $('ob-suivant').disabled = true;
    }
  }
  load();
})();
