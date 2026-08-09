# -*- coding: utf-8 -*-
"""Etape 2 — CULTURES (facon CK3, monde moderne).

Logique : des FOYERS culturels (cores) espaces sur le graphe des pays ; chaque foyer recoit un
ARCHETYPE selon la GEOGRAPHIE (climat, relief, cote, insularite) -> familles coherentes. La culture
DOMINANTE se propage de proche en proche, freinee par montagnes / mers / continents (Voronoi
geodesique sur le graphe) -> blocs contigus facon familles reelles. Chaque pays recoit une
REPARTITION sur 100 points (dominante + minorites frontalieres + diaspora). Traditions + conflits.

Recherche de la meilleure config selon des criteres de realisme/interet (tache 5).
Sorties : cultures.json + carte_cultures.png
"""
import os, sys, json, heapq, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import polgraph, namegen as NG, render_pol as R
from scipy import ndimage

DOCS = r'C:\Users\IgneeFleur\Documents\Github\fns-ttrpg-rules\docs\assets\cartes'
SITE = r'C:\Users\IgneeFleur\Documents\Github\fns-ttrpg-rules\site\assets\cartes'
SEED = 314159265

P = polgraph.load()
K = P.K
NODES = list(range(1, K + 1))

# ---------- features geographiques par pays ----------
def features():
    f = {}
    a = P.area
    p90 = np.percentile(a, 90)
    # aire de continent par pays
    contsz = np.zeros(P.ncont + 1)
    for i in range(K):
        contsz[P.continent[i]] += a[i]
    contfrac = contsz / contsz[1:].sum()
    for i in range(K):
        fy = P.fy[i]
        warmth = 1.0 - abs(fy - 0.5) / 0.5
        coast = float(np.clip(P.coast_px[i] / (2.5 * np.sqrt(max(a[i], 1))), 0, 1))
        cf = contfrac[P.continent[i]]
        f[i + 1] = dict(
            cold=float(np.clip((abs(fy - 0.5) - 0.14) / 0.34, 0, 1)),
            warm=float(np.clip(1 - abs(fy - 0.5) / 0.42, 0, 1)),
            equator=float(np.clip(1 - abs(fy - 0.5) / 0.16, 0, 1)),
            interior=float(1 - coast),
            coastal=float(coast),
            highland=float(np.clip((P.mean_elev[i] - 0.10) / 0.40, 0, 1)),
            island=float(np.clip((0.14 - cf) / 0.14, 0, 1) if cf < 0.14 else 0.0) * 0.6 + (coast if a[i] < np.median(a) else 0) * 0.4,
            large=float(np.clip(a[i] / p90, 0, 1)),
        )
    return f

FEAT = features()

def dijkstra_multi(edges, sources):
    INF = 1e18
    dist = {n: INF for n in NODES}; src = {n: 0 for n in NODES}
    h = []
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

def seed_cores(edges, n, rng):
    start = int(np.argmax(P.area)) + 1
    cores = [start]
    dist, _ = dijkstra_multi(edges, cores)
    while len(cores) < n:
        reach = [(dist[v], v) for v in NODES if dist[v] < 1e17 and v not in cores]
        if not reach:                          # composant isole -> prends le plus grand pays non couvert
            rem = [v for v in NODES if v not in cores]
            nxt = max(rem, key=lambda v: P.area[v - 1])
        else:
            nxt = max(reach)[1]
        cores.append(nxt)
        dist, _ = dijkstra_multi(edges, cores)
    return cores

def assign_archetypes(cores, rng):
    use = {k: 0 for k in NG.ARCH_KEYS}
    arch_of = {}
    for c in cores:
        ft = FEAT[c]
        best, bs = None, -1e9
        for ak in NG.ARCH_KEYS:
            aff = NG.ARCH[ak]['aff']
            s = sum(aff.get(fk, 0.0) * ft[fk] for fk in NG.FEATURES)
            s += rng.uniform(-0.15, 0.15) - 0.55 * use[ak]      # diversite
            if s > bs:
                bs, best = s, ak
        arch_of[c] = best; use[best] += 1
    return arch_of

