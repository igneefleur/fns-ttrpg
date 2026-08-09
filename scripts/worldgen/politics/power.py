# -*- coding: utf-8 -*-
"""Etape 5 — PUISSANCES MONDIALES (calcul coherent, hard + soft power).

HARD power : economie (population x technologie) + capacite militaire + masse territoriale.
  population ~ aire x habitabilite (tempere, cotier, basses terres, pas polaire).
  technologie ~ developpement (climat tempere, cotes, connectivite, urbanisation culturelle).
SOFT power : rayonnement CULTUREL (nb de pays partageant sa culture), centralite RELIGIEUSE
  (foyer d'une grande religion), COMMERCE (connectivite + cotes), PROJECTION (liens maritimes
  vers d'AUTRES continents).
Puissance = 0.6 hard + 0.4 soft, normalisee 0..100. Sortie : power.json + carte_puissance.png
"""
import os, sys, json, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import polgraph, render_pol as R
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
from matplotlib import cm
from scipy import ndimage

DOCS = r'C:\Users\IgneeFleur\Documents\Github\FNS-TTRPG-RULES\docs\assets\cartes'
SITE = r'C:\Users\IgneeFleur\Documents\Github\FNS-TTRPG-RULES\site\assets\cartes'
P = polgraph.load(); K = P.K; NODES = list(range(1, K + 1))
with open(os.path.join(HERE, 'cultures.json'), encoding='utf-8') as f:
    CJ = json.load(f)
with open(os.path.join(HERE, 'religions.json'), encoding='utf-8') as f:
    RJ = json.load(f)
with open(os.path.join(HERE, 'country_names.json'), encoding='utf-8') as f:
    NM = json.load(f)
DOM_CULT = {int(k): v for k, v in CJ['dominant'].items()}
CULT_ARCH = {c['id']: c['archetype'] for c in CJ['cultures']}
CULT_SIZE = {c['id']: c['size'] for c in CJ['cultures']}
REL_CORE = {r['core_country']: r['id'] for r in RJ['religions'] if r['core_country'] > 0}
REL_MEMBERS = {r['id']: len(r['members']) for r in RJ['religions']}
DOM_REL = {int(k): v for k, v in RJ['dominant'].items()}
NAMES = {int(k): v for k, v in NM['names'].items()}
LONG = {int(k): v for k, v in NM['longforms'].items()}
URBAN = {'maritime': 1.0, 'latin': 0.85, 'sinitic': 0.9, 'nipponic': 0.9, 'persic': 0.6, 'indic': 0.55,
         'boreal': 0.7, 'gaelic': 0.6, 'steppe': 0.35, 'desert': 0.3, 'highland': 0.35, 'equator': 0.3,
         'savanna': 0.3, 'tundra': 0.3}


def z01(x):
    x = np.asarray(x, float); lo, hi = x.min(), x.max()
    return (x - lo) / (hi - lo + 1e-9)


