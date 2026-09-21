# -*- coding: utf-8 -*-
"""La peau de grande bête, version finale.

Même travail que la précédente — étiquette effacée, tête ôtée en dôme, grain,
plateau, cadre — avec une différence voulue : **on CADRE SERRÉ sur le corps**,
quitte à couper les côtés. La dépouille remplit alors tout le cadre et déborde,
ce qui la fait lire comme grande. Les deux autres peaux tiennent entières dans
le leur ; c'est le contraste qui dit la taille.
"""
import math
import random
import sys

from PIL import Image, ImageFilter

D = r'C:/Users/IgneeFleur/Documents/Github/fns-owd-beta/docs/assets/objets'
S = r'C:/Users/IGNEEF~1/AppData/Local/Temp/claude/c--Users-IgneeFleur-Documents-Github-fns-ttrpg/d943426d-1602-45f6-8810-fbde9268f03c/scratchpad'
W, H, BORD = 84, 128, 2
UW, UH = W - 2 * BORD, H - 2 * BORD          # 80 x 124, la surface utile
sys.stdout.reconfigure(encoding='utf-8')

src = Image.open(r'C:/Users/IgneeFleur/Downloads/hidev2.png')
sw, sh = src.size
rgb = src.convert('RGB')
al = src.getchannel('A')
p = rgb.load()
a = al.load()

# ---------- 1. l'étiquette, bleutée ------------------------------------------
tag = [(x, y) for y in range(120, 200) for x in range(380, 480)
       if a[x, y] > 128 and p[x, y][2] > p[x, y][0] + 12 and p[x, y][2] > 90]
for x, y in list(tag):
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            if 0 <= x + dx < sw and 0 <= y + dy < sh and a[x + dx, y + dy] > 128:
                tag.append((x + dx, y + dy))
