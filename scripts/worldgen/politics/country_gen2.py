"""Etape 1bis — PAYS avec DISTRIBUTION DE TAILLES REALISTE (dont pays GEANTS).

Correctif : l'ancienne generation avait une densite de graines ~uniforme -> pas de pays geants
(le plus grand ~3% des terres ; sur Terre la Russie ~11%, et le top 6 fait 5-11% chacun).
Ici on donne a chaque graine une PORTEE a queue lourde (weighted geodesic Voronoi) : une poignee
de graines d'INTERIEUR deviennent gigantesques (style Russie/USA/Canada), pendant que les cotes
restent morcelees. Resultat : geants + grands + moyens + petits + micro-etats.

Croissance = Voronoi geodesique PONDERE (cout=1+K*montagne, moins la portee de la graine),
resolu vite via une super-source (Dijkstra scipy) + remontee d'arbre vectorisee.
PRESERVE les continents nettoyes (charge cont depuis countries.npz, ne les recalcule pas,
ne re-rend PAS la carte des continents). Sorties : countries.npz / countries.json / carte_pays.png
"""
import os, sys, json, numpy as np
from scipy import ndimage
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import render_pol as R

SEED = 314159265
DOCS = r'C:\Users\IgneeFleur\Documents\Github\FNS-TTRPG-RULES\docs\assets\cartes'
SITE = r'C:\Users\IgneeFleur\Documents\Github\FNS-TTRPG-RULES\site\assets\cartes'
TARGET_LO, TARGET_HI = 120, 195
KMTN = 9.0
N_SEEDS_AIM = 210
TOTAL_GIANTS = 11
GIANT_BONUS = [175, 158, 143, 130, 118, 107, 97, 88, 80, 72, 65]   # portee des geants (px-equiv)
rng = np.random.default_rng(SEED)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0); return t * t * (3 - 2 * t)


def smooth_noise(shape, sig, so):
    r = np.random.default_rng(SEED * 3 + so)
    n = ndimage.gaussian_filter(r.standard_normal(shape).astype(np.float32), sigma=sig)
    return ((n - n.min()) / (np.ptp(n) + 1e-9)).astype(np.float32)


def poisson_variable(land, rfield, cell):
    ys, xs = np.where(land); order = rng.permutation(len(ys))
    grid = {}; acc_y = []; acc_x = []; inv = 1.0 / cell
    for i in order:
        y = int(ys[i]); x = int(xs[i]); r = float(rfield[y, x]); r2 = r * r
        gy = int(y * inv); gx = int(x * inv); ok = True
        for ddy in (-1, 0, 1):
            for ddx in (-1, 0, 1):
                for (py, px) in grid.get((gy + ddy, gx + ddx), ()):
                    if (py - y) ** 2 + (px - x) ** 2 < r2:
                        ok = False; break
                if not ok: break
            if not ok: break
        if ok:
            acc_y.append(y); acc_x.append(x); grid.setdefault((gy, gx), []).append((y, x))
    return np.array(acc_y), np.array(acc_x)


def weighted_voronoi(land, pcost, seed_yx, bonus):
    """Voronoi geodesique PONDERE : pixel -> argmin(geodesic - bonus_graine). Via super-source."""
    H, W = land.shape
    nid = -np.ones((H, W), np.int64); Nl = int(land.sum()); nid[land] = np.arange(Nl)
    rows = []; cols = []; wts = []
    for dy, dx, wb in ((0, 1, 1.0), (1, 0, 1.0), (1, 1, 1.4142), (1, -1, 1.4142)):
        if dy == 0:
            la, lb = land[:, :-1], land[:, 1:]; ca, cb = pcost[:, :-1], pcost[:, 1:]; na, nb = nid[:, :-1], nid[:, 1:]
        elif dx == 0:
            la, lb = land[:-1, :], land[1:, :]; ca, cb = pcost[:-1, :], pcost[1:, :]; na, nb = nid[:-1, :], nid[1:, :]
        elif dx == 1:
            la, lb = land[:-1, :-1], land[1:, 1:]; ca, cb = pcost[:-1, :-1], pcost[1:, 1:]; na, nb = nid[:-1, :-1], nid[1:, 1:]
        else:
            la, lb = land[:-1, 1:], land[1:, :-1]; ca, cb = pcost[:-1, 1:], pcost[1:, :-1]; na, nb = nid[:-1, 1:], nid[1:, :-1]
        m = la & lb
        rows.append(na[m]); cols.append(nb[m]); wts.append(wb * 0.5 * (ca[m] + cb[m]))
    rows = np.concatenate(rows); cols = np.concatenate(cols); wts = np.concatenate(wts).astype(np.float64)
    S = Nl                                                   # super-source
    seed_nodes = nid[seed_yx[0], seed_yx[1]].astype(np.int64)
    Bmax = float(np.max(bonus))
    srows = np.full(len(seed_nodes), S); scols = seed_nodes; swts = (Bmax - np.asarray(bonus, float))
    R_ = np.concatenate([rows, srows]); C_ = np.concatenate([cols, scols]); Wt = np.concatenate([wts, swts])
    G = coo_matrix((Wt, (R_, C_)), shape=(Nl + 1, Nl + 1)).tocsr()
    dist, pred = dijkstra(G, directed=False, indices=S, return_predecessors=True)
    par = pred.astype(np.int64); par[S] = S
    lab = np.zeros(Nl + 1, np.int32)
    lab[seed_nodes] = np.arange(1, len(seed_nodes) + 1)      # seeds labellisees
    # remontee d'arbre (pointer jumping) : chaque noeud herite du label de sa graine ancetre
    for _ in range(60):
        un = (lab == 0)
        un[S] = False
        if not un.any(): break
        lab[un] = lab[par[un]]; par = par[par]
    out = np.zeros((H, W), np.int32); out[land] = lab[:Nl]
    return out


