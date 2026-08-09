# -*- coding: utf-8 -*-
"""Retouche : SEPARE le continent rouge (id 1) en DEUX au niveau de l'isthme etroit
(le lobe haut-droite = presque-ile). N'affecte QUE le decoupage continental + la carte
des continents ; pays / cultures / religions / puissance restent inchanges.
"""
import os, sys, json, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import render_pol as R
from scipy import ndimage

DOCS = r'C:\Users\IgneeFleur\Documents\Github\FNS-TTRPG-RULES\docs\assets\cartes'
SITE = r'C:\Users\IgneeFleur\Documents\Github\FNS-TTRPG-RULES\site\assets\cartes'
TARGET = 1                                   # continent a scinder (le rouge = le plus grand)
CONT_COLORS = np.array([
    [0.86, 0.50, 0.42], [0.55, 0.72, 0.45], [0.45, 0.62, 0.80], [0.90, 0.78, 0.42],
    [0.68, 0.52, 0.75], [0.42, 0.75, 0.72], [0.85, 0.60, 0.72], [0.70, 0.70, 0.50]], np.float32)


def main():
    g = np.load(os.path.join(HERE, 'geo.npz'))
    c = np.load(os.path.join(HERE, 'countries.npz'))
    land = g['land'].astype(bool)
    labels = c['labels'].astype(np.int32); cont = c['cont'].astype(np.int32)
    cont_of = c['cont_of'].astype(np.int32); K = int(c['K']); ncont = int(c['ncont'])
    H, W = cont.shape

    mask = cont == TARGET
    area = int(mask.sum())
    # erode jusqu'a obtenir DEUX gros morceaux (>18% chacun) -> casse l'isthme etroit
    chosen = None
    for r in range(2, 80):
        er = ndimage.binary_erosion(mask, iterations=r)
        lab, n = ndimage.label(er, structure=np.ones((3, 3)))
        if n < 2:
            continue
        sizes = np.bincount(lab.ravel())[1:]
        order = np.argsort(sizes)[::-1]
        if sizes[order[1]] > 0.18 * area:
            chosen = (er, lab, order[:2] + 1, r); break
    if chosen is None:
        print('echec : pas de scission nette trouvee'); return
    er, lab, two, r = chosen
    print(f'scission a erosion={r}px ; morceaux={[int(np.bincount(lab.ravel())[t]) for t in two]}', flush=True)

    # graines = les 2 gros morceaux ; on rattache tout le continent au morceau le + proche
    seedimg = np.zeros((H, W), np.int32)
    seedimg[lab == two[0]] = 1
    seedimg[lab == two[1]] = 2
    idx = ndimage.distance_transform_edt(seedimg == 0, return_indices=True)[1]
    nearest = seedimg[idx[0], idx[1]]
    piece = np.where(mask, nearest, 0)          # 1 ou 2 sur le continent cible

    # le lobe HAUT-DROITE = plus grand fx moyen -> nouveau continent
    ys1, xs1 = np.where(piece == 1); ys2, xs2 = np.where(piece == 2)
    fx1 = xs1.mean() / W; fx2 = xs2.mean() / W
    newpiece = 1 if fx1 > fx2 else 2            # celui le plus a droite devient le nouveau
    keep = 2 if newpiece == 1 else 1
    new_id = ncont + 1
    cont2 = cont.copy()
    cont2[piece == newpiece] = new_id           # lobe -> nouveau continent
    # (l'autre morceau garde l'id TARGET)

    # met a jour cont_of (par pays, au centroide) + countries.json
    with open(os.path.join(HERE, 'countries.json'), encoding='utf-8') as f:
        cj = json.load(f)
    cont_of2 = cont_of.copy().tolist()
    while len(cont_of2) <= K:
        cont_of2.append(0)
    for s in cj['stats']:
        cy, cx = int(round(s['cy'])), int(round(s['cx']))
        s['continent'] = int(cont2[cy, cx]); cont_of2[s['id']] = int(cont2[cy, cx])
    cont_of2 = np.array(cont_of2, np.int32)
    ncont2 = int(cont2.max())

    np.savez_compressed(os.path.join(HERE, 'countries.npz'), labels=labels.astype(np.int16),
                        cont=cont2.astype(np.int16), cont_of=cont_of2, K=K, ncont=ncont2)
    with open(os.path.join(HERE, 'countries.json'), 'w', encoding='utf-8') as f:
        json.dump(cj, f)
    print(f'continents : {ncont} -> {ncont2} (lobe haut-droite = continent {new_id})', flush=True)

    # re-rend la carte des continents
    ccube = np.zeros((ncont2 + 1, 3), np.float32); ccube[0] = R.OCEAN
    for k in range(1, ncont2 + 1):
        ccube[k] = CONT_COLORS[(k - 1) % len(CONT_COLORS)]
    for dest in (DOCS, SITE, HERE):
        R.choropleth(cont2, ccube, os.path.join(dest, 'carte_continents.png'),
                     land=land, borders=False, coast=True)
    print('carte_continents.png re-rendue', flush=True)


if __name__ == '__main__':
    main()
