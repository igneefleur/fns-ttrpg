# -*- coding: utf-8 -*-
"""Les originaux manquants : mise en place et premiers traitements.

Toutes ces sources sont DEJA des cartes au rapport 84/128, plateau et cadre
compris. Comme pour le pot, on ne detoure rien : on redimensionne, et on ne
touche qu'a ce qui gene.

Trois gestes seulement dans ce lot :
  - retirer le logo Gemini, une petite etoile pale en bas a droite ;
  - retirer le halo dore peint autour de la fiole ;
  - refaire les eaux, dont l'icone du wiki porte la BARRE DE DOSES du jeu, une
    colonne de cinq cases sur le bord gauche. On ne la gomme pas : on repart de
    la gourde propre et on lui greffe le seul indicateur du coin bas droit.
"""
import io
import os
import shutil
import sys
from collections import deque

from PIL import Image, ImageFilter

D = r'c:/Users/IgneeFleur/Documents/Github/fns-owd-beta/docs/assets/objets'
DL = r'C:/Users/IgneeFleur/Downloads'
S = (r'C:/Users/IGNEEF~1/AppData/Local/Temp/claude/'
     r'c--Users-IgneeFleur-Documents-Github-fns-ttrpg/'
     r'd943426d-1602-45f6-8810-fbde9268f03c/scratchpad')
