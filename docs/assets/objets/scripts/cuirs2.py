# -*- coding: utf-8 -*-
"""Le petit cuir et le grand cuir, dérivés de `cuir.png`.

Même pièce, trois cadrages : le petit recule dans son cadre, le grand déborde.

DEUX PIÈGES, tous deux vus à l'œil et corrigés :
  1. Un seuil de CLARTÉ perd le repli sombre du cuir, qui est aussi noir que le
     plateau. On détoure par DIFFÉRENCE avec le plateau reconstruit depuis
     `bois.png` : hors du sujet, l'écart médian est de 2 — le fond est le même.
  2. La pièce est en PAYSAGE dans un cadre en PORTRAIT. « Remplir » doit se
     calculer sur la LARGEUR ; caler sur la hauteur impose un ×2,4 qui réduit
     une source de 76 px en bouillie.
L'ombre portée d'origine part avec le sujet : on n'en rajoute pas une seconde.
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
FOND = (23, 13, 1)
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


# ---------- 1. détourage par DIFFÉRENCE avec le plateau -----------------------
PLAT = plateau()
q = PLAT.load()
src = Image.open(D + '/cuir.png').convert('RGB')
p = src.load()
SEUIL = 22
al = Image.new('L', (W, H), 0)
a = al.load()
for y in range(BORD, H - BORD):
    for x in range(BORD, W - BORD):
        e = sum((p[x, y][i] - q[x, y][i]) ** 2 for i in range(3)) ** 0.5
        a[x, y] = 255 if e > SEUIL else 0

# ne garder que la plus grosse tache, puis boucher ses trous
vus = set()
taches = []
for y in range(H):
    for x in range(W):
        if a[x, y] and (x, y) not in vus:
            pile, t = [(x, y)], []
            vus.add((x, y))
            while pile:
                cx, cy = pile.pop()
                t.append((cx, cy))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        n = (cx + dx, cy + dy)
                        if (0 <= n[0] < W and 0 <= n[1] < H and n not in vus and a[n]):
                            vus.add(n)
                            pile.append(n)
            taches.append(t)
taches.sort(key=len, reverse=True)
garde = set(taches[0])
print('taches : %s — on garde la plus grosse, %d px' % ([len(t) for t in taches[:4]], len(garde)))
for y in range(H):
    for x in range(W):
        a[x, y] = 255 if (x, y) in garde else 0
for y in range(BORD + 1, H - BORD - 1):          # boucher les trous internes
    xs = [x for x in range(BORD, W - BORD) if a[x, y]]
    if xs:
        for x in range(min(xs), max(xs) + 1):
            a[x, y] = 255
al = al.filter(ImageFilter.GaussianBlur(0.6))

noye = Image.new('RGB', (W, H), FOND)
noye.paste(src, (0, 0), al)
bb = al.getbbox()
piece, pa = noye.crop(bb), al.crop(bb)
ow, oh = piece.size
print('pièce détourée : %dx%d' % (ow, oh))


def poser(nom, remplissage, seed, decal_y=0):
    ech = (UW / ow) * remplissage
    nw, nh = max(1, round(ow * ech)), max(1, round(oh * ech))
    s2, a2 = piece.resize((nw, nh), Image.LANCZOS), pa.resize((nw, nh), Image.LANCZOS)
    if nw > UW or nh > UH:
        x0 = max(0, min(nw - UW, nw // 2 - UW // 2))
        y0 = max(0, min(nh - UH, nh // 2 - UH // 2))
        s2 = s2.crop((x0, y0, x0 + min(UW, nw), y0 + min(UH, nh)))
        a2 = a2.crop((x0, y0, x0 + min(UW, nw), y0 + min(UH, nh)))
        nw, nh = s2.size
    ox, oy = BORD + (UW - nw) // 2, BORD + (UH - nh) // 2 + decal_y
    out = plateau()
    out.paste(s2, (ox, oy), a2)
    grain(out, 9, seed)
    out.save(S + '/' + nom)
    print('  %-18s %2dx%-3d à (%2d,%2d)' % (nom, nw, nh, ox, oy))


poser('petit_cuir_84.png', 0.62, 21, decal_y=2)
poser('grand_cuir_84.png', 1.50, 23)

CX, CY = (BORD + W - BORD - 1) / 2, (BORD + H - BORD - 1) / 2
for nom, f in (('petit cuir', S + '/petit_cuir_84.png'), ('cuir', D + '/cuir.png'),
               ('grand cuir', S + '/grand_cuir_84.png')):
    z = Image.open(f).convert('RGB').load()
    n = sx = sy = 0
    for y in range(BORD, H - BORD):
        for x in range(BORD, W - BORD):
            if sum((z[x, y][i] - q[x, y][i]) ** 2 for i in range(3)) ** 0.5 > 30:
                n += 1
                sx += x
                sy += y
    print('  %-11s surface %2d %%   barycentre x %+.1f  y %+.1f'
          % (nom, round(100 * n / (UW * UH)), sx / n - CX, sy / n - CY))

st = Image.new('RGB', (W * 6 * 3 + 40, H * 6 + 20), (233, 226, 205))
for i, f in enumerate([S + '/petit_cuir_84.png', D + '/cuir.png', S + '/grand_cuir_84.png']):
    st.paste(Image.open(f).convert('RGB').resize((W * 6, H * 6), Image.NEAREST), (10 + i * (W * 6 + 10), 10))
st.save(S + '/trois_cuirs.png')
print('planche : PETIT | cuir | GRAND')
