"""Etape 1ter — PAYS « facon Terre » (position LOGIQUE, ~90% accuracy).

Sur Terre, la carte politique suit l'HABITABILITE :
  * cotes/plaines temperees et tropicales humides = TRES peuplees -> beaucoup de PETITS pays
    (Europe, Asie du Sud-Est, cotes) ;
  * ceinture subtropicale ARIDE (deserts) = vide -> une poignee de pays GEANTS (Sahara :
    Algerie, Libye, Tchad, Niger... tous immenses) ;
  * interieurs FROIDS/subpolaires = clairsemes -> geants (Russie, Canada) ;
  * hautes montagnes et poles = peu divises.

On construit un champ d'HABITABILITE (climat par latitude + humidite/aridite + cotes + relief) qui
pilote (1) la DENSITE des graines (dense = habitable, clairseme = hostile) et (2) le placement des
GEANTS (dans les grands interieurs ARIDES ou FROIDS). Frontieres = Voronoi geodesique pondere sur
les cretes. PRESERVE les continents nettoyes. Rendu carte_pays en style planisphere 4k.
"""
import os, sys, json, numpy as np
from scipy import ndimage
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import render_pol as R

SEED = 314159265
DOCS = r'C:\Users\IgneeFleur\Documents\Github\fns-ttrpg\docs\assets\cartes'
SITE = r'C:\Users\IgneeFleur\Documents\Github\fns-ttrpg\site\assets\cartes'
TARGET_LO, TARGET_HI = 120, 195
KMTN = 9.0
N_SEEDS_AIM = 255
TOTAL_GIANTS = 12
GIANT_BONUS = [128, 118, 109, 101, 94, 87, 81, 75, 69, 64, 59, 54]
rng = np.random.default_rng(SEED)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0); return t * t * (3 - 2 * t)


def smooth_noise(shape, sig, so):
    r = np.random.default_rng(SEED * 3 + so)
    n = ndimage.gaussian_filter(r.standard_normal(shape).astype(np.float32), sigma=sig)
    return ((n - n.min()) / (np.ptp(n) + 1e-9)).astype(np.float32)


def habitability(land, elev, W, H):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    fy = yy / H
    lat = np.abs(fy - 0.5) / 0.5                                  # 0 equateur .. 1 pole
    temp_suit = np.exp(-((lat - 0.42) / 0.40) ** 2)              # optimum tempere, chute aux poles
    dc = ndimage.distance_transform_edt(land).astype(np.float32)  # distance a la cote (interieur)
    coast_moist = np.exp(-dc / (0.11 * W))
    trop = np.exp(-(lat / 0.18) ** 2)                            # pluies tropicales (equateur)
    dry_belt = np.exp(-((lat - 0.33) / 0.14) ** 2)              # ceinture subtropicale seche (~25 deg)
    moisture = np.clip(0.22 + 0.55 * coast_moist + 0.50 * trop - 0.55 * dry_belt * (1 - coast_moist), 0, 1)
    highland = np.clip((elev - 0.12) / 0.45, 0, 1)
    reg = smooth_noise((H, W), 0.06 * W, 17)                     # variation regionale douce
    Hab = temp_suit * (0.25 + 0.75 * moisture) * (1 - 0.72 * highland) * (0.75 + 0.5 * reg)
    Hab = np.where(land, Hab, 0.0).astype(np.float32)
    if land.any():
        v = Hab[land]; lo, hi = np.percentile(v, 2), np.percentile(v, 98)
        Hab = np.clip((Hab - lo) / max(hi - lo, 1e-6), 0.0, 1.0).astype(np.float32)
    return Hab, dc


def poisson_variable(land, rfield, cell):
    ys, xs = np.where(land); order = rng.permutation(len(ys))
    grid = {}; ay = []; ax = []; inv = 1.0 / cell
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
            ay.append(y); ax.append(x); grid.setdefault((gy, gx), []).append((y, x))
    return np.array(ay), np.array(ax)


