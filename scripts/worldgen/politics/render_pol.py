"""Rendu commun des cartes politiques (choroplethes) dans le style du site.

Ocean bleu clair, terres coloriees par region, cotes + frontieres tracees, grille + cadre.
Toutes les cartes politiques passent par ici pour un rendu homogene.
"""
import os, sys, numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy import ndimage
WG = r'C:\Users\IgneeFleur\Documents\Github\FNS-TTRPG-RULES\scripts\worldgen'
sys.path.insert(0, WG)
import worldflat as wf

OCEAN = np.array([0.831, 0.902, 0.945], np.float32)   # #d4e6f1 (meme que l'aplat du site)
COASTC = np.array([0.30, 0.32, 0.28], np.float32)
BORDERC = np.array([0.12, 0.12, 0.15], np.float32)


def geom():
    return wf.merc_geom(ow=1300)


def _boundaries(labels, land, thin=False):
    """Masques : frontieres terre-terre (entre regions) et trait de cote (terre-mer).
    thin=True -> frontieres 1 px (un seul cote, 4-connexite) au lieu de ~2 px."""
    bord = np.zeros(labels.shape, bool)
    if thin:
        d = (labels[:, :-1] != labels[:, 1:]) & (labels[:, :-1] > 0) & (labels[:, 1:] > 0)
        bord[:, :-1] |= d
        d = (labels[:-1, :] != labels[1:, :]) & (labels[:-1, :] > 0) & (labels[1:, :] > 0)
        bord[:-1, :] |= d
    else:
        for dy, dx in ((1, 0), (0, 1), (1, 1), (1, -1)):
            a = labels
            b = np.roll(np.roll(labels, dy, 0), dx, 1)
            m = (a != b) & (a > 0) & (b > 0)
            bord |= m
            bord |= np.roll(np.roll(m, -dy, 0), -dx, 1)
    bord &= land
    coast = land ^ ndimage.binary_erosion(land, structure=np.ones((3, 3)))
    return bord, coast


def choropleth(labels, colcube, path, land=None, borders=True, coast=True,
               border_rgb=BORDERC, sea_shade=True, extra=None, thin=False, border_mix=0.65, border_px=1,
               ocean_rgb=None, coast_rgb=None, grid_kw=None, upscale=1, dpi=200):
    """labels (H,W int, 0=ocean), colcube (K+1,3 float 0..1). extra(ax,g) pour surcouches.
    ocean_rgb : couleur d'ocean PLATE (desactive le degrade si sea_shade=False).
    upscale>1 : calcule frontieres/cotes a plus HAUTE resolution -> traits plus FINS ; dpi -> taille de sortie (4k)."""
    g = geom()
    oc = OCEAN if ocean_rgb is None else np.asarray(ocean_rgb, np.float32)
    cc = COASTC if coast_rgb is None else np.asarray(coast_rgb, np.float32)
    if land is None:
        land = labels > 0
    if upscale and upscale != 1:
        labels = ndimage.zoom(labels, upscale, order=0)
        land = ndimage.zoom(land.astype(np.uint8), upscale, order=0).astype(bool)
    img = np.clip(colcube[labels], 0.0, 1.0).astype(np.float32)
    img[~land] = oc
    if sea_shade:  # leger dégradé de profondeur factice pour ne pas avoir un bleu plat mort
        yy, xx = np.mgrid[0:labels.shape[0], 0:labels.shape[1]].astype(np.float32)
        dc = ndimage.distance_transform_edt(~land).astype(np.float32)
        deep = np.clip(dc / (0.16 * labels.shape[1]), 0.0, 1.0)
        ocean_deep = oc[None, None, :] * (1.0 - 0.16 * deep[..., None])
        img = np.where(land[..., None], img, ocean_deep).astype(np.float32)
    if borders or coast:
        bord, cst = _boundaries(labels, land, thin=thin)
        if borders:
            if border_px >= 2:
                bord = ndimage.binary_dilation(bord, iterations=int(border_px) - 1) & land
            img[bord] = (1.0 - border_mix) * img[bord] + border_mix * border_rgb
        if coast:
            img[cst] = cc
    xmin, xmax, ymin, ymax = g['extent']
    fig, ax = wf._fig(g)
    ax.imshow(img, extent=g['extent'], origin='upper', interpolation='nearest', zorder=1)
    wf._grid_frame(ax, g['extent'], **(grid_kw or {}))
    if extra is not None:
        extra(ax, g)
    plt.tight_layout(); plt.savefig(path, dpi=dpi, bbox_inches='tight', facecolor='white'); plt.close()


def greedy_colors(adj, K, palette):
    """Coloriage glouton adjacence-conscient. adj: dict label->set(labels). Retourne color idx par label (1..K)."""
    order = sorted(range(1, K + 1), key=lambda l: -len(adj.get(l, ())))
    col = {}
    for l in order:
        used = {col[n] for n in adj.get(l, ()) if n in col}
        c = 0
        while c in used:
            c += 1
        col[l] = c % len(palette)
    return col


def spread_colors(adj, K, P, seed=0):
    """Comme greedy mais ETALE sur TOUTE la palette (depart pseudo-aleatoire par region)
    -> couleurs variees, voisins toujours differents. adj: dict label->{voisin:poids}."""
    r = np.random.default_rng(seed)
    starts = r.integers(0, P, size=K + 2)
    order = sorted(range(1, K + 1), key=lambda l: -len(adj.get(l, ())))
    col = {}
    for l in order:
        used = {col[n] for n in adj.get(l, ()) if n in col}
        for k in range(P):
            c = (int(starts[l]) + k) % P
            if c not in used:
                col[l] = c; break
        else:
            col[l] = int(starts[l]) % P
    return col


# palettes agreables (HSV -> RGB) pour beaucoup de regions
def make_palette(n, sat=0.42, val=0.93, seed=0):
    rng = np.random.default_rng(seed)
    hs = (np.linspace(0, 1, n, endpoint=False) + rng.uniform(0, 0.03, n)) % 1.0
    ss = sat + rng.uniform(-0.08, 0.08, n)
    vs = val + rng.uniform(-0.06, 0.04, n)
    import colorsys
    return np.array([colorsys.hsv_to_rgb(h, np.clip(s, 0.2, 0.7), np.clip(v, 0.7, 1.0)) for h, s, v in zip(hs, ss, vs)], np.float32)
