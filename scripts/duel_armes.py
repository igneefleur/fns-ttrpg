# -*- coding: utf-8 -*-
"""Mesure des armes les unes contre les autres, monocible et multicible.

Deux armes ou davantage : elles sont toutes résolues sur les mêmes terrains, et
l'arme devant est celle qui rend le plus. Le défaut est le trio à une main.

Le solveur du site ne place qu'un ennemi ; celui-ci en place jusqu'à trois, et
il énumère TOUS les placements au lieu d'en choisir. Les règles sont exactement
celles du chapitre :

  · un enchaînement s'OUVRE et se FERME sur une touche ;
  · la garde d'arrivée d'un coup ouvre le suivant, aucun coup ne se répète ;
  · un pas est permis entre deux coups, la direction ne change pas ;
  · une case blanche rend la moitié et INTERROMPT — le coup s'arrête là et la
    garde revient au centre.

La géométrie n'est pas réécrite : elle est prise au hook, qui est la seule
source. Rien n'est modifié dans le livre, on ne fait que lire.

    python scripts/duel_armes.py
    python scripts/duel_armes.py Épée Hache Masse
    python scripts/duel_armes.py Épée Hache --base "Hache=22"
    python scripts/duel_armes.py --refonte candidate.json --page duel.html
    python scripts/duel_armes.py --page docs/outils/duel-armes.html

Ni « --base » ni « --refonte » ne touchent au fichier : ils rejouent la mesure
comme si l'arme portait cette base, ces trajets, ces gardes, ces multiplicateurs.
C'est la façon de savoir ce qu'un changement vaudrait avant de l'écrire. Une
valeur qui ne tombe pas juste est arrondie au pair le plus proche, et le
rapport le dit.
"""
import argparse
import io
import itertools
import json
import os
import re
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RACINE, "hooks"))
import armes as hook  # noqa: E402  — la géométrie a une seule source

CHAPITRE = os.path.join(RACINE, "docs", "content", "regles", "combat", "armes.md")
GABARIT = os.path.join(RACINE, "scripts", "duel_armes.tpl.html")

# Le nom d'une arme est suivi de son bandeau de portée, celui d'un coup de son
# sous-titre ou de la fermeture : dans les deux cas, on s'arrête au premier « < ».
ARME = re.compile(r'<div class="arme"((?:\s+data-[a-z]+="[^"]*")*)>\s*'
                  r'<p class="arme-nom">([^<]*)')
GESTE = re.compile(r'<div class="geste"((?:\s+data-[a-z]+="[^"]*")+)>\s*'
                   r'<p class="geste-nom">([^<]*)', re.S)
ATTR = re.compile(r'data-([a-z]+)="([^"]*)"')

PAS = [(0, 0), (1, 0), (1, -1), (0, -1), (-1, 0), (-1, 1), (0, 1)]
LOIN = 8            # au-delà, l'ennemi est sorti du tour : on cesse de le suivre
PORTEE_MAX = hook.PORTEE_MAX


def distance(q, r):
    return (abs(q) + abs(q + r) + abs(r)) // 2


def _noms_de_cases(rmax):
    """nom lisible -> coordonnées, et l'inverse, pour les anneaux 0 à rmax."""
    vers, depuis = {}, {}
    for n in range(rmax + 1):
        for k in (range(-3 * n, 3 * n) if n else [0]):
            nom = "soi" if n == 0 else "%d%s%s" % (
                n, "" if k == 0 else ("d" if k > 0 else "g"),
                abs(k) if abs(k) > 1 else "")
            c = hook._case(nom)
            vers[nom] = c
            depuis[c] = nom
    return vers, depuis


VERS, DEPUIS = _noms_de_cases(PORTEE_MAX)


# ── Lecture du chapitre ──────────────────────────────────────────────────────

def lire_chapitre(chemin=CHAPITRE):
    s = io.open(chemin, encoding="utf-8").read()
    bornes = [(m.start(), m.group(2).strip(), dict(ATTR.findall(m.group(1))))
              for m in ARME.finditer(s)]
    out = []
    for i, (p, nom, at) in enumerate(bornes):
        fin = bornes[i + 1][0] if i + 1 < len(bornes) else len(s)
        base = int(at["base"]) if "base" in at else None
        coups = []
        for m in GESTE.finditer(s[p:fin]):
            a = dict(ATTR.findall(m.group(1)))
            brut = a["degats"].split()[0]
            coups.append(dict(nom=m.group(2).strip(), trajet=a["trajet"],
                              garde=a["garde"], types=a["degats"].split(" ", 1)[1],
                              mult=float(brut) if base else None,
                              valeur=None if base else int(brut)))
        out.append(dict(arme=nom, base=base, coups=coups))
    return out