def main():
    a = P.area
    idx = np.arange(1, K + 1)
    top_rel = sorted(REL_MEMBERS.items(), key=lambda kv: -kv[1])[:3]
    top_rel_ids = {r for r, _ in top_rel}

    temperate = np.array([np.clip(1 - abs(abs(P.fy[i] - 0.5) - 0.24) / 0.24, 0, 1) for i in range(K)])
    coastf = np.array([np.clip(P.coast_px[i] / (2.5 * np.sqrt(max(a[i], 1))), 0, 1) for i in range(K)])
    lowland = np.array([1 - np.clip((P.mean_elev[i] - 0.10) / 0.40, 0, 1) for i in range(K)])
    coldx = np.array([np.clip((abs(P.fy[i] - 0.5) - 0.20) / 0.30, 0, 1) for i in range(K)])
    conn = np.array([len(P.adj.get(i + 1, {})) + len(P.sea.get(i + 1, {})) for i in range(K)], float)
    urb = np.array([URBAN.get(CULT_ARCH.get(DOM_CULT[i + 1], ''), 0.4) for i in range(K)])

    habit = np.clip(0.18 + 0.5 * temperate + 0.28 * coastf + 0.28 * lowland - 0.5 * coldx, 0.05, 1.2)
    pop = a * habit                                   # population relative
    dev = np.clip(0.28 * temperate + 0.26 * coastf + 0.16 * z01(conn) + 0.10 * lowland + 0.40 * urb, 0, 1.4)
    dev = z01(dev); tech = 0.45 + 0.55 * dev
    econ = pop * tech
    mil = (pop ** 0.6) * (0.5 + 0.9 * tech)

    # cross-continent maritime projection
    crosscont = np.zeros(K)
    for i in range(K):
        ci = P.continent[i]
        for j in P.sea.get(i + 1, {}):
            if P.continent[j - 1] != ci:
                crosscont[i] += 1

    cult_reach = np.array([CULT_SIZE.get(DOM_CULT[i + 1], 1) for i in range(K)], float)
    relig_c = np.zeros(K)
    for i in range(K):
        cc = i + 1
        if cc in REL_CORE:
            relig_c[i] = 1.0
        elif DOM_REL[cc] in top_rel_ids:
            relig_c[i] = 0.4
        else:
            relig_c[i] = 0.15

    hard = 0.55 * z01(econ) + 0.30 * z01(mil) + 0.15 * z01(a)
    soft = tech * (0.35 + 0.9 * z01(cult_reach) + 0.5 * relig_c + 0.5 * z01(conn) + 0.6 * z01(crosscont))
    hard_n = z01(hard); soft_n = z01(soft)
    power = 0.6 * hard_n + 0.4 * soft_n
    power = power / power.max() * 100.0

    order = np.argsort(power)[::-1]
    rows = []
    for rank, ii in enumerate(order, 1):
        cc = ii + 1
        rows.append(dict(rank=rank, country=int(cc), name=NAMES[cc], long=LONG[cc],
                         power=round(float(power[ii]), 1), hard=round(float(hard_n[ii]), 3),
                         soft=round(float(soft_n[ii]), 3), pop=round(float(pop[ii]), 1),
                         tech=round(float(tech[ii]), 3), culture=DOM_CULT[cc], continent=int(P.continent[ii])))
    with open(os.path.join(HERE, 'power.json'), 'w', encoding='utf-8') as f:
        json.dump(dict(ranking=rows), f, ensure_ascii=False)
    print('=== TOP 12 PUISSANCES ===', flush=True)
    for r in rows[:12]:
        print(f'  {r["rank"]:2d}. {r["long"]:34s} P={r["power"]:5.1f}  hard={r["hard"]:.2f} soft={r["soft"]:.2f}', flush=True)

    # ---- carte : heat de puissance + top labels ----
    cmap = plt.get_cmap('YlOrRd')
    pcube = np.zeros((K + 1, 3), np.float32); pcube[0] = R.OCEAN
    for i in range(K):
        val = 0.12 + 0.86 * (power[i] / 100.0) ** 0.85
        pcube[i + 1] = np.array(cmap(val)[:3], np.float32)
    g = R.geom(); xmin, xmax, ymin, ymax = g['extent']

    def anchor(mask):
        ys, xs = np.where(mask); y0, x0 = ys.min(), xs.min()
        sub = mask[y0:ys.max() + 1, x0:xs.max() + 1]
        dt = ndimage.distance_transform_edt(sub); iy, ix = np.unravel_index(np.argmax(dt), dt.shape)
        return y0 + iy, x0 + ix

    top_ids = [order[i] + 1 for i in range(14)]

    def draw(ax, gg):
        for rk, ii in enumerate(order[:14], 1):
            cc = ii + 1; cy, cx = anchor(P.labels == cc)
            xd = xmin + (cx + 0.5) / P.W * (xmax - xmin); yd = ymax - (cy + 0.5) / P.H * (ymax - ymin)
            t = ax.text(xd, yd, f'{rk}. {NAMES[cc]}', ha='center', va='center', fontsize=9.5,
                        color='#2a0a0a', fontweight='bold', zorder=9, fontfamily='serif')
            t.set_path_effects([pe.withStroke(linewidth=2.4, foreground='white')])

    for dest in (DOCS, SITE, HERE):
        R.choropleth(np.where(P.land, P.labels, 0), pcube, os.path.join(dest, 'carte_puissance.png'),
                     land=P.land, borders=True, coast=True, extra=draw)
    print('carte_puissance.png', flush=True)


if __name__ == '__main__':
    main()