W, H = 84, 128
sys.stdout.reconfigure(encoding='utf-8')
L = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def sans_logo(im, coin=0.16, seuil=1.55, marge=0.02):
    """Efface la petite etoile Gemini du coin bas droit.

    On la reconnait a ce qu'elle est nettement plus claire que la mediane de son
    coin, et compacte. On la remplace par un flou de son voisinage, pris assez
    large pour ne pas laisser d'aureole."""
    w, h = im.size
    k = int(min(w, h) * coin)
    m0 = int(min(w, h) * marge)
    boite = (w - k - m0, h - k - m0, w - m0, h - m0)
    zone = im.crop(boite)
    zp = zone.load()
    v = sorted(L(zp[x, y]) for y in range(zone.height) for x in range(zone.width))
    med = v[len(v) // 2]
    masque = Image.new('L', zone.size, 0)
    mp = masque.load()
    n = 0
    for y in range(zone.height):
        for x in range(zone.width):
            if L(zp[x, y]) > max(med * seuil, med + 22):
                mp[x, y] = 255
                n += 1
    if not n:
        return im, 0
    masque = masque.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2.0))
    flou = zone.filter(ImageFilter.GaussianBlur(max(3, k // 5)))
    fp, mp = flou.load(), masque.load()
    for y in range(zone.height):
        for x in range(zone.width):
            a = mp[x, y] / 255.0
            if a > 0.01:
                zp[x, y] = tuple(round(zp[x, y][i] * (1 - a) + fp[x, y][i] * a)
                                 for i in range(3))
    im.paste(zone, boite[:2])
    return im, n


def carte(src, sortie, logo=False):
    im = Image.open(src).convert('RGB')
    n = 0
    if logo:
        im, n = sans_logo(im)
    im = im.resize((W, H), Image.LANCZOS)
    im.save(sortie)
    return n


# ---------------- les cartes sans traitement ----------------
SIMPLES = [
    ('gourde.png',      'containers', S + '/wiki_Waterskin.png',    False),
    ('bois.png',        'materials',  S + '/wiki_Wood.png',         False),
    ('sable_bleu.png',  'powders',    S + '/wiki_Blue_Sand.png',    False),
    ('cendre.png',      'powders',    DL + '/wmremove-transformed(2).png', False),
    ('eau_potable.png', 'liquids',    S + '/wiki_Clean_Water.png',  False),
    ('poche.png',       'containers',
     DL + '/Gemini_Generated_Image_hnt9azhnt9azhnt9(1).png', True),
    ('sable.png',       'powders',
     DL + '/Gemini_Generated_Image_l8by38l8by38l8by.jpeg', True),
]
for nom, fam, src, logo in SIMPLES:
    n = carte(src, os.path.join(D, 'edited', fam, nom), logo)
    print('   %-18s %s' % (nom, ('logo efface : %d px' % n) if logo else 'tel quel'))


# ---------------- les eaux : la gourde propre + son indicateur ----------------
def indicateur(petite):
    """Ou est l'indicateur, et a quoi ressemble-t-il ?

    L'icone d'eau EST la gourde du wiki plus une pastille en bas a droite. On
    trouve la pastille en comparant a la gourde nue, ramenee a la meme taille."""
    pet = Image.open(petite).convert('RGB').resize((W, H), Image.LANCZOS)
    nue = Image.open(S + '/wiki_Waterskin.png').convert('RGB')
    pp, np_ = pet.load(), nue.load()
    m = Image.new('L', (W, H), 0)
    mp = m.load()
    # L'indicateur vit TOUJOURS dans le coin bas droit. Chercher ailleurs, c'est
    # ramasser la barre de doses a gauche, et surtout le decalage du cadre quand
    # l'icone n'a pas exactement le rapport 84/128 -- ce qui a fait perdre les
    # cailloux de l'eau salee, dont l'icone fait 65x97.
    x0, x1 = int(W * 0.50), int(W * 0.97)
    y0, y1 = int(H * 0.55), int(H * 0.97)
    for y in range(y0, y1):
        for x in range(x0, x1):
            d = sum(abs(pp[x, y][i] - np_[x, y][i]) for i in range(3))
            if d > 90:
                mp[x, y] = 255
    m = m.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    # la plus grande tache : la pastille, pas les differences de compression
    vu = bytearray(W * H)
    best, bn = None, 0
    for sy in range(H):
        for sx in range(W):
            if vu[sy * W + sx] or mp[sx, sy] < 128:
                continue
            q, comp = deque([(sx, sy)]), []
            vu[sy * W + sx] = 1
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and not vu[ny * W + nx] and mp[nx, ny] >= 128:
                        vu[ny * W + nx] = 1
                        q.append((nx, ny))
            if len(comp) > bn:
                best, bn = comp, len(comp)
    out = Image.new('L', (W, H), 0)
    op = out.load()
    for (x, y) in (best or []):
        op[x, y] = 255
    return pet, out.filter(ImageFilter.GaussianBlur(0.8)), bn


EAUX = [('eau_riviere.png', S + '/wiki_River_Water.png'),
        ('eau_salee.png',   S + '/wiki_Waterskin-saltwater.png'),
        ('eau_rance.png',   S + '/wiki_Rancid_Water.png')]
for nom, pet in EAUX:
    src, masque, n = indicateur(pet)
    out = Image.open(S + '/wiki_Waterskin.png').convert('RGB')
    out.paste(src, (0, 0), masque)
    out.save(os.path.join(D, 'edited', 'liquids', nom))
    print('   %-18s indicateur greffe : %d px, barre de doses ecartee' % (nom, n))

pl = Image.new('RGB', (W * 7 + 80, H + 20), (30, 26, 20))
for i, f in enumerate(['containers/gourde.png', 'containers/poche.png',
                       'materials/bois.png', 'powders/sable.png',
                       'powders/sable_bleu.png', 'powders/cendre.png',
                       'liquids/eau_potable.png']):
    pl.paste(Image.open(os.path.join(D, 'edited', f)), (10 + i * (W + 10), 10))
pl.resize((pl.width * 2, pl.height * 2), Image.NEAREST).save(S + '/lot1a.png')

pl = Image.new('RGB', (W * 4 + 50, H + 20), (30, 26, 20))
for i, f in enumerate(['liquids/eau_potable.png', 'liquids/eau_riviere.png',
                       'liquids/eau_salee.png', 'liquids/eau_rance.png']):
    pl.paste(Image.open(os.path.join(D, 'edited', f)), (10 + i * (W + 10), 10))
pl.resize((pl.width * 3, pl.height * 3), Image.NEAREST).save(S + '/lot1b.png')
print('\nplanches : lot1a (divers) et lot1b (les quatre eaux)')
