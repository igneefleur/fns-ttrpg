# -*- coding: utf-8 -*-
"""Trois tailles de peau à partir d'une seule icône.

`peau.png` (le `Hide` du wiki) montre une dépouille étalée qui remplit le cadre.
On l'en extrait, puis on la repose à trois tailles sur un plateau reconstruit :
petite, bête, grande. Le sujet est le même — c'est la TAILLE qui distingue les
trois cartes, ce qui est exactement ce que les trois objets disent.
"""
import io
import random
import sys
from collections import deque

from PIL import Image, ImageFilter

D = r'C:/Users/IgneeFleur/Documents/Github/fns-owd-beta/docs/assets/objets'
S = r'C:/Users/IGNEEF~1/AppData/Local/Temp/claude/c--Users-IgneeFleur-Documents-Github-fns-ttrpg/d943426d-1602-45f6-8810-fbde9268f03c/scratchpad'
W, H, BORD = 84, 128, 2
sys.stdout.reconfigure(encoding='utf-8')


def cadre(img, modele=D + '/gourde.png'):
    m = Image.open(modele).convert('RGB').load()
    o = img.load()
    for y in range(H):
        for x in range(W):
            if x < BORD or x >= W - BORD or y < BORD or y >= H - BORD:
                o[x, y] = m[x, y]
    return img


# ---------- le plateau nu, reconstruit depuis bois.png -----------------------
pl = Image.open(D + '/bois.png').convert('RGB')
p = pl.load()
trou = {(x, y) for y in range(BORD, H - BORD) for x in range(BORD, W - BORD) if p[x, y][2] > 12}
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
            p[x, y] = base[sx, sy]
            break
    else:
        reste.append((x, y))
en_cours = set(reste)
while en_cours:
    av = []
    for (x, y) in list(en_cours):
        vs = [p[x + dx, y + dy] for dx in (-1, 0, 1) for dy in (-1, 0, 1)
              if 0 <= x + dx < W and 0 <= y + dy < H and (x + dx, y + dy) not in en_cours]
        if vs:
            av.append(((x, y), tuple(sum(v[i] for v in vs) // len(vs) for i in range(3))))
    if not av:
        break
    for pos, col in av:
        p[pos] = col
        en_cours.discard(pos)
dx_ = pl.filter(ImageFilter.GaussianBlur(0.8)).load()
for (x, y) in trou:
    if any((x + a, y + b) not in trou for a in (-1, 0, 1) for b in (-1, 0, 1)):
        p[x, y] = dx_[x, y]
cadre(pl)
PLATEAU = pl


# ---------- extraire la dépouille de peau.png --------------------------------
# Le plateau est brun sombre et TRÈS peu lumineux ; la peau est pâle. La clarté
# suffit ici, là où l'écart de canaux servait ailleurs — le poil n'a pas de
# dominante franche, il est simplement CLAIR.
src = Image.open(D + '/peau.png').convert('RGB')
q = src.load()
L = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
m = Image.new('L', (W, H), 0)
mp = m.load()
for y in range(BORD, H - BORD):
    for x in range(BORD, W - BORD):
        l = L(q[x, y])
        mp[x, y] = 0 if l <= 55 else (255 if l >= 85 else round((l - 55) * 255 / 30))
m = m.filter(ImageFilter.GaussianBlur(0.7))
mp = m.load()
n = sum(1 for y in range(H) for x in range(W) if mp[x, y] > 128)
print('dépouille extraite : %d px sur %d (%d %%)' % (n, W * H, 100 * n / (W * H)))
bb = m.getbbox()
peau = src.crop(bb)
pa = m.crop(bb)
pw, ph = peau.size
print('boîte de la dépouille : %dx%d' % (pw, ph))


def pose(ech, nom, seed):
    nw, nh = max(6, round(pw * ech)), max(6, round(ph * ech))
    s = peau.resize((nw, nh), Image.LANCZOS)
    a = s and pa.resize((nw, nh), Image.LANCZOS)
    ox, oy = (W - nw) // 2, (H - nh) // 2
    out = PLATEAU.copy()
    am = a.load()
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
    out.paste(s, (ox, oy), a)
    random.seed(seed)
    br = Image.new('L', (W, H))
    bp = br.load()
    for y in range(H):
        for x in range(W):
            bp[x, y] = max(0, min(255, int(random.gauss(128, 60))))
    br = br.filter(ImageFilter.GaussianBlur(0.5))
    bp = br.load()
    g = out.load()
    for y in range(BORD, H - BORD):
        for x in range(BORD, W - BORD):
            r, gg, b = g[x, y]
            lum = (0.299 * r + 0.587 * gg + 0.114 * b) / 255.0
            d = (bp[x, y] - 128) / 128.0 * 9 * (0.35 + 0.65 * lum)
            g[x, y] = tuple(max(0, min(255, round(v + d))) for v in (r, gg, b))
    out.save('%s/%s.png' % (S, nom))
    print('  %-14s %dx%d à (%d,%d)' % (nom, nw, nh, ox, oy))
    return out


petite = pose(0.52, 'peau_petite', 3)
bete = pose(0.74, 'peau_bete', 5)
grande = pose(1.00, 'peau_grande', 7)

st = Image.new('RGB', (W * 5 * 4 + 50, H * 5 + 20), (233, 226, 205))
for i, im in enumerate([petite, bete, grande, Image.open(D + '/peau.png').convert('RGB')]):
    st.paste(im.resize((W * 5, H * 5), Image.NEAREST), (10 + i * (W * 5 + 10), 10))
st.save(S + '/trois_peaux.png')
print('planche : petite | bête | grande | original du wiki')
