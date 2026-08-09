# -*- coding: utf-8 -*-
"""Etape 3 — RELIGIONS (dependent des cultures ; monde moderne).

Une religion est en general PLUS LARGE qu'une culture : elle s'etend sur plusieurs cultures
APPARENTEES (comme une grande religion reelle couvre plusieurs peuples), mais BUTE sur les
frontieres ou les cultures sont en fort CONFLIT. Les mers/montagnes freinent peu (missionnaires,
commerce). L'ATHEISME/seculier est une religion a part entiere, forte dans les pays "developpes"
(temperes, cotiers, connectes, cultures urbaines), MAIS la religion traditionnelle reste presente
en minorite (ex. pays seculier ou une foi historique demeure tres implantee).

Repartition 100 pts par pays. Preceptes + conflits. Recherche de config (tache 5).
Sorties : religions.json + carte_religions.png
"""
import os, sys, json, heapq, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import polgraph, render_pol as R

DOCS = r'C:\Users\IgneeFleur\Documents\Github\FNS-TTRPG-RULES\docs\assets\cartes'
SITE = r'C:\Users\IgneeFleur\Documents\Github\FNS-TTRPG-RULES\site\assets\cartes'
SEED = 314159265

P = polgraph.load(); K = P.K; NODES = list(range(1, K + 1))
with open(os.path.join(HERE, 'cultures.json'), encoding='utf-8') as f:
    CJ = json.load(f)
DOM_CULT = {int(k): v for k, v in CJ['dominant'].items()}     # pays -> culture id
CULT_ARCH = {c['id']: c['archetype'] for c in CJ['cultures']}
CONF = {}                                                     # (cA,cB)->score conflit culturel
for a, b, s in CJ['conflicts']:
    CONF[(min(a, b), max(a, b))] = s

# ---- doctrines (familles religieuses) : preceptes + style de nom ----
PRECEPTS = {
    'unique': ("Foi unitaire", "pantheon", +1), 'pantheon': ("Panthéon multiple", "pantheon", -1),
    'salut': ("Salut et jugement", "audela", +1), 'cycle': ("Cycle des renaissances", "audela", -1),
    'ancetres': ("Communion des ancêtres", "audela", 0),
    'clerge': ("Clergé hiérarchique", "clerge", +1), 'sansclerge': ("Sans clergé", "clerge", -1),
    'icono': ("Iconoclasme", "image", +1), 'icones': ("Images et idoles vénérées", "image", -1),
    'mission': ("Prosélytisme", "mission", +1), 'ethnique': ("Foi close, ethnique", "mission", -1),
    'ascese': ("Ascèse et renoncement", "corps", +1), 'fete': ("Fêtes et abondance", "corps", -1),
    'revele': ("Texte révélé", "savoir", +1), 'orale': ("Transmission orale", "savoir", -1),
    'interdit': ("Interdits alimentaires", "rite", 0), 'pelerin': ("Grand pèlerinage", "rite", 0),
    'priere': ("Prière quotidienne", "rite", 0), 'purte': ("Rites de pureté", "rite", 0),
    'raison': ("Primauté de la raison", "monde", +1), 'mystere': ("Culte du mystère", "monde", -1),
}
DOCTRINES = {
    'book':      dict(bias=['unique', 'salut', 'clerge', 'revele', 'mission', 'priere'], forms=['{r}isme', 'Église de {R}', 'Pacte de {R}', '{R}isme']),
    'dharmic':   dict(bias=['cycle', 'ascese', 'sansclerge', 'mystere', 'interdit'], forms=['Voie de {R}', '{r}isme', 'les {R}ites']),
    'ancestral': dict(bias=['ancetres', 'orale', 'pantheon', 'ethnique', 'purte'], forms=['Culte de {R}', 'les esprits de {R}', 'Tradition {R}']),
    'celestial': dict(bias=['pantheon', 'icones', 'clerge', 'pelerin', 'fete'], forms=['Culte de {R}', 'Temple de {R}', '{R}isme']),
    'dualist':   dict(bias=['salut', 'purte', 'icono', 'ascese', 'revele'], forms=['{r}isme', 'Ordre de {R}', 'Foi de {R}']),
    'mystic':    dict(bias=['mystere', 'ascese', 'sansclerge', 'orale', 'cycle'], forms=['Voie de {R}', 'Cercle de {R}', 'les {R}ites']),
}
DOCTRINE_KEYS = list(DOCTRINES.keys())
# archetype de culture -> doctrines probables (dependance culture->religion)
CULT2DOCTR = {
    'boreal': ['ancestral', 'dualist'], 'steppe': ['celestial', 'ancestral'], 'desert': ['book', 'dualist'],
    'equator': ['ancestral', 'celestial'], 'highland': ['celestial', 'ancestral'], 'maritime': ['book', 'mystic'],
    'latin': ['book', 'celestial'], 'sinitic': ['dharmic', 'ancestral'], 'nipponic': ['dharmic', 'mystic'],
    'indic': ['dharmic', 'celestial'], 'savanna': ['ancestral', 'book'], 'gaelic': ['ancestral', 'mystic'],
    'tundra': ['ancestral', 'mystic'], 'persic': ['dualist', 'book'],
}
SECULAR_BIAS = {'maritime': 1.0, 'latin': 0.8, 'sinitic': 0.9, 'nipponic': 0.85, 'indic': 0.4, 'persic': 0.4,
                'boreal': 0.7, 'gaelic': 0.6, 'steppe': 0.3, 'desert': 0.15, 'highland': 0.25, 'equator': 0.2,
                'savanna': 0.2, 'tundra': 0.35}