tag = set(tag)
reste = set(tag)
while reste:
    av = []
    for (x, y) in list(reste):
        vs = [p[x + dx, y + dy] for dx in (-1, 0, 1) for dy in (-1, 0, 1)
              if 0 <= x + dx < sw and 0 <= y + dy < sh
              and (x + dx, y + dy) not in reste and a[x + dx, y + dy] > 128]
        if vs:
            av.append(((x, y), tuple(sum(v[i] for v in vs) // len(vs) for i in range(3))))
    if not av:
        break
    for pos, col in av:
        p[pos] = col
        reste.discard(pos)
fl = rgb.filter(ImageFilter.GaussianBlur(1.0)).load()
for (x, y) in tag:
    p[x, y] = fl[x, y]
print('étiquette effacée : %d px' % len(tag))

# ---------- 2. la tête, coupe en dôme ----------------------------------------
Y_COUPE, BOMBE, X0, X1 = 126, 15, 200, 292
for y in range(0, Y_COUPE + 2):
    for x in range(sw):
        if a[x, y] == 0:
            continue
        limite = Y_COUPE - BOMBE * math.sin(math.pi * (x - X0) / (X1 - X0)) if X0 <= x <= X1 else Y_COUPE
        if y < limite:
            a[x, y] = 0
al = al.filter(ImageFilter.GaussianBlur(1.6))
print('tête ôtée, encolure fermée en dôme de %d px' % BOMBE)

# ---------- 3. CADRAGE SERRÉ sur le corps ------------------------------------
FOND = (23, 13, 1)
noye = Image.new('RGB', (sw, sh), FOND)
noye.paste(rgb, (0, 0), al)                  # noyer AVANT de réduire : pas de liseré
bb = al.getbbox()
bx0, by0, bx1, by1 = bb
bw, bh = bx1 - bx0, by1 - by0
print('dépouille entière : %dx%d' % (bw, bh))

# On rogne les côtés jusqu'au rapport du cadre — mais un cran plus large que le
# strict nécessaire (DEZOOM), pour en montrer un peu plus. La hauteur, elle, est
# déjà celle de toute la dépouille : on ne peut pas en prendre davantage. Le
# surcroît de largeur se paie donc en marge haute et basse.
DEZOOM = 1.12
cible = UW / UH
cw = min(bw, round(bh * cible * DEZOOM))
# La dépouille penche à droite et flotte haut. Deux corrections, de natures
# différentes : la largeur du bloc vaut déjà toute la surface utile, donc on ne
# peut pas le déplacer — c'est la FENÊTRE DE DÉCOUPE qu'on glisse vers la droite
# dans la source, ce qui ramène le sujet vers la gauche. La hauteur, elle, a du
# jeu : on descend simplement le collage.
DECAL_SRC_X = 7            # px source ; à l'échelle du bloc, environ 2 px d'écran
DECAL_Y = 5                # px d'écran
cx = (bx0 + bx1) // 2 + DECAL_SRC_X
x0 = max(bx0, min(bx1 - cw, cx - cw // 2))
boite = (x0, by0, x0 + cw, by1)
ech = min(UW / cw, UH / bh)
nw, nh = max(1, round(cw * ech)), max(1, round(bh * ech))
ox = BORD + (UW - nw) // 2
oy = min(H - BORD - nh, BORD + (UH - nh) // 2 + DECAL_Y)
print('cadrage : %dx%d, soit %d %% de la largeur — posée en %dx%d à (%d,%d)'
      % (cw, bh, round(100 * cw / bw), nw, nh, ox, oy))
ours = noye.crop(boite).resize((nw, nh), Image.LANCZOS)
oa = al.crop(boite).resize((nw, nh), Image.LANCZOS)

# ---------- 4. le plateau nu --------------------------------------------------
def cadre(img, modele=D + '/gourde.png'):
    m = Image.open(modele).convert('RGB').load()
    o = img.load()
    for y in range(H):
        for x in range(W):
            if x < BORD or x >= W - BORD or y < BORD or y >= H - BORD:
                o[x, y] = m[x, y]
    return img

pl = Image.open(D + '/bois.png').convert('RGB')
q = pl.load()
trou = {(x, y) for y in range(BORD, H - BORD) for x in range(BORD, W - BORD) if q[x, y][2] > 12}
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
cadre(pl)

# ---------- 5. pose et grain --------------------------------------------------
out = pl.copy()
# Une marge est réapparue en haut et en bas : l'ombre portée redevient visible,
# et les deux autres peaux en ont une. On la remet.
am = oa.load()
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
for y in range(BORD, H - BORD):
    for x in range(BORD, W - BORD):
        f = om[x, y] / 255.0 * 0.5
        if f > 0:
            o[x, y] = tuple(round(v * (1 - f)) for v in o[x, y])
out.paste(ours, (ox, oy), oa)

random.seed(17)
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
out.save(S + '/grande3_84.png')

L = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
CX, CY = (BORD + W - BORD - 1) / 2, (BORD + H - BORD - 1) / 2


def sonde(f, nom):
    i = Image.open(f).convert('RGB')
    z = i.load()
    ps = [z[x, y] for y in range(50, 90) for x in range(28, 56)]
    v = tuple(round(sum(c[j] for c in ps) / len(ps)) for j in range(3))
    n = sx = sy = 0
    xs = []
    ys = []
    for y in range(BORD, H - BORD):
        for x in range(BORD, W - BORD):
            if L(z[x, y]) > 60:
                n += 1
                sx += x
                sy += y
                xs.append(x)
                ys.append(y)
    print('  %-14s clarté %3.0f | barycentre x %+.1f y %+.1f | marges G %2d D %2d H %2d B %2d'
          % (nom, L(v), sx / n - CX, sy / n - CY, min(xs) - BORD, (W - BORD - 1) - max(xs),
             min(ys) - BORD, (H - BORD - 1) - max(ys)))


for n, f in (('GRANDE recalée', S + '/grande3_84.png'), ('grande d\'avant', D + '/peau_grande.png'),
             ('bête', D + '/peau.png'), ('petite', D + '/peau_petite.png')):
    sonde(f, n)

st = Image.new('RGB', (W * 5 * 4 + 50, H * 5 + 20), (233, 226, 205))
for i, f in enumerate([D + '/peau_petite.png', D + '/peau.png', S + '/grande3_84.png', D + '/peau_grande.png']):
    st.paste(Image.open(f).convert('RGB').resize((W * 5, H * 5), Image.NEAREST), (10 + i * (W * 5 + 10), 10))
st.save(S + '/grande3_planche.png')
print('planche : petite | bête | GRANDE SERRÉE | grande précédente')