def pair_proche(x):
    """La valeur verte doit être paire : la blanche en vaut la moitié."""
    return 2 * int(x / 2.0 + 0.5)


def chiffrer(fiche, base=None):
    """Donne à chaque coup sa valeur. Une base passée ici remplace celle du
    livre — c'est la mesure d'un « et si ». Retourne aussi les arrondis."""
    b = base if base is not None else fiche["base"]
    arrondis = []
    for c in fiche["coups"]:
        if c["mult"] is None:
            continue
        exact = b * c["mult"]
        c["valeur"] = pair_proche(exact)
        if abs(c["valeur"] - exact) > 1e-9:
            arrondis.append((c["nom"], round(exact, 2), c["valeur"]))
    fiche["base_mesuree"] = b
    fiche["arrondis"] = arrondis
    return fiche


# ── Le moteur ────────────────────────────────────────────────────────────────

def preparer(fiche):
    coups = []
    for c in fiche["coups"]:
        etapes = []
        for bout in c["trajet"].split(">"):
            nom, _, role = bout.partition(":")
            p = hook._case(nom.strip())
            if p is not None:
                etapes.append((p, role.strip() == "frappe"))
        dep, arr = (int(x) for x in c["garde"].split(">"))
        coups.append(dict(nom=c["nom"], garde=c["garde"], dep=dep, arr=arr,
                          plein=c["valeur"], moitie=c["valeur"] // 2,
                          mult=c["mult"], etapes=etapes,
                          vertes=[DEPUIS[p] for p, f in etapes if f],
                          blanches=[DEPUIS[p] for p, f in etapes if not f]))
    return coups


def resoudre(coup, cibles):
    """Le trajet se lit DANS L'ORDRE : le premier ennemi rencontré sur une case
    blanche arrête le coup, et ce qui vient après ne porte pas."""
    total, coupe = 0, False
    for p, frappe in coup["etapes"]:
        if p in cibles:
            if frappe:
                total += coup["plein"]
            else:
                total += coup["moitie"]
                coupe = True
                break
    return total, coupe


def chercher(coups, cibles, interruption):
    """Meilleur total du tour, par nombre de coups engagés.

    L'état porte tout ce dont la suite dépend : où sont les ennemis (relativement
    au porteur, que le pas déplace), la garde, les coups déjà donnés, et si le
    DERNIER a touché — une suite qui finit à vide ne compte pas mais peut encore
    se prolonger, elle ne doit donc pas chasser celle qui finit sur une touche.
    """
    n_coups = len(coups)
    front = {}

    def poser(m, cle, val):
        vieux = m.get(cle)
        if vieux is None or vieux[0] < val[0]:
            m[cle] = val

    def apres_le_pas(cibles, i):
        dq, dr = PAS[i]
        c = frozenset((q - dq, r - dr) for q, r in cibles)
        return None if any(distance(q, r) > LOIN for q, r in c) else c

    for k in range(n_coups):
        deg, coupe = resoudre(coups[k], cibles)
        if not deg or (coupe and not interruption):
            continue
        g = 5 if coupe else coups[k]["arr"]
        for i in range(len(PAS)):
            c = apres_le_pas(cibles, i)
            if c is not None:
                poser(front, (c, g, 1 << k, 1), (deg, [(k, deg, coupe, i)]))

    meilleurs, n = [None] * (n_coups + 1), 1
    while front and n <= n_coups:
        fini = [v for (c, g, u, t), v in front.items() if t]
        meilleurs[n] = max(fini, key=lambda v: v[0]) if fini else None
        suivant = {}
        for (cib, g, u, t), (tot, suite) in front.items():
            for k in range(n_coups):
                if u & (1 << k) or coups[k]["dep"] != g:
                    continue
                deg, coupe = resoudre(coups[k], cib)
                if coupe and not interruption:
                    continue
                g2 = 5 if coupe else coups[k]["arr"]
                for i in range(len(PAS)):
                    c = apres_le_pas(cib, i)
                    if c is None:
                        continue
                    poser(suivant, (c, g2, u | (1 << k), 1 if deg else 0),
                          (tot + deg, suite + [(k, deg, coupe, i)]))
        front, n = suivant, n + 1
    return meilleurs


def total(coups, cibles, interruption=False):
    m = chercher(coups, cibles, interruption)
    haut = max([v[0] for v in m if v] or [0])
    combien = max([i for i, v in enumerate(m) if v] or [0])
    plein = max((v for v in m if v), key=lambda v: v[0], default=None)
    return haut, combien, ([coups[i]["nom"] for i, _, _, _ in plein[1]] if plein else [])


# ── Les mesures ──────────────────────────────────────────────────────────────