ROOT_ON = ['Var', 'Sol', 'Aur', 'Zar', 'Thal', 'Myr', 'Ael', 'Ors', 'Kael', 'Vael', 'Sar', 'Neh', 'Oph', 'Ish',
           'Rho', 'Cael', 'Dur', 'Esh', 'Tav', 'Yl', 'Uzh', 'Ombra', 'Sera', 'Nazr', 'Qual', 'Vesh']
ROOT_TAIL = ['an', 'or', 'eth', 'ia', 'un', 'ash', 'el', 'im', 'ar', 'os', 'yr', 'ael']


def dijkstra_multi(edges, sources):
    INF = 1e18; dist = {n: INF for n in NODES}; src = {n: 0 for n in NODES}; h = []
    for s in sources:
        dist[s] = 0.0; src[s] = s; heapq.heappush(h, (0.0, s))
    while h:
        d, u = heapq.heappop(h)
        if d > dist[u]:
            continue
        for v, w in edges.get(u, ()):
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd; src[v] = src[u]; heapq.heappush(h, (nd, v))
    return dist, src


def relig_edges(mtn=0.8, sea=0.7, confp=4.0):
    E = {}
    def add(i, j, base):
        ca, cb = DOM_CULT[i], DOM_CULT[j]
        cf = CONF.get((min(ca, cb), max(ca, cb)), 0)
        cost = base + confp * cf
        E.setdefault(i, []).append((j, cost))
    for i in P.adj:
        for j, blen in P.adj[i].items():
            k = (i, j) if i < j else (j, i)
            mt = max(0.0, (P.border_mtn.get(k, 0.0) - 0.12) / 0.6)
            add(i, j, 1.0 + mtn * min(mt, 1.2))
    for i in P.sea:
        for j, d in P.sea[i].items():
            add(i, j, 1.0 + sea * (0.5 + d / (polgraph.SEA_LINK_PX * P.W)))
    return E


def development():
    dev = np.zeros(K + 1)
    a = P.area; p90 = np.percentile(a, 90)
    for i in range(K):
        fy = P.fy[i]
        temperate = float(np.clip(1 - abs(abs(fy - 0.5) - 0.24) / 0.24, 0, 1))
        coast = float(np.clip(P.coast_px[i] / (2.5 * np.sqrt(max(a[i], 1))), 0, 1))
        conn = (len(P.adj.get(i + 1, {})) + len(P.sea.get(i + 1, {}))) / 10.0
        lowl = 1 - float(np.clip((P.mean_elev[i] - 0.10) / 0.40, 0, 1))
        cb = SECULAR_BIAS.get(CULT_ARCH.get(DOM_CULT[i + 1], ''), 0.4)
        d = 0.30 * temperate + 0.28 * coast + 0.16 * min(conn, 1.0) + 0.10 * min(a[i] / p90, 1) + 0.06 * lowl + 0.40 * cb
        dev[i + 1] = d
    dev[1:] = (dev[1:] - dev[1:].min()) / (np.ptp(dev[1:]) + 1e-9)
    return dev

