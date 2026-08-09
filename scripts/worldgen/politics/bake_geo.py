"""Etape 0 — GEOMETRIE FIGEE.

Reproduit la carte canonique (monde 10 + remodelages cote haut-gauche / haut-droite),
APPLIQUE les retouches de cote dessinees par l'utilisateur (cotes NORD des deux continents
du haut rendues franchement decoupees), puis GELE la geographie (terre, altitude, plaque,
convergence) dans geo.npz. Tous les scripts politiques chargent ce fichier -> pas de rebuild.

Rend aussi les cartes physique + plaques mises a jour (tache 1).
"""
import sys, os, numpy as np, importlib.util
from scipy import ndimage
WG = r'C:\Users\IgneeFleur\Documents\Github\fns-ttrpg-rules\scripts\worldgen'
sys.path.insert(0, WG)
import worldflat as wf
# worldflat d'avant restylage : reshaped() s'en sert pour reproduire le masque de
# terres canonique. Ce fichier vivait dans un dossier temporaire de l'ancienne
# machine et n'a pas ete conserve ; renseigner WORLDFLAT_BACKUP pour rejouer ce
# script, ou repartir d'un geo.npz deja construit.
BK = os.environ.get('WORLDFLAT_BACKUP', '')
if not BK or not os.path.isfile(BK):
    raise SystemExit(
        "bake_geo.py : sauvegarde worldflat d'avant restylage introuvable.\n"
        "Definir WORLDFLAT_BACKUP vers worldflat_backup_prestyle.py."
    )
spec = importlib.util.spec_from_file_location('wf_old', BK); wf_old = importlib.util.module_from_spec(spec); spec.loader.exec_module(wf_old)

SEED = 314159265
AX, AY, FEAT, BANDW = 40.0, 26.0, 58.0, 46.0
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = HERE
DOCS = r'C:\Users\IgneeFleur\Documents\Github\fns-ttrpg-rules\docs\assets\cartes'
SITE = r'C:\Users\IgneeFleur\Documents\Github\fns-ttrpg-rules\site\assets\cartes'
gg = wf.merc_geom(ow=1300)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0); return t * t * (3 - 2 * t)


def _unit_noise(H, Wd, sig, so):
    rng = np.random.default_rng(SEED * 7 + so)
    n = ndimage.gaussian_filter(rng.standard_normal((H, Wd)).astype(np.float32), sigma=sig)
    return ((n - n.mean()) / (n.std() + 1e-6)).astype(np.float32)


def reshaped(module):
    """Reproduit EXACTEMENT reshape_tr_warp (remodelages haut-gauche + bord droit haut-droite)."""
    w = module.build_flat(SEED, gg['ow'], gg['oh'])
    elev = np.asarray(w['elev']).astype(np.float32).copy()
    sea = float(w['sea']); H, Wd = elev.shape
    land_orig = (elev > sea)
    yy, xx = np.mgrid[0:H, 0:Wd].astype(np.float32); fx = xx / Wd; fy = yy / H
    topA = smoothstep(0.46, 0.30, fy); region_TL = (topA * smoothstep(0.38, 0.24, fx)).astype(np.float32)
    nlow = _unit_noise(H, Wd, 100.0, 3); nmid = _unit_noise(H, Wd, 100.0 / 3.5, 11)
    bnd = land_orig != ndimage.binary_erosion(land_orig, structure=np.ones((3, 3)))
    dcoast = ndimage.distance_transform_edt(~bnd).astype(np.float32)
    coastw_TL = np.exp(-((dcoast / 58.0) ** 2)).astype(np.float32)
    elev = elev + ((0.16 * nlow + 0.06 * nmid) * coastw_TL * region_TL).astype(np.float32)
    rightedge = smoothstep(0.865, 0.925, fx) * smoothstep(0.50, 0.42, fy)
    topedge = smoothstep(0.135, 0.055, fy) * smoothstep(0.62, 0.70, fx) * smoothstep(1.0, 0.985, fx)
    region_TR = np.clip(np.maximum(rightedge, 0.65 * topedge), 0.0, 1.0).astype(np.float32)
    land_A = (elev > sea); bndA = land_A != ndimage.binary_erosion(land_A, structure=np.ones((3, 3)))
    dcoastA = ndimage.distance_transform_edt(~bndA).astype(np.float32)
    coastw_W = np.exp(-((dcoastA / BANDW) ** 2)).astype(np.float32)
    gate = (region_TR * coastw_W).astype(np.float32)
    ddx = (AX * (0.85 * _unit_noise(H, Wd, FEAT, 21) + 0.35 * _unit_noise(H, Wd, FEAT / 2.8, 33)) * gate).astype(np.float32)
    ddy = (AY * (0.85 * _unit_noise(H, Wd, FEAT, 47) + 0.35 * _unit_noise(H, Wd, FEAT / 2.8, 59)) * gate).astype(np.float32)
    rows = np.clip(yy - ddy, 0, H - 1); cols = np.clip(xx - ddx, 0, Wd - 1)
    elev2 = ndimage.map_coordinates(elev, [rows, cols], order=1, mode='nearest').astype(np.float32)
    land2 = (elev2 > sea)
    land2 = ndimage.binary_opening(land2, structure=np.ones((3, 3)), iterations=1)
    land2 = ndimage.binary_closing(land2, structure=np.ones((3, 3)), iterations=1)
    return elev2, land2, w, sea