def weighted_voronoi(land, pcost, seed_yx, bonus):
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
    S = Nl; seed_nodes = nid[seed_yx[0], seed_yx[1]].astype(np.int64)
    Bmax = float(np.max(bonus))
    srows = np.full(len(seed_nodes), S); scols = seed_nodes; swts = (Bmax - np.asarray(bonus, float))
    Rr = np.concatenate([rows, srows]); Cc = np.concatenate([cols, scols]); Wt = np.concatenate([wts, swts])
    G = coo_matrix((Wt, (Rr, Cc)), shape=(Nl + 1, Nl + 1)).tocsr()
    dist, pred = dijkstra(G, directed=False, indices=S, return_predecessors=True)
    par = pred.astype(np.int64); par[S] = S
    lab = np.zeros(Nl + 1, np.int32); lab[seed_nodes] = np.arange(1, len(seed_nodes) + 1)
    for _ in range(60):
        un = (lab == 0); un[S] = False
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


def merge_thin(labels, max_area=2200, keep_frac=0.24):
    """Fusionne les pays en LANIERE (1-2 px de large) : ils survivent au filtre d'aire mais
    s'affichent en traits parasites. Detecte par erosion (une laniere disparait a l'erosion)."""
    while True:
        did = False
        for l in [u for u in np.unique(labels) if u > 0]:
            m = labels == l; a = int(m.sum())
            if a == 0 or a > max_area:
                continue
            er = ndimage.binary_erosion(m, structure=np.ones((3, 3)))
            if er.sum() < keep_frac * a:                       # laniere
                nb = neighbors_of(labels, l)
                if nb:
                    labels[m] = max(nb, key=lambda k: nb[k]); did = True
        if not did:
            break
    uniq = [u for u in np.unique(labels) if u > 0]; remap = {0: 0}
    for i, u in enumerate(uniq, 1): remap[u] = i
    out = np.zeros_like(labels)
    for u, v in remap.items(): out[labels == u] = v
    return out, len(uniq)


def render_pays(labels, land, K):
    LAND = np.array([0.898, 0.878, 0.804], np.float32); OCE = np.array([0.800, 0.880, 0.930], np.float32)
    BORD = np.array([0.50, 0.45, 0.39], np.float32); COAS = np.array([0.40, 0.35, 0.30], np.float32)
    cube = np.zeros((K + 1, 3), np.float32); cube[0] = OCE
    for l in range(1, K + 1): cube[l] = LAND
    gk = dict(grid='#a9cbe0', frame='#6f93a8', ncols=8)
    for dest in (DOCS, SITE, HERE):
        R.choropleth(labels, cube, os.path.join(dest, 'carte_pays.png'), land=land, borders=True, coast=True,
                     sea_shade=False, ocean_rgb=OCE, coast_rgb=COAS, border_rgb=BORD,
                     thin=True, border_px=2, border_mix=0.55, grid_kw=gk, upscale=3, dpi=230)


