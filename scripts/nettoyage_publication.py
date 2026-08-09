# -*- coding: utf-8 -*-
"""Nettoyage de publication : à lancer sur main AVANT tout push vers le site officiel.

Tout le travail en cours vit sur la branche beta ; main ne publie que le fini.
Après un merge de beta vers main, ce script retire tout ce qui est incomplet :

  1. les cartes d'arts (<div class="mcard art">) contenant TODO ;
  2. les lignes de note « > **TODO … » des autres pages ;
  3. les pages de contenu vides (titre seul) ou encore marquées TODO, SAUF les
     cibles de liens à garder (avantages.md, classe.md), ramenées au titre seul ;
  4. les entrées de la nav de mkdocs.yml pointant vers un fichier disparu, et les
     sections de nav vidées par ces retraits.

Le script est idempotent : sur un main déjà propre, il ne touche à rien. S'il
reste des TODO qu'il ne sait pas trancher (TODO en pleine prose d'une page par
ailleurs finie), il les liste et sort en erreur : à traiter à la main.

Usage : python scripts/nettoyage_publication.py
        (puis mkdocs build, vérifications, commit et push)
"""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
RACINE = Path(__file__).resolve().parent.parent
CONTENT = RACINE / "docs" / "content"
MKDOCS = RACINE / "mkdocs.yml"

# Pages gardées même vides : des règles finies pointent dessus (liens inline).
# On les ramène au titre seul au lieu de les supprimer.
CIBLES_DE_LIENS = {
    CONTENT / "regles" / "personnage" / "avantages.md",
    CONTENT / "regles" / "personnage" / "classe.md",
}

CARTE_ART = re.compile(r'<div class="mcard art" markdown[^>]*>.*?</div>\n?', re.S)
NOTE_TODO = re.compile(r"^>\s*\*\*TODO.*$\n?", re.M)

cartes_retirees, notes_retirees, pages_supprimees, pages_reduites = [], [], [], []
restes = []   # TODO que le script ne tranche pas

for f in sorted(CONTENT.rglob("*.md")):
    texte = f.read_text(encoding="utf-8")
    original = texte

    # 1. Cartes d'arts en TODO.
    def _carte(m):
        if "TODO" in m.group(0):
            nom = re.search(r"\*\*(.+?)\*\*", m.group(0))
            cartes_retirees.append(f"{f.name} : {nom.group(1) if nom else '?'}")
            return ""
        return m.group(0)
    texte = CARTE_ART.sub(_carte, texte)

    # 2. Notes « > **TODO … ».
    n = len(NOTE_TODO.findall(texte))
    if n:
        notes_retirees.append(f"{f.name} ({n})")
        texte = NOTE_TODO.sub("", texte)

    texte = re.sub(r"\n{3,}", "\n\n", texte)

    # 3. Pages vides ou encore TODO.
    corps = re.sub(r"^#.*$", "", texte, count=1, flags=re.M)
    corps = re.sub(r'</?div[^>]*>|\s+', " ", corps).strip()
    if "TODO" in corps or len(corps) < 40:
        if f in CIBLES_DE_LIENS:
            titre = texte.splitlines()[0]
            if texte.strip() != titre:
                f.write_text(titre + "\n", encoding="utf-8")
                pages_reduites.append(f.name)
            continue
        if "TODO" in corps and len(corps) >= 40:
            # page substantielle avec TODO en pleine prose : à l'humain.
            restes.append(str(f.relative_to(RACINE)))
            if texte != original:
                f.write_text(texte, encoding="utf-8")
            continue
        f.unlink()
        pages_supprimees.append(str(f.relative_to(CONTENT)))
        continue

    if texte != original:
        f.write_text(texte, encoding="utf-8")

# 4. Nav : retirer les entrées orphelines, puis les sections vidées.
nav = MKDOCS.read_text(encoding="utf-8").splitlines(keepends=True)
sortie, nav_retirees = [], []
for ligne in nav:
    m = re.match(r"^(\s*)-\s+(?:[^:]+:\s*)?(content/[^\s]+\.md)\s*$", ligne)
    if m and not (RACINE / "docs" / m.group(2)).exists():
        nav_retirees.append(m.group(2))
        continue
    sortie.append(ligne)
# sections dont le bloc est devenu vide (ligne « - Titre: » sans enfant plus indenté)
change = True
while change:
    change = False
    for i, ligne in enumerate(sortie):
        m = re.match(r"^(\s*)-\s+[^:]+:\s*$", ligne)
        if not m:
            continue
        indent = len(m.group(1))
        j = i + 1
        vide = True
        while j < len(sortie) and sortie[j].strip():
            ind_j = len(sortie[j]) - len(sortie[j].lstrip())
            if ind_j > indent:
                vide = False
            break
        if vide:
            nav_retirees.append(sortie[i].strip())
            del sortie[i]
            change = True
            break
MKDOCS.write_text("".join(sortie), encoding="utf-8")

print(f"cartes d'arts retirées : {len(cartes_retirees)}")
for c in cartes_retirees:
    print(f"  - {c}")
print(f"notes TODO retirées : {len(notes_retirees)} {notes_retirees or ''}")
print(f"pages supprimées : {len(pages_supprimees)} {pages_supprimees or ''}")
print(f"pages réduites au titre : {len(pages_reduites)} {pages_reduites or ''}")
print(f"nav : {len(nav_retirees)} entrée(s) retirée(s) {nav_retirees or ''}")
if restes:
    print("\n✗ TODO restants à traiter À LA MAIN (pages finies avec TODO en prose) :")
    for r in restes:
        print(f"  - {r}")
    sys.exit(1)
print("✓ main est propre pour publication.")