DEV = development()


def seed_relig(edges, n, rng):
    culture_cores = [c['core_country'] for c in CJ['cultures']]
    start = max(culture_cores, key=lambda c: P.area[c - 1])
    cores = [start]; dist, _ = dijkstra_multi(edges, cores)
    while len(cores) < n:
        cand = [(dist[c], c) for c in culture_cores if c not in cores and dist[c] < 1e17]
        if not cand:
            cand = [(dist[v], v) for v in NODES if v not in cores and dist[v] < 1e17]
        if not cand:
            rem = [v for v in NODES if v not in cores]
            cores.append(max(rem, key=lambda v: P.area[v - 1]))
        else:
            cores.append(max(cand)[1])
        dist, _ = dijkstra_multi(edges, cores)
    return cores


def generate(params, seed):
    rng = np.random.default_rng(seed)
    edges = relig_edges(params['mtn'], params['sea'], params['confp'])
    cores = seed_relig(edges, params['n'], rng)
    dist, src = dijkstra_multi(edges, cores)
    trad = {}
    for v in NODES:
        c = src[v]
        if c == 0:
            c = min(cores, key=lambda k: (P.cx[v - 1] - P.cx[k - 1]) ** 2 + (P.cy[v - 1] - P.cy[k - 1]) ** 2)
        trad[v] = c
    return dict(cores=cores, trad=trad, edges=edges)


def blend(res, params, seed):
    """100 pts/pays sur les religions (dont SECULIER). trad = religion historique dominante par croissance."""
    rng = np.random.default_rng(seed + 313)
    trad = res['trad']; edges = res['edges']; cores = res['cores']
    SEC = -1                                                  # id special seculier
    ec = {}
    for u in edges:
        for v, w in edges[u]:
            ec[(u, v)] = w
    out = {}
    for v in NODES:
        tv = trad[v]
        nb = list(P.adj.get(v, {}).items()) + [(j, 40.0) for j in P.sea.get(v, {})]
        same = sum(1 for j, _ in nb if trad[j] == tv)
        homog = same / len(nb) if nb else 1.0
        # part seculiere selon developpement
        sec = params['sec_base'] + params['sec_amp'] * (DEV[v] ** 1.5)
        sec = float(np.clip(sec + rng.uniform(-4, 4), 0, 78))
        rel_pool = 100.0 - sec
        w = {tv: rel_pool * (0.62 + 0.33 * homog)}
        rem = rel_pool - w[tv]
        contrib = {}
        for j, blen in nb:
            tj = trad[j]
            if tj == tv:
                continue
            cost = ec.get((v, j), ec.get((j, v), 3.0))
            contrib[tj] = contrib.get(tj, 0.0) + (blen ** 0.5) / cost
        tot = sum(contrib.values())
        if tot > 0:
            for tj, cw in contrib.items():
                w[tj] = w.get(tj, 0.0) + rem * (cw / tot)
        else:
            w[tv] += rem
        w[SEC] = sec
        # diaspora religieuse (immigration moderne)
        if rng.random() < 0.18:
            far = int(rng.choice(cores))
            take = rng.uniform(2, 8)
            if far != tv:
                w[tv] = max(0.5, w[tv] - take); w[far] = w.get(far, 0.0) + take
        s = sum(w.values()); w = {r: p / s * 100 for r, p in w.items() if p / s * 100 >= 1.0}
        s = sum(w.values()); w = {r: p / s * 100 for r, p in w.items()}
        ip = {r: int(round(p)) for r, p in w.items()}
        d = 100 - sum(ip.values())
        if ip:
            ip[max(ip, key=lambda k: ip[k])] += d
        out[v] = ip
    return out


