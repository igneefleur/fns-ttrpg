// Glossaire au survol. Affiche la carte d'un terme (glossaire général, liens .gloss-link)
// ou d'une valeur de tableau (.gloss-source td) quand on la survole. Les cartes vivent,
// masquées, dans .gloss-defs (.gloss-card[data-key]).
//
// Délégation d'événement sur <body> : un seul écouteur, robuste au contenu injecté après
// coup par continuous.js (lecture continue) et à navigation.instant. La carte est cherchée
// en direct dans le DOM à chaque survol, donc toujours à jour. Le clic d'un lien navigue.
(function () {
  function tipEl() {
    let tip = document.getElementById("gloss-tip");
    if (!tip) {
      tip = document.createElement("div");
      tip.id = "gloss-tip";
      tip.className = "gloss-tip md-typeset";
      document.body.appendChild(tip);
    }
    return tip;
  }

  function cardFor(key) {
    // clés possibles : « terme:slug » (liens), « domaine:valeur » ou « valeur » (tableaux)
    return document.querySelector('.gloss-defs .gloss-card[data-key="' + key + '"]');
  }

  function hide() {
    const t = document.getElementById("gloss-tip");
    if (t) t.style.display = "none";
  }

  function show(anchor, key) {
    const card = cardFor(key);
    if (!card) return;
    const tip = tipEl();
    tip.innerHTML = card.outerHTML;
    tip.style.display = "block";
    const r = anchor.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let top = window.scrollY + r.top - h - 8;                    // au-dessus
    if (r.top - h - 8 < 0) top = window.scrollY + r.bottom + 8;  // sinon en dessous
    let left = window.scrollX + r.left + r.width / 2 - w / 2;
    const min = window.scrollX + 6;
    const max = window.scrollX + document.documentElement.clientWidth - w - 6;
    left = Math.max(min, Math.min(left, max));
    tip.style.top = top + "px";
    tip.style.left = left + "px";
  }

  function trigger(el) {
    if (!el || !el.closest) return null;
    const a = el.closest("a.gloss-link[data-key]");
    if (a) return { el: a, key: a.dataset.key };
    const td = el.closest(".gloss-source td");
    if (td) {
      const domain = (td.closest(".gloss-source").dataset.gloss || "");
      const text = td.textContent.trim();
      const key = cardFor(domain + ":" + text) ? domain + ":" + text : text;
      if (cardFor(key)) {
        td.classList.add("gloss-trigger");
        return { el: td, key: key };
      }
    }
    return null;
  }

  function bindOnce() {
    if (document.body.dataset.glossBound) return;
    document.body.dataset.glossBound = "1";
    document.body.addEventListener("mouseover", (e) => {
      const t = trigger(e.target);
      if (t) show(t.el, t.key);
    });
    document.body.addEventListener("mouseout", (e) => {
      const el = e.target;
      const host = el.closest && (el.closest("a.gloss-link") || el.closest(".gloss-source td"));
      if (!host) return;
      if (e.relatedTarget && host.contains(e.relatedTarget)) return;  // toujours dedans
      hide();
    });
    window.addEventListener("scroll", hide, { passive: true });
  }

  function init() {
    bindOnce();
    hide();
  }

  if (window.document$) document$.subscribe(init);
  else document.addEventListener("DOMContentLoaded", init);
})();
