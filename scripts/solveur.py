# -*- coding: utf-8 -*-
"""Régénère la page du solveur d'enchaînements à partir du chapitre.

Le solveur embarquait un instantané des armes, écrit à la main : dès qu'une base
ou un trajet changeait dans le livre, il mentait. Il se refait maintenant d'une
commande, et il tire ses chiffres de la même lecture que le reste :

    python scripts/solveur.py
    python scripts/solveur.py --sortie docs/outils/solveur.html

Les dégâts suivent exactement la règle du hook — base de l'arme, multiplicateur
du coup, produit arrondi au pair le plus proche.
"""
import argparse
import io
import json
import os
import re
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RACINE, "scripts"))
import duel_armes as D  # noqa: E402  — même lecture, mêmes chiffres

GABARIT = os.path.join(RACINE, "scripts", "solveur.tpl.html")
SORTIE = os.path.join(RACINE, "docs", "outils", "solveur.html")

# Le sous-titre et la difficulté ne servent qu'à l'affichage : ils ne sont pas
# dans ce que lit duel_armes, on les reprend ici.
CARTE = re.compile(r'<p class="geste-nom">([^<]*)(?:<em>([^<]*)</em>)?</p>\s*'
                   r'<p class="geste-diff">attaque (\d+)', re.S)


def details(chemin=D.CHAPITRE):
    """nom du coup -> (sous-titre, difficulté)."""
    s = io.open(chemin, encoding="utf-8").read()
    return {m.group(1).strip(): (m.group(2), int(m.group(3)))
            for m in CARTE.finditer(s)}


def armes():
    extra = details()
    out = []
    for f in D.lire_chapitre():
        D.chiffrer(f)
        coups = []
        for c in f["coups"]:
            terme, att = extra.get(c["nom"], (None, 5))
            coups.append(dict(nom=c["nom"], terme=terme, trajet=c["trajet"],
                              garde=c["garde"], plein=c["valeur"], att=att))
        out.append(dict(arme=f["arme"], base=f["base"], coups=coups))
    return out


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--sortie", default=SORTIE, metavar="FICHIER")
    p.add_argument("--gabarit", default=GABARIT, metavar="FICHIER")
    a = p.parse_args()

    donnees = armes()
    j = json.dumps(donnees, ensure_ascii=False, separators=(",", ":"))
    if "</script" in j:
        p.error("les données referment la balise script")
    s = io.open(a.gabarit, encoding="utf-8").read()
    i = s.index("<script>\n(function")
    s = s[:i] + "<script>window.__ARMES__=%s;</script>\n" % j + s[i:]
    io.open(a.sortie, "w", encoding="utf-8", newline="\n").write(s)

    print("%s — %d armes, %d coups"
          % (a.sortie, len(donnees), sum(len(x["coups"]) for x in donnees)))
    for x in donnees:
        v = [c["plein"] for c in x["coups"]]
        print("   %-26s base %-4s dégâts %s"
              % (x["arme"], x["base"] if x["base"] else "—",
                 " ".join(str(n) for n in v)))


if __name__ == "__main__":
    if hasattr(sys.stdout, "buffer"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    main()
