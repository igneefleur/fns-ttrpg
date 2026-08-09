// Affiche les derniers commits (et fichiers modifiés) sur l'accueil.
// Les données proviennent de changelog.json, généré au build par le hook
// hooks/changelog.py qui lit `git log` localement — aucune API externe.
(function () {
  const STATUS = {
    added:    "créé",
    modified: "modifié",
    removed:  "supprimé",
    renamed:  "renommé",
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function timeAgo(iso) {
    const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    const units = [
      ["an", 31536000], ["mois", 2592000], ["j", 86400],
      ["h", 3600], ["min", 60],
    ];
    for (const [label, secs] of units) {
      const v = Math.floor(s / secs);
      if (v >= 1) return `il y a ${v} ${label}${(v > 1 && label !== "mois") ? "s" : ""}`;
    }
    return "à l'instant";
  }

  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "long", year: "numeric",
    });
  }

  function fileRow(f) {
    const label = STATUS[f.status] || f.status;
    const name = escapeHtml(f.filename);
    const inner = f.url
      ? `<a class="cl-link" href="${escapeHtml(f.url)}">${name}</a>`
      : `<code>${name}</code>`;
    return `<li class="cl-file">
      <span class="cl-status cl-${f.status}">${label}</span>
      ${inner}
    </li>`;
  }

  function commitCard(c) {
    const sha = c.pending
      ? `<span class="cl-sha cl-pending-tag">en cours</span>`
      : c.url
        ? `<a class="cl-sha" href="${c.url}" target="_blank" rel="noopener">${escapeHtml(c.short)}</a>`
        : `<span class="cl-sha">${escapeHtml(c.short)}</span>`;
    const when = c.pending || !c.date
      ? "non committé"
      : `<time title="${fmtDate(c.date)}">${timeAgo(c.date)}</time>`;
    const files = (c.files || []).length
      ? `<ul class="cl-files">${c.files.map(fileRow).join("")}</ul>`
      : "";
    return `<article class="cl-commit${c.pending ? " cl-pending" : ""}">
      <header class="cl-head">
        <span class="cl-msg">${escapeHtml(c.message)}</span>
        ${sha}
      </header>
      <div class="cl-meta">${escapeHtml(c.author)} · ${when}</div>
      ${files}
    </article>`;
  }

  async function render() {
    const el = document.getElementById("changelog");
    if (!el) return;
    el.innerHTML = `<p class="cl-info">Chargement des dernières modifications…</p>`;
    try {
      // Chemin relatif (la page d'accueil est à la racine du site).
      const url = el.dataset.src || "changelog.json";
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const commits = await res.json();
      el.innerHTML = commits.length
        ? commits.map(commitCard).join("")
        : `<p class="cl-info">Aucun commit trouvé.</p>`;
    } catch (e) {
      el.innerHTML =
        `<p class="cl-info cl-error">Impossible de charger le changelog (${escapeHtml(e.message)}).</p>`;
    }
  }

  if (window.document$) {
    document$.subscribe(render);
  } else {
    document.addEventListener("DOMContentLoaded", render);
  }
})();