def connected_components(members_set):
    seen = set(); comps = 0
    for s in members_set:
        if s in seen:
            continue
        comps += 1; stack = [s]; seen.add(s)
        while stack:
            u = stack.pop()
            for v in P.adj.get(u, {}):
                if v in members_set and v not in seen:
                    seen.add(v); stack.append(v)
    return comps

def generate(params, seed):
    rng = np.random.default_rng(seed)
    edges = polgraph.graph_edges(P, mtn_pen=params['mtn'], sea_pen=params['sea'], cont_pen=params['cont'])
    cores = seed_cores(edges, params['n'], rng)
    arch_of = assign_archetypes(cores, rng)
    dist, src = dijkstra_multi(edges, cores)
    dom = {}
    for v in NODES:
        c = src[v]
        if c == 0:                              # inatteignable -> plus proche core par centroide
            c = min(cores, key=lambda k: (P.cx[v - 1] - P.cx[k - 1]) ** 2 + (P.cy[v - 1] - P.cy[k - 1]) ** 2)
        dom[v] = c
    return dict(cores=cores, arch_of=arch_of, dom=dom, dist=dist, edges=edges)

def score(res):
    dom = res['dom']; cores = res['cores']
    members = {c: set() for c in cores}
    for v, c in dom.items():
        members[c].add(v)
    sizes = np.array([len(members[c]) for c in cores], float)
    if (sizes == 0).any():
        return -1e9
    frac = sizes / sizes.sum()
    s = 0.0
    # 1) pas de monoculture, pas de miettes
    s -= 6.0 * max(0.0, frac.max() - 0.22)
    s -= 3.0 * (frac < 0.012).sum()
    # 2) contiguite (peu de composantes ; les sauts maritimes sont tolérés a 1 pres)
    frag = sum(max(0, connected_components(members[c]) - 1) for c in cores)
    s -= 0.20 * frag
    # 3) diversite d'archetypes
    s += 0.15 * len(set(res['arch_of'].values()))
    # 4) equilibre des tailles (entropie)
    ent = -(frac * np.log(frac + 1e-9)).sum() / np.log(len(cores))
    s += 2.5 * ent
    return s

def blend_points(res, seed):
    """Repartition 100 pts par pays : dominante (selon homogeneite) + minorites frontalieres + diaspora."""
    rng = np.random.default_rng(seed + 999)
    dom = res['dom']; edges = res['edges']; cores = res['cores']
    ec = {}
    for u in edges:
        for v, w in edges[u]:
            ec[(u, v)] = w
    out = {}
    all_cults = cores
    for v in NODES:
        dv = dom[v]
        nb = list(P.adj.get(v, {}).items()) + [(j, 40.0) for j in P.sea.get(v, {})]  # (voisin, longueur~)
        if nb:
            same = sum(1 for j, _ in nb if dom[j] == dv)
            homog = same / len(nb)
        else:
            homog = 1.0
        w = {dv: 55.0 + 40.0 * homog}
        # minorites : cultures des voisins differents, ponderees par frontiere / cout
        pool = 100.0 - w[dv]
        contrib = {}
        for j, blen in nb:
            cj = dom[j]
            if cj == dv:
                continue
            cost = ec.get((v, j), ec.get((j, v), 3.0))
            contrib[cj] = contrib.get(cj, 0.0) + (blen ** 0.5) / cost
        tot = sum(contrib.values())
        if tot > 0:
            for cj, cw in contrib.items():
                w[cj] = w.get(cj, 0.0) + pool * (cw / tot)
        else:
            w[dv] += pool
        # diaspora moderne : petite minorite d'une culture LOINTAINE
        if rng.random() < 0.22 and len(all_cults) > 3:
            far = int(rng.choice(all_cults))
            if far != dv:
                take = rng.uniform(3, 11)
                w[dv] = max(1.0, w[dv] - take); w[far] = w.get(far, 0.0) + take
        # normalise -> entiers sommant 100
        ssum = sum(w.values())
        w = {c: v2 / ssum * 100.0 for c, v2 in w.items()}
        w = {c: p for c, p in w.items() if p >= 1.0}
        ssum = sum(w.values())
        w = {c: p / ssum * 100.0 for c, p in w.items()}
        ip = {c: int(round(p)) for c, p in w.items()}
        diff = 100 - sum(ip.values())
        if ip:
            kmax = max(ip, key=lambda k: ip[k]); ip[kmax] += diff
        out[v] = ip
    return out

