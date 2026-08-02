"""Hook MkDocs : extrait les règles JJK et expose jjk-creation.json.

Pont de synchronisation entre la page de règles et l'onglet « Création »
(créateur de personnage JJK). Tout ce que l'outil affiche, caractéristiques,
listes de compétences, stades, vitesses, difficultés, blessures graves et
courbes d'armes/armures, est écrit une seule fois, dans la page de règles ;
ce hook la relit au build et en fait un JSON que le créateur consomme. Une
valeur changée dans les règles se répercute donc dans l'outil.

Seule la bibliothèque standard est utilisée : la CI n'installe que
mkdocs-material. Le fichier est ajouté via l'API Files (en mémoire), on
n'écrit PAS dans docs/.

Le créateur (jjk-creation.js) porte la sémantique d'interface et les règles
de calcul prosaïques (création : 120 points de caractéristiques, max 80 ;
500 xp ; 20 xp par stade ou par +5 de caractéristique ; pas plus d'un quart
de l'xp total dans une seule compétence ; PV = (20 + Body) / 2) ; ce hook ne
fournit que le contenu.
"""
import json
import re
from pathlib import Path

from mkdocs.structure.files import File

MINUS = "−"   # signe moins typographique employé dans les règles
NDASH = "–"   # tiret de plage (U+2013)

PAGE = "content/regles/index.md"

CARACS = ["Mind", "Body", "Prestance"]
STADES = ["Non initié", "Initié", "Maitre", "Expert", "Artiste"]


def _num(s):
    """« −25 » / «+20 » / « 0 » -> int (signe moins typographique compris)."""
    return int(str(s).replace(MINUS, "-").replace(" ", ""))


def _defs(text):
    """Toutes les entrées « **Terme :** corps » du document -> {terme: corps}."""
    out = {}
    for m in re.finditer(r"\*\*([^*]+?)\s*:\*\*\s*(.+)", text):
        out[m.group(1).strip()] = m.group(2).strip()
    return out


def _mcards(text):
    """Cartes mcard « **Nom** desc » -> {nom: desc}."""
    out = {}
    for m in re.finditer(
            r'<div class="mcard" markdown>\s*\*\*([^*]+)\*\*\s*(.+?)\s*</div>',
            text, re.S):
        out[m.group(1).strip()] = re.sub(r"\s+", " ", m.group(2)).strip()
    return out


def _table_rows(text, header_re):
    """Lignes de la table markdown dont l'entête matche header_re -> [[cellules]]."""
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if re.search(header_re, line) and line.lstrip().startswith("|"):
            rows = []
            for row in lines[i + 2:]:          # saute la ligne d'alignement
                row = row.strip()
                if not row.startswith("|"):
                    break
                rows.append([c.strip() for c in row.strip("|").split("|")])
            return rows
    return []


# Compétences que la FICHE ajoute, absentes des listes de la page de règles.
# L'initiative y est une règle de combat (« Initiative = D100 + Body − poids »)
# et non une entrée de la liste des compétences de Body ; la fiche, elle, en
# fait une compétence à part entière (stade, passifs à Artiste), sur décision
# de l'utilisateur. On l'ajoute ICI plutôt que dans la page : les règles sont
# celles d'un ami et ne se réécrivent pas.
COMPS_FICHE = {"Body": ["Initiative"]}


def _comps(defs):
    """Listes de compétences (« Nage, apnée, … ») -> {carac: [noms]}.

    Les noms commencent toujours par une MAJUSCULE (« apnée » -> « Apnée »),
    quelle que soit la casse de la page de règles."""
    out = {}
    for carac in CARACS:
        body = defs.get(carac, "")
        body = re.sub(r"[…]|\.\.\.\s*$", "", body).rstrip(". ")
        noms = [n.strip() for n in body.split(",") if n.strip()]
        out[carac] = [n[0].upper() + n[1:] for n in noms]
        # jamais en double : si la page finit par la lister, la sienne prime
        connus = {n.lower() for n in out[carac]}
        for n in COMPS_FICHE.get(carac, []):
            if n.lower() not in connus:
                out[carac].append(n)
    return out


