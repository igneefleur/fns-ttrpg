# -*- coding: utf-8 -*-
"""Le petit cuir et le grand cuir, dérivés de `cuir.png`.

Même pièce de cuir, trois cadrages. La leçon des trois peaux s'applique telle
quelle : ce n'est PAS la vignette qui rétrécit, c'est le CADRAGE qui change.
  petit  — la pièce recule dans son cadre, marge large tout autour
  cuir   — inchangé, la référence
  grand  — cadrage serré, la pièce touche les bords et déborde
"""
import random
import sys

from PIL import Image, ImageFilter

D = r'C:/Users/IgneeFleur/Documents/Github/fns-owd-beta/docs/assets/objets'
S = (r'C:/Users/IGNEEF~1/AppData/Local/Temp/claude/'
     r'c--Users-IgneeFleur-Documents-Github-fns-ttrpg/'
     r'd943426d-1602-45f6-8810-fbde9268f03c/scratchpad')
W, H, BORD = 84, 128, 2
UW, UH = W - 2 * BORD, H - 2 * BORD
sys.stdout.reconfigure(encoding='utf-8')
L = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def cadre(img, modele=D + '/gourde.png'):
    m = Image.open(modele).convert('RGB').load()
    o = img.load()
    for y in range(H):
        for x in range(W):
            if x < BORD or x >= W - BORD or y < BORD or y >= H - BORD:
                o[x, y] = m[x, y]
    return img


def grain(img, force=9, seed=1):
    random.seed(seed)
    br = Image.new('L', (W, H))
    bp = br.load()
    for y in range(H):
        for x in range(W):
            bp[x, y] = max(0, min(255, int(random.gauss(128, 60))))
    br = br.filter(ImageFilter.GaussianBlur(0.5))
    bp = br.load()
    g = img.load()
    for y in range(BORD, H - BORD):
        for x in range(BORD, W - BORD):
            r, gg, b = g[x, y]
            lum = L((r, gg, b)) / 255.0
            d = (bp[x, y] - 128) / 128.0 * force * (0.35 + 0.65 * lum)
            g[x, y] = tuple(max(0, min(255, round(v + d))) for v in (r, gg, b))
    return img


