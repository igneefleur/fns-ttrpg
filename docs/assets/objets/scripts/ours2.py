# -*- coding: utf-8 -*-
"""La peau de grande bête, seconde version.

La première était trop sombre pour se détacher du plateau. Celle-ci est plus
claire. Quatre opérations : effacer l'étiquette, ôter la tête SANS que la coupe
se voie, grener, poser sur le plateau encadré.
"""
import math
import random
import sys

from PIL import Image, ImageFilter

D = r'C:/Users/IgneeFleur/Documents/Github/fns-owd-beta/docs/assets/objets'
S = r'C:/Users/IGNEEF~1/AppData/Local/Temp/claude/c--Users-IgneeFleur-Documents-Github-fns-ttrpg/d943426d-1602-45f6-8810-fbde9268f03c/scratchpad'
W, H, BORD = 84, 128, 2
sys.stdout.reconfigure(encoding='utf-8')

src = Image.open(r'C:/Users/IgneeFleur/Downloads/IMG_8174-removebg-preview.png')
sw, sh = src.size
rgb = src.convert('RGB')
al = src.getchannel('A')
p = rgb.load()
a = al.load()

# ---------- 1. l'étiquette : bleutée, donc introuvable ailleurs sur une fourrure
tag = [(x, y) for y in range(120, 200) for x in range(380, 470)
       if a[x, y] > 128 and p[x, y][2] > p[x, y][0] + 12 and p[x, y][2] > 90]
for x, y in list(tag):                       # on déborde d'un cheveu, le liseré compte
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

# ---------- 2. la tête : coupe en DÔME, pas au couteau ----------------------
# Le cou monte seul jusqu'à y=120 ; les pattes n'apparaissent qu'à partir de 120.
# Une coupe droite se verrait ; on ferme donc l'encolure par un arc qui bombe
# vers le haut, comme l'épaule d'une dépouille dont on a ôté la tête.
Y_COUPE, BOMBE, X0, X1 = 126, 15, 200, 292
for y in range(0, Y_COUPE + BOMBE + 2):
    for x in range(sw):
        if a[x, y] == 0:
            continue
        if X0 <= x <= X1:
            t = (x - X0) / (X1 - X0)
            limite = Y_COUPE - BOMBE * math.sin(math.pi * t)
        else:
            limite = Y_COUPE
        if y < limite:
            a[x, y] = 0
al = al.filter(ImageFilter.GaussianBlur(1.6))     # l'arête neuve se fond
print('tête ôtée : encolure fermée par un dôme de %d px' % BOMBE)

# ---------- 3. noyer le fond AVANT de réduire -------------------------------
FOND = (23, 13, 1)
noye = Image.new('RGB', (sw, sh), FOND)
noye.paste(rgb, (0, 0), al)
bb = al.getbbox()
ours = noye.crop(bb)
oa = al.crop(bb)
ow, oh = ours.size
print('dépouille : %dx%d' % (ow, oh))

# ---------- 4. le plateau nu -------------------------------------------------
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

# ---------- 5. pose, ombre, grain -------------------------------------------
ech = min(76 / ow, 118 / oh)
nw, nh = max(1, round(ow * ech)), max(1, round(oh * ech))
ours = ours.resize((nw, nh), Image.LANCZOS)
oa = oa.resize((nw, nh), Image.LANCZOS)
ox, oy = (W - nw) // 2, (H - nh) // 2
print('posée en %dx%d à (%d,%d)' % (nw, nh, ox, oy))

out = pl.copy()
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
for y in range(H):
    for x in range(W):
        f = om[x, y] / 255.0 * 0.5
        if f > 0:
            o[x, y] = tuple(round(v * (1 - f)) for v in o[x, y])
out.paste(ours, (ox, oy), oa)

random.seed(13)
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
out.save(S + '/grande2_84.png')

L = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
def sonde(f, nom):
    i = Image.open(f).convert('RGB')
    z = i.load()
    fb = i.filter(ImageFilter.GaussianBlur(1.2)).load()
    zz = [(x, y) for y in range(6, 26) for x in range(4, 20)]
    gr = (sum((z[x, y][c] - fb[x, y][c]) ** 2 for x, y in zz for c in range(3)) / (len(zz) * 3)) ** 0.5
    ps = [z[x, y] for y in range(50, 90) for x in range(28, 56)]
    v = tuple(round(sum(c[j] for c in ps) / len(ps)) for j in range(3))
    print('  %-14s sujet %s clarté %3.0f   grain %.2f' % (nom, v, L(v), gr))

for n, f in (('grande NEUVE', S + '/grande2_84.png'), ('grande ancienne', D + '/peau_grande.png'),
             ('bête', D + '/peau.png'), ('petite', D + '/peau_petite.png')):
    sonde(f, n)

st = Image.new('RGB', (W * 5 * 4 + 50, H * 5 + 20), (233, 226, 205))
for i, f in enumerate([D + '/peau_petite.png', D + '/peau.png', S + '/grande2_84.png', D + '/peau_grande.png']):
    st.paste(Image.open(f).convert('RGB').resize((W * 5, H * 5), Image.NEAREST), (10 + i * (W * 5 + 10), 10))
st.save(S + '/grande2_planche.png')
print('planche : petite | bête | GRANDE NEUVE | grande ancienne')
