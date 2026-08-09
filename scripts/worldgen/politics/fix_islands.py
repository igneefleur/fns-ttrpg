# -*- coding: utf-8 -*-
"""Retouche : les iles coupees en deux par la ligne de scission rouge/violet sont
RATTACHEES ENTIEREMENT au continent violet (id 5). On ne touche qu'aux petites masses
(pas au continent principal). Re-rend la carte des continents.
"""
import os, sys, json, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import render_pol as R
from scipy import ndimage

DOCS = r'C:\Users\IgneeFleur\Documents\Github\fns-ttrpg-rules\docs\assets\cartes'
SITE = r'C:\Users\IgneeFleur\Documents\Github\fns-ttrpg-rules\site\assets\cartes'
VIOLET = 5
CONT_COLORS = np.array([
    [0.86, 0.50, 0.42], [0.55, 0.72, 0.45], [0.45, 0.62, 0.80], [0.90, 0.78, 0.42],
    [0.68, 0.52, 0.75], [0.42, 0.75, 0.72], [0.85, 0.60, 0.72], [0.70, 0.70, 0.50]], np.float32)


def main():
    g = np.load(os.path.join(HERE, 'geo.npz'))
    c = np.load(os.path.join(HERE, 'countries.npz'))
    land = g['land'].astype(bool)
    labels = c['labels'].astype(np.int32); cont = c['cont'].astype(np.int32)
    cont_of = c['cont_of'].astype(np.int32); K = int(c['K']); ncont = int(c['ncont'])

    comp, n = ndimage.label(land, structure=np.ones((3, 3)))
    sizes = np.bincount(comp.ravel()); sizes[0] = 0
    main = int(np.argmax(sizes))                         # continent principal = plus grande masse
    cont2 = cont.copy(); changed = 0
    for k in range(1, n + 1):
        if k == main:
            continue
        m = comp == k
        has_violet = np.any(cont2[m] == VIOLET)
        has_red = np.any(cont2[m] == 1)
        if has_violet and has_red:                       # ile coupee en deux -> tout en violet
            cont2[m & land] = VIOLET; changed += 1
    print(f'iles rattachees au violet : {changed}', flush=True)

    # met a jour cont_of + countries.json
    with open(os.path.join(HERE, 'countries.json'), encoding='utf-8') as f:
        cj = json.load(f)
    cont_of2 = cont_of.copy()
    for s in cj['stats']:
        cy, cx = int(round(s['cy'])), int(round(s['cx']))
        s['continent'] = int(cont2[cy, cx]); cont_of2[s['id']] = int(cont2[cy, cx])
    ncont2 = int(cont2.max())
    np.savez_compressed(os.path.join(HERE, 'countries.npz'), labels=labels.astype(np.int16),
                        cont=cont2.astype(np.int16), cont_of=cont_of2.astype(np.int32), K=K, ncont=ncont2)
    with open(os.path.join(HERE, 'countries.json'), 'w', encoding='utf-8') as f:
        json.dump(cj, f)

    ccube = np.zeros((ncont2 + 1, 3), np.float32); ccube[0] = R.OCEAN
    for kk in range(1, ncont2 + 1):
        ccube[kk] = CONT_COLORS[(kk - 1) % len(CONT_COLORS)]
    for dest in (DOCS, SITE, HERE):
        R.choropleth(cont2, ccube, os.path.join(dest, 'carte_continents.png'),
                     land=land, borders=False, coast=True)
    print('carte_continents.png re-rendue', flush=True)


if __name__ == '__main__':
    main()