# ---------- le plateau nu, reconstruit depuis bois.png ------------------------
def plateau():
    pl = Image.open(D + '/bois.png').convert('RGB')
    q = pl.load()
    trou = {(x, y) for y in range(BORD, H - BORD) for x in range(BORD, W - BORD)
            if q[x, y][2] > 12}
    for _ in range(3):
        for x, y in list(trou):
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    n = (x + dx, y + dy)
                    if BORD <= n[0] < W - BORD and BORD <= n[1] < H - BORD:
                        trou.add(n)
    base = pl.copy().load()
    reste = []
    for (x, y) in sorted(trou):
        for (sx, sy) in ((W - 1 - x, y), (x, H - 1 - y), (W - 1 - x, H - 1 - y)):
            if (sx, sy) not in trou:
                q[x, y] = base[sx, sy]
                break
        else:
            reste.append((x, y))
    en_cours = set(reste)
    while en_cours:
        av = []
        for (x, y) in list(en_cours):
            vs = [q[x + i, y + j] for i in (-1, 0, 1) for j in (-1, 0, 1)
                  if 0 <= x + i < W and 0 <= y + j < H and (x + i, y + j) not in en_cours]
            if vs:
                av.append(((x, y), tuple(sum(v[k] for v in vs) // len(vs) for k in range(3))))
        if not av:
            break
        for pos, col in av:
            q[pos] = col
            en_cours.discard(pos)
    dz = pl.filter(ImageFilter.GaussianBlur(0.8)).load()
    for (x, y) in trou:
        if any((x + i, y + j) not in trou for i in (-1, 0, 1) for j in (-1, 0, 1)):
            q[x, y] = dz[x, y]
    return cadre(pl)


# ---------- détourer la pièce de cuir de son plateau --------------------------
src = Image.open(D + '/cuir.png').convert('RGB')
p = src.load()
FOND = (23, 13, 1)
al = Image.new('L', (W, H), 0)
a = al.load()
for y in range(BORD, H - BORD):
    for x in range(BORD, W - BORD):
        # le plateau est très sombre et vert ; le cuir est clair et rouge
        c = p[x, y]
        a[x, y] = 255 if L(c) > 55 and c[0] >= c[2] else 0
al = al.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
al = al.filter(ImageFilter.GaussianBlur(0.7))
bb = al.getbbox()
print('pièce détourée : %s -> %dx%d' % (bb, bb[2] - bb[0], bb[3] - bb[1]))

noye = Image.new('RGB', (W, H), FOND)
noye.paste(src, (0, 0), al)
piece = noye.crop(bb)
pa = al.crop(bb)
ow, oh = piece.size


def poser(nom, remplissage, seed, decal_y=0):
    """remplissage : part de la surface utile que la pièce occupe.
       < 1 elle recule dans le cadre, > 1 elle déborde."""
    if remplissage <= 1.0:
        ech = min(UW / ow, UH / oh) * remplissage
        nw, nh = max(1, round(ow * ech)), max(1, round(oh * ech))
        src2, a2 = piece.resize((nw, nh), Image.LANCZOS), pa.resize((nw, nh), Image.LANCZOS)
        ox, oy = BORD + (UW - nw) // 2, BORD + (UH - nh) // 2 + decal_y
    else:
        # Cadrage serré. La pièce est en PAYSAGE dans un cadre en PORTRAIT :
        # « remplir » doit se calculer sur la LARGEUR. Prendre le max des deux
        # rapports cale sur la hauteur et impose un ×2,4 qui réduit une source
        # de 76 px en bouillie — vérifié à l'œil.
        ech = (UW / ow) * remplissage
        nw, nh = max(1, round(ow * ech)), max(1, round(oh * ech))
        src2, a2 = piece.resize((nw, nh), Image.LANCZOS), pa.resize((nw, nh), Image.LANCZOS)
        cx, cy = nw // 2, nh // 2
        x0 = max(0, min(nw - UW, cx - UW // 2))
        y0 = max(0, min(nh - UH, cy - UH // 2))
        src2 = src2.crop((x0, y0, x0 + min(UW, nw), y0 + min(UH, nh)))
        a2 = a2.crop((x0, y0, x0 + min(UW, nw), y0 + min(UH, nh)))
        nw, nh = src2.size
        ox, oy = BORD + (UW - nw) // 2, BORD + (UH - nh) // 2 + decal_y

    out = plateau()
    am = a2.load()
    omb = Image.new('L', (W, H), 0)
    om = omb.load()
    for y in range(nh):
        for x in range(nw):
            if am[x, y] > 60:
                X, Y = ox + x + 3, oy + y + 4
                if BORD <= X < W - BORD and BORD <= Y < H - BORD:
                    om[X, Y] = 255
    omb = omb.filter(ImageFilter.GaussianBlur(2.6))
    om = omb.load()
    o = out.load()
    for y in range(H):
        for x in range(W):
            f = om[x, y] / 255.0 * 0.5
            if f > 0:
                o[x, y] = tuple(round(v * (1 - f)) for v in o[x, y])
    out.paste(src2, (ox, oy), a2)
    grain(out, 9, seed)
    out.save(S + '/' + nom)
    print('  %-18s posée en %2dx%-3d à (%2d,%2d)' % (nom, nw, nh, ox, oy))
    return out


poser('petit_cuir_84.png', 0.62, 21, decal_y=3)
poser('grand_cuir_84.png', 1.30, 23)

CX, CY = (BORD + W - BORD - 1) / 2, (BORD + H - BORD - 1) / 2
for nom, f in (('petit cuir', S + '/petit_cuir_84.png'), ('cuir', D + '/cuir.png'),
               ('grand cuir', S + '/grand_cuir_84.png')):
    z = Image.open(f).convert('RGB').load()
    n = sx = sy = 0
    xs, ys = [], []
    for y in range(BORD, H - BORD):
        for x in range(BORD, W - BORD):
            if L(z[x, y]) > 55:
                n += 1
                sx += x
                sy += y
                xs.append(x)
                ys.append(y)
    print('  %-12s surface %2d %%  barycentre x %+.1f y %+.1f  marges G %2d D %2d H %2d B %2d'
          % (nom, round(100 * n / (UW * UH)), sx / n - CX, sy / n - CY,
             min(xs) - BORD, (W - BORD - 1) - max(xs), min(ys) - BORD, (H - BORD - 1) - max(ys)))

st = Image.new('RGB', (W * 6 * 3 + 40, H * 6 + 20), (233, 226, 205))
for i, f in enumerate([S + '/petit_cuir_84.png', D + '/cuir.png', S + '/grand_cuir_84.png']):
    st.paste(Image.open(f).convert('RGB').resize((W * 6, H * 6), Image.NEAREST), (10 + i * (W * 6 + 10), 10))
st.save(S + '/trois_cuirs.png')
print('planche : PETIT | cuir | GRAND')
