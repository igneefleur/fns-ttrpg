# -*- coding: utf-8 -*-
"""Scission PROPRE du continent rouge d'origine en central (1) + lobe haut-droite (5).
Reconstruit le continent rouge complet = (cont==1)|(cont==5), le coupe UNE fois a l'isthme
(nearest-core), et affecte chaque ILE ENTIERE au cote le plus proche (jamais coupee, jamais
de bande cotiere grignotee). N'affecte que le decoupage continental.
"""
import os, json, numpy as np
from scipy import ndimage
import render_pol as R
HERE = os.path.dirname(os.path.abspath(__file__))
CC = np.array([[0.86, 0.50, 0.42], [0.55, 0.72, 0.45], [0.45, 0.62, 0.80], [0.90, 0.78, 0.42],
               [0.68, 0.52, 0.75], [0.42, 0.75, 0.72]], np.float32)
DOCS = r'C:\Users\IgneeFleur\Documents\Github\fns-ttrpg\docs\assets\cartes'
SITE = r'C:\Users\IgneeFleur\Documents\Github\fns-ttrpg\site\assets\cartes'
LOBE_ID = 5

g = np.load(os.path.join(HERE, 'geo.npz')); c = np.load(os.path.join(HERE, 'countries.npz'))
land = g['land'].astype(bool); cont = c['cont'].astype(np.int32); K = int(c['K'])
labels = c['labels'].astype(np.int32); cont_of = c['cont_of'].astype(np.int32); H, W = cont.shape

red = (cont == 1) | (cont == 5)                       # continent rouge d'ORIGINE (central + lobe + iles)
area = int(red.sum())

# --- deux noyaux par erosion (casse l'isthme etroit) ---
chosen = None
for r in range(2, 90):
    er = ndimage.binary_erosion(red, iterations=r)
    lab, n = ndimage.label(er, structure=np.ones((3, 3)))
    if n < 2:
        continue
    sz = np.bincount(lab.ravel()); sz[0] = 0
    order = np.argsort(sz)[::-1]
    if sz[order[1]] > 0.18 * area:
        chosen = (lab, order[1], order[0], r); break
lab, c2, c1, rr = chosen
seedimg = np.zeros((H, W), np.int32)
seedimg[lab == c1] = 1
seedimg[lab == c2] = 2
idx = ndimage.distance_transform_edt(seedimg == 0, return_indices=True)[1]
nearest = seedimg[idx[0], idx[1]]
piece = np.where(red, nearest, 0)

# --- iles : affectees ENTIERES (vote majoritaire) -> jamais coupees ---
comp, nc = ndimage.label(red, structure=np.ones((3, 3)))
szc = np.bincount(comp.ravel()); szc[0] = 0; main = int(np.argmax(szc))
for k in range(1, nc + 1):
    if k == main or szc[k] == 0:
        continue
    m = comp == k
    v = piece[m]
    piece[m] = 1 if (v == 1).sum() >= (v == 2).sum() else 2

# --- le lobe = piece la plus a l'EST ---
ys1, xs1 = np.where(piece == 1); ys2, xs2 = np.where(piece == 2)
lobe = 1 if xs1.mean() > xs2.mean() else 2
cont[red] = 1                                          # tout le rouge redevient central
cont[red & (piece == lobe)] = LOBE_ID                 # puis le lobe -> violet
print(f'scission erosion={rr}px ; central={int((piece!=lobe).sum())}px lobe={int((piece==lobe).sum())}px', flush=True)

ncont2 = int(cont.max())
cj = json.load(open(os.path.join(HERE, 'countries.json'), encoding='utf-8'))
for s in cj['stats']:
    cy, cx = int(round(s['cy'])), int(round(s['cx'])); s['continent'] = int(cont[cy, cx]); cont_of[s['id']] = int(cont[cy, cx])
np.savez_compressed(os.path.join(HERE, 'countries.npz'), labels=labels.astype(np.int16),
                    cont=cont.astype(np.int16), cont_of=cont_of.astype(np.int32), K=K, ncont=ncont2)
json.dump(cj, open(os.path.join(HERE, 'countries.json'), 'w', encoding='utf-8'))
ccube = np.zeros((ncont2 + 1, 3), np.float32); ccube[0] = R.OCEAN
for kk in range(1, ncont2 + 1):
    ccube[kk] = CC[(kk - 1) % len(CC)]
for dest in (DOCS, SITE, HERE):
    R.choropleth(cont, ccube, os.path.join(dest, 'carte_continents.png'), land=land, borders=False, coast=True)
print('carte_continents.png re-rendue', flush=True)
