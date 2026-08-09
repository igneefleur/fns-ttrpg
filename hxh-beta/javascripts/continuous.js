// Lecture continue du livre (chargement PARESSEUX bidirectionnel) + arbre custom.
//
// Cœur du chargement : ensureBuffer(). Elle maintient un tampon de pages
// chargées autour de la zone visible — charge la suivante tant que le bas est
// proche, la précédente tant que le haut est proche — en cascade, dans les deux
// sens. Appelée au scroll, au clic, et à l'arrivée. Une seule logique, robuste.
//
// Insertion vers le haut : compensation de scroll MANUELLE (fiable à toute
// position, y compris scrollTop 0). Tous les défilements sont INSTANTANÉS, donc
// aucune animation ne peut être annulée par une compensation.
//
// On ne touche à l'URL/historique qu'au CLIC (pas au scroll) → compatible
// navigation.instant. Les liens de nav sont figés en absolu pour résister au
// changement d'URL.
(function () {
  // Le « scope » du livre courant (/content/<livre>/) : il isole chaque livre
  // (Règles, Univers) en lecture continue distincte. Recalculé à chaque page
  // (un livre par onglet Material), d'où sa définition dans init().
  const ACTIVE_LINE = "-45% 0px -55% 0px";  // ligne de détection du chapitre/section courant
  const LOAD_MARGIN_PX = 2200;              // distance d'anticipation du chargement
  let observers = [];
  let cleanups = [];

  function teardown() {
    observers.forEach(o => o.disconnect());
    cleanups.forEach(fn => fn());
    observers = [];
    cleanups = [];
  }

  function sectionTitle(h) {
    const clone = h.cloneNode(true);
    clone.querySelectorAll(".headerlink").forEach(x => x.remove());
    return clone.textContent.trim();
  }

  // Fige les URLs (liens + images) d'une page chargée en ABSOLU, résolues contre
  // l'URL PROPRE de cette page. En lecture continue, des pages de profondeurs
  // différentes cohabitent sous une seule URL de document ; un href relatif
  // (ex. « ../competences/ ») se résoudrait sinon contre la mauvaise base après
  // un history.replaceState — d'où des renvois cassés (.../content/competences/
  // au lieu de .../content/regles/competences/). On ne touche pas aux ancres pures
  // (#section) ni aux URL déjà absolues (http:, mailto:, //…).
  function absolutize(root, base) {
    root.querySelectorAll("a[href], img[src]").forEach(el => {
      const attr = el.tagName === "IMG" ? "src" : "href";
      const raw = el.getAttribute(attr);
      if (!raw || raw[0] === "#" || raw.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return;
      try { el.setAttribute(attr, new URL(raw, base).href); } catch (_) {}
    });
  }

  // Enveloppe chaque table dans la structure défilante de Material
  // (.md-typeset__scrollwrap > .md-typeset__table). Material le fait au runtime
  // sur la page initiale, mais PAS sur le HTML qu'on injecte ici : sans enveloppe,
  // une table plus large que l'écran déborde la page (visible au téléphone). On
  // reproduit donc l'enveloppe sur les pages chargées en continu.
  function wrapTables(root, doc) {
    root.querySelectorAll("table").forEach(t => {
      const parent = t.parentNode;
      if (!parent || (parent.classList && parent.classList.contains("md-typeset__table"))) return;
      const wrap = doc.createElement("div");
      wrap.className = "md-typeset__scrollwrap";
      const box = doc.createElement("div");
      box.className = "md-typeset__table";
      parent.insertBefore(wrap, t);
      box.appendChild(t);
      wrap.appendChild(box);
    });
  }

  async function fetchArticle(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    const inner = doc.querySelector(".md-content__inner");
    if (inner) {
      absolutize(inner, url);   // renvois figés contre l'URL de CETTE page
      try { wrapTables(inner, doc); } catch (_) {}   // enveloppe défilante des tables
    }
    return inner;
  }

  function makeFrag(article) {
    const frag = document.createElement("div");
    frag.className = "cont-page cont-pending";   // masquée jusqu'à mise en page
    while (article.firstChild) frag.appendChild(article.firstChild);
    return frag;
  }

  // Révèle une page chargée une fois qu'elle est posée (double rAF : la 1re laisse
  // le navigateur calculer la mise en page, la 2de révèle → peinture en un bloc).
  function revealWhenReady(el) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => el.classList.remove("cont-pending")));
  }

  function flash(el) {
    if (!el) return;
    el.classList.remove("cont-flash");
    void el.offsetWidth;
    el.classList.add("cont-flash");
    setTimeout(() => el.classList.remove("cont-flash"), 1600);
  }

  function init() {
    teardown();
    const scopeMatch = location.pathname.match(/\/content\/[^/]+\//);
    const SCOPE = scopeMatch ? scopeMatch[0] : null;
    const isBook = !!SCOPE;
    // book-mode sur <html> ET <body> : <html> est aussi posé avant le rendu par
    // le script du <head> (anti-FOUC) ; on le garde synchro pour la navigation
    // instantanée (où le <head> ne se ré-exécute pas).
    document.documentElement.classList.toggle("book-mode", isBook);
    document.body.classList.toggle("book-mode", isBook);
    if (!isBook) {
      document.documentElement.classList.remove("book-loading");
      return;
    }

    const reveal = () => document.documentElement.classList.remove("book-loading");
    const inner = document.querySelector(".md-content__inner");
    if (!inner) { reveal(); return; }
    inner.classList.add("cont-active");

    // Liens de nav figés en absolu : un changement d'URL (clic dans l'arbre) ne
    // doit pas casser leur résolution relative.
    document.querySelectorAll('.md-tabs__link, a.md-logo').forEach(a => {
      a.setAttribute('href', a.href);
    });

    // Contenu déjà rendu de la page courante → première feuille.
    const firstPage = document.createElement("div");
    firstPage.className = "cont-page";
    while (inner.firstChild) firstPage.appendChild(inner.firstChild);
    absolutize(firstPage, location.href);   // fige ses renvois avant tout replaceState

    // Ordre des chapitres, lu dans la nav de Material.
    const bookPages = [...document.querySelectorAll('.md-sidebar--primary .md-nav__link[href]')]
      .map(el => ({ el, u: new URL(el.href) }))
      .filter(o => o.u.hash === "" && o.u.pathname.includes(SCOPE))
      .map(o => ({ path: o.u.pathname, url: o.u.href, title: o.el.textContent.trim() }));

    const curIdx = bookPages.findIndex(p => p.path === location.pathname);
    if (curIdx < 0) { inner.appendChild(firstPage); reveal(); return; }

    const pageEls = {};         // path -> .cont-page
    const chapterEls = {};      // path -> <li> de page
    const chapterGroupEls = {}; // titre chapitre -> <li.book-group>
    const pageChapter = {};     // path -> titre chapitre (ou null)
    const sections = [];        // { h2, link, path }
    let loadedTop = curIdx, loadedBottom = curIdx;
    let loadingUp = false, loadingDown = false, buffering = false;

    // Verrou de SURLIGNAGE uniquement : posé par un clic pour que le chapitre
    // actif ne saute pas pendant le défilement, levé au 1er scroll manuel.
    // (Le chargement, lui, n'est jamais gelé : la compensation manuelle garde
    // la position quoi qu'il arrive.)
    let suppressAuto = false;
    const release = () => { suppressAuto = false; };
    const inputs = ["wheel", "touchmove", "keydown"];
    inputs.forEach(ev => window.addEventListener(ev, release, { passive: true }));
    cleanups.push(() => inputs.forEach(ev => window.removeEventListener(ev, release)));

    // ----- Arbre custom -----
    const scrollwrap = document.querySelector(".md-sidebar--primary .md-sidebar__scrollwrap");
    const bookNav = document.createElement("nav");
    bookNav.className = "book-nav";
    const rootUl = document.createElement("ul");
    bookNav.appendChild(rootUl);

    // Regroupement en chapitres, lu dans la nav imbriquée de Material. Un
    // chapitre = li.md-nav__item--nested SANS --section (la --section est la
    // racine « Livre de Règles »). On en tire le titre + les chemins des pages.
    const chapterDefs = [...document.querySelectorAll(
      '.md-sidebar--primary li.md-nav__item--nested:not(.md-nav__item--section)')]
      .map(li => {
        const label = li.querySelector(":scope > label, :scope > .md-nav__link");
        const paths = [...li.querySelectorAll('a.md-nav__link[href]')]
          .map(a => new URL(a.href))
          .filter(u => u.hash === "" && u.pathname.includes(SCOPE))
          .map(u => u.pathname);
        return { title: label ? label.textContent.trim() : "", paths };
      });
    function chapterOf(path) {
      const d = chapterDefs.find(c => c.paths.indexOf(path) !== -1);
      return d ? d.title : null;
    }

    // Défile la lecture continue jusqu'à une page chargée. Renvoie false si la
    // page n'est pas (encore) chargée → l'appelant laisse le lien naviguer.
    function goToPage(path, url) {
      const page = pageEls[path];
      if (!page) return false;
      suppressAuto = true;
      activate(page);
      history.replaceState(null, "", url);
      page.scrollIntoView({ block: "start", behavior: "instant" });
      ensureBuffer(page);
      flash(page.querySelector("h1") || page);
      return true;
    }

    function setActiveSection(rec) {
      sections.forEach(s => s.link.classList.toggle("active", s === rec));
    }
    function activate(el) {
      const path = el.dataset.path;
      if (!path) return;
      Object.keys(chapterEls).forEach(p =>
        chapterEls[p].classList.toggle("active", p === path));
      const ch = pageChapter[path];
      Object.keys(chapterGroupEls).forEach(t =>
        chapterGroupEls[t].classList.toggle("active", t === ch));
    }

    // Arbre à 3 niveaux : chapitre (groupe dépliable) > page > sections.
    // Les pages sont en ordre de lecture, déjà groupées par chapitre dans la nav,
    // donc un simple parcours suffit (nouveau groupe à chaque changement).
    let curChapter = undefined;   // sentinelle distincte de null
    let groupUl = rootUl;         // conteneur courant des <li> de page
    bookPages.forEach(p => {
      const ch = chapterOf(p.path);
      if (ch !== curChapter) {
        curChapter = ch;
        if (ch === null) {
          groupUl = rootUl;       // page hors chapitre (ex. l'index du livre)
        } else {
          const groupLi = document.createElement("li");
          groupLi.className = "book-group";
          const title = document.createElement("a");
          title.className = "book-group-title";
          title.textContent = ch;
          title.href = p.url;   // p = 1re page du chapitre (créé à sa rencontre)
          // Clic sur un chapitre = défiler vers sa première page.
          const firstPath = p.path, firstUrl = p.url;
          title.addEventListener("click", ev => {
            if (!pageEls[firstPath]) return;   // pas chargé → on laisse naviguer
            ev.preventDefault();
            ev.stopPropagation();
            goToPage(firstPath, firstUrl);
          });
          const pagesUl = document.createElement("ul");
          pagesUl.className = "book-group-pages";
          groupLi.appendChild(title);
          groupLi.appendChild(pagesUl);
          rootUl.appendChild(groupLi);
          groupUl = pagesUl;
          chapterGroupEls[ch] = groupLi;
        }
      }
      pageChapter[p.path] = ch;

      const li = document.createElement("li");
      li.className = "book-chapter";
      const a = document.createElement("a");
      a.className = "book-link";
      a.textContent = p.title;
      a.href = p.url;
      a.addEventListener("click", ev => {
        if (!pageEls[p.path]) return;   // pas chargé : on laisse Material naviguer
        ev.preventDefault();
        ev.stopPropagation();
        goToPage(p.path, p.url);
      });
      const secUl = document.createElement("ul");
      secUl.className = "book-sections";
      li.appendChild(a);
      li.appendChild(secUl);
      groupUl.appendChild(li);
      chapterEls[p.path] = li;
    });
    if (scrollwrap) {
      const old = scrollwrap.querySelector(".book-nav");
      if (old) old.remove();
      scrollwrap.appendChild(bookNav);
    }

    // ----- Surlignage : chapitre + section courants suivent le scroll -----
    const obsActive = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting && !suppressAuto) activate(e.target);
      }),
      { rootMargin: ACTIVE_LINE }
    );
    const obsSection = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting && !suppressAuto) {
          const rec = sections.find(s => s.h2 === e.target);
          if (rec) setActiveSection(rec);
        }
      }),
      { rootMargin: ACTIVE_LINE }
    );
    observers.push(obsActive, obsSection);

    function registerPage(pageEl, meta) {
      pageEl.dataset.path = meta.path;
      pageEls[meta.path] = pageEl;
      obsActive.observe(pageEl);
      const li = chapterEls[meta.path];
      const secUl = li && li.querySelector(".book-sections");
      if (secUl && !secUl.childElementCount) {
        pageEl.querySelectorAll("h2").forEach(h => {
          const item = document.createElement("li");
          const a = document.createElement("a");
          a.className = "book-sec";
          a.textContent = sectionTitle(h);
          a.href = h.id ? (meta.url + "#" + h.id) : meta.url;
          const rec = { h2: h, link: a, path: meta.path };
          a.addEventListener("click", ev => {
            ev.preventDefault();
            ev.stopPropagation();
            suppressAuto = true;
            activate(pageEl);
            setActiveSection(rec);
            history.replaceState(null, "", a.getAttribute("href"));
            h.scrollIntoView({ block: "start", behavior: "instant" });
            ensureBuffer(h);
            flash(h);
          });
          item.appendChild(a);
          secUl.appendChild(item);
          sections.push(rec);
          obsSection.observe(h);
        });
      }
    }

    // ----- Marqueurs d'insertion + chargement -----
    inner.appendChild(firstPage);
    registerPage(firstPage, bookPages[curIdx]);
    activate(firstPage);

    const bottom = document.createElement("div");
    bottom.className = "cont-sentinel";
    inner.appendChild(bottom);
    const top = document.createElement("div");
    top.className = "cont-sentinel";
    inner.insertBefore(top, inner.firstChild);

    // Charge la page suivante (ajout EN DESSOUS : ne décale rien). Renvoie true
    // si une page a été ajoutée.
    async function loadNext() {
      if (loadingDown || loadedBottom >= bookPages.length - 1) return false;
      loadingDown = true;
      try {
        const i = loadedBottom + 1;
        const article = await fetchArticle(bookPages[i].url);
        loadedBottom = i;
        if (article) {
          const el = makeFrag(article);
          inner.insertBefore(el, bottom);
          registerPage(el, bookPages[i]);
          revealWhenReady(el);
          return true;
        }
      } catch (_) {
        loadedBottom = bookPages.length;
      } finally {
        loadingDown = false;
      }
      return false;
    }

    // Charge la page précédente (insertion AU-DESSUS). Pendant le scroll,
    // l'ancrage natif garde la position. Pour les cas tout-en-haut, ensureBuffer
    // repositionne sur `keepInView`.
    async function loadPrev() {
      if (loadingUp || loadedTop <= 0) return false;
      loadingUp = true;
      try {
        const i = loadedTop - 1;
        const article = await fetchArticle(bookPages[i].url);
        loadedTop = i;
        if (article) {
          const el = makeFrag(article);
          inner.insertBefore(el, top.nextSibling);
          registerPage(el, bookPages[i]);
          revealWhenReady(el);
          return true;
        }
      } catch (_) {
        loadedTop = 0;
      } finally {
        loadingUp = false;
      }
      return false;
    }

    // Maintient le tampon : charge dans les deux sens tant qu'on est proche d'un
    // bord de la zone chargée. Cascade jusqu'à ce que le tampon soit rempli.
    // `keepInView` (clic/arrivée) : élément à garder en haut après une insertion
    // haute (les cas à scrollTop ~0 où l'ancrage natif n'agit pas). Au scroll,
    // keepInView est absent → l'ancrage natif gère seul, sans glitch.
    async function ensureBuffer(keepInView) {
      if (buffering) return;
      buffering = true;
      try {
        let again = true;
        while (again) {
          again = false;
          const st = window.scrollY;
          const vh = window.innerHeight;
          const dh = document.documentElement.scrollHeight;
          if (loadedBottom < bookPages.length - 1 && (dh - st - vh) < LOAD_MARGIN_PX) {
            if (await loadNext()) again = true;
          }
          if (loadedTop > 0 && st < LOAD_MARGIN_PX) {
            if (await loadPrev()) {
              again = true;
              // Repositionne sur la cible UNIQUEMENT tant que l'utilisateur n'a
              // pas scrollé (suppressAuto). Dès qu'il prend la main, on arrête →
              // l'ancrage natif gère, plus de yank/glitch.
              if (keepInView && suppressAuto) {
                keepInView.scrollIntoView({ block: "start", behavior: "instant" });
              }
            }
          }
        }
      } finally {
        buffering = false;
      }
    }

    let scheduled = false;
    function onScroll() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; ensureBuffer(); });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    });

    // Arrivée : on se place sur la page demandée (ou l'ancre), puis on remplit
    // le tampon autour (la compensation manuelle garde la position).
    requestAnimationFrame(() => {
      const hash = location.hash && document.getElementById(location.hash.slice(1));
      const anchor = hash || firstPage;
      suppressAuto = true;   // repositionnement actif jusqu'au 1er scroll manuel
      anchor.scrollIntoView({ block: "start", behavior: "instant" });
      reveal();   // mise en page faite → on révèle le contenu (fin de l'anti-FOUC)
      ensureBuffer(anchor);
    });
  }

  if (window.document$) {
    document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