def north_coast_warp(elev, land, sea):
    """RETOUCHE UTILISATEUR (rouge) : cotes NORD des deux continents du haut fortement decoupees
    (baies + peninsules). Warp horizontal+vertical gate aux cotes nord -> deplace le trait quelle
    que soit la pente. Ne touche que le nord des masses haut-gauche (fx<0.30) et haut-droite (fx>0.66)."""
    H, Wd = elev.shape
    yy, xx = np.mgrid[0:H, 0:Wd].astype(np.float32); fx = xx / Wd; fy = yy / H
    # region NORD haut-gauche : bande du haut, tiers gauche
    rTL = smoothstep(0.30, 0.16, fy) * smoothstep(0.035, 0.075, fx) * smoothstep(0.30, 0.24, fx)
    # region NORD haut-droite : bande du haut, cote droit
    rTR = smoothstep(0.235, 0.10, fy) * smoothstep(0.66, 0.72, fx) * smoothstep(0.985, 0.965, fx)
    region = np.clip(np.maximum(rTL, rTR), 0.0, 1.0).astype(np.float32)
    bnd = land != ndimage.binary_erosion(land, structure=np.ones((3, 3)))
    dcoast = ndimage.distance_transform_edt(~bnd).astype(np.float32)
    coastw = np.exp(-((dcoast / 42.0) ** 2)).astype(np.float32)
    gate = (region * coastw).astype(np.float32)
    # lobes marques : quelques baies/caps le long du nord (feat ~44 -> 3-5 lobes par continent)
    ddx = (30.0 * (0.85 * _unit_noise(H, Wd, 44.0, 201) + 0.4 * _unit_noise(H, Wd, 16.0, 202)) * gate).astype(np.float32)
    ddy = (44.0 * (0.9 * _unit_noise(H, Wd, 44.0, 203) + 0.4 * _unit_noise(H, Wd, 16.0, 204)) * gate).astype(np.float32)
    rows = np.clip(yy - ddy, 0, H - 1); cols = np.clip(xx - ddx, 0, Wd - 1)
    elev2 = ndimage.map_coordinates(elev, [rows, cols], order=1, mode='nearest').astype(np.float32)
    land2 = (elev2 > sea)
    land2 = ndimage.binary_opening(land2, structure=np.ones((3, 3)), iterations=1)
    land2 = ndimage.binary_closing(land2, structure=np.ones((3, 3)), iterations=1)
    return elev2, land2, int((land2 != land).sum())


def main():
    # masque canonique (relief d'origine) puis relief atlas force au masque canonique
    _, land_canon, _, sea = reshaped(wf_old)
    elev_new, _, w, _ = reshaped(wf)
    elev = elev_new.copy()
    elev = np.where(land_canon & (elev <= sea), sea + 1e-4, elev).astype(np.float32)
    elev = np.where((~land_canon) & (elev >= sea), sea - 1e-4, elev).astype(np.float32)
    land = land_canon.copy()
    # RETOUCHE cotes nord (tache 1)
    elev, land, chg = north_coast_warp(elev, land, sea)
    print('retouche cotes nord : pixels terre modifies =', chg, flush=True)
    # aligne elev sur le nouveau masque
    elev = np.where(land & (elev <= sea), sea + 1e-4, elev).astype(np.float32)
    elev = np.where((~land) & (elev >= sea), sea - 1e-4, elev).astype(np.float32)

    plate = np.asarray(w['plate']).astype(np.int16)
    conv = np.asarray(w['conv']).astype(np.float32)
    ridge = np.asarray(w['ridge']).astype(np.float32)
    ridge_tint = np.asarray(w['ridge_tint']).astype(np.float32)
    trench_e = np.asarray(w['trench_e']).astype(np.float32)

    np.savez_compressed(os.path.join(OUT, 'geo.npz'),
                        land=land, elev=elev, plate=plate, conv=conv, sea=np.float32(sea),
                        extent=np.asarray(gg['extent'], np.float64),
                        GXp=gg['GXp'].astype(np.float64), GYp=gg['GYp'].astype(np.float64))
    print('geo.npz ecrit', land.shape, '| terres =', int(land.sum()), flush=True)

    # re-rend physique + plaques (tache 1) avec la geographie retouchee
    w2 = dict(w); w2['elev'] = elev; w2['land'] = land
    for dest in (DOCS, SITE):
        os.makedirs(dest, exist_ok=True)
        wf.render_aplat(gg, w2, os.path.join(dest, 'monde_plat_aplat.png'))
        wf.render_plates(gg, w2, os.path.join(dest, 'monde_plat_plaques.png'))
        wf.render_relief(gg, w2, os.path.join(dest, 'monde_plat_relief.png'))
    # copie de travail
    wf.render_aplat(gg, w2, os.path.join(OUT, 'apercu_aplat.png'))
    print('cartes physique/plaques/relief re-rendues (docs + site)', flush=True)


if __name__ == '__main__':
    main()