CASES = [c for c in DEPUIS if c != (0, 0)]

FORMATIONS = [("un seul devant", ["2"]),
              ("un seul au contact", ["1"]),
              ("deux de front", ["2", "2d"]),
              ("deux écartés", ["2g", "2d"]),
              ("trois de front", ["2g", "2", "2d"]),
              ("trois en arc", ["2g2", "2", "2d2"]),
              ("un devant, un au contact", ["2", "1d"]),
              ("pris en tenaille", ["2", "2d3"])]


def mesurer(fiche):
    """Tout ce qui ne dépend que de l'arme."""
    coups = preparer(fiche)
    devant = frozenset([VERS["2"]])
    cases = []
    for z in CASES:
        nat = total(coups, frozenset([z]))[0]
        inter = total(coups, frozenset([z]), True)[0]
        if nat or inter:
            cases.append(dict(case=DEPUIS[z], anneau=distance(*z), nat=nat,
                              inter=inter))
    cases.sort(key=lambda x: (-x["nat"], -x["inter"]))
    return dict(
        arme=fiche["arme"], base=fiche["base_mesuree"],
        arrondis=fiche["arrondis"],
        coups=[dict(nom=c["nom"], garde=c["garde"], mult=c["mult"],
                    deg=c["plein"], vertes=c["vertes"], blanches=c["blanches"])
               for c in coups],
        paliers=[v[0] if v else 0 for v in chercher(coups, devant, False)],
        cases=cases)


def confronter(fiches, profondeur=3):
    """Toutes les armes sur le MÊME terrain, formations nommées puis balayage.

    Deux armes ou dix, la mesure est la même : chaque terrain est résolu par
    chacune, et l'arme DEVANT est celle qui rend le plus. Quand deux armes ou
    plus arrivent en tête du même terrain, il ne compte pour aucune et va aux
    égalités : la somme des « devant » ne fait donc pas le total des terrains.
    """
    prets = [preparer(f) for f in fiches]
    out = dict(formations=[], balayage={})
    for nom, noms in FORMATIONS:
        jeu = frozenset(VERS[x] for x in noms)
        cotes = []
        for c in prets:
            e, n, suite = total(c, jeu)
            cotes.append(dict(e=e, n=n, suite=suite, i=total(c, jeu, True)[0]))
        out["formations"].append(dict(nom=nom, cases=noms, armes=cotes))
    for k in range(1, profondeur + 1):
        devant = [0] * len(prets)
        sommes = [0] * len(prets)
        utiles = egal = 0
        for jeu in itertools.combinations(CASES, k):
            f = frozenset(jeu)
            v = [total(c, f)[0] for c in prets]
            if not any(v):
                continue
            utiles += 1
            for i, x in enumerate(v):
                sommes[i] += x
            haut = max(v)
            if v.count(haut) > 1:
                egal += 1
            else:
                devant[v.index(haut)] += 1
        out["balayage"][k] = dict(
            utiles=utiles, egal=egal,
            armes=[dict(devant=devant[i], moy=round(sommes[i] / utiles, 1))
                   for i in range(len(prets))])
        print("   %d ennemi(s) : %6d terrains · %s · égalités %5d"
              % (k, utiles,
                 " · ".join("%s devant %5d (moy %.1f)"
                            % (f["arme"][:12], devant[i], sommes[i] / utiles)
                            for i, f in enumerate(fiches)), egal),
              file=sys.stderr)
    return out


# ── Sortie ───────────────────────────────────────────────────────────────────

def rapport(m):
    print("\n%s — base %d" % (m["arme"], m["base"]))
    print("   %-34s %-6s %-6s %-5s %-22s %s"
          % ("COUP", "GARDE", "MULT", "DÉG", "VERTES", "BLANCHES"))
    for c in m["coups"]:
        print("   %-34s %-6s %-6s %-5d %-22s %s"
              % (c["nom"][:34], c["garde"],
                 ("×%.1f" % c["mult"]) if c["mult"] else "—", c["deg"],
                 " ".join(c["vertes"]), " ".join(c["blanches"])))
    v = sum(len(c["vertes"]) for c in m["coups"])
    b = sum(len(c["blanches"]) for c in m["coups"])
    d = sorted({x for c in m["coups"] for x in c["vertes"]})
    print("   %d vertes sur %d cases distinctes (%s) · %d blanches · somme %d"
          % (v, len(d), " ".join(d), b, sum(c["deg"] for c in m["coups"])))
    print("   monocible, ennemi à deux pas droit devant : %s"
          % "  ".join("%d coup%s %d" % (i, "s" if i > 1 else "", m["paliers"][i])
                      for i in range(1, min(6, len(m["paliers"])))))
    print("   cases d'où un enchaînement s'ouvre : %d — %s"
          % (sum(1 for c in m["cases"] if c["nat"]),
             " ".join("%s:%d" % (c["case"], c["nat"]) for c in m["cases"] if c["nat"])))
    for nom, exact, mis in m["arrondis"]:
        print("   *** %s : %g arrondi à %d" % (nom, exact, mis))