def dominant(blendmap):
    return {v: max(blendmap[v], key=lambda r: blendmap[v][r]) for v in NODES}


def nmi(dom_relig):
    """Info mutuelle normalisee culture<->religion dominante (0 aleatoire, 1 identique)."""
    cs = np.array([DOM_CULT[v] for v in NODES]); rs = np.array([dom_relig[v] for v in NODES])
    def ent(x):
        _, c = np.unique(x, return_counts=True); p = c / c.sum(); return -(p * np.log(p)).sum()
    Hc, Hr = ent(cs), ent(rs)
    # joint
    joint = {}
    for a, b in zip(cs, rs):
        joint[(a, b)] = joint.get((a, b), 0) + 1
    n = len(cs); I = 0.0
    from collections import Counter
    cc = Counter(cs); rc = Counter(rs)
    for (a, b), nab in joint.items():
        pab = nab / n; pa = cc[a] / n; pb = rc[b] / n
        I += pab * np.log(pab / (pa * pb))
    return I / (0.5 * (Hc + Hr) + 1e-9)


def score(res, blendmap):
    dom = dominant(blendmap)
    ids = [r for v in NODES for r in [dom[v]]]
    from collections import Counter
    cnt = Counter(ids); frac = np.array(list(cnt.values())) / len(ids)
    s = 0.0
    # grande religion mondiale mais pas ecrasante
    s -= 5 * max(0, frac.max() - 0.42) + 3 * max(0, 0.15 - frac.max())
    # seculier present mais pas partout
    sec_dom = sum(1 for v in NODES if dom[v] == -1) / K
    s -= 6 * max(0, sec_dom - 0.32) + 6 * max(0, 0.06 - sec_dom)
    # correlation culture-religion moderee
    m = nmi(dom)
    s -= 5 * max(0, 0.35 - m) + 5 * max(0, m - 0.78)
    # equilibre (entropie)
    s += 2.0 * (-(frac * np.log(frac + 1e-9)).sum() / np.log(len(frac) + 1e-9))
    return s, dict(maxfrac=float(frac.max()), sec_dom=float(sec_dom), nmi=float(m), nrel=len(cnt))