def _stades(defs):
    """Stades et leurs bonus, parsés depuis leurs définitions."""
    out = []
    bonus = 0
    techniques = False
    art = False
    for nom in STADES:
        body = defs.get(nom, "")
        m = (re.search(r"malus de (" + MINUS + r"?\d+)", body)
             or re.search(r"[Bb]onus de \+?(" + MINUS + r"?\d+)", body))
        if m:
            bonus = _num(m.group(1))
        # Le stade qui parle de « passifs » ouvre leur achat (20 xp pièce) et
        # l'art de la compétence ; l'ouverture reste acquise aux stades
        # suivants. « passif original » = le passif inclus dans le stade
        # (le créateur cumule les passifs offerts des stades atteints).
        techniques = techniques or "passif" in body.lower()
        art = art or "passif original" in body.lower()
        out.append({"nom": nom, "bonus": bonus,
                    "techniques": techniques, "art": art,
                    "techniqueOfferte": "passif original" in body.lower(),
                    "desc": body})
    return out


def _vitesses(text):
    rows = _table_rows(text, r"\|\s*Body\s*\|\s*Vitesse\s*\|")
    out = []
    for cells in rows:
        if len(cells) < 2:
            continue
        plage, vitesse = cells[0], cells[1]
        m = re.match(r"(\d+)\s*" + NDASH + r"\s*(\d+)", plage)
        if m:
            out.append({"min": int(m.group(1)), "max": int(m.group(2)), "vitesse": vitesse})
            continue
        m = re.match(r"(\d+)\+", plage)
        if m:
            out.append({"min": int(m.group(1)), "max": None, "vitesse": vitesse})
    return out


def _difficultes(text):
    rows = _table_rows(text, r"\|\s*Seuil\s*\|\s*Difficulté\s*\|")
    return [{"seuil": _num(c[0]), "nom": c[1]} for c in rows if len(c) >= 2]


def _blessures(text):
    rows = _table_rows(text, r"\|\s*Blessure\s*\|\s*Perte en un seul coup\s*\|")
    out = []
    for c in rows:
        if len(c) < 3:
            continue
        m = re.search(r"(\d+)\s*%", c[1])
        out.append({"nom": c[0], "pct": int(m.group(1)) if m else None,
                    "seuil": c[1], "effets": c[2]})
    return out


def _armes_courbe(text):
    rows = _table_rows(text, r"\|\s*Poids\s*\|\s*Dégâts\s*\|\s*Reach\s*\|")
    return [{"poids": c[0], "degats": c[1], "reach": c[2]} for c in rows if len(c) >= 3]


def _armures_courbe(text):
    rows = _table_rows(text, r"\|\s*Poids\s*\|\s*10\s*\|\s*30\s*\|\s*60\s*\|")
    out = {"poids": ["10", "30", "60"]}
    keys = {"Invu": "invu", "Zones protégées": "zones",
            "Viser une zone non protégée": "viser", "Port d'armure": "port"}
    for c in rows:
        if len(c) >= 4 and c[0] in keys:
            out[keys[c[0]]] = c[1:4]
    return out


ACTIONS = ["Actions passives", "Actions bonus", "Actions actives", "Actions d'initiative"]


def _extract(docs_dir):
    text = (Path(docs_dir) / PAGE).read_text(encoding="utf-8")
    defs = _defs(text)
    mcards = _mcards(text)
    m = re.search(r"dépenser (\d+)\s*pts? d'xp", text)
    return {
        "caracs": [{"name": c, "desc": mcards.get(c, "")} for c in CARACS],
        "comps": _comps(defs),
        "stades": _stades(defs),
        "xpParStade": int(m.group(1)) if m else 20,
        "vitesses": _vitesses(text),
        "difficultes": _difficultes(text),
        "blessures": _blessures(text),
        "armesCourbe": _armes_courbe(text),
        "armuresCourbe": _armures_courbe(text),
        "actions": [{"nom": n, "desc": defs[n]} for n in ACTIONS if defs.get(n)],
    }


def on_files(files, config):
    data = _extract(config["docs_dir"])
    n_comps = sum(len(v) for v in data["comps"].values())
    # les stades d'ouverture sont affichés : une dérive de la détection
    # (reformulation des règles) se voit au build au lieu d'attendre le créateur
    tech0 = next((s["nom"] for s in data["stades"] if s["techniques"]), "AUCUN")
    art0 = next((s["nom"] for s in data["stades"] if s["art"]), "AUCUN")
    print(f"[jjk-creation] {len(data['caracs'])} caracs, {n_comps} compétences, "
          f"{len(data['stades'])} stades (techniques dès {tech0}, art dès {art0}), "
          f"{len(data['vitesses'])} vitesses, "
          f"{len(data['difficultes'])} difficultés, {len(data['blessures'])} blessures")
    content = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    files.append(File.generated(config, "jjk-creation.json", content=content))
    return files


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    root = Path(__file__).resolve().parent.parent
    data = _extract(root / "docs")
    print(json.dumps(data, ensure_ascii=False, indent=2))