def main():
    g = np.load(os.path.join(HERE, 'geo.npz'))
    land = g['land'].astype(bool); elev = g['elev'].astype(np.float32)
    prev = np.load(os.path.join(HERE, 'countries.npz'))
    cont = prev['cont'].astype(np.int32); ncont = int(prev['ncont'])
    H, W = land.shape
    print('terres', int(land.sum()), '| continents preserves =', ncont, flush=True)

    mtn = smoothstep(0.10, 0.55, np.where(land, elev, 0.0)).astype(np.float32)
    cnoise = smooth_noise((H, W), 0.055 * W, 5) - 0.5           # bruit LISSE (pas de canaux fins -> pas de tentacules)
    pcost = np.clip(1.0 + KMTN * mtn + 0.35 * cnoise, 0.45, None).astype(np.float32)

    Hab, dc = habitability(land, elev, W, H)
    print('habitabilite: mediane %.2f  (0=hostile,1=fertile)' % float(np.median(Hab[land])), flush=True)

    # densite : dense ou habitable, clairseme ou hostile (deserts/froid/montagnes)
    scale = 1.0; best = None
    for _ in range(9):
        rfield = (scale * (9.0 + 82.0 * (1.0 - Hab) ** 1.4)).astype(np.float32)
        sy, sx = poisson_variable(land, rfield, cell=float(np.ceil(rfield.max())))
        n = len(sy); print(f'  seeds={n} (scale={scale:.3f})', flush=True); best = (sy, sx)
        if N_SEEDS_AIM - 20 <= n <= N_SEEDS_AIM + 20: break
        scale *= (n / float(N_SEEDS_AIM)) ** 0.5
    sy, sx = best; nS = len(sy)

    interior = (dc[sy, sx] / (dc.max() + 1e-9)).astype(np.float64)
    hab_s = Hab[sy, sx].astype(np.float64)
    seed_cont = cont[sy, sx]
    bonus = 14.0 * interior
    contsize = {k: int((cont == k).sum()) for k in range(1, ncont + 1)}
    tot = sum(contsize.values())
    alloc = {k: max(0, int(round(TOTAL_GIANTS * contsize[k] / tot))) for k in contsize}
    # score de geant : grand interieur ET peu habitable (desert/froid) -> immense
    gscore = interior * (1.0 - hab_s) * np.sqrt([contsize[c] for c in seed_cont])
    giants = []
    for k in range(1, ncont + 1):
        idxk = [i for i in range(nS) if seed_cont[i] == k]
        idxk.sort(key=lambda i: -gscore[i])
        picked = []
        for i in idxk:
            if len(picked) >= alloc[k]: break
            if all((sy[i] - sy[j]) ** 2 + (sx[i] - sx[j]) ** 2 > (0.11 * W) ** 2 for j in picked):
                picked.append(i)
        giants += [(k, i) for i in picked]
    giants.sort(key=lambda ki: -gscore[ki[1]])
    for rank, (k, i) in enumerate(giants):
        bonus[i] = GIANT_BONUS[rank] if rank < len(GIANT_BONUS) else 52.0
    print(f'  geants places = {len(giants)} (alloc {alloc})', flush=True)

    labels = weighted_voronoi(land, pcost, (sy, sx), bonus)

    mean_area = land.sum() / max(1, nS); min_px = int(0.30 * mean_area); K = 0
    for _ in range(12):
        lab2, K = merge_small(labels.copy(), cont, min_px)
        print(f'  min_px={min_px} -> pays={K}', flush=True)
        if TARGET_LO <= K <= TARGET_HI:
            labels = lab2; break
        labels = lab2
        min_px = int(min_px * (1.3 if K > TARGET_HI else 0.72))
    labels, K = merge_thin(labels)                              # nettoie les lanieres
    print('  apres fusion lanieres -> pays =', K, flush=True)

    area = np.bincount(labels.ravel(), minlength=K + 1)
    coast_bnd = land ^ ndimage.binary_erosion(land, structure=np.ones((3, 3)))
    stats = []; cont_of = np.zeros(K + 1, np.int32)
    for l in range(1, K + 1):
        m = labels == l; ys, xs = np.where(m); cy, cx = ys.mean(), xs.mean()
        cont_of[l] = cont[int(round(cy)), int(round(cx))]
        cp = int((m & coast_bnd).sum())
        stats.append(dict(id=l, area=int(area[l]), cy=float(cy), cx=float(cx), fx=float(cx / W), fy=float(cy / H),
                          mean_elev=float(elev[m].mean()), max_elev=float(elev[m].max()),
                          coast_px=cp, coastal=bool(cp > 0.02 * m.sum()), continent=int(cont_of[l]),
                          habit=float(Hab[m].mean())))
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

    sizes = sorted(area[1:], reverse=True); tt = sum(sizes)
    print('PAYS =', K, flush=True)
    print('  top12 %terres :', [round(100 * s / tt, 1) for s in sizes[:12]], flush=True)
    print('  median px:', int(np.median(sizes)), ' max/median:', round(sizes[0] / max(1, np.median(sizes)), 1), flush=True)
    render_pays(labels, land, K)
    print('carte_pays.png (planisphere 4k)', flush=True)


if __name__ == '__main__':
    main()