def main():
    grid = []
    for n in (7, 8, 9, 10):
        for confp in (3.0, 5.0):
            for sec_amp in (48.0, 60.0):
                grid.append(dict(n=n, mtn=0.8, sea=0.7, confp=confp, sec_base=4.0, sec_amp=sec_amp))
    best = None
    for gi, params in enumerate(grid):
        for trial in range(2):
            res = generate(params, SEED + 50 * gi + trial)
            bl = blend(res, params, SEED + 50 * gi + trial)
            sc, info = score(res, bl)
            if best is None or sc > best[0]:
                best = (sc, params, res, bl, info, SEED + 50 * gi + trial)
    sc, params, res, bl, info, used = best
    print(f'meilleure config religion: n={params["n"]} confp={params["confp"]} sec_amp={params["sec_amp"]} '
          f'score={sc:.2f} {info}', flush=True)

    cores = res['cores']; trad = res['trad']
    rng = np.random.default_rng(used + 11)
    # doctrine par religion selon la CULTURE de son foyer (dependance culture->religion)
    doctr = {}; rname = {}; rprec = {}; used_names = set()
    for c in cores:
        cult = CULT_ARCH.get(DOM_CULT[c], 'latin')
        choices = CULT2DOCTR.get(cult, DOCTRINE_KEYS)
        dk = str(rng.choice(choices))
        doctr[c] = dk
        for _ in range(30):
            root = rng.choice(ROOT_ON) + (rng.choice(ROOT_TAIL) if rng.random() < 0.6 else '')
            form = str(rng.choice(DOCTRINES[dk]['forms']))
            nm = form.replace('{R}', root.capitalize()).replace('{r}', root.lower())
            if nm not in used_names:
                break
        used_names.add(nm); rname[c] = nm
        # preceptes
        bias = list(DOCTRINES[dk]['bias']); extra = [p for p in PRECEPTS if p not in bias]
        rng.shuffle(extra); cand = bias + extra; chosen = []; ax = {}
        for p in cand:
            _, axis, pole = PRECEPTS[p]
            if pole != 0 and ax.get(axis) == -pole:
                continue
            chosen.append(p);
            if pole != 0:
                ax[axis] = pole
            if len(chosen) >= 4:
                break
        rprec[c] = chosen

    SEC = -1
    rid = {c: k + 1 for k, c in enumerate(cores)}; rid[SEC] = 0  # 0 reserve? non: on met seculier a Nrel+1
    Nrel = len(cores); SEC_ID = Nrel + 1
    dom = dominant(bl)

    # couleurs : religions (adjacence des dominantes)
    def rlabel(r):
        return SEC_ID if r == SEC else rid[r]
    radj = {}
    for i in NODES:
        for j in P.adj.get(i, {}):
            a, b = rlabel(dom[i]), rlabel(dom[j])
            if a != b:
                radj.setdefault(a, {})[b] = 1; radj.setdefault(b, {})[a] = 1
    pal = R.make_palette(max(Nrel + 3, 12), sat=0.5, val=0.9, seed=41)
    colidx = R.spread_colors(radj, SEC_ID, len(pal), seed=9)
    rel_color = {}
    for c in cores:
        rel_color[rid[c]] = [float(x) for x in pal[colidx.get(rid[c], rid[c] % len(pal))]]
    rel_color[SEC_ID] = [0.62, 0.64, 0.67]                    # seculier = gris neutre

    # conflits entre religions (preceptes opposes)
    def prec_conf(A, B):
        c = 0
        for a in A:
            _, axa, pa = PRECEPTS[a]
            if pa == 0:
                continue
            for b in B:
                _, axb, pb = PRECEPTS[b]
                if axa == axb and pa == -pb:
                    c += 1
        return c
    conflicts = []
    cl = list(cores)
    for a in range(len(cl)):
        for b in range(a + 1, len(cl)):
            cc = prec_conf(rprec[cl[a]], rprec[cl[b]])
            if cc > 0:
                conflicts.append([rid[cl[a]], rid[cl[b]], cc])

    religions = []
    for c in cores:
        dk = doctr[c]
        religions.append(dict(id=rid[c], name=rname[c], doctrine=dk,
                              precepts=rprec[c], precepts_fr=[PRECEPTS[p][0] for p in rprec[c]],
                              color=rel_color[rid[c]], core_country=int(c),
                              members=[int(v) for v in NODES if trad[v] == c]))
    religions.append(dict(id=SEC_ID, name="Séculiers", doctrine='secular',
                          precepts=['raison'], precepts_fr=["Primauté de la raison", "Humanisme", "Laïcité"],
                          color=rel_color[SEC_ID], core_country=0, members=[]))
    data = dict(n_relig=Nrel + 1, sec_id=SEC_ID, params=params, info=info,
                religions=religions,
                dominant={str(v): rlabel(dom[v]) for v in NODES},
                country_religion={str(v): {str(rlabel(r)): p for r, p in bl[v].items()} for v in NODES},
                conflicts=conflicts)
    with open(os.path.join(HERE, 'religions.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    print(f'religions.json : {Nrel} religions + séculier ; nmi={info["nmi"]:.2f} sec_dom={info["sec_dom"]:.2f}', flush=True)

    # carte
    rcube = np.zeros((SEC_ID + 1, 3), np.float32); rcube[0] = R.OCEAN
    for c in cores:
        rcube[rid[c]] = rel_color[rid[c]]
    rcube[SEC_ID] = rel_color[SEC_ID]
    rlab_map = np.zeros_like(P.labels)
    for v in NODES:
        rlab_map[P.labels == v] = rlabel(dom[v])
    for dest in (DOCS, SITE, HERE):
        R.choropleth(rlab_map, rcube, os.path.join(dest, 'carte_religions.png'), land=P.land, borders=True, coast=True)
    print('carte_religions.png', flush=True)


if __name__ == '__main__':
    main()
