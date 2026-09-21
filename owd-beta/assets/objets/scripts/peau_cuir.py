# -*- coding: utf-8 -*-
"""Deux icônes : la peau de bête et le cuir.

- PEAU : `Hide.png` du wiki, à qui il manque le cadre de bois — même défaut que
  `bois.png`. On greffe l'anneau de 2 px depuis `gourde.png`.
- CUIR : PNG transparent fourni par l'auteur. Il faut lui monter le décor entier —
  plateau, cadre, ombre portée, grain — comme on l'a fait pour la poche.
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


def greffe_cadre(img, modele=D + '/gourde.png'):
    m = Image.open(modele).convert('RGB').load()
    o = img.load()
    for y in range(H):
        for x in range(W):
            if x < BORD or x >= W - BORD or y < BORD or y >= H - BORD:
                o[x, y] = m[x, y]
    return img


# ---------- 1. la peau : on lui rend son cadre -------------------------------
peau = Image.open(S + '/hide_brut.png').convert('RGB')
greffe_cadre(peau).save(S + '/peau_84.png')
print('peau : cadre greffé depuis gourde.png')


# ---------- 2. le plateau nu, reconstruit depuis bois.png --------------------
# Même méthode que pour la poche : bois.png est l'icône qui expose le plus de
# fond, et l'on comble les bûches par RECOPIE EN MIROIR, jamais par moyenne.
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
cout = pl.filter(ImageFilter.GaussianBlur(0.8)).load()
for (x, y) in trou:
    if any((x + dx, y + dy) not in trou for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
        p[x, y] = cout[x, y]
greffe_cadre(pl)
pl.save(S + '/plateau_pour_cuir.png')


# ---------- 3. le cuir : découpe, pose, ombre, grain -------------------------
src = Image.open(S.replace('/scratchpad', '') and
                 r'C:/Users/IgneeFleur/Downloads/Gemini_Generated_Image_unuf8lunuf8lunuf-removebg-preview.png')
al = src.getchannel('A')
bb = al.getbbox()
cuir = src.convert('RGB').crop(bb)
ca = al.crop(bb)
cw, ch = cuir.size
print('cuir source : %dx%d, sujet %dx%d' % (src.size + (cw, ch)))

# La pièce est en paysage ; on la cale sur la LARGEUR du cadre, marges comprises.
nw = 76
nh = max(1, round(ch * nw / cw))
cuir = cuir.resize((nw, nh), Image.LANCZOS)
ca = ca.resize((nw, nh), Image.LANCZOS)
ox, oy = (W - nw) // 2, (H - nh) // 2 + 2
print('cuir posé en %dx%d à (%d,%d)' % (nw, nh, ox, oy))

out = pl.copy()
cam = ca.load()
omb = Image.new('L', (W, H), 0)
om = omb.load()
for y in range(nh):
    for x in range(nw):
        if cam[x, y] > 60:
            X, Y = ox + x + 3, oy + y + 4
            if BORD <= X < W - BORD and BORD <= Y < H - BORD:
                om[X, Y] = 255
omb = omb.filter(ImageFilter.GaussianBlur(2.6))
om = omb.load()
o = out.load()
for y in range(H):
    for x in range(W):
        a = om[x, y] / 255.0 * 0.55
        if a > 0:
            o[x, y] = tuple(round(v * (1 - a)) for v in o[x, y])
out.paste(cuir, (ox, oy), ca)

random.seed(11)
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
        L = (0.299 * r + 0.587 * gg + 0.114 * b) / 255.0
        d = (bp[x, y] - 128) / 128.0 * 11 * (0.35 + 0.65 * L)
        g[x, y] = tuple(max(0, min(255, round(v + d))) for v in (r, gg, b))
out.save(S + '/cuir_84.png')


def sonde(f, nom):
    i = Image.open(f).convert('RGB')
    q = i.load()
    fb = i.filter(ImageFilter.GaussianBlur(1.2)).load()
    z = [(x, y) for y in range(6, 26) for x in range(4, 20)]
    gr = (sum((q[x, y][c] - fb[x, y][c]) ** 2 for x, y in z for c in range(3)) / (len(z) * 3)) ** 0.5

    def moy(x0, y0, x1, y1):
        ps = [q[x, y] for y in range(y0, y1) for x in range(x0, x1)]
        return tuple(round(sum(c[j] for c in ps) / len(ps)) for j in range(3))
    print('  %-14s cadre %s  plateau %s  grain %.2f' % (nom, moy(0, 60, 2, 70), moy(4, 6, 16, 20), gr))


for n, f in (('cuir', S + '/cuir_84.png'), ('peau', S + '/peau_84.png'),
             ('gourde', D + '/gourde.png'), ('poche', D + '/poche.png')):
    sonde(f, n)

st = Image.new('RGB', (W * 5 * 4 + 50, H * 5 + 20), (233, 226, 205))
for i, f in enumerate([S + '/cuir_84.png', S + '/peau_84.png', D + '/gourde.png', D + '/poche.png']):
    st.paste(Image.open(f).convert('RGB').resize((W * 5, H * 5), Image.NEAREST), (10 + i * (W * 5 + 10), 10))
st.save(S + '/cuir_planche.png')
print('planche : CUIR | PEAU | gourde | poche')