def neighbors_of(labels, l):
    m = labels == l
    d = ndimage.binary_dilation(m, structure=np.ones((3, 3))) & ~m
    vals = labels[d]; vals = vals[vals > 0]
    if vals.size == 0: return {}
    u, c = np.unique(vals, return_counts=True); return dict(zip(u.tolist(), c.tolist()))


def merge_small(labels, cont, min_px):
    while True:
        area = np.bincount(labels.ravel()); K = len(area) - 1
        cand = [l for l in range(1, K + 1) if 0 < area[l] < min_px]
        if not cand: break
        cand.sort(key=lambda l: area[l]); did = False
        for l in cand:
            nb = neighbors_of(labels, l)
            if not nb: continue
            cy, cx = ndimage.center_of_mass(labels == l)
            mycont = cont[int(round(cy)), int(round(cx))] if np.isfinite(cy) else 0
            def keyf(it):
                nl, sh = it; nyx = np.argwhere(labels == nl)[0]
                return (1 if cont[nyx[0], nyx[1]] == mycont else 0, sh)
            labels[labels == l] = max(nb.items(), key=keyf)[0]; did = True; break
        if not did: break
    uniq = [u for u in np.unique(labels) if u > 0]; remap = {0: 0}
    for i, u in enumerate(uniq, 1): remap[u] = i
    out = np.zeros_like(labels)
    for u, v in remap.items(): out[labels == u] = v
    return out, len(uniq)


