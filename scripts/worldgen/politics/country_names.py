# -*- coding: utf-8 -*-
"""Etape 4 — NOMS DES PAYS (selon culture + religion).

La SONORITE du nom vient de la CULTURE dominante (pays d'une meme culture -> noms apparentes,
comme France/Espagne/Italie partagent une sonorite romane). La FORME POLITIQUE (long form) depend
de la RELIGION et du seculier : theocratie / saint royaume pour les tres religieux, republique /
federation pour les seculiers, empire/grand pour les grands, principaute/cite pour les petits.
Racines INVENTEES (aucun mot reel emprunte). Sortie : country_names.json + carte_pays_noms.png
"""
import os, sys, json, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import polgraph, namegen as NG, render_pol as R
from scipy import ndimage
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe

DOCS = r'C:\Users\IgneeFleur\Documents\Github\fns-ttrpg\docs\assets\cartes'
SITE = r'C:\Users\IgneeFleur\Documents\Github\fns-ttrpg\site\assets\cartes'
SEED = 314159265
P = polgraph.load(); K = P.K; NODES = list(range(1, K + 1))
with open(os.path.join(HERE, 'cultures.json'), encoding='utf-8') as f:
    CJ = json.load(f)
with open(os.path.join(HERE, 'religions.json'), encoding='utf-8') as f:
    RJ = json.load(f)
DOM_CULT = {int(k): v for k, v in CJ['dominant'].items()}
CULT_ARCH = {c['id']: c['archetype'] for c in CJ['cultures']}
CULT_COLOR = {c['id']: c['color'] for c in CJ['cultures']}
DOM_REL = {int(k): v for k, v in RJ['dominant'].items()}
REL_BLEND = {int(k): {int(r): p for r, p in v.items()} for k, v in RJ['country_religion'].items()}
SEC_ID = RJ['sec_id']

# formes politiques (mots FR generiques ; la racine X est inventee via la culture)
FORMS_SECULAR = ["République de {X}", "Fédération de {X}", "Union de {X}", "États de {X}", "République de {X}"]
FORMS_RELIG = ["Théocratie de {X}", "Dominion de {X}", "Royaume de {X}", "Ordre de {X}", "Protectorat de {X}"]
FORMS_BIG = ["Empire de {X}", "Grand {X}", "Hégémonie de {X}", "Empire de {X}"]
FORMS_SMALL = ["Principauté de {X}", "Cité de {X}", "Duché de {X}", "Marche de {X}", "Comté de {X}"]
FORMS_NEUTRAL = ["Royaume de {X}", "État de {X}", "{X}", "Pays de {X}", "Confédération de {X}"]


def anchor(mask):
    ys, xs = np.where(mask)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    sub = mask[y0:y1, x0:x1]
    dt = ndimage.distance_transform_edt(sub)
    iy, ix = np.unravel_index(np.argmax(dt), dt.shape)
    return y0 + iy, x0 + ix


def main():
    rng = np.random.default_rng(SEED + 4242)
    used = set(c['name'] for c in CJ['cultures']) | set(r['name'] for r in RJ['religions'])
    a = P.area; p80 = np.percentile(a, 80); p30 = np.percentile(a, 30)
    names = {}; longforms = {}
    for v in NODES:
        arch = CULT_ARCH.get(DOM_CULT[v], 'latin')
        for _ in range(40):
            root = NG.make_name(arch, rng)
            if root not in used and 3 <= len(root) <= 11:
                break
        used.add(root); names[v] = root
        # forme politique selon religion / seculier / taille
        bl = REL_BLEND.get(v, {})
        sec = bl.get(SEC_ID, 0)
        domr = DOM_REL[v]; domshare = bl.get(domr, 0)
        r = rng.random()
        if sec >= 45:
            form = str(rng.choice(FORMS_SECULAR))
        elif domr != SEC_ID and domshare >= 55 and sec <= 18:
            form = str(rng.choice(FORMS_RELIG))
        elif a[v - 1] >= p80 and r < 0.7:
            form = str(rng.choice(FORMS_BIG))
        elif a[v - 1] <= p30 and r < 0.6:
            form = str(rng.choice(FORMS_SMALL))
        else:
            form = str(rng.choice(FORMS_NEUTRAL))
        longforms[v] = form.replace("{X}", root)

    with open(os.path.join(HERE, 'country_names.json'), 'w', encoding='utf-8') as f:
        json.dump(dict(names={str(v): names[v] for v in NODES},
                       longforms={str(v): longforms[v] for v in NODES}), f, ensure_ascii=False)
    print('country_names.json ecrit :', len(names), 'pays nommes', flush=True)
    print('exemples :', [longforms[v] for v in list(NODES)[:8]], flush=True)

    # ---- carte : couleur par culture (eclaircie) + noms ----
    Nc = max(CULT_COLOR) if CULT_COLOR else 1
    ccube = np.zeros((Nc + 1, 3), np.float32); ccube[0] = R.OCEAN
    for cidk, col in CULT_COLOR.items():
        ccube[cidk] = 0.45 * np.array(col) + 0.55       # eclaircit pour lisibilite du texte
    cult_labels = np.zeros_like(P.labels)
    for v in NODES:
        cult_labels[P.labels == v] = DOM_CULT[v]

    g = R.geom(); xmin, xmax, ymin, ymax = g['extent']
    labels_anchor = {}
    for v in NODES:
        if a[v - 1] < 150:
            continue
        cy, cx = anchor(P.labels == v)
        labels_anchor[v] = (cy, cx)

    def draw_labels(ax, gg):
        for v, (cy, cx) in labels_anchor.items():
            xd = xmin + (cx + 0.5) / P.W * (xmax - xmin)
            yd = ymax - (cy + 0.5) / P.H * (ymax - ymin)
            fs = float(np.clip(np.sqrt(a[v - 1]) / 7.0 + 3.2, 4.6, 15.0))
            nm = names[v]
            t = ax.text(xd, yd, nm, ha='center', va='center', fontsize=fs, zorder=8,
                        color='#20242b', fontfamily='serif')
            t.set_path_effects([pe.withStroke(linewidth=max(1.5, fs * 0.22), foreground='white')])

    for dest in (DOCS, SITE, HERE):
        R.choropleth(cult_labels, ccube, os.path.join(dest, 'carte_pays_noms.png'),
                     land=P.land, borders=True, coast=True, extra=draw_labels)
    print('carte_pays_noms.png', flush=True)


if __name__ == '__main__':
    main()
