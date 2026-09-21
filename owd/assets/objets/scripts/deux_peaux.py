# -*- coding: utf-8 -*-
"""Les deux peaux fournies par l'auteur.

PETITE — déjà posée sur le plateau d'Outward, au bon rapport. Logo retiré par
  scripts/retirer_filigrane.py. Il ne manque que le cadre de bois et le grain.

GRANDE — une dépouille d'ours sur fond de papier crème. Rotation de 180°, découpe
  du fond (le logo part avec, il est dessus), ABLATION DE LA TÊTE pour s'accorder
  aux deux autres peaux, puis plateau, cadre, ombre et grain.
"""
import io
import random
import sys

from PIL import Image, ImageFilter

D = r'C:/Users/IgneeFleur/Documents/Github/fns-owd-beta/docs/assets/objets'
S = r'C:/Users/IGNEEF~1/AppData/Local/Temp/claude/c--Users-IgneeFleur-Documents-Github-fns-ttrpg/d943426d-1602-45f6-8810-fbde9268f03c/scratchpad'
W, H, BORD = 84, 128, 2
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
            lum = (0.299 * r + 0.587 * gg + 0.114 * b) / 255.0
            d = (bp[x, y] - 128) / 128.0 * force * (0.35 + 0.65 * lum)
            g[x, y] = tuple(max(0, min(255, round(v + d))) for v in (r, gg, b))
    return img


# ============ 1. LA PETITE : cadre + grain ==================================
pet = Image.open(S + '/petite_sans_logo.png').convert('RGB').resize((W, H), Image.LANCZOS)
cadre(pet)
grain(pet, 9, 3)
pet.save(S + '/petite_84.png')
print('petite : cadre greffé et grain posé')


# ============ 2. LE PLATEAU NU, reconstruit depuis bois.png =================
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
        vs = [p[x + a, y + b] for a in (-1, 0, 1) for b in (-1, 0, 1)
              if 0 <= x + a < W and 0 <= y + b < H and (x + a, y + b) not in en_cours]
        if vs:
            av.append(((x, y), tuple(sum(v[i] for v in vs) // len(vs) for i in range(3))))
    if not av:
        break
    for pos, col in av:
        p[pos] = col
        en_cours.discard(pos)
dz = pl.filter(ImageFilter.GaussianBlur(0.8)).load()
for (x, y) in trou:
    if any((x + a, y + b) not in trou for a in (-1, 0, 1) for b in (-1, 0, 1)):
        p[x, y] = dz[x, y]
cadre(pl)


# ============ 3. LA GRANDE ==================================================
src = Image.open(S + '/grande_rot.png').convert('RGB')
sw, sh = src.size
q = src.load()

# masque : fourrure à 53 de clarté, papier crème à 238. Le seuil tombe au milieu.
al = Image.new('L', (sw, sh), 0)
ap = al.load()
for y in range(sh):
    for x in range(sw):
        l = L(q[x, y])
        ap[x, y] = 255 if l <= 150 else (0 if l >= 205 else round((205 - l) * 255 / 55))

# ABLATION DE LA TÊTE : elle occupe le haut de la bande centrale. Coupe droite au
# cou, comme un dépeceur la ferait — les deux autres peaux n'ont pas de tête.
TETE = (780, 0, 1300, 285)
for y in range(TETE[1], TETE[3]):
    for x in range(TETE[0], TETE[2]):
        ap[x, y] = 0
print('tête retirée : bande x %d-%d au-dessus de y %d' % (TETE[0], TETE[2], TETE[3]))

# ERODER puis, surtout, NOYER LE FOND AVANT DE REDUIRE. Sans ça, LANCZOS moyenne
# la fourrure avec le papier crème et laisse un liseré clair tout autour — vu à
# l ecran. On remplace donc le crème par la couleur du plateau à pleine
# résolution : le rééchantillonnage n a plus rien de clair à mélanger.
al = al.filter(ImageFilter.MinFilter(9))           # érosion : mange le bord contaminé
al = al.filter(ImageFilter.GaussianBlur(2.0))
FOND = (23, 13, 1)
noye = Image.new('RGB', (sw, sh), FOND)
noye.paste(src, (0, 0), al)
bb = al.getbbox()
ours = noye.crop(bb)
oa = al.crop(bb)
ow, oh = ours.size
print('dépouille : %dx%d' % (ow, oh))

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
grain(out, 9, 7)
out.save(S + '/grande_84.png')


def sonde(f, nom):
    i = Image.open(f).convert('RGB')
    a = i.load()
    fb = i.filter(ImageFilter.GaussianBlur(1.2)).load()
    z = [(x, y) for y in range(6, 26) for x in range(4, 20)]
    gr = (sum((a[x, y][c] - fb[x, y][c]) ** 2 for x, y in z for c in range(3)) / (len(z) * 3)) ** 0.5

    def moy(x0, y0, x1, y1):
        ps = [a[x, y] for y in range(y0, y1) for x in range(x0, x1)]
        return tuple(round(sum(c[j] for c in ps) / len(ps)) for j in range(3))
    print('  %-10s cadre %s  plateau %s  grain %.2f' % (nom, moy(0, 60, 2, 70), moy(4, 6, 16, 20), gr))


for n, f in (('petite', S + '/petite_84.png'), ('grande', S + '/grande_84.png'),
             ('bête', D + '/peau.png'), ('gourde', D + '/gourde.png')):
    sonde(f, n)

st = Image.new('RGB', (W * 5 * 3 + 40, H * 5 + 20), (233, 226, 205))
for i, f in enumerate([S + '/petite_84.png', D + '/peau.png', S + '/grande_84.png']):
    st.paste(Image.open(f).convert('RGB').resize((W * 5, H * 5), Image.NEAREST), (10 + i * (W * 5 + 10), 10))
st.save(S + '/trois_finales.png')
print('planche : PETITE | bête | GRANDE')