def page(donnees, sortie, gabarit=GABARIT):
    s = io.open(gabarit, encoding="utf-8").read()
    j = json.dumps(donnees, ensure_ascii=False, separators=(",", ":"))
    assert "</script" not in j
    io.open(sortie, "w", encoding="utf-8", newline="\n").write(
        s.replace("__DONNEES__", j))
    print("\npage écrite : %s (%d octets)" % (sortie, len(s) + len(j)))


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("armes", nargs="*",
                   default=["Épée à une", "Hache à une", "Masse à une"],
                   help="deux préfixes de noms d'armes ou plus "
                        "(défaut : les trois à une main)")
    p.add_argument("--base", action="append", default=[], metavar="ARME=N",
                   help="rejoue la mesure avec une autre base, sans rien écrire")
    p.add_argument("--refonte", "--trajets", dest="refonte", metavar="FICHIER",
                   help="rejoue la mesure avec d'autres coups, sans rien écrire : un "
                        "JSON { \"nom du coup\": \"trajet\" } ou, pour changer aussi "
                        "la garde ou le multiplicateur, { \"nom du coup\": {\"trajet\": "
                        "…, \"garde\": \"7>6\", \"mult\": 1.2} }. Sert à essayer une "
                        "refonte avant de l'écrire dans le chapitre.")
    p.add_argument("--balayage", type=int, default=3, metavar="N",
                   help="profondeur du balayage complet, en ennemis (défaut 3)")
    p.add_argument("--page", metavar="FICHIER", help="écrit la page de comparaison")
    p.add_argument("--json", metavar="FICHIER", help="écrit les mesures brutes")
    p.add_argument("--depuis", metavar="FICHIER",
                   help="refait la page à partir de mesures déjà écrites, sans "
                        "recalculer : le balayage complet coûte plusieurs minutes")
    a = p.parse_args()

    # Refaire la page seule, quand seul le gabarit a bougé.
    if a.depuis:
        if not a.page:
            p.error("« --depuis » veut « --page »")
        page(json.load(io.open(a.depuis, encoding="utf-8")), a.page)
        return

    if len(a.armes) < 2:
        p.error("il faut au moins deux armes")

    forcees = {}
    for x in a.base:
        nom, _, val = x.partition("=")
        forcees[nom.strip().lower()] = int(val)

    refonte = {}
    if a.refonte:
        refonte = json.load(io.open(a.refonte, encoding="utf-8"))
        for nom, v in refonte.items():
            if isinstance(v, str):
                refonte[nom] = {"trajet": v}
            inconnu = set(refonte[nom]) - {"trajet", "garde", "mult"}
            if inconnu:
                p.error("« %s » : clefs inconnues %s" % (nom, ", ".join(sorted(inconnu))))

    chapitre = lire_chapitre()
    choisies = []
    for pref in a.armes:
        f = [x for x in chapitre if x["arme"].lower().startswith(pref.lower())]
        if len(f) != 1:
            p.error("« %s » désigne %d armes : %s"
                    % (pref, len(f), ", ".join(x["arme"] for x in chapitre)))
        fiche = f[0]
        for c in fiche["coups"]:
            if c["nom"] in refonte:
                c.update(refonte.pop(c["nom"]))
        forcee = next((v for k, v in forcees.items()
                       if fiche["arme"].lower().startswith(k)), None)
        choisies.append(chiffrer(fiche, forcee))
    if refonte:
        p.error("coups inconnus dans « %s » : %s"
                % (a.refonte, ", ".join(sorted(refonte))))

    mesures = [mesurer(f) for f in choisies]
    for m in mesures:
        rapport(m)
    print("\nbalayage complet, mêmes terrains pour toutes :", file=sys.stderr)
    duel = confronter(choisies, a.balayage)

    donnees = dict(cases={n: [round(x, 3) for x in hook._centre(*c)]
                          for n, c in VERS.items() if distance(*c) <= 2},
                   armes=mesures, duel=duel)
    if a.json:
        io.open(a.json, "w", encoding="utf-8", newline="\n").write(
            json.dumps(donnees, ensure_ascii=False, indent=1))
        print("\nmesures écrites : %s" % a.json)
    if a.page:
        page(donnees, a.page)


if __name__ == "__main__":
    if hasattr(sys.stdout, "buffer"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
    main()