def main():
    g = np.load(os.path.join(HERE, 'geo.npz'))
    land = g['land'].astype(bool); elev = g['elev'].astype(np.float32)
    prev = np.load(os.path.join(HERE, 'countries.npz'))
    cont = prev['cont'].astype(np.int32); ncont = int(prev['ncont'])   # continents PRESERVES
    H, W = land.shape
    print('terres', int(land.sum()), '| continents preserves =', ncont, flush=True)

    mtn = smoothstep(0.10, 0.55, np.where(land, elev, 0.0)).astype(np.float32)
    cnoise = smooth_noise((H, W), 0.02 * W, 5) - 0.5
    pcost = np.clip(1.0 + KMTN * mtn + 0.6 * cnoise, 0.35, None).astype(np.float32)

    dc_land = ndimage.distance_transform_edt(land).astype(np.float32)
    coast_prox = np.exp(-dc_land / (0.05 * W)).astype(np.float32)
    low = smooth_noise((H, W), 0.09 * W, 9)
    # densite plus contrastee : cotes tres denses, interieurs plus clairsemes qu'avant
    frag = np.clip(0.32 + 0.55 * coast_prox + 0.5 * (low - 0.5) + 0.18 * mtn, 0.0, 1.0).astype(np.float32)

    # calibre le rayon (portee plus large en interieur -> deja plus de gros pays)
    scale = 1.0; best = None
    for _ in range(9):
        rfield = (scale * (11.0 + 70.0 * (1.0 - frag) ** 1.5)).astype(np.float32)
        sy, sx = poisson_variable(land, rfield, cell=float(np.ceil(rfield.max())))
        n = len(sy); print(f'  seeds={n} (scale={scale:.3f})', flush=True); best = (sy, sx)
        if N_SEEDS_AIM - 18 <= n <= N_SEEDS_AIM + 18: break
        scale *= (n / float(N_SEEDS_AIM)) ** 0.5
    sy, sx = best; nS = len(sy)

    # --- BONUS de portee : base interieur + GEANTS repartis par continent ---
    interior = (dc_land[sy, sx] / (dc_land.max() + 1e-9)).astype(np.float64)
    seed_cont = cont[sy, sx]
    bonus = 14.0 * interior                                  # les graines d'interieur un peu plus grandes
    contsize = {k: int((cont == k).sum()) for k in range(1, ncont + 1)}
    total = sum(contsize.values())
    alloc = {k: max(0, int(round(TOTAL_GIANTS * contsize[k] / total))) for k in contsize}
    giants = []
    for k in range(1, ncont + 1):
        idxk = [i for i in range(nS) if seed_cont[i] == k]
        idxk.sort(key=lambda i: -interior[i])               # plus interieur d'abord
        picked = []
        for i in idxk:
            if len(picked) >= alloc[k]: break
            if all((sy[i] - sy[j]) ** 2 + (sx[i] - sx[j]) ** 2 > (0.12 * W) ** 2 for j in picked):
                picked.append(i)
        giants += [(k, i) for i in picked]
    # les plus gros geants sur les plus gros continents
    giants.sort(key=lambda ki: (-contsize[ki[0]], -interior[ki[1]]))
    for rank, (k, i) in enumerate(giants):
        bonus[i] = GIANT_BONUS[rank] if rank < len(GIANT_BONUS) else 60.0
    print(f'  geants places = {len(giants)} (alloc par continent {alloc})', flush=True)

    labels = weighted_voronoi(land, pcost, (sy, sx), bonus)

    mean_area = land.sum() / max(1, nS); min_px = int(0.30 * mean_area); K = 0
    for _ in range(12):
        lab2, K = merge_small(labels.copy(), cont, min_px)
        print(f'  min_px={min_px} -> pays={K}', flush=True)
        if TARGET_LO <= K <= TARGET_HI:
            labels = lab2; break
        labels = lab2
        min_px = int(min_px * (1.3 if K > TARGET_HI else 0.72))
    K = int(labels.max())

    # stats + adjacence
    area = np.bincount(labels.ravel(), minlength=K + 1)
    coast_bnd = land ^ ndimage.binary_erosion(land, structure=np.ones((3, 3)))
    stats = []; cont_of = np.zeros(K + 1, np.int32)
    for l in range(1, K + 1):
        m = labels == l; ys, xs = np.where(m); cy, cx = ys.mean(), xs.mean()
        cont_of[l] = cont[int(round(cy)), int(round(cx))]
        coastpx = int((m & coast_bnd).sum())
        stats.append(dict(id=l, area=int(area[l]), cy=float(cy), cx=float(cx), fx=float(cx / W), fy=float(cy / H),
                          mean_elev=float(elev[m].mean()), max_elev=float(elev[m].max()),
                          coast_px=coastpx, coastal=bool(coastpx > 0.02 * m.sum()), continent=int(cont_of[l])))
    adj = {}
    for dy, dx in ((1, 0), (0, 1)):
        a = labels[:-1, :] if dy else labels[:, :-1]; b = labels[1:, :] if dy else labels[:, 1:]
        m = (a != b) & (a > 0) & (b > 0)
        for i, j in zip(a[m].tolist(), b[m].tolist()):
            key = (min(i, j), max(i, j)); adj[key] = adj.get(key, 0) + 1
    adj_list = {}
    for (i, j), nn in adj.items():
        adj_list.setdefault(i, {})[j] = nn; adj_list.setdefault(j, {})[i] = nn

    np.savez_compressed(os.path.join(HERE, 'countries.npz'), labels=labels.astype(np.int16),
                        cont=cont.astype(np.int16), cont_of=cont_of, K=K, ncont=ncont)
    with open(os.path.join(HERE, 'countries.json'), 'w', encoding='utf-8') as f:
        json.dump(dict(K=K, ncont=ncont, stats=stats, adj={str(k): v for k, v in adj_list.items()}), f)

    sizes = sorted(area[1:], reverse=True); tot = sum(sizes)
    print('PAYS =', K, flush=True)
    print('  top10 %terres :', [round(100 * s / tot, 1) for s in sizes[:10]], flush=True)
    print('  median px:', int(np.median(sizes)), ' max/median:', round(sizes[0] / max(1, np.median(sizes)), 1), flush=True)

    # carte PAYS (ne touche PAS la carte des continents)
    pal = R.make_palette(30, sat=0.44, val=0.93, seed=7)
    col = R.spread_colors(adj_list, K, len(pal), seed=SEED % 100000)
    pcube = np.zeros((K + 1, 3), np.float32); pcube[0] = R.OCEAN
    for l in range(1, K + 1): pcube[l] = pal[col.get(l, l % len(pal))]
    for dest in (DOCS, SITE, HERE):
        R.choropleth(labels, pcube, os.path.join(dest, 'carte_pays.png'), land=land, borders=True, coast=True)
    print('carte_pays.png', flush=True)


if __name__ == '__main__':
    main()
