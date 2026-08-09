"""Etape 1 — CONTINENTS + PAYS (generation procedurale facon Terre).

Logique terrestre visee (~80%) :
  * frontieres qui SUIVENT le relief : traverser une chaine de montagnes coute cher
    -> les frontieres se posent sur les cretes (Andes=Chili/Argentine, Himalaya, Alpes...).
  * cotes = frontieres naturelles ; interieurs plats -> frontieres ~ geodesiques (droites).
  * tailles TRES inegales : semis de graines a DENSITE VARIABLE (dense sur les cotes /
    zones fragmentees facon Europe, clairseme dans les grands interieurs facon Russie/Sahara).
  * Voronoi GEODESIQUE (Dijkstra multi-source, cout = 1 + K*montagne) -> partition contigue.
  * fusion des lambeaux trop petits -> 100 a 200 pays.

Sorties : countries.npz (carte de labels + continent par label) et countries.json (stats + adjacence).
Cartes : carte_continents.png, carte_pays.png (coloriees, sans noms).
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
TARGET_LO, TARGET_HI = 110, 190          # nombre final de pays vise
KMTN = 9.0                               # cout de traversee des montagnes (frontieres sur cretes)
SEA_BRIDGE = 0.012                       # pont maritime pour regrouper iles proches en continents

rng = np.random.default_rng(SEED)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0); return t * t * (3 - 2 * t)


def smooth_noise(shape, sig, so):
    r = np.random.default_rng(SEED * 3 + so)
    n = ndimage.gaussian_filter(r.standard_normal(shape).astype(np.float32), sigma=sig)
    return ((n - n.min()) / (np.ptp(n) + 1e-9)).astype(np.float32)


def load_geo():
    d = np.load(os.path.join(HERE, 'geo.npz'))
    return d['land'].astype(bool), d['elev'].astype(np.float32), d['plate'].astype(np.int32), float(d['sea'])


CONT_MIN = 0.006          # aire minimale (fraction des terres) pour etre un continent MAJEUR


def continents_of(land):
    """Continents = grandes masses de terre ; les iles s'attachent au continent MAJEUR le plus proche.
    (Pas de pont maritime global : on ne fusionne pas deux gros continents separes par un detroit d'iles.)"""
    lab, n = ndimage.label(land, structure=np.ones((3, 3)))
    if n == 0:
        return np.zeros_like(land, np.int32), 0
    areas = np.bincount(lab.ravel())[1:]                       # aire label 1..n
    total = float(land.sum())
    major_ids = [i + 1 for i in range(n) if areas[i] >= CONT_MIN * total]
    if not major_ids:
        major_ids = [int(np.argmax(areas)) + 1]
    major_mask = np.isin(lab, major_ids)
    idx = ndimage.distance_transform_edt(~major_mask, return_indices=True)[1]   # index du pixel MAJEUR le + proche
    nearest = lab[idx[0], idx[1]]                              # label du continent majeur le + proche
    cont_raw = np.where(land, nearest, 0).astype(np.int32)
    uids = [u for u in np.unique(cont_raw) if u > 0]
    order = sorted(uids, key=lambda u: -areas[u - 1])          # renumerote par aire decroissante
    remap = {0: 0}
    for newi, old in enumerate(order, 1):
        remap[old] = newi
    cont = np.zeros_like(cont_raw)
    for old, new in remap.items():
        cont[cont_raw == old] = new
    return cont, len(order)


def poisson_variable(land, rfield, cell):
    ys, xs = np.where(land)
    order = rng.permutation(len(ys))
    grid = {}; acc_y = []; acc_x = []
    inv = 1.0 / cell
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


def geodesic_voronoi(land, pcost, seed_yx):
    """Voronoi geodesique multi-source (Dijkstra) : chaque pixel -> graine la plus proche en COUT."""
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
    G = coo_matrix((wts, (rows, cols)), shape=(Nl, Nl)).tocsr()
    seed_nodes = nid[seed_yx[0], seed_yx[1]]
    dist, pred, sources = dijkstra(G, directed=False, indices=seed_nodes, min_only=True, return_predecessors=True)
    node2seed = {int(sn): k + 1 for k, sn in enumerate(seed_nodes)}   # label 1..S
    lab = np.zeros((H, W), np.int32)
    src_lab = np.array([node2seed.get(int(s), 0) for s in sources], np.int32)
    lab[land] = src_lab
    return lab


def neighbors_of(labels, l):
    m = labels == l
    d = ndimage.binary_dilation(m, structure=np.ones((3, 3))) & ~m
    vals = labels[d]
    vals = vals[vals > 0]
    if vals.size == 0:
        return {}
    u, c = np.unique(vals, return_counts=True)
    return dict(zip(u.tolist(), c.tolist()))


def merge_small(labels, cont, min_px):
    while True:
        area = np.bincount(labels.ravel())
        K = len(area) - 1
        cand = [l for l in range(1, K + 1) if 0 < area[l] < min_px]
        if not cand:
            break
        cand.sort(key=lambda l: area[l])
        merged_any = False
        for l in cand:
            nb = neighbors_of(labels, l)
            if not nb:
                continue
            # prefere un voisin du meme continent, sinon le plus grande frontiere
            cy, cx = ndimage.center_of_mass(labels == l)
            my_cont = cont[int(round(cy)), int(round(cx))] if np.isfinite(cy) else 0
            def keyf(item):
                nl, shared = item
                nyx = np.argwhere(labels == nl)[0]
                same = 1 if cont[nyx[0], nyx[1]] == my_cont else 0
                return (same, shared)
            target = max(nb.items(), key=keyf)[0]
            labels[labels == l] = target
            merged_any = True
            break
        if not merged_any:
            break
    # relabel contigu 1..K'
    uniq = [u for u in np.unique(labels) if u > 0]
    remap = {0: 0}
    for i, u in enumerate(uniq, 1):
        remap[u] = i
    out = np.zeros_like(labels)
    for u, v in remap.items():
        out[labels == u] = v
    return out, len(uniq)


def main():
    land, elev, plate, sea = load_geo()
    H, W = land.shape
    print('geo', land.shape, 'terres', int(land.sum()), flush=True)
    cont, ncont = continents_of(land)
    print('continents', ncont, flush=True)

    mtn = smoothstep(0.10, 0.55, np.where(land, elev, 0.0)).astype(np.float32)
    cnoise = smooth_noise((H, W), 0.02 * W, 5) - 0.5
    pcost = (1.0 + KMTN * mtn + 0.6 * cnoise).astype(np.float32)
    pcost = np.clip(pcost, 0.35, None)

    # champ de FRAGMENTATION : cotes + regionale -> densite de graines variable
    dc_land = ndimage.distance_transform_edt(land).astype(np.float32)
    coast_prox = np.exp(-dc_land / (0.05 * W)).astype(np.float32)
    low = smooth_noise((H, W), 0.09 * W, 9)
    frag = np.clip(0.30 + 0.55 * coast_prox + 0.45 * (low - 0.5) + 0.18 * mtn, 0.0, 1.0).astype(np.float32)

    # calibre le rayon pour viser ~185 graines (avant fusion)
    scale = 1.0; best = None
    for _ in range(9):
        rfield = (scale * (12.0 + 46.0 * (1.0 - frag))).astype(np.float32)
        sy, sx = poisson_variable(land, rfield, cell=float(np.ceil(rfield.max())))
        n = len(sy)
        print(f'  seeds={n} (scale={scale:.3f})', flush=True)
        best = (sy, sx)
        if 170 <= n <= 205:
            break
        scale *= (n / 188.0) ** 0.5
    sy, sx = best
    labels = geodesic_voronoi(land, pcost, (sy, sx))

    # fusion des petits : calibre min_px pour finir dans [TARGET_LO,TARGET_HI]
    mean_area = land.sum() / max(1, len(sy))
    min_px = int(0.30 * mean_area); K = len(sy)
    for _ in range(10):
        lab2, K = merge_small(labels.copy(), cont, min_px)
        print(f'  min_px={min_px} -> pays={K}', flush=True)
        if TARGET_LO <= K <= TARGET_HI:
            labels = lab2; break
        labels = lab2
        if K > TARGET_HI:
            min_px = int(min_px * 1.35)
        else:
            min_px = int(min_px * 0.7)
        labels = geodesic_voronoi(land, pcost, (sy, sx))  # repart de la partition brute
    K = int(labels.max())
    print('PAYS =', K, flush=True)

    # stats + adjacence
    area = np.bincount(labels.ravel(), minlength=K + 1)
    stats = []
    cont_of = np.zeros(K + 1, np.int32)
    coast_bnd = land ^ ndimage.binary_erosion(land, structure=np.ones((3, 3)))
    for l in range(1, K + 1):
        m = labels == l
        ys, xs = np.where(m)
        cy, cx = ys.mean(), xs.mean()
        cont_of[l] = cont[int(round(cy)), int(round(cx))]
        coastpx = int((m & coast_bnd).sum())
        stats.append(dict(id=l, area=int(area[l]), cy=float(cy), cx=float(cx),
                          fx=float(cx / W), fy=float(cy / H),
                          mean_elev=float(elev[m].mean()), max_elev=float(elev[m].max()),
                          coast_px=coastpx, coastal=bool(coastpx > 0.02 * m.sum()),
                          continent=int(cont_of[l])))
    # adjacence (4-voisinage) + longueurs partagees
    adj = {}
    for dy, dx in ((1, 0), (0, 1)):
        a = labels[:-1, :] if dy else labels[:, :-1]
        b = labels[1:, :] if dy else labels[:, 1:]
        m = (a != b) & (a > 0) & (b > 0)
        pa = a[m]; pb = b[m]
        for i, j in zip(pa.tolist(), pb.tolist()):
            key = (min(i, j), max(i, j))
            adj[key] = adj.get(key, 0) + 1
    adj_list = {}
    for (i, j), n in adj.items():
        adj_list.setdefault(i, {})[j] = n
        adj_list.setdefault(j, {})[i] = n

    np.savez_compressed(os.path.join(HERE, 'countries.npz'), labels=labels.astype(np.int16),
                        cont=cont.astype(np.int16), cont_of=cont_of, K=K, ncont=ncont)
    with open(os.path.join(HERE, 'countries.json'), 'w', encoding='utf-8') as f:
        json.dump(dict(K=K, ncont=ncont, stats=stats,
                       adj={str(k): v for k, v in adj_list.items()}), f)
    print('countries.npz / countries.json ecrits', flush=True)

    # ---- carte CONTINENTS (couleurs fortes et distinctes) ----
    CONT_COLORS = np.array([
        [0.86, 0.50, 0.42], [0.55, 0.72, 0.45], [0.45, 0.62, 0.80], [0.90, 0.78, 0.42],
        [0.68, 0.52, 0.75], [0.42, 0.75, 0.72], [0.85, 0.60, 0.72], [0.70, 0.70, 0.50],
        [0.60, 0.60, 0.62], [0.80, 0.68, 0.50]], np.float32)
    ccube = np.zeros((ncont + 1, 3), np.float32); ccube[0] = R.OCEAN
    for c in range(1, ncont + 1):
        ccube[c] = CONT_COLORS[(c - 1) % len(CONT_COLORS)]
    for dest in (DOCS, SITE, HERE):
        os.makedirs(dest, exist_ok=True)
        R.choropleth(cont, ccube, os.path.join(dest, 'carte_continents.png'), land=land, borders=False, coast=True)
    print('carte_continents.png', flush=True)

    # ---- carte PAYS (coloriage etale sur toute la palette, voisins distincts) ----
    pal = R.make_palette(30, sat=0.44, val=0.93, seed=7)
    col = R.spread_colors(adj_list, K, len(pal), seed=SEED % 100000)
    pcube = np.zeros((K + 1, 3), np.float32); pcube[0] = R.OCEAN
    for l in range(1, K + 1):
        pcube[l] = pal[col.get(l, l % len(pal))]
    for dest in (DOCS, SITE, HERE):
        R.choropleth(labels, pcube, os.path.join(dest, 'carte_pays.png'), land=land, borders=True, coast=True)
    print('carte_pays.png', flush=True)


if __name__ == '__main__':
    main()