def main():
    # ---- recherche (tache 5) ----
    grid = []
    for n in (18, 20, 22, 24, 26):
        for mtn in (1.8, 2.6):
            for sea in (2.4, 3.2):
                grid.append(dict(n=n, mtn=mtn, sea=sea, cont=3.0))
    best = None
    for gi, params in enumerate(grid):
        for trial in range(2):
            res = generate(params, SEED + 100 * gi + trial)
            sc = score(res)
            if best is None or sc > best[0]:
                best = (sc, params, res, SEED + 100 * gi + trial)
    sc, params, res, used_seed = best
    print(f'meilleure config culture: n={params["n"]} mtn={params["mtn"]} sea={params["sea"]} score={sc:.3f}', flush=True)

    cores = res['cores']; arch_of = res['arch_of']; dom = res['dom']
    rng = np.random.default_rng(used_seed + 7)
    # noms + traditions par culture
    names = {}; used_names = set()
    trads = {}
    for c in cores:
        ak = arch_of[c]
        for _ in range(20):
            nm = NG.make_name(ak, rng)
            if nm not in used_names and len(nm) >= 3:
                break
        used_names.add(nm); names[c] = nm
        trads[c] = NG.traditions_for(ak, rng)
    # renumerote cultures 1..N
    cid = {c: k + 1 for k, c in enumerate(cores)}
    Ncult = len(cores)
    members = {c: [] for c in cores}
    for v, c in dom.items():
        members[c].append(v)

    # couleurs (adjacence de cultures)
    cadj = {}
    for i in NODES:
        for j in P.adj.get(i, {}):
            a, b = cid[dom[i]], cid[dom[j]]
            if a != b:
                cadj.setdefault(a, {})[b] = 1; cadj.setdefault(b, {})[a] = 1
    pal = R.make_palette(max(Ncult + 2, 24), sat=0.46, val=0.92, seed=23)
    colidx = R.spread_colors(cadj, Ncult, len(pal), seed=5)
    cult_color = {c: pal[colidx.get(cid[c], cid[c] % len(pal))] for c in cores}

    # blend 100 pts
    blend = blend_points(res, used_seed)

    # conflits entre cultures
    conflicts = []
    clist = list(cores)
    for a in range(len(clist)):
        for b in range(a + 1, len(clist)):
            cs = NG.conflict_score(trads[clist[a]], trads[clist[b]])
            if cs > 0:
                conflicts.append([cid[clist[a]], cid[clist[b]], cs])

    # ---- json ----
    cultures = []
    for c in cores:
        ak = arch_of[c]
        cultures.append(dict(id=cid[c], name=names[c], archetype=ak, label=NG.ARCH[ak]['label'],
                             traditions=trads[c], traditions_fr=[NG.TRADITIONS[t][0] for t in trads[c]],
                             color=[float(x) for x in cult_color[c]], core_country=int(c),
                             members=[int(x) for x in members[c]], size=len(members[c])))
    data = dict(n_cult=Ncult, params=params,
                cultures=cultures,
                dominant={str(v): cid[dom[v]] for v in NODES},
                country_culture={str(v): {str(cid[c]): p for c, p in blend[v].items()} for v in NODES},
                conflicts=conflicts)
    with open(os.path.join(HERE, 'cultures.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    print(f'cultures.json : {Ncult} cultures, {len(conflicts)} paires en conflit', flush=True)
    sizes = sorted((len(members[c]) for c in cores), reverse=True)
    print('tailles (pays/culture):', sizes, flush=True)

    # ---- carte des cultures (par dominante) ----
    ccube = np.zeros((Ncult + 1, 3), np.float32); ccube[0] = R.OCEAN
    for c in cores:
        ccube[cid[c]] = cult_color[c]
    cult_labels = np.zeros_like(P.labels)
    for v in NODES:
        cult_labels[P.labels == v] = cid[dom[v]]
    for dest in (DOCS, SITE, HERE):
        R.choropleth(cult_labels, ccube, os.path.join(dest, 'carte_cultures.png'),
                     land=P.land, borders=True, coast=True)
    print('carte_cultures.png', flush=True)


if __name__ == '__main__':
    main()
